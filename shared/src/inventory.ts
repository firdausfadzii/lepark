import {
  FASHION_GEAR_CATALOG,
  type FashionGearCatalogItem,
  type FashionGearSlot,
  type OutfitMode,
} from "./types";

export const INVENTORY_MAX_SLOTS = 100;
export const INVENTORY_PAGE_SIZE = 20;

export type InventoryCategory = "gear" | "consumable" | "material" | "cosmetic";

export interface InventoryItemDto {
  id: string;
  templateId: string;
  category: InventoryCategory;
  quantity: number;
  equippedMode: OutfitMode | null;
  equippedSlot: FashionGearSlot | null;
  isLocked: boolean;
  instanceData?: Record<string, unknown> | null;
}

export interface InventoryFilter {
  slot?: FashionGearSlot;
  category?: OutfitMode;
}

export interface InventorySyncPayload {
  items: InventoryItemDto[];
  maxSlots: number;
}

export interface InventoryDeltaPayload {
  added?: InventoryItemDto[];
  updated?: InventoryItemDto[];
  removed?: string[];
  maxSlots?: number;
  error?: string;
}

export interface InventoryTemplateMeta {
  id: string;
  name: string;
  slot: FashionGearSlot | null;
  category: OutfitMode | null;
  iconPath: string;
}

const GEAR_TEMPLATE_MAP = new Map<string, FashionGearCatalogItem>(
  FASHION_GEAR_CATALOG.map((item) => [item.id, item])
);

export function getInventoryTemplateMeta(templateId: string): InventoryTemplateMeta | null {
  const gear = GEAR_TEMPLATE_MAP.get(templateId);
  if (gear) {
    return {
      id: gear.id,
      name: gear.name,
      slot: gear.slot,
      category: gear.category,
      iconPath: gear.iconPath,
    };
  }
  return null;
}
