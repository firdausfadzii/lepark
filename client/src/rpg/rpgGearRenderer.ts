import {
  DEFAULT_PLAYER_OUTFIT,
  EquipSlot,
  EquipmentItem,
  ItemRarity,
  PlayerAvatars,
  PlayerOutfit,
  WeaponType,
  normalizeFrames,
} from "shared";
import { renderFashionPreviewFrame } from "../fashionRenderer";
import { resolveSheetFrameUrl } from "../spriteSheetResolver";

export interface ParsedRpgGear {
  weaponType: WeaponType | null;
  weaponRarity: ItemRarity | null;
  weaponRank: number;
  armorRarity: ItemRarity | null;
  armorRank: number;
  emblemRarity: ItemRarity | null;
  accessoryRarity: ItemRarity | null;
}

export const RPG_GEAR_SHEETS: ReadonlyArray<{ key: string; url: string }> = [
  { key: "rpg_armor_leather", url: "/assets/sprites/gear/sheets/leather_armor_sheet.png" },
  { key: "rpg_armor_plate", url: "/assets/sprites/gear/sheets/plate_armor_sheet.png" },
  { key: "rpg_emblem_sheet", url: "/assets/sprites/gear/sheets/emblem_sheet.png" },
  { key: "rpg_accessory_sheet", url: "/assets/sprites/gear/sheets/accessory_sheet.png" },
  { key: "rpg_wpn_wooden_sword", url: "/assets/sprites/gear/sheets/wooden_sword_sheet.png" },
  { key: "rpg_wpn_sword_metal", url: "/assets/sprites/gear/sheets/sword_metal_sheet.png" },
  { key: "rpg_wpn_axe", url: "/assets/sprites/gear/sheets/axe_sheet.png" },
  { key: "rpg_wpn_spear", url: "/assets/sprites/gear/sheets/spear_sheet.png" },
  { key: "rpg_wpn_staff", url: "/assets/sprites/gear/sheets/staff_sheet.png" },
  { key: "rpg_wpn_bow", url: "/assets/sprites/gear/sheets/bow_sheet.png" },
  { key: "rpg_wpn_fist", url: "/assets/sprites/gear/sheets/fist_sheet.png" },
  { key: "rpg_wpn_gun", url: "/assets/sprites/gear/sheets/gun_sheet.png" },
];

export function hasCustomAvatarFrames(avatars?: PlayerAvatars | null): boolean {
  if (!avatars) return false;
  const dirs = ["idle", "left", "right", "up", "down"] as const;
  return dirs.some((dir) =>
    normalizeFrames(avatars[dir]).some(
      (f) =>
        typeof f === "string" &&
        (f.startsWith("sheet:") ||
          f.startsWith("data:image/") ||
          f.startsWith("/") ||
          f.startsWith("http"))
    )
  );
}

export function parseGearSignature(sig: string | null | undefined): ParsedRpgGear {
  if (!sig || typeof sig !== "string") {
    return {
      weaponType: null,
      weaponRarity: null,
      weaponRank: 1,
      armorRarity: null,
      armorRank: 1,
      emblemRarity: null,
      accessoryRarity: null,
    };
  }
  const [wPart = "", aPart = "", ePart = "", cPart = ""] = sig.split("|");
  const [wType, wRar, wRankStr] = wPart.split(":");
  const [aRar, aRankStr] = aPart.split(":");
  return {
    weaponType: (wType as WeaponType) || null,
    weaponRarity: (wRar as ItemRarity) || null,
    weaponRank: Math.max(1, Number(wRankStr || 1) || 1),
    armorRarity: (aRar as ItemRarity) || null,
    armorRank: Math.max(1, Number(aRankStr || 1) || 1),
    emblemRarity: (ePart as ItemRarity) || null,
    accessoryRarity: (cPart as ItemRarity) || null,
  };
}

export function resolveGearSheetKeys(sig: string | null | undefined): {
  armorKey: string | null;
  emblemKey: string | null;
  accessoryKey: string | null;
  weaponKey: string | null;
} {
  const gear = parseGearSignature(sig);
  const armorKey = gear.armorRarity
    ? gear.armorRank <= 4 && gear.armorRarity === "COMMON"
      ? "rpg_armor_leather"
      : "rpg_armor_plate"
    : null;
  const emblemKey = gear.emblemRarity ? "rpg_emblem_sheet" : null;
  const accessoryKey = gear.accessoryRarity ? "rpg_accessory_sheet" : null;

  let weaponKey: string | null = null;
  if (gear.weaponType) {
    if (gear.weaponType === "SWORD") {
      weaponKey =
        gear.weaponRank <= 1 && (!gear.weaponRarity || gear.weaponRarity === "COMMON")
          ? "rpg_wpn_wooden_sword"
          : "rpg_wpn_sword_metal";
    } else {
      const map: Record<WeaponType, string> = {
        SWORD: "rpg_wpn_sword_metal",
        AXE: "rpg_wpn_axe",
        SPEAR: "rpg_wpn_spear",
        STAFF: "rpg_wpn_staff",
        BOW: "rpg_wpn_bow",
        FIST: "rpg_wpn_fist",
        GUN: "rpg_wpn_gun",
      };
      weaponKey = map[gear.weaponType] || null;
    }
  }

  return { armorKey, emblemKey, accessoryKey, weaponKey };
}

export function getGearIconUrl(
  item: Pick<EquipmentItem, "slot" | "weaponType" | "rank" | "rarity" | "name">
): string {
  if (item.slot === "WEAPON") {
    const wt = item.weaponType || "SWORD";
    if (wt === "SWORD") {
      return item.rank <= 1 && item.rarity === "COMMON"
        ? "/assets/sprites/gear/icons/wooden_sword.png"
        : "/assets/sprites/gear/icons/sword_metal.png";
    }
    const map: Record<WeaponType, string> = {
      SWORD: "/assets/sprites/gear/icons/sword_metal.png",
      AXE: "/assets/sprites/gear/icons/axe.png",
      SPEAR: "/assets/sprites/gear/icons/spear.png",
      STAFF: "/assets/sprites/gear/icons/staff.png",
      BOW: "/assets/sprites/gear/icons/bow.png",
      FIST: "/assets/sprites/gear/icons/fist.png",
      GUN: "/assets/sprites/gear/icons/gun.png",
    };
    return map[wt];
  }
  if (item.slot === "ARMOR") {
    return item.rank <= 4 && item.rarity === "COMMON"
      ? "/assets/sprites/gear/icons/leather_armor.png"
      : "/assets/sprites/gear/icons/armor_plate.png";
  }
  if (item.slot === "EMBLEM") return "/assets/sprites/gear/icons/emblem.png";
  return "/assets/sprites/gear/icons/accessory.png";
}

export function getSlotFallbackIconUrl(slot: EquipSlot): string {
  if (slot === "WEAPON") return "/assets/sprites/gear/icons/wooden_sword.png";
  if (slot === "ARMOR") return "/assets/sprites/gear/icons/leather_armor.png";
  if (slot === "EMBLEM") return "/assets/sprites/gear/icons/emblem.png";
  return "/assets/sprites/gear/icons/accessory.png";
}

export function getBattleWeaponIconKey(
  weaponType: WeaponType | null | undefined,
  weaponRank = 1,
  weaponRarity: ItemRarity | null = "COMMON"
): string | null {
  if (!weaponType) return null;
  if (weaponType === "SWORD") {
    return weaponRank <= 1 && (!weaponRarity || weaponRarity === "COMMON")
      ? "gear_wpn_wooden_sword"
      : "gear_wpn_sword_metal";
  }
  const map: Record<WeaponType, string> = {
    SWORD: "gear_wpn_sword_metal",
    AXE: "gear_wpn_axe",
    SPEAR: "gear_wpn_spear",
    STAFF: "gear_wpn_staff",
    BOW: "gear_wpn_bow",
    FIST: "gear_wpn_fist",
    GUN: "gear_wpn_gun",
  };
  return map[weaponType];
}

const SHEET_URL_BY_KEY = new Map(RPG_GEAR_SHEETS.map((s) => [s.key, s.url]));
const imagePromiseCache = new Map<string, Promise<HTMLImageElement>>();

function loadImg(url: string): Promise<HTMLImageElement> {
  const existing = imagePromiseCache.get(url);
  if (existing) return existing;
  const p = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
  imagePromiseCache.set(url, p);
  return p;
}

export async function drawGearOverlayOnContext(
  ctx: CanvasRenderingContext2D,
  sig: string | null | undefined,
  dirIndex = 0,
  frameCol = 0,
  isWalk = false,
  includeWeapon = true
): Promise<void> {
  const keys = resolveGearSheetKeys(sig);
  const drawKeys = [
    keys.accessoryKey,
    keys.armorKey,
    keys.emblemKey,
    includeWeapon ? keys.weaponKey : null,
  ].filter((k): k is string => Boolean(k));
  if (drawKeys.length === 0) return;

  const row = (isWalk ? 4 : 0) + (((dirIndex % 4) + 4) % 4);
  const col = ((frameCol % 4) + 4) % 4;

  const loaded = await Promise.all(
    drawKeys.map(async (k) => {
      const url = SHEET_URL_BY_KEY.get(k);
      if (!url) return null;
      try {
        return await loadImg(url);
      } catch {
        return null;
      }
    })
  );

  for (const img of loaded) {
    if (!img) continue;
    ctx.drawImage(img, col * 32, row * 32, 32, 32, 0, 0, 32, 32);
  }
}

export async function renderPlayerCharacterCanvas(params: {
  outfit?: Partial<PlayerOutfit> | null;
  avatars?: PlayerAvatars | null;
  gearSignature?: string | null;
  facingRight?: boolean;
  includeWeapon?: boolean;
  dirIndex?: number;
  frameCol?: number;
  isWalk?: boolean;
}): Promise<HTMLCanvasElement> {
  const facingRight = params.facingRight !== false;
  const dirIndex = params.dirIndex ?? (facingRight ? 2 : 0);
  const frameCol = params.frameCol ?? 0;
  const isWalk = params.isWalk ?? false;
  const includeWeapon = params.includeWeapon !== false;

  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.imageSmoothingEnabled = false;

  let drewCustom = false;
  if (hasCustomAvatarFrames(params.avatars)) {
    const frames = normalizeFrames(
      facingRight
        ? params.avatars?.right || params.avatars?.idle
        : params.avatars?.idle || params.avatars?.left
    );
    if (frames.length > 0) {
      try {
        const frameRef = frames[frameCol % frames.length] || frames[0];
        const resolvedUrl = await resolveSheetFrameUrl(frameRef);
        if (resolvedUrl) {
          const img = await loadImg(resolvedUrl);
          const ratio = Math.min(32 / img.width, 32 / img.height);
          const dw = Math.round(img.width * ratio);
          const dh = Math.round(img.height * ratio);
          ctx.drawImage(img, Math.round((32 - dw) / 2), 32 - dh, dw, dh);
          drewCustom = true;
        }
      } catch {}
    }
  }

  // IMPORTANT: Only draw default character + animated RPG gears when NOT using Slime or custom character assets
  if (!drewCustom) {
    try {
      const dataUrl = await renderFashionPreviewFrame(
        params.outfit || DEFAULT_PLAYER_OUTFIT,
        dirIndex,
        frameCol,
        isWalk
      );
      if (dataUrl) {
        const img = await loadImg(dataUrl);
        ctx.drawImage(img, 0, 0, 32, 32);
      }
    } catch {}

    await drawGearOverlayOnContext(ctx, params.gearSignature, dirIndex, frameCol, isWalk, includeWeapon);
  }

  return canvas;
}
