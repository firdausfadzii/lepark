import Phaser from "phaser";
import { MultiplayerManager } from "./network/MultiplayerManager";
import { GameScene, InspectableMapItem } from "./scenes/GameScene";
import {
  DEFAULT_PRESET_COLORS,
  PlayerAvatars,
  AuthUser,
  AuthResponse,
  Space,
  SpacesListResponse,
  SpaceResponse,
  MAX_AVATAR_FRAMES,
  DEFAULT_AVATARS,
  ChatMessage,
  PrivateZone,
  VoicePeer,
  CHARACTER_MAX_SIZE,
  JukeboxState,
  JukeboxTrack,
  TypewriterState,
  TypeRaceRoomState,
  isWallAsset,
  isOverlayWallAsset,
  isOverlayFloorAsset,
  isFreeformAsset,
} from "shared";
import { VoiceManager, VoiceError } from "./network/VoiceManager";
import { JukeboxManager } from "./audio/JukeboxManager";

// Automatically inject skip_zrok_interstitial header on all outgoing fetch and XHR calls
// to prevent zrok public proxies from returning an HTML interstitial page for API requests
if (typeof window !== "undefined") {
  const origFetch = window.fetch;
  window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
    const customInit: RequestInit = init ? { ...init } : {};
    const headers = new Headers(customInit.headers || {});
    if (!headers.has("skip_zrok_interstitial")) {
      headers.set("skip_zrok_interstitial", "true");
    }
    customInit.headers = headers;
    return origFetch.call(this, input, customInit);
  };

  const origXhrOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (...args: any[]) {
    const res = origXhrOpen.apply(this, args as any);
    try {
      this.setRequestHeader("skip_zrok_interstitial", "true");
    } catch {}
    return res;
  };
}

// Types
type DirectionSlot = "idle" | "left" | "right" | "up" | "down";

// Helper to escape HTML in user/space titles
function escapeHtml(str: string): string {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// DOM Elements - Auth Modal
const authModal = document.getElementById("auth-modal") as HTMLDivElement;
const tabLogin = document.getElementById("tab-login") as HTMLButtonElement;
const tabRegister = document.getElementById(
  "tab-register",
) as HTMLButtonElement;
const loginForm = document.getElementById("login-form") as HTMLFormElement;
const registerForm = document.getElementById(
  "register-form",
) as HTMLFormElement;
const loginUsernameInput = document.getElementById(
  "login-username",
) as HTMLInputElement;
const loginPasswordInput = document.getElementById(
  "login-password",
) as HTMLInputElement;
const regUsernameInput = document.getElementById(
  "reg-username",
) as HTMLInputElement;
const regDisplayNameInput = document.getElementById(
  "reg-display-name",
) as HTMLInputElement;
const regPasswordInput = document.getElementById(
  "reg-password",
) as HTMLInputElement;
const regConfirmPasswordInput = document.getElementById(
  "reg-confirm-password",
) as HTMLInputElement;
const btnSubmitLogin = document.getElementById(
  "btn-submit-login",
) as HTMLButtonElement;
const btnSubmitRegister = document.getElementById(
  "btn-submit-register",
) as HTMLButtonElement;
const authAlert = document.getElementById("auth-alert") as HTMLDivElement;
const authAlertMsg = document.getElementById(
  "auth-alert-msg",
) as HTMLSpanElement;
const linkGoRegister = document.getElementById(
  "link-go-register",
) as HTMLButtonElement;
const linkGoLogin = document.getElementById(
  "link-go-login",
) as HTMLButtonElement;

// DOM Elements - Middle Top Bar & Profile Dropdown
const topbarProfileTrigger = document.getElementById(
  "topbar-profile-trigger",
) as HTMLDivElement;
const topbarAvatarDot = document.getElementById(
  "topbar-avatar-dot",
) as HTMLDivElement | null;
const topbarAvatarImg = document.getElementById(
  "topbar-avatar-img",
) as HTMLImageElement;
const topbarStatusDot = document.getElementById(
  "topbar-status-dot",
) as HTMLSpanElement;
const topbarAdminCrown = document.getElementById(
  "topbar-admin-crown",
) as HTMLSpanElement;
const topbarUserName = document.getElementById(
  "topbar-user-name",
) as HTMLSpanElement;
const topbarStatusSubtitle = document.getElementById(
  "topbar-status-subtitle",
) as HTMLSpanElement;

// User Profile Dropdown
const userProfileDropdown = document.getElementById(
  "user-profile-dropdown",
) as HTMLDivElement;
const dropdownMySpaceBtn = document.getElementById(
  "dropdown-my-space-btn",
) as HTMLButtonElement;
const dropdownMySpaceSub = document.getElementById(
  "dropdown-my-space-sub",
) as HTMLSpanElement;
const dropdownUpdateCharBtn = document.getElementById(
  "dropdown-update-char-btn",
) as HTMLButtonElement;
const dropdownLogoutBtn = document.getElementById(
  "dropdown-logout-btn",
) as HTMLButtonElement;

// Top-Left Controls
const btnMapSettings = document.getElementById(
  "btn-map-settings",
) as HTMLButtonElement;
const btnEditMap = document.getElementById("btn-edit-map") as HTMLButtonElement;
const mapEditBanner = document.getElementById(
  "map-edit-banner",
) as HTMLDivElement;
const editBannerAssetText = document.getElementById(
  "edit-banner-asset-text",
) as HTMLElement;
const btnBannerDone = document.getElementById(
  "btn-banner-done",
) as HTMLButtonElement | null;
const mapEditorSidebar = document.getElementById(
  "map-editor-sidebar",
) as HTMLElement;
const btnCloseMapEditor = document.getElementById(
  "btn-close-map-editor",
) as HTMLButtonElement;
const editorPlacingToast = document.getElementById(
  "editor-placing-toast",
) as HTMLElement | null;
const placingToastName = document.getElementById(
  "placing-toast-name",
) as HTMLElement | null;
const placingToastLayer = document.getElementById(
  "placing-toast-layer",
) as HTMLElement | null;
const placingToastHint = document.getElementById(
  "placing-toast-hint",
) as HTMLElement | null;
const btnToastDonePlacing = document.getElementById(
  "btn-toast-done-placing",
) as HTMLButtonElement | null;
const editorBrushCard = document.getElementById(
  "editor-brush-card",
) as HTMLElement | null;
const btnResetTileColor = document.getElementById(
  "btn-reset-tile-color",
) as HTMLButtonElement | null;
const editorTileColorInput = document.getElementById(
  "editor-tile-color-input",
) as HTMLInputElement | null;
const editorTileHexInput = document.getElementById(
  "editor-tile-hex-input",
) as HTMLInputElement | null;
const editorColorCircle = document.getElementById(
  "editor-color-circle",
) as HTMLElement | null;
const editorColorPalette = document.getElementById(
  "editor-color-palette",
) as HTMLElement | null;
const brushHeadline = document.getElementById(
  "brush-headline",
) as HTMLElement | null;
const brushColorText = document.getElementById(
  "brush-color-text",
) as HTMLElement | null;
const brushDot = document.getElementById("brush-dot") as HTMLElement | null;
const brushPatternLayer = document.getElementById(
  "brush-pattern-layer",
) as HTMLElement | null;
const brushTintLayer = document.getElementById(
  "brush-tint-layer",
) as HTMLElement | null;
const plainTilePreviewSquare = document.getElementById(
  "plain-tile-preview-square",
) as HTMLElement | null;
const overlayPlainTilePreviewSquare = document.getElementById(
  "overlay-plain-tile-preview-square",
) as HTMLElement | null;
const editorTileAlphaSlider = document.getElementById(
  "editor-tile-alpha-slider",
) as HTMLInputElement | null;
const editorTileAlphaInput = document.getElementById(
  "editor-tile-alpha-input",
) as HTMLInputElement | null;
const editorAlphaTrackBg = document.getElementById(
  "editor-alpha-track-bg",
) as HTMLElement | null;

// Top Bar Right Actions (Map, Ping, Loss)
const btnOpenMap = document.getElementById("btn-open-map") as HTMLButtonElement;
const topbarPingStat = document.getElementById(
  "topbar-ping-stat",
) as HTMLSpanElement;
const topbarLossStat = document.getElementById(
  "topbar-loss-stat",
) as HTMLSpanElement;

// DOM Elements - Map Modal (Grid of 4)
const mapModal = document.getElementById("map-modal") as HTMLDivElement;
const mapCurrentSpaceName = document.getElementById(
  "map-current-space-name",
) as HTMLElement;
const btnAdminAddSpace = document.getElementById(
  "btn-admin-add-space",
) as HTMLButtonElement;
const btnCloseMapModal = document.getElementById(
  "btn-close-map-modal",
) as HTMLButtonElement;
const mapCategoryTabs = document.getElementById(
  "map-category-tabs",
) as HTMLElement;
const mapSpacesGrid = document.getElementById("map-spaces-grid") as HTMLElement;

// DOM Elements - Update Character Modal
const modal = document.getElementById("onboarding-modal") as HTMLDivElement;
const btnCloseModal = document.getElementById(
  "btn-close-modal",
) as HTMLButtonElement;
const profileForm = document.getElementById("profile-form") as HTMLFormElement;
const nameInput = document.getElementById("player-name") as HTMLInputElement;
const currentUsernameTag = document.getElementById(
  "current-username-tag",
) as HTMLSpanElement;
const customColorInput = document.getElementById(
  "custom-color-picker",
) as HTMLInputElement | null;
const colorGrid = document.getElementById("color-grid") as HTMLDivElement | null;
const previewAvatar = document.getElementById(
  "preview-avatar",
) as HTMLImageElement;
const previewDirectionsBar = document.getElementById(
  "preview-directions-bar",
) as HTMLDivElement;
const previewStatusHint = document.getElementById(
  "preview-status-hint",
) as HTMLDivElement;
const previewName = document.getElementById("preview-name") as HTMLDivElement;
const btnJoin = document.getElementById("btn-join") as HTMLButtonElement;

// Switch and Sections for Custom Sprites
const switchUploadPictures = document.getElementById(
  "switch-upload-pictures",
) as HTMLInputElement;
const defaultCharacterSection = document.getElementById(
  "default-character-section",
) as HTMLDivElement | null;
const uploadPicturesSection = document.getElementById(
  "upload-pictures-section",
) as HTMLDivElement;

// DOM Elements - My Space Settings Modal
const mySpaceSettingsModal = document.getElementById(
  "my-space-settings-modal",
) as HTMLDivElement;
const btnCloseMySpaceSettings = document.getElementById(
  "btn-close-my-space-settings",
) as HTMLButtonElement;
const mySpaceSettingsForm = document.getElementById(
  "my-space-settings-form",
) as HTMLFormElement;
const mySpaceInputName = document.getElementById(
  "my-space-input-name",
) as HTMLInputElement;
const mySpaceSwitchPublic = document.getElementById(
  "my-space-switch-public",
) as HTMLInputElement;
const mySpaceWhitelistSection = document.getElementById(
  "my-space-whitelist-section",
) as HTMLDivElement;
const mySpaceInviteUsername = document.getElementById(
  "my-space-invite-username",
) as HTMLInputElement;
const btnAddMySpaceInvite = document.getElementById(
  "btn-add-my-space-invite",
) as HTMLButtonElement;
const mySpaceTagsCount = document.getElementById(
  "my-space-tags-count",
) as HTMLElement;
const mySpaceTagsContainer = document.getElementById(
  "my-space-tags-container",
) as HTMLElement;

// DOM Elements - Superadmin Space Modal
const adminSpaceModal = document.getElementById(
  "admin-space-modal",
) as HTMLDivElement;
const adminSpaceModalTitle = document.getElementById(
  "admin-space-modal-title",
) as HTMLElement;
const btnCloseAdminSpaceModal = document.getElementById(
  "btn-close-admin-space-modal",
) as HTMLButtonElement;
const adminSpaceForm = document.getElementById(
  "admin-space-form",
) as HTMLFormElement;
const adminSpaceEditId = document.getElementById(
  "admin-space-edit-id",
) as HTMLInputElement;
const adminSpaceName = document.getElementById(
  "admin-space-name",
) as HTMLInputElement;
const adminSpaceCategorySelect = document.getElementById(
  "admin-space-category-select",
) as HTMLSelectElement;
const adminSpaceCategoryCustom = document.getElementById(
  "admin-space-category-custom",
) as HTMLInputElement;
const adminSpaceSwitchPublic = document.getElementById(
  "admin-space-switch-public",
) as HTMLInputElement;
const adminSpaceWhitelistSection = document.getElementById(
  "admin-space-whitelist-section",
) as HTMLDivElement;
const adminSpaceInviteUsername = document.getElementById(
  "admin-space-invite-username",
) as HTMLInputElement;
const btnAddAdminSpaceInvite = document.getElementById(
  "btn-add-admin-space-invite",
) as HTMLButtonElement;
const adminSpaceTagsCount = document.getElementById(
  "admin-space-tags-count",
) as HTMLElement;
const adminSpaceTagsContainer = document.getElementById(
  "admin-space-tags-container",
) as HTMLElement;

// DOM Elements - Private Zone Name Modal
const privateZoneNameModal = document.getElementById(
  "private-zone-name-modal",
) as HTMLDivElement | null;
const privateZoneModalTitle = document.getElementById(
  "private-zone-modal-title",
) as HTMLElement | null;
const privateZoneModalSubtitle = document.getElementById(
  "private-zone-modal-subtitle",
) as HTMLElement | null;
const privateZoneNameForm = document.getElementById(
  "private-zone-name-form",
) as HTMLFormElement | null;
const privateZoneModalZoneId = document.getElementById(
  "private-zone-modal-zone-id",
) as HTMLInputElement | null;
const privateZoneInputName = document.getElementById(
  "private-zone-input-name",
) as HTMLInputElement | null;
const btnClosePrivateZoneModal = document.getElementById(
  "btn-close-private-zone-modal",
) as HTMLButtonElement | null;
const btnCancelPrivateZoneName = document.getElementById(
  "btn-cancel-private-zone-name",
) as HTMLButtonElement | null;
const btnSavePrivateZoneName = document.getElementById(
  "btn-save-private-zone-name",
) as HTMLButtonElement | null;

let pendingZoneBounds: {
  minCol: number;
  minRow: number;
  maxCol: number;
  maxRow: number;
} | null = null;

// ==========================================
// In-Game Chat DOM Elements & State
// ==========================================
const btnToggleChat = document.getElementById("btn-toggle-chat") as HTMLButtonElement | null;
const chatUnreadBadge = document.getElementById("chat-unread-badge");
const chatSidebar = document.getElementById("chat-sidebar") as HTMLElement | null;
const btnCloseChat = document.getElementById("btn-close-chat") as HTMLButtonElement | null;
const chatTabsContainer = document.getElementById("chat-tabs-container");
const chatTabMap = document.getElementById("chat-tab-map") as HTMLButtonElement | null;
const chatTabZone = document.getElementById("chat-tab-zone") as HTMLButtonElement | null;
const chatTabMapName = document.getElementById("chat-tab-map-name");
const chatTabZoneName = document.getElementById("chat-tab-zone-name");
const chatMapBadge = document.getElementById("chat-map-badge");
const chatZoneBadge = document.getElementById("chat-zone-badge");
const chatChannelBanner = document.getElementById("chat-channel-banner");
const chatChannelDot = document.getElementById("chat-channel-dot");
const chatChannelDesc = document.getElementById("chat-channel-desc");
const chatActiveChannelLabel = document.getElementById("chat-active-channel-label");
const chatMessagesContainer = document.getElementById("chat-messages-container");
const chatMessagesList = document.getElementById("chat-messages-list");
const chatInputForm = document.getElementById("chat-input-form") as HTMLFormElement | null;
const chatInputField = document.getElementById("chat-input-field") as HTMLInputElement | null;

// Player Interaction Context Menu DOM Elements & State
const playerContextMenu = document.getElementById("player-context-menu");
const playerMenuName = document.getElementById("player-menu-name");
const playerMenuColorDot = document.getElementById("player-menu-color-dot");
const btnClosePlayerMenu = document.getElementById("btn-close-player-menu") as HTMLButtonElement | null;
const btnPlayerMenuWhisper = document.getElementById("btn-player-menu-whisper") as HTMLButtonElement | null;
const btnPlayerMenuVisitSpace = document.getElementById("btn-player-menu-visit-space") as HTMLButtonElement | null;

// Space Access Error Modal DOM Elements
const spaceErrorModal = document.getElementById("space-error-modal");
const spaceErrorIcon = document.getElementById("space-error-icon");
const spaceErrorTitle = document.getElementById("space-error-title");
const spaceErrorSubtitle = document.getElementById("space-error-subtitle");
const spaceErrorMessage = document.getElementById("space-error-message");
const spaceErrorReturnName = document.getElementById("space-error-return-name");
const btnCloseSpaceErrorModal = document.getElementById("btn-close-space-error-modal") as HTMLButtonElement | null;
const btnSpaceErrorOk = document.getElementById("btn-space-error-ok") as HTMLButtonElement | null;

interface DmConversation {
  sessionId: string;
  userName: string;
  userColor?: string;
  isSuperadmin?: boolean;
  messages: ChatMessage[];
  unreadCount: number;
  tabElement?: HTMLButtonElement;
}

let isChatOpen = true; // Default open as requested
let activeChatRoom: string = "map"; // "map", "zone", or `dm_${sessionId}`
let currentInsideZone: PrivateZone | null = null;
const chatMessagesMap: ChatMessage[] = [];
const chatMessagesZone = new Map<string, ChatMessage[]>();
const dmConversations = new Map<string, DmConversation>();
let unreadMapCount = 0;
const unreadZoneCount = new Map<string, number>();
let totalClosedUnreadCount = 0;

let activeMenuPlayer: {
  sessionId: string;
  name: string;
  color: string;
  isSuperadmin: boolean;
  userId?: number;
  userSpaceId?: string;
} | null = null;
let menuOpenTimestamp = 0;

// ==========================================
// Microphone Controls & Proximity Voice State
// ==========================================
const btnToggleMic = document.getElementById("btn-toggle-mic") as HTMLButtonElement | null;
const micSvgOff = btnToggleMic?.querySelector(".mic-svg-off") as SVGElement | null;
const micSvgOn = btnToggleMic?.querySelector(".mic-svg-on") as SVGElement | null;
const micStatusDot = document.getElementById("mic-status-dot");

// Microphone Device Settings Dropdown Elements
const btnMicSettings = document.getElementById("btn-mic-settings") as HTMLButtonElement | null;
const audioSettingsDropdown = document.getElementById("audio-settings-dropdown") as HTMLDivElement | null;
const btnCloseAudioSettings = document.getElementById("btn-close-audio-settings") as HTMLButtonElement | null;
const audioInputSelect = document.getElementById("audio-input-select") as HTMLSelectElement | null;
const audioOutputSelect = document.getElementById("audio-output-select") as HTMLSelectElement | null;
const btnTestAudioOutput = document.getElementById("btn-test-audio-output") as HTMLButtonElement | null;
const btnRefreshDevices = document.getElementById("btn-refresh-devices") as HTMLButtonElement | null;
const micLevelBar = document.getElementById("mic-level-bar") as HTMLDivElement | null;
const micLiveIndicator = document.getElementById("mic-live-indicator") as HTMLSpanElement | null;
const outputSinkNote = document.getElementById("output-sink-note") as HTMLDivElement | null;
const audioOutputVolume = document.getElementById("audio-output-volume") as HTMLInputElement | null;
const outputVolumeValue = document.getElementById("output-volume-value") as HTMLSpanElement | null;
let isAudioSettingsOpen = false;

// Voice Notification Banner (Persistent Alert)
const voiceNotificationBanner = document.getElementById("voice-notification-banner") as HTMLDivElement | null;
const voiceNotifTitle = document.getElementById("voice-notif-title") as HTMLSpanElement | null;
const voiceNotifMsg = document.getElementById("voice-notif-msg") as HTMLParagraphElement | null;
const voiceNotifHint = document.getElementById("voice-notif-hint") as HTMLDivElement | null;
const voiceNotifActions = document.getElementById("voice-notif-actions") as HTMLDivElement | null;
const btnCloseVoiceNotif = document.getElementById("btn-close-voice-notif") as HTMLButtonElement | null;

let voiceManager: VoiceManager | null = null;
let jukeboxManager: JukeboxManager | null = null;
let currentModalJukeboxId: string | null = null;

// YouTube Jukebox DOM Elements
const jukeboxModal = document.getElementById("jukebox-modal") as HTMLDivElement | null;
const btnCloseJukeboxModal = document.getElementById("btn-close-jukebox-modal") as HTMLButtonElement | null;
const tabJukeboxSingle = document.getElementById("tab-jukebox-single") as HTMLButtonElement | null;
const tabJukeboxPlaylist = document.getElementById("tab-jukebox-playlist") as HTMLButtonElement | null;
const jukeboxNowPlayingTitle = document.getElementById("jukebox-now-playing-title") as HTMLHeadingElement | null;
const jukeboxNowPlayingSubmitter = document.getElementById("jukebox-now-playing-submitter") as HTMLParagraphElement | null;
const jukeboxStatusBadge = document.getElementById("jukebox-status-badge") as HTMLSpanElement | null;
const btnJukeboxSkip = document.getElementById("btn-jukebox-skip") as HTMLButtonElement | null;
const jukeboxAddTrackForm = document.getElementById("jukebox-add-track-form") as HTMLFormElement | null;
const jukeboxUrlInput = document.getElementById("jukebox-url-input") as HTMLInputElement | null;
const btnJukeboxAdd = document.getElementById("btn-jukebox-add") as HTMLButtonElement | null;
const jukeboxAddPlaylistForm = document.getElementById("jukebox-add-playlist-form") as HTMLFormElement | null;
const jukeboxPlaylistInput = document.getElementById("jukebox-playlist-input") as HTMLInputElement | null;
const btnJukeboxAddPlaylist = document.getElementById("btn-jukebox-add-playlist") as HTMLButtonElement | null;
const btnJukeboxPlaylistLabel = document.getElementById("btn-jukebox-playlist-label") as HTMLSpanElement | null;
const jukeboxPlaylistFileInput = document.getElementById("jukebox-playlist-file-input") as HTMLInputElement | null;
const jukeboxActionStatus = document.getElementById("jukebox-action-status") as HTMLDivElement | null;
const jukeboxStatusIcon = document.getElementById("jukebox-status-icon") as HTMLSpanElement | null;
const jukeboxStatusText = document.getElementById("jukebox-status-text") as HTMLSpanElement | null;
const jukeboxQueueCount = document.getElementById("jukebox-queue-count") as HTMLSpanElement | null;
const jukeboxQueueList = document.getElementById("jukebox-queue-list") as HTMLDivElement | null;

const jukeboxHudPill = document.getElementById("jukebox-hud-pill") as HTMLDivElement | null;
const jukeboxHudTrackTitle = document.getElementById("jukebox-hud-track-title") as HTMLSpanElement | null;
const jukeboxHudTrackSub = document.getElementById("jukebox-hud-track-sub") as HTMLSpanElement | null;
const btnJukeboxHudMute = document.getElementById("btn-jukebox-hud-mute") as HTMLButtonElement | null;

// Floating Player Card & Action Elements
const jukeboxPlayerCard = document.getElementById("jukebox-player-card") as HTMLDivElement | null;
const btnToggleJukeboxCollapse = document.getElementById("btn-toggle-jukebox-collapse") as HTMLButtonElement | null;
const btnOpenJukeboxFromPlayer = document.getElementById("btn-open-jukebox-from-player") as HTMLButtonElement | null;
const jukeboxPlayerErrorOverlay = document.getElementById("jukebox-player-error-overlay") as HTMLDivElement | null;
const btnPlayerOpenExternal = document.getElementById("btn-player-open-external") as HTMLAnchorElement | null;

// Jukebox Error Banner Elements in Modal
const jukeboxErrorBanner = document.getElementById("jukebox-error-banner") as HTMLDivElement | null;
const jukeboxErrorTitle = document.getElementById("jukebox-error-title") as HTMLSpanElement | null;
const jukeboxErrorDesc = document.getElementById("jukebox-error-desc") as HTMLParagraphElement | null;
const btnJukeboxOpenYoutube = document.getElementById("btn-jukebox-open-youtube") as HTMLAnchorElement | null;
const btnJukeboxErrorSkip = document.getElementById("btn-jukebox-error-skip") as HTMLButtonElement | null;

// Application State
let currentUser: AuthUser | null = null;
let authToken: string | null = null;
let selectedColor = DEFAULT_PRESET_COLORS[0]; // Lepark Slate Teal default
let gameInstance: Phaser.Game | null = null;
let multiplayer: MultiplayerManager | null = null;
let activePreviewDir: DirectionSlot = "idle";

// Spaces & Categories State
let currentSpaceId = "space_central_plaza";
let currentSpaceName = "CO3";
let loadedSpaces: Space[] = [];
let loadedCategories: string[] = [];
let myPersonalSpace: Space | null = null;
let activeCategoryFilter = "All";
let isSidePanelCollapsed = false;

let tempMySpaceWhitelist: string[] = [];
let tempAdminSpaceWhitelist: string[] = [];
let spacesRefreshTimer: number | null = null;

const uploadedFrames: Record<DirectionSlot, string[]> = {
  idle: [...DEFAULT_AVATARS.idle],
  left: [...DEFAULT_AVATARS.left],
  right: [...DEFAULT_AVATARS.right],
  up: [...DEFAULT_AVATARS.up],
  down: [...DEFAULT_AVATARS.down],
};
let previewAnimTimer: number | null = null;
let previewFrameIndex = 0;

function getApiUrl(path: string): string {
  const envUrl = (import.meta as any).env?.VITE_SERVER_URL;
  if (envUrl && typeof envUrl === "string" && envUrl.trim().length > 0) {
    let base = envUrl.trim().replace(/\/+$/, "");
    if (typeof window !== "undefined" && window.location.protocol === "https:" && base.startsWith("http://")) {
      base = base.replace(/^http:\/\//i, "https://");
    }
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${base}${cleanPath}`;
  }
  const host = window.location.hostname || "localhost";
  if (window.location.protocol === "http:" && (host === "localhost" || host === "127.0.0.1")) {
    return `http://${host}:2567${path.startsWith("/") ? path : `/${path}`}`;
  }
  if (window.location.protocol === "https:" && (host === "localhost" || host === "127.0.0.1")) {
    return `https://${host}:2567${path.startsWith("/") ? path : `/${path}`}`;
  }
  // When accessed via HTTPS, LAN IP, or any host without explicit VITE_SERVER_URL,
  // use same-origin which routes to backend via Vite proxy
  return path;
}

/**
 * Determine in-game character name:
 * "name will try to use 'display name' first. if not exist, use username."
 */
function getEffectivePlayerName(): string {
  if (currentUser) {
    if (currentUser.displayName && currentUser.displayName.trim().length > 0) {
      return currentUser.displayName.trim();
    }
    return currentUser.username;
  }
  return nameInput.value.trim() || "Player";
}

function setGameControlsActive(active: boolean) {
  if (active) {
    const twModal = document.getElementById("typerace-modal");
    if (twModal && !twModal.classList.contains("hidden")) {
      return;
    }
  }
  if (gameInstance) {
    const activeScene = gameInstance.scene.getScene("GameScene") as GameScene;
    if (activeScene && typeof activeScene.setControlsActive === "function") {
      activeScene.setControlsActive(active);
    }
  }
}

// ==========================================
// Auth Modal & Tab Management
// ==========================================

function showAuthAlert(message: string, isSuccess = false) {
  authAlertMsg.textContent = message;
  authAlert.className = isSuccess ? "auth-alert success" : "auth-alert";
  authAlert.classList.remove("hidden");
}

function hideAuthAlert() {
  authAlert.classList.add("hidden");
  authAlertMsg.textContent = "";
}

function openAuthModal(mode: "login" | "register" = "login") {
  authModal.classList.remove("hidden");
  hideAuthAlert();
  switchAuthTab(mode);
  setGameControlsActive(false);
}

function closeAuthModal() {
  authModal.classList.add("hidden");
  hideAuthAlert();
  setGameControlsActive(true);
}

function switchAuthTab(tab: "login" | "register") {
  hideAuthAlert();
  if (tab === "login") {
    tabLogin.classList.add("active");
    tabRegister.classList.remove("active");
    loginForm.classList.remove("hidden");
    registerForm.classList.add("hidden");
    setTimeout(() => loginUsernameInput.focus(), 60);
  } else {
    tabRegister.classList.add("active");
    tabLogin.classList.remove("active");
    registerForm.classList.remove("hidden");
    loginForm.classList.add("hidden");
    setTimeout(() => regUsernameInput.focus(), 60);
  }
}

tabLogin.addEventListener("click", () => switchAuthTab("login"));
tabRegister.addEventListener("click", () => switchAuthTab("register"));
linkGoRegister.addEventListener("click", () => switchAuthTab("register"));
linkGoLogin.addEventListener("click", () => switchAuthTab("login"));

// Password visibility toggles
document.querySelectorAll(".btn-toggle-pwd").forEach((btn) => {
  btn.addEventListener("click", () => {
    const targetId = (btn as HTMLElement).getAttribute("data-target");
    if (!targetId) return;
    const input = document.getElementById(targetId) as HTMLInputElement | null;
    if (input) {
      if (input.type === "password") {
        input.type = "text";
        btn.textContent = "🙈";
      } else {
        input.type = "password";
        btn.textContent = "👁️";
      }
    }
  });
});

// Register Form Submit
registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAuthAlert();

  const username = regUsernameInput.value.trim();
  const displayName = regDisplayNameInput.value.trim();
  const password = regPasswordInput.value;
  const confirmPassword = regConfirmPasswordInput.value;

  if (!username) {
    showAuthAlert("Username is required.");
    return;
  }
  if (!password) {
    showAuthAlert("Password is required.");
    return;
  }
  if (password !== confirmPassword) {
    showAuthAlert(
      "Passwords do not match. Please verify your password confirmation.",
    );
    return;
  }

  btnSubmitRegister.disabled = true;
  btnSubmitRegister.innerHTML = `<span>Creating account...</span>`;

  try {
    const res = await fetch(getApiUrl("/api/auth/register"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        displayName: displayName || undefined,
        password,
        confirmPassword,
      }),
    });

    const data: AuthResponse = await res.json();
    if (!res.ok || !data.success || !data.token || !data.user) {
      showAuthAlert(data.error || "Registration failed. Please try again.");
      return;
    }

    // Success: store auth credentials
    authToken = data.token;
    currentUser = data.user;
    localStorage.setItem("lepark_auth_token", authToken);
    localStorage.setItem("lepark_auth_user", JSON.stringify(currentUser));

    // Ensure newly created account starts with the male sprites assets with all movements
    const slots: DirectionSlot[] = ["idle", "left", "right", "up", "down"];
    slots.forEach((s) => {
      uploadedFrames[s] = [...DEFAULT_AVATARS[s]];
      renderSlotFrames(s);
    });
    localStorage.setItem("player_avatar_frames", JSON.stringify(uploadedFrames));
    localStorage.setItem("player_upload_switch", "false");
    switchUploadPictures.checked = false;
    defaultCharacterSection?.classList.remove("hidden");
    uploadPicturesSection.classList.add("hidden");

    closeAuthModal();
    await enterGameSession();
  } catch (err: any) {
    console.error("Register request failed:", err);
    showAuthAlert("Network error. Please check that the server is running.");
  } finally {
    btnSubmitRegister.disabled = false;
    btnSubmitRegister.innerHTML = `<span>Create Account</span><span class="btn-arrow">→</span>`;
  }
});

// Login Form Submit
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAuthAlert();

  const username = loginUsernameInput.value.trim();
  const password = loginPasswordInput.value;

  if (!username || !password) {
    showAuthAlert("Please enter both username and password.");
    return;
  }

  btnSubmitLogin.disabled = true;
  btnSubmitLogin.innerHTML = `<span>Signing in...</span>`;

  try {
    const res = await fetch(getApiUrl("/api/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data: AuthResponse = await res.json();
    if (!res.ok || !data.success || !data.token || !data.user) {
      showAuthAlert(data.error || "Invalid username or password.");
      return;
    }

    // Success: store auth credentials
    authToken = data.token;
    currentUser = data.user;
    localStorage.setItem("lepark_auth_token", authToken);
    localStorage.setItem("lepark_auth_user", JSON.stringify(currentUser));

    closeAuthModal();
    await enterGameSession();
  } catch (err: any) {
    console.error("Login request failed:", err);
    showAuthAlert("Network error. Please check that the server is running.");
  } finally {
    btnSubmitLogin.disabled = false;
    btnSubmitLogin.innerHTML = `<span>Sign In</span><span class="btn-arrow">→</span>`;
  }
});

// Logout Handler
dropdownLogoutBtn.addEventListener("click", () => {
  closeProfileDropdown();
  handleLogout();
});

function handleLogout() {
  if (spacesRefreshTimer !== null) {
    clearInterval(spacesRefreshTimer);
    spacesRefreshTimer = null;
  }

  if (multiplayer) {
    multiplayer.leave();
    multiplayer = null;
  }

  if (gameInstance) {
    gameInstance.destroy(true);
    gameInstance = null;
  }

  localStorage.removeItem("lepark_auth_token");
  localStorage.removeItem("lepark_auth_user");
  currentUser = null;
  authToken = null;
  myPersonalSpace = null;
  loadedSpaces = [];
  loadedCategories = [];

  topbarStatusDot.style.background = "#ef4444";
  topbarStatusDot.style.boxShadow = "0 0 6px #ef4444";
  topbarStatusSubtitle.textContent = "Offline";
  if (topbarPingStat) topbarPingStat.textContent = "-- ms";
  if (topbarLossStat) topbarLossStat.textContent = "-- loss";
  if (btnMapSettings) btnMapSettings.classList.add("hidden");
  if (btnEditMap) btnEditMap.classList.add("hidden");
  exitEditMode();

  // Reset inputs
  loginPasswordInput.value = "";
  regPasswordInput.value = "";
  regConfirmPasswordInput.value = "";

  openAuthModal("login");
}

// ==========================================
// Character Customization & Swatches
// ==========================================

function setupColorSwatches() {
  if (!colorGrid) return;
  colorGrid.innerHTML = "";
  DEFAULT_PRESET_COLORS.forEach((colorHex) => {
    const swatch = document.createElement("button");
    swatch.type = "button";
    swatch.className = "color-option";
    swatch.style.backgroundColor = colorHex;
    swatch.setAttribute("data-color", colorHex);

    if (colorHex.toLowerCase() === selectedColor.toLowerCase()) {
      swatch.classList.add("selected");
    }

    swatch.addEventListener("click", () => {
      selectColor(colorHex);
    });

    colorGrid.appendChild(swatch);
  });
}

function selectColor(colorHex: string) {
  selectedColor = colorHex;
  if (customColorInput) customColorInput.value = colorHex;

  document.querySelectorAll(".color-option").forEach((el) => {
    if (
      el.getAttribute("data-color")?.toLowerCase() === colorHex.toLowerCase()
    ) {
      el.classList.add("selected");
    } else {
      el.classList.remove("selected");
    }
  });

  updatePreview();
}

function startPreviewAnimation() {
  if (previewAnimTimer !== null) return;
  previewAnimTimer = window.setInterval(() => {
    previewFrameIndex++;
    updatePreviewFrame();
  }, 166);
}

function updatePreview() {
  const inputVal = nameInput.value.trim();
  const fallbackUsername = currentUser ? currentUser.username : "Player";
  const currentName = inputVal.length > 0 ? inputVal : fallbackUsername;

  previewName.textContent = currentName;
  updatePreviewFrame();
}

function updatePreviewFrame() {
  const isSwitchOn = switchUploadPictures.checked;

  if (isSwitchOn && uploadedFrames.idle.length > 0) {
    const frames =
      uploadedFrames[activePreviewDir].length > 0
        ? uploadedFrames[activePreviewDir]
        : uploadedFrames.idle;

    const currentImg = frames[previewFrameIndex % frames.length];
    previewAvatar.src = currentImg;

    if (activePreviewDir === "idle") {
      previewStatusHint.classList.add("hidden");
    } else if (uploadedFrames[activePreviewDir].length > 0) {
      previewStatusHint.textContent = `Showing custom ${activePreviewDir} (${uploadedFrames[activePreviewDir].length} frame${uploadedFrames[activePreviewDir].length > 1 ? "s" : ""})`;
      previewStatusHint.classList.remove("hidden");
    } else {
      previewStatusHint.textContent = `Using standing still fallback for ${activePreviewDir}`;
      previewStatusHint.classList.remove("hidden");
    }
  } else {
    // Default avatar preview (animating idle/walk cycles based on direction)
    const defaultFrames =
      DEFAULT_AVATARS[activePreviewDir] || DEFAULT_AVATARS.idle;
    const currentImg = defaultFrames[previewFrameIndex % defaultFrames.length];
    previewAvatar.src = currentImg;

    if (activePreviewDir === "idle") {
      previewStatusHint.textContent = "Default character (idle south)";
    } else {
      previewStatusHint.textContent = `Default character (${activePreviewDir})`;
    }
    previewStatusHint.classList.remove("hidden");
  }
}

function processImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 150;
        let width = img.width;
        let height = img.height;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function renderSlotFrames(slot: DirectionSlot) {
  const container = document.getElementById(`frames-strip-${slot}`);
  const counter = document.getElementById(`badge-counter-${slot}`);
  if (!container) return;

  const frames = uploadedFrames[slot] || [];
  if (counter) {
    counter.textContent = `${frames.length} / ${MAX_AVATAR_FRAMES}`;
    if (frames.length > 0) {
      counter.classList.add("has-frames");
    } else {
      counter.classList.remove("has-frames");
    }
  }

  container.innerHTML = "";

  frames.forEach((frameUrl, idx) => {
    const card = document.createElement("div");
    card.className = "frame-card";

    const img = document.createElement("img");
    img.className = "frame-thumb-img";
    img.src = frameUrl;
    img.alt = `${slot} frame ${idx + 1}`;

    const pill = document.createElement("span");
    pill.className = "frame-index-pill";
    pill.textContent = `#${idx + 1}`;

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "btn-delete-frame";
    delBtn.title = "Delete frame";
    delBtn.textContent = "✕";
    delBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteSlotFrame(slot, idx);
    });

    card.appendChild(img);
    card.appendChild(pill);
    card.appendChild(delBtn);
    container.appendChild(card);
  });

  if (frames.length < MAX_AVATAR_FRAMES) {
    const addDropzone = document.createElement("div");
    addDropzone.className = "add-frame-dropzone";
    addDropzone.title = `Add frame (${frames.length + 1} of ${MAX_AVATAR_FRAMES})`;
    addDropzone.innerHTML = `
      <span class="add-frame-icon">+</span>
      <span class="add-frame-text">Add Frame</span>
    `;

    addDropzone.addEventListener("click", () => {
      const fileInput = document.getElementById(
        `file-${slot}`,
      ) as HTMLInputElement;
      if (fileInput) fileInput.click();
    });

    addDropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      addDropzone.style.borderColor = "var(--primary-accent)";
    });

    addDropzone.addEventListener("dragleave", () => {
      addDropzone.style.borderColor = "";
    });

    addDropzone.addEventListener("drop", async (e) => {
      e.preventDefault();
      addDropzone.style.borderColor = "";
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        await handleFilesForSlot(slot, Array.from(files));
      }
    });

    container.appendChild(addDropzone);
  }
}

function deleteSlotFrame(slot: DirectionSlot, index: number) {
  if (uploadedFrames[slot] && index >= 0 && index < uploadedFrames[slot].length) {
    uploadedFrames[slot].splice(index, 1);
    renderSlotFrames(slot);
    updatePreview();
  }
}

async function handleFilesForSlot(slot: DirectionSlot, files: File[]) {
  const imageFiles = files.filter((f) => f.type.startsWith("image/"));
  if (imageFiles.length === 0) return;

  const currentCount = uploadedFrames[slot].length;
  const remaining = MAX_AVATAR_FRAMES - currentCount;
  if (remaining <= 0) return;

  const toProcess = imageFiles.slice(0, remaining);
  for (const file of toProcess) {
    try {
      const dataUrl = await processImageFile(file);
      uploadedFrames[slot].push(dataUrl);
    } catch (err) {
      console.error("Error processing frame image:", err);
    }
  }

  renderSlotFrames(slot);
  updatePreview();
}

function setupUploadSlots() {
  const slots: DirectionSlot[] = ["idle", "left", "right", "up", "down"];

  slots.forEach((slot) => {
    const fileInput = document.getElementById(
      `file-${slot}`,
    ) as HTMLInputElement;
    const stripContainer = document.getElementById(
      `frames-strip-${slot}`,
    ) as HTMLDivElement;

    if (fileInput) {
      fileInput.addEventListener("change", async () => {
        if (fileInput.files && fileInput.files.length > 0) {
          await handleFilesForSlot(slot, Array.from(fileInput.files));
          fileInput.value = "";
        }
      });
    }

    if (stripContainer) {
      stripContainer.addEventListener("dragover", (e) => {
        e.preventDefault();
      });
      stripContainer.addEventListener("drop", async (e) => {
        e.preventDefault();
        if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
          await handleFilesForSlot(slot, Array.from(e.dataTransfer.files));
        }
      });
    }
  });

  document.querySelectorAll(".preview-dir-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const dir = (btn as HTMLElement).getAttribute(
        "data-dir",
      ) as DirectionSlot;
      if (dir) {
        activePreviewDir = dir;
        document
          .querySelectorAll(".preview-dir-btn")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        updatePreview();
      }
    });
  });

  const btnLoadDemo = document.getElementById(
    "btn-load-demo-sprites",
  ) as HTMLButtonElement;
  if (btnLoadDemo) {
    btnLoadDemo.addEventListener("click", () => {
      slots.forEach((s) => {
        uploadedFrames[s] = [...DEFAULT_AVATARS[s]];
        renderSlotFrames(s);
      });
      updatePreview();
    });
  }

  const btnClearAll = document.getElementById(
    "btn-clear-all-sprites",
  ) as HTMLButtonElement;
  if (btnClearAll) {
    btnClearAll.addEventListener("click", () => {
      slots.forEach((s) => {
        uploadedFrames[s] = [];
        renderSlotFrames(s);
      });
      updatePreview();
    });
  }

  startPreviewAnimation();
}

switchUploadPictures.addEventListener("change", () => {
  if (switchUploadPictures.checked) {
    defaultCharacterSection?.classList.add("hidden");
    uploadPicturesSection.classList.remove("hidden");
  } else {
    defaultCharacterSection?.classList.remove("hidden");
    uploadPicturesSection.classList.add("hidden");
  }
  updatePreview();
});

nameInput.addEventListener("input", updatePreview);
if (customColorInput) {
  customColorInput.addEventListener("input", (e) => {
    selectColor((e.target as HTMLInputElement).value);
  });
}

// Update Character Modal Open / Close
function openUpdateCharacterModal() {
  btnJoin.textContent = "Save Changes";
  nameInput.value = currentUser?.displayName || "";
  if (currentUsernameTag) {
    currentUsernameTag.textContent = currentUser
      ? `@${currentUser.username}`
      : "";
  }
  updatePreview();

  modal.classList.remove("hidden");
  setGameControlsActive(false);

  setTimeout(() => {
    nameInput.focus();
    nameInput.select();
  }, 50);
}

function closeUpdateCharacterModal() {
  modal.classList.add("hidden");
  setGameControlsActive(true);
}

dropdownUpdateCharBtn.addEventListener("click", () => {
  closeProfileDropdown();
  openUpdateCharacterModal();
});

btnCloseModal.addEventListener("click", () => {
  closeUpdateCharacterModal();
});

function computeActiveAvatars(): PlayerAvatars | undefined {
  const isSwitchOn = switchUploadPictures.checked;
  if (!isSwitchOn || uploadedFrames.idle.length === 0) {
    return undefined;
  }

  // Check if actual custom base64 frames exist
  const slots: DirectionSlot[] = ["idle", "left", "right", "up", "down"];
  const hasCustomFrames = slots.some((s) =>
    uploadedFrames[s].some((f) => typeof f === "string" && f.startsWith("data:image/"))
  );
  if (!hasCustomFrames) {
    return undefined;
  }

  const idle = uploadedFrames.idle.filter((f) => typeof f === "string" && f.startsWith("data:image/"));
  if (idle.length === 0) return undefined;

  return {
    idle,
    left: uploadedFrames.left.length > 0 ? uploadedFrames.left : idle,
    right: uploadedFrames.right.length > 0 ? uploadedFrames.right : idle,
    up: uploadedFrames.up.length > 0 ? uploadedFrames.up : idle,
    down: uploadedFrames.down.length > 0 ? uploadedFrames.down : idle,
  };
}

// Handle Update Character Form Submission
async function handleUpdateCharacter(e: Event) {
  e.preventDefault();

  const newDisplayName = nameInput.value.trim();
  const color = selectedColor;
  const avatars = computeActiveAvatars();

  if (currentUser && authToken) {
    const previousDisplayName = currentUser.displayName || "";
    if (newDisplayName !== previousDisplayName) {
      try {
        const res = await fetch(getApiUrl("/api/auth/profile"), {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ displayName: newDisplayName || null }),
        });
        const data: AuthResponse = await res.json();
        if (data.success && data.user) {
          currentUser = data.user;
          if (data.token) {
            authToken = data.token;
            localStorage.setItem("lepark_auth_token", authToken);
          }
          localStorage.setItem("lepark_auth_user", JSON.stringify(currentUser));
        }
      } catch (err) {
        console.warn("Could not sync display name with server:", err);
      }
    }
  }

  try {
    localStorage.setItem("player_color", color);
    localStorage.setItem(
      "player_upload_switch",
      switchUploadPictures.checked ? "true" : "false",
    );
    localStorage.setItem(
      "player_avatar_frames",
      JSON.stringify(uploadedFrames),
    );
  } catch (err) {
    console.warn("Could not save avatar frames to localStorage:", err);
  }

  closeUpdateCharacterModal();
  updateTopBarUI();

  const effectiveName = getEffectivePlayerName();

  if (multiplayer) {
    multiplayer.updateProfile(effectiveName, color, avatars || null);

    if (multiplayer.sessionId && gameInstance) {
      const activeScene = gameInstance.scene.getScene("GameScene") as GameScene;
      if (activeScene && typeof activeScene.setPlayerAvatars === "function") {
        activeScene.setPlayerAvatars(multiplayer.sessionId, avatars || null);
      }
    }
  }
}

profileForm.addEventListener("submit", handleUpdateCharacter);

// ==========================================
// Middle Top Bar, Profile Dropdown & Map Modal
// ==========================================

function toggleProfileDropdown() {
  const isCurrentlyOpen = !userProfileDropdown.classList.contains("hidden");
  if (isCurrentlyOpen) {
    closeProfileDropdown();
  } else {
    openProfileDropdown();
  }
}

function openProfileDropdown() {
  closeAudioSettingsDropdown();
  userProfileDropdown.classList.remove("hidden");
  topbarProfileTrigger.classList.add("active");
}

function closeProfileDropdown() {
  userProfileDropdown.classList.add("hidden");
  topbarProfileTrigger.classList.remove("active");
}

topbarProfileTrigger.addEventListener("click", (e) => {
  // Prevent click on trigger inside dropdown from closing immediately
  if ((e.target as HTMLElement).closest(".user-profile-dropdown")) {
    return;
  }
  toggleProfileDropdown();
});

// Close dropdown on outside click
document.addEventListener("click", (e) => {
  if (!topbarProfileTrigger.contains(e.target as Node)) {
    closeProfileDropdown();
  }
});

// Dropdown Action: Go to My Space
dropdownMySpaceBtn.addEventListener("click", () => {
  closeProfileDropdown();
  if (myPersonalSpace) {
    switchSpace(myPersonalSpace.id, myPersonalSpace.name);
  } else {
    alert(
      "Personal space is still initializing. Please try again in a moment.",
    );
  }
});

// Top-Left Map Settings Click Handler
if (btnMapSettings) {
  btnMapSettings.addEventListener("click", () => {
    // If in own personal space, open personal space settings modal
    if (myPersonalSpace && currentSpaceId === myPersonalSpace.id) {
      openMySpaceSettingsModal();
      return;
    }

    // If superadmin in directory space, open edit space modal for current space
    if (currentUser?.role === "superadmin") {
      const spaceToEdit = loadedSpaces.find((s) => s.id === currentSpaceId);
      if (spaceToEdit) {
        openAdminEditSpaceModal(spaceToEdit);
      } else {
        openMySpaceSettingsModal();
      }
    }
  });
}

// ==========================================
// Map Editor Logic & Controls
// ==========================================

let isEditModeActive = false;
let isEditorUIHidden = false;
let currentSelectedAssetId = "";
let currentSelectedAssetName = "No Asset Selected";
let currentSelectedTileRgb: string | null = null; // 6-digit #RRGGBB or null for Original
let currentSelectedTileAlpha: number = 100; // 0 to 100%
let currentSelectedTileColor: string | null = null; // null = original/no tint, #RRGGBB, or #RRGGBBAA
let placingToastFadeTimeout: any = null;

function computeCombinedTileColor(rgbHex: string | null, alphaPercent: number): string | null {
  const clampedAlpha = Math.max(0, Math.min(100, Math.round(alphaPercent)));
  if (!rgbHex && clampedAlpha >= 100) {
    return null;
  }
  const cleanRgb = (rgbHex || "#FFFFFF").replace("#", "").slice(0, 6).toUpperCase();
  if (clampedAlpha >= 100) {
    return `#${cleanRgb}`;
  }
  const alphaByte = Math.round((clampedAlpha / 100) * 255);
  const alphaHex = alphaByte.toString(16).padStart(2, "0").toUpperCase();
  return `#${cleanRgb}${alphaHex}`;
}

function formatColorBadgeLabel(colorHex: string | null): string {
  if (!colorHex) return "Original (No Tint)";
  const clean = colorHex.replace("#", "").toUpperCase();
  if (clean.length === 8) {
    const rgbPart = clean.slice(0, 6);
    const alphaByte = parseInt(clean.slice(6, 8), 16);
    const pct = Number.isNaN(alphaByte) ? 100 : Math.round((alphaByte / 255) * 100);
    return `#${rgbPart} (${pct}%)`;
  }
  return `#${clean}`;
}

const MAP_EDITOR_PRESET_COLORS = [
  { name: "Original", hex: null },
  { name: "Slate Teal", hex: "#3B8282" },
  { name: "Ochre Gold", hex: "#ECA239" },
  { name: "Terracotta", hex: "#DB5B47" },
  { name: "Forest Dark", hex: "#1E3131" },
  { name: "Emerald", hex: "#10B981" },
  { name: "Royal Blue", hex: "#3B82F6" },
  { name: "Cyan", hex: "#06B6D4" },
  { name: "Purple", hex: "#8B5CF6" },
  { name: "Rose Pink", hex: "#EC4899" },
  { name: "Orange", hex: "#F97316" },
  { name: "Cool Slate", hex: "#64748B" },
  { name: "Clean White", hex: "#FFFFFF" },
];

function setupMapEditorColorPicker() {
  if (!editorColorPalette) return;
  editorColorPalette.innerHTML = "";

  MAP_EDITOR_PRESET_COLORS.forEach((preset) => {
    const swatch = document.createElement("button");
    swatch.type = "button";
    swatch.className = "editor-palette-swatch";
    if (preset.hex === null) {
      swatch.classList.add("swatch-none");
      swatch.title = "Original (No tint, 100% opacity)";
      if (currentSelectedTileColor === null) {
        swatch.classList.add("selected");
      }
    } else {
      swatch.style.backgroundColor = preset.hex;
      swatch.title = `${preset.name} (${preset.hex})`;
      swatch.setAttribute("data-color", preset.hex);
      if (
        currentSelectedTileRgb?.toLowerCase() === preset.hex.toLowerCase()
      ) {
        swatch.classList.add("selected");
      }
    }

    swatch.addEventListener("click", () => {
      selectTileColor(preset.hex, preset.hex !== null);
    });

    editorColorPalette.appendChild(swatch);
  });

  if (editorTileColorInput) {
    editorTileColorInput.addEventListener("input", (e) => {
      const val = (e.target as HTMLInputElement).value;
      selectTileColor(val, true);
    });
  }

  if (editorTileHexInput) {
    editorTileHexInput.addEventListener("input", (e) => {
      const raw = (e.target as HTMLInputElement).value.trim().replace("#", "");
      if (raw.length === 6 && /^[0-9a-fA-F]{6}$/.test(raw)) {
        selectTileColor(`#${raw}`, true, true);
      } else if (raw.length === 8 && /^[0-9a-fA-F]{8}$/.test(raw)) {
        selectTileColor(`#${raw}`, false, true);
      }
    });
  }

  if (editorTileAlphaSlider) {
    editorTileAlphaSlider.addEventListener("input", (e) => {
      const val = parseInt((e.target as HTMLInputElement).value, 10);
      if (!Number.isNaN(val)) {
        setTileAlpha(val);
      }
    });
  }

  if (editorTileAlphaInput) {
    editorTileAlphaInput.addEventListener("input", (e) => {
      const raw = (e.target as HTMLInputElement).value.trim();
      if (raw === "") return;
      const val = parseInt(raw, 10);
      if (!Number.isNaN(val)) {
        setTileAlpha(Math.max(0, Math.min(100, val)), true);
      }
    });
    editorTileAlphaInput.addEventListener("blur", () => {
      if (editorTileAlphaInput) {
        editorTileAlphaInput.value = String(currentSelectedTileAlpha);
      }
    });
  }

  if (btnResetTileColor) {
    btnResetTileColor.addEventListener("click", (e) => {
      e.stopPropagation();
      selectTileColor(null, false);
    });
  }
}

function switchEditorTab(tabName: "utilities" | "flooring" | "wall" | "decoration") {
  const tabBtns = document.querySelectorAll<HTMLButtonElement>(".editor-tab-btn[data-editor-tab]");
  tabBtns.forEach((btn) => {
    const isActive = btn.dataset.editorTab === tabName;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-selected", String(isActive));
  });

  const tabPanels = document.querySelectorAll<HTMLElement>(
    "#map-editor-sidebar .editor-category-group[data-tab-panel]"
  );
  tabPanels.forEach((panel) => {
    const isActive = panel.dataset.tabPanel === tabName;
    panel.classList.toggle("active-tab-panel", isActive);
  });
}

function setupMapEditorAccordions() {
  // 1. Bottom bar tabs navigation
  const tabBtns = document.querySelectorAll<HTMLButtonElement>(".editor-tab-btn[data-editor-tab]");
  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.editorTab as
        | "utilities"
        | "flooring"
        | "wall"
        | "decoration"
        | undefined;
      if (tab) {
        switchEditorTab(tab);
      }
    });
  });

  // 2. Left Color Picker Sidebar Hide & Expand controls
  const colorSidebar = document.getElementById("map-editor-color-sidebar");
  const colorHeader = document.getElementById("color-sidebar-header-toggle");
  const btnToggleColor = document.getElementById("btn-toggle-color-sidebar");
  const btnExpandColor = document.getElementById("btn-expand-color-sidebar");

  const setColorSidebarCollapsed = (collapsed: boolean) => {
    if (!colorSidebar) return;
    colorSidebar.classList.toggle("collapsed", collapsed);
    if (colorHeader) {
      colorHeader.setAttribute("aria-expanded", String(!collapsed));
    }
  };

  if (btnToggleColor) {
    btnToggleColor.addEventListener("click", (e) => {
      e.stopPropagation();
      const isNowCollapsed = !colorSidebar?.classList.contains("collapsed");
      setColorSidebarCollapsed(isNowCollapsed);
    });
  }

  if (btnExpandColor) {
    btnExpandColor.addEventListener("click", (e) => {
      e.stopPropagation();
      setColorSidebarCollapsed(false);
    });
  }

  if (colorHeader) {
    colorHeader.addEventListener("click", (e) => {
      if (
        e.target instanceof Element &&
        (e.target.closest("#btn-dropper-shortcut") || e.target.closest("#btn-reset-tile-color"))
      ) {
        return;
      }
      const isNowCollapsed = !colorSidebar?.classList.contains("collapsed");
      setColorSidebarCollapsed(isNowCollapsed);
    });
  }
}

function setupMapEditorDecorationControls() {
  const btnWallObstacle = document.getElementById("btn-wall-obstacle");
  const btnWallPassable = document.getElementById("btn-wall-passable");

  if (btnWallObstacle) {
    btnWallObstacle.addEventListener("click", () => {
      setObstacleEnabled(true);
    });
  }

  if (btnWallPassable) {
    btnWallPassable.addEventListener("click", () => {
      setObstacleEnabled(false);
    });
  }

  const btnPassable = document.getElementById("btn-deco-passable");
  const btnSolid = document.getElementById("btn-deco-solid");

  if (btnPassable) {
    btnPassable.addEventListener("click", () => {
      setObstacleEnabled(false);
    });
  }

  if (btnSolid) {
    btnSolid.addEventListener("click", () => {
      setObstacleEnabled(true);
    });
  }

  const btnBehind = document.getElementById("btn-deco-layer-behind");
  const btnOntop = document.getElementById("btn-deco-layer-ontop");

  if (btnBehind) {
    btnBehind.addEventListener("click", () => {
      setDecorationRenderLayer(false);
    });
  }

  if (btnOntop) {
    btnOntop.addEventListener("click", () => {
      setDecorationRenderLayer(true);
    });
  }

  const btnLevelDown = document.getElementById("btn-deco-level-down");
  const btnLevelUp = document.getElementById("btn-deco-level-up");

  if (btnLevelDown) {
    btnLevelDown.addEventListener("click", () => {
      adjustPlacementLayer(-1);
    });
  }

  if (btnLevelUp) {
    btnLevelUp.addEventListener("click", () => {
      adjustPlacementLayer(1);
    });
  }
}

function setTileAlpha(alphaPercent: number, skipNumberInputUpdate: boolean = false) {
  currentSelectedTileAlpha = Math.max(0, Math.min(100, Math.round(alphaPercent)));
  currentSelectedTileColor = computeCombinedTileColor(
    currentSelectedTileRgb,
    currentSelectedTileAlpha,
  );
  syncColorPickerUI(false, skipNumberInputUpdate);
}

function selectTileColor(
  colorHex: string | null,
  preserveAlpha: boolean = false,
  skipHexInputUpdate: boolean = false,
) {
  if (!colorHex) {
    currentSelectedTileRgb = null;
    currentSelectedTileAlpha = 100;
    currentSelectedTileColor = null;
  } else {
    const clean = colorHex.replace("#", "").toUpperCase();
    const rgbPart = `#${clean.slice(0, 6)}`;
    currentSelectedTileRgb = rgbPart;
    if (clean.length === 8) {
      const alphaByte = parseInt(clean.slice(6, 8), 16);
      if (!Number.isNaN(alphaByte)) {
        currentSelectedTileAlpha = Math.round((alphaByte / 255) * 100);
      }
    } else if (!preserveAlpha) {
      currentSelectedTileAlpha = 100;
    }
    currentSelectedTileColor = computeCombinedTileColor(
      currentSelectedTileRgb,
      currentSelectedTileAlpha,
    );
  }

  syncColorPickerUI(skipHexInputUpdate, false);
}

function syncColorPickerUI(
  skipHexInputUpdate: boolean = false,
  skipNumberInputUpdate: boolean = false,
) {
  const displayRgb = currentSelectedTileRgb || "#3B8282";
  if (editorTileColorInput && currentSelectedTileRgb) {
    editorTileColorInput.value = currentSelectedTileRgb;
  }
  if (!skipHexInputUpdate && editorTileHexInput) {
    if (currentSelectedTileColor) {
      editorTileHexInput.value = currentSelectedTileColor.replace("#", "").toUpperCase();
    } else if (currentSelectedTileRgb) {
      editorTileHexInput.value = currentSelectedTileRgb.replace("#", "").toUpperCase();
    }
  }
  if (editorColorCircle) {
    editorColorCircle.style.backgroundColor = currentSelectedTileColor || displayRgb;
  }
  if (editorTileAlphaSlider) {
    editorTileAlphaSlider.value = String(currentSelectedTileAlpha);
  }
  if (!skipNumberInputUpdate && editorTileAlphaInput) {
    editorTileAlphaInput.value = String(currentSelectedTileAlpha);
  }
  if (editorAlphaTrackBg) {
    const trackColor = currentSelectedTileRgb || "#FFFFFF";
    editorAlphaTrackBg.style.background = `linear-gradient(to right, transparent, ${trackColor})`;
  }

  // Update palette swatches active class
  document.querySelectorAll(".editor-palette-swatch").forEach((el) => {
    const swatchColor = el.getAttribute("data-color");
    if (!currentSelectedTileColor && el.classList.contains("swatch-none")) {
      el.classList.add("selected");
    } else if (
      currentSelectedTileRgb &&
      swatchColor &&
      swatchColor.toLowerCase() === currentSelectedTileRgb.toLowerCase()
    ) {
      el.classList.add("selected");
    } else {
      el.classList.remove("selected");
    }
  });

  updateBrushPreview();
  updateEditBannerText();

  if (gameInstance) {
    const scene = gameInstance.scene.getScene("GameScene") as GameScene;
    if (scene) {
      scene.setSelectedColor(currentSelectedTileColor);
    }
  }
}

function updateBrushPreview() {
  if (brushHeadline) {
    brushHeadline.textContent = currentSelectedAssetId
      ? currentSelectedAssetName
      : "No Asset Selected";
  }

  if (brushColorText) {
    brushColorText.textContent = formatColorBadgeLabel(currentSelectedTileColor);
  }

  if (brushDot) {
    if (currentSelectedTileColor) {
      brushDot.style.display = "inline-block";
      brushDot.style.backgroundColor = currentSelectedTileColor;
      brushDot.style.boxShadow = `0 0 6px ${currentSelectedTileRgb || "#ffffff"}`;
    } else {
      brushDot.style.display = "none";
    }
  }

function normalizeFloorAssetKey(key: string): string {
  if (key === "birch_floor_150" || key === "birch_floor_100") return "wood_5";
  if (key === "carpet_grey_150") return "carpet_4";
  if (key === "grass_150" || key === "grass_100" || key === "grass_tile") return "grass_4";
  return key;
}

function normalizeDecorationAssetKey(key: string): string {
  if (key === "table_left_150") return "table_2_left";
  if (key === "table_middle_150") return "table_2_middle";
  if (key === "table_right_150") return "table_2_right";
  if (key === "round_table_150") return "round_table_1";
  if (key === "office_chair_150") return "office_chair_1_front";
  if (key === "office_chair_back_150") return "office_chair_1_back";
  if (key === "jukebox_150") return "jukebox_1";
  if (key === "typewriter_150") return "typewriter_1";
  return key;
}

function getAssetImagePath(assetId: string): string | null {
  const normalized = normalizeDecorationAssetKey(normalizeFloorAssetKey(assetId));
  const floorAssets = new Set([
    "carpet_1", "carpet_2", "carpet_3", "carpet_4", "carpet_5", "carpet_6", "carpet_7", "carpet_8",
    "grass_1", "grass_2", "grass_3", "grass_4",
    "marble_1", "marble_2", "marble_3", "marble_4",
    "stone_1", "stone_2", "stone_3", "stone_4", "stone_5", "stone_6", "stone_7", "stone_8",
    "wood_1", "wood_2", "wood_3", "wood_4", "wood_5", "wood_6"
  ]);
  if (floorAssets.has(normalized)) {
    return `/assets/floor/${normalized}.png`;
  }
  const glassWallAssets = new Set([
    "glass_1", "glass_2", "glass_3", "glass_4"
  ]);
  if (glassWallAssets.has(normalized)) {
    return `/assets/wall/${normalized}.png`;
  }
  if (normalized.startsWith("wood_wall_")) {
    const num = normalized.replace("wood_wall_", "");
    return `/assets/wall/wood_${num}.png`;
  }
  if (normalized.startsWith("wall_wood_")) {
    const num = normalized.replace("wall_wood_", "");
    return `/assets/wall/wood_${num}.png`;
  }
  const decoAssets = new Set([
    "table_1_left", "table_1_middle", "table_1_right",
    "table_2_left", "table_2_middle", "table_2_right",
    "round_table_1", "typewriter_1",
    "office_chair_1_front", "office_chair_1_back",
    "jukebox_1"
  ]);
  if (decoAssets.has(normalized)) {
    return `/assets/decoration/${normalized}.png`;
  }
  return null;
}

  const assetPath = getAssetImagePath(currentSelectedAssetId);
  const alphaRatio = String(currentSelectedTileAlpha / 100);

  if (brushPatternLayer) {
    if (assetPath) {
      brushPatternLayer.style.backgroundImage = `url("${assetPath}")`;
      brushPatternLayer.style.backgroundColor = "transparent";
      brushPatternLayer.style.opacity = alphaRatio;
    } else {
      // Plain tile or Overlay Plain tile
      brushPatternLayer.style.backgroundImage = "none";
      brushPatternLayer.style.backgroundColor = currentSelectedTileRgb || "#ffffff";
      brushPatternLayer.style.opacity = alphaRatio;
    }
  }

  if (brushTintLayer) {
    if (assetPath && currentSelectedTileRgb) {
      brushTintLayer.style.backgroundColor = currentSelectedTileRgb;
      brushTintLayer.style.opacity = String(0.75 * (currentSelectedTileAlpha / 100));
    } else {
      brushTintLayer.style.opacity = "0";
    }
  }

  const previewColor = currentSelectedTileColor || "#ffffff";
  if (plainTilePreviewSquare) {
    plainTilePreviewSquare.style.backgroundColor = previewColor;
  }
  if (overlayPlainTilePreviewSquare) {
    overlayPlainTilePreviewSquare.style.backgroundColor = previewColor;
  }
  const collapsedSwatch = document.getElementById("color-Collapsed-swatch");
  if (collapsedSwatch) {
    collapsedSwatch.style.backgroundColor = currentSelectedTileRgb || "#3B8282";
  }
}

let activeEditorTool:
  | "none"
  | "cursor"
  | "flooring"
  | "decoration"
  | "clear_decoration"
  | "private_zone"
  | "clear_private_zone"
  | "jukebox"
  | "typewriter"
  | "freeform_decoration"
  | "spawn_point"
  | "color_dropper" = "none";

let previousToolBeforeDropper: {
  tool:
    | "none"
    | "cursor"
    | "flooring"
    | "decoration"
    | "clear_decoration"
    | "private_zone"
    | "clear_private_zone"
    | "jukebox"
    | "typewriter"
    | "freeform_decoration"
    | "spawn_point";
  assetId: string;
  assetName: string;
} = {
  tool: "none",
  assetId: "",
  assetName: "No Asset Selected",
};

let isObstacleEnabled: boolean = true;
let isDecorationPassable: boolean = false;
let isDecorationOntop: boolean = false;
let currentPlacementLayer: number = 0;

function isCurrentToolLayerable(): boolean {
  if (
    activeEditorTool === "decoration" ||
    activeEditorTool === "freeform_decoration" ||
    activeEditorTool === "jukebox" ||
    activeEditorTool === "typewriter"
  ) {
    return true;
  }
  if (
    activeEditorTool === "flooring" &&
    (isOverlayFloorAsset(currentSelectedAssetId) || isOverlayWallAsset(currentSelectedAssetId))
  ) {
    return true;
  }
  return false;
}

function updatePlacementLayerUI() {
  const hintEl = document.getElementById("deco-level-hint");
  if (hintEl) {
    hintEl.textContent = `Layer ${currentPlacementLayer} (↑/↓)`;
  }

  // Update placing toast layer badge
  if (placingToastLayer) {
    if (isCurrentToolLayerable()) {
      placingToastLayer.textContent = `Layer ${currentPlacementLayer} (↑/↓)`;
      placingToastLayer.classList.remove("hidden");
    } else {
      placingToastLayer.classList.add("hidden");
    }
  }

  updateEditBannerText();

  // If in placing mode, refresh toast and wake from faded state
  if (isEditModeActive && isEditorUIHidden && isCurrentToolLayerable()) {
    if (editorPlacingToast) {
      editorPlacingToast.classList.remove("hidden");
      editorPlacingToast.classList.remove("faded");
      if (placingToastFadeTimeout) {
        clearTimeout(placingToastFadeTimeout);
      }
      placingToastFadeTimeout = setTimeout(() => {
        if (isEditorUIHidden && editorPlacingToast) {
          editorPlacingToast.classList.add("faded");
        }
      }, 3500);
    }
  }
}

function setPlacementLayer(layer: number, notifyScene: boolean = true) {
  currentPlacementLayer = Math.max(-50, Math.min(50, Math.round(layer)));
  if (notifyScene && gameInstance) {
    const scene = gameInstance.scene.getScene("GameScene") as GameScene;
    if (scene && typeof scene.setPlacementLayer === "function") {
      scene.setPlacementLayer(currentPlacementLayer);
    }
  }
  updatePlacementLayerUI();
}

let lastPlacementLayerAdjustTime = 0;
function adjustPlacementLayer(delta: number) {
  const now = performance.now();
  if (now - lastPlacementLayerAdjustTime < 25) return;
  lastPlacementLayerAdjustTime = now;
  setPlacementLayer(currentPlacementLayer + delta, true);
}
(window as any).adjustPlacementLayer = adjustPlacementLayer;

function setObstacleEnabled(enabled: boolean) {
  isObstacleEnabled = enabled;
  isDecorationPassable = !enabled;

  const btnWallObstacle = document.getElementById("btn-wall-obstacle");
  const btnWallPassable = document.getElementById("btn-wall-passable");
  const wallHintEl = document.getElementById("wall-obstacle-hint");

  if (btnWallObstacle && btnWallPassable) {
    if (enabled) {
      btnWallObstacle.classList.add("active");
      btnWallPassable.classList.remove("active");
      if (wallHintEl) {
        wallHintEl.textContent = "Solid (Obstacle)";
        wallHintEl.classList.add("solid");
      }
    } else {
      btnWallObstacle.classList.remove("active");
      btnWallPassable.classList.add("active");
      if (wallHintEl) {
        wallHintEl.textContent = "Walkable";
        wallHintEl.classList.remove("solid");
      }
    }
  }

  const btnPassable = document.getElementById("btn-deco-passable");
  const btnSolid = document.getElementById("btn-deco-solid");
  const hintEl = document.getElementById("deco-passable-hint");

  if (btnPassable && btnSolid) {
    if (!enabled) {
      btnPassable.classList.add("active");
      btnSolid.classList.remove("active");
      if (hintEl) {
        hintEl.textContent = "Walkable";
        hintEl.classList.remove("solid");
      }
    } else {
      btnPassable.classList.remove("active");
      btnSolid.classList.add("active");
      if (hintEl) {
        hintEl.textContent = "Solid (Obstacle)";
        hintEl.classList.add("solid");
      }
    }
  }

  if (gameInstance) {
    const scene = gameInstance.scene.getScene("GameScene") as GameScene;
    if (scene) {
      if (typeof scene.setObstacleEnabled === "function") {
        scene.setObstacleEnabled(enabled);
      }
      if (typeof scene.setDecorationPassable === "function") {
        scene.setDecorationPassable(!enabled);
      }
    }
  }

  updateEditBannerText();
}

function setDecorationPassable(passable: boolean) {
  setObstacleEnabled(!passable);
}

function setDecorationRenderLayer(ontop: boolean) {
  isDecorationOntop = ontop;
  const btnBehind = document.getElementById("btn-deco-layer-behind");
  const btnOntop = document.getElementById("btn-deco-layer-ontop");
  const hintEl = document.getElementById("deco-layer-hint");

  if (btnBehind && btnOntop) {
    if (ontop) {
      btnBehind.classList.remove("active");
      btnOntop.classList.add("active");
      if (hintEl) hintEl.textContent = "On Top of Character";
    } else {
      btnBehind.classList.add("active");
      btnOntop.classList.remove("active");
      if (hintEl) hintEl.textContent = "Behind Character";
    }
  }

  if (gameInstance) {
    const scene = gameInstance.scene.getScene("GameScene") as GameScene;
    if (scene && typeof scene.setDecorationOntop === "function") {
      scene.setDecorationOntop(ontop);
    }
  }

  updateEditBannerText();
}

function updateEditBannerText() {
  if (!editBannerAssetText) return;

  if (activeEditorTool === "none") {
    editBannerAssetText.innerHTML = `<em>No tool selected • Pick a tool or asset from the bottom bar</em>`;
    return;
  }

  if (activeEditorTool === "cursor") {
    editBannerAssetText.innerHTML = `<span class="banner-cursor-tag">🖱️ Cursor</span> Active: <strong>Inspect &amp; Delete</strong> • <em>Click any item on the map (wall, typewriter, jukebox, decoration, floor) to open its menu</em>`;
    return;
  }

  if (activeEditorTool === "jukebox") {
    editBannerAssetText.innerHTML = `<span class="banner-private-tag" style="background: rgba(245, 158, 11, 0.2); color: #fbbf24; border-color: rgba(245, 158, 11, 0.4);">📻 YouTube Jukebox</span> Active: <strong>Freeform Placement</strong> • <span class="banner-layer-tag">Layer ${currentPlacementLayer} (↑/↓)</span> • <em>Click anywhere to place • Use ↑/↓ arrow keys to change layer</em>`;
    return;
  }

  if (activeEditorTool === "typewriter") {
    editBannerAssetText.innerHTML = `<span class="banner-private-tag" style="background: rgba(139, 92, 246, 0.2); color: #c084fc; border-color: rgba(139, 92, 246, 0.4);">⌨️ Typewriter</span> Active: <strong>Type Racing Game (Freeform)</strong> • <span class="banner-layer-tag">Layer ${currentPlacementLayer} (↑/↓)</span> • <em>Click anywhere to place • Use ↑/↓ arrow keys to change layer</em>`;
    return;
  }

  if (activeEditorTool === "spawn_point") {
    editBannerAssetText.innerHTML = `<span class="banner-spawn-tag">📍 Spawn Point</span> Active: <strong>Player Spawn Point</strong> • <em>Click anywhere to place spawn point (1 per map)</em>`;
    return;
  }

  if (activeEditorTool === "color_dropper") {
    editBannerAssetText.innerHTML = `<span class="banner-dropper-tag">💧 Color Dropper</span> Active: <strong>Eyedropper</strong> • <em>Click any tile on the map to sample its color</em>`;
    return;
  }

  if (activeEditorTool === "private_zone") {
    editBannerAssetText.innerHTML = `<span class="banner-private-tag">🔒 Flag Private Area</span> Active: <strong>Private Tile Flagging</strong> • <em>Drag area on map to mark</em>`;
    return;
  }
  if (activeEditorTool === "clear_private_zone") {
    editBannerAssetText.innerHTML = `<span class="banner-clear-tag">✕ Clear Private</span> Active: <strong>Remove Private Area</strong> • <em>Drag area on map to clear</em>`;
    return;
  }
  if (activeEditorTool === "clear_decoration") {
    editBannerAssetText.innerHTML = `<span class="banner-clear-tag">✕ Remove Deco</span> Active: <strong>Remove Decoration</strong> • <em>Click on decoration item to remove</em>`;
    return;
  }
  if (activeEditorTool === "freeform_decoration") {
    const colorMarkup = currentSelectedTileColor
      ? `<span class="banner-color-indicator" style="background:${currentSelectedTileColor};"></span><strong>${formatColorBadgeLabel(currentSelectedTileColor)}</strong>`
      : `<em>(No Tint)</em>`;
    const passageMarkup = isDecorationPassable
      ? `<span class="banner-passable-tag">🟢 Passable</span>`
      : `<span class="banner-solid-tag">🚫 Solid (Impassable)</span>`;
    const layerMarkup = isDecorationOntop
      ? `<span class="banner-layer-tag">🔼 On Top</span>`
      : `<span class="banner-layer-tag">🔽 Behind</span>`;
    const levelMarkup = `<span class="banner-layer-tag">Layer ${currentPlacementLayer} (↑/↓)</span>`;
    editBannerAssetText.innerHTML = `<span class="banner-deco-tag" style="background:linear-gradient(135deg,#8b5cf6,#ec4899);">🪑 Freeform</span> Active: <strong>${currentSelectedAssetName}</strong> • ${passageMarkup} • ${layerMarkup} • ${levelMarkup} • Color: ${colorMarkup} • <em>Click to place • ↑/↓ arrows for layer</em>`;
    return;
  }
  if (activeEditorTool === "decoration") {
    const colorMarkup = currentSelectedTileColor
      ? `<span class="banner-color-indicator" style="background:${currentSelectedTileColor};"></span><strong>${formatColorBadgeLabel(currentSelectedTileColor)}</strong>`
      : `<em>(No Tint)</em>`;
    const passageMarkup = isDecorationPassable
      ? `<span class="banner-passable-tag">🟢 Passable</span>`
      : `<span class="banner-solid-tag">🚫 Solid (Impassable)</span>`;
    const layerMarkup = isDecorationOntop
      ? `<span class="banner-layer-tag">🔼 On Top</span>`
      : `<span class="banner-layer-tag">🔽 Behind</span>`;
    const levelMarkup = `<span class="banner-layer-tag">Layer ${currentPlacementLayer} (↑/↓)</span>`;
    editBannerAssetText.innerHTML = `<span class="banner-deco-tag">🪴 Decoration</span> Active: <strong>${currentSelectedAssetName}</strong> • ${passageMarkup} • ${layerMarkup} • ${levelMarkup} • Color: ${colorMarkup} • <em>Click to place • ↑/↓ arrows for layer</em>`;
    return;
  }

  const isWall = isWallAsset(currentSelectedAssetId);
  const isOverlayWall = isOverlayWallAsset(currentSelectedAssetId);
  const isOverlayFloor = isOverlayFloorAsset(currentSelectedAssetId);
  const obstacleTag = (isWall || isOverlayWall)
    ? (isObstacleEnabled
        ? `<span class="banner-solid-tag">🚫 Obstacle</span> `
        : `<span class="banner-passable-tag">🟢 Walkable</span> `)
    : "";
  const wallTag = isOverlayWall
    ? `<span class="banner-wall-tag" style="background:rgba(59,130,246,0.3);border-color:rgba(59,130,246,0.6);">🧱 Overlay Wall</span> ${obstacleTag}`
    : isOverlayFloor
    ? `<span class="banner-wall-tag" style="background:rgba(59,130,246,0.3);border-color:rgba(59,130,246,0.6);">🟦 Overlay Floor</span> `
    : isWall
    ? `<span class="banner-wall-tag">🧱 Wall</span> ${obstacleTag}`
    : "";
  const overlayLevelTag =
    isOverlayWall || isOverlayFloor
      ? ` • <span class="banner-layer-tag">Layer ${currentPlacementLayer} (↑/↓)</span>`
      : "";
  const hintText = isOverlayWall || isOverlayFloor
    ? ` • <em>Renders on top of floor • ↑/↓ arrows for layer</em>`
    : "";
  const colorMarkup = currentSelectedTileColor
    ? `<span class="banner-color-indicator" style="background:${currentSelectedTileColor};"></span><strong>${formatColorBadgeLabel(currentSelectedTileColor)}</strong>`
    : `<em>(No Tint)</em>`;
  editBannerAssetText.innerHTML = `${wallTag}Active: <strong>${currentSelectedAssetName}</strong>${overlayLevelTag} • Color: ${colorMarkup}${hintText}`;
}

function showPlacingToast(assetName: string) {
  if (!editorPlacingToast) return;
  if (placingToastName) {
    placingToastName.textContent = assetName;
  }
  if (placingToastLayer) {
    if (isCurrentToolLayerable()) {
      placingToastLayer.textContent = `Layer ${currentPlacementLayer} (↑/↓)`;
      placingToastLayer.classList.remove("hidden");
    } else {
      placingToastLayer.classList.add("hidden");
    }
  }
  if (placingToastHint) {
    if (isCurrentToolLayerable()) {
      placingToastHint.innerHTML = `Press <kbd class="placing-kbd">↑</kbd> <kbd class="placing-kbd">↓</kbd> to change layer • <kbd class="placing-kbd">Esc</kbd> when done`;
    } else {
      placingToastHint.innerHTML = `Drag map to put tiles • Press <kbd class="placing-kbd">Esc</kbd> when done`;
    }
  }
  if (placingToastFadeTimeout) {
    clearTimeout(placingToastFadeTimeout);
    placingToastFadeTimeout = null;
  }

  editorPlacingToast.classList.remove("hidden");
  editorPlacingToast.classList.remove("faded");

  placingToastFadeTimeout = setTimeout(() => {
    if (isEditorUIHidden && editorPlacingToast) {
      editorPlacingToast.classList.add("faded");
    }
  }, 3500);
}

function hidePlacingToast() {
  if (placingToastFadeTimeout) {
    clearTimeout(placingToastFadeTimeout);
    placingToastFadeTimeout = null;
  }
  if (editorPlacingToast) {
    editorPlacingToast.classList.add("hidden");
    editorPlacingToast.classList.remove("faded");
  }
}

function hideEditorUIForPlacing(assetName?: string) {
  if (!isEditModeActive) return;
  isEditorUIHidden = true;
  document.body.classList.add("editor-placing-mode");
  showPlacingToast(assetName || currentSelectedAssetName);
}

function showEditorUI() {
  if (!isEditModeActive) return;
  isEditorUIHidden = false;
  document.body.classList.remove("editor-placing-mode");
  hidePlacingToast();
  closeEditorItemContextMenu();

  if (gameInstance) {
    const scene = gameInstance.scene.getScene("GameScene") as GameScene;
    if (scene && typeof scene.cancelEditorSelection === "function") {
      scene.cancelEditorSelection();
    }
  }
}

function enterEditMode() {
  if (!canChangeCurrentSpaceSettings()) {
    alert("You do not have permission to edit this space's map.");
    return;
  }
  isEditModeActive = true;
  isEditorUIHidden = false;
  activeEditorTool = "none";
  currentSelectedAssetId = "";
  currentSelectedAssetName = "No Asset Selected";
  document.querySelectorAll(".editor-asset-card").forEach((card) => {
    card.classList.remove("selected");
  });

  document.body.classList.add("edit-mode-active");
  document.body.classList.remove("editor-placing-mode");
  hidePlacingToast();
  closeEditorItemContextMenu();
  closeAudioSettingsDropdown();
  if (document.activeElement === chatInputField) {
    chatInputField?.blur();
    setGameControlsActive(true);
  }
  const toprightBar = document.getElementById("topright-bar");
  if (toprightBar) toprightBar.classList.add("hidden");
  if (chatSidebar) chatSidebar.classList.add("hidden");

  if (mapEditorSidebar) mapEditorSidebar.classList.remove("hidden");
  const colorSidebarEl = document.getElementById("map-editor-color-sidebar");
  if (colorSidebarEl) colorSidebarEl.classList.remove("hidden");
  if (mapEditBanner) mapEditBanner.classList.remove("hidden");
  if (btnEditMap) {
    btnEditMap.classList.add("active");
    const label = btnEditMap.querySelector(".edit-btn-label");
    if (label) label.textContent = "Exit Edit";
  }

  if (gameInstance) {
    const scene = gameInstance.scene.getScene("GameScene") as GameScene;
    if (scene) {
      setupScenePrivateZoneEvents(scene);
      setupSceneJukeboxEvents(scene);
      setupSceneTypewriterEvents(scene);
      setupSceneEditorToolEvents(scene);
      scene.setEditMode(true);
      scene.setActiveEditorTool(activeEditorTool);
      scene.setSelectedAsset(currentSelectedAssetId);
      scene.setSelectedColor(currentSelectedTileColor);
      scene.setDecorationPassable(isDecorationPassable);
      scene.setDecorationOntop(isDecorationOntop);
      scene.setPlacementLayer(currentPlacementLayer);
    }
  }

  updateBrushPreview();
  updatePlacementLayerUI();
  updateEditBannerText();
}

function exitEditMode() {
  if (!isEditModeActive) return;
  isEditModeActive = false;
  isEditorUIHidden = false;
  document.body.classList.remove("edit-mode-active");
  document.body.classList.remove("editor-placing-mode");
  hidePlacingToast();
  const toprightBar = document.getElementById("topright-bar");
  if (toprightBar) toprightBar.classList.remove("hidden");
  if (chatSidebar) chatSidebar.classList.remove("hidden");

  if (mapEditorSidebar) mapEditorSidebar.classList.add("hidden");
  const colorSidebarEl = document.getElementById("map-editor-color-sidebar");
  if (colorSidebarEl) colorSidebarEl.classList.add("hidden");
  closeEditorItemContextMenu();
  if (mapEditBanner) mapEditBanner.classList.add("hidden");
  if (btnEditMap) {
    btnEditMap.classList.remove("active");
    const label = btnEditMap.querySelector(".edit-btn-label");
    if (label) label.textContent = "Edit Map";
  }

  if (gameInstance) {
    const scene = gameInstance.scene.getScene("GameScene") as GameScene;
    if (scene) {
      scene.setEditMode(false);
    }
  }
}

function toggleEditMode() {
  if (isEditModeActive) {
    exitEditMode();
  } else {
    enterEditMode();
  }
}

function selectEditorAsset(assetId: string, assetName: string) {
  activeEditorTool = "flooring";
  currentSelectedAssetId = assetId;
  currentSelectedAssetName = assetName;

  const cards = document.querySelectorAll(".editor-asset-card");
  cards.forEach((card) => {
    if ((card as HTMLElement).dataset.assetId === assetId && !(card as HTMLElement).dataset.toolType) {
      card.classList.add("selected");
    } else {
      card.classList.remove("selected");
    }
  });

  updateBrushPreview();
  updateEditBannerText();

  if (gameInstance) {
    const scene = gameInstance.scene.getScene("GameScene") as GameScene;
    if (scene) {
      scene.setActiveEditorTool("flooring");
      scene.setSelectedAsset(assetId);
      if (typeof scene.setObstacleEnabled === "function") {
        scene.setObstacleEnabled(isObstacleEnabled);
      }
    }
  }

  const isOverlay = isOverlayWallAsset(assetId) || isOverlayFloorAsset(assetId);
  hideEditorUIForPlacing(assetName);
}

function selectDecorationAsset(assetId: string, assetName: string) {
  const isFreeform = isFreeformAsset(assetId);
  activeEditorTool = isFreeform ? "freeform_decoration" : "decoration";
  currentSelectedAssetId = assetId;
  currentSelectedAssetName = assetName;

  const cards = document.querySelectorAll(".editor-asset-card");
  cards.forEach((card) => {
    if ((card as HTMLElement).dataset.assetId === assetId && !(card as HTMLElement).dataset.toolType) {
      card.classList.add("selected");
    } else {
      card.classList.remove("selected");
    }
  });

  updateBrushPreview();
  updateEditBannerText();

  if (gameInstance) {
    const scene = gameInstance.scene.getScene("GameScene") as GameScene;
    if (scene) {
      scene.setActiveEditorTool(isFreeform ? "freeform_decoration" : "decoration");
      scene.setSelectedAsset(assetId);
      scene.setDecorationPassable(isDecorationPassable);
      scene.setDecorationOntop(isDecorationOntop);
      scene.setPlacementLayer(currentPlacementLayer);
    }
  }

  const passStr = isDecorationPassable ? "Passable" : "Solid";
  const layerStr = isDecorationOntop ? "On Top" : "Behind";
  const modeStr = isFreeform ? "Freeform • " : "";
  hideEditorUIForPlacing(`${assetName} (${modeStr}${passStr} • ${layerStr})`);
}

function selectClearDecorationTool() {
  activeEditorTool = "clear_decoration";

  const cards = document.querySelectorAll(".editor-asset-card");
  cards.forEach((card) => {
    if ((card as HTMLElement).dataset.toolType === "clear_decoration") {
      card.classList.add("selected");
    } else {
      card.classList.remove("selected");
    }
  });

  updateEditBannerText();

  if (gameInstance) {
    const scene = gameInstance.scene.getScene("GameScene") as GameScene;
    if (scene) {
      scene.setActiveEditorTool("clear_decoration");
    }
  }

  hideEditorUIForPlacing("Remove Decoration (Click item to remove)");
}

function selectPrivateTool(toolType: "private_zone" | "clear_private_zone") {
  activeEditorTool = toolType;

  const cards = document.querySelectorAll(".editor-asset-card");
  cards.forEach((card) => {
    if ((card as HTMLElement).dataset.toolType === toolType) {
      card.classList.add("selected");
    } else {
      card.classList.remove("selected");
    }
  });

  updateEditBannerText();

  if (gameInstance) {
    const scene = gameInstance.scene.getScene("GameScene") as GameScene;
    if (scene) {
      scene.setActiveEditorTool(toolType);
    }
  }

  hideEditorUIForPlacing(toolType === "private_zone" ? "Flag Private Area" : "Clear Private Area");
}

function selectJukeboxTool() {
  activeEditorTool = "jukebox";

  const cards = document.querySelectorAll(".editor-asset-card");
  cards.forEach((card) => {
    if ((card as HTMLElement).dataset.toolType === "jukebox") {
      card.classList.add("selected");
    } else {
      card.classList.remove("selected");
    }
  });

  updateEditBannerText();

  if (gameInstance) {
    const scene = gameInstance.scene.getScene("GameScene") as GameScene;
    if (scene) {
      scene.setActiveEditorTool("jukebox");
      scene.setPlacementLayer(currentPlacementLayer);
    }
  }

  hideEditorUIForPlacing("YouTube Jukebox");
}

function selectTypewriterTool() {
  activeEditorTool = "typewriter";

  const cards = document.querySelectorAll(".editor-asset-card");
  cards.forEach((card) => {
    if ((card as HTMLElement).dataset.toolType === "typewriter") {
      card.classList.add("selected");
    } else {
      card.classList.remove("selected");
    }
  });

  updateEditBannerText();

  if (gameInstance) {
    const scene = gameInstance.scene.getScene("GameScene") as GameScene;
    if (scene) {
      scene.setActiveEditorTool("typewriter");
      scene.setPlacementLayer(currentPlacementLayer);
    }
  }

  hideEditorUIForPlacing("Typewriter");
}

function selectSpawnPointTool() {
  activeEditorTool = "spawn_point";

  const cards = document.querySelectorAll(".editor-asset-card");
  cards.forEach((card) => {
    if ((card as HTMLElement).dataset.toolType === "spawn_point") {
      card.classList.add("selected");
    } else {
      card.classList.remove("selected");
    }
  });

  updateEditBannerText();

  if (gameInstance) {
    const scene = gameInstance.scene.getScene("GameScene") as GameScene;
    if (scene) {
      scene.setActiveEditorTool("spawn_point");
    }
  }

  hideEditorUIForPlacing("Spawn Point (Click map to place spawn point)");
}

function selectColorDropperTool() {
  if (
    activeEditorTool !== "color_dropper" &&
    activeEditorTool !== "spawn_point"
  ) {
    previousToolBeforeDropper = {
      tool: activeEditorTool as any,
      assetId: currentSelectedAssetId,
      assetName: currentSelectedAssetName,
    };
  }

  activeEditorTool = "color_dropper";

  const cards = document.querySelectorAll(".editor-asset-card");
  cards.forEach((card) => {
    if ((card as HTMLElement).dataset.toolType === "color_dropper") {
      card.classList.add("selected");
    } else {
      card.classList.remove("selected");
    }
  });

  updateEditBannerText();

  if (gameInstance) {
    const scene = gameInstance.scene.getScene("GameScene") as GameScene;
    if (scene) {
      scene.setActiveEditorTool("color_dropper");
    }
  }

  hideEditorUIForPlacing("Color Dropper (Click any tile on map to pick color)");
}

function selectCursorTool() {
  activeEditorTool = "cursor";
  closeEditorItemContextMenu();

  const cards = document.querySelectorAll(".editor-asset-card");
  cards.forEach((card) => {
    if ((card as HTMLElement).dataset.toolType === "cursor") {
      card.classList.add("selected");
    } else {
      card.classList.remove("selected");
    }
  });

  updateEditBannerText();

  if (gameInstance) {
    const scene = gameInstance.scene.getScene("GameScene") as GameScene;
    if (scene) {
      scene.setActiveEditorTool("cursor");
    }
  }

  hideEditorUIForPlacing("Cursor (Click any item on map for menu)");
}

let activeEditorContextMenuItem: InspectableMapItem | null = null;

function updateEditorItemObstacleButton(isObstacle: boolean) {
  const btnObstacle = document.getElementById("btn-editor-item-obstacle");
  const obstacleIcon = document.getElementById("editor-item-obstacle-icon");
  const obstacleLabel = document.getElementById("editor-item-obstacle-label");
  if (!btnObstacle) return;

  if (isObstacle) {
    btnObstacle.classList.remove("is-passable");
    if (obstacleIcon) obstacleIcon.textContent = "🚫";
    if (obstacleLabel) obstacleLabel.textContent = "Obstacle: ON";
    btnObstacle.title = "Click to make walkable (passable)";
  } else {
    btnObstacle.classList.add("is-passable");
    if (obstacleIcon) obstacleIcon.textContent = "🟢";
    if (obstacleLabel) obstacleLabel.textContent = "Obstacle: OFF";
    btnObstacle.title = "Click to make obstacle (solid)";
  }
}

function showEditorItemContextMenu(
  item: InspectableMapItem,
  screenX: number,
  screenY: number
) {
  activeEditorContextMenuItem = item;
  const menuEl = document.getElementById("editor-item-context-menu");
  const badgeEl = document.getElementById("editor-item-menu-badge");
  const nameEl = document.getElementById("editor-item-menu-name");
  const btnObstacle = document.getElementById("btn-editor-item-obstacle");
  if (!menuEl) return;

  if (badgeEl) {
    badgeEl.textContent = item.categoryLabel || "Item";
  }
  if (nameEl) {
    nameEl.textContent = item.label || "Map Item";
  }

  if (btnObstacle) {
    if (item.kind === "spawn_point" || item.kind === "private_zone") {
      btnObstacle.style.display = "none";
    } else {
      btnObstacle.style.display = "flex";
      let isObstacle = true;
      if (gameInstance) {
        const scene = gameInstance.scene.getScene("GameScene") as GameScene;
        if (scene && typeof scene.isItemObstacle === "function") {
          isObstacle = scene.isItemObstacle(item);
        }
      }
      updateEditorItemObstacleButton(isObstacle);
    }
  }

  positionEditorItemContextMenu(screenX, screenY);
  menuEl.classList.remove("hidden");
}

function positionEditorItemContextMenu(screenX: number, screenY: number) {
  const menuEl = document.getElementById("editor-item-context-menu");
  if (!menuEl) return;

  const menuWidth = 190;
  const menuHeight = 140;
  const padding = 12;

  const clampedX = Math.max(
    menuWidth / 2 + padding,
    Math.min(window.innerWidth - menuWidth / 2 - padding, screenX)
  );
  let clampedY = screenY - 8;
  let isFlipped = false;

  if (clampedY < menuHeight + 20) {
    clampedY = screenY + 56;
    isFlipped = true;
  }

  menuEl.style.left = `${clampedX}px`;
  menuEl.style.top = `${clampedY}px`;
  if (isFlipped) {
    menuEl.classList.add("flipped");
  } else {
    menuEl.classList.remove("flipped");
  }
}

function closeEditorItemContextMenu() {
  activeEditorContextMenuItem = null;
  const menuEl = document.getElementById("editor-item-context-menu");
  if (menuEl) {
    menuEl.classList.add("hidden");
  }
  if (gameInstance) {
    const scene = gameInstance.scene.getScene("GameScene") as GameScene;
    if (scene && typeof scene.closeEditorItemMenu === "function") {
      scene.closeEditorItemMenu();
    }
  }
}

function setupSceneEditorToolEvents(scene: GameScene) {
  scene.onPlacementLayerChange = (layer: number) => {
    setPlacementLayer(layer, false);
  };

  scene.onEditorItemContextMenu = ({ item, screenX, screenY }) => {
    showEditorItemContextMenu(item, screenX, screenY);
  };

  scene.onEditorItemMenuPositionUpdate = ({ screenX, screenY, visible }) => {
    const menuEl = document.getElementById("editor-item-context-menu");
    if (!menuEl) return;
    if (!visible) {
      activeEditorContextMenuItem = null;
      menuEl.classList.add("hidden");
      return;
    }
    positionEditorItemContextMenu(screenX, screenY);
  };

  scene.onColorPicked = (pickedColor: string | null) => {
    selectTileColor(pickedColor, false);
    const hexDisplay = formatColorBadgeLabel(pickedColor);

    // Resume previous tool (or show UI if none was selected)
    const returnTool = previousToolBeforeDropper.tool;
    if (returnTool === "decoration" || returnTool === "freeform_decoration") {
      selectDecorationAsset(
        previousToolBeforeDropper.assetId,
        previousToolBeforeDropper.assetName,
      );
      showPlacingToast(`Color picked: ${hexDisplay}! Resumed ${previousToolBeforeDropper.assetName}`);
    } else if (returnTool === "flooring" && previousToolBeforeDropper.assetId) {
      selectEditorAsset(
        previousToolBeforeDropper.assetId,
        previousToolBeforeDropper.assetName,
      );
      showPlacingToast(`Color picked: ${hexDisplay}! Resumed ${previousToolBeforeDropper.assetName}`);
    } else {
      activeEditorTool = "none";
      if (scene) scene.setActiveEditorTool("none");
      showEditorUI();
      updateEditBannerText();
    }
  };
}

function openPrivateZoneNameModal(
  mode: "create" | "rename",
  options: {
    zoneId?: string;
    defaultName?: string;
    bounds?: { minCol: number; minRow: number; maxCol: number; maxRow: number };
  },
) {
  if (!privateZoneNameModal || !privateZoneInputName) return;

  if (gameInstance) {
    const s = gameInstance.scene.getScene("GameScene") as GameScene;
    if (s && typeof s.setControlsActive === "function") {
      s.setControlsActive(false);
    }
  }

  if (mode === "create") {
    pendingZoneBounds = options.bounds || null;
    if (privateZoneModalZoneId) privateZoneModalZoneId.value = "";
    if (privateZoneModalTitle) {
      privateZoneModalTitle.textContent = "🔒 Name Private Area";
    }
    if (privateZoneModalSubtitle) {
      privateZoneModalSubtitle.textContent =
        "Set a name for this private area (chat room, voice room, or video room)";
    }
    if (btnSavePrivateZoneName) {
      btnSavePrivateZoneName.textContent = "Save Area Name";
    }
    privateZoneInputName.value = options.defaultName || "";
  } else {
    pendingZoneBounds = null;
    if (privateZoneModalZoneId) {
      privateZoneModalZoneId.value = options.zoneId || "";
    }
    if (privateZoneModalTitle) {
      privateZoneModalTitle.textContent = "✏️ Rename Private Area";
    }
    if (privateZoneModalSubtitle) {
      privateZoneModalSubtitle.textContent =
        "Change the name of this private room / channel";
    }
    if (btnSavePrivateZoneName) {
      btnSavePrivateZoneName.textContent = "Update Name";
    }
    privateZoneInputName.value = options.defaultName || "";
  }

  privateZoneNameModal.classList.remove("hidden");
  setTimeout(() => {
    if (privateZoneInputName) {
      privateZoneInputName.focus();
      privateZoneInputName.select();
    }
  }, 50);
}

function closePrivateZoneNameModal() {
  if (!privateZoneNameModal) return;
  privateZoneNameModal.classList.add("hidden");
  pendingZoneBounds = null;
  if (privateZoneModalZoneId) privateZoneModalZoneId.value = "";

  if (gameInstance) {
    const s = gameInstance.scene.getScene("GameScene") as GameScene;
    if (s && typeof s.setControlsActive === "function") {
      s.setControlsActive(true);
    }
  }

  if (isEditModeActive) {
    showEditorUI();
  }
}

function renderEditorZonesList(zones: any[]) {
  const countEl = document.getElementById("editor-private-zones-count");
  const listEl = document.getElementById("editor-zones-list");
  if (countEl) {
    countEl.textContent = `${zones.length} ${zones.length === 1 ? "zone" : "zones"}`;
  }
  if (!listEl) return;

  if (!zones || zones.length === 0) {
    listEl.innerHTML = `<div class="editor-zones-empty">None yet. Drag on map to flag area.</div>`;
    return;
  }

  listEl.innerHTML = "";
  zones.forEach((zone, idx) => {
    const cols = zone.bounds.maxCol - zone.bounds.minCol + 1;
    const rows = zone.bounds.maxRow - zone.bounds.minRow + 1;
    const totalTiles = cols * rows;

    const item = document.createElement("div");
    item.className = "editor-zone-item";
    item.title = "Click to rename this private area";
    item.innerHTML = `
      <div class="zone-item-left">
        <span class="zone-item-icon">🔒</span>
        <div class="zone-item-details">
          <span class="zone-item-name">${escapeHtml(zone.name || `Area ${idx + 1}`)}</span>
          <span class="zone-item-meta">${cols}×${rows} (${totalTiles} tiles)</span>
        </div>
      </div>
      <div class="zone-item-actions">
        <button type="button" class="zone-item-edit-btn" title="Rename this private area" data-zone-id="${zone.id}">✏️</button>
        <button type="button" class="zone-item-del-btn" title="Remove this private area" data-zone-id="${zone.id}">✕</button>
      </div>
    `;

    const editBtn = item.querySelector(".zone-item-edit-btn");
    if (editBtn) {
      editBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        openPrivateZoneNameModal("rename", {
          zoneId: zone.id,
          defaultName: zone.name,
        });
      });
    }

    const delBtn = item.querySelector(".zone-item-del-btn");
    if (delBtn) {
      delBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (gameInstance) {
          const s = gameInstance.scene.getScene("GameScene") as GameScene;
          if (s) s.removePrivateZone(zone.id);
        }
      });
    }

    item.addEventListener("click", () => {
      openPrivateZoneNameModal("rename", {
        zoneId: zone.id,
        defaultName: zone.name,
      });
    });

    listEl.appendChild(item);
  });
}

// ==========================================
// In-Game Chat System Handlers & Logic
// ==========================================

function scrollChatToBottom() {
  if (chatMessagesContainer) {
    requestAnimationFrame(() => {
      chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
    });
  }
}

function setChatOpen(open: boolean) {
  isChatOpen = open;
  if (!chatSidebar || !btnToggleChat) return;

  if (isChatOpen) {
    chatSidebar.classList.remove("collapsed");
    btnToggleChat.classList.add("active");
    totalClosedUnreadCount = 0;
    if (chatUnreadBadge) {
      chatUnreadBadge.classList.add("hidden");
      chatUnreadBadge.textContent = "";
    }
    scrollChatToBottom();
  } else {
    chatSidebar.classList.add("collapsed");
    btnToggleChat.classList.remove("active");
    if (document.activeElement === chatInputField) {
      chatInputField?.blur();
      setGameControlsActive(true);
    }
  }
}

function toggleChatBar() {
  setChatOpen(!isChatOpen);
}

function updateChatTabNames() {
  if (chatTabMapName) {
    chatTabMapName.textContent = currentSpaceName || "Area";
  }
  if (currentInsideZone && chatTabZoneName) {
    chatTabZoneName.textContent = currentInsideZone.name || "Private Area";
  }
}

// ==========================================
// Player Interaction Context Menu Handlers
// ==========================================
function showPlayerContextMenu(player: {
  sessionId: string;
  name: string;
  color: string;
  isSuperadmin: boolean;
  userId?: number;
  userSpaceId?: string;
  worldX: number;
  worldY: number;
}) {
  activeMenuPlayer = player;
  menuOpenTimestamp = Date.now();

  if (playerMenuName) {
    const crown = player.isSuperadmin ? "👑 " : "";
    playerMenuName.textContent = `${crown}${player.name}`;
  }
  if (playerMenuColorDot) {
    playerMenuColorDot.style.backgroundColor = player.color || "#3b82f6";
  }

  if (gameInstance) {
    const scene = gameInstance.scene.getScene("GameScene") as GameScene;
    if (scene) {
      const cam = scene.cameras.main;
      const screenX = (player.worldX - cam.scrollX) * cam.zoom;
      const screenY = (player.worldY - CHARACTER_MAX_SIZE / 2 - 20 - cam.scrollY) * cam.zoom;
      positionPlayerContextMenu(screenX, screenY);
    }
  }

  playerContextMenu?.classList.remove("hidden");
}

function positionPlayerContextMenu(screenX: number, screenY: number) {
  if (!playerContextMenu) return;
  const menuWidth = 170;
  const menuHeight = 120;
  const padding = 12;

  const clampedX = Math.max(
    menuWidth / 2 + padding,
    Math.min(window.innerWidth - menuWidth / 2 - padding, screenX)
  );
  let clampedY = screenY;
  let isFlipped = false;

  if (clampedY < menuHeight + 20) {
    clampedY = screenY + CHARACTER_MAX_SIZE + 35;
    isFlipped = true;
  }

  playerContextMenu.style.left = `${clampedX}px`;
  playerContextMenu.style.top = `${clampedY}px`;
  if (isFlipped) {
    playerContextMenu.classList.add("flipped");
  } else {
    playerContextMenu.classList.remove("flipped");
  }
}

function closePlayerContextMenu() {
  if (playerContextMenu) {
    playerContextMenu.classList.add("hidden");
  }
  activeMenuPlayer = null;
  if (gameInstance) {
    const scene = gameInstance.scene.getScene("GameScene") as GameScene;
    if (scene && typeof scene.closePlayerMenu === "function") {
      scene.closePlayerMenu();
    }
  }
}

function openDirectMessageChat(
  targetSessionId: string,
  targetName: string,
  targetColor?: string,
  isSuperadmin?: boolean
) {
  closePlayerContextMenu();

  let convo = dmConversations.get(targetSessionId);
  if (!convo) {
    convo = {
      sessionId: targetSessionId,
      userName: targetName,
      userColor: targetColor,
      isSuperadmin: !!isSuperadmin,
      messages: [],
      unreadCount: 0,
    };
    dmConversations.set(targetSessionId, convo);
  } else {
    if (targetName && targetName !== convo.userName) {
      convo.userName = targetName;
      updateDmTabName(targetSessionId, targetName);
    }
    if (targetColor) {
      convo.userColor = targetColor;
    }
  }

  ensureDmTabElement(convo);

  if (!isChatOpen) {
    setChatOpen(true);
  }

  switchChatTab("dm_" + targetSessionId);

  setTimeout(() => {
    chatInputField?.focus();
  }, 50);
}

function ensureDmTabElement(convo: DmConversation) {
  if (convo.tabElement && document.getElementById(`chat-tab-dm-${convo.sessionId}`)) {
    return;
  }
  if (!chatTabsContainer) return;

  const tab = document.createElement("button");
  tab.type = "button";
  tab.id = `chat-tab-dm-${convo.sessionId}`;
  tab.className = "chat-tab chat-tab-whisper";
  tab.setAttribute("role", "tab");
  tab.setAttribute("aria-selected", "false");
  tab.dataset.room = `dm_${convo.sessionId}`;
  tab.title = `Whisper with ${convo.userName}`;

  tab.innerHTML = `
    <span class="chat-tab-icon">💬</span>
    <span class="chat-tab-name">${escapeHtml(convo.userName)}</span>
    <span class="chat-tab-badge hidden"></span>
    <span class="chat-tab-close" title="Close whisper">✕</span>
  `;

  tab.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    if (target.closest(".chat-tab-close")) {
      e.stopPropagation();
      closeDmTab(convo.sessionId);
      return;
    }
    switchChatTab(`dm_${convo.sessionId}`);
  });

  chatTabsContainer.appendChild(tab);
  convo.tabElement = tab;
}

function updateDmTabName(sessionId: string, newName: string) {
  const convo = dmConversations.get(sessionId);
  if (!convo) return;
  convo.userName = newName;
  if (convo.tabElement) {
    const nameEl = convo.tabElement.querySelector(".chat-tab-name");
    if (nameEl) nameEl.textContent = newName;
    convo.tabElement.title = `Whisper with ${newName}`;
  }
  if (activeChatRoom === `dm_${sessionId}`) {
    if (chatActiveChannelLabel) chatActiveChannelLabel.textContent = `@${newName}`;
    if (chatInputField) chatInputField.placeholder = `Message @${newName} (Whisper)...`;
    if (chatChannelDesc) chatChannelDesc.textContent = `Direct message conversation with @${newName}`;
  }
}

function updateDmTabBadge(sessionId: string) {
  const convo = dmConversations.get(sessionId);
  if (!convo || !convo.tabElement) return;
  const badge = convo.tabElement.querySelector(".chat-tab-badge");
  if (!badge) return;
  if (convo.unreadCount > 0) {
    badge.classList.remove("hidden");
  } else {
    badge.classList.add("hidden");
  }
}

function closeDmTab(sessionId: string) {
  const convo = dmConversations.get(sessionId);
  if (convo && convo.tabElement) {
    convo.tabElement.remove();
    convo.tabElement = undefined;
  }

  if (activeChatRoom === `dm_${sessionId}`) {
    if (currentInsideZone) {
      switchChatTab("zone");
    } else {
      switchChatTab("map");
    }
  }
}

function switchChatTab(target: string) {
  if (target === "zone" && !currentInsideZone) {
    target = "map";
  }
  activeChatRoom = target;

  chatTabMap?.classList.remove("active");
  chatTabMap?.setAttribute("aria-selected", "false");
  chatTabZone?.classList.remove("active");
  chatTabZone?.setAttribute("aria-selected", "false");

  dmConversations.forEach((convo) => {
    if (convo.tabElement) {
      convo.tabElement.classList.remove("active");
      convo.tabElement.setAttribute("aria-selected", "false");
    }
  });

  if (chatChannelBanner) {
    chatChannelBanner.classList.remove("private", "whisper");
  }

  if (target === "map") {
    chatTabMap?.classList.add("active");
    chatTabMap?.setAttribute("aria-selected", "true");

    unreadMapCount = 0;
    chatMapBadge?.classList.add("hidden");

    if (chatChannelDot) {
      chatChannelDot.style.backgroundColor = "";
    }
    if (chatChannelDesc) chatChannelDesc.textContent = "Area chat • visible to all in this map";
    if (chatActiveChannelLabel) chatActiveChannelLabel.textContent = "Area Channel";
    if (chatInputField) chatInputField.placeholder = `Message #${currentSpaceName}...`;
  } else if (target === "zone") {
    chatTabZone?.classList.add("active");
    chatTabZone?.setAttribute("aria-selected", "true");

    const zoneId = currentInsideZone?.id || "";
    unreadZoneCount.set(zoneId, 0);
    chatZoneBadge?.classList.add("hidden");

    const zoneName = currentInsideZone?.name || "Private Area";
    if (chatChannelBanner) chatChannelBanner.classList.add("private");
    if (chatChannelDot) {
      chatChannelDot.style.backgroundColor = "";
    }
    if (chatChannelDesc) {
      chatChannelDesc.textContent = `🔒 Private Area • Only players inside "${zoneName}" can see messages`;
    }
    if (chatActiveChannelLabel) chatActiveChannelLabel.textContent = zoneName;
    if (chatInputField) chatInputField.placeholder = `Message #${zoneName} (Private)...`;
  } else if (target.startsWith("dm_")) {
    const targetSessionId = target.replace("dm_", "");
    const convo = dmConversations.get(targetSessionId);
    if (convo) {
      if (convo.tabElement) {
        convo.tabElement.classList.add("active");
        convo.tabElement.setAttribute("aria-selected", "true");
      }
      convo.unreadCount = 0;
      updateDmTabBadge(targetSessionId);

      if (chatChannelBanner) chatChannelBanner.classList.add("whisper");
      if (chatChannelDot) {
        chatChannelDot.style.backgroundColor = convo.userColor || "#38bdf8";
      }
      if (chatChannelDesc) {
        chatChannelDesc.textContent = `💬 Direct Message • Private chat with @${convo.userName}`;
      }
      if (chatActiveChannelLabel) chatActiveChannelLabel.textContent = `@${convo.userName}`;
      if (chatInputField) chatInputField.placeholder = `Message @${convo.userName} (Whisper)...`;
    }
  }

  renderCurrentChatMessages();
}

function renderCurrentChatMessages() {
  if (!chatMessagesList) return;
  chatMessagesList.innerHTML = "";

  let messagesToRender: ChatMessage[] = [];
  if (activeChatRoom === "map") {
    messagesToRender = chatMessagesMap;
  } else if (activeChatRoom === "zone") {
    messagesToRender = currentInsideZone ? chatMessagesZone.get(currentInsideZone.id) || [] : [];
  } else if (activeChatRoom.startsWith("dm_")) {
    const targetSessionId = activeChatRoom.replace("dm_", "");
    const convo = dmConversations.get(targetSessionId);
    messagesToRender = convo ? convo.messages : [];
  }

  if (messagesToRender.length === 0) {
    const welcome = document.createElement("div");
    welcome.className = "chat-welcome-notice";
    let title = "";
    let sub = "";
    let icon = "💬";

    if (activeChatRoom.startsWith("dm_")) {
      const targetSessionId = activeChatRoom.replace("dm_", "");
      const convo = dmConversations.get(targetSessionId);
      const name = convo?.userName || "Player";
      icon = "💬";
      title = `Whisper with ${escapeHtml(name)}`;
      sub = `Direct message conversation with @${escapeHtml(name)}. Only the two of you can see these messages.`;
    } else if (activeChatRoom === "map") {
      icon = "🗺️";
      title = `Welcome to ${escapeHtml(currentSpaceName)}!`;
      sub = "Talk to everyone exploring this space.";
    } else {
      icon = "🔒";
      title = `Welcome to ${escapeHtml(currentInsideZone?.name || "Private Area")}!`;
      sub = "This is an isolated private channel. Only players currently inside this area can read or send messages.";
    }

    welcome.innerHTML = `
      <div class="chat-welcome-icon">${icon}</div>
      <div class="chat-welcome-title">${title}</div>
      <div class="chat-welcome-sub">${sub}</div>
    `;
    chatMessagesList.appendChild(welcome);
  } else {
    messagesToRender.forEach((msg) => {
      appendChatMessageElement(msg, false);
    });
  }

  scrollChatToBottom();
}

function appendChatMessageElement(msg: ChatMessage, autoScroll = true) {
  if (!chatMessagesList) return;

  const welcome = chatMessagesList.querySelector(".chat-welcome-notice");
  if (welcome) {
    welcome.remove();
  }

  const isOwn = multiplayer && multiplayer.sessionId === msg.senderId;
  const item = document.createElement("div");
  item.className = `chat-msg-item${isOwn ? " own" : ""}${msg.roomType === "zone" ? " zone-msg" : ""}${msg.roomType === "whisper" ? " whisper-msg" : ""}`;

  const timeStr = new Date(msg.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const crownHtml = msg.isSuperadmin ? `<span class="chat-msg-crown" title="Superadmin">👑</span>` : "";
  const tagHtml =
    msg.roomType === "zone"
      ? `<span class="chat-msg-tag-zone">🔒 ${escapeHtml(msg.roomName)}</span>`
      : msg.roomType === "whisper"
      ? `<span class="chat-msg-tag-whisper">💬 Whisper</span>`
      : "";

  item.innerHTML = `
    <div class="chat-msg-header">
      <span class="chat-msg-author-dot" style="background-color: ${escapeHtml(msg.senderColor || "#3b82f6")};"></span>
      <span class="chat-msg-author">${crownHtml}${escapeHtml(msg.senderName)}</span>
      ${tagHtml}
      <span class="chat-msg-time">${timeStr}</span>
    </div>
    <div class="chat-msg-body">${escapeHtml(msg.text)}</div>
  `;

  chatMessagesList.appendChild(item);

  if (autoScroll) {
    scrollChatToBottom();
  }
}

function handleIncomingChatMessage(msg: ChatMessage) {
  if (msg.roomType === "map") {
    chatMessagesMap.push(msg);
    if (activeChatRoom === "map") {
      appendChatMessageElement(msg, true);
    } else {
      unreadMapCount++;
      if (chatMapBadge) {
        chatMapBadge.classList.remove("hidden");
      }
    }
  } else if (msg.roomType === "zone") {
    const list = chatMessagesZone.get(msg.roomId) || [];
    list.push(msg);
    chatMessagesZone.set(msg.roomId, list);

    if (activeChatRoom === "zone" && currentInsideZone && currentInsideZone.id === msg.roomId) {
      appendChatMessageElement(msg, true);
    } else {
      const prev = unreadZoneCount.get(msg.roomId) || 0;
      unreadZoneCount.set(msg.roomId, prev + 1);
      if (chatZoneBadge) {
        chatZoneBadge.classList.remove("hidden");
      }
    }
  } else if (msg.roomType === "whisper") {
    const isOwn = multiplayer && multiplayer.sessionId === msg.senderId;
    const partnerSessionId = isOwn ? (msg.targetId || msg.roomId) : msg.senderId;
    const partnerName = isOwn ? (msg.targetName || msg.roomName) : msg.senderName;
    const partnerColor = isOwn ? undefined : msg.senderColor;
    const partnerIsSuperadmin = isOwn ? false : !!msg.isSuperadmin;

    let convo = dmConversations.get(partnerSessionId);
    if (!convo) {
      convo = {
        sessionId: partnerSessionId,
        userName: partnerName,
        userColor: partnerColor,
        isSuperadmin: partnerIsSuperadmin,
        messages: [],
        unreadCount: 0,
      };
      dmConversations.set(partnerSessionId, convo);
    } else {
      if (partnerName && partnerName !== convo.userName) {
        convo.userName = partnerName;
        updateDmTabName(partnerSessionId, partnerName);
      }
      if (partnerColor) {
        convo.userColor = partnerColor;
      }
    }

    ensureDmTabElement(convo);
    convo.messages.push(msg);

    if (activeChatRoom === `dm_${partnerSessionId}`) {
      appendChatMessageElement(msg, true);
    } else {
      convo.unreadCount++;
      updateDmTabBadge(partnerSessionId);
    }
  }

  if (!isChatOpen) {
    totalClosedUnreadCount++;
    if (chatUnreadBadge) {
      chatUnreadBadge.textContent =
        totalClosedUnreadCount > 9 ? "9+" : String(totalClosedUnreadCount);
      chatUnreadBadge.classList.remove("hidden");
    }
  }

  // Floating speech bubble over character in Phaser scene
  if (gameInstance) {
    const scene = gameInstance.scene.getScene("GameScene") as GameScene;
    if (scene && typeof (scene as any).showSpeechBubble === "function") {
      (scene as any).showSpeechBubble(msg.senderId, msg.text, msg.roomType === "whisper");
    }
  }
}

function handleChatZoneChange(zone: PrivateZone | null) {
  currentInsideZone = zone;
  if (zone) {
    if (chatTabZoneName) {
      chatTabZoneName.textContent = zone.name || "Private Area";
    }
    chatTabZone?.classList.remove("hidden");
    // Enter private area: activate private tab
    switchChatTab("zone");
  } else {
    chatTabZone?.classList.add("hidden");
    if (activeChatRoom === "zone") {
      switchChatTab("map");
    }
  }
}

function onSpaceChanged(newSpaceName: string) {
  updateChatTabNames();
  if (activeChatRoom === "map") {
    if (chatInputField) chatInputField.placeholder = `Message #${newSpaceName}...`;
    renderCurrentChatMessages();
  }
  if (voiceManager) {
    voiceManager.connectToVoice();
  }
}

function handleIncomingChatHistory(history: ChatMessage[]) {
  if (!Array.isArray(history)) return;
  chatMessagesMap.length = 0;
  for (const msg of history) {
    if (msg && msg.roomType === "map") {
      chatMessagesMap.push(msg);
    }
  }
  if (activeChatRoom === "map") {
    renderCurrentChatMessages();
    scrollChatToBottom();
  }
}

function setupMultiplayerChatListeners(mgr: MultiplayerManager) {
  mgr.onChatMessage((msg: ChatMessage) => {
    handleIncomingChatMessage(msg);
  });
  mgr.onChatHistory((history: ChatMessage[]) => {
    handleIncomingChatHistory(history);
  });
}

function isAnyModalOpen(): boolean {
  const twModal = document.getElementById("typerace-modal");
  if (twModal && !twModal.classList.contains("hidden")) return true;
  const jbModal = document.getElementById("jukebox-modal");
  if (jbModal && !jbModal.classList.contains("hidden")) return true;
  if (authModal && !authModal.classList.contains("hidden")) return true;
  if (mapModal && !mapModal.classList.contains("hidden")) return true;
  if (modal && !modal.classList.contains("hidden")) return true;
  if (mySpaceSettingsModal && !mySpaceSettingsModal.classList.contains("hidden")) return true;
  if (adminSpaceModal && !adminSpaceModal.classList.contains("hidden")) return true;
  if (privateZoneNameModal && !privateZoneNameModal.classList.contains("hidden")) return true;
  if (playerContextMenu && !playerContextMenu.classList.contains("hidden")) return true;
  return false;
}

if (btnToggleChat) {
  btnToggleChat.addEventListener("click", () => {
    toggleChatBar();
  });
}

if (btnCloseChat) {
  btnCloseChat.addEventListener("click", () => {
    setChatOpen(false);
  });
}

if (chatTabMap) {
  chatTabMap.addEventListener("click", () => {
    switchChatTab("map");
  });
}

if (chatTabZone) {
  chatTabZone.addEventListener("click", () => {
    switchChatTab("zone");
  });
}

if (btnPlayerMenuWhisper) {
  btnPlayerMenuWhisper.addEventListener("click", () => {
    if (!activeMenuPlayer) return;
    const { sessionId, name, color, isSuperadmin } = activeMenuPlayer;
    openDirectMessageChat(sessionId, name, color, isSuperadmin);
  });
}

if (btnPlayerMenuVisitSpace) {
  btnPlayerMenuVisitSpace.addEventListener("click", async () => {
    if (!activeMenuPlayer) return;
    const target = { ...activeMenuPlayer };
    closePlayerContextMenu();

    let targetSpaceId = target.userSpaceId;
    if (!targetSpaceId && target.userId) {
      targetSpaceId = `user_space_${target.userId}`;
    }

    let targetSpaceName = `${target.name}'s Space`;

    // Attempt to resolve custom space name or ID from backend
    try {
      const identifier = target.userId ? String(target.userId) : target.name;
      const res = await fetch(getApiUrl(`/api/spaces/user-space/${encodeURIComponent(identifier)}`), {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });
      const data = await res.json();
      if (data.success && data.space) {
        targetSpaceId = data.space.id;
        if (data.space.name) {
          targetSpaceName = data.space.name;
        }
      }
    } catch (err) {
      console.warn("Could not fetch user space info:", err);
    }

    if (!targetSpaceId) {
      showSpaceErrorModal(
        "Space Not Found",
        `Could not find personal space for ${target.name}.`,
        currentSpaceName,
        "❓"
      );
      return;
    }

    if (currentSpaceId === targetSpaceId) {
      return;
    }

    await switchSpace(targetSpaceId, targetSpaceName);
  });
}

function showSpaceErrorModal(
  title: string,
  message: string,
  returnSpaceName: string,
  icon: string = "🔒"
) {
  if (spaceErrorTitle) spaceErrorTitle.textContent = title;
  if (spaceErrorSubtitle) {
    spaceErrorSubtitle.textContent =
      title === "Access Denied" ? "Private Space" : "Space Notice";
  }
  if (spaceErrorMessage) spaceErrorMessage.textContent = message;
  if (spaceErrorReturnName) spaceErrorReturnName.textContent = returnSpaceName;
  if (spaceErrorIcon) spaceErrorIcon.textContent = icon;
  spaceErrorModal?.classList.remove("hidden");
}

function closeSpaceErrorModal() {
  spaceErrorModal?.classList.add("hidden");
}

if (btnCloseSpaceErrorModal) {
  btnCloseSpaceErrorModal.addEventListener("click", closeSpaceErrorModal);
}
if (btnSpaceErrorOk) {
  btnSpaceErrorOk.addEventListener("click", closeSpaceErrorModal);
}
if (spaceErrorModal) {
  spaceErrorModal.addEventListener("click", (e) => {
    if (e.target === spaceErrorModal) {
      closeSpaceErrorModal();
    }
  });
}



if (btnClosePlayerMenu) {
  btnClosePlayerMenu.addEventListener("click", () => {
    closePlayerContextMenu();
  });
}

document.addEventListener("pointerdown", (e) => {
  if (!playerContextMenu || playerContextMenu.classList.contains("hidden")) return;
  if (Date.now() - menuOpenTimestamp < 150) return;
  const target = e.target as HTMLElement;
  if (!playerContextMenu.contains(target)) {
    closePlayerContextMenu();
  }
});

if (chatInputForm) {
  chatInputForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!chatInputField || !multiplayer) return;
    const text = chatInputField.value.trim();
    if (!text) return;

    if (activeChatRoom.startsWith("dm_")) {
      const targetSessionId = activeChatRoom.replace("dm_", "");
      const convo = dmConversations.get(targetSessionId);
      multiplayer.sendChatMessage({
        roomType: "whisper",
        roomId: targetSessionId,
        targetName: convo?.userName || "Player",
        text,
      });
    } else if (activeChatRoom === "zone") {
      if (!currentInsideZone) return;
      multiplayer.sendChatMessage({
        roomType: "zone",
        roomId: currentInsideZone.id,
        text,
      });
    } else {
      multiplayer.sendChatMessage({
        roomType: "map",
        text,
      });
    }

    chatInputField.value = "";
  });
}

if (chatInputField) {
  chatInputField.addEventListener("focus", () => {
    setGameControlsActive(false);
  });

  chatInputField.addEventListener("blur", () => {
    setGameControlsActive(true);
  });

  chatInputField.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      chatInputField.blur();
      setGameControlsActive(true);
    }
  });
}

// ==========================================
// Microphone Controls & Proximity Voice Logic
// ==========================================

function updateMicButtonUI(isOn: boolean, isSpeaking: boolean = false) {
  if (!btnToggleMic) return;

  if (isOn) {
    btnToggleMic.classList.add("active");
    micSvgOff?.classList.add("hidden");
    micSvgOn?.classList.remove("hidden");
    btnToggleMic.title = isSpeaking
      ? "Microphone: Speaking... (Click or press M to mute)"
      : "Microphone: Live (Click or press M to mute)";
    if (micLiveIndicator) {
      micLiveIndicator.textContent = isSpeaking ? "Speaking..." : "Mic On";
      micLiveIndicator.classList.add("live");
    }
  } else {
    btnToggleMic.classList.remove("active");
    btnToggleMic.classList.remove("speaking");
    micSvgOn?.classList.add("hidden");
    micSvgOff?.classList.remove("hidden");
    btnToggleMic.title = "Microphone: Off (Click or press M to turn on)";
    if (micLiveIndicator) {
      micLiveIndicator.textContent = "Mic Off";
      micLiveIndicator.classList.remove("live");
    }
    if (micLevelBar) {
      micLevelBar.style.width = "0%";
    }
  }

  if (isSpeaking && isOn) {
    btnToggleMic.classList.add("speaking");
  } else {
    btnToggleMic.classList.remove("speaking");
  }
}

// ==========================================
// Audio Settings Dropdown (Input / Output)
// ==========================================

function openAudioSettingsDropdown() {
  if (!audioSettingsDropdown) return;
  closeProfileDropdown();
  audioSettingsDropdown.classList.remove("hidden");
  btnMicSettings?.classList.add("active");
  isAudioSettingsOpen = true;
  populateAudioDevices();
}

function closeAudioSettingsDropdown() {
  if (!audioSettingsDropdown) return;
  audioSettingsDropdown.classList.add("hidden");
  btnMicSettings?.classList.remove("active");
  isAudioSettingsOpen = false;
}

function toggleAudioSettingsDropdown() {
  if (isAudioSettingsOpen) {
    closeAudioSettingsDropdown();
  } else {
    openAudioSettingsDropdown();
  }
}

async function populateAudioDevices() {
  // Check if browser supports audio output selection (setSinkId)
  const sinkSupported =
    typeof (HTMLAudioElement.prototype as any).setSinkId === "function";
  if (!sinkSupported) {
    outputSinkNote?.classList.remove("hidden");
  } else {
    outputSinkNote?.classList.add("hidden");
  }

  let activeInputId = voiceManager?.selectedInputDeviceId || "default";
  let activeOutputId = voiceManager?.selectedOutputDeviceId || "default";
  try {
    if (activeInputId === "default") {
      activeInputId =
        localStorage.getItem("lepark_audio_input_id") || "default";
    }
    if (activeOutputId === "default") {
      activeOutputId =
        localStorage.getItem("lepark_audio_output_id") || "default";
    }
  } catch (_) {}

  let inputDevices: MediaDeviceInfo[] = [];
  let outputDevices: MediaDeviceInfo[] = [];

  if (voiceManager) {
    inputDevices = await voiceManager.getAudioInputDevices();
    outputDevices = await voiceManager.getAudioOutputDevices();
  } else if (
    typeof navigator !== "undefined" &&
    navigator.mediaDevices?.enumerateDevices
  ) {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      inputDevices = all.filter((d) => d.kind === "audioinput");
      outputDevices = all.filter((d) => d.kind === "audiooutput");
    } catch (e) {
      console.warn("Failed to enumerate audio devices:", e);
    }
  }

  // Populate Input Select (Microphone)
  if (audioInputSelect) {
    audioInputSelect.innerHTML = "";
    const defaultInOpt = document.createElement("option");
    defaultInOpt.value = "default";
    defaultInOpt.textContent = "Default Microphone";
    audioInputSelect.appendChild(defaultInOpt);

    let micIdx = 1;
    inputDevices.forEach((dev) => {
      if (dev.deviceId === "default" || dev.deviceId === "") return;
      const opt = document.createElement("option");
      opt.value = dev.deviceId;
      opt.textContent = dev.label || `Microphone ${micIdx++}`;
      audioInputSelect.appendChild(opt);
    });

    const hasInput = Array.from(audioInputSelect.options).some(
      (o) => o.value === activeInputId,
    );
    audioInputSelect.value = hasInput ? activeInputId : "default";
  }

  // Populate Output Select (Earphones / Speakers)
  if (audioOutputSelect) {
    audioOutputSelect.innerHTML = "";
    const defaultOutOpt = document.createElement("option");
    defaultOutOpt.value = "default";
    defaultOutOpt.textContent = "Default Speaker / Earphones";
    audioOutputSelect.appendChild(defaultOutOpt);

    let speakerIdx = 1;
    outputDevices.forEach((dev) => {
      if (dev.deviceId === "default" || dev.deviceId === "") return;
      const opt = document.createElement("option");
      opt.value = dev.deviceId;
      opt.textContent = dev.label || `Speaker / Earphones ${speakerIdx++}`;
      audioOutputSelect.appendChild(opt);
    });

    const hasOutput = Array.from(audioOutputSelect.options).some(
      (o) => o.value === activeOutputId,
    );
    audioOutputSelect.value = hasOutput ? activeOutputId : "default";
  }

  // Populate Output Volume Slider
  if (audioOutputVolume) {
    const vol = voiceManager
      ? voiceManager.masterOutputVolume
      : (() => {
          try {
            const s = localStorage.getItem("lepark_output_volume");
            return s !== null ? parseFloat(s) : 1.0;
          } catch (_) {
            return 1.0;
          }
        })();
    const pct = Math.round(vol * 100);
    audioOutputVolume.value = pct.toString();
    if (outputVolumeValue) {
      outputVolumeValue.textContent = `${pct}%`;
    }
  }
}

if (btnMicSettings) {
  btnMicSettings.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleAudioSettingsDropdown();
  });
}

if (btnCloseAudioSettings) {
  btnCloseAudioSettings.addEventListener("click", (e) => {
    e.stopPropagation();
    closeAudioSettingsDropdown();
  });
}

if (audioInputSelect) {
  audioInputSelect.addEventListener("change", async () => {
    const deviceId = audioInputSelect.value;
    if (voiceManager) {
      await voiceManager.setAudioInputDevice(deviceId);
    } else {
      try {
        localStorage.setItem("lepark_audio_input_id", deviceId);
      } catch (_) {}
    }
  });
}

if (audioOutputSelect) {
  audioOutputSelect.addEventListener("change", async () => {
    const deviceId = audioOutputSelect.value;
    if (voiceManager) {
      await voiceManager.setAudioOutputDevice(deviceId);
    } else {
      try {
        localStorage.setItem("lepark_audio_output_id", deviceId);
      } catch (_) {}
    }
  });
}

if (audioOutputVolume) {
  audioOutputVolume.addEventListener("input", () => {
    const val = parseInt(audioOutputVolume.value, 10);
    const fraction = Math.max(0, Math.min(1, val / 100));
    if (outputVolumeValue) {
      outputVolumeValue.textContent = `${val}%`;
    }
    if (voiceManager) {
      voiceManager.setMasterOutputVolume(fraction);
    } else {
      try {
        localStorage.setItem("lepark_output_volume", fraction.toString());
      } catch (_) {}
    }
  });
}
window.addEventListener(
  "pointerdown",
  () => {
    if (voiceManager) {
      voiceManager.unlockAllAudio();
    }
  },
  { passive: true },
);

if (btnTestAudioOutput) {
  btnTestAudioOutput.addEventListener("click", async () => {
    const origText = btnTestAudioOutput.textContent;
    btnTestAudioOutput.textContent = "🔊 Playing...";
    btnTestAudioOutput.disabled = true;

    try {
      if (voiceManager) {
        await voiceManager.playTestSound(audioOutputSelect?.value);
      } else {
        const AudioCtxClass =
          window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtxClass) {
          const ctx = new AudioCtxClass();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.frequency.setValueAtTime(587.33, ctx.currentTime);
          gain.gain.setValueAtTime(0.25, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.4);
          setTimeout(() => ctx.close().catch(() => {}), 500);
        }
      }
    } catch (e) {
      console.warn("Test audio error:", e);
    }

    setTimeout(() => {
      btnTestAudioOutput.textContent = origText;
      btnTestAudioOutput.disabled = false;
    }, 600);
  });
}

if (btnRefreshDevices) {
  btnRefreshDevices.addEventListener("click", async () => {
    btnRefreshDevices.classList.add("rotating");
    await populateAudioDevices();
    setTimeout(() => {
      btnRefreshDevices.classList.remove("rotating");
    }, 450);
  });
}

// Close audio settings dropdown on click outside
document.addEventListener("click", (e) => {
  if (isAudioSettingsOpen) {
    const micGroup = document.getElementById("mic-control-group");
    if (micGroup && !micGroup.contains(e.target as Node)) {
      closeAudioSettingsDropdown();
    }
  }
});

// Auto-refresh when audio devices are plugged in or unplugged
if (
  typeof navigator !== "undefined" &&
  navigator.mediaDevices?.addEventListener
) {
  navigator.mediaDevices.addEventListener("devicechange", () => {
    if (isAudioSettingsOpen) {
      populateAudioDevices();
    }
  });
}



function hideVoiceNotification() {
  if (voiceNotificationBanner) {
    voiceNotificationBanner.classList.add("hidden");
  }
}

function showVoiceNotification(error: VoiceError) {
  if (!voiceNotificationBanner || !voiceNotifTitle || !voiceNotifMsg) return;

  voiceNotifTitle.textContent = error.title;
  voiceNotifMsg.textContent = error.message;

  if (voiceNotifHint) {
    if (error.hint) {
      voiceNotifHint.textContent = error.hint;
      voiceNotifHint.classList.remove("hidden");
    } else {
      voiceNotifHint.textContent = "";
      voiceNotifHint.classList.add("hidden");
    }
  }

  if (voiceNotifActions) {
    voiceNotifActions.innerHTML = "";

    // Action button (e.g. Switch to Localhost)
    if (error.actionUrl && error.actionLabel) {
      const actionBtn = document.createElement("button");
      actionBtn.type = "button";
      actionBtn.className = "voice-notif-btn voice-notif-btn-primary";
      actionBtn.textContent = error.actionLabel;
      actionBtn.addEventListener("click", () => {
        window.location.href = error.actionUrl!;
      });
      voiceNotifActions.appendChild(actionBtn);
    }

    // Retry Microphone button
    const retryBtn = document.createElement("button");
    retryBtn.type = "button";
    retryBtn.className = "voice-notif-btn voice-notif-btn-secondary";
    retryBtn.textContent = "Retry Microphone";
    retryBtn.addEventListener("click", async () => {
      await toggleMic();
    });
    voiceNotifActions.appendChild(retryBtn);

    // Dismiss button
    const dismissBtn = document.createElement("button");
    dismissBtn.type = "button";
    dismissBtn.className = "voice-notif-btn voice-notif-btn-ghost";
    dismissBtn.textContent = "Dismiss";
    dismissBtn.addEventListener("click", () => {
      hideVoiceNotification();
    });
    voiceNotifActions.appendChild(dismissBtn);
  }

  // Notice stays on screen permanently until dismissed or microphone is enabled
  voiceNotificationBanner.classList.remove("hidden");
}

if (btnCloseVoiceNotif) {
  btnCloseVoiceNotif.addEventListener("click", () => {
    hideVoiceNotification();
  });
}

async function toggleMic() {
  if (!voiceManager) {
    if (multiplayer) {
      initVoiceManager(multiplayer);
    initJukeboxManager(multiplayer);
    setupMultiplayerTypeRaceListeners(multiplayer);
    } else {
      showVoiceNotification({
        code: "CONNECTING",
        title: "Connecting to Space",
        message: "Please wait for connection to establish before turning on microphone.",
        hint: "Log in and make sure your character is in the space.",
      });
      return;
    }
  }
  if (!voiceManager) return;
  voiceManager.connectToVoice();
  const isNowOn = await voiceManager.toggleMic();
  updateMicButtonUI(isNowOn);
  if (isNowOn) {
    hideVoiceNotification();
  }
}

function initVoiceManager(mgr: MultiplayerManager) {
  if (voiceManager) {
    voiceManager.setMultiplayer(mgr);
    voiceManager.connectToVoice();
    if (gameInstance) {
      const scene = gameInstance.scene.getScene("GameScene") as GameScene;
      if (scene) {
        scene.voiceManager = voiceManager;
      }
    }
    return;
  }

  voiceManager = new VoiceManager(mgr, {
    onMicStateChange: (isOn) => {
      updateMicButtonUI(isOn);
      if (isOn) {
        hideVoiceNotification();
      }
    },
    onMicVolumeChange: (volume: number) => {
      if (micLevelBar) {
        const pct = Math.min(
          100,
          Math.round(Math.pow(volume * 2.2, 0.7) * 100),
        );
        micLevelBar.style.width = `${pct}%`;
      }
    },
    onError: (error) => {
      if (error) {
        showVoiceNotification(error);
      } else {
        hideVoiceNotification();
      }
    },
    onSpeakingChange: (sessionId, speaking) => {
      if (gameInstance) {
        const scene = gameInstance.scene.getScene("GameScene") as GameScene;
        if (scene && typeof scene.setPlayerSpeaking === "function") {
          scene.setPlayerSpeaking(sessionId, speaking);
        }
      }
    },
    onLocalSpeakingChange: (speaking) => {
      updateMicButtonUI(voiceManager?.isMicOn ?? false, speaking);
      if (gameInstance && multiplayer && multiplayer.sessionId) {
        const scene = gameInstance.scene.getScene("GameScene") as GameScene;
        if (scene && typeof scene.setPlayerSpeaking === "function") {
          scene.setPlayerSpeaking(multiplayer.sessionId, speaking);
        }
      }
    },
  });

  voiceManager.connectToVoice();

  if (gameInstance) {
    const scene = gameInstance.scene.getScene("GameScene") as GameScene;
    if (scene) {
      scene.voiceManager = voiceManager;
    }
  }
}

if (btnToggleMic) {
  btnToggleMic.addEventListener("click", () => {
    toggleMic();
  });
}

function setupScenePrivateZoneEvents(scene: GameScene) {
  if (!scene) return;
  if (voiceManager) {
    scene.voiceManager = voiceManager;
  }
  if ((scene as any)._privateZoneEventsBound) return;
  (scene as any)._privateZoneEventsBound = true;

  scene.onZoneChange((zone) => {
    const hud = document.getElementById("private-area-hud");
    const nameEl = document.getElementById("private-area-hud-name");
    if (zone) {
      if (nameEl) nameEl.textContent = zone.name || "Private Area";
    }
    if (hud) hud.classList.add("hidden");
    handleChatZoneChange(zone);
  });

  scene.onPrivateZonesListChange((zones) => {
    renderEditorZonesList(zones);
  });

  scene.onRequestNameForNewZone = (bounds, defaultName) => {
    openPrivateZoneNameModal("create", { bounds, defaultName });
  };

  scene.onPlayerClick = (data) => {
    showPlayerContextMenu(data);
  };

  scene.onPlayerMenuPositionUpdate = (pos) => {
    if (!pos.visible) {
      closePlayerContextMenu();
    } else {
      positionPlayerContextMenu(pos.screenX, pos.screenY);
    }
  };
}

function initJukeboxManager(mgr: MultiplayerManager) {
  if (jukeboxManager) {
    if (gameInstance) {
      const scene = gameInstance.scene.getScene("GameScene") as GameScene;
      if (scene) {
        scene.jukeboxManager = jukeboxManager;
      }
    }
    return;
  }

  jukeboxManager = new JukeboxManager(mgr);

  if (gameInstance) {
    const scene = gameInstance.scene.getScene("GameScene") as GameScene;
    if (scene) {
      scene.jukeboxManager = jukeboxManager;
    }
  }

  jukeboxManager.onTrackChange((track, jb) => {
    if (jukeboxErrorBanner) jukeboxErrorBanner.classList.add("hidden");
    if (jukeboxPlayerErrorOverlay) jukeboxPlayerErrorOverlay.classList.add("hidden");
    if (jukeboxStatusBadge) jukeboxStatusBadge.classList.remove("status-restricted");
    if (currentModalJukeboxId && (!jb || currentModalJukeboxId === jb.id)) {
      renderJukeboxModal(jb);
    }
    updateJukeboxHud(jb);
  });

  jukeboxManager.onTrackError((track, message, title) => {
    if (jukeboxStatusBadge) {
      jukeboxStatusBadge.textContent = "⚠️ RESTRICTED (ERROR 150)";
      jukeboxStatusBadge.classList.add("status-restricted");
    }
    if (jukeboxNowPlayingSubmitter) {
      jukeboxNowPlayingSubmitter.textContent = message;
    }
    if (jukeboxErrorBanner) {
      jukeboxErrorBanner.classList.remove("hidden");
      if (jukeboxErrorTitle) jukeboxErrorTitle.textContent = title || "Embedding Restricted";
      if (jukeboxErrorDesc) jukeboxErrorDesc.textContent = message;
      if (btnJukeboxOpenYoutube && track) {
        btnJukeboxOpenYoutube.href = `https://www.youtube.com/watch?v=${track.youtubeId}`;
      }
    }
    if (jukeboxPlayerErrorOverlay) {
      jukeboxPlayerErrorOverlay.classList.remove("hidden");
      if (btnPlayerOpenExternal && track) {
        btnPlayerOpenExternal.href = `https://www.youtube.com/watch?v=${track.youtubeId}`;
      }
    }
  });

  mgr.onJukeboxUpdate((jb) => {
    if (currentModalJukeboxId === jb.id) {
      renderJukeboxModal(jb);
    }
    if (jukeboxManager) {
      const active = jukeboxManager.getActiveJukebox();
      if (!active || active.id === jb.id) {
        jukeboxManager.updateJukeboxState(jb);
      }
    }
  });

  mgr.onJukeboxesSync((jbs) => {
    if (jukeboxManager && jbs.length > 0) {
      const active = jukeboxManager.getActiveJukebox();
      if (!active) {
        const playing = jbs.find((j) => j.isPlaying && j.playlist.length > 0) || jbs[0];
        jukeboxManager.updateJukeboxState(playing);
      }
    }
  });

  mgr.onJukeboxDelete((jbId) => {
    if (currentModalJukeboxId === jbId) {
      closeJukeboxModal();
    }
  });

  mgr.onJukeboxPlaylistAdded((data) => {
    showJukeboxStatus(
      `🎉 Successfully added ${data.count} track${data.count === 1 ? "" : "s"} from playlist "${data.title}"!`,
      "success",
      6000
    );
    if (btnJukeboxAddPlaylist) btnJukeboxAddPlaylist.disabled = false;
    if (btnJukeboxPlaylistLabel) btnJukeboxPlaylistLabel.textContent = "📥 Extract Videos";
  });

  mgr.onJukeboxError((data) => {
    showJukeboxStatus(data.message || "Failed to process jukebox request.", "error", 7000);
    if (btnJukeboxAddPlaylist) btnJukeboxAddPlaylist.disabled = false;
    if (btnJukeboxPlaylistLabel) btnJukeboxPlaylistLabel.textContent = "📥 Extract Videos";
  });
}

let jukeboxStatusTimer: number | null = null;

function showJukeboxStatus(
  message: string,
  type: "loading" | "success" | "error" = "loading",
  duration: number = 0
) {
  if (!jukeboxActionStatus || !jukeboxStatusText) return;
  if (jukeboxStatusTimer) {
    clearTimeout(jukeboxStatusTimer);
    jukeboxStatusTimer = null;
  }

  jukeboxActionStatus.className = `jukebox-action-status status-${type}`;
  jukeboxActionStatus.classList.remove("hidden");
  jukeboxStatusText.textContent = message;

  if (jukeboxStatusIcon) {
    if (type === "loading") {
      jukeboxStatusIcon.textContent = "⏳";
      jukeboxStatusIcon.className = "jukebox-status-icon jukebox-status-spinner";
    } else if (type === "success") {
      jukeboxStatusIcon.textContent = "✅";
      jukeboxStatusIcon.className = "jukebox-status-icon";
    } else {
      jukeboxStatusIcon.textContent = "⚠️";
      jukeboxStatusIcon.className = "jukebox-status-icon";
    }
  }

  if (type !== "loading" && duration > 0) {
    jukeboxStatusTimer = window.setTimeout(() => {
      hideJukeboxStatus();
    }, duration);
  }
}

function hideJukeboxStatus() {
  if (jukeboxStatusTimer) {
    clearTimeout(jukeboxStatusTimer);
    jukeboxStatusTimer = null;
  }
  if (jukeboxActionStatus) {
    jukeboxActionStatus.classList.add("hidden");
  }
}

function switchJukeboxTab(tab: "single" | "playlist") {
  hideJukeboxStatus();
  if (tab === "single") {
    tabJukeboxSingle?.classList.add("active");
    tabJukeboxSingle?.setAttribute("aria-selected", "true");
    tabJukeboxPlaylist?.classList.remove("active");
    tabJukeboxPlaylist?.setAttribute("aria-selected", "false");
    jukeboxAddTrackForm?.classList.remove("hidden");
    jukeboxAddPlaylistForm?.classList.add("hidden");
    jukeboxUrlInput?.focus();
  } else {
    tabJukeboxPlaylist?.classList.add("active");
    tabJukeboxPlaylist?.setAttribute("aria-selected", "true");
    tabJukeboxSingle?.classList.remove("active");
    tabJukeboxSingle?.setAttribute("aria-selected", "false");
    jukeboxAddPlaylistForm?.classList.remove("hidden");
    jukeboxAddTrackForm?.classList.add("hidden");
    jukeboxPlaylistInput?.focus();
  }
}

function setupSceneJukeboxEvents(scene: GameScene) {
  if (!scene) return;
  if (jukeboxManager) {
    scene.jukeboxManager = jukeboxManager;
  }
  if ((scene as any)._jukeboxEventsBound) return;
  (scene as any)._jukeboxEventsBound = true;

  scene.onJukeboxClick = (jbId: string) => {
    openJukeboxModal(jbId);
  };

  scene.onJukeboxNearby = (jb: JukeboxState | null) => {
    updateJukeboxHud(jb);
  };
}

function openJukeboxModal(jukeboxId?: string) {
  if (!jukeboxModal) return;

  hideJukeboxStatus();
  if (btnJukeboxAddPlaylist) btnJukeboxAddPlaylist.disabled = false;
  if (btnJukeboxPlaylistLabel) btnJukeboxPlaylistLabel.textContent = "📥 Extract Videos";

  if (jukeboxId) {
    currentModalJukeboxId = jukeboxId;
  } else if (multiplayer && multiplayer.currentJukeboxes.size > 0) {
    currentModalJukeboxId = Array.from(multiplayer.currentJukeboxes.keys())[0];
  }

  const jb =
    currentModalJukeboxId && multiplayer
      ? multiplayer.currentJukeboxes.get(currentModalJukeboxId)
      : null;

  renderJukeboxModal(jb || null);
  jukeboxModal.classList.remove("hidden");
  setGameControlsActive(false);

  if (jukeboxManager) {
    jukeboxManager.initPlayer();
  }
}

function closeJukeboxModal() {
  if (!jukeboxModal) return;
  hideJukeboxStatus();
  jukeboxModal.classList.add("hidden");
  setGameControlsActive(true);
}

function renderJukeboxModal(jb: JukeboxState | null) {
  if (!jukeboxModal) return;

  if (!jb) {
    if (jukeboxNowPlayingTitle) jukeboxNowPlayingTitle.textContent = "No Jukebox Found";
    if (jukeboxNowPlayingSubmitter)
      jukeboxNowPlayingSubmitter.textContent = "Place a jukebox in this space using the map editor";
    if (jukeboxStatusBadge) jukeboxStatusBadge.textContent = "NOT FOUND";
    if (btnJukeboxSkip) btnJukeboxSkip.disabled = true;
    if (jukeboxQueueCount) jukeboxQueueCount.textContent = "0 tracks";
    if (jukeboxQueueList) {
      jukeboxQueueList.innerHTML = `
        <div class="jukebox-empty-queue">
          <span class="empty-queue-icon">📻</span>
          <p>No jukebox active in this space.</p>
          <span class="empty-queue-sub">Use Edit Map to place a jukebox!</span>
        </div>`;
    }
    return;
  }

  const hasTracks = jb.playlist && jb.playlist.length > 0;
  const currentTrack = hasTracks ? jb.playlist[jb.currentTrackIndex] : null;

  if (hasTracks && currentTrack && jb.isPlaying) {
    if (jukeboxNowPlayingTitle) jukeboxNowPlayingTitle.textContent = currentTrack.title;
    if (jukeboxNowPlayingSubmitter)
      jukeboxNowPlayingSubmitter.textContent = `Added by ${currentTrack.addedByName || "Player"}`;
    if (jukeboxStatusBadge)
      jukeboxStatusBadge.textContent = `🎶 NOW PLAYING (${jb.currentTrackIndex + 1}/${jb.playlist.length})`;
    if (btnJukeboxSkip) btnJukeboxSkip.disabled = false;
  } else {
    if (jukeboxNowPlayingTitle) jukeboxNowPlayingTitle.textContent = "Playlist Empty";
    if (jukeboxNowPlayingSubmitter)
      jukeboxNowPlayingSubmitter.textContent = "Add a YouTube link below to start playing";
    if (jukeboxStatusBadge) jukeboxStatusBadge.textContent = "IDLE";
    if (btnJukeboxSkip) btnJukeboxSkip.disabled = true;
  }

  if (jukeboxQueueCount) {
    const count = jb.playlist.length;
    jukeboxQueueCount.textContent = `${count} ${count === 1 ? "track" : "tracks"}`;
  }

  if (jukeboxQueueList) {
    if (!hasTracks) {
      jukeboxQueueList.innerHTML = `
        <div class="jukebox-empty-queue">
          <span class="empty-queue-icon">🎵</span>
          <p>The playlist is empty.</p>
          <span class="empty-queue-sub">Paste a YouTube link above to start the jukebox!</span>
        </div>`;
    } else {
      jukeboxQueueList.innerHTML = "";
      jb.playlist.forEach((track, index) => {
        const item = document.createElement("div");
        item.className = `jukebox-queue-item ${index === jb.currentTrackIndex ? "active-track" : ""}`;

        const itemLeft = document.createElement("div");
        itemLeft.className = "queue-item-left";

        const idxSpan = document.createElement("span");
        idxSpan.className = "queue-item-idx";
        idxSpan.textContent = index === jb.currentTrackIndex ? "▶" : `${index + 1}`;

        const infoDiv = document.createElement("div");
        infoDiv.className = "queue-item-info";

        const titleSpan = document.createElement("span");
        titleSpan.className = "queue-item-title";
        titleSpan.textContent = track.title;

        const subSpan = document.createElement("span");
        subSpan.className = "queue-item-sub";
        subSpan.textContent = `Added by ${track.addedByName || "Player"}`;

        infoDiv.appendChild(titleSpan);
        infoDiv.appendChild(subSpan);
        itemLeft.appendChild(idxSpan);
        itemLeft.appendChild(infoDiv);

        const btnRemove = document.createElement("button");
        btnRemove.type = "button";
        btnRemove.className = "btn-queue-remove";
        btnRemove.title = "Remove from playlist";
        btnRemove.innerHTML = "🗑️";
        btnRemove.addEventListener("click", (e) => {
          e.stopPropagation();
          if (multiplayer && currentModalJukeboxId) {
            multiplayer.removeJukeboxTrack(currentModalJukeboxId, track.id);
          }
        });

        item.appendChild(itemLeft);
        item.appendChild(btnRemove);
        jukeboxQueueList.appendChild(item);
      });
    }
  }
}

function updateJukeboxHud(jb: JukeboxState | null) {
  if (!jukeboxHudPill) return;
  // User request: when in private area and near jukebox, no need to show the top bar indicator
  jukeboxHudPill.classList.add("hidden");
}

function initJukeboxUI() {
  if (btnCloseJukeboxModal) {
    btnCloseJukeboxModal.addEventListener("click", closeJukeboxModal);
  }

  if (jukeboxModal) {
    jukeboxModal.addEventListener("click", (e) => {
      if (e.target === jukeboxModal) {
        closeJukeboxModal();
      }
    });
  }

  if (btnToggleJukeboxCollapse && jukeboxPlayerCard) {
    btnToggleJukeboxCollapse.addEventListener("click", () => {
      jukeboxPlayerCard.classList.toggle("collapsed");
      btnToggleJukeboxCollapse.textContent = jukeboxPlayerCard.classList.contains("collapsed") ? "🗖" : "🗕";
    });
  }

  if (btnOpenJukeboxFromPlayer) {
    btnOpenJukeboxFromPlayer.addEventListener("click", () => {
      openJukeboxModal();
    });
  }

  if (btnJukeboxErrorSkip) {
    btnJukeboxErrorSkip.addEventListener("click", () => {
      if (multiplayer && currentModalJukeboxId) {
        multiplayer.skipJukeboxTrack(currentModalJukeboxId);
      }
    });
  }

  if (jukeboxHudPill) {
    jukeboxHudPill.addEventListener("click", (e) => {
      if (e.target !== btnJukeboxHudMute) {
        openJukeboxModal();
      }
    });
  }

  if (btnJukeboxHudMute) {
    btnJukeboxHudMute.addEventListener("click", (e) => {
      e.stopPropagation();
      if (jukeboxManager) {
        const isMuted = jukeboxManager.toggleMute();
        btnJukeboxHudMute.textContent = isMuted ? "🔇" : "🔊";
      }
    });
  }

  if (btnJukeboxSkip) {
    btnJukeboxSkip.addEventListener("click", () => {
      if (multiplayer && currentModalJukeboxId) {
        multiplayer.skipJukeboxTrack(currentModalJukeboxId);
      }
    });
  }

  if (tabJukeboxSingle) {
    tabJukeboxSingle.addEventListener("click", () => switchJukeboxTab("single"));
  }

  if (tabJukeboxPlaylist) {
    tabJukeboxPlaylist.addEventListener("click", () => switchJukeboxTab("playlist"));
  }

  if (jukeboxAddTrackForm) {
    jukeboxAddTrackForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const val = jukeboxUrlInput?.value.trim();
      if (!val || !multiplayer || !currentModalJukeboxId) return;

      const isPlaylist = /[?&]list=|\/playlist\?/i.test(val);
      if (isPlaylist) {
        showJukeboxStatus("Playlist link detected! Extracting playlist videos...", "loading");
        multiplayer.addJukeboxPlaylist(currentModalJukeboxId, val);
      } else {
        showJukeboxStatus("Adding track to jukebox...", "loading", 2500);
        multiplayer.addJukeboxTrack(currentModalJukeboxId, val);
      }

      if (jukeboxUrlInput) {
        jukeboxUrlInput.value = "";
      }
    });
  }

  if (jukeboxAddPlaylistForm) {
    jukeboxAddPlaylistForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const val = jukeboxPlaylistInput?.value.trim();
      if (!val || !multiplayer || !currentModalJukeboxId) return;

      showJukeboxStatus("Extracting videos from YouTube playlist... Please wait.", "loading");
      if (btnJukeboxAddPlaylist) btnJukeboxAddPlaylist.disabled = true;
      if (btnJukeboxPlaylistLabel) btnJukeboxPlaylistLabel.textContent = "⏳ Extracting...";

      multiplayer.addJukeboxPlaylist(currentModalJukeboxId, val);
      if (jukeboxPlaylistInput) {
        jukeboxPlaylistInput.value = "";
      }
    });
  }

  if (jukeboxPlaylistFileInput) {
    jukeboxPlaylistFileInput.addEventListener("change", async () => {
      const file = jukeboxPlaylistFileInput.files?.[0];
      if (!file || !multiplayer || !currentModalJukeboxId) return;

      showJukeboxStatus(`Reading playlist file "${file.name}"...`, "loading");
      try {
        const text = await file.text();
        const playlistMatch =
          text.match(/(?:https?:\/\/)?(?:www\.|m\.|music\.)?youtube\.com\/playlist\?list=([a-zA-Z0-9_-]+)/i) ||
          text.match(/[?&]list=([a-zA-Z0-9_-]+)/i);

        if (playlistMatch && playlistMatch[0]) {
          showJukeboxStatus("Found playlist in file! Extracting videos...", "loading");
          if (btnJukeboxAddPlaylist) btnJukeboxAddPlaylist.disabled = true;
          if (btnJukeboxPlaylistLabel) btnJukeboxPlaylistLabel.textContent = "⏳ Extracting...";
          multiplayer.addJukeboxPlaylist(currentModalJukeboxId, playlistMatch[0]);
        } else {
          const videoMatches = text.match(
            /(?:https?:\/\/)?(?:www\.|m\.|music\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|watch\?v=))([a-zA-Z0-9_-]{11})/gi
          );
          if (videoMatches && videoMatches.length > 0) {
            const uniqueVideos = Array.from(new Set(videoMatches));
            showJukeboxStatus(`Found ${uniqueVideos.length} YouTube videos in file! Queuing...`, "loading");
            for (const vidUrl of uniqueVideos) {
              multiplayer.addJukeboxTrack(currentModalJukeboxId, vidUrl);
            }
            showJukeboxStatus(`Successfully queued ${uniqueVideos.length} videos from file!`, "success", 4000);
          } else {
            showJukeboxStatus("No YouTube playlist or video links found in uploaded file.", "error", 4000);
          }
        }
      } catch (err: any) {
        showJukeboxStatus(`Failed to read file: ${err.message || err}`, "error", 4000);
      } finally {
        jukeboxPlaylistFileInput.value = "";
      }
    });
  }
}

// --- Type Racing Duel Modal & Controller ---

let activeTypewriterId: string | null = null;
let currentTypeRaceState: TypeRaceRoomState | null = null;
let raceQuoteText: string = "";
let raceStartTime: number = 0;
let raceTotalKeypresses: number = 0;
let raceErrorsCount: number = 0;
let raceFinished: boolean = false;
let raceLastProgressSentAt: number = 0;
let quoteCharSpans: HTMLSpanElement[] = [];
let lastRenderedQuote: string = "";
let currentTargetScrollTop: number = 0;

const typeraceModal = document.getElementById("typerace-modal") as HTMLDivElement | null;
const btnCloseTypeRaceModal = document.getElementById("btn-close-typerace-modal") as HTMLButtonElement | null;
const typeraceViewerBanner = document.getElementById("typerace-viewer-banner") as HTMLDivElement | null;
const typeraceLobbyView = document.getElementById("typerace-lobby-view") as HTMLDivElement | null;
const typeraceRaceView = document.getElementById("typerace-race-view") as HTMLDivElement | null;
const typeraceResultsView = document.getElementById("typerace-results-view") as HTMLDivElement | null;
const typeraceLobbyStatusText = document.getElementById("typerace-lobby-status-text") as HTMLSpanElement | null;
const btnTypeRaceReady = document.getElementById("btn-typerace-ready") as HTMLButtonElement | null;
const btnTypeRaceReadyText = document.getElementById("btn-typerace-ready-text") as HTMLSpanElement | null;
const typeraceLobbyCount = document.getElementById("typerace-lobby-count") as HTMLSpanElement | null;
const typeraceLobbyPlayersList = document.getElementById("typerace-lobby-players-list") as HTMLDivElement | null;
const typeraceCountdownOverlay = document.getElementById("typerace-countdown-overlay") as HTMLDivElement | null;
const typeraceCountdownNum = document.getElementById("typerace-countdown-num") as HTMLDivElement | null;
const typeraceTrackLanes = document.getElementById("typerace-track-lanes") as HTMLDivElement | null;
const typeraceQuoteProgressText = document.getElementById("typerace-quote-progress-text") as HTMLSpanElement | null;
const typeraceQuoteBox = document.getElementById("typerace-quote-box") as HTMLDivElement | null;
const typeraceTextInput = document.getElementById("typerace-text-input") as HTMLInputElement | null;
const typeraceLiveWpm = document.getElementById("typerace-live-wpm") as HTMLSpanElement | null;
const typeraceLiveAccuracy = document.getElementById("typerace-live-accuracy") as HTMLSpanElement | null;
const typeraceLiveProgress = document.getElementById("typerace-live-progress") as HTMLSpanElement | null;
const typeraceFinishedBanner = document.getElementById("typerace-finished-banner") as HTMLDivElement | null;
const typeraceFinishedTitle = document.getElementById("typerace-finished-title") as HTMLHeadingElement | null;
const typeraceFinishedSub = document.getElementById("typerace-finished-sub") as HTMLParagraphElement | null;
const typeraceScoreboardBody = document.getElementById("typerace-scoreboard-body") as HTMLTableSectionElement | null;
const btnTypeRacePlayAgain = document.getElementById("btn-typerace-play-again") as HTMLButtonElement | null;
const btnTypeRaceLeave = document.getElementById("btn-typerace-leave") as HTMLButtonElement | null;

function setupSceneTypewriterEvents(scene: GameScene) {
  if (!scene) return;
  if ((scene as any)._typewriterEventsBound) return;
  (scene as any)._typewriterEventsBound = true;

  scene.onTypewriterClick = (twId: string) => {
    openTypeRaceModal(twId);
  };
}

function openTypeRaceModal(typewriterId: string) {
  if (!typeraceModal) return;
  activeTypewriterId = typewriterId;
  currentTargetScrollTop = 0;
  typeraceModal.classList.remove("hidden");
  setGameControlsActive(false);

  if (multiplayer) {
    multiplayer.joinTypeRace(typewriterId);
  }
}

function closeTypeRaceModal() {
  if (!typeraceModal) return;
  if (activeTypewriterId && multiplayer) {
    multiplayer.leaveTypeRace(activeTypewriterId);
  }
  activeTypewriterId = null;
  currentTypeRaceState = null;
  currentTargetScrollTop = 0;
  typeraceModal.classList.add("hidden");
  setGameControlsActive(true);
}

function initQuoteDisplay(quote: string) {
  if (!typeraceQuoteBox) return;
  typeraceQuoteBox.innerHTML = "";
  quoteCharSpans = [];
  lastRenderedQuote = quote;
  currentTargetScrollTop = 0;

  for (let i = 0; i < quote.length; i++) {
    const span = document.createElement("span");
    span.className = "typerace-char char-pending";
    span.textContent = quote[i];
    typeraceQuoteBox.appendChild(span);
    quoteCharSpans.push(span);
  }

  // Bottom spacer to ensure the last lines also have >= 2 lines visible below them
  const spacer = document.createElement("div");
  spacer.className = "typerace-quote-spacer";
  spacer.style.height = "72px";
  spacer.style.pointerEvents = "none";
  typeraceQuoteBox.appendChild(spacer);

  typeraceQuoteBox.scrollTop = 0;
}

function scrollQuoteBoxToKeepAhead(container: HTMLElement, activeSpan: HTMLElement) {
  if (!container || !activeSpan) return;
  const containerRect = container.getBoundingClientRect();
  const spanRect = activeSpan.getBoundingClientRect();

  if (containerRect.height <= 0) return;

  const computed = window.getComputedStyle(container);
  const fontSize = parseFloat(computed.fontSize) || 17;
  const rawLineHeight = parseFloat(computed.lineHeight);
  const lineHeight = (!isNaN(rawLineHeight) && rawLineHeight > 0) ? rawLineHeight : fontSize * 1.8;
  const paddingBottom = parseFloat(computed.paddingBottom) || 14;

  // The active character's vertical bounds in container content coordinates
  const spanContentTop = spanRect.top - containerRect.top + container.scrollTop;
  const spanHeight = spanRect.height > 0 ? spanRect.height : lineHeight;
  const spanContentBottom = spanContentTop + spanHeight;

  // Effective visible height before bottom padding
  const effectiveHeight = Math.max(lineHeight * 2, container.clientHeight - paddingBottom);

  // Auto-scroll when there are 2 lines left at the bottom of the current view.
  // The bottom of the current view should be at least (spanContentBottom + 2.0 * lineHeight).
  // targetScrollTop = (spanContentBottom + 2.0 * lineHeight) - effectiveHeight.
  const targetScrollTop = Math.max(0, Math.round(spanContentBottom + 2.0 * lineHeight - effectiveHeight));

  if (targetScrollTop > currentTargetScrollTop + 2) {
    currentTargetScrollTop = targetScrollTop;
    container.scrollTo({
      top: currentTargetScrollTop,
      behavior: "smooth",
    });
  } else if (targetScrollTop < currentTargetScrollTop - lineHeight) {
    // Backspacing upward past previous lines
    currentTargetScrollTop = targetScrollTop;
    container.scrollTo({
      top: currentTargetScrollTop,
      behavior: "smooth",
    });
  }
}

function renderQuoteChars(quote: string, typedVal: string) {
  if (!typeraceQuoteBox) return { correctCount: 0, hasError: false };

  if (quote !== lastRenderedQuote || quoteCharSpans.length !== quote.length) {
    initQuoteDisplay(quote);
  }

  let correctCount = 0;
  let hasError = false;
  const currentIdx = Math.min(typedVal.length, quote.length);

  for (let i = 0; i < quote.length; i++) {
    const span = quoteCharSpans[i];
    if (!span) continue;

    if (i < typedVal.length) {
      if (typedVal[i] === quote[i] && !hasError) {
        if (span.className !== "typerace-char char-correct") {
          span.className = "typerace-char char-correct";
        }
        correctCount++;
      } else {
        hasError = true;
        if (span.className !== "typerace-char char-incorrect") {
          span.className = "typerace-char char-incorrect";
        }
      }
    } else if (i === currentIdx) {
      if (span.className !== "typerace-char char-current") {
        span.className = "typerace-char char-current";
      }
    } else {
      if (span.className !== "typerace-char char-pending") {
        span.className = "typerace-char char-pending";
      }
    }
  }

  const activeSpan =
    (currentIdx < quoteCharSpans.length
      ? quoteCharSpans[currentIdx]
      : quoteCharSpans[quoteCharSpans.length - 1]) || null;

  if (activeSpan && typeraceQuoteBox) {
    scrollQuoteBoxToKeepAhead(typeraceQuoteBox, activeSpan);
  }

  return { correctCount, hasError };
}

function updateTypeRaceUI(state: TypeRaceRoomState) {
  if (!state || !activeTypewriterId || state.typewriterId !== activeTypewriterId) return;
  currentTypeRaceState = state;

  const mySessionId = multiplayer?.room?.sessionId || "";
  const players = Object.values(state.players || {});
  const me = state.players[mySessionId];
  const isViewer = me ? me.isViewer : false;

  if (typeraceViewerBanner) {
    typeraceViewerBanner.classList.toggle("hidden", !isViewer);
  }

  if (state.status === "waiting" || state.status === "starting") {
    typeraceLobbyView?.classList.remove("hidden");
    typeraceRaceView?.classList.add("hidden");
    typeraceResultsView?.classList.add("hidden");

    if (state.status === "starting") {
      typeraceCountdownOverlay?.classList.remove("hidden");
      if (typeraceCountdownNum) {
        typeraceCountdownNum.textContent = String(state.countdown || 3);
      }
    } else {
      typeraceCountdownOverlay?.classList.add("hidden");
    }

    if (btnTypeRaceReady && btnTypeRaceReadyText) {
      if (isViewer) {
        btnTypeRaceReady.disabled = true;
        btnTypeRaceReady.classList.remove("is-ready");
        btnTypeRaceReadyText.textContent = "👀 Spectating Current Match";
      } else {
        btnTypeRaceReady.disabled = false;
        if (me?.isReady) {
          btnTypeRaceReady.classList.add("is-ready");
          btnTypeRaceReadyText.textContent = "✓ Ready (Click to Cancel)";
        } else {
          btnTypeRaceReady.classList.remove("is-ready");
          btnTypeRaceReadyText.textContent = "✓ Ready Up";
        }
      }
    }

    const activePlayers = players.filter((p) => !p.isViewer);
    const readyPlayers = activePlayers.filter((p) => p.isReady);
    if (typeraceLobbyStatusText) {
      typeraceLobbyStatusText.textContent =
        state.status === "starting"
          ? `MATCH STARTING IN ${state.countdown || 3}...`
          : `LOBBY • ${readyPlayers.length}/${activePlayers.length} PLAYERS READY`;
    }

    if (typeraceLobbyCount) {
      typeraceLobbyCount.textContent = `${players.length} ${players.length === 1 ? "Player" : "Players"}`;
    }

    if (typeraceLobbyPlayersList) {
      typeraceLobbyPlayersList.innerHTML = "";
      for (const p of players) {
        const card = document.createElement("div");
        card.className = `typerace-player-card ${p.isViewer ? "is-viewer" : ""}`;

        let readyBadge = "";
        if (p.isViewer) {
          readyBadge = `<span class="player-ready-tag viewer">👀 Viewer</span>`;
        } else if (p.isReady) {
          readyBadge = `<span class="player-ready-tag ready">✓ Ready</span>`;
        } else {
          readyBadge = `<span class="player-ready-tag waiting">⏳ Waiting</span>`;
        }

        const isMeTag = p.sessionId === mySessionId ? ` <span style="font-size:10px;color:#94a3b8;">(You)</span>` : "";

        card.innerHTML = `
          <div class="player-card-left">
            <span class="player-color-dot" style="background:${p.color || '#3b82f6'};"></span>
            <span class="player-card-name">${escapeHtml(p.name)}${isMeTag}</span>
          </div>
          ${readyBadge}
        `;
        typeraceLobbyPlayersList.appendChild(card);
      }
    }

  } else if (state.status === "racing") {
    typeraceLobbyView?.classList.add("hidden");
    typeraceRaceView?.classList.remove("hidden");
    typeraceResultsView?.classList.add("hidden");
    typeraceCountdownOverlay?.classList.add("hidden");

    if (state.quote && state.quote !== raceQuoteText) {
      raceQuoteText = state.quote;
      raceStartTime = state.startTime || Date.now();
      raceTotalKeypresses = 0;
      raceErrorsCount = 0;
      raceFinished = false;

      if (typeraceTextInput) {
        typeraceTextInput.value = "";
        if (isViewer) {
          typeraceTextInput.disabled = true;
          typeraceTextInput.placeholder = "👀 Spectating live race...";
        } else {
          typeraceTextInput.disabled = false;
          typeraceTextInput.placeholder = "Start typing the quote here...";
          typeraceTextInput.focus();
        }
      }

      renderQuoteChars(raceQuoteText, "");
    }

    if (typeraceTrackLanes) {
      typeraceTrackLanes.innerHTML = "";
      const racers = players.filter((p) => !p.isViewer);

      for (const p of racers) {
        const lane = document.createElement("div");
        lane.className = "track-lane";

        let statsText = `${p.wpm} WPM`;
        if (p.finished) {
          statsText = `🏁 #${p.finishRank} Finished (${p.finishTime}s) • ${p.wpm} WPM`;
        }

        const isMeText = p.sessionId === mySessionId ? ` <span style="font-size:10px;color:#94a3b8;">(You)</span>` : "";

        lane.innerHTML = `
          <div class="lane-info-row">
            <div class="lane-player-name">
              <span class="player-color-dot" style="background:${p.color || '#3b82f6'};"></span>
              <span>${escapeHtml(p.name)}${isMeText}</span>
            </div>
            <div class="lane-stats">${statsText}</div>
          </div>
          <div class="track-lane-bar-wrap">
            <div class="track-lane-progress" style="width:${p.progress}%; background:${p.color || '#3b82f6'};"></div>
            <div class="track-lane-racer-icon" style="left:${p.progress}%;">🏎️</div>
          </div>
        `;
        typeraceTrackLanes.appendChild(lane);
      }
    }

    if (typeraceFinishedBanner && typeraceFinishedTitle && typeraceFinishedSub) {
      if (me?.finished) {
        typeraceFinishedBanner.classList.remove("hidden");
        typeraceFinishedTitle.textContent = `You finished #${me.finishRank}! (${me.finishTime}s)`;
        typeraceFinishedSub.textContent = `Speed: ${me.wpm} WPM • Accuracy: ${me.accuracy}%. Waiting for remaining racers to finish...`;
        if (typeraceTextInput) typeraceTextInput.disabled = true;
      } else {
        typeraceFinishedBanner.classList.add("hidden");
      }
    }

  } else if (state.status === "ended") {
    typeraceLobbyView?.classList.add("hidden");
    typeraceRaceView?.classList.add("hidden");
    typeraceResultsView?.classList.remove("hidden");
    typeraceCountdownOverlay?.classList.add("hidden");

    if (typeraceScoreboardBody) {
      typeraceScoreboardBody.innerHTML = "";
      const results = state.results || [];

      results.forEach((res) => {
        const row = document.createElement("tr");
        row.className = `rank-${res.rank <= 3 ? res.rank : "other"}`;

        let rankBadge = `#${res.rank}`;
        if (res.rank === 1) rankBadge = "🥇 1st";
        else if (res.rank === 2) rankBadge = "🥈 2nd";
        else if (res.rank === 3) rankBadge = "🥉 3rd";

        const isMe = res.sessionId === mySessionId;
        const youTag = isMe ? ` <span style="font-size:10px;color:#a855f7;">(You)</span>` : "";

        row.innerHTML = `
          <td class="scoreboard-rank-badge">${rankBadge}</td>
          <td>
            <div class="scoreboard-player-cell">
              <span class="player-color-dot" style="background:${res.color || '#3b82f6'};"></span>
              <span>${escapeHtml(res.name)}${youTag}</span>
            </div>
          </td>
          <td><strong style="color:#10b981;font-size:14px;">${res.wpm} WPM</strong></td>
          <td>${res.accuracy}%</td>
          <td>${res.timeSeconds}s</td>
        `;
        typeraceScoreboardBody.appendChild(row);
      });
    }
  }
}

if (typeraceTextInput) {
  typeraceTextInput.addEventListener("input", () => {
    if (!raceQuoteText || raceFinished || !activeTypewriterId || !multiplayer) return;

    const typedVal = typeraceTextInput.value;
    raceTotalKeypresses++;

    const res = renderQuoteChars(raceQuoteText, typedVal);
    const correctCount = res?.correctCount || 0;
    const hasError = res?.hasError || false;

    const progress = Math.min(100, Math.round((correctCount / Math.max(1, raceQuoteText.length)) * 100));
    const elapsedMinutes = Math.max(0.001, (Date.now() - raceStartTime) / 60000);
    const wpm = Math.max(0, Math.round((correctCount / 5) / elapsedMinutes));
    const accuracy = Math.min(
      100,
      Math.max(0, Math.round((correctCount / Math.max(1, raceTotalKeypresses)) * 100))
    );

    if (typeraceLiveWpm) typeraceLiveWpm.textContent = String(wpm);
    if (typeraceLiveAccuracy) typeraceLiveAccuracy.textContent = `${accuracy}%`;
    if (typeraceLiveProgress) typeraceLiveProgress.textContent = `${progress}%`;
    if (typeraceQuoteProgressText) {
      typeraceQuoteProgressText.textContent = `${correctCount} / ${raceQuoteText.length} chars`;
    }

    if (correctCount >= raceQuoteText.length && !hasError) {
      raceFinished = true;
      typeraceTextInput.disabled = true;
      multiplayer.sendTypeRaceProgress(
        activeTypewriterId,
        correctCount,
        raceErrorsCount,
        true,
        wpm,
        accuracy
      );
    } else {
      const now = Date.now();
      if (now - raceLastProgressSentAt > 120) {
        raceLastProgressSentAt = now;
        multiplayer.sendTypeRaceProgress(
          activeTypewriterId,
          correctCount,
          raceErrorsCount,
          false,
          wpm,
          accuracy
        );
      }
    }
  });

  typeraceTextInput.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return;
    }
    // Prevent typing letters (WASD, arrows, space) from reaching Phaser canvas or movement
    e.stopPropagation();
  });

  typeraceTextInput.addEventListener("keyup", (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return;
    }
    e.stopPropagation();
  });

  typeraceTextInput.addEventListener("keypress", (e: KeyboardEvent) => {
    e.stopPropagation();
  });
}

if (typeraceModal) {
  // Capture phase listener to strictly disable Escape key inside modal
  typeraceModal.addEventListener(
    "keydown",
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    },
    true
  );
}

if (btnTypeRaceReady) {
  btnTypeRaceReady.addEventListener("click", () => {
    if (!activeTypewriterId || !multiplayer || !currentTypeRaceState) return;
    const mySessionId = multiplayer.room?.sessionId || "";
    const me = currentTypeRaceState.players[mySessionId];
    if (!me || me.isViewer) return;
    const newReady = !me.isReady;
    multiplayer.setTypeRaceReady(activeTypewriterId, newReady);
  });
}

if (btnTypeRacePlayAgain) {
  btnTypeRacePlayAgain.addEventListener("click", () => {
    if (!activeTypewriterId || !multiplayer) return;
    multiplayer.requestTypeRacePlayAgain(activeTypewriterId);
  });
}

if (btnTypeRaceLeave) {
  btnTypeRaceLeave.addEventListener("click", () => {
    closeTypeRaceModal();
  });
}

if (btnCloseTypeRaceModal) {
  btnCloseTypeRaceModal.addEventListener("click", () => {
    closeTypeRaceModal();
  });
}

if (typeraceModal) {
  typeraceModal.addEventListener("click", (e) => {
    if (e.target === typeraceModal) {
      closeTypeRaceModal();
    }
  });
}

function setupMultiplayerTypeRaceListeners(mgr: MultiplayerManager) {
  mgr.onTypeRaceState((state) => {
    updateTypeRaceUI(state);
  });

  mgr.onTypeRaceStart((data) => {
    if (data.typewriterId === activeTypewriterId) {
      raceQuoteText = data.quote;
      raceStartTime = data.startTime;
      raceTotalKeypresses = 0;
      raceErrorsCount = 0;
      raceFinished = false;

      if (typeraceTextInput) {
        typeraceTextInput.value = "";
        typeraceTextInput.disabled = false;
        typeraceTextInput.placeholder = "Start typing the quote here...";
        typeraceTextInput.focus();
      }

      renderQuoteChars(raceQuoteText, "");
    }
  });

  mgr.onTypeRaceEnded((data) => {
    if (data.typewriterId === activeTypewriterId && currentTypeRaceState) {
      currentTypeRaceState.status = "ended";
      currentTypeRaceState.results = data.results;
      updateTypeRaceUI(currentTypeRaceState);
    }
  });

  mgr.onTypewriterDelete((twId) => {
    if (activeTypewriterId === twId) {
      closeTypeRaceModal();
    }
  });
}



if (privateZoneNameForm) {
  privateZoneNameForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = privateZoneInputName?.value.trim() || "";
    const zoneId = privateZoneModalZoneId?.value;

    if (gameInstance) {
      const s = gameInstance.scene.getScene("GameScene") as GameScene;
      if (s) {
        if (zoneId) {
          s.renamePrivateZone(zoneId, name);
        } else if (pendingZoneBounds) {
          s.createPrivateZone(pendingZoneBounds, name);
        }
      }
    }

    closePrivateZoneNameModal();
  });
}

if (btnClosePrivateZoneModal) {
  btnClosePrivateZoneModal.addEventListener("click", () => {
    closePrivateZoneNameModal();
  });
}

if (btnCancelPrivateZoneName) {
  btnCancelPrivateZoneName.addEventListener("click", () => {
    closePrivateZoneNameModal();
  });
}

if (privateZoneNameModal) {
  privateZoneNameModal.addEventListener("click", (e) => {
    if (e.target === privateZoneNameModal) {
      closePrivateZoneNameModal();
    }
  });
}



if (btnToastDonePlacing) {
  btnToastDonePlacing.addEventListener("click", () => {
    showEditorUI();
  });
}

if (editorBrushCard) {
  editorBrushCard.style.cursor = "pointer";
  editorBrushCard.title = "Click to start putting tiles (Hides UI)";
  editorBrushCard.addEventListener("click", () => {
    if (activeEditorTool !== "none") {
      hideEditorUIForPlacing(currentSelectedAssetName);
    }
  });
}

if (btnEditMap) {
  btnEditMap.addEventListener("click", () => {
    toggleEditMode();
  });
}

if (btnCloseMapEditor) {
  btnCloseMapEditor.addEventListener("click", () => {
    exitEditMode();
  });
}

if (btnBannerDone) {
  btnBannerDone.addEventListener("click", () => {
    exitEditMode();
  });
}

const editorAssetCards =
  document.querySelectorAll<HTMLButtonElement>(".editor-asset-card");
editorAssetCards.forEach((card) => {
  card.addEventListener("click", () => {
    const toolType = card.dataset.toolType;
    if (toolType === "cursor") {
      selectCursorTool();
    } else if (toolType === "private_zone" || toolType === "clear_private_zone") {
      selectPrivateTool(toolType);
    } else if (toolType === "clear_decoration") {
      selectClearDecorationTool();
    } else if (toolType === "jukebox") {
      selectJukeboxTool();
    } else if (toolType === "typewriter") {
      selectTypewriterTool();
    } else if (toolType === "spawn_point") {
      selectSpawnPointTool();
    } else if (toolType === "color_dropper") {
      selectColorDropperTool();
    } else {
      const id = card.dataset.assetId || "wood_5";
      const name = card.dataset.assetName || "Wood 5";
      const tileType = card.dataset.tileType;
      if (tileType === "decoration") {
        selectDecorationAsset(id, name);
      } else {
        selectEditorAsset(id, name);
      }
    }
  });
});

const btnCloseEditorItemMenu = document.getElementById("btn-close-editor-item-menu");
if (btnCloseEditorItemMenu) {
  btnCloseEditorItemMenu.addEventListener("click", (e) => {
    e.stopPropagation();
    closeEditorItemContextMenu();
  });
}

const btnEditorItemObstacle = document.getElementById("btn-editor-item-obstacle");
if (btnEditorItemObstacle) {
  btnEditorItemObstacle.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!activeEditorContextMenuItem) return;
    if (gameInstance) {
      const scene = gameInstance.scene.getScene("GameScene") as GameScene;
      if (scene && typeof scene.toggleItemObstacle === "function") {
        const newIsObstacle = scene.toggleItemObstacle(activeEditorContextMenuItem);
        updateEditorItemObstacleButton(newIsObstacle);
        showPlacingToast(
          newIsObstacle
            ? `Obstacle enabled for ${activeEditorContextMenuItem.label || "item"}`
            : `Obstacle disabled for ${activeEditorContextMenuItem.label || "item"} (Walkable)`
        );
      }
    }
  });
}

const btnEditorItemDelete = document.getElementById("btn-editor-item-delete");
if (btnEditorItemDelete) {
  btnEditorItemDelete.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!activeEditorContextMenuItem) return;
    if (gameInstance) {
      const scene = gameInstance.scene.getScene("GameScene") as GameScene;
      if (scene && typeof scene.deleteInspectableItem === "function") {
        scene.deleteInspectableItem(activeEditorContextMenuItem);
      }
    }
    closeEditorItemContextMenu();
  });
}

const btnDropperShortcut = document.getElementById("btn-dropper-shortcut");
if (btnDropperShortcut) {
  btnDropperShortcut.addEventListener("click", (e) => {
    e.stopPropagation();
    selectColorDropperTool();
  });
}

// Global capture listener to strictly disable Escape key when Typerace modal is open
window.addEventListener(
  "keydown",
  (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      const twModal = document.getElementById("typerace-modal");
      if (twModal && !twModal.classList.contains("hidden")) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    }
  },
  true
);

// Global capture listener to ensure Up/Down arrow keys adjust layer in Edit Mode
window.addEventListener(
  "keydown",
  (e: KeyboardEvent) => {
    if (!isEditModeActive) return;

    const isUp =
      e.key === "ArrowUp" || e.key === "Up" || e.code === "ArrowUp" || e.keyCode === 38;
    const isDown =
      e.key === "ArrowDown" || e.key === "Down" || e.code === "ArrowDown" || e.keyCode === 40;

    if (!isUp && !isDown) return;

    const target = e.target as HTMLElement | null;
    const activeEl = document.activeElement as HTMLElement | null;
    const targetTag = target?.tagName;
    const activeTag = activeEl?.tagName;

    // Do not interfere if user is typing in an input element
    if (
      targetTag === "INPUT" ||
      targetTag === "TEXTAREA" ||
      targetTag === "SELECT" ||
      activeTag === "INPUT" ||
      activeTag === "TEXTAREA" ||
      activeTag === "SELECT"
    ) {
      return;
    }

    if (isAnyModalOpen()) return;

    e.preventDefault();
    e.stopPropagation();
    adjustPlacementLayer(isUp ? 1 : -1);
  },
  true
);

window.addEventListener("keydown", (e: KeyboardEvent) => {
  if (e.key === "Escape") {
    if (typeraceModal && !typeraceModal.classList.contains("hidden")) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (jukeboxModal && !jukeboxModal.classList.contains("hidden")) {
      closeJukeboxModal();
      return;
    }
    if (
      privateZoneNameModal &&
      !privateZoneNameModal.classList.contains("hidden")
    ) {
      closePrivateZoneNameModal();
      return;
    }
    if (isAudioSettingsOpen) {
      closeAudioSettingsDropdown();
      setGameControlsActive(true);
      return;
    }
    if (document.activeElement === chatInputField) {
      chatInputField?.blur();
      setGameControlsActive(true);
      return;
    }
    if (isEditModeActive) {
      const editorItemMenuEl = document.getElementById("editor-item-context-menu");
      if (editorItemMenuEl && !editorItemMenuEl.classList.contains("hidden")) {
        closeEditorItemContextMenu();
        return;
      }
      if (isEditorUIHidden) {
        showEditorUI();
        return;
      }
      exitEditMode();
      return;
    }
  }

  // Pressing Enter when not in an active input or modal focuses chat
  if (
    e.key === "Enter" &&
    document.activeElement !== chatInputField &&
    !isEditModeActive &&
    !isAnyModalOpen() &&
    !isAudioSettingsOpen
  ) {
    if (!isChatOpen) {
      setChatOpen(true);
    }
    chatInputField?.focus();
    setGameControlsActive(false);
    e.preventDefault();
  }

  // Pressing 'm' or 'M' when not typing in an input toggles mic
  if (
    e.key.toLowerCase() === "m" &&
    document.activeElement !== chatInputField &&
    document.activeElement?.tagName !== "INPUT" &&
    document.activeElement?.tagName !== "TEXTAREA" &&
    document.activeElement?.tagName !== "SELECT" &&
    !isEditModeActive &&
    !isAnyModalOpen() &&
    !isAudioSettingsOpen
  ) {
    toggleMic();
    e.preventDefault();
  }
});

// Map Modal Handlers
function openMapModal() {
  if (mapCurrentSpaceName) {
    mapCurrentSpaceName.textContent = currentSpaceName;
  }
  renderCategories();
  renderSpacesList();
  mapModal.classList.remove("hidden");
  setGameControlsActive(false);
}

function closeMapModal() {
  mapModal.classList.add("hidden");
  setGameControlsActive(true);
}

btnOpenMap.addEventListener("click", openMapModal);
btnCloseMapModal.addEventListener("click", closeMapModal);

mapModal.addEventListener("click", (e) => {
  if (e.target === mapModal) {
    closeMapModal();
  }
});

if (btnAdminAddSpace) {
  btnAdminAddSpace.addEventListener("click", () => {
    openAdminCreateSpaceModal();
  });
}

/**
 * Updates UI elements in top bar and dropdown
 */
function updateTopBarUI() {
  const name = getEffectivePlayerName();
  topbarUserName.textContent = name;

  const isSuperadmin = currentUser?.role === "superadmin";
  (window as any).currentUserRole = currentUser?.role || "user";

  if (isSuperadmin) {
    topbarAdminCrown.classList.remove("hidden");
    if (btnAdminAddSpace) btnAdminAddSpace.classList.remove("hidden");
  } else {
    topbarAdminCrown.classList.add("hidden");
    if (btnAdminAddSpace) btnAdminAddSpace.classList.add("hidden");
  }

  // Update Avatar Visual in Top Bar
  const isCustomActive = switchUploadPictures.checked && uploadedFrames.idle.length > 0 && uploadedFrames.idle[0].startsWith("data:image/");
  const topbarImgUrl = isCustomActive ? uploadedFrames.idle[0] : "/assets/sprite1.png";
  topbarAvatarImg.src = topbarImgUrl;
  topbarAvatarImg.classList.remove("hidden");
  if (topbarAvatarDot) topbarAvatarDot.classList.add("hidden");

  // Dropdown subtitle
  if (myPersonalSpace) {
    if (currentSpaceId === myPersonalSpace.id) {
      dropdownMySpaceSub.textContent = "✓ Currently inside";
    } else {
      dropdownMySpaceSub.textContent = `${myPersonalSpace.name} (${myPersonalSpace.isPublic ? "Public" : "Private"})`;
    }
  } else {
    dropdownMySpaceSub.textContent = "Enter personal space";
  }

  if (mapCurrentSpaceName) {
    mapCurrentSpaceName.textContent = currentSpaceName;
  }

  updateMapSettingsVisibility();
}

/**
 * Determine if current user has permission to configure the space they are currently in
 */
function canChangeCurrentSpaceSettings(): boolean {
  if (!currentUser) return false;

  // Case 1: User is currently inside their own personal space
  if (myPersonalSpace && currentSpaceId === myPersonalSpace.id) {
    return true;
  }

  // Case 2: Superadmin has control to configure any space
  if (currentUser.role === "superadmin") {
    return true;
  }

  return false;
}

function updateMapSettingsVisibility() {
  const canEdit = canChangeCurrentSpaceSettings();

  if (btnMapSettings) {
    if (canEdit) {
      btnMapSettings.classList.remove("hidden");
    } else {
      btnMapSettings.classList.add("hidden");
    }
  }

  if (btnEditMap) {
    if (canEdit) {
      btnEditMap.classList.remove("hidden");
    } else {
      btnEditMap.classList.add("hidden");
      exitEditMode();
    }
  }
}

/**
 * Fetch spaces list, categories, and user personal space from backend
 */
async function fetchSpaces() {
  if (!authToken) return;
  try {
    const res = await fetch(getApiUrl("/api/spaces"), {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (res.status === 401) {
      console.warn("Session expired or user no longer exists. Logging out.");
      handleLogout();
      return;
    }
    const data: SpacesListResponse = await res.json();
    if (res.ok && data.success) {
      loadedSpaces = data.spaces || [];
      loadedCategories = data.categories || [];
      if (data.mySpace) {
        myPersonalSpace = data.mySpace;
      }

      // Check current space name
      if (currentSpaceId === myPersonalSpace?.id) {
        currentSpaceName = myPersonalSpace.name;
      } else {
        const found = loadedSpaces.find((s) => s.id === currentSpaceId);
        if (found) currentSpaceName = found.name;
      }

      renderCategories();
      renderSpacesList();
      updateTopBarUI();
    }
  } catch (err) {
    console.warn("Could not fetch spaces:", err);
  }
}

function renderCategories() {
  mapCategoryTabs.innerHTML = "";

  // "All" Tab
  const allBtn = document.createElement("button");
  allBtn.type = "button";
  allBtn.className = `map-cat-tab ${activeCategoryFilter === "All" ? "active" : ""}`;
  allBtn.innerHTML = `<span>All</span><span class="map-cat-count">${loadedSpaces.length}</span>`;
  allBtn.addEventListener("click", () => {
    activeCategoryFilter = "All";
    renderCategories();
    renderSpacesList();
  });
  mapCategoryTabs.appendChild(allBtn);

  // Each Category Tab
  loadedCategories.forEach((cat) => {
    const count = loadedSpaces.filter((s) => s.category === cat).length;
    const catBtn = document.createElement("button");
    catBtn.type = "button";
    catBtn.className = `map-cat-tab ${activeCategoryFilter === cat ? "active" : ""}`;
    catBtn.innerHTML = `<span>${escapeHtml(cat)}</span><span class="map-cat-count">${count}</span>`;
    catBtn.addEventListener("click", () => {
      activeCategoryFilter = cat;
      renderCategories();
      renderSpacesList();
    });
    mapCategoryTabs.appendChild(catBtn);
  });
}

function renderSpacesList() {
  mapSpacesGrid.innerHTML = "";

  const filtered =
    activeCategoryFilter === "All"
      ? loadedSpaces
      : loadedSpaces.filter((s) => s.category === activeCategoryFilter);

  if (filtered.length === 0) {
    mapSpacesGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 36px 12px; color: var(--text-muted); font-size: 13px;">
        No spaces found in category "${escapeHtml(activeCategoryFilter)}".
      </div>
    `;
    return;
  }

  filtered.forEach((space) => {
    const isCurrent = space.id === currentSpaceId;
    const isSuperadmin = currentUser?.role === "superadmin";
    const isWhitelisted = currentUser
      ? space.whitelist.some(
          (w) => w.toLowerCase() === currentUser!.username.toLowerCase(),
        )
      : false;
    const canJoin = space.isPublic || isSuperadmin || isWhitelisted;

    const card = document.createElement("div");
    card.className = `map-space-card ${isCurrent ? "current" : ""}`;

    card.innerHTML = `
      <div>
        <div class="space-card-top-row">
          <span class="space-category-pill">📂 ${escapeHtml(space.category || "General")}</span>
          <div style="display: flex; gap: 4px; align-items: center;">
            <span class="badge-privacy ${space.isPublic ? "public" : "private"}">
              ${space.isPublic ? "🌐 Public" : "🔒 Private"}
            </span>
            ${!space.isPublic && isWhitelisted ? `<span class="badge-invited">✨ Invited</span>` : ""}
          </div>
        </div>
        <h3 class="space-card-name-title">${escapeHtml(space.name)}</h3>
        <div class="space-online-count">
          <span>👥</span>
          <span>${space.playerCount || 0} online</span>
        </div>
      </div>
      <div class="space-card-bottom">
        <div class="space-actions-group">
          ${
            isSuperadmin
              ? `
            <button type="button" class="btn-space-admin-action edit-admin-space" data-id="${space.id}" title="Edit Space">⚙️</button>
            <button type="button" class="btn-space-admin-action delete delete-admin-space" data-id="${space.id}" title="Delete Space">🗑️</button>
          `
              : ""
          }
        </div>
        ${
          isCurrent
            ? `<button type="button" class="btn-space-join current" disabled>✓ Current</button>`
            : canJoin
              ? `<button type="button" class="btn-space-join action-travel" data-id="${space.id}" data-name="${escapeHtml(space.name)}">🚀 Travel</button>`
              : `<button type="button" class="btn-space-join locked" disabled title="Requires invitation from superadmin">🔒 Locked</button>`
        }
      </div>
    `;

    // Hook up Travel button
    const travelBtn = card.querySelector(
      ".action-travel",
    ) as HTMLButtonElement | null;
    if (travelBtn) {
      travelBtn.addEventListener("click", () => {
        closeMapModal();
        switchSpace(space.id, space.name);
      });
    }

    // Hook up Edit / Delete buttons for Superadmin
    if (isSuperadmin) {
      const editBtn = card.querySelector(
        ".edit-admin-space",
      ) as HTMLButtonElement | null;
      if (editBtn) {
        editBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          openAdminEditSpaceModal(space);
        });
      }
      const deleteBtn = card.querySelector(
        ".delete-admin-space",
      ) as HTMLButtonElement | null;
      if (deleteBtn) {
        deleteBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          confirmDeleteAdminSpace(space);
        });
      }
    }

    mapSpacesGrid.appendChild(card);
  });
}

/**
 * Switch space during active game session
 */
async function switchSpace(
  newSpaceId: string,
  newSpaceName: string,
  isFallback: boolean = false
) {
  if (currentSpaceId === newSpaceId) return;

  const previousSpaceId = currentSpaceId;
  const previousSpaceName = currentSpaceName;

  exitEditMode();

  topbarStatusSubtitle.textContent = `Traveling...`;

  // Leave previous room
  if (multiplayer) {
    multiplayer.leave();
  }

  // Reset Phaser scene players
  if (gameInstance) {
    const scene = gameInstance.scene.getScene("GameScene") as GameScene;
    if (scene && typeof scene.resetPlayers === "function") {
      scene.resetPlayers();
    }
  }

  currentSpaceId = newSpaceId;
  currentSpaceName = newSpaceName;
  chatMessagesMap.length = 0;
  chatMessagesZone.clear();
  unreadMapCount = 0;
  if (chatMapBadge) {
    chatMapBadge.classList.add("hidden");
  }
  updateTopBarUI();
  renderSpacesList();
  onSpaceChanged(newSpaceName);

  try {
    const effectiveName = getEffectivePlayerName();
    const color = selectedColor;
    const avatars = computeActiveAvatars();

    if (!multiplayer) {
      multiplayer = new MultiplayerManager();
      setupMultiplayerChatListeners(multiplayer);
    }
    initVoiceManager(multiplayer);
    initJukeboxManager(multiplayer);
    setupMultiplayerTypeRaceListeners(multiplayer);

    await multiplayer.joinGame({
      name: effectiveName,
      color,
      avatars,
      spaceId: currentSpaceId,
      token: authToken || undefined,
    });

    if (voiceManager) {
      voiceManager.connectToVoice();
    }

    if (gameInstance) {
      const scene = gameInstance.scene.getScene("GameScene") as GameScene;
      if (scene && typeof scene.respawnCurrentPlayers === "function") {
        scene.respawnCurrentPlayers();
      }
    }

    topbarStatusSubtitle.textContent = "Online";
    topbarStatusDot.style.background = "#10b981";
    await fetchSpaces();
  } catch (err: any) {
    console.error("Failed to switch space:", err);

    if (!isFallback) {
      const fallbackId = previousSpaceId || "space_central_plaza";
      const fallbackName = previousSpaceName || "CO3";

      const rawMsg = err?.message || "";
      const isPrivateOrForbidden =
        rawMsg.toLowerCase().includes("private") ||
        rawMsg.toLowerCase().includes("access denied") ||
        rawMsg.toLowerCase().includes("permission") ||
        rawMsg.toLowerCase().includes("invitation");

      const title = isPrivateOrForbidden ? "Access Denied" : "Unable to Join Space";
      const message = isPrivateOrForbidden
        ? "This space is private and requires permission from the owner to enter."
        : (rawMsg || "Failed to join space. It might be private or require invitation.");

      showSpaceErrorModal(
        title,
        message,
        fallbackName,
        isPrivateOrForbidden ? "🔒" : "⚠️"
      );

      // Lead back to previous space
      await switchSpace(fallbackId, fallbackName, true);
    } else {
      // Fall back to default CO3 if even fallback space failed
      if (currentSpaceId !== "space_central_plaza") {
        await switchSpace("space_central_plaza", "CO3", true);
      }
    }
  }
}

// ==========================================
// My Space Settings Modal & Whitelist
// ==========================================

function openMySpaceSettingsModal() {
  if (!myPersonalSpace) return;

  mySpaceInputName.value = myPersonalSpace.name;
  mySpaceSwitchPublic.checked = myPersonalSpace.isPublic;
  tempMySpaceWhitelist = [...myPersonalSpace.whitelist];

  if (myPersonalSpace.isPublic) {
    mySpaceWhitelistSection.classList.add("hidden");
  } else {
    mySpaceWhitelistSection.classList.remove("hidden");
  }

  renderMySpaceWhitelistTags();
  mySpaceSettingsModal.classList.remove("hidden");
  setGameControlsActive(false);
}

function closeMySpaceSettingsModal() {
  mySpaceSettingsModal.classList.add("hidden");
  setGameControlsActive(true);
}

mySpaceSwitchPublic.addEventListener("change", () => {
  if (mySpaceSwitchPublic.checked) {
    mySpaceWhitelistSection.classList.add("hidden");
  } else {
    mySpaceWhitelistSection.classList.remove("hidden");
  }
});

function renderMySpaceWhitelistTags() {
  mySpaceTagsContainer.innerHTML = "";
  mySpaceTagsCount.textContent = String(tempMySpaceWhitelist.length);

  if (tempMySpaceWhitelist.length === 0) {
    mySpaceTagsContainer.innerHTML = `<span class="whitelist-empty-hint">No users invited yet.</span>`;
    return;
  }

  tempMySpaceWhitelist.forEach((username) => {
    const chip = document.createElement("span");
    chip.className = "whitelist-tag-chip";
    chip.innerHTML = `
      <span>@${escapeHtml(username)}</span>
      <span class="whitelist-tag-chip-remove" data-user="${escapeHtml(username)}" title="Remove">✕</span>
    `;

    const removeBtn = chip.querySelector(
      ".whitelist-tag-chip-remove",
    ) as HTMLElement;
    removeBtn.addEventListener("click", () => {
      tempMySpaceWhitelist = tempMySpaceWhitelist.filter(
        (u) => u.toLowerCase() !== username.toLowerCase(),
      );
      renderMySpaceWhitelistTags();
    });

    mySpaceTagsContainer.appendChild(chip);
  });
}

function addMySpaceInvite() {
  const raw = mySpaceInviteUsername.value.trim();
  if (!raw) return;

  if (!/^[a-zA-Z0-9_]+$/.test(raw)) {
    alert("Username can only contain letters, numbers, and underscores.");
    return;
  }

  if (tempMySpaceWhitelist.some((u) => u.toLowerCase() === raw.toLowerCase())) {
    alert("User is already on the whitelist.");
    return;
  }

  tempMySpaceWhitelist.push(raw);
  mySpaceInviteUsername.value = "";
  renderMySpaceWhitelistTags();
}

btnAddMySpaceInvite.addEventListener("click", addMySpaceInvite);
mySpaceInviteUsername.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    addMySpaceInvite();
  }
});

btnCloseMySpaceSettings.addEventListener("click", closeMySpaceSettingsModal);

mySpaceSettingsForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!authToken) return;

  const newName = mySpaceInputName.value.trim();
  const isPublic = mySpaceSwitchPublic.checked;

  try {
    const res = await fetch(getApiUrl("/api/spaces/my-space"), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: newName,
        isPublic,
        whitelist: tempMySpaceWhitelist,
      }),
    });

    const data: SpaceResponse = await res.json();
    if (res.ok && data.success && data.space) {
      myPersonalSpace = data.space;
      if (currentSpaceId === myPersonalSpace.id) {
        currentSpaceName = myPersonalSpace.name;
      }
      updateTopBarUI();
      closeMySpaceSettingsModal();
      await fetchSpaces();
    } else {
      alert(data.error || "Failed to update space settings.");
    }
  } catch (err) {
    console.error("Error updating personal space:", err);
    alert("Network error updating personal space.");
  }
});

// ==========================================
// Superadmin Create & Edit Space Modal
// ==========================================

function populateCategoryDropdown(selectedCategory?: string) {
  adminSpaceCategorySelect.innerHTML = "";

  const defaultCategories = [
    "Town Square",
    "Hangout Lounges",
    "Gaming Zones",
    "Chill Parks",
    "Events & Arenas",
  ];
  const combined = Array.from(
    new Set([...defaultCategories, ...loadedCategories]),
  );

  combined.forEach((cat) => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    if (
      selectedCategory &&
      cat.toLowerCase() === selectedCategory.toLowerCase()
    ) {
      opt.selected = true;
    }
    adminSpaceCategorySelect.appendChild(opt);
  });

  const customOpt = document.createElement("option");
  customOpt.value = "__custom__";
  customOpt.textContent = "+ Custom Category...";
  adminSpaceCategorySelect.appendChild(customOpt);

  adminSpaceCategoryCustom.classList.add("hidden");
  adminSpaceCategoryCustom.value = "";
}

adminSpaceCategorySelect.addEventListener("change", () => {
  if (adminSpaceCategorySelect.value === "__custom__") {
    adminSpaceCategoryCustom.classList.remove("hidden");
    adminSpaceCategoryCustom.focus();
  } else {
    adminSpaceCategoryCustom.classList.add("hidden");
  }
});

adminSpaceSwitchPublic.addEventListener("change", () => {
  if (adminSpaceSwitchPublic.checked) {
    adminSpaceWhitelistSection.classList.add("hidden");
  } else {
    adminSpaceWhitelistSection.classList.remove("hidden");
  }
});

function renderAdminSpaceWhitelistTags() {
  adminSpaceTagsContainer.innerHTML = "";
  adminSpaceTagsCount.textContent = String(tempAdminSpaceWhitelist.length);

  if (tempAdminSpaceWhitelist.length === 0) {
    adminSpaceTagsContainer.innerHTML = `<span class="whitelist-empty-hint">No users invited yet.</span>`;
    return;
  }

  tempAdminSpaceWhitelist.forEach((username) => {
    const chip = document.createElement("span");
    chip.className = "whitelist-tag-chip";
    chip.innerHTML = `
      <span>@${escapeHtml(username)}</span>
      <span class="whitelist-tag-chip-remove" data-user="${escapeHtml(username)}" title="Remove">✕</span>
    `;

    const removeBtn = chip.querySelector(
      ".whitelist-tag-chip-remove",
    ) as HTMLElement;
    removeBtn.addEventListener("click", () => {
      tempAdminSpaceWhitelist = tempAdminSpaceWhitelist.filter(
        (u) => u.toLowerCase() !== username.toLowerCase(),
      );
      renderAdminSpaceWhitelistTags();
    });

    adminSpaceTagsContainer.appendChild(chip);
  });
}

function addAdminSpaceInvite() {
  const raw = adminSpaceInviteUsername.value.trim();
  if (!raw) return;

  if (!/^[a-zA-Z0-9_]+$/.test(raw)) {
    alert("Username can only contain letters, numbers, and underscores.");
    return;
  }

  if (
    tempAdminSpaceWhitelist.some((u) => u.toLowerCase() === raw.toLowerCase())
  ) {
    alert("User is already on the whitelist.");
    return;
  }

  tempAdminSpaceWhitelist.push(raw);
  adminSpaceInviteUsername.value = "";
  renderAdminSpaceWhitelistTags();
}

btnAddAdminSpaceInvite.addEventListener("click", addAdminSpaceInvite);
adminSpaceInviteUsername.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    addAdminSpaceInvite();
  }
});

function openAdminCreateSpaceModal() {
  adminSpaceModalTitle.textContent = "🌌 Create New Space";
  adminSpaceEditId.value = "";
  adminSpaceName.value = "";
  populateCategoryDropdown();
  adminSpaceSwitchPublic.checked = true;
  adminSpaceWhitelistSection.classList.add("hidden");
  tempAdminSpaceWhitelist = [];
  renderAdminSpaceWhitelistTags();

  adminSpaceModal.classList.remove("hidden");
  setGameControlsActive(false);
  setTimeout(() => adminSpaceName.focus(), 60);
}

function openAdminEditSpaceModal(space: Space) {
  adminSpaceModalTitle.textContent = "⚙️ Edit Space";
  adminSpaceEditId.value = space.id;
  adminSpaceName.value = space.name;
  populateCategoryDropdown(space.category);
  adminSpaceSwitchPublic.checked = space.isPublic;
  if (space.isPublic) {
    adminSpaceWhitelistSection.classList.add("hidden");
  } else {
    adminSpaceWhitelistSection.classList.remove("hidden");
  }
  tempAdminSpaceWhitelist = [...space.whitelist];
  renderAdminSpaceWhitelistTags();

  adminSpaceModal.classList.remove("hidden");
  setGameControlsActive(false);
  setTimeout(() => adminSpaceName.focus(), 60);
}

function closeAdminSpaceModal() {
  adminSpaceModal.classList.add("hidden");
  setGameControlsActive(true);
}

btnCloseAdminSpaceModal.addEventListener("click", closeAdminSpaceModal);

adminSpaceForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!authToken || currentUser?.role !== "superadmin") return;

  const spaceId = adminSpaceEditId.value;
  const name = adminSpaceName.value.trim();

  let category = adminSpaceCategorySelect.value;
  if (category === "__custom__") {
    category = adminSpaceCategoryCustom.value.trim() || "General";
  }

  const isPublic = adminSpaceSwitchPublic.checked;
  const whitelist = isPublic ? [] : tempAdminSpaceWhitelist;

  try {
    let res: Response;
    if (spaceId) {
      // Edit existing
      res = await fetch(getApiUrl(`/api/spaces/${spaceId}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ name, category, isPublic, whitelist }),
      });
    } else {
      // Create new
      res = await fetch(getApiUrl("/api/spaces"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ name, category, isPublic, whitelist }),
      });
    }

    const data = await res.json();
    if (res.ok && data.success) {
      closeAdminSpaceModal();
      await fetchSpaces();
    } else {
      alert(data.error || "Failed to save space.");
    }
  } catch (err) {
    console.error("Error saving admin space:", err);
    alert("Network error saving space.");
  }
});

async function confirmDeleteAdminSpace(space: Space) {
  if (!confirm(`Are you sure you want to delete "${space.name}"?`)) return;

  try {
    const res = await fetch(getApiUrl(`/api/spaces/${space.id}`), {
      method: "DELETE",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json();
    if (res.ok && data.success) {
      if (currentSpaceId === space.id) {
        switchSpace("space_central_plaza", "CO3");
      } else {
        await fetchSpaces();
      }
    } else {
      alert(data.error || "Failed to delete space.");
    }
  } catch (err) {
    console.error("Error deleting space:", err);
  }
}

// ==========================================
// Multiplayer Session & Game Initialization
// ==========================================

async function enterGameSession() {
  const effectiveName = getEffectivePlayerName();
  const color = selectedColor;
  const avatars = computeActiveAvatars();

  if (gameInstance) {
    if (multiplayer) {
      multiplayer.updateProfile(effectiveName, color, avatars || null);
    }
    return;
  }

  topbarStatusSubtitle.textContent = "Connecting to server...";
  const manager = new MultiplayerManager();

  manager.onNetworkStats((stats) => {
    const { pingMs, packetLoss } = stats;
    if (topbarPingStat) {
      topbarPingStat.textContent = `${pingMs} ms`;
    }
    if (topbarLossStat) {
      topbarLossStat.textContent = `${packetLoss}% loss`;
    }
  });

  manager.onConnectionStatus((connected) => {
    if (connected) {
      topbarStatusDot.style.background = "#10b981";
      topbarStatusDot.style.boxShadow = "0 0 6px #10b981";
      topbarStatusSubtitle.textContent = "Online";
    } else {
      topbarStatusDot.style.background = "#ef4444";
      topbarStatusDot.style.boxShadow = "0 0 6px #ef4444";
      topbarStatusSubtitle.textContent = "Disconnected";
      if (topbarPingStat) topbarPingStat.textContent = "-- ms";
      if (topbarLossStat) topbarLossStat.textContent = "-- loss";
      voiceManager?.leaveVoice();
    }
  });

  setupMultiplayerChatListeners(manager);
  updateChatTabNames();
  initVoiceManager(manager);
  initJukeboxManager(manager);
  setupMultiplayerTypeRaceListeners(manager);

  try {
    await manager.joinGame({
      name: effectiveName,
      color,
      avatars,
      spaceId: currentSpaceId,
      token: authToken || undefined,
    });
    multiplayer = manager;

    if (voiceManager) {
      voiceManager.connectToVoice();
    }

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: "game-container",
      backgroundColor: "#ffffff",
      roundPixels: true,
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: window.innerWidth,
        height: window.innerHeight,
      },
      physics: {
        default: "arcade",
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: false,
        },
      },
    };

    gameInstance = new Phaser.Game(config);
    gameInstance.scene.add("GameScene", GameScene, true, {
      multiplayer,
      voiceManager: voiceManager || undefined,
      jukeboxManager: jukeboxManager || undefined,
    });

    // Hook up private zone & jukebox events once scene is loaded
    const bindSceneEvents = () => {
      if (gameInstance) {
        const scene = gameInstance.scene.getScene("GameScene") as GameScene;
        if (scene) {
          if (voiceManager) {
            scene.voiceManager = voiceManager;
          }
          if (jukeboxManager) {
            scene.jukeboxManager = jukeboxManager;
          }
          setupScenePrivateZoneEvents(scene);
          setupSceneJukeboxEvents(scene);
          setupSceneTypewriterEvents(scene);
          setupSceneEditorToolEvents(scene);
        }
      }
    };
    bindSceneEvents();
    setTimeout(bindSceneEvents, 100);
    setTimeout(bindSceneEvents, 400);

    // Initial Spaces fetch & periodic refresh
    await fetchSpaces();
    if (spacesRefreshTimer !== null) clearInterval(spacesRefreshTimer);
    spacesRefreshTimer = window.setInterval(fetchSpaces, 10000);
  } catch (err: any) {
    console.error("Connection or join error:", err);
    multiplayer = null;
    alert(
      "Could not connect to multiplayer server. Please ensure the backend is running!",
    );
    openAuthModal("login");
  }
}

// Window Resize Handler
window.addEventListener("resize", () => {
  if (gameInstance) {
    gameInstance.scale.resize(window.innerWidth, window.innerHeight);
  }
});

function setupHudControlBadges() {
  const badges = document.querySelectorAll<HTMLElement>(
    ".controls-hint .key-badge",
  );
  badges.forEach((badge) => {
    const dir = badge.dataset.dir as
      | "up"
      | "down"
      | "left"
      | "right"
      | undefined;
    if (!dir) return;

    badge.style.cursor = "pointer";
    badge.style.userSelect = "none";

    let isHolding = false;
    let holdTimer: any = null;

    const startMove = (e: Event) => {
      e.preventDefault();
      isHolding = true;
      clearTimeout(holdTimer);
      if (gameInstance) {
        const scene = gameInstance.scene.getScene("GameScene") as any;
        if (scene && scene.virtualInput) {
          scene.virtualInput[dir] = true;
        }
      }
    };

    const stopMove = (e: Event) => {
      e.preventDefault();
      if (isHolding) {
        isHolding = false;
        holdTimer = setTimeout(() => {
          if (!isHolding && gameInstance) {
            const scene = gameInstance.scene.getScene("GameScene") as any;
            if (scene && scene.virtualInput) {
              scene.virtualInput[dir] = false;
            }
          }
        }, 400);
      }
    };

    badge.addEventListener("pointerdown", startMove);
    badge.addEventListener("pointerup", stopMove);
    badge.addEventListener("pointercancel", stopMove);
    badge.addEventListener("mouseleave", stopMove);

    badge.addEventListener("click", (e) => {
      e.preventDefault();
      if (gameInstance) {
        const scene = gameInstance.scene.getScene("GameScene") as any;
        if (scene && scene.virtualInput) {
          scene.virtualInput[dir] = true;
          setTimeout(() => {
            if (!isHolding) scene.virtualInput[dir] = false;
          }, 450);
        }
      }
    });
  });
}

// App Initialization
async function init() {
  setupColorSwatches();
  setupMapEditorColorPicker();
  setupMapEditorDecorationControls();
  setupMapEditorAccordions();
  setupUploadSlots();
  setupHudControlBadges();

  const savedColor = localStorage.getItem("player_color");
  const savedSwitch = localStorage.getItem("player_upload_switch");

  if (savedColor) {
    selectColor(savedColor);
  } else {
    selectColor(selectedColor);
  }

  const slots: DirectionSlot[] = ["idle", "left", "right", "up", "down"];
  const savedFramesStr = localStorage.getItem("player_avatar_frames");
  if (savedFramesStr) {
    try {
      const parsed = JSON.parse(savedFramesStr);
      slots.forEach((s) => {
        if (Array.isArray(parsed[s]) && parsed[s].length > 0) {
          uploadedFrames[s] = parsed[s].slice(0, MAX_AVATAR_FRAMES);
        } else {
          uploadedFrames[s] = [...DEFAULT_AVATARS[s]];
        }
      });
    } catch (e) {
      console.warn("Error parsing saved avatar frames:", e);
      slots.forEach((s) => {
        uploadedFrames[s] = [...DEFAULT_AVATARS[s]];
      });
    }
  } else {
    // Default to male sprite assets with all movements
    slots.forEach((s) => {
      uploadedFrames[s] = [...DEFAULT_AVATARS[s]];
    });
  }
  slots.forEach((s) => renderSlotFrames(s));

  if (savedSwitch === "true") {
    switchUploadPictures.checked = true;
    defaultCharacterSection?.classList.add("hidden");
    uploadPicturesSection.classList.remove("hidden");
  } else {
    switchUploadPictures.checked = false;
    defaultCharacterSection?.classList.remove("hidden");
    uploadPicturesSection.classList.add("hidden");
  }

  // Initialize Chat UI state
  updateChatTabNames();
  renderCurrentChatMessages();

  // Initialize YouTube Jukebox UI listeners
  initJukeboxUI();

  // Check stored auth session
  const storedToken = localStorage.getItem("lepark_auth_token");
  if (storedToken) {
    try {
      const res = await fetch(getApiUrl("/api/auth/me"), {
        headers: { Authorization: `Bearer ${storedToken}` },
      });
      const data: AuthResponse = await res.json();
      if (res.ok && data.success && data.user) {
        authToken = storedToken;
        currentUser = data.user;
        closeAuthModal();
        await enterGameSession();
        return;
      }
    } catch (err) {
      console.warn("Could not verify saved session token:", err);
    }
    // Stale token
    localStorage.removeItem("lepark_auth_token");
    localStorage.removeItem("lepark_auth_user");
  }

  // Not authenticated: Show Auth Modal
  openAuthModal("login");
}

init();
