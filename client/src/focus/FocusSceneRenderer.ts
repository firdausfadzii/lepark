import {
  DEFAULT_PLAYER_OUTFIT,
  FocusLoopState,
  FocusSquadMember,
  ResolvedFocusTheme,
  normalizeFrames,
} from "shared";
import { renderFashionPreviewFrame } from "../fashionRenderer";
import { resolveSheetFrameUrl } from "../spriteSheetResolver";

interface AtlasFrameRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface LoadedAtlas {
  image: HTMLImageElement;
  frames: Map<string, AtlasFrameRect>;
}

interface ParticipantVisualCache {
  key: string;
  images: HTMLImageElement[];
  loaded: boolean;
}

export interface FocusSceneRenderConfig {
  theme: ResolvedFocusTheme;
  loopState: FocusLoopState;
  participants: FocusSquadMember[];
  localUserId: number;
  localSessionId: string | null;
}

const DEFAULT_LOGICAL_W = 320;
const DEFAULT_LOGICAL_H = 180;
const TARGET_FPS = 15;

/**
 * Low-CPU crisp pixel-art scene renderer for the full-screen Focus Room modal.
 * Dynamically adapts its pixel grid to fit mobile portrait, mobile landscape,
 * and desktop stages without cropping, and animates cozy ambient details.
 */
export class FocusSceneRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: FocusSceneRenderConfig;
  private timerId: number | null = null;
  private tickCount = 0;
  private destroyed = false;

  private logicalW = DEFAULT_LOGICAL_W;
  private logicalH = DEFAULT_LOGICAL_H;
  private resizeObserver: ResizeObserver | null = null;
  private windowResizeHandler: () => void;

  private atlasPromises = new Map<string, Promise<LoadedAtlas | null>>();
  private atlases = new Map<string, LoadedAtlas>();
  private avatarCache = new Map<string, ParticipantVisualCache>();

  private visibilityHandler: () => void;

  constructor(canvas: HTMLCanvasElement, initialConfig: FocusSceneRenderConfig) {
    this.canvas = canvas;
    const ctx = this.canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not acquire 2D canvas context for FocusSceneRenderer");
    }
    this.ctx = ctx;
    this.config = initialConfig;

    this.updateCanvasResolution();

    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(() => {
        if (this.updateCanvasResolution() && !this.destroyed && !document.hidden) {
          this.renderFrame();
        }
      });
      this.resizeObserver.observe(this.canvas);
    }

    this.windowResizeHandler = () => {
      if (this.updateCanvasResolution() && !this.destroyed && !document.hidden) {
        this.renderFrame();
      }
    };
    window.addEventListener("resize", this.windowResizeHandler);

    void this.preloadAtlases();
    void this.syncParticipantsAvatars();

    this.visibilityHandler = () => {
      if (document.hidden) {
        this.pauseLoop();
      } else if (!this.destroyed) {
        this.updateCanvasResolution();
        this.startLoop();
        this.renderFrame();
      }
    };
    document.addEventListener("visibilitychange", this.visibilityHandler);

    this.renderFrame();
    if (!document.hidden) {
      this.startLoop();
    }
  }

  private updateCanvasResolution(): boolean {
    const cssW = this.canvas.clientWidth;
    const cssH = this.canvas.clientHeight;

    let nextW = DEFAULT_LOGICAL_W;
    let nextH = DEFAULT_LOGICAL_H;

    if (cssW >= 120 && cssH >= 90) {
      const targetScale = Math.max(
        2,
        Math.min(4, Math.floor(Math.min(cssW / 185, cssH / 138)))
      );
      nextW = Math.max(176, Math.min(480, Math.round(cssW / targetScale)));
      nextH = Math.max(128, Math.min(280, Math.round(cssH / targetScale)));
    }

    if (this.canvas.width !== nextW || this.canvas.height !== nextH) {
      this.logicalW = nextW;
      this.logicalH = nextH;
      this.canvas.width = nextW;
      this.canvas.height = nextH;
      this.ctx.imageSmoothingEnabled = false;
      return true;
    }
    return false;
  }

  public updateConfig(nextConfig: FocusSceneRenderConfig): void {
    this.config = nextConfig;
    void this.syncParticipantsAvatars();
    if (!document.hidden) {
      this.renderFrame();
    }
  }

  public destroy(): void {
    this.destroyed = true;
    this.pauseLoop();
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    window.removeEventListener("resize", this.windowResizeHandler);
    document.removeEventListener("visibilitychange", this.visibilityHandler);
  }

  private startLoop(): void {
    if (this.timerId !== null || this.destroyed) return;
    this.timerId = window.setInterval(() => {
      if (document.hidden || this.destroyed) return;
      this.tickCount++;
      this.renderFrame();
    }, Math.round(1000 / TARGET_FPS));
  }

  private pauseLoop(): void {
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  private async preloadAtlases(): Promise<void> {
    await Promise.all([
      this.loadAtlas(
        "decoration_free",
        "/assets/decoration/decoration_free.json",
        "/assets/decoration/decoration_free.png"
      ),
      this.loadAtlas(
        "guild",
        "/assets/decoration/adventure_guild_sprites.json",
        "/assets/decoration/adventure_guild_spritesheet.png"
      ),
    ]);
    if (!this.destroyed && !document.hidden) {
      this.renderFrame();
    }
  }

  private loadAtlas(key: string, jsonUrl: string, imgUrl: string): Promise<LoadedAtlas | null> {
    const existing = this.atlasPromises.get(key);
    if (existing) return existing;

    const promise = (async (): Promise<LoadedAtlas | null> => {
      try {
        const res = await fetch(jsonUrl);
        if (!res.ok) return null;
        const rawText = (await res.text()).replace(/^\uFEFF/, "");
        const json = JSON.parse(rawText);
        const frames = new Map<string, AtlasFrameRect>();

        if (Array.isArray(json.frames)) {
          for (const item of json.frames) {
            if (item?.filename && item?.frame) {
              frames.set(item.filename, item.frame);
            }
          }
        } else if (json.frames && typeof json.frames === "object") {
          for (const [name, entry] of Object.entries<any>(json.frames)) {
            if (entry?.frame) {
              frames.set(name, entry.frame);
            }
          }
        }

        const image = await this.loadImage(imgUrl);
        const loaded: LoadedAtlas = { image, frames };
        this.atlases.set(key, loaded);
        return loaded;
      } catch {
        return null;
      }
    })();

    this.atlasPromises.set(key, promise);
    return promise;
  }

  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load ${url}`));
      img.src = url;
    });
  }

  private async syncParticipantsAvatars(): Promise<void> {
    const list = this.config.participants;
    await Promise.all(
      list.map(async (p) => {
        const outfitKey = p.outfit ? JSON.stringify(p.outfit) : "";
        const avatarKey = p.avatar || "";
        const customFrames = normalizeFrames(p.avatars?.idle);
        const cacheKey = `${p.userId}:${p.sessionId || ""}:${avatarKey}:${customFrames[0] || ""}:${outfitKey}`;

        if (this.avatarCache.has(cacheKey)) return;
        const entry: ParticipantVisualCache = {
          key: cacheKey,
          images: [],
          loaded: false,
        };
        this.avatarCache.set(cacheKey, entry);

        try {
          if (customFrames.length > 0) {
            const imgs = await Promise.all(
              customFrames.slice(0, 4).map(async (rawRef) => {
                if (rawRef.startsWith("sheet:")) {
                  const dataUrl = await resolveSheetFrameUrl(rawRef);
                  return await this.loadImage(dataUrl);
                }
                return await this.loadImage(rawRef);
              })
            );
            entry.images = imgs;
            entry.loaded = true;
          } else {
            const outfit = { ...DEFAULT_PLAYER_OUTFIT, ...(p.outfit || {}) };
            const urls = await Promise.all([
              renderFashionPreviewFrame(outfit, 0, 0, false),
              renderFashionPreviewFrame(outfit, 0, 1, false),
              renderFashionPreviewFrame(outfit, 0, 2, false),
              renderFashionPreviewFrame(outfit, 0, 3, false),
            ]);
            entry.images = await Promise.all(urls.filter(Boolean).map((u) => this.loadImage(u)));
            entry.loaded = entry.images.length > 0;
          }
        } catch {
          // Safe fallback drawn below if image loading fails
        }
      })
    );
  }

  private getParticipantFrames(p: FocusSquadMember): HTMLImageElement[] {
    const outfitKey = p.outfit ? JSON.stringify(p.outfit) : "";
    const avatarKey = p.avatar || "";
    const customFrames = normalizeFrames(p.avatars?.idle);
    const cacheKey = `${p.userId}:${p.sessionId || ""}:${avatarKey}:${customFrames[0] || ""}:${outfitKey}`;
    return this.avatarCache.get(cacheKey)?.images || [];
  }

  private drawAtlasProp(
    atlasKey: string,
    frameName: string,
    dx: number,
    dy: number,
    dw: number,
    dh: number
  ): boolean {
    const atlas = this.atlases.get(atlasKey);
    if (!atlas) return false;
    const rect = atlas.frames.get(frameName);
    if (!rect) return false;
    this.ctx.drawImage(
      atlas.image,
      rect.x,
      rect.y,
      rect.w,
      rect.h,
      Math.round(dx),
      Math.round(dy),
      Math.round(dw),
      Math.round(dh)
    );
    return true;
  }

  private renderFrame(): void {
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, this.logicalW, this.logicalH);

    switch (this.config.theme) {
      case "office":
        this.drawOfficeScene();
        break;
      case "lounge":
        this.drawLoungeScene();
        break;
      case "guild":
        this.drawGuildScene();
        break;
      case "living_room":
        this.drawLivingRoomScene();
        break;
      case "pet_shop":
        this.drawPetShopScene();
        break;
      case "park":
      default:
        this.drawParkScene();
        break;
    }

    if (this.config.loopState === "break_reward") {
      this.drawBreakCelebration();
    }
  }

  // =========================================================
  // Shared Seat & Animation Helpers
  // =========================================================

  private getSeatPositions(count: number, baseY: number): Array<{ x: number; y: number; scale: number }> {
    const W = this.logicalW;
    const cx = Math.round(W / 2);
    const clamped = Math.max(1, Math.min(8, count));
    const narrow = W < 225;
    const widthFactor = narrow ? 0.88 : 1.0;

    if (clamped === 1) {
      return [{ x: cx, y: baseY, scale: narrow ? 1.15 : 1.28 }];
    }

    const forceTwoRows = clamped > 4 || (narrow && clamped >= 3);
    if (!forceTwoRows) {
      const maxSpan = Math.max(84, W - 64);
      const desiredSpan = clamped === 2 ? 105 : clamped === 3 ? 168 : 220;
      const span = Math.min(maxSpan, desiredSpan);
      const startX = cx - span / 2;
      const step = span / (clamped - 1);
      const scale = (clamped <= 2 ? 1.12 : 0.98) * widthFactor;
      return Array.from({ length: clamped }, (_, i) => ({
        x: Math.round(startX + i * step),
        y: baseY,
        scale,
      }));
    }

    const backCount = Math.ceil(clamped / 2);
    const frontCount = clamped - backCount;
    const positions: Array<{ x: number; y: number; scale: number }> = [];

    const backSpan = Math.min(Math.max(80, W - 68), backCount * 54);
    const backStep = backCount > 1 ? backSpan / (backCount - 1) : 0;
    for (let i = 0; i < backCount; i++) {
      positions.push({
        x: Math.round(cx - backSpan / 2 + i * backStep),
        y: baseY - 22,
        scale: 0.86 * widthFactor,
      });
    }

    const frontSpan = Math.min(Math.max(84, W - 60), frontCount * 58);
    const frontStep = frontCount > 1 ? frontSpan / (frontCount - 1) : 0;
    for (let i = 0; i < frontCount; i++) {
      positions.push({
        x: Math.round(cx - frontSpan / 2 + i * frontStep),
        y: baseY + 11,
        scale: 0.96 * widthFactor,
      });
    }
    return positions;
  }

  private drawParticipantAvatar(
    p: FocusSquadMember,
    cx: number,
    cy: number,
    scale: number,
    options?: { typingBob?: boolean; glowColor?: string }
  ): void {
    const ctx = this.ctx;
    const isBreak = this.config.loopState === "break_reward";
    const t = this.tickCount;
    const phase = (p.userId || 1) % 5;

    const bob = isBreak
      ? ((t + phase) % 8 < 4 ? -2 : 0)
      : options?.typingBob
        ? ((t + phase) % 5 === 0 ? -1 : 0)
        : ((t + phase) % 10 < 5 ? 0 : 1);

    const drawSize = Math.round(32 * scale);
    const x = Math.round(cx - drawSize / 2);
    const y = Math.round(cy - drawSize + bob);

    // Subtle ground shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.fillRect(Math.round(cx - 8 * scale), Math.round(cy - 3), Math.round(16 * scale), 3);

    // Soft screen/candle glow tint behind avatar
    if (options?.glowColor) {
      const pulse = 0.8 + 0.2 * Math.sin((t + phase * 3) * 0.22);
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.fillStyle = options.glowColor;
      ctx.fillRect(x + 3, y + 5, drawSize - 6, drawSize - 8);
      ctx.restore();
    }

    const frames = this.getParticipantFrames(p);
    if (frames.length > 0) {
      const frameIdx = Math.floor((t + phase * 2) / 4) % frames.length;
      ctx.drawImage(frames[frameIdx], x, y, drawSize, drawSize);
    } else {
      ctx.fillStyle = p.color || "#3B8282";
      ctx.fillRect(cx - 5, cy - 16 + bob, 10, 12);
      ctx.fillStyle = "#faf3e8";
      ctx.fillRect(cx - 4, cy - 23 + bob, 8, 7);
    }

    // Subtle rising focus sparkle when actively focusing
    if (!isBreak && (t + phase * 7) % 24 < 8) {
      const sy = y - 2 - Math.floor(((t + phase * 7) % 8) / 2);
      const sx = cx + ((phase % 2 === 0 ? 1 : -1) * 7);
      ctx.fillStyle = "rgba(94, 234, 212, 0.65)";
      ctx.fillRect(sx, sy, 1, 1);
    }

    // Pixel nameplate underneath
    const isSelf =
      (this.config.localUserId > 0 && p.userId === this.config.localUserId) ||
      (this.config.localSessionId && p.sessionId === this.config.localSessionId);
    const label = (p.name || "Explorer").slice(0, 10);
    ctx.font = "bold 7px monospace";
    const textW = Math.ceil(ctx.measureText(label).width);
    const boxW = textW + 6;
    const boxX = Math.round(cx - boxW / 2);
    const boxY = Math.round(cy + 14);
    ctx.fillStyle = isSelf ? "rgba(59, 130, 130, 0.92)" : "rgba(15, 25, 25, 0.78)";
    ctx.fillRect(boxX, boxY, boxW, 10);
    ctx.strokeStyle = isSelf ? "#ECA239" : "rgba(155, 176, 176, 0.35)";
    ctx.lineWidth = 1;
    ctx.strokeRect(boxX + 0.5, boxY + 0.5, boxW - 1, 9);
    ctx.fillStyle = "#F8F9F6";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, cx, boxY + 5.5);
  }

  private drawCoffeeSteam(x: number, y: number, offsetSeed: number): void {
    const ctx = this.ctx;
    const t = this.tickCount + offsetSeed * 3;
    for (let i = 0; i < 3; i++) {
      const life = Math.floor((t + i * 5) / 3) % 9;
      const sway = Math.round(Math.sin((t + i * 7) * 0.28) * 1.4);
      const alpha = Math.max(0.1, 0.55 - life * 0.055);
      ctx.fillStyle = `rgba(248, 249, 246, ${alpha.toFixed(2)})`;
      ctx.fillRect(x + sway + (i % 2), y - life, 1, 1);
    }
  }

  private drawAmbientMotes(
    count: number,
    color: string,
    minY: number,
    maxY: number,
    seedOffset = 0
  ): void {
    const ctx = this.ctx;
    const t = this.tickCount;
    const W = this.logicalW;
    const spanY = Math.max(12, maxY - minY);
    for (let i = 0; i < count; i++) {
      const mx = Math.round(
        ((i * 47 + seedOffset * 13 + t * 0.35 * (i % 2 === 0 ? 1 : -0.7)) % W + W) % W
      );
      const my = Math.round(
        minY + ((i * 23 + Math.sin((t + i * 9) * 0.09) * 8) % spanY + spanY) % spanY
      );
      const bright = (t + i * 5) % 18 < 10;
      ctx.fillStyle = bright ? color : "rgba(248, 249, 246, 0.16)";
      ctx.fillRect(mx, my, 1, 1);
    }
  }

  private drawAnimatedAquarium(x: number, y: number, w: number, h: number): void {
    const ctx = this.ctx;
    const t = this.tickCount;
    const drewAtlas = this.drawAtlasProp("decoration_free", "aquarium_1", x, y, w, h);
    if (!drewAtlas) {
      ctx.fillStyle = "#162a30";
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = "#0e3b4c";
      ctx.fillRect(x + 2, y + 3, w - 4, h - 6);
    }

    // Subtle animated water shimmer & tiny swimming fish + rising air bubbles
    const innerX = x + 3;
    const innerW = Math.max(8, w - 6);
    const waterY = y + Math.floor(h * 0.32);

    // Water surface ripple
    const rippleX = innerX + (Math.floor(t / 3) % Math.max(2, innerW - 4));
    ctx.fillStyle = "rgba(153, 246, 228, 0.45)";
    ctx.fillRect(rippleX, waterY, 3, 1);

    // Swimming pixel fish #1 (orange clownfish)
    const cycle1 = Math.max(4, innerW - 4);
    const pos1 = Math.floor(t * 0.45) % (cycle1 * 2);
    const fx1 = innerX + (pos1 < cycle1 ? pos1 : cycle1 * 2 - pos1);
    const fy1 = waterY + 4 + Math.round(Math.sin(t * 0.25) * 1.5);
    ctx.fillStyle = "#ECA239";
    ctx.fillRect(fx1, fy1, 3, 2);

    // Swimming pixel fish #2 (teal neon)
    const pos2 = Math.floor(t * 0.32 + 9) % (cycle1 * 2);
    const fx2 = innerX + (pos2 < cycle1 ? pos2 : cycle1 * 2 - pos2);
    const fy2 = waterY + Math.max(7, Math.floor(h * 0.35));
    ctx.fillStyle = "#38bdf8";
    ctx.fillRect(fx2, fy2, 2, 1);

    // Rising bubbles
    for (let b = 0; b < 2; b++) {
      const bx = innerX + 3 + b * Math.floor(innerW * 0.55);
      const rise = Math.floor((t + b * 6) / 3) % Math.max(4, Math.floor(h * 0.45));
      const by = y + h - 5 - rise;
      if (by >= waterY) {
        ctx.fillStyle = "rgba(224, 242, 254, 0.72)";
        ctx.fillRect(bx + ((t + b) % 4 < 2 ? 0 : 1), by, 1, 1);
      }
    }
  }

  private drawBreakCelebration(): void {
    const ctx = this.ctx;
    const t = this.tickCount;
    const W = this.logicalW;
    const H = this.logicalH;
    const colors = ["#ECA239", "#34d399", "#5eead4", "#fde68a", "#DB5B47"];

    for (let i = 0; i < 16; i++) {
      const cx = Math.round(((i * 37 + Math.sin((t + i * 4) * 0.14) * 10) % W + W) % W);
      const cy = Math.round(((t * 1.15 + i * 19) % (H - 12)));
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillRect(cx, cy, i % 3 === 0 ? 2 : 1, i % 3 === 0 ? 2 : 1);
    }
  }

  private drawPixelWindow(
    x: number,
    y: number,
    w: number,
    h: number,
    options?: { nightTint?: string; rain?: boolean; shootingStar?: boolean }
  ): void {
    const ctx = this.ctx;
    const t = this.tickCount;
    const nightTint = options?.nightTint || "#132238";

    ctx.fillStyle = "#263d3d";
    ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    ctx.fillStyle = nightTint;
    ctx.fillRect(x, y, w, h);

    // Moon & soft glow
    ctx.fillStyle = "rgba(236, 162, 57, 0.16)";
    ctx.fillRect(x + w - 12, y + 2, 8, 8);
    ctx.fillStyle = "#ECA239";
    ctx.fillRect(x + w - 10, y + 4, 4, 4);
    ctx.fillStyle = nightTint;
    ctx.fillRect(x + w - 8, y + 4, 2, 2);

    // Twinkling stars
    const starPositions = [
      [5, 5],
      [14, 9],
      [24, 4],
      [9, 15],
      [27, 13],
      [19, 19],
    ];
    for (let i = 0; i < starPositions.length; i++) {
      const [sx, sy] = starPositions[i];
      if (sx >= w - 4 || sy >= h - 4) continue;
      const bright = (t + i * 5) % 16 < 10;
      ctx.fillStyle = bright ? "#F8F9F6" : "#6B8282";
      ctx.fillRect(x + sx, y + sy, 1, 1);
    }

    // Drifting pixel cloud
    const cloudSpan = Math.max(8, w - 10);
    const cloudX = x + 2 + (Math.floor(t / 6) % cloudSpan);
    if (cloudX + 8 < x + w - 1) {
      ctx.fillStyle = "rgba(148, 163, 184, 0.18)";
      ctx.fillRect(cloudX, y + Math.floor(h * 0.38), 8, 3);
      ctx.fillRect(cloudX + 2, y + Math.floor(h * 0.38) - 1, 4, 1);
    }

    // Occasional shooting star
    if (options?.shootingStar) {
      const sPhase = t % 90;
      if (sPhase < 12) {
        const sx = x + 4 + sPhase * 2;
        const sy = y + 3 + sPhase;
        if (sx < x + w - 2 && sy < y + h - 2) {
          ctx.fillStyle = "#fef08a";
          ctx.fillRect(sx, sy, 2, 1);
          ctx.fillStyle = "rgba(254, 240, 138, 0.45)";
          ctx.fillRect(sx - 2, sy - 1, 2, 1);
        }
      }
    }

    // Animated falling rain streaks
    if (options?.rain) {
      ctx.fillStyle = "rgba(125, 211, 252, 0.45)";
      for (let r = 0; r < 6; r++) {
        const rx = x + 4 + ((r * 7) % Math.max(4, w - 6));
        const ry = y + 2 + ((t * 2 + r * 5) % Math.max(6, h - 5));
        ctx.fillRect(rx, ry, 1, 3);
      }
    }

    // Window mullions
    ctx.fillStyle = "#263d3d";
    ctx.fillRect(x + Math.floor(w / 2), y, 2, h);
    ctx.fillRect(x, y + Math.floor(h / 2), w, 2);
  }

  // =========================================================
  // 1. OFFICE THEME ("Working on PC")
  // =========================================================

  private drawOfficeScene(): void {
    const ctx = this.ctx;
    const isBreak = this.config.loopState === "break_reward";
    const t = this.tickCount;
    const W = this.logicalW;
    const H = this.logicalH;
    const cx = Math.round(W / 2);
    const horizonY = Math.round(H * 0.52);

    // Back wall & trim
    ctx.fillStyle = "#172626";
    ctx.fillRect(0, 0, W, horizonY);
    ctx.fillStyle = "#203434";
    ctx.fillRect(0, horizonY - 4, W, 4);

    // Wooden floor planks
    ctx.fillStyle = "#2b241f";
    ctx.fillRect(0, horizonY, W, H - horizonY);
    ctx.fillStyle = "#352c25";
    for (let y = horizonY + 8; y < H; y += 10) {
      ctx.fillRect(0, y, W, 1);
    }

    // Rainy skyline windows on left & right
    const winW = Math.min(44, Math.max(28, Math.round(W * 0.14)));
    const winH = Math.min(34, Math.max(24, horizonY - 28));
    const winY = Math.max(10, Math.round(horizonY * 0.2));
    this.drawPixelWindow(Math.max(12, Math.round(W * 0.07)), winY, winW, winH, {
      nightTint: "#0e1d2a",
      rain: true,
      shootingStar: true,
    });
    this.drawPixelWindow(W - Math.max(12, Math.round(W * 0.07)) - winW, winY, winW, winH, {
      nightTint: "#0e1d2a",
      rain: true,
    });

    // Subtle moonlight / monitor light cones
    ctx.fillStyle = "rgba(56, 189, 248, 0.04)";
    ctx.fillRect(Math.max(12, Math.round(W * 0.07)), winY + winH, winW, horizonY - (winY + winH) + 12);

    // Pulsing Neon Focus Sign + ticking pixel clock
    const signPulse = (t % 20 < 10) ? "rgba(236, 162, 57, 0.16)" : "rgba(59, 130, 130, 0.14)";
    ctx.fillStyle = isBreak ? "rgba(52, 211, 153, 0.16)" : signPulse;
    ctx.fillRect(cx - 18, 13, 36, 16);
    ctx.fillStyle = "#3B8282";
    ctx.fillRect(cx - 15, 15, 30, 12);
    ctx.fillStyle = "#121e1e";
    ctx.fillRect(cx - 14, 16, 28, 10);
    ctx.fillStyle = isBreak ? "#34d399" : "#ECA239";
    ctx.font = "bold 7px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(isBreak ? "BREAK" : "FOCUS", cx, 21.5);

    // Ticking analog wall clock next to sign (when space allows)
    if (W >= 230) {
      const clkX = cx + 26;
      const clkY = 20;
      ctx.fillStyle = "#2b4242";
      ctx.fillRect(clkX - 5, clkY - 5, 10, 10);
      ctx.fillStyle = "#e2e8f0";
      ctx.fillRect(clkX - 4, clkY - 4, 8, 8);
      ctx.fillStyle = "#142020";
      const handDir = Math.floor(t / 15) % 4;
      ctx.fillRect(clkX, clkY - 1, 1, 2);
      if (handDir === 0) ctx.fillRect(clkX, clkY - 3, 1, 2);
      else if (handDir === 1) ctx.fillRect(clkX + 1, clkY, 2, 1);
      else if (handDir === 2) ctx.fillRect(clkX, clkY + 1, 1, 2);
      else ctx.fillRect(clkX - 2, clkY, 2, 1);
    }

    // Bookshelf & animated aquarium on wall
    if (W >= 210) {
      const shelfX = Math.max(winW + 18, Math.round(W * 0.25));
      const shelfY = Math.max(24, horizonY - 42);
      ctx.fillStyle = "#463125";
      ctx.fillRect(shelfX, shelfY, 24, 42);
      ctx.fillStyle = "#2a1d16";
      ctx.fillRect(shelfX + 2, shelfY + 5, 20, 9);
      ctx.fillRect(shelfX + 2, shelfY + 18, 20, 9);
      ctx.fillStyle = "#3B8282";
      ctx.fillRect(shelfX + 4, shelfY + 6, 4, 8);
      ctx.fillStyle = "#ECA239";
      ctx.fillRect(shelfX + 9, shelfY + 7, 3, 7);
      ctx.fillStyle = "#DB5B47";
      ctx.fillRect(shelfX + 14, shelfY + 6, 5, 8);

      const aqX = Math.min(W - winW - 44, Math.round(W * 0.67));
      this.drawAnimatedAquarium(aqX, Math.max(26, horizonY - 36), 28, 28);
    }

    // Subtle floating office dust motes
    this.drawAmbientMotes(8, "rgba(186, 230, 253, 0.42)", 24, horizonY + 26, 3);

    const seats = this.getSeatPositions(this.config.participants.length, Math.round(H * 0.72));
    const paired = this.config.participants
      .map((p, idx) => ({ p, pos: seats[idx] }))
      .sort((a, b) => a.pos.y - b.pos.y);

    for (const { p, pos } of paired) {
      const scale = pos.scale;
      this.drawParticipantAvatar(p, pos.x, pos.y - 4, scale, {
        typingBob: true,
        glowColor: isBreak ? "rgba(52, 211, 153, 0.16)" : "rgba(56, 189, 248, 0.16)",
      });

      const dw = Math.round(50 * scale);
      const dx = Math.round(pos.x - dw / 2);
      const dy = Math.round(pos.y - 7);
      ctx.fillStyle = "#5c4030";
      ctx.fillRect(dx, dy, dw, 16);
      ctx.fillStyle = "#7a5640";
      ctx.fillRect(dx, dy, dw, 3);
      ctx.fillStyle = "#3b281d";
      ctx.fillRect(dx + 3, dy + 16, 4, 8);
      ctx.fillRect(dx + dw - 7, dy + 16, 4, 8);

      // Warm glowing desk lamp on left edge of desk
      const lampFlicker = (t + (p.userId || 1)) % 12 < 8 ? 0.16 : 0.11;
      ctx.fillStyle = `rgba(236, 162, 57, ${lampFlicker})`;
      ctx.fillRect(dx + 1, dy - 10, 12, 14);
      ctx.fillStyle = "#334155";
      ctx.fillRect(dx + 4, dy - 7, 2, 7);
      ctx.fillStyle = "#ECA239";
      ctx.fillRect(dx + 2, dy - 9, 6, 3);

      // PC Monitor on desk
      const mw = Math.round(22 * scale);
      const mh = Math.round(14 * scale);
      const mx = Math.round(pos.x - mw / 2 + 5);
      const my = dy - mh + 6;
      ctx.fillStyle = "#182226";
      ctx.fillRect(mx - 1, my - 1, mw + 2, mh + 2);
      ctx.fillStyle = isBreak ? "#064e3b" : "#0b2c36";
      ctx.fillRect(mx, my, mw, mh);

      if (isBreak) {
        ctx.fillStyle = "#34d399";
        const checkShift = t % 12 < 6 ? 0 : -1;
        ctx.fillRect(mx + 6, my + 6 + checkShift, 3, 2);
        ctx.fillRect(mx + 8, my + 8 + checkShift, 3, 2);
        ctx.fillRect(mx + 10, my + 4 + checkShift, 4, 5);
      } else {
        const shift = Math.floor(t / 4) % 4;
        ctx.fillStyle = "#38bdf8";
        ctx.fillRect(mx + 2, my + 2 + (shift % 3), mw - 8, 1);
        ctx.fillStyle = "#ECA239";
        ctx.fillRect(mx + 4, my + 5, Math.max(4, mw - 12), 1);
        ctx.fillStyle = "#5eead4";
        ctx.fillRect(mx + 2, my + 8, Math.max(5, mw - 10), 1);
        // Live mini progress pulse along bottom of screen
        const barFill = 2 + (Math.floor(t / 2) % Math.max(4, mw - 5));
        ctx.fillStyle = "rgba(94, 234, 212, 0.55)";
        ctx.fillRect(mx + 2, my + mh - 3, barFill, 1);
        if (t % 8 < 4) {
          ctx.fillStyle = "#F8F9F6";
          ctx.fillRect(mx + mw - 5, my + 8, 2, 2);
        }
      }

      // Keyboard with subtle keystroke LED & coffee mug
      ctx.fillStyle = "#263238";
      ctx.fillRect(mx - 9, dy + 4, 14, 4);
      ctx.fillStyle = "#5eead4";
      ctx.fillRect(mx - 8 + ((t + (p.userId || 0)) % 10), dy + 5, 1, 1);
      ctx.fillStyle = "#F8F9F6";
      ctx.fillRect(dx + 8, dy + 2, 5, 5);
      ctx.fillStyle = "#6f4e37";
      ctx.fillRect(dx + 9, dy + 2, 3, 1);
      this.drawCoffeeSteam(dx + 9, dy, p.userId || 1);
    }
  }

  // =========================================================
  // 2. PARK THEME (Campfire Twilight Clearing)
  // =========================================================

  private drawParkScene(): void {
    const ctx = this.ctx;
    const isBreak = this.config.loopState === "break_reward";
    const t = this.tickCount;
    const W = this.logicalW;
    const H = this.logicalH;
    const cx = Math.round(W / 2);
    const grassY = Math.round(H * 0.44);

    // Twilight sky gradient bands
    const skyColors = ["#0d1924", "#122431", "#17303c", "#1d3d45"];
    const bandH = Math.ceil(grassY / skyColors.length) + 1;
    skyColors.forEach((c, idx) => {
      ctx.fillStyle = c;
      ctx.fillRect(0, idx * (bandH - 1), W, bandH);
    });

    // Crescent moon & stars
    ctx.fillStyle = "rgba(248, 249, 246, 0.14)";
    ctx.fillRect(W - 46, 11, 14, 14);
    ctx.fillStyle = "#F8F9F6";
    ctx.fillRect(W - 44, 13, 10, 10);
    ctx.fillStyle = "#0d1924";
    ctx.fillRect(W - 40, 13, 6, 6);

    for (let i = 0; i < 20; i++) {
      const sx = (i * 53 + 17) % W;
      const sy = (i * 29 + 7) % Math.max(20, grassY - 10);
      ctx.fillStyle = (t + i * 3) % 16 < 10 ? "#F8F9F6" : "#4b7178";
      ctx.fillRect(sx, sy, 1, 1);
    }

    // Drifting night cloud
    const cloudX = Math.round((t * 0.22) % (W + 40)) - 30;
    ctx.fillStyle = "rgba(148, 163, 184, 0.16)";
    ctx.fillRect(cloudX, 18, 26, 5);
    ctx.fillRect(cloudX + 5, 14, 14, 4);

    // Periodic shooting star
    const shoot = t % 110;
    if (shoot < 14) {
      const ssx = Math.round(W * 0.15) + shoot * 4;
      const ssy = 10 + shoot;
      ctx.fillStyle = "#fef08a";
      ctx.fillRect(ssx, ssy, 2, 1);
      ctx.fillStyle = "rgba(254, 240, 138, 0.45)";
      ctx.fillRect(ssx - 3, ssy - 1, 3, 1);
    }

    // Swaying distant forest silhouettes
    for (let x = 0; x < W; x += 20) {
      const treeH = 22 + ((x * 7) % 14);
      const sway = Math.round(Math.sin((t + x) * 0.08) * 0.8);
      ctx.fillStyle = "#132929";
      ctx.fillRect(x + 7, grassY - treeH + 4, 7, treeH);
      ctx.fillRect(x + 3 + sway, grassY - treeH + 9, 15, treeH - 8);
    }

    // Grass clearing & warm dirt ring
    ctx.fillStyle = "#1e4234";
    ctx.fillRect(0, grassY, W, H - grassY);
    ctx.fillStyle = "#26523f";
    ctx.fillRect(0, grassY + 12, W, H - grassY - 12);

    // Subtle shimmering moonlit pond corner
    if (W >= 220) {
      const pondX = W - 58;
      const pondY = grassY + 18;
      ctx.fillStyle = "#163b47";
      ctx.fillRect(pondX, pondY, 44, 14);
      const glintX = pondX + 6 + (Math.floor(t / 4) % 28);
      ctx.fillStyle = "rgba(248, 249, 246, 0.45)";
      ctx.fillRect(glintX, pondY + 5, 5, 1);
    }

    // Animated swaying grass blades
    ctx.fillStyle = "#2f6b4f";
    for (let gx = 10; gx < W - 10; gx += 26) {
      const tipShift = (t + gx) % 16 < 8 ? 0 : 1;
      const gy = grassY + 18 + ((gx * 3) % Math.max(20, H - grassY - 26));
      ctx.fillRect(gx, gy, 1, 3);
      ctx.fillRect(gx + tipShift, gy - 1, 1, 1);
    }

    const fireY = Math.round(H * 0.7);
    const ringW = Math.min(136, W - 40);
    ctx.fillStyle = "#3f3229";
    ctx.fillRect(cx - Math.round(ringW / 2), fireY - 10, ringW, 30);

    // Pulsing campfire glow halo
    const glowScale = (t % 8 < 4) ? 2 : 0;
    ctx.fillStyle = isBreak ? "rgba(236, 162, 57, 0.24)" : "rgba(219, 91, 71, 0.17)";
    ctx.fillRect(cx - 32 - glowScale, fireY - 18 - glowScale, 64 + glowScale * 2, 34 + glowScale * 2);

    // Logs & multi-layered swaying flames
    ctx.fillStyle = "#4b2e1e";
    ctx.fillRect(cx - 10, fireY + 4, 20, 4);
    ctx.fillRect(cx - 6, fireY + 1, 12, 4);

    const f1 = t % 4;
    const f2 = (t + 2) % 6;
    ctx.fillStyle = "#DB5B47";
    ctx.fillRect(cx - 6 + (f1 === 1 ? 1 : 0), fireY - 7 - (f1 % 2), 12, 11);
    ctx.fillStyle = "#ECA239";
    ctx.fillRect(cx - 4 - (f2 < 3 ? 0 : 1), fireY - 9 + (f1 % 2), 8, 11);
    ctx.fillStyle = "#fef08a";
    ctx.fillRect(cx - 2, fireY - 4 - (f1 % 2), 4, 6);

    // Rising embers & smoke wisps
    for (let e = 0; e < 7; e++) {
      const ex = cx - 6 + ((e * 5 + Math.round(Math.sin((t + e * 4) * 0.25) * 4)) % 14);
      const ey = fireY - 10 - ((t + e * 6) % 34);
      ctx.fillStyle = e % 3 === 0 ? "rgba(203, 213, 225, 0.26)" : e % 2 === 0 ? "#ECA239" : "#DB5B47";
      ctx.fillRect(ex, ey, 1, 1);
    }

    // Glowing fireflies meandering across clearing
    for (let f = 0; f < 11; f++) {
      const fx = Math.round(((f * 41 + Math.sin((t + f * 5) * 0.14) * 14) % W + W) % W);
      const fy = grassY + 6 + ((f * 17) % Math.max(24, H - grassY - 16)) + Math.round(Math.cos((t + f * 3) * 0.16) * 4);
      const glow = (t + f * 4) % 12 < 7;
      ctx.fillStyle = glow ? "#fde047" : "rgba(253, 224, 71, 0.28)";
      ctx.fillRect(fx, fy, glow ? 2 : 1, glow ? 2 : 1);
    }

    // Seat players around campfire
    const count = Math.max(1, this.config.participants.length);
    const rawSeats =
      count === 1
        ? [{ x: cx - 34, y: fireY + 4, scale: W < 220 ? 1.0 : 1.08 }]
        : this.getSeatPositions(count, fireY).map((s) => ({
            ...s,
            x: Math.abs(s.x - cx) < 20 ? (s.x < cx ? cx - 28 : cx + 28) : s.x,
          }));

    const paired = this.config.participants
      .map((p, idx) => ({ p, pos: rawSeats[idx] || { x: cx - 34, y: fireY + 4, scale: 1 } }))
      .sort((a, b) => a.pos.y - b.pos.y);

    for (const { p, pos } of paired) {
      ctx.fillStyle = "#5c3d28";
      ctx.fillRect(pos.x - 7, pos.y - 5, 14, 7);
      this.drawParticipantAvatar(p, pos.x, pos.y - 3, pos.scale, {
        glowColor: "rgba(236, 162, 57, 0.13)",
      });
    }
  }

  // =========================================================
  // 3. COZY LOUNGE / CAFE THEME
  // =========================================================

  private drawLoungeScene(): void {
    const ctx = this.ctx;
    const isBreak = this.config.loopState === "break_reward";
    const t = this.tickCount;
    const W = this.logicalW;
    const H = this.logicalH;
    const cx = Math.round(W / 2);
    const horizonY = Math.round(H * 0.51);

    // Warm slate lounge wall & wainscot
    ctx.fillStyle = "#1f2b2d";
    ctx.fillRect(0, 0, W, horizonY);
    ctx.fillStyle = "#2d3b3c";
    ctx.fillRect(0, horizonY - 22, W, 22);

    // Checkered cozy floor
    ctx.fillStyle = "#281e1b";
    ctx.fillRect(0, horizonY, W, H - horizonY);
    ctx.fillStyle = "#332622";
    for (let y = horizonY + 2; y < H; y += 12) {
      for (let x = ((Math.floor((y - horizonY) / 12) % 2 === 0) ? 0 : 12); x < W; x += 24) {
        ctx.fillRect(x, y, 12, 12);
      }
    }

    // Center rainy cafe window
    const winW = Math.min(72, Math.round(W * 0.3));
    const winH = Math.min(34, Math.max(22, horizonY - 28));
    this.drawPixelWindow(cx - Math.round(winW / 2), 18, winW, winH, {
      nightTint: "#10202e",
      rain: true,
      shootingStar: true,
    });

    // Overhead twinkling string lights with pulsing glow halos
    ctx.fillStyle = "#162020";
    ctx.fillRect(0, 12, W, 1);
    for (let x = 16; x < W - 10; x += 26) {
      const swayY = Math.round(Math.sin((t + x) * 0.08) * 0.6);
      const glow = (t + x) % 14 < 9;
      if (glow) {
        ctx.fillStyle = "rgba(236, 162, 57, 0.16)";
        ctx.fillRect(x - 3, 12 + swayY, 9, 9);
      }
      ctx.fillStyle = glow ? "#ECA239" : "#9c6b22";
      ctx.fillRect(x, 13 + swayY, 3, 4);
    }

    // Lounge props: animated jukebox + aquarium
    const jbX = Math.max(12, Math.round(W * 0.06));
    const jbY = Math.max(22, horizonY - 42);
    this.drawAtlasProp("decoration_free", "jukebox_1", jbX, jbY, 34, 44);
    // Jukebox pulsing equalizer bars
    const eqColors = ["#5eead4", "#ECA239", "#DB5B47"];
    for (let b = 0; b < 3; b++) {
      const bh = 2 + ((Math.floor(t / 2) + b * 2) % 4);
      ctx.fillStyle = eqColors[b];
      ctx.fillRect(jbX + 12 + b * 4, jbY + 18 - bh, 2, bh);
    }
    // Floating music notes
    for (let n = 0; n < 2; n++) {
      const notePhase = (Math.floor(t / 2) + n * 10) % 22;
      const noteY = jbY - 2 - notePhase;
      const noteX = jbX + 14 + n * 8 + Math.round(Math.sin((t + n * 6) * 0.25) * 3);
      ctx.fillStyle = n === 0 ? (isBreak ? "#34d399" : "#ECA239") : "#5eead4";
      ctx.fillRect(noteX, noteY, 3, 3);
      ctx.fillRect(noteX + 2, noteY - 3, 1, 4);
    }

    const aqX = W - Math.max(14, Math.round(W * 0.06)) - 36;
    this.drawAnimatedAquarium(aqX, Math.max(24, horizonY - 38), 36, 36);

    // Ambient floating dust motes
    this.drawAmbientMotes(8, "rgba(254, 240, 138, 0.35)", 22, horizonY + 20, 7);

    const seats = this.getSeatPositions(this.config.participants.length, Math.round(H * 0.72));
    const paired = this.config.participants
      .map((p, idx) => ({ p, pos: seats[idx] }))
      .sort((a, b) => a.pos.y - b.pos.y);

    for (const { p, pos } of paired) {
      this.drawParticipantAvatar(p, pos.x, pos.y - 4, pos.scale, {
        typingBob: true,
        glowColor: "rgba(236, 162, 57, 0.14)",
      });

      const tableW = Math.round(32 * pos.scale);
      ctx.fillStyle = "#6c4832";
      ctx.fillRect(pos.x - Math.round(tableW / 2), pos.y - 4, tableW, 10);
      ctx.fillStyle = "#8d6145";
      ctx.fillRect(pos.x - Math.round(tableW / 2), pos.y - 4, tableW, 3);
      ctx.fillStyle = "#462f21";
      ctx.fillRect(pos.x - 2, pos.y + 6, 4, 8);

      // Animated laptop + warm steaming coffee cup
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(pos.x - 9, pos.y - 9, 12, 6);
      ctx.fillStyle = isBreak ? "#34d399" : "#38bdf8";
      ctx.fillRect(pos.x - 8, pos.y - 8, 10, 4);
      ctx.fillStyle = "rgba(248, 249, 246, 0.55)";
      ctx.fillRect(pos.x - 7 + (Math.floor(t / 4) % 7), pos.y - 7, 2, 1);
      ctx.fillStyle = "#F8F9F6";
      ctx.fillRect(pos.x + 7, pos.y - 6, 4, 4);
      this.drawCoffeeSteam(pos.x + 8, pos.y - 8, p.userId || 2);
    }
  }

  // =========================================================
  // 4. ADVENTURE GUILD THEME
  // =========================================================

  private drawGuildScene(): void {
    const ctx = this.ctx;
    const t = this.tickCount;
    const W = this.logicalW;
    const H = this.logicalH;
    const cx = Math.round(W / 2);
    const horizonY = Math.round(H * 0.51);

    // Stone guild wall & timber beams
    ctx.fillStyle = "#262328";
    ctx.fillRect(0, 0, W, horizonY);
    ctx.fillStyle = "#3a2a1d";
    ctx.fillRect(0, horizonY - 5, W, 6);

    // Flagstone floor
    ctx.fillStyle = "#2f2c33";
    ctx.fillRect(0, horizonY, W, H - horizonY);
    ctx.fillStyle = "#38343e";
    for (let y = horizonY + 8; y < H; y += 14) {
      ctx.fillRect(0, y, W, 1);
    }

    // Real Adventure Guild sprites
    const hearthX = cx - 24;
    const hearthY = Math.max(16, horizonY - 52);
    this.drawAtlasProp("guild", "guild_hearth_fireplace", hearthX, hearthY, 48, 52);

    if (W >= 220) {
      this.drawAtlasProp("guild", "guild_quest_board_bc", Math.max(10, Math.round(W * 0.06)), hearthY + 6, 40, 44);
      this.drawAtlasProp("guild", "guild_bestiary_shelf", W - Math.max(10, Math.round(W * 0.06)) - 42, hearthY + 4, 42, 48);
    }

    // Animated dancing wall torches beside the hearth
    const torchOffsets = W >= 210 ? [cx - 46, cx + 44] : [cx - 34, cx + 32];
    for (const tx of torchOffsets) {
      const ty = Math.max(22, hearthY + 14);
      ctx.fillStyle = "rgba(236, 162, 57, 0.16)";
      ctx.fillRect(tx - 5, ty - 7, 12, 14);
      ctx.fillStyle = "#4b2e1e";
      ctx.fillRect(tx, ty, 2, 7);
      const tf = (t + tx) % 4;
      ctx.fillStyle = "#DB5B47";
      ctx.fillRect(tx - 1, ty - 4 - (tf % 2), 4, 4);
      ctx.fillStyle = "#fef08a";
      ctx.fillRect(tx, ty - 3, 2, 2);
    }

    // Roaring hearth glow + rising sparks
    const flicker = t % 6;
    ctx.fillStyle = flicker < 3 ? "rgba(236, 162, 57, 0.25)" : "rgba(219, 91, 71, 0.18)";
    ctx.fillRect(cx - 18, hearthY + 30, 36, 26);
    ctx.fillStyle = "#ECA239";
    ctx.fillRect(cx - 8 + (flicker % 2), hearthY + 34, 16, 8);
    ctx.fillStyle = "#fef08a";
    ctx.fillRect(cx - 4, hearthY + 36 - (flicker % 2), 8, 6);
    for (let e = 0; e < 5; e++) {
      const ex = cx - 6 + ((e * 3 + t) % 12);
      const ey = hearthY + 32 - ((t + e * 5) % 18);
      ctx.fillStyle = "#ECA239";
      ctx.fillRect(ex, ey, 1, 1);
    }

    // Floating arcane dust motes
    this.drawAmbientMotes(9, "rgba(236, 162, 57, 0.55)", 20, H - 20, 11);

    const seats = this.getSeatPositions(this.config.participants.length, Math.round(H * 0.72));
    const paired = this.config.participants
      .map((p, idx) => ({ p, pos: seats[idx] }))
      .sort((a, b) => a.pos.y - b.pos.y);

    for (const { p, pos } of paired) {
      this.drawParticipantAvatar(p, pos.x, pos.y - 4, pos.scale, {
        typingBob: true,
        glowColor: "rgba(236, 162, 57, 0.15)",
      });

      ctx.fillStyle = "#5c3b24";
      ctx.fillRect(pos.x - 18, pos.y - 4, 36, 12);
      ctx.fillStyle = "#F8F9F6";
      ctx.fillRect(pos.x - 8, pos.y - 3, 12, 6);
      ctx.fillStyle = "#3B8282";
      ctx.fillRect(pos.x - 6, pos.y - 2, 3, 1);

      // Flickering candle + rising arcane rune sparkle
      ctx.fillStyle = "#ECA239";
      ctx.fillRect(pos.x + 8, pos.y - 6, 3, 4);
      ctx.fillStyle = t % 4 < 2 ? "#fef08a" : "#ECA239";
      ctx.fillRect(pos.x + 9, pos.y - 8 - (t % 2), 2, 2);

      const runeRise = (t + (p.userId || 1) * 5) % 14;
      ctx.fillStyle = runeRise < 7 ? "rgba(94, 234, 212, 0.75)" : "rgba(236, 162, 57, 0.6)";
      ctx.fillRect(pos.x - 3 + Math.round(Math.sin(t * 0.2) * 2), pos.y - 6 - runeRise, 1, 1);
    }
  }

  // =========================================================
  // 5. LIVING ROOM / HOME STUDY THEME
  // =========================================================

  private drawLivingRoomScene(): void {
    const ctx = this.ctx;
    const isBreak = this.config.loopState === "break_reward";
    const t = this.tickCount;
    const W = this.logicalW;
    const H = this.logicalH;
    const cx = Math.round(W / 2);
    const horizonY = Math.round(H * 0.51);

    // Warm sage wall + wood floor
    ctx.fillStyle = "#2b3834";
    ctx.fillRect(0, 0, W, horizonY);
    ctx.fillStyle = "#3f2e21";
    ctx.fillRect(0, horizonY, W, H - horizonY);

    // Cozy rug
    const rugW = Math.min(228, W - 44);
    const rugX = cx - Math.round(rugW / 2);
    ctx.fillStyle = "#8c3f34";
    ctx.fillRect(rugX, horizonY + 14, rugW, Math.max(34, H - horizonY - 22));
    ctx.strokeStyle = "#ECA239";
    ctx.lineWidth = 1;
    ctx.strokeRect(rugX + 4.5, horizonY + 18.5, rugW - 9, Math.max(26, H - horizonY - 30));

    // Night window with swaying curtains
    const winW = Math.min(48, Math.round(W * 0.22));
    const winX = cx - Math.round(winW / 2);
    this.drawPixelWindow(winX, 14, winW, Math.min(34, horizonY - 24), {
      nightTint: "#112030",
      shootingStar: true,
    });
    const curtainSway = t % 24 < 12 ? 0 : 1;
    ctx.fillStyle = "#7c3f38";
    ctx.fillRect(winX - 4, 13, 5 + curtainSway, Math.min(38, horizonY - 20));
    ctx.fillRect(winX + winW - 1 - curtainSway, 13, 5 + curtainSway, Math.min(38, horizonY - 20));

    // Warm floor lamp on left with gentle pulsing light cone
    const lampX = Math.max(18, Math.round(W * 0.1));
    const lampY = Math.max(26, horizonY - 38);
    ctx.fillStyle = "#4d3627";
    ctx.fillRect(lampX + 4, lampY + 8, 3, 40);
    ctx.fillStyle = "#ECA239";
    ctx.fillRect(lampX - 1, lampY, 13, 9);
    const lampAlpha = 0.12 + 0.04 * Math.sin(t * 0.16);
    ctx.fillStyle = `rgba(236, 162, 57, ${lampAlpha.toFixed(2)})`;
    ctx.fillRect(lampX - 8, lampY + 8, 27, 44);

    // Side table + typewriter on right
    if (W >= 210) {
      const twX = W - Math.max(18, Math.round(W * 0.1)) - 28;
      this.drawAtlasProp("decoration_free", "typewriter_1", twX, Math.max(30, horizonY - 28), 28, 28);
    }

    // Cozy sleeping pixel cat curled on the rug
    const catX = cx - Math.round(rugW * 0.28);
    const catY = Math.min(H - 12, horizonY + 26);
    const catBreath = t % 12 < 6 ? 0 : 1;
    ctx.fillStyle = "#ECA239";
    ctx.fillRect(catX, catY + catBreath, 9, 5 - catBreath);
    ctx.fillRect(catX + 7, catY - 2 + catBreath, 5, 4);
    ctx.fillRect(catX + 7, catY - 4 + catBreath, 2, 2);
    ctx.fillRect(catX + 10, catY - 4 + catBreath, 2, 2);
    if (t % 20 < 12) {
      ctx.fillStyle = "#F8F9F6";
      ctx.font = "6px monospace";
      ctx.fillText("z", catX + 14, catY - 4 - (Math.floor(t / 4) % 4));
    }

    // Floating dust motes in warm lamp glow
    this.drawAmbientMotes(8, "rgba(253, 230, 138, 0.45)", 18, horizonY + 34, 19);

    const seats = this.getSeatPositions(this.config.participants.length, Math.round(H * 0.72));
    const paired = this.config.participants
      .map((p, idx) => ({ p, pos: seats[idx] }))
      .sort((a, b) => a.pos.y - b.pos.y);

    for (const { p, pos } of paired) {
      this.drawParticipantAvatar(p, pos.x, pos.y - 4, pos.scale, {
        typingBob: true,
        glowColor: "rgba(236, 162, 57, 0.14)",
      });

      ctx.fillStyle = "#6c4832";
      ctx.fillRect(pos.x - 18, pos.y - 5, 36, 12);
      ctx.fillStyle = "#1f2937";
      ctx.fillRect(pos.x - 8, pos.y - 10, 14, 7);
      ctx.fillStyle = isBreak ? "#34d399" : "#93c5fd";
      ctx.fillRect(pos.x - 7, pos.y - 9, 12, 5);
      ctx.fillStyle = "rgba(248, 249, 246, 0.5)";
      ctx.fillRect(pos.x - 6 + (Math.floor(t / 5) % 8), pos.y - 8, 2, 1);
      ctx.fillStyle = "#F8F9F6";
      ctx.fillRect(pos.x + 9, pos.y - 6, 4, 4);
      this.drawCoffeeSteam(pos.x + 10, pos.y - 8, p.userId || 3);
    }
  }

  // =========================================================
  // 6. PET SHOP / CAT CORNER THEME
  // =========================================================

  private drawPetShopScene(): void {
    const ctx = this.ctx;
    const isBreak = this.config.loopState === "break_reward";
    const t = this.tickCount;
    const W = this.logicalW;
    const H = this.logicalH;
    const horizonY = Math.round(H * 0.51);

    // Teal boutique walls & wood floor
    ctx.fillStyle = "#223b3b";
    ctx.fillRect(0, 0, W, horizonY);
    ctx.fillStyle = "#4f3a2b";
    ctx.fillRect(0, horizonY, W, H - horizonY);

    const winW = Math.min(42, Math.round(W * 0.18));
    const winH = Math.min(32, Math.max(20, horizonY - 24));
    this.drawPixelWindow(Math.max(12, Math.round(W * 0.08)), 16, winW, winH, {
      nightTint: "#193040",
      shootingStar: true,
    });
    this.drawPixelWindow(W - Math.max(12, Math.round(W * 0.08)) - winW, 16, winW, winH, {
      nightTint: "#193040",
    });

    // Cat tree silhouette + swinging dangling yarn ball
    const treeX = Math.max(winW + 18, Math.round(W * 0.25));
    const treeY = Math.max(24, horizonY - 40);
    ctx.fillStyle = "#7c5840";
    ctx.fillRect(treeX + 10, treeY + 4, 6, 36);
    ctx.fillStyle = "#d6c3a5";
    ctx.fillRect(treeX, treeY, 26, 6);
    ctx.fillRect(treeX + 4, treeY + 20, 18, 5);

    const yarnSwing = Math.round(Math.sin(t * 0.22) * 2);
    ctx.fillStyle = "#e2e8f0";
    ctx.fillRect(treeX + 20, treeY + 6, 1, 7);
    ctx.fillStyle = "#DB5B47";
    ctx.fillRect(treeX + 19 + yarnSwing, treeY + 13, 3, 3);

    const drawPixelCat = (
      x: number,
      y: number,
      furColor: string,
      seed: number,
      active = false
    ) => {
      const breath = (t + seed) % 10 < 5 ? 0 : 1;
      const pawReach = active && (t + seed) % 12 < 5 ? 2 : 0;
      ctx.fillStyle = furColor;
      ctx.fillRect(x, y + breath, 10, 6 - breath);
      ctx.fillRect(x + 8, y - 3 + breath, 6, 5);
      ctx.fillRect(x + 8, y - 5 + breath, 2, 2);
      ctx.fillRect(x + 12, y - 5 + breath, 2, 2);
      if (pawReach > 0) {
        ctx.fillRect(x + 13, y + 1, pawReach, 2);
      }
      ctx.fillRect(x - 3, y + 2 + ((t + seed) % 8 < 4 ? -1 : 0), 3, 2);
      if (!active && (t + seed) % 18 < 10) {
        ctx.fillStyle = "#F8F9F6";
        ctx.font = "6px monospace";
        ctx.fillText("z", x + 16, y - 6 - ((t + seed) % 4));
      }
    };

    drawPixelCat(treeX + 3, treeY - 5, "#ECA239", 1, true);
    drawPixelCat(W - Math.max(36, Math.round(W * 0.22)), horizonY - 4, "#F8F9F6", 5);

    // Animated fishbowl on boutique counter on right
    if (W >= 220) {
      this.drawAnimatedAquarium(W - winW - 44, Math.max(26, horizonY - 30), 24, 24);
    }

    this.drawAmbientMotes(7, "rgba(153, 246, 228, 0.45)", 20, H - 20, 29);

    const seats = this.getSeatPositions(this.config.participants.length, Math.round(H * 0.72));
    const paired = this.config.participants
      .map((p, idx) => ({ p, pos: seats[idx] }))
      .sort((a, b) => a.pos.y - b.pos.y);

    for (const { p, pos } of paired) {
      this.drawParticipantAvatar(p, pos.x, pos.y - 4, pos.scale, {
        typingBob: true,
        glowColor: isBreak ? "rgba(52, 211, 153, 0.16)" : "rgba(94, 234, 212, 0.14)",
      });

      ctx.fillStyle = "#6c4832";
      ctx.fillRect(pos.x - 18, pos.y - 5, 36, 12);
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(pos.x - 9, pos.y - 10, 14, 7);
      ctx.fillStyle = isBreak ? "#34d399" : "#5eead4";
      ctx.fillRect(pos.x - 8, pos.y - 9, 12, 5);
      drawPixelCat(pos.x + 8, pos.y - 10, "#cbd5e1", p.userId || 2);
    }
  }
}
