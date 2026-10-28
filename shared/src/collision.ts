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
import { isAssetPixelSolid, getAssetRects } from "./assetBitmaps";

export const WALL_ASSET_KEYS = [
  "glass_1",
  "glass_2",
  "glass_3",
  "glass_4",
  "wood_wall_1",
  "wall_wood_1",
  "wood_wall_2",
  "wall_wood_2",
  "wood_wall_3",
  "wall_wood_3",
  "wood_wall_4",
  "wall_wood_4",
  "wood_wall_5",
  "wall_wood_5",
  "wood_wall_6",
  "wall_wood_6",
  "wood_wall_7",
  "wall_wood_7",
  "wood_wall_8",
  "wall_wood_8",
  "wood_wall_9",
  "wall_wood_9",
  "wood_wall_10",
  "wall_wood_10",
  "wood_wall_11",
  "wall_wood_11",
  "wood_wall_12",
  "wall_wood_12",
  "wood_wall_13",
  "wall_wood_13",
  "wood_wall_14",
  "wall_wood_14",
  "wood_wall_15",
  "wall_wood_15",
  "wood_wall_16",
  "wall_wood_16",
  "wood_wall_17",
  "wall_wood_17",
  "wood_wall_18",
  "wall_wood_18",
  "wood_wall_19",
  "wall_wood_19",
  "obstacle",
] as const;
export type WallAssetKey = (typeof WALL_ASSET_KEYS)[number];

export function isWallAsset(key: string | undefined | null): boolean {
  if (!key) return false;
  const baseKey = key.includes("|") ? key.split("|")[0] : key;
  if (
    baseKey === "glass_1" ||
    baseKey === "glass_2" ||
    baseKey === "glass_3" ||
    baseKey === "glass_4"
  ) {
    return true;
  }
  if (baseKey.startsWith("wood_wall_") || baseKey.startsWith("wall_wood_")) {
    return true;
  }
  return false;
}

export function isOverlayWallAsset(key: string | undefined | null): boolean {
  if (!key) return false;
  const baseKey = key.includes("|") ? key.split("|")[0] : key;
  return (
    baseKey === "glass_2" ||
    baseKey === "glass_3" ||
    baseKey === "glass_4" ||
    baseKey === "wood_wall_2" ||
    baseKey === "wall_wood_2"
  );
}

export function isOverlayFloorAsset(key: string | undefined | null): boolean {
  if (!key) return false;
  const baseKey = key.includes("|") ? key.split("|")[0] : key;
  return baseKey === "color_tile_overlay" || baseKey === "overlay_color_tile";
}

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

export interface SolidBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface PixelCollisionOptions {
  isPixelSolid: (worldX: number, worldY: number) => boolean;
  isBoxBlocked?: (minX: number, minY: number, maxX: number, maxY: number) => boolean;
  hasObstacleInBox?: (minX: number, minY: number, maxX: number, maxY: number) => boolean;
  getCollisionArea?: (minX: number, minY: number, maxX: number, maxY: number) => number;
}

export interface PixelCollisionEntity {
  x: number;
  y: number;
  passable?: boolean;
}

export interface PixelCollisionWorldInput {
  tiles: Map<string, string> | Record<string, string>;
  jukeboxes?: Iterable<PixelCollisionEntity>;
  typewriters?: Iterable<PixelCollisionEntity>;
  ashtrays?: Iterable<PixelCollisionEntity>;
  chessBoards?: Iterable<PixelCollisionEntity>;
  freeformDecorations?: Iterable<{ x: number; y: number; assetKey: string; passable?: boolean }>;
}

interface SolidProp {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  originX: number;
  originY: number;
  rects: Array<[number, number, number, number]>;
}

export function createPixelCollisionChecker(world: PixelCollisionWorldInput): PixelCollisionOptions {
  const getTileRaw = (c: number, r: number): string | undefined => {
    const key = `${c},${r}`;
    if (world.tiles instanceof Map) {
      return world.tiles.get(key);
    }
    return (world.tiles as Record<string, string>)[key];
  };

  // Pre-index all solid props once at creation time
  const solidProps: SolidProp[] = [];

  if (world.jukeboxes) {
    for (const jb of world.jukeboxes) {
      if (jb.passable === false) {
        solidProps.push({
          minX: jb.x - 24,
          maxX: jb.x + 24 - 1,
          minY: jb.y - 24,
          maxY: jb.y + 24 - 1,
          originX: jb.x - 24,
          originY: jb.y - 24,
          rects: getAssetRects("jukebox_1"),
        });
      }
    }
  }

  if (world.typewriters) {
    for (const tw of world.typewriters) {
      if (tw.passable === false) {
        solidProps.push({
          minX: tw.x - 24,
          maxX: tw.x + 24 - 1,
          minY: tw.y - 24,
          maxY: tw.y + 24 - 1,
          originX: tw.x - 24,
          originY: tw.y - 24,
          rects: getAssetRects("typewriter_1"),
        });
      }
    }
  }

  if (world.ashtrays) {
    for (const at of world.ashtrays) {
      if (at.passable === false) {
        solidProps.push({
          minX: at.x - 24,
          maxX: at.x + 24 - 1,
          minY: at.y - 24,
          maxY: at.y + 24 - 1,
          originX: at.x - 24,
          originY: at.y - 24,
          rects: getAssetRects("ashtray_1"),
        });
      }
    }
  }

  if (world.chessBoards) {
    for (const cb of world.chessBoards) {
      if (cb.passable === false) {
        solidProps.push({
          minX: cb.x - 25,
          maxX: cb.x + 25 - 1,
          minY: cb.y - 25,
          maxY: cb.y + 25 - 1,
          originX: cb.x - 25,
          originY: cb.y - 25,
          rects: getAssetRects("chess_board_1"),
        });
      }
    }
  }

  if (world.freeformDecorations) {
    for (const d of world.freeformDecorations) {
      if (!d.passable) {
        solidProps.push({
          minX: d.x - 25,
          maxX: d.x + 25 - 1,
          minY: d.y - 25,
          maxY: d.y + 25 - 1,
          originX: d.x - 25,
          originY: d.y - 25,
          rects: getAssetRects(d.assetKey),
        });
      }
    }
  }

  if (world.tiles) {
    const entries = world.tiles instanceof Map ? world.tiles.entries() : Object.entries(world.tiles);
    for (const [k, val] of entries) {
      if (typeof k === "string" && k.startsWith("freeform:") && val) {
        const parts = val.split("::");
        const isSolid = parts.includes("solid") || parts.includes("obstacle");
        if (isSolid && parts.length >= 2) {
          const assetKey = parts[0]?.split("|")[0];
          const coords = parts[1].split(",");
          const fx = parseFloat(coords[0]);
          const fy = parseFloat(coords[1]);
          if (!isNaN(fx) && !isNaN(fy) && assetKey) {
            solidProps.push({
              minX: fx - 25,
              maxX: fx + 25 - 1,
              minY: fy - 25,
              maxY: fy + 25 - 1,
              originX: fx - 25,
              originY: fy - 25,
              rects: getAssetRects(assetKey),
            });
          }
        }
      }
    }
  }

  // Fast tile rect lookup cache: key -> Array of [rx, ry, rw, rh]
  const tileRectCache = new Map<string, Array<[number, number, number, number]> | null>();

  const getTileObstacleRects = (c: number, r: number): Array<[number, number, number, number]> | null => {
    const key = `${c},${r}`;
    if (tileRectCache.has(key)) {
      return tileRectCache.get(key)!;
    }
    const val = getTileRaw(c, r);
    if (!val || !hasObstacleTile(val)) {
      tileRectCache.set(key, null);
      return null;
    }
    const parts = val.split("::");
    let hasDeco = false;
    for (let i = parts.length - 1; i >= 1; i--) {
      const p = parts[i];
      if (p === "obstacle" || p === "ontop" || p === "behind" || p.startsWith("layer:")) continue;
      hasDeco = true;
      const assetKey = p.split("@")[0].split("^")[0].split("|")[0];
      const rects = getAssetRects(assetKey);
      if (rects.length > 0) {
        tileRectCache.set(key, rects);
        return rects;
      }
    }
    if (!hasDeco) {
      const baseKey = parts[0]?.split("|")[0];
      if (baseKey && isWallAsset(baseKey)) {
        const rects = getAssetRects(baseKey);
        tileRectCache.set(key, rects);
        return rects;
      }
      if (parts.includes("obstacle") || baseKey === "obstacle") {
        const rects: Array<[number, number, number, number]> = [[0, 0, TILE_SIZE, TILE_SIZE]];
        tileRectCache.set(key, rects);
        return rects;
      }
    }
    tileRectCache.set(key, null);
    return null;
  };

  const isBoxBlocked = (left: number, top: number, right: number, bottom: number): boolean => {
    const minCol = Math.max(0, Math.floor(left / TILE_SIZE));
    const maxCol = Math.min(GRID_COLS - 1, Math.floor(right / TILE_SIZE));
    const minRow = Math.max(0, Math.floor(top / TILE_SIZE));
    const maxRow = Math.min(GRID_ROWS - 1, Math.floor(bottom / TILE_SIZE));

    for (let r = minRow; r <= maxRow; r++) {
      const cellY = r * TILE_SIZE;
      for (let c = minCol; c <= maxCol; c++) {
        const rects = getTileObstacleRects(c, r);
        if (rects) {
          const cellX = c * TILE_SIZE;
          for (let i = 0; i < rects.length; i++) {
            const rect = rects[i];
            const rx1 = cellX + rect[0];
            const ry1 = cellY + rect[1];
            const rx2 = rx1 + rect[2] - 1;
            const ry2 = ry1 + rect[3] - 1;
            if (right >= rx1 && left <= rx2 && bottom >= ry1 && top <= ry2) {
              return true;
            }
          }
        }
      }
    }

    for (let i = 0; i < solidProps.length; i++) {
      const p = solidProps[i];
      if (right >= p.minX && left <= p.maxX && bottom >= p.minY && top <= p.maxY) {
        for (let j = 0; j < p.rects.length; j++) {
          const rect = p.rects[j];
          const rx1 = p.originX + rect[0];
          const ry1 = p.originY + rect[1];
          const rx2 = rx1 + rect[2] - 1;
          const ry2 = ry1 + rect[3] - 1;
          if (right >= rx1 && left <= rx2 && bottom >= ry1 && top <= ry2) {
            return true;
          }
        }
      }
    }

    return false;
  };

  const hasObstacleInBox = (minX: number, minY: number, maxX: number, maxY: number): boolean => {
    const minCol = Math.max(0, Math.floor(minX / TILE_SIZE));
    const maxCol = Math.min(GRID_COLS - 1, Math.floor(maxX / TILE_SIZE));
    const minRow = Math.max(0, Math.floor(minY / TILE_SIZE));
    const maxRow = Math.min(GRID_ROWS - 1, Math.floor(maxY / TILE_SIZE));

    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        const val = getTileRaw(c, r);
        if (hasObstacleTile(val)) return true;
      }
    }
    for (let i = 0; i < solidProps.length; i++) {
      const p = solidProps[i];
      if (maxX >= p.minX && minX <= p.maxX && maxY >= p.minY && minY <= p.maxY) {
        return true;
      }
    }
    return false;
  };

  const getCollisionArea = (left: number, top: number, right: number, bottom: number): number => {
    let area = 0;
    const minCol = Math.max(0, Math.floor(left / TILE_SIZE));
    const maxCol = Math.min(GRID_COLS - 1, Math.floor(right / TILE_SIZE));
    const minRow = Math.max(0, Math.floor(top / TILE_SIZE));
    const maxRow = Math.min(GRID_ROWS - 1, Math.floor(bottom / TILE_SIZE));

    for (let r = minRow; r <= maxRow; r++) {
      const cellY = r * TILE_SIZE;
      for (let c = minCol; c <= maxCol; c++) {
        const rects = getTileObstacleRects(c, r);
        if (rects) {
          const cellX = c * TILE_SIZE;
          for (let i = 0; i < rects.length; i++) {
            const rect = rects[i];
            const rx1 = cellX + rect[0];
            const ry1 = cellY + rect[1];
            const rx2 = rx1 + rect[2] - 1;
            const ry2 = ry1 + rect[3] - 1;
            const ix = Math.max(0, Math.min(right, rx2) - Math.max(left, rx1) + 1);
            const iy = Math.max(0, Math.min(bottom, ry2) - Math.max(top, ry1) + 1);
            area += ix * iy;
          }
        }
      }
    }
    for (let i = 0; i < solidProps.length; i++) {
      const p = solidProps[i];
      if (right >= p.minX && left <= p.maxX && bottom >= p.minY && top <= p.maxY) {
        for (let j = 0; j < p.rects.length; j++) {
          const rect = p.rects[j];
          const rx1 = p.originX + rect[0];
          const ry1 = p.originY + rect[1];
          const rx2 = rx1 + rect[2] - 1;
          const ry2 = ry1 + rect[3] - 1;
          const ix = Math.max(0, Math.min(right, rx2) - Math.max(left, rx1) + 1);
          const iy = Math.max(0, Math.min(bottom, ry2) - Math.max(top, ry1) + 1);
          area += ix * iy;
        }
      }
    }
    return area;
  };

  const isPixelSolid = (worldX: number, worldY: number): boolean => {
    const col = Math.floor(worldX / TILE_SIZE);
    const row = Math.floor(worldY / TILE_SIZE);
    if (col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS) {
      const rects = getTileObstacleRects(col, row);
      if (rects) {
        const lx = worldX - col * TILE_SIZE;
        const ly = worldY - row * TILE_SIZE;
        for (let i = 0; i < rects.length; i++) {
          const r = rects[i];
          if (lx >= r[0] && lx < r[0] + r[2] && ly >= r[1] && ly < r[1] + r[3]) {
            return true;
          }
        }
      }
    }
    for (let i = 0; i < solidProps.length; i++) {
      const p = solidProps[i];
      if (worldX >= p.minX && worldX <= p.maxX && worldY >= p.minY && worldY <= p.maxY) {
        const lx = worldX - p.originX;
        const ly = worldY - p.originY;
        for (let j = 0; j < p.rects.length; j++) {
          const r = p.rects[j];
          if (lx >= r[0] && lx < r[0] + r[2] && ly >= r[1] && ly < r[1] + r[3]) {
            return true;
          }
        }
      }
    }
    return false;
  };

  return { isPixelSolid, isBoxBlocked, hasObstacleInBox, getCollisionArea };
}

/**
 * Resolves player movement using feet-anchored axis-separated collision resolution.
 * Supports pixel-based collision where only rendered non-transparent pixels collide.
 */
export function resolveMovement(
  currentX: number,
  currentY: number,
  vx: number,
  vy: number,
  dtSeconds: number,
  isTileBlocked?: TileBlockedChecker,
  halfWidth: number = PLAYER_HITBOX_HALF_WIDTH,
  solidBoxes?: SolidBox[],
  pixelCollision?: PixelCollisionOptions | ((worldX: number, worldY: number) => boolean)
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

  // --- Pixel-based Collision Resolution ---
  if (pixelCollision) {
    const isSolid =
      typeof pixelCollision === "function" ? pixelCollision : pixelCollision.isPixelSolid;
    const hasObstacle =
      typeof pixelCollision === "object" && pixelCollision.hasObstacleInBox
        ? pixelCollision.hasObstacleInBox
        : undefined;

    const feetTop = PLAYER_FEET_TOP_OFFSET;
    const feetBottom = PLAYER_FEET_BOTTOM_OFFSET;

    const isBoxBlocked = (px: number, py: number): boolean => {
      const left = Math.round(px - halfWidth);
      const right = Math.round(px + halfWidth);
      const top = Math.round(py + feetTop);
      const bottom = Math.round(py + feetBottom);

      if (typeof pixelCollision === "object" && pixelCollision.isBoxBlocked) {
        return pixelCollision.isBoxBlocked(left, top, right, bottom);
      }
      if (hasObstacle && !hasObstacle(left, top, right, bottom)) {
        return false;
      }
      for (let y = top; y <= bottom; y++) {
        for (let x = left; x <= right; x++) {
          if (isSolid(x, y)) return true;
        }
      }
      return false;
    };

    const countBoxCollisions = (px: number, py: number): number => {
      const left = Math.round(px - halfWidth);
      const right = Math.round(px + halfWidth);
      const top = Math.round(py + feetTop);
      const bottom = Math.round(py + feetBottom);

      if (typeof pixelCollision === "object" && pixelCollision.getCollisionArea) {
        return pixelCollision.getCollisionArea(left, top, right, bottom);
      }
      if (hasObstacle && !hasObstacle(left, top, right, bottom)) {
        return 0;
      }
      let count = 0;
      for (let y = top; y <= bottom; y++) {
        for (let x = left; x <= right; x++) {
          if (isSolid(x, y)) count++;
        }
      }
      return count;
    };

    // 1. Move & resolve horizontal (X) axis
    let desiredX = currentX + dx;
    desiredX = Math.max(halfWidth, Math.min(WORLD_WIDTH - halfWidth, desiredX));
    let resolvedX = currentX;

    if (dx !== 0) {
      const curBlocked = isBoxBlocked(currentX, currentY);
      const stepSize = Math.max(2, halfWidth);
      const numSteps = Math.min(8, Math.ceil(Math.abs(desiredX - currentX) / stepSize));
      let firstBlockedX: number | null = null;
      let lastFreeX = currentX;

      for (let s = 1; s <= numSteps; s++) {
        const testX = currentX + (desiredX - currentX) * (s / numSteps);
        if (isBoxBlocked(testX, currentY)) {
          firstBlockedX = testX;
          break;
        } else {
          lastFreeX = testX;
        }
      }

      if (firstBlockedX === null) {
        resolvedX = desiredX;
      } else if (
        curBlocked &&
        countBoxCollisions(desiredX, currentY) <= countBoxCollisions(currentX, currentY)
      ) {
        // Anti-stuck: moving out of obstacle
        resolvedX = desiredX;
      } else {
        let freeX = lastFreeX;
        let blockedX = firstBlockedX;
        for (let i = 0; i < 7; i++) {
          const mid = (freeX + blockedX) / 2;
          if (isBoxBlocked(mid, currentY)) {
            blockedX = mid;
          } else {
            freeX = mid;
          }
        }
        resolvedX = freeX;
      }
    }

    // 2. Move & resolve vertical (Y) axis using resolvedX
    let desiredY = currentY + dy;
    const headHalf = CHARACTER_MAX_SIZE / 2;
    desiredY = Math.max(headHalf, Math.min(WORLD_HEIGHT - PLAYER_FEET_BOTTOM_OFFSET, desiredY));
    let resolvedY = currentY;

    if (dy !== 0) {
      const curBlockedY = isBoxBlocked(resolvedX, currentY);
      const stepSizeY = Math.max(2, Math.abs(feetBottom - feetTop) / 2);
      const numStepsY = Math.min(8, Math.ceil(Math.abs(desiredY - currentY) / stepSizeY));
      let firstBlockedY: number | null = null;
      let lastFreeY = currentY;

      for (let s = 1; s <= numStepsY; s++) {
        const testY = currentY + (desiredY - currentY) * (s / numStepsY);
        if (isBoxBlocked(resolvedX, testY)) {
          firstBlockedY = testY;
          break;
        } else {
          lastFreeY = testY;
        }
      }

      if (firstBlockedY === null) {
        resolvedY = desiredY;
      } else if (
        curBlockedY &&
        countBoxCollisions(resolvedX, desiredY) <= countBoxCollisions(resolvedX, currentY)
      ) {
        // Anti-stuck: moving out of obstacle
        resolvedY = desiredY;
      } else {
        let freeY = lastFreeY;
        let blockedY = firstBlockedY;
        for (let i = 0; i < 7; i++) {
          const mid = (freeY + blockedY) / 2;
          if (isBoxBlocked(resolvedX, mid)) {
            blockedY = mid;
          } else {
            freeY = mid;
          }
        }
        resolvedY = freeY;
      }
    }

    return { x: resolvedX, y: resolvedY };
  }

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
        if (isTileBlocked && isTileBlocked(c, r)) {
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

    if (solidBoxes && solidBoxes.length > 0) {
      const feetTop = currentY + PLAYER_FEET_TOP_OFFSET;
      const feetBottom = currentY + PLAYER_FEET_BOTTOM_OFFSET;
      for (const box of solidBoxes) {
        if (feetBottom > box.minY && feetTop < box.maxY) {
          const boxCenterX = (box.minX + box.maxX) / 2;
          const currentBoxLeft = currentX - halfWidth;
          const currentBoxRight = currentX + halfWidth;
          const alreadyInside = currentBoxRight > box.minX && currentBoxLeft < box.maxX;

          if (dx > 0) {
            const stoppedX = box.minX - halfWidth;
            if (alreadyInside) {
              if (boxCenterX > currentX) {
                desiredX = Math.min(desiredX, currentX);
              }
            } else {
              desiredX = Math.min(desiredX, stoppedX);
            }
          } else if (dx < 0) {
            const stoppedX = box.maxX + halfWidth;
            if (alreadyInside) {
              if (boxCenterX < currentX) {
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
  const headHalf = CHARACTER_MAX_SIZE / 2; // 25px
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
        if (isTileBlocked && isTileBlocked(c, r)) {
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

    if (solidBoxes && solidBoxes.length > 0) {
      const feetCenterY = currentY + (PLAYER_FEET_TOP_OFFSET + PLAYER_FEET_BOTTOM_OFFSET) / 2;
      for (const box of solidBoxes) {
        if (resolvedX + halfWidth > box.minX && resolvedX - halfWidth < box.maxX) {
          const boxCenterY = (box.minY + box.maxY) / 2;
          const currentBoxTop = currentY + PLAYER_FEET_TOP_OFFSET;
          const currentBoxBottom = currentY + PLAYER_FEET_BOTTOM_OFFSET;
          const alreadyInside = currentBoxBottom > box.minY && currentBoxTop < box.maxY;

          if (dy > 0) {
            const stoppedY = box.minY - PLAYER_FEET_BOTTOM_OFFSET;
            if (alreadyInside) {
              if (boxCenterY > feetCenterY) {
                desiredY = Math.min(desiredY, currentY);
              }
            } else {
              desiredY = Math.min(desiredY, stoppedY);
            }
          } else if (dy < 0) {
            const stoppedY = box.maxY - PLAYER_FEET_TOP_OFFSET;
            if (alreadyInside) {
              if (boxCenterY < feetCenterY) {
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
