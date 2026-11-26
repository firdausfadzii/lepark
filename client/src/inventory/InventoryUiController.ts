import {
  AuthUser,
  FASHION_GEAR_CATALOG,
  FashionGearSlot,
  INVENTORY_MAX_SLOTS,
  INVENTORY_PAGE_SIZE,
  InventoryDeltaPayload,
  InventoryFilter,
  InventoryItemDto,
  InventorySyncPayload,
  OutfitMode,
  PlayerOutfit,
  getInventoryTemplateMeta,
} from "shared";
import { MultiplayerManager } from "../network/MultiplayerManager";

const SLOT_TITLES: Partial<Record<FashionGearSlot, string>> = {
  helmet: "Helmet",
  chest: "Armor",
  pants: "Pants",
  boots: "Shoes",
  gloves: "Gloves",
  cape: "Cape",
  weapon: "Weapon",
};

export interface InventoryUiDeps {
  getMultiplayer: () => MultiplayerManager | null;
  getCurrentUser: () => AuthUser | null;
  getActiveEquipMode: () => OutfitMode;
  getOutfitForMode: (mode: OutfitMode) => PlayerOutfit;
  onEquipSlotChanged: (mode: OutfitMode, slot: FashionGearSlot, templateId: string) => void;
}

export class InventoryUiController {
  private deps: InventoryUiDeps;
  private boundManagers = new WeakSet<MultiplayerManager>();

  private itemsMap = new Map<string, InventoryItemDto>();
  private maxSlots = INVENTORY_MAX_SLOTS;
  private hasSyncedFromServer = false;
  private iconCache = new Map<string, string>();

  private activeFilter: InventoryFilter | null = null;
  private currentPage = 1;
  private selectedItemId: string | null = null;

  private modal = document.getElementById("inventory-modal") as HTMLElement | null;
  private titleEl = document.getElementById("inventory-modal-title") as HTMLElement | null;
  private countEl = document.getElementById("inventory-modal-count") as HTMLElement | null;
  private closeBtn = document.getElementById("btn-close-inventory-modal") as HTMLButtonElement | null;
  private gridEl = document.getElementById("inventory-grid") as HTMLElement | null;
  private actionBar = document.getElementById("inventory-action-bar") as HTMLElement | null;
  private selectedNameEl = document.getElementById("inventory-selected-name") as HTMLElement | null;
  private equipBtn = document.getElementById("btn-inventory-equip") as HTMLButtonElement | null;
  private paginationEl = document.getElementById("inventory-pagination") as HTMLElement | null;
  private prevBtn = document.getElementById("btn-inventory-prev") as HTMLButtonElement | null;
  private nextBtn = document.getElementById("btn-inventory-next") as HTMLButtonElement | null;
  private pageLabelEl = document.getElementById("inventory-page-label") as HTMLElement | null;

  constructor(deps: InventoryUiDeps) {
    this.deps = deps;
    this.bindEvents();
  }

  private bindEvents(): void {
    this.closeBtn?.addEventListener("click", () => this.close());

    this.modal?.addEventListener("click", (e) => {
      if (e.target === this.modal) this.close();
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.isOpen()) {
        this.close();
      }
    });

    // Single delegated click listener for all grid cells
    this.gridEl?.addEventListener("click", (e) => {
      const target = (e.target as HTMLElement | null)?.closest<HTMLButtonElement>(".inventory-cell[data-item-id]");
      if (!target) return;
      const itemId = target.dataset.itemId;
      if (!itemId) return;
      this.selectedItemId = this.selectedItemId === itemId ? null : itemId;
      this.render();
    });

    this.equipBtn?.addEventListener("click", () => this.handleEquipToggle());

    this.prevBtn?.addEventListener("click", () => {
      if (this.currentPage > 1) {
        this.currentPage -= 1;
        this.selectedItemId = null;
        this.render();
      }
    });

    this.nextBtn?.addEventListener("click", () => {
      const totalPages = this.getTotalPages(this.getFilteredItems().length);
      if (this.currentPage < totalPages) {
        this.currentPage += 1;
        this.selectedItemId = null;
        this.render();
      }
    });
  }

  public attachMultiplayer(mp: MultiplayerManager): void {
    if (this.boundManagers.has(mp)) return;
    this.boundManagers.add(mp);

    mp.onInventorySync((payload: InventorySyncPayload) => {
      this.hasSyncedFromServer = true;
      this.maxSlots = payload.maxSlots || INVENTORY_MAX_SLOTS;
      this.itemsMap.clear();
      for (const item of payload.items) {
        this.itemsMap.set(item.id, item);
      }
      if (this.isOpen()) {
        this.render();
      }
    });

    mp.onInventoryDelta((delta: InventoryDeltaPayload) => {
      if (delta.error) return;
      if (delta.maxSlots) this.maxSlots = delta.maxSlots;

      if (delta.removed) {
        for (const id of delta.removed) {
          this.itemsMap.delete(id);
          if (this.selectedItemId === id) this.selectedItemId = null;
        }
      }
      if (delta.added) {
        for (const item of delta.added) {
          this.itemsMap.set(item.id, item);
        }
      }
      if (delta.updated) {
        for (const item of delta.updated) {
          this.itemsMap.set(item.id, item);
        }
      }

      if (this.isOpen()) {
        this.render();
      }
    });
  }

  public isOpen(): boolean {
    return !!this.modal && !this.modal.classList.contains("hidden");
  }

  public open(filter?: InventoryFilter): void {
    if (!this.modal) return;
    this.activeFilter = filter ?? null;
    this.currentPage = 1;
    this.selectedItemId = null;

    if (!this.hasSyncedFromServer) {
      this.seedLocalFallback();
      const mp = this.deps.getMultiplayer();
      const user = this.deps.getCurrentUser();
      if (mp && user && user.id > 0) {
        mp.requestInventory();
      }
    }

    this.modal.classList.remove("hidden");
    this.render();
  }

  public close(): void {
    if (!this.modal) return;
    this.modal.classList.add("hidden");
    this.selectedItemId = null;
  }

  private seedLocalFallback(): void {
    if (this.itemsMap.size > 0) return;
    const casualOutfit = this.deps.getOutfitForMode("casual");
    const adventureOutfit = this.deps.getOutfitForMode("adventure");

    const isEquippedInMode = (mode: OutfitMode, slot: FashionGearSlot, id: string): boolean => {
      const outfit = mode === "casual" ? casualOutfit : adventureOutfit;
      if (slot === "helmet") return (outfit.helmetKey || outfit.hatKey) === id;
      if (slot === "chest") return (outfit.chestKey || outfit.outerwearKey) === id;
      if (slot === "pants") return outfit.pantsKey === id;
      if (slot === "boots") return outfit.bootsKey === id;
      if (slot === "gloves") return outfit.glovesKey === id;
      return false;
    };

    FASHION_GEAR_CATALOG.forEach((gear, idx) => {
      const equipped = isEquippedInMode(gear.category, gear.slot, gear.id);
      const item: InventoryItemDto = {
        id: `local_${idx}_${gear.id}`,
        templateId: gear.id,
        category: "gear",
        quantity: 1,
        equippedMode: equipped ? gear.category : null,
        equippedSlot: equipped ? gear.slot : null,
        isLocked: false,
      };
      this.itemsMap.set(item.id, item);
    });
  }

  private getFilteredItems(): InventoryItemDto[] {
    const all = Array.from(this.itemsMap.values());
    if (!this.activeFilter) return all;

    const { slot, category } = this.activeFilter;
    return all.filter((item) => {
      const meta = getInventoryTemplateMeta(item.templateId);
      if (!meta || !meta.slot) return false;
      if (slot && meta.slot !== slot) return false;
      if (category && meta.category !== category) return false;
      return true;
    });
  }

  private getTotalPages(totalItems: number): number {
    return Math.max(1, Math.ceil(totalItems / INVENTORY_PAGE_SIZE));
  }

  private resolveIconUrl(templateId: string): string {
    const cached = this.iconCache.get(templateId);
    if (cached !== undefined) return cached;
    const meta = getInventoryTemplateMeta(templateId);
    const url = meta?.iconPath || "";
    this.iconCache.set(templateId, url);
    return url;
  }

  private handleEquipToggle(): void {
    if (!this.selectedItemId) return;
    const item = this.itemsMap.get(this.selectedItemId);
    if (!item) return;

    const meta = getInventoryTemplateMeta(item.templateId);
    if (!meta || !meta.slot) return;

    const targetMode: OutfitMode =
      this.activeFilter?.category || meta.category || this.deps.getActiveEquipMode();
    const isCurrentlyEquipped =
      item.equippedSlot === meta.slot && item.equippedMode === targetMode;

    const mp = this.deps.getMultiplayer();
    const user = this.deps.getCurrentUser();
    const isAuthenticatedOnline = !!(mp && user && user.id > 0 && this.hasSyncedFromServer);

    if (isCurrentlyEquipped) {
      if (isAuthenticatedOnline) {
        mp!.unequipInventoryItem(item.id);
      } else {
        item.equippedMode = null;
        item.equippedSlot = null;
      }
      this.deps.onEquipSlotChanged(targetMode, meta.slot, "");
    } else {
      if (isAuthenticatedOnline) {
        mp!.equipInventoryItem(item.id, targetMode);
      } else {
        for (const other of this.itemsMap.values()) {
          if (other.id !== item.id && other.equippedMode === targetMode && other.equippedSlot === meta.slot) {
            other.equippedMode = null;
            other.equippedSlot = null;
          }
        }
        item.equippedMode = targetMode;
        item.equippedSlot = meta.slot;
      }
      this.deps.onEquipSlotChanged(targetMode, meta.slot, item.templateId);
    }

    this.render();
  }

  private render(): void {
    if (!this.gridEl) return;

    // Header title + count
    if (this.titleEl) {
      this.titleEl.textContent = this.activeFilter?.slot
        ? SLOT_TITLES[this.activeFilter.slot] || "Gear"
        : "Inventory";
    }
    if (this.countEl) {
      this.countEl.textContent = `${this.itemsMap.size} / ${this.maxSlots}`;
    }

    const filtered = this.getFilteredItems();
    const totalPages = this.getTotalPages(filtered.length);
    if (this.currentPage > totalPages) this.currentPage = totalPages;

    const startIdx = (this.currentPage - 1) * INVENTORY_PAGE_SIZE;
    const pageItems = filtered.slice(startIdx, startIdx + INVENTORY_PAGE_SIZE);

    // Render fixed 20-cell page grid
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < INVENTORY_PAGE_SIZE; i++) {
      const item = pageItems[i];
      if (!item) {
        const emptyCell = document.createElement("div");
        emptyCell.className = "inventory-cell empty";
        emptyCell.setAttribute("aria-hidden", "true");
        fragment.appendChild(emptyCell);
        continue;
      }

      const meta = getInventoryTemplateMeta(item.templateId);
      const iconUrl = this.resolveIconUrl(item.templateId);
      const isEquipped = !!(item.equippedSlot && item.equippedMode);
      const isSelected = item.id === this.selectedItemId;

      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = `inventory-cell${isEquipped ? " equipped" : ""}${isSelected ? " selected" : ""}`;
      cell.dataset.itemId = item.id;
      cell.title = meta?.name || item.templateId;
      cell.setAttribute("aria-label", meta?.name || item.templateId);

      if (iconUrl) {
        const img = document.createElement("img");
        img.className = "inventory-cell-icon";
        img.src = iconUrl;
        img.alt = meta?.name || item.templateId;
        img.loading = "lazy";
        cell.appendChild(img);
      }

      if (item.quantity > 1) {
        const qty = document.createElement("span");
        qty.className = "inventory-cell-qty";
        qty.textContent = String(item.quantity);
        cell.appendChild(qty);
      }

      fragment.appendChild(cell);
    }

    this.gridEl.replaceChildren(fragment);

    // Selected item action bar
    const selected = this.selectedItemId ? this.itemsMap.get(this.selectedItemId) : undefined;
    const selectedMeta = selected ? getInventoryTemplateMeta(selected.templateId) : null;

    if (this.actionBar && this.selectedNameEl && this.equipBtn) {
      if (selected && selectedMeta?.slot) {
        const targetMode: OutfitMode =
          this.activeFilter?.category || selectedMeta.category || this.deps.getActiveEquipMode();
        const isEquippedHere =
          selected.equippedSlot === selectedMeta.slot && selected.equippedMode === targetMode;

        this.selectedNameEl.textContent = selectedMeta.name;
        this.equipBtn.textContent = isEquippedHere ? "Unequip" : "Equip";
        this.equipBtn.classList.remove("hidden");
        this.actionBar.classList.remove("hidden");
      } else if (selected) {
        this.selectedNameEl.textContent = selectedMeta?.name || selected.templateId;
        this.equipBtn.classList.add("hidden");
        this.actionBar.classList.remove("hidden");
      } else {
        this.actionBar.classList.add("hidden");
      }
    }

    // Pagination bar (hidden when 1 page)
    if (this.paginationEl && this.pageLabelEl && this.prevBtn && this.nextBtn) {
      if (totalPages <= 1) {
        this.paginationEl.classList.add("hidden");
      } else {
        this.paginationEl.classList.remove("hidden");
        this.pageLabelEl.textContent = `${this.currentPage} / ${totalPages}`;
        this.prevBtn.disabled = this.currentPage <= 1;
        this.nextBtn.disabled = this.currentPage >= totalPages;
      }
    }
  }
}
