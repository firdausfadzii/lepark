import {
  DEFAULT_PLAYER_OUTFIT,
  FOCUS_SQUAD_MAX_MEMBERS,
  FocusSquadActiveSessionSummary,
  FocusSquadInviteData,
  FocusSquadMember,
  FocusSquadState,
  PlayerAvatars,
  PlayerOutfit,
} from "shared";
import { findUserById } from "../db";
import { focusPointsService } from "./FocusPointsService";

interface InternalSquadMember {
  userId: number;
  username: string;
  name: string;
  color: string;
  avatar?: string | null;
  outfit?: PlayerOutfit;
  avatars?: PlayerAvatars | null;
}

interface InternalSquad {
  id: string;
  leaderUserId: number;
  members: InternalSquadMember[];
  hadMultipleMembers: boolean;
  createdAt: number;
}

interface PendingSquadInvite {
  key: string; // `${fromUserId}:${toUserId}`
  squadId: string;
  fromUserId: number;
  toUserId: number;
  expiresAt: number;
}

export type ActiveSquadFocusLookup = (
  squadId: string,
  spaceId: string
) => FocusSquadActiveSessionSummary | null;

export type MemberFocusStatusLookup = (userId: number) => {
  inFocusRoom: boolean;
  focusStartedAt: number | null;
};

export function extractPlayerOutfitFromState(ps: any, fallback?: Partial<PlayerOutfit>): PlayerOutfit {
  const out: PlayerOutfit = {
    ...DEFAULT_PLAYER_OUTFIT,
    ...(fallback || {}),
  };
  if (ps?.outfit && typeof ps.outfit.forEach === "function") {
    ps.outfit.forEach((value: string, key: string) => {
      if (key in out && typeof value === "string") {
        (out as any)[key] = value;
      }
    });
  }
  return out;
}

/**
 * Lightweight MMORPG party manager for Focus Squads (max 8 members).
 * A player may belong to at most one squad at a time.
 */
export class SquadService {
  private static instance: SquadService | null = null;
  private static readonly INVITE_TTL_MS = 60 * 1000;
  private static readonly DISCONNECT_GRACE_MS = 15 * 1000;

  private squads = new Map<string, InternalSquad>();
  private userToSquad = new Map<number, string>();
  private pendingInvites = new Map<string, PendingSquadInvite>();
  private disconnectTimers = new Map<number, NodeJS.Timeout>();
  private seq = 1;

  private activeFocusLookup: ActiveSquadFocusLookup | null = null;
  private memberFocusLookup: MemberFocusStatusLookup | null = null;

  private constructor() {}

  public static getInstance(): SquadService {
    if (!SquadService.instance) {
      SquadService.instance = new SquadService();
    }
    return SquadService.instance;
  }

  public setFocusLookups(
    activeFocusLookup: ActiveSquadFocusLookup,
    memberFocusLookup: MemberFocusStatusLookup
  ): void {
    this.activeFocusLookup = activeFocusLookup;
    this.memberFocusLookup = memberFocusLookup;
  }

  public getSquadIdForUser(userId: number): string | null {
    return this.userToSquad.get(userId) || null;
  }

  public getSquadMemberIds(squadId: string): number[] {
    const squad = this.squads.get(squadId);
    return squad ? squad.members.map((m) => m.userId) : [];
  }

  private buildMemberProfile(userId: number, fallback?: Partial<InternalSquadMember>): InternalSquadMember {
    const session = focusPointsService.getOnlineSessionForUser(userId);
    const ps = session?.playerState;

    const avatars: PlayerAvatars | null | undefined =
      typeof session?.room?.getPlayerAvatars === "function"
        ? session.room.getPlayerAvatars(session.sessionId)
        : (fallback?.avatars ?? null);
    const avatar =
      typeof session?.room?.getPlayerAvatar === "function"
        ? session.room.getPlayerAvatar(session.sessionId)
        : (fallback?.avatar ?? null);

    return {
      userId,
      username: session?.username || fallback?.username || `player_${userId}`,
      name: ps?.name || session?.username || fallback?.name || fallback?.username || `Player #${userId}`,
      color: ps?.color || fallback?.color || "#3B8282",
      avatar,
      outfit: extractPlayerOutfitFromState(ps, fallback?.outfit),
      avatars,
    };
  }

  private syncPlayerStateSquadId(userId: number, squadId: string): void {
    const sessions = focusPointsService.getAllSessionsForUser(userId);
    for (const s of sessions) {
      try {
        s.playerState.focusSquadId = squadId;
      } catch {}
    }
  }

  public async createSquad(userId: number): Promise<{ success: boolean; squad?: FocusSquadState; error?: string }> {
    if (userId <= 0) {
      return { success: false, error: "Sign in to create a Party." };
    }
    const existingSquadId = this.userToSquad.get(userId);
    if (existingSquadId && this.squads.has(existingSquadId)) {
      const state = this.getSquadStateForUser(userId);
      return { success: true, squad: state || undefined };
    }

    const user = await findUserById(userId);
    const member = this.buildMemberProfile(userId, {
      username: user?.username,
      name: user?.display_name || user?.username,
    });

    const squadId = `squad_${Date.now().toString(36)}_${this.seq++}`;
    const squad: InternalSquad = {
      id: squadId,
      leaderUserId: userId,
      members: [member],
      hadMultipleMembers: false,
      createdAt: Date.now(),
    };
    this.squads.set(squadId, squad);
    this.userToSquad.set(userId, squadId);
    this.syncPlayerStateSquadId(userId, squadId);
    this.broadcastSquadState(squadId);

    return { success: true, squad: this.getSquadStateForUser(userId) || undefined };
  }

  public async invitePlayer(inviterId: number, targetUserId: number): Promise<{ success: boolean; error?: string }> {
    this.cleanupExpiredInvites();

    if (inviterId <= 0 || targetUserId <= 0) {
      return { success: false, error: "Both players must be signed in to form a party." };
    }
    if (inviterId === targetUserId) {
      return { success: false, error: "You cannot invite yourself to a party." };
    }

    const targetSession = focusPointsService.getOnlineSessionForUser(targetUserId);
    if (!targetSession) {
      return { success: false, error: "That player is currently offline." };
    }

    const existingTargetSquad = this.userToSquad.get(targetUserId);
    if (existingTargetSquad) {
      if (existingTargetSquad === this.userToSquad.get(inviterId)) {
        return { success: false, error: "That player is already in your party." };
      }
      return { success: false, error: "That player is already in another party." };
    }

    let squadId = this.userToSquad.get(inviterId);
    if (!squadId || !this.squads.has(squadId)) {
      const created = await this.createSquad(inviterId);
      if (!created.success || !created.squad) {
        return { success: false, error: created.error || "Could not create party." };
      }
      squadId = created.squad.squadId;
    }

    const squad = this.squads.get(squadId)!;
    if (squad.members.length >= FOCUS_SQUAD_MAX_MEMBERS) {
      return { success: false, error: `Party is full (${FOCUS_SQUAD_MAX_MEMBERS} members max).` };
    }

    const key = `${inviterId}:${targetUserId}`;
    this.pendingInvites.set(key, {
      key,
      squadId,
      fromUserId: inviterId,
      toUserId: targetUserId,
      expiresAt: Date.now() + SquadService.INVITE_TTL_MS,
    });

    const inviterProfile = this.buildMemberProfile(
      inviterId,
      squad.members.find((m) => m.userId === inviterId)
    );

    const payload: FocusSquadInviteData = {
      squadId,
      fromUserId: inviterId,
      fromUsername: inviterProfile.username,
      fromName: inviterProfile.name,
      fromColor: inviterProfile.color,
      memberCount: squad.members.length,
    };
    focusPointsService.sendToUser(targetUserId, "SQUAD_INVITE_RECEIVED", payload);
    return { success: true };
  }

  public async respondToInvite(
    userId: number,
    fromUserId: number,
    accept: boolean
  ): Promise<{ success: boolean; error?: string }> {
    this.cleanupExpiredInvites();

    const key = `${fromUserId}:${userId}`;
    const invite = this.pendingInvites.get(key);
    if (!invite) {
      return { success: false, error: "Party invite has expired or is no longer valid." };
    }
    this.pendingInvites.delete(key);

    if (invite.expiresAt < Date.now()) {
      return { success: false, error: "Party invite has expired." };
    }

    if (!accept) {
      const responderSession = focusPointsService.getOnlineSessionForUser(userId);
      const responderName = responderSession?.playerState?.name || responderSession?.username || `Player #${userId}`;
      focusPointsService.sendToUser(fromUserId, "SQUAD_NOTICE", {
        type: "info",
        message: `${responderName} declined your party invite.`,
      });
      return { success: true };
    }

    if (this.userToSquad.has(userId)) {
      return { success: false, error: "Leave your current party before joining another." };
    }

    const squad = this.squads.get(invite.squadId);
    if (!squad) {
      return { success: false, error: "That party no longer exists." };
    }
    if (squad.members.length >= FOCUS_SQUAD_MAX_MEMBERS) {
      return { success: false, error: "That party is already full." };
    }

    const user = await findUserById(userId);
    const member = this.buildMemberProfile(userId, {
      username: user?.username,
      name: user?.display_name || user?.username,
    });

    squad.members.push(member);
    squad.hadMultipleMembers = true;
    this.userToSquad.set(userId, squad.id);
    this.syncPlayerStateSquadId(userId, squad.id);

    this.broadcastNotice(squad.id, `${member.name} joined the Party!`, "success");
    this.broadcastSquadState(squad.id);
    return { success: true };
  }

  public leaveSquad(userId: number, reason: "left" | "disconnected" = "left"): void {
    const timer = this.disconnectTimers.get(userId);
    if (timer) {
      clearTimeout(timer);
      this.disconnectTimers.delete(userId);
    }

    const squadId = this.userToSquad.get(userId);
    if (!squadId) return;

    const squad = this.squads.get(squadId);
    this.userToSquad.delete(userId);
    this.syncPlayerStateSquadId(userId, "");
    focusPointsService.sendToUser(userId, "SQUAD_STATE_UPDATED", { squad: null });

    if (!squad) return;

    const departing = squad.members.find((m) => m.userId === userId);
    squad.members = squad.members.filter((m) => m.userId !== userId);

    if (squad.members.length === 0) {
      this.disbandSquad(squadId);
      return;
    }

    // If a multi-member squad drops back down to 1 player, disband cleanly
    if (squad.hadMultipleMembers && squad.members.length === 1) {
      const remaining = squad.members[0];
      this.disbandSquad(
        squadId,
        `${departing?.name || "A member"} ${reason === "disconnected" ? "disconnected" : "left"} — Party disbanded.`
      );
      focusPointsService.sendToUser(remaining.userId, "SQUAD_STATE_UPDATED", { squad: null });
      return;
    }

    if (squad.leaderUserId === userId) {
      squad.leaderUserId = squad.members[0].userId;
      this.broadcastNotice(
        squad.id,
        `${departing?.name || "Leader"} ${reason}. ${squad.members[0].name} is now Party Leader.`,
        "info"
      );
    } else if (departing) {
      this.broadcastNotice(
        squad.id,
        `${departing.name} ${reason === "disconnected" ? "disconnected from" : "left"} the party.`,
        "info"
      );
    }

    this.broadcastSquadState(squadId);
  }

  public kickMember(requesterId: number, targetUserId: number): { success: boolean; error?: string } {
    const squadId = this.userToSquad.get(requesterId);
    if (!squadId) return { success: false, error: "You are not in a party." };

    const squad = this.squads.get(squadId);
    if (!squad) return { success: false, error: "Party not found." };
    if (squad.leaderUserId !== requesterId) {
      return { success: false, error: "Only the Party Leader can remove members." };
    }
    if (requesterId === targetUserId) {
      this.leaveSquad(requesterId);
      return { success: true };
    }
    if (!squad.members.some((m) => m.userId === targetUserId)) {
      return { success: false, error: "Player is not in your party." };
    }

    focusPointsService.sendToUser(targetUserId, "SQUAD_NOTICE", {
      type: "warning",
      message: "You were removed from the Party.",
    });
    this.leaveSquad(targetUserId);
    return { success: true };
  }

  public handleUserConnect(userId: number): void {
    if (userId <= 0) return;
    const pendingTimer = this.disconnectTimers.get(userId);
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      this.disconnectTimers.delete(userId);
    }

    const squadId = this.userToSquad.get(userId);
    if (!squadId) {
      this.syncPlayerStateSquadId(userId, "");
      focusPointsService.sendToUser(userId, "SQUAD_STATE_UPDATED", { squad: null });
      return;
    }

    const squad = this.squads.get(squadId);
    if (!squad) {
      this.userToSquad.delete(userId);
      this.syncPlayerStateSquadId(userId, "");
      focusPointsService.sendToUser(userId, "SQUAD_STATE_UPDATED", { squad: null });
      return;
    }

    const idx = squad.members.findIndex((m) => m.userId === userId);
    if (idx !== -1) {
      squad.members[idx] = this.buildMemberProfile(userId, squad.members[idx]);
    }
    this.syncPlayerStateSquadId(userId, squadId);
    this.broadcastSquadState(squadId);
  }

  public handleUserDisconnect(userId: number): void {
    if (userId <= 0) return;
    if (focusPointsService.getAllSessionsForUser(userId).length > 0) {
      const squadId = this.userToSquad.get(userId);
      if (squadId) this.broadcastSquadState(squadId);
      return;
    }
    if (!this.userToSquad.has(userId)) return;

    const existingTimer = this.disconnectTimers.get(userId);
    if (existingTimer) clearTimeout(existingTimer);

    const timer = setTimeout(() => {
      this.disconnectTimers.delete(userId);
      if (focusPointsService.getAllSessionsForUser(userId).length === 0) {
        this.leaveSquad(userId, "disconnected");
      }
    }, SquadService.DISCONNECT_GRACE_MS);

    this.disconnectTimers.set(userId, timer);
  }

  public getSquadStateForUser(userId: number): FocusSquadState | null {
    const squadId = this.userToSquad.get(userId);
    if (!squadId) return null;
    const squad = this.squads.get(squadId);
    if (!squad) return null;

    const viewerSession = focusPointsService.getOnlineSessionForUser(userId);
    const viewerSpaceId = viewerSession?.room?.spaceId || "";

    const members: FocusSquadMember[] = squad.members.map((m) => {
      const s = focusPointsService.getOnlineSessionForUser(m.userId);
      const ps = s?.playerState;
      const refreshed = this.buildMemberProfile(m.userId, m);
      const focusLookup = this.memberFocusLookup
        ? this.memberFocusLookup(m.userId)
        : { inFocusRoom: ps?.focusStatus === "focusing", focusStartedAt: null };

      return {
        userId: refreshed.userId,
        username: refreshed.username,
        name: refreshed.name,
        color: refreshed.color,
        avatar: refreshed.avatar,
        outfit: refreshed.outfit,
        avatars: refreshed.avatars,
        sessionId: s?.sessionId || null,
        spaceId: s?.room?.spaceId || null,
        spaceName: s?.room?.spaceName || s?.room?.spaceId || null,
        isLeader: refreshed.userId === squad.leaderUserId,
        isOnline: !!s,
        inFocusRoom: focusLookup.inFocusRoom || ps?.focusStatus === "focusing",
        focusStartedAt: focusLookup.focusStartedAt,
      };
    });

    const activeFocusSession =
      viewerSpaceId && this.activeFocusLookup ? this.activeFocusLookup(squad.id, viewerSpaceId) : null;

    return {
      squadId: squad.id,
      leaderUserId: squad.leaderUserId,
      members,
      activeFocusSession,
    };
  }

  public broadcastSquadState(squadId: string): void {
    const squad = this.squads.get(squadId);
    if (!squad) return;

    for (const member of squad.members) {
      const state = this.getSquadStateForUser(member.userId);
      focusPointsService.sendToUser(member.userId, "SQUAD_STATE_UPDATED", { squad: state });
    }
  }

  public broadcastNotice(
    squadId: string,
    message: string,
    type: "info" | "success" | "warning" = "info"
  ): void {
    const squad = this.squads.get(squadId);
    if (!squad) return;
    for (const member of squad.members) {
      focusPointsService.sendToUser(member.userId, "SQUAD_NOTICE", { type, message });
    }
  }

  private disbandSquad(squadId: string, noticeMessage?: string): void {
    const squad = this.squads.get(squadId);
    if (!squad) return;

    for (const member of squad.members) {
      this.userToSquad.delete(member.userId);
      this.syncPlayerStateSquadId(member.userId, "");
      if (noticeMessage) {
        focusPointsService.sendToUser(member.userId, "SQUAD_NOTICE", {
          type: "info",
          message: noticeMessage,
        });
      }
      focusPointsService.sendToUser(member.userId, "SQUAD_STATE_UPDATED", { squad: null });
    }

    for (const [key, inv] of this.pendingInvites.entries()) {
      if (inv.squadId === squadId) {
        this.pendingInvites.delete(key);
      }
    }

    this.squads.delete(squadId);
  }

  private cleanupExpiredInvites(): void {
    const now = Date.now();
    for (const [key, inv] of this.pendingInvites.entries()) {
      if (inv.expiresAt <= now) {
        this.pendingInvites.delete(key);
      }
    }
  }
}

export const squadService = SquadService.getInstance();
