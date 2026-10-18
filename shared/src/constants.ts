export const TILE_SIZE = 50;
export const GRID_COLS = 48;
export const GRID_ROWS = 36;

export const WORLD_WIDTH = GRID_COLS * TILE_SIZE; // 2400
export const WORLD_HEIGHT = GRID_ROWS * TILE_SIZE; // 1800

export const CHARACTER_MAX_SIZE = 60; // 60x60px character size (reduced by 10px)
export const PLAYER_RADIUS = 17; // Default dot radius (diameter 34px, reduced by 10px)
export const PLAYER_SPEED = 260; // Smooth continuous walking speed (px/sec)
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

