# Bake-on-Equip Fashion System Guide

A practical engineering and asset-production guide for migrating the game's player fashion system from **32×32 Color-ID `PostFXPipeline` layers** to a **92×92 Bake-on-Equip spritesheet pipeline**, plus the step-by-step workflow for generating new fashion assets.

---

## 1. Architecture Overview: Why Bake-on-Equip?

Instead of stacking 4–8 separate Phaser sprites with `PostFXPipeline` shaders per player (which breaks WebGL batching and forces offscreen FBO passes every frame), the **Bake-on-Equip** pipeline composites a player's equipped gear **once** onto an offscreen `<canvas>` whenever they spawn or change outfit, and registers the result as a single standard Phaser spritesheet texture.

### Core Principles
1. **Keep `grayscale_sheet.png` shaded (do NOT flatten it to a Color-ID map).** Multiplying grayscale luminance by a skin RGB color preserves full 92×92 cel-shaded anatomy.
2. **Author ONE `part_mask.png` per animation (`idle`, `walking`, `melee_swing`).** Never hand-cut arm holes out of individual chest/armor sheets. The mask tells the baker which pixels belong to the near arm (in front of the chest) vs. far arm (behind the chest).
3. **1 Sprite per Player at Runtime.** Every player renders as a single normal `Phaser.GameObjects.Sprite` with **zero `PostFXPipeline` shaders**, restoring full WebGL multi-texture batching for multiplayer.
4. **Shared Cache + Ref-Counting.** Baked textures are keyed by an outfit hash (`skin|pants|chest|helmet|gloves|cape|anim`). Players wearing the same outfit share one VRAM texture; unused textures are destroyed when players leave.

---

## 2. Standard 92×92 Sheet Specifications

Every base body sheet, part mask, and gear sheet for a given animation **must share exact pixel dimensions and cell layout**:

| Animation | Grid (Cols × Rows) | Sheet Size | Row Order |
| :--- | :--- | :--- | :--- |
| `idle` | `4 × 4` | `368 × 368 px` | `0: south`, `1: west`, `2: east`, `3: north` |
| `walking` | `6 × 4` | `552 × 368 px` | `0: south`, `1: west`, `2: east`, `3: north` |
| `melee_swing` | `4 × 4` | `368 × 368 px` | `0: south`, `1: west`, `2: east`, `3: north` |

* **Cell size:** `92 × 92 px` per frame.
* **Alpha discipline:** Strict binary alpha (`0` = transparent, `255` = opaque). Zero anti-aliasing or semi-transparent fringe pixels.

### Part Mask Color Key (`part_mask.png` — 1 per animation)

Paint flat, unshaded RGB colors aligned pixel-for-pixel to `grayscale_sheet.png`:

| Body Region | Mask Color (Hex) | Depth Role |
| :--- | :--- | :--- |
| **Far Arm** (behind torso) | `#0000FF` | Drawn behind torso/chest (allows far gloves/sleeves to tuck behind chest) |
| **Legs / Feet** | `#00FF00` | Base lower body |
| **Torso / Chest / Back** | `#FF0000` | Base upper body |
| **Head / Face / Chin** | `#00FFFF` | Above torso collar |
| **Near Arm** (in front of torso) | `#FFFF00` | **Stamped ON TOP of chest armor** — must include the arm's `#404040` outline pixels! |

> **Why include the arm's `#404040` outline in `#FFFF00`?**
> When the baker stamps the near arm on top of a full chest armor sprite, the arm's existing dark outline automatically creates a clean 1 px border between the arm and the armor — no manual seam drawing needed.

---

## 3. Part 1 — What Needs to Be Changed Currently

### A. Assets (One-Time Setup per Animation)
1. **Keep existing 92×92 grayscale base sheets** (`player/breathing-idle/grayscale_sheet.png`, `player/walking_pixellab/grayscale_sheet.png`, `player/melee_swing/grayscale_sheet.png`).
2. **Create `part_mask.png` once per animation** right beside each `grayscale_sheet.png`:
   * `player/breathing-idle/part_mask.png` (`368 × 368`)
   * `player/walking_pixellab/part_mask.png` (`552 × 368`)
   * `player/melee_swing/part_mask.png` (`368 × 368`)
   * *(Minimum viable start: even just painting the `#FFFF00` Near Arm + its outline is enough to eliminate arm-over-chest overlap bugs immediately.)*
3. **Move runtime assets into `client/public/assets/`** (or your served assets folder) under a predictable structure:
   ```text
   assets/
     player/
       idle/grayscale_sheet.png
       idle/part_mask.png
       walking/grayscale_sheet.png
       walking/part_mask.png
       melee_swing/grayscale_sheet.png
       melee_swing/part_mask.png
     gears/
       casual/
         chest/{icon,idle,walking}.png
         helmet/{icon,idle,walking}.png
         pants/{icon,idle,walking}.png
       adventure/
         chest/{icon,idle,walking,melee_swing}.png
         helmet/{icon,idle,walking}.png
         pants/{icon,idle,walking}.png
   ```

### B. Shared Data & Catalog (`shared/src/types.ts`)
* Update `PlayerOutfit` and gear catalog entries (`FASHION_GEAR_CATALOG`) so each wearable item defines:
  * `id`: unique item key (e.g. `"leather_cloth"`)
  * `category`: `"casual" | "adventure"`
  * `slot`: `"cape" | "pants" | "boots" | "chest" | "gloves" | "helmet" | "weapon"`
  * `assetBasePath`: folder path (e.g. `"/assets/gears/adventure/chest"`)
  * `iconPath`: preview icon path (e.g. `"/assets/gears/adventure/chest/icon.png"`)
  * `dyeable?: boolean` (whether the baker should multiply-tint it with a user-selected color)
  * `hasSleeves?: boolean` (if `true`, the baker routes sleeve pixels overlapping `near_arm` above the chest)
* Replace legacy 32×32 static 4-frame strip fields (`outerwearKey` static bobbing assumptions) with animation-matched gear keys.

### C. Remove `PostFXPipeline` from Player Rendering
Currently, `GameScene.ts` and `PlayerAvatar.ts` attach `PostFXPipeline` to up to 4 sprites per player, which breaks WebGL batching in multiplayer:
* **`client/src/scenes/GameScene.ts`**
  * Remove `addPostPipeline("FashionPipeline", ...)` and `addPostPipeline("FrontArmPipeline", ...)` registrations (lines ~595–596).
  * Stop loading the legacy 32×32 `/assets/character_base_map.png` once migration is complete.
* **`client/src/pipelines/FashionPipeline.ts` & `FrontArmPipeline.ts`**
  * Deprecate and delete once `PlayerAvatar.ts` and UI previews use the baker.

### D. Create the Bake-on-Equip Module (`client/src/fashionBaker.ts`)
Replace the pixel color-key logic in `client/src/fashionRenderer.ts` with a shared `OutfitBaker` used by **both** Phaser sprites and DOM/UI previews:

1. **Deterministic Cache Key:**
   ```ts
   const key = `outfit:${anim}:${skinHex}:${pantsId}:${chestId}:${chestDye}:${helmetId}:${glovesId}:${capeId}`;
   ```
2. **Offscreen Canvas Compositing Order (per animation sheet):**
   ```text
   Pass 1  Back Cape        — draw cape rows 0, 1, 2 (south, west, east) behind body
   Pass 2  Base Body        — tint grayscale_sheet.png with skinColor (preserve dark outline pixels)
   Pass 3  Far-Arm Gear     — draw gloves/sleeves masked to part_mask == FAR_ARM (#0000FF)
   Pass 4  Pants / Boots    — draw full pants & boots sheets
   Pass 5  Chest / Armor    — draw full chest sheet (excluding NEAR_ARM pixels if it has sleeves)
   Pass 6  Head / Helmet    — draw hair / helmet sheet
   Pass 7  Near-Arm Body    — stamp tinted grayscale_sheet.png where part_mask == NEAR_ARM (#FFFF00)
   Pass 8  Near-Arm Gear    — draw gloves/sleeves masked to part_mask == NEAR_ARM (#FFFF00)
   Pass 9  Front Cape       — draw cape row 3 (north) on top of body
   Pass 10 Weapon (optional)— bake into melee sheet OR keep as 1 separate sprite if swapped often
   ```
3. **Luminance-Preserving Skin Tinting (Pass 2 & 7):**
   * For each opaque pixel `(L, L, L)` in `grayscale_sheet.png`:
     * If `L <= 75` (dark `#404040` outer stroke / deep crease): keep dark or tint slightly warm toward `skin * 0.25` so outlines stay crisp.
     * Otherwise: `outRGB = skinRGB * (L / 255)` (or ramp-map `L` across a 4-tone skin palette for crisp cel-shading).
4. **Register with Phaser Texture Manager:**
   ```ts
   if (!scene.textures.exists(texKey)) {
     scene.textures.addSpriteSheet(texKey, bakedCanvas as unknown as HTMLImageElement, {
       frameWidth: 92,
       frameHeight: 92,
     });
   }
   ```
5. **Multiplayer Texture Ref-Counting:**
   * Maintain `Map<string, number>` (`texKey -> activePlayerCount`).
   * On `acquire(texKey)`: increment count (bake if missing).
   * On `release(texKey)` (when a player changes outfit or disconnects): decrement count; when it hits `0`, schedule removal (`scene.textures.remove(texKey)` + clean up its Phaser animations) after a short grace period (e.g. 30s LRU) to avoid thrashing if someone swaps gear rapidly.

### E. Simplify `client/src/entities/PlayerAvatar.ts`
* **Collapse 8 sprites + 4 PostFX shaders → 1 main `Phaser.GameObjects.Sprite`** (`this.avatarSprite`).
  * Remove `outerwearSprite`, `frontArmSprite`, `hatSprite`, `rpgAccessorySprite`, `rpgArmorSprite`, `rpgEmblemSprite`, `bodyShader`, `outerwearShader`, `frontArmShader`, `hatShader`.
  * *(Optional: keep `weaponSprite` separate only if weapons swing/rotate independently or change faster than armor.)*
* **Remove manual frame-sync hacks:** Delete `syncBobForFrame()`, `syncRpgGearFrame()`, and the `animationupdate` listener that manually locked `frontArmSprite` to `bodySprite`.
* **Update `updateOutfit()`:** Acquire the new baked texture key(s) for `idle`, `walking`, and `melee_swing`, swap `this.avatarSprite` to the new baked texture while preserving the current animation direction & frame index, and release the previous outfit's texture ref-count.
* **Update `destroy()`:** Always release the player's currently held texture keys so multiplayer maps never leak VRAM.

### F. Unify UI Previews (`main.ts`, `FocusSceneRenderer.ts`, `rpgGearRenderer.ts`)
* Update `renderFashionPreviewFrame()` in `client/src/fashionRenderer.ts` to call the exact same `OutfitBaker` canvas compositor (cropping the requested `92 × 92` cell from the baked `idle` canvas).
* Result: Character creation, wardrobe UI, focus mode, and in-game multiplayer avatars are guaranteed 100% pixel-identical.

---

## 4. Part 2 — Workflow for Generating New Fashion Assets

Follow this checklist every time you create a new piece of gear (shirt, armor, pants, helmet, gloves, or cape).

### Step 1: Prepare Reference & Canvas
1. Open the target animation's `grayscale_sheet.png` as your bottom reference layer (`368 × 368` for `idle`/`melee_swing`, `552 × 368` for `walking`).
2. Keep `part_mask.png` on a toggleable reference layer so you know where the chin, waist, and arm seams sit — **but do NOT cut holes in chest gear for the near arm.**
3. Set your editor to **1×1 pixel nearest-neighbor** with **strict binary alpha** (no soft brushes, no anti-aliasing, no partial transparency).

### Step 2: Author the Gear by Slot Rules

| Slot | What to Draw | What NOT to Do |
| :--- | :--- | :--- |
| **Chest / Shirt / Armor** | Draw the **full torso** cleanly (shoulders, chest, waist, back). Carve only the **chin/neck opening** so the collar sits cleanly under the jaw. If it has sleeves, draw the full sleeves over the arms—the baker will automatically split near/far sleeve pixels using `part_mask.png`. | **Do NOT manually carve out the near arm/hand** where it crosses the chest (the baker stamps `front_arm` on top automatically!). |
| **Pants / Leggings** | Cover legs from waist/hips down to ankles. Extend 1–2 px up into the waist so there is never a skin gap under shorter shirts. | Do not overlap the torso chest area above the belt line. |
| **Boots / Shoes** | Cover feet/shins cleanly locked to the foot outer stroke. | Avoid overhanging pixels below the ground contact row. |
| **Gloves / Bracers** | Draw over **both** arms/hands. The baker uses `part_mask.png` to draw far-arm glove pixels *behind* the chest and near-arm glove pixels *in front* of the chest. | Do not try to manually split left/right glove files. |
| **Helmet / Hair** | Align per frame to the head silhouette in `grayscale_sheet.png`. | Never reuse a single static frame shifted by `(dx, dy)` offsets. |
| **Cape / Cloak** | Draw the full cape across all 4 rows. The baker automatically draws rows `0–2` (`south`, `west`, `east`) behind the body and row `3` (`north`) in front of the body. | Do not bake torso pixels into the cape sheet. |

### Step 3: Follow Art & Shading Standards
* **Body-Stroke Locking (`C ⊆ B`):** For fitted clothes, keep every opaque gear pixel inside the player's silhouette `B` from `grayscale_sheet.png` so the gear's 1 px outer stroke lands *directly on top of* the player's `#404040` outline (eliminating double outlines and grey bleed). Bulky protruding items (pauldrons, horned helmets, capes) may intentionally extend outside `B`.
* **Tinted Outlines (No Pure Black/White):** Never use `#000000` or `#FFFFFF`. Use hue-harmonized dark outlines (e.g. `#3E241C` dark umber for brown leather, `#26303D` slate for steel). Keep interior seams 1–2 value steps lighter than exterior outlines.
* **Anatomy-Driven Luminance Shading:** Sample the player's grayscale luminance from `grayscale_sheet.png` to drive your 2–4 cel-shaded tones (highlights on shoulder tops / upper chest / back shoulders; shadows under the chin, torso sides, and belt).
* **If the Item Should Be Dyeable:** Author the dyeable fabric in neutral grayscale (matching `grayscale_sheet.png` value range) so the baker can multiply-tint it cleanly. If the item has non-dyeable trim (e.g. iron buckle, leather straps), either keep it fixed-color (non-dyeable item) or put fixed accents in an optional `_trim.png` overlay.

### Step 4: Export Required Files
Place gear assets under `client/public/assets/gears/<category>/<slot>/` where `<category>` is `casual` or `adventure` and `<slot>` is `chest`, `helmet`, `pants`, etc. (for example, `assets/gears/adventure/chest/`). Inside each `<slot>` folder, export:
1. `idle.png` (`368 × 368`, `4 × 4`)
2. `walking.png` (`552 × 368`, `6 × 4`)
3. `melee_swing.png` (`368 × 368`, `4 × 4`, required for `adventure` combat slots)
4. `icon.png` (`92 × 92` — auto-cropped from Row 0, Frame 0 of `idle.png` so Wardrobe/inventory icons always match the animated sheet).

### Step 5: Register & Verify
1. **Register in Catalog:** Add the item entry to `FASHION_GEAR_CATALOG` in `shared/src/types.ts` (`id`, `name`, `category`, `slot`, `assetBasePath`, `iconPath`, `supportedAnims`, `dyeable`, `hasSleeves`).
2. **Run Automated Checks:**
   * Exact canvas dimensions match each animation spec.
   * Strict binary alpha check (`alpha === 0 || alpha === 255` for every pixel).
   * Zero unintended overhang check (`C ⊆ B`) for fitted gear.
3. **Visual Composite Inspection (4×–6× Zoom):**
   * Run the baker with the new item equipped alongside existing pants/gloves/helmet on a checkerboard background.
   * Inspect **high-overlap frames specifically**:
     * `melee_swing` Row 0 Frame 3 (`south` cross-body swing)
     * `melee_swing` Row 1 & 2 Frames 0–3 (`west`/`east` arm over chest)
     * `melee_swing` Row 3 Frame 3 (`north` twist swing)
     * `walking` Row 1 & 2 Frames 2–3 (full arm swing stride)
   * Confirm zero grey `#404040` body outline leaks, clean arm-over-chest border, and smooth frame-to-frame motion.
