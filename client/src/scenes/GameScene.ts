import Phaser from "phaser";
import { MultiplayerManager } from "../network/MultiplayerManager";
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

  // Map Editor State
  public isEditMode: boolean = false;
  public selectedAssetKey: string = "birch_floor_150";
  public selectedTileColor: string | null = null;
  private isSelectingArea: boolean = false;
  private selectionStartTile: { x: number; y: number } | null = null;
  private selectionCurrentTile: { x: number; y: number } | null = null;

  // Tile images grid [row][col] and state
  private tileImages: (Phaser.GameObjects.Image | null)[][] = [];
  private currentTilesMap: Map<string, string> = new Map();

  // Graphics overlays
  private gridGraphics!: Phaser.GameObjects.Graphics;
  private editorHoverGraphics!: Phaser.GameObjects.Graphics;
  private editorSelectionGraphics!: Phaser.GameObjects.Graphics;
  private editorOverlayText!: Phaser.GameObjects.Text;
  private isRightMouseDown: boolean = false;
  private panStartPoint: { x: number; y: number; scrollX: number; scrollY: number } | null = null;

  constructor() {
    super({ key: "GameScene" });
  }

  init(data: { multiplayer: MultiplayerManager }) {
    this.multiplayer = data?.multiplayer;
  }

  preload() {
    this.load.image("grass_tile", "/assets/grass_150.png");
    this.load.image("grass_150", "/assets/grass_150.png");
    this.load.image("birch_floor_150", "/assets/birch_floor_150.png");
    this.load.image("grass_100", "/assets/grass_150.png");
    this.load.image("birch_floor_100", "/assets/birch_floor_150.png");
    this.load.image("wall_half_150", "/assets/wall_half_150.png");
    this.load.image("wall_top_150", "/assets/wall_top_150.png");

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

    // Grid lines graphics (dynamically highlighted in edit mode)
    this.gridGraphics = this.add.graphics();
    this.drawGrid(false);

    // Map Editor Hover and Selection graphics overlays
    this.editorHoverGraphics = this.add.graphics();
    this.editorHoverGraphics.setDepth(6);

    this.editorSelectionGraphics = this.add.graphics();
    this.editorSelectionGraphics.setDepth(7);

    this.editorOverlayText = this.add.text(0, 0, "", {
      fontSize: "13px",
      fontFamily: "Inter, system-ui, sans-serif",
      backgroundColor: "rgba(20, 32, 32, 0.94)",
      color: "#ffffff",
      padding: { x: 10, y: 6 },
    });
    this.editorOverlayText.setDepth(8);
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
    this.cleanupCustomAvatars(sessionId);
    const visual = this.playerVisuals.get(sessionId);
    if (visual) {
      visual.container.destroy();
      this.playerVisuals.delete(sessionId);
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
        const isWall = isWallTile(this.selectedAssetKey);
        const defaultHover = isWall ? 0xdb5b47 : 0xeca239;
        const hoverColor = this.selectedTileColor ? this.parseColor(this.selectedTileColor) : defaultHover;
        this.editorHoverGraphics.clear();
        this.editorHoverGraphics.lineStyle(2, hoverColor, 0.95);
        this.editorHoverGraphics.strokeRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        this.editorHoverGraphics.fillStyle(hoverColor, 0.22);
        this.editorHoverGraphics.fillRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
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

        const tileVal = this.selectedTileColor
          ? `${this.selectedAssetKey}|${this.selectedTileColor}`
          : this.selectedAssetKey;

        const updates: Record<string, string> = {};
        for (let r = minRow; r <= maxRow; r++) {
          for (let c = minCol; c <= maxCol; c++) {
            updates[`${c},${r}`] = tileVal;
          }
        }

        this.applyTileUpdates(updates);

        if (this.multiplayer) {
          this.multiplayer.sendUpdateTiles(updates);
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
    else if (this.selectedAssetKey === "wall_half_150") labelName = "Half Wall (Impassable)";
    else if (this.selectedAssetKey === "wall_top_150") labelName = "Top Wall (Impassable)";

    const colorBadge = this.selectedTileColor ? ` • ${this.selectedTileColor.toUpperCase()}` : "";
    this.editorOverlayText.setText(
      `📐 ${cols} × ${rows} (${totalTiles} ${totalTiles === 1 ? "tile" : "tiles"}) • ${labelName}${colorBadge}`
    );
    this.editorOverlayText.setPosition(rx + 8, Math.max(8, ry - 32));
    this.editorOverlayText.setVisible(true);
  }

  public setEditMode(enabled: boolean) {
    this.isEditMode = enabled;
    this.drawGrid(enabled);

    if (enabled) {
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
        if (img) {
          let assetKey = "birch_floor_150";
          let tintColor: number | null = null;

          if (rawValue.includes("|")) {
            const [parsedAsset, colorPart] = rawValue.split("|");
            assetKey = parsedAsset || "birch_floor_150";
            if (colorPart && colorPart !== "none") {
              tintColor = this.parseColor(colorPart);
            }
          } else if (rawValue.startsWith("#")) {
            assetKey = "color_tile";
            tintColor = this.parseColor(rawValue);
          } else {
            assetKey = rawValue;
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
      }
    }
  }

  public resetTiles() {
    this.currentTilesMap.clear();
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const img = this.tileImages[r]?.[c];
        if (img) {
          img.setTexture("grass_150");
          img.setDisplaySize(TILE_SIZE, TILE_SIZE);
          img.clearTint();
        }
      }
    }
  }
}
