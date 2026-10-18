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
  getTileCenter,
  getTileCoords,
} from "shared";

interface PlayerVisual {
  container: Phaser.GameObjects.Container;
  dot: Phaser.GameObjects.Image;
  sprite: Phaser.GameObjects.Image;
  nameTag: Phaser.GameObjects.Text;
  currentDirection: "idle" | "left" | "right" | "up" | "down";
  avatars?: PlayerAvatars;
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

    // Generate circular dot texture once if not already created
    if (!this.textures.exists("dot_texture")) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0x0f172a, 0.25);
      g.fillCircle(PLAYER_RADIUS, PLAYER_RADIUS, PLAYER_RADIUS);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(PLAYER_RADIUS, PLAYER_RADIUS, Math.max(1, PLAYER_RADIUS - 3));
      g.generateTexture("dot_texture", PLAYER_RADIUS * 2, PLAYER_RADIUS * 2);
      g.destroy();
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

    // Dot sprite with color tint (default visual)
    const dot = this.add.image(0, 0, "dot_texture");
    dot.setTint(colorNum);
    dot.setDisplaySize(PLAYER_RADIUS * 2, PLAYER_RADIUS * 2);

    // Sprite image for custom uploaded pictures
    const sprite = this.add.image(0, 0, "empty_pixel");
    sprite.setVisible(false);
    sprite.setDisplaySize(CHARACTER_MAX_SIZE, CHARACTER_MAX_SIZE);

    // Name text floating above dot/sprite with native background pill
    const crownPrefix = player.isSuperadmin ? "👑 " : "";
    const displayName = `${crownPrefix}${player.name || "Player"}`;
    const nameTag = this.add.text(0, -PLAYER_RADIUS - 12, displayName, {
      fontFamily: "Outfit, sans-serif",
      fontSize: "11px",
      fontStyle: "bold",
      color: "#0f172a",
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      padding: { x: 7, y: 2.5 },
      align: "center",
    });
    nameTag.setOrigin(0.5, 0.5);

    // Align spawn to tile center
    const coords = getTileCoords(
      typeof player.x === "number" ? player.x : WORLD_WIDTH / 2,
      typeof player.y === "number" ? player.y : WORLD_HEIGHT / 2
    );
    const spawnCenter = getTileCenter(coords.tileX, coords.tileY);

    const container = this.add.container(spawnCenter.x, spawnCenter.y, [dot, sprite, nameTag]);
    container.setDepth(100);

    const visual: PlayerVisual = {
      container,
      dot,
      sprite,
      nameTag,
      currentDirection: "idle",
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
    if (existingAvatars) {
      this.setPlayerAvatars(sessionId, existingAvatars);
    }
  }

  public setPlayerAvatars(sessionId: string, avatars: PlayerAvatars | null) {
    const visual = this.playerVisuals.get(sessionId);
    if (!visual) return;

    // "if standing still picture is uploaded, then use that picture. else, use dot."
    if (!avatars || !avatars.idle) {
      visual.avatars = undefined;
      visual.sprite.setVisible(false);
      visual.dot.setVisible(true);
      visual.nameTag.setPosition(0, -PLAYER_RADIUS - 12);
      return;
    }

    visual.avatars = avatars;
    visual.dot.setVisible(false);
    visual.sprite.setVisible(true);

    const directions: ("idle" | "left" | "right" | "up" | "down")[] = [
      "idle",
      "left",
      "right",
      "up",
      "down",
    ];

    // "if any of other movement picture is not uploaded, use the standing still picture."
    directions.forEach((dir) => {
      const imgData = avatars[dir] || avatars.idle;
      if (!imgData) return;

      const textureKey = `avatar_${sessionId}_${dir}`;
      const img = new Image();
      img.onload = () => {
        if (this.textures.exists(textureKey)) {
          this.textures.remove(textureKey);
        }
        this.textures.addImage(textureKey, img);
        const tex = this.textures.get(textureKey);
        if (tex) {
          tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
        }

        const currentVisual = this.playerVisuals.get(sessionId);
        if (currentVisual && currentVisual.avatars && currentVisual.avatars.idle) {
          currentVisual.dot.setVisible(false);
          currentVisual.sprite.setVisible(true);
          this.updateVisualSprite(sessionId);
        }
      };
      img.src = imgData;
    });
  }

  private updateVisualSprite(sessionId: string) {
    const visual = this.playerVisuals.get(sessionId);
    if (!visual || !visual.avatars || !visual.avatars.idle) return;

    const targetKey = `avatar_${sessionId}_${visual.currentDirection}`;
    const idleKey = `avatar_${sessionId}_idle`;

    let activeKey = "";
    if (this.textures.exists(targetKey)) {
      activeKey = targetKey;
    } else if (this.textures.exists(idleKey)) {
      activeKey = idleKey;
    }

    if (activeKey) {
      visual.sprite.setTexture(activeKey);

      // Render 1:1 contain with max width/height of CHARACTER_MAX_SIZE
      const MAX_DIM = CHARACTER_MAX_SIZE;
      const fw = visual.sprite.width;
      const fh = visual.sprite.height;

      if (fw > 0 && fh > 0) {
        const ratio = Math.min(MAX_DIM / fw, MAX_DIM / fh);
        visual.sprite.setDisplaySize(fw * ratio, fh * ratio);
      } else {
        visual.sprite.setDisplaySize(MAX_DIM, MAX_DIM);
      }

      // Dynamically position nametag above sprite without overlapping
      const halfH = Math.max(PLAYER_RADIUS, visual.sprite.displayHeight / 2);
      visual.nameTag.setPosition(0, -halfH - 12);
    }
  }

  private updatePlayerVisual(sessionId: string, player: any) {
    const visual = this.playerVisuals.get(sessionId);
    if (!visual) return;

    // Update color tint (for dot fallback)
    const colorNum = this.parseColor(player.color);
    visual.dot.setTint(colorNum);

    // Update name
    const crownPrefix = player.isSuperadmin ? "👑 " : "";
    const expectedName = `${crownPrefix}${player.name || "Player"}`;
    if (visual.nameTag.text !== expectedName) {
      visual.nameTag.setText(expectedName);
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
    const visual = this.playerVisuals.get(sessionId);
    if (visual) {
      visual.container.destroy();
      this.playerVisuals.delete(sessionId);
    }

    // Clean up textures
    const directions: ("idle" | "left" | "right" | "up" | "down")[] = [
      "idle",
      "left",
      "right",
      "up",
      "down",
    ];
    directions.forEach((dir) => {
      const textureKey = `avatar_${sessionId}_${dir}`;
      if (this.textures.exists(textureKey)) {
        this.textures.remove(textureKey);
      }
    });
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
      left = this.cursors.left.isDown || this.wasdKeys.A.isDown;
      right = this.cursors.right.isDown || this.wasdKeys.D.isDown;
      up = this.cursors.up.isDown || this.wasdKeys.W.isDown;
      down = this.cursors.down.isDown || this.wasdKeys.S.isDown;
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
          if (vx !== 0 && vy !== 0) {
            const inv = 1 / Math.SQRT2;
            vx *= inv;
            vy *= inv;
          }

          if (Math.abs(vx) >= Math.abs(vy)) {
            targetDir = vx < 0 ? "left" : "right";
          } else {
            targetDir = vy < 0 ? "up" : "down";
          }

          const halfSize = CHARACTER_MAX_SIZE / 2;
          const nextX = localVisual.container.x + vx * PLAYER_SPEED * dtSeconds;
          const nextY = localVisual.container.y + vy * PLAYER_SPEED * dtSeconds;

          localVisual.container.x = Math.max(halfSize, Math.min(WORLD_WIDTH - halfSize, nextX));
          localVisual.container.y = Math.max(halfSize, Math.min(WORLD_HEIGHT - halfSize, nextY));
        }

        if (localVisual.currentDirection !== targetDir) {
          localVisual.currentDirection = targetDir;
          this.updateVisualSprite(this.localPlayerId);
        }
      }
    }

    // 3. Snapshot Interpolation for remote players (anti-jitter pipeline)
    const interpolation = this.multiplayer.si.calcInterpolation("x y");
    if (interpolation && interpolation.state) {
      interpolation.state.forEach((item: any) => {
        if (item.id !== this.localPlayerId) {
          const remoteVisual = this.playerVisuals.get(item.id);
          if (remoteVisual) {
            // Determine direction based on movement delta
            const dx = item.x - remoteVisual.container.x;
            const dy = item.y - remoteVisual.container.y;
            const dist = Math.hypot(dx, dy);

            let remoteDir: "idle" | "left" | "right" | "up" | "down" = "idle";
            if (dist > 1.0) {
              if (Math.abs(dx) > Math.abs(dy)) {
                remoteDir = dx > 0 ? "right" : "left";
              } else {
                remoteDir = dy > 0 ? "down" : "up";
              }
            }

            if (remoteVisual.currentDirection !== remoteDir) {
              remoteVisual.currentDirection = remoteDir;
              this.updateVisualSprite(item.id);
            }

            // Smoothly move remote dot to interpolated server coordinates
            remoteVisual.container.x = item.x;
            remoteVisual.container.y = item.y;
          }
        }
      });
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
        const hoverColor = this.selectedTileColor ? this.parseColor(this.selectedTileColor) : 0xeca239;
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

    const fillColor = this.selectedTileColor ? this.parseColor(this.selectedTileColor) : 0x3b8282;
    // Fill
    this.editorSelectionGraphics.fillStyle(fillColor, 0.32);
    this.editorSelectionGraphics.fillRect(rx, ry, rw, rh);

    // Outer border
    const strokeColor = this.selectedTileColor ? this.parseColor(this.selectedTileColor) : 0xeca239;
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
