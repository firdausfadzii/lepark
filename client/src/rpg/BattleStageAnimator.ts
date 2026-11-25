import Phaser from "phaser";
import {
  CLASS_CATALOG,
  ENEMY_CATALOG,
  ExpeditionResult,
  FloorBattleEvent,
  FloorMilestone,
  GEO_EFFECT_CATALOG,
  PartyMemberSnapshot,
  PlayerAvatarState,
  PlayerAvatars,
  PlayerOutfit,
  WeaponType,
  buildRpgGearSignature,
  formatBigNumber,
  toDecimal,
} from "shared";
import {
  getBattleWeaponIconKey,
  hasCustomAvatarFrames,
  parseGearSignature,
  renderPlayerCharacterCanvas,
} from "./rpgGearRenderer";

export type ClashSpeed = 1 | 2 | 4;

export interface LocalPlayerVisualInfo {
  outfit?: Partial<PlayerOutfit> | null;
  avatars?: PlayerAvatars | null;
}

interface ActivePartySprite {
  name: string;
  row: "FRONT" | "BACK";
  isMainHero: boolean;
  texKey: string;
  baseX: number;
  baseY: number;
  container: Phaser.GameObjects.Container;
  bodySprite: Phaser.GameObjects.Sprite;
  weaponSprite: Phaser.GameObjects.Image | null;
  tag: Phaser.GameObjects.Text;
  hpBg: Phaser.GameObjects.Rectangle;
  hpFill: Phaser.GameObjects.Rectangle;
  hpRatio: number;
}

interface ActiveEnemyVisual {
  sprite: Phaser.GameObjects.Sprite;
  spriteKey: string;
  nameTag: Phaser.GameObjects.Text;
  hpBg: Phaser.GameObjects.Rectangle;
  hpFill: Phaser.GameObjects.Rectangle;
  hpLabel: Phaser.GameObjects.Text;
  baseX: number;
  baseY: number;
  isBoss: boolean;
  alive: boolean;
}

const WEAPON_ICON_ASSETS: Array<{ key: string; url: string }> = [
  { key: "gear_wpn_wooden_sword", url: "/assets/sprites/gear/icons/wooden_sword.png" },
  { key: "gear_wpn_sword_metal", url: "/assets/sprites/gear/icons/sword_metal.png" },
  { key: "gear_wpn_axe", url: "/assets/sprites/gear/icons/axe.png" },
  { key: "gear_wpn_spear", url: "/assets/sprites/gear/icons/spear.png" },
  { key: "gear_wpn_staff", url: "/assets/sprites/gear/icons/staff.png" },
  { key: "gear_wpn_bow", url: "/assets/sprites/gear/icons/bow.png" },
  { key: "gear_wpn_fist", url: "/assets/sprites/gear/icons/fist.png" },
  { key: "gear_wpn_gun", url: "/assets/sprites/gear/icons/gun.png" },
];

const VFX_SHEETS = [
  { key: "vfx_slash_arc", url: "/assets/sprites/vfx/slash_arc.png", fw: 48, fh: 48, end: 5, rate: 26 },
  { key: "vfx_thrust_pierce", url: "/assets/sprites/vfx/thrust_pierce.png", fw: 48, fh: 48, end: 4, rate: 24 },
  { key: "vfx_magic_burst", url: "/assets/sprites/vfx/magic_burst.png", fw: 48, fh: 48, end: 5, rate: 22 },
  { key: "vfx_impact_hit", url: "/assets/sprites/vfx/impact_hit.png", fw: 32, fh: 32, end: 4, rate: 24 },
  { key: "vfx_enemy_claw", url: "/assets/sprites/vfx/enemy_claw.png", fw: 40, fh: 40, end: 4, rate: 24 },
  { key: "vfx_crit_flash", url: "/assets/sprites/vfx/crit_flash.png", fw: 48, fh: 48, end: 4, rate: 24 },
  { key: "vfx_heal_sparkle", url: "/assets/sprites/vfx/heal_sparkle.png", fw: 32, fh: 32, end: 4, rate: 18 },
  { key: "vfx_shield_guard", url: "/assets/sprites/vfx/shield_guard.png", fw: 32, fh: 32, end: 3, rate: 18 },
] as const;

class ClashStageScene extends Phaser.Scene {
  public mainHero: PlayerAvatarState | null = null;
  public alliedParty: PartyMemberSnapshot[] = [];
  public localVisuals: LocalPlayerVisualInfo | null = null;
  public partySprites: ActivePartySprite[] = [];
  public activeEnemies: ActiveEnemyVisual[] = [];
  public enemyGroup: Phaser.GameObjects.Container | null = null;
  public geoCrystal: Phaser.GameObjects.Sprite | null = null;
  public geoLabel: Phaser.GameObjects.Text | null = null;
  public floorBanner: Phaser.GameObjects.Text | null = null;
  public comboText: Phaser.GameObjects.Text | null = null;
  public cutInContainer: Phaser.GameObjects.Container | null = null;
  public isReady = false;
  private onReadyCallback?: () => void;
  private renderToken = 0;

  constructor() {
    super("ClashStageScene");
  }

  public setOnReady(cb: () => void): void {
    if (this.isReady) cb();
    else this.onReadyCallback = cb;
  }

  preload(): void {
    // Normal & Boss Enemies (small_orc, bat, pig, slime, minotaur, big_orc)
    for (const enemy of Object.values(ENEMY_CATALOG)) {
      this.load.spritesheet(enemy.spriteKey, enemy.spriteUrl, {
        frameWidth: enemy.frameSize,
        frameHeight: enemy.frameSize,
      });
    }
    this.load.spritesheet("enemy_specialist", "/assets/sprites/enemies/specialist.png", {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet("enemy_mimic", "/assets/sprites/enemies/mimic.png", {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet("geo_crystal", "/assets/sprites/enemies/geo_crystal.png", {
      frameWidth: 24,
      frameHeight: 24,
    });

    // Generated RPG Gear Weapon Sprites
    for (const wpn of WEAPON_ICON_ASSETS) {
      this.load.image(wpn.key, wpn.url);
    }

    // Generated Multi-Frame Battle Animation VFX Spritesheets
    for (const vfx of VFX_SHEETS) {
      this.load.spritesheet(vfx.key, vfx.url, {
        frameWidth: vfx.fw,
        frameHeight: vfx.fh,
      });
    }
    this.load.spritesheet("vfx_projectiles", "/assets/sprites/vfx/projectiles.png", {
      frameWidth: 24,
      frameHeight: 24,
    });
  }

  create(): void {
    const w = this.scale.width;
    const h = this.scale.height;

    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0f172a, 0x0f172a, 0x1e293b, 0x1a1428, 1);
    bg.fillRect(0, 0, w, h);

    bg.fillStyle(0xfef08a, 0.45);
    for (let i = 0; i < 24; i++) {
      const sx = ((i * 73) % (w - 20)) + 10;
      const sy = ((i * 41) % (h * 0.48)) + 8;
      bg.fillRect(sx, sy, i % 3 === 0 ? 2 : 1, i % 3 === 0 ? 2 : 1);
    }

    bg.fillStyle(0x16222a, 1);
    bg.fillRect(0, h * 0.68, w, h * 0.32);
    bg.fillStyle(0x3b8282, 0.38);
    bg.fillRect(0, h * 0.68, w, 3);

    bg.lineStyle(1, 0x3b8282, 0.2);
    bg.strokeRoundedRect(22, h * 0.5, 224, h * 0.44, 8);

    for (const enemy of Object.values(ENEMY_CATALOG)) {
      if (!this.anims.exists(`${enemy.spriteKey}_idle`)) {
        this.anims.create({
          key: `${enemy.spriteKey}_idle`,
          frames: this.anims.generateFrameNumbers(enemy.spriteKey, { start: 0, end: 1 }),
          frameRate: 4,
          repeat: -1,
        });
      }
    }
    for (const key of ["enemy_specialist", "enemy_mimic", "geo_crystal"]) {
      if (!this.anims.exists(`${key}_idle`)) {
        this.anims.create({
          key: `${key}_idle`,
          frames: this.anims.generateFrameNumbers(key, { start: 0, end: 1 }),
          frameRate: 4,
          repeat: -1,
        });
      }
    }
    for (const vfx of VFX_SHEETS) {
      if (!this.anims.exists(`${vfx.key}_play`)) {
        this.anims.create({
          key: `${vfx.key}_play`,
          frames: this.anims.generateFrameNumbers(vfx.key, { start: 0, end: vfx.end }),
          frameRate: vfx.rate,
          repeat: 0,
        });
      }
    }

    this.geoCrystal = this.add
      .sprite(w * 0.5, h * 0.44, "geo_crystal", 0)
      .setScale(2)
      .setAlpha(0.35);
    this.geoCrystal.play("geo_crystal_idle");

    this.geoLabel = this.add
      .text(w * 0.5, h * 0.56, "ADVENTURE READY", {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#94a3b8",
        stroke: "#090d16",
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    this.floorBanner = this.add
      .text(14, 10, "STAGE READY — SELECT AN ITEM TO ENTER ITEM WORLD", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "12px",
        fontStyle: "bold",
        color: "#e2e8f0",
        stroke: "#090d16",
        strokeThickness: 4,
      })
      .setDepth(20);

    this.comboText = this.add
      .text(w - 14, 10, "", {
        fontFamily: "Impact, sans-serif",
        fontSize: "17px",
        color: "#fbbf24",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(1, 0)
      .setDepth(20);

    this.enemyGroup = this.add.container(0, 0).setDepth(10);
    this.cutInContainer = this.add.container(0, 0).setDepth(40).setVisible(false);

    this.isReady = true;
    void this.renderParty(this.mainHero, this.alliedParty, this.localVisuals);
    this.onReadyCallback?.();
  }

  public async renderParty(
    hero: PlayerAvatarState | null,
    allies: PartyMemberSnapshot[],
    localVisuals: LocalPlayerVisualInfo | null
  ): Promise<void> {
    this.mainHero = hero;
    this.alliedParty = allies;
    this.localVisuals = localVisuals;
    const token = ++this.renderToken;

    for (const s of this.partySprites) {
      s.container.destroy();
      s.tag.destroy();
      s.hpBg.destroy();
      s.hpFill.destroy();
    }
    this.partySprites = [];
    if (!this.isReady || !hero) return;

    const heroClassLabel = hero.activeClass ? CLASS_CATALOG[hero.activeClass].label : "Adventurer";
    const members = [
      {
        key: "local",
        name: hero.playerName,
        classLabel: heroClassLabel,
        row: hero.battleRow,
        isMainHero: true,
        isSquadmate: true,
        outfit: localVisuals?.outfit,
        avatars: localVisuals?.avatars,
        gearSignature: buildRpgGearSignature(hero),
      },
      ...allies.map((a, idx) => ({
        key: `ally_${a.playerId}_${idx}`,
        name: a.playerName,
        classLabel: CLASS_CATALOG[a.activeClass].label,
        row: a.battleRow,
        isMainHero: false,
        isSquadmate: a.isSquadmate,
        outfit: a.outfit,
        avatars: a.avatars,
        gearSignature: a.gearSignature || "",
      })),
    ];

    // Pre-composite 8-frame (4 idle + 4 walk) character strips with animated gear ONLY on default characters
    const rendered = await Promise.all(
      members.map(async (m) => {
        const isDefaultChar = !hasCustomAvatarFrames(m.avatars);
        const strip = document.createElement("canvas");
        strip.width = 256;
        strip.height = 32;
        const sctx = strip.getContext("2d");
        if (sctx) {
          sctx.imageSmoothingEnabled = false;
          for (let col = 0; col < 4; col++) {
            const idleCell = await renderPlayerCharacterCanvas({
              outfit: m.outfit,
              avatars: m.avatars,
              gearSignature: isDefaultChar ? m.gearSignature : "",
              facingRight: true,
              includeWeapon: false,
              dirIndex: 2,
              frameCol: col,
              isWalk: false,
            });
            sctx.drawImage(idleCell, col * 32, 0);

            const walkCell = await renderPlayerCharacterCanvas({
              outfit: m.outfit,
              avatars: m.avatars,
              gearSignature: isDefaultChar ? m.gearSignature : "",
              facingRight: true,
              includeWeapon: false,
              dirIndex: 2,
              frameCol: col,
              isWalk: true,
            });
            sctx.drawImage(walkCell, (4 + col) * 32, 0);
          }
        }
        return { m, strip, isDefaultChar };
      })
    );

    if (token !== this.renderToken || !this.scene) return;

    const h = this.scale.height;
    const front = rendered.filter((t) => t.m.row === "FRONT");
    const back = rendered.filter((t) => t.m.row === "BACK");

    const place = (list: typeof rendered, baseX: number) => {
      list.forEach(({ m, strip, isDefaultChar }, idx) => {
        const texKey = `clash_player_${m.key}_${token}_${idx}`;
        if (this.textures.exists(texKey)) {
          this.textures.remove(texKey);
        }
        const tex = this.textures.addCanvas(texKey, strip);
        if (tex) {
          for (let f = 0; f < 8; f++) {
            tex.add(f, 0, f * 32, 0, 32, 32);
          }
          tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
        }

        const idleKey = `${texKey}_idle`;
        const walkKey = `${texKey}_walk`;
        if (this.anims.exists(idleKey)) this.anims.remove(idleKey);
        if (this.anims.exists(walkKey)) this.anims.remove(walkKey);
        this.anims.create({
          key: idleKey,
          frames: [
            { key: texKey, frame: 0 },
            { key: texKey, frame: 1 },
            { key: texKey, frame: 2 },
            { key: texKey, frame: 3 },
          ],
          frameRate: 6,
          repeat: -1,
        });
        this.anims.create({
          key: walkKey,
          frames: [
            { key: texKey, frame: 4 },
            { key: texKey, frame: 5 },
            { key: texKey, frame: 6 },
            { key: texKey, frame: 7 },
          ],
          frameRate: 8,
          repeat: -1,
        });

        const yOffset = list.length === 1 ? 0 : (idx - (list.length - 1) / 2) * 34;
        const x = baseX + (m.isMainHero ? 16 : 0) + (idx % 2) * 10;
        const y = h * 0.71 + yOffset * 0.45;

        const container = this.add.container(x, y).setDepth(12 + idx);
        const bodySprite = this.add.sprite(0, 0, texKey, 0).setScale(2.15);
        bodySprite.play(idleKey);
        container.add(bodySprite);

        // Attach generated weapon sprite ONLY on default character assets (never on Slime/custom sprites!)
        let weaponSprite: Phaser.GameObjects.Image | null = null;
        if (isDefaultChar) {
          const parsed = parseGearSignature(m.gearSignature);
          const wpnKey = getBattleWeaponIconKey(
            parsed.weaponType,
            parsed.weaponRank,
            parsed.weaponRarity
          );
          if (wpnKey && this.textures.exists(wpnKey)) {
            weaponSprite = this.add
              .image(11, 10, wpnKey)
              .setScale(1.05)
              .setOrigin(0.22, 0.78)
              .setAngle(18);
            container.add(weaponSprite);

            // Sync held weapon subtle breath bob with idle sprite frames
            bodySprite.on("animationupdate", (_anim: Phaser.Animations.Animation, frame: Phaser.Animations.AnimationFrame) => {
              if (!weaponSprite || !weaponSprite.active) return;
              const tf = Number(frame.textureFrame);
              if (tf === 1 || tf === 2) weaponSprite.y = 11;
              else if (tf === 5 || tf === 7) weaponSprite.y = 9;
              else weaponSprite.y = 10;
            });
          }
        }

        const hpBg = this.add.rectangle(x, y + 29, 44, 5, 0x090d16, 0.9).setDepth(18);
        hpBg.setStrokeStyle(1, 0x334155, 0.9);
        const hpFill = this.add
          .rectangle(x - 21, y + 29, 42, 3, 0x10b981, 1)
          .setOrigin(0, 0.5)
          .setDepth(19);

        const color = m.isMainHero ? "#fde68a" : m.isSquadmate ? "#6ee7b7" : "#93c5fd";
        const tag = this.add
          .text(x, y + 40, `${m.name.slice(0, 12)} · ${m.classLabel}`, {
            fontFamily: "monospace",
            fontSize: "9px",
            fontStyle: m.isMainHero ? "bold" : "normal",
            color,
            stroke: "#090d16",
            strokeThickness: 3,
          })
          .setOrigin(0.5)
          .setDepth(18);

        this.partySprites.push({
          name: m.name,
          row: m.row,
          isMainHero: m.isMainHero,
          texKey,
          baseX: x,
          baseY: y,
          container,
          bodySprite,
          weaponSprite,
          tag,
          hpBg,
          hpFill,
          hpRatio: 1,
        });
      });
    };

    place(back, 74);
    place(front, 168);
  }
}

export class BattleStageAnimator {
  private container: HTMLElement;
  private game: Phaser.Game | null = null;
  private scene: ClashStageScene;
  private speedMult: ClashSpeed = 1;
  private skipRequested = false;
  private audioCtx: AudioContext | null = null;
  private soundEnabled = true;

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new ClashStageScene();
    this.mountPhaser();
  }

  private mountPhaser(): void {
    if (this.game) return;
    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: this.container,
      width: 680,
      height: 240,
      backgroundColor: "#0f172a",
      pixelArt: true,
      roundPixels: true,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: [this.scene],
    });
  }

  public setParty(
    hero: PlayerAvatarState | null,
    allies: PartyMemberSnapshot[],
    localVisuals: LocalPlayerVisualInfo | null
  ): void {
    this.scene.mainHero = hero;
    this.scene.alliedParty = allies;
    this.scene.localVisuals = localVisuals;
    if (this.scene.isReady) {
      void this.scene.renderParty(hero, allies, localVisuals);
    } else {
      this.scene.setOnReady(() => {
        void this.scene.renderParty(hero, allies, localVisuals);
      });
    }
  }

  public setSpeed(speed: ClashSpeed): void {
    this.speedMult = speed;
    if (this.scene.isReady) {
      this.scene.tweens.timeScale = speed;
      this.scene.anims.globalTimeScale = speed;
    }
  }

  public setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
  }

  public requestSkip(): void {
    this.skipRequested = true;
  }

  public triggerCheerBurst(fromName: string): void {
    if (!this.scene.isReady) return;
    const w = this.scene.scale.width;
    this.spawnBigDamageText(w * 0.25, 70, `CHEER FROM ${fromName.toUpperCase()}! +20% CRIT!`, true, "#fbbf24");
  }

  public destroy(): void {
    this.skipRequested = true;
    if (this.game) {
      this.game.destroy(true);
      this.game = null;
    }
  }

  private playTone(freq: number, durMs: number, type: OscillatorType = "square", vol = 0.045): void {
    if (!this.soundEnabled || this.skipRequested) return;
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      if (!this.audioCtx) this.audioCtx = new Ctx();
      if (this.audioCtx.state === "suspended") void this.audioCtx.resume();
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + durMs / 1000);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + durMs / 1000);
    } catch {}
  }

  public async playExpedition(
    result: ExpeditionResult,
    onFloorProgress?: (floor: FloorMilestone) => void
  ): Promise<void> {
    if (!this.scene.isReady) {
      await new Promise<void>((resolve) => this.scene.setOnReady(resolve));
    }

    this.skipRequested = false;
    this.scene.tweens.timeScale = this.speedMult;
    this.scene.anims.globalTimeScale = this.speedMult;

    for (const p of this.scene.partySprites) {
      p.hpRatio = 1;
      p.hpFill.setSize(42, 3).setFillStyle(0x10b981, 1);
      p.container.setPosition(p.baseX, p.baseY).setAlpha(1);
    }

    const floors = result.floorSummaries;
    const isLongRun = floors.length > 15;
    let combo = 0;

    for (let i = 0; i < floors.length; i++) {
      const floor = floors[i];
      onFloorProgress?.(floor);

      if (this.skipRequested) {
        this.showFinalSummaryBanner(result);
        break;
      }

      combo += 1;
      this.updateHudBanner(floor, combo);
      this.spawnFloorEnemies(floor);
      this.updateGeoCrystal(floor);

      if (floor.archetype === "GATEKEEPER" || floor.archetype === "ITEM_GOD") {
        const isItemGod = floor.archetype === "ITEM_GOD";
        const bossName = floor.bossId ? ENEMY_CATALOG[floor.bossId].name.toUpperCase() : "GATEKEEPER";
        this.scene.cameras.main.shake(isItemGod ? 240 : 160, isItemGod ? 0.016 : 0.011);
        this.playTone(110, 150, "sawtooth", 0.06);
        const cutInText = floor.synergyCombo
          ? `${floor.synergyCombo.initiatorName} × ${floor.synergyCombo.finisherName}: ${floor.synergyCombo.comboName}!`
          : isItemGod
            ? `ITEM GOD SHOWDOWN: ${bossName}!`
            : `BOSS SHOWDOWN VS ${bossName}!`;
        await this.showCutInBanner(cutInText);
      }

      if (floor.events && floor.events.length > 0) {
        await this.playBattleEvents(floor, isLongRun);
      } else {
        await this.playFallbackExchange(floor, isLongRun);
      }

      if (floor.archetype === "SPECIALIST" && floor.specialistSubdued) {
        this.playTone(784, 140, "sine", 0.06);
        this.spawnBigDamageText(480, 90, `SUBDUED ${floor.specialistSubdued}!`, true, "#38bdf8");
        await this.waitScaled(360);
      } else if (floor.archetype === "MYSTERY" && floor.karmaShardGain) {
        this.playTone(580, 120, "triangle", 0.05);
        this.spawnBigDamageText(490, 95, `+${floor.karmaShardGain} KARMA SHARDS!`, true, "#e879f9");
        await this.waitScaled(320);
      } else if ((floor.archetype === "GATEKEEPER" || floor.archetype === "ITEM_GOD") && floor.cleared) {
        this.spawnVictoryChestFountain();
        await this.waitScaled(380);
      }

      if (!floor.cleared) {
        await this.playPartyWipe(floor.floor);
        break;
      }
      await this.waitScaled(isLongRun ? 70 : 150);
    }

    this.showFinalSummaryBanner(result);
  }

  private updateHudBanner(floor: FloorMilestone, combo: number): void {
    const tag =
      floor.archetype === "ITEM_GOD"
        ? `ITEM GOD FLOOR ${floor.floor}`
        : floor.archetype === "GATEKEEPER"
          ? `GATEKEEPER FLOOR ${floor.floor}`
          : floor.archetype === "SPECIALIST"
            ? `SPECIALIST FLOOR ${floor.floor}`
            : floor.archetype === "MYSTERY"
              ? `MYSTERY VAULT ${floor.floor}`
              : `FLOOR ${floor.floor}`;
    this.scene.floorBanner?.setText(tag);
    this.scene.comboText?.setText(combo > 1 ? `${combo}x CHAIN!` : "");
  }

  private updateGeoCrystal(floor: FloorMilestone): void {
    const crystal = this.scene.geoCrystal;
    const label = this.scene.geoLabel;
    if (!crystal || !label) return;

    if (!floor.geoEffect) {
      crystal.setAlpha(0.18).clearTint();
      label.setText(floor.archetype);
      return;
    }

    const def = GEO_EFFECT_CATALOG[floor.geoEffect];
    const hexNum = parseInt(def.color.replace("#", ""), 16);
    crystal.setAlpha(0.95).setTint(hexNum).setScale(2);
    label.setText(floor.geoBroken ? `SHATTERED (${def.label})` : def.label);

    if (floor.geoBroken && !this.skipRequested) {
      this.playTone(620, 90, "triangle", 0.05);
      this.scene.tweens.add({
        targets: crystal,
        scale: 3.0,
        alpha: 0.15,
        duration: 240,
        ease: "Cubic.easeOut",
      });
    }
  }

  private spawnFloorEnemies(floor: FloorMilestone): void {
    const group = this.scene.enemyGroup;
    if (!group) return;
    group.removeAll(true);
    this.scene.activeEnemies = [];

    const w = this.scene.scale.width;
    const h = this.scene.scale.height;

    floor.enemies.forEach((e, idx) => {
      const spriteKey =
        e.enemyId === "specialist"
          ? "enemy_specialist"
          : e.enemyId === "mimic"
            ? "enemy_mimic"
            : ENEMY_CATALOG[e.enemyId]?.spriteKey || "enemy_slime";

      const isBoss = e.isBoss;
      const baseX = isBoss ? w - 132 : w - 215 + (idx % 2) * 86;
      const baseY = isBoss ? h * 0.63 : h * 0.52 + Math.floor(idx / 2) * 56;

      const spr = this.scene.add
        .sprite(baseX + 60, baseY, spriteKey, 0)
        .setScale(e.tier === "ITEM_GOD" ? 3.0 : isBoss ? 2.6 : 1.9);
      if (e.tier === "ITEM_GOD") spr.setTint(0xfde047);
      if (this.scene.anims.exists(`${spriteKey}_idle`)) {
        spr.play(`${spriteKey}_idle`);
      }

      const barW = isBoss ? 82 : 52;
      const barTop = baseY - (isBoss ? 52 : 30);
      const hpBg = this.scene.add.rectangle(baseX + 60, barTop, barW, 6, 0x090d16, 0.92);
      hpBg.setStrokeStyle(1, 0x475569, 0.9);
      const hpFill = this.scene.add
        .rectangle(baseX + 60 - (barW - 2) / 2, barTop, barW - 2, 4, isBoss ? 0xf59e0b : 0xef4444, 1)
        .setOrigin(0, 0.5);
      const hpLabel = this.scene.add
        .text(baseX + 60, barTop - 9, formatBigNumber(e.maxHp), {
          fontFamily: "monospace",
          fontSize: "8px",
          color: "#cbd5e1",
          stroke: "#090d16",
          strokeThickness: 2,
        })
        .setOrigin(0.5);

      const nameColor =
        e.tier === "ITEM_GOD"
          ? "#fde047"
          : isBoss
            ? "#fbbf24"
            : e.tier === "SPECIALIST"
              ? "#38bdf8"
              : e.tier === "MYSTERY"
                ? "#e879f9"
                : "#f8fafc";

      const nameTag = this.scene.add
        .text(baseX + 60, baseY + (isBoss ? 54 : 28), e.name, {
          fontFamily: "monospace",
          fontSize: isBoss ? "11px" : "9px",
          fontStyle: isBoss ? "bold" : "normal",
          color: nameColor,
          stroke: "#090d16",
          strokeThickness: 3,
        })
        .setOrigin(0.5);

      group.add([spr, hpBg, hpFill, hpLabel, nameTag]);

      this.scene.activeEnemies.push({
        sprite: spr,
        spriteKey,
        nameTag,
        hpBg,
        hpFill,
        hpLabel,
        baseX,
        baseY,
        isBoss,
        alive: true,
      });

      if (!this.skipRequested) {
        this.scene.tweens.add({
          targets: [spr, nameTag, hpBg, hpFill, hpLabel],
          x: `-=60`,
          duration: isBoss ? 220 : 120,
          ease: "Back.easeOut",
        });
      } else {
        spr.x = baseX;
        nameTag.x = baseX;
        hpBg.x = baseX;
        hpFill.x = baseX - (barW - 2) / 2;
        hpLabel.x = baseX;
      }
    });
  }

  private playVfxAt(vfxKey: string, x: number, y: number, scale = 1.4): void {
    if (this.skipRequested || !this.scene.isReady) return;
    if (!this.scene.textures.exists(vfxKey)) return;
    const fx = this.scene.add.sprite(x, y, vfxKey, 0).setScale(scale).setDepth(32);
    fx.play(`${vfxKey}_play`);
    fx.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => fx.destroy());
  }

  private async launchProjectile(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    frameIdx: number,
    durationMs: number
  ): Promise<void> {
    if (this.skipRequested || !this.scene.textures.exists("vfx_projectiles")) return;
    const proj = this.scene.add
      .sprite(fromX, fromY, "vfx_projectiles", frameIdx)
      .setScale(1.4)
      .setDepth(31);
    const angle = Phaser.Math.RadToDeg(Math.atan2(toY - fromY, toX - fromX));
    proj.setAngle(angle);
    await this.tweenPromise({
      targets: proj,
      x: toX,
      y: toY,
      duration: durationMs,
      ease: "Linear",
    });
    proj.destroy();
  }

  private async playBattleEvents(floor: FloorMilestone, isLongRun: boolean): Promise<void> {
    const events = floor.events || [];
    const isBoss = floor.archetype === "GATEKEEPER" || floor.archetype === "ITEM_GOD";
    const pace = isLongRun && !isBoss ? 0.55 : 1.0;

    for (const ev of events) {
      if (this.skipRequested) return;
      if (ev.side === "ALLY") {
        await this.animateAllyEvent(ev, pace);
      } else {
        await this.animateEnemyEvent(ev, pace);
      }
    }
  }

  private async animateAllyEvent(ev: FloorBattleEvent, pace: number): Promise<void> {
    const actor = this.scene.partySprites[ev.actorIndex] || this.scene.partySprites[0];
    if (!actor) return;

    if (ev.actionKind === "HEAL") {
      this.playTone(540, 90, "sine", 0.04);
      ev.targetIndices.forEach((pIdx, idx) => {
        const ally = this.scene.partySprites[pIdx];
        if (!ally) return;
        this.playVfxAt("vfx_heal_sparkle", ally.baseX, ally.baseY - 4, 1.5);
        this.updateHpBarRatio(ally.hpFill, 42, ev.targetHpAfter[idx], ev.targetMaxHp[idx], true);
      });
      await this.waitScaled(Math.round(140 * pace));
      return;
    }

    const firstTargetIdx = ev.targetIndices[0] ?? 0;
    const primaryTarget = this.scene.activeEnemies[firstTargetIdx];
    const targetX = primaryTarget ? primaryTarget.baseX : 490;
    const targetY = primaryTarget ? primaryTarget.baseY : 150;

    const wType: WeaponType | undefined = ev.weaponType;
    const isRanged = ev.actionKind === "RANGED" || wType === "BOW" || wType === "GUN";
    const isMagic = ev.actionKind === "MAGIC" || wType === "STAFF";

    // 1. Wind-up & pull back weapon
    if (actor.weaponSprite) {
      this.tweenPromise({
        targets: actor.weaponSprite,
        angle: isMagic || isRanged ? -48 : -85,
        duration: Math.round(75 * pace),
        ease: "Cubic.easeOut",
      });
    }

    if (isRanged || isMagic) {
      await this.tweenPromise({
        targets: actor.container,
        x: actor.baseX - 8,
        duration: Math.round(75 * pace),
        ease: "Cubic.easeOut",
      });
      const projFrame = isMagic ? 2 : wType === "GUN" ? 1 : 0;
      this.playTone(isMagic ? 660 : 380, 75, isMagic ? "triangle" : "square", 0.04);
      await this.launchProjectile(
        actor.baseX + 18,
        actor.baseY - 4,
        targetX - 10,
        targetY - 2,
        projFrame,
        Math.round(130 * pace)
      );
    } else {
      // Dash forward cleanly to target enemy with walk animation
      if (this.scene.anims.exists(`${actor.texKey}_walk`)) {
        actor.bodySprite.play(`${actor.texKey}_walk`, true);
      }
      const dashX = Math.max(actor.baseX + 60, targetX - (primaryTarget?.isBoss ? 58 : 42));
      await this.tweenPromise({
        targets: actor.container,
        x: dashX,
        y: targetY - 6,
        duration: Math.round(115 * pace),
        ease: "Cubic.easeOut",
      });

      // Weapon slash/thrust swing
      if (actor.weaponSprite) {
        await this.tweenPromise({
          targets: actor.weaponSprite,
          angle: wType === "SPEAR" ? 4 : 88,
          x: wType === "SPEAR" ? 22 : 13,
          duration: Math.round(70 * pace),
          ease: "Power2",
        });
      }
    }

    // 2. Impact VFX, HP bar drain, enemy hit reaction
    const impactVfx = isMagic
      ? "vfx_magic_burst"
      : wType === "SPEAR" || isRanged
        ? "vfx_thrust_pierce"
        : wType === "FIST"
          ? "vfx_impact_hit"
          : "vfx_slash_arc";

    this.playTone(ev.isCrit ? 190 : 280, 85, "sawtooth", ev.isCrit ? 0.06 : 0.04);
    if (ev.isCrit) {
      this.scene.cameras.main.shake(90, 0.01);
    }

    ev.targetIndices.forEach((eIdx, i) => {
      const target = this.scene.activeEnemies[eIdx];
      if (!target) return;

      this.playVfxAt(impactVfx, target.baseX, target.baseY - 4, target.isBoss ? 1.85 : 1.45);
      if (ev.isCrit) {
        this.playVfxAt("vfx_crit_flash", target.baseX, target.baseY - 8, 1.55);
      }

      // Enemy hit frame & knockback
      target.sprite.setFrame(3);
      this.scene.tweens.add({
        targets: target.sprite,
        x: target.baseX + 10,
        duration: Math.round(65 * pace),
        yoyo: true,
        onComplete: () => {
          if (target.alive && target.sprite.active) {
            target.sprite.play(`${target.spriteKey}_idle`, true);
          }
        },
      });

      const barW = target.isBoss ? 80 : 50;
      const hpAfterStr = ev.targetHpAfter[i] || "0";
      const maxHpStr = ev.targetMaxHp[i] || "1";
      this.updateHpBarRatio(target.hpFill, barW, hpAfterStr, maxHpStr, false);
      target.hpLabel.setText(formatBigNumber(hpAfterStr));

      const dmgVal = formatBigNumber(ev.damages[i] || "0");
      this.spawnBigDamageText(
        target.baseX,
        target.baseY - (target.isBoss ? 36 : 22),
        ev.isCrit ? `${dmgVal}!` : dmgVal,
        ev.isCrit,
        ev.isCrit ? "#fbbf24" : "#ffffff"
      );

      if (ev.isDefeat[i] && target.alive) {
        target.alive = false;
        this.scene.tweens.add({
          targets: [target.sprite, target.nameTag, target.hpBg, target.hpFill, target.hpLabel],
          alpha: 0,
          y: "+=8",
          duration: Math.round(180 * pace),
          ease: "Cubic.easeIn",
        });
      }
    });

    await this.waitScaled(Math.round(85 * pace));

    // 3. Recover hero back to formation
    if (actor.weaponSprite) {
      this.tweenPromise({
        targets: actor.weaponSprite,
        angle: 18,
        x: 11,
        duration: Math.round(95 * pace),
      });
    }
    await this.tweenPromise({
      targets: actor.container,
      x: actor.baseX,
      y: actor.baseY,
      duration: Math.round(115 * pace),
      ease: "Cubic.easeOut",
    });
    if (actor.bodySprite.active && this.scene.anims.exists(`${actor.texKey}_idle`)) {
      actor.bodySprite.play(`${actor.texKey}_idle`, true);
    }
  }

  private async animateEnemyEvent(ev: FloorBattleEvent, pace: number): Promise<void> {
    const enemy = this.scene.activeEnemies[ev.actorIndex];
    if (!enemy || !enemy.alive || !enemy.sprite.active) return;

    const targetIdx = ev.targetIndices[0] ?? 0;
    const defender = this.scene.partySprites[targetIdx] || this.scene.partySprites[0];
    if (!defender) return;

    // Enemy switches to attack frame (2) and lunges left
    enemy.sprite.stop();
    enemy.sprite.setFrame(2);
    await this.tweenPromise({
      targets: enemy.sprite,
      x: enemy.baseX - 42,
      duration: Math.round(105 * pace),
      ease: "Back.easeOut",
    });

    this.playTone(145, 80, "square", 0.045);
    this.playVfxAt("vfx_enemy_claw", defender.baseX + 4, defender.baseY - 2, 1.35);
    if (this.scene.mainHero?.activeClass === "HEAVY_KNIGHT") {
      this.playVfxAt("vfx_shield_guard", defender.baseX + 8, defender.baseY, 1.25);
    }

    // Defender recoil & tint flash
    defender.bodySprite.setTint(0xfca5a5);
    this.scene.tweens.add({
      targets: defender.container,
      x: defender.baseX - 8,
      duration: Math.round(65 * pace),
      yoyo: true,
      onComplete: () => {
        if (defender.bodySprite.active) defender.bodySprite.clearTint();
      },
    });

    const hpAfterStr = ev.targetHpAfter[0] || "0";
    const maxHpStr = ev.targetMaxHp[0] || "1";
    this.updateHpBarRatio(defender.hpFill, 42, hpAfterStr, maxHpStr, true);
    this.spawnBigDamageText(
      defender.baseX,
      defender.baseY - 24,
      `-${formatBigNumber(ev.damages[0] || "0")}`,
      false,
      "#f87171"
    );

    await this.tweenPromise({
      targets: enemy.sprite,
      x: enemy.baseX,
      duration: Math.round(100 * pace),
      ease: "Cubic.easeOut",
    });
    if (enemy.alive && enemy.sprite.active) {
      enemy.sprite.play(`${enemy.spriteKey}_idle`, true);
    }
    await this.waitScaled(Math.round(50 * pace));
  }

  private async playFallbackExchange(floor: FloorMilestone, isLongRun: boolean): Promise<void> {
    const hero = this.scene.partySprites[0];
    if (!hero) return;
    await this.tweenPromise({
      targets: hero.container,
      x: hero.baseX + 120,
      duration: isLongRun ? 90 : 140,
      yoyo: true,
    });
    this.spawnBigDamageText(500, 120, formatBigNumber(floor.totalDamage), false);
    await this.waitScaled(isLongRun ? 80 : 180);
  }

  private updateHpBarRatio(
    fillRect: Phaser.GameObjects.Rectangle,
    fullWidth: number,
    curStr: string,
    maxStr: string,
    isHero: boolean
  ): void {
    const cur = toDecimal(curStr);
    const max = toDecimal(maxStr);
    const ratio = max.gt(0) ? Math.max(0, Math.min(1, cur.div(max).toNumber())) : 0;
    fillRect.width = Math.max(ratio > 0 ? 2 : 0, Math.round(fullWidth * ratio));
    if (isHero) {
      fillRect.setFillStyle(ratio > 0.5 ? 0x10b981 : ratio > 0.25 ? 0xf59e0b : 0xef4444, 1);
    }
  }

  private async playPartyWipe(floorNum: number): Promise<void> {
    this.scene.cameras.main.shake(260, 0.02);
    this.playTone(95, 240, "sawtooth", 0.07);
    this.spawnBigDamageText(240, 100, `WIPED ON FLOOR ${floorNum}`, true, "#ef4444");
    await this.waitScaled(520);
  }

  private async showCutInBanner(text: string): Promise<void> {
    if (this.skipRequested) return;
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const container = this.scene.cutInContainer;
    if (!container) return;

    container.removeAll(true).setVisible(true);
    const bar = this.scene.add.rectangle(w / 2, h / 2, w, 40, 0x0f172a, 0.92);
    bar.setStrokeStyle(2, 0xeca239);
    const label = this.scene.add
      .text(w + 180, h / 2, text, {
        fontFamily: "Impact, sans-serif",
        fontSize: "16px",
        color: "#fbbf24",
        stroke: "#000000",
        strokeThickness: 5,
      })
      .setOrigin(0.5);

    container.add([bar, label]);
    await this.tweenPromise({
      targets: label,
      x: w / 2,
      duration: 160,
      ease: "Cubic.easeOut",
    });
    await this.waitScaled(210);
    container.setVisible(false);
  }

  private spawnVictoryChestFountain(): void {
    if (this.skipRequested) return;
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    for (let i = 0; i < 8; i++) {
      const orb = this.scene.add.circle(w - 140, h * 0.62, 5, i % 2 === 0 ? 0xfbbf24 : 0x38bdf8).setDepth(30);
      this.scene.tweens.add({
        targets: orb,
        x: w - 140 + (Math.random() - 0.5) * 140,
        y: h * 0.35 + Math.random() * 50,
        alpha: 0,
        duration: 480,
        ease: "Cubic.easeOut",
        onComplete: () => orb.destroy(),
      });
    }
  }

  private spawnBigDamageText(
    x: number,
    y: number,
    value: string,
    isMassive: boolean,
    color = "#FFFFFF"
  ): void {
    if (this.skipRequested) return;
    const digitsBoost = Math.min(1.4, 1 + Math.max(0, value.length - 3) * 0.05);
    const label = this.scene.add
      .text(x, y, value, {
        fontFamily: "Impact, sans-serif",
        fontSize: isMassive ? "22px" : "16px",
        color,
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setScale(digitsBoost)
      .setDepth(35);

    this.scene.tweens.add({
      targets: label,
      y: y - 36,
      scale: digitsBoost * (isMassive ? 1.15 : 1.0),
      alpha: 0,
      duration: isMassive ? 700 : 420,
      ease: "Cubic.easeOut",
      onComplete: () => label.destroy(),
    });
  }

  private showFinalSummaryBanner(result: ExpeditionResult): void {
    const status = result.clearedAll
      ? `CLEARED F${result.startFloor}–F${result.endFloor} · +${formatBigNumber(result.xpGained)} XP`
      : `WIPED AT F${result.wipeFloor} · +${formatBigNumber(result.xpGained)} XP`;
    this.scene.floorBanner?.setText(status);
    this.scene.comboText?.setText(result.karmaGained > 0 ? `+${result.karmaGained} KARMA` : "");
  }

  private tweenPromise(config: Phaser.Types.Tweens.TweenBuilderConfig): Promise<void> {
    if (this.skipRequested || !this.scene.isReady) return Promise.resolve();
    return new Promise((resolve) => {
      this.scene.tweens.add({
        ...config,
        onComplete: () => resolve(),
      });
    });
  }

  private waitScaled(ms: number): Promise<void> {
    if (this.skipRequested || !this.scene.isReady) return Promise.resolve();
    const scaled = Math.max(12, Math.round(ms / this.speedMult));
    return new Promise((resolve) => {
      this.scene.time.delayedCall(scaled, resolve);
    });
  }
}
