import Phaser from "phaser";
import { MultiplayerManager } from "./network/MultiplayerManager";
import { GameScene } from "./scenes/GameScene";
import { DEFAULT_PRESET_COLORS, PlayerAvatars } from "shared";

// Types
type DirectionSlot = "idle" | "left" | "right" | "up" | "down";

// DOM Elements
const modal = document.getElementById("onboarding-modal") as HTMLDivElement;
const profileForm = document.getElementById("profile-form") as HTMLFormElement;
const nameInput = document.getElementById("player-name") as HTMLInputElement;
const customColorInput = document.getElementById("custom-color-picker") as HTMLInputElement;
const colorGrid = document.getElementById("color-grid") as HTMLDivElement;
const previewDot = document.getElementById("preview-dot") as HTMLDivElement;
const previewAvatar = document.getElementById("preview-avatar") as HTMLImageElement;
const previewDirectionsBar = document.getElementById("preview-directions-bar") as HTMLDivElement;
const previewStatusHint = document.getElementById("preview-status-hint") as HTMLDivElement;
const previewName = document.getElementById("preview-name") as HTMLDivElement;
const connectionDot = document.getElementById("connection-indicator") as HTMLSpanElement;
const statusText = document.getElementById("status-text") as HTMLSpanElement;
const playerCountText = document.getElementById("player-count") as HTMLSpanElement;
const pingStatText = document.getElementById("ping-stat") as HTMLSpanElement;
const lossStatText = document.getElementById("loss-stat") as HTMLSpanElement;
const btnEditProfile = document.getElementById("btn-edit-profile") as HTMLButtonElement;
const btnJoin = document.getElementById("btn-join") as HTMLButtonElement;

// Switch and Sections
const switchUploadPictures = document.getElementById("switch-upload-pictures") as HTMLInputElement;
const dotInputSection = document.getElementById("dot-input-section") as HTMLDivElement;
const uploadPicturesSection = document.getElementById("upload-pictures-section") as HTMLDivElement;

// State
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

// Setup Preset Color Buttons
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

  // Update selection rings
  document.querySelectorAll(".color-option").forEach((el) => {
    if (el.getAttribute("data-color")?.toLowerCase() === colorHex.toLowerCase()) {
      el.classList.add("selected");
    } else {
      el.classList.remove("selected");
    }
  });

  updatePreview();
}

// Live Preview Update
function updatePreview() {
  const currentName = nameInput.value.trim() || "Player";
  previewName.textContent = currentName;
  previewDot.style.backgroundColor = selectedColor;

  const isSwitchOn = switchUploadPictures.checked;

  // "if standing still picture is uploaded, then use that picture. else, use dot."
  // "if any of other movement picture is not uploaded, use the standing still picture."
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
    // Show dot
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

// Helper to downscale and optimize uploaded image to ~150px max dimension
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
        ctx.imageSmoothingEnabled = false; // preserve pixel art crispness
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

// Setup Upload Dropzones & File Listeners
function setupUploadSlots() {
  const slots: DirectionSlot[] = ["idle", "left", "right", "up", "down"];

  slots.forEach((slot) => {
    const dropzone = document.getElementById(`dropzone-${slot}`) as HTMLDivElement;
    const fileInput = document.getElementById(`file-${slot}`) as HTMLInputElement;
    const emptyState = document.getElementById(`empty-${slot}`) as HTMLDivElement;
    const filledState = document.getElementById(`filled-${slot}`) as HTMLDivElement;
    const thumbImg = document.getElementById(`thumb-${slot}`) as HTMLImageElement;

    if (!dropzone || !fileInput) return;

    // Click dropzone triggers file picker
    dropzone.addEventListener("click", (e) => {
      // Don't trigger if remove button was clicked
      if ((e.target as HTMLElement).closest(".btn-remove-picture")) return;
      fileInput.click();
    });

    // Handle file selection
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

    // Drag and drop support
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

  // Remove picture buttons
  document.querySelectorAll(".btn-remove-picture").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const slot = (btn as HTMLElement).getAttribute("data-slot") as DirectionSlot;
      if (slot) {
        clearSlotPicture(slot);
      }
    });
  });

  // Setup preview direction buttons
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

  // Load sample demo sprites
  const btnLoadDemo = document.getElementById("btn-load-demo-sprites") as HTMLButtonElement;
  if (btnLoadDemo) {
    btnLoadDemo.addEventListener("click", () => {
      slots.forEach((s) => {
        const demoImg = generateDemoSprite(s);
        setSlotPicture(s, demoImg);
      });
    });
  }

  // Clear all sprites
  const btnClearAll = document.getElementById("btn-clear-all-sprites") as HTMLButtonElement;
  if (btnClearAll) {
    btnClearAll.addEventListener("click", () => {
      slots.forEach((s) => clearSlotPicture(s));
    });
  }
}

// Procedural sample RPG sprite generator for quick testing & demonstration
function generateDemoSprite(direction: DirectionSlot): string {
  const canvas = document.createElement("canvas");
  canvas.width = 48;
  canvas.height = 48;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;

  ctx.clearRect(0, 0, 48, 48);

  // Hair / Hat (Indigo / Purple)
  ctx.fillStyle = "#818cf8";
  ctx.beginPath();
  ctx.roundRect(14, 6, 20, 14, 6);
  ctx.fill();

  // Face (Warm peach)
  ctx.fillStyle = "#fcd34d";
  ctx.beginPath();
  ctx.roundRect(16, 12, 16, 14, 4);
  ctx.fill();

  // Direction specific details:
  if (direction === "idle") {
    // Eyes looking front
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(19, 17, 3, 3);
    ctx.fillRect(26, 17, 3, 3);
    // Smile
    ctx.fillRect(22, 22, 4, 1);
  } else if (direction === "left") {
    // Eyes looking left
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(17, 17, 3, 3);
    ctx.fillRect(23, 17, 2, 3);
  } else if (direction === "right") {
    // Eyes looking right
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(23, 17, 2, 3);
    ctx.fillRect(28, 17, 3, 3);
  } else if (direction === "up") {
    // Back of head (all hair)
    ctx.fillStyle = "#818cf8";
    ctx.beginPath();
    ctx.roundRect(16, 10, 16, 16, 4);
    ctx.fill();
  } else if (direction === "down") {
    // Eyes looking down
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(19, 19, 3, 2);
    ctx.fillRect(26, 19, 3, 2);
  }

  // Shirt / Body
  ctx.fillStyle = "#6366f1";
  ctx.beginPath();
  ctx.roundRect(15, 26, 18, 14, 4);
  ctx.fill();

  // Belt / Details
  ctx.fillStyle = "#312e81";
  ctx.fillRect(15, 34, 18, 3);

  // Feet
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

  // Upscale cleanly to 144x144 (3x) for crisp 150px tile character display
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

// Switch Handler ("Upload Pictures")
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

// Event Listeners for Live Preview
nameInput.addEventListener("input", updatePreview);
customColorInput.addEventListener("input", (e) => {
  selectColor((e.target as HTMLInputElement).value);
});

// Modal Open / Close
function openModal(isEditMode = false) {
  btnJoin.textContent = isEditMode ? "Save Changes" : "Enter Game";
  modal.classList.remove("hidden");

  // When modal is open, unregister all movement keys so user can freely type (WASD)
  if (gameInstance) {
    const activeScene = gameInstance.scene.getScene("GameScene") as GameScene;
    if (activeScene && typeof activeScene.setControlsActive === "function") {
      activeScene.setControlsActive(false);
    }
  }

  // Focus directly into the modal's name input
  setTimeout(() => {
    nameInput.focus();
    nameInput.select();
  }, 50);
}

function closeModal() {
  modal.classList.add("hidden");

  // Re-enable movement controls when modal closes
  if (gameInstance) {
    const activeScene = gameInstance.scene.getScene("GameScene") as GameScene;
    if (activeScene && typeof activeScene.setControlsActive === "function") {
      activeScene.setControlsActive(true);
    }
  }
}

btnEditProfile.addEventListener("click", () => {
  openModal(true);
});

// Compute active avatars based on rules:
// "if standing still picture is uploaded, then use that picture. else, use dot."
// "if any of other movement picture is not uploaded, use the standing still picture."
function computeActiveAvatars(): PlayerAvatars | undefined {
  const isSwitchOn = switchUploadPictures.checked;
  if (!isSwitchOn || !uploadedPictures.idle) {
    return undefined; // use dot
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

// Start or Update Game
async function handleJoinOrSave(e: Event) {
  e.preventDefault();
  const name = nameInput.value.trim() || "Player";
  const color = selectedColor;
  const avatars = computeActiveAvatars();

  // Save preferences in localStorage
  try {
    localStorage.setItem("player_name", name);
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
    console.warn("Could not save all pictures to localStorage:", err);
  }

  closeModal();

  if (!gameInstance) {
    // First-time join: connect and initialize Phaser
    statusText.textContent = "Connecting to server...";
    const manager = new MultiplayerManager();

    // Hook up UI indicators
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
      await manager.joinGame({ name, color, avatars });
      multiplayer = manager;

      // Initialize Phaser 3 Game
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
      openModal(false);
    }
  } else if (multiplayer) {
    // Already in game: update live profile
    multiplayer.updateProfile(name, color, avatars || null);

    // Also update local visual immediately
    if (multiplayer.sessionId) {
      const activeScene = gameInstance.scene.getScene("GameScene") as GameScene;
      if (activeScene && typeof activeScene.setPlayerAvatars === "function") {
        activeScene.setPlayerAvatars(multiplayer.sessionId, avatars || null);
      }
    }
  }
}

profileForm.addEventListener("submit", handleJoinOrSave);

// Window Resize Handler
window.addEventListener("resize", () => {
  if (gameInstance) {
    gameInstance.scale.resize(window.innerWidth, window.innerHeight);
  }
});

// App Initialization
function init() {
  setupColorSwatches();
  setupUploadSlots();

  const savedName = localStorage.getItem("player_name");
  const savedColor = localStorage.getItem("player_color");
  const savedSwitch = localStorage.getItem("player_upload_switch");

  if (savedName) {
    nameInput.value = savedName;
  }
  if (savedColor) {
    selectColor(savedColor);
  } else {
    selectColor(selectedColor);
  }

  // Restore saved pictures if any
  const slots: DirectionSlot[] = ["idle", "left", "right", "up", "down"];
  slots.forEach((slot) => {
    const savedPic = localStorage.getItem(`player_pic_${slot}`);
    if (savedPic) {
      setSlotPicture(slot, savedPic);
    }
  });

  // Default switch state is false (dot input by default)
  if (savedSwitch === "true") {
    switchUploadPictures.checked = true;
    dotInputSection.classList.add("hidden");
    uploadPicturesSection.classList.remove("hidden");
  } else {
    switchUploadPictures.checked = false;
    dotInputSection.classList.remove("hidden");
    uploadPicturesSection.classList.add("hidden");
  }

  updatePreview();

  // Show modal immediately so user enters their profile
  openModal(false);
}

init();

