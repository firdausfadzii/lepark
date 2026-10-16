import { Room, Client } from "colyseus";
import { GameState, PlayerState } from "../schema/GameState";
import {
  PlayerInputPayload,
  PlayerJoinOptions,
  PlayerAvatars,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  PLAYER_SPEED,
  SERVER_TICK_RATE,
  PLAYER_RADIUS,
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
    // Spawn directly at the center of the world
    player.x = WORLD_WIDTH / 2;
    player.y = WORLD_HEIGHT / 2;

    this.state.players.set(client.sessionId, player);
    this.playerInputs.set(client.sessionId, {
      left: false,
      right: false,
      up: false,
      down: false,
    });

    console.log(` Player joined: ${name} (${color}) [${client.sessionId}]`);

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
    const distance = PLAYER_SPEED * dtSeconds;

    this.state.players.forEach((player: PlayerState, sessionId: string) => {
      const input = this.playerInputs.get(sessionId);
      if (!input) return;

      let dx = 0;
      let dy = 0;

      if (input.left) dx -= 1;
      if (input.right) dx += 1;
      if (input.up) dy -= 1;
      if (input.down) dy += 1;

      if (dx !== 0 && dy !== 0) {
        const invSqrt2 = 0.70710678;
        dx *= invSqrt2;
        dy *= invSqrt2;
      }

      if (dx !== 0 || dy !== 0) {
        player.x += dx * distance;
        player.y += dy * distance;

        player.x = Math.max(PLAYER_RADIUS, Math.min(WORLD_WIDTH - PLAYER_RADIUS, player.x));
        player.y = Math.max(PLAYER_RADIUS, Math.min(WORLD_HEIGHT - PLAYER_RADIUS, player.y));
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
