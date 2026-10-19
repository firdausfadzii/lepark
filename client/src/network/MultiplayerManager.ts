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
  private onRoomJoinedCallbacks: (() => void)[] = [];
  public currentTiles: Record<string, string> = {};
  public currentPrivateZones: PrivateZone[] = [];
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

    const isRemoteAccess = host !== "localhost" && host !== "127.0.0.1";
    const isStaleCrossDomain =
      envUrl &&
      typeof envUrl === "string" &&
      isRemoteAccess &&
      !envUrl.includes(host);

    if (envUrl && typeof envUrl === "string" && envUrl.trim().length > 0 && !isStaleCrossDomain) {
      serverUrl = envUrl.trim().replace(/^http:/i, "ws:").replace(/^https:/i, "wss:");
    } else if (window.location.protocol === "http:" && (host === "localhost" || host === "127.0.0.1")) {
      serverUrl = `ws://${host}:2567`;
    } else {
      // Connect to the same origin host via /colyseus proxy (handles HTTPS -> WSS cleanly)
      const portStr =
        window.location.port && window.location.port !== "80" && window.location.port !== "443"
          ? `:${window.location.port}`
          : "";
      serverUrl = `${wsProtocol}//${host}${portStr}/colyseus`;
    }

    this.client = new Client(serverUrl);
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
}
