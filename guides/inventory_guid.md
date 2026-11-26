# Inventory System Architecture & Implementation Plan

A lightweight, mobile-friendly inventory system tailored for the **Phaser 3 + Colyseus + PostgreSQL** stack.

---

## 1. Core Architectural Principles

1. **Keep Inventory OUT of Colyseus Room State (`GameState` / `PlayerState`)**
   - Colyseus broadcasts Schema state diffs to **every player in the room**. Storing an inventory array on `PlayerState` would bloat bandwidth and serialization CPU.
   - `PlayerState` remains **visual-only** (`OutfitSchema` keys like `helmetKey`, `chestKey`, `pantsKey`, `bootsKey`, `glovesKey` and `rpgGearSignature`). Other players only need to know what you are wearing, never what is in your bag.
   - Private inventory data is sent **only to the owning client** via targeted messages/REST.

2. **Lazy-Load & Cache**
   - Do **not** load or push the player's full inventory on `GameRoom.onJoin`.
   - Load it once on first open, cache it in server RAM while the player is online, and keep a matching `InventoryStore` on the client.

---

## 2. Capacity & Pagination

- **Hard Cap:** `100` slots per player (enforced server-side).
  - 100 thin item records is only ~4–8 KB, keeping DB queries, server RAM, and network payloads tiny.
- **Stackables:** Consumables/materials stack in a single slot (`quantity > 1`), so 99 potions still consume only `1 / 100` slots.
- **Pagination:** `20` items per page (`5` pages max for 100 slots).
  - **Mobile:** `4 columns × 5 rows`
  - **Desktop:** `5 columns × 4 rows`
  - Only the active page's 20 DOM cells are rendered at any time.

---

## 3. Data Model (Flyweight Pattern)

Split item data into a **Static Catalog** (bundled in `shared`) and **Thin Dynamic Instances** (stored in PostgreSQL and sent over the wire).

### Static Catalog (`shared/src/types.ts`)
- Reuse `FASHION_GEAR_CATALOG` for wearable gear. Every gear asset already defines:
  - `id` (`templateId`)
  - `name`
  - `slot`: `"helmet" | "chest" | "pants" | "boots" | "gloves" | "cape" | "weapon"`
  - `category`: `"casual" | "adventure"`
  - `iconPath`: e.g. `/assets/gears/adventure/helmet/icon.png`
- Future non-gear items (consumables, materials) omit `slot` (`slot: null`) so they appear in the full Bag view and are automatically excluded when clicking a gear slot.

### Dynamic Instance (DB & Wire DTO)
```ts
export interface InventoryItemDto {
  id: string;
  templateId: string;
  category: "gear" | "consumable" | "material" | "cosmetic";
  quantity: number;
  equippedMode: "casual" | "adventure" | null;
  equippedSlot: FashionGearSlot | null;
  isLocked: boolean;
  instanceData?: Record<string, unknown> | null; // rolled stats/specialists for RPG gear; null for stackables
}
```

---

## 4. PostgreSQL Schema

Store items in a normalized `player_inventory_items` table instead of rewriting a large `profile_json` blob on every equip/loot action:

```sql
CREATE TABLE IF NOT EXISTS player_inventory_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category       VARCHAR(24) NOT NULL,          -- 'gear' | 'consumable' | 'material' | 'cosmetic'
  template_id    VARCHAR(64) NOT NULL,
  quantity       INT NOT NULL DEFAULT 1,
  equipped_mode  VARCHAR(16) DEFAULT NULL,      -- 'casual' | 'adventure' | NULL
  equipped_slot  VARCHAR(24) DEFAULT NULL,      -- 'helmet' | 'chest' | 'pants' | 'boots' | 'gloves' | ...
  is_locked      BOOLEAN NOT NULL DEFAULT FALSE,
  instance_data  JSONB DEFAULT NULL,            -- NULL for stackables; rolled stats/specialists for gear
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Fast per-user & per-category lookups
CREATE INDEX IF NOT EXISTS idx_inv_user_cat
  ON player_inventory_items (user_id, category);

-- DB-enforced guarantee: at most 1 item equipped per (user, mode, slot)
CREATE UNIQUE INDEX IF NOT EXISTS idx_inv_unique_equipped
  ON player_inventory_items (user_id, equipped_mode, equipped_slot)
  WHERE equipped_slot IS NOT NULL AND equipped_mode IS NOT NULL;

-- Atomic stacking for non-unique items
CREATE UNIQUE INDEX IF NOT EXISTS idx_inv_unique_stack
  ON player_inventory_items (user_id, template_id)
  WHERE instance_data IS NULL AND equipped_slot IS NULL;
```

**Why this is fast:**
- Equipping or swapping gear updates at most **2 rows** in a tiny transaction.
- Adding stackable loot is a single `INSERT ... ON CONFLICT DO UPDATE`.

---

## 5. Server-Side Optimizations (`InventoryService`)

1. **Lazy-Load on Demand:** Load `player_inventory_items` only when the client sends `INVENTORY_GET` (or opens the modal). Keep `GameRoom.onJoin` limited to visual `OutfitSchema` / `rpgGearSignature`.
2. **In-Memory Session Cache:** Cache loaded inventories in `Map<userId, CachedInventory>` while online and evict on `onLeave` (or idle TTL).
3. **Delta Sync (`INVENTORY_DELTA`):** Never resend all 100 items after a mutation. Send only:
   ```ts
   {
     added?: InventoryItemDto[];
     updated?: Partial<InventoryItemDto>[];
     removed?: string[];
   }
   ```
   Only update `PlayerState` (`OutfitSchema` / `rpgGearSignature`) when an equipped visual slot actually changes.
4. **Per-User Async Mutation Lock:** Serialize writes per `userId` to prevent race conditions or item duplication from rapid double-taps.
5. **Server-Enforced Cap:** Reject or route overflow when `count >= 100` (unless stacking into an existing stackable row).

---

## 6. Client-Side Optimizations

1. **HTML/CSS DOM Modal (Not Phaser Canvas):** Zero Phaser render-loop overhead when closed, crisp text, and native responsive layout.
2. **Local `InventoryStore`:** Store items in a `Map<string, InventoryItemDto>`. Filtering by `slot + mode` and slicing pages (`page 1..5`) run **100% locally in memory** with zero server round-trips.
3. **Lazy Render & Targeted DOM Updates:** Do not touch the DOM while closed. Use a **single delegated `click` listener** on the grid container instead of per-cell listeners.
4. **Cached Icon Thumbnails:** Cache resolved icon URLs (`Map<string, string>`) so sprites are not re-sliced or re-decoded when reopening or paging.

---

## 7. UI & Interaction Spec (Minimalistic & Mobile-Friendly)

- **Zero Filter UI:** No tabs, no dropdowns, and no search bar inside the inventory modal. Filtering is controlled **purely in code** via `openInventoryModal(filter?)`.

### Two Entry Points → One Reusable Modal
1. **Gear Slot Click** (`.wow-equip-slot[data-equip-slot]` in `client/index.html`):
   - Opens the modal filtered by **`slot + active mode`** (e.g., `Helmet` + `Casual` or `Helmet` + `Adventure`).
   - Header displays the slot name (e.g., `Helmet`).
2. **Bag Icon Button** (far right of `.profile-equip-topbar`, on the same line as the `Casual` / `Adventure` tabs):
   - Uses `justify-content: space-between` on `.profile-equip-topbar`.
   - Opens the exact same modal with **no filter** (shows all owned items).
   - Header displays `Inventory` + `used / 100`.

### Compact Modal Layout
- **Card Size:** `width: min(92vw, 420px)`, `max-height: 85dvh`.
- **Header (1 row):** Title (`Inventory` or slot name) + slot count (`14 / 100`) on the left; `✕` close button on the right.
- **Grid Body (20 cells/page):**
  - `4×5` on mobile (`aspect-ratio: 1`, `≥ 52px` touch targets), `5×4` on desktop.
  - Each cell shows only the item icon, a subtle equipped indicator if worn, and a quantity badge if `quantity > 1`.
- **Footer (2 compact rows):**
  1. **Selected Item Strip:** Tapping a cell highlights it and shows the item's name + **`Equip`** (or **`Unequip`**) button (and optional `Discard`).
  2. **Pagination Bar:** `<  1 / 5  >` with thumb-friendly `44px` buttons. Automatically hidden when `totalPages <= 1`.

---

## 8. Phased Implementation Roadmap

1. **Phase 1 — Shared Types & DB Schema**
   - Add `InventoryItemDto`, `InventoryFilter`, and `INVENTORY_MAX_SLOTS = 100` in `shared/src/types.ts` (or `shared/src/items.ts`).
   - Create `player_inventory_items` table and indexes in `server/src/db/index.ts`.
   - Add a one-time migration helper for any existing `rpg_profiles.profile_json.inventory` items.
2. **Phase 2 — Server `InventoryService` & Delta Protocol**
   - Implement `InventoryService` (lazy-load, session cache, per-user lock, 100-slot cap, equip/unequip/stack/discard).
   - Register `INVENTORY_GET`, `INVENTORY_EQUIP`, `INVENTORY_UNEQUIP`, and `INVENTORY_DELTA` in `server/src/rooms/GameRoom.ts`.
   - Sync equipped gear changes to `PlayerState.outfit` / `rpgGearSignature`.
3. **Phase 3 — Client `InventoryStore` & Minimalistic Modal**
   - Add the Bag icon button to `.profile-equip-topbar` in `client/index.html`.
   - Build the reusable paginated inventory modal (`4×5` mobile / `5×4` desktop) with tap-to-select + `Equip` / `Unequip` action strip.
   - Wire `.wow-equip-slot` clicks (`slot + mode` filter) and Bag icon click (unfiltered).
4. **Phase 4 — QoL & Expansion**
   - Item locking, bulk discard/salvage, and non-gear items (consumables/materials) using the same table and modal.
