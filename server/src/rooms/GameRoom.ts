import { Room, Client } from "colyseus";
import { GameState, PlayerState } from "../schema/GameState";
import {
  PlayerInputPayload,
  PlayerJoinOptions,
  PlayerAvatars,
  TILE_SIZE,
  GRID_COLS,
  GRID_ROWS,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  PLAYER_SPEED,
  CHARACTER_MAX_SIZE,
  SERVER_TICK_RATE,
  getTileCenter,
} from "shared";
import { upsertPlayer, updatePlayerPosition } from "../db";

export class GameRoom extends Room<GameState> {
  maxClients = 64;

  private playerInputs: Map<string, PlayerInputPayload> = new Map();
  private playerAvatars: Map<string, PlayerAvatars> = new Map();
  private dbSyncCounter: number = 0;

  onCreate(options: any) {
    this.setState(new GameState());

    // 20 Hz tick loop
    this.setSimulationInterval(
      (deltaTime) => this.update(deltaTime),
      1000 / SERVER_TICK_RATE
    );

    this.onMessage("PLAYER_INPUT", (client: Client, data: PlayerInputPayload) => {
      this.playerInputs.set(client.sessionId, {
        left: !!data.left,
        right: !!data.right,
        up: !!data.up,
        down: !!data.down,
      });
    });

    this.onMessage(
      "UPDATE_PROFILE",
      (client: Client, data: { name?: string; color?: string; avatars?: PlayerAvatars | null }) => {
        const player = this.state.players.get(client.sessionId);
        if (player) {
          if (data.name && data.name.trim().length > 0) {
            player.name = data.name.trim().slice(0, 24);
          }
          if (data.color && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(data.color)) {
            player.color = data.color;
          }
          if (data.avatars !== undefined) {
            if (data.avatars && data.avatars.idle) {
              this.playerAvatars.set(client.sessionId, data.avatars);
              this.broadcast("PLAYER_AVATARS", {
                sessionId: client.sessionId,
                avatars: data.avatars,
              });
            } else {
              this.playerAvatars.delete(client.sessionId);
              this.broadcast("PLAYER_AVATARS", {
                sessionId: client.sessionId,
                avatars: null,
              });
            }
          }
          upsertPlayer({
            id: client.sessionId,
            name: player.name,
            color: player.color,
            x: player.x,
            y: player.y,
          });
        }
      }
    );

    this.onMessage("UPDATE_AVATARS", (client: Client, data: PlayerAvatars | null) => {
      if (data && data.idle) {
        this.playerAvatars.set(client.sessionId, data);
        this.broadcast("PLAYER_AVATARS", {
          sessionId: client.sessionId,
          avatars: data,
        });
      } else {
        this.playerAvatars.delete(client.sessionId);
        this.broadcast("PLAYER_AVATARS", {
          sessionId: client.sessionId,
          avatars: null,
        });
      }
    });

    this.onMessage("PING", (client: Client, data: { seq: number; t: number }) => {
      client.send("PONG", data);
    });
  }

  onJoin(client: Client, options: PlayerJoinOptions) {
    const rawName = (options && options.name ? options.name.trim() : "").slice(0, 24);
    const name = rawName || `Player_${client.sessionId.slice(0, 4)}`;
    const color =
      options && options.color && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(options.color)
        ? options.color
        : "#3b82f6";

    const player = new PlayerState();
    player.id = client.sessionId;
    player.name = name;
    player.color = color;
    const defaultTileX = Math.floor(GRID_COLS / 2);
    const defaultTileY = Math.floor(GRID_ROWS / 2);
    const spawnCenter = getTileCenter(defaultTileX, defaultTileY);

    player.x = spawnCenter.x;
    player.y = spawnCenter.y;

    this.state.players.set(client.sessionId, player);
    this.playerInputs.set(client.sessionId, {
      left: false,
      right: false,
      up: false,
      down: false,
    });

    console.log(` Player joined: ${name} (${color}) [${client.sessionId}] at tile (${defaultTileX}, ${defaultTileY})`);

    upsertPlayer({
      id: client.sessionId,
      name: player.name,
      color: player.color,
      x: player.x,
      y: player.y,
    });

    // Check if player joined with custom avatar pictures (idle is required)
    if (options && options.avatars && options.avatars.idle) {
      this.playerAvatars.set(client.sessionId, options.avatars);
      this.broadcast("PLAYER_AVATARS", {
        sessionId: client.sessionId,
        avatars: options.avatars,
      });
    }

    // Send all existing players' avatar pictures to the new client
    const allAvatars: Record<string, PlayerAvatars> = {};
    this.playerAvatars.forEach((av, sId) => {
      allAvatars[sId] = av;
    });
    client.send("ALL_AVATARS", allAvatars);
  }

  onLeave(client: Client, consented?: boolean) {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      console.log(` Player left: ${player.name} [${client.sessionId}]`);
      updatePlayerPosition(client.sessionId, player.x, player.y);
      this.state.players.delete(client.sessionId);
    }
    this.playerInputs.delete(client.sessionId);
    this.playerAvatars.delete(client.sessionId);
  }

  update(deltaTime: number) {
    const dtSeconds = deltaTime / 1000;

    this.state.players.forEach((player: PlayerState, sessionId: string) => {
      const input = this.playerInputs.get(sessionId);
      if (input) {
        let vx = 0;
        let vy = 0;
        if (input.left) vx -= 1;
        if (input.right) vx += 1;
        if (input.up) vy -= 1;
        if (input.down) vy += 1;

        if (vx !== 0 || vy !== 0) {
          if (vx !== 0 && vy !== 0) {
            const inv = 1 / Math.SQRT2;
            vx *= inv;
            vy *= inv;
          }

          const halfSize = CHARACTER_MAX_SIZE / 2;
          const nextX = player.x + vx * PLAYER_SPEED * dtSeconds;
          const nextY = player.y + vy * PLAYER_SPEED * dtSeconds;

          player.x = Math.max(halfSize, Math.min(WORLD_WIDTH - halfSize, nextX));
          player.y = Math.max(halfSize, Math.min(WORLD_HEIGHT - halfSize, nextY));
        }
      }
    });

    this.dbSyncCounter++;
    if (this.dbSyncCounter >= 100) {
      this.dbSyncCounter = 0;
      this.state.players.forEach((player: PlayerState, sessionId: string) => {
        updatePlayerPosition(sessionId, player.x, player.y);
      });
    }
  }
}
