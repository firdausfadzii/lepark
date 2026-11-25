import Phaser from "phaser";
import { PlayerOutfit, DEFAULT_PLAYER_OUTFIT, OUTERWEAR_CATALOG } from "shared";
import FashionPipeline from "../pipelines/FashionPipeline";
import FrontArmPipeline from "../pipelines/FrontArmPipeline";
import { resolveGearSheetKeys } from "../rpg/rpgGearRenderer";

export type AvatarDirection = "south" | "west" | "east" | "north";

const DIR_INDEX_MAP: Record<AvatarDirection, number> = {
  south: 0,
  west: 1,
  east: 2,
  north: 3,
};

function resolvePipeline<T>(
  sprite: Phaser.GameObjects.Sprite,
  name: string
): T | null {
  const res = sprite.getPostPipeline(name);
  if (Array.isArray(res)) {
    return (res[0] as unknown as T) || null;
  }
  return (res as unknown as T) || null;
}

/**
 * 4-layer modular pixel-art avatar container:
 *   0: bodySprite (32x32 animated Color-ID base sheet + FashionPipeline)
 *   1: outerwearSprite (4-frame static strip + FashionPipeline)
 *   2: frontArmSprite (reuses base sheet + FrontArmPipeline to sort hand/forearm above outerwear)
 *   3: hatSprite (4-frame static strip + FashionPipeline, synced to head bob)
 */
export default class PlayerAvatar extends Phaser.GameObjects.Container {
  public bodySprite: Phaser.GameObjects.Sprite;
  public outerwearSprite: Phaser.GameObjects.Sprite;
  public frontArmSprite: Phaser.GameObjects.Sprite;
  public hatSprite: Phaser.GameObjects.Sprite;
  public rpgAccessorySprite: Phaser.GameObjects.Sprite;
  public rpgArmorSprite: Phaser.GameObjects.Sprite;
  public rpgEmblemSprite: Phaser.GameObjects.Sprite;
  public rpgWeaponSprite: Phaser.GameObjects.Sprite;

  private bodyShader: FashionPipeline | null = null;
  private outerwearShader: FashionPipeline | null = null;
  private frontArmShader: FrontArmPipeline | null = null;
  private hatShader: FashionPipeline | null = null;

  private currentDirection: AvatarDirection = "south";
  private currentIsMoving = false;
  private currentOutfit: PlayerOutfit;
  private currentGearSig = "";
  private showRpgGear = false;

  constructor(scene: Phaser.Scene, x: number, y: number, outfit?: Partial<PlayerOutfit>) {
    super(scene, x, y);

    this.currentOutfit = { ...DEFAULT_PLAYER_OUTFIT, ...outfit };
    const isWebGL = scene.renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer;

    // Layer 0: Base Body Sprite
    this.bodySprite = scene.add.sprite(0, 0, "player_base", 0);
    this.bodySprite.setOrigin(0.5, 1.0);
    if (isWebGL) {
      this.bodySprite.setPostPipeline("FashionPipeline");
      this.bodyShader = resolvePipeline<FashionPipeline>(this.bodySprite, "FashionPipeline");
    }

    // Layer 1: Outerwear Overlay (4 static frames: S, W, E, N)
    const initialOuterwearKey =
      this.currentOutfit.outerwearKey && scene.textures.exists(this.currentOutfit.outerwearKey)
        ? this.currentOutfit.outerwearKey
        : "empty_pixel";
    this.outerwearSprite = scene.add.sprite(0, 0, initialOuterwearKey, 0);
    this.outerwearSprite.setOrigin(0.5, 1.0);
    if (isWebGL) {
      this.outerwearSprite.setPostPipeline("FashionPipeline");
      this.outerwearShader = resolvePipeline<FashionPipeline>(this.outerwearSprite, "FashionPipeline");
    }
    this.outerwearSprite.setVisible(
      Boolean(this.currentOutfit.outerwearKey && scene.textures.exists(this.currentOutfit.outerwearKey))
    );

    // Layer 2: Front Swinging Arm Clone (renders ON TOP of outerwear)
    this.frontArmSprite = scene.add.sprite(0, 0, "player_base", 0);
    this.frontArmSprite.setOrigin(0.5, 1.0);
    if (isWebGL) {
      this.frontArmSprite.setPostPipeline("FrontArmPipeline");
      this.frontArmShader = resolvePipeline<FrontArmPipeline>(this.frontArmSprite, "FrontArmPipeline");
    }
    this.frontArmSprite.setVisible(this.outerwearSprite.visible);

    // Layer 3: Hat / Hair Overlay (4 static frames: S, W, E, N)
    const initialHatKey =
      this.currentOutfit.hatKey && scene.textures.exists(this.currentOutfit.hatKey)
        ? this.currentOutfit.hatKey
        : "empty_pixel";
    this.hatSprite = scene.add.sprite(0, 0, initialHatKey, 0);
    this.hatSprite.setOrigin(0.5, 1.0);
    if (isWebGL) {
      this.hatSprite.setPostPipeline("FashionPipeline");
      this.hatShader = resolvePipeline<FashionPipeline>(this.hatSprite, "FashionPipeline");
    }
    this.hatSprite.setVisible(
      Boolean(this.currentOutfit.hatKey && scene.textures.exists(this.currentOutfit.hatKey))
    );

    // Animated 4x8 RPG Gear layers (strictly default character only, synced 1-to-1 to bodySprite frames 0..31)
    this.rpgAccessorySprite = scene.add.sprite(0, 0, "empty_pixel", 0).setOrigin(0.5, 1.0).setVisible(false);
    this.rpgArmorSprite = scene.add.sprite(0, 0, "empty_pixel", 0).setOrigin(0.5, 1.0).setVisible(false);
    this.rpgEmblemSprite = scene.add.sprite(0, 0, "empty_pixel", 0).setOrigin(0.5, 1.0).setVisible(false);
    this.rpgWeaponSprite = scene.add.sprite(0, 0, "empty_pixel", 0).setOrigin(0.5, 1.0).setVisible(false);

    this.add([
      this.bodySprite,
      this.outerwearSprite,
      this.rpgAccessorySprite,
      this.rpgArmorSprite,
      this.frontArmSprite,
      this.hatSprite,
      this.rpgEmblemSprite,
      this.rpgWeaponSprite,
    ]);

    this.updateOutfit(this.currentOutfit);

    // Sync static overlay bobbing & keep frontArmSprite + animated RPG gear sprites frame-locked to bodySprite
    this.bodySprite.on(
      "animationupdate",
      (anim: Phaser.Animations.Animation, frame: Phaser.Animations.AnimationFrame) => {
        const tf = Number(frame.textureFrame);
        if (this.frontArmSprite.visible) {
          this.frontArmSprite.setFrame(frame.textureFrame);
        }
        this.syncRpgGearFrame(tf);
        this.syncBobForFrame(anim.key.startsWith("walk_"), frame.index);
      }
    );
  }

  private syncRpgGearFrame(textureFrame: number): void {
    const safeFrame = Number.isFinite(textureFrame) ? textureFrame : 0;
    if (this.rpgAccessorySprite.visible) this.rpgAccessorySprite.setFrame(safeFrame);
    if (this.rpgArmorSprite.visible) this.rpgArmorSprite.setFrame(safeFrame);
    if (this.rpgEmblemSprite.visible) this.rpgEmblemSprite.setFrame(safeFrame);
    if (this.rpgWeaponSprite.visible) this.rpgWeaponSprite.setFrame(safeFrame);
  }

  public setRpgGear(gearSignature: string, visible: boolean): void {
    this.currentGearSig = gearSignature || "";
    this.showRpgGear = Boolean(visible && this.currentGearSig);

    const applyLayer = (spr: Phaser.GameObjects.Sprite, key: string | null) => {
      if (this.showRpgGear && key && this.scene.textures.exists(key)) {
        spr.setTexture(key, this.getCurrentBodyTextureFrame());
        spr.setVisible(true);
      } else {
        spr.setVisible(false);
      }
    };

    const keys = resolveGearSheetKeys(this.currentGearSig);
    applyLayer(this.rpgAccessorySprite, keys.accessoryKey);
    applyLayer(this.rpgArmorSprite, keys.armorKey);
    applyLayer(this.rpgEmblemSprite, keys.emblemKey);
    applyLayer(this.rpgWeaponSprite, keys.weaponKey);
  }

  private getCurrentBodyTextureFrame(): number {
    if (this.bodySprite.anims.isPlaying && this.bodySprite.anims.currentFrame) {
      return Number(this.bodySprite.anims.currentFrame.textureFrame) || 0;
    }
    const n = Number(this.bodySprite.frame?.name);
    return Number.isFinite(n) ? n : 0;
  }

  private syncBobForFrame(isWalk: boolean, oneBasedFrameIndex: number): void {
    let torsoBob = 0;
    let headBob = 0;
    if (isWalk) {
      if (oneBasedFrameIndex === 2 || oneBasedFrameIndex === 4) {
        torsoBob = -1;
        headBob = -1;
      }
    } else {
      if (oneBasedFrameIndex === 2) {
        torsoBob = 1;
        headBob = 1;
      } else if (oneBasedFrameIndex === 3) {
        torsoBob = 1;
        headBob = 2;
      }
    }
    this.outerwearSprite.y = torsoBob;
    this.hatSprite.y = headBob;
  }

  public updateOutfit(outfit: Partial<PlayerOutfit>): void {
    this.currentOutfit = { ...this.currentOutfit, ...outfit };

    const {
      shirtStyle = DEFAULT_PLAYER_OUTFIT.shirtStyle,
      shirtColor = DEFAULT_PLAYER_OUTFIT.shirtColor,
      sleeveColor = "",
      pantsColor = DEFAULT_PLAYER_OUTFIT.pantsColor,
      skinColor = DEFAULT_PLAYER_OUTFIT.skinColor,
      outerwearKey = "",
      outerwearColor = DEFAULT_PLAYER_OUTFIT.outerwearColor,
      hatKey = "",
    } = this.currentOutfit;

    const hasOuterwear = Boolean(outerwearKey && this.scene.textures.exists(outerwearKey));
    const catalogItem = hasOuterwear
      ? OUTERWEAR_CATALOG.find((item) => item.id === outerwearKey)
      : undefined;
    const isShortSleeveOuterwear = !catalogItem || catalogItem.sleeveType === "short";

    let baseUpperSleeveHex = skinColor;
    let baseForearmHex = skinColor;
    if (shirtStyle === "short_sleeve") {
      baseUpperSleeveHex = shirtColor;
    } else if (shirtStyle === "long_sleeve") {
      baseUpperSleeveHex = shirtColor;
      baseForearmHex = shirtColor;
    } else if (sleeveColor) {
      baseUpperSleeveHex = sleeveColor;
      baseForearmHex = sleeveColor;
    }

    const resolvedSleeve = hasOuterwear ? outerwearColor : baseUpperSleeveHex;
    const resolvedForearm = hasOuterwear
      ? isShortSleeveOuterwear
        ? baseForearmHex
        : outerwearColor
      : baseForearmHex;
    const resolvedFrontHand = skinColor;

    this.bodyShader?.setOutfit({
      shirtHex: shirtColor,
      sleeveHex: resolvedSleeve,
      forearmHex: resolvedForearm,
      pantsHex: pantsColor,
      skinHex: skinColor,
      frontArmHex: resolvedFrontHand,
    });

    if (hasOuterwear) {
      const dirIndex = DIR_INDEX_MAP[this.currentDirection] ?? 0;
      this.outerwearSprite.setTexture(outerwearKey, dirIndex);
      this.outerwearSprite.setVisible(true);
      this.outerwearShader?.setOutfit({
        shirtHex: outerwearColor,
        sleeveHex: outerwearColor,
        forearmHex: resolvedForearm,
        pantsHex: pantsColor,
        skinHex: skinColor,
        frontArmHex: resolvedFrontHand,
      });

      this.frontArmSprite.setVisible(true);
      this.frontArmShader?.setArmColors(resolvedFrontHand, resolvedForearm);
      if (this.bodySprite.anims.isPlaying && this.bodySprite.anims.currentFrame) {
        this.frontArmSprite.setFrame(this.bodySprite.anims.currentFrame.textureFrame);
      } else {
        this.frontArmSprite.setFrame(this.bodySprite.frame.name);
      }
    } else {
      this.outerwearSprite.setVisible(false);
      this.frontArmSprite.setVisible(false);
    }

    if (hatKey && this.scene.textures.exists(hatKey)) {
      const dirIndex = DIR_INDEX_MAP[this.currentDirection] ?? 0;
      this.hatSprite.setTexture(hatKey, dirIndex);
      this.hatSprite.setVisible(true);
      this.hatShader?.setOutfit({
        shirtHex: outerwearColor,
        sleeveHex: outerwearColor,
        forearmHex: outerwearColor,
        pantsHex: pantsColor,
        skinHex: skinColor,
      });
    } else {
      this.hatSprite.setVisible(false);
    }
  }

  public playDirection(direction: AvatarDirection, isMoving: boolean): void {
    const dirIndex = DIR_INDEX_MAP[direction] ?? 0;
    const changed = direction !== this.currentDirection || isMoving !== this.currentIsMoving;
    this.currentDirection = direction;
    this.currentIsMoving = isMoving;

    if (this.outerwearSprite.visible) {
      this.outerwearSprite.setFrame(dirIndex);
    }
    if (this.hatSprite.visible) {
      this.hatSprite.setFrame(dirIndex);
    }

    const animKey = `${isMoving ? "walk" : "idle"}_${direction}`;
    if (this.scene.anims.exists(animKey)) {
      if (changed || !this.bodySprite.anims.isPlaying) {
        this.bodySprite.anims.play(animKey, true);
        const curFrame = this.bodySprite.anims.currentFrame;
        if (curFrame) {
          if (this.frontArmSprite.visible) {
            this.frontArmSprite.setFrame(curFrame.textureFrame);
          }
          this.syncRpgGearFrame(Number(curFrame.textureFrame));
          this.syncBobForFrame(isMoving, curFrame.index);
        }
      }
    } else {
      this.bodySprite.anims.stop();
      const idleFrame = dirIndex * 4;
      this.bodySprite.setFrame(idleFrame);
      if (this.frontArmSprite.visible) {
        this.frontArmSprite.setFrame(idleFrame);
      }
      this.syncRpgGearFrame(idleFrame);
      this.outerwearSprite.y = 0;
      this.hatSprite.y = 0;
    }
  }
}
