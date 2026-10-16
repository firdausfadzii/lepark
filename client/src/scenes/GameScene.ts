import Phaser from "phaser";
import { MultiplayerManager } from "../network/MultiplayerManager";
import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  PLAYER_RADIUS,
  PLAYER_SPEED,
  PlayerAvatars,
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

  constructor() {
    super({ key: "GameScene" });
  }

  init(data: { multiplayer: MultiplayerManager }) {
    this.multiplayer = data?.multiplayer;
  }

  create() {
    if (!this.multiplayer) {
      console.error("MultiplayerManager not provided to GameScene");
      return;
    }

    // White background
    this.cameras.main.setBackgroundColor(0xffffff);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // Center camera on world center immediately (960, 540)
    this.cameras.main.centerOn(WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
    this.cameras.main.setZoom(1.2);

    // Keep camera viewport aligned on browser resize
    this.scale.on("resize", (gameSize: Phaser.Structs.Size) => {
      this.cameras.main.setSize(gameSize.width, gameSize.height);
      if (this.localPlayerId) {
        const localVisual = this.playerVisuals.get(this.localPlayerId);
        if (localVisual) {
          this.cameras.main.centerOn(localVisual.container.x, localVisual.container.y);
        }
      }
    });

    // Subtle arena perimeter boundary (clean light gray line)
    const boundsGraphics = this.add.graphics();
    boundsGraphics.lineStyle(2, 0xe2e8f0, 1);
    boundsGraphics.strokeRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // Subtle grid dots to give sense of motion while keeping background strictly white
    const dotGraphics = this.add.graphics();
    dotGraphics.fillStyle(0xf1f5f9, 0.8);
    for (let x = 60; x < WORLD_WIDTH; x += 60) {
      for (let y = 60; y < WORLD_HEIGHT; y += 60) {
        dotGraphics.fillCircle(x, y, 1.5);
      }
    }

    // Keyboard inputs
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasdKeys = {
        W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };

      // Capture navigation and movement keys to prevent browser scroll attempts
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

    // Generate circular dot texture once if not already created
    if (!this.textures.exists("dot_texture")) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0x0f172a, 0.2);
      g.fillCircle(PLAYER_RADIUS, PLAYER_RADIUS, PLAYER_RADIUS);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(PLAYER_RADIUS, PLAYER_RADIUS, PLAYER_RADIUS - 2);
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

    // If room already has players on scene start
    if (this.multiplayer.room) {
      this.localPlayerId = this.multiplayer.sessionId || null;
      this.multiplayer.room.state.players.forEach((player: any, sessionId: string) => {
        this.createPlayerVisual(sessionId, player);
      });
    }
  }

  private parseColor(colorStr: string): number {
    try {
      const hex = colorStr.replace("#", "");
      return parseInt(hex, 16) || 0x3b82f6;
    } catch {
      return 0x3b82f6;
    }
  }

  private createPlayerVisual(sessionId: string, player: any) {
    if (this.playerVisuals.has(sessionId)) return;

    const colorNum = this.parseColor(player.color);

    // Dot sprite with color tint (default visual)
    const dot = this.add.image(0, 0, "dot_texture");
    dot.setTint(colorNum);

    // Sprite image for custom uploaded pictures (initially hidden)
    const sprite = this.add.image(0, 0, "empty_pixel");
    sprite.setVisible(false);
    sprite.setDisplaySize(60, 60);

    // Name text floating above dot/sprite with native background pill
    const nameTag = this.add.text(0, -PLAYER_RADIUS - 16, player.name || "Player", {
      fontFamily: "Outfit, sans-serif",
      fontSize: "13px",
      fontStyle: "bold",
      color: "#0f172a",
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      padding: { x: 8, y: 3 },
      align: "center",
    });
    nameTag.setOrigin(0.5, 0.5);

    const spawnX = typeof player.x === "number" ? player.x : WORLD_WIDTH / 2;
    const spawnY = typeof player.y === "number" ? player.y : WORLD_HEIGHT / 2;

    const container = this.add.container(spawnX, spawnY, [dot, sprite, nameTag]);
    container.setDepth(100);

    const visual: PlayerVisual = {
      container,
      dot,
      sprite,
      nameTag,
      currentDirection: "idle",
    };
    this.playerVisuals.set(sessionId, visual);

    console.log(`🎮 Spawned player for ${player.name} (${sessionId}) at (${spawnX}, ${spawnY})`);

    // If local player, center camera immediately on container and follow smoothly without subpixel jitter
    if (sessionId === this.multiplayer.sessionId) {
      this.localPlayerId = sessionId;
      this.cameras.main.centerOn(container.x, container.y);
      this.cameras.main.startFollow(container, false, 0.15, 0.15);
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
      visual.nameTag.setPosition(0, -PLAYER_RADIUS - 16);
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

      // Render 1:1 contain with max width/height of 60px
      const MAX_DIM = 60;
      const fw = visual.sprite.width;
      const fh = visual.sprite.height;

      if (fw > 0 && fh > 0) {
        const ratio = Math.min(MAX_DIM / fw, MAX_DIM / fh);
        visual.sprite.setDisplaySize(fw * ratio, fh * ratio);
      } else {
        visual.sprite.setDisplaySize(MAX_DIM, MAX_DIM);
      }

      // Dynamically position nametag floating above sprite without overlapping
      const halfH = Math.max(PLAYER_RADIUS, visual.sprite.displayHeight / 2);
      visual.nameTag.setPosition(0, -halfH - 14);
    }
  }

  private updatePlayerVisual(sessionId: string, player: any) {
    const visual = this.playerVisuals.get(sessionId);
    if (!visual) return;

    // Update color tint (for dot fallback)
    const colorNum = this.parseColor(player.color);
    visual.dot.setTint(colorNum);

    // Update name
    if (visual.nameTag.text !== player.name) {
      visual.nameTag.setText(player.name);
    }

    // For local player, reconcile smoothly with authoritative server position (eliminates jitter)
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
      } else if (dist > 8) {
        // Soft reconciliation (smooth lerp) to eliminate visual snapping
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

  update(time: number, delta: number) {
    // 1. Handle local player inputs
    let left = false;
    let right = false;
    let up = false;
    let down = false;

    if (this.cursors) {
      left = this.cursors.left.isDown || this.wasdKeys.A.isDown;
      right = this.cursors.right.isDown || this.wasdKeys.D.isDown;
      up = this.cursors.up.isDown || this.wasdKeys.W.isDown;
      down = this.cursors.down.isDown || this.wasdKeys.S.isDown;
    }

    // Determine current movement direction for sprite state
    let currentDir: "idle" | "left" | "right" | "up" | "down" = "idle";
    if (left) currentDir = "left";
    else if (right) currentDir = "right";
    else if (up) currentDir = "up";
    else if (down) currentDir = "down";

    if (this.localPlayerId) {
      const localVisual = this.playerVisuals.get(this.localPlayerId);
      if (localVisual && localVisual.currentDirection !== currentDir) {
        localVisual.currentDirection = currentDir;
        this.updateVisualSprite(this.localPlayerId);
      }
    }

    // Only send when input state changed or actively moving
    if (
      left !== this.lastInputState.left ||
      right !== this.lastInputState.right ||
      up !== this.lastInputState.up ||
      down !== this.lastInputState.down ||
      left || right || up || down
    ) {
      this.lastInputState = { left, right, up, down };
      this.multiplayer.sendInput(this.lastInputState);

      // Client-side prediction for instant responsiveness of local player
      if (this.localPlayerId) {
        const localVisual = this.playerVisuals.get(this.localPlayerId);
        if (localVisual) {
          const dtSeconds = delta / 1000;
          let dx = 0;
          let dy = 0;
          if (left) dx -= 1;
          if (right) dx += 1;
          if (up) dy -= 1;
          if (down) dy += 1;

          if (dx !== 0 && dy !== 0) {
            dx *= 0.7071;
            dy *= 0.7071;
          }

          localVisual.container.x += dx * PLAYER_SPEED * dtSeconds;
          localVisual.container.y += dy * PLAYER_SPEED * dtSeconds;

          // Clamp
          localVisual.container.x = Phaser.Math.Clamp(
            localVisual.container.x,
            PLAYER_RADIUS,
            WORLD_WIDTH - PLAYER_RADIUS
          );
          localVisual.container.y = Phaser.Math.Clamp(
            localVisual.container.y,
            PLAYER_RADIUS,
            WORLD_HEIGHT - PLAYER_RADIUS
          );
        }
      }
    }

    // 2. Snapshot Interpolation for remote players (anti-jitter pipeline)
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
            if (dist > 0.4) {
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
}
