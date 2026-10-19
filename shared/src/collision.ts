import {
  TILE_SIZE,
  GRID_COLS,
  GRID_ROWS,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  PLAYER_SPEED,
  CHARACTER_MAX_SIZE,
  PLAYER_HITBOX_HALF_WIDTH,
  PLAYER_FEET_TOP_OFFSET,
  PLAYER_FEET_BOTTOM_OFFSET,
} from "./constants";

export const WALL_ASSET_KEYS = ["wall_half_150", "wall_top_150", "obstacle"] as const;
export type WallAssetKey = (typeof WALL_ASSET_KEYS)[number];

/**
 * Checks whether a tile data string represents an impassable wall or obstacle tile.
 * Wall tiles come together with an obstacle tile. The presence of the obstacle tile
 * determines whether the tile is impassable. Removing the obstacle tile permits passage.
 */
export function isWallTile(tileValue: string | undefined | null): boolean {
  if (!tileValue) return false;
  const parts = tileValue.includes("::") ? tileValue.split("::") : [tileValue];
  for (const part of parts) {
    const baseKey = part.includes("|") ? part.split("|")[0] : part;
    if (baseKey === "obstacle") {
      return true;
    }
  }
  return false;
}

/**
 * Checks whether a tile data string contains an obstacle layer.
 */
export function hasObstacleTile(tileValue: string | undefined | null): boolean {
  if (!tileValue) return false;
  const parts = tileValue.includes("::") ? tileValue.split("::") : [tileValue];
  for (const part of parts) {
    const baseKey = part.includes("|") ? part.split("|")[0] : part;
    if (baseKey === "obstacle") {
      return true;
    }
  }
  return false;
}

export type TileBlockedChecker = (col: number, row: number) => boolean;

/**
 * Resolves player movement using feet-anchored axis-separated collision resolution.
 *
 * In 2D top-down perspective:
 * - Walking DOWN into a wall: the player's feet stop right above the top of the wall tile
 *   (PLAYER_FEET_BOTTOM_OFFSET = 32 keeps feet from touching or entering the top of the wall).
 * - Walking UP towards a wall: the player's feet walk all the way up until the front/toes reach
 *   the bottom edge of the wall (PLAYER_FEET_TOP_OFFSET = 20 allows the feet to reach the wall edge,
 *   while the torso/head naturally overlaps in front of the wall face).
 * - Walking LEFT / RIGHT: character cannot enter wall tiles on sides, while allowing free movement
 *   along the wall base.
 * - Smooth sliding along wall surfaces on diagonal movement.
 * - Anti-stuck escape guarantee: if a wall tile is spawned on top of the player,
 *   movement towards open space is permitted to walk out cleanly.
 */
export function resolveMovement(
  currentX: number,
  currentY: number,
  vx: number,
  vy: number,
  dtSeconds: number,
  isTileBlocked: TileBlockedChecker,
  halfWidth: number = PLAYER_HITBOX_HALF_WIDTH
): { x: number; y: number } {
  if (vx === 0 && vy === 0) {
    return { x: currentX, y: currentY };
  }

  let normVx = vx;
  let normVy = vy;
  if (normVx !== 0 && normVy !== 0) {
    const inv = 1 / Math.SQRT2;
    normVx *= inv;
    normVy *= inv;
  }

  const dx = normVx * PLAYER_SPEED * dtSeconds;
  const dy = normVy * PLAYER_SPEED * dtSeconds;

  // 1. Move & resolve horizontal (X) axis
  let desiredX = currentX + dx;
  desiredX = Math.max(halfWidth, Math.min(WORLD_WIDTH - halfWidth, desiredX));

  if (dx !== 0) {
    const minCol = Math.max(
      0,
      Math.floor((Math.min(currentX, desiredX) - halfWidth) / TILE_SIZE)
    );
    const maxCol = Math.min(
      GRID_COLS - 1,
      Math.floor((Math.max(currentX, desiredX) + halfWidth - 0.001) / TILE_SIZE)
    );
    const minRow = Math.max(
      0,
      Math.floor((currentY + PLAYER_FEET_TOP_OFFSET) / TILE_SIZE)
    );
    const maxRow = Math.min(
      GRID_ROWS - 1,
      Math.floor((currentY + PLAYER_FEET_BOTTOM_OFFSET - 0.001) / TILE_SIZE)
    );

    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        if (isTileBlocked(c, r)) {
          const wallLeft = c * TILE_SIZE;
          const wallRight = (c + 1) * TILE_SIZE;
          const wallCenterX = (c + 0.5) * TILE_SIZE;

          const currentBoxLeft = currentX - halfWidth;
          const currentBoxRight = currentX + halfWidth;
          const alreadyInside = currentBoxRight > wallLeft && currentBoxLeft < wallRight;

          if (dx > 0) {
            // Moving right
            const stoppedX = wallLeft - halfWidth;
            if (alreadyInside) {
              if (wallCenterX > currentX) {
                // Moving deeper into wall
                desiredX = Math.min(desiredX, currentX);
              }
            } else {
              desiredX = Math.min(desiredX, stoppedX);
            }
          } else if (dx < 0) {
            // Moving left
            const stoppedX = wallRight + halfWidth;
            if (alreadyInside) {
              if (wallCenterX < currentX) {
                // Moving deeper into wall
                desiredX = Math.max(desiredX, currentX);
              }
            } else {
              desiredX = Math.max(desiredX, stoppedX);
            }
          }
        }
      }
    }
  }

  const resolvedX = desiredX;

  // 2. Move & resolve vertical (Y) axis using resolvedX
  let desiredY = currentY + dy;
  const headHalf = CHARACTER_MAX_SIZE / 2; // 30px
  desiredY = Math.max(headHalf, Math.min(WORLD_HEIGHT - PLAYER_FEET_BOTTOM_OFFSET, desiredY));

  if (dy !== 0) {
    const minCol = Math.max(0, Math.floor((resolvedX - halfWidth) / TILE_SIZE));
    const maxCol = Math.min(
      GRID_COLS - 1,
      Math.floor((resolvedX + halfWidth - 0.001) / TILE_SIZE)
    );
    const minRow = Math.max(
      0,
      Math.floor((Math.min(currentY, desiredY) + PLAYER_FEET_TOP_OFFSET) / TILE_SIZE)
    );
    const maxRow = Math.min(
      GRID_ROWS - 1,
      Math.floor((Math.max(currentY, desiredY) + PLAYER_FEET_BOTTOM_OFFSET - 0.001) / TILE_SIZE)
    );

    const feetCenterY = currentY + (PLAYER_FEET_TOP_OFFSET + PLAYER_FEET_BOTTOM_OFFSET) / 2;

    for (let c = minCol; c <= maxCol; c++) {
      for (let r = minRow; r <= maxRow; r++) {
        if (isTileBlocked(c, r)) {
          const wallTop = r * TILE_SIZE;
          const wallBottom = (r + 1) * TILE_SIZE;
          const wallCenterY = (r + 0.5) * TILE_SIZE;

          const currentBoxTop = currentY + PLAYER_FEET_TOP_OFFSET;
          const currentBoxBottom = currentY + PLAYER_FEET_BOTTOM_OFFSET;
          const alreadyInside = currentBoxBottom > wallTop && currentBoxTop < wallBottom;

          if (dy > 0) {
            // Moving down towards wall: feet bottom stops at wallTop without touching
            const stoppedY = wallTop - PLAYER_FEET_BOTTOM_OFFSET;
            if (alreadyInside) {
              if (wallCenterY > feetCenterY) {
                desiredY = Math.min(desiredY, currentY);
              }
            } else {
              desiredY = Math.min(desiredY, stoppedY);
            }
          } else if (dy < 0) {
            // Moving up towards wall: feet top/toes reach the bottom edge of the wall
            const stoppedY = wallBottom - PLAYER_FEET_TOP_OFFSET;
            if (alreadyInside) {
              if (wallCenterY < feetCenterY) {
                desiredY = Math.max(desiredY, currentY);
              }
            } else {
              desiredY = Math.max(desiredY, stoppedY);
            }
          }
        }
      }
    }
  }

  return { x: resolvedX, y: desiredY };
}

/**
 * Finds a safe spawn position (tile center) starting from a preferred tile.
 * If the preferred tile is blocked by a wall, it spirals outward to locate the closest open tile.
 */
export function findSafeSpawnCenter(
  preferredTileX: number,
  preferredTileY: number,
  isTileBlocked: TileBlockedChecker
): { x: number; y: number } {
  const getSafeTilePos = (tx: number, ty: number) => ({
    x: tx * TILE_SIZE + TILE_SIZE / 2,
    y: ty * TILE_SIZE + 15, // Places feet at ty*50 + 35..47, safely inside tile
  });

  if (!isTileBlocked(preferredTileX, preferredTileY)) {
    return getSafeTilePos(preferredTileX, preferredTileY);
  }

  const maxR = Math.max(GRID_COLS, GRID_ROWS);
  for (let radius = 1; radius < maxR; radius++) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (Math.abs(dx) === radius || Math.abs(dy) === radius) {
          const tx = preferredTileX + dx;
          const ty = preferredTileY + dy;
          if (tx >= 0 && tx < GRID_COLS && ty >= 0 && ty < GRID_ROWS) {
            if (!isTileBlocked(tx, ty)) {
              return getSafeTilePos(tx, ty);
            }
          }
        }
      }
    }
  }

  return getSafeTilePos(preferredTileX, preferredTileY);
}
