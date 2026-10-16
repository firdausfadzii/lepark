# Building a Web-Based Pixel-Art Multiplayer Game (*Stardew Valley* Style): Master Architecture & Implementation Guide

This guide provides an extensive, production-grade architectural blueprint and implementation plan for building a browser-based, zero-jitter multiplayer pixel-art co-op RPG. It covers frontend rendering, authoritative state management, WebSocket binary syncing, anti-jitter interpolation, mobile touch support, and self-hosted WebRTC voice/video integration.

---

## Table of Contents
1. [Tech Stack & Architecture Overview](#1-tech-stack--architecture-overview)
2. [Monorepo Folder Structure & Project Initialization](#2-monorepo-folder-structure--project-initialization)
3. [Game Engine Setup & Zero-Jitter Pixel Rendering (Phaser 3)](#3-game-engine-setup--zero-jitter-pixel-rendering-phaser-3)
4. [Authoritative Server & Room State Sync (Colyseus)](#4-authoritative-server--room-state-sync-colyseus)
5. [Anti-Jitter Client Pipeline (Snapshot Interpolation)](#5-anti-jitter-client-pipeline--snapshot-interpolation)
6. [Shared Isomorphic Logic & Tiled Map Integration](#6-shared-isomorphic-logic--tiled-map-integration)
7. [Mobile Viewport Optimization & Touch Controls](#7-mobile-viewport-optimization--touch-controls)
8. [Self-Hosted LiveKit Voice & Video Integration](#8-self-hosted-livekit-voice--video-integration)

---

## 1. Tech Stack & Architecture Overview

To achieve a butter-smooth, lag-free experience without expensive cloud SaaS fees, our architecture decouples **continuous spatial movement** from **discrete world-state mutations**, utilizing an isomorphic TypeScript codebase.

* **Frontend Engine:** Phaser 3 + Vite (WebGL, nearest-neighbor filtering, integer scaling).
* **Map Design:** Tiled / LDtk (`.json` exports shared by client renderer and server collision validator).
* **Multiplayer Server:** Node.js + Colyseus (Room-based binary schema synchronization).
* **Movement Interpolation:** `@geckos.io/snapshot-interpolation` (Jitter buffer and entity lerping).
* **Voice & Video SFU:** Self-Hosted **LiveKit Open-Source Server** running via Docker on a Linux VPS.

---

## 2. Monorepo Folder Structure & Project Initialization

Organize your project as a monorepo workspace (`client`, `server`, and `shared`) so game constants, collision code, and Tiled map schemas can be imported seamlessly on both ends.

```
stardew-web-multiplayer/
├── package.json
├── tsconfig.json
├── shared/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── constants.ts
│       └── maps/
│           └── farm.json
├── client/
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── main.ts
│       ├── scenes/
│       │   └── GameScene.ts
│       └── network/
│           └── MultiplayerManager.ts
└── server/
    ├── package.json
    └── src/
        ├── index.ts
        ├── rooms/
        │   └── FarmRoom.ts
        └── schema/
            └── FarmState.ts
```

---

## 3. Game Engine Setup & Zero-Jitter Pixel Rendering (Phaser 3)

Pixel-art games often suffer from visual shimmering or jitter if fractional camera coordinates or sub-pixel positions are rendered. Configure Phaser 3 to enforce integer rounding and nearest-neighbor scaling.

```typescript
// client/src/main.ts
import Phaser from 'phaser';

export default class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  constructor() {
    పర('GameScene');
  }

  preload() {
    this.load.spritesheet('farmer', 'assets/farmer_sheet.png', { frameWidth: 16, frameHeight: 16 });
    this.load.tilemapTiledJSON('farmMap', 'assets/maps/farm.json');
  }

  create() {
    const map = this.make.tilemap({ key: 'farmMap' });
    const tileset = map.addTilesetImage('tileset_extruded', 'farmTiles');
    const groundLayer = map.createLayer('Ground', tileset!, 0, 0);
    const collisionLayer = map.createLayer('Collisions', tileset!, 0, 0);
    
    collisionLayer?.setCollisionByProperty({ collides: true });

    // Local player setup
    this.player = this.physics.add.sprite(100, 100, 'farmer', 0);
    this.physics.add.collider(this.player, collisionLayer!);

    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
    }

    // Smooth camera tracking
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(4); // Crisp 4x integer scale
  }

  update(time: number, delta: number) {
    const speed = 80;
    this.player.body?.setVelocity(0);

    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-speed);
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(speed);
    }

    if (this.cursors.up.isDown) {
      this.player.setVelocityY(-speed);
    } else if (this.cursors.down.isDown) {
      this.player.setVelocityY(speed);
    }

    // Y-Sorting depth assignment
    this.player.setDepth(this.player.y);
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  width: 480,
  height: 270,
  pixelArt: true,      // Nearest-neighbor texture filtering
  roundPixels: true,   // Snaps sprite rendering to integer pixels
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 0 }, debug: false }
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [GameScene]
};

new Phaser.Game(config);
```

---

## 4. Authoritative Server & Room State Sync (Colyseus)

Colyseus manages authoritative room states using schema definitions, broadcasting ultra-compact binary deltas over WebSockets.

```typescript
// server/src/schema/FarmState.ts
import { Schema, MapSchema, type } from "@colyseus/schema";

export class PlayerState extends Schema {
  @type("number") x: number = 100;
  @type("number") y: number = 100;
  @type("string") animation: string = "idle_down";
}

export class FarmState extends Schema {
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
}
```

```typescript
// server/src/rooms/FarmRoom.ts
import { Room, Client } from "@colyseus/core";
import { FarmState, PlayerState } from "../schema/FarmState";

export class FarmRoom extends Room<FarmState> {
  maxClients = 16;

  onCreate(options: any) {
    this.setState(new FarmState());

    // Fixed server tick loop (20 Hz)
    this.setSimulationInterval((deltaTime) => this.update(deltaTime), 50);

    this.onMessage("PLAYER_INPUT", (client, data) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        // Validate inputs and update server-authoritative positions
        const speed = 2.0; // units per tick
        if (data.left) player.x -= speed;
        if (data.right) player.x += speed;
        if (data.up) player.y -= speed;
        if (data.down) player.y += speed;
      }
    });

    this.onMessage("USE_TOOL", (client, data) => {
      // Handle reliable actions: hoe, watering can, seeds
      console.log(`Player ${client.sessionId} used ${data.tool} at (${data.tileX}, ${data.tileY})`);
    });
  }

  onJoin(client: Client, options: any) {
    const player = new PlayerState();
    this.state.players.set(client.sessionId, player);
  }

  onLeave(client: Client, consented: boolean) {
    this.state.players.delete(client.sessionId);
  }

  update(deltaTime: number) {
    // Server-side authoritative tick hooks if needed
  }
}
```

---

## 5. Anti-Jitter Client Pipeline (Snapshot Interpolation)

To eliminate network jitter on remote players, integrate `@geckos.io/snapshot-interpolation` into your client loop.

```typescript
// client/src/network/MultiplayerManager.ts
import { Client, Room } from "colyseus.js";
import { SnapshotInterpolation } from "@geckos.io/snapshot-interpolation";

export class MultiplayerManager {
  private client!: Client;
  public room!: Room;
  public si = new SnapshotInterpolation(20); // 20 Hz server tick rate

  async connect() {
    this.client = new Client("ws://localhost:2567");
    this.room = await this.client.join("farm_room");

    this.room.onStateChange((state) => {
      const snapshotData: any[] = [];
      state.players.forEach((player: any, sessionId: string) => {
        snapshotData.push({ id: sessionId, x: player.x, y: player.y });
      });

      // Capture incoming server snapshot with current timestamp
      this.si.snapshot.add({
        id: 'server_tick',
        time: Date.now(),
        state: snapshotData
      });
    });
  }

  sendInput(inputs: { left: boolean; right: boolean; up: boolean; down: boolean }) {
    this.room.send("PLAYER_INPUT", inputs);
  }
}
```

Inside your Phaser scene update loop, calculate interpolated positions for remote entities:
```typescript
// Inside Phaser update() loop:
const interpolation = this.multiplayerManager.si.calcInterpolation('x y');
if (interpolation && interpolation.state) {
  interpolation.state.forEach((state: any) => {
    if (state.id !== this.multiplayerManager.room.sessionId) {
      const remoteSprite = this.remotePlayers.get(state.id);
      if (remoteSprite) {
        remoteSprite.x = state.x;
        remoteSprite.y = state.y;
      }
    }
  });
}
```

---

## 6. Shared Isomorphic Logic & Tiled Map Integration

Export your Tiled map as a JSON file (`farm.json`) and place it inside the `shared/` directory. Both the Phaser client and the Colyseus Node.js server parse this exact file to ensure identical collision and interaction boundaries.

```typescript
// shared/src/maps/mapLoader.ts
import farmMapJson from './farm.json';

export function getTileCollisionAt(tileX: number, tileY: number): boolean {
  // Inspect collision layers from Tiled JSON export
  const collisionLayer = farmMapJson.layers.find(l => l.name === "Collisions");
  if (!collisionLayer) return false;
  
  const index = tileY * collisionLayer.width + tileX;
  return collisionLayer.data[index] > 0;
}
```

---

## 7. Mobile Viewport Optimization & Touch Controls

Ensure mobile browsers maintain a fixed 16:9 pixel-art aspect ratio with zero layout shifting, and implement virtual touch joysticks.

### HTML Viewport Meta Header
```html
<!-- client/index.html -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
```

### Virtual Joystick Integration
```typescript
// Add virtual touch controls for mobile screens
if (this.sys.game.device.os.android || this.sys.game.device.os.iOS) {
  // Initialize virtual joystick plugin / touch overlays
  console.log("Mobile touch controls active");
}
```

### Colyseus Reconnection Seats
Handle mobile background suspensions seamlessly:
```typescript
// In client reconnection handler:
try {
  let room = await client.reconnect(existingSessionId, existingReconnectionToken);
} catch (e) {
  console.error("Reconnection failed, returning to main menu");
}
```

---

## 8. Self-Hosted LiveKit Voice & Video Integration

To add proximity voice chat and room-based video feeds without cloud SaaS fees, deploy the open-source LiveKit server via Docker on your game server VPS.

### Docker Compose for Self-Hosted LiveKit
```yaml
# docker-compose.yml (on your VPS)
version: '3.8'
services:
  livekit:
    image: livekit/livekit-server:v1.5.0
    command: --config /etc/livekit.yaml
    ports:
      - "7880:7880"
      - "7881:7881"
      - "50000-50200:50000-50200/udp"
    volumes:
      - ./livekit.yaml:/etc/livekit.yaml
```

### Frontend LiveKit & Spatial Audio Connection
```typescript
// client/src/network/VoiceManager.ts
import { Room as LiveKitRoom, createLocalAudioTrack, createLocalVideoTrack } from 'livekit-client';

export async function connectVoiceAndVideo(roomName: string, token: string) {
  const lkRoom = new LiveKitRoom();
  await lkRoom.connect('wss://your-vps-domain.com', token);

  // Publish microphone and webcam
  const audioTrack = await createLocalAudioTrack();
  const videoTrack = await createLocalVideoTrack();
  
  await lkRoom.localParticipant.publishTrack(audioTrack);
  await lkRoom.localParticipant.publishTrack(videoTrack);

  // Handle incoming participant streams
  lkRoom.on('trackSubscribed', (track, publication, participant) => {
    if (track.kind === 'video') {
      const element = track.attach();
      document.getElementById('video-grid')?.appendChild(element);
    }
  });
}
```

### Proximity Volume Panning (Web Audio API)
Continuously compute distance between local player and peers in your Phaser update loop, adjusting their LiveKit audio gain or piping their audio stream into a native `PannerNode` for directional 3D audio.
```typescript
// Spatial audio distance attenuation example
const distance = Phaser.Math.Distance.Between(localX, localY, peerX, peerY);
const maxHearingDistance = 250;
const volume = Math.max(0, 1 - (distance / maxHearingDistance));
// Apply volume adjustment to peer audio element
```