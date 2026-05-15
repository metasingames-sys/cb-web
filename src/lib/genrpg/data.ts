/**
 * GenRPG Game Data — parsed from ImportData CSVs
 * This is the canonical game data shared between the web prototype and Unity.
 */

import type {
  UnitType,
  MergeType,
  UpgradeType,
  CurseData,
  ReplaceType,
  Effect,
} from "./types";

// ─── Unit Types ──────────────────────────────────────────────

export const unitTypes: UnitType[] = [
  {
    id: "unit-1", idKey: 1, name: "Warrior", icon: "Warrior", art: "Warrior",
    desc: "Player", maxQuantityOnMap: 0, combatRow: 0,
    maxHealth: 200, minDam: 4, maxDam: 7, evasion: 3, counter: 0, vampiric: 0,
    attackSpeed: 1600, defense: 0, critChance: 1, critDamage: 0,
    damagePercentPerSecond: 0, magicDamage: 0, maxHealthPercent: 0,
    maxDamagePercent: 0, healing: 0, taunt: 0, allyStatScale: 0,
    lootScale: 1, joinChanceScale: 1, leadership: 3,
    customPrefab: "", isBoss: false, attackFX: "Slash",
  },
  {
    id: "unit-2", idKey: 2, name: "Treefolk", icon: "Treefolk", art: "Treefolk",
    desc: "", maxQuantityOnMap: 0, combatRow: 0,
    maxHealth: 90, minDam: 2, maxDam: 6, evasion: 5, counter: 0, vampiric: 0,
    attackSpeed: 1800, defense: 0, critChance: 0, critDamage: 0,
    damagePercentPerSecond: 0, magicDamage: 0, maxHealthPercent: 0,
    maxDamagePercent: 0, healing: 0, taunt: 0, allyStatScale: 0,
    lootScale: 1, joinChanceScale: 1, leadership: 0,
    customPrefab: "", isBoss: false, attackFX: "",
  },
  {
    id: "unit-3", idKey: 3, name: "Cursed Spirit", icon: "CursedSpirit", art: "CursedSpirit",
    desc: "Spawns when the Curse Meter fills completely", maxQuantityOnMap: 1, combatRow: 0,
    maxHealth: 1200, minDam: 15, maxDam: 30, evasion: 0, counter: 0, vampiric: 0,
    attackSpeed: 3000, defense: 0, critChance: 0, critDamage: 0,
    damagePercentPerSecond: 0, magicDamage: 0, maxHealthPercent: 0,
    maxDamagePercent: 0, healing: 0, taunt: 0, allyStatScale: 0,
    lootScale: 0, joinChanceScale: 0, leadership: 0,
    customPrefab: "CursedSpirit", isBoss: true, attackFX: "Scratch",
  },
  {
    id: "unit-5", idKey: 5, name: "Cultist", icon: "Cultist", art: "Cultist",
    desc: "Spawns from Temple", maxQuantityOnMap: 0, combatRow: 2,
    maxHealth: 30, minDam: 2, maxDam: 4, evasion: 2, counter: 0, vampiric: 0,
    attackSpeed: 2000, defense: 0, critChance: 0, critDamage: 0,
    damagePercentPerSecond: 0, magicDamage: 0, maxHealthPercent: 0,
    maxDamagePercent: 0, healing: 0, taunt: 0, allyStatScale: 0,
    lootScale: 1, joinChanceScale: 1, leadership: 0,
    customPrefab: "", isBoss: false, attackFX: "Pierce",
  },
  {
    id: "unit-6", idKey: 6, name: "Acolyte", icon: "Acolyte", art: "Acolyte",
    desc: "Spawns from Temple", maxQuantityOnMap: 0, combatRow: 3,
    maxHealth: 75, minDam: 4, maxDam: 7, evasion: 4, counter: 0, vampiric: 0,
    attackSpeed: 2500, defense: 0, critChance: 0, critDamage: 0,
    damagePercentPerSecond: 0, magicDamage: 0, maxHealthPercent: 0,
    maxDamagePercent: 0, healing: 0, taunt: 0, allyStatScale: 0,
    lootScale: 1, joinChanceScale: 1, leadership: 0,
    customPrefab: "", isBoss: false, attackFX: "Pierce",
  },
  {
    id: "unit-8", idKey: 8, name: "Zombie", icon: "Zombie", art: "Zombie",
    desc: "Spawns from Ruins", maxQuantityOnMap: 2, combatRow: 0,
    maxHealth: 30, minDam: 2, maxDam: 4, evasion: 0, counter: 0, vampiric: 0,
    attackSpeed: 2500, defense: 0, critChance: 0, critDamage: 0,
    damagePercentPerSecond: 0, magicDamage: 0, maxHealthPercent: 0,
    maxDamagePercent: 0, healing: 0, taunt: 0, allyStatScale: 0,
    lootScale: 1, joinChanceScale: 1, leadership: 0,
    customPrefab: "", isBoss: false, attackFX: "Scratch",
  },
  {
    id: "unit-10", idKey: 10, name: "Imp", icon: "Imp", art: "Imp",
    desc: "Spawns from Dungeon", maxQuantityOnMap: 0, combatRow: 0,
    maxHealth: 40, minDam: 3, maxDam: 4, evasion: 10, counter: 0, vampiric: 0,
    attackSpeed: 1800, defense: 0, critChance: 0, critDamage: 0,
    damagePercentPerSecond: 0, magicDamage: 0, maxHealthPercent: 0,
    maxDamagePercent: 0, healing: 0, taunt: 0, allyStatScale: 0,
    lootScale: 1, joinChanceScale: 1, leadership: 0,
    customPrefab: "", isBoss: false, attackFX: "Pierce",
  },
  {
    id: "unit-11", idKey: 11, name: "Demon", icon: "Demon", art: "Demon",
    desc: "Spawns from Dungeon", maxQuantityOnMap: 0, combatRow: 1,
    maxHealth: 120, minDam: 4, maxDam: 6, evasion: 3, counter: 0, vampiric: 0,
    attackSpeed: 2500, defense: 0, critChance: 0, critDamage: 0,
    damagePercentPerSecond: 0, magicDamage: 0, maxHealthPercent: 0,
    maxDamagePercent: 0, healing: 0, taunt: 0, allyStatScale: 0,
    lootScale: 1, joinChanceScale: 1, leadership: 0,
    customPrefab: "", isBoss: false, attackFX: "Scratch",
  },
  {
    id: "unit-12", idKey: 12, name: "Cleric", icon: "Cleric", art: "Cleric",
    desc: "Player ally", maxQuantityOnMap: 0, combatRow: 0,
    maxHealth: 125, minDam: 3, maxDam: 5, evasion: 5, counter: 0, vampiric: 0,
    attackSpeed: 1800, defense: 0, critChance: 0, critDamage: 0,
    damagePercentPerSecond: 0, magicDamage: 0, maxHealthPercent: 0,
    maxDamagePercent: 0, healing: 10, taunt: 0, allyStatScale: 0,
    lootScale: 1, joinChanceScale: 1, leadership: 0,
    customPrefab: "", isBoss: false, attackFX: "Pierce",
  },
  {
    id: "unit-13", idKey: 13, name: "Knight", icon: "Knight", art: "Knight",
    desc: "Player ally", maxQuantityOnMap: 0, combatRow: 0,
    maxHealth: 250, minDam: 2, maxDam: 6, evasion: 1, counter: 0, vampiric: 0,
    attackSpeed: 1800, defense: 0, critChance: 0, critDamage: 0,
    damagePercentPerSecond: 0, magicDamage: 0, maxHealthPercent: 0,
    maxDamagePercent: 0, healing: 0, taunt: 0, allyStatScale: 0,
    lootScale: 1, joinChanceScale: 1, leadership: 0,
    customPrefab: "", isBoss: false, attackFX: "Slash",
  },
  {
    id: "unit-14", idKey: 14, name: "Anomaly", icon: "Anomaly", art: "Anomaly",
    desc: "Corrupted Seed", maxQuantityOnMap: 0, combatRow: 0,
    maxHealth: 50, minDam: 2, maxDam: 4, evasion: 7, counter: 0, vampiric: 0,
    attackSpeed: 1800, defense: 0, critChance: 0, critDamage: 0,
    damagePercentPerSecond: 0, magicDamage: 0, maxHealthPercent: 0,
    maxDamagePercent: 0, healing: 0, taunt: 0, allyStatScale: 0,
    lootScale: 1, joinChanceScale: 1, leadership: 0,
    customPrefab: "", isBoss: false, attackFX: "Scratch",
  },
  {
    id: "unit-15", idKey: 15, name: "Abomination", icon: "Abomination", art: "Abomination",
    desc: "Corrupted Seed", maxQuantityOnMap: 0, combatRow: 1,
    maxHealth: 135, minDam: 3, maxDam: 7, evasion: 3, counter: 0, vampiric: 0,
    attackSpeed: 2800, defense: 0, critChance: 0, critDamage: 0,
    damagePercentPerSecond: 0, magicDamage: 0, maxHealthPercent: 0,
    maxDamagePercent: 0, healing: 0, taunt: 0, allyStatScale: 0,
    lootScale: 1, joinChanceScale: 1, leadership: 0,
    customPrefab: "", isBoss: false, attackFX: "Scratch",
  },
  {
    id: "unit-16", idKey: 16, name: "Fungling", icon: "Fungling", art: "Fungling",
    desc: "Fungling", maxQuantityOnMap: 5, combatRow: 1,
    maxHealth: 15, minDam: 1, maxDam: 3, evasion: 2, counter: 0, vampiric: 0,
    attackSpeed: 2000, defense: 0, critChance: 0, critDamage: 0,
    damagePercentPerSecond: 0, magicDamage: 0, maxHealthPercent: 0,
    maxDamagePercent: 0, healing: 0, taunt: 0, allyStatScale: 0,
    lootScale: 1, joinChanceScale: 1, leadership: 0,
    customPrefab: "", isBoss: false, attackFX: "Scratch",
  },
  {
    id: "unit-17", idKey: 17, name: "Poisonous Fungling", icon: "PoisonousFungling", art: "PoisonousFungling",
    desc: "Poisonous Fungling", maxQuantityOnMap: 0, combatRow: 1,
    maxHealth: 65, minDam: 2, maxDam: 5, evasion: 8, counter: 0, vampiric: 0,
    attackSpeed: 2300, defense: 0, critChance: 0, critDamage: 0,
    damagePercentPerSecond: 0, magicDamage: 0, maxHealthPercent: 0,
    maxDamagePercent: 0, healing: 0, taunt: 0, allyStatScale: 0,
    lootScale: 1, joinChanceScale: 1, leadership: 0,
    customPrefab: "", isBoss: false, attackFX: "Scratch",
  },
  {
    id: "unit-18", idKey: 18, name: "Ranger", icon: "Ranger", art: "Ranger",
    desc: "Player Ally", maxQuantityOnMap: 0, combatRow: 0,
    maxHealth: 150, minDam: 4, maxDam: 7, evasion: 10, counter: 0, vampiric: 0,
    attackSpeed: 2800, defense: 0, critChance: 0, critDamage: 0,
    damagePercentPerSecond: 0, magicDamage: 0, maxHealthPercent: 0,
    maxDamagePercent: 0, healing: 0, taunt: 0, allyStatScale: 0,
    lootScale: 1, joinChanceScale: 1, leadership: 0,
    customPrefab: "", isBoss: false, attackFX: "Pierce",
  },
];

// ─── Merge Types ─────────────────────────────────────────────

export const mergeTypes: MergeType[] = [
  { id: "merge-1", idKey: 1, firstTileTypeId: "Hill", secondTileTypeId: "Hill", thirdTileTypeId: "Hill", outputTileTypeId: "Mountain" },
  { id: "merge-2", idKey: 2, firstTileTypeId: "Meadow", secondTileTypeId: "Meadow", thirdTileTypeId: "Meadow", outputTileTypeId: "Field" },
  { id: "merge-3", idKey: 3, firstTileTypeId: "Copse", secondTileTypeId: "Copse", thirdTileTypeId: "Copse", outputTileTypeId: "Woods" },
  { id: "merge-4", idKey: 4, firstTileTypeId: "Spring", secondTileTypeId: "Spring", thirdTileTypeId: "Spring", outputTileTypeId: "Pond" },
  { id: "merge-5", idKey: 5, firstTileTypeId: "Mountain", secondTileTypeId: "Mountain", thirdTileTypeId: "Mountain", outputTileTypeId: "Peak" },
  { id: "merge-6", idKey: 6, firstTileTypeId: "Field", secondTileTypeId: "Field", thirdTileTypeId: "Field", outputTileTypeId: "Pasture" },
  { id: "merge-7", idKey: 7, firstTileTypeId: "Woods", secondTileTypeId: "Woods", thirdTileTypeId: "Woods", outputTileTypeId: "Forest" },
  { id: "merge-8", idKey: 8, firstTileTypeId: "Pond", secondTileTypeId: "Pond", thirdTileTypeId: "Pond", outputTileTypeId: "Lake" },
  { id: "merge-9", idKey: 9, firstTileTypeId: "Mountain", secondTileTypeId: "Mountain", thirdTileTypeId: "Field", outputTileTypeId: "Plateau" },
  { id: "merge-10", idKey: 10, firstTileTypeId: "Mountain", secondTileTypeId: "Field", thirdTileTypeId: "Field", outputTileTypeId: "Plateau" },
  { id: "merge-11", idKey: 11, firstTileTypeId: "Mountain", secondTileTypeId: "Mountain", thirdTileTypeId: "Woods", outputTileTypeId: "Jungle" },
  { id: "merge-12", idKey: 12, firstTileTypeId: "Mountain", secondTileTypeId: "Woods", thirdTileTypeId: "Woods", outputTileTypeId: "Jungle" },
  { id: "merge-13", idKey: 13, firstTileTypeId: "Mountain", secondTileTypeId: "Mountain", thirdTileTypeId: "Pond", outputTileTypeId: "Tarn" },
  { id: "merge-14", idKey: 14, firstTileTypeId: "Mountain", secondTileTypeId: "Pond", thirdTileTypeId: "Pond", outputTileTypeId: "Tarn" },
  { id: "merge-15", idKey: 15, firstTileTypeId: "Field", secondTileTypeId: "Field", thirdTileTypeId: "Woods", outputTileTypeId: "Valley" },
  { id: "merge-16", idKey: 16, firstTileTypeId: "Field", secondTileTypeId: "Woods", thirdTileTypeId: "Woods", outputTileTypeId: "Valley" },
  { id: "merge-17", idKey: 17, firstTileTypeId: "Field", secondTileTypeId: "Field", thirdTileTypeId: "Pond", outputTileTypeId: "Marsh" },
  { id: "merge-18", idKey: 18, firstTileTypeId: "Field", secondTileTypeId: "Pond", thirdTileTypeId: "Pond", outputTileTypeId: "Marsh" },
  { id: "merge-19", idKey: 19, firstTileTypeId: "Woods", secondTileTypeId: "Woods", thirdTileTypeId: "Pond", outputTileTypeId: "Swamp" },
  { id: "merge-20", idKey: 20, firstTileTypeId: "Woods", secondTileTypeId: "Pond", thirdTileTypeId: "Pond", outputTileTypeId: "Swamp" },
];

// ─── Upgrade Types ───────────────────────────────────────────

export const upgradeTypes: UpgradeType[] = [
  {
    id: "upgrade-1", idKey: 1, name: "Vitality", icon: "Vitality", art: "Vitality",
    desc: "Increase the max HP of all Allies by 10%.", maxTier: 4,
    prereqs: [], costs: { crystal: 1, mana: 1, matter: 1, flesh: 1 },
    effects: [{ index: 1, name: "", triggerTypeId: "playerspawn", entityTypeId: 31, entityId: 1, minQuantity: 10, maxQuantity: 10, chance: 1, groupId: 0, maxTriggerTimes: 0, minTriggerTimes: 0, requiredEntityTypeId: 0, requiredEntityId: 0, requiredQuantity: 0, triggerEveryNTimes: 0 }],
  },
  {
    id: "upgrade-2", idKey: 2, name: "Damage", icon: "Damage", art: "Damage",
    desc: "Increase the base Damage of all Allies by +2.", maxTier: 4,
    prereqs: [12], costs: { crystal: 3, mana: 3, matter: 3, flesh: 5 },
    effects: [
      { index: 1, name: "", triggerTypeId: "playerspawn", entityTypeId: 31, entityId: 3, minQuantity: 2, maxQuantity: 2, chance: 1, groupId: 0, maxTriggerTimes: 0, minTriggerTimes: 0, requiredEntityTypeId: 0, requiredEntityId: 0, requiredQuantity: 0, triggerEveryNTimes: 0 },
      { index: 2, name: "", triggerTypeId: "playerspawn", entityTypeId: 31, entityId: 4, minQuantity: 2, maxQuantity: 2, chance: 1, groupId: 0, maxTriggerTimes: 0, minTriggerTimes: 0, requiredEntityTypeId: 0, requiredEntityId: 0, requiredQuantity: 0, triggerEveryNTimes: 0 },
    ],
  },
  {
    id: "upgrade-3", idKey: 3, name: "Defense", icon: "Defense", art: "Defense",
    desc: "Increase the base Defense of all Allies.", maxTier: 4,
    prereqs: [13], costs: { crystal: 3, mana: 1, matter: 2, flesh: 1 },
    effects: [{ index: 1, name: "", triggerTypeId: "playerspawn", entityTypeId: 31, entityId: 9, minQuantity: 1, maxQuantity: 1, chance: 1, groupId: 0, maxTriggerTimes: 0, minTriggerTimes: 0, requiredEntityTypeId: 0, requiredEntityId: 0, requiredQuantity: 0, triggerEveryNTimes: 0 }],
  },
  {
    id: "upgrade-4", idKey: 4, name: "Evasion", icon: "Evasion", art: "Evasion",
    desc: "Increase all Allies chances of Evading attacks by +1%.", maxTier: 4,
    prereqs: [7], costs: { crystal: 1, mana: 2, matter: 1, flesh: 2 },
    effects: [{ index: 1, name: "", triggerTypeId: "playerspawn", entityTypeId: 31, entityId: 5, minQuantity: 1, maxQuantity: 1, chance: 1, groupId: 0, maxTriggerTimes: 0, minTriggerTimes: 0, requiredEntityTypeId: 0, requiredEntityId: 0, requiredQuantity: 0, triggerEveryNTimes: 0 }],
  },
  {
    id: "upgrade-5", idKey: 5, name: "Ranger", icon: "Ranger", art: "Ranger",
    desc: "Unlocks the Ranger, a high-damage ranged unit.", maxTier: 1,
    prereqs: [1], costs: { crystal: 1, mana: 1, matter: 1, flesh: 1 },
    effects: [{ index: 1, name: "", triggerTypeId: "playerspawn", entityTypeId: 52, entityId: 18, minQuantity: 1, maxQuantity: 1, chance: 1, groupId: 0, maxTriggerTimes: 0, minTriggerTimes: 0, requiredEntityTypeId: 0, requiredEntityId: 0, requiredQuantity: 0, triggerEveryNTimes: 0 }],
  },
  {
    id: "upgrade-6", idKey: 6, name: "Attack Speed", icon: "Attack Speed", art: "Attack Speed",
    desc: "Increase the base Attack Speed of all Allies by +1%.", maxTier: 4,
    prereqs: [10], costs: { crystal: 2, mana: 4, matter: 2, flesh: 2 },
    effects: [{ index: 1, name: "", triggerTypeId: "playerspawn", entityTypeId: 31, entityId: 12, minQuantity: 1, maxQuantity: 1, chance: 1, groupId: 0, maxTriggerTimes: 0, minTriggerTimes: 0, requiredEntityTypeId: 0, requiredEntityId: 0, requiredQuantity: 0, triggerEveryNTimes: 0 }],
  },
  {
    id: "upgrade-7", idKey: 7, name: "Storehouse", icon: "Storehouse", art: "Storehouse",
    desc: "Unlocks the Storehouse, which gives extra resources when Tiles are placed next to it.", maxTier: 1,
    prereqs: [1], costs: { crystal: 1, mana: 1, matter: 2, flesh: 1 },
    effects: [{ index: 1, name: "", triggerTypeId: "playerspawn", entityTypeId: 42, entityId: 17, minQuantity: 1, maxQuantity: 1, chance: 1, groupId: 0, maxTriggerTimes: 0, minTriggerTimes: 0, requiredEntityTypeId: 0, requiredEntityId: 0, requiredQuantity: 0, triggerEveryNTimes: 0 }],
  },
  {
    id: "upgrade-8", idKey: 8, name: "Watch Tower", icon: "Watchtower", art: "Watchtower",
    desc: "Unlocks the Watch Tower card, which reduces the HP of enemies within range by -3%.", maxTier: 1,
    prereqs: [12], costs: { crystal: 3, mana: 2, matter: 5, flesh: 2 },
    effects: [{ index: 1, name: "", triggerTypeId: "playerspawn", entityTypeId: 42, entityId: 19, minQuantity: 1, maxQuantity: 1, chance: 1, groupId: 0, maxTriggerTimes: 0, minTriggerTimes: 0, requiredEntityTypeId: 0, requiredEntityId: 0, requiredQuantity: 0, triggerEveryNTimes: 0 }],
  },
  {
    id: "upgrade-9", idKey: 9, name: "Stable", icon: "Stable", art: "Stable",
    desc: "Unlocks the Farm, which gives extra HP regen to adjacent Towns.", maxTier: 1,
    prereqs: [4], costs: { crystal: 2, mana: 3, matter: 3, flesh: 1 },
    effects: [{ index: 1, name: "", triggerTypeId: "playerspawn", entityTypeId: 42, entityId: 18, minQuantity: 1, maxQuantity: 1, chance: 1, groupId: 0, maxTriggerTimes: 0, minTriggerTimes: 0, requiredEntityTypeId: 0, requiredEntityId: 0, requiredQuantity: 0, triggerEveryNTimes: 0 }],
  },
  {
    id: "upgrade-10", idKey: 10, name: "Clarice", icon: "Clarice", art: "Clarice",
    desc: "Unlocks Clarice, a companion who can heal members of the party during combat.", maxTier: 4,
    prereqs: [7, 13], costs: { crystal: 2, mana: 2, matter: 2, flesh: 2 },
    effects: [{ index: 1, name: "", triggerTypeId: "playerspawn", entityTypeId: 52, entityId: 12, minQuantity: 1, maxQuantity: 1, chance: 1, groupId: 0, maxTriggerTimes: 0, minTriggerTimes: 0, requiredEntityTypeId: 0, requiredEntityId: 0, requiredQuantity: 0, triggerEveryNTimes: 0 }],
  },
  {
    id: "upgrade-11", idKey: 11, name: "Marcus", icon: "Marcus", art: "Marcus",
    desc: "Unlocks Marcus, a strong companion who can take a lot of damage.", maxTier: 4,
    prereqs: [3], costs: { crystal: 3, mana: 1, matter: 4, flesh: 2 },
    effects: [{ index: 1, name: "", triggerTypeId: "playerspawn", entityTypeId: 52, entityId: 13, minQuantity: 1, maxQuantity: 1, chance: 1, groupId: 0, maxTriggerTimes: 0, minTriggerTimes: 0, requiredEntityTypeId: 0, requiredEntityId: 0, requiredQuantity: 0, triggerEveryNTimes: 0 }],
  },
  {
    id: "upgrade-12", idKey: 12, name: "Monster Research", icon: "MonsterResearch", art: "MonsterResearch",
    desc: "Increases the chance of Monsters joining the party after combat.", maxTier: 4,
    prereqs: [14, 6, 11, 9], costs: { crystal: 2, mana: 3, matter: 2, flesh: 5 },
    effects: [{ index: 1, name: "", triggerTypeId: "playerspawn", entityTypeId: 31, entityId: 22, minQuantity: 5, maxQuantity: 1, chance: 1, groupId: 0, maxTriggerTimes: 0, minTriggerTimes: 0, requiredEntityTypeId: 0, requiredEntityId: 0, requiredQuantity: 0, triggerEveryNTimes: 0 }],
  },
  {
    id: "upgrade-13", idKey: 13, name: "Leadership", icon: "Leadership", art: "Leadership",
    desc: "Increases your Leadership by 1, allowing you to bring more Allies into combat.", maxTier: 2,
    prereqs: [1], costs: { crystal: 1, mana: 2, matter: 1, flesh: 2 },
    effects: [{ index: 1, name: "", triggerTypeId: "playerspawn", entityTypeId: 31, entityId: 26, minQuantity: 1, maxQuantity: 1, chance: 1, groupId: 0, maxTriggerTimes: 0, minTriggerTimes: 0, requiredEntityTypeId: 0, requiredEntityId: 0, requiredQuantity: 0, triggerEveryNTimes: 0 }],
  },
  {
    id: "upgrade-14", idKey: 14, name: "Strategy", icon: "Strategy", art: "Strategy",
    desc: "Increases the max amount of Re-rolls for Unit and Tile drafts during a run.", maxTier: 3,
    prereqs: [10], costs: { crystal: 3, mana: 2, matter: 3, flesh: 2 },
    effects: [
      { index: 1, name: "", triggerTypeId: "playerspawn", entityTypeId: 58, entityId: 0, minQuantity: 1, maxQuantity: 1, chance: 1, groupId: 0, maxTriggerTimes: 0, minTriggerTimes: 0, requiredEntityTypeId: 0, requiredEntityId: 0, requiredQuantity: 0, triggerEveryNTimes: 0 },
      { index: 2, name: "", triggerTypeId: "playerspawn", entityTypeId: 60, entityId: 0, minQuantity: 1, maxQuantity: 1, chance: 1, groupId: 0, maxTriggerTimes: 0, minTriggerTimes: 0, requiredEntityTypeId: 0, requiredEntityId: 0, requiredQuantity: 0, triggerEveryNTimes: 0 },
    ],
  },
  {
    id: "upgrade-15", idKey: 15, name: "Tactics", icon: "Tactics", art: "Tactics",
    desc: "Increases the base Damage and max HP of all Allies by +5%.", maxTier: 4,
    prereqs: [12], costs: { crystal: 5, mana: 5, matter: 5, flesh: 5 },
    effects: [
      { index: 1, name: "", triggerTypeId: "playerspawn", entityTypeId: 31, entityId: 18, minQuantity: 5, maxQuantity: 5, chance: 1, groupId: 0, maxTriggerTimes: 0, minTriggerTimes: 0, requiredEntityTypeId: 0, requiredEntityId: 0, requiredQuantity: 0, triggerEveryNTimes: 0 },
      { index: 2, name: "", triggerTypeId: "playerspawn", entityTypeId: 31, entityId: 17, minQuantity: 5, maxQuantity: 5, chance: 1, groupId: 0, maxTriggerTimes: 0, minTriggerTimes: 0, requiredEntityTypeId: 0, requiredEntityId: 0, requiredQuantity: 0, triggerEveryNTimes: 0 },
    ],
  },
];

// ─── Curse System ────────────────────────────────────────────

export const curseData: CurseData = {
  settings: {
    basePointsNeeded: 15,
    pointsScaleFactor: 0,
    pointsPerKill: 1,
    pointsPerTilePlaced: 1,
    pointsPerDay: 0,
    maxPointsPerKill: 1,
    maxPointsPerTilePlaced: 1,
    maxPointsPerDay: 0,
  },
  levels: [
    { level: 1, pointsNeeded: 15, effects: [{ index: 1, name: "", triggerTypeId: "levelup", entityTypeId: 47, entityId: 10, minQuantity: 1, maxQuantity: 1, chance: 1, groupId: 0, maxTriggerTimes: 0, minTriggerTimes: 0, requiredEntityTypeId: 0, requiredEntityId: 0, requiredQuantity: 0, triggerEveryNTimes: 0 }] },
    { level: 2, pointsNeeded: 20, effects: [{ index: 1, name: "", triggerTypeId: "levelup", entityTypeId: 47, entityId: 16, minQuantity: 1, maxQuantity: 1, chance: 1, groupId: 0, maxTriggerTimes: 0, minTriggerTimes: 0, requiredEntityTypeId: 0, requiredEntityId: 0, requiredQuantity: 0, triggerEveryNTimes: 0 }] },
    { level: 3, pointsNeeded: 25, effects: [{ index: 1, name: "", triggerTypeId: "levelup", entityTypeId: 47, entityId: 9, minQuantity: 1, maxQuantity: 1, chance: 1, groupId: 0, maxTriggerTimes: 0, minTriggerTimes: 0, requiredEntityTypeId: 0, requiredEntityId: 0, requiredQuantity: 0, triggerEveryNTimes: 0 }] },
    { level: 4, pointsNeeded: 30, effects: [{ index: 1, name: "", triggerTypeId: "levelup", entityTypeId: 47, entityId: 10, minQuantity: 2, maxQuantity: 2, chance: 1, groupId: 0, maxTriggerTimes: 0, minTriggerTimes: 0, requiredEntityTypeId: 0, requiredEntityId: 0, requiredQuantity: 0, triggerEveryNTimes: 0 }] },
    { level: 5, pointsNeeded: 35, effects: [{ index: 1, name: "", triggerTypeId: "levelup", entityTypeId: 47, entityId: 42, minQuantity: 1, maxQuantity: 1, chance: 1, groupId: 0, maxTriggerTimes: 0, minTriggerTimes: 0, requiredEntityTypeId: 0, requiredEntityId: 0, requiredQuantity: 0, triggerEveryNTimes: 0 }] },
    { level: 6, pointsNeeded: 45, effects: [{ index: 1, name: "", triggerTypeId: "levelup", entityTypeId: 47, entityId: 45, minQuantity: 1, maxQuantity: 1, chance: 1, groupId: 0, maxTriggerTimes: 0, minTriggerTimes: 0, requiredEntityTypeId: 0, requiredEntityId: 0, requiredQuantity: 0, triggerEveryNTimes: 0 }] },
    { level: 7, pointsNeeded: 50, effects: [{ index: 1, name: "", triggerTypeId: "levelup", entityTypeId: 47, entityId: 44, minQuantity: 2, maxQuantity: 2, chance: 1, groupId: 0, maxTriggerTimes: 0, minTriggerTimes: 0, requiredEntityTypeId: 0, requiredEntityId: 0, requiredQuantity: 0, triggerEveryNTimes: 0 }] },
    { level: 8, pointsNeeded: 55, effects: [{ index: 1, name: "", triggerTypeId: "levelup", entityTypeId: 47, entityId: 9, minQuantity: 1, maxQuantity: 1, chance: 1, groupId: 0, maxTriggerTimes: 0, minTriggerTimes: 0, requiredEntityTypeId: 0, requiredEntityId: 0, requiredQuantity: 0, triggerEveryNTimes: 0 }] },
    { level: 9, pointsNeeded: 60, effects: [{ index: 1, name: "", triggerTypeId: "levelup", entityTypeId: 4, entityId: 3, minQuantity: 1, maxQuantity: 1, chance: 1, groupId: 0, maxTriggerTimes: 0, minTriggerTimes: 0, requiredEntityTypeId: 0, requiredEntityId: 0, requiredQuantity: 0, triggerEveryNTimes: 0 }] },
  ],
};

// ─── Tile Colors (for prototype rendering) ───────────────────

export const tileColors: Record<string, string> = {
  // Base tiles
  "Camp": "#D4A574",
  "Road": "#8B7355",
  "Blank": "#2a2a2a",
  // Nature tier 1
  "Meadow": "#90EE90",
  "Hill": "#CD853F",
  "Copse": "#228B22",
  "Spring": "#87CEEB",
  // Nature tier 2
  "Field": "#9ACD32",
  "Mountain": "#808080",
  "Woods": "#006400",
  "Pond": "#4169E1",
  // Nature tier 3
  "Pasture": "#7CFC00",
  "Peak": "#A0A0A0",
  "Forest": "#013220",
  "Lake": "#1E90FF",
  // Hybrid biomes
  "Plateau": "#B8860B",
  "Jungle": "#2E8B57",
  "Tarn": "#5F9EA0",
  "Valley": "#6B8E23",
  "Marsh": "#556B2F",
  "Swamp": "#2F4F4F",
  // Special
  "Hidden Lake": "#00BFFF",
  "Secret Shop": "#FFD700",
  "Lumber Mill": "#8B4513",
  "Farm": "#DAA520",
  "Quarry": "#696969",
  "Forest Temple": "#4B0082",
  "Cult Sanctum": "#8B0000",
  "Rain Forest": "#00FA9A",
  "Storehouse": "#DEB887",
  "Watchtower": "#B22222",
  "Stable": "#D2691E",
  // Enemies
  "Dungeon": "#4B0050",
  "Ruins": "#555555",
  "Temple": "#800020",
  "Corrupted Seed": "#301934",
  "Mushroom": "#BA55D3",
};

// ─── Helper functions ────────────────────────────────────────

export function getUnitByIdKey(idKey: number): UnitType | undefined {
  return unitTypes.find(u => u.idKey === idKey);
}

export function getUpgradeByIdKey(idKey: number): UpgradeType | undefined {
  return upgradeTypes.find(u => u.idKey === idKey);
}

export function getMergeOutput(first: string, second: string, third: string): string | undefined {
  const sorted = [first, second, third].sort();
  for (const merge of mergeTypes) {
    const mergeSorted = [merge.firstTileTypeId, merge.secondTileTypeId, merge.thirdTileTypeId].sort();
    if (sorted[0] === mergeSorted[0] && sorted[1] === mergeSorted[1] && sorted[2] === mergeSorted[2]) {
      return merge.outputTileTypeId;
    }
  }
  return undefined;
}
