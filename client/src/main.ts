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
} from "shared";

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
const tabRegister = document.getElementById("tab-register") as HTMLButtonElement;
const loginForm = document.getElementById("login-form") as HTMLFormElement;
const registerForm = document.getElementById("register-form") as HTMLFormElement;
const loginUsernameInput = document.getElementById("login-username") as HTMLInputElement;
const loginPasswordInput = document.getElementById("login-password") as HTMLInputElement;
const regUsernameInput = document.getElementById("reg-username") as HTMLInputElement;
const regDisplayNameInput = document.getElementById("reg-display-name") as HTMLInputElement;
const regPasswordInput = document.getElementById("reg-password") as HTMLInputElement;
const regConfirmPasswordInput = document.getElementById("reg-confirm-password") as HTMLInputElement;
const btnSubmitLogin = document.getElementById("btn-submit-login") as HTMLButtonElement;
const btnSubmitRegister = document.getElementById("btn-submit-register") as HTMLButtonElement;
const authAlert = document.getElementById("auth-alert") as HTMLDivElement;
const authAlertMsg = document.getElementById("auth-alert-msg") as HTMLSpanElement;
const linkGoRegister = document.getElementById("link-go-register") as HTMLButtonElement;
const linkGoLogin = document.getElementById("link-go-login") as HTMLButtonElement;

// DOM Elements - Middle Top Bar & Profile Dropdown
const topbarProfileTrigger = document.getElementById("topbar-profile-trigger") as HTMLDivElement;
const topbarAvatarDot = document.getElementById("topbar-avatar-dot") as HTMLDivElement;
const topbarAvatarImg = document.getElementById("topbar-avatar-img") as HTMLImageElement;
const topbarStatusDot = document.getElementById("topbar-status-dot") as HTMLSpanElement;
const topbarAdminCrown = document.getElementById("topbar-admin-crown") as HTMLSpanElement;
const topbarUserName = document.getElementById("topbar-user-name") as HTMLSpanElement;
const topbarStatusSubtitle = document.getElementById("topbar-status-subtitle") as HTMLSpanElement;

// User Profile Dropdown
const userProfileDropdown = document.getElementById("user-profile-dropdown") as HTMLDivElement;
const dropdownMySpaceBtn = document.getElementById("dropdown-my-space-btn") as HTMLButtonElement;
const dropdownMySpaceSub = document.getElementById("dropdown-my-space-sub") as HTMLSpanElement;
const dropdownUpdateCharBtn = document.getElementById("dropdown-update-char-btn") as HTMLButtonElement;
const dropdownLogoutBtn = document.getElementById("dropdown-logout-btn") as HTMLButtonElement;

// Top-Left Map Settings Button
const btnMapSettings = document.getElementById("btn-map-settings") as HTMLButtonElement;

// Top Bar Right Actions (Map, Ping, Loss)
const btnOpenMap = document.getElementById("btn-open-map") as HTMLButtonElement;
const topbarPingStat = document.getElementById("topbar-ping-stat") as HTMLSpanElement;
const topbarLossStat = document.getElementById("topbar-loss-stat") as HTMLSpanElement;

// DOM Elements - Map Modal (Grid of 4)
const mapModal = document.getElementById("map-modal") as HTMLDivElement;
const mapCurrentSpaceName = document.getElementById("map-current-space-name") as HTMLElement;
const btnAdminAddSpace = document.getElementById("btn-admin-add-space") as HTMLButtonElement;
const btnCloseMapModal = document.getElementById("btn-close-map-modal") as HTMLButtonElement;
const mapCategoryTabs = document.getElementById("map-category-tabs") as HTMLElement;
const mapSpacesGrid = document.getElementById("map-spaces-grid") as HTMLElement;

// DOM Elements - Update Character Modal
const modal = document.getElementById("onboarding-modal") as HTMLDivElement;
const btnCloseModal = document.getElementById("btn-close-modal") as HTMLButtonElement;
const profileForm = document.getElementById("profile-form") as HTMLFormElement;
const nameInput = document.getElementById("player-name") as HTMLInputElement;
const currentUsernameTag = document.getElementById("current-username-tag") as HTMLSpanElement;
const customColorInput = document.getElementById("custom-color-picker") as HTMLInputElement;
const colorGrid = document.getElementById("color-grid") as HTMLDivElement;
const previewDot = document.getElementById("preview-dot") as HTMLDivElement;
const previewAvatar = document.getElementById("preview-avatar") as HTMLImageElement;
const previewDirectionsBar = document.getElementById("preview-directions-bar") as HTMLDivElement;
const previewStatusHint = document.getElementById("preview-status-hint") as HTMLDivElement;
const previewName = document.getElementById("preview-name") as HTMLDivElement;
const btnJoin = document.getElementById("btn-join") as HTMLButtonElement;

// Switch and Sections for Custom Sprites
const switchUploadPictures = document.getElementById("switch-upload-pictures") as HTMLInputElement;
const dotInputSection = document.getElementById("dot-input-section") as HTMLDivElement;
const uploadPicturesSection = document.getElementById("upload-pictures-section") as HTMLDivElement;

// DOM Elements - My Space Settings Modal
const mySpaceSettingsModal = document.getElementById("my-space-settings-modal") as HTMLDivElement;
const btnCloseMySpaceSettings = document.getElementById("btn-close-my-space-settings") as HTMLButtonElement;
const mySpaceSettingsForm = document.getElementById("my-space-settings-form") as HTMLFormElement;
const mySpaceInputName = document.getElementById("my-space-input-name") as HTMLInputElement;
const mySpaceSwitchPublic = document.getElementById("my-space-switch-public") as HTMLInputElement;
const mySpaceWhitelistSection = document.getElementById("my-space-whitelist-section") as HTMLDivElement;
const mySpaceInviteUsername = document.getElementById("my-space-invite-username") as HTMLInputElement;
const btnAddMySpaceInvite = document.getElementById("btn-add-my-space-invite") as HTMLButtonElement;
const mySpaceTagsCount = document.getElementById("my-space-tags-count") as HTMLElement;
const mySpaceTagsContainer = document.getElementById("my-space-tags-container") as HTMLElement;

// DOM Elements - Superadmin Space Modal
const adminSpaceModal = document.getElementById("admin-space-modal") as HTMLDivElement;
const adminSpaceModalTitle = document.getElementById("admin-space-modal-title") as HTMLElement;
const btnCloseAdminSpaceModal = document.getElementById("btn-close-admin-space-modal") as HTMLButtonElement;
const adminSpaceForm = document.getElementById("admin-space-form") as HTMLFormElement;
const adminSpaceEditId = document.getElementById("admin-space-edit-id") as HTMLInputElement;
const adminSpaceName = document.getElementById("admin-space-name") as HTMLInputElement;
const adminSpaceCategorySelect = document.getElementById("admin-space-category-select") as HTMLSelectElement;
const adminSpaceCategoryCustom = document.getElementById("admin-space-category-custom") as HTMLInputElement;
const adminSpaceSwitchPublic = document.getElementById("admin-space-switch-public") as HTMLInputElement;
const adminSpaceWhitelistSection = document.getElementById("admin-space-whitelist-section") as HTMLDivElement;
const adminSpaceInviteUsername = document.getElementById("admin-space-invite-username") as HTMLInputElement;
const btnAddAdminSpaceInvite = document.getElementById("btn-add-admin-space-invite") as HTMLButtonElement;
const adminSpaceTagsCount = document.getElementById("admin-space-tags-count") as HTMLElement;
const adminSpaceTagsContainer = document.getElementById("admin-space-tags-container") as HTMLElement;

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

const uploadedPictures: Record<DirectionSlot, string | undefined> = {
  idle: undefined,
  left: undefined,
  right: undefined,
  up: undefined,
  down: undefined,
};

function getApiUrl(path: string): string {
  const protocol = window.location.protocol;
  const host = window.location.hostname || "localhost";
  return `${protocol}//${host}:2567${path}`;
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
    showAuthAlert("Passwords do not match. Please verify your password confirmation.");
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
  customColorInput.value = colorHex;

  document.querySelectorAll(".color-option").forEach((el) => {
    if (el.getAttribute("data-color")?.toLowerCase() === colorHex.toLowerCase()) {
      el.classList.add("selected");
    } else {
      el.classList.remove("selected");
    }
  });

  updatePreview();
}

function updatePreview() {
  const inputVal = nameInput.value.trim();
  const fallbackUsername = currentUser ? currentUser.username : "Player";
  const currentName = inputVal.length > 0 ? inputVal : fallbackUsername;

  previewName.textContent = currentName;
  previewDot.style.backgroundColor = selectedColor;

  const isSwitchOn = switchUploadPictures.checked;

  if (isSwitchOn && uploadedPictures.idle) {
    previewDot.classList.add("hidden");
    previewAvatar.classList.remove("hidden");
    previewDirectionsBar.classList.remove("hidden");

    const currentImg = uploadedPictures[activePreviewDir] || uploadedPictures.idle;
    previewAvatar.src = currentImg;

    if (activePreviewDir === "idle") {
      previewStatusHint.classList.add("hidden");
    } else if (uploadedPictures[activePreviewDir]) {
      previewStatusHint.textContent = `Showing custom ${activePreviewDir} picture`;
      previewStatusHint.classList.remove("hidden");
    } else {
      previewStatusHint.textContent = `Using standing still fallback for ${activePreviewDir}`;
      previewStatusHint.classList.remove("hidden");
    }
  } else {
    previewDot.classList.remove("hidden");
    previewAvatar.classList.add("hidden");
    previewDirectionsBar.classList.add("hidden");

    if (isSwitchOn && !uploadedPictures.idle) {
      previewStatusHint.textContent = "Upload Standing Still picture to activate custom character";
      previewStatusHint.classList.remove("hidden");
    } else {
      previewStatusHint.classList.add("hidden");
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

function setupUploadSlots() {
  const slots: DirectionSlot[] = ["idle", "left", "right", "up", "down"];

  slots.forEach((slot) => {
    const dropzone = document.getElementById(`dropzone-${slot}`) as HTMLDivElement;
    const fileInput = document.getElementById(`file-${slot}`) as HTMLInputElement;

    if (!dropzone || !fileInput) return;

    dropzone.addEventListener("click", (e) => {
      if ((e.target as HTMLElement).closest(".btn-remove-picture")) return;
      fileInput.click();
    });

    fileInput.addEventListener("change", async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      try {
        const dataUrl = await processImageFile(file);
        setSlotPicture(slot, dataUrl);
      } catch (err) {
        console.error("Error processing image file:", err);
      }
    });

    dropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.style.borderColor = "var(--primary-accent)";
    });

    dropzone.addEventListener("dragleave", () => {
      dropzone.style.borderColor = "";
    });

    dropzone.addEventListener("drop", async (e) => {
      e.preventDefault();
      dropzone.style.borderColor = "";
      const file = e.dataTransfer?.files?.[0];
      if (file && file.type.startsWith("image/")) {
        try {
          const dataUrl = await processImageFile(file);
          setSlotPicture(slot, dataUrl);
        } catch (err) {
          console.error("Error processing dropped image:", err);
        }
      }
    });
  });

  document.querySelectorAll(".btn-remove-picture").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const slot = (btn as HTMLElement).getAttribute("data-slot") as DirectionSlot;
      if (slot) {
        clearSlotPicture(slot);
      }
    });
  });

  document.querySelectorAll(".preview-dir-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const dir = (btn as HTMLElement).getAttribute("data-dir") as DirectionSlot;
      if (dir) {
        activePreviewDir = dir;
        document.querySelectorAll(".preview-dir-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        updatePreview();
      }
    });
  });

  const btnLoadDemo = document.getElementById("btn-load-demo-sprites") as HTMLButtonElement;
  if (btnLoadDemo) {
    btnLoadDemo.addEventListener("click", () => {
      slots.forEach((s) => {
        const demoImg = generateDemoSprite(s);
        setSlotPicture(s, demoImg);
      });
    });
  }

  const btnClearAll = document.getElementById("btn-clear-all-sprites") as HTMLButtonElement;
  if (btnClearAll) {
    btnClearAll.addEventListener("click", () => {
      slots.forEach((s) => clearSlotPicture(s));
    });
  }
}

function generateDemoSprite(direction: DirectionSlot): string {
  const canvas = document.createElement("canvas");
  canvas.width = 48;
  canvas.height = 48;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;

  ctx.clearRect(0, 0, 48, 48);

  ctx.fillStyle = "#3B8282";
  ctx.beginPath();
  ctx.roundRect(14, 6, 20, 14, 6);
  ctx.fill();

  ctx.fillStyle = "#ECA239";
  ctx.beginPath();
  ctx.roundRect(16, 12, 16, 14, 4);
  ctx.fill();

  if (direction === "idle") {
    ctx.fillStyle = "#1E3131";
    ctx.fillRect(19, 17, 3, 3);
    ctx.fillRect(26, 17, 3, 3);
    ctx.fillRect(22, 22, 4, 1);
  } else if (direction === "left") {
    ctx.fillStyle = "#1E3131";
    ctx.fillRect(17, 17, 3, 3);
    ctx.fillRect(23, 17, 2, 3);
  } else if (direction === "right") {
    ctx.fillStyle = "#1E3131";
    ctx.fillRect(23, 17, 2, 3);
    ctx.fillRect(28, 17, 3, 3);
  } else if (direction === "up") {
    ctx.fillStyle = "#3B8282";
    ctx.beginPath();
    ctx.roundRect(16, 12, 16, 14, 4);
    ctx.fill();
  } else if (direction === "down") {
    ctx.fillStyle = "#1E3131";
    ctx.fillRect(19, 18, 3, 3);
    ctx.fillRect(26, 18, 3, 3);
    ctx.fillRect(22, 23, 4, 1);
  }

  return canvas.toDataURL("image/png");
}

function setSlotPicture(slot: DirectionSlot, dataUrl: string) {
  uploadedPictures[slot] = dataUrl;
  const emptyState = document.getElementById(`empty-${slot}`);
  const filledState = document.getElementById(`filled-${slot}`);
  const thumb = document.getElementById(`thumb-${slot}`) as HTMLImageElement;

  if (emptyState && filledState && thumb) {
    thumb.src = dataUrl;
    emptyState.classList.add("hidden");
    filledState.classList.remove("hidden");
  }

  updatePreview();
}

function clearSlotPicture(slot: DirectionSlot) {
  uploadedPictures[slot] = undefined;
  const emptyState = document.getElementById(`empty-${slot}`);
  const filledState = document.getElementById(`filled-${slot}`);
  const thumb = document.getElementById(`thumb-${slot}`) as HTMLImageElement;
  const fileInput = document.getElementById(`file-${slot}`) as HTMLInputElement;

  if (emptyState && filledState && thumb) {
    thumb.src = "";
    filledState.classList.add("hidden");
    emptyState.classList.remove("hidden");
  }
  if (fileInput) fileInput.value = "";

  updatePreview();
}

switchUploadPictures.addEventListener("change", () => {
  if (switchUploadPictures.checked) {
    dotInputSection.classList.add("hidden");
    uploadPicturesSection.classList.remove("hidden");
  } else {
    dotInputSection.classList.remove("hidden");
    uploadPicturesSection.classList.add("hidden");
  }
  updatePreview();
});

nameInput.addEventListener("input", updatePreview);
customColorInput.addEventListener("input", (e) => {
  selectColor((e.target as HTMLInputElement).value);
});

// Update Character Modal Open / Close
function openUpdateCharacterModal() {
  btnJoin.textContent = "Save Changes";
  nameInput.value = currentUser?.displayName || "";
  if (currentUsernameTag) {
    currentUsernameTag.textContent = currentUser ? `@${currentUser.username}` : "";
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
  if (!isSwitchOn || !uploadedPictures.idle) {
    return undefined;
  }

  const idle = uploadedPictures.idle;
  return {
    idle,
    left: uploadedPictures.left || idle,
    right: uploadedPictures.right || idle,
    up: uploadedPictures.up || idle,
    down: uploadedPictures.down || idle,
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
    localStorage.setItem("player_upload_switch", switchUploadPictures.checked ? "true" : "false");
    if (uploadedPictures.idle) localStorage.setItem("player_pic_idle", uploadedPictures.idle);
    else localStorage.removeItem("player_pic_idle");
    if (uploadedPictures.left) localStorage.setItem("player_pic_left", uploadedPictures.left);
    else localStorage.removeItem("player_pic_left");
    if (uploadedPictures.right) localStorage.setItem("player_pic_right", uploadedPictures.right);
    else localStorage.removeItem("player_pic_right");
    if (uploadedPictures.up) localStorage.setItem("player_pic_up", uploadedPictures.up);
    else localStorage.removeItem("player_pic_up");
    if (uploadedPictures.down) localStorage.setItem("player_pic_down", uploadedPictures.down);
    else localStorage.removeItem("player_pic_down");
  } catch (err) {
    console.warn("Could not save pictures to localStorage:", err);
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
    alert("Personal space is still initializing. Please try again in a moment.");
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
  if (uploadedPictures.idle) {
    topbarAvatarImg.src = uploadedPictures.idle;
    topbarAvatarImg.classList.remove("hidden");
    topbarAvatarDot.classList.add("hidden");
  } else {
    topbarAvatarDot.style.backgroundColor = selectedColor;
    topbarAvatarDot.classList.remove("hidden");
    topbarAvatarImg.classList.add("hidden");
  }

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
  if (!btnMapSettings) return;

  if (canChangeCurrentSpaceSettings()) {
    btnMapSettings.classList.remove("hidden");
  } else {
    btnMapSettings.classList.add("hidden");
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
      ? space.whitelist.some((w) => w.toLowerCase() === currentUser!.username.toLowerCase())
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
    const travelBtn = card.querySelector(".action-travel") as HTMLButtonElement | null;
    if (travelBtn) {
      travelBtn.addEventListener("click", () => {
        closeMapModal();
        switchSpace(space.id, space.name);
      });
    }

    // Hook up Edit / Delete buttons for Superadmin
    if (isSuperadmin) {
      const editBtn = card.querySelector(".edit-admin-space") as HTMLButtonElement | null;
      if (editBtn) {
        editBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          openAdminEditSpaceModal(space);
        });
      }
      const deleteBtn = card.querySelector(".delete-admin-space") as HTMLButtonElement | null;
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

  try {
    const effectiveName = getEffectivePlayerName();
    const color = selectedColor;
    const avatars = computeActiveAvatars();

    if (!multiplayer) {
      multiplayer = new MultiplayerManager();
    }

    await multiplayer.joinGame({
      name: effectiveName,
      color,
      avatars,
      spaceId: currentSpaceId,
      token: authToken || undefined,
    });

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
    alert(err?.message || "Failed to join space. It might be private or require invitation.");
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

    const removeBtn = chip.querySelector(".whitelist-tag-chip-remove") as HTMLElement;
    removeBtn.addEventListener("click", () => {
      tempMySpaceWhitelist = tempMySpaceWhitelist.filter((u) => u.toLowerCase() !== username.toLowerCase());
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

  const defaultCategories = ["Town Square", "Hangout Lounges", "Gaming Zones", "Chill Parks", "Events & Arenas"];
  const combined = Array.from(new Set([...defaultCategories, ...loadedCategories]));

  combined.forEach((cat) => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    if (selectedCategory && cat.toLowerCase() === selectedCategory.toLowerCase()) {
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

    const removeBtn = chip.querySelector(".whitelist-tag-chip-remove") as HTMLElement;
    removeBtn.addEventListener("click", () => {
      tempAdminSpaceWhitelist = tempAdminSpaceWhitelist.filter((u) => u.toLowerCase() !== username.toLowerCase());
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

  if (tempAdminSpaceWhitelist.some((u) => u.toLowerCase() === raw.toLowerCase())) {
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
    }
  });

  try {
    await manager.joinGame({
      name: effectiveName,
      color,
      avatars,
      spaceId: currentSpaceId,
      token: authToken || undefined,
    });
    multiplayer = manager;

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
    gameInstance.scene.add("GameScene", GameScene, true, { multiplayer });

    // Initial Spaces fetch & periodic refresh
    await fetchSpaces();
    if (spacesRefreshTimer !== null) clearInterval(spacesRefreshTimer);
    spacesRefreshTimer = window.setInterval(fetchSpaces, 10000);
  } catch (err: any) {
    console.error("Connection or join error:", err);
    multiplayer = null;
    alert("Could not connect to multiplayer server. Please ensure the backend is running!");
    openAuthModal("login");
  }
}

// Window Resize Handler
window.addEventListener("resize", () => {
  if (gameInstance) {
    gameInstance.scale.resize(window.innerWidth, window.innerHeight);
  }
});

// App Initialization
async function init() {
  setupColorSwatches();
  setupUploadSlots();

  const savedColor = localStorage.getItem("player_color");
  const savedSwitch = localStorage.getItem("player_upload_switch");

  if (savedColor) {
    selectColor(savedColor);
  } else {
    selectColor(selectedColor);
  }

  const slots: DirectionSlot[] = ["idle", "left", "right", "up", "down"];
  slots.forEach((slot) => {
    const savedPic = localStorage.getItem(`player_pic_${slot}`);
    if (savedPic) {
      setSlotPicture(slot, savedPic);
    }
  });

  if (savedSwitch === "true") {
    switchUploadPictures.checked = true;
    dotInputSection.classList.add("hidden");
    uploadPicturesSection.classList.remove("hidden");
  } else {
    switchUploadPictures.checked = false;
    dotInputSection.classList.remove("hidden");
    uploadPicturesSection.classList.add("hidden");
  }

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
