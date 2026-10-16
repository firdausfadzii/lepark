export const TILE_SIZE = 150;
export const GRID_COLS = 16;
export const GRID_ROWS = 12;

export const WORLD_WIDTH = GRID_COLS * TILE_SIZE; // 2400
export const WORLD_HEIGHT = GRID_ROWS * TILE_SIZE; // 1800

export const CHARACTER_MAX_SIZE = 75; // Proportionate character size (50% of tile)
export const PLAYER_RADIUS = 24; // Default dot radius (diameter 48px)
export const PLAYER_SPEED = 280; // Smooth continuous walking speed (px/sec)
export const TILE_MOVE_DURATION = 0.25; // Retained for compatibility

export const DEFAULT_PRESET_COLORS = [
  "#ef4444", // Crimson Red
  "#f97316", // Bright Orange
  "#f59e0b", // Amber / Gold
  "#10b981", // Emerald Green
  "#06b6d4", // Cyan
  "#3b82f6", // Royal Blue
  "#6366f1", // Indigo
  "#8b5cf6", // Purple
  "#ec4899", // Rose Pink
  "#14b8a6", // Teal
  "#1e293b", // Slate Charcoal
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

