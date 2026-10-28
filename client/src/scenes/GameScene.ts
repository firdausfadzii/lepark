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
  isOverlayWallAsset,
  isOverlayFloorAsset,
  resolveMovement,
  SolidBox,
  PLAYER_FEET_TOP_OFFSET,
  PLAYER_FEET_BOTTOM_OFFSET,
  PrivateZone,
  JukeboxState,
  TypewriterState,
  AshtrayState,
  ChessBoardState,
  isFreeformAsset,
  FreeformDecorationData,
  parseFreeformTile,
  serializeFreeformTile,
  createPixelCollisionChecker,
  PixelCollisionOptions,
  getAssetRects,
  isAssetPixelSolid,
  hasObstacleTile,
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

interface AshtrayVisual {
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Image;
  hitZone: Phaser.GameObjects.Rectangle;
  promptText: Phaser.GameObjects.Text;
  state: AshtrayState;
}

interface ChessBoardVisual {
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Image;
  hitZone: Phaser.GameObjects.Rectangle;
  promptText: Phaser.GameObjects.Text;
  state: ChessBoardState;
}

interface PlayerVisual {
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Image;
  nameTag: Phaser.GameObjects.Text;
  currentDirection: "idle" | "left" | "right" | "up" | "down";
  facingDirection: "left" | "right" | "up" | "down";
  avatars?: PlayerAvatars;
  player?: any;
  animTimer: number;
  currentFrameIdx: number;
  lastMoveTime: number;
  speechBubble?: Phaser.GameObjects.Container;
  speechBubbleTimer?: Phaser.Time.TimerEvent;
  speakingIndicator?: Phaser.GameObjects.Container;
}

export function normalizeFloorAssetKey(key: string): string {
  if (key === "birch_floor_150" || key === "birch_floor_100") return "wood_5";
  if (key === "carpet_grey_150") return "carpet_4";
  if (key === "grass_150" || key === "grass_100" || key === "grass_tile") return "grass_4";
  return key;
}

export function normalizeDecorationAssetKey(key: string): string {
  if (key === "table_left_150") return "table_2_left";
  if (key === "table_middle_150") return "table_2_middle";
  if (key === "table_right_150") return "table_2_right";
  if (key === "round_table_150") return "round_table_1";
  if (key === "office_chair_150") return "office_chair_1_front";
  if (key === "office_chair_back_150") return "office_chair_1_back";
  if (key === "jukebox_150") return "jukebox_1";
  if (key === "typewriter_150") return "typewriter_1";
  return key;
}

export interface InspectableMapItem {
  kind:
    | "chess_board"
    | "ashtray"
    | "typewriter"
    | "jukebox"
    | "freeform_decoration"
    | "grid_decoration"
    | "overlay_wall"
    | "wall"
    | "overlay_floor"
    | "spawn_point"
    | "obstacle"
    | "private_zone"
    | "floor";
  id: string;
  label: string;
  categoryLabel: string;
  worldX: number;
  worldY: number;
  col?: number;
  row?: number;
  layer?: number;
  bounds?: { x: number; y: number; width: number; height: number };
}

export interface GridDecoItem {
  rawPart: string;
  assetKey: string;
  color: string | null;
  layer: number;
  isOntop: boolean;
}

export class GameScene extends Phaser.Scene {
  private multiplayer!: MultiplayerManager;
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
    | "none"
    | "cursor"
    | "flooring"
    | "decoration"
    | "clear_decoration"
    | "private_zone"
    | "clear_private_zone"
    | "jukebox"
    | "typewriter"
    | "ashtray"
    | "chess_board"
    | "freeform_decoration"
    | "spawn_point"
    | "color_dropper" = "none";
  public activeEditorMenuItem: InspectableMapItem | null = null;
  public onEditorItemContextMenu?: (data: {
    item: InspectableMapItem;
    screenX: number;
    screenY: number;
  }) => void;
  public onEditorItemMenuPositionUpdate?: (data: {
    screenX: number;
    screenY: number;
    visible: boolean;
  }) => void;
  public selectedAssetKey: string = "";
  public selectedTileColor: string | null = null;
  public isObstacleEnabled: boolean = true;
  public decorationPassable: boolean = false;
  public decorationOntop: boolean = false;
  public placementLayer: number = 0;
  public onPlacementLayerChange?: (layer: number) => void;
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

  // Ashtray State & Smoking Game Objects
  private ashtrayVisuals: Map<string, AshtrayVisual> = new Map();
  public onAshtrayClick?: (ashtrayId: string) => void;
  private nearbyAshtrayId: string | null = null;
  private editorAshtrayGhost: Phaser.GameObjects.Image | null = null;

  // Chess Board State & Game Objects
  private chessBoardVisuals: Map<string, ChessBoardVisual> = new Map();
  public onChessBoardClick?: (chessBoardId: string) => void;
  private nearbyChessBoardId: string | null = null;
  private editorChessBoardGhost: Phaser.GameObjects.Image | null = null;

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

  // Tile images grid [row][col], overlay floor images grid, top decoration images grid, and state
  private tileImages: (Phaser.GameObjects.Image | null)[][] = [];
  private overlayTileImages: (Phaser.GameObjects.Image | null)[][] = [];
  private decorationImages: (Phaser.GameObjects.Image | null)[][] = [];
  private extraTileDecoImages: Map<string, Phaser.GameObjects.Image[]> = new Map();
  private currentTilesMap: Map<string, string> = new Map();
  private obstacleTiles: Set<string> = new Set();
  private cachedPixelCollisionChecker: PixelCollisionOptions | null = null;

  private getPixelCollisionChecker(): PixelCollisionOptions {
    if (!this.cachedPixelCollisionChecker) {
      this.cachedPixelCollisionChecker = createPixelCollisionChecker({
        tiles: this.currentTilesMap,
        jukeboxes: Array.from(this.jukeboxVisuals.values()).map((v) => v.state),
        typewriters: Array.from(this.typewriterVisuals.values()).map((v) => v.state),
        ashtrays: Array.from(this.ashtrayVisuals.values()).map((v) => v.state),
        chessBoards: Array.from(this.chessBoardVisuals.values()).map((v) => v.state),
        freeformDecorations: Array.from(this.freeformVisuals.values()).map((v) => v.data),
      });
    }
    return this.cachedPixelCollisionChecker;
  }

  private invalidatePixelCollisionChecker(): void {
    this.cachedPixelCollisionChecker = null;
  }

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
    // Floor assets (all from /assets/floor/)
    const floorAssets = [
      "carpet_1", "carpet_2", "carpet_3", "carpet_4", "carpet_5", "carpet_6", "carpet_7", "carpet_8",
      "grass_1", "grass_2", "grass_3", "grass_4",
      "marble_1", "marble_2", "marble_3", "marble_4",
      "stone_1", "stone_2", "stone_3", "stone_4", "stone_5", "stone_6", "stone_7", "stone_8",
      "wood_1", "wood_2", "wood_3", "wood_4", "wood_5", "wood_6",
    ];
    for (const fa of floorAssets) {
      this.load.image(fa, `/assets/floor/${fa}.png`);
    }
    this.load.image("grass_tile", "/assets/floor/grass_4.png");
    // Wall assets (all from /assets/wall/)
    const wallAssets = [
      "glass_1", "glass_2", "glass_3", "glass_4",
    ];
    for (const wa of wallAssets) {
      this.load.image(wa, `/assets/wall/${wa}.png`);
    }
    for (let i = 1; i <= 19; i++) {
      this.load.image(`wood_wall_${i}`, `/assets/wall/wood_${i}.png`);
      this.load.image(`wall_wood_${i}`, `/assets/wall/wood_${i}.png`);
    }
    // Decoration assets (all from /assets/decoration/)
    const decoAssets = [
      "table_1_left",
      "table_1_middle",
      "table_1_right",
      "table_2_left",
      "table_2_middle",
      "table_2_right",
      "round_table_1",
      "office_chair_1_front",
      "office_chair_1_back",
      "jukebox_1",
      "typewriter_1",
      "ashtray_1",
      "chess_board_1",
    ];
    for (const da of decoAssets) {
      this.load.image(da, `/assets/decoration/${da}.png`);
    }
    // Backward-compatible aliases for legacy decoration keys
    this.load.image("chess_board", "/assets/decoration/chess_board_1.png");
    this.load.image("table_left_150", "/assets/decoration/table_2_left.png");
    this.load.image("table_middle_150", "/assets/decoration/table_2_middle.png");
    this.load.image("table_right_150", "/assets/decoration/table_2_right.png");
    this.load.image("round_table_150", "/assets/decoration/round_table_1.png");
    this.load.image("office_chair_150", "/assets/decoration/office_chair_1_front.png");
    this.load.image("office_chair_back_150", "/assets/decoration/office_chair_1_back.png");
    this.load.image("jukebox_150", "/assets/decoration/jukebox_1.png");
    this.load.image("typewriter_150", "/assets/decoration/typewriter_1.png");

    // Default character avatar atlas & frames
    this.load.atlas(
      "player_idle_sheet",
      "/assets/sprites/default/16x32_idle_sheet.png",
      "/assets/sprites/default/idle_sprites_mapping.json"
    );
    this.load.atlas(
      "player_walk_sheet",
      "/assets/sprites/default/16x32_walk_sheet.png",
      "/assets/sprites/default/walk_sprites_mapping.json"
    );
    this.load.image("default_avatar_idle", "/assets/sprites/default/sprite1.png");
    this.load.image("default_avatar_left_0", "/assets/sprites/default/walk_sprite9_flip.png");
    this.load.image("default_avatar_left_1", "/assets/sprites/default/walk_sprite10_flip.png");
    this.load.image("default_avatar_right_0", "/assets/sprites/default/walk_sprite9.png");
    this.load.image("default_avatar_right_1", "/assets/sprites/default/walk_sprite10.png");
    this.load.image("default_avatar_up_0", "/assets/sprites/default/walk_sprite17.png");
    this.load.image("default_avatar_up_1", "/assets/sprites/default/walk_sprite18.png");
    this.load.image("default_avatar_down_0", "/assets/sprites/default/walk_sprite1.png");
    this.load.image("default_avatar_down_1", "/assets/sprites/default/walk_sprite2.png");

    // Slime avatar atlas & frames
    this.load.atlas(
      "slime_sheet",
      "/assets/sprites/slime/slime_spritesheet.png",
      "/assets/sprites/slime/slime_sprites.json"
    );
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

    if (this.textures.exists("player_idle_sheet")) {
      const tex = this.textures.get("player_idle_sheet");
      if (tex) {
        tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    }
    if (this.textures.exists("player_walk_sheet")) {
      const tex = this.textures.get("player_walk_sheet");
      if (tex) {
        tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    }

    // Dynamic plain color tile texture for solid & overlay color tiles
    if (!this.textures.exists("color_tile")) {
      const g = this.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0xffffff, 1);
      g.fillRect(0, 0, 150, 150);
      g.generateTexture("color_tile", 150, 150);
      g.destroy();
    }
    if (!this.textures.exists("color_tile_overlay")) {
      const g = this.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0xffffff, 1);
      g.fillRect(0, 0, 150, 150);
      g.generateTexture("color_tile_overlay", 150, 150);
      g.destroy();
    }

    // Background fully rendered with grass_4.png on each 50x50 tile as base
    const bgTileSprite = this.add.tileSprite(0, 0, WORLD_WIDTH, WORLD_HEIGHT, "grass_tile");
    bgTileSprite.setOrigin(0, 0);
    bgTileSprite.setTileScale(TILE_SIZE / 96, TILE_SIZE / 96);
    bgTileSprite.setDepth(0);

    // Interactive per-tile images grid for custom flooring
    this.tileImages = [];
    for (let row = 0; row < GRID_ROWS; row++) {
      this.tileImages[row] = [];
      for (let col = 0; col < GRID_COLS; col++) {
        const img = this.add.image(col * TILE_SIZE, row * TILE_SIZE, "grass_4");
        img.setOrigin(0, 0);
        img.setDisplaySize(TILE_SIZE, TILE_SIZE);
        img.setDepth(0.1);
        this.tileImages[row][col] = img;
      }
    }

    // Overlay plain tile per-tile images grid (placed on top of bottom floor tile)
    this.overlayTileImages = [];
    for (let row = 0; row < GRID_ROWS; row++) {
      this.overlayTileImages[row] = [];
      for (let col = 0; col < GRID_COLS; col++) {
        const overlayImg = this.add.image(col * TILE_SIZE, row * TILE_SIZE, "color_tile_overlay");
        overlayImg.setOrigin(0, 0);
        overlayImg.setDisplaySize(TILE_SIZE, TILE_SIZE);
        overlayImg.setDepth(0.15);
        overlayImg.setVisible(false);
        this.overlayTileImages[row][col] = overlayImg;
      }
    }

    // Top decoration per-tile images grid (placed on top of bottom tile)
    this.decorationImages = [];
    for (let row = 0; row < GRID_ROWS; row++) {
      this.decorationImages[row] = [];
      for (let col = 0; col < GRID_COLS; col++) {
        const decoImg = this.add.image(col * TILE_SIZE, row * TILE_SIZE, "table_1_left");
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

    // Private zones ambient outline on ground (depth 0.12)
    this.privateZonesGraphics = this.add.graphics();
    this.privateZonesGraphics.setDepth(0.12);

    // Obstacle highlight overlay on ground (depth 119, visible only in edit mode)
    this.obstaclesGraphics = this.add.graphics();
    this.obstaclesGraphics.setDepth(119);

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
    boundsGraphics.setDepth(0.14);

    // Keyboard inputs (WASD only; arrow keys are NOT captured so Up/Down arrow keys work for layer level)
    if (this.input.keyboard) {
      this.wasdKeys = {
        W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };

      this.input.keyboard.on("keydown-UP", () => {
        if (this.isEditMode) {
          this.adjustPlacementLayer(1);
        }
      });
      this.input.keyboard.on("keydown-DOWN", () => {
        if (this.isEditMode) {
          this.adjustPlacementLayer(-1);
        }
      });

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
    this.editorJukeboxGhost = this.add.image(0, 0, "jukebox_1");
    this.editorJukeboxGhost.setDisplaySize(48, 48);
    this.editorJukeboxGhost.setAlpha(0.65);
    this.editorJukeboxGhost.setDepth(136);
    this.editorJukeboxGhost.setVisible(false);

    // Ghost preview for freeform typewriter placement
    this.editorTypewriterGhost = this.add.image(0, 0, "typewriter_1");
    this.editorTypewriterGhost.setDisplaySize(48, 48);
    this.editorTypewriterGhost.setAlpha(0.65);
    this.editorTypewriterGhost.setDepth(136);
    this.editorTypewriterGhost.setVisible(false);

    // Ghost preview for freeform ashtray placement
    this.editorAshtrayGhost = this.add.image(0, 0, "ashtray_1");
    this.editorAshtrayGhost.setDisplaySize(48, 48);
    this.editorAshtrayGhost.setAlpha(0.65);
    this.editorAshtrayGhost.setDepth(136);
    this.editorAshtrayGhost.setVisible(false);

    // Ghost preview for freeform chess board placement
    this.editorChessBoardGhost = this.add.image(0, 0, "chess_board_1");
    this.editorChessBoardGhost.setDisplaySize(50, 50);
    this.editorChessBoardGhost.setAlpha(0.65);
    this.editorChessBoardGhost.setDepth(136);
    this.editorChessBoardGhost.setVisible(false);

    // Ghost preview for freeform decoration placement (e.g. chairs, not bounded by grid)
    this.editorFreeformGhost = this.add.image(0, 0, "office_chair_1_front");
    this.editorFreeformGhost.setDisplaySize(50, 50);
    this.editorFreeformGhost.setAlpha(0.7);
    this.editorFreeformGhost.setDepth(136);
    this.editorFreeformGhost.setVisible(false);

    // E key for interacting with nearby typewriter, jukebox, ashtray, or chess board
    if (this.input.keyboard) {
      this.keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
      this.keyE.on("down", () => {
        if (this.isTyperaceModalOpen() || this.isSmokingGameModalOpen() || this.isChessModalOpen()) return;
        if (this.nearbyChessBoardId && !this.isEditMode && this.onChessBoardClick) {
          this.onChessBoardClick(this.nearbyChessBoardId);
        } else if (this.nearbyAshtrayId && !this.isEditMode && this.onAshtrayClick) {
          this.onAshtrayClick(this.nearbyAshtrayId);
        } else if (this.nearbyTypewriterId && !this.isEditMode && this.onTypewriterClick) {
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

    // Hook up ashtrays updates from multiplayer
    this.multiplayer.onAshtraysSync((ashtrays) => {
      this.setAshtrays(ashtrays);
    });
    this.multiplayer.onAshtrayUpdate((ashtray) => {
      this.updateAshtray(ashtray);
    });
    this.multiplayer.onAshtrayDelete((ashtrayId) => {
      this.removeAshtray(ashtrayId);
    });
    if (this.multiplayer.currentAshtrays && this.multiplayer.currentAshtrays.size > 0) {
      this.setAshtrays(Array.from(this.multiplayer.currentAshtrays.values()));
    }

    // Hook up chess boards updates from multiplayer
    this.multiplayer.onChessBoardsSync((chessBoards) => {
      this.setChessBoards(chessBoards);
    });
    this.multiplayer.onChessBoardUpdate((chessBoard) => {
      this.updateChessBoard(chessBoard);
    });
    this.multiplayer.onChessBoardDelete((chessBoardId) => {
      this.removeChessBoard(chessBoardId);
    });
    if (this.multiplayer.currentChessBoards && this.multiplayer.currentChessBoards.size > 0) {
      this.setChessBoards(Array.from(this.multiplayer.currentChessBoards.values()));
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
      const hex = colorStr.replace("#", "").slice(0, 6);
      const val = parseInt(hex, 16);
      return Number.isNaN(val) ? 0x3b8282 : val;
    } catch {
      return 0x3b8282;
    }
  }

  private parseAlpha(colorStr: string | null | undefined): number {
    if (!colorStr) return 1;
    try {
      const hex = colorStr.replace("#", "");
      if (hex.length === 8) {
        const alphaByte = parseInt(hex.slice(6, 8), 16);
        if (!Number.isNaN(alphaByte)) {
          return Phaser.Math.Clamp(alphaByte / 255, 0, 1);
        }
      }
      return 1;
    } catch {
      return 1;
    }
  }

  public computeLayerDepth(layer: number = 0, isOntop: boolean = false): number {
    const safeLayer = Number.isFinite(layer) ? layer : 0;
    if (isOntop) {
      return Phaser.Math.Clamp(110 + safeLayer * 0.05, 101, 118.5);
    }
    // Base floor is at depth 0.1, so minimum overlay/decoration depth is >= 0.25 (always above floor)
    return Phaser.Math.Clamp(10 + safeLayer * 0.05, 0.25, 98.5);
  }

  public isLayerableEditorSelection(): boolean {
    if (
      this.activeEditorTool === "decoration" ||
      this.activeEditorTool === "freeform_decoration" ||
      this.activeEditorTool === "jukebox" ||
      this.activeEditorTool === "typewriter"
    ) {
      return true;
    }
    if (
      this.activeEditorTool === "flooring" &&
      (isOverlayFloorAsset(this.selectedAssetKey) || isOverlayWallAsset(this.selectedAssetKey))
    ) {
      return true;
    }
    return false;
  }

  public setPlacementLayer(layer: number) {
    this.placementLayer = Math.max(-150, Math.min(150, Math.round(layer)));
    this.syncGhostDepths();
    if (this.isSelectingArea) {
      this.updateSelectionVisuals();
    } else if (this.isEditMode && this.editorOverlayText && this.editorOverlayText.visible) {
      const currentText = this.editorOverlayText.text || "";
      if (currentText.includes("Layer ")) {
        this.editorOverlayText.setText(
          currentText.replace(/Layer -?\d+/, `Layer ${this.placementLayer}`)
        );
      }
    }
    if (this.onPlacementLayerChange) {
      this.onPlacementLayerChange(this.placementLayer);
    }
  }

  public adjustPlacementLayer(delta: number) {
    if (typeof (window as any).adjustPlacementLayer === "function") {
      (window as any).adjustPlacementLayer(delta);
    } else {
      this.setPlacementLayer(this.placementLayer + delta);
    }
  }

  private syncGhostDepths() {
    const ghostDepth = this.computeLayerDepth(this.placementLayer, this.decorationOntop);
    if (this.editorFreeformGhost) {
      this.editorFreeformGhost.setDepth(ghostDepth);
    }
    if (this.editorJukeboxGhost) {
      this.editorJukeboxGhost.setDepth(ghostDepth);
    }
    if (this.editorTypewriterGhost) {
      this.editorTypewriterGhost.setDepth(ghostDepth);
    }
    if (this.editorAshtrayGhost) {
      this.editorAshtrayGhost.setDepth(ghostDepth);
    }
  }

  private parseLayerPart(partStr: string, defaultOntop: boolean = false): GridDecoItem {
    let working = partStr;
    let isOntop = defaultOntop;
    if (working.endsWith("^ontop")) {
      isOntop = true;
      working = working.slice(0, -6);
    } else if (working.endsWith("^behind")) {
      isOntop = false;
      working = working.slice(0, -7);
    }

    let layer = 0;
    const atIdx = working.lastIndexOf("@");
    if (atIdx !== -1) {
      const layerNum = parseInt(working.slice(atIdx + 1), 10);
      if (!Number.isNaN(layerNum)) {
        layer = layerNum;
      }
      working = working.slice(0, atIdx);
    }

    let assetKey = working;
    let color: string | null = null;
    if (working.includes("|")) {
      const [k, c] = working.split("|");
      assetKey = k;
      color = c && c !== "none" ? c : null;
    }

    return {
      rawPart: partStr,
      assetKey,
      color,
      layer,
      isOntop,
    };
  }

  private formatLayerPart(
    assetKey: string,
    color: string | null | undefined,
    layer: number = 0,
    isOntop: boolean = false
  ): string {
    const base = color ? `${assetKey}|${color}` : assetKey;
    const layerSuffix = `@${Math.round(layer)}`;
    const ontopSuffix = isOntop ? "^ontop" : "";
    return `${base}${layerSuffix}${ontopSuffix}`;
  }

  private parseTileComponents(rawValue: string | undefined): {
    basePart: string;
    overlayFloorPart: string | null;
    overlayFloorLayer: number;
    decoPart: string | null;
    decoLayer: number;
    decoParts: GridDecoItem[];
    hasObstacle: boolean;
    isOntop: boolean;
  } {
    let basePart = "grass_4";
    let overlayFloorPart: string | null = null;
    let overlayFloorLayer = 0;
    let decoPart: string | null = null;
    let decoLayer = 0;
    const decoParts: GridDecoItem[] = [];
    let hasObstacle = false;
    let isOntop = false;

    if (!rawValue) {
      return {
        basePart,
        overlayFloorPart,
        overlayFloorLayer,
        decoPart,
        decoLayer,
        decoParts,
        hasObstacle,
        isOntop,
      };
    }

    const parts = rawValue.includes("::") ? rawValue.split("::") : [rawValue];
    const nonFlagParts: string[] = [];
    for (const p of parts) {
      const baseKey = p.includes("|") ? p.split("|")[0] : p.split("@")[0].split("^")[0];
      if (baseKey === "obstacle") {
        hasObstacle = true;
      } else if (baseKey === "ontop" || baseKey === "above") {
        isOntop = true;
      } else if (baseKey === "behind" || baseKey === "below") {
        isOntop = false;
      } else {
        nonFlagParts.push(p);
      }
    }

    if (nonFlagParts.length > 0) {
      basePart = nonFlagParts[0] || "grass_4";
      for (let i = 1; i < nonFlagParts.length; i++) {
        const part = nonFlagParts[i];
        const parsed = this.parseLayerPart(part, isOntop);
        if (isOverlayFloorAsset(parsed.assetKey)) {
          overlayFloorPart = parsed.color ? `${parsed.assetKey}|${parsed.color}` : parsed.assetKey;
          overlayFloorLayer = parsed.layer;
        } else {
          decoParts.push(parsed);
        }
      }
    }

    if (decoParts.length > 0) {
      // Sort by render depth so the last item is the topmost decoration on this tile
      decoParts.sort(
        (a, b) =>
          this.computeLayerDepth(a.layer, a.isOntop) - this.computeLayerDepth(b.layer, b.isOntop)
      );
      const topDeco = decoParts[decoParts.length - 1];
      decoPart = topDeco.color ? `${topDeco.assetKey}|${topDeco.color}` : topDeco.assetKey;
      decoLayer = topDeco.layer;
      isOntop = topDeco.isOntop;
    }

    return {
      basePart,
      overlayFloorPart,
      overlayFloorLayer,
      decoPart,
      decoLayer,
      decoParts,
      hasObstacle,
      isOntop,
    };
  }

  private buildTileString(comp: {
    basePart: string;
    overlayFloorPart?: string | null;
    overlayFloorLayer?: number;
    decoPart?: string | null;
    decoLayer?: number;
    decoParts?: GridDecoItem[];
    hasObstacle?: boolean;
    isOntop?: boolean;
  }): string {
    const out: string[] = [comp.basePart || "grass_4"];
    if (comp.overlayFloorPart) {
      const parsedOv = this.parseLayerPart(comp.overlayFloorPart, false);
      const ovLayer =
        comp.overlayFloorLayer !== undefined ? comp.overlayFloorLayer : parsedOv.layer;
      out.push(this.formatLayerPart(parsedOv.assetKey, parsedOv.color, ovLayer, false));
    }
    if (comp.decoParts && comp.decoParts.length > 0) {
      for (const d of comp.decoParts) {
        out.push(this.formatLayerPart(d.assetKey, d.color, d.layer, d.isOntop));
      }
      if (comp.decoParts.some((d) => d.isOntop)) {
        out.push("ontop");
      }
    } else if (comp.decoPart) {
      const parsedDeco = this.parseLayerPart(comp.decoPart, !!comp.isOntop);
      const dLayer = comp.decoLayer !== undefined ? comp.decoLayer : parsedDeco.layer;
      const dOntop = comp.isOntop !== undefined ? comp.isOntop : parsedDeco.isOntop;
      out.push(this.formatLayerPart(parsedDeco.assetKey, parsedDeco.color, dLayer, dOntop));
      if (dOntop) {
        out.push("ontop");
      }
    }
    if (comp.hasObstacle) {
      out.push("obstacle");
    }
    return out.join("::");
  }

  private createPlayerVisual(sessionId: string, player: any) {
    if (this.playerVisuals.has(sessionId)) return;

    const colorNum = this.parseColor(player.color);

    // Initial facing direction (defaults to front/down)
    const initialDir = (player.direction && player.direction !== "idle" ? player.direction : "down") as ("left" | "right" | "up" | "down");

    // Sprite for avatar (defaults to idle sheet atlas)
    const sprite = this.textures.exists("player_idle_sheet")
      ? this.add.image(0, CHARACTER_MAX_SIZE / 2, "player_idle_sheet", "sprite1")
      : this.add.image(0, CHARACTER_MAX_SIZE / 2, "default_avatar_idle");
    sprite.setOrigin(0.5, 1.0);
    sprite.setVisible(true);

    const scale = CHARACTER_MAX_SIZE / 25;
    sprite.setDisplaySize(16 * scale, 25 * scale);

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
      const hitZone = this.add.rectangle(0, -5, 54, 66, 0x000000, 0);
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
      facingDirection: initialDir,
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
    if (!visual) return ["sprite1"];

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

    if (dir === "left" || dir === "right") {
      return ["sprite9", "sprite10", "sprite11", "sprite12"];
    }
    if (dir === "up") {
      return ["sprite17", "sprite18", "sprite19", "sprite20"];
    }
    return ["sprite1", "sprite2", "sprite3", "sprite4"];
  }

  private getVisualFramesCount(
    sessionId: string,
    dir: "idle" | "left" | "right" | "up" | "down",
    facingDir: "left" | "right" | "up" | "down",
  ): number {
    const visual = this.playerVisuals.get(sessionId);
    if (!visual) return 1;

    if (visual.avatars) {
      const activeDir = dir !== "idle" ? dir : (facingDir || "down");
      const customFrames = dir !== "idle"
        ? this.getVisualFrames(sessionId, activeDir)
        : (this.getVisualFrames(sessionId, "idle").length > 0
            ? this.getVisualFrames(sessionId, "idle")
            : this.getVisualFrames(sessionId, activeDir));
      if (customFrames.length > 0) return customFrames.length;
    }

    // Default atlas always has 4 frames per direction
    return 4;
  }

  private cleanupCustomAvatars(sessionId: string) {
    const visual = this.playerVisuals.get(sessionId);
    if (visual) {
      visual.avatars = undefined;
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

    if (visual) {
      this.updateVisualSprite(sessionId);
    }
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
      return frames.some((f) => typeof f === "string" && (f.startsWith("data:image/") || f.startsWith("/") || f.startsWith("http")));
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
        if (!frameSrc || (!frameSrc.startsWith("data:image/") && !frameSrc.startsWith("/") && !frameSrc.startsWith("http"))) return;

        const texKey = `avatar_${sessionId}_${dir}_${idx}`;
        const registerTex = () => {
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

        const img = new Image();
        img.onload = registerTex;
        img.src = frameSrc;
        if (img.complete && img.naturalWidth > 0) {
          registerTex();
        }
      });
    });
  }

  private updateVisualSprite(sessionId: string) {
    const visual = this.playerVisuals.get(sessionId);
    if (!visual) return;

    const isMoving = visual.currentDirection !== "idle";
    const activeDir: "left" | "right" | "up" | "down" = isMoving
      ? (visual.currentDirection as "left" | "right" | "up" | "down")
      : (visual.facingDirection || "down");

    // 1. If player has custom uploaded avatar pictures
    if (visual.avatars) {
      const customFrames = isMoving
        ? this.getVisualFrames(sessionId, activeDir)
        : (this.getVisualFrames(sessionId, "idle").length > 0
            ? this.getVisualFrames(sessionId, "idle")
            : this.getVisualFrames(sessionId, activeDir));

      if (customFrames.length > 0) {
        const frameKey = customFrames[visual.currentFrameIdx % customFrames.length];
        if (this.textures.exists(frameKey)) {
          visual.sprite.setTexture(frameKey);
          visual.sprite.setOrigin(0.5, 1.0);
          visual.sprite.setPosition(0, CHARACTER_MAX_SIZE / 2);
          visual.sprite.setFlipX(false);

          const MAX_DIM = CHARACTER_MAX_SIZE;
          const fw = visual.sprite.width;
          const fh = visual.sprite.height;
          if (fw > 0 && fh > 0) {
            const ratio = Math.min(MAX_DIM / fw, MAX_DIM / fh);
            visual.sprite.setDisplaySize(fw * ratio, fh * ratio);
          } else {
            visual.sprite.setDisplaySize(MAX_DIM, MAX_DIM);
          }
          visual.nameTag.setPosition(0, -CHARACTER_MAX_SIZE / 2 - 12);
          return;
        }
      }
    }

    // 2. Default character using:
    // - Idle: 16x32_idle_sheet atlas & idle_sprites_mapping.json
    // - Walking / Moving: 16x32_walk_sheet atlas & walk_sprites_mapping.json
    // Array number used is the same as idle:
    // - facing front and down (south) - sprites1 until sprites4
    // - facing right and left - sprites9 until sprites12. default is facing right. flip image when facing left.
    // - facing north - sprites17 until sprites20.
    let frameList: string[];
    let shouldFlip = false;

    if (activeDir === "down") {
      frameList = ["sprite1", "sprite2", "sprite3", "sprite4"];
      shouldFlip = false;
    } else if (activeDir === "right") {
      frameList = ["sprite9", "sprite10", "sprite11", "sprite12"];
      shouldFlip = false;
    } else if (activeDir === "left") {
      frameList = ["sprite9", "sprite10", "sprite11", "sprite12"];
      shouldFlip = true;
    } else { // activeDir === "up" (north)
      frameList = ["sprite17", "sprite18", "sprite19", "sprite20"];
      shouldFlip = false;
    }

    const frameName = frameList[visual.currentFrameIdx % frameList.length];
    const targetAtlas = isMoving && this.textures.exists("player_walk_sheet")
      ? "player_walk_sheet"
      : "player_idle_sheet";

    try {
      if (this.textures.exists(targetAtlas)) {
        visual.sprite.setTexture(targetAtlas, frameName);
      } else if (this.textures.exists("player_idle_sheet")) {
        visual.sprite.setTexture("player_idle_sheet", frameName);
      } else if (this.textures.exists("default_avatar_idle")) {
        visual.sprite.setTexture("default_avatar_idle");
      }

      visual.sprite.setFlipX(shouldFlip);
      visual.sprite.setOrigin(0.5, 1.0);
      visual.sprite.setPosition(0, CHARACTER_MAX_SIZE / 2);

      const scale = CHARACTER_MAX_SIZE / 25;
      const fw = visual.sprite.width;
      const fh = visual.sprite.height;
      if (fw > 0 && fh > 0) {
        visual.sprite.setDisplaySize(fw * scale, fh * scale);
      } else {
        visual.sprite.setDisplaySize(16 * scale, 25 * scale);
      }

      visual.nameTag.setPosition(0, -CHARACTER_MAX_SIZE / 2 - 12);
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
      } else if (player.direction && player.direction !== "idle" && player.direction !== visual.currentDirection) {
        visual.facingDirection = player.direction as ("left" | "right" | "up" | "down");
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

  public isSmokingGameModalOpen(): boolean {
    const el = document.getElementById("ashtray-modal");
    return !!(el && !el.classList.contains("hidden"));
  }

  public isChessModalOpen(): boolean {
    const el = document.getElementById("chess-modal");
    return !!(el && !el.classList.contains("hidden"));
  }

  public setControlsActive(active: boolean) {
    if (active && (this.isTyperaceModalOpen() || this.isSmokingGameModalOpen() || this.isChessModalOpen())) {
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
      Phaser.Input.Keyboard.KeyCodes.SPACE,
    ]);
  }

  update(time: number, delta: number) {
    const dtSeconds = delta / 1000;

    // In Edit Mode, WASD pans the camera smoothly instead of moving player (no arrow keys)
    if (this.isEditMode) {
      const panSpeed = 700 * dtSeconds;
      let camDx = 0;
      let camDy = 0;
      if (this.wasdKeys) {
        if (this.wasdKeys.A.isDown) camDx -= panSpeed;
        if (this.wasdKeys.D.isDown) camDx += panSpeed;
        if (this.wasdKeys.W.isDown) camDy -= panSpeed;
        if (this.wasdKeys.S.isDown) camDy += panSpeed;
      }
      if (camDx !== 0 || camDy !== 0) {
        const overflowX = Math.max(800, this.cameras.main.width);
        const overflowY = Math.max(800, this.cameras.main.height);
        this.cameras.main.scrollX = Phaser.Math.Clamp(
          this.cameras.main.scrollX + camDx,
          -overflowX,
          WORLD_WIDTH + overflowX - this.cameras.main.width
        );
        this.cameras.main.scrollY = Phaser.Math.Clamp(
          this.cameras.main.scrollY + camDy,
          -overflowY,
          WORLD_HEIGHT + overflowY - this.cameras.main.height
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

    // 1. Read input state (WASD only, no arrow keys)
    let left = false;
    let right = false;
    let up = false;
    let down = false;

    if (this.isTyperaceModalOpen() || this.isSmokingGameModalOpen() || this.isChessModalOpen()) {
      if (this.controlsActive) {
        this.setControlsActive(false);
      }
      this.virtualInput = { left: false, right: false, up: false, down: false };
      left = false;
      right = false;
      up = false;
      down = false;
    } else if (this.controlsActive && this.wasdKeys) {
      left = this.wasdKeys.A.isDown || this.virtualInput.left;
      right = this.wasdKeys.D.isDown || this.virtualInput.right;
      up = this.wasdKeys.W.isDown || this.virtualInput.up;
      down = this.wasdKeys.S.isDown || this.virtualInput.down;
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
            const pixelChecker = this.getPixelCollisionChecker();
            const resolved = resolveMovement(
              localVisual.container.x,
              localVisual.container.y,
              vx,
              vy,
              dtSeconds,
              undefined,
              PLAYER_HITBOX_HALF_WIDTH,
              undefined,
              pixelChecker
            );

            localVisual.container.x = resolved.x;
            localVisual.container.y = resolved.y;
          } catch (e) {
            console.error("resolveMovement error:", e);
          }
        }

        if (localVisual.currentDirection !== targetDir) {
          if (targetDir !== "idle") {
            localVisual.facingDirection = targetDir;
          }
          localVisual.currentDirection = targetDir;
          localVisual.currentFrameIdx = 0;
          localVisual.animTimer = 0;
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

            if (remoteDir !== "idle") {
              remoteVisual.facingDirection = remoteDir;
            }

            if (remoteVisual.currentDirection !== remoteDir) {
              remoteVisual.currentDirection = remoteDir;
              remoteVisual.currentFrameIdx = 0;
              remoteVisual.animTimer = 0;
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

    // 4. Animate sprites (idle breathing & walking cycles, ~6 FPS)
    const FRAME_DURATION = 0.166;
    this.playerVisuals.forEach((visual, sId) => {
      visual.animTimer += dtSeconds;
      if (visual.animTimer >= FRAME_DURATION) {
        visual.animTimer -= FRAME_DURATION;
        const count = this.getVisualFramesCount(sId, visual.currentDirection, visual.facingDirection);
        if (count > 1) {
          visual.currentFrameIdx = (visual.currentFrameIdx + 1) % count;
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

        // Update nearby ashtray state for interaction
        let closestAshtray: AshtrayState | null = null;
        let closestAshtrayDist = Infinity;
        this.ashtrayVisuals.forEach((atVisual) => {
          const at = atVisual.state;
          const dist = Phaser.Math.Distance.Between(lx, ly, at.x, at.y);
          if (dist < closestAshtrayDist) {
            closestAshtrayDist = dist;
            closestAshtray = at;
          }
          const isNearby = dist <= 1.5 * TILE_SIZE;
          if (atVisual.promptText) {
            atVisual.promptText.setVisible(isNearby && !this.isEditMode && !this.isSmokingGameModalOpen());
          }
        });
        const nearbyAt = closestAshtrayDist <= 1.5 * TILE_SIZE ? closestAshtray : null;
        this.nearbyAshtrayId = nearbyAt ? (nearbyAt as AshtrayState).id : null;

        // Update nearby chess board state for interaction
        let closestChessBoard: ChessBoardState | null = null;
        let closestChessBoardDist = Infinity;
        this.chessBoardVisuals.forEach((cbVisual) => {
          const cb = cbVisual.state;
          const dist = Phaser.Math.Distance.Between(lx, ly, cb.x, cb.y);
          if (dist < closestChessBoardDist) {
            closestChessBoardDist = dist;
            closestChessBoard = cb;
          }
          const isNearby = dist <= 1.5 * TILE_SIZE;
          if (cbVisual.promptText) {
            cbVisual.promptText.setVisible(isNearby && !this.isEditMode && !this.isChessModalOpen());
          }
        });
        const nearbyCb = closestChessBoardDist <= 1.5 * TILE_SIZE ? closestChessBoard : null;
        this.nearbyChessBoardId = nearbyCb ? (nearbyCb as ChessBoardState).id : null;

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

    // 8. Update active editor cursor item menu screen position
    if (this.activeEditorMenuItem) {
      if (!this.isEditMode || this.activeEditorTool !== "cursor") {
        this.closeEditorItemMenu();
      } else {
        const cam = this.cameras.main;
        const screenX =
          (this.activeEditorMenuItem.worldX - cam.scrollX - cam.width * 0.5) * cam.zoom +
          cam.width * 0.5;
        const screenY =
          (this.activeEditorMenuItem.worldY - cam.scrollY - cam.height * 0.5) * cam.zoom +
          cam.height * 0.5;
        if (this.onEditorItemMenuPositionUpdate) {
          this.onEditorItemMenuPositionUpdate({
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
    if (!isEditMode) {
      return;
    }
    this.gridGraphics.lineStyle(1, 0x3b8282, 0.28);
    for (let x = 0; x <= WORLD_WIDTH; x += TILE_SIZE) {
      this.gridGraphics.lineBetween(x, 0, x, WORLD_HEIGHT);
    }
    for (let y = 0; y <= WORLD_HEIGHT; y += TILE_SIZE) {
      this.gridGraphics.lineBetween(0, y, WORLD_WIDTH, y);
    }
    this.gridGraphics.setDepth(0.11);
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
      if (!anyModalOpen && !this.controlsActive && !this.isTyperaceModalOpen() && !this.isSmokingGameModalOpen() && !this.isChessModalOpen()) {
        this.setControlsActive(true);
      }

      if (!this.isEditMode) return;
      const target = pointer.event.target as HTMLElement;
      if (target && target.tagName !== "CANVAS") return;

      if (pointer.leftButtonDown()) {
        if (this.activeEditorTool === "none") {
          this.closeEditorItemMenu();
          return;
        }

        if (this.activeEditorTool === "cursor") {
          const inspected = this.getInspectableItemAt(pointer.worldX, pointer.worldY);
          if (inspected) {
            this.openEditorItemMenu(inspected);
          } else {
            this.closeEditorItemMenu();
          }
          return;
        }

        this.closeEditorItemMenu();

        if (this.activeEditorTool === "jukebox") {
          // Unbounded free-placement (not snapped to grid):
          const jx = Math.round(pointer.worldX);
          const jy = Math.round(pointer.worldY);
          this.multiplayer.placeJukebox(
            jx,
            jy,
            this.decorationPassable,
            this.decorationOntop,
            this.placementLayer
          );
          return;
        }

        if (this.activeEditorTool === "typewriter") {
          // Unbounded free-placement (not snapped to grid):
          const tx = Math.round(pointer.worldX);
          const ty = Math.round(pointer.worldY);
          this.multiplayer.placeTypewriter(
            tx,
            ty,
            this.decorationPassable,
            this.decorationOntop,
            this.placementLayer
          );
          return;
        }

        if (this.activeEditorTool === "ashtray") {
          // Unbounded free-placement (not snapped to grid):
          const ax = Math.round(pointer.worldX);
          const ay = Math.round(pointer.worldY);
          this.multiplayer.placeAshtray(
            ax,
            ay,
            this.decorationPassable,
            this.decorationOntop,
            this.placementLayer
          );
          return;
        }

        if (this.activeEditorTool === "chess_board") {
          // Unbounded free-placement (not snapped to grid):
          const cx = Math.round(pointer.worldX);
          const cy = Math.round(pointer.worldY);
          this.multiplayer.placeChessBoard(
            cx,
            cy,
            this.decorationPassable,
            this.decorationOntop,
            this.placementLayer
          );
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
            this.decorationOntop,
            this.placementLayer
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
        if (this.editorAshtrayGhost) this.editorAshtrayGhost.setVisible(false);
        if (this.editorFreeformGhost) this.editorFreeformGhost.setVisible(false);
        if (this.game.canvas) this.game.canvas.style.cursor = "default";
        return;
      }

      if (this.activeEditorTool === "jukebox") {
        this.editorHoverGraphics.clear();
        if (this.editorFreeformGhost) this.editorFreeformGhost.setVisible(false);
        if (this.editorTypewriterGhost) this.editorTypewriterGhost.setVisible(false);
        if (this.editorJukeboxGhost) {
          this.editorJukeboxGhost.setDepth(
            this.computeLayerDepth(this.placementLayer, this.decorationOntop)
          );
          this.editorJukeboxGhost.setPosition(pointer.worldX, pointer.worldY);
          this.editorJukeboxGhost.setVisible(true);
        }
        this.editorOverlayText.setText(
          `🎵 Jukebox • Layer ${this.placementLayer} (↑/↓) • Click to place`
        );
        this.editorOverlayText.setPosition(pointer.worldX + 28, Math.max(8, pointer.worldY - 28));
        this.editorOverlayText.setVisible(true);
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
        if (this.editorAshtrayGhost) this.editorAshtrayGhost.setVisible(false);
        if (this.editorTypewriterGhost) {
          this.editorTypewriterGhost.setDepth(
            this.computeLayerDepth(this.placementLayer, this.decorationOntop)
          );
          this.editorTypewriterGhost.setPosition(pointer.worldX, pointer.worldY);
          this.editorTypewriterGhost.setVisible(true);
        }
        this.editorOverlayText.setText(
          `⌨️ Typewriter • Layer ${this.placementLayer} (↑/↓) • Click to place`
        );
        this.editorOverlayText.setPosition(pointer.worldX + 28, Math.max(8, pointer.worldY - 28));
        this.editorOverlayText.setVisible(true);
        return;
      } else {
        if (this.editorTypewriterGhost) {
          this.editorTypewriterGhost.setVisible(false);
        }
      }

      if (this.activeEditorTool === "ashtray") {
        this.editorHoverGraphics.clear();
        if (this.editorFreeformGhost) this.editorFreeformGhost.setVisible(false);
        if (this.editorJukeboxGhost) this.editorJukeboxGhost.setVisible(false);
        if (this.editorTypewriterGhost) this.editorTypewriterGhost.setVisible(false);
        if (this.editorChessBoardGhost) this.editorChessBoardGhost.setVisible(false);
        if (this.editorAshtrayGhost) {
          this.editorAshtrayGhost.setDepth(
            this.computeLayerDepth(this.placementLayer, this.decorationOntop)
          );
          this.editorAshtrayGhost.setPosition(pointer.worldX, pointer.worldY);
          this.editorAshtrayGhost.setVisible(true);
        }
        this.editorOverlayText.setText(
          `🚬 Ashtray • Layer ${this.placementLayer} (↑/↓) • Click to place`
        );
        this.editorOverlayText.setPosition(pointer.worldX + 28, Math.max(8, pointer.worldY - 28));
        this.editorOverlayText.setVisible(true);
        return;
      } else {
        if (this.editorAshtrayGhost) {
          this.editorAshtrayGhost.setVisible(false);
        }
      }

      if (this.activeEditorTool === "chess_board") {
        this.editorHoverGraphics.clear();
        if (this.editorFreeformGhost) this.editorFreeformGhost.setVisible(false);
        if (this.editorJukeboxGhost) this.editorJukeboxGhost.setVisible(false);
        if (this.editorTypewriterGhost) this.editorTypewriterGhost.setVisible(false);
        if (this.editorAshtrayGhost) this.editorAshtrayGhost.setVisible(false);
        if (this.editorChessBoardGhost) {
          this.editorChessBoardGhost.setDepth(
            this.computeLayerDepth(this.placementLayer, this.decorationOntop)
          );
          this.editorChessBoardGhost.setPosition(pointer.worldX, pointer.worldY);
          this.editorChessBoardGhost.setVisible(true);
        }
        this.editorOverlayText.setText(
          `♟️ Chess Board • Layer ${this.placementLayer} (↑/↓) • Click to place`
        );
        this.editorOverlayText.setPosition(pointer.worldX + 28, Math.max(8, pointer.worldY - 28));
        this.editorOverlayText.setVisible(true);
        return;
      } else {
        if (this.editorChessBoardGhost) {
          this.editorChessBoardGhost.setVisible(false);
        }
      }

      if (this.activeEditorTool === "freeform_decoration") {
        this.editorHoverGraphics.clear();
        if (this.editorJukeboxGhost) this.editorJukeboxGhost.setVisible(false);
        if (this.editorFreeformGhost) {
          const normKey = normalizeDecorationAssetKey(this.selectedAssetKey);
          const texture = this.textures.exists(normKey)
            ? normKey
            : "office_chair_1_front";
          this.editorFreeformGhost.setTexture(texture);
          this.editorFreeformGhost.setDisplaySize(50, 50);
          if (this.selectedTileColor) {
            this.editorFreeformGhost.setTint(this.parseColor(this.selectedTileColor));
            this.editorFreeformGhost.setAlpha(this.parseAlpha(this.selectedTileColor) * 0.75);
          } else {
            this.editorFreeformGhost.clearTint();
            this.editorFreeformGhost.setAlpha(0.75);
          }
          this.editorFreeformGhost.setDepth(
            this.computeLayerDepth(this.placementLayer, this.decorationOntop)
          );
          this.editorFreeformGhost.setPosition(pointer.worldX, pointer.worldY);
          this.editorFreeformGhost.setVisible(true);
        }
        const label = this.formatAssetDisplayName(this.selectedAssetKey);
        this.editorOverlayText.setText(
          `🪑 ${label} • Layer ${this.placementLayer} (↑/↓) • Click to place`
        );
        this.editorOverlayText.setPosition(pointer.worldX + 28, Math.max(8, pointer.worldY - 28));
        this.editorOverlayText.setVisible(true);
        return;
      } else {
        if (this.editorFreeformGhost) {
          this.editorFreeformGhost.setVisible(false);
        }
      }

      const col = Math.max(0, Math.min(GRID_COLS - 1, Math.floor(pointer.worldX / TILE_SIZE)));
      const row = Math.max(0, Math.min(GRID_ROWS - 1, Math.floor(pointer.worldY / TILE_SIZE)));

      if (this.activeEditorTool === "none") {
        this.editorHoverGraphics.clear();
        this.editorOverlayText.setVisible(false);
        if (this.game.canvas) this.game.canvas.style.cursor = "default";
        return;
      }

      if (this.activeEditorTool === "cursor") {
        this.editorHoverGraphics.clear();
        const inspected = this.getInspectableItemAt(pointer.worldX, pointer.worldY);
        const activeBounds = this.activeEditorMenuItem?.bounds;
        if (activeBounds) {
          this.editorHoverGraphics.lineStyle(2.5, 0xf59e0b, 1);
          this.editorHoverGraphics.strokeRect(
            activeBounds.x,
            activeBounds.y,
            activeBounds.width,
            activeBounds.height
          );
          this.editorHoverGraphics.fillStyle(0xf59e0b, 0.22);
          this.editorHoverGraphics.fillRect(
            activeBounds.x,
            activeBounds.y,
            activeBounds.width,
            activeBounds.height
          );
        }
        if (inspected && inspected.bounds) {
          this.editorHoverGraphics.lineStyle(2, 0x38bdf8, 0.95);
          this.editorHoverGraphics.strokeRect(
            inspected.bounds.x,
            inspected.bounds.y,
            inspected.bounds.width,
            inspected.bounds.height
          );
          this.editorHoverGraphics.fillStyle(0x38bdf8, 0.2);
          this.editorHoverGraphics.fillRect(
            inspected.bounds.x,
            inspected.bounds.y,
            inspected.bounds.width,
            inspected.bounds.height
          );
          this.editorOverlayText.setText(
            `🖱️ ${inspected.categoryLabel}: ${inspected.label} • Click for menu`
          );
          this.editorOverlayText.setPosition(
            inspected.bounds.x + 4,
            Math.max(8, inspected.bounds.y - 30)
          );
          this.editorOverlayText.setVisible(true);
          if (this.game.canvas) this.game.canvas.style.cursor = "pointer";
        } else {
          this.editorOverlayText.setVisible(false);
          if (this.game.canvas) this.game.canvas.style.cursor = "default";
        }
        return;
      }

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
          const raw = this.currentTilesMap.get(`${col},${row}`);
          const comp = this.parseTileComponents(raw);
          const isSameDecoAtLayer = comp.decoParts.some(
            (d) => d.assetKey === this.selectedAssetKey && d.layer === this.placementLayer
          );

          if (isSameDecoAtLayer) {
            // Hovering over placed decoration item on the same layer signals click on it to remove
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
          const label = this.formatAssetDisplayName(this.selectedAssetKey);
          this.editorOverlayText.setText(
            `🪴 ${label} • Layer ${this.placementLayer} (↑/↓) • ${isSameDecoAtLayer ? "Click to remove" : "Click to place"}`
          );
          this.editorOverlayText.setPosition(col * TILE_SIZE + 8, Math.max(8, row * TILE_SIZE - 32));
          this.editorOverlayText.setVisible(true);
        } else {
          const isWall = isWallTile(this.selectedAssetKey) || isWallAsset(this.selectedAssetKey);
          const isOverlayWall = isOverlayWallAsset(this.selectedAssetKey);
          const isOverlayFloor = isOverlayFloorAsset(this.selectedAssetKey);
          const raw = this.currentTilesMap.get(`${col},${row}`);
          const comp = this.parseTileComponents(raw);
          const existingOverlayFloor = comp.overlayFloorPart
            ? comp.overlayFloorPart.split("|")[0]
            : null;
          const isSameOverlay =
            (isOverlayWall &&
              comp.decoParts.some(
                (d) => d.assetKey === this.selectedAssetKey && d.layer === this.placementLayer
              )) ||
            (isOverlayFloor &&
              existingOverlayFloor === this.selectedAssetKey &&
              comp.overlayFloorLayer === this.placementLayer);

          if (isSameOverlay) {
            // Hovering over placed overlay tile/wall signals click on it to remove
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
            const defaultHover = isWall ? 0xdb5b47 : isOverlayFloor ? 0x3b82f6 : 0xeca239;
            const hoverColor = this.selectedTileColor ? this.parseColor(this.selectedTileColor) : defaultHover;
            this.editorHoverGraphics.lineStyle(2, hoverColor, 0.95);
            this.editorHoverGraphics.strokeRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            this.editorHoverGraphics.fillStyle(hoverColor, 0.22);
            this.editorHoverGraphics.fillRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            if (this.game.canvas) this.game.canvas.style.cursor = "crosshair";
          }
          if (isOverlayWall || isOverlayFloor) {
            const label = this.formatAssetDisplayName(this.selectedAssetKey);
            this.editorOverlayText.setText(
              `📐 ${label} • Layer ${this.placementLayer} (↑/↓) • ${isSameOverlay ? "Click to remove" : "Click to place"}`
            );
            this.editorOverlayText.setPosition(col * TILE_SIZE + 8, Math.max(8, row * TILE_SIZE - 32));
            this.editorOverlayText.setVisible(true);
          } else {
            this.editorOverlayText.setVisible(false);
          }
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
        } else if (this.activeEditorTool === "clear_decoration") {
          // Remove decoration or overlay floor layer from clicked tile or dragged area
          const updates: Record<string, string> = {};
          for (let r = minRow; r <= maxRow; r++) {
            for (let c = minCol; c <= maxCol; c++) {
              const existing = this.currentTilesMap.get(`${c},${r}`);
              if (existing && existing.includes("::")) {
                const comp = this.parseTileComponents(existing);
                const isBaseWall = isWallAsset(comp.basePart.split("|")[0]);
                if (comp.decoParts.length > 0) {
                  comp.decoParts = [];
                  comp.decoPart = null;
                  comp.isOntop = false;
                  comp.hasObstacle = isBaseWall;
                } else if (comp.overlayFloorPart) {
                  comp.overlayFloorPart = null;
                  comp.overlayFloorLayer = 0;
                }
                const newVal = this.buildTileString(comp);
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
          // Decoration placed on top of existing bottom tile, respecting passable and layer options
          const decoVal = this.selectedTileColor
            ? `${this.selectedAssetKey}|${this.selectedTileColor}`
            : this.selectedAssetKey;

          const isSingleClick = minCol === maxCol && minRow === maxRow;
          const updates: Record<string, string> = {};

          const applyDecoToComp = (
            comp: ReturnType<GameScene["parseTileComponents"]>,
            allowToggleRemove: boolean
          ) => {
            const isBaseWall = isWallAsset(comp.basePart.split("|")[0]);
            const existingIdx = comp.decoParts.findIndex(
              (d) => d.assetKey === this.selectedAssetKey && d.layer === this.placementLayer
            );

            if (allowToggleRemove && existingIdx !== -1) {
              comp.decoParts.splice(existingIdx, 1);
              if (comp.decoParts.length === 0) {
                comp.decoPart = null;
                comp.isOntop = false;
                comp.hasObstacle = isBaseWall;
              } else {
                const top = comp.decoParts[comp.decoParts.length - 1];
                comp.decoPart = top.rawPart;
                comp.isOntop = top.isOntop;
              }
            } else {
              // Replace any item on the exact same layer, or add as a new layer
              const sameLayerIdx = comp.decoParts.findIndex((d) => d.layer === this.placementLayer);
              const newItem: GridDecoItem = {
                rawPart: decoVal,
                assetKey: this.selectedAssetKey,
                color: this.selectedTileColor,
                layer: this.placementLayer,
                isOntop: this.decorationOntop,
              };
              if (sameLayerIdx !== -1) {
                comp.decoParts[sameLayerIdx] = newItem;
              } else {
                comp.decoParts.push(newItem);
              }
              comp.decoParts.sort(
                (a, b) =>
                  this.computeLayerDepth(a.layer, a.isOntop) -
                  this.computeLayerDepth(b.layer, b.isOntop)
              );
              const top = comp.decoParts[comp.decoParts.length - 1];
              comp.decoPart = top.rawPart;
              comp.isOntop = top.isOntop;
              comp.hasObstacle = isBaseWall
                ? comp.hasObstacle || this.isObstacleEnabled
                : this.isObstacleEnabled;
            }
          };

          if (isSingleClick) {
            const key = `${minCol},${minRow}`;
            const existing = this.currentTilesMap.get(key);
            const comp = this.parseTileComponents(existing);
            applyDecoToComp(comp, true);
            updates[key] = this.buildTileString(comp);
          } else {
            // Dragged area -> place decoration across selection
            for (let r = minRow; r <= maxRow; r++) {
              for (let c = minCol; c <= maxCol; c++) {
                const existing = this.currentTilesMap.get(`${c},${r}`);
                const comp = this.parseTileComponents(existing);
                applyDecoToComp(comp, false);
                updates[`${c},${r}`] = this.buildTileString(comp);
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
          // Normal tile flooring / overlay floor / wall update:
          // Wall tiles come together with the obstacle tile
          const isWall = isWallAsset(this.selectedAssetKey);
          const isOverlayWall = isOverlayWallAsset(this.selectedAssetKey);
          const isOverlayFloor = isOverlayFloorAsset(this.selectedAssetKey);
          const tileVal = this.selectedTileColor
            ? `${this.selectedAssetKey}|${this.selectedTileColor}`
            : this.selectedAssetKey;

          const isSingleClick = minCol === maxCol && minRow === maxRow;
          const updates: Record<string, string> = {};

          for (let r = minRow; r <= maxRow; r++) {
            for (let c = minCol; c <= maxCol; c++) {
              const existing = this.currentTilesMap.get(`${c},${r}`);
              const comp = this.parseTileComponents(existing);

              if (isOverlayFloor) {
                // Overlay plain floor tile (color_tile_overlay) renders on top of existing floor tile without replacing it:
                const existingOverlayKey = comp.overlayFloorPart
                  ? comp.overlayFloorPart.split("|")[0]
                  : null;
                if (
                  isSingleClick &&
                  existingOverlayKey === this.selectedAssetKey &&
                  comp.overlayFloorLayer === this.placementLayer
                ) {
                  comp.overlayFloorPart = null;
                  comp.overlayFloorLayer = 0;
                } else {
                  comp.overlayFloorPart = tileVal;
                  comp.overlayFloorLayer = this.placementLayer;
                }
                updates[`${c},${r}`] = this.buildTileString(comp);
              } else if (isOverlayWall) {
                // Overlay wall (glass_2, glass_3, glass_4, wood_wall_2) is rendered on top of existing floor tiles:
                if (isWallAsset(comp.basePart.split("|")[0])) {
                  comp.basePart = "grass_4";
                }
                const existingIdx = comp.decoParts.findIndex(
                  (d) => d.assetKey === this.selectedAssetKey && d.layer === this.placementLayer
                );
                if (isSingleClick && existingIdx !== -1) {
                  comp.decoParts.splice(existingIdx, 1);
                  if (comp.decoParts.length === 0) {
                    comp.decoPart = null;
                    comp.isOntop = false;
                    comp.hasObstacle = isWallAsset(comp.basePart.split("|")[0]);
                  } else {
                    const top = comp.decoParts[comp.decoParts.length - 1];
                    comp.decoPart = top.rawPart;
                    comp.isOntop = top.isOntop;
                  }
                } else {
                  const sameLayerIdx = comp.decoParts.findIndex(
                    (d) => d.layer === this.placementLayer
                  );
                  const newItem: GridDecoItem = {
                    rawPart: tileVal,
                    assetKey: this.selectedAssetKey,
                    color: this.selectedTileColor,
                    layer: this.placementLayer,
                    isOntop: false,
                  };
                  if (sameLayerIdx !== -1) {
                    comp.decoParts[sameLayerIdx] = newItem;
                  } else {
                    comp.decoParts.push(newItem);
                  }
                  comp.decoParts.sort(
                    (a, b) =>
                      this.computeLayerDepth(a.layer, a.isOntop) -
                      this.computeLayerDepth(b.layer, b.isOntop)
                  );
                  const top = comp.decoParts[comp.decoParts.length - 1];
                  comp.decoPart = top.rawPart;
                  comp.isOntop = top.isOntop;
                  comp.hasObstacle = this.isObstacleEnabled;
                }
                updates[`${c},${r}`] = this.buildTileString(comp);
              } else {
                const oldBaseWasWall = isWallAsset(comp.basePart.split("|")[0]);
                const decoIsWall = comp.decoParts.some((d) => isWallAsset(d.assetKey));
                comp.basePart = tileVal;
                comp.hasObstacle = isWall
                  ? this.isObstacleEnabled
                  : (decoIsWall ? comp.hasObstacle : false);
                updates[`${c},${r}`] = this.buildTileString(comp);
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

    this.input.on("wheel", (pointer: Phaser.Input.Pointer, _objs: any, _dx: number, dy: number) => {
      if (!this.isEditMode) return;
      const cam = this.cameras.main;
      const currentZoom = cam.zoom;
      const newZoom = Phaser.Math.Clamp(currentZoom - dy * 0.001, 0.35, 2.2);
      if (newZoom !== currentZoom) {
        cam.scrollX += (pointer.x - cam.width * 0.5) * (1 / currentZoom - 1 / newZoom);
        cam.scrollY += (pointer.y - cam.height * 0.5) * (1 / currentZoom - 1 / newZoom);
        cam.setZoom(newZoom);
      }
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

      let labelName = "Table 1 Left";
      const normDecoKey = normalizeDecorationAssetKey(this.selectedAssetKey);
      if (normDecoKey === "table_1_left") labelName = "Table 1 Left";
      else if (normDecoKey === "table_1_middle") labelName = "Table 1 Middle";
      else if (normDecoKey === "table_1_right") labelName = "Table 1 Right";
      else if (normDecoKey === "table_2_left") labelName = "Table 2 Left";
      else if (normDecoKey === "table_2_middle") labelName = "Table 2 Middle";
      else if (normDecoKey === "table_2_right") labelName = "Table 2 Right";
      else if (normDecoKey === "round_table_1") labelName = "Round Table 1";
      else if (normDecoKey === "typewriter_1") labelName = "Typewriter 1";
      else if (normDecoKey === "office_chair_1_front") labelName = "Office Chair 1 Front";
      else if (normDecoKey === "office_chair_1_back") labelName = "Office Chair 1 Back";
      else if (normDecoKey === "jukebox_1") labelName = "Jukebox 1";
      const colorBadge = this.selectedTileColor ? ` • ${this.selectedTileColor.toUpperCase()}` : "";
      const layerText = this.decorationOntop ? "On Top" : "Behind";
      this.editorOverlayText.setText(
        `🪴 ${cols} × ${rows} (${totalTiles} ${totalTiles === 1 ? "tile" : "tiles"}) • ${labelName} (${passableText} • ${layerText} • Layer ${this.placementLayer} ↑/↓)${colorBadge} • Esc when done`
      );
    } else {
      const isWall = isWallAsset(this.selectedAssetKey) || isWallTile(this.selectedAssetKey);
      const isOverlay =
        isOverlayFloorAsset(this.selectedAssetKey) || isOverlayWallAsset(this.selectedAssetKey);
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

      let labelName = this.selectedAssetKey;
      if (this.selectedAssetKey === "wood_wall_2" || this.selectedAssetKey === "wall_wood_2") {
        labelName = "Wood Wall 2 (on top of floor + Obstacle)";
      } else if (this.selectedAssetKey.startsWith("wood_wall_")) {
        labelName = `Wood Wall ${this.selectedAssetKey.replace("wood_wall_", "")} (with Obstacle)`;
      } else if (this.selectedAssetKey.startsWith("wall_wood_")) {
        labelName = `Wood Wall ${this.selectedAssetKey.replace("wall_wood_", "")} (with Obstacle)`;
      } else if (this.selectedAssetKey === "wood_5") labelName = "Wood 5";
      else if (this.selectedAssetKey === "carpet_4") labelName = "Carpet 4";
      else if (this.selectedAssetKey === "grass_4") labelName = "Grass 4";
      else if (this.selectedAssetKey.startsWith("wood_")) {
        labelName = `Wood ${this.selectedAssetKey.replace("wood_", "")}`;
      } else if (this.selectedAssetKey.startsWith("carpet_")) {
        labelName = `Carpet ${this.selectedAssetKey.replace("carpet_", "")}`;
      } else if (this.selectedAssetKey.startsWith("grass_")) {
        labelName = `Grass ${this.selectedAssetKey.replace("grass_", "")}`;
      } else if (this.selectedAssetKey.startsWith("stone_")) {
        labelName = `Stone ${this.selectedAssetKey.replace("stone_", "")}`;
      } else if (this.selectedAssetKey.startsWith("marble_")) {
        labelName = `Marble ${this.selectedAssetKey.replace("marble_", "")}`;
      } else if (this.selectedAssetKey === "color_tile") labelName = "Plain Tile";
      else if (this.selectedAssetKey === "color_tile_overlay" || this.selectedAssetKey === "overlay_color_tile")
        labelName = "Overlay Plain Tile (on top of floor)";
      else if (this.selectedAssetKey === "glass_1") labelName = "Glass Wall 1 (with Obstacle)";
      else if (this.selectedAssetKey === "glass_2") labelName = "Glass Wall 2 (on top of floor + Obstacle)";
      else if (this.selectedAssetKey === "glass_3") labelName = "Glass Wall 3 (on top of floor + Obstacle)";
      else if (this.selectedAssetKey === "glass_4") labelName = "Glass Wall 4 (on top of floor + Obstacle)";

      const colorBadge = this.selectedTileColor ? ` • ${this.selectedTileColor.toUpperCase()}` : "";
      const layerBadge = isOverlay ? ` • Layer ${this.placementLayer} (↑/↓)` : "";
      this.editorOverlayText.setText(
        `📐 ${cols} × ${rows} (${totalTiles} ${totalTiles === 1 ? "tile" : "tiles"}) • ${labelName}${layerBadge}${colorBadge} • Esc when done`
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
      this.cameras.main.removeBounds();
    } else {
      this.closeEditorItemMenu();
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

      this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
      this.cameras.main.setZoom(1.0);
      if (this.localPlayerId) {
        const localVisual = this.playerVisuals.get(this.localPlayerId);
        if (localVisual) {
          this.cameras.main.startFollow(localVisual.container, true, 0.12, 0.12);
        }
      }
    }
  }

  public setSelectedAsset(assetKey: string) {
    this.selectedAssetKey = assetKey;
  }

  public setSelectedColor(color: string | null) {
    this.selectedTileColor = color;
  }

  public setObstacleEnabled(enabled: boolean) {
    this.isObstacleEnabled = enabled;
    this.decorationPassable = !enabled;
  }

  public setDecorationPassable(passable: boolean) {
    this.decorationPassable = passable;
    this.isObstacleEnabled = !passable;
  }

  public setDecorationOntop(ontop: boolean) {
    this.decorationOntop = ontop;
    this.syncGhostDepths();
  }

  public hasDecoration(col: number, row: number): boolean {
    const raw = this.currentTilesMap.get(`${col},${row}`);
    if (!raw || !raw.includes("::")) return false;
    const comp = this.parseTileComponents(raw);
    return Boolean(comp.decoPart || comp.overlayFloorPart);
  }

  public getDecorationKey(col: number, row: number): string | null {
    const raw = this.currentTilesMap.get(`${col},${row}`);
    if (!raw || !raw.includes("::")) return null;
    const comp = this.parseTileComponents(raw);
    return comp.decoPart;
  }

  public getOverlayFloorKey(col: number, row: number): string | null {
    const raw = this.currentTilesMap.get(`${col},${row}`);
    if (!raw || !raw.includes("::")) return null;
    const comp = this.parseTileComponents(raw);
    return comp.overlayFloorPart;
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
    for (const visual of this.ashtrayVisuals.values()) {
      const at = visual.state;
      if (at.passable === false) {
        boxes.push({
          minX: at.x - 20,
          maxX: at.x + 20,
          minY: at.y - 18,
          maxY: at.y + 18,
        });
      }
    }
    for (const visual of this.chessBoardVisuals.values()) {
      const cb = visual.state;
      if (cb.passable === false) {
        boxes.push({
          minX: cb.x - 22,
          maxX: cb.x + 22,
          minY: cb.y - 22,
          maxY: cb.y + 22,
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
    ontop: boolean = false,
    layer: number = this.placementLayer
  ) {
    const id =
      "freeform:deco_" +
      Date.now() +
      "_" +
      Math.random().toString(36).substring(2, 7);
    const serialized = serializeFreeformTile(assetKey, x, y, color, passable, ontop, layer);
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
      existing.container.setDepth(this.computeLayerDepth(data.layer ?? 0, data.ontop));
      const normAssetKey = normalizeDecorationAssetKey(data.assetKey);
      const textureKey = this.textures.exists(normAssetKey)
        ? normAssetKey
        : "office_chair_1_front";
      existing.sprite.setTexture(textureKey);
      if (data.color) {
        existing.sprite.setTint(this.parseColor(data.color));
        existing.sprite.setAlpha(this.parseAlpha(data.color));
      } else {
        existing.sprite.clearTint();
        existing.sprite.setAlpha(1);
      }
    } else {
      this.createFreeformVisual(data);
    }
    this.drawObstacles();
  }

  private createFreeformVisual(data: FreeformDecorationData) {
    const normAssetKey = normalizeDecorationAssetKey(data.assetKey);
    const textureKey = this.textures.exists(normAssetKey)
      ? normAssetKey
      : "office_chair_1_front";
    const sprite = this.add.image(0, 0, textureKey);
    sprite.setDisplaySize(50, 50);
    if (data.color) {
      sprite.setTint(this.parseColor(data.color));
      sprite.setAlpha(this.parseAlpha(data.color));
    } else {
      sprite.clearTint();
      sprite.setAlpha(1);
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

        if (this.activeEditorTool === "cursor") {
          this.openEditorItemMenu({
            kind: "freeform_decoration",
            id: data.id,
            label: this.formatAssetDisplayName(data.assetKey),
            categoryLabel: "Decoration",
            worldX: data.x,
            worldY: data.y - 25,
            bounds: { x: data.x - 25, y: data.y - 25, width: 50, height: 50 },
          });
          return;
        }

        if (this.activeEditorTool === "clear_decoration") {
          this.removeFreeformDecoration(data.id);
          if (this.multiplayer) {
            this.multiplayer.sendUpdateTiles({ [data.id]: "" });
          }
          return;
        }

        if (this.activeEditorTool === "jukebox") {
          const jx = Math.round(pointer.worldX);
          const jy = Math.round(pointer.worldY);
          this.multiplayer.placeJukebox(
            jx,
            jy,
            this.decorationPassable,
            this.decorationOntop,
            this.placementLayer
          );
          return;
        }

        if (this.activeEditorTool === "typewriter") {
          const tx = Math.round(pointer.worldX);
          const ty = Math.round(pointer.worldY);
          this.multiplayer.placeTypewriter(
            tx,
            ty,
            this.decorationPassable,
            this.decorationOntop,
            this.placementLayer
          );
          return;
        }

        if (this.activeEditorTool === "ashtray") {
          const ax = Math.round(pointer.worldX);
          const ay = Math.round(pointer.worldY);
          this.multiplayer.placeAshtray(
            ax,
            ay,
            this.decorationPassable,
            this.decorationOntop,
            this.placementLayer
          );
          return;
        }

        if (this.activeEditorTool === "freeform_decoration") {
          const isSameAtSameLayer =
            normalizeDecorationAssetKey(data.assetKey) ===
              normalizeDecorationAssetKey(this.selectedAssetKey) &&
            (data.layer ?? 0) === this.placementLayer;
          if (isSameAtSameLayer) {
            this.removeFreeformDecoration(data.id);
            if (this.multiplayer) {
              this.multiplayer.sendUpdateTiles({ [data.id]: "" });
            }
          } else {
            const fx = Math.round(pointer.worldX);
            const fy = Math.round(pointer.worldY);
            this.placeFreeformDecoration(
              this.selectedAssetKey,
              fx,
              fy,
              this.selectedTileColor,
              this.decorationPassable,
              this.decorationOntop,
              this.placementLayer
            );
          }
          return;
        }

        // For grid tools (decoration, flooring, etc.), initiate area selection at this tile
        const col = Math.max(0, Math.min(GRID_COLS - 1, Math.floor(pointer.worldX / TILE_SIZE)));
        const row = Math.max(0, Math.min(GRID_ROWS - 1, Math.floor(pointer.worldY / TILE_SIZE)));
        this.isSelectingArea = true;
        this.selectionStartTile = { x: col, y: row };
        this.selectionCurrentTile = { x: col, y: row };
        this.updateSelectionVisuals();
      }
    );

    const container = this.add.container(data.x, data.y, [sprite, hitZone]);
    container.setDepth(this.computeLayerDepth(data.layer ?? 0, data.ontop));

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
        const overlayImg = this.overlayTileImages[row]?.[col];
        const decoImg = this.decorationImages[row]?.[col];

        const comp = this.parseTileComponents(rawValue);
        const baseStr = comp.basePart;
        const overlayFloorStr = comp.overlayFloorPart;
        const isObs = comp.hasObstacle;

        if (isObs) {
          this.obstacleTiles.add(key);
        } else {
          this.obstacleTiles.delete(key);
        }

        if (img) {
          let assetKey = "wood_5";
          let tintColor: number | null = null;
          let tintAlpha: number = 1;

          if (baseStr.includes("|")) {
            const [parsedAsset, colorPart] = baseStr.split("|");
            assetKey = parsedAsset || "wood_5";
            if (colorPart && colorPart !== "none") {
              tintColor = this.parseColor(colorPart);
              tintAlpha = this.parseAlpha(colorPart);
            }
          } else if (baseStr.startsWith("#")) {
            assetKey = "color_tile";
            tintColor = this.parseColor(baseStr);
            tintAlpha = this.parseAlpha(baseStr);
          } else {
            assetKey = baseStr;
          }

          assetKey = normalizeFloorAssetKey(assetKey);

          const textureKey = this.textures.exists(assetKey) ? assetKey : "grass_4";
          img.setTexture(textureKey);
          img.setDisplaySize(TILE_SIZE, TILE_SIZE);
          // Floor assets are always strictly at the bottom of everything
          img.setDepth(0.1);

          if (tintColor !== null) {
            img.setTint(tintColor);
          } else {
            img.clearTint();
          }
          img.setAlpha(tintAlpha);
        }

        if (overlayImg) {
          if (overlayFloorStr) {
            let overlayAssetKey = "color_tile_overlay";
            let overlayTintColor: number | null = null;
            let overlayTintAlpha: number = 1;
            if (overlayFloorStr.includes("|")) {
              const [parsedOverlayAsset, overlayColorPart] = overlayFloorStr.split("|");
              overlayAssetKey = parsedOverlayAsset || "color_tile_overlay";
              if (overlayColorPart && overlayColorPart !== "none") {
                overlayTintColor = this.parseColor(overlayColorPart);
                overlayTintAlpha = this.parseAlpha(overlayColorPart);
              }
            } else {
              overlayAssetKey = overlayFloorStr;
            }
            const overlayTexture = this.textures.exists(overlayAssetKey)
              ? overlayAssetKey
              : "color_tile";
            overlayImg.setTexture(overlayTexture);
            overlayImg.setDisplaySize(TILE_SIZE, TILE_SIZE);
            if (overlayTintColor !== null) {
              overlayImg.setTint(overlayTintColor);
            } else {
              overlayImg.clearTint();
            }
            overlayImg.setAlpha(overlayTintAlpha);
            overlayImg.setDepth(this.computeLayerDepth(comp.overlayFloorLayer, false));
            overlayImg.setVisible(true);
          } else {
            overlayImg.setVisible(false);
            overlayImg.clearTint();
            overlayImg.setAlpha(1);
          }
        }

        // Clean up any previous extra decoration images on this tile
        const prevExtra = this.extraTileDecoImages.get(key);
        if (prevExtra) {
          prevExtra.forEach((extraImg) => extraImg.destroy());
          this.extraTileDecoImages.delete(key);
        }

        const configureDecoImage = (
          targetImg: Phaser.GameObjects.Image,
          decoItem: GridDecoItem
        ) => {
          let decoAssetKey = decoItem.assetKey;
          let decoTintColor: number | null = null;
          let decoTintAlpha: number = 1;
          if (decoItem.color && decoItem.color !== "none") {
            decoTintColor = this.parseColor(decoItem.color);
            decoTintAlpha = this.parseAlpha(decoItem.color);
          }
          decoAssetKey = normalizeDecorationAssetKey(decoAssetKey);
          const decoTexture = this.textures.exists(decoAssetKey) ? decoAssetKey : "table_1_left";
          targetImg.setTexture(decoTexture);
          targetImg.setDisplaySize(TILE_SIZE, TILE_SIZE);
          if (decoTintColor !== null) {
            targetImg.setTint(decoTintColor);
          } else {
            targetImg.clearTint();
          }
          targetImg.setAlpha(decoTintAlpha);
          targetImg.setDepth(this.computeLayerDepth(decoItem.layer, decoItem.isOntop));
          targetImg.setVisible(true);
        };

        if (decoImg) {
          if (comp.decoParts.length > 0) {
            configureDecoImage(decoImg, comp.decoParts[0]);
            if (comp.decoParts.length > 1) {
              const extras: Phaser.GameObjects.Image[] = [];
              for (let i = 1; i < comp.decoParts.length; i++) {
                const extraImg = this.add
                  .image(col * TILE_SIZE, row * TILE_SIZE, "table_1_left")
                  .setOrigin(0, 0);
                configureDecoImage(extraImg, comp.decoParts[i]);
                extras.push(extraImg);
              }
              this.extraTileDecoImages.set(key, extras);
            }
          } else {
            decoImg.setVisible(false);
            decoImg.clearTint();
            decoImg.setAlpha(1);
          }
        }
      }
    }
    this.drawObstacles();
  }

  private drawObstacles() {
    this.invalidatePixelCollisionChecker();
    if (!this.obstaclesGraphics) return;
    this.obstaclesGraphics.clear();

    // "it will only show highlight in edit mode. in map, it wont show the obstacle highlight."
    if (!this.isEditMode) return;

    this.obstaclesGraphics.fillStyle(0xef4444, 0.35);

    for (const key of this.obstacleTiles) {
      const [colStr, rowStr] = key.split(",");
      const col = parseInt(colStr, 10);
      const row = parseInt(rowStr, 10);
      if (isNaN(col) || isNaN(row)) continue;

      const x = col * TILE_SIZE;
      const y = row * TILE_SIZE;

      const raw = this.currentTilesMap.get(key);
      const comp = this.parseTileComponents(raw);

      let hasDeco = false;
      if (comp.decoParts.length > 0) {
        hasDeco = true;
        for (const d of comp.decoParts) {
          const rects = getAssetRects(d.assetKey);
          for (const [rx, ry, rw, rh] of rects) {
            this.obstaclesGraphics.fillRect(x + rx, y + ry, rw, rh);
          }
        }
      } else if (comp.decoPart) {
        hasDeco = true;
        const decoKey = comp.decoPart.includes("|") ? comp.decoPart.split("|")[0] : comp.decoPart;
        const rects = getAssetRects(decoKey);
        for (const [rx, ry, rw, rh] of rects) {
          this.obstaclesGraphics.fillRect(x + rx, y + ry, rw, rh);
        }
      }

      if (!hasDeco) {
        const baseKey = comp.basePart
          ? (comp.basePart.includes("|") ? comp.basePart.split("|")[0] : comp.basePart)
          : "";
        if (baseKey && isWallAsset(baseKey)) {
          const rects = getAssetRects(baseKey);
          for (const [rx, ry, rw, rh] of rects) {
            this.obstaclesGraphics.fillRect(x + rx, y + ry, rw, rh);
          }
        } else {
          // Pure legacy obstacle tile
          this.obstaclesGraphics.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        }
      }
    }

    // Highlight solid jukeboxes in edit mode
    for (const visual of this.jukeboxVisuals.values()) {
      if (
        visual.state.passable === false ||
        (!visual.state.passable && (visual.state as any).isSolid)
      ) {
        const bx = visual.state.x - 24;
        const by = visual.state.y - 24;
        const rects = getAssetRects("jukebox_1");
        for (const [rx, ry, rw, rh] of rects) {
          this.obstaclesGraphics.fillRect(bx + rx, by + ry, rw, rh);
        }
      }
    }

    // Highlight solid typewriters in edit mode
    for (const visual of this.typewriterVisuals.values()) {
      if (visual.state.passable === false) {
        const bx = visual.state.x - 24;
        const by = visual.state.y - 24;
        const rects = getAssetRects("typewriter_1");
        for (const [rx, ry, rw, rh] of rects) {
          this.obstaclesGraphics.fillRect(bx + rx, by + ry, rw, rh);
        }
      }
    }

    // Highlight solid ashtrays in edit mode
    for (const visual of this.ashtrayVisuals.values()) {
      if (visual.state.passable === false) {
        const bx = visual.state.x - 24;
        const by = visual.state.y - 24;
        const rects = getAssetRects("ashtray_1");
        for (const [rx, ry, rw, rh] of rects) {
          this.obstaclesGraphics.fillRect(bx + rx, by + ry, rw, rh);
        }
      }
    }

    // Highlight solid chess boards in edit mode
    for (const visual of this.chessBoardVisuals.values()) {
      if (visual.state.passable === false) {
        const bx = visual.state.x - 24;
        const by = visual.state.y - 24;
        const rects = getAssetRects("chess_board_1");
        for (const [rx, ry, rw, rh] of rects) {
          this.obstaclesGraphics.fillRect(bx + rx, by + ry, rw, rh);
        }
      }
    }

    // Highlight solid freeform decorations in edit mode
    for (const visual of this.freeformVisuals.values()) {
      if (!visual.data.passable) {
        const bx = visual.data.x - 25;
        const by = visual.data.y - 25;
        const rects = getAssetRects(visual.data.assetKey);
        for (const [rx, ry, rw, rh] of rects) {
          this.obstaclesGraphics.fillRect(bx + rx, by + ry, rw, rh);
        }
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
      const comp = this.parseTileComponents(raw);
      // Check decoration part first if present
      if (comp.decoPart && comp.decoPart.includes("|")) {
        const c = comp.decoPart.split("|")[1];
        if (c && c !== "none") return c;
      }

      // Check overlay floor part if present
      if (comp.overlayFloorPart) {
        if (comp.overlayFloorPart.includes("|")) {
          const c = comp.overlayFloorPart.split("|")[1];
          if (c && c !== "none") return c;
        } else {
          return "#FFFFFF";
        }
      }

      // Check base part
      const basePart = comp.basePart;
      if (basePart) {
        if (basePart.includes("|")) {
          const c = basePart.split("|")[1];
          if (c && c !== "none") return c;
        } else if (basePart.startsWith("#")) {
          return basePart;
        } else if (basePart === "color_tile") {
          return "#FFFFFF";
        }
      }
    }

    // 2. If no explicit tint, sample texture pixel color from the base tile image
    try {
      const baseRaw = raw ? raw.split("::")[0].split("|")[0] : "grass_4";
      const normalizedBase = normalizeFloorAssetKey(baseRaw);
      const textureKey = this.textures.exists(normalizedBase) ? normalizedBase : "grass_4";
      const texture = this.textures.get(textureKey);
      if (texture && texture.source && texture.source[0]) {
        const imgWidth = texture.source[0].width || 96;
        const imgHeight = texture.source[0].height || 96;
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
    this.extraTileDecoImages.forEach((imgs) => imgs.forEach((img) => img.destroy()));
    this.extraTileDecoImages.clear();
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const img = this.tileImages[r]?.[c];
        if (img) {
          img.setTexture("grass_4");
          img.setDisplaySize(TILE_SIZE, TILE_SIZE);
          img.setDepth(0.1);
          img.clearTint();
          img.setAlpha(1);
        }
        const overlayImg = this.overlayTileImages[r]?.[c];
        if (overlayImg) {
          overlayImg.setVisible(false);
          overlayImg.clearTint();
          overlayImg.setAlpha(1);
        }
        const decoImg = this.decorationImages[r]?.[c];
        if (decoImg) {
          decoImg.setVisible(false);
          decoImg.clearTint();
          decoImg.setAlpha(1);
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
      | "none"
      | "cursor"
      | "flooring"
      | "decoration"
      | "clear_decoration"
      | "private_zone"
      | "clear_private_zone"
      | "jukebox"
      | "typewriter"
      | "ashtray"
      | "chess_board"
      | "freeform_decoration"
      | "spawn_point"
      | "color_dropper"
  ) {
    this.activeEditorTool = tool;
    if (tool !== "cursor") {
      this.closeEditorItemMenu();
    }
    if (tool === "none") {
      this.editorHoverGraphics.clear();
      this.editorSelectionGraphics.clear();
      this.editorOverlayText.setVisible(false);
    }
    if (this.game.canvas) {
      if (tool === "clear_decoration" || tool === "cursor") {
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
    if (tool !== "ashtray" && this.editorAshtrayGhost) {
      this.editorAshtrayGhost.setVisible(false);
    }
    if (tool !== "chess_board" && this.editorChessBoardGhost) {
      this.editorChessBoardGhost.setVisible(false);
    }
    if (tool !== "freeform_decoration" && this.editorFreeformGhost) {
      this.editorFreeformGhost.setVisible(false);
    }
  }

  public formatAssetDisplayName(rawKey: string): string {
    const clean = rawKey.includes("|") ? rawKey.split("|")[0] : rawKey;
    const norm = normalizeDecorationAssetKey(normalizeFloorAssetKey(clean));
    if (norm === "ashtray_1") return "Ashtray";
    if (norm === "chess_board_1" || norm === "chess_board") return "Chess Board";
    if (norm === "typewriter_1") return "Typewriter";
    if (norm === "jukebox_1") return "YouTube Jukebox";
    if (norm === "office_chair_1_front") return "Office Chair 1 Front";
    if (norm === "office_chair_1_back") return "Office Chair 1 Back";
    if (norm === "table_1_left") return "Table 1 Left";
    if (norm === "table_1_middle") return "Table 1 Middle";
    if (norm === "table_1_right") return "Table 1 Right";
    if (norm === "table_2_left") return "Table 2 Left";
    if (norm === "table_2_middle") return "Table 2 Middle";
    if (norm === "table_2_right") return "Table 2 Right";
    if (norm === "round_table_1") return "Round Table 1";
    if (norm === "color_tile") return "Plain Tile";
    if (norm === "color_tile_overlay" || norm === "overlay_color_tile") return "Overlay Plain Tile";
    if (norm.startsWith("glass_")) return `Glass Wall ${norm.replace("glass_", "")}`;
    if (norm.startsWith("wood_wall_")) return `Wood Wall ${norm.replace("wood_wall_", "")}`;
    if (norm.startsWith("wall_wood_")) return `Wood Wall ${norm.replace("wall_wood_", "")}`;
    if (norm.startsWith("wood_")) return `Wood ${norm.replace("wood_", "")}`;
    if (norm.startsWith("carpet_")) return `Carpet ${norm.replace("carpet_", "")}`;
    if (norm.startsWith("grass_")) return `Grass ${norm.replace("grass_", "")}`;
    if (norm.startsWith("stone_")) return `Stone ${norm.replace("stone_", "")}`;
    if (norm.startsWith("marble_")) return `Marble ${norm.replace("marble_", "")}`;
    return norm;
  }

  public getInspectableItemAt(worldX: number, worldY: number): InspectableMapItem | null {
    // Check Chess Boards (freeform)
    for (const vis of this.chessBoardVisuals.values()) {
      const cb = vis.state;
      if (Math.abs(worldX - cb.x) <= 26 && Math.abs(worldY - cb.y) <= 26) {
        return {
          kind: "chess_board",
          id: cb.id,
          label: "Chess Board",
          categoryLabel: "Game",
          worldX: cb.x,
          worldY: cb.y - 25,
          bounds: { x: cb.x - 25, y: cb.y - 25, width: 50, height: 50 },
        };
      }
    }

    // 0. Check Ashtrays (freeform)
    for (const vis of this.ashtrayVisuals.values()) {
      const at = vis.state;
      if (Math.abs(worldX - at.x) <= 26 && Math.abs(worldY - at.y) <= 26) {
        return {
          kind: "ashtray",
          id: at.id,
          label: "Ashtray",
          categoryLabel: "Game",
          worldX: at.x,
          worldY: at.y - 24,
          bounds: { x: at.x - 24, y: at.y - 24, width: 48, height: 48 },
        };
      }
    }

    // 1. Check Typewriters (freeform)
    for (const vis of this.typewriterVisuals.values()) {
      const tw = vis.state;
      if (Math.abs(worldX - tw.x) <= 26 && Math.abs(worldY - tw.y) <= 26) {
        return {
          kind: "typewriter",
          id: tw.id,
          label: "Typewriter",
          categoryLabel: "Game",
          worldX: tw.x,
          worldY: tw.y - 24,
          bounds: { x: tw.x - 24, y: tw.y - 24, width: 48, height: 48 },
        };
      }
    }

    // 2. Check Jukeboxes (freeform)
    for (const vis of this.jukeboxVisuals.values()) {
      const jb = vis.state;
      if (Math.abs(worldX - jb.x) <= 26 && Math.abs(worldY - jb.y) <= 26) {
        return {
          kind: "jukebox",
          id: jb.id,
          label: "Jukebox",
          categoryLabel: "Music",
          worldX: jb.x,
          worldY: jb.y - 24,
          bounds: { x: jb.x - 24, y: jb.y - 24, width: 48, height: 48 },
        };
      }
    }

    // 3. Check Freeform Decorations (Chairs, etc.)
    for (const vis of this.freeformVisuals.values()) {
      const d = vis.data;
      if (Math.abs(worldX - d.x) <= 25 && Math.abs(worldY - d.y) <= 25) {
        return {
          kind: "freeform_decoration",
          id: d.id,
          label: this.formatAssetDisplayName(d.assetKey),
          categoryLabel: "Decoration",
          worldX: d.x,
          worldY: d.y - 25,
          bounds: { x: d.x - 25, y: d.y - 25, width: 50, height: 50 },
        };
      }
    }

    // 4. Check Grid Tile at (col, row)
    const col = Math.floor(worldX / TILE_SIZE);
    const row = Math.floor(worldY / TILE_SIZE);
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) {
      return null;
    }

    const tileKey = `${col},${row}`;
    const raw = this.currentTilesMap.get(tileKey);
    const comp = this.parseTileComponents(raw);
    const tileCenterX = col * TILE_SIZE + TILE_SIZE / 2;
    const tileTopY = row * TILE_SIZE;
    const tileBounds = {
      x: col * TILE_SIZE,
      y: row * TILE_SIZE,
      width: TILE_SIZE,
      height: TILE_SIZE,
    };

    // 4a. Top Decoration or Overlay Wall on this tile
    if (comp.decoPart) {
      const decoKey = comp.decoPart.includes("|") ? comp.decoPart.split("|")[0] : comp.decoPart;
      if (isOverlayWallAsset(decoKey) || isWallAsset(decoKey)) {
        return {
          kind: "overlay_wall",
          id: tileKey,
          label: this.formatAssetDisplayName(decoKey),
          categoryLabel: "Wall",
          worldX: tileCenterX,
          worldY: tileTopY,
          col,
          row,
          bounds: tileBounds,
        };
      }
      return {
        kind: "grid_decoration",
        id: tileKey,
        label: this.formatAssetDisplayName(decoKey),
        categoryLabel: "Decoration",
        worldX: tileCenterX,
        worldY: tileTopY,
        col,
        row,
        bounds: tileBounds,
      };
    }

    // 4b. Base Wall on this tile
    const baseKey = comp.basePart.includes("|") ? comp.basePart.split("|")[0] : comp.basePart;
    if (isWallAsset(baseKey) || isWallTile(comp.basePart)) {
      return {
        kind: "wall",
        id: tileKey,
        label: this.formatAssetDisplayName(baseKey),
        categoryLabel: "Wall",
        worldX: tileCenterX,
        worldY: tileTopY,
        col,
        row,
        bounds: tileBounds,
      };
    }

    // 4c. Overlay Floor on this tile
    if (comp.overlayFloorPart) {
      const ovKey = comp.overlayFloorPart.includes("|")
        ? comp.overlayFloorPart.split("|")[0]
        : comp.overlayFloorPart;
      return {
        kind: "overlay_floor",
        id: tileKey,
        label: this.formatAssetDisplayName(ovKey),
        categoryLabel: "Floor",
        worldX: tileCenterX,
        worldY: tileTopY,
        col,
        row,
        bounds: tileBounds,
      };
    }

    // 4d. Custom Spawn Point on this tile
    if (this.currentTilesMap.get("spawn_point") === tileKey) {
      return {
        kind: "spawn_point",
        id: "spawn_point",
        label: "Spawn Point",
        categoryLabel: "Utility",
        worldX: tileCenterX,
        worldY: tileTopY,
        col,
        row,
        bounds: tileBounds,
      };
    }

    // 4e. Standalone Obstacle on this tile
    if (comp.hasObstacle) {
      return {
        kind: "obstacle",
        id: tileKey,
        label: "Obstacle Tile",
        categoryLabel: "Utility",
        worldX: tileCenterX,
        worldY: tileTopY,
        col,
        row,
        bounds: tileBounds,
      };
    }

    // 4f. Placed Floor Tile (non-default or tinted)
    if (comp.basePart && comp.basePart !== "grass_4") {
      return {
        kind: "floor",
        id: tileKey,
        label: this.formatAssetDisplayName(baseKey),
        categoryLabel: "Floor",
        worldX: tileCenterX,
        worldY: tileTopY,
        col,
        row,
        bounds: tileBounds,
      };
    }

    // 4g. Private Zone at this tile
    const zone = this.privateZones.find(
      (z) =>
        col >= z.bounds.minCol &&
        col <= z.bounds.maxCol &&
        row >= z.bounds.minRow &&
        row <= z.bounds.maxRow
    );
    if (zone) {
      return {
        kind: "private_zone",
        id: zone.id,
        label: zone.name || "Private Area",
        categoryLabel: "Private Zone",
        worldX: tileCenterX,
        worldY: tileTopY,
        col,
        row,
        bounds: {
          x: zone.bounds.minCol * TILE_SIZE,
          y: zone.bounds.minRow * TILE_SIZE,
          width: (zone.bounds.maxCol - zone.bounds.minCol + 1) * TILE_SIZE,
          height: (zone.bounds.maxRow - zone.bounds.minRow + 1) * TILE_SIZE,
        },
      };
    }

    // 4h. Default floor tile
    return {
      kind: "floor",
      id: tileKey,
      label: this.formatAssetDisplayName(baseKey),
      categoryLabel: "Floor",
      worldX: tileCenterX,
      worldY: tileTopY,
      col,
      row,
      bounds: tileBounds,
    };
  }

  public openEditorItemMenu(item: InspectableMapItem) {
    this.activeEditorMenuItem = item;
    const cam = this.cameras.main;
    const screenX =
      (item.worldX - cam.scrollX - cam.width * 0.5) * cam.zoom + cam.width * 0.5;
    const screenY =
      (item.worldY - cam.scrollY - cam.height * 0.5) * cam.zoom + cam.height * 0.5;
    if (this.onEditorItemContextMenu) {
      this.onEditorItemContextMenu({ item, screenX, screenY });
    }
  }

  public closeEditorItemMenu() {
    if (!this.activeEditorMenuItem) return;
    this.activeEditorMenuItem = null;
    if (this.onEditorItemMenuPositionUpdate) {
      this.onEditorItemMenuPositionUpdate({ screenX: 0, screenY: 0, visible: false });
    }
  }

  public deleteInspectableItem(item: InspectableMapItem) {
    if (!item) return;

    if (item.kind === "chess_board") {
      this.removeChessBoard(item.id);
      if (this.multiplayer) {
        this.multiplayer.deleteChessBoard(item.id);
      }
    } else if (item.kind === "ashtray") {
      this.removeAshtray(item.id);
      if (this.multiplayer) {
        this.multiplayer.deleteAshtray(item.id);
      }
    } else if (item.kind === "typewriter") {
      this.removeTypewriter(item.id);
      if (this.multiplayer) {
        this.multiplayer.deleteTypewriter(item.id);
      }
    } else if (item.kind === "jukebox") {
      this.removeJukebox(item.id);
      if (this.multiplayer) {
        this.multiplayer.deleteJukebox(item.id);
      }
    } else if (item.kind === "freeform_decoration") {
      this.removeFreeformDecoration(item.id);
      if (this.multiplayer) {
        this.multiplayer.sendUpdateTiles({ [item.id]: "" });
      }
    } else if (item.kind === "grid_decoration" || item.kind === "overlay_wall") {
      const key = item.id;
      const comp = this.parseTileComponents(this.currentTilesMap.get(key));
      if (comp.decoParts.length > 1) {
        comp.decoParts.pop();
        const top = comp.decoParts[comp.decoParts.length - 1];
        comp.decoPart = top.rawPart;
        comp.isOntop = top.isOntop;
      } else {
        comp.decoParts = [];
        comp.decoPart = null;
        comp.isOntop = false;
        const baseAssetOnly = comp.basePart.includes("|")
          ? comp.basePart.split("|")[0]
          : comp.basePart;
        comp.hasObstacle = isWallAsset(baseAssetOnly);
      }
      const nextVal = this.buildTileString(comp);
      this.applyTileUpdates({ [key]: nextVal });
      if (this.multiplayer) {
        this.multiplayer.sendUpdateTiles({ [key]: nextVal });
      }
    } else if (item.kind === "wall") {
      const key = item.id;
      const comp = this.parseTileComponents(this.currentTilesMap.get(key));
      comp.basePart = "grass_4";
      comp.hasObstacle = comp.decoParts.some((d) => isWallAsset(d.assetKey));
      const nextVal = this.buildTileString(comp);
      this.applyTileUpdates({ [key]: nextVal });
      if (this.multiplayer) {
        this.multiplayer.sendUpdateTiles({ [key]: nextVal });
      }
    } else if (item.kind === "overlay_floor") {
      const key = item.id;
      const comp = this.parseTileComponents(this.currentTilesMap.get(key));
      comp.overlayFloorPart = null;
      comp.overlayFloorLayer = 0;
      const nextVal = this.buildTileString(comp);
      this.applyTileUpdates({ [key]: nextVal });
      if (this.multiplayer) {
        this.multiplayer.sendUpdateTiles({ [key]: nextVal });
      }
    } else if (item.kind === "spawn_point") {
      this.currentTilesMap.delete("spawn_point");
      this.drawSpawnPoint();
      if (this.multiplayer) {
        this.multiplayer.sendUpdateTiles({ spawn_point: "" });
      }
    } else if (item.kind === "obstacle") {
      const key = item.id;
      const comp = this.parseTileComponents(this.currentTilesMap.get(key));
      comp.hasObstacle = false;
      const nextVal = this.buildTileString(comp);
      this.applyTileUpdates({ [key]: nextVal });
      if (this.multiplayer) {
        this.multiplayer.sendUpdateTiles({ [key]: nextVal });
      }
    } else if (item.kind === "private_zone") {
      this.removePrivateZone(item.id);
    } else if (item.kind === "floor") {
      const key = item.id;
      const comp = this.parseTileComponents(this.currentTilesMap.get(key));
      comp.basePart = "grass_4";
      const nextVal = this.buildTileString(comp);
      this.applyTileUpdates({ [key]: nextVal });
      if (this.multiplayer) {
        this.multiplayer.sendUpdateTiles({ [key]: nextVal });
      }
    }

    this.closeEditorItemMenu();
    this.editorHoverGraphics.clear();
  }

  public isItemObstacle(item: InspectableMapItem): boolean {
    if (!item) return false;
    if (
      item.kind === "wall" ||
      item.kind === "overlay_wall" ||
      item.kind === "grid_decoration" ||
      item.kind === "floor"
    ) {
      const raw = this.currentTilesMap.get(item.id);
      const comp = this.parseTileComponents(raw);
      return comp.hasObstacle;
    }
    if (item.kind === "freeform_decoration") {
      const vis = this.freeformVisuals.get(item.id);
      return vis ? !vis.data.passable : false;
    }
    if (item.kind === "jukebox") {
      const jb = this.jukeboxVisuals.get(item.id)?.state;
      return jb ? jb.passable === false || (!jb.passable && (jb as any).isSolid) : false;
    }
    if (item.kind === "typewriter") {
      const tw = this.typewriterVisuals.get(item.id)?.state;
      return tw ? tw.passable === false : false;
    }
    if (item.kind === "ashtray") {
      const at = this.ashtrayVisuals.get(item.id)?.state;
      return at ? at.passable === false : false;
    }
    if (item.kind === "chess_board") {
      const cb = this.chessBoardVisuals.get(item.id)?.state;
      return cb ? cb.passable === false : false;
    }
    if (item.kind === "obstacle") {
      return true;
    }
    return false;
  }

  public toggleItemObstacle(item: InspectableMapItem): boolean {
    if (!item) return false;
    if (
      item.kind === "wall" ||
      item.kind === "overlay_wall" ||
      item.kind === "grid_decoration" ||
      item.kind === "floor"
    ) {
      const key = item.id;
      const raw = this.currentTilesMap.get(key);
      const comp = this.parseTileComponents(raw);
      const newState = !comp.hasObstacle;
      comp.hasObstacle = newState;
      const nextVal = this.buildTileString(comp);
      this.applyTileUpdates({ [key]: nextVal });
      if (this.multiplayer) {
        this.multiplayer.sendUpdateTiles({ [key]: nextVal });
      }
      this.drawObstacles();
      return newState;
    }
    if (item.kind === "freeform_decoration") {
      const vis = this.freeformVisuals.get(item.id);
      if (!vis) return false;
      const newState = vis.data.passable; // if previously passable, newState is true (obstacle ON)
      vis.data.passable = !newState;
      const serialized = serializeFreeformTile(
        vis.data.assetKey,
        vis.data.x,
        vis.data.y,
        vis.data.color,
        vis.data.passable,
        vis.data.ontop,
        vis.data.layer
      );
      this.currentTilesMap.set(item.id, serialized);
      if (this.multiplayer) {
        this.multiplayer.sendUpdateTiles({ [item.id]: serialized });
      }
      this.drawObstacles();
      return newState;
    }
    if (item.kind === "jukebox") {
      const jb = this.jukeboxVisuals.get(item.id)?.state;
      if (!jb) return false;
      const newState = jb.passable !== false; // if previously passable, newState is true (obstacle ON)
      jb.passable = !newState;
      (jb as any).isSolid = !jb.passable;
      if (this.multiplayer) {
        this.multiplayer.setJukeboxPassable(item.id, jb.passable);
      }
      this.drawObstacles();
      return newState;
    }
    if (item.kind === "typewriter") {
      const tw = this.typewriterVisuals.get(item.id)?.state;
      if (!tw) return false;
      const newState = tw.passable !== false; // if previously passable, newState is true (obstacle ON)
      tw.passable = !newState;
      if (this.multiplayer) {
        this.multiplayer.setTypewriterPassable(item.id, tw.passable);
      }
      this.drawObstacles();
      return newState;
    }
    if (item.kind === "ashtray") {
      const at = this.ashtrayVisuals.get(item.id)?.state;
      if (!at) return false;
      const newState = at.passable !== false; // if previously passable, newState is true (obstacle ON)
      at.passable = !newState;
      if (this.multiplayer) {
        this.multiplayer.setAshtrayPassable(item.id, at.passable);
      }
      this.drawObstacles();
      return newState;
    }
    if (item.kind === "chess_board") {
      const cb = this.chessBoardVisuals.get(item.id)?.state;
      if (!cb) return false;
      const newState = cb.passable !== false; // if previously passable, newState is true (obstacle ON)
      cb.passable = !newState;
      if (this.multiplayer) {
        this.multiplayer.setChessBoardPassable(item.id, cb.passable);
      }
      this.drawObstacles();
      return newState;
    }
    if (item.kind === "obstacle") {
      const key = item.id;
      const comp = this.parseTileComponents(this.currentTilesMap.get(key));
      comp.hasObstacle = false;
      const nextVal = this.buildTileString(comp);
      this.applyTileUpdates({ [key]: nextVal });
      if (this.multiplayer) {
        this.multiplayer.sendUpdateTiles({ [key]: nextVal });
      }
      this.drawObstacles();
      return false;
    }
    return false;
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
      existing.container.setDepth(this.computeLayerDepth(jb.layer ?? 0, !!jb.ontop));
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
    const sprite = this.add.image(0, 0, "jukebox_1");
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
          if (this.activeEditorTool === "cursor") {
            this.openEditorItemMenu({
              kind: "jukebox",
              id: jb.id,
              label: "Jukebox",
              categoryLabel: "Music",
              worldX: jb.x,
              worldY: jb.y - 24,
              bounds: { x: jb.x - 24, y: jb.y - 24, width: 48, height: 48 },
            });
            return;
          }
          if (this.activeEditorTool === "clear_decoration") {
            this.multiplayer.deleteJukebox(jb.id);
            return;
          }
          if (this.activeEditorTool === "jukebox") {
            if ((jb.layer ?? 0) === this.placementLayer) {
              this.multiplayer.deleteJukebox(jb.id);
            } else {
              const jx = Math.round(pointer.worldX);
              const jy = Math.round(pointer.worldY);
              this.multiplayer.placeJukebox(
                jx,
                jy,
                this.decorationPassable,
                this.decorationOntop,
                this.placementLayer
              );
            }
            return;
          }
          if (this.activeEditorTool === "typewriter") {
            const tx = Math.round(pointer.worldX);
            const ty = Math.round(pointer.worldY);
            this.multiplayer.placeTypewriter(
              tx,
              ty,
              this.decorationPassable,
              this.decorationOntop,
              this.placementLayer
            );
            return;
          }
          if (this.activeEditorTool === "ashtray") {
            const ax = Math.round(pointer.worldX);
            const ay = Math.round(pointer.worldY);
            this.multiplayer.placeAshtray(
              ax,
              ay,
              this.decorationPassable,
              this.decorationOntop,
              this.placementLayer
            );
            return;
          }
          if (this.activeEditorTool === "freeform_decoration") {
            const fx = Math.round(pointer.worldX);
            const fy = Math.round(pointer.worldY);
            this.placeFreeformDecoration(
              this.selectedAssetKey,
              fx,
              fy,
              this.selectedTileColor,
              this.decorationPassable,
              this.decorationOntop,
              this.placementLayer
            );
            return;
          }
          const col = Math.max(0, Math.min(GRID_COLS - 1, Math.floor(pointer.worldX / TILE_SIZE)));
          const row = Math.max(0, Math.min(GRID_ROWS - 1, Math.floor(pointer.worldY / TILE_SIZE)));
          this.isSelectingArea = true;
          this.selectionStartTile = { x: col, y: row };
          this.selectionCurrentTile = { x: col, y: row };
          this.updateSelectionVisuals();
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
    container.setDepth(this.computeLayerDepth(jb.layer ?? 0, !!jb.ontop));

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
      existing.container.setDepth(this.computeLayerDepth(tw.layer ?? 0, !!tw.ontop));
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
    const sprite = this.add.image(0, 0, "typewriter_1");
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
          if (this.activeEditorTool === "cursor") {
            this.openEditorItemMenu({
              kind: "typewriter",
              id: tw.id,
              label: "Typewriter",
              categoryLabel: "Game",
              worldX: tw.x,
              worldY: tw.y - 24,
              bounds: { x: tw.x - 24, y: tw.y - 24, width: 48, height: 48 },
            });
            return;
          }
          if (this.activeEditorTool === "clear_decoration") {
            this.multiplayer.deleteTypewriter(tw.id);
            return;
          }
          if (this.activeEditorTool === "typewriter") {
            if ((tw.layer ?? 0) === this.placementLayer) {
              this.multiplayer.deleteTypewriter(tw.id);
            } else {
              const tx = Math.round(pointer.worldX);
              const ty = Math.round(pointer.worldY);
              this.multiplayer.placeTypewriter(
                tx,
                ty,
                this.decorationPassable,
                this.decorationOntop,
                this.placementLayer
              );
            }
            return;
          }
          if (this.activeEditorTool === "ashtray") {
            const tx = Math.round(pointer.worldX);
            const ty = Math.round(pointer.worldY);
            this.multiplayer.placeAshtray(
              tx,
              ty,
              this.decorationPassable,
              this.decorationOntop,
              this.placementLayer
            );
            return;
          }
          if (this.activeEditorTool === "jukebox") {
            const jx = Math.round(pointer.worldX);
            const jy = Math.round(pointer.worldY);
            this.multiplayer.placeJukebox(
              jx,
              jy,
              this.decorationPassable,
              this.decorationOntop,
              this.placementLayer
            );
            return;
          }
          if (this.activeEditorTool === "freeform_decoration") {
            const fx = Math.round(pointer.worldX);
            const fy = Math.round(pointer.worldY);
            this.placeFreeformDecoration(
              this.selectedAssetKey,
              fx,
              fy,
              this.selectedTileColor,
              this.decorationPassable,
              this.decorationOntop,
              this.placementLayer
            );
            return;
          }
          const col = Math.max(0, Math.min(GRID_COLS - 1, Math.floor(pointer.worldX / TILE_SIZE)));
          const row = Math.max(0, Math.min(GRID_ROWS - 1, Math.floor(pointer.worldY / TILE_SIZE)));
          this.isSelectingArea = true;
          this.selectionStartTile = { x: col, y: row };
          this.selectionCurrentTile = { x: col, y: row };
          this.updateSelectionVisuals();
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
    container.setDepth(this.computeLayerDepth(tw.layer ?? 0, !!tw.ontop));

    const visual: TypewriterVisual = {
      container,
      sprite,
      hitZone,
      promptText,
      state: tw,
    };
    this.typewriterVisuals.set(tw.id, visual);
  }

  // --- Ashtray World Visuals & Smoking Game Interaction ---

  public setAshtrays(ashtrays: AshtrayState[]) {
    if (!Array.isArray(ashtrays)) return;
    const activeIds = new Set<string>();

    for (const at of ashtrays) {
      activeIds.add(at.id);
      this.updateAshtray(at);
    }

    this.ashtrayVisuals.forEach((_vis, id) => {
      if (!activeIds.has(id)) {
        this.removeAshtray(id);
      }
    });
  }

  public updateAshtray(at: AshtrayState) {
    if (!at || !at.id) return;
    const existing = this.ashtrayVisuals.get(at.id);
    if (existing) {
      existing.state = at;
      existing.container.setPosition(at.x, at.y);
      existing.container.setDepth(this.computeLayerDepth(at.layer ?? 0, !!at.ontop));
    } else {
      this.createAshtrayVisual(at);
    }
    this.drawObstacles();
  }

  public removeAshtray(atId: string) {
    const existing = this.ashtrayVisuals.get(atId);
    if (existing) {
      existing.container.destroy();
      this.ashtrayVisuals.delete(atId);
      if (this.nearbyAshtrayId === atId) {
        this.nearbyAshtrayId = null;
      }
      this.drawObstacles();
    }
  }

  private createAshtrayVisual(at: AshtrayState) {
    const sprite = this.add.image(0, 0, "ashtray_1");
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
          if (this.activeEditorTool === "cursor") {
            this.openEditorItemMenu({
              kind: "ashtray",
              id: at.id,
              label: "Ashtray",
              categoryLabel: "Game",
              worldX: at.x,
              worldY: at.y - 24,
              bounds: { x: at.x - 24, y: at.y - 24, width: 48, height: 48 },
            });
            return;
          }
          if (this.activeEditorTool === "clear_decoration") {
            this.multiplayer.deleteAshtray(at.id);
            return;
          }
          if (this.activeEditorTool === "ashtray") {
            if ((at.layer ?? 0) === this.placementLayer) {
              this.multiplayer.deleteAshtray(at.id);
            } else {
              const tx = Math.round(pointer.worldX);
              const ty = Math.round(pointer.worldY);
              this.multiplayer.placeAshtray(
                tx,
                ty,
                this.decorationPassable,
                this.decorationOntop,
                this.placementLayer
              );
            }
            return;
          }
          if (this.activeEditorTool === "typewriter") {
            const tx = Math.round(pointer.worldX);
            const ty = Math.round(pointer.worldY);
            this.multiplayer.placeTypewriter(
              tx,
              ty,
              this.decorationPassable,
              this.decorationOntop,
              this.placementLayer
            );
            return;
          }
          if (this.activeEditorTool === "jukebox") {
            const jx = Math.round(pointer.worldX);
            const jy = Math.round(pointer.worldY);
            this.multiplayer.placeJukebox(
              jx,
              jy,
              this.decorationPassable,
              this.decorationOntop,
              this.placementLayer
            );
            return;
          }
          if (this.activeEditorTool === "freeform_decoration") {
            const fx = Math.round(pointer.worldX);
            const fy = Math.round(pointer.worldY);
            this.placeFreeformDecoration(
              this.selectedAssetKey,
              fx,
              fy,
              this.selectedTileColor,
              this.decorationPassable,
              this.decorationOntop,
              this.placementLayer
            );
            return;
          }
          const col = Math.max(0, Math.min(GRID_COLS - 1, Math.floor(pointer.worldX / TILE_SIZE)));
          const row = Math.max(0, Math.min(GRID_ROWS - 1, Math.floor(pointer.worldY / TILE_SIZE)));
          this.isSelectingArea = true;
          this.selectionStartTile = { x: col, y: row };
          this.selectionCurrentTile = { x: col, y: row };
          this.updateSelectionVisuals();
        } else {
          if (this.onAshtrayClick) {
            this.onAshtrayClick(at.id);
          }
        }
      }
    );

    const promptText = this.add.text(0, -32, "Press E to Smoke", {
      fontFamily: "Outfit, sans-serif",
      fontSize: "11px",
      fontStyle: "bold",
      color: "#ffffff",
      backgroundColor: "rgba(15, 23, 42, 0.88)",
      padding: { x: 6, y: 2.5 },
    });
    promptText.setOrigin(0.5, 0.5);
    promptText.setVisible(false);

    const container = this.add.container(at.x, at.y, [sprite, hitZone, promptText]);
    container.setDepth(this.computeLayerDepth(at.layer ?? 0, !!at.ontop));

    const visual: AshtrayVisual = {
      container,
      sprite,
      hitZone,
      promptText,
      state: at,
    };
    this.ashtrayVisuals.set(at.id, visual);
  }

  // --- Chess Board World Visuals & Chess Game Interaction ---

  public setChessBoards(chessBoards: ChessBoardState[]) {
    if (!Array.isArray(chessBoards)) return;
    const activeIds = new Set<string>();

    for (const cb of chessBoards) {
      activeIds.add(cb.id);
      this.updateChessBoard(cb);
    }

    this.chessBoardVisuals.forEach((_vis, id) => {
      if (!activeIds.has(id)) {
        this.removeChessBoard(id);
      }
    });
  }

  public updateChessBoard(cb: ChessBoardState) {
    if (!cb || !cb.id) return;
    const existing = this.chessBoardVisuals.get(cb.id);
    if (existing) {
      existing.state = cb;
      existing.container.setPosition(cb.x, cb.y);
      existing.container.setDepth(this.computeLayerDepth(cb.layer ?? 0, !!cb.ontop));
    } else {
      this.createChessBoardVisual(cb);
    }
    this.drawObstacles();
  }

  public removeChessBoard(cbId: string) {
    const existing = this.chessBoardVisuals.get(cbId);
    if (existing) {
      existing.container.destroy();
      this.chessBoardVisuals.delete(cbId);
      if (this.nearbyChessBoardId === cbId) {
        this.nearbyChessBoardId = null;
      }
      this.drawObstacles();
    }
  }

  private createChessBoardVisual(cb: ChessBoardState) {
    const sprite = this.add.image(0, 0, "chess_board_1");
    sprite.setDisplaySize(50, 50);

    const hitZone = this.add.rectangle(0, 0, 54, 54, 0x000000, 0);
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
          if (this.activeEditorTool === "cursor") {
            this.openEditorItemMenu({
              kind: "chess_board",
              id: cb.id,
              label: "Chess Board",
              categoryLabel: "Game",
              worldX: cb.x,
              worldY: cb.y - 25,
              bounds: { x: cb.x - 25, y: cb.y - 25, width: 50, height: 50 },
            });
            return;
          }
          if (this.activeEditorTool === "clear_decoration") {
            this.multiplayer.deleteChessBoard(cb.id);
            return;
          }
          if (this.activeEditorTool === "chess_board") {
            if ((cb.layer ?? 0) === this.placementLayer) {
              this.multiplayer.deleteChessBoard(cb.id);
            } else {
              const tx = Math.round(pointer.worldX);
              const ty = Math.round(pointer.worldY);
              this.multiplayer.placeChessBoard(
                tx,
                ty,
                this.decorationPassable,
                this.decorationOntop,
                this.placementLayer
              );
            }
            return;
          }
          if (this.activeEditorTool === "ashtray") {
            const ax = Math.round(pointer.worldX);
            const ay = Math.round(pointer.worldY);
            this.multiplayer.placeAshtray(
              ax,
              ay,
              this.decorationPassable,
              this.decorationOntop,
              this.placementLayer
            );
            return;
          }
          if (this.activeEditorTool === "typewriter") {
            const tx = Math.round(pointer.worldX);
            const ty = Math.round(pointer.worldY);
            this.multiplayer.placeTypewriter(
              tx,
              ty,
              this.decorationPassable,
              this.decorationOntop,
              this.placementLayer
            );
            return;
          }
          if (this.activeEditorTool === "jukebox") {
            const jx = Math.round(pointer.worldX);
            const jy = Math.round(pointer.worldY);
            this.multiplayer.placeJukebox(
              jx,
              jy,
              this.decorationPassable,
              this.decorationOntop,
              this.placementLayer
            );
            return;
          }
          if (this.activeEditorTool === "freeform_decoration") {
            const fx = Math.round(pointer.worldX);
            const fy = Math.round(pointer.worldY);
            this.placeFreeformDecoration(
              this.selectedAssetKey,
              fx,
              fy,
              this.selectedTileColor,
              this.decorationPassable,
              this.decorationOntop,
              this.placementLayer
            );
            return;
          }
          const col = Math.max(0, Math.min(GRID_COLS - 1, Math.floor(pointer.worldX / TILE_SIZE)));
          const row = Math.max(0, Math.min(GRID_ROWS - 1, Math.floor(pointer.worldY / TILE_SIZE)));
          this.isSelectingArea = true;
          this.selectionStartTile = { x: col, y: row };
          this.selectionCurrentTile = { x: col, y: row };
          this.updateSelectionVisuals();
        } else {
          if (this.onChessBoardClick) {
            this.onChessBoardClick(cb.id);
          }
        }
      }
    );

    const promptText = this.add.text(0, -32, "Press E to Play Chess", {
      fontFamily: "Outfit, sans-serif",
      fontSize: "11px",
      fontStyle: "bold",
      color: "#ffffff",
      backgroundColor: "rgba(15, 23, 42, 0.88)",
      padding: { x: 6, y: 2.5 },
    });
    promptText.setOrigin(0.5, 0.5);
    promptText.setVisible(false);

    const container = this.add.container(cb.x, cb.y, [sprite, hitZone, promptText]);
    container.setDepth(this.computeLayerDepth(cb.layer ?? 0, !!cb.ontop));

    const visual: ChessBoardVisual = {
      container,
      sprite,
      hitZone,
      promptText,
      state: cb,
    };
    this.chessBoardVisuals.set(cb.id, visual);
  }
}
