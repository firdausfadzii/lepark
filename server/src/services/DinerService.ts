import { Client } from "colyseus";
import {
  TILE_SIZE,
  GRID_COLS,
  GRID_ROWS,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  PixelCollisionOptions,
  parseFreeformTile,
  getAssetDimensions,
  DINER_CUSTOMER_PROFILES,
  DINER_MENU_DISHES,
  DINER_MAX_CARRIED_ITEMS,
  DINER_MAX_QUEUE_LENGTH,
  DINER_HOSTESS_INTERACT_RANGE,
  DINER_KITCHEN_INTERACT_RANGE,
  DINER_TABLE_INTERACT_RANGE,
  DinerCustomerProfile,
  DinerCustomerState,
  DinerDirection,
  DinerEmployeeState,
  DinerGameState,
  DinerKitchenOrder,
  DinerPointAnchor,
  DinerTableState,
  DinerActionErrorPayload,
  DinerEventPayload,
  calculateDinerCustomerFp,
  distanceToAnchorBox,
} from "shared";
import { addFocusPoints } from "../db";
import { focusPointsService } from "./FocusPointsService";

interface InternalCustomer extends DinerCustomerState {
  path: Array<{ x: number; y: number }>;
  walkSpeed: number;
  patienceMaxMs: number;
  patienceRemainingMs: number;
  thinkingRemainingMs: number;
  eatingRemainingMs: number;
  lockedFp: number;
  approachX: number;
  approachY: number;
  seatX: number;
  seatY: number;
  seatDir: DinerDirection;
  despawnOnArrive: boolean;
}

interface InternalTable extends DinerTableState {
  approachX: number;
  approachY: number;
}

interface InternalEmployee extends DinerEmployeeState {
  lastActiveAt: number;
  lastX: number;
  lastY: number;
}

const HOSTESS_ASSET_KEYS = new Set([
  "restaurant/rest_hostess_podium",
  "restaurant/rest_menu_podium",
]);

const KITCHEN_PRIMARY_KEYS = new Set([
  "restaurant/rest_expo_pass_counter",
]);

const KITCHEN_FALLBACK_KEYS = new Set([
  "restaurant/rest_central_plating_island",
  "restaurant/rest_gas_range",
  "restaurant/rest_grill_station",
  "restaurant/rest_pizza_oven",
]);

const TABLE_ASSET_KEYS = new Set([
  "restaurant/rest_dining_table",
  "restaurant/rest_booth_table",
  "restaurant/rest_vip_banquet_table",
]);

const CHAIR_ASSET_KEYS = new Set([
  "restaurant/rest_dining_chair_front",
  "restaurant/rest_dining_chair_back",
  "restaurant/rest_dining_chair_side",
  "restaurant/rest_booth_sofa",
  "restaurant/rest_vip_armchair_front",
  "restaurant/rest_vip_armchair_back",
  "restaurant/rest_vip_armchair_side",
]);

function normalizeKey(raw: string): string {
  const base = raw.split("|")[0].trim();
  if (base.startsWith("rest_")) return `restaurant/${base}`;
  return base;
}

export class DinerRoomController {
  private enabled = false;
  private isPlaying = false;
  private hostessPodium: DinerPointAnchor | null = null;
  private kitchenCounter: DinerPointAnchor | null = null;
  private entrancePoint: { x: number; y: number } = { x: 1200, y: 1625 };
  private queueSlots: Array<{ x: number; y: number; dir: DinerDirection }> = [];
  private tables: InternalTable[] = [];
  private employees = new Map<string, InternalEmployee>();
  private customers: InternalCustomer[] = [];
  private kitchenOrders: DinerKitchenOrder[] = [];
  private shiftTotalFp = 0;
  private shiftServedCount = 0;
  private shiftLostCount = 0;
  private nextSpawnAt = 0;
  private lastBroadcastAt = 0;
  private dirty = false;
  private idCounter = 1;
  private walkGrid: Uint8Array = new Uint8Array(GRID_COLS * GRID_ROWS);

  constructor(
    private readonly broadcastFn: (type: string, payload: unknown) => void,
    private readonly getClientFn: (sessionId: string) => Client | undefined
  ) {}

  public isEnabled(): boolean {
    return this.enabled;
  }

  public isActive(): boolean {
    return this.isPlaying;
  }

  public getPublicState(): DinerGameState {
    const employeesObj: Record<string, DinerEmployeeState> = {};
    for (const [sid, emp] of this.employees.entries()) {
      employeesObj[sid] = {
        sessionId: emp.sessionId,
        userId: emp.userId,
        name: emp.name,
        color: emp.color,
        carriedItems: emp.carriedItems.map((c) => ({ ...c })),
        earnedFp: emp.earnedFp,
        customersServed: emp.customersServed,
      };
    }

    return {
      enabled: this.enabled,
      isPlaying: this.isPlaying,
      hostessPodium: this.hostessPodium ? { ...this.hostessPodium } : null,
      kitchenCounter: this.kitchenCounter ? { ...this.kitchenCounter } : null,
      entrancePoint: { ...this.entrancePoint },
      employees: employeesObj,
      tables: this.tables.map((t) => ({
        id: t.id,
        tableNumber: t.tableNumber,
        x: t.x,
        y: t.y,
        width: t.width,
        height: t.height,
        seatX: t.seatX,
        seatY: t.seatY,
        seatDir: t.seatDir,
        occupiedByCustomerId: t.occupiedByCustomerId,
      })),
      customers: this.customers.map((c) => ({
        id: c.id,
        name: c.name,
        spriteType: c.spriteType,
        status: c.status,
        x: Math.round(c.x * 10) / 10,
        y: Math.round(c.y * 10) / 10,
        direction: c.direction,
        isMoving: c.isMoving,
        queueIndex: c.queueIndex,
        tableId: c.tableId,
        tableNumber: c.tableNumber,
        dishId: c.dishId,
        dishName: c.dishName,
        maxFp: c.maxFp,
        expectedFp: c.expectedFp,
        patienceRatio: Math.round(c.patienceRatio * 1000) / 1000,
        patiencePhase: c.patiencePhase,
        emotion: c.emotion,
      })),
      kitchenOrders: this.kitchenOrders.map((o) => ({ ...o })),
      shiftTotalFp: this.shiftTotalFp,
      shiftServedCount: this.shiftServedCount,
      shiftLostCount: this.shiftLostCount,
    };
  }

  public syncLayoutFromTiles(
    tiles: Record<string, string>,
    pixelChecker: PixelCollisionOptions
  ): void {
    this.rebuildWalkGrid(pixelChecker);

    let bestHostess: (DinerPointAnchor & { priority: number }) | null = null;
    let bestKitchen: (DinerPointAnchor & { priority: number }) | null = null;
    const rawTables: Array<DinerPointAnchor & { isBooth: boolean }> = [];
    const chairs: Array<{ id: string; key: string; x: number; y: number }> = [];
    let spawnPoint: { x: number; y: number } | null = null;

    for (const [k, v] of Object.entries(tiles)) {
      if (!v || typeof v !== "string") continue;

      if (k === "spawn_point") {
        const parts = v.split(",");
        const col = parseInt(parts[0], 10);
        const row = parseInt(parts[1], 10);
        if (!Number.isNaN(col) && !Number.isNaN(row)) {
          spawnPoint = {
            x: col * TILE_SIZE + TILE_SIZE / 2,
            y: row * TILE_SIZE + TILE_SIZE / 2,
          };
        }
        continue;
      }

      if (k.startsWith("freeform:")) {
        const parsed = parseFreeformTile(v);
        if (!parsed) continue;
        const key = normalizeKey(parsed.assetKey);
        const dims = getAssetDimensions(key);
        const w = Math.max(40, dims.width);
        const h = Math.max(40, dims.height);

        if (HOSTESS_ASSET_KEYS.has(key)) {
          const priority = key === "restaurant/rest_hostess_podium" ? 2 : 1;
          if (!bestHostess || priority > bestHostess.priority) {
            bestHostess = { id: k, x: parsed.x, y: parsed.y, width: w, height: h, priority };
          }
        } else if (KITCHEN_PRIMARY_KEYS.has(key) || KITCHEN_FALLBACK_KEYS.has(key)) {
          const priority = KITCHEN_PRIMARY_KEYS.has(key) ? 2 : 1;
          if (!bestKitchen || priority > bestKitchen.priority) {
            bestKitchen = { id: k, x: parsed.x, y: parsed.y, width: w, height: h, priority };
          }
        } else if (TABLE_ASSET_KEYS.has(key)) {
          rawTables.push({
            id: k,
            x: parsed.x,
            y: parsed.y,
            width: w,
            height: h,
            isBooth: key === "restaurant/rest_booth_table",
          });
        } else if (CHAIR_ASSET_KEYS.has(key)) {
          chairs.push({ id: k, key, x: parsed.x, y: parsed.y });
        }
      } else if (/^\d+,\d+$/.test(k)) {
        const [colStr, rowStr] = k.split(",");
        const col = parseInt(colStr, 10);
        const row = parseInt(rowStr, 10);
        if (Number.isNaN(col) || Number.isNaN(row)) continue;
        const wx = col * TILE_SIZE + TILE_SIZE / 2;
        const wy = row * TILE_SIZE + TILE_SIZE / 2;
        const parts = v.split("::");
        for (let i = 1; i < parts.length; i++) {
          const p = parts[i];
          if (
            p === "obstacle" ||
            p === "ontop" ||
            p === "behind" ||
            p.startsWith("layer:") ||
            p.startsWith("interact:")
          ) {
            continue;
          }
          const rawKey = p.split("~")[0].split("@")[0].split("^")[0].split("|")[0];
          const key = normalizeKey(rawKey);
          const dims = getAssetDimensions(key);
          const w = Math.max(40, dims.width);
          const h = Math.max(40, dims.height);

          if (HOSTESS_ASSET_KEYS.has(key)) {
            const priority = key === "restaurant/rest_hostess_podium" ? 2 : 1;
            if (!bestHostess || priority > bestHostess.priority) {
              bestHostess = { id: k, x: wx, y: wy, width: w, height: h, priority };
            }
          } else if (KITCHEN_PRIMARY_KEYS.has(key) || KITCHEN_FALLBACK_KEYS.has(key)) {
            const priority = KITCHEN_PRIMARY_KEYS.has(key) ? 2 : 1;
            if (!bestKitchen || priority > bestKitchen.priority) {
              bestKitchen = { id: k, x: wx, y: wy, width: w, height: h, priority };
            }
          } else if (TABLE_ASSET_KEYS.has(key)) {
            rawTables.push({
              id: k,
              x: wx,
              y: wy,
              width: w,
              height: h,
              isBooth: key === "restaurant/rest_booth_table",
            });
          } else if (CHAIR_ASSET_KEYS.has(key)) {
            chairs.push({ id: k, key, x: wx, y: wy });
          }
        }
      }
    }

    this.hostessPodium = bestHostess
      ? {
          id: bestHostess.id,
          x: bestHostess.x,
          y: bestHostess.y,
          width: bestHostess.width,
          height: bestHostess.height,
        }
      : null;

    this.kitchenCounter = bestKitchen
      ? {
          id: bestKitchen.id,
          x: bestKitchen.x,
          y: bestKitchen.y,
          width: bestKitchen.width,
          height: bestKitchen.height,
        }
      : null;

    // Sort tables left-to-right columns (180px bucket), then top-to-bottom
    rawTables.sort((a, b) => {
      const colA = Math.round(a.x / 180);
      const colB = Math.round(b.x / 180);
      if (colA !== colB) return colA - colB;
      return a.y - b.y;
    });

    const prevTableMap = new Map(this.tables.map((t) => [t.id, t]));
    this.tables = rawTables.map((rt, idx) => {
      const prev = prevTableMap.get(rt.id);
      const seat = this.pickSeatForTable(rt, chairs, pixelChecker);
      const approach = this.findNearestWalkablePoint(
        seat.seatX,
        seat.seatY,
        rt.x,
        rt.y,
        pixelChecker
      );
      return {
        id: rt.id,
        tableNumber: idx + 1,
        x: rt.x,
        y: rt.y,
        width: rt.width,
        height: rt.height,
        seatX: seat.seatX,
        seatY: seat.seatY,
        seatDir: seat.seatDir,
        approachX: approach.x,
        approachY: approach.y,
        occupiedByCustomerId: prev ? prev.occupiedByCustomerId : null,
      };
    });

    this.enabled = Boolean(this.hostessPodium && this.kitchenCounter && this.tables.length > 0);

    if (this.hostessPodium) {
      this.computeEntranceAndQueue(this.hostessPodium, spawnPoint, pixelChecker);
    }

    if (!this.enabled && this.isPlaying) {
      this.endShift("Restaurant layout no longer complete — shift ended.");
    } else {
      this.dirty = true;
    }
  }

  private pickSeatForTable(
    table: { x: number; y: number; width: number; height: number; isBooth: boolean },
    chairs: Array<{ id: string; key: string; x: number; y: number }>,
    pixelChecker: PixelCollisionOptions
  ): { seatX: number; seatY: number; seatDir: DinerDirection } {
    const nearbyChairs = chairs
      .filter((c) => Math.hypot(c.x - table.x, c.y - table.y) <= 110)
      .sort((a, b) => {
        const score = (c: { key: string; x: number; y: number }) => {
          if (c.key.includes("front") || c.y < table.y - 10) return 0;
          if (c.key.includes("sofa") || c.key.includes("side")) return 1;
          return 2;
        };
        const sa = score(a);
        const sb = score(b);
        if (sa !== sb) return sa - sb;
        return a.x - b.x;
      });

    if (nearbyChairs.length > 0) {
      const ch = nearbyChairs[0];
      const dx = table.x - ch.x;
      const dy = table.y - ch.y;
      let seatDir: DinerDirection = "south";
      if (Math.abs(dx) > Math.abs(dy)) {
        seatDir = dx > 0 ? "east" : "west";
      } else {
        seatDir = dy >= 0 ? "south" : "north";
      }
      return { seatX: ch.x, seatY: ch.y, seatDir };
    }

    // Fallback: pick a walkable side next to the table
    const candidates: Array<{ x: number; y: number; dir: DinerDirection }> = [
      { x: table.x, y: table.y - table.height / 2 - 22, dir: "south" },
      { x: table.x, y: table.y + table.height / 2 + 22, dir: "north" },
      { x: table.x - table.width / 2 - 22, y: table.y, dir: "east" },
      { x: table.x + table.width / 2 + 22, y: table.y, dir: "west" },
    ];
    for (const cand of candidates) {
      if (this.isPointWalkable(cand.x, cand.y, pixelChecker)) {
        return { seatX: cand.x, seatY: cand.y, seatDir: cand.dir };
      }
    }
    return {
      seatX: table.x,
      seatY: table.y - table.height / 2 - 22,
      seatDir: "south",
    };
  }

  private computeEntranceAndQueue(
    podium: DinerPointAnchor,
    spawnPoint: { x: number; y: number } | null,
    pixelChecker: PixelCollisionOptions
  ): void {
    // Pick a natural entrance below/right of podium (near main storefront door)
    const entranceCandidates = [
      { x: podium.x + 240, y: Math.min(WORLD_HEIGHT - 80, podium.y + 160) },
      { x: WORLD_WIDTH / 2, y: Math.min(WORLD_HEIGHT - 80, podium.y + 160) },
      { x: podium.x, y: Math.min(WORLD_HEIGHT - 80, podium.y + 180) },
      spawnPoint || { x: podium.x + 120, y: podium.y + 80 },
    ];
    let chosenEntrance = entranceCandidates[0];
    for (const c of entranceCandidates) {
      if (this.isPointWalkable(c.x, c.y, pixelChecker)) {
        chosenEntrance = c;
        break;
      }
    }
    this.entrancePoint = chosenEntrance;

    // Pick queue head right beside/in front of podium
    const headCandidates: Array<{ x: number; y: number; dir: DinerDirection }> = [
      { x: podium.x + podium.width / 2 + 34, y: podium.y, dir: "west" },
      { x: podium.x, y: podium.y + podium.height / 2 + 30, dir: "north" },
      { x: podium.x - podium.width / 2 - 34, y: podium.y, dir: "east" },
      { x: podium.x, y: podium.y - podium.height / 2 - 30, dir: "south" },
    ];
    let head = headCandidates[0];
    for (const hc of headCandidates) {
      if (this.isPointWalkable(hc.x, hc.y, pixelChecker)) {
        head = hc;
        break;
      }
    }

    const slots: Array<{ x: number; y: number; dir: DinerDirection }> = [head];
    let dirX = this.entrancePoint.x - head.x;
    let dirY = this.entrancePoint.y - head.y;
    const len = Math.hypot(dirX, dirY) || 1;
    dirX /= len;
    dirY /= len;

    for (let i = 1; i < DINER_MAX_QUEUE_LENGTH; i++) {
      const idealX = head.x + dirX * (i * 38);
      const idealY = head.y + dirY * (i * 38);
      const pt = this.findNearestWalkablePoint(
        idealX,
        idealY,
        head.x,
        head.y,
        pixelChecker
      );
      slots.push({ x: pt.x, y: pt.y, dir: head.dir });
    }
    this.queueSlots = slots;
  }

  private isPointWalkable(
    x: number,
    y: number,
    pixelChecker: PixelCollisionOptions
  ): boolean {
    if (x < 24 || x > WORLD_WIDTH - 24 || y < 24 || y > WORLD_HEIGHT - 24) {
      return false;
    }
    const r = 10;
    if (pixelChecker.isBoxBlocked) {
      return !pixelChecker.isBoxBlocked(
        Math.round(x - r),
        Math.round(y - r),
        Math.round(x + r),
        Math.round(y + r)
      );
    }
    return !pixelChecker.isPixelSolid(Math.round(x), Math.round(y));
  }

  private findNearestWalkablePoint(
    targetX: number,
    targetY: number,
    fallbackX: number,
    fallbackY: number,
    pixelChecker: PixelCollisionOptions
  ): { x: number; y: number } {
    if (this.isPointWalkable(targetX, targetY, pixelChecker)) {
      return { x: targetX, y: targetY };
    }
    for (let radius = 18; radius <= 120; radius += 18) {
      const angles = 8;
      let best: { x: number; y: number; d: number } | null = null;
      for (let i = 0; i < angles; i++) {
        const a = (i * Math.PI * 2) / angles;
        const cx = targetX + Math.cos(a) * radius;
        const cy = targetY + Math.sin(a) * radius;
        if (this.isPointWalkable(cx, cy, pixelChecker)) {
          const d = Math.hypot(cx - targetX, cy - targetY);
          if (!best || d < best.d) {
            best = { x: cx, y: cy, d };
          }
        }
      }
      if (best) return { x: best.x, y: best.y };
    }
    return { x: fallbackX, y: fallbackY };
  }

  private rebuildWalkGrid(pixelChecker: PixelCollisionOptions): void {
    this.walkGrid.fill(0);
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const cx = c * TILE_SIZE + TILE_SIZE / 2;
        const cy = r * TILE_SIZE + TILE_SIZE / 2;
        const half = 10;
        const blocked = pixelChecker.isBoxBlocked
          ? pixelChecker.isBoxBlocked(cx - half, cy - half, cx + half, cy + half)
          : pixelChecker.isPixelSolid(cx, cy);
        if (!blocked) {
          this.walkGrid[r * GRID_COLS + c] = 1;
        }
      }
    }
  }

  private findNearestWalkableTile(px: number, py: number): { c: number; r: number } {
    const sc = Math.max(0, Math.min(GRID_COLS - 1, Math.floor(px / TILE_SIZE)));
    const sr = Math.max(0, Math.min(GRID_ROWS - 1, Math.floor(py / TILE_SIZE)));
    if (this.walkGrid[sr * GRID_COLS + sc] === 1) return { c: sc, r: sr };

    for (let rad = 1; rad <= 5; rad++) {
      for (let dr = -rad; dr <= rad; dr++) {
        for (let dc = -rad; dc <= rad; dc++) {
          const nc = sc + dc;
          const nr = sr + dr;
          if (nc >= 0 && nc < GRID_COLS && nr >= 0 && nr < GRID_ROWS) {
            if (this.walkGrid[nr * GRID_COLS + nc] === 1) {
              return { c: nc, r: nr };
            }
          }
        }
      }
    }
    return { c: sc, r: sr };
  }

  private findPath(
    startX: number,
    startY: number,
    goalX: number,
    goalY: number
  ): Array<{ x: number; y: number }> {
    const start = this.findNearestWalkableTile(startX, startY);
    const goal = this.findNearestWalkableTile(goalX, goalY);
    const startIdx = start.r * GRID_COLS + start.c;
    const goalIdx = goal.r * GRID_COLS + goal.c;

    if (startIdx === goalIdx) {
      return [{ x: goalX, y: goalY }];
    }

    const total = GRID_COLS * GRID_ROWS;
    const gScore = new Int32Array(total).fill(1e9);
    const fScore = new Int32Array(total).fill(1e9);
    const cameFrom = new Int32Array(total).fill(-1);
    const closed = new Uint8Array(total);
    const open: number[] = [startIdx];

    gScore[startIdx] = 0;
    fScore[startIdx] = Math.abs(goal.c - start.c) + Math.abs(goal.r - start.r);

    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];

    let found = false;
    while (open.length > 0) {
      let bestPos = 0;
      for (let i = 1; i < open.length; i++) {
        if (fScore[open[i]] < fScore[open[bestPos]]) {
          bestPos = i;
        }
      }
      const curr = open[bestPos];
      open.splice(bestPos, 1);
      if (curr === goalIdx) {
        found = true;
        break;
      }
      closed[curr] = 1;

      const cc = curr % GRID_COLS;
      const cr = Math.floor(curr / GRID_COLS);
      for (const [dc, dr] of dirs) {
        const nc = cc + dc;
        const nr = cr + dr;
        if (nc < 0 || nc >= GRID_COLS || nr < 0 || nr >= GRID_ROWS) continue;
        const nIdx = nr * GRID_COLS + nc;
        if (closed[nIdx] || this.walkGrid[nIdx] === 0) continue;

        const tentativeG = gScore[curr] + 1;
        if (tentativeG < gScore[nIdx]) {
          cameFrom[nIdx] = curr;
          gScore[nIdx] = tentativeG;
          fScore[nIdx] = tentativeG + Math.abs(goal.c - nc) + Math.abs(goal.r - nr);
          if (!open.includes(nIdx)) {
            open.push(nIdx);
          }
        }
      }
    }

    if (!found) {
      return [{ x: goalX, y: goalY }];
    }

    const points: Array<{ x: number; y: number }> = [];
    let cur = goalIdx;
    while (cur !== -1 && cur !== startIdx) {
      const c = cur % GRID_COLS;
      const r = Math.floor(cur / GRID_COLS);
      points.push({
        x: c * TILE_SIZE + TILE_SIZE / 2,
        y: r * TILE_SIZE + TILE_SIZE / 2,
      });
      cur = cameFrom[cur];
    }
    points.reverse();
    if (points.length > 0) {
      points[points.length - 1] = { x: goalX, y: goalY };
    } else {
      points.push({ x: goalX, y: goalY });
    }
    return points;
  }

  private sendError(client: Client, payload: DinerActionErrorPayload): void {
    client.send("DINER_ACTION_ERROR", payload);
  }

  private emitEvent(payload: DinerEventPayload): void {
    this.broadcastFn("DINER_EVENT", payload);
  }

  public broadcastStateNow(): void {
    this.lastBroadcastAt = Date.now();
    this.dirty = false;
    this.broadcastFn("DINER_STATE", this.getPublicState());
  }

  public handleJoinShift(
    client: Client,
    player: { x: number; y: number; name: string; color: string; userId: number }
  ): void {
    if (!this.enabled || !this.hostessPodium) {
      this.sendError(client, {
        code: "NOT_ENABLED",
        message: "Restaurant game is not set up in this space.",
      });
      return;
    }

    if (this.employees.has(client.sessionId)) {
      this.sendError(client, {
        code: "ALREADY_EMPLOYEE",
        message: "You are already clocked in!",
      });
      return;
    }

    const dist = distanceToAnchorBox(player.x, player.y, this.hostessPodium);
    if (dist > DINER_HOSTESS_INTERACT_RANGE) {
      this.sendError(client, {
        code: "TOO_FAR",
        message: "Walk closer to the Hostess Podium to clock in.",
      });
      return;
    }

    const now = Date.now();
    const wasEmpty = this.employees.size === 0;
    this.employees.set(client.sessionId, {
      sessionId: client.sessionId,
      userId: player.userId || 0,
      name: player.name || "Server",
      color: player.color || "#3b82f6",
      carriedItems: [],
      earnedFp: 0,
      customersServed: 0,
      lastActiveAt: now,
      lastX: player.x,
      lastY: player.y,
    });

    if (wasEmpty) {
      this.isPlaying = true;
      this.shiftTotalFp = 0;
      this.shiftServedCount = 0;
      this.shiftLostCount = 0;
      this.customers = [];
      this.kitchenOrders = [];
      for (const t of this.tables) t.occupiedByCustomerId = null;
      this.nextSpawnAt = now + 900;
      this.emitEvent({
        kind: "shift_started",
        message: `${player.name} opened the restaurant! Shift started!`,
        x: this.hostessPodium.x,
        y: this.hostessPodium.y,
        actorSessionId: client.sessionId,
      });
    } else {
      this.emitEvent({
        kind: "employee_joined",
        message: `${player.name} joined the restaurant shift!`,
        x: this.hostessPodium.x,
        y: this.hostessPodium.y,
        actorSessionId: client.sessionId,
      });
    }

    this.broadcastStateNow();
  }

  public handleLeaveShift(
    sessionId: string,
    player: { x: number; y: number } | null,
    requireNearPodium: boolean
  ): void {
    const emp = this.employees.get(sessionId);
    if (!emp) {
      if (requireNearPodium) {
        const client = this.getClientFn(sessionId);
        if (client) {
          this.sendError(client, {
            code: "NOT_EMPLOYEE",
            message: "You are not currently clocked in.",
          });
        }
      }
      return;
    }

    if (requireNearPodium && player && this.hostessPodium) {
      const dist = distanceToAnchorBox(player.x, player.y, this.hostessPodium);
      if (dist > DINER_HOSTESS_INTERACT_RANGE) {
        const client = this.getClientFn(sessionId);
        if (client) {
          this.sendError(client, {
            code: "TOO_FAR",
            message: "Go to the Hostess Podium to clock out.",
          });
        }
        return;
      }
    }

    // Return any carried tickets or dishes so remaining teammates don't get softlocked
    for (const item of emp.carriedItems) {
      if (item.kind === "ticket") {
        const cust = this.customers.find((c) => c.id === item.customerId);
        if (cust && cust.status === "waiting_for_food") {
          cust.status = "ready_to_order";
          cust.patiencePhase = "order";
          const profile = DINER_CUSTOMER_PROFILES.find(
            (p) => p.spriteType === cust.spriteType
          );
          cust.patienceMaxMs = profile?.orderPatienceMs ?? 22000;
          cust.patienceRemainingMs = Math.max(12000, cust.patienceMaxMs * 0.65);
          cust.patienceRatio = cust.patienceRemainingMs / cust.patienceMaxMs;
          cust.emotion = "neutral";
        }
      } else if (item.kind === "dish") {
        const cust = this.customers.find((c) => c.id === item.customerId);
        if (cust && cust.status === "waiting_for_food") {
          this.kitchenOrders.push({
            id: `ko_${this.idCounter++}`,
            customerId: item.customerId,
            tableNumber: item.tableNumber,
            dishId: item.dishId,
            dishName: item.dishName,
            status: "ready",
            startedAt: Date.now() - 4000,
            readyAt: Date.now(),
            progress: 1,
            slotIndex: this.findFreeKitchenSlot(),
          });
        }
      }
    }

    const empName = emp.name;
    this.employees.delete(sessionId);

    if (this.employees.size === 0) {
      this.endShift(`${empName} clocked out. Restaurant closed!`);
    } else {
      this.emitEvent({
        kind: "employee_left",
        message: `${empName} left the shift.`,
        x: this.hostessPodium?.x,
        y: this.hostessPodium?.y,
        actorSessionId: sessionId,
      });
      this.broadcastStateNow();
    }
  }

  private endShift(reason: string): void {
    const totalFp = this.shiftTotalFp;
    const totalServed = this.shiftServedCount;
    this.isPlaying = false;
    this.employees.clear();
    this.customers = [];
    this.kitchenOrders = [];
    for (const t of this.tables) t.occupiedByCustomerId = null;

    this.emitEvent({
      kind: "shift_ended",
      message: `${reason} Served ${totalServed} guests (+${totalFp} FP).`,
      fp: totalFp,
    });
    this.broadcastStateNow();
  }

  public handleSeatCustomer(
    client: Client,
    player: { x: number; y: number }
  ): void {
    const emp = this.employees.get(client.sessionId);
    if (!emp || !this.isPlaying || !this.hostessPodium) {
      this.sendError(client, {
        code: "NOT_EMPLOYEE",
        message: "Clock in at the Hostess Podium first!",
      });
      return;
    }
    if (distanceToAnchorBox(player.x, player.y, this.hostessPodium) > DINER_HOSTESS_INTERACT_RANGE) {
      this.sendError(client, {
        code: "TOO_FAR",
        message: "Stand near the Hostess Podium to seat guests.",
      });
      return;
    }

    emp.lastActiveAt = Date.now();

    // Find frontmost queued customer (or closest entering customer if almost there)
    const queued = this.customers
      .filter((c) => c.status === "queued")
      .sort((a, b) => a.queueIndex - b.queueIndex);

    if (queued.length === 0) {
      this.sendError(client, {
        code: "NO_QUEUE",
        message: "No customers waiting in line yet.",
      });
      return;
    }

    const freeTable = this.tables.find((t) => !t.occupiedByCustomerId);
    if (!freeTable) {
      this.sendError(client, {
        code: "NO_EMPTY_TABLE",
        message: "No empty table! Serve seated customers first.",
      });
      return;
    }

    const customer = queued[0];
    freeTable.occupiedByCustomerId = customer.id;
    customer.queueIndex = -1;
    customer.tableId = freeTable.id;
    customer.tableNumber = freeTable.tableNumber;
    customer.status = "walking_to_table";
    customer.patiencePhase = "none";
    customer.patienceRatio = 1;
    customer.emotion = "happy";
    customer.approachX = freeTable.approachX;
    customer.approachY = freeTable.approachY;
    customer.seatX = freeTable.seatX;
    customer.seatY = freeTable.seatY;
    customer.seatDir = freeTable.seatDir;
    customer.path = this.findPath(
      customer.x,
      customer.y,
      freeTable.approachX,
      freeTable.approachY
    );
    if (
      Math.hypot(freeTable.seatX - freeTable.approachX, freeTable.seatY - freeTable.approachY) > 4
    ) {
      customer.path.push({ x: freeTable.seatX, y: freeTable.seatY });
    }

    this.advanceQueueLine();

    this.emitEvent({
      kind: "seated",
      message: `${customer.name} seated at Table #${freeTable.tableNumber}`,
      x: freeTable.x,
      y: freeTable.y,
      tableNumber: freeTable.tableNumber,
      customerId: customer.id,
      actorSessionId: client.sessionId,
    });
    this.broadcastStateNow();
  }

  public handleTakeOrder(
    client: Client,
    player: { x: number; y: number },
    tableId?: string
  ): void {
    const emp = this.employees.get(client.sessionId);
    if (!emp || !this.isPlaying) {
      this.sendError(client, {
        code: "NOT_EMPLOYEE",
        message: "Clock in at the Hostess Podium first!",
      });
      return;
    }

    emp.lastActiveAt = Date.now();

    const targetTable = this.findNearbyTableForStatus(
      player.x,
      player.y,
      "ready_to_order",
      tableId
    );

    if (!targetTable) {
      this.sendError(client, {
        code: "NOTHING_TO_DO",
        message: "No guest ready to order at this table.",
      });
      return;
    }

    if (emp.carriedItems.length >= DINER_MAX_CARRIED_ITEMS) {
      this.sendError(client, {
        code: "HANDS_FULL",
        message: "Hands full (max 2)! Drop off tickets or serve dishes first.",
      });
      return;
    }

    const cust = this.customers.find(
      (c) => c.id === targetTable.occupiedByCustomerId && c.status === "ready_to_order"
    );
    if (!cust) return;

    const profile = DINER_CUSTOMER_PROFILES.find((p) => p.spriteType === cust.spriteType);
    emp.carriedItems.push({
      id: `item_${this.idCounter++}`,
      kind: "ticket",
      customerId: cust.id,
      tableNumber: targetTable.tableNumber,
      dishId: cust.dishId,
      dishName: cust.dishName,
    });

    cust.status = "waiting_for_food";
    cust.patiencePhase = "food";
    cust.patienceMaxMs = profile?.foodPatienceMs ?? 28000;
    cust.patienceRemainingMs = cust.patienceMaxMs;
    cust.patienceRatio = 1;
    cust.expectedFp = cust.maxFp;
    cust.emotion = "happy";

    this.emitEvent({
      kind: "order_taken",
      message: `Took #${targetTable.tableNumber} order (${cust.dishName})`,
      x: targetTable.x,
      y: targetTable.y,
      tableNumber: targetTable.tableNumber,
      customerId: cust.id,
      actorSessionId: client.sessionId,
    });
    this.broadcastStateNow();
  }

  public handleSubmitOrders(
    client: Client,
    player: { x: number; y: number }
  ): void {
    const emp = this.employees.get(client.sessionId);
    if (!emp || !this.isPlaying || !this.kitchenCounter) {
      this.sendError(client, {
        code: "NOT_EMPLOYEE",
        message: "Clock in at the Hostess Podium first!",
      });
      return;
    }
    if (
      distanceToAnchorBox(player.x, player.y, this.kitchenCounter) >
      DINER_KITCHEN_INTERACT_RANGE
    ) {
      this.sendError(client, {
        code: "TOO_FAR",
        message: "Walk to the Kitchen Counter to submit orders.",
      });
      return;
    }

    emp.lastActiveAt = Date.now();
    const tickets = emp.carriedItems.filter((i) => i.kind === "ticket");
    if (tickets.length === 0) {
      this.sendError(client, {
        code: "NOTHING_TO_DO",
        message: "No order tickets to submit!",
      });
      return;
    }

    emp.carriedItems = emp.carriedItems.filter((i) => i.kind !== "ticket");
    const now = Date.now();
    const tableNums: number[] = [];

    for (const t of tickets) {
      const dish = DINER_MENU_DISHES.find((d) => d.id === t.dishId) || DINER_MENU_DISHES[0];
      this.kitchenOrders.push({
        id: `ko_${this.idCounter++}`,
        customerId: t.customerId,
        tableNumber: t.tableNumber,
        dishId: t.dishId,
        dishName: t.dishName,
        status: "cooking",
        startedAt: now,
        readyAt: now + dish.cookTimeMs,
        progress: 0,
        slotIndex: this.findFreeKitchenSlot(),
      });
      tableNums.push(t.tableNumber);
    }

    this.emitEvent({
      kind: "order_submitted",
      message: `Cooking Table ${tableNums.map((n) => `#${n}`).join(", ")}!`,
      x: this.kitchenCounter.x,
      y: this.kitchenCounter.y,
      actorSessionId: client.sessionId,
    });
    this.broadcastStateNow();
  }

  public handlePickupFood(
    client: Client,
    player: { x: number; y: number },
    orderId?: string
  ): void {
    const emp = this.employees.get(client.sessionId);
    if (!emp || !this.isPlaying || !this.kitchenCounter) {
      this.sendError(client, {
        code: "NOT_EMPLOYEE",
        message: "Clock in at the Hostess Podium first!",
      });
      return;
    }
    if (
      distanceToAnchorBox(player.x, player.y, this.kitchenCounter) >
      DINER_KITCHEN_INTERACT_RANGE
    ) {
      this.sendError(client, {
        code: "TOO_FAR",
        message: "Walk to the Kitchen Counter to pick up food.",
      });
      return;
    }

    emp.lastActiveAt = Date.now();

    if (emp.carriedItems.length >= DINER_MAX_CARRIED_ITEMS) {
      this.sendError(client, {
        code: "HANDS_FULL",
        message: "Hands full (max 2)! Serve a dish first.",
      });
      return;
    }

    const readyIdx = orderId
      ? this.kitchenOrders.findIndex((o) => o.id === orderId && o.status === "ready")
      : this.kitchenOrders.findIndex((o) => o.status === "ready");

    if (readyIdx === -1) {
      this.sendError(client, {
        code: "NOTHING_TO_DO",
        message: "No cooked dishes ready for pickup yet.",
      });
      return;
    }

    const [order] = this.kitchenOrders.splice(readyIdx, 1);
    emp.carriedItems.push({
      id: `dish_${this.idCounter++}`,
      kind: "dish",
      customerId: order.customerId,
      tableNumber: order.tableNumber,
      dishId: order.dishId,
      dishName: order.dishName,
    });

    this.emitEvent({
      kind: "food_picked_up",
      message: `Picked up #${order.tableNumber} (${order.dishName})`,
      x: this.kitchenCounter.x,
      y: this.kitchenCounter.y,
      tableNumber: order.tableNumber,
      actorSessionId: client.sessionId,
    });
    this.broadcastStateNow();
  }

  public handleDeliverFood(
    client: Client,
    player: { x: number; y: number },
    tableId?: string
  ): void {
    const emp = this.employees.get(client.sessionId);
    if (!emp || !this.isPlaying) {
      this.sendError(client, {
        code: "NOT_EMPLOYEE",
        message: "Clock in at the Hostess Podium first!",
      });
      return;
    }

    emp.lastActiveAt = Date.now();

    const carriedDishes = emp.carriedItems.filter((i) => i.kind === "dish");
    if (carriedDishes.length === 0) {
      this.sendError(client, {
        code: "NOTHING_TO_DO",
        message: "You aren't carrying any cooked dishes.",
      });
      return;
    }

    const matchingTable = this.tables.find((t) => {
      if (tableId && t.id !== tableId) return false;
      if (distanceToAnchorBox(player.x, player.y, t) > DINER_TABLE_INTERACT_RANGE) {
        return false;
      }
      if (!t.occupiedByCustomerId) return false;
      return carriedDishes.some((d) => d.tableNumber === t.tableNumber);
    });

    if (!matchingTable) {
      this.sendError(client, {
        code: "NOTHING_TO_DO",
        message: "Bring the dish to its matching table number!",
      });
      return;
    }

    const dishIdx = emp.carriedItems.findIndex(
      (i) => i.kind === "dish" && i.tableNumber === matchingTable.tableNumber
    );
    if (dishIdx === -1) return;
    const [servedDish] = emp.carriedItems.splice(dishIdx, 1);

    const cust = this.customers.find((c) => c.id === matchingTable.occupiedByCustomerId);
    if (!cust) return;

    const lockedFp = calculateDinerCustomerFp(cust.maxFp, cust.patienceRatio);
    cust.lockedFp = lockedFp;
    cust.expectedFp = lockedFp;
    cust.status = "eating";
    cust.patiencePhase = "none";
    cust.patienceRatio = 1;
    cust.emotion = "eating";
    cust.eatingRemainingMs = 3800;

    emp.customersServed += 1;

    this.emitEvent({
      kind: "food_delivered",
      message: `Served #${matchingTable.tableNumber} (${servedDish.dishName})`,
      x: matchingTable.x,
      y: matchingTable.y,
      tableNumber: matchingTable.tableNumber,
      customerId: cust.id,
      actorSessionId: client.sessionId,
    });
    this.broadcastStateNow();
  }

  private findNearbyTableForStatus(
    px: number,
    py: number,
    status: DinerCustomerState["status"],
    preferredTableId?: string
  ): InternalTable | null {
    let best: InternalTable | null = null;
    let bestDist = Infinity;

    for (const t of this.tables) {
      if (preferredTableId && t.id !== preferredTableId) continue;
      if (!t.occupiedByCustomerId) continue;
      const cust = this.customers.find((c) => c.id === t.occupiedByCustomerId);
      if (!cust || cust.status !== status) continue;
      const d = distanceToAnchorBox(px, py, t);
      if (d <= DINER_TABLE_INTERACT_RANGE && d < bestDist) {
        best = t;
        bestDist = d;
      }
    }
    return best;
  }

  private findFreeKitchenSlot(): number {
    const used = new Set(this.kitchenOrders.map((o) => o.slotIndex));
    for (let i = 0; i < 12; i++) {
      if (!used.has(i)) return i;
    }
    return this.kitchenOrders.length;
  }

  private advanceQueueLine(): void {
    const queued = this.customers
      .filter((c) => c.status === "queued" || c.status === "entering")
      .sort((a, b) => a.queueIndex - b.queueIndex);

    queued.forEach((c, idx) => {
      c.queueIndex = idx;
      const slot = this.queueSlots[Math.min(idx, this.queueSlots.length - 1)];
      if (slot && Math.hypot(c.x - slot.x, c.y - slot.y) > 6) {
        c.path = [{ x: slot.x, y: slot.y }];
      }
    });
  }

  private spawnCustomer(now: number): void {
    const queuedCount = this.customers.filter(
      (c) => c.status === "queued" || c.status === "entering"
    ).length;
    if (queuedCount >= DINER_MAX_QUEUE_LENGTH) return;

    const totalWeight = DINER_CUSTOMER_PROFILES.reduce((s, p) => s + p.spawnWeight, 0);
    let roll = Math.random() * totalWeight;
    let profile: DinerCustomerProfile = DINER_CUSTOMER_PROFILES[0];
    for (const p of DINER_CUSTOMER_PROFILES) {
      roll -= p.spawnWeight;
      if (roll <= 0) {
        profile = p;
        break;
      }
    }

    const dish = DINER_MENU_DISHES[Math.floor(Math.random() * DINER_MENU_DISHES.length)];
    const name = profile.names[Math.floor(Math.random() * profile.names.length)];
    const queueIndex = queuedCount;
    const slot = this.queueSlots[Math.min(queueIndex, this.queueSlots.length - 1)] || {
      x: this.entrancePoint.x,
      y: this.entrancePoint.y,
      dir: "west" as DinerDirection,
    };

    const customer: InternalCustomer = {
      id: `cust_${this.idCounter++}`,
      name,
      spriteType: profile.spriteType,
      status: "entering",
      x: this.entrancePoint.x,
      y: this.entrancePoint.y,
      direction: "north",
      isMoving: true,
      queueIndex,
      tableId: null,
      tableNumber: null,
      dishId: dish.id,
      dishName: dish.name,
      maxFp: profile.maxFp,
      expectedFp: profile.maxFp,
      patienceRatio: 1,
      patiencePhase: "none",
      emotion: "happy",
      path: this.findPath(this.entrancePoint.x, this.entrancePoint.y, slot.x, slot.y),
      walkSpeed: profile.walkSpeed,
      patienceMaxMs: profile.queuePatienceMs,
      patienceRemainingMs: profile.queuePatienceMs,
      thinkingRemainingMs: 3200,
      eatingRemainingMs: 3800,
      lockedFp: profile.maxFp,
      approachX: slot.x,
      approachY: slot.y,
      seatX: slot.x,
      seatY: slot.y,
      seatDir: slot.dir,
      despawnOnArrive: false,
    };

    this.customers.push(customer);
    this.dirty = true;
  }

  private async awardPaymentToActiveEmployees(
    fpAmount: number,
    table: InternalTable,
    customer: InternalCustomer
  ): Promise<void> {
    const now = Date.now();
    this.shiftTotalFp += fpAmount;
    this.shiftServedCount += 1;

    const eligibleEmployees = Array.from(this.employees.values()).filter(
      (e) => now - e.lastActiveAt <= 120_000
    );
    const recipients =
      eligibleEmployees.length > 0 ? eligibleEmployees : Array.from(this.employees.values());

    for (const emp of recipients) {
      emp.earnedFp += fpAmount;
      if (emp.userId > 0) {
        try {
          const newTotal = await addFocusPoints(emp.userId, fpAmount);
          focusPointsService.updateUserPoints(emp.userId, newTotal, fpAmount);
        } catch (err) {
          console.warn(`[DinerService] Failed awarding ${fpAmount} FP to user ${emp.userId}:`, err);
        }
      }
    }

    this.emitEvent({
      kind: "customer_paid",
      message: `${customer.name} paid +${fpAmount} FP!`,
      fp: fpAmount,
      x: table.x,
      y: table.y,
      tableNumber: table.tableNumber,
      customerId: customer.id,
    });
  }

  public update(
    now: number,
    dtMs: number,
    playersMap: Map<string, { x: number; y: number }>
  ): void {
    if (!this.isPlaying) return;

    // 1. Verify employees are still present in room & track movement activity
    for (const [sid, emp] of Array.from(this.employees.entries())) {
      const p = playersMap.get(sid);
      if (!p) {
        this.handleLeaveShift(sid, null, false);
        continue;
      }
      if (Math.hypot(p.x - emp.lastX, p.y - emp.lastY) > 4) {
        emp.lastX = p.x;
        emp.lastY = p.y;
        emp.lastActiveAt = now;
      }
    }
    if (!this.isPlaying) return;

    // 2. Spawn customers dynamically scaled by employees & table count
    const empCount = Math.max(1, this.employees.size);
    const maxConcurrent = Math.min(this.tables.length + 3, 4 + empCount * 3);
    const activeGuests = this.customers.filter((c) => c.status !== "leaving").length;
    if (now >= this.nextSpawnAt && activeGuests < maxConcurrent) {
      this.spawnCustomer(now);
      const intervalMs = Math.max(4500, 10500 - (empCount - 1) * 2000);
      this.nextSpawnAt = now + intervalMs;
    }

    // 3. Kitchen cooking progress
    for (const order of this.kitchenOrders) {
      if (order.status === "cooking") {
        const duration = Math.max(1, order.readyAt - order.startedAt);
        order.progress = Math.max(0, Math.min(1, (now - order.startedAt) / duration));
        if (now >= order.readyAt) {
          order.status = "ready";
          order.progress = 1;
          this.dirty = true;
          this.emitEvent({
            kind: "food_ready",
            message: `Table #${order.tableNumber} dish ready at kitchen!`,
            x: this.kitchenCounter?.x,
            y: this.kitchenCounter?.y,
            tableNumber: order.tableNumber,
          });
        }
      }
    }

    // 4. Advance customers
    const dtSec = Math.min(dtMs / 1000, 0.15);
    const toRemove = new Set<string>();

    for (const cust of this.customers) {
      // Path movement
      if (cust.path.length > 0) {
        cust.isMoving = true;
        const target = cust.path[0];
        const dx = target.x - cust.x;
        const dy = target.y - cust.y;
        const dist = Math.hypot(dx, dy);
        const step = cust.walkSpeed * dtSec;

        if (dist <= step || dist < 2) {
          cust.x = target.x;
          cust.y = target.y;
          cust.path.shift();
        } else {
          cust.x += (dx / dist) * step;
          cust.y += (dy / dist) * step;
          if (Math.abs(dx) >= Math.abs(dy)) {
            cust.direction = dx < 0 ? "west" : "east";
          } else {
            cust.direction = dy < 0 ? "north" : "south";
          }
        }

        if (cust.path.length === 0) {
          cust.isMoving = false;
          if (cust.status === "entering") {
            const slot =
              this.queueSlots[Math.min(cust.queueIndex, this.queueSlots.length - 1)];
            cust.direction = slot?.dir || "west";
            cust.status = "queued";
            cust.patiencePhase = "queue";
            const profile = DINER_CUSTOMER_PROFILES.find(
              (p) => p.spriteType === cust.spriteType
            );
            cust.patienceMaxMs = profile?.queuePatienceMs ?? 25000;
            cust.patienceRemainingMs = cust.patienceMaxMs;
            cust.patienceRatio = 1;
            this.dirty = true;
          } else if (cust.status === "queued") {
            const slot =
              this.queueSlots[Math.min(cust.queueIndex, this.queueSlots.length - 1)];
            cust.direction = slot?.dir || "west";
          } else if (cust.status === "walking_to_table") {
            cust.direction = cust.seatDir;
            cust.status = "thinking";
            cust.thinkingRemainingMs = 3000;
            cust.patiencePhase = "none";
            cust.patienceRatio = 1;
            this.dirty = true;
          } else if (cust.status === "leaving" && cust.despawnOnArrive) {
            toRemove.add(cust.id);
            this.dirty = true;
          }
        }
        continue;
      }

      cust.isMoving = false;

      if (cust.status === "queued") {
        cust.patienceRemainingMs = Math.max(0, cust.patienceRemainingMs - dtMs);
        cust.patienceRatio = cust.patienceRemainingMs / Math.max(1, cust.patienceMaxMs);
        cust.emotion =
          cust.patienceRatio > 0.55
            ? "happy"
            : cust.patienceRatio > 0.25
            ? "neutral"
            : "impatient";

        if (cust.patienceRemainingMs <= 0) {
          this.sendCustomerLeavingAngry(cust, "Customer left the queue (waited too long)!");
          this.advanceQueueLine();
        }
      } else if (cust.status === "thinking") {
        cust.thinkingRemainingMs -= dtMs;
        if (cust.thinkingRemainingMs <= 0) {
          const profile = DINER_CUSTOMER_PROFILES.find(
            (p) => p.spriteType === cust.spriteType
          );
          cust.status = "ready_to_order";
          cust.patiencePhase = "order";
          cust.patienceMaxMs = profile?.orderPatienceMs ?? 22000;
          cust.patienceRemainingMs = cust.patienceMaxMs;
          cust.patienceRatio = 1;
          cust.emotion = "neutral";
          this.dirty = true;
        }
      } else if (cust.status === "ready_to_order") {
        cust.patienceRemainingMs = Math.max(0, cust.patienceRemainingMs - dtMs);
        cust.patienceRatio = cust.patienceRemainingMs / Math.max(1, cust.patienceMaxMs);
        cust.emotion =
          cust.patienceRatio > 0.5
            ? "neutral"
            : cust.patienceRatio > 0.22
            ? "impatient"
            : "angry";

        if (cust.patienceRemainingMs <= 0) {
          const t = this.tables.find((tb) => tb.id === cust.tableId);
          if (t) t.occupiedByCustomerId = null;
          this.sendCustomerLeavingAngry(
            cust,
            `Table #${cust.tableNumber} left (waited too long to order)!`
          );
        }
      } else if (cust.status === "waiting_for_food") {
        // Customers waiting for food NEVER leave; instead they pay less the longer they wait
        cust.patienceRemainingMs = Math.max(0, cust.patienceRemainingMs - dtMs);
        cust.patienceRatio = cust.patienceRemainingMs / Math.max(1, cust.patienceMaxMs);
        cust.expectedFp = calculateDinerCustomerFp(cust.maxFp, cust.patienceRatio);
        cust.emotion =
          cust.patienceRatio >= 0.65
            ? "happy"
            : cust.patienceRatio >= 0.35
            ? "neutral"
            : "impatient";
      } else if (cust.status === "eating") {
        cust.eatingRemainingMs -= dtMs;
        if (cust.eatingRemainingMs <= 0) {
          const table = this.tables.find((tb) => tb.id === cust.tableId);
          if (table) {
            table.occupiedByCustomerId = null;
            void this.awardPaymentToActiveEmployees(cust.lockedFp, table, cust);
          }
          cust.status = "leaving";
          cust.patiencePhase = "none";
          cust.emotion = "happy";
          cust.despawnOnArrive = true;
          cust.path = this.buildExitPath(cust);
          this.dirty = true;
        }
      }
    }

    if (toRemove.size > 0) {
      this.customers = this.customers.filter((c) => !toRemove.has(c.id));
    }

    // 5. Broadcast snapshot at ~10 Hz (100ms) while active or immediately when dirty
    if (this.dirty || now - this.lastBroadcastAt >= 100) {
      this.broadcastStateNow();
    }
  }

  private buildExitPath(cust: InternalCustomer): Array<{ x: number; y: number }> {
    const startPt =
      cust.tableId !== null
        ? { x: cust.approachX, y: cust.approachY }
        : { x: cust.x, y: cust.y };
    const path = this.findPath(
      startPt.x,
      startPt.y,
      this.entrancePoint.x,
      this.entrancePoint.y
    );
    if (cust.tableId !== null && Math.hypot(startPt.x - cust.x, startPt.y - cust.y) > 4) {
      return [startPt, ...path];
    }
    return path;
  }

  private sendCustomerLeavingAngry(cust: InternalCustomer, reason: string): void {
    this.shiftLostCount += 1;
    const prevX = cust.x;
    const prevY = cust.y;
    const tblNum = cust.tableNumber;
    const wasTable = cust.tableId !== null;
    cust.path = this.buildExitPath(cust);
    cust.queueIndex = -1;
    cust.tableId = null;
    cust.tableNumber = null;
    cust.status = "leaving";
    cust.patiencePhase = "none";
    cust.emotion = "angry";
    cust.despawnOnArrive = true;
    this.dirty = true;

    this.emitEvent({
      kind: "customer_left_angry",
      message: reason,
      x: prevX,
      y: prevY,
      tableNumber: tblNum ?? undefined,
      customerId: cust.id,
    });
    if (wasTable) {
      // Clear any kitchen orders or carried items belonging to this angry customer
      this.kitchenOrders = this.kitchenOrders.filter((o) => o.customerId !== cust.id);
      for (const emp of this.employees.values()) {
        emp.carriedItems = emp.carriedItems.filter((i) => i.customerId !== cust.id);
      }
    }
  }
}
