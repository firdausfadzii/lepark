import { Client } from "colyseus";
import { FocusStats } from "shared";
import { getUserFocusPoints } from "../db";

export interface OnlineUserSession {
  client: Client;
  room: any;
  playerState: any;
  sessionId: string;
  userId: number;
  username: string;
}

interface UserFocusTracker {
  userId: number;
  username: string;
  key: string;
  disconnectedAt: number | null;
  currentPoints: number;
  sessions: Map<string, OnlineUserSession>;
}

/**
 * Singleton service tracking online player sessions across Colyseus rooms
 * and broadcasting authoritative Focus Points (FP) updates.
 */
export class FocusPointsService {
  private static instance: FocusPointsService | null = null;
  private static readonly GRACE_PERIOD_MS = 30 * 1000;
  private static readonly TICK_INTERVAL_MS = 10000;

  private trackers = new Map<string, UserFocusTracker>();
  private sessionToUserKey = new Map<string, string>();
  private tickInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  public static getInstance(): FocusPointsService {
    if (!FocusPointsService.instance) {
      FocusPointsService.instance = new FocusPointsService();
    }
    return FocusPointsService.instance;
  }

  public start(): void {
    if (this.tickInterval) return;
    console.log("[FocusPointsService] Started online session tracking service");
    this.tickInterval = setInterval(() => this.cleanupExpiredTrackers(), FocusPointsService.TICK_INTERVAL_MS);
  }

  public stop(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  public async registerClient(params: {
    userId: number;
    username?: string;
    sessionId: string;
    client: Client;
    room: any;
    playerState: any;
    initialPoints?: number;
  }): Promise<void> {
    const {
      userId,
      username,
      sessionId,
      client,
      room,
      playerState,
      initialPoints: providedInitialPoints,
    } = params;
    const isRealUser = userId > 0;
    const key = isRealUser ? `user:${userId}` : `guest:${sessionId}`;
    const resolvedUsername = username || playerState?.name || `player_${sessionId.slice(0, 6)}`;

    let tracker = this.trackers.get(key);

    if (!tracker) {
      let initialPoints = typeof providedInitialPoints === "number" ? providedInitialPoints : 0;
      if (isRealUser && typeof providedInitialPoints !== "number") {
        try {
          initialPoints = await getUserFocusPoints(userId);
        } catch (err) {
          console.warn(`[FocusPointsService] Could not fetch initial FP for user ${userId}:`, err);
        }
      }

      tracker = {
        userId,
        username: resolvedUsername,
        key,
        disconnectedAt: null,
        currentPoints: initialPoints,
        sessions: new Map(),
      };
      this.trackers.set(key, tracker);
    } else {
      tracker.disconnectedAt = null;
      if (username) tracker.username = username;
      if (typeof providedInitialPoints === "number") {
        tracker.currentPoints = Math.max(tracker.currentPoints, providedInitialPoints);
      }
    }

    tracker.sessions.set(sessionId, {
      client,
      room,
      playerState,
      sessionId,
      userId,
      username: tracker.username,
    });
    this.sessionToUserKey.set(sessionId, key);

    playerState.focusPoints = tracker.currentPoints;
    this.start();

    console.log(
      `[FocusPointsService] Registered ${key} (${sessionId}) in ${room?.spaceId || "unknown"}. FP: ${tracker.currentPoints}, Sessions: ${tracker.sessions.size}`
    );
  }

  public unregisterClient(sessionId: string): void {
    const key = this.sessionToUserKey.get(sessionId);
    if (!key) return;

    this.sessionToUserKey.delete(sessionId);
    const tracker = this.trackers.get(key);
    if (!tracker) return;

    tracker.sessions.delete(sessionId);

    if (tracker.sessions.size === 0) {
      if (tracker.userId <= 0) {
        this.trackers.delete(key);
      } else {
        tracker.disconnectedAt = Date.now();
      }
    }
  }

  public unregisterRoom(room: any): void {
    for (const tracker of this.trackers.values()) {
      for (const [sessionId, session] of tracker.sessions.entries()) {
        if (session.room === room) {
          this.unregisterClient(sessionId);
        }
      }
    }
  }

  private cleanupExpiredTrackers(): void {
    const now = Date.now();
    for (const [key, tracker] of this.trackers.entries()) {
      if (tracker.sessions.size === 0 && tracker.disconnectedAt) {
        if (now - tracker.disconnectedAt > FocusPointsService.GRACE_PERIOD_MS) {
          this.trackers.delete(key);
        }
      }
    }
  }

  public updateUserPoints(userId: number, newPoints: number, addedPoints = 0, stats?: FocusStats): void {
    const tracker = this.trackers.get(`user:${userId}`);
    if (!tracker) return;

    tracker.currentPoints = newPoints;
    for (const session of tracker.sessions.values()) {
      try {
        session.playerState.focusPoints = newPoints;
        if (addedPoints !== 0 || stats) {
          session.client.send("FOCUS_POINTS_UPDATED", {
            added: addedPoints,
            totalPoints: newPoints,
            ...(stats ? { stats } : {}),
          });
        }
      } catch (err) {
        console.warn(`[FocusPointsService] Failed syncing FP to session ${session.sessionId}:`, err);
      }
    }
  }

  public getActivePoints(userId: number, _sessionId?: string): number | null {
    const tracker = this.trackers.get(`user:${userId}`);
    return tracker ? tracker.currentPoints : null;
  }

  public getOnlineSessionForUser(userId: number): OnlineUserSession | null {
    if (!userId || userId <= 0) return null;
    const tracker = this.trackers.get(`user:${userId}`);
    if (!tracker || tracker.sessions.size === 0) return null;
    let latest: OnlineUserSession | null = null;
    for (const session of tracker.sessions.values()) {
      latest = session;
    }
    return latest;
  }

  public getAllSessionsForUser(userId: number): OnlineUserSession[] {
    if (!userId || userId <= 0) return [];
    const tracker = this.trackers.get(`user:${userId}`);
    if (!tracker) return [];
    return Array.from(tracker.sessions.values());
  }

  public sendToUser(userId: number, type: string, payload: unknown): boolean {
    const sessions = this.getAllSessionsForUser(userId);
    if (sessions.length === 0) return false;
    let delivered = false;
    for (const session of sessions) {
      try {
        session.client.send(type, payload);
        delivered = true;
      } catch (err) {
        console.warn(`[FocusPointsService] Failed sending ${type} to user ${userId}:`, err);
      }
    }
    return delivered;
  }

  public getOnlineUserInfo(userId: number): {
    sessionId: string;
    spaceId: string;
    name: string;
    color: string;
    isSuperadmin: boolean;
    avatar: string | null;
  } | null {
    const session = this.getOnlineSessionForUser(userId);
    if (!session) return null;
    const avatar =
      typeof session.room?.getPlayerAvatar === "function"
        ? session.room.getPlayerAvatar(session.sessionId)
        : null;
    return {
      sessionId: session.sessionId,
      spaceId: session.room?.spaceId || "space_central_plaza",
      name: session.playerState?.name || "Player",
      color: session.playerState?.color || "#3b82f6",
      isSuperadmin: !!session.playerState?.isSuperadmin,
      avatar,
    };
  }

  public findSessionBySessionId(sessionId: string): OnlineUserSession | null {
    const key = this.sessionToUserKey.get(sessionId);
    if (!key) return null;
    const tracker = this.trackers.get(key);
    if (!tracker) return null;
    return tracker.sessions.get(sessionId) || null;
  }

  public getOnlineUsersInSpace(spaceId: string): Array<{ userId: number; session: OnlineUserSession }> {
    const result: Array<{ userId: number; session: OnlineUserSession }> = [];
    for (const tracker of this.trackers.values()) {
      if (tracker.userId <= 0) continue;
      for (const session of tracker.sessions.values()) {
        if (session.room?.spaceId === spaceId) {
          result.push({ userId: tracker.userId, session });
          break;
        }
      }
    }
    return result;
  }
}

export const focusPointsService = FocusPointsService.getInstance();
