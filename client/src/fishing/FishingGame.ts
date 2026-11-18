/**
 * Stardew Valley Fishing Minigame Engine for Lepark
 * Incorporates:
 * - A (Salt Water) assets
 * - B (Fresh Water) assets
 * - C (Misc) assets
 * - Authentic Stardew Valley hold/release physics & fish behavioral AI
 * - Medium-to-Hard catch difficulty calibration
 * - Synthesized retro Web Audio SFX
 * - Persistent fish journal & virtual animated aquarium tank
 */

export interface FishSpecies {
  id: string;
  name: string;
  category: "Salt Water" | "Fresh Water" | "Misc";
  image: string;
  outline: string;
  difficulty: number; // 25 to 95
  behavior: "mixed" | "smooth" | "sinker" | "floater" | "dart";
  barSizeRatio: number; // 0.17 to 0.25 (medium to hard)
  speedMult: number; // 1.0 to 1.85
  jerkChance: number; // 0.20 to 0.70
  minSize: number;
  maxSize: number;
  description: string;
}

export const FISH_SPECIES: FishSpecies[] = [
  // --- A: Salt Water ---
  {
    id: "anchovy",
    name: "Anchovy",
    category: "Salt Water",
    image: "/assets/fishing/salt_water/Anchovy.png",
    outline: "/assets/fishing/salt_water/Anchovy Outline.png",
    difficulty: 55,
    behavior: "dart",
    barSizeRatio: 0.21,
    speedMult: 1.25,
    jerkChance: 0.40,
    minSize: 4.0,
    maxSize: 8.5,
    description: "A small silver schooling saltwater fish. Fast darting movements!",
  },
  {
    id: "clownfish",
    name: "Clownfish",
    category: "Salt Water",
    image: "/assets/fishing/salt_water/Clownfish.png",
    outline: "/assets/fishing/salt_water/Clownfish Outline.png",
    difficulty: 68,
    behavior: "mixed",
    barSizeRatio: 0.20,
    speedMult: 1.35,
    jerkChance: 0.50,
    minSize: 3.5,
    maxSize: 7.0,
    description: "Vibrant orange stripes. Weaves between sea anemones with tricky feints.",
  },
  {
    id: "crab_dungeness",
    name: "Crab (Dungeness)",
    category: "Salt Water",
    image: "/assets/fishing/salt_water/Crab - Dungeness.png",
    outline: "/assets/fishing/salt_water/Crab - Dungeness Outline.png",
    difficulty: 76,
    behavior: "sinker",
    barSizeRatio: 0.19,
    speedMult: 1.45,
    jerkChance: 0.45,
    minSize: 9.0,
    maxSize: 18.0,
    description: "Heavy armored saltwater crustacean that clings stubbornly to the seabed.",
  },
  {
    id: "surgeonfish",
    name: "Surgeonfish",
    category: "Salt Water",
    image: "/assets/fishing/salt_water/Surgeonfish.png",
    outline: "/assets/fishing/salt_water/Surgeonfish Outline.png",
    difficulty: 82,
    behavior: "dart",
    barSizeRatio: 0.18,
    speedMult: 1.60,
    jerkChance: 0.65,
    minSize: 10.0,
    maxSize: 20.0,
    description: "Speedy brilliant blue reef swimmer with razor-sharp caudal spines.",
  },
  {
    id: "pufferfish",
    name: "Pufferfish",
    category: "Salt Water",
    image: "/assets/fishing/salt_water/Pufferfish.png",
    outline: "/assets/fishing/salt_water/Pufferfish Outline.png",
    difficulty: 92,
    behavior: "floater",
    barSizeRatio: 0.17,
    speedMult: 1.85,
    jerkChance: 0.75,
    minSize: 7.5,
    maxSize: 16.0,
    description: "Inflates with sharp prickles when hooked! Aggressive, wild, and unpredictable.",
  },

  // --- B: Fresh Water ---
  {
    id: "goldfish",
    name: "Goldfish",
    category: "Fresh Water",
    image: "/assets/fishing/fresh_water/Goldfish.png",
    outline: "/assets/fishing/fresh_water/Goldfish Outline.png",
    difficulty: 52,
    behavior: "smooth",
    barSizeRatio: 0.22,
    speedMult: 1.15,
    jerkChance: 0.30,
    minSize: 5.0,
    maxSize: 12.0,
    description: "A shimmering classic. Gentle swimmer with sudden playful bursts.",
  },
  {
    id: "angelfish",
    name: "Angelfish",
    category: "Fresh Water",
    image: "/assets/fishing/fresh_water/Angelfish.png",
    outline: "/assets/fishing/fresh_water/Angelfish Outline.png",
    difficulty: 66,
    behavior: "floater",
    barSizeRatio: 0.20,
    speedMult: 1.30,
    jerkChance: 0.45,
    minSize: 6.5,
    maxSize: 14.5,
    description: "An elegant triangular swimmer that loves cruising near the surface.",
  },
  {
    id: "bass",
    name: "Bass",
    category: "Fresh Water",
    image: "/assets/fishing/fresh_water/Bass.png",
    outline: "/assets/fishing/fresh_water/Bass Outline.png",
    difficulty: 75,
    behavior: "sinker",
    barSizeRatio: 0.19,
    speedMult: 1.45,
    jerkChance: 0.50,
    minSize: 13.0,
    maxSize: 25.0,
    description: "A hefty freshwater game fish with explosive downward dives when hooked!",
  },
  {
    id: "rainbow_trout",
    name: "Rainbow Trout",
    category: "Fresh Water",
    image: "/assets/fishing/fresh_water/Rainbow Trout.png",
    outline: "/assets/fishing/fresh_water/Rainbow Trout Outline.png",
    difficulty: 84,
    behavior: "mixed",
    barSizeRatio: 0.18,
    speedMult: 1.65,
    jerkChance: 0.65,
    minSize: 14.0,
    maxSize: 28.5,
    description: "A vibrant rainbow-hued river fish capable of astonishing acrobatics.",
  },
  {
    id: "catfish",
    name: "Catfish",
    category: "Fresh Water",
    image: "/assets/fishing/fresh_water/Catfish.png",
    outline: "/assets/fishing/fresh_water/Catfish Outline.png",
    difficulty: 89,
    behavior: "dart",
    barSizeRatio: 0.17,
    speedMult: 1.80,
    jerkChance: 0.72,
    minSize: 18.0,
    maxSize: 36.0,
    description: "A notoriously ferocious river predator! Aggressive, erratic, and relentless.",
  },

  // --- C: Misc ---
  {
    id: "rusty_can",
    name: "Rusty Can",
    category: "Misc",
    image: "/assets/fishing/misc/Rusty Can.png",
    outline: "/assets/fishing/misc/Rusty Can Outline.png",
    difficulty: 28,
    behavior: "sinker",
    barSizeRatio: 0.25,
    speedMult: 0.60,
    jerkChance: 0.10,
    minSize: 5.5,
    maxSize: 6.5,
    description: "An old discarded soda can. Sinks like a rock to the aquarium gravel.",
  },
  {
    id: "worm",
    name: "Worm",
    category: "Misc",
    image: "/assets/fishing/misc/Worm.png",
    outline: "/assets/fishing/misc/Worm Outline.png",
    difficulty: 32,
    behavior: "floater",
    barSizeRatio: 0.24,
    speedMult: 0.70,
    jerkChance: 0.15,
    minSize: 2.5,
    maxSize: 5.0,
    description: "A squirming earthworm. Curious aquarium inhabitant or tempting bait!",
  },
];

export interface CaughtRecord {
  speciesId: string;
  count: number;
  bestSize: number;
  bestQuality: "normal" | "silver" | "gold" | "iridium";
  firstCaughtAt: number;
}

export class FishingGame {
  private activeAquariumId: string | null = null;
  private soundEnabled: boolean = true;
  private audioCtx: AudioContext | null = null;
  private onCatchBroadcast?: (fish: FishSpecies, size: number, quality: string) => void;
  private onControlsActiveChange?: (active: boolean) => void;

  // Collection records stored in localStorage
  private caughtRecords: Map<string, CaughtRecord> = new Map();

  // Active state
  private activeTankFilter: "all" | "salt" | "fresh" = "all";
  private isCasting: boolean = false;
  private biteTimer: any = null;
  private isBiteWindowOpen: boolean = false;
  private biteTimeout: any = null;
  private currentHookedFish: FishSpecies | null = null;

  // Stardew Valley Reeling Simulation State
  private isReelingGameActive: boolean = false;
  private animationFrameId: number | null = null;
  private lastSimTime: number = 0;

  // Physics constants (normalized height: 0 to 100)
  private readonly TRACK_HEIGHT_PX = 280; // height of the water gauge
  private barY: number = 0; // 0 = bottom, 100 = top
  private barVelocity: number = 0;
  private barHeightPercent: number = 20; // 17% - 25%
  private isHoldingInput: boolean = false;

  // Fish simulation state
  private fishY: number = 30; // 0 = bottom, 100 = top
  private fishTargetY: number = 30;
  private fishVelocity: number = 0;
  private fishTimer: number = 0;
  private fishNextChangeInterval: number = 0.5;

  // Progress meter
  private catchProgress: number = 25; // 0 to 100
  private perfectStreak: boolean = true; // did fish ever leave bar?
  private lastTickSoundAt: number = 0;

  // Swimming tank animation
  private tankAnimTimer: any = null;

  // DOM Elements
  private modalEl: HTMLElement | null = null;
  private btnClose: HTMLElement | null = null;
  private tabPlay: HTMLElement | null = null;
  private tabCollection: HTMLElement | null = null;
  private btnSound: HTMLElement | null = null;

  private playView: HTMLElement | null = null;
  private collectionView: HTMLElement | null = null;

  private castPanel: HTMLElement | null = null;
  private reelPanel: HTMLElement | null = null;
  private resultOverlay: HTMLElement | null = null;

  private btnCastLine: HTMLElement | null = null;
  private biteAlert: HTMLElement | null = null;
  private castStatusTitle: HTMLElement | null = null;
  private castStatusDesc: HTMLElement | null = null;

  private bobberBarEl: HTMLElement | null = null;
  private fishTargetEl: HTMLElement | null = null;
  private fishImgEl: HTMLImageElement | null = null;
  private hookSparksEl: HTMLElement | null = null;
  private catchFillEl: HTMLElement | null = null;
  private tensionStatusEl: HTMLElement | null = null;
  private waterColumnEl: HTMLElement | null = null;

  private resultSuccessBox: HTMLElement | null = null;
  private resultEscapeBox: HTMLElement | null = null;
  private resultFishImg: HTMLImageElement | null = null;
  private resultQualityBadge: HTMLElement | null = null;
  private resultCategoryBadge: HTMLElement | null = null;
  private resultFishName: HTMLElement | null = null;
  private resultFishSize: HTMLElement | null = null;
  private resultFishDesc: HTMLElement | null = null;
  private btnResultCastAgain: HTMLElement | null = null;
  private btnResultViewCollection: HTMLElement | null = null;
  private btnResultTryAgain: HTMLElement | null = null;

  private speciesCountEl: HTMLElement | null = null;
  private collectionGrid: HTMLElement | null = null;
  private collectionProgressText: HTMLElement | null = null;
  private collectionMiniBarFill: HTMLElement | null = null;
  private tankSwimmingPool: HTMLElement | null = null;
  private tankSwimmingCount: HTMLElement | null = null;

  constructor() {
    this.loadRecordsFromStorage();
  }

  public init() {
    this.cacheDOMElements();
    this.bindEvents();
    this.renderCollectionGrid();
    this.updateHeaderStats();
    this.renderVirtualTank();
  }

  public setBroadcastCallback(cb: (fish: FishSpecies, size: number, quality: string) => void) {
    this.onCatchBroadcast = cb;
  }

  public setControlsActiveCallback(cb: (active: boolean) => void) {
    this.onControlsActiveChange = cb;
  }

  public open(aquariumId: string) {
    this.activeAquariumId = aquariumId;
    if (!this.modalEl) this.cacheDOMElements();
    if (!this.modalEl) return;

    this.modalEl.classList.remove("hidden");
    this.onControlsActiveChange?.(false);
    this.switchTab("play");
    this.resetToCastStage();
    this.updateHeaderStats();
    this.renderVirtualTank();
  }

  public close() {
    this.stopReelGame();
    this.clearBiteTimers();
    this.activeAquariumId = null;
    if (this.modalEl) {
      this.modalEl.classList.add("hidden");
    }
    this.onControlsActiveChange?.(true);
  }

  public isOpen(): boolean {
    return !!(this.modalEl && !this.modalEl.classList.contains("hidden"));
  }

  private cacheDOMElements() {
    this.modalEl = document.getElementById("aquarium-modal");
    this.btnClose = document.getElementById("btn-close-aquarium-modal");
    this.tabPlay = document.getElementById("tab-aquarium-play");
    this.tabCollection = document.getElementById("tab-aquarium-collection");
    this.btnSound = document.getElementById("btn-aquarium-sound");

    this.playView = document.getElementById("aquarium-play-view");
    this.collectionView = document.getElementById("aquarium-collection-view");

    this.castPanel = document.getElementById("fishing-cast-panel");
    this.reelPanel = document.getElementById("fishing-reel-panel");
    this.resultOverlay = document.getElementById("fishing-result-overlay");

    this.btnCastLine = document.getElementById("btn-cast-fishing-line");
    this.biteAlert = document.getElementById("fishing-bite-alert");
    this.castStatusTitle = document.getElementById("fishing-cast-status-title");
    this.castStatusDesc = document.getElementById("fishing-cast-status-desc");

    this.bobberBarEl = document.getElementById("stardew-bobber-bar");
    this.fishTargetEl = document.getElementById("stardew-fish-target");
    this.fishImgEl = document.getElementById("stardew-fish-img") as HTMLImageElement;
    this.hookSparksEl = document.getElementById("stardew-hook-sparks");
    this.catchFillEl = document.getElementById("stardew-catch-fill");
    this.tensionStatusEl = document.getElementById("reel-tension-status");
    this.waterColumnEl = document.getElementById("stardew-water-column");

    this.resultSuccessBox = document.getElementById("result-success-box");
    this.resultEscapeBox = document.getElementById("result-escape-box");
    this.resultFishImg = document.getElementById("result-fish-img") as HTMLImageElement;
    this.resultQualityBadge = document.getElementById("result-quality-badge");
    this.resultCategoryBadge = document.getElementById("result-category-badge");
    this.resultFishName = document.getElementById("result-fish-name");
    this.resultFishSize = document.getElementById("result-fish-size");
    this.resultFishDesc = document.getElementById("result-fish-desc");
    this.btnResultCastAgain = document.getElementById("btn-result-cast-again");
    this.btnResultViewCollection = document.getElementById("btn-result-view-collection");
    this.btnResultTryAgain = document.getElementById("btn-result-try-again");

    this.speciesCountEl = document.getElementById("aquarium-species-count");
    this.collectionGrid = document.getElementById("aquarium-collection-grid");
    this.collectionProgressText = document.getElementById("collection-progress-text");
    this.collectionMiniBarFill = document.getElementById("collection-mini-bar-fill");
    this.tankSwimmingPool = document.getElementById("tank-swimming-pool");
    this.tankSwimmingCount = document.getElementById("tank-swimming-count");
  }

  private bindEvents() {
    this.btnClose?.addEventListener("click", () => this.close());
    this.modalEl?.addEventListener("click", (e) => {
      if (e.target === this.modalEl) {
        this.close();
      }
    });

    this.tabPlay?.addEventListener("click", () => this.switchTab("play"));
    this.tabCollection?.addEventListener("click", () => this.switchTab("collection"));

    this.btnSound?.addEventListener("click", () => {
      this.soundEnabled = !this.soundEnabled;
      if (this.btnSound) {
        this.btnSound.textContent = this.soundEnabled ? "🔊" : "🔇";
      }
    });

    // Tank filter buttons
    const filterButtons = document.querySelectorAll(".btn-tank-choice");
    filterButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        filterButtons.forEach((b) => b.classList.remove("active"));
        const target = e.currentTarget as HTMLElement;
        target.classList.add("active");
        this.activeTankFilter = (target.dataset.tank || "all") as "all" | "salt" | "fresh";
        this.resetToCastStage();
      });
    });

    // Cast button
    this.btnCastLine?.addEventListener("click", () => {
      this.startCastLine();
    });

    // Bite alert click (hook)
    this.biteAlert?.addEventListener("click", () => {
      if (this.isBiteWindowOpen) {
        this.onHookSuccess();
      }
    });

    // Result buttons
    this.btnResultCastAgain?.addEventListener("click", () => {
      this.resetToCastStage();
      this.startCastLine();
    });
    this.btnResultTryAgain?.addEventListener("click", () => {
      this.resetToCastStage();
      this.startCastLine();
    });
    this.btnResultViewCollection?.addEventListener("click", () => {
      this.switchTab("collection");
    });

    // Stardew Valley Reeling Controls (Mouse hold & Spacebar)
    // 1. Mouse down/up on entire modal when reeling is active
    window.addEventListener("mousedown", (e) => {
      if (!this.isOpen() || !this.isReelingGameActive) return;
      // If clicking close button or tabs, don't hijack
      const target = e.target as HTMLElement;
      if (target.closest(".modal-header") || target.closest(".btn-modal-close")) return;
      this.isHoldingInput = true;
    });

    window.addEventListener("mouseup", () => {
      if (this.isReelingGameActive) {
        this.isHoldingInput = false;
      }
    });

    // Touch support for mobile / touchpads
    window.addEventListener("touchstart", (e) => {
      if (!this.isOpen() || !this.isReelingGameActive) return;
      const target = e.target as HTMLElement;
      if (target.closest(".modal-header") || target.closest(".btn-modal-close")) return;
      this.isHoldingInput = true;
    }, { passive: true });

    window.addEventListener("touchend", () => {
      if (this.isReelingGameActive) {
        this.isHoldingInput = false;
      }
    });

    // 2. Keyboard Spacebar
    window.addEventListener("keydown", (e) => {
      if (!this.isOpen()) return;

      if (e.code === "Space") {
        e.preventDefault();
        if (this.isReelingGameActive) {
          this.isHoldingInput = true;
        } else if (this.isBiteWindowOpen) {
          this.onHookSuccess();
        } else if (!this.isCasting && this.playView && !this.playView.classList.contains("hidden")) {
          // If in cast view and not currently casted, cast line
          if (this.resultOverlay && !this.resultOverlay.classList.contains("hidden")) {
            this.resetToCastStage();
            this.startCastLine();
          } else {
            this.startCastLine();
          }
        }
      } else if (e.code === "Escape") {
        this.close();
      }
    });

    window.addEventListener("keyup", (e) => {
      if (!this.isOpen()) return;
      if (e.code === "Space") {
        if (this.isReelingGameActive) {
          this.isHoldingInput = false;
        }
      }
    });
  }

  private switchTab(tab: "play" | "collection") {
    if (tab === "play") {
      this.tabPlay?.classList.add("active");
      this.tabCollection?.classList.remove("active");
      this.playView?.classList.remove("hidden");
      this.collectionView?.classList.add("hidden");
    } else {
      this.tabPlay?.classList.remove("active");
      this.tabCollection?.classList.add("active");
      this.playView?.classList.add("hidden");
      this.collectionView?.classList.remove("hidden");
      this.stopReelGame();
      this.renderCollectionGrid();
      this.renderVirtualTank();
    }
  }

  // --- CASTING & BITE LOGIC ---

  private resetToCastStage() {
    this.stopReelGame();
    this.clearBiteTimers();
    this.isCasting = false;
    this.isBiteWindowOpen = false;
    this.currentHookedFish = null;

    this.castPanel?.classList.remove("hidden");
    this.reelPanel?.classList.add("hidden");
    this.resultOverlay?.classList.add("hidden");
    this.biteAlert?.classList.add("hidden");

    if (this.btnCastLine) {
      this.btnCastLine.removeAttribute("disabled");
      this.btnCastLine.innerHTML = "<span>🎣</span> Cast Fishing Line (Space)";
    }
    if (this.castStatusTitle) {
      this.castStatusTitle.textContent = "Cast your line into the aquarium";
    }
    if (this.castStatusDesc) {
      this.castStatusDesc.textContent = "Hold & release mechanics tuned for authentic Stardew Valley reel challenge!";
    }
  }

  private startCastLine() {
    if (this.isCasting) return;
    this.isCasting = true;
    this.playCastSound();

    if (this.btnCastLine) {
      this.btnCastLine.setAttribute("disabled", "true");
      this.btnCastLine.innerHTML = "<span>⏳</span> Line in water... Waiting...";
    }
    if (this.castStatusTitle) {
      this.castStatusTitle.textContent = "Line is cast... Watch for a bite!";
    }
    if (this.castStatusDesc) {
      this.castStatusDesc.textContent = "When you see '❗ HIT!', click quickly or press Space to hook the fish!";
    }

    // Select random fish from current filter
    this.currentHookedFish = this.pickRandomFish(this.activeTankFilter);

    // Random bite wait: 1.2 to 2.8 seconds
    const waitTime = 1200 + Math.random() * 1600;
    this.biteTimer = setTimeout(() => {
      this.triggerBiteWindow();
    }, waitTime);
  }

  private pickRandomFish(filter: "all" | "salt" | "fresh"): FishSpecies {
    let pool = FISH_SPECIES;
    if (filter === "salt") {
      pool = FISH_SPECIES.filter((f) => f.category === "Salt Water" || f.category === "Misc");
    } else if (filter === "fresh") {
      pool = FISH_SPECIES.filter((f) => f.category === "Fresh Water" || f.category === "Misc");
    }

    // Weighted selection: slightly higher weight for fish not yet caught to encourage discovery!
    const weights = pool.map((fish) => {
      const rec = this.caughtRecords.get(fish.id);
      return rec ? 1 : 2.2;
    });
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let rand = Math.random() * totalWeight;
    for (let i = 0; i < pool.length; i++) {
      rand -= weights[i];
      if (rand <= 0) {
        return pool[i];
      }
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  private triggerBiteWindow() {
    this.isBiteWindowOpen = true;
    this.playBiteSound();

    this.biteAlert?.classList.remove("hidden");

    // Player has 1.4 seconds to react
    this.biteTimeout = setTimeout(() => {
      if (this.isBiteWindowOpen) {
        // Missed bite
        this.isBiteWindowOpen = false;
        this.biteAlert?.classList.add("hidden");
        this.playEscapeSound();
        if (this.castStatusTitle) {
          this.castStatusTitle.textContent = "The fish got away!";
        }
        if (this.castStatusDesc) {
          this.castStatusDesc.textContent = "You missed the bite window. Cast your line again!";
        }
        if (this.btnCastLine) {
          this.btnCastLine.removeAttribute("disabled");
          this.btnCastLine.innerHTML = "<span>🎣</span> Cast Again (Space)";
        }
        this.isCasting = false;
      }
    }, 1400);
  }

  private onHookSuccess() {
    this.clearBiteTimers();
    this.isBiteWindowOpen = false;
    this.biteAlert?.classList.add("hidden");
    this.playHookSound();

    // Start Reeling Minigame!
    this.startReelGame(this.currentHookedFish || FISH_SPECIES[0]);
  }

  private clearBiteTimers() {
    if (this.biteTimer) {
      clearTimeout(this.biteTimer);
      this.biteTimer = null;
    }
    if (this.biteTimeout) {
      clearTimeout(this.biteTimeout);
      this.biteTimeout = null;
    }
  }

  // --- STARDEW VALLEY REELING ENGINE ---

  private startReelGame(fish: FishSpecies) {
    this.currentHookedFish = fish;
    this.isReelingGameActive = true;
    this.isHoldingInput = false;

    // Initial parameters
    this.barHeightPercent = Math.max(16, Math.min(26, Math.round(fish.barSizeRatio * 100)));
    this.barY = 10;
    this.barVelocity = 0;

    this.fishY = 35;
    this.fishTargetY = 35;
    this.fishVelocity = 0;
    this.fishTimer = 0;
    this.fishNextChangeInterval = 0.4 + Math.random() * 0.4;

    this.catchProgress = 25; // starts at 25%
    this.perfectStreak = true;

    // Update fish image
    if (this.fishImgEl) {
      this.fishImgEl.src = fish.image;
    }

    // Set Bobber bar height in DOM
    if (this.bobberBarEl) {
      this.bobberBarEl.style.height = `${this.barHeightPercent}%`;
    }

    // Switch panels
    this.castPanel?.classList.add("hidden");
    this.reelPanel?.classList.remove("hidden");
    this.resultOverlay?.classList.add("hidden");

    this.lastSimTime = performance.now();
    this.runReelLoop();
  }

  private runReelLoop = () => {
    if (!this.isReelingGameActive) return;

    const now = performance.now();
    const dt = Math.min((now - this.lastSimTime) / 1000, 0.05); // cap at 50ms to prevent jumping
    this.lastSimTime = now;

    this.updateReelPhysics(dt);
    this.renderReelFrame();

    // Check game over
    if (this.catchProgress >= 100) {
      this.onCatchSuccess();
      return;
    } else if (this.catchProgress <= 0) {
      this.onCatchFailed();
      return;
    }

    this.animationFrameId = requestAnimationFrame(this.runReelLoop);
  };

  private updateReelPhysics(dt: number) {
    const fish = this.currentHookedFish || FISH_SPECIES[0];

    // 1. Bobber Bar Physics (0 = bottom, 100 - barHeight = top)
    const maxBarY = 100 - this.barHeightPercent;
    const liftAccel = 1500; // upward acceleration (%/s^2)
    const gravity = 980; // downward gravity (%/s^2)
    const maxUpVel = 480;
    const maxDownVel = -620;

    if (this.isHoldingInput) {
      this.barVelocity += liftAccel * dt;
    } else {
      this.barVelocity -= gravity * dt;
    }

    // Clamping velocity
    this.barVelocity = Math.max(maxDownVel, Math.min(maxUpVel, this.barVelocity));
    this.barY += (this.barVelocity * dt) / 5; // scaled to 0-100 coordinate space

    // Bottom collision & Stardew bounce
    if (this.barY <= 0) {
      this.barY = 0;
      if (this.barVelocity < -40) {
        this.barVelocity = -this.barVelocity * 0.32; // bouncy bottom!
      } else {
        this.barVelocity = 0;
      }
    } else if (this.barY >= maxBarY) {
      this.barY = maxBarY;
      this.barVelocity = 0;
    }

    // 2. Fish Behavioral AI Movement
    this.fishTimer += dt;
    if (this.fishTimer >= this.fishNextChangeInterval) {
      this.fishTimer = 0;
      // Target interval scales inversely with difficulty
      const baseInterval = 0.9 - (fish.difficulty / 100) * 0.5; // 0.4s to 0.7s
      this.fishNextChangeInterval = Math.max(0.28, baseInterval + (Math.random() - 0.5) * 0.3);

      this.pickNextFishTarget(fish);
    }

    // Smoothly steer fish toward target with behavioral acceleration
    const distToTarget = this.fishTargetY - this.fishY;
    const fishMaxSpeed = (55 + fish.difficulty * 0.95) * fish.speedMult; // high speed for medium-hard!
    const fishAccel = 680 * fish.speedMult;

    if (Math.abs(distToTarget) > 1) {
      const dir = Math.sign(distToTarget);
      this.fishVelocity += dir * fishAccel * dt;
      this.fishVelocity = Math.max(-fishMaxSpeed, Math.min(fishMaxSpeed, this.fishVelocity));
    } else {
      this.fishVelocity *= 0.85; // damping when close
    }

    // Subtle sinusoidal wobble
    const wobble = Math.sin(nowMs() * 0.008) * (2.0 + fish.difficulty * 0.04);
    this.fishY += (this.fishVelocity * dt) / 4 + wobble * dt;
    this.fishY = Math.max(2, Math.min(94, this.fishY));

    // 3. Collision Check: Is fish inside the green bar?
    // Fish height is roughly 6%
    const fishCenter = this.fishY + 3;
    const isInsideBar = fishCenter >= this.barY && fishCenter <= this.barY + this.barHeightPercent;

    // 4. Catch Progress Fill / Drain (Medium to Hard Tuning)
    const fillRate = 12.0; // takes ~7 seconds of solid tracking to fill 100%
    const drainRate = 14.5; // drains faster to make it medium-hard!

    if (isInsideBar) {
      this.catchProgress += fillRate * dt;
      // Audio tick every 180ms while tracking
      if (performance.now() - this.lastTickSoundAt > 180) {
        this.playReelTickSound();
        this.lastTickSoundAt = performance.now();
      }
    } else {
      this.catchProgress -= drainRate * dt;
      this.perfectStreak = false;
    }

    this.catchProgress = Math.max(0, Math.min(100, this.catchProgress));
  }

  private pickNextFishTarget(fish: FishSpecies) {
    const isJerk = Math.random() < fish.jerkChance;

    switch (fish.behavior) {
      case "dart": {
        // Sudden violent jump up or down
        if (isJerk) {
          const delta = (30 + Math.random() * 45) * (Math.random() > 0.5 ? 1 : -1);
          this.fishTargetY = Math.max(5, Math.min(92, this.fishY + delta));
        } else {
          this.fishTargetY = 10 + Math.random() * 80;
        }
        break;
      }
      case "sinker": {
        // Biased heavily toward bottom 35%, occasional leap up
        if (Math.random() < 0.65) {
          this.fishTargetY = 5 + Math.random() * 28;
        } else {
          this.fishTargetY = 45 + Math.random() * 45;
        }
        break;
      }
      case "floater": {
        // Biased heavily toward top 35%, occasional dive
        if (Math.random() < 0.65) {
          this.fishTargetY = 65 + Math.random() * 28;
        } else {
          this.fishTargetY = 15 + Math.random() * 40;
        }
        break;
      }
      case "smooth": {
        // Continuous smooth wandering
        this.fishTargetY = 15 + Math.random() * 70;
        break;
      }
      case "mixed":
      default: {
        // Mixture of steady and sudden darts
        if (isJerk) {
          const delta = (25 + Math.random() * 40) * (Math.random() > 0.5 ? 1 : -1);
          this.fishTargetY = Math.max(5, Math.min(92, this.fishY + delta));
        } else {
          this.fishTargetY = 10 + Math.random() * 80;
        }
        break;
      }
    }
  }

  private renderReelFrame() {
    // 1. Position Bobber Bar (bottom: barY %)
    if (this.bobberBarEl) {
      this.bobberBarEl.style.bottom = `${this.barY}%`;
    }

    // 2. Position Fish (bottom: fishY %)
    if (this.fishTargetEl) {
      this.fishTargetEl.style.bottom = `${this.fishY}%`;
    }

    // 3. Update Catch Progress Meter Fill
    if (this.catchFillEl) {
      this.catchFillEl.style.height = `${this.catchProgress}%`;
      // Change color based on progress tension
      if (this.catchProgress > 60) {
        this.catchFillEl.style.background = "linear-gradient(to top, #10b981, #34d399, #6ee7b7)";
      } else if (this.catchProgress > 25) {
        this.catchFillEl.style.background = "linear-gradient(to top, #f59e0b, #fbbf24, #fde68a)";
      } else {
        this.catchFillEl.style.background = "linear-gradient(to top, #ef4444, #f87171, #fca5a5)";
      }
    }

    // 4. Visual feedback: glow & sparks when inside
    const fishCenter = this.fishY + 3;
    const isInsideBar = fishCenter >= this.barY && fishCenter <= this.barY + this.barHeightPercent;

    if (isInsideBar) {
      this.bobberBarEl?.classList.add("hooked");
      this.hookSparksEl?.classList.remove("hidden");
      if (this.tensionStatusEl) {
        this.tensionStatusEl.textContent = "REELING IN! 🟢";
        this.tensionStatusEl.style.color = "#34d399";
      }
    } else {
      this.bobberBarEl?.classList.remove("hooked");
      this.hookSparksEl?.classList.add("hidden");
      if (this.tensionStatusEl) {
        this.tensionStatusEl.textContent = "FISH ESCAPING! 🔴";
        this.tensionStatusEl.style.color = "#f87171";
      }
    }
  }

  private onCatchSuccess() {
    this.stopReelGame();
    this.playSuccessSound();

    const fish = this.currentHookedFish || FISH_SPECIES[0];

    // Determine random size
    const sizeRange = fish.maxSize - fish.minSize;
    const measuredSize = parseFloat((fish.minSize + Math.random() * sizeRange).toFixed(1));

    // Determine Star Quality based on difficulty & perfect streak
    let quality: "normal" | "silver" | "gold" | "iridium" = "normal";
    if (this.perfectStreak) {
      quality = "iridium";
    } else if (this.catchProgress > 80 && Math.random() > 0.3) {
      quality = "gold";
    } else if (Math.random() > 0.4) {
      quality = "silver";
    }

    // Save record to persistent storage
    this.saveCatchRecord(fish.id, measuredSize, quality);

    // Broadcast rare or gold catches to park chat
    if (quality === "gold" || quality === "iridium" || fish.difficulty >= 80) {
      if (this.onCatchBroadcast) {
        this.onCatchBroadcast(fish, measuredSize, quality);
      }
    }

    // Display Success Screen
    if (this.resultSuccessBox) this.resultSuccessBox.classList.remove("hidden");
    if (this.resultEscapeBox) this.resultEscapeBox.classList.add("hidden");
    if (this.resultOverlay) this.resultOverlay.classList.remove("hidden");

    if (this.resultFishImg) this.resultFishImg.src = fish.image;
    if (this.resultFishName) this.resultFishName.textContent = fish.name;
    if (this.resultFishSize) {
      this.resultFishSize.innerHTML = `Size: <strong>${measuredSize} in</strong>`;
    }
    if (this.resultFishDesc) this.resultFishDesc.textContent = fish.description;
    if (this.resultCategoryBadge) this.resultCategoryBadge.textContent = fish.category;

    if (this.resultQualityBadge) {
      this.resultQualityBadge.className = `result-quality-badge quality-${quality}`;
      const labels = {
        normal: "Normal Quality",
        silver: "★ Silver Star",
        gold: "★ Gold Star",
        iridium: "★★★ Iridium Star!",
      };
      this.resultQualityBadge.textContent = labels[quality];
    }

    this.updateHeaderStats();
    this.renderVirtualTank();
  }

  private onCatchFailed() {
    this.stopReelGame();
    this.playEscapeSound();

    if (this.resultSuccessBox) this.resultSuccessBox.classList.add("hidden");
    if (this.resultEscapeBox) this.resultEscapeBox.classList.remove("hidden");
    if (this.resultOverlay) this.resultOverlay.classList.remove("hidden");
  }

  private stopReelGame() {
    this.isReelingGameActive = false;
    this.isHoldingInput = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  // --- PERSISTENCE & COLLECTION JOURNAL ---

  private loadRecordsFromStorage() {
    try {
      const raw = localStorage.getItem("lepark_fish_records");
      if (raw) {
        const parsed: Record<string, CaughtRecord> = JSON.parse(raw);
        for (const [k, v] of Object.entries(parsed)) {
          this.caughtRecords.set(k, v);
        }
      }
    } catch (e) {
      console.warn("Failed to load fish records:", e);
    }
  }

  private saveCatchRecord(
    speciesId: string,
    size: number,
    quality: "normal" | "silver" | "gold" | "iridium"
  ) {
    const existing = this.caughtRecords.get(speciesId);
    const qualityRanks = { normal: 1, silver: 2, gold: 3, iridium: 4 };

    if (existing) {
      existing.count += 1;
      existing.bestSize = Math.max(existing.bestSize, size);
      if (qualityRanks[quality] > qualityRanks[existing.bestQuality]) {
        existing.bestQuality = quality;
      }
    } else {
      this.caughtRecords.set(speciesId, {
        speciesId,
        count: 1,
        bestSize: size,
        bestQuality: quality,
        firstCaughtAt: Date.now(),
      });
    }

    try {
      const obj: Record<string, CaughtRecord> = {};
      this.caughtRecords.forEach((v, k) => (obj[k] = v));
      localStorage.setItem("lepark_fish_records", JSON.stringify(obj));
    } catch (e) {
      console.warn("Failed to save fish records:", e);
    }
  }

  private updateHeaderStats() {
    const caughtCount = this.caughtRecords.size;
    if (this.speciesCountEl) {
      this.speciesCountEl.textContent = String(caughtCount);
    }
    if (this.collectionProgressText) {
      this.collectionProgressText.textContent = `${caughtCount} of 12 Caught`;
    }
    if (this.collectionMiniBarFill) {
      const pct = Math.round((caughtCount / 12) * 100);
      this.collectionMiniBarFill.style.width = `${pct}%`;
    }
  }

  private renderCollectionGrid() {
    const grid = this.collectionGrid;
    if (!grid) return;
    grid.innerHTML = "";

    FISH_SPECIES.forEach((fish) => {
      const record = this.caughtRecords.get(fish.id);
      const isDiscovered = !!record;

      const card = document.createElement("div");
      card.className = `aquarium-fish-card ${isDiscovered ? "discovered" : "locked"}`;

      const qualityBadgeHtml = isDiscovered
        ? `<span class="fish-card-star star-${record.bestQuality}">★ ${record.bestQuality.toUpperCase()}</span>`
        : "";

      card.innerHTML = `
        <div class="fish-card-thumb">
          <img src="${isDiscovered ? fish.image : fish.outline}" 
               alt="${isDiscovered ? fish.name : 'Unknown Fish'}" 
               class="fish-thumb-img ${isDiscovered ? '' : 'fish-outline-silhouette'}" />
          ${qualityBadgeHtml}
        </div>
        <div class="fish-card-info">
          <div class="fish-card-name-row">
            <h4 class="fish-card-name">${isDiscovered ? fish.name : "???"}</h4>
            <span class="fish-card-badge">${fish.category}</span>
          </div>
          <div class="fish-card-stats">
            <span>Difficulty: <strong>${fish.difficulty}</strong></span>
            ${
              isDiscovered
                ? `<span>Record: <strong>${record.bestSize} in</strong></span>
                   <span>Caught: <strong>${record.count}x</strong></span>`
                : `<span>Status: <em>Undiscovered</em></span>`
            }
          </div>
          <p class="fish-card-desc">${isDiscovered ? fish.description : "Cast your line in the aquarium to discover this species!"}</p>
        </div>
      `;

      grid.appendChild(card);
    });
  }

  private renderVirtualTank() {
    if (!this.tankSwimmingPool) return;
    this.tankSwimmingPool.innerHTML = "";

    const caughtSpecies = FISH_SPECIES.filter((f) => this.caughtRecords.has(f.id));
    if (this.tankSwimmingCount) {
      this.tankSwimmingCount.textContent = String(caughtSpecies.length);
    }

    if (caughtSpecies.length === 0) {
      const emptyNote = document.createElement("div");
      emptyNote.className = "tank-empty-note";
      emptyNote.textContent = "Your aquarium is currently quiet. Catch fish to watch them swim here!";
      this.tankSwimmingPool.appendChild(emptyNote);
      return;
    }

    caughtSpecies.forEach((fish, idx) => {
      const swimmer = document.createElement("div");
      swimmer.className = "tank-swimmer";
      swimmer.style.top = `${15 + (idx * 23) % 65}%`;
      swimmer.style.animationDuration = `${6 + (idx % 4) * 2}s`;
      swimmer.style.animationDelay = `${idx * 0.7}s`;

      swimmer.innerHTML = `
        <img src="${fish.image}" alt="${fish.name}" class="swimmer-sprite" title="${fish.name}" />
      `;
      this.tankSwimmingPool?.appendChild(swimmer);
    });
  }

  // --- SYNTHESIZED WEB AUDIO RETRO SFX ---

  private getAudioContext(): AudioContext | null {
    if (!this.soundEnabled) return null;
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  private playCastSound() {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(450, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.22);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    } catch {}
  }

  private playBiteSound() {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      // High-pitched retro PING!
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {}
  }

  private playHookSound() {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(950, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } catch {}
  }

  private playReelTickSound() {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(240, ctx.currentTime);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.035);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.035);
    } catch {}
  }

  private playSuccessSound() {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      // Stardew style fanfare arpeggio: C5 -> E5 -> G5 -> C6
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
        gain.gain.setValueAtTime(0.28, ctx.currentTime + idx * 0.1);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + idx * 0.1 + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.1);
        osc.stop(ctx.currentTime + idx * 0.1 + 0.28);
      });
    } catch {}
  }

  private playEscapeSound() {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      // Sad descending buzz
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(380, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.35);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {}
  }
}

function nowMs(): number {
  return performance.now();
}
