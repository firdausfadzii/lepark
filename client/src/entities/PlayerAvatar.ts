import Phaser from "phaser";
import { PlayerOutfit, DEFAULT_PLAYER_OUTFIT, FashionAnimState } from "shared";
import {
  acquireBakedOutfitTexture,
  getBakedAnimKey,
  releaseBakedOutfitTexture,
} from "../fashionBaker";
import { resolveGearSheetKeys } from "../rpg/rpgGearRenderer";

export type AvatarDirection = "south" | "west" | "east" | "north";

const DIR_INDEX_MAP: Record<AvatarDirection, number> = {
  south: 0,
  west: 1,
  east: 2,
  north: 3,
};

// Feet sit at y=74 inside the 92x92 cell, so originY = 74/92 aligns feet to container y=0
const FEET_ORIGIN_Y = 74 / 92;

/**
 * Single-sprite Bake-on-Equip pixel-art avatar container (92x92 cells).
 * Composites base grayscale body + part_mask front-arm occlusion + equipped gear
 * once per outfit change into a ref-counted Phaser texture — zero PostFXPipeline
 * overhead and full WebGL sprite batching for multiplayer.
 */
export default class PlayerAvatar extends Phaser.GameObjects.Container {
  public bodySprite: Phaser.GameObjects.Sprite;

  private currentDirection: AvatarDirection = "south";
  private currentIsMoving = false;
  private isPlayingMelee = false;
  private currentOutfit: PlayerOutfit;
  private currentGearSig = "";
  private showRpgGear = false;

  private bakedTextures: Record<FashionAnimState, string | null> = {
    idle: null,
    walking: null,
    melee_swing: null,
  };
  private bakeGeneration = 0;
  private destroyedFlag = false;

  constructor(scene: Phaser.Scene, x: number, y: number, outfit?: Partial<PlayerOutfit>) {
    super(scene, x, y);

    this.currentOutfit = { ...DEFAULT_PLAYER_OUTFIT, ...outfit };

    this.bodySprite = scene.add.sprite(0, 0, "empty_pixel", 0);
    this.bodySprite.setOrigin(0.5, FEET_ORIGIN_Y);
    this.add(this.bodySprite);

    this.updateOutfit(this.currentOutfit);
  }

  private resolveEffectiveOutfit(): PlayerOutfit {
    if (!this.showRpgGear || !this.currentGearSig) {
      return this.currentOutfit;
    }
    const keys = resolveGearSheetKeys(this.currentGearSig);
    const merged: PlayerOutfit = { ...this.currentOutfit };
    if (keys.armorKey && !merged.chestKey && !merged.outerwearKey) {
      merged.chestKey = "leather_cloth";
    }
    return merged;
  }

  public setRpgGear(gearSignature: string, visible: boolean): void {
    const nextSig = gearSignature || "";
    const nextVisible = Boolean(visible && nextSig);
    if (this.currentGearSig === nextSig && this.showRpgGear === nextVisible) {
      return;
    }
    this.currentGearSig = nextSig;
    this.showRpgGear = nextVisible;
    this.rebakeAllAnims();
  }

  public updateOutfit(outfit: Partial<PlayerOutfit>): void {
    this.currentOutfit = { ...this.currentOutfit, ...outfit };
    this.rebakeAllAnims();
  }

  private rebakeAllAnims(): void {
    const gen = ++this.bakeGeneration;
    const effectiveOutfit = this.resolveEffectiveOutfit();
    const anims: FashionAnimState[] = ["idle", "walking", "melee_swing"];

    Promise.all(
      anims.map((anim) => acquireBakedOutfitTexture(this.scene, effectiveOutfit, anim))
    )
      .then(([idleKey, walkKey, meleeKey]) => {
        // If superseded by a newer outfit change or destroyed mid-bake, release immediately
        if (this.destroyedFlag || gen !== this.bakeGeneration || !this.scene?.sys?.isActive()) {
          releaseBakedOutfitTexture(this.scene, idleKey);
          releaseBakedOutfitTexture(this.scene, walkKey);
          releaseBakedOutfitTexture(this.scene, meleeKey);
          return;
        }

        const prev = { ...this.bakedTextures };
        this.bakedTextures.idle = idleKey;
        this.bakedTextures.walking = walkKey;
        this.bakedTextures.melee_swing = meleeKey;

        // Release previous textures after acquiring new ones (prevents flicker on identical keys)
        releaseBakedOutfitTexture(this.scene, prev.idle);
        releaseBakedOutfitTexture(this.scene, prev.walking);
        releaseBakedOutfitTexture(this.scene, prev.melee_swing);

        if (!this.isPlayingMelee) {
          this.applyActiveAnimation(true);
        }
      })
      .catch((err) => {
        console.warn("[PlayerAvatar] Failed to bake outfit textures:", err);
      });
  }

  private applyActiveAnimation(forceRestart: boolean): void {
    const animState: FashionAnimState = this.currentIsMoving ? "walking" : "idle";
    const texKey = this.bakedTextures[animState];
    if (!texKey || !this.scene?.textures?.exists(texKey)) {
      return;
    }

    const animKey = getBakedAnimKey(texKey, this.currentDirection);
    if (this.scene.anims.exists(animKey)) {
      if (forceRestart || this.bodySprite.anims.currentAnim?.key !== animKey || !this.bodySprite.anims.isPlaying) {
        this.bodySprite.setTexture(texKey);
        this.bodySprite.anims.play(animKey, true);
      }
    } else {
      const dirIndex = DIR_INDEX_MAP[this.currentDirection] ?? 0;
      const cols = animState === "walking" ? 6 : 4;
      this.bodySprite.anims.stop();
      this.bodySprite.setTexture(texKey, dirIndex * cols);
    }
  }

  public playDirection(direction: AvatarDirection, isMoving: boolean): void {
    const changed = direction !== this.currentDirection || isMoving !== this.currentIsMoving;
    this.currentDirection = direction;
    this.currentIsMoving = isMoving;

    if (this.isPlayingMelee) return;
    this.applyActiveAnimation(changed);
  }

  public playMeleeSwing(direction?: AvatarDirection, onComplete?: () => void): void {
    if (direction) {
      this.currentDirection = direction;
    }
    const texKey = this.bakedTextures.melee_swing;
    if (!texKey || !this.scene?.textures?.exists(texKey)) {
      onComplete?.();
      return;
    }

    const animKey = getBakedAnimKey(texKey, this.currentDirection);
    if (!this.scene.anims.exists(animKey)) {
      onComplete?.();
      return;
    }

    this.isPlayingMelee = true;
    this.bodySprite.setTexture(texKey);
    this.bodySprite.anims.play(animKey, false);
    this.bodySprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.isPlayingMelee = false;
      if (!this.destroyedFlag) {
        this.applyActiveAnimation(true);
      }
      onComplete?.();
    });
  }

  public override destroy(fromScene?: boolean): void {
    if (!this.destroyedFlag) {
      this.destroyedFlag = true;
      this.bakeGeneration++;
      if (this.scene) {
        releaseBakedOutfitTexture(this.scene, this.bakedTextures.idle);
        releaseBakedOutfitTexture(this.scene, this.bakedTextures.walking);
        releaseBakedOutfitTexture(this.scene, this.bakedTextures.melee_swing);
      }
      this.bakedTextures.idle = null;
      this.bakedTextures.walking = null;
      this.bakedTextures.melee_swing = null;
    }
    super.destroy(fromScene);
  }
}
