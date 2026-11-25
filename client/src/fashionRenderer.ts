import { PlayerOutfit, DEFAULT_PLAYER_OUTFIT, OUTERWEAR_CATALOG } from "shared";

const imageCache = new Map<string, Promise<HTMLImageElement>>();
const frameCache = new Map<string, string>();

function loadImg(url: string): Promise<HTMLImageElement> {
  const existing = imageCache.get(url);
  if (existing) return existing;
  const p = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
  imageCache.set(url, p);
  return p;
}

function parseHexRgb(hex: string, fallback: [number, number, number]): [number, number, number] {
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

function isNear(r: number, g: number, b: number, tr: number, tg: number, tb: number): boolean {
  const dr = (r - tr) / 255;
  const dg = (g - tg) / 255;
  const db = (b - tb) / 255;
  return Math.sqrt(dr * dr + dg * dg + db * db) < 0.05;
}

function shade(rgb: [number, number, number], factor: number): [number, number, number] {
  return [
    Math.min(255, Math.round(rgb[0] * factor)),
    Math.min(255, Math.round(rgb[1] * factor)),
    Math.min(255, Math.round(rgb[2] * factor)),
  ];
}

function applyFashionData(
  data: Uint8ClampedArray,
  shirt: [number, number, number],
  sleeve: [number, number, number],
  forearm: [number, number, number],
  pants: [number, number, number],
  skin: [number, number, number],
  frontHand: [number, number, number]
): void {
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 25) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    let out: [number, number, number] | null = null;
    if (isNear(r, g, b, 255, 0, 0)) out = shirt;
    else if (isNear(r, g, b, 170, 0, 0)) out = shade(shirt, 0.75);
    else if (isNear(r, g, b, 255, 136, 0)) out = sleeve;
    else if (isNear(r, g, b, 255, 187, 0)) out = forearm;
    else if (isNear(r, g, b, 0, 0, 255)) out = pants;
    else if (isNear(r, g, b, 0, 0, 170)) out = shade(pants, 0.75);
    else if (isNear(r, g, b, 0, 255, 0)) out = skin;
    else if (isNear(r, g, b, 0, 221, 0)) out = shade(skin, 0.92);
    else if (isNear(r, g, b, 0, 170, 0)) out = shade(skin, 0.78);
    else if (isNear(r, g, b, 255, 255, 0)) out = frontHand;
    else if (isNear(r, g, b, 136, 136, 0)) out = [17, 17, 17];
    if (out) {
      data[i] = out[0];
      data[i + 1] = out[1];
      data[i + 2] = out[2];
    }
  }
}

function extractFrontArmData(
  src: Uint8ClampedArray,
  handColor: [number, number, number],
  forearmColor: [number, number, number]
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(src.length);
  for (let i = 0; i < src.length; i += 4) {
    if (src[i + 3] < 25) continue;
    const r = src[i];
    const g = src[i + 1];
    const b = src[i + 2];
    if (isNear(r, g, b, 255, 255, 0)) {
      out[i] = handColor[0];
      out[i + 1] = handColor[1];
      out[i + 2] = handColor[2];
      out[i + 3] = src[i + 3];
    } else if (isNear(r, g, b, 255, 187, 0)) {
      out[i] = forearmColor[0];
      out[i + 1] = forearmColor[1];
      out[i + 2] = forearmColor[2];
      out[i + 3] = src[i + 3];
    } else if (isNear(r, g, b, 136, 136, 0)) {
      out[i] = 17;
      out[i + 1] = 17;
      out[i + 2] = 17;
      out[i + 3] = src[i + 3];
    }
  }
  return out;
}

/**
 * Renders a 32x32 composite preview data URL matching the Phaser 4-layer shader pipeline.
 */
export async function renderFashionPreviewFrame(
  outfit: Partial<PlayerOutfit>,
  dirIndex: number = 0,
  frameCol: number = 0,
  isWalk: boolean = false
): Promise<string> {
  const resolved: PlayerOutfit = { ...DEFAULT_PLAYER_OUTFIT, ...outfit };
  const col = ((frameCol % 4) + 4) % 4;
  const dir = ((dirIndex % 4) + 4) % 4;
  const cacheKey = `${JSON.stringify(resolved)}|${dir}|${col}|${isWalk ? 1 : 0}`;
  const cached = frameCache.get(cacheKey);
  if (cached) return cached;

  const baseImg = await loadImg("/assets/character_base_map.png");
  const outerItem = resolved.outerwearKey
    ? OUTERWEAR_CATALOG.find((item) => item.id === resolved.outerwearKey)
    : undefined;
  const outerImg = outerItem ? await loadImg(outerItem.assetPath).catch(() => null) : null;

  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.imageSmoothingEnabled = false;

  const tmp = document.createElement("canvas");
  tmp.width = 32;
  tmp.height = 32;
  const tctx = tmp.getContext("2d")!;
  tctx.imageSmoothingEnabled = false;

  const shirtRgb = parseHexRgb(resolved.shirtColor, [255, 255, 255]);
  const pantsRgb = parseHexRgb(resolved.pantsColor, [44, 62, 80]);
  const skinRgb = parseHexRgb(resolved.skinColor, [250, 243, 232]);
  const outerRgb = parseHexRgb(resolved.outerwearColor, [231, 76, 60]);

  let baseUpperRgb = skinRgb;
  let baseForearmRgb = skinRgb;
  if (resolved.shirtStyle === "short_sleeve") {
    baseUpperRgb = shirtRgb;
  } else if (resolved.shirtStyle === "long_sleeve") {
    baseUpperRgb = shirtRgb;
    baseForearmRgb = shirtRgb;
  } else if (resolved.sleeveColor) {
    const ov = parseHexRgb(resolved.sleeveColor, shirtRgb);
    baseUpperRgb = ov;
    baseForearmRgb = ov;
  }

  const hasOuter = Boolean(outerImg);
  const isShort = !outerItem || outerItem.sleeveType === "short";
  const resolvedSleeve = hasOuter ? outerRgb : baseUpperRgb;
  const resolvedForearm = hasOuter ? (isShort ? baseForearmRgb : outerRgb) : baseForearmRgb;
  const frontHandRgb = skinRgb;

  const row = (isWalk ? 4 : 0) + dir;
  tctx.clearRect(0, 0, 32, 32);
  tctx.drawImage(baseImg, col * 32, row * 32, 32, 32, 0, 0, 32, 32);
  const baseImageData = tctx.getImageData(0, 0, 32, 32);
  const rawBaseCopy = new Uint8ClampedArray(baseImageData.data);
  applyFashionData(baseImageData.data, shirtRgb, resolvedSleeve, resolvedForearm, pantsRgb, skinRgb, frontHandRgb);
  tctx.putImageData(baseImageData, 0, 0);
  ctx.drawImage(tmp, 0, 0);

  if (outerImg) {
    let torsoBob = 0;
    if (isWalk) {
      torsoBob = col === 1 || col === 3 ? -1 : 0;
    } else {
      torsoBob = col === 1 || col === 2 ? 1 : 0;
    }

    tctx.clearRect(0, 0, 32, 32);
    tctx.drawImage(outerImg, dir * 32, 0, 32, 32, 0, 0, 32, 32);
    const outerData = tctx.getImageData(0, 0, 32, 32);
    applyFashionData(outerData.data, outerRgb, outerRgb, resolvedForearm, pantsRgb, skinRgb, frontHandRgb);
    tctx.putImageData(outerData, 0, 0);
    ctx.drawImage(tmp, 0, torsoBob);

    const armBytes = extractFrontArmData(rawBaseCopy, frontHandRgb, resolvedForearm);
    const armImageData = new ImageData(new Uint8ClampedArray(armBytes), 32, 32);
    tctx.clearRect(0, 0, 32, 32);
    tctx.putImageData(armImageData, 0, 0);
    ctx.drawImage(tmp, 0, 0);
  }

  const dataUrl = canvas.toDataURL("image/png");
  if (frameCache.size > 256) {
    frameCache.clear();
  }
  frameCache.set(cacheKey, dataUrl);
  return dataUrl;
}
