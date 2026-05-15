"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  unitTypes,
  mergeTypes,
  tileTypes,
  manaTypes,
  scalingValues,
  curseData,
  tileColors,
  getUnitByIdKey,
  getMergeOutput,
  getTileByName,
} from "@/lib/genrpg";
import type { GameState, MapTile, UnitInstance, UnitType, TileType } from "@/lib/genrpg";

// ─── Constants ───────────────────────────────────────────────

const GRID_SIZE = 8;
const TILE_SIZE = 72;
const TILE_GAP = 2;
const CANVAS_PADDING = 16;

const PLACEABLE_TILES = [
  "Meadow", "Hill", "Copse", "Spring", "Forest", "Field",
  "Pasture", "Farm", "Pond", "Valley", "Marsh", "Woods",
  "Grove", "Quarry", "LumberMill", "Stable", "WatchTower",
];
const STARTING_TILES = ["Meadow", "Hill", "Copse", "Spring", "Field", "Pasture"];

const RESOURCE_NAMES = ["crystal", "mana", "matter", "flesh"] as const;
const RESOURCE_ICON_MAP: Record<string, string> = {
  crystal: "IconCrystal",
  mana: "IconMana",
  matter: "IconMatter",
  flesh: "IconFlesh",
};
const RESOURCE_EMOJI: Record<string, string> = {
  crystal: "💎", mana: "🔮", matter: "⚙️", flesh: "🩸",
};

// ─── Image Cache ─────────────────────────────────────────────

const imageCache: Record<string, HTMLImageElement> = {};
const imageLoading: Set<string> = new Set();

function getImage(src: string): HTMLImageElement | null {
  if (imageCache[src]) return imageCache[src];
  if (imageLoading.has(src)) return null;
  imageLoading.add(src);
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = src;
  img.onload = () => {
    imageCache[src] = img;
    imageLoading.delete(src);
  };
  img.onerror = () => {
    imageLoading.delete(src);
  };
  return null;
}

function getTileImagePath(tileName: string): string {
  // Map tile name to file in /assets/tiles/
  const name = tileName.replace(/\s+/g, "") + "Tile";
  return `/assets/tiles/${name}.png`;
}

function getUnitImagePath(unitName: string): string {
  return `/assets/units/${unitName.replace(/\s+/g, "")}.png`;
}

function getPortraitPath(unitName: string): string {
  return `/assets/portraits/Portraits_${unitName.replace(/\s+/g, "")}.png`;
}

function getIconPath(iconName: string): string {
  return `/assets/icons/${iconName}.png`;
}

// ─── Game State ──────────────────────────────────────────────

function createInitialState(): GameState {
  const map: MapTile[][] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    map[y] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      map[y][x] = { tileTypeId: 2, tileName: "Blank", x, y, units: [] };
    }
  }
  const mid = Math.floor(GRID_SIZE / 2);
  // Place camp + roads
  map[mid][mid] = { tileTypeId: 3, tileName: "Camp", x: mid, y: mid, units: [] };
  map[mid][mid - 1] = { tileTypeId: 4, tileName: "Road", x: mid - 1, y: mid, units: [] };
  map[mid][mid + 1] = { tileTypeId: 4, tileName: "Road", x: mid + 1, y: mid, units: [] };
  map[mid - 1][mid] = { tileTypeId: 4, tileName: "Road", x: mid, y: mid - 1, units: [] };
  map[mid + 1][mid] = { tileTypeId: 4, tileName: "Road", x: mid, y: mid + 1, units: [] };

  const warrior = unitTypes.find((u) => u.name === "Warrior")!;
  map[mid][mid].units.push(createUnitInstance(warrior, false));

  return {
    day: 1, cursePoints: 0, curseLevel: 0, map, party: [],
    resources: { crystal: 5, mana: 5, matter: 5, flesh: 5 },
    upgrades: {},
    draftRerolls: { unit: 2, tile: 2 },
    draftChoices: { unit: 3, tile: 3 },
  };
}

function createUnitInstance(unitType: UnitType, isEnemy: boolean): UnitInstance {
  return {
    id: `${unitType.name}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    unitTypeId: unitType.idKey, name: unitType.name, level: 1,
    currentHealth: unitType.maxHealth,
    stats: {
      1: unitType.maxHealth, 3: unitType.minDam, 4: unitType.maxDam,
      5: unitType.evasion, 6: unitType.counter, 8: unitType.attackSpeed, 9: unitType.defense,
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
  dragTile: string | null,
) {
  const { map } = state;
  const totalSize = TILE_SIZE + TILE_GAP;

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // Dark background
  ctx.fillStyle = "#080812";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const tile = map[y][x];
      const px = CANVAS_PADDING + x * totalSize;
      const py = CANVAS_PADDING + y * totalSize;
      const isHovered = hoveredTile?.x === x && hoveredTile?.y === y;
      const isSelected = selectedTile?.x === x && selectedTile?.y === y;
      const isBlank = tile.tileName === "Blank";

      // Try to draw tile image
      if (!isBlank) {
        const img = getImage(getTileImagePath(tile.tileName));
        if (img) {
          ctx.drawImage(img, px, py, TILE_SIZE, TILE_SIZE);
        } else {
          // Fallback color
          ctx.fillStyle = tileColors[tile.tileName] || "#1a1a2e";
          ctx.beginPath();
          ctx.roundRect(px, py, TILE_SIZE, TILE_SIZE, 4);
          ctx.fill();
        }
      } else {
        // Blank tile
        ctx.fillStyle = "#0e0e1a";
        ctx.beginPath();
        ctx.roundRect(px, py, TILE_SIZE, TILE_SIZE, 4);
        ctx.fill();
        ctx.strokeStyle = "#1e1e30";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.roundRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2, 3);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Hover highlight for placeable blank
      if (isHovered && isBlank && dragTile) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
        ctx.beginPath();
        ctx.roundRect(px, py, TILE_SIZE, TILE_SIZE, 4);
        ctx.fill();
        ctx.strokeStyle = "rgba(251, 191, 36, 0.5)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2, 3);
        ctx.stroke();
      }

      // Selected glow
      if (isSelected) {
        ctx.strokeStyle = "#fbbf24";
        ctx.lineWidth = 2.5;
        ctx.shadowColor = "#fbbf24";
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.roundRect(px, py, TILE_SIZE, TILE_SIZE, 4);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Tile name label
      if (!isBlank) {
        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.fillRect(px, py + TILE_SIZE - 16, TILE_SIZE, 16);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 9px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(tile.tileName, px + TILE_SIZE / 2, py + TILE_SIZE - 4, TILE_SIZE - 4);
      }

      // Unit sprites on tile
      if (tile.units.length > 0) {
        const maxShow = Math.min(tile.units.length, 3);
        const spriteSize = 28;
        const startX = px + (TILE_SIZE - maxShow * (spriteSize + 2)) / 2;
        tile.units.slice(0, maxShow).forEach((unit, i) => {
          const ux = startX + i * (spriteSize + 2);
          const uy = py + 2;

          // Try to load unit sprite
          const unitImg = getImage(getUnitImagePath(unit.name));
          if (unitImg) {
            ctx.drawImage(unitImg, ux, uy, spriteSize, spriteSize);
          } else {
            // Fallback circle
            ctx.fillStyle = unit.isEnemy ? "#ef4444" : "#22c55e";
            ctx.beginPath();
            ctx.arc(ux + spriteSize / 2, uy + spriteSize / 2, spriteSize / 2 - 2, 0, Math.PI * 2);
            ctx.fill();
          }

          // Enemy/ally indicator ring
          ctx.strokeStyle = unit.isEnemy ? "#ef4444" : "#22c55e";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(ux + spriteSize / 2, uy + spriteSize / 2, spriteSize / 2 - 1, 0, Math.PI * 2);
          ctx.stroke();

          // HP bar
          const hpPct = unit.currentHealth / (unit.stats[1] || 1);
          const barW = spriteSize - 4;
          const barH = 3;
          const barX = ux + 2;
          const barY = uy + spriteSize - 1;
          ctx.fillStyle = "#000";
          ctx.fillRect(barX, barY, barW, barH);
          ctx.fillStyle = hpPct > 0.5 ? "#22c55e" : hpPct > 0.25 ? "#eab308" : "#ef4444";
          ctx.fillRect(barX, barY, barW * hpPct, barH);
        });

        // Show count if more than 3
        if (tile.units.length > 3) {
          ctx.fillStyle = "#fbbf24";
          ctx.font = "bold 10px system-ui";
          ctx.textAlign = "right";
          ctx.fillText(`+${tile.units.length - 3}`, px + TILE_SIZE - 4, py + 14);
        }
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
  const [log, setLog] = useState<string[]>(["Welcome to Cursebound! Select a tile from your hand, then click on the map to place it."]);
  const [combatLog, setCombatLog] = useState<string[]>([]);
  const [showCombat, setShowCombat] = useState(false);
  const [imagesReady, setImagesReady] = useState(false);
  const [tileHand, setTileHand] = useState<string[]>(() => {
    const hand: string[] = [];
    for (let i = 0; i < 5; i++) {
      hand.push(STARTING_TILES[Math.floor(Math.random() * STARTING_TILES.length)]);
    }
    return hand;
  });

  const addLog = useCallback((msg: string) => {
    setLog((prev) => [...prev.slice(-50), msg]);
  }, []);

  // Preload tile images
  useEffect(() => {
    const tilesToLoad = tileTypes
      .filter((t) => t.name !== "Blank")
      .map((t) => getTileImagePath(t.name));
    const unitsToLoad = unitTypes.map((u) => getUnitImagePath(u.name));
    const all = [...tilesToLoad, ...unitsToLoad];

    all.forEach((src) => getImage(src));

    // Re-render once images load
    const interval = setInterval(() => {
      const loaded = Object.keys(imageCache).length;
      if (loaded > 0) {
        setImagesReady(true);
      }
    }, 200);

    return () => clearInterval(interval);
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
  }, [gameState, hoveredTile, selectedTile, dragTile, imagesReady]);

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

    if (dragTile && tile.tileName === "Blank") {
      placeTile(coords.x, coords.y, dragTile);
      return;
    }

    if (selectedTile?.x === coords.x && selectedTile?.y === coords.y) {
      setSelectedTile(null);
    } else {
      setSelectedTile(coords);
      if (tile.tileName !== "Blank") {
        const tileData = getTileByName(tile.tileName);
        addLog(`Selected: ${tile.tileName} at (${coords.x}, ${coords.y}) — ${tile.units.length} units${tileData?.desc ? ` — ${tileData.desc}` : ""}`);
      }
    }
  };

  const handleCanvasMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setHoveredTile(getTileCoords(e));
  };

  // ─── Game Logic ──────────────────────────────────────────

  const placeTile = (x: number, y: number, tileName: string) => {
    // Check adjacency to road/camp
    const adj = [
      [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1],
    ];
    const hasAdjacentNonBlank = adj.some(([ax, ay]) => {
      if (ax < 0 || ax >= GRID_SIZE || ay < 0 || ay >= GRID_SIZE) return false;
      return gameState.map[ay][ax].tileName !== "Blank";
    });

    if (!hasAdjacentNonBlank) {
      addLog("⚠️ Must place adjacent to an existing tile!");
      return;
    }

    setGameState((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as GameState;
      const tileData = getTileByName(tileName);
      next.map[y][x] = {
        tileTypeId: tileData?.idKey || 0, tileName, x, y, units: [],
      };

      next.cursePoints += curseData.settings.pointsPerTilePlaced;

      // Check for merges
      const adjacentSame = findAdjacentGroup(next.map, x, y, tileName);
      if (adjacentSame.length >= 3) {
        const mergeOutput = getMergeOutput(tileName, tileName, tileName);
        if (mergeOutput) {
          const toConsume = adjacentSame.slice(0, 3);
          toConsume.forEach((pos, i) => {
            if (i < 2) {
              next.map[pos.y][pos.x] = { tileTypeId: 0, tileName: "Blank", x: pos.x, y: pos.y, units: [] };
            } else {
              const outData = getTileByName(mergeOutput);
              next.map[pos.y][pos.x] = { tileTypeId: outData?.idKey || 0, tileName: mergeOutput, x: pos.x, y: pos.y, units: [] };
            }
          });
          addLog(`🔀 Merged 3× ${tileName} → ${mergeOutput}!`);
          next.resources.crystal += 2;
          next.resources.mana += 1;
        }
      }

      checkCurseLevel(next);
      next.resources.crystal += 1;
      next.resources.matter += 1;
      return next;
    });

    setTileHand((prev) => {
      const idx = prev.indexOf(tileName);
      const next = [...prev];
      if (idx >= 0) {
        next.splice(idx, 1);
        next.push(PLACEABLE_TILES[Math.floor(Math.random() * PLACEABLE_TILES.length)]);
      }
      return next;
    });
    setDragTile(null);
    addLog(`Placed ${tileName} at (${x}, ${y})`);
  };

  const findAdjacentGroup = (
    map: MapTile[][], startX: number, startY: number, tileName: string,
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
    const threshold = curseData.settings.basePointsNeeded * (state.curseLevel + 1);
    if (state.cursePoints >= threshold) {
      state.curseLevel++;
      state.cursePoints = 0;
      addLog(`💀 Curse Level ${state.curseLevel}! Dark energy surges across the land...`);

      // Spawn corrupted tiles
      const blanks: { x: number; y: number }[] = [];
      state.map.forEach((row) => row.forEach((t) => {
        if (t.tileName === "Blank") blanks.push({ x: t.x, y: t.y });
      }));
      const corruptTiles = ["CorruptedSeed", "MeatPit", "VoidSpawner"];
      for (let i = 0; i < Math.min(state.curseLevel, 3); i++) {
        if (blanks.length > 0) {
          const idx = Math.floor(Math.random() * blanks.length);
          const pos = blanks.splice(idx, 1)[0];
          const ct = corruptTiles[Math.floor(Math.random() * corruptTiles.length)];
          state.map[pos.y][pos.x] = { tileTypeId: 0, tileName: ct, x: pos.x, y: pos.y, units: [] };
          addLog(`  ☠️ ${ct} appeared at (${pos.x}, ${pos.y})!`);
        }
      }
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
          const enemyMap: Record<string, number[]> = {
            Ruins: [8], Dungeon: [10, 11], CultTemple: [5, 6], CultSanctum: [5],
            CorruptedTree: [3], VoidSpawner: [10],
          };
          const possibleUnits = enemyMap[tile.tileName];
          if (possibleUnits && tile.units.filter((u) => u.isEnemy).length < 3) {
            const uid = possibleUnits[Math.floor(Math.random() * possibleUnits.length)];
            const ut = getUnitByIdKey(uid);
            if (ut) tile.units.push(createUnitInstance(ut, true));
          }
        })
      );

      next.resources.flesh += 2;
      next.resources.mana += 1;
      checkCurseLevel(next);
      return next;
    });
    addLog(`🌅 Day ${gameState.day + 1} dawns. The curse grows stronger...`);
  };

  const startCombat = () => {
    if (!selectedTile) { addLog("Select a tile with enemies to start combat!"); return; }
    const tile = gameState.map[selectedTile.y][selectedTile.x];
    const enemies = tile.units.filter((u) => u.isEnemy);
    if (enemies.length === 0) { addLog("No enemies on this tile!"); return; }

    const allies = gameState.map.flat().flatMap((t) => t.units.filter((u) => !u.isEnemy));
    if (allies.length === 0) { addLog("No allies to fight!"); return; }

    const clog: string[] = [`⚔️ Combat on ${tile.tileName}!`];
    const allyHP = allies.map((a) => ({ ...a, currentHealth: a.stats[1] || a.currentHealth }));
    const enemyHP = enemies.map((e) => ({ ...e, currentHealth: e.stats[1] || e.currentHealth }));

    let round = 0;
    while (allyHP.some((a) => a.currentHealth > 0) && enemyHP.some((e) => e.currentHealth > 0) && round < 20) {
      round++;
      clog.push(`--- Round ${round} ---`);
      allyHP.filter((a) => a.currentHealth > 0).forEach((ally) => {
        const target = enemyHP.find((e) => e.currentHealth > 0);
        if (!target) return;
        const dmg = Math.floor(Math.random() * ((ally.stats[4] || 5) - (ally.stats[3] || 2) + 1) + (ally.stats[3] || 2));
        const def = target.stats[9] || 0;
        const actual = Math.max(1, dmg - def);
        target.currentHealth -= actual;
        clog.push(`  ${ally.name} → ${target.name} for ${actual} dmg (${Math.max(0, target.currentHealth)} HP)`);
      });
      enemyHP.filter((e) => e.currentHealth > 0).forEach((enemy) => {
        const target = allyHP.find((a) => a.currentHealth > 0);
        if (!target) return;
        const dmg = Math.floor(Math.random() * ((enemy.stats[4] || 5) - (enemy.stats[3] || 2) + 1) + (enemy.stats[3] || 2));
        const def = target.stats[9] || 0;
        const actual = Math.max(1, dmg - def);
        target.currentHealth -= actual;
        clog.push(`  ${enemy.name} → ${target.name} for ${actual} dmg (${Math.max(0, target.currentHealth)} HP)`);
      });
    }

    const won = allyHP.some((a) => a.currentHealth > 0);
    clog.push(won ? "🎉 Victory!" : "💀 Defeat!");

    if (won) {
      setGameState((prev) => {
        const next = JSON.parse(JSON.stringify(prev)) as GameState;
        next.map[selectedTile.y][selectedTile.x].units = next.map[selectedTile.y][selectedTile.x].units.filter((u) => !u.isEnemy);
        next.cursePoints += curseData.settings.pointsPerKill * enemies.length;
        next.resources.crystal += enemies.length;
        next.resources.flesh += enemies.length;
        checkCurseLevel(next);
        return next;
      });
      addLog(`Victory! Gained ${enemies.length} crystal & flesh.`);
    }
    setCombatLog(clog);
    setShowCombat(true);
  };

  // ─── Render ──────────────────────────────────────────────

  const curseMax = curseData.settings.basePointsNeeded * (gameState.curseLevel + 1);
  const cursePct = Math.min((gameState.cursePoints / curseMax) * 100, 100);

  return (
    <div className="space-y-4">
      {/* Status Bar */}
      <div className="flex flex-wrap gap-4 items-center p-3 rounded-lg bg-gray-900/80 border border-gray-800 backdrop-blur-sm">
        <div className="text-sm">
          <span className="text-gray-500">Day</span>{" "}
          <span className="font-bold text-white text-lg">{gameState.day}</span>
        </div>
        <div className="h-6 w-px bg-gray-700" />
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">Curse</span>
          <span className="font-bold text-red-400">Lv{gameState.curseLevel}</span>
          <div className="w-28 bg-gray-800 rounded-full h-2.5 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-red-800 to-red-400 transition-all duration-300"
              style={{ width: `${cursePct}%` }}
            />
          </div>
          <span className="text-[10px] text-gray-600">{gameState.cursePoints}/{curseMax}</span>
        </div>
        <div className="h-6 w-px bg-gray-700" />
        <div className="flex gap-3 text-sm">
          {RESOURCE_NAMES.map((r) => (
            <span key={r} className="flex items-center gap-1">
              <span>{RESOURCE_EMOJI[r]}</span>
              <span className="font-mono text-white">{gameState.resources[r]}</span>
            </span>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={startCombat} className="px-3 py-1.5 rounded-md bg-red-900/50 hover:bg-red-800/60 text-red-300 text-xs font-medium transition-colors border border-red-900/30">
            ⚔️ Fight
          </button>
          <button onClick={endDay} className="px-3 py-1.5 rounded-md bg-purple-900/50 hover:bg-purple-800/60 text-purple-300 text-xs font-medium transition-colors border border-purple-900/30">
            🌅 End Day
          </button>
          <button onClick={() => {
            setGameState(createInitialState());
            setTileHand(Array.from({ length: 5 }, () => STARTING_TILES[Math.floor(Math.random() * STARTING_TILES.length)]));
            setLog(["Game reset. Welcome to Cursebound!"]);
            setCombatLog([]); setShowCombat(false); setSelectedTile(null);
          }} className="px-3 py-1.5 rounded-md bg-gray-800 hover:bg-gray-700 text-gray-400 text-xs font-medium transition-colors border border-gray-700/50">
            🔄
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-4">
        {/* Game Canvas + Hand */}
        <div className="space-y-3">
          <canvas
            ref={canvasRef}
            className="rounded-lg border border-gray-800 cursor-pointer shadow-xl shadow-black/40"
            style={{
              width: CANVAS_PADDING * 2 + GRID_SIZE * (TILE_SIZE + TILE_GAP),
              height: CANVAS_PADDING * 2 + GRID_SIZE * (TILE_SIZE + TILE_GAP),
            }}
            onClick={handleCanvasClick}
            onMouseMove={handleCanvasMove}
            onMouseLeave={() => setHoveredTile(null)}
          />

          {/* Tile Hand */}
          <div className="p-3 rounded-lg bg-gray-900/80 border border-gray-800">
            <div className="text-xs text-gray-500 mb-2">Your Hand — click a tile, then click blank space on the map</div>
            <div className="flex gap-2 flex-wrap">
              {tileHand.map((tile, i) => {
                const isActive = dragTile === tile;
                return (
                  <button
                    key={`${tile}-${i}`}
                    onClick={() => setDragTile(isActive ? null : tile)}
                    className={`w-[72px] h-[72px] rounded-lg border-2 transition-all relative overflow-hidden ${
                      isActive
                        ? "border-yellow-400 scale-110 shadow-lg shadow-yellow-400/30 z-10"
                        : "border-gray-700 hover:border-gray-500 hover:scale-105"
                    }`}
                    style={{ backgroundColor: tileColors[tile] || "#333" }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getTileImagePath(tile)}
                      alt={tile}
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                    <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] font-bold py-0.5 text-center">
                      {tile}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Info Panel */}
        <div className="space-y-3">
          {/* Selected Tile Info */}
          {selectedTile && (() => {
            const tile = gameState.map[selectedTile.y][selectedTile.x];
            const tileData = getTileByName(tile.tileName);
            return (
              <div className="p-3 rounded-lg bg-gray-900/80 border border-gray-800">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0" style={{ backgroundColor: tileColors[tile.tileName] || "#333" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={getTileImagePath(tile.tileName)} alt="" className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{tile.tileName}</h3>
                    <p className="text-[10px] text-gray-500">({selectedTile.x}, {selectedTile.y}){tileData?.desc ? ` — ${tileData.desc}` : ""}</p>
                  </div>
                </div>
                {tile.units.length > 0 ? (
                  <div className="space-y-1.5">
                    {tile.units.map((unit) => {
                      const hpPct = (unit.currentHealth / (unit.stats[1] || 1)) * 100;
                      return (
                        <div key={unit.id} className={`p-2 rounded border text-xs flex items-center gap-2 ${
                          unit.isEnemy ? "border-red-900/40 bg-red-950/20" : "border-green-900/40 bg-green-950/20"
                        }`}>
                          <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0 bg-gray-800">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={getPortraitPath(unit.name)} alt="" className="w-full h-full object-cover"
                              onError={(e) => {
                                const t = e.target as HTMLImageElement;
                                t.src = getUnitImagePath(unit.name);
                                t.onerror = () => { t.style.display = "none"; };
                              }} />
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between">
                              <span className={unit.isEnemy ? "text-red-300" : "text-green-300"}>
                                {unit.isEnemy ? "☠️" : "🛡️"} {unit.name}
                              </span>
                              <span className="text-gray-500">Lv.{unit.level}</span>
                            </div>
                            <div className="w-full bg-gray-800 rounded-full h-1.5 mt-1">
                              <div className={`h-full rounded-full transition-all ${hpPct > 50 ? "bg-green-500" : hpPct > 25 ? "bg-yellow-500" : "bg-red-500"}`}
                                style={{ width: `${hpPct}%` }} />
                            </div>
                            <div className="text-gray-500 mt-0.5">
                              HP {unit.currentHealth}/{unit.stats[1]} | DMG {unit.stats[3]}-{unit.stats[4]} | DEF {unit.stats[9] || 0}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : <p className="text-xs text-gray-600">No units</p>}
              </div>
            );
          })()}

          {/* Combat Log */}
          {showCombat && (
            <div className="p-3 rounded-lg bg-gray-900/80 border border-red-900/30">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-semibold text-red-400">⚔️ Combat Log</h3>
                <button onClick={() => setShowCombat(false)} className="text-xs text-gray-500 hover:text-gray-300">✕</button>
              </div>
              <div className="max-h-48 overflow-y-auto text-xs font-mono space-y-0.5">
                {combatLog.map((line, i) => (
                  <div key={i} className={
                    line.includes("Victory") ? "text-green-400 font-bold" :
                    line.includes("Defeat") ? "text-red-400 font-bold" :
                    line.startsWith("---") ? "text-gray-600 mt-1" : "text-gray-400"
                  }>{line}</div>
                ))}
              </div>
            </div>
          )}

          {/* Game Log */}
          <div className="p-3 rounded-lg bg-gray-900/80 border border-gray-800">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">📜 Game Log</h3>
            <div className="max-h-48 overflow-y-auto text-xs font-mono space-y-0.5">
              {log.slice().reverse().map((line, i) => (
                <div key={i} className={
                  line.includes("💀") ? "text-red-400" :
                  line.includes("🔀") ? "text-blue-400" :
                  line.includes("⚠️") ? "text-yellow-400" :
                  line.includes("🌅") ? "text-purple-400" : "text-gray-500"
                }>{line}</div>
              ))}
            </div>
          </div>

          {/* Mana Types */}
          <div className="p-3 rounded-lg bg-gray-900/80 border border-gray-800">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">🔮 Mana Types</h3>
            <div className="flex flex-wrap gap-2">
              {manaTypes.map((m) => (
                <span key={m.idKey} className="px-2 py-1 rounded text-xs border border-gray-700 flex items-center gap-1.5"
                  style={{ borderColor: m.color + "60", backgroundColor: m.color + "15" }}>
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }} />
                  <span style={{ color: m.color }}>{m.name}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Merge Reference */}
          <div className="p-3 rounded-lg bg-gray-900/80 border border-gray-800">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">🔀 Merges</h3>
            <div className="grid grid-cols-1 gap-1 text-xs max-h-40 overflow-y-auto">
              {mergeTypes.map((m) => (
                <div key={m.id} className="flex items-center gap-1 text-gray-500">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: tileColors[m.firstTileTypeId] || "#555" }} />
                  <span>{m.firstTileTypeId}</span>
                  <span className="text-gray-700">×3 →</span>
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: tileColors[m.outputTileTypeId] || "#555" }} />
                  <span className="text-white font-medium">{m.outputTileTypeId}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
