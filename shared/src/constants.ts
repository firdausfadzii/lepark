export const TILE_SIZE = 50;
export const GRID_COLS = 48;
export const GRID_ROWS = 36;

export const WORLD_WIDTH = GRID_COLS * TILE_SIZE; // 2400
export const WORLD_HEIGHT = GRID_ROWS * TILE_SIZE; // 1800

export const CHARACTER_MAX_SIZE = 50; // 50x50px character size (reduced by 10px)
export const PLAYER_RADIUS = 12; // Default dot radius (diameter 24px, reduced by 10px)
export const PLAYER_SPEED = 260; // Smooth continuous walking speed (px/sec)
export const PLAYER_COLLISION_HALF_SIZE = 14; // Default half-width
export const PLAYER_HITBOX_HALF_WIDTH = 14; // 28px width for passing 50px doorways
export const PLAYER_FEET_TOP_OFFSET = 15;   // Top of feet: reaches bottom edge of wall when moving up
export const PLAYER_FEET_BOTTOM_OFFSET = 27; // Bottom of feet: prevents feet from touching top of wall when moving down
export const TILE_MOVE_DURATION = 0.25; // Retained for compatibility

export const DEFAULT_PRESET_COLORS = [
  "#3B8282", // Lepark Slate Teal (Primary)
  "#ECA239", // Lepark Ochre / Marigold (Secondary)
  "#DB5B47", // Lepark Terracotta (Accent)
  "#1E3131", // Lepark Deep Teal
  "#10b981", // Emerald Green
  "#3b82f6", // Royal Blue
  "#06b6d4", // Cyan
  "#f97316", // Bright Orange
  "#ec4899", // Rose Pink
  "#8b5cf6", // Purple
  "#14b8a6", // Mint Teal
  "#64748b"  // Cool Gray
];

export const SERVER_TICK_RATE = 20; // 20 Hz tick loop

export const ASSET_UNLOCK_COST = 50; // Focus Points (FP) required per paid map editor sprite
export const NAME_CHANGE_FP_COST = 1000; // Focus Points (FP) required to change display name

export const FOCUS_IDLE_TIMEOUT_MS = 60_000; // 1 minute without moving opens Focus Room
export const FOCUS_BASE_FP_PER_MINUTE = 4;
export const FOCUS_MIN_MINUTES = 10; // Anti-spam minimum threshold for FP
export const FOCUS_DAILY_FULL_RATE_MINUTES = 240; // 4 hours/day at 100% FP, 50% beyond
export const FOCUS_STRICT_AWAY_GRACE_MS = 30_000; // 30s grace before Strict Lock bonus forfeits
export const FOCUS_SQUAD_MAX_MEMBERS = 8;
export const DEFAULT_POMODORO_MINUTES = 25;
export const POMODORO_PRESET_MINUTES = [15, 25, 50] as const;

export function isPaidAssetId(assetId: string | undefined | null): boolean {
  if (!assetId) return false;
  return (
    assetId.startsWith("office_one/") ||
    assetId.startsWith("office_two/") ||
    assetId.startsWith("pet_shop/") ||
    assetId.startsWith("adventure_guild/") ||
    assetId.startsWith("restaurant/") ||
    assetId.startsWith("living_room_one/") ||
    assetId.startsWith("living_room_two/") ||
    assetId.startsWith("living_room_floor/")
  );
}

export function getTileCenter(tileX: number, tileY: number): { x: number; y: number } {
  return {
    x: tileX * TILE_SIZE + TILE_SIZE / 2,
    y: tileY * TILE_SIZE + TILE_SIZE / 2,
  };
}

export function getTileCoords(pixelX: number, pixelY: number): { tileX: number; tileY: number } {
  return {
    tileX: Math.max(0, Math.min(GRID_COLS - 1, Math.floor(pixelX / TILE_SIZE))),
    tileY: Math.max(0, Math.min(GRID_ROWS - 1, Math.floor(pixelY / TILE_SIZE))),
  };
}

