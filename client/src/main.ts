import Phaser from "phaser";
import { MultiplayerManager } from "./network/MultiplayerManager";
import { GameScene } from "./scenes/GameScene";
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
} from "shared";
import { VoiceManager, VoiceError } from "./network/VoiceManager";

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
const chatTabMap = document.getElementById("chat-tab-map") as HTMLButtonElement | null;
const chatTabZone = document.getElementById("chat-tab-zone") as HTMLButtonElement | null;
const chatTabMapName = document.getElementById("chat-tab-map-name");
const chatTabZoneName = document.getElementById("chat-tab-zone-name");
const chatMapBadge = document.getElementById("chat-map-badge");
const chatZoneBadge = document.getElementById("chat-zone-badge");
const chatChannelBanner = document.getElementById("chat-channel-banner");
const chatChannelDesc = document.getElementById("chat-channel-desc");
const chatActiveChannelLabel = document.getElementById("chat-active-channel-label");
const chatMessagesContainer = document.getElementById("chat-messages-container");
const chatMessagesList = document.getElementById("chat-messages-list");
const chatInputForm = document.getElementById("chat-input-form") as HTMLFormElement | null;
const chatInputField = document.getElementById("chat-input-field") as HTMLInputElement | null;

let isChatOpen = true; // Default open as requested
let activeChatRoom: "map" | "zone" = "map";
let currentInsideZone: PrivateZone | null = null;
const chatMessagesMap: ChatMessage[] = [];
const chatMessagesZone = new Map<string, ChatMessage[]>();
let unreadMapCount = 0;
const unreadZoneCount = new Map<string, number>();
let totalClosedUnreadCount = 0;

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

// Application State
let currentUser: AuthUser | null = null;
let authToken: string | null = null;
let selectedColor = DEFAULT_PRESET_COLORS[0]; // Lepark Slate Teal default
let gameInstance: Phaser.Game | null = null;
let multiplayer: MultiplayerManager | null = null;
let activePreviewDir: DirectionSlot = "idle";

// Spaces & Categories State
let currentSpaceId = "space_central_plaza";
let currentSpaceName = "Central Plaza";
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
  const host = window.location.hostname || "localhost";
  const isRemoteAccess = host !== "localhost" && host !== "127.0.0.1";
  const isStaleCrossDomain =
    envUrl &&
    typeof envUrl === "string" &&
    isRemoteAccess &&
    !envUrl.includes(host);

  if (envUrl && typeof envUrl === "string" && envUrl.trim().length > 0 && !isStaleCrossDomain) {
    const base = envUrl.trim().replace(/\/+$/, "");
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${base}${cleanPath}`;
  }
  if (window.location.protocol === "http:" && (host === "localhost" || host === "127.0.0.1")) {
    return `http://${host}:2567${path}`;
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
    // Default male avatar preview (animating walk cycles for directions, still for idle)
    const defaultFrames =
      DEFAULT_AVATARS[activePreviewDir] || DEFAULT_AVATARS.idle;
    const currentImg = defaultFrames[previewFrameIndex % defaultFrames.length];
    previewAvatar.src = currentImg;

    if (activePreviewDir === "idle") {
      previewStatusHint.textContent = "Default male character (standing still)";
    } else {
      previewStatusHint.textContent = `Default male character (${activePreviewDir} walk)`;
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
let currentSelectedAssetId = "birch_floor_150";
let currentSelectedAssetName = "Birch Floor";
let currentSelectedTileColor: string | null = null; // null = original/no tint

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
      swatch.title = "Original (No tint)";
      if (currentSelectedTileColor === null) {
        swatch.classList.add("selected");
      }
    } else {
      swatch.style.backgroundColor = preset.hex;
      swatch.title = `${preset.name} (${preset.hex})`;
      swatch.setAttribute("data-color", preset.hex);
      if (
        currentSelectedTileColor?.toLowerCase() === preset.hex.toLowerCase()
      ) {
        swatch.classList.add("selected");
      }
    }

    swatch.addEventListener("click", () => {
      selectTileColor(preset.hex);
    });

    editorColorPalette.appendChild(swatch);
  });

  if (editorTileColorInput) {
    editorTileColorInput.addEventListener("input", (e) => {
      const val = (e.target as HTMLInputElement).value;
      selectTileColor(val);
    });
  }

  if (editorTileHexInput) {
    editorTileHexInput.addEventListener("input", (e) => {
      let raw = (e.target as HTMLInputElement).value.trim().replace("#", "");
      if (raw.length === 6 && /^[0-9a-fA-F]{6}$/.test(raw)) {
        const hex = `#${raw}`;
        selectTileColor(hex);
      }
    });
  }

  if (btnResetTileColor) {
    btnResetTileColor.addEventListener("click", () => {
      selectTileColor(null);
    });
  }
}

function selectTileColor(colorHex: string | null) {
  currentSelectedTileColor = colorHex;

  if (colorHex) {
    if (editorTileColorInput) editorTileColorInput.value = colorHex;
    if (editorTileHexInput)
      editorTileHexInput.value = colorHex.replace("#", "").toUpperCase();
    if (editorColorCircle) editorColorCircle.style.backgroundColor = colorHex;
  }

  // Update palette swatches active class
  document.querySelectorAll(".editor-palette-swatch").forEach((el) => {
    const swatchColor = el.getAttribute("data-color");
    if (!colorHex && el.classList.contains("swatch-none")) {
      el.classList.add("selected");
    } else if (
      colorHex &&
      swatchColor &&
      swatchColor.toLowerCase() === colorHex.toLowerCase()
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
      scene.setSelectedColor(colorHex);
    }
  }
}

function updateBrushPreview() {
  if (brushHeadline) {
    brushHeadline.textContent = currentSelectedAssetName;
  }

  if (brushColorText) {
    if (currentSelectedTileColor) {
      brushColorText.textContent = currentSelectedTileColor.toUpperCase();
    } else {
      brushColorText.textContent = "Original (No Tint)";
    }
  }

  if (brushDot) {
    if (currentSelectedTileColor) {
      brushDot.style.display = "inline-block";
      brushDot.style.backgroundColor = currentSelectedTileColor;
      brushDot.style.boxShadow = `0 0 6px ${currentSelectedTileColor}`;
    } else {
      brushDot.style.display = "none";
    }
  }

  if (brushTintLayer) {
    if (currentSelectedTileColor) {
      brushTintLayer.style.backgroundColor = currentSelectedTileColor;
      brushTintLayer.style.opacity = "0.75";
    } else {
      brushTintLayer.style.opacity = "0";
    }
  }

  if (brushPatternLayer) {
    if (currentSelectedAssetId === "birch_floor_150") {
      brushPatternLayer.style.backgroundImage =
        'url("/assets/birch_floor_150.png")';
      brushPatternLayer.style.backgroundColor = "transparent";
    } else if (currentSelectedAssetId === "grass_150") {
      brushPatternLayer.style.backgroundImage = 'url("/assets/grass_150.png")';
      brushPatternLayer.style.backgroundColor = "transparent";
    } else if (currentSelectedAssetId === "table_left_150") {
      brushPatternLayer.style.backgroundImage =
        'url("/assets/table_left_150.png")';
      brushPatternLayer.style.backgroundColor = "transparent";
    } else if (currentSelectedAssetId === "wall_half_150") {
      brushPatternLayer.style.backgroundImage =
        'url("/assets/wall_half_150.png")';
      brushPatternLayer.style.backgroundColor = "transparent";
    } else if (currentSelectedAssetId === "wall_top_150") {
      brushPatternLayer.style.backgroundImage =
        'url("/assets/wall_top_150.png")';
      brushPatternLayer.style.backgroundColor = "transparent";
    } else {
      // Plain tile
      brushPatternLayer.style.backgroundImage = "none";
      brushPatternLayer.style.backgroundColor = "#ffffff";
    }
  }

  if (plainTilePreviewSquare) {
    if (currentSelectedTileColor) {
      plainTilePreviewSquare.style.backgroundColor = currentSelectedTileColor;
    } else {
      plainTilePreviewSquare.style.backgroundColor = "#ffffff";
    }
  }
}

let activeEditorTool:
  | "flooring"
  | "decoration"
  | "clear_decoration"
  | "private_zone"
  | "clear_private_zone"
  | "obstacle"
  | "clear_obstacle" = "flooring";

function updateEditBannerText() {
  if (!editBannerAssetText) return;

  if (activeEditorTool === "private_zone") {
    editBannerAssetText.innerHTML = `<span class="banner-private-tag">🔒 Flag Private Area</span> Active: <strong>Private Tile Flagging</strong> • <em>Drag area on map to mark</em>`;
    return;
  }
  if (activeEditorTool === "clear_private_zone") {
    editBannerAssetText.innerHTML = `<span class="banner-clear-tag">✕ Clear Private</span> Active: <strong>Remove Private Area</strong> • <em>Drag area on map to clear</em>`;
    return;
  }
  if (activeEditorTool === "obstacle") {
    editBannerAssetText.innerHTML = `<span class="banner-obstacle-tag">🚫 Obstacle</span> Active: <strong>Obstacle Tile (Impassable)</strong> • <em>Drag area to place barrier (highlighted only in edit mode)</em>`;
    return;
  }
  if (activeEditorTool === "clear_obstacle") {
    editBannerAssetText.innerHTML = `<span class="banner-clear-tag">✕ Clear Obstacle</span> Active: <strong>Remove Obstacle</strong> • <em>Drag area on map to clear barrier</em>`;
    return;
  }
  if (activeEditorTool === "clear_decoration") {
    editBannerAssetText.innerHTML = `<span class="banner-clear-tag">✕ Clear Deco</span> Active: <strong>Remove Decoration</strong> • <em>Drag area on map to remove decoration layer</em>`;
    return;
  }
  if (activeEditorTool === "decoration") {
    const colorMarkup = currentSelectedTileColor
      ? `<span class="banner-color-indicator" style="background:${currentSelectedTileColor};"></span><strong>${currentSelectedTileColor.toUpperCase()}</strong>`
      : `<em>(No Tint)</em>`;
    editBannerAssetText.innerHTML = `<span class="banner-deco-tag">🪴 Decoration</span> Active: <strong>${currentSelectedAssetName}</strong> • <em>Places on top of tile</em> • Color: ${colorMarkup}`;
    return;
  }

  const isWall =
    currentSelectedAssetId === "wall_half_150" ||
    currentSelectedAssetId === "wall_top_150";
  const wallTag = isWall
    ? `<span class="banner-wall-tag">🧱 Wall + Obstacle</span> `
    : "";
  const colorMarkup = currentSelectedTileColor
    ? `<span class="banner-color-indicator" style="background:${currentSelectedTileColor};"></span><strong>${currentSelectedTileColor.toUpperCase()}</strong>`
    : `<em>(No Tint)</em>`;
  editBannerAssetText.innerHTML = `${wallTag}Active: <strong>${currentSelectedAssetName}</strong> • Color: ${colorMarkup}`;
}

function enterEditMode() {
  if (!canChangeCurrentSpaceSettings()) {
    alert("You do not have permission to edit this space's map.");
    return;
  }
  isEditModeActive = true;
  document.body.classList.add("edit-mode-active");

  if (mapEditorSidebar) mapEditorSidebar.classList.remove("hidden");
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
      scene.setEditMode(true);
      scene.setActiveEditorTool(activeEditorTool);
      scene.setSelectedAsset(currentSelectedAssetId);
      scene.setSelectedColor(currentSelectedTileColor);
    }
  }

  updateBrushPreview();
  updateEditBannerText();
}

function exitEditMode() {
  if (!isEditModeActive) return;
  isEditModeActive = false;
  document.body.classList.remove("edit-mode-active");

  if (mapEditorSidebar) mapEditorSidebar.classList.add("hidden");
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
    }
  }
}

function selectDecorationAsset(assetId: string, assetName: string) {
  activeEditorTool = "decoration";
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
      scene.setActiveEditorTool("decoration");
      scene.setSelectedAsset(assetId);
    }
  }
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
}

function selectObstacleTool(toolType: "obstacle" | "clear_obstacle") {
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

function switchChatTab(target: "map" | "zone") {
  if (target === "zone" && !currentInsideZone) {
    target = "map";
  }
  activeChatRoom = target;

  if (target === "map") {
    chatTabMap?.classList.add("active");
    chatTabMap?.setAttribute("aria-selected", "true");
    chatTabZone?.classList.remove("active");
    chatTabZone?.setAttribute("aria-selected", "false");

    unreadMapCount = 0;
    chatMapBadge?.classList.add("hidden");

    if (chatChannelBanner) chatChannelBanner.classList.remove("private");
    if (chatChannelDesc) chatChannelDesc.textContent = "Area chat • visible to all in this map";
    if (chatActiveChannelLabel) chatActiveChannelLabel.textContent = "Area Channel";
    if (chatInputField) chatInputField.placeholder = `Message #${currentSpaceName}...`;
  } else {
    chatTabZone?.classList.add("active");
    chatTabZone?.setAttribute("aria-selected", "true");
    chatTabMap?.classList.remove("active");
    chatTabMap?.setAttribute("aria-selected", "false");

    const zoneId = currentInsideZone?.id || "";
    unreadZoneCount.set(zoneId, 0);
    chatZoneBadge?.classList.add("hidden");

    const zoneName = currentInsideZone?.name || "Private Area";
    if (chatChannelBanner) chatChannelBanner.classList.add("private");
    if (chatChannelDesc) {
      chatChannelDesc.textContent = `🔒 Private Area • Only players inside "${zoneName}" can see messages`;
    }
    if (chatActiveChannelLabel) chatActiveChannelLabel.textContent = zoneName;
    if (chatInputField) chatInputField.placeholder = `Message #${zoneName} (Private)...`;
  }

  renderCurrentChatMessages();
}

function renderCurrentChatMessages() {
  if (!chatMessagesList) return;
  chatMessagesList.innerHTML = "";

  const messagesToRender =
    activeChatRoom === "map"
      ? chatMessagesMap
      : currentInsideZone
      ? chatMessagesZone.get(currentInsideZone.id) || []
      : [];

  if (messagesToRender.length === 0) {
    const welcome = document.createElement("div");
    welcome.className = "chat-welcome-notice";
    const title =
      activeChatRoom === "map"
        ? `Welcome to ${escapeHtml(currentSpaceName)}!`
        : `Welcome to ${escapeHtml(currentInsideZone?.name || "Private Area")}!`;
    const sub =
      activeChatRoom === "map"
        ? "Talk to everyone exploring this space."
        : "This is an isolated private channel. Only players currently inside this area can read or send messages.";
    welcome.innerHTML = `
      <div class="chat-welcome-icon">${activeChatRoom === "map" ? "🗺️" : "🔒"}</div>
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
  item.className = `chat-msg-item${isOwn ? " own" : ""}${msg.roomType === "zone" ? " zone-msg" : ""}`;

  const timeStr = new Date(msg.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const crownHtml = msg.isSuperadmin ? `<span class="chat-msg-crown" title="Superadmin">👑</span>` : "";
  const zoneTagHtml =
    msg.roomType === "zone"
      ? `<span class="chat-msg-tag-zone">🔒 ${escapeHtml(msg.roomName)}</span>`
      : "";

  item.innerHTML = `
    <div class="chat-msg-header">
      <span class="chat-msg-author-dot" style="background-color: ${escapeHtml(msg.senderColor || "#3b82f6")};"></span>
      <span class="chat-msg-author">${crownHtml}${escapeHtml(msg.senderName)}</span>
      ${zoneTagHtml}
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
      (scene as any).showSpeechBubble(msg.senderId, msg.text);
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

function setupMultiplayerChatListeners(mgr: MultiplayerManager) {
  mgr.onChatMessage((msg: ChatMessage) => {
    handleIncomingChatMessage(msg);
  });
}

function isAnyModalOpen(): boolean {
  if (authModal && !authModal.classList.contains("hidden")) return true;
  if (mapModal && !mapModal.classList.contains("hidden")) return true;
  if (modal && !modal.classList.contains("hidden")) return true;
  if (mySpaceSettingsModal && !mySpaceSettingsModal.classList.contains("hidden")) return true;
  if (adminSpaceModal && !adminSpaceModal.classList.contains("hidden")) return true;
  if (privateZoneNameModal && !privateZoneNameModal.classList.contains("hidden")) return true;
  if (isEditModeActive) return true;
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

if (chatInputForm) {
  chatInputForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!chatInputField || !multiplayer) return;
    const text = chatInputField.value.trim();
    if (!text) return;

    if (activeChatRoom === "zone") {
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

// User-gesture audio unlocker on window interaction
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
      if (hud) hud.classList.remove("hidden");
    } else {
      if (hud) hud.classList.add("hidden");
    }
    handleChatZoneChange(zone);
  });

  scene.onPrivateZonesListChange((zones) => {
    renderEditorZonesList(zones);
  });

  scene.onRequestNameForNewZone = (bounds, defaultName) => {
    openPrivateZoneNameModal("create", { bounds, defaultName });
  };
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

window.addEventListener("keydown", (e) => {
  if (
    e.key === "Escape" &&
    privateZoneNameModal &&
    !privateZoneNameModal.classList.contains("hidden")
  ) {
    closePrivateZoneNameModal();
  }
});

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
    if (toolType === "private_zone" || toolType === "clear_private_zone") {
      selectPrivateTool(toolType);
    } else if (toolType === "obstacle" || toolType === "clear_obstacle") {
      selectObstacleTool(toolType);
    } else if (toolType === "clear_decoration") {
      selectClearDecorationTool();
    } else {
      const id = card.dataset.assetId || "birch_floor_150";
      const name = card.dataset.assetName || "Birch Floor";
      const tileType = card.dataset.tileType;
      if (tileType === "decoration") {
        selectDecorationAsset(id, name);
      } else {
        selectEditorAsset(id, name);
      }
    }
  });
});

window.addEventListener("keydown", (e: KeyboardEvent) => {
  if (e.key === "Escape") {
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
      exitEditMode();
      return;
    }
  }

  // Pressing Enter when not in an active input or modal focuses chat
  if (
    e.key === "Enter" &&
    document.activeElement !== chatInputField &&
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
  const topbarImgUrl = isCustomActive ? uploadedFrames.idle[0] : "/assets/man_still.png";
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
async function switchSpace(newSpaceId: string, newSpaceName: string) {
  if (currentSpaceId === newSpaceId) return;

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
    alert(
      err?.message ||
        "Failed to join space. It might be private or require invitation.",
    );
    // Fall back to default Central Plaza if access denied
    if (currentSpaceId !== "space_central_plaza") {
      switchSpace("space_central_plaza", "Central Plaza");
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
        switchSpace("space_central_plaza", "Central Plaza");
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
    });

    // Hook up private zone events once scene is loaded
    const bindSceneEvents = () => {
      if (gameInstance) {
        const scene = gameInstance.scene.getScene("GameScene") as GameScene;
        if (scene) {
          if (voiceManager) {
            scene.voiceManager = voiceManager;
          }
          setupScenePrivateZoneEvents(scene);
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
