import Phaser from "phaser";
import {
  DINER_HOSTESS_INTERACT_RANGE,
  DINER_KITCHEN_INTERACT_RANGE,
  DINER_MAX_CARRIED_ITEMS,
  DINER_MENU_DISHES,
  DINER_TABLE_INTERACT_RANGE,
  DinerCustomerSpriteType,
  DinerCustomerState,
  DinerEventPayload,
  DinerGameState,
  distanceToAnchorBox,
} from "shared";

export interface DinerNearbyAction {
  id: string;
  kind:
    | "join_shift"
    | "seat_customer"
    | "seat_customer_empty"
    | "take_order"
    | "submit_orders"
    | "pickup_food"
    | "deliver_food"
    | "kitchen_cooking";
  label: string;
  tableId?: string;
  tableNumber?: number;
  orderId?: string;
  promptX: number;
  promptY: number;
  nearHostessPodium?: boolean;
  canLeaveShift?: boolean;
}

interface CustomerVisual {
  id: string;
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Sprite;
  uiContainer: Phaser.GameObjects.Container;
  badgeBg: Phaser.GameObjects.Graphics;
  badgeText: Phaser.GameObjects.Text;
  patienceBg: Phaser.GameObjects.Graphics;
  patienceFill: Phaser.GameObjects.Graphics;
  handGraphic: Phaser.GameObjects.Graphics;
  plateContainer: Phaser.GameObjects.Container;
  lastAnimKey: string;
  targetX: number;
  targetY: number;
  state: DinerCustomerState;
}

const CUSTOMER_SPRITE_TYPES: readonly DinerCustomerSpriteType[] = [
  "office_man",
  "office_lady",
  "student",
  "hipster_barista",
  "senior_gentleman",
  "gourmet_vip",
];

export class DinerSceneLayer {
  private state: DinerGameState | null = null;
  private customerVisuals = new Map<string, CustomerVisual>();
  private tableBadges = new Map<string, Phaser.GameObjects.Container>();
  private kitchenOrderVisuals: Phaser.GameObjects.Container[] = [];
  private employeeTrayVisuals = new Map<string, Phaser.GameObjects.Container>();
  private podiumMarker: Phaser.GameObjects.Container | null = null;
  private kitchenMarker: Phaser.GameObjects.Container | null = null;
  private audioCtx: AudioContext | null = null;

  constructor(private readonly scene: Phaser.Scene) {}

  public static preload(scene: Phaser.Scene): void {
    for (const type of CUSTOMER_SPRITE_TYPES) {
      scene.load.spritesheet(
        `customer_${type}`,
        `/assets/sprites/customers/${type}.png`,
        { frameWidth: 32, frameHeight: 32 }
      );
    }
  }

  public createAnimations(): void {
    const dirs = ["south", "west", "east", "north"] as const;
    for (const type of CUSTOMER_SPRITE_TYPES) {
      const texKey = `customer_${type}`;
      if (!this.scene.textures.exists(texKey)) continue;
      this.scene.textures.get(texKey).setFilter(Phaser.Textures.FilterMode.NEAREST);

      dirs.forEach((dir, idx) => {
        const idleKey = `${texKey}_idle_${dir}`;
        if (!this.scene.anims.exists(idleKey)) {
          this.scene.anims.create({
            key: idleKey,
            frames: this.scene.anims.generateFrameNumbers(texKey, {
              start: idx * 4,
              end: idx * 4 + 3,
            }),
            frameRate: 4,
            repeat: -1,
          });
        }
        const walkKey = `${texKey}_walk_${dir}`;
        if (!this.scene.anims.exists(walkKey)) {
          this.scene.anims.create({
            key: walkKey,
            frames: this.scene.anims.generateFrameNumbers(texKey, {
              start: (idx + 4) * 4,
              end: (idx + 4) * 4 + 3,
            }),
            frameRate: 7,
            repeat: -1,
          });
        }
      });
    }
  }

  public setState(nextState: DinerGameState | null): void {
    this.state = nextState;
    if (!nextState || !nextState.enabled) {
      this.clearAll();
      return;
    }

    this.syncMarkers(nextState);
    this.syncTableBadges(nextState);
    this.syncCustomers(nextState);
    this.syncKitchenOrders(nextState);
  }

  public getState(): DinerGameState | null {
    return this.state;
  }

  public clearAll(): void {
    for (const vis of this.customerVisuals.values()) {
      vis.container.destroy();
      vis.uiContainer.destroy();
      vis.plateContainer.destroy();
    }
    this.customerVisuals.clear();

    for (const badge of this.tableBadges.values()) {
      badge.destroy();
    }
    this.tableBadges.clear();

    for (const ko of this.kitchenOrderVisuals) {
      ko.destroy();
    }
    this.kitchenOrderVisuals = [];

    for (const tray of this.employeeTrayVisuals.values()) {
      tray.destroy();
    }
    this.employeeTrayVisuals.clear();

    if (this.podiumMarker) {
      this.podiumMarker.destroy();
      this.podiumMarker = null;
    }
    if (this.kitchenMarker) {
      this.kitchenMarker.destroy();
      this.kitchenMarker = null;
    }
  }

  private syncMarkers(state: DinerGameState): void {
    if (state.hostessPodium) {
      if (!this.podiumMarker) {
        const bg = this.scene.add.graphics();
        bg.fillStyle(0x0f172a, 0.88);
        bg.lineStyle(1.5, 0x5eead4, 0.85);
        bg.fillRoundedRect(-44, -12, 88, 22, 8);
        bg.strokeRoundedRect(-44, -12, 88, 22, 8);
        const label = this.scene.add
          .text(0, -1, "HOST DESK", {
            fontFamily: "Outfit, sans-serif",
            fontSize: "10px",
            fontStyle: "bold",
            color: "#5eead4",
          })
          .setOrigin(0.5);
        this.podiumMarker = this.scene.add.container(
          state.hostessPodium.x,
          state.hostessPodium.y - state.hostessPodium.height / 2 - 14,
          [bg, label]
        );
        this.podiumMarker.setDepth(145);
      } else {
        this.podiumMarker.setPosition(
          state.hostessPodium.x,
          state.hostessPodium.y - state.hostessPodium.height / 2 - 14
        );
      }
      const txt = this.podiumMarker.list[1] as Phaser.GameObjects.Text;
      const queuedCount = state.customers.filter((c) => c.status === "queued").length;
      if (!state.isPlaying) {
        txt.setText("START SHIFT");
        txt.setColor("#5eead4");
      } else if (queuedCount > 0) {
        txt.setText(`QUEUE: ${queuedCount}`);
        txt.setColor("#fbbf24");
      } else {
        txt.setText("HOST DESK");
        txt.setColor("#94a3b8");
      }
    }

    if (state.kitchenCounter) {
      if (!this.kitchenMarker) {
        const bg = this.scene.add.graphics();
        bg.fillStyle(0x0f172a, 0.88);
        bg.lineStyle(1.5, 0xf59e0b, 0.85);
        bg.fillRoundedRect(-48, -12, 96, 22, 8);
        bg.strokeRoundedRect(-48, -12, 96, 22, 8);
        const label = this.scene.add
          .text(0, -1, "KITCHEN PASS", {
            fontFamily: "Outfit, sans-serif",
            fontSize: "10px",
            fontStyle: "bold",
            color: "#fbbf24",
          })
          .setOrigin(0.5);
        this.kitchenMarker = this.scene.add.container(
          state.kitchenCounter.x,
          state.kitchenCounter.y - state.kitchenCounter.height / 2 - 16,
          [bg, label]
        );
        this.kitchenMarker.setDepth(145);
      } else {
        this.kitchenMarker.setPosition(
          state.kitchenCounter.x,
          state.kitchenCounter.y - state.kitchenCounter.height / 2 - 16
        );
      }
      this.kitchenMarker.setVisible(state.isPlaying);
    }
  }

  private syncTableBadges(state: DinerGameState): void {
    const activeIds = new Set(state.tables.map((t) => t.id));
    for (const [id, c] of Array.from(this.tableBadges.entries())) {
      if (!activeIds.has(id)) {
        c.destroy();
        this.tableBadges.delete(id);
      }
    }

    const custMap = new Map(state.customers.map((c) => [c.id, c]));

    for (const table of state.tables) {
      let badge = this.tableBadges.get(table.id);
      if (!badge) {
        const bg = this.scene.add.graphics();
        const txt = this.scene.add
          .text(0, 0, `#${table.tableNumber}`, {
            fontFamily: "Outfit, sans-serif",
            fontSize: "11px",
            fontStyle: "bold",
            color: "#f8fafc",
          })
          .setOrigin(0.5);
        badge = this.scene.add.container(table.x, table.y - 4, [bg, txt]);
        badge.setDepth(142);
        this.tableBadges.set(table.id, badge);
      } else {
        badge.setPosition(table.x, table.y - 4);
      }

      const bg = badge.list[0] as Phaser.GameObjects.Graphics;
      const txt = badge.list[1] as Phaser.GameObjects.Text;
      const occ = table.occupiedByCustomerId
        ? custMap.get(table.occupiedByCustomerId)
        : undefined;

      let borderColor = 0x475569;
      let fillColor = 0x0f172a;
      let textColor = "#cbd5e1";

      if (occ?.status === "ready_to_order") {
        borderColor = 0x2dd4bf;
        fillColor = 0x134e4a;
        textColor = "#5eead4";
      } else if (occ?.status === "waiting_for_food") {
        borderColor = 0xf59e0b;
        fillColor = 0x451a03;
        textColor = "#fde68a";
      } else if (occ?.status === "eating") {
        borderColor = 0x4ade80;
        fillColor = 0x14532d;
        textColor = "#bbf7d0";
      }

      bg.clear();
      bg.fillStyle(fillColor, 0.88);
      bg.lineStyle(1.5, borderColor, 0.95);
      bg.fillRoundedRect(-15, -10, 30, 20, 6);
      bg.strokeRoundedRect(-15, -10, 30, 20, 6);
      txt.setText(`#${table.tableNumber}`);
      txt.setColor(textColor);
    }
  }

  private syncCustomers(state: DinerGameState): void {
    const activeIds = new Set(state.customers.map((c) => c.id));
    for (const [id, vis] of Array.from(this.customerVisuals.entries())) {
      if (!activeIds.has(id)) {
        vis.container.destroy();
        vis.uiContainer.destroy();
        vis.plateContainer.destroy();
        this.customerVisuals.delete(id);
      }
    }

    const tableMap = new Map(state.tables.map((t) => [t.id, t]));

    for (const c of state.customers) {
      let vis = this.customerVisuals.get(c.id);
      const texKey = `customer_${c.spriteType}`;
      if (!vis) {
        const sprite = this.scene.add.sprite(0, 22, texKey, 0);
        sprite.setOrigin(0.5, 1.0);
        sprite.setDisplaySize(48, 48);
        const container = this.scene.add.container(c.x, c.y, [sprite]);
        container.setDepth(98);

        const badgeBg = this.scene.add.graphics();
        const badgeText = this.scene.add
          .text(0, -14, "", {
            fontFamily: "Outfit, sans-serif",
            fontSize: "10px",
            fontStyle: "bold",
            color: "#ffffff",
          })
          .setOrigin(0.5);

        const patienceBg = this.scene.add.graphics();
        const patienceFill = this.scene.add.graphics();
        const handGraphic = this.scene.add.graphics();

        const uiContainer = this.scene.add.container(c.x, c.y - 34, [
          badgeBg,
          badgeText,
          patienceBg,
          patienceFill,
          handGraphic,
        ]);
        uiContainer.setDepth(152);

        // Plate on table shown when eating
        const plateBg = this.scene.add.graphics();
        plateBg.fillStyle(0xf8fafc, 1);
        plateBg.lineStyle(1.5, 0x94a3b8, 1);
        plateBg.fillCircle(0, 0, 9);
        plateBg.strokeCircle(0, 0, 9);
        const dishInfo = DINER_MENU_DISHES.find((d) => d.id === c.dishId);
        plateBg.fillStyle(
          Phaser.Display.Color.HexStringToColor(dishInfo?.color || "#fbbf24").color,
          1
        );
        plateBg.fillCircle(0, 0, 5.5);
        const plateContainer = this.scene.add.container(c.x, c.y, [plateBg]);
        plateContainer.setDepth(140);
        plateContainer.setVisible(false);

        vis = {
          id: c.id,
          container,
          sprite,
          uiContainer,
          badgeBg,
          badgeText,
          patienceBg,
          patienceFill,
          handGraphic,
          plateContainer,
          lastAnimKey: "",
          targetX: c.x,
          targetY: c.y,
          state: c,
        };
        this.customerVisuals.set(c.id, vis);
      }

      vis.targetX = c.x;
      vis.targetY = c.y;
      vis.state = c;

      // Sprite animation
      const mode = c.isMoving ? "walk" : "idle";
      const animKey = `${texKey}_${mode}_${c.direction}`;
      if (vis.lastAnimKey !== animKey && this.scene.anims.exists(animKey)) {
        vis.sprite.play(animKey, true);
        vis.lastAnimKey = animKey;
      }

      // Plate visibility while eating
      const tbl = c.tableId ? tableMap.get(c.tableId) : undefined;
      if (c.status === "eating" && tbl) {
        vis.plateContainer.setPosition(tbl.x, tbl.y - 16);
        vis.plateContainer.setVisible(true);
      } else {
        vis.plateContainer.setVisible(false);
      }

      this.renderCustomerOverlay(vis, c);
    }
  }

  private renderCustomerOverlay(vis: CustomerVisual, c: DinerCustomerState): void {
    vis.badgeBg.clear();
    vis.patienceBg.clear();
    vis.patienceFill.clear();
    vis.handGraphic.clear();

    let pillText = "";
    let pillBorder = 0x64748b;
    let pillFill = 0x0f172a;
    let pillColor = "#f8fafc";

    if (c.status === "queued") {
      pillText = "WAIT";
      pillBorder = 0x38bdf8;
      pillColor = "#bae6fd";
    } else if (c.status === "thinking") {
      pillText = "...";
      pillBorder = 0x94a3b8;
      pillColor = "#e2e8f0";
    } else if (c.status === "ready_to_order") {
      pillText = `ORDER #${c.tableNumber ?? "?"}`;
      pillBorder = 0x2dd4bf;
      pillFill = 0x134e4a;
      pillColor = "#5eead4";

      // Draw pixel-style raised hand icon next to customer
      vis.handGraphic.fillStyle(0xfef08a, 1);
      vis.handGraphic.lineStyle(1.5, 0x0f172a, 1);
      vis.handGraphic.fillRoundedRect(14, 14, 7, 11, 3);
      vis.handGraphic.strokeRoundedRect(14, 14, 7, 11, 3);
      vis.handGraphic.fillCircle(17.5, 13, 3.5);
    } else if (c.status === "waiting_for_food") {
      pillText = `#${c.tableNumber ?? "?"} • ${c.expectedFp} FP`;
      pillBorder = c.expectedFp >= c.maxFp ? 0xfbbf24 : c.expectedFp > 1 ? 0xf97316 : 0xef4444;
      pillFill = 0x1e293b;
      pillColor = c.expectedFp >= c.maxFp ? "#fde68a" : "#fca5a5";
    } else if (c.status === "eating") {
      pillText = `+${c.expectedFp} FP`;
      pillBorder = 0x4ade80;
      pillFill = 0x14532d;
      pillColor = "#bbf7d0";
    } else if (c.status === "leaving" && c.emotion === "angry") {
      pillText = "LEFT!";
      pillBorder = 0xef4444;
      pillFill = 0x7f1d1d;
      pillColor = "#fecaca";
    }

    if (pillText) {
      vis.badgeText.setText(pillText);
      vis.badgeText.setColor(pillColor);
      vis.badgeText.setVisible(true);
      const pw = Math.max(36, vis.badgeText.width + 12);
      vis.badgeBg.fillStyle(pillFill, 0.92);
      vis.badgeBg.lineStyle(1.5, pillBorder, 0.95);
      vis.badgeBg.fillRoundedRect(-pw / 2, -23, pw, 18, 6);
      vis.badgeBg.strokeRoundedRect(-pw / 2, -23, pw, 18, 6);
    } else {
      vis.badgeText.setVisible(false);
    }

    // Patience bar
    if (c.patiencePhase !== "none") {
      const barW = 36;
      const barH = 5;
      const bx = -barW / 2;
      const by = -2;
      vis.patienceBg.fillStyle(0x090d16, 0.9);
      vis.patienceBg.fillRoundedRect(bx - 1, by - 1, barW + 2, barH + 2, 2);

      const ratio = Math.max(0, Math.min(1, c.patienceRatio));
      const fillColor =
        ratio > 0.55 ? 0x22c55e : ratio > 0.25 ? 0xf59e0b : 0xef4444;
      if (ratio > 0) {
        vis.patienceFill.fillStyle(fillColor, 1);
        vis.patienceFill.fillRoundedRect(bx, by, Math.max(2, barW * ratio), barH, 2);
      }
    }
  }

  private syncKitchenOrders(state: DinerGameState): void {
    for (const ko of this.kitchenOrderVisuals) {
      ko.destroy();
    }
    this.kitchenOrderVisuals = [];

    if (!state.kitchenCounter || !state.isPlaying) return;

    const kc = state.kitchenCounter;
    const count = state.kitchenOrders.length;
    if (count === 0) return;

    const spacing = 48;
    const startX = kc.x - ((Math.min(count, 8) - 1) * spacing) / 2;

    state.kitchenOrders.slice(0, 8).forEach((order, idx) => {
      const ox = startX + idx * spacing;
      const oy = kc.y - 6;

      const g = this.scene.add.graphics();
      if (order.status === "ready") {
        g.fillStyle(0x064e3b, 0.95);
        g.lineStyle(2, 0x34d399, 1);
        g.fillRoundedRect(-21, -15, 42, 28, 7);
        g.strokeRoundedRect(-21, -15, 42, 28, 7);
        // Mini plate
        g.fillStyle(0xf8fafc, 1);
        g.fillCircle(0, -6, 6);
        const dishInfo = DINER_MENU_DISHES.find((d) => d.id === order.dishId);
        g.fillStyle(
          Phaser.Display.Color.HexStringToColor(dishInfo?.color || "#fbbf24").color,
          1
        );
        g.fillCircle(0, -6, 3.5);
      } else {
        g.fillStyle(0x451a03, 0.92);
        g.lineStyle(1.5, 0xf59e0b, 0.95);
        g.fillRoundedRect(-21, -15, 42, 28, 7);
        g.strokeRoundedRect(-21, -15, 42, 28, 7);
        // Progress bar
        g.fillStyle(0x1e293b, 1);
        g.fillRect(-15, 5, 30, 4);
        g.fillStyle(0xfbbf24, 1);
        g.fillRect(-15, 5, Math.max(2, 30 * order.progress), 4);
      }

      const txt = this.scene.add
        .text(0, order.status === "ready" ? 5 : -5, `#${order.tableNumber}`, {
          fontFamily: "Outfit, sans-serif",
          fontSize: "10px",
          fontStyle: "bold",
          color: order.status === "ready" ? "#6ee7b7" : "#fde68a",
        })
        .setOrigin(0.5);

      const container = this.scene.add.container(ox, oy, [g, txt]);
      container.setDepth(148);
      this.kitchenOrderVisuals.push(container);
    });
  }

  public updateFrame(
    time: number,
    delta: number,
    getPlayerCoords: (sessionId: string) => { x: number; y: number } | null
  ): void {
    const lerpAlpha = Math.min(1, delta / 110);

    for (const vis of this.customerVisuals.values()) {
      const nx = Phaser.Math.Linear(vis.container.x, vis.targetX, lerpAlpha);
      const ny = Phaser.Math.Linear(vis.container.y, vis.targetY, lerpAlpha);
      vis.container.setPosition(nx, ny);

      let bob = 0;
      if (vis.state.status === "ready_to_order") {
        bob = Math.sin(time * 0.008) * 2.5;
      }
      vis.uiContainer.setPosition(nx, ny - 34 + bob);
    }

    // Employee carried tray overhead badges
    const activeEmployees = this.state?.isPlaying
      ? Object.values(this.state.employees)
      : [];
    const activeEmpIds = new Set(activeEmployees.map((e) => e.sessionId));

    for (const [sid, tray] of Array.from(this.employeeTrayVisuals.entries())) {
      if (!activeEmpIds.has(sid)) {
        tray.destroy();
        this.employeeTrayVisuals.delete(sid);
      }
    }

    for (const emp of activeEmployees) {
      const coords = getPlayerCoords(emp.sessionId);
      if (!coords || emp.carriedItems.length === 0) {
        const existing = this.employeeTrayVisuals.get(emp.sessionId);
        if (existing) existing.setVisible(false);
        continue;
      }

      let tray = this.employeeTrayVisuals.get(emp.sessionId);
      if (!tray) {
        const bg = this.scene.add.graphics();
        const txt = this.scene.add
          .text(0, 0, "", {
            fontFamily: "Outfit, sans-serif",
            fontSize: "10px",
            fontStyle: "bold",
            color: "#ffffff",
          })
          .setOrigin(0.5);
        tray = this.scene.add.container(coords.x, coords.y - 54, [bg, txt]);
        tray.setDepth(160);
        this.employeeTrayVisuals.set(emp.sessionId, tray);
      }

      tray.setVisible(true);
      tray.setPosition(coords.x, coords.y - 54);
      const label = emp.carriedItems
        .map((i) => `${i.kind === "dish" ? "🍽️" : "📋"}#${i.tableNumber}`)
        .join(" ");
      const txt = tray.list[1] as Phaser.GameObjects.Text;
      const bg = tray.list[0] as Phaser.GameObjects.Graphics;
      txt.setText(label);
      const pw = Math.max(40, txt.width + 12);
      bg.clear();
      bg.fillStyle(0x0f172a, 0.92);
      bg.lineStyle(1.5, 0x5eead4, 0.9);
      bg.fillRoundedRect(-pw / 2, -10, pw, 20, 7);
      bg.strokeRoundedRect(-pw / 2, -10, pw, 20, 7);
    }
  }

  public getNearbyAction(
    px: number,
    py: number,
    mySessionId: string
  ): DinerNearbyAction | null {
    const state = this.state;
    if (!state || !state.enabled) return null;

    const emp = state.employees[mySessionId] || null;
    const isEmployee = Boolean(emp);

    // 1. Hostess Podium check
    if (
      state.hostessPodium &&
      distanceToAnchorBox(px, py, state.hostessPodium) <= DINER_HOSTESS_INTERACT_RANGE
    ) {
      const hp = state.hostessPodium;
      if (!isEmployee) {
        return {
          id: hp.id,
          kind: "join_shift",
          label: "Start Shift",
          promptX: hp.x,
          promptY: hp.y - hp.height / 2 - 28,
          nearHostessPodium: true,
          canLeaveShift: false,
        };
      }
      const queuedCount = state.customers.filter((c) => c.status === "queued").length;
      return {
        id: hp.id,
        kind: queuedCount > 0 ? "seat_customer" : "seat_customer_empty",
        label: queuedCount > 0 ? `Seat Guest (${queuedCount})` : "Seat Guest",
        promptX: hp.x,
        promptY: hp.y - hp.height / 2 - 28,
        nearHostessPodium: true,
        canLeaveShift: true,
      };
    }

    if (!isEmployee || !state.isPlaying) return null;

    // 2. Kitchen Counter check
    if (
      state.kitchenCounter &&
      distanceToAnchorBox(px, py, state.kitchenCounter) <= DINER_KITCHEN_INTERACT_RANGE
    ) {
      const kc = state.kitchenCounter;
      const tickets = emp.carriedItems.filter((i) => i.kind === "ticket");
      if (tickets.length > 0) {
        const nums = tickets.map((t) => `#${t.tableNumber}`).join(",");
        return {
          id: kc.id,
          kind: "submit_orders",
          label: `Send Order ${nums}`,
          promptX: kc.x,
          promptY: kc.y - kc.height / 2 - 30,
        };
      }
      const readyOrder = state.kitchenOrders.find((o) => o.status === "ready");
      if (readyOrder && emp.carriedItems.length < DINER_MAX_CARRIED_ITEMS) {
        return {
          id: kc.id,
          kind: "pickup_food",
          label: `Pick Up #${readyOrder.tableNumber}`,
          orderId: readyOrder.id,
          tableNumber: readyOrder.tableNumber,
          promptX: kc.x,
          promptY: kc.y - kc.height / 2 - 30,
        };
      }
      const cookingOrder = state.kitchenOrders.find((o) => o.status === "cooking");
      if (cookingOrder) {
        return {
          id: kc.id,
          kind: "kitchen_cooking",
          label: `Cooking #${cookingOrder.tableNumber}...`,
          promptX: kc.x,
          promptY: kc.y - kc.height / 2 - 30,
        };
      }
    }

    // 3. Dining Table checks (Priority 1: Deliver matching dish, Priority 2: Take order)
    const custMap = new Map(state.customers.map((c) => [c.id, c]));
    const carriedDishes = emp.carriedItems.filter((i) => i.kind === "dish");

    let bestDeliver: { tableId: string; tableNumber: number; x: number; y: number; h: number; d: number } | null = null;
    let bestOrder: { tableId: string; tableNumber: number; x: number; y: number; h: number; d: number } | null = null;

    for (const t of state.tables) {
      const d = distanceToAnchorBox(px, py, t);
      if (d > DINER_TABLE_INTERACT_RANGE) continue;
      if (!t.occupiedByCustomerId) continue;
      const cust = custMap.get(t.occupiedByCustomerId);
      if (!cust) continue;

      if (
        cust.status === "waiting_for_food" &&
        carriedDishes.some((dish) => dish.tableNumber === t.tableNumber)
      ) {
        if (!bestDeliver || d < bestDeliver.d) {
          bestDeliver = { tableId: t.id, tableNumber: t.tableNumber, x: t.x, y: t.y, h: t.height, d };
        }
      } else if (cust.status === "ready_to_order") {
        if (!bestOrder || d < bestOrder.d) {
          bestOrder = { tableId: t.id, tableNumber: t.tableNumber, x: t.x, y: t.y, h: t.height, d };
        }
      }
    }

    if (bestDeliver) {
      return {
        id: bestDeliver.tableId,
        kind: "deliver_food",
        label: `Serve #${bestDeliver.tableNumber}`,
        tableId: bestDeliver.tableId,
        tableNumber: bestDeliver.tableNumber,
        promptX: bestDeliver.x,
        promptY: bestDeliver.y - bestDeliver.h / 2 - 22,
      };
    }

    if (bestOrder) {
      return {
        id: bestOrder.tableId,
        kind: "take_order",
        label: `Take Order #${bestOrder.tableNumber}`,
        tableId: bestOrder.tableId,
        tableNumber: bestOrder.tableNumber,
        promptX: bestOrder.x,
        promptY: bestOrder.y - bestOrder.h / 2 - 22,
      };
    }

    return null;
  }

  public handleEvent(ev: DinerEventPayload): void {
    if (ev.kind === "customer_paid" && typeof ev.x === "number" && typeof ev.y === "number") {
      this.spawnFloatingText(ev.x, ev.y - 26, `+${ev.fp || 1} FP`, "#fbbf24");
      this.playTone(660, 0.08, "sine", 0.06);
      setTimeout(() => this.playTone(880, 0.12, "sine", 0.06), 70);
    } else if (ev.kind === "customer_left_angry" && typeof ev.x === "number" && typeof ev.y === "number") {
      this.spawnFloatingText(ev.x, ev.y - 26, "Left!", "#f87171");
      this.playTone(220, 0.15, "triangle", 0.05);
    } else if (ev.kind === "food_ready") {
      this.playTone(987, 0.09, "sine", 0.05);
    } else if (ev.kind === "order_taken" || ev.kind === "food_delivered" || ev.kind === "seated") {
      this.playTone(523, 0.05, "sine", 0.04);
    }
  }

  public spawnFloatingText(x: number, y: number, text: string, color: string): void {
    const label = this.scene.add
      .text(x, y, text, {
        fontFamily: "Outfit, sans-serif",
        fontSize: "14px",
        fontStyle: "bold",
        color,
        stroke: "#090d16",
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    label.setDepth(210);

    this.scene.tweens.add({
      targets: label,
      y: y - 36,
      alpha: 0,
      duration: 1100,
      ease: "Cubic.easeOut",
      onComplete: () => label.destroy(),
    });
  }

  private playTone(
    freq: number,
    durationSec: number,
    type: OscillatorType,
    volume: number
  ): void {
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      if (!this.audioCtx) this.audioCtx = new Ctx();
      if (this.audioCtx.state === "suspended") {
        void this.audioCtx.resume();
      }
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(volume, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        this.audioCtx.currentTime + durationSec
      );
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + durationSec);
    } catch {
      // Ignore audio errors on restricted devices
    }
  }
}
