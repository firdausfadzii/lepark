import {
  DINER_MAX_CARRIED_ITEMS,
  DINER_MENU_DISHES,
  DinerActionErrorPayload,
  DinerEventPayload,
  DinerGameState,
} from "shared";
import { DinerNearbyAction } from "./DinerSceneLayer";

function escapeHtml(str: string): string {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

export class DinerUiController {
  private hudEl = document.getElementById("diner-hud");
  private staffEl = document.getElementById("diner-hud-staff");
  private servedEl = document.getElementById("diner-hud-served");
  private fpEl = document.getElementById("diner-hud-fp");
  private handsEl = document.getElementById("diner-hud-hands");
  private tickerEl = document.getElementById("diner-hud-ticker");

  private actionBarEl = document.getElementById("diner-action-bar");
  private primaryBtn = document.getElementById("diner-primary-action-btn") as HTMLButtonElement | null;
  private primaryLabelEl = document.getElementById("diner-primary-action-label");
  private primaryKeyChipEl = document.getElementById("diner-primary-key-chip");
  private leaveBtn = document.getElementById("diner-leave-shift-btn") as HTMLButtonElement | null;

  private toastEl = document.getElementById("diner-toast");
  private toastIconEl = document.getElementById("diner-toast-icon");
  private toastTextEl = document.getElementById("diner-toast-text");

  private toastTimer: number | null = null;
  private currentState: DinerGameState | null = null;
  private currentNearby: DinerNearbyAction | null = null;
  private mySessionId: string = "";
  private isEditMode: boolean = false;

  private onPrimaryAction?: () => void;
  private onLeaveShift?: () => void;

  constructor(callbacks: {
    onPrimaryAction: () => void;
    onLeaveShift: () => void;
  }) {
    this.onPrimaryAction = callbacks.onPrimaryAction;
    this.onLeaveShift = callbacks.onLeaveShift;

    const bindSafeButton = (btn: HTMLButtonElement | null, handler: () => void) => {
      if (!btn) return;
      btn.addEventListener("touchstart", (e) => e.stopPropagation(), { passive: true });
      btn.addEventListener("pointerdown", (e) => e.stopPropagation());
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        handler();
      });
    };

    bindSafeButton(this.primaryBtn, () => this.onPrimaryAction?.());
    bindSafeButton(this.leaveBtn, () => this.onLeaveShift?.());
  }

  public setSessionId(sessionId: string): void {
    this.mySessionId = sessionId;
    this.renderHud();
  }

  public setEditMode(editMode: boolean): void {
    this.isEditMode = editMode;
    this.renderHud();
    this.renderActionBar();
  }

  public reset(): void {
    this.currentState = null;
    this.currentNearby = null;
    this.renderHud();
    this.renderActionBar();
  }

  public updateState(state: DinerGameState | null, mySessionId?: string): void {
    if (mySessionId) this.mySessionId = mySessionId;
    this.currentState = state;
    this.renderHud();
  }

  public updateNearbyAction(action: DinerNearbyAction | null): void {
    this.currentNearby = action;
    this.renderActionBar();
  }

  public handleError(err: DinerActionErrorPayload): void {
    this.showToast(err.message, "error");
  }

  public handleEvent(ev: DinerEventPayload): void {
    if (ev.kind === "shift_started") {
      this.showToast(ev.message, "success");
    } else if (ev.kind === "shift_ended") {
      this.showToast(ev.message, "info");
    } else if (ev.kind === "employee_joined" || ev.kind === "employee_left") {
      this.showToast(ev.message, "info");
    } else if (ev.kind === "customer_left_angry") {
      this.showToast(ev.message, "error");
    } else if (ev.kind === "food_ready") {
      this.showToast(ev.message, "ready");
    }
  }

  public showToast(
    message: string,
    variant: "error" | "success" | "info" | "ready" = "info"
  ): void {
    if (!this.toastEl || !this.toastTextEl) return;

    if (this.toastTimer !== null) {
      window.clearTimeout(this.toastTimer);
      this.toastTimer = null;
    }

    this.toastEl.className = `diner-toast diner-toast-${variant}`;
    if (this.toastIconEl) {
      if (variant === "error") {
        this.toastIconEl.innerHTML =
          '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
      } else if (variant === "success" || variant === "ready") {
        this.toastIconEl.innerHTML =
          '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
      } else {
        this.toastIconEl.innerHTML =
          '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
      }
    }

    this.toastTextEl.textContent = message;
    this.toastEl.classList.remove("hidden");

    this.toastTimer = window.setTimeout(() => {
      this.toastEl?.classList.add("diner-toast-fade");
      window.setTimeout(() => {
        this.toastEl?.classList.add("hidden");
        this.toastEl?.classList.remove("diner-toast-fade");
      }, 220);
    }, 2400);
  }

  private renderHud(): void {
    if (!this.hudEl) return;
    const s = this.currentState;
    if (!s || !s.enabled || !s.isPlaying || this.isEditMode) {
      this.hudEl.classList.add("hidden");
      return;
    }

    this.hudEl.classList.remove("hidden");

    const empCount = Object.keys(s.employees).length;
    if (this.staffEl) this.staffEl.textContent = `Staff: ${empCount}`;
    if (this.servedEl) this.servedEl.textContent = `Served: ${s.shiftServedCount}`;
    if (this.fpEl) this.fpEl.textContent = `+${s.shiftTotalFp} FP`;

    // Render local player's carried items (2 slots)
    const me = this.mySessionId ? s.employees[this.mySessionId] : undefined;
    if (this.handsEl) {
      if (!me) {
        this.handsEl.innerHTML = `<span class="diner-hand-chip diner-hand-spectate">Visit Host Desk to Join</span>`;
      } else {
        const slotsHtml: string[] = [];
        for (let i = 0; i < DINER_MAX_CARRIED_ITEMS; i++) {
          const item = me.carriedItems[i];
          if (!item) {
            slotsHtml.push(`<span class="diner-hand-chip diner-hand-empty">Empty</span>`);
          } else {
            const dish = DINER_MENU_DISHES.find((d) => d.id === item.dishId);
            const shortName = dish?.shortName || item.dishName;
            const kindClass = item.kind === "dish" ? "diner-hand-dish" : "diner-hand-ticket";
            const prefix = item.kind === "dish" ? "Plate" : "Order";
            slotsHtml.push(
              `<span class="diner-hand-chip ${kindClass}"><strong>#${item.tableNumber}</strong> ${escapeHtml(prefix)}: ${escapeHtml(shortName)}</span>`
            );
          }
        }
        this.handsEl.innerHTML = slotsHtml.join("");
      }
    }

    // Render kitchen orders + queue ticker
    if (this.tickerEl) {
      const queuedCount = s.customers.filter((c) => c.status === "queued").length;
      const pills: string[] = [];

      if (queuedCount > 0) {
        pills.push(
          `<span class="diner-ticker-pill diner-ticker-queue">Line: ${queuedCount}</span>`
        );
      }

      for (const ko of s.kitchenOrders) {
        const dish = DINER_MENU_DISHES.find((d) => d.id === ko.dishId);
        const shortName = dish?.shortName || ko.dishName;
        if (ko.status === "ready") {
          pills.push(
            `<span class="diner-ticker-pill diner-ticker-ready">READY <strong>#${ko.tableNumber}</strong> ${escapeHtml(shortName)}</span>`
          );
        } else {
          const pct = Math.round(ko.progress * 100);
          pills.push(
            `<span class="diner-ticker-pill diner-ticker-cooking">Cook <strong>#${ko.tableNumber}</strong> ${escapeHtml(shortName)} (${pct}%)</span>`
          );
        }
      }

      if (pills.length === 0) {
        this.tickerEl.classList.add("hidden");
        this.tickerEl.innerHTML = "";
      } else {
        this.tickerEl.classList.remove("hidden");
        this.tickerEl.innerHTML = pills.join("");
      }
    }
  }

  private renderActionBar(): void {
    if (!this.actionBarEl || !this.primaryBtn || !this.primaryLabelEl) return;
    const action = this.currentNearby;

    if (!action || this.isEditMode) {
      this.actionBarEl.classList.add("hidden");
      this.leaveBtn?.classList.add("hidden");
      return;
    }

    this.actionBarEl.classList.remove("hidden");
    this.primaryLabelEl.textContent = action.label;

    const isCookingOnly = action.kind === "kitchen_cooking";
    this.primaryBtn.disabled = isCookingOnly;
    this.primaryBtn.className = `diner-action-btn diner-primary-btn diner-btn-${action.kind}`;

    if (this.primaryKeyChipEl) {
      this.primaryKeyChipEl.classList.toggle("hidden", isCookingOnly);
    }

    if (this.leaveBtn) {
      this.leaveBtn.classList.toggle("hidden", !action.canLeaveShift);
    }
  }
}
