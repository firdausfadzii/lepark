import Decimal from "break_infinity.js";
import {
  BOSS_ENEMY_IDS,
  BossEnemyId,
  CLASS_CATALOG,
  CLASS_IDS,
  CROSS_CLASS_TRAITS,
  CheatShopState,
  ClassId,
  ENEMY_CATALOG,
  EquipSlot,
  EquipmentItem,
  ExpeditionResult,
  LiveRaidHitEvent,
  PartyMemberSnapshot,
  PlayerAvatarState,
  RARITY_FLOOR_CAPS,
  RARITY_SPECIALIST_SLOTS,
  RPG_MAX_SHOP_RANK,
  RPG_MAX_SLIDER_EACH,
  RaidBossState,
  RpgProfileState,
  Specialist,
  SquadBarterEligibility,
  TradeOffer,
  WeaponType,
  aptitudeUpgradeKarmaCost,
  blacksmithRarityFusionCost,
  blacksmithTraitTransferCost,
  buildEquipmentForRank,
  buildRpgGearSignature,
  dimensionalUpgradeKarmaCost,
  expeditionFpCost,
  focusEfficiencyKarmaCost,
  fpToXpGain,
  getCheatShopSliderBudget,
  karmaEarnedOnReincarnate,
  mergeSpecialistLevel,
  shopEquipmentFpCost,
  shopRankUpgradeKarmaCost,
  starCapUnlockCost,
  toDecimal,
} from "shared";
import {
  addFocusPoints,
  computeUserFocusStats,
  deductUserFocusPoints,
  deleteTradeOffer,
  findUserById,
  getActiveTradeOffersForSquad,
  getMondayWeekKey,
  getRaidBossJson,
  getRpgProfileJson,
  getTradeOfferById,
  insertTradeOffer,
  listArenaProfileRecords,
  saveRaidBossJson,
  saveRpgProfileJson,
} from "../db";
import { focusPointsService } from "./FocusPointsService";
import {
  applyXpToHero,
  computeHeroEffectiveStats,
  computeHeroPowerScore,
  simulateItemWorldExpedition,
  toPartyMemberSnapshot,
} from "./RpgCombatSimulator";
import { extractPlayerOutfitFromState, squadService } from "./SquadService";

const BARTER_REQUIRED_HOURS = 48;
const BARTER_REQUIRED_COFOCUS_MINUTES = 60;
const BARTER_MAX_ACTIVE_OFFERS = 2;
const BARTER_OFFER_TTL_MS = 72 * 60 * 60 * 1000;
const RAID_ATTACK_FP_COST = 50;

export type FocusLockChecker = (userId: number) => boolean;

export class RpgService {
  private static instance: RpgService | null = null;

  private focusLockChecker: FocusLockChecker | null = null;
  private squadJoinedAt = new Map<string, number>();
  private coFocusMinutes = new Map<string, number>();
  private activeCheerUntil = new Map<number, number>(); // userId -> expiresAt

  private constructor() {}

  public static getInstance(): RpgService {
    if (!RpgService.instance) {
      RpgService.instance = new RpgService();
    }
    return RpgService.instance;
  }

  public setFocusLockChecker(checker: FocusLockChecker): void {
    this.focusLockChecker = checker;
  }

  private assertBreakSpendAllowed(userId: number): string | null {
    if (userId <= 0) {
      return "Sign in with an account to save RPG progression and spend Focus Points.";
    }
    if (this.focusLockChecker && this.focusLockChecker(userId)) {
      return "Focus Lock active! Complete your Focus Session before entering menus or spending FP.";
    }
    return null;
  }

  public recordSquadMembership(squadId: string, userId: number): void {
    if (!squadId || userId <= 0) return;
    const key = `${squadId}:${userId}`;
    if (!this.squadJoinedAt.has(key)) {
      this.squadJoinedAt.set(key, Date.now());
    }
  }

  public recordCoFocusSession(participantUserIds: number[], minutes: number): void {
    if (minutes <= 0 || participantUserIds.length < 2) return;
    const unique = Array.from(new Set(participantUserIds.filter((id) => id > 0)));
    for (let i = 0; i < unique.length; i++) {
      for (let j = i + 1; j < unique.length; j++) {
        const a = Math.min(unique[i], unique[j]);
        const b = Math.max(unique[i], unique[j]);
        const key = `${a}:${b}`;
        this.coFocusMinutes.set(key, (this.coFocusMinutes.get(key) || 0) + Math.round(minutes));
      }
    }
  }

  public getSquadBarterEligibility(userId: number): SquadBarterEligibility {
    const squadId = userId > 0 ? squadService.getSquadIdForUser(userId) : null;
    if (!squadId) {
      return {
        eligible: false,
        hoursInSquad: 0,
        requiredHours: BARTER_REQUIRED_HOURS,
        coFocusMinutes: 0,
        requiredCoFocusMinutes: BARTER_REQUIRED_COFOCUS_MINUTES,
      };
    }

    this.recordSquadMembership(squadId, userId);
    const joinedAt = this.squadJoinedAt.get(`${squadId}:${userId}`) || Date.now();
    const hoursInSquad = Math.floor(((Date.now() - joinedAt) / 3_600_000) * 10) / 10;

    const members = squadService.getSquadMemberIds(squadId).filter((id) => id !== userId);
    let maxShared = 0;
    for (const otherId of members) {
      const a = Math.min(userId, otherId);
      const b = Math.max(userId, otherId);
      maxShared = Math.max(maxShared, this.coFocusMinutes.get(`${a}:${b}`) || 0);
    }

    return {
      eligible:
        hoursInSquad >= BARTER_REQUIRED_HOURS &&
        maxShared >= BARTER_REQUIRED_COFOCUS_MINUTES,
      hoursInSquad,
      requiredHours: BARTER_REQUIRED_HOURS,
      coFocusMinutes: maxShared,
      requiredCoFocusMinutes: BARTER_REQUIRED_COFOCUS_MINUTES,
    };
  }

  private createDefaultClassMastery(): Record<ClassId, number> {
    return {
      HEAVY_KNIGHT: 0,
      WARRIOR: 0,
      MAGE: 0,
      CLERGY: 0,
      THIEF: 0,
      MAGIC_KNIGHT: 0,
      PROFESSOR: 0,
    };
  }

  private async createDefaultProfile(userId: number): Promise<RpgProfileState> {
    const user = userId > 0 ? await findUserById(userId) : null;
    const playerName = user?.display_name || user?.username || (userId > 0 ? `Hero #${userId}` : "Guest Hero");

    const hero: PlayerAvatarState = {
      playerId: String(userId),
      playerName,
      spriteId: "player_character",
      level: 1,
      xp: "0",
      reincarnations: 0,
      storedLevels: 0,
      weaponMastery: 1,
      activeClass: null,
      battleRow: "FRONT",
      classMastery: this.createDefaultClassMastery(),
      classMasteryXp: this.createDefaultClassMastery(),
      inheritedPassives: [],
      aiRules: {
        rushSpecialist: true,
        nullifyGeoEffect: true,
        saveSpForBoss: true,
        triggerPartyCombo: true,
      },
      equippedGear: {},
    };

    return {
      userId,
      karma: 0,
      highestClearedFloor: 0,
      totalExpeditions: 0,
      totalGatekeepersDefeated: 0,
      totalItemGodsDefeated: 0,
      totalSpecialistsSubdued: 0,
      openPartyPool: true,
      recruitOpenPartyAllies: false,
      raidDamageDealt: "0",
      hero,
      inventory: [],
      specialistWarehouse: [],
      cheatShop: {
        starCap: 1,
        activeStars: 0,
        xpSlider: 100,
        dropSlider: 100,
        masterySlider: 100,
        carnageEnabled: false,
      },
      karmaUpgrades: {
        aptitudeRank: 0,
        shopRank: 1,
        focusEfficiencyRank: 0,
        dimensionalRank: 0,
      },
      campInbox: [],
    };
  }

  public async getProfile(userId: number): Promise<RpgProfileState> {
    if (userId <= 0) {
      return this.createDefaultProfile(0);
    }
    const raw = await getRpgProfileJson(userId);
    // Migrate cleanly if old schema or missing hero
    if (!raw || !raw.hero || !raw.hero.equippedGear) {
      const fresh = await this.createDefaultProfile(userId);
      const power = computeHeroPowerScore(fresh).toString();
      await saveRpgProfileJson(userId, fresh, power);
      return fresh;
    }

    const def = await this.createDefaultProfile(userId);
    const merged: RpgProfileState = {
      ...def,
      ...raw,
      userId,
      hero: {
        ...def.hero,
        ...raw.hero,
        classMastery: { ...def.hero.classMastery, ...(raw.hero.classMastery || {}) },
        classMasteryXp: { ...def.hero.classMasteryXp, ...(raw.hero.classMasteryXp || {}) },
        aiRules: { ...def.hero.aiRules, ...(raw.hero.aiRules || {}) },
        equippedGear: { ...def.hero.equippedGear, ...(raw.hero.equippedGear || {}) },
        inheritedPassives: Array.isArray(raw.hero.inheritedPassives) ? raw.hero.inheritedPassives : [],
      },
      cheatShop: { ...def.cheatShop, ...(raw.cheatShop || {}) },
      karmaUpgrades: { ...def.karmaUpgrades, ...(raw.karmaUpgrades || {}) },
      inventory: Array.isArray(raw.inventory) ? raw.inventory : [],
      specialistWarehouse: Array.isArray(raw.specialistWarehouse) ? raw.specialistWarehouse : [],
      campInbox: Array.isArray(raw.campInbox) ? raw.campInbox : [],
    };
    return merged;
  }

  private async persistProfile(profile: RpgProfileState): Promise<void> {
    if (profile.userId <= 0) return;
    const power = computeHeroPowerScore(profile).toString();
    await saveRpgProfileJson(profile.userId, profile, power);
    this.syncPlayerGearSignature(profile.userId, profile);
  }

  public syncPlayerGearSignature(userId: number, profile: RpgProfileState): void {
    if (userId <= 0) return;
    const sig = buildRpgGearSignature(profile.hero);
    const sessions = focusPointsService.getAllSessionsForUser(userId);
    for (const s of sessions) {
      try {
        s.playerState.rpgGearSignature = sig;
      } catch {}
    }
  }

  public async getFocusEfficiencyRank(userId: number): Promise<number> {
    if (userId <= 0) return 0;
    const profile = await this.getProfile(userId);
    return Math.max(0, profile.karmaUpgrades.focusEfficiencyRank || 0);
  }

  private async syncFpToClient(userId: number, newPoints: number, delta: number): Promise<void> {
    const user = await findUserById(userId);
    const stats = user ? computeUserFocusStats(user) : undefined;
    focusPointsService.updateUserPoints(userId, newPoints, delta, stats);
  }

  private getOnlinePlayerVisuals(userId: number) {
    const session = focusPointsService.getOnlineSessionForUser(userId);
    if (!session) return undefined;
    const avatars =
      typeof session.room?.getPlayerAvatars === "function"
        ? session.room.getPlayerAvatars(session.sessionId)
        : null;
    const outfit = extractPlayerOutfitFromState(session.playerState);
    return { outfit, avatars };
  }

  public async assembleAlliedParty(userId: number, heroProfile: RpgProfileState): Promise<PartyMemberSnapshot[]> {
    const allies: PartyMemberSnapshot[] = [];
    const seenIds = new Set<number>([userId]);

    // 1. Focus Squadmates (only when in a Focus Squad — real players only, zero NPCs)
    const squadId = userId > 0 ? squadService.getSquadIdForUser(userId) : null;
    if (squadId) {
      const memberIds = squadService.getSquadMemberIds(squadId);
      for (const mid of memberIds) {
        if (mid <= 0 || seenIds.has(mid) || allies.length >= 3) continue;
        seenIds.add(mid);
        const mProfile = await this.getProfile(mid);
        allies.push(toPartyMemberSnapshot(mProfile, true, this.getOnlinePlayerVisuals(mid)));
      }
    }

    // 2. Optional Tavern Mercenary Link (only if player opted in, and strictly real players — never NPCs)
    if (heroProfile.recruitOpenPartyAllies && allies.length < 3) {
      const poolRecords = await listArenaProfileRecords(userId, 12);
      for (const rec of poolRecords) {
        if (rec.userId <= 0 || seenIds.has(rec.userId) || allies.length >= 3) continue;
        if (!rec.profileJson?.hero || rec.profileJson?.openPartyPool === false) continue;
        seenIds.add(rec.userId);
        const mProfile = await this.getProfile(rec.userId);
        allies.push(toPartyMemberSnapshot(mProfile, false, this.getOnlinePlayerVisuals(rec.userId)));
      }
    }

    return allies.slice(0, 3);
  }

  public async getFullClientBundle(userId: number): Promise<{
    profile: RpgProfileState;
    alliedParty: PartyMemberSnapshot[];
    raid: RaidBossState;
    tradeOffers: TradeOffer[];
    barterEligibility: SquadBarterEligibility;
  }> {
    const profile = await this.getProfile(userId);
    const alliedParty = await this.assembleAlliedParty(userId, profile);
    const raid = await this.getCurrentRaidBoss();
    const squadId = userId > 0 ? squadService.getSquadIdForUser(userId) : null;
    const tradeOffers = squadId ? await getActiveTradeOffersForSquad(squadId) : [];
    const barterEligibility = this.getSquadBarterEligibility(userId);
    return { profile, alliedParty, raid, tradeOffers, barterEligibility };
  }

  // ============================================================
  // Pillar 1: Class Selection, Training, Class Mastery, Reincarnation & Karma
  // ============================================================

  public async chooseInitialClass(
    userId: number,
    classId: ClassId
  ): Promise<{ success: boolean; error?: string; profile?: RpgProfileState }> {
    const lockErr = this.assertBreakSpendAllowed(userId);
    if (lockErr) return { success: false, error: lockErr };

    if (!CLASS_IDS.includes(classId)) {
      return { success: false, error: "Invalid class selected." };
    }
    const profile = await this.getProfile(userId);
    if (profile.hero.activeClass !== null) {
      return { success: false, error: "You already have a class. Use Reincarnation to switch classes." };
    }

    const clsDef = CLASS_CATALOG[classId];
    if (profile.karmaUpgrades.dimensionalRank < clsDef.unlockRequirement) {
      return { success: false, error: `${clsDef.label} is not unlocked yet.` };
    }

    // Default starter gear for all players: Wooden Sword + Leather Armor (chest), no accessories/emblems
    const starterWeapon: EquipmentItem = {
      ...buildEquipmentForRank(1, "WEAPON", "COMMON", "SWORD", `wpn_start_${userId}`),
      name: "Wooden Sword",
      specialists: [
        {
          id: `spec_s_${userId}_1`,
          type: classId === "MAGE" || classId === "CLERGY" ? "TUTOR" : "GLADIATOR",
          level: 2,
          subdued: false,
        },
      ],
    };
    const starterArmor: EquipmentItem = {
      ...buildEquipmentForRank(1, "ARMOR", "COMMON", undefined, `arm_start_${userId}`),
      name: "Leather Armor",
      specialists: [{ id: `spec_s_${userId}_2`, type: "COACH", level: 2, subdued: false }],
    };

    profile.hero.activeClass = classId;
    profile.hero.battleRow = clsDef.defaultRow;
    profile.hero.spriteId = "player_character";
    profile.hero.equippedGear = {
      weapon: starterWeapon,
      armor: starterArmor,
    };

    await this.persistProfile(profile);
    return { success: true, profile };
  }

  public async trainHeroWithFp(
    userId: number,
    fpAmount: number
  ): Promise<{ success: boolean; error?: string; profile?: RpgProfileState; xpGained?: string }> {
    const lockErr = this.assertBreakSpendAllowed(userId);
    if (lockErr) return { success: false, error: lockErr };

    const cleanFp = Math.max(1, Math.min(10_000, Math.floor(fpAmount || 0)));
    const profile = await this.getProfile(userId);
    if (!profile.hero.activeClass) {
      return { success: false, error: "Speak with the Guild Helper NPC to choose your class first." };
    }

    const deduct = await deductUserFocusPoints(userId, cleanFp);
    if (!deduct.success) return { success: false, error: deduct.error };

    const xpGained = fpToXpGain(cleanFp, profile.hero.reincarnations);
    applyXpToHero(profile.hero, xpGained);
    await this.persistProfile(profile);
    await this.syncFpToClient(userId, deduct.newPoints, -cleanFp);

    return { success: true, profile, xpGained: xpGained.toString() };
  }

  private grantClassMasteryXp(hero: PlayerAvatarState, amount: number): void {
    const cid = hero.activeClass;
    if (!cid) return;
    const curStars = hero.classMastery[cid] || 0;
    if (curStars >= 6) return;
    hero.classMasteryXp[cid] = (hero.classMasteryXp[cid] || 0) + amount;
    while ((hero.classMastery[cid] || 0) < 6) {
      const nextStar = (hero.classMastery[cid] || 0) + 1;
      const req = nextStar * 120;
      if (hero.classMasteryXp[cid] >= req) {
        hero.classMasteryXp[cid] -= req;
        hero.classMastery[cid] = nextStar;
      } else {
        break;
      }
    }
  }

  public async reincarnateHero(
    userId: number,
    nextClassId?: ClassId,
    inheritedPassives?: string[]
  ): Promise<{ success: boolean; error?: string; profile?: RpgProfileState; karmaEarned?: number }> {
    const lockErr = this.assertBreakSpendAllowed(userId);
    if (lockErr) return { success: false, error: lockErr };

    const profile = await this.getProfile(userId);
    if (!profile.hero.activeClass) {
      return { success: false, error: "Choose your starting class at the Adventure Guild first." };
    }
    if (profile.hero.level < 10) {
      return { success: false, error: "Hero must reach at least Lv. 10 to Reincarnate." };
    }

    const targetClass: ClassId =
      nextClassId && CLASS_IDS.includes(nextClassId) ? nextClassId : profile.hero.activeClass;
    const clsDef = CLASS_CATALOG[targetClass];
    if (profile.karmaUpgrades.dimensionalRank < clsDef.unlockRequirement) {
      return {
        success: false,
        error: `${clsDef.label} requires Karma Dimensional Unlock Rank ${clsDef.unlockRequirement}.`,
      };
    }

    const user = await findUserById(userId);
    const streakDays = user ? computeUserFocusStats(user).streakDays : 0;
    const karmaEarned = Math.max(
      1,
      karmaEarnedOnReincarnate(profile.hero.level, profile.hero.reincarnations, streakDays)
    );

    profile.hero.storedLevels += profile.hero.level;
    profile.hero.reincarnations += 1;
    profile.hero.level = 1;
    profile.hero.xp = "0";
    profile.hero.activeClass = targetClass;
    profile.hero.spriteId = clsDef.spriteKey;
    profile.hero.battleRow = clsDef.defaultRow;

    if (Array.isArray(inheritedPassives)) {
      const valid = inheritedPassives
        .filter((tid) => !!CROSS_CLASS_TRAITS[tid])
        .slice(0, 2);
      profile.hero.inheritedPassives = valid;
    }

    profile.karma += karmaEarned;
    await this.persistProfile(profile);
    return { success: true, profile, karmaEarned };
  }

  public async upgradeKarmaNode(
    userId: number,
    node: "aptitude" | "shopRank" | "focusEfficiency" | "dimensional"
  ): Promise<{ success: boolean; error?: string; profile?: RpgProfileState }> {
    const lockErr = this.assertBreakSpendAllowed(userId);
    if (lockErr) return { success: false, error: lockErr };

    const profile = await this.getProfile(userId);
    let cost = 0;

    if (node === "aptitude") {
      cost = aptitudeUpgradeKarmaCost(profile.karmaUpgrades.aptitudeRank);
      if (profile.karma < cost) return { success: false, error: `Need ${cost} Karma.` };
      profile.karma -= cost;
      profile.karmaUpgrades.aptitudeRank += 1;
    } else if (node === "shopRank") {
      if (profile.karmaUpgrades.shopRank >= RPG_MAX_SHOP_RANK) {
        return {
          success: false,
          error: "Shop Rank maxes at 30. Clear Floor 100 Item Gods to unlock Ranks 31–40!",
        };
      }
      cost = shopRankUpgradeKarmaCost(profile.karmaUpgrades.shopRank);
      if (profile.karma < cost) return { success: false, error: `Need ${cost} Karma.` };
      profile.karma -= cost;
      profile.karmaUpgrades.shopRank += 1;
    } else if (node === "focusEfficiency") {
      cost = focusEfficiencyKarmaCost(profile.karmaUpgrades.focusEfficiencyRank);
      if (profile.karma < cost) return { success: false, error: `Need ${cost} Karma.` };
      profile.karma -= cost;
      profile.karmaUpgrades.focusEfficiencyRank += 1;
    } else if (node === "dimensional") {
      cost = dimensionalUpgradeKarmaCost(profile.karmaUpgrades.dimensionalRank);
      if (profile.karma < cost) return { success: false, error: `Need ${cost} Karma.` };
      profile.karma -= cost;
      profile.karmaUpgrades.dimensionalRank += 1;
    } else {
      return { success: false, error: "Invalid Karma upgrade node." };
    }

    await this.persistProfile(profile);
    return { success: true, profile };
  }

  // ============================================================
  // Pillar 2: 4-Slot Gear, Blacksmith, Item World & Specialists
  // ============================================================

  private findItemAcrossHeroAndBag(profile: RpgProfileState, itemId: string): {
    item: EquipmentItem;
    location: "equipped" | "bag";
    slotKey?: keyof PlayerAvatarState["equippedGear"];
    bagIdx?: number;
  } | null {
    const slots = ["weapon", "armor", "emblem", "accessory"] as const;
    for (const sk of slots) {
      const eq = profile.hero.equippedGear[sk];
      if (eq && eq.itemId === itemId) {
        return { item: eq, location: "equipped", slotKey: sk };
      }
    }
    const idx = profile.inventory.findIndex((i) => i.itemId === itemId);
    if (idx >= 0) {
      return { item: profile.inventory[idx], location: "bag", bagIdx: idx };
    }
    return null;
  }

  public async buyShopEquipment(
    userId: number,
    rank: number,
    slot: EquipSlot,
    weaponType?: WeaponType
  ): Promise<{ success: boolean; error?: string; profile?: RpgProfileState; item?: EquipmentItem }> {
    const lockErr = this.assertBreakSpendAllowed(userId);
    if (lockErr) return { success: false, error: lockErr };

    const profile = await this.getProfile(userId);
    const maxBuyable = Math.min(RPG_MAX_SHOP_RANK, profile.karmaUpgrades.shopRank);
    const cleanRank = Math.max(1, Math.min(maxBuyable, Math.floor(rank)));
    const cost = shopEquipmentFpCost(cleanRank);

    const deduct = await deductUserFocusPoints(userId, cost);
    if (!deduct.success) return { success: false, error: deduct.error };

    const rarRoll = Math.random();
    const rarity = rarRoll < 0.08 ? "LEGENDARY" : rarRoll < 0.35 ? "RARE" : "COMMON";
    const item = buildEquipmentForRank(cleanRank, slot, rarity, weaponType);
    if (rarity !== "COMMON") {
      item.specialists.push({
        id: `spec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        type: slot === "WEAPON" ? "GLADIATOR" : slot === "ARMOR" ? "COACH" : "STATISTICIAN",
        level: Math.max(2, cleanRank * 2),
        subdued: false,
      });
    }

    profile.inventory.unshift(item);
    if (profile.inventory.length > 60) profile.inventory = profile.inventory.slice(0, 60);

    await this.persistProfile(profile);
    await this.syncFpToClient(userId, deduct.newPoints, -cost);
    return { success: true, profile, item };
  }

  public async equipItem(
    userId: number,
    itemId: string
  ): Promise<{ success: boolean; error?: string; profile?: RpgProfileState }> {
    const lockErr = this.assertBreakSpendAllowed(userId);
    if (lockErr) return { success: false, error: lockErr };

    const profile = await this.getProfile(userId);
    const bagIdx = profile.inventory.findIndex((i) => i.itemId === itemId);
    if (bagIdx === -1) return { success: false, error: "Item not found in inventory." };

    const incoming = profile.inventory[bagIdx];
    const slotKey: keyof PlayerAvatarState["equippedGear"] =
      incoming.slot === "WEAPON"
        ? "weapon"
        : incoming.slot === "ARMOR"
          ? "armor"
          : incoming.slot === "EMBLEM"
            ? "emblem"
            : "accessory";

    const current = profile.hero.equippedGear[slotKey];
    profile.inventory.splice(bagIdx, 1);
    if (current) profile.inventory.unshift(current);
    profile.hero.equippedGear[slotKey] = incoming;

    await this.persistProfile(profile);
    return { success: true, profile };
  }

  public async campBlacksmithRarityFusion(
    userId: number,
    targetItemId: string,
    duplicateItemId: string
  ): Promise<{ success: boolean; error?: string; profile?: RpgProfileState }> {
    const lockErr = this.assertBreakSpendAllowed(userId);
    if (lockErr) return { success: false, error: lockErr };
    if (targetItemId === duplicateItemId) {
      return { success: false, error: "Choose a different spare copy to fuse." };
    }

    const profile = await this.getProfile(userId);
    const targetRef = this.findItemAcrossHeroAndBag(profile, targetItemId);
    const sacIdx = profile.inventory.findIndex((i) => i.itemId === duplicateItemId);
    if (!targetRef || sacIdx === -1) {
      return { success: false, error: "Target or spare item not found." };
    }

    const target = targetRef.item;
    const spare = profile.inventory[sacIdx];
    if (target.slot !== spare.slot) {
      return { success: false, error: "Rarity Fusion requires matching item slot." };
    }
    if (target.rarity === "LEGENDARY") {
      return { success: false, error: "Target item is already Legendary." };
    }

    const nextRarity = target.rarity === "COMMON" ? "RARE" : "LEGENDARY";
    const cost = blacksmithRarityFusionCost(nextRarity, target.rank);
    const deduct = await deductUserFocusPoints(userId, cost);
    if (!deduct.success) return { success: false, error: deduct.error };

    profile.inventory.splice(sacIdx, 1);
    target.rarity = nextRarity;
    target.maxFloor = RARITY_FLOOR_CAPS[nextRarity];
    target.maxSpecialistSlots = RARITY_SPECIALIST_SLOTS[nextRarity];
    if (!target.name.includes("★") && nextRarity === "LEGENDARY") {
      target.name = `${target.name.replace(" +", "")} ★`;
    } else if (!target.name.includes("+") && nextRarity === "RARE") {
      target.name = `${target.name} +`;
    }

    await this.persistProfile(profile);
    await this.syncFpToClient(userId, deduct.newPoints, -cost);
    return { success: true, profile };
  }

  public async campBlacksmithTraitTransfer(
    userId: number,
    targetItemId: string,
    sourceItemId: string,
    traitId: string
  ): Promise<{ success: boolean; error?: string; profile?: RpgProfileState }> {
    const lockErr = this.assertBreakSpendAllowed(userId);
    if (lockErr) return { success: false, error: lockErr };
    if (targetItemId === sourceItemId) {
      return { success: false, error: "Select a different source item." };
    }

    const profile = await this.getProfile(userId);
    const targetRef = this.findItemAcrossHeroAndBag(profile, targetItemId);
    const srcIdx = profile.inventory.findIndex((i) => i.itemId === sourceItemId);
    if (!targetRef || srcIdx === -1) return { success: false, error: "Items not found." };

    const target = targetRef.item;
    const source = profile.inventory[srcIdx];
    if (!source.passiveTraits.includes(traitId)) {
      return { success: false, error: "Source item does not possess that Passive Trait." };
    }
    if (target.rarity === "COMMON") {
      return { success: false, error: "Upgrade item to Rare or Legendary first to hold Passive Traits." };
    }

    const cost = blacksmithTraitTransferCost(target.rank);
    const deduct = await deductUserFocusPoints(userId, cost);
    if (!deduct.success) return { success: false, error: deduct.error };

    const maxTraits = target.rarity === "LEGENDARY" ? 2 : 1;
    if (!target.passiveTraits.includes(traitId)) {
      if (target.passiveTraits.length >= maxTraits) {
        target.passiveTraits[target.passiveTraits.length - 1] = traitId;
      } else {
        target.passiveTraits.push(traitId);
      }
    }
    profile.inventory.splice(srcIdx, 1);

    await this.persistProfile(profile);
    await this.syncFpToClient(userId, deduct.newPoints, -cost);
    return { success: true, profile };
  }

  public async launchExpedition(
    userId: number,
    itemId: string,
    floorCount: 10 | 50
  ): Promise<{
    success: boolean;
    error?: string;
    profile?: RpgProfileState;
    expedition?: ExpeditionResult;
  }> {
    const lockErr = this.assertBreakSpendAllowed(userId);
    if (lockErr) return { success: false, error: lockErr };

    const batchSize: 10 | 50 = floorCount === 50 ? 50 : 10;
    const profile = await this.getProfile(userId);
    if (!profile.hero.activeClass) {
      return { success: false, error: "Choose your starting class at the Adventure Guild first." };
    }
    const itemRef = this.findItemAcrossHeroAndBag(profile, itemId);
    if (!itemRef) return { success: false, error: "Target equipment not found." };

    const targetItem = itemRef.item;
    const startFloor = Math.max(1, targetItem.currentFloor + 1);
    if (!profile.cheatShop.carnageEnabled && startFloor > targetItem.maxFloor) {
      return {
        success: false,
        error: `Reached ${targetItem.rarity} floor cap (F${targetItem.maxFloor}). Use Rarity Fusion at the Blacksmith or enable Carnage!`,
      };
    }

    const fpCost = expeditionFpCost(targetItem.rank, startFloor, batchSize);
    const deduct = await deductUserFocusPoints(userId, fpCost);
    if (!deduct.success) return { success: false, error: deduct.error };

    const allies = await this.assembleAlliedParty(userId, profile);
    const cheerExp = this.activeCheerUntil.get(userId) || 0;
    const hasActiveCheerBuff = cheerExp > Date.now();

    const sim = simulateItemWorldExpedition({
      profile,
      targetItem,
      allies,
      startFloor,
      floorCount: batchSize,
      fpSpent: fpCost,
      newTotalFp: deduct.newPoints,
      hasActiveCheerBuff,
    });

    if (itemRef.location === "equipped" && itemRef.slotKey) {
      profile.hero.equippedGear[itemRef.slotKey] = sim.updatedTargetItem;
    } else if (typeof itemRef.bagIdx === "number") {
      profile.inventory[itemRef.bagIdx] = sim.updatedTargetItem;
    }

    for (const loot of sim.newLootItems) {
      profile.inventory.unshift(loot);
    }
    if (profile.inventory.length > 60) profile.inventory = profile.inventory.slice(0, 60);

    for (const spec of sim.subduedToWarehouse) {
      profile.specialistWarehouse.unshift(spec);
    }
    if (profile.specialistWarehouse.length > 80) {
      profile.specialistWarehouse = profile.specialistWarehouse.slice(0, 80);
    }

    applyXpToHero(profile.hero, sim.xpGained);
    profile.hero.weaponMastery += sim.masteryGain;
    this.grantClassMasteryXp(profile.hero, sim.classMasteryXpGain);

    profile.karma += sim.karmaGained;
    profile.totalExpeditions += 1;
    profile.totalGatekeepersDefeated += sim.bossKillsAdded;
    profile.totalItemGodsDefeated += sim.itemGodsDefeated;
    profile.totalSpecialistsSubdued += sim.subduedCount;
    profile.highestClearedFloor = Math.max(
      profile.highestClearedFloor,
      sim.updatedTargetItem.currentFloor
    );

    if (sim.bossKillsAdded > 0 && profile.karmaUpgrades.shopRank < RPG_MAX_SHOP_RANK) {
      profile.karmaUpgrades.shopRank = Math.min(
        RPG_MAX_SHOP_RANK,
        profile.karmaUpgrades.shopRank + sim.bossKillsAdded
      );
    }

    await this.persistProfile(profile);
    await this.syncFpToClient(userId, deduct.newPoints, -fpCost);

    // Send Assist Karma + Class Mastery XP to real allied players' Camp Inbox
    for (const ally of allies) {
      const allyUid = Number(ally.playerId);
      if (Number.isInteger(allyUid) && allyUid > 0 && allyUid !== userId) {
        void this.deliverAssistReward(
          allyUid,
          userId,
          profile.hero.playerName,
          sim.result.assistKarmaSentPerAlly,
          Math.max(5, Math.floor(sim.classMasteryXpGain * 0.4))
        );
      }
    }

    return { success: true, profile, expedition: sim.result };
  }

  private async deliverAssistReward(
    targetUserId: number,
    fromUserId: number,
    fromName: string,
    karmaAmount: number,
    classMasteryXp: number
  ): Promise<void> {
    const p = await this.getProfile(targetUserId);
    p.campInbox.push({
      id: `assist_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      kind: "ASSIST_KARMA",
      fromUserId,
      fromName,
      fpAmount: 0,
      karmaAmount,
      classMasteryXp,
      createdAt: Date.now(),
    });
    if (p.campInbox.length > 30) p.campInbox = p.campInbox.slice(-30);
    await this.persistProfile(p);
  }

  public async mergeWarehouseSpecialists(
    userId: number,
    specId1: string,
    specId2: string
  ): Promise<{ success: boolean; error?: string; profile?: RpgProfileState }> {
    const lockErr = this.assertBreakSpendAllowed(userId);
    if (lockErr) return { success: false, error: lockErr };
    if (specId1 === specId2) return { success: false, error: "Select two different Specialists." };

    const profile = await this.getProfile(userId);
    const idx1 = profile.specialistWarehouse.findIndex((s) => s.id === specId1);
    const idx2 = profile.specialistWarehouse.findIndex((s) => s.id === specId2);
    if (idx1 === -1 || idx2 === -1) {
      return { success: false, error: "Specialists must be in your Warehouse to merge." };
    }

    const s1 = profile.specialistWarehouse[idx1];
    const s2 = profile.specialistWarehouse[idx2];
    if (s1.type !== s2.type) {
      return { success: false, error: "Only matching Specialist types can be merged." };
    }

    s1.level = mergeSpecialistLevel(s1.level, s2.level);
    profile.specialistWarehouse.splice(idx2, 1);

    await this.persistProfile(profile);
    return { success: true, profile };
  }

  public async socketSpecialist(
    userId: number,
    specId: string,
    targetItemId: string
  ): Promise<{ success: boolean; error?: string; profile?: RpgProfileState }> {
    const lockErr = this.assertBreakSpendAllowed(userId);
    if (lockErr) return { success: false, error: lockErr };

    const profile = await this.getProfile(userId);
    const sIdx = profile.specialistWarehouse.findIndex((s) => s.id === specId);
    const itemRef = this.findItemAcrossHeroAndBag(profile, targetItemId);
    if (sIdx === -1 || !itemRef) return { success: false, error: "Specialist or item not found." };

    if (itemRef.item.specialists.length >= itemRef.item.maxSpecialistSlots) {
      return {
        success: false,
        error: `Item sockets full (${itemRef.item.maxSpecialistSlots} max for ${itemRef.item.rarity}).`,
      };
    }

    const [spec] = profile.specialistWarehouse.splice(sIdx, 1);
    itemRef.item.specialists.push(spec);

    await this.persistProfile(profile);
    return { success: true, profile };
  }

  // ============================================================
  // Pillar 3: Cheat Shop & Personal Tactics
  // ============================================================

  public async unlockCheatStarCap(
    userId: number
  ): Promise<{ success: boolean; error?: string; profile?: RpgProfileState }> {
    const lockErr = this.assertBreakSpendAllowed(userId);
    if (lockErr) return { success: false, error: lockErr };

    const profile = await this.getProfile(userId);
    if (profile.cheatShop.starCap >= 40) {
      return { success: false, error: "Cheat Shop Star Cap is already maxed (40)." };
    }

    const cost = starCapUnlockCost(profile.cheatShop.starCap);
    const deduct = await deductUserFocusPoints(userId, cost);
    if (!deduct.success) return { success: false, error: deduct.error };

    profile.cheatShop.starCap += 1;
    await this.persistProfile(profile);
    await this.syncFpToClient(userId, deduct.newPoints, -cost);
    return { success: true, profile };
  }

  public async updateCheatShop(
    userId: number,
    payload: Partial<CheatShopState>
  ): Promise<{ success: boolean; error?: string; profile?: RpgProfileState }> {
    const lockErr = this.assertBreakSpendAllowed(userId);
    if (lockErr) return { success: false, error: lockErr };

    const profile = await this.getProfile(userId);
    const budget = getCheatShopSliderBudget(profile.karmaUpgrades.dimensionalRank);

    const activeStars = Math.max(
      0,
      Math.min(profile.cheatShop.starCap, Math.floor(payload.activeStars ?? profile.cheatShop.activeStars))
    );
    const xpSlider = Math.max(0, Math.min(RPG_MAX_SLIDER_EACH, Math.floor(payload.xpSlider ?? profile.cheatShop.xpSlider)));
    const dropSlider = Math.max(0, Math.min(RPG_MAX_SLIDER_EACH, Math.floor(payload.dropSlider ?? profile.cheatShop.dropSlider)));
    const masterySlider = Math.max(0, Math.min(RPG_MAX_SLIDER_EACH, Math.floor(payload.masterySlider ?? profile.cheatShop.masterySlider)));

    if (xpSlider + dropSlider + masterySlider > budget) {
      return { success: false, error: `Cheat Shop slider sum exceeds your ${budget}% budget.` };
    }

    profile.cheatShop = {
      ...profile.cheatShop,
      activeStars,
      xpSlider,
      dropSlider,
      masterySlider,
      carnageEnabled:
        profile.karmaUpgrades.dimensionalRank >= 1 ? !!payload.carnageEnabled : false,
    };

    await this.persistProfile(profile);
    return { success: true, profile };
  }

  public async updateHeroTactics(
    userId: number,
    payload: {
      battleRow?: "FRONT" | "BACK";
      aiRules?: Partial<PlayerAvatarState["aiRules"]>;
      openPartyPool?: boolean;
      recruitOpenPartyAllies?: boolean;
    }
  ): Promise<{ success: boolean; error?: string; profile?: RpgProfileState; alliedParty?: PartyMemberSnapshot[] }> {
    const lockErr = this.assertBreakSpendAllowed(userId);
    if (lockErr) return { success: false, error: lockErr };

    const profile = await this.getProfile(userId);
    if (payload.battleRow === "FRONT" || payload.battleRow === "BACK") {
      profile.hero.battleRow = payload.battleRow;
    }
    if (payload.aiRules) {
      profile.hero.aiRules = {
        ...profile.hero.aiRules,
        ...payload.aiRules,
      };
    }
    if (typeof payload.openPartyPool === "boolean") {
      profile.openPartyPool = payload.openPartyPool;
    }
    if (typeof payload.recruitOpenPartyAllies === "boolean") {
      profile.recruitOpenPartyAllies = payload.recruitOpenPartyAllies;
    }

    await this.persistProfile(profile);
    const alliedParty = await this.assembleAlliedParty(userId, profile);
    return { success: true, profile, alliedParty };
  }

  // ============================================================
  // Pure PvE Co-Op MMO: Camp Inbox, Live Cheer, Squad Barter & Live Co-Op Raid
  // ============================================================

  public async grantSquadCheerCarePackages(
    completerUserId: number,
    completerName: string,
    squadMemberIds: number[],
    earnedFp: number
  ): Promise<void> {
    if (completerUserId <= 0 || earnedFp <= 0) return;
    const cheerFp = Math.max(1, Math.floor(earnedFp * 0.15));

    for (const memberId of squadMemberIds) {
      if (memberId <= 0 || memberId === completerUserId) continue;
      const profile = await this.getProfile(memberId);
      profile.campInbox.push({
        id: `cheer_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        kind: "SQUAD_CHEER",
        fromUserId: completerUserId,
        fromName: completerName,
        fpAmount: cheerFp,
        karmaAmount: 0,
        classMasteryXp: 0,
        createdAt: Date.now(),
      });
      if (profile.campInbox.length > 30) profile.campInbox = profile.campInbox.slice(-30);
      await this.persistProfile(profile);
    }
  }

  public async sendLiveSquadCheer(
    senderUserId: number,
    senderName: string,
    targetUserId: number
  ): Promise<{ success: boolean; error?: string }> {
    const squadId = squadService.getSquadIdForUser(senderUserId);
    if (!squadId) return { success: false, error: "Join a Focus Squad to Cheer teammates." };
    const members = squadService.getSquadMemberIds(squadId);
    if (!members.includes(targetUserId) || targetUserId === senderUserId) {
      return { success: false, error: "Target must be an active squadmate." };
    }
    this.activeCheerUntil.set(targetUserId, Date.now() + 10 * 60_000);
    focusPointsService.sendToUser(targetUserId, "RPG_CHEER_RECEIVED", {
      fromName: senderName,
      bonusLabel: "+20% Crit Damage Surge (10m)!",
    });
    return { success: true };
  }

  public async claimCampInbox(
    userId: number
  ): Promise<{
    success: boolean;
    error?: string;
    claimedFp?: number;
    claimedKarma?: number;
    profile?: RpgProfileState;
  }> {
    const lockErr = this.assertBreakSpendAllowed(userId);
    if (lockErr) return { success: false, error: lockErr };

    const profile = await this.getProfile(userId);
    if (profile.campInbox.length === 0) {
      return { success: false, error: "Camp Inbox is empty." };
    }

    const totalFp = profile.campInbox.reduce((acc, e) => acc + e.fpAmount, 0);
    const totalKarma = profile.campInbox.reduce((acc, e) => acc + e.karmaAmount, 0);
    const totalClassXp = profile.campInbox.reduce((acc, e) => acc + e.classMasteryXp, 0);
    profile.campInbox = [];

    if (totalKarma > 0) profile.karma += totalKarma;
    if (totalClassXp > 0) this.grantClassMasteryXp(profile.hero, totalClassXp);

    if (totalFp > 0) {
      const newTotalFp = await addFocusPoints(userId, totalFp);
      await this.syncFpToClient(userId, newTotalFp, totalFp);
    }
    await this.persistProfile(profile);

    return {
      success: true,
      claimedFp: totalFp,
      claimedKarma: totalKarma,
      profile,
    };
  }

  public async postTradeOffer(
    userId: number,
    payload: {
      kind: "SPECIALIST" | "EQUIPMENT";
      itemId?: string;
      specialistId?: string;
      requestedLabel: string;
      requestedMinLevelOrRank: number;
    }
  ): Promise<{ success: boolean; error?: string; offers?: TradeOffer[]; profile?: RpgProfileState }> {
    const lockErr = this.assertBreakSpendAllowed(userId);
    if (lockErr) return { success: false, error: lockErr };

    const squadId = squadService.getSquadIdForUser(userId);
    if (!squadId) return { success: false, error: "Join a Focus Squad to use the Barter Board." };

    const elig = this.getSquadBarterEligibility(userId);
    if (!elig.eligible) {
      return {
        success: false,
        error: `Co-Focus Eligibility Gate: Need ${elig.requiredHours}h in squad (${elig.hoursInSquad}h) & ${elig.requiredCoFocusMinutes}m shared focus (${elig.coFocusMinutes}m).`,
      };
    }

    const activeOffers = await getActiveTradeOffersForSquad(squadId);
    if (activeOffers.filter((o: TradeOffer) => o.senderId === userId).length >= BARTER_MAX_ACTIVE_OFFERS) {
      return { success: false, error: `Maximum ${BARTER_MAX_ACTIVE_OFFERS} active barter offers.` };
    }

    const profile = await this.getProfile(userId);
    const user = await findUserById(userId);
    const senderName = user?.display_name || user?.username || profile.hero.playerName;
    const now = Date.now();
    let offer: TradeOffer;

    if (payload.kind === "SPECIALIST") {
      const sIdx = profile.specialistWarehouse.findIndex((s) => s.id === payload.specialistId);
      if (sIdx === -1) return { success: false, error: "Subdued Specialist not found in Warehouse." };
      const [spec] = profile.specialistWarehouse.splice(sIdx, 1);

      offer = {
        offerId: `trade_${now.toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        squadId,
        senderId: userId,
        senderName,
        offeredAsset: {
          kind: "SPECIALIST",
          specialistId: spec.id,
          templateId: `spec_${spec.type.toLowerCase()}`,
          label: `Lv.${spec.level} ${spec.type}`,
          levelOrRank: spec.level,
          rarity: "RARE",
        },
        requestedCriteria: {
          kind: "SPECIALIST",
          templateId: "any",
          minLevelOrRank: Math.max(1, Math.floor(payload.requestedMinLevelOrRank || 1)),
          label: payload.requestedLabel || "Any Specialist",
        },
        createdAt: now,
        expiresAt: now + BARTER_OFFER_TTL_MS,
      };
    } else {
      const idx = profile.inventory.findIndex((i) => i.itemId === payload.itemId);
      if (idx === -1) return { success: false, error: "Select an unequipped item from inventory." };
      const [item] = profile.inventory.splice(idx, 1);

      offer = {
        offerId: `trade_${now.toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        squadId,
        senderId: userId,
        senderName,
        offeredAsset: {
          kind: "EQUIPMENT",
          itemId: item.itemId,
          templateId: item.templateId,
          label: `${item.name} (R${item.rank} Lv.${item.itemLevel})`,
          levelOrRank: item.rank,
          itemLevel: item.itemLevel,
          rarity: item.rarity,
        },
        requestedCriteria: {
          kind: "EQUIPMENT",
          templateId: "any",
          minLevelOrRank: Math.max(1, Math.floor(payload.requestedMinLevelOrRank || 1)),
          label: payload.requestedLabel || `Rank ${item.rank}+ Gear`,
        },
        createdAt: now,
        expiresAt: now + BARTER_OFFER_TTL_MS,
      };
    }

    await this.persistProfile(profile);
    await insertTradeOffer(offer);
    const updatedOffers = await getActiveTradeOffersForSquad(squadId);
    return { success: true, offers: updatedOffers, profile };
  }

  public async acceptTradeOffer(
    userId: number,
    offerId: string,
    offeredBackItemId: string
  ): Promise<{ success: boolean; error?: string; offers?: TradeOffer[]; profile?: RpgProfileState }> {
    const lockErr = this.assertBreakSpendAllowed(userId);
    if (lockErr) return { success: false, error: lockErr };

    const squadId = squadService.getSquadIdForUser(userId);
    if (!squadId) return { success: false, error: "Must be in a Focus Squad." };

    const elig = this.getSquadBarterEligibility(userId);
    if (!elig.eligible) {
      return {
        success: false,
        error: `Co-Focus Gate: Need ${elig.requiredHours}h in squad & ${elig.requiredCoFocusMinutes}m shared focus.`,
      };
    }

    const offer = (await getTradeOfferById(offerId)) as TradeOffer | null;
    if (!offer || offer.squadId !== squadId || offer.expiresAt <= Date.now()) {
      return { success: false, error: "Trade offer expired or not found." };
    }
    if (offer.senderId === userId) {
      return { success: false, error: "Cannot accept your own barter offer." };
    }

    const buyerProfile = await this.getProfile(userId);
    const backIdx = buyerProfile.inventory.findIndex((i) => i.itemId === offeredBackItemId);
    if (backIdx === -1) return { success: false, error: "Select an unequipped item to trade." };
    const [backItem] = buyerProfile.inventory.splice(backIdx, 1);

    const senderProfile = await this.getProfile(offer.senderId);
    senderProfile.inventory.unshift(backItem);

    if (offer.offeredAsset.kind === "EQUIPMENT") {
      const received = buildEquipmentForRank(
        offer.offeredAsset.levelOrRank,
        "WEAPON",
        offer.offeredAsset.rarity,
        undefined,
        offer.offeredAsset.itemId
      );
      received.itemLevel = offer.offeredAsset.itemLevel || 0;
      received.name = offer.offeredAsset.label.split(" (R")[0] || received.name;
      buyerProfile.inventory.unshift(received);
    } else {
      const typeToken = offer.offeredAsset.label.split(" ")[1] as any;
      buyerProfile.specialistWarehouse.unshift({
        id: offer.offeredAsset.specialistId || `spec_${Date.now().toString(36)}`,
        type: typeToken || "GLADIATOR",
        level: offer.offeredAsset.levelOrRank,
        subdued: true,
      });
    }

    await deleteTradeOffer(offerId);
    await this.persistProfile(buyerProfile);
    await this.persistProfile(senderProfile);
    const updatedOffers = await getActiveTradeOffersForSquad(squadId);
    return { success: true, offers: updatedOffers, profile: buyerProfile };
  }

  public async cancelTradeOffer(
    userId: number,
    offerId: string
  ): Promise<{ success: boolean; error?: string; offers?: TradeOffer[] }> {
    const lockErr = this.assertBreakSpendAllowed(userId);
    if (lockErr) return { success: false, error: lockErr };

    const offer = (await getTradeOfferById(offerId)) as TradeOffer | null;
    if (!offer || offer.senderId !== userId) {
      return { success: false, error: "Offer not found." };
    }
    await deleteTradeOffer(offerId);
    const updatedOffers = await getActiveTradeOffersForSquad(offer.squadId);
    return { success: true, offers: updatedOffers };
  }

  // ============================================================
  // Live Co-Op Raid Stages (Shared Boss Room)
  // ============================================================

  public async getCurrentRaidBoss(): Promise<RaidBossState> {
    const weekKey = getMondayWeekKey(new Date());
    const existing = await getRaidBossJson(weekKey);
    if (existing) {
      const r = existing as RaidBossState;
      r.activeRaiders = (r.activeRaiders || []).filter((a) => Date.now() - a.lastHitAt < 10 * 60_000);
      r.recentHits = r.recentHits || [];
      return r;
    }

    const weekNum = Math.floor(Date.now() / (7 * 86_400_000));
    const bossId: BossEnemyId = BOSS_ENEMY_IDS[weekNum % BOSS_ENEMY_IDS.length];
    const bossDef = ENEMY_CATALOG[bossId];

    const fresh: RaidBossState = {
      raidId: `raid_${weekKey}_${bossId}`,
      bossId,
      name: `Overlord ${bossDef.name}`,
      title: `Weekly Trillion-HP ${bossDef.title}`,
      maxHp: "1000000000000",
      currentHp: "1000000000000",
      attackFpCost: RAID_ATTACK_FP_COST,
      totalParticipants: 0,
      activeRaiders: [],
      topContributors: [],
      recentHits: [],
      weekKey,
    };
    await saveRaidBossJson(weekKey, fresh);
    return fresh;
  }

  public async attackRaidBoss(
    userId: number
  ): Promise<{
    success: boolean;
    error?: string;
    raid?: RaidBossState;
    hitEvent?: LiveRaidHitEvent;
    karmaEarned?: number;
    profile?: RpgProfileState;
  }> {
    const lockErr = this.assertBreakSpendAllowed(userId);
    if (lockErr) return { success: false, error: lockErr };

    const raid = await this.getCurrentRaidBoss();
    const profile = await this.getProfile(userId);
    if (!profile.hero.activeClass) {
      return { success: false, error: "Choose your starting class at the Adventure Guild first." };
    }
    const deduct = await deductUserFocusPoints(userId, raid.attackFpCost);
    if (!deduct.success) return { success: false, error: deduct.error };

    const user = await findUserById(userId);
    const playerName = user?.display_name || user?.username || profile.hero.playerName;
    const now = Date.now();
    const heroClsId: ClassId = profile.hero.activeClass;

    // Update active raiders (up to 16 simultaneous raiders in break window)
    const active = (raid.activeRaiders || []).filter((a) => now - a.lastHitAt < 10 * 60_000);
    const existingRaider = active.find((a) => a.userId === userId);
    if (existingRaider) {
      existingRaider.lastHitAt = now;
      existingRaider.classId = heroClsId;
    } else if (active.length < 16) {
      active.push({
        userId,
        name: playerName,
        classId: heroClsId,
        lastHitAt: now,
      });
    }
    raid.activeRaiders = active;

    // Co-Op Room Auras: Vanguard Shield (Tank present), Inspirational Aura (Clergy/Professor present)
    const hasTank = active.some((a) => a.classId === "HEAVY_KNIGHT");
    const hasAmp = active.some((a) => a.classId === "CLERGY" || a.classId === "PROFESSOR");
    const auraMult = (hasTank ? 1.2 : 1.0) * (hasAmp ? 1.35 : 1.0);
    const activeAuraLabel = [
      hasTank ? "Vanguard Shield" : null,
      hasAmp ? "Inspirational Aura" : null,
    ]
      .filter(Boolean)
      .join(" + ");

    const stats = computeHeroEffectiveStats(profile, hasTank && hasAmp);
    const cls = CLASS_CATALOG[heroClsId];
    const offense = Decimal.max(stats.atk, stats.int);
    const isCrit = Math.random() < 0.3;
    const burst = offense
      .times(cls.skillMult)
      .times(10)
      .times(auraMult)
      .times(isCrit ? 1.6 : 1.0)
      .floor();

    const currHp = toDecimal(raid.currentHp);
    const nextHp = Decimal.max(0, currHp.minus(burst));
    raid.currentHp = nextHp.toString();

    const existingContrib = raid.topContributors.find((c) => c.userId === userId);
    if (existingContrib) {
      existingContrib.damage = toDecimal(existingContrib.damage).plus(burst).toString();
      existingContrib.name = playerName;
      existingContrib.classId = heroClsId;
    } else {
      raid.topContributors.push({
        userId,
        name: playerName,
        classId: heroClsId,
        damage: burst.toString(),
      });
      raid.totalParticipants += 1;
    }
    raid.topContributors.sort((a, b) => (toDecimal(b.damage).gt(toDecimal(a.damage)) ? 1 : -1));
    raid.topContributors = raid.topContributors.slice(0, 10);

    const hitEvent: LiveRaidHitEvent = {
      attackerId: String(userId),
      attackerName: playerName,
      classId: heroClsId,
      spriteId: cls.spriteKey,
      damageDealt: burst.toString(),
      isCrit,
      remainingBossHp: raid.currentHp,
      ...(activeAuraLabel ? { activeAuraLabel } : {}),
    };
    raid.recentHits = [hitEvent, ...(raid.recentHits || [])].slice(0, 12);

    const karmaEarned = Math.max(10, Math.min(250, Math.floor(burst.log10() * 8)));
    profile.karma += karmaEarned;
    profile.raidDamageDealt = toDecimal(profile.raidDamageDealt).plus(burst).toString();
    this.grantClassMasteryXp(profile.hero, 40);

    await saveRaidBossJson(raid.weekKey, raid);
    await this.persistProfile(profile);
    await this.syncFpToClient(userId, deduct.newPoints, -raid.attackFpCost);

    return { success: true, raid, hitEvent, karmaEarned, profile };
  }
}

export const rpgService = RpgService.getInstance();
