/**
 * Combat Engine for Cursebound
 * 
 * Implements real-time auto-battler combat with:
 * - Attack speed (ms per attack) driving turn order
 * - Evasion, counter-attacks, crits, vampiric
 * - Magic damage (ignores defense)
 * - Shield (absorbs damage before HP)
 * - Healing targeted allies
 * - Taunt (chance to redirect attacks)
 * - Combat rounds with intermission phases
 */

import type {
  CombatState,
  CombatUnit,
  CombatLogEntry,
  UnitInstance,
} from "./types";
import { getUnitByIdKey } from "./data";

const ROUND_DURATION_MS = 10000; // 10 seconds per round
const TICK_MS = 100; // simulation granularity

export function initCombat(
  allies: UnitInstance[],
  enemies: UnitInstance[],
  tileName: string,
  tileX: number,
  tileY: number,
): CombatState {
  return {
    active: true,
    tileName,
    tileX,
    tileY,
    allies: allies.map(toCombatUnit),
    enemies: enemies.map(toCombatUnit),
    round: 1,
    roundTimeMs: 0,
    roundDurationMs: ROUND_DURATION_MS,
    isPaused: false,
    log: [{ round: 1, timeMs: 0, type: "round", actorName: "", message: `⚔️ Combat begins on ${tileName}! Round 1` }],
    result: "pending",
    speed: 1,
  };
}

function toCombatUnit(inst: UnitInstance): CombatUnit {
  const ut = getUnitByIdKey(inst.unitTypeId);
  const shield = ut?.shield ?? 0;
  return {
    instance: inst,
    currentHealth: inst.currentHealth,
    maxHealth: inst.maxHealth || inst.stats[1] || 100,
    shield,
    cooldownMs: ut?.attackSpeed ?? 1500, // start with full cooldown
    isAlive: inst.currentHealth > 0,
    targetId: null,
    totalDamageDealt: 0,
    totalDamageTaken: 0,
    totalHealing: 0,
  };
}

/**
 * Simulate one full round of combat.
 * Returns updated state. Call repeatedly until result !== "pending"
 */
export function simulateRound(state: CombatState): CombatState {
  const next = structuredClone(state);
  next.roundTimeMs = 0;

  while (next.roundTimeMs < next.roundDurationMs) {
    next.roundTimeMs += TICK_MS;

    // Tick all units
    const allUnits = [
      ...next.allies.filter((u) => u.isAlive).map((u) => ({ unit: u, isAlly: true })),
      ...next.enemies.filter((u) => u.isAlive).map((u) => ({ unit: u, isAlly: false })),
    ];

    for (const { unit, isAlly } of allUnits) {
      unit.cooldownMs -= TICK_MS;
      if (unit.cooldownMs <= 0) {
        // Attack!
        const ut = getUnitByIdKey(unit.instance.unitTypeId);
        const atkSpeed = ut?.attackSpeed ?? 1500;
        unit.cooldownMs += atkSpeed;

        const targets = isAlly
          ? next.enemies.filter((e) => e.isAlive)
          : next.allies.filter((a) => a.isAlive);

        if (targets.length === 0) continue;

        // Healing check: if this unit has healing, heal lowest ally first
        if (ut && ut.healing > 0) {
          const allyTeam = isAlly ? next.allies : next.enemies;
          const injured = allyTeam
            .filter((a) => a.isAlive && a.currentHealth < a.maxHealth)
            .sort((a, b) => (a.currentHealth / a.maxHealth) - (b.currentHealth / b.maxHealth));
          if (injured.length > 0) {
            const healTarget = injured[0];
            const healAmt = Math.min(ut.healing, healTarget.maxHealth - healTarget.currentHealth);
            if (healAmt > 0) {
              healTarget.currentHealth += healAmt;
              unit.totalHealing += healAmt;
              next.log.push({
                round: next.round,
                timeMs: next.roundTimeMs,
                type: "heal",
                actorName: unit.instance.name,
                targetName: healTarget.instance.name,
                healing: healAmt,
                message: `💚 ${unit.instance.name} heals ${healTarget.instance.name} for ${healAmt} HP`,
              });
            }
          }
        }

        // Pick target (taunt handling)
        let target = pickTarget(targets);

        // Evasion check
        const targetUt = getUnitByIdKey(target.instance.unitTypeId);
        const evasion = targetUt?.evasion ?? target.instance.stats[5] ?? 0;
        if (evasion > 0 && Math.random() * 100 < evasion) {
          next.log.push({
            round: next.round,
            timeMs: next.roundTimeMs,
            type: "evade",
            actorName: unit.instance.name,
            targetName: target.instance.name,
            message: `💨 ${target.instance.name} evades ${unit.instance.name}'s attack!`,
          });

          // Counter check on evade
          const counterChance = targetUt?.counter ?? target.instance.stats[6] ?? 0;
          if (counterChance > 0 && Math.random() * 100 < counterChance) {
            const counterDmg = rollDamage(targetUt?.minDam ?? 1, targetUt?.maxDam ?? 3, 0);
            applyDamage(unit, counterDmg, next, target.instance.name, true);
          }
          continue;
        }

        // Roll damage
        const minDam = ut?.minDam ?? unit.instance.stats[3] ?? 1;
        const maxDam = ut?.maxDam ?? unit.instance.stats[4] ?? 3;
        const magicDam = ut?.magicDamage ?? 0;
        let physDmg = rollDamage(minDam, maxDam, 0);

        // Crit check
        const critChance = ut?.critChance ?? 0;
        const critDamage = ut?.critDamage ?? 0;
        let isCrit = false;
        if (critChance > 0 && Math.random() * 100 < critChance) {
          isCrit = true;
          const critMult = 1.5 + (critDamage / 100);
          physDmg = Math.floor(physDmg * critMult);
        }

        // Defense reduction (physical only)
        const defense = targetUt?.defense ?? target.instance.stats[9] ?? 0;
        const finalPhys = Math.max(1, physDmg - defense);
        const totalDmg = finalPhys + magicDam;

        // Apply damage (shield first)
        applyDamage(target, totalDmg, next, unit.instance.name, false, isCrit, magicDam > 0);
        unit.totalDamageDealt += totalDmg;

        // Vampiric
        const vampiric = ut?.vampiric ?? 0;
        if (vampiric > 0) {
          const healAmt = Math.floor(totalDmg * vampiric / 100);
          if (healAmt > 0) {
            unit.currentHealth = Math.min(unit.maxHealth, unit.currentHealth + healAmt);
            unit.totalHealing += healAmt;
          }
        }

        // Check for death
        if (!target.isAlive) {
          next.log.push({
            round: next.round,
            timeMs: next.roundTimeMs,
            type: "death",
            actorName: target.instance.name,
            message: `💀 ${target.instance.name} has fallen!`,
          });
        }
      }
    }

    // Check victory/defeat
    if (next.enemies.every((e) => !e.isAlive)) {
      next.result = "victory";
      next.log.push({
        round: next.round,
        timeMs: next.roundTimeMs,
        type: "result",
        actorName: "",
        message: "🎉 Victory! All enemies defeated!",
      });
      next.active = false;
      return next;
    }
    if (next.allies.every((a) => !a.isAlive)) {
      next.result = "defeat";
      next.log.push({
        round: next.round,
        timeMs: next.roundTimeMs,
        type: "result",
        actorName: "",
        message: "💀 Defeat! All allies have fallen...",
      });
      next.active = false;
      return next;
    }
  }

  // Round ended — intermission
  next.log.push({
    round: next.round,
    timeMs: next.roundTimeMs,
    type: "round",
    actorName: "",
    message: `--- Round ${next.round} complete. Intermission ---`,
  });
  next.round++;
  next.isPaused = true;

  return next;
}

function pickTarget(targets: CombatUnit[]): CombatUnit {
  // Check for taunters
  const taunters = targets.filter((t) => {
    const ut = getUnitByIdKey(t.instance.unitTypeId);
    return (ut?.taunt ?? 0) > 0;
  });

  if (taunters.length > 0) {
    // Each taunter has a % chance to redirect
    for (const taunter of taunters) {
      const ut = getUnitByIdKey(taunter.instance.unitTypeId);
      if (Math.random() * 100 < (ut?.taunt ?? 0)) {
        return taunter;
      }
    }
  }

  // Default: target lowest HP
  return targets.sort((a, b) => a.currentHealth - b.currentHealth)[0];
}

function rollDamage(min: number, max: number, bonus: number): number {
  return Math.floor(Math.random() * (max - min + 1) + min) + bonus;
}

function applyDamage(
  target: CombatUnit,
  damage: number,
  state: CombatState,
  attackerName: string,
  isCounter: boolean,
  isCrit?: boolean,
  hasMagic?: boolean,
): void {
  let remaining = damage;

  // Shield absorbs first
  if (target.shield > 0) {
    const absorbed = Math.min(target.shield, remaining);
    target.shield -= absorbed;
    remaining -= absorbed;
    if (absorbed > 0) {
      state.log.push({
        round: state.round,
        timeMs: state.roundTimeMs,
        type: "shield",
        actorName: attackerName,
        targetName: target.instance.name,
        damage: absorbed,
        message: `🛡️ ${target.instance.name}'s shield absorbs ${absorbed} damage`,
      });
    }
  }

  target.currentHealth = Math.max(0, target.currentHealth - remaining);
  target.totalDamageTaken += damage;

  if (remaining > 0) {
    const logType = isCounter ? "counter" : isCrit ? "crit" : hasMagic ? "magic" : "attack";
    const prefix = isCounter ? "↩️ Counter! " : isCrit ? "💥 CRIT! " : hasMagic ? "✨ " : "";
    state.log.push({
      round: state.round,
      timeMs: state.roundTimeMs,
      type: logType,
      actorName: attackerName,
      targetName: target.instance.name,
      damage: remaining,
      message: `${prefix}${attackerName} → ${target.instance.name} for ${remaining} dmg (${target.currentHealth} HP)`,
    });
  }

  if (target.currentHealth <= 0) {
    target.isAlive = false;
  }
}

/**
 * Get combat summary stats for display
 */
export function getCombatSummary(state: CombatState) {
  const allyHP = state.allies.reduce((sum, u) => sum + (u.isAlive ? u.currentHealth : 0), 0);
  const allyMaxHP = state.allies.reduce((sum, u) => sum + u.maxHealth, 0);
  const enemyHP = state.enemies.reduce((sum, u) => sum + (u.isAlive ? u.currentHealth : 0), 0);
  const enemyMaxHP = state.enemies.reduce((sum, u) => sum + u.maxHealth, 0);
  const allyAlive = state.allies.filter((u) => u.isAlive).length;
  const enemyAlive = state.enemies.filter((u) => u.isAlive).length;

  return { allyHP, allyMaxHP, enemyHP, enemyMaxHP, allyAlive, enemyAlive };
}
