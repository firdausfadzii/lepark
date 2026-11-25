import { PlayerOutfit, DEFAULT_PLAYER_OUTFIT, FashionAnimState } from "shared";
import {
  FASHION_ANIM_SPECS,
  FASHION_CELL_SIZE,
  bakeOutfitCanvas,
  buildOutfitTextureKey,
} from "./fashionBaker";

const frameCache = new Map<string, string>();

/**
 * Renders a 92x92 composite preview data URL using the exact same Bake-on-Equip
 * compositor used by in-game Phaser PlayerAvatar sprites.
 */
export async function renderFashionPreviewFrame(
  outfit: Partial<PlayerOutfit>,
  dirIndex: number = 0,
  frameCol: number = 0,
  isWalk: boolean = false,
  animOverride?: FashionAnimState
): Promise<string> {
  const resolved: PlayerOutfit = { ...DEFAULT_PLAYER_OUTFIT, ...outfit };
  const anim: FashionAnimState = animOverride || (isWalk ? "walking" : "idle");
  const spec = FASHION_ANIM_SPECS[anim];
  const col = ((frameCol % spec.cols) + spec.cols) % spec.cols;
  const dir = ((dirIndex % spec.rows) + spec.rows) % spec.rows;

  const cacheKey = `${buildOutfitTextureKey(resolved, anim)}|${dir}|${col}`;
  const cached = frameCache.get(cacheKey);
  if (cached) return cached;

  const sheetCanvas = await bakeOutfitCanvas(resolved, anim);
  const frameCanvas = document.createElement("canvas");
  frameCanvas.width = FASHION_CELL_SIZE;
  frameCanvas.height = FASHION_CELL_SIZE;
  const ctx = frameCanvas.getContext("2d");
  if (!ctx) return "";
  ctx.imageSmoothingEnabled = false;

  ctx.drawImage(
    sheetCanvas,
    col * FASHION_CELL_SIZE,
    dir * FASHION_CELL_SIZE,
    FASHION_CELL_SIZE,
    FASHION_CELL_SIZE,
    0,
    0,
    FASHION_CELL_SIZE,
    FASHION_CELL_SIZE
  );

  const dataUrl = frameCanvas.toDataURL("image/png");
  if (frameCache.size > 256) {
    frameCache.clear();
  }
  frameCache.set(cacheKey, dataUrl);
  return dataUrl;
}
