import { Client, Room } from "colyseus.js";
import { SnapshotInterpolation } from "@geckos.io/snapshot-interpolation";
import {
  PlayerInputPayload,
  PlayerJoinOptions,
  PlayerAvatars,
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
} from "shared";

export interface NetworkStats {
  pingMs: number;
  packetLoss: number;
}
export type PlayerChangeCallback = (sessionId: string, player: any) => void;
export type PlayerRemoveCallback = (sessionId: string) => void;
export type PlayerAvatarCallback = (sessionId: string, avatars: PlayerAvatars | null) => void;
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
export type ChessLobbyStateCallback = (state: ChessLobbyState) => void;
export type ChessGameStateCallback = (state: ChessGameState) => void;
export type ChessGameStartCallback = (state: ChessGameState) => void;
export type ChessGameEndedCallback = (state: ChessGameState) => void;

export class MultiplayerManager {
  private client!: Client;
  public room: Room | null = null;
  public si = new SnapshotInterpolation(SERVER_TICK_RATE);

  private onPlayerAddCallbacks: PlayerChangeCallback[] = [];
  private onPlayerChangeCallbacks: PlayerChangeCallback[] = [];
  private onPlayerRemoveCallbacks: PlayerRemoveCallback[] = [];
  private onConnectionStatusCallbacks: ((connected: boolean) => void)[] = [];
  private onPlayerCountCallbacks: ((count: number) => void)[] = [];
  private onPlayerAvatarCallbacks: PlayerAvatarCallback[] = [];
  private onNetworkStatsCallbacks: NetworkStatsCallback[] = [];
  private onTilesUpdateCallbacks: TilesUpdateCallback[] = [];
  private onPrivateZonesUpdateCallbacks: PrivateZonesUpdateCallback[] = [];
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
  private onChessLobbyStateCallbacks: ChessLobbyStateCallback[] = [];
  private onChessGameStateCallbacks: ChessGameStateCallback[] = [];
  private onChessGameStartCallbacks: ChessGameStartCallback[] = [];
  private onChessGameEndedCallbacks: ChessGameEndedCallback[] = [];
  public currentTiles: Record<string, string> = {};
  public currentPrivateZones: PrivateZone[] = [];
  public currentJukeboxes: Map<string, JukeboxState> = new Map();
  public currentTypewriters: Map<string, TypewriterState> = new Map();
  public currentAshtrays: Map<string, AshtrayState> = new Map();
  public currentChessBoards: Map<string, ChessBoardState> = new Map();
  public playerAvatarsMap = new Map<string, PlayerAvatars>();

  private pingTimer: number | null = null;
  private pingSeq = 0;
  private recentPings: { seq: number; sentAt: number; received: boolean }[] = [];
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

  public leave() {
    this.stopPingLoop();
    this.playerAvatarsMap.clear();
    this.currentTiles = {};
    this.currentPrivateZones = [];
    this.currentTypewriters.clear();
    this.currentAshtrays.clear();
    if (this.room) {
      try {
        this.room.leave();
      } catch (err) {
        console.warn("Error leaving room:", err);
      }
      this.room = null;
    }
    this.notifyConnectionStatus(false);
  }

  public async joinGame(options: PlayerJoinOptions): Promise<Room> {
    try {
      this.currentSpaceId = options.spaceId || "space_central_plaza";
      // Use schema reflection (no root class) — passing `GameState` from `shared`
      // pulls in a second @colyseus/schema instance and breaks decoding ("refId not found").
      this.room = await this.client.joinOrCreate("game_room", options);
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
      const rtt = Math.max(1, now - data.t);
      const record = this.recentPings.find((p) => p.seq === data.seq);
      if (record) {
        record.received = true;
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

    this.startPingLoop();

    this.room.onLeave((code) => {
      console.warn("Left room with code:", code);
      this.stopPingLoop();
      this.notifyConnectionStatus(false);
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

        player.onChange(() => {
          this.notifyPlayerChange(sessionId, player);
        });
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

  public updateProfile(name: string, color: string, avatars?: PlayerAvatars | null) {
    if (this.room) {
      this.room.send("UPDATE_PROFILE", { name, color, avatars });
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

  public onConnectionStatus(cb: (connected: boolean) => void) {
    this.onConnectionStatusCallbacks.push(cb);
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

    try {
      this.room.send("PING", { seq, t: now });
    } catch {
      // Room disconnected
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

    let displayPing = latestPing;
    if (displayPing === undefined) {
      const lastReceived = [...this.recentPings].reverse().find((p) => p.received);
      displayPing = lastReceived ? Math.max(1, now - lastReceived.sentAt) : 0;
    }

    const stats: NetworkStats = {
      pingMs: Math.round(displayPing),
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

  public sendUpdatePrivateZones(zones: PrivateZone[]) {
    if (this.room) {
      this.room.send("UPDATE_PRIVATE_ZONES", { zones });
    }
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

  public skipJukeboxTrack(jukeboxId: string) {
    if (this.room) {
      this.room.send("JUKEBOX_SKIP_TRACK", { jukeboxId });
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
}
