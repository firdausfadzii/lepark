import Phaser from "phaser";
import { MultiplayerManager } from "./network/MultiplayerManager";
import { GameScene, InspectableMapItem } from "./scenes/GameScene";
import { OFFICE_ONE_DECORATION_ASSETS } from "./officeOneAssets";
import { OFFICE_TWO_DECORATION_ASSETS } from "./officeTwoAssets";
import { hydrateEditorAssetThumbnails, resolveAssetThumbnailUrl } from "./atlasThumbnails";
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
  AshtrayState,
  SmokingGameRoomState,
  ChessBoardState,
  ChessLobbyState,
  ChessGameState,
  ChessGameSummary,
  ThrowBattleState,
  isWallAsset,
  isOverlayWallAsset,
  isOverlayFloorAsset,
  isFreeformAsset,
  DECORATION_INTERACTIONS,
  DecorationInteractionType,
} from "shared";
import { VoiceManager, VoiceError } from "./network/VoiceManager";
import { JukeboxManager } from "./audio/JukeboxManager";
import { FishingGame } from "./fishing/FishingGame";
import { ThrowBattleGame } from "./battle/ThrowBattleGame";
import { Chess } from "chess.js";

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
const dropdownEditSpaceBtn = document.getElementById(
  "dropdown-edit-space-btn",
) as HTMLButtonElement | null;
const dropdownEditMapBtn = document.getElementById(
  "dropdown-edit-map-btn",
) as HTMLButtonElement | null;
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
const mapEditorTileOptionsSidebar = document.getElementById(
  "map-editor-tile-options-sidebar",
) as HTMLElement | null;
const tileOptionsControls = document.getElementById(
  "tile-options-controls",
) as HTMLElement | null;
const tileOptionsName = document.getElementById(
  "tile-options-name",
) as HTMLElement | null;
const tileOptionsCategory = document.getElementById(
  "tile-options-category",
) as HTMLElement | null;
const tileOptionsPreviewImg = document.getElementById(
  "tile-options-preview-img",
) as HTMLImageElement | null;
const tileOptionsPreviewPlaceholder = document.getElementById(
  "tile-options-preview-placeholder",
) as HTMLElement | null;
const tileOptPassableSwitch = document.getElementById(
  "tile-opt-passable-switch",
) as HTMLInputElement | null;
const tileOptPassableHint = document.getElementById(
  "tile-opt-passable-hint",
) as HTMLElement | null;
const tileOptRenderLayer = document.getElementById(
  "tile-opt-render-layer",
) as HTMLSelectElement | null;
const btnTileOptLayerDown = document.getElementById(
  "btn-tile-opt-layer-down",
) as HTMLButtonElement | null;
const btnTileOptLayerUp = document.getElementById(
  "btn-tile-opt-layer-up",
) as HTMLButtonElement | null;
const tileOptLayerValue = document.getElementById(
  "tile-opt-layer-value",
) as HTMLElement | null;
const tileOptFlipXSwitch = document.getElementById(
  "tile-opt-flip-x-switch",
) as HTMLInputElement | null;
const tileOptFlipXHint = document.getElementById(
  "tile-opt-flip-x-hint",
) as HTMLElement | null;

// Top Bar Right Actions (Map) & Parking Points & Bottom-Left Ping
const btnOpenMap = document.getElementById("btn-open-map") as HTMLButtonElement;
const topbarParkingPoints = document.getElementById(
  "topbar-parking-points",
) as HTMLElement | null;
const dropdownParkingPointsVal = document.getElementById(
  "dropdown-parking-points-val",
) as HTMLElement | null;

function updateParkingPointsDisplay(points: number) {
  const label = `${points} Parking`;
  if (topbarParkingPoints) {
    topbarParkingPoints.textContent = label;
  }
  if (dropdownParkingPointsVal) {
    dropdownParkingPointsVal.textContent = label;
  }
}
const topbarPingStat = document.getElementById(
  "topbar-ping-stat",
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
) as HTMLInputElement | null;
const defaultCharacterSection = document.getElementById(
  "default-character-section",
) as HTMLDivElement | null;
const uploadPicturesSection = document.getElementById(
  "upload-pictures-section",
) as HTMLDivElement | null;

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
const btnPlayerMenuThrowBattle = document.getElementById("btn-player-menu-throw-battle") as HTMLButtonElement | null;

// Throw Battle Modals & Canvas DOM Elements
const throwBattleSetupModal = document.getElementById("throw-battle-setup-modal") as HTMLDivElement | null;
const tbSetupTargetName = document.getElementById("tb-setup-target-name");
const inputTbHits = document.getElementById("input-tb-hits") as HTMLInputElement | null;
const tbHitsPresets = document.getElementById("tb-hits-presets");
const btnTbCancelSetup = document.getElementById("btn-tb-cancel-setup") as HTMLButtonElement | null;
const btnTbConfirmChallenge = document.getElementById("btn-tb-confirm-challenge") as HTMLButtonElement | null;

const throwBattleInviteModal = document.getElementById("throw-battle-invite-modal") as HTMLDivElement | null;
const btnTbRejectInvite = document.getElementById("btn-tb-reject-invite") as HTMLButtonElement | null;
const btnTbAcceptInvite = document.getElementById("btn-tb-accept-invite") as HTMLButtonElement | null;
const tbInviteChallengerName = document.getElementById("tb-invite-challenger-name");

const throwBattleWaitingModal = document.getElementById("throw-battle-waiting-modal") as HTMLDivElement | null;
const btnTbCancelChallenge = document.getElementById("btn-tb-cancel-challenge") as HTMLButtonElement | null;
const tbWaitingText = document.getElementById("tb-waiting-text");

const throwBattleModal = document.getElementById("throw-battle-modal") as HTMLDivElement | null;
const btnCloseThrowBattle = document.getElementById("btn-close-throw-battle") as HTMLButtonElement | null;
const btnTbRematch = document.getElementById("btn-tb-rematch") as HTMLButtonElement | null;
const btnTbExit = document.getElementById("btn-tb-exit") as HTMLButtonElement | null;
const throwBattleCanvas = document.getElementById("throw-battle-canvas") as HTMLCanvasElement | null;

let activeThrowBattleGame: ThrowBattleGame | null = null;
let pendingChallengeTargetSessionId: string | null = null;
let pendingInviteChallengerSessionId: string | null = null;


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
const btnJukeboxPlayPause = document.getElementById("btn-jukebox-play-pause") as HTMLButtonElement | null;
const btnJukeboxPlayPauseIcon = document.getElementById("btn-jukebox-play-pause-icon") as HTMLSpanElement | null;
const btnJukeboxPlayPauseText = document.getElementById("btn-jukebox-play-pause-text") as HTMLSpanElement | null;
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
const btnJukeboxClearList = document.getElementById("btn-jukebox-clear-list") as HTMLButtonElement | null;
const jukeboxBulkToolbar = document.getElementById("jukebox-bulk-toolbar") as HTMLDivElement | null;
const jukeboxSelectAllCheckbox = document.getElementById("jukebox-select-all-checkbox") as HTMLInputElement | null;
const jukeboxSelectedCount = document.getElementById("jukebox-selected-count") as HTMLSpanElement | null;
const btnJukeboxBulkUp = document.getElementById("btn-jukebox-bulk-up") as HTMLButtonElement | null;
const btnJukeboxBulkDown = document.getElementById("btn-jukebox-bulk-down") as HTMLButtonElement | null;
const btnJukeboxBulkDelete = document.getElementById("btn-jukebox-bulk-delete") as HTMLButtonElement | null;
const selectedJukeboxTrackIds = new Set<string>();

const jukeboxHudPill = document.getElementById("jukebox-hud-pill") as HTMLDivElement | null;
const jukeboxHudTrackTitle = document.getElementById("jukebox-hud-track-title") as HTMLSpanElement | null;
const jukeboxHudTrackSub = document.getElementById("jukebox-hud-track-sub") as HTMLSpanElement | null;
const btnJukeboxHudMute = document.getElementById("btn-jukebox-hud-mute") as HTMLButtonElement | null;

// Jukebox Video Frame Elements in Modal
const jukeboxVideoPlaceholder = document.getElementById("jukebox-video-placeholder") as HTMLDivElement | null;
const jukeboxPlayerBody = document.getElementById("jukebox-player-body") as HTMLDivElement | null;
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
    const atModal = document.getElementById("ashtray-modal");
    if (atModal && !atModal.classList.contains("hidden")) {
      return;
    }
    const twModal = document.getElementById("typerace-modal");
    if (twModal && !twModal.classList.contains("hidden")) {
      return;
    }
    const aqModal = document.getElementById("aquarium-modal");
    if (aqModal && !aqModal.classList.contains("hidden")) {
      return;
    }
    const tbModal = document.getElementById("throw-battle-modal");
    if (tbModal && !tbModal.classList.contains("hidden")) {
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
    localStorage.setItem("player_sprite_template", "default");
    selectedTemplateId = "default";
    setupSpriteTemplates();
    if (switchUploadPictures) switchUploadPictures.checked = false;
    defaultCharacterSection?.classList.remove("hidden");
    uploadPicturesSection?.classList.add("hidden");

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
    setupSpriteTemplates();

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
  localStorage.removeItem("player_unlocked_skins");
  currentUser = null;
  authToken = null;
  myPersonalSpace = null;
  loadedSpaces = [];
  loadedCategories = [];

  topbarStatusDot.style.background = "#ef4444";
  topbarStatusDot.style.boxShadow = "0 0 6px #ef4444";
  topbarStatusSubtitle.textContent = "Offline";
  if (topbarPingStat) topbarPingStat.textContent = "-- ms";
  if (btnMapSettings) btnMapSettings.classList.add("hidden");
  if (btnEditMap) btnEditMap.classList.add("hidden");
  if (dropdownEditSpaceBtn) dropdownEditSpaceBtn.classList.add("hidden");
  if (dropdownEditMapBtn) dropdownEditMapBtn.classList.add("hidden");
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

// Sprite Templates Definition
interface SpriteTemplate {
  id: string;
  name: string;
  cost?: number;
  idleFrames: string[];
  directionalFrames?: PlayerAvatars;
}

const SPRITE_TEMPLATES: SpriteTemplate[] = [
  {
    id: "default",
    name: "Default",
    idleFrames: [
      "/assets/sprites/default/sprite1.png",
      "/assets/sprites/default/sprite2.png",
      "/assets/sprites/default/sprite3.png",
      "/assets/sprites/default/sprite4.png",
    ],
  },
  {
    id: "slime",
    name: "Slime",
    idleFrames: [
      "/assets/sprites/slime/sprite-1-1.png",
      "/assets/sprites/slime/sprite-1-2.png",
      "/assets/sprites/slime/sprite-1-3.png",
      "/assets/sprites/slime/sprite-1-4.png",
      "/assets/sprites/slime/sprite-1-5.png",
      "/assets/sprites/slime/sprite-1-6.png",
    ],
    directionalFrames: {
      idle: [
        "/assets/sprites/slime/sprite-1-1.png",
        "/assets/sprites/slime/sprite-1-2.png",
        "/assets/sprites/slime/sprite-1-3.png",
        "/assets/sprites/slime/sprite-1-4.png",
        "/assets/sprites/slime/sprite-1-5.png",
        "/assets/sprites/slime/sprite-1-6.png",
      ],
      down: [
        "/assets/sprites/slime/sprite-1-1.png",
        "/assets/sprites/slime/sprite-1-2.png",
        "/assets/sprites/slime/sprite-1-3.png",
        "/assets/sprites/slime/sprite-1-4.png",
        "/assets/sprites/slime/sprite-1-5.png",
        "/assets/sprites/slime/sprite-1-6.png",
      ],
      left: [
        "/assets/sprites/slime/sprite-3-1.png",
        "/assets/sprites/slime/sprite-3-2.png",
        "/assets/sprites/slime/sprite-3-3.png",
        "/assets/sprites/slime/sprite-3-4.png",
        "/assets/sprites/slime/sprite-3-5.png",
        "/assets/sprites/slime/sprite-3-6.png",
      ],
      right: [
        "/assets/sprites/slime/sprite-4-1.png",
        "/assets/sprites/slime/sprite-4-2.png",
        "/assets/sprites/slime/sprite-4-3.png",
        "/assets/sprites/slime/sprite-4-4.png",
        "/assets/sprites/slime/sprite-4-5.png",
        "/assets/sprites/slime/sprite-4-6.png",
      ],
      up: [
        "/assets/sprites/slime/sprite-2-1.png",
        "/assets/sprites/slime/sprite-2-2.png",
        "/assets/sprites/slime/sprite-2-3.png",
        "/assets/sprites/slime/sprite-2-4.png",
        "/assets/sprites/slime/sprite-2-5.png",
        "/assets/sprites/slime/sprite-2-6.png",
      ],
    },
  },
  {
    id: "ghost_slime",
    name: "Ghost Slime",
    cost: 10,
    idleFrames: [
      "/assets/sprites/ghost_slime/sprite-1-1.png",
      "/assets/sprites/ghost_slime/sprite-1-2.png",
      "/assets/sprites/ghost_slime/sprite-1-3.png",
      "/assets/sprites/ghost_slime/sprite-1-4.png",
      "/assets/sprites/ghost_slime/sprite-1-5.png",
      "/assets/sprites/ghost_slime/sprite-1-6.png",
      "/assets/sprites/ghost_slime/sprite-1-7.png",
      "/assets/sprites/ghost_slime/sprite-1-8.png",
    ],
    directionalFrames: {
      idle: [
        "/assets/sprites/ghost_slime/sprite-1-1.png",
        "/assets/sprites/ghost_slime/sprite-1-2.png",
        "/assets/sprites/ghost_slime/sprite-1-3.png",
        "/assets/sprites/ghost_slime/sprite-1-4.png",
        "/assets/sprites/ghost_slime/sprite-1-5.png",
        "/assets/sprites/ghost_slime/sprite-1-6.png",
        "/assets/sprites/ghost_slime/sprite-1-7.png",
        "/assets/sprites/ghost_slime/sprite-1-8.png",
      ],
      down: [
        "/assets/sprites/ghost_slime/sprite-1-1.png",
        "/assets/sprites/ghost_slime/sprite-1-2.png",
        "/assets/sprites/ghost_slime/sprite-1-3.png",
        "/assets/sprites/ghost_slime/sprite-1-4.png",
        "/assets/sprites/ghost_slime/sprite-1-5.png",
        "/assets/sprites/ghost_slime/sprite-1-6.png",
        "/assets/sprites/ghost_slime/sprite-1-7.png",
        "/assets/sprites/ghost_slime/sprite-1-8.png",
      ],
      up: [
        "/assets/sprites/ghost_slime/sprite-2-1.png",
        "/assets/sprites/ghost_slime/sprite-2-2.png",
        "/assets/sprites/ghost_slime/sprite-2-4.png",
        "/assets/sprites/ghost_slime/sprite-2-6.png",
        "/assets/sprites/ghost_slime/sprite-2-8.png",
        "/assets/sprites/ghost_slime/sprite-2-9.png",
        "/assets/sprites/ghost_slime/sprite-2-10.png",
        "/assets/sprites/ghost_slime/sprite-2-11.png",
      ],
      left: [
        "/assets/sprites/ghost_slime/sprite-3-1.png",
        "/assets/sprites/ghost_slime/sprite-3-3.png",
        "/assets/sprites/ghost_slime/sprite-3-5.png",
        "/assets/sprites/ghost_slime/sprite-3-6.png",
        "/assets/sprites/ghost_slime/sprite-3-8.png",
        "/assets/sprites/ghost_slime/sprite-3-9.png",
        "/assets/sprites/ghost_slime/sprite-3-10.png",
        "/assets/sprites/ghost_slime/sprite-3-11.png",
      ],
      right: [
        "/assets/sprites/ghost_slime/sprite-4-1.png",
        "/assets/sprites/ghost_slime/sprite-4-3.png",
        "/assets/sprites/ghost_slime/sprite-4-5.png",
        "/assets/sprites/ghost_slime/sprite-4-7.png",
        "/assets/sprites/ghost_slime/sprite-4-8.png",
        "/assets/sprites/ghost_slime/sprite-4-10.png",
        "/assets/sprites/ghost_slime/sprite-4-11.png",
        "/assets/sprites/ghost_slime/sprite-4-12.png",
      ],
    },
  },
];

let selectedTemplateId = localStorage.getItem("player_sprite_template") || "default";

function isTemplateUnlocked(templateId: string): boolean {
  const tpl = SPRITE_TEMPLATES.find((t) => t.id === templateId);
  if (!tpl) return false;
  if (!tpl.cost || tpl.cost <= 0) return true;

  if (currentUser && Array.isArray(currentUser.unlockedSkins)) {
    if (currentUser.unlockedSkins.includes(templateId)) return true;
  }

  try {
    const local = JSON.parse(localStorage.getItem("player_unlocked_skins") || "[]");
    if (Array.isArray(local) && local.includes(templateId)) {
      return true;
    }
  } catch {
    // ignore
  }

  return false;
}

function getActiveTemplate(): SpriteTemplate {
  const tpl = SPRITE_TEMPLATES.find((t) => t.id === selectedTemplateId);
  if (tpl && isTemplateUnlocked(tpl.id)) {
    return tpl;
  }
  return SPRITE_TEMPLATES[0];
}

function renderSpriteTemplatesGrid() {
  const grid = document.getElementById("sprite-templates-grid");
  const countBadge = document.getElementById("badge-template-count");
  if (countBadge) {
    countBadge.textContent = `${SPRITE_TEMPLATES.length} Available`;
  }
  if (!grid) return;

  grid.innerHTML = "";

  SPRITE_TEMPLATES.forEach((tpl) => {
    const isUnlocked = isTemplateUnlocked(tpl.id);
    const isActive = tpl.id === selectedTemplateId && isUnlocked;
    const isLocked = !isUnlocked;

    const card = document.createElement("div");
    card.className = `sprite-template-card ${isActive ? "active" : ""} ${isLocked ? "locked" : ""}`;
    card.setAttribute("data-template-id", tpl.id);
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.title = isLocked
      ? `${tpl.name} (Locked - Requires ${tpl.cost} Parking Points)`
      : `${tpl.name} Sprite`;

    const initialImg = tpl.idleFrames[0] || "/assets/sprites/default/sprite1.png";

    const badgeHtml = isLocked
      ? `<span class="template-card-lock-badge" title="${tpl.cost} Parking Points Required">🔒 ${tpl.cost}</span>`
      : `<span class="template-card-check">✓</span>`;

    const statusText = isActive
      ? "Active"
      : isLocked
      ? `🔒 ${tpl.cost} pts`
      : "Select";

    card.innerHTML = `
      ${badgeHtml}
      <div class="template-preview-box">
        <img id="template-anim-${tpl.id}" class="template-idle-img ${isLocked ? "locked-preview" : ""}" src="${initialImg}" alt="${tpl.name} Sprite" />
      </div>
      <span class="template-card-name">${escapeHtml(tpl.name)}</span>
      <span class="template-card-status ${isLocked ? "status-locked" : ""}">${statusText}</span>
    `;

    card.addEventListener("click", () => {
      if (isLocked) {
        handleUnlockTemplate(tpl);
      } else {
        selectSpriteTemplate(tpl.id);
      }
    });

    grid.appendChild(card);
  });
}

async function handleUnlockTemplate(tpl: SpriteTemplate) {
  if (!currentUser) return;
  const cost = tpl.cost || 10;
  const currentPoints = currentUser?.parkingPoints ?? 0;

  if (currentPoints < cost) {
    alert(
      `🔒 ${tpl.name} requires ${cost} parking points to unlock.\n\nYou currently have ${currentPoints} parking points. Stay online in Lepark to earn more parking points!`
    );
    return;
  }

  const confirmed = confirm(
    `✨ Unlock ${tpl.name} for ${cost} parking points?\n\nYou currently have ${currentPoints} parking points. After unlocking, you will have ${currentPoints - cost} points remaining.`
  );

  if (!confirmed) return;

  try {
    let unlockSuccess = false;
    let newPoints = currentPoints - cost;
    let unlockedList: string[] = [];

    if (authToken) {
      const res = await fetch(getApiUrl("/api/skins/unlock"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ skinId: tpl.id }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Failed to unlock sprite template.");
        return;
      }

      unlockSuccess = true;
      newPoints = typeof data.points === "number" ? data.points : currentPoints - cost;
      unlockedList = data.unlockedSkins || [];
    } else {
      unlockSuccess = true;
      unlockedList = [tpl.id];
    }

    if (unlockSuccess) {
      // Update currentUser
      if (currentUser) {
        currentUser.parkingPoints = newPoints;
        if (!currentUser.unlockedSkins) currentUser.unlockedSkins = [];
        if (!currentUser.unlockedSkins.includes(tpl.id)) {
          currentUser.unlockedSkins.push(tpl.id);
        }
        try {
          localStorage.setItem("lepark_auth_user", JSON.stringify(currentUser));
        } catch {}
      }

      // Update local storage unlocked skins
      try {
        const localUnlocked: string[] = JSON.parse(localStorage.getItem("player_unlocked_skins") || "[]");
        if (!localUnlocked.includes(tpl.id)) {
          localUnlocked.push(tpl.id);
          localStorage.setItem("player_unlocked_skins", JSON.stringify(localUnlocked));
        }
      } catch {}

      // Update topbar UI
      updateParkingPointsDisplay(newPoints);

      // Re-render templates grid & select the newly unlocked template
      renderSpriteTemplatesGrid();
      selectSpriteTemplate(tpl.id);

      // Auto update character in multiplayer if connected
      const avatars = computeActiveAvatars();
      if (multiplayer) {
        multiplayer.updateProfile(getEffectivePlayerName(), selectedColor, avatars || null);
      }

      alert(`🎉 Congratulations! You have unlocked ${tpl.name}! It is now equipped as your character.`);
    }
  } catch (err: any) {
    console.error("Error unlocking sprite template:", err);
    alert("Network error while unlocking sprite template.");
  }
}

function selectSpriteTemplate(templateId: string) {
  const resolvedId = isTemplateUnlocked(templateId) ? templateId : SPRITE_TEMPLATES[0].id;
  const targetTpl = SPRITE_TEMPLATES.find((t) => t.id === resolvedId) || SPRITE_TEMPLATES[0];
  selectedTemplateId = targetTpl.id;
  try {
    localStorage.setItem("player_sprite_template", selectedTemplateId);
  } catch (err) {
    console.warn("Could not save sprite template:", err);
  }

  const cards = document.querySelectorAll<HTMLElement>(".sprite-template-card");
  cards.forEach((card) => {
    const tplId = card.getAttribute("data-template-id");
    const statusSpan = card.querySelector(".template-card-status");
    if (tplId === selectedTemplateId) {
      card.classList.add("active");
      if (statusSpan) statusSpan.textContent = "Active";
    } else {
      card.classList.remove("active");
      if (statusSpan && !card.classList.contains("locked")) statusSpan.textContent = "Select";
    }
  });

  updatePreview();
}

function setupSpriteTemplates() {
  renderSpriteTemplatesGrid();
  selectSpriteTemplate(selectedTemplateId);
}

function updateTemplateGridAnimations() {
  SPRITE_TEMPLATES.forEach((tpl) => {
    if (tpl.idleFrames && tpl.idleFrames.length > 0) {
      const img = document.getElementById(`template-anim-${tpl.id}`) as HTMLImageElement | null;
      if (img) {
        const frame = tpl.idleFrames[previewFrameIndex % tpl.idleFrames.length];
        if (img.src !== frame && !img.src.endsWith(frame)) {
          img.src = frame;
        }
      }
    }
  });
}

function startPreviewAnimation() {
  if (previewAnimTimer !== null) return;
  previewAnimTimer = window.setInterval(() => {
    previewFrameIndex++;
    updatePreviewFrame();
    updateTemplateGridAnimations();
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
  const isSwitchOn = switchUploadPictures ? switchUploadPictures.checked : false;

  if (isSwitchOn && uploadedFrames.idle.length > 0) {
    const currentImg = uploadedFrames.idle[previewFrameIndex % uploadedFrames.idle.length];
    if (previewAvatar) previewAvatar.src = currentImg;
    if (previewStatusHint) {
      previewStatusHint.textContent = `Custom character (idle)`;
      previewStatusHint.classList.remove("hidden");
    }
  } else {
    // Selected template still idle preview animation
    const tpl = getActiveTemplate();
    const frames = tpl.idleFrames.length > 0 ? tpl.idleFrames : DEFAULT_AVATARS.idle;
    const currentImg = frames[previewFrameIndex % frames.length];
    if (previewAvatar) previewAvatar.src = currentImg;

    if (previewStatusHint) {
      previewStatusHint.textContent = `${tpl.name} character (idle)`;
      previewStatusHint.classList.remove("hidden");
    }
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

switchUploadPictures?.addEventListener("change", () => {
  if (switchUploadPictures.checked) {
    defaultCharacterSection?.classList.add("hidden");
    uploadPicturesSection?.classList.remove("hidden");
  } else {
    defaultCharacterSection?.classList.remove("hidden");
    uploadPicturesSection?.classList.add("hidden");
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
  selectSpriteTemplate(selectedTemplateId);
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
  const isSwitchOn = switchUploadPictures ? switchUploadPictures.checked : false;
  if (isSwitchOn && uploadedFrames.idle.length > 0) {
    // Check if actual custom base64 frames exist
    const slots: DirectionSlot[] = ["idle", "left", "right", "up", "down"];
    const hasCustomFrames = slots.some((s) =>
      uploadedFrames[s].some((f) => typeof f === "string" && f.startsWith("data:image/"))
    );
    if (hasCustomFrames) {
      const idle = uploadedFrames.idle.filter((f) => typeof f === "string" && f.startsWith("data:image/"));
      if (idle.length > 0) {
        return {
          idle,
          left: uploadedFrames.left.length > 0 ? uploadedFrames.left : idle,
          right: uploadedFrames.right.length > 0 ? uploadedFrames.right : idle,
          up: uploadedFrames.up.length > 0 ? uploadedFrames.up : idle,
          down: uploadedFrames.down.length > 0 ? uploadedFrames.down : idle,
        };
      }
    }
  }

  // Active sprite template branch (e.g. Slime)
  const tpl = getActiveTemplate();
  if (tpl && tpl.directionalFrames) {
    return tpl.directionalFrames;
  }

  // Default character template uses built-in atlas
  return undefined;
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
      switchUploadPictures ? (switchUploadPictures.checked ? "true" : "false") : "false",
    );
    localStorage.setItem("player_sprite_template", selectedTemplateId);
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

function openCurrentSpaceSettings() {
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
}

// Top-Left Map Settings Click Handler
if (btnMapSettings) {
  btnMapSettings.addEventListener("click", () => {
    openCurrentSpaceSettings();
  });
}

// Mobile Profile Dropdown: Edit Space Info & Edit Map
if (dropdownEditSpaceBtn) {
  dropdownEditSpaceBtn.addEventListener("click", () => {
    closeProfileDropdown();
    openCurrentSpaceSettings();
  });
}

if (dropdownEditMapBtn) {
  dropdownEditMapBtn.addEventListener("click", () => {
    closeProfileDropdown();
    toggleEditMode();
  });
}

// ==========================================
// Map Editor Logic & Controls
// ==========================================

let isEditModeActive = false;
let isEditorUIHidden = false;
let currentSelectedAssetId = "";
let currentSelectedAssetName = "No Asset Selected";
let placingToastFadeTimeout: any = null;

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

function switchAssetGroupTab(categoryGroup: HTMLElement, groupName: string) {
  const groupBtns = categoryGroup.querySelectorAll<HTMLButtonElement>(
    ".editor-group-tab-btn[data-asset-group-tab]"
  );
  groupBtns.forEach((btn) => {
    const isActive = btn.dataset.assetGroupTab === groupName;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-selected", String(isActive));
  });

  const groupPanels = categoryGroup.querySelectorAll<HTMLElement>(
    ".editor-group-panel[data-asset-group-panel]"
  );
  groupPanels.forEach((panel) => {
    const isActive = panel.dataset.assetGroupPanel === groupName;
    panel.classList.toggle("active-group-panel", isActive);
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

  // 1b. Asset group sub-tabs navigation (e.g., "Free", future "Pet Shop", "Cafeteria Shop")
  const groupTabBtns = document.querySelectorAll<HTMLButtonElement>(
    "#map-editor-sidebar .editor-group-tab-btn[data-asset-group-tab]"
  );
  groupTabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const groupName = btn.dataset.assetGroupTab;
      const categoryGroup = btn.closest<HTMLElement>(".editor-category-group");
      if (groupName && categoryGroup) {
        switchAssetGroupTab(categoryGroup, groupName);
      }
    });
  });

  // 1c. Bottom bar Expand / Collapse toggle
  const btnExpandMapEditor = document.getElementById("btn-expand-map-editor");
  const expandLabelEl = btnExpandMapEditor?.querySelector<HTMLElement>(".editor-expand-label");
  if (btnExpandMapEditor && mapEditorSidebar) {
    btnExpandMapEditor.addEventListener("click", () => {
      const isExpanded = mapEditorSidebar.classList.toggle("expanded");
      btnExpandMapEditor.setAttribute("aria-expanded", String(isExpanded));
      btnExpandMapEditor.setAttribute(
        "aria-label",
        isExpanded ? "Collapse Map Editor bar" : "Expand Map Editor bar"
      );
      if (expandLabelEl) {
        expandLabelEl.textContent = isExpanded ? "Collapse" : "Expand";
      }
    });
  }

  // 2. Right Tile Options Sidebar Hide & Expand controls
  const rightHeader = document.getElementById("right-sidebar-header-toggle");
  const btnToggleRight = document.getElementById("btn-toggle-right-sidebar");
  const btnExpandRight = document.getElementById("btn-expand-right-sidebar");

  const setRightSidebarCollapsed = (collapsed: boolean) => {
    if (!mapEditorTileOptionsSidebar) return;
    mapEditorTileOptionsSidebar.classList.toggle("collapsed", collapsed);
    if (rightHeader) {
      rightHeader.setAttribute("aria-expanded", String(!collapsed));
    }
  };

  if (btnToggleRight) {
    btnToggleRight.addEventListener("click", (e) => {
      e.stopPropagation();
      const isNowCollapsed = !mapEditorTileOptionsSidebar?.classList.contains("collapsed");
      setRightSidebarCollapsed(isNowCollapsed);
    });
  }

  if (btnExpandRight) {
    btnExpandRight.addEventListener("click", (e) => {
      e.stopPropagation();
      setRightSidebarCollapsed(false);
    });
  }

  if (rightHeader) {
    rightHeader.addEventListener("click", () => {
      const isNowCollapsed = !mapEditorTileOptionsSidebar?.classList.contains("collapsed");
      setRightSidebarCollapsed(isNowCollapsed);
    });
  }
}

function getSelectedPlacementTileInfo(): {
  active: boolean;
  name: string;
  category: string;
  assetId: string;
  passable: boolean;
  ontop: boolean;
  layer: number;
  flipX: boolean;
} {
  // 1. Inspected existing item on map
  if (activeEditorContextMenuItem && gameInstance) {
    const scene = gameInstance.scene.getScene("GameScene") as GameScene;
    const opts = scene?.getItemTileOptions?.(activeEditorContextMenuItem);
    if (opts) {
      return {
        active: true,
        name: activeEditorContextMenuItem.label || "Map Tile",
        category: activeEditorContextMenuItem.categoryLabel || "Tile",
        assetId: "",
        passable: opts.passable,
        ontop: opts.ontop,
        layer: opts.layer,
        flipX: opts.flipX,
      };
    }
  }

  // 2. Active placement tool (flooring, wall, decoration, freeform, interactive items)
  if (activeEditorTool === "flooring" && currentSelectedAssetId) {
    const isWall = isWallAsset(currentSelectedAssetId) || isOverlayWallAsset(currentSelectedAssetId);
    return {
      active: true,
      name: currentSelectedAssetName || currentSelectedAssetId,
      category: isWall ? "Wall" : "Flooring",
      assetId: currentSelectedAssetId,
      passable: !isObstacleEnabled,
      ontop: isDecorationOntop,
      layer: currentPlacementLayer,
      flipX: isPlacementFlipX,
    };
  }
  if (
    (activeEditorTool === "decoration" || activeEditorTool === "freeform_decoration") &&
    currentSelectedAssetId
  ) {
    return {
      active: true,
      name: currentSelectedAssetName || currentSelectedAssetId,
      category: "Decoration",
      assetId: currentSelectedAssetId,
      passable: !isObstacleEnabled,
      ontop: isDecorationOntop,
      layer: currentPlacementLayer,
      flipX: isPlacementFlipX,
    };
  }
  if (
    activeEditorTool === "jukebox" ||
    activeEditorTool === "typewriter" ||
    activeEditorTool === "ashtray" ||
    activeEditorTool === "chess_board" ||
    activeEditorTool === "aquarium"
  ) {
    const labelMap: Record<string, string> = {
      jukebox: "YouTube Jukebox",
      typewriter: "Typewriter",
      ashtray: "Ashtray",
      chess_board: "Chess Board",
      aquarium: "Aquarium",
    };
    const assetMap: Record<string, string> = {
      jukebox: "jukebox_1",
      typewriter: "typewriter_1",
      ashtray: "ashtray_1",
      chess_board: "chess_board_1",
      aquarium: "aquarium_1",
    };
    return {
      active: true,
      name: labelMap[activeEditorTool] || activeEditorTool,
      category: "Decoration",
      assetId: assetMap[activeEditorTool] || "",
      passable: !isObstacleEnabled,
      ontop: isDecorationOntop,
      layer: currentPlacementLayer,
      flipX: isPlacementFlipX,
    };
  }

  return {
    active: false,
    name: "No Tile Selected",
    category: "Select flooring, wall, or decoration",
    assetId: "",
    passable: true,
    ontop: false,
    layer: 0,
    flipX: false,
  };
}

let previewRequestSeq = 0;

function syncRightTileOptionsSidebar() {
  const info = getSelectedPlacementTileInfo();

  if (tileOptionsName) tileOptionsName.textContent = info.name;
  if (tileOptionsCategory) tileOptionsCategory.textContent = info.category;

  const reqSeq = ++previewRequestSeq;
  if (tileOptionsPreviewImg && tileOptionsPreviewPlaceholder) {
    if (info.assetId) {
      void resolveAssetThumbnailUrl(info.assetId).then((assetPath) => {
        if (reqSeq !== previewRequestSeq) return;
        if (assetPath) {
          tileOptionsPreviewImg.src = assetPath;
          tileOptionsPreviewImg.classList.remove("hidden");
          tileOptionsPreviewPlaceholder.classList.add("hidden");
        } else {
          tileOptionsPreviewImg.classList.add("hidden");
          tileOptionsPreviewPlaceholder.classList.remove("hidden");
        }
      });
    } else {
      tileOptionsPreviewImg.classList.add("hidden");
      tileOptionsPreviewPlaceholder.classList.remove("hidden");
    }
  }

  if (tileOptionsControls) {
    tileOptionsControls.classList.toggle("disabled", !info.active);
  }
  if (tileOptPassableSwitch) {
    tileOptPassableSwitch.disabled = !info.active;
    tileOptPassableSwitch.checked = info.passable;
  }
  if (tileOptPassableHint) {
    tileOptPassableHint.textContent = info.passable ? "Walkable" : "Solid (Obstacle)";
    tileOptPassableHint.classList.toggle("solid", !info.passable);
  }
  if (tileOptRenderLayer) {
    tileOptRenderLayer.disabled = !info.active;
    tileOptRenderLayer.value = info.ontop ? "top" : "bottom";
  }
  if (btnTileOptLayerDown) btnTileOptLayerDown.disabled = !info.active;
  if (btnTileOptLayerUp) btnTileOptLayerUp.disabled = !info.active;
  if (tileOptLayerValue) tileOptLayerValue.textContent = String(info.layer);
  if (tileOptFlipXSwitch) {
    tileOptFlipXSwitch.disabled = !info.active;
    tileOptFlipXSwitch.checked = info.flipX;
  }
  if (tileOptFlipXHint) {
    tileOptFlipXHint.textContent = info.flipX ? "Flipped" : "Normal";
  }
  if (tileOptionsPreviewImg) {
    tileOptionsPreviewImg.classList.toggle("flipped-x", info.flipX);
  }
}

function setupMapEditorDecorationControls() {
  if (tileOptPassableSwitch) {
    tileOptPassableSwitch.addEventListener("change", () => {
      const passable = tileOptPassableSwitch.checked;
      if (activeEditorContextMenuItem && gameInstance) {
        const scene = gameInstance.scene.getScene("GameScene") as GameScene;
        if (scene) {
          scene.setItemPassable(activeEditorContextMenuItem, passable);
          updateEditorItemObstacleButton(!passable);
          syncRightTileOptionsSidebar();
        }
        return;
      }
      setObstacleEnabled(!passable);
    });
  }

  if (tileOptRenderLayer) {
    tileOptRenderLayer.addEventListener("change", () => {
      const ontop = tileOptRenderLayer.value === "top";
      if (activeEditorContextMenuItem && gameInstance) {
        const scene = gameInstance.scene.getScene("GameScene") as GameScene;
        if (scene) {
          scene.setItemRenderLayer(activeEditorContextMenuItem, ontop);
          syncRightTileOptionsSidebar();
        }
        return;
      }
      setDecorationRenderLayer(ontop);
    });
  }

  if (btnTileOptLayerDown) {
    btnTileOptLayerDown.addEventListener("click", () => {
      if (activeEditorContextMenuItem && gameInstance) {
        const scene = gameInstance.scene.getScene("GameScene") as GameScene;
        const curr = scene?.getItemTileOptions?.(activeEditorContextMenuItem);
        if (scene && curr) {
          scene.setItemLayerLevel(activeEditorContextMenuItem, curr.layer - 1);
          syncRightTileOptionsSidebar();
        }
        return;
      }
      adjustPlacementLayer(-1);
    });
  }

  if (btnTileOptLayerUp) {
    btnTileOptLayerUp.addEventListener("click", () => {
      if (activeEditorContextMenuItem && gameInstance) {
        const scene = gameInstance.scene.getScene("GameScene") as GameScene;
        const curr = scene?.getItemTileOptions?.(activeEditorContextMenuItem);
        if (scene && curr) {
          scene.setItemLayerLevel(activeEditorContextMenuItem, curr.layer + 1);
          syncRightTileOptionsSidebar();
        }
        return;
      }
      adjustPlacementLayer(1);
    });
  }

  if (tileOptFlipXSwitch) {
    tileOptFlipXSwitch.addEventListener("change", () => {
      const flipX = tileOptFlipXSwitch.checked;
      if (activeEditorContextMenuItem && gameInstance) {
        const scene = gameInstance.scene.getScene("GameScene") as GameScene;
        if (scene) {
          scene.setItemFlipX(activeEditorContextMenuItem, flipX);
          syncRightTileOptionsSidebar();
        }
        return;
      }
      setPlacementFlipX(flipX);
    });
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
    return `/assets/floor/Free/${normalized}.png`;
  }
  const glassWallAssets = new Set([
    "glass_1", "glass_2", "glass_3", "glass_4"
  ]);
  if (glassWallAssets.has(normalized)) {
    return `/assets/wall/Free/${normalized}.png`;
  }
  if (normalized.startsWith("wood_wall_")) {
    const num = normalized.replace("wood_wall_", "");
    return `/assets/wall/Free/wood_${num}.png`;
  }
  if (normalized.startsWith("wall_wood_")) {
    const num = normalized.replace("wall_wood_", "");
    return `/assets/wall/Free/wood_${num}.png`;
  }
  const decoAssets = new Set([
    "table_1_left", "table_1_middle", "table_1_right",
    "table_2_left", "table_2_middle", "table_2_right",
    "round_table_1", "typewriter_1", "ashtray_1", "chess_board_1", "aquarium_1",
    "office_chair_1_front", "office_chair_1_back",
    "jukebox_1"
  ]);
  if (decoAssets.has(normalized)) {
    return `/assets/decoration/Free/${normalized}.png`;
  }
  if (normalized.startsWith("office_one/")) {
    const file = normalized.slice("office_one/".length);
    return `/assets/decoration/Office One/${encodeURIComponent(file)}.png`;
  }
  return null;
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
  | "ashtray"
  | "chess_board"
  | "aquarium"
  | "freeform_decoration"
  | "spawn_point" = "none";

let isObstacleEnabled: boolean = true;
let isDecorationPassable: boolean = false;
let isDecorationOntop: boolean = false;
let currentPlacementLayer: number = 0;
let isPlacementFlipX: boolean = false;

function isCurrentToolLayerable(): boolean {
  return (
    activeEditorTool === "flooring" ||
    activeEditorTool === "decoration" ||
    activeEditorTool === "freeform_decoration" ||
    activeEditorTool === "jukebox" ||
    activeEditorTool === "typewriter" ||
    activeEditorTool === "ashtray" ||
    activeEditorTool === "chess_board" ||
    activeEditorTool === "aquarium"
  );
}

function updatePlacementLayerUI() {
  syncRightTileOptionsSidebar();

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

  syncRightTileOptionsSidebar();
  updateEditBannerText();
}

function setDecorationPassable(passable: boolean) {
  setObstacleEnabled(!passable);
}

function setDecorationRenderLayer(ontop: boolean) {
  isDecorationOntop = ontop;

  if (gameInstance) {
    const scene = gameInstance.scene.getScene("GameScene") as GameScene;
    if (scene && typeof scene.setDecorationOntop === "function") {
      scene.setDecorationOntop(ontop);
    }
  }

  syncRightTileOptionsSidebar();
  updateEditBannerText();
}

function setPlacementFlipX(flipX: boolean) {
  isPlacementFlipX = flipX;

  if (gameInstance) {
    const scene = gameInstance.scene.getScene("GameScene") as GameScene;
    if (scene && typeof scene.setPlacementFlipX === "function") {
      scene.setPlacementFlipX(flipX);
    }
  }

  syncRightTileOptionsSidebar();
}

function updateEditBannerText() {
  syncRightTileOptionsSidebar();
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

  if (activeEditorTool === "ashtray") {
    editBannerAssetText.innerHTML = `<span class="banner-private-tag" style="background: rgba(234, 88, 12, 0.2); color: #fb923c; border-color: rgba(234, 88, 12, 0.4);">🚬 Ashtray</span> Active: <strong>Smoking Game (Freeform)</strong> • <span class="banner-layer-tag">Layer ${currentPlacementLayer} (↑/↓)</span> • <em>Click anywhere to place • Use ↑/↓ arrow keys to change layer</em>`;
    return;
  }

  if (activeEditorTool === "chess_board") {
    editBannerAssetText.innerHTML = `<span class="banner-private-tag" style="background: rgba(168, 85, 247, 0.2); color: #e9d5ff; border-color: rgba(168, 85, 247, 0.4);">♟️ Chess Board</span> Active: <strong>Chess Arena (Freeform)</strong> • <span class="banner-layer-tag">Layer ${currentPlacementLayer} (↑/↓)</span> • <em>Click anywhere to place • Use ↑/↓ arrow keys to change layer</em>`;
    return;
  }

  if (activeEditorTool === "aquarium") {
    editBannerAssetText.innerHTML = `<span class="banner-private-tag" style="background: rgba(14, 165, 233, 0.2); color: #38bdf8; border-color: rgba(14, 165, 233, 0.4);">🐟 Aquarium</span> Active: <strong>Fishing Minigame (Freeform)</strong> • <span class="banner-layer-tag">Layer ${currentPlacementLayer} (↑/↓)</span> • <em>Click anywhere to place • Use ↑/↓ arrow keys to change layer</em>`;
    return;
  }

  if (activeEditorTool === "spawn_point") {
    editBannerAssetText.innerHTML = `<span class="banner-spawn-tag">📍 Spawn Point</span> Active: <strong>Player Spawn Point</strong> • <em>Click anywhere to place spawn point (1 per map)</em>`;
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
    const passageMarkup = isDecorationPassable
      ? `<span class="banner-passable-tag">🟢 Passable</span>`
      : `<span class="banner-solid-tag">🚫 Solid (Impassable)</span>`;
    const layerMarkup = isDecorationOntop
      ? `<span class="banner-layer-tag">🔼 On Top</span>`
      : `<span class="banner-layer-tag">🔽 Behind</span>`;
    const levelMarkup = `<span class="banner-layer-tag">Layer ${currentPlacementLayer} (↑/↓)</span>`;
    editBannerAssetText.innerHTML = `<span class="banner-deco-tag" style="background:linear-gradient(135deg,#8b5cf6,#ec4899);">🪑 Freeform</span> Active: <strong>${currentSelectedAssetName}</strong> • ${passageMarkup} • ${layerMarkup} • ${levelMarkup} • <em>Click to place • ↑/↓ arrows for layer</em>`;
    return;
  }
  if (activeEditorTool === "decoration") {
    const passageMarkup = isDecorationPassable
      ? `<span class="banner-passable-tag">🟢 Passable</span>`
      : `<span class="banner-solid-tag">🚫 Solid (Impassable)</span>`;
    const layerMarkup = isDecorationOntop
      ? `<span class="banner-layer-tag">🔼 On Top</span>`
      : `<span class="banner-layer-tag">🔽 Behind</span>`;
    const levelMarkup = `<span class="banner-layer-tag">Layer ${currentPlacementLayer} (↑/↓)</span>`;
    editBannerAssetText.innerHTML = `<span class="banner-deco-tag">🪴 Decoration</span> Active: <strong>${currentSelectedAssetName}</strong> • ${passageMarkup} • ${layerMarkup} • ${levelMarkup} • <em>Click to place • ↑/↓ arrows for layer</em>`;
    return;
  }

  const isWall = isWallAsset(currentSelectedAssetId);
  const isOverlayWall = isOverlayWallAsset(currentSelectedAssetId);
  const isOverlayFloor = isOverlayFloorAsset(currentSelectedAssetId);
  const obstacleTag = isObstacleEnabled
    ? `<span class="banner-solid-tag">🚫 Solid</span> `
    : `<span class="banner-passable-tag">🟢 Passable</span> `;
  const wallTag = isOverlayWall
    ? `<span class="banner-wall-tag" style="background:rgba(59,130,246,0.3);border-color:rgba(59,130,246,0.6);">🧱 Overlay Wall</span> ${obstacleTag}`
    : isOverlayFloor
    ? `<span class="banner-wall-tag" style="background:rgba(59,130,246,0.3);border-color:rgba(59,130,246,0.6);">🟦 Overlay Floor</span> ${obstacleTag}`
    : isWall
    ? `<span class="banner-wall-tag">🧱 Wall</span> ${obstacleTag}`
    : obstacleTag;
  const layerText = isDecorationOntop ? "🔼 On Top" : "🔽 Behind";
  const levelTag = ` • <span class="banner-layer-tag">${layerText} • Layer ${currentPlacementLayer} (↑/↓)</span>`;
  editBannerAssetText.innerHTML = `${wallTag}Active: <strong>${currentSelectedAssetName}</strong>${levelTag}`;
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
  if (mapEditorTileOptionsSidebar) mapEditorTileOptionsSidebar.classList.remove("hidden");
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
      setupSceneAshtrayEvents(scene);
      setupSceneChessEvents(scene);
      setupSceneAquariumEvents(scene);
      setupSceneEditorToolEvents(scene);
      scene.setEditMode(true);
      scene.setActiveEditorTool(activeEditorTool);
      scene.setSelectedAsset(currentSelectedAssetId);
      scene.setDecorationPassable(isDecorationPassable);
      scene.setDecorationOntop(isDecorationOntop);
      scene.setPlacementLayer(currentPlacementLayer);
    }
  }

  syncRightTileOptionsSidebar();
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
  if (mapEditorTileOptionsSidebar) mapEditorTileOptionsSidebar.classList.add("hidden");
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
  const isWall = isWallAsset(assetId) || isOverlayWallAsset(assetId);
  isObstacleEnabled = isWall;
  isDecorationPassable = !isWall;

  const cards = document.querySelectorAll(".editor-asset-card");
  cards.forEach((card) => {
    if ((card as HTMLElement).dataset.assetId === assetId && !(card as HTMLElement).dataset.toolType) {
      card.classList.add("selected");
    } else {
      card.classList.remove("selected");
    }
  });

  syncRightTileOptionsSidebar();
  updateEditBannerText();

  if (gameInstance) {
    const scene = gameInstance.scene.getScene("GameScene") as GameScene;
    if (scene) {
      scene.setActiveEditorTool("flooring");
      scene.setSelectedAsset(assetId);
      if (typeof scene.setObstacleEnabled === "function") {
        scene.setObstacleEnabled(isObstacleEnabled);
      }
      scene.setDecorationOntop(isDecorationOntop);
      scene.setPlacementLayer(currentPlacementLayer);
    }
  }

  hideEditorUIForPlacing(assetName);
}

function selectDecorationAsset(assetId: string, assetName: string) {
  activeEditorTool = "freeform_decoration";
  currentSelectedAssetId = assetId;
  currentSelectedAssetName = assetName;
  isObstacleEnabled = false;
  isDecorationPassable = true;

  const cards = document.querySelectorAll(".editor-asset-card");
  cards.forEach((card) => {
    if ((card as HTMLElement).dataset.assetId === assetId && !(card as HTMLElement).dataset.toolType) {
      card.classList.add("selected");
    } else {
      card.classList.remove("selected");
    }
  });

  syncRightTileOptionsSidebar();
  updateEditBannerText();

  if (gameInstance) {
    const scene = gameInstance.scene.getScene("GameScene") as GameScene;
    if (scene) {
      scene.setActiveEditorTool("freeform_decoration");
      scene.setSelectedAsset(assetId);
      scene.setDecorationPassable(isDecorationPassable);
      scene.setDecorationOntop(isDecorationOntop);
      scene.setPlacementLayer(currentPlacementLayer);
    }
  }

  const passStr = isDecorationPassable ? "Passable" : "Solid";
  const layerStr = isDecorationOntop ? "On Top" : "Behind";
  const modeStr = "Freeform • ";
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

function selectAshtrayTool() {
  activeEditorTool = "ashtray";

  const cards = document.querySelectorAll(".editor-asset-card");
  cards.forEach((card) => {
    if ((card as HTMLElement).dataset.toolType === "ashtray") {
      card.classList.add("selected");
    } else {
      card.classList.remove("selected");
    }
  });

  updateEditBannerText();

  if (gameInstance) {
    const scene = gameInstance.scene.getScene("GameScene") as GameScene;
    if (scene) {
      scene.setActiveEditorTool("ashtray");
      scene.setPlacementLayer(currentPlacementLayer);
    }
  }

  hideEditorUIForPlacing("Ashtray");
}

function selectChessBoardTool() {
  activeEditorTool = "chess_board";

  const cards = document.querySelectorAll(".editor-asset-card");
  cards.forEach((card) => {
    if ((card as HTMLElement).dataset.toolType === "chess_board") {
      card.classList.add("selected");
    } else {
      card.classList.remove("selected");
    }
  });

  updateEditBannerText();

  if (gameInstance) {
    const scene = gameInstance.scene.getScene("GameScene") as GameScene;
    if (scene) {
      scene.setActiveEditorTool("chess_board");
      scene.setPlacementLayer(currentPlacementLayer);
    }
  }

  hideEditorUIForPlacing("Chess Board");
}

function selectAquariumTool() {
  activeEditorTool = "aquarium";

  const cards = document.querySelectorAll(".editor-asset-card");
  cards.forEach((card) => {
    if ((card as HTMLElement).dataset.toolType === "aquarium") {
      card.classList.add("selected");
    } else {
      card.classList.remove("selected");
    }
  });

  updateEditBannerText();

  if (gameInstance) {
    const scene = gameInstance.scene.getScene("GameScene") as GameScene;
    if (scene) {
      scene.setActiveEditorTool("aquarium");
      scene.setPlacementLayer(currentPlacementLayer);
    }
  }

  hideEditorUIForPlacing("Aquarium");
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

function updateEditorItemInteractionUI(
  interactable: boolean,
  interaction: DecorationInteractionType | null
) {
  const btnInteract = document.getElementById("btn-editor-item-interactable");
  const interactLabel = document.getElementById("editor-item-interact-label");
  const pickerEl = document.getElementById("editor-item-interaction-picker");
  const selectedLabelEl = document.getElementById("editor-interaction-selected-label");
  const dropdownPanel = document.getElementById("editor-interaction-dropdown-panel");

  if (btnInteract) {
    if (interactable) {
      btnInteract.classList.add("is-interactable");
      if (interactLabel) interactLabel.textContent = "Interactable: ON";
    } else {
      btnInteract.classList.remove("is-interactable");
      if (interactLabel) interactLabel.textContent = "Interactable: OFF";
    }
  }

  if (pickerEl) {
    if (interactable) {
      pickerEl.classList.remove("hidden");
    } else {
      pickerEl.classList.add("hidden");
      dropdownPanel?.classList.add("hidden");
    }
  }

  if (selectedLabelEl) {
    const matched = DECORATION_INTERACTIONS.find((o) => o.id === interaction);
    selectedLabelEl.textContent = matched
      ? `${matched.icon} ${matched.label}`
      : "Select interaction...";
  }
}

function renderEditorInteractionOptions(
  filterText: string,
  selectedInteraction: DecorationInteractionType | null
) {
  const optionsContainer = document.getElementById("editor-interaction-options");
  if (!optionsContainer) return;

  const q = filterText.trim().toLowerCase();
  const filtered = DECORATION_INTERACTIONS.filter(
    (opt) =>
      opt.label.toLowerCase().includes(q) ||
      opt.id.toLowerCase().includes(q)
  );

  optionsContainer.innerHTML = "";
  if (filtered.length === 0) {
    const empty = document.createElement("div");
    empty.className = "editor-interaction-empty";
    empty.textContent = "No matching interaction";
    optionsContainer.appendChild(empty);
    return;
  }

  for (const opt of filtered) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "editor-interaction-option" +
      (opt.id === selectedInteraction ? " active" : "");
    btn.innerHTML = `<span>${opt.icon}</span><span>${opt.label}</span>`;
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!activeEditorContextMenuItem || !gameInstance) return;
      const scene = gameInstance.scene.getScene("GameScene") as GameScene;
      if (scene && typeof scene.setItemInteraction === "function") {
        scene.setItemInteraction(activeEditorContextMenuItem, true, opt.id);
        updateEditorItemInteractionUI(true, opt.id);
        document
          .getElementById("editor-interaction-dropdown-panel")
          ?.classList.add("hidden");
        showPlacingToast(`Interaction set to ${opt.label}`);
      }
    });
    optionsContainer.appendChild(btn);
  }
}

function showEditorItemContextMenu(
  item: InspectableMapItem,
  screenX: number,
  screenY: number
) {
  activeEditorContextMenuItem = item;
  const menuEl = document.getElementById("editor-item-context-menu");
  const nameEl = document.getElementById("editor-item-menu-name");
  const btnObstacle = document.getElementById("btn-editor-item-obstacle");
  const btnInteract = document.getElementById("btn-editor-item-interactable");
  const pickerEl = document.getElementById("editor-item-interaction-picker");
  const dropdownPanel = document.getElementById("editor-interaction-dropdown-panel");
  if (!menuEl) return;

  dropdownPanel?.classList.add("hidden");

  if (nameEl) {
    nameEl.textContent = item.label || "Map Item";
  }

  const scene = gameInstance
    ? (gameInstance.scene.getScene("GameScene") as GameScene)
    : null;

  if (btnObstacle) {
    if (item.kind === "spawn_point" || item.kind === "private_zone") {
      btnObstacle.style.display = "none";
    } else {
      btnObstacle.style.display = "flex";
      let isObstacle = true;
      if (scene && typeof scene.isItemObstacle === "function") {
        isObstacle = scene.isItemObstacle(item);
      }
      updateEditorItemObstacleButton(isObstacle);
    }
  }

  const supportsInteraction =
    scene && typeof scene.isItemInteractableSupported === "function"
      ? scene.isItemInteractableSupported(item)
      : false;

  if (btnInteract) {
    if (supportsInteraction && scene) {
      btnInteract.classList.remove("hidden");
      const state = scene.getItemInteractionState(item);
      updateEditorItemInteractionUI(state.interactable, state.interaction);
      renderEditorInteractionOptions("", state.interaction);
    } else {
      btnInteract.classList.add("hidden");
      pickerEl?.classList.add("hidden");
    }
  }

  positionEditorItemContextMenu(screenX, screenY);
  menuEl.classList.remove("hidden");
  syncRightTileOptionsSidebar();
}

function positionEditorItemContextMenu(screenX: number, screenY: number) {
  const menuEl = document.getElementById("editor-item-context-menu");
  if (!menuEl) return;

  const menuWidth = 224;
  const menuHeight = 230;
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
  document
    .getElementById("editor-interaction-dropdown-panel")
    ?.classList.add("hidden");
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
  syncRightTileOptionsSidebar();
}

function setupSceneEditorToolEvents(scene: GameScene) {
  scene.onPlacementLayerChange = (layer: number) => {
    setPlacementLayer(layer, false);
  };

  scene.onEditorItemContextMenu = ({ item, screenX, screenY }) => {
    showEditorItemContextMenu(item, screenX, screenY);
  };

  scene.onEditorItemMoved = (item) => {
    showPlacingToast(`Moved ${item.label || "item"}`);
  };

  scene.onEditorItemMenuPositionUpdate = ({ screenX, screenY, visible }) => {
    const menuEl = document.getElementById("editor-item-context-menu");
    if (!menuEl) return;
    if (!visible) {
      activeEditorContextMenuItem = null;
      menuEl.classList.add("hidden");
      syncRightTileOptionsSidebar();
      return;
    }
    positionEditorItemContextMenu(screenX, screenY);
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

  // If clicking oneself, hide Whisper option; if clicking another player, show Whisper
  const isMe = !!(multiplayer && player.sessionId === multiplayer.sessionId);
  if (btnPlayerMenuWhisper) {
    btnPlayerMenuWhisper.style.display = isMe ? "none" : "flex";
  }
  if (btnPlayerMenuThrowBattle) {
    btnPlayerMenuThrowBattle.style.display = isMe ? "none" : "flex";
  }

  if (gameInstance) {
    const scene = gameInstance.scene.getScene("GameScene") as GameScene;
    if (scene) {
      const cam = scene.cameras.main;
      const screenX =
        (player.worldX - cam.scrollX - cam.width * 0.5) * cam.zoom + cam.width * 0.5;
      const screenY =
        (player.worldY - CHARACTER_MAX_SIZE / 2 - 20 - cam.scrollY - cam.height * 0.5) * cam.zoom +
        cam.height * 0.5;
      positionPlayerContextMenu(screenX, screenY);
    }
  }

  playerContextMenu?.classList.remove("hidden");
}

function positionPlayerContextMenu(screenX: number, screenY: number) {
  if (!playerContextMenu) return;
  const menuWidth = 170;
  const menuHeight = 160;
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
  const tbSetupModal = document.getElementById("throw-battle-setup-modal");
  if (tbSetupModal && !tbSetupModal.classList.contains("hidden")) return true;
  const tbModal = document.getElementById("throw-battle-modal");
  if (tbModal && !tbModal.classList.contains("hidden")) return true;
  const tbInviteModal = document.getElementById("throw-battle-invite-modal");
  if (tbInviteModal && !tbInviteModal.classList.contains("hidden")) return true;
  const tbWaitingModal = document.getElementById("throw-battle-waiting-modal");
  if (tbWaitingModal && !tbWaitingModal.classList.contains("hidden")) return true;
  const atModal = document.getElementById("ashtray-modal");
  if (atModal && !atModal.classList.contains("hidden")) return true;
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

// Throw Battle Challenge & Modal Button Handlers
if (btnPlayerMenuThrowBattle) {
  btnPlayerMenuThrowBattle.addEventListener("click", () => {
    if (!activeMenuPlayer || !multiplayer) return;
    const targetSessionId = activeMenuPlayer.sessionId;
    const targetName = activeMenuPlayer.name;
    closePlayerContextMenu();

    pendingChallengeTargetSessionId = targetSessionId;
    if (tbSetupTargetName) {
      tbSetupTargetName.textContent = targetName;
    }
    if (inputTbHits) {
      inputTbHits.value = "20";
    }
    tbHitsPresets?.querySelectorAll(".preset-pill").forEach((pill) => {
      if ((pill as HTMLElement).dataset.val === "20") pill.classList.add("active");
      else pill.classList.remove("active");
    });

    throwBattleSetupModal?.classList.remove("hidden");
    setGameControlsActive(false);
  });
}

if (tbHitsPresets) {
  tbHitsPresets.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest(".preset-pill") as HTMLElement | null;
    if (!btn || !btn.dataset.val) return;
    const val = parseInt(btn.dataset.val, 10);
    if (!isNaN(val) && inputTbHits) {
      inputTbHits.value = String(val);
      tbHitsPresets.querySelectorAll(".preset-pill").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
    }
  });
}

if (inputTbHits) {
  inputTbHits.addEventListener("input", () => {
    const val = inputTbHits.value.trim();
    tbHitsPresets?.querySelectorAll(".preset-pill").forEach((p) => {
      if ((p as HTMLElement).dataset.val === val) p.classList.add("active");
      else p.classList.remove("active");
    });
  });
}

if (btnTbCancelSetup) {
  btnTbCancelSetup.addEventListener("click", () => {
    pendingChallengeTargetSessionId = null;
    throwBattleSetupModal?.classList.add("hidden");
    setGameControlsActive(true);
  });
}

if (btnTbConfirmChallenge) {
  btnTbConfirmChallenge.addEventListener("click", () => {
    if (!pendingChallengeTargetSessionId || !multiplayer) return;
    let hits = parseInt(inputTbHits?.value || "20", 10);
    if (isNaN(hits) || hits < 1) hits = 1;
    if (hits > 100) hits = 100;

    const targetSessionId = pendingChallengeTargetSessionId;
    const targetName = tbSetupTargetName?.textContent || "Player";
    throwBattleSetupModal?.classList.add("hidden");

    multiplayer.sendThrowBattleChallenge(targetSessionId, hits);

    if (tbWaitingText) {
      tbWaitingText.textContent = `Waiting for ${targetName} to accept or reject the Throw Battle (${hits} hits)...`;
    }
    throwBattleWaitingModal?.classList.remove("hidden");
  });
}

if (btnTbCancelChallenge) {
  btnTbCancelChallenge.addEventListener("click", () => {
    if (pendingChallengeTargetSessionId && multiplayer) {
      multiplayer.cancelThrowBattleChallenge(pendingChallengeTargetSessionId);
    }
    pendingChallengeTargetSessionId = null;
    throwBattleWaitingModal?.classList.add("hidden");
    setGameControlsActive(true);
  });
}

if (btnTbRejectInvite) {
  btnTbRejectInvite.addEventListener("click", () => {
    if (pendingInviteChallengerSessionId && multiplayer) {
      multiplayer.rejectThrowBattleChallenge(pendingInviteChallengerSessionId);
    }
    pendingInviteChallengerSessionId = null;
    throwBattleInviteModal?.classList.add("hidden");
    setGameControlsActive(true);
  });
}

if (btnTbAcceptInvite) {
  btnTbAcceptInvite.addEventListener("click", () => {
    if (pendingInviteChallengerSessionId && multiplayer) {
      multiplayer.acceptThrowBattleChallenge(pendingInviteChallengerSessionId);
    }
    pendingInviteChallengerSessionId = null;
    throwBattleInviteModal?.classList.add("hidden");
  });
}

function closeThrowBattleModal() {
  if (activeThrowBattleGame && multiplayer) {
    if (activeThrowBattleGame.matchId) {
      multiplayer.sendThrowBattleLeave(activeThrowBattleGame.matchId);
    }
    activeThrowBattleGame.destroy();
    activeThrowBattleGame = null;
  }
  throwBattleModal?.classList.add("hidden");
  setGameControlsActive(true);
}

if (btnCloseThrowBattle) {
  btnCloseThrowBattle.addEventListener("click", () => {
    closeThrowBattleModal();
  });
}

if (btnTbExit) {
  btnTbExit.addEventListener("click", () => {
    closeThrowBattleModal();
  });
}

if (btnTbRematch) {
  btnTbRematch.addEventListener("click", () => {
    if (activeThrowBattleGame?.matchId && multiplayer) {
      multiplayer.sendThrowBattleRematch(activeThrowBattleGame.matchId);
    }
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
    setupMultiplayerSmokingGameListeners(multiplayer);
    setupMultiplayerChessListeners(multiplayer);
    setupMultiplayerParkingPointsListeners(multiplayer);
    setupMultiplayerThrowBattleListeners(multiplayer);
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

  const previousModalJukeboxId = currentModalJukeboxId;
  if (jukeboxId) {
    currentModalJukeboxId = jukeboxId;
  } else if (multiplayer && multiplayer.currentJukeboxes.size > 0) {
    currentModalJukeboxId = Array.from(multiplayer.currentJukeboxes.keys())[0];
  }
  if (previousModalJukeboxId !== currentModalJukeboxId) {
    selectedJukeboxTrackIds.clear();
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

function updateJukeboxBulkToolbar(playlist: JukeboxState["playlist"] | null | undefined) {
  const tracks = playlist ?? [];
  const total = tracks.length;

  if (btnJukeboxClearList) {
    btnJukeboxClearList.disabled = total === 0;
  }

  if (jukeboxBulkToolbar) {
    jukeboxBulkToolbar.classList.toggle("hidden", total === 0);
  }

  if (total === 0) {
    selectedJukeboxTrackIds.clear();
    if (jukeboxSelectAllCheckbox) {
      jukeboxSelectAllCheckbox.checked = false;
      jukeboxSelectAllCheckbox.indeterminate = false;
    }
    if (jukeboxSelectedCount) {
      jukeboxSelectedCount.textContent = "0 selected";
    }
    if (btnJukeboxBulkUp) btnJukeboxBulkUp.disabled = true;
    if (btnJukeboxBulkDown) btnJukeboxBulkDown.disabled = true;
    if (btnJukeboxBulkDelete) btnJukeboxBulkDelete.disabled = true;
    return;
  }

  const selectedCount = tracks.reduce(
    (acc, t) => (selectedJukeboxTrackIds.has(t.id) ? acc + 1 : acc),
    0
  );

  if (jukeboxSelectAllCheckbox) {
    jukeboxSelectAllCheckbox.checked = selectedCount === total;
    jukeboxSelectAllCheckbox.indeterminate = selectedCount > 0 && selectedCount < total;
  }

  if (jukeboxSelectedCount) {
    jukeboxSelectedCount.textContent = `${selectedCount} selected`;
  }

  let canMoveUp = false;
  let canMoveDown = false;
  for (let i = 0; i < total; i++) {
    if (selectedJukeboxTrackIds.has(tracks[i].id)) {
      if (i > 0 && !selectedJukeboxTrackIds.has(tracks[i - 1].id)) {
        canMoveUp = true;
      }
      if (i < total - 1 && !selectedJukeboxTrackIds.has(tracks[i + 1].id)) {
        canMoveDown = true;
      }
    }
  }

  if (btnJukeboxBulkUp) btnJukeboxBulkUp.disabled = !canMoveUp;
  if (btnJukeboxBulkDown) btnJukeboxBulkDown.disabled = !canMoveDown;
  if (btnJukeboxBulkDelete) btnJukeboxBulkDelete.disabled = selectedCount === 0;
}

function renderJukeboxModal(jb: JukeboxState | null) {
  if (!jukeboxModal) return;

  if (!jb) {
    if (jukeboxNowPlayingTitle) jukeboxNowPlayingTitle.textContent = "No Jukebox Found";
    if (jukeboxNowPlayingSubmitter)
      jukeboxNowPlayingSubmitter.textContent = "Place a jukebox in this space using the map editor";
    if (jukeboxStatusBadge) {
      jukeboxStatusBadge.textContent = "NOT FOUND";
      jukeboxStatusBadge.classList.remove("status-paused");
    }
    if (btnJukeboxSkip) btnJukeboxSkip.disabled = true;
    if (btnJukeboxPlayPause) btnJukeboxPlayPause.disabled = true;
    if (jukeboxVideoPlaceholder) jukeboxVideoPlaceholder.classList.remove("hidden");
    if (jukeboxPlayerBody) jukeboxPlayerBody.classList.add("placeholder-active");
    if (jukeboxQueueCount) jukeboxQueueCount.textContent = "0 tracks";
    updateJukeboxBulkToolbar(null);
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

  if (hasTracks && currentTrack) {
    if (jukeboxNowPlayingTitle) jukeboxNowPlayingTitle.textContent = currentTrack.title;
    if (jukeboxNowPlayingSubmitter)
      jukeboxNowPlayingSubmitter.textContent = `Added by ${currentTrack.addedByName || "Player"}`;
    if (jukeboxVideoPlaceholder) jukeboxVideoPlaceholder.classList.add("hidden");
    if (jukeboxPlayerBody) jukeboxPlayerBody.classList.remove("placeholder-active");

    if (btnJukeboxSkip) btnJukeboxSkip.disabled = false;
    if (btnJukeboxPlayPause) {
      btnJukeboxPlayPause.disabled = false;
      if (jb.isPlaying) {
        btnJukeboxPlayPause.title = "Pause playback";
        if (btnJukeboxPlayPauseIcon) btnJukeboxPlayPauseIcon.textContent = "⏸️";
        if (btnJukeboxPlayPauseText) btnJukeboxPlayPauseText.textContent = "Pause";
      } else {
        btnJukeboxPlayPause.title = "Resume playback";
        if (btnJukeboxPlayPauseIcon) btnJukeboxPlayPauseIcon.textContent = "▶️";
        if (btnJukeboxPlayPauseText) btnJukeboxPlayPauseText.textContent = "Play";
      }
    }

    if (jukeboxStatusBadge) {
      if (jb.isPlaying) {
        jukeboxStatusBadge.textContent = `🎶 NOW PLAYING (${jb.currentTrackIndex + 1}/${jb.playlist.length})`;
        jukeboxStatusBadge.classList.remove("status-paused");
      } else {
        jukeboxStatusBadge.textContent = `⏸️ PAUSED (${jb.currentTrackIndex + 1}/${jb.playlist.length})`;
        jukeboxStatusBadge.classList.add("status-paused");
      }
    }
  } else {
    if (jukeboxNowPlayingTitle) jukeboxNowPlayingTitle.textContent = "Playlist Empty";
    if (jukeboxNowPlayingSubmitter)
      jukeboxNowPlayingSubmitter.textContent = "Add a YouTube link below to start playing";
    if (jukeboxStatusBadge) {
      jukeboxStatusBadge.textContent = "IDLE";
      jukeboxStatusBadge.classList.remove("status-paused");
    }
    if (btnJukeboxSkip) btnJukeboxSkip.disabled = true;
    if (btnJukeboxPlayPause) {
      btnJukeboxPlayPause.disabled = true;
      if (btnJukeboxPlayPauseIcon) btnJukeboxPlayPauseIcon.textContent = "⏸️";
      if (btnJukeboxPlayPauseText) btnJukeboxPlayPauseText.textContent = "Pause";
    }
    if (jukeboxVideoPlaceholder) jukeboxVideoPlaceholder.classList.remove("hidden");
    if (jukeboxPlayerBody) jukeboxPlayerBody.classList.add("placeholder-active");
  }

  if (jukeboxQueueCount) {
    const count = jb.playlist.length;
    jukeboxQueueCount.textContent = `${count} ${count === 1 ? "track" : "tracks"}`;
  }

  // Prune any selected IDs that are no longer in the playlist
  const validTrackIds = new Set(jb.playlist.map((t) => t.id));
  for (const id of Array.from(selectedJukeboxTrackIds)) {
    if (!validTrackIds.has(id)) {
      selectedJukeboxTrackIds.delete(id);
    }
  }
  updateJukeboxBulkToolbar(jb.playlist);

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
        const isSelected = selectedJukeboxTrackIds.has(track.id);
        const item = document.createElement("div");
        item.className = `jukebox-queue-item ${index === jb.currentTrackIndex ? "active-track" : ""} ${isSelected ? "selected-track" : ""}`;

        const itemLeft = document.createElement("div");
        itemLeft.className = "queue-item-left";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "jukebox-track-checkbox";
        checkbox.checked = isSelected;
        checkbox.setAttribute("aria-label", `Select ${track.title}`);
        checkbox.addEventListener("click", (e) => {
          e.stopPropagation();
        });
        checkbox.addEventListener("change", () => {
          if (checkbox.checked) {
            selectedJukeboxTrackIds.add(track.id);
            item.classList.add("selected-track");
          } else {
            selectedJukeboxTrackIds.delete(track.id);
            item.classList.remove("selected-track");
          }
          updateJukeboxBulkToolbar(jb.playlist);
        });

        const idxSpan = document.createElement("span");
        idxSpan.className = "queue-item-idx";
        idxSpan.textContent = index === jb.currentTrackIndex ? (jb.isPlaying ? "▶" : "⏸") : `${index + 1}`;

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
        itemLeft.appendChild(checkbox);
        itemLeft.appendChild(idxSpan);
        itemLeft.appendChild(infoDiv);

        const actionsDiv = document.createElement("div");
        actionsDiv.className = "queue-item-actions";

        const btnMoveUp = document.createElement("button");
        btnMoveUp.type = "button";
        btnMoveUp.className = "btn-queue-move btn-queue-up";
        btnMoveUp.title = index === 0 ? "Already at top" : "Move track up";
        btnMoveUp.setAttribute("aria-label", "Move track up");
        btnMoveUp.innerHTML = "▲";
        btnMoveUp.disabled = index === 0;
        btnMoveUp.addEventListener("click", (e) => {
          e.stopPropagation();
          if (multiplayer && currentModalJukeboxId && index > 0) {
            multiplayer.moveJukeboxTrack(currentModalJukeboxId, track.id, "up");
          }
        });

        const btnMoveDown = document.createElement("button");
        btnMoveDown.type = "button";
        btnMoveDown.className = "btn-queue-move btn-queue-down";
        btnMoveDown.title = index === jb.playlist.length - 1 ? "Already at bottom" : "Move track down";
        btnMoveDown.setAttribute("aria-label", "Move track down");
        btnMoveDown.innerHTML = "▼";
        btnMoveDown.disabled = index === jb.playlist.length - 1;
        btnMoveDown.addEventListener("click", (e) => {
          e.stopPropagation();
          if (multiplayer && currentModalJukeboxId && index < jb.playlist.length - 1) {
            multiplayer.moveJukeboxTrack(currentModalJukeboxId, track.id, "down");
          }
        });

        const btnRemove = document.createElement("button");
        btnRemove.type = "button";
        btnRemove.className = "btn-queue-remove";
        btnRemove.title = "Remove from playlist";
        btnRemove.setAttribute("aria-label", "Remove from playlist");
        btnRemove.innerHTML = "🗑️";
        btnRemove.addEventListener("click", (e) => {
          e.stopPropagation();
          if (multiplayer && currentModalJukeboxId) {
            multiplayer.removeJukeboxTrack(currentModalJukeboxId, track.id);
          }
        });

        actionsDiv.appendChild(btnMoveUp);
        actionsDiv.appendChild(btnMoveDown);
        actionsDiv.appendChild(btnRemove);

        item.appendChild(itemLeft);
        item.appendChild(actionsDiv);
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

  if (btnJukeboxPlayPause) {
    btnJukeboxPlayPause.addEventListener("click", () => {
      if (multiplayer && currentModalJukeboxId) {
        multiplayer.toggleJukeboxPause(currentModalJukeboxId);
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

  if (btnJukeboxClearList) {
    btnJukeboxClearList.addEventListener("click", () => {
      if (multiplayer && currentModalJukeboxId) {
        selectedJukeboxTrackIds.clear();
        multiplayer.clearJukeboxPlaylist(currentModalJukeboxId);
      }
    });
  }

  if (jukeboxSelectAllCheckbox) {
    jukeboxSelectAllCheckbox.addEventListener("change", () => {
      if (!multiplayer || !currentModalJukeboxId) return;
      const jb = multiplayer.currentJukeboxes.get(currentModalJukeboxId);
      if (!jb) return;

      if (jukeboxSelectAllCheckbox.checked) {
        jb.playlist.forEach((t) => selectedJukeboxTrackIds.add(t.id));
      } else {
        selectedJukeboxTrackIds.clear();
      }
      renderJukeboxModal(jb);
    });
  }

  if (btnJukeboxBulkUp) {
    btnJukeboxBulkUp.addEventListener("click", () => {
      if (multiplayer && currentModalJukeboxId && selectedJukeboxTrackIds.size > 0) {
        multiplayer.moveJukeboxTracks(
          currentModalJukeboxId,
          Array.from(selectedJukeboxTrackIds),
          "up"
        );
      }
    });
  }

  if (btnJukeboxBulkDown) {
    btnJukeboxBulkDown.addEventListener("click", () => {
      if (multiplayer && currentModalJukeboxId && selectedJukeboxTrackIds.size > 0) {
        multiplayer.moveJukeboxTracks(
          currentModalJukeboxId,
          Array.from(selectedJukeboxTrackIds),
          "down"
        );
      }
    });
  }

  if (btnJukeboxBulkDelete) {
    btnJukeboxBulkDelete.addEventListener("click", () => {
      if (multiplayer && currentModalJukeboxId && selectedJukeboxTrackIds.size > 0) {
        const idsToDelete = Array.from(selectedJukeboxTrackIds);
        selectedJukeboxTrackIds.clear();
        multiplayer.removeJukeboxTracks(currentModalJukeboxId, idsToDelete);
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

// ==========================================
// Ashtray & Cigarette Smoking Game UI Logic
// ==========================================

let activeAshtrayId: string | null = null;
let currentSmokingGameState: SmokingGameRoomState | null = null;
let smokeKey1: string = localStorage.getItem("lepark_smoke_key1") || "A";
let smokeKey2: string = localStorage.getItem("lepark_smoke_key2") || "D";
let remappingSlot: 1 | 2 | null = null;

let localCurrentMashes: number = 0;
let localCigarettesFinished: number = 0;
let localTotalMashes: number = 0;
let localMashesThisWindow: number = 0;
let localMashesPerSec: number = 0;
let nextExpectedSlot: 1 | 2 = 1;
let lastMashReportedAt: number = 0;
let mashSpeedInterval: any = null;
let liveTimerInterval: any = null;

// DOM Elements - Ashtray Modal
const ashtrayModal = document.getElementById("ashtray-modal") as HTMLDivElement | null;
const btnCloseAshtrayModal = document.getElementById("btn-close-ashtray-modal") as HTMLButtonElement | null;
const ashtrayViewerBanner = document.getElementById("ashtray-viewer-banner") as HTMLDivElement | null;
const ashtrayLobbyView = document.getElementById("ashtray-lobby-view") as HTMLDivElement | null;
const ashtrayGameView = document.getElementById("ashtray-game-view") as HTMLDivElement | null;
const ashtrayResultsView = document.getElementById("ashtray-results-view") as HTMLDivElement | null;
const ashtrayKeybindsDrawer = document.getElementById("ashtray-keybinds-drawer") as HTMLDivElement | null;
const btnAshtrayKeybinds = document.getElementById("btn-ashtray-keybinds") as HTMLButtonElement | null;
const btnCloseKeybinds = document.getElementById("btn-close-keybinds") as HTMLButtonElement | null;
const btnRemapKey1 = document.getElementById("btn-remap-key1") as HTMLButtonElement | null;
const btnRemapKey2 = document.getElementById("btn-remap-key2") as HTMLButtonElement | null;
const btnResetKeybinds = document.getElementById("btn-reset-keybinds") as HTMLButtonElement | null;
const ashtrayKeybindsSummary = document.getElementById("ashtray-keybinds-summary") as HTMLElement | null;
const keybindsStatusHint = document.getElementById("keybinds-status-hint") as HTMLElement | null;

// Lobby elements
const ashtrayLobbyStatusText = document.getElementById("ashtray-lobby-status-text") as HTMLElement | null;
const ashtrayStarterInfoBadge = document.getElementById("ashtray-starter-info-badge") as HTMLElement | null;
const inputAshtrayMashes = document.getElementById("input-ashtray-mashes") as HTMLInputElement | null;
const inputAshtrayTimer = document.getElementById("input-ashtray-timer") as HTMLInputElement | null;
const btnAshtrayStart = document.getElementById("btn-ashtray-start") as HTMLButtonElement | null;
const btnAshtrayReady = document.getElementById("btn-ashtray-ready") as HTMLButtonElement | null;
const btnAshtrayReadyText = document.getElementById("btn-ashtray-ready-text") as HTMLElement | null;
const ashtrayLobbyCount = document.getElementById("ashtray-lobby-count") as HTMLElement | null;
const ashtrayLobbyPlayersList = document.getElementById("ashtray-lobby-players-list") as HTMLDivElement | null;
const ashtrayCountdownOverlay = document.getElementById("ashtray-countdown-overlay") as HTMLDivElement | null;
const ashtrayCountdownNum = document.getElementById("ashtray-countdown-num") as HTMLElement | null;

// Game elements
const ashtrayLiveTimer = document.getElementById("ashtray-live-timer") as HTMLElement | null;
const ashtrayRuleMashes = document.getElementById("ashtray-rule-mashes") as HTMLElement | null;
const ashtrayLiveKeys = document.getElementById("ashtray-live-keys") as HTMLElement | null;
const cigaretteStageText = document.getElementById("cigarette-stage-text") as HTMLElement | null;
const cigaretteBurnOverlay = document.getElementById("cigarette-burn-overlay") as HTMLElement | null;
const cigaretteCherry = document.getElementById("cigarette-cherry") as HTMLElement | null;
const smokePuffContainer = document.getElementById("smoke-puff-container") as HTMLDivElement | null;
const spamKeysPrompt = document.getElementById("spam-keys-prompt") as HTMLElement | null;
const mashBtn1 = document.getElementById("mash-btn-1") as HTMLButtonElement | null;
const mashBtn2 = document.getElementById("mash-btn-2") as HTMLButtonElement | null;
const mashKey1Label = document.getElementById("mash-key-1-label") as HTMLElement | null;
const mashKey2Label = document.getElementById("mash-key-2-label") as HTMLElement | null;
const ashtrayMyFinished = document.getElementById("ashtray-my-finished") as HTMLElement | null;
const ashtrayMyCurrent = document.getElementById("ashtray-my-current") as HTMLElement | null;
const ashtrayMySpeed = document.getElementById("ashtray-my-speed") as HTMLElement | null;
const ashtrayPlayersLanes = document.getElementById("ashtray-players-lanes") as HTMLDivElement | null;

// Results elements
const ashtrayWinnerTitle = document.getElementById("ashtray-winner-title") as HTMLElement | null;
const ashtrayWinnerSub = document.getElementById("ashtray-winner-sub") as HTMLElement | null;
const ashtrayScoreboardBody = document.getElementById("ashtray-scoreboard-body") as HTMLTableSectionElement | null;
const btnAshtrayPlayAgain = document.getElementById("btn-ashtray-play-again") as HTMLButtonElement | null;
const btnAshtrayLeave = document.getElementById("btn-ashtray-leave") as HTMLButtonElement | null;

function setupSceneAshtrayEvents(scene: GameScene) {
  if (!scene) return;
  if ((scene as any)._ashtrayEventsBound) return;
  (scene as any)._ashtrayEventsBound = true;

  scene.onAshtrayClick = (atId: string) => {
    openSmokingGameModal(atId);
  };
}

function updateKeybindLabels() {
  if (mashKey1Label) mashKey1Label.textContent = smokeKey1;
  if (mashKey2Label) mashKey2Label.textContent = smokeKey2;
  if (btnRemapKey1) btnRemapKey1.textContent = smokeKey1;
  if (btnRemapKey2) btnRemapKey2.textContent = smokeKey2;
  if (ashtrayKeybindsSummary) ashtrayKeybindsSummary.textContent = `${smokeKey1} & ${smokeKey2}`;
  if (ashtrayLiveKeys) ashtrayLiveKeys.textContent = `${smokeKey1} & ${smokeKey2}`;
  if (spamKeysPrompt) {
    const nextKey = nextExpectedSlot === 1 ? smokeKey1 : smokeKey2;
    spamKeysPrompt.textContent = `Mash [ ${nextKey} ] next!`;
  }
}

function openSmokingGameModal(ashtrayId: string) {
  if (!ashtrayModal) return;
  activeAshtrayId = ashtrayId;
  ashtrayModal.classList.remove("hidden");
  setGameControlsActive(false);

  updateKeybindLabels();
  ashtrayKeybindsDrawer?.classList.add("hidden");
  remappingSlot = null;

  if (multiplayer) {
    multiplayer.joinSmokingGame(ashtrayId);
  }
}

function closeSmokingGameModal() {
  if (!ashtrayModal) return;
  stopSmokingGameTimers();
  if (activeAshtrayId && multiplayer) {
    multiplayer.leaveSmokingGame(activeAshtrayId);
  }
  activeAshtrayId = null;
  currentSmokingGameState = null;
  ashtrayModal.classList.add("hidden");
  ashtrayKeybindsDrawer?.classList.add("hidden");
  remappingSlot = null;
  setGameControlsActive(true);
}

function startSmokingGameTimers() {
  stopSmokingGameTimers();

  // Speed calculation every 500ms
  mashSpeedInterval = setInterval(() => {
    localMashesPerSec = parseFloat((localMashesThisWindow * 2).toFixed(1));
    localMashesThisWindow = 0;
    if (ashtrayMySpeed) ashtrayMySpeed.textContent = localMashesPerSec.toFixed(1);
  }, 500);

  // Live timer tick every 200ms
  liveTimerInterval = setInterval(() => {
    if (!currentSmokingGameState || currentSmokingGameState.status !== "smoking") return;
    const remaining = Math.max(0, Math.ceil((currentSmokingGameState.endTime - Date.now()) / 1000));
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    const formatted = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    if (ashtrayLiveTimer) {
      ashtrayLiveTimer.textContent = formatted;
      if (remaining <= 10) {
        ashtrayLiveTimer.classList.add("timer-warning");
      } else {
        ashtrayLiveTimer.classList.remove("timer-warning");
      }
    }
  }, 200);
}

function stopSmokingGameTimers() {
  if (mashSpeedInterval) {
    clearInterval(mashSpeedInterval);
    mashSpeedInterval = null;
  }
  if (liveTimerInterval) {
    clearInterval(liveTimerInterval);
    liveTimerInterval = null;
  }
}

function triggerSmokePuff(isBigRing: boolean = false) {
  if (!smokePuffContainer) return;
  const puff = document.createElement("div");
  puff.className = isBigRing ? "smoke-ring-burst" : "smoke-puff-particle";

  const offsetX = (Math.random() - 0.5) * 16;
  const offsetY = (Math.random() - 0.5) * 10;
  puff.style.left = `calc(50% + ${offsetX}px)`;
  puff.style.top = `calc(50% + ${offsetY}px)`;

  smokePuffContainer.appendChild(puff);
  setTimeout(() => {
    puff.remove();
  }, isBigRing ? 1200 : 700);
}

function handleMashInput(slot: 1 | 2) {
  if (!ashtrayModal || ashtrayModal.classList.contains("hidden")) return;
  if (!activeAshtrayId || !multiplayer || !currentSmokingGameState) return;
  if (currentSmokingGameState.status !== "smoking") return;

  const mySessionId = multiplayer.room?.sessionId || "";
  const me = currentSmokingGameState.players[mySessionId];
  if (!me || me.isViewer) return;

  // Enforce alternating keys!
  if (slot !== nextExpectedSlot) {
    // Incorrect button pressed: trigger slight warning feedback on wrong button
    const wrongBtn = slot === 1 ? mashBtn1 : mashBtn2;
    if (wrongBtn) {
      wrongBtn.classList.add("wrong-press");
      setTimeout(() => wrongBtn.classList.remove("wrong-press"), 100);
    }
    return;
  }

  // Valid alternating mash!
  const pressedBtn = slot === 1 ? mashBtn1 : mashBtn2;
  if (pressedBtn) {
    pressedBtn.classList.add("active-punch");
    setTimeout(() => pressedBtn.classList.remove("active-punch"), 80);
  }

  // Switch expected button
  nextExpectedSlot = slot === 1 ? 2 : 1;
  if (mashBtn1) mashBtn1.classList.toggle("next-expected", nextExpectedSlot === 1);
  if (mashBtn2) mashBtn2.classList.toggle("next-expected", nextExpectedSlot === 2);
  if (spamKeysPrompt) {
    const nextKey = nextExpectedSlot === 1 ? smokeKey1 : smokeKey2;
    spamKeysPrompt.textContent = `Mash [ ${nextKey} ] next!`;
  }

  localCurrentMashes++;
  localTotalMashes++;
  localMashesThisWindow++;

  const mashesPerCig = currentSmokingGameState.settings.mashesPerCigarette || 50;
  const isCigFinished = localCurrentMashes >= mashesPerCig;

  triggerSmokePuff(isCigFinished);

  if (isCigFinished) {
    localCigarettesFinished++;
    localCurrentMashes = 0;

    // Pulse cherry ember brightly
    if (cigaretteCherry) {
      cigaretteCherry.classList.add("cherry-flare");
      setTimeout(() => cigaretteCherry?.classList.remove("cherry-flare"), 400);
    }

    // Immediately notify server of finished cigarette
    lastMashReportedAt = Date.now();
    multiplayer.sendSmokingGameMash(
      activeAshtrayId,
      localCurrentMashes,
      localCigarettesFinished,
      localTotalMashes,
      localMashesPerSec
    );
  } else {
    // Throttled update to server
    const now = Date.now();
    if (now - lastMashReportedAt >= 100) {
      lastMashReportedAt = now;
      multiplayer.sendSmokingGameMash(
        activeAshtrayId,
        localCurrentMashes,
        localCigarettesFinished,
        localTotalMashes,
        localMashesPerSec
      );
    }
  }

  // Update personal interactive stage
  if (ashtrayMyFinished) ashtrayMyFinished.textContent = String(localCigarettesFinished);
  const myCurrentPct = Math.min(100, Math.max(0, Math.round((localCurrentMashes / mashesPerCig) * 100)));
  if (ashtrayMyCurrent) ashtrayMyCurrent.textContent = `${myCurrentPct}%`;
  if (cigaretteStageText) cigaretteStageText.textContent = `Smoking Cigarette #${localCigarettesFinished + 1}`;
  if (cigaretteBurnOverlay) {
    const burnPct = (localCurrentMashes / mashesPerCig) * 100;
    cigaretteBurnOverlay.style.width = `${burnPct}%`;
  }

  // Also update my row in the live lanes immediately for zero lag
  if (ashtrayPlayersLanes) {
    const myLane = ashtrayPlayersLanes.querySelector(`[data-session-id="${mySessionId}"]`);
    if (myLane) {
      const statsSpan = myLane.querySelector(".mini-bar-stats");
      const fillBar = myLane.querySelector(".smoking-mini-bar-fill") as HTMLElement | null;
      const finishedBadge = myLane.querySelector(".smoking-finished-badge");
      const totalMashesSpan = myLane.querySelector(".smoking-total-mashes");
      const mpsSpan = myLane.querySelector(".smoking-player-mps");

      const pct = Math.min(100, Math.max(0, Math.round((localCurrentMashes / mashesPerCig) * 100)));
      if (statsSpan) statsSpan.textContent = `${pct}%`;
      if (fillBar) fillBar.style.width = `${pct}%`;
      if (finishedBadge) finishedBadge.textContent = `🚬 ${localCigarettesFinished} ${localCigarettesFinished === 1 ? 'cigarette' : 'cigarettes'} finished`;
      if (totalMashesSpan) totalMashesSpan.textContent = `Total: ${localTotalMashes} mashes`;
      if (mpsSpan) mpsSpan.textContent = `${localMashesPerSec} mash/s`;
    }
  }
}

function updateSmokingGameUI(state: SmokingGameRoomState) {
  currentSmokingGameState = state;
  const mySessionId = multiplayer?.room?.sessionId || "";
  const players = Object.values(state.players);
  const me = state.players[mySessionId];
  const isViewer = me ? me.isViewer : false;
  const isStarter = state.starterSessionId === mySessionId;
  const starter = state.players[state.starterSessionId];

  // Viewer Banner
  if (ashtrayViewerBanner) {
    ashtrayViewerBanner.classList.toggle("hidden", !isViewer);
  }

  if (state.status === "waiting" || state.status === "starting") {
    stopSmokingGameTimers();
    ashtrayLobbyView?.classList.remove("hidden");
    ashtrayGameView?.classList.add("hidden");
    ashtrayResultsView?.classList.add("hidden");

    // Countdown overlay
    if (ashtrayCountdownOverlay && ashtrayCountdownNum) {
      if (state.status === "starting") {
        ashtrayCountdownOverlay.classList.remove("hidden");
        ashtrayCountdownNum.textContent = String(state.countdown || 3);
      } else {
        ashtrayCountdownOverlay.classList.add("hidden");
      }
    }

    // Starter Pill & Settings configuration
    if (ashtrayStarterInfoBadge) {
      if (isStarter) {
        ashtrayStarterInfoBadge.innerHTML = `👑 <strong>You are the Game Starter</strong> • Configure rules below`;
      } else {
        ashtrayStarterInfoBadge.innerHTML = `👑 Game Starter: <strong>${escapeHtml(starter?.name || "Waiting...")}</strong>`;
      }
    }

    if (inputAshtrayMashes) {
      if (document.activeElement !== inputAshtrayMashes) {
        inputAshtrayMashes.value = String(state.settings.mashesPerCigarette || 50);
      }
      inputAshtrayMashes.disabled = !isStarter;
    }

    if (inputAshtrayTimer) {
      if (document.activeElement !== inputAshtrayTimer) {
        inputAshtrayTimer.value = String(state.settings.gameDuration || 60);
      }
      inputAshtrayTimer.disabled = !isStarter;
    }

    // Preset pills active state
    document.querySelectorAll("#mashes-preset-pills .preset-pill").forEach((pill) => {
      const val = parseInt((pill as HTMLElement).dataset.val || "0", 10);
      pill.classList.toggle("active", val === state.settings.mashesPerCigarette);
      (pill as HTMLButtonElement).disabled = !isStarter;
    });

    document.querySelectorAll("#timer-preset-pills .preset-pill").forEach((pill) => {
      const val = parseInt((pill as HTMLElement).dataset.val || "0", 10);
      pill.classList.toggle("active", val === state.settings.gameDuration);
      (pill as HTMLButtonElement).disabled = !isStarter;
    });

    // Start / Ready Buttons
    if (btnAshtrayStart) {
      btnAshtrayStart.classList.toggle("hidden", !isStarter);
    }
    if (btnAshtrayReady) {
      btnAshtrayReady.classList.toggle("hidden", isStarter);
      if (me) {
        if (me.isReady) {
          btnAshtrayReady.classList.add("is-ready");
          if (btnAshtrayReadyText) btnAshtrayReadyText.textContent = "✓ Ready";
        } else {
          btnAshtrayReady.classList.remove("is-ready");
          if (btnAshtrayReadyText) btnAshtrayReadyText.textContent = "✓ Ready Up";
        }
      }
    }

    // Lobby status text
    const activePlayers = players.filter((p) => !p.isViewer);
    const readyPlayers = activePlayers.filter((p) => p.isReady);
    if (ashtrayLobbyStatusText) {
      ashtrayLobbyStatusText.textContent =
        state.status === "starting"
          ? `DUEL BEGINNING IN ${state.countdown || 3}...`
          : `LOBBY • ${readyPlayers.length}/${activePlayers.length} READY • STARTER: ${starter?.name || "Waiting"}`;
    }

    if (ashtrayLobbyCount) {
      ashtrayLobbyCount.textContent = `${players.length} ${players.length === 1 ? "Player" : "Players"}`;
    }

    // Render lobby players cards
    if (ashtrayLobbyPlayersList) {
      ashtrayLobbyPlayersList.innerHTML = "";
      for (const p of players) {
        const card = document.createElement("div");
        card.className = `ashtray-player-card ${p.isViewer ? "is-viewer" : ""} ${p.isStarter ? "is-starter" : ""}`;

        let statusBadge = "";
        if (p.isViewer) {
          statusBadge = `<span class="player-ready-tag viewer">👀 Spectator</span>`;
        } else if (p.isStarter) {
          statusBadge = `<span class="player-ready-tag starter">👑 Starter</span>`;
        } else if (p.isReady) {
          statusBadge = `<span class="player-ready-tag ready">✓ Ready</span>`;
        } else {
          statusBadge = `<span class="player-ready-tag waiting">⏳ Waiting</span>`;
        }

        const isMeTag = p.sessionId === mySessionId ? ` <span class="ashtray-you-tag">(You)</span>` : "";
        const avatarUrl = p.avatarUrl || "/assets/sprites/default/sprite1.png";

        card.innerHTML = `
          <div class="lobby-player-meta">
            <div class="lobby-avatar-wrap" style="border-color: ${p.color || '#3b82f6'};">
              <img src="${avatarUrl}" class="lobby-avatar-img" alt="${escapeHtml(p.name)}" />
            </div>
            <div class="lobby-player-name-box">
              <span class="lobby-player-name">${escapeHtml(p.name)}${isMeTag}</span>
              <span class="lobby-player-role">${p.isStarter ? "Game Starter" : "Duelist"}</span>
            </div>
          </div>
          ${statusBadge}
        `;
        ashtrayLobbyPlayersList.appendChild(card);
      }
    }

  } else if (state.status === "smoking") {
    ashtrayLobbyView?.classList.add("hidden");
    ashtrayGameView?.classList.remove("hidden");
    ashtrayResultsView?.classList.add("hidden");
    ashtrayCountdownOverlay?.classList.add("hidden");

    if (ashtrayRuleMashes) {
      ashtrayRuleMashes.textContent = String(state.settings.mashesPerCigarette || 50);
    }

    // Initialize personal metrics on first frame of game
    if (localTotalMashes === 0 && me) {
      localCurrentMashes = me.currentMashes || 0;
      localCigarettesFinished = me.cigarettesFinished || 0;
      localTotalMashes = me.totalMashes || 0;
      nextExpectedSlot = 1;
      startSmokingGameTimers();
    }

    const mashesNeeded = state.settings.mashesPerCigarette || 50;

    if (ashtrayMyFinished) ashtrayMyFinished.textContent = String(localCigarettesFinished);
    const myCurrentPct = Math.min(100, Math.max(0, Math.round((localCurrentMashes / mashesNeeded) * 100)));
    if (ashtrayMyCurrent) ashtrayMyCurrent.textContent = `${myCurrentPct}%`;

    // Render competitor lanes matching exact prompt requirements:
    // "modal will show players model with their name."
    // "beside will show mini progress bar of current cigeratte. based on how much have been mashed / total needed to mashed."
    // "under the mini progress will show total cigeratte already finished."
    if (ashtrayPlayersLanes) {
      ashtrayPlayersLanes.innerHTML = "";
      const competitors = players.filter((p) => !p.isViewer);

      for (const p of competitors) {
        const isMe = p.sessionId === mySessionId;
        const curMashes = isMe ? localCurrentMashes : (p.currentMashes || 0);
        const finishedCount = isMe ? localCigarettesFinished : (p.cigarettesFinished || 0);
        const pct = Math.min(100, Math.max(0, Math.round((curMashes / mashesNeeded) * 100)));
        const avatarUrl = p.avatarUrl || "/assets/sprites/default/sprite1.png";
        const isMeTag = isMe ? ` <span class="smoking-you-tag">(You)</span>` : "";
        const starterCrown = p.isStarter ? ` <span class="smoking-crown-icon" title="Starter">👑</span>` : "";

        const lane = document.createElement("div");
        lane.className = `smoking-lane-card ${isMe ? "is-me" : ""}`;
        lane.dataset.sessionId = p.sessionId;

        lane.innerHTML = `
          <!-- Player Model with Name -->
          <div class="smoking-lane-player">
            <div class="smoking-avatar-box" style="border-color: ${p.color || '#3b82f6'};">
              <img src="${avatarUrl}" class="smoking-avatar-img" alt="${escapeHtml(p.name)}" />
            </div>
            <div class="smoking-name-col">
              <span class="smoking-player-name">${escapeHtml(p.name)}${isMeTag}${starterCrown}</span>
              <span class="smoking-player-mps">${isMe ? localMashesPerSec : (p.mashesPerSecond || 0)} mash/s</span>
            </div>
          </div>

          <!-- Beside: Mini progress bar of current cigarette -->
          <div class="smoking-lane-progress-col">
            <div class="smoking-mini-bar-header">
              <span class="mini-bar-title">Current Cigarette</span>
              <span class="mini-bar-stats">${pct}%</span>
            </div>
            <div class="smoking-mini-bar-track">
              <div class="smoking-mini-bar-fill" style="width: ${pct}%; background: ${p.color || '#f97316'};">
                <span class="smoking-mini-ember">🔥</span>
              </div>
            </div>

            <!-- Under the mini progress: Total cigarettes already finished -->
            <div class="smoking-mini-finished-row">
              <span class="smoking-finished-badge">🚬 ${finishedCount} ${finishedCount === 1 ? 'cigarette' : 'cigarettes'} finished</span>
              <span class="smoking-total-mashes">Total: ${isMe ? localTotalMashes : (p.totalMashes || 0)} mashes</span>
            </div>
          </div>
        `;
        ashtrayPlayersLanes.appendChild(lane);
      }
    }

  } else if (state.status === "ended") {
    stopSmokingGameTimers();
    ashtrayLobbyView?.classList.add("hidden");
    ashtrayGameView?.classList.add("hidden");
    ashtrayResultsView?.classList.remove("hidden");
    ashtrayCountdownOverlay?.classList.add("hidden");

    const results = state.results || [];
    const winner = results[0];

    if (ashtrayWinnerTitle && ashtrayWinnerSub) {
      if (winner) {
        const isMeWinner = winner.sessionId === mySessionId;
        ashtrayWinnerTitle.textContent = isMeWinner
          ? `🏆 You Won the Smoking Duel!`
          : `🏆 ${winner.name} Won the Duel!`;
        ashtrayWinnerSub.textContent = `Smoked ${winner.cigarettesFinished} cigarettes with ${winner.totalMashes} total mashes!`;
      } else {
        ashtrayWinnerTitle.textContent = "Showdown Concluded!";
        ashtrayWinnerSub.textContent = "Final standings below:";
      }
    }

    if (ashtrayScoreboardBody) {
      ashtrayScoreboardBody.innerHTML = "";
      results.forEach((res) => {
        const row = document.createElement("tr");
        row.className = `rank-${res.rank <= 3 ? res.rank : "other"}`;

        let rankBadge = `#${res.rank}`;
        if (res.rank === 1) rankBadge = "🥇 1st";
        else if (res.rank === 2) rankBadge = "🥈 2nd";
        else if (res.rank === 3) rankBadge = "🥉 3rd";

        const isMeTag = res.sessionId === mySessionId ? ` <span style="font-size:10px;color:#94a3b8;">(You)</span>` : "";
        const avatarUrl = res.avatarUrl || "/assets/sprites/default/sprite1.png";

        row.innerHTML = `
          <td class="col-rank"><strong>${rankBadge}</strong></td>
          <td class="col-player">
            <div class="scoreboard-player-meta">
              <div class="scoreboard-avatar-wrap" style="border-color: ${res.color || '#3b82f6'};">
                <img src="${avatarUrl}" class="scoreboard-avatar-img" alt="${escapeHtml(res.name)}" />
              </div>
              <span class="scoreboard-player-name">${escapeHtml(res.name)}${isMeTag}</span>
            </div>
          </td>
          <td class="col-finished"><strong style="color:#f97316;font-size:15px;">🚬 ${res.cigarettesFinished}</strong></td>
          <td class="col-last">${res.currentMashes} mashes</td>
          <td class="col-speed">${res.mashesPerSecond || 0} mps</td>
          <td class="col-total">${res.totalMashes || 0}</td>
        `;
        ashtrayScoreboardBody.appendChild(row);
      });
    }
  }
}

// Remap Keybinds Logic
function setRemappingSlot(slot: 1 | 2 | null) {
  remappingSlot = slot;
  if (btnRemapKey1) {
    btnRemapKey1.classList.toggle("is-remapping", slot === 1);
    btnRemapKey1.textContent = slot === 1 ? "Press key..." : smokeKey1;
  }
  if (btnRemapKey2) {
    btnRemapKey2.classList.toggle("is-remapping", slot === 2);
    btnRemapKey2.textContent = slot === 2 ? "Press key..." : smokeKey2;
  }
  if (keybindsStatusHint) {
    if (slot === 1) keybindsStatusHint.textContent = "Press any keyboard key to set Button 1.";
    else if (slot === 2) keybindsStatusHint.textContent = "Press any keyboard key to set Button 2.";
    else keybindsStatusHint.textContent = `Current keys: [${smokeKey1}] and [${smokeKey2}]`;
  }
}

if (btnAshtrayKeybinds) {
  btnAshtrayKeybinds.addEventListener("click", () => {
    ashtrayKeybindsDrawer?.classList.toggle("hidden");
    setRemappingSlot(null);
  });
}

if (btnCloseKeybinds) {
  btnCloseKeybinds.addEventListener("click", () => {
    ashtrayKeybindsDrawer?.classList.add("hidden");
    setRemappingSlot(null);
  });
}

if (btnRemapKey1) {
  btnRemapKey1.addEventListener("click", () => {
    setRemappingSlot(1);
  });
}

if (btnRemapKey2) {
  btnRemapKey2.addEventListener("click", () => {
    setRemappingSlot(2);
  });
}

if (btnResetKeybinds) {
  btnResetKeybinds.addEventListener("click", () => {
    smokeKey1 = "A";
    smokeKey2 = "D";
    localStorage.setItem("lepark_smoke_key1", smokeKey1);
    localStorage.setItem("lepark_smoke_key2", smokeKey2);
    setRemappingSlot(null);
    updateKeybindLabels();
  });
}

// Global keydown capture for remapping and mashing
window.addEventListener("keydown", (e: KeyboardEvent) => {
  // 1. Remap mode
  if (remappingSlot !== null) {
    if (e.key === "Escape") {
      setRemappingSlot(null);
      return;
    }
    const ignoredKeys = new Set(["Shift", "Control", "Alt", "Meta", "Tab", "CapsLock", "ContextMenu"]);
    if (ignoredKeys.has(e.key)) return;

    e.preventDefault();
    e.stopPropagation();

    let cleanKey = e.key.toUpperCase();
    if (cleanKey === " ") cleanKey = "SPACE";
    else if (cleanKey.length > 5) cleanKey = e.code.replace("Key", "").replace("Digit", "").toUpperCase();

    if (remappingSlot === 1) {
      if (cleanKey === smokeKey2) {
        alert("Button 1 cannot be the same as Button 2!");
        return;
      }
      smokeKey1 = cleanKey;
      localStorage.setItem("lepark_smoke_key1", smokeKey1);
    } else if (remappingSlot === 2) {
      if (cleanKey === smokeKey1) {
        alert("Button 2 cannot be the same as Button 1!");
        return;
      }
      smokeKey2 = cleanKey;
      localStorage.setItem("lepark_smoke_key2", smokeKey2);
    }

    setRemappingSlot(null);
    updateKeybindLabels();
    return;
  }

  // 2. Button spamming in game
  if (ashtrayModal && !ashtrayModal.classList.contains("hidden")) {
    if (currentSmokingGameState && currentSmokingGameState.status === "smoking") {
      let keyUpper = e.key.toUpperCase();
      if (keyUpper === " ") keyUpper = "SPACE";

      if (keyUpper === smokeKey1) {
        e.preventDefault();
        e.stopPropagation();
        handleMashInput(1);
        return;
      } else if (keyUpper === smokeKey2) {
        e.preventDefault();
        e.stopPropagation();
        handleMashInput(2);
        return;
      }
    }
  }
});

// Mash buttons click handlers (for mouse or touch)
if (mashBtn1) {
  mashBtn1.addEventListener("click", () => {
    handleMashInput(1);
  });
}
if (mashBtn2) {
  mashBtn2.addEventListener("click", () => {
    handleMashInput(2);
  });
}

// Starter settings input change handlers
if (inputAshtrayMashes) {
  inputAshtrayMashes.addEventListener("change", () => {
    if (!activeAshtrayId || !multiplayer || !currentSmokingGameState) return;
    const mySessionId = multiplayer.room?.sessionId || "";
    if (currentSmokingGameState.starterSessionId !== mySessionId) return;
    const val = parseInt(inputAshtrayMashes.value, 10);
    if (!isNaN(val) && val >= 5) {
      multiplayer.updateSmokingGameSettings(activeAshtrayId, { mashesPerCigarette: val });
    }
  });
}

if (inputAshtrayTimer) {
  inputAshtrayTimer.addEventListener("change", () => {
    if (!activeAshtrayId || !multiplayer || !currentSmokingGameState) return;
    const mySessionId = multiplayer.room?.sessionId || "";
    if (currentSmokingGameState.starterSessionId !== mySessionId) return;
    const val = parseInt(inputAshtrayTimer.value, 10);
    if (!isNaN(val) && val >= 10) {
      multiplayer.updateSmokingGameSettings(activeAshtrayId, { gameDuration: val });
    }
  });
}

// Preset pills click handlers
document.querySelectorAll("#mashes-preset-pills .preset-pill").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (!activeAshtrayId || !multiplayer || !currentSmokingGameState) return;
    const mySessionId = multiplayer.room?.sessionId || "";
    if (currentSmokingGameState.starterSessionId !== mySessionId) return;
    const val = parseInt((btn as HTMLElement).dataset.val || "50", 10);
    if (inputAshtrayMashes) inputAshtrayMashes.value = String(val);
    multiplayer.updateSmokingGameSettings(activeAshtrayId, { mashesPerCigarette: val });
  });
});

document.querySelectorAll("#timer-preset-pills .preset-pill").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (!activeAshtrayId || !multiplayer || !currentSmokingGameState) return;
    const mySessionId = multiplayer.room?.sessionId || "";
    if (currentSmokingGameState.starterSessionId !== mySessionId) return;
    const val = parseInt((btn as HTMLElement).dataset.val || "60", 10);
    if (inputAshtrayTimer) inputAshtrayTimer.value = String(val);
    multiplayer.updateSmokingGameSettings(activeAshtrayId, { gameDuration: val });
  });
});

// Start button (starter only)
if (btnAshtrayStart) {
  btnAshtrayStart.addEventListener("click", () => {
    if (!activeAshtrayId || !multiplayer || !currentSmokingGameState) return;
    const mySessionId = multiplayer.room?.sessionId || "";
    if (currentSmokingGameState.starterSessionId !== mySessionId) return;
    multiplayer.startSmokingGame(activeAshtrayId);
  });
}

// Ready button (non-starters)
if (btnAshtrayReady) {
  btnAshtrayReady.addEventListener("click", () => {
    if (!activeAshtrayId || !multiplayer || !currentSmokingGameState) return;
    const mySessionId = multiplayer.room?.sessionId || "";
    const me = currentSmokingGameState.players[mySessionId];
    if (!me || me.isViewer) return;
    multiplayer.setSmokingGameReady(activeAshtrayId, !me.isReady);
  });
}

// Play again & leave buttons
if (btnAshtrayPlayAgain) {
  btnAshtrayPlayAgain.addEventListener("click", () => {
    if (!activeAshtrayId || !multiplayer) return;
    multiplayer.requestSmokingGamePlayAgain(activeAshtrayId);
  });
}

if (btnAshtrayLeave) {
  btnAshtrayLeave.addEventListener("click", () => {
    closeSmokingGameModal();
  });
}

if (btnCloseAshtrayModal) {
  btnCloseAshtrayModal.addEventListener("click", () => {
    closeSmokingGameModal();
  });
}

if (ashtrayModal) {
  ashtrayModal.addEventListener("click", (e) => {
    if (e.target === ashtrayModal) {
      closeSmokingGameModal();
    }
  });
}

function setupMultiplayerSmokingGameListeners(mgr: MultiplayerManager) {
  mgr.onSmokingGameState((state) => {
    updateSmokingGameUI(state);
  });

  mgr.onSmokingGameStart((state) => {
    if (state.ashtrayId === activeAshtrayId) {
      localCurrentMashes = 0;
      localCigarettesFinished = 0;
      localTotalMashes = 0;
      localMashesThisWindow = 0;
      localMashesPerSec = 0;
      nextExpectedSlot = 1;
      startSmokingGameTimers();
      updateSmokingGameUI(state);
    }
  });

  mgr.onSmokingGameEnded((data) => {
    if (data.ashtrayId === activeAshtrayId && currentSmokingGameState) {
      currentSmokingGameState.status = "ended";
      currentSmokingGameState.results = data.results;
      updateSmokingGameUI(currentSmokingGameState);
    }
  });

  mgr.onAshtrayDelete((ashtrayId) => {
    if (activeAshtrayId === ashtrayId) {
      closeSmokingGameModal();
    }
  });
}

// ============================================================================
// CHESS GAME CONTROLLER & UI
// ============================================================================

// DOM Elements
const chessModal = document.getElementById("chess-modal") as HTMLDivElement | null;
const btnCloseChessModal = document.getElementById("btn-close-chess-modal") as HTMLButtonElement | null;
const chessLobbyView = document.getElementById("chess-lobby-view") as HTMLDivElement | null;
const chessGameView = document.getElementById("chess-game-view") as HTMLDivElement | null;

// Lobby View Elements
const chessWaitingGrid = document.getElementById("chess-waiting-grid") as HTMLDivElement | null;
const chessWaitingCountPill = document.getElementById("chess-waiting-count-pill") as HTMLElement | null;
const btnChessJoinMatch = document.getElementById("btn-chess-join-match") as HTMLButtonElement | null;
const chessQueueStatus = document.getElementById("chess-queue-status") as HTMLDivElement | null;
const chessQueueText = document.getElementById("chess-queue-text") as HTMLElement | null;
const btnChessCancelJoin = document.getElementById("btn-chess-cancel-join") as HTMLButtonElement | null;
const chessOngoingCountPill = document.getElementById("chess-ongoing-count-pill") as HTMLElement | null;
const chessGamesGrid = document.getElementById("chess-games-grid") as HTMLDivElement | null;
const chessGamesEmpty = document.getElementById("chess-games-empty") as HTMLDivElement | null;

// Game View Elements
const btnChessBackToLobby = document.getElementById("btn-chess-back-to-lobby") as HTMLButtonElement | null;
const chessMatchStatusBadge = document.getElementById("chess-match-status-badge") as HTMLElement | null;
const btnChessFlipBoard = document.getElementById("btn-chess-flip-board") as HTMLButtonElement | null;
const btnChessOfferDraw = document.getElementById("btn-chess-offer-draw") as HTMLButtonElement | null;
const btnChessResign = document.getElementById("btn-chess-resign") as HTMLButtonElement | null;
const btnChessRematch = document.getElementById("btn-chess-rematch") as HTMLButtonElement | null;

// Player Top Bar Elements
const chessPlayerWhiteCard = document.getElementById("chess-player-white-card") as HTMLDivElement | null;
const chessWhiteAvatar = document.getElementById("chess-white-avatar") as HTMLImageElement | null;
const chessWhiteName = document.getElementById("chess-white-name") as HTMLElement | null;
const chessWhiteTurnPill = document.getElementById("chess-white-turn-pill") as HTMLElement | null;
const chessWhiteCaptured = document.getElementById("chess-white-captured") as HTMLDivElement | null;

const chessMoveCounter = document.getElementById("chess-move-counter") as HTMLElement | null;

const chessPlayerBlackCard = document.getElementById("chess-player-black-card") as HTMLDivElement | null;
const chessBlackAvatar = document.getElementById("chess-black-avatar") as HTMLImageElement | null;
const chessBlackName = document.getElementById("chess-black-name") as HTMLElement | null;
const chessBlackTurnPill = document.getElementById("chess-black-turn-pill") as HTMLElement | null;
const chessBlackCaptured = document.getElementById("chess-black-captured") as HTMLDivElement | null;

// Board Elements
const chessBoardGrid = document.getElementById("chess-board-grid") as HTMLDivElement | null;
const chessPromotionDialog = document.getElementById("chess-promotion-dialog") as HTMLDivElement | null;
const promotionChoices = document.getElementById("promotion-choices") as HTMLDivElement | null;

// Sidebar Elements
const chessSpectatorsCount = document.getElementById("chess-spectators-count") as HTMLElement | null;
const chessSpectatorsList = document.getElementById("chess-spectators-list") as HTMLDivElement | null;
const chessHistoryList = document.getElementById("chess-history-list") as HTMLDivElement | null;

// State
let activeChessBoardId: string | null = null;
let currentChessLobbyState: ChessLobbyState | null = null;
let currentChessGameState: ChessGameState | null = null;
let localChessInstance: Chess = new Chess();
let selectedSquare: string | null = null;
let legalMovesForSelected: string[] = [];
let isBoardFlipped: boolean = false;
let pendingPromotionMove: { from: string; to: string } | null = null;

function setupSceneChessEvents(scene: GameScene) {
  if (!scene) return;
  if ((scene as any)._chessEventsBound) return;
  (scene as any)._chessEventsBound = true;

  scene.onChessBoardClick = (cbId: string) => {
    openChessModal(cbId);
  };
}

let fishingGame: FishingGame | null = null;

function setupSceneAquariumEvents(scene: GameScene) {
  if (!scene) return;
  if ((scene as any)._aquariumEventsBound) return;
  (scene as any)._aquariumEventsBound = true;

  if (!fishingGame) {
    fishingGame = new FishingGame();
    fishingGame.init();
    fishingGame.setControlsActiveCallback((active) => {
      setGameControlsActive(active);
    });
    fishingGame.setBroadcastCallback((fish, size, quality) => {
      if (multiplayer) {
        multiplayer.sendChatMessage({
          roomType: "map",
          text: `🎣 Caught a ${quality.toUpperCase()} ${fish.name} (${size} in) at the Aquarium!`,
        });
      }
    });
  }

  scene.onAquariumClick = (aqId: string) => {
    fishingGame?.open(aqId);
  };
}

function openChessModal(chessBoardId: string) {
  if (!chessModal) return;
  activeChessBoardId = chessBoardId;
  chessModal.classList.remove("hidden");
  setGameControlsActive(false);

  // Always show lobby view; matches cannot be resumed once left
  showChessLobbyView();

  if (multiplayer) {
    multiplayer.openChessLobby(chessBoardId);
  }
}

function closeChessModal() {
  if (!chessModal) return;
  chessModal.classList.add("hidden");
  setGameControlsActive(true);

  if (activeChessBoardId && multiplayer) {
    const mySid = multiplayer.room?.sessionId;
    const isPlayer =
      currentChessGameState &&
      mySid &&
      (currentChessGameState.whitePlayer?.sessionId === mySid ||
        currentChessGameState.blackPlayer?.sessionId === mySid);

    if (currentChessGameState) {
      if (currentChessGameState.status === "playing" && isPlayer) {
        // Leaving while playing ends the game straight up
        multiplayer.leaveChessMatch(activeChessBoardId, currentChessGameState.matchId);
      } else if (
        mySid &&
        currentChessGameState.spectators &&
        currentChessGameState.spectators[mySid]
      ) {
        multiplayer.leaveChessMatch(activeChessBoardId, currentChessGameState.matchId);
      }
    }

    // Cancel own waiting game if modal is closed while waiting
    const myWaitingMatch = currentChessLobbyState?.waitingMatches?.find(
      (m) => m.whitePlayer?.sessionId === mySid
    );
    if (myWaitingMatch) {
      multiplayer.cancelChessJoin(activeChessBoardId);
    }

    multiplayer.leaveChessLobby(activeChessBoardId);
  }

  currentChessGameState = null;
  selectedSquare = null;
  legalMovesForSelected = [];
  if (chessPromotionDialog) chessPromotionDialog.classList.add("hidden");
}

function showChessLobbyView() {
  if (chessLobbyView) chessLobbyView.classList.remove("hidden");
  if (chessGameView) chessGameView.classList.add("hidden");
  if (activeChessBoardId && multiplayer) {
    multiplayer.openChessLobby(activeChessBoardId);
  }
}

function showChessGameView() {
  if (chessLobbyView) chessLobbyView.classList.add("hidden");
  if (chessGameView) chessGameView.classList.remove("hidden");
}

function renderChessLobby(state: ChessLobbyState) {
  currentChessLobbyState = state;
  const mySessionId = multiplayer?.room?.sessionId;

  // 1. Render Waiting Games Grid (Lounge Section)
  const waitingMatches = state.waitingMatches || [];
  if (chessWaitingCountPill) {
    chessWaitingCountPill.textContent = `${waitingMatches.length} Open Match${waitingMatches.length === 1 ? "" : "es"}`;
  }

  const myWaitingMatch = waitingMatches.find(
    (m) => m.whitePlayer?.sessionId === mySessionId
  );
  const otherWaitingMatches = waitingMatches.filter(
    (m) => m.whitePlayer?.sessionId !== mySessionId
  );

  if (chessWaitingGrid) {
    chessWaitingGrid.innerHTML = "";

    // FIRST ITEM IN GRID: "Create Game" (or your own hosted waiting game)
    if (!myWaitingMatch) {
      const createCard = document.createElement("div");
      createCard.className = "chess-waiting-card chess-create-card";
      createCard.title = "Host a new chess game as White";
      createCard.innerHTML = `
        <div class="chess-create-card-inner">
          <div class="chess-create-icon-badge">
            <span class="chess-create-icon">➕</span>
          </div>
          <div class="chess-create-info">
            <h4 class="chess-create-title">Create Game</h4>
            <p class="chess-create-desc">Host a match as White ⚪ and wait for a second player to join</p>
          </div>
          <button type="button" class="btn-create-chess-game">
            <span>➕ Create Game</span>
          </button>
        </div>
      `;

      createCard.addEventListener("click", () => {
        if (!activeChessBoardId || !multiplayer) return;
        multiplayer.createChessMatch(activeChessBoardId);
      });

      chessWaitingGrid.appendChild(createCard);
    } else {
      // Local player has created a game and is waiting for player 2
      const myCard = document.createElement("div");
      myCard.className = "chess-waiting-card chess-my-waiting-card";
      const hostName = myWaitingMatch.whitePlayer?.name || "You";
      const hostAvatar = myWaitingMatch.whitePlayer?.avatarUrl || "/assets/sprites/default/sprite1.png";

      myCard.innerHTML = `
        <div class="chess-card-top-row">
          <span class="chess-card-match-id">Match #${myWaitingMatch.matchId.slice(-6)} <span class="chess-you-pill">(You)</span></span>
          <span class="chess-card-status-pill waiting">
            <span class="chess-card-pulse-dot"></span> Waiting for Opponent
          </span>
        </div>
        <div class="chess-card-players-row">
          <div class="chess-card-player-item" title="Host: ${escapeHtml(hostName)}">
            <img src="${hostAvatar}" class="chess-card-player-avatar" alt="${escapeHtml(hostName)}" />
            <span class="chess-card-player-name">⚪ ${escapeHtml(hostName)}</span>
          </div>
          <span class="chess-card-vs">VS</span>
          <div class="chess-card-player-item waiting-slot" title="Waiting for player 2 to join...">
            <div class="chess-slot-avatar-placeholder">⏳</div>
            <span class="chess-card-player-name slot-hint">⚫ Open Slot</span>
          </div>
        </div>
        <div class="chess-card-footer">
          <div class="chess-waiting-status-text">
            <span class="chess-queue-spinner"></span>
            <span>Waiting for Player 2...</span>
          </div>
          <button type="button" class="btn-cancel-waiting-game" title="Cancel this game">
            ✕ Cancel Game
          </button>
        </div>
      `;

      const btnCancel = myCard.querySelector(".btn-cancel-waiting-game");
      if (btnCancel) {
        btnCancel.addEventListener("click", (e) => {
          e.stopPropagation();
          if (!activeChessBoardId || !multiplayer) return;
          multiplayer.cancelChessJoin(activeChessBoardId);
        });
      }

      chessWaitingGrid.appendChild(myCard);
    }

    // OTHER ITEMS IN GRID: List of games waiting for player second to join
    otherWaitingMatches.forEach((game) => {
      const card = document.createElement("div");
      card.className = "chess-waiting-card";

      const hostName = game.whitePlayer?.name || "Player 1";
      const hostAvatar = game.whitePlayer?.avatarUrl || "/assets/sprites/default/sprite1.png";

      card.innerHTML = `
        <div class="chess-card-top-row">
          <span class="chess-card-match-id">Match #${game.matchId.slice(-6)}</span>
          <span class="chess-card-status-pill waiting">
            <span class="chess-card-pulse-dot"></span> Open Challenge
          </span>
        </div>
        <div class="chess-card-players-row">
          <div class="chess-card-player-item" title="Host: ${escapeHtml(hostName)}">
            <img src="${hostAvatar}" class="chess-card-player-avatar" alt="${escapeHtml(hostName)}" />
            <span class="chess-card-player-name">⚪ ${escapeHtml(hostName)}</span>
          </div>
          <span class="chess-card-vs">VS</span>
          <div class="chess-card-player-item waiting-slot" title="Waiting for second player!">
            <div class="chess-slot-avatar-placeholder">⚔️</div>
            <span class="chess-card-player-name slot-hint">⚫ Join as Player 2</span>
          </div>
        </div>
        <div class="chess-card-footer">
          <div class="chess-waiting-meta">
            <span>♟️ Ready for Challenger</span>
          </div>
          <button type="button" class="btn-join-waiting-game" data-match-id="${game.matchId}">
            ⚔️ Join Game
          </button>
        </div>
      `;

      const btnJoin = card.querySelector(".btn-join-waiting-game");
      if (btnJoin) {
        btnJoin.addEventListener("click", (e) => {
          e.stopPropagation();
          if (!activeChessBoardId || !multiplayer) return;
          multiplayer.joinChessMatch(activeChessBoardId, game.matchId);
        });
      }

      chessWaitingGrid.appendChild(card);
    });

    if (otherWaitingMatches.length === 0 && !myWaitingMatch) {
      const hintCard = document.createElement("div");
      hintCard.className = "chess-waiting-card chess-waiting-hint-card";
      hintCard.innerHTML = `
        <div class="chess-hint-content">
          <span class="chess-hint-icon">♟️</span>
          <strong class="chess-hint-title">No other players waiting</strong>
          <span class="chess-hint-desc">Click "Create Game" to host a match and wait for a challenger!</span>
        </div>
      `;
      chessWaitingGrid.appendChild(hintCard);
    }
  }

  // 2. Render ongoing games
  const ongoing = state.ongoingGames || [];
  if (chessOngoingCountPill) {
    chessOngoingCountPill.textContent = `${ongoing.length} Active Match${ongoing.length === 1 ? "" : "es"}`;
  }

  if (!chessGamesGrid) return;
  chessGamesGrid.innerHTML = "";

  if (ongoing.length === 0) {
    if (chessGamesEmpty) chessGamesEmpty.classList.remove("hidden");
  } else {
    if (chessGamesEmpty) chessGamesEmpty.classList.add("hidden");

    ongoing.forEach((game) => {
      const card = document.createElement("div");
      card.className = "chess-game-card";

      const turnLabel = game.turn === "white" ? "White's Turn" : "Black's Turn";
      const statusClass = game.inCheck ? "chess-card-status-pill check" : "chess-card-status-pill";
      const statusText = game.inCheck ? `⚠️ Check! (${turnLabel})` : `🟢 In Progress • ${turnLabel}`;

      const whiteName = game.whitePlayer?.name || "Player 1";
      const whiteAvatar = game.whitePlayer?.avatarUrl || "/assets/sprites/default/sprite1.png";
      const blackName = game.blackPlayer?.name || "Player 2";
      const blackAvatar = game.blackPlayer?.avatarUrl || "/assets/sprites/default/sprite1.png";

      card.innerHTML = `
        <div class="chess-card-top-row">
          <span class="chess-card-match-id">Match #${game.matchId.slice(-6)}</span>
          <span class="${statusClass}">${statusText}</span>
        </div>
        <div class="chess-card-players-row">
          <div class="chess-card-player-item" title="White: ${escapeHtml(whiteName)}">
            <img src="${whiteAvatar}" class="chess-card-player-avatar" alt="${escapeHtml(whiteName)}" />
            <span class="chess-card-player-name">⚪ ${escapeHtml(whiteName)}</span>
          </div>
          <span class="chess-card-vs">VS</span>
          <div class="chess-card-player-item" title="Black: ${escapeHtml(blackName)}">
            <img src="${blackAvatar}" class="chess-card-player-avatar" alt="${escapeHtml(blackName)}" />
            <span class="chess-card-player-name">⚫ ${escapeHtml(blackName)}</span>
          </div>
        </div>
        <div class="chess-card-footer">
          <div class="chess-card-meta">
            <span>♟️ ${game.moveCount} moves</span>
            <span>👀 ${game.spectatorCount}</span>
          </div>
          <button type="button" class="btn-spectate-game" data-match-id="${game.matchId}">
            👁️ Spectate
          </button>
        </div>
      `;

      const btnSpectate = card.querySelector(".btn-spectate-game");
      if (btnSpectate) {
        btnSpectate.addEventListener("click", () => {
          if (activeChessBoardId && multiplayer) {
            multiplayer.spectateChessMatch(activeChessBoardId, game.matchId);
          }
        });
      }

      chessGamesGrid.appendChild(card);
    });
  }
}

function renderChessGame(state: ChessGameState) {
  currentChessGameState = state;
  showChessGameView();

  try {
    localChessInstance = new Chess();
    if (state.fen) {
      localChessInstance.load(state.fen);
    }
  } catch (err) {
    console.error("Error loading chess FEN:", err);
  }

  const mySessionId = multiplayer?.room?.sessionId;
  const isWhite = state.whitePlayer?.sessionId === mySessionId;
  const isBlack = state.blackPlayer?.sessionId === mySessionId;
  const isPlaying = isWhite || isBlack;

  // Auto flip board for black player if not manually toggled
  if (isBlack && !isBoardFlipped) {
    isBoardFlipped = true;
  } else if (isWhite && isBoardFlipped) {
    isBoardFlipped = false;
  }

  // 1. Update status badge
  if (chessMatchStatusBadge) {
    if (state.status === "checkmate") {
      const winnerName = state.winner === "white" ? state.whitePlayer?.name : state.blackPlayer?.name;
      chessMatchStatusBadge.textContent = `🏆 Checkmate! ${winnerName || "Winner"} wins!`;
      chessMatchStatusBadge.style.borderColor = "#eab308";
    } else if (state.status === "resigned") {
      chessMatchStatusBadge.textContent = `🏳️ ${state.winReason || "Game ended by resignation"}`;
      chessMatchStatusBadge.style.borderColor = "#ef4444";
    } else if (state.status === "draw" || state.status === "stalemate") {
      chessMatchStatusBadge.textContent = `🤝 ${state.winReason || "Game drawn"}`;
      chessMatchStatusBadge.style.borderColor = "#3b82f6";
    } else if (state.inCheck) {
      const turnName = state.turn === "white" ? state.whitePlayer?.name : state.blackPlayer?.name;
      chessMatchStatusBadge.textContent = `⚠️ Check! (${turnName}'s turn)`;
      chessMatchStatusBadge.style.borderColor = "#ef4444";
    } else {
      const turnName = state.turn === "white" ? state.whitePlayer?.name : state.blackPlayer?.name;
      chessMatchStatusBadge.textContent = `${turnName || state.turn}'s turn (${state.turn === "white" ? "White ⚪" : "Black ⚫"})`;
      chessMatchStatusBadge.style.borderColor = "rgba(168, 85, 247, 0.4)";
    }
  }

  // 2. Action buttons visibility
  if (btnChessResign) {
    btnChessResign.classList.toggle("hidden", !isPlaying || state.status !== "playing");
  }
  if (btnChessOfferDraw) {
    btnChessOfferDraw.classList.toggle("hidden", !isPlaying || state.status !== "playing");
    if (state.drawOffer && state.drawOffer !== (isWhite ? "white" : "black")) {
      btnChessOfferDraw.textContent = "🤝 Accept Draw";
    } else {
      btnChessOfferDraw.textContent = "🤝 Draw";
    }
  }
  if (btnChessRematch) {
    btnChessRematch.classList.add("hidden");
  }

  // 3. Top players bar
  if (chessWhiteName) chessWhiteName.textContent = state.whitePlayer?.name || "Waiting...";
  if (chessWhiteAvatar && state.whitePlayer?.avatarUrl) chessWhiteAvatar.src = state.whitePlayer.avatarUrl;
  if (chessBlackName) chessBlackName.textContent = state.blackPlayer?.name || "Waiting...";
  if (chessBlackAvatar && state.blackPlayer?.avatarUrl) chessBlackAvatar.src = state.blackPlayer.avatarUrl;

  const isWhiteTurn = state.status === "playing" && state.turn === "white";
  const isBlackTurn = state.status === "playing" && state.turn === "black";
  if (chessPlayerWhiteCard) chessPlayerWhiteCard.classList.toggle("active-turn", isWhiteTurn);
  if (chessPlayerBlackCard) chessPlayerBlackCard.classList.toggle("active-turn", isBlackTurn);

  if (chessMoveCounter) {
    const moveNum = Math.floor(state.history.length / 2) + 1;
    chessMoveCounter.textContent = `Move ${moveNum}`;
  }

  // Update captured pieces
  updateCapturedPieces();

  // 4. Render 8x8 Board
  renderChessBoard();

  // 5. Update spectators list
  renderSpectatorsList(state.spectators);

  // 6. Update move history
  renderMoveHistory(state.history);
}

function updateCapturedPieces() {
  const pieces: Record<"w" | "b", Record<string, number>> = {
    w: { p: 8, r: 2, n: 2, b: 2, q: 1 },
    b: { p: 8, r: 2, n: 2, b: 2, q: 1 },
  };

  const board = localChessInstance.board();
  for (const row of board) {
    for (const sq of row) {
      if (sq && sq.type !== "k") {
        pieces[sq.color][sq.type]--;
      }
    }
  }

  const pieceNameMap: Record<string, string> = {
    p: "pawn",
    r: "rook",
    n: "knight",
    b: "bishop",
    q: "queen",
  };

  // Pieces captured by White are black pieces
  if (chessWhiteCaptured) {
    chessWhiteCaptured.innerHTML = "";
    for (const [type, count] of Object.entries(pieces.b)) {
      for (let i = 0; i < count; i++) {
        const img = document.createElement("img");
        img.src = `/assets/decoration/Free/chess/black-${pieceNameMap[type]}.png`;
        img.className = "chess-captured-mini-piece";
        img.alt = `Captured ${pieceNameMap[type]}`;
        chessWhiteCaptured.appendChild(img);
      }
    }
  }

  // Pieces captured by Black are white pieces
  if (chessBlackCaptured) {
    chessBlackCaptured.innerHTML = "";
    for (const [type, count] of Object.entries(pieces.w)) {
      for (let i = 0; i < count; i++) {
        const img = document.createElement("img");
        img.src = `/assets/decoration/Free/chess/white-${pieceNameMap[type]}.png`;
        img.className = "chess-captured-mini-piece";
        img.alt = `Captured ${pieceNameMap[type]}`;
        chessBlackCaptured.appendChild(img);
      }
    }
  }
}

function renderChessBoard() {
  if (!chessBoardGrid) return;
  chessBoardGrid.innerHTML = "";

  const files = isBoardFlipped
    ? ["h", "g", "f", "e", "d", "c", "b", "a"]
    : ["a", "b", "c", "d", "e", "f", "g", "h"];
  const ranks = isBoardFlipped
    ? [1, 2, 3, 4, 5, 6, 7, 8]
    : [8, 7, 6, 5, 4, 3, 2, 1];

  for (let r = 0; r < 8; r++) {
    const rank = ranks[r];
    for (let f = 0; f < 8; f++) {
      const file = files[f];
      const square = `${file}${rank}`;
      const isLight = (file.charCodeAt(0) + rank) % 2 !== 0;

      const squareEl = document.createElement("div");
      squareEl.className = `chess-square ${isLight ? "light-square" : "dark-square"}`;
      squareEl.dataset.square = square;

      // Selection highlight
      if (selectedSquare === square) {
        squareEl.classList.add("selected-square");
      }

      // Last move highlight
      if (
        currentChessGameState?.lastMove &&
        (currentChessGameState.lastMove.from === square || currentChessGameState.lastMove.to === square)
      ) {
        squareEl.classList.add("last-move-square");
      }

      // Check highlight for King in check
      if (currentChessGameState?.inCheck) {
        const piece = localChessInstance.get(square as any);
        if (
          piece &&
          piece.type === "k" &&
          ((piece.color === "w" && currentChessGameState.turn === "white") ||
            (piece.color === "b" && currentChessGameState.turn === "black"))
        ) {
          squareEl.classList.add("in-check-square");
        }
      }

      // Legal moves highlight
      if (legalMovesForSelected.includes(square)) {
        const piece = localChessInstance.get(square as any);
        if (piece) {
          squareEl.classList.add("legal-capture");
        } else {
          squareEl.classList.add("legal-target");
        }
      }

      // Outer rank and file coordinate labels
      if (r === 7) {
        const fileLabel = document.createElement("span");
        fileLabel.className = "chess-coord-file";
        fileLabel.textContent = file;
        squareEl.appendChild(fileLabel);
      }
      if (f === 0) {
        const rankLabel = document.createElement("span");
        rankLabel.className = "chess-coord-rank";
        rankLabel.textContent = String(rank);
        squareEl.appendChild(rankLabel);
      }

      // Piece Image
      const piece = localChessInstance.get(square as any);
      if (piece) {
        const color = piece.color === "w" ? "white" : "black";
        const pieceNames: Record<string, string> = {
          p: "pawn",
          r: "rook",
          n: "knight",
          b: "bishop",
          q: "queen",
          k: "king",
        };
        const pieceImg = document.createElement("img");
        pieceImg.src = `/assets/decoration/Free/chess/${color}-${pieceNames[piece.type]}.png`;
        pieceImg.className = "chess-piece-img";
        pieceImg.alt = `${color} ${pieceNames[piece.type]}`;
        squareEl.appendChild(pieceImg);
      }

      // Square click event
      squareEl.addEventListener("click", () => {
        handleSquareClick(square);
      });

      chessBoardGrid.appendChild(squareEl);
    }
  }
}

function handleSquareClick(square: string) {
  if (!currentChessGameState || currentChessGameState.status !== "playing") return;

  const mySessionId = multiplayer?.room?.sessionId;
  const isWhite = currentChessGameState.whitePlayer?.sessionId === mySessionId;
  const isBlack = currentChessGameState.blackPlayer?.sessionId === mySessionId;
  if (!isWhite && !isBlack) return; // Spectator cannot move pieces

  const isMyTurn =
    (isWhite && currentChessGameState.turn === "white") ||
    (isBlack && currentChessGameState.turn === "black");

  if (!isMyTurn) return;

  const myColor = isWhite ? "w" : "b";

  // If a square is already selected and clicked square is one of legal targets:
  if (selectedSquare && legalMovesForSelected.includes(square)) {
    const piece = localChessInstance.get(selectedSquare as any);

    // Check pawn promotion
    if (
      piece &&
      piece.type === "p" &&
      ((piece.color === "w" && square.endsWith("8")) ||
        (piece.color === "b" && square.endsWith("1")))
    ) {
      pendingPromotionMove = { from: selectedSquare, to: square };
      showPromotionDialog(piece.color);
      return;
    }

    // Execute move
    executeMove(selectedSquare, square);
    selectedSquare = null;
    legalMovesForSelected = [];
    renderChessBoard();
    return;
  }

  // Otherwise, select a piece of own color
  const piece = localChessInstance.get(square as any);
  if (piece && piece.color === myColor) {
    selectedSquare = square;
    const moves = localChessInstance.moves({ square: square as any, verbose: true });
    legalMovesForSelected = moves.map((m: any) => m.to);
    renderChessBoard();
  } else {
    selectedSquare = null;
    legalMovesForSelected = [];
    renderChessBoard();
  }
}

function executeMove(from: string, to: string, promotion?: "q" | "r" | "b" | "n") {
  if (!activeChessBoardId || !currentChessGameState || !multiplayer) return;
  multiplayer.sendChessMove(activeChessBoardId, currentChessGameState.matchId, from, to, promotion);
}

function showPromotionDialog(color: "w" | "b") {
  if (!chessPromotionDialog || !promotionChoices) return;
  promotionChoices.innerHTML = "";
  chessPromotionDialog.classList.remove("hidden");

  const colorPrefix = color === "w" ? "white" : "black";
  const pieces: Array<{ type: "q" | "r" | "b" | "n"; name: string }> = [
    { type: "q", name: "queen" },
    { type: "r", name: "rook" },
    { type: "b", name: "bishop" },
    { type: "n", name: "knight" },
  ];

  pieces.forEach((p) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn-promotion-choice";
    btn.innerHTML = `<img src="/assets/decoration/Free/chess/${colorPrefix}-${p.name}.png" alt="${p.name}" />`;
    btn.addEventListener("click", () => {
      chessPromotionDialog.classList.add("hidden");
      if (pendingPromotionMove) {
        executeMove(pendingPromotionMove.from, pendingPromotionMove.to, p.type);
        pendingPromotionMove = null;
        selectedSquare = null;
        legalMovesForSelected = [];
        renderChessBoard();
      }
    });
    promotionChoices.appendChild(btn);
  });
}

function renderSpectatorsList(spectators: Record<string, any>) {
  if (!chessSpectatorsList || !chessSpectatorsCount) return;
  const list = Object.values(spectators || {});
  chessSpectatorsCount.textContent = String(list.length);
  chessSpectatorsList.innerHTML = "";

  if (list.length === 0) {
    const empty = document.createElement("div");
    empty.style.color = "#64748b";
    empty.style.fontSize = "12px";
    empty.style.textAlign = "center";
    empty.style.padding = "8px 0";
    empty.textContent = "No spectators watching yet";
    chessSpectatorsList.appendChild(empty);
    return;
  }

  list.forEach((spec: any) => {
    const item = document.createElement("div");
    item.className = "chess-spectator-item";
    const avatarUrl = spec.avatarUrl || "/assets/sprites/default/sprite1.png";
    item.innerHTML = `
      <img src="${avatarUrl}" class="chess-spectator-avatar" alt="${escapeHtml(spec.name || "Spectator")}" />
      <span class="chess-spectator-name">${escapeHtml(spec.name || "Spectator")}</span>
      <span class="chess-spectator-badge">Watching</span>
    `;
    chessSpectatorsList.appendChild(item);
  });
}

function renderMoveHistory(history: string[]) {
  if (!chessHistoryList) return;
  chessHistoryList.innerHTML = "";

  for (let i = 0; i < history.length; i += 2) {
    const moveNum = Math.floor(i / 2) + 1;
    const whiteMove = history[i];
    const blackMove = history[i + 1] || "";

    const isWhiteLatest = i === history.length - 1;
    const isBlackLatest = i + 1 === history.length - 1;

    const row = document.createElement("div");
    row.className = "chess-move-row";
    row.innerHTML = `
      <span class="chess-move-num">${moveNum}.</span>
      <span class="chess-move-white ${isWhiteLatest ? "active" : ""}">${escapeHtml(whiteMove)}</span>
      <span class="chess-move-black ${isBlackLatest ? "active" : ""}">${escapeHtml(blackMove)}</span>
    `;
    chessHistoryList.appendChild(row);
  }

  chessHistoryList.scrollTop = chessHistoryList.scrollHeight;
}

// Modal Event Listeners
if (btnChessJoinMatch) {
  btnChessJoinMatch.addEventListener("click", () => {
    if (!activeChessBoardId || !multiplayer) return;
    multiplayer.joinChessMatch(activeChessBoardId);
  });
}

if (btnChessCancelJoin) {
  btnChessCancelJoin.addEventListener("click", () => {
    if (!activeChessBoardId || !multiplayer) return;
    multiplayer.cancelChessJoin(activeChessBoardId);
  });
}

if (btnChessBackToLobby) {
  btnChessBackToLobby.addEventListener("click", () => {
    const mySessionId = multiplayer?.room?.sessionId;
    const isWhite = currentChessGameState?.whitePlayer?.sessionId === mySessionId;
    const isBlack = currentChessGameState?.blackPlayer?.sessionId === mySessionId;

    if ((isWhite || isBlack) && currentChessGameState?.status === "playing") {
      if (confirm("Leave match? Leaving will forfeit the game.")) {
        if (activeChessBoardId && currentChessGameState) {
          multiplayer?.leaveChessMatch(activeChessBoardId, currentChessGameState.matchId);
        }
        currentChessGameState = null;
        selectedSquare = null;
        legalMovesForSelected = [];
        showChessLobbyView();
      }
    } else {
      if (activeChessBoardId && currentChessGameState) {
        multiplayer?.leaveChessMatch(activeChessBoardId, currentChessGameState.matchId);
      }
      currentChessGameState = null;
      selectedSquare = null;
      legalMovesForSelected = [];
      showChessLobbyView();
    }
  });
}

if (btnChessFlipBoard) {
  btnChessFlipBoard.addEventListener("click", () => {
    isBoardFlipped = !isBoardFlipped;
    renderChessBoard();
  });
}

if (btnChessOfferDraw) {
  btnChessOfferDraw.addEventListener("click", () => {
    if (!activeChessBoardId || !currentChessGameState || !multiplayer) return;
    multiplayer.sendChessOfferDraw(activeChessBoardId, currentChessGameState.matchId);
  });
}

if (btnChessResign) {
  btnChessResign.addEventListener("click", () => {
    if (!activeChessBoardId || !currentChessGameState || !multiplayer) return;
    if (confirm("Are you sure you want to resign this match?")) {
      multiplayer.sendChessResign(activeChessBoardId, currentChessGameState.matchId);
    }
  });
}

if (btnChessRematch) {
  btnChessRematch.addEventListener("click", () => {
    if (!activeChessBoardId || !currentChessGameState || !multiplayer) return;
    multiplayer.sendChessRematch(activeChessBoardId, currentChessGameState.matchId);
  });
}

if (btnCloseChessModal) {
  btnCloseChessModal.addEventListener("click", () => {
    closeChessModal();
  });
}

if (chessModal) {
  chessModal.addEventListener("click", (e) => {
    if (e.target === chessModal) {
      closeChessModal();
    }
  });
}

window.addEventListener("beforeunload", () => {
  if (activeChessBoardId && currentChessGameState && multiplayer) {
    const mySid = multiplayer.room?.sessionId;
    const isPlayer =
      mySid &&
      (currentChessGameState.whitePlayer?.sessionId === mySid ||
        currentChessGameState.blackPlayer?.sessionId === mySid);
    if (currentChessGameState.status === "playing" && isPlayer) {
      multiplayer.leaveChessMatch(activeChessBoardId, currentChessGameState.matchId);
    }
  }
});

function setupMultiplayerChessListeners(mgr: MultiplayerManager) {
  mgr.onChessLobbyState((state) => {
    if (activeChessBoardId === state.chessBoardId) {
      renderChessLobby(state);
    }
  });

  mgr.onChessGameState((state) => {
    if (
      currentChessGameState?.matchId === state.matchId ||
      (!currentChessGameState && state.chessBoardId === activeChessBoardId)
    ) {
      renderChessGame(state);
    }
  });

  mgr.onChessGameStart((state) => {
    if (activeChessBoardId === state.chessBoardId) {
      renderChessGame(state);
    }
  });

  mgr.onChessGameEnded((state) => {
    if (activeChessBoardId === state.chessBoardId) {
      renderChessGame(state);
    }
  });

  mgr.onChessBoardDelete((chessBoardId) => {
    if (activeChessBoardId === chessBoardId) {
      closeChessModal();
    }
  });
}

function setupMultiplayerParkingPointsListeners(mgr: MultiplayerManager) {
  mgr.onParkingPointsAwarded((data) => {
    console.log(`[Parking Points] Awarded point! New total: ${data.points} Parking`, data);
    if (currentUser) {
      currentUser.parkingPoints = data.points;
      try {
        localStorage.setItem("lepark_auth_user", JSON.stringify(currentUser));
      } catch {}
    }
    updateParkingPointsDisplay(data.points);
    renderSpriteTemplatesGrid();
  });
}

function setupMultiplayerThrowBattleListeners(mgr: MultiplayerManager) {
  // Received invite to battle from another player
  mgr.onThrowBattleInvite((data) => {
    pendingInviteChallengerSessionId = data.challengerSessionId;
    if (tbInviteChallengerName) {
      tbInviteChallengerName.textContent = data.challengerName;
    }
    const hitsCountEl = document.getElementById("tb-invite-hits-count");
    if (hitsCountEl) {
      hitsCountEl.textContent = String(data.hits || 20);
    }
    const tag = document.getElementById("tb-invite-challenger-tag");
    if (tag) tag.textContent = data.challengerName;
    throwBattleInviteModal?.classList.remove("hidden");
    setGameControlsActive(false);
  });

  // Challenge sent confirmation
  mgr.onThrowBattleChallengeSent((data) => {
    pendingChallengeTargetSessionId = data.targetSessionId;
    if (tbWaitingText) {
      const hitsInfo = data.hits ? ` (${data.hits} hits)` : "";
      tbWaitingText.textContent = `Waiting for ${data.targetName} to accept or reject the Throw Battle${hitsInfo}...`;
    }
    throwBattleWaitingModal?.classList.remove("hidden");
    setGameControlsActive(false);
  });

  // Challenger cancelled challenge
  mgr.onThrowBattleChallengeCancelled(() => {
    pendingInviteChallengerSessionId = null;
    throwBattleInviteModal?.classList.add("hidden");
    setGameControlsActive(true);
  });

  // Target rejected challenge
  mgr.onThrowBattleRejected((data) => {
    if (tbWaitingText) {
      tbWaitingText.textContent = `${data.targetName} declined your battle challenge.`;
    }
    setTimeout(() => {
      throwBattleWaitingModal?.classList.add("hidden");
      pendingChallengeTargetSessionId = null;
      setGameControlsActive(true);
    }, 1600);
  });

  // Error during challenge
  mgr.onThrowBattleError((data) => {
    alert(data.message || "Throw battle error");
    throwBattleSetupModal?.classList.add("hidden");
    throwBattleWaitingModal?.classList.add("hidden");
    throwBattleInviteModal?.classList.add("hidden");
    pendingChallengeTargetSessionId = null;
    pendingInviteChallengerSessionId = null;
    setGameControlsActive(true);
  });

  // Battle Start!
  mgr.onThrowBattleStart((state: ThrowBattleState) => {
    throwBattleSetupModal?.classList.add("hidden");
    throwBattleWaitingModal?.classList.add("hidden");
    throwBattleInviteModal?.classList.add("hidden");
    pendingChallengeTargetSessionId = null;
    pendingInviteChallengerSessionId = null;

    throwBattleModal?.classList.remove("hidden");
    const gameoverOverlay = document.getElementById("tb-gameover-overlay");
    if (gameoverOverlay) gameoverOverlay.classList.add("hidden");

    if (!activeThrowBattleGame && throwBattleCanvas) {
      activeThrowBattleGame = new ThrowBattleGame(throwBattleCanvas);
      activeThrowBattleGame.onMove = (matchId, x) => {
        multiplayer?.sendThrowBattleMove(matchId, x);
      };
      activeThrowBattleGame.onEnterAngle = (matchId, x) => {
        multiplayer?.sendThrowBattleEnterAngle(matchId, x);
      };
      activeThrowBattleGame.onLockAngle = (matchId, angle) => {
        multiplayer?.sendThrowBattleLockAngle(matchId, angle);
      };
      activeThrowBattleGame.onThrow = (matchId, angle, power, wind, projectileType) => {
        multiplayer?.sendThrowBattleThrow(matchId, angle, power, wind, projectileType);
      };
      activeThrowBattleGame.onTurnResolved = (payload) => {
        multiplayer?.sendThrowBattleTurnResult(payload);
      };
      activeThrowBattleGame.onLeaveMatch = (matchId) => {
        multiplayer?.sendThrowBattleLeave(matchId);
      };
    }

    if (activeThrowBattleGame) {
      activeThrowBattleGame.initBattle(state, mgr.sessionId || "");
    }
    setGameControlsActive(false);
  });

  // Real-time synchronization
  mgr.onThrowBattlePlayerMoved((data) => {
    activeThrowBattleGame?.syncOpponentMove(data.sessionId, data.x);
  });

  mgr.onThrowBattleAngleStarted((data) => {
    activeThrowBattleGame?.syncAngleStarted(data.sessionId, data.x);
  });

  mgr.onThrowBattlePowerStarted((data) => {
    activeThrowBattleGame?.syncPowerStarted(data.sessionId, data.angle);
  });

  mgr.onThrowBattleThrown((data) => {
    activeThrowBattleGame?.syncThrown(
      data.sessionId,
      data.angle,
      data.power,
      data.wind,
      data.projectileType
    );
  });

  mgr.onThrowBattleNextTurn((data) => {
    activeThrowBattleGame?.syncNextTurn(
      data.currentTurn,
      data.wind,
      data.round,
      data.p1Hp,
      data.p2Hp,
      data.p1X,
      data.p2X
    );
  });

  mgr.onThrowBattleGameOver((data) => {
    activeThrowBattleGame?.syncGameOver(data.winnerSessionId, data.p1Hp, data.p2Hp);
  });

  mgr.onThrowBattlePlayerLeft(() => {
    if (activeThrowBattleGame) {
      alert("Opponent left or disconnected from the Throw Battle.");
      closeThrowBattleModal();
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

function populateOfficeDecorationGrid(
  gridId: string,
  assets: readonly string[],
  prefix: string,
  groupLabel: string
) {
  const grid = document.getElementById(gridId);
  if (!grid) return;

  const fragment = document.createDocumentFragment();
  for (const fileBase of assets) {
    const assetId = `${prefix}/${fileBase}`;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "editor-asset-card";
    btn.dataset.assetId = assetId;
    btn.dataset.assetName = fileBase;
    btn.dataset.tileType = "decoration";
    btn.title = `${fileBase} (${assetId}) - ${groupLabel} decoration`;

    const thumb = document.createElement("div");
    thumb.className = "asset-card-thumb";

    const img = document.createElement("img");
    img.alt = fileBase;
    img.className = "asset-thumb-img";
    img.loading = "lazy";

    const check = document.createElement("span");
    check.className = "asset-card-check";
    check.textContent = "✓";

    thumb.append(img, check);

    const info = document.createElement("div");
    info.className = "asset-card-info";

    const nameSpan = document.createElement("span");
    nameSpan.className = "asset-card-name";
    nameSpan.textContent = fileBase;

    const codeSpan = document.createElement("span");
    codeSpan.className = "asset-card-code";
    codeSpan.textContent = groupLabel;

    info.append(nameSpan, codeSpan);
    btn.append(thumb, info);
    fragment.appendChild(btn);
  }
  grid.appendChild(fragment);
}

populateOfficeDecorationGrid("office-one-deco-grid", OFFICE_ONE_DECORATION_ASSETS, "office_one", "Office One");
populateOfficeDecorationGrid("office-two-deco-grid", OFFICE_TWO_DECORATION_ASSETS, "office_two", "Office Two");
hydrateEditorAssetThumbnails();
const defaultBrushPattern = document.querySelector<HTMLElement>(".brush-pattern-layer");
if (defaultBrushPattern && !defaultBrushPattern.style.backgroundImage) {
  void resolveAssetThumbnailUrl("wood_5").then((url) => {
    if (url && !defaultBrushPattern.style.backgroundImage) {
      defaultBrushPattern.style.backgroundImage = `url("${url}")`;
    }
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
    } else if (toolType === "ashtray") {
      selectAshtrayTool();
    } else if (toolType === "chess_board") {
      selectChessBoardTool();
    } else if (toolType === "aquarium") {
      selectAquariumTool();
    } else if (toolType === "spawn_point") {
      selectSpawnPointTool();
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

const btnEditorItemInteractable = document.getElementById("btn-editor-item-interactable");
if (btnEditorItemInteractable) {
  btnEditorItemInteractable.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!activeEditorContextMenuItem || !gameInstance) return;
    const scene = gameInstance.scene.getScene("GameScene") as GameScene;
    if (!scene || typeof scene.getItemInteractionState !== "function") return;

    const curr = scene.getItemInteractionState(activeEditorContextMenuItem);
    const nextInteractable = !curr.interactable;
    const nextInteraction = nextInteractable
      ? curr.interaction || DECORATION_INTERACTIONS[0].id
      : null;

    scene.setItemInteraction(
      activeEditorContextMenuItem,
      nextInteractable,
      nextInteraction
    );
    updateEditorItemInteractionUI(nextInteractable, nextInteraction);
    renderEditorInteractionOptions("", nextInteraction);

    if (nextInteractable) {
      showPlacingToast(
        `Interactable enabled for ${activeEditorContextMenuItem.label || "decoration"}`
      );
    } else {
      showPlacingToast(
        `Interactable disabled for ${activeEditorContextMenuItem.label || "decoration"}`
      );
    }
  });
}

const btnEditorInteractionDropdown = document.getElementById("btn-editor-interaction-dropdown");
const editorInteractionDropdownPanel = document.getElementById("editor-interaction-dropdown-panel");
const editorInteractionSearchInput = document.getElementById(
  "editor-interaction-search-input"
) as HTMLInputElement | null;

if (btnEditorInteractionDropdown && editorInteractionDropdownPanel) {
  btnEditorInteractionDropdown.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!activeEditorContextMenuItem || !gameInstance) return;
    const isOpening = editorInteractionDropdownPanel.classList.contains("hidden");
    if (isOpening) {
      const scene = gameInstance.scene.getScene("GameScene") as GameScene;
      const curr = scene?.getItemInteractionState?.(activeEditorContextMenuItem);
      if (editorInteractionSearchInput) {
        editorInteractionSearchInput.value = "";
      }
      renderEditorInteractionOptions("", curr?.interaction ?? null);
      editorInteractionDropdownPanel.classList.remove("hidden");
      setTimeout(() => editorInteractionSearchInput?.focus(), 0);
    } else {
      editorInteractionDropdownPanel.classList.add("hidden");
    }
  });
}

if (editorInteractionSearchInput) {
  editorInteractionSearchInput.addEventListener("click", (e) => {
    e.stopPropagation();
  });
  editorInteractionSearchInput.addEventListener("keydown", (e) => {
    e.stopPropagation();
    if (e.key === "Escape") {
      editorInteractionDropdownPanel?.classList.add("hidden");
    }
  });
  editorInteractionSearchInput.addEventListener("input", () => {
    if (!activeEditorContextMenuItem || !gameInstance) return;
    const scene = gameInstance.scene.getScene("GameScene") as GameScene;
    const curr = scene?.getItemInteractionState?.(activeEditorContextMenuItem);
    renderEditorInteractionOptions(
      editorInteractionSearchInput.value,
      curr?.interaction ?? null
    );
  });
}

const btnEditorItemMove = document.getElementById("btn-editor-item-move");
if (btnEditorItemMove) {
  btnEditorItemMove.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!activeEditorContextMenuItem) return;
    const itemToMove = activeEditorContextMenuItem;
    closeEditorItemContextMenu();
    if (gameInstance) {
      const scene = gameInstance.scene.getScene("GameScene") as GameScene;
      if (scene && typeof scene.startMovingInspectableItem === "function") {
        scene.startMovingInspectableItem(itemToMove);
        showPlacingToast(
          `Click anywhere on the map to move ${itemToMove.label || "item"} (Esc to cancel)`
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
        return;
      }
      const atModal = document.getElementById("ashtray-modal");
      if (atModal && !atModal.classList.contains("hidden")) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return;
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
  if (throwBattleModal && !throwBattleModal.classList.contains("hidden")) {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (
      e.code === "Space" ||
      e.code === "ArrowLeft" ||
      e.code === "ArrowRight" ||
      e.code === "KeyA" ||
      e.code === "KeyD"
    ) {
      activeThrowBattleGame?.handleKeyDown(e.code);
      e.preventDefault();
      e.stopPropagation();
      return;
    }
  }

  if (e.key === "Escape") {
    if (throwBattleSetupModal && !throwBattleSetupModal.classList.contains("hidden")) {
      throwBattleSetupModal.classList.add("hidden");
      pendingChallengeTargetSessionId = null;
      setGameControlsActive(true);
      return;
    }
    if (typeraceModal && !typeraceModal.classList.contains("hidden")) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    const atModal = document.getElementById("ashtray-modal");
    if (atModal && !atModal.classList.contains("hidden")) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (jukeboxModal && !jukeboxModal.classList.contains("hidden")) {
      closeJukeboxModal();
      return;
    }
    if (chessModal && !chessModal.classList.contains("hidden")) {
      closeChessModal();
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
      if (gameInstance) {
        const scene = gameInstance.scene.getScene("GameScene") as GameScene;
        if (scene && typeof scene.isMovingItem === "function" && scene.isMovingItem()) {
          scene.cancelMovingInspectableItem();
          showPlacingToast("Move cancelled");
          return;
        }
      }
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

window.addEventListener("keyup", (e: KeyboardEvent) => {
  if (throwBattleModal && !throwBattleModal.classList.contains("hidden")) {
    activeThrowBattleGame?.handleKeyUp(e.code);
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

  const pts = currentUser?.parkingPoints ?? 0;
  updateParkingPointsDisplay(pts);

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
  const isCustomActive = switchUploadPictures ? switchUploadPictures.checked && uploadedFrames.idle.length > 0 && uploadedFrames.idle[0].startsWith("data:image/") : false;
  const activeTpl = getActiveTemplate();
  const templateImg = (activeTpl && activeTpl.idleFrames.length > 0) ? activeTpl.idleFrames[0] : "/assets/sprites/default/sprite1.png";
  const topbarImgUrl = isCustomActive ? uploadedFrames.idle[0] : templateImg;
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

  if (dropdownEditSpaceBtn) {
    dropdownEditSpaceBtn.classList.toggle("hidden", !canEdit);
  }
  if (dropdownEditMapBtn) {
    dropdownEditMapBtn.classList.toggle("hidden", !canEdit);
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
    setupMultiplayerSmokingGameListeners(multiplayer);
    setupMultiplayerChessListeners(multiplayer);
    setupMultiplayerParkingPointsListeners(multiplayer);
    setupMultiplayerThrowBattleListeners(multiplayer);

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
    const { pingMs } = stats;
    if (topbarPingStat) {
      topbarPingStat.textContent = pingMs > 0 ? `${pingMs} ms` : "-- ms";
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
      voiceManager?.leaveVoice();
    }
  });

  manager.onError((data) => {
    if (data?.message) {
      showPlacingToast(`⚠️ ${data.message}`);
    }
  });

  setupMultiplayerChatListeners(manager);
  updateChatTabNames();
  initVoiceManager(manager);
  initJukeboxManager(manager);
  setupMultiplayerTypeRaceListeners(manager);
  setupMultiplayerSmokingGameListeners(manager);
  setupMultiplayerChessListeners(manager);
  setupMultiplayerParkingPointsListeners(manager);
  setupMultiplayerThrowBattleListeners(manager);

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
        height: window.innerHeight - getTopBarHeight(),
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
          setupSceneAshtrayEvents(scene);
          setupSceneChessEvents(scene);
      setupSceneAquariumEvents(scene);
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

function getTopBarHeight(): number {
  const topBar = document.getElementById("top-bar");
  const measured = topBar ? topBar.getBoundingClientRect().height : 0;
  return measured > 0 ? Math.round(measured) : 40;
}

// Window Resize Handler
window.addEventListener("resize", () => {
  if (gameInstance) {
    gameInstance.scale.resize(window.innerWidth, window.innerHeight - getTopBarHeight());
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

function setupMobileJoystick() {
  const base = document.getElementById("mobile-analog-base");
  const knob = document.getElementById("mobile-analog-knob");
  if (!base || !knob) return;

  let activePointerId: number | null = null;
  let activeTouchId: number | null = null;
  let cachedCenterX = 0;
  let cachedCenterY = 0;
  let curLeft = false;
  let curRight = false;
  let curUp = false;
  let curDown = false;

  const maxRadius = 32;
  const enterDeadzone = 0.22;
  const exitDeadzone = 0.15;
  const enterThreshold = 0.44; // ~26 deg from axis to engage diagonal
  const exitThreshold = 0.30;  // ~17 deg from axis to disengage diagonal

  const setVirtualInput = (left: boolean, right: boolean, up: boolean, down: boolean) => {
    if (left === curLeft && right === curRight && up === curUp && down === curDown) {
      return;
    }
    curLeft = left;
    curRight = right;
    curUp = up;
    curDown = down;

    if (!gameInstance) return;
    const scene = gameInstance.scene.getScene("GameScene") as any;
    if (scene && scene.virtualInput) {
      scene.virtualInput.left = left;
      scene.virtualInput.right = right;
      scene.virtualInput.up = up;
      scene.virtualInput.down = down;
    }
  };

  const resetStick = () => {
    activePointerId = null;
    activeTouchId = null;
    knob.style.transform = "translate3d(0px, 0px, 0)";
    base.classList.remove("active");
    setVirtualInput(false, false, false, false);
  };

  const updateStick = (clientX: number, clientY: number) => {
    const dx = clientX - cachedCenterX;
    const dy = clientY - cachedCenterY;
    const dist = Math.hypot(dx, dy);

    const clampedDist = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);
    const clampedX = dist > 0 ? Math.cos(angle) * clampedDist : 0;
    const clampedY = dist > 0 ? Math.sin(angle) * clampedDist : 0;
    knob.style.transform = `translate3d(${clampedX}px, ${clampedY}px, 0)`;

    const normDist = clampedDist / maxRadius;
    const wasMoving = curLeft || curRight || curUp || curDown;
    const activeDeadzone = wasMoving ? exitDeadzone : enterDeadzone;
    if (normDist < activeDeadzone) {
      setVirtualInput(false, false, false, false);
      return;
    }

    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const nextLeft = curLeft ? cos < -exitThreshold : cos < -enterThreshold;
    const nextRight = curRight ? cos > exitThreshold : cos > enterThreshold;
    const nextUp = curUp ? sin < -exitThreshold : sin < -enterThreshold;
    const nextDown = curDown ? sin > exitThreshold : sin > enterThreshold;

    setVirtualInput(
      nextLeft && !nextRight,
      nextRight && !nextLeft,
      nextUp && !nextDown,
      nextDown && !nextUp,
    );
  };

  const cacheCenter = () => {
    const rect = base.getBoundingClientRect();
    cachedCenterX = rect.left + rect.width / 2;
    cachedCenterY = rect.top + rect.height / 2;
  };

  // Native TouchEvents with passive: false prevent iOS WebKit from stealing/canceling the touch
  base.addEventListener(
    "touchstart",
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (activeTouchId !== null) return;
      const touch = e.changedTouches[0];
      if (!touch) return;
      activeTouchId = touch.identifier;
      cacheCenter();
      base.classList.add("active");
      updateStick(touch.clientX, touch.clientY);
    },
    { passive: false },
  );

  window.addEventListener(
    "touchmove",
    (e) => {
      if (activeTouchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === activeTouchId) {
          e.preventDefault();
          e.stopPropagation();
          updateStick(touch.clientX, touch.clientY);
          break;
        }
      }
    },
    { passive: false },
  );

  const handleTouchEnd = (e: TouchEvent) => {
    if (activeTouchId === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === activeTouchId) {
        e.preventDefault();
        e.stopPropagation();
        resetStick();
        break;
      }
    }
  };

  window.addEventListener("touchend", handleTouchEnd, { passive: false });
  window.addEventListener("touchcancel", handleTouchEnd, { passive: false });

  // Mouse / non-touch PointerEvents fallback (without setPointerCapture to avoid iOS WebKit quirks)
  base.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "touch") return;
    if (activePointerId !== null) return;
    e.preventDefault();
    e.stopPropagation();
    cacheCenter();
    activePointerId = e.pointerId;
    base.classList.add("active");
    updateStick(e.clientX, e.clientY);
  });

  window.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch") return;
    if (e.pointerId !== activePointerId) return;
    e.preventDefault();
    e.stopPropagation();
    updateStick(e.clientX, e.clientY);
  });

  const handlePointerEnd = (e: PointerEvent) => {
    if (e.pointerType === "touch") return;
    if (e.pointerId !== activePointerId) return;
    e.preventDefault();
    e.stopPropagation();
    resetStick();
  };

  window.addEventListener("pointerup", handlePointerEnd);
  window.addEventListener("pointercancel", handlePointerEnd);
}

// App Initialization
async function init() {
  setupColorSwatches();
  setupMapEditorDecorationControls();
  setupMapEditorAccordions();
  setupUploadSlots();
  setupHudControlBadges();
  setupMobileJoystick();

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

  if (switchUploadPictures) {
    if (savedSwitch === "true") {
      switchUploadPictures.checked = true;
      defaultCharacterSection?.classList.add("hidden");
      uploadPicturesSection?.classList.remove("hidden");
    } else {
      switchUploadPictures.checked = false;
      defaultCharacterSection?.classList.remove("hidden");
      uploadPicturesSection?.classList.add("hidden");
    }
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
        setupSpriteTemplates();
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

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("Service worker registration failed:", err);
    });
  });
}
