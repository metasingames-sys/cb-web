"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  unitTypes,
  mergeTypes,
  upgradeTypes,
  curseData,
  tileColors,
  getUnitByIdKey,
  getMergeOutput,
} from "@/lib/genrpg";
import type { GameState, MapTile, UnitInstance, UnitType } from "@/lib/genrpg";

// ─── Constants ───────────────────────────────────────────────

const GRID_SIZE = 8;
const TILE_SIZE = 64;
const TILE_GAP = 2;
const CANVAS_PADDING = 16;

const STARTING_TILES = ["Meadow", "Hill", "Copse", "Spring"];
const RESOURCE_NAMES = ["crystal", "mana", "matter", "flesh"] as const;
const RESOURCE_ICONS: Record<string, string> = {
  crystal: "💎",
  mana: "🔮",
  matter: "⚙️",
  flesh: "🩸",
};

// ─── Game State ──────────────────────────────────────────────

function createInitialState(): GameState {
  const map: MapTile[][] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    map[y] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      map[y][x] = {
        tileTypeId: 0,
        tileName: "Blank",
        x,
        y,
        units: [],
      };
    }
  }
  // Place camp in center
  const mid = Math.floor(GRID_SIZE / 2);
  map[mid][mid] = { tileTypeId: 3, tileName: "Camp", x: mid, y: mid, units: [] };

  // Place warrior on camp
  const warrior = unitTypes.find((u) => u.name === "Warrior")!;
  map[mid][mid].units.push(createUnitInstance(warrior, false));

  return {
    day: 1,
    cursePoints: 0,
    curseLevel: 0,
    map,
    party: [],
    resources: { crystal: 5, mana: 5, matter: 5, flesh: 5 },
    upgrades: {},
    draftRerolls: { unit: 2, tile: 2 },
    draftChoices: { unit: 3, tile: 3 },
  };
}

function createUnitInstance(unitType: UnitType, isEnemy: boolean): UnitInstance {
  return {
    id: `${unitType.name}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    unitTypeId: unitType.idKey,
    name: unitType.name,
    level: 1,
    currentHealth: unitType.maxHealth,
    stats: {
      1: unitType.maxHealth,
      3: unitType.minDam,
      4: unitType.maxDam,
      5: unitType.evasion,
      6: unitType.counter,
      8: unitType.attackSpeed,
      9: unitType.defense,
    },
    isEnemy,
  };
}

// ─── Canvas Renderer ─────────────────────────────────────────

function drawGrid(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  hoveredTile: { x: number; y: number } | null,
  selectedTile: { x: number; y: number } | null,
  dragTile: string | null
) {
  const { map } = state;
  const totalSize = TILE_SIZE + TILE_GAP;

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // Background
  ctx.fillStyle = "#0a0a1a";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const tile = map[y][x];
      const px = CANVAS_PADDING + x * totalSize;
      const py = CANVAS_PADDING + y * totalSize;
      const isHovered = hoveredTile?.x === x && hoveredTile?.y === y;
      const isSelected = selectedTile?.x === x && selectedTile?.y === y;
      const isBlank = tile.tileName === "Blank";

      // Tile background
      const color = tileColors[tile.tileName] || "#1a1a2e";
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(px, py, TILE_SIZE, TILE_SIZE, 4);
      ctx.fill();

      // Blank tile pattern
      if (isBlank) {
        ctx.strokeStyle = "#2a2a3e";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.roundRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2, 3);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Hover highlight
      if (isHovered && isBlank && dragTile) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
        ctx.beginPath();
        ctx.roundRect(px, py, TILE_SIZE, TILE_SIZE, 4);
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2, 3);
        ctx.stroke();
      }

      // Selected highlight
      if (isSelected) {
        ctx.strokeStyle = "#fbbf24";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2, 3);
        ctx.stroke();
      }

      // Tile name
      if (!isBlank) {
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(px, py + TILE_SIZE - 16, TILE_SIZE, 16);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "center";
        ctx.fillText(tile.tileName, px + TILE_SIZE / 2, py + TILE_SIZE - 4, TILE_SIZE - 4);
      }

      // Unit indicators
      if (tile.units.length > 0) {
        const unitY = py + 4;
        tile.units.forEach((unit, i) => {
          const ux = px + 4 + i * 14;
          ctx.fillStyle = unit.isEnemy ? "#ef4444" : "#22c55e";
          ctx.beginPath();
          ctx.arc(ux + 5, unitY + 5, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#fff";
          ctx.font = "bold 7px monospace";
          ctx.textAlign = "center";
          ctx.fillText(unit.name.charAt(0), ux + 5, unitY + 8);
        });
      }
    }
  }
}

// ─── Main Component ──────────────────────────────────────────

export default function GameView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>(() => createInitialState());
  const [selectedTile, setSelectedTile] = useState<{ x: number; y: number } | null>(null);
  const [hoveredTile, setHoveredTile] = useState<{ x: number; y: number } | null>(null);
  const [dragTile, setDragTile] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>(["Welcome to Cursebound! Place tiles on the map."]);
  const [combatLog, setCombatLog] = useState<string[]>([]);
  const [showCombat, setShowCombat] = useState(false);
  const [tileHand, setTileHand] = useState<string[]>(() => {
    const hand: string[] = [];
    for (let i = 0; i < 4; i++) {
      hand.push(STARTING_TILES[Math.floor(Math.random() * STARTING_TILES.length)]);
    }
    return hand;
  });

  const addLog = useCallback((msg: string) => {
    setLog((prev) => [...prev.slice(-50), msg]);
  }, []);

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const totalSize = TILE_SIZE + TILE_GAP;
    canvas.width = CANVAS_PADDING * 2 + GRID_SIZE * totalSize;
    canvas.height = CANVAS_PADDING * 2 + GRID_SIZE * totalSize;

    drawGrid(ctx, gameState, hoveredTile, selectedTile, dragTile);
  }, [gameState, hoveredTile, selectedTile, dragTile]);

  // Mouse handlers
  const getTileCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX - CANVAS_PADDING;
    const my = (e.clientY - rect.top) * scaleY - CANVAS_PADDING;
    const totalSize = TILE_SIZE + TILE_GAP;
    const x = Math.floor(mx / totalSize);
    const y = Math.floor(my / totalSize);
    if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) return { x, y };
    return null;
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getTileCoords(e);
    if (!coords) return;

    const tile = gameState.map[coords.y][coords.x];

    // If dragging a tile, place it
    if (dragTile && tile.tileName === "Blank") {
      placeTile(coords.x, coords.y, dragTile);
      return;
    }

    // Toggle selection
    if (selectedTile?.x === coords.x && selectedTile?.y === coords.y) {
      setSelectedTile(null);
    } else {
      setSelectedTile(coords);
      if (tile.tileName !== "Blank") {
        addLog(`Selected: ${tile.tileName} at (${coords.x}, ${coords.y}) — ${tile.units.length} units`);
      }
    }
  };

  const handleCanvasMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setHoveredTile(getTileCoords(e));
  };

  // ─── Game Logic ──────────────────────────────────────────

  const placeTile = (x: number, y: number, tileName: string) => {
    setGameState((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as GameState;
      next.map[y][x] = { tileTypeId: 0, tileName, x, y, units: [] };

      // Curse points for tile placement
      next.cursePoints += curseData.settings.pointsPerTilePlaced;

      // Check for merges — find 3+ adjacent same-type tiles
      const adjacentSame = findAdjacentGroup(next.map, x, y, tileName);
      if (adjacentSame.length >= 3) {
        const mergeOutput = getMergeOutput(tileName, tileName, tileName);
        if (mergeOutput) {
          // Consume 3 tiles (including placed), replace last one with output
          const toConsume = adjacentSame.slice(0, 3);
          toConsume.forEach((pos, i) => {
            if (i < 2) {
              next.map[pos.y][pos.x] = { tileTypeId: 0, tileName: "Blank", x: pos.x, y: pos.y, units: [] };
            } else {
              next.map[pos.y][pos.x] = { tileTypeId: 0, tileName: mergeOutput, x: pos.x, y: pos.y, units: [] };
            }
          });
          addLog(`🔀 Merged 3x ${tileName} → ${mergeOutput}!`);
          next.resources.crystal += 1;
          next.resources.mana += 1;
        }
      }

      // Check curse level ups
      checkCurseLevel(next);

      // Grant resources
      next.resources.crystal += 1;
      next.resources.matter += 1;

      return next;
    });

    // Remove from hand and draw new
    setTileHand((prev) => {
      const idx = prev.indexOf(tileName);
      const next = [...prev];
      if (idx >= 0) {
        next.splice(idx, 1);
        next.push(STARTING_TILES[Math.floor(Math.random() * STARTING_TILES.length)]);
      }
      return next;
    });

    setDragTile(null);
    addLog(`Placed ${tileName} at (${x}, ${y})`);
  };

  const findAdjacentGroup = (
    map: MapTile[][],
    startX: number,
    startY: number,
    tileName: string
  ): { x: number; y: number }[] => {
    const visited = new Set<string>();
    const group: { x: number; y: number }[] = [];
    const queue = [{ x: startX, y: startY }];

    while (queue.length > 0) {
      const { x, y } = queue.shift()!;
      const key = `${x},${y}`;
      if (visited.has(key)) continue;
      visited.add(key);

      if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) continue;
      if (map[y][x].tileName !== tileName) continue;

      group.push({ x, y });

      queue.push({ x: x + 1, y }, { x: x - 1, y }, { x, y: y + 1 }, { x, y: y - 1 });
    }

    return group;
  };

  const checkCurseLevel = (state: GameState) => {
    const nextLevel = curseData.levels[state.curseLevel];
    if (!nextLevel) return;

    if (state.cursePoints >= nextLevel.pointsNeeded) {
      state.curseLevel++;
      state.cursePoints = 0;
      addLog(`💀 Curse Level ${state.curseLevel}! Dark energy surges...`);

      // Apply curse effects
      nextLevel.effects.forEach((effect) => {
        if (effect.entityTypeId === 47) {
          // PlaceMapTile effect — place enemy tiles
          for (let i = 0; i < effect.minQuantity; i++) {
            const blanks: { x: number; y: number }[] = [];
            state.map.forEach((row) =>
              row.forEach((t) => {
                if (t.tileName === "Blank") blanks.push({ x: t.x, y: t.y });
              })
            );
            if (blanks.length > 0) {
              const pos = blanks[Math.floor(Math.random() * blanks.length)];
              const enemyTiles = ["Ruins", "Dungeon", "Temple", "Corrupted Seed", "Mushroom"];
              const enemyTile = enemyTiles[Math.floor(Math.random() * enemyTiles.length)];
              state.map[pos.y][pos.x] = { tileTypeId: 0, tileName: enemyTile, x: pos.x, y: pos.y, units: [] };
              addLog(`  ☠️ ${enemyTile} appeared at (${pos.x}, ${pos.y})!`);
            }
          }
        } else if (effect.entityTypeId === 4) {
          // Spawn unit (Cursed Spirit)
          const spirit = getUnitByIdKey(3);
          if (spirit) {
            // Find a tile with space for enemy
            const tiles = state.map.flat().filter((t) => t.tileName !== "Blank");
            if (tiles.length > 0) {
              const target = tiles[Math.floor(Math.random() * tiles.length)];
              target.units.push(createUnitInstance(spirit, true));
              addLog(`  ⚠️ Cursed Spirit spawned on ${target.tileName}!`);
            }
          }
        }
      });
    }
  };

  const endDay = () => {
    setGameState((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as GameState;
      next.day++;
      next.cursePoints += curseData.settings.pointsPerDay;

      // Spawn enemies on enemy tiles
      next.map.forEach((row) =>
        row.forEach((tile) => {
          if (["Ruins", "Dungeon", "Temple"].includes(tile.tileName)) {
            const enemyMap: Record<string, number[]> = {
              Ruins: [8],        // Zombie
              Dungeon: [10, 11], // Imp, Demon
              Temple: [5, 6],    // Cultist, Acolyte
            };
            const possibleUnits = enemyMap[tile.tileName] || [];
            if (possibleUnits.length > 0 && tile.units.filter((u) => u.isEnemy).length < 3) {
              const unitId = possibleUnits[Math.floor(Math.random() * possibleUnits.length)];
              const unitType = getUnitByIdKey(unitId);
              if (unitType) {
                tile.units.push(createUnitInstance(unitType, true));
              }
            }
          }
        })
      );

      // Resources per day
      next.resources.flesh += 2;
      next.resources.mana += 1;

      checkCurseLevel(next);
      return next;
    });
    addLog(`🌅 Day ${gameState.day + 1} begins. Enemies stir in the darkness...`);
  };

  const startCombat = () => {
    if (!selectedTile) {
      addLog("Select a tile with enemies to start combat!");
      return;
    }
    const tile = gameState.map[selectedTile.y][selectedTile.x];
    const enemies = tile.units.filter((u) => u.isEnemy);
    if (enemies.length === 0) {
      addLog("No enemies on this tile!");
      return;
    }

    // Simple auto-battler
    const allies = gameState.map.flat().flatMap((t) => t.units.filter((u) => !u.isEnemy));
    if (allies.length === 0) {
      addLog("No allies to fight!");
      return;
    }

    const log: string[] = [`⚔️ Combat on ${tile.tileName}!`];
    const allyHP = allies.map((a) => ({ ...a, currentHealth: a.stats[1] || a.currentHealth }));
    const enemyHP = enemies.map((e) => ({ ...e, currentHealth: e.stats[1] || e.currentHealth }));

    let round = 0;
    while (allyHP.some((a) => a.currentHealth > 0) && enemyHP.some((e) => e.currentHealth > 0) && round < 20) {
      round++;
      log.push(`--- Round ${round} ---`);

      // Allies attack
      allyHP
        .filter((a) => a.currentHealth > 0)
        .forEach((ally) => {
          const target = enemyHP.find((e) => e.currentHealth > 0);
          if (!target) return;
          const dmg = Math.floor(
            Math.random() * ((ally.stats[4] || 5) - (ally.stats[3] || 2) + 1) + (ally.stats[3] || 2)
          );
          const def = target.stats[9] || 0;
          const actualDmg = Math.max(1, dmg - def);
          target.currentHealth -= actualDmg;
          log.push(`  ${ally.name} hits ${target.name} for ${actualDmg} dmg (${Math.max(0, target.currentHealth)} HP left)`);
        });

      // Enemies attack
      enemyHP
        .filter((e) => e.currentHealth > 0)
        .forEach((enemy) => {
          const target = allyHP.find((a) => a.currentHealth > 0);
          if (!target) return;
          const dmg = Math.floor(
            Math.random() * ((enemy.stats[4] || 5) - (enemy.stats[3] || 2) + 1) + (enemy.stats[3] || 2)
          );
          const def = target.stats[9] || 0;
          const actualDmg = Math.max(1, dmg - def);
          target.currentHealth -= actualDmg;
          log.push(`  ${enemy.name} hits ${target.name} for ${actualDmg} dmg (${Math.max(0, target.currentHealth)} HP left)`);
        });
    }

    const alliesWon = allyHP.some((a) => a.currentHealth > 0);
    log.push(alliesWon ? "🎉 Victory!" : "💀 Defeat!");

    if (alliesWon) {
      // Remove dead enemies from tile
      setGameState((prev) => {
        const next = JSON.parse(JSON.stringify(prev)) as GameState;
        const t = next.map[selectedTile.y][selectedTile.x];
        t.units = t.units.filter((u) => !u.isEnemy);
        next.cursePoints += curseData.settings.pointsPerKill * enemies.length;
        next.resources.crystal += enemies.length;
        next.resources.flesh += enemies.length;
        checkCurseLevel(next);
        return next;
      });
      addLog(`Victory! Gained ${enemies.length} crystal and flesh. (+${enemies.length} curse pts)`);
    }

    setCombatLog(log);
    setShowCombat(true);
  };

  // ─── Render ──────────────────────────────────────────────

  const curseMax = curseData.levels[gameState.curseLevel]?.pointsNeeded || 60;
  const cursePct = Math.min((gameState.cursePoints / curseMax) * 100, 100);

  return (
    <div className="space-y-4">
      {/* Status Bar */}
      <div className="flex flex-wrap gap-4 items-center p-3 rounded-lg bg-gray-900 border border-gray-800">
        <div className="text-sm">
          <span className="text-gray-500">Day</span>{" "}
          <span className="font-bold text-white">{gameState.day}</span>
        </div>
        <div className="h-6 w-px bg-gray-700" />
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">Curse Lv</span>
          <span className="font-bold text-red-400">{gameState.curseLevel}</span>
          <div className="w-24 bg-gray-800 rounded-full h-2">
            <div
              className="h-full rounded-full bg-gradient-to-r from-red-700 to-red-400 transition-all"
              style={{ width: `${cursePct}%` }}
            />
          </div>
          <span className="text-[10px] text-gray-500">{gameState.cursePoints}/{curseMax}</span>
        </div>
        <div className="h-6 w-px bg-gray-700" />
        <div className="flex gap-3 text-sm">
          {RESOURCE_NAMES.map((r) => (
            <span key={r} className="flex items-center gap-1">
              <span>{RESOURCE_ICONS[r]}</span>
              <span className="font-mono text-white">{gameState.resources[r]}</span>
            </span>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <button
            onClick={startCombat}
            className="px-3 py-1.5 rounded-md bg-red-900/50 hover:bg-red-900 text-red-300 text-xs font-medium transition-colors"
          >
            ⚔️ Fight
          </button>
          <button
            onClick={endDay}
            className="px-3 py-1.5 rounded-md bg-purple-900/50 hover:bg-purple-900 text-purple-300 text-xs font-medium transition-colors"
          >
            🌅 End Day
          </button>
          <button
            onClick={() => {
              setGameState(createInitialState());
              setTileHand(Array.from({ length: 4 }, () => STARTING_TILES[Math.floor(Math.random() * STARTING_TILES.length)]));
              setLog(["Game reset. Welcome to Cursebound!"]);
              setCombatLog([]);
              setShowCombat(false);
              setSelectedTile(null);
            }}
            className="px-3 py-1.5 rounded-md bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium transition-colors"
          >
            🔄 Reset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-4">
        {/* Game Canvas + Hand */}
        <div className="space-y-4">
          <canvas
            ref={canvasRef}
            className="rounded-lg border border-gray-800 cursor-pointer"
            style={{
              width: CANVAS_PADDING * 2 + GRID_SIZE * (TILE_SIZE + TILE_GAP),
              height: CANVAS_PADDING * 2 + GRID_SIZE * (TILE_SIZE + TILE_GAP),
            }}
            onClick={handleCanvasClick}
            onMouseMove={handleCanvasMove}
            onMouseLeave={() => setHoveredTile(null)}
          />

          {/* Tile Hand */}
          <div className="p-3 rounded-lg bg-gray-900 border border-gray-800">
            <div className="text-xs text-gray-500 mb-2">Your Hand — click to select, then click a blank tile to place</div>
            <div className="flex gap-2">
              {tileHand.map((tile, i) => (
                <button
                  key={`${tile}-${i}`}
                  onClick={() => setDragTile(dragTile === tile ? null : tile)}
                  className={`w-16 h-16 rounded-md border-2 transition-all flex flex-col items-center justify-center gap-1 ${
                    dragTile === tile
                      ? "border-yellow-400 scale-105 shadow-lg shadow-yellow-400/20"
                      : "border-gray-700 hover:border-gray-500"
                  }`}
                  style={{ backgroundColor: tileColors[tile] || "#333" }}
                >
                  <span className="text-white text-[10px] font-bold drop-shadow-md">{tile}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Info Panel */}
        <div className="space-y-4">
          {/* Selected Tile Info */}
          {selectedTile && (
            <div className="p-3 rounded-lg bg-gray-900 border border-gray-800">
              <h3 className="text-sm font-semibold text-gray-300 mb-2">
                📍 {gameState.map[selectedTile.y][selectedTile.x].tileName} ({selectedTile.x}, {selectedTile.y})
              </h3>
              {gameState.map[selectedTile.y][selectedTile.x].units.length > 0 ? (
                <div className="space-y-2">
                  {gameState.map[selectedTile.y][selectedTile.x].units.map((unit, i) => {
                    const unitType = getUnitByIdKey(unit.unitTypeId);
                    return (
                      <div
                        key={unit.id}
                        className={`p-2 rounded border text-xs ${
                          unit.isEnemy ? "border-red-900/50 bg-red-950/20" : "border-green-900/50 bg-green-950/20"
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className={unit.isEnemy ? "text-red-300" : "text-green-300"}>
                            {unit.isEnemy ? "☠️" : "🛡️"} {unit.name}
                          </span>
                          <span className="text-gray-500">Lv.{unit.level}</span>
                        </div>
                        <div className="mt-1 text-gray-400">
                          HP: {unit.currentHealth}/{unit.stats[1] || 0} | DMG: {unit.stats[3] || 0}-{unit.stats[4] || 0}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-500">No units on this tile</p>
              )}
            </div>
          )}

          {/* Combat Log */}
          {showCombat && (
            <div className="p-3 rounded-lg bg-gray-900 border border-red-900/30">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-semibold text-red-400">⚔️ Combat Log</h3>
                <button
                  onClick={() => setShowCombat(false)}
                  className="text-xs text-gray-500 hover:text-gray-300"
                >
                  Close
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto text-xs font-mono space-y-0.5">
                {combatLog.map((line, i) => (
                  <div
                    key={i}
                    className={
                      line.includes("Victory") ? "text-green-400 font-bold" :
                      line.includes("Defeat") ? "text-red-400 font-bold" :
                      line.startsWith("---") ? "text-gray-500 mt-1" :
                      "text-gray-300"
                    }
                  >
                    {line}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Game Log */}
          <div className="p-3 rounded-lg bg-gray-900 border border-gray-800">
            <h3 className="text-sm font-semibold text-gray-300 mb-2">📜 Game Log</h3>
            <div className="max-h-64 overflow-y-auto text-xs font-mono space-y-0.5">
              {log.slice().reverse().map((line, i) => (
                <div
                  key={i}
                  className={
                    line.includes("💀") ? "text-red-400" :
                    line.includes("🔀") ? "text-blue-400" :
                    line.includes("⚠️") ? "text-yellow-400" :
                    line.includes("🌅") ? "text-purple-400" :
                    "text-gray-400"
                  }
                >
                  {line}
                </div>
              ))}
            </div>
          </div>

          {/* Merge Reference */}
          <div className="p-3 rounded-lg bg-gray-900 border border-gray-800">
            <h3 className="text-sm font-semibold text-gray-300 mb-2">🔀 Merge Reference</h3>
            <div className="grid grid-cols-1 gap-1 text-xs max-h-48 overflow-y-auto">
              {mergeTypes.slice(0, 8).map((m) => (
                <div key={m.id} className="flex items-center gap-1 text-gray-400">
                  <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: tileColors[m.firstTileTypeId] }} />
                  <span>{m.firstTileTypeId}</span>
                  <span className="text-gray-600">×3 →</span>
                  <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: tileColors[m.outputTileTypeId] }} />
                  <span className="text-white">{m.outputTileTypeId}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
