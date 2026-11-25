import Decimal from "break_infinity.js";
import {
  ALL_SPECIALIST_TYPES,
  BOSS_ENEMY_IDS,
  BossEnemyId,
  CLASS_CATALOG,
  ClassId,
  ENEMY_CATALOG,
  EnemyId,
  EquipmentItem,
  ExpeditionResult,
  FloorBattleEvent,
  FloorEnemySnapshot,
  FloorMilestone,
  GEO_EFFECT_CATALOG,
  GeoEffectId,
  ItemRarity,
  NORMAL_ENEMY_IDS,
  PartyAura,
  PartyMemberSnapshot,
  PlayerAvatarState,
  PlayerAvatars,
  PlayerOutfit,
  RPG_LEVEL_CAP,
  RPG_MAX_ITEM_RANK,
  RpgProfileState,
  Specialist,
  SpecialistType,
  SynergyComboTrigger,
  WEAPON_APTITUDE_MULTS,
  WeaponType,
  aptitudePctForRank,
  buildEquipmentForRank,
  buildRpgGearSignature,
  calculateDamage,
  calculateTotalStat,
  enemyStarMult,
  enemyStatAtFloor,
  evaluatePartyAura,
  rewardStarMult,
  storedLevelsToBonusBasePts,
  toDecimal,
  totalClassMasteryStars,
  xpRequiredForLevel,
} from "shared";

const GEO_EFFECT_IDS: GeoEffectId[] = [
  "ATK_UP_50",
  "ENEMY_DEF_25",
  "POISON_5",
  "XP_UP_30",
];

function collectEquippedList(hero: PlayerAvatarState): EquipmentItem[] {
  return [
    hero.equippedGear.weapon,
    hero.equippedGear.armor,
    hero.equippedGear.emblem,
    hero.equippedGear.accessory,
  ].filter((i): i is EquipmentItem => !!i);
}

function sumSpecialistBonus(items: EquipmentItem[], type: SpecialistType): number {
  let total = 0;
  for (const item of items) {
    for (const spec of item.specialists) {
      if (spec.type === type) {
        total += spec.subdued ? spec.level * 2 : spec.level;
      }
    }
  }
  return total;
}

function hasGearTrait(items: EquipmentItem[], traitId: string): boolean {
  return items.some((i) => i.passiveTraits.includes(traitId));
}

export interface EffectiveStatBlock {
  hp: Decimal;
  atk: Decimal;
  def: Decimal;
  int: Decimal;
  res: Decimal;
  spd: Decimal;
}

export function computeHeroEffectiveStats(
  profile: RpgProfileState,
  hasTrinityAura: boolean
): EffectiveStatBlock {
  const hero = profile.hero;
  const activeClassId: ClassId = hero.activeClass || "WARRIOR";
  const cls = CLASS_CATALOG[activeClassId];
  const items = collectEquippedList(hero);
  const bonusPts = storedLevelsToBonusBasePts(hero.storedLevels);
  const karmaApt = aptitudePctForRank(profile.karmaUpgrades.aptitudeRank);
  const masteryStars = totalClassMasteryStars(hero.classMastery);
  const playerShopRank = Math.max(1, profile.karmaUpgrades.shopRank);
  const playerHighestFloor = Math.max(1, profile.highestClearedFloor);

  const wType = hero.equippedGear.weapon?.weaponType;
  const wAptRank = wType ? cls.weaponAptitudes[wType] : "B";
  const wAptMult = WEAPON_APTITUDE_MULTS[wAptRank];

  const calcStat = (
    key: "hp" | "atk" | "def" | "int" | "res" | "spd",
    baseVal: number,
    specType: SpecialistType
  ): Decimal => {
    let total = new Decimal(baseVal + Math.floor(bonusPts * (key === "hp" ? 0.6 : 0.3)))
      .times(hero.level)
      .times(cls.classMult);

    const specFlat = sumSpecialistBonus(items, specType);
    if (items.length === 0) {
      total = calculateTotalStat(
        baseVal + Math.floor(bonusPts * 0.3),
        hero.level,
        cls.classMult,
        undefined,
        key,
        wAptMult,
        playerShopRank,
        playerHighestFloor,
        specFlat,
        karmaApt,
        masteryStars,
        hero.weaponMastery,
        hasTrinityAura
      );
    } else {
      // Sum base char once + all 4 equipped slots
      let gearAccum = new Decimal(0);
      items.forEach((item, idx) => {
        const contrib = calculateTotalStat(
          idx === 0 ? baseVal + Math.floor(bonusPts * 0.3) : 0,
          idx === 0 ? hero.level : 0,
          idx === 0 ? cls.classMult : 1,
          item,
          key,
          wAptMult,
          playerShopRank,
          playerHighestFloor,
          idx === 0 ? specFlat : 0,
          karmaApt,
          masteryStars,
          hero.weaponMastery,
          hasTrinityAura
        );
        gearAccum = gearAccum.plus(contrib);
      });
      total = gearAccum;
    }

    if (key === "hp") total = total.times(2.4);
    return total.floor();
  };

  let hp = calcStat("hp", cls.baseStats.hp, "DIETICIAN");
  let atk = calcStat("atk", cls.baseStats.atk, "GLADIATOR");
  let def = calcStat("def", cls.baseStats.def, "COACH");
  let int = calcStat("int", cls.baseStats.int, "TUTOR");
  let res = calcStat("res", cls.baseStats.res, "PHYSICIAN");
  let spd = calcStat("spd", cls.baseStats.spd, "SPRINTER");

  // Inherited Cross-Class Traits
  if (hero.inheritedPassives.includes("IRON_WALL")) {
    def = def.times(1.15).floor();
  }
  if (hero.inheritedPassives.includes("ARCANE_SURGE")) {
    int = int.times(1.2).floor();
  }
  if (hero.inheritedPassives.includes("SPELLBLADE_ECHO")) {
    atk = atk.plus(int.times(0.35)).floor();
    int = int.plus(atk.times(0.2)).floor();
  }
  if (hero.activeClass === "MAGIC_KNIGHT") {
    atk = atk.plus(int.times(0.4)).floor();
    int = int.plus(atk.times(0.25)).floor();
  }
  if (hero.battleRow === "BACK" && cls.isRanged) {
    atk = atk.times(1.15).floor();
    int = int.times(1.15).floor();
  }
  if (hasGearTrait(items, "TRINITY_CONDUIT_10") && hasTrinityAura) {
    hp = hp.times(1.1).floor();
    atk = atk.times(1.1).floor();
    int = int.times(1.1).floor();
  }

  return { hp, atk, def, int, res, spd };
}

export function computeHeroPowerScore(profile: RpgProfileState): Decimal {
  const s = computeHeroEffectiveStats(profile, false);
  return s.atk.plus(s.int).plus(s.def).plus(s.res).plus(s.hp.div(4)).floor();
}

export function toPartyMemberSnapshot(
  profile: RpgProfileState,
  isSquadmate: boolean,
  visuals?: { outfit?: PlayerOutfit; avatars?: PlayerAvatars | null }
): PartyMemberSnapshot {
  const stats = computeHeroEffectiveStats(profile, false);
  const activeClass: ClassId = profile.hero.activeClass || "WARRIOR";
  return {
    playerId: profile.hero.playerId,
    playerName: profile.hero.playerName,
    spriteId: CLASS_CATALOG[activeClass].spriteKey,
    activeClass,
    battleRow: profile.hero.battleRow,
    level: profile.hero.level,
    isSquadmate,
    outfit: visuals?.outfit,
    avatars: visuals?.avatars ?? null,
    gearSignature: buildRpgGearSignature(profile.hero),
    effectiveStats: {
      hp: stats.hp.toString(),
      atk: stats.atk.toString(),
      def: stats.def.toString(),
      int: stats.int.toString(),
      res: stats.res.toString(),
      spd: stats.spd.toString(),
    },
  };
}

interface SimCombatant {
  playerId: string;
  playerName: string;
  activeClass: ClassId;
  row: "FRONT" | "BACK";
  maxHp: Decimal;
  hp: Decimal;
  offense: Decimal;
  def: Decimal;
  skillMult: number;
  isMainHero: boolean;
}

interface SimEnemy {
  enemyId: EnemyId | "specialist" | "mimic";
  name: string;
  tier: "NORMAL" | "BOSS" | "ITEM_GOD" | "SPECIALIST" | "MYSTERY";
  maxHp: Decimal;
  hp: Decimal;
  atk: Decimal;
  def: Decimal;
  isBoss: boolean;
  specialistType?: SpecialistType;
  specialistLevel?: number;
}

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export interface SimulationOutput {
  result: ExpeditionResult;
  updatedTargetItem: EquipmentItem;
  newLootItems: EquipmentItem[];
  subduedToWarehouse: Specialist[];
  xpGained: Decimal;
  masteryGain: number;
  classMasteryXpGain: number;
  karmaGained: number;
  bossKillsAdded: number;
  itemGodsDefeated: number;
  subduedCount: number;
}

export function simulateItemWorldExpedition(params: {
  profile: RpgProfileState;
  targetItem: EquipmentItem;
  allies: PartyMemberSnapshot[]; // 3 real allied players (Squad / Tavern Mercenaries)
  startFloor: number;
  floorCount: 10 | 50;
  fpSpent: number;
  newTotalFp: number;
  hasActiveCheerBuff?: boolean;
}): SimulationOutput {
  const {
    profile,
    targetItem,
    allies,
    startFloor,
    floorCount,
    fpSpent,
    newTotalFp,
    hasActiveCheerBuff,
  } = params;

  const workingItem: EquipmentItem = {
    ...targetItem,
    baseStats: { ...targetItem.baseStats },
    specialists: targetItem.specialists.map((s) => ({ ...s })),
    passiveTraits: [...targetItem.passiveTraits],
  };

  // Enforce Item World Floor Cap (Infinite in Carnage)
  const capEnd = profile.cheatShop.carnageEnabled
    ? startFloor + floorCount - 1
    : Math.min(workingItem.maxFloor, startFloor + floorCount - 1);

  const heroClassId: ClassId = profile.hero.activeClass || "WARRIOR";
  const partyClasses: ClassId[] = [
    heroClassId,
    ...allies.map((a) => a.activeClass),
  ];
  const partyAura: PartyAura = evaluatePartyAura(partyClasses);
  const hasTrinityAura = partyAura === "TRINITY_AURA";
  const isGlassCannon = partyAura === "GLASS_CANNON_RUSH";

  const heroStats = computeHeroEffectiveStats(profile, hasTrinityAura);
  const heroCls = CLASS_CATALOG[heroClassId];
  const equippedItems = collectEquippedList(profile.hero);

  const party: SimCombatant[] = [
    {
      playerId: profile.hero.playerId,
      playerName: profile.hero.playerName,
      activeClass: heroClassId,
      row: profile.hero.battleRow,
      maxHp: isGlassCannon ? heroStats.hp.times(0.8).floor() : heroStats.hp,
      hp: isGlassCannon ? heroStats.hp.times(0.8).floor() : heroStats.hp,
      offense: Decimal.max(heroStats.atk, heroStats.int),
      def: Decimal.max(heroStats.def, heroStats.res),
      skillMult: heroCls.skillMult,
      isMainHero: true,
    },
    ...allies.map((ally) => {
      const aCls = CLASS_CATALOG[ally.activeClass];
      const baseHp = toDecimal(ally.effectiveStats.hp);
      const maxHp = (isGlassCannon ? baseHp.times(0.8) : hasTrinityAura ? baseHp.times(1.25) : baseHp).floor();
      const rawOff = Decimal.max(toDecimal(ally.effectiveStats.atk), toDecimal(ally.effectiveStats.int));
      const rawDef = Decimal.max(toDecimal(ally.effectiveStats.def), toDecimal(ally.effectiveStats.res));
      return {
        playerId: ally.playerId,
        playerName: ally.playerName,
        activeClass: ally.activeClass,
        row: ally.battleRow,
        maxHp,
        hp: maxHp,
        offense: (hasTrinityAura ? rawOff.times(1.25) : rawOff).floor(),
        def: (hasTrinityAura ? rawDef.times(1.25) : rawDef).floor(),
        skillMult: aCls.skillMult,
        isMainHero: false,
      };
    }),
  ];

  // Party-wide role flags
  const hasTank = party.some((m) => m.activeClass === "HEAVY_KNIGHT");
  const hasMage = party.some((m) => m.activeClass === "MAGE");
  const hasClergy = party.some((m) => m.activeClass === "CLERGY");
  const hasThief = party.some((m) => m.activeClass === "THIEF");
  const hasMagicKnight = party.some((m) => m.activeClass === "MAGIC_KNIGHT");
  const hasProfessor = party.some((m) => m.activeClass === "PROFESSOR");

  const starEnemyMult = enemyStarMult(profile.cheatShop.activeStars);
  const carnageEnemyMult = profile.cheatShop.carnageEnabled ? 5 : 1;
  const rewardMult =
    rewardStarMult(profile.cheatShop.activeStars, hasTrinityAura) *
    (profile.cheatShop.carnageEnabled ? 2.5 : 1);

  const statisticianBonus = Math.min(300, sumSpecialistBonus(equippedItems, "STATISTICIAN"));
  const instructorBonus = Math.min(300, sumSpecialistBonus(equippedItems, "INSTRUCTOR"));
  const collectorBonus = Math.min(200, sumSpecialistBonus(equippedItems, "COLLECTOR"));

  const xpSliderMult =
    (profile.cheatShop.xpSlider / 100) *
    (1 + statisticianBonus / 100) *
    (hasProfessor ? 1.25 : 1.0);
  const dropSliderMult =
    (profile.cheatShop.dropSlider / 100) *
    (1 + collectorBonus / 100) *
    (hasThief || profile.hero.inheritedPassives.includes("TREASURE_HUNTER") ? 1.35 : 1.0);
  const masterySliderMult =
    (profile.cheatShop.masterySlider / 100) *
    (1 + instructorBonus / 100) *
    (hasProfessor ? 1.25 : 1.0);

  const floorSummaries: FloorMilestone[] = [];
  const subduedSpecialists: { type: string; newLevel: number }[] = [];
  const subduedToWarehouse: Specialist[] = [];
  const newLootItems: EquipmentItem[] = [];
  const lootDropped: ExpeditionResult["lootDropped"] = [];

  let totalDamageDealt = new Decimal(0);
  let totalXpGained = new Decimal(0);
  let totalKarmaGained = 0;
  let gatekeepersDefeated = 0;
  let itemGodsDefeated = 0;
  let clearedAll = true;
  let wipeFloor: number | undefined;

  for (let floor = startFloor; floor <= capEnd; floor++) {
    const isItemGodFloor = floor === 100 && workingItem.rarity === "LEGENDARY";
    const isBossFloor = !isItemGodFloor && floor % 10 === 0;
    const roll = Math.random();

    let archetype: FloorMilestone["archetype"] = "SKIRMISH";
    if (isItemGodFloor) archetype = "ITEM_GOD";
    else if (isBossFloor) archetype = "GATEKEEPER";
    else if (roll <= 0.25) archetype = "SPECIALIST";
    else if (roll <= 0.35) archetype = "MYSTERY";

    const baseFloorStat = enemyStatAtFloor(workingItem.rank, floor)
      .times(starEnemyMult)
      .times(carnageEnemyMult);

    const enemies: SimEnemy[] = [];
    let bossId: BossEnemyId | undefined;
    let geoEffect: GeoEffectId | undefined;
    let geoBroken = false;

    if (archetype === "ITEM_GOD" || archetype === "GATEKEEPER") {
      const mult = archetype === "ITEM_GOD" ? 4.0 : 2.5;
      bossId = floor % 20 === 0 ? "big_orc" : BOSS_ENEMY_IDS[Math.floor(Math.random() * BOSS_ENEMY_IDS.length)];
      const bossDef = ENEMY_CATALOG[bossId];
      const bossHp = baseFloorStat.times(mult).times(bossDef.hpMult).times(5.2).floor();
      enemies.push({
        enemyId: bossId,
        name: archetype === "ITEM_GOD" ? `Item God ${bossDef.name}` : bossDef.name,
        tier: archetype === "ITEM_GOD" ? "ITEM_GOD" : "BOSS",
        maxHp: bossHp,
        hp: bossHp,
        atk: baseFloorStat.times(mult).times(bossDef.atkMult).times(1.15).floor(),
        def: baseFloorStat.times(mult).times(bossDef.defMult).times(0.95).floor(),
        isBoss: true,
      });
      for (let g = 0; g < 2; g++) {
        const gid = pickRandom(NORMAL_ENEMY_IDS);
        const gdef = ENEMY_CATALOG[gid];
        const gHp = baseFloorStat.times(1.35).times(gdef.hpMult).times(6.0).floor();
        enemies.push({
          enemyId: gid,
          name: `Elite ${gdef.name}`,
          tier: "NORMAL",
          maxHp: gHp,
          hp: gHp,
          atk: baseFloorStat.times(1.2).times(gdef.atkMult).times(1.15).floor(),
          def: baseFloorStat.times(1.15).times(gdef.defMult).times(0.85).floor(),
          isBoss: false,
        });
      }
    } else if (archetype === "SPECIALIST") {
      // Prefer unsubdued specialist resident on item if one exists, else roll wild
      const unsubduedIdx = workingItem.specialists.findIndex((s) => !s.subdued);
      const specType =
        unsubduedIdx >= 0
          ? workingItem.specialists[unsubduedIdx].type
          : pickRandom(ALL_SPECIALIST_TYPES);
      const specLevel =
        unsubduedIdx >= 0
          ? workingItem.specialists[unsubduedIdx].level
          : Math.max(2, Math.floor(workingItem.rank * 3 + floor * 0.9));

      const specHp = baseFloorStat.times(11.5).floor();
      enemies.push({
        enemyId: "specialist",
        name: `${specType} Spirit`,
        tier: "SPECIALIST",
        maxHp: specHp,
        hp: specHp,
        atk: baseFloorStat.times(1.2).floor(),
        def: baseFloorStat.times(0.85).floor(),
        isBoss: false,
        specialistType: specType,
        specialistLevel: specLevel,
      });
      const count = 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < count; i++) {
        const eid = pickRandom(NORMAL_ENEMY_IDS);
        const edef = ENEMY_CATALOG[eid];
        const eHp = baseFloorStat.times(edef.hpMult).times(10.8).floor();
        enemies.push({
          enemyId: eid,
          name: edef.name,
          tier: "NORMAL",
          maxHp: eHp,
          hp: eHp,
          atk: baseFloorStat.times(edef.atkMult).times(2.15).floor(),
          def: baseFloorStat.times(edef.defMult).times(0.95).floor(),
          isBoss: false,
        });
      }
    } else if (archetype === "MYSTERY") {
      const mimicHp = baseFloorStat.times(12.5).floor();
      enemies.push({
        enemyId: "mimic",
        name: "Bounty Vault Mimic",
        tier: "MYSTERY",
        maxHp: mimicHp,
        hp: mimicHp,
        atk: baseFloorStat.times(2.1).floor(),
        def: baseFloorStat.times(1.0).floor(),
        isBoss: false,
      });
      for (let i = 0; i < 2; i++) {
        const eid = pickRandom(NORMAL_ENEMY_IDS);
        const edef = ENEMY_CATALOG[eid];
        const eHp = baseFloorStat.times(edef.hpMult).times(10.5).floor();
        enemies.push({
          enemyId: eid,
          name: edef.name,
          tier: "NORMAL",
          maxHp: eHp,
          hp: eHp,
          atk: baseFloorStat.times(edef.atkMult).times(2.0).floor(),
          def: baseFloorStat.times(edef.defMult).times(0.9).floor(),
          isBoss: false,
        });
      }
    } else {
      geoEffect = pickRandom(GEO_EFFECT_IDS);
      const count = 3 + Math.floor(Math.random() * 2);
      for (let i = 0; i < count; i++) {
        const eid = pickRandom(NORMAL_ENEMY_IDS);
        const edef = ENEMY_CATALOG[eid];
        const eHp = baseFloorStat.times(edef.hpMult).times(11.2).floor();
        enemies.push({
          enemyId: eid,
          name: edef.name,
          tier: "NORMAL",
          maxHp: eHp,
          hp: eHp,
          atk: baseFloorStat.times(edef.atkMult).times(2.15).floor(),
          def: baseFloorStat.times(edef.defMult).times(0.95).floor(),
          isBoss: false,
        });
      }
    }

    const enemySnapshots: FloorEnemySnapshot[] = enemies.map((e) => ({
      enemyId: e.enemyId,
      name: e.name,
      tier: e.tier,
      maxHp: e.maxHp.toString(),
      isBoss: e.isBoss,
    }));

    // Between-floor healing (Clergy Expedition Sustain + Divine Ward)
    const healPct =
      (hasClergy ? 0.45 : 0.2) +
      (profile.hero.inheritedPassives.includes("DIVINE_WARD") ? 0.15 : 0);
    for (const m of party) {
      if (m.hp.gt(0)) {
        m.hp = Decimal.min(m.maxHp, m.hp.plus(m.maxHp.times(healPct)).floor());
      }
    }

    let floorDamage = new Decimal(0);
    let specialistSubduedName: string | undefined;
    let specialistSubduedInFloor = false;
    let synergyCombo: SynergyComboTrigger | undefined;
    const floorEvents: FloorBattleEvent[] = [];
    const mainWeaponType: WeaponType | undefined = profile.hero.equippedGear.weapon?.weaponType;

    // Emit initial party heal pulse if recovering between floors
    if (floor > startFloor && party[0]?.hp.gt(0) && floorEvents.length < 32) {
      floorEvents.push({
        turn: 0,
        side: "ALLY",
        actorIndex: 0,
        actorName: party[0].playerName,
        actionKind: "HEAL",
        targetIndices: party.map((_, idx) => idx),
        damages: party.map((m) => m.maxHp.times(healPct).floor().toString()),
        targetHpAfter: party.map((m) => m.hp.toString()),
        targetMaxHp: party.map((m) => m.maxHp.toString()),
        isCrit: false,
        isDefeat: party.map(() => false),
      });
    }

    for (let turn = 1; turn <= 14; turn++) {
      const aliveParty = party.filter((m) => m.hp.gt(0));
      const aliveEnemies = enemies.filter((e) => e.hp.gt(0));
      if (aliveParty.length === 0 || aliveEnemies.length === 0) break;

      if (
        turn === 1 &&
        geoEffect &&
        !geoBroken &&
        (profile.hero.aiRules.nullifyGeoEffect ||
          hasMage ||
          profile.hero.inheritedPassives.includes("ARCANE_SURGE")) &&
        GEO_EFFECT_CATALOG[geoEffect].isEnemyBuff
      ) {
        geoBroken = true;
      }
      const activeGeo = geoBroken ? undefined : geoEffect;

      // Cross-Player Synergy Trigger on Turn 1 of Boss or Combo floors
      if (turn === 1 && (isBossFloor || isItemGodFloor) && profile.hero.aiRules.triggerPartyCombo) {
        if (hasTank) {
          const tank = aliveParty.find((m) => m.activeClass === "HEAVY_KNIGHT");
          const finisher =
            aliveParty.find((m) => m.activeClass === "WARRIOR" || m.activeClass === "THIEF") ||
            aliveParty[0];
          if (tank && finisher) {
            const comboDmg = finisher.offense.times(2.2).floor();
            synergyCombo = {
              initiatorName: tank.playerName,
              initiatorClass: tank.activeClass,
              finisherName: finisher.playerName,
              finisherClass: finisher.activeClass,
              comboName: "Sunder Guard → Relentless Follow-Up",
              bonusDamage: comboDmg.toString(),
            };
          }
        } else if (hasMage && hasMagicKnight) {
          const mage = aliveParty.find((m) => m.activeClass === "MAGE")!;
          const mk = aliveParty.find((m) => m.activeClass === "MAGIC_KNIGHT")!;
          const comboDmg = mage.offense.plus(mk.offense).times(1.6).floor();
          synergyCombo = {
            initiatorName: mage.playerName,
            initiatorClass: mage.activeClass,
            finisherName: mk.playerName,
            finisherClass: mk.activeClass,
            comboName: "Geo-Resonance → Elemental Link",
            bonusDamage: comboDmg.toString(),
          };
        }
      }

      for (let partyIdx = 0; partyIdx < party.length; partyIdx++) {
        const attacker = party[partyIdx];
        if (attacker.hp.lte(0)) continue;
        const targets = enemies.filter((e) => e.hp.gt(0));
        if (targets.length === 0) break;

        let target = targets[0];
        if (profile.hero.aiRules.rushSpecialist) {
          const spec = targets.find((e) => e.tier === "SPECIALIST");
          if (spec) target = spec;
        }

        const isBossTarget = target.isBoss;
        const burstMult =
          (isBossFloor || isItemGodFloor) && profile.hero.aiRules.saveSpForBoss && turn <= 2
            ? 1.45
            : 1.0;
        const glassMult = isGlassCannon ? 1.3 : 1.0;
        const overhealMult = hasClergy ? 1.2 : 1.0;
        const sunderDefMult = hasTank ? 0.65 : 1.0;
        const bossSlayerMult =
          isBossTarget &&
          (attacker.activeClass === "WARRIOR" ||
            profile.hero.inheritedPassives.includes("BOSS_BREAKER") ||
            hasGearTrait(equippedItems, "BOSS_SLAYER_25"))
            ? 1.25
            : 1.0;
        const atkBoost = activeGeo === "ATK_UP_50" ? 1.5 : 1.0;
        const defBoost = activeGeo === "ENEMY_DEF_25" ? 1.25 : 1.0;
        const geoBreakerMult =
          geoBroken && hasGearTrait(equippedItems, "GEO_BREAKER") ? 1.3 : 1.0;
        const profAmp =
          hasProfessor && (isBossFloor || isItemGodFloor) ? 1.35 : 1.0;

        const isCrit = Math.random() < 0.25;
        let critMult = isCrit ? 1.5 : 1.0;
        if (isCrit && hasGearTrait(equippedItems, "CRIT_OVERLOAD_20")) critMult += 0.2;
        if (isCrit && hasActiveCheerBuff) critMult += 0.2;
        if (isCrit && synergyCombo) critMult += 0.5;

        const synergyMult =
          glassMult * overhealMult * bossSlayerMult * geoBreakerMult * profAmp;

        // Mage deals AoE across all remaining enemies on standard floors
        const hitTargets =
          attacker.activeClass === "MAGE" && !isBossFloor && !isItemGodFloor
            ? targets.slice(0, 3)
            : [target];

        const evTargetIndices: number[] = [];
        const evDamages: string[] = [];
        const evHpAfter: string[] = [];
        const evMaxHp: string[] = [];
        const evDefeats: boolean[] = [];

        for (const t of hitTargets) {
          const dmg = calculateDamage(
            attacker.offense.times(atkBoost),
            attacker.skillMult * burstMult * (hitTargets.length > 1 ? 0.85 : 1.0),
            t.def.times(defBoost).times(sunderDefMult),
            critMult,
            synergyMult
          );
          t.hp = Decimal.max(0, t.hp.minus(dmg));
          floorDamage = floorDamage.plus(dmg);

          evTargetIndices.push(enemies.indexOf(t));
          evDamages.push(dmg.toString());
          evHpAfter.push(t.hp.toString());
          evMaxHp.push(t.maxHp.toString());
          evDefeats.push(t.hp.lte(0));

          if (
            t.tier === "SPECIALIST" &&
            t.hp.lte(0) &&
            !specialistSubduedInFloor &&
            t.specialistType
          ) {
            specialistSubduedInFloor = true;
            const subduedLv = (t.specialistLevel || 5) * 2;
            specialistSubduedName = `${t.specialistType} Lv.${subduedLv}`;
            subduedSpecialists.push({ type: t.specialistType, newLevel: subduedLv });
            // Remove unsubdued copy from item if present, and move to Warehouse
            const existingIdx = workingItem.specialists.findIndex(
              (s) => !s.subdued && s.type === t.specialistType
            );
            if (existingIdx >= 0) workingItem.specialists.splice(existingIdx, 1);

            subduedToWarehouse.push({
              id: `spec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
              type: t.specialistType,
              level: subduedLv,
              subdued: true,
            });
          }
        }

        if (floorEvents.length < 32 && evTargetIndices.length > 0) {
          const clsRanged = CLASS_CATALOG[attacker.activeClass].isRanged;
          const actWpn = attacker.isMainHero ? mainWeaponType : undefined;
          const actionKind: FloorBattleEvent["actionKind"] =
            attacker.activeClass === "MAGE" || actWpn === "STAFF"
              ? "MAGIC"
              : clsRanged || actWpn === "BOW" || actWpn === "GUN"
                ? "RANGED"
                : isCrit || isBossFloor || isItemGodFloor
                  ? "SKILL"
                  : "MELEE";
          floorEvents.push({
            turn,
            side: "ALLY",
            actorIndex: partyIdx,
            actorName: attacker.playerName,
            actionKind,
            weaponType: actWpn,
            targetIndices: evTargetIndices,
            damages: evDamages,
            targetHpAfter: evHpAfter,
            targetMaxHp: evMaxHp,
            isCrit,
            isDefeat: evDefeats,
          });
        }

        if (hasGearTrait(equippedItems, "VAMPIRIC_STRIKE_5") && attacker.isMainHero) {
          attacker.hp = Decimal.min(
            attacker.maxHp,
            attacker.hp.plus(attacker.maxHp.times(0.05)).floor()
          );
        }
      }

      const remainingEnemies = enemies.filter((e) => e.hp.gt(0));
      if (remainingEnemies.length === 0) break;

      const frontParty = party.filter((m) => m.hp.gt(0) && m.row === "FRONT");
      const backParty = party.filter((m) => m.hp.gt(0) && m.row === "BACK");
      const frontInterceptChance = frontParty.some((m) => m.activeClass === "HEAVY_KNIGHT")
        ? 0.85
        : 0.75;

      for (let enemyIdx = 0; enemyIdx < enemies.length; enemyIdx++) {
        const enemy = enemies[enemyIdx];
        if (enemy.hp.lte(0) || enemy.tier === "SPECIALIST") continue;
        const pool =
          frontParty.length > 0 && (backParty.length === 0 || Math.random() < frontInterceptChance)
            ? frontParty
            : backParty.length > 0
              ? backParty
              : frontParty;
        if (pool.length === 0) break;

        const defender = pickRandom(pool);
        const enemyAtkMult = activeGeo === "ATK_UP_50" ? 1.5 : 1.0;
        const rowFactor =
          defender.row === "BACK"
            ? 0.25
            : defender.activeClass === "HEAVY_KNIGHT"
              ? 0.65
              : 0.75;
        const ironWallFactor =
          defender.isMainHero && profile.hero.inheritedPassives.includes("IRON_WALL")
            ? 0.8
            : 1.0;
        const rawDmg = calculateDamage(
          enemy.atk.times(enemyAtkMult),
          enemy.isBoss ? 1.25 : 1.0,
          defender.def,
          1,
          1
        );
        const finalDmg = Decimal.max(
          1,
          rawDmg.times(rowFactor).times(ironWallFactor).floor()
        );
        defender.hp = Decimal.max(0, defender.hp.minus(finalDmg));

        if (floorEvents.length < 32) {
          const defIdx = party.indexOf(defender);
          floorEvents.push({
            turn,
            side: "ENEMY",
            actorIndex: enemyIdx,
            actorName: enemy.name,
            actionKind: enemy.isBoss ? "SKILL" : "MELEE",
            targetIndices: [defIdx >= 0 ? defIdx : 0],
            damages: [finalDmg.toString()],
            targetHpAfter: [defender.hp.toString()],
            targetMaxHp: [defender.maxHp.toString()],
            isCrit: false,
            isDefeat: [defender.hp.lte(0)],
          });
        }
      }

      if (activeGeo === "POISON_5") {
        for (const m of party) {
          if (m.hp.gt(0)) {
            m.hp = Decimal.max(1, m.hp.minus(m.maxHp.times(0.05).floor()));
          }
        }
      }
    }

    const cleared = enemies.every((e) => e.hp.lte(0));
    totalDamageDealt = totalDamageDealt.plus(floorDamage);

    let karmaShardGain = 0;
    if (cleared) {
      workingItem.itemLevel += 1;
      workingItem.currentFloor = Math.max(workingItem.currentFloor, floor);

      const floorXpBase = new Decimal(80)
        .times(Decimal.pow(1.18, workingItem.rank - 1))
        .times(Decimal.pow(1.06, floor))
        .times(rewardMult)
        .times(xpSliderMult)
        .times(geoEffect === "XP_UP_30" && !geoBroken ? 1.3 : 1.0);
      totalXpGained = totalXpGained.plus(floorXpBase.floor());

      if (archetype === "ITEM_GOD") {
        itemGodsDefeated += 1;
        workingItem.itemLevel += 5;
        workingItem.bossKills += 1;
        karmaShardGain = Math.max(25, Math.floor(20 * Math.pow(1.1, workingItem.rank - 1)));
        totalKarmaGained += karmaShardGain;

        // Guaranteed Next-Rank Drop (Sole way to acquire Ranks 31-40!)
        const nextRank = Math.min(RPG_MAX_ITEM_RANK, workingItem.rank + 1);
        const godDrop = buildEquipmentForRank(
          nextRank,
          workingItem.slot,
          "LEGENDARY",
          workingItem.weaponType
        );
        newLootItems.push(godDrop);
        lootDropped.push({
          itemId: godDrop.itemId,
          name: godDrop.name,
          rank: godDrop.rank,
          rarity: godDrop.rarity,
        });
      } else if (archetype === "GATEKEEPER") {
        gatekeepersDefeated += 1;
        workingItem.itemLevel += 3;
        workingItem.bossKills += 1;
        karmaShardGain = Math.max(
          5,
          Math.floor(6 * Math.pow(1.12, workingItem.rank - 1) * (1 + floor / 25))
        );
        totalKarmaGained += karmaShardGain;
      } else if (archetype === "MYSTERY") {
        karmaShardGain = Math.max(
          4,
          Math.floor((5 + (hasThief ? 4 : 0)) * (1 + floor / 20))
        );
        totalKarmaGained += karmaShardGain;
      }

      const dropChance =
        (archetype === "GATEKEEPER" ? 0.65 : archetype === "MYSTERY" ? 0.55 : 0.12) *
        Math.min(2.5, dropSliderMult);
      if (Math.random() < dropChance && newLootItems.length < 4) {
        const rarRoll = Math.random();
        const rarity: ItemRarity =
          rarRoll < 0.08 * dropSliderMult
            ? "LEGENDARY"
            : rarRoll < 0.35 * dropSliderMult
              ? "RARE"
              : "COMMON";
        const dropRank = Math.min(
          30,
          Math.max(1, workingItem.rank + (archetype === "GATEKEEPER" ? 1 : 0))
        );
        const slots = ["WEAPON", "ARMOR", "EMBLEM", "ACCESSORY"] as const;
        const dropped = buildEquipmentForRank(dropRank, pickRandom(slots), rarity);
        newLootItems.push(dropped);
        lootDropped.push({
          itemId: dropped.itemId,
          name: dropped.name,
          rank: dropped.rank,
          rarity: dropped.rarity,
        });
      }
    } else {
      clearedAll = false;
      wipeFloor = floor;
    }

    floorSummaries.push({
      floor,
      archetype,
      cleared,
      totalDamage: floorDamage.toString(),
      geoBroken,
      geoEffect,
      specialistSubdued: specialistSubduedName,
      synergyCombo,
      enemies: enemySnapshots,
      bossId,
      karmaShardGain: karmaShardGain > 0 ? karmaShardGain : undefined,
      events: floorEvents,
    });

    if (!cleared) break;
  }

  const clearedCount = floorSummaries.filter((f) => f.cleared).length;
  const masteryGain = Math.max(1, Math.floor(clearedCount * 0.5 * masterySliderMult));
  const classMasteryXpGain = Math.max(5, Math.floor(clearedCount * 10 * masterySliderMult));
  const assistKarmaSentPerAlly = Math.max(2, Math.floor(clearedCount * 0.5 + gatekeepersDefeated * 3));

  return {
    result: {
      itemId: workingItem.itemId,
      itemName: workingItem.name,
      startFloor,
      endFloor:
        floorSummaries.length > 0
          ? floorSummaries[floorSummaries.length - 1].floor
          : startFloor,
      fpSpent,
      newTotalFp,
      clearedAll,
      wipeFloor,
      partyAura,
      alliedParty: allies,
      totalDamageDealt: totalDamageDealt.toString(),
      xpGained: totalXpGained.toString(),
      karmaGained: totalKarmaGained,
      assistKarmaSentPerAlly,
      gatekeepersDefeated,
      itemGodsDefeated,
      floorSummaries,
      subduedSpecialists,
      lootDropped,
    },
    updatedTargetItem: workingItem,
    newLootItems,
    subduedToWarehouse,
    xpGained: totalXpGained,
    masteryGain,
    classMasteryXpGain,
    karmaGained: totalKarmaGained,
    bossKillsAdded: gatekeepersDefeated,
    itemGodsDefeated,
    subduedCount: subduedSpecialists.length,
  };
}

export function applyXpToHero(hero: PlayerAvatarState, gainedXp: Decimal): number {
  let xp = toDecimal(hero.xp).plus(gainedXp);
  let level = hero.level;
  while (level < RPG_LEVEL_CAP) {
    const req = xpRequiredForLevel(level);
    if (xp.gte(req)) {
      xp = xp.minus(req);
      level += 1;
    } else {
      break;
    }
  }
  if (level >= RPG_LEVEL_CAP) {
    level = RPG_LEVEL_CAP;
    xp = new Decimal(0);
  }
  hero.level = level;
  hero.xp = xp.floor().toString();
  return level;
}
