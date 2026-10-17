import { Client, Room } from "colyseus.js";
import { SnapshotInterpolation } from "@geckos.io/snapshot-interpolation";
import { PlayerInputPayload, PlayerJoinOptions, PlayerAvatars, SERVER_TICK_RATE } from "shared";

export interface NetworkStats {
  pingMs: number;
  packetLoss: number;
}
export type PlayerChangeCallback = (sessionId: string, player: any) => void;
export type PlayerRemoveCallback = (sessionId: string) => void;
export type PlayerAvatarCallback = (sessionId: string, avatars: PlayerAvatars | null) => void;
export type NetworkStatsCallback = (stats: NetworkStats) => void;

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
  public playerAvatarsMap = new Map<string, PlayerAvatars>();

  private pingTimer: number | null = null;
  private pingSeq = 0;
  private recentPings: { seq: number; sentAt: number; received: boolean }[] = [];
  private readonly MAX_PING_HISTORY = 15;

  constructor() {
    const wsProtocol =
      typeof window !== "undefined" && window.location.protocol === "https:"
        ? "wss:"
        : "ws:";
    const host =
      typeof window !== "undefined" && window.location.hostname
        ? window.location.hostname
        : "localhost";
    const serverUrl = `${wsProtocol}//${host}:2567`;
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
}
