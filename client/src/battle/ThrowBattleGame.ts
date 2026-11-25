import {
  ThrowBattleState,
  ThrowBattlePlayer,
  ThrowBattleTurnPhase,
  ThrowBattleTurnResultPayload,
} from "shared";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  decay: number;
  type?: "smoke" | "spark" | "dirt" | "wood";
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  vy: number;
  scale: number;
}

export class ThrowBattleGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animFrameId: number | null = null;
  private audioCtx: AudioContext | null = null;

  // Arena Geometry
  public readonly width = 800;
  public readonly height = 460;
  public readonly groundY = 385;
  public readonly wallX = 388;
  public readonly wallW = 24;
  public readonly wallTopY = 220;

  // Active Battle State
  public matchId: string = "";
  public mySessionId: string = "";
  public player1!: ThrowBattlePlayer; // Left, moves first
  public player2!: ThrowBattlePlayer; // Right
  public currentTurn: string = "";
  public turnPhase: ThrowBattleTurnPhase = "move";
  public wind: number = 0; // -7.0 to +7.0
  public round: number = 1;
  public isGameOver: boolean = false;
  public winnerSessionId: string | null = null;

  // Active aiming/power parameters
  public currentAngle: number = 45; // in degrees
  public lockedAngle: number | null = null;
  public currentPower: number = 50; // 0 - 100
  public lockedPower: number | null = null;

  // Animation & timing
  private startTime: number = Date.now();
  private lastTime: number = Date.now();
  private shakeTime: number = 0;
  private shakeMagnitude: number = 0;

  // Key states for movement
  private keys = { left: false, right: false };
  private lastMoveSendTime: number = 0;

  // Projectile in flight
  private projectile: {
    active: boolean;
    x: number;
    y: number;
    vx: number;
    vy: number;
    rotation: number;
    rotSpeed: number;
    type: string;
    isLeft: boolean;
    throwerSessionId: string;
  } | null = null;

  // Visual effects
  private particles: Particle[] = [];
  private floatingTexts: FloatingText[] = [];

  // Hit flash timers
  private p1HitFlash: number = 0;
  private p2HitFlash: number = 0;

  // Clouds in sky
  private clouds: { x: number; y: number; speed: number; scale: number }[] = [
    { x: 50, y: 45, speed: 28, scale: 1.2 },
    { x: 260, y: 85, speed: 34, scale: 0.9 },
    { x: 520, y: 35, speed: 25, scale: 1.1 },
    { x: 700, y: 100, speed: 30, scale: 0.85 },
  ];

  // Callbacks to network manager
  public onMove?: (matchId: string, x: number) => void;
  public onEnterAngle?: (matchId: string, x: number) => void;
  public onLockAngle?: (matchId: string, angle: number) => void;
  public onThrow?: (
    matchId: string,
    angle: number,
    power: number,
    wind: number,
    projectileType: string
  ) => void;
  public onTurnResolved?: (payload: ThrowBattleTurnResultPayload) => void;
  public onLeaveMatch?: (matchId: string) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.setupAudio();
  }

  private setupAudio() {
    try {
      const AudioCtxClass =
        window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    } catch (e) {
      console.warn("AudioContext not supported or blocked:", e);
    }
  }

  private ensureAudioContext() {
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume().catch(() => {});
    }
  }

  // Retro sound effects
  public playAngleLockSound() {
    this.ensureAudioContext();
    if (!this.audioCtx) return;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(540, this.audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(720, this.audioCtx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.18, this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.08);
  }

  public playPowerLockSound() {
    this.ensureAudioContext();
    if (!this.audioCtx) return;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(440, this.audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, this.audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.2, this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.1);
  }

  public playThrowSound() {
    this.ensureAudioContext();
    if (!this.audioCtx) return;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(600, this.audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, this.audioCtx.currentTime + 0.22);
    gain.gain.setValueAtTime(0.22, this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.22);
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.22);
  }

  public playHitSound() {
    this.ensureAudioContext();
    if (!this.audioCtx) return;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(180, this.audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.audioCtx.currentTime + 0.28);
    gain.gain.setValueAtTime(0.35, this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.28);
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.28);
  }

  public playWallThudSound() {
    this.ensureAudioContext();
    if (!this.audioCtx) return;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(120, this.audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(60, this.audioCtx.currentTime + 0.16);
    gain.gain.setValueAtTime(0.25, this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.16);
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.16);
  }

  public playPoofSound() {
    this.ensureAudioContext();
    if (!this.audioCtx) return;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(110, this.audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, this.audioCtx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.18, this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.15);
  }

  public playTurnChime() {
    this.ensureAudioContext();
    if (!this.audioCtx) return;
    const notes = [523.25, 659.25]; // C5, E5
    notes.forEach((freq, i) => {
      const osc = this.audioCtx!.createOscillator();
      const gain = this.audioCtx!.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = this.audioCtx!.currentTime + i * 0.08;
      gain.gain.setValueAtTime(0.15, start);
      gain.gain.exponentialRampToValueAtTime(0.01, start + 0.14);
      osc.connect(gain);
      gain.connect(this.audioCtx!.destination);
      osc.start(start);
      osc.stop(start + 0.14);
    });
  }

  public playVictoryFanfare() {
    this.ensureAudioContext();
    if (!this.audioCtx) return;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = this.audioCtx!.createOscillator();
      const gain = this.audioCtx!.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      const start = this.audioCtx!.currentTime + i * 0.12;
      const dur = i === notes.length - 1 ? 0.45 : 0.15;
      gain.gain.setValueAtTime(0.25, start);
      gain.gain.exponentialRampToValueAtTime(0.01, start + dur);
      osc.connect(gain);
      gain.connect(this.audioCtx!.destination);
      osc.start(start);
      osc.stop(start + dur);
    });
  }

  /**
   * Start or restart game with server state
   */
  public initBattle(state: ThrowBattleState, mySessionId: string) {
    this.matchId = state.matchId;
    this.mySessionId = mySessionId;
    this.player1 = { ...state.player1 };
    this.player2 = { ...state.player2 };
    this.currentTurn = state.currentTurn;
    this.turnPhase = state.turnPhase || "move";
    this.wind = state.wind || 0;
    this.round = state.round || 1;
    this.isGameOver = state.status === "ended";
    this.winnerSessionId = state.winnerSessionId || null;

    this.lockedAngle = null;
    this.lockedPower = null;
    this.currentAngle = 45;
    this.currentPower = 50;
    this.projectile = null;
    this.particles = [];
    this.floatingTexts = [];
    this.keys = { left: false, right: false };

    this.updateHUD();
    this.startLoop();
  }

  public startLoop() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    this.lastTime = Date.now();
    const loop = () => {
      const now = Date.now();
      const dt = Math.min((now - this.lastTime) / 1000, 0.1);
      this.lastTime = now;

      this.update(dt);
      this.render();

      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  public stopLoop() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  public isMyTurn(): boolean {
    return this.currentTurn === this.mySessionId;
  }

  public getMyPlayer(): ThrowBattlePlayer {
    return this.player1.sessionId === this.mySessionId ? this.player1 : this.player2;
  }

  public getOpponentPlayer(): ThrowBattlePlayer {
    return this.player1.sessionId === this.mySessionId ? this.player2 : this.player1;
  }

  public getActivePlayer(): ThrowBattlePlayer {
    return this.player1.sessionId === this.currentTurn ? this.player1 : this.player2;
  }

  // Keyboard Event Handlers
  public handleKeyDown(code: string) {
    if (this.isGameOver) return;
    if (!this.isMyTurn()) return;

    if (this.turnPhase === "move") {
      if (code === "ArrowLeft" || code === "KeyA") {
        this.keys.left = true;
      } else if (code === "ArrowRight" || code === "KeyD") {
        this.keys.right = true;
      } else if (code === "Space") {
        // Space advances to Angle mode
        this.keys.left = false;
        this.keys.right = false;
        this.turnPhase = "angle";
        this.startTime = Date.now();
        this.playAngleLockSound();
        this.updateHUD();
        if (this.onEnterAngle) {
          const myP = this.getMyPlayer();
          this.onEnterAngle(this.matchId, myP.x);
        }
      }
    } else if (this.turnPhase === "angle") {
      if (code === "Space") {
        // Space locks angle and goes to power mode ("player cannot go back to angle mode")
        this.lockedAngle = this.currentAngle;
        this.turnPhase = "power";
        this.startTime = Date.now();
        this.playPowerLockSound();
        this.updateHUD();
        if (this.onLockAngle) {
          this.onLockAngle(this.matchId, this.lockedAngle);
        }
      }
    } else if (this.turnPhase === "power") {
      if (code === "Space") {
        // Space locks power and launches throw ("then player will throw. then player will not move.")
        this.lockedPower = Math.round(this.currentPower);
        this.turnPhase = "throw";
        this.updateHUD();

        const myP = this.getMyPlayer();
        const pType = this.getRandomProjectileType();
        this.launchProjectile(
          myP.sessionId,
          myP.side === "left",
          myP.x,
          this.lockedAngle || 45,
          this.lockedPower,
          this.wind,
          pType
        );

        if (this.onThrow) {
          this.onThrow(
            this.matchId,
            this.lockedAngle || 45,
            this.lockedPower,
            this.wind,
            pType
          );
        }
      }
    }
  }

  public handleKeyUp(code: string) {
    if (code === "ArrowLeft" || code === "KeyA") {
      this.keys.left = false;
    } else if (code === "ArrowRight" || code === "KeyD") {
      this.keys.right = false;
    }
  }

  private getRandomProjectileType(): string {
    const types = ["🦴", "🐟", "🥫", "👞", "🎈", "💣"];
    return types[Math.floor(Math.random() * types.length)];
  }

  // Network Sync Handlers
  public syncOpponentMove(sessionId: string, x: number) {
    if (this.player1.sessionId === sessionId) {
      this.player1.x = x;
    } else if (this.player2.sessionId === sessionId) {
      this.player2.x = x;
    }
  }

  public syncAngleStarted(sessionId: string, x: number) {
    if (this.player1.sessionId === sessionId) this.player1.x = x;
    if (this.player2.sessionId === sessionId) this.player2.x = x;
    this.turnPhase = "angle";
    this.startTime = Date.now();
    this.updateHUD();
  }

  public syncPowerStarted(sessionId: string, angle: number) {
    this.lockedAngle = angle;
    this.currentAngle = angle;
    this.turnPhase = "power";
    this.startTime = Date.now();
    this.updateHUD();
  }

  public syncThrown(
    sessionId: string,
    angle: number,
    power: number,
    wind: number,
    projectileType?: string
  ) {
    this.lockedAngle = angle;
    this.lockedPower = power;
    this.turnPhase = "throw";
    this.wind = wind;
    this.updateHUD();

    const thrower =
      this.player1.sessionId === sessionId ? this.player1 : this.player2;
    this.launchProjectile(
      sessionId,
      thrower.side === "left",
      thrower.x,
      angle,
      power,
      wind,
      projectileType || "🦴"
    );
  }

  public syncNextTurn(
    currentTurn: string,
    wind: number,
    round: number,
    p1Hp: number,
    p2Hp: number,
    p1X: number,
    p2X: number
  ) {
    this.currentTurn = currentTurn;
    this.wind = wind;
    this.round = round;
    this.player1.hp = p1Hp;
    this.player2.hp = p2Hp;
    this.player1.x = p1X;
    this.player2.x = p2X;
    this.turnPhase = "move";
    this.lockedAngle = null;
    this.lockedPower = null;
    this.projectile = null;
    this.keys = { left: false, right: false };
    this.playTurnChime();
    this.updateHUD();
  }

  public syncGameOver(winnerSessionId: string, p1Hp: number, p2Hp: number) {
    this.isGameOver = true;
    this.winnerSessionId = winnerSessionId;
    this.player1.hp = p1Hp;
    this.player2.hp = p2Hp;
    this.turnPhase = "move";
    this.projectile = null;
    this.playVictoryFanfare();
    this.updateHUD();
    this.showGameOverModal();
  }

  /**
   * Launch projectile physics simulation
   */
  private launchProjectile(
    throwerSessionId: string,
    isLeft: boolean,
    throwerX: number,
    angleDeg: number,
    powerPercent: number,
    windValue: number,
    pType: string
  ) {
    this.playThrowSound();
    const rad = (angleDeg * Math.PI) / 180;
    // Speed tuned so power scales from moderate to across-screen arc
    const speed = 330 + (powerPercent / 100) * 550;
    const vx = (isLeft ? 1 : -1) * Math.cos(rad) * speed;
    const vy = -Math.sin(rad) * speed;

    this.projectile = {
      active: true,
      x: throwerX + (isLeft ? 20 : -20),
      y: this.groundY - 45,
      vx,
      vy,
      rotation: 0,
      rotSpeed: (isLeft ? 1 : -1) * 10,
      type: pType,
      isLeft,
      throwerSessionId,
    };
  }

  // Update Game Physics & State
  private update(dt: number) {
    const now = Date.now();

    // Hit flash decay
    if (this.p1HitFlash > 0) this.p1HitFlash -= dt * 3;
    if (this.p2HitFlash > 0) this.p2HitFlash -= dt * 3;

    // Screen shake decay
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      if (this.shakeTime <= 0) this.shakeMagnitude = 0;
    }

    // Clouds drift in wind direction as visual hint for players (speed magnitude stays constant)
    const windDir = this.wind < 0 ? -1 : 1;
    for (const c of this.clouds) {
      c.x += windDir * c.speed * dt;
      if (windDir > 0) {
        if (c.x > this.width + 120) c.x = -120;
      } else {
        if (c.x < -120) c.x = this.width + 120;
      }
    }

    // Active movement during "move" phase
    if (!this.isGameOver && this.isMyTurn() && this.turnPhase === "move") {
      const myP = this.getMyPlayer();
      const moveSpeed = 190;
      let moved = false;

      if (this.keys.left) {
        myP.x -= moveSpeed * dt;
        moved = true;
      }
      if (this.keys.right) {
        myP.x += moveSpeed * dt;
        moved = true;
      }

      // Constrain to respective halves
      if (myP.side === "left") {
        myP.x = Math.max(45, Math.min(this.wallX - 35, myP.x));
      } else {
        myP.x = Math.max(this.wallX + this.wallW + 35, Math.min(this.width - 45, myP.x));
      }

      if (moved && now - this.lastMoveSendTime > 45) {
        this.lastMoveSendTime = now;
        if (this.onMove) {
          this.onMove(this.matchId, myP.x);
        }
      }
    }

    // Oscillations in Angle mode
    if (!this.isGameOver && this.turnPhase === "angle") {
      const elapsed = (now - this.startTime) / 1000;
      // Oscillate between 18 and 78 degrees
      this.currentAngle = Math.round(48 + 30 * Math.sin(elapsed * 2.8));
    }

    // Oscillations in Power mode
    if (!this.isGameOver && this.turnPhase === "power") {
      const elapsed = (now - this.startTime) / 1000;
      // Ping pong smoothly between 12% and 100%
      this.currentPower = Math.round(15 + 85 * ((1 - Math.cos(elapsed * 3.6)) / 2));
    }

    // Projectile Physics
    if (this.projectile && this.projectile.active) {
      const p = this.projectile;
      const g = 690; // Gravity px/s^2
      const windAccel = this.wind * 25; // Wind acceleration px/s^2

      p.vx += windAccel * dt;
      p.vy += g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += p.rotSpeed * dt;

      // Spawn puff particle trail
      if (Math.random() < 0.6) {
        this.particles.push({
          x: p.x,
          y: p.y,
          vx: (Math.random() - 0.5) * 20,
          vy: (Math.random() - 0.5) * 20,
          color: "rgba(255, 255, 255, 0.7)",
          size: Math.random() * 4 + 2,
          alpha: 0.8,
          decay: 2.2,
          type: "smoke",
        });
      }

      // Check Collision with Middle Wall
      if (
        p.x >= this.wallX - 6 &&
        p.x <= this.wallX + this.wallW + 6 &&
        p.y >= this.wallTopY &&
        p.y <= this.groundY
      ) {
        this.onWallHit(p.x, p.y);
        return;
      }

      // Check Collision with Opponent
      const targetPlayer =
        p.throwerSessionId === this.player1.sessionId
          ? this.player2
          : this.player1;
      const distToTarget = Math.hypot(
        p.x - targetPlayer.x,
        p.y - (this.groundY - 30)
      );

      if (distToTarget <= 32) {
        this.onOpponentHit(targetPlayer, p.x, p.y);
        return;
      }

      // Check Collision with Ground
      if (p.y >= this.groundY - 6) {
        this.onGroundHit(p.x, this.groundY);
        return;
      }

      // Out of bounds
      if (p.x < -60 || p.x > this.width + 60 || p.y > this.height + 50) {
        this.onOutOfBoundsMiss();
        return;
      }
    }

    // Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.alpha -= pt.decay * dt;
      if (pt.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Update Floating Texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy * dt;
      ft.alpha -= 0.8 * dt;
      if (ft.alpha <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  private triggerScreenShake(magnitude: number, duration: number) {
    this.shakeMagnitude = magnitude;
    this.shakeTime = duration;
  }

  private onWallHit(hitX: number, hitY: number) {
    if (!this.projectile) return;
    this.projectile.active = false;
    this.playWallThudSound();
    this.triggerScreenShake(4, 0.2);

    // Wood chips particles
    for (let i = 0; i < 18; i++) {
      this.particles.push({
        x: hitX,
        y: hitY,
        vx: (Math.random() - 0.5) * 160,
        vy: (Math.random() - 0.8) * 140,
        color: "#d97706",
        size: Math.random() * 4 + 2,
        alpha: 1,
        decay: 1.8,
        type: "wood",
      });
    }

    this.floatingTexts.push({
      x: hitX,
      y: hitY - 20,
      text: "CLANG! Wall Blocked!",
      color: "#f59e0b",
      alpha: 1,
      vy: -35,
      scale: 1.1,
    });

    this.finishThrow(false, 0);
  }

  private onOpponentHit(target: ThrowBattlePlayer, hitX: number, hitY: number) {
    if (!this.projectile) return;
    this.projectile.active = false;
    this.playHitSound();
    this.triggerScreenShake(9, 0.35);

    // Flash & Damage
    if (target.side === "left") this.p1HitFlash = 1;
    else this.p2HitFlash = 1;

    const damage = 1; // 1 hit: got hit 20 times, lose
    target.hp = Math.max(0, target.hp - damage);

    // Hit sparks & explosion
    for (let i = 0; i < 30; i++) {
      this.particles.push({
        x: hitX,
        y: hitY,
        vx: (Math.random() - 0.5) * 260,
        vy: (Math.random() - 0.5) * 260,
        color: i % 2 === 0 ? "#ef4444" : "#fde047",
        size: Math.random() * 5 + 3,
        alpha: 1,
        decay: 1.6,
        type: "spark",
      });
    }

    const maxHp = target.maxHp || 20;
    this.floatingTexts.push({
      x: target.x,
      y: this.groundY - 60,
      text: `-1 HIT! (${target.hp}/${maxHp})`,
      color: "#ef4444",
      alpha: 1,
      vy: -45,
      scale: 1.3,
    });

    this.finishThrow(true, damage);
  }

  private onGroundHit(hitX: number, hitY: number) {
    if (!this.projectile) return;
    this.projectile.active = false;
    this.playPoofSound();
    this.triggerScreenShake(3, 0.15);

    // Dirt puff particles
    for (let i = 0; i < 15; i++) {
      this.particles.push({
        x: hitX,
        y: hitY - 4,
        vx: (Math.random() - 0.5) * 120,
        vy: (Math.random() - 0.8) * 90,
        color: "#78350f",
        size: Math.random() * 4 + 2,
        alpha: 1,
        decay: 1.9,
        type: "dirt",
      });
    }

    this.floatingTexts.push({
      x: hitX,
      y: hitY - 24,
      text: "Missed!",
      color: "#94a3b8",
      alpha: 1,
      vy: -30,
      scale: 1,
    });

    this.finishThrow(false, 0);
  }

  private onOutOfBoundsMiss() {
    if (!this.projectile) return;
    this.projectile.active = false;
    this.finishThrow(false, 0);
  }

  private finishThrow(hitOpponent: boolean, damage: number) {
    // Wait for visual impact to settle (~1.1s)
    setTimeout(() => {
      this.projectile = null;
      if (this.isMyTurn()) {
        const winnerSessionId =
          this.player1.hp <= 0
            ? this.player2.sessionId
            : this.player2.hp <= 0
            ? this.player1.sessionId
            : null;

        if (this.onTurnResolved) {
          this.onTurnResolved({
            matchId: this.matchId,
            hitOpponent,
            damage,
            p1Hp: this.player1.hp,
            p2Hp: this.player2.hp,
            winnerSessionId,
          });
        }
      }
    }, 1100);
  }

  // Canvas Rendering
  private render() {
    const ctx = this.ctx;
    ctx.save();

    // Screen Shake Offset
    if (this.shakeTime > 0) {
      const offsetX = (Math.random() - 0.5) * this.shakeMagnitude;
      const offsetY = (Math.random() - 0.5) * this.shakeMagnitude;
      ctx.translate(offsetX, offsetY);
    }

    // 1. Sky Gradient Background
    const skyGrad = ctx.createLinearGradient(0, 0, 0, this.groundY);
    skyGrad.addColorStop(0, "#38bdf8");
    skyGrad.addColorStop(0.7, "#7dd3fc");
    skyGrad.addColorStop(1, "#bae6fd");
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, this.width, this.groundY);

    // Sun in sky
    ctx.fillStyle = "#fef08a";
    ctx.beginPath();
    ctx.arc(400, 70, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(254, 240, 138, 0.25)";
    ctx.beginPath();
    ctx.arc(400, 70, 52, 0, Math.PI * 2);
    ctx.fill();

    // 2. Animated Clouds
    for (const c of this.clouds) {
      this.drawCloud(c.x, c.y, c.scale);
    }

    // 3. Ground Terrain (Grass & Soil)
    const grassGrad = ctx.createLinearGradient(0, this.groundY, 0, this.height);
    grassGrad.addColorStop(0, "#22c55e");
    grassGrad.addColorStop(0.12, "#16a34a");
    grassGrad.addColorStop(0.2, "#854d0e");
    grassGrad.addColorStop(1, "#451a03");
    ctx.fillStyle = grassGrad;
    ctx.fillRect(0, this.groundY, this.width, this.height - this.groundY);

    // Decorative grass blades
    ctx.strokeStyle = "#4ade80";
    ctx.lineWidth = 2;
    for (let x = 10; x < this.width; x += 22) {
      ctx.beginPath();
      ctx.moveTo(x, this.groundY);
      ctx.lineTo(x + 2, this.groundY - 5);
      ctx.stroke();
    }

    // Ground Center 50/50 Marker
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(400, this.groundY);
    ctx.lineTo(400, this.height);
    ctx.stroke();
    ctx.setLineDash([]);

    // 4. Middle Divider Fence (Fleabag vs Mutt Wooden Fence)
    this.drawFence();

    // 5. Player 1 & Player 2
    this.drawPlayer(this.player1, this.p1HitFlash);
    this.drawPlayer(this.player2, this.p2HitFlash);

    // 6. Aiming Indicator & Power Meter for Active Player
    if (!this.isGameOver && (this.turnPhase === "angle" || this.turnPhase === "power")) {
      const activeP = this.getActivePlayer();
      this.drawAimAndPower(activeP);
    }

    // 7. Projectile in flight
    if (this.projectile && this.projectile.active) {
      this.drawProjectile(this.projectile);
    }

    // 8. Particles & Splatters
    for (const pt of this.particles) {
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = Math.max(0, pt.alpha);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 9. Floating Combat Texts
    for (const ft of this.floatingTexts) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.alpha);
      ctx.font = `bold ${Math.round(15 * ft.scale)}px sans-serif`;
      ctx.fillStyle = ft.color;
      ctx.textAlign = "center";
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 4;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }

    ctx.restore();
  }

  private drawCloud(cx: number, cy: number, scale: number) {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.beginPath();
    ctx.arc(cx, cy, 20 * scale, 0, Math.PI * 2);
    ctx.arc(cx + 18 * scale, cy - 8 * scale, 24 * scale, 0, Math.PI * 2);
    ctx.arc(cx + 40 * scale, cy, 20 * scale, 0, Math.PI * 2);
    ctx.arc(cx + 20 * scale, cy + 8 * scale, 16 * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawFence() {
    const ctx = this.ctx;
    const x = this.wallX;
    const w = this.wallW;
    const y = this.wallTopY;
    const h = this.groundY - y;

    // Wooden post body
    ctx.fillStyle = "#b45309"; // amber-700
    ctx.fillRect(x, y, w, h);

    // Fence wood slats
    ctx.fillStyle = "#d97706";
    ctx.fillRect(x + 3, y + 2, w - 6, h - 2);

    // Pointed fence top
    ctx.fillStyle = "#b45309";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w / 2, y - 14);
    ctx.lineTo(x + w, y);
    ctx.closePath();
    ctx.fill();

    // Woodgrain lines
    ctx.strokeStyle = "#92400e";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + 8, y);
    ctx.lineTo(x + 8, this.groundY);
    ctx.moveTo(x + 16, y);
    ctx.lineTo(x + 16, this.groundY);
    ctx.stroke();

    // Cross rails
    ctx.fillStyle = "#78350f";
    ctx.fillRect(x - 4, y + 40, w + 8, 12);
    ctx.fillRect(x - 4, y + 105, w + 8, 12);

    // Screws / nails
    ctx.fillStyle = "#cbd5e1";
    ctx.beginPath();
    ctx.arc(x + 6, y + 46, 2, 0, Math.PI * 2);
    ctx.arc(x + w - 6, y + 46, 2, 0, Math.PI * 2);
    ctx.arc(x + 6, y + 111, 2, 0, Math.PI * 2);
    ctx.arc(x + w - 6, y + 111, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawPlayer(player: ThrowBattlePlayer, hitFlash: number) {
    const ctx = this.ctx;
    const x = player.x;
    const y = this.groundY;
    const isLeft = player.side === "left";
    const isActive = this.currentTurn === player.sessionId;

    // Shadow under player
    ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
    ctx.beginPath();
    ctx.ellipse(x, y - 2, 22, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Character body (bouncy cartoon slime)
    ctx.save();
    ctx.translate(x, y - 22);

    // Squish on walk/active
    let squishY = 1;
    if (isActive && this.turnPhase === "move" && (this.keys.left || this.keys.right)) {
      squishY = 1 + 0.12 * Math.sin(Date.now() / 80);
    }
    ctx.scale(1, squishY);

    // Flash white/red if recently hit
    if (hitFlash > 0.05) {
      ctx.fillStyle = "#ef4444";
    } else {
      ctx.fillStyle = player.color || (isLeft ? "#3b82f6" : "#ef4444");
    }

    // Slime dome
    ctx.beginPath();
    ctx.arc(0, -5, 20, Math.PI, 0);
    ctx.quadraticCurveTo(22, 10, 0, 10);
    ctx.quadraticCurveTo(-22, 10, -20, -5);
    ctx.fill();

    // Border
    ctx.strokeStyle = "rgba(0, 0, 0, 0.25)";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Cute facial eyes
    const eyeOffsetX = isLeft ? 6 : -6;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(eyeOffsetX - 5, -8, 4.5, 6, 0, 0, Math.PI * 2);
    ctx.ellipse(eyeOffsetX + 5, -8, 4.5, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pupils looking in throwing direction
    ctx.fillStyle = "#0f172a";
    const pupilLook = isLeft ? 1.5 : -1.5;
    ctx.beginPath();
    ctx.arc(eyeOffsetX - 5 + pupilLook, -8, 2.2, 0, Math.PI * 2);
    ctx.arc(eyeOffsetX + 5 + pupilLook, -8, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Eye catch-light
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(eyeOffsetX - 6 + pupilLook, -10, 1, 0, Math.PI * 2);
    ctx.arc(eyeOffsetX + 4 + pupilLook, -10, 1, 0, Math.PI * 2);
    ctx.fill();

    // Cute blush
    ctx.fillStyle = "rgba(244, 63, 94, 0.4)";
    ctx.beginPath();
    ctx.ellipse(eyeOffsetX - 8, -2, 3.5, 2, 0, 0, Math.PI * 2);
    ctx.ellipse(eyeOffsetX + 8, -2, 3.5, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Floating Player Name Tag
    ctx.save();
    ctx.font = "bold 11px sans-serif";
    const nameStr = player.name || "Player";
    const textWidth = ctx.measureText(nameStr).width;
    const tagW = textWidth + 14;
    const tagH = 18;
    const tagY = y - 56;

    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    ctx.beginPath();
    ctx.roundRect(x - tagW / 2, tagY, tagW, tagH, 6);
    ctx.fill();
    ctx.strokeStyle = isActive ? "#fde047" : "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = isActive ? "#fde047" : "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText(nameStr, x, tagY + 13);

    // Glowing Turn Marker above active player
    if (isActive) {
      const bob = 4 * Math.sin(Date.now() / 180);
      ctx.fillStyle = "#fde047";
      ctx.beginPath();
      ctx.moveTo(x, tagY - 6 + bob);
      ctx.lineTo(x - 6, tagY - 14 + bob);
      ctx.lineTo(x + 6, tagY - 14 + bob);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  private drawAimAndPower(player: ThrowBattlePlayer) {
    const ctx = this.ctx;
    const isLeft = player.side === "left";
    const originX = player.x + (isLeft ? 15 : -15);
    const originY = this.groundY - 35;

    const angleDeg = this.lockedAngle !== null ? this.lockedAngle : this.currentAngle;
    const rad = (angleDeg * Math.PI) / 180;
    const dir = isLeft ? 1 : -1;

    // 1. Dotted Aiming Arc / Line
    const length = 85;
    const targetX = originX + dir * Math.cos(rad) * length;
    const targetY = originY - Math.sin(rad) * length;

    ctx.save();
    // Angle guide line
    ctx.strokeStyle = this.turnPhase === "power" ? "#4ade80" : "#fde047";
    ctx.lineWidth = 2.5;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.lineTo(targetX, targetY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Aim arrow head
    ctx.fillStyle = this.turnPhase === "power" ? "#4ade80" : "#fde047";
    ctx.beginPath();
    ctx.arc(targetX, targetY, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Angle text pill
    const angleText = `${angleDeg}°`;
    ctx.font = "bold 12px monospace";
    ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
    ctx.fillRect(targetX + (dir > 0 ? 8 : -36), targetY - 18, 32, 16);
    ctx.strokeStyle = "#fde047";
    ctx.strokeRect(targetX + (dir > 0 ? 8 : -36), targetY - 18, 32, 16);
    ctx.fillStyle = "#fde047";
    ctx.textAlign = "center";
    ctx.fillText(angleText, targetX + (dir > 0 ? 24 : -20), targetY - 6);

    // 2. Power Meter Bar (when in power mode)
    if (this.turnPhase === "power") {
      const powerVal = this.currentPower;
      const barW = 90;
      const barH = 12;
      const barX = player.x - barW / 2;
      const barY = this.groundY - 80;

      // Outer container
      ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
      ctx.beginPath();
      ctx.roundRect(barX - 2, barY - 2, barW + 4, barH + 4, 6);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Power gradient fill
      const fillW = (barW * powerVal) / 100;
      const pGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
      pGrad.addColorStop(0, "#22c55e");
      pGrad.addColorStop(0.5, "#eab308");
      pGrad.addColorStop(1, "#ef4444");

      ctx.fillStyle = pGrad;
      ctx.beginPath();
      ctx.roundRect(barX, barY, fillW, barH, 4);
      ctx.fill();

      // Power percentage label
      ctx.font = "bold 10px monospace";
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.fillText(`${powerVal}% PWR`, player.x, barY - 5);
    }
    ctx.restore();
  }

  private drawProjectile(p: {
    x: number;
    y: number;
    rotation: number;
    type: string;
  }) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);

    // Render emoji item with shadow
    ctx.font = "24px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
    ctx.shadowBlur = 6;
    ctx.fillText(p.type, 0, 0);
    ctx.restore();
  }

  // Update HTML DOM HUD (HP bars, wind, active turn indicator)
  public updateHUD() {
    // 1. Left Player (P1)
    const p1HpBar = document.getElementById("tb-p1-hp-bar") as HTMLDivElement | null;
    const p1HpText = document.getElementById("tb-p1-hp-text");
    const p1Name = document.getElementById("tb-p1-name");
    const p1Dot = document.getElementById("tb-p1-dot");
    const p1Badge = document.getElementById("tb-p1-turn-badge");

    if (p1Name) p1Name.textContent = this.player1.name;
    if (p1Dot) p1Dot.style.backgroundColor = this.player1.color || "#3b82f6";
    if (p1HpBar) {
      const pct = Math.max(0, Math.min(100, (this.player1.hp / this.player1.maxHp) * 100));
      p1HpBar.style.width = `${pct}%`;
      p1HpBar.style.background =
        pct > 50
          ? "linear-gradient(90deg, #22c55e, #4ade80)"
          : pct > 25
          ? "linear-gradient(90deg, #eab308, #facc15)"
          : "linear-gradient(90deg, #ef4444, #f87171)";
    }
    if (p1HpText) p1HpText.textContent = String(Math.max(0, this.player1.hp));
    const p1MaxHpText = document.getElementById("tb-p1-max-hp-text");
    if (p1MaxHpText) p1MaxHpText.textContent = String(this.player1.maxHp || 20);
    if (p1Badge) {
      const isP1Turn = this.currentTurn === this.player1.sessionId;
      p1Badge.textContent = isP1Turn ? "TURNING" : "WAITING";
      p1Badge.className = isP1Turn ? "tb-turn-badge" : "tb-turn-badge hidden";
    }

    // 2. Right Player (P2)
    const p2HpBar = document.getElementById("tb-p2-hp-bar") as HTMLDivElement | null;
    const p2HpText = document.getElementById("tb-p2-hp-text");
    const p2Name = document.getElementById("tb-p2-name");
    const p2Dot = document.getElementById("tb-p2-dot");
    const p2Badge = document.getElementById("tb-p2-turn-badge");

    if (p2Name) p2Name.textContent = this.player2.name;
    if (p2Dot) p2Dot.style.backgroundColor = this.player2.color || "#ef4444";
    if (p2HpBar) {
      const pct = Math.max(0, Math.min(100, (this.player2.hp / this.player2.maxHp) * 100));
      p2HpBar.style.width = `${pct}%`;
      p2HpBar.style.background =
        pct > 50
          ? "linear-gradient(90deg, #22c55e, #4ade80)"
          : pct > 25
          ? "linear-gradient(90deg, #eab308, #facc15)"
          : "linear-gradient(90deg, #ef4444, #f87171)";
    }
    if (p2HpText) p2HpText.textContent = String(Math.max(0, this.player2.hp));
    const p2MaxHpText = document.getElementById("tb-p2-max-hp-text");
    if (p2MaxHpText) p2MaxHpText.textContent = String(this.player2.maxHp || 20);
    if (p2Badge) {
      const isP2Turn = this.currentTurn === this.player2.sessionId;
      p2Badge.textContent = isP2Turn ? "TURNING" : "WAITING";
      p2Badge.className = isP2Turn ? "tb-turn-badge" : "tb-turn-badge hidden";
    }

    // 3. Middle Turn Indicator & Wind
    const turnIndicator = document.getElementById("tb-turn-indicator");
    const windArrow = document.getElementById("tb-wind-arrow");
    const windVal = document.getElementById("tb-wind-val");

    if (turnIndicator) {
      if (this.isGameOver) {
        turnIndicator.textContent = "GAME OVER";
      } else if (this.isMyTurn()) {
        turnIndicator.textContent = "★ YOUR TURN ★";
        turnIndicator.style.color = "#fde047";
      } else {
        const oppName = this.getOpponentPlayer().name;
        turnIndicator.textContent = `${oppName}'s Turn`;
        turnIndicator.style.color = "#cbd5e1";
      }
    }

    if (windVal) {
      windVal.textContent = `${Math.abs(this.wind).toFixed(1)} mph`;
    }
    if (windArrow) {
      if (this.wind < -0.1) {
        windArrow.innerHTML = `
          <svg viewBox="0 0 24 24" class="wind-arrow-svg" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        `;
        windArrow.style.color = "#38bdf8";
        windArrow.title = `Wind blowing Left (${Math.abs(this.wind).toFixed(1)} mph)`;
      } else if (this.wind > 0.1) {
        windArrow.innerHTML = `
          <svg viewBox="0 0 24 24" class="wind-arrow-svg" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        `;
        windArrow.style.color = "#f59e0b";
        windArrow.title = `Wind blowing Right (${Math.abs(this.wind).toFixed(1)} mph)`;
      } else {
        windArrow.innerHTML = `
          <svg viewBox="0 0 24 24" class="wind-arrow-svg" fill="currentColor">
            <circle cx="12" cy="12" r="5"></circle>
          </svg>
        `;
        windArrow.style.color = "#94a3b8";
        windArrow.title = "Calm (0.0 mph)";
      }
    }

    // 4. Step Chips & Action Hints
    const stepMove = document.getElementById("tb-step-move");
    const stepAngle = document.getElementById("tb-step-angle");
    const stepPower = document.getElementById("tb-step-power");
    const stepThrow = document.getElementById("tb-step-throw");
    const hintText = document.getElementById("tb-hint-text");

    [stepMove, stepAngle, stepPower, stepThrow].forEach((el) =>
      el?.classList.remove("active")
    );

    if (this.turnPhase === "move") stepMove?.classList.add("active");
    else if (this.turnPhase === "angle") stepAngle?.classList.add("active");
    else if (this.turnPhase === "power") stepPower?.classList.add("active");
    else if (this.turnPhase === "throw") stepThrow?.classList.add("active");

    if (hintText) {
      if (this.isGameOver) {
        hintText.textContent = "Match concluded! Click Play Again or Leave Battle.";
      } else if (this.isMyTurn()) {
        if (this.turnPhase === "move") {
          hintText.textContent =
            "Step 1: Move with ← → or A / D to take position. Press [SPACE] when ready to aim.";
        } else if (this.turnPhase === "angle") {
          hintText.textContent =
            "Step 2: Aiming angle! Movement is locked. Press [SPACE] to lock angle & enter power mode.";
        } else if (this.turnPhase === "power") {
          hintText.textContent =
            "Step 3: Power charging! Press [SPACE] to lock power and THROW!";
        } else if (this.turnPhase === "throw") {
          hintText.textContent = "Step 4: Projectile is airborne! Watch it fly!";
        }
      } else {
        const opp = this.getOpponentPlayer().name;
        if (this.turnPhase === "move") {
          hintText.textContent = `${opp} is walking to take position...`;
        } else if (this.turnPhase === "angle") {
          hintText.textContent = `${opp} is aiming their throw angle...`;
        } else if (this.turnPhase === "power") {
          hintText.textContent = `${opp} is charging throw power...`;
        } else if (this.turnPhase === "throw") {
          hintText.textContent = `${opp} threw an item! Watch out!`;
        }
      }
    }
  }

  private showGameOverModal() {
    const overlay = document.getElementById("tb-gameover-overlay");
    const title = document.getElementById("tb-gameover-title");
    const subtitle = document.getElementById("tb-gameover-subtitle");

    if (overlay) overlay.classList.remove("hidden");
    const isWinner = this.winnerSessionId === this.mySessionId;
    const winnerPlayer =
      this.winnerSessionId === this.player1.sessionId ? this.player1 : this.player2;

    if (title) {
      title.textContent = isWinner ? "VICTORY!" : "DEFEAT";
      title.style.color = isWinner ? "#fde047" : "#f87171";
    }
    if (subtitle) {
      subtitle.textContent = isWinner
        ? `You won the Throw Battle against ${this.getOpponentPlayer().name}!`
        : `${winnerPlayer.name} won the Throw Battle!`;
    }
  }

  public hideGameOverModal() {
    const overlay = document.getElementById("tb-gameover-overlay");
    if (overlay) overlay.classList.add("hidden");
  }

  public destroy() {
    this.stopLoop();
    this.keys = { left: false, right: false };
    if (this.audioCtx && this.audioCtx.state !== "closed") {
      this.audioCtx.close().catch(() => {});
    }
  }
}
