/**
 * GenRPG TypeScript Data Models
 * Ported from Genrpg.Shared C# models (master branch)
 * 
 * These types mirror the Unity project's data structures 1:1
 * so game data can flow between the web prototype and Unity.
 */

// ─── Base Types ──────────────────────────────────────────────

export interface IMapObject {
  name: string;
  unitTypeId: number;
  x: number;
  y: number;
}

export interface MapObject extends IMapObject {
  id: string;
  name: string;
  unitTypeId: number;
  x: number;
  y: number;
  level: number;
}

// ─── Effects / Traits System ─────────────────────────────────

export interface IEffect {
  entityTypeId: number;
  entityId: number;
  minQuantity: number;
  maxQuantity: number;
  chance: number;
  groupId: number;
  requiredEntityTypeId: number;
  requiredEntityId: number;
  requiredQuantity: number;
}

export interface Effect extends IEffect {
  index: number;
  name: string;
  triggerTypeId: string;
  entityTypeId: number;
  entityId: number;
  minQuantity: number;
  maxQuantity: number;
  chance: number;
  groupId: number;
  maxTriggerTimes: number;
  minTriggerTimes: number;
  requiredEntityTypeId: number;
  requiredEntityId: number;
  requiredQuantity: number;
  triggerEveryNTimes: number;
}

export interface UpgradeEffect extends Effect {
  tier: number;
}

// ─── Entity Types (Constants) ────────────────────────────────

export const EntityTypes = {
  None: 0,
  Currency: 1,
  Item: 2,
  Spell: 3,
  Unit: 4,
  Spawn: 5,
  Scaling: 7,
  StatType: 31,
  StatPct: 32,
  Damage: 33,
  Healing: 34,
  Shield: 35,
  StatusEffect: 36,
  Attack: 38,
  TileType: 42,
  UpgradeType: 43,
  AddPlaceTile: 44,
  LootTable: 45,
  TileCategory: 46,
  PlaceMapTile: 47,
  ReplaceMapTile: 48,
  TileEffect: 49,
  PartyHeal: 50,
  PercentHealParty: 51,
  Companion: 52,
  UnlockPartyColumn: 53,
  Curse: 54,
  DraftUnit: 55,
  DraftTile: 56,
  TriggerDraft: 57,
  DraftUnitRerolls: 58,
  DraftUnitChoices: 59,
  DraftTileRerolls: 60,
  DraftTileChoices: 61,
  CurseTier: 62,
  CrawlerSpell: 100,
  PartyBuff: 101,
  Map: 102,
  UserCoin: 200,
} as const;

// ─── Stat Types (Constants) ──────────────────────────────────

export const StatTypes = {
  MaxHealth: 1,
  CurrHealth: 2,
  MinDam: 3,
  MaxDam: 4,
  Evasion: 5,
  Counter: 6,
  Vampiric: 7,
  AttackSpeed: 8,
  Defense: 9,
  DamageAll: 10,
  Regen: 11,
  AttackSpeedPercent: 12,
  CritChance: 13,
  CritDamage: 14,
  DamagePercentPerSecond: 15,
  MagicDamage: 16,
  MaxHealthPercent: 17,
  DamagePercent: 18,
  Shield: 19,
  Healing: 20,
  AllyStatScale: 21,
  JoinParty: 22,
  HealParty: 23,
  PartyBuff: 24,
  Taunt: 25,
  Leadership: 26,
} as const;

export const StatTypeNames: Record<number, string> = {
  1: "Max Health",
  2: "Current Health",
  3: "Min Damage",
  4: "Max Damage",
  5: "Evasion",
  6: "Counter",
  7: "Vampiric",
  8: "Attack Speed",
  9: "Defense",
  10: "Damage All",
  11: "Regen",
  12: "Attack Speed %",
  13: "Crit Chance",
  14: "Crit Damage",
  15: "Damage %/sec",
  16: "Magic Damage",
  17: "Max Health %",
  18: "Damage %",
  19: "Shield",
  20: "Healing",
  21: "Ally Stat Scale",
  22: "Join Party",
  23: "Heal Party",
  24: "Party Buff",
  25: "Taunt",
  26: "Leadership",
};

// ─── Tile Types ──────────────────────────────────────────────

export const FixedTileTypes = {
  None: 0,
  Destroy: 1,
  Blank: 2,
  Camp: 3,
  Road: 4,
  Ignore: 40,
  Inert: 41,
} as const;

export interface TileType {
  id: string;
  idKey: number;
  name: string;
  desc: string;
  icon: string;
  art: string;
  tileCategoryId: number;
  placeChance: number;
  minDistanceToRoad: number;
  maxDistanceToRoad: number;
  maxQuantity: number;
  allowSelfAdjacent: boolean;
  requiredAdjacentTileTypeId: number;
  canBeDestroyed: boolean;
  canBeReplaced: boolean;
  tileGroupId: number;
  tileRoleId: number;
  initialTile: boolean;
  maxOnMap: number;
  unitSlots: number;
  cursePoints: number;
  traits: Effect[];
}

export interface TileCategory {
  id: string;
  idKey: number;
  name: string;
  desc: string;
  icon: string;
  art: string;
}

// ─── Unit Types ──────────────────────────────────────────────

export interface UnitType {
  id: string;
  idKey: number;
  name: string;
  icon: string;
  art: string;
  desc: string;
  maxQuantityOnMap: number;
  combatRow: number;
  // Base stats
  maxHealth: number;
  minDam: number;
  maxDam: number;
  evasion: number;
  counter: number;
  vampiric: number;
  attackSpeed: number;
  defense: number;
  critChance: number;
  critDamage: number;
  damagePercentPerSecond: number;
  magicDamage: number;
  maxHealthPercent: number;
  maxDamagePercent: number;
  healing: number;
  taunt: number;
  allyStatScale: number;
  lootScale: number;
  joinChanceScale: number;
  leadership: number;
  customPrefab: string;
  isBoss: boolean;
  attackFX: string;
}

export interface StatVal {
  statTypeId: number;
  name: string;
  val: number;
}

// ─── Merge Types ─────────────────────────────────────────────

export interface MergeType {
  id: string;
  idKey: number;
  firstTileTypeId: string;
  secondTileTypeId: string;
  thirdTileTypeId: string;
  outputTileTypeId: string;
}

// ─── Replace Types ───────────────────────────────────────────

export interface ReplacePattern {
  start: string[][];  // 2D grid of tile names (input pattern)
  end: string[][];    // 2D grid of tile names (output pattern)
}

export interface ReplaceType {
  name: string;
  desc: string;
  pattern: ReplacePattern;
}

// ─── Upgrade Types ───────────────────────────────────────────

export interface UpgradePrereq {
  upgradeTypeId: number;
}

export interface UpgradeType {
  id: string;
  idKey: number;
  name: string;
  icon: string;
  art: string;
  desc: string;
  maxTier: number;
  prereqs: number[];     // Upgrade IDs required
  costs: {
    crystal: number;
    mana: number;
    matter: number;
    flesh: number;
  };
  effects: Effect[];
}

// ─── Curse System ────────────────────────────────────────────

export interface CurseSettings {
  basePointsNeeded: number;
  pointsScaleFactor: number;
  pointsPerKill: number;
  pointsPerTilePlaced: number;
  pointsPerDay: number;
  maxPointsPerKill: number;
  maxPointsPerTilePlaced: number;
  maxPointsPerDay: number;
}

export interface CurseLevel {
  level: number;
  pointsNeeded: number;
  effects: Effect[];
}

export interface CurseData {
  settings: CurseSettings;
  levels: CurseLevel[];
}

// ─── Mana Types (v2) ────────────────────────────────────────

export interface ManaType {
  id: string;
  idKey: number;
  name: string;
  pluralName: string;
  desc: string;
  icon: string;
  art: string;
  color: string;
  sortOrder: number;
  linkedCurrencyTypeId: number;
}

// ─── Game State ──────────────────────────────────────────────

export interface GameState {
  day: number;
  cursePoints: number;
  curseLevel: number;
  map: MapTile[][];
  party: UnitInstance[];
  resources: {
    crystal: number;
    mana: number;
    matter: number;
    flesh: number;
  };
  upgrades: Record<number, number>;  // upgradeId -> current tier
  draftRerolls: { unit: number; tile: number };
  draftChoices: { unit: number; tile: number };
}

export interface MapTile {
  tileTypeId: number;
  tileName: string;
  x: number;
  y: number;
  units: UnitInstance[];
}

export interface UnitInstance {
  id: string;
  unitTypeId: number;
  name: string;
  level: number;
  currentHealth: number;
  stats: Record<number, number>;  // statTypeId -> value
  isEnemy: boolean;
}
