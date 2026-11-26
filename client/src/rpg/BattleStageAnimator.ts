import Phaser from "phaser";
import {
  CLASS_CATALOG,
  DEFAULT_PLAYER_OUTFIT,
  ENEMY_CATALOG,
  ExpeditionResult,
  FashionAnimState,
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
  FASHION_ANIM_SPECS,
  FASHION_CELL_SIZE,
  bakeOutfitCanvas,
} from "../fashionBaker";
import {
  getBattleWeaponIconKey,
  hasCustomAvatarFrames,
  parseGearSignature,
  renderPlayerCharacterCanvas,
} from "./rpgGearRenderer";

export type ClashSpeed = 1 | 2 | 4;
type ArenaDirection = "south" | "west" | "east" | "north";

export interface LocalPlayerVisualInfo {
  outfit?: Partial<PlayerOutfit> | null;
  avatars?: PlayerAvatars | null;
}

const ARENA_W = 720;
const ARENA_H = 380;
const ARENA_MARGIN = 36;
const DIRECTIONS: readonly ArenaDirection[] = ["south", "west", "east", "north"];

interface ActivePartyActor {
  key: string;
  name: string;
  activeClass: string;
  row: "FRONT" | "BACK";
  isMainHero: boolean;
  isDefaultChar: boolean;
  isRanged: boolean;
  isMage: boolean;
  isHealer: boolean;
  weaponType?: WeaponType | null;
  texKeys: Partial<Record<FashionAnimState, string>>;
  customTexKey?: string;
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  facing: ArenaDirection;
  isMoving: boolean;
  isSwinging: boolean;
  swingTimer: number;
  attackCooldown: number;
  healCooldown: number;
  strafeSign: number;
  patrolTimer: number;
  patrolTargetX: number;
  patrolTargetY: number;
  container: Phaser.GameObjects.Container;
  shadow: Phaser.GameObjects.Ellipse;
  bodySprite: Phaser.GameObjects.Sprite;
  weaponSprite: Phaser.GameObjects.Image | null;
  tag: Phaser.GameObjects.Text;
  hpBg: Phaser.GameObjects.Rectangle;
  hpFill: Phaser.GameObjects.Rectangle;
  hpRatio: number;
  alive: boolean;
}

interface ActiveEnemyActor {
  id: string;
  enemyId: string;
  name: string;
  tier: "NORMAL" | "BOSS" | "ITEM_GOD" | "SPECIALIST" | "MYSTERY";
  spriteKey: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  isBoss: boolean;
  alive: boolean;
  hpRatio: number;
  maxHpStr: string;
  attackCooldown: number;
  hitFlashTimer: number;
  knockbackX: number;
  knockbackY: number;
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Ellipse;
  groundRing: Phaser.GameObjects.Arc | null;
  nameTag: Phaser.GameObjects.Text;
  hpBg: Phaser.GameObjects.Rectangle;
  hpFill: Phaser.GameObjects.Rectangle;
  hpLabel: Phaser.GameObjects.Text;
}

interface ActiveProjectile {
  sprite: Phaser.GameObjects.Sprite;
  x: number;
  y: number;
  vx: number;
  vy: number;
  target: ActiveEnemyActor;
  isMagic: boolean;
  isAoE: boolean;
  dmgText: string;
  isCrit: boolean;
  life: number;
}

interface MagnetOrb {
  gfx: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  vx: number;
  vy: number;
  scatterTime: number;
  age: number;
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

function vectorToDirection(dx: number, dy: number): ArenaDirection {
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? "east" : "west";
  }
  return dy >= 0 ? "south" : "north";
}

function directionToAngle(dir: ArenaDirection): number {
  switch (dir) {
    case "east":
      return 0;
    case "south":
      return Math.PI / 2;
    case "west":
      return Math.PI;
    case "north":
      return -Math.PI / 2;
  }
}

class ClashStageScene extends Phaser.Scene {
  public mainHero: PlayerAvatarState | null = null;
  public alliedParty: PartyMemberSnapshot[] = [];
  public localVisuals: LocalPlayerVisualInfo | null = null;
  public partyActors: ActivePartyActor[] = [];
  public activeEnemies: ActiveEnemyActor[] = [];
  public projectiles: ActiveProjectile[] = [];
  public orbs: MagnetOrb[] = [];

  public geoCrystal: Phaser.GameObjects.Sprite | null = null;
  public geoAuraRing: Phaser.GameObjects.Arc | null = null;
  public geoLabel: Phaser.GameObjects.Text | null = null;
  public floorBanner: Phaser.GameObjects.Text | null = null;
  public comboText: Phaser.GameObjects.Text | null = null;
  public cutInContainer: Phaser.GameObjects.Container | null = null;

  public bossBarContainer: Phaser.GameObjects.Container | null = null;
  public bossBarLabel: Phaser.GameObjects.Text | null = null;
  public bossBarFill: Phaser.GameObjects.Rectangle | null = null;

  public braziers: Phaser.GameObjects.Arc[] = [];
  public isReady = false;
  public speedMult: ClashSpeed = 1;
  public soundEnabled = true;
  public skipRequested = false;

  private onReadyCallback?: () => void;
  private renderToken = 0;
  private createdTextureKeys: string[] = [];
  private createdAnimKeys: string[] = [];
  private audioCtx: AudioContext | null = null;

  // Active wave simulation state
  public waveActive = false;
  private currentFloor: FloorMilestone | null = null;
  private waveElapsed = 0;
  private waveIsLongRun = false;
  private waveDamageSamples: { text: string; isCrit: boolean }[] = [];
  private waveDamageCursor = 0;
  private waveEnemyDmgText = "10";
  private waveShouldWipe = false;
  private waveWipeTriggered = false;
  private waveResolve: (() => void) | null = null;
  private totalKills = 0;

  constructor() {
    super("ClashStageScene");
  }

  public setOnReady(cb: () => void): void {
    if (this.isReady) cb();
    else this.onReadyCallback = cb;
  }

  preload(): void {
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

    for (const wpn of WEAPON_ICON_ASSETS) {
      this.load.image(wpn.key, wpn.url);
    }

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
    this.drawDungeonArena();
    this.createSharedAnimations();
    this.createHudOverlays();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.cleanupDynamicAssets();
    });

    this.isReady = true;
    void this.renderParty(this.mainHero, this.alliedParty, this.localVisuals);
    this.onReadyCallback?.();
  }

  private drawDungeonArena(): void {
    const w = ARENA_W;
    const h = ARENA_H;
    const g = this.add.graphics().setDepth(0);

    // Outer dark stone void
    g.fillStyle(0x0b111b, 1);
    g.fillRect(0, 0, w, h);

    // Procedural 32px stone flagstone grid
    const tile = 32;
    for (let ty = 0; ty < h; ty += tile) {
      for (let tx = 0; tx < w; tx += tile) {
        const hash = ((tx * 37 + ty * 73) % 17) / 17;
        const isEdge = tx < tile || ty < tile || tx >= w - tile || ty >= h - tile;
        const baseColor = isEdge
          ? 0x0f172a
          : hash > 0.72
            ? 0x1a2636
            : hash > 0.35
              ? 0x16202e
              : 0x131c28;
        g.fillStyle(baseColor, 1);
        g.fillRect(tx + 1, ty + 1, tile - 2, tile - 2);

        // Subtle stone bevel highlight
        g.fillStyle(0x273549, isEdge ? 0.12 : 0.25);
        g.fillRect(tx + 1, ty + 1, tile - 2, 2);

        // Occasional subtle stone crack / moss speck
        if (!isEdge && hash > 0.84) {
          g.fillStyle(0x2dd4bf, 0.08);
          g.fillRect(tx + 8, ty + 12, 4, 2);
        }
      }
    }

    // Arena inner boundary frame
    g.lineStyle(2, 0x3b8282, 0.38);
    g.strokeRoundedRect(20, 22, w - 40, h - 44, 10);
    g.lineStyle(1, 0x94a3b8, 0.14);
    g.strokeRoundedRect(24, 26, w - 48, h - 52, 8);

    // Center summoning/geo circle
    g.lineStyle(1.5, 0x38bdf8, 0.18);
    g.strokeCircle(w * 0.5, h * 0.5, 58);
    g.lineStyle(1, 0x38bdf8, 0.1);
    g.strokeCircle(w * 0.5, h * 0.5, 92);

    // 4 Corner Braziers with flickering warm glow
    const brazierPos = [
      { x: 42, y: 44 },
      { x: w - 42, y: 44 },
      { x: 42, y: h - 44 },
      { x: w - 42, y: h - 44 },
    ];
    this.braziers = [];
    for (const bp of brazierPos) {
      g.fillStyle(0x334155, 1);
      g.fillCircle(bp.x, bp.y, 7);
      g.fillStyle(0xf97316, 0.9);
      g.fillCircle(bp.x, bp.y - 1, 4);
      const glow = this.add.circle(bp.x, bp.y - 1, 22, 0xfb923c, 0.16).setDepth(3);
      this.braziers.push(glow);
    }

    // Center Geo-Crystal Altar
    this.geoAuraRing = this.add.circle(w * 0.5, h * 0.5, 36, 0x38bdf8, 0.08).setDepth(2);
    this.geoCrystal = this.add
      .sprite(w * 0.5, h * 0.5 - 6, "geo_crystal", 0)
      .setScale(1.65)
      .setAlpha(0.35)
      .setDepth(4);
    this.geoCrystal.play("geo_crystal_idle");

    this.geoLabel = this.add
      .text(w * 0.5, h * 0.5 + 20, "ARENA READY", {
        fontFamily: "monospace",
        fontSize: "9px",
        color: "#94a3b8",
        stroke: "#090d16",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(5);
  }

  private createSharedAnimations(): void {
    for (const enemy of Object.values(ENEMY_CATALOG)) {
      if (!this.anims.exists(`${enemy.spriteKey}_idle`)) {
        this.anims.create({
          key: `${enemy.spriteKey}_idle`,
          frames: this.anims.generateFrameNumbers(enemy.spriteKey, { start: 0, end: 1 }),
          frameRate: 5,
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
  }

  private createHudOverlays(): void {
    this.floorBanner = this.add
      .text(14, 10, "ARENA READY — SELECT AN ITEM TO DIVE", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "12px",
        fontStyle: "bold",
        color: "#e2e8f0",
        stroke: "#090d16",
        strokeThickness: 4,
      })
      .setDepth(85);

    this.comboText = this.add
      .text(ARENA_W - 14, 10, "", {
        fontFamily: "Impact, sans-serif",
        fontSize: "16px",
        color: "#fbbf24",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(1, 0)
      .setDepth(85);

    // Boss HP Bar (top-center)
    this.bossBarContainer = this.add.container(ARENA_W / 2, 26).setDepth(85).setVisible(false);
    const barBg = this.add.rectangle(0, 8, 264, 10, 0x090d16, 0.92).setStrokeStyle(1.5, 0xf59e0b, 0.9);
    this.bossBarFill = this.add
      .rectangle(-130, 8, 260, 6, 0xef4444, 1)
      .setOrigin(0, 0.5);
    this.bossBarLabel = this.add
      .text(0, -6, "BOSS", {
        fontFamily: "Impact, sans-serif",
        fontSize: "12px",
        color: "#fde047",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    this.bossBarContainer.add([barBg, this.bossBarFill, this.bossBarLabel]);

    this.cutInContainer = this.add.container(0, 0).setDepth(95).setVisible(false);
  }

  private cleanupDynamicAssets(): void {
    for (const animKey of this.createdAnimKeys) {
      if (this.anims.exists(animKey)) {
        this.anims.remove(animKey);
      }
    }
    this.createdAnimKeys = [];

    for (const texKey of this.createdTextureKeys) {
      if (this.textures.exists(texKey)) {
        this.textures.remove(texKey);
      }
    }
    this.createdTextureKeys = [];
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

    for (const a of this.partyActors) {
      a.container.destroy();
      a.shadow.destroy();
      a.tag.destroy();
      a.hpBg.destroy();
      a.hpFill.destroy();
    }
    this.partyActors = [];
    this.cleanupDynamicAssets();

    if (!this.isReady || !hero) return;

    const heroClassId = hero.activeClass || "WARRIOR";
    const heroCls = CLASS_CATALOG[heroClassId];
    const members = [
      {
        key: "local",
        name: hero.playerName,
        activeClass: heroClassId,
        classLabel: heroCls.label,
        row: hero.battleRow,
        isMainHero: true,
        isSquadmate: true,
        isRanged: heroCls.isRanged,
        isMage: heroClassId === "MAGE",
        isHealer: heroClassId === "CLERGY",
        outfit: localVisuals?.outfit,
        avatars: localVisuals?.avatars,
        gearSignature: buildRpgGearSignature(hero),
      },
      ...allies.map((a, idx) => {
        const cls = CLASS_CATALOG[a.activeClass];
        return {
          key: `ally_${a.playerId}_${idx}`,
          name: a.playerName,
          activeClass: a.activeClass,
          classLabel: cls.label,
          row: a.battleRow,
          isMainHero: false,
          isSquadmate: a.isSquadmate,
          isRanged: cls.isRanged,
          isMage: a.activeClass === "MAGE",
          isHealer: a.activeClass === "CLERGY",
          outfit: a.outfit,
          avatars: a.avatars,
          gearSignature: a.gearSignature || "",
        };
      }),
    ];

    // Bake 4-directional 92x92 sheets (idle, walking, melee_swing) for default characters
    // or 32x32 strip for custom avatars (e.g. Slime)
    const prepared = await Promise.all(
      members.map(async (m) => {
        const isDefaultChar = !hasCustomAvatarFrames(m.avatars);
        if (isDefaultChar) {
          const resolvedOutfit: Partial<PlayerOutfit> = {
            ...DEFAULT_PLAYER_OUTFIT,
            ...(m.outfit || {}),
          };
          const [idleCanvas, walkCanvas, swingCanvas] = await Promise.all([
            bakeOutfitCanvas(resolvedOutfit, "idle"),
            bakeOutfitCanvas(resolvedOutfit, "walking"),
            bakeOutfitCanvas(resolvedOutfit, "melee_swing"),
          ]);
          return {
            m,
            isDefaultChar: true as const,
            canvases: {
              idle: idleCanvas,
              walking: walkCanvas,
              melee_swing: swingCanvas,
            },
            customStrip: null,
          };
        }

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
              gearSignature: "",
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
              gearSignature: "",
              facingRight: true,
              includeWeapon: false,
              dirIndex: 2,
              frameCol: col,
              isWalk: true,
            });
            sctx.drawImage(walkCell, (4 + col) * 32, 0);
          }
        }
        return {
          m,
          isDefaultChar: false as const,
          canvases: null,
          customStrip: strip,
        };
      })
    );

    if (token !== this.renderToken || !this.scene || !this.sys.isActive()) return;

    const formationOffsets = [
      { x: 0, y: 0 },
      { x: -46, y: -32 },
      { x: 46, y: -32 },
      { x: 0, y: 42 },
    ];

    prepared.forEach((entry, idx) => {
      const { m, isDefaultChar, canvases, customStrip } = entry;
      const offset = formationOffsets[idx % formationOffsets.length];
      const startX = ARENA_W * 0.5 + offset.x;
      const startY = ARENA_H * 0.5 + offset.y;

      const texKeys: Partial<Record<FashionAnimState, string>> = {};
      let customTexKey: string | undefined;

      if (isDefaultChar && canvases) {
        const animStates: FashionAnimState[] = ["idle", "walking", "melee_swing"];
        for (const anim of animStates) {
          const tKey = `clash_${m.key}_${anim}_${token}`;
          if (this.textures.exists(tKey)) this.textures.remove(tKey);
          this.textures.addSpriteSheet(tKey, canvases[anim] as unknown as HTMLImageElement, {
            frameWidth: FASHION_CELL_SIZE,
            frameHeight: FASHION_CELL_SIZE,
          });
          this.textures.get(tKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
          this.createdTextureKeys.push(tKey);
          texKeys[anim] = tKey;

          const spec = FASHION_ANIM_SPECS[anim];
          const frameRate = anim === "melee_swing" ? 14 : spec.frameRate;
          for (let row = 0; row < DIRECTIONS.length; row++) {
            const dir = DIRECTIONS[row];
            const animKey = `${tKey}_${dir}`;
            if (this.anims.exists(animKey)) this.anims.remove(animKey);
            const start = row * spec.cols;
            this.anims.create({
              key: animKey,
              frames: this.anims.generateFrameNumbers(tKey, {
                start,
                end: start + spec.cols - 1,
              }),
              frameRate,
              repeat: spec.repeat,
            });
            this.createdAnimKeys.push(animKey);
          }
        }
      } else if (customStrip) {
        const tKey = `clash_custom_${m.key}_${token}`;
        if (this.textures.exists(tKey)) this.textures.remove(tKey);
        const tex = this.textures.addCanvas(tKey, customStrip);
        if (tex) {
          for (let f = 0; f < 8; f++) {
            tex.add(f, 0, f * 32, 0, 32, 32);
          }
          tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
        }
        this.createdTextureKeys.push(tKey);
        customTexKey = tKey;

        const idleKey = `${tKey}_idle`;
        const walkKey = `${tKey}_walk`;
        if (this.anims.exists(idleKey)) this.anims.remove(idleKey);
        if (this.anims.exists(walkKey)) this.anims.remove(walkKey);
        this.anims.create({
          key: idleKey,
          frames: [0, 1, 2, 3].map((frame) => ({ key: tKey, frame })),
          frameRate: 6,
          repeat: -1,
        });
        this.anims.create({
          key: walkKey,
          frames: [4, 5, 6, 7].map((frame) => ({ key: tKey, frame })),
          frameRate: 8,
          repeat: -1,
        });
        this.createdAnimKeys.push(idleKey, walkKey);
      }

      const shadow = this.add.ellipse(startX, startY + 14, 24, 9, 0x000000, 0.42).setDepth(5);
      const container = this.add.container(startX, startY).setDepth(20);

      const initialTex = isDefaultChar ? texKeys.idle! : customTexKey!;
      const bodySprite = this.add
        .sprite(0, 0, initialTex, 0)
        .setScale(isDefaultChar ? 0.72 : 1.65);

      if (isDefaultChar) {
        bodySprite.play(`${texKeys.idle}_south`);
      } else {
        bodySprite.play(`${customTexKey}_idle`);
      }
      container.add(bodySprite);

      const parsedGear = parseGearSignature(m.gearSignature);
      let weaponSprite: Phaser.GameObjects.Image | null = null;
      if (isDefaultChar) {
        const wpnKey = getBattleWeaponIconKey(
          parsedGear.weaponType,
          parsedGear.weaponRank,
          parsedGear.weaponRarity
        );
        if (wpnKey && this.textures.exists(wpnKey)) {
          weaponSprite = this.add
            .image(11, 6, wpnKey)
            .setScale(0.75)
            .setOrigin(0.22, 0.78)
            .setAngle(18);
          container.add(weaponSprite);
        }
      }

      const hpBg = this.add
        .rectangle(startX, startY + 21, 38, 4, 0x090d16, 0.9)
        .setStrokeStyle(1, 0x334155, 0.9)
        .setDepth(60);
      const hpFill = this.add
        .rectangle(startX - 18, startY + 21, 36, 2.5, 0x10b981, 1)
        .setOrigin(0, 0.5)
        .setDepth(61);

      const color = m.isMainHero ? "#fde68a" : m.isSquadmate ? "#6ee7b7" : "#93c5fd";
      const tag = this.add
        .text(startX, startY + 31, `${m.name.slice(0, 10)} · ${m.classLabel}`, {
          fontFamily: "monospace",
          fontSize: "8.5px",
          fontStyle: m.isMainHero ? "bold" : "normal",
          color,
          stroke: "#090d16",
          strokeThickness: 3,
        })
        .setOrigin(0.5)
        .setDepth(62);

      this.partyActors.push({
        key: m.key,
        name: m.name,
        activeClass: m.activeClass,
        row: m.row,
        isMainHero: m.isMainHero,
        isDefaultChar,
        isRanged: m.isRanged || parsedGear.weaponType === "BOW" || parsedGear.weaponType === "GUN",
        isMage: m.isMage || parsedGear.weaponType === "STAFF",
        isHealer: m.isHealer,
        weaponType: parsedGear.weaponType,
        texKeys,
        customTexKey,
        x: startX,
        y: startY,
        homeX: startX,
        homeY: startY,
        facing: "south",
        isMoving: false,
        isSwinging: false,
        swingTimer: 0,
        attackCooldown: 0.15 + idx * 0.12,
        healCooldown: 1.2,
        strafeSign: idx % 2 === 0 ? 1 : -1,
        patrolTimer: 1.2 + idx * 0.6,
        patrolTargetX: startX,
        patrolTargetY: startY,
        container,
        shadow,
        bodySprite,
        weaponSprite,
        tag,
        hpBg,
        hpFill,
        hpRatio: 1,
        alive: true,
      });
    });
  }

  public resetPartyForExpedition(): void {
    this.totalKills = 0;
    this.clearWaveObjects();
    for (const p of this.partyActors) {
      p.alive = true;
      p.hpRatio = 1;
      p.isSwinging = false;
      p.swingTimer = 0;
      p.x = p.homeX;
      p.y = p.homeY;
      p.container.setPosition(p.x, p.y).setAlpha(1);
      p.shadow.setPosition(p.x, p.y + 14).setAlpha(0.42);
      this.syncActorOverlays(p);
      this.updateActorHpBar(p);
      this.applyActorAnim(p, false);
    }
  }

  public clearWaveObjects(): void {
    for (const e of this.activeEnemies) {
      e.sprite.destroy();
      e.shadow.destroy();
      e.groundRing?.destroy();
      e.nameTag.destroy();
      e.hpBg.destroy();
      e.hpFill.destroy();
      e.hpLabel.destroy();
    }
    this.activeEnemies = [];

    for (const proj of this.projectiles) {
      proj.sprite.destroy();
    }
    this.projectiles = [];

    for (const orb of this.orbs) {
      orb.gfx.destroy();
    }
    this.orbs = [];

    this.bossBarContainer?.setVisible(false);
  }

  public async runWave(floor: FloorMilestone, isLongRun: boolean, combo: number): Promise<void> {
    if (this.skipRequested) return;

    this.currentFloor = floor;
    this.waveElapsed = 0;
    this.waveIsLongRun = isLongRun;
    this.waveShouldWipe = !floor.cleared;
    this.waveWipeTriggered = false;

    const isBossWave = floor.archetype === "GATEKEEPER" || floor.archetype === "ITEM_GOD";

    this.updateHudBanner(floor, combo);
    this.updateGeoCrystal(floor);
    this.spawnWaveEnemies(floor);
    this.prepareWaveDamageSamples(floor);

    if (isBossWave && !this.skipRequested) {
      const isItemGod = floor.archetype === "ITEM_GOD";
      const bossName = floor.bossId ? ENEMY_CATALOG[floor.bossId].name.toUpperCase() : "GATEKEEPER";
      this.cameras.main.shake(isItemGod ? 240 : 160, isItemGod ? 0.015 : 0.01);
      this.playTone(110, 150, "sawtooth", 0.06);
      const cutInText = floor.synergyCombo
        ? `${floor.synergyCombo.initiatorName} × ${floor.synergyCombo.finisherName}: ${floor.synergyCombo.comboName}!`
        : isItemGod
          ? `ITEM GOD WAVE: ${bossName}!`
          : `BOSS WAVE: ${bossName}!`;
      await this.showCutInBanner(cutInText);
    }

    if (this.skipRequested) {
      this.clearWaveObjects();
      return;
    }

    this.waveActive = true;
    await new Promise<void>((resolve) => {
      this.waveResolve = resolve;
    });
    this.waveActive = false;

    if (this.skipRequested) {
      this.clearWaveObjects();
      return;
    }

    if (floor.archetype === "SPECIALIST" && floor.specialistSubdued) {
      this.playTone(784, 140, "sine", 0.06);
      this.spawnBigDamageText(ARENA_W * 0.5, 92, `SUBDUED ${floor.specialistSubdued}!`, true, "#38bdf8");
      await this.waitScaled(320);
    } else if (floor.archetype === "MYSTERY" && floor.karmaShardGain) {
      this.playTone(580, 120, "triangle", 0.05);
      this.spawnBigDamageText(ARENA_W * 0.5, 96, `+${floor.karmaShardGain} KARMA SHARDS!`, true, "#e879f9");
      await this.waitScaled(280);
    } else if (isBossWave && floor.cleared) {
      this.spawnVictoryOrbFountain();
      await this.waitScaled(420);
    }

    if (!floor.cleared) {
      await this.playPartyWipe(floor.floor);
    } else {
      if (!isLongRun && !isBossWave) {
        this.spawnBigDamageText(ARENA_W * 0.5, 86, "WAVE CLEARED!", false, "#6ee7b7");
      }
      await this.waitScaled(isLongRun ? 70 : 280);
    }
  }

  public finishActiveWaveEarly(): void {
    this.waveActive = false;
    this.clearWaveObjects();
    if (this.waveResolve) {
      const r = this.waveResolve;
      this.waveResolve = null;
      r();
    }
  }

  private prepareWaveDamageSamples(floor: FloorMilestone): void {
    const samples: { text: string; isCrit: boolean }[] = [];
    const events: FloorBattleEvent[] = floor.events || [];
    for (const ev of events) {
      if (ev.side === "ALLY" && ev.actionKind !== "HEAL") {
        for (const d of ev.damages) {
          samples.push({
            text: formatBigNumber(d),
            isCrit: ev.isCrit,
          });
        }
      }
      if (ev.side === "ENEMY" && ev.damages[0]) {
        this.waveEnemyDmgText = formatBigNumber(ev.damages[0]);
      }
    }
    if (samples.length === 0) {
      const perHit = toDecimal(floor.totalDamage).div(Math.max(1, floor.enemies.length * 2)).floor();
      samples.push({ text: formatBigNumber(perHit), isCrit: false });
    }
    this.waveDamageSamples = samples;
    this.waveDamageCursor = 0;
  }

  private nextDamageSample(): { text: string; isCrit: boolean } {
    const sample = this.waveDamageSamples[this.waveDamageCursor % this.waveDamageSamples.length];
    this.waveDamageCursor++;
    return sample;
  }

  private spawnWaveEnemies(floor: FloorMilestone): void {
    this.clearWaveObjects();
    const total = floor.enemies.length;

    floor.enemies.forEach((e, idx) => {
      const spriteKey =
        e.enemyId === "specialist"
          ? "enemy_specialist"
          : e.enemyId === "mimic"
            ? "enemy_mimic"
            : ENEMY_CATALOG[e.enemyId]?.spriteKey || "enemy_slime";

      const isBoss = e.isBoss;
      let spawnX = ARENA_W * 0.5;
      let spawnY = 48;

      if (!isBoss) {
        const side = idx % 4;
        const frac = (idx + 0.5) / Math.max(1, total);
        if (side === 0) {
          // Top perimeter
          spawnX = 70 + frac * (ARENA_W - 140);
          spawnY = 34;
        } else if (side === 1) {
          // Right perimeter
          spawnX = ARENA_W - 34;
          spawnY = 60 + frac * (ARENA_H - 120);
        } else if (side === 2) {
          // Bottom perimeter
          spawnX = 70 + frac * (ARENA_W - 140);
          spawnY = ARENA_H - 36;
        } else {
          // Left perimeter
          spawnX = 34;
          spawnY = 60 + frac * (ARENA_H - 120);
        }
      } else {
        // Boss spawns north-center with dramatic entrance
        spawnX = ARENA_W * 0.5 + (Math.random() - 0.5) * 40;
        spawnY = 58;
      }

      const scale = e.tier === "ITEM_GOD" ? 2.45 : isBoss ? 2.15 : 1.55;
      const shadow = this.add.ellipse(spawnX, spawnY + (isBoss ? 24 : 13), isBoss ? 46 : 24, isBoss ? 14 : 8, 0x000000, 0.45).setDepth(5);
      const groundRing = isBoss
        ? this.add
            .circle(spawnX, spawnY + 18, 34, e.tier === "ITEM_GOD" ? 0xfde047 : 0xef4444, 0.16)
            .setStrokeStyle(1.5, e.tier === "ITEM_GOD" ? 0xfde047 : 0xf97316, 0.65)
            .setDepth(6)
        : null;

      const spr = this.add.sprite(spawnX, spawnY, spriteKey, 0).setScale(scale).setDepth(20);
      if (e.tier === "ITEM_GOD") spr.setTint(0xfde047);
      if (this.anims.exists(`${spriteKey}_idle`)) {
        spr.play(`${spriteKey}_idle`);
      }

      const barW = isBoss ? 72 : 36;
      const barTop = spawnY - (isBoss ? 44 : 24);
      const hpBg = this.add
        .rectangle(spawnX, barTop, barW, 5, 0x090d16, 0.92)
        .setStrokeStyle(1, 0x475569, 0.9)
        .setDepth(60);
      const hpFill = this.add
        .rectangle(spawnX - (barW - 2) / 2, barTop, barW - 2, 3, isBoss ? 0xf59e0b : 0xef4444, 1)
        .setOrigin(0, 0.5)
        .setDepth(61);
      const hpLabel = this.add
        .text(spawnX, barTop - 8, formatBigNumber(e.maxHp), {
          fontFamily: "monospace",
          fontSize: "7.5px",
          color: "#cbd5e1",
          stroke: "#090d16",
          strokeThickness: 2,
        })
        .setOrigin(0.5)
        .setDepth(62);

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
      const nameTag = this.add
        .text(spawnX, spawnY + (isBoss ? 34 : 20), e.name, {
          fontFamily: "monospace",
          fontSize: isBoss ? "10px" : "8px",
          fontStyle: isBoss ? "bold" : "normal",
          color: nameColor,
          stroke: "#090d16",
          strokeThickness: 3,
        })
        .setOrigin(0.5)
        .setDepth(62);

      const actor: ActiveEnemyActor = {
        id: `enemy_${idx}`,
        enemyId: e.enemyId,
        name: e.name,
        tier: e.tier,
        spriteKey,
        x: spawnX,
        y: spawnY,
        vx: 0,
        vy: 0,
        speed: isBoss ? 46 : e.enemyId === "bat" ? 86 : 64,
        isBoss,
        alive: true,
        hpRatio: 1,
        maxHpStr: e.maxHp,
        attackCooldown: 0.45 + Math.random() * 0.35,
        hitFlashTimer: 0,
        knockbackX: 0,
        knockbackY: 0,
        sprite: spr,
        shadow,
        groundRing,
        nameTag,
        hpBg,
        hpFill,
        hpLabel,
      };
      this.activeEnemies.push(actor);

      if (isBoss && this.bossBarContainer && this.bossBarLabel && this.bossBarFill) {
        this.bossBarContainer.setVisible(true);
        this.bossBarLabel.setText(
          `${e.name.toUpperCase()} (${formatBigNumber(e.maxHp)} HP)`
        );
        this.bossBarFill.width = 260;
      }
    });
  }

  update(_time: number, delta: number): void {
    if (!this.isReady) return;
    const dt = Math.min(0.05, (delta / 1000) * this.speedMult);

    // Brazier flicker
    for (let i = 0; i < this.braziers.length; i++) {
      const b = this.braziers[i];
      b.setAlpha(0.13 + Math.sin(_time * 0.006 + i * 1.7) * 0.05);
      b.setScale(0.95 + Math.cos(_time * 0.008 + i) * 0.08);
    }

    this.updateOrbs(dt);
    this.updateProjectiles(dt);

    if (!this.waveActive) {
      this.updateIdlePatrol(dt);
      return;
    }

    this.waveElapsed += dt;
    this.updatePartyCombat(dt);
    this.updateEnemiesCombat(dt);

    // Check wave completion or wipe: only advance after all enemies, orbs, and projectiles clear
    const aliveEnemies = this.activeEnemies.filter((e) => e.alive);
    if (
      !this.waveShouldWipe &&
      aliveEnemies.length === 0 &&
      this.orbs.length === 0 &&
      this.projectiles.length === 0
    ) {
      this.completeCurrentWave();
      return;
    }

    // Generous anti-softlock guard (never triggers during normal combat)
    if (!this.waveShouldWipe && this.waveElapsed > 18) {
      for (const e of aliveEnemies) {
        this.killEnemy(e, { text: this.nextDamageSample().text, isCrit: true });
      }
      this.completeCurrentWave();
      return;
    }

    if (this.waveShouldWipe && !this.waveWipeTriggered && this.waveElapsed >= 1.75) {
      this.waveWipeTriggered = true;
      for (const p of this.partyActors) {
        p.hpRatio = 0;
        p.alive = false;
        p.container.setAlpha(0.35);
        this.updateActorHpBar(p);
      }
      this.completeCurrentWave();
    }
  }

  private completeCurrentWave(): void {
    this.waveActive = false;
    if (this.waveResolve) {
      const r = this.waveResolve;
      this.waveResolve = null;
      r();
    }
  }

  private updateIdlePatrol(dt: number): void {
    for (const p of this.partyActors) {
      if (p.isSwinging) continue;
      p.patrolTimer -= dt;
      if (p.patrolTimer <= 0) {
        p.patrolTimer = 2.0 + Math.random() * 2.5;
        p.patrolTargetX = Phaser.Math.Clamp(p.homeX + (Math.random() - 0.5) * 44, ARENA_MARGIN, ARENA_W - ARENA_MARGIN);
        p.patrolTargetY = Phaser.Math.Clamp(p.homeY + (Math.random() - 0.5) * 32, ARENA_MARGIN, ARENA_H - ARENA_MARGIN);
      }

      const dx = p.patrolTargetX - p.x;
      const dy = p.patrolTargetY - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 4) {
        const step = Math.min(dist, 34 * dt);
        p.x += (dx / dist) * step;
        p.y += (dy / dist) * step;
        p.facing = vectorToDirection(dx, dy);
        this.applyActorAnim(p, true);
      } else {
        this.applyActorAnim(p, false);
      }
      this.syncActorPosition(p);
    }
  }

  private updatePartyCombat(dt: number): void {
    const aliveEnemies = this.activeEnemies.filter((e) => e.alive);
    const rushSpec = !!this.mainHero?.aiRules?.rushSpecialist;

    for (let i = 0; i < this.partyActors.length; i++) {
      const p = this.partyActors[i];
      if (!p.alive) continue;

      if (p.isSwinging) {
        p.swingTimer -= dt;
        if (p.swingTimer <= 0) {
          p.isSwinging = false;
        }
        this.syncActorPosition(p);
        continue;
      }

      p.attackCooldown -= dt;
      p.healCooldown -= dt;

      // Clergy periodic heal pulse
      if (p.isHealer && p.healCooldown <= 0) {
        p.healCooldown = 1.45;
        this.playTone(540, 75, "sine", 0.035);
        for (const ally of this.partyActors) {
          if (!ally.alive) continue;
          ally.hpRatio = Math.min(1, ally.hpRatio + 0.18);
          this.updateActorHpBar(ally);
          this.playVfxAt("vfx_heal_sparkle", ally.x, ally.y - 4, 1.15);
        }
      }

      if (aliveEnemies.length === 0) {
        this.applyActorAnim(p, false);
        this.syncActorPosition(p);
        continue;
      }

      // Select target (rushSpecialist prefers SPECIALIST)
      let target = aliveEnemies[0];
      let bestDist = Infinity;
      for (const e of aliveEnemies) {
        const d = Math.hypot(e.x - p.x, e.y - p.y);
        const priorityBonus = rushSpec && e.tier === "SPECIALIST" ? -160 : 0;
        if (d + priorityBonus < bestDist) {
          bestDist = d;
          target = e;
        }
      }

      const dx = target.x - p.x;
      const dy = target.y - p.y;
      const dist = Math.max(1, Math.hypot(dx, dy));
      p.facing = vectorToDirection(dx, dy);

      let moveX = 0;
      let moveY = 0;

      if (p.isRanged || p.isMage) {
        // Ranged/Magic kiting & strafing
        if (dist < 95) {
          moveX = -dx / dist;
          moveY = -dy / dist;
        } else if (dist > 185) {
          moveX = dx / dist;
          moveY = dy / dist;
        } else {
          // Gentle tangential strafe
          moveX = (-dy / dist) * p.strafeSign * 0.65;
          moveY = (dx / dist) * p.strafeSign * 0.65;
        }

        if (p.attackCooldown <= 0) {
          p.attackCooldown = p.isMage ? 0.52 : 0.45;
          const sample = this.nextDamageSample();
          this.spawnProjectile(p, target, p.isMage, p.isMage, sample.text, sample.isCrit);
        }
      } else {
        // Melee pursuit + melee_swing cleave
        const attackRange = target.isBoss ? 68 : 48;
        if (dist > attackRange) {
          moveX = dx / dist;
          moveY = dy / dist;
        } else if (p.attackCooldown <= 0) {
          p.attackCooldown = 0.32;
          this.performMeleeSwing(p, target);
        }
      }

      // Soft separation between party members
      for (let j = 0; j < this.partyActors.length; j++) {
        if (i === j) continue;
        const other = this.partyActors[j];
        const sx = p.x - other.x;
        const sy = p.y - other.y;
        const sd = Math.hypot(sx, sy);
        if (sd > 0 && sd < 30) {
          moveX += (sx / sd) * 0.7;
          moveY += (sy / sd) * 0.7;
        }
      }

      const mLen = Math.hypot(moveX, moveY);
      const isMoving = mLen > 0.08;
      if (isMoving) {
        const speed = p.isRanged ? 115 : 145;
        p.x = Phaser.Math.Clamp(p.x + (moveX / mLen) * speed * dt, ARENA_MARGIN, ARENA_W - ARENA_MARGIN);
        p.y = Phaser.Math.Clamp(p.y + (moveY / mLen) * speed * dt, ARENA_MARGIN, ARENA_H - ARENA_MARGIN);
        p.facing = vectorToDirection(moveX, moveY);
      }

      this.applyActorAnim(p, isMoving);
      this.syncActorPosition(p);
    }
  }

  private performMeleeSwing(actor: ActivePartyActor, target: ActiveEnemyActor): void {
    actor.facing = vectorToDirection(target.x - actor.x, target.y - actor.y);
    actor.isSwinging = true;
    actor.swingTimer = 0.24;

    if (actor.isDefaultChar && actor.texKeys.melee_swing) {
      const animKey = `${actor.texKeys.melee_swing}_${actor.facing}`;
      if (this.anims.exists(animKey)) {
        actor.bodySprite.play(animKey, true);
      }
      if (actor.weaponSprite) {
        this.tweens.add({
          targets: actor.weaponSprite,
          angle: actor.weaponType === "SPEAR" ? 4 : 88,
          duration: 120,
          yoyo: true,
        });
      }
    } else {
      // Custom avatar lunge punch
      this.tweens.add({
        targets: actor.container,
        x: actor.x + (target.x > actor.x ? 10 : -10),
        duration: 90,
        yoyo: true,
      });
    }

    const vfxKey =
      actor.weaponType === "SPEAR"
        ? "vfx_thrust_pierce"
        : actor.weaponType === "FIST"
          ? "vfx_impact_hit"
          : "vfx_slash_arc";

    const angle = directionToAngle(actor.facing);
    const fxX = actor.x + Math.cos(angle) * 24;
    const fxY = actor.y + Math.sin(angle) * 24;
    this.playVfxAt(vfxKey, fxX, fxY, target.isBoss ? 1.65 : 1.35, angle);

    const sample = this.nextDamageSample();
    this.applyDamageToEnemy(target, sample.text, sample.isCrit, actor.x, actor.y);
  }

  private spawnProjectile(
    actor: ActivePartyActor,
    target: ActiveEnemyActor,
    isMagic: boolean,
    isAoE: boolean,
    dmgText: string,
    isCrit: boolean
  ): void {
    if (!this.textures.exists("vfx_projectiles")) return;
    const frameIdx = isMagic ? 2 : actor.weaponType === "GUN" ? 1 : 0;
    const spr = this.add.sprite(actor.x, actor.y - 4, "vfx_projectiles", frameIdx).setScale(1.25).setDepth(55);
    const dx = target.x - actor.x;
    const dy = target.y - actor.y;
    const dist = Math.max(1, Math.hypot(dx, dy));
    const speed = 340;
    spr.setAngle(Phaser.Math.RadToDeg(Math.atan2(dy, dx)));
    this.playTone(isMagic ? 640 : 380, 65, isMagic ? "triangle" : "square", 0.03);

    this.projectiles.push({
      sprite: spr,
      x: actor.x,
      y: actor.y - 4,
      vx: (dx / dist) * speed,
      vy: (dy / dist) * speed,
      target,
      isMagic,
      isAoE,
      dmgText,
      isCrit,
      life: 1.5,
    });
  }

  private updateProjectiles(dt: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.sprite.setPosition(p.x, p.y);

      const hitTarget = p.target.alive && Math.hypot(p.target.x - p.x, p.target.y - p.y) < (p.target.isBoss ? 34 : 22);
      if (hitTarget || p.life <= 0) {
        if (hitTarget) {
          this.playVfxAt(
            p.isMagic ? "vfx_magic_burst" : "vfx_thrust_pierce",
            p.target.x,
            p.target.y - 4,
            p.target.isBoss ? 1.65 : 1.3
          );
          this.applyDamageToEnemy(p.target, p.dmgText, p.isCrit, p.x, p.y);

          if (p.isAoE) {
            let splash = 0;
            for (const other of this.activeEnemies) {
              if (!other.alive || other === p.target) continue;
              if (Math.hypot(other.x - p.target.x, other.y - p.target.y) < 76) {
                this.applyDamageToEnemy(other, p.dmgText, false, p.target.x, p.target.y);
                if (++splash >= 2) break;
              }
            }
          }
        }
        p.sprite.destroy();
        this.projectiles.splice(i, 1);
      }
    }
  }

  private applyDamageToEnemy(
    enemy: ActiveEnemyActor,
    dmgText: string,
    isCrit: boolean,
    fromX: number,
    fromY: number
  ): void {
    if (!enemy.alive) return;

    this.playTone(isCrit ? 190 : 280, 70, "sawtooth", isCrit ? 0.05 : 0.035);
    if (isCrit) {
      this.cameras.main.shake(65, 0.007);
      this.playVfxAt("vfx_crit_flash", enemy.x, enemy.y - 6, 1.35);
    }

    // Calibrated HP chunk so each enemy is visibly engaged and defeated
    const expectedHits = enemy.isBoss ? 8 : this.waveIsLongRun ? 2 : 3;
    const chunk = 1 / expectedHits;
    enemy.hpRatio = Math.max(0, enemy.hpRatio - chunk);
    enemy.hitFlashTimer = 0.11;
    enemy.sprite.setFrame(3);

    const kdx = enemy.x - fromX;
    const kdy = enemy.y - fromY;
    const kdist = Math.max(1, Math.hypot(kdx, kdy));
    const push = enemy.isBoss ? 5 : 12;
    enemy.knockbackX = (kdx / kdist) * push;
    enemy.knockbackY = (kdy / kdist) * push;

    const barW = enemy.isBoss ? 70 : 34;
    enemy.hpFill.width = Math.max(enemy.hpRatio > 0 ? 2 : 0, Math.round(barW * enemy.hpRatio));
    if (enemy.isBoss && this.bossBarFill) {
      this.bossBarFill.width = Math.max(enemy.hpRatio > 0 ? 4 : 0, Math.round(260 * enemy.hpRatio));
    }

    const remHp = toDecimal(enemy.maxHpStr).times(enemy.hpRatio).floor();
    enemy.hpLabel.setText(formatBigNumber(remHp));

    this.spawnBigDamageText(
      enemy.x + (Math.random() - 0.5) * 14,
      enemy.y - (enemy.isBoss ? 34 : 20),
      isCrit ? `${dmgText}!` : dmgText,
      isCrit,
      isCrit ? "#fbbf24" : "#ffffff"
    );

    if (enemy.hpRatio <= 0.01) {
      this.killEnemy(enemy, { text: dmgText, isCrit });
    }
  }

  private killEnemy(enemy: ActiveEnemyActor, _lastHit: { text: string; isCrit: boolean }): void {
    if (!enemy.alive) return;
    enemy.alive = false;
    this.totalKills++;
    if (this.currentFloor && this.totalKills > 0) {
      this.comboText?.setText(`${this.totalKills} KILLS`);
    }

    if (enemy.isBoss) {
      this.cameras.main.flash(110, 255, 240, 200);
      this.cameras.main.shake(180, 0.015);
      this.bossBarContainer?.setVisible(false);
    }

    const orbCount = enemy.isBoss ? 10 : enemy.tier === "SPECIALIST" ? 5 : 3;
    const orbColor = enemy.tier === "SPECIALIST" ? 0x38bdf8 : enemy.isBoss ? 0xfbbf24 : 0x34d399;
    this.spawnMagnetOrbs(enemy.x, enemy.y, orbCount, orbColor);

    this.tweens.add({
      targets: [enemy.sprite, enemy.shadow, enemy.nameTag, enemy.hpBg, enemy.hpFill, enemy.hpLabel, enemy.groundRing].filter(Boolean),
      alpha: 0,
      scale: 0.4,
      duration: 170,
      ease: "Cubic.easeIn",
      onComplete: () => {
        enemy.sprite.destroy();
        enemy.shadow.destroy();
        enemy.groundRing?.destroy();
        enemy.nameTag.destroy();
        enemy.hpBg.destroy();
        enemy.hpFill.destroy();
        enemy.hpLabel.destroy();
      },
    });
  }

  private updateEnemiesCombat(dt: number): void {
    const aliveParty = this.partyActors.filter((p) => p.alive);
    if (aliveParty.length === 0) return;

    for (let i = 0; i < this.activeEnemies.length; i++) {
      const e = this.activeEnemies[i];
      if (!e.alive || !e.sprite.active) continue;

      if (e.hitFlashTimer > 0) {
        e.hitFlashTimer -= dt;
        if (e.hitFlashTimer <= 0 && this.anims.exists(`${e.spriteKey}_idle`)) {
          e.sprite.play(`${e.spriteKey}_idle`, true);
        }
      }

      if (Math.abs(e.knockbackX) > 0.2 || Math.abs(e.knockbackY) > 0.2) {
        e.x = Phaser.Math.Clamp(e.x + e.knockbackX * dt * 8, ARENA_MARGIN, ARENA_W - ARENA_MARGIN);
        e.y = Phaser.Math.Clamp(e.y + e.knockbackY * dt * 8, ARENA_MARGIN, ARENA_H - ARENA_MARGIN);
        e.knockbackX *= Math.max(0, 1 - dt * 10);
        e.knockbackY *= Math.max(0, 1 - dt * 10);
      }

      // Target nearest party member (with slight aggro bias toward FRONT / HEAVY_KNIGHT)
      let target = aliveParty[0];
      let bestScore = Infinity;
      for (const p of aliveParty) {
        const d = Math.hypot(p.x - e.x, p.y - e.y);
        const aggroBias = p.activeClass === "HEAVY_KNIGHT" ? -55 : p.row === "FRONT" ? -25 : 0;
        if (d + aggroBias < bestScore) {
          bestScore = d + aggroBias;
          target = p;
        }
      }

      const dx = target.x - e.x;
      const dy = target.y - e.y;
      const dist = Math.max(1, Math.hypot(dx, dy));
      const meleeRange = e.isBoss ? 56 : 36;

      e.sprite.setFlipX(dx < 0);

      if (dist > meleeRange) {
        let vx = dx / dist;
        let vy = dy / dist;
        // Soft separation from other enemies
        for (let j = 0; j < this.activeEnemies.length; j++) {
          if (i === j || !this.activeEnemies[j].alive) continue;
          const o = this.activeEnemies[j];
          const sx = e.x - o.x;
          const sy = e.y - o.y;
          const sd = Math.hypot(sx, sy);
          if (sd > 0 && sd < 26) {
            vx += (sx / sd) * 0.65;
            vy += (sy / sd) * 0.65;
          }
        }
        const vLen = Math.max(1, Math.hypot(vx, vy));
        e.x = Phaser.Math.Clamp(e.x + (vx / vLen) * e.speed * dt, ARENA_MARGIN, ARENA_W - ARENA_MARGIN);
        e.y = Phaser.Math.Clamp(e.y + (vy / vLen) * e.speed * dt, ARENA_MARGIN, ARENA_H - ARENA_MARGIN);
      } else {
        e.attackCooldown -= dt;
        if (e.attackCooldown <= 0 && e.tier !== "SPECIALIST") {
          e.attackCooldown = e.isBoss ? 0.9 : 1.15;
          e.sprite.stop();
          e.sprite.setFrame(2);
          e.hitFlashTimer = 0.16;

          this.playTone(145, 70, "square", 0.035);
          this.playVfxAt("vfx_enemy_claw", target.x, target.y, 1.2);
          if (target.activeClass === "HEAVY_KNIGHT") {
            this.playVfxAt("vfx_shield_guard", target.x, target.y, 1.15);
          }

          target.bodySprite.setTint(0xfca5a5);
          this.time.delayedCall(90, () => {
            if (target.bodySprite.active) target.bodySprite.clearTint();
          });

          const hitRatio = this.waveShouldWipe ? 0.34 : 0.08;
          target.hpRatio = Math.max(this.waveShouldWipe ? 0 : 0.15, target.hpRatio - hitRatio);
          this.updateActorHpBar(target);
          this.spawnBigDamageText(target.x, target.y - 22, `-${this.waveEnemyDmgText}`, false, "#f87171");
        }
      }

      this.syncEnemyPosition(e);
    }
  }

  private spawnMagnetOrbs(x: number, y: number, count: number, color: number): void {
    if (this.skipRequested) return;
    for (let i = 0; i < count; i++) {
      const ang = (Math.PI * 2 * i) / count + Math.random() * 0.6;
      const spd = 70 + Math.random() * 55;
      const gfx = this.add.circle(x, y, 3.5, color, 0.95).setStrokeStyle(1, 0xffffff, 0.7).setDepth(52);
      this.orbs.push({
        gfx,
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        scatterTime: 0.18 + Math.random() * 0.12,
        age: 0,
      });
    }
  }

  private updateOrbs(dt: number): void {
    const hero = this.partyActors[0];
    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const o = this.orbs[i];
      o.age += dt;
      if (o.age < o.scatterTime) {
        o.x += o.vx * dt;
        o.y += o.vy * dt;
        o.vx *= 0.92;
        o.vy *= 0.92;
      } else if (hero) {
        const dx = hero.x - o.x;
        const dy = hero.y - o.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 14 || o.age > 1.3) {
          o.gfx.destroy();
          this.orbs.splice(i, 1);
          continue;
        }
        const pull = 360 + o.age * 220;
        o.x += (dx / dist) * pull * dt;
        o.y += (dy / dist) * pull * dt;
      }
      o.gfx.setPosition(o.x, o.y);
    }
  }

  private spawnVictoryOrbFountain(): void {
    if (this.skipRequested) return;
    this.spawnMagnetOrbs(ARENA_W * 0.5, ARENA_H * 0.45, 16, 0xfbbf24);
  }

  private applyActorAnim(actor: ActivePartyActor, isMoving: boolean): void {
    if (actor.isSwinging) return;
    actor.isMoving = isMoving;

    if (actor.isDefaultChar) {
      const state: FashionAnimState = isMoving ? "walking" : "idle";
      const tKey = actor.texKeys[state];
      const animKey = tKey ? `${tKey}_${actor.facing}` : "";
      if (tKey && animKey && this.anims.exists(animKey)) {
        if (actor.bodySprite.anims.currentAnim?.key !== animKey || !actor.bodySprite.anims.isPlaying) {
          actor.bodySprite.setTexture(tKey);
          actor.bodySprite.play(animKey, true);
        }
      }
      if (actor.weaponSprite) {
        actor.weaponSprite.x = actor.facing === "west" ? -11 : 11;
        actor.weaponSprite.setFlipX(actor.facing === "west");
      }
    } else if (actor.customTexKey) {
      const animKey = `${actor.customTexKey}_${isMoving ? "walk" : "idle"}`;
      if (this.anims.exists(animKey) && actor.bodySprite.anims.currentAnim?.key !== animKey) {
        actor.bodySprite.play(animKey, true);
      }
      actor.bodySprite.setFlipX(actor.facing === "west");
    }
  }

  private syncActorPosition(actor: ActivePartyActor): void {
    const depth = 10 + Math.round(actor.y * 0.1);
    actor.container.setPosition(actor.x, actor.y).setDepth(depth);
    actor.shadow.setPosition(actor.x, actor.y + 14).setDepth(depth - 1);
    this.syncActorOverlays(actor);
  }

  private syncActorOverlays(actor: ActivePartyActor): void {
    actor.hpBg.setPosition(actor.x, actor.y + 21);
    actor.hpFill.setPosition(actor.x - 18, actor.y + 21);
    actor.tag.setPosition(actor.x, actor.y + 31);
  }

  private syncEnemyPosition(e: ActiveEnemyActor): void {
    const depth = 10 + Math.round(e.y * 0.1);
    const barW = e.isBoss ? 72 : 36;
    const barTop = e.y - (e.isBoss ? 44 : 24);
    e.sprite.setPosition(e.x, e.y).setDepth(depth);
    e.shadow.setPosition(e.x, e.y + (e.isBoss ? 24 : 13)).setDepth(depth - 1);
    e.groundRing?.setPosition(e.x, e.y + 18).setDepth(depth - 2);
    e.hpBg.setPosition(e.x, barTop);
    e.hpFill.setPosition(e.x - (barW - 2) / 2, barTop);
    e.hpLabel.setPosition(e.x, barTop - 8);
    e.nameTag.setPosition(e.x, e.y + (e.isBoss ? 34 : 20));
  }

  private updateActorHpBar(actor: ActivePartyActor): void {
    const ratio = Math.max(0, Math.min(1, actor.hpRatio));
    actor.hpFill.width = Math.max(ratio > 0 ? 2 : 0, Math.round(36 * ratio));
    actor.hpFill.setFillStyle(ratio > 0.5 ? 0x10b981 : ratio > 0.25 ? 0xf59e0b : 0xef4444, 1);
  }

  private updateHudBanner(floor: FloorMilestone, combo: number): void {
    const tag =
      floor.archetype === "ITEM_GOD"
        ? `ITEM GOD WAVE · F${floor.floor}`
        : floor.archetype === "GATEKEEPER"
          ? `BOSS WAVE · F${floor.floor}`
          : floor.archetype === "SPECIALIST"
            ? `SPECIALIST WAVE · F${floor.floor}`
            : floor.archetype === "MYSTERY"
              ? `MYSTERY WAVE · F${floor.floor}`
              : `WAVE F${floor.floor} · ${floor.archetype}`;
    this.floorBanner?.setText(tag);
    this.comboText?.setText(this.totalKills > 0 ? `${this.totalKills} KILLS · ${combo}W` : combo > 1 ? `${combo}x WAVE` : "");
  }

  private updateGeoCrystal(floor: FloorMilestone): void {
    const crystal = this.geoCrystal;
    const label = this.geoLabel;
    if (!crystal || !label) return;

    if (!floor.geoEffect) {
      crystal.setAlpha(0.2).clearTint();
      this.geoAuraRing?.setFillStyle(0x38bdf8, 0.06);
      label.setText(floor.archetype);
      return;
    }

    const def = GEO_EFFECT_CATALOG[floor.geoEffect];
    const hexNum = parseInt(def.color.replace("#", ""), 16);
    crystal.setAlpha(0.95).setTint(hexNum).setScale(1.65);
    this.geoAuraRing?.setFillStyle(hexNum, floor.geoBroken ? 0.04 : 0.14);
    label.setText(floor.geoBroken ? `SHATTERED (${def.label})` : def.label);

    if (floor.geoBroken && !this.skipRequested) {
      this.playTone(620, 90, "triangle", 0.05);
      this.tweens.add({
        targets: crystal,
        scale: 2.5,
        alpha: 0.2,
        duration: 240,
        ease: "Cubic.easeOut",
      });
    }
  }

  private playVfxAt(vfxKey: string, x: number, y: number, scale = 1.4, rotationRad = 0): void {
    if (this.skipRequested || !this.isReady) return;
    if (!this.textures.exists(vfxKey)) return;
    const fx = this.add.sprite(x, y, vfxKey, 0).setScale(scale).setRotation(rotationRad).setDepth(70);
    fx.play(`${vfxKey}_play`);
    fx.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => fx.destroy());
  }

  public spawnBigDamageText(
    x: number,
    y: number,
    value: string,
    isMassive: boolean,
    color = "#FFFFFF"
  ): void {
    if (this.skipRequested || !this.isReady) return;
    const digitsBoost = Math.min(1.4, 1 + Math.max(0, value.length - 3) * 0.05);
    const label = this.add
      .text(x, y, value, {
        fontFamily: "Impact, sans-serif",
        fontSize: isMassive ? "21px" : "15px",
        color,
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setScale(digitsBoost)
      .setDepth(80);

    this.tweens.add({
      targets: label,
      y: y - 34,
      scale: digitsBoost * (isMassive ? 1.15 : 1.0),
      alpha: 0,
      duration: isMassive ? 680 : 400,
      ease: "Cubic.easeOut",
      onComplete: () => label.destroy(),
    });
  }

  private async showCutInBanner(text: string): Promise<void> {
    if (this.skipRequested) return;
    const container = this.cutInContainer;
    if (!container) return;

    container.removeAll(true).setVisible(true);
    const bar = this.add.rectangle(ARENA_W / 2, ARENA_H / 2, ARENA_W, 42, 0x0f172a, 0.92);
    bar.setStrokeStyle(2, 0xeca239);
    const label = this.add
      .text(ARENA_W + 180, ARENA_H / 2, text, {
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
      x: ARENA_W / 2,
      duration: 160,
      ease: "Cubic.easeOut",
    });
    await this.waitScaled(210);
    container.setVisible(false);
  }

  private async playPartyWipe(floorNum: number): Promise<void> {
    this.cameras.main.shake(260, 0.02);
    this.playTone(95, 240, "sawtooth", 0.07);
    this.spawnBigDamageText(ARENA_W * 0.5, ARENA_H * 0.45, `WIPED ON WAVE F${floorNum}`, true, "#ef4444");
    await this.waitScaled(520);
  }

  public showFinalSummaryBanner(result: ExpeditionResult): void {
    const status = result.clearedAll
      ? `CLEARED F${result.startFloor}–F${result.endFloor} · +${formatBigNumber(result.xpGained)} XP`
      : `WIPED AT F${result.wipeFloor} · +${formatBigNumber(result.xpGained)} XP`;
    this.floorBanner?.setText(status);
    this.comboText?.setText(result.karmaGained > 0 ? `+${result.karmaGained} KARMA` : "");
  }

  public playTone(freq: number, durMs: number, type: OscillatorType = "square", vol = 0.045): void {
    if (!this.soundEnabled || this.skipRequested) return;
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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

  private tweenPromise(config: Phaser.Types.Tweens.TweenBuilderConfig): Promise<void> {
    if (this.skipRequested || !this.isReady) return Promise.resolve();
    return new Promise((resolve) => {
      this.tweens.add({
        ...config,
        onComplete: () => resolve(),
      });
    });
  }

  private waitScaled(ms: number): Promise<void> {
    if (this.skipRequested || !this.isReady) return Promise.resolve();
    const scaled = Math.max(12, Math.round(ms / this.speedMult));
    return new Promise((resolve) => {
      this.time.delayedCall(scaled, resolve);
    });
  }
}

export class BattleStageAnimator {
  private container: HTMLElement;
  private game: Phaser.Game | null = null;
  private scene: ClashStageScene;
  private speedMult: ClashSpeed = 1;

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
      width: ARENA_W,
      height: ARENA_H,
      backgroundColor: "#0b111b",
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
    this.scene.speedMult = speed;
    if (this.scene.isReady) {
      this.scene.tweens.timeScale = speed;
      this.scene.anims.globalTimeScale = speed;
    }
  }

  public setSoundEnabled(enabled: boolean): void {
    this.scene.soundEnabled = enabled;
  }

  public requestSkip(): void {
    this.scene.skipRequested = true;
    this.scene.finishActiveWaveEarly();
  }

  public triggerCheerBurst(fromName: string): void {
    if (!this.scene.isReady) return;
    this.scene.spawnBigDamageText(
      ARENA_W * 0.5,
      78,
      `CHEER FROM ${fromName.toUpperCase()}! +20% CRIT!`,
      true,
      "#fbbf24"
    );
  }

  public destroy(): void {
    this.scene.skipRequested = true;
    this.scene.finishActiveWaveEarly();
    if (this.game) {
      this.game.destroy(true);
      this.game = null;
    }
  }

  public async playExpedition(
    result: ExpeditionResult,
    onFloorProgress?: (floor: FloorMilestone) => void
  ): Promise<void> {
    if (!this.scene.isReady) {
      await new Promise<void>((resolve) => this.scene.setOnReady(resolve));
    }

    this.scene.skipRequested = false;
    this.scene.speedMult = this.speedMult;
    this.scene.tweens.timeScale = this.speedMult;
    this.scene.anims.globalTimeScale = this.speedMult;
    this.scene.resetPartyForExpedition();

    const floors = result.floorSummaries;
    const isLongRun = floors.length > 15;
    let combo = 0;

    for (let i = 0; i < floors.length; i++) {
      const floor = floors[i];
      onFloorProgress?.(floor);

      if (this.scene.skipRequested) {
        this.scene.clearWaveObjects();
        this.scene.showFinalSummaryBanner(result);
        break;
      }

      combo += 1;
      await this.scene.runWave(floor, isLongRun, combo);

      if (!floor.cleared) {
        break;
      }
    }

    this.scene.clearWaveObjects();
    this.scene.showFinalSummaryBanner(result);
  }
}
