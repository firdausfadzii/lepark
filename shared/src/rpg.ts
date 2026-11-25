import Decimal from "break_infinity.js";
import type { PlayerAvatars, PlayerOutfit } from "./types";

// ============================================================
// Big-Number (break_infinity.js) Helpers
// ============================================================

export function toDecimal(value: Decimal | number | string | undefined | null): Decimal {
  if (value instanceof Decimal) return value;
  if (value === undefined || value === null || value === "") return new Decimal(0);
  try {
    return new Decimal(value);
  } catch {
    return new Decimal(0);
  }
}

const SUFFIXES = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc"];

export function formatBigNumber(value: Decimal | number | string): string {
  const num = toDecimal(value);
  if (num.lt(0)) return `-${formatBigNumber(num.abs())}`;
  if (num.lt(1000)) {
    return Math.floor(num.toNumber()).toLocaleString("en-US");
  }
  const exp = Math.floor(num.log10());
  const tier = Math.floor(exp / 3);
  if (tier < SUFFIXES.length) {
    const scaled = num.div(Decimal.pow(10, tier * 3)).toNumber();
    return `${scaled >= 100 ? scaled.toFixed(0) : scaled >= 10 ? scaled.toFixed(1) : scaled.toFixed(2)}${SUFFIXES[tier]}`;
  }
  return num.toExponential(2);
}

// ============================================================
// Enemy Bestiary (Normal: Small Orc, Bat, Pig, Slime | Boss: Minotaur, Big Orc)
// ============================================================

export type NormalEnemyId = "small_orc" | "bat" | "pig" | "slime";
export type BossEnemyId = "minotaur" | "big_orc";
export type EnemyId = NormalEnemyId | BossEnemyId;

export interface EnemyDefinition {
  id: EnemyId;
  name: string;
  tier: "NORMAL" | "BOSS";
  title: string;
  hpMult: number;
  atkMult: number;
  defMult: number;
  speed: number;
  spriteKey: string;
  spriteUrl: string;
  frameSize: number;
  accentColor: string;
  ultimateSkill: string;
  description: string;
}

export const NORMAL_ENEMY_IDS: readonly NormalEnemyId[] = ["small_orc", "bat", "pig", "slime"];
export const BOSS_ENEMY_IDS: readonly BossEnemyId[] = ["minotaur", "big_orc"];

export const ENEMY_CATALOG: Record<EnemyId, EnemyDefinition> = {
  small_orc: {
    id: "small_orc",
    name: "Small Orc",
    tier: "NORMAL",
    title: "Grunt Raider",
    hpMult: 1.0,
    atkMult: 1.08,
    defMult: 0.92,
    speed: 1.0,
    spriteKey: "enemy_small_orc",
    spriteUrl: "/assets/sprites/enemies/small_orc.png",
    frameSize: 32,
    accentColor: "#5ea844",
    ultimateSkill: "Crude Club Bash",
    description: "Scrappy green Netherworld foot soldier armed with a spiked wooden club.",
  },
  bat: {
    id: "bat",
    name: "Bat",
    tier: "NORMAL",
    title: "Cavern Screecher",
    hpMult: 0.78,
    atkMult: 1.15,
    defMult: 0.75,
    speed: 1.35,
    spriteKey: "enemy_bat",
    spriteUrl: "/assets/sprites/enemies/bat.png",
    frameSize: 32,
    accentColor: "#8b5cf6",
    ultimateSkill: "Crimson Fang Dive",
    description: "Agile violet cave bat that swoops quickly at back-row casters.",
  },
  pig: {
    id: "pig",
    name: "Pig",
    tier: "NORMAL",
    title: "Tusked Boar",
    hpMult: 1.2,
    atkMult: 0.96,
    defMult: 1.18,
    speed: 0.9,
    spriteKey: "enemy_pig",
    spriteUrl: "/assets/sprites/enemies/pig.png",
    frameSize: 32,
    accentColor: "#f472b6",
    ultimateSkill: "Netherworld Charge",
    description: "Sturdy tusked pig with thick hide that absorbs front-line blows.",
  },
  slime: {
    id: "slime",
    name: "Slime",
    tier: "NORMAL",
    title: "Gelatinous Ooze",
    hpMult: 0.95,
    atkMult: 0.9,
    defMult: 1.05,
    speed: 0.95,
    spriteKey: "enemy_slime",
    spriteUrl: "/assets/sprites/enemies/slime.png",
    frameSize: 32,
    accentColor: "#10b981",
    ultimateSkill: "Acidic Bounce",
    description: "Bouncy emerald ooze that reforms under weak attacks.",
  },
  minotaur: {
    id: "minotaur",
    name: "Minotaur",
    tier: "BOSS",
    title: "Labyrinth Gatekeeper",
    hpMult: 2.7,
    atkMult: 2.55,
    defMult: 2.4,
    speed: 0.95,
    spriteKey: "enemy_minotaur",
    spriteUrl: "/assets/sprites/enemies/minotaur.png",
    frameSize: 48,
    accentColor: "#d97706",
    ultimateSkill: "Labyrinth Earthshaker",
    description: "Towering bronze-horned Gatekeeper wielding a colossal double-headed battleaxe.",
  },
  big_orc: {
    id: "big_orc",
    name: "Big Orc",
    tier: "BOSS",
    title: "Warchief Gatekeeper",
    hpMult: 2.55,
    atkMult: 2.7,
    defMult: 2.5,
    speed: 0.9,
    spriteKey: "enemy_big_orc",
    spriteUrl: "/assets/sprites/enemies/big_orc.png",
    frameSize: 48,
    accentColor: "#65a30d",
    ultimateSkill: "Iron Cleaver Rampage",
    description: "Hulking iron-clad Orc Warchief commanding Item World Gatekeeper patrols.",
  },
};

// ============================================================
// Single-Hero 7-Class System, Weapon Aptitudes & Party Auras
// ============================================================

export type ClassId =
  | "HEAVY_KNIGHT"
  | "WARRIOR"
  | "MAGE"
  | "CLERGY"
  | "THIEF"
  | "MAGIC_KNIGHT"
  | "PROFESSOR";

export type PartyRole = "TANK" | "DPS" | "HEALER" | "SUPPORT";
export type EquipSlot = "WEAPON" | "ARMOR" | "EMBLEM" | "ACCESSORY";
export type WeaponType = "SWORD" | "AXE" | "SPEAR" | "BOW" | "STAFF" | "FIST" | "GUN";
export type ItemRarity = "COMMON" | "RARE" | "LEGENDARY";
export type PartyAura = "TRINITY_AURA" | "GLASS_CANNON_RUSH" | "STANDARD";
export type WeaponAptitudeRank = "S" | "A" | "B" | "C";

export const WEAPON_APTITUDE_MULTS: Record<WeaponAptitudeRank, number> = {
  S: 1.3,
  A: 1.15,
  B: 1.0,
  C: 0.85,
};

export const WEAPON_TYPES: readonly WeaponType[] = [
  "SWORD",
  "AXE",
  "SPEAR",
  "BOW",
  "STAFF",
  "FIST",
  "GUN",
];

export interface ClassDefinition {
  id: ClassId;
  label: string;
  role: PartyRole;
  unlockRequirement: number; // 0 = starter, >=1 = Dimensional/Class Karma rank needed
  defaultRow: "FRONT" | "BACK";
  isRanged: boolean;
  classMult: number;
  baseStats: {
    hp: number;
    atk: number;
    def: number;
    int: number;
    res: number;
    spd: number;
  };
  passiveName: string;
  passiveDesc: string;
  synergyName: string;
  synergyDesc: string;
  skillName: string;
  skillMult: number;
  spriteKey: string;
  spriteUrl: string;
  accentColor: string;
  weaponAptitudes: Record<WeaponType, WeaponAptitudeRank>;
}

export const CLASS_IDS: readonly ClassId[] = [
  "HEAVY_KNIGHT",
  "WARRIOR",
  "MAGE",
  "CLERGY",
  "THIEF",
  "MAGIC_KNIGHT",
  "PROFESSOR",
];

export const CLASS_CATALOG: Record<ClassId, ClassDefinition> = {
  HEAVY_KNIGHT: {
    id: "HEAVY_KNIGHT",
    label: "Heavy Knight",
    role: "TANK",
    unlockRequirement: 0,
    defaultRow: "FRONT",
    isRanged: false,
    classMult: 1.15,
    baseStats: { hp: 56, atk: 12, def: 22, int: 6, res: 16, spd: 9 },
    passiveName: "Iron Wall Anchor",
    passiveDesc: "Intercepts 85% of incoming enemy damage in Front Row.",
    synergyName: "Sunder Guard",
    synergyDesc: "Applies -35% Enemy DEF, boosting allied Physical DPS by 1.4x.",
    skillName: "Aegis Fortress Slam",
    skillMult: 1.35,
    spriteKey: "hero_heavy_knight",
    spriteUrl: "/assets/sprites/enemies/hero_heavy_knight.png",
    accentColor: "#94a3b8",
    weaponAptitudes: { SWORD: "A", AXE: "A", SPEAR: "S", BOW: "C", STAFF: "C", FIST: "B", GUN: "C" },
  },
  WARRIOR: {
    id: "WARRIOR",
    label: "Warrior",
    role: "DPS",
    unlockRequirement: 0,
    defaultRow: "FRONT",
    isRanged: false,
    classMult: 1.2,
    baseStats: { hp: 40, atk: 22, def: 13, int: 6, res: 9, spd: 15 },
    passiveName: "Boss Breaker",
    passiveDesc: "+20% single-target burst damage against Gatekeepers & Item Gods.",
    synergyName: "Relentless Follow-Up",
    synergyDesc: "Follows up Tank/Mage strikes for +50% Crit Damage.",
    skillName: "Blade Tempest",
    skillMult: 1.65,
    spriteKey: "hero_warrior",
    spriteUrl: "/assets/sprites/enemies/hero_warrior.png",
    accentColor: "#ef4444",
    weaponAptitudes: { SWORD: "S", AXE: "S", SPEAR: "A", BOW: "B", STAFF: "C", FIST: "A", GUN: "B" },
  },
  MAGE: {
    id: "MAGE",
    label: "Mage",
    role: "DPS",
    unlockRequirement: 0,
    defaultRow: "BACK",
    isRanged: true,
    classMult: 1.25,
    baseStats: { hp: 28, atk: 7, def: 8, int: 24, res: 14, spd: 13 },
    passiveName: "Wave Obliterator",
    passiveDesc: "Back Row AoE magic deals +25% bonus wave damage.",
    synergyName: "Geo-Resonance",
    synergyDesc: "Shatters Geo-Crystals Turn 1 and feeds +15% energy to party.",
    skillName: "Tera Starflare",
    skillMult: 1.75,
    spriteKey: "hero_mage",
    spriteUrl: "/assets/sprites/enemies/hero_mage.png",
    accentColor: "#6366f1",
    weaponAptitudes: { SWORD: "C", AXE: "C", SPEAR: "C", BOW: "B", STAFF: "S", FIST: "C", GUN: "A" },
  },
  CLERGY: {
    id: "CLERGY",
    label: "Clergy",
    role: "HEALER",
    unlockRequirement: 0,
    defaultRow: "BACK",
    isRanged: true,
    classMult: 1.1,
    baseStats: { hp: 36, atk: 8, def: 12, int: 15, res: 22, spd: 12 },
    passiveName: "Expedition Sustain",
    passiveDesc: "Restores extra party HP after every cleared floor.",
    synergyName: "Overheal Ward",
    synergyDesc: "Grants +20% ATK/INT overshield to allied DPS heroes.",
    skillName: "Radiant Renewal",
    skillMult: 1.3,
    spriteKey: "hero_cleric",
    spriteUrl: "/assets/sprites/enemies/hero_cleric.png",
    accentColor: "#38bdf8",
    weaponAptitudes: { SWORD: "C", AXE: "C", SPEAR: "B", BOW: "B", STAFF: "S", FIST: "B", GUN: "B" },
  },
  THIEF: {
    id: "THIEF",
    label: "Thief",
    role: "DPS",
    unlockRequirement: 1,
    defaultRow: "FRONT",
    isRanged: false,
    classMult: 1.18,
    baseStats: { hp: 33, atk: 17, def: 10, int: 9, res: 10, spd: 24 },
    passiveName: "Treasure Hunter",
    passiveDesc: "+35% Specialist Subdue & Rare/Legendary chest drop rate.",
    synergyName: "Trickster Plunder",
    synergyDesc: "Guarantees bonus Karma Shards on Mystery & Boss floors.",
    skillName: "Phantom Pilfer",
    skillMult: 1.5,
    spriteKey: "hero_thief",
    spriteUrl: "/assets/sprites/enemies/hero_thief.png",
    accentColor: "#14b8a6",
    weaponAptitudes: { SWORD: "A", AXE: "C", SPEAR: "B", BOW: "S", STAFF: "C", FIST: "A", GUN: "S" },
  },
  MAGIC_KNIGHT: {
    id: "MAGIC_KNIGHT",
    label: "Magic Knight",
    role: "DPS",
    unlockRequirement: 2,
    defaultRow: "FRONT",
    isRanged: false,
    classMult: 1.28,
    baseStats: { hp: 40, atk: 18, def: 14, int: 18, res: 14, spd: 14 },
    passiveName: "Spellblade Echo",
    passiveDesc: "Skills scale off combined ATK + INT simultaneously.",
    synergyName: "Elemental Link",
    synergyDesc: "Chains elemental bursts with allied Mages for +45% damage.",
    skillName: "Astral Blade Burst",
    skillMult: 1.7,
    spriteKey: "hero_magic_knight",
    spriteUrl: "/assets/sprites/enemies/hero_magic_knight.png",
    accentColor: "#a855f7",
    weaponAptitudes: { SWORD: "S", AXE: "B", SPEAR: "A", BOW: "B", STAFF: "A", FIST: "B", GUN: "B" },
  },
  PROFESSOR: {
    id: "PROFESSOR",
    label: "Professor",
    role: "SUPPORT",
    unlockRequirement: 3,
    defaultRow: "BACK",
    isRanged: true,
    classMult: 1.15,
    baseStats: { hp: 32, atk: 9, def: 11, int: 20, res: 18, spd: 16 },
    passiveName: "Medical Amplification",
    passiveDesc: "+25% XP & Class Mastery earned for the whole party.",
    synergyName: "Overclock Serum",
    synergyDesc: "Casts 2.0x stat amp buffs onto allied DPS during Boss & Raid bursts.",
    skillName: "Hypertonic Ray",
    skillMult: 1.4,
    spriteKey: "hero_professor",
    spriteUrl: "/assets/sprites/enemies/hero_professor.png",
    accentColor: "#38bdf8",
    weaponAptitudes: { SWORD: "C", AXE: "C", SPEAR: "C", BOW: "A", STAFF: "A", FIST: "C", GUN: "S" },
  },
};

export interface CrossClassTraitDef {
  id: string;
  sourceClass: ClassId;
  name: string;
  description: string;
}

export const CROSS_CLASS_TRAITS: Record<string, CrossClassTraitDef> = {
  IRON_WALL: {
    id: "IRON_WALL",
    sourceClass: "HEAVY_KNIGHT",
    name: "Iron Wall",
    description: "-20% incoming damage & +15% DEF.",
  },
  BOSS_BREAKER: {
    id: "BOSS_BREAKER",
    sourceClass: "WARRIOR",
    name: "Boss Breaker",
    description: "+25% damage vs Gatekeepers & Item Gods.",
  },
  ARCANE_SURGE: {
    id: "ARCANE_SURGE",
    sourceClass: "MAGE",
    name: "Arcane Surge",
    description: "+20% INT & Turn 1 Geo-Crystal shatter.",
  },
  DIVINE_WARD: {
    id: "DIVINE_WARD",
    sourceClass: "CLERGY",
    name: "Divine Ward",
    description: "Heal 15% HP per floor cleared.",
  },
  TREASURE_HUNTER: {
    id: "TREASURE_HUNTER",
    sourceClass: "THIEF",
    name: "Treasure Hunter",
    description: "+25% Rare/Legendary drop & Specialist subdue rate.",
  },
  SPELLBLADE_ECHO: {
    id: "SPELLBLADE_ECHO",
    sourceClass: "MAGIC_KNIGHT",
    name: "Spellblade Echo",
    description: "Adds 35% of INT to physical attacks (and vice versa).",
  },
  OVERCLOCK_SERUM: {
    id: "OVERCLOCK_SERUM",
    sourceClass: "PROFESSOR",
    name: "Overclock Serum",
    description: "+18% all-stat party amp during Bosses.",
  },
};

// ============================================================
// Geo-Effects & 11 Specialists (Innocents)
// ============================================================

export type GeoEffectId = "ATK_UP_50" | "ENEMY_DEF_25" | "POISON_5" | "XP_UP_30";

export interface GeoEffectDefinition {
  id: GeoEffectId;
  label: string;
  color: string;
  isEnemyBuff: boolean;
  description: string;
}

export const GEO_EFFECT_CATALOG: Record<GeoEffectId, GeoEffectDefinition> = {
  ATK_UP_50: {
    id: "ATK_UP_50",
    label: "ATK +50%",
    color: "#ef4444",
    isEnemyBuff: false,
    description: "Crimson Geo-Panel boosts all attacks by +50%.",
  },
  ENEMY_DEF_25: {
    id: "ENEMY_DEF_25",
    label: "Enemy DEF +25%",
    color: "#3b82f6",
    isEnemyBuff: true,
    description: "Cobalt Geo-Panel reinforces enemy armor (+25% DEF).",
  },
  POISON_5: {
    id: "POISON_5",
    label: "Poison 5%/turn",
    color: "#a855f7",
    isEnemyBuff: true,
    description: "Toxic Geo-Panel drains 5% party HP each turn unless nullified.",
  },
  XP_UP_30: {
    id: "XP_UP_30",
    label: "XP +30%",
    color: "#10b981",
    isEnemyBuff: false,
    description: "Emerald Geo-Panel boosts floor XP yield by +30%.",
  },
};

export type SpecialistType =
  | "GLADIATOR"
  | "TUTOR"
  | "COACH"
  | "PHYSICIAN"
  | "DIETICIAN"
  | "MARKSMAN"
  | "SPRINTER"
  | "STATISTICIAN"
  | "INSTRUCTOR"
  | "BROKER"
  | "COLLECTOR";

export const ALL_SPECIALIST_TYPES: readonly SpecialistType[] = [
  "GLADIATOR",
  "TUTOR",
  "COACH",
  "PHYSICIAN",
  "DIETICIAN",
  "MARKSMAN",
  "SPRINTER",
  "STATISTICIAN",
  "INSTRUCTOR",
  "BROKER",
  "COLLECTOR",
];

export const SPECIALIST_META: Record<
  SpecialistType,
  { name: string; statLabel: string; description: string; color: string; cap?: number }
> = {
  GLADIATOR: { name: "Gladiator", statLabel: "+ATK", description: "Uncapped flat ATK boost.", color: "#ef4444" },
  TUTOR: { name: "Tutor", statLabel: "+INT", description: "Uncapped flat INT boost.", color: "#6366f1" },
  COACH: { name: "Coach", statLabel: "+DEF", description: "Uncapped flat DEF boost.", color: "#3b82f6" },
  PHYSICIAN: { name: "Physician", statLabel: "+RES", description: "Uncapped flat RES boost.", color: "#06b6d4" },
  DIETICIAN: { name: "Dietician", statLabel: "+HP", description: "Uncapped flat HP boost.", color: "#10b981" },
  MARKSMAN: { name: "Marksman", statLabel: "+HIT/Crit", description: "Boosts critical accuracy.", color: "#f97316" },
  SPRINTER: { name: "Sprinter", statLabel: "+SPD", description: "Uncapped flat SPD boost.", color: "#eab308" },
  STATISTICIAN: { name: "Statistician", statLabel: "+XP %", description: "+1% XP per level (cap +300%).", color: "#f59e0b", cap: 300 },
  INSTRUCTOR: { name: "Instructor", statLabel: "+Mastery %", description: "+1% Weapon/Class Mastery (cap +300%).", color: "#a855f7", cap: 300 },
  BROKER: { name: "Broker", statLabel: "+FP %", description: "+0.5% Pomodoro FP Efficiency (cap +100%).", color: "#fbbf24", cap: 100 },
  COLLECTOR: { name: "Collector", statLabel: "+Drop %", description: "Boosts Rare/Legendary item drops.", color: "#ec4899", cap: 200 },
};

export interface Specialist {
  id: string;
  type: SpecialistType;
  level: number;
  subdued: boolean;
}

export const RARITY_MULTIPLIERS: Record<ItemRarity, number> = {
  COMMON: 1.0,
  RARE: 1.25,
  LEGENDARY: 1.6,
};

export const RARITY_FLOOR_CAPS: Record<ItemRarity, number> = {
  COMMON: 30,
  RARE: 60,
  LEGENDARY: 100,
};

export const RARITY_SPECIALIST_SLOTS: Record<ItemRarity, number> = {
  COMMON: 2,
  RARE: 4,
  LEGENDARY: 8,
};

export interface EquipmentPassiveTrait {
  id: string;
  label: string;
  description: string;
}

export const EQUIPMENT_PASSIVE_TRAITS: Record<string, EquipmentPassiveTrait> = {
  BOSS_SLAYER_25: { id: "BOSS_SLAYER_25", label: "Boss Slayer +25%", description: "+25% damage vs Gatekeepers & Item Gods." },
  TRINITY_CONDUIT_10: { id: "TRINITY_CONDUIT_10", label: "Trinity Conduit +10%", description: "+10% Party Aura stat effectiveness." },
  VAMPIRIC_STRIKE_5: { id: "VAMPIRIC_STRIKE_5", label: "Vampiric Strike 5%", description: "Restores 5% HP on attacks." },
  CRIT_OVERLOAD_20: { id: "CRIT_OVERLOAD_20", label: "Crit Overload +20%", description: "+20% Critical Hit Multiplier." },
  GEO_BREAKER: { id: "GEO_BREAKER", label: "Geo Breaker", description: "+30% damage after shattering a Geo-Crystal." },
};

export interface EquipmentItem {
  itemId: string;
  templateId: string;
  name: string;
  slot: EquipSlot;
  weaponType?: WeaponType;
  rank: number; // 1..40
  rarity: ItemRarity;
  itemLevel: number;
  currentFloor: number;
  maxFloor: number;
  bossKills: number;
  baseStats: {
    hp: string;
    atk: string;
    def: string;
    int: string;
    res: string;
    spd: string;
  };
  specialists: Specialist[];
  maxSpecialistSlots: number;
  passiveTraits: string[];
}

// ============================================================
// Player Avatar, Party Snapshots, Cheat Shop, Karma & Camp Inbox
// ============================================================

export interface PlayerAvatarState {
  playerId: string;
  playerName: string;
  spriteId: string;
  level: number;
  xp: string;
  reincarnations: number;
  storedLevels: number;
  weaponMastery: number;
  activeClass: ClassId | null;
  battleRow: "FRONT" | "BACK";
  classMastery: Record<ClassId, number>; // 0..6 stars per class
  classMasteryXp: Record<ClassId, number>; // progress toward next star
  inheritedPassives: string[]; // up to 2 CrossClassTraitDef ids
  aiRules: {
    rushSpecialist: boolean;
    nullifyGeoEffect: boolean;
    saveSpForBoss: boolean;
    triggerPartyCombo: boolean;
  };
  equippedGear: {
    weapon?: EquipmentItem;
    armor?: EquipmentItem;
    emblem?: EquipmentItem;
    accessory?: EquipmentItem;
  };
}

export function buildRpgGearSignature(hero: PlayerAvatarState | null | undefined): string {
  if (!hero) return "";
  const w = hero.equippedGear.weapon
    ? `${hero.equippedGear.weapon.weaponType || "SWORD"}:${hero.equippedGear.weapon.rarity}:${hero.equippedGear.weapon.rank || 1}`
    : "";
  const a = hero.equippedGear.armor
    ? `${hero.equippedGear.armor.rarity}:${hero.equippedGear.armor.rank || 1}`
    : "";
  const e = hero.equippedGear.emblem ? hero.equippedGear.emblem.rarity : "";
  const c = hero.equippedGear.accessory ? hero.equippedGear.accessory.rarity : "";
  if (!w && !a && !e && !c) return "";
  return `${w}|${a}|${e}|${c}`;
}

export interface PartyMemberSnapshot {
  playerId: string;
  playerName: string;
  spriteId: string;
  activeClass: ClassId;
  battleRow: "FRONT" | "BACK";
  level: number;
  isSquadmate: boolean;
  outfit?: PlayerOutfit;
  avatars?: PlayerAvatars | null;
  gearSignature?: string;
  effectiveStats: {
    hp: string;
    atk: string;
    def: string;
    int: string;
    res: string;
    spd: string;
  };
}

export interface CheatShopState {
  starCap: number;
  activeStars: number;
  xpSlider: number; // 0..200
  dropSlider: number; // 0..200
  masterySlider: number; // 0..200
  carnageEnabled: boolean;
}

export interface KarmaUpgrades {
  aptitudeRank: number; // +5% per rank
  shopRank: number; // 1..30 (Ranks 31..40 via Item Gods!)
  focusEfficiencyRank: number; // +10% FP per rank
  dimensionalRank: number; // Unlocks Thief(1), Magic Knight(2), Professor(3), Carnage(1), Blacksmith/Budget
}

export interface CampInboxEntry {
  id: string;
  kind: "SQUAD_CHEER" | "ASSIST_KARMA";
  fromUserId: number;
  fromName: string;
  fpAmount: number;
  karmaAmount: number;
  classMasteryXp: number;
  createdAt: number;
}

export interface RpgProfileState {
  userId: number;
  karma: number;
  highestClearedFloor: number;
  totalExpeditions: number;
  totalGatekeepersDefeated: number;
  totalItemGodsDefeated: number;
  totalSpecialistsSubdued: number;
  openPartyPool: boolean; // Opt-in for other real players to summon your snapshot
  recruitOpenPartyAllies: boolean; // Opt-in to auto-fill empty party slots with real Open-Pool players (default false = solo 1 player)
  raidDamageDealt: string;
  hero: PlayerAvatarState;
  inventory: EquipmentItem[];
  specialistWarehouse: Specialist[];
  cheatShop: CheatShopState;
  karmaUpgrades: KarmaUpgrades;
  campInbox: CampInboxEntry[];
}

// ============================================================
// Expedition, Synergies, Live Co-Op Raid & Squad Barter
// ============================================================

export interface FloorEnemySnapshot {
  enemyId: EnemyId | "specialist" | "mimic";
  name: string;
  tier: "NORMAL" | "BOSS" | "ITEM_GOD" | "SPECIALIST" | "MYSTERY";
  maxHp: string;
  isBoss: boolean;
}

export interface SynergyComboTrigger {
  initiatorName: string;
  initiatorClass: ClassId;
  finisherName: string;
  finisherClass: ClassId;
  comboName: string;
  bonusDamage: string;
}

export interface FloorBattleEvent {
  turn: number;
  side: "ALLY" | "ENEMY";
  actorIndex: number;
  actorName: string;
  actionKind: "MELEE" | "RANGED" | "MAGIC" | "SKILL" | "HEAL";
  weaponType?: WeaponType;
  targetIndices: number[];
  damages: string[];
  targetHpAfter: string[];
  targetMaxHp: string[];
  isCrit: boolean;
  isDefeat: boolean[];
}

export interface FloorMilestone {
  floor: number;
  archetype: "SKIRMISH" | "SPECIALIST" | "MYSTERY" | "GATEKEEPER" | "ITEM_GOD";
  cleared: boolean;
  totalDamage: string;
  geoBroken: boolean;
  geoEffect?: GeoEffectId;
  specialistSubdued?: string;
  synergyCombo?: SynergyComboTrigger;
  enemies: FloorEnemySnapshot[];
  bossId?: BossEnemyId;
  karmaShardGain?: number;
  events?: FloorBattleEvent[];
}

export interface ExpeditionResult {
  itemId: string;
  itemName: string;
  startFloor: number;
  endFloor: number;
  fpSpent: number;
  newTotalFp: number;
  clearedAll: boolean;
  wipeFloor?: number;
  partyAura: PartyAura;
  alliedParty: PartyMemberSnapshot[];
  totalDamageDealt: string;
  xpGained: string;
  karmaGained: number;
  assistKarmaSentPerAlly: number;
  gatekeepersDefeated: number;
  itemGodsDefeated: number;
  floorSummaries: FloorMilestone[];
  subduedSpecialists: {
    type: string;
    newLevel: number;
  }[];
  lootDropped: {
    itemId: string;
    name: string;
    rank: number;
    rarity: ItemRarity;
  }[];
}

export interface LiveRaidHitEvent {
  attackerId: string;
  attackerName: string;
  classId: ClassId;
  spriteId: string;
  damageDealt: string;
  isCrit: boolean;
  remainingBossHp: string;
  activeAuraLabel?: string;
}

export interface RaidBossState {
  raidId: string;
  bossId: BossEnemyId;
  name: string;
  title: string;
  maxHp: string;
  currentHp: string;
  attackFpCost: number;
  totalParticipants: number;
  activeRaiders: Array<{
    userId: number;
    name: string;
    classId: ClassId;
    lastHitAt: number;
  }>;
  topContributors: Array<{
    userId: number;
    name: string;
    classId: ClassId;
    damage: string;
  }>;
  recentHits: LiveRaidHitEvent[];
  weekKey: string;
}

export interface TradeOffer {
  offerId: string;
  squadId: string;
  senderId: number;
  senderName: string;
  offeredAsset: {
    kind: "SPECIALIST" | "EQUIPMENT" | "RAID_KEY";
    itemId?: string;
    specialistId?: string;
    templateId: string;
    label: string;
    levelOrRank: number;
    itemLevel?: number;
    rarity: ItemRarity;
  };
  requestedCriteria: {
    kind: "SPECIALIST" | "EQUIPMENT" | "RAID_KEY";
    templateId: string;
    minLevelOrRank: number;
    label: string;
  };
  createdAt: number;
  expiresAt: number;
}

export interface SquadBarterEligibility {
  eligible: boolean;
  hoursInSquad: number;
  requiredHours: number;
  coFocusMinutes: number;
  requiredCoFocusMinutes: number;
}

// ============================================================
// Exact Updated GDD Section 8 Equations
// ============================================================

export const RPG_LEVEL_CAP = 9999;
export const RPG_MAX_SHOP_RANK = 30;
export const RPG_MAX_ITEM_RANK = 40;
export const RPG_BASE_CHEAT_SLIDER_BUDGET = 300;
export const RPG_MAX_SLIDER_EACH = 200;

export function xpRequiredForLevel(level: number): Decimal {
  const l = Math.max(1, Math.floor(level));
  return new Decimal(100).times(Decimal.pow(l, 2.2)).floor();
}

export function fpToXpGain(fp: number, reincarnations: number): Decimal {
  const safeFp = Math.max(0, fp);
  const r = Math.max(0, reincarnations);
  return new Decimal(safeFp).times(50).times(Decimal.pow(1.15, r)).floor();
}

export function storedLevelsToBonusBasePts(storedLevels: number): number {
  const s = Math.max(0, storedLevels);
  return Math.floor(10 * Math.pow(s, 0.65));
}

export function karmaEarnedOnReincarnate(
  level: number,
  reincarnations: number,
  streakDays: number
): number {
  const l = Math.max(1, level);
  const r = Math.max(0, reincarnations);
  const d = Math.min(30, Math.max(0, streakDays));
  return Math.floor(Math.pow(l / 10, 1.4) * (1 + 0.1 * r) * (1 + d * 0.05));
}

export function aptitudePctForRank(rankU: number): number {
  return 100 + 5 * Math.max(0, Math.floor(rankU));
}

export function totalClassMasteryStars(classMastery: Record<ClassId, number>): number {
  let sum = 0;
  for (const cid of CLASS_IDS) {
    sum += Math.max(0, Math.min(6, Number(classMastery?.[cid] || 0)));
  }
  return sum;
}

export function aptitudeUpgradeKarmaCost(rankU: number): number {
  return Math.floor(50 * Math.pow(1.28, Math.max(0, rankU)));
}

export function shopRankUpgradeKarmaCost(currentShopRank: number): number {
  return Math.floor(60 * Math.pow(1.22, Math.max(0, currentShopRank - 1)));
}

export function focusEfficiencyKarmaCost(rank: number): number {
  return Math.floor(80 * Math.pow(1.35, Math.max(0, rank)));
}

export function dimensionalUpgradeKarmaCost(rank: number): number {
  return Math.floor(200 * Math.pow(1.5, Math.max(0, rank)));
}

export function baseRankStat(itemRank: number): Decimal {
  const r = Math.max(1, Math.min(RPG_MAX_ITEM_RANK, itemRank));
  return new Decimal(12).times(Decimal.pow(1.24, r - 1));
}

export function enemyStatAtFloor(itemRank: number, floor: number): Decimal {
  const f = Math.max(1, floor);
  return baseRankStat(itemRank)
    .times(Decimal.pow(1.045, f))
    .times(1 + 0.25 * Math.floor(f / 10));
}

export function expeditionFpCost(itemRank: number, startFloor: number, floorCount: 10 | 50): number {
  const batchMult = floorCount === 50 ? 4.5 : 1;
  const f = Math.max(1, startFloor);
  return Math.ceil(15 * Math.pow(1.12, Math.max(1, itemRank) - 1) * (1 + f / 50) * batchMult);
}

export function mergeSpecialistLevel(m1: number, m2: number): number {
  return Math.floor((Math.max(1, m1) + Math.max(1, m2)) * 1.1);
}

export function starCapUnlockCost(currentCap: number): number {
  return Math.floor(250 * Math.pow(1.35, Math.max(0, currentCap)));
}

export function enemyStarMult(activeStars: number): Decimal {
  return Decimal.pow(1.22, Math.max(0, activeStars));
}

export function rewardStarMult(activeStars: number, hasTrinityAura = false): number {
  const e = Math.max(0, activeStars);
  const effStars = hasTrinityAura ? e * 1.15 : e;
  return 1 + 0.18 * effStars + 0.015 * effStars * effStars;
}

export function getCheatShopSliderBudget(dimensionalRank: number): number {
  return RPG_BASE_CHEAT_SLIDER_BUDGET + Math.max(0, dimensionalRank) * 50;
}

/**
 * Big-Number Stat Calculator with Rarity, Rank Clamping, Class Mastery & Party Aura (GDD Section 10).
 */
export function calculateTotalStat(
  baseStat: number,
  level: number,
  classMult: number,
  item: EquipmentItem | undefined,
  statKey: "hp" | "atk" | "def" | "int" | "res" | "spd",
  weaponAptitudeMult: number,
  playerMaxShopRank: number,
  playerHighestFloor: number,
  specialistFlatBonus: number,
  karmaAptitudePct: number,
  totalMasteryStars: number,
  masteryLevel: number,
  hasTrinityAura: boolean
): Decimal {
  const totalAptitudePct = karmaAptitudePct + totalMasteryStars * 2;
  const partyMult = hasTrinityAura ? 1.25 : 1.0;

  let gearPart = new Decimal(0);
  if (item) {
    const effectiveRank = Math.min(item.rank, Math.max(1, playerMaxShopRank));
    const effectiveItemLevel = Math.min(item.itemLevel, Math.max(1, playerHighestFloor));
    const rankRatio = effectiveRank / Math.max(1, item.rank);
    const rarityMult = RARITY_MULTIPLIERS[item.rarity] || 1.0;
    const rawStat = toDecimal(item.baseStats[statKey]);

    const effectiveGearStat = rawStat
      .times(rankRatio)
      .times(rarityMult)
      .times(item.slot === "WEAPON" ? weaponAptitudeMult : 1.0)
      .times(1 + 0.08 * effectiveItemLevel)
      .times(Math.pow(1.02, Math.max(0, item.bossKills)))
      .plus(specialistFlatBonus);

    gearPart = effectiveGearStat
      .times(totalAptitudePct / 100)
      .times(1 + Math.max(0, masteryLevel) / 100);
  } else if (specialistFlatBonus > 0) {
    gearPart = new Decimal(specialistFlatBonus).times(totalAptitudePct / 100);
  }

  const charPart = new Decimal(baseStat).times(Math.max(1, level)).times(classMult);
  return charPart.plus(gearPart).times(partyMult).floor();
}

export function calculateDamage(
  atk: Decimal,
  skillMult: number,
  defEff: Decimal,
  critMult = 1,
  synergyMult = 1
): Decimal {
  const raw = atk.times(skillMult).minus(defEff.times(0.5));
  const clamped = raw.lt(1) ? new Decimal(1) : raw;
  return clamped.times(critMult).times(synergyMult).floor();
}

export function evaluatePartyAura(classes: ClassId[]): PartyAura {
  let tanks = 0;
  let healers = 0;
  let dps = 0;
  for (const cid of classes) {
    const role = CLASS_CATALOG[cid]?.role;
    if (role === "TANK") tanks++;
    else if (role === "HEALER" || role === "SUPPORT") healers++;
    else dps++;
  }
  if (tanks >= 1 && healers >= 1 && dps >= 2) {
    return "TRINITY_AURA";
  }
  if (dps >= 3) {
    return "GLASS_CANNON_RUSH";
  }
  return "STANDARD";
}

// ============================================================
// Equipment Generator & Blacksmith Costs
// ============================================================

const PREFIXES = [
  "Iron", "Bronze", "Steel", "Obsidian", "Crimson", "Mythril", "Demon", "Astral", "Abyssal", "Overlord",
];
const WEAPON_NAMES: Record<WeaponType, string[]> = {
  SWORD: ["Blade", "Claymore", "Excalibur", "Yoshitsuna", "Baal Edge"],
  AXE: ["Cleaver", "Greataxe", "Doom Axe", "Apocalypse", "Tyrant Axe"],
  SPEAR: ["Pike", "Halberd", "Longinus", "Gungnir", "Elder Lance"],
  BOW: ["Shortbow", "Recurve", "Artemis", "Lovely Cupid", "Star Bow"],
  STAFF: ["Wand", "Rod", "Grimoire", "Omniscient Staff", "Genesis Rod"],
  FIST: ["Knuckle", "Gauntlet", "Godhand", "Cosmo Infinity", "Mach Claw"],
  GUN: ["Flintlock", "Musket", "Etoile", "Cosmo Gun", "Baal Cannon"],
};
const ARMOR_NOUNS = ["Mail", "Cuirass", "Aegis", "Super Robo Suit", "Trapezohedron"];
const EMBLEM_NOUNS = ["Crest", "Banner", "Sigil", "Arcadia", "Overlord Seal"];
const ACC_NOUNS = ["Sandals", "Orb", "Ring", "Accelerator", "Exodus"];

export function buildEquipmentForRank(
  rank: number,
  slot: EquipSlot,
  rarity: ItemRarity = "COMMON",
  weaponTypeOverride?: WeaponType,
  idOverride?: string
): EquipmentItem {
  const clampedRank = Math.max(1, Math.min(RPG_MAX_ITEM_RANK, Math.floor(rank)));
  const rankScale = Math.pow(1.24, clampedRank - 1);
  const prefix = PREFIXES[(clampedRank - 1) % PREFIXES.length];
  const tierIdx = Math.min(4, Math.floor((clampedRank - 1) / 8));
  const wType: WeaponType | undefined =
    slot === "WEAPON"
      ? weaponTypeOverride || WEAPON_TYPES[(clampedRank - 1) % WEAPON_TYPES.length]
      : undefined;

  const noun =
    slot === "WEAPON" && wType
      ? WEAPON_NAMES[wType][tierIdx]
      : slot === "ARMOR"
        ? ARMOR_NOUNS[tierIdx]
        : slot === "EMBLEM"
          ? EMBLEM_NOUNS[tierIdx]
          : ACC_NOUNS[tierIdx];

  const baseHp = Math.round((slot === "ARMOR" ? 36 : slot === "EMBLEM" ? 24 : 14) * rankScale);
  const baseAtk = Math.round(
    (slot === "WEAPON" && wType !== "STAFF" ? 22 : slot === "EMBLEM" ? 12 : 5) * rankScale
  );
  const baseInt = Math.round(
    (slot === "WEAPON" && wType === "STAFF" ? 24 : slot === "EMBLEM" ? 12 : 5) * rankScale
  );
  const baseDef = Math.round((slot === "ARMOR" ? 18 : slot === "EMBLEM" ? 10 : 4) * rankScale);
  const baseRes = Math.round((slot === "ARMOR" ? 16 : slot === "EMBLEM" ? 10 : 4) * rankScale);
  const baseSpd = Math.round((slot === "ACCESSORY" ? 18 : slot === "EMBLEM" ? 8 : 4) * rankScale);

  const traitKeys = Object.keys(EQUIPMENT_PASSIVE_TRAITS);
  const passiveTraits: string[] = [];
  if (rarity === "RARE") {
    passiveTraits.push(traitKeys[clampedRank % traitKeys.length]);
  } else if (rarity === "LEGENDARY") {
    passiveTraits.push(traitKeys[clampedRank % traitKeys.length]);
    passiveTraits.push(traitKeys[(clampedRank + 2) % traitKeys.length]);
  }

  const suffix = rarity === "LEGENDARY" ? " ★" : rarity === "RARE" ? " +" : "";
  const templateId = `${slot.toLowerCase()}_${wType ? wType.toLowerCase() + "_" : ""}r${clampedRank}`;
  let displayName = `${prefix} ${noun}${suffix}`;
  if (clampedRank === 1 && slot === "WEAPON" && wType === "SWORD" && rarity === "COMMON") {
    displayName = "Wooden Sword";
  } else if (clampedRank === 1 && slot === "ARMOR" && rarity === "COMMON") {
    displayName = "Leather Armor";
  }

  return {
    itemId: idOverride || `${templateId}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    templateId,
    name: displayName,
    slot,
    ...(wType ? { weaponType: wType } : {}),
    rank: clampedRank,
    rarity,
    itemLevel: 0,
    currentFloor: 0,
    maxFloor: RARITY_FLOOR_CAPS[rarity],
    bossKills: 0,
    baseStats: {
      hp: String(baseHp),
      atk: String(baseAtk),
      def: String(baseDef),
      int: String(baseInt),
      res: String(baseRes),
      spd: String(baseSpd),
    },
    specialists: [],
    maxSpecialistSlots: RARITY_SPECIALIST_SLOTS[rarity],
    passiveTraits,
  };
}

export function shopEquipmentFpCost(rank: number): number {
  return Math.ceil(20 * Math.pow(1.16, Math.max(1, rank) - 1));
}

export function blacksmithRarityFusionCost(targetRarity: ItemRarity, rank: number): number {
  const mult = targetRarity === "LEGENDARY" ? 2.5 : 1.0;
  return Math.ceil(40 * Math.pow(1.14, Math.max(1, rank) - 1) * mult);
}

export function blacksmithTraitTransferCost(rank: number): number {
  return Math.ceil(35 * Math.pow(1.12, Math.max(1, rank) - 1));
}
