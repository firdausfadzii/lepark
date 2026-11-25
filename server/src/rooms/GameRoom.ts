import { Room, Client, ServerError } from "colyseus";
import { focusPointsService } from "../services/FocusPointsService";
import { focusSessionService } from "../services/FocusSessionService";
import { rpgService } from "../services/RpgService";
import { squadService } from "../services/SquadService";
import { DinerRoomController } from "../services/DinerService";
import { GameState, PlayerState, OutfitSchema } from "../schema/GameState";
import {
  PlayerInputPayload,
  PlayerJoinOptions,
  PlayerAvatars,
  PlayerOutfit,
  DEFAULT_AVATAR_ICON,
  normalizeFrames,
  TILE_SIZE,
  GRID_COLS,
  GRID_ROWS,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  PLAYER_SPEED,
  CHARACTER_MAX_SIZE,
  PLAYER_HITBOX_HALF_WIDTH,
  PLAYER_FEET_TOP_OFFSET,
  PLAYER_FEET_BOTTOM_OFFSET,
  SERVER_TICK_RATE,
  getTileCenter,
  isWallTile,
  resolveMovement,
  createPixelCollisionChecker,
  PixelCollisionOptions,
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
  JukeboxRemoveTracksPayload,
  JukeboxMoveTrackPayload,
  JukeboxMoveTracksPayload,
  JukeboxClearPlaylistPayload,
  JukeboxTogglePausePayload,
  JukeboxSkipPayload,
  JukeboxPlacePayload,
  JukeboxMovePayload,
  JukeboxDeletePayload,
  TypewriterState,
  TypeRacePlayer,
  TypeRaceResult,
  TypeRaceRoomState,
  TypeRaceStatus,
  AshtrayState,
  SmokingGamePlayer,
  SmokingGameResult,
  SmokingGameRoomState,
  SmokingGameStatus,
  SmokingGameSettings,
  SmokingGameJoinPayload,
  SmokingGameLeavePayload,
  SmokingGameReadyPayload,
  SmokingGameUpdateSettingsPayload,
  SmokingGameStartPayload,
  SmokingGameMashPayload,
  SmokingGamePlayAgainPayload,
  ChessBoardState,
  ChessBoardPlacePayload,
  ChessBoardMovePayload,
  ChessBoardDeletePayload,
  ChessGameStatus,
  ChessPieceColor,
  ChessGamePlayer,
  ChessGameSpectator,
  ChessGameSummary,
  ChessGameState,
  ChessLobbyState,
  ChessJoinMatchPayload,
  ChessCreateMatchPayload,
  ChessCancelJoinPayload,
  ChessSpectateMatchPayload,
  ChessLeaveMatchPayload,
  ChessMovePayload,
  ChessResignPayload,
  ChessOfferDrawPayload,
  ChessRematchPayload,
  AquariumState,
  AquariumPlacePayload,
  AquariumMovePayload,
  AquariumDeletePayload,
  SellerNpcState,
  SellerNpcPlacePayload,
  SellerNpcMovePayload,
  SellerNpcUpdatePayload,
  ThrowBattleTurnPhase,
  ThrowBattlePlayer,
  ThrowBattleState,
  ThrowBattleChallengePayload,
  ThrowBattleInviteData,
  ThrowBattleMovePayload,
  ThrowBattleEnterAnglePayload,
  ThrowBattleLockAnglePayload,
  ThrowBattleThrowPayload,
  ThrowBattleTurnResultPayload,
  ThrowBattleRematchPayload,
  ThrowBattleLeavePayload,
  EntitySetInteractionPayload,
  isValidInteractionType,
  parseFreeformTile,
  isPaidAssetId,
  ASSET_UNLOCK_COST,
  FocusTheme,
  FocusRoomStartPayload,
  FocusRoomUpdateSettingsPayload,
  FocusRoomVisibilityPayload,
  SquadInvitePayload,
  SquadInviteRespondPayload,
  SquadKickPayload,
  isValidFocusTheme,
  resolveSpaceFocusTheme,
  resolveSpaceAssetShopTheme,
  getSellerThemeProfile,
  isValidAssetShopTheme,
  isValidSellerNpcSpriteKey,
  buildRpgGearSignature,
} from "shared";
import { Chess } from "chess.js";
import {
  upsertPlayer,
  updatePlayerPosition,
  updateUserLastLocation,
  updateUserLastPublicSpace,
  computeUserFocusStats,
  getSpaceById,
  getSpaceTiles,
  updateSpaceTiles,
  getSpacePrivateZones,
  updateSpacePrivateZones,
  getLastDbError,
  getSpaceJukeboxes,
  updateSpaceJukeboxes,
  getSpaceTypewriters,
  updateSpaceTypewriters,
  getSpaceAshtrays,
  updateSpaceAshtrays,
  getSpaceChessBoards,
  updateSpaceChessBoards,
  getSpaceAquariums,
  updateSpaceAquariums,
  getSpaceSellerNpc,
  updateSpaceSellerNpc,
  findUserById,
  ensureUserPersonalSpace,
  saveChatMessage,
  getRecentChatMessages,
  getOrganisationById,
  migrateTileString,
} from "../db";
import { verifyToken } from "../auth";
import { extractPlaylistId, fetchPlaylistVideos } from "../services/youtubePlaylist";
import { QuoteService } from "../services/QuoteService";

export const activeSpaceCounts = new Map<string, number>();
const activeRoomsBySpace = new Map<string, Set<GameRoom>>();

export function getSpacePlayerCount(spaceId: string): number {
  return activeSpaceCounts.get(spaceId) || 0;
}

export function notifySpaceSettingsUpdated(
  spaceId: string,
  sharedOwners: string[],
  meta?: { name?: string; focusTheme?: FocusTheme }
) {
  const rooms = activeRoomsBySpace.get(spaceId);
  if (!rooms) return;
  for (const room of rooms) {
    room.updateSpaceSettings(sharedOwners, meta);
  }
}

export class GameRoom extends Room<GameState> {
  maxClients = 64;

  public spaceId: string = "space_central_plaza";
  public spaceName: string = "CO3";
  public isSuperadminSpace: boolean = true;
  public spaceFocusTheme: FocusTheme = "auto";
  private playerInputs: Map<string, PlayerInputPayload> = new Map();
  private playerInputSyncTimes: Map<string, number> = new Map();
  private playerAvatars: Map<string, PlayerAvatars> = new Map();

  public getPlayerAvatar(sessionId: string): string | null {
    const avatars = this.playerAvatars.get(sessionId);
    if (!avatars || !avatars.idle) return null;
    const frames = normalizeFrames(avatars.idle);
    return frames.length > 0 ? frames[0] : null;
  }

  public getPlayerAvatars(sessionId: string): PlayerAvatars | null {
    return this.playerAvatars.get(sessionId) || null;
  }

  public get spaceTilesSnapshot(): Record<string, string> {
    return this.tiles;
  }
  private tiles: Record<string, string> = {};
  private privateZones: PrivateZone[] = [];
  private jukeboxes: Map<string, JukeboxState> = new Map();
  private jukeboxTimer: NodeJS.Timeout | null = null;
  private typewriters: Map<string, TypewriterState> = new Map();
  private typeRaceSessions: Map<
    string,
    {
      typewriterId: string;
      status: TypeRaceStatus;
      quote: string;
      startTime: number;
      countdown: number;
      countdownTimer?: NodeJS.Timeout;
      matchTimer?: NodeJS.Timeout;
      players: Map<string, TypeRacePlayer>;
      results: TypeRaceResult[];
    }
  > = new Map();
  private clientTypewriterRaceMap: Map<string, string> = new Map();
  private ashtrays: Map<string, AshtrayState> = new Map();
  private smokingSessions: Map<
    string,
    {
      ashtrayId: string;
      status: SmokingGameStatus;
      starterSessionId: string;
      settings: SmokingGameSettings;
      startTime: number;
      endTime: number;
      countdown: number;
      countdownTimer?: NodeJS.Timeout;
      matchTimer?: NodeJS.Timeout;
      lastBroadcastAt?: number;
      players: Map<string, SmokingGamePlayer>;
      results: SmokingGameResult[];
    }
  > = new Map();
  private clientAshtrayGameMap: Map<string, string> = new Map();
  private chessBoards: Map<string, ChessBoardState> = new Map();
  private aquariums: Map<string, AquariumState> = new Map();
  private chessMatches: Map<
    string,
    {
      matchId: string;
      chessBoardId: string;
      chess: Chess;
      whitePlayer?: ChessGamePlayer;
      blackPlayer?: ChessGamePlayer;
      spectators: Map<string, ChessGameSpectator>;
      status: ChessGameStatus;
      winner?: ChessPieceColor | "draw";
      winReason?: string;
      drawOffer?: ChessPieceColor | null;
      lastMove?: { from: string; to: string; san?: string };
      createdAt: number;
    }
  > = new Map();
  private clientChessMatchMap: Map<string, string> = new Map(); // sessionId -> matchId
  private chessLobbyViewers: Map<string, Set<string>> = new Map(); // chessBoardId -> Set of sessionIds
  private throwBattleMatches: Map<
    string,
    {
      matchId: string;
      status: "playing" | "ended";
      player1: ThrowBattlePlayer;
      player2: ThrowBattlePlayer;
      currentTurn: string;
      turnPhase: ThrowBattleTurnPhase;
      wind: number;
      round: number;
      winnerSessionId?: string | null;
      lockedAngle?: number;
      lockedPower?: number;
      rematchRequests: Set<string>;
    }
  > = new Map();
  private clientThrowBattleMatchMap: Map<string, string> = new Map(); // sessionId -> matchId
  private pendingThrowBattleChallenges: Map<
    string,
    {
      challengerSessionId: string;
      targetSessionId: string;
      hits: number;
      createdAt: number;
    }
  > = new Map(); // targetSessionId -> challenge info
  private voiceParticipants: Set<string> = new Set();
  private spaceOwnerId: number | null = null;
  private spaceSharedOwners: string[] = [];
  private sellerNpc: SellerNpcState | null = null;
  private clientAuthMap: Map<string, any> = new Map();
  private dinerController: DinerRoomController = new DinerRoomController(
    (type, payload) => this.broadcast(type, payload),
    (sessionId) => this.clients.find((c) => c.sessionId === sessionId)
  );

  public updateSpaceSharedOwners(sharedOwners: string[]) {
    this.spaceSharedOwners = Array.isArray(sharedOwners) ? [...sharedOwners] : [];
  }

  public updateSpaceSettings(
    sharedOwners: string[],
    meta?: { name?: string; focusTheme?: FocusTheme }
  ) {
    this.updateSpaceSharedOwners(sharedOwners);
    if (meta) {
      if (typeof meta.name === "string" && meta.name.trim()) {
        this.spaceName = meta.name.trim();
      }
      if (meta.focusTheme && isValidFocusTheme(meta.focusTheme)) {
        this.spaceFocusTheme = meta.focusTheme;
      }
      this.broadcast("SPACE_INFO_UPDATED", {
        spaceId: this.spaceId,
        name: this.spaceName,
        isSuperadminSpace: this.isSuperadminSpace,
        focusTheme: this.spaceFocusTheme,
        resolvedTheme: resolveSpaceFocusTheme({
          spaceName: this.spaceName,
          focusTheme: this.spaceFocusTheme,
          tiles: this.tiles,
          fallbackTheme: "park",
        }),
      });
      this.broadcast("SELLER_NPC_UPDATED", this.resolveSellerNpcForBroadcast());
    }
  }

  private isSpaceOwnerOrCoOwner(
    user: { id: number; username?: string; role?: string } | null | undefined,
  ): boolean {
    if (!user) return false;
    if (this.spaceOwnerId !== null && user.id === this.spaceOwnerId) {
      return true;
    }
    if (user.username && this.spaceSharedOwners.length > 0) {
      const lower = user.username.toLowerCase();
      return this.spaceSharedOwners.some((u) => u.toLowerCase() === lower);
    }
    return false;
  }
  private recentChatMessages: ChatMessage[] = [];
  private dbSyncCounter: number = 0;
  private cachedPixelCollisionChecker: PixelCollisionOptions | null = null;

  private getPixelCollisionChecker(): PixelCollisionOptions {
    if (!this.cachedPixelCollisionChecker) {
      this.cachedPixelCollisionChecker = createPixelCollisionChecker({
        tiles: this.tiles,
        jukeboxes: this.jukeboxes.values(),
        typewriters: this.typewriters.values(),
        ashtrays: this.ashtrays.values(),
        chessBoards: this.chessBoards.values(),
        aquariums: this.aquariums.values(),
        sellerNpc:
          this.sellerNpc && this.sellerNpc.enabled !== false ? this.sellerNpc : null,
      });
    }
    return this.cachedPixelCollisionChecker;
  }

  private invalidatePixelCollisionChecker(): void {
    this.cachedPixelCollisionChecker = null;
  }

  private reconcilePlayerPosition(
    player: PlayerState,
    clientX: number,
    clientY: number,
    pixelChecker: PixelCollisionOptions
  ): boolean {
    if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return false;

    const headHalf = CHARACTER_MAX_SIZE / 2;
    const targetX = Math.max(
      PLAYER_HITBOX_HALF_WIDTH,
      Math.min(WORLD_WIDTH - PLAYER_HITBOX_HALF_WIDTH, clientX)
    );
    const targetY = Math.max(
      headHalf,
      Math.min(WORLD_HEIGHT - PLAYER_FEET_BOTTOM_OFFSET, clientY)
    );

    const dist = Math.hypot(targetX - player.x, targetY - player.y);
    if (dist > 800) return false;

    const isBlocked = (px: number, py: number): boolean => {
      const left = Math.round(px - PLAYER_HITBOX_HALF_WIDTH);
      const right = Math.round(px + PLAYER_HITBOX_HALF_WIDTH);
      const top = Math.round(py + PLAYER_FEET_TOP_OFFSET);
      const bottom = Math.round(py + PLAYER_FEET_BOTTOM_OFFSET);
      if (pixelChecker.isBoxBlocked) {
        return pixelChecker.isBoxBlocked(left, top, right, bottom);
      }
      for (let y = top; y <= bottom; y++) {
        for (let x = left; x <= right; x++) {
          if (pixelChecker.isPixelSolid(x, y)) return true;
        }
      }
      return false;
    };

    if (!isBlocked(targetX, targetY)) {
      player.x = targetX;
      player.y = targetY;
      return true;
    }

    const offsets = [
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ];
    for (const [ox, oy] of offsets) {
      const nx = Math.max(
        PLAYER_HITBOX_HALF_WIDTH,
        Math.min(WORLD_WIDTH - PLAYER_HITBOX_HALF_WIDTH, targetX + ox)
      );
      const ny = Math.max(
        headHalf,
        Math.min(WORLD_HEIGHT - PLAYER_FEET_BOTTOM_OFFSET, targetY + oy)
      );
      if (!isBlocked(nx, ny)) {
        player.x = nx;
        player.y = ny;
        return true;
      }
    }

    return false;
  }

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
      if (user) {
        const userExists = await findUserById(user.id);
        if (!userExists) {
          user = null;
        } else {
          user = {
            id: userExists.id,
            username: userExists.username,
            displayName: userExists.display_name,
            role: userExists.role,
            focusPoints: userExists.focus_points || 0,
            focusStats: computeUserFocusStats(userExists),
            lastPublicSpaceId: userExists.last_public_space_id || null,
            lastSpaceId: userExists.last_space_id || null,
            lastX: userExists.last_x ?? null,
            lastY: userExists.last_y ?? null,
          };
        }
      }
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
        const isSharedOwner =
          Array.isArray(space.shared_owners) &&
          space.shared_owners.some(
            (w) => w.toLowerCase() === user.username.toLowerCase(),
          );
        const isSuperadmin = user.role === "superadmin";
        const isWhitelisted =
          Array.isArray(space.whitelist) &&
          space.whitelist.some(
            (w) => w.toLowerCase() === user.username.toLowerCase(),
          );

        if (!isOwner && !isSharedOwner && !isSuperadmin && !isWhitelisted) {
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
      const isSharedOwner =
        Array.isArray(space.shared_owners) &&
        space.shared_owners.some(
          (w) => w.toLowerCase() === user.username.toLowerCase(),
        );
      const isWhitelisted =
        Array.isArray(space.whitelist) &&
        space.whitelist.some(
          (w) => w.toLowerCase() === user.username.toLowerCase(),
        );
      if (!isWhitelisted && !isSharedOwner && user.role !== "superadmin") {
        throw new ServerError(
          403,
          "Access denied: This space is private and requires an invitation.",
        );
      }
    }

    return { user, space };
  }

  async onCreate(options: any) {
    this.spaceId = options.spaceId || "space_central_plaza";
    this.setMetadata({ spaceId: this.spaceId });
    this.setState(new GameState());

    if (!activeRoomsBySpace.has(this.spaceId)) {
      activeRoomsBySpace.set(this.spaceId, new Set());
    }
    activeRoomsBySpace.get(this.spaceId)!.add(this);

    // 20 Hz tick loop
    this.setSimulationInterval(
      (deltaTime) => this.update(deltaTime),
      1000 / SERVER_TICK_RATE,
    );

    this.onMessage(
      "PLAYER_INPUT",
      (client: Client, data: PlayerInputPayload) => {
        const left = !!data.left;
        const right = !!data.right;
        const up = !!data.up;
        const down = !!data.down;

        this.playerInputs.set(client.sessionId, {
          left,
          right,
          up,
          down,
        });

        const player = this.state.players.get(client.sessionId);
        if (player) {
          if (typeof data.x === "number" && typeof data.y === "number") {
            const pixelChecker = this.getPixelCollisionChecker();
            if (this.reconcilePlayerPosition(player, data.x, data.y, pixelChecker)) {
              this.playerInputSyncTimes.set(client.sessionId, Date.now());
            }
          }

          let vx = 0;
          let vy = 0;
          if (left) vx -= 1;
          if (right) vx += 1;
          if (up) vy -= 1;
          if (down) vy += 1;

          if (vx !== 0 || vy !== 0) {
            if (Math.abs(vx) >= Math.abs(vy)) {
              player.direction = vx < 0 ? "left" : "right";
            } else {
              player.direction = vy < 0 ? "up" : "down";
            }
          } else {
            player.direction = "idle";
          }
        }
      },
    );

    this.onMessage(
      "UPDATE_PROFILE",
      (
        client: Client,
        data: { name?: string; color?: string; avatars?: PlayerAvatars | null; outfit?: Partial<PlayerOutfit> },
      ) => {
        const player = this.state.players.get(client.sessionId);
        if (player) {
          if (data.name && data.name.trim().length > 0) {
            player.name = data.name.trim().slice(0, 24);
          }
          if (data.color && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(data.color)) {
            player.color = data.color;
          }
          if (data.outfit && typeof data.outfit === "object") {
            this.applyOutfitUpdate(player.outfit, data.outfit);
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
      "change_outfit",
      (client: Client, data: Partial<PlayerOutfit>) => {
        const player = this.state.players.get(client.sessionId);
        if (!player || !data || typeof data !== "object") return;
        this.applyOutfitUpdate(player.outfit, data);
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

    // Load initial tiles, space metadata, zones, jukeboxes, typewriters, ashtrays, and recent chat history
    try {
      const [loadedTiles, space, loadedZones, loadedJukeboxes, loadedTypewriters, loadedAshtrays, loadedChessBoards, loadedAquariums, loadedSellerNpc, loadedChats] =
        await Promise.all([
          getSpaceTiles(this.spaceId),
          getSpaceById(this.spaceId),
          getSpacePrivateZones(this.spaceId),
          getSpaceJukeboxes(this.spaceId),
          getSpaceTypewriters(this.spaceId),
          getSpaceAshtrays(this.spaceId),
          getSpaceChessBoards(this.spaceId),
          getSpaceAquariums(this.spaceId),
          getSpaceSellerNpc(this.spaceId),
          getRecentChatMessages(this.spaceId, "map", 50),
        ]);

      this.tiles = loadedTiles || {};
      if (space) {
        this.spaceOwnerId = space.owner_id;
        this.spaceName = space.name || this.spaceId;
        this.isSuperadminSpace = !!space.is_superadmin_space;
        this.spaceFocusTheme = isValidFocusTheme(space.focus_theme) ? space.focus_theme : "auto";
        this.spaceSharedOwners = Array.isArray(space.shared_owners) ? [...space.shared_owners] : [];
      }
      this.privateZones = loadedZones || [];
      if (loadedJukeboxes && Array.isArray(loadedJukeboxes)) {
        for (const jb of loadedJukeboxes) {
          this.jukeboxes.set(jb.id, jb);
        }
      }
      if (loadedTypewriters && Array.isArray(loadedTypewriters)) {
        for (const tw of loadedTypewriters) {
          this.typewriters.set(tw.id, tw);
        }
      }
      if (loadedAshtrays && Array.isArray(loadedAshtrays)) {
        for (const at of loadedAshtrays) {
          this.ashtrays.set(at.id, at);
        }
      }
      if (loadedChessBoards && Array.isArray(loadedChessBoards)) {
        for (const cb of loadedChessBoards) {
          this.chessBoards.set(cb.id, cb);
        }
      }
      if (loadedAquariums && Array.isArray(loadedAquariums)) {
        for (const aq of loadedAquariums) {
          this.aquariums.set(aq.id, aq);
        }
      }
      if (loadedSellerNpc) {
        this.sellerNpc = loadedSellerNpc;
      } else if (this.isSuperadminSpace) {
        const defaultPos = this.chooseDefaultSellerNpcPosition();
        this.sellerNpc = {
          id: `seller_${this.spaceId}`,
          spaceId: this.spaceId,
          x: defaultPos.x,
          y: defaultPos.y,
          shopTheme: "auto",
          showCounter: true,
          enabled: true,
          layer: 0,
        };
        await this.persistSellerNpc();
      }
      this.invalidatePixelCollisionChecker();
      await this.syncVirtualJukeboxesFromTiles(this.tiles, false);
      this.dinerController.syncLayoutFromTiles(this.tiles, this.getPixelCollisionChecker());
      this.recentChatMessages = loadedChats || [];
    } catch (err) {
      console.warn(`[GameRoom] Error preloading data for space ${this.spaceId}:`, err);
    }

    QuoteService.loadQuotes().catch((err) =>
      console.warn("Failed preloading quotes:", err)
    );

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
        const isOwner = this.isSpaceOwnerOrCoOwner(user);

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
          const migratedUpdates: Record<string, string> = {};
          const newlyPlacedPaidAssets = new Set<string>();

          for (const [k, v] of Object.entries(data.updates)) {
            if (v === "" || v === null || v === undefined) {
              migratedUpdates[k] = "";
            } else {
              const migratedVal = migrateTileString(String(v));
              if (!isSuperadmin && k.startsWith("freeform:")) {
                const nextParsed = parseFreeformTile(migratedVal);
                const prevParsed = this.tiles[k] ? parseFreeformTile(this.tiles[k]) : null;
                if (
                  nextParsed &&
                  isPaidAssetId(nextParsed.assetKey) &&
                  prevParsed?.assetKey !== nextParsed.assetKey
                ) {
                  newlyPlacedPaidAssets.add(nextParsed.assetKey);
                }
              } else if (!isSuperadmin && /^\d+,\d+$/.test(k)) {
                const prevAssets = new Set(
                  (this.tiles[k] || "")
                    .split("&")
                    .map((part) => part.split("|")[0])
                    .filter(Boolean)
                );
                for (const part of migratedVal.split("&")) {
                  const assetKey = part.split("|")[0];
                  if (assetKey && isPaidAssetId(assetKey) && !prevAssets.has(assetKey)) {
                    newlyPlacedPaidAssets.add(assetKey);
                  }
                }
              }
              migratedUpdates[k] = migratedVal;
            }
          }

          if (!isSuperadmin && newlyPlacedPaidAssets.size > 0) {
            const dbUser = user?.id ? await findUserById(user.id) : null;
            const unlockedSet = new Set<string>(
              Array.isArray(dbUser?.unlocked_assets) ? dbUser.unlocked_assets : []
            );
            for (const assetId of newlyPlacedPaidAssets) {
              if (!unlockedSet.has(assetId)) {
                client.send("ERROR", {
                  message: `Asset locked: Visit a space's Seller NPC counter to purchase this asset (${ASSET_UNLOCK_COST} FP) before placing it.`,
                });
                return;
              }
            }
          }

          for (const [k, migratedVal] of Object.entries(migratedUpdates)) {
            if (migratedVal === "") {
              delete this.tiles[k];
            } else {
              this.tiles[k] = migratedVal;
            }
          }
          this.invalidatePixelCollisionChecker();
          this.broadcast("TILES_UPDATED", migratedUpdates);
          await updateSpaceTiles(this.spaceId, this.tiles);
          await this.syncVirtualJukeboxesFromTiles(migratedUpdates, true);
          this.dinerController.syncLayoutFromTiles(this.tiles, this.getPixelCollisionChecker());
          this.dinerController.broadcastStateNow();
        }
      },
    );

    // ==========================================
    // Diner Dash Restaurant Minigame Handlers
    // ==========================================
    this.onMessage("DINER_JOIN_SHIFT", (client: Client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      this.dinerController.handleJoinShift(client, {
        x: player.x,
        y: player.y,
        name: player.name,
        color: player.color,
        userId: player.userId,
      });
    });

    this.onMessage("DINER_LEAVE_SHIFT", (client: Client) => {
      const player = this.state.players.get(client.sessionId);
      this.dinerController.handleLeaveShift(
        client.sessionId,
        player ? { x: player.x, y: player.y } : null,
        true
      );
    });

    this.onMessage("DINER_SEAT_CUSTOMER", (client: Client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      this.dinerController.handleSeatCustomer(client, { x: player.x, y: player.y });
    });

    this.onMessage("DINER_TAKE_ORDER", (client: Client, data?: { tableId?: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      this.dinerController.handleTakeOrder(
        client,
        { x: player.x, y: player.y },
        data?.tableId
      );
    });

    this.onMessage("DINER_SUBMIT_ORDERS", (client: Client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      this.dinerController.handleSubmitOrders(client, { x: player.x, y: player.y });
    });

    this.onMessage("DINER_PICKUP_FOOD", (client: Client, data?: { orderId?: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      this.dinerController.handlePickupFood(
        client,
        { x: player.x, y: player.y },
        data?.orderId
      );
    });

    this.onMessage("DINER_DELIVER_FOOD", (client: Client, data?: { tableId?: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      this.dinerController.handleDeliverFood(
        client,
        { x: player.x, y: player.y },
        data?.tableId
      );
    });

    // Handle updating interactable & interaction type on special entities (jukebox, typewriter, ashtray, chess_board, aquarium)
    this.onMessage(
      "ENTITY_SET_INTERACTION",
      async (client: Client, data: EntitySetInteractionPayload) => {
        const auth = this.clientAuthMap.get(client.sessionId);
        const user = auth?.user;
        const isSuperadmin = user?.role === "superadmin";
        const isOwner = this.isSpaceOwnerOrCoOwner(user);

        if (!isSuperadmin && !isOwner) {
          client.send("ERROR", {
            message:
              "Permission denied: Only space owner or superadmin can edit map.",
          });
          return;
        }

        if (!data || !data.id || !data.kind) return;
        const interactable = Boolean(data.interactable);
        const interaction =
          interactable && data.interaction && isValidInteractionType(data.interaction)
            ? data.interaction
            : null;

        if (data.kind === "jukebox") {
          const jb = this.jukeboxes.get(data.id);
          if (!jb) return;
          jb.interactable = interactable;
          jb.interaction = interaction;
          this.broadcast("JUKEBOX_UPDATED", jb);
          await this.persistJukeboxes();
        } else if (data.kind === "typewriter") {
          const tw = this.typewriters.get(data.id);
          if (!tw) return;
          tw.interactable = interactable;
          tw.interaction = interaction;
          if (interactable && interaction === "jukebox") {
            await this.ensureVirtualJukebox(tw.id, tw.x, tw.y, true);
          }
          this.broadcast("TYPEWRITER_UPDATED", tw);
          await this.persistTypewriters();
        } else if (data.kind === "ashtray") {
          const at = this.ashtrays.get(data.id);
          if (!at) return;
          at.interactable = interactable;
          at.interaction = interaction;
          if (interactable && interaction === "jukebox") {
            await this.ensureVirtualJukebox(at.id, at.x, at.y, true);
          }
          this.broadcast("ASHTRAY_UPDATED", at);
          await this.persistAshtrays();
        } else if (data.kind === "chess_board") {
          const cb = this.chessBoards.get(data.id);
          if (!cb) return;
          cb.interactable = interactable;
          cb.interaction = interaction;
          if (interactable && interaction === "jukebox") {
            await this.ensureVirtualJukebox(cb.id, cb.x, cb.y, true);
          }
          this.broadcast("CHESS_BOARD_UPDATED", cb);
          await this.persistChessBoards();
        } else if (data.kind === "aquarium") {
          const aq = this.aquariums.get(data.id);
          if (!aq) return;
          aq.interactable = interactable;
          aq.interaction = interaction;
          if (interactable && interaction === "jukebox") {
            await this.ensureVirtualJukebox(aq.id, aq.x, aq.y, true);
          }
          this.broadcast("AQUARIUM_UPDATED", aq);
          await this.persistAquariums();
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
        const isOwner = this.isSpaceOwnerOrCoOwner(user);

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
          this.privateZones = data.zones.map((z) => ({
            id: String(z.id),
            name: String(z.name || "Private Area"),
            bounds: {
              minCol: Number(z.bounds?.minCol ?? 0),
              minRow: Number(z.bounds?.minRow ?? 0),
              maxCol: Number(z.bounds?.maxCol ?? 0),
              maxRow: Number(z.bounds?.maxRow ?? 0),
            },
            createdAt: Number(z.createdAt ?? Date.now()),
          }));
          this.broadcast("PRIVATE_ZONES_UPDATED", this.privateZones);
          const saved = await updateSpacePrivateZones(
            this.spaceId,
            this.privateZones,
          );
          if (!saved) {
            const dbErr = getLastDbError();
            console.error(
              `[GameRoom] Failed to persist ${this.privateZones.length} private zones to DB for space ${this.spaceId}: ${dbErr}`,
            );
            client.send("ERROR", {
              message: `Failed to save private area to database.${dbErr ? ` (${dbErr})` : ""}`,
            });
          } else {
            console.log(
              `[GameRoom] Saved ${this.privateZones.length} private zones to DB for space ${this.spaceId}`,
            );
          }
        }
      },
    );

    // --- Jukebox Handlers ---

    // 1. Place Jukebox (owner/superadmin)
    this.onMessage(
      "JUKEBOX_PLACE",
      async (client: Client, data: { x: number; y: number; passable?: boolean; ontop?: boolean; layer?: number }) => {
        const auth = this.clientAuthMap.get(client.sessionId);
        const user = auth?.user;
        const isSuperadmin = user?.role === "superadmin";
        const isOwner = this.isSpaceOwnerOrCoOwner(user);

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
          layer: typeof data.layer === "number" ? Math.round(data.layer) : 0,
        };

        this.jukeboxes.set(newJb.id, newJb);
        this.invalidatePixelCollisionChecker();
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
        const isOwner = this.isSpaceOwnerOrCoOwner(user);

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
        this.invalidatePixelCollisionChecker();
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
        const isOwner = this.isSpaceOwnerOrCoOwner(user);

        if (!isSuperadmin && !isOwner) {
          client.send("ERROR", {
            message: "Permission denied: Only space owner or superadmin can delete a jukebox.",
          });
          return;
        }

        if (this.jukeboxes.delete(data.jukeboxId)) {
          this.invalidatePixelCollisionChecker();
          this.broadcast("JUKEBOX_DELETED", { jukeboxId: data.jukeboxId });
          await this.persistJukeboxes();
        }
      },
    );

    // 3b. Set Jukebox Passable (owner/superadmin)
    this.onMessage(
      "JUKEBOX_SET_PASSABLE",
      async (client: Client, data: { jukeboxId: string; passable: boolean }) => {
        const auth = this.clientAuthMap.get(client.sessionId);
        const user = auth?.user;
        const isSuperadmin = user?.role === "superadmin";
        const isOwner = this.isSpaceOwnerOrCoOwner(user);

        if (!isSuperadmin && !isOwner) {
          client.send("ERROR", {
            message: "Permission denied: Only space owner or superadmin can update a jukebox.",
          });
          return;
        }

        const jb = this.jukeboxes.get(data?.jukeboxId);
        if (!jb) return;
        jb.passable = !!data.passable;
        this.invalidatePixelCollisionChecker();
        this.broadcast("JUKEBOX_UPDATED", jb);
        await this.persistJukeboxes();
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

                const wasEmpty = jb.playlist.length === 0;
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
                  jb.pausedAt = 0;
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
        if (jb.playlist.length === 1) {
          jb.isPlaying = true;
          jb.currentTrackIndex = 0;
          jb.trackStartedAt = Date.now();
          jb.pausedAt = 0;
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

          const wasEmpty = jb.playlist.length === 0;
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
            jb.pausedAt = 0;
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
          jb.pausedAt = 0;
        } else if (isCurrent) {
          // If current track removed, loop to next valid track
          jb.currentTrackIndex = jb.currentTrackIndex % jb.playlist.length;
          jb.trackStartedAt = Date.now();
          jb.pausedAt = 0;
          jb.isPlaying = true;
        } else if (idx < jb.currentTrackIndex) {
          jb.currentTrackIndex--;
        }

        this.broadcast("JUKEBOX_UPDATED", jb);
        await this.persistJukeboxes();
      },
    );

    // 5b. Move track up or down in playlist (rearrange)
    this.onMessage(
      "JUKEBOX_MOVE_TRACK",
      async (client: Client, data: JukeboxMoveTrackPayload) => {
        const jb = this.jukeboxes.get(data?.jukeboxId);
        if (!jb || !jb.playlist || jb.playlist.length <= 1) return;
        if (!data?.trackId || (data.direction !== "up" && data.direction !== "down")) return;

        const currentIndex = jb.playlist.findIndex((t) => t.id === data.trackId);
        if (currentIndex === -1) return;

        const targetIndex = data.direction === "up" ? currentIndex - 1 : currentIndex + 1;
        if (targetIndex < 0 || targetIndex >= jb.playlist.length) return;

        // Remember which track was playing before rearranging
        const currentPlayingTrackId = jb.playlist[jb.currentTrackIndex]?.id;

        // Swap / move track to the target index
        const [movedTrack] = jb.playlist.splice(currentIndex, 1);
        jb.playlist.splice(targetIndex, 0, movedTrack);

        // Update currentTrackIndex so that the currently playing track continues smoothly
        if (currentPlayingTrackId) {
          const newPlayingIndex = jb.playlist.findIndex(
            (t) => t.id === currentPlayingTrackId
          );
          if (newPlayingIndex !== -1) {
            jb.currentTrackIndex = newPlayingIndex;
          }
        }

        this.broadcast("JUKEBOX_UPDATED", jb);
        await this.persistJukeboxes();
      },
    );

    // 5c. Bulk remove selected tracks from playlist
    this.onMessage(
      "JUKEBOX_REMOVE_TRACKS",
      async (client: Client, data: JukeboxRemoveTracksPayload) => {
        const jb = this.jukeboxes.get(data?.jukeboxId);
        if (!jb || !Array.isArray(data?.trackIds) || data.trackIds.length === 0) return;

        const toRemove = new Set(data.trackIds);
        const currentPlayingTrackId = jb.playlist[jb.currentTrackIndex]?.id;
        const oldCurrentIdx = jb.currentTrackIndex;

        let keptBeforeCurrent = 0;
        let removedAny = false;
        const nextPlaylist: JukeboxTrack[] = [];

        jb.playlist.forEach((track, idx) => {
          if (toRemove.has(track.id)) {
            removedAny = true;
          } else {
            if (idx < oldCurrentIdx) {
              keptBeforeCurrent++;
            }
            nextPlaylist.push(track);
          }
        });

        if (!removedAny) return;
        jb.playlist = nextPlaylist;

        if (jb.playlist.length === 0) {
          jb.isPlaying = false;
          jb.currentTrackIndex = 0;
          jb.trackStartedAt = 0;
          jb.pausedAt = 0;
        } else if (currentPlayingTrackId && !toRemove.has(currentPlayingTrackId)) {
          const newIdx = jb.playlist.findIndex((t) => t.id === currentPlayingTrackId);
          jb.currentTrackIndex = newIdx !== -1 ? newIdx : 0;
        } else {
          jb.currentTrackIndex = keptBeforeCurrent % jb.playlist.length;
          jb.trackStartedAt = Date.now();
          jb.pausedAt = 0;
          jb.isPlaying = true;
        }

        this.broadcast("JUKEBOX_UPDATED", jb);
        await this.persistJukeboxes();
      },
    );

    // 5d. Bulk move selected tracks up or down in playlist
    this.onMessage(
      "JUKEBOX_MOVE_TRACKS",
      async (client: Client, data: JukeboxMoveTracksPayload) => {
        const jb = this.jukeboxes.get(data?.jukeboxId);
        if (!jb || !jb.playlist || jb.playlist.length <= 1) return;
        if (!Array.isArray(data?.trackIds) || data.trackIds.length === 0) return;
        if (data.direction !== "up" && data.direction !== "down") return;

        const selectedSet = new Set(data.trackIds);
        const currentPlayingTrackId = jb.playlist[jb.currentTrackIndex]?.id;
        let moved = false;

        if (data.direction === "up") {
          for (let i = 1; i < jb.playlist.length; i++) {
            if (selectedSet.has(jb.playlist[i].id) && !selectedSet.has(jb.playlist[i - 1].id)) {
              const tmp = jb.playlist[i - 1];
              jb.playlist[i - 1] = jb.playlist[i];
              jb.playlist[i] = tmp;
              moved = true;
            }
          }
        } else {
          for (let i = jb.playlist.length - 2; i >= 0; i--) {
            if (selectedSet.has(jb.playlist[i].id) && !selectedSet.has(jb.playlist[i + 1].id)) {
              const tmp = jb.playlist[i + 1];
              jb.playlist[i + 1] = jb.playlist[i];
              jb.playlist[i] = tmp;
              moved = true;
            }
          }
        }

        if (!moved) return;

        if (currentPlayingTrackId) {
          const newPlayingIndex = jb.playlist.findIndex(
            (t) => t.id === currentPlayingTrackId
          );
          if (newPlayingIndex !== -1) {
            jb.currentTrackIndex = newPlayingIndex;
          }
        }

        this.broadcast("JUKEBOX_UPDATED", jb);
        await this.persistJukeboxes();
      },
    );

    // 5e. Clear entire playlist in one action
    this.onMessage(
      "JUKEBOX_CLEAR_PLAYLIST",
      async (client: Client, data: JukeboxClearPlaylistPayload) => {
        const jb = this.jukeboxes.get(data?.jukeboxId);
        if (!jb || !jb.playlist || jb.playlist.length === 0) return;

        jb.playlist = [];
        jb.isPlaying = false;
        jb.currentTrackIndex = 0;
        jb.trackStartedAt = 0;
        jb.pausedAt = 0;

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
        jb.pausedAt = 0;
        jb.isPlaying = true;

        this.broadcast("JUKEBOX_UPDATED", jb);
        await this.persistJukeboxes();
      },
    );

    // 6b. Toggle play / pause on Jukebox
    this.onMessage(
      "JUKEBOX_TOGGLE_PAUSE",
      async (client: Client, data: JukeboxTogglePausePayload) => {
        const jb = this.jukeboxes.get(data?.jukeboxId);
        if (!jb || !jb.playlist || jb.playlist.length === 0) return;

        const willBePlaying = data.paused !== undefined ? !data.paused : !jb.isPlaying;
        if (willBePlaying === jb.isPlaying) return;

        const now = Date.now();
        if (!willBePlaying) {
          // Pausing
          jb.isPlaying = false;
          jb.pausedAt = now;
        } else {
          // Resuming
          const pausedDuration =
            jb.pausedAt && jb.pausedAt > 0 ? Math.max(0, now - jb.pausedAt) : 0;
          jb.trackStartedAt = (jb.trackStartedAt || now) + pausedDuration;
          jb.pausedAt = 0;
          jb.isPlaying = true;
        }

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

    // --- Typewriter & Typeracing Handlers ---

    // 1. Place Typewriter (owner/superadmin)
    this.onMessage(
      "TYPEWRITER_PLACE",
      async (
        client: Client,
        data: { x: number; y: number; passable?: boolean; ontop?: boolean; layer?: number }
      ) => {
        const auth = this.clientAuthMap.get(client.sessionId);
        const user = auth?.user;
        const isSuperadmin = user?.role === "superadmin";
        const isOwner = this.isSpaceOwnerOrCoOwner(user);

        if (!isSuperadmin && !isOwner) {
          client.send("ERROR", {
            message:
              "Permission denied: Only space owner or superadmin can place a typewriter.",
          });
          return;
        }

        const newTw: TypewriterState = {
          id:
            "typewriter_" +
            Date.now() +
            "_" +
            Math.random().toString(36).substring(2, 7),
          spaceId: this.spaceId,
          x: Math.round(data.x),
          y: Math.round(data.y),
          passable: data.passable ?? false,
          ontop: data.ontop ?? false,
          layer: typeof data.layer === "number" ? Math.round(data.layer) : 0,
        };

        this.typewriters.set(newTw.id, newTw);
        this.invalidatePixelCollisionChecker();
        this.broadcast("TYPEWRITER_UPDATED", newTw);
        await this.persistTypewriters();
      }
    );

    // 2. Move Typewriter (owner/superadmin)
    this.onMessage(
      "TYPEWRITER_MOVE",
      async (
        client: Client,
        data: { typewriterId: string; x: number; y: number }
      ) => {
        const auth = this.clientAuthMap.get(client.sessionId);
        const user = auth?.user;
        const isSuperadmin = user?.role === "superadmin";
        const isOwner = this.isSpaceOwnerOrCoOwner(user);

        if (!isSuperadmin && !isOwner) {
          client.send("ERROR", {
            message:
              "Permission denied: Only space owner or superadmin can move a typewriter.",
          });
          return;
        }

        const tw = this.typewriters.get(data.typewriterId);
        if (!tw) return;
        tw.x = Math.round(data.x);
        tw.y = Math.round(data.y);
        this.invalidatePixelCollisionChecker();
        this.broadcast("TYPEWRITER_UPDATED", tw);
        await this.persistTypewriters();
      }
    );

    // 3. Delete Typewriter (owner/superadmin)
    this.onMessage(
      "TYPEWRITER_DELETE",
      async (client: Client, data: { typewriterId: string }) => {
        const auth = this.clientAuthMap.get(client.sessionId);
        const user = auth?.user;
        const isSuperadmin = user?.role === "superadmin";
        const isOwner = this.isSpaceOwnerOrCoOwner(user);

        if (!isSuperadmin && !isOwner) {
          client.send("ERROR", {
            message:
              "Permission denied: Only space owner or superadmin can delete a typewriter.",
          });
          return;
        }

        if (this.typewriters.delete(data.typewriterId)) {
          this.invalidatePixelCollisionChecker();
          this.broadcast("TYPEWRITER_DELETED", {
            typewriterId: data.typewriterId,
          });
          const session = this.typeRaceSessions.get(data.typewriterId);
          if (session) {
            if (session.countdownTimer) clearInterval(session.countdownTimer);
            if (session.matchTimer) clearTimeout(session.matchTimer);
            this.typeRaceSessions.delete(data.typewriterId);
          }
          await this.persistTypewriters();
        }
      }
    );

    // 3b. Set Typewriter Passable (owner/superadmin)
    this.onMessage(
      "TYPEWRITER_SET_PASSABLE",
      async (client: Client, data: { typewriterId: string; passable: boolean }) => {
        const auth = this.clientAuthMap.get(client.sessionId);
        const user = auth?.user;
        const isSuperadmin = user?.role === "superadmin";
        const isOwner = this.isSpaceOwnerOrCoOwner(user);

        if (!isSuperadmin && !isOwner) {
          client.send("ERROR", {
            message:
              "Permission denied: Only space owner or superadmin can update a typewriter.",
          });
          return;
        }

        const tw = this.typewriters.get(data.typewriterId);
        if (!tw) return;
        tw.passable = !!data.passable;
        this.invalidatePixelCollisionChecker();
        this.broadcast("TYPEWRITER_UPDATED", tw);
        await this.persistTypewriters();
      }
    );

    // 4. Join Typeracing Room/Modal
    this.onMessage(
      "TYPERACE_JOIN",
      (client: Client, data: { typewriterId: string }) => {
        if (!data?.typewriterId) return;
        const twId = data.typewriterId;
        let session = this.typeRaceSessions.get(twId);
        if (!session) {
          session = {
            typewriterId: twId,
            status: "waiting",
            quote: "",
            startTime: 0,
            countdown: 0,
            players: new Map(),
            results: [],
          };
          this.typeRaceSessions.set(twId, session);
        }

        const auth = this.clientAuthMap.get(client.sessionId);
        const name =
          auth?.user?.displayName || auth?.user?.username || "Player";
        const color =
          this.state.players.get(client.sessionId)?.color || "#3b82f6";
        const userId = auth?.user?.id;

        // "when other players join during match on going, they will be just viewer first until match ended."
        const isViewer =
          session.status === "racing" || session.status === "starting";

        session.players.set(client.sessionId, {
          sessionId: client.sessionId,
          userId,
          name,
          color,
          isReady: false,
          isViewer,
          progress: 0,
          charsTyped: 0,
          wpm: 0,
          accuracy: 100,
          finished: false,
        });

        this.clientTypewriterRaceMap.set(client.sessionId, twId);
        client.send("TYPERACE_STATE", this.getRaceRoomState(session));
        this.broadcastTypeRaceState(session);
      }
    );

    // 5. Leave Typeracing Room/Modal
    this.onMessage(
      "TYPERACE_LEAVE",
      (client: Client, data: { typewriterId: string }) => {
        const twId =
          data?.typewriterId ||
          this.clientTypewriterRaceMap.get(client.sessionId);
        if (twId) {
          this.handleTypeRaceLeave(client.sessionId, twId);
        }
      }
    );

    // 6. Ready status toggle
    this.onMessage(
      "TYPERACE_READY",
      (client: Client, data: { typewriterId: string; ready: boolean }) => {
        if (!data?.typewriterId) return;
        const session = this.typeRaceSessions.get(data.typewriterId);
        if (!session || session.status !== "waiting") return;

        const player = session.players.get(client.sessionId);
        if (!player || player.isViewer) return;

        player.isReady = Boolean(data.ready);

        // "match won't start until all players are ready."
        const activePlayers = Array.from(session.players.values()).filter(
          (p) => !p.isViewer
        );
        if (
          activePlayers.length > 0 &&
          activePlayers.every((p) => p.isReady)
        ) {
          this.startTypeRaceCountdown(session);
        } else {
          this.broadcastTypeRaceState(session);
        }
      }
    );

    // 7. Progress update during race
    this.onMessage(
      "TYPERACE_PROGRESS",
      (
        client: Client,
        data: {
          typewriterId: string;
          charsTyped: number;
          errors: number;
          finished: boolean;
          wpm: number;
          accuracy: number;
        }
      ) => {
        if (!data?.typewriterId) return;
        const session = this.typeRaceSessions.get(data.typewriterId);
        if (!session || session.status !== "racing") return;

        const player = session.players.get(client.sessionId);
        if (!player || player.isViewer) return;

        player.charsTyped = Math.max(0, data.charsTyped || 0);
        player.progress = Math.min(
          100,
          Math.max(
            0,
            Math.round(
              (player.charsTyped / Math.max(1, session.quote.length)) * 100
            )
          )
        );
        player.wpm = Math.max(0, Math.round(data.wpm || 0));
        player.accuracy = Math.min(
          100,
          Math.max(0, Math.round(data.accuracy || 100))
        );

        if (data.finished && !player.finished) {
          player.finished = true;
          const elapsedSec = (Date.now() - session.startTime) / 1000;
          player.finishTime = parseFloat(elapsedSec.toFixed(1));
          player.finishRank = session.results.length + 1;

          session.results.push({
            sessionId: client.sessionId,
            name: player.name,
            color: player.color,
            wpm: player.wpm,
            accuracy: player.accuracy,
            timeSeconds: player.finishTime,
            rank: player.finishRank,
          });

          // Check if all active players finished
          const activeRacers = Array.from(session.players.values()).filter(
            (p) => !p.isViewer
          );
          const allFinished = activeRacers.every((p) => p.finished);
          if (allFinished) {
            this.endTypeRace(session);
            return;
          } else if (player.finishRank === 1 && !session.matchTimer) {
            // First player finished, start 20s grace timer for remaining racers
            session.matchTimer = setTimeout(
              () => this.endTypeRace(session),
              20000
            );
          }
        }

        this.broadcastTypeRaceState(session);
      }
    );

    // 8. Play again / restart lobby
    this.onMessage(
      "TYPERACE_PLAY_AGAIN",
      (client: Client, data: { typewriterId: string }) => {
        if (!data?.typewriterId) return;
        const session = this.typeRaceSessions.get(data.typewriterId);
        if (!session || session.status !== "ended") return;

        if (session.countdownTimer) clearInterval(session.countdownTimer);
        if (session.matchTimer) clearTimeout(session.matchTimer);

        session.status = "waiting";
        session.quote = "";
        session.results = [];
        session.countdown = 0;

        // Reset players and make viewers active players for next match
        for (const p of session.players.values()) {
          p.isViewer = false;
          p.isReady = false;
          p.progress = 0;
          p.charsTyped = 0;
          p.wpm = 0;
          p.accuracy = 100;
          p.finished = false;
          p.finishRank = undefined;
          p.finishTime = undefined;
        }

        this.broadcastTypeRaceState(session);
      }
    );

    // --- Ashtray & Smoking Game Handlers ---

    // 1. Place Ashtray (owner/superadmin)
    this.onMessage(
      "ASHTRAY_PLACE",
      async (
        client: Client,
        data: { x: number; y: number; passable?: boolean; ontop?: boolean; layer?: number }
      ) => {
        const auth = this.clientAuthMap.get(client.sessionId);
        const user = auth?.user;
        const isSuperadmin = user?.role === "superadmin";
        const isOwner = this.isSpaceOwnerOrCoOwner(user);

        if (!isSuperadmin && !isOwner) {
          client.send("ERROR", {
            message:
              "Permission denied: Only space owner or superadmin can place an ashtray.",
          });
          return;
        }

        const newAt: AshtrayState = {
          id:
            "ashtray_" +
            Date.now() +
            "_" +
            Math.random().toString(36).substring(2, 7),
          spaceId: this.spaceId,
          x: Math.round(data.x),
          y: Math.round(data.y),
          passable: data.passable ?? false,
          ontop: data.ontop ?? false,
          layer: typeof data.layer === "number" ? Math.round(data.layer) : 0,
        };

        this.ashtrays.set(newAt.id, newAt);
        this.invalidatePixelCollisionChecker();
        this.broadcast("ASHTRAY_UPDATED", newAt);
        await this.persistAshtrays();
      }
    );

    // 2. Move Ashtray (owner/superadmin)
    this.onMessage(
      "ASHTRAY_MOVE",
      async (
        client: Client,
        data: { ashtrayId: string; x: number; y: number }
      ) => {
        const auth = this.clientAuthMap.get(client.sessionId);
        const user = auth?.user;
        const isSuperadmin = user?.role === "superadmin";
        const isOwner = this.isSpaceOwnerOrCoOwner(user);

        if (!isSuperadmin && !isOwner) {
          client.send("ERROR", {
            message:
              "Permission denied: Only space owner or superadmin can move an ashtray.",
          });
          return;
        }

        const at = this.ashtrays.get(data.ashtrayId);
        if (at) {
          at.x = Math.round(data.x);
          at.y = Math.round(data.y);
          this.invalidatePixelCollisionChecker();
          this.broadcast("ASHTRAY_UPDATED", at);
          await this.persistAshtrays();
        }
      }
    );

    // 3. Delete Ashtray (owner/superadmin)
    this.onMessage(
      "ASHTRAY_DELETE",
      async (client: Client, data: { ashtrayId: string }) => {
        const auth = this.clientAuthMap.get(client.sessionId);
        const user = auth?.user;
        const isSuperadmin = user?.role === "superadmin";
        const isOwner = this.isSpaceOwnerOrCoOwner(user);

        if (!isSuperadmin && !isOwner) {
          client.send("ERROR", {
            message:
              "Permission denied: Only space owner or superadmin can delete an ashtray.",
          });
          return;
        }

        if (this.ashtrays.delete(data.ashtrayId)) {
          this.invalidatePixelCollisionChecker();
          this.broadcast("ASHTRAY_DELETED", {
            ashtrayId: data.ashtrayId,
          });
          const session = this.smokingSessions.get(data.ashtrayId);
          if (session) {
            if (session.countdownTimer) clearInterval(session.countdownTimer);
            if (session.matchTimer) clearTimeout(session.matchTimer);
            this.smokingSessions.delete(data.ashtrayId);
          }
          await this.persistAshtrays();
        }
      }
    );

    // 3b. Set Ashtray Passable (owner/superadmin)
    this.onMessage(
      "ASHTRAY_PASSABLE",
      async (client: Client, data: { ashtrayId: string; passable: boolean }) => {
        const auth = this.clientAuthMap.get(client.sessionId);
        const user = auth?.user;
        const isSuperadmin = user?.role === "superadmin";
        const isOwner = this.isSpaceOwnerOrCoOwner(user);

        if (!isSuperadmin && !isOwner) {
          client.send("ERROR", {
            message:
              "Permission denied: Only space owner or superadmin can update an ashtray.",
          });
          return;
        }

        const at = this.ashtrays.get(data.ashtrayId);
        if (at) {
          at.passable = Boolean(data.passable);
          this.invalidatePixelCollisionChecker();
          this.broadcast("ASHTRAY_UPDATED", at);
          await this.persistAshtrays();
        }
      }
    );

    // 4. Join Smoking Game
    this.onMessage(
      "SMOKING_GAME_JOIN",
      (client: Client, data: { ashtrayId: string }) => {
        if (!data?.ashtrayId) return;
        const atId = data.ashtrayId;
        let session = this.smokingSessions.get(atId);
        if (!session) {
          session = {
            ashtrayId: atId,
            status: "waiting",
            starterSessionId: client.sessionId,
            settings: {
              mashesPerCigarette: 50,
              gameDuration: 60,
            },
            startTime: 0,
            endTime: 0,
            countdown: 0,
            players: new Map(),
            results: [],
          };
          this.smokingSessions.set(atId, session);
        }

        const auth = this.clientAuthMap.get(client.sessionId);
        const name =
          auth?.user?.displayName || auth?.user?.username || "Player";
        const color =
          this.state.players.get(client.sessionId)?.color || "#3b82f6";
        const userId = auth?.user?.id;

        const avatars = this.playerAvatars.get(client.sessionId);
        let avatarUrl: string | undefined = undefined;
        if (avatars?.idle) {
          if (Array.isArray(avatars.idle) && avatars.idle.length > 0) {
            avatarUrl = avatars.idle[0];
          } else if (typeof avatars.idle === "string") {
            avatarUrl = avatars.idle;
          }
        }
        if (!avatarUrl) {
          avatarUrl = DEFAULT_AVATAR_ICON;
        }

        const isViewer =
          session.status === "smoking" || session.status === "starting";

        // If starter left or session had no players, set client as starter
        if (
          !session.starterSessionId ||
          !session.players.has(session.starterSessionId) ||
          session.players.size === 0
        ) {
          session.starterSessionId = client.sessionId;
        }

        const isStarter = session.starterSessionId === client.sessionId;

        session.players.set(client.sessionId, {
          sessionId: client.sessionId,
          userId,
          name,
          color,
          avatarUrl,
          isReady: isStarter ? true : false,
          isStarter,
          isViewer,
          currentMashes: 0,
          cigarettesFinished: 0,
          totalMashes: 0,
          mashesPerSecond: 0,
          joinedAt: Date.now(),
        });

        this.clientAshtrayGameMap.set(client.sessionId, atId);
        client.send("SMOKING_GAME_STATE", this.getSmokingRoomState(session));
        this.broadcastSmokingGameState(session);
      }
    );

    // 5. Leave Smoking Game
    this.onMessage(
      "SMOKING_GAME_LEAVE",
      (client: Client, data: { ashtrayId: string }) => {
        const atId =
          data?.ashtrayId ||
          this.clientAshtrayGameMap.get(client.sessionId);
        if (atId) {
          this.handleSmokingGameLeave(client.sessionId, atId);
        }
      }
    );

    // 6. Ready status toggle
    this.onMessage(
      "SMOKING_GAME_READY",
      (client: Client, data: { ashtrayId: string; ready: boolean }) => {
        if (!data?.ashtrayId) return;
        const session = this.smokingSessions.get(data.ashtrayId);
        if (!session || session.status !== "waiting") return;

        const player = session.players.get(client.sessionId);
        if (!player || player.isViewer) return;

        player.isReady = Boolean(data.ready);
        this.broadcastSmokingGameState(session);
      }
    );

    // 7. Update Settings (Game Starter only)
    this.onMessage(
      "SMOKING_GAME_UPDATE_SETTINGS",
      (
        client: Client,
        data: { ashtrayId: string; mashesPerCigarette?: number; gameDuration?: number }
      ) => {
        if (!data?.ashtrayId) return;
        const session = this.smokingSessions.get(data.ashtrayId);
        if (!session || session.status !== "waiting") return;

        // Verify client is the game starter
        if (session.starterSessionId !== client.sessionId) return;

        if (typeof data.mashesPerCigarette === "number" && data.mashesPerCigarette > 0) {
          session.settings.mashesPerCigarette = Math.min(500, Math.max(5, Math.round(data.mashesPerCigarette)));
        }
        if (typeof data.gameDuration === "number" && data.gameDuration > 0) {
          session.settings.gameDuration = Math.min(600, Math.max(10, Math.round(data.gameDuration)));
        }

        this.broadcastSmokingGameState(session);
      }
    );

    // 8. Start Game (Game Starter only)
    this.onMessage(
      "SMOKING_GAME_START",
      (client: Client, data: { ashtrayId: string }) => {
        if (!data?.ashtrayId) return;
        const session = this.smokingSessions.get(data.ashtrayId);
        if (!session || session.status !== "waiting") return;

        // Verify client is the game starter
        if (session.starterSessionId !== client.sessionId) return;

        this.startSmokingGameCountdown(session);
      }
    );

    // 9. Mash Progress Update
    this.onMessage(
      "SMOKING_GAME_MASH",
      (
        client: Client,
        data: {
          ashtrayId: string;
          currentMashes: number;
          cigarettesFinished: number;
          totalMashes: number;
          mashesPerSecond: number;
        }
      ) => {
        if (!data?.ashtrayId) return;
        const session = this.smokingSessions.get(data.ashtrayId);
        if (!session || session.status !== "smoking") return;

        const player = session.players.get(client.sessionId);
        if (!player || player.isViewer) return;

        player.currentMashes = Math.max(0, data.currentMashes || 0);
        player.cigarettesFinished = Math.max(0, data.cigarettesFinished || 0);
        player.totalMashes = Math.max(0, data.totalMashes || 0);
        player.mashesPerSecond = Math.max(0, parseFloat((data.mashesPerSecond || 0).toFixed(1)));

        this.broadcastSmokingGameStateThrottled(session);
      }
    );

    // 10. Play Again / Reset to Lobby
    this.onMessage(
      "SMOKING_GAME_PLAY_AGAIN",
      (client: Client, data: { ashtrayId: string }) => {
        if (!data?.ashtrayId) return;
        const session = this.smokingSessions.get(data.ashtrayId);
        if (!session || session.status !== "ended") return;

        if (session.countdownTimer) clearInterval(session.countdownTimer);
        if (session.matchTimer) clearTimeout(session.matchTimer);

        session.status = "waiting";
        session.results = [];
        session.countdown = 0;
        session.startTime = 0;
        session.endTime = 0;

        // Reset players and make viewers active players for next match
        for (const p of session.players.values()) {
          p.isViewer = false;
          p.isReady = p.isStarter ? true : false;
          p.currentMashes = 0;
          p.cigarettesFinished = 0;
          p.totalMashes = 0;
          p.mashesPerSecond = 0;
          p.rank = undefined;
        }

        this.broadcastSmokingGameState(session);
      }
    );

    // ==========================================
    // Chess Board & Game Message Handlers
    // ==========================================

    // 1. Place Chess Board (owner/superadmin)
    this.onMessage(
      "CHESS_BOARD_PLACE",
      async (client: Client, data: ChessBoardPlacePayload) => {
        const auth = this.clientAuthMap.get(client.sessionId);
        const user = auth?.user;
        const isSuperadmin = user?.role === "superadmin";
        const isOwner = this.isSpaceOwnerOrCoOwner(user);

        if (!isSuperadmin && !isOwner) {
          client.send("ERROR", {
            message:
              "Permission denied: Only space owner or superadmin can place a chess board.",
          });
          return;
        }

        const newCb: ChessBoardState = {
          id:
            "chess_board_" +
            Date.now() +
            "_" +
            Math.floor(Math.random() * 10000),
          spaceId: this.spaceId,
          x: Math.round(data.x),
          y: Math.round(data.y),
          passable: data.passable !== undefined ? Boolean(data.passable) : false,
          ontop: data.ontop !== undefined ? Boolean(data.ontop) : false,
          layer: typeof data.layer === "number" ? data.layer : 0,
        };

        this.chessBoards.set(newCb.id, newCb);
        this.invalidatePixelCollisionChecker();
        this.broadcast("CHESS_BOARD_UPDATED", newCb);
        await this.persistChessBoards();
      }
    );

    // 2. Move Chess Board (owner/superadmin)
    this.onMessage(
      "CHESS_BOARD_MOVE",
      async (client: Client, data: ChessBoardMovePayload) => {
        const auth = this.clientAuthMap.get(client.sessionId);
        const user = auth?.user;
        const isSuperadmin = user?.role === "superadmin";
        const isOwner = this.isSpaceOwnerOrCoOwner(user);

        if (!isSuperadmin && !isOwner) {
          client.send("ERROR", {
            message:
              "Permission denied: Only space owner or superadmin can move a chess board.",
          });
          return;
        }

        const cb = this.chessBoards.get(data.chessBoardId);
        if (cb) {
          cb.x = Math.round(data.x);
          cb.y = Math.round(data.y);
          this.invalidatePixelCollisionChecker();
          this.broadcast("CHESS_BOARD_UPDATED", cb);
          await this.persistChessBoards();
        }
      }
    );

    // 3. Delete Chess Board (owner/superadmin)
    this.onMessage(
      "CHESS_BOARD_DELETE",
      async (client: Client, data: ChessBoardDeletePayload) => {
        const auth = this.clientAuthMap.get(client.sessionId);
        const user = auth?.user;
        const isSuperadmin = user?.role === "superadmin";
        const isOwner = this.isSpaceOwnerOrCoOwner(user);

        if (!isSuperadmin && !isOwner) {
          client.send("ERROR", {
            message:
              "Permission denied: Only space owner or superadmin can delete a chess board.",
          });
          return;
        }

        if (this.chessBoards.delete(data.chessBoardId)) {
          this.invalidatePixelCollisionChecker();
          this.broadcast("CHESS_BOARD_DELETED", {
            chessBoardId: data.chessBoardId,
          });

          // Clean up matches on this board
          for (const [matchId, match] of this.chessMatches.entries()) {
            if (match.chessBoardId === data.chessBoardId) {
              this.chessMatches.delete(matchId);
            }
          }
          this.chessLobbyViewers.delete(data.chessBoardId);
          await this.persistChessBoards();
        }
      }
    );

    // 4. Set Chess Board Passable (owner/superadmin)
    this.onMessage(
      "CHESS_BOARD_PASSABLE",
      async (client: Client, data: { chessBoardId: string; passable: boolean }) => {
        const auth = this.clientAuthMap.get(client.sessionId);
        const user = auth?.user;
        const isSuperadmin = user?.role === "superadmin";
        const isOwner = this.isSpaceOwnerOrCoOwner(user);

        if (!isSuperadmin && !isOwner) {
          client.send("ERROR", {
            message:
              "Permission denied: Only space owner or superadmin can update a chess board.",
          });
          return;
        }

        const cb = this.chessBoards.get(data.chessBoardId);
        if (cb) {
          cb.passable = Boolean(data.passable);
          this.invalidatePixelCollisionChecker();
          this.broadcast("CHESS_BOARD_UPDATED", cb);
          await this.persistChessBoards();
        }
      }
    );

    // ==========================================
    // Aquarium & Fishing Message Handlers
    // ==========================================

    // 1. Place Aquarium (owner/superadmin)
    this.onMessage(
      "AQUARIUM_PLACE",
      async (client: Client, data: AquariumPlacePayload) => {
        const auth = this.clientAuthMap.get(client.sessionId);
        const user = auth?.user;
        const isSuperadmin = user?.role === "superadmin";
        const isOwner = this.isSpaceOwnerOrCoOwner(user);

        if (!isSuperadmin && !isOwner) {
          client.send("ERROR", {
            message:
              "Permission denied: Only space owner or superadmin can place an aquarium.",
          });
          return;
        }

        const newAq: AquariumState = {
          id:
            "aquarium_" +
            Date.now() +
            "_" +
            Math.floor(Math.random() * 10000),
          spaceId: this.spaceId,
          x: Math.round(data.x),
          y: Math.round(data.y),
          passable: data.passable !== undefined ? Boolean(data.passable) : false,
          ontop: data.ontop !== undefined ? Boolean(data.ontop) : false,
          layer: typeof data.layer === "number" ? data.layer : 0,
        };

        this.aquariums.set(newAq.id, newAq);
        this.invalidatePixelCollisionChecker();
        this.broadcast("AQUARIUM_UPDATED", newAq);
        await this.persistAquariums();
      }
    );

    // 2. Move Aquarium (owner/superadmin)
    this.onMessage(
      "AQUARIUM_MOVE",
      async (client: Client, data: AquariumMovePayload) => {
        const auth = this.clientAuthMap.get(client.sessionId);
        const user = auth?.user;
        const isSuperadmin = user?.role === "superadmin";
        const isOwner = this.isSpaceOwnerOrCoOwner(user);

        if (!isSuperadmin && !isOwner) {
          client.send("ERROR", {
            message:
              "Permission denied: Only space owner or superadmin can move an aquarium.",
          });
          return;
        }

        const aq = this.aquariums.get(data.aquariumId);
        if (aq) {
          aq.x = Math.round(data.x);
          aq.y = Math.round(data.y);
          this.invalidatePixelCollisionChecker();
          this.broadcast("AQUARIUM_UPDATED", aq);
          await this.persistAquariums();
        }
      }
    );

    // 3. Delete Aquarium (owner/superadmin)
    this.onMessage(
      "AQUARIUM_DELETE",
      async (client: Client, data: AquariumDeletePayload) => {
        const auth = this.clientAuthMap.get(client.sessionId);
        const user = auth?.user;
        const isSuperadmin = user?.role === "superadmin";
        const isOwner = this.isSpaceOwnerOrCoOwner(user);

        if (!isSuperadmin && !isOwner) {
          client.send("ERROR", {
            message:
              "Permission denied: Only space owner or superadmin can delete an aquarium.",
          });
          return;
        }

        if (this.aquariums.delete(data.aquariumId)) {
          this.invalidatePixelCollisionChecker();
          this.broadcast("AQUARIUM_DELETED", {
            aquariumId: data.aquariumId,
          });
          await this.persistAquariums();
        }
      }
    );

    // 4. Set Aquarium Passable (owner/superadmin)
    this.onMessage(
      "AQUARIUM_PASSABLE",
      async (client: Client, data: { aquariumId: string; passable: boolean }) => {
        const auth = this.clientAuthMap.get(client.sessionId);
        const user = auth?.user;
        const isSuperadmin = user?.role === "superadmin";
        const isOwner = this.isSpaceOwnerOrCoOwner(user);

        if (!isSuperadmin && !isOwner) {
          client.send("ERROR", {
            message:
              "Permission denied: Only space owner or superadmin can update an aquarium.",
          });
          return;
        }

        const aq = this.aquariums.get(data.aquariumId);
        if (aq) {
          aq.passable = Boolean(data.passable);
          this.invalidatePixelCollisionChecker();
          this.broadcast("AQUARIUM_UPDATED", aq);
          await this.persistAquariums();
        }
      }
    );

    // --- Seller NPC (Asset Shop Counter) Handlers (Superadmin only) ---

    this.onMessage(
      "SELLER_NPC_SET",
      async (client: Client, data: SellerNpcPlacePayload) => {
        const auth = this.clientAuthMap.get(client.sessionId);
        const user = auth?.user;
        if (user?.role !== "superadmin") {
          client.send("ERROR", {
            message: "Permission denied: Only superadmin can place or configure Seller NPCs.",
          });
          return;
        }
        if (!data || typeof data.x !== "number" || typeof data.y !== "number") return;

        const clampedX = Math.max(64, Math.min(WORLD_WIDTH - 64, Math.round(data.x)));
        const clampedY = Math.max(48, Math.min(WORLD_HEIGHT - 80, Math.round(data.y)));
        const nextNpc: SellerNpcState = {
          id: this.sellerNpc?.id || `seller_${this.spaceId}`,
          spaceId: this.spaceId,
          x: clampedX,
          y: clampedY,
          name:
            typeof data.name === "string" && data.name.trim().length > 0
              ? data.name.trim().slice(0, 40)
              : this.sellerNpc?.name,
          spriteKey: isValidSellerNpcSpriteKey(data.spriteKey)
            ? data.spriteKey
            : this.sellerNpc?.spriteKey,
          shopTheme: isValidAssetShopTheme(data.shopTheme)
            ? data.shopTheme
            : this.sellerNpc?.shopTheme || "auto",
          showCounter:
            data.showCounter !== undefined
              ? Boolean(data.showCounter)
              : this.sellerNpc?.showCounter !== false,
          enabled: true,
          layer: typeof data.layer === "number" ? Math.round(data.layer) : this.sellerNpc?.layer ?? 0,
        };
        this.sellerNpc = nextNpc;
        this.invalidatePixelCollisionChecker();
        this.broadcast("SELLER_NPC_UPDATED", this.resolveSellerNpcForBroadcast());
        await this.persistSellerNpc();
      }
    );

    this.onMessage(
      "SELLER_NPC_MOVE",
      async (client: Client, data: SellerNpcMovePayload) => {
        const auth = this.clientAuthMap.get(client.sessionId);
        const user = auth?.user;
        if (user?.role !== "superadmin") {
          client.send("ERROR", {
            message: "Permission denied: Only superadmin can move the Seller NPC.",
          });
          return;
        }
        if (!this.sellerNpc || typeof data?.x !== "number" || typeof data?.y !== "number") return;

        this.sellerNpc.x = Math.max(64, Math.min(WORLD_WIDTH - 64, Math.round(data.x)));
        this.sellerNpc.y = Math.max(48, Math.min(WORLD_HEIGHT - 80, Math.round(data.y)));
        this.sellerNpc.enabled = true;
        this.invalidatePixelCollisionChecker();
        this.broadcast("SELLER_NPC_UPDATED", this.resolveSellerNpcForBroadcast());
        await this.persistSellerNpc();
      }
    );

    this.onMessage(
      "SELLER_NPC_UPDATE",
      async (client: Client, data: SellerNpcUpdatePayload) => {
        const auth = this.clientAuthMap.get(client.sessionId);
        const user = auth?.user;
        if (user?.role !== "superadmin") {
          client.send("ERROR", {
            message: "Permission denied: Only superadmin can update the Seller NPC.",
          });
          return;
        }
        if (!this.sellerNpc || !data || typeof data !== "object") return;

        if (data.name !== undefined) {
          const cleanName = typeof data.name === "string" ? data.name.trim().slice(0, 40) : "";
          this.sellerNpc.name = cleanName.length > 0 ? cleanName : undefined;
        }
        if (data.spriteKey !== undefined) {
          this.sellerNpc.spriteKey = isValidSellerNpcSpriteKey(data.spriteKey)
            ? data.spriteKey
            : undefined;
        }
        if (data.shopTheme !== undefined && isValidAssetShopTheme(data.shopTheme)) {
          this.sellerNpc.shopTheme = data.shopTheme;
        }
        if (data.showCounter !== undefined) {
          this.sellerNpc.showCounter = Boolean(data.showCounter);
        }
        if (data.enabled !== undefined) {
          this.sellerNpc.enabled = Boolean(data.enabled);
        }
        if (typeof data.layer === "number" && Number.isFinite(data.layer)) {
          this.sellerNpc.layer = Math.round(data.layer);
        }
        this.invalidatePixelCollisionChecker();
        this.broadcast("SELLER_NPC_UPDATED", this.resolveSellerNpcForBroadcast());
        await this.persistSellerNpc();
      }
    );

    this.onMessage(
      "SELLER_NPC_DELETE",
      async (client: Client) => {
        const auth = this.clientAuthMap.get(client.sessionId);
        const user = auth?.user;
        if (user?.role !== "superadmin") {
          client.send("ERROR", {
            message: "Permission denied: Only superadmin can remove the Seller NPC.",
          });
          return;
        }
        if (!this.sellerNpc) return;

        this.sellerNpc.enabled = false;
        this.invalidatePixelCollisionChecker();
        this.broadcast("SELLER_NPC_UPDATED", null);
        await this.persistSellerNpc();
      }
    );

    // 5. Open Chess Lobby / View Games List
    this.onMessage(
      "CHESS_OPEN_LOBBY",
      (client: Client, data: { chessBoardId: string }) => {
        if (!data?.chessBoardId) return;
        let viewers = this.chessLobbyViewers.get(data.chessBoardId);
        if (!viewers) {
          viewers = new Set();
          this.chessLobbyViewers.set(data.chessBoardId, viewers);
        }
        viewers.add(client.sessionId);
        client.send("CHESS_LOBBY_STATE", this.getChessLobbyState(data.chessBoardId));
      }
    );

    // 6. Leave Chess Lobby
    this.onMessage(
      "CHESS_LEAVE_LOBBY",
      (client: Client, data: { chessBoardId: string }) => {
        if (!data?.chessBoardId) return;
        const viewers = this.chessLobbyViewers.get(data.chessBoardId);
        if (viewers) {
          viewers.delete(client.sessionId);
        }
      }
    );

    // 7. Create Match (explicitly host a waiting match)
    this.onMessage(
      "CHESS_CREATE_MATCH",
      (client: Client, data: ChessCreateMatchPayload) => {
        if (!data?.chessBoardId) return;
        const cbId = data.chessBoardId;
        const auth = this.clientAuthMap.get(client.sessionId);
        const name = auth?.user?.displayName || auth?.user?.username || "Player";
        const userId = auth?.user?.id;
        const avatarUrl = this.getPlayerAvatarUrl(client.sessionId);

        // If player already has a waiting match on this board, return early
        const existingMatchId = this.clientChessMatchMap.get(client.sessionId);
        if (existingMatchId) {
          const existingMatch = this.chessMatches.get(existingMatchId);
          if (existingMatch && existingMatch.status === "waiting") {
            if (existingMatch.chessBoardId === cbId) {
              return;
            } else {
              this.chessMatches.delete(existingMatchId);
              this.broadcastChessLobbyState(existingMatch.chessBoardId);
            }
          }
          this.clientChessMatchMap.delete(client.sessionId);
        }

        // Create new match in waiting state
        const matchId =
          "match_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
        const chess = new Chess();
        const newMatch = {
          matchId,
          chessBoardId: cbId,
          chess,
          whitePlayer: {
            sessionId: client.sessionId,
            userId,
            name,
            avatarUrl,
            color: "white" as const,
            isReady: true,
          },
          spectators: new Map<string, ChessGameSpectator>(),
          status: "waiting" as const,
          createdAt: Date.now(),
        };
        this.chessMatches.set(matchId, newMatch);
        this.clientChessMatchMap.set(client.sessionId, matchId);
        this.broadcastChessLobbyState(cbId);
      }
    );

    // 7b. Join Match (Queue / Matchmaking / Join specific waiting game)
    this.onMessage(
      "CHESS_JOIN_MATCH",
      (client: Client, data: ChessJoinMatchPayload) => {
        if (!data?.chessBoardId) return;
        const cbId = data.chessBoardId;
        const auth = this.clientAuthMap.get(client.sessionId);
        const name = auth?.user?.displayName || auth?.user?.username || "Player";
        const userId = auth?.user?.id;
        const avatarUrl = this.getPlayerAvatarUrl(client.sessionId);

        // If player had a stale or waiting queue match, clean it up
        const existingMatchId = this.clientChessMatchMap.get(client.sessionId);
        if (existingMatchId) {
          const existingMatch = this.chessMatches.get(existingMatchId);
          if (existingMatch && existingMatch.status === "waiting") {
            if (existingMatch.chessBoardId === cbId && !data.matchId && !data.createOnly) {
              return;
            } else {
              this.chessMatches.delete(existingMatchId);
              this.broadcastChessLobbyState(existingMatch.chessBoardId);
            }
          }
          this.clientChessMatchMap.delete(client.sessionId);
        }

        // Look for waiting match on this board where player != client
        let targetMatch: any = null;
        if (data.matchId) {
          const m = this.chessMatches.get(data.matchId);
          if (m && m.status === "waiting" && m.whitePlayer?.sessionId !== client.sessionId) {
            targetMatch = m;
          } else {
            // Match no longer waiting or invalid
            this.broadcastChessLobbyState(cbId);
            return;
          }
        } else if (!data.createOnly) {
          for (const match of this.chessMatches.values()) {
            if (
              match.chessBoardId === cbId &&
              match.status === "waiting" &&
              match.whitePlayer?.sessionId !== client.sessionId
            ) {
              targetMatch = match;
              break;
            }
          }
        }

        if (targetMatch) {
          // Second player joins -> create & start game!
          targetMatch.blackPlayer = {
            sessionId: client.sessionId,
            userId,
            name,
            avatarUrl,
            color: "black",
            isReady: true,
          };
          targetMatch.status = "playing";
          this.clientChessMatchMap.set(client.sessionId, targetMatch.matchId);

          const gameState = this.buildChessGameState(targetMatch);
          this.broadcastChessGameState(targetMatch.matchId, "CHESS_GAME_START", gameState);
          this.broadcastChessLobbyState(cbId);
        } else {
          // Create new match in waiting state
          const matchId =
            "match_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
          const chess = new Chess();
          const newMatch = {
            matchId,
            chessBoardId: cbId,
            chess,
            whitePlayer: {
              sessionId: client.sessionId,
              userId,
              name,
              avatarUrl,
              color: "white" as const,
              isReady: true,
            },
            spectators: new Map<string, ChessGameSpectator>(),
            status: "waiting" as const,
            createdAt: Date.now(),
          };
          this.chessMatches.set(matchId, newMatch);
          this.clientChessMatchMap.set(client.sessionId, matchId);
          this.broadcastChessLobbyState(cbId);
        }
      }
    );

    // 8. Cancel Queue / Join
    this.onMessage(
      "CHESS_CANCEL_JOIN",
      (client: Client, data: ChessCancelJoinPayload) => {
        const matchId = this.clientChessMatchMap.get(client.sessionId);
        if (matchId) {
          const match = this.chessMatches.get(matchId);
          if (
            match &&
            match.status === "waiting" &&
            match.whitePlayer?.sessionId === client.sessionId
          ) {
            this.chessMatches.delete(matchId);
            this.clientChessMatchMap.delete(client.sessionId);
            this.broadcastChessLobbyState(data.chessBoardId);
          }
        }
      }
    );

    // 9. Spectate Match
    this.onMessage(
      "CHESS_SPECTATE_MATCH",
      (client: Client, data: ChessSpectateMatchPayload) => {
        if (!data?.matchId) return;
        const match = this.chessMatches.get(data.matchId);
        if (!match || match.status !== "playing") return;

        const auth = this.clientAuthMap.get(client.sessionId);
        const name = auth?.user?.displayName || auth?.user?.username || "Spectator";
        const userId = auth?.user?.id;
        const avatarUrl = this.getPlayerAvatarUrl(client.sessionId);

        match.spectators.set(client.sessionId, {
          sessionId: client.sessionId,
          userId,
          name,
          avatarUrl,
          joinedAt: Date.now(),
        });
        this.clientChessMatchMap.set(client.sessionId, match.matchId);

        const gameState = this.buildChessGameState(match);
        client.send("CHESS_GAME_START", gameState);
        this.broadcastChessGameState(match.matchId, "CHESS_GAME_STATE", gameState);
        this.broadcastChessLobbyState(data.chessBoardId);
      }
    );

    // 10. Leave Match
    this.onMessage(
      "CHESS_LEAVE_MATCH",
      (client: Client, data: ChessLeaveMatchPayload) => {
        const match = this.chessMatches.get(data?.matchId);
        if (!match) return;

        if (match.spectators.has(client.sessionId)) {
          match.spectators.delete(client.sessionId);
          this.clientChessMatchMap.delete(client.sessionId);
          const gameState = this.buildChessGameState(match);
          this.broadcastChessGameState(match.matchId, "CHESS_GAME_STATE", gameState);
          this.broadcastChessLobbyState(data.chessBoardId);
          return;
        }

        if (
          match.whitePlayer?.sessionId === client.sessionId ||
          match.blackPlayer?.sessionId === client.sessionId
        ) {
          if (match.status === "waiting") {
            this.chessMatches.delete(match.matchId);
            this.clientChessMatchMap.delete(client.sessionId);
            this.broadcastChessLobbyState(data.chessBoardId);
          } else if (match.status === "playing") {
            const isWhite = match.whitePlayer?.sessionId === client.sessionId;
            const leaverName = isWhite
              ? (match.whitePlayer?.name || "White")
              : (match.blackPlayer?.name || "Black");
            const winnerColor: ChessPieceColor = isWhite ? "black" : "white";
            const winnerPlayer = isWhite ? match.blackPlayer : match.whitePlayer;
            const winnerName = winnerPlayer?.name || (winnerColor === "white" ? "White" : "Black");

            match.status = "resigned";
            match.winner = winnerColor;
            match.winReason = `${leaverName} left the game. ${winnerName} wins by forfeit!`;

            if (match.whitePlayer?.sessionId) {
              this.clientChessMatchMap.delete(match.whitePlayer.sessionId);
            }
            if (match.blackPlayer?.sessionId) {
              this.clientChessMatchMap.delete(match.blackPlayer.sessionId);
            }

            const gameState = this.buildChessGameState(match);
            this.broadcastChessGameState(match.matchId, "CHESS_GAME_ENDED", gameState);
            this.broadcastChessLobbyState(data.chessBoardId);

            setTimeout(() => {
              this.chessMatches.delete(match.matchId);
            }, 10000);
          } else {
            this.clientChessMatchMap.delete(client.sessionId);
          }
        }
      }
    );

    // 11. Chess Move
    this.onMessage(
      "CHESS_MOVE",
      (client: Client, data: ChessMovePayload) => {
        if (!data?.matchId) return;
        const match = this.chessMatches.get(data.matchId);
        if (!match || match.status !== "playing") return;

        const isWhite = match.whitePlayer?.sessionId === client.sessionId;
        const isBlack = match.blackPlayer?.sessionId === client.sessionId;
        if (!isWhite && !isBlack) return;

        const currentTurn = match.chess.turn() === "w" ? "white" : "black";
        if ((isWhite && currentTurn !== "white") || (isBlack && currentTurn !== "black")) {
          return;
        }

        try {
          const move = match.chess.move({
            from: data.from,
            to: data.to,
            promotion: data.promotion || "q",
          });

          if (!move) return;

          match.lastMove = {
            from: move.from,
            to: move.to,
            san: move.san,
          };

          if (match.chess.isGameOver()) {
            if (match.chess.isCheckmate()) {
              match.status = "checkmate";
              match.winner = currentTurn;
              match.winReason = `Checkmate! ${
                currentTurn === "white" ? match.whitePlayer?.name : match.blackPlayer?.name
              } wins!`;
            } else if (match.chess.isDraw()) {
              match.status = "draw";
              match.winner = "draw";
              if (match.chess.isStalemate()) {
                match.winReason = "Draw by Stalemate";
              } else if (match.chess.isThreefoldRepetition()) {
                match.winReason = "Draw by Threefold Repetition";
              } else if (match.chess.isInsufficientMaterial()) {
                match.winReason = "Draw by Insufficient Material";
              } else {
                match.winReason = "Draw by 50-move rule";
              }
            }

            if (match.whitePlayer?.sessionId) {
              this.clientChessMatchMap.delete(match.whitePlayer.sessionId);
            }
            if (match.blackPlayer?.sessionId) {
              this.clientChessMatchMap.delete(match.blackPlayer.sessionId);
            }
            setTimeout(() => {
              this.chessMatches.delete(match.matchId);
            }, 10000);
          }

          const gameState = this.buildChessGameState(match);
          this.broadcastChessGameState(
            match.matchId,
            match.chess.isGameOver() ? "CHESS_GAME_ENDED" : "CHESS_GAME_STATE",
            gameState
          );
          this.broadcastChessLobbyState(match.chessBoardId);
        } catch (err) {
          console.warn("[GameRoom] Invalid chess move:", err);
        }
      }
    );

    // 12. Resign
    this.onMessage(
      "CHESS_RESIGN",
      (client: Client, data: ChessResignPayload) => {
        if (!data?.matchId) return;
        const match = this.chessMatches.get(data.matchId);
        if (!match || match.status !== "playing") return;

        const isWhite = match.whitePlayer?.sessionId === client.sessionId;
        const isBlack = match.blackPlayer?.sessionId === client.sessionId;
        if (!isWhite && !isBlack) return;

        match.status = "resigned";
        match.winner = isWhite ? "black" : "white";
        match.winReason = `${
          isWhite ? match.whitePlayer?.name : match.blackPlayer?.name
        } resigned`;

        if (match.whitePlayer?.sessionId) {
          this.clientChessMatchMap.delete(match.whitePlayer.sessionId);
        }
        if (match.blackPlayer?.sessionId) {
          this.clientChessMatchMap.delete(match.blackPlayer.sessionId);
        }

        const gameState = this.buildChessGameState(match);
        this.broadcastChessGameState(match.matchId, "CHESS_GAME_ENDED", gameState);
        this.broadcastChessLobbyState(match.chessBoardId);

        setTimeout(() => {
          this.chessMatches.delete(match.matchId);
        }, 10000);
      }
    );

    // 13. Offer Draw
    this.onMessage(
      "CHESS_OFFER_DRAW",
      (client: Client, data: ChessOfferDrawPayload) => {
        if (!data?.matchId) return;
        const match = this.chessMatches.get(data.matchId);
        if (!match || match.status !== "playing") return;

        const isWhite = match.whitePlayer?.sessionId === client.sessionId;
        const isBlack = match.blackPlayer?.sessionId === client.sessionId;
        if (!isWhite && !isBlack) return;

        const color = isWhite ? "white" : "black";
        if (!match.drawOffer) {
          match.drawOffer = color;
          const gameState = this.buildChessGameState(match);
          this.broadcastChessGameState(match.matchId, "CHESS_GAME_STATE", gameState);
        } else if (match.drawOffer !== color) {
          match.status = "draw";
          match.winner = "draw";
          match.winReason = "Draw agreed";
          match.drawOffer = null;

          if (match.whitePlayer?.sessionId) {
            this.clientChessMatchMap.delete(match.whitePlayer.sessionId);
          }
          if (match.blackPlayer?.sessionId) {
            this.clientChessMatchMap.delete(match.blackPlayer.sessionId);
          }

          const gameState = this.buildChessGameState(match);
          this.broadcastChessGameState(match.matchId, "CHESS_GAME_ENDED", gameState);
          this.broadcastChessLobbyState(match.chessBoardId);

          setTimeout(() => {
            this.chessMatches.delete(match.matchId);
          }, 10000);
        }
      }
    );

    // 14. Rematch
    this.onMessage(
      "CHESS_REMATCH",
      (client: Client, data: ChessRematchPayload) => {
        if (!data?.matchId) return;
        const match = this.chessMatches.get(data.matchId);
        if (!match || match.status === "waiting" || match.status === "playing") return;
        if (!match.whitePlayer || !match.blackPlayer) return;

        const oldWhite = match.whitePlayer;
        const oldBlack = match.blackPlayer;

        match.chess = new Chess();
        match.whitePlayer = { ...oldBlack, color: "white" };
        match.blackPlayer = { ...oldWhite, color: "black" };
        match.status = "playing";
        match.winner = undefined;
        match.winReason = undefined;
        match.drawOffer = null;
        match.lastMove = undefined;
        match.createdAt = Date.now();

        const gameState = this.buildChessGameState(match);
        this.broadcastChessGameState(match.matchId, "CHESS_GAME_START", gameState);
        this.broadcastChessLobbyState(match.chessBoardId);
      }
    );

    // ==========================================
    // THROW BATTLE (Fleabag vs Mutt / Cat vs Dog)
    // ==========================================

    // 1. Challenge Player
    this.onMessage(
      "THROW_BATTLE_CHALLENGE",
      (client: Client, data: ThrowBattleChallengePayload) => {
        const challengerSessionId = client.sessionId;
        const targetSessionId = data?.targetSessionId;
        if (!targetSessionId || challengerSessionId === targetSessionId) return;

        const challengerPlayer = this.state.players.get(challengerSessionId);
        const targetPlayer = this.state.players.get(targetSessionId);
        const targetClient = this.clients.find((c) => c.sessionId === targetSessionId);

        if (!challengerPlayer || !targetPlayer || !targetClient) {
          client.send("THROW_BATTLE_ERROR", { message: "Player is not available." });
          return;
        }

        if (this.clientThrowBattleMatchMap.has(targetSessionId)) {
          client.send("THROW_BATTLE_ERROR", {
            message: `${targetPlayer.name} is currently in a Throw Battle.`,
          });
          return;
        }

        if (this.clientThrowBattleMatchMap.has(challengerSessionId)) {
          client.send("THROW_BATTLE_ERROR", {
            message: "You are already in an active Throw Battle.",
          });
          return;
        }

        const hits = Math.min(
          100,
          Math.max(1, typeof data?.hits === "number" ? Math.round(data.hits) : 20)
        );

        this.pendingThrowBattleChallenges.set(targetSessionId, {
          challengerSessionId,
          targetSessionId,
          hits,
          createdAt: Date.now(),
        });

        client.send("THROW_BATTLE_CHALLENGE_SENT", {
          targetSessionId,
          targetName: targetPlayer.name || "Player",
          hits,
        });

        targetClient.send("THROW_BATTLE_INVITED", {
          challengerSessionId,
          challengerName: challengerPlayer.name || "Player",
          challengerColor: challengerPlayer.color || "#3b82f6",
          challengerAvatar: this.getPlayerAvatarUrl(challengerSessionId),
          hits,
        });
      }
    );

    // 2. Cancel Challenge
    this.onMessage(
      "THROW_BATTLE_CANCEL_CHALLENGE",
      (client: Client, data: { targetSessionId: string }) => {
        const targetSessionId = data?.targetSessionId;
        if (!targetSessionId) return;

        const challenge = this.pendingThrowBattleChallenges.get(targetSessionId);
        if (challenge && challenge.challengerSessionId === client.sessionId) {
          this.pendingThrowBattleChallenges.delete(targetSessionId);
          const targetClient = this.clients.find((c) => c.sessionId === targetSessionId);
          if (targetClient) {
            targetClient.send("THROW_BATTLE_CHALLENGE_CANCELLED", {
              challengerSessionId: client.sessionId,
            });
          }
        }
      }
    );

    // 3. Reject Challenge
    this.onMessage(
      "THROW_BATTLE_REJECT",
      (client: Client, data: { challengerSessionId: string }) => {
        const targetSessionId = client.sessionId;
        const challengerSessionId = data?.challengerSessionId;
        if (!challengerSessionId) return;

        const challenge = this.pendingThrowBattleChallenges.get(targetSessionId);
        if (challenge && challenge.challengerSessionId === challengerSessionId) {
          this.pendingThrowBattleChallenges.delete(targetSessionId);
        }

        const targetPlayer = this.state.players.get(targetSessionId);
        const challengerClient = this.clients.find((c) => c.sessionId === challengerSessionId);
        if (challengerClient) {
          challengerClient.send("THROW_BATTLE_REJECTED", {
            targetSessionId,
            targetName: targetPlayer?.name || "Player",
          });
        }
      }
    );

    // 4. Accept Challenge & Start Game
    this.onMessage(
      "THROW_BATTLE_ACCEPT",
      (client: Client, data: { challengerSessionId: string }) => {
        const targetSessionId = client.sessionId; // Challenged player!
        const challengerSessionId = data?.challengerSessionId; // Challenger!
        if (!challengerSessionId) return;

        const challenge = this.pendingThrowBattleChallenges.get(targetSessionId);
        const matchHits = challenge?.hits && challenge.hits > 0 ? challenge.hits : 20;
        this.pendingThrowBattleChallenges.delete(targetSessionId);

        const targetPlayer = this.state.players.get(targetSessionId);
        const challengerPlayer = this.state.players.get(challengerSessionId);
        const challengerClient = this.clients.find((c) => c.sessionId === challengerSessionId);

        if (!targetPlayer || !challengerPlayer || !challengerClient) {
          client.send("THROW_BATTLE_ERROR", { message: "Challenger is no longer available." });
          return;
        }

        // Clean up any old matches for both sessions
        this.handleThrowBattleLeave(targetSessionId);
        this.handleThrowBattleLeave(challengerSessionId);

        const matchId = `tb_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const initialWind = Math.round((Math.random() * 14 - 7) * 10) / 10;

        // Requirement: "to make it fair, player who got challenged will move first."
        // Player 1 is target (challenged player), placed on Left side, moves first!
        // Player 2 is challenger, placed on Right side.
        const match = {
          matchId,
          status: "playing" as const,
          player1: {
            sessionId: targetSessionId,
            name: targetPlayer.name || "Player 1",
            color: targetPlayer.color || "#3b82f6",
            avatarUrl: this.getPlayerAvatarUrl(targetSessionId),
            side: "left" as const,
            x: 140,
            hp: matchHits,
            maxHp: matchHits,
          },
          player2: {
            sessionId: challengerSessionId,
            name: challengerPlayer.name || "Player 2",
            color: challengerPlayer.color || "#ef4444",
            avatarUrl: this.getPlayerAvatarUrl(challengerSessionId),
            side: "right" as const,
            x: 660,
            hp: matchHits,
            maxHp: matchHits,
          },
          currentTurn: targetSessionId, // Challenged player moves first!
          turnPhase: "move" as ThrowBattleTurnPhase,
          wind: initialWind,
          round: 1,
          rematchRequests: new Set<string>(),
        };

        this.throwBattleMatches.set(matchId, match);
        this.clientThrowBattleMatchMap.set(targetSessionId, matchId);
        this.clientThrowBattleMatchMap.set(challengerSessionId, matchId);

        const battleState: ThrowBattleState = {
          matchId: match.matchId,
          status: match.status,
          player1: match.player1,
          player2: match.player2,
          currentTurn: match.currentTurn,
          turnPhase: match.turnPhase,
          wind: match.wind,
          round: match.round,
        };

        client.send("THROW_BATTLE_START", battleState);
        challengerClient.send("THROW_BATTLE_START", battleState);
      }
    );

    // 5. Active Player Movement
    this.onMessage(
      "THROW_BATTLE_MOVE",
      (client: Client, data: ThrowBattleMovePayload) => {
        if (!data?.matchId) return;
        const match = this.throwBattleMatches.get(data.matchId);
        if (!match || match.status !== "playing") return;
        if (match.currentTurn !== client.sessionId || match.turnPhase !== "move") return;

        if (match.player1.sessionId === client.sessionId) {
          match.player1.x = Math.max(45, Math.min(353, data.x));
        } else if (match.player2.sessionId === client.sessionId) {
          match.player2.x = Math.max(447, Math.min(755, data.x));
        }

        const opponentSid =
          match.player1.sessionId === client.sessionId
            ? match.player2.sessionId
            : match.player1.sessionId;
        const oppClient = this.clients.find((c) => c.sessionId === opponentSid);
        if (oppClient) {
          oppClient.send("THROW_BATTLE_PLAYER_MOVED", {
            matchId: match.matchId,
            sessionId: client.sessionId,
            x: data.x,
          });
        }
      }
    );

    // 6. Enter Angle Mode
    this.onMessage(
      "THROW_BATTLE_ENTER_ANGLE",
      (client: Client, data: ThrowBattleEnterAnglePayload) => {
        if (!data?.matchId) return;
        const match = this.throwBattleMatches.get(data.matchId);
        if (!match || match.status !== "playing") return;
        if (match.currentTurn !== client.sessionId) return;

        match.turnPhase = "angle";
        if (match.player1.sessionId === client.sessionId) match.player1.x = data.x;
        else if (match.player2.sessionId === client.sessionId) match.player2.x = data.x;

        this.broadcastThrowBattleEvent(match.matchId, "THROW_BATTLE_ANGLE_STARTED", {
          matchId: match.matchId,
          sessionId: client.sessionId,
          x: data.x,
        });
      }
    );

    // 7. Lock Angle Mode
    this.onMessage(
      "THROW_BATTLE_LOCK_ANGLE",
      (client: Client, data: ThrowBattleLockAnglePayload) => {
        if (!data?.matchId) return;
        const match = this.throwBattleMatches.get(data.matchId);
        if (!match || match.status !== "playing") return;
        if (match.currentTurn !== client.sessionId) return;

        match.turnPhase = "power";
        match.lockedAngle = data.angle;

        this.broadcastThrowBattleEvent(match.matchId, "THROW_BATTLE_POWER_STARTED", {
          matchId: match.matchId,
          sessionId: client.sessionId,
          angle: data.angle,
        });
      }
    );

    // 8. Throw Projectile
    this.onMessage(
      "THROW_BATTLE_THROW",
      (client: Client, data: ThrowBattleThrowPayload) => {
        if (!data?.matchId) return;
        const match = this.throwBattleMatches.get(data.matchId);
        if (!match || match.status !== "playing") return;
        if (match.currentTurn !== client.sessionId) return;

        match.turnPhase = "throw";
        match.lockedPower = data.power;

        this.broadcastThrowBattleEvent(match.matchId, "THROW_BATTLE_THROWN", {
          matchId: match.matchId,
          sessionId: client.sessionId,
          angle: data.angle,
          power: data.power,
          wind: match.wind,
          projectileType: data.projectileType,
        });
      }
    );

    // 9. Turn Result & Advance
    this.onMessage(
      "THROW_BATTLE_TURN_RESULT",
      (client: Client, data: ThrowBattleTurnResultPayload) => {
        if (!data?.matchId) return;
        const match = this.throwBattleMatches.get(data.matchId);
        if (!match || match.status !== "playing") return;

        match.player1.hp = data.p1Hp;
        match.player2.hp = data.p2Hp;

        if (data.winnerSessionId || match.player1.hp <= 0 || match.player2.hp <= 0) {
          match.status = "ended";
          match.winnerSessionId =
            data.winnerSessionId ||
            (match.player1.hp <= 0 ? match.player2.sessionId : match.player1.sessionId);

          this.broadcastThrowBattleEvent(match.matchId, "THROW_BATTLE_GAME_OVER", {
            matchId: match.matchId,
            winnerSessionId: match.winnerSessionId,
            p1Hp: match.player1.hp,
            p2Hp: match.player2.hp,
          });
        } else {
          // Switch turn to next player!
          match.currentTurn =
            match.currentTurn === match.player1.sessionId
              ? match.player2.sessionId
              : match.player1.sessionId;
          match.turnPhase = "move";
          match.round += 1;
          match.lockedAngle = undefined;
          match.lockedPower = undefined;
          match.wind = Math.round((Math.random() * 14 - 7) * 10) / 10;

          this.broadcastThrowBattleEvent(match.matchId, "THROW_BATTLE_NEXT_TURN", {
            matchId: match.matchId,
            currentTurn: match.currentTurn,
            wind: match.wind,
            round: match.round,
            p1Hp: match.player1.hp,
            p2Hp: match.player2.hp,
            p1X: match.player1.x,
            p2X: match.player2.x,
          });
        }
      }
    );

    // 10. Rematch
    this.onMessage(
      "THROW_BATTLE_REMATCH",
      (client: Client, data: ThrowBattleRematchPayload) => {
        if (!data?.matchId) return;
        const match = this.throwBattleMatches.get(data.matchId);
        if (!match) return;

        match.player1.hp = match.player1.maxHp || 20;
        match.player2.hp = match.player2.maxHp || 20;
        match.player1.x = 140;
        match.player2.x = 660;
        match.status = "playing";
        match.round = 1;
        match.turnPhase = "move";
        match.lockedAngle = undefined;
        match.lockedPower = undefined;
        match.winnerSessionId = null;
        match.wind = Math.round((Math.random() * 14 - 7) * 10) / 10;
        match.currentTurn = match.player1.sessionId;

        const battleState: ThrowBattleState = {
          matchId: match.matchId,
          status: match.status,
          player1: match.player1,
          player2: match.player2,
          currentTurn: match.currentTurn,
          turnPhase: match.turnPhase,
          wind: match.wind,
          round: match.round,
        };

        this.broadcastThrowBattleEvent(match.matchId, "THROW_BATTLE_START", battleState);
      }
    );

    // 11. Leave Battle
    this.onMessage(
      "THROW_BATTLE_LEAVE",
      (client: Client, data: ThrowBattleLeavePayload) => {
        this.handleThrowBattleLeave(client.sessionId);
      }
    );


    // Handle chat messages from clients
    this.onMessage(
      "SEND_CHAT_MESSAGE",
      async (client: Client, data: SendChatMessagePayload) => {
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

          let targetPlayer = this.state.players.get(targetSessionId);
          let targetClient = this.clients.find(
            (c) => c.sessionId === targetSessionId,
          );

          // Cross-room whisper lookup if target is in another space
          if (!targetPlayer || !targetClient) {
            const remoteSession = focusPointsService.findSessionBySessionId(targetSessionId);
            if (remoteSession) {
              targetPlayer = remoteSession.playerState;
              targetClient = remoteSession.client;
            }
          }

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
              text: `Player "${data.targetName || "User"}" is no longer online.`,
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

          // Persist whisper chat message to DB
          saveChatMessage(chatMsg).catch((err) =>
            console.error("Error saving whisper message to DB:", err)
          );
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

          // Persist zone chat message to DB
          saveChatMessage(chatMsg).catch((err) =>
            console.error("Error saving zone message to DB:", err)
          );
        } else if (data.roomType === "org") {
          const userId = auth?.user?.id;
          const orgId = Number(data.roomId);
          if (!userId || !Number.isInteger(orgId) || orgId <= 0) return;

          const org = await getOrganisationById(orgId);
          if (!org || !org.members.some((m) => m.userId === userId)) {
            return;
          }

          const chatMsg: ChatMessage = {
            id: msgId,
            senderId: client.sessionId,
            senderName: player.name,
            senderColor: player.color,
            isSuperadmin,
            roomType: "org",
            roomId: String(org.id),
            roomName: org.name,
            text: cleanText,
            timestamp,
          };

          const deliveredSessionIds = new Set<string>();
          for (const member of org.members) {
            const session = focusPointsService.getOnlineSessionForUser(member.userId);
            if (session && session.client && !deliveredSessionIds.has(session.sessionId)) {
              deliveredSessionIds.add(session.sessionId);
              session.client.send("CHAT_MESSAGE", chatMsg);
            }
          }
          if (!deliveredSessionIds.has(client.sessionId)) {
            client.send("CHAT_MESSAGE", chatMsg);
          }

          saveChatMessage(chatMsg).catch((err) =>
            console.error("Error saving org message to DB:", err)
          );
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

          this.recentChatMessages.push(chatMsg);
          if (this.recentChatMessages.length > 50) {
            this.recentChatMessages.shift();
          }

          this.broadcast("CHAT_MESSAGE", chatMsg);

          // Persist map chat message to DB
          saveChatMessage(chatMsg).catch((err) =>
            console.error("Error saving map message to DB:", err)
          );
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

    // ==========================================
    // Focus Room (Pomodoro) & Squad Message Handlers
    // ==========================================

    this.onMessage("FOCUS_ROOM_START", async (client: Client, data: FocusRoomStartPayload) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      await focusSessionService.startOrJoinFocusRoom({
        userId: player.userId,
        colyseusSessionId: client.sessionId,
        room: this,
        playerState: player,
        payload: data,
      });
    });

    this.onMessage(
      "FOCUS_ROOM_UPDATE_SETTINGS",
      (client: Client, data: FocusRoomUpdateSettingsPayload) => {
        const player = this.state.players.get(client.sessionId);
        if (!player) return;
        const res = focusSessionService.updateSettings(player.userId, client.sessionId, data || {});
        if (!res.success && res.error) {
          client.send("FOCUS_NOTICE", { type: "warning", message: res.error });
        }
      },
    );

    this.onMessage("FOCUS_ROOM_VISIBILITY", (client: Client, data: FocusRoomVisibilityPayload) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      focusSessionService.reportVisibility(player.userId, client.sessionId, !!data?.hidden);
    });

    this.onMessage("FOCUS_ROOM_END_EARLY", async (client: Client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      await focusSessionService.endEarly(player.userId, client.sessionId);
    });

    this.onMessage("FOCUS_ROOM_EXIT", (client: Client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      focusSessionService.exitRoom(player.userId, client.sessionId);
    });

    this.onMessage("SQUAD_CREATE", async (client: Client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      const res = await squadService.createSquad(player.userId);
      if (!res.success && res.error) {
        client.send("SQUAD_NOTICE", { type: "warning", message: res.error });
      }
    });

    this.onMessage("SQUAD_INVITE", async (client: Client, data: SquadInvitePayload) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      let targetUserId = Number(data?.targetUserId || 0);
      if ((!targetUserId || targetUserId <= 0) && data?.targetSessionId) {
        const targetPlayer = this.state.players.get(data.targetSessionId);
        if (targetPlayer && targetPlayer.userId > 0) {
          targetUserId = targetPlayer.userId;
        } else {
          const remote = focusPointsService.findSessionBySessionId(data.targetSessionId);
          if (remote && remote.userId > 0) {
            targetUserId = remote.userId;
          }
        }
      }

      const res = await squadService.invitePlayer(player.userId, targetUserId);
      if (!res.success) {
        client.send("SQUAD_NOTICE", { type: "warning", message: res.error || "Could not send squad invite." });
      } else {
        client.send("SQUAD_NOTICE", { type: "info", message: "Party invite sent!" });
      }
    });

    this.onMessage("SQUAD_INVITE_RESPOND", async (client: Client, data: SquadInviteRespondPayload) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      const res = await squadService.respondToInvite(
        player.userId,
        Number(data?.fromUserId || 0),
        !!data?.accept,
      );
      if (!res.success && res.error) {
        client.send("SQUAD_NOTICE", { type: "warning", message: res.error });
      }
    });

    this.onMessage("SQUAD_LEAVE", (client: Client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      squadService.leaveSquad(player.userId, "left");
    });

    this.onMessage("SQUAD_KICK", (client: Client, data: SquadKickPayload) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      const res = squadService.kickMember(player.userId, Number(data?.targetUserId || 0));
      if (!res.success && res.error) {
        client.send("SQUAD_NOTICE", { type: "warning", message: res.error });
      }
    });

    this.onMessage("SQUAD_REQUEST_STATE", (client: Client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      client.send("SQUAD_STATE_UPDATED", {
        squad: player.userId > 0 ? squadService.getSquadStateForUser(player.userId) : null,
      });
    });

    // ==========================================
    // Netherworld Focus RPG Message Handlers
    // ==========================================

    this.onMessage("RPG_GET_STATE", async (client: Client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      const bundle = await rpgService.getFullClientBundle(player.userId);
      client.send("RPG_STATE_SYNC", bundle);
    });

    this.onMessage("RPG_CHOOSE_CLASS", async (client: Client, data: { classId: any }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      const res = await rpgService.chooseInitialClass(player.userId, data?.classId);
      if (!res.success) {
        client.send("RPG_ACTION_ERROR", { message: res.error || "Could not select class." });
        return;
      }
      if (res.profile) {
        player.rpgGearSignature = buildRpgGearSignature(res.profile.hero);
      }
      const bundle = await rpgService.getFullClientBundle(player.userId);
      client.send("RPG_CLASS_CHOSEN", bundle);
    });

    this.onMessage("RPG_TRAIN_HERO", async (client: Client, data: { fpAmount: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      const res = await rpgService.trainHeroWithFp(player.userId, Number(data?.fpAmount || 0));
      if (!res.success) {
        client.send("RPG_ACTION_ERROR", { message: res.error || "Training failed." });
        return;
      }
      client.send("RPG_PROFILE_UPDATED", {
        profile: res.profile,
        notice: `Hero trained! +${res.xpGained} XP`,
      });
    });

    this.onMessage(
      "RPG_REINCARNATE",
      async (client: Client, data: { nextClassId?: any; inheritedPassives?: string[] }) => {
        const player = this.state.players.get(client.sessionId);
        if (!player) return;
        const res = await rpgService.reincarnateHero(
          player.userId,
          data?.nextClassId,
          data?.inheritedPassives
        );
        if (!res.success) {
          client.send("RPG_ACTION_ERROR", { message: res.error || "Reincarnation failed." });
          return;
        }
        const alliedParty = res.profile ? await rpgService.assembleAlliedParty(player.userId, res.profile) : undefined;
        client.send("RPG_PROFILE_UPDATED", {
          profile: res.profile,
          alliedParty,
          notice: `Reincarnated! Earned +${res.karmaEarned} Karma & banked Stored Levels!`,
        });
      }
    );

    this.onMessage(
      "RPG_UPGRADE_KARMA",
      async (client: Client, data: { node: "aptitude" | "shopRank" | "focusEfficiency" | "dimensional" }) => {
        const player = this.state.players.get(client.sessionId);
        if (!player) return;
        const res = await rpgService.upgradeKarmaNode(player.userId, data?.node);
        if (!res.success) {
          client.send("RPG_ACTION_ERROR", { message: res.error || "Karma upgrade failed." });
          return;
        }
        client.send("RPG_PROFILE_UPDATED", {
          profile: res.profile,
          notice: "Karma Meta-Tree upgraded!",
        });
      }
    );

    this.onMessage(
      "RPG_BUY_GEAR",
      async (client: Client, data: { rank: number; slot: any; weaponType?: any }) => {
        const player = this.state.players.get(client.sessionId);
        if (!player) return;
        const res = await rpgService.buyShopEquipment(
          player.userId,
          Number(data?.rank || 1),
          data?.slot || "WEAPON",
          data?.weaponType
        );
        if (!res.success) {
          client.send("RPG_ACTION_ERROR", { message: res.error || "Purchase failed." });
          return;
        }
        client.send("RPG_PROFILE_UPDATED", {
          profile: res.profile,
          notice: `Purchased ${res.item?.name || "Equipment"}!`,
        });
      }
    );

    this.onMessage("RPG_EQUIP_ITEM", async (client: Client, data: { itemId: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      const res = await rpgService.equipItem(player.userId, data?.itemId);
      if (!res.success) {
        client.send("RPG_ACTION_ERROR", { message: res.error || "Equip failed." });
        return;
      }
      client.send("RPG_PROFILE_UPDATED", { profile: res.profile });
    });

    this.onMessage(
      "RPG_BLACKSMITH_RARITY",
      async (client: Client, data: { targetItemId: string; duplicateItemId: string }) => {
        const player = this.state.players.get(client.sessionId);
        if (!player) return;
        const res = await rpgService.campBlacksmithRarityFusion(
          player.userId,
          data?.targetItemId,
          data?.duplicateItemId
        );
        if (!res.success) {
          client.send("RPG_ACTION_ERROR", { message: res.error || "Rarity Fusion failed." });
          return;
        }
        client.send("RPG_PROFILE_UPDATED", {
          profile: res.profile,
          notice: "Blacksmith Rarity Fusion complete!",
        });
      }
    );

    this.onMessage(
      "RPG_BLACKSMITH_TRAIT",
      async (client: Client, data: { targetItemId: string; sourceItemId: string; traitId: string }) => {
        const player = this.state.players.get(client.sessionId);
        if (!player) return;
        const res = await rpgService.campBlacksmithTraitTransfer(
          player.userId,
          data?.targetItemId,
          data?.sourceItemId,
          data?.traitId
        );
        if (!res.success) {
          client.send("RPG_ACTION_ERROR", { message: res.error || "Trait Transfer failed." });
          return;
        }
        client.send("RPG_PROFILE_UPDATED", {
          profile: res.profile,
          notice: "Passive Trait transferred!",
        });
      }
    );

    this.onMessage("RPG_LAUNCH_EXPEDITION", async (client: Client, data: { itemId: string; floors: 10 | 50 }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      const res = await rpgService.launchExpedition(player.userId, data?.itemId, data?.floors === 50 ? 50 : 10);
      if (!res.success) {
        client.send("RPG_ACTION_ERROR", { message: res.error || "Expedition failed." });
        return;
      }
      client.send("RPG_EXPEDITION_RESULT", {
        profile: res.profile,
        expedition: res.expedition,
      });
    });

    this.onMessage(
      "RPG_MERGE_SPECIALISTS",
      async (client: Client, data: { specId1: string; specId2: string }) => {
        const player = this.state.players.get(client.sessionId);
        if (!player) return;
        const res = await rpgService.mergeWarehouseSpecialists(
          player.userId,
          data?.specId1,
          data?.specId2
        );
        if (!res.success) {
          client.send("RPG_ACTION_ERROR", { message: res.error || "Merge failed." });
          return;
        }
        client.send("RPG_PROFILE_UPDATED", {
          profile: res.profile,
          notice: "Specialists merged (+10% synergy bonus)!",
        });
      }
    );

    this.onMessage(
      "RPG_SOCKET_SPECIALIST",
      async (client: Client, data: { specId: string; targetItemId: string }) => {
        const player = this.state.players.get(client.sessionId);
        if (!player) return;
        const res = await rpgService.socketSpecialist(player.userId, data?.specId, data?.targetItemId);
        if (!res.success) {
          client.send("RPG_ACTION_ERROR", { message: res.error || "Socketing failed." });
          return;
        }
        client.send("RPG_PROFILE_UPDATED", {
          profile: res.profile,
          notice: "Specialist socketed into equipment!",
        });
      }
    );

    this.onMessage("RPG_UNLOCK_STAR_CAP", async (client: Client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      const res = await rpgService.unlockCheatStarCap(player.userId);
      if (!res.success) {
        client.send("RPG_ACTION_ERROR", { message: res.error || "Star cap unlock failed." });
        return;
      }
      client.send("RPG_PROFILE_UPDATED", {
        profile: res.profile,
        notice: `Cheat Shop Star Cap raised to ${res.profile?.cheatShop.starCap}★!`,
      });
    });

    this.onMessage("RPG_UPDATE_CHEAT_SHOP", async (client: Client, data: any) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      const res = await rpgService.updateCheatShop(player.userId, data || {});
      if (!res.success) {
        client.send("RPG_ACTION_ERROR", { message: res.error || "Cheat Shop update failed." });
        return;
      }
      client.send("RPG_PROFILE_UPDATED", {
        profile: res.profile,
        notice: "Cheat Shop settings saved!",
      });
    });

    this.onMessage("RPG_UPDATE_TACTICS", async (client: Client, data: any) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      const res = await rpgService.updateHeroTactics(player.userId, data || {});
      if (!res.success) {
        client.send("RPG_ACTION_ERROR", { message: res.error || "Tactics update failed." });
        return;
      }
      client.send("RPG_PROFILE_UPDATED", {
        profile: res.profile,
        alliedParty: res.alliedParty,
        notice: "Hero stance & Demonic AI saved!",
      });
    });

    this.onMessage("RPG_CLAIM_CAMP_INBOX", async (client: Client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      const res = await rpgService.claimCampInbox(player.userId);
      if (!res.success) {
        client.send("RPG_ACTION_ERROR", { message: res.error || "Camp Inbox empty." });
        return;
      }
      client.send("RPG_PROFILE_UPDATED", {
        profile: res.profile,
        notice: `Claimed +${res.claimedFp || 0} FP & +${res.claimedKarma || 0} Assist Karma!`,
      });
    });

    this.onMessage("RPG_LIVE_CHEER", async (client: Client, data: { targetUserId: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      const res = await rpgService.sendLiveSquadCheer(
        player.userId,
        player.name || "Squadmate",
        Number(data?.targetUserId || 0)
      );
      if (!res.success) {
        client.send("RPG_ACTION_ERROR", { message: res.error || "Cheer failed." });
        return;
      }
      client.send("RPG_PROFILE_UPDATED", {
        notice: "Sent +20% Crit Damage Cheer surge to squadmate!",
      });
    });

    this.onMessage("RPG_POST_TRADE", async (client: Client, data: any) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      const res = await rpgService.postTradeOffer(player.userId, data || {});
      if (!res.success) {
        client.send("RPG_ACTION_ERROR", { message: res.error || "Could not post barter offer." });
        return;
      }
      client.send("RPG_BARTER_UPDATED", { offers: res.offers, profile: res.profile });
    });

    this.onMessage("RPG_ACCEPT_TRADE", async (client: Client, data: { offerId: string; offeredBackItemId: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      const res = await rpgService.acceptTradeOffer(player.userId, data?.offerId, data?.offeredBackItemId);
      if (!res.success) {
        client.send("RPG_ACTION_ERROR", { message: res.error || "Could not complete barter." });
        return;
      }
      client.send("RPG_BARTER_UPDATED", {
        offers: res.offers,
        profile: res.profile,
        notice: "Squad Barter completed!",
      });
    });

    this.onMessage("RPG_CANCEL_TRADE", async (client: Client, data: { offerId: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      const res = await rpgService.cancelTradeOffer(player.userId, data?.offerId);
      if (!res.success) {
        client.send("RPG_ACTION_ERROR", { message: res.error || "Could not cancel barter." });
        return;
      }
      client.send("RPG_BARTER_UPDATED", { offers: res.offers });
    });

    this.onMessage("RPG_ATTACK_RAID", async (client: Client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      const res = await rpgService.attackRaidBoss(player.userId);
      if (!res.success) {
        client.send("RPG_ACTION_ERROR", { message: res.error || "Raid attack failed." });
        return;
      }
      client.send("RPG_RAID_RESULT", {
        raid: res.raid,
        profile: res.profile,
        hitEvent: res.hitEvent,
        karmaEarned: res.karmaEarned,
      });
      this.broadcast("RPG_RAID_HIT", { raid: res.raid, hitEvent: res.hitEvent }, { except: client });
    });
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
    player.focusPoints = (auth && auth.user && auth.user.focusPoints) || 0;
    player.focusStatus = "idle";
    player.focusSquadId = player.userId > 0 ? squadService.getSquadIdForUser(player.userId) || "" : "";
    player.focusEndTime = 0;
    if (options && options.outfit && typeof options.outfit === "object") {
      this.applyOutfitUpdate(player.outfit, options.outfit);
    }

    if (auth?.space) {
      this.spaceName = auth.space.name || this.spaceName || this.spaceId;
      this.isSuperadminSpace = !!auth.space.is_superadmin_space;
      this.spaceFocusTheme = isValidFocusTheme(auth.space.focus_theme) ? auth.space.focus_theme : this.spaceFocusTheme;
    }

    focusPointsService.registerClient({
      userId: player.userId,
      username: (auth && auth.user && auth.user.username) || player.name,
      sessionId: client.sessionId,
      client,
      room: this,
      playerState: player,
      initialPoints: player.focusPoints,
    }).then(() => {
      if (player.userId > 0) {
        squadService.handleUserConnect(player.userId);
        if (this.isSuperadminSpace) {
          updateUserLastPublicSpace(player.userId, this.spaceId).catch((err) => {
            console.warn("Could not persist last public space:", err);
          });
        }
      }
    }).catch((err) => {
      console.warn("Could not register client in focusPointsService:", err);
    });

    if (auth && auth.user) {
      ensureUserPersonalSpace(auth.user.id, auth.user.username).catch((err) => {
        console.warn("Could not ensure personal space on join:", err);
      });
    }
    const savedUser = auth && auth.user;
    const hasSavedPosInThisSpace =
      savedUser &&
      savedUser.lastSpaceId === this.spaceId &&
      typeof savedUser.lastX === "number" &&
      typeof savedUser.lastY === "number" &&
      Number.isFinite(savedUser.lastX) &&
      Number.isFinite(savedUser.lastY);

    if (hasSavedPosInThisSpace) {
      const clampedX = Math.max(
        PLAYER_HITBOX_HALF_WIDTH,
        Math.min(WORLD_WIDTH - PLAYER_HITBOX_HALF_WIDTH, savedUser.lastX),
      );
      const clampedY = Math.max(
        TILE_SIZE / 2,
        Math.min(WORLD_HEIGHT - PLAYER_FEET_BOTTOM_OFFSET, savedUser.lastY),
      );
      const savedCol = Math.max(0, Math.min(GRID_COLS - 1, Math.floor(clampedX / TILE_SIZE)));
      const savedRow = Math.max(0, Math.min(GRID_ROWS - 1, Math.floor(clampedY / TILE_SIZE)));

      if (!isWallTile(this.tiles[`${savedCol},${savedRow}`])) {
        player.x = clampedX;
        player.y = clampedY;
      } else {
        const safeSpawn = findSafeSpawnCenter(
          savedCol,
          savedRow,
          (c, r) => isWallTile(this.tiles[`${c},${r}`]),
        );
        player.x = safeSpawn.x;
        player.y = safeSpawn.y;
      }
    } else {
      let preferredTileX = Math.floor(GRID_COLS / 2);
      let preferredTileY = Math.floor(GRID_ROWS / 2);
      if (this.tiles["spawn_point"]) {
        const [sc, sr] = this.tiles["spawn_point"].split(",");
        const parsedCol = parseInt(sc, 10);
        const parsedRow = parseInt(sr, 10);
        if (
          !isNaN(parsedCol) &&
          !isNaN(parsedRow) &&
          parsedCol >= 0 &&
          parsedCol < GRID_COLS &&
          parsedRow >= 0 &&
          parsedRow < GRID_ROWS
        ) {
          preferredTileX = parsedCol;
          preferredTileY = parsedRow;
        }
      }
      const spawnCenter = findSafeSpawnCenter(
        preferredTileX,
        preferredTileY,
        (c, r) => isWallTile(this.tiles[`${c},${r}`]),
      );

      player.x = spawnCenter.x;
      player.y = spawnCenter.y;
    }

    if (player.userId > 0) {
      updateUserLastLocation(player.userId, this.spaceId, player.x, player.y).catch((err) => {
        console.warn("Could not persist initial user location:", err);
      });
    }

    this.state.players.set(client.sessionId, player);
    this.playerInputs.set(client.sessionId, {
      left: false,
      right: false,
      up: false,
      down: false,
    });

    console.log(
      ` Player joined space [${this.spaceId}]: ${name} (${color}) [${client.sessionId}] at tile (${Math.floor(player.x / TILE_SIZE)}, ${Math.floor(player.y / TILE_SIZE)})`,
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
    if (Array.isArray(auth?.space?.shared_owners)) {
      this.spaceSharedOwners = [...auth.space.shared_owners];
    }

    // Send current space tiles to joining client
    client.send("CURRENT_TILES", this.tiles);

    // Send current space private zones to joining client
    client.send("CURRENT_PRIVATE_ZONES", this.privateZones);

    // Send current space jukeboxes to joining client
    client.send("CURRENT_JUKEBOXES", Array.from(this.jukeboxes.values()));

    // Send current space typewriters to joining client
    client.send("CURRENT_TYPEWRITERS", Array.from(this.typewriters.values()));

    // Send current space ashtrays to joining client
    client.send("CURRENT_ASHTRAYS", Array.from(this.ashtrays.values()));

    // Send current space chess boards to joining client
    client.send("CURRENT_CHESS_BOARDS", Array.from(this.chessBoards.values()));

    // Send current space aquariums to joining client
    client.send("CURRENT_AQUARIUMS", Array.from(this.aquariums.values()));

    // Send current space Seller NPC to joining client
    client.send("CURRENT_SELLER_NPC", this.resolveSellerNpcForBroadcast());

    // Send recent chat messages from DB to joining client
    if (this.recentChatMessages && this.recentChatMessages.length > 0) {
      client.send("CHAT_HISTORY", this.recentChatMessages);
    }

    // Send space focus theme metadata & focus stats to joining client
    client.send("CURRENT_SPACE_INFO", {
      spaceId: this.spaceId,
      name: this.spaceName,
      isSuperadminSpace: this.isSuperadminSpace,
      focusTheme: this.spaceFocusTheme,
      resolvedTheme: resolveSpaceFocusTheme({
        spaceName: this.spaceName,
        focusTheme: this.spaceFocusTheme,
        tiles: this.tiles,
        fallbackTheme: "park",
      }),
    });
    if (auth?.user?.focusStats) {
      client.send("FOCUS_STATS_SYNC", auth.user.focusStats);
    }
    client.send("DINER_STATE", this.dinerController.getPublicState());
    void rpgService.getFullClientBundle(player.userId).then((bundle) => {
      try {
        player.rpgGearSignature = buildRpgGearSignature(bundle.profile.hero);
        client.send("RPG_STATE_SYNC", bundle);
      } catch {}
    });
  }

  onLeave(client: Client, consented?: boolean) {
    const leavingPlayer = this.state.players.get(client.sessionId);
    focusSessionService.handleRoomLeave(leavingPlayer?.userId || 0, client.sessionId);
    focusPointsService.unregisterClient(client.sessionId);
    if (leavingPlayer && leavingPlayer.userId > 0) {
      squadService.handleUserDisconnect(leavingPlayer.userId);
    }
    const count = activeSpaceCounts.get(this.spaceId) || 1;
    activeSpaceCounts.set(this.spaceId, Math.max(0, count - 1));

    // Cleanup voice channel membership if user was in voice
    this.removeClientFromVoice(client.sessionId);

    // Cleanup typeracing session if user was in race
    if (this.clientTypewriterRaceMap.has(client.sessionId)) {
      const twId = this.clientTypewriterRaceMap.get(client.sessionId)!;
      this.handleTypeRaceLeave(client.sessionId, twId);
    }

    // Cleanup smoking game session if user was in smoking game
    if (this.clientAshtrayGameMap.has(client.sessionId)) {
      const atId = this.clientAshtrayGameMap.get(client.sessionId)!;
      this.handleSmokingGameLeave(client.sessionId, atId);
    }

    // Cleanup chess match or spectator if user was in chess
    this.handleChessLeave(client.sessionId);

    // Cleanup throw battle match or challenge if user was in throw battle
    this.handleThrowBattleLeave(client.sessionId);

    // Cleanup diner shift if user was clocked in
    this.dinerController.handleLeaveShift(client.sessionId, null, false);

    const player = this.state.players.get(client.sessionId);
    if (player) {
      console.log(
        ` Player left space [${this.spaceId}]: ${player.name} [${client.sessionId}]`,
      );
      updatePlayerPosition(client.sessionId, player.x, player.y);
      if (player.userId > 0) {
        updateUserLastLocation(player.userId, this.spaceId, player.x, player.y).catch((err) => {
          console.warn("Could not persist user last location on leave:", err);
        });
      }
      this.state.players.delete(client.sessionId);
    }
    this.playerInputs.delete(client.sessionId);
    this.playerInputSyncTimes.delete(client.sessionId);
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
    const now = Date.now();
    const baseDtSeconds = Math.min(deltaTime / 1000, 0.1);
    const pixelChecker = this.getPixelCollisionChecker();

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

          let dtSeconds = baseDtSeconds;
          const lastSync = this.playerInputSyncTimes.get(sessionId);
          if (lastSync !== undefined) {
            const elapsedSinceSync = Math.max(0, (now - lastSync) / 1000);
            dtSeconds = Math.min(baseDtSeconds, elapsedSinceSync);
            this.playerInputSyncTimes.delete(sessionId);
          }

          if (dtSeconds > 0) {
            const resolved = resolveMovement(
              player.x,
              player.y,
              vx,
              vy,
              dtSeconds,
              undefined,
              PLAYER_HITBOX_HALF_WIDTH,
              undefined,
              pixelChecker
            );
            player.x = resolved.x;
            player.y = resolved.y;
          }
        } else {
          player.direction = "idle";
          this.playerInputSyncTimes.delete(sessionId);
        }
      } else {
        player.direction = "idle";
      }
    });

    this.dinerController.update(now, deltaTime, this.state.players);

    this.dbSyncCounter++;
    if (this.dbSyncCounter >= 100) {
      this.dbSyncCounter = 0;
      this.state.players.forEach((player: PlayerState, sessionId: string) => {
        updatePlayerPosition(sessionId, player.x, player.y);
      });
    }
  }

  private getRaceRoomState(session: {
    typewriterId: string;
    status: TypeRaceStatus;
    quote: string;
    startTime: number;
    countdown: number;
    players: Map<string, TypeRacePlayer>;
    results: TypeRaceResult[];
  }): TypeRaceRoomState {
    const playersObj: Record<string, TypeRacePlayer> = {};
    for (const [sId, p] of session.players.entries()) {
      playersObj[sId] = { ...p };
    }
    return {
      typewriterId: session.typewriterId,
      status: session.status,
      quote: session.quote,
      startTime: session.startTime,
      countdown: session.countdown,
      players: playersObj,
      results: [...session.results],
    };
  }

  private broadcastTypeRaceState(session: {
    typewriterId: string;
    status: TypeRaceStatus;
    quote: string;
    startTime: number;
    countdown: number;
    players: Map<string, TypeRacePlayer>;
    results: TypeRaceResult[];
  }) {
    const state = this.getRaceRoomState(session);
    this.broadcast("TYPERACE_STATE", state);
  }

  private endTypeRace(session: {
    typewriterId: string;
    status: TypeRaceStatus;
    quote: string;
    startTime: number;
    countdown: number;
    countdownTimer?: NodeJS.Timeout;
    matchTimer?: NodeJS.Timeout;
    players: Map<string, TypeRacePlayer>;
    results: TypeRaceResult[];
  }) {
    if (session.matchTimer) {
      clearTimeout(session.matchTimer);
      session.matchTimer = undefined;
    }
    session.status = "ended";
    const elapsedTotal = Math.max(1, (Date.now() - session.startTime) / 1000);

    const finishedIds = new Set(session.results.map((r) => r.sessionId));
    const unfinishedRacers = Array.from(session.players.values())
      .filter((p) => !p.isViewer && !finishedIds.has(p.sessionId))
      .sort((a, b) => b.progress - a.progress || b.wpm - a.wpm);

    for (const p of unfinishedRacers) {
      const rank = session.results.length + 1;
      p.finishRank = rank;
      p.finishTime = parseFloat(elapsedTotal.toFixed(1));
      session.results.push({
        sessionId: p.sessionId,
        name: p.name,
        color: p.color,
        wpm: p.wpm,
        accuracy: p.accuracy,
        timeSeconds: p.finishTime,
        rank,
      });
    }

    const finalState = this.getRaceRoomState(session);
    this.broadcast("TYPERACE_STATE", finalState);
    this.broadcast("TYPERACE_ENDED", {
      typewriterId: session.typewriterId,
      results: session.results,
    });
  }

  private handleTypeRaceLeave(sessionId: string, typewriterId: string) {
    this.clientTypewriterRaceMap.delete(sessionId);
    const session = this.typeRaceSessions.get(typewriterId);
    if (!session) return;

    session.players.delete(sessionId);

    if (session.players.size === 0) {
      if (session.countdownTimer) clearInterval(session.countdownTimer);
      if (session.matchTimer) clearTimeout(session.matchTimer);
      this.typeRaceSessions.delete(typewriterId);
      return;
    }

    if (session.status === "waiting") {
      const active = Array.from(session.players.values()).filter(
        (p) => !p.isViewer
      );
      if (active.length > 0 && active.every((p) => p.isReady)) {
        this.startTypeRaceCountdown(session);
        return;
      }
    } else if (session.status === "racing") {
      const active = Array.from(session.players.values()).filter(
        (p) => !p.isViewer
      );
      if (active.length > 0 && active.every((p) => p.finished)) {
        this.endTypeRace(session);
        return;
      }
    }

    this.broadcastTypeRaceState(session);
  }

  private startTypeRaceCountdown(session: {
    typewriterId: string;
    status: TypeRaceStatus;
    quote: string;
    startTime: number;
    countdown: number;
    countdownTimer?: NodeJS.Timeout;
    matchTimer?: NodeJS.Timeout;
    players: Map<string, TypeRacePlayer>;
    results: TypeRaceResult[];
  }) {
    if (session.countdownTimer) clearInterval(session.countdownTimer);
    session.status = "starting";
    session.countdown = 3;
    this.broadcastTypeRaceState(session);

    session.countdownTimer = setInterval(async () => {
      session.countdown -= 1;
      if (session.countdown > 0) {
        this.broadcastTypeRaceState(session);
      } else {
        if (session.countdownTimer) {
          clearInterval(session.countdownTimer);
          session.countdownTimer = undefined;
        }

        // Fetch 1 random quote from Monkeytype quotes dataset
        const quote = await QuoteService.getCombinedQuote(1);
        session.quote = quote;
        session.status = "racing";
        session.startTime = Date.now();
        session.results = [];

        // Reset all active racers for race start
        for (const p of session.players.values()) {
          if (!p.isViewer) {
            p.charsTyped = 0;
            p.progress = 0;
            p.wpm = 0;
            p.accuracy = 100;
            p.finished = false;
            p.finishRank = undefined;
            p.finishTime = undefined;
          }
        }

        this.broadcastTypeRaceState(session);
        this.broadcast("TYPERACE_START", {
          typewriterId: session.typewriterId,
          quote: session.quote,
          startTime: session.startTime,
        });
      }
    }, 1000);
  }

  // --- Ashtray & Smoking Game Helper Methods ---

  private getSmokingRoomState(session: {
    ashtrayId: string;
    status: SmokingGameStatus;
    starterSessionId: string;
    settings: SmokingGameSettings;
    startTime: number;
    endTime: number;
    countdown: number;
    players: Map<string, SmokingGamePlayer>;
    results: SmokingGameResult[];
  }): SmokingGameRoomState {
    const playersObj: Record<string, SmokingGamePlayer> = {};
    for (const [sId, p] of session.players.entries()) {
      playersObj[sId] = { ...p };
    }
    return {
      ashtrayId: session.ashtrayId,
      status: session.status,
      starterSessionId: session.starterSessionId,
      settings: { ...session.settings },
      startTime: session.startTime,
      endTime: session.endTime,
      countdown: session.countdown,
      players: playersObj,
      results: [...session.results],
    };
  }

  private broadcastSmokingGameState(session: {
    ashtrayId: string;
    status: SmokingGameStatus;
    starterSessionId: string;
    settings: SmokingGameSettings;
    startTime: number;
    endTime: number;
    countdown: number;
    players: Map<string, SmokingGamePlayer>;
    results: SmokingGameResult[];
  }) {
    const state = this.getSmokingRoomState(session);
    this.broadcast("SMOKING_GAME_STATE", state);
  }

  private broadcastSmokingGameStateThrottled(session: {
    ashtrayId: string;
    status: SmokingGameStatus;
    starterSessionId: string;
    settings: SmokingGameSettings;
    startTime: number;
    endTime: number;
    countdown: number;
    players: Map<string, SmokingGamePlayer>;
    results: SmokingGameResult[];
    lastBroadcastAt?: number;
  }) {
    const now = Date.now();
    if (!session.lastBroadcastAt || now - session.lastBroadcastAt >= 100) {
      session.lastBroadcastAt = now;
      this.broadcastSmokingGameState(session);
    }
  }

  private startSmokingGameCountdown(session: {
    ashtrayId: string;
    status: SmokingGameStatus;
    starterSessionId: string;
    settings: SmokingGameSettings;
    startTime: number;
    endTime: number;
    countdown: number;
    countdownTimer?: NodeJS.Timeout;
    matchTimer?: NodeJS.Timeout;
    players: Map<string, SmokingGamePlayer>;
    results: SmokingGameResult[];
  }) {
    if (session.countdownTimer) clearInterval(session.countdownTimer);
    session.status = "starting";
    session.countdown = 3;
    this.broadcastSmokingGameState(session);

    session.countdownTimer = setInterval(() => {
      session.countdown -= 1;
      if (session.countdown > 0) {
        this.broadcastSmokingGameState(session);
      } else {
        if (session.countdownTimer) {
          clearInterval(session.countdownTimer);
          session.countdownTimer = undefined;
        }

        session.status = "smoking";
        session.startTime = Date.now();
        session.endTime = session.startTime + session.settings.gameDuration * 1000;
        session.results = [];

        // Reset all active players for match start
        for (const p of session.players.values()) {
          p.currentMashes = 0;
          p.cigarettesFinished = 0;
          p.totalMashes = 0;
          p.mashesPerSecond = 0;
          p.rank = undefined;
        }

        this.broadcastSmokingGameState(session);
        this.broadcast("SMOKING_GAME_START", this.getSmokingRoomState(session));

        // Start timer for duration
        session.matchTimer = setTimeout(() => {
          this.endSmokingGame(session);
        }, session.settings.gameDuration * 1000);
      }
    }, 1000);
  }

  private endSmokingGame(session: {
    ashtrayId: string;
    status: SmokingGameStatus;
    starterSessionId: string;
    settings: SmokingGameSettings;
    startTime: number;
    endTime: number;
    countdown: number;
    countdownTimer?: NodeJS.Timeout;
    matchTimer?: NodeJS.Timeout;
    players: Map<string, SmokingGamePlayer>;
    results: SmokingGameResult[];
  }) {
    if (session.matchTimer) {
      clearTimeout(session.matchTimer);
      session.matchTimer = undefined;
    }
    session.status = "ended";

    // Sort players: 1st by cigarettesFinished desc, then by currentMashes desc, then by totalMashes desc
    const sortedPlayers = Array.from(session.players.values())
      .filter((p) => !p.isViewer)
      .sort((a, b) => {
        if (b.cigarettesFinished !== a.cigarettesFinished) {
          return b.cigarettesFinished - a.cigarettesFinished;
        }
        if (b.currentMashes !== a.currentMashes) {
          return b.currentMashes - a.currentMashes;
        }
        return b.totalMashes - a.totalMashes;
      });

    session.results = [];
    sortedPlayers.forEach((p, idx) => {
      const rank = idx + 1;
      p.rank = rank;
      session.results.push({
        sessionId: p.sessionId,
        name: p.name,
        color: p.color,
        avatarUrl: p.avatarUrl,
        cigarettesFinished: p.cigarettesFinished,
        currentMashes: p.currentMashes,
        totalMashes: p.totalMashes,
        mashesPerSecond: p.mashesPerSecond,
        rank,
      });
    });

    const finalState = this.getSmokingRoomState(session);
    this.broadcast("SMOKING_GAME_STATE", finalState);
    this.broadcast("SMOKING_GAME_ENDED", {
      ashtrayId: session.ashtrayId,
      results: session.results,
    });
  }

  private handleSmokingGameLeave(sessionId: string, ashtrayId: string) {
    this.clientAshtrayGameMap.delete(sessionId);
    const session = this.smokingSessions.get(ashtrayId);
    if (!session) return;

    session.players.delete(sessionId);

    if (session.players.size === 0) {
      if (session.countdownTimer) clearInterval(session.countdownTimer);
      if (session.matchTimer) clearTimeout(session.matchTimer);
      this.smokingSessions.delete(ashtrayId);
      return;
    }

    // Whoever is the first join will be the game starter. If game starter leave, the next first will be the game starter and so on.
    if (session.starterSessionId === sessionId) {
      const remaining = Array.from(session.players.values()).sort(
        (a, b) => a.joinedAt - b.joinedAt
      );
      if (remaining.length > 0) {
        const nextStarter = remaining[0];
        session.starterSessionId = nextStarter.sessionId;
        nextStarter.isStarter = true;
        nextStarter.isReady = true;
      }
    }

    this.broadcastSmokingGameState(session);
  }

  private async persistAshtrays() {
    try {
      await updateSpaceAshtrays(
        this.spaceId,
        Array.from(this.ashtrays.values())
      );
    } catch (err) {
      console.error("[GameRoom] Error persisting space ashtrays:", err);
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
    for (const tw of this.typewriters.values()) {
      if (tw.passable === false) {
        boxes.push({
          minX: tw.x - 20,
          maxX: tw.x + 20,
          minY: tw.y - 18,
          maxY: tw.y + 18,
        });
      }
    }
    for (const at of this.ashtrays.values()) {
      if (at.passable === false) {
        boxes.push({
          minX: at.x - 20,
          maxX: at.x + 20,
          minY: at.y - 18,
          maxY: at.y + 18,
        });
      }
    }
    for (const cb of this.chessBoards.values()) {
      if (cb.passable === false) {
        boxes.push({
          minX: cb.x - 22,
          maxX: cb.x + 22,
          minY: cb.y - 22,
          maxY: cb.y + 22,
        });
      }
    }
    for (const aq of this.aquariums.values()) {
      if (aq.passable === false) {
        boxes.push({
          minX: aq.x - 22,
          maxX: aq.x + 22,
          minY: aq.y - 22,
          maxY: aq.y + 22,
        });
      }
    }
    for (const [k, val] of Object.entries(this.tiles)) {
      if (k.startsWith("freeform:") && val) {
        const parts = val.split("::");
        const coords = parts[1]?.split(",");
        const isSolid = parts.includes("solid") || parts.includes("obstacle");
        if (coords && coords.length === 2 && isSolid) {
          const fx = parseFloat(coords[0]);
          const fy = parseFloat(coords[1]);
          if (!isNaN(fx) && !isNaN(fy)) {
            boxes.push({
              minX: fx - 16,
              maxX: fx + 16,
              minY: fy - 16,
              maxY: fy + 16,
            });
          }
        }
      }
    }
    return boxes;
  }

  private async ensureVirtualJukebox(
    id: string,
    x: number,
    y: number,
    broadcast: boolean
  ) {
    let jb = this.jukeboxes.get(id);
    if (!jb) {
      jb = {
        id,
        spaceId: this.spaceId,
        x: Math.round(x),
        y: Math.round(y),
        isPlaying: false,
        currentTrackIndex: 0,
        trackStartedAt: 0,
        playlist: [],
        passable: true,
        ontop: false,
        layer: 0,
        interactable: true,
        interaction: "jukebox",
      };
      this.jukeboxes.set(id, jb);
      if (broadcast) {
        this.broadcast("JUKEBOX_UPDATED", jb);
      }
      await this.persistJukeboxes();
    } else if (jb.x !== Math.round(x) || jb.y !== Math.round(y)) {
      jb.x = Math.round(x);
      jb.y = Math.round(y);
      if (broadcast) {
        this.broadcast("JUKEBOX_UPDATED", jb);
      }
      await this.persistJukeboxes();
    }
  }

  private async syncVirtualJukeboxesFromTiles(
    entries: Record<string, string>,
    broadcast: boolean
  ) {
    let changed = false;
    for (const [k, v] of Object.entries(entries)) {
      if (k.startsWith("freeform:")) {
        const parsed = v ? parseFreeformTile(v) : null;
        if (parsed && parsed.interaction === "jukebox") {
          await this.ensureVirtualJukebox(k, parsed.x, parsed.y, broadcast);
        } else if (this.jukeboxes.has(k)) {
          this.jukeboxes.delete(k);
          if (broadcast) {
            this.broadcast("JUKEBOX_DELETED", { jukeboxId: k });
          }
          changed = true;
        }
      } else if (k.includes(",")) {
        const jbId = `tile_deco_${k.replace(",", "_")}`;
        if (v && v.includes("~interact:jukebox")) {
          const [colStr, rowStr] = k.split(",");
          const col = parseInt(colStr, 10);
          const row = parseInt(rowStr, 10);
          if (!isNaN(col) && !isNaN(row)) {
            const x = col * TILE_SIZE + TILE_SIZE / 2;
            const y = row * TILE_SIZE + TILE_SIZE / 2;
            await this.ensureVirtualJukebox(jbId, x, y, broadcast);
          }
        } else if (this.jukeboxes.has(jbId)) {
          this.jukeboxes.delete(jbId);
          if (broadcast) {
            this.broadcast("JUKEBOX_DELETED", { jukeboxId: jbId });
          }
          changed = true;
        }
      }
    }
    if (changed) {
      await this.persistJukeboxes();
    }
  }

  private async persistJukeboxes() {
    try {
      await updateSpaceJukeboxes(this.spaceId, Array.from(this.jukeboxes.values()));
    } catch (err) {
      console.error("[GameRoom] Error persisting space jukeboxes:", err);
    }
  }

  private async persistTypewriters() {
    try {
      await updateSpaceTypewriters(
        this.spaceId,
        Array.from(this.typewriters.values())
      );
    } catch (err) {
      console.error("[GameRoom] Error persisting space typewriters:", err);
    }
  }

  private async persistChessBoards() {
    try {
      await updateSpaceChessBoards(
        this.spaceId,
        Array.from(this.chessBoards.values())
      );
    } catch (err) {
      console.error("[GameRoom] Error persisting space chess boards:", err);
    }
  }

  private async persistAquariums() {
    try {
      await updateSpaceAquariums(
        this.spaceId,
        Array.from(this.aquariums.values())
      );
    } catch (err) {
      console.error("[GameRoom] Error persisting space aquariums:", err);
    }
  }

  private resolveSellerNpcForBroadcast(): SellerNpcState | null {
    if (!this.sellerNpc || this.sellerNpc.enabled === false) {
      return null;
    }
    const resolvedTheme = resolveSpaceAssetShopTheme({
      shopTheme: this.sellerNpc.shopTheme || "auto",
      spaceName: this.spaceName,
      focusTheme: this.spaceFocusTheme,
      tiles: this.tiles,
    });
    const profile = getSellerThemeProfile(resolvedTheme);
    return {
      ...this.sellerNpc,
      name: this.sellerNpc.name || profile.defaultNpcName,
      spriteKey: this.sellerNpc.spriteKey || profile.defaultSpriteKey,
      shopTheme: this.sellerNpc.shopTheme || "auto",
      showCounter: this.sellerNpc.showCounter !== false,
      enabled: true,
      layer: this.sellerNpc.layer ?? 0,
    };
  }

  private chooseDefaultSellerNpcPosition(): { x: number; y: number } {
    let prefCol = Math.floor(GRID_COLS / 2);
    let prefRow = Math.floor(GRID_ROWS / 2);
    if (this.tiles["spawn_point"]) {
      const [sc, sr] = this.tiles["spawn_point"].split(",");
      const parsedCol = parseInt(sc, 10);
      const parsedRow = parseInt(sr, 10);
      if (
        !isNaN(parsedCol) &&
        !isNaN(parsedRow) &&
        parsedCol >= 0 &&
        parsedCol < GRID_COLS &&
        parsedRow >= 0 &&
        parsedRow < GRID_ROWS
      ) {
        prefCol = parsedCol;
        prefRow = parsedRow;
      }
    }
    const spawnCenter = getTileCenter(prefCol, prefRow);
    const checker = this.getPixelCollisionChecker();
    const isSpotClear = (cx: number, cy: number): boolean => {
      if (cx < 90 || cx > WORLD_WIDTH - 90 || cy < 80 || cy > WORLD_HEIGHT - 120) {
        return false;
      }
      if (Math.hypot(cx - spawnCenter.x, cy - spawnCenter.y) < 85) {
        return false;
      }
      const npcBlocked = checker.isBoxBlocked
        ? checker.isBoxBlocked(cx - 20, cy - 12, cx + 19, cy + 22)
        : false;
      if (npcBlocked) return false;
      const counterBlocked = checker.isBoxBlocked
        ? checker.isBoxBlocked(cx - 48, cy + 18, cx + 47, cy + 48)
        : false;
      if (counterBlocked) return false;
      const standBlocked = checker.isBoxBlocked
        ? checker.isBoxBlocked(cx - 18, cy + 60, cx + 17, cy + 88)
        : false;
      return !standBlocked;
    };

    const candidateOffsets: Array<[number, number]> = [
      [150, -100],
      [-150, -100],
      [200, -50],
      [-200, -50],
      [0, -150],
      [150, 50],
      [-150, 50],
      [250, -100],
      [-250, -100],
      [100, -200],
      [-100, -200],
    ];
    for (const [dx, dy] of candidateOffsets) {
      const cx = Math.round(spawnCenter.x + dx);
      const cy = Math.round(spawnCenter.y + dy);
      if (isSpotClear(cx, cy)) return { x: cx, y: cy };
    }

    for (let ring = 2; ring <= 8; ring++) {
      for (let dRow = -ring; dRow <= ring; dRow++) {
        for (let dCol = -ring; dCol <= ring; dCol++) {
          if (Math.abs(dRow) !== ring && Math.abs(dCol) !== ring) continue;
          const cx = spawnCenter.x + dCol * TILE_SIZE;
          const cy = spawnCenter.y + dRow * TILE_SIZE;
          if (isSpotClear(cx, cy)) return { x: cx, y: cy };
        }
      }
    }

    return {
      x: Math.min(WORLD_WIDTH - 100, spawnCenter.x + 150),
      y: Math.max(90, spawnCenter.y - 100),
    };
  }

  private async persistSellerNpc() {
    try {
      await updateSpaceSellerNpc(this.spaceId, this.sellerNpc);
    } catch (err) {
      console.error("[GameRoom] Error persisting space seller NPC:", err);
    }
  }

  private applyOutfitUpdate(target: OutfitSchema, data: Partial<PlayerOutfit>) {
    const isValidHex = (val: unknown): val is string =>
      typeof val === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(val);
    const isValidKey = (val: unknown): val is string =>
      typeof val === "string" && /^[a-z0-9_-]{0,64}$/i.test(val);

    if (data.shirtStyle === "sleeveless" || data.shirtStyle === "short_sleeve" || data.shirtStyle === "long_sleeve") {
      target.shirtStyle = data.shirtStyle;
    }
    if (isValidHex(data.shirtColor)) target.shirtColor = data.shirtColor;
    if (data.sleeveColor === "" || isValidHex(data.sleeveColor)) target.sleeveColor = data.sleeveColor;
    if (isValidHex(data.pantsColor)) target.pantsColor = data.pantsColor;
    if (isValidHex(data.skinColor)) target.skinColor = data.skinColor;
    if (isValidKey(data.outerwearKey)) target.outerwearKey = data.outerwearKey;
    if (isValidHex(data.outerwearColor)) target.outerwearColor = data.outerwearColor;
    if (isValidKey(data.hatKey)) target.hatKey = data.hatKey;
    if (isValidKey(data.chestKey)) target.chestKey = data.chestKey;
    if (isValidKey(data.pantsKey)) target.pantsKey = data.pantsKey;
    if (isValidKey(data.helmetKey)) target.helmetKey = data.helmetKey;
    if (isValidKey(data.bootsKey)) target.bootsKey = data.bootsKey;
    if (isValidKey(data.glovesKey)) target.glovesKey = data.glovesKey;
  }

  private getPlayerAvatarUrl(sessionId: string): string {
    const avatars = this.playerAvatars.get(sessionId);
    if (avatars?.idle) {
      if (Array.isArray(avatars.idle) && avatars.idle.length > 0) {
        return avatars.idle[0];
      } else if (typeof avatars.idle === "string") {
        return avatars.idle;
      }
    }
    return DEFAULT_AVATAR_ICON;
  }

  private getChessLobbyState(chessBoardId: string): ChessLobbyState {
    const waitingMatches: ChessGameSummary[] = [];
    const ongoingGames: ChessGameSummary[] = [];

    for (const match of this.chessMatches.values()) {
      if (match.chessBoardId !== chessBoardId) continue;
      const summary = this.buildChessGameSummary(match);
      if (match.status === "waiting") {
        waitingMatches.push(summary);
      } else if (match.status === "playing") {
        ongoingGames.push(summary);
      }
    }

    return {
      chessBoardId,
      waitingMatches,
      ongoingGames,
    };
  }

  private buildChessGameSummary(match: any): ChessGameSummary {
    const turn = match.chess?.turn() === "b" ? "black" : "white";
    return {
      matchId: match.matchId,
      chessBoardId: match.chessBoardId,
      whitePlayer: match.whitePlayer,
      blackPlayer: match.blackPlayer,
      status: match.status,
      spectatorCount: match.spectators.size,
      turn,
      moveCount: match.chess ? match.chess.history().length : 0,
      winner: match.winner,
      winReason: match.winReason,
      inCheck: match.chess ? match.chess.inCheck() : false,
      createdAt: match.createdAt,
    };
  }

  private buildChessGameState(match: any): ChessGameState {
    const turn = match.chess?.turn() === "b" ? "black" : "white";
    const specs: Record<string, ChessGameSpectator> = {};
    for (const [sid, spec] of match.spectators.entries()) {
      specs[sid] = spec;
    }

    return {
      matchId: match.matchId,
      chessBoardId: match.chessBoardId,
      status: match.status,
      whitePlayer: match.whitePlayer,
      blackPlayer: match.blackPlayer,
      spectators: specs,
      fen: match.chess
        ? match.chess.fen()
        : "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      history: match.chess ? match.chess.history() : [],
      turn,
      inCheck: match.chess ? match.chess.inCheck() : false,
      lastMove: match.lastMove,
      winner: match.winner,
      winReason: match.winReason,
      drawOffer: match.drawOffer,
      createdAt: match.createdAt,
    };
  }

  private broadcastChessLobbyState(chessBoardId: string) {
    const viewers = this.chessLobbyViewers.get(chessBoardId);
    if (!viewers || viewers.size === 0) return;
    const state = this.getChessLobbyState(chessBoardId);
    for (const sid of viewers) {
      const client = this.clients.find((c) => c.sessionId === sid);
      if (client) {
        client.send("CHESS_LOBBY_STATE", state);
      }
    }
  }

  private broadcastChessGameState(
    matchId: string,
    event: string,
    state: ChessGameState
  ) {
    const match = this.chessMatches.get(matchId);
    if (!match) return;

    const recipientSessionIds = new Set<string>();
    if (match.whitePlayer) recipientSessionIds.add(match.whitePlayer.sessionId);
    if (match.blackPlayer) recipientSessionIds.add(match.blackPlayer.sessionId);
    for (const sid of match.spectators.keys()) {
      recipientSessionIds.add(sid);
    }

    for (const sid of recipientSessionIds) {
      const client = this.clients.find((c) => c.sessionId === sid);
      if (client) {
        client.send(event, state);
      }
    }
  }

  private handleChessLeave(sessionId: string) {
    // 1. Remove from all lobby viewers
    for (const [cbId, viewers] of this.chessLobbyViewers.entries()) {
      viewers.delete(sessionId);
    }

    // 2. Scan all chess matches where this session was involved
    for (const [matchId, match] of this.chessMatches.entries()) {
      if (match.spectators.has(sessionId)) {
        match.spectators.delete(sessionId);
        this.clientChessMatchMap.delete(sessionId);
        const gameState = this.buildChessGameState(match);
        this.broadcastChessGameState(match.matchId, "CHESS_GAME_STATE", gameState);
        this.broadcastChessLobbyState(match.chessBoardId);
      }

      if (match.whitePlayer?.sessionId === sessionId || match.blackPlayer?.sessionId === sessionId) {
        this.clientChessMatchMap.delete(sessionId);

        if (match.status === "waiting") {
          this.chessMatches.delete(match.matchId);
          this.broadcastChessLobbyState(match.chessBoardId);
        } else if (match.status === "playing") {
          const isWhite = match.whitePlayer?.sessionId === sessionId;
          const leaverName = isWhite
            ? (match.whitePlayer?.name || "White")
            : (match.blackPlayer?.name || "Black");
          const winnerColor: ChessPieceColor = isWhite ? "black" : "white";
          const winnerPlayer = isWhite ? match.blackPlayer : match.whitePlayer;
          const winnerName = winnerPlayer?.name || (winnerColor === "white" ? "White" : "Black");

          match.status = "resigned";
          match.winner = winnerColor;
          match.winReason = `${leaverName} left the game. ${winnerName} wins by forfeit!`;

          if (match.whitePlayer?.sessionId) {
            this.clientChessMatchMap.delete(match.whitePlayer.sessionId);
          }
          if (match.blackPlayer?.sessionId) {
            this.clientChessMatchMap.delete(match.blackPlayer.sessionId);
          }

          const gameState = this.buildChessGameState(match);
          this.broadcastChessGameState(match.matchId, "CHESS_GAME_ENDED", gameState);
          this.broadcastChessLobbyState(match.chessBoardId);

          setTimeout(() => {
            this.chessMatches.delete(match.matchId);
          }, 10000);
        }
      }
    }

    this.clientChessMatchMap.delete(sessionId);
  }

  private broadcastThrowBattleEvent(matchId: string, event: string, data: any) {
    const match = this.throwBattleMatches.get(matchId);
    if (!match) return;
    const sids = [match.player1.sessionId, match.player2.sessionId];
    sids.forEach((sid) => {
      const client = this.clients.find((c) => c.sessionId === sid);
      if (client) {
        client.send(event, data);
      }
    });
  }

  private handleThrowBattleLeave(sessionId: string) {
    // 1. Remove pending challenges
    this.pendingThrowBattleChallenges.delete(sessionId);
    for (const [targetSid, challenge] of this.pendingThrowBattleChallenges.entries()) {
      if (challenge.challengerSessionId === sessionId) {
        this.pendingThrowBattleChallenges.delete(targetSid);
        const targetClient = this.clients.find((c) => c.sessionId === targetSid);
        if (targetClient) {
          targetClient.send("THROW_BATTLE_CHALLENGE_CANCELLED", {
            challengerSessionId: sessionId,
          });
        }
      }
    }

    // 2. Remove active match
    if (this.clientThrowBattleMatchMap.has(sessionId)) {
      const matchId = this.clientThrowBattleMatchMap.get(sessionId)!;
      this.clientThrowBattleMatchMap.delete(sessionId);
      const match = this.throwBattleMatches.get(matchId);
      if (match) {
        const otherSid =
          match.player1.sessionId === sessionId
            ? match.player2.sessionId
            : match.player1.sessionId;
        this.clientThrowBattleMatchMap.delete(otherSid);
        const otherClient = this.clients.find((c) => c.sessionId === otherSid);
        if (otherClient) {
          otherClient.send("THROW_BATTLE_PLAYER_LEFT", {
            matchId,
            sessionId,
          });
        }
        this.throwBattleMatches.delete(matchId);
      }
    }
  }

  onDispose() {
    this.state.players.forEach((player) => {
      if (player.userId > 0) {
        updateUserLastLocation(player.userId, this.spaceId, player.x, player.y).catch((err) => {
          console.warn("Could not persist user last location on dispose:", err);
        });
      }
    });
    const rooms = activeRoomsBySpace.get(this.spaceId);
    if (rooms) {
      rooms.delete(this);
      if (rooms.size === 0) {
        activeRoomsBySpace.delete(this.spaceId);
      }
    }
    if (this.jukeboxTimer) {
      clearInterval(this.jukeboxTimer);
      this.jukeboxTimer = null;
    }
    for (const session of this.typeRaceSessions.values()) {
      if (session.countdownTimer) clearInterval(session.countdownTimer);
      if (session.matchTimer) clearTimeout(session.matchTimer);
    }
    this.typeRaceSessions.clear();
    for (const session of this.smokingSessions.values()) {
      if (session.countdownTimer) clearInterval(session.countdownTimer);
      if (session.matchTimer) clearTimeout(session.matchTimer);
    }
    this.smokingSessions.clear();
    this.chessMatches.clear();
    this.chessLobbyViewers.clear();
    this.clientChessMatchMap.clear();
    this.throwBattleMatches.clear();
    this.clientThrowBattleMatchMap.clear();
    this.pendingThrowBattleChallenges.clear();
    focusPointsService.unregisterRoom(this);
  }
}
