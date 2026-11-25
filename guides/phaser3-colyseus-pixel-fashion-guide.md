# Top-Down 4-Directional Pixel Art Fashion System (Phaser 3 + Colyseus)

A complete, end-to-end architecture and implementation guide for building a scalable character customization and fashion system for a 4-directional top-down pixel art game using **Phaser 3**, **Colyseus**, and a **single base PNG spritesheet**—supporting **base outfits**, **oversized outerwear (hoodies, jackets, sweaters)**, **front-arm Z-index sorting**, and **hats/hairstyles**.

---

## Table of Contents
1. [Architecture Overview & Layer Stack](#1-architecture-overview--layer-stack)
2. [Step 1: Prepare Your Color-ID Base Spritesheet](#2-step-1-prepare-your-color-id-base-spritesheet)
3. [Step 2: Create 4-Frame Static Overlays (Outerwear, Hats & Hair)](#3-step-2-create-4-frame-static-overlays-outerwear-hats--hair)
4. [Step 3: Implement the Shaders (`FashionPipeline.js` & `FrontArmPipeline.js`)](#4-step-3-implement-the-shaders-fashionpipelinejs--frontarmpipelinejs)
5. [Step 4: Build the `PlayerAvatar` Container with Hand-Sorting & Bob Sync](#5-step-4-build-the-playeravatar-container-with-hand-sorting--bob-sync)
6. [Step 5: Sync Player Fashion State via Colyseus](#6-step-5-sync-player-fashion-state-via-colyseus)
7. [Step 6: Verify Game Config & Pixel Crispness](#7-step-6-verify-game-config--pixel-crispness)

---

## 1. Architecture Overview & Layer Stack

Instead of animating 20 frames for every single shirt, hoodie, pair of pants, and hairstyle, this system combines **Shader Palette Swapping**, **4-Frame Static Overlays**, and a **Front-Arm Pass Clone** so swinging hands naturally render *in front of* oversized hoodies on side views without extra animation work.

### Visual Render Order (Bottom to Top inside `PlayerAvatar`)
| Layer Index | Sprite / Layer | Frames Needed | Purpose |
| :--- | :--- | :--- | :--- |
| **0 (Bottom)** | `bodySprite` (`player_base`) | **20 frames** (Done once) | Renders base body, pants, base shirt, long/short sleeves, and skin via `FashionPipeline`. |
| **1** | `outerwearSprite` (`jacket_01`) | **4 static frames** (S, W, E, N) | Renders bulky jackets, hoodies, sweaters, or coats that extend beyond the base silhouette. |
| **2** | `frontArmSprite` (`player_base`) | **0 extra frames** (Reuses `player_base`) | Plays the exact same animation as `bodySprite`, but `FrontArmPipeline` hides everything *except* the swinging front arm so it renders **over** the hoodie! |
| **3 (Top)** | `hatSprite` (`hat_01`) | **4 static frames** (S, W, E, N) | Renders hats, hair, or glasses on top of everything, bobbing `1px` with the walk cycle. |

---

## 2. Step 1: Prepare Your Color-ID Base Spritesheet

Open your downloaded PNG spritesheet in **LibreSprite** or **Piskel** with anti-aliasing/smoothing turned **OFF**.

### 2.1 Grid Setup
* Set your frame grid (`frameWidth` × `frameHeight`, e.g., `16x24` or `32x32`—note that ErisEsra-style 4-direction sheets commonly use 4 columns × 5 rows, where Row 0 = South, Row 1 = West, Row 2 = East, Row 3 = North, and Row 4 = Idle/Extra).
* Duplicate your base layer so you keep the original unmodified PNG as backup.

### 2.2 Paint the 7 Exact Color Keys
Fill the body regions across all frames using these exact flat hex colors:

| Body Region | Exact Hex Color | RGB Float | Runtime Shader Behavior |
| :--- | :--- | :--- | :--- |
| **Shirt Base** | `#ff0000` | `(1.0, 0.0, 0.0)` | Replaced with `shirtColor`. |
| **Shirt Shadow** | `#aa0000` | `(0.667, 0.0, 0.0)` | Replaced with `shirtColor * 0.75`. |
| **Upper Sleeves** | `#ff8800` | `(1.0, 0.533, 0.0)` | Replaced with `sleeveColor` (set to `skinColor` for T-shirts, `shirtColor` for long-sleeves, or `jacketColor` when wearing outerwear!). |
| **Pants Base** | `#0000ff` | `(0.0, 0.0, 1.0)` | Replaced with `pantsColor`. |
| **Pants Shadow** | `#0000aa` | `(0.0, 0.0, 0.667)` | Replaced with `pantsColor * 0.75`. |
| **Skin (Face & Back Hand)** | `#00ff00` | `(0.0, 1.0, 0.0)` | Replaced with `skinColor`. |
| **Front Swinging Arm/Hand** | `#ffff00` | `(1.0, 1.0, 0.0)` | Colored with `sleeveColor`/`skinColor` on `bodySprite`, AND isolated by `FrontArmPipeline` to render **on top** of oversized outerwear! |
| **Outlines & Eyes** | `#111111` (Original) | Untouched | Preserved as dark pixel outlines. |

> **Important Note on `#ffff00` (Front Swinging Arm):** Paint the front-facing swinging arm/hand (especially in West and East walk rows) with `#ffff00`, including its 1px dark outline around the hand if you want the outline to cleanly overlap the hoodie torso.

Export as `public/assets/character_base_map.png`.

---

## 3. Step 2: Create 4-Frame Static Overlays (Outerwear, Hats & Hair)

Because the character's torso and head do not rotate within a walk row (they only bob down `1px`), bulky items only require **4 static frames total** (1 per direction):

* **Frame 0:** South (Down)
* **Frame 1:** West (Left)
* **Frame 2:** East (Right)
* **Frame 3:** North (Up)

### 3.1 Oversized Outerwear (`public/assets/outerwear/hoodie_01.png`)
* Draw the bulky hoodie torso, hood collar, and hem aligned over the first frame of each direction row.
* Paint the jacket fabric with `#ff0000` (Base) and `#aa0000` (Shadow) so the shader can recolor any hoodie into unlimited color variations!
* If it is an **open zip-up jacket**, leave a 2–3px vertical gap down the center so the player's underlying `shirtColor` shows through.

### 3.2 Hats & Hairstyles (`public/assets/hats/hat_01.png`)
* Draw aligned to the character's head in each of the 4 directions.
* Optionally use `#ff0000` / `#aa0000` color keys if you want hair dye or recolorable hats.

---

## 4. Step 3: Implement the Shaders (`FashionPipeline.js` & `FrontArmPipeline.js`)

### 4.1 Main Body & Clothing Shader (`src/pipelines/FashionPipeline.js`)

```javascript
export default class FashionPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
    constructor(game) {
        super({
            game,
            name: 'FashionPipeline',
            fragShader: `
                precision mediump float;
                uniform sampler2D uMainSampler;
                varying vec2 outTexCoord;

                uniform vec3 uShirtColor;
                uniform vec3 uSleeveColor;
                uniform vec3 uPantsColor;
                uniform vec3 uSkinColor;
                uniform vec3 uFrontArmColor;

                bool isColor(vec3 pixel, vec3 target) {
                    return distance(pixel, target) < 0.05;
                }

                void main() {
                    vec4 texColor = texture2D(uMainSampler, outTexCoord);

                    if (texColor.a < 0.1) {
                        gl_FragColor = texColor;
                        return;
                    }

                    vec3 rgb = texColor.rgb;

                    if (isColor(rgb, vec3(1.0, 0.0, 0.0))) {
                        // #FF0000 -> Shirt / Outerwear Base
                        rgb = uShirtColor;
                    } else if (isColor(rgb, vec3(0.667, 0.0, 0.0))) {
                        // #AA0000 -> Shirt / Outerwear Shadow
                        rgb = uShirtColor * 0.75;
                    } else if (isColor(rgb, vec3(1.0, 0.533, 0.0))) {
                        // #FF8800 -> Upper Sleeves
                        rgb = uSleeveColor;
                    } else if (isColor(rgb, vec3(0.0, 0.0, 1.0))) {
                        // #0000FF -> Pants Base
                        rgb = uPantsColor;
                    } else if (isColor(rgb, vec3(0.0, 0.0, 0.667))) {
                        // #0000AA -> Pants Shadow
                        rgb = uPantsColor * 0.75;
                    } else if (isColor(rgb, vec3(0.0, 1.0, 0.0))) {
                        // #00FF00 -> Skin Base
                        rgb = uSkinColor;
                    } else if (isColor(rgb, vec3(1.0, 1.0, 0.0))) {
                        // #FFFF00 -> Front Swinging Arm
                        rgb = uFrontArmColor;
                    }

                    gl_FragColor = vec4(rgb, texColor.a);
                }
            `
        });

        this._shirt    = [0.2, 0.6, 0.86];
        this._sleeve   = [0.96, 0.8, 0.65];
        this._pants    = [0.2, 0.25, 0.3];
        this._skin     = [0.96, 0.8, 0.65];
        this._frontArm = [0.96, 0.8, 0.65];
    }

    onPreRender() {
        this.set3f('uShirtColor',    this._shirt[0],    this._shirt[1],    this._shirt[2]);
        this.set3f('uSleeveColor',   this._sleeve[0],   this._sleeve[1],   this._sleeve[2]);
        this.set3f('uPantsColor',    this._pants[0],    this._pants[1],    this._pants[2]);
        this.set3f('uSkinColor',     this._skin[0],     this._skin[1],     this._skin[2]);
        this.set3f('uFrontArmColor', this._frontArm[0], this._frontArm[1], this._frontArm[2]);
    }

    setOutfit({ shirtHex, sleeveHex, pantsHex, skinHex, frontArmHex }) {
        this._shirt    = this.hexToRgbArray(shirtHex);
        this._sleeve   = this.hexToRgbArray(sleeveHex || skinHex);
        this._pants    = this.hexToRgbArray(pantsHex);
        this._skin     = this.hexToRgbArray(skinHex);
        this._frontArm = this.hexToRgbArray(frontArmHex || sleeveHex || skinHex);
    }

    hexToRgbArray(hex) {
        const c = Phaser.Display.Color.HexStringToColor(hex);
        return [c.redGL, c.greenGL, c.blueGL];
    }
}
```

### 4.2 Front-Arm Pass Shader (`src/pipelines/FrontArmPipeline.js`)
This lightweight shader runs on a cloned sprite above the hoodie overlay. It discards all pixels *except* `#ffff00` so the swinging hand cleanly overlaps oversized jackets.

```javascript
export default class FrontArmPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
    constructor(game) {
        super({
            game,
            name: 'FrontArmPipeline',
            fragShader: `
                precision mediump float;
                uniform sampler2D uMainSampler;
                varying vec2 outTexCoord;

                uniform vec3 uArmColor;

                void main() {
                    vec4 texColor = texture2D(uMainSampler, outTexCoord);

                    // Only render #FFFF00 front-arm pixels; discard everything else
                    if (texColor.a > 0.1 && distance(texColor.rgb, vec3(1.0, 1.0, 0.0)) < 0.05) {
                        gl_FragColor = vec4(uArmColor, texColor.a);
                    } else {
                        gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
                    }
                }
            `
        });

        this._armColor = [0.96, 0.8, 0.65];
    }

    onPreRender() {
        this.set3f('uArmColor', this._armColor[0], this._armColor[1], this._armColor[2]);
    }

    setArmColor(hex) {
        const c = Phaser.Display.Color.HexStringToColor(hex);
        this._armColor = [c.redGL, c.greenGL, c.blueGL];
    }
}
```

---

## 5. Step 4: Build the `PlayerAvatar` Container with Hand-Sorting & Bob Sync

Create `src/entities/PlayerAvatar.js` to assemble all 4 layers and keep animations, directions, and 1px bobbing locked together:

```javascript
export default class PlayerAvatar extends Phaser.GameObjects.Container {
    constructor(scene, x, y, outfit) {
        super(scene, x, y);
        scene.add.existing(this);

        // Layer 0: Base Body Sprite
        this.bodySprite = scene.add.sprite(0, 0, 'player_base');
        this.bodySprite.setPostPipeline('FashionPipeline');
        this.bodyShader = this.bodySprite.getPostPipeline('FashionPipeline');

        // Layer 1: Oversized Outerwear Overlay (4 static frames)
        this.outerwearSprite = scene.add.sprite(0, 0, outfit.outerwearKey || 'hoodie_01', 0);
        this.outerwearSprite.setPostPipeline('FashionPipeline');
        this.outerwearShader = this.outerwearSprite.getPostPipeline('FashionPipeline');
        this.outerwearSprite.setVisible(Boolean(outfit.outerwearKey));

        // Layer 2: Front Swinging Arm Clone (renders ON TOP of outerwear)
        this.frontArmSprite = scene.add.sprite(0, 0, 'player_base');
        this.frontArmSprite.setPostPipeline('FrontArmPipeline');
        this.frontArmShader = this.frontArmSprite.getPostPipeline('FrontArmPipeline');
        this.frontArmSprite.setVisible(Boolean(outfit.outerwearKey));

        // Layer 3: Hat / Hair Overlay (4 static frames)
        this.hatSprite = scene.add.sprite(0, 0, outfit.hatKey || 'hat_01', 0);
        this.hatSprite.setVisible(Boolean(outfit.hatKey));

        this.add([
            this.bodySprite,
            this.outerwearSprite,
            this.frontArmSprite,
            this.hatSprite
        ]);

        this.updateOutfit(outfit);

        // Sync static overlay 1px bobbing with body animation frames
        this.bodySprite.on('animationupdate', (anim, frame) => {
            const bobFrames = [2, 4]; // Frame indices where head/torso drop 1px
            const bobOffset = bobFrames.includes(frame.index) ? 1 : 0;
            this.outerwearSprite.y = bobOffset;
            this.hatSprite.y = bobOffset;
        });
    }

    updateOutfit(outfit) {
        const {
            shirtColor = '#3498db',
            sleeveColor,
            pantsColor = '#2c3e50',
            skinColor = '#f5cba7',
            outerwearKey = '',
            outerwearColor = '#e74c3c',
            hatKey = ''
        } = outfit;

        const hasOuterwear = Boolean(outerwearKey);
        const resolvedSleeve = hasOuterwear ? outerwearColor : (sleeveColor || skinColor);

        // 1. Update base body colors
        this.bodyShader.setOutfit({
            shirtHex: shirtColor,
            sleeveHex: resolvedSleeve,
            pantsHex: pantsColor,
            skinHex: skinColor,
            frontArmHex: resolvedSleeve
        });

        // 2. Update oversized outerwear & front-arm pass visibility
        if (hasOuterwear) {
            this.outerwearSprite.setTexture(outerwearKey);
            this.outerwearSprite.setVisible(true);
            this.outerwearShader.setOutfit({
                shirtHex: outerwearColor,
                sleeveHex: outerwearColor,
                pantsHex: pantsColor,
                skinHex: skinColor
            });

            this.frontArmSprite.setVisible(true);
            this.frontArmShader.setArmColor(resolvedSleeve);
        } else {
            this.outerwearSprite.setVisible(false);
            this.frontArmSprite.setVisible(false);
        }

        // 3. Update hat / hair
        if (hatKey) {
            this.hatSprite.setTexture(hatKey);
            this.hatSprite.setVisible(true);
        } else {
            this.hatSprite.setVisible(false);
        }
    }

    playDirection(direction, isMoving) {
        const dirMap = { south: 0, west: 1, east: 2, north: 3 };
        const dirIndex = dirMap[direction] ?? 0;

        // Update 4-frame static overlays
        this.outerwearSprite.setFrame(dirIndex);
        this.hatSprite.setFrame(dirIndex);

        if (isMoving) {
            const animKey = `walk_${direction}`;
            this.bodySprite.anims.play(animKey, true);
            this.frontArmSprite.anims.play(animKey, true);
        } else {
            this.bodySprite.anims.stop();
            this.frontArmSprite.anims.stop();

            const idleFrame = dirIndex * 4;
            this.bodySprite.setFrame(idleFrame);
            this.frontArmSprite.setFrame(idleFrame);

            this.outerwearSprite.y = 0;
            this.hatSprite.y = 0;
        }
    }
}
```

---

## 5. Step 5: Sync Player Fashion State via Colyseus

### 5.1 Server Schema (`GameState.ts`)
```typescript
import { Schema, MapSchema, type } from "@colyseus/schema";

export class OutfitSchema extends Schema {
    @type("string") shirtColor: string = "#3498db";
    @type("string") sleeveColor: string = ""; // Empty = bare skin (T-shirt)
    @type("string") pantsColor: string = "#2c3e50";
    @type("string") skinColor: string = "#f5cba7";
    @type("string") outerwearKey: string = ""; // e.g. "hoodie_01" or ""
    @type("string") outerwearColor: string = "#e74c3c";
    @type("string") hatKey: string = "hat_01";
}

export class Player extends Schema {
    @type("number") x: number = 100;
    @type("number") y: number = 100;
    @type("string") direction: string = "south";
    @type("boolean") isMoving: boolean = false;
    @type(OutfitSchema) outfit: OutfitSchema = new OutfitSchema();
}

export class GameState extends Schema {
    @type({ map: Player }) players = new MapSchema<Player>();
}
```

### 5.2 Server Message Handler (`GameRoom.ts`)
```typescript
this.onMessage("change_outfit", (client, data) => {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    Object.assign(player.outfit, data);
});
```

### 5.3 Client Listener (`GameScene.js`)
```javascript
// Register both pipelines once in create()
this.renderer.pipelines.addPostPipeline('FashionPipeline', FashionPipeline);
this.renderer.pipelines.addPostPipeline('FrontArmPipeline', FrontArmPipeline);

room.state.players.onAdd((player, sessionId) => {
    const avatar = new PlayerAvatar(this, player.x, player.y, player.outfit.toJSON());
    this.playerAvatars.set(sessionId, avatar);

    player.outfit.onChange(() => {
        avatar.updateOutfit(player.outfit.toJSON());
    });

    player.onChange(() => {
        avatar.setPosition(player.x, player.y);
        avatar.playDirection(player.direction, player.isMoving);
    });
});
```

---

## 6. Step 6: Verify Game Config & Pixel Crispness

```javascript
const config = {
    type: Phaser.WEBGL,      // Required for PostFXPipeline shaders
    pixelArt: true,          // Disables texture smoothing / anti-aliasing
    roundPixels: true,       // Prevents sub-pixel jitter
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 320,
        height: 180
    },
    scene: [GameScene]
};

new Phaser.Game(config);
```
