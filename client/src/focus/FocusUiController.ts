import {
  AuthUser,
  DEFAULT_POMODORO_MINUTES,
  FOCUS_DAILY_FULL_RATE_MINUTES,
  FOCUS_IDLE_TIMEOUT_MS,
  FOCUS_MIN_MINUTES,
  FOCUS_SQUAD_MAX_MEMBERS,
  FOCUS_THEME_OPTIONS,
  FocusMode,
  FocusRewardBreakdown,
  FocusRoomSessionState,
  FocusSquadInviteData,
  FocusSquadState,
  FocusStats,
  FocusTheme,
  FriendEntry,
  ResolvedFocusTheme,
  Space,
  calculateFocusPointsReward,
  resolveSpaceFocusTheme,
} from "shared";
import { MultiplayerManager, SpaceInfoUpdatedCallback } from "../network/MultiplayerManager";
import { GameScene } from "../scenes/GameScene";
import { FocusSceneRenderer } from "./FocusSceneRenderer";

export interface FocusUiControllerDeps {
  getMultiplayer: () => MultiplayerManager | null;
  getGameScene: () => GameScene | null;
  getCurrentUser: () => AuthUser | null;
  getAuthToken: () => string | null;
  getCurrentSpaceId: () => string;
  getCurrentSpaceName: () => string;
  getAllSpaces: () => Space[];
  getFriendsOnline: () => FriendEntry[];
  onRefreshFriends: () => Promise<void>;
  onPointsUpdated: (totalPoints: number, stats?: FocusStats) => void;
  setGameControlsActive: (active: boolean) => void;
  onFocusLockChanged?: (locked: boolean) => void;
}

const CHIME_PREF_KEY = "lepark_focus_chime_enabled";
const LAST_PUBLIC_SPACE_CACHE_PREFIX = "lepark_last_public_space_";

function escapeHtml(raw: string): string {
  return String(raw)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function getThemeLabel(theme: ResolvedFocusTheme): string {
  return FOCUS_THEME_OPTIONS.find((opt) => opt.id === theme)?.label || theme;
}

/**
 * Coordinates the client Focus Room modal, 1-minute idle auto-trigger,
 * Pomodoro timer UI, FP breakdown, Focus Squad HUD, and party invites.
 */
export class FocusUiController {
  private deps: FocusUiControllerDeps;
  private boundManagers = new WeakSet<MultiplayerManager>();

  private renderer: FocusSceneRenderer | null = null;
  private roomState: FocusRoomSessionState | null = null;
  private squadState: FocusSquadState | null = null;
  private focusStats: FocusStats = {
    focusPoints: 0,
    streakDays: 0,
    freezeShields: 2,
    dailyFocusMinutes: 0,
    isFirstSessionToday: true,
    lastPublicSpaceId: null,
  };
  private currentSpaceMeta: Parameters<SpaceInfoUpdatedCallback>[0] | null = null;
  private pendingInvite: FocusSquadInviteData | null = null;

  private chimeEnabled = true;
  private breakEndsAt = 0;
  private idleStartInFlight = false;
  private lastIdleTriggerAt = 0;
  private uiTickTimer: number | null = null;
  private noticeClearTimer: number | null = null;

  // DOM References
  private topbarFocusPointsBtn = document.getElementById("topbar-focus-points") as HTMLButtonElement | null;
  private btnOpenFocus = document.getElementById("btn-open-focus") as HTMLButtonElement | null;
  private btnOpenSquad = document.getElementById("btn-open-squad") as HTMLButtonElement | null;
  private topbarSquadBadge = document.getElementById("topbar-squad-badge") as HTMLElement | null;

  private idleToast = document.getElementById("focus-idle-countdown-toast") as HTMLElement | null;
  private idleToastText = document.getElementById("focus-idle-countdown-text") as HTMLElement | null;
  private btnIdleEnterNow = document.getElementById("btn-focus-idle-enter-now") as HTMLButtonElement | null;

  private focusRoomModal = document.getElementById("focus-room-modal") as HTMLElement | null;
  private focusRoomCanvas = document.getElementById("focus-room-canvas") as HTMLCanvasElement | null;
  private focusModeTitle = document.getElementById("focus-room-mode-title") as HTMLElement | null;
  private focusSpaceNameEl = document.getElementById("focus-room-space-name") as HTMLElement | null;
  private focusThemeLabelEl = document.getElementById("focus-room-theme-label") as HTMLElement | null;
  private focusFallbackBadge = document.getElementById("focus-room-fallback-badge") as HTMLElement | null;
  private focusStreakVal = document.getElementById("focus-room-streak-val") as HTMLElement | null;
  private focusShieldsVal = document.getElementById("focus-room-shields-val") as HTMLElement | null;
  private focusDailyVal = document.getElementById("focus-room-daily-val") as HTMLElement | null;
  private focusFpBalanceEl = document.getElementById("focus-room-fp-balance") as HTMLElement | null;
  private btnChimeToggle = document.getElementById("btn-focus-chime-toggle") as HTMLButtonElement | null;
  private chimeLabel = document.getElementById("focus-chime-label") as HTMLElement | null;
  private btnFocusExit = document.getElementById("btn-focus-room-exit") as HTMLButtonElement | null;

  private participantsListEl = document.getElementById("focus-room-participants-list") as HTMLElement | null;
  private btnFocusInviteSquad = document.getElementById("btn-focus-room-invite-squad") as HTMLButtonElement | null;

  private lockedPanel = document.getElementById("focus-locked-panel") as HTMLElement | null;
  private lockStateDot = document.getElementById("focus-lock-state-dot") as HTMLElement | null;
  private lockStateText = document.getElementById("focus-lock-state-text") as HTMLElement | null;
  private countdownDisplay = document.getElementById("focus-countdown-display") as HTMLElement | null;
  private progressFill = document.getElementById("focus-progress-fill") as HTMLElement | null;
  private estimatedFpVal = document.getElementById("focus-estimated-fp-val") as HTMLElement | null;
  private multiplierChips = document.getElementById("focus-multiplier-chips") as HTMLElement | null;
  private strictWarningBanner = document.getElementById("focus-strict-warning-banner") as HTMLElement | null;
  private strictWarningText = document.getElementById("focus-strict-warning-text") as HTMLElement | null;
  private roomNoticeBanner = document.getElementById("focus-room-notice-banner") as HTMLElement | null;

  private customMinsInput = document.getElementById("focus-custom-mins-input") as HTMLInputElement | null;
  private btnApplyCustomMins = document.getElementById("btn-focus-apply-custom-mins") as HTMLButtonElement | null;
  private btnModeHonor = document.getElementById("btn-focus-mode-honor") as HTMLButtonElement | null;
  private btnModeStrict = document.getElementById("btn-focus-mode-strict") as HTMLButtonElement | null;
  private endConfirmBar = document.getElementById("focus-end-confirm-bar") as HTMLElement | null;
  private endConfirmText = document.getElementById("focus-end-confirm-text") as HTMLElement | null;
  private btnEndCancel = document.getElementById("btn-focus-end-cancel") as HTMLButtonElement | null;
  private btnEndConfirm = document.getElementById("btn-focus-end-confirm") as HTMLButtonElement | null;

  private breakPanel = document.getElementById("focus-break-panel") as HTMLElement | null;
  private breakBadge = document.getElementById("focus-break-badge") as HTMLElement | null;
  private breakHeading = document.getElementById("focus-break-heading") as HTMLElement | null;
  private breakEarnedAmount = document.getElementById("focus-break-earned-amount") as HTMLElement | null;
  private breakNewBalance = document.getElementById("focus-break-new-balance") as HTMLElement | null;
  private breakGuestNote = document.getElementById("focus-break-guest-note") as HTMLElement | null;
  private breakBreakdownGrid = document.getElementById("focus-break-breakdown-grid") as HTMLElement | null;
  private breakCountdownEl = document.getElementById("focus-break-countdown") as HTMLElement | null;
  private btnStartNext = document.getElementById("btn-focus-start-next") as HTMLButtonElement | null;
  private btnBreakReturn = document.getElementById("btn-focus-break-return") as HTMLButtonElement | null;

  private squadModal = document.getElementById("squad-modal") as HTMLElement | null;
  private btnCloseSquadModal = document.getElementById("btn-close-squad-modal") as HTMLButtonElement | null;
  private squadModalFeedback = document.getElementById("squad-modal-feedback") as HTMLElement | null;
  private squadModalCount = document.getElementById("squad-modal-count") as HTMLElement | null;
  private btnSquadCreate = document.getElementById("btn-squad-create") as HTMLButtonElement | null;
  private btnSquadStartFocus = document.getElementById("btn-squad-start-focus") as HTMLButtonElement | null;
  private btnSquadLeave = document.getElementById("btn-squad-leave") as HTMLButtonElement | null;
  private squadModalMembersList = document.getElementById("squad-modal-members-list") as HTMLElement | null;

  private squadInviteModal = document.getElementById("squad-invite-modal") as HTMLElement | null;
  private btnCloseSquadInvite = document.getElementById("btn-close-squad-invite") as HTMLButtonElement | null;
  private squadInviteDesc = document.getElementById("squad-invite-desc") as HTMLElement | null;
  private btnSquadInviteDecline = document.getElementById("btn-squad-invite-decline") as HTMLButtonElement | null;
  private btnSquadInviteAccept = document.getElementById("btn-squad-invite-accept") as HTMLButtonElement | null;

  constructor(deps: FocusUiControllerDeps) {
    this.deps = deps;
    try {
      const savedPref = localStorage.getItem(CHIME_PREF_KEY);
      if (savedPref === "0") this.chimeEnabled = false;
    } catch {}
    this.updateChimeLabel();
    this.bindDomEvents();
    this.startUiTickLoop();
  }

  public isFocusLocked(): boolean {
    return this.roomState?.loopState === "focus_locked";
  }

  public syncUserAuth(user: AuthUser | null): void {
    if (user) {
      this.focusStats = {
        focusPoints: user.focusPoints || 0,
        streakDays: user.focusStats?.streakDays ?? 0,
        freezeShields: user.focusStats?.freezeShields ?? 2,
        dailyFocusMinutes: user.focusStats?.dailyFocusMinutes ?? 0,
        isFirstSessionToday: user.focusStats?.isFirstSessionToday ?? true,
        lastPublicSpaceId: user.lastPublicSpaceId ?? user.focusStats?.lastPublicSpaceId ?? null,
      };
      if (this.focusStats.lastPublicSpaceId) {
        this.cacheLastPublicSpaceFromId(this.focusStats.lastPublicSpaceId);
      }
    }
    this.renderFocusStatsHeader();
  }

  public attachMultiplayer(mgr: MultiplayerManager): void {
    if (this.boundManagers.has(mgr)) return;
    this.boundManagers.add(mgr);

    mgr.onSpaceInfoUpdated((info) => {
      this.currentSpaceMeta = info;
      if (info.isSuperadminSpace) {
        this.saveLastPublicSpace(info.spaceId, info.name, info.resolvedTheme);
      }
      this.renderSquadHud();
      if (this.roomState) {
        this.renderFocusRoomModal();
      }
    });

    mgr.onFocusStatsSync((stats) => {
      this.focusStats = stats;
      if (stats.lastPublicSpaceId) {
        this.cacheLastPublicSpaceFromId(stats.lastPublicSpaceId);
      }
      this.deps.onPointsUpdated(stats.focusPoints, stats);
      this.renderFocusStatsHeader();
    });

    mgr.onFocusPointsUpdated((data) => {
      if (data.stats) {
        this.focusStats = data.stats;
      } else {
        this.focusStats.focusPoints = data.points;
      }
      this.deps.onPointsUpdated(data.points, this.focusStats);
      this.renderFocusStatsHeader();
    });

    mgr.onFocusRoomState((state) => {
      this.idleStartInFlight = false;
      this.roomState = state;
      this.deps.onFocusLockChanged?.(this.isFocusLocked());
      if (!state || state.loopState === "idle") {
        this.closeFocusRoomModalUi();
      } else {
        this.openFocusRoomModalUi();
        this.renderFocusRoomModal();
      }
    });

    mgr.onFocusSessionCompleted((data) => {
      this.breakEndsAt = Date.now() + 5 * 60 * 1000;
      if (data.breakdown) {
        this.focusStats = {
          ...this.focusStats,
          focusPoints: data.breakdown.newTotalFp,
          streakDays: data.breakdown.streakDays,
          freezeShields: data.breakdown.freezeShields,
          dailyFocusMinutes: data.breakdown.dailyFocusMinutes,
          isFirstSessionToday: false,
        };
      }
      if (this.chimeEnabled) {
        this.playCompletionChime();
      }
      this.renderFocusStatsHeader();
      if (data.breakdown) {
        this.renderBreakPanel(data.breakdown, !!data.isGuest);
      }
    });

    mgr.onFocusStrictViolated((data) => {
      this.showFocusNotice(
        `Strict Lock broken: tab hidden over ${data.graceSeconds}s. Base Honor rate (1.00x) will apply.`,
        3600
      );
    });

    mgr.onFocusNotice((data) => {
      this.showFocusNotice(data.message, 4000);
    });

    mgr.onSquadStateUpdated((data) => {
      this.squadState = data?.squad ?? null;
      this.renderSquadHud();
      if (this.isSquadModalOpen()) {
        this.renderSquadModal();
      }
      if (this.roomState) {
        this.renderFocusRoomModal();
      }
    });

    mgr.onSquadInviteReceived((invite) => {
      this.pendingInvite = invite;
      if (this.squadInviteDesc) {
        this.squadInviteDesc.textContent = `${invite.fromName} invited you to join their Party (${invite.memberCount}/${FOCUS_SQUAD_MAX_MEMBERS} members).`;
      }
      this.squadInviteModal?.classList.remove("hidden");
      this.deps.setGameControlsActive(false);
    });

    mgr.onSquadNotice((data) => {
      this.showSquadFeedback(data.message);
      this.showFocusNotice(data.message, 4000);
    });

    mgr.onUnexpectedDisconnect(() => {
      this.roomState = null;
      this.closeFocusRoomModalUi();
    });

    mgr.onRoomJoined(() => {
      this.idleStartInFlight = false;
      this.lastIdleTriggerAt = 0;
      this.hideIdleToast();
      this.deps.getGameScene()?.resetFocusIdleTimer();
      mgr.requestSquadState();
    });
  }

  public startOrJoinFocusRoom(autoTriggered = false, customMinutes?: number): void {
    const mgr = this.deps.getMultiplayer();
    if (!mgr) return;

    this.hideIdleToast();
    this.idleStartInFlight = true;

    const themeFallback = this.resolveThemeFallbackForCurrentSpace();
    mgr.sendFocusRoomStart({
      targetMinutes: customMinutes || DEFAULT_POMODORO_MINUTES,
      mode: "honor",
      autoTriggered,
      ...(themeFallback
        ? {
            themeOverride: themeFallback.theme,
            themeSourceSpaceName: themeFallback.spaceName,
          }
        : {}),
    });
  }

  public openSquadModal(): void {
    const mgr = this.deps.getMultiplayer();
    mgr?.requestSquadState();
    this.squadModal?.classList.remove("hidden");
    this.deps.setGameControlsActive(false);
    this.renderSquadModal();
  }

  public closeSquadModal(): void {
    this.squadModal?.classList.add("hidden");
    if (!this.isFocusRoomModalOpen()) {
      this.deps.getGameScene()?.resetFocusIdleTimer();
      this.deps.setGameControlsActive(true);
    }
  }

  public invitePlayerBySessionOrUser(targetUserId?: number, targetSessionId?: string): void {
    const mgr = this.deps.getMultiplayer();
    if (!mgr) return;
    if (!this.deps.getCurrentUser()) {
      alert("Please sign in to form a Party.");
      return;
    }
    if (targetUserId !== undefined && targetUserId <= 0) {
      alert("That player is currently playing as a guest and cannot join a Party.");
      return;
    }
    mgr.sendSquadInvite(targetUserId, targetSessionId);
    this.showSquadFeedback("Party invite sent!");
  }

  private isFocusRoomModalOpen(): boolean {
    return !!(this.focusRoomModal && !this.focusRoomModal.classList.contains("hidden"));
  }

  private isSquadModalOpen(): boolean {
    return !!(this.squadModal && !this.squadModal.classList.contains("hidden"));
  }

  private getLastPublicSpaceCacheKey(): string {
    const uid = this.deps.getCurrentUser()?.id || 0;
    return `${LAST_PUBLIC_SPACE_CACHE_PREFIX}${uid}`;
  }

  private saveLastPublicSpace(spaceId: string, spaceName: string, theme: ResolvedFocusTheme): void {
    try {
      localStorage.setItem(
        this.getLastPublicSpaceCacheKey(),
        JSON.stringify({ spaceId, spaceName, theme })
      );
    } catch {}
  }

  private cacheLastPublicSpaceFromId(spaceId: string): void {
    const matched = this.deps.getAllSpaces().find((s) => s.id === spaceId && s.isSuperadminSpace);
    if (!matched) return;
    const theme = resolveSpaceFocusTheme({
      spaceName: matched.name,
      focusTheme: matched.focusTheme,
      fallbackTheme: "lounge",
    });
    this.saveLastPublicSpace(matched.id, matched.name, theme);
  }

  private resolveThemeFallbackForCurrentSpace(): {
    theme: ResolvedFocusTheme;
    spaceName: string;
  } | null {
    const spaceId = this.deps.getCurrentSpaceId();
    const isPersonal =
      this.currentSpaceMeta
        ? !this.currentSpaceMeta.isSuperadminSpace
        : spaceId.startsWith("user_space_");
    if (!isPersonal) return null;

    // 1. Check user's authoritative lastPublicSpaceId if matched in loaded spaces
    const lastId = this.focusStats.lastPublicSpaceId || this.deps.getCurrentUser()?.lastPublicSpaceId;
    if (lastId) {
      const sp = this.deps.getAllSpaces().find((s) => s.id === lastId && s.isSuperadminSpace);
      if (sp) {
        return {
          theme: resolveSpaceFocusTheme({
            spaceName: sp.name,
            focusTheme: sp.focusTheme,
            fallbackTheme: "lounge",
          }),
          spaceName: sp.name,
        };
      }
    }

    // 2. Check cached last public space from localStorage
    try {
      const raw = localStorage.getItem(this.getLastPublicSpaceCacheKey());
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.theme) {
          return {
            theme: parsed.theme as ResolvedFocusTheme,
            spaceName: parsed.spaceName || "Last Public Space",
          };
        }
      }
    } catch {}

    return { theme: "lounge", spaceName: "Cozy Lounge" };
  }

  private bindDomEvents(): void {
    this.topbarFocusPointsBtn?.addEventListener("click", () => {
      this.startOrJoinFocusRoom(false);
    });
    this.btnOpenFocus?.addEventListener("click", () => {
      this.startOrJoinFocusRoom(false);
    });
    this.btnOpenSquad?.addEventListener("click", () => {
      this.openSquadModal();
    });
    this.btnIdleEnterNow?.addEventListener("click", () => {
      this.startOrJoinFocusRoom(true);
    });

    this.btnFocusInviteSquad?.addEventListener("click", () => {
      this.openSquadModal();
    });

    this.btnChimeToggle?.addEventListener("click", () => {
      this.chimeEnabled = !this.chimeEnabled;
      try {
        localStorage.setItem(CHIME_PREF_KEY, this.chimeEnabled ? "1" : "0");
      } catch {}
      this.updateChimeLabel();
    });

    this.btnFocusExit?.addEventListener("click", () => {
      this.handleExitButtonClick();
    });

    // Preset duration buttons
    document.querySelectorAll<HTMLButtonElement>(".focus-preset-btn[data-focus-mins]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const mins = Number(btn.dataset.focusMins || 25);
        if (this.customMinsInput) this.customMinsInput.value = String(mins);
        this.deps.getMultiplayer()?.sendFocusRoomUpdateSettings({ targetMinutes: mins });
      });
    });

    this.btnApplyCustomMins?.addEventListener("click", () => {
      const raw = Number(this.customMinsInput?.value || 25);
      const mins = Math.max(1, Math.min(180, Math.round(raw || 25)));
      if (this.customMinsInput) this.customMinsInput.value = String(mins);
      this.deps.getMultiplayer()?.sendFocusRoomUpdateSettings({ targetMinutes: mins });
    });

    this.customMinsInput?.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Enter") {
        e.preventDefault();
        this.btnApplyCustomMins?.click();
      }
    });

    this.btnModeHonor?.addEventListener("click", () => {
      this.deps.getMultiplayer()?.sendFocusRoomUpdateSettings({ mode: "honor" });
    });
    this.btnModeStrict?.addEventListener("click", () => {
      this.deps.getMultiplayer()?.sendFocusRoomUpdateSettings({ mode: "strict" });
    });

    this.btnEndCancel?.addEventListener("click", () => {
      this.endConfirmBar?.classList.add("hidden");
    });
    this.endConfirmBar?.addEventListener("click", (e) => {
      if (e.target === this.endConfirmBar) {
        this.endConfirmBar?.classList.add("hidden");
      }
    });
    this.btnEndConfirm?.addEventListener("click", () => {
      this.endConfirmBar?.classList.add("hidden");
      this.deps.getMultiplayer()?.sendFocusRoomEndEarly();
    });

    this.btnStartNext?.addEventListener("click", () => {
      const targetMins = this.roomState?.targetMinutes || DEFAULT_POMODORO_MINUTES;
      this.startOrJoinFocusRoom(false, targetMins);
    });
    this.btnBreakReturn?.addEventListener("click", () => {
      this.exitFocusRoomToWorld();
    });

    // Squad Modal buttons
    this.btnCloseSquadModal?.addEventListener("click", () => this.closeSquadModal());
    this.squadModal?.addEventListener("click", (e) => {
      if (e.target === this.squadModal) this.closeSquadModal();
    });
    this.btnSquadCreate?.addEventListener("click", () => {
      if (!this.deps.getCurrentUser()) {
        this.showSquadFeedback("Sign in with an account to create a Party.");
        return;
      }
      this.deps.getMultiplayer()?.sendSquadCreate();
    });
    this.btnSquadLeave?.addEventListener("click", () => {
      this.deps.getMultiplayer()?.sendSquadLeave();
    });
    this.btnSquadStartFocus?.addEventListener("click", () => {
      this.closeSquadModal();
      this.startOrJoinFocusRoom(false);
    });

    // Squad Invite Modal buttons
    const respondInvite = (accept: boolean) => {
      if (this.pendingInvite) {
        this.deps.getMultiplayer()?.sendSquadInviteRespond(this.pendingInvite.fromUserId, accept);
        this.pendingInvite = null;
      }
      this.squadInviteModal?.classList.add("hidden");
      if (!this.isFocusRoomModalOpen() && !this.isSquadModalOpen()) {
        this.deps.getGameScene()?.resetFocusIdleTimer();
        this.deps.setGameControlsActive(true);
      }
    };
    this.btnCloseSquadInvite?.addEventListener("click", () => respondInvite(false));
    this.btnSquadInviteDecline?.addEventListener("click", () => respondInvite(false));
    this.btnSquadInviteAccept?.addEventListener("click", () => respondInvite(true));

    // Report tab visibility changes for Strict Lock
    document.addEventListener("visibilitychange", () => {
      if (!this.roomState || this.roomState.loopState !== "focus_locked") return;
      this.deps.getMultiplayer()?.sendFocusRoomVisibility(document.hidden);
    });

    // Escape key handling
    window.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (this.squadInviteModal && !this.squadInviteModal.classList.contains("hidden")) {
        this.btnSquadInviteDecline?.click();
        return;
      }
      if (this.isSquadModalOpen()) {
        this.closeSquadModal();
        return;
      }
      if (this.isFocusRoomModalOpen()) {
        if (this.endConfirmBar && !this.endConfirmBar.classList.contains("hidden")) {
          this.endConfirmBar.classList.add("hidden");
          return;
        }
        this.handleExitButtonClick();
      }
    });
  }

  private handleExitButtonClick(): void {
    if (!this.roomState || this.roomState.loopState !== "focus_locked") {
      this.exitFocusRoomToWorld();
      return;
    }
    this.showEndEarlyConfirm();
  }

  private showEndEarlyConfirm(): void {
    if (!this.roomState || !this.endConfirmBar || !this.endConfirmText) return;
    const now = Date.now();
    const elapsedMins = Math.max(0, (now - this.roomState.playerJoinedAt) / 60_000);
    if (elapsedMins < FOCUS_MIN_MINUTES) {
      this.endConfirmText.textContent = `Only ${elapsedMins.toFixed(1)}m elapsed (< ${FOCUS_MIN_MINUTES}m minimum): ending now earns 0 FP. Return to world?`;
    } else {
      const est = this.computeProjectedBreakdown(elapsedMins, false);
      this.endConfirmText.textContent = `${Math.floor(elapsedMins)}m focused: ending early awards ${est.totalFpEarned} FP at 0.75x rate (does not increment daily streak).`;
    }
    this.endConfirmBar.classList.remove("hidden");
  }

  private exitFocusRoomToWorld(): void {
    this.deps.getMultiplayer()?.sendFocusRoomExit();
    this.roomState = null;
    this.closeFocusRoomModalUi();
  }

  private openFocusRoomModalUi(): void {
    if (!this.focusRoomModal) return;
    this.focusRoomModal.classList.remove("hidden");
    this.hideIdleToast();
    this.deps.setGameControlsActive(false);

    if (this.focusRoomCanvas && this.roomState && this.roomState.loopState === "focus_locked" && !this.renderer) {
      const mgr = this.deps.getMultiplayer();
      this.renderer = new FocusSceneRenderer(this.focusRoomCanvas, {
        theme: this.roomState.theme,
        loopState: this.roomState.loopState,
        participants: this.roomState.participants,
        localUserId: this.deps.getCurrentUser()?.id || 0,
        localSessionId: mgr?.sessionId || null,
      });
    }
  }

  private closeFocusRoomModalUi(): void {
    this.focusRoomModal?.classList.add("hidden");
    this.focusRoomModal?.classList.remove("is-break-state", "is-strict-mode");
    this.endConfirmBar?.classList.add("hidden");
    this.renderer?.destroy();
    this.renderer = null;
    this.deps.getGameScene()?.resetFocusIdleTimer();
    this.lastIdleTriggerAt = Date.now();
    this.deps.setGameControlsActive(true);
  }

  private updateChimeLabel(): void {
    if (this.chimeLabel) {
      this.chimeLabel.textContent = this.chimeEnabled ? "ON" : "OFF";
    }
    if (this.btnChimeToggle) {
      this.btnChimeToggle.classList.toggle("is-muted", !this.chimeEnabled);
      this.btnChimeToggle.setAttribute("aria-pressed", String(this.chimeEnabled));
    }
  }

  private playCompletionChime(): void {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const t0 = ctx.currentTime + idx * 0.11;
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, t0);
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(0.11, t0 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.65);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + 0.7);
      });
      setTimeout(() => {
        ctx.close().catch(() => {});
      }, 1500);
    } catch {}
  }

  private showFocusNotice(msg: string, durationMs = 3500): void {
    if (!this.roomNoticeBanner) return;
    this.roomNoticeBanner.textContent = msg;
    this.roomNoticeBanner.classList.remove("hidden");
    if (this.noticeClearTimer) window.clearTimeout(this.noticeClearTimer);
    this.noticeClearTimer = window.setTimeout(() => {
      this.roomNoticeBanner?.classList.add("hidden");
    }, durationMs);
  }

  private showSquadFeedback(msg: string): void {
    if (!this.squadModalFeedback) return;
    this.squadModalFeedback.textContent = msg;
    this.squadModalFeedback.classList.remove("hidden");
    window.setTimeout(() => {
      this.squadModalFeedback?.classList.add("hidden");
    }, 3500);
  }

  private computeProjectedBreakdown(elapsedMinutes: number, isCompleted: boolean) {
    const s = this.roomState;
    const hasSquadSynergy = !!(s && s.roomType === "squad" && s.participants.filter((p) => p.inFocusRoom).length >= 2);
    return calculateFocusPointsReward({
      elapsedMinutes,
      targetMinutes: s?.targetMinutes || DEFAULT_POMODORO_MINUTES,
      isCompleted,
      isStrictMode: (s?.mode || "honor") === "strict",
      strictViolated: !!s?.strictViolated,
      streakDays: this.focusStats.streakDays,
      hasSquadSynergy,
      isFirstSessionToday: this.focusStats.isFirstSessionToday,
      priorDailyFocusMinutes: this.focusStats.dailyFocusMinutes,
    });
  }

  private renderFocusStatsHeader(): void {
    if (this.focusStreakVal) this.focusStreakVal.textContent = `${this.focusStats.streakDays}d`;
    if (this.focusShieldsVal) this.focusShieldsVal.textContent = String(this.focusStats.freezeShields);
    if (this.focusDailyVal) {
      this.focusDailyVal.textContent = `${this.focusStats.dailyFocusMinutes}/${FOCUS_DAILY_FULL_RATE_MINUTES}m`;
    }
    if (this.focusFpBalanceEl) {
      this.focusFpBalanceEl.textContent = `${this.focusStats.focusPoints} FP`;
    }
  }

  private renderFocusRoomModal(): void {
    const s = this.roomState;
    if (!s) return;

    this.renderFocusStatsHeader();

    if (this.focusModeTitle) {
      this.focusModeTitle.textContent =
        s.roomType === "squad" ? "PARTY" : "PERSONAL";
      this.focusModeTitle.classList.toggle("squad", s.roomType === "squad");
    }

    if (this.focusRoomModal) {
      this.focusRoomModal.classList.toggle("is-break-state", s.loopState === "break_reward");
      this.focusRoomModal.classList.toggle(
        "is-strict-mode",
        s.loopState === "focus_locked" && s.mode === "strict" && !s.strictViolated
      );
    }

    if (this.focusSpaceNameEl) {
      this.focusSpaceNameEl.textContent = s.spaceName || this.deps.getCurrentSpaceName();
    }
    if (this.focusThemeLabelEl) {
      this.focusThemeLabelEl.textContent = getThemeLabel(s.theme);
    }
    if (this.focusFallbackBadge) {
      if (s.isPersonalSpaceFallback) {
        this.focusFallbackBadge.classList.remove("hidden");
        this.focusFallbackBadge.textContent = s.themeSourceSpaceName
          ? `Theme: ${s.themeSourceSpaceName}`
          : "Last Public";
      } else {
        this.focusFallbackBadge.classList.add("hidden");
      }
    }

    // Manage animated stage renderer: active only during focus_locked, stopped in break_reward result modal
    const mgr = this.deps.getMultiplayer();
    if (s.loopState === "focus_locked") {
      if (!this.renderer && this.focusRoomCanvas) {
        this.renderer = new FocusSceneRenderer(this.focusRoomCanvas, {
          theme: s.theme,
          loopState: s.loopState,
          participants: s.participants,
          localUserId: this.deps.getCurrentUser()?.id || 0,
          localSessionId: mgr?.sessionId || null,
        });
      } else if (this.renderer) {
        this.renderer.updateConfig({
          theme: s.theme,
          loopState: s.loopState,
          participants: s.participants,
          localUserId: this.deps.getCurrentUser()?.id || 0,
          localSessionId: mgr?.sessionId || null,
        });
      }
    } else if (this.renderer) {
      this.renderer.destroy();
      this.renderer = null;
    }

    // Participants bar
    if (this.participantsListEl) {
      const uid = this.deps.getCurrentUser()?.id || 0;
      this.participantsListEl.innerHTML = s.participants
        .map((p) => {
          const isSelf = (uid > 0 && p.userId === uid) || p.sessionId === mgr?.sessionId;
          const badge = p.isLeader ? "Leader" : p.inFocusRoom ? "Focusing" : "Break";
          return `<span class="focus-participant-chip ${isSelf ? "self" : ""}">
            <span class="squad-member-dot" style="background:${escapeHtml(p.color || "#3B8282")};"></span>
            <span>${escapeHtml(p.name)}${isSelf ? " (You)" : ""}</span>
            <span style="opacity:0.7;font-size:10.5px;">${badge}</span>
          </span>`;
        })
        .join("");
    }

    if (s.loopState === "focus_locked") {
      this.lockedPanel?.classList.remove("hidden");
      this.breakPanel?.classList.add("hidden");
      this.renderFocusLockedControls(s);
    } else if (s.loopState === "break_reward") {
      this.lockedPanel?.classList.add("hidden");
      this.breakPanel?.classList.remove("hidden");
      if (s.lastReward) {
        this.renderBreakPanel(s.lastReward, (this.deps.getCurrentUser()?.id || 0) <= 0);
      }
    }
  }

  private renderFocusLockedControls(s: FocusRoomSessionState): void {
    const now = Date.now();
    const withinRoomGrace = now - s.roomStartedAt <= 2 * 60 * 1000;
    const withinPlayerGrace = now - s.playerJoinedAt <= 2 * 60 * 1000;
    const myUserId = this.deps.getCurrentUser()?.id || 0;
    const isStarterOrLeader =
      s.roomType === "personal" ||
      s.participants.some((p) => p.userId === myUserId && p.isLeader) ||
      this.squadState?.activeFocusSession?.initiatorUserId === myUserId;

    if (this.lockStateText) {
      const modeLabel = s.mode === "strict"
        ? s.strictViolated
          ? "STRICT FORFEITED · 1.00x"
          : "STRICT LOCK · 1.25x"
        : "HONOR · 1.00x";
      this.lockStateText.textContent = modeLabel;
    }
    if (this.lockStateDot) {
      this.lockStateDot.style.background = s.mode === "strict" && !s.strictViolated ? "#ECA239" : "#34d399";
    }

    // Strict warning banner
    if (this.strictWarningBanner && this.strictWarningText) {
      if (s.strictViolated) {
        this.strictWarningBanner.classList.remove("hidden");
        this.strictWarningText.textContent =
          "Strict Lock bonus forfeited (>30s away). Session continues at Honor 1.00x rate.";
      } else {
        this.strictWarningBanner.classList.add("hidden");
      }
    }

    // Preset & mode buttons
    document.querySelectorAll<HTMLButtonElement>(".focus-preset-btn[data-focus-mins]").forEach((btn) => {
      const mins = Number(btn.dataset.focusMins || 25);
      btn.classList.toggle("active", mins === s.targetMinutes);
      btn.disabled = !withinRoomGrace || !isStarterOrLeader;
    });
    if (this.customMinsInput && document.activeElement !== this.customMinsInput) {
      this.customMinsInput.value = String(s.targetMinutes);
      this.customMinsInput.disabled = !withinRoomGrace || !isStarterOrLeader;
    }
    if (this.btnApplyCustomMins) {
      this.btnApplyCustomMins.disabled = !withinRoomGrace || !isStarterOrLeader;
    }

    if (this.btnModeHonor) {
      this.btnModeHonor.classList.toggle("active", s.mode === "honor");
      this.btnModeHonor.disabled = s.mode === "strict" && !withinPlayerGrace;
    }
    if (this.btnModeStrict) {
      this.btnModeStrict.classList.toggle("active", s.mode === "strict");
      this.btnModeStrict.disabled = false;
    }

    // Projected reward at full completion
    const myJoinedMinutesCap = Math.min(
      s.targetMinutes,
      Math.max(0, (s.endsAt - s.playerJoinedAt) / 60_000)
    );
    const est = this.computeProjectedBreakdown(myJoinedMinutesCap, true);
    if (this.estimatedFpVal) {
      this.estimatedFpVal.textContent =
        (this.deps.getCurrentUser()?.id || 0) <= 0
          ? "Sign in to earn FP"
          : `+${est.totalFpEarned} FP`;
    }
    if (this.multiplierChips) {
      const chips: string[] = [];
      chips.push(
        `<span class="focus-mult-chip ${est.completeMult > 1 ? "boosted" : ""}">${est.completeMult.toFixed(2)}x Complete</span>`
      );
      if (est.streakMult > 1) {
        chips.push(`<span class="focus-mult-chip boosted">${est.streakMult.toFixed(2)}x Streak</span>`);
      }
      if (est.squadMult > 1) {
        chips.push(`<span class="focus-mult-chip boosted">${est.squadMult.toFixed(2)}x Party</span>`);
      }
      if (est.firstSparkMult > 1) {
        chips.push(`<span class="focus-mult-chip boosted">${est.firstSparkMult.toFixed(2)}x First Spark</span>`);
      }
      this.multiplierChips.innerHTML = chips.join("");
    }

    this.updateClockDisplayOnly();
  }

  private updateClockDisplayOnly(): void {
    const s = this.roomState;
    if (!s) return;
    const now = Date.now();
    if (s.loopState === "focus_locked") {
      const remainingSec = Math.max(0, Math.ceil((s.endsAt - now) / 1000));
      if (this.countdownDisplay) {
        this.countdownDisplay.textContent = formatClock(remainingSec);
      }
      const totalMs = Math.max(1000, s.endsAt - s.roomStartedAt);
      const elapsedMs = Math.max(0, Math.min(totalMs, now - s.roomStartedAt));
      if (this.progressFill) {
        this.progressFill.style.width = `${Math.round((elapsedMs / totalMs) * 100)}%`;
      }
    } else if (s.loopState === "break_reward" && this.breakCountdownEl) {
      const remainingBreakSec = Math.max(0, Math.ceil((this.breakEndsAt - now) / 1000));
      this.breakCountdownEl.textContent = formatClock(remainingBreakSec);
    }
  }

  private renderBreakPanel(b: FocusRewardBreakdown, isGuest: boolean): void {
    this.lockedPanel?.classList.add("hidden");
    this.breakPanel?.classList.remove("hidden");

    if (this.breakBadge) {
      this.breakBadge.textContent = b.forfeitedUnderMinimum
        ? "SESSION FORFEITED (< 10M)"
        : b.isCompleted
          ? "SESSION COMPLETE"
          : "ENDED EARLY (0.75x)";
    }
    if (this.breakHeading) {
      this.breakHeading.textContent = b.forfeitedUnderMinimum
        ? "Under 10-Minute Minimum"
        : b.isCompleted
          ? "Focus Session Complete!"
          : "Solid Effort — Take a Breather";
    }
    if (this.breakEarnedAmount) {
      this.breakEarnedAmount.textContent = `+${b.totalFpEarned} FP`;
    }
    if (this.breakNewBalance) {
      this.breakNewBalance.textContent = `Balance: ${b.newTotalFp} FP`;
    }
    if (this.breakGuestNote) {
      this.breakGuestNote.classList.toggle("hidden", !isGuest);
    }

    if (this.btnStartNext) {
      const nextMins = this.roomState?.targetMinutes || DEFAULT_POMODORO_MINUTES;
      this.btnStartNext.textContent = `Focus Again (${nextMins}m)`;
    }

    if (this.breakBreakdownGrid) {
      const cells: Array<[string, string]> = [
        ["Focused", `${b.elapsedMinutes}m`],
        ["Base", `${b.baseFp} FP`],
        ["Complete", `${b.completeMult.toFixed(2)}x`],
        ["Streak", `${b.streakMult.toFixed(2)}x (${b.streakDays}d)`],
        ["Party", `${b.squadMult.toFixed(2)}x`],
        ["Spark", `${b.firstSparkMult.toFixed(2)}x`],
        ...(b.karmaMult && b.karmaMult > 1 ? ([["Karma", `${b.karmaMult.toFixed(2)}x`]] as Array<[string, string]>) : []),
        ["Today", `${b.dailyFocusMinutes}/${FOCUS_DAILY_FULL_RATE_MINUTES}m`],
        ["Shields", `${b.freezeShields}/2`],
      ];
      this.breakBreakdownGrid.innerHTML = cells
        .map(
          ([k, v]) =>
            `<div class="focus-breakdown-cell"><span>${escapeHtml(k)}</span><strong>${escapeHtml(v)}</strong></div>`
        )
        .join("");
    }
  }

  private renderSquadHud(): void {
    const squad = this.squadState;
    if (!squad || squad.members.length === 0) {
      this.topbarSquadBadge?.classList.add("hidden");
      return;
    }

    if (this.topbarSquadBadge) {
      this.topbarSquadBadge.textContent = String(squad.members.length);
      this.topbarSquadBadge.classList.remove("hidden");
    }
  }

  private renderSquadModal(): void {
    const squad = this.squadState;
    const myUserId = this.deps.getCurrentUser()?.id || 0;
    const amILeader = !!squad && squad.leaderUserId === myUserId;

    if (this.squadModalCount) {
      this.squadModalCount.textContent = `${squad?.members.length || 0}/${FOCUS_SQUAD_MAX_MEMBERS}`;
    }

    this.btnSquadCreate?.classList.toggle("hidden", !!squad);
    this.btnSquadStartFocus?.classList.toggle("hidden", !squad);
    this.btnSquadLeave?.classList.toggle("hidden", !squad);

    if (this.btnSquadStartFocus && squad?.activeFocusSession?.spaceId === this.deps.getCurrentSpaceId()) {
      this.btnSquadStartFocus.textContent = "Join Party Focus";
    } else if (this.btnSquadStartFocus) {
      this.btnSquadStartFocus.textContent = "Start Party Focus";
    }

    // Current Party Members
    if (this.squadModalMembersList) {
      if (!squad || squad.members.length === 0) {
        this.squadModalMembersList.innerHTML =
          `<div class="squad-empty-state">Not in a party yet. Create one or tap a player to invite.</div>`;
      } else {
        this.squadModalMembersList.innerHTML = squad.members
          .map((m) => {
            const canKick = amILeader && m.userId !== myUserId;
            const roleLabel = m.isLeader ? "Leader" : "Member";
            const statusLabel = !m.isOnline ? "Offline" : m.inFocusRoom ? "Focusing" : "Online";
            return `<div class="squad-list-row">
              <div class="squad-list-info">
                <span class="squad-member-dot" style="background:${escapeHtml(m.isOnline ? m.color || "#3B8282" : "#64748b")};"></span>
                <div class="squad-list-text">
                  <span class="squad-list-name">${escapeHtml(m.name)}${m.userId === myUserId ? " (You)" : ""}</span>
                  <span class="squad-list-sub">${roleLabel} · ${statusLabel}</span>
                </div>
              </div>
              ${
                canKick
                  ? `<button type="button" class="squad-hud-mini-btn danger" data-kick-uid="${m.userId}">Remove</button>`
                  : ""
              }
            </div>`;
          })
          .join("");

        this.squadModalMembersList.querySelectorAll<HTMLButtonElement>("[data-kick-uid]").forEach((btn) => {
          btn.addEventListener("click", () => {
            const uid = Number(btn.dataset.kickUid || 0);
            if (uid > 0) this.deps.getMultiplayer()?.sendSquadKick(uid);
          });
        });
      }
    }
  }

  private hideIdleToast(): void {
    this.idleToast?.classList.add("hidden");
  }

  private startUiTickLoop(): void {
    if (this.uiTickTimer !== null) return;
    this.uiTickTimer = window.setInterval(() => {
      // 1. Live modal countdown update
      if (this.isFocusRoomModalOpen() && this.roomState) {
        this.updateClockDisplayOnly();
      }

      // 2. 1-minute inactivity auto-entry check
      const mgr = this.deps.getMultiplayer();
      const scene = this.deps.getGameScene();
      if (!mgr || !mgr.sessionId || !scene) {
        this.hideIdleToast();
        return;
      }

      if (this.isFocusRoomModalOpen() || this.roomState?.loopState === "focus_locked") {
        this.hideIdleToast();
        return;
      }

      if (this.idleStartInFlight || Date.now() - this.lastIdleTriggerAt < 5000) {
        return;
      }

      const idleMs = scene.getFocusIdleElapsedMs();
      if (idleMs >= FOCUS_IDLE_TIMEOUT_MS) {
        this.hideIdleToast();
        this.lastIdleTriggerAt = Date.now();
        this.startOrJoinFocusRoom(true);
      } else if (idleMs >= FOCUS_IDLE_TIMEOUT_MS - 10_000) {
        const secsLeft = Math.max(1, Math.ceil((FOCUS_IDLE_TIMEOUT_MS - idleMs) / 1000));
        const activeSquadRoom =
          this.squadState?.activeFocusSession &&
          this.squadState.activeFocusSession.spaceId === this.deps.getCurrentSpaceId();
        if (this.idleToastText) {
          this.idleToastText.textContent = activeSquadRoom
            ? `Auto-joining Party Focus Room in ${secsLeft}s (move to stay in world)`
            : `Entering Focus Room in ${secsLeft}s (move to stay in world)`;
        }
        this.idleToast?.classList.remove("hidden");
      } else {
        this.hideIdleToast();
      }
    }, 500);
  }
}
