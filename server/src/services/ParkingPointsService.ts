import { Client } from "colyseus";
import { PlayerState } from "shared";
import { addParkingPoints, getUserParkingPoints } from "../db";

export interface ConnectedPlayerSession {
  sessionId: string;
  client: Client;
  room: any;
  playerState: PlayerState;
}

export interface PlayerOnlineTracker {
  key: string;
  userId: number;
  currentPoints: number;
  accumulatedMs: number;
  lastActiveTime: number;
  disconnectedAt: number | null;
  sessions: Map<string, ConnectedPlayerSession>;
}

export class ParkingPointsService {
  private static instance: ParkingPointsService | null = null;

  // Default is 10 minutes (600,000 ms). Configurable via environment variable for testing.
  public static readonly REQUIRED_ONLINE_MS: number = process.env.ONLINE_POINT_INTERVAL_MS
    ? parseInt(process.env.ONLINE_POINT_INTERVAL_MS, 10)
    : 10 * 60 * 1000;

  // Grace period (5 minutes) to keep accumulated online time alive if disconnected briefly / switching spaces
  public static readonly GRACE_PERIOD_MS: number = 5 * 60 * 1000;

  private trackers: Map<string, PlayerOnlineTracker> = new Map();
  private sessionToKeyMap: Map<string, string> = new Map();
  private intervalTimer: NodeJS.Timeout | null = null;

  public static getInstance(): ParkingPointsService {
    if (!ParkingPointsService.instance) {
      ParkingPointsService.instance = new ParkingPointsService();
    }
    return ParkingPointsService.instance;
  }

  public start(): void {
    if (this.intervalTimer) return;
    this.intervalTimer = setInterval(() => {
      this.tick();
    }, 1000);
    console.log(
      `[ParkingPointsService] Started online tracking service (Award interval: ${ParkingPointsService.REQUIRED_ONLINE_MS / 1000}s)`
    );
  }

  public stop(): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }

  private getKey(userId: number, sessionId: string): string {
    if (userId && userId > 0) {
      return `user_${userId}`;
    }
    return `session_${sessionId}`;
  }

  /**
   * Register a player joining a space/room.
   */
  public async registerClient(params: {
    userId: number;
    sessionId: string;
    client: Client;
    room: any;
    playerState: PlayerState;
  }): Promise<void> {
    const { userId, sessionId, client, room, playerState } = params;
    const key = this.getKey(userId, sessionId);
    const now = Date.now();

    let tracker = this.trackers.get(key);

    if (!tracker) {
      // Determine initial points (from DB if userId available, else 0)
      let initialPoints = 0;
      if (userId > 0) {
        try {
          initialPoints = await getUserParkingPoints(userId);
        } catch {
          initialPoints = 0;
        }
      }

      tracker = {
        key,
        userId,
        currentPoints: initialPoints,
        accumulatedMs: 0,
        lastActiveTime: now,
        disconnectedAt: null,
        sessions: new Map(),
      };
      this.trackers.set(key, tracker);
    } else {
      // Reconnected or joined another space
      tracker.disconnectedAt = null;
      tracker.lastActiveTime = now;
    }

    // Ensure playerState in room matches tracker's current points
    playerState.parkingPoints = tracker.currentPoints;

    tracker.sessions.set(sessionId, {
      sessionId,
      client,
      room,
      playerState,
    });
    this.sessionToKeyMap.set(sessionId, key);
    console.log(
      `[ParkingPointsService] Registered ${key} (${sessionId}). Points: ${tracker.currentPoints}, Active: ${tracker.sessions.size}`
    );
  }

  /**
   * Unregister a client session when leaving a space.
   */
  public unregisterClient(sessionId: string): void {
    const key = this.sessionToKeyMap.get(sessionId);
    if (!key) return;

    this.sessionToKeyMap.delete(sessionId);
    const tracker = this.trackers.get(key);
    if (!tracker) return;

    tracker.sessions.delete(sessionId);
    console.log(
      `[ParkingPointsService] Unregistered ${key} (${sessionId}). Remaining active sessions: ${tracker.sessions.size}`
    );

    // If no active sessions remain, record disconnect time for grace period
    if (tracker.sessions.size === 0) {
      tracker.disconnectedAt = Date.now();
    }
  }

  /**
   * Unregister all sessions belonging to a disposed room.
   */
  public unregisterRoom(room: any): void {
    for (const [sessionId, key] of this.sessionToKeyMap.entries()) {
      const tracker = this.trackers.get(key);
      if (tracker && tracker.sessions.has(sessionId)) {
        const session = tracker.sessions.get(sessionId);
        if (session && session.room === room) {
          tracker.sessions.delete(sessionId);
          this.sessionToKeyMap.delete(sessionId);
          if (tracker.sessions.size === 0) {
            tracker.disconnectedAt = Date.now();
          }
        }
      }
    }
  }

  /**
   * Lightweight 1-second tick:
   * Optimized in-memory loop - zero DB calls and zero network packets while waiting.
   */
  private tick(): void {
    const now = Date.now();

    for (const [key, tracker] of this.trackers.entries()) {
      if (tracker.sessions.size > 0) {
        // Player has at least 1 active connection: accumulate online time
        const elapsed = now - tracker.lastActiveTime;
        tracker.lastActiveTime = now;
        tracker.accumulatedMs += elapsed;

        if (tracker.accumulatedMs >= ParkingPointsService.REQUIRED_ONLINE_MS) {
          tracker.accumulatedMs -= ParkingPointsService.REQUIRED_ONLINE_MS;
          this.awardPoint(tracker);
        }
      } else {
        // Player is offline: do not accumulate time.
        // Check if grace period expired to prevent memory leaks
        if (tracker.disconnectedAt && now - tracker.disconnectedAt > ParkingPointsService.GRACE_PERIOD_MS) {
          this.trackers.delete(key);
        }
      }
    }
  }

  /**
   * Award 1 parking point to player upon completing 10 minutes online.
   */
  private awardPoint(tracker: PlayerOnlineTracker): void {
    tracker.currentPoints += 1;
    const newPoints = tracker.currentPoints;

    console.log(
      `[ParkingPointsService] Awarded 1 Parking Point to ${tracker.key} (Total: ${newPoints} Parking)`
    );

    // 1. Asynchronously persist to database in background (no blocking, zero ping impact)
    if (tracker.userId > 0) {
      addParkingPoints(tracker.userId, 1).catch((err: any) => {
        console.error(`[ParkingPointsService] Failed to persist parking point for user ${tracker.userId}:`, err);
      });
    }

    // 2. Update playerState in all active rooms and notify connected client(s)
    for (const session of tracker.sessions.values()) {
      try {
        session.playerState.parkingPoints = newPoints;
        session.client.send("PARKING_POINTS_AWARDED", {
          points: newPoints,
          added: 1,
        });
      } catch (err) {
        // Safe catch in case socket closed
      }
    }
  }

  /**
   * Update points for active sessions of a user (e.g. after skin unlock deduction)
   */
  public updateUserPoints(userId: number, newPoints: number): void {
    const key = `user_${userId}`;
    const tracker = this.trackers.get(key);
    if (tracker) {
      tracker.currentPoints = newPoints;
      for (const session of tracker.sessions.values()) {
        try {
          session.playerState.parkingPoints = newPoints;
          session.client.send("PARKING_POINTS_AWARDED", {
            points: newPoints,
            added: 0,
          });
        } catch (err) {
          // Safe catch
        }
      }
    }
  }

  /**
   * Get current points for a tracker (if active)
   */
  public getActivePoints(userId: number, sessionId: string): number | null {
    const key = this.getKey(userId, sessionId);
    const tracker = this.trackers.get(key);
    return tracker ? tracker.currentPoints : null;
  }
}

export const parkingPointsService = ParkingPointsService.getInstance();
