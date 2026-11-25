# Agent Guide: Generating Modular Pixel Art Assets via PixelLab MCP (`generate-sprite-guid.md`)

This document defines the strict rules, canvas dimensions, alignment anchors, and tool workflows an AI agent must follow when generating sprites for this **Phaser 3 + Colyseus 4-Directional Top-Down Game** using the **PixelLab MCP Server** (`https://api.pixellab.ai/mcp`).

---

## 1. Core Architectural Rules (Do Not Violate)

Our game uses a **Color-ID Base Body + 4-Frame Static Overlay** architecture. Agents must **NEVER** generate full 20-frame animated spritesheets for individual shirts, pants, jackets, or hats.

1. **Base Shirts & Pants:** Already encoded into `public/assets/character_base_map.png` via shader color keys (`#ff0000`, `#aa0000`, `#ff8800`, `#0000ff`, `#0000aa`, `#00ff00`, `#ffff00`). Do **not** generate separate sprites for basic t-shirts or pants.
2. **Oversized Outerwear (Hoodies, Jackets, Coats):** Generate **only 4 static directional sprites** (South, West, East, North) packed into a single 4-frame strip. Swinging arms are handled by the base sheet's `#ffff00` front-arm pass.
3. **Hats, Hairstyles & Face Accessories:** Generate **only 4 static directional sprites** (South, West, East, North) packed into a single 4-frame strip.
4. **Strict Pixel Integrity:** Zero anti-aliasing, zero soft gradients, zero drop shadows baked into the canvas, and 100% transparent background (`alpha = 0`).

---

## 2. Canvas & Grid Specifications

Every generated item sheet must strictly conform to the base character's frame geometry so Phaser's `PlayerAvatar` container can overlay them at `(0, 0)` without manual offset tuning:

* **Single Frame Size:** `FRAME_W` × `FRAME_H` (must match `player_base`, e.g., `16x24` or `32x32` pixels).
* **Overlay Sheet Layout:** `4 columns × 1 row` (`(FRAME_W * 4)` × `FRAME_H` total PNG size).
* **Exact Frame Order (Left to Right):**
  * **Frame 0 (`x = 0`):** Facing **South** (Front / Down)
  * **Frame 1 (`x = FRAME_W`):** Facing **West** (Left)
  * **Frame 2 (`x = FRAME_W * 2`):** Facing **East** (Right)
  * **Frame 3 (`x = FRAME_W * 3`):** Facing **North** (Back / Up)
* **Anchor Alignment:** Every item must be drawn at the exact pixel coordinates where the character's head (for hats/hair) or torso (for outerwear) sits in **Frame 0 (idle pose)** of each direction row on `character_base_map.png`.

---

## 3. Shader Color-Key Rules for Generated Overlays

To make every generated jacket, hoodie, or hairstyle infinitely recolorable at runtime in Phaser 3, agents must paint the primary fabric/hair pixels using our **Shader Palette Keys** (or post-process the generated PNG to map colors to these keys):

| Target Region | Hex Color Key | Usage Rule |
| :--- | :--- | :--- |
| **Primary Fabric / Hair** | `#ff0000` | Main body of jacket, hoodie, sweater, hat, or hairstyle. |
| **Shaded / Fold Pixels** | `#aa0000` | Under-collar shadows, hood folds, and back edges (rendered at 75% brightness by `FashionPipeline`). |
| **Dark Pixel Outline** | `#111111` | 1px crisp pixel outline matching the base character's outline color. |
| **Fixed Accent Colors** | Any non-key hex (e.g., `#ffffff`, `#ffd700`) | Used only for details that should **not** change color (e.g., gold zipper, white drawstrings, visor shine). Avoid colors within `distance < 0.05` of `#ff0000`, `#aa0000`, `#ff8800`, `#0000ff`, `#0000aa`, `#00ff00`, or `#ffff00`. |

---

## 4. PixelLab MCP Tool Workflow

When asked to generate a new fashion asset (e.g., *"generate a cyberpunk hoodie"* or *"create a wizard hat"*), execute the following pipeline:

### Step A: Prepare the Anchor Reference
* Always pass the base character's **South idle frame** (from `public/assets/character_base_map.png`) as the style/proportion anchor (`style_image` or `reference_image`) so the generated item matches the exact chibi head-to-body ratio, pixel density, and outline thickness.
* Never generate items in isolation without referencing the base character proportions.

### Step B: Generate the 4 Directional Views
Use PixelLab MCP tools (`create_image_pro_flash`, `create_character` with `n_directions=4`, or `generate_8_rotations_v3` filtered to cardinal directions) with these prompt constraints:
* **Prompt Template:**
  > `"Top-down RPG chibi pixel art [ITEM_NAME] only, isolated on transparent background, exact pixel alignment for [FRAME_W]x[FRAME_H] character template, 1px dark outline (#111111), flat shading using pure red (#ff0000) base and dark red (#aa0000) shadows, crisp pixel art, no anti-aliasing, no character skin, no legs."`
* **For Open Outerwear (Zip-Up Jackets / Cardigans):**
  > Include `"open front zipper showing a 2px vertical gap in the center"` so the player's underlying shirt color remains visible.
* **For Side Views (West & East):**
  > Ensure the torso silhouette does not include bulky sleeves sticking out horizontally, since the base character's animated `#ffff00` front arm renders dynamically on top of the outerwear layer.

### Step C: Post-Process & Pack into a 4-Frame Strip
Run a Python verification/packing script (using `Pillow` / `numpy`) before saving to `public/assets/`:
1. **Verify Dimensions:** Confirm each directional frame is strictly `FRAME_W` × `FRAME_H` using `Image.NEAREST` resampling only (never `BILINEAR` or `BICUBIC`).
2. **Quantize & Map Color Keys:** Snap primary fabric pixels to exact `#ff0000` and shadow pixels to `#aa0000` so `FashionPipeline` detects them with `distance < 0.05`.
3. **Verify Alpha Channel:** Ensure background pixels have `alpha == 0` and semi-transparent edge pixels (`0 < alpha < 255`) are rounded to `0` or `255` to prevent halo artifacts in WebGL.
4. **Assemble Strip:** Stitch `[South, West, East, North]` horizontally into a single PNG of size `(FRAME_W * 4)` × `FRAME_H`.

---

## 5. File Naming & Asset Registration Checklist

Save generated files to the standardized asset directories and register them in the Phaser preload manifest:

* **Hats & Hair:** `public/assets/hats/<item_id>.png` (e.g., `hat_wizard.png`, `hair_spiky.png`)
* **Outerwear:** `public/assets/outerwear/<item_id>.png` (e.g., `hoodie_cyber.png`, `jacket_denim.png`)

### Agent Pre-Completion Verification
Before finishing a generation task, confirm:
- [ ] File is a single PNG strip of exact dimensions `(FRAME_W * 4)` × `FRAME_H`.
- [ ] Frame order is strictly `0: South, 1: West, 2: East, 3: North`.
- [ ] Recolorable pixels use exact `#ff0000` and `#aa0000` hex codes.
- [ ] Zero semi-transparent anti-aliased pixels exist on borders.
- [ ] Asset key is added to `GameScene.preload()` and available in the Colyseus `OutfitSchema` catalog.
