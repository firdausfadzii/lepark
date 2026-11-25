import Phaser from "phaser";
import {
  DEFAULT_PLAYER_OUTFIT,
  FASHION_GEAR_CATALOG,
  FashionAnimState,
  FashionGearCatalogItem,
  PlayerOutfit,
} from "shared";
import type { AvatarDirection } from "./entities/PlayerAvatar";

export const FASHION_CELL_SIZE = 92;

export const FASHION_ANIM_SPECS: Record<
  FashionAnimState,
  { cols: number; rows: number; frameRate: number; repeat: number }
> = {
  idle: { cols: 4, rows: 4, frameRate: 6, repeat: -1 },
  walking: { cols: 6, rows: 4, frameRate: 9, repeat: -1 },
  melee_swing: { cols: 4, rows: 4, frameRate: 12, repeat: 0 },
};

const DIRECTIONS: AvatarDirection[] = ["south", "west", "east", "north"];

const imageCache = new Map<string, Promise<HTMLImageElement | null>>();
const bakedCanvasCache = new Map<string, Promise<HTMLCanvasElement>>();
const textureRefCounts = new Map<string, number>();
const pendingEvictions = new Map<string, ReturnType<typeof setTimeout>>();

const EVICTION_GRACE_MS = 30_000;

function loadImageOptional(url: string): Promise<HTMLImageElement | null> {
  const existing = imageCache.get(url);
  if (existing) return existing;
  const p = new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
  imageCache.set(url, p);
  return p;
}

function parseHexRgb(hex: string | undefined, fallback: [number, number, number]): [number, number, number] {
  const clean = (hex || "").trim().replace(/^#/, "");
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) return [r, g, b];
  } else if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) return [r, g, b];
  }
  return fallback;
}

function findGearItem(id: string | undefined): FashionGearCatalogItem | undefined {
  if (!id) return undefined;
  return FASHION_GEAR_CATALOG.find((g) => g.id === id);
}

/**
 * Resolves effective gear slot keys (supporting both new slot keys and legacy outerwearKey/hatKey).
 */
export function resolveOutfitSlots(outfit: Partial<PlayerOutfit>): {
  resolved: PlayerOutfit;
  chest?: FashionGearCatalogItem;
  pants?: FashionGearCatalogItem;
  helmet?: FashionGearCatalogItem;
  boots?: FashionGearCatalogItem;
  gloves?: FashionGearCatalogItem;
  cape?: FashionGearCatalogItem;
  weapon?: FashionGearCatalogItem;
} {
  const resolved: PlayerOutfit = { ...DEFAULT_PLAYER_OUTFIT, ...outfit };
  const chestId = resolved.chestKey || resolved.outerwearKey || "";
  const pantsId = resolved.pantsKey || "";
  const helmetId = resolved.helmetKey || resolved.hatKey || "";
  const bootsId = resolved.bootsKey || "";
  const glovesId = resolved.glovesKey || "";
  const capeId = resolved.capeKey || "";
  const weaponId = resolved.weaponKey || "";

  return {
    resolved,
    chest: findGearItem(chestId),
    pants: findGearItem(pantsId),
    helmet: findGearItem(helmetId),
    boots: findGearItem(bootsId),
    gloves: findGearItem(glovesId),
    cape: findGearItem(capeId),
    weapon: findGearItem(weaponId),
  };
}

/**
 * Deterministic texture key shared across all multiplayer players wearing the same outfit.
 */
export function buildOutfitTextureKey(
  outfit: Partial<PlayerOutfit>,
  anim: FashionAnimState
): string {
  const { resolved, chest, pants, helmet, boots, gloves, cape, weapon } = resolveOutfitSlots(outfit);
  const raw = [
    anim,
    resolved.skinColor.toLowerCase(),
    resolved.shirtStyle,
    resolved.shirtColor.toLowerCase(),
    resolved.sleeveColor.toLowerCase(),
    resolved.pantsColor.toLowerCase(),
    resolved.outerwearColor.toLowerCase(),
    chest?.id || "",
    pants?.id || "",
    helmet?.id || "",
    boots?.id || "",
    gloves?.id || "",
    cape?.id || "",
    weapon?.id || "",
  ].join("|");

  // Fast FNV-1a 32-bit hash for compact Phaser texture keys
  let h = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `baked_outfit_${anim}_${(h >>> 0).toString(36)}`;
}

// Part mask IDs matching scripts/generate_part_masks.py
const MASK_NONE = 0;
const MASK_FAR_ARM = 1;  // #0000FF
const MASK_LEGS = 2;     // #00FF00
const MASK_TORSO = 3;    // #FF0000
const MASK_HEAD = 4;     // #00FFFF
const MASK_NEAR_ARM = 5; // #FFFF00
const MASK_FEET = 6;     // #FF00FF (bare feet; tints with skinColor unless boots equipped)

function classifyMaskPixel(r: number, g: number, b: number, a: number): number {
  if (a < 128) return MASK_NONE;
  if (r > 200 && g > 200 && b < 60) return MASK_NEAR_ARM; // #FFFF00
  if (r > 200 && g < 60 && b > 200) return MASK_FEET;     // #FF00FF
  if (r < 60 && g > 200 && b > 200) return MASK_HEAD;     // #00FFFF
  if (r > 200 && g < 60 && b < 60) return MASK_TORSO;     // #FF0000
  if (r < 60 && g > 200 && b < 60) return MASK_LEGS;      // #00FF00
  if (r < 60 && g < 60 && b > 200) return MASK_FAR_ARM;   // #0000FF
  return MASK_NONE;
}

/**
 * Luminance-preserving tinting: preserves dark outlines (#404040) and cel-shaded highlights/shadows.
 */
function tintGrayscalePixel(
  lum: number,
  targetRgb: [number, number, number]
): [number, number, number] {
  if (lum <= 76) {
    // Keep outer stroke crisp dark while subtly harmonizing with the base color
    return [
      Math.round(targetRgb[0] * 0.2 + lum * 0.45),
      Math.round(targetRgb[1] * 0.2 + lum * 0.45),
      Math.round(targetRgb[2] * 0.2 + lum * 0.45),
    ];
  }
  // Map body luminance (~100..235) cleanly so dark fabric colors keep visible highlights & shading
  const norm = Math.max(0, Math.min(1, (lum - 76) / (228 - 76)));
  const factor = 0.52 + norm * 0.63; // 0.52 in deep shadow -> 1.15 on top highlights
  return [
    Math.min(255, Math.round(targetRgb[0] * factor)),
    Math.min(255, Math.round(targetRgb[1] * factor)),
    Math.min(255, Math.round(targetRgb[2] * factor)),
  ];
}

function getImagePixels(img: HTMLImageElement, w: number, h: number): Uint8ClampedArray {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h).data;
}

function blitMaskedPixels(
  dst: Uint8ClampedArray,
  src: Uint8ClampedArray,
  mask: Uint8ClampedArray | null,
  allowedRegion: number | null,
  tintRgb?: [number, number, number] | null,
  rowMin?: number,
  rowMax?: number,
  sheetWidth?: number
): void {
  const w = sheetWidth || 0;
  for (let i = 0; i < dst.length; i += 4) {
    if (src[i + 3] < 128) continue;

    if (rowMin !== undefined && rowMax !== undefined && w > 0) {
      const y = Math.floor((i / 4) / w);
      const row = Math.floor(y / FASHION_CELL_SIZE);
      if (row < rowMin || row > rowMax) continue;
    }

    if (allowedRegion !== null && mask) {
      const region = classifyMaskPixel(mask[i], mask[i + 1], mask[i + 2], mask[i + 3]);
      if (region !== allowedRegion) continue;
    }

    if (tintRgb) {
      const lum = src[i];
      const [tr, tg, tb] = tintGrayscalePixel(lum, tintRgb);
      dst[i] = tr;
      dst[i + 1] = tg;
      dst[i + 2] = tb;
      dst[i + 3] = 255;
    } else {
      dst[i] = src[i];
      dst[i + 1] = src[i + 1];
      dst[i + 2] = src[i + 2];
      dst[i + 3] = 255;
    }
  }
}

const ASSET_CACHE_VER = "v=4";

async function loadGearSheet(
  item: FashionGearCatalogItem | undefined,
  anim: FashionAnimState
): Promise<HTMLImageElement | null> {
  if (!item) return null;
  if (!item.supportedAnims.includes(anim)) return null;
  return loadImageOptional(`${item.assetBasePath}/${anim}.png?${ASSET_CACHE_VER}`);
}

/**
 * Composites all equipped layers for an animation into a single 92x92-grid offscreen canvas.
 * Runs the 10-pass Z-order pipeline defined in guides/fashion_create_guide.md.
 */
export async function bakeOutfitCanvas(
  outfit: Partial<PlayerOutfit>,
  anim: FashionAnimState
): Promise<HTMLCanvasElement> {
  const cacheKey = buildOutfitTextureKey(outfit, anim);
  const cached = bakedCanvasCache.get(cacheKey);
  if (cached) return cached;

  const job = (async (): Promise<HTMLCanvasElement> => {
    const spec = FASHION_ANIM_SPECS[anim];
    const width = spec.cols * FASHION_CELL_SIZE;
    const height = spec.rows * FASHION_CELL_SIZE;

    const { resolved, chest, pants, helmet, gloves, cape, weapon } = resolveOutfitSlots(outfit);

    const [baseImg, maskImg, capeImg, pantsImg, chestImg, helmetImg, glovesImg, weaponImg] =
      await Promise.all([
        loadImageOptional(`/assets/player/${anim}/grayscale_sheet.png?${ASSET_CACHE_VER}`),
        loadImageOptional(`/assets/player/${anim}/part_mask.png?${ASSET_CACHE_VER}`),
        loadGearSheet(cape, anim),
        loadGearSheet(pants, anim),
        loadGearSheet(chest, anim),
        loadGearSheet(helmet, anim),
        loadGearSheet(gloves, anim),
        loadGearSheet(weapon, anim),
      ]);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;

    if (!baseImg) {
      return canvas;
    }

    const basePixels = getImagePixels(baseImg, width, height);
    const maskPixels = maskImg ? getImagePixels(maskImg, width, height) : null;

    const skinRgb = parseHexRgb(resolved.skinColor, [250, 243, 232]);
    const shirtRgb = parseHexRgb(resolved.shirtColor, [255, 255, 255]);
    const pantsRgb = parseHexRgb(resolved.pantsColor, [44, 62, 80]);
    const outerDyeRgb = parseHexRgb(resolved.outerwearColor, [231, 76, 60]);
    const armShirtRgb =
      resolved.shirtStyle === "long_sleeve"
        ? shirtRgb
        : resolved.sleeveColor
          ? parseHexRgb(resolved.sleeveColor, shirtRgb)
          : skinRgb;

    const outImgData = ctx.createImageData(width, height);
    const out = outImgData.data;

    // Pass 1: Back Cape (rows 0=south, 1=west, 2=east)
    const capePixels = capeImg ? getImagePixels(capeImg, width, height) : null;
    if (capePixels) {
      blitMaskedPixels(
        out,
        capePixels,
        null,
        null,
        cape?.dyeable ? outerDyeRgb : null,
        0,
        2,
        width
      );
    }

    // Pass 2: Base Body (luminance-preserving tinting per body region)
    // Also save tinted base pixels so Pass 7 can stamp the Near Arm over chest gear!
    const tintedBase = new Uint8ClampedArray(basePixels.length);
    for (let i = 0; i < basePixels.length; i += 4) {
      if (basePixels[i + 3] < 128) continue;
      const lum = basePixels[i];
      const region = maskPixels
        ? classifyMaskPixel(maskPixels[i], maskPixels[i + 1], maskPixels[i + 2], maskPixels[i + 3])
        : MASK_HEAD;

      let targetRgb = skinRgb;
      if (region === MASK_TORSO && !chestImg) {
        targetRgb = shirtRgb;
      } else if (region === MASK_LEGS && !pantsImg) {
        targetRgb = pantsRgb;
      } else if ((region === MASK_NEAR_ARM || region === MASK_FAR_ARM) && !chestImg) {
        targetRgb = armShirtRgb;
      }

      const [tr, tg, tb] = tintGrayscalePixel(lum, targetRgb);
      tintedBase[i] = tr;
      tintedBase[i + 1] = tg;
      tintedBase[i + 2] = tb;
      tintedBase[i + 3] = 255;

      out[i] = tr;
      out[i + 1] = tg;
      out[i + 2] = tb;
      out[i + 3] = 255;
    }

    // Pass 3: Far-Arm Gear (gloves / sleeved chest behind torso)
    const glovesPixels = glovesImg ? getImagePixels(glovesImg, width, height) : null;
    const chestPixels = chestImg ? getImagePixels(chestImg, width, height) : null;
    if (chestPixels && chest?.hasSleeves && maskPixels) {
      blitMaskedPixels(
        out,
        chestPixels,
        maskPixels,
        MASK_FAR_ARM,
        chest.dyeable ? outerDyeRgb : null
      );
    }
    if (glovesPixels && maskPixels) {
      blitMaskedPixels(
        out,
        glovesPixels,
        maskPixels,
        MASK_FAR_ARM,
        gloves?.dyeable ? outerDyeRgb : null
      );
    }

    // Pass 4: Pants / Boots
    if (pantsImg) {
      const pantsPixels = getImagePixels(pantsImg, width, height);
      blitMaskedPixels(out, pantsPixels, null, null, pants?.dyeable ? pantsRgb : null);
    }

    // Pass 5: Chest / Armor (drawn FULL — no manual arm cutouts required!)
    if (chestPixels) {
      blitMaskedPixels(out, chestPixels, null, null, chest?.dyeable ? outerDyeRgb : null);
    }

    // Pass 6: Head / Hair / Helmet
    if (helmetImg) {
      const helmetPixels = getImagePixels(helmetImg, width, height);
      blitMaskedPixels(out, helmetPixels, null, null, helmet?.dyeable ? outerDyeRgb : null);
    }

    // Pass 7: Near-Arm Body Overlay (stamps near arm + its dark outline cleanly ON TOP of chest!)
    if (maskPixels) {
      blitMaskedPixels(out, tintedBase, maskPixels, MASK_NEAR_ARM, null);
    }

    // Pass 8: Near-Arm Gear (near sleeves & near gloves on top of near arm)
    if (chestPixels && chest?.hasSleeves && maskPixels) {
      blitMaskedPixels(
        out,
        chestPixels,
        maskPixels,
        MASK_NEAR_ARM,
        chest.dyeable ? outerDyeRgb : null
      );
    }
    if (glovesPixels && maskPixels) {
      blitMaskedPixels(
        out,
        glovesPixels,
        maskPixels,
        MASK_NEAR_ARM,
        gloves?.dyeable ? outerDyeRgb : null
      );
    }

    // Pass 9: Front Cape (row 3=north only)
    if (capePixels) {
      blitMaskedPixels(
        out,
        capePixels,
        null,
        null,
        cape?.dyeable ? outerDyeRgb : null,
        3,
        3,
        width
      );
    }

    // Pass 10: Weapon (if provided as a baked sheet)
    if (weaponImg) {
      const weaponPixels = getImagePixels(weaponImg, width, height);
      blitMaskedPixels(out, weaponPixels, null, null, null);
    }

    ctx.putImageData(outImgData, 0, 0);
    return canvas;
  })();

  if (bakedCanvasCache.size > 128) {
    bakedCanvasCache.clear();
  }
  bakedCanvasCache.set(cacheKey, job);
  return job;
}

export function getBakedAnimKey(texKey: string, dir: AvatarDirection): string {
  return `${texKey}_${dir}`;
}

function ensureBakedAnimations(
  scene: Phaser.Scene,
  texKey: string,
  anim: FashionAnimState
): void {
  const spec = FASHION_ANIM_SPECS[anim];
  for (let row = 0; row < DIRECTIONS.length; row++) {
    const dir = DIRECTIONS[row];
    const animKey = getBakedAnimKey(texKey, dir);
    if (!scene.anims.exists(animKey)) {
      const start = row * spec.cols;
      const end = start + spec.cols - 1;
      scene.anims.create({
        key: animKey,
        frames: scene.anims.generateFrameNumbers(texKey, { start, end }),
        frameRate: spec.frameRate,
        repeat: spec.repeat,
      });
    }
  }
}

/**
 * Acquires (baking once if needed) a ref-counted Phaser spritesheet texture for a player's outfit.
 */
export async function acquireBakedOutfitTexture(
  scene: Phaser.Scene,
  outfit: Partial<PlayerOutfit>,
  anim: FashionAnimState
): Promise<string> {
  const texKey = buildOutfitTextureKey(outfit, anim);

  // Cancel any pending LRU eviction if another player equips this outfit
  const pendingTimer = pendingEvictions.get(texKey);
  if (pendingTimer) {
    clearTimeout(pendingTimer);
    pendingEvictions.delete(texKey);
  }

  textureRefCounts.set(texKey, (textureRefCounts.get(texKey) || 0) + 1);

  if (!scene.textures.exists(texKey)) {
    const canvas = await bakeOutfitCanvas(outfit, anim);
    if (!scene.sys || !scene.sys.isActive()) {
      return texKey;
    }
    if (!scene.textures.exists(texKey)) {
      scene.textures.addSpriteSheet(texKey, canvas as unknown as HTMLImageElement, {
        frameWidth: FASHION_CELL_SIZE,
        frameHeight: FASHION_CELL_SIZE,
      });
      scene.textures.get(texKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
  }

  ensureBakedAnimations(scene, texKey, anim);
  return texKey;
}

/**
 * Releases a player's reference to a baked outfit texture; evicts from VRAM after grace period when unused.
 */
export function releaseBakedOutfitTexture(scene: Phaser.Scene, texKey: string | null): void {
  if (!texKey) return;
  const next = Math.max(0, (textureRefCounts.get(texKey) || 0) - 1);
  if (next > 0) {
    textureRefCounts.set(texKey, next);
    return;
  }

  textureRefCounts.delete(texKey);
  if (pendingEvictions.has(texKey)) return;

  const timer = setTimeout(() => {
    pendingEvictions.delete(texKey);
    if ((textureRefCounts.get(texKey) || 0) > 0) return;
    if (!scene.sys || !scene.sys.isActive()) return;

    for (const dir of DIRECTIONS) {
      const animKey = getBakedAnimKey(texKey, dir);
      if (scene.anims.exists(animKey)) {
        scene.anims.remove(animKey);
      }
    }
    if (scene.textures.exists(texKey)) {
      scene.textures.remove(texKey);
    }
    bakedCanvasCache.delete(texKey);
  }, EVICTION_GRACE_MS);

  pendingEvictions.set(texKey, timer);
}
