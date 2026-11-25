import {
  DEFAULT_POMODORO_MINUTES,
  FOCUS_MIN_MINUTES,
  FOCUS_STRICT_AWAY_GRACE_MS,
  FocusLoopState,
  FocusMode,
  FocusRewardBreakdown,
  FocusRoomSessionState,
  FocusRoomStartPayload,
  FocusRoomUpdateSettingsPayload,
  FocusSquadActiveSessionSummary,
  FocusSquadMember,
  PlayerAvatars,
  PlayerOutfit,
  ResolvedFocusTheme,
  calculateFocusPointsReward,
  isValidResolvedFocusTheme,
  resolveSpaceFocusTheme,
} from "shared";
import { findUserById, getSpaceById, recordCompletedFocusSessionInDb } from "../db";
import { focusPointsService } from "./FocusPointsService";
import { rpgService } from "./RpgService";
import { extractPlayerOutfitFromState, squadService } from "./SquadService";

interface InternalFocusParticipant {
  key: string; // `u:${userId}` or `g:${colyseusSessionId}`
  userId: number;
  colyseusSessionId: string;
  username: string;
  name: string;
  color: string;
  avatar?: string | null;
  outfit: PlayerOutfit;
  avatars?: PlayerAvatars | null;
  joinedAt: number;
  mode: FocusMode;
  loopState: Exclude<FocusLoopState, "idle">;
  strictViolated: boolean;
  awayStartedAt: number | null;
  lastReward: FocusRewardBreakdown | null;
}

interface InternalFocusRoomSession {
  key: string; // `personal:${participantKey}` or `squad:${squadId}:${spaceId}`
  roomType: "personal" | "squad";
  squadId: string | null;
  spaceId: string;
  spaceName: string;
  theme: ResolvedFocusTheme;
  isPersonalSpaceFallback: boolean;
  themeSourceSpaceName: string | null;
  initiatorUserId: number;
  initiatorName: string;
  targetMinutes: number;
  roomStartedAt: number;
  endsAt: number;
  coFocusedWithSquad: boolean;
  participants: Map<string, InternalFocusParticipant>;
}

/**
 * Authoritative Pomodoro + Focus Room coordinator supporting Personal and Squad rooms,
 * space-based animated themes (with personal-space fallback to last public space),
 * Strict Lock away detection, and server-side FP calculation.
 */
export class FocusSessionService {
  private static instance: FocusSessionService | null = null;
  private static readonly TICK_MS = 1000;
  private static readonly MAX_MINUTES = 180;
  private static readonly SETTINGS_EDIT_WINDOW_MS = 2 * 60 * 1000;

  private sessions = new Map<string, InternalFocusRoomSession>();
  private participantToSessionKey = new Map<string, string>();
  private tickTimer: NodeJS.Timeout | null = null;

  private constructor() {
    squadService.setFocusLookups(
      (squadId, spaceId) => this.getActiveSquadSummary(squadId, spaceId),
      (userId) => this.getMemberFocusLookup(userId)
    );
    rpgService.setFocusLockChecker((userId) => this.isUserFocusLocked(userId));
  }

  public isUserFocusLocked(userId: number): boolean {
    if (userId <= 0) return false;
    const pKey = `u:${userId}`;
    const sKey = this.participantToSessionKey.get(pKey);
    if (!sKey) return false;
    const session = this.sessions.get(sKey);
    const participant = session?.participants.get(pKey);
    return !!participant && participant.loopState === "focus_locked";
  }

  public static getInstance(): FocusSessionService {
    if (!FocusSessionService.instance) {
      FocusSessionService.instance = new FocusSessionService();
    }
    return FocusSessionService.instance;
  }

  public start(): void {
    if (this.tickTimer) return;
    console.log("[FocusSessionService] Started authoritative Pomodoro & Focus Room service");
    this.tickTimer = setInterval(() => {
      void this.tick();
    }, FocusSessionService.TICK_MS);
  }

  public stop(): void {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
  }

  private makeParticipantKey(userId: number, colyseusSessionId: string): string {
    return userId > 0 ? `u:${userId}` : `g:${colyseusSessionId}`;
  }

  private getMemberFocusLookup(userId: number): { inFocusRoom: boolean; focusStartedAt: number | null } {
    if (userId <= 0) return { inFocusRoom: false, focusStartedAt: null };
    const pKey = `u:${userId}`;
    const sKey = this.participantToSessionKey.get(pKey);
    if (!sKey) return { inFocusRoom: false, focusStartedAt: null };
    const session = this.sessions.get(sKey);
    const participant = session?.participants.get(pKey);
    if (!participant || participant.loopState !== "focus_locked") {
      return { inFocusRoom: false, focusStartedAt: null };
    }
    return {
      inFocusRoom: true,
      focusStartedAt: participant.joinedAt,
    };
  }

  private getActiveSquadSummary(squadId: string, spaceId: string): FocusSquadActiveSessionSummary | null {
    const key = `squad:${squadId}:${spaceId}`;
    const session = this.sessions.get(key);
    if (!session) return null;

    const activeParticipants = Array.from(session.participants.values()).filter(
      (p) => p.loopState === "focus_locked"
    );
    if (activeParticipants.length === 0) return null;

    const starter = session.participants.get(`u:${session.initiatorUserId}`) || activeParticipants[0];
    return {
      spaceId: session.spaceId,
      spaceName: session.spaceName,
      initiatorUserId: session.initiatorUserId,
      initiatorName: session.initiatorName,
      startedAt: session.roomStartedAt,
      targetMinutes: session.targetMinutes,
      mode: starter?.mode || "honor",
      endsAt: session.endsAt,
      participantUserIds: activeParticipants.map((p) => p.userId),
    };
  }

  private clampMinutes(raw: unknown): number {
    const num = Number(raw);
    if (!Number.isFinite(num) || num <= 0) return DEFAULT_POMODORO_MINUTES;
    return Math.max(1, Math.min(FocusSessionService.MAX_MINUTES, Math.round(num)));
  }

  private async resolveThemeForRoom(params: {
    userId: number;
    room: any;
    payload?: FocusRoomStartPayload;
  }): Promise<{
    theme: ResolvedFocusTheme;
    isPersonalSpaceFallback: boolean;
    themeSourceSpaceName: string | null;
  }> {
    const { userId, room, payload } = params;
    const isSuperadminSpace = !!room?.isSuperadminSpace;

    // Personal spaces use the theme of the last public space the player visited
    if (!isSuperadminSpace) {
      if (userId > 0) {
        const userRecord = await findUserById(userId);
        const lastPublicId = userRecord?.last_public_space_id || null;
        if (lastPublicId) {
          const lastPublicSpace = await getSpaceById(lastPublicId);
          if (lastPublicSpace && lastPublicSpace.is_superadmin_space) {
            return {
              theme: resolveSpaceFocusTheme({
                spaceName: lastPublicSpace.name,
                focusTheme: lastPublicSpace.focus_theme,
                fallbackTheme: "lounge",
              }),
              isPersonalSpaceFallback: true,
              themeSourceSpaceName: lastPublicSpace.name,
            };
          }
        }
      }

      if (payload?.themeOverride && isValidResolvedFocusTheme(payload.themeOverride)) {
        return {
          theme: payload.themeOverride,
          isPersonalSpaceFallback: true,
          themeSourceSpaceName: payload.themeSourceSpaceName || null,
        };
      }

      return {
        theme: "lounge",
        isPersonalSpaceFallback: true,
        themeSourceSpaceName: payload?.themeSourceSpaceName || "Cozy Lounge",
      };
    }

    return {
      theme: resolveSpaceFocusTheme({
        spaceName: room?.spaceName,
        focusTheme: room?.spaceFocusTheme,
        tiles: room?.spaceTilesSnapshot,
        fallbackTheme: "park",
      }),
      isPersonalSpaceFallback: false,
      themeSourceSpaceName: null,
    };
  }

  private buildParticipantInfo(params: {
    userId: number;
    colyseusSessionId: string;
    room: any;
    playerState: any;
    mode: FocusMode;
    now: number;
  }): InternalFocusParticipant {
    const { userId, colyseusSessionId, room, playerState, mode, now } = params;
    const onlineSession =
      userId > 0
        ? focusPointsService.getOnlineSessionForUser(userId)
        : focusPointsService.findSessionBySessionId(colyseusSessionId);
    const resolvedRoom = room || onlineSession?.room;
    const avatars: PlayerAvatars | null =
      typeof resolvedRoom?.getPlayerAvatars === "function"
        ? resolvedRoom.getPlayerAvatars(colyseusSessionId)
        : null;
    const avatar: string | null =
      typeof resolvedRoom?.getPlayerAvatar === "function"
        ? resolvedRoom.getPlayerAvatar(colyseusSessionId)
        : null;

    return {
      key: this.makeParticipantKey(userId, colyseusSessionId),
      userId,
      colyseusSessionId,
      username: onlineSession?.username || playerState?.name || `player_${userId || colyseusSessionId.slice(0, 6)}`,
      name: playerState?.name || onlineSession?.username || "Focus Explorer",
      color: playerState?.color || "#3B8282",
      avatar,
      outfit: extractPlayerOutfitFromState(playerState),
      avatars,
      joinedAt: now,
      mode,
      loopState: "focus_locked",
      strictViolated: false,
      awayStartedAt: null,
      lastReward: null,
    };
  }

  private syncParticipantWorldState(
    participant: InternalFocusParticipant,
    status: "idle" | "focusing" | "break",
    endsAt: number
  ): void {
    const sessions =
      participant.userId > 0
        ? focusPointsService.getAllSessionsForUser(participant.userId)
        : (() => {
            const found = focusPointsService.findSessionBySessionId(participant.colyseusSessionId);
            return found ? [found] : [];
          })();

    for (const s of sessions) {
      try {
        s.playerState.focusStatus = status;
        s.playerState.focusEndTime = endsAt;
      } catch {}
    }
  }

  private sendToParticipant(participant: InternalFocusParticipant, type: string, payload: unknown): void {
    if (participant.userId > 0) {
      focusPointsService.sendToUser(participant.userId, type, payload);
      return;
    }
    const found = focusPointsService.findSessionBySessionId(participant.colyseusSessionId);
    if (found) {
      try {
        found.client.send(type, payload);
      } catch {}
    }
  }

  private toParticipantDto(
    p: InternalFocusParticipant,
    session: InternalFocusRoomSession,
    squadLeaderId: number | null
  ): FocusSquadMember {
    const onlineSession =
      p.userId > 0
        ? focusPointsService.getOnlineSessionForUser(p.userId)
        : focusPointsService.findSessionBySessionId(p.colyseusSessionId) || null;

    return {
      userId: p.userId,
      username: p.username,
      name: p.name,
      color: p.color,
      avatar: p.avatar,
      outfit: p.outfit,
      avatars: p.avatars,
      sessionId: p.colyseusSessionId,
      spaceId: session.spaceId,
      spaceName: session.spaceName,
      isLeader: squadLeaderId !== null ? p.userId === squadLeaderId : p.userId === session.initiatorUserId,
      isOnline: !!onlineSession,
      inFocusRoom: p.loopState === "focus_locked",
      focusStartedAt: p.joinedAt,
    };
  }

  private toClientState(session: InternalFocusRoomSession, recipient: InternalFocusParticipant): FocusRoomSessionState {
    const now = Date.now();
    const squadState = session.squadId && recipient.userId > 0
      ? squadService.getSquadStateForUser(recipient.userId)
      : null;
    const squadLeaderId = squadState?.leaderUserId ?? null;

    // Show participants who are still actively focusing, plus recipient if they are in break_reward
    const visibleParticipants = Array.from(session.participants.values()).filter(
      (p) => p.loopState === "focus_locked" || p.key === recipient.key
    );

    const strictAwayRemainingMs =
      recipient.mode === "strict" &&
      recipient.loopState === "focus_locked" &&
      !recipient.strictViolated &&
      recipient.awayStartedAt !== null
        ? Math.max(0, FOCUS_STRICT_AWAY_GRACE_MS - (now - recipient.awayStartedAt))
        : null;

    return {
      loopState: recipient.loopState,
      roomType: session.roomType,
      squadId: session.squadId,
      spaceId: session.spaceId,
      spaceName: session.spaceName,
      theme: session.theme,
      isPersonalSpaceFallback: session.isPersonalSpaceFallback,
      themeSourceSpaceName: session.themeSourceSpaceName,
      mode: recipient.mode,
      targetMinutes: session.targetMinutes,
      roomStartedAt: session.roomStartedAt,
      playerJoinedAt: recipient.joinedAt,
      endsAt: session.endsAt,
      strictViolated: recipient.strictViolated,
      strictAwayRemainingMs,
      participants: visibleParticipants.map((p) => this.toParticipantDto(p, session, squadLeaderId)),
      lastReward: recipient.lastReward,
    };
  }

  private broadcastSessionState(session: InternalFocusRoomSession): void {
    for (const p of session.participants.values()) {
      this.sendToParticipant(p, "FOCUS_ROOM_STATE", this.toClientState(session, p));
    }
  }

  private refreshCoFocusSynergy(session: InternalFocusRoomSession): void {
    if (session.roomType !== "squad") return;
    const activeCount = Array.from(session.participants.values()).filter(
      (p) => p.loopState === "focus_locked"
    ).length;
    if (activeCount >= 2) {
      session.coFocusedWithSquad = true;
    }
  }

  public async startOrJoinFocusRoom(params: {
    userId: number;
    colyseusSessionId: string;
    room: any;
    playerState: any;
    payload?: FocusRoomStartPayload;
  }): Promise<void> {
    this.start();
    const { userId, colyseusSessionId, room, playerState, payload } = params;
    const now = Date.now();
    const pKey = this.makeParticipantKey(userId, colyseusSessionId);
    const spaceId = room?.spaceId || "park";
    const spaceName = room?.spaceName || spaceId;

    // If player is already actively focusing in a session in this space, just resync it idempotently
    const existingSessionKey = this.participantToSessionKey.get(pKey);
    if (existingSessionKey) {
      const existingSession = this.sessions.get(existingSessionKey);
      const existingParticipant = existingSession?.participants.get(pKey);
      if (
        existingSession &&
        existingParticipant &&
        existingSession.spaceId === spaceId &&
        existingParticipant.loopState === "focus_locked"
      ) {
        this.sendToParticipant(existingParticipant, "FOCUS_ROOM_STATE", this.toClientState(existingSession, existingParticipant));
        return;
      }
      // Clean up stale / finished BREAK_REWARD membership before starting a new focus session
      this.removeParticipantFromSession(pKey, false);
    }

    const squadId = userId > 0 ? squadService.getSquadIdForUser(userId) : null;
    const desiredMode: FocusMode = payload?.mode === "strict" ? "strict" : "honor";
    const desiredMinutes = this.clampMinutes(payload?.targetMinutes);

    // 1) If in a squad, check if a Squad Focus Room already exists & is actively running in this same space
    if (squadId) {
      const squadSessionKey = `squad:${squadId}:${spaceId}`;
      const activeSquadRoom = this.sessions.get(squadSessionKey);
      const hasActiveFocusers =
        !!activeSquadRoom &&
        activeSquadRoom.endsAt > now + 2000 &&
        Array.from(activeSquadRoom.participants.values()).some((p) => p.loopState === "focus_locked");

      if (activeSquadRoom && hasActiveFocusers) {
        const participant = this.buildParticipantInfo({
          userId,
          colyseusSessionId,
          room,
          playerState,
          mode: desiredMode,
          now,
        });
        activeSquadRoom.participants.set(pKey, participant);
        this.participantToSessionKey.set(pKey, squadSessionKey);
        this.refreshCoFocusSynergy(activeSquadRoom);
        this.syncParticipantWorldState(participant, "focusing", activeSquadRoom.endsAt);
        this.broadcastSessionState(activeSquadRoom);
        squadService.broadcastSquadState(squadId);
        return;
      }

      // If an old ended BREAK_REWARD squad room lingered here, replace it cleanly
      if (activeSquadRoom) {
        for (const oldP of activeSquadRoom.participants.values()) {
          if (this.participantToSessionKey.get(oldP.key) === squadSessionKey) {
            this.participantToSessionKey.delete(oldP.key);
            this.syncParticipantWorldState(oldP, "idle", 0);
          }
        }
        this.sessions.delete(squadSessionKey);
      }
    }

    // 2) Create new Personal or Squad Focus Room
    const themeInfo = await this.resolveThemeForRoom({ userId, room, payload });
    const participant = this.buildParticipantInfo({
      userId,
      colyseusSessionId,
      room,
      playerState,
      mode: desiredMode,
      now,
    });

    const sessionKey = squadId ? `squad:${squadId}:${spaceId}` : `personal:${pKey}`;
    const endsAt = now + desiredMinutes * 60_000;

    const newSession: InternalFocusRoomSession = {
      key: sessionKey,
      roomType: squadId ? "squad" : "personal",
      squadId,
      spaceId,
      spaceName,
      theme: themeInfo.theme,
      isPersonalSpaceFallback: themeInfo.isPersonalSpaceFallback,
      themeSourceSpaceName: themeInfo.themeSourceSpaceName,
      initiatorUserId: userId,
      initiatorName: participant.name,
      targetMinutes: desiredMinutes,
      roomStartedAt: now,
      endsAt,
      coFocusedWithSquad: false,
      participants: new Map([[pKey, participant]]),
    };

    this.sessions.set(sessionKey, newSession);
    this.participantToSessionKey.set(pKey, sessionKey);
    this.syncParticipantWorldState(participant, "focusing", endsAt);
    this.broadcastSessionState(newSession);

    if (squadId) {
      squadService.broadcastNotice(
        squadId,
        `${participant.name} opened the Party Focus Room in ${spaceName} (${desiredMinutes}m). Go idle or click Join to focus together!`,
        "info"
      );
      squadService.broadcastSquadState(squadId);
    }
  }

  public updateSettings(
    userId: number,
    colyseusSessionId: string,
    payload: FocusRoomUpdateSettingsPayload
  ): { success: boolean; error?: string } {
    const pKey = this.makeParticipantKey(userId, colyseusSessionId);
    const sKey = this.participantToSessionKey.get(pKey);
    if (!sKey) return { success: false, error: "Not in an active Focus Room." };

    const session = this.sessions.get(sKey);
    const participant = session?.participants.get(pKey);
    if (!session || !participant || participant.loopState !== "focus_locked") {
      return { success: false, error: "No active Pomodoro session to update." };
    }

    const now = Date.now();
    const withinGrace = now - participant.joinedAt <= FocusSessionService.SETTINGS_EDIT_WINDOW_MS;

    if (payload.mode === "strict" || payload.mode === "honor") {
      if (payload.mode === "honor" && participant.mode === "strict" && !withinGrace) {
        return { success: false, error: "Strict Lock cannot be disabled after the first 2 minutes." };
      }
      participant.mode = payload.mode;
      if (payload.mode === "honor") {
        participant.awayStartedAt = null;
      }
    }

    if (payload.targetMinutes !== undefined) {
      const squadState = session.squadId && userId > 0 ? squadService.getSquadStateForUser(userId) : null;
      const canEditDuration =
        session.roomType === "personal" ||
        userId === session.initiatorUserId ||
        squadState?.leaderUserId === userId;

      if (!canEditDuration) {
        return { success: false, error: "Only the Party Focus starter or leader can change the room timer." };
      }
      if (now - session.roomStartedAt > FocusSessionService.SETTINGS_EDIT_WINDOW_MS) {
        return { success: false, error: "Timer preset can only be changed during the first 2 minutes." };
      }

      const nextMinutes = this.clampMinutes(payload.targetMinutes);
      const nextEndsAt = session.roomStartedAt + nextMinutes * 60_000;
      if (nextEndsAt <= now + 5000) {
        return { success: false, error: "Selected duration has already elapsed." };
      }
      session.targetMinutes = nextMinutes;
      session.endsAt = nextEndsAt;
      for (const p of session.participants.values()) {
        if (p.loopState === "focus_locked") {
          this.syncParticipantWorldState(p, "focusing", nextEndsAt);
        }
      }
    }

    this.broadcastSessionState(session);
    if (session.squadId) {
      squadService.broadcastSquadState(session.squadId);
    }
    return { success: true };
  }

  public reportVisibility(userId: number, colyseusSessionId: string, hidden: boolean): void {
    const pKey = this.makeParticipantKey(userId, colyseusSessionId);
    const sKey = this.participantToSessionKey.get(pKey);
    if (!sKey) return;

    const session = this.sessions.get(sKey);
    const participant = session?.participants.get(pKey);
    if (!session || !participant || participant.loopState !== "focus_locked") return;

    if (participant.mode !== "strict" || participant.strictViolated) {
      participant.awayStartedAt = null;
      return;
    }

    if (hidden) {
      if (participant.awayStartedAt === null) {
        participant.awayStartedAt = Date.now();
        this.sendToParticipant(participant, "FOCUS_ROOM_STATE", this.toClientState(session, participant));
      }
    } else if (participant.awayStartedAt !== null) {
      participant.awayStartedAt = null;
      this.sendToParticipant(participant, "FOCUS_ROOM_STATE", this.toClientState(session, participant));
    }
  }

  public async endEarly(userId: number, colyseusSessionId: string): Promise<void> {
    const pKey = this.makeParticipantKey(userId, colyseusSessionId);
    const sKey = this.participantToSessionKey.get(pKey);
    if (!sKey) return;

    const session = this.sessions.get(sKey);
    const participant = session?.participants.get(pKey);
    if (!session || !participant || participant.loopState !== "focus_locked") return;

    await this.finalizeParticipantSession(session, participant, false, Date.now());
  }

  public exitRoom(userId: number, colyseusSessionId: string): void {
    const pKey = this.makeParticipantKey(userId, colyseusSessionId);
    this.removeParticipantFromSession(pKey, true);
  }

  public handleRoomLeave(userId: number, colyseusSessionId: string): void {
    const pKey = this.makeParticipantKey(userId, colyseusSessionId);
    this.removeParticipantFromSession(pKey, false);
  }

  private removeParticipantFromSession(pKey: string, notifyClient: boolean): void {
    const sKey = this.participantToSessionKey.get(pKey);
    if (!sKey) {
      if (notifyClient) {
        const uid = pKey.startsWith("u:") ? Number(pKey.slice(2)) : 0;
        const sid = pKey.startsWith("g:") ? pKey.slice(2) : "";
        if (uid > 0) focusPointsService.sendToUser(uid, "FOCUS_ROOM_STATE", null);
        else if (sid) focusPointsService.findSessionBySessionId(sid)?.client.send("FOCUS_ROOM_STATE", null);
      }
      return;
    }

    this.participantToSessionKey.delete(pKey);
    const session = this.sessions.get(sKey);
    if (!session) return;

    const participant = session.participants.get(pKey);
    if (participant) {
      this.syncParticipantWorldState(participant, "idle", 0);
      session.participants.delete(pKey);
      if (notifyClient) {
        this.sendToParticipant(participant, "FOCUS_ROOM_STATE", null);
      }
    }

    if (session.participants.size === 0) {
      this.sessions.delete(sKey);
    } else {
      this.broadcastSessionState(session);
    }

    if (session.squadId) {
      squadService.broadcastSquadState(session.squadId);
    }
  }

  private async finalizeParticipantSession(
    session: InternalFocusRoomSession,
    participant: InternalFocusParticipant,
    isCompleted: boolean,
    now: number
  ): Promise<void> {
    if (participant.loopState !== "focus_locked") return;

    const rawElapsedMinutes = isCompleted
      ? Math.min(session.targetMinutes, Math.max(0, (session.endsAt - participant.joinedAt) / 60_000))
      : Math.max(0, (now - participant.joinedAt) / 60_000);

    // Note: if a squad member auto-joined and stayed until the natural end of the room timer
    // cleanly, honor >= 1 min minimum? Wait: GDD requires >= 10 mins to prevent 1-min farming,
    // EXCEPT let's enforce the exact shared calculateFocusPointsReward >= 10 min rule!
    const hasSquadSynergy = session.roomType === "squad" && session.coFocusedWithSquad;
    let breakdown: FocusRewardBreakdown;

    if (participant.userId > 0) {
      const focusUpgradeRank = await rpgService.getFocusEfficiencyRank(participant.userId);
      const dbResult = await recordCompletedFocusSessionInDb({
        userId: participant.userId,
        elapsedMinutes: rawElapsedMinutes,
        targetMinutes: session.targetMinutes,
        isCompleted,
        isStrictMode: participant.mode === "strict",
        strictViolated: participant.strictViolated,
        hasSquadSynergy,
        focusUpgradeRank,
      });

      if (dbResult) {
        breakdown = dbResult.breakdown;
        focusPointsService.updateUserPoints(
          participant.userId,
          dbResult.stats.focusPoints,
          breakdown.totalFpEarned,
          dbResult.stats
        );
        if (session.squadId && breakdown.totalFpEarned > 0) {
          const squadMembers = squadService.getSquadMemberIds(session.squadId);
          void rpgService.grantSquadCheerCarePackages(
            participant.userId,
            participant.name,
            squadMembers,
            breakdown.totalFpEarned
          );
          const activeUserIds = Array.from(session.participants.values())
            .map((p) => p.userId)
            .filter((id) => id > 0);
          rpgService.recordCoFocusSession(activeUserIds, breakdown.elapsedMinutes);
        }
      } else {
        const core = calculateFocusPointsReward({
          elapsedMinutes: rawElapsedMinutes,
          targetMinutes: session.targetMinutes,
          isCompleted,
          isStrictMode: participant.mode === "strict",
          strictViolated: participant.strictViolated,
          streakDays: 0,
          hasSquadSynergy,
          isFirstSessionToday: false,
          priorDailyFocusMinutes: 0,
        });
        breakdown = {
          ...core,
          newTotalFp: 0,
          streakDays: 0,
          freezeShields: 2,
          dailyFocusMinutes: 0,
        };
      }
    } else {
      // Guest session: compute preview without DB persistence
      const core = calculateFocusPointsReward({
        elapsedMinutes: rawElapsedMinutes,
        targetMinutes: session.targetMinutes,
        isCompleted,
        isStrictMode: participant.mode === "strict",
        strictViolated: participant.strictViolated,
        streakDays: 0,
        hasSquadSynergy,
        isFirstSessionToday: false,
        priorDailyFocusMinutes: 0,
      });
      breakdown = {
        ...core,
        totalFpEarned: 0,
        newTotalFp: 0,
        streakDays: 0,
        freezeShields: 2,
        dailyFocusMinutes: 0,
      };
    }

    participant.loopState = "break_reward";
    participant.awayStartedAt = null;
    participant.lastReward = breakdown;

    this.syncParticipantWorldState(participant, "break", 0);
    this.sendToParticipant(participant, "FOCUS_SESSION_COMPLETED", {
      breakdown,
      roomType: session.roomType,
      theme: session.theme,
      spaceName: session.spaceName,
      isGuest: participant.userId <= 0,
    });

    this.broadcastSessionState(session);
    if (session.squadId) {
      squadService.broadcastSquadState(session.squadId);
    }
  }

  private async tick(): Promise<void> {
    const now = Date.now();
    for (const session of Array.from(this.sessions.values())) {
      let stateDirty = false;
      const completingParticipants: InternalFocusParticipant[] = [];

      for (const participant of session.participants.values()) {
        if (participant.loopState !== "focus_locked") continue;

        // Check Strict Lock > 30 consecutive seconds away
        if (
          participant.mode === "strict" &&
          !participant.strictViolated &&
          participant.awayStartedAt !== null
        ) {
          const awayMs = now - participant.awayStartedAt;
          if (awayMs >= FOCUS_STRICT_AWAY_GRACE_MS) {
            participant.strictViolated = true;
            participant.awayStartedAt = null;
            stateDirty = true;
            this.sendToParticipant(participant, "FOCUS_STRICT_VIOLATED", {
              graceSeconds: Math.round(FOCUS_STRICT_AWAY_GRACE_MS / 1000),
            });
          }
        }

        if (now >= session.endsAt) {
          completingParticipants.push(participant);
        }
      }

      if (completingParticipants.length > 0) {
        for (const p of completingParticipants) {
          await this.finalizeParticipantSession(session, p, true, now);
        }
      } else if (stateDirty) {
        this.broadcastSessionState(session);
      }
    }
  }
}

export const focusSessionService = FocusSessionService.getInstance();
