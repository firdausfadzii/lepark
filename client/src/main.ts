import Phaser from "phaser";
import { MultiplayerManager } from "./network/MultiplayerManager";
import { GameScene } from "./scenes/GameScene";
import { DEFAULT_PRESET_COLORS, PlayerAvatars, AuthUser, AuthResponse } from "shared";

// Types
type DirectionSlot = "idle" | "left" | "right" | "up" | "down";

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

// DOM Elements - HUD
const hudActions = document.getElementById("hud-actions") as HTMLDivElement;
const hudFooter = document.getElementById("hud-footer") as HTMLDivElement;
const connectionDot = document.getElementById("connection-indicator") as HTMLSpanElement;
const statusText = document.getElementById("status-text") as HTMLSpanElement;
const playerCountText = document.getElementById("player-count") as HTMLSpanElement;
const pingStatText = document.getElementById("ping-stat") as HTMLSpanElement;
const lossStatText = document.getElementById("loss-stat") as HTMLSpanElement;
const btnEditProfile = document.getElementById("btn-edit-profile") as HTMLButtonElement;
const btnLogout = document.getElementById("btn-logout") as HTMLButtonElement;

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

// Switch and Sections
const switchUploadPictures = document.getElementById("switch-upload-pictures") as HTMLInputElement;
const dotInputSection = document.getElementById("dot-input-section") as HTMLDivElement;
const uploadPicturesSection = document.getElementById("upload-pictures-section") as HTMLDivElement;

// State
let currentUser: AuthUser | null = null;
let authToken: string | null = null;
let selectedColor = DEFAULT_PRESET_COLORS[5]; // Royal blue default
let gameInstance: Phaser.Game | null = null;
let multiplayer: MultiplayerManager | null = null;
let activePreviewDir: DirectionSlot = "idle";

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

// ==========================================
// Auth Modal & Tab Management
// ==========================================

function showAuthAlert(message: string, isSuccess = false) {
  authAlertMsg.textContent = message;
  authAlert.className = "auth-alert " + (isSuccess ? "success" : "");
  authAlert.classList.remove("hidden");
}

function clearAuthAlert() {
  authAlert.classList.add("hidden");
  authAlertMsg.textContent = "";
}

function switchAuthTab(tab: "login" | "register") {
  clearAuthAlert();
  if (tab === "login") {
    tabLogin.classList.add("active");
    tabRegister.classList.remove("active");
    loginForm.classList.remove("hidden");
    registerForm.classList.add("hidden");
    setTimeout(() => loginUsernameInput.focus(), 50);
  } else {
    tabRegister.classList.add("active");
    tabLogin.classList.remove("active");
    registerForm.classList.remove("hidden");
    loginForm.classList.add("hidden");
    setTimeout(() => regUsernameInput.focus(), 50);
  }
}

tabLogin.addEventListener("click", () => switchAuthTab("login"));
tabRegister.addEventListener("click", () => switchAuthTab("register"));
linkGoRegister.addEventListener("click", (e) => {
  e.preventDefault();
  switchAuthTab("register");
});
linkGoLogin.addEventListener("click", (e) => {
  e.preventDefault();
  switchAuthTab("login");
});

// Toggle password visibility
document.querySelectorAll(".btn-toggle-pwd").forEach((btn) => {
  btn.addEventListener("click", () => {
    const targetId = (btn as HTMLElement).getAttribute("data-target");
    if (!targetId) return;
    const input = document.getElementById(targetId) as HTMLInputElement;
    if (input) {
      const isPwd = input.type === "password";
      input.type = isPwd ? "text" : "password";
      btn.textContent = isPwd ? "🙈" : "👁️";
    }
  });
});

function openAuthModal(initialTab: "login" | "register" = "login") {
  switchAuthTab(initialTab);
  authModal.classList.remove("hidden");
  hudActions.classList.add("hidden");
  hudFooter.classList.add("hidden");
}

function closeAuthModal() {
  authModal.classList.add("hidden");
  hudActions.classList.remove("hidden");
  hudFooter.classList.remove("hidden");
}

// Handle Register Submission
registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearAuthAlert();

  const username = regUsernameInput.value.trim();
  const displayName = regDisplayNameInput.value.trim();
  const password = regPasswordInput.value;
  const confirmPassword = regConfirmPasswordInput.value;

  if (username.length < 3) {
    showAuthAlert("Username must be at least 3 characters long.");
    regUsernameInput.focus();
    return;
  }

  if (password.length < 6) {
    showAuthAlert("Password must be at least 6 characters long.");
    regPasswordInput.focus();
    return;
  }

  if (password !== confirmPassword) {
    showAuthAlert("Passwords do not match. Please re-enter.");
    regConfirmPasswordInput.focus();
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
        displayName: displayName || null,
        password,
        confirmPassword,
      }),
    });

    const data: AuthResponse = await res.json();
    if (!res.ok || !data.success || !data.token || !data.user) {
      showAuthAlert(data.error || "Failed to register account.");
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

// Handle Login Submission
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearAuthAlert();

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
btnLogout.addEventListener("click", () => {
  handleLogout();
});

function handleLogout() {
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

  connectionDot.className = "status-dot disconnected";
  statusText.textContent = "Disconnected";
  if (pingStatText) pingStatText.textContent = "-- ms";
  if (lossStatText) lossStatText.textContent = "-- loss";

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
  // If display name input has value, use it; otherwise fallback to currentUser.username; fallback to Player
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

  ctx.fillStyle = "#818cf8";
  ctx.beginPath();
  ctx.roundRect(14, 6, 20, 14, 6);
  ctx.fill();

  ctx.fillStyle = "#fcd34d";
  ctx.beginPath();
  ctx.roundRect(16, 12, 16, 14, 4);
  ctx.fill();

  if (direction === "idle") {
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(19, 17, 3, 3);
    ctx.fillRect(26, 17, 3, 3);
    ctx.fillRect(22, 22, 4, 1);
  } else if (direction === "left") {
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(17, 17, 3, 3);
    ctx.fillRect(23, 17, 2, 3);
  } else if (direction === "right") {
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(23, 17, 2, 3);
    ctx.fillRect(28, 17, 3, 3);
  } else if (direction === "up") {
    ctx.fillStyle = "#818cf8";
    ctx.beginPath();
    ctx.roundRect(16, 10, 16, 16, 4);
    ctx.fill();
  } else if (direction === "down") {
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(19, 19, 3, 2);
    ctx.fillRect(26, 19, 3, 2);
  }

  ctx.fillStyle = "#6366f1";
  ctx.beginPath();
  ctx.roundRect(15, 26, 18, 14, 4);
  ctx.fill();

  ctx.fillStyle = "#312e81";
  ctx.fillRect(15, 34, 18, 3);

  ctx.fillStyle = "#1e293b";
  if (direction === "left") {
    ctx.fillRect(14, 40, 7, 5);
    ctx.fillRect(24, 40, 6, 5);
  } else if (direction === "right") {
    ctx.fillRect(18, 40, 6, 5);
    ctx.fillRect(27, 40, 7, 5);
  } else {
    ctx.fillRect(16, 40, 6, 5);
    ctx.fillRect(26, 40, 6, 5);
  }

  const outCanvas = document.createElement("canvas");
  outCanvas.width = 144;
  outCanvas.height = 144;
  const outCtx = outCanvas.getContext("2d")!;
  outCtx.imageSmoothingEnabled = false;
  outCtx.drawImage(canvas, 0, 0, 144, 144);

  return outCanvas.toDataURL("image/png");
}

function setSlotPicture(slot: DirectionSlot, dataUrl: string) {
  uploadedPictures[slot] = dataUrl;

  const emptyState = document.getElementById(`empty-${slot}`) as HTMLDivElement;
  const filledState = document.getElementById(`filled-${slot}`) as HTMLDivElement;
  const thumbImg = document.getElementById(`thumb-${slot}`) as HTMLImageElement;

  if (thumbImg && emptyState && filledState) {
    thumbImg.src = dataUrl;
    emptyState.classList.add("hidden");
    filledState.classList.remove("hidden");
  }

  updatePreview();
}

function clearSlotPicture(slot: DirectionSlot) {
  uploadedPictures[slot] = undefined;

  const fileInput = document.getElementById(`file-${slot}`) as HTMLInputElement;
  const emptyState = document.getElementById(`empty-${slot}`) as HTMLDivElement;
  const filledState = document.getElementById(`filled-${slot}`) as HTMLDivElement;
  const thumbImg = document.getElementById(`thumb-${slot}`) as HTMLImageElement;

  if (fileInput) fileInput.value = "";
  if (thumbImg) thumbImg.src = "";
  if (emptyState && filledState) {
    emptyState.classList.remove("hidden");
    filledState.classList.add("hidden");
  }

  updatePreview();
}

switchUploadPictures.addEventListener("change", () => {
  const isChecked = switchUploadPictures.checked;
  if (isChecked) {
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

  if (gameInstance) {
    const activeScene = gameInstance.scene.getScene("GameScene") as GameScene;
    if (activeScene && typeof activeScene.setControlsActive === "function") {
      activeScene.setControlsActive(false);
    }
  }

  setTimeout(() => {
    nameInput.focus();
    nameInput.select();
  }, 50);
}

function closeUpdateCharacterModal() {
  modal.classList.add("hidden");

  if (gameInstance) {
    const activeScene = gameInstance.scene.getScene("GameScene") as GameScene;
    if (activeScene && typeof activeScene.setControlsActive === "function") {
      activeScene.setControlsActive(true);
    }
  }
}

btnEditProfile.addEventListener("click", () => {
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

  // If user changed their display name, sync with server backend
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

  // Save character visual preferences locally
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
// Multiplayer Session & Game Initialization
// ==========================================

async function enterGameSession() {
  const effectiveName = getEffectivePlayerName();
  const color = selectedColor;
  const avatars = computeActiveAvatars();

  if (gameInstance) {
    // If game instance already running, just update profile
    if (multiplayer) {
      multiplayer.updateProfile(effectiveName, color, avatars || null);
    }
    return;
  }

  statusText.textContent = "Connecting to server...";
  const manager = new MultiplayerManager();

  manager.onNetworkStats(({ pingMs, packetLoss }) => {
    if (pingStatText) {
      pingStatText.textContent = `${pingMs} ms`;
      pingStatText.className =
        "badge-stat " + (pingMs < 60 ? "good" : pingMs < 130 ? "fair" : "poor");
    }
    if (lossStatText) {
      lossStatText.textContent = `${packetLoss}% loss`;
      lossStatText.className =
        "badge-stat " + (packetLoss === 0 ? "good" : packetLoss < 5 ? "fair" : "poor");
    }
  });

  manager.onConnectionStatus((connected) => {
    if (connected) {
      connectionDot.className = "status-dot";
      statusText.textContent = "Connected";
    } else {
      connectionDot.className = "status-dot disconnected";
      statusText.textContent = "Disconnected";
      if (pingStatText) {
        pingStatText.textContent = "-- ms";
        pingStatText.className = "badge-stat";
      }
      if (lossStatText) {
        lossStatText.textContent = "-- loss";
        lossStatText.className = "badge-stat";
      }
    }
  });

  manager.onPlayerCount((count) => {
    playerCountText.textContent = `${count} Online`;
  });

  try {
    await manager.joinGame({ name: effectiveName, color, avatars });
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
  } catch (err) {
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
