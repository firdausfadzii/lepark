import { Room, Client, ServerError } from "colyseus";
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
  isWallTile,
  resolveMovement,
  findSafeSpawnCenter,
  PrivateZone,
  ChatMessage,
  SendChatMessagePayload,
  VoiceChannelType,
  VoicePeer,
  VoiceSignalPayload,
} from "shared";
import {
  upsertPlayer,
  updatePlayerPosition,
  getSpaceById,
  getSpaceTiles,
  updateSpaceTiles,
  getSpacePrivateZones,
  updateSpacePrivateZones,
} from "../db";
import { verifyToken } from "../auth";

export const activeSpaceCounts = new Map<string, number>();

export function getSpacePlayerCount(spaceId: string): number {
  return activeSpaceCounts.get(spaceId) || 0;
}

export class GameRoom extends Room<GameState> {
  maxClients = 64;

  public spaceId: string = "space_central_plaza";
  private playerInputs: Map<string, PlayerInputPayload> = new Map();
  private playerAvatars: Map<string, PlayerAvatars> = new Map();
  private tiles: Record<string, string> = {};
  private privateZones: PrivateZone[] = [];
  private voiceParticipants: Set<string> = new Set();
  private spaceOwnerId: number | null = null;
  private clientAuthMap: Map<string, any> = new Map();
  private dbSyncCounter: number = 0;

  async onAuth(client: Client, options: PlayerJoinOptions, request?: any) {
    const spaceId = options?.spaceId || "space_central_plaza";
    const space = await getSpaceById(spaceId);
    if (!space) {
      throw new ServerError(404, "Space not found");
    }

    let user = null;
    if (options.token) {
      user = verifyToken(options.token);
    }

    // 1. Personal user space rule:
    // "for now, user dont have ways to travel to other user's space."
    if (!space.is_superadmin_space) {
      if (!user || (user.id !== space.owner_id && user.role !== "superadmin")) {
        throw new ServerError(
          403,
          "Access denied: Traveling to other users' spaces is currently disabled.",
        );
      }
    }

    // 2. Superadmin space rule:
    // "private space can only be joined by invitation (a whitelist for now)"
    if (space.is_superadmin_space && !space.is_public) {
      if (!user) {
        throw new ServerError(
          401,
          "Authentication required to join private space.",
        );
      }
      const isWhitelisted = space.whitelist.some(
        (w) => w.toLowerCase() === user.username.toLowerCase(),
      );
      if (!isWhitelisted && user.role !== "superadmin") {
        throw new ServerError(
          403,
          "Access denied: This space is private and requires an invitation.",
        );
      }
    }

    return { user, space };
  }

  onCreate(options: any) {
    this.spaceId = options.spaceId || "space_central_plaza";
    this.setMetadata({ spaceId: this.spaceId });
    this.setState(new GameState());

    // 20 Hz tick loop
    this.setSimulationInterval(
      (deltaTime) => this.update(deltaTime),
      1000 / SERVER_TICK_RATE,
    );

    this.onMessage(
      "PLAYER_INPUT",
      (client: Client, data: PlayerInputPayload) => {
        this.playerInputs.set(client.sessionId, {
          left: !!data.left,
          right: !!data.right,
          up: !!data.up,
          down: !!data.down,
        });
      },
    );

    this.onMessage(
      "UPDATE_PROFILE",
      (
        client: Client,
        data: { name?: string; color?: string; avatars?: PlayerAvatars | null },
      ) => {
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
      },
    );

    this.onMessage(
      "UPDATE_AVATARS",
      (client: Client, data: PlayerAvatars | null) => {
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
      },
    );

    this.onMessage(
      "PING",
      (client: Client, data: { seq: number; t: number }) => {
        client.send("PONG", data);
      },
    );

    // Load initial tiles and space metadata
    getSpaceTiles(this.spaceId)
      .then((loadedTiles) => {
        this.tiles = loadedTiles || {};
      })
      .catch((err) => console.warn("Failed loading space tiles:", err));

    getSpaceById(this.spaceId)
      .then((space) => {
        if (space) {
          this.spaceOwnerId = space.owner_id;
        }
      })
      .catch((err) => console.warn("Failed loading space metadata:", err));

    getSpacePrivateZones(this.spaceId)
      .then((loadedZones) => {
        this.privateZones = loadedZones || [];
      })
      .catch((err) => console.warn("Failed loading space private zones:", err));

    // Handle tile updates from clients with edit permissions
    this.onMessage(
      "UPDATE_TILES",
      async (client: Client, data: { updates: Record<string, string> }) => {
        const auth = this.clientAuthMap.get(client.sessionId);
        const user = auth?.user;
        const isSuperadmin = user?.role === "superadmin";
        const isOwner =
          user && this.spaceOwnerId !== null && user.id === this.spaceOwnerId;

        if (!isSuperadmin && !isOwner) {
          console.warn(
            `[GameRoom] Unauthorized tile edit attempt by ${client.sessionId} in space ${this.spaceId}`,
          );
          client.send("ERROR", {
            message:
              "Permission denied: Only space owner or superadmin can edit map.",
          });
          return;
        }

        if (data && data.updates && typeof data.updates === "object") {
          Object.assign(this.tiles, data.updates);
          this.broadcast("TILES_UPDATED", data.updates);
          await updateSpaceTiles(this.spaceId, this.tiles);
        }
      },
    );

    // Handle private zones updates from clients with edit permissions
    this.onMessage(
      "UPDATE_PRIVATE_ZONES",
      async (client: Client, data: { zones: PrivateZone[] }) => {
        const auth = this.clientAuthMap.get(client.sessionId);
        const user = auth?.user;
        const isSuperadmin = user?.role === "superadmin";
        const isOwner =
          user && this.spaceOwnerId !== null && user.id === this.spaceOwnerId;

        if (!isSuperadmin && !isOwner) {
          console.warn(
            `[GameRoom] Unauthorized private zones edit attempt by ${client.sessionId} in space ${this.spaceId}`,
          );
          client.send("ERROR", {
            message:
              "Permission denied: Only space owner or superadmin can edit map.",
          });
          return;
        }

        if (data && Array.isArray(data.zones)) {
          this.privateZones = data.zones;
          this.broadcast("PRIVATE_ZONES_UPDATED", this.privateZones);
          await updateSpacePrivateZones(this.spaceId, this.privateZones);
        }
      },
    );

    // Handle chat messages from clients
    this.onMessage(
      "SEND_CHAT_MESSAGE",
      (client: Client, data: SendChatMessagePayload) => {
        if (!data || typeof data.text !== "string") return;
        const cleanText = data.text.trim().slice(0, 300);
        if (!cleanText) return;

        const player = this.state.players.get(client.sessionId);
        if (!player) return;

        const auth = this.clientAuthMap.get(client.sessionId);
        const isSuperadmin =
          player.isSuperadmin ||
          (auth && auth.user && auth.user.role === "superadmin") ||
          false;

        const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const timestamp = Date.now();

        if (data.roomType === "zone") {
          // Find target private zone (either by provided roomId or player's current location)
          let targetZone = this.privateZones.find((z) => z.id === data.roomId);
          if (!targetZone) {
            const playerCol = Math.floor(player.x / TILE_SIZE);
            const playerRow = Math.floor(player.y / TILE_SIZE);
            targetZone = this.privateZones.find(
              (z) =>
                playerCol >= z.bounds.minCol &&
                playerCol <= z.bounds.maxCol &&
                playerRow >= z.bounds.minRow &&
                playerRow <= z.bounds.maxRow,
            );
          }

          if (!targetZone) {
            console.warn(
              `[GameRoom] Chat message to unknown or inactive zone by ${client.sessionId}`,
            );
            return;
          }

          const chatMsg: ChatMessage = {
            id: msgId,
            senderId: client.sessionId,
            senderName: player.name,
            senderColor: player.color,
            isSuperadmin,
            roomType: "zone",
            roomId: targetZone.id,
            roomName: targetZone.name || "Private Area",
            text: cleanText,
            timestamp,
          };

          // Send message strictly to clients physically inside this private zone
          let senderReceived = false;
          this.clients.forEach((c) => {
            const p = this.state.players.get(c.sessionId);
            if (p) {
              const col = Math.floor(p.x / TILE_SIZE);
              const row = Math.floor(p.y / TILE_SIZE);
              const isInZone =
                col >= targetZone!.bounds.minCol &&
                col <= targetZone!.bounds.maxCol &&
                row >= targetZone!.bounds.minRow &&
                row <= targetZone!.bounds.maxRow;
              if (isInZone) {
                if (c.sessionId === client.sessionId) {
                  senderReceived = true;
                }
                c.send("CHAT_MESSAGE", chatMsg);
              }
            }
          });

          // Ensure sender receives their own message even if standing near boundary
          if (!senderReceived) {
            client.send("CHAT_MESSAGE", chatMsg);
          }
        } else {
          // Default: Map / Area chat
          const chatMsg: ChatMessage = {
            id: msgId,
            senderId: client.sessionId,
            senderName: player.name,
            senderColor: player.color,
            isSuperadmin,
            roomType: "map",
            roomId: this.spaceId,
            roomName: "Map Chat",
            text: cleanText,
            timestamp,
          };

          this.broadcast("CHAT_MESSAGE", chatMsg);
        }
      },
    );

    // ==========================================
    // Voice Chat WebRTC Signaling & Channel Sync
    // ==========================================

    this.onMessage(
      "VOICE_JOIN",
      (client: Client) => {
        const player = this.state.players.get(client.sessionId);
        if (!player) return;

        this.voiceParticipants.add(client.sessionId);

        // Gather existing peers in room
        const peersInRoom: VoicePeer[] = [];
        this.voiceParticipants.forEach((sid) => {
          if (sid !== client.sessionId) {
            const p = this.state.players.get(sid);
            if (p) {
              peersInRoom.push({
                sessionId: sid,
                name: p.name,
                color: p.color,
                isSuperadmin: p.isSuperadmin,
              });
            }
          }
        });

        // Send existing peers list to the joining client
        client.send("VOICE_CHANNEL_STATE", {
          peers: peersInRoom,
        });

        // Notify other clients in room about the new peer
        const newPeerPayload: VoicePeer = {
          sessionId: client.sessionId,
          name: player.name,
          color: player.color,
          isSuperadmin: player.isSuperadmin,
        };

        this.clients.forEach((c) => {
          if (c.sessionId !== client.sessionId && this.voiceParticipants.has(c.sessionId)) {
            c.send("VOICE_PEER_JOINED", newPeerPayload);
          }
        });
      },
    );

    this.onMessage("VOICE_LEAVE", (client: Client) => {
      this.removeClientFromVoice(client.sessionId);
    });

    this.onMessage(
      "VOICE_SIGNAL",
      (client: Client, data: VoiceSignalPayload) => {
        if (!data || !data.targetSessionId || !data.signal) return;
        const targetClient = this.clients.find(
          (c) => c.sessionId === data.targetSessionId,
        );
        if (targetClient) {
          targetClient.send("VOICE_SIGNAL", {
            fromSessionId: client.sessionId,
            signal: data.signal,
          });
        }
      },
    );

    this.onMessage(
      "VOICE_SPEAKING",
      (client: Client, data: { speaking: boolean }) => {
        if (!this.voiceParticipants.has(client.sessionId)) return;

        this.clients.forEach((c) => {
          if (c.sessionId !== client.sessionId && this.voiceParticipants.has(c.sessionId)) {
            c.send("VOICE_SPEAKING", {
              sessionId: client.sessionId,
              speaking: !!data.speaking,
            });
          }
        });
      },
    );
  }

  onJoin(client: Client, options: PlayerJoinOptions, auth: any) {
    const count = activeSpaceCounts.get(this.spaceId) || 0;
    activeSpaceCounts.set(this.spaceId, count + 1);

    const rawName = (options && options.name ? options.name.trim() : "").slice(
      0,
      24,
    );
    const name = rawName || `Player_${client.sessionId.slice(0, 4)}`;
    const color =
      options &&
      options.color &&
      /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(options.color)
        ? options.color
        : "#3b82f6";

    const player = new PlayerState();
    player.id = client.sessionId;
    player.name = name;
    player.color = color;
    player.direction = "idle";
    player.isSuperadmin =
      (auth && auth.user && auth.user.role === "superadmin") || false;
    const defaultTileX = Math.floor(GRID_COLS / 2);
    const defaultTileY = Math.floor(GRID_ROWS / 2);
    const spawnCenter = findSafeSpawnCenter(
      defaultTileX,
      defaultTileY,
      (c, r) => isWallTile(this.tiles[`${c},${r}`]),
    );

    player.x = spawnCenter.x;
    player.y = spawnCenter.y;

    this.state.players.set(client.sessionId, player);
    this.playerInputs.set(client.sessionId, {
      left: false,
      right: false,
      up: false,
      down: false,
    });

    console.log(
      ` Player joined space [${this.spaceId}]: ${name} (${color}) [${client.sessionId}] at tile (${defaultTileX}, ${defaultTileY})`,
    );

    upsertPlayer({
      id: client.sessionId,
      name: player.name,
      color: player.color,
      x: player.x,
      y: player.y,
    });

    // Check if player joined with custom avatar pictures
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

    // Save auth and update space ownership if applicable
    this.clientAuthMap.set(client.sessionId, auth);
    if (auth?.space?.owner_id !== undefined) {
      this.spaceOwnerId = auth.space.owner_id;
    }

    // Send current space tiles to joining client
    client.send("CURRENT_TILES", this.tiles);

    // Send current space private zones to joining client
    client.send("CURRENT_PRIVATE_ZONES", this.privateZones);
  }

  onLeave(client: Client, consented?: boolean) {
    const count = activeSpaceCounts.get(this.spaceId) || 1;
    activeSpaceCounts.set(this.spaceId, Math.max(0, count - 1));

    // Cleanup voice channel membership if user was in voice
    this.removeClientFromVoice(client.sessionId);

    const player = this.state.players.get(client.sessionId);
    if (player) {
      console.log(
        ` Player left space [${this.spaceId}]: ${player.name} [${client.sessionId}]`,
      );
      updatePlayerPosition(client.sessionId, player.x, player.y);
      this.state.players.delete(client.sessionId);
    }
    this.playerInputs.delete(client.sessionId);
    this.playerAvatars.delete(client.sessionId);
    this.clientAuthMap.delete(client.sessionId);
  }

  private removeClientFromVoice(sessionId: string) {
    if (!this.voiceParticipants.has(sessionId)) return;
    this.voiceParticipants.delete(sessionId);

    this.clients.forEach((c) => {
      if (this.voiceParticipants.has(c.sessionId)) {
        c.send("VOICE_PEER_LEFT", { sessionId });
      }
    });
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
          if (Math.abs(vx) >= Math.abs(vy)) {
            player.direction = vx < 0 ? "left" : "right";
          } else {
            player.direction = vy < 0 ? "up" : "down";
          }
          const resolved = resolveMovement(
            player.x,
            player.y,
            vx,
            vy,
            dtSeconds,
            (c, r) => isWallTile(this.tiles[`${c},${r}`]),
          );
          player.x = resolved.x;
          player.y = resolved.y;
        } else {
          player.direction = "idle";
        }
      } else {
        player.direction = "idle";
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
