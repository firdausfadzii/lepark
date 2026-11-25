import { DEFAULT_AVATAR_ICON } from "shared";

export type SpriteSheetKey =
  | "default_idle"
  | "default_walk"
  | "slime"
  | "ghost_slime"
  | "ghost_slime_walk";

export interface SheetAssetConfig {
  imageUrl: string;
  jsonUrl: string;
  phaserAtlas: string;
}

export const SPRITE_SHEET_CONFIGS: Record<SpriteSheetKey, SheetAssetConfig> = {
  default_idle: {
    imageUrl: "/assets/sprites/default/16x32_idle_sheet.png",
    jsonUrl: "/assets/sprites/default/idle_sprites_mapping.json",
    phaserAtlas: "player_idle_sheet",
  },
  default_walk: {
    imageUrl: "/assets/sprites/default/16x32_walk_sheet.png",
    jsonUrl: "/assets/sprites/default/walk_sprites_mapping.json",
    phaserAtlas: "player_walk_sheet",
  },
  slime: {
    imageUrl: "/assets/sprites/slime/slime_spritesheet.png",
    jsonUrl: "/assets/sprites/slime/slime_sprites.json",
    phaserAtlas: "slime_sheet",
  },
  ghost_slime: {
    imageUrl: "/assets/sprites/ghost_slime/ghost_slime_spritesheet.png",
    jsonUrl: "/assets/sprites/ghost_slime/ghost_slime_sprites.json",
    phaserAtlas: "ghost_slime_sheet",
  },
  ghost_slime_walk: {
    imageUrl: "/assets/sprites/ghost_slime/ghost_slime_walk_spritesheet.png",
    jsonUrl: "/assets/sprites/ghost_slime/ghost_slime_walk_sprites.json",
    phaserAtlas: "ghost_slime_walk_sheet",
  },
};

export interface ParsedSheetFrameRef {
  sheetKey: SpriteSheetKey;
  frameName: string;
  flipX: boolean;
}

export const TRANSPARENT_PIXEL_SRC =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

/**
 * Converts legacy individual-PNG paths (e.g. "/assets/sprites/default/sprite1.png")
 * into canonical "sheet:<sheetKey>:<frameName>[:flip]" references.
 */
export function normalizeSpriteRef(ref: string): string {
  if (!ref || typeof ref !== "string") return DEFAULT_AVATAR_ICON;
  if (ref.startsWith("sheet:")) return ref;

  const defaultIdle = ref.match(/^\/assets\/sprites\/default\/sprite(\d+)(_flip)?\.png$/);
  if (defaultIdle) {
    return `sheet:default_idle:sprite${defaultIdle[1]}${defaultIdle[2] ? ":flip" : ""}`;
  }

  const defaultWalk = ref.match(/^\/assets\/sprites\/default\/walk_sprite(\d+)(_flip)?\.png$/);
  if (defaultWalk) {
    return `sheet:default_walk:sprite${defaultWalk[1]}${defaultWalk[2] ? ":flip" : ""}`;
  }

  const slime = ref.match(/^\/assets\/sprites\/slime\/(sprite-\d+-\d+)\.png$/);
  if (slime) {
    return `sheet:slime:${slime[1]}`;
  }

  const ghostSlime = ref.match(/^\/assets\/sprites\/ghost_slime\/(sprite-\d+-\d+)\.png$/);
  if (ghostSlime) {
    return `sheet:ghost_slime:${ghostSlime[1]}`;
  }

  return ref;
}

export function parseSheetFrameRef(ref: string): ParsedSheetFrameRef | null {
  const normalized = normalizeSpriteRef(ref);
  if (!normalized.startsWith("sheet:")) return null;

  const parts = normalized.split(":");
  if (parts.length < 3) return null;

  const sheetKey = parts[1] as SpriteSheetKey;
  if (!(sheetKey in SPRITE_SHEET_CONFIGS)) return null;

  const frameName = parts[2];
  if (!frameName) return null;

  const flipX = parts[3] === "flip";
  return { sheetKey, frameName, flipX };
}

interface FrameRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface LoadedSheetData {
  img: HTMLImageElement;
  frames: Map<string, FrameRect>;
}

const sheetLoadCache = new Map<SpriteSheetKey, Promise<LoadedSheetData>>();
const frameDataUrlCache = new Map<string, string>();

function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = url;
  });
}

function getSheetData(sheetKey: SpriteSheetKey): Promise<LoadedSheetData> {
  const existing = sheetLoadCache.get(sheetKey);
  if (existing) return existing;

  const cfg = SPRITE_SHEET_CONFIGS[sheetKey];
  const promise = Promise.all([
    loadImageElement(cfg.imageUrl),
    fetch(cfg.jsonUrl).then((res) => {
      if (!res.ok) throw new Error(`Failed to fetch ${cfg.jsonUrl}: ${res.status}`);
      return res.json();
    }),
  ]).then(([img, json]) => {
    const frames = new Map<string, FrameRect>();
    const list = Array.isArray(json?.frames) ? json.frames : [];
    for (const entry of list) {
      if (entry?.filename && entry?.frame) {
        frames.set(entry.filename, {
          x: entry.frame.x,
          y: entry.frame.y,
          w: entry.frame.w,
          h: entry.frame.h,
        });
      }
    }
    return { img, frames };
  });

  sheetLoadCache.set(sheetKey, promise);
  return promise;
}

export function getCachedSheetFrameUrl(ref: string): string | null {
  const normalized = normalizeSpriteRef(ref);
  if (!normalized.startsWith("sheet:")) return normalized;
  return frameDataUrlCache.get(normalized) ?? null;
}

export async function resolveSheetFrameUrl(ref: string): Promise<string> {
  const normalized = normalizeSpriteRef(ref);
  if (!normalized.startsWith("sheet:")) return normalized;

  const cached = frameDataUrlCache.get(normalized);
  if (cached) return cached;

  const parsed = parseSheetFrameRef(normalized);
  if (!parsed) return TRANSPARENT_PIXEL_SRC;

  const { img, frames } = await getSheetData(parsed.sheetKey);
  const rect = frames.get(parsed.frameName);
  if (!rect) return TRANSPARENT_PIXEL_SRC;

  const canvas = document.createElement("canvas");
  canvas.width = rect.w;
  canvas.height = rect.h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return TRANSPARENT_PIXEL_SRC;

  ctx.imageSmoothingEnabled = false;
  if (parsed.flipX) {
    ctx.translate(rect.w, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);

  const dataUrl = canvas.toDataURL("image/png");
  frameDataUrlCache.set(normalized, dataUrl);
  return dataUrl;
}

export function setImgSrcResolved(
  img: HTMLImageElement | null | undefined,
  ref: string
): void {
  if (!img) return;
  const normalized = normalizeSpriteRef(ref);
  img.dataset.pendingSpriteRef = normalized;

  const cached = getCachedSheetFrameUrl(normalized);
  if (cached) {
    if (img.src !== cached) img.src = cached;
    return;
  }

  if (!img.src) {
    img.src = TRANSPARENT_PIXEL_SRC;
  }

  resolveSheetFrameUrl(normalized)
    .then((resolved) => {
      if (img.dataset.pendingSpriteRef === normalized && img.src !== resolved) {
        img.src = resolved;
      }
    })
    .catch((err) => {
      console.warn("Failed resolving sprite frame:", normalized, err);
    });
}

function escapeAttr(val: string): string {
  return val
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Returns HTML attributes (`src="..."` and `data-sheet-src="..."` if needed)
 * for `<img ...>` tags built inside template literals.
 */
export function imgSrcAttr(ref: string): string {
  const normalized = normalizeSpriteRef(ref);
  const cached = getCachedSheetFrameUrl(normalized);
  if (cached) {
    return `src="${escapeAttr(cached)}"`;
  }
  return `src="${TRANSPARENT_PIXEL_SRC}" data-sheet-src="${escapeAttr(normalized)}"`;
}

/**
 * Resolves any `<img data-sheet-src="...">` elements inside `root`.
 */
export function hydrateSheetImages(root: ParentNode | null | undefined): void {
  if (!root) return;
  const imgs = root.querySelectorAll<HTMLImageElement>("img[data-sheet-src]");
  imgs.forEach((img) => {
    const ref = img.dataset.sheetSrc;
    if (!ref) return;
    img.removeAttribute("data-sheet-src");
    setImgSrcResolved(img, ref);
  });
}
