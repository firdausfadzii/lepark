import {
  DEFAULT_ADVENTURE_OUTFIT,
  DEFAULT_CASUAL_OUTFIT,
  FASHION_GEAR_CATALOG,
  FashionGearSlot,
  INVENTORY_MAX_SLOTS,
  InventoryDeltaPayload,
  InventoryItemDto,
  InventorySyncPayload,
  OutfitMode,
  getInventoryTemplateMeta,
} from "shared";
import {
  equipPlayerInventoryItem,
  getPlayerInventoryItems,
  seedPlayerInventoryItems,
  unequipPlayerInventoryItem,
} from "../db";

function buildStarterInventoryItems(): Array<Omit<InventoryItemDto, "id">> {
  const casualEquipped = new Set(
    [
      DEFAULT_CASUAL_OUTFIT.chestKey,
      DEFAULT_CASUAL_OUTFIT.pantsKey,
      DEFAULT_CASUAL_OUTFIT.helmetKey,
      DEFAULT_CASUAL_OUTFIT.bootsKey,
      DEFAULT_CASUAL_OUTFIT.glovesKey,
    ].filter(Boolean) as string[]
  );

  const adventureEquipped = new Set(
    [
      DEFAULT_ADVENTURE_OUTFIT.chestKey,
      DEFAULT_ADVENTURE_OUTFIT.pantsKey,
      DEFAULT_ADVENTURE_OUTFIT.helmetKey,
      DEFAULT_ADVENTURE_OUTFIT.bootsKey,
      DEFAULT_ADVENTURE_OUTFIT.glovesKey,
    ].filter(Boolean) as string[]
  );

  return FASHION_GEAR_CATALOG.map((gear) => {
    const isEquippedCasual = gear.category === "casual" && casualEquipped.has(gear.id);
    const isEquippedAdventure = gear.category === "adventure" && adventureEquipped.has(gear.id);
    const equippedMode: OutfitMode | null = isEquippedCasual
      ? "casual"
      : isEquippedAdventure
        ? "adventure"
        : null;

    return {
      templateId: gear.id,
      category: "gear",
      quantity: 1,
      equippedMode,
      equippedSlot: equippedMode ? gear.slot : null,
      isLocked: false,
      instanceData: { starter: true },
    };
  });
}

export class InventoryService {
  private static instance: InventoryService | null = null;

  private cache = new Map<number, InventoryItemDto[]>();
  private userLocks = new Map<number, Promise<void>>();

  private constructor() {}

  public static getInstance(): InventoryService {
    if (!InventoryService.instance) {
      InventoryService.instance = new InventoryService();
    }
    return InventoryService.instance;
  }

  private async withUserLock<T>(userId: number, fn: () => Promise<T>): Promise<T> {
    const prev = this.userLocks.get(userId) || Promise.resolve();
    let release!: () => void;
    const next = new Promise<void>((resolve) => {
      release = resolve;
    });
    const chained = prev.then(() => next);
    this.userLocks.set(userId, chained);

    await prev;
    try {
      return await fn();
    } finally {
      release();
      if (this.userLocks.get(userId) === chained) {
        this.userLocks.delete(userId);
      }
    }
  }

  public evictUser(userId: number): void {
    if (userId > 0) {
      this.cache.delete(userId);
    }
  }

  public async getInventory(userId: number): Promise<InventorySyncPayload> {
    if (userId <= 0) {
      const guestItems = buildStarterInventoryItems().map((item, idx) => ({
        ...item,
        id: `guest_${idx}_${item.templateId}`,
      }));
      return { items: guestItems, maxSlots: INVENTORY_MAX_SLOTS };
    }

    const cached = this.cache.get(userId);
    if (cached) {
      return { items: cached, maxSlots: INVENTORY_MAX_SLOTS };
    }

    let items = await getPlayerInventoryItems(userId);
    if (items.length === 0) {
      items = await seedPlayerInventoryItems(userId, buildStarterInventoryItems());
    }
    this.cache.set(userId, items);
    return { items, maxSlots: INVENTORY_MAX_SLOTS };
  }

  public async equipItem(
    userId: number,
    itemId: string,
    mode?: OutfitMode
  ): Promise<{
    delta: InventoryDeltaPayload;
    mode?: OutfitMode;
    slot?: FashionGearSlot;
    templateId?: string;
  }> {
    if (userId <= 0) {
      return { delta: { error: "Sign in to save equipment changes." } };
    }

    return this.withUserLock(userId, async () => {
      const { items } = await this.getInventory(userId);
      const item = items.find((i) => i.id === itemId);
      if (!item) {
        return { delta: { error: "Item not found in inventory." } };
      }

      const meta = getInventoryTemplateMeta(item.templateId);
      if (!meta || !meta.slot) {
        return { delta: { error: "This item cannot be equipped." } };
      }

      const targetMode: OutfitMode = mode || meta.category || "adventure";
      if (meta.category && meta.category !== targetMode) {
        return {
          delta: { error: `This item belongs to ${meta.category} mode.` },
        };
      }

      const res = await equipPlayerInventoryItem(userId, itemId, targetMode, meta.slot);
      if (res.error) {
        return { delta: { error: res.error } };
      }

      this.applyUpdatedToCache(userId, res.updated);
      return {
        delta: { updated: res.updated, maxSlots: INVENTORY_MAX_SLOTS },
        mode: targetMode,
        slot: meta.slot,
        templateId: item.templateId,
      };
    });
  }

  public async unequipItem(
    userId: number,
    itemId: string
  ): Promise<{
    delta: InventoryDeltaPayload;
    mode?: OutfitMode;
    slot?: FashionGearSlot;
  }> {
    if (userId <= 0) {
      return { delta: { error: "Sign in to save equipment changes." } };
    }

    return this.withUserLock(userId, async () => {
      const { items } = await this.getInventory(userId);
      const item = items.find((i) => i.id === itemId);
      if (!item) {
        return { delta: { error: "Item not found in inventory." } };
      }
      if (!item.equippedSlot || !item.equippedMode) {
        return { delta: { updated: [] } };
      }

      const prevMode = item.equippedMode;
      const prevSlot = item.equippedSlot;
      const res = await unequipPlayerInventoryItem(userId, itemId);
      if (res.error) {
        return { delta: { error: res.error } };
      }

      this.applyUpdatedToCache(userId, res.updated);
      return {
        delta: { updated: res.updated, maxSlots: INVENTORY_MAX_SLOTS },
        mode: prevMode,
        slot: prevSlot,
      };
    });
  }

  private applyUpdatedToCache(userId: number, updated: InventoryItemDto[]): void {
    const cached = this.cache.get(userId);
    if (!cached || updated.length === 0) return;
    const byId = new Map(updated.map((u) => [u.id, u]));
    for (let i = 0; i < cached.length; i++) {
      const replacement = byId.get(cached[i].id);
      if (replacement) {
        cached[i] = replacement;
      }
    }
  }
}

export const inventoryService = InventoryService.getInstance();
