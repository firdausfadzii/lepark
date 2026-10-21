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
  PLAYER_HITBOX_HALF_WIDTH,
  CHARACTER_MAX_SIZE,
  PLAYER_SPEED,
  PlayerAvatars,
  DEFAULT_AVATARS,
  normalizeFrames,
  getTileCenter,
  getTileCoords,
  isWallTile,
  isWallAsset,
  resolveMovement,
  SolidBox,
  PLAYER_FEET_TOP_OFFSET,
  PLAYER_FEET_BOTTOM_OFFSET,
  PrivateZone,
  JukeboxState,
  TypewriterState,
  isFreeformAsset,
  FreeformDecorationData,
  parseFreeformTile,
  serializeFreeformTile,
} from "shared";
import { JukeboxManager } from "../audio/JukeboxManager";

interface JukeboxVisual {
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Image;
  hitZone: Phaser.GameObjects.Rectangle;
  promptText: Phaser.GameObjects.Text;
  notesTimer: number;
  state: JukeboxState;
}

interface TypewriterVisual {
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Image;
  hitZone: Phaser.GameObjects.Rectangle;
  promptText: Phaser.GameObjects.Text;
  state: TypewriterState;
}

interface PlayerVisual {
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Image;
  nameTag: Phaser.GameObjects.Text;
  currentDirection: "idle" | "left" | "right" | "up" | "down";
  avatars?: PlayerAvatars;
  player?: any;
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
    userId?: number;
    userSpaceId?: string;
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
    | "clear_obstacle"
    | "jukebox"
    | "typewriter"
    | "freeform_decoration"
    | "spawn_point"
    | "color_dropper" = "flooring";
  public selectedAssetKey: string = "birch_floor_150";
  public selectedTileColor: string | null = null;
  public decorationPassable: boolean = true;
  public decorationOntop: boolean = false;
  private isSelectingArea: boolean = false;
  private selectionStartTile: { x: number; y: number } | null = null;
  private selectionCurrentTile: { x: number; y: number } | null = null;

  // Spawn Point & Dropper State
  private spawnPointGraphics: Phaser.GameObjects.Graphics | null = null;
  private spawnPointText: Phaser.GameObjects.Text | null = null;
  public onColorPicked?: (hex: string | null) => void;

  // Jukebox State & Free-Placement Objects
  public jukeboxManager: JukeboxManager | null = null;
  private jukeboxVisuals: Map<string, JukeboxVisual> = new Map();
  public onJukeboxClick?: (jukeboxId: string) => void;
  public onJukeboxNearby?: (jukebox: JukeboxState | null) => void;
  private nearbyJukeboxId: string | null = null;
  private keyE: Phaser.Input.Keyboard.Key | null = null;
  private editorJukeboxGhost: Phaser.GameObjects.Image | null = null;

  // Typewriter State & Typeracing Game Objects
  private typewriterVisuals: Map<string, TypewriterVisual> = new Map();
  public onTypewriterClick?: (typewriterId: string) => void;
  private nearbyTypewriterId: string | null = null;
  private editorTypewriterGhost: Phaser.GameObjects.Image | null = null;

  // Freeform Decorations State (e.g. Chairs, not bounded by grid)
  private freeformVisuals: Map<
    string,
    {
      container: Phaser.GameObjects.Container;
      sprite: Phaser.GameObjects.Image;
      hitZone: Phaser.GameObjects.Rectangle;
      data: FreeformDecorationData;
    }
  > = new Map();
  private editorFreeformGhost: Phaser.GameObjects.Image | null = null;

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

  init(data: {
    multiplayer: MultiplayerManager;
    voiceManager?: VoiceManager;
    jukeboxManager?: JukeboxManager;
  }) {
    this.multiplayer = data?.multiplayer;
    if (data?.voiceManager) {
      this.voiceManager = data.voiceManager;
    }
    if (data?.jukeboxManager) {
      this.jukeboxManager = data.jukeboxManager;
    }
  }

  preload() {
    this.load.image("grass_tile", "/assets/grass_150.png");
    this.load.image("grass_150", "/assets/grass_150.png");
    this.load.image("birch_floor_150", "/assets/birch_floor_150.png");
    this.load.image("carpet_grey_150", "/assets/carpet_grey_150.png");
    this.load.image("grass_100", "/assets/grass_150.png");
    this.load.image("birch_floor_100", "/assets/birch_floor_150.png");
    this.load.image("wall_half_150", "/assets/wall_half_150.png");
    this.load.image("wall_top_150", "/assets/wall_top_150.png");
    this.load.image("horizontal_glass_wall_150", "/assets/horizontal_glass_wall_150.png");
    this.load.image("vertical_glass_wall_150", "/assets/vertical_glass_wall_150.png");
    this.load.image("table_left_150", "/assets/table_left_150.png");
    this.load.image("table_middle_150", "/assets/table_middle_150.png");
    this.load.image("table_right_150", "/assets/table_right_150.png");
    this.load.image("round_table_150", "/assets/round_table_150.png");
    this.load.image("office_chair_150", "/assets/office_chair_150.png");
    this.load.image("office_chair_back_150", "/assets/office_chair_back_150.png");
    this.load.image("jukebox_150", "/assets/jukebox_150.png");
    this.load.image("typewriter_150", "/assets/typewriter_150.png");

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

    // Spawn point highlight overlay on ground (depth 128, visible only in edit mode)
    this.spawnPointGraphics = this.add.graphics();
    this.spawnPointGraphics.setDepth(128);

    this.spawnPointText = this.add.text(0, 0, "", {
      fontSize: "12px",
      fontFamily: "Outfit, sans-serif",
      fontStyle: "bold",
      backgroundColor: "rgba(16, 185, 129, 0.92)",
      color: "#ffffff",
      padding: { x: 7, y: 3 },
    });
    this.spawnPointText.setOrigin(0.5, 0.5);
    this.spawnPointText.setDepth(129);
    this.spawnPointText.setVisible(false);

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

    // Ghost preview for freeform jukebox placement
    this.editorJukeboxGhost = this.add.image(0, 0, "jukebox_150");
    this.editorJukeboxGhost.setDisplaySize(48, 48);
    this.editorJukeboxGhost.setAlpha(0.65);
    this.editorJukeboxGhost.setDepth(136);
    this.editorJukeboxGhost.setVisible(false);

    // Ghost preview for freeform typewriter placement
    this.editorTypewriterGhost = this.add.image(0, 0, "typewriter_150");
    this.editorTypewriterGhost.setDisplaySize(48, 48);
    this.editorTypewriterGhost.setAlpha(0.65);
    this.editorTypewriterGhost.setDepth(136);
    this.editorTypewriterGhost.setVisible(false);

    // Ghost preview for freeform decoration placement (e.g. chairs, not bounded by grid)
    this.editorFreeformGhost = this.add.image(0, 0, "office_chair_150");
    this.editorFreeformGhost.setDisplaySize(50, 50);
    this.editorFreeformGhost.setAlpha(0.7);
    this.editorFreeformGhost.setDepth(136);
    this.editorFreeformGhost.setVisible(false);

    // E key for interacting with nearby typewriter or jukebox
    if (this.input.keyboard) {
      this.keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
      this.keyE.on("down", () => {
        if (this.isTyperaceModalOpen()) return;
        if (this.nearbyTypewriterId && !this.isEditMode && this.onTypewriterClick) {
          this.onTypewriterClick(this.nearbyTypewriterId);
        } else if (this.nearbyJukeboxId && !this.isEditMode && this.onJukeboxClick) {
          this.onJukeboxClick(this.nearbyJukeboxId);
        }
      });
    }

    // Hook up jukeboxes updates from multiplayer
    this.multiplayer.onJukeboxesSync((jukeboxes) => {
      this.setJukeboxes(jukeboxes);
    });
    this.multiplayer.onJukeboxUpdate((jukebox) => {
      this.updateJukebox(jukebox);
    });
    this.multiplayer.onJukeboxDelete((jukeboxId) => {
      this.removeJukebox(jukeboxId);
    });
    if (this.multiplayer.currentJukeboxes && this.multiplayer.currentJukeboxes.size > 0) {
      this.setJukeboxes(Array.from(this.multiplayer.currentJukeboxes.values()));
    }

    // Hook up typewriters updates from multiplayer
    this.multiplayer.onTypewritersSync((typewriters) => {
      this.setTypewriters(typewriters);
    });
    this.multiplayer.onTypewriterUpdate((typewriter) => {
      this.updateTypewriter(typewriter);
    });
    this.multiplayer.onTypewriterDelete((typewriterId) => {
      this.removeTypewriter(typewriterId);
    });
    if (this.multiplayer.currentTypewriters && this.multiplayer.currentTypewriters.size > 0) {
      this.setTypewriters(Array.from(this.multiplayer.currentTypewriters.values()));
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
          const p = vis.player || player;
          if (this.onPlayerClick) {
            this.onPlayerClick({
              sessionId,
              name: p.name || "Player",
              color: p.color || "#3b82f6",
              isSuperadmin: !!p.isSuperadmin,
              userId: p.userId || 0,
              userSpaceId: p.userSpaceId || (p.userId ? `user_space_${p.userId}` : ""),
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
      player,
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

    visual.player = player;

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

  public isTyperaceModalOpen(): boolean {
    const el = document.getElementById("typerace-modal");
    return !!(el && !el.classList.contains("hidden"));
  }

  public setControlsActive(active: boolean) {
    if (active && this.isTyperaceModalOpen()) {
      active = false;
    }
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

    // 1. Read input state (only when controls are active and typerace modal is closed)
    let left = false;
    let right = false;
    let up = false;
    let down = false;

    if (this.isTyperaceModalOpen()) {
      if (this.controlsActive) {
        this.setControlsActive(false);
      }
      this.virtualInput = { left: false, right: false, up: false, down: false };
      left = false;
      right = false;
      up = false;
      down = false;
    } else if (this.controlsActive && this.cursors) {
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
            const solidBoxes = this.getSolidBoxes();
            const resolved = resolveMovement(
              localVisual.container.x,
              localVisual.container.y,
              vx,
              vy,
              dtSeconds,
              (c, r) => isWallTile(this.currentTilesMap.get(`${c},${r}`)),
              PLAYER_HITBOX_HALF_WIDTH,
              solidBoxes
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

    // 6.5. Jukebox Proximity & Private Zone Audio Attenuation
    if (this.localPlayerId) {
      const localVisual = this.playerVisuals.get(this.localPlayerId);
      if (localVisual) {
        const lx = localVisual.container.x;
        const ly = localVisual.container.y;
        const localZone = this.currentInsideZone;

        let bestJukebox: JukeboxState | null = null;
        let highestVolume = 0;
        let closestJukebox: JukeboxState | null = null;
        let closestDist = Infinity;

        this.jukeboxVisuals.forEach((jbVisual) => {
          const jb = jbVisual.state;
          const jx = jb.x;
          const jy = jb.y;

          // Check if jukebox is located in any private zone
          const jCol = Math.floor(jx / TILE_SIZE);
          const jRow = Math.floor(jy / TILE_SIZE);
          const jbZone =
            this.privateZones.find(
              (z) =>
                jCol >= z.bounds.minCol &&
                jCol <= z.bounds.maxCol &&
                jRow >= z.bounds.minRow &&
                jRow <= z.bounds.maxRow,
            ) || null;

          const dist = Phaser.Math.Distance.Between(lx, ly, jx, jy);
          if (dist < closestDist) {
            closestDist = dist;
            closestJukebox = jb;
          }

          // Show proximity prompt [Press E] if within 1.5 tiles (72px)
          const isNearby = dist <= 1.5 * TILE_SIZE;
          if (jbVisual.promptText) {
            jbVisual.promptText.setVisible(isNearby && !this.isEditMode);
          }

          let volume = 0;
          if (jbZone) {
            // "if the jukebox in private area, it will not have proximity audio"
            // Everyone in the same private area hears the same uniform sound (100% volume)
            if (localZone && localZone.id === jbZone.id) {
              volume = 1.0;
            } else {
              volume = 0.0;
            }
          } else {
            // "if in the public area, it will have the proximity audio same as between player calculation"
            if (localZone) {
              // Player in private zone is isolated from outside public sound
              volume = 0.0;
            } else {
              // Both in public area: proximity audio
              const MIN_DIST = 1 * TILE_SIZE; // 1 tile (50px): 100% volume
              const MAX_DIST = 8 * TILE_SIZE; // 8 tiles (400px): 0% volume
              if (dist <= MIN_DIST) {
                volume = 1.0;
              } else if (dist >= MAX_DIST) {
                volume = 0.0;
              } else {
                const factor = (dist - MIN_DIST) / (MAX_DIST - MIN_DIST);
                volume = Math.cos(factor * (Math.PI / 2));
              }
            }
          }

          // Spawn musical note effects if playing and audible
          if (jb.isPlaying && jb.playlist.length > 0 && volume > 0.05) {
            jbVisual.notesTimer += delta;
            if (jbVisual.notesTimer > 800) {
              jbVisual.notesTimer = 0;
              this.spawnJukeboxNote(jx, jy - 28);
            }
          }

          if (jb.isPlaying && jb.playlist.length > 0 && volume > highestVolume) {
            highestVolume = volume;
            bestJukebox = jb;
          }
        });

        // Update nearby jukebox state for HUD/interaction
        const nearbyJb = closestDist <= 1.5 * TILE_SIZE ? closestJukebox : null;
        const newNearbyId = nearbyJb ? (nearbyJb as JukeboxState).id : null;
        if (newNearbyId !== this.nearbyJukeboxId) {
          this.nearbyJukeboxId = newNearbyId;
          if (this.onJukeboxNearby) {
            this.onJukeboxNearby(nearbyJb);
          }
        }

        // Update nearby typewriter state for interaction
        let closestTypewriter: TypewriterState | null = null;
        let closestTypewriterDist = Infinity;
        this.typewriterVisuals.forEach((twVisual) => {
          const tw = twVisual.state;
          const dist = Phaser.Math.Distance.Between(lx, ly, tw.x, tw.y);
          if (dist < closestTypewriterDist) {
            closestTypewriterDist = dist;
            closestTypewriter = tw;
          }
          const isNearby = dist <= 1.5 * TILE_SIZE;
          if (twVisual.promptText) {
            twVisual.promptText.setVisible(isNearby && !this.isEditMode && !this.isTyperaceModalOpen());
          }
        });
        const nearbyTw = closestTypewriterDist <= 1.5 * TILE_SIZE ? closestTypewriter : null;
        this.nearbyTypewriterId = nearbyTw ? (nearbyTw as TypewriterState).id : null;

        // Apply audio attenuation to JukeboxManager
        if (this.jukeboxManager) {
          if (bestJukebox && highestVolume > 0) {
            if (this.jukeboxManager.getActiveJukebox()?.id !== (bestJukebox as JukeboxState).id) {
              this.jukeboxManager.updateJukeboxState(bestJukebox);
            }
            this.jukeboxManager.setProximityVolume(highestVolume);
          } else {
            this.jukeboxManager.setProximityVolume(0);
          }
        }
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
      if (!anyModalOpen && !this.controlsActive && !this.isTyperaceModalOpen()) {
        this.setControlsActive(true);
      }

      if (!this.isEditMode) return;
      const target = pointer.event.target as HTMLElement;
      if (target && target.tagName !== "CANVAS") return;

      if (pointer.leftButtonDown()) {
        if (this.activeEditorTool === "jukebox") {
          // Unbounded free-placement (not snapped to grid):
          const jx = Math.round(pointer.worldX);
          const jy = Math.round(pointer.worldY);
          this.multiplayer.placeJukebox(jx, jy, this.decorationPassable, this.decorationOntop);
          return;
        }

        if (this.activeEditorTool === "typewriter") {
          // Unbounded free-placement (not snapped to grid):
          const tx = Math.round(pointer.worldX);
          const ty = Math.round(pointer.worldY);
          this.multiplayer.placeTypewriter(tx, ty, this.decorationPassable, this.decorationOntop);
          return;
        }

        if (this.activeEditorTool === "freeform_decoration") {
          // Unbounded free-placement for chairs and freeform items:
          const fx = Math.round(pointer.worldX);
          const fy = Math.round(pointer.worldY);
          this.placeFreeformDecoration(
            this.selectedAssetKey,
            fx,
            fy,
            this.selectedTileColor,
            this.decorationPassable,
            this.decorationOntop
          );
          return;
        }

        if (this.activeEditorTool === "spawn_point") {
          const col = Math.max(0, Math.min(GRID_COLS - 1, Math.floor(pointer.worldX / TILE_SIZE)));
          const row = Math.max(0, Math.min(GRID_ROWS - 1, Math.floor(pointer.worldY / TILE_SIZE)));
          const spawnVal = `${col},${row}`;
          this.currentTilesMap.set("spawn_point", spawnVal);
          this.drawSpawnPoint();
          if (this.multiplayer) {
            this.multiplayer.sendUpdateTiles({ spawn_point: spawnVal });
          }
          return;
        }

        if (this.activeEditorTool === "color_dropper") {
          const pickedColor = this.getTileColorAt(pointer.worldX, pointer.worldY);
          if (this.onColorPicked) {
            this.onColorPicked(pickedColor);
          }
          return;
        }

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
        if (this.editorJukeboxGhost) this.editorJukeboxGhost.setVisible(false);
        if (this.editorTypewriterGhost) this.editorTypewriterGhost.setVisible(false);
        if (this.editorFreeformGhost) this.editorFreeformGhost.setVisible(false);
        if (this.game.canvas) this.game.canvas.style.cursor = "default";
        return;
      }

      if (this.activeEditorTool === "jukebox") {
        this.editorHoverGraphics.clear();
        if (this.editorFreeformGhost) this.editorFreeformGhost.setVisible(false);
        if (this.editorTypewriterGhost) this.editorTypewriterGhost.setVisible(false);
        if (this.editorJukeboxGhost) {
          this.editorJukeboxGhost.setPosition(pointer.worldX, pointer.worldY);
          this.editorJukeboxGhost.setVisible(true);
        }
        return;
      } else {
        if (this.editorJukeboxGhost) {
          this.editorJukeboxGhost.setVisible(false);
        }
      }

      if (this.activeEditorTool === "typewriter") {
        this.editorHoverGraphics.clear();
        if (this.editorFreeformGhost) this.editorFreeformGhost.setVisible(false);
        if (this.editorJukeboxGhost) this.editorJukeboxGhost.setVisible(false);
        if (this.editorTypewriterGhost) {
          this.editorTypewriterGhost.setPosition(pointer.worldX, pointer.worldY);
          this.editorTypewriterGhost.setVisible(true);
        }
        return;
      } else {
        if (this.editorTypewriterGhost) {
          this.editorTypewriterGhost.setVisible(false);
        }
      }

      if (this.activeEditorTool === "freeform_decoration") {
        this.editorHoverGraphics.clear();
        if (this.editorJukeboxGhost) this.editorJukeboxGhost.setVisible(false);
        if (this.editorFreeformGhost) {
          const texture = this.textures.exists(this.selectedAssetKey)
            ? this.selectedAssetKey
            : "office_chair_150";
          this.editorFreeformGhost.setTexture(texture);
          this.editorFreeformGhost.setDisplaySize(50, 50);
          if (this.selectedTileColor) {
            this.editorFreeformGhost.setTint(this.parseColor(this.selectedTileColor));
          } else {
            this.editorFreeformGhost.clearTint();
          }
          this.editorFreeformGhost.setPosition(pointer.worldX, pointer.worldY);
          this.editorFreeformGhost.setVisible(true);
        }
        return;
      } else {
        if (this.editorFreeformGhost) {
          this.editorFreeformGhost.setVisible(false);
        }
      }

      const col = Math.max(0, Math.min(GRID_COLS - 1, Math.floor(pointer.worldX / TILE_SIZE)));
      const row = Math.max(0, Math.min(GRID_ROWS - 1, Math.floor(pointer.worldY / TILE_SIZE)));

      if (this.activeEditorTool === "spawn_point") {
        this.editorHoverGraphics.clear();
        this.editorHoverGraphics.fillStyle(0x10b981, 0.28);
        this.editorHoverGraphics.fillRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        this.editorHoverGraphics.lineStyle(2.5, 0x10b981, 0.95);
        this.editorHoverGraphics.strokeRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);

        this.editorOverlayText.setText(`📍 Place Spawn Point (${col}, ${row}) • Click to place`);
        this.editorOverlayText.setPosition(col * TILE_SIZE + 8, Math.max(8, row * TILE_SIZE - 32));
        this.editorOverlayText.setVisible(true);
        return;
      }

      if (this.activeEditorTool === "color_dropper") {
        this.editorHoverGraphics.clear();
        this.editorHoverGraphics.lineStyle(2, 0x06b6d4, 0.95);
        this.editorHoverGraphics.strokeRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);

        const sampleHex = this.getTileColorAt(pointer.worldX, pointer.worldY);
        const label = sampleHex ? `💧 Sample Color: ${sampleHex.toUpperCase()}` : "💧 Original Texture (No Tint)";
        this.editorOverlayText.setText(`${label} • Click to pick`);
        this.editorOverlayText.setPosition(col * TILE_SIZE + 8, Math.max(8, row * TILE_SIZE - 32));
        this.editorOverlayText.setVisible(true);
        return;
      }

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
          const hasDeco = this.hasDecoration(col, row);
          const hoverColor = hasDeco ? 0xef4444 : 0xf59e0b;
          this.editorHoverGraphics.lineStyle(2, hoverColor, 0.95);
          this.editorHoverGraphics.strokeRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          this.editorHoverGraphics.fillStyle(hoverColor, hasDeco ? 0.36 : 0.16);
          this.editorHoverGraphics.fillRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);

          if (hasDeco) {
            // Draw cross mark signaling click on it to remove
            const x = col * TILE_SIZE;
            const y = row * TILE_SIZE;
            this.editorHoverGraphics.lineStyle(2.5, 0xffffff, 0.92);
            this.editorHoverGraphics.lineBetween(x + 10, y + 10, x + TILE_SIZE - 10, y + TILE_SIZE - 10);
            this.editorHoverGraphics.lineBetween(x + TILE_SIZE - 10, y + 10, x + 10, y + TILE_SIZE - 10);
            if (this.game.canvas) this.game.canvas.style.cursor = "pointer";
          } else {
            if (this.game.canvas) this.game.canvas.style.cursor = "crosshair";
          }
        } else if (this.activeEditorTool === "decoration") {
          const existingDeco = this.getDecorationKey(col, row);
          const decoBaseKey = existingDeco ? existingDeco.split("|")[0] : null;
          const isSameDeco = decoBaseKey === this.selectedAssetKey;

          if (isSameDeco) {
            // Hovering over placed decoration item signals click on it to remove
            const hoverColor = 0xef4444;
            this.editorHoverGraphics.lineStyle(2, hoverColor, 0.95);
            this.editorHoverGraphics.strokeRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            this.editorHoverGraphics.fillStyle(hoverColor, 0.36);
            this.editorHoverGraphics.fillRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);

            const x = col * TILE_SIZE;
            const y = row * TILE_SIZE;
            this.editorHoverGraphics.lineStyle(2.5, 0xffffff, 0.92);
            this.editorHoverGraphics.lineBetween(x + 12, y + 12, x + TILE_SIZE - 12, y + TILE_SIZE - 12);
            this.editorHoverGraphics.lineBetween(x + TILE_SIZE - 12, y + 12, x + 12, y + TILE_SIZE - 12);
            if (this.game.canvas) this.game.canvas.style.cursor = "pointer";
          } else {
            const defaultHover = this.decorationPassable ? 0x10b981 : 0xef4444;
            const hoverColor = this.selectedTileColor ? this.parseColor(this.selectedTileColor) : defaultHover;
            this.editorHoverGraphics.lineStyle(2, hoverColor, 0.95);
            this.editorHoverGraphics.strokeRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            this.editorHoverGraphics.fillStyle(hoverColor, 0.26);
            this.editorHoverGraphics.fillRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            if (this.game.canvas) this.game.canvas.style.cursor = "crosshair";
          }
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
          // Remove decoration layer from clicked tile or dragged area
          const updates: Record<string, string> = {};
          for (let r = minRow; r <= maxRow; r++) {
            for (let c = minCol; c <= maxCol; c++) {
              const existing = this.currentTilesMap.get(`${c},${r}`);
              if (existing && existing.includes("::")) {
                const parts = existing.split("::");
                const basePart = parts[0] || "grass_150";
                const baseAsset = basePart.split("|")[0];
                const isWall = isWallAsset(baseAsset);
                // If base is a wall, it stays impassable; if base is regular floor, clear obstacle with decoration!
                const newVal = isWall ? `${basePart}::obstacle` : basePart;
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
          // Decoration placed on top of existing bottom tile, respecting passable option
          const decoVal = this.selectedTileColor
            ? `${this.selectedAssetKey}|${this.selectedTileColor}`
            : this.selectedAssetKey;

          const isSingleClick = minCol === maxCol && minRow === maxRow;
          const updates: Record<string, string> = {};

          if (isSingleClick) {
            const key = `${minCol},${minRow}`;
            const existing = this.currentTilesMap.get(key);
            if (existing && existing.includes("::")) {
              const parts = existing.split("::");
              const nonObsParts = parts.filter((p) => p.split("|")[0] !== "obstacle");
              const existingDeco = nonObsParts.length > 1 ? nonObsParts[1] : null;
              const existingDecoKey = existingDeco ? existingDeco.split("|")[0] : null;

              // If single clicked on an existing decoration of the same asset key:
              // Remove it! ("to remove, need to click on it to remove")
              if (existingDecoKey === this.selectedAssetKey) {
                const basePart = parts[0] || "grass_150";
                const baseAsset = basePart.split("|")[0];
                const isWall = isWallAsset(baseAsset);
                const newVal = isWall ? `${basePart}::obstacle` : basePart;
                updates[key] = newVal;
              } else {
                // Different decoration or replace with current passable setting
                const basePart = parts[0] || "grass_150";
                const baseAsset = basePart.split("|")[0];
                const isWall = isWallAsset(baseAsset);
                const shouldHaveObs = isWall || !this.decorationPassable;
                const layerPart = this.decorationOntop ? "::ontop" : "";
                updates[key] = shouldHaveObs
                  ? `${basePart}::${decoVal}${layerPart}::obstacle`
                  : `${basePart}::${decoVal}${layerPart}`;
              }
            } else {
              // Plain bottom tile -> place decoration
              const basePart = existing || "grass_150";
              const baseAsset = basePart.split("|")[0];
              const isWall = isWallAsset(baseAsset);
              const shouldHaveObs = isWall || !this.decorationPassable;
              const layerPart = this.decorationOntop ? "::ontop" : "";
              updates[key] = shouldHaveObs
                ? `${basePart}::${decoVal}${layerPart}::obstacle`
                : `${basePart}::${decoVal}${layerPart}`;
            }
          } else {
            // Dragged area -> place decoration across selection
            const layerPart = this.decorationOntop ? "::ontop" : "";
            for (let r = minRow; r <= maxRow; r++) {
              for (let c = minCol; c <= maxCol; c++) {
                const existing = this.currentTilesMap.get(`${c},${r}`);
                let basePart = "grass_150";
                if (existing) {
                  const parts = existing.split("::");
                  basePart = parts[0] || "grass_150";
                }
                const baseAsset = basePart.split("|")[0];
                const isWall = isWallAsset(baseAsset);
                const shouldHaveObs = isWall || !this.decorationPassable;
                updates[`${c},${r}`] = shouldHaveObs
                  ? `${basePart}::${decoVal}${layerPart}::obstacle`
                  : `${basePart}::${decoVal}${layerPart}`;
              }
            }
          }

          if (Object.keys(updates).length > 0) {
            this.applyTileUpdates(updates);
            if (this.multiplayer) {
              this.multiplayer.sendUpdateTiles(updates);
            }
          }
        } else {
          // Normal tile flooring / wall update:
          // Wall tiles come together with the obstacle tile
          const isWall = isWallAsset(this.selectedAssetKey);
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
                  (p) => isWallAsset(p.split("|")[0])
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
        `🔒 ${cols} × ${rows} (${totalTiles} ${totalTiles === 1 ? "tile" : "tiles"}) • Flag as Private Area • Esc when done`
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
        `✕ ${cols} × ${rows} (${totalTiles} ${totalTiles === 1 ? "tile" : "tiles"}) • Clear Private Area • Esc when done`
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
        `🚫 ${cols} × ${rows} (${totalTiles} ${totalTiles === 1 ? "tile" : "tiles"}) • Place Obstacle • Esc when done`
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
        `✕ ${cols} × ${rows} (${totalTiles} ${totalTiles === 1 ? "tile" : "tiles"}) • Clear Obstacle • Esc when done`
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
        `✕ ${cols} × ${rows} (${totalTiles} ${totalTiles === 1 ? "tile" : "tiles"}) • Click to Remove Decoration • Esc when done`
      );
    } else if (this.activeEditorTool === "decoration") {
      const passableText = this.decorationPassable ? "Passable" : "Solid";
      const defaultFill = this.decorationPassable ? 0x10b981 : 0xef4444;
      const defaultStroke = this.decorationPassable ? 0x34d399 : 0xf87171;
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
      else if (this.selectedAssetKey === "table_middle_150") labelName = "Table Middle";
      else if (this.selectedAssetKey === "table_right_150") labelName = "Table Right";
      else if (this.selectedAssetKey === "round_table_150") labelName = "Round Table";
      else if (this.selectedAssetKey === "typewriter_150") labelName = "Typewriter";
      else if (this.selectedAssetKey === "office_chair_150") labelName = "Office Chair";
      else if (this.selectedAssetKey === "office_chair_back_150") labelName = "Office Chair (Back)";
      const colorBadge = this.selectedTileColor ? ` • ${this.selectedTileColor.toUpperCase()}` : "";
      const layerText = this.decorationOntop ? "On Top" : "Behind";
      this.editorOverlayText.setText(
        `🪴 ${cols} × ${rows} (${totalTiles} ${totalTiles === 1 ? "tile" : "tiles"}) • ${labelName} (${passableText} • ${layerText})${colorBadge} • Esc when done`
      );
    } else {
      const isWall = isWallAsset(this.selectedAssetKey) || isWallTile(this.selectedAssetKey);
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
      else if (this.selectedAssetKey === "carpet_grey_150") labelName = "Grey Carpet";
      else if (this.selectedAssetKey === "color_tile") labelName = "Plain Tile";
      else if (this.selectedAssetKey === "wall_half_150") labelName = "Half Wall (with Obstacle)";
      else if (this.selectedAssetKey === "wall_top_150") labelName = "Top Wall (with Obstacle)";
      else if (this.selectedAssetKey === "horizontal_glass_wall_150") labelName = "Horizontal Glass Wall (with Obstacle)";
      else if (this.selectedAssetKey === "vertical_glass_wall_150") labelName = "Vertical Glass Wall (with Obstacle)";

      const colorBadge = this.selectedTileColor ? ` • ${this.selectedTileColor.toUpperCase()}` : "";
      this.editorOverlayText.setText(
        `📐 ${cols} × ${rows} (${totalTiles} ${totalTiles === 1 ? "tile" : "tiles"}) • ${labelName}${colorBadge} • Esc when done`
      );
    }

    this.editorOverlayText.setPosition(rx + 8, Math.max(8, ry - 32));
    this.editorOverlayText.setVisible(true);
  }

  public cancelEditorSelection() {
    this.isSelectingArea = false;
    this.selectionStartTile = null;
    this.selectionCurrentTile = null;
    this.editorHoverGraphics.clear();
    this.editorSelectionGraphics.clear();
    this.editorOverlayText.setVisible(false);
    if (this.editorFreeformGhost) {
      this.editorFreeformGhost.setVisible(false);
    }
  }

  public setEditMode(enabled: boolean) {
    this.isEditMode = enabled;
    this.drawGrid(enabled);
    this.drawPrivateZones();
    this.drawObstacles();
    this.drawSpawnPoint();

    for (const visual of this.freeformVisuals.values()) {
      if (visual.hitZone && visual.hitZone.input) {
        visual.hitZone.input.cursor = enabled ? "pointer" : "default";
      }
    }

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
      if (this.editorJukeboxGhost) {
        this.editorJukeboxGhost.setVisible(false);
      }
      if (this.editorFreeformGhost) {
        this.editorFreeformGhost.setVisible(false);
      }
      if (this.game.canvas) {
        this.game.canvas.style.cursor = "default";
      }

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

  public setDecorationPassable(passable: boolean) {
    this.decorationPassable = passable;
  }

  public setDecorationOntop(ontop: boolean) {
    this.decorationOntop = ontop;
  }

  public hasDecoration(col: number, row: number): boolean {
    const raw = this.currentTilesMap.get(`${col},${row}`);
    if (!raw || !raw.includes("::")) return false;
    const parts = raw.split("::");
    const nonFlags = parts.filter((p) => {
      const k = p.split("|")[0];
      return k !== "obstacle" && k !== "ontop" && k !== "above" && k !== "behind" && k !== "below";
    });
    return nonFlags.length > 1;
  }

  public getDecorationKey(col: number, row: number): string | null {
    const raw = this.currentTilesMap.get(`${col},${row}`);
    if (!raw || !raw.includes("::")) return null;
    const parts = raw.split("::");
    const nonFlags = parts.filter((p) => {
      const k = p.split("|")[0];
      return k !== "obstacle" && k !== "ontop" && k !== "above" && k !== "behind" && k !== "below";
    });
    return nonFlags.length > 1 ? nonFlags[1] : null;
  }

  public getSolidBoxes(): SolidBox[] {
    const boxes: SolidBox[] = [];
    for (const visual of this.jukeboxVisuals.values()) {
      const jb = visual.state;
      if (jb.passable === false || (!jb.passable && (jb as any).isSolid)) {
        boxes.push({
          minX: jb.x - 22,
          maxX: jb.x + 22,
          minY: jb.y - 18,
          maxY: jb.y + 20,
        });
      }
    }
    for (const visual of this.typewriterVisuals.values()) {
      const tw = visual.state;
      if (tw.passable === false) {
        boxes.push({
          minX: tw.x - 20,
          maxX: tw.x + 20,
          minY: tw.y - 18,
          maxY: tw.y + 18,
        });
      }
    }
    for (const visual of this.freeformVisuals.values()) {
      if (!visual.data.passable) {
        boxes.push({
          minX: visual.data.x - 16,
          maxX: visual.data.x + 16,
          minY: visual.data.y - 16,
          maxY: visual.data.y + 16,
        });
      }
    }
    return boxes;
  }

  public placeFreeformDecoration(
    assetKey: string,
    x: number,
    y: number,
    color?: string | null,
    passable: boolean = true,
    ontop: boolean = false
  ) {
    const id =
      "freeform:deco_" +
      Date.now() +
      "_" +
      Math.random().toString(36).substring(2, 7);
    const serialized = serializeFreeformTile(assetKey, x, y, color, passable, ontop);
    this.currentTilesMap.set(id, serialized);
    this.updateFreeformDecoration(id, serialized);
    if (this.multiplayer) {
      this.multiplayer.sendUpdateTiles({ [id]: serialized });
    }
  }

  public updateFreeformDecoration(id: string, rawValue: string) {
    const data = parseFreeformTile(rawValue);
    if (!data) return;
    data.id = id;

    const existing = this.freeformVisuals.get(id);
    if (existing) {
      existing.data = data;
      existing.container.setPosition(data.x, data.y);
      existing.container.setDepth(data.ontop ? 110 : 0.2);
      const textureKey = this.textures.exists(data.assetKey)
        ? data.assetKey
        : "office_chair_150";
      existing.sprite.setTexture(textureKey);
      if (data.color) {
        existing.sprite.setTint(this.parseColor(data.color));
      } else {
        existing.sprite.clearTint();
      }
    } else {
      this.createFreeformVisual(data);
    }
    this.drawObstacles();
  }

  private createFreeformVisual(data: FreeformDecorationData) {
    const textureKey = this.textures.exists(data.assetKey)
      ? data.assetKey
      : "office_chair_150";
    const sprite = this.add.image(0, 0, textureKey);
    sprite.setDisplaySize(50, 50);
    if (data.color) {
      sprite.setTint(this.parseColor(data.color));
    } else {
      sprite.clearTint();
    }

    const hitZone = this.add.rectangle(0, 0, 50, 50, 0x000000, 0);
    hitZone.setInteractive({ useHandCursor: this.isEditMode });
    hitZone.on(
      "pointerdown",
      (
        pointer: Phaser.Input.Pointer,
        _lx: number,
        _ly: number,
        event: Phaser.Types.Input.EventData
      ) => {
        if (!pointer.leftButtonDown()) return;
        if (!this.isEditMode) return;
        event.stopPropagation();

        if (
          this.activeEditorTool === "freeform_decoration" ||
          this.activeEditorTool === "clear_decoration" ||
          this.activeEditorTool === "decoration"
        ) {
          this.removeFreeformDecoration(data.id);
          if (this.multiplayer) {
            this.multiplayer.sendUpdateTiles({ [data.id]: "" });
          }
        }
      }
    );

    const container = this.add.container(data.x, data.y, [sprite, hitZone]);
    container.setDepth(data.ontop ? 110 : 0.2);

    this.freeformVisuals.set(data.id, {
      container,
      sprite,
      hitZone,
      data,
    });
  }

  public removeFreeformDecoration(id: string) {
    const existing = this.freeformVisuals.get(id);
    if (existing) {
      existing.container.destroy();
      this.freeformVisuals.delete(id);
      this.currentTilesMap.delete(id);
      this.drawObstacles();
    }
  }

  public applyTileUpdates(updates: Record<string, string>) {
    if (!updates || typeof updates !== "object") return;
    for (const [key, rawValue] of Object.entries(updates)) {
      if (key === "spawn_point") {
        if (!rawValue || rawValue === "") {
          this.currentTilesMap.delete(key);
        } else {
          this.currentTilesMap.set(key, rawValue);
        }
        this.drawSpawnPoint();
        continue;
      }
      if (key.startsWith("freeform:")) {
        if (!rawValue || rawValue === "") {
          this.removeFreeformDecoration(key);
        } else {
          this.currentTilesMap.set(key, rawValue);
          this.updateFreeformDecoration(key, rawValue);
        }
        continue;
      }
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
        let isOntop = false;

        const parts = rawValue.includes("::") ? rawValue.split("::") : [rawValue];
        const nonFlagParts: string[] = [];
        for (const p of parts) {
          const baseKey = p.includes("|") ? p.split("|")[0] : p;
          if (baseKey === "obstacle") {
            isObs = true;
          } else if (baseKey === "ontop" || baseKey === "above") {
            isOntop = true;
          } else if (baseKey === "behind" || baseKey === "below") {
            isOntop = false;
          } else {
            nonFlagParts.push(p);
          }
        }

        if (nonFlagParts.length > 0) {
          baseStr = nonFlagParts[0] || "grass_150";
          decoStr = nonFlagParts[1] || null;
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
            decoImg.setDepth(isOntop ? 110 : 0.2);
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

    // Highlight solid jukeboxes in edit mode
    for (const visual of this.jukeboxVisuals.values()) {
      if (visual.state.passable === false || (!visual.state.passable && (visual.state as any).isSolid)) {
        const bx = visual.state.x - 24;
        const by = visual.state.y - 24;
        const bw = 48;
        const bh = 48;

        this.obstaclesGraphics.fillStyle(0xef4444, 0.28);
        this.obstaclesGraphics.fillRect(bx, by, bw, bh);

        this.obstaclesGraphics.lineStyle(2, 0xef4444, 0.85);
        this.obstaclesGraphics.strokeRect(bx, by, bw, bh);

        this.obstaclesGraphics.lineStyle(1.5, 0xffffff, 0.4);
        this.obstaclesGraphics.lineBetween(bx + 5, by + 5, bx + bw - 5, by + bh - 5);
        this.obstaclesGraphics.lineBetween(bx + bw - 5, by + 5, bx + 5, by + bh - 5);
      }
    }

    // Highlight solid typewriters in edit mode
    for (const visual of this.typewriterVisuals.values()) {
      if (visual.state.passable === false) {
        const bx = visual.state.x - 24;
        const by = visual.state.y - 24;
        const bw = 48;
        const bh = 48;

        this.obstaclesGraphics.fillStyle(0xef4444, 0.28);
        this.obstaclesGraphics.fillRect(bx, by, bw, bh);

        this.obstaclesGraphics.lineStyle(2, 0xef4444, 0.85);
        this.obstaclesGraphics.strokeRect(bx, by, bw, bh);

        this.obstaclesGraphics.lineStyle(1.5, 0xffffff, 0.4);
        this.obstaclesGraphics.lineBetween(bx + 5, by + 5, bx + bw - 5, by + bh - 5);
        this.obstaclesGraphics.lineBetween(bx + bw - 5, by + 5, bx + 5, by + bh - 5);
      }
    }

    // Highlight solid freeform decorations in edit mode
    for (const visual of this.freeformVisuals.values()) {
      if (!visual.data.passable) {
        const bx = visual.data.x - 20;
        const by = visual.data.y - 20;
        const bw = 40;
        const bh = 40;

        this.obstaclesGraphics.fillStyle(0xef4444, 0.28);
        this.obstaclesGraphics.fillRect(bx, by, bw, bh);

        this.obstaclesGraphics.lineStyle(2, 0xef4444, 0.85);
        this.obstaclesGraphics.strokeRect(bx, by, bw, bh);

        this.obstaclesGraphics.lineStyle(1.5, 0xffffff, 0.4);
        this.obstaclesGraphics.lineBetween(bx + 4, by + 4, bx + bw - 4, by + bh - 4);
        this.obstaclesGraphics.lineBetween(bx + bw - 4, by + 4, bx + 4, by + bh - 4);
      }
    }
  }

  public drawSpawnPoint() {
    if (!this.spawnPointGraphics || !this.spawnPointText) return;
    this.spawnPointGraphics.clear();

    // "no highlight or indicator on the map. only highlight in edit mode."
    if (!this.isEditMode) {
      this.spawnPointText.setVisible(false);
      return;
    }

    let spawnCol = Math.floor(GRID_COLS / 2);
    let spawnRow = Math.floor(GRID_ROWS / 2);
    const customSpawn = this.currentTilesMap.get("spawn_point");
    if (customSpawn) {
      const [sc, sr] = customSpawn.split(",");
      const pc = parseInt(sc, 10);
      const pr = parseInt(sr, 10);
      if (!isNaN(pc) && !isNaN(pr)) {
        spawnCol = pc;
        spawnRow = pr;
      }
    }

    const sx = spawnCol * TILE_SIZE;
    const sy = spawnRow * TILE_SIZE;
    const cx = sx + TILE_SIZE / 2;
    const cy = sy + TILE_SIZE / 2;

    // Glowing spawn pad fill
    this.spawnPointGraphics.fillStyle(0x10b981, 0.28);
    this.spawnPointGraphics.fillCircle(cx, cy, 22);

    // Glowing outer ring
    this.spawnPointGraphics.lineStyle(2.5, 0x10b981, 0.95);
    this.spawnPointGraphics.strokeCircle(cx, cy, 22);

    // Inner ring
    this.spawnPointGraphics.lineStyle(1.5, 0x6ee7b7, 0.85);
    this.spawnPointGraphics.strokeCircle(cx, cy, 14);

    // Center bullseye dot
    this.spawnPointGraphics.fillStyle(0xffffff, 0.95);
    this.spawnPointGraphics.fillCircle(cx, cy, 4);

    // Text badge above spawn point
    this.spawnPointText.setText("📍 Spawn Point");
    this.spawnPointText.setPosition(cx, sy - 14);
    this.spawnPointText.setVisible(true);
  }

  public getTileColorAt(worldX: number, worldY: number): string | null {
    // 1. Check freeform visuals near this point first (top layer down)
    for (const visual of this.freeformVisuals.values()) {
      const dx = Math.abs(visual.data.x - worldX);
      const dy = Math.abs(visual.data.y - worldY);
      if (dx <= 25 && dy <= 25) {
        if (visual.data.color) {
          return visual.data.color;
        }
      }
    }

    const col = Math.max(0, Math.min(GRID_COLS - 1, Math.floor(worldX / TILE_SIZE)));
    const row = Math.max(0, Math.min(GRID_ROWS - 1, Math.floor(worldY / TILE_SIZE)));
    const raw = this.currentTilesMap.get(`${col},${row}`);

    if (raw) {
      const parts = raw.split("::");
      // Check decoration part first if present
      const decoPart = parts.find((p) => {
        const k = p.split("|")[0];
        return (
          k !== "obstacle" &&
          k !== "ontop" &&
          k !== "above" &&
          k !== "behind" &&
          k !== "below" &&
          p !== parts[0]
        );
      });
      if (decoPart && decoPart.includes("|")) {
        const c = decoPart.split("|")[1];
        if (c && c !== "none") return c;
      }

      // Check base part
      const basePart = parts[0];
      if (basePart) {
        if (basePart.includes("|")) {
          const c = basePart.split("|")[1];
          if (c && c !== "none") return c;
        } else if (basePart.startsWith("#")) {
          return basePart;
        }
      }
    }

    // 2. If no explicit tint, sample texture pixel color from the base tile image
    try {
      const baseRaw = raw ? raw.split("::")[0].split("|")[0] : "grass_150";
      const textureKey = this.textures.exists(baseRaw) ? baseRaw : "grass_150";
      const texture = this.textures.get(textureKey);
      if (texture && texture.source && texture.source[0]) {
        const imgWidth = texture.source[0].width || 150;
        const imgHeight = texture.source[0].height || 150;
        const relX = (((worldX % TILE_SIZE) + TILE_SIZE) % TILE_SIZE) / TILE_SIZE;
        const relY = (((worldY % TILE_SIZE) + TILE_SIZE) % TILE_SIZE) / TILE_SIZE;
        const px = Math.floor(relX * imgWidth);
        const py = Math.floor(relY * imgHeight);
        const color = this.textures.getPixel(px, py, textureKey);
        if (color && color.alpha > 10) {
          return Phaser.Display.Color.RGBToString(color.red, color.green, color.blue, 0, "#");
        }
      }
    } catch {}

    return null;
  }

  public resetTiles() {
    this.currentTilesMap.clear();
    this.obstacleTiles.clear();
    this.freeformVisuals.forEach((v) => v.container.destroy());
    this.freeformVisuals.clear();
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
      | "jukebox"
      | "typewriter"
      | "freeform_decoration"
      | "spawn_point"
      | "color_dropper"
  ) {
    this.activeEditorTool = tool;
    if (this.game.canvas) {
      if (tool === "clear_decoration") {
        this.game.canvas.style.cursor = "pointer";
      } else if (tool === "color_dropper") {
        this.game.canvas.style.cursor = "crosshair";
      } else {
        this.game.canvas.style.cursor = "default";
      }
    }
    if (tool !== "jukebox" && this.editorJukeboxGhost) {
      this.editorJukeboxGhost.setVisible(false);
    }
    if (tool !== "typewriter" && this.editorTypewriterGhost) {
      this.editorTypewriterGhost.setVisible(false);
    }
    if (tool !== "freeform_decoration" && this.editorFreeformGhost) {
      this.editorFreeformGhost.setVisible(false);
    }
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

  // --- Jukebox World Visuals & Notes ---

  public setJukeboxes(jukeboxes: JukeboxState[]) {
    if (!Array.isArray(jukeboxes)) return;
    const activeIds = new Set<string>();

    for (const jb of jukeboxes) {
      activeIds.add(jb.id);
      this.updateJukebox(jb);
    }

    this.jukeboxVisuals.forEach((_vis, id) => {
      if (!activeIds.has(id)) {
        this.removeJukebox(id);
      }
    });
  }

  public updateJukebox(jb: JukeboxState) {
    if (!jb || !jb.id) return;
    const existing = this.jukeboxVisuals.get(jb.id);
    if (existing) {
      existing.state = jb;
      existing.container.setPosition(jb.x, jb.y);
      existing.container.setDepth(jb.ontop ? 110 : 0.2);
    } else {
      this.createJukeboxVisual(jb);
    }
    this.drawObstacles();
  }

  public removeJukebox(jbId: string) {
    const existing = this.jukeboxVisuals.get(jbId);
    if (existing) {
      existing.container.destroy();
      this.jukeboxVisuals.delete(jbId);
      if (this.nearbyJukeboxId === jbId) {
        this.nearbyJukeboxId = null;
        if (this.onJukeboxNearby) this.onJukeboxNearby(null);
      }
      this.drawObstacles();
    }
  }

  private createJukeboxVisual(jb: JukeboxState) {
    const sprite = this.add.image(0, 0, "jukebox_150");
    sprite.setDisplaySize(48, 48);

    const hitZone = this.add.rectangle(0, 0, 52, 52, 0x000000, 0);
    hitZone.setInteractive({ useHandCursor: true });
    hitZone.on(
      "pointerdown",
      (
        pointer: Phaser.Input.Pointer,
        _lx: number,
        _ly: number,
        event: Phaser.Types.Input.EventData
      ) => {
        if (!pointer.leftButtonDown()) return;
        event.stopPropagation();

        if (this.isEditMode) {
          if (this.activeEditorTool === "jukebox" || this.activeEditorTool === "clear_decoration") {
            this.multiplayer.deleteJukebox(jb.id);
          }
        } else {
          if (this.onJukeboxClick) {
            this.onJukeboxClick(jb.id);
          }
        }
      }
    );

    const promptText = this.add.text(0, -32, "Press E", {
      fontFamily: "Outfit, sans-serif",
      fontSize: "11px",
      fontStyle: "bold",
      color: "#ffffff",
      backgroundColor: "rgba(15, 23, 42, 0.88)",
      padding: { x: 6, y: 2.5 },
    });
    promptText.setOrigin(0.5, 0.5);
    promptText.setVisible(false);

    const container = this.add.container(jb.x, jb.y, [sprite, hitZone, promptText]);
    container.setDepth(jb.ontop ? 110 : 0.2);

    const visual: JukeboxVisual = {
      container,
      sprite,
      hitZone,
      promptText,
      notesTimer: 0,
      state: jb,
    };
    this.jukeboxVisuals.set(jb.id, visual);
  }

  private spawnJukeboxNote(worldX: number, worldY: number) {
    const notes = ["♪", "♫", "♬", "♩"];
    const char = notes[Math.floor(Math.random() * notes.length)];
    const noteText = this.add.text(
      worldX + (Math.random() * 20 - 10),
      worldY,
      char,
      {
        fontFamily: "Outfit, sans-serif",
        fontSize: "15px",
        fontStyle: "bold",
        color: "#f59e0b",
      }
    );
    noteText.setOrigin(0.5, 0.5);
    noteText.setDepth(worldY + 50);

    this.tweens.add({
      targets: noteText,
      y: worldY - 32,
      x: noteText.x + (Math.random() * 18 - 9),
      alpha: 0,
      duration: 1300,
      ease: "Cubic.easeOut",
      onComplete: () => {
        noteText.destroy();
      },
    });
  }

  // --- Typewriter World Visuals & Typeracing Interaction ---

  public setTypewriters(typewriters: TypewriterState[]) {
    if (!Array.isArray(typewriters)) return;
    const activeIds = new Set<string>();

    for (const tw of typewriters) {
      activeIds.add(tw.id);
      this.updateTypewriter(tw);
    }

    this.typewriterVisuals.forEach((_vis, id) => {
      if (!activeIds.has(id)) {
        this.removeTypewriter(id);
      }
    });
  }

  public updateTypewriter(tw: TypewriterState) {
    if (!tw || !tw.id) return;
    const existing = this.typewriterVisuals.get(tw.id);
    if (existing) {
      existing.state = tw;
      existing.container.setPosition(tw.x, tw.y);
      existing.container.setDepth(tw.ontop ? 110 : 0.2);
    } else {
      this.createTypewriterVisual(tw);
    }
    this.drawObstacles();
  }

  public removeTypewriter(twId: string) {
    const existing = this.typewriterVisuals.get(twId);
    if (existing) {
      existing.container.destroy();
      this.typewriterVisuals.delete(twId);
      if (this.nearbyTypewriterId === twId) {
        this.nearbyTypewriterId = null;
      }
      this.drawObstacles();
    }
  }

  private createTypewriterVisual(tw: TypewriterState) {
    const sprite = this.add.image(0, 0, "typewriter_150");
    sprite.setDisplaySize(48, 48);

    const hitZone = this.add.rectangle(0, 0, 52, 52, 0x000000, 0);
    hitZone.setInteractive({ useHandCursor: true });
    hitZone.on(
      "pointerdown",
      (
        pointer: Phaser.Input.Pointer,
        _lx: number,
        _ly: number,
        event: Phaser.Types.Input.EventData
      ) => {
        if (!pointer.leftButtonDown()) return;
        event.stopPropagation();

        if (this.isEditMode) {
          if (
            this.activeEditorTool === "typewriter" ||
            this.activeEditorTool === "clear_decoration"
          ) {
            this.multiplayer.deleteTypewriter(tw.id);
          }
        } else {
          if (this.onTypewriterClick) {
            this.onTypewriterClick(tw.id);
          }
        }
      }
    );

    const promptText = this.add.text(0, -32, "Press E to Race", {
      fontFamily: "Outfit, sans-serif",
      fontSize: "11px",
      fontStyle: "bold",
      color: "#ffffff",
      backgroundColor: "rgba(15, 23, 42, 0.88)",
      padding: { x: 6, y: 2.5 },
    });
    promptText.setOrigin(0.5, 0.5);
    promptText.setVisible(false);

    const container = this.add.container(tw.x, tw.y, [sprite, hitZone, promptText]);
    container.setDepth(tw.ontop ? 110 : 0.2);

    const visual: TypewriterVisual = {
      container,
      sprite,
      hitZone,
      promptText,
      state: tw,
    };
    this.typewriterVisuals.set(tw.id, visual);
  }
}
