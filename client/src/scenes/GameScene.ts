import Phaser from "phaser";
import { MultiplayerManager } from "../network/MultiplayerManager";
import { VoiceManager } from "../network/VoiceManager";
import {
  TILE_SIZE,
  GRID_COLS,
  GRID_ROWS,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  PLAYER_RADIUS,
  CHARACTER_MAX_SIZE,
  PLAYER_SPEED,
  PlayerAvatars,
  DEFAULT_AVATARS,
  normalizeFrames,
  getTileCenter,
  getTileCoords,
  isWallTile,
  resolveMovement,
  PLAYER_FEET_TOP_OFFSET,
  PLAYER_FEET_BOTTOM_OFFSET,
  PrivateZone,
} from "shared";

interface PlayerVisual {
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Image;
  nameTag: Phaser.GameObjects.Text;
  currentDirection: "idle" | "left" | "right" | "up" | "down";
  avatars?: PlayerAvatars;
  animTimer: number;
  currentFrameIdx: number;
  lastMoveTime: number;
  speechBubble?: Phaser.GameObjects.Container;
  speechBubbleTimer?: Phaser.Time.TimerEvent;
  speakingIndicator?: Phaser.GameObjects.Container;
}

export class GameScene extends Phaser.Scene {
  private multiplayer!: MultiplayerManager;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };

  private playerVisuals: Map<string, PlayerVisual> = new Map();
  private localPlayerId: string | null = null;
  private lastInputState = { left: false, right: false, up: false, down: false };
  public controlsActive = true;
  public virtualInput = { left: false, right: false, up: false, down: false };
  public voiceManager: VoiceManager | null = null;
  private speakingPlayers: Set<string> = new Set();

  // Player Interaction Context Menu
  public onPlayerClick?: (playerData: {
    sessionId: string;
    name: string;
    color: string;
    isSuperadmin: boolean;
    worldX: number;
    worldY: number;
  }) => void;
  public onPlayerMenuPositionUpdate?: (pos: {
    sessionId: string;
    screenX: number;
    screenY: number;
    visible: boolean;
  }) => void;
  public activeMenuSessionId: string | null = null;

  // Map Editor State
  public isEditMode: boolean = false;
  public activeEditorTool:
    | "flooring"
    | "decoration"
    | "clear_decoration"
    | "private_zone"
    | "clear_private_zone"
    | "obstacle"
    | "clear_obstacle" = "flooring";
  public selectedAssetKey: string = "birch_floor_150";
  public selectedTileColor: string | null = null;
  private isSelectingArea: boolean = false;
  private selectionStartTile: { x: number; y: number } | null = null;
  private selectionCurrentTile: { x: number; y: number } | null = null;

  // Private Zones State & Effects
  public privateZones: PrivateZone[] = [];
  public currentInsideZone: PrivateZone | null = null;
  public onRequestNameForNewZone?: (
    bounds: { minCol: number; minRow: number; maxCol: number; maxRow: number },
    defaultName: string
  ) => void;
  private onZoneChangeCallbacks: ((zone: PrivateZone | null) => void)[] = [];
  private onPrivateZonesListChangeCallbacks: ((zones: PrivateZone[]) => void)[] = [];
  private darknessAlpha: number = 0;
  private targetDarknessAlpha: number = 0;

  // Tile images grid [row][col], top decoration images grid, and state
  private tileImages: (Phaser.GameObjects.Image | null)[][] = [];
  private decorationImages: (Phaser.GameObjects.Image | null)[][] = [];
  private currentTilesMap: Map<string, string> = new Map();
  private obstacleTiles: Set<string> = new Set();

  // Graphics overlays
  private gridGraphics!: Phaser.GameObjects.Graphics;
  private privateZonesGraphics!: Phaser.GameObjects.Graphics;
  private obstaclesGraphics!: Phaser.GameObjects.Graphics;
  private outsideDarkGraphics!: Phaser.GameObjects.Graphics;
  private privateSpotlightGraphics!: Phaser.GameObjects.Graphics;
  private editorHoverGraphics!: Phaser.GameObjects.Graphics;
  private editorSelectionGraphics!: Phaser.GameObjects.Graphics;
  private editorOverlayText!: Phaser.GameObjects.Text;
  private isRightMouseDown: boolean = false;
  private panStartPoint: { x: number; y: number; scrollX: number; scrollY: number } | null = null;

  constructor() {
    super({ key: "GameScene" });
  }

  init(data: { multiplayer: MultiplayerManager; voiceManager?: VoiceManager }) {
    this.multiplayer = data?.multiplayer;
    if (data?.voiceManager) {
      this.voiceManager = data.voiceManager;
    }
  }

  preload() {
    this.load.image("grass_tile", "/assets/grass_150.png");
    this.load.image("grass_150", "/assets/grass_150.png");
    this.load.image("birch_floor_150", "/assets/birch_floor_150.png");
    this.load.image("grass_100", "/assets/grass_150.png");
    this.load.image("birch_floor_100", "/assets/birch_floor_150.png");
    this.load.image("wall_half_150", "/assets/wall_half_150.png");
    this.load.image("wall_top_150", "/assets/wall_top_150.png");
    this.load.image("table_left_150", "/assets/table_left_150.png");

    // Default character avatar frames
    this.load.image("default_avatar_idle", "/assets/man_still.png");
    this.load.image("default_avatar_left_0", "/assets/male_move_left_1.png");
    this.load.image("default_avatar_left_1", "/assets/male_move_left_2.png");
    this.load.image("default_avatar_right_0", "/assets/male_move_right_1.png");
    this.load.image("default_avatar_right_1", "/assets/male_move_right_2.png");
    this.load.image("default_avatar_up_0", "/assets/male_move_up_1.png");
    this.load.image("default_avatar_up_1", "/assets/male_move_up_2.png");
    this.load.image("default_avatar_down_0", "/assets/male_move_down_1.png");
    this.load.image("default_avatar_down_1", "/assets/male_move_down_2.png");
  }

  create() {
    if (!this.multiplayer) {
      console.error("MultiplayerManager not provided to GameScene");
      return;
    }

    // World & Camera bounds
    this.cameras.main.setBackgroundColor(0x142020);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setRoundPixels(true);
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // Center camera on world center immediately
    this.cameras.main.centerOn(WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
    this.cameras.main.setZoom(1.0);

    // Keep camera viewport aligned on browser resize
    this.scale.on("resize", (gameSize: Phaser.Structs.Size) => {
      this.cameras.main.setSize(gameSize.width, gameSize.height);
      if (this.localPlayerId && !this.isEditMode) {
        const localVisual = this.playerVisuals.get(this.localPlayerId);
        if (localVisual) {
          this.cameras.main.centerOn(localVisual.container.x, localVisual.container.y);
        }
      }
    });

    // Dynamic plain color tile texture (white with subtle bevel) for solid color tiles
    if (!this.textures.exists("color_tile")) {
      const g = this.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0xffffff, 1);
      g.fillRect(0, 0, 150, 150);
      g.lineStyle(2, 0x000000, 0.08);
      g.strokeRect(1, 1, 148, 148);
      g.generateTexture("color_tile", 150, 150);
      g.destroy();
    }

    // Background fully rendered with grass_150.png on each 50x50 tile as base
    const bgTileSprite = this.add.tileSprite(0, 0, WORLD_WIDTH, WORLD_HEIGHT, "grass_tile");
    bgTileSprite.setOrigin(0, 0);
    bgTileSprite.setTileScale(TILE_SIZE / 150, TILE_SIZE / 150);
    bgTileSprite.setDepth(0);

    // Interactive per-tile images grid for custom flooring
    this.tileImages = [];
    for (let row = 0; row < GRID_ROWS; row++) {
      this.tileImages[row] = [];
      for (let col = 0; col < GRID_COLS; col++) {
        const img = this.add.image(col * TILE_SIZE, row * TILE_SIZE, "grass_150");
        img.setOrigin(0, 0);
        img.setDisplaySize(TILE_SIZE, TILE_SIZE);
        img.setDepth(0.1);
        this.tileImages[row][col] = img;
      }
    }

    // Top decoration per-tile images grid (placed on top of bottom tile)
    this.decorationImages = [];
    for (let row = 0; row < GRID_ROWS; row++) {
      this.decorationImages[row] = [];
      for (let col = 0; col < GRID_COLS; col++) {
        const decoImg = this.add.image(col * TILE_SIZE, row * TILE_SIZE, "table_left_150");
        decoImg.setOrigin(0, 0);
        decoImg.setDisplaySize(TILE_SIZE, TILE_SIZE);
        decoImg.setDepth(0.2);
        decoImg.setVisible(false);
        this.decorationImages[row][col] = decoImg;
      }
    }

    // Grid lines graphics (dynamically highlighted in edit mode)
    this.gridGraphics = this.add.graphics();
    this.drawGrid(false);

    // Private zones ambient outline on ground (depth 4)
    this.privateZonesGraphics = this.add.graphics();
    this.privateZonesGraphics.setDepth(4);

    // Obstacle highlight overlay on ground (depth 5, visible only in edit mode)
    this.obstaclesGraphics = this.add.graphics();
    this.obstaclesGraphics.setDepth(5);

    // Dimming overlay outside active private zone (depth 120, above player containers at depth 100)
    this.outsideDarkGraphics = this.add.graphics();
    this.outsideDarkGraphics.setDepth(120);

    // Spotlight glowing boundary & accents around active private zone (depth 125)
    this.privateSpotlightGraphics = this.add.graphics();
    this.privateSpotlightGraphics.setDepth(125);

    // Map Editor Hover and Selection graphics overlays
    this.editorHoverGraphics = this.add.graphics();
    this.editorHoverGraphics.setDepth(130);

    this.editorSelectionGraphics = this.add.graphics();
    this.editorSelectionGraphics.setDepth(132);

    this.editorOverlayText = this.add.text(0, 0, "", {
      fontSize: "13px",
      fontFamily: "Inter, system-ui, sans-serif",
      backgroundColor: "rgba(20, 32, 32, 0.94)",
      color: "#ffffff",
      padding: { x: 10, y: 6 },
    });
    this.editorOverlayText.setDepth(135);
    this.editorOverlayText.setVisible(false);

    // Outer perimeter boundary border
    const boundsGraphics = this.add.graphics();
    boundsGraphics.lineStyle(3, 0x1e3131, 0.9);
    boundsGraphics.strokeRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    boundsGraphics.setDepth(2);

    // Keyboard inputs
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasdKeys = {
        W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };

      if (this.controlsActive) {
        this.registerKeyCaptures();
      } else {
        this.input.keyboard.enabled = false;
      }
    }

    // Generate 1x1 transparent texture for sprite initialization
    if (!this.textures.exists("empty_pixel")) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0xffffff, 0);
      g.fillRect(0, 0, 1, 1);
      g.generateTexture("empty_pixel", 1, 1);
      g.destroy();
    }

    // Hook up multiplayer events
    this.multiplayer.onPlayerAdd((sessionId, player) => {
      this.createPlayerVisual(sessionId, player);
    });

    this.multiplayer.onPlayerChange((sessionId, player) => {
      this.updatePlayerVisual(sessionId, player);
    });

    this.multiplayer.onPlayerRemove((sessionId) => {
      this.removePlayerVisual(sessionId);
    });

    this.multiplayer.onPlayerAvatars((sessionId, avatars) => {
      this.setPlayerAvatars(sessionId, avatars);
    });

    // Hook up map tile updates from multiplayer
    this.multiplayer.onTilesUpdated((updates) => {
      this.applyTileUpdates(updates);
    });
    if (this.multiplayer.currentTiles && Object.keys(this.multiplayer.currentTiles).length > 0) {
      this.applyTileUpdates(this.multiplayer.currentTiles);
    }

    // Hook up private zones updates from multiplayer
    this.multiplayer.onPrivateZonesUpdated((zones) => {
      this.applyPrivateZones(zones);
    });
    if (this.multiplayer.currentPrivateZones && this.multiplayer.currentPrivateZones.length > 0) {
      this.applyPrivateZones(this.multiplayer.currentPrivateZones);
    }

    // Pointer events for Map Editor (click and drag to select area)
    this.setupEditorPointerEvents();

    // If room already has players on scene start
    if (this.multiplayer.room) {
      this.localPlayerId = this.multiplayer.sessionId || null;
      this.multiplayer.room.state.players.forEach((player: any, sessionId: string) => {
        this.createPlayerVisual(sessionId, player);
      });
    }

    (window as any).leparkGame = {
      scene: this,
      getLocalPlayerPos: () => {
        const v = this.playerVisuals.get(this.localPlayerId || "");
        return v ? { x: v.container.x, y: v.container.y } : null;
      },
      walk: (dir: "up" | "down" | "left" | "right", durationMs: number = 600) => {
        this.virtualInput[dir] = true;
        setTimeout(() => {
          this.virtualInput[dir] = false;
        }, durationMs);
      },
      setWalking: (dir: "up" | "down" | "left" | "right", active: boolean) => {
        this.virtualInput[dir] = active;
      },
    };
  }

  public resetPlayers() {
    this.resetTiles();
    this.playerVisuals.forEach((visual) => {
      visual.container.destroy();
    });
    this.playerVisuals.clear();
    this.localPlayerId = null;
    this.cameras.main.stopFollow();
    this.cameras.main.centerOn(WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
  }

  public respawnCurrentPlayers() {
    if (this.multiplayer?.room?.state?.players) {
      this.localPlayerId = this.multiplayer.sessionId || null;
      this.multiplayer.room.state.players.forEach((player: any, sessionId: string) => {
        this.createPlayerVisual(sessionId, player);
      });
    }
  }

  private parseColor(colorStr: string): number {
    try {
      const hex = colorStr.replace("#", "");
      return parseInt(hex, 16) || 0x3b8282;
    } catch {
      return 0x3b8282;
    }
  }

  private createPlayerVisual(sessionId: string, player: any) {
    if (this.playerVisuals.has(sessionId)) return;

    const colorNum = this.parseColor(player.color);

    // Sprite for avatar (defaults to male character sprite)
    const sprite = this.add.image(0, 0, "default_avatar_idle");
    sprite.setVisible(true);
    sprite.setDisplaySize(CHARACTER_MAX_SIZE, CHARACTER_MAX_SIZE);

    // Name text floating above sprite with native background pill
    const crownPrefix = player.isSuperadmin ? "👑 " : "";
    const displayName = `${crownPrefix}${player.name || "Player"}`;
    const nameTag = this.add.text(0, -CHARACTER_MAX_SIZE / 2 - 12, displayName, {
      fontFamily: "Outfit, sans-serif",
      fontSize: "11px",
      fontStyle: "bold",
      color: "#0f172a",
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      padding: { x: 7, y: 2.5 },
      align: "center",
    });
    nameTag.setOrigin(0.5, 0.5);

    const spawnX = typeof player.x === "number" ? player.x : WORLD_WIDTH / 2;
    const spawnY = typeof player.y === "number" ? player.y : WORLD_HEIGHT / 2;
    const coords = getTileCoords(spawnX, spawnY);
    const container = this.add.container(spawnX, spawnY, [sprite, nameTag]);
    container.setDepth(100);

    // If another player, add clickable hit zone to container to show player interaction menu (e.g. Whisper)
    if (sessionId !== this.multiplayer.sessionId) {
      const hitZone = this.add.rectangle(0, -6, 64, 76, 0x000000, 0);
      hitZone.setInteractive({ useHandCursor: true });
      hitZone.on(
        "pointerdown",
        (
          pointer: Phaser.Input.Pointer,
          _localX: number,
          _localY: number,
          event: Phaser.Types.Input.EventData,
        ) => {
          if (!pointer.leftButtonDown()) return;
          if (this.isEditMode) return;
          event.stopPropagation();

          const vis = this.playerVisuals.get(sessionId);
          if (!vis) return;

          this.activeMenuSessionId = sessionId;
          if (this.onPlayerClick) {
            this.onPlayerClick({
              sessionId,
              name: player.name || "Player",
              color: player.color || "#3b82f6",
              isSuperadmin: !!player.isSuperadmin,
              worldX: vis.container.x,
              worldY: vis.container.y,
            });
          }
        },
      );
      container.add(hitZone);
    }

    const visual: PlayerVisual = {
      container,
      sprite,
      nameTag,
      currentDirection: (player.direction as any) || "idle",
      animTimer: 0,
      currentFrameIdx: 0,
      lastMoveTime: 0,
    };
    this.playerVisuals.set(sessionId, visual);

    console.log(`🎮 Spawned player for ${player.name} (${sessionId}) at tile (${coords.tileX}, ${coords.tileY})`);

    // If local player, center camera immediately on container and follow smoothly
    if (sessionId === this.multiplayer.sessionId) {
      this.localPlayerId = sessionId;
      this.cameras.main.centerOn(container.x, container.y);
      this.cameras.main.startFollow(container, true, 0.12, 0.12);
    }

    // Check if avatars are already available for this player
    const existingAvatars = this.multiplayer.playerAvatarsMap.get(sessionId);
    this.setPlayerAvatars(sessionId, existingAvatars || null);
  }

  private getVisualFrames(sessionId: string, dir: "idle" | "left" | "right" | "up" | "down"): string[] {
    const visual = this.playerVisuals.get(sessionId);
    if (!visual) return ["default_avatar_idle"];

    if (visual.avatars) {
      const customForDir: string[] = [];
      for (let i = 0; i < 6; i++) {
        const k = `avatar_${sessionId}_${dir}_${i}`;
        if (this.textures.exists(k)) customForDir.push(k);
      }
      if (customForDir.length > 0) return customForDir;

      const customIdle: string[] = [];
      for (let i = 0; i < 6; i++) {
        const k = `avatar_${sessionId}_idle_${i}`;
        if (this.textures.exists(k)) customIdle.push(k);
      }
      if (customIdle.length > 0) return customIdle;
    }

    if (dir === "left") {
      return ["default_avatar_left_0", "default_avatar_left_1"];
    }
    if (dir === "right") {
      return ["default_avatar_right_0", "default_avatar_right_1"];
    }
    if (dir === "up") {
      return ["default_avatar_up_0", "default_avatar_up_1"];
    }
    if (dir === "down") {
      return ["default_avatar_down_0", "default_avatar_down_1"];
    }
    return ["default_avatar_idle"];
  }

  private cleanupCustomAvatars(sessionId: string) {
    const visual = this.playerVisuals.get(sessionId);
    if (visual && visual.sprite) {
      try {
        visual.sprite.setTexture("default_avatar_idle");
      } catch (_) {}
    }

    const dirs: ("idle" | "left" | "right" | "up" | "down")[] = [
      "idle",
      "left",
      "right",
      "up",
      "down",
    ];
    dirs.forEach((dir) => {
      for (let i = 0; i < 6; i++) {
        const texKey = `avatar_${sessionId}_${dir}_${i}`;
        if (this.textures.exists(texKey)) {
          this.textures.remove(texKey);
        }
      }
    });
  }

  public setPlayerAvatars(sessionId: string, avatars: PlayerAvatars | null) {
    const visual = this.playerVisuals.get(sessionId);
    if (!visual) return;

    const dirs: ("idle" | "left" | "right" | "up" | "down")[] = [
      "idle",
      "left",
      "right",
      "up",
      "down",
    ];

    const hasCustomUploads = avatars && dirs.some((dir) => {
      const frames = normalizeFrames(avatars[dir]);
      return frames.some((f) => typeof f === "string" && f.startsWith("data:image/"));
    });

    if (!hasCustomUploads) {
      this.cleanupCustomAvatars(sessionId);
      visual.avatars = undefined;
      visual.sprite.setVisible(true);
      this.updateVisualSprite(sessionId);
      return;
    }

    visual.avatars = avatars || undefined;
    visual.sprite.setVisible(true);

    dirs.forEach((dir) => {
      let frames = normalizeFrames(avatars?.[dir]);
      if (frames.length === 0 && avatars?.idle) {
        frames = normalizeFrames(avatars.idle);
      }
      if (frames.length === 0) return;

      frames.slice(0, 6).forEach((frameSrc, idx) => {
        if (!frameSrc || !frameSrc.startsWith("data:image/")) return;

        const texKey = `avatar_${sessionId}_${dir}_${idx}`;
        const img = new Image();
        img.onload = () => {
          try {
            if (this.textures.exists(texKey)) {
              this.textures.remove(texKey);
            }
            this.textures.addImage(texKey, img);
            const tex = this.textures.get(texKey);
            if (tex) {
              tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
            }
          } catch (e) {
            console.warn("Failed registering texture:", texKey, e);
          }
          this.updateVisualSprite(sessionId);
        };
        img.src = frameSrc;
      });
    });
  }

  private updateVisualSprite(sessionId: string) {
    const visual = this.playerVisuals.get(sessionId);
    if (!visual) return;

    const dir = visual.currentDirection || "idle";
    const frames = this.getVisualFrames(sessionId, dir);
    const frameKey = frames[visual.currentFrameIdx % frames.length] || "default_avatar_idle";

    try {
      if (this.textures.exists(frameKey)) {
        visual.sprite.setTexture(frameKey);
      } else if (this.textures.exists("default_avatar_idle")) {
        visual.sprite.setTexture("default_avatar_idle");
      }

      const MAX_DIM = CHARACTER_MAX_SIZE;
      const fw = visual.sprite.width;
      const fh = visual.sprite.height;

      if (fw > 0 && fh > 0) {
        const ratio = Math.min(MAX_DIM / fw, MAX_DIM / fh);
        visual.sprite.setDisplaySize(fw * ratio, fh * ratio);
      } else {
        visual.sprite.setDisplaySize(MAX_DIM, MAX_DIM);
      }

      const halfH = Math.max(PLAYER_RADIUS, visual.sprite.displayHeight / 2);
      visual.nameTag.setPosition(0, -halfH - 12);
    } catch (e) {
      console.warn("Visual update error:", e);
    }
  }

  private updatePlayerVisual(sessionId: string, player: any) {
    const visual = this.playerVisuals.get(sessionId);
    if (!visual) return;

    // Update name
    const crownPrefix = player.isSuperadmin ? "👑 " : "";
    const expectedName = `${crownPrefix}${player.name || "Player"}`;
    if (visual.nameTag.text !== expectedName) {
      visual.nameTag.setText(expectedName);
    }

    // For remote player, if server says idle, immediately ensure direction and animation stop
    if (sessionId !== this.localPlayerId) {
      if (player.direction === "idle" && visual.currentDirection !== "idle") {
        visual.currentDirection = "idle";
        visual.currentFrameIdx = 0;
        visual.animTimer = 0;
        this.updateVisualSprite(sessionId);
      }
    }

    // For local player, reconcile with authoritative server position smoothly
    if (sessionId === this.localPlayerId) {
      const dist = Phaser.Math.Distance.Between(
        visual.container.x,
        visual.container.y,
        player.x,
        player.y
      );

      // Hard teleport only if discrepancy is massive (e.g. initial spawn or boundary correction)
      if (dist > 120) {
        visual.container.x = player.x;
        visual.container.y = player.y;
      } else if (dist > 25) {
        // Soft reconciliation glide (smooth lerp with zero snapping)
        visual.container.x = Phaser.Math.Linear(visual.container.x, player.x, 0.15);
        visual.container.y = Phaser.Math.Linear(visual.container.y, player.y, 0.15);
      }
    }
  }

  private removePlayerVisual(sessionId: string) {
    if (this.activeMenuSessionId === sessionId) {
      this.closePlayerMenu();
    }
    this.cleanupCustomAvatars(sessionId);
    const visual = this.playerVisuals.get(sessionId);
    if (visual) {
      if (visual.speechBubbleTimer) {
        visual.speechBubbleTimer.remove(false);
      }
      visual.container.destroy();
      this.playerVisuals.delete(sessionId);
    }
  }

  public closePlayerMenu() {
    if (!this.activeMenuSessionId) return;
    this.activeMenuSessionId = null;
    if (this.onPlayerMenuPositionUpdate) {
      this.onPlayerMenuPositionUpdate({
        sessionId: "",
        screenX: 0,
        screenY: 0,
        visible: false,
      });
    }
  }

  public showSpeechBubble(sessionId: string, text: string, isWhisper = false) {
    const visual = this.playerVisuals.get(sessionId);
    if (!visual) return;

    // Clean up existing speech bubble if any
    if (visual.speechBubbleTimer) {
      visual.speechBubbleTimer.remove(false);
      visual.speechBubbleTimer = undefined;
    }
    if (visual.speechBubble) {
      visual.speechBubble.destroy();
      visual.speechBubble = undefined;
    }

    // Limit text length for bubble
    const prefix = isWhisper ? "🔒 " : "";
    const cleanText = prefix + (text.length > 50 ? text.slice(0, 47) + "..." : text);

    // Create speech bubble container
    const bubbleContainer = this.add.container(0, -CHARACTER_MAX_SIZE / 2 - 34);

    const bubbleText = this.add.text(0, 0, cleanText, {
      fontFamily: "Outfit, sans-serif",
      fontSize: "11px",
      fontStyle: "600",
      color: "#0f172a",
      align: "center",
      wordWrap: { width: 160 },
    });
    bubbleText.setOrigin(0.5, 0.5);

    const padX = 10;
    const padY = 6;
    const bw = Math.max(36, bubbleText.width + padX * 2);
    const bh = bubbleText.height + padY * 2;

    const bgGraphics = this.add.graphics();
    // Drop shadow
    bgGraphics.fillStyle(0x000000, 0.25);
    bgGraphics.fillRoundedRect(-bw / 2 + 1, -bh / 2 + 2, bw, bh, 8);
    // Bubble body
    bgGraphics.fillStyle(isWhisper ? 0xf0f9ff : 0xffffff, 0.98);
    bgGraphics.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 8);
    bgGraphics.lineStyle(1.5, isWhisper ? 0x0284c7 : 0x3b8282, 0.85);
    bgGraphics.strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, 8);

    // Pointer tail
    bgGraphics.fillStyle(isWhisper ? 0xf0f9ff : 0xffffff, 0.98);
    bgGraphics.beginPath();
    bgGraphics.moveTo(-4, bh / 2 - 0.5);
    bgGraphics.lineTo(4, bh / 2 - 0.5);
    bgGraphics.lineTo(0, bh / 2 + 5);
    bgGraphics.closePath();
    bgGraphics.fillPath();

    bubbleContainer.add([bgGraphics, bubbleText]);
    visual.container.add(bubbleContainer);
    visual.speechBubble = bubbleContainer;

    // Pop-in animation
    bubbleContainer.setScale(0.7);
    bubbleContainer.setAlpha(0);
    this.tweens.add({
      targets: bubbleContainer,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 180,
      ease: "Back.easeOut",
    });

    // Auto fade-out after 4.5s
    visual.speechBubbleTimer = this.time.delayedCall(4500, () => {
      if (visual.speechBubble === bubbleContainer) {
        this.tweens.add({
          targets: bubbleContainer,
          alpha: 0,
          scaleY: 0.8,
          duration: 300,
          ease: "Cubic.easeIn",
          onComplete: () => {
            if (visual.speechBubble === bubbleContainer) {
              visual.speechBubble.destroy();
              visual.speechBubble = undefined;
            }
          },
        });
      }
    });
  }

  public setPlayerSpeaking(sessionId: string, speaking: boolean) {
    const visual = this.playerVisuals.get(sessionId);
    if (!visual) return;

    if (speaking) {
      this.speakingPlayers.add(sessionId);
      if (visual.speakingIndicator) {
        if (sessionId !== this.localPlayerId && this.voiceManager) {
          const vol = this.voiceManager.getPeerVolume(sessionId);
          visual.speakingIndicator.setVisible(vol > 0.02);
        }
        return;
      }

      const indicator = this.add.container(0, -CHARACTER_MAX_SIZE / 2 - 24);

      // Outer glowing ring
      const ring = this.add.graphics();
      ring.lineStyle(2, 0x10b981, 0.9);
      ring.strokeCircle(0, 0, 11);
      ring.fillStyle(0x10b981, 0.25);
      ring.fillCircle(0, 0, 11);

      // Inner icon
      const micText = this.add.text(0, 0, "🎙️", {
        fontSize: "10px",
      });
      micText.setOrigin(0.5, 0.5);

      indicator.add([ring, micText]);
      indicator.setScale(0.85);

      this.tweens.add({
        targets: indicator,
        scaleX: 1.12,
        scaleY: 1.12,
        alpha: 0.85,
        yoyo: true,
        repeat: -1,
        duration: 380,
        ease: "Sine.easeInOut",
      });

      // If remote peer, check if audible
      if (sessionId !== this.localPlayerId && this.voiceManager) {
        const vol = this.voiceManager.getPeerVolume(sessionId);
        indicator.setVisible(vol > 0.02);
      }

      visual.container.add(indicator);
      visual.speakingIndicator = indicator;
    } else {
      this.speakingPlayers.delete(sessionId);
      if (visual.speakingIndicator) {
        visual.speakingIndicator.destroy();
        visual.speakingIndicator = undefined;
      }
    }
  }

  public setControlsActive(active: boolean) {
    this.controlsActive = active;

    if (!active) {
      // Unregister / clear captures so HTML inputs receive typing without interference
      if (this.input.keyboard) {
        this.input.keyboard.clearCaptures();
        this.input.keyboard.resetKeys();
        this.input.keyboard.enabled = false;
      }

      // Immediately stop any local movement
      if (
        this.lastInputState.left ||
        this.lastInputState.right ||
        this.lastInputState.up ||
        this.lastInputState.down
      ) {
        this.lastInputState = { left: false, right: false, up: false, down: false };
        this.multiplayer.sendInput(this.lastInputState);
      }

      if (this.localPlayerId) {
        const localVisual = this.playerVisuals.get(this.localPlayerId);
        if (localVisual && localVisual.currentDirection !== "idle") {
          localVisual.currentDirection = "idle";
          this.updateVisualSprite(this.localPlayerId);
        }
      }
    } else {
      // Re-enable keyboard and register captures
      if (this.input.keyboard) {
        this.input.keyboard.enabled = true;
        this.input.keyboard.resetKeys();
        this.registerKeyCaptures();
      }
    }
  }

  private registerKeyCaptures() {
    if (!this.input.keyboard) return;
    this.input.keyboard.addCapture([
      Phaser.Input.Keyboard.KeyCodes.W,
      Phaser.Input.Keyboard.KeyCodes.A,
      Phaser.Input.Keyboard.KeyCodes.S,
      Phaser.Input.Keyboard.KeyCodes.D,
      Phaser.Input.Keyboard.KeyCodes.UP,
      Phaser.Input.Keyboard.KeyCodes.DOWN,
      Phaser.Input.Keyboard.KeyCodes.LEFT,
      Phaser.Input.Keyboard.KeyCodes.RIGHT,
      Phaser.Input.Keyboard.KeyCodes.SPACE,
    ]);
  }

  update(time: number, delta: number) {
    const dtSeconds = delta / 1000;

    // In Edit Mode, WASD / Arrow Keys pan the camera smoothly instead of moving player
    if (this.isEditMode) {
      const panSpeed = 700 * dtSeconds;
      let camDx = 0;
      let camDy = 0;
      if (this.cursors) {
        if (this.cursors.left.isDown || this.wasdKeys.A.isDown) camDx -= panSpeed;
        if (this.cursors.right.isDown || this.wasdKeys.D.isDown) camDx += panSpeed;
        if (this.cursors.up.isDown || this.wasdKeys.W.isDown) camDy -= panSpeed;
        if (this.cursors.down.isDown || this.wasdKeys.S.isDown) camDy += panSpeed;
      }
      if (camDx !== 0 || camDy !== 0) {
        this.cameras.main.scrollX = Phaser.Math.Clamp(
          this.cameras.main.scrollX + camDx,
          0,
          Math.max(0, WORLD_WIDTH - this.cameras.main.width)
        );
        this.cameras.main.scrollY = Phaser.Math.Clamp(
          this.cameras.main.scrollY + camDy,
          0,
          Math.max(0, WORLD_HEIGHT - this.cameras.main.height)
        );
      }

      // Reset any active walking inputs
      if (
        this.lastInputState.left ||
        this.lastInputState.right ||
        this.lastInputState.up ||
        this.lastInputState.down
      ) {
        this.lastInputState = { left: false, right: false, up: false, down: false };
        this.multiplayer.sendInput(this.lastInputState);
      }
      return;
    }

    // 1. Read input state (only when controls are active)
    let left = false;
    let right = false;
    let up = false;
    let down = false;

    if (this.controlsActive && this.cursors) {
      left = this.cursors.left.isDown || this.wasdKeys.A.isDown || this.virtualInput.left;
      right = this.cursors.right.isDown || this.wasdKeys.D.isDown || this.virtualInput.right;
      up = this.cursors.up.isDown || this.wasdKeys.W.isDown || this.virtualInput.up;
      down = this.cursors.down.isDown || this.wasdKeys.S.isDown || this.virtualInput.down;
    }

    // Send input whenever state changed
    if (
      left !== this.lastInputState.left ||
      right !== this.lastInputState.right ||
      up !== this.lastInputState.up ||
      down !== this.lastInputState.down
    ) {
      this.lastInputState = { left, right, up, down };
      this.multiplayer.sendInput(this.lastInputState);
    }

    // 2. Local player continuous movement (smooth client-side prediction)
    if (this.localPlayerId) {
      const localVisual = this.playerVisuals.get(this.localPlayerId);
      if (localVisual) {
        let vx = 0;
        let vy = 0;
        if (left) vx -= 1;
        if (right) vx += 1;
        if (up) vy -= 1;
        if (down) vy += 1;

        let targetDir: "idle" | "left" | "right" | "up" | "down" = "idle";

        if (vx !== 0 || vy !== 0) {
          if (Math.abs(vx) >= Math.abs(vy)) {
            targetDir = vx < 0 ? "left" : "right";
          } else {
            targetDir = vy < 0 ? "up" : "down";
          }

          try {
            const resolved = resolveMovement(
              localVisual.container.x,
              localVisual.container.y,
              vx,
              vy,
              dtSeconds,
              (c, r) => isWallTile(this.currentTilesMap.get(`${c},${r}`))
            );

            localVisual.container.x = resolved.x;
            localVisual.container.y = resolved.y;
          } catch (e) {
            console.error("resolveMovement error:", e);
          }
        }

        if (localVisual.currentDirection !== targetDir) {
          localVisual.currentDirection = targetDir;
          try {
            this.updateVisualSprite(this.localPlayerId);
          } catch (e) {
            console.warn("updateVisualSprite error:", e);
          }
        }
      }
    }

    // 3. Snapshot Interpolation for remote players (anti-jitter pipeline)
    const interpolation = this.multiplayer.si.calcInterpolation("x y");
    const interpolatedIds = new Set<string>();

    if (interpolation && interpolation.state) {
      interpolation.state.forEach((item: any) => {
        if (item.id !== this.localPlayerId) {
          interpolatedIds.add(item.id);
          const remoteVisual = this.playerVisuals.get(item.id);
          if (remoteVisual) {
            // Determine direction based on movement delta
            const dx = item.x - remoteVisual.container.x;
            const dy = item.y - remoteVisual.container.y;
            const dist = Math.hypot(dx, dy);

            let remoteDir: "idle" | "left" | "right" | "up" | "down" = "idle";
            if (dist > 0.8) {
              remoteVisual.lastMoveTime = time;
              if (Math.abs(dx) >= Math.abs(dy)) {
                remoteDir = dx > 0 ? "right" : "left";
              } else {
                remoteDir = dy > 0 ? "down" : "up";
              }
            } else {
              remoteDir = "idle";
            }

            // Authoritative server direction check
            const serverPlayer = this.multiplayer.room?.state?.players?.get(item.id);
            if (serverPlayer && serverPlayer.direction === "idle") {
              remoteDir = "idle";
            }

            if (remoteVisual.currentDirection !== remoteDir) {
              remoteVisual.currentDirection = remoteDir;
              if (remoteDir === "idle") {
                remoteVisual.currentFrameIdx = 0;
                remoteVisual.animTimer = 0;
              }
              this.updateVisualSprite(item.id);
            }

            // Smoothly move remote visual to interpolated server coordinates
            remoteVisual.container.x = item.x;
            remoteVisual.container.y = item.y;
          }
        }
      });
    }

    // Safeguard for all remote players: if player stopped moving, timed out, or server is idle, stop animation immediately
    this.playerVisuals.forEach((visual, sId) => {
      if (sId === this.localPlayerId) return;

      const serverPlayer = this.multiplayer.room?.state?.players?.get(sId);
      const isServerIdle = !serverPlayer || serverPlayer.direction === "idle";
      const hasTimedOut = (time - visual.lastMoveTime) > 80;

      if ((!interpolatedIds.has(sId) || hasTimedOut || isServerIdle) && visual.currentDirection !== "idle") {
        visual.currentDirection = "idle";
        visual.currentFrameIdx = 0;
        visual.animTimer = 0;
        this.updateVisualSprite(sId);

        if (serverPlayer && typeof serverPlayer.x === "number" && typeof serverPlayer.y === "number") {
          visual.container.x = serverPlayer.x;
          visual.container.y = serverPlayer.y;
        }
      }
    });

    // 4. Animate walking sprites (~6 FPS)
    const FRAME_DURATION = 0.166;
    this.playerVisuals.forEach((visual, sId) => {
      if (visual.currentDirection !== "idle") {
        visual.animTimer += dtSeconds;
        if (visual.animTimer >= FRAME_DURATION) {
          visual.animTimer -= FRAME_DURATION;
          const frames = this.getVisualFrames(sId, visual.currentDirection);
          if (frames.length > 1) {
            visual.currentFrameIdx = (visual.currentFrameIdx + 1) % frames.length;
            this.updateVisualSprite(sId);
          }
        }
      } else {
        if (visual.currentFrameIdx !== 0 || visual.animTimer !== 0) {
          visual.currentFrameIdx = 0;
          visual.animTimer = 0;
          this.updateVisualSprite(sId);
        }
      }
    });

    // 5. Private Area Detection & Dynamic Outside Dimming
    let insideZone: PrivateZone | null = null;
    if (this.localPlayerId) {
      const localVisual = this.playerVisuals.get(this.localPlayerId);
      if (localVisual) {
        // Evaluate feet center position of the character
        const px = localVisual.container.x;
        const py = localVisual.container.y + (PLAYER_FEET_TOP_OFFSET + PLAYER_FEET_BOTTOM_OFFSET) / 2;
        const col = Math.floor(px / TILE_SIZE);
        const row = Math.floor(py / TILE_SIZE);

        insideZone = this.privateZones.find(
          (z) =>
            col >= z.bounds.minCol &&
            col <= z.bounds.maxCol &&
            row >= z.bounds.minRow &&
            row <= z.bounds.maxRow
        ) || null;
      }
    }

    const prevInsideId = this.currentInsideZone?.id || null;
    const newInsideId = insideZone?.id || null;
    if (prevInsideId !== newInsideId) {
      this.currentInsideZone = insideZone;
      this.notifyZoneChanged(insideZone);
    }

    // Modal-like darkening: when inside a private area, everything outside dims to 72% opacity
    this.targetDarknessAlpha = insideZone ? 0.72 : 0;
    if (Math.abs(this.darknessAlpha - this.targetDarknessAlpha) > 0.003) {
      this.darknessAlpha = Phaser.Math.Linear(this.darknessAlpha, this.targetDarknessAlpha, 0.14);
    } else {
      this.darknessAlpha = this.targetDarknessAlpha;
    }

    this.drawOutsideDarkness();

    // 6. Proximity & Private Zone Voice Audio Attenuation
    if (this.voiceManager && this.localPlayerId) {
      const localVisual = this.playerVisuals.get(this.localPlayerId);
      if (localVisual) {
        const lx = localVisual.container.x;
        const ly = localVisual.container.y;
        const localZone = this.currentInsideZone;

        this.playerVisuals.forEach((peerVisual, peerSessionId) => {
          if (peerSessionId === this.localPlayerId) return;

          const px = peerVisual.container.x;
          const py = peerVisual.container.y;

          // Check if peer is in any private zone
          const pCol = Math.floor(px / TILE_SIZE);
          const pRow = Math.floor(py / TILE_SIZE);
          const peerZone = this.privateZones.find(
            (z) =>
              pCol >= z.bounds.minCol &&
              pCol <= z.bounds.maxCol &&
              pRow >= z.bounds.minRow &&
              pRow <= z.bounds.maxRow,
          ) || null;

          let volume = 0;
          if (localZone) {
            // Local player is in private area:
            // "if user in private area, no proximity in the private area. everyone hear the same."
            if (peerZone && peerZone.id === localZone.id) {
              volume = 1.0;
            } else {
              volume = 0.0;
            }
          } else {
            // Local player is in public area:
            // "if user in public area, it will be a proximity voice chat."
            if (peerZone) {
              // Peer is in a private area: completely muted from outside
              volume = 0.0;
            } else {
              // Both in public area: proximity voice chat
              const dist = Phaser.Math.Distance.Between(lx, ly, px, py);
              const MIN_DIST = 1 * TILE_SIZE; // 1 tile (48px): 100% volume
              const MAX_DIST = 3 * TILE_SIZE; // 3 tiles (144px): 0% volume (cannot hear each other)
              if (dist <= MIN_DIST) {
                volume = 1.0;
              } else if (dist >= MAX_DIST) {
                volume = 0.0;
              } else {
                // Smooth natural cosine acoustic rolloff
                const factor = (dist - MIN_DIST) / (MAX_DIST - MIN_DIST);
                volume = Math.cos(factor * (Math.PI / 2));
              }
            }
          }

          this.voiceManager!.setPeerVolume(peerSessionId, volume);

          // Update speaking indicator visibility: only show if audible to local player
          if (peerVisual.speakingIndicator) {
            peerVisual.speakingIndicator.setVisible(volume > 0.02);
          }
        });
      }
    }

    // 7. Update active player menu screen position
    if (this.activeMenuSessionId) {
      const vis = this.playerVisuals.get(this.activeMenuSessionId);
      if (!vis || !vis.container.visible) {
        this.closePlayerMenu();
      } else {
        const cam = this.cameras.main;
        const worldX = vis.container.x;
        const worldY = vis.container.y - CHARACTER_MAX_SIZE / 2 - 20;
        const screenX = (worldX - cam.scrollX) * cam.zoom;
        const screenY = (worldY - cam.scrollY) * cam.zoom;
        if (this.onPlayerMenuPositionUpdate) {
          this.onPlayerMenuPositionUpdate({
            sessionId: this.activeMenuSessionId,
            screenX,
            screenY,
            visible: true,
          });
        }
      }
    }
  }

  // ==========================================
  // Map Editor Methods & Visuals
  // ==========================================

  private drawGrid(isEditMode: boolean) {
    this.gridGraphics.clear();
    if (isEditMode) {
      this.gridGraphics.lineStyle(1, 0x3b8282, 0.28);
    } else {
      this.gridGraphics.lineStyle(1, 0x000000, 0.06);
    }
    for (let x = 0; x <= WORLD_WIDTH; x += TILE_SIZE) {
      this.gridGraphics.lineBetween(x, 0, x, WORLD_HEIGHT);
    }
    for (let y = 0; y <= WORLD_HEIGHT; y += TILE_SIZE) {
      this.gridGraphics.lineBetween(0, y, WORLD_WIDTH, y);
    }
    this.gridGraphics.setDepth(1);
  }

  private setupEditorPointerEvents() {
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      // Whenever user clicks on empty canvas, close any active player menu
      this.closePlayerMenu();

      // Whenever user clicks on canvas, blur any active input element so WASD works immediately
      if (document.activeElement && document.activeElement !== document.body) {
        const el = document.activeElement as HTMLElement;
        if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT") {
          el.blur();
        }
      }
      const anyModalOpen = document.querySelector(".modal-overlay:not(.hidden)");
      if (!anyModalOpen && !this.controlsActive) {
        this.setControlsActive(true);
      }

      if (!this.isEditMode) return;
      const target = pointer.event.target as HTMLElement;
      if (target && target.tagName !== "CANVAS") return;

      if (pointer.leftButtonDown()) {
        const col = Math.max(0, Math.min(GRID_COLS - 1, Math.floor(pointer.worldX / TILE_SIZE)));
        const row = Math.max(0, Math.min(GRID_ROWS - 1, Math.floor(pointer.worldY / TILE_SIZE)));
        this.isSelectingArea = true;
        this.selectionStartTile = { x: col, y: row };
        this.selectionCurrentTile = { x: col, y: row };
        this.updateSelectionVisuals();
      } else if (pointer.rightButtonDown() || pointer.middleButtonDown()) {
        this.isRightMouseDown = true;
        this.panStartPoint = {
          x: pointer.x,
          y: pointer.y,
          scrollX: this.cameras.main.scrollX,
          scrollY: this.cameras.main.scrollY,
        };
      }
    });

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (!this.isEditMode) return;

      if (this.isRightMouseDown && this.panStartPoint) {
        const dx = (pointer.x - this.panStartPoint.x) / this.cameras.main.zoom;
        const dy = (pointer.y - this.panStartPoint.y) / this.cameras.main.zoom;
        this.cameras.main.scrollX = this.panStartPoint.scrollX - dx;
        this.cameras.main.scrollY = this.panStartPoint.scrollY - dy;
        return;
      }

      const target = pointer.event.target as HTMLElement;
      if (target && target.tagName !== "CANVAS") {
        this.editorHoverGraphics.clear();
        return;
      }

      const col = Math.max(0, Math.min(GRID_COLS - 1, Math.floor(pointer.worldX / TILE_SIZE)));
      const row = Math.max(0, Math.min(GRID_ROWS - 1, Math.floor(pointer.worldY / TILE_SIZE)));

      if (this.isSelectingArea && this.selectionStartTile) {
        this.selectionCurrentTile = { x: col, y: row };
        this.updateSelectionVisuals();
      } else {
        this.editorHoverGraphics.clear();

        if (this.activeEditorTool === "private_zone") {
          const hoverColor = 0x8b5cf6;
          this.editorHoverGraphics.lineStyle(2, hoverColor, 0.95);
          this.editorHoverGraphics.strokeRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          this.editorHoverGraphics.fillStyle(hoverColor, 0.28);
          this.editorHoverGraphics.fillRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        } else if (this.activeEditorTool === "clear_private_zone") {
          const hoverColor = 0xf43f5e;
          this.editorHoverGraphics.lineStyle(2, hoverColor, 0.95);
          this.editorHoverGraphics.strokeRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          this.editorHoverGraphics.fillStyle(hoverColor, 0.28);
          this.editorHoverGraphics.fillRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        } else if (this.activeEditorTool === "obstacle") {
          const hoverColor = 0xef4444;
          this.editorHoverGraphics.lineStyle(2, hoverColor, 0.95);
          this.editorHoverGraphics.strokeRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          this.editorHoverGraphics.fillStyle(hoverColor, 0.32);
          this.editorHoverGraphics.fillRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        } else if (this.activeEditorTool === "clear_obstacle") {
          const hoverColor = 0xf43f5e;
          this.editorHoverGraphics.lineStyle(2, hoverColor, 0.95);
          this.editorHoverGraphics.strokeRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          this.editorHoverGraphics.fillStyle(hoverColor, 0.28);
          this.editorHoverGraphics.fillRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        } else if (this.activeEditorTool === "clear_decoration") {
          const hoverColor = 0xf59e0b;
          this.editorHoverGraphics.lineStyle(2, hoverColor, 0.95);
          this.editorHoverGraphics.strokeRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          this.editorHoverGraphics.fillStyle(hoverColor, 0.28);
          this.editorHoverGraphics.fillRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        } else if (this.activeEditorTool === "decoration") {
          const defaultHover = 0x10b981;
          const hoverColor = this.selectedTileColor ? this.parseColor(this.selectedTileColor) : defaultHover;
          this.editorHoverGraphics.lineStyle(2, hoverColor, 0.95);
          this.editorHoverGraphics.strokeRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          this.editorHoverGraphics.fillStyle(hoverColor, 0.26);
          this.editorHoverGraphics.fillRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        } else {
          const isWall = isWallTile(this.selectedAssetKey);
          const defaultHover = isWall ? 0xdb5b47 : 0xeca239;
          const hoverColor = this.selectedTileColor ? this.parseColor(this.selectedTileColor) : defaultHover;
          this.editorHoverGraphics.lineStyle(2, hoverColor, 0.95);
          this.editorHoverGraphics.strokeRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          this.editorHoverGraphics.fillStyle(hoverColor, 0.22);
          this.editorHoverGraphics.fillRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
      }
    });

    this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      if (pointer.button === 2 || pointer.button === 1) {
        this.isRightMouseDown = false;
        this.panStartPoint = null;
      }

      if (!this.isEditMode) return;

      if (this.isSelectingArea && this.selectionStartTile && this.selectionCurrentTile) {
        const minCol = Math.min(this.selectionStartTile.x, this.selectionCurrentTile.x);
        const maxCol = Math.max(this.selectionStartTile.x, this.selectionCurrentTile.x);
        const minRow = Math.min(this.selectionStartTile.y, this.selectionCurrentTile.y);
        const maxRow = Math.max(this.selectionStartTile.y, this.selectionCurrentTile.y);

        if (this.activeEditorTool === "private_zone") {
          // Flag this area as a private zone
          const zoneNumber = this.privateZones.length + 1;
          const defaultName = `Private Area ${zoneNumber}`;
          const bounds = { minCol, minRow, maxCol, maxRow };

          if (this.onRequestNameForNewZone) {
            this.onRequestNameForNewZone(bounds, defaultName);
          } else {
            this.createPrivateZone(bounds, defaultName);
          }
        } else if (this.activeEditorTool === "clear_private_zone") {
          // Remove any private zones that overlap with the selected rectangle
          const prevLen = this.privateZones.length;
          this.privateZones = this.privateZones.filter((z) => {
            const noOverlap =
              maxCol < z.bounds.minCol ||
              minCol > z.bounds.maxCol ||
              maxRow < z.bounds.minRow ||
              minRow > z.bounds.maxRow;
            return noOverlap;
          });

          if (this.privateZones.length !== prevLen) {
            if (
              this.currentInsideZone &&
              !this.privateZones.some((z) => z.id === this.currentInsideZone?.id)
            ) {
              this.currentInsideZone = null;
              this.notifyZoneChanged(null);
            }
            if (this.multiplayer) {
              this.multiplayer.sendUpdatePrivateZones(this.privateZones);
            }
            this.drawPrivateZones();
            this.notifyPrivateZonesListChange();
          }
        } else if (this.activeEditorTool === "obstacle") {
          // Place obstacle barrier layer onto selected rectangle
          const updates: Record<string, string> = {};
          for (let r = minRow; r <= maxRow; r++) {
            for (let c = minCol; c <= maxCol; c++) {
              const existing = this.currentTilesMap.get(`${c},${r}`);
              if (existing) {
                const parts = existing.split("::");
                if (!parts.includes("obstacle")) {
                  updates[`${c},${r}`] = `${existing}::obstacle`;
                }
              } else {
                updates[`${c},${r}`] = "grass_150::obstacle";
              }
            }
          }

          if (Object.keys(updates).length > 0) {
            this.applyTileUpdates(updates);
            if (this.multiplayer) {
              this.multiplayer.sendUpdateTiles(updates);
            }
          }
        } else if (this.activeEditorTool === "clear_obstacle") {
          // Remove obstacle layer from selected rectangle
          const updates: Record<string, string> = {};
          for (let r = minRow; r <= maxRow; r++) {
            for (let c = minCol; c <= maxCol; c++) {
              const existing = this.currentTilesMap.get(`${c},${r}`);
              if (existing && existing.includes("obstacle")) {
                const parts = existing
                  .split("::")
                  .filter((p) => p !== "obstacle" && !p.startsWith("obstacle|"));
                const newVal = parts.join("::") || "grass_150";
                if (newVal !== existing) {
                  updates[`${c},${r}`] = newVal;
                }
              }
            }
          }

          if (Object.keys(updates).length > 0) {
            this.applyTileUpdates(updates);
            if (this.multiplayer) {
              this.multiplayer.sendUpdateTiles(updates);
            }
          }
        } else if (this.activeEditorTool === "clear_decoration") {
          // Remove decoration layer from selected rectangle, keeping the bottom tile & obstacle
          const updates: Record<string, string> = {};
          for (let r = minRow; r <= maxRow; r++) {
            for (let c = minCol; c <= maxCol; c++) {
              const existing = this.currentTilesMap.get(`${c},${r}`);
              if (existing && existing.includes("::")) {
                const parts = existing.split("::");
                const basePart = parts[0] || "grass_150";
                const hasObs = parts.includes("obstacle");
                const newVal = hasObs ? `${basePart}::obstacle` : basePart;
                if (newVal !== existing) {
                  updates[`${c},${r}`] = newVal;
                }
              }
            }
          }

          if (Object.keys(updates).length > 0) {
            this.applyTileUpdates(updates);
            if (this.multiplayer) {
              this.multiplayer.sendUpdateTiles(updates);
            }
          }
        } else if (this.activeEditorTool === "decoration") {
          // Decoration placed on top of existing bottom tile, preserving obstacle if present
          const decoVal = this.selectedTileColor
            ? `${this.selectedAssetKey}|${this.selectedTileColor}`
            : this.selectedAssetKey;

          const updates: Record<string, string> = {};
          for (let r = minRow; r <= maxRow; r++) {
            for (let c = minCol; c <= maxCol; c++) {
              const existing = this.currentTilesMap.get(`${c},${r}`);
              let basePart = "grass_150";
              let hasObs = false;
              if (existing) {
                const parts = existing.split("::");
                basePart = parts[0] || "grass_150";
                hasObs = parts.includes("obstacle");
              }
              updates[`${c},${r}`] = hasObs
                ? `${basePart}::${decoVal}::obstacle`
                : `${basePart}::${decoVal}`;
            }
          }

          this.applyTileUpdates(updates);

          if (this.multiplayer) {
            this.multiplayer.sendUpdateTiles(updates);
          }
        } else {
          // Normal tile flooring / wall update:
          // Wall tiles come together with the obstacle tile
          const isWall =
            this.selectedAssetKey === "wall_half_150" ||
            this.selectedAssetKey === "wall_top_150";
          const tileVal = this.selectedTileColor
            ? `${this.selectedAssetKey}|${this.selectedTileColor}`
            : this.selectedAssetKey;

          const updates: Record<string, string> = {};
          for (let r = minRow; r <= maxRow; r++) {
            for (let c = minCol; c <= maxCol; c++) {
              const existing = this.currentTilesMap.get(`${c},${r}`);
              if (existing && existing.includes("::")) {
                const parts = existing.split("::");
                const hasObs = parts.includes("obstacle");
                const nonObs = parts.filter((p) => p !== "obstacle");
                const decoPart = nonObs.length > 1 ? nonObs[1] : null;

                const newParts = [tileVal];
                if (decoPart) newParts.push(decoPart);

                // The wall will come together with the obstacle tile.
                // If replacing a wall with non-wall floor, remove the wall's obstacle.
                const existingIsWall = parts.some(
                  (p) => p.startsWith("wall_half_150") || p.startsWith("wall_top_150")
                );
                const shouldHaveObstacle = isWall || (hasObs && !existingIsWall);
                if (shouldHaveObstacle) newParts.push("obstacle");

                updates[`${c},${r}`] = newParts.join("::");
              } else {
                if (isWall) {
                  updates[`${c},${r}`] = `${tileVal}::obstacle`;
                } else {
                  updates[`${c},${r}`] = tileVal;
                }
              }
            }
          }

          this.applyTileUpdates(updates);

          if (this.multiplayer) {
            this.multiplayer.sendUpdateTiles(updates);
          }
        }

        this.isSelectingArea = false;
        this.selectionStartTile = null;
        this.selectionCurrentTile = null;
        this.editorSelectionGraphics.clear();
        this.editorOverlayText.setVisible(false);
      }
    });

    this.input.on("wheel", (_pointer: any, _objs: any, _dx: number, dy: number) => {
      if (!this.isEditMode) return;
      const currentZoom = this.cameras.main.zoom;
      const newZoom = Phaser.Math.Clamp(currentZoom - dy * 0.001, 0.5, 1.6);
      this.cameras.main.setZoom(newZoom);
    });
  }

  private updateSelectionVisuals() {
    if (!this.selectionStartTile || !this.selectionCurrentTile) return;

    const minCol = Math.min(this.selectionStartTile.x, this.selectionCurrentTile.x);
    const maxCol = Math.max(this.selectionStartTile.x, this.selectionCurrentTile.x);
    const minRow = Math.min(this.selectionStartTile.y, this.selectionCurrentTile.y);
    const maxRow = Math.max(this.selectionStartTile.y, this.selectionCurrentTile.y);

    const cols = maxCol - minCol + 1;
    const rows = maxRow - minRow + 1;
    const totalTiles = cols * rows;

    const rx = minCol * TILE_SIZE;
    const ry = minRow * TILE_SIZE;
    const rw = cols * TILE_SIZE;
    const rh = rows * TILE_SIZE;

    this.editorSelectionGraphics.clear();

    if (this.activeEditorTool === "private_zone") {
      // Violet private area selection visuals
      this.editorSelectionGraphics.fillStyle(0x8b5cf6, 0.32);
      this.editorSelectionGraphics.fillRect(rx, ry, rw, rh);

      this.editorSelectionGraphics.lineStyle(2.5, 0xa78bfa, 1);
      this.editorSelectionGraphics.strokeRect(rx, ry, rw, rh);

      // Inner grid dashed lines
      this.editorSelectionGraphics.lineStyle(1, 0xffffff, 0.35);
      for (let c = 1; c < cols; c++) {
        const gx = rx + c * TILE_SIZE;
        this.editorSelectionGraphics.lineBetween(gx, ry, gx, ry + rh);
      }
      for (let r = 1; r < rows; r++) {
        const gy = ry + r * TILE_SIZE;
        this.editorSelectionGraphics.lineBetween(rx, gy, rx + rw, gy);
      }

      this.editorOverlayText.setText(
        `🔒 ${cols} × ${rows} (${totalTiles} ${totalTiles === 1 ? "tile" : "tiles"}) • Flag as Private Area`
      );
    } else if (this.activeEditorTool === "clear_private_zone") {
      // Rose clear selection visuals
      this.editorSelectionGraphics.fillStyle(0xf43f5e, 0.32);
      this.editorSelectionGraphics.fillRect(rx, ry, rw, rh);

      this.editorSelectionGraphics.lineStyle(2.5, 0xfb7185, 1);
      this.editorSelectionGraphics.strokeRect(rx, ry, rw, rh);

      // Inner grid dashed lines
      this.editorSelectionGraphics.lineStyle(1, 0xffffff, 0.35);
      for (let c = 1; c < cols; c++) {
        const gx = rx + c * TILE_SIZE;
        this.editorSelectionGraphics.lineBetween(gx, ry, gx, ry + rh);
      }
      for (let r = 1; r < rows; r++) {
        const gy = ry + r * TILE_SIZE;
        this.editorSelectionGraphics.lineBetween(rx, gy, rx + rw, gy);
      }

      this.editorOverlayText.setText(
        `✕ ${cols} × ${rows} (${totalTiles} ${totalTiles === 1 ? "tile" : "tiles"}) • Clear Private Area`
      );
    } else if (this.activeEditorTool === "obstacle") {
      // Crimson barrier obstacle selection visuals
      this.editorSelectionGraphics.fillStyle(0xef4444, 0.32);
      this.editorSelectionGraphics.fillRect(rx, ry, rw, rh);

      this.editorSelectionGraphics.lineStyle(2.5, 0xf87171, 1);
      this.editorSelectionGraphics.strokeRect(rx, ry, rw, rh);

      // Inner grid lines
      this.editorSelectionGraphics.lineStyle(1, 0xffffff, 0.35);
      for (let c = 1; c < cols; c++) {
        const gx = rx + c * TILE_SIZE;
        this.editorSelectionGraphics.lineBetween(gx, ry, gx, ry + rh);
      }
      for (let r = 1; r < rows; r++) {
        const gy = ry + r * TILE_SIZE;
        this.editorSelectionGraphics.lineBetween(rx, gy, rx + rw, gy);
      }

      this.editorOverlayText.setText(
        `🚫 ${cols} × ${rows} (${totalTiles} ${totalTiles === 1 ? "tile" : "tiles"}) • Place Obstacle (Impassable)`
      );
    } else if (this.activeEditorTool === "clear_obstacle") {
      // Rose clear obstacle selection visuals
      this.editorSelectionGraphics.fillStyle(0xf43f5e, 0.32);
      this.editorSelectionGraphics.fillRect(rx, ry, rw, rh);

      this.editorSelectionGraphics.lineStyle(2.5, 0xfb7185, 1);
      this.editorSelectionGraphics.strokeRect(rx, ry, rw, rh);

      // Inner grid lines
      this.editorSelectionGraphics.lineStyle(1, 0xffffff, 0.35);
      for (let c = 1; c < cols; c++) {
        const gx = rx + c * TILE_SIZE;
        this.editorSelectionGraphics.lineBetween(gx, ry, gx, ry + rh);
      }
      for (let r = 1; r < rows; r++) {
        const gy = ry + r * TILE_SIZE;
        this.editorSelectionGraphics.lineBetween(rx, gy, rx + rw, gy);
      }

      this.editorOverlayText.setText(
        `✕ ${cols} × ${rows} (${totalTiles} ${totalTiles === 1 ? "tile" : "tiles"}) • Clear Obstacle`
      );
    } else if (this.activeEditorTool === "clear_decoration") {
      // Amber clear decoration visuals
      this.editorSelectionGraphics.fillStyle(0xf59e0b, 0.32);
      this.editorSelectionGraphics.fillRect(rx, ry, rw, rh);

      this.editorSelectionGraphics.lineStyle(2.5, 0xfbbf24, 1);
      this.editorSelectionGraphics.strokeRect(rx, ry, rw, rh);

      // Inner grid dashed lines
      this.editorSelectionGraphics.lineStyle(1, 0xffffff, 0.35);
      for (let c = 1; c < cols; c++) {
        const gx = rx + c * TILE_SIZE;
        this.editorSelectionGraphics.lineBetween(gx, ry, gx, ry + rh);
      }
      for (let r = 1; r < rows; r++) {
        const gy = ry + r * TILE_SIZE;
        this.editorSelectionGraphics.lineBetween(rx, gy, rx + rw, gy);
      }

      this.editorOverlayText.setText(
        `✕ ${cols} × ${rows} (${totalTiles} ${totalTiles === 1 ? "tile" : "tiles"}) • Clear Decoration`
      );
    } else if (this.activeEditorTool === "decoration") {
      const defaultFill = 0x10b981;
      const defaultStroke = 0x34d399;
      const fillColor = this.selectedTileColor ? this.parseColor(this.selectedTileColor) : defaultFill;
      const strokeColor = this.selectedTileColor ? this.parseColor(this.selectedTileColor) : defaultStroke;

      this.editorSelectionGraphics.fillStyle(fillColor, 0.32);
      this.editorSelectionGraphics.fillRect(rx, ry, rw, rh);

      this.editorSelectionGraphics.lineStyle(2.5, strokeColor, 1);
      this.editorSelectionGraphics.strokeRect(rx, ry, rw, rh);

      // Inner grid dashed lines
      this.editorSelectionGraphics.lineStyle(1, 0xffffff, 0.35);
      for (let c = 1; c < cols; c++) {
        const gx = rx + c * TILE_SIZE;
        this.editorSelectionGraphics.lineBetween(gx, ry, gx, ry + rh);
      }
      for (let r = 1; r < rows; r++) {
        const gy = ry + r * TILE_SIZE;
        this.editorSelectionGraphics.lineBetween(rx, gy, rx + rw, gy);
      }

      let labelName = "Table Left";
      if (this.selectedAssetKey === "table_left_150") labelName = "Table Left";
      const colorBadge = this.selectedTileColor ? ` • ${this.selectedTileColor.toUpperCase()}` : "";
      this.editorOverlayText.setText(
        `🪴 ${cols} × ${rows} (${totalTiles} ${totalTiles === 1 ? "tile" : "tiles"}) • ${labelName} (Decoration)${colorBadge}`
      );
    } else {
      const isWall = isWallTile(this.selectedAssetKey);
      const defaultFill = isWall ? 0xdb5b47 : 0x3b8282;
      const defaultStroke = isWall ? 0xff6b55 : 0xeca239;
      const fillColor = this.selectedTileColor ? this.parseColor(this.selectedTileColor) : defaultFill;
      // Fill
      this.editorSelectionGraphics.fillStyle(fillColor, 0.32);
      this.editorSelectionGraphics.fillRect(rx, ry, rw, rh);

      // Outer border
      const strokeColor = this.selectedTileColor ? this.parseColor(this.selectedTileColor) : defaultStroke;
      this.editorSelectionGraphics.lineStyle(2.5, strokeColor, 1);
      this.editorSelectionGraphics.strokeRect(rx, ry, rw, rh);

      // Inner grid dashed lines
      this.editorSelectionGraphics.lineStyle(1, 0xffffff, 0.35);
      for (let c = 1; c < cols; c++) {
        const gx = rx + c * TILE_SIZE;
        this.editorSelectionGraphics.lineBetween(gx, ry, gx, ry + rh);
      }
      for (let r = 1; r < rows; r++) {
        const gy = ry + r * TILE_SIZE;
        this.editorSelectionGraphics.lineBetween(rx, gy, rx + rw, gy);
      }

      let labelName = "Birch Floor";
      if (this.selectedAssetKey === "grass_150") labelName = "Grass Tile";
      else if (this.selectedAssetKey === "color_tile") labelName = "Plain Tile";
      else if (this.selectedAssetKey === "wall_half_150") labelName = "Half Wall (with Obstacle)";
      else if (this.selectedAssetKey === "wall_top_150") labelName = "Top Wall (with Obstacle)";

      const colorBadge = this.selectedTileColor ? ` • ${this.selectedTileColor.toUpperCase()}` : "";
      this.editorOverlayText.setText(
        `📐 ${cols} × ${rows} (${totalTiles} ${totalTiles === 1 ? "tile" : "tiles"}) • ${labelName}${colorBadge}`
      );
    }

    this.editorOverlayText.setPosition(rx + 8, Math.max(8, ry - 32));
    this.editorOverlayText.setVisible(true);
  }

  public setEditMode(enabled: boolean) {
    this.isEditMode = enabled;
    this.drawGrid(enabled);
    this.drawPrivateZones();
    this.drawObstacles();

    if (enabled) {
      this.closePlayerMenu();
      this.cameras.main.stopFollow();
    } else {
      this.isSelectingArea = false;
      this.selectionStartTile = null;
      this.selectionCurrentTile = null;
      this.isRightMouseDown = false;
      this.panStartPoint = null;
      this.editorHoverGraphics.clear();
      this.editorSelectionGraphics.clear();
      this.editorOverlayText.setVisible(false);

      if (this.localPlayerId) {
        const localVisual = this.playerVisuals.get(this.localPlayerId);
        if (localVisual) {
          this.cameras.main.startFollow(localVisual.container, true, 0.12, 0.12);
        }
      }
      this.cameras.main.setZoom(1.0);
    }
  }

  public setSelectedAsset(assetKey: string) {
    this.selectedAssetKey = assetKey;
  }

  public setSelectedColor(color: string | null) {
    this.selectedTileColor = color;
  }

  public applyTileUpdates(updates: Record<string, string>) {
    if (!updates || typeof updates !== "object") return;
    for (const [key, rawValue] of Object.entries(updates)) {
      this.currentTilesMap.set(key, rawValue);
      const [colStr, rowStr] = key.split(",");
      const col = parseInt(colStr, 10);
      const row = parseInt(rowStr, 10);
      if (row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS) {
        const img = this.tileImages[row]?.[col];
        const decoImg = this.decorationImages[row]?.[col];

        let baseStr = "grass_150";
        let decoStr: string | null = null;
        let isObs = false;

        const parts = rawValue.includes("::") ? rawValue.split("::") : [rawValue];
        const nonObsParts: string[] = [];
        for (const p of parts) {
          const baseKey = p.includes("|") ? p.split("|")[0] : p;
          if (baseKey === "obstacle") {
            isObs = true;
          } else {
            nonObsParts.push(p);
          }
        }

        if (nonObsParts.length > 0) {
          baseStr = nonObsParts[0] || "grass_150";
          decoStr = nonObsParts[1] || null;
        } else {
          baseStr = "grass_150";
          decoStr = null;
        }

        if (isObs) {
          this.obstacleTiles.add(key);
        } else {
          this.obstacleTiles.delete(key);
        }

        if (img) {
          let assetKey = "birch_floor_150";
          let tintColor: number | null = null;

          if (baseStr.includes("|")) {
            const [parsedAsset, colorPart] = baseStr.split("|");
            assetKey = parsedAsset || "birch_floor_150";
            if (colorPart && colorPart !== "none") {
              tintColor = this.parseColor(colorPart);
            }
          } else if (baseStr.startsWith("#")) {
            assetKey = "color_tile";
            tintColor = this.parseColor(baseStr);
          } else {
            assetKey = baseStr;
          }

          if (assetKey === "grass_100") assetKey = "grass_150";
          if (assetKey === "birch_floor_100") assetKey = "birch_floor_150";

          const textureKey = this.textures.exists(assetKey) ? assetKey : "grass_150";
          img.setTexture(textureKey);
          img.setDisplaySize(TILE_SIZE, TILE_SIZE);

          if (tintColor !== null) {
            img.setTint(tintColor);
          } else {
            img.clearTint();
          }
        }

        if (decoImg) {
          if (decoStr) {
            let decoAssetKey = decoStr;
            let decoTintColor: number | null = null;
            if (decoStr.includes("|")) {
              const [parsedDecoAsset, decoColorPart] = decoStr.split("|");
              decoAssetKey = parsedDecoAsset;
              if (decoColorPart && decoColorPart !== "none") {
                decoTintColor = this.parseColor(decoColorPart);
              }
            }
            const decoTexture = this.textures.exists(decoAssetKey) ? decoAssetKey : "table_left_150";
            decoImg.setTexture(decoTexture);
            decoImg.setDisplaySize(TILE_SIZE, TILE_SIZE);
            if (decoTintColor !== null) {
              decoImg.setTint(decoTintColor);
            } else {
              decoImg.clearTint();
            }
            decoImg.setVisible(true);
          } else {
            decoImg.setVisible(false);
          }
        }
      }
    }
    this.drawObstacles();
  }

  private drawObstacles() {
    if (!this.obstaclesGraphics) return;
    this.obstaclesGraphics.clear();

    // "it will only show highlight in edit mode. in map, it wont show the obstacle highlight."
    if (!this.isEditMode) return;
    if (this.obstacleTiles.size === 0) return;

    for (const key of this.obstacleTiles) {
      const [colStr, rowStr] = key.split(",");
      const col = parseInt(colStr, 10);
      const row = parseInt(rowStr, 10);
      if (isNaN(col) || isNaN(row)) continue;

      const x = col * TILE_SIZE;
      const y = row * TILE_SIZE;

      // Semi-transparent barrier highlight
      this.obstaclesGraphics.fillStyle(0xef4444, 0.28);
      this.obstaclesGraphics.fillRect(x, y, TILE_SIZE, TILE_SIZE);

      // Barrier border
      this.obstaclesGraphics.lineStyle(2, 0xef4444, 0.85);
      this.obstaclesGraphics.strokeRect(x, y, TILE_SIZE, TILE_SIZE);

      // Diagonal cross indicating blocked passage
      this.obstaclesGraphics.lineStyle(1.5, 0xffffff, 0.4);
      this.obstaclesGraphics.lineBetween(x + 5, y + 5, x + TILE_SIZE - 5, y + TILE_SIZE - 5);
      this.obstaclesGraphics.lineBetween(x + TILE_SIZE - 5, y + 5, x + 5, y + TILE_SIZE - 5);
    }
  }

  public resetTiles() {
    this.currentTilesMap.clear();
    this.obstacleTiles.clear();
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const img = this.tileImages[r]?.[c];
        if (img) {
          img.setTexture("grass_150");
          img.setDisplaySize(TILE_SIZE, TILE_SIZE);
          img.clearTint();
        }
        const decoImg = this.decorationImages[r]?.[c];
        if (decoImg) {
          decoImg.setVisible(false);
          decoImg.clearTint();
        }
      }
    }
    this.privateZones = [];
    this.currentInsideZone = null;
    this.darknessAlpha = 0;
    this.targetDarknessAlpha = 0;
    this.drawPrivateZones();
    this.drawOutsideDarkness();
    this.drawObstacles();
    this.notifyPrivateZonesListChange();
  }

  public setActiveEditorTool(
    tool:
      | "flooring"
      | "decoration"
      | "clear_decoration"
      | "private_zone"
      | "clear_private_zone"
      | "obstacle"
      | "clear_obstacle"
  ) {
    this.activeEditorTool = tool;
  }

  public applyPrivateZones(zones: PrivateZone[]) {
    if (!Array.isArray(zones)) return;
    this.privateZones = [...zones];
    if (this.currentInsideZone) {
      const updated = this.privateZones.find((z) => z.id === this.currentInsideZone?.id);
      if (updated) {
        this.currentInsideZone = updated;
        this.notifyZoneChanged(this.currentInsideZone);
      } else {
        this.currentInsideZone = null;
        this.notifyZoneChanged(null);
      }
    }
    this.drawPrivateZones();
    this.notifyPrivateZonesListChange();
  }

  public createPrivateZone(
    bounds: { minCol: number; minRow: number; maxCol: number; maxRow: number },
    name?: string
  ) {
    const defaultName = `Private Area ${this.privateZones.length + 1}`;
    const cleanName = name && name.trim().length > 0 ? name.trim().slice(0, 30) : defaultName;
    const newZone: PrivateZone = {
      id: `pz_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: cleanName,
      bounds,
      createdAt: Date.now(),
    };

    this.privateZones.push(newZone);
    if (this.multiplayer) {
      this.multiplayer.sendUpdatePrivateZones(this.privateZones);
    }
    this.drawPrivateZones();
    this.notifyPrivateZonesListChange();
  }

  public renamePrivateZone(zoneId: string, newName: string) {
    const zone = this.privateZones.find((z) => z.id === zoneId);
    if (!zone) return;
    const cleanName = newName && newName.trim().length > 0 ? newName.trim().slice(0, 30) : zone.name;
    zone.name = cleanName;
    if (this.multiplayer) {
      this.multiplayer.sendUpdatePrivateZones(this.privateZones);
    }
    this.drawPrivateZones();
    this.notifyPrivateZonesListChange();

    if (this.currentInsideZone && this.currentInsideZone.id === zoneId) {
      this.currentInsideZone.name = cleanName;
      this.notifyZoneChanged(this.currentInsideZone);
    }
  }

  public removePrivateZone(zoneId: string) {
    this.privateZones = this.privateZones.filter((z) => z.id !== zoneId);
    if (this.currentInsideZone && this.currentInsideZone.id === zoneId) {
      this.currentInsideZone = null;
      this.notifyZoneChanged(null);
    }
    if (this.multiplayer) {
      this.multiplayer.sendUpdatePrivateZones(this.privateZones);
    }
    this.drawPrivateZones();
    this.notifyPrivateZonesListChange();
  }

  public onZoneChange(cb: (zone: PrivateZone | null) => void) {
    this.onZoneChangeCallbacks.push(cb);
  }

  private notifyZoneChanged(zone: PrivateZone | null) {
    this.onZoneChangeCallbacks.forEach((cb) => {
      try {
        cb(zone);
      } catch (e) {
        console.error("onZoneChange callback error:", e);
      }
    });
  }

  public onPrivateZonesListChange(cb: (zones: PrivateZone[]) => void) {
    this.onPrivateZonesListChangeCallbacks.push(cb);
    cb(this.privateZones);
  }

  private notifyPrivateZonesListChange() {
    this.onPrivateZonesListChangeCallbacks.forEach((cb) => {
      try {
        cb(this.privateZones);
      } catch (e) {
        console.error("onPrivateZonesListChange callback error:", e);
      }
    });
  }

  private drawPrivateZones() {
    this.privateZonesGraphics.clear();

    if (!this.privateZones || this.privateZones.length === 0) return;

    this.privateZones.forEach((zone) => {
      const zx = zone.bounds.minCol * TILE_SIZE;
      const zy = zone.bounds.minRow * TILE_SIZE;
      const zw = (zone.bounds.maxCol - zone.bounds.minCol + 1) * TILE_SIZE;
      const zh = (zone.bounds.maxRow - zone.bounds.minRow + 1) * TILE_SIZE;
      const cols = zone.bounds.maxCol - zone.bounds.minCol + 1;
      const rows = zone.bounds.maxRow - zone.bounds.minRow + 1;

      if (this.isEditMode) {
        // Edit Mode: High-contrast purple styling with tile bounds
        this.privateZonesGraphics.fillStyle(0x8b5cf6, 0.22);
        this.privateZonesGraphics.fillRect(zx, zy, zw, zh);

        this.privateZonesGraphics.lineStyle(2, 0x8b5cf6, 0.95);
        this.privateZonesGraphics.strokeRect(zx, zy, zw, zh);

        // Dashed inner lines for each tile
        this.privateZonesGraphics.lineStyle(1, 0xffffff, 0.16);
        for (let c = 1; c < cols; c++) {
          const gx = zx + c * TILE_SIZE;
          this.privateZonesGraphics.lineBetween(gx, zy, gx, zy + zh);
        }
        for (let r = 1; r < rows; r++) {
          const gy = zy + r * TILE_SIZE;
          this.privateZonesGraphics.lineBetween(zx, gy, zx + zw, gy);
        }
      } else {
        // Normal Mode: Elegant, subtle ambient zone boundary on floor
        this.privateZonesGraphics.fillStyle(0x8b5cf6, 0.06);
        this.privateZonesGraphics.fillRect(zx, zy, zw, zh);

        this.privateZonesGraphics.lineStyle(1.5, 0x8b5cf6, 0.45);
        this.privateZonesGraphics.strokeRect(zx, zy, zw, zh);

        // Stylish corner brackets
        const cornerLen = Math.min(12, Math.min(zw, zh) / 3);
        this.privateZonesGraphics.lineStyle(2.5, 0xc4b5fd, 0.8);
        // Top-left
        this.privateZonesGraphics.lineBetween(zx, zy, zx + cornerLen, zy);
        this.privateZonesGraphics.lineBetween(zx, zy, zx, zy + cornerLen);
        // Top-right
        this.privateZonesGraphics.lineBetween(zx + zw, zy, zx + zw - cornerLen, zy);
        this.privateZonesGraphics.lineBetween(zx + zw, zy, zx + zw, zy + cornerLen);
        // Bottom-left
        this.privateZonesGraphics.lineBetween(zx, zy + zh, zx + cornerLen, zy + zh);
        this.privateZonesGraphics.lineBetween(zx, zy + zh, zx, zy + zh - cornerLen);
        // Bottom-right
        this.privateZonesGraphics.lineBetween(zx + zw, zy + zh, zx + zw - cornerLen, zy + zh);
        this.privateZonesGraphics.lineBetween(zx + zw, zy + zh, zx + zw, zy + zh - cornerLen);
      }
    });
  }

  private drawOutsideDarkness() {
    this.outsideDarkGraphics.clear();
    this.privateSpotlightGraphics.clear();

    if (this.darknessAlpha <= 0.005 || !this.currentInsideZone) {
      return;
    }

    const zone = this.currentInsideZone;
    const zx = zone.bounds.minCol * TILE_SIZE;
    const zy = zone.bounds.minRow * TILE_SIZE;
    const zw = (zone.bounds.maxCol - zone.bounds.minCol + 1) * TILE_SIZE;
    const zh = (zone.bounds.maxRow - zone.bounds.minRow + 1) * TILE_SIZE;

    // Darken everything outside this private zone like a modal backdrop
    this.outsideDarkGraphics.fillStyle(0x060b0d, this.darknessAlpha);

    // 1. Top region
    if (zy > 0) {
      this.outsideDarkGraphics.fillRect(0, 0, WORLD_WIDTH, zy);
    }
    // 2. Bottom region
    if (zy + zh < WORLD_HEIGHT) {
      this.outsideDarkGraphics.fillRect(0, zy + zh, WORLD_WIDTH, WORLD_HEIGHT - (zy + zh));
    }
    // 3. Left region
    if (zx > 0) {
      this.outsideDarkGraphics.fillRect(0, zy, zx, zh);
    }
    // 4. Right region
    if (zx + zw < WORLD_WIDTH) {
      this.outsideDarkGraphics.fillRect(zx + zw, zy, WORLD_WIDTH - (zx + zw), zh);
    }

    // Luminous glowing spotlight border around the bright private area
    this.privateSpotlightGraphics.lineStyle(2.5, 0xa78bfa, Math.min(1, this.darknessAlpha * 1.3));
    this.privateSpotlightGraphics.strokeRect(zx, zy, zw, zh);

    // Corner neon brackets around the bright area
    const cornerLen = Math.min(18, Math.min(zw, zh) / 2);
    this.privateSpotlightGraphics.lineStyle(3.5, 0xc4b5fd, Math.min(1, this.darknessAlpha * 1.4));
    this.privateSpotlightGraphics.lineBetween(zx, zy, zx + cornerLen, zy);
    this.privateSpotlightGraphics.lineBetween(zx, zy, zx, zy + cornerLen);
    this.privateSpotlightGraphics.lineBetween(zx + zw, zy, zx + zw - cornerLen, zy);
    this.privateSpotlightGraphics.lineBetween(zx + zw, zy, zx + zw, zy + cornerLen);
    this.privateSpotlightGraphics.lineBetween(zx, zy + zh, zx + cornerLen, zy + zh);
    this.privateSpotlightGraphics.lineBetween(zx, zy + zh, zx, zy + zh - cornerLen);
    this.privateSpotlightGraphics.lineBetween(zx + zw, zy + zh, zx + zw - cornerLen, zy + zh);
    this.privateSpotlightGraphics.lineBetween(zx + zw, zy + zh, zx + zw, zy + zh - cornerLen);
  }
}
