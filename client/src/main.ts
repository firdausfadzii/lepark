import Phaser from "phaser";
import { MultiplayerManager } from "./network/MultiplayerManager";
import { GameScene, InspectableMapItem } from "./scenes/GameScene";
import { FocusUiController } from "./focus/FocusUiController";
import { NetherworldUiController } from "./rpg/NetherworldUiController";
import { InventoryUiController } from "./inventory/InventoryUiController";
import { DinerUiController } from "./diner/DinerUiController";
import { OFFICE_ONE_DECORATION_ASSETS } from "./officeOneAssets";
import { OFFICE_TWO_DECORATION_ASSETS } from "./officeTwoAssets";
import { PET_SHOP_DECORATION_ASSETS } from "./petShopAssets";
import { ADVENTURE_GUILD_DECORATION_ASSETS } from "./adventureGuildAssets";
import { RESTAURANT_DECORATION_ASSETS } from "./restaurantAssets";
import { LIVING_ROOM_ONE_DECORATION_ASSETS } from "./livingRoomOneAssets";
import { LIVING_ROOM_TWO_DECORATION_ASSETS } from "./livingRoomTwoAssets";
import { LIVING_ROOM_FLOOR_ASSETS } from "./livingRoomFloorAssets";
import { hydrateEditorAssetThumbnails, resolveAssetThumbnailUrl } from "./atlasThumbnails";
import {
  hydrateSheetImages,
  imgSrcAttr,
  normalizeSpriteRef,
  setImgSrcResolved,
} from "./spriteSheetResolver";
import { renderFashionPreviewFrame } from "./fashionRenderer";
import {
  DEFAULT_PRESET_COLORS,
  PlayerAvatars,
  PlayerOutfit,
  OutfitMode,
  DEFAULT_PLAYER_OUTFIT,
  DEFAULT_CASUAL_OUTFIT,
  DEFAULT_ADVENTURE_OUTFIT,
  FASHION_GEAR_CATALOG,
  AuthUser,
  AuthResponse,
  Space,
  SpacesListResponse,
  SpaceResponse,
  MAX_AVATAR_FRAMES,
  DEFAULT_AVATAR_ICON,
  DEFAULT_AVATARS,
  ChatMessage,
  PrivateZone,
  VoicePeer,
  CHARACTER_MAX_SIZE,
  NAME_CHANGE_FP_COST,
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
  FriendEntry,
  FriendRequestEntry,
  FriendsListResponse,
  FocusStats,
  FocusTheme,
  isValidFocusTheme,
  isWallAsset,
  isOverlayWallAsset,
  isOverlayFloorAsset,
  isFreeformAsset,
  DECORATION_INTERACTIONS,
  DecorationInteractionType,
  Organisation,
  OrganisationsListResponse,
  CreateOrganisationResponse,
  ORGANISATION_CREATION_COST,
  ASSET_UNLOCK_COST,
  isPaidAssetId,
  ASSET_SHOP_THEME_OPTIONS,
  SELLER_NPC_SPRITE_OPTIONS,
  AssetShopTheme,
  SellerNpcSpriteKey,
  SellerNpcState,
  SpaceShopResponse,
  SpaceShopCatalogItem,
  NoteType,
  NoteDto,
  AccessibleNoteSpace,
  CalendarType,
  CalendarRepeatUnit,
  CalendarAssigneeDto,
  CalendarEventDto,
  CalendarMealDto,
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
const authTabs = document.getElementById("auth-tabs") as HTMLDivElement;
const tabLogin = document.getElementById("tab-login") as HTMLButtonElement;
const tabRegister = document.getElementById(
  "tab-register",
) as HTMLButtonElement;
const loginForm = document.getElementById("login-form") as HTMLFormElement;
const forgotPasswordForm = document.getElementById(
  "forgot-password-form",
) as HTMLFormElement;
const registerForm = document.getElementById(
  "register-form",
) as HTMLFormElement;
const loginTabUsername = document.getElementById(
  "login-tab-username",
) as HTMLButtonElement;
const loginTabEmail = document.getElementById(
  "login-tab-email",
) as HTMLButtonElement;
const loginIdentifierLabel = document.getElementById(
  "login-identifier-label",
) as HTMLLabelElement;
const loginIdentifierIcon = document.getElementById(
  "login-identifier-icon",
) as HTMLSpanElement;
const loginUsernameInput = document.getElementById(
  "login-username",
) as HTMLInputElement;
const loginPasswordInput = document.getElementById(
  "login-password",
) as HTMLInputElement;
const btnForgotPassword = document.getElementById(
  "btn-forgot-password",
) as HTMLButtonElement;
const forgotEmailInput = document.getElementById(
  "forgot-email",
) as HTMLInputElement;
const btnForgotSendOtp = document.getElementById(
  "btn-forgot-send-otp",
) as HTMLButtonElement;
const forgotOtpInput = document.getElementById(
  "forgot-otp",
) as HTMLInputElement;
const forgotNewPasswordInput = document.getElementById(
  "forgot-new-password",
) as HTMLInputElement;
const forgotConfirmPasswordInput = document.getElementById(
  "forgot-confirm-password",
) as HTMLInputElement;
const btnSubmitForgot = document.getElementById(
  "btn-submit-forgot",
) as HTMLButtonElement;
const linkForgotBackLogin = document.getElementById(
  "link-forgot-back-login",
) as HTMLButtonElement;
const regUsernameInput = document.getElementById(
  "reg-username",
) as HTMLInputElement;
const regEmailInput = document.getElementById(
  "reg-email",
) as HTMLInputElement;
const btnRegSendOtp = document.getElementById(
  "btn-reg-send-otp",
) as HTMLButtonElement;
const regOtpInput = document.getElementById(
  "reg-otp",
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

// DOM Elements - Persistent Link Email Modal
const linkEmailModal = document.getElementById(
  "link-email-modal",
) as HTMLDivElement;
const linkEmailAlert = document.getElementById(
  "link-email-alert",
) as HTMLDivElement;
const linkEmailAlertMsg = document.getElementById(
  "link-email-alert-msg",
) as HTMLSpanElement;
const linkEmailForm = document.getElementById(
  "link-email-form",
) as HTMLFormElement;
const linkEmailInput = document.getElementById(
  "link-email-input",
) as HTMLInputElement;
const btnLinkSendOtp = document.getElementById(
  "btn-link-send-otp",
) as HTMLButtonElement;
const linkEmailOtpInput = document.getElementById(
  "link-email-otp",
) as HTMLInputElement;
const btnSubmitLinkEmail = document.getElementById(
  "btn-submit-link-email",
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

// User Profile Modal Menu
const profileMenuModal = document.getElementById(
  "profile-menu-modal",
) as HTMLDivElement;
const btnCloseProfileModal = document.getElementById(
  "btn-close-profile-modal",
) as HTMLButtonElement | null;
const profileModalStatusDot = document.getElementById(
  "profile-modal-status-dot",
) as HTMLSpanElement | null;
const profileModalUserName = document.getElementById(
  "profile-modal-user-name",
) as HTMLElement | null;
const profileModalAdminBadge = document.getElementById(
  "profile-modal-admin-badge",
) as HTMLSpanElement | null;
const profileModalUsername = document.getElementById(
  "profile-modal-username",
) as HTMLSpanElement | null;
const profileEquipTabBtns = document.querySelectorAll<HTMLButtonElement>(
  ".profile-equip-tab-btn",
);
const profileEquipStageLabel = document.getElementById(
  "profile-equip-stage-label",
) as HTMLSpanElement | null;
const profileEquipCharImg = document.getElementById(
  "profile-equip-char-img",
) as HTMLImageElement | null;
const btnProfileCharRotLeft = document.getElementById(
  "btn-profile-char-rot-left",
) as HTMLButtonElement | null;
const btnProfileCharRotReset = document.getElementById(
  "btn-profile-char-rot-reset",
) as HTMLButtonElement | null;
const btnProfileCharRotRight = document.getElementById(
  "btn-profile-char-rot-right",
) as HTMLButtonElement | null;
const btnOpenSquad = document.getElementById(
  "btn-open-squad",
) as HTMLButtonElement | null;
const btnOpenChangeName = document.getElementById(
  "btn-open-change-name",
) as HTMLButtonElement | null;
const changeNameModal = document.getElementById(
  "change-name-modal",
) as HTMLDivElement | null;
const btnCloseChangeNameModal = document.getElementById(
  "btn-close-change-name-modal",
) as HTMLButtonElement | null;
const btnCancelChangeName = document.getElementById(
  "btn-cancel-change-name",
) as HTMLButtonElement | null;
const changeNameForm = document.getElementById(
  "change-name-form",
) as HTMLFormElement | null;
const changeNameInput = document.getElementById(
  "change-name-input",
) as HTMLInputElement | null;
const changeNameUsernameTag = document.getElementById(
  "change-name-username-tag",
) as HTMLSpanElement | null;
const changeNameCurrentFp = document.getElementById(
  "change-name-current-fp",
) as HTMLSpanElement | null;
const changeNameFeedback = document.getElementById(
  "change-name-feedback",
) as HTMLDivElement | null;
const btnSubmitChangeName = document.getElementById(
  "btn-submit-change-name",
) as HTMLButtonElement | null;
const dropdownFriendsBtn = document.getElementById(
  "dropdown-friends-btn",
) as HTMLButtonElement | null;
const dropdownFriendsBadge = document.getElementById(
  "dropdown-friends-badge",
) as HTMLSpanElement | null;
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
const mapEditorSidebar = document.getElementById(
  "map-editor-sidebar",
) as HTMLElement;
const btnCloseMapEditor = document.getElementById(
  "btn-close-map-editor",
) as HTMLButtonElement;
const btnToggleTileOptions = document.getElementById(
  "btn-toggle-tile-options",
) as HTMLButtonElement | null;
const btnToggleDragFill = document.getElementById(
  "btn-toggle-drag-fill",
) as HTMLButtonElement | null;
const btnCloseTileOptions = document.getElementById(
  "btn-close-tile-options",
) as HTMLButtonElement | null;
const editorOptionsBtnThumb = document.getElementById(
  "editor-options-btn-thumb",
) as HTMLImageElement | null;
const editorPlacingToast = document.getElementById(
  "editor-placing-toast",
) as HTMLElement | null;
const placingToastName = document.getElementById(
  "placing-toast-name",
) as HTMLElement | null;
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

// Top Bar Right Actions (Map) & Focus Points & Bottom-Left Ping
const btnOpenMap = document.getElementById("btn-open-map") as HTMLButtonElement;
const topbarFocusPointsVal = document.getElementById(
  "topbar-focus-points-val",
) as HTMLElement | null;
const dropdownFocusPointsVal = document.getElementById(
  "dropdown-focus-points-val",
) as HTMLElement | null;

function updateFocusPointsDisplay(points: number) {
  const label = `${points} FP`;
  if (topbarFocusPointsVal) {
    topbarFocusPointsVal.textContent = label;
  }
  if (dropdownFocusPointsVal) {
    dropdownFocusPointsVal.textContent = label;
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
const mapSpacesGrid = document.getElementById("map-spaces-grid") as HTMLElement;

// DOM Elements - Optional legacy character customization refs (removed from DOM)
const customColorInput = document.getElementById(
  "custom-color-picker",
) as HTMLInputElement | null;
const colorGrid = document.getElementById("color-grid") as HTMLDivElement | null;
const previewAvatar = document.getElementById(
  "preview-avatar",
) as HTMLImageElement | null;
const previewFashionCloth = document.getElementById(
  "preview-fashion-cloth",
) as HTMLImageElement | null;
const fashionPickerGroup = document.getElementById(
  "fashion-picker-group",
) as HTMLDivElement | null;
const wardrobeTriggerSummary = document.getElementById(
  "wardrobe-trigger-summary",
) as HTMLSpanElement | null;
const wardrobePreviewAvatar = document.getElementById(
  "wardrobe-preview-avatar",
) as HTMLImageElement | null;
const wardrobePreviewHint = document.getElementById(
  "wardrobe-preview-hint",
) as HTMLDivElement | null;
const fashionItemsGrid = document.getElementById(
  "fashion-items-grid",
) as HTMLDivElement | null;
const fashionColorRow = document.getElementById(
  "fashion-color-row",
) as HTMLDivElement | null;
const previewStatusHint = document.getElementById(
  "preview-status-hint",
) as HTMLDivElement | null;
const previewName = document.getElementById("preview-name") as HTMLDivElement | null;
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
const mySpaceOwnerBanner = document.getElementById(
  "my-space-owner-banner",
) as HTMLDivElement | null;
const mySpaceOwnerName = document.getElementById(
  "my-space-owner-name",
) as HTMLElement | null;
const mySpaceShareFriendSelect = document.getElementById(
  "my-space-share-friend-select",
) as HTMLSelectElement | null;
const btnAddMySpaceShare = document.getElementById(
  "btn-add-my-space-share",
) as HTMLButtonElement | null;
const mySpaceShareTagsCount = document.getElementById(
  "my-space-share-tags-count",
) as HTMLElement | null;
const mySpaceShareTagsContainer = document.getElementById(
  "my-space-share-tags-container",
) as HTMLElement | null;

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
const adminSpaceFocusTheme = document.getElementById(
  "admin-space-focus-theme",
) as HTMLSelectElement | null;
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
const btnPlayerMenuInviteSquad = document.getElementById("btn-player-menu-invite-squad") as HTMLButtonElement | null;
const btnPlayerMenuAddFriend = document.getElementById("btn-player-menu-add-friend") as HTMLButtonElement | null;
const playerMenuAddFriendLabel = document.getElementById("player-menu-add-friend-label") as HTMLSpanElement | null;

// Friends Modal DOM Elements
const friendsModal = document.getElementById("friends-modal") as HTMLDivElement | null;
const btnCloseFriendsModal = document.getElementById("btn-close-friends-modal") as HTMLButtonElement | null;
const friendsAddForm = document.getElementById("friends-add-form") as HTMLFormElement | null;
const friendsAddInput = document.getElementById("friends-add-input") as HTMLInputElement | null;
const friendsAddFeedback = document.getElementById("friends-add-feedback") as HTMLDivElement | null;
const friendsListContainer = document.getElementById("friends-list-container") as HTMLDivElement | null;
const friendsCountOnline = document.getElementById("friends-count-online");
const friendsCountOffline = document.getElementById("friends-count-offline");
const friendsCountPending = document.getElementById("friends-count-pending");
const friendsCountRequest = document.getElementById("friends-count-request");

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

interface OrgConversation {
  orgId: number;
  org: Organisation;
  messages: ChatMessage[];
  historyLoaded: boolean;
  unreadCount: number;
  tabElement?: HTMLButtonElement;
}

let isChatOpen = false; // Default hidden on login / game open
let activeChatRoom: string = "map"; // "map", "zone", `dm_${sessionId}`, or `org_${orgId}`
let currentInsideZone: PrivateZone | null = null;
const chatMessagesMap: ChatMessage[] = [];
const chatMessagesZone = new Map<string, ChatMessage[]>();
const dmConversations = new Map<string, DmConversation>();
const orgConversations = new Map<number, OrgConversation>();
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

// Spaces State
let currentSpaceId = "space_central_plaza";
let currentSpaceName = "CO3";
let loadedSpaces: Space[] = [];
let myPersonalSpace: Space | null = null;
let loadedSharedSpaces: Space[] = [];
let editingTargetSpace: Space | null = null;
let isSidePanelCollapsed = false;

// Offline / Reconnecting Modal Elements & Auto-Reconnect Controller
const offlineModal = document.getElementById("offline-modal") as HTMLDivElement | null;
const offlineModalTitle = document.getElementById("offline-modal-title") as HTMLHeadingElement | null;
const offlineModalBadge = document.getElementById("offline-modal-badge") as HTMLSpanElement | null;
const offlineModalBadgeText = document.getElementById("offline-modal-badge-text") as HTMLSpanElement | null;
const offlineModalMessage = document.getElementById("offline-modal-message") as HTMLParagraphElement | null;
const btnOfflineReconnect = document.getElementById("btn-offline-reconnect") as HTMLButtonElement | null;

let reconnectTimer: number | null = null;
let reconnectAttempt = 0;
let isReconnectInProgress = false;
let isDisconnectedState = false;
let hasPendingAuthRestore = false;

function isLikelyNetworkError(err: any): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  if (!err) return false;
  const code = typeof err.code === "number" ? err.code : 0;
  // Explicit server-side rejection codes (401/403/404) are NOT network errors
  if (code === 401 || code === 403 || code === 404) return false;
  const msg = String(err.message || err).toLowerCase();
  return (
    err instanceof TypeError ||
    msg.includes("network") ||
    msg.includes("failed to fetch") ||
    msg.includes("fetch") ||
    msg.includes("websocket") ||
    msg.includes("socket") ||
    msg.includes("timeout") ||
    msg.includes("aborted") ||
    msg.includes("econnrefused") ||
    msg.includes("connection") ||
    msg.includes("offline")
  );
}

function showOfflineModal(
  message?: string,
  options?: {
    title?: string;
    badgeText?: string;
    reconnecting?: boolean;
    buttonText?: string;
    buttonDisabled?: boolean;
  },
) {
  if (offlineModalTitle) {
    offlineModalTitle.textContent =
      options?.title || (typeof navigator !== "undefined" && !navigator.onLine ? "You Are Offline" : "Connection Lost");
  }
  if (offlineModalBadge) {
    offlineModalBadge.classList.toggle("is-reconnecting", options?.reconnecting ?? true);
  }
  if (offlineModalBadgeText) {
    offlineModalBadgeText.textContent =
      options?.badgeText || (typeof navigator !== "undefined" && !navigator.onLine ? "Offline" : "Reconnecting");
  }
  if (offlineModalMessage && message) {
    offlineModalMessage.textContent = message;
  }
  if (btnOfflineReconnect) {
    btnOfflineReconnect.textContent = options?.buttonText || "Reconnect Now";
    btnOfflineReconnect.disabled = !!options?.buttonDisabled;
  }
  if (offlineModal) {
    offlineModal.classList.remove("hidden");
  }
}

function hideOfflineModal() {
  if (reconnectTimer !== null) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  isDisconnectedState = false;
  reconnectAttempt = 0;
  if (offlineModal) {
    offlineModal.classList.add("hidden");
  }
}

function stopAutoReconnect() {
  isReconnectInProgress = false;
  hasPendingAuthRestore = false;
  hideOfflineModal();
}

async function checkServerReachable(timeoutMs: number = 4000): Promise<boolean> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return false;
  }
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(getApiUrl("/health"), {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function getReconnectDelayMs(attempt: number): number {
  if (attempt <= 1) return 1000;
  if (attempt === 2) return 2000;
  if (attempt === 3) return 3500;
  return 5000;
}

function scheduleAutoReconnect(immediate: boolean = false) {
  if (!isDisconnectedState && !hasPendingAuthRestore) return;
  if (isReconnectInProgress) return;
  if (reconnectTimer !== null) {
    if (!immediate) return;
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  const delay = immediate ? 0 : getReconnectDelayMs(reconnectAttempt + 1);
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null;
    void attemptAutoReconnect();
  }, delay);
}

function handleOfflineDetected(message?: string) {
  isDisconnectedState = true;
  const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
  const defaultMsg = isOffline
    ? "You are currently offline. Waiting for your connection to return to reconnect automatically..."
    : "Disconnected from the game server. Trying to reconnect automatically...";

  if (gameInstance || multiplayer) {
    topbarStatusDot.style.background = isOffline ? "#ef4444" : "#f59e0b";
    topbarStatusDot.style.boxShadow = isOffline ? "0 0 6px #ef4444" : "0 0 6px #f59e0b";
    topbarStatusSubtitle.textContent = isOffline ? "Offline" : "Reconnecting...";
    if (topbarPingStat) topbarPingStat.textContent = "-- ms";
  }

  showOfflineModal(message || defaultMsg, {
    title: isOffline ? "You Are Offline" : "Connection Lost",
    badgeText: isOffline ? "Offline" : "Reconnecting",
    reconnecting: true,
    buttonText: isReconnectInProgress ? "Reconnecting..." : "Reconnect Now",
    buttonDisabled: isReconnectInProgress,
  });

  scheduleAutoReconnect(false);
}

async function attemptAutoReconnect() {
  if (isReconnectInProgress) return;
  if (!isDisconnectedState && !hasPendingAuthRestore) return;

  isReconnectInProgress = true;
  reconnectAttempt += 1;
  const attemptLabel = reconnectAttempt > 1 ? ` (attempt ${reconnectAttempt})` : "";

  try {
    const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
    showOfflineModal(
      isOffline
        ? `You are currently offline. Waiting for your connection to return to reconnect automatically${attemptLabel}...`
        : `Trying to reconnect automatically${attemptLabel}...`,
      {
        title: isOffline ? "You Are Offline" : "Reconnecting...",
        badgeText: isOffline ? "Offline" : "Reconnecting",
        reconnecting: true,
        buttonText: "Reconnecting...",
        buttonDisabled: true,
      },
    );

    if (isOffline) {
      return;
    }

    // Case 1: Stored session restore failed at startup due to being offline
    if (!gameInstance && hasPendingAuthRestore) {
      const storedToken = localStorage.getItem("lepark_auth_token");
      if (!storedToken) {
        hasPendingAuthRestore = false;
        hideOfflineModal();
        openAuthModal("login");
        return;
      }

      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 5000);
      try {
        const res = await fetch(getApiUrl("/api/auth/me"), {
          headers: { Authorization: `Bearer ${storedToken}` },
          signal: controller.signal,
        });
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem("lepark_auth_token");
          localStorage.removeItem("lepark_auth_user");
          hasPendingAuthRestore = false;
          hideOfflineModal();
          openAuthModal("login");
          return;
        }
        if (!res.ok) {
          return;
        }
        const data: AuthResponse = await res.json();
        if (data.success && data.user) {
          authToken = storedToken;
          currentUser = data.user;
          hasPendingAuthRestore = false;
          setupSpriteTemplates();
          closeAuthModal();
          await enterGameSession({ fromAutoReconnect: true });
          hideOfflineModal();
          checkAndShowLinkEmailModal();
          return;
        }
        localStorage.removeItem("lepark_auth_token");
        localStorage.removeItem("lepark_auth_user");
        hasPendingAuthRestore = false;
        hideOfflineModal();
        openAuthModal("login");
        return;
      } catch {
        return;
      } finally {
        clearTimeout(timer);
      }
    }

    // Case 2: Logged in, but initial enterGameSession failed before gameInstance was created
    if (!gameInstance && authToken && currentUser) {
      const reachable = await checkServerReachable(4000);
      if (!reachable) return;

      await enterGameSession({ fromAutoReconnect: true });
      hideOfflineModal();
      return;
    }

    // Case 3: Not logged in (on auth modal) and went offline
    if (!gameInstance && !multiplayer && !authToken) {
      const reachable = await checkServerReachable(4000);
      if (reachable) {
        hideOfflineModal();
      }
      return;
    }

    // Case 4: User is actively in the app (gameInstance / multiplayer)
    if (multiplayer && multiplayer.isConnected) {
      const alive = await multiplayer.verifyConnection(2500);
      if (alive) {
        topbarStatusDot.style.background = "#10b981";
        topbarStatusDot.style.boxShadow = "0 0 6px #10b981";
        topbarStatusSubtitle.textContent = "Online";
        hideOfflineModal();
        void fetchSpaces();
        if (authToken) {
          void fetchFriendsData();
          void fetchOrganisationsData();
        }
        return;
      }
      // Socket is stale/zombie; cleanly close it before rejoining
      multiplayer.leave();
    }

    const reachable = await checkServerReachable(4000);
    if (!reachable) {
      return;
    }

    // Reset GameScene players/tiles cleanly before joining the new room
    if (gameInstance) {
      const scene = gameInstance.scene.getScene("GameScene") as GameScene;
      if (scene && typeof scene.resetPlayers === "function") {
        scene.resetPlayers();
      }
    }

    const effectiveName = getEffectivePlayerName();
    const color = selectedColor;
    const avatars = computeActiveAvatars();

    if (!multiplayer) {
      multiplayer = new MultiplayerManager();
      bindMultiplayerLifecycleEvents(multiplayer);
      setupMultiplayerChatListeners(multiplayer);
      initVoiceManager(multiplayer);
      initJukeboxManager(multiplayer);
      setupMultiplayerTypeRaceListeners(multiplayer);
      setupMultiplayerSmokingGameListeners(multiplayer);
      setupMultiplayerChessListeners(multiplayer);
      setupMultiplayerFocusListeners(multiplayer);
      setupMultiplayerFriendListeners(multiplayer);
      setupMultiplayerThrowBattleListeners(multiplayer);
      setupMultiplayerDinerListeners(multiplayer);
    }

    try {
      await multiplayer.joinGame({
        name: effectiveName,
        color,
        avatars,
        outfit: selectedOutfit,
        spaceId: currentSpaceId,
        token: authToken || undefined,
      });
    } catch (joinErr: any) {
      const errCode = typeof joinErr?.code === "number" ? joinErr.code : 0;
      if (errCode === 401) {
        stopAutoReconnect();
        handleLogout();
        return;
      }
      if (!isLikelyNetworkError(joinErr) && currentSpaceId !== "space_central_plaza") {
        console.warn(`Could not rejoin space ${currentSpaceId}, falling back to CO3:`, joinErr);
        currentSpaceId = "space_central_plaza";
        currentSpaceName = "CO3";
        updateTopBarUI();
        onSpaceChanged(currentSpaceName);
        await multiplayer.joinGame({
          name: effectiveName,
          color,
          avatars,
          outfit: selectedOutfit,
          spaceId: currentSpaceId,
          token: authToken || undefined,
        });
      } else {
        throw joinErr;
      }
    }

    if (gameInstance) {
      const scene = gameInstance.scene.getScene("GameScene") as GameScene;
      if (scene && typeof scene.respawnCurrentPlayers === "function") {
        scene.respawnCurrentPlayers();
      }
    }

    topbarStatusDot.style.background = "#10b981";
    topbarStatusDot.style.boxShadow = "0 0 6px #10b981";
    topbarStatusSubtitle.textContent = "Online";
    hideOfflineModal();
    void fetchSpaces();
    if (authToken) {
      void fetchFriendsData();
      void fetchOrganisationsData();
    }
  } catch (err) {
    console.warn("Auto-reconnect attempt failed:", err);
  } finally {
    isReconnectInProgress = false;
    if (isDisconnectedState || hasPendingAuthRestore) {
      const stillOffline = typeof navigator !== "undefined" && !navigator.onLine;
      showOfflineModal(
        stillOffline
          ? "You are currently offline. Waiting for your connection to return to reconnect automatically..."
          : `Unable to reach the server yet. Retrying automatically (attempt ${reconnectAttempt + 1})...`,
        {
          title: stillOffline ? "You Are Offline" : "Reconnecting...",
          badgeText: stillOffline ? "Offline" : "Reconnecting",
          reconnecting: true,
          buttonText: "Reconnect Now",
          buttonDisabled: false,
        },
      );
      scheduleAutoReconnect(false);
    }
  }
}

async function verifyActiveConnection() {
  if (!multiplayer || !gameInstance || isReconnectInProgress || isDisconnectedState) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    handleOfflineDetected();
    return;
  }
  if (!multiplayer.isConnected) {
    handleOfflineDetected("Disconnected from the game server. Trying to reconnect automatically...");
    return;
  }
  const alive = await multiplayer.verifyConnection(3000);
  if (!alive && multiplayer && !isReconnectInProgress && !isDisconnectedState) {
    multiplayer.handleConnectionLost();
  }
}

if (btnOfflineReconnect) {
  btnOfflineReconnect.addEventListener("click", () => {
    isDisconnectedState = true;
    scheduleAutoReconnect(true);
  });
}

window.addEventListener("offline", () => {
  handleOfflineDetected(
    "You are currently offline. Waiting for your internet connection to reconnect automatically...",
  );
});

window.addEventListener("online", () => {
  if (isDisconnectedState || hasPendingAuthRestore || (gameInstance && (!multiplayer || !multiplayer.isConnected))) {
    isDisconnectedState = true;
    scheduleAutoReconnect(true);
  } else if (gameInstance && multiplayer) {
    void verifyActiveConnection();
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    if (isDisconnectedState || hasPendingAuthRestore || (typeof navigator !== "undefined" && !navigator.onLine)) {
      scheduleAutoReconnect(true);
    } else if (gameInstance && multiplayer) {
      void verifyActiveConnection();
    }
  }
});

if (typeof navigator !== "undefined" && !navigator.onLine) {
  handleOfflineDetected(
    "You are currently offline. Waiting for your internet connection to reconnect automatically...",
  );
}

let tempMySpaceWhitelist: string[] = [];
let tempMySpaceSharedOwners: string[] = [];
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
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const envUrl = (import.meta as any).env?.VITE_SERVER_URL;
  if (envUrl && typeof envUrl === "string" && envUrl.trim().length > 0) {
    let base = envUrl.trim().replace(/\/+$/, "");
    if (typeof window !== "undefined" && window.location.protocol === "https:" && base.startsWith("http://")) {
      base = base.replace(/^http:\/\//i, "https://");
    }
    return `${base}${cleanPath}`;
  }
  // When VITE_SERVER_URL is empty, always use same-origin so Vite dev proxy
  // (on localhost) and Nginx reverse proxy (on hosting) handle routing without CORS
  // or cross-port self-signed certificate issues.
  return cleanPath;
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
  return "Player";
}

function setGameControlsActive(active: boolean) {
  if (active) {
    if (authModal && !authModal.classList.contains("hidden")) {
      return;
    }
    if (linkEmailModal && !linkEmailModal.classList.contains("hidden")) {
      return;
    }
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
    if (changeNameModal && !changeNameModal.classList.contains("hidden")) {
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

let loginMethod: "username" | "email" = "username";

function showAuthAlert(message: string, isSuccess = false) {
  authAlertMsg.textContent = message;
  authAlert.className = isSuccess ? "auth-alert success" : "auth-alert";
  authAlert.classList.remove("hidden");
}

function hideAuthAlert() {
  authAlert.classList.add("hidden");
  authAlertMsg.textContent = "";
}

function showLinkEmailAlert(message: string, isSuccess = false) {
  linkEmailAlertMsg.textContent = message;
  linkEmailAlert.className = isSuccess ? "auth-alert success" : "auth-alert";
  linkEmailAlert.classList.remove("hidden");
}

function hideLinkEmailAlert() {
  linkEmailAlert.classList.add("hidden");
  linkEmailAlertMsg.textContent = "";
}

function openAuthModal(mode: "login" | "register" | "forgot" = "login") {
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

function switchAuthTab(tab: "login" | "register" | "forgot") {
  hideAuthAlert();
  if (tab === "login") {
    authTabs.classList.remove("hidden");
    tabLogin.classList.add("active");
    tabRegister.classList.remove("active");
    loginForm.classList.remove("hidden");
    registerForm.classList.add("hidden");
    forgotPasswordForm.classList.add("hidden");
    setTimeout(() => loginUsernameInput.focus(), 60);
  } else if (tab === "register") {
    authTabs.classList.remove("hidden");
    tabRegister.classList.add("active");
    tabLogin.classList.remove("active");
    registerForm.classList.remove("hidden");
    loginForm.classList.add("hidden");
    forgotPasswordForm.classList.add("hidden");
    setTimeout(() => regUsernameInput.focus(), 60);
  } else {
    authTabs.classList.add("hidden");
    loginForm.classList.add("hidden");
    registerForm.classList.add("hidden");
    forgotPasswordForm.classList.remove("hidden");
    setTimeout(() => forgotEmailInput.focus(), 60);
  }
}

function setLoginMethod(method: "username" | "email") {
  loginMethod = method;
  hideAuthAlert();
  if (method === "email") {
    loginTabEmail.classList.add("active");
    loginTabUsername.classList.remove("active");
    loginIdentifierLabel.textContent = "Email";
    loginIdentifierIcon.innerHTML = '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>';
    loginUsernameInput.type = "email";
    loginUsernameInput.placeholder = "Enter your email...";
    loginUsernameInput.autocomplete = "email";
  } else {
    loginTabUsername.classList.add("active");
    loginTabEmail.classList.remove("active");
    loginIdentifierLabel.textContent = "Username";
    loginIdentifierIcon.innerHTML = '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
    loginUsernameInput.type = "text";
    loginUsernameInput.placeholder = "Enter your username...";
    loginUsernameInput.autocomplete = "username";
  }
  loginUsernameInput.value = "";
  setTimeout(() => loginUsernameInput.focus(), 30);
}

loginTabUsername.addEventListener("click", () => setLoginMethod("username"));
loginTabEmail.addEventListener("click", () => setLoginMethod("email"));

tabLogin.addEventListener("click", () => switchAuthTab("login"));
tabRegister.addEventListener("click", () => switchAuthTab("register"));
linkGoRegister.addEventListener("click", () => switchAuthTab("register"));
linkGoLogin.addEventListener("click", () => switchAuthTab("login"));
btnForgotPassword.addEventListener("click", () => switchAuthTab("forgot"));
linkForgotBackLogin.addEventListener("click", () => switchAuthTab("login"));

function setupOtpSender(
  button: HTMLButtonElement,
  emailInput: HTMLInputElement,
  purpose: "register" | "forgot_password" | "link_email",
  alertFn: (msg: string, isSuccess?: boolean) => void,
  hideAlertFn: () => void,
  withAuth = false,
) {
  let hasSentOnce = false;
  let cooldownTimer: number | null = null;

  const startCooldown = (seconds: number) => {
    if (cooldownTimer !== null) {
      window.clearInterval(cooldownTimer);
    }
    let remaining = seconds;
    button.disabled = true;
    button.textContent = `Resend OTP (${remaining}s)`;
    cooldownTimer = window.setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        if (cooldownTimer !== null) {
          window.clearInterval(cooldownTimer);
          cooldownTimer = null;
        }
        button.disabled = false;
        button.textContent = "Resend OTP";
      } else {
        button.textContent = `Resend OTP (${remaining}s)`;
      }
    }, 1000);
  };

  button.addEventListener("click", async () => {
    hideAlertFn();
    const email = emailInput.value.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alertFn("Please enter a valid email address first.");
      emailInput.focus();
      return;
    }

    button.disabled = true;
    button.textContent = "Sending...";

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (withAuth && authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }

      const res = await fetch(getApiUrl("/api/auth/send-otp"), {
        method: "POST",
        headers,
        body: JSON.stringify({ email, purpose }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alertFn(data.error || "Failed to send OTP.");
        if (data.cooldownRemaining && data.cooldownRemaining > 0) {
          hasSentOnce = true;
          startCooldown(data.cooldownRemaining);
        } else {
          button.disabled = false;
          button.textContent = hasSentOnce ? "Resend OTP" : "Send OTP";
        }
        return;
      }

      hasSentOnce = true;
      alertFn("OTP sent! Please check your email inbox (and spam folder).", true);
      startCooldown(data.cooldownSeconds || 60);
    } catch (err) {
      console.error("Send OTP failed:", err);
      alertFn("Network error while sending OTP. Please try again.");
      button.disabled = false;
      button.textContent = hasSentOnce ? "Resend OTP" : "Send OTP";
    }
  });
}

setupOtpSender(
  btnRegSendOtp,
  regEmailInput,
  "register",
  showAuthAlert,
  hideAuthAlert,
);
setupOtpSender(
  btnForgotSendOtp,
  forgotEmailInput,
  "forgot_password",
  showAuthAlert,
  hideAuthAlert,
);
setupOtpSender(
  btnLinkSendOtp,
  linkEmailInput,
  "link_email",
  showLinkEmailAlert,
  hideLinkEmailAlert,
  true,
);

function checkAndShowLinkEmailModal() {
  if (currentUser && currentUser.role !== "superadmin" && !currentUser.email) {
    hideLinkEmailAlert();
    linkEmailModal.classList.remove("hidden");
    setGameControlsActive(false);
    setTimeout(() => linkEmailInput.focus(), 60);
  } else {
    linkEmailModal.classList.add("hidden");
  }
}

(["keydown", "keyup", "keypress"] as const).forEach((evt) => {
  linkEmailModal.addEventListener(evt, (e) => {
    e.stopPropagation();
  });
});

// Password visibility toggles
document.querySelectorAll(".btn-toggle-pwd").forEach((btn) => {
  btn.addEventListener("click", () => {
    const targetId = (btn as HTMLElement).getAttribute("data-target");
    if (!targetId) return;
    const input = document.getElementById(targetId) as HTMLInputElement | null;
    if (input) {
      if (input.type === "password") {
        input.type = "text";
        btn.innerHTML = '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
      } else {
        input.type = "password";
        btn.innerHTML = '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
      }
    }
  });
});

// Register Form Submit
registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAuthAlert();

  const username = regUsernameInput.value.trim();
  const email = regEmailInput.value.trim();
  const otp = regOtpInput.value.trim();
  const displayName = regDisplayNameInput.value.trim();
  const password = regPasswordInput.value;
  const confirmPassword = regConfirmPasswordInput.value;

  if (!username) {
    showAuthAlert("Username is required.");
    return;
  }
  if (!email) {
    showAuthAlert("Email is required.");
    return;
  }
  if (!otp) {
    showAuthAlert("Please enter the OTP sent to your email.");
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
        email,
        otp,
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

  const identifier = loginUsernameInput.value.trim();
  const password = loginPasswordInput.value;

  if (!identifier || !password) {
    showAuthAlert(
      loginMethod === "email"
        ? "Please enter both email and password."
        : "Please enter both username and password.",
    );
    return;
  }

  btnSubmitLogin.disabled = true;
  btnSubmitLogin.innerHTML = `<span>Signing in...</span>`;

  try {
    const payload =
      loginMethod === "email"
        ? { email: identifier, loginType: "email", password }
        : { username: identifier, loginType: "username", password };

    const res = await fetch(getApiUrl("/api/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data: AuthResponse = await res.json();
    if (!res.ok || !data.success || !data.token || !data.user) {
      showAuthAlert(
        data.error ||
          (loginMethod === "email"
            ? "Invalid email or password."
            : "Invalid username or password."),
      );
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
    checkAndShowLinkEmailModal();
  } catch (err: any) {
    console.error("Login request failed:", err);
    showAuthAlert("Network error. Please check that the server is running.");
  } finally {
    btnSubmitLogin.disabled = false;
    btnSubmitLogin.innerHTML = `<span>Sign In</span><span class="btn-arrow">→</span>`;
  }
});

// Forgot Password Form Submit
forgotPasswordForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAuthAlert();

  const email = forgotEmailInput.value.trim();
  const otp = forgotOtpInput.value.trim();
  const newPassword = forgotNewPasswordInput.value;
  const confirmPassword = forgotConfirmPasswordInput.value;

  if (!email) {
    showAuthAlert("Email is required.");
    return;
  }
  if (!otp) {
    showAuthAlert("Please enter the OTP code.");
    return;
  }
  if (!newPassword || newPassword.length < 6) {
    showAuthAlert("New password must be at least 6 characters long.");
    return;
  }
  if (newPassword !== confirmPassword) {
    showAuthAlert("Passwords do not match.");
    return;
  }

  btnSubmitForgot.disabled = true;
  btnSubmitForgot.innerHTML = `<span>Resetting...</span>`;

  try {
    const res = await fetch(getApiUrl("/api/auth/forgot-password"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp, newPassword, confirmPassword }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      showAuthAlert(data.error || "Failed to reset password.");
      return;
    }

    forgotEmailInput.value = "";
    forgotOtpInput.value = "";
    forgotNewPasswordInput.value = "";
    forgotConfirmPasswordInput.value = "";

    switchAuthTab("login");
    showAuthAlert(
      data.message || "Password reset successfully. You can now sign in.",
      true,
    );
  } catch (err) {
    console.error("Forgot password request failed:", err);
    showAuthAlert("Network error. Please check that the server is running.");
  } finally {
    btnSubmitForgot.disabled = false;
    btnSubmitForgot.innerHTML = `<span>Reset Password</span><span class="btn-arrow">→</span>`;
  }
});

// Persistent Link Email Form Submit
linkEmailForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideLinkEmailAlert();

  const email = linkEmailInput.value.trim();
  const otp = linkEmailOtpInput.value.trim();

  if (!email) {
    showLinkEmailAlert("Please enter your email address.");
    return;
  }
  if (!otp) {
    showLinkEmailAlert("Please enter the OTP sent to your email.");
    return;
  }
  if (!authToken) {
    showLinkEmailAlert("Session expired. Please refresh and sign in again.");
    return;
  }

  btnSubmitLinkEmail.disabled = true;
  btnSubmitLinkEmail.innerHTML = `<span>Verifying...</span>`;

  try {
    const res = await fetch(getApiUrl("/api/auth/link-email"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ email, otp }),
    });
    const data: AuthResponse = await res.json();
    if (!res.ok || !data.success || !data.user) {
      showLinkEmailAlert(data.error || "Failed to link email.");
      return;
    }

    if (data.token) {
      authToken = data.token;
      localStorage.setItem("lepark_auth_token", authToken);
    }
    currentUser = data.user;
    localStorage.setItem("lepark_auth_user", JSON.stringify(currentUser));

    linkEmailInput.value = "";
    linkEmailOtpInput.value = "";
    linkEmailModal.classList.add("hidden");
    setGameControlsActive(true);
  } catch (err) {
    console.error("Link email request failed:", err);
    showLinkEmailAlert("Network error. Please check that the server is running.");
  } finally {
    btnSubmitLinkEmail.disabled = false;
    btnSubmitLinkEmail.innerHTML = `<span>Verify &amp; Link Email</span><span class="btn-arrow">→</span>`;
  }
});

// Logout Handler
dropdownLogoutBtn.addEventListener("click", () => {
  closeProfileDropdown();
  handleLogout();
});

function handleLogout() {
  stopAutoReconnect();
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
  currentSpaceId = "space_central_plaza";
  currentSpaceName = "CO3";
  myPersonalSpace = null;
  loadedSharedSpaces = [];
  loadedSpaces = [];

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
  regEmailInput.value = "";
  regOtpInput.value = "";
  regPasswordInput.value = "";
  regConfirmPasswordInput.value = "";
  linkEmailModal.classList.add("hidden");

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

// Sprite Templates Definition (Only default Male body for now; Female coming in the future)
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
    name: "Male",
    idleFrames: [
      "sheet:default_idle:sprite1",
      "sheet:default_idle:sprite2",
      "sheet:default_idle:sprite3",
      "sheet:default_idle:sprite4",
    ],
  },
];

let selectedTemplateId = "default";
try {
  localStorage.setItem("player_sprite_template", "default");
} catch {
  // ignore
}

function isTemplateUnlocked(templateId: string): boolean {
  const tpl = SPRITE_TEMPLATES.find((t) => t.id === templateId);
  return !!tpl;
}

function getActiveTemplate(): SpriteTemplate {
  return SPRITE_TEMPLATES[0];
}

function renderSpriteTemplatesGrid() {
  const grid = document.getElementById("sprite-templates-grid");
  const countBadge = document.getElementById("badge-template-count");
  if (countBadge) {
    countBadge.textContent = "Male";
  }
  if (!grid) return;

  grid.innerHTML = "";

  SPRITE_TEMPLATES.forEach((tpl) => {
    const card = document.createElement("div");
    card.className = "sprite-template-card active";
    card.setAttribute("data-template-id", tpl.id);
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");

    const initialImg = tpl.idleFrames[0] || DEFAULT_AVATAR_ICON;

    card.innerHTML = `
      <span class="template-card-check">✓</span>
      <div class="template-preview-box">
        <img id="template-anim-${tpl.id}" class="template-idle-img" ${imgSrcAttr(initialImg)} alt="${escapeHtml(tpl.name)}" />
      </div>
      <div class="template-card-name">${escapeHtml(tpl.name)}</div>
    `;

    card.addEventListener("click", () => {
      selectSpriteTemplate(tpl.id);
    });

    grid.appendChild(card);
  });
  hydrateSheetImages(grid);
}

type FashionCategory = "chest" | "pants" | "helmet";

let activeFashionTab: FashionCategory = "chest";
let selectedOutfit: PlayerOutfit = loadSavedOutfit();

function isValidFashionGearKey(slot: FashionCategory, key: unknown): string {
  if (typeof key !== "string" || !key) return "";
  return FASHION_GEAR_CATALOG.some((item) => item.slot === slot && item.id === key) ? key : "";
}

function loadSavedOutfit(): PlayerOutfit {
  try {
    const raw = localStorage.getItem("player_outfit");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        const chestKey = isValidFashionGearKey("chest", parsed.chestKey || parsed.outerwearKey);
        const pantsKey = isValidFashionGearKey("pants", parsed.pantsKey);
        const helmetKey = isValidFashionGearKey("helmet", parsed.helmetKey || parsed.hatKey);
        // Existing player with no gear equipped -> equip default Plain White Shirt & Jean Pants
        if (!chestKey && !pantsKey && !helmetKey) {
          const upgraded = { ...DEFAULT_CASUAL_OUTFIT };
          saveOutfitToStorage(upgraded);
          return upgraded;
        }
        return {
          ...DEFAULT_PLAYER_OUTFIT,
          chestKey,
          outerwearKey: chestKey,
          pantsKey,
          helmetKey,
          hatKey: helmetKey,
        };
      }
    }
  } catch {
    // Fallback to default outfit
  }
  return { ...DEFAULT_CASUAL_OUTFIT };
}

function saveOutfitToStorage(outfit: PlayerOutfit) {
  try {
    localStorage.setItem("player_outfit", JSON.stringify(outfit));
  } catch (err) {
    console.warn("Could not save outfit:", err);
  }
}

function updateFashionPickerVisibility() {
  if (!fashionPickerGroup) return;
  const isSwitchOn = switchUploadPictures ? switchUploadPictures.checked : false;
  const isDefaultSelected = selectedTemplateId === "default" && !isSwitchOn;
  fashionPickerGroup.classList.toggle("hidden", !isDefaultSelected);
  if (wardrobeTriggerSummary) {
    const equippedNames = [
      selectedOutfit.chestKey,
      selectedOutfit.pantsKey,
      selectedOutfit.helmetKey,
    ]
      .map((id) => FASHION_GEAR_CATALOG.find((g) => g.id === id)?.name)
      .filter(Boolean);
    wardrobeTriggerSummary.textContent =
      equippedNames.length > 0 ? equippedNames.join(", ") : "Equip cloth, pants & helmet";
  }
}

function getEquippedKeyForTab(tab: FashionCategory): string {
  if (tab === "chest") return selectedOutfit.chestKey || selectedOutfit.outerwearKey || "";
  if (tab === "pants") return selectedOutfit.pantsKey || "";
  return selectedOutfit.helmetKey || selectedOutfit.hatKey || "";
}

function setEquippedKeyForTab(tab: FashionCategory, itemId: string) {
  if (tab === "chest") {
    selectedOutfit = { ...selectedOutfit, chestKey: itemId, outerwearKey: itemId };
  } else if (tab === "pants") {
    selectedOutfit = { ...selectedOutfit, pantsKey: itemId };
  } else {
    selectedOutfit = { ...selectedOutfit, helmetKey: itemId, hatKey: itemId };
  }
  saveOutfitToStorage(selectedOutfit);
  renderFashionPicker();
  updatePreviewFrame();
  updateTemplateGridAnimations();
}

function renderFashionPicker() {
  updateFashionPickerVisibility();

  const tabBtns = document.querySelectorAll<HTMLButtonElement>(".fashion-tab-btn");
  tabBtns.forEach((btn) => {
    const tab = btn.getAttribute("data-fashion-tab") as FashionCategory | null;
    const isActive = tab === activeFashionTab;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-selected", isActive ? "true" : "false");
  });

  if (!fashionItemsGrid) return;
  fashionItemsGrid.innerHTML = "";
  if (fashionColorRow) {
    fashionColorRow.innerHTML = "";
    fashionColorRow.classList.add("hidden");
  }

  const equippedId = getEquippedKeyForTab(activeFashionTab);

  // "None" card to unequip the active slot
  const noneCard = document.createElement("div");
  noneCard.className = `sprite-template-card ${equippedId === "" ? "active" : ""}`;
  noneCard.setAttribute("role", "button");
  noneCard.setAttribute("tabindex", "0");
  noneCard.title = "None";
  noneCard.innerHTML = `
    <span class="template-card-check">✓</span>
    <div class="template-preview-box"><span class="fashion-none-icon">—</span></div>
    <div class="template-card-name">None</div>
  `;
  noneCard.addEventListener("click", () => setEquippedKeyForTab(activeFashionTab, ""));
  fashionItemsGrid.appendChild(noneCard);

  // Catalog items for the active slot (Leather Tunic, Leather Pants, Leather Helmet)
  const items = FASHION_GEAR_CATALOG.filter((item) => item.slot === activeFashionTab);
  items.forEach((item) => {
    const isActive = item.id === equippedId;
    const card = document.createElement("div");
    card.className = `sprite-template-card ${isActive ? "active" : ""}`;
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.title = item.name;
    card.innerHTML = `
      <span class="template-card-check">✓</span>
      <div class="template-preview-box">
        <img class="fashion-item-icon" src="${escapeHtml(item.iconPath)}" alt="${escapeHtml(item.name)}" style="width:48px;height:48px;object-fit:contain;image-rendering:pixelated;" />
      </div>
      <div class="template-card-name">${escapeHtml(item.name)}</div>
    `;
    card.addEventListener("click", () => setEquippedKeyForTab(activeFashionTab, item.id));
    fashionItemsGrid.appendChild(card);
  });
}

function setupFashionTabs() {
  const tabBtns = document.querySelectorAll<HTMLButtonElement>(".fashion-tab-btn");
  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.getAttribute("data-fashion-tab") as FashionCategory | null;
      if (!tab) return;
      activeFashionTab = tab;
      renderFashionPicker();
    });
  });
  renderFashionPicker();
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

  const cards = document.querySelectorAll<HTMLElement>("#sprite-templates-grid .sprite-template-card");
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

  updateFashionPickerVisibility();
  updatePreview();
}

function setupSpriteTemplates() {
  renderSpriteTemplatesGrid();
  selectSpriteTemplate(selectedTemplateId);
  setupFashionTabs();
  updateTemplateGridAnimations();
}

function updateTemplateGridAnimations() {
  SPRITE_TEMPLATES.forEach((tpl) => {
    if (tpl.idleFrames && tpl.idleFrames.length > 0) {
      const img = document.getElementById(`template-anim-${tpl.id}`) as HTMLImageElement | null;
      if (img) {
        if (tpl.id === "default") {
          const idx = previewFrameIndex % 4;
          renderFashionPreviewFrame(selectedOutfit, 0, idx, false)
            .then((url) => {
              if (url && img.src !== url) img.src = url;
            })
            .catch(() => {});
        } else {
          const frame = tpl.idleFrames[previewFrameIndex % tpl.idleFrames.length];
          setImgSrcResolved(img, frame);
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
    if (profileMenuModal && !profileMenuModal.classList.contains("hidden")) {
      updateProfileEquipCharFrame();
    }
  }, 166);
}

function updatePreview() {
  const currentName = getEffectivePlayerName();
  if (previewName) previewName.textContent = currentName;
  updatePreviewFrame();
}

function updatePreviewFrame() {
  const isSwitchOn = switchUploadPictures ? switchUploadPictures.checked : false;

  if (isSwitchOn && uploadedFrames.idle.length > 0) {
    const currentImg = uploadedFrames.idle[previewFrameIndex % uploadedFrames.idle.length];
    if (previewAvatar) setImgSrcResolved(previewAvatar, currentImg);
    if (previewFashionCloth) previewFashionCloth.classList.add("hidden");
    if (previewStatusHint) {
      previewStatusHint.textContent = `Custom character (idle)`;
      previewStatusHint.classList.remove("hidden");
    }
  } else {
    // Selected template still idle preview animation
    const tpl = getActiveTemplate();
    if (previewFashionCloth) previewFashionCloth.classList.add("hidden");
    if (tpl.id === "default") {
      const frameIdx = previewFrameIndex % 4;
      renderFashionPreviewFrame(selectedOutfit, 0, frameIdx, false)
        .then((url) => {
          if (url) {
            if (previewAvatar) previewAvatar.src = url;
            if (wardrobePreviewAvatar) wardrobePreviewAvatar.src = url;
          }
        })
        .catch(() => {});
      if (wardrobePreviewHint) {
        wardrobePreviewHint.textContent = "Outfit Preview";
      }
    } else {
      const frames = tpl.idleFrames.length > 0 ? tpl.idleFrames : DEFAULT_AVATARS.idle;
      const frameIdx = previewFrameIndex % frames.length;
      const currentImg = frames[frameIdx];
      if (previewAvatar) setImgSrcResolved(previewAvatar, currentImg);
    }

    if (previewStatusHint) {
      previewStatusHint.textContent = "Character (idle)";
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
    setImgSrcResolved(img, frameUrl);
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

function computeActiveAvatars(): PlayerAvatars | undefined {
  // Default Male character uses the Bake-on-Equip compositor
  return undefined;
}

// ==========================================
// Change Display Name Modal (Costs 1,000 FP)
// ==========================================

function showChangeNameFeedback(message: string) {
  if (!changeNameFeedback) return;
  changeNameFeedback.textContent = message;
  changeNameFeedback.classList.remove("hidden");
}

function hideChangeNameFeedback() {
  if (!changeNameFeedback) return;
  changeNameFeedback.textContent = "";
  changeNameFeedback.classList.add("hidden");
}

function updateChangeNameModalState() {
  const currentPoints = currentUser?.focusPoints ?? 0;
  const hasEnoughFp = currentPoints >= NAME_CHANGE_FP_COST;
  const currentDisplayName = (currentUser?.displayName || "").trim();
  const draftName = (changeNameInput?.value || "").trim();
  const isUnchanged = draftName === currentDisplayName;

  if (changeNameCurrentFp) {
    changeNameCurrentFp.textContent = `Balance: ${currentPoints.toLocaleString()} FP`;
    changeNameCurrentFp.classList.toggle("insufficient", !hasEnoughFp);
  }
  if (btnSubmitChangeName) {
    btnSubmitChangeName.disabled = !hasEnoughFp || isUnchanged;
    btnSubmitChangeName.textContent = `Change Name (${NAME_CHANGE_FP_COST.toLocaleString()} FP)`;
  }
}

function openChangeNameModal() {
  if (!changeNameModal) return;
  hideChangeNameFeedback();
  if (changeNameInput) {
    changeNameInput.value = currentUser?.displayName || "";
  }
  if (changeNameUsernameTag) {
    changeNameUsernameTag.textContent = currentUser?.username ? `@${currentUser.username}` : "@player";
  }
  updateChangeNameModalState();
  changeNameModal.classList.remove("hidden");
  setGameControlsActive(false);

  setTimeout(() => {
    changeNameInput?.focus();
    changeNameInput?.select();
  }, 50);
}

function closeChangeNameModal() {
  if (!changeNameModal) return;
  changeNameModal.classList.add("hidden");
  hideChangeNameFeedback();
  if (!isAnyModalOpen()) {
    setGameControlsActive(true);
  }
}

btnOpenChangeName?.addEventListener("click", () => {
  openChangeNameModal();
});

btnCloseChangeNameModal?.addEventListener("click", () => {
  closeChangeNameModal();
});

btnCancelChangeName?.addEventListener("click", () => {
  closeChangeNameModal();
});

changeNameModal?.addEventListener("click", (e) => {
  if (e.target === changeNameModal) {
    closeChangeNameModal();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && changeNameModal && !changeNameModal.classList.contains("hidden")) {
    e.stopImmediatePropagation();
    closeChangeNameModal();
  }
});

changeNameInput?.addEventListener("input", () => {
  hideChangeNameFeedback();
  updateChangeNameModalState();
});

changeNameForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser || !authToken || !changeNameInput) return;

  const newDisplayName = changeNameInput.value.trim();
  const previousDisplayName = (currentUser.displayName || "").trim();
  if (newDisplayName === previousDisplayName) {
    showChangeNameFeedback("Please enter a different name than your current one.");
    return;
  }

  const currentPoints = currentUser.focusPoints ?? 0;
  if (currentPoints < NAME_CHANGE_FP_COST) {
    showChangeNameFeedback(
      `You need ${NAME_CHANGE_FP_COST.toLocaleString()} Focus Points to change your name (you have ${currentPoints.toLocaleString()} FP).`
    );
    return;
  }

  if (btnSubmitChangeName) {
    btnSubmitChangeName.disabled = true;
    btnSubmitChangeName.textContent = "Saving...";
  }
  hideChangeNameFeedback();

  try {
    const res = await fetch(getApiUrl("/api/auth/profile"), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ displayName: newDisplayName || null }),
    });
    const data: AuthResponse & { points?: number } = await res.json();
    if (!res.ok || !data.success || !data.user) {
      if (typeof data.points === "number" && currentUser) {
        currentUser.focusPoints = data.points;
        updateFocusPointsDisplay(data.points);
      }
      showChangeNameFeedback(data.error || "Failed to change name.");
      updateChangeNameModalState();
      return;
    }

    currentUser = data.user;
    if (typeof data.points === "number") {
      currentUser.focusPoints = data.points;
    }
    if (data.token) {
      authToken = data.token;
      localStorage.setItem("lepark_auth_token", authToken);
    }
    localStorage.setItem("lepark_auth_user", JSON.stringify(currentUser));

    updateFocusPointsDisplay(currentUser.focusPoints ?? 0);
    focusUiController?.syncUserAuth(currentUser);
    updateTopBarUI();
    syncProfileModalUserInfo();

    const effectiveName = getEffectivePlayerName();
    if (multiplayer) {
      multiplayer.updateProfile(effectiveName, selectedColor, null, selectedOutfit);
    }

    closeChangeNameModal();
  } catch (err) {
    console.warn("Could not sync display name with server:", err);
    showChangeNameFeedback("Network error while changing name. Please try again.");
    updateChangeNameModalState();
  }
});

// ==========================================
// Middle Top Bar, Profile Modal & Equipment UI
// ==========================================

type ProfileEquipSlot = "helmet" | "chest" | "pants" | "boots" | "gloves";

const PROFILE_EQUIP_SLOT_LABELS: Record<ProfileEquipSlot, string> = {
  helmet: "Helmet",
  chest: "Armor",
  pants: "Pants",
  boots: "Shoes",
  gloves: "Gloves",
};

const PROFILE_CHAR_ROT_ORDER = [0, 1, 3, 2]; // Front (south) -> West -> Back (north) -> East

let activeProfileEquipTab: OutfitMode = (() => {
  const saved = localStorage.getItem("player_equip_tab");
  return saved === "casual" || saved === "adventure" ? saved : "casual";
})();

let selectedProfileEquipSlot: ProfileEquipSlot = "helmet";
let profileCharRotIdx = 0;

function sanitizeOutfitForMode(raw: any, mode: OutfitMode, fallback: PlayerOutfit): PlayerOutfit {
  if (!raw || typeof raw !== "object") return { ...fallback };
  const validFor = (slot: ProfileEquipSlot, key: unknown): string => {
    if (typeof key !== "string" || !key) return "";
    return FASHION_GEAR_CATALOG.some(
      (item) => item.slot === slot && item.category === mode && item.id === key
    )
      ? key
      : "";
  };
  const chestKey = validFor("chest", raw.chestKey || raw.outerwearKey);
  const pantsKey = validFor("pants", raw.pantsKey);
  const helmetKey = validFor("helmet", raw.helmetKey || raw.hatKey);
  const bootsKey = validFor("boots", raw.bootsKey);
  const glovesKey = validFor("gloves", raw.glovesKey);
  return {
    ...DEFAULT_PLAYER_OUTFIT,
    chestKey,
    outerwearKey: chestKey,
    pantsKey,
    helmetKey,
    hatKey: helmetKey,
    bootsKey,
    glovesKey,
  };
}

let casualOutfit: PlayerOutfit = (() => {
  try {
    const raw = localStorage.getItem("player_outfit_casual");
    if (raw) {
      const sanitized = sanitizeOutfitForMode(JSON.parse(raw), "casual", DEFAULT_CASUAL_OUTFIT);
      const hasAnyCasual = Boolean(
        sanitized.chestKey ||
          sanitized.pantsKey ||
          sanitized.helmetKey ||
          sanitized.bootsKey ||
          sanitized.glovesKey
      );
      if (hasAnyCasual) return sanitized;
      // Existing player had no casual gear -> equip Plain White Shirt & Jean Pants
      const upgraded = { ...DEFAULT_CASUAL_OUTFIT };
      localStorage.setItem("player_outfit_casual", JSON.stringify(upgraded));
      return upgraded;
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_CASUAL_OUTFIT };
})();

let adventureOutfit: PlayerOutfit = (() => {
  try {
    const raw = localStorage.getItem("player_outfit_adventure");
    if (raw) return sanitizeOutfitForMode(JSON.parse(raw), "adventure", DEFAULT_ADVENTURE_OUTFIT);
  } catch {
    // ignore
  }
  // All players have the leather set by default in Adventure
  return { ...DEFAULT_ADVENTURE_OUTFIT };
})();

function getProfileEquipOutfit(mode: OutfitMode = activeProfileEquipTab): PlayerOutfit {
  return mode === "casual" ? casualOutfit : adventureOutfit;
}

function getSlotKeyFromOutfit(outfit: PlayerOutfit, slot: ProfileEquipSlot): string {
  switch (slot) {
    case "helmet":
      return outfit.helmetKey || outfit.hatKey || "";
    case "chest":
      return outfit.chestKey || outfit.outerwearKey || "";
    case "pants":
      return outfit.pantsKey || "";
    case "boots":
      return outfit.bootsKey || "";
    case "gloves":
      return outfit.glovesKey || "";
  }
}

function setProfileEquipSlotItem(mode: OutfitMode, slot: ProfileEquipSlot, itemId: string) {
  const base = mode === "casual" ? casualOutfit : adventureOutfit;
  const updated: PlayerOutfit = { ...base };
  if (slot === "helmet") {
    updated.helmetKey = itemId;
    updated.hatKey = itemId;
  } else if (slot === "chest") {
    updated.chestKey = itemId;
    updated.outerwearKey = itemId;
  } else if (slot === "pants") {
    updated.pantsKey = itemId;
  } else if (slot === "boots") {
    updated.bootsKey = itemId;
  } else if (slot === "gloves") {
    updated.glovesKey = itemId;
  }

  if (mode === "casual") {
    casualOutfit = updated;
    try {
      localStorage.setItem("player_outfit_casual", JSON.stringify(casualOutfit));
    } catch {
      // ignore
    }
  } else {
    adventureOutfit = updated;
    try {
      localStorage.setItem("player_outfit_adventure", JSON.stringify(adventureOutfit));
    } catch {
      // ignore
    }
  }

  // Sync live active outfit to game & multiplayer
  selectedOutfit = { ...updated };
  saveOutfitToStorage(selectedOutfit);
  updatePreviewFrame();
  updateTemplateGridAnimations();
  updateTopBarUI();
  if (multiplayer) {
    multiplayer.changeOutfit(selectedOutfit);
    if (multiplayer.sessionId && gameInstance) {
      const activeScene = gameInstance.scene.getScene("GameScene") as GameScene;
      if (activeScene && typeof activeScene.setPlayerOutfit === "function") {
        activeScene.setPlayerOutfit(multiplayer.sessionId, selectedOutfit);
      }
    }
  }

  renderProfileEquipmentPane();
  updateProfileEquipCharFrame();
}

function updateProfileEquipCharFrame() {
  if (!profileEquipCharImg) return;
  const outfit = getProfileEquipOutfit(activeProfileEquipTab);
  const dirIndex = PROFILE_CHAR_ROT_ORDER[profileCharRotIdx % PROFILE_CHAR_ROT_ORDER.length];
  const frameIdx = previewFrameIndex % 4;
  renderFashionPreviewFrame(outfit, dirIndex, frameIdx, false)
    .then((url) => {
      if (url && profileEquipCharImg) {
        profileEquipCharImg.src = url;
      }
    })
    .catch(() => {});
}

function renderProfileEquipmentPane() {
  const mode = activeProfileEquipTab;
  const outfit = getProfileEquipOutfit(mode);

  // Update tabs
  profileEquipTabBtns.forEach((btn) => {
    const tab = btn.getAttribute("data-equip-tab") as OutfitMode | null;
    const isActive = tab === mode;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-selected", isActive ? "true" : "false");
  });

  // Update stage caption
  if (profileEquipStageLabel) {
    profileEquipStageLabel.textContent = `Male · ${mode === "casual" ? "Casual" : "Adventure"}`;
  }

  // Render 5 WoW equipment slots
  const slotBtns = document.querySelectorAll<HTMLButtonElement>(".wow-equip-slot");
  slotBtns.forEach((btn) => {
    const slot = btn.getAttribute("data-equip-slot") as ProfileEquipSlot | null;
    if (!slot) return;
    const equippedId = getSlotKeyFromOutfit(outfit, slot);
    const catalogItem = equippedId
      ? FASHION_GEAR_CATALOG.find((g) => g.id === equippedId)
      : undefined;

    btn.classList.toggle("equipped", !!catalogItem);
    btn.classList.toggle("selected", slot === selectedProfileEquipSlot);
    btn.title = catalogItem
      ? `${PROFILE_EQUIP_SLOT_LABELS[slot]}: ${catalogItem.name}`
      : `${PROFILE_EQUIP_SLOT_LABELS[slot]} (Empty)`;

    const placeholder = btn.querySelector<HTMLElement>(".wow-slot-placeholder");
    const iconImg = btn.querySelector<HTMLImageElement>(".wow-slot-icon");
    if (catalogItem && iconImg) {
      iconImg.src = catalogItem.iconPath;
      iconImg.alt = catalogItem.name;
      iconImg.classList.remove("hidden");
      placeholder?.classList.add("hidden");
    } else {
      iconImg?.classList.add("hidden");
      placeholder?.classList.remove("hidden");
    }
  });
}

profileEquipTabBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const tab = btn.getAttribute("data-equip-tab") as OutfitMode | null;
    if (!tab || tab === activeProfileEquipTab) return;
    activeProfileEquipTab = tab;
    try {
      localStorage.setItem("player_equip_tab", activeProfileEquipTab);
    } catch {
      // ignore
    }
    renderProfileEquipmentPane();
    updateProfileEquipCharFrame();
  });
});

document.querySelectorAll<HTMLButtonElement>(".wow-equip-slot").forEach((btn) => {
  btn.addEventListener("click", () => {
    const slot = btn.getAttribute("data-equip-slot") as ProfileEquipSlot | null;
    if (!slot) return;
    selectedProfileEquipSlot = slot;
    renderProfileEquipmentPane();
    ensureInventoryUiController().open({ slot, category: activeProfileEquipTab });
  });
});

document.getElementById("btn-profile-open-inventory")?.addEventListener("click", () => {
  ensureInventoryUiController().open();
});

btnProfileCharRotLeft?.addEventListener("click", () => {
  profileCharRotIdx = (profileCharRotIdx - 1 + PROFILE_CHAR_ROT_ORDER.length) % PROFILE_CHAR_ROT_ORDER.length;
  updateProfileEquipCharFrame();
});

btnProfileCharRotRight?.addEventListener("click", () => {
  profileCharRotIdx = (profileCharRotIdx + 1) % PROFILE_CHAR_ROT_ORDER.length;
  updateProfileEquipCharFrame();
});

btnProfileCharRotReset?.addEventListener("click", () => {
  profileCharRotIdx = 0;
  updateProfileEquipCharFrame();
});

function toggleProfileDropdown() {
  const isCurrentlyOpen = !profileMenuModal.classList.contains("hidden");
  if (isCurrentlyOpen) {
    closeProfileDropdown();
  } else {
    openProfileDropdown();
  }
}

function openProfileDropdown() {
  closeAudioSettingsDropdown();
  syncProfileModalUserInfo();
  renderProfileEquipmentPane();
  updateProfileEquipCharFrame();
  profileMenuModal.classList.remove("hidden");
  topbarProfileTrigger.classList.add("active");
}

function closeProfileDropdown() {
  profileMenuModal.classList.add("hidden");
  topbarProfileTrigger.classList.remove("active");
}

function syncProfileModalUserInfo() {
  if (profileModalUserName) {
    profileModalUserName.textContent = getEffectivePlayerName();
  }
  if (profileModalUsername) {
    profileModalUsername.textContent = currentUser?.username ? `@${currentUser.username}` : "";
    profileModalUsername.classList.toggle("hidden", !currentUser?.username);
  }
  if (profileModalAdminBadge) {
    profileModalAdminBadge.classList.toggle("hidden", currentUser?.role !== "superadmin");
  }
  if (profileModalStatusDot && topbarStatusDot) {
    profileModalStatusDot.style.background = topbarStatusDot.style.background;
    profileModalStatusDot.style.boxShadow = topbarStatusDot.style.boxShadow;
  }
}

topbarProfileTrigger.addEventListener("click", () => {
  toggleProfileDropdown();
});

topbarProfileTrigger.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    toggleProfileDropdown();
  }
});

if (btnCloseProfileModal) {
  btnCloseProfileModal.addEventListener("click", () => {
    closeProfileDropdown();
  });
}

if (profileMenuModal) {
  profileMenuModal.addEventListener("click", (e) => {
    if (e.target === profileMenuModal) {
      closeProfileDropdown();
    }
  });
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && profileMenuModal && !profileMenuModal.classList.contains("hidden")) {
    closeProfileDropdown();
  }
});

// Party button inside Player Menu: close Player Menu before FocusUiController opens Party modal
btnOpenSquad?.addEventListener("click", () => {
  closeProfileDropdown();
});

function openCurrentSpaceSettings() {
  // If in own personal space, open personal space settings modal
  if (myPersonalSpace && currentSpaceId === myPersonalSpace.id) {
    openMySpaceSettingsModal(myPersonalSpace);
    return;
  }

  // If in a shared space where current user is a housemate/co-owner
  const sharedSpace = loadedSharedSpaces.find((s) => s.id === currentSpaceId);
  if (sharedSpace) {
    openMySpaceSettingsModal(sharedSpace);
    return;
  }

  // If superadmin in directory space, open edit space modal for current space
  if (currentUser?.role === "superadmin") {
    const spaceToEdit = loadedSpaces.find((s) => s.id === currentSpaceId);
    if (spaceToEdit) {
      openAdminEditSpaceModal(spaceToEdit);
    } else if (myPersonalSpace) {
      openMySpaceSettingsModal(myPersonalSpace);
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
let isTileOptionsOpen = false;
let activeEditorTab: "utilities" | "flooring" | "wall" | "decoration" = "utilities";
let isMobileDragFillEnabled = false;

function isTouchDeviceCapable(): boolean {
  return (
    (navigator.maxTouchPoints ?? 0) > 0 ||
    window.matchMedia("(hover: none) and (pointer: coarse)").matches
  );
}

function isAreaDragToolActive(): boolean {
  return (
    activeEditorTool === "flooring" ||
    activeEditorTool === "decoration" ||
    activeEditorTool === "clear_decoration" ||
    activeEditorTool === "private_zone" ||
    activeEditorTool === "clear_private_zone"
  );
}

function syncMobileDragFillButton() {
  if (!btnToggleDragFill) return;
  const show = isEditModeActive && isTouchDeviceCapable() && isAreaDragToolActive();
  btnToggleDragFill.classList.toggle("hidden", !show);
  btnToggleDragFill.classList.toggle("active", isMobileDragFillEnabled);
  btnToggleDragFill.setAttribute("aria-pressed", String(isMobileDragFillEnabled));
}

function setMobileDragFillEnabled(enabled: boolean) {
  isMobileDragFillEnabled = enabled;
  syncMobileDragFillButton();
  if (gameInstance) {
    const scene = gameInstance.scene.getScene("GameScene") as GameScene | undefined;
    scene?.setMobileDragFillMode?.(enabled);
  }
}

function setEditorDrawerMinimized(minimized: boolean) {
  if (!mapEditorSidebar) return;
  mapEditorSidebar.classList.toggle("minimized", minimized);
  if (!minimized) {
    setTileOptionsOpen(false);
  }
  const btnExpandMapEditor = document.getElementById("btn-expand-map-editor");
  if (btnExpandMapEditor) {
    btnExpandMapEditor.setAttribute("aria-expanded", String(!minimized));
    btnExpandMapEditor.setAttribute(
      "aria-label",
      minimized ? "Open Map Editor drawer" : "Minimize Map Editor drawer"
    );
  }
}

function setTileOptionsOpen(open: boolean) {
  isTileOptionsOpen = open;
  if (open) {
    if (mapEditorSidebar && !mapEditorSidebar.classList.contains("minimized")) {
      mapEditorSidebar.classList.add("minimized");
      const btnExpandMapEditor = document.getElementById("btn-expand-map-editor");
      if (btnExpandMapEditor) {
        btnExpandMapEditor.setAttribute("aria-expanded", "false");
        btnExpandMapEditor.setAttribute("aria-label", "Open Map Editor drawer");
      }
    }
  }
  if (mapEditorTileOptionsSidebar) {
    mapEditorTileOptionsSidebar.classList.toggle("hidden", !open);
  }
  if (btnToggleTileOptions) {
    btnToggleTileOptions.classList.toggle("active", open);
    btnToggleTileOptions.setAttribute("aria-expanded", String(open));
  }
}

function switchEditorTab(tabName: "utilities" | "flooring" | "wall" | "decoration") {
  activeEditorTab = tabName;
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

function isEditorAssetUnlocked(assetId: string): boolean {
  if (!isPaidAssetId(assetId)) return true;
  if (currentUser?.role === "superadmin") return true;
  if (currentUser && Array.isArray(currentUser.unlockedAssets)) {
    return currentUser.unlockedAssets.includes(assetId);
  }
  return false;
}

function updateEditorAssetLockStates() {
  const isSuperadmin = currentUser?.role === "superadmin";
  const toolSellerNpc = document.getElementById("tool-seller-npc");
  if (toolSellerNpc) {
    toolSellerNpc.classList.toggle("hidden", !isSuperadmin);
  }

  const cards = document.querySelectorAll<HTMLButtonElement>(
    "#map-editor-sidebar .editor-asset-card[data-asset-id]"
  );
  cards.forEach((card) => {
    const assetId = card.dataset.assetId;
    if (!assetId) return;
    const isPaid = isPaidAssetId(assetId);
    const isOwned = !isPaid || isEditorAssetUnlocked(assetId);

    // Non-superadmin users ONLY see free assets and assets they have bought from Seller NPCs
    card.classList.toggle("hidden", isPaid && !isOwned);
    card.classList.remove("locked");
    card.removeAttribute("title");
  });

  if (
    currentSelectedAssetId &&
    isPaidAssetId(currentSelectedAssetId) &&
    !isEditorAssetUnlocked(currentSelectedAssetId)
  ) {
    currentSelectedAssetId = "";
    currentSelectedAssetName = "No Asset Selected";
    if (
      activeEditorTool === "flooring" ||
      activeEditorTool === "decoration" ||
      activeEditorTool === "freeform_decoration"
    ) {
      activeEditorTool = "none";
      const scene = gameInstance?.scene?.getScene("GameScene") as GameScene | undefined;
      scene?.setActiveEditorTool("none");
      updateEditBannerText();
    }
  }
}

/**
 * Filter map editor sub-tabs and update counts so users only see bought/owned asset packs.
 */
function updateEditorAssetGroupVisibility() {
  updateEditorAssetLockStates();

  const categoryGroups = document.querySelectorAll<HTMLElement>(
    "#map-editor-sidebar .editor-category-group"
  );
  categoryGroups.forEach((categoryGroup) => {
    const category = categoryGroup.dataset.category;
    const groupPanels = categoryGroup.querySelectorAll<HTMLElement>(
      ".editor-group-panel[data-asset-group-panel]"
    );
    const groupTabBtns = Array.from(
      categoryGroup.querySelectorAll<HTMLButtonElement>(
        ".editor-group-tab-btn[data-asset-group-tab]"
      )
    );
    let totalVisibleInCategory = 0;

    groupPanels.forEach((panel) => {
      const groupName = panel.dataset.assetGroupPanel || "";
      const visibleCards = panel.querySelectorAll(
        ".editor-asset-card:not(.hidden)"
      ).length;
      const shouldHideGroup = groupName !== "Free" && visibleCards === 0;

      panel.classList.toggle("hidden", shouldHideGroup);
      const tabBtn = groupTabBtns.find((btn) => btn.dataset.assetGroupTab === groupName);
      if (tabBtn) {
        const wasActive = tabBtn.classList.contains("active");
        tabBtn.classList.toggle("hidden", shouldHideGroup);
        if (shouldHideGroup && wasActive) {
          switchAssetGroupTab(categoryGroup, "Free");
        }
      }

      if (!shouldHideGroup) {
        totalVisibleInCategory += visibleCards;
      }
    });

    const countEl = categoryGroup.querySelector<HTMLElement>(".category-count");
    if (countEl && (category === "flooring" || category === "decoration")) {
      const unit = category === "flooring" ? "styles" : "items";
      countEl.textContent = `${totalVisibleInCategory} ${unit}`;
    }
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
      if (!tab) return;

      const isMinimized = mapEditorSidebar?.classList.contains("minimized");
      if (isMinimized) {
        switchEditorTab(tab);
        isEditorUIHidden = false;
        document.body.classList.remove("editor-placing-mode");
        setEditorDrawerMinimized(false);
      } else if (tab === activeEditorTab) {
        setEditorDrawerMinimized(true);
      } else {
        switchEditorTab(tab);
        setTileOptionsOpen(false);
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

  // 1c. Bottom bar Drawer Open / Minimize toggle
  const btnExpandMapEditor = document.getElementById("btn-expand-map-editor");
  if (btnExpandMapEditor && mapEditorSidebar) {
    btnExpandMapEditor.addEventListener("click", () => {
      const isNowMinimized = !mapEditorSidebar.classList.contains("minimized");
      if (!isNowMinimized) {
        isEditorUIHidden = false;
        document.body.classList.remove("editor-placing-mode");
      }
      setEditorDrawerMinimized(isNowMinimized);
    });
  }

  // 2. Minimalist Tile Options Popover & Mobile Drag Fill toggle controls
  if (btnToggleDragFill) {
    btnToggleDragFill.addEventListener("click", (e) => {
      e.stopPropagation();
      setMobileDragFillEnabled(!isMobileDragFillEnabled);
    });
  }

  if (btnToggleTileOptions) {
    btnToggleTileOptions.addEventListener("click", (e) => {
      e.stopPropagation();
      if (btnToggleTileOptions.disabled) return;
      setTileOptionsOpen(!isTileOptionsOpen);
    });
  }

  if (btnCloseTileOptions) {
    btnCloseTileOptions.addEventListener("click", (e) => {
      e.stopPropagation();
      setTileOptionsOpen(false);
    });
  }

  updateEditorAssetGroupVisibility();
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
          if (editorOptionsBtnThumb) {
            editorOptionsBtnThumb.src = assetPath;
            editorOptionsBtnThumb.classList.remove("hidden");
          }
        } else {
          tileOptionsPreviewImg.classList.add("hidden");
          tileOptionsPreviewPlaceholder.classList.remove("hidden");
          if (editorOptionsBtnThumb) {
            editorOptionsBtnThumb.classList.add("hidden");
          }
        }
      });
    } else {
      tileOptionsPreviewImg.classList.add("hidden");
      tileOptionsPreviewPlaceholder.classList.remove("hidden");
      if (editorOptionsBtnThumb) {
        editorOptionsBtnThumb.classList.add("hidden");
      }
    }
  }

  if (btnToggleTileOptions) {
    btnToggleTileOptions.disabled = !info.active;
    btnToggleTileOptions.title = info.active ? "Tile Options" : "Select a tile or item first";
  }
  if (!info.active && isTileOptionsOpen) {
    setTileOptionsOpen(false);
  }

  if (tileOptionsControls) {
    tileOptionsControls.classList.toggle("disabled", !info.active);
  }
  if (tileOptPassableSwitch) {
    tileOptPassableSwitch.disabled = !info.active;
    tileOptPassableSwitch.checked = info.passable;
  }
  if (tileOptPassableHint) {
    tileOptPassableHint.textContent = info.passable ? "Walkable" : "Solid";
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
  if (editorOptionsBtnThumb) {
    editorOptionsBtnThumb.classList.toggle("flipped-x", info.flipX);
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
      adjustPlacementLayer(-1);
    });
  }

  if (btnTileOptLayerUp) {
    btnTileOptLayerUp.addEventListener("click", () => {
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
  | "seller_npc"
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
  updateEditBannerText();
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

  if (activeEditorContextMenuItem && gameInstance) {
    const scene = gameInstance.scene.getScene("GameScene") as GameScene;
    const curr = scene?.getItemTileOptions?.(activeEditorContextMenuItem);
    if (scene && curr) {
      scene.setItemLayerLevel(activeEditorContextMenuItem, curr.layer + delta);
      syncRightTileOptionsSidebar();
    }
    return;
  }

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
  syncMobileDragFillButton();
}

function showPlacingToast(message: string) {
  if (!editorPlacingToast) return;
  if (placingToastName) {
    placingToastName.textContent = message;
  }
  if (placingToastFadeTimeout) {
    clearTimeout(placingToastFadeTimeout);
    placingToastFadeTimeout = null;
  }

  editorPlacingToast.classList.remove("hidden");
  editorPlacingToast.classList.remove("faded");

  placingToastFadeTimeout = setTimeout(() => {
    if (editorPlacingToast) {
      editorPlacingToast.classList.add("faded");
      setTimeout(() => {
        if (editorPlacingToast?.classList.contains("faded")) {
          editorPlacingToast.classList.add("hidden");
          editorPlacingToast.classList.remove("faded");
        }
      }, 300);
    }
  }, 2600);
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

function hideEditorUIForPlacing(_assetName?: string) {
  if (!isEditModeActive) return;
  isEditorUIHidden = true;
  document.body.classList.add("editor-placing-mode");
  setEditorDrawerMinimized(true);
}

function showEditorUI() {
  if (!isEditModeActive) return;
  isEditorUIHidden = false;
  document.body.classList.remove("editor-placing-mode");
  setEditorDrawerMinimized(false);
  setTileOptionsOpen(false);
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

  if (mapEditorSidebar) {
    mapEditorSidebar.classList.remove("hidden", "expanded");
  }
  setEditorDrawerMinimized(false);
  setTileOptionsOpen(false);
  updateEditorAssetGroupVisibility();
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
      dinerUiController?.setEditMode(true);
      scene.setActiveEditorTool(activeEditorTool);
      scene.setSelectedAsset(currentSelectedAssetId);
      scene.setDecorationPassable(isDecorationPassable);
      scene.setDecorationOntop(isDecorationOntop);
      scene.setPlacementLayer(currentPlacementLayer);
    }
  }

  setMobileDragFillEnabled(false);
  syncRightTileOptionsSidebar();
  updatePlacementLayerUI();
  updateEditBannerText();
}

function exitEditMode() {
  if (!isEditModeActive) return;
  isEditModeActive = false;
  isEditorUIHidden = false;
  setMobileDragFillEnabled(false);
  document.body.classList.remove("edit-mode-active");
  dinerUiController?.setEditMode(false);
  document.body.classList.remove("editor-placing-mode");
  hidePlacingToast();
  const toprightBar = document.getElementById("topright-bar");
  if (toprightBar) toprightBar.classList.remove("hidden");
  if (chatSidebar) chatSidebar.classList.remove("hidden");

  setTileOptionsOpen(false);
  if (mapEditorSidebar) {
    mapEditorSidebar.classList.add("hidden");
    mapEditorSidebar.classList.remove("minimized", "expanded");
  }
  closeEditorItemContextMenu();
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

function selectSellerNpcTool() {
  if (currentUser?.role !== "superadmin") {
    alert("Only superadmin can place or configure Seller NPC counters.");
    return;
  }
  activeEditorTool = "seller_npc";

  const cards = document.querySelectorAll(".editor-asset-card");
  cards.forEach((card) => {
    if ((card as HTMLElement).dataset.toolType === "seller_npc") {
      card.classList.add("selected");
    } else {
      card.classList.remove("selected");
    }
  });

  updateEditBannerText();

  if (gameInstance) {
    const scene = gameInstance.scene.getScene("GameScene") as GameScene;
    if (scene) {
      scene.setActiveEditorTool("seller_npc");
      scene.setPlacementLayer(currentPlacementLayer);
    }
  }

  hideEditorUIForPlacing("Seller NPC & Counter (Click map to place / relocate)");
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
    if (obstacleIcon) obstacleIcon.innerHTML = '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>';
    if (obstacleLabel) obstacleLabel.textContent = "Obstacle: ON";
    btnObstacle.title = "Click to make walkable (passable)";
  } else {
    btnObstacle.classList.add("is-passable");
    if (obstacleIcon) obstacleIcon.innerHTML = '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
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
      ? matched.label
      : "Select interaction...";
  }
}

function getInteractionIconSvg(interactionId: string): string {
  switch (interactionId) {
    case "type_race":
      return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10"/></svg>`;
    case "smoke_duel":
      return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2c.5 2.5-1.5 4-1.5 6.5a2.5 2.5 0 0 0 5 0c0-1.5-.5-2.5-1.5-3.5"/><path d="M8.5 14.5A2.5 2.5 0 0 1 11 12c2.5 0 4.5 2 4.5 4.5a4.5 4.5 0 1 1-9 0c0-.7.2-1.4.5-2"/></svg>`;
    case "chess":
      return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 4h6l-1 5 2 8H8l2-8-1-5z"/><path d="M6 20h12"/></svg>`;
    case "jukebox":
      return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`;
    case "fishing":
      return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="5" r="2"/><path d="M12 7v14"/><path d="M5 13a7 7 0 0 0 14 0"/></svg>`;
    case "organisation":
      return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M13 8h4M13 12h4M13 16h4"/></svg>`;
    case "notes":
      return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></svg>`;
    case "calendar":
      return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;
    case "meals":
      return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>`;
    case "inventory":
      return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>`;
    case "asset_shop":
      return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7"/></svg>`;
    default:
      return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>`;
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
    btn.innerHTML = `<span class="editor-interaction-option-icon">${getInteractionIconSvg(opt.id)}</span><span>${opt.label}</span>`;
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
  const sellerControlsEl = document.getElementById("editor-seller-npc-controls");
  const btnMove = document.getElementById("btn-editor-item-move");
  const btnDelete = document.getElementById("btn-editor-item-delete");
  if (!menuEl) return;

  dropdownPanel?.classList.add("hidden");

  if (nameEl) {
    nameEl.textContent = item.label || "Map Item";
  }

  const scene = gameInstance
    ? (gameInstance.scene.getScene("GameScene") as GameScene)
    : null;

  const isSellerNpc = item.kind === "seller_npc";
  const isSuperadmin = currentUser?.role === "superadmin";

  if (btnObstacle) {
    if (isSellerNpc || item.kind === "spawn_point" || item.kind === "private_zone") {
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
    !isSellerNpc &&
    scene &&
    typeof scene.isItemInteractableSupported === "function"
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

  if (sellerControlsEl) {
    if (isSellerNpc && isSuperadmin && scene) {
      sellerControlsEl.classList.remove("hidden");
      populateSellerNpcMenuControls(scene.getSellerNpcState());
    } else {
      sellerControlsEl.classList.add("hidden");
    }
  }

  if (btnMove) {
    btnMove.style.display = isSellerNpc && !isSuperadmin ? "none" : "flex";
  }
  if (btnDelete) {
    btnDelete.style.display = isSellerNpc && !isSuperadmin ? "none" : "flex";
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
      privateZoneModalTitle.textContent = "Name Private Area";
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
      privateZoneModalTitle.textContent = "Rename Private Area";
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
        <span class="zone-item-icon"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>
        <div class="zone-item-details">
          <span class="zone-item-name">${escapeHtml(zone.name || `Area ${idx + 1}`)}</span>
          <span class="zone-item-meta">${cols}×${rows} (${totalTiles} tiles)</span>
        </div>
      </div>
      <div class="zone-item-actions">
        <button type="button" class="zone-item-edit-btn" title="Rename this private area" data-zone-id="${zone.id}"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></button>
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
    const crown = player.isSuperadmin ? "[Admin] " : "";
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
  if (btnPlayerMenuInviteSquad) {
    const canInvite = !isMe && !!(currentUser && player.userId && player.userId > 0);
    btnPlayerMenuInviteSquad.style.display = canInvite ? "flex" : "none";
  }
  if (btnPlayerMenuAddFriend) {
    btnPlayerMenuAddFriend.style.display = isMe ? "none" : "flex";
    if (!isMe && playerMenuAddFriendLabel) {
      const targetUid = player.userId || 0;
      const isAlreadyFriend =
        targetUid > 0 &&
        (friendsCache.online.some((f) => f.userId === targetUid) ||
          friendsCache.offline.some((f) => f.userId === targetUid));
      const isPending =
        targetUid > 0 && friendsCache.pending.some((f) => f.userId === targetUid);
      const isIncoming =
        targetUid > 0 && friendsCache.requests.some((f) => f.userId === targetUid);
      if (isAlreadyFriend) {
        playerMenuAddFriendLabel.textContent = "Friends ✓";
        btnPlayerMenuAddFriend.disabled = true;
      } else if (isPending) {
        playerMenuAddFriendLabel.textContent = "Request Sent";
        btnPlayerMenuAddFriend.disabled = true;
      } else if (isIncoming) {
        playerMenuAddFriendLabel.textContent = "Accept Friend";
        btnPlayerMenuAddFriend.disabled = false;
      } else {
        playerMenuAddFriendLabel.textContent = "Add Friend";
        btnPlayerMenuAddFriend.disabled = false;
      }
    }
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
  const menuHeight = 195;
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
    <span class="chat-tab-icon"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></span>
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

function updateOrgTabBadge(orgId: number) {
  const convo = orgConversations.get(orgId);
  if (!convo || !convo.tabElement) return;
  const badge = convo.tabElement.querySelector(".chat-tab-badge");
  if (!badge) return;
  if (convo.unreadCount > 0) {
    badge.classList.remove("hidden");
  } else {
    badge.classList.add("hidden");
  }
}

function renderOrgTabContent(tab: HTMLButtonElement, org: Organisation) {
  const iconHtml = org.logo
    ? `<img src="${escapeHtml(org.logo)}" alt="${escapeHtml(org.name)}" class="chat-tab-org-logo" />`
    : `<span class="chat-tab-icon"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M13 8h4M13 12h4M13 16h4"/></svg></span>`;
  tab.title = `Organisation: ${org.name}`;
  tab.innerHTML = `
    ${iconHtml}
    <span class="chat-tab-name">${escapeHtml(org.name)}</span>
    <span class="chat-tab-badge hidden"></span>
  `;
}

async function loadOrgChatHistory(orgId: number) {
  if (!authToken) return;
  const convo = orgConversations.get(orgId);
  if (!convo || convo.historyLoaded) return;
  convo.historyLoaded = true;
  try {
    const res = await fetch(getApiUrl(`/api/organisations/${orgId}/messages`), {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.ok) return;
    const data = await res.json();
    if (data.success && Array.isArray(data.messages)) {
      const existingIds = new Set(convo.messages.map((m) => m.id));
      const merged = [...(data.messages as ChatMessage[]).filter((m) => !existingIds.has(m.id)), ...convo.messages];
      merged.sort((a, b) => a.timestamp - b.timestamp);
      convo.messages = merged;
      if (activeChatRoom === `org_${orgId}`) {
        renderCurrentChatMessages();
        scrollChatToBottom();
      }
    }
  } catch (err) {
    console.warn("Failed to load org chat history:", err);
  }
}

function syncOrgChatTabs(orgs: Organisation[]) {
  const activeIds = new Set(orgs.map((o) => o.id));

  // Remove tabs for organisations the player is no longer in
  for (const [orgId, convo] of Array.from(orgConversations.entries())) {
    if (!activeIds.has(orgId)) {
      if (convo.tabElement) {
        convo.tabElement.remove();
      }
      orgConversations.delete(orgId);
      if (activeChatRoom === `org_${orgId}`) {
        switchChatTab(currentInsideZone ? "zone" : "map");
      }
    }
  }

  if (!chatTabsContainer) return;

  for (const org of orgs) {
    let convo = orgConversations.get(org.id);
    if (!convo) {
      convo = {
        orgId: org.id,
        org,
        messages: [],
        historyLoaded: false,
        unreadCount: 0,
      };
      orgConversations.set(org.id, convo);
    } else {
      convo.org = org;
    }

    let tab = convo.tabElement;
    if (!tab || !document.getElementById(`chat-tab-org-${org.id}`)) {
      tab = document.createElement("button");
      tab.type = "button";
      tab.id = `chat-tab-org-${org.id}`;
      tab.className = "chat-tab chat-tab-org";
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-selected", activeChatRoom === `org_${org.id}` ? "true" : "false");
      if (activeChatRoom === `org_${org.id}`) {
        tab.classList.add("active");
      }
      tab.dataset.room = `org_${org.id}`;
      renderOrgTabContent(tab, org);

      tab.addEventListener("click", () => {
        switchChatTab(`org_${org.id}`);
      });

      chatTabsContainer.appendChild(tab);
      convo.tabElement = tab;
    } else {
      renderOrgTabContent(tab, org);
      updateOrgTabBadge(org.id);
    }

    if (!convo.historyLoaded) {
      loadOrgChatHistory(org.id);
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

  orgConversations.forEach((convo) => {
    if (convo.tabElement) {
      convo.tabElement.classList.remove("active");
      convo.tabElement.setAttribute("aria-selected", "false");
    }
  });

  if (chatChannelBanner) {
    chatChannelBanner.classList.remove("private", "whisper", "org");
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
      chatChannelDesc.textContent = `Private Area • Only players inside "${zoneName}" can see messages`;
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
        chatChannelDesc.textContent = `Direct Message • Private chat with @${convo.userName}`;
      }
      if (chatActiveChannelLabel) chatActiveChannelLabel.textContent = `@${convo.userName}`;
      if (chatInputField) chatInputField.placeholder = `Message @${convo.userName} (Whisper)...`;
    }
  } else if (target.startsWith("org_")) {
    const orgId = Number(target.replace("org_", ""));
    const convo = orgConversations.get(orgId);
    if (convo) {
      if (convo.tabElement) {
        convo.tabElement.classList.add("active");
        convo.tabElement.setAttribute("aria-selected", "true");
      }
      convo.unreadCount = 0;
      updateOrgTabBadge(orgId);

      if (chatChannelBanner) chatChannelBanner.classList.add("org");
      if (chatChannelDot) {
        chatChannelDot.style.backgroundColor = "";
      }
      if (chatChannelDesc) {
        chatChannelDesc.textContent = `${convo.org.name} • ${convo.org.members.length} member${convo.org.members.length === 1 ? "" : "s"}`;
      }
      if (chatActiveChannelLabel) chatActiveChannelLabel.textContent = convo.org.name;
      if (chatInputField) chatInputField.placeholder = `Message ${convo.org.name}...`;
      if (!convo.historyLoaded) {
        loadOrgChatHistory(orgId);
      }
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
  } else if (activeChatRoom.startsWith("org_")) {
    const orgId = Number(activeChatRoom.replace("org_", ""));
    const convo = orgConversations.get(orgId);
    messagesToRender = convo ? convo.messages : [];
  }

  if (messagesToRender.length === 0) {
    const welcome = document.createElement("div");
    welcome.className = "chat-welcome-notice";
    let title = "";
    let sub = "";
    let icon = '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';

    if (activeChatRoom.startsWith("org_")) {
      const orgId = Number(activeChatRoom.replace("org_", ""));
      const convo = orgConversations.get(orgId);
      const orgName = convo?.org.name || "Organisation";
      icon = '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M13 8h4M13 12h4M13 16h4"/></svg>';
      title = `${escapeHtml(orgName)}`;
      sub = `Private organisation channel for ${escapeHtml(orgName)} members.`;
    } else if (activeChatRoom.startsWith("dm_")) {
      const targetSessionId = activeChatRoom.replace("dm_", "");
      const convo = dmConversations.get(targetSessionId);
      const name = convo?.userName || "Player";
      icon = '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
      title = `Whisper with ${escapeHtml(name)}`;
      sub = `Direct message conversation with @${escapeHtml(name)}. Only the two of you can see these messages.`;
    } else if (activeChatRoom === "map") {
      icon = '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>';
      title = `Welcome to ${escapeHtml(currentSpaceName)}!`;
      sub = "Talk to everyone exploring this space.";
    } else {
      icon = '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
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

  const crownHtml = msg.isSuperadmin ? `<span class="chat-msg-crown" title="Superadmin"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"/><path d="M5 20h14"/></svg></span>` : "";
  const tagHtml =
    msg.roomType === "zone"
      ? `<span class="chat-msg-tag-zone">${escapeHtml(msg.roomName)}</span>`
      : msg.roomType === "whisper"
      ? `<span class="chat-msg-tag-whisper">Whisper</span>`
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
  } else if (msg.roomType === "org") {
    const orgId = Number(msg.roomId);
    if (!Number.isInteger(orgId) || orgId <= 0) return;

    let convo = orgConversations.get(orgId);
    if (!convo) {
      // Newly added to an organisation while online: refresh organisations list
      fetchOrganisationsData().then(() => {
        const refreshed = orgConversations.get(orgId);
        if (refreshed && !refreshed.messages.some((m) => m.id === msg.id)) {
          refreshed.messages.push(msg);
          if (activeChatRoom === `org_${orgId}`) {
            appendChatMessageElement(msg, true);
          } else {
            refreshed.unreadCount++;
            updateOrgTabBadge(orgId);
          }
        }
      });
      return;
    }

    if (!convo.messages.some((m) => m.id === msg.id)) {
      convo.messages.push(msg);
    }

    if (activeChatRoom === `org_${orgId}`) {
      appendChatMessageElement(msg, true);
    } else {
      convo.unreadCount++;
      updateOrgTabBadge(orgId);
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
  const shopModalEl = document.getElementById("asset-shop-modal");
  if (shopModalEl && !shopModalEl.classList.contains("hidden")) return true;
  const twModal = document.getElementById("typerace-modal");
  if (twModal && !twModal.classList.contains("hidden")) return true;
  const jbModal = document.getElementById("jukebox-modal");
  if (jbModal && !jbModal.classList.contains("hidden")) return true;
  if (notesModal && !notesModal.classList.contains("hidden")) return true;
  if (spaceInventoryModal && !spaceInventoryModal.classList.contains("hidden")) return true;
  if (calendarModal && !calendarModal.classList.contains("hidden")) return true;
  if (organisationModal && !organisationModal.classList.contains("hidden")) return true;
  if (authModal && !authModal.classList.contains("hidden")) return true;
  if (linkEmailModal && !linkEmailModal.classList.contains("hidden")) return true;
  if (mapModal && !mapModal.classList.contains("hidden")) return true;
  if (changeNameModal && !changeNameModal.classList.contains("hidden")) return true;
  if (mySpaceSettingsModal && !mySpaceSettingsModal.classList.contains("hidden")) return true;
  if (adminSpaceModal && !adminSpaceModal.classList.contains("hidden")) return true;
  if (privateZoneNameModal && !privateZoneNameModal.classList.contains("hidden")) return true;
  if (offlineModal && !offlineModal.classList.contains("hidden")) return true;
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

async function visitPlayerSpace(target: {
  userId?: number | null;
  name: string;
  userSpaceId?: string | null;
}) {
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
      '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
    );
    return;
  }

  if (currentSpaceId === targetSpaceId) {
    return;
  }

  await switchSpace(targetSpaceId, targetSpaceName);
}

if (btnPlayerMenuVisitSpace) {
  btnPlayerMenuVisitSpace.addEventListener("click", async () => {
    if (!activeMenuPlayer) return;
    const target = { ...activeMenuPlayer };
    closePlayerContextMenu();
    await visitPlayerSpace(target);
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

if (btnPlayerMenuInviteSquad) {
  btnPlayerMenuInviteSquad.addEventListener("click", () => {
    if (!activeMenuPlayer) return;
    const targetUserId = activeMenuPlayer.userId;
    const targetSessionId = activeMenuPlayer.sessionId;
    closePlayerContextMenu();
    ensureFocusUiController().invitePlayerBySessionOrUser(targetUserId, targetSessionId);
  });
}

if (btnPlayerMenuAddFriend) {
  btnPlayerMenuAddFriend.addEventListener("click", async () => {
    if (!activeMenuPlayer) return;
    const targetUserId = activeMenuPlayer.userId;
    const targetName = activeMenuPlayer.name;
    closePlayerContextMenu();

    if (!authToken) {
      alert("Please log in to add friends.");
      return;
    }
    if (!targetUserId || targetUserId <= 0) {
      alert(`${targetName} is playing as a guest and cannot be added as a friend.`);
      return;
    }

    try {
      const res = await fetch(getApiUrl("/api/friends/request"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ targetUserId }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || "Failed to send friend request.");
        return;
      }
      await fetchFriendsData();
    } catch (err) {
      console.error("Failed to send friend request:", err);
      alert("Failed to send friend request.");
    }
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

if (throwBattleSetupModal) {
  throwBattleSetupModal.addEventListener("click", (e) => {
    if (e.target === throwBattleSetupModal) {
      pendingChallengeTargetSessionId = null;
      throwBattleSetupModal.classList.add("hidden");
      setGameControlsActive(true);
    }
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
  icon: string = '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'
) {
  if (spaceErrorTitle) spaceErrorTitle.textContent = title;
  if (spaceErrorMessage) spaceErrorMessage.textContent = message;
  if (spaceErrorReturnName) spaceErrorReturnName.textContent = returnSpaceName;
  if (spaceErrorIcon) spaceErrorIcon.innerHTML = icon;
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
    } else if (activeChatRoom.startsWith("org_")) {
      const orgId = Number(activeChatRoom.replace("org_", ""));
      if (!Number.isInteger(orgId) || orgId <= 0) return;
      multiplayer.sendChatMessage({
        roomType: "org",
        roomId: String(orgId),
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
    btnTestAudioOutput.textContent = "Playing...";
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

// Close floating context menus & editor interaction dropdown on outside UI click
document.addEventListener("click", (e) => {
  const target = e.target as HTMLElement | null;
  if (!target) return;
  // Canvas clicks are handled by GameScene pointerdown (with player/item hit guards)
  const isOnCanvas = Boolean(target.closest("#game-container"));

  if (
    !isOnCanvas &&
    playerContextMenu &&
    !playerContextMenu.classList.contains("hidden") &&
    !playerContextMenu.contains(target)
  ) {
    closePlayerContextMenu();
    if (gameInstance) {
      const scene = gameInstance.scene.getScene("GameScene") as GameScene;
      scene?.closePlayerMenu();
    }
  }

  const editorMenuEl = document.getElementById("editor-item-context-menu");
  if (
    !isOnCanvas &&
    editorMenuEl &&
    !editorMenuEl.classList.contains("hidden") &&
    !editorMenuEl.contains(target)
  ) {
    closeEditorItemContextMenu();
    if (gameInstance) {
      const scene = gameInstance.scene.getScene("GameScene") as GameScene;
      scene?.closeEditorItemMenu();
    }
  }

  const interactionPicker = document.getElementById("editor-item-interaction-picker");
  const interactionPanel = document.getElementById("editor-interaction-dropdown-panel");
  if (
    interactionPanel &&
    !interactionPanel.classList.contains("hidden") &&
    interactionPicker &&
    !interactionPicker.contains(target)
  ) {
    interactionPanel.classList.add("hidden");
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
    setupMultiplayerFocusListeners(multiplayer);
    setupMultiplayerFriendListeners(multiplayer);
    setupMultiplayerThrowBattleListeners(multiplayer);
    setupMultiplayerDinerListeners(multiplayer);
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
      jukeboxStatusBadge.textContent = "RESTRICTED (ERROR 150)";
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
      `Successfully added ${data.count} track${data.count === 1 ? "" : "s"} from playlist "${data.title}"!`,
      "success",
      6000
    );
    if (btnJukeboxAddPlaylist) btnJukeboxAddPlaylist.disabled = false;
    if (btnJukeboxPlaylistLabel) btnJukeboxPlaylistLabel.textContent = "Extract";
  });

  mgr.onJukeboxError((data) => {
    showJukeboxStatus(data.message || "Failed to process jukebox request.", "error", 7000);
    if (btnJukeboxAddPlaylist) btnJukeboxAddPlaylist.disabled = false;
    if (btnJukeboxPlaylistLabel) btnJukeboxPlaylistLabel.textContent = "Extract";
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
      jukeboxStatusIcon.innerHTML = '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
      jukeboxStatusIcon.className = "jukebox-status-icon";
    } else {
      jukeboxStatusIcon.innerHTML = '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
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
  if (btnJukeboxPlaylistLabel) btnJukeboxPlaylistLabel.textContent = "Extract";

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

const JUKEBOX_PAUSE_SVG =
  '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>';
const JUKEBOX_PLAY_SVG =
  '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"/></svg>';

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
          <span class="empty-queue-icon"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M7 8l9-5"/><circle cx="8" cy="14" r="2"/><line x1="14" y1="12" x2="17" y2="12"/><line x1="14" y1="16" x2="17" y2="16"/></svg></span>
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
        if (btnJukeboxPlayPauseIcon) btnJukeboxPlayPauseIcon.innerHTML = JUKEBOX_PAUSE_SVG;
        if (btnJukeboxPlayPauseText) btnJukeboxPlayPauseText.textContent = "Pause";
      } else {
        btnJukeboxPlayPause.title = "Resume playback";
        if (btnJukeboxPlayPauseIcon) btnJukeboxPlayPauseIcon.innerHTML = JUKEBOX_PLAY_SVG;
        if (btnJukeboxPlayPauseText) btnJukeboxPlayPauseText.textContent = "Play";
      }
    }

    if (jukeboxStatusBadge) {
      if (jb.isPlaying) {
        jukeboxStatusBadge.textContent = `PLAYING (${jb.currentTrackIndex + 1}/${jb.playlist.length})`;
        jukeboxStatusBadge.classList.remove("status-paused");
      } else {
        jukeboxStatusBadge.textContent = `PAUSED (${jb.currentTrackIndex + 1}/${jb.playlist.length})`;
        jukeboxStatusBadge.classList.add("status-paused");
      }
    }
  } else {
    if (jukeboxNowPlayingTitle) jukeboxNowPlayingTitle.textContent = "Playlist Empty";
    if (jukeboxNowPlayingSubmitter)
      jukeboxNowPlayingSubmitter.textContent = "Add a YouTube link below to start";
    if (jukeboxStatusBadge) {
      jukeboxStatusBadge.textContent = "IDLE";
      jukeboxStatusBadge.classList.remove("status-paused");
    }
    if (btnJukeboxSkip) btnJukeboxSkip.disabled = true;
    if (btnJukeboxPlayPause) {
      btnJukeboxPlayPause.disabled = true;
      if (btnJukeboxPlayPauseIcon) btnJukeboxPlayPauseIcon.innerHTML = JUKEBOX_PAUSE_SVG;
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
          <span class="empty-queue-icon"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg></span>
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
        btnRemove.innerHTML = '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
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
        btnJukeboxHudMute.innerHTML = isMuted ? '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>' : '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>';
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
      if (btnJukeboxPlaylistLabel) btnJukeboxPlaylistLabel.textContent = "Extracting...";

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
          if (btnJukeboxPlaylistLabel) btnJukeboxPlaylistLabel.textContent = "Extracting...";
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
        btnTypeRaceReadyText.textContent = "Spectating Current Match";
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
          readyBadge = `<span class="player-ready-tag viewer">Viewer</span>`;
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
          typeraceTextInput.placeholder = "Spectating live race...";
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
          statsText = `#${p.finishRank} Finished (${p.finishTime}s) • ${p.wpm} WPM`;
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
            <div class="track-lane-racer-icon" style="left:${p.progress}%;"></div>
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
        if (res.rank === 1) rankBadge = "1st";
        else if (res.rank === 2) rankBadge = "2nd";
        else if (res.rank === 3) rankBadge = "3rd";

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
      if (finishedBadge) finishedBadge.textContent = `${localCigarettesFinished} ${localCigarettesFinished === 1 ? 'cigarette' : 'cigarettes'} finished`;
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
        ashtrayStarterInfoBadge.innerHTML = `<strong>You are the Game Starter</strong> • Configure rules below`;
      } else {
        ashtrayStarterInfoBadge.innerHTML = `Game Starter: <strong>${escapeHtml(starter?.name || "Waiting...")}</strong>`;
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
          statusBadge = `<span class="player-ready-tag viewer">Spectator</span>`;
        } else if (p.isStarter) {
          statusBadge = `<span class="player-ready-tag starter">Starter</span>`;
        } else if (p.isReady) {
          statusBadge = `<span class="player-ready-tag ready">✓ Ready</span>`;
        } else {
          statusBadge = `<span class="player-ready-tag waiting">⏳ Waiting</span>`;
        }

        const isMeTag = p.sessionId === mySessionId ? ` <span class="ashtray-you-tag">(You)</span>` : "";
        const avatarUrl = p.avatarUrl || DEFAULT_AVATAR_ICON;

        card.innerHTML = `
          <div class="lobby-player-meta">
            <div class="lobby-avatar-wrap" style="border-color: ${p.color || '#3b82f6'};">
              <img ${imgSrcAttr(avatarUrl)} class="lobby-avatar-img" alt="${escapeHtml(p.name)}" />
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
      hydrateSheetImages(ashtrayLobbyPlayersList);
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
        const avatarUrl = p.avatarUrl || DEFAULT_AVATAR_ICON;
        const isMeTag = isMe ? ` <span class="smoking-you-tag">(You)</span>` : "";
        const starterCrown = p.isStarter ? ` <span class="smoking-crown-icon" title="Starter"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"/><path d="M5 20h14"/></svg></span>` : "";

        const lane = document.createElement("div");
        lane.className = `smoking-lane-card ${isMe ? "is-me" : ""}`;
        lane.dataset.sessionId = p.sessionId;

        lane.innerHTML = `
          <!-- Player Model with Name -->
          <div class="smoking-lane-player">
            <div class="smoking-avatar-box" style="border-color: ${p.color || '#3b82f6'};">
              <img ${imgSrcAttr(avatarUrl)} class="smoking-avatar-img" alt="${escapeHtml(p.name)}" />
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
                <span class="smoking-mini-ember"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2c.5 2.5-1.5 4-1.5 6.5a2.5 2.5 0 0 0 5 0c0-1.5-.5-2.5-1.5-3.5"/><path d="M8.5 14.5A2.5 2.5 0 0 1 11 12c2.5 0 4.5 2 4.5 4.5a4.5 4.5 0 1 1-9 0c0-.7.2-1.4.5-2"/></svg></span>
              </div>
            </div>

            <!-- Under the mini progress: Total cigarettes already finished -->
            <div class="smoking-mini-finished-row">
              <span class="smoking-finished-badge">${finishedCount} ${finishedCount === 1 ? 'cigarette' : 'cigarettes'} finished</span>
              <span class="smoking-total-mashes">Total: ${isMe ? localTotalMashes : (p.totalMashes || 0)} mashes</span>
            </div>
          </div>
        `;
        ashtrayPlayersLanes.appendChild(lane);
      }
      hydrateSheetImages(ashtrayPlayersLanes);
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
          ? `You Won the Smoking Duel!`
          : `${winner.name} Won the Duel!`;
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
        if (res.rank === 1) rankBadge = "1st";
        else if (res.rank === 2) rankBadge = "2nd";
        else if (res.rank === 3) rankBadge = "3rd";

        const isMeTag = res.sessionId === mySessionId ? ` <span style="font-size:10px;color:#94a3b8;">(You)</span>` : "";
        const avatarUrl = res.avatarUrl || DEFAULT_AVATAR_ICON;

        row.innerHTML = `
          <td class="col-rank"><strong>${rankBadge}</strong></td>
          <td class="col-player">
            <div class="scoreboard-player-meta">
              <div class="scoreboard-avatar-wrap" style="border-color: ${res.color || '#3b82f6'};">
                <img ${imgSrcAttr(avatarUrl)} class="scoreboard-avatar-img" alt="${escapeHtml(res.name)}" />
              </div>
              <span class="scoreboard-player-name">${escapeHtml(res.name)}${isMeTag}</span>
            </div>
          </td>
          <td class="col-finished"><strong style="color:#f97316;font-size:15px;">${res.cigarettesFinished}</strong></td>
          <td class="col-last">${res.currentMashes} mashes</td>
          <td class="col-speed">${res.mashesPerSecond || 0} mps</td>
          <td class="col-total">${res.totalMashes || 0}</td>
        `;
        ashtrayScoreboardBody.appendChild(row);
      });
      hydrateSheetImages(ashtrayScoreboardBody);
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
          text: `Caught a ${quality.toUpperCase()} ${fish.name} (${size} in) at the Aquarium!`,
        });
      }
    });
  }

  scene.onAquariumClick = (aqId: string) => {
    fishingGame?.open(aqId);
  };

  scene.onOrganisationClick = () => {
    openOrganisationModal();
  };

  scene.onNotesClick = () => {
    openNotesModal();
  };

  scene.onInventoryClick = () => {
    openSpaceInventoryModal(currentSpaceId || undefined);
  };

  scene.onAssetShopClick = () => {
    void openAssetShopModal();
  };

  scene.onSellerNpcClick = (sellerNpc) => {
    void openAssetShopModal(sellerNpc);
  };

  scene.onGuildHelperNpcClick = () => {
    ensureNetherworldUiController().handleGuildHelperNpcInteract();
  };

  scene.onCalendarClick = () => {
    openCalendarModal();
  };

  scene.onMealsClick = () => {
    openCalendarModal("meals");
  };

  scene.onNearbyInteractableChange = (nearby) => {
    updateMobileInteractButton(nearby);
  };
  scene.onDinerNearbyChange = (dinerAction) => {
    ensureDinerUiController().updateNearbyAction(dinerAction);
    updateMobileInteractButton(scene.getActiveNearbyInteractable());
  };
  updateMobileInteractButton(scene.getActiveNearbyInteractable());
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
            <span class="chess-create-icon"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span>
          </div>
          <div class="chess-create-info">
            <h4 class="chess-create-title">Create Game</h4>
            <p class="chess-create-desc">Host a match as White and wait for a second player to join</p>
          </div>
          <button type="button" class="btn-create-chess-game">
            <span>Create Game</span>
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
      const hostAvatar = myWaitingMatch.whitePlayer?.avatarUrl || DEFAULT_AVATAR_ICON;

      myCard.innerHTML = `
        <div class="chess-card-top-row">
          <span class="chess-card-match-id">Match #${myWaitingMatch.matchId.slice(-6)} <span class="chess-you-pill">(You)</span></span>
          <span class="chess-card-status-pill waiting">
            <span class="chess-card-pulse-dot"></span> Waiting for Opponent
          </span>
        </div>
        <div class="chess-card-players-row">
          <div class="chess-card-player-item" title="Host: ${escapeHtml(hostName)}">
            <img ${imgSrcAttr(hostAvatar)} class="chess-card-player-avatar" alt="${escapeHtml(hostName)}" />
            <span class="chess-card-player-name"><span class="chess-color-dot white"></span> ${escapeHtml(hostName)}</span>
          </div>
          <span class="chess-card-vs">VS</span>
          <div class="chess-card-player-item waiting-slot" title="Waiting for player 2 to join...">
            <div class="chess-slot-avatar-placeholder">⏳</div>
            <span class="chess-card-player-name slot-hint"><span class="chess-color-dot black"></span> Open Slot</span>
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
      const hostAvatar = game.whitePlayer?.avatarUrl || DEFAULT_AVATAR_ICON;

      card.innerHTML = `
        <div class="chess-card-top-row">
          <span class="chess-card-match-id">Match #${game.matchId.slice(-6)}</span>
          <span class="chess-card-status-pill waiting">
            <span class="chess-card-pulse-dot"></span> Open Challenge
          </span>
        </div>
        <div class="chess-card-players-row">
          <div class="chess-card-player-item" title="Host: ${escapeHtml(hostName)}">
            <img ${imgSrcAttr(hostAvatar)} class="chess-card-player-avatar" alt="${escapeHtml(hostName)}" />
            <span class="chess-card-player-name"><span class="chess-color-dot white"></span> ${escapeHtml(hostName)}</span>
          </div>
          <span class="chess-card-vs">VS</span>
          <div class="chess-card-player-item waiting-slot" title="Waiting for second player!">
            <div class="chess-slot-avatar-placeholder"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/><line x1="13" y1="19" x2="19" y2="13"/><line x1="16" y1="16" x2="20" y2="20"/><line x1="19" y1="21" x2="21" y2="19"/></svg></div>
            <span class="chess-card-player-name slot-hint"><span class="chess-color-dot black"></span> Join as Player 2</span>
          </div>
        </div>
        <div class="chess-card-footer">
          <div class="chess-waiting-meta">
            <span>Ready for Challenger</span>
          </div>
          <button type="button" class="btn-join-waiting-game" data-match-id="${game.matchId}">
            Join Game
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
          <span class="chess-hint-icon"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 4h6l-1 5 2 8H8l2-8-1-5z"/><path d="M6 20h12"/></svg></span>
          <strong class="chess-hint-title">No other players waiting</strong>
          <span class="chess-hint-desc">Click "Create Game" to host a match and wait for a challenger!</span>
        </div>
      `;
      chessWaitingGrid.appendChild(hintCard);
    }
    hydrateSheetImages(chessWaitingGrid);
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
      const statusText = game.inCheck ? `Check! (${turnLabel})` : `In Progress • ${turnLabel}`;

      const whiteName = game.whitePlayer?.name || "Player 1";
      const whiteAvatar = game.whitePlayer?.avatarUrl || DEFAULT_AVATAR_ICON;
      const blackName = game.blackPlayer?.name || "Player 2";
      const blackAvatar = game.blackPlayer?.avatarUrl || DEFAULT_AVATAR_ICON;

      card.innerHTML = `
        <div class="chess-card-top-row">
          <span class="chess-card-match-id">Match #${game.matchId.slice(-6)}</span>
          <span class="${statusClass}">${statusText}</span>
        </div>
        <div class="chess-card-players-row">
          <div class="chess-card-player-item" title="White: ${escapeHtml(whiteName)}">
            <img ${imgSrcAttr(whiteAvatar)} class="chess-card-player-avatar" alt="${escapeHtml(whiteName)}" />
            <span class="chess-card-player-name"><span class="chess-color-dot white"></span> ${escapeHtml(whiteName)}</span>
          </div>
          <span class="chess-card-vs">VS</span>
          <div class="chess-card-player-item" title="Black: ${escapeHtml(blackName)}">
            <img ${imgSrcAttr(blackAvatar)} class="chess-card-player-avatar" alt="${escapeHtml(blackName)}" />
            <span class="chess-card-player-name"><span class="chess-color-dot black"></span> ${escapeHtml(blackName)}</span>
          </div>
        </div>
        <div class="chess-card-footer">
          <div class="chess-card-meta">
            <span>${game.moveCount} moves</span>
            <span><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> ${game.spectatorCount}</span>
          </div>
          <button type="button" class="btn-spectate-game" data-match-id="${game.matchId}">
            Spectate
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
    hydrateSheetImages(chessGamesGrid);
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
      chessMatchStatusBadge.textContent = `Checkmate! ${winnerName || "Winner"} wins!`;
      chessMatchStatusBadge.style.borderColor = "#eab308";
    } else if (state.status === "resigned") {
      chessMatchStatusBadge.textContent = `${state.winReason || "Game ended by resignation"}`;
      chessMatchStatusBadge.style.borderColor = "#ef4444";
    } else if (state.status === "draw" || state.status === "stalemate") {
      chessMatchStatusBadge.textContent = `${state.winReason || "Game drawn"}`;
      chessMatchStatusBadge.style.borderColor = "#3b82f6";
    } else if (state.inCheck) {
      const turnName = state.turn === "white" ? state.whitePlayer?.name : state.blackPlayer?.name;
      chessMatchStatusBadge.textContent = `Check! (${turnName}'s turn)`;
      chessMatchStatusBadge.style.borderColor = "#ef4444";
    } else {
      const turnName = state.turn === "white" ? state.whitePlayer?.name : state.blackPlayer?.name;
      chessMatchStatusBadge.textContent = `${turnName || state.turn}'s turn (${state.turn === "white" ? "White" : "Black"})`;
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
      btnChessOfferDraw.textContent = "Accept Draw";
    } else {
      btnChessOfferDraw.textContent = "Draw";
    }
  }
  if (btnChessRematch) {
    btnChessRematch.classList.add("hidden");
  }

  // 3. Top players bar
  if (chessWhiteName) chessWhiteName.textContent = state.whitePlayer?.name || "Waiting...";
  if (chessWhiteAvatar) setImgSrcResolved(chessWhiteAvatar, state.whitePlayer?.avatarUrl || DEFAULT_AVATAR_ICON);
  if (chessBlackName) chessBlackName.textContent = state.blackPlayer?.name || "Waiting...";
  if (chessBlackAvatar) setImgSrcResolved(chessBlackAvatar, state.blackPlayer?.avatarUrl || DEFAULT_AVATAR_ICON);

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
    const avatarUrl = spec.avatarUrl || DEFAULT_AVATAR_ICON;
    item.innerHTML = `
      <img ${imgSrcAttr(avatarUrl)} class="chess-spectator-avatar" alt="${escapeHtml(spec.name || "Spectator")}" />
      <span class="chess-spectator-name">${escapeHtml(spec.name || "Spectator")}</span>
      <span class="chess-spectator-badge">Watching</span>
    `;
    chessSpectatorsList.appendChild(item);
  });
  hydrateSheetImages(chessSpectatorsList);
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

let focusUiController: FocusUiController | null = null;
let netherworldUiController: NetherworldUiController | null = null;

function ensureNetherworldUiController(): NetherworldUiController {
  if (!netherworldUiController) {
    netherworldUiController = new NetherworldUiController({
      getMultiplayer: () => multiplayer,
      getCurrentUser: () => currentUser,
      getFocusPoints: () => currentUser?.focusPoints || 0,
      getPlayerVisualInfo: () => ({
        outfit: selectedOutfit,
        avatars: computeActiveAvatars() || null,
      }),
      isFocusLocked: () => focusUiController?.isFocusLocked() ?? false,
      setGameControlsActive: (active: boolean) => setGameControlsActive(active),
      onOpenGuildDecorShop: () => {
        void openAssetShopModal();
      },
    });
  }
  return netherworldUiController;
}

function ensureFocusUiController(): FocusUiController {
  if (!focusUiController) {
    focusUiController = new FocusUiController({
      getMultiplayer: () => multiplayer,
      getGameScene: () => {
        if (!gameInstance) return null;
        return (gameInstance.scene.getScene("GameScene") as GameScene) || null;
      },
      getCurrentUser: () => currentUser,
      getAuthToken: () => authToken,
      getCurrentSpaceId: () => currentSpaceId,
      getCurrentSpaceName: () => currentSpaceName,
      getAllSpaces: () => {
        const list = [...loadedSpaces, ...loadedSharedSpaces];
        if (myPersonalSpace) list.push(myPersonalSpace);
        return list;
      },
      getFriendsOnline: () => friendsCache.online,
      onRefreshFriends: async () => {
        if (authToken) await fetchFriendsData();
      },
      onPointsUpdated: (totalPoints: number, stats?: FocusStats) => {
        if (currentUser) {
          currentUser.focusPoints = totalPoints;
          if (stats) {
            currentUser.focusStats = stats;
            if (stats.lastPublicSpaceId !== undefined) {
              currentUser.lastPublicSpaceId = stats.lastPublicSpaceId;
            }
          }
          try {
            localStorage.setItem("lepark_auth_user", JSON.stringify(currentUser));
          } catch {}
        }
        updateFocusPointsDisplay(totalPoints);
        renderSpriteTemplatesGrid();
        updateOrgPointsBanner();
      },
      setGameControlsActive: (active: boolean) => setGameControlsActive(active),
      onFocusLockChanged: (locked: boolean) => {
        ensureNetherworldUiController().updateFocusLockButtonState(locked);
      },
    });
    focusUiController.syncUserAuth(currentUser);
    ensureNetherworldUiController();
  }
  return focusUiController;
}

let inventoryUiController: InventoryUiController | null = null;

function ensureInventoryUiController(): InventoryUiController {
  if (!inventoryUiController) {
    inventoryUiController = new InventoryUiController({
      getMultiplayer: () => multiplayer,
      getCurrentUser: () => currentUser,
      getActiveEquipMode: () => activeProfileEquipTab,
      getOutfitForMode: (mode) => getProfileEquipOutfit(mode),
      onEquipSlotChanged: (mode, slot, templateId) => {
        if (
          slot === "helmet" ||
          slot === "chest" ||
          slot === "pants" ||
          slot === "boots" ||
          slot === "gloves"
        ) {
          setProfileEquipSlotItem(mode, slot, templateId);
        }
      },
    });
  }
  return inventoryUiController;
}

function setupMultiplayerFocusListeners(mgr: MultiplayerManager) {
  ensureFocusUiController().attachMultiplayer(mgr);
  ensureNetherworldUiController().attachMultiplayer(mgr);
  ensureInventoryUiController().attachMultiplayer(mgr);
}

let dinerUiController: DinerUiController | null = null;
const registeredDinerManagers = new WeakSet<MultiplayerManager>();

function ensureDinerUiController(): DinerUiController {
  if (!dinerUiController) {
    dinerUiController = new DinerUiController({
      onPrimaryAction: () => {
        const scene = gameInstance?.scene.getScene("GameScene") as GameScene | undefined;
        scene?.triggerDinerAction();
      },
      onLeaveShift: () => {
        const scene = gameInstance?.scene.getScene("GameScene") as GameScene | undefined;
        scene?.triggerDinerLeaveShift();
      },
    });
  }
  return dinerUiController;
}

function setupMultiplayerDinerListeners(mgr: MultiplayerManager) {
  const ui = ensureDinerUiController();
  ui.setSessionId(mgr.sessionId || "");
  if (mgr.currentDinerState) {
    ui.updateState(mgr.currentDinerState, mgr.sessionId || "");
  }
  if (registeredDinerManagers.has(mgr)) return;
  registeredDinerManagers.add(mgr);

  mgr.onDinerState((state) => {
    ui.updateState(state, mgr.sessionId || "");
  });
  mgr.onDinerError((err) => {
    ui.handleError(err);
  });
  mgr.onDinerEvent((ev) => {
    ui.handleEvent(ev);
  });
  mgr.onRoomJoined(() => {
    ui.setSessionId(mgr.sessionId || "");
  });
  mgr.onConnectionStatus((connected) => {
    if (!connected) {
      ui.reset();
    }
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

function populateOfficeDecorationGrid(
  gridId: string,
  assets: readonly string[],
  prefix: string,
  _groupLabel: string,
  tileType: "decoration" | "floor" = "decoration"
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
    if (tileType === "decoration") {
      btn.dataset.tileType = "decoration";
    }

    const thumb = document.createElement("div");
    thumb.className = "asset-card-thumb";

    const img = document.createElement("img");
    img.alt = "";
    img.className = "asset-thumb-img";
    img.loading = "lazy";

    const check = document.createElement("span");
    check.className = "asset-card-check";
    check.textContent = "✓";

    thumb.append(img, check);
    btn.append(thumb);
    fragment.appendChild(btn);
  }
  grid.appendChild(fragment);
}

populateOfficeDecorationGrid("office-one-deco-grid", OFFICE_ONE_DECORATION_ASSETS, "office_one", "Office One");
populateOfficeDecorationGrid("office-two-deco-grid", OFFICE_TWO_DECORATION_ASSETS, "office_two", "Office Two");
populateOfficeDecorationGrid("pet-shop-deco-grid", PET_SHOP_DECORATION_ASSETS, "pet_shop", "Pet Shop");
populateOfficeDecorationGrid("adventure-guild-deco-grid", ADVENTURE_GUILD_DECORATION_ASSETS, "adventure_guild", "Adventure Guild");
populateOfficeDecorationGrid("restaurant-deco-grid", RESTAURANT_DECORATION_ASSETS, "restaurant", "Restaurant");
populateOfficeDecorationGrid("living-room-one-deco-grid", LIVING_ROOM_ONE_DECORATION_ASSETS, "living_room_one", "Living Room One");
populateOfficeDecorationGrid("living-room-two-deco-grid", LIVING_ROOM_TWO_DECORATION_ASSETS, "living_room_two", "Living Room Two");
populateOfficeDecorationGrid("living-room-floor-grid", LIVING_ROOM_FLOOR_ASSETS, "living_room_floor", "Living Room", "floor");
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
    } else if (toolType === "seller_npc") {
      selectSellerNpcTool();
    } else {
      const id = card.dataset.assetId || "wood_5";
      const name = card.dataset.assetName || "Wood 5";
      const tileType = card.dataset.tileType;
      if (!isEditorAssetUnlocked(id)) {
        return;
      }
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
    const shopModalEl = document.getElementById("asset-shop-modal");
    if (shopModalEl && !shopModalEl.classList.contains("hidden")) {
      closeAssetShopModal();
      return;
    }
    if (calendarImageLightbox && !calendarImageLightbox.classList.contains("hidden")) {
      closeCalendarImageLightbox();
      return;
    }
    if (notesModal && !notesModal.classList.contains("hidden")) {
      closeNotesModal();
      return;
    }
    if (spaceInventoryModal && !spaceInventoryModal.classList.contains("hidden")) {
      if (inventoryFormView && !inventoryFormView.classList.contains("hidden")) {
        showInventoryView("list");
      } else {
        closeSpaceInventoryModal();
      }
      return;
    }
    if (calendarModal && !calendarModal.classList.contains("hidden")) {
      closeCalendarModal();
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
      if (isTileOptionsOpen) {
        setTileOptionsOpen(false);
        return;
      }
      if (isEditorUIHidden || mapEditorSidebar?.classList.contains("minimized")) {
        showEditorUI();
        return;
      }
      exitEditMode();
      return;
    }
  }

  const activeEl = document.activeElement as HTMLElement | null;
  const isTypingInField =
    activeEl === chatInputField ||
    activeEl?.tagName === "INPUT" ||
    activeEl?.tagName === "TEXTAREA" ||
    activeEl?.tagName === "SELECT" ||
    Boolean(activeEl?.isContentEditable);

  // Pressing Enter when not in an active input or modal focuses chat
  if (
    e.key === "Enter" &&
    !isTypingInField &&
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
    !isTypingInField &&
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
  renderSpacesList();
  mapModal.classList.remove("hidden");
  setGameControlsActive(false);
}

function closeMapModal() {
  mapModal.classList.add("hidden");
  setGameControlsActive(true);
}

btnOpenMap?.addEventListener("click", () => {
  closeProfileDropdown();
  openMapModal();
});
btnCloseMapModal.addEventListener("click", closeMapModal);

mapModal.addEventListener("click", (e) => {
  if (e.target === mapModal) {
    closeMapModal();
  }
});

document.addEventListener("keydown", (e) => {
  if (
    e.key === "Escape" &&
    mapModal &&
    !mapModal.classList.contains("hidden") &&
    (!adminSpaceModal || adminSpaceModal.classList.contains("hidden"))
  ) {
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
const MY_SPACE_ICON_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5L12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5"/><path d="M9 21V13h6v8"/></svg>`;
const SPACE_INVENTORY_ICON_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>`;

function updateTopBarUI() {
  const name = getEffectivePlayerName();
  topbarUserName.textContent = name;

  const pts = currentUser?.focusPoints ?? 0;
  updateFocusPointsDisplay(pts);
  focusUiController?.syncUserAuth(currentUser);

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
  if (!isCustomActive && activeTpl.id === "default") {
    renderFashionPreviewFrame(selectedOutfit, 0, 0, false)
      .then((url) => {
        if (url && topbarAvatarImg) {
          topbarAvatarImg.src = url;
          syncProfileModalUserInfo();
        }
      })
      .catch(() => {});
  } else {
    const templateImg = (activeTpl && activeTpl.idleFrames.length > 0) ? activeTpl.idleFrames[0] : DEFAULT_AVATAR_ICON;
    const topbarImgUrl = isCustomActive ? uploadedFrames.idle[0] : templateImg;
    setImgSrcResolved(topbarAvatarImg, topbarImgUrl);
  }
  topbarAvatarImg.classList.remove("hidden");
  if (topbarAvatarDot) topbarAvatarDot.classList.add("hidden");

  syncProfileModalUserInfo();

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

  // Case 2: User is a shared housemate / co-owner of the current space
  if (loadedSharedSpaces.some((s) => s.id === currentSpaceId)) {
    return true;
  }

  // Case 3: Superadmin has control to configure any space
  if (currentUser.role === "superadmin") {
    return true;
  }

  return false;
}

function updateMapSettingsVisibility() {
  const canEdit = canChangeCurrentSpaceSettings();
  updateEditorAssetGroupVisibility();

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
 * Fetch spaces list and user personal space from backend
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
      loadedSharedSpaces = data.sharedSpaces || [];
      if (data.mySpace) {
        myPersonalSpace = data.mySpace;
      }

      // Check current space name
      if (currentSpaceId === myPersonalSpace?.id) {
        currentSpaceName = myPersonalSpace.name;
      } else {
        const found =
          loadedSpaces.find((s) => s.id === currentSpaceId) ||
          loadedSharedSpaces.find((s) => s.id === currentSpaceId);
        if (found) currentSpaceName = found.name;
      }

      renderSpacesList();
      updateTopBarUI();
    }
  } catch (err) {
    console.warn("Could not fetch spaces:", err);
  }
}

function getAllListedSpaces(): Space[] {
  const seen = new Set<string>();
  const combined: Space[] = [];
  if (myPersonalSpace) {
    seen.add(myPersonalSpace.id);
    combined.push(myPersonalSpace);
  }
  for (const s of loadedSpaces) {
    if (!seen.has(s.id)) {
      seen.add(s.id);
      combined.push(s);
    }
  }
  for (const s of loadedSharedSpaces) {
    if (!seen.has(s.id)) {
      seen.add(s.id);
      combined.push(s);
    }
  }
  return combined;
}

function renderSpacesList() {
  mapSpacesGrid.innerHTML = "";

  const spacesList = getAllListedSpaces();

  if (spacesList.length === 0) {
    mapSpacesGrid.innerHTML = `
      <div class="map-spaces-empty">
        No destinations available.
      </div>
    `;
    return;
  }

  spacesList.forEach((space) => {
    const isMySpace = !!myPersonalSpace && space.id === myPersonalSpace.id;
    const isCurrent = space.id === currentSpaceId;
    const isSuperadmin = currentUser?.role === "superadmin";
    const isWhitelisted = currentUser
      ? space.whitelist.some(
          (w) => w.toLowerCase() === currentUser!.username.toLowerCase(),
        )
      : false;
    const isHousemate = currentUser
      ? (space.sharedOwners || []).some(
          (u) => u.toLowerCase() === currentUser!.username.toLowerCase(),
        )
      : false;
    const canJoin = isMySpace || space.isPublic || isSuperadmin || isWhitelisted || isHousemate;
    const isClickable = !isCurrent && canJoin;
    const onlineCount = space.playerCount || 0;

    const metaParts: string[] = [];
    if (isMySpace) {
      metaParts.push("My Space");
    } else if (isHousemate) {
      metaParts.push(
        space.ownerUsername
          ? `Housemate · @${escapeHtml(space.ownerUsername)}`
          : "Housemate",
      );
    } else if (!space.isPublic && isWhitelisted) {
      metaParts.push("Invited");
    }

    const card = document.createElement("div");
    card.className = [
      "map-space-card",
      isCurrent ? "current" : "",
      isClickable ? "joinable" : "",
      !canJoin ? "locked" : "",
    ]
      .filter(Boolean)
      .join(" ");

    if (isClickable) {
      card.tabIndex = 0;
      card.setAttribute("role", "button");
      card.setAttribute("aria-label", `Travel to ${space.name}`);
    }

    card.innerHTML = `
      <div class="space-card-top">
        <div class="space-card-main">
          <div class="space-card-title-row">
            <h3 class="space-card-name-title">${escapeHtml(space.name)}</h3>
            ${
              !space.isPublic
                ? `<span class="space-privacy-icon" title="Private space" aria-label="Private space"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>`
                : ""
            }
          </div>
          <div class="space-card-meta">
            <span class="space-online-count">
              <span class="space-online-dot ${onlineCount > 0 ? "active" : ""}" aria-hidden="true"></span>
              <span>${onlineCount} online</span>
            </span>
            ${metaParts.length > 0 ? `<span class="space-meta-sep" aria-hidden="true">·</span><span class="space-meta-extra">${metaParts.join(" · ")}</span>` : ""}
          </div>
        </div>
        <div class="space-card-right">
          ${
            isCurrent
              ? `<span class="space-state-pill current">Here</span>`
              : canJoin
                ? `<span class="space-travel-arrow" aria-hidden="true"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></span>`
                : `<span class="space-state-pill locked" title="Requires invitation from superadmin">Locked</span>`
          }
        </div>
      </div>
      ${
        isSuperadmin && !isMySpace
          ? `
        <div class="space-card-admin-row">
          <button type="button" class="btn-space-admin-action edit-admin-space" data-id="${space.id}" title="Edit Space" aria-label="Edit ${escapeHtml(space.name)}">
            <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            <span>Edit</span>
          </button>
          <button type="button" class="btn-space-admin-action delete delete-admin-space" data-id="${space.id}" title="Delete Space" aria-label="Delete ${escapeHtml(space.name)}">
            <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            <span>Delete</span>
          </button>
        </div>
      `
          : ""
      }
    `;

    if (isClickable) {
      const triggerTravel = () => {
        closeMapModal();
        switchSpace(space.id, space.name);
      };
      card.addEventListener("click", triggerTravel);
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          triggerTravel();
        }
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
      bindMultiplayerLifecycleEvents(multiplayer);
      setupMultiplayerChatListeners(multiplayer);
    }
    initVoiceManager(multiplayer);
    initJukeboxManager(multiplayer);
    setupMultiplayerTypeRaceListeners(multiplayer);
    setupMultiplayerSmokingGameListeners(multiplayer);
    setupMultiplayerChessListeners(multiplayer);
    setupMultiplayerFocusListeners(multiplayer);
    setupMultiplayerFriendListeners(multiplayer);
    setupMultiplayerThrowBattleListeners(multiplayer);
    setupMultiplayerDinerListeners(multiplayer);

    await multiplayer.joinGame({
      name: effectiveName,
      color,
      avatars,
      outfit: selectedOutfit,
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

    if (isLikelyNetworkError(err)) {
      handleOfflineDetected(
        "You are currently offline or disconnected from the server. Trying to reconnect automatically...",
      );
      return;
    }

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
        isPrivateOrForbidden ? '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>' : '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
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

function openMySpaceSettingsModal(targetSpace?: Space) {
  const space = targetSpace || myPersonalSpace;
  if (!space) return;

  editingTargetSpace = space;
  const isOwnSpace = !!(myPersonalSpace && space.id === myPersonalSpace.id);

  if (mySpaceOwnerBanner && mySpaceOwnerName) {
    if (!isOwnSpace && space.ownerUsername) {
      mySpaceOwnerName.textContent = `@${space.ownerUsername}`;
      mySpaceOwnerBanner.classList.remove("hidden");
    } else {
      mySpaceOwnerBanner.classList.add("hidden");
    }
  }

  mySpaceInputName.value = space.name;
  mySpaceSwitchPublic.checked = space.isPublic;
  tempMySpaceWhitelist = [...(space.whitelist || [])];
  tempMySpaceSharedOwners = [...(space.sharedOwners || [])];

  if (space.isPublic) {
    mySpaceWhitelistSection.classList.add("hidden");
  } else {
    mySpaceWhitelistSection.classList.remove("hidden");
  }

  renderMySpaceWhitelistTags();
  renderMySpaceShareTags();
  populateMySpaceShareFriendDropdown();
  fetchFriendsData().then(() => {
    populateMySpaceShareFriendDropdown();
  });
  mySpaceSettingsModal.classList.remove("hidden");
  setGameControlsActive(false);
}

function closeMySpaceSettingsModal() {
  mySpaceSettingsModal.classList.add("hidden");
  editingTargetSpace = null;
  setGameControlsActive(true);
}

mySpaceSwitchPublic.addEventListener("change", () => {
  if (mySpaceSwitchPublic.checked) {
    mySpaceWhitelistSection.classList.add("hidden");
  } else {
    mySpaceWhitelistSection.classList.remove("hidden");
    const existingLower = new Set(tempMySpaceWhitelist.map((u) => u.toLowerCase()));
    const allFriends = [...friendsCache.online, ...friendsCache.offline];
    let added = false;
    for (const f of allFriends) {
      if (f.username && !existingLower.has(f.username.toLowerCase())) {
        existingLower.add(f.username.toLowerCase());
        tempMySpaceWhitelist.push(f.username);
        added = true;
      }
    }
    if (added) {
      renderMySpaceWhitelistTags();
    }
  }
});

function renderUsernameTagList(
  container: HTMLElement,
  countEl: HTMLElement,
  usernames: string[],
  emptyText: string,
  onRemove: (username: string) => void,
) {
  container.innerHTML = "";
  countEl.textContent = String(usernames.length);

  if (usernames.length === 0) {
    container.innerHTML = `<span class="whitelist-empty-hint">${escapeHtml(emptyText)}</span>`;
    return;
  }

  usernames.forEach((username) => {
    const chip = document.createElement("span");
    chip.className = "whitelist-tag-chip";
    chip.innerHTML = `
      <span>@${escapeHtml(username)}</span>
      <span class="whitelist-tag-chip-remove" data-user="${escapeHtml(username)}" title="Remove">✕</span>
    `;

    const removeBtn = chip.querySelector(
      ".whitelist-tag-chip-remove",
    ) as HTMLElement;
    removeBtn.addEventListener("click", () => onRemove(username));

    container.appendChild(chip);
  });
}

function renderMySpaceWhitelistTags() {
  renderUsernameTagList(
    mySpaceTagsContainer,
    mySpaceTagsCount,
    tempMySpaceWhitelist,
    "No users invited yet.",
    (username) => {
      tempMySpaceWhitelist = tempMySpaceWhitelist.filter(
        (u) => u.toLowerCase() !== username.toLowerCase(),
      );
      renderMySpaceWhitelistTags();
    },
  );
}

function populateMySpaceShareFriendDropdown() {
  if (!mySpaceShareFriendSelect) return;

  const primaryOwner = (editingTargetSpace?.ownerUsername || currentUser?.username || "").toLowerCase();
  const alreadyShared = new Set(tempMySpaceSharedOwners.map((u) => u.toLowerCase()));
  const allFriends = [...friendsCache.online, ...friendsCache.offline]
    .filter(
      (f) =>
        f.username.toLowerCase() !== primaryOwner &&
        !alreadyShared.has(f.username.toLowerCase()),
    )
    .sort((a, b) => (a.displayName || a.username).localeCompare(b.displayName || b.username));

  mySpaceShareFriendSelect.innerHTML = "";
  if (allFriends.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent =
      friendsCache.online.length + friendsCache.offline.length === 0
        ? "No friends yet (add friends first)"
        : "All friends are already housemates";
    mySpaceShareFriendSelect.appendChild(opt);
    mySpaceShareFriendSelect.disabled = true;
    if (btnAddMySpaceShare) btnAddMySpaceShare.disabled = true;
    return;
  }

  mySpaceShareFriendSelect.disabled = false;
  if (btnAddMySpaceShare) btnAddMySpaceShare.disabled = false;

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select a friend to share with...";
  mySpaceShareFriendSelect.appendChild(placeholder);

  for (const friend of allFriends) {
    const opt = document.createElement("option");
    opt.value = friend.username;
    const statusDot = `<span class="friend-status-dot ${friend.isOnline ? "online" : "offline"}"></span>`;
    const label =
      friend.displayName && friend.displayName !== friend.username
        ? `${statusDot} ${friend.displayName} (@${friend.username})`
        : `${statusDot} @${friend.username}`;
    opt.textContent = label;
    mySpaceShareFriendSelect.appendChild(opt);
  }
}

function renderMySpaceShareTags() {
  if (!mySpaceShareTagsContainer || !mySpaceShareTagsCount) return;
  renderUsernameTagList(
    mySpaceShareTagsContainer,
    mySpaceShareTagsCount,
    tempMySpaceSharedOwners,
    "No housemates added yet.",
    (username) => {
      tempMySpaceSharedOwners = tempMySpaceSharedOwners.filter(
        (u) => u.toLowerCase() !== username.toLowerCase(),
      );
      renderMySpaceShareTags();
      populateMySpaceShareFriendDropdown();
    },
  );
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

function addMySpaceShare() {
  if (!mySpaceShareFriendSelect) return;
  const raw = mySpaceShareFriendSelect.value.trim();
  if (!raw) return;

  const primaryOwner = editingTargetSpace?.ownerUsername || currentUser?.username;
  if (primaryOwner && raw.toLowerCase() === primaryOwner.toLowerCase()) {
    alert("The primary space owner already has full ownership.");
    return;
  }

  if (tempMySpaceSharedOwners.some((u) => u.toLowerCase() === raw.toLowerCase())) {
    alert("User is already a housemate in this space.");
    return;
  }

  tempMySpaceSharedOwners.push(raw);
  renderMySpaceShareTags();
  populateMySpaceShareFriendDropdown();
}

btnAddMySpaceInvite.addEventListener("click", addMySpaceInvite);
mySpaceInviteUsername.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    addMySpaceInvite();
  }
});

if (btnAddMySpaceShare) {
  btnAddMySpaceShare.addEventListener("click", addMySpaceShare);
}

btnCloseMySpaceSettings.addEventListener("click", closeMySpaceSettingsModal);
mySpaceSettingsModal.addEventListener("click", (e) => {
  if (e.target === mySpaceSettingsModal) {
    closeMySpaceSettingsModal();
  }
});

mySpaceSettingsForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!authToken) return;

  const newName = mySpaceInputName.value.trim();
  const isPublic = mySpaceSwitchPublic.checked;
  const target = editingTargetSpace || myPersonalSpace;
  const isOwnSpace = !!(myPersonalSpace && target && target.id === myPersonalSpace.id);
  const endpoint = isOwnSpace || !target
    ? "/api/spaces/my-space"
    : `/api/spaces/personal/${encodeURIComponent(target.id)}`;

  try {
    const res = await fetch(getApiUrl(endpoint), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: newName,
        isPublic,
        whitelist: tempMySpaceWhitelist,
        sharedOwners: tempMySpaceSharedOwners,
      }),
    });

    const data: SpaceResponse = await res.json();
    if (res.ok && data.success && data.space) {
      if (isOwnSpace) {
        myPersonalSpace = data.space;
      } else {
        loadedSharedSpaces = loadedSharedSpaces.map((s) =>
          s.id === data.space!.id ? data.space! : s,
        );
      }
      if (currentSpaceId === data.space.id) {
        currentSpaceName = data.space.name;
      }
      updateTopBarUI();
      closeMySpaceSettingsModal();
      await fetchSpaces();
    } else {
      alert(data.error || "Failed to update space settings.");
    }
  } catch (err) {
    console.error("Error updating space settings:", err);
    alert("Network error updating space settings.");
  }
});

// ==========================================
// Superadmin Create & Edit Space Modal
// ==========================================

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
  adminSpaceModalTitle.textContent = "Create New Space";
  adminSpaceEditId.value = "";
  adminSpaceName.value = "";
  if (adminSpaceFocusTheme) adminSpaceFocusTheme.value = "auto";
  adminSpaceSwitchPublic.checked = true;
  adminSpaceWhitelistSection.classList.add("hidden");
  tempAdminSpaceWhitelist = [];
  renderAdminSpaceWhitelistTags();

  adminSpaceModal.classList.remove("hidden");
  setGameControlsActive(false);
  setTimeout(() => adminSpaceName.focus(), 60);
}

function openAdminEditSpaceModal(space: Space) {
  adminSpaceModalTitle.textContent = "Edit Space";
  adminSpaceEditId.value = space.id;
  adminSpaceName.value = space.name;
  if (adminSpaceFocusTheme) {
    adminSpaceFocusTheme.value =
      space.focusTheme && isValidFocusTheme(space.focusTheme) ? space.focusTheme : "auto";
  }
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
  if (!mapModal || mapModal.classList.contains("hidden")) {
    setGameControlsActive(true);
  }
}

btnCloseAdminSpaceModal.addEventListener("click", closeAdminSpaceModal);
adminSpaceModal.addEventListener("click", (e) => {
  if (e.target === adminSpaceModal) {
    closeAdminSpaceModal();
  }
});

adminSpaceForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!authToken || currentUser?.role !== "superadmin") return;

  const spaceId = adminSpaceEditId.value;
  const name = adminSpaceName.value.trim();

  const focusTheme: FocusTheme =
    adminSpaceFocusTheme && isValidFocusTheme(adminSpaceFocusTheme.value)
      ? adminSpaceFocusTheme.value
      : "auto";
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
        body: JSON.stringify({ name, focusTheme, isPublic, whitelist }),
      });
    } else {
      // Create new
      res = await fetch(getApiUrl("/api/spaces"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ name, focusTheme, isPublic, whitelist }),
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

function bindMultiplayerLifecycleEvents(manager: MultiplayerManager) {
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

  manager.onUnexpectedDisconnect(() => {
    if (!authToken && !gameInstance) return;
    handleOfflineDetected(
      "Disconnected from the game server. Trying to reconnect automatically...",
    );
  });

  manager.onError((data) => {
    if (data?.message) {
      showPlacingToast(`${data.message}`);
    }
  });
}

async function enterGameSession(options?: { fromAutoReconnect?: boolean }) {
  const effectiveName = getEffectivePlayerName();
  const color = selectedColor;
  const avatars = computeActiveAvatars();

  if (gameInstance) {
    if (multiplayer) {
      multiplayer.updateProfile(effectiveName, color, avatars || null, selectedOutfit);
    }
    return;
  }

  if (currentUser?.lastSpaceId) {
    currentSpaceId = currentUser.lastSpaceId;
  }

  topbarStatusSubtitle.textContent = "Connecting to server...";
  const manager = new MultiplayerManager();
  bindMultiplayerLifecycleEvents(manager);

  setupMultiplayerChatListeners(manager);
  updateChatTabNames();
  initVoiceManager(manager);
  initJukeboxManager(manager);
  setupMultiplayerTypeRaceListeners(manager);
  setupMultiplayerSmokingGameListeners(manager);
  setupMultiplayerChessListeners(manager);
  setupMultiplayerFocusListeners(manager);
  setupMultiplayerFriendListeners(manager);
  if (authToken) {
    fetchFriendsData();
    fetchOrganisationsData();
  }
  setupMultiplayerThrowBattleListeners(manager);
  setupMultiplayerDinerListeners(manager);

  try {
    try {
      await manager.joinGame({
        name: effectiveName,
        color,
        avatars,
        outfit: selectedOutfit,
        spaceId: currentSpaceId,
        token: authToken || undefined,
      });
    } catch (joinErr) {
      if (currentSpaceId !== "space_central_plaza") {
        console.warn(
          `Could not rejoin saved space ${currentSpaceId}, falling back to CO3:`,
          joinErr,
        );
        currentSpaceId = "space_central_plaza";
        currentSpaceName = "CO3";
        await manager.joinGame({
          name: effectiveName,
          color,
          avatars,
          outfit: selectedOutfit,
          spaceId: currentSpaceId,
          token: authToken || undefined,
        });
      } else {
        throw joinErr;
      }
    }
    multiplayer = manager;

    if (voiceManager) {
      voiceManager.connectToVoice();
    }

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.WEBGL,
      pixelArt: true,
      parent: "game-container",
      backgroundColor: "#ffffff",
      roundPixels: true,
      input: {
        activePointers: 3,
      },
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
          scene.onDismissPopups = () => {
            closeProfileDropdown();
            closeAudioSettingsDropdown();
            closePlayerContextMenu();
            closeEditorItemContextMenu();
            const interactionPanel = document.getElementById("editor-interaction-dropdown-panel");
            interactionPanel?.classList.add("hidden");
          };
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
    if (options?.fromAutoReconnect) {
      throw err;
    }
    if (authToken && currentUser && isLikelyNetworkError(err)) {
      handleOfflineDetected(
        "Disconnected from the game server. Trying to reconnect automatically...",
      );
      return;
    }
    alert(
      "Could not connect to multiplayer server. Please ensure the backend is running!",
    );
    openAuthModal("login");
  }
}

function syncPwaStandaloneClass(): void {
  const nav = window.navigator as Navigator & { standalone?: boolean };
  const isStandalonePwa =
    window.matchMedia("(display-mode: standalone)").matches ||
    nav.standalone === true;
  const isTouchDevice =
    window.matchMedia("(hover: none) and (pointer: coarse)").matches ||
    navigator.maxTouchPoints > 0;
  document.documentElement.classList.toggle(
    "pwa-standalone",
    isStandalonePwa && isTouchDevice,
  );
}

syncPwaStandaloneClass();

function getTopBarHeight(): number {
  const topBar = document.getElementById("top-bar");
  const measured = topBar ? topBar.getBoundingClientRect().height : 0;
  if (measured > 0) return Math.round(measured);
  const gameContainer = document.getElementById("game-container");
  const topOffset = gameContainer ? gameContainer.getBoundingClientRect().top : 0;
  return topOffset > 0 ? Math.round(topOffset) : 40;
}

function resizeGameToViewport(): void {
  if (gameInstance) {
    gameInstance.scale.resize(window.innerWidth, window.innerHeight - getTopBarHeight());
  }
}

// Window Resize & Orientation Handlers
window.addEventListener("resize", resizeGameToViewport);
window.addEventListener("orientationchange", () => {
  setTimeout(resizeGameToViewport, 100);
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
  const control = document.getElementById("mobile-analog-control");
  const base = document.getElementById("mobile-analog-base");
  const knob = document.getElementById("mobile-analog-knob");
  const gameContainer = document.getElementById("game-container");
  if (!control || !base || !knob || !gameContainer) return;

  let activeTouchId: number | null = null;
  let cachedCenterX = 0;
  let cachedCenterY = 0;
  let isPinching = false;
  let waitForAllTouchesUp = false;
  let pinchStartDist = 0;
  let pinchStartZoom = 1;
  let pinchLastMidX = 0;
  let pinchLastMidY = 0;
  let curLeft = false;
  let curRight = false;
  let curUp = false;
  let curDown = false;

  const maxRadius = 32;
  const enterDeadzone = 0.22;
  const exitDeadzone = 0.15;
  const enterThreshold = 0.44; // ~26 deg from axis to engage diagonal
  const exitThreshold = 0.30;  // ~17 deg from axis to disengage diagonal

  const isEditModeActive = () => {
    if (document.body.classList.contains("edit-mode-active")) return true;
    const scene = gameInstance?.scene.getScene("GameScene") as any;
    return Boolean(scene?.isEditMode);
  };

  const isMobileTouchEnv = () =>
    window.matchMedia("(max-width: 768px), (hover: none) and (pointer: coarse)").matches ||
    (navigator.maxTouchPoints ?? 0) > 0;

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
    activeTouchId = null;
    knob.style.transform = "translate3d(0px, 0px, 0)";
    base.classList.remove("active");
    control.classList.remove("is-visible");
    setVirtualInput(false, false, false, false);
  };

  const startStick = (touch: Touch) => {
    activeTouchId = touch.identifier;
    cachedCenterX = touch.clientX;
    cachedCenterY = touch.clientY;
    control.style.left = `${cachedCenterX}px`;
    control.style.top = `${cachedCenterY}px`;
    control.classList.add("is-visible");
    base.classList.add("active");
    knob.style.transform = "translate3d(0px, 0px, 0)";
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

  const startPinch = (t1: Touch, t2: Touch) => {
    resetStick();
    isPinching = true;
    waitForAllTouchesUp = true;
    pinchStartDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
    const rect = gameContainer.getBoundingClientRect();
    pinchLastMidX = (t1.clientX + t2.clientX) * 0.5 - rect.left;
    pinchLastMidY = (t1.clientY + t2.clientY) * 0.5 - rect.top;
    const scene = gameInstance?.scene.getScene("GameScene") as GameScene | undefined;
    pinchStartZoom = scene?.cameras?.main?.zoom ?? 1;
    if (isEditModeActive()) {
      scene?.cancelTouchPlacement?.();
    }
  };

  const updatePinch = (t1: Touch, t2: Touch) => {
    if (!isPinching || pinchStartDist <= 0) return;
    const currentDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
    const scale = currentDist / pinchStartDist;
    const scene = gameInstance?.scene.getScene("GameScene") as GameScene | undefined;
    if (scene && typeof scene.setPinchZoom === "function") {
      const rect = gameContainer.getBoundingClientRect();
      const midX = (t1.clientX + t2.clientX) * 0.5 - rect.left;
      const midY = (t1.clientY + t2.clientY) * 0.5 - rect.top;
      if (scene.isEditMode) {
        const zoom = scene.cameras?.main?.zoom || 1;
        scene.cameras.main.scrollX -= (midX - pinchLastMidX) / zoom;
        scene.cameras.main.scrollY -= (midY - pinchLastMidY) / zoom;
      }
      pinchLastMidX = midX;
      pinchLastMidY = midY;
      scene.setPinchZoom(pinchStartZoom * scale, midX, midY);
    }
  };

  // Native TouchEvents with passive: false prevent iOS WebKit from stealing/canceling the touch
  gameContainer.addEventListener(
    "touchstart",
    (e) => {
      if (!isMobileTouchEnv()) return;
      if ((e.target as HTMLElement | null)?.closest?.("#mobile-interact-btn")) return;
      if (
        document.querySelector(
          ".modal-overlay:not(.hidden), #calendar-image-lightbox:not(.hidden)"
        )
      ) {
        return;
      }
      e.preventDefault();

      if (
        document.querySelector(
          "#player-context-menu:not(.hidden), #editor-item-context-menu:not(.hidden), #editor-interaction-dropdown-panel:not(.hidden), #audio-settings-dropdown:not(.hidden)"
        )
      ) {
        return;
      }

      if (e.touches.length >= 2) {
        startPinch(e.touches[0], e.touches[1]);
        return;
      }

      if (e.touches.length === 1) {
        if (waitForAllTouchesUp || isPinching || isEditModeActive()) return;
        if (activeTouchId !== null) return;
        const touch = e.changedTouches[0] || e.touches[0];
        if (touch) {
          startStick(touch);
        }
      }
    },
    { passive: false },
  );

  window.addEventListener(
    "touchmove",
    (e) => {
      if (isPinching) {
        if (e.touches.length >= 2) {
          e.preventDefault();
          updatePinch(e.touches[0], e.touches[1]);
        }
        return;
      }

      if (activeTouchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === activeTouchId) {
          e.preventDefault();
          updateStick(touch.clientX, touch.clientY);
          break;
        }
      }
    },
    { passive: false },
  );

  const handleTouchEnd = (e: TouchEvent) => {
    if (isPinching && e.touches.length < 2) {
      isPinching = false;
    }

    if (activeTouchId !== null) {
      let stillActive = false;
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === activeTouchId) {
          stillActive = true;
          break;
        }
      }
      if (!stillActive) {
        resetStick();
      }
    }

    if (e.touches.length === 0) {
      isPinching = false;
      waitForAllTouchesUp = false;
      if (activeTouchId !== null) {
        resetStick();
      }
      if (isEditModeActive()) {
        const scene = gameInstance?.scene.getScene("GameScene") as GameScene | undefined;
        scene?.notifyAllTouchesEnded?.();
      }
    }
  };

  window.addEventListener("touchend", handleTouchEnd, { passive: false });
  window.addEventListener("touchcancel", handleTouchEnd, { passive: false });
  window.addEventListener("blur", () => {
    isPinching = false;
    waitForAllTouchesUp = false;
    if (activeTouchId !== null) {
      resetStick();
    }
    if (isEditModeActive()) {
      const scene = gameInstance?.scene.getScene("GameScene") as GameScene | undefined;
      scene?.notifyAllTouchesEnded?.();
    }
  });
}

function updateMobileInteractButton(
  nearby: { id: string; interaction: DecorationInteractionType } | null
) {
  const btn = document.getElementById("mobile-interact-btn") as HTMLButtonElement | null;
  const iconEl = document.getElementById("mobile-interact-icon");
  const labelEl = document.getElementById("mobile-interact-label");
  if (!btn) return;

  const scene = gameInstance?.scene.getScene("GameScene") as GameScene | undefined;
  if (scene?.getActiveDinerNearbyAction?.()) {
    btn.classList.add("hidden");
    return;
  }

  if (!nearby) {
    btn.classList.add("hidden");
    return;
  }

  const meta = DECORATION_INTERACTIONS.find((item) => item.id === nearby.interaction);
  if (iconEl) iconEl.innerHTML = getInteractionIconSvg(nearby.interaction);
  if (labelEl) labelEl.textContent = meta?.label ?? "Interact";
  btn.setAttribute("aria-label", `Interact: ${meta?.label ?? "Object"}`);
  btn.classList.remove("hidden");
}

function setupMobileInteractButton() {
  const btn = document.getElementById("mobile-interact-btn") as HTMLButtonElement | null;
  if (!btn) return;

  btn.addEventListener("touchstart", (e) => {
    e.stopPropagation();
  }, { passive: true });

  btn.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
  });

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const scene = gameInstance?.scene.getScene("GameScene") as GameScene | undefined;
    scene?.triggerNearbyInteraction();
  });
}

// App Initialization
// ==========================================
// Friends System State, Modal & Actions
// ==========================================

type FriendsTab = "online" | "offline" | "pending" | "request";

let friendsCache: {
  online: FriendEntry[];
  offline: FriendEntry[];
  pending: FriendRequestEntry[];
  requests: FriendRequestEntry[];
} = {
  online: [],
  offline: [],
  pending: [],
  requests: [],
};

let activeFriendsTab: FriendsTab = "online";
let expandedFriendUserId: number | null = null;
const registeredFriendManagers = new WeakSet<MultiplayerManager>();

function setupMultiplayerFriendListeners(mgr: MultiplayerManager) {
  if (registeredFriendManagers.has(mgr)) return;
  registeredFriendManagers.add(mgr);
  mgr.onFriendUpdate(() => {
    if (authToken) {
      fetchFriendsData();
      fetchSpaces();
    }
  });
}

async function fetchFriendsData() {
  if (!authToken) {
    friendsCache = { online: [], offline: [], pending: [], requests: [] };
    updateFriendsCountsUI();
    return;
  }

  try {
    const res = await fetch(getApiUrl("/api/friends"), {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.ok) return;
    const data: FriendsListResponse = await res.json();
    if (data.success) {
      friendsCache = {
        online: data.online || [],
        offline: data.offline || [],
        pending: data.pending || [],
        requests: data.requests || [],
      };
      updateFriendsCountsUI();
      if (friendsModal && !friendsModal.classList.contains("hidden")) {
        renderFriendsList();
      }
    }
  } catch (err) {
    console.warn("Failed to fetch friends:", err);
  }
}

function updateFriendsCountsUI() {
  if (friendsCountOnline) friendsCountOnline.textContent = String(friendsCache.online.length);
  if (friendsCountOffline) friendsCountOffline.textContent = String(friendsCache.offline.length);
  if (friendsCountPending) friendsCountPending.textContent = String(friendsCache.pending.length);
  if (friendsCountRequest) friendsCountRequest.textContent = String(friendsCache.requests.length);

  if (dropdownFriendsBadge) {
    const reqCount = friendsCache.requests.length;
    if (reqCount > 0) {
      dropdownFriendsBadge.textContent = reqCount > 9 ? "9+" : String(reqCount);
      dropdownFriendsBadge.classList.remove("hidden");
    } else {
      dropdownFriendsBadge.classList.add("hidden");
    }
  }
}

function showFriendsAddFeedback(message: string, isError: boolean) {
  if (!friendsAddFeedback) return;
  friendsAddFeedback.textContent = message;
  friendsAddFeedback.className = `friends-add-feedback ${isError ? "error" : "success"}`;
  friendsAddFeedback.classList.remove("hidden");
  setTimeout(() => {
    friendsAddFeedback?.classList.add("hidden");
  }, 3500);
}

function openFriendsModal() {
  closeProfileDropdown();
  if (!authToken) {
    alert("Please log in to view your friends list.");
    return;
  }
  expandedFriendUserId = null;
  friendsModal?.classList.remove("hidden");
  setGameControlsActive(false);
  renderFriendsList();
  fetchFriendsData();
}

function closeFriendsModal() {
  friendsModal?.classList.add("hidden");
  expandedFriendUserId = null;
  setGameControlsActive(true);
}

function createFriendVisitSpaceButton(friend: FriendEntry): HTMLButtonElement {
  const btnVisitSpace = document.createElement("button");
  btnVisitSpace.type = "button";
  btnVisitSpace.className = "friend-online-menu-btn visit-space";
  btnVisitSpace.textContent = "Visit Space";
  btnVisitSpace.addEventListener("click", async (e) => {
    e.stopPropagation();
    closeFriendsModal();
    await visitPlayerSpace({ userId: friend.userId, name: friend.name });
  });
  return btnVisitSpace;
}

function renderFriendsList() {
  if (!friendsListContainer) return;
  friendsListContainer.innerHTML = "";

  const defaultAvatar = DEFAULT_AVATAR_ICON;

  if (activeFriendsTab === "online") {
    if (friendsCache.online.length === 0) {
      friendsListContainer.innerHTML = `<div class="friends-empty-state">No friends are currently online.</div>`;
      return;
    }

    friendsCache.online.forEach((friend) => {
      const wrapper = document.createElement("div");
      wrapper.className = "friend-item-wrapper clickable";
      const isExpanded = expandedFriendUserId === friend.userId;
      const avatarUrl = friend.avatar || defaultAvatar;
      const crown = friend.isSuperadmin ? "[Admin] " : "";
      const locText = friend.spaceName || friend.spaceId || "Unknown";

      wrapper.innerHTML = `
        <div class="friend-item-row">
          <div class="friend-item-left">
            <div class="friend-avatar-wrap">
              <img class="friend-avatar-img" ${imgSrcAttr(avatarUrl)} alt="${escapeHtml(friend.name)}" />
              <span class="friend-status-dot online" title="Online"></span>
            </div>
            <div class="friend-info">
              <div class="friend-name">${crown}${escapeHtml(friend.name)}</div>
              <div class="friend-meta"><span class="friend-location-badge">${escapeHtml(locText)}</span></div>
            </div>
          </div>
          <div class="friend-item-actions">
            <span style="font-size: 12px; color: #94a3b8;">${isExpanded ? "▴" : "▾"}</span>
          </div>
        </div>
      `;

      if (isExpanded) {
        const menu = document.createElement("div");
        menu.className = "friend-online-menu";

        const btnGoTo = document.createElement("button");
        btnGoTo.type = "button";
        btnGoTo.className = "friend-online-menu-btn goto";
        btnGoTo.textContent = "Go To Location";
        btnGoTo.addEventListener("click", async (e) => {
          e.stopPropagation();
          closeFriendsModal();
          if (friend.spaceId && friend.spaceId !== currentSpaceId) {
            await switchSpace(friend.spaceId, friend.spaceName || friend.spaceId);
          }
        });

        const btnWhisper = document.createElement("button");
        btnWhisper.type = "button";
        btnWhisper.className = "friend-online-menu-btn whisper";
        btnWhisper.textContent = "Whisper";
        btnWhisper.addEventListener("click", (e) => {
          e.stopPropagation();
          closeFriendsModal();
          if (friend.sessionId) {
            openDirectMessageChat(
              friend.sessionId,
              friend.name,
              friend.color,
              friend.isSuperadmin
            );
          }
        });

        menu.appendChild(btnGoTo);
        menu.appendChild(btnWhisper);
        menu.appendChild(createFriendVisitSpaceButton(friend));
        wrapper.appendChild(menu);
      }

      wrapper.addEventListener("click", () => {
        expandedFriendUserId = isExpanded ? null : friend.userId;
        renderFriendsList();
      });

      friendsListContainer.appendChild(wrapper);
    });
  } else if (activeFriendsTab === "offline") {
    if (friendsCache.offline.length === 0) {
      friendsListContainer.innerHTML = `<div class="friends-empty-state">No offline friends.</div>`;
      return;
    }

    friendsCache.offline.forEach((friend) => {
      const wrapper = document.createElement("div");
      wrapper.className = "friend-item-wrapper clickable";
      const isExpanded = expandedFriendUserId === friend.userId;
      const avatarUrl = friend.avatar || defaultAvatar;

      wrapper.innerHTML = `
        <div class="friend-item-row">
          <div class="friend-item-left">
            <div class="friend-avatar-wrap">
              <img class="friend-avatar-img offline" ${imgSrcAttr(avatarUrl)} alt="${escapeHtml(friend.name)}" />
              <span class="friend-status-dot offline" title="Offline"></span>
            </div>
            <div class="friend-info">
              <div class="friend-name">${escapeHtml(friend.name)}</div>
              <div class="friend-meta">Offline</div>
            </div>
          </div>
          <div class="friend-item-actions">
            <span style="font-size: 12px; color: #94a3b8;">${isExpanded ? "▴" : "▾"}</span>
          </div>
        </div>
      `;

      if (isExpanded) {
        const menu = document.createElement("div");
        menu.className = "friend-online-menu";
        menu.appendChild(createFriendVisitSpaceButton(friend));
        wrapper.appendChild(menu);
      }

      wrapper.addEventListener("click", () => {
        expandedFriendUserId = isExpanded ? null : friend.userId;
        renderFriendsList();
      });

      friendsListContainer.appendChild(wrapper);
    });
  } else if (activeFriendsTab === "pending") {
    if (friendsCache.pending.length === 0) {
      friendsListContainer.innerHTML = `<div class="friends-empty-state">No pending outgoing friend requests.</div>`;
      return;
    }

    friendsCache.pending.forEach((reqItem) => {
      const wrapper = document.createElement("div");
      wrapper.className = "friend-item-wrapper";
      const avatarUrl = reqItem.avatar || defaultAvatar;

      wrapper.innerHTML = `
        <div class="friend-item-row">
          <div class="friend-item-left">
            <div class="friend-avatar-wrap">
              <img class="friend-avatar-img" ${imgSrcAttr(avatarUrl)} alt="${escapeHtml(reqItem.name)}" />
            </div>
            <div class="friend-info">
              <div class="friend-name">${escapeHtml(reqItem.name)}</div>
              <div class="friend-meta">@${escapeHtml(reqItem.username)} • Pending</div>
            </div>
          </div>
          <div class="friend-item-actions">
            <button type="button" class="friend-action-btn reject">Cancel</button>
          </div>
        </div>
      `;

      const cancelBtn = wrapper.querySelector(".friend-action-btn.reject") as HTMLButtonElement | null;
      cancelBtn?.addEventListener("click", async () => {
        await handleFriendRejectOrCancel(reqItem.friendshipId);
      });

      friendsListContainer.appendChild(wrapper);
    });
  } else if (activeFriendsTab === "request") {
    if (friendsCache.requests.length === 0) {
      friendsListContainer.innerHTML = `<div class="friends-empty-state">No incoming friend requests.</div>`;
      return;
    }

    friendsCache.requests.forEach((reqItem) => {
      const wrapper = document.createElement("div");
      wrapper.className = "friend-item-wrapper";
      const avatarUrl = reqItem.avatar || defaultAvatar;

      wrapper.innerHTML = `
        <div class="friend-item-row">
          <div class="friend-item-left">
            <div class="friend-avatar-wrap">
              <img class="friend-avatar-img" ${imgSrcAttr(avatarUrl)} alt="${escapeHtml(reqItem.name)}" />
            </div>
            <div class="friend-info">
              <div class="friend-name">${escapeHtml(reqItem.name)}</div>
              <div class="friend-meta">@${escapeHtml(reqItem.username)} • Wants to be friends</div>
            </div>
          </div>
          <div class="friend-item-actions">
            <button type="button" class="friend-action-btn accept">Accept</button>
            <button type="button" class="friend-action-btn reject">Reject</button>
          </div>
        </div>
      `;

      const acceptBtn = wrapper.querySelector(".friend-action-btn.accept") as HTMLButtonElement | null;
      const rejectBtn = wrapper.querySelector(".friend-action-btn.reject") as HTMLButtonElement | null;

      acceptBtn?.addEventListener("click", async () => {
        await handleFriendAccept(reqItem.friendshipId);
      });
      rejectBtn?.addEventListener("click", async () => {
        await handleFriendRejectOrCancel(reqItem.friendshipId);
      });

      friendsListContainer.appendChild(wrapper);
    });
  }
  hydrateSheetImages(friendsListContainer);
}

async function handleFriendAccept(friendshipId: number) {
  if (!authToken) return;
  try {
    const res = await fetch(getApiUrl("/api/friends/accept"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ friendshipId }),
    });
    if (res.ok) {
      await fetchFriendsData();
    }
  } catch (err) {
    console.error("Failed to accept friend request:", err);
  }
}

async function handleFriendRejectOrCancel(friendshipId: number) {
  if (!authToken) return;
  try {
    const res = await fetch(getApiUrl("/api/friends/reject"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ friendshipId }),
    });
    if (res.ok) {
      await fetchFriendsData();
    }
  } catch (err) {
    console.error("Failed to reject/cancel friend request:", err);
  }
}

if (dropdownFriendsBtn) {
  dropdownFriendsBtn.addEventListener("click", () => {
    openFriendsModal();
  });
}

if (btnCloseFriendsModal) {
  btnCloseFriendsModal.addEventListener("click", closeFriendsModal);
}

if (friendsModal) {
  friendsModal.addEventListener("click", (e) => {
    if (e.target === friendsModal) {
      closeFriendsModal();
    }
  });

  friendsModal.querySelectorAll(".friends-tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = (btn as HTMLElement).dataset.tab as FriendsTab;
      if (!tab) return;
      activeFriendsTab = tab;
      expandedFriendUserId = null;
      friendsModal.querySelectorAll(".friends-tab-btn").forEach((b) => {
        const isActive = (b as HTMLElement).dataset.tab === tab;
        b.classList.toggle("active", isActive);
        b.setAttribute("aria-selected", isActive ? "true" : "false");
      });
      renderFriendsList();
    });
  });
}

if (friendsAddForm) {
  friendsAddForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!authToken || !friendsAddInput) return;
    const username = friendsAddInput.value.trim();
    if (!username) return;

    try {
      const res = await fetch(getApiUrl("/api/friends/request"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showFriendsAddFeedback(data.error || "Could not send friend request.", true);
        return;
      }
      friendsAddInput.value = "";
      showFriendsAddFeedback(
        data.status === "accepted"
          ? `You are now friends with ${username}!`
          : `Friend request sent to ${username}.`,
        false
      );
      await fetchFriendsData();
    } catch (err) {
      console.error("Failed to add friend:", err);
      showFriendsAddFeedback("Network error sending friend request.", true);
    }
  });
}

async function init() {
  setupColorSwatches();
  setupMapEditorDecorationControls();
  setupMapEditorAccordions();
  setupUploadSlots();
  setupHudControlBadges();
  setupMobileJoystick();
  setupMobileInteractButton();

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
          uploadedFrames[s] = parsed[s].slice(0, MAX_AVATAR_FRAMES).map((f: string) => normalizeSpriteRef(f));
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

  // Initialize Organisation UI listeners
  initOrganisationUI();
  initNotesUI();
  initSpaceInventoryUI();
  initAssetShopUI();
  initCalendarUI();

  // Check stored auth session
  const storedToken = localStorage.getItem("lepark_auth_token");
  if (storedToken) {
    let tokenInvalid = false;
    try {
      const res = await fetch(getApiUrl("/api/auth/me"), {
        headers: { Authorization: `Bearer ${storedToken}` },
      });
      if (res.status === 401 || res.status === 403) {
        tokenInvalid = true;
      } else if (res.status >= 500) {
        hasPendingAuthRestore = true;
        handleOfflineDetected(
          "Server is temporarily unavailable. Trying to reconnect automatically...",
        );
        return;
      } else {
        const data: AuthResponse = await res.json();
        if (res.ok && data.success && data.user) {
          authToken = storedToken;
          currentUser = data.user;
          setupSpriteTemplates();
          closeAuthModal();
          await enterGameSession();
          checkAndShowLinkEmailModal();
          return;
        }
        if (res.ok && !data.success) {
          tokenInvalid = true;
        }
      }
    } catch (err) {
      console.warn("Could not verify saved session token (offline/network error):", err);
      hasPendingAuthRestore = true;
      handleOfflineDetected(
        "You are currently offline or server is unreachable. Waiting to reconnect automatically...",
      );
      return;
    }
    if (tokenInvalid) {
      // Stale token
      localStorage.removeItem("lepark_auth_token");
      localStorage.removeItem("lepark_auth_user");
    }
  }

  // Not authenticated: Show Auth Modal
  openAuthModal("login");
}

// ==========================================
// Organisation System UI & Handlers
// ==========================================

const organisationModal = document.getElementById("organisation-modal") as HTMLDivElement | null;
const btnCloseOrganisationModal = document.getElementById("btn-close-organisation-modal") as HTMLButtonElement | null;
const dropdownOrganisationsBtn = document.getElementById("dropdown-organisations-btn") as HTMLButtonElement | null;
const orgCreateForm = document.getElementById("org-create-form") as HTMLFormElement | null;
const orgListPanel = document.getElementById("org-list-panel") as HTMLDivElement | null;
const orgListContainer = document.getElementById("org-list-container") as HTMLDivElement | null;
const orgCountBadge = document.getElementById("org-count-badge") as HTMLSpanElement | null;
const orgPointsBanner = document.getElementById("org-points-banner") as HTMLDivElement | null;
const orgCurrentPointsEl = document.getElementById("org-current-points") as HTMLElement | null;
const orgNameInput = document.getElementById("org-name-input") as HTMLInputElement | null;
const orgLogoInput = document.getElementById("org-logo-input") as HTMLInputElement | null;
const orgLogoPreviewImg = document.getElementById("org-logo-preview-img") as HTMLImageElement | null;
const orgLogoPlaceholder = document.getElementById("org-logo-placeholder") as HTMLSpanElement | null;
const btnOrgUploadLogo = document.getElementById("btn-org-upload-logo") as HTMLButtonElement | null;
const btnOrgClearLogo = document.getElementById("btn-org-clear-logo") as HTMLButtonElement | null;
const orgFriendSearchInput = document.getElementById("org-friend-search-input") as HTMLInputElement | null;
const orgSelectedMembersEl = document.getElementById("org-selected-members") as HTMLDivElement | null;
const orgFriendsPickerEl = document.getElementById("org-friends-picker") as HTMLDivElement | null;
const orgCreateFeedback = document.getElementById("org-create-feedback") as HTMLDivElement | null;
const btnOrgCreateSubmit = document.getElementById("btn-org-create-submit") as HTMLButtonElement | null;

let organisationsCache: Organisation[] = [];
let adminOrgPlayersCache: Array<{ userId: number; username: string; displayName: string | null; name: string; isOnline: boolean }> = [];
let selectedOrgFriendIds: Set<number> = new Set();
let pendingOrgLogoDataUrl: string | null = null;
let activeOrgTab: "create" | "list" = "create";

function isSuperadminUser(): boolean {
  return currentUser?.role === "superadmin";
}

function escapeOrgHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getAllAcceptedFriends(): FriendEntry[] {
  return [...friendsCache.online, ...friendsCache.offline].sort((a, b) =>
    (a.name || a.username).localeCompare(b.name || b.username)
  );
}

function getSelectableOrgPlayers(): Array<{ userId: number; username: string; name: string; isOnline: boolean }> {
  if (isSuperadminUser()) {
    return adminOrgPlayersCache;
  }
  return getAllAcceptedFriends().map((f) => ({
    userId: f.userId,
    username: f.username,
    name: f.name || f.username,
    isOnline: f.isOnline,
  }));
}

async function fetchAdminOrgPlayers() {
  if (!authToken || !isSuperadminUser()) {
    adminOrgPlayersCache = [];
    return;
  }
  try {
    const res = await fetch(getApiUrl("/api/organisations/players"), {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.ok) return;
    const data = await res.json();
    if (data.success && Array.isArray(data.players)) {
      adminOrgPlayersCache = data.players;
    }
  } catch (err) {
    console.warn("Failed to fetch players for superadmin:", err);
  }
}

function showOrgFeedback(message: string, type: "error" | "success") {
  if (!orgCreateFeedback) return;
  orgCreateFeedback.textContent = message;
  orgCreateFeedback.className = `org-feedback ${type}`;
  orgCreateFeedback.classList.remove("hidden");
}

function clearOrgFeedback() {
  if (!orgCreateFeedback) return;
  orgCreateFeedback.textContent = "";
  orgCreateFeedback.classList.add("hidden");
}

function updateOrgPointsBanner() {
  const pts = currentUser?.focusPoints ?? 0;
  const isAdmin = isSuperadminUser();
  if (orgCurrentPointsEl) {
    orgCurrentPointsEl.textContent = String(pts);
  }
  const costPill = orgPointsBanner?.querySelector(".org-cost-pill");
  if (costPill) {
    costPill.textContent = isAdmin ? "Cost: FREE (Superadmin)" : `Cost: ${ORGANISATION_CREATION_COST} FP`;
  }
  const hasEnough = isAdmin || pts >= ORGANISATION_CREATION_COST;
  if (orgPointsBanner) {
    orgPointsBanner.classList.toggle("insufficient", !hasEnough);
  }
  if (btnOrgCreateSubmit) {
    btnOrgCreateSubmit.textContent = isAdmin
      ? "Create Organisation (Free for Superadmin)"
      : `Create Organisation (${ORGANISATION_CREATION_COST} FP)`;
    btnOrgCreateSubmit.disabled = !authToken || !hasEnough;
  }
  if (orgFriendSearchInput) {
    orgFriendSearchInput.placeholder = isAdmin ? "Filter any player..." : "Filter your friends...";
  }
}

function setOrgLogoPreview(dataUrl: string | null) {
  pendingOrgLogoDataUrl = dataUrl;
  if (dataUrl && orgLogoPreviewImg && orgLogoPlaceholder && btnOrgClearLogo) {
    orgLogoPreviewImg.src = dataUrl;
    orgLogoPreviewImg.classList.remove("hidden");
    orgLogoPlaceholder.classList.add("hidden");
    btnOrgClearLogo.classList.remove("hidden");
  } else if (orgLogoPreviewImg && orgLogoPlaceholder && btnOrgClearLogo) {
    orgLogoPreviewImg.src = "";
    orgLogoPreviewImg.classList.add("hidden");
    orgLogoPlaceholder.classList.remove("hidden");
    btnOrgClearLogo.classList.add("hidden");
    if (orgLogoInput) orgLogoInput.value = "";
  }
}

function resizeImageTo100x100(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Invalid image file."));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 100;
        canvas.height = 100;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas not supported."));
          return;
        }
        // Center-crop to square, then draw at 100x100px
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        ctx.clearRect(0, 0, 100, 100);
        ctx.drawImage(img, sx, sy, side, side, 0, 0, 100, 100);
        resolve(canvas.toDataURL("image/png"));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function renderOrgFriendsPicker() {
  if (!orgFriendsPickerEl || !orgSelectedMembersEl) return;
  const allCandidates = getSelectableOrgPlayers();
  const isAdmin = isSuperadminUser();
  const query = (orgFriendSearchInput?.value || "").trim().toLowerCase();

  // Render selected member chips
  const selectedPlayers = allCandidates.filter((f) => selectedOrgFriendIds.has(f.userId));
  if (selectedPlayers.length > 0) {
    orgSelectedMembersEl.classList.remove("hidden");
    orgSelectedMembersEl.innerHTML = selectedPlayers
      .map(
        (f) =>
          `<span class="org-member-chip">${escapeOrgHtml(f.name || f.username)} <button type="button" data-remove-friend="${f.userId}" title="Remove">✕</button></span>`
      )
      .join("");
    orgSelectedMembersEl.querySelectorAll<HTMLButtonElement>("[data-remove-friend]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const uid = Number(btn.dataset.removeFriend);
        selectedOrgFriendIds.delete(uid);
        renderOrgFriendsPicker();
      });
    });
  } else {
    orgSelectedMembersEl.classList.add("hidden");
    orgSelectedMembersEl.innerHTML = "";
  }

  if (allCandidates.length === 0) {
    orgFriendsPickerEl.innerHTML = isAdmin
      ? `<div class="org-empty-friends">No other players found.</div>`
      : `<div class="org-empty-friends">No friends in your friend list yet. Add friends first to invite them!</div>`;
    return;
  }

  const filtered = query
    ? allCandidates.filter(
        (f) =>
          (f.name || "").toLowerCase().includes(query) ||
          f.username.toLowerCase().includes(query)
      )
    : allCandidates;

  if (filtered.length === 0) {
    orgFriendsPickerEl.innerHTML = `<div class="org-empty-friends">${isAdmin ? "No matching players found." : "No matching friends found."}</div>`;
    return;
  }

  orgFriendsPickerEl.innerHTML = "";
  for (const player of filtered) {
    const isSelected = selectedOrgFriendIds.has(player.userId);
    const row = document.createElement("div");
    row.className = `org-friend-option${isSelected ? " selected" : ""}`;
    row.innerHTML = `
      <div class="org-friend-info">
        <span class="org-friend-dot ${player.isOnline ? "online" : ""}"></span>
        <span>${escapeOrgHtml(player.name || player.username)}</span>
        <span class="org-friend-username">@${escapeOrgHtml(player.username)}</span>
      </div>
      <span>${isSelected ? "✓ Added" : "+ Add"}</span>
    `;
    row.addEventListener("click", () => {
      if (selectedOrgFriendIds.has(player.userId)) {
        selectedOrgFriendIds.delete(player.userId);
      } else {
        selectedOrgFriendIds.add(player.userId);
      }
      renderOrgFriendsPicker();
    });
    orgFriendsPickerEl.appendChild(row);
  }
}

function switchOrgTab(tab: "create" | "list") {
  activeOrgTab = tab;
  document.querySelectorAll<HTMLButtonElement>(".org-tab-btn").forEach((btn) => {
    const isActive = btn.dataset.orgTab === tab;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-selected", String(isActive));
  });
  if (orgCreateForm) orgCreateForm.classList.toggle("hidden", tab !== "create");
  if (orgListPanel) orgListPanel.classList.toggle("hidden", tab !== "list");
  if (tab === "list") {
    renderOrganisationsList();
  }
}

async function fetchOrganisationsData() {
  if (!authToken) {
    organisationsCache = [];
    if (orgCountBadge) orgCountBadge.textContent = "0";
    return;
  }
  try {
    const res = await fetch(getApiUrl("/api/organisations"), {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.ok) return;
    const data: OrganisationsListResponse = await res.json();
    if (data.success) {
      organisationsCache = data.organisations || [];
      if (orgCountBadge) orgCountBadge.textContent = String(organisationsCache.length);
      syncOrgChatTabs(organisationsCache);
      if (organisationModal && !organisationModal.classList.contains("hidden") && activeOrgTab === "list") {
        renderOrganisationsList();
      }
    }
  } catch (err) {
    console.warn("Failed to fetch organisations:", err);
  }
}

function renderOrganisationsList() {
  if (!orgListContainer) return;
  if (organisationsCache.length === 0) {
    orgListContainer.innerHTML = `<div class="org-empty-friends">You are not in any organisation yet. Create one using ${ORGANISATION_CREATION_COST} FP!</div>`;
    return;
  }

  const allCandidates = getSelectableOrgPlayers();
  const isAdmin = isSuperadminUser();
  orgListContainer.innerHTML = "";

  for (const org of organisationsCache) {
    const isLeader = currentUser && org.creatorId === currentUser.id;
    const memberIds = new Set(org.members.map((m) => m.userId));
    const invitablePlayers = allCandidates.filter((f) => !memberIds.has(f.userId));

    const card = document.createElement("div");
    card.className = "org-card";

    const logoHtml = org.logo
      ? `<img src="${escapeOrgHtml(org.logo)}" alt="${escapeOrgHtml(org.name)}" class="org-card-logo" />`
      : `<div class="org-card-logo"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M13 8h4M13 12h4M13 16h4"/></svg></div>`;

    const membersHtml = org.members
      .map((m) => {
        const removeBtn =
          isLeader && m.role !== "leader"
            ? ` <button type="button" class="org-remove-member-btn" data-org-id="${org.id}" data-user-id="${m.userId}" title="Remove member" style="background:none;border:none;color:#fca5a5;cursor:pointer;padding:0 2px;">✕</button>`
            : "";
        return `<span class="org-member-pill ${m.role}">${m.role === "leader" ? "[Leader] " : ""}${escapeOrgHtml(m.name || m.username)}${removeBtn}</span>`;
      })
      .join("");

    let actionsHtml = "";
    if (isLeader) {
      const selectHtml =
        invitablePlayers.length > 0
          ? `<div class="org-add-member-row">
               <select class="org-add-member-select" data-org-select="${org.id}">
                 ${invitablePlayers.map((f) => `<option value="${f.userId}">${escapeOrgHtml(f.name || f.username)} (@${escapeOrgHtml(f.username)})</option>`).join("")}
               </select>
               <button type="button" class="btn-secondary org-btn-sm org-add-member-btn" data-org-id="${org.id}">${isAdmin ? "+ Add Player" : "+ Add Friend"}</button>
             </div>`
          : `<span class="org-helper-text">${isAdmin ? "All players are already members" : "All friends are already members"}</span>`;
      const otherMembers = org.members.filter((m) => m.userId !== org.creatorId);
      const transferHtml =
        otherMembers.length > 0
          ? `<div class="org-add-member-row">
               <select class="org-add-member-select" data-org-transfer-select="${org.id}">
                 ${otherMembers.map((m) => `<option value="${m.userId}">${escapeOrgHtml(m.name || m.username)} (@${escapeOrgHtml(m.username)})</option>`).join("")}
               </select>
               <button type="button" class="btn-secondary org-btn-sm org-transfer-btn" data-org-id="${org.id}" data-org-name="${escapeOrgHtml(org.name)}">Transfer Leader</button>
             </div>`
          : "";
      actionsHtml = `
        <div class="org-card-actions">
          ${selectHtml}
          <div class="org-add-member-row">
            ${transferHtml}
            <button type="button" class="org-btn-sm org-btn-danger org-disband-btn" data-org-id="${org.id}">Disband</button>
          </div>
        </div>
      `;
    } else if (currentUser) {
      actionsHtml = `
        <div class="org-card-actions">
          <span></span>
          <button type="button" class="org-btn-sm org-btn-danger org-leave-btn" data-org-id="${org.id}" data-user-id="${currentUser.id}">Leave</button>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="org-card-header">
        ${logoHtml}
        <div class="org-card-meta">
          <h3 class="org-card-name">${escapeOrgHtml(org.name)}</h3>
          <div class="org-card-sub">Leader: ${escapeOrgHtml(org.creatorDisplayName || org.creatorUsername)} · ${org.members.length} member${org.members.length === 1 ? "" : "s"}</div>
        </div>
      </div>
      <div class="org-members-list">${membersHtml}</div>
      ${actionsHtml}
    `;

    orgListContainer.appendChild(card);
  }

  orgListContainer.querySelectorAll<HTMLButtonElement>(".org-add-member-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const orgId = Number(btn.dataset.orgId);
      const select = orgListContainer.querySelector<HTMLSelectElement>(`[data-org-select="${orgId}"]`);
      const targetUserId = Number(select?.value);
      if (!targetUserId || !authToken) return;
      const res = await fetch(getApiUrl(`/api/organisations/${orgId}/members`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ userId: targetUserId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Failed to add friend.");
        return;
      }
      await fetchOrganisationsData();
    });
  });

  orgListContainer.querySelectorAll<HTMLButtonElement>(".org-remove-member-btn, .org-leave-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const orgId = Number(btn.dataset.orgId);
      const userId = Number(btn.dataset.userId);
      if (!orgId || !userId || !authToken) return;
      const res = await fetch(getApiUrl(`/api/organisations/${orgId}/members/${userId}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Failed to update membership.");
        return;
      }
      await fetchOrganisationsData();
    });
  });

  orgListContainer.querySelectorAll<HTMLButtonElement>(".org-disband-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const orgId = Number(btn.dataset.orgId);
      if (!orgId || !authToken) return;
      if (!confirm("Disband this organisation? This cannot be undone.")) return;
      const res = await fetch(getApiUrl(`/api/organisations/${orgId}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Failed to disband organisation.");
        return;
      }
      await fetchOrganisationsData();
    });
  });

  orgListContainer.querySelectorAll<HTMLButtonElement>(".org-transfer-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const orgId = Number(btn.dataset.orgId);
      const orgName = btn.dataset.orgName || "this organisation";
      const select = orgListContainer.querySelector<HTMLSelectElement>(`[data-org-transfer-select="${orgId}"]`);
      const targetUserId = Number(select?.value);
      const targetLabel = select?.options[select.selectedIndex]?.text || "this member";
      if (!orgId || !targetUserId || !authToken) return;
      if (!confirm(`Transfer leadership of "${orgName}" to ${targetLabel}? You will become a regular member.`)) return;
      const res = await fetch(getApiUrl(`/api/organisations/${orgId}/transfer`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ userId: targetUserId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Failed to transfer leadership.");
        return;
      }
      await fetchOrganisationsData();
    });
  });
}

async function openOrganisationModal() {
  if (!organisationModal) return;
  if (!authToken || !currentUser) {
    alert("Please log in to create or manage organisations.");
    return;
  }
  clearOrgFeedback();
  updateOrgPointsBanner();
  organisationModal.classList.remove("hidden");
  setGameControlsActive(false);

  await Promise.all([fetchFriendsData(), fetchOrganisationsData(), fetchAdminOrgPlayers()]);
  renderOrgFriendsPicker();
  if (activeOrgTab === "list") {
    renderOrganisationsList();
  }
}

function closeOrganisationModal() {
  if (!organisationModal) return;
  organisationModal.classList.add("hidden");
  setGameControlsActive(true);
}

function initOrganisationUI() {
  btnCloseOrganisationModal?.addEventListener("click", closeOrganisationModal);
  organisationModal?.addEventListener("click", (e) => {
    if (e.target === organisationModal) closeOrganisationModal();
  });

  dropdownOrganisationsBtn?.addEventListener("click", () => {
    openOrganisationModal();
  });

  document.querySelectorAll<HTMLButtonElement>(".org-tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.orgTab === "list" ? "list" : "create";
      switchOrgTab(tab);
    });
  });

  btnOrgUploadLogo?.addEventListener("click", () => {
    orgLogoInput?.click();
  });

  btnOrgClearLogo?.addEventListener("click", () => {
    setOrgLogoPreview(null);
  });

  orgLogoInput?.addEventListener("change", async () => {
    const file = orgLogoInput.files?.[0];
    if (!file) return;
    try {
      const resized = await resizeImageTo100x100(file);
      setOrgLogoPreview(resized);
      clearOrgFeedback();
    } catch (err: any) {
      showOrgFeedback(err?.message || "Could not process logo image.", "error");
    }
  });

  orgFriendSearchInput?.addEventListener("input", () => {
    renderOrgFriendsPicker();
  });

  orgCreateForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearOrgFeedback();
    if (!authToken || !currentUser) {
      showOrgFeedback("Please log in first.", "error");
      return;
    }

    const name = (orgNameInput?.value || "").trim();
    if (name.length < 2 || name.length > 60) {
      showOrgFeedback("Organisation name must be between 2 and 60 characters.", "error");
      return;
    }

    const pts = currentUser.focusPoints ?? 0;
    if (!isSuperadminUser() && pts < ORGANISATION_CREATION_COST) {
      showOrgFeedback(
        `You need ${ORGANISATION_CREATION_COST} FP to create an organisation (you have ${pts} FP).`,
        "error"
      );
      return;
    }

    if (btnOrgCreateSubmit) btnOrgCreateSubmit.disabled = true;
    try {
      const res = await fetch(getApiUrl("/api/organisations"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name,
          memberUserIds: Array.from(selectedOrgFriendIds),
          logo: pendingOrgLogoDataUrl,
        }),
      });
      const data: CreateOrganisationResponse = await res.json();
      if (!res.ok || !data.success) {
        if (typeof data.points === "number" && currentUser) {
          currentUser.focusPoints = data.points;
          updateFocusPointsDisplay(data.points);
          focusUiController?.syncUserAuth(currentUser);
          updateOrgPointsBanner();
        }
        showOrgFeedback(data.error || "Failed to create organisation.", "error");
        return;
      }

      if (typeof data.points === "number" && currentUser) {
        currentUser.focusPoints = data.points;
        try {
          localStorage.setItem("lepark_auth_user", JSON.stringify(currentUser));
        } catch {}
        updateFocusPointsDisplay(data.points);
        focusUiController?.syncUserAuth(currentUser);
        updateOrgPointsBanner();
      }

      // Reset form state & refresh list
      if (orgNameInput) orgNameInput.value = "";
      selectedOrgFriendIds.clear();
      setOrgLogoPreview(null);
      renderOrgFriendsPicker();
      await fetchOrganisationsData();
      showOrgFeedback(`Organisation "${name}" created!`, "success");
      switchOrgTab("list");
    } catch (err: any) {
      showOrgFeedback(err?.message || "Network error creating organisation.", "error");
    } finally {
      updateOrgPointsBanner();
    }
  });
}

// ==========================================
// Notes Modal & WYSIWYG System
// ==========================================

const notesModal = document.getElementById("notes-modal") as HTMLDivElement | null;
const btnCloseNotesModal = document.getElementById("btn-close-notes-modal") as HTMLButtonElement | null;
const dropdownNotesBtn = document.getElementById("dropdown-notes-btn") as HTMLButtonElement | null;
const notesFeedbackEl = document.getElementById("notes-feedback") as HTMLDivElement | null;

const notesListView = document.getElementById("notes-list-view") as HTMLDivElement | null;
const notesDetailView = document.getElementById("notes-detail-view") as HTMLDivElement | null;
const notesEditorView = document.getElementById("notes-editor-view") as HTMLDivElement | null;

const btnNewNote = document.getElementById("btn-new-note") as HTMLButtonElement | null;
const notesScopeBar = document.getElementById("notes-scope-bar") as HTMLDivElement | null;
const notesScopeLabel = document.getElementById("notes-scope-label") as HTMLLabelElement | null;
const notesScopeSelect = document.getElementById("notes-scope-select") as HTMLSelectElement | null;
const notesListContainer = document.getElementById("notes-list-container") as HTMLDivElement | null;

const btnNotesBackFromDetail = document.getElementById("btn-notes-back-from-detail") as HTMLButtonElement | null;
const btnNoteEdit = document.getElementById("btn-note-edit") as HTMLButtonElement | null;
const btnNoteDelete = document.getElementById("btn-note-delete") as HTMLButtonElement | null;
const noteDetailTitle = document.getElementById("note-detail-title") as HTMLHeadingElement | null;
const noteDetailMeta = document.getElementById("note-detail-meta") as HTMLDivElement | null;
const noteDetailContent = document.getElementById("note-detail-content") as HTMLDivElement | null;
const noteDetailImages = document.getElementById("note-detail-images") as HTMLDivElement | null;

const btnNotesBackFromEditor = document.getElementById("btn-notes-back-from-editor") as HTMLButtonElement | null;
const notesEditorHeading = document.getElementById("notes-editor-heading") as HTMLSpanElement | null;
const noteEditorTitle = document.getElementById("note-editor-title") as HTMLInputElement | null;
const noteWysiwygToolbar = document.getElementById("note-wysiwyg-toolbar") as HTMLDivElement | null;
const noteEditorContent = document.getElementById("note-editor-content") as HTMLDivElement | null;
const noteEditorImagesInput = document.getElementById("note-editor-images-input") as HTMLInputElement | null;
const noteEditorImagesList = document.getElementById("note-editor-images-list") as HTMLDivElement | null;
const btnNoteCancel = document.getElementById("btn-note-cancel") as HTMLButtonElement | null;
const btnNoteSave = document.getElementById("btn-note-save") as HTMLButtonElement | null;

let activeNoteTab: NoteType = "personal";
let notesCache: NoteDto[] = [];
let accessibleNoteSpaces: AccessibleNoteSpace[] = [];
let selectedNoteSpaceId: string | null = null;
let selectedNoteOrgId: number | null = null;
let activeDetailNote: NoteDto | null = null;
let editingNoteId: number | null = null;
let selectedNoteImages: Array<{ name: string; dataUrl: string }> = [];

function showNotesFeedback(msg: string, type: "error" | "success" = "error") {
  if (!notesFeedbackEl) return;
  notesFeedbackEl.textContent = msg;
  notesFeedbackEl.className = `notes-feedback ${type}`;
  notesFeedbackEl.classList.remove("hidden");
}

function clearNotesFeedback() {
  if (!notesFeedbackEl) return;
  notesFeedbackEl.textContent = "";
  notesFeedbackEl.classList.add("hidden");
}

function sanitizeClientNoteHtml(raw: string): string {
  if (!raw) return "";
  const tpl = document.createElement("template");
  tpl.innerHTML = raw;
  const blockedTags = new Set(["script", "style", "iframe", "object", "embed", "form", "input", "textarea", "button", "meta", "link"]);
  const walk = (node: Node) => {
    const children = Array.from(node.childNodes);
    for (const child of children) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement;
        const tag = el.tagName.toLowerCase();
        if (blockedTags.has(tag)) {
          el.remove();
          continue;
        }
        for (const attr of Array.from(el.attributes)) {
          const name = attr.name.toLowerCase();
          const val = attr.value.trim().toLowerCase();
          if (name.startsWith("on")) {
            el.removeAttribute(attr.name);
          } else if ((name === "href" || name === "src") && (val.startsWith("javascript:") || val.startsWith("vbscript:") || val.startsWith("data:"))) {
            el.setAttribute(attr.name, "#");
          }
        }
        walk(el);
      }
    }
  };
  walk(tpl.content);
  return tpl.innerHTML;
}

function extractFirstLinePreview(html: string): string {
  if (!html) return "";
  const div = document.createElement("div");
  div.innerHTML = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h1|h2|h3|blockquote)>/gi, "\n");
  const text = (div.textContent || "").replace(/\r/g, "");
  const firstLine = text
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  return firstLine || "";
}

function formatNoteDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function showNotesView(view: "list" | "detail" | "editor") {
  clearNotesFeedback();
  notesListView?.classList.toggle("hidden", view !== "list");
  notesDetailView?.classList.toggle("hidden", view !== "detail");
  notesEditorView?.classList.toggle("hidden", view !== "editor");
}

function updateNotesScopeSelector() {
  if (!notesScopeBar || !notesScopeLabel || !notesScopeSelect) return;

  if (activeNoteTab === "personal") {
    notesScopeBar.classList.add("hidden");
    if (btnNewNote) btnNewNote.disabled = false;
    return;
  }

  if (activeNoteTab === "space") {
    if (accessibleNoteSpaces.length === 0) {
      notesScopeBar.classList.add("hidden");
      if (btnNewNote) btnNewNote.disabled = true;
      return;
    }
    if (
      !selectedNoteSpaceId ||
      !accessibleNoteSpaces.some((s) => s.id === selectedNoteSpaceId)
    ) {
      const currentAccessible = accessibleNoteSpaces.find((s) => s.id === currentSpaceId);
      const personalAccessible = myPersonalSpace
        ? accessibleNoteSpaces.find((s) => s.id === myPersonalSpace!.id)
        : undefined;
      selectedNoteSpaceId = (currentAccessible || personalAccessible || accessibleNoteSpaces[0]).id;
    }
    notesScopeLabel.textContent = "Space:";
    notesScopeSelect.innerHTML = "";
    for (const sp of accessibleNoteSpaces) {
      const opt = document.createElement("option");
      opt.value = sp.id;
      opt.textContent = sp.isOwner ? `${sp.name} (Owner)` : `${sp.name} (Space-mate)`;
      if (sp.id === selectedNoteSpaceId) opt.selected = true;
      notesScopeSelect.appendChild(opt);
    }
    notesScopeBar.classList.remove("hidden");
    if (btnNewNote) btnNewNote.disabled = false;
    return;
  }

  // organisation
  if (organisationsCache.length === 0) {
    notesScopeBar.classList.add("hidden");
    if (btnNewNote) btnNewNote.disabled = true;
    return;
  }
  if (
    selectedNoteOrgId === null ||
    !organisationsCache.some((o) => o.id === selectedNoteOrgId)
  ) {
    selectedNoteOrgId = organisationsCache[0].id;
  }
  notesScopeLabel.textContent = "Organisation:";
  notesScopeSelect.innerHTML = "";
  for (const org of organisationsCache) {
    const opt = document.createElement("option");
    opt.value = String(org.id);
    opt.textContent = org.name;
    if (org.id === selectedNoteOrgId) opt.selected = true;
    notesScopeSelect.appendChild(opt);
  }
  notesScopeBar.classList.remove("hidden");
  if (btnNewNote) btnNewNote.disabled = false;
}

function renderNotesList() {
  if (!notesListContainer) return;
  updateNotesScopeSelector();

  if (activeNoteTab === "space" && accessibleNoteSpaces.length === 0) {
    notesListContainer.innerHTML = `
      <div class="notes-empty-state">
        You don't have any personal or shared space yet.
      </div>
    `;
    return;
  }

  if (activeNoteTab === "organisation" && organisationsCache.length === 0) {
    notesListContainer.innerHTML = `
      <div class="notes-empty-state">
        You are not a member of any organisation yet. Join or create an organisation to share notes.
      </div>
    `;
    return;
  }

  if (notesCache.length === 0) {
    notesListContainer.innerHTML = `
      <div class="notes-empty-state">
        No notes here yet. Click <strong>+ Note</strong> to create one.
      </div>
    `;
    return;
  }

  notesListContainer.innerHTML = "";
  for (const note of notesCache) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "note-list-item";

    const titleEl = document.createElement("div");
    titleEl.className = "note-list-item-title";
    titleEl.textContent = note.title;

    const previewEl = document.createElement("div");
    previewEl.className = "note-list-item-preview";
    const previewText = extractFirstLinePreview(note.content);
    previewEl.textContent = previewText || "Empty note";

    card.appendChild(titleEl);
    card.appendChild(previewEl);

    card.addEventListener("click", () => {
      openNoteDetailView(note);
    });
    notesListContainer.appendChild(card);
  }
}

async function fetchNotesData() {
  if (!authToken) return;
  clearNotesFeedback();
  const params = new URLSearchParams({ type: activeNoteTab });
  if (activeNoteTab === "space" && selectedNoteSpaceId) {
    params.set("spaceId", selectedNoteSpaceId);
  } else if (activeNoteTab === "organisation" && selectedNoteOrgId !== null) {
    params.set("organisationId", String(selectedNoteOrgId));
  }

  try {
    const res = await fetch(getApiUrl(`/api/notes?${params.toString()}`), {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json();
    if (Array.isArray(data.accessibleSpaces)) {
      accessibleNoteSpaces = data.accessibleSpaces;
    }
    if (!res.ok || !data.success) {
      notesCache = [];
      if (data.error) showNotesFeedback(data.error, "error");
    } else {
      notesCache = data.notes || [];
    }
    renderNotesList();
  } catch (err: any) {
    showNotesFeedback(err?.message || "Failed to load notes.", "error");
  }
}

function renderNoteEditorImagesChips() {
  if (!noteEditorImagesList) return;
  noteEditorImagesList.innerHTML = "";
  if (selectedNoteImages.length === 0) {
    noteEditorImagesList.classList.add("hidden");
    return;
  }
  noteEditorImagesList.classList.remove("hidden");
  selectedNoteImages.forEach((img, idx) => {
    const wrap = document.createElement("div");
    wrap.className = "calendar-form-image-thumb-wrap";

    const thumb = document.createElement("img");
    thumb.src = img.dataUrl;
    thumb.alt = img.name;
    thumb.className = "calendar-form-image-thumb";
    thumb.title = "Click to preview";
    thumb.addEventListener("click", () => {
      openCalendarImageLightbox(img.dataUrl, img.name);
    });

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "calendar-form-image-remove";
    removeBtn.textContent = "×";
    removeBtn.title = `Remove ${img.name}`;
    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      selectedNoteImages.splice(idx, 1);
      renderNoteEditorImagesChips();
    });

    wrap.appendChild(thumb);
    wrap.appendChild(removeBtn);
    noteEditorImagesList.appendChild(wrap);
  });
}

function openNoteDetailView(note: NoteDto) {
  activeDetailNote = note;
  if (noteDetailTitle) noteDetailTitle.textContent = note.title;
  if (noteDetailMeta) {
    const scopeText =
      note.type === "personal"
        ? "Personal Note"
        : note.type === "space"
        ? `Space: ${note.spaceName || "Shared Space"}`
        : `Organisation: ${note.organisationName || "Organisation"}`;
    const dateStr = formatNoteDate(note.updatedAt || note.createdAt);
    noteDetailMeta.textContent = `${scopeText} • By ${note.authorName}${dateStr ? ` • ${dateStr}` : ""}`;
  }
  if (noteDetailContent) {
    const clean = sanitizeClientNoteHtml(note.content || "");
    noteDetailContent.innerHTML = clean || '<p class="notes-empty-body"><em>No content</em></p>';
  }
  if (noteDetailImages) {
    noteDetailImages.innerHTML = "";
    const imgs = Array.isArray(note.images) ? note.images : [];
    if (imgs.length > 0) {
      noteDetailImages.classList.remove("hidden");
      imgs.forEach((src, idx) => {
        const thumb = document.createElement("img");
        thumb.src = src;
        thumb.alt = `Note picture ${idx + 1}`;
        thumb.className = "calendar-detail-image-thumb";
        thumb.title = "Click to preview";
        thumb.addEventListener("click", () => {
          openCalendarImageLightbox(src, `Note picture ${idx + 1}`);
        });
        noteDetailImages.appendChild(thumb);
      });
    } else {
      noteDetailImages.classList.add("hidden");
    }
  }
  showNotesView("detail");
}

function openNoteEditorView(existingNote: NoteDto | null) {
  editingNoteId = existingNote ? existingNote.id : null;
  if (notesEditorHeading) {
    notesEditorHeading.textContent = existingNote ? "Edit Note" : "New Note";
  }
  if (noteEditorTitle) {
    noteEditorTitle.value = existingNote ? existingNote.title : "";
  }
  if (noteEditorContent) {
    noteEditorContent.innerHTML = existingNote
      ? sanitizeClientNoteHtml(existingNote.content || "")
      : "";
  }
  selectedNoteImages = existingNote && Array.isArray(existingNote.images)
    ? existingNote.images.map((dataUrl, i) => ({ name: `Picture ${i + 1}`, dataUrl }))
    : [];
  if (noteEditorImagesInput) noteEditorImagesInput.value = "";
  renderNoteEditorImagesChips();
  showNotesView("editor");
  setTimeout(() => noteEditorTitle?.focus(), 30);
}

async function saveNoteFromEditor() {
  if (!authToken) return;
  clearNotesFeedback();
  const title = (noteEditorTitle?.value || "").trim();
  if (!title) {
    showNotesFeedback("Please enter a note title.", "error");
    noteEditorTitle?.focus();
    return;
  }
  const content = sanitizeClientNoteHtml(noteEditorContent?.innerHTML || "");
  const images = selectedNoteImages.map((img) => img.dataUrl);

  if (btnNoteSave) btnNoteSave.disabled = true;
  try {
    if (editingNoteId !== null) {
      const res = await fetch(getApiUrl(`/api/notes/${editingNoteId}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ title, content, images }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showNotesFeedback(data.error || "Failed to update note.", "error");
        return;
      }
      await fetchNotesData();
      if (data.note) {
        openNoteDetailView(data.note);
      } else {
        showNotesView("list");
      }
    } else {
      const payload: any = {
        type: activeNoteTab,
        title,
        content,
        images,
      };
      if (activeNoteTab === "space") {
        payload.spaceId = selectedNoteSpaceId;
      } else if (activeNoteTab === "organisation") {
        payload.organisationId = selectedNoteOrgId;
      }
      const res = await fetch(getApiUrl("/api/notes"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showNotesFeedback(data.error || "Failed to create note.", "error");
        return;
      }
      await fetchNotesData();
      showNotesView("list");
    }
  } catch (err: any) {
    showNotesFeedback(err?.message || "Network error saving note.", "error");
  } finally {
    if (btnNoteSave) btnNoteSave.disabled = false;
  }
}

async function deleteActiveDetailNote() {
  if (!authToken || !activeDetailNote) return;
  if (!confirm(`Delete note "${activeDetailNote.title}"?`)) return;
  clearNotesFeedback();
  try {
    const res = await fetch(getApiUrl(`/api/notes/${activeDetailNote.id}`), {
      method: "DELETE",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      showNotesFeedback(data.error || "Failed to delete note.", "error");
      return;
    }
    activeDetailNote = null;
    await fetchNotesData();
    showNotesView("list");
  } catch (err: any) {
    showNotesFeedback(err?.message || "Network error deleting note.", "error");
  }
}

function switchNotesTab(tab: NoteType) {
  activeNoteTab = tab;
  document.querySelectorAll<HTMLButtonElement>(".notes-tab-btn").forEach((btn) => {
    const isMatch = btn.dataset.noteTab === tab;
    btn.classList.toggle("active", isMatch);
    btn.setAttribute("aria-selected", String(isMatch));
  });
  updateNotesScopeSelector();
  fetchNotesData();
}

async function openNotesModal() {
  if (!notesModal) return;
  if (!authToken || !currentUser) {
    alert("Please log in to view or create notes.");
    return;
  }
  clearNotesFeedback();
  notesModal.classList.remove("hidden");
  setGameControlsActive(false);
  showNotesView("list");

  await fetchOrganisationsData();
  await fetchNotesData();
  // Re-fetch once if space/org scope just resolved to a specific ID
  if (activeNoteTab === "space" && selectedNoteSpaceId) {
    await fetchNotesData();
  } else if (activeNoteTab === "organisation" && selectedNoteOrgId !== null) {
    await fetchNotesData();
  }
}

function closeNotesModal() {
  if (!notesModal) return;
  notesModal.classList.add("hidden");
  setGameControlsActive(true);
}

function initNotesUI() {
  btnCloseNotesModal?.addEventListener("click", closeNotesModal);
  notesModal?.addEventListener("click", (e) => {
    if (e.target === notesModal) closeNotesModal();
  });

  dropdownNotesBtn?.addEventListener("click", () => {
    closeProfileDropdown();
    openNotesModal();
  });

  document.querySelectorAll<HTMLButtonElement>(".notes-tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const raw = btn.dataset.noteTab;
      const tab: NoteType =
        raw === "space" || raw === "organisation" ? raw : "personal";
      switchNotesTab(tab);
    });
  });

  notesScopeSelect?.addEventListener("change", () => {
    if (activeNoteTab === "space") {
      selectedNoteSpaceId = notesScopeSelect.value || null;
    } else if (activeNoteTab === "organisation") {
      const val = Number(notesScopeSelect.value);
      selectedNoteOrgId = Number.isInteger(val) ? val : null;
    }
    fetchNotesData();
  });

  btnNewNote?.addEventListener("click", () => {
    openNoteEditorView(null);
  });

  btnNotesBackFromDetail?.addEventListener("click", () => {
    activeDetailNote = null;
    showNotesView("list");
  });

  btnNoteEdit?.addEventListener("click", () => {
    if (activeDetailNote) openNoteEditorView(activeDetailNote);
  });

  btnNoteDelete?.addEventListener("click", () => {
    deleteActiveDetailNote();
  });

  btnNotesBackFromEditor?.addEventListener("click", () => {
    if (editingNoteId !== null && activeDetailNote) {
      showNotesView("detail");
    } else {
      showNotesView("list");
    }
  });

  btnNoteCancel?.addEventListener("click", () => {
    if (editingNoteId !== null && activeDetailNote) {
      showNotesView("detail");
    } else {
      showNotesView("list");
    }
  });

  btnNoteSave?.addEventListener("click", () => {
    saveNoteFromEditor();
  });

  noteEditorImagesInput?.addEventListener("change", async () => {
    const files = Array.from(noteEditorImagesInput.files || []);
    noteEditorImagesInput.value = "";
    if (files.length === 0) return;
    clearNotesFeedback();

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        showNotesFeedback("Only picture files are allowed.", "error");
        continue;
      }
      if (selectedNoteImages.length >= 10) {
        showNotesFeedback("You can upload up to 10 pictures per note.", "error");
        break;
      }
      try {
        const compressed = await compressCalendarImageFile(file);
        selectedNoteImages.push({ name: file.name, dataUrl: compressed });
        renderNoteEditorImagesChips();
      } catch (err: any) {
        showNotesFeedback(err?.message || `Failed to process ${file.name}.`, "error");
      }
    }
  });

  // Ensure typing, Enter, movement keys (WASD), and interaction keys (E) stay isolated inside note inputs
  [noteEditorTitle, noteEditorContent].forEach((el) => {
    if (!el) return;
    el.addEventListener("focus", () => {
      setGameControlsActive(false);
    });
    el.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") {
        e.stopPropagation();
      }
    });
    el.addEventListener("keyup", (e) => {
      if (e.key !== "Escape") {
        e.stopPropagation();
      }
    });
  });

  noteWysiwygToolbar?.querySelectorAll<HTMLButtonElement>(".wysiwyg-btn").forEach((btn) => {
    btn.addEventListener("mousedown", (e) => {
      // Keep focus in contenteditable editor
      e.preventDefault();
    });
    btn.addEventListener("click", () => {
      const cmd = btn.dataset.cmd;
      if (!cmd) return;
      noteEditorContent?.focus();
      if (cmd === "createLink") {
        const url = prompt("Enter link URL (https://...):");
        if (url && /^https?:\/\//i.test(url.trim())) {
          document.execCommand("createLink", false, url.trim());
        }
      } else if (cmd === "formatBlock") {
        const val = btn.dataset.val || "P";
        document.execCommand("formatBlock", false, val);
      } else {
        document.execCommand(cmd, false);
      }
    });
  });
}

// ==========================================
// Calendar Modal System
// ==========================================

const calendarModal = document.getElementById("calendar-modal") as HTMLDivElement | null;
const btnCloseCalendarModal = document.getElementById("btn-close-calendar-modal") as HTMLButtonElement | null;
const dropdownCalendarBtn = document.getElementById("dropdown-calendar-btn") as HTMLButtonElement | null;
const calendarFeedbackEl = document.getElementById("calendar-feedback") as HTMLDivElement | null;

const calendarMonthView = document.getElementById("calendar-month-view") as HTMLDivElement | null;
const calendarDayView = document.getElementById("calendar-day-view") as HTMLDivElement | null;
const calendarDetailView = document.getElementById("calendar-detail-view") as HTMLDivElement | null;
const calendarEditorView = document.getElementById("calendar-editor-view") as HTMLDivElement | null;

const btnCalendarBackFromDay = document.getElementById("btn-calendar-back-from-day") as HTMLButtonElement | null;
const calendarDayViewHeading = document.getElementById("calendar-day-view-heading") as HTMLSpanElement | null;
const btnCalendarDayNewEvent = document.getElementById("btn-calendar-day-new-event") as HTMLButtonElement | null;
const calendarDayEventsList = document.getElementById("calendar-day-events-list") as HTMLDivElement | null;

const btnNewCalendarEvent = document.getElementById("btn-new-calendar-event") as HTMLButtonElement | null;
const calendarScopeBar = document.getElementById("calendar-scope-bar") as HTMLDivElement | null;
const calendarScopeLabel = document.getElementById("calendar-scope-label") as HTMLLabelElement | null;
const calendarScopeSelect = document.getElementById("calendar-scope-select") as HTMLSelectElement | null;
const calendarEmptyState = document.getElementById("calendar-empty-state") as HTMLDivElement | null;
const calendarBody = document.getElementById("calendar-body") as HTMLDivElement | null;
const calendarMealsBody = document.getElementById("calendar-meals-body") as HTMLDivElement | null;
const calendarMealsGrid = document.getElementById("calendar-meals-grid") as HTMLDivElement | null;
const calendarMealEditorView = document.getElementById("calendar-meal-editor-view") as HTMLDivElement | null;
const btnCalendarBackFromMeal = document.getElementById("btn-calendar-back-from-meal") as HTMLButtonElement | null;
const calendarMealEditorHeading = document.getElementById("calendar-meal-editor-heading") as HTMLSpanElement | null;
const calendarMealInput = document.getElementById("calendar-meal-input") as HTMLInputElement | null;
const btnCalendarMealSave = document.getElementById("btn-calendar-meal-save") as HTMLButtonElement | null;
const calendarMonthSelect = document.getElementById("calendar-month-select") as HTMLSelectElement | null;
const calendarYearInput = document.getElementById("calendar-year-input") as HTMLInputElement | null;
const calendarDaysGrid = document.getElementById("calendar-days-grid") as HTMLDivElement | null;
const btnCalendarToday = document.getElementById("btn-calendar-today") as HTMLButtonElement | null;
const btnCalendarPrev = document.getElementById("btn-calendar-prev") as HTMLButtonElement | null;
const btnCalendarNext = document.getElementById("btn-calendar-next") as HTMLButtonElement | null;

const btnCalendarBackFromDetail = document.getElementById("btn-calendar-back-from-detail") as HTMLButtonElement | null;
const btnCalendarEventEdit = document.getElementById("btn-calendar-event-edit") as HTMLButtonElement | null;
const btnCalendarEventDelete = document.getElementById("btn-calendar-event-delete") as HTMLButtonElement | null;
const calendarDetailTitle = document.getElementById("calendar-detail-title") as HTMLHeadingElement | null;
const calendarDetailWhen = document.getElementById("calendar-detail-when") as HTMLDivElement | null;
const calendarDetailAssignees = document.getElementById("calendar-detail-assignees") as HTMLDivElement | null;
const calendarDetailMeta = document.getElementById("calendar-detail-meta") as HTMLDivElement | null;
const calendarDetailDescription = document.getElementById("calendar-detail-description") as HTMLDivElement | null;
const calendarDetailImages = document.getElementById("calendar-detail-images") as HTMLDivElement | null;
const calendarImageLightbox = document.getElementById("calendar-image-lightbox") as HTMLDivElement | null;
const btnCloseCalendarLightbox = document.getElementById("btn-close-calendar-lightbox") as HTMLButtonElement | null;
const calendarLightboxImg = document.getElementById("calendar-lightbox-img") as HTMLImageElement | null;

const btnCalendarBackFromEditor = document.getElementById("btn-calendar-back-from-editor") as HTMLButtonElement | null;
const calendarEditorHeading = document.getElementById("calendar-editor-heading") as HTMLSpanElement | null;
const calendarEventTitle = document.getElementById("calendar-event-title") as HTMLInputElement | null;
const calendarEventStartDate = document.getElementById("calendar-event-start-date") as HTMLInputElement | null;
const calendarEventEndDate = document.getElementById("calendar-event-end-date") as HTMLInputElement | null;
const calendarEventStartDateDisplay = document.getElementById("calendar-event-start-date-display") as HTMLDivElement | null;
const calendarEventEndDateDisplay = document.getElementById("calendar-event-end-date-display") as HTMLDivElement | null;
const calendarEventTimeRow = document.getElementById("calendar-event-time-row") as HTMLDivElement | null;
const calendarEventAllDay = document.getElementById("calendar-event-all-day") as HTMLInputElement | null;
const calendarEventTimeInputs = document.getElementById("calendar-event-time-inputs") as HTMLDivElement | null;
const calendarEventStartTime = document.getElementById("calendar-event-start-time") as HTMLInputElement | null;
const calendarEventEndTime = document.getElementById("calendar-event-end-time") as HTMLInputElement | null;
const calendarEventRepeatEnabled = document.getElementById("calendar-event-repeat-enabled") as HTMLInputElement | null;
const calendarEventRepeatInputs = document.getElementById("calendar-event-repeat-inputs") as HTMLDivElement | null;
const calendarEventRepeatInterval = document.getElementById("calendar-event-repeat-interval") as HTMLInputElement | null;
const calendarEventRepeatUnit = document.getElementById("calendar-event-repeat-unit") as HTMLSelectElement | null;
const calendarRepeatPreview = document.getElementById("calendar-repeat-preview") as HTMLDivElement | null;
const calendarEventAssigneeRow = document.getElementById("calendar-event-assignee-row") as HTMLDivElement | null;
const calendarEventAssigneeList = document.getElementById("calendar-event-assignee-list") as HTMLDivElement | null;
const calendarEventRotateLabel = document.getElementById("calendar-event-rotate-label") as HTMLLabelElement | null;
const calendarEventRotateAssignees = document.getElementById("calendar-event-rotate-assignees") as HTMLInputElement | null;
const calendarAssigneeRotationPreview = document.getElementById("calendar-assignee-rotation-preview") as HTMLDivElement | null;
const calendarWysiwygToolbar = document.getElementById("calendar-wysiwyg-toolbar") as HTMLDivElement | null;
const calendarEventDescription = document.getElementById("calendar-event-description") as HTMLDivElement | null;
const calendarEventImagesInput = document.getElementById("calendar-event-images-input") as HTMLInputElement | null;
const calendarEventImagesList = document.getElementById("calendar-event-images-list") as HTMLDivElement | null;
const btnCalendarEventCancel = document.getElementById("btn-calendar-event-cancel") as HTMLButtonElement | null;
const btnCalendarEventSave = document.getElementById("btn-calendar-event-save") as HTMLButtonElement | null;

let activeCalendarTab: CalendarType = "personal";
let selectedCalendarSpaceId: string | null = null;
let selectedCalendarOrgId: number | null = null;
let calendarViewYear: number = new Date().getFullYear();
let calendarViewMonth: number = new Date().getMonth();
let calendarEventsCache: CalendarEventDto[] = [];
let calendarAssignableMembers: CalendarAssigneeDto[] = [];
let selectedCalendarAssigneeIds: number[] = [];
let selectedCalendarEventImages: Array<{ name: string; dataUrl: string }> = [];
let activeDetailCalendarEvent: CalendarEventDto | null = null;
let editingCalendarEventId: number | null = null;
let activeCalendarDayIso: string | null = null;
let calendarDetailReturnView: "month" | "day" = "month";
let calendarEditorReturnView: "month" | "day" | "detail" = "month";
const calendarMealsCache = new Map<number, string>();
let editingMealDayOfWeek: number | null = null;
const MEAL_DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

function showCalendarFeedback(msg: string, type: "error" | "success" = "error") {
  if (!calendarFeedbackEl) return;
  calendarFeedbackEl.textContent = msg;
  calendarFeedbackEl.className = `notes-feedback ${type}`;
  calendarFeedbackEl.classList.remove("hidden");
}

function clearCalendarFeedback() {
  if (!calendarFeedbackEl) return;
  calendarFeedbackEl.textContent = "";
  calendarFeedbackEl.classList.add("hidden");
}

function showCalendarView(view: "month" | "day" | "detail" | "editor" | "meal-editor") {
  clearCalendarFeedback();
  calendarMonthView?.classList.toggle("hidden", view !== "month");
  calendarDayView?.classList.toggle("hidden", view !== "day");
  calendarDetailView?.classList.toggle("hidden", view !== "detail");
  calendarEditorView?.classList.toggle("hidden", view !== "editor");
  calendarMealEditorView?.classList.toggle("hidden", view !== "meal-editor");
}

function toIsoDateString(year: number, monthIndex: number, day: number): string {
  const m = String(monthIndex + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

function formatCalendarDateDisplay(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

function parseIsoDateUtcMs(isoDate: string): number {
  const [y, m, d] = isoDate.split("-").map(Number);
  return Date.UTC(y, (m || 1) - 1, d || 1);
}

function diffDaysUtc(startIso: string, endIso: string): number {
  return Math.round((parseIsoDateUtcMs(endIso) - parseIsoDateUtcMs(startIso)) / 86400000);
}

function addDaysUtc(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

function shiftIsoDate(isoDate: string, steps: number, unit: CalendarRepeatUnit): string {
  if (steps === 0) return isoDate;
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;

  if (unit === "day" || unit === "week") {
    return addDaysUtc(isoDate, steps * (unit === "week" ? 7 : 1));
  }

  if (unit === "month") {
    const totalMonths = y * 12 + (m - 1) + steps;
    const targetYear = Math.floor(totalMonths / 12);
    const targetMonth = ((totalMonths % 12) + 12) % 12;
    const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
    const clampedDay = Math.min(d, lastDay);
    return `${targetYear}-${String(targetMonth + 1).padStart(2, "0")}-${String(clampedDay).padStart(2, "0")}`;
  }

  // year
  const targetYear = y + steps;
  const lastDay = new Date(Date.UTC(targetYear, m, 0)).getUTCDate();
  const clampedDay = Math.min(d, lastDay);
  return `${targetYear}-${String(m).padStart(2, "0")}-${String(clampedDay).padStart(2, "0")}`;
}

function formatRepeatSummary(interval: number, unit: CalendarRepeatUnit): string {
  const unitLabel = interval === 1 ? unit : `${unit}s`;
  return `Every ${interval} ${unitLabel}`;
}

function formatCalendarEventWhen(ev: CalendarEventDto): string {
  const repeatSuffix =
    ev.repeatInterval && ev.repeatInterval > 0 && ev.repeatUnit
      ? ` • Repeat: ${formatRepeatSummary(ev.repeatInterval, ev.repeatUnit)}`
      : "";
  if (ev.endDate > ev.startDate) {
    return `${formatCalendarDateDisplay(ev.startDate)} – ${formatCalendarDateDisplay(ev.endDate)} (Multi-day)${repeatSuffix}`;
  }
  const datePart = formatCalendarDateDisplay(ev.startDate);
  if (ev.isAllDay || !ev.startTime || !ev.endTime) {
    return `${datePart} • All day${repeatSuffix}`;
  }
  return `${datePart} • ${ev.startTime} – ${ev.endTime}${repeatSuffix}`;
}

function canModifyCalendarEvent(ev: CalendarEventDto): boolean {
  if (!currentUser) return false;
  if (ev.authorId === currentUser.id || currentUser.role === "superadmin") return true;
  if (ev.type === "space" && ev.spaceId) {
    return accessibleNoteSpaces.some((s) => s.id === ev.spaceId);
  }
  if (ev.type === "organisation" && ev.organisationId) {
    const org = organisationsCache.find((o) => o.id === ev.organisationId);
    if (org && org.members.some((m) => m.userId === currentUser!.id)) {
      return true;
    }
  }
  return false;
}

function updateCalendarScopeSelector(): boolean {
  if (!calendarScopeBar || !calendarScopeLabel || !calendarScopeSelect) return true;

  if (activeCalendarTab === "personal") {
    calendarScopeBar.classList.add("hidden");
    if (btnNewCalendarEvent) btnNewCalendarEvent.disabled = false;
    return true;
  }

  if (activeCalendarTab === "space" || activeCalendarTab === "meals") {
    if (accessibleNoteSpaces.length === 0) {
      calendarScopeBar.classList.add("hidden");
      if (btnNewCalendarEvent) btnNewCalendarEvent.disabled = true;
      return false;
    }
    if (
      !selectedCalendarSpaceId ||
      !accessibleNoteSpaces.some((s) => s.id === selectedCalendarSpaceId)
    ) {
      const currentAccessible = accessibleNoteSpaces.find((s) => s.id === currentSpaceId);
      const personalAccessible = myPersonalSpace
        ? accessibleNoteSpaces.find((s) => s.id === myPersonalSpace!.id)
        : undefined;
      selectedCalendarSpaceId = (currentAccessible || personalAccessible || accessibleNoteSpaces[0]).id;
    }
    calendarScopeLabel.textContent = "Space:";
    calendarScopeSelect.innerHTML = "";
    for (const sp of accessibleNoteSpaces) {
      const opt = document.createElement("option");
      opt.value = sp.id;
      opt.textContent = sp.isOwner ? `${sp.name} (Owner)` : `${sp.name} (Space-mate)`;
      if (sp.id === selectedCalendarSpaceId) opt.selected = true;
      calendarScopeSelect.appendChild(opt);
    }
    calendarScopeBar.classList.remove("hidden");
    if (btnNewCalendarEvent) btnNewCalendarEvent.disabled = false;
    return true;
  }

  // organisation
  if (organisationsCache.length === 0) {
    calendarScopeBar.classList.add("hidden");
    if (btnNewCalendarEvent) btnNewCalendarEvent.disabled = true;
    return false;
  }
  if (
    selectedCalendarOrgId === null ||
    !organisationsCache.some((o) => o.id === selectedCalendarOrgId)
  ) {
    selectedCalendarOrgId = organisationsCache[0].id;
  }
  calendarScopeLabel.textContent = "Organisation:";
  calendarScopeSelect.innerHTML = "";
  for (const org of organisationsCache) {
    const opt = document.createElement("option");
    opt.value = String(org.id);
    opt.textContent = org.name;
    if (org.id === selectedCalendarOrgId) opt.selected = true;
    calendarScopeSelect.appendChild(opt);
  }
  calendarScopeBar.classList.remove("hidden");
  if (btnNewCalendarEvent) btnNewCalendarEvent.disabled = false;
  return true;
}

function renderCalendarMealsView() {
  if (!calendarMealsGrid) return;
  calendarMealsGrid.innerHTML = "";
  const jsDay = new Date().getDay(); // 0=Sun..6=Sat
  const todayIndex = jsDay === 0 ? 6 : jsDay - 1; // 0=Mon..6=Sun

  for (let dayIndex = 0; dayIndex < MEAL_DAY_NAMES.length; dayIndex++) {
    const dayName = MEAL_DAY_NAMES[dayIndex];
    const mealName = calendarMealsCache.get(dayIndex) || "";

    const card = document.createElement("button");
    card.type = "button";
    card.className = "calendar-meal-day-card";
    if (dayIndex === todayIndex) {
      card.classList.add("is-today");
    }

    const nameEl = document.createElement("div");
    nameEl.className = "calendar-meal-day-name";
    nameEl.textContent = dayName;

    const menuEl = document.createElement("div");
    menuEl.className = "calendar-meal-day-menu";
    if (mealName) {
      menuEl.textContent = mealName;
    } else {
      menuEl.classList.add("is-empty");
      menuEl.textContent = "Tap to set menu";
    }

    card.appendChild(nameEl);
    card.appendChild(menuEl);
    card.addEventListener("click", () => {
      openCalendarMealEditor(dayIndex);
    });
    calendarMealsGrid.appendChild(card);
  }
}

function openCalendarMealEditor(dayOfWeek: number) {
  editingMealDayOfWeek = dayOfWeek;
  if (calendarMealEditorHeading) {
    calendarMealEditorHeading.textContent = MEAL_DAY_NAMES[dayOfWeek] || "Meal";
  }
  if (calendarMealInput) {
    calendarMealInput.value = calendarMealsCache.get(dayOfWeek) || "";
  }
  showCalendarView("meal-editor");
  calendarMealInput?.focus();
  calendarMealInput?.select();
}

async function fetchCalendarMealsData() {
  if (!authToken) return;
  clearCalendarFeedback();

  const hadSpace = Boolean(selectedCalendarSpaceId);
  const params = new URLSearchParams();
  if (selectedCalendarSpaceId) {
    params.set("spaceId", selectedCalendarSpaceId);
  }

  try {
    const queryStr = params.toString();
    const res = await fetch(getApiUrl(`/api/calendar/meals${queryStr ? `?${queryStr}` : ""}`), {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json();
    if (Array.isArray(data.accessibleSpaces)) {
      accessibleNoteSpaces = data.accessibleSpaces;
    }
    calendarMealsCache.clear();
    if (!res.ok || !data.success) {
      if (data.error) showCalendarFeedback(data.error, "error");
    } else if (Array.isArray(data.meals)) {
      for (const m of data.meals as CalendarMealDto[]) {
        if (m.mealName) {
          calendarMealsCache.set(m.dayOfWeek, m.mealName);
        }
      }
    }

    const hasScope = updateCalendarScopeSelector();
    if (!hadSpace && hasScope && selectedCalendarSpaceId) {
      const res2 = await fetch(
        getApiUrl(`/api/calendar/meals?spaceId=${encodeURIComponent(selectedCalendarSpaceId)}`),
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      const data2 = await res2.json();
      if (res2.ok && data2.success && Array.isArray(data2.meals)) {
        for (const m of data2.meals as CalendarMealDto[]) {
          if (m.mealName) {
            calendarMealsCache.set(m.dayOfWeek, m.mealName);
          }
        }
      }
    }
    renderCalendarView();
  } catch (err: any) {
    showCalendarFeedback(err?.message || "Failed to load meals.", "error");
  }
}

async function saveCalendarMeal() {
  if (!authToken || editingMealDayOfWeek === null || !selectedCalendarSpaceId) return;
  clearCalendarFeedback();
  const mealName = calendarMealInput?.value.trim() || "";
  if (btnCalendarMealSave) btnCalendarMealSave.disabled = true;
  try {
    const res = await fetch(getApiUrl(`/api/calendar/meals/${editingMealDayOfWeek}`), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ spaceId: selectedCalendarSpaceId, mealName }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      showCalendarFeedback(data.error || "Failed to save meal.", "error");
      return;
    }
    if (mealName) {
      calendarMealsCache.set(editingMealDayOfWeek, data.meal?.mealName || mealName);
    } else {
      calendarMealsCache.delete(editingMealDayOfWeek);
    }
    editingMealDayOfWeek = null;
    showCalendarView("month");
    renderCalendarView();
  } catch (err: any) {
    showCalendarFeedback(err?.message || "Network error saving meal.", "error");
  } finally {
    if (btnCalendarMealSave) btnCalendarMealSave.disabled = false;
  }
}

function renderCalendarView() {
  const isMeals = activeCalendarTab === "meals";
  btnNewCalendarEvent?.classList.toggle("hidden", isMeals);
  const hasScope = updateCalendarScopeSelector();

  if (isMeals) {
    calendarBody?.classList.add("hidden");
    if (!hasScope) {
      calendarMealsBody?.classList.add("hidden");
      if (calendarEmptyState) {
        calendarEmptyState.classList.remove("hidden");
        calendarEmptyState.textContent = "You don't have any personal or shared space yet.";
      }
      return;
    }
    calendarEmptyState?.classList.add("hidden");
    calendarMealsBody?.classList.remove("hidden");
    renderCalendarMealsView();
    return;
  }

  calendarMealsBody?.classList.add("hidden");

  if (!hasScope) {
    calendarBody?.classList.add("hidden");
    if (calendarEmptyState) {
      calendarEmptyState.classList.remove("hidden");
      if (activeCalendarTab === "space") {
        calendarEmptyState.textContent = "You don't have any personal or shared space yet.";
      } else {
        calendarEmptyState.textContent =
          "You are not a member of any organisation yet. Join or create an organisation to view its calendar.";
      }
    }
    return;
  }

  calendarEmptyState?.classList.add("hidden");
  calendarBody?.classList.remove("hidden");

  if (!calendarDaysGrid) return;

  if (calendarMonthSelect) {
    calendarMonthSelect.value = String(calendarViewMonth);
  }
  if (calendarYearInput && document.activeElement !== calendarYearInput) {
    calendarYearInput.value = String(calendarViewYear);
  }

  const monthDate = new Date(calendarViewYear, calendarViewMonth, 1);
  const firstDayOfWeek = monthDate.getDay(); // 0 (Sun) - 6 (Sat)
  const daysInMonth = new Date(calendarViewYear, calendarViewMonth + 1, 0).getDate();
  const totalCells = Math.ceil((firstDayOfWeek + daysInMonth) / 7) * 7;

  const today = new Date();
  const isCurrentMonth =
    today.getFullYear() === calendarViewYear && today.getMonth() === calendarViewMonth;
  const todayDate = today.getDate();

  const monthStartIso = toIsoDateString(calendarViewYear, calendarViewMonth, 1);
  const monthEndIso = toIsoDateString(calendarViewYear, calendarViewMonth, daysInMonth);
  const monthOccurrences: Array<{ event: CalendarEventDto; occStart: string; occEnd: string; occIndex: number }> = [];

  for (const ev of calendarEventsCache) {
    if (ev.startDate > monthEndIso) continue;
    const interval = ev.repeatInterval && ev.repeatInterval > 0 && ev.repeatUnit ? ev.repeatInterval : null;
    const unit = ev.repeatUnit || null;

    if (!interval || !unit) {
      if (ev.endDate >= monthStartIso) {
        monthOccurrences.push({ event: ev, occStart: ev.startDate, occEnd: ev.endDate, occIndex: 0 });
      }
      continue;
    }

    const durDays = Math.max(0, diffDaysUtc(ev.startDate, ev.endDate));
    let kStart = 0;

    if (unit === "day" || unit === "week") {
      const stepDays = interval * (unit === "week" ? 7 : 1);
      const minStartNeeded = addDaysUtc(monthStartIso, -durDays);
      const diffFromStart = diffDaysUtc(ev.startDate, minStartNeeded);
      kStart = Math.max(0, Math.ceil(diffFromStart / stepDays));
    } else if (unit === "month") {
      const [sy, sm] = ev.startDate.split("-").map(Number);
      const monthsDiff = (calendarViewYear - sy) * 12 + (calendarViewMonth - (sm - 1));
      kStart = Math.max(0, Math.floor(monthsDiff / interval) - Math.ceil(durDays / 28) - 1);
    } else {
      const [sy] = ev.startDate.split("-").map(Number);
      const yearsDiff = calendarViewYear - sy;
      kStart = Math.max(0, Math.floor(yearsDiff / interval) - Math.ceil(durDays / 365) - 1);
    }

    for (let k = kStart; k < kStart + 1000; k++) {
      const occStart = k === 0 ? ev.startDate : shiftIsoDate(ev.startDate, k * interval, unit);
      if (occStart > monthEndIso) break;
      const occEnd = durDays > 0 ? addDaysUtc(occStart, durDays) : occStart;
      if (occEnd >= monthStartIso) {
        monthOccurrences.push({ event: ev, occStart, occEnd, occIndex: k });
      }
    }
  }

  calendarDaysGrid.innerHTML = "";

  for (let cellIdx = 0; cellIdx < totalCells; cellIdx++) {
    const dayNumber = cellIdx - firstDayOfWeek + 1;
    const cell = document.createElement("div");

    if (dayNumber < 1 || dayNumber > daysInMonth) {
      cell.className = "calendar-day-cell is-outside";
      calendarDaysGrid.appendChild(cell);
      continue;
    }

    const isoDate = toIsoDateString(calendarViewYear, calendarViewMonth, dayNumber);
    const isToday = isCurrentMonth && dayNumber === todayDate;
    cell.className = isToday ? "calendar-day-cell is-today" : "calendar-day-cell";
    cell.dataset.day = String(dayNumber);
    cell.dataset.date = isoDate;
    cell.title = `Click to view events on ${formatCalendarDateDisplay(isoDate)}`;

    const headerEl = document.createElement("div");
    headerEl.className = "calendar-day-header";

    const numEl = document.createElement("span");
    numEl.className = isToday ? "calendar-day-number is-today" : "calendar-day-number";
    numEl.textContent = String(dayNumber);
    headerEl.appendChild(numEl);

    const eventsEl = document.createElement("div");
    eventsEl.className = "calendar-day-events";

    const dayOccurrences = monthOccurrences.filter(
      (occ) => occ.occStart <= isoDate && occ.occEnd >= isoDate
    );

    const visibleOccurrences = dayOccurrences.slice(0, 2);
    for (const occ of visibleOccurrences) {
      const ev = occ.event;
      const pill = document.createElement("button");
      pill.type = "button";
      const isMultiDay = ev.endDate > ev.startDate;
      pill.className = isMultiDay
        ? "calendar-event-pill is-multiday"
        : ev.isAllDay
          ? "calendar-event-pill is-allday"
          : "calendar-event-pill";

      const isRepeating = Boolean(ev.repeatInterval && ev.repeatInterval > 0 && ev.repeatUnit);
      const timeOrTitle =
        !isMultiDay && !ev.isAllDay && ev.startTime
          ? `${ev.startTime} ${ev.title}`
          : ev.title;
      const baseLabel = isRepeating ? `[R] ${timeOrTitle}` : timeOrTitle;
      const occAssignees = getOccurrenceAssignees(ev, occ.occIndex);
      let assigneeSuffix = "";
      if (occAssignees.length === 1) {
        assigneeSuffix = ` (${occAssignees[0].name})`;
      } else if (occAssignees.length > 1) {
        assigneeSuffix = ` (${occAssignees[0].name} +${occAssignees.length - 1})`;
      }
      const labelText = `${baseLabel}${assigneeSuffix}`;
      pill.textContent = labelText;
      pill.title = labelText;

      pill.addEventListener("click", (e) => {
        e.stopPropagation();
        openCalendarEventDetailView(ev, occ.occIndex, isoDate, "month");
      });
      eventsEl.appendChild(pill);
    }

    if (dayOccurrences.length > 2) {
      const extraCount = dayOccurrences.length - 2;
      const moreBtn = document.createElement("button");
      moreBtn.type = "button";
      moreBtn.className = "calendar-more-pill";
      moreBtn.textContent = `+ ${extraCount} more`;
      moreBtn.title = `View all ${dayOccurrences.length} events on ${formatCalendarDateDisplay(isoDate)}`;
      moreBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        openCalendarDayView(isoDate);
      });
      eventsEl.appendChild(moreBtn);
    }

    cell.addEventListener("click", () => {
      openCalendarDayView(isoDate);
    });

    cell.appendChild(headerEl);
    cell.appendChild(eventsEl);
    calendarDaysGrid.appendChild(cell);
  }
}

function syncCalendarDateDisplays() {
  const startText = calendarEventStartDateDisplay?.querySelector(".calendar-date-text");
  if (startText) {
    startText.textContent = calendarEventStartDate?.value
      ? formatCalendarDateDisplay(calendarEventStartDate.value)
      : "dd/mm/yyyy";
  }
  const endText = calendarEventEndDateDisplay?.querySelector(".calendar-date-text");
  if (endText) {
    endText.textContent = calendarEventEndDate?.value
      ? formatCalendarDateDisplay(calendarEventEndDate.value)
      : "dd/mm/yyyy";
  }
}

function updateCalendarTimeRowVisibility() {
  if (!calendarEventStartDate || !calendarEventEndDate || !calendarEventTimeRow) return;
  const start = calendarEventStartDate.value;
  const end = calendarEventEndDate.value || start;
  const isMultiDay = Boolean(start && end && end > start);

  calendarEventTimeRow.classList.toggle("hidden", isMultiDay);

  if (!isMultiDay && calendarEventTimeInputs && calendarEventAllDay) {
    calendarEventTimeInputs.classList.toggle("hidden", calendarEventAllDay.checked);
  }
}

function getOccurrenceAssignees(ev: CalendarEventDto, occIndex: number): CalendarAssigneeDto[] {
  const assignees = ev.assignees || [];
  if (assignees.length === 0) return [];
  const isRepeating = Boolean(ev.repeatInterval && ev.repeatInterval > 0 && ev.repeatUnit);
  if (ev.rotateAssignees && isRepeating) {
    const idx = ((occIndex % assignees.length) + assignees.length) % assignees.length;
    return [assignees[idx]];
  }
  return assignees;
}

function renderCalendarAssigneePicker() {
  if (!calendarEventAssigneeRow || !calendarEventAssigneeList) return;
  const showAssignees = activeCalendarTab !== "personal";
  calendarEventAssigneeRow.classList.toggle("hidden", !showAssignees);
  if (!showAssignees) return;

  const validIds = new Set(calendarAssignableMembers.map((m) => m.userId));
  selectedCalendarAssigneeIds = selectedCalendarAssigneeIds.filter((id) => validIds.has(id));

  const repeatEnabled = Boolean(calendarEventRepeatEnabled?.checked);
  if (calendarEventRotateLabel) {
    calendarEventRotateLabel.classList.toggle("hidden", !repeatEnabled);
  }
  const rotateEnabled = repeatEnabled && Boolean(calendarEventRotateAssignees?.checked);

  calendarEventAssigneeList.innerHTML = "";
  if (calendarAssignableMembers.length === 0) {
    const emptyEl = document.createElement("div");
    emptyEl.className = "calendar-assignee-empty";
    emptyEl.textContent = "No members available to assign.";
    calendarEventAssigneeList.appendChild(emptyEl);
  } else {
    for (const member of calendarAssignableMembers) {
      const selIdx = selectedCalendarAssigneeIds.indexOf(member.userId);
      const isSelected = selIdx !== -1;

      const label = document.createElement("label");
      label.className = isSelected ? "calendar-assignee-option is-selected" : "calendar-assignee-option";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = isSelected;
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) {
          if (!selectedCalendarAssigneeIds.includes(member.userId)) {
            selectedCalendarAssigneeIds.push(member.userId);
          }
        } else {
          selectedCalendarAssigneeIds = selectedCalendarAssigneeIds.filter((id) => id !== member.userId);
        }
        renderCalendarAssigneePicker();
      });

      const nameSpan = document.createElement("span");
      nameSpan.className = "calendar-assignee-name";
      nameSpan.textContent = member.name;

      label.appendChild(checkbox);
      label.appendChild(nameSpan);

      if (rotateEnabled && isSelected) {
        const orderBadge = document.createElement("span");
        orderBadge.className = "calendar-assignee-order";
        orderBadge.textContent = String(selIdx + 1);
        label.appendChild(orderBadge);
      }

      calendarEventAssigneeList.appendChild(label);
    }
  }

  if (calendarAssigneeRotationPreview) {
    if (rotateEnabled && selectedCalendarAssigneeIds.length > 0) {
      const memberMap = new Map(calendarAssignableMembers.map((m) => [m.userId, m.name]));
      const names = selectedCalendarAssigneeIds.map((id) => memberMap.get(id)).filter(Boolean) as string[];
      const cycleText = names.length > 1 ? `${names.join(" → ")} → ${names[0]}` : names[0];
      calendarAssigneeRotationPreview.textContent = `Rotation order: ${cycleText}`;
      calendarAssigneeRotationPreview.classList.remove("hidden");
    } else {
      calendarAssigneeRotationPreview.classList.add("hidden");
      calendarAssigneeRotationPreview.textContent = "";
    }
  }
}

function updateCalendarRepeatUI() {
  if (!calendarEventRepeatEnabled || !calendarEventRepeatInputs || !calendarRepeatPreview) return;
  const enabled = calendarEventRepeatEnabled.checked;
  calendarEventRepeatInputs.classList.toggle("hidden", !enabled);

  if (!enabled) {
    calendarRepeatPreview.classList.add("hidden");
    calendarRepeatPreview.textContent = "";
    renderCalendarAssigneePicker();
    return;
  }

  const interval = Math.max(1, Math.min(365, Math.floor(Number(calendarEventRepeatInterval?.value) || 1)));
  const unit = (calendarEventRepeatUnit?.value || "day") as CalendarRepeatUnit;
  const start = calendarEventStartDate?.value;
  if (start) {
    const nextStart = shiftIsoDate(start, interval, unit);
    calendarRepeatPreview.textContent = `Repeats ${formatRepeatSummary(interval, unit).toLowerCase()} (next: ${formatCalendarDateDisplay(nextStart)})`;
  } else {
    calendarRepeatPreview.textContent = `Repeats ${formatRepeatSummary(interval, unit).toLowerCase()}`;
  }
  calendarRepeatPreview.classList.remove("hidden");
  renderCalendarAssigneePicker();
}

function getOccurrencesForDate(
  isoDate: string
): Array<{ event: CalendarEventDto; occStart: string; occEnd: string; occIndex: number }> {
  const [targetY, targetM] = isoDate.split("-").map(Number);
  const results: Array<{ event: CalendarEventDto; occStart: string; occEnd: string; occIndex: number }> = [];

  for (const ev of calendarEventsCache) {
    if (ev.startDate > isoDate) continue;
    const interval = ev.repeatInterval && ev.repeatInterval > 0 && ev.repeatUnit ? ev.repeatInterval : null;
    const unit = ev.repeatUnit || null;

    if (!interval || !unit) {
      if (ev.endDate >= isoDate) {
        results.push({ event: ev, occStart: ev.startDate, occEnd: ev.endDate, occIndex: 0 });
      }
      continue;
    }

    const durDays = Math.max(0, diffDaysUtc(ev.startDate, ev.endDate));
    let kStart = 0;

    if (unit === "day" || unit === "week") {
      const stepDays = interval * (unit === "week" ? 7 : 1);
      const minStartNeeded = addDaysUtc(isoDate, -durDays);
      const diffFromStart = diffDaysUtc(ev.startDate, minStartNeeded);
      kStart = Math.max(0, Math.ceil(diffFromStart / stepDays));
    } else if (unit === "month") {
      const [sy, sm] = ev.startDate.split("-").map(Number);
      const monthsDiff = (targetY - sy) * 12 + (targetM - sm);
      kStart = Math.max(0, Math.floor(monthsDiff / interval) - Math.ceil(durDays / 28) - 1);
    } else {
      const [sy] = ev.startDate.split("-").map(Number);
      const yearsDiff = targetY - sy;
      kStart = Math.max(0, Math.floor(yearsDiff / interval) - Math.ceil(durDays / 365) - 1);
    }

    for (let k = kStart; k < kStart + 1000; k++) {
      const occStart = k === 0 ? ev.startDate : shiftIsoDate(ev.startDate, k * interval, unit);
      if (occStart > isoDate) break;
      const occEnd = durDays > 0 ? addDaysUtc(occStart, durDays) : occStart;
      if (occEnd >= isoDate) {
        results.push({ event: ev, occStart, occEnd, occIndex: k });
        break;
      }
    }
  }

  return results;
}

function openCalendarDayView(isoDate: string) {
  activeCalendarDayIso = isoDate;
  if (calendarDayViewHeading) {
    calendarDayViewHeading.textContent = formatCalendarDateDisplay(isoDate);
  }

  if (calendarDayEventsList) {
    calendarDayEventsList.innerHTML = "";
    const dayOccurrences = getOccurrencesForDate(isoDate);

    if (dayOccurrences.length === 0) {
      const emptyEl = document.createElement("div");
      emptyEl.className = "calendar-day-empty";
      emptyEl.textContent = "No events scheduled for this day.";
      calendarDayEventsList.appendChild(emptyEl);
    } else {
      for (const occ of dayOccurrences) {
        const ev = occ.event;
        const item = document.createElement("button");
        item.type = "button";
        item.className = "calendar-day-list-item";

        const isRepeating = Boolean(ev.repeatInterval && ev.repeatInterval > 0 && ev.repeatUnit);
        const titleEl = document.createElement("div");
        titleEl.className = "calendar-day-list-title";
        titleEl.textContent = isRepeating ? `[R] ${ev.title}` : ev.title;

        const metaParts: string[] = [];
        if (ev.endDate > ev.startDate) {
          metaParts.push(`${formatCalendarDateDisplay(occ.occStart)} – ${formatCalendarDateDisplay(occ.occEnd)}`);
        } else if (ev.isAllDay) {
          metaParts.push("All day");
        } else if (ev.startTime && ev.endTime) {
          metaParts.push(`${ev.startTime} – ${ev.endTime}`);
        }

        const occAssignees = getOccurrenceAssignees(ev, occ.occIndex);
        if (occAssignees.length > 0) {
          metaParts.push(`Assignee: ${occAssignees.map((a) => a.name).join(", ")}`);
        }

        const metaEl = document.createElement("div");
        metaEl.className = "calendar-day-list-meta";
        metaEl.textContent = metaParts.join(" • ");

        item.appendChild(titleEl);
        if (metaEl.textContent) item.appendChild(metaEl);

        item.addEventListener("click", () => {
          openCalendarEventDetailView(ev, occ.occIndex, isoDate, "day");
        });
        calendarDayEventsList.appendChild(item);
      }
    }
  }

  showCalendarView("day");
}

async function compressCalendarImageFile(file: File): Promise<string> {
  const MAX_DIM = 1600;
  const QUALITY = 0.4; // 60% compression

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const imageEl = new Image();
      imageEl.onload = () => resolve(imageEl);
      imageEl.onerror = () => reject(new Error("Failed to read picture."));
      imageEl.src = objectUrl;
    });

    let width = img.naturalWidth || img.width;
    let height = img.naturalHeight || img.height;
    if (width > MAX_DIM || height > MAX_DIM) {
      const scale = Math.min(MAX_DIM / width, MAX_DIM / height);
      width = Math.max(1, Math.round(width * scale));
      height = Math.max(1, Math.round(height * scale));
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas unavailable for image compression.");
    }
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", QUALITY);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function openCalendarImageLightbox(src: string, alt = "Event picture preview") {
  if (!calendarImageLightbox || !calendarLightboxImg) return;
  calendarLightboxImg.src = src;
  calendarLightboxImg.alt = alt;
  calendarImageLightbox.classList.remove("hidden");
}

function closeCalendarImageLightbox() {
  if (!calendarImageLightbox || !calendarLightboxImg) return;
  calendarImageLightbox.classList.add("hidden");
  calendarLightboxImg.src = "";
}

function renderCalendarEventImagesChips() {
  if (!calendarEventImagesList) return;
  calendarEventImagesList.innerHTML = "";
  if (selectedCalendarEventImages.length === 0) {
    calendarEventImagesList.classList.add("hidden");
    return;
  }
  calendarEventImagesList.classList.remove("hidden");
  selectedCalendarEventImages.forEach((img, idx) => {
    const wrap = document.createElement("div");
    wrap.className = "calendar-form-image-thumb-wrap";

    const thumb = document.createElement("img");
    thumb.src = img.dataUrl;
    thumb.alt = img.name;
    thumb.className = "calendar-form-image-thumb";
    thumb.title = "Click to preview";
    thumb.addEventListener("click", () => {
      openCalendarImageLightbox(img.dataUrl, img.name);
    });

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "calendar-form-image-remove";
    removeBtn.textContent = "×";
    removeBtn.title = `Remove ${img.name}`;
    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      selectedCalendarEventImages.splice(idx, 1);
      renderCalendarEventImagesChips();
    });

    wrap.appendChild(thumb);
    wrap.appendChild(removeBtn);
    calendarEventImagesList.appendChild(wrap);
  });
}

function openCalendarEventDetailView(
  ev: CalendarEventDto,
  occIndex = 0,
  occDate?: string,
  returnView: "month" | "day" = "month"
) {
  calendarDetailReturnView = returnView;
  activeDetailCalendarEvent = ev;
  if (calendarDetailTitle) calendarDetailTitle.textContent = ev.title;
  if (calendarDetailWhen) {
    calendarDetailWhen.innerHTML = "";
    const dateLine = document.createElement("div");
    if (ev.endDate > ev.startDate) {
      dateLine.textContent = `${formatCalendarDateDisplay(ev.startDate)} – ${formatCalendarDateDisplay(ev.endDate)}`;
    } else {
      dateLine.textContent = `${formatCalendarDateDisplay(occDate || ev.startDate)}`;
    }
    const timeLine = document.createElement("div");
    timeLine.textContent =
      ev.isAllDay || !ev.startTime || !ev.endTime
        ? "All day"
        : `${ev.startTime} – ${ev.endTime}`;
    calendarDetailWhen.appendChild(dateLine);
    calendarDetailWhen.appendChild(timeLine);
  }
  if (calendarDetailAssignees) {
    const assignees = ev.assignees || [];
    if (ev.type !== "personal" && assignees.length > 0) {
      const occAssignees = getOccurrenceAssignees(ev, occIndex);
      calendarDetailAssignees.textContent = `Assignee: ${occAssignees.map((a) => a.name).join(", ")}`;
      calendarDetailAssignees.classList.remove("hidden");
    } else {
      calendarDetailAssignees.textContent = "";
      calendarDetailAssignees.classList.add("hidden");
    }
  }
  if (calendarDetailMeta) {
    calendarDetailMeta.textContent = `Created by ${ev.authorName}`;
  }
  if (calendarDetailDescription) {
    const clean = sanitizeClientNoteHtml(ev.description || "");
    calendarDetailDescription.innerHTML = clean || "<p><em>No description</em></p>";
  }
  if (calendarDetailImages) {
    calendarDetailImages.innerHTML = "";
    const imgs = ev.images || [];
    if (imgs.length > 0) {
      for (let i = 0; i < imgs.length; i++) {
        const imgSrc = imgs[i];
        const imgAlt = `${ev.title} picture ${i + 1}`;
        const imgEl = document.createElement("img");
        imgEl.src = imgSrc;
        imgEl.alt = imgAlt;
        imgEl.className = "calendar-detail-image-thumb";
        imgEl.loading = "lazy";
        imgEl.title = "Click to preview";
        imgEl.addEventListener("click", () => {
          openCalendarImageLightbox(imgSrc, imgAlt);
        });
        calendarDetailImages.appendChild(imgEl);
      }
      calendarDetailImages.classList.remove("hidden");
    } else {
      calendarDetailImages.classList.add("hidden");
    }
  }

  const canModify = canModifyCalendarEvent(ev);
  btnCalendarEventEdit?.classList.toggle("hidden", !canModify);
  btnCalendarEventDelete?.classList.toggle("hidden", !canModify);

  showCalendarView("detail");
}

function openCalendarEditorView(
  ev: CalendarEventDto | null,
  defaultDate?: string,
  returnView: "month" | "day" | "detail" = ev ? "detail" : "month"
) {
  calendarEditorReturnView = returnView;
  editingCalendarEventId = ev ? ev.id : null;
  if (calendarEditorHeading) {
    calendarEditorHeading.textContent = ev ? "Edit Event" : "New Event";
  }

  const fallbackDate =
    defaultDate ||
    (() => {
      const now = new Date();
      if (now.getFullYear() === calendarViewYear && now.getMonth() === calendarViewMonth) {
        return toIsoDateString(calendarViewYear, calendarViewMonth, now.getDate());
      }
      return toIsoDateString(calendarViewYear, calendarViewMonth, 1);
    })();

  if (calendarEventTitle) calendarEventTitle.value = ev ? ev.title : "";
  if (calendarEventStartDate) calendarEventStartDate.value = ev ? ev.startDate : fallbackDate;
  if (calendarEventEndDate) calendarEventEndDate.value = ev ? ev.endDate : fallbackDate;
  syncCalendarDateDisplays();
  if (calendarEventAllDay) calendarEventAllDay.checked = ev ? ev.isAllDay : true;
  if (calendarEventStartTime) calendarEventStartTime.value = ev?.startTime || "09:00";
  if (calendarEventEndTime) calendarEventEndTime.value = ev?.endTime || "10:00";
  const hasRepeat = Boolean(ev?.repeatInterval && ev.repeatInterval > 0 && ev?.repeatUnit);
  if (calendarEventRepeatEnabled) calendarEventRepeatEnabled.checked = hasRepeat;
  if (calendarEventRepeatInterval) calendarEventRepeatInterval.value = String(ev?.repeatInterval || 1);
  if (calendarEventRepeatUnit) calendarEventRepeatUnit.value = ev?.repeatUnit || "day";
  selectedCalendarAssigneeIds = ev?.assigneeIds ? [...ev.assigneeIds] : [];
  if (calendarEventRotateAssignees) calendarEventRotateAssignees.checked = Boolean(ev?.rotateAssignees);
  if (calendarEventDescription) {
    calendarEventDescription.innerHTML = ev ? sanitizeClientNoteHtml(ev.description || "") : "";
  }
  selectedCalendarEventImages = (ev?.images || []).map((dataUrl, i) => ({
    name: `Picture ${i + 1}`,
    dataUrl,
  }));
  if (calendarEventImagesInput) calendarEventImagesInput.value = "";
  renderCalendarEventImagesChips();

  updateCalendarTimeRowVisibility();
  updateCalendarRepeatUI();
  showCalendarView("editor");
  calendarEventTitle?.focus();
}

async function fetchCalendarEventsData() {
  if (!authToken) return;
  if (activeCalendarTab === "meals") {
    await fetchCalendarMealsData();
    return;
  }
  clearCalendarFeedback();

  const params = new URLSearchParams({ type: activeCalendarTab });
  if (activeCalendarTab === "space" && selectedCalendarSpaceId) {
    params.set("spaceId", selectedCalendarSpaceId);
  } else if (activeCalendarTab === "organisation" && selectedCalendarOrgId !== null) {
    params.set("organisationId", String(selectedCalendarOrgId));
  }

  try {
    const res = await fetch(getApiUrl(`/api/calendar/events?${params.toString()}`), {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json();
    if (Array.isArray(data.accessibleSpaces)) {
      accessibleNoteSpaces = data.accessibleSpaces;
    }
    calendarAssignableMembers = Array.isArray(data.assignableMembers) ? data.assignableMembers : [];
    if (!res.ok || !data.success) {
      calendarEventsCache = [];
      if (data.error) showCalendarFeedback(data.error, "error");
    } else {
      calendarEventsCache = data.events || [];
    }
    renderCalendarView();
  } catch (err: any) {
    showCalendarFeedback(err?.message || "Failed to load calendar events.", "error");
  }
}

async function saveCalendarEventFromEditor() {
  if (!authToken) return;
  clearCalendarFeedback();

  const title = calendarEventTitle?.value.trim() || "";
  if (!title) {
    showCalendarFeedback("Please enter an event title.", "error");
    calendarEventTitle?.focus();
    return;
  }

  const startDate = calendarEventStartDate?.value || "";
  const endDate = calendarEventEndDate?.value || startDate;
  if (!startDate || !endDate) {
    showCalendarFeedback("Please select start and end dates.", "error");
    return;
  }
  if (endDate < startDate) {
    showCalendarFeedback("End date cannot be earlier than start date.", "error");
    return;
  }

  const isMultiDay = endDate > startDate;
  const isAllDay = isMultiDay ? true : Boolean(calendarEventAllDay?.checked);
  const startTime = !isMultiDay && !isAllDay ? calendarEventStartTime?.value || "" : null;
  const endTime = !isMultiDay && !isAllDay ? calendarEventEndTime?.value || "" : null;

  if (!isMultiDay && !isAllDay) {
    if (!startTime || !endTime) {
      showCalendarFeedback("Please enter start and end times.", "error");
      return;
    }
    if (endTime < startTime) {
      showCalendarFeedback("End time cannot be earlier than start time.", "error");
      return;
    }
  }

  const description = sanitizeClientNoteHtml(calendarEventDescription?.innerHTML || "");

  let repeatInterval: number | null = null;
  let repeatUnit: CalendarRepeatUnit | null = null;
  if (calendarEventRepeatEnabled?.checked) {
    const parsedInterval = Number(calendarEventRepeatInterval?.value);
    if (!Number.isInteger(parsedInterval) || parsedInterval < 1 || parsedInterval > 365) {
      showCalendarFeedback("Repeat interval must be a whole number between 1 and 365.", "error");
      calendarEventRepeatInterval?.focus();
      return;
    }
    repeatInterval = parsedInterval;
    repeatUnit = (calendarEventRepeatUnit?.value || "day") as CalendarRepeatUnit;
  }

  if (btnCalendarEventSave) btnCalendarEventSave.disabled = true;
  try {
    const isEdit = editingCalendarEventId !== null;
    const url = isEdit
      ? getApiUrl(`/api/calendar/events/${editingCalendarEventId}`)
      : getApiUrl("/api/calendar/events");

    const payload: Record<string, any> = {
      title,
      description,
      startDate,
      endDate,
      isAllDay,
      startTime,
      endTime,
      repeatInterval,
      repeatUnit,
      assigneeIds: activeCalendarTab !== "personal" ? selectedCalendarAssigneeIds : [],
      rotateAssignees:
        activeCalendarTab !== "personal" && repeatInterval !== null
          ? Boolean(calendarEventRotateAssignees?.checked)
          : false,
      images: selectedCalendarEventImages.map((img) => img.dataUrl),
    };
    if (!isEdit) {
      payload.type = activeCalendarTab;
      if (activeCalendarTab === "space") payload.spaceId = selectedCalendarSpaceId;
      if (activeCalendarTab === "organisation") payload.organisationId = selectedCalendarOrgId;
    }

    const res = await fetch(url, {
      method: isEdit ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      showCalendarFeedback(data.error || "Failed to save event.", "error");
      return;
    }

    await fetchCalendarEventsData();
    activeDetailCalendarEvent = data.event || null;
    editingCalendarEventId = null;
    if (calendarEditorReturnView === "day" && activeCalendarDayIso) {
      openCalendarDayView(activeCalendarDayIso);
    } else {
      showCalendarView("month");
    }
  } catch (err: any) {
    showCalendarFeedback(err?.message || "Network error saving event.", "error");
  } finally {
    if (btnCalendarEventSave) btnCalendarEventSave.disabled = false;
  }
}

async function deleteActiveDetailCalendarEvent() {
  if (!authToken || !activeDetailCalendarEvent) return;
  if (!confirm(`Delete event "${activeDetailCalendarEvent.title}"?`)) return;

  try {
    const res = await fetch(getApiUrl(`/api/calendar/events/${activeDetailCalendarEvent.id}`), {
      method: "DELETE",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      showCalendarFeedback(data.error || "Failed to delete event.", "error");
      return;
    }
    activeDetailCalendarEvent = null;
    await fetchCalendarEventsData();
    if (calendarDetailReturnView === "day" && activeCalendarDayIso) {
      openCalendarDayView(activeCalendarDayIso);
    } else {
      showCalendarView("month");
    }
  } catch (err: any) {
    showCalendarFeedback(err?.message || "Network error deleting event.", "error");
  }
}

function syncCalendarTabButtons(tab: CalendarType) {
  document.querySelectorAll<HTMLButtonElement>(".calendar-tab-btn").forEach((btn) => {
    const isMatch = btn.dataset.calendarTab === tab;
    btn.classList.toggle("active", isMatch);
    btn.setAttribute("aria-selected", String(isMatch));
  });
}

function switchCalendarTab(tab: CalendarType) {
  activeCalendarTab = tab;
  syncCalendarTabButtons(tab);
  updateCalendarScopeSelector();
  fetchCalendarEventsData();
}

async function openCalendarModal(initialTab?: CalendarType) {
  if (!calendarModal) return;
  if (!authToken || !currentUser) {
    alert("Please log in to view your calendar.");
    return;
  }

  if (initialTab) {
    activeCalendarTab = initialTab;
  }
  syncCalendarTabButtons(activeCalendarTab);

  const now = new Date();
  calendarViewYear = now.getFullYear();
  calendarViewMonth = now.getMonth();

  clearCalendarFeedback();
  calendarModal.classList.remove("hidden");
  setGameControlsActive(false);
  showCalendarView("month");
  renderCalendarView();

  if (activeCalendarTab !== "meals") {
    await fetchOrganisationsData();
  }
  await fetchCalendarEventsData();
  if (activeCalendarTab === "space" && selectedCalendarSpaceId) {
    await fetchCalendarEventsData();
  } else if (activeCalendarTab === "organisation" && selectedCalendarOrgId !== null) {
    await fetchCalendarEventsData();
  }
}

function closeCalendarModal() {
  if (!calendarModal) return;
  calendarModal.classList.add("hidden");
  setGameControlsActive(true);
}

function initCalendarUI() {
  btnCloseCalendarModal?.addEventListener("click", closeCalendarModal);
  calendarModal?.addEventListener("click", (e) => {
    if (e.target === calendarModal) closeCalendarModal();
  });

  dropdownCalendarBtn?.addEventListener("click", () => {
    closeProfileDropdown();
    openCalendarModal();
  });

  document.querySelectorAll<HTMLButtonElement>(".calendar-tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const raw = btn.dataset.calendarTab;
      const tab: CalendarType =
        raw === "space" || raw === "organisation" || raw === "meals" ? raw : "personal";
      switchCalendarTab(tab);
    });
  });

  calendarScopeSelect?.addEventListener("change", () => {
    if (activeCalendarTab === "space" || activeCalendarTab === "meals") {
      selectedCalendarSpaceId = calendarScopeSelect.value || null;
    } else if (activeCalendarTab === "organisation") {
      const val = Number(calendarScopeSelect.value);
      selectedCalendarOrgId = Number.isInteger(val) ? val : null;
    }
    fetchCalendarEventsData();
  });

  btnNewCalendarEvent?.addEventListener("click", () => {
    openCalendarEditorView(null, undefined, "month");
  });

  btnCalendarBackFromDay?.addEventListener("click", () => {
    activeCalendarDayIso = null;
    showCalendarView("month");
  });

  btnCalendarDayNewEvent?.addEventListener("click", () => {
    openCalendarEditorView(null, activeCalendarDayIso || undefined, "day");
  });

  btnCalendarBackFromDetail?.addEventListener("click", () => {
    activeDetailCalendarEvent = null;
    if (calendarDetailReturnView === "day" && activeCalendarDayIso) {
      openCalendarDayView(activeCalendarDayIso);
    } else {
      showCalendarView("month");
    }
  });

  btnCalendarEventEdit?.addEventListener("click", () => {
    if (activeDetailCalendarEvent) {
      openCalendarEditorView(activeDetailCalendarEvent, undefined, "detail");
    }
  });

  btnCalendarEventDelete?.addEventListener("click", () => {
    deleteActiveDetailCalendarEvent();
  });

  const handleCalendarEditorBack = () => {
    if (editingCalendarEventId !== null && activeDetailCalendarEvent) {
      showCalendarView("detail");
    } else if (calendarEditorReturnView === "day" && activeCalendarDayIso) {
      openCalendarDayView(activeCalendarDayIso);
    } else {
      showCalendarView("month");
    }
  };

  btnCalendarBackFromEditor?.addEventListener("click", handleCalendarEditorBack);

  btnCalendarEventCancel?.addEventListener("click", handleCalendarEditorBack);

  btnCalendarEventSave?.addEventListener("click", () => {
    saveCalendarEventFromEditor();
  });

  btnCalendarBackFromMeal?.addEventListener("click", () => {
    editingMealDayOfWeek = null;
    showCalendarView("month");
  });

  btnCalendarMealSave?.addEventListener("click", () => {
    saveCalendarMeal();
  });

  calendarMealInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveCalendarMeal();
    }
  });

  const handleStartDateChange = () => {
    if (calendarEventStartDate && calendarEventEndDate) {
      if (!calendarEventEndDate.value || calendarEventEndDate.value < calendarEventStartDate.value) {
        calendarEventEndDate.value = calendarEventStartDate.value;
      }
    }
    syncCalendarDateDisplays();
    updateCalendarTimeRowVisibility();
    updateCalendarRepeatUI();
  };
  calendarEventStartDate?.addEventListener("change", handleStartDateChange);
  calendarEventStartDate?.addEventListener("input", handleStartDateChange);
  calendarEventStartDate?.addEventListener("click", () => {
    try {
      (calendarEventStartDate as any).showPicker?.();
    } catch {
      // Ignore on browsers without showPicker support
    }
  });

  const handleEndDateChange = () => {
    syncCalendarDateDisplays();
    updateCalendarTimeRowVisibility();
  };
  calendarEventEndDate?.addEventListener("change", handleEndDateChange);
  calendarEventEndDate?.addEventListener("input", handleEndDateChange);
  calendarEventEndDate?.addEventListener("click", () => {
    try {
      (calendarEventEndDate as any).showPicker?.();
    } catch {
      // Ignore on browsers without showPicker support
    }
  });

  calendarEventAllDay?.addEventListener("change", () => {
    updateCalendarTimeRowVisibility();
  });

  calendarEventRepeatEnabled?.addEventListener("change", () => {
    updateCalendarRepeatUI();
  });

  calendarEventRepeatInterval?.addEventListener("input", () => {
    updateCalendarRepeatUI();
  });

  calendarEventRepeatUnit?.addEventListener("change", () => {
    updateCalendarRepeatUI();
  });

  calendarEventRotateAssignees?.addEventListener("change", () => {
    renderCalendarAssigneePicker();
  });

  btnCloseCalendarLightbox?.addEventListener("click", closeCalendarImageLightbox);
  calendarImageLightbox?.addEventListener("click", (e) => {
    if (e.target === calendarImageLightbox) closeCalendarImageLightbox();
  });

  calendarEventImagesInput?.addEventListener("change", async () => {
    const files = Array.from(calendarEventImagesInput.files || []);
    calendarEventImagesInput.value = "";
    if (files.length === 0) return;
    clearCalendarFeedback();

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        showCalendarFeedback("Only picture files are allowed.", "error");
        continue;
      }
      if (selectedCalendarEventImages.length >= 10) {
        showCalendarFeedback("You can upload up to 10 pictures per event.", "error");
        break;
      }
      try {
        const compressed = await compressCalendarImageFile(file);
        selectedCalendarEventImages.push({ name: file.name, dataUrl: compressed });
        renderCalendarEventImagesChips();
      } catch (err: any) {
        showCalendarFeedback(err?.message || `Failed to process ${file.name}.`, "error");
      }
    }
  });

  [calendarEventTitle, calendarEventDescription, calendarEventRepeatInterval].forEach((el) => {
    if (!el) return;
    ["keydown", "keyup", "keypress"].forEach((evt) => {
      el.addEventListener(evt, (e) => {
        e.stopPropagation();
      });
    });
  });

  calendarWysiwygToolbar?.querySelectorAll<HTMLButtonElement>(".wysiwyg-btn").forEach((btn) => {
    btn.addEventListener("mousedown", (e) => {
      e.preventDefault();
    });
    btn.addEventListener("click", () => {
      const cmd = btn.dataset.cmd;
      if (!cmd) return;
      calendarEventDescription?.focus();
      if (cmd === "createLink") {
        const url = prompt("Enter link URL (https://...):");
        if (url && /^https?:\/\//i.test(url.trim())) {
          document.execCommand("createLink", false, url.trim());
        }
      } else if (cmd === "formatBlock") {
        const val = btn.dataset.val || "P";
        document.execCommand("formatBlock", false, val);
      } else {
        document.execCommand(cmd, false);
      }
    });
  });

  btnCalendarToday?.addEventListener("click", () => {
    const now = new Date();
    calendarViewYear = now.getFullYear();
    calendarViewMonth = now.getMonth();
    renderCalendarView();
  });

  btnCalendarPrev?.addEventListener("click", () => {
    calendarViewMonth -= 1;
    if (calendarViewMonth < 0) {
      calendarViewMonth = 11;
      calendarViewYear -= 1;
    }
    renderCalendarView();
  });

  btnCalendarNext?.addEventListener("click", () => {
    calendarViewMonth += 1;
    if (calendarViewMonth > 11) {
      calendarViewMonth = 0;
      calendarViewYear += 1;
    }
    renderCalendarView();
  });

  calendarMonthSelect?.addEventListener("change", () => {
    const val = Number(calendarMonthSelect.value);
    if (Number.isInteger(val) && val >= 0 && val <= 11) {
      calendarViewMonth = val;
      renderCalendarView();
    }
  });

  const applyCalendarYear = (commitInvalid: boolean) => {
    if (!calendarYearInput) return;
    const raw = calendarYearInput.value.trim();
    const parsed = Number(raw);
    if (raw.length === 4 && Number.isInteger(parsed) && parsed >= 1900 && parsed <= 2100) {
      if (parsed !== calendarViewYear) {
        calendarViewYear = parsed;
        renderCalendarView();
      }
      return;
    }
    if (commitInvalid) {
      if (Number.isInteger(parsed) && raw !== "") {
        calendarViewYear = Math.min(2100, Math.max(1900, parsed));
      }
      calendarYearInput.value = String(calendarViewYear);
      renderCalendarView();
    }
  };

  calendarYearInput?.addEventListener("input", () => applyCalendarYear(false));
  calendarYearInput?.addEventListener("change", () => applyCalendarYear(true));
  calendarYearInput?.addEventListener("blur", () => applyCalendarYear(true));
  calendarYearInput?.addEventListener("keydown", (e) => {
    e.stopPropagation();
    if (e.key === "Enter") {
      applyCalendarYear(true);
      calendarYearInput.blur();
    }
  });
}

// ==========================================
// Space's Inventory Modal & API
// ==========================================

interface SpaceInventoryItem {
  id: number;
  spaceId: string;
  name: string;
  bought: boolean;
  createdAt: string;
  updatedAt: string;
}

const spaceInventoryModal = document.getElementById(
  "space-inventory-modal",
) as HTMLDivElement | null;
const btnCloseInventoryModal = document.getElementById(
  "btn-close-inventory-modal",
) as HTMLButtonElement | null;
const inventoryFeedbackEl = document.getElementById(
  "inventory-feedback",
) as HTMLDivElement | null;
const inventoryListView = document.getElementById(
  "inventory-list-view",
) as HTMLDivElement | null;
const inventoryFormView = document.getElementById(
  "inventory-form-view",
) as HTMLDivElement | null;
const btnNewInventory = document.getElementById(
  "btn-new-inventory",
) as HTMLButtonElement | null;
const inventoryTabBoughtBtn = document.getElementById(
  "inventory-tab-bought",
) as HTMLButtonElement | null;
const inventoryTabToBuyBtn = document.getElementById(
  "inventory-tab-to-buy",
) as HTMLButtonElement | null;
const inventoryCountBoughtEl = document.getElementById(
  "inventory-count-bought",
) as HTMLSpanElement | null;
const inventoryCountToBuyEl = document.getElementById(
  "inventory-count-to-buy",
) as HTMLSpanElement | null;
const inventoryListContainer = document.getElementById(
  "inventory-list-container",
) as HTMLDivElement | null;
const btnInventoryBack = document.getElementById(
  "btn-inventory-back",
) as HTMLButtonElement | null;
const inventoryFormHeading = document.getElementById(
  "inventory-form-heading",
) as HTMLSpanElement | null;
const inventoryForm = document.getElementById(
  "inventory-form",
) as HTMLFormElement | null;
const inventoryInputName = document.getElementById(
  "inventory-input-name",
) as HTMLInputElement | null;
const inventorySwitchBought = document.getElementById(
  "inventory-switch-bought",
) as HTMLInputElement | null;
const inventoryBoughtSwitchRow = document.getElementById(
  "inventory-bought-switch-row",
) as HTMLDivElement | null;
const inventoryBoughtSwitchDesc = document.getElementById(
  "inventory-bought-switch-desc",
) as HTMLSpanElement | null;
const btnInventoryDelete = document.getElementById(
  "btn-inventory-delete",
) as HTMLButtonElement | null;
const btnInventoryCancel = document.getElementById(
  "btn-inventory-cancel",
) as HTMLButtonElement | null;
const btnInventorySave = document.getElementById(
  "btn-inventory-save",
) as HTMLButtonElement | null;

let activeInventorySpaceId: string | null = null;
let inventoryItems: SpaceInventoryItem[] = [];
let activeInventoryTab: "bought" | "to-buy" = "bought";
let editingInventoryItemId: number | null = null;
let isLoadingInventory = false;
let isSavingInventory = false;

function showInventoryFeedback(message: string, isError: boolean) {
  if (!inventoryFeedbackEl) return;
  inventoryFeedbackEl.textContent = message;
  inventoryFeedbackEl.className = `inventory-feedback ${isError ? "error" : "success"}`;
}

function clearInventoryFeedback() {
  if (!inventoryFeedbackEl) return;
  inventoryFeedbackEl.textContent = "";
  inventoryFeedbackEl.className = "inventory-feedback hidden";
}

function showInventoryView(view: "list" | "form") {
  if (view === "list") {
    inventoryListView?.classList.remove("hidden");
    inventoryFormView?.classList.add("hidden");
  } else {
    inventoryListView?.classList.add("hidden");
    inventoryFormView?.classList.remove("hidden");
  }
}

function updateInventoryBoughtDesc() {
  if (!inventoryBoughtSwitchDesc || !inventorySwitchBought) return;
  inventoryBoughtSwitchDesc.textContent = inventorySwitchBought.checked
    ? "On — Item is in the Bought list"
    : "Off — Item is in the To Buy list";
}

function setInventoryTab(tab: "bought" | "to-buy") {
  activeInventoryTab = tab;
  if (inventoryTabBoughtBtn) {
    const isBought = tab === "bought";
    inventoryTabBoughtBtn.classList.toggle("active", isBought);
    inventoryTabBoughtBtn.setAttribute("aria-selected", isBought ? "true" : "false");
  }
  if (inventoryTabToBuyBtn) {
    const isToBuy = tab === "to-buy";
    inventoryTabToBuyBtn.classList.toggle("active", isToBuy);
    inventoryTabToBuyBtn.setAttribute("aria-selected", isToBuy ? "true" : "false");
  }
  renderInventoryList();
}

function renderInventoryList() {
  if (!inventoryListContainer) return;

  const boughtItems = inventoryItems.filter((item) => item.bought);
  const toBuyItems = inventoryItems.filter((item) => !item.bought);

  if (inventoryCountBoughtEl) {
    inventoryCountBoughtEl.textContent = String(boughtItems.length);
  }
  if (inventoryCountToBuyEl) {
    inventoryCountToBuyEl.textContent = String(toBuyItems.length);
  }

  inventoryListContainer.innerHTML = "";

  if (isLoadingInventory) {
    const loadingEl = document.createElement("div");
    loadingEl.className = "inventory-empty-state";
    loadingEl.textContent = "Loading inventory...";
    inventoryListContainer.appendChild(loadingEl);
    return;
  }

  const visibleItems = activeInventoryTab === "bought" ? boughtItems : toBuyItems;

  if (visibleItems.length === 0) {
    const emptyEl = document.createElement("div");
    emptyEl.className = "inventory-empty-state";

    const iconEl = document.createElement("div");
    iconEl.className = "inventory-empty-icon";
    iconEl.innerHTML = activeInventoryTab === "bought" ? '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>' : '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>';

    const textEl = document.createElement("div");
    textEl.textContent =
      activeInventoryTab === "bought"
        ? "No bought items yet. Tap + Inventory to add one."
        : "Nothing to buy right now. Tap + Inventory to add an item.";

    emptyEl.appendChild(iconEl);
    emptyEl.appendChild(textEl);
    inventoryListContainer.appendChild(emptyEl);
    return;
  }

  for (const item of visibleItems) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "inventory-item-card";
    card.addEventListener("click", () => {
      openInventoryForm(item);
    });

    const main = document.createElement("div");
    main.className = "inventory-item-main";

    const icon = document.createElement("span");
    icon.className = "inventory-item-icon";
    icon.innerHTML = item.bought ? '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>' : '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>';

    const name = document.createElement("span");
    name.className = "inventory-item-name";
    name.textContent = item.name;

    main.appendChild(icon);
    main.appendChild(name);

    const right = document.createElement("div");
    right.className = "inventory-item-right";

    const badge = document.createElement("span");
    badge.className = `inventory-item-badge ${item.bought ? "bought" : "to-buy"}`;
    badge.textContent = item.bought ? "Bought" : "To Buy";

    const chevron = document.createElement("span");
    chevron.className = "inventory-item-chevron";
    chevron.textContent = "›";

    right.appendChild(badge);
    right.appendChild(chevron);

    card.appendChild(main);
    card.appendChild(right);
    inventoryListContainer.appendChild(card);
  }
}

function openInventoryForm(item?: SpaceInventoryItem) {
  clearInventoryFeedback();
  if (item) {
    editingInventoryItemId = item.id;
    inventoryFormHeading?.classList.add("hidden");
    if (inventoryInputName) inventoryInputName.value = item.name;
    if (inventorySwitchBought) inventorySwitchBought.checked = item.bought;
    btnInventoryDelete?.classList.remove("hidden");
  } else {
    editingInventoryItemId = null;
    if (inventoryFormHeading) {
      inventoryFormHeading.textContent = "Add Inventory";
      inventoryFormHeading.classList.remove("hidden");
    }
    if (inventoryInputName) inventoryInputName.value = "";
    if (inventorySwitchBought) {
      inventorySwitchBought.checked = activeInventoryTab === "bought";
    }
    btnInventoryDelete?.classList.add("hidden");
  }
  updateInventoryBoughtDesc();
  showInventoryView("form");

  // Focus input cleanly on desktop; avoid aggressive auto-zoom on small touchscreens
  if (inventoryInputName && window.innerWidth > 600) {
    setTimeout(() => inventoryInputName.focus(), 30);
  }
}

function getInventoryTargetSpaceId(): string | null {
  if (activeInventorySpaceId) {
    return activeInventorySpaceId;
  }
  if (myPersonalSpace && currentSpaceId === myPersonalSpace.id) {
    return myPersonalSpace.id;
  }
  return currentSpaceId || myPersonalSpace?.id || null;
}

async function fetchSpaceInventory() {
  const spaceId = getInventoryTargetSpaceId();
  if (!spaceId || !authToken) return;

  isLoadingInventory = true;
  renderInventoryList();

  try {
    const res = await fetch(
      `/api/spaces/${encodeURIComponent(spaceId)}/inventory`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      },
    );
    const data = await res.json();
    if (!res.ok || !data.success) {
      showInventoryFeedback(
        data.error || "Failed to load space inventory.",
        true,
      );
      inventoryItems = [];
    } else {
      inventoryItems = Array.isArray(data.items) ? data.items : [];
    }
  } catch (err) {
    console.error("Error fetching space inventory:", err);
    showInventoryFeedback("Network error while loading inventory.", true);
  } finally {
    isLoadingInventory = false;
    renderInventoryList();
  }
}

async function saveInventoryItem() {
  if (isSavingInventory) return;
  const spaceId = getInventoryTargetSpaceId();
  if (!spaceId || !authToken) return;

  const name = (inventoryInputName?.value || "").trim();
  if (!name) {
    showInventoryFeedback("Please enter an inventory name.", true);
    inventoryInputName?.focus();
    return;
  }

  const bought = Boolean(inventorySwitchBought?.checked);
  isSavingInventory = true;
  if (btnInventorySave) {
    btnInventorySave.disabled = true;
    btnInventorySave.textContent = "Saving...";
  }
  clearInventoryFeedback();

  try {
    const isEdit = editingInventoryItemId !== null;
    const url = isEdit
      ? `/api/spaces/${encodeURIComponent(spaceId)}/inventory/${editingInventoryItemId}`
      : `/api/spaces/${encodeURIComponent(spaceId)}/inventory`;

    const res = await fetch(url, {
      method: isEdit ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ name, bought }),
    });
    const data = await res.json();
    if (!res.ok || !data.success || !data.item) {
      showInventoryFeedback(
        data.error || "Failed to save inventory item.",
        true,
      );
      return;
    }

    const savedItem: SpaceInventoryItem = data.item;
    if (isEdit) {
      const idx = inventoryItems.findIndex((i) => i.id === savedItem.id);
      if (idx !== -1) {
        inventoryItems[idx] = savedItem;
      } else {
        inventoryItems.unshift(savedItem);
      }
    } else {
      inventoryItems.unshift(savedItem);
    }

    setInventoryTab(savedItem.bought ? "bought" : "to-buy");
    showInventoryView("list");
    showInventoryFeedback(
      isEdit ? "Inventory item updated." : "Inventory item added.",
      false,
    );
  } catch (err) {
    console.error("Error saving space inventory item:", err);
    showInventoryFeedback("Network error while saving inventory item.", true);
  } finally {
    isSavingInventory = false;
    if (btnInventorySave) {
      btnInventorySave.disabled = false;
      btnInventorySave.textContent = "Save";
    }
  }
}

async function deleteCurrentInventoryItem() {
  if (isSavingInventory || editingInventoryItemId === null) return;
  const spaceId = getInventoryTargetSpaceId();
  if (!spaceId || !authToken) return;

  isSavingInventory = true;
  if (btnInventoryDelete) btnInventoryDelete.disabled = true;
  clearInventoryFeedback();

  try {
    const res = await fetch(
      `/api/spaces/${encodeURIComponent(spaceId)}/inventory/${editingInventoryItemId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      },
    );
    const data = await res.json();
    if (!res.ok || !data.success) {
      showInventoryFeedback(
        data.error || "Failed to delete inventory item.",
        true,
      );
      return;
    }

    inventoryItems = inventoryItems.filter(
      (i) => i.id !== editingInventoryItemId,
    );
    editingInventoryItemId = null;
    renderInventoryList();
    showInventoryView("list");
    showInventoryFeedback("Inventory item deleted.", false);
  } catch (err) {
    console.error("Error deleting space inventory item:", err);
    showInventoryFeedback("Network error while deleting inventory item.", true);
  } finally {
    isSavingInventory = false;
    if (btnInventoryDelete) btnInventoryDelete.disabled = false;
  }
}

async function openSpaceInventoryModal(spaceId?: string) {
  if (!spaceInventoryModal) return;
  if (!authToken || !currentUser) {
    alert("Please log in to view your space's inventory.");
    return;
  }
  activeInventorySpaceId = spaceId || null;
  clearInventoryFeedback();
  spaceInventoryModal.classList.remove("hidden");
  setGameControlsActive(false);
  showInventoryView("list");
  setInventoryTab(activeInventoryTab);
  await fetchSpaceInventory();
}

function closeSpaceInventoryModal() {
  if (!spaceInventoryModal) return;
  spaceInventoryModal.classList.add("hidden");
  setGameControlsActive(true);
}

function initSpaceInventoryUI() {
  btnCloseInventoryModal?.addEventListener("click", closeSpaceInventoryModal);
  spaceInventoryModal?.addEventListener("click", (e) => {
    if (e.target === spaceInventoryModal) {
      closeSpaceInventoryModal();
    }
  });

  btnNewInventory?.addEventListener("click", () => {
    openInventoryForm();
  });

  inventoryTabBoughtBtn?.addEventListener("click", () => {
    clearInventoryFeedback();
    setInventoryTab("bought");
  });

  inventoryTabToBuyBtn?.addEventListener("click", () => {
    clearInventoryFeedback();
    setInventoryTab("to-buy");
  });

  btnInventoryBack?.addEventListener("click", () => {
    clearInventoryFeedback();
    showInventoryView("list");
  });

  btnInventoryCancel?.addEventListener("click", () => {
    clearInventoryFeedback();
    showInventoryView("list");
  });

  inventorySwitchBought?.addEventListener("change", updateInventoryBoughtDesc);
  inventoryBoughtSwitchRow?.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    if (target.closest(".toggle-switch")) return;
    if (inventorySwitchBought) {
      inventorySwitchBought.checked = !inventorySwitchBought.checked;
      updateInventoryBoughtDesc();
    }
  });

  inventoryInputName?.addEventListener("keydown", (e) => {
    e.stopPropagation();
  });

  inventoryForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    saveInventoryItem();
  });

  btnInventoryDelete?.addEventListener("click", () => {
    deleteCurrentInventoryItem();
  });
}

// ==========================================
// Seller NPC Context Menu & Asset Shop Modal
// ==========================================

function populateSellerNpcMenuControls(state: SellerNpcState | null) {
  const nameInput = document.getElementById("editor-seller-name-input") as HTMLInputElement | null;
  const themeSelect = document.getElementById("editor-seller-theme-select") as HTMLSelectElement | null;
  const spriteSelect = document.getElementById("editor-seller-sprite-select") as HTMLSelectElement | null;
  const counterLabel = document.getElementById("editor-seller-counter-label");

  if (themeSelect && themeSelect.options.length === 0) {
    for (const opt of ASSET_SHOP_THEME_OPTIONS) {
      const option = document.createElement("option");
      option.value = opt.id;
      option.textContent = opt.label;
      themeSelect.appendChild(option);
    }
  }
  if (spriteSelect && spriteSelect.options.length === 0) {
    for (const opt of SELLER_NPC_SPRITE_OPTIONS) {
      const option = document.createElement("option");
      option.value = opt.key;
      option.textContent = opt.label;
      spriteSelect.appendChild(option);
    }
  }

  if (nameInput) nameInput.value = state?.name || "";
  if (themeSelect) themeSelect.value = state?.shopTheme || "auto";
  if (spriteSelect) spriteSelect.value = state?.spriteKey || "general_seller";
  if (counterLabel) {
    counterLabel.textContent = state?.showCounter !== false ? "Counter: ON" : "Counter: OFF";
  }
}

const ASSET_SHOP_PAGE_SIZE = 24;
let activeShopCatalog: SpaceShopResponse | null = null;
let activeShopSelectedGroupId: string = "all";
let activeShopUnboughtOnly: boolean = false;
let activeShopPage: number = 1;
let activeShopThumbObserver: IntersectionObserver | null = null;

const SHOP_SHORT_TITLES: Record<string, string> = {
  office: "Office",
  pet_shop: "Pet Shop",
  guild: "Adventure Guild",
  restaurant: "Restaurant",
  living_room: "Living Room",
  all: "Asset Shop",
  general: "Shop",
};

function showAssetShopFeedback(message: string, kind: "success" | "error") {
  const el = document.getElementById("asset-shop-feedback");
  if (!el) return;
  el.textContent = message;
  el.className = `asset-shop-feedback ${kind}`;
}

function clearAssetShopFeedback() {
  const el = document.getElementById("asset-shop-feedback");
  if (!el) return;
  el.textContent = "";
  el.className = "asset-shop-feedback hidden";
}

function getEffectiveOwnedAssetSet(): Set<string> {
  const owned = new Set<string>(activeShopCatalog?.ownedAssets || []);
  if (currentUser?.unlockedAssets) {
    for (const id of currentUser.unlockedAssets) {
      owned.add(id);
    }
  }
  return owned;
}

function renderAssetShopPagination(paginationEl: HTMLElement, totalPages: number) {
  paginationEl.innerHTML = "";
  if (totalPages <= 1) {
    paginationEl.classList.add("hidden");
    return;
  }
  paginationEl.classList.remove("hidden");

  const goToPage = (nextPage: number) => {
    const clamped = Math.max(1, Math.min(totalPages, nextPage));
    if (clamped === activeShopPage) return;
    activeShopPage = clamped;
    const bodyEl = document.getElementById("asset-shop-body");
    if (bodyEl) bodyEl.scrollTop = 0;
    renderAssetShopCatalogView();
  };

  const prevBtn = document.createElement("button");
  prevBtn.type = "button";
  prevBtn.className = "asset-shop-page-btn asset-shop-page-nav";
  prevBtn.textContent = "‹";
  prevBtn.setAttribute("aria-label", "Previous page");
  prevBtn.disabled = activeShopPage <= 1;
  prevBtn.addEventListener("click", () => goToPage(activeShopPage - 1));
  paginationEl.appendChild(prevBtn);

  const tokens: Array<number | "..."> = [];
  if (totalPages <= 7) {
    for (let p = 1; p <= totalPages; p++) tokens.push(p);
  } else {
    tokens.push(1);
    const start = Math.max(2, activeShopPage - 1);
    const end = Math.min(totalPages - 1, activeShopPage + 1);
    if (start > 2) tokens.push("...");
    for (let p = start; p <= end; p++) tokens.push(p);
    if (end < totalPages - 1) tokens.push("...");
    tokens.push(totalPages);
  }

  for (const tok of tokens) {
    if (tok === "...") {
      const dots = document.createElement("span");
      dots.className = "asset-shop-page-ellipsis";
      dots.textContent = "…";
      paginationEl.appendChild(dots);
    } else {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "asset-shop-page-btn" + (tok === activeShopPage ? " active" : "");
      btn.textContent = String(tok);
      btn.setAttribute("aria-label", `Page ${tok}`);
      if (tok === activeShopPage) btn.setAttribute("aria-current", "page");
      btn.addEventListener("click", () => goToPage(tok));
      paginationEl.appendChild(btn);
    }
  }

  const nextBtn = document.createElement("button");
  nextBtn.type = "button";
  nextBtn.className = "asset-shop-page-btn asset-shop-page-nav";
  nextBtn.textContent = "›";
  nextBtn.setAttribute("aria-label", "Next page");
  nextBtn.disabled = activeShopPage >= totalPages;
  nextBtn.addEventListener("click", () => goToPage(activeShopPage + 1));
  paginationEl.appendChild(nextBtn);
}

function renderAssetShopCatalogView() {
  const grid = document.getElementById("asset-shop-grid");
  const emptyEl = document.getElementById("asset-shop-empty");
  const paginationEl = document.getElementById("asset-shop-pagination");
  const fpEl = document.getElementById("asset-shop-fp-balance");
  const ownedCountEl = document.getElementById("asset-shop-owned-count");
  const packTabsEl = document.getElementById("asset-shop-pack-tabs");
  const adminBanner = document.getElementById("asset-shop-admin-banner");
  const hideOwnedBtn = document.getElementById("btn-asset-shop-hide-owned");

  if (!grid || !emptyEl || !paginationEl) return;

  const isSuperadmin =
    currentUser?.role === "superadmin" || Boolean(activeShopCatalog?.isSuperadmin);
  const ownedSet = getEffectiveOwnedAssetSet();
  const fpBalance = currentUser?.focusPoints ?? activeShopCatalog?.focusPoints ?? 0;

  if (fpEl) fpEl.textContent = `${fpBalance} FP`;
  if (adminBanner) adminBanner.classList.toggle("hidden", !isSuperadmin);
  if (hideOwnedBtn) {
    hideOwnedBtn.classList.toggle("active", activeShopUnboughtOnly);
    hideOwnedBtn.setAttribute("aria-pressed", String(activeShopUnboughtOnly));
  }

  const groups = activeShopCatalog?.groups || [];
  const allItems: SpaceShopCatalogItem[] = groups.flatMap((g) => g.items);
  const ownedTotal = isSuperadmin
    ? allItems.length
    : allItems.filter((item) => ownedSet.has(item.assetId)).length;

  if (ownedCountEl) {
    ownedCountEl.textContent = `${ownedTotal}/${allItems.length}`;
  }

  if (packTabsEl) {
    packTabsEl.innerHTML = "";
    if (groups.length > 1) {
      const allBtn = document.createElement("button");
      allBtn.type = "button";
      allBtn.className =
        "asset-shop-pack-tab-btn" + (activeShopSelectedGroupId === "all" ? " active" : "");
      allBtn.textContent = "All";
      allBtn.addEventListener("click", () => {
        activeShopSelectedGroupId = "all";
        activeShopPage = 1;
        const bodyEl = document.getElementById("asset-shop-body");
        if (bodyEl) bodyEl.scrollTop = 0;
        renderAssetShopCatalogView();
      });
      packTabsEl.appendChild(allBtn);

      for (const grp of groups) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className =
          "asset-shop-pack-tab-btn" + (activeShopSelectedGroupId === grp.id ? " active" : "");
        btn.textContent = grp.label;
        btn.addEventListener("click", () => {
          activeShopSelectedGroupId = grp.id;
          activeShopPage = 1;
          const bodyEl = document.getElementById("asset-shop-body");
          if (bodyEl) bodyEl.scrollTop = 0;
          renderAssetShopCatalogView();
        });
        packTabsEl.appendChild(btn);
      }
    }
  }

  if (allItems.length === 0) {
    grid.innerHTML = "";
    paginationEl.classList.add("hidden");
    emptyEl.classList.remove("hidden");
    emptyEl.innerHTML =
      "Base items here are free. Visit <strong>Office</strong>, <strong>Pet Shop</strong>, <strong>Adventure Guild</strong>, or <strong>Living Room</strong> to buy themed assets.";
    return;
  }

  const filtered = allItems.filter((item) => {
    if (activeShopSelectedGroupId !== "all" && item.groupId !== activeShopSelectedGroupId) {
      return false;
    }
    const isOwned = isSuperadmin || ownedSet.has(item.assetId);
    if (activeShopUnboughtOnly && isOwned) {
      return false;
    }
    return true;
  });

  grid.innerHTML = "";
  if (filtered.length === 0) {
    paginationEl.classList.add("hidden");
    emptyEl.classList.remove("hidden");
    emptyEl.textContent = activeShopUnboughtOnly
      ? "All matching assets owned!"
      : "No items.";
    return;
  }

  emptyEl.classList.add("hidden");

  const totalPages = Math.max(1, Math.ceil(filtered.length / ASSET_SHOP_PAGE_SIZE));
  activeShopPage = Math.max(1, Math.min(totalPages, activeShopPage));

  if (!activeShopThumbObserver && typeof IntersectionObserver !== "undefined") {
    activeShopThumbObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const img = entry.target as HTMLImageElement;
          const assetId = img.dataset.shopThumbId;
          if (!assetId) continue;
          activeShopThumbObserver?.unobserve(img);
          void resolveAssetThumbnailUrl(assetId).then((url) => {
            if (url) img.src = url;
          });
        }
      },
      { root: document.getElementById("asset-shop-body"), rootMargin: "140px" }
    );
  }

  const startIdx = (activeShopPage - 1) * ASSET_SHOP_PAGE_SIZE;
  const visibleSlice = filtered.slice(startIdx, startIdx + ASSET_SHOP_PAGE_SIZE);
  const fragment = document.createDocumentFragment();

  for (const item of visibleSlice) {
    const isOwned = isSuperadmin || ownedSet.has(item.assetId);

    const card = document.createElement("div");
    card.className = `asset-shop-card${isOwned ? " owned" : ""}`;

    const thumbBox = document.createElement("div");
    thumbBox.className = "asset-shop-thumb-box";

    const img = document.createElement("img");
    img.className = "asset-shop-thumb-img";
    img.alt = "";
    img.dataset.shopThumbId = item.assetId;
    if (activeShopThumbObserver) {
      activeShopThumbObserver.observe(img);
    } else {
      void resolveAssetThumbnailUrl(item.assetId).then((url) => {
        if (url) img.src = url;
      });
    }
    thumbBox.appendChild(img);

    const actionWrap = document.createElement("div");
    actionWrap.className = "asset-shop-card-action";

    if (isOwned) {
      const badge = document.createElement("div");
      badge.className = "asset-shop-owned-badge";
      badge.textContent = "✓";
      badge.setAttribute("aria-label", "Owned");
      actionWrap.appendChild(badge);
    } else {
      const buyBtn = document.createElement("button");
      buyBtn.type = "button";
      buyBtn.className = "asset-shop-buy-btn";
      buyBtn.textContent = `${item.cost} FP`;
      buyBtn.addEventListener("click", () => {
        void handleBuyAssetFromShop(item, buyBtn);
      });
      actionWrap.appendChild(buyBtn);
    }

    card.append(thumbBox, actionWrap);
    fragment.appendChild(card);
  }

  grid.appendChild(fragment);
  renderAssetShopPagination(paginationEl, totalPages);
}

async function handleBuyAssetFromShop(
  item: SpaceShopCatalogItem,
  btn: HTMLButtonElement
) {
  if (!currentUser || !authToken) {
    showAssetShopFeedback(
      "Sign in to buy assets.",
      "error"
    );
    return;
  }

  const currentPoints = currentUser.focusPoints ?? 0;
  if (currentPoints < item.cost) {
    showAssetShopFeedback(
      `Need ${item.cost} FP (${currentPoints} FP available).`,
      "error"
    );
    return;
  }

  btn.disabled = true;
  btn.textContent = "...";

  try {
    const res = await fetch(getApiUrl("/api/assets/unlock"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        assetId: item.assetId,
        spaceId: currentSpaceId,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      showAssetShopFeedback(data.error || "Purchase failed.", "error");
      btn.disabled = false;
      btn.textContent = `${item.cost} FP`;
      return;
    }

    const newPoints =
      typeof data.points === "number" ? data.points : currentPoints - item.cost;
    const unlockedAssets: string[] = Array.isArray(data.unlockedAssets)
      ? data.unlockedAssets
      : [...(currentUser.unlockedAssets || []), item.assetId];

    currentUser.focusPoints = newPoints;
    currentUser.unlockedAssets = unlockedAssets;
    try {
      localStorage.setItem("lepark_auth_user", JSON.stringify(currentUser));
    } catch {}

    if (activeShopCatalog) {
      activeShopCatalog.focusPoints = newPoints;
      activeShopCatalog.ownedAssets = Array.from(
        new Set([...(activeShopCatalog.ownedAssets || []), item.assetId])
      );
    }

    updateFocusPointsDisplay(newPoints);
    focusUiController?.syncUserAuth(currentUser);
    updateEditorAssetGroupVisibility();
    showAssetShopFeedback(`Purchased for ${item.cost} FP`, "success");
    renderAssetShopCatalogView();
  } catch (err) {
    console.error("Asset shop purchase error:", err);
    showAssetShopFeedback("Network error.", "error");
    btn.disabled = false;
    btn.textContent = `${item.cost} FP`;
  }
}

async function openAssetShopModal(_sellerNpcOverride?: SellerNpcState | null) {
  const modalEl = document.getElementById("asset-shop-modal");
  if (!modalEl) return;

  const titleEl = document.getElementById("asset-shop-modal-title");

  clearAssetShopFeedback();
  activeShopSelectedGroupId = "all";
  activeShopUnboughtOnly = false;
  activeShopPage = 1;

  if (titleEl) {
    titleEl.textContent = "Shop";
  }

  modalEl.classList.remove("hidden");
  const bodyEl = document.getElementById("asset-shop-body");
  if (bodyEl) bodyEl.scrollTop = 0;
  setGameControlsActive(false);

  const spaceId = currentSpaceId || "space_central_plaza";
  try {
    const headers: Record<string, string> = {};
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }
    const res = await fetch(getApiUrl(`/api/spaces/${encodeURIComponent(spaceId)}/shop`), {
      headers,
    });
    const data = (await res.json()) as SpaceShopResponse;
    if (!res.ok || !data.success) {
      showAssetShopFeedback(data.error || "Failed to load shop.", "error");
      return;
    }

    activeShopCatalog = data;
    if (titleEl) {
      titleEl.textContent =
        SHOP_SHORT_TITLES[data.resolvedTheme || "general"] || "Shop";
    }
    renderAssetShopCatalogView();
  } catch (err) {
    console.error("Failed to load space shop:", err);
    showAssetShopFeedback("Network error.", "error");
  }
}

function closeAssetShopModal() {
  const modalEl = document.getElementById("asset-shop-modal");
  if (!modalEl) return;
  modalEl.classList.add("hidden");
  if (activeShopThumbObserver) {
    activeShopThumbObserver.disconnect();
    activeShopThumbObserver = null;
  }
  setGameControlsActive(true);
}

function initAssetShopUI() {
  const modalEl = document.getElementById("asset-shop-modal");
  const closeBtn = document.getElementById("btn-close-asset-shop-modal");
  const hideOwnedBtn = document.getElementById("btn-asset-shop-hide-owned");

  closeBtn?.addEventListener("click", closeAssetShopModal);
  modalEl?.addEventListener("click", (e) => {
    if (e.target === modalEl) {
      closeAssetShopModal();
    }
  });

  hideOwnedBtn?.addEventListener("click", () => {
    activeShopUnboughtOnly = !activeShopUnboughtOnly;
    activeShopPage = 1;
    const bodyEl = document.getElementById("asset-shop-body");
    if (bodyEl) bodyEl.scrollTop = 0;
    renderAssetShopCatalogView();
  });

  // Bind Seller NPC Cursor Context Menu controls (Superadmin only)
  const sellerNameInput = document.getElementById(
    "editor-seller-name-input"
  ) as HTMLInputElement | null;
  const btnSaveSellerName = document.getElementById("btn-editor-seller-save-name");
  const sellerThemeSelect = document.getElementById(
    "editor-seller-theme-select"
  ) as HTMLSelectElement | null;
  const sellerSpriteSelect = document.getElementById(
    "editor-seller-sprite-select"
  ) as HTMLSelectElement | null;
  const btnCounterToggle = document.getElementById("btn-editor-seller-counter-toggle");

  const saveSellerName = () => {
    if (!sellerNameInput) return;
    const nextName = sellerNameInput.value.trim();
    multiplayer?.updateSellerNpc({ name: nextName });
    const nameEl = document.getElementById("editor-item-menu-name");
    if (nameEl) nameEl.textContent = nextName || "Seller NPC";
    showPlacingToast(nextName ? `Seller NPC renamed to ${nextName}` : "Seller NPC name reset to theme default");
  };

  sellerNameInput?.addEventListener("click", (e) => e.stopPropagation());
  sellerNameInput?.addEventListener("keydown", (e) => {
    e.stopPropagation();
    if (e.key === "Enter") {
      e.preventDefault();
      saveSellerName();
    }
  });
  btnSaveSellerName?.addEventListener("click", (e) => {
    e.stopPropagation();
    saveSellerName();
  });

  sellerThemeSelect?.addEventListener("click", (e) => e.stopPropagation());
  sellerThemeSelect?.addEventListener("change", (e) => {
    e.stopPropagation();
    const nextTheme = sellerThemeSelect.value as AssetShopTheme;
    multiplayer?.updateSellerNpc({ shopTheme: nextTheme });
    showPlacingToast(`Seller NPC catalog updated`);
  });

  sellerSpriteSelect?.addEventListener("click", (e) => e.stopPropagation());
  sellerSpriteSelect?.addEventListener("change", (e) => {
    e.stopPropagation();
    const nextSprite = sellerSpriteSelect.value as SellerNpcSpriteKey;
    multiplayer?.updateSellerNpc({ spriteKey: nextSprite });
    showPlacingToast(`Seller NPC outfit updated`);
  });

  btnCounterToggle?.addEventListener("click", (e) => {
    e.stopPropagation();
    const scene = gameInstance?.scene?.getScene("GameScene") as GameScene | undefined;
    const state = scene?.getSellerNpcState();
    const nextShow = !(state?.showCounter !== false);
    multiplayer?.updateSellerNpc({ showCounter: nextShow });
    const label = document.getElementById("editor-seller-counter-label");
    if (label) label.textContent = nextShow ? "Counter: ON" : "Counter: OFF";
    showPlacingToast(nextShow ? "Shop counter shown" : "Shop counter hidden");
  });
}

ensureFocusUiController();
init();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("Service worker registration failed:", err);
    });
  });
}
