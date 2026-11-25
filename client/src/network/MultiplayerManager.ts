import { Client, Room } from "colyseus.js";
import { SnapshotInterpolation } from "@geckos.io/snapshot-interpolation";
import {
  PlayerInputPayload,
  PlayerJoinOptions,
  PlayerAvatars,
  PlayerOutfit,
  DEFAULT_PLAYER_OUTFIT,
  SERVER_TICK_RATE,
  PrivateZone,
  ChatMessage,
  SendChatMessagePayload,
  JukeboxState,
  TypewriterState,
  TypeRaceRoomState,
  TypeRaceResult,
  AshtrayState,
  SmokingGameRoomState,
  SmokingGameResult,
  ChessBoardState,
  ChessLobbyState,
  ChessGameState,
  AquariumState,
  SellerNpcState,
  SellerNpcPlacePayload,
  SellerNpcUpdatePayload,
  ThrowBattleState,
  ThrowBattleInviteData,
  ThrowBattleTurnResultPayload,
  DecorationInteractionType,
  InteractiveEntityKind,
  FocusStats,
  FocusRewardBreakdown,
  FocusRoomSessionState,
  FocusRoomStartPayload,
  FocusRoomUpdateSettingsPayload,
  FocusSquadState,
  FocusSquadInviteData,
  FocusTheme,
  ResolvedFocusTheme,
  DinerGameState,
  DinerActionErrorPayload,
  DinerEventPayload,
  RpgProfileState,
  PartyMemberSnapshot,
  RaidBossState,
  LiveRaidHitEvent,
  TradeOffer,
  SquadBarterEligibility,
  ExpeditionResult,
  CheatShopState,
  ClassId,
  EquipSlot,
  WeaponType,
  PlayerAvatarState,
} from "shared";

export interface NetworkStats {
  pingMs: number;
  packetLoss: number;
}
export type PlayerChangeCallback = (sessionId: string, player: any) => void;
export type PlayerRemoveCallback = (sessionId: string) => void;
export type PlayerAvatarCallback = (sessionId: string, avatars: PlayerAvatars | null) => void;
export type PlayerOutfitCallback = (sessionId: string, outfit: PlayerOutfit) => void;
export type NetworkStatsCallback = (stats: NetworkStats) => void;
export type TilesUpdateCallback = (updates: Record<string, string>) => void;
export type PrivateZonesUpdateCallback = (zones: PrivateZone[]) => void;
export type ChatMessageCallback = (message: ChatMessage) => void;
export type JukeboxesSyncCallback = (jukeboxes: JukeboxState[]) => void;
export type JukeboxUpdateCallback = (jukebox: JukeboxState) => void;
export type JukeboxDeleteCallback = (jukeboxId: string) => void;
export type TypewritersSyncCallback = (typewriters: TypewriterState[]) => void;
export type TypewriterUpdateCallback = (typewriter: TypewriterState) => void;
export type TypewriterDeleteCallback = (typewriterId: string) => void;
export type TypeRaceStateCallback = (state: TypeRaceRoomState) => void;
export type TypeRaceStartCallback = (data: { typewriterId: string; quote: string; startTime: number }) => void;
export type TypeRaceEndedCallback = (data: { typewriterId: string; results: TypeRaceResult[] }) => void;
export type AshtraysSyncCallback = (ashtrays: AshtrayState[]) => void;
export type AshtrayUpdateCallback = (ashtray: AshtrayState) => void;
export type AshtrayDeleteCallback = (ashtrayId: string) => void;
export type SmokingGameStateCallback = (state: SmokingGameRoomState) => void;
export type SmokingGameStartCallback = (state: SmokingGameRoomState) => void;
export type SmokingGameEndedCallback = (data: { ashtrayId: string; results: SmokingGameResult[] }) => void;
export type ChessBoardsSyncCallback = (chessBoards: ChessBoardState[]) => void;
export type ChessBoardUpdateCallback = (chessBoard: ChessBoardState) => void;
export type ChessBoardDeleteCallback = (chessBoardId: string) => void;
export type AquariumsSyncCallback = (aquariums: AquariumState[]) => void;
export type AquariumUpdateCallback = (aquarium: AquariumState) => void;
export type AquariumDeleteCallback = (aquariumId: string) => void;
export type SellerNpcSyncCallback = (sellerNpc: SellerNpcState | null) => void;
export type ChessLobbyStateCallback = (state: ChessLobbyState) => void;
export type ChessGameStateCallback = (state: ChessGameState) => void;
export type ChessGameStartCallback = (state: ChessGameState) => void;
export type ChessGameEndedCallback = (state: ChessGameState) => void;
export type FocusPointsUpdatedCallback = (data: {
  points: number;
  added: number;
  stats?: FocusStats;
}) => void;
export type SpaceInfoUpdatedCallback = (data: {
  spaceId: string;
  name: string;
  isSuperadminSpace: boolean;
  focusTheme: FocusTheme;
  resolvedTheme: ResolvedFocusTheme;
}) => void;
export type FocusRoomStateCallback = (state: FocusRoomSessionState | null) => void;
export type FocusSessionCompletedCallback = (data: {
  breakdown: FocusRewardBreakdown;
  roomType: "personal" | "squad";
  theme: ResolvedFocusTheme;
  spaceName: string;
  isGuest?: boolean;
}) => void;
export type FocusStrictViolatedCallback = (data: { graceSeconds: number }) => void;
export type FocusNoticeCallback = (data: { type: "info" | "success" | "warning"; message: string }) => void;
export type FocusStatsSyncCallback = (stats: FocusStats) => void;
export type SquadStateUpdatedCallback = (data: { squad: FocusSquadState | null }) => void;
export type SquadInviteReceivedCallback = (invite: FocusSquadInviteData) => void;
export type SquadNoticeCallback = (data: { type: "info" | "success" | "warning"; message: string }) => void;

export interface RpgClientBundle {
  profile: RpgProfileState;
  alliedParty: PartyMemberSnapshot[];
  raid: RaidBossState;
  tradeOffers: TradeOffer[];
  barterEligibility: SquadBarterEligibility;
}
export type RpgStateSyncCallback = (bundle: RpgClientBundle) => void;
export type RpgProfileUpdatedCallback = (data: {
  profile?: RpgProfileState;
  alliedParty?: PartyMemberSnapshot[];
  notice?: string;
}) => void;
export type RpgExpeditionResultCallback = (data: { profile?: RpgProfileState; expedition?: ExpeditionResult }) => void;
export type RpgBarterUpdatedCallback = (data: { offers?: TradeOffer[]; profile?: RpgProfileState; notice?: string }) => void;
export type RpgRaidResultCallback = (data: {
  raid?: RaidBossState;
  profile?: RpgProfileState;
  hitEvent?: LiveRaidHitEvent;
  karmaEarned?: number;
}) => void;
export type RpgRaidHitCallback = (data: { raid?: RaidBossState; hitEvent?: LiveRaidHitEvent }) => void;
export type RpgCheerReceivedCallback = (data: { fromName: string; bonusLabel: string }) => void;
export type RpgActionErrorCallback = (data: { message: string }) => void;

// Throw Battle Callbacks
export type ThrowBattleInviteCallback = (data: ThrowBattleInviteData) => void;
export type ThrowBattleChallengeSentCallback = (data: { targetSessionId: string; targetName: string; hits?: number }) => void;
export type ThrowBattleChallengeCancelledCallback = (data: { challengerSessionId: string }) => void;
export type ThrowBattleRejectedCallback = (data: { targetSessionId: string; targetName: string }) => void;
export type ThrowBattleErrorCallback = (data: { message: string }) => void;
export type ThrowBattleStartCallback = (state: ThrowBattleState) => void;
export type ThrowBattlePlayerMovedCallback = (data: { matchId: string; sessionId: string; x: number }) => void;
export type ThrowBattleAngleStartedCallback = (data: { matchId: string; sessionId: string; x: number }) => void;
export type ThrowBattlePowerStartedCallback = (data: { matchId: string; sessionId: string; angle: number }) => void;
export type ThrowBattleThrownCallback = (data: { matchId: string; sessionId: string; angle: number; power: number; wind: number; projectileType?: string }) => void;
export type ThrowBattleNextTurnCallback = (data: { matchId: string; currentTurn: string; wind: number; round: number; p1Hp: number; p2Hp: number; p1X: number; p2X: number }) => void;
export type ThrowBattleGameOverCallback = (data: { matchId: string; winnerSessionId: string; p1Hp: number; p2Hp: number }) => void;
export type ThrowBattlePlayerLeftCallback = (data: { matchId: string; sessionId: string }) => void;


export function extractPlayerOutfit(raw: any): PlayerOutfit {
  const src = raw && typeof raw.toJSON === "function" ? raw.toJSON() : raw || {};
  const shirtStyle =
    src.shirtStyle === "sleeveless" || src.shirtStyle === "short_sleeve" || src.shirtStyle === "long_sleeve"
      ? src.shirtStyle
      : DEFAULT_PLAYER_OUTFIT.shirtStyle;
  return {
    shirtStyle,
    shirtColor: typeof src.shirtColor === "string" && src.shirtColor ? src.shirtColor : DEFAULT_PLAYER_OUTFIT.shirtColor,
    sleeveColor: typeof src.sleeveColor === "string" ? src.sleeveColor : DEFAULT_PLAYER_OUTFIT.sleeveColor,
    pantsColor: typeof src.pantsColor === "string" && src.pantsColor ? src.pantsColor : DEFAULT_PLAYER_OUTFIT.pantsColor,
    skinColor: typeof src.skinColor === "string" && src.skinColor ? src.skinColor : DEFAULT_PLAYER_OUTFIT.skinColor,
    outerwearKey: typeof src.outerwearKey === "string" ? src.outerwearKey : DEFAULT_PLAYER_OUTFIT.outerwearKey,
    outerwearColor: typeof src.outerwearColor === "string" && src.outerwearColor ? src.outerwearColor : DEFAULT_PLAYER_OUTFIT.outerwearColor,
    hatKey: typeof src.hatKey === "string" ? src.hatKey : DEFAULT_PLAYER_OUTFIT.hatKey,
    chestKey: typeof src.chestKey === "string" ? src.chestKey : (typeof src.outerwearKey === "string" ? src.outerwearKey : ""),
    pantsKey: typeof src.pantsKey === "string" ? src.pantsKey : "",
    helmetKey: typeof src.helmetKey === "string" ? src.helmetKey : (typeof src.hatKey === "string" ? src.hatKey : ""),
  };
}

export class MultiplayerManager {
  private client!: Client;
  public room: Room | null = null;
  public si = new SnapshotInterpolation(SERVER_TICK_RATE);
  private intentionallyLeftRooms = new WeakSet<Room>();

  private onPlayerAddCallbacks: PlayerChangeCallback[] = [];
  private onPlayerChangeCallbacks: PlayerChangeCallback[] = [];
  private onPlayerRemoveCallbacks: PlayerRemoveCallback[] = [];
  private onConnectionStatusCallbacks: ((connected: boolean) => void)[] = [];
  private onUnexpectedDisconnectCallbacks: ((code?: number) => void)[] = [];
  private onPlayerCountCallbacks: ((count: number) => void)[] = [];
  private onPlayerAvatarCallbacks: PlayerAvatarCallback[] = [];
  private onPlayerOutfitCallbacks: PlayerOutfitCallback[] = [];
  private onNetworkStatsCallbacks: NetworkStatsCallback[] = [];
  private onTilesUpdateCallbacks: TilesUpdateCallback[] = [];
  private onPrivateZonesUpdateCallbacks: PrivateZonesUpdateCallback[] = [];
  private onErrorCallbacks: ((data: { message: string }) => void)[] = [];
  private onChatMessageCallbacks: ChatMessageCallback[] = [];
  private onChatHistoryCallbacks: ((messages: ChatMessage[]) => void)[] = [];
  private onRoomJoinedCallbacks: (() => void)[] = [];
  private onJukeboxesSyncCallbacks: JukeboxesSyncCallback[] = [];
  private onJukeboxUpdateCallbacks: JukeboxUpdateCallback[] = [];
  private onJukeboxDeleteCallbacks: JukeboxDeleteCallback[] = [];
  private onJukeboxPlaylistAddedCallbacks: ((data: { count: number; title: string; playlistId: string }) => void)[] = [];
  private onJukeboxErrorCallbacks: ((data: { message: string }) => void)[] = [];
  private onTypewritersSyncCallbacks: TypewritersSyncCallback[] = [];
  private onTypewriterUpdateCallbacks: TypewriterUpdateCallback[] = [];
  private onTypewriterDeleteCallbacks: TypewriterDeleteCallback[] = [];
  private onTypeRaceStateCallbacks: TypeRaceStateCallback[] = [];
  private onTypeRaceStartCallbacks: TypeRaceStartCallback[] = [];
  private onTypeRaceEndedCallbacks: TypeRaceEndedCallback[] = [];
  private onAshtraysSyncCallbacks: AshtraysSyncCallback[] = [];
  private onAshtrayUpdateCallbacks: AshtrayUpdateCallback[] = [];
  private onAshtrayDeleteCallbacks: AshtrayDeleteCallback[] = [];
  private onSmokingGameStateCallbacks: SmokingGameStateCallback[] = [];
  private onSmokingGameStartCallbacks: SmokingGameStartCallback[] = [];
  private onSmokingGameEndedCallbacks: SmokingGameEndedCallback[] = [];
  private onChessBoardsSyncCallbacks: ChessBoardsSyncCallback[] = [];
  private onChessBoardUpdateCallbacks: ChessBoardUpdateCallback[] = [];
  private onChessBoardDeleteCallbacks: ChessBoardDeleteCallback[] = [];
  private onAquariumsSyncCallbacks: AquariumsSyncCallback[] = [];
  private onAquariumUpdateCallbacks: AquariumUpdateCallback[] = [];
  private onAquariumDeleteCallbacks: AquariumDeleteCallback[] = [];
  private onSellerNpcSyncCallbacks: SellerNpcSyncCallback[] = [];
  private onChessLobbyStateCallbacks: ChessLobbyStateCallback[] = [];
  private onChessGameStateCallbacks: ChessGameStateCallback[] = [];
  private onChessGameStartCallbacks: ChessGameStartCallback[] = [];
  private onChessGameEndedCallbacks: ChessGameEndedCallback[] = [];
  private onFocusPointsUpdatedCallbacks: FocusPointsUpdatedCallback[] = [];
  private onSpaceInfoUpdatedCallbacks: SpaceInfoUpdatedCallback[] = [];
  private onFocusRoomStateCallbacks: FocusRoomStateCallback[] = [];
  private onFocusSessionCompletedCallbacks: FocusSessionCompletedCallback[] = [];
  private onFocusStrictViolatedCallbacks: FocusStrictViolatedCallback[] = [];
  private onFocusNoticeCallbacks: FocusNoticeCallback[] = [];
  private onFocusStatsSyncCallbacks: FocusStatsSyncCallback[] = [];
  private onSquadStateUpdatedCallbacks: SquadStateUpdatedCallback[] = [];
  private onSquadInviteReceivedCallbacks: SquadInviteReceivedCallback[] = [];
  private onSquadNoticeCallbacks: SquadNoticeCallback[] = [];
  private onRpgStateSyncCallbacks: RpgStateSyncCallback[] = [];
  private onRpgClassChosenCallbacks: RpgStateSyncCallback[] = [];
  private onRpgProfileUpdatedCallbacks: RpgProfileUpdatedCallback[] = [];
  private onRpgExpeditionResultCallbacks: RpgExpeditionResultCallback[] = [];
  private onRpgBarterUpdatedCallbacks: RpgBarterUpdatedCallback[] = [];
  private onRpgRaidResultCallbacks: RpgRaidResultCallback[] = [];
  private onRpgRaidHitCallbacks: RpgRaidHitCallback[] = [];
  private onRpgCheerReceivedCallbacks: RpgCheerReceivedCallback[] = [];
  private onRpgActionErrorCallbacks: RpgActionErrorCallback[] = [];

  public currentRpgBundle: RpgClientBundle | null = null;

  public currentSpaceInfo: {
    spaceId: string;
    name: string;
    isSuperadminSpace: boolean;
    focusTheme: FocusTheme;
    resolvedTheme: ResolvedFocusTheme;
  } | null = null;
  public currentSquadState: FocusSquadState | null = null;
  public currentFocusStats: FocusStats | null = null;
  private onFriendUpdateCallbacks: Array<() => void> = [];
  private onThrowBattleInviteCallbacks: ThrowBattleInviteCallback[] = [];
  private onThrowBattleChallengeSentCallbacks: ThrowBattleChallengeSentCallback[] = [];
  private onThrowBattleChallengeCancelledCallbacks: ThrowBattleChallengeCancelledCallback[] = [];
  private onThrowBattleRejectedCallbacks: ThrowBattleRejectedCallback[] = [];
  private onThrowBattleErrorCallbacks: ThrowBattleErrorCallback[] = [];
  private onThrowBattleStartCallbacks: ThrowBattleStartCallback[] = [];
  private onThrowBattlePlayerMovedCallbacks: ThrowBattlePlayerMovedCallback[] = [];
  private onThrowBattleAngleStartedCallbacks: ThrowBattleAngleStartedCallback[] = [];
  private onThrowBattlePowerStartedCallbacks: ThrowBattlePowerStartedCallback[] = [];
  private onThrowBattleThrownCallbacks: ThrowBattleThrownCallback[] = [];
  private onThrowBattleNextTurnCallbacks: ThrowBattleNextTurnCallback[] = [];
  private onThrowBattleGameOverCallbacks: ThrowBattleGameOverCallback[] = [];
  private onThrowBattlePlayerLeftCallbacks: ThrowBattlePlayerLeftCallback[] = [];

  public currentTiles: Record<string, string> = {};
  public currentPrivateZones: PrivateZone[] = [];
  public currentJukeboxes: Map<string, JukeboxState> = new Map();
  public currentTypewriters: Map<string, TypewriterState> = new Map();
  public currentAshtrays: Map<string, AshtrayState> = new Map();
  public currentChessBoards: Map<string, ChessBoardState> = new Map();
  public currentAquariums: Map<string, AquariumState> = new Map();
  public currentSellerNpc: SellerNpcState | null = null;
  public currentDinerState: DinerGameState | null = null;
  public playerAvatarsMap = new Map<string, PlayerAvatars>();
  private onDinerStateCallbacks: Array<(state: DinerGameState) => void> = [];
  private onDinerErrorCallbacks: Array<(err: DinerActionErrorPayload) => void> = [];
  private onDinerEventCallbacks: Array<(ev: DinerEventPayload) => void> = [];

  private pingTimer: number | null = null;
  private pingSeq = 0;
  private recentPings: { seq: number; sentAt: number; received: boolean; rtt?: number }[] = [];
  private lastPingMs = 0;
  private lastPongAt = 0;
  private lastPingSentAt = 0;
  private consecutiveMissedPings = 0;
  private pongWaiters = new Map<number, (ok: boolean) => void>();
  private readonly MAX_PING_HISTORY = 15;

  constructor() {
    const envUrl = (import.meta as any).env?.VITE_SERVER_URL;
    let serverUrl: string;

    const wsProtocol =
      typeof window !== "undefined" && window.location.protocol === "https:"
        ? "wss:"
        : "ws:";
    const host =
      typeof window !== "undefined" && window.location.hostname
        ? window.location.hostname
        : "localhost";

    if (envUrl && typeof envUrl === "string" && envUrl.trim().length > 0) {
      let cleanUrl = envUrl.trim().replace(/\/+$/, "");
      if (typeof window !== "undefined" && window.location.protocol === "https:" && cleanUrl.startsWith("http://")) {
        cleanUrl = cleanUrl.replace(/^http:\/\//i, "https://");
      }
      serverUrl = cleanUrl.replace(/^http:/i, "ws:").replace(/^https:/i, "wss:");
    } else if (window.location.protocol === "http:" && (host === "localhost" || host === "127.0.0.1")) {
      serverUrl = `ws://${host}:2567`;
    } else if (window.location.protocol === "https:" && (host === "localhost" || host === "127.0.0.1")) {
      serverUrl = `wss://${host}:2567`;
    } else {
      // Connect to the same origin host via /colyseus proxy (handles HTTPS -> WSS cleanly)
      const portStr =
        window.location.port && window.location.port !== "80" && window.location.port !== "443"
          ? `:${window.location.port}`
          : "";
      serverUrl = `${wsProtocol}//${host}${portStr}/colyseus`;
    }

    console.log(`[MultiplayerManager] Connecting Colyseus client to ${serverUrl}`);
    this.client = new Client(serverUrl);
    if ((this.client as any).http?.headers) {
      (this.client as any).http.headers["skip_zrok_interstitial"] = "true";
    }
  }

  public currentSpaceId: string = "space_central_plaza";

  public get isConnected(): boolean {
    return this.room !== null;
  }

  public get sessionId(): string | undefined {
    return this.room?.sessionId;
  }

  private clearRoomTransientState() {
    this.playerAvatarsMap.clear();
    this.currentTiles = {};
    this.currentPrivateZones = [];
    this.currentJukeboxes.clear();
    this.currentTypewriters.clear();
    this.currentAshtrays.clear();
    this.currentChessBoards.clear();
    this.currentAquariums.clear();
    this.currentSellerNpc = null;
    this.currentDinerState = null;
    this.si = new SnapshotInterpolation(SERVER_TICK_RATE);
  }

  private resolveAllPongWaiters(ok: boolean) {
    const waiters = Array.from(this.pongWaiters.values());
    this.pongWaiters.clear();
    for (const resolve of waiters) {
      try {
        resolve(ok);
      } catch {}
    }
  }

  public leave() {
    this.stopPingLoop();
    this.resolveAllPongWaiters(false);
    this.clearRoomTransientState();
    if (this.room) {
      const leavingRoom = this.room;
      this.intentionallyLeftRooms.add(leavingRoom);
      this.room = null;
      try {
        leavingRoom.leave();
      } catch (err) {
        console.warn("Error leaving room:", err);
      }
    }
    this.notifyConnectionStatus(false);
  }

  public handleConnectionLost() {
    const staleRoom = this.room;
    if (!staleRoom) return;
    this.stopPingLoop();
    this.resolveAllPongWaiters(false);
    this.intentionallyLeftRooms.add(staleRoom);
    this.room = null;
    this.clearRoomTransientState();
    try {
      staleRoom.leave(false);
    } catch (err) {
      console.warn("Error closing stale room:", err);
    }
    this.notifyConnectionStatus(false);
    this.onUnexpectedDisconnectCallbacks.forEach((cb) => cb());
  }

  public async verifyConnection(timeoutMs: number = 2500): Promise<boolean> {
    const room = this.room;
    if (!room) return false;
    const seq = ++this.pingSeq;
    const now = Date.now();
    this.recentPings.push({
      seq,
      sentAt: now,
      received: false,
    });
    if (this.recentPings.length > this.MAX_PING_HISTORY) {
      this.recentPings.shift();
    }

    return new Promise<boolean>((resolve) => {
      let settled = false;
      const finish = (ok: boolean) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        this.pongWaiters.delete(seq);
        resolve(ok);
      };
      const timer = window.setTimeout(() => finish(false), timeoutMs);
      this.pongWaiters.set(seq, finish);
      try {
        room.send("PING", { seq, t: now });
      } catch {
        finish(false);
      }
    });
  }

  public async joinGame(options: PlayerJoinOptions): Promise<Room> {
    try {
      if (this.room) {
        const previousRoom = this.room;
        this.intentionallyLeftRooms.add(previousRoom);
        this.stopPingLoop();
        this.resolveAllPongWaiters(false);
        this.room = null;
        try {
          previousRoom.leave();
        } catch (err) {
          console.warn("Error leaving previous room before join:", err);
        }
      }
      this.clearRoomTransientState();
      this.currentSpaceId = options.spaceId || "space_central_plaza";
      // Use schema reflection (no root class) — passing `GameState` from `shared`
      // pulls in a second @colyseus/schema instance and breaks decoding ("refId not found").
      this.room = await this.client.joinOrCreate("game_room", options);
      this.lastPongAt = Date.now();
      this.lastPingSentAt = 0;
      this.consecutiveMissedPings = 0;
      this.notifyConnectionStatus(true);
      this.setupRoomEvents();

      // Wait for the first state update to guarantee state.players is defined
      await new Promise<void>((resolve) => {
        if (this.room?.state?.players) {
          this.setupStateListeners(this.room.state);
          resolve();
        } else {
          this.room!.onStateChange.once((state) => {
            this.setupStateListeners(state);
            resolve();
          });
        }
      });

      this.notifyRoomJoined();
      return this.room;
    } catch (err) {
      console.error("Failed to connect to game room:", err);
      this.notifyConnectionStatus(false);
      throw err;
    }
  }

  private setupRoomEvents() {
    if (!this.room) return;
    const room = this.room;

    this.room.onMessage("PLAYER_AVATARS", (data: { sessionId: string; avatars: PlayerAvatars | null }) => {
      if (data && data.sessionId) {
        if (data.avatars) {
          this.playerAvatarsMap.set(data.sessionId, data.avatars);
        } else {
          this.playerAvatarsMap.delete(data.sessionId);
        }
        this.notifyPlayerAvatars(data.sessionId, data.avatars);
      }
    });

    this.room.onMessage("ALL_AVATARS", (allAvatars: Record<string, PlayerAvatars>) => {
      if (allAvatars) {
        Object.entries(allAvatars).forEach(([sId, avatars]) => {
          this.playerAvatarsMap.set(sId, avatars);
          this.notifyPlayerAvatars(sId, avatars);
        });
      }
    });

    this.room.onMessage("PONG", (data: { seq: number; t: number }) => {
      const now = Date.now();
      this.lastPongAt = now;
      this.consecutiveMissedPings = 0;
      const waiter = this.pongWaiters.get(data.seq);
      if (waiter) {
        this.pongWaiters.delete(data.seq);
        waiter(true);
      }
      const rtt = Math.max(1, now - data.t);
      const record = this.recentPings.find((p) => p.seq === data.seq);
      if (record) {
        record.received = true;
        record.rtt = rtt;
      }
      this.calculateAndNotifyNetworkStats(rtt);
    });

    this.room.onMessage("CURRENT_TILES", (tiles: Record<string, string>) => {
      if (tiles && typeof tiles === "object") {
        this.currentTiles = { ...tiles };
        this.notifyTilesUpdate(tiles);
      }
    });

    this.room.onMessage("TILES_UPDATED", (updates: Record<string, string>) => {
      if (updates && typeof updates === "object") {
        this.notifyTilesUpdate(updates);
      }
    });

    this.room.onMessage("CURRENT_PRIVATE_ZONES", (zones: PrivateZone[]) => {
      if (Array.isArray(zones)) {
        this.currentPrivateZones = [...zones];
        this.notifyPrivateZonesUpdate(this.currentPrivateZones);
      }
    });

    this.room.onMessage("PRIVATE_ZONES_UPDATED", (zones: PrivateZone[]) => {
      if (Array.isArray(zones)) {
        this.currentPrivateZones = [...zones];
        this.notifyPrivateZonesUpdate(this.currentPrivateZones);
      }
    });

    this.room.onMessage("CHAT_MESSAGE", (message: ChatMessage) => {
      if (message && typeof message === "object") {
        this.notifyChatMessage(message);
      }
    });

    this.room.onMessage("CHAT_HISTORY", (history: ChatMessage[]) => {
      if (Array.isArray(history)) {
        this.notifyChatHistory(history);
      }
    });

    this.room.onMessage("CURRENT_JUKEBOXES", (jukeboxes: JukeboxState[]) => {
      this.currentJukeboxes.clear();
      if (Array.isArray(jukeboxes)) {
        for (const jb of jukeboxes) {
          this.currentJukeboxes.set(jb.id, jb);
        }
      }
      this.notifyJukeboxesSync(Array.from(this.currentJukeboxes.values()));
    });

    this.room.onMessage("JUKEBOX_UPDATED", (jukebox: JukeboxState) => {
      if (jukebox && jukebox.id) {
        this.currentJukeboxes.set(jukebox.id, jukebox);
        this.notifyJukeboxUpdate(jukebox);
      }
    });

    this.room.onMessage("JUKEBOX_DELETED", (data: { jukeboxId: string }) => {
      if (data && data.jukeboxId) {
        this.currentJukeboxes.delete(data.jukeboxId);
        this.notifyJukeboxDelete(data.jukeboxId);
      }
    });

    this.room.onMessage(
      "JUKEBOX_PLAYLIST_ADDED",
      (data: { count: number; title: string; playlistId: string }) => {
        this.onJukeboxPlaylistAddedCallbacks.forEach((cb) => {
          try {
            cb(data);
          } catch (err) {
            console.error("Error in onJukeboxPlaylistAdded callback:", err);
          }
        });
      }
    );

    this.room.onMessage("ERROR", (data: { message: string }) => {
      console.error("[MultiplayerManager] Server error:", data?.message || data);
      this.onErrorCallbacks.forEach((cb) => {
        try {
          cb(data);
        } catch (err) {
          console.error("Error in onError callback:", err);
        }
      });
    });

    this.room.onMessage("JUKEBOX_ERROR", (data: { message: string }) => {
      this.onJukeboxErrorCallbacks.forEach((cb) => {
        try {
          cb(data);
        } catch (err) {
          console.error("Error in onJukeboxError callback:", err);
        }
      });
    });

    this.room.onMessage("CURRENT_TYPEWRITERS", (typewriters: TypewriterState[]) => {
      this.currentTypewriters.clear();
      if (Array.isArray(typewriters)) {
        for (const tw of typewriters) {
          this.currentTypewriters.set(tw.id, tw);
        }
      }
      this.notifyTypewritersSync(Array.from(this.currentTypewriters.values()));
    });

    this.room.onMessage("TYPEWRITER_UPDATED", (typewriter: TypewriterState) => {
      if (typewriter && typewriter.id) {
        this.currentTypewriters.set(typewriter.id, typewriter);
        this.notifyTypewriterUpdate(typewriter);
      }
    });

    this.room.onMessage("TYPEWRITER_DELETED", (data: { typewriterId: string }) => {
      if (data && data.typewriterId) {
        this.currentTypewriters.delete(data.typewriterId);
        this.notifyTypewriterDelete(data.typewriterId);
      }
    });

    this.room.onMessage("TYPERACE_STATE", (state: TypeRaceRoomState) => {
      if (state && state.typewriterId) {
        this.notifyTypeRaceState(state);
      }
    });

    this.room.onMessage(
      "TYPERACE_START",
      (data: { typewriterId: string; quote: string; startTime: number }) => {
        if (data) {
          this.notifyTypeRaceStart(data);
        }
      }
    );

    this.room.onMessage(
      "TYPERACE_ENDED",
      (data: { typewriterId: string; results: TypeRaceResult[] }) => {
        if (data) {
          this.notifyTypeRaceEnded(data);
        }
      }
    );

    this.room.onMessage("CURRENT_ASHTRAYS", (ashtrays: AshtrayState[]) => {
      this.currentAshtrays.clear();
      if (Array.isArray(ashtrays)) {
        for (const at of ashtrays) {
          this.currentAshtrays.set(at.id, at);
        }
      }
      this.notifyAshtraysSync(Array.from(this.currentAshtrays.values()));
    });

    this.room.onMessage("ASHTRAY_UPDATED", (ashtray: AshtrayState) => {
      if (ashtray && ashtray.id) {
        this.currentAshtrays.set(ashtray.id, ashtray);
        this.notifyAshtrayUpdate(ashtray);
      }
    });

    this.room.onMessage("ASHTRAY_DELETED", (data: { ashtrayId: string }) => {
      if (data && data.ashtrayId) {
        this.currentAshtrays.delete(data.ashtrayId);
        this.notifyAshtrayDelete(data.ashtrayId);
      }
    });

    this.room.onMessage("SMOKING_GAME_STATE", (state: SmokingGameRoomState) => {
      if (state && state.ashtrayId) {
        this.notifySmokingGameState(state);
      }
    });

    this.room.onMessage("SMOKING_GAME_START", (state: SmokingGameRoomState) => {
      if (state && state.ashtrayId) {
        this.notifySmokingGameStart(state);
      }
    });

    this.room.onMessage(
      "SMOKING_GAME_ENDED",
      (data: { ashtrayId: string; results: SmokingGameResult[] }) => {
        if (data) {
          this.notifySmokingGameEnded(data);
        }
      }
    );

    this.room.onMessage("CURRENT_CHESS_BOARDS", (chessBoards: ChessBoardState[]) => {
      this.currentChessBoards.clear();
      if (Array.isArray(chessBoards)) {
        for (const cb of chessBoards) {
          this.currentChessBoards.set(cb.id, cb);
        }
      }
      this.notifyChessBoardsSync(Array.from(this.currentChessBoards.values()));
    });

    this.room.onMessage("CHESS_BOARD_UPDATED", (chessBoard: ChessBoardState) => {
      if (chessBoard && chessBoard.id) {
        this.currentChessBoards.set(chessBoard.id, chessBoard);
        this.notifyChessBoardUpdate(chessBoard);
      }
    });

    this.room.onMessage("CHESS_BOARD_DELETED", (data: { chessBoardId: string }) => {
      if (data && data.chessBoardId) {
        this.currentChessBoards.delete(data.chessBoardId);
        this.notifyChessBoardDelete(data.chessBoardId);
      }
    });

    this.room.onMessage("CURRENT_AQUARIUMS", (aquariums: AquariumState[]) => {
      this.currentAquariums.clear();
      if (Array.isArray(aquariums)) {
        for (const aq of aquariums) {
          this.currentAquariums.set(aq.id, aq);
        }
      }
      this.notifyAquariumsSync(Array.from(this.currentAquariums.values()));
    });

    this.room.onMessage("AQUARIUM_UPDATED", (aquarium: AquariumState) => {
      if (aquarium && aquarium.id) {
        this.currentAquariums.set(aquarium.id, aquarium);
        this.notifyAquariumUpdate(aquarium);
      }
    });

    this.room.onMessage("AQUARIUM_DELETED", (data: { aquariumId: string }) => {
      if (data && data.aquariumId) {
        this.currentAquariums.delete(data.aquariumId);
        this.notifyAquariumDelete(data.aquariumId);
      }
    });

    this.room.onMessage("CURRENT_SELLER_NPC", (sellerNpc: SellerNpcState | null) => {
      this.currentSellerNpc = sellerNpc || null;
      this.notifySellerNpcSync(this.currentSellerNpc);
    });

    this.room.onMessage("SELLER_NPC_UPDATED", (sellerNpc: SellerNpcState | null) => {
      this.currentSellerNpc = sellerNpc || null;
      this.notifySellerNpcSync(this.currentSellerNpc);
    });

    this.room.onMessage("CHESS_LOBBY_STATE", (state: ChessLobbyState) => {
      if (state) {
        this.notifyChessLobbyState(state);
      }
    });

    this.room.onMessage("CHESS_GAME_STATE", (state: ChessGameState) => {
      if (state) {
        this.notifyChessGameState(state);
      }
    });

    this.room.onMessage("CHESS_GAME_START", (state: ChessGameState) => {
      if (state) {
        this.notifyChessGameStart(state);
      }
    });

    this.room.onMessage("CHESS_GAME_ENDED", (state: ChessGameState) => {
      if (state) {
        this.notifyChessGameEnded(state);
      }
    });

    // Throw Battle Room Listeners
    this.room.onMessage("THROW_BATTLE_INVITED", (data: ThrowBattleInviteData) => {
      if (data) {
        this.onThrowBattleInviteCallbacks.forEach((cb) => cb(data));
      }
    });

    this.room.onMessage("THROW_BATTLE_CHALLENGE_SENT", (data: { targetSessionId: string; targetName: string; hits?: number }) => {
      if (data) {
        this.onThrowBattleChallengeSentCallbacks.forEach((cb) => cb(data));
      }
    });

    this.room.onMessage("THROW_BATTLE_CHALLENGE_CANCELLED", (data: { challengerSessionId: string }) => {
      if (data) {
        this.onThrowBattleChallengeCancelledCallbacks.forEach((cb) => cb(data));
      }
    });

    this.room.onMessage("THROW_BATTLE_REJECTED", (data: { targetSessionId: string; targetName: string }) => {
      if (data) {
        this.onThrowBattleRejectedCallbacks.forEach((cb) => cb(data));
      }
    });

    this.room.onMessage("THROW_BATTLE_ERROR", (data: { message: string }) => {
      if (data) {
        this.onThrowBattleErrorCallbacks.forEach((cb) => cb(data));
      }
    });

    this.room.onMessage("THROW_BATTLE_START", (state: ThrowBattleState) => {
      if (state) {
        this.onThrowBattleStartCallbacks.forEach((cb) => cb(state));
      }
    });

    this.room.onMessage("THROW_BATTLE_PLAYER_MOVED", (data: { matchId: string; sessionId: string; x: number }) => {
      if (data) {
        this.onThrowBattlePlayerMovedCallbacks.forEach((cb) => cb(data));
      }
    });

    this.room.onMessage("THROW_BATTLE_ANGLE_STARTED", (data: { matchId: string; sessionId: string; x: number }) => {
      if (data) {
        this.onThrowBattleAngleStartedCallbacks.forEach((cb) => cb(data));
      }
    });

    this.room.onMessage("THROW_BATTLE_POWER_STARTED", (data: { matchId: string; sessionId: string; angle: number }) => {
      if (data) {
        this.onThrowBattlePowerStartedCallbacks.forEach((cb) => cb(data));
      }
    });

    this.room.onMessage("THROW_BATTLE_THROWN", (data: { matchId: string; sessionId: string; angle: number; power: number; wind: number; projectileType?: string }) => {
      if (data) {
        this.onThrowBattleThrownCallbacks.forEach((cb) => cb(data));
      }
    });

    this.room.onMessage("THROW_BATTLE_NEXT_TURN", (data: { matchId: string; currentTurn: string; wind: number; round: number; p1Hp: number; p2Hp: number; p1X: number; p2X: number }) => {
      if (data) {
        this.onThrowBattleNextTurnCallbacks.forEach((cb) => cb(data));
      }
    });

    this.room.onMessage("THROW_BATTLE_GAME_OVER", (data: { matchId: string; winnerSessionId: string; p1Hp: number; p2Hp: number }) => {
      if (data) {
        this.onThrowBattleGameOverCallbacks.forEach((cb) => cb(data));
      }
    });

    this.room.onMessage("THROW_BATTLE_PLAYER_LEFT", (data: { matchId: string; sessionId: string }) => {
      if (data) {
        this.onThrowBattlePlayerLeftCallbacks.forEach((cb) => cb(data));
      }
    });

    this.room.onMessage(
      "FOCUS_POINTS_UPDATED",
      (data: { totalPoints?: number; points?: number; added: number; stats?: FocusStats }) => {
        if (!data) return;
        const points = typeof data.totalPoints === "number" ? data.totalPoints : data.points;
        if (typeof points === "number") {
          if (data.stats) {
            this.currentFocusStats = data.stats;
          }
          this.notifyFocusPointsUpdated({
            points,
            added: Number(data.added) || 0,
            stats: data.stats,
          });
        }
      }
    );

    const handleSpaceInfo = (data: any) => {
      if (!data || !data.spaceId) return;
      this.currentSpaceInfo = data;
      this.onSpaceInfoUpdatedCallbacks.forEach((cb) => {
        try {
          cb(data);
        } catch (err) {
          console.error("Error in onSpaceInfoUpdated callback:", err);
        }
      });
    };
    this.room.onMessage("CURRENT_SPACE_INFO", handleSpaceInfo);
    this.room.onMessage("SPACE_INFO_UPDATED", handleSpaceInfo);

    this.room.onMessage("FOCUS_STATS_SYNC", (stats: FocusStats) => {
      if (!stats) return;
      this.currentFocusStats = stats;
      this.onFocusStatsSyncCallbacks.forEach((cb) => {
        try {
          cb(stats);
        } catch (err) {
          console.error("Error in onFocusStatsSync callback:", err);
        }
      });
    });

    this.room.onMessage("FOCUS_ROOM_STATE", (state: FocusRoomSessionState | null) => {
      this.onFocusRoomStateCallbacks.forEach((cb) => {
        try {
          cb(state ?? null);
        } catch (err) {
          console.error("Error in onFocusRoomState callback:", err);
        }
      });
    });

    this.room.onMessage("FOCUS_SESSION_COMPLETED", (data: any) => {
      if (!data) return;
      this.onFocusSessionCompletedCallbacks.forEach((cb) => {
        try {
          cb(data);
        } catch (err) {
          console.error("Error in onFocusSessionCompleted callback:", err);
        }
      });
    });

    this.room.onMessage("FOCUS_STRICT_VIOLATED", (data: { graceSeconds: number }) => {
      if (!data) return;
      this.onFocusStrictViolatedCallbacks.forEach((cb) => {
        try {
          cb(data);
        } catch (err) {
          console.error("Error in onFocusStrictViolated callback:", err);
        }
      });
    });

    this.room.onMessage("FOCUS_NOTICE", (data: { type: "info" | "success" | "warning"; message: string }) => {
      if (!data) return;
      this.onFocusNoticeCallbacks.forEach((cb) => {
        try {
          cb(data);
        } catch (err) {
          console.error("Error in onFocusNotice callback:", err);
        }
      });
    });

    this.room.onMessage("RPG_STATE_SYNC", (bundle: RpgClientBundle) => {
      if (!bundle) return;
      this.currentRpgBundle = bundle;
      this.onRpgStateSyncCallbacks.forEach((cb) => {
        try {
          cb(bundle);
        } catch (err) {
          console.error("Error in onRpgStateSync callback:", err);
        }
      });
    });

    this.room.onMessage("RPG_CLASS_CHOSEN", (bundle: RpgClientBundle) => {
      if (!bundle) return;
      this.currentRpgBundle = bundle;
      this.onRpgStateSyncCallbacks.forEach((cb) => {
        try {
          cb(bundle);
        } catch (err) {
          console.error("Error in onRpgStateSync callback:", err);
        }
      });
      this.onRpgClassChosenCallbacks.forEach((cb) => {
        try {
          cb(bundle);
        } catch (err) {
          console.error("Error in onRpgClassChosen callback:", err);
        }
      });
    });

    this.room.onMessage("RPG_PROFILE_UPDATED", (data: { profile?: RpgProfileState; alliedParty?: PartyMemberSnapshot[]; notice?: string }) => {
      if (!data) return;
      if (this.currentRpgBundle) {
        this.currentRpgBundle = {
          ...this.currentRpgBundle,
          ...(data.profile ? { profile: data.profile } : {}),
          ...(data.alliedParty ? { alliedParty: data.alliedParty } : {}),
        };
      }
      this.onRpgProfileUpdatedCallbacks.forEach((cb) => {
        try {
          cb(data);
        } catch (err) {
          console.error("Error in onRpgProfileUpdated callback:", err);
        }
      });
    });

    this.room.onMessage("RPG_EXPEDITION_RESULT", (data: { profile?: RpgProfileState; expedition?: ExpeditionResult }) => {
      if (!data) return;
      if (data.profile && this.currentRpgBundle) {
        this.currentRpgBundle = { ...this.currentRpgBundle, profile: data.profile };
      }
      this.onRpgExpeditionResultCallbacks.forEach((cb) => {
        try {
          cb(data);
        } catch (err) {
          console.error("Error in onRpgExpeditionResult callback:", err);
        }
      });
    });

    this.room.onMessage("RPG_BARTER_UPDATED", (data: { offers?: TradeOffer[]; profile?: RpgProfileState; notice?: string }) => {
      if (!data) return;
      if (this.currentRpgBundle) {
        this.currentRpgBundle = {
          ...this.currentRpgBundle,
          ...(data.offers ? { tradeOffers: data.offers } : {}),
          ...(data.profile ? { profile: data.profile } : {}),
        };
      }
      this.onRpgBarterUpdatedCallbacks.forEach((cb) => {
        try {
          cb(data);
        } catch (err) {
          console.error("Error in onRpgBarterUpdated callback:", err);
        }
      });
    });

    this.room.onMessage("RPG_RAID_RESULT", (data: { raid?: RaidBossState; profile?: RpgProfileState; hitEvent?: LiveRaidHitEvent; karmaEarned?: number }) => {
      if (!data) return;
      if (this.currentRpgBundle) {
        this.currentRpgBundle = {
          ...this.currentRpgBundle,
          ...(data.raid ? { raid: data.raid } : {}),
          ...(data.profile ? { profile: data.profile } : {}),
        };
      }
      this.onRpgRaidResultCallbacks.forEach((cb) => {
        try {
          cb(data);
        } catch (err) {
          console.error("Error in onRpgRaidResult callback:", err);
        }
      });
    });

    this.room.onMessage("RPG_RAID_HIT", (data: { raid?: RaidBossState; hitEvent?: LiveRaidHitEvent }) => {
      if (!data) return;
      if (data.raid && this.currentRpgBundle) {
        this.currentRpgBundle = { ...this.currentRpgBundle, raid: data.raid };
      }
      this.onRpgRaidHitCallbacks.forEach((cb) => {
        try {
          cb(data);
        } catch (err) {
          console.error("Error in onRpgRaidHit callback:", err);
        }
      });
    });

    this.room.onMessage("RPG_CHEER_RECEIVED", (data: { fromName: string; bonusLabel: string }) => {
      if (!data) return;
      this.onRpgCheerReceivedCallbacks.forEach((cb) => {
        try {
          cb(data);
        } catch (err) {
          console.error("Error in onRpgCheerReceived callback:", err);
        }
      });
    });

    this.room.onMessage("RPG_ACTION_ERROR", (data: { message: string }) => {
      if (!data) return;
      this.onRpgActionErrorCallbacks.forEach((cb) => {
        try {
          cb(data);
        } catch (err) {
          console.error("Error in onRpgActionError callback:", err);
        }
      });
    });

    this.room.onMessage("SQUAD_STATE_UPDATED", (data: { squad: FocusSquadState | null }) => {
      this.currentSquadState = data?.squad ?? null;
      this.onSquadStateUpdatedCallbacks.forEach((cb) => {
        try {
          cb({ squad: this.currentSquadState });
        } catch (err) {
          console.error("Error in onSquadStateUpdated callback:", err);
        }
      });
    });

    this.room.onMessage("SQUAD_INVITE_RECEIVED", (invite: FocusSquadInviteData) => {
      if (!invite) return;
      this.onSquadInviteReceivedCallbacks.forEach((cb) => {
        try {
          cb(invite);
        } catch (err) {
          console.error("Error in onSquadInviteReceived callback:", err);
        }
      });
    });

    this.room.onMessage("SQUAD_NOTICE", (data: { type: "info" | "success" | "warning"; message: string }) => {
      if (!data) return;
      this.onSquadNoticeCallbacks.forEach((cb) => {
        try {
          cb(data);
        } catch (err) {
          console.error("Error in onSquadNotice callback:", err);
        }
      });
    });

    this.room.onMessage("FRIEND_UPDATE", () => {
      this.onFriendUpdateCallbacks.forEach((cb) => {
        try {
          cb();
        } catch (err) {
          console.error("Error in onFriendUpdate callback:", err);
        }
      });
    });

    this.room.onMessage("DINER_STATE", (state: DinerGameState) => {
      this.currentDinerState = state;
      this.onDinerStateCallbacks.forEach((cb) => {
        try {
          cb(state);
        } catch (err) {
          console.error("Error in onDinerState callback:", err);
        }
      });
    });

    this.room.onMessage("DINER_ACTION_ERROR", (err: DinerActionErrorPayload) => {
      if (!err) return;
      this.onDinerErrorCallbacks.forEach((cb) => {
        try {
          cb(err);
        } catch (e) {
          console.error("Error in onDinerError callback:", e);
        }
      });
    });

    this.room.onMessage("DINER_EVENT", (ev: DinerEventPayload) => {
      if (!ev) return;
      this.onDinerEventCallbacks.forEach((cb) => {
        try {
          cb(ev);
        } catch (e) {
          console.error("Error in onDinerEvent callback:", e);
        }
      });
    });

    this.startPingLoop();

    room.onLeave((code) => {
      console.warn("Left room with code:", code);
      if (this.room === room) {
        this.stopPingLoop();
        this.resolveAllPongWaiters(false);
        this.room = null;
        this.notifyConnectionStatus(false);
      }
      if (!this.intentionallyLeftRooms.has(room)) {
        this.clearRoomTransientState();
        this.onUnexpectedDisconnectCallbacks.forEach((cb) => cb(code));
      }
    });

    this.room.onError((code, message) => {
      console.error("Room error:", code, message);
      this.stopPingLoop();
    });
  }

  private setupStateListeners(state: any) {
    if (state && state.players) {
      state.players.onAdd((player: any, sessionId: string) => {
        this.notifyPlayerAdd(sessionId, player);
        this.notifyPlayerCount(state.players.size || 1);

        if (sessionId === this.room?.sessionId && player.focusPoints !== undefined) {
          this.notifyFocusPointsUpdated({ points: player.focusPoints, added: 0 });
        }

        player.onChange(() => {
          this.notifyPlayerChange(sessionId, player);
          if (sessionId === this.room?.sessionId && player.focusPoints !== undefined) {
            this.notifyFocusPointsUpdated({ points: player.focusPoints, added: 0 });
          }
        });

        if (player.outfit) {
          this.notifyPlayerOutfit(sessionId, extractPlayerOutfit(player.outfit));
          if (typeof player.outfit.onChange === "function") {
            player.outfit.onChange(() => {
              this.notifyPlayerOutfit(sessionId, extractPlayerOutfit(player.outfit));
            });
          }
        }
      });

      state.players.onRemove((player: any, sessionId: string) => {
        this.notifyPlayerRemove(sessionId);
        this.notifyPlayerCount(state.players.size || 0);
      });
    }

    // Snapshot interpolation ingestion (guide.md Section 5)
    this.room!.onStateChange((latestState: any) => {
      const snapshotData: any[] = [];
      if (latestState?.players) {
        latestState.players.forEach((player: any, sessionId: string) => {
          snapshotData.push({
            id: sessionId,
            x: player.x,
            y: player.y,
          });
        });

        this.si.snapshot.add({
          id: String(Date.now()),
          time: Date.now(),
          state: snapshotData,
        });
      }
    });
  }

  public sendInput(inputs: PlayerInputPayload) {
    if (this.room) {
      this.room.send("PLAYER_INPUT", inputs);
    }
  }

  public updateProfile(
    name: string,
    color: string,
    avatars?: PlayerAvatars | null,
    outfit?: Partial<PlayerOutfit>
  ) {
    if (this.room) {
      this.room.send("UPDATE_PROFILE", { name, color, avatars, outfit });
    }
  }

  public changeOutfit(outfit: Partial<PlayerOutfit>) {
    if (this.room) {
      this.room.send("change_outfit", outfit);
    }
  }

  // Event Subscription Helpers
  public onPlayerAdd(cb: PlayerChangeCallback) {
    this.onPlayerAddCallbacks.push(cb);
    // Immediately notify for any players already in state
    if (this.room?.state?.players) {
      this.room.state.players.forEach((player: any, sessionId: string) => {
        cb(sessionId, player);
      });
    }
  }

  public onPlayerChange(cb: PlayerChangeCallback) {
    this.onPlayerChangeCallbacks.push(cb);
  }

  public onPlayerRemove(cb: PlayerRemoveCallback) {
    this.onPlayerRemoveCallbacks.push(cb);
  }

  public onPlayerAvatars(cb: PlayerAvatarCallback) {
    this.onPlayerAvatarCallbacks.push(cb);
    // Immediately notify for any avatars already received
    this.playerAvatarsMap.forEach((avatars, sessionId) => {
      cb(sessionId, avatars);
    });
  }

  public onPlayerOutfit(cb: PlayerOutfitCallback) {
    this.onPlayerOutfitCallbacks.push(cb);
    if (this.room?.state?.players) {
      this.room.state.players.forEach((player: any, sessionId: string) => {
        if (player?.outfit) {
          cb(sessionId, extractPlayerOutfit(player.outfit));
        }
      });
    }
  }

  public onConnectionStatus(cb: (connected: boolean) => void) {
    this.onConnectionStatusCallbacks.push(cb);
  }

  public onUnexpectedDisconnect(cb: (code?: number) => void) {
    this.onUnexpectedDisconnectCallbacks.push(cb);
  }

  public onPlayerCount(cb: (count: number) => void) {
    this.onPlayerCountCallbacks.push(cb);
  }

  private notifyPlayerAdd(sessionId: string, player: any) {
    this.onPlayerAddCallbacks.forEach((cb) => cb(sessionId, player));
  }

  private notifyPlayerChange(sessionId: string, player: any) {
    this.onPlayerChangeCallbacks.forEach((cb) => cb(sessionId, player));
  }

  private notifyPlayerRemove(sessionId: string) {
    this.onPlayerRemoveCallbacks.forEach((cb) => cb(sessionId));
  }

  private notifyPlayerAvatars(sessionId: string, avatars: PlayerAvatars | null) {
    this.onPlayerAvatarCallbacks.forEach((cb) => cb(sessionId, avatars));
  }

  private notifyPlayerOutfit(sessionId: string, outfit: PlayerOutfit) {
    this.onPlayerOutfitCallbacks.forEach((cb) => cb(sessionId, outfit));
  }

  private notifyConnectionStatus(connected: boolean) {
    this.onConnectionStatusCallbacks.forEach((cb) => cb(connected));
  }

  private notifyPlayerCount(count: number) {
    this.onPlayerCountCallbacks.forEach((cb) => cb(count));
  }

  public onChatMessage(cb: ChatMessageCallback) {
    this.onChatMessageCallbacks.push(cb);
  }

  private notifyChatMessage(message: ChatMessage) {
    this.onChatMessageCallbacks.forEach((cb) => {
      try {
        cb(message);
      } catch (err) {
        console.error("Chat message callback error:", err);
      }
    });
  }

  public onChatHistory(cb: (history: ChatMessage[]) => void) {
    this.onChatHistoryCallbacks.push(cb);
  }

  private notifyChatHistory(history: ChatMessage[]) {
    this.onChatHistoryCallbacks.forEach((cb) => {
      try {
        cb(history);
      } catch (err) {
        console.error("Chat history callback error:", err);
      }
    });
  }

  public sendChatMessage(payload: SendChatMessagePayload) {
    if (this.room) {
      this.room.send("SEND_CHAT_MESSAGE", payload);
    }
  }

  public onRoomJoined(cb: () => void) {
    this.onRoomJoinedCallbacks.push(cb);
    if (this.room) {
      try {
        cb();
      } catch (err) {
        console.error("onRoomJoined callback error:", err);
      }
    }
  }

  private notifyRoomJoined() {
    this.onRoomJoinedCallbacks.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.error("onRoomJoined callback error:", err);
      }
    });
  }

  public onNetworkStats(cb: NetworkStatsCallback) {
    this.onNetworkStatsCallbacks.push(cb);
  }

  private startPingLoop() {
    this.stopPingLoop();
    this.recentPings = [];
    this.pingSeq = 0;
    this.lastPingMs = 0;

    // Send immediate initial ping
    this.sendPing();

    this.pingTimer = window.setInterval(() => {
      this.sendPing();
    }, 1000);
  }

  private stopPingLoop() {
    if (this.pingTimer !== null) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private sendPing() {
    if (!this.room) return;
    const now = Date.now();

    // Detect silent connection death when active pings receive no PONGs while page is visible
    if (this.lastPingSentAt > 0 && now - this.lastPingSentAt < 4000) {
      if (this.lastPongAt < this.lastPingSentAt) {
        this.consecutiveMissedPings += 1;
      } else {
        this.consecutiveMissedPings = 0;
      }
      const isVisible = typeof document === "undefined" || document.visibilityState === "visible";
      if (this.consecutiveMissedPings >= 6 && isVisible) {
        console.warn("[MultiplayerManager] Missed 6 consecutive pings; treating connection as lost.");
        this.handleConnectionLost();
        return;
      }
    } else {
      this.consecutiveMissedPings = 0;
    }

    const seq = ++this.pingSeq;
    this.lastPingSentAt = now;

    this.recentPings.push({
      seq,
      sentAt: now,
      received: false,
    });

    if (this.recentPings.length > this.MAX_PING_HISTORY) {
      this.recentPings.shift();
    }

    try {
      this.room.send("PING", { seq, t: now });
    } catch {
      this.handleConnectionLost();
      return;
    }

    this.calculateAndNotifyNetworkStats();
  }

  private calculateAndNotifyNetworkStats(latestPing?: number) {
    const now = Date.now();
    const TIMEOUT_MS = 1800;

    const evaluatedPings = this.recentPings.filter(
      (p) => p.received || now - p.sentAt > TIMEOUT_MS
    );

    let lossPercent = 0;
    if (evaluatedPings.length > 0) {
      const lostCount = evaluatedPings.filter((p) => !p.received).length;
      lossPercent = Math.round((lostCount / evaluatedPings.length) * 100);
    }

    if (latestPing !== undefined) {
      this.lastPingMs = latestPing;
    } else if (this.lastPingMs === 0) {
      const lastReceived = [...this.recentPings].reverse().find((p) => p.received && p.rtt !== undefined);
      if (lastReceived && lastReceived.rtt !== undefined) {
        this.lastPingMs = lastReceived.rtt;
      }
    }

    const stats: NetworkStats = {
      pingMs: Math.round(this.lastPingMs),
      packetLoss: lossPercent,
    };

    this.onNetworkStatsCallbacks.forEach((cb) => cb(stats));
  }

  public onTilesUpdated(callback: TilesUpdateCallback) {
    this.onTilesUpdateCallbacks.push(callback);
    if (Object.keys(this.currentTiles).length > 0) {
      callback(this.currentTiles);
    }
  }

  private notifyTilesUpdate(updates: Record<string, string>) {
    Object.assign(this.currentTiles, updates);
    this.onTilesUpdateCallbacks.forEach((cb) => {
      try {
        cb(updates);
      } catch (err) {
        console.error("Error in onTilesUpdated callback:", err);
      }
    });
  }

  public sendUpdateTiles(updates: Record<string, string>) {
    if (this.room) {
      this.room.send("UPDATE_TILES", { updates });
    }
  }

  public onPrivateZonesUpdated(callback: PrivateZonesUpdateCallback) {
    this.onPrivateZonesUpdateCallbacks.push(callback);
    if (this.currentPrivateZones.length > 0) {
      callback(this.currentPrivateZones);
    }
  }

  private notifyPrivateZonesUpdate(zones: PrivateZone[]) {
    this.currentPrivateZones = zones;
    this.onPrivateZonesUpdateCallbacks.forEach((cb) => {
      try {
        cb(zones);
      } catch (err) {
        console.error("Error in onPrivateZonesUpdated callback:", err);
      }
    });
  }

  public onError(callback: (data: { message: string }) => void) {
    this.onErrorCallbacks.push(callback);
  }

  public sendUpdatePrivateZones(zones: PrivateZone[]): boolean {
    if (this.room && this.room.connection?.isOpen) {
      this.room.send("UPDATE_PRIVATE_ZONES", { zones });
      return true;
    }
    console.warn("[MultiplayerManager] Cannot send UPDATE_PRIVATE_ZONES: room is not connected.");
    return false;
  }

  // --- Jukebox Handlers & Actions ---

  public onJukeboxesSync(callback: JukeboxesSyncCallback) {
    this.onJukeboxesSyncCallbacks.push(callback);
    if (this.currentJukeboxes.size > 0) {
      callback(Array.from(this.currentJukeboxes.values()));
    }
  }

  public onJukeboxUpdate(callback: JukeboxUpdateCallback) {
    this.onJukeboxUpdateCallbacks.push(callback);
  }

  public onJukeboxDelete(callback: JukeboxDeleteCallback) {
    this.onJukeboxDeleteCallbacks.push(callback);
  }

  private notifyJukeboxesSync(jukeboxes: JukeboxState[]) {
    this.onJukeboxesSyncCallbacks.forEach((cb) => {
      try {
        cb(jukeboxes);
      } catch (err) {
        console.error("Error in onJukeboxesSync callback:", err);
      }
    });
  }

  private notifyJukeboxUpdate(jukebox: JukeboxState) {
    this.onJukeboxUpdateCallbacks.forEach((cb) => {
      try {
        cb(jukebox);
      } catch (err) {
        console.error("Error in onJukeboxUpdate callback:", err);
      }
    });
  }

  private notifyJukeboxDelete(jukeboxId: string) {
    this.onJukeboxDeleteCallbacks.forEach((cb) => {
      try {
        cb(jukeboxId);
      } catch (err) {
        console.error("Error in onJukeboxDelete callback:", err);
      }
    });
  }

  public placeJukebox(
    x: number,
    y: number,
    passable: boolean = false,
    ontop: boolean = false,
    layer: number = 0
  ) {
    if (this.room) {
      this.room.send("JUKEBOX_PLACE", { x, y, passable, ontop, layer });
    }
  }

  public moveJukebox(jukeboxId: string, x: number, y: number) {
    if (this.room) {
      this.room.send("JUKEBOX_MOVE", { jukeboxId, x, y });
    }
  }

  public deleteJukebox(jukeboxId: string) {
    if (this.room) {
      this.room.send("JUKEBOX_DELETE", { jukeboxId });
    }
  }

  public setJukeboxPassable(jukeboxId: string, passable: boolean) {
    if (this.room) {
      this.room.send("JUKEBOX_SET_PASSABLE", { jukeboxId, passable });
    }
  }

  public setEntityInteraction(
    kind: InteractiveEntityKind,
    id: string,
    interactable: boolean,
    interaction: DecorationInteractionType | null
  ) {
    if (this.room) {
      this.room.send("ENTITY_SET_INTERACTION", {
        kind,
        id,
        interactable,
        interaction,
      });
    }
  }

  public addJukeboxTrack(jukeboxId: string, urlOrId: string) {
    if (this.room) {
      this.room.send("JUKEBOX_ADD_TRACK", { jukeboxId, urlOrId });
    }
  }

  public addJukeboxPlaylist(jukeboxId: string, playlistUrlOrId: string) {
    if (this.room) {
      this.room.send("JUKEBOX_ADD_PLAYLIST", { jukeboxId, playlistUrlOrId });
    }
  }

  public onJukeboxPlaylistAdded(
    callback: (data: { count: number; title: string; playlistId: string }) => void
  ) {
    this.onJukeboxPlaylistAddedCallbacks.push(callback);
  }

  public onJukeboxError(callback: (data: { message: string }) => void) {
    this.onJukeboxErrorCallbacks.push(callback);
  }

  public removeJukeboxTrack(jukeboxId: string, trackId: string) {
    if (this.room) {
      this.room.send("JUKEBOX_REMOVE_TRACK", { jukeboxId, trackId });
    }
  }

  public removeJukeboxTracks(jukeboxId: string, trackIds: string[]) {
    if (this.room && trackIds.length > 0) {
      this.room.send("JUKEBOX_REMOVE_TRACKS", { jukeboxId, trackIds });
    }
  }

  public moveJukeboxTrack(
    jukeboxId: string,
    trackId: string,
    direction: "up" | "down"
  ) {
    if (this.room) {
      this.room.send("JUKEBOX_MOVE_TRACK", { jukeboxId, trackId, direction });
    }
  }

  public moveJukeboxTracks(
    jukeboxId: string,
    trackIds: string[],
    direction: "up" | "down"
  ) {
    if (this.room && trackIds.length > 0) {
      this.room.send("JUKEBOX_MOVE_TRACKS", { jukeboxId, trackIds, direction });
    }
  }

  public clearJukeboxPlaylist(jukeboxId: string) {
    if (this.room) {
      this.room.send("JUKEBOX_CLEAR_PLAYLIST", { jukeboxId });
    }
  }

  public skipJukeboxTrack(jukeboxId: string) {
    if (this.room) {
      this.room.send("JUKEBOX_SKIP_TRACK", { jukeboxId });
    }
  }

  public toggleJukeboxPause(jukeboxId: string, paused?: boolean) {
    if (this.room) {
      this.room.send("JUKEBOX_TOGGLE_PAUSE", { jukeboxId, paused });
    }
  }

  public reportJukeboxTrackDuration(jukeboxId: string, trackId: string, duration: number) {
    if (this.room) {
      this.room.send("JUKEBOX_REPORT_DURATION", { jukeboxId, trackId, duration });
    }
  }

  private notifyTypewritersSync(typewriters: TypewriterState[]) {
    this.onTypewritersSyncCallbacks.forEach((cb) => {
      try {
        cb(typewriters);
      } catch (err) {
        console.error("Error in onTypewritersSync callback:", err);
      }
    });
  }

  private notifyTypewriterUpdate(typewriter: TypewriterState) {
    this.onTypewriterUpdateCallbacks.forEach((cb) => {
      try {
        cb(typewriter);
      } catch (err) {
        console.error("Error in onTypewriterUpdate callback:", err);
      }
    });
  }

  private notifyTypewriterDelete(typewriterId: string) {
    this.onTypewriterDeleteCallbacks.forEach((cb) => {
      try {
        cb(typewriterId);
      } catch (err) {
        console.error("Error in onTypewriterDelete callback:", err);
      }
    });
  }

  private notifyTypeRaceState(state: TypeRaceRoomState) {
    this.onTypeRaceStateCallbacks.forEach((cb) => {
      try {
        cb(state);
      } catch (err) {
        console.error("Error in onTypeRaceState callback:", err);
      }
    });
  }

  private notifyTypeRaceStart(data: { typewriterId: string; quote: string; startTime: number }) {
    this.onTypeRaceStartCallbacks.forEach((cb) => {
      try {
        cb(data);
      } catch (err) {
        console.error("Error in onTypeRaceStart callback:", err);
      }
    });
  }

  private notifyTypeRaceEnded(data: { typewriterId: string; results: TypeRaceResult[] }) {
    this.onTypeRaceEndedCallbacks.forEach((cb) => {
      try {
        cb(data);
      } catch (err) {
        console.error("Error in onTypeRaceEnded callback:", err);
      }
    });
  }

  public onTypewritersSync(cb: TypewritersSyncCallback) {
    this.onTypewritersSyncCallbacks.push(cb);
  }

  public onTypewriterUpdate(cb: TypewriterUpdateCallback) {
    this.onTypewriterUpdateCallbacks.push(cb);
  }

  public onTypewriterDelete(cb: TypewriterDeleteCallback) {
    this.onTypewriterDeleteCallbacks.push(cb);
  }

  public onTypeRaceState(cb: TypeRaceStateCallback) {
    this.onTypeRaceStateCallbacks.push(cb);
  }

  public onTypeRaceStart(cb: TypeRaceStartCallback) {
    this.onTypeRaceStartCallbacks.push(cb);
  }

  public onTypeRaceEnded(cb: TypeRaceEndedCallback) {
    this.onTypeRaceEndedCallbacks.push(cb);
  }

  public placeTypewriter(
    x: number,
    y: number,
    passable: boolean = false,
    ontop: boolean = false,
    layer: number = 0
  ) {
    if (this.room) {
      this.room.send("TYPEWRITER_PLACE", { x, y, passable, ontop, layer });
    }
  }

  public moveTypewriter(typewriterId: string, x: number, y: number) {
    if (this.room) {
      this.room.send("TYPEWRITER_MOVE", { typewriterId, x, y });
    }
  }

  public deleteTypewriter(typewriterId: string) {
    if (this.room) {
      this.room.send("TYPEWRITER_DELETE", { typewriterId });
    }
  }

  public setTypewriterPassable(typewriterId: string, passable: boolean) {
    if (this.room) {
      this.room.send("TYPEWRITER_SET_PASSABLE", { typewriterId, passable });
    }
  }

  public joinTypeRace(typewriterId: string) {
    if (this.room) {
      this.room.send("TYPERACE_JOIN", { typewriterId });
    }
  }

  public leaveTypeRace(typewriterId: string) {
    if (this.room) {
      this.room.send("TYPERACE_LEAVE", { typewriterId });
    }
  }

  public setTypeRaceReady(typewriterId: string, ready: boolean) {
    if (this.room) {
      this.room.send("TYPERACE_READY", { typewriterId, ready });
    }
  }

  public sendTypeRaceProgress(
    typewriterId: string,
    charsTyped: number,
    errors: number,
    finished: boolean,
    wpm: number,
    accuracy: number
  ) {
    if (this.room) {
      this.room.send("TYPERACE_PROGRESS", {
        typewriterId,
        charsTyped,
        errors,
        finished,
        wpm,
        accuracy,
      });
    }
  }

  public requestTypeRacePlayAgain(typewriterId: string) {
    if (this.room) {
      this.room.send("TYPERACE_PLAY_AGAIN", { typewriterId });
    }
  }

  // --- Ashtray & Smoking Game Methods ---

  private notifyAshtraysSync(ashtrays: AshtrayState[]) {
    this.onAshtraysSyncCallbacks.forEach((cb) => {
      try {
        cb(ashtrays);
      } catch (err) {
        console.error("Error in onAshtraysSync callback:", err);
      }
    });
  }

  private notifyAshtrayUpdate(ashtray: AshtrayState) {
    this.onAshtrayUpdateCallbacks.forEach((cb) => {
      try {
        cb(ashtray);
      } catch (err) {
        console.error("Error in onAshtrayUpdate callback:", err);
      }
    });
  }

  private notifyAshtrayDelete(ashtrayId: string) {
    this.onAshtrayDeleteCallbacks.forEach((cb) => {
      try {
        cb(ashtrayId);
      } catch (err) {
        console.error("Error in onAshtrayDelete callback:", err);
      }
    });
  }

  private notifySmokingGameState(state: SmokingGameRoomState) {
    this.onSmokingGameStateCallbacks.forEach((cb) => {
      try {
        cb(state);
      } catch (err) {
        console.error("Error in onSmokingGameState callback:", err);
      }
    });
  }

  private notifySmokingGameStart(state: SmokingGameRoomState) {
    this.onSmokingGameStartCallbacks.forEach((cb) => {
      try {
        cb(state);
      } catch (err) {
        console.error("Error in onSmokingGameStart callback:", err);
      }
    });
  }

  private notifySmokingGameEnded(data: { ashtrayId: string; results: SmokingGameResult[] }) {
    this.onSmokingGameEndedCallbacks.forEach((cb) => {
      try {
        cb(data);
      } catch (err) {
        console.error("Error in onSmokingGameEnded callback:", err);
      }
    });
  }

  public onAshtraysSync(cb: AshtraysSyncCallback) {
    this.onAshtraysSyncCallbacks.push(cb);
  }

  public onAshtrayUpdate(cb: AshtrayUpdateCallback) {
    this.onAshtrayUpdateCallbacks.push(cb);
  }

  public onAshtrayDelete(cb: AshtrayDeleteCallback) {
    this.onAshtrayDeleteCallbacks.push(cb);
  }

  public onSmokingGameState(cb: SmokingGameStateCallback) {
    this.onSmokingGameStateCallbacks.push(cb);
  }

  public onSmokingGameStart(cb: SmokingGameStartCallback) {
    this.onSmokingGameStartCallbacks.push(cb);
  }

  public onSmokingGameEnded(cb: SmokingGameEndedCallback) {
    this.onSmokingGameEndedCallbacks.push(cb);
  }

  public placeAshtray(
    x: number,
    y: number,
    passable: boolean = false,
    ontop: boolean = false,
    layer: number = 0
  ) {
    if (this.room) {
      this.room.send("ASHTRAY_PLACE", { x, y, passable, ontop, layer });
    }
  }

  public moveAshtray(ashtrayId: string, x: number, y: number) {
    if (this.room) {
      this.room.send("ASHTRAY_MOVE", { ashtrayId, x, y });
    }
  }

  public deleteAshtray(ashtrayId: string) {
    if (this.room) {
      this.room.send("ASHTRAY_DELETE", { ashtrayId });
    }
  }

  public setAshtrayPassable(ashtrayId: string, passable: boolean) {
    if (this.room) {
      this.room.send("ASHTRAY_PASSABLE", { ashtrayId, passable });
    }
  }

  public joinSmokingGame(ashtrayId: string) {
    if (this.room) {
      this.room.send("SMOKING_GAME_JOIN", { ashtrayId });
    }
  }

  public leaveSmokingGame(ashtrayId: string) {
    if (this.room) {
      this.room.send("SMOKING_GAME_LEAVE", { ashtrayId });
    }
  }

  public setSmokingGameReady(ashtrayId: string, ready: boolean) {
    if (this.room) {
      this.room.send("SMOKING_GAME_READY", { ashtrayId, ready });
    }
  }

  public updateSmokingGameSettings(
    ashtrayId: string,
    settings: { mashesPerCigarette?: number; gameDuration?: number }
  ) {
    if (this.room) {
      this.room.send("SMOKING_GAME_UPDATE_SETTINGS", {
        ashtrayId,
        ...settings,
      });
    }
  }

  public startSmokingGame(ashtrayId: string) {
    if (this.room) {
      this.room.send("SMOKING_GAME_START", { ashtrayId });
    }
  }

  public sendSmokingGameMash(
    ashtrayId: string,
    currentMashes: number,
    cigarettesFinished: number,
    totalMashes: number,
    mashesPerSecond: number
  ) {
    if (this.room) {
      this.room.send("SMOKING_GAME_MASH", {
        ashtrayId,
        currentMashes,
        cigarettesFinished,
        totalMashes,
        mashesPerSecond,
      });
    }
  }

  public requestSmokingGamePlayAgain(ashtrayId: string) {
    if (this.room) {
      this.room.send("SMOKING_GAME_PLAY_AGAIN", { ashtrayId });
    }
  }

  // --- Chess Board & Chess Game Methods ---

  private notifyChessBoardsSync(chessBoards: ChessBoardState[]) {
    this.onChessBoardsSyncCallbacks.forEach((cb) => {
      try {
        cb(chessBoards);
      } catch (err) {
        console.error("Error in onChessBoardsSync callback:", err);
      }
    });
  }

  private notifyChessBoardUpdate(chessBoard: ChessBoardState) {
    this.onChessBoardUpdateCallbacks.forEach((cb) => {
      try {
        cb(chessBoard);
      } catch (err) {
        console.error("Error in onChessBoardUpdate callback:", err);
      }
    });
  }

  private notifyChessBoardDelete(chessBoardId: string) {
    this.onChessBoardDeleteCallbacks.forEach((cb) => {
      try {
        cb(chessBoardId);
      } catch (err) {
        console.error("Error in onChessBoardDelete callback:", err);
      }
    });
  }

  private notifyChessLobbyState(state: ChessLobbyState) {
    this.onChessLobbyStateCallbacks.forEach((cb) => {
      try {
        cb(state);
      } catch (err) {
        console.error("Error in onChessLobbyState callback:", err);
      }
    });
  }

  private notifyChessGameState(state: ChessGameState) {
    this.onChessGameStateCallbacks.forEach((cb) => {
      try {
        cb(state);
      } catch (err) {
        console.error("Error in onChessGameState callback:", err);
      }
    });
  }

  private notifyChessGameStart(state: ChessGameState) {
    this.onChessGameStartCallbacks.forEach((cb) => {
      try {
        cb(state);
      } catch (err) {
        console.error("Error in onChessGameStart callback:", err);
      }
    });
  }

  private notifyChessGameEnded(state: ChessGameState) {
    this.onChessGameEndedCallbacks.forEach((cb) => {
      try {
        cb(state);
      } catch (err) {
        console.error("Error in onChessGameEnded callback:", err);
      }
    });
  }

  public onChessBoardsSync(cb: ChessBoardsSyncCallback) {
    this.onChessBoardsSyncCallbacks.push(cb);
  }

  public onChessBoardUpdate(cb: ChessBoardUpdateCallback) {
    this.onChessBoardUpdateCallbacks.push(cb);
  }

  public onChessBoardDelete(cb: ChessBoardDeleteCallback) {
    this.onChessBoardDeleteCallbacks.push(cb);
  }

  public onChessLobbyState(cb: ChessLobbyStateCallback) {
    this.onChessLobbyStateCallbacks.push(cb);
  }

  public onChessGameState(cb: ChessGameStateCallback) {
    this.onChessGameStateCallbacks.push(cb);
  }

  public onChessGameStart(cb: ChessGameStartCallback) {
    this.onChessGameStartCallbacks.push(cb);
  }

  public onChessGameEnded(cb: ChessGameEndedCallback) {
    this.onChessGameEndedCallbacks.push(cb);
  }

  public onFocusPointsUpdated(cb: FocusPointsUpdatedCallback) {
    this.onFocusPointsUpdatedCallbacks.push(cb);
  }

  public onSpaceInfoUpdated(cb: SpaceInfoUpdatedCallback) {
    this.onSpaceInfoUpdatedCallbacks.push(cb);
    if (this.currentSpaceInfo) {
      cb(this.currentSpaceInfo);
    }
  }

  public onFocusRoomState(cb: FocusRoomStateCallback) {
    this.onFocusRoomStateCallbacks.push(cb);
  }

  public onFocusSessionCompleted(cb: FocusSessionCompletedCallback) {
    this.onFocusSessionCompletedCallbacks.push(cb);
  }

  public onFocusStrictViolated(cb: FocusStrictViolatedCallback) {
    this.onFocusStrictViolatedCallbacks.push(cb);
  }

  public onFocusNotice(cb: FocusNoticeCallback) {
    this.onFocusNoticeCallbacks.push(cb);
  }

  public onFocusStatsSync(cb: FocusStatsSyncCallback) {
    this.onFocusStatsSyncCallbacks.push(cb);
    if (this.currentFocusStats) {
      cb(this.currentFocusStats);
    }
  }

  public onSquadStateUpdated(cb: SquadStateUpdatedCallback) {
    this.onSquadStateUpdatedCallbacks.push(cb);
    cb({ squad: this.currentSquadState });
  }

  public onSquadInviteReceived(cb: SquadInviteReceivedCallback) {
    this.onSquadInviteReceivedCallbacks.push(cb);
  }

  public onSquadNotice(cb: SquadNoticeCallback) {
    this.onSquadNoticeCallbacks.push(cb);
  }

  public onFriendUpdate(cb: () => void) {
    this.onFriendUpdateCallbacks.push(cb);
  }

  private notifyFocusPointsUpdated(data: { points: number; added: number; stats?: FocusStats }) {
    this.onFocusPointsUpdatedCallbacks.forEach((cb) => {
      try {
        cb(data);
      } catch (err) {
        console.error("Error in onFocusPointsUpdated callback:", err);
      }
    });
  }

  public sendFocusRoomStart(payload?: FocusRoomStartPayload) {
    if (this.room) {
      this.room.send("FOCUS_ROOM_START", payload || {});
    }
  }

  public sendFocusRoomUpdateSettings(payload: FocusRoomUpdateSettingsPayload) {
    if (this.room) {
      this.room.send("FOCUS_ROOM_UPDATE_SETTINGS", payload);
    }
  }

  public sendFocusRoomVisibility(hidden: boolean) {
    if (this.room) {
      this.room.send("FOCUS_ROOM_VISIBILITY", { hidden });
    }
  }

  public sendFocusRoomEndEarly() {
    if (this.room) {
      this.room.send("FOCUS_ROOM_END_EARLY", {});
    }
  }

  public sendFocusRoomExit() {
    if (this.room) {
      this.room.send("FOCUS_ROOM_EXIT", {});
    }
  }

  public sendSquadCreate() {
    if (this.room) {
      this.room.send("SQUAD_CREATE", {});
    }
  }

  public sendSquadInvite(targetUserId?: number, targetSessionId?: string) {
    if (this.room) {
      this.room.send("SQUAD_INVITE", { targetUserId, targetSessionId });
    }
  }

  public sendSquadInviteRespond(fromUserId: number, accept: boolean) {
    if (this.room) {
      this.room.send("SQUAD_INVITE_RESPOND", { fromUserId, accept });
    }
  }

  public sendSquadLeave() {
    if (this.room) {
      this.room.send("SQUAD_LEAVE", {});
    }
  }

  public sendSquadKick(targetUserId: number) {
    if (this.room) {
      this.room.send("SQUAD_KICK", { targetUserId });
    }
  }

  public requestSquadState() {
    if (this.room) {
      this.room.send("SQUAD_REQUEST_STATE", {});
    }
  }

  public onRpgStateSync(cb: RpgStateSyncCallback) {
    this.onRpgStateSyncCallbacks.push(cb);
    if (this.currentRpgBundle) cb(this.currentRpgBundle);
  }
  public onRpgClassChosen(cb: RpgStateSyncCallback) {
    this.onRpgClassChosenCallbacks.push(cb);
  }
  public onRpgProfileUpdated(cb: RpgProfileUpdatedCallback) {
    this.onRpgProfileUpdatedCallbacks.push(cb);
  }
  public onRpgExpeditionResult(cb: RpgExpeditionResultCallback) {
    this.onRpgExpeditionResultCallbacks.push(cb);
  }
  public onRpgBarterUpdated(cb: RpgBarterUpdatedCallback) {
    this.onRpgBarterUpdatedCallbacks.push(cb);
  }
  public onRpgRaidResult(cb: RpgRaidResultCallback) {
    this.onRpgRaidResultCallbacks.push(cb);
  }
  public onRpgRaidHit(cb: RpgRaidHitCallback) {
    this.onRpgRaidHitCallbacks.push(cb);
  }
  public onRpgCheerReceived(cb: RpgCheerReceivedCallback) {
    this.onRpgCheerReceivedCallbacks.push(cb);
  }
  public onRpgActionError(cb: RpgActionErrorCallback) {
    this.onRpgActionErrorCallbacks.push(cb);
  }

  public requestRpgState() {
    this.room?.send("RPG_GET_STATE", {});
  }
  public sendRpgChooseClass(classId: ClassId) {
    this.room?.send("RPG_CHOOSE_CLASS", { classId });
  }
  public sendRpgTrainHero(fpAmount: number) {
    this.room?.send("RPG_TRAIN_HERO", { fpAmount });
  }
  public sendRpgReincarnate(nextClassId?: ClassId, inheritedPassives?: string[]) {
    this.room?.send("RPG_REINCARNATE", { nextClassId, inheritedPassives });
  }
  public sendRpgUpgradeKarma(node: "aptitude" | "shopRank" | "focusEfficiency" | "dimensional") {
    this.room?.send("RPG_UPGRADE_KARMA", { node });
  }
  public sendRpgBuyGear(rank: number, slot: EquipSlot, weaponType?: WeaponType) {
    this.room?.send("RPG_BUY_GEAR", { rank, slot, weaponType });
  }
  public sendRpgEquipItem(itemId: string) {
    this.room?.send("RPG_EQUIP_ITEM", { itemId });
  }
  public sendRpgBlacksmithRarity(targetItemId: string, duplicateItemId: string) {
    this.room?.send("RPG_BLACKSMITH_RARITY", { targetItemId, duplicateItemId });
  }
  public sendRpgBlacksmithTrait(targetItemId: string, sourceItemId: string, traitId: string) {
    this.room?.send("RPG_BLACKSMITH_TRAIT", { targetItemId, sourceItemId, traitId });
  }
  public sendRpgLaunchExpedition(itemId: string, floors: 10 | 50) {
    this.room?.send("RPG_LAUNCH_EXPEDITION", { itemId, floors });
  }
  public sendRpgMergeSpecialists(specId1: string, specId2: string) {
    this.room?.send("RPG_MERGE_SPECIALISTS", { specId1, specId2 });
  }
  public sendRpgSocketSpecialist(specId: string, targetItemId: string) {
    this.room?.send("RPG_SOCKET_SPECIALIST", { specId, targetItemId });
  }
  public sendRpgUnlockStarCap() {
    this.room?.send("RPG_UNLOCK_STAR_CAP", {});
  }
  public sendRpgUpdateCheatShop(payload: Partial<CheatShopState>) {
    this.room?.send("RPG_UPDATE_CHEAT_SHOP", payload);
  }
  public sendRpgUpdateTactics(payload: {
    battleRow?: "FRONT" | "BACK";
    aiRules?: Partial<PlayerAvatarState["aiRules"]>;
    openPartyPool?: boolean;
    recruitOpenPartyAllies?: boolean;
  }) {
    this.room?.send("RPG_UPDATE_TACTICS", payload);
  }
  public sendRpgClaimCampInbox() {
    this.room?.send("RPG_CLAIM_CAMP_INBOX", {});
  }
  public sendRpgLiveCheer(targetUserId: number) {
    this.room?.send("RPG_LIVE_CHEER", { targetUserId });
  }
  public sendRpgPostTrade(payload: {
    kind: "SPECIALIST" | "EQUIPMENT";
    itemId?: string;
    specialistId?: string;
    requestedLabel: string;
    requestedMinLevelOrRank: number;
  }) {
    this.room?.send("RPG_POST_TRADE", payload);
  }
  public sendRpgAcceptTrade(offerId: string, offeredBackItemId: string) {
    this.room?.send("RPG_ACCEPT_TRADE", { offerId, offeredBackItemId });
  }
  public sendRpgCancelTrade(offerId: string) {
    this.room?.send("RPG_CANCEL_TRADE", { offerId });
  }
  public sendRpgAttackRaid() {
    this.room?.send("RPG_ATTACK_RAID", {});
  }

  public getSpacePlayersList(): Array<{
    sessionId: string;
    userId: number;
    name: string;
    color: string;
    focusStatus: string;
    focusSquadId: string;
  }> {
    const out: Array<{
      sessionId: string;
      userId: number;
      name: string;
      color: string;
      focusStatus: string;
      focusSquadId: string;
    }> = [];
    if (!this.room?.state?.players) return out;
    this.room.state.players.forEach((p: any, sid: string) => {
      out.push({
        sessionId: sid,
        userId: Number(p?.userId) || 0,
        name: p?.name || "Player",
        color: p?.color || "#3B8282",
        focusStatus: p?.focusStatus || "idle",
        focusSquadId: p?.focusSquadId || "",
      });
    });
    return out;
  }

  public placeChessBoard(
    x: number,
    y: number,
    passable: boolean = false,
    ontop: boolean = false,
    layer: number = 0
  ) {
    if (this.room) {
      this.room.send("CHESS_BOARD_PLACE", { x, y, passable, ontop, layer });
    }
  }

  public moveChessBoard(chessBoardId: string, x: number, y: number) {
    if (this.room) {
      this.room.send("CHESS_BOARD_MOVE", { chessBoardId, x, y });
    }
  }

  public deleteChessBoard(chessBoardId: string) {
    if (this.room) {
      this.room.send("CHESS_BOARD_DELETE", { chessBoardId });
    }
  }

  public setChessBoardPassable(chessBoardId: string, passable: boolean) {
    if (this.room) {
      this.room.send("CHESS_BOARD_PASSABLE", { chessBoardId, passable });
    }
  }

  public openChessLobby(chessBoardId: string) {
    if (this.room) {
      this.room.send("CHESS_OPEN_LOBBY", { chessBoardId });
    }
  }

  public leaveChessLobby(chessBoardId: string) {
    if (this.room) {
      this.room.send("CHESS_LEAVE_LOBBY", { chessBoardId });
    }
  }

  public createChessMatch(chessBoardId: string) {
    if (this.room) {
      this.room.send("CHESS_CREATE_MATCH", { chessBoardId });
    }
  }

  public joinChessMatch(chessBoardId: string, matchId?: string) {
    if (this.room) {
      this.room.send("CHESS_JOIN_MATCH", { chessBoardId, matchId });
    }
  }

  public cancelChessJoin(chessBoardId: string) {
    if (this.room) {
      this.room.send("CHESS_CANCEL_JOIN", { chessBoardId });
    }
  }

  public spectateChessMatch(chessBoardId: string, matchId: string) {
    if (this.room) {
      this.room.send("CHESS_SPECTATE_MATCH", { chessBoardId, matchId });
    }
  }

  public leaveChessMatch(chessBoardId: string, matchId: string) {
    if (this.room) {
      this.room.send("CHESS_LEAVE_MATCH", { chessBoardId, matchId });
    }
  }

  public sendChessMove(
    chessBoardId: string,
    matchId: string,
    from: string,
    to: string,
    promotion?: "q" | "r" | "b" | "n"
  ) {
    if (this.room) {
      this.room.send("CHESS_MOVE", { chessBoardId, matchId, from, to, promotion });
    }
  }

  public sendChessResign(chessBoardId: string, matchId: string) {
    if (this.room) {
      this.room.send("CHESS_RESIGN", { chessBoardId, matchId });
    }
  }

  public sendChessOfferDraw(chessBoardId: string, matchId: string) {
    if (this.room) {
      this.room.send("CHESS_OFFER_DRAW", { chessBoardId, matchId });
    }
  }

  public sendChessRematch(chessBoardId: string, matchId: string) {
    if (this.room) {
      this.room.send("CHESS_REMATCH", { chessBoardId, matchId });
    }
  }

  public onAquariumsSync(cb: AquariumsSyncCallback) {
    this.onAquariumsSyncCallbacks.push(cb);
  }

  public onAquariumUpdate(cb: AquariumUpdateCallback) {
    this.onAquariumUpdateCallbacks.push(cb);
  }

  public onAquariumDelete(cb: AquariumDeleteCallback) {
    this.onAquariumDeleteCallbacks.push(cb);
  }

  private notifyAquariumsSync(aquariums: AquariumState[]) {
    this.onAquariumsSyncCallbacks.forEach((cb) => {
      try {
        cb(aquariums);
      } catch (err) {
        console.error("Error in onAquariumsSync callback:", err);
      }
    });
  }

  private notifyAquariumUpdate(aquarium: AquariumState) {
    this.onAquariumUpdateCallbacks.forEach((cb) => {
      try {
        cb(aquarium);
      } catch (err) {
        console.error("Error in onAquariumUpdate callback:", err);
      }
    });
  }

  private notifyAquariumDelete(aquariumId: string) {
    this.onAquariumDeleteCallbacks.forEach((cb) => {
      try {
        cb(aquariumId);
      } catch (err) {
        console.error("Error in onAquariumDelete callback:", err);
      }
    });
  }

  public placeAquarium(
    x: number,
    y: number,
    passable: boolean = false,
    ontop: boolean = false,
    layer: number = 0
  ) {
    if (this.room) {
      this.room.send("AQUARIUM_PLACE", { x, y, passable, ontop, layer });
    }
  }

  public moveAquarium(aquariumId: string, x: number, y: number) {
    if (this.room) {
      this.room.send("AQUARIUM_MOVE", { aquariumId, x, y });
    }
  }

  public deleteAquarium(aquariumId: string) {
    if (this.room) {
      this.room.send("AQUARIUM_DELETE", { aquariumId });
    }
  }

  public setAquariumPassable(aquariumId: string, passable: boolean) {
    if (this.room) {
      this.room.send("AQUARIUM_PASSABLE", { aquariumId, passable });
    }
  }

  // ==========================================
  // Seller NPC (Asset Shop Counter) Methods
  // ==========================================
  public onSellerNpcSync(cb: SellerNpcSyncCallback) {
    this.onSellerNpcSyncCallbacks.push(cb);
  }

  private notifySellerNpcSync(sellerNpc: SellerNpcState | null) {
    this.onSellerNpcSyncCallbacks.forEach((cb) => {
      try {
        cb(sellerNpc);
      } catch (err) {
        console.error("Error in onSellerNpcSync callback:", err);
      }
    });
  }

  public placeSellerNpc(payload: SellerNpcPlacePayload) {
    if (this.room) {
      this.room.send("SELLER_NPC_SET", payload);
    }
  }

  public moveSellerNpc(x: number, y: number) {
    if (this.room) {
      this.room.send("SELLER_NPC_MOVE", { x, y });
    }
  }

  public updateSellerNpc(payload: SellerNpcUpdatePayload) {
    if (this.room) {
      this.room.send("SELLER_NPC_UPDATE", payload);
    }
  }

  public deleteSellerNpc() {
    if (this.room) {
      this.room.send("SELLER_NPC_DELETE");
    }
  }

  // ==========================================
  // Throw Battle (Cat vs Dog / Fleabag vs Mutt) Methods
  // ==========================================
  public onThrowBattleInvite(cb: ThrowBattleInviteCallback) {
    this.onThrowBattleInviteCallbacks.push(cb);
  }

  public onThrowBattleChallengeSent(cb: ThrowBattleChallengeSentCallback) {
    this.onThrowBattleChallengeSentCallbacks.push(cb);
  }

  public onThrowBattleChallengeCancelled(cb: ThrowBattleChallengeCancelledCallback) {
    this.onThrowBattleChallengeCancelledCallbacks.push(cb);
  }

  public onThrowBattleRejected(cb: ThrowBattleRejectedCallback) {
    this.onThrowBattleRejectedCallbacks.push(cb);
  }

  public onThrowBattleError(cb: ThrowBattleErrorCallback) {
    this.onThrowBattleErrorCallbacks.push(cb);
  }

  public onThrowBattleStart(cb: ThrowBattleStartCallback) {
    this.onThrowBattleStartCallbacks.push(cb);
  }

  public onThrowBattlePlayerMoved(cb: ThrowBattlePlayerMovedCallback) {
    this.onThrowBattlePlayerMovedCallbacks.push(cb);
  }

  public onThrowBattleAngleStarted(cb: ThrowBattleAngleStartedCallback) {
    this.onThrowBattleAngleStartedCallbacks.push(cb);
  }

  public onThrowBattlePowerStarted(cb: ThrowBattlePowerStartedCallback) {
    this.onThrowBattlePowerStartedCallbacks.push(cb);
  }

  public onThrowBattleThrown(cb: ThrowBattleThrownCallback) {
    this.onThrowBattleThrownCallbacks.push(cb);
  }

  public onThrowBattleNextTurn(cb: ThrowBattleNextTurnCallback) {
    this.onThrowBattleNextTurnCallbacks.push(cb);
  }

  public onThrowBattleGameOver(cb: ThrowBattleGameOverCallback) {
    this.onThrowBattleGameOverCallbacks.push(cb);
  }

  public onThrowBattlePlayerLeft(cb: ThrowBattlePlayerLeftCallback) {
    this.onThrowBattlePlayerLeftCallbacks.push(cb);
  }

  public sendThrowBattleChallenge(targetSessionId: string, hits: number = 20) {
    if (this.room) {
      this.room.send("THROW_BATTLE_CHALLENGE", { targetSessionId, hits });
    }
  }

  public cancelThrowBattleChallenge(targetSessionId: string) {
    if (this.room) {
      this.room.send("THROW_BATTLE_CANCEL_CHALLENGE", { targetSessionId });
    }
  }

  public rejectThrowBattleChallenge(challengerSessionId: string) {
    if (this.room) {
      this.room.send("THROW_BATTLE_REJECT", { challengerSessionId });
    }
  }

  public acceptThrowBattleChallenge(challengerSessionId: string) {
    if (this.room) {
      this.room.send("THROW_BATTLE_ACCEPT", { challengerSessionId });
    }
  }

  public sendThrowBattleMove(matchId: string, x: number) {
    if (this.room) {
      this.room.send("THROW_BATTLE_MOVE", { matchId, x });
    }
  }

  public sendThrowBattleEnterAngle(matchId: string, x: number) {
    if (this.room) {
      this.room.send("THROW_BATTLE_ENTER_ANGLE", { matchId, x });
    }
  }

  public sendThrowBattleLockAngle(matchId: string, angle: number) {
    if (this.room) {
      this.room.send("THROW_BATTLE_LOCK_ANGLE", { matchId, angle });
    }
  }

  public sendThrowBattleThrow(
    matchId: string,
    angle: number,
    power: number,
    wind: number,
    projectileType: string
  ) {
    if (this.room) {
      this.room.send("THROW_BATTLE_THROW", {
        matchId,
        angle,
        power,
        wind,
        projectileType,
      });
    }
  }

  public sendThrowBattleTurnResult(payload: ThrowBattleTurnResultPayload) {
    if (this.room) {
      this.room.send("THROW_BATTLE_TURN_RESULT", payload);
    }
  }

  public sendThrowBattleRematch(matchId: string) {
    if (this.room) {
      this.room.send("THROW_BATTLE_REMATCH", { matchId });
    }
  }

  public sendThrowBattleLeave(matchId: string) {
    if (this.room) {
      this.room.send("THROW_BATTLE_LEAVE", { matchId });
    }
  }

  // ==========================================
  // Diner Dash Restaurant Minigame API
  // ==========================================

  public onDinerState(cb: (state: DinerGameState) => void): () => void {
    this.onDinerStateCallbacks.push(cb);
    if (this.currentDinerState) {
      cb(this.currentDinerState);
    }
    return () => {
      this.onDinerStateCallbacks = this.onDinerStateCallbacks.filter((c) => c !== cb);
    };
  }

  public onDinerError(cb: (err: DinerActionErrorPayload) => void): () => void {
    this.onDinerErrorCallbacks.push(cb);
    return () => {
      this.onDinerErrorCallbacks = this.onDinerErrorCallbacks.filter((c) => c !== cb);
    };
  }

  public onDinerEvent(cb: (ev: DinerEventPayload) => void): () => void {
    this.onDinerEventCallbacks.push(cb);
    return () => {
      this.onDinerEventCallbacks = this.onDinerEventCallbacks.filter((c) => c !== cb);
    };
  }

  public dinerJoinShift() {
    this.room?.send("DINER_JOIN_SHIFT", {});
  }

  public dinerLeaveShift() {
    this.room?.send("DINER_LEAVE_SHIFT", {});
  }

  public dinerSeatCustomer() {
    this.room?.send("DINER_SEAT_CUSTOMER", {});
  }

  public dinerTakeOrder(tableId?: string) {
    this.room?.send("DINER_TAKE_ORDER", { tableId });
  }

  public dinerSubmitOrders() {
    this.room?.send("DINER_SUBMIT_ORDERS", {});
  }

  public dinerPickupFood(orderId?: string) {
    this.room?.send("DINER_PICKUP_FOOD", { orderId });
  }

  public dinerDeliverFood(tableId?: string) {
    this.room?.send("DINER_DELIVER_FOOD", { tableId });
  }
}
