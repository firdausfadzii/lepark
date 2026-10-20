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
  PLAYER_HITBOX_HALF_WIDTH,
  SERVER_TICK_RATE,
  getTileCenter,
  isWallTile,
  resolveMovement,
  SolidBox,
  findSafeSpawnCenter,
  PrivateZone,
  ChatMessage,
  SendChatMessagePayload,
  VoiceChannelType,
  VoicePeer,
  VoiceSignalPayload,
  JukeboxTrack,
  JukeboxState,
  JukeboxAddTrackPayload,
  JukeboxAddPlaylistPayload,
  JukeboxRemoveTrackPayload,
  JukeboxSkipPayload,
  JukeboxPlacePayload,
  JukeboxMovePayload,
  JukeboxDeletePayload,
} from "shared";
import {
  upsertPlayer,
  updatePlayerPosition,
  getSpaceById,
  getSpaceTiles,
  updateSpaceTiles,
  getSpacePrivateZones,
  updateSpacePrivateZones,
  getSpaceJukeboxes,
  updateSpaceJukeboxes,
  findUserById,
  ensureUserPersonalSpace,
} from "../db";
import { verifyToken } from "../auth";
import { extractPlaylistId, fetchPlaylistVideos } from "../services/youtubePlaylist";

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
  private jukeboxes: Map<string, JukeboxState> = new Map();
  private jukeboxTimer: NodeJS.Timeout | null = null;
  private voiceParticipants: Set<string> = new Set();
  private spaceOwnerId: number | null = null;
  private clientAuthMap: Map<string, any> = new Map();
  private dbSyncCounter: number = 0;

  async onAuth(client: Client, options: PlayerJoinOptions, request?: any) {
    const spaceId = options?.spaceId || "space_central_plaza";
    let space = await getSpaceById(spaceId);
    if (!space && spaceId.startsWith("user_space_")) {
      const targetUserId = parseInt(spaceId.replace("user_space_", ""), 10);
      if (!isNaN(targetUserId)) {
        const targetUser = await findUserById(targetUserId);
        if (targetUser) {
          space = await ensureUserPersonalSpace(targetUser.id, targetUser.username);
        }
      }
    }
    if (!space) {
      throw new ServerError(404, "Space not found");
    }

    let user = null;
    if (options.token) {
      user = verifyToken(options.token);
    }

    // 1. Personal user space rule:
    if (!space.is_superadmin_space) {
      if (!space.is_public) {
        if (!user) {
          throw new ServerError(
            401,
            "Authentication required to join private space.",
          );
        }
        const isOwner = user.id === space.owner_id;
        const isSuperadmin = user.role === "superadmin";
        const isWhitelisted =
          Array.isArray(space.whitelist) &&
          space.whitelist.some(
            (w) => w.toLowerCase() === user.username.toLowerCase(),
          );

        if (!isOwner && !isSuperadmin && !isWhitelisted) {
          throw new ServerError(
            403,
            "Access denied: This space is private and requires permission.",
          );
        }
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
      const isWhitelisted =
        Array.isArray(space.whitelist) &&
        space.whitelist.some(
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

    getSpaceJukeboxes(this.spaceId)
      .then((loadedJukeboxes) => {
        if (loadedJukeboxes && Array.isArray(loadedJukeboxes)) {
          for (const jb of loadedJukeboxes) {
            this.jukeboxes.set(jb.id, jb);
          }
        }
      })
      .catch((err) => console.warn("Failed loading space jukeboxes:", err));

    // Continuous loop timer for playing jukeboxes
    this.jukeboxTimer = setInterval(() => {
      let changed = false;
      const now = Date.now();
      for (const [id, jb] of this.jukeboxes) {
        if (jb.isPlaying && jb.playlist.length > 0) {
          const track = jb.playlist[jb.currentTrackIndex];
          if (track && track.duration > 0) {
            const elapsed = (now - jb.trackStartedAt) / 1000;
            if (elapsed >= track.duration + 1) {
              jb.currentTrackIndex = (jb.currentTrackIndex + 1) % jb.playlist.length;
              jb.trackStartedAt = now;
              changed = true;
              this.broadcast("JUKEBOX_UPDATED", jb);
            }
          }
        }
      }
      if (changed) {
        this.persistJukeboxes();
      }
    }, 1000);

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

    // --- Jukebox Handlers ---

    // 1. Place Jukebox (owner/superadmin)
    this.onMessage(
      "JUKEBOX_PLACE",
      async (client: Client, data: { x: number; y: number; passable?: boolean; ontop?: boolean }) => {
        const auth = this.clientAuthMap.get(client.sessionId);
        const user = auth?.user;
        const isSuperadmin = user?.role === "superadmin";
        const isOwner =
          user && this.spaceOwnerId !== null && user.id === this.spaceOwnerId;

        if (!isSuperadmin && !isOwner) {
          client.send("ERROR", {
            message: "Permission denied: Only space owner or superadmin can place a jukebox.",
          });
          return;
        }

        const newJb: JukeboxState = {
          id: "jukebox_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
          spaceId: this.spaceId,
          x: Math.round(data.x),
          y: Math.round(data.y),
          isPlaying: false,
          currentTrackIndex: 0,
          trackStartedAt: 0,
          playlist: [],
          passable: data.passable ?? false,
          ontop: data.ontop ?? false,
        };

        this.jukeboxes.set(newJb.id, newJb);
        this.broadcast("JUKEBOX_UPDATED", newJb);
        await this.persistJukeboxes();
      },
    );

    // 2. Move Jukebox (owner/superadmin)
    this.onMessage(
      "JUKEBOX_MOVE",
      async (client: Client, data: { jukeboxId: string; x: number; y: number }) => {
        const auth = this.clientAuthMap.get(client.sessionId);
        const user = auth?.user;
        const isSuperadmin = user?.role === "superadmin";
        const isOwner =
          user && this.spaceOwnerId !== null && user.id === this.spaceOwnerId;

        if (!isSuperadmin && !isOwner) {
          client.send("ERROR", {
            message: "Permission denied: Only space owner or superadmin can move a jukebox.",
          });
          return;
        }

        const jb = this.jukeboxes.get(data.jukeboxId);
        if (!jb) return;
        jb.x = Math.round(data.x);
        jb.y = Math.round(data.y);
        this.broadcast("JUKEBOX_UPDATED", jb);
        await this.persistJukeboxes();
      },
    );

    // 3. Delete Jukebox (owner/superadmin)
    this.onMessage(
      "JUKEBOX_DELETE",
      async (client: Client, data: { jukeboxId: string }) => {
        const auth = this.clientAuthMap.get(client.sessionId);
        const user = auth?.user;
        const isSuperadmin = user?.role === "superadmin";
        const isOwner =
          user && this.spaceOwnerId !== null && user.id === this.spaceOwnerId;

        if (!isSuperadmin && !isOwner) {
          client.send("ERROR", {
            message: "Permission denied: Only space owner or superadmin can delete a jukebox.",
          });
          return;
        }

        if (this.jukeboxes.delete(data.jukeboxId)) {
          this.broadcast("JUKEBOX_DELETED", { jukeboxId: data.jukeboxId });
          await this.persistJukeboxes();
        }
      },
    );

    // 4. Add YouTube track to playlist (all users can add)
    this.onMessage(
      "JUKEBOX_ADD_TRACK",
      async (client: Client, data: { jukeboxId: string; urlOrId: string }) => {
        const jb = this.jukeboxes.get(data?.jukeboxId);
        if (!jb) return;
        if (!data || !data.urlOrId || typeof data.urlOrId !== "string") return;

        const raw = data.urlOrId.trim();
        let videoId = "";
        if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) {
          videoId = raw;
        } else {
          const match = raw.match(
            /(?:https?:\/\/)?(?:www\.|m\.|music\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|live\/|watch\?v=|watch\?.+&v=))([a-zA-Z0-9_-]{11})/i
          );
          if (match && match[1]) {
            videoId = match[1];
          }
        }

        // If not a single video ID, check if it's a playlist link
        if (!videoId) {
          const playlistId = extractPlaylistId(raw);
          if (playlistId) {
            try {
              const result = await fetchPlaylistVideos(playlistId);
              if (result.videos && result.videos.length > 0) {
                const auth = this.clientAuthMap.get(client.sessionId);
                const user = auth?.user;
                const player = this.state.players.get(client.sessionId);
                const submitterName =
                  player?.name || user?.displayName || user?.username || "Player";

                const wasEmpty = !jb.isPlaying || jb.playlist.length === 0;
                const initialLength = jb.playlist.length;

                const newTracks: JukeboxTrack[] = result.videos.map((vid, idx) => ({
                  id: "track_" + Date.now() + "_" + idx + "_" + Math.random().toString(36).substring(2, 7),
                  youtubeId: vid.videoId,
                  title: vid.title,
                  duration: vid.duration,
                  addedBySessionId: client.sessionId,
                  addedByName: submitterName,
                  addedAt: Date.now() + idx,
                }));

                jb.playlist.push(...newTracks);

                if (wasEmpty) {
                  jb.isPlaying = true;
                  jb.currentTrackIndex = initialLength;
                  jb.trackStartedAt = Date.now();
                }

                this.broadcast("JUKEBOX_UPDATED", jb);
                await this.persistJukeboxes();

                client.send("JUKEBOX_PLAYLIST_ADDED", {
                  count: newTracks.length,
                  title: result.title,
                  playlistId: result.playlistId,
                });
                return;
              }
            } catch (err: any) {
              client.send("JUKEBOX_ERROR", {
                message: err.message || "Failed to extract videos from playlist.",
              });
              return;
            }
          }

          client.send("ERROR", { message: "Invalid YouTube URL or Video ID. Please paste a valid YouTube video or playlist link." });
          client.send("JUKEBOX_ERROR", { message: "Invalid YouTube URL or Video ID. Please paste a valid YouTube video or playlist link." });
          return;
        }

        // Fetch video title via YouTube public oEmbed endpoint
        let title = `YouTube Track (${videoId})`;
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3500);
          const res = await fetch(
            `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
            { signal: controller.signal }
          );
          clearTimeout(timeoutId);
          if (res.ok) {
            const json = (await res.json()) as any;
            if (json && json.title) {
              title = json.title;
            }
          }
        } catch {
          // Gracefully use fallback title
        }

        const auth = this.clientAuthMap.get(client.sessionId);
        const user = auth?.user;
        const player = this.state.players.get(client.sessionId);
        const submitterName =
          player?.name || user?.displayName || user?.username || "Player";

        const newTrack: JukeboxTrack = {
          id: "track_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
          youtubeId: videoId,
          title,
          duration: 0,
          addedBySessionId: client.sessionId,
          addedByName: submitterName,
          addedAt: Date.now(),
        };

        jb.playlist.push(newTrack);

        // If previously stopped or this was the first track, start looping playback
        if (!jb.isPlaying || jb.playlist.length === 1) {
          jb.isPlaying = true;
          jb.currentTrackIndex = jb.playlist.length - 1;
          jb.trackStartedAt = Date.now();
        }

        this.broadcast("JUKEBOX_UPDATED", jb);
        await this.persistJukeboxes();
      },
    );

    // 4b. Add YouTube Playlist (extracts all videos from playlist)
    this.onMessage(
      "JUKEBOX_ADD_PLAYLIST",
      async (client: Client, data: { jukeboxId: string; playlistUrlOrId: string }) => {
        const jb = this.jukeboxes.get(data?.jukeboxId);
        if (!jb) {
          client.send("JUKEBOX_ERROR", { message: "Jukebox not found in this space." });
          return;
        }

        if (!data || !data.playlistUrlOrId || typeof data.playlistUrlOrId !== "string") {
          client.send("JUKEBOX_ERROR", { message: "Please provide a valid YouTube playlist link." });
          return;
        }

        const playlistId = extractPlaylistId(data.playlistUrlOrId);
        if (!playlistId) {
          client.send("JUKEBOX_ERROR", {
            message: "Invalid YouTube playlist URL or ID. Please check the playlist link.",
          });
          return;
        }

        try {
          const result = await fetchPlaylistVideos(playlistId);
          if (!result.videos || result.videos.length === 0) {
            client.send("JUKEBOX_ERROR", {
              message: "No videos found in this playlist. Please ensure the playlist is Public or Unlisted on YouTube.",
            });
            return;
          }

          const auth = this.clientAuthMap.get(client.sessionId);
          const user = auth?.user;
          const player = this.state.players.get(client.sessionId);
          const submitterName =
            player?.name || user?.displayName || user?.username || "Player";

          const wasEmpty = !jb.isPlaying || jb.playlist.length === 0;
          const initialLength = jb.playlist.length;

          const newTracks: JukeboxTrack[] = result.videos.map((vid, idx) => ({
            id: "track_" + Date.now() + "_" + idx + "_" + Math.random().toString(36).substring(2, 7),
            youtubeId: vid.videoId,
            title: vid.title,
            duration: vid.duration,
            addedBySessionId: client.sessionId,
            addedByName: submitterName,
            addedAt: Date.now() + idx,
          }));

          jb.playlist.push(...newTracks);

          if (wasEmpty) {
            jb.isPlaying = true;
            jb.currentTrackIndex = initialLength;
            jb.trackStartedAt = Date.now();
          }

          this.broadcast("JUKEBOX_UPDATED", jb);
          await this.persistJukeboxes();

          client.send("JUKEBOX_PLAYLIST_ADDED", {
            count: newTracks.length,
            title: result.title,
            playlistId: result.playlistId,
          });
        } catch (err: any) {
          console.error("[GameRoom] Error extracting YouTube playlist:", err);
          client.send("JUKEBOX_ERROR", {
            message: err.message || "Failed to extract playlist videos. Please verify the playlist link.",
          });
        }
      }
    );

    // 5. Remove track from playlist (all users can remove)
    this.onMessage(
      "JUKEBOX_REMOVE_TRACK",
      async (client: Client, data: { jukeboxId: string; trackId: string }) => {
        const jb = this.jukeboxes.get(data?.jukeboxId);
        if (!jb) return;

        const idx = jb.playlist.findIndex((t) => t.id === data.trackId);
        if (idx === -1) return;

        const isCurrent = idx === jb.currentTrackIndex;
        jb.playlist.splice(idx, 1);

        if (jb.playlist.length === 0) {
          jb.isPlaying = false;
          jb.currentTrackIndex = 0;
          jb.trackStartedAt = 0;
        } else if (isCurrent) {
          // If current track removed, loop to next valid track
          jb.currentTrackIndex = jb.currentTrackIndex % jb.playlist.length;
          jb.trackStartedAt = Date.now();
        } else if (idx < jb.currentTrackIndex) {
          jb.currentTrackIndex--;
        }

        this.broadcast("JUKEBOX_UPDATED", jb);
        await this.persistJukeboxes();
      },
    );

    // 6. Skip track (advance loop)
    this.onMessage(
      "JUKEBOX_SKIP_TRACK",
      async (client: Client, data: { jukeboxId: string }) => {
        const jb = this.jukeboxes.get(data?.jukeboxId);
        if (!jb || jb.playlist.length === 0) return;

        jb.currentTrackIndex = (jb.currentTrackIndex + 1) % jb.playlist.length;
        jb.trackStartedAt = Date.now();
        jb.isPlaying = true;

        this.broadcast("JUKEBOX_UPDATED", jb);
        await this.persistJukeboxes();
      },
    );

    // 7. Report track duration from client YouTube player
    this.onMessage(
      "JUKEBOX_REPORT_DURATION",
      (client: Client, data: { jukeboxId: string; trackId: string; duration: number }) => {
        const jb = this.jukeboxes.get(data?.jukeboxId);
        if (!jb) return;
        const track = jb.playlist.find((t) => t.id === data.trackId);
        if (
          track &&
          data.duration > 0 &&
          (track.duration === 0 || Math.abs(track.duration - data.duration) > 2)
        ) {
          track.duration = Math.round(data.duration);
          this.broadcast("JUKEBOX_UPDATED", jb);
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
        if (data.roomType === "whisper") {
          const targetSessionId = data.roomId;
          if (!targetSessionId) return;

          const targetPlayer = this.state.players.get(targetSessionId);
          const targetClient = this.clients.find(
            (c) => c.sessionId === targetSessionId,
          );

          if (!targetPlayer || !targetClient) {
            client.send("CHAT_MESSAGE", {
              id: msgId,
              senderId: "system",
              senderName: "System",
              senderColor: "#ef4444",
              roomType: "whisper",
              roomId: targetSessionId,
              roomName: data.targetName || "Player",
              targetId: targetSessionId,
              targetName: data.targetName || "Player",
              text: `Player "${data.targetName || "User"}" is no longer in this space.`,
              timestamp,
            });
            return;
          }

          const chatMsg: ChatMessage = {
            id: msgId,
            senderId: client.sessionId,
            senderName: player.name,
            senderColor: player.color,
            isSuperadmin,
            roomType: "whisper",
            roomId: targetSessionId,
            roomName: targetPlayer.name,
            targetId: targetSessionId,
            targetName: targetPlayer.name,
            text: cleanText,
            timestamp,
          };

          // Send to recipient
          targetClient.send("CHAT_MESSAGE", chatMsg);

          // Echo to sender so their tab updates
          client.send("CHAT_MESSAGE", chatMsg);
        } else if (data.roomType === "zone") {
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
    player.userId = (auth && auth.user && auth.user.id) || 0;
    player.userSpaceId = auth && auth.user ? `user_space_${auth.user.id}` : "";

    if (auth && auth.user) {
      ensureUserPersonalSpace(auth.user.id, auth.user.username).catch((err) => {
        console.warn("Could not ensure personal space on join:", err);
      });
    }
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

    // Send current space jukeboxes to joining client
    client.send("CURRENT_JUKEBOXES", Array.from(this.jukeboxes.values()));
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
          const solidBoxes = this.getSolidBoxes();
          const resolved = resolveMovement(
            player.x,
            player.y,
            vx,
            vy,
            dtSeconds,
            (c, r) => isWallTile(this.tiles[`${c},${r}`]),
            PLAYER_HITBOX_HALF_WIDTH,
            solidBoxes
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

  private getSolidBoxes(): SolidBox[] {
    const boxes: SolidBox[] = [];
    for (const jb of this.jukeboxes.values()) {
      if (jb.passable === false || (!jb.passable && (jb as any).isSolid)) {
        boxes.push({
          minX: jb.x - 22,
          maxX: jb.x + 22,
          minY: jb.y - 18,
          maxY: jb.y + 20,
        });
      }
    }
    return boxes;
  }

  private async persistJukeboxes() {
    try {
      await updateSpaceJukeboxes(this.spaceId, Array.from(this.jukeboxes.values()));
    } catch (err) {
      console.error("[GameRoom] Error persisting space jukeboxes:", err);
    }
  }

  onDispose() {
    if (this.jukeboxTimer) {
      clearInterval(this.jukeboxTimer);
      this.jukeboxTimer = null;
    }
  }
}
