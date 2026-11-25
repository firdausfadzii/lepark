import {
  FOCUS_BASE_FP_PER_MINUTE,
  FOCUS_DAILY_FULL_RATE_MINUTES,
  FOCUS_MIN_MINUTES,
} from "./constants";
import type { PlayerAvatars, PlayerOutfit } from "./types";

export type FocusTheme =
  | "auto"
  | "office"
  | "lounge"
  | "park"
  | "guild"
  | "living_room"
  | "pet_shop";

export type ResolvedFocusTheme = Exclude<FocusTheme, "auto">;

export const FOCUS_THEME_OPTIONS: ReadonlyArray<{
  id: FocusTheme;
  label: string;
  description: string;
}> = [
  { id: "auto", label: "Auto-Detect (Name / Assets)", description: "Automatically picks a theme from space name and placed decor." },
  { id: "office", label: "Office (Working on PC)", description: "Cozy pixel office desks, glowing monitors, coffee mugs & keyboard focus." },
  { id: "lounge", label: "Cozy Lounge / Cafe", description: "Warm cafe lounge lighting, laptops, coffee & chill ambient vibes." },
  { id: "park", label: "Park / Campfire", description: "Serene outdoor twilight clearing with crackling campfire & fireflies." },
  { id: "guild", label: "Adventure Guild", description: "Stone guild hearth, torches, quest board & arcane study table." },
  { id: "living_room", label: "Living Room / Home Study", description: "Warm home desk, bookshelf, rug & cozy lamp glow." },
  { id: "pet_shop", label: "Pet Shop / Cat Corner", description: "Cozy shop counter with sleepy pixel cats keeping you company." },
];

export function isValidFocusTheme(val: unknown): val is FocusTheme {
  return (
    val === "auto" ||
    val === "office" ||
    val === "lounge" ||
    val === "park" ||
    val === "guild" ||
    val === "living_room" ||
    val === "pet_shop"
  );
}

export function isValidResolvedFocusTheme(val: unknown): val is ResolvedFocusTheme {
  return isValidFocusTheme(val) && val !== "auto";
}

export function resolveSpaceFocusTheme(options: {
  spaceName?: string | null;
  focusTheme?: string | null;
  tiles?: Record<string, string> | null;
  fallbackTheme?: ResolvedFocusTheme;
}): ResolvedFocusTheme {
  if (isValidResolvedFocusTheme(options.focusTheme)) {
    return options.focusTheme;
  }

  const nameLower = (options.spaceName || "").toLowerCase();
  if (/\b(office|work|workspace|cowork|desk|studio|corp|lab|pc)\b/.test(nameLower)) {
    return "office";
  }
  if (/\b(guild|adventure|dungeon|tavern|arena|quest|rpg)\b/.test(nameLower)) {
    return "guild";
  }
  if (/\b(pet\s*shop|petshop|pet|cat|dog|animal|vet)\b/.test(nameLower)) {
    return "pet_shop";
  }
  if (/\b(living\s*room|livingroom|living|home|house|bedroom|room|dorm|condo|apartment)\b/.test(nameLower)) {
    return "living_room";
  }
  if (/\b(lounge|cafe|coffee|bar|club|hangout|co3)\b/.test(nameLower)) {
    return "lounge";
  }
  if (/\b(park|camp|campfire|forest|garden|plaza|outdoor|nature|square)\b/.test(nameLower)) {
    return "park";
  }

  if (options.tiles && typeof options.tiles === "object") {
    let officeCount = 0;
    let guildCount = 0;
    let petCount = 0;
    let livingCount = 0;
    for (const raw of Object.values(options.tiles)) {
      if (typeof raw !== "string") continue;
      if (raw.includes("office_one/") || raw.includes("office_two/") || raw.includes("office_chair")) {
        officeCount++;
      } else if (raw.includes("adventure_guild/")) {
        guildCount++;
      } else if (raw.includes("pet_shop/")) {
        petCount++;
      } else if (
        raw.includes("living_room_one/") ||
        raw.includes("living_room_two/") ||
        raw.includes("living_room_floor/")
      ) {
        livingCount++;
      }
    }
    const maxCount = Math.max(officeCount, guildCount, petCount, livingCount);
    if (maxCount >= 2) {
      if (maxCount === officeCount) return "office";
      if (maxCount === guildCount) return "guild";
      if (maxCount === petCount) return "pet_shop";
      if (maxCount === livingCount) return "living_room";
    }
  }

  return options.fallbackTheme || "park";
}

export type FocusMode = "honor" | "strict";
export type FocusLoopState = "idle" | "focus_locked" | "break_reward";

export interface FocusStats {
  focusPoints: number;
  streakDays: number;
  freezeShields: number;
  dailyFocusMinutes: number;
  isFirstSessionToday: boolean;
  lastPublicSpaceId?: string | null;
}

export interface FocusRewardBreakdown {
  elapsedMinutes: number;
  effectiveFullRateMinutes: number;
  fatiguedMinutes: number;
  baseFp: number;
  completeMult: number;
  streakMult: number;
  squadMult: number;
  firstSparkMult: number;
  karmaMult?: number;
  totalFpEarned: number;
  newTotalFp: number;
  streakDays: number;
  freezeShields: number;
  dailyFocusMinutes: number;
  isCompleted: boolean;
  isStrictMode: boolean;
  strictViolated: boolean;
  forfeitedUnderMinimum: boolean;
}

export interface FocusSquadMember {
  userId: number;
  username: string;
  name: string;
  color: string;
  avatar?: string | null;
  outfit?: PlayerOutfit;
  avatars?: PlayerAvatars | null;
  sessionId: string | null;
  spaceId: string | null;
  spaceName?: string | null;
  isLeader: boolean;
  isOnline: boolean;
  inFocusRoom: boolean;
  focusStartedAt?: number | null;
}

export interface FocusSquadActiveSessionSummary {
  spaceId: string;
  spaceName: string;
  initiatorUserId: number;
  initiatorName: string;
  startedAt: number;
  targetMinutes: number;
  mode: FocusMode;
  endsAt: number;
  participantUserIds: number[];
}

export interface FocusSquadState {
  squadId: string;
  leaderUserId: number;
  members: FocusSquadMember[];
  activeFocusSession: FocusSquadActiveSessionSummary | null;
}

export interface FocusSquadInviteData {
  squadId: string | null;
  fromUserId: number;
  fromUsername: string;
  fromName: string;
  fromColor: string;
  memberCount: number;
}

export interface FocusRoomSessionState {
  loopState: FocusLoopState;
  roomType: "personal" | "squad";
  squadId?: string | null;
  spaceId: string;
  spaceName: string;
  theme: ResolvedFocusTheme;
  isPersonalSpaceFallback?: boolean;
  themeSourceSpaceName?: string | null;
  mode: FocusMode;
  targetMinutes: number;
  roomStartedAt: number;
  playerJoinedAt: number;
  endsAt: number;
  strictViolated: boolean;
  strictAwayRemainingMs?: number | null;
  participants: FocusSquadMember[];
  lastReward?: FocusRewardBreakdown | null;
}

export interface FocusRoomStartPayload {
  targetMinutes?: number;
  mode?: FocusMode;
  autoTriggered?: boolean;
  themeOverride?: ResolvedFocusTheme;
  themeSourceSpaceName?: string | null;
}

export interface FocusRoomUpdateSettingsPayload {
  targetMinutes?: number;
  mode?: FocusMode;
}

export interface FocusRoomVisibilityPayload {
  hidden: boolean;
}

export interface SquadInvitePayload {
  targetUserId?: number;
  targetSessionId?: string;
}

export interface SquadInviteRespondPayload {
  accept: boolean;
  fromUserId: number;
}

export interface SquadKickPayload {
  targetUserId: number;
}

export function calculateFocusPointsReward(params: {
  elapsedMinutes: number;
  targetMinutes: number;
  isCompleted: boolean;
  isStrictMode: boolean;
  strictViolated: boolean;
  streakDays: number;
  hasSquadSynergy: boolean;
  isFirstSessionToday: boolean;
  priorDailyFocusMinutes: number;
  focusUpgradeRank?: number;
}): Omit<FocusRewardBreakdown, "newTotalFp" | "streakDays" | "freezeShields" | "dailyFocusMinutes"> {
  const validMinutes = Math.max(0, Math.min(params.elapsedMinutes, params.targetMinutes));
  const karmaMult = 1 + 0.1 * Math.max(0, Math.floor(params.focusUpgradeRank || 0));

  if (validMinutes < FOCUS_MIN_MINUTES) {
    return {
      elapsedMinutes: Math.floor(validMinutes * 10) / 10,
      effectiveFullRateMinutes: 0,
      fatiguedMinutes: 0,
      baseFp: 0,
      completeMult: 0,
      streakMult: 1,
      squadMult: params.hasSquadSynergy ? 1.15 : 1.0,
      firstSparkMult: 1.0,
      karmaMult,
      totalFpEarned: 0,
      isCompleted: false,
      isStrictMode: params.isStrictMode,
      strictViolated: params.strictViolated,
      forfeitedUnderMinimum: true,
    };
  }

  const priorDaily = Math.max(0, params.priorDailyFocusMinutes);
  const remainingFullMinutes = Math.max(0, FOCUS_DAILY_FULL_RATE_MINUTES - priorDaily);
  const effectiveFullRateMinutes = Math.min(validMinutes, remainingFullMinutes);
  const fatiguedMinutes = Math.max(0, validMinutes - effectiveFullRateMinutes);
  const weightedMinutes = effectiveFullRateMinutes + fatiguedMinutes * 0.5;
  const baseFp = weightedMinutes * FOCUS_BASE_FP_PER_MINUTE;

  const completeMult = params.isCompleted
    ? params.isStrictMode && !params.strictViolated
      ? 1.25
      : 1.0
    : 0.75;

  const streakMult = 1 + Math.min(Math.max(0, params.streakDays), 14) * 0.05;
  const squadMult = params.hasSquadSynergy ? 1.15 : 1.0;
  const firstSparkMult = params.isCompleted && params.isFirstSessionToday ? 2.0 : 1.0;

  const totalFpEarned = Math.floor(
    baseFp * completeMult * streakMult * squadMult * firstSparkMult * karmaMult
  );

  return {
    elapsedMinutes: Math.round(validMinutes * 10) / 10,
    effectiveFullRateMinutes: Math.round(effectiveFullRateMinutes * 10) / 10,
    fatiguedMinutes: Math.round(fatiguedMinutes * 10) / 10,
    baseFp: Math.round(baseFp * 10) / 10,
    completeMult,
    streakMult,
    squadMult,
    firstSparkMult,
    karmaMult,
    totalFpEarned,
    isCompleted: params.isCompleted,
    isStrictMode: params.isStrictMode,
    strictViolated: params.strictViolated,
    forfeitedUnderMinimum: false,
  };
}
