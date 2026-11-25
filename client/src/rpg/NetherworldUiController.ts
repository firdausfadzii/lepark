import {
  AuthUser,
  CLASS_CATALOG,
  CLASS_IDS,
  ClassId,
  ENEMY_CATALOG,
  EquipSlot,
  EquipmentItem,
  ExpeditionResult,
  PlayerAvatars,
  PlayerOutfit,
  RPG_MAX_SHOP_RANK,
  RPG_MAX_SLIDER_EACH,
  RaidBossState,
  RpgProfileState,
  SPECIALIST_META,
  SquadBarterEligibility,
  TradeOffer,
  WEAPON_TYPES,
  WeaponType,
  aptitudePctForRank,
  aptitudeUpgradeKarmaCost,
  blacksmithRarityFusionCost,
  buildRpgGearSignature,
  dimensionalUpgradeKarmaCost,
  enemyStarMult,
  evaluatePartyAura,
  expeditionFpCost,
  focusEfficiencyKarmaCost,
  formatBigNumber,
  fpToXpGain,
  getCheatShopSliderBudget,
  mergeSpecialistLevel,
  rewardStarMult,
  shopEquipmentFpCost,
  shopRankUpgradeKarmaCost,
  starCapUnlockCost,
  toDecimal,
  xpRequiredForLevel,
} from "shared";
import { MultiplayerManager, RpgClientBundle } from "../network/MultiplayerManager";
import { BattleStageAnimator, ClashSpeed, LocalPlayerVisualInfo } from "./BattleStageAnimator";
import {
  getGearIconUrl,
  getSlotFallbackIconUrl,
  renderPlayerCharacterCanvas,
} from "./rpgGearRenderer";

export interface NetherworldUiDeps {
  getMultiplayer: () => MultiplayerManager | null;
  getCurrentUser: () => AuthUser | null;
  getFocusPoints: () => number;
  getPlayerVisualInfo: () => LocalPlayerVisualInfo;
  isFocusLocked: () => boolean;
  setGameControlsActive: (active: boolean) => void;
  onOpenGuildDecorShop?: () => void;
}

type RpgTab = "dive" | "hero" | "cheat" | "coop";

function escapeHtml(raw: string): string {
  return String(raw)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export class NetherworldUiController {
  private deps: NetherworldUiDeps;
  private boundManagers = new WeakSet<MultiplayerManager>();

  private bundle: RpgClientBundle | null = null;
  private lastExpedition: ExpeditionResult | null = null;
  private activeTab: RpgTab = "dive";
  private selectedItemId: string = "";
  private selectedShopRank: number = 1;
  private selectedWeaponType: WeaponType = "SWORD";
  private selectedReincarnateClass: ClassId | null = null;
  private selectedMergeSpecId: string | null = null;
  private clashSpeed: ClashSpeed = 1;
  private animator: BattleStageAnimator | null = null;
  private noticeTimer: number | null = null;
  private pendingGuildInteract = false;

  // Class Selection Modal
  private classSelectModal = document.getElementById("rpg-class-select-modal") as HTMLElement | null;
  private classSelectGrid = document.getElementById("rpg-class-select-grid") as HTMLElement | null;
  private btnCloseClassModal = document.getElementById("btn-close-rpg-class-modal") as HTMLButtonElement | null;
  private btnClassOpenDecorShop = document.getElementById("btn-rpg-class-open-decor-shop") as HTMLButtonElement | null;

  // Fullscreen Minimalist RPG Modal
  private rpgModal = document.getElementById("rpg-modal") as HTMLElement | null;
  private rpgTitle = document.getElementById("rpg-modal-title") as HTMLElement | null;
  private rpgPartyBadge = document.getElementById("rpg-party-badge") as HTMLElement | null;
  private btnCloseRpg = document.getElementById("btn-close-rpg-modal") as HTMLButtonElement | null;
  private btnOpenDecorShop = document.getElementById("btn-rpg-open-decor-shop") as HTMLButtonElement | null;
  private rpgFpBalance = document.getElementById("rpg-fp-balance") as HTMLElement | null;
  private rpgKarmaBalance = document.getElementById("rpg-karma-balance") as HTMLElement | null;
  private rpgNoticeBanner = document.getElementById("rpg-notice-banner") as HTMLElement | null;
  private rpgTabBody = document.getElementById("rpg-tab-body") as HTMLElement | null;
  private rpgStageMount = document.getElementById("rpg-clash-stage-mount") as HTMLElement | null;

  constructor(deps: NetherworldUiDeps) {
    this.deps = deps;
    this.bindStaticEvents();
  }

  private bindStaticEvents(): void {
    this.btnCloseRpg?.addEventListener("click", () => this.closeModal());
    this.btnCloseClassModal?.addEventListener("click", () => this.closeClassSelectModal());

    this.classSelectModal?.addEventListener("click", (e) => {
      if (e.target === this.classSelectModal) this.closeClassSelectModal();
    });

    this.btnOpenDecorShop?.addEventListener("click", () => {
      this.closeModal();
      this.deps.onOpenGuildDecorShop?.();
    });
    this.btnClassOpenDecorShop?.addEventListener("click", () => {
      this.closeClassSelectModal();
      this.deps.onOpenGuildDecorShop?.();
    });

    document.querySelectorAll<HTMLButtonElement>(".rpg-tab-btn[data-rpg-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const tab = btn.dataset.rpgTab as RpgTab;
        if (tab) {
          this.activeTab = tab;
          this.render();
        }
      });
    });

    document.querySelectorAll<HTMLButtonElement>(".rpg-speed-btn[data-clash-speed]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const raw = btn.dataset.clashSpeed;
        if (raw === "skip") {
          this.animator?.requestSkip();
          return;
        }
        const sp = Number(raw || 1) as ClashSpeed;
        this.clashSpeed = sp === 4 ? 4 : sp === 2 ? 2 : 1;
        this.animator?.setSpeed(this.clashSpeed);
        document.querySelectorAll<HTMLButtonElement>(".rpg-speed-btn[data-clash-speed]").forEach((b) => {
          b.classList.toggle("active", b.dataset.clashSpeed === String(this.clashSpeed));
        });
      });
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (this.isClassSelectOpen()) this.closeClassSelectModal();
        else if (this.isOpen()) this.closeModal();
      }
    });
  }

  public attachMultiplayer(mgr: MultiplayerManager): void {
    if (this.boundManagers.has(mgr)) return;
    this.boundManagers.add(mgr);

    mgr.onRpgStateSync((bundle) => {
      this.bundle = bundle;
      const allItems = this.getAllItems(bundle.profile);
      if (!this.selectedItemId && allItems.length > 0) {
        this.selectedItemId = allItems[0].itemId;
      }
      this.selectedShopRank = Math.min(this.selectedShopRank, bundle.profile.karmaUpgrades.shopRank);

      if (this.pendingGuildInteract) {
        this.pendingGuildInteract = false;
        this.routeGuildHelperByClass(bundle.profile);
        return;
      }
      if (this.isOpen()) this.render();
    });

    mgr.onRpgClassChosen((bundle) => {
      this.bundle = bundle;
      const allItems = this.getAllItems(bundle.profile);
      if (allItems.length > 0) this.selectedItemId = allItems[0].itemId;
      this.closeClassSelectModal();
      this.openModal("dive");
      this.showNotice(
        `Class chosen: ${CLASS_CATALOG[bundle.profile.hero.activeClass || "WARRIOR"].label}! Starter gear equipped.`,
        "success"
      );
    });

    mgr.onRpgProfileUpdated((data) => {
      if (this.bundle) {
        this.bundle = {
          ...this.bundle,
          ...(data.profile ? { profile: data.profile } : {}),
          ...(data.alliedParty ? { alliedParty: data.alliedParty } : {}),
        };
      }
      if (data.notice) this.showNotice(data.notice, "success");
      if (this.isOpen()) this.render();
    });

    mgr.onRpgExpeditionResult((data) => {
      if (data.profile && this.bundle) {
        this.bundle = { ...this.bundle, profile: data.profile };
      }
      if (data.expedition) {
        this.lastExpedition = data.expedition;
        this.activeTab = "dive";
        if (this.isOpen()) {
          this.render();
          if (this.animator) {
            this.animator.setParty(
              this.bundle?.profile.hero || null,
              data.expedition.alliedParty || this.bundle?.alliedParty || [],
              this.deps.getPlayerVisualInfo()
            );
            void this.animator.playExpedition(data.expedition);
          }
        }
      }
    });

    mgr.onRpgBarterUpdated((data) => {
      if (this.bundle) {
        this.bundle = {
          ...this.bundle,
          ...(data.offers ? { tradeOffers: data.offers } : {}),
          ...(data.profile ? { profile: data.profile } : {}),
        };
      }
      if (data.notice) this.showNotice(data.notice, "success");
      if (this.isOpen()) this.render();
    });

    mgr.onRpgRaidResult((data) => {
      if (this.bundle) {
        this.bundle = {
          ...this.bundle,
          ...(data.raid ? { raid: data.raid } : {}),
          ...(data.profile ? { profile: data.profile } : {}),
        };
      }
      if (data.hitEvent) {
        this.showNotice(
          `Raid Burst! ${formatBigNumber(data.hitEvent.damageDealt)} DMG${data.hitEvent.isCrit ? " (CRIT!)" : ""} · +${data.karmaEarned || 0} Karma`,
          "success"
        );
      }
      if (this.isOpen()) this.render();
    });

    mgr.onRpgRaidHit((data) => {
      if (data.raid && this.bundle) {
        this.bundle = { ...this.bundle, raid: data.raid };
        if (this.isOpen() && this.activeTab === "coop") this.render();
      }
    });

    mgr.onRpgCheerReceived((data) => {
      this.showNotice(`${data.fromName} sent a Live Cheer! ${data.bonusLabel}`, "success");
      this.animator?.triggerCheerBurst(data.fromName);
    });

    mgr.onRpgActionError((data) => {
      this.showNotice(data.message || "Action failed.", "error");
    });

    mgr.onFocusPointsUpdated(() => {
      if (this.isOpen()) this.renderHeaderBalances();
    });

    mgr.onSquadStateUpdated(() => {
      if (this.isOpen()) mgr.requestRpgState();
    });
  }

  /**
   * Entry point when player interacts with the Helper NPC inside Adventure Guild space.
   * - If player has no class yet -> asks which class to play.
   * - If player already has a class -> opens the minimalist fullscreen RPG modal.
   */
  public handleGuildHelperNpcInteract(): void {
    if (this.deps.isFocusLocked()) return;
    const mgr = this.deps.getMultiplayer();
    if (!mgr) return;

    if (!this.bundle) {
      this.pendingGuildInteract = true;
      mgr.requestRpgState();
      return;
    }

    this.routeGuildHelperByClass(this.bundle.profile);
    mgr.requestRpgState();
  }

  private routeGuildHelperByClass(profile: RpgProfileState): void {
    if (!profile.hero.activeClass) {
      this.openClassSelectModal();
    } else {
      this.openModal("dive");
    }
  }

  public isClassSelectOpen(): boolean {
    return !!this.classSelectModal && !this.classSelectModal.classList.contains("hidden");
  }

  private openClassSelectModal(): void {
    if (!this.classSelectModal || !this.classSelectGrid) return;
    const starterClasses = CLASS_IDS.filter((cid) => CLASS_CATALOG[cid].unlockRequirement === 0);
    const userId = this.deps.getCurrentUser()?.id || 0;

    this.classSelectGrid.innerHTML = starterClasses
      .map((cid) => {
        const cls = CLASS_CATALOG[cid];
        return `<button type="button" class="rpg-class-pick-card" data-pick-class="${cid}" ${userId <= 0 ? "disabled" : ""}>
          <div class="rpg-class-pick-title">${escapeHtml(cls.label)} <span class="rpg-chip">${cls.role}</span></div>
          <div class="rpg-class-pick-desc">${escapeHtml(cls.passiveDesc)}</div>
          <div class="rpg-muted">Synergy: ${escapeHtml(cls.synergyName)}</div>
        </button>`;
      })
      .join("") + (userId <= 0 ? `<div class="rpg-guest-banner">Sign in to choose a class and save RPG progression.</div>` : "");

    this.classSelectGrid.querySelectorAll<HTMLButtonElement>("[data-pick-class]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const cid = btn.dataset.pickClass as ClassId;
        this.deps.getMultiplayer()?.sendRpgChooseClass(cid);
      });
    });

    this.classSelectModal.classList.remove("hidden");
    this.deps.setGameControlsActive(false);
  }

  private closeClassSelectModal(): void {
    this.classSelectModal?.classList.add("hidden");
    if (!this.isOpen()) {
      this.deps.setGameControlsActive(true);
    }
  }

  public updateFocusLockButtonState(_locked: boolean): void {
    if (_locked && this.isOpen()) {
      this.closeModal();
    }
  }

  public isOpen(): boolean {
    return !!this.rpgModal && !this.rpgModal.classList.contains("hidden");
  }

  public openModal(initialTab?: RpgTab): void {
    if (this.deps.isFocusLocked()) return;
    if (initialTab) this.activeTab = initialTab;
    this.rpgModal?.classList.remove("hidden");
    this.deps.setGameControlsActive(false);
    this.deps.getMultiplayer()?.requestRpgState();
    this.ensureAnimator();
    this.render();
  }

  public closeModal(): void {
    this.rpgModal?.classList.add("hidden");
    this.deps.setGameControlsActive(true);
    if (this.animator) {
      this.animator.destroy();
      this.animator = null;
    }
  }

  private ensureAnimator(): void {
    if (!this.animator && this.rpgStageMount) {
      this.animator = new BattleStageAnimator(this.rpgStageMount);
      this.animator.setSpeed(this.clashSpeed);
      if (this.bundle?.profile?.hero) {
        this.animator.setParty(
          this.bundle.profile.hero,
          this.bundle.alliedParty || [],
          this.deps.getPlayerVisualInfo()
        );
      }
    }
  }

  private getAllItems(p: RpgProfileState): EquipmentItem[] {
    const equipped = [
      p.hero.equippedGear.weapon,
      p.hero.equippedGear.armor,
      p.hero.equippedGear.emblem,
      p.hero.equippedGear.accessory,
    ].filter((i): i is EquipmentItem => !!i);
    return [...equipped, ...p.inventory];
  }

  public showNotice(msg: string, variant: "success" | "warning" | "error" = "success"): void {
    if (!this.rpgNoticeBanner) return;
    this.rpgNoticeBanner.textContent = msg;
    this.rpgNoticeBanner.className = `rpg-notice-banner rpg-notice-${variant}`;
    if (this.noticeTimer !== null) window.clearTimeout(this.noticeTimer);
    this.noticeTimer = window.setTimeout(() => {
      this.rpgNoticeBanner?.classList.add("hidden");
    }, 3600);
  }

  private renderHeaderBalances(): void {
    const fp = this.deps.getFocusPoints();
    const p = this.bundle?.profile;
    const allies = this.bundle?.alliedParty || [];
    if (this.rpgFpBalance) this.rpgFpBalance.textContent = `${fp.toLocaleString("en-US")} FP`;
    if (this.rpgKarmaBalance) {
      this.rpgKarmaBalance.textContent = `${(p?.karma || 0).toLocaleString("en-US")} Karma`;
    }
    if (this.rpgTitle && p) {
      const clsLabel = p.hero.activeClass ? CLASS_CATALOG[p.hero.activeClass].label : "No Class";
      this.rpgTitle.textContent = `${p.hero.playerName} · Lv.${p.hero.level} ${clsLabel}`;
    }
    if (this.rpgPartyBadge) {
      const n = 1 + allies.length;
      this.rpgPartyBadge.textContent = n === 1 ? "Solo (1)" : `Party (${n})`;
    }
  }

  private render(): void {
    this.renderHeaderBalances();

    document.querySelectorAll<HTMLButtonElement>(".rpg-tab-btn[data-rpg-tab]").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.rpgTab === this.activeTab);
    });

    if (!this.rpgTabBody) return;
    const bundle = this.bundle;
    if (!bundle) {
      this.rpgTabBody.innerHTML = `<div class="rpg-loading">Connecting to Adventure Guild...</div>`;
      return;
    }

    const p = bundle.profile;
    this.animator?.setParty(p.hero, bundle.alliedParty || [], this.deps.getPlayerVisualInfo());

    if (this.activeTab === "dive") {
      this.renderDiveTab(p, bundle.alliedParty || []);
    } else if (this.activeTab === "hero") {
      this.renderHeroAndGearTab(p);
    } else if (this.activeTab === "cheat") {
      this.renderCheatTab(p);
    } else {
      this.renderCoopTab(p, bundle.raid, bundle.tradeOffers, bundle.barterEligibility);
    }
  }

  // ============================================================
  // TAB 1 (Minimalist): Dive Item World
  // ============================================================
  private renderDiveTab(p: RpgProfileState, allies: any[]): void {
    if (!this.rpgTabBody) return;
    const allItems = this.getAllItems(p);
    if (!allItems.some((i) => i.itemId === this.selectedItemId) && allItems.length > 0) {
      this.selectedItemId = allItems[0].itemId;
    }
    const activeItem = allItems.find((i) => i.itemId === this.selectedItemId) || allItems[0];
    const startFloor = activeItem ? activeItem.currentFloor + 1 : 1;
    const atCap = !!activeItem && !p.cheatShop.carnageEnabled && startFloor > activeItem.maxFloor;
    const cost10 = activeItem ? expeditionFpCost(activeItem.rank, startFloor, 10) : 15;
    const cost50 = activeItem ? expeditionFpCost(activeItem.rank, startFloor, 50) : 68;
    const aura = allies.length > 0 ? evaluatePartyAura([p.hero.activeClass || "WARRIOR", ...allies.map((a) => a.activeClass)]) : null;

    this.rpgTabBody.innerHTML = `
      <div class="rpg-minimal-dock">
        <div class="rpg-expedition-controls">
          <select id="rpg-expedition-item-select" class="rpg-select">
            ${
              allItems.length === 0
                ? `<option value="">No gear equipped</option>`
                : allItems
                    .map(
                      (i) =>
                        `<option value="${escapeHtml(i.itemId)}" ${i.itemId === activeItem?.itemId ? "selected" : ""}>
                          ${escapeHtml(i.name)} [R${i.rank} ${i.rarity} · Lv.${i.itemLevel} · F${i.currentFloor}/${i.maxFloor}]
                        </option>`
                    )
                    .join("")
            }
          </select>
          <button type="button" id="btn-rpg-dive-10" class="btn-primary rpg-dive-btn" ${!activeItem || atCap ? "disabled" : ""}>
            Dive 10F (${cost10} FP)
          </button>
          <button type="button" id="btn-rpg-dive-50" class="btn-secondary rpg-dive-btn" ${!activeItem || atCap ? "disabled" : ""}>
            Dive 50F (${cost50} FP)
          </button>
        </div>

        <div class="rpg-minimal-meta-row">
          <span>Stars: <strong>${p.cheatShop.activeStars}★</strong></span>
          <span>Best Floor: <strong>F${p.highestClearedFloor}</strong></span>
          ${aura && aura !== "STANDARD" ? `<span>Aura: <strong>${aura.replace(/_/g, " ")}</strong></span>` : ""}
          ${atCap ? `<span class="rpg-warn-text">Cap F${activeItem.maxFloor} reached — fuse Rarity in Hero &amp; Gear</span>` : ""}
        </div>

        ${
          this.lastExpedition
            ? `<div class="rpg-compact-result">
                <strong>${this.lastExpedition.clearedAll ? "Cleared" : `Wiped F${this.lastExpedition.wipeFloor}`}</strong>
                · F${this.lastExpedition.startFloor}–F${this.lastExpedition.endFloor}
                · DMG ${formatBigNumber(this.lastExpedition.totalDamageDealt)}
                · +${formatBigNumber(this.lastExpedition.xpGained)} XP
                ${this.lastExpedition.karmaGained > 0 ? `· +${this.lastExpedition.karmaGained} Karma` : ""}
                ${this.lastExpedition.subduedSpecialists.length > 0 ? `· Subdued ${this.lastExpedition.subduedSpecialists.map((s) => `${s.type} Lv.${s.newLevel}`).join(", ")}` : ""}
                ${this.lastExpedition.lootDropped.length > 0 ? `· Loot: ${this.lastExpedition.lootDropped.map((l) => `${l.name} (R${l.rank})`).join(", ")}` : ""}
              </div>`
            : ""
        }
      </div>
    `;

    const sel = document.getElementById("rpg-expedition-item-select") as HTMLSelectElement | null;
    sel?.addEventListener("change", () => {
      this.selectedItemId = sel.value;
      this.renderDiveTab(p, allies);
    });
    document.getElementById("btn-rpg-dive-10")?.addEventListener("click", () => {
      if (activeItem) this.deps.getMultiplayer()?.sendRpgLaunchExpedition(activeItem.itemId, 10);
    });
    document.getElementById("btn-rpg-dive-50")?.addEventListener("click", () => {
      if (activeItem) this.deps.getMultiplayer()?.sendRpgLaunchExpedition(activeItem.itemId, 50);
    });
  }

  // ============================================================
  // TAB 2 (Minimalist): Hero (with actual character + gear), 4 Slots & Bag
  // ============================================================
  private renderHeroAndGearTab(p: RpgProfileState): void {
    if (!this.rpgTabBody) return;
    const h = p.hero;
    const cls = CLASS_CATALOG[h.activeClass || "WARRIOR"];
    const reqXp = xpRequiredForLevel(h.level);
    const pct = Math.min(100, Math.round(toDecimal(h.xp).div(reqXp).times(100).toNumber() || 0));
    const maxRank = Math.min(RPG_MAX_SHOP_RANK, p.karmaUpgrades.shopRank);
    const buyRank = Math.max(1, Math.min(maxRank, this.selectedShopRank));
    const buyCost = shopEquipmentFpCost(buyRank);
    const nextClass = this.selectedReincarnateClass || h.activeClass || "WARRIOR";
    const allItems = this.getAllItems(p);

    const equippedSlots: Array<{ slot: EquipSlot; label: string; item?: EquipmentItem }> = [
      { slot: "WEAPON", label: "Weapon", item: h.equippedGear.weapon },
      { slot: "ARMOR", label: "Armor", item: h.equippedGear.armor },
      { slot: "EMBLEM", label: "Emblem", item: h.equippedGear.emblem },
      { slot: "ACCESSORY", label: "Accessory", item: h.equippedGear.accessory },
    ];

    this.rpgTabBody.innerHTML = `
      <div class="rpg-minimal-two-col">
        <div class="rpg-card">
          <div class="rpg-unit-top">
            <canvas id="rpg-hero-portrait-canvas" width="32" height="32" class="rpg-hero-portrait-canvas"></canvas>
            <div class="rpg-unit-info">
              <div class="rpg-unit-name">${escapeHtml(h.playerName)} <span class="rpg-chip">${cls.label}</span></div>
              <div class="rpg-unit-lv">Lv.${h.level} · R${h.reincarnations} · Stored ${h.storedLevels} · Apt ${aptitudePctForRank(p.karmaUpgrades.aptitudeRank)}%</div>
            </div>
            <button type="button" id="btn-rpg-toggle-row" class="rpg-row-toggle ${h.battleRow.toLowerCase()}">
              ${h.battleRow}
            </button>
          </div>
          <div class="rpg-xp-bar"><div class="rpg-xp-fill" style="width:${pct}%"></div></div>
          <div class="rpg-unit-actions">
            <button type="button" class="btn-secondary rpg-xs-btn" data-train-fp="25">Train 25 FP (+${formatBigNumber(fpToXpGain(25, h.reincarnations))} XP)</button>
            <button type="button" class="btn-secondary rpg-xs-btn" data-train-fp="100">Train 100 FP</button>
            <select id="rpg-reinc-class" class="rpg-select-xs">
              ${CLASS_IDS.filter((cid) => p.karmaUpgrades.dimensionalRank >= CLASS_CATALOG[cid].unlockRequirement)
                .map((cid) => `<option value="${cid}" ${cid === nextClass ? "selected" : ""}>${CLASS_CATALOG[cid].label}</option>`)
                .join("")}
            </select>
            <button type="button" id="btn-rpg-reincarnate" class="btn-primary rpg-xs-btn" ${h.level < 10 ? "disabled title='Reach Lv. 10'" : ""}>Reincarnate</button>
          </div>
          <div class="rpg-unit-actions">
            <button type="button" class="btn-secondary rpg-xs-btn" data-karma-node="aptitude">Apt+5% (${aptitudeUpgradeKarmaCost(p.karmaUpgrades.aptitudeRank)}K)</button>
            <button type="button" class="btn-secondary rpg-xs-btn" data-karma-node="shopRank" ${p.karmaUpgrades.shopRank >= RPG_MAX_SHOP_RANK ? "disabled" : ""}>Shop R${p.karmaUpgrades.shopRank + 1} (${shopRankUpgradeKarmaCost(p.karmaUpgrades.shopRank)}K)</button>
            <button type="button" class="btn-secondary rpg-xs-btn" data-karma-node="focusEfficiency">FP+10% (${focusEfficiencyKarmaCost(p.karmaUpgrades.focusEfficiencyRank)}K)</button>
            <button type="button" class="btn-secondary rpg-xs-btn" data-karma-node="dimensional">Dim R${p.karmaUpgrades.dimensionalRank + 1} (${dimensionalUpgradeKarmaCost(p.karmaUpgrades.dimensionalRank)}K)</button>
          </div>
        </div>

        <div class="rpg-card">
          <div class="rpg-card-title">Equipped RPG Gear <span class="rpg-muted">(Visible here &amp; Adventure Guild)</span></div>
          <div class="rpg-compact-slots">
            ${equippedSlots
              .map(({ slot, label, item }) =>
                item
                  ? `<div class="rpg-slot-chip rarity-${item.rarity.toLowerCase()}">
                      <img src="${getGearIconUrl(item)}" alt="${escapeHtml(item.name)}" class="rpg-gear-icon" />
                      <div>
                        <div><strong>${label}:</strong> ${escapeHtml(item.name)}</div>
                        <small class="rpg-muted">R${item.rank} · Lv.${item.itemLevel} · ${item.rarity}</small>
                      </div>
                    </div>`
                  : `<div class="rpg-slot-chip is-empty">
                      <img src="${getSlotFallbackIconUrl(slot)}" alt="${label}" class="rpg-gear-icon is-dim" />
                      <div>
                        <div><strong>${label}:</strong> None</div>
                        <small class="rpg-muted">Empty slot</small>
                      </div>
                    </div>`
              )
              .join("")}
          </div>
          <div class="rpg-shop-btn-row">
            <select id="rpg-shop-rank-select" class="rpg-select-xs">
              ${Array.from({ length: maxRank }, (_, idx) => idx + 1)
                .reverse()
                .map((r) => `<option value="${r}" ${r === buyRank ? "selected" : ""}>R${r} (${shopEquipmentFpCost(r)} FP)</option>`)
                .join("")}
            </select>
            <select id="rpg-shop-wtype-select" class="rpg-select-xs">
              ${WEAPON_TYPES.map((wt) => `<option value="${wt}" ${wt === this.selectedWeaponType ? "selected" : ""}>${wt}</option>`).join("")}
            </select>
            <button type="button" class="btn-primary rpg-xs-btn" data-buy-slot="WEAPON">Buy Wpn (${buyCost})</button>
            <button type="button" class="btn-primary rpg-xs-btn" data-buy-slot="ARMOR">Armor</button>
            <button type="button" class="btn-primary rpg-xs-btn" data-buy-slot="EMBLEM">Emblem</button>
            <button type="button" class="btn-primary rpg-xs-btn" data-buy-slot="ACCESSORY">Acc</button>
          </div>
          ${
            p.inventory.length > 0
              ? `<div class="rpg-compact-bag">
                  ${p.inventory
                    .slice(0, 12)
                    .map(
                      (i) => `<div class="rpg-bag-row">
                        <span class="rpg-bag-item-label">
                          <img src="${getGearIconUrl(i)}" alt="${escapeHtml(i.name)}" class="rpg-gear-icon-sm" />
                          <span>${escapeHtml(i.name)} <small>R${i.rank} ${i.slot} ${i.rarity}</small></span>
                        </span>
                        <div style="display:flex;gap:4px;">
                          <button type="button" class="btn-secondary rpg-xs-btn" data-equip-btn="${escapeHtml(i.itemId)}">Equip</button>
                          <button type="button" class="btn-secondary rpg-xs-btn" data-fuse-spare="${escapeHtml(i.itemId)}" title="Rarity Fusion onto equipped matching slot (${blacksmithRarityFusionCost("RARE", i.rank)} FP)">Fuse</button>
                        </div>
                      </div>`
                    )
                    .join("")}
                </div>`
              : `<div class="rpg-muted">Bag is empty. Dive Item World or buy from Shop!</div>`
          }
          ${
            p.specialistWarehouse.length > 0
              ? `<div class="rpg-spec-list">
                  ${p.specialistWarehouse
                    .map((s) => {
                      const meta = SPECIALIST_META[s.type];
                      const mergeSrc = p.specialistWarehouse.find((x) => x.id === this.selectedMergeSpecId);
                      const canFuse = mergeSrc && mergeSrc.id !== s.id && mergeSrc.type === s.type;
                      return `<span class="rpg-spec-chip subdued">
                        ${meta.name} Lv.${s.level}
                        ${
                          canFuse
                            ? `<button type="button" class="rpg-spec-act merge" data-spec-fuse="${escapeHtml(s.id)}">Fuse → Lv.${mergeSpecialistLevel(mergeSrc!.level, s.level)}</button>`
                            : `<button type="button" class="rpg-spec-act" data-spec-merge-pick="${escapeHtml(s.id)}">${this.selectedMergeSpecId === s.id ? "Picked" : "Merge"}</button>`
                        }
                        ${allItems[0] ? `<button type="button" class="rpg-spec-act" data-spec-socket="${escapeHtml(s.id)}">Socket</button>` : ""}
                      </span>`;
                    })
                    .join("")}
                </div>`
              : ""
          }
        </div>
      </div>
    `;

    // Render player's actual character + equipped RPG gear into portrait canvas
    const portraitCanvas = document.getElementById("rpg-hero-portrait-canvas") as HTMLCanvasElement | null;
    if (portraitCanvas) {
      const vis = this.deps.getPlayerVisualInfo();
      void renderPlayerCharacterCanvas({
        outfit: vis.outfit,
        avatars: vis.avatars,
        gearSignature: buildRpgGearSignature(h),
        facingRight: false,
      }).then((src) => {
        const ctx = portraitCanvas.getContext("2d");
        if (ctx) {
          ctx.imageSmoothingEnabled = false;
          ctx.clearRect(0, 0, 32, 32);
          ctx.drawImage(src, 0, 0, 32, 32);
        }
      });
    }

    this.rpgTabBody.querySelectorAll<HTMLButtonElement>("[data-train-fp]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.deps.getMultiplayer()?.sendRpgTrainHero(Number(btn.dataset.trainFp || 25));
      });
    });
    document.getElementById("btn-rpg-toggle-row")?.addEventListener("click", () => {
      this.deps.getMultiplayer()?.sendRpgUpdateTactics({
        battleRow: h.battleRow === "FRONT" ? "BACK" : "FRONT",
      });
    });
    (document.getElementById("rpg-reinc-class") as HTMLSelectElement | null)?.addEventListener("change", (e) => {
      this.selectedReincarnateClass = (e.target as HTMLSelectElement).value as ClassId;
    });
    document.getElementById("btn-rpg-reincarnate")?.addEventListener("click", () => {
      this.deps.getMultiplayer()?.sendRpgReincarnate(nextClass, h.inheritedPassives);
    });
    this.rpgTabBody.querySelectorAll<HTMLButtonElement>("[data-karma-node]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.deps.getMultiplayer()?.sendRpgUpgradeKarma(btn.dataset.karmaNode as any);
      });
    });
    (document.getElementById("rpg-shop-rank-select") as HTMLSelectElement | null)?.addEventListener("change", (e) => {
      this.selectedShopRank = Number((e.target as HTMLSelectElement).value || 1);
      this.renderHeroAndGearTab(p);
    });
    (document.getElementById("rpg-shop-wtype-select") as HTMLSelectElement | null)?.addEventListener("change", (e) => {
      this.selectedWeaponType = (e.target as HTMLSelectElement).value as WeaponType;
    });
    this.rpgTabBody.querySelectorAll<HTMLButtonElement>("[data-buy-slot]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const slot = btn.dataset.buySlot as EquipSlot;
        this.deps.getMultiplayer()?.sendRpgBuyGear(buyRank, slot, slot === "WEAPON" ? this.selectedWeaponType : undefined);
      });
    });
    this.rpgTabBody.querySelectorAll<HTMLButtonElement>("[data-equip-btn]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.deps.getMultiplayer()?.sendRpgEquipItem(btn.dataset.equipBtn || "");
      });
    });
    this.rpgTabBody.querySelectorAll<HTMLButtonElement>("[data-fuse-spare]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const spareId = btn.dataset.fuseSpare || "";
        const spare = p.inventory.find((i) => i.itemId === spareId);
        if (!spare) return;
        const target =
          spare.slot === "WEAPON"
            ? h.equippedGear.weapon
            : spare.slot === "ARMOR"
              ? h.equippedGear.armor
              : spare.slot === "EMBLEM"
                ? h.equippedGear.emblem
                : h.equippedGear.accessory;
        if (target) {
          this.deps.getMultiplayer()?.sendRpgBlacksmithRarity(target.itemId, spareId);
        }
      });
    });
    this.rpgTabBody.querySelectorAll<HTMLButtonElement>("[data-spec-merge-pick]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.specMergePick || null;
        this.selectedMergeSpecId = this.selectedMergeSpecId === id ? null : id;
        this.renderHeroAndGearTab(p);
      });
    });
    this.rpgTabBody.querySelectorAll<HTMLButtonElement>("[data-spec-fuse]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (this.selectedMergeSpecId) {
          this.deps.getMultiplayer()?.sendRpgMergeSpecialists(this.selectedMergeSpecId, btn.dataset.specFuse || "");
          this.selectedMergeSpecId = null;
        }
      });
    });
    this.rpgTabBody.querySelectorAll<HTMLButtonElement>("[data-spec-socket]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = h.equippedGear.weapon || allItems[0];
        if (target) this.deps.getMultiplayer()?.sendRpgSocketSpecialist(btn.dataset.specSocket || "", target.itemId);
      });
    });
  }

  // ============================================================
  // TAB 3 (Minimalist): Cheat Shop
  // ============================================================
  private renderCheatTab(p: RpgProfileState): void {
    if (!this.rpgTabBody) return;
    const cs = p.cheatShop;
    const budget = getCheatShopSliderBudget(p.karmaUpgrades.dimensionalRank);
    const unlockCost = starCapUnlockCost(cs.starCap);

    this.rpgTabBody.innerHTML = `
      <div class="rpg-card">
        <div class="rpg-card-header">
          <div class="rpg-card-title">Cheat Shop (${cs.xpSlider + cs.dropSlider + cs.masterySlider}% / ${budget}% Budget)</div>
          <button type="button" id="btn-rpg-unlock-star" class="btn-secondary rpg-xs-btn">+1 Star Cap (${unlockCost} FP)</button>
        </div>

        <div class="rpg-slider-block">
          <div class="rpg-slider-label">
            <span>Enemy Stars: <strong id="cs-stars-val">${cs.activeStars}★</strong> / ${cs.starCap}★</span>
            <span id="cs-stars-mult">Enemy ${enemyStarMult(cs.activeStars).toNumber().toFixed(2)}x · Rewards ${rewardStarMult(cs.activeStars).toFixed(2)}x</span>
          </div>
          <input type="range" id="cs-stars-slider" min="0" max="${cs.starCap}" value="${cs.activeStars}" class="rpg-range" />
        </div>

        <div class="rpg-slider-block">
          <div class="rpg-slider-label"><span>XP Weight</span><strong id="cs-xp-val">${cs.xpSlider}%</strong></div>
          <input type="range" id="cs-xp-slider" min="0" max="${RPG_MAX_SLIDER_EACH}" step="5" value="${cs.xpSlider}" class="rpg-range" />
        </div>

        <div class="rpg-slider-block">
          <div class="rpg-slider-label"><span>Drop Weight</span><strong id="cs-drop-val">${cs.dropSlider}%</strong></div>
          <input type="range" id="cs-drop-slider" min="0" max="${RPG_MAX_SLIDER_EACH}" step="5" value="${cs.dropSlider}" class="rpg-range" />
        </div>

        <div class="rpg-slider-block">
          <div class="rpg-slider-label"><span>Mastery Weight</span><strong id="cs-mastery-val">${cs.masterySlider}%</strong></div>
          <input type="range" id="cs-mastery-slider" min="0" max="${RPG_MAX_SLIDER_EACH}" step="5" value="${cs.masterySlider}" class="rpg-range" />
        </div>

        <div class="rpg-slider-footer">
          ${
            p.karmaUpgrades.dimensionalRank >= 1
              ? `<label class="rpg-ai-check"><input type="checkbox" id="cs-carnage-toggle" ${cs.carnageEnabled ? "checked" : ""}/> <span>Carnage (5x Enemy / 2.5x Rewards)</span></label>`
              : `<span class="rpg-muted">Dimensional Rank 1 unlocks Carnage</span>`
          }
          <button type="button" id="btn-rpg-save-cheat" class="btn-primary rpg-xs-btn">Apply</button>
        </div>
      </div>
    `;

    const starsEl = document.getElementById("cs-stars-slider") as HTMLInputElement;
    const xpEl = document.getElementById("cs-xp-slider") as HTMLInputElement;
    const dropEl = document.getElementById("cs-drop-slider") as HTMLInputElement;
    const masteryEl = document.getElementById("cs-mastery-slider") as HTMLInputElement;

    const refresh = () => {
      const s = Number(starsEl.value);
      const sv = document.getElementById("cs-stars-val");
      const sm = document.getElementById("cs-stars-mult");
      const xv = document.getElementById("cs-xp-val");
      const dv = document.getElementById("cs-drop-val");
      const mv = document.getElementById("cs-mastery-val");
      if (sv) sv.textContent = `${s}★`;
      if (sm) sm.textContent = `Enemy ${enemyStarMult(s).toNumber().toFixed(2)}x · Rewards ${rewardStarMult(s).toFixed(2)}x`;
      if (xv) xv.textContent = `${xpEl.value}%`;
      if (dv) dv.textContent = `${dropEl.value}%`;
      if (mv) mv.textContent = `${masteryEl.value}%`;
    };
    [starsEl, xpEl, dropEl, masteryEl].forEach((el) => el?.addEventListener("input", refresh));
    document.getElementById("btn-rpg-unlock-star")?.addEventListener("click", () => {
      this.deps.getMultiplayer()?.sendRpgUnlockStarCap();
    });
    document.getElementById("btn-rpg-save-cheat")?.addEventListener("click", () => {
      this.deps.getMultiplayer()?.sendRpgUpdateCheatShop({
        activeStars: Number(starsEl.value),
        xpSlider: Number(xpEl.value),
        dropSlider: Number(dropEl.value),
        masterySlider: Number(masteryEl.value),
        carnageEnabled: (document.getElementById("cs-carnage-toggle") as HTMLInputElement)?.checked ?? false,
      });
    });
  }

  // ============================================================
  // TAB 4 (Minimalist): Co-Op Raid, Camp Inbox & Squad Barter
  // ============================================================
  private renderCoopTab(
    p: RpgProfileState,
    raid: RaidBossState,
    offers: TradeOffer[],
    elig: SquadBarterEligibility
  ): void {
    if (!this.rpgTabBody) return;
    const raidDef = ENEMY_CATALOG[raid.bossId];
    const raidPct = Math.max(0, Math.min(100, toDecimal(raid.currentHp).div(toDecimal(raid.maxHp)).times(100).toNumber()));
    const totalInboxFp = p.campInbox.reduce((acc, e) => acc + e.fpAmount, 0);
    const totalInboxKarma = p.campInbox.reduce((acc, e) => acc + e.karmaAmount, 0);

    this.rpgTabBody.innerHTML = `
      <div class="rpg-minimal-two-col">
        <div class="rpg-card">
          <div class="rpg-card-header">
            <div class="rpg-raid-head">
              <div class="rpg-sprite-thumb boss" style="background-image:url('${raidDef.spriteUrl}'); background-size:${raidDef.frameSize * 4}px ${raidDef.frameSize}px; width:${raidDef.frameSize}px; height:${raidDef.frameSize}px;"></div>
              <div>
                <div class="rpg-card-title">${escapeHtml(raid.name)}</div>
                <div class="rpg-card-sub">${formatBigNumber(raid.currentHp)} / ${formatBigNumber(raid.maxHp)} (${raidPct.toFixed(1)}%) · ${(raid.activeRaiders || []).length}/16</div>
              </div>
            </div>
            <button type="button" id="btn-rpg-attack-raid" class="btn-primary rpg-xs-btn">Strike (${raid.attackFpCost} FP)</button>
          </div>
          <div class="rpg-xp-bar raid"><div class="rpg-xp-fill raid" style="width:${raidPct}%"></div></div>
          <div class="rpg-unit-actions">
            <button type="button" id="btn-rpg-claim-inbox" class="btn-secondary rpg-xs-btn" ${p.campInbox.length === 0 ? "disabled" : ""}>
              Claim Inbox (${totalInboxFp} FP · ${totalInboxKarma} K)
            </button>
            <label class="rpg-ai-check">
              <input type="checkbox" id="rpg-recruit-open-toggle" ${p.recruitOpenPartyAllies ? "checked" : ""}/>
              <span>Fill w/ Open Players</span>
            </label>
          </div>
        </div>

        <div class="rpg-card">
          <div class="rpg-card-title">Squad Barter ${elig.eligible ? "" : `(${elig.hoursInSquad}/${elig.requiredHours}h · ${elig.coFocusMinutes}/${elig.requiredCoFocusMinutes}m)`}</div>
          <div class="rpg-barter-post-row">
            <select id="rpg-barter-item-select" class="rpg-select-xs" style="flex:1;">
              ${p.inventory.length === 0 ? `<option value="">No bag items</option>` : p.inventory.map((i) => `<option value="${escapeHtml(i.itemId)}">${escapeHtml(i.name)} (R${i.rank})</option>`).join("")}
            </select>
            <input type="number" id="rpg-barter-min-rank" class="rpg-input-sm" min="1" max="40" value="1" />
            <button type="button" id="btn-rpg-post-barter" class="btn-secondary rpg-xs-btn" ${!elig.eligible || p.inventory.length === 0 ? "disabled" : ""}>Post</button>
          </div>
          <div class="rpg-barter-list">
            ${
              offers.length === 0
                ? `<div class="rpg-muted">No active Squad offers.</div>`
                : offers
                    .map(
                      (o) => `<div class="rpg-barter-row">
                        <span>${escapeHtml(o.senderName)}: ${escapeHtml(o.offeredAsset.label)}</span>
                        ${
                          o.senderId === p.userId
                            ? `<button type="button" class="btn-secondary rpg-xs-btn" data-cancel-offer="${escapeHtml(o.offerId)}">Cancel</button>`
                            : `<button type="button" class="btn-primary rpg-xs-btn" data-accept-offer="${escapeHtml(o.offerId)}" ${!elig.eligible || p.inventory.length === 0 ? "disabled" : ""}>Trade</button>`
                        }
                      </div>`
                    )
                    .join("")
            }
          </div>
        </div>
      </div>
    `;

    document.getElementById("btn-rpg-attack-raid")?.addEventListener("click", () => {
      this.deps.getMultiplayer()?.sendRpgAttackRaid();
    });
    document.getElementById("btn-rpg-claim-inbox")?.addEventListener("click", () => {
      this.deps.getMultiplayer()?.sendRpgClaimCampInbox();
    });
    document.getElementById("rpg-recruit-open-toggle")?.addEventListener("change", (e) => {
      this.deps.getMultiplayer()?.sendRpgUpdateTactics({
        recruitOpenPartyAllies: (e.target as HTMLInputElement).checked,
      });
    });
    document.getElementById("btn-rpg-post-barter")?.addEventListener("click", () => {
      const itemId = (document.getElementById("rpg-barter-item-select") as HTMLSelectElement)?.value;
      const minRank = Number((document.getElementById("rpg-barter-min-rank") as HTMLInputElement)?.value || 1);
      if (itemId) {
        this.deps.getMultiplayer()?.sendRpgPostTrade({
          kind: "EQUIPMENT",
          itemId,
          requestedLabel: `Rank ${minRank}+ Gear`,
          requestedMinLevelOrRank: minRank,
        });
      }
    });
    this.rpgTabBody.querySelectorAll<HTMLButtonElement>("[data-cancel-offer]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.deps.getMultiplayer()?.sendRpgCancelTrade(btn.dataset.cancelOffer || "");
      });
    });
    this.rpgTabBody.querySelectorAll<HTMLButtonElement>("[data-accept-offer]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const backItemId = (document.getElementById("rpg-barter-item-select") as HTMLSelectElement)?.value;
        if (backItemId) this.deps.getMultiplayer()?.sendRpgAcceptTrade(btn.dataset.acceptOffer || "", backItemId);
      });
    });
  }
}
