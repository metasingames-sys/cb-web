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
  upgradeTypes,
  initCombat,
  simulateRound,
  getCombatSummary,
} from "@/lib/genrpg";
import {
  TileVisibility,
} from "@/lib/genrpg/types";
import type {
  GameState, MapTile, UnitInstance, UnitType, CombatState, CombatLogEntry,
} from "@/lib/genrpg";

// ─── Constants ───────────────────────────────────────────────

const GRID_SIZE = 10;
const TILE_SIZE = 64;
const TILE_GAP = 0;
const CANVAS_PADDING = 0;
const CAMP_LIGHT_RADIUS = 3;
const TORCH_LIGHT_RADIUS = 2;
const SPRITE_SCALE = 1.15; // sprites render 15% larger for alpha overlap

// Loop Hero-style road circuit (clockwise from top-left)
const LOOP_PATH: [number, number][] = [
  // Top row (left to right)
  [2,2], [3,2], [4,2], [5,2], [6,2], [7,2],
  // Right column (top to bottom)
  [7,3], [7,4], [7,5], [7,6],
  // Bottom row (right to left)
  [7,7], [6,7], [5,7], [4,7], [3,7], [2,7],
  // Left column (bottom to top)
  [2,6], [2,5], [2,4], [2,3],
];

// Track sprite dimensions for overflow rendering
const spriteDimensions: Record<string, { w: number; h: number }> = {};

const PLACEABLE_TILES = [
  "Meadow", "Hill", "Copse", "Spring", "Forest", "Field",
  "Pasture", "Farm", "Pond", "Valley", "Marsh", "Woods",
  "Grove", "Quarry", "LumberMill", "Stable", "WatchTower",
];
const STARTING_TILES = ["Meadow", "Hill", "Copse", "Spring", "Field", "Pasture"];

const RESOURCE_EMOJI: Record<string, string> = {
  crystal: "💎", mana: "🔮", matter: "⚙️", flesh: "🩸",
};

// ─── Image Cache ─────────────────────────────────────────────

const imageCache: Record<string, HTMLImageElement> = {};
const imageLoading: Set<string> = new Set();
const imageFailed: Set<string> = new Set();

function getImage(src: string): HTMLImageElement | null {
  if (imageCache[src]) return imageCache[src];
  if (imageLoading.has(src) || imageFailed.has(src)) return null;
  imageLoading.add(src);
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = src;
  img.onload = () => {
    imageCache[src] = img;
    imageLoading.delete(src);
    spriteDimensions[src] = { w: img.naturalWidth, h: img.naturalHeight };
  };
  img.onerror = () => { imageLoading.delete(src); imageFailed.add(src); };
  return null;
}

function getTileImagePath(tileName: string): string {
  return `/assets/tiles/${tileName.replace(/\s+/g, "")}Tile.png`;
}
function getUnitImagePath(unitName: string): string {
  return `/assets/units/${unitName.replace(/\s+/g, "")}.png`;
}
function getPortraitPath(unitName: string): string {
  return `/assets/portraits/Portraits_${unitName.replace(/\s+/g, "")}.png`;
}

// ─── Fog of War Helpers ──────────────────────────────────────

function computeVisibility(map: MapTile[][]): void {
  const size = map.length;
  // Reset all to foggy first (unless we keep discovered)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const tile = map[y][x];
      // Keep discovered state, only remove Active
      if (tile.visibility === TileVisibility.Active) {
        tile.visibility = tile.tileName !== "Blank"
          ? TileVisibility.Filled
          : TileVisibility.Discovered;
      }
    }
  }

  // Find all light sources and illuminate
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const tile = map[y][x];
      if (tile.isLightSource && tile.lightRadius > 0) {
        illuminate(map, x, y, tile.lightRadius);
      }
    }
  }
}

function illuminate(map: MapTile[][], cx: number, cy: number, radius: number): void {
  const size = map.length;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || nx >= size || ny < 0 || ny >= size) continue;
      const dist = Math.abs(dx) + Math.abs(dy); // Manhattan distance
      if (dist > radius) continue;
      const tile = map[ny][nx];
      if (tile.visibility === TileVisibility.Foggy) {
        tile.visibility = TileVisibility.Discovered;
      }
      // Within light radius and has content → Active
      if (tile.tileName !== "Blank") {
        tile.visibility = TileVisibility.Active;
      } else if (tile.visibility < TileVisibility.Empty) {
        tile.visibility = TileVisibility.Empty;
      }
    }
  }
}

function discoverAround(map: MapTile[][], cx: number, cy: number, radius: number): void {
  const size = map.length;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || nx >= size || ny < 0 || ny >= size) continue;
      if (Math.abs(dx) + Math.abs(dy) > radius) continue;
      if (map[ny][nx].visibility === TileVisibility.Foggy) {
        map[ny][nx].visibility = TileVisibility.Discovered;
      }
    }
  }
}

// ─── Game State ──────────────────────────────────────────────

function createInitialState(): GameState {
  const map: MapTile[][] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    map[y] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      map[y][x] = {
        tileTypeId: 2, tileName: "Blank", x, y, units: [],
        visibility: TileVisibility.Foggy,
        isLightSource: false, lightRadius: 0,
      };
    }
  }

  // Place road loop (Loop Hero-style circuit)
  LOOP_PATH.forEach(([rx, ry]) => {
    map[ry][rx] = {
      tileTypeId: 4, tileName: "Road", x: rx, y: ry, units: [],
      visibility: TileVisibility.Active,
      isLightSource: false, lightRadius: 0,
    };
  });

  // Place camp at center of loop (5,5)
  const campX = 5, campY = 5;
  map[campY][campX] = {
    tileTypeId: 3, tileName: "Camp", x: campX, y: campY, units: [],
    visibility: TileVisibility.Active,
    isLightSource: true, lightRadius: CAMP_LIGHT_RADIUS,
  };

  // Place warrior at camp
  const warrior = unitTypes.find((u) => u.name === "Warrior")!;
  map[campY][campX].units.push(createUnitInstance(warrior, false));

  // Compute initial fog — camp light reveals the loop and nearby tiles
  computeVisibility(map);
  // Also discover all tiles adjacent to the loop
  LOOP_PATH.forEach(([rx, ry]) => {
    discoverAround(map, rx, ry, 1);
  });
  computeVisibility(map);

  return {
    day: 1, cursePoints: 0, curseLevel: 0, map, party: [],
    resources: { crystal: 5, mana: 5, matter: 5, flesh: 5 },
    upgrades: {},
    draftRerolls: { unit: 2, tile: 2 },
    draftChoices: { unit: 3, tile: 3 },
    torchCount: 1,
    baseUpgrades: 0,
    combat: null,
  };
}

function createUnitInstance(unitType: UnitType, isEnemy: boolean): UnitInstance {
  return {
    id: `${unitType.name}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    unitTypeId: unitType.idKey, name: unitType.name, level: 1,
    currentHealth: unitType.maxHealth,
    maxHealth: unitType.maxHealth,
    stats: {
      1: unitType.maxHealth, 3: unitType.minDam, 4: unitType.maxDam,
      5: unitType.evasion, 6: unitType.counter, 8: unitType.attackSpeed,
      9: unitType.defense, 13: unitType.critChance, 16: unitType.magicDamage,
      20: unitType.healing, 25: unitType.taunt,
    },
    isEnemy,
    traits: [],
  };
}

// ─── Canvas Renderer ─────────────────────────────────────────

function drawGrid(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  hoveredTile: { x: number; y: number } | null,
  selectedTile: { x: number; y: number } | null,
  dragTile: string | null,
  placingTorch: boolean,
  partyPos: number,
) {
  const { map } = state;
  const totalSize = TILE_SIZE + TILE_GAP;
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;
  ctx.clearRect(0, 0, cw, ch);

  // ─── Dark atmospheric background ───
  ctx.fillStyle = "#060610";
  ctx.fillRect(0, 0, cw, ch);

  // ─── Pass 1: Background layer (fog, blanks, base colors) ───
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const tile = map[y][x];
      const px = CANVAS_PADDING + x * totalSize;
      const py = CANVAS_PADDING + y * totalSize;
      const vis = tile.visibility;

      if (vis === TileVisibility.Foggy) {
        // Dark atmospheric fog — no purple dots, just subtle dark variation
        const seed = (x * 7 + y * 13) % 17;
        const r = 6 + (seed % 4);
        const g = 6 + (seed % 3);
        const b = 14 + (seed % 6);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        // Subtle fog wisps
        ctx.fillStyle = `rgba(20, 15, 35, ${0.3 + (seed % 5) * 0.08})`;
        ctx.beginPath();
        ctx.arc(px + TILE_SIZE * 0.3 + seed * 2, py + TILE_SIZE * 0.5, TILE_SIZE * 0.25, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }

      const isBlank = tile.tileName === "Blank";
      if (isBlank) {
        // Discovered blank — dark ground, slightly lighter than fog
        ctx.fillStyle = vis >= TileVisibility.Empty ? "#0e0e1a" : "#0a0a14";
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        if (vis >= TileVisibility.Discovered) {
          ctx.strokeStyle = "rgba(40, 40, 60, 0.4)";
          ctx.lineWidth = 0.5;
          ctx.strokeRect(px + 0.5, py + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
        }
      } else {
        // Non-blank tile — draw dark base behind sprite
        ctx.fillStyle = "#0a0a14";
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
      }
    }
  }

  // ─── Pass 2: Tile sprites (top to bottom for correct overlap) ───
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const tile = map[y][x];
      const px = CANVAS_PADDING + x * totalSize;
      const py = CANVAS_PADDING + y * totalSize;
      const vis = tile.visibility;
      if (vis === TileVisibility.Foggy) continue;
      const isDim = vis === TileVisibility.Discovered || vis === TileVisibility.Filled;
      const isBlank = tile.tileName === "Blank";

      if (!isBlank) {
        const imgPath = getTileImagePath(tile.tileName);
        const img = getImage(imgPath);
        if (img) {
          const dims = spriteDimensions[imgPath];
          if (isDim) ctx.globalAlpha = 0.5;
          if (dims && (dims.w > 260 || dims.h > 260)) {
            // Oversized sprite — render with overflow, bottom-aligned
            const baseW = TILE_SIZE * SPRITE_SCALE;
            const aspect = dims.h / dims.w;
            const drawW = baseW;
            const drawH = baseW * aspect;
            const drawX = px + (TILE_SIZE - drawW) / 2;
            const drawY = py + TILE_SIZE - drawH; // bottom-aligned
            ctx.drawImage(img, drawX, drawY, drawW, drawH);
          } else {
            // Standard 256×256 tile — slight overflow for alpha blending
            const overflow = TILE_SIZE * (SPRITE_SCALE - 1);
            ctx.drawImage(
              img,
              px - overflow / 2,
              py - overflow / 2,
              TILE_SIZE + overflow,
              TILE_SIZE + overflow,
            );
          }
          ctx.globalAlpha = 1;
        } else {
          // Fallback color while loading
          ctx.fillStyle = tileColors[tile.tileName] || "#1a1a2e";
          if (isDim) ctx.globalAlpha = 0.5;
          ctx.fillRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
          ctx.globalAlpha = 1;
        }
      }
    }
  }

  // ─── Pass 3: Overlays (selection, hover, light, units, party marker) ───
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const tile = map[y][x];
      const px = CANVAS_PADDING + x * totalSize;
      const py = CANVAS_PADDING + y * totalSize;
      const vis = tile.visibility;
      if (vis === TileVisibility.Foggy) continue;
      const isHovered = hoveredTile?.x === x && hoveredTile?.y === y;
      const isSelected = selectedTile?.x === x && selectedTile?.y === y;
      const isBlank = tile.tileName === "Blank";

      // Light source warm glow
      if (tile.isLightSource) {
        const gradient = ctx.createRadialGradient(
          px + TILE_SIZE / 2, py + TILE_SIZE / 2, 2,
          px + TILE_SIZE / 2, py + TILE_SIZE / 2, TILE_SIZE * 0.8,
        );
        gradient.addColorStop(0, "rgba(255, 200, 60, 0.12)");
        gradient.addColorStop(1, "rgba(255, 200, 60, 0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(px - 4, py - 4, TILE_SIZE + 8, TILE_SIZE + 8);
      }

      // Hover highlight
      if (isHovered) {
        const canPlace = isBlank && vis >= TileVisibility.Discovered && (dragTile || placingTorch);
        if (canPlace) {
          ctx.fillStyle = placingTorch ? "rgba(255, 200, 60, 0.15)" : "rgba(255, 255, 255, 0.1)";
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = placingTorch ? "rgba(255, 200, 60, 0.7)" : "rgba(251, 191, 36, 0.6)";
          ctx.lineWidth = 2;
          ctx.strokeRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2);
        }
      }

      // Selected glow
      if (isSelected) {
        ctx.strokeStyle = "#fbbf24";
        ctx.lineWidth = 2;
        ctx.shadowColor = "#fbbf24";
        ctx.shadowBlur = 8;
        ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
        ctx.shadowBlur = 0;
      }

      // Unit sprites on tiles
      if (tile.units.length > 0 && vis >= TileVisibility.Discovered) {
        const maxShow = Math.min(tile.units.length, 3);
        const spriteSize = 24;
        const startX = px + (TILE_SIZE - maxShow * (spriteSize + 2)) / 2;
        tile.units.slice(0, maxShow).forEach((unit, i) => {
          const ux = startX + i * (spriteSize + 2);
          const uy = py + TILE_SIZE - spriteSize - 6;
          const unitImg = getImage(getUnitImagePath(unit.name));
          if (unitImg) {
            ctx.drawImage(unitImg, ux, uy, spriteSize, spriteSize);
          } else {
            ctx.fillStyle = unit.isEnemy ? "#ef4444" : "#22c55e";
            ctx.beginPath();
            ctx.arc(ux + spriteSize / 2, uy + spriteSize / 2, spriteSize / 2 - 2, 0, Math.PI * 2);
            ctx.fill();
          }
          // Border ring
          ctx.strokeStyle = unit.isEnemy ? "rgba(239,68,68,0.8)" : "rgba(34,197,94,0.8)";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(ux + spriteSize / 2, uy + spriteSize / 2, spriteSize / 2, 0, Math.PI * 2);
          ctx.stroke();
          // HP bar
          const hpPct = unit.currentHealth / (unit.maxHealth || 1);
          ctx.fillStyle = "rgba(0,0,0,0.7)";
          ctx.fillRect(ux + 1, uy + spriteSize + 1, spriteSize - 2, 3);
          ctx.fillStyle = hpPct > 0.5 ? "#22c55e" : hpPct > 0.25 ? "#eab308" : "#ef4444";
          ctx.fillRect(ux + 1, uy + spriteSize + 1, (spriteSize - 2) * hpPct, 3);
        });
        if (tile.units.length > 3) {
          ctx.fillStyle = "#fbbf24";
          ctx.font = "bold 9px system-ui";
          ctx.textAlign = "right";
          ctx.fillText(`+${tile.units.length - 3}`, px + TILE_SIZE - 2, py + 12);
        }
      }

      // Party position marker on loop
      if (partyPos >= 0 && partyPos < LOOP_PATH.length) {
        const [lpx, lpy] = LOOP_PATH[partyPos];
        if (x === lpx && y === lpy) {
          // Pulsing green ring for party position
          const cx = px + TILE_SIZE / 2;
          const cy = py + TILE_SIZE / 2;
          ctx.strokeStyle = "rgba(34, 197, 94, 0.9)";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(cx, cy, TILE_SIZE * 0.35, 0, Math.PI * 2);
          ctx.stroke();
          // Inner glow
          const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, TILE_SIZE * 0.35);
          glow.addColorStop(0, "rgba(34, 197, 94, 0.2)");
          glow.addColorStop(1, "rgba(34, 197, 94, 0)");
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(cx, cy, TILE_SIZE * 0.35, 0, Math.PI * 2);
          ctx.fill();
          // "P" label
          ctx.fillStyle = "#22c55e";
          ctx.font = "bold 14px system-ui";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("⚔", cx, cy);
          ctx.textBaseline = "alphabetic";
        }
      }
    }
  }

  // ─── Pass 4: Fog edge vignette ───
  // Darken edges where fog meets discovered tiles for atmosphere
  const edgeGrad = ctx.createRadialGradient(cw / 2, ch / 2, cw * 0.3, cw / 2, ch / 2, cw * 0.55);
  edgeGrad.addColorStop(0, "rgba(0,0,0,0)");
  edgeGrad.addColorStop(1, "rgba(6,6,16,0.5)");
  ctx.fillStyle = edgeGrad;
  ctx.fillRect(0, 0, cw, ch);
}

// ─── Combat Panel Component ──────────────────────────────────

function CombatPanel({
  combat,
  onNextRound,
  onClose,
}: {
  combat: CombatState;
  onNextRound: () => void;
  onClose: () => void;
}) {
  const summary = getCombatSummary(combat);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [combat.log.length]);

  return (
    <div className="p-3 rounded-lg bg-gray-900/90 border border-red-900/40 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-red-400">⚔️ Combat — {combat.tileName}</h3>
        <div className="flex gap-2 items-center">
          <span className="text-[10px] text-gray-500">Round {combat.round}</span>
          {combat.result === "pending" ? (
            <button
              onClick={onNextRound}
              className="px-2 py-1 text-xs bg-red-900/50 hover:bg-red-800/60 text-red-300 rounded border border-red-900/30 transition-colors"
            >
              {combat.isPaused ? "▶ Next Round" : "⚡ Auto-Round"}
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded border border-gray-700 transition-colors"
            >
              ✕ Close
            </button>
          )}
        </div>
      </div>

      {/* HP Bars */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          <div className="text-[10px] text-green-400 mb-0.5">Allies ({summary.allyAlive})</div>
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div
              className="h-full rounded-full bg-green-500 transition-all"
              style={{ width: `${(summary.allyHP / Math.max(summary.allyMaxHP, 1)) * 100}%` }}
            />
          </div>
          <div className="text-[9px] text-gray-500">{summary.allyHP}/{summary.allyMaxHP} HP</div>
        </div>
        <div>
          <div className="text-[10px] text-red-400 mb-0.5">Enemies ({summary.enemyAlive})</div>
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div
              className="h-full rounded-full bg-red-500 transition-all"
              style={{ width: `${(summary.enemyHP / Math.max(summary.enemyMaxHP, 1)) * 100}%` }}
            />
          </div>
          <div className="text-[9px] text-gray-500">{summary.enemyHP}/{summary.enemyMaxHP} HP</div>
        </div>
      </div>

      {/* Unit Cards */}
      <div className="grid grid-cols-2 gap-1 mb-2">
        {[...combat.allies.map((u) => ({ ...u, side: "ally" as const })),
          ...combat.enemies.map((u) => ({ ...u, side: "enemy" as const }))].map((cu) => {
          const hpPct = (cu.currentHealth / Math.max(cu.maxHealth, 1)) * 100;
          return (
            <div
              key={cu.instance.id}
              className={`p-1.5 rounded border text-[10px] flex items-center gap-1.5 ${
                !cu.isAlive ? "opacity-30 " : ""
              }${cu.side === "ally" ? "border-green-900/30 bg-green-950/10" : "border-red-900/30 bg-red-950/10"}`}
            >
              <div className="w-6 h-6 rounded overflow-hidden flex-shrink-0 bg-gray-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getUnitImagePath(cu.instance.name)}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between">
                  <span className={`truncate ${cu.side === "ally" ? "text-green-300" : "text-red-300"}`}>
                    {cu.instance.name}
                  </span>
                  <span className="text-gray-600 ml-1">{cu.isAlive ? "" : "☠️"}</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-1 mt-0.5">
                  <div
                    className={`h-full rounded-full ${hpPct > 50 ? "bg-green-500" : hpPct > 25 ? "bg-yellow-500" : "bg-red-500"}`}
                    style={{ width: `${hpPct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Combat Log */}
      <div className="max-h-32 overflow-y-auto text-[10px] font-mono space-y-px bg-black/30 rounded p-1.5">
        {combat.log.slice(-30).map((entry, i) => (
          <div
            key={i}
            className={
              entry.type === "result"
                ? entry.message.includes("Victory") ? "text-green-400 font-bold" : "text-red-400 font-bold"
                : entry.type === "round" ? "text-gray-600 mt-0.5"
                : entry.type === "death" ? "text-red-400"
                : entry.type === "heal" ? "text-green-400"
                : entry.type === "crit" ? "text-yellow-400"
                : entry.type === "evade" ? "text-blue-400"
                : entry.type === "counter" ? "text-purple-400"
                : entry.type === "shield" ? "text-cyan-400"
                : "text-gray-500"
            }
          >
            {entry.message}
          </div>
        ))}
        <div ref={logEndRef} />
      </div>

      {/* Result banner */}
      {combat.result !== "pending" && (
        <div className={`mt-2 p-2 rounded text-center font-bold text-sm ${
          combat.result === "victory"
            ? "bg-green-900/30 text-green-400 border border-green-900/40"
            : "bg-red-900/30 text-red-400 border border-red-900/40"
        }`}>
          {combat.result === "victory" ? "🎉 VICTORY!" : "💀 DEFEAT"}
        </div>
      )}
    </div>
  );
}

// ─── Upgrade Shop Component ──────────────────────────────────

function UpgradeShop({
  upgrades: ownedUpgrades,
  resources,
  onBuy,
}: {
  upgrades: Record<number, number>;
  resources: { crystal: number; mana: number; matter: number; flesh: number };
  onBuy: (id: number) => void;
}) {
  return (
    <div className="p-3 rounded-lg bg-gray-900/80 border border-gray-800">
      <h3 className="text-sm font-semibold text-gray-400 mb-2">🏪 Upgrades</h3>
      <div className="space-y-1 max-h-52 overflow-y-auto">
        {upgradeTypes.map((up) => {
          const currentTier = ownedUpgrades[up.idKey] || 0;
          const isMaxed = currentTier >= up.maxTier;
          const canAfford =
            resources.crystal >= up.costs.crystal &&
            resources.mana >= up.costs.mana &&
            resources.matter >= up.costs.matter &&
            resources.flesh >= up.costs.flesh;
          return (
            <div key={up.idKey} className="flex items-center gap-2 p-1.5 rounded border border-gray-800/50 bg-gray-950/30">
              <div className="w-7 h-7 rounded overflow-hidden bg-gray-800 flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/assets/upgrades/${up.icon}.png`}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-white font-medium truncate">{up.name}</span>
                  <span className="text-[9px] text-gray-600">{currentTier}/{up.maxTier}</span>
                </div>
                <p className="text-[9px] text-gray-500 truncate">{up.desc}</p>
              </div>
              {!isMaxed && (
                <button
                  disabled={!canAfford}
                  onClick={() => onBuy(up.idKey)}
                  className={`px-2 py-0.5 text-[9px] rounded border transition-colors flex-shrink-0 ${
                    canAfford
                      ? "bg-yellow-900/30 border-yellow-900/40 text-yellow-300 hover:bg-yellow-800/40"
                      : "bg-gray-900 border-gray-800 text-gray-600 cursor-not-allowed"
                  }`}
                >
                  {[up.costs.crystal && `${up.costs.crystal}💎`, up.costs.mana && `${up.costs.mana}🔮`,
                    up.costs.matter && `${up.costs.matter}⚙️`, up.costs.flesh && `${up.costs.flesh}🩸`]
                    .filter(Boolean).join(" ") || "Free"}
                </button>
              )}
              {isMaxed && <span className="text-[9px] text-green-600">MAX</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────

export default function GameView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>(() => createInitialState());
  const [selectedTile, setSelectedTile] = useState<{ x: number; y: number } | null>(null);
  const [hoveredTile, setHoveredTile] = useState<{ x: number; y: number } | null>(null);
  const [dragTile, setDragTile] = useState<string | null>(null);
  const [placingTorch, setPlacingTorch] = useState(false);
  const [log, setLog] = useState<string[]>(["Welcome to Cursebound! Place tiles from your hand onto the map."]);
  const [partyLoopIndex, setPartyLoopIndex] = useState(0);
  const [isWalking, setIsWalking] = useState(false);
  const walkTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [activeTab, setActiveTab] = useState<"info" | "upgrades" | "merges">("info");
  const [imagesReady, setImagesReady] = useState(false);
  const [tileHand, setTileHand] = useState<string[]>(() =>
    Array.from({ length: 5 }, () => STARTING_TILES[Math.floor(Math.random() * STARTING_TILES.length)])
  );

  const addLog = useCallback((msg: string) => {
    setLog((prev) => [...prev.slice(-60), msg]);
  }, []);

  // Preload images
  useEffect(() => {
    tileTypes.filter((t) => t.name !== "Blank").forEach((t) => getImage(getTileImagePath(t.name)));
    unitTypes.forEach((u) => getImage(getUnitImagePath(u.name)));
    const interval = setInterval(() => {
      if (Object.keys(imageCache).length > 0) setImagesReady(true);
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
    drawGrid(ctx, gameState, hoveredTile, selectedTile, dragTile, placingTorch, partyLoopIndex);
  }, [gameState, hoveredTile, selectedTile, dragTile, placingTorch, imagesReady, partyLoopIndex]);

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

    // Torch placement
    if (placingTorch && tile.tileName === "Blank" && tile.visibility >= TileVisibility.Discovered) {
      placeTorch(coords.x, coords.y);
      return;
    }

    // Tile placement
    if (dragTile && tile.tileName === "Blank" && tile.visibility >= TileVisibility.Discovered) {
      placeTile(coords.x, coords.y, dragTile);
      return;
    }

    // Selection
    if (selectedTile?.x === coords.x && selectedTile?.y === coords.y) {
      setSelectedTile(null);
    } else if (tile.visibility >= TileVisibility.Discovered) {
      setSelectedTile(coords);
      if (tile.tileName !== "Blank") {
        const tileData = getTileByName(tile.tileName);
        addLog(`Selected: ${tile.tileName} (${coords.x},${coords.y}) — ${tile.units.length} unit${tile.units.length !== 1 ? "s" : ""}${tileData?.desc ? ` — ${tileData.desc}` : ""}`);
      }
    }
  };

  const handleCanvasMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setHoveredTile(getTileCoords(e));
  };

  // ─── Game Logic ──────────────────────────────────────────

  const placeTile = (x: number, y: number, tileName: string) => {
    const adj = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
    const hasAdj = adj.some(([ax, ay]) => {
      if (ax < 0 || ax >= GRID_SIZE || ay < 0 || ay >= GRID_SIZE) return false;
      return gameState.map[ay][ax].tileName !== "Blank";
    });
    if (!hasAdj) {
      addLog("⚠️ Must place adjacent to an existing tile!");
      return;
    }

    setGameState((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as GameState;
      const tileData = getTileByName(tileName);
      next.map[y][x] = {
        tileTypeId: tileData?.idKey || 0, tileName, x, y, units: [],
        visibility: TileVisibility.Filled,
        isLightSource: false, lightRadius: 0,
      };
      next.cursePoints += curseData.settings.pointsPerTilePlaced;

      // Check merges
      const group = findAdjacentGroup(next.map, x, y, tileName);
      if (group.length >= 3) {
        const mergeOutput = getMergeOutput(tileName, tileName, tileName);
        if (mergeOutput) {
          const consume = group.slice(0, 3);
          consume.forEach((pos, i) => {
            if (i < 2) {
              next.map[pos.y][pos.x] = {
                tileTypeId: 0, tileName: "Blank", x: pos.x, y: pos.y, units: [],
                visibility: TileVisibility.Discovered,
                isLightSource: false, lightRadius: 0,
              };
            } else {
              const outData = getTileByName(mergeOutput);
              next.map[pos.y][pos.x] = {
                tileTypeId: outData?.idKey || 0, tileName: mergeOutput, x: pos.x, y: pos.y, units: [],
                visibility: TileVisibility.Filled,
                isLightSource: false, lightRadius: 0,
              };
            }
          });
          addLog(`🔀 Merged 3× ${tileName} → ${mergeOutput}!`);
          next.resources.crystal += 2;
          next.resources.mana += 1;
        }
      }

      // Spawn enemies on certain tiles
      const enemySpawns: Record<string, number[]> = {
        Ruins: [8], Dungeon: [10, 11], CultTemple: [5, 6], CultSanctum: [5],
        CorruptedTree: [3], VoidSpawner: [10, 14], MeatPit: [15],
      };
      const possible = enemySpawns[tileName];
      if (possible) {
        const uid = possible[Math.floor(Math.random() * possible.length)];
        const ut = getUnitByIdKey(uid);
        if (ut) {
          next.map[y][x].units.push(createUnitInstance(ut, true));
          addLog(`⚠️ ${ut.name} appeared on ${tileName}!`);
        }
      }

      checkCurseLevel(next);
      next.resources.crystal += 1;
      next.resources.matter += 1;
      computeVisibility(next.map);
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

  const placeTorch = (x: number, y: number) => {
    if (gameState.torchCount <= 0) {
      addLog("⚠️ No torches available!");
      return;
    }

    setGameState((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as GameState;
      next.map[y][x] = {
        tileTypeId: 0, tileName: "Lantern", x, y, units: [],
        visibility: TileVisibility.Active,
        isLightSource: true, lightRadius: TORCH_LIGHT_RADIUS,
      };
      next.torchCount--;
      computeVisibility(next.map);
      return next;
    });
    setPlacingTorch(false);
    addLog(`🔥 Placed torch at (${x}, ${y}) — reveals nearby tiles!`);
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
    const threshold = curseData.settings.basePointsNeeded * (state.curseLevel + 1);
    if (state.cursePoints >= threshold) {
      state.curseLevel++;
      state.cursePoints = 0;
      addLog(`💀 Curse Level ${state.curseLevel}! Dark energy surges...`);

      // Discover some fog and spawn corrupted tiles
      const fogged: { x: number; y: number }[] = [];
      const blanks: { x: number; y: number }[] = [];
      state.map.forEach((row) => row.forEach((t) => {
        if (t.visibility === TileVisibility.Foggy) fogged.push({ x: t.x, y: t.y });
        if (t.tileName === "Blank" && t.visibility >= TileVisibility.Discovered) blanks.push({ x: t.x, y: t.y });
      }));

      // Reveal some fog
      for (let i = 0; i < Math.min(state.curseLevel * 2, fogged.length); i++) {
        const idx = Math.floor(Math.random() * fogged.length);
        const pos = fogged.splice(idx, 1)[0];
        state.map[pos.y][pos.x].visibility = TileVisibility.Discovered;
      }

      // Spawn cursed tiles
      const corruptTiles = ["CorruptedSeed", "MeatPit", "VoidSpawner"];
      for (let i = 0; i < Math.min(state.curseLevel, 3); i++) {
        if (blanks.length > 0) {
          const idx = Math.floor(Math.random() * blanks.length);
          const pos = blanks.splice(idx, 1)[0];
          const ct = corruptTiles[Math.floor(Math.random() * corruptTiles.length)];
          state.map[pos.y][pos.x] = {
            tileTypeId: 0, tileName: ct, x: pos.x, y: pos.y, units: [],
            visibility: state.map[pos.y][pos.x].visibility,
            isLightSource: false, lightRadius: 0,
          };
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

      // Enemies spawn on enemy tiles
      next.map.forEach((row) =>
        row.forEach((tile) => {
          const spawns: Record<string, number[]> = {
            Ruins: [8], Dungeon: [10, 11], CultTemple: [5, 6],
            CorruptedTree: [3], VoidSpawner: [10],
          };
          const possible = spawns[tile.tileName];
          if (possible && tile.units.filter((u) => u.isEnemy).length < 3) {
            const uid = possible[Math.floor(Math.random() * possible.length)];
            const ut = getUnitByIdKey(uid);
            if (ut) tile.units.push(createUnitInstance(ut, true));
          }
        })
      );

      next.resources.flesh += 2;
      next.resources.mana += 1;
      next.torchCount += 1; // earn a torch each day
      checkCurseLevel(next);
      computeVisibility(next.map);
      return next;
    });
    addLog(`🌅 Day ${gameState.day + 1} dawns. +1 🔥 torch. The curse grows...`);
  };

  // ─── Auto-walk Logic ──────────────────────────────────────

  const walkOneStep = useCallback(() => {
    setPartyLoopIndex((prev) => {
      const next = (prev + 1) % LOOP_PATH.length;
      const [tx, ty] = LOOP_PATH[next];
      const tile = gameState.map[ty][tx];

      // Check for enemies on this tile
      const enemies = tile.units.filter((u) => u.isEnemy);
      if (enemies.length > 0) {
        // Stop walking and auto-trigger combat
        setIsWalking(false);
        setSelectedTile({ x: tx, y: ty });
        addLog(`⚔️ Party encounters ${enemies.length} enem${enemies.length > 1 ? "ies" : "y"} on ${tile.tileName}!`);
        // Auto-start combat on next tick
        setTimeout(() => {
          setGameState((prev2) => {
            const allies = prev2.map.flat().flatMap((t) => t.units.filter((u) => !u.isEnemy));
            if (allies.length === 0) return prev2;
            const next2 = JSON.parse(JSON.stringify(prev2)) as GameState;
            next2.combat = initCombat(allies, enemies, tile.tileName, tx, ty);
            return next2;
          });
        }, 200);
        return next;
      }

      // Full loop completed
      if (next === 0) {
        setIsWalking(false);
        addLog("🔄 Loop complete! Ending day...");
        setTimeout(() => endDay(), 300);
        return next;
      }

      return next;
    });
  }, [gameState, addLog]);

  // Walking timer effect
  useEffect(() => {
    if (isWalking) {
      walkTimerRef.current = setInterval(walkOneStep, 600);
    } else if (walkTimerRef.current) {
      clearInterval(walkTimerRef.current);
      walkTimerRef.current = null;
    }
    return () => {
      if (walkTimerRef.current) clearInterval(walkTimerRef.current);
    };
  }, [isWalking, walkOneStep]);

  const toggleWalk = () => {
    if (gameState.combat?.active) {
      addLog("⚠️ Resolve combat first!");
      return;
    }
    setIsWalking((prev) => !prev);
    if (!isWalking) addLog("🚶 Party begins walking the loop...");
  };

  const startCombat = () => {
    if (gameState.combat?.active) { addLog("Combat already in progress!"); return; }
    if (!selectedTile) { addLog("Select a tile with enemies first!"); return; }
    const tile = gameState.map[selectedTile.y][selectedTile.x];
    const enemies = tile.units.filter((u) => u.isEnemy);
    if (enemies.length === 0) { addLog("No enemies on this tile!"); return; }

    // Gather allies from camp and adjacent tiles
    const allies = gameState.map.flat().flatMap((t) => t.units.filter((u) => !u.isEnemy));
    if (allies.length === 0) { addLog("No allies to fight!"); return; }

    setGameState((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as GameState;
      next.combat = initCombat(allies, enemies, tile.tileName, selectedTile.x, selectedTile.y);
      return next;
    });
    addLog(`⚔️ Combat started on ${tile.tileName}!`);
  };

  const advanceCombat = () => {
    setGameState((prev) => {
      if (!prev.combat || !prev.combat.active) return prev;
      const next = JSON.parse(JSON.stringify(prev)) as GameState;
      next.combat = simulateRound(next.combat!);

      // On victory: remove enemies from tile, gain rewards
      if (next.combat!.result === "victory") {
        const tx = next.combat!.tileX;
        const ty = next.combat!.tileY;
        const killed = next.map[ty][tx].units.filter((u: UnitInstance) => u.isEnemy).length;
        next.map[ty][tx].units = next.map[ty][tx].units.filter((u: UnitInstance) => !u.isEnemy);
        next.cursePoints += curseData.settings.pointsPerKill * killed;
        next.resources.crystal += killed;
        next.resources.flesh += killed;
        next.torchCount += 1; // earn torch from combat
        addLog(`Victory! +${killed} 💎 +${killed} 🩸 +1 🔥`);

        // Update ally HP from combat results
        for (const cu of next.combat!.allies) {
          for (const row of next.map) {
            for (const tile of row) {
              const unit = tile.units.find((u: UnitInstance) => u.id === cu.instance.id);
              if (unit) {
                unit.currentHealth = Math.max(0, cu.currentHealth);
              }
            }
          }
        }
      }
      if (next.combat!.result === "defeat") {
        addLog("Defeat... Your allies have fallen.");
      }
      return next;
    });
  };

  const closeCombat = () => {
    setGameState((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as GameState;
      next.combat = null;
      return next;
    });
  };

  const buyUpgrade = (id: number) => {
    const up = upgradeTypes.find((u) => u.idKey === id);
    if (!up) return;

    setGameState((prev) => {
      const currentTier = prev.upgrades[id] || 0;
      if (currentTier >= up.maxTier) return prev;
      if (
        prev.resources.crystal < up.costs.crystal ||
        prev.resources.mana < up.costs.mana ||
        prev.resources.matter < up.costs.matter ||
        prev.resources.flesh < up.costs.flesh
      ) return prev;

      const next = JSON.parse(JSON.stringify(prev)) as GameState;
      next.resources.crystal -= up.costs.crystal;
      next.resources.mana -= up.costs.mana;
      next.resources.matter -= up.costs.matter;
      next.resources.flesh -= up.costs.flesh;
      next.upgrades[id] = currentTier + 1;
      return next;
    });
    addLog(`🏪 Upgraded ${up.name} to tier ${(gameState.upgrades[id] || 0) + 1}!`);
  };

  // ─── Render ──────────────────────────────────────────────

  const curseMax = curseData.settings.basePointsNeeded * (gameState.curseLevel + 1);
  const cursePct = Math.min((gameState.cursePoints / curseMax) * 100, 100);
  const canvasTotal = CANVAS_PADDING * 2 + GRID_SIZE * (TILE_SIZE + TILE_GAP);

  return (
    <div className="space-y-3">
      {/* Status Bar */}
      <div className="flex flex-wrap gap-3 items-center p-2.5 rounded-lg bg-gray-900/80 border border-gray-800 backdrop-blur-sm">
        <div className="text-sm">
          <span className="text-gray-500">Day</span>{" "}
          <span className="font-bold text-white text-lg">{gameState.day}</span>
        </div>
        <div className="h-5 w-px bg-gray-700" />
        <div className="flex items-center gap-1.5 text-sm">
          <span className="text-gray-500">Curse</span>
          <span className="font-bold text-red-400">Lv{gameState.curseLevel}</span>
          <div className="w-20 bg-gray-800 rounded-full h-2 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-red-800 to-red-400 transition-all duration-300"
              style={{ width: `${cursePct}%` }} />
          </div>
          <span className="text-[9px] text-gray-600">{gameState.cursePoints}/{curseMax}</span>
        </div>
        <div className="h-5 w-px bg-gray-700" />
        <div className="flex gap-2 text-sm">
          {(["crystal", "mana", "matter", "flesh"] as const).map((r) => (
            <span key={r} className="flex items-center gap-0.5">
              <span className="text-xs">{RESOURCE_EMOJI[r]}</span>
              <span className="font-mono text-white text-xs">{gameState.resources[r]}</span>
            </span>
          ))}
        </div>
        <div className="h-5 w-px bg-gray-700" />
        <span className="text-xs text-yellow-400">🔥 {gameState.torchCount}</span>
        <div className="ml-auto flex gap-1.5">
          <button
            onClick={() => { setPlacingTorch(!placingTorch); setDragTile(null); }}
            disabled={gameState.torchCount <= 0}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors border ${
              placingTorch
                ? "bg-yellow-800/50 border-yellow-700 text-yellow-200"
                : gameState.torchCount > 0
                  ? "bg-yellow-900/30 border-yellow-900/30 text-yellow-400 hover:bg-yellow-800/40"
                  : "bg-gray-900 border-gray-800 text-gray-600 cursor-not-allowed"
            }`}
          >
            🔥 Torch
          </button>
          <button
            onClick={toggleWalk}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors border ${
              isWalking
                ? "bg-green-800/50 border-green-700 text-green-200 animate-pulse"
                : "bg-green-900/30 border-green-900/30 text-green-400 hover:bg-green-800/40"
            }`}
          >
            {isWalking ? "⏸ Stop" : "🚶 Walk"}
          </button>
          <button onClick={startCombat} className="px-2 py-1 rounded bg-red-900/40 hover:bg-red-800/50 text-red-300 text-xs font-medium transition-colors border border-red-900/30">
            ⚔️ Fight
          </button>
          <button onClick={endDay} className="px-2 py-1 rounded bg-purple-900/40 hover:bg-purple-800/50 text-purple-300 text-xs font-medium transition-colors border border-purple-900/30">
            🌅 End Day
          </button>
          <button onClick={() => {
            setGameState(createInitialState());
            setTileHand(Array.from({ length: 5 }, () => STARTING_TILES[Math.floor(Math.random() * STARTING_TILES.length)]));
            setLog(["Game reset."]); setSelectedTile(null); setDragTile(null); setPlacingTorch(false);
            setPartyLoopIndex(0); setIsWalking(false);
          }} className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-400 text-xs border border-gray-700/50">
            🔄
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[auto_320px] gap-3">
        {/* Map + Hand */}
        <div className="space-y-2">
          <canvas
            ref={canvasRef}
            className="rounded-lg border border-gray-800 cursor-pointer shadow-xl shadow-black/40"
            style={{ width: canvasTotal, height: canvasTotal }}
            onClick={handleCanvasClick}
            onMouseMove={handleCanvasMove}
            onMouseLeave={() => setHoveredTile(null)}
          />

          {/* Tile Hand */}
          <div className="p-2.5 rounded-lg bg-gray-900/80 border border-gray-800">
            <div className="text-[10px] text-gray-500 mb-1.5">
              {placingTorch ? "🔥 Click a discovered blank tile to place torch" : "Click a tile, then click the map to place it"}
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {tileHand.map((tile, i) => {
                const isActive = dragTile === tile && !placingTorch;
                return (
                  <button
                    key={`${tile}-${i}`}
                    onClick={() => { setDragTile(isActive ? null : tile); setPlacingTorch(false); }}
                    className={`w-[60px] h-[60px] rounded-lg border-2 transition-all relative overflow-hidden ${
                      isActive
                        ? "border-yellow-400 scale-110 shadow-lg shadow-yellow-400/30 z-10"
                        : "border-gray-700 hover:border-gray-500 hover:scale-105"
                    }`}
                    style={{ backgroundColor: tileColors[tile] || "#333" }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={getTileImagePath(tile)} alt={tile}
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[8px] font-bold py-0.5 text-center">
                      {tile}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Game Log */}
          <div className="p-2.5 rounded-lg bg-gray-900/80 border border-gray-800">
            <h3 className="text-xs font-semibold text-gray-500 mb-1">📜 Log</h3>
            <div className="max-h-28 overflow-y-auto text-[10px] font-mono space-y-px">
              {log.slice().reverse().map((line, i) => (
                <div key={i} className={
                  line.includes("💀") ? "text-red-400" : line.includes("🔀") ? "text-blue-400" :
                  line.includes("⚠️") ? "text-yellow-400" : line.includes("🌅") ? "text-purple-400" :
                  line.includes("Victory") ? "text-green-400" : line.includes("🔥") ? "text-yellow-300" : "text-gray-500"
                }>{line}</div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="space-y-2">
          {/* Combat Panel */}
          {gameState.combat && (
            <CombatPanel
              combat={gameState.combat}
              onNextRound={advanceCombat}
              onClose={closeCombat}
            />
          )}

          {/* Tab selector */}
          <div className="flex gap-1 text-[10px]">
            {[
              { key: "info" as const, label: "📋 Info" },
              { key: "upgrades" as const, label: "🏪 Upgrades" },
              { key: "merges" as const, label: "🔀 Merges" },
            ].map((tab) => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`px-2 py-1 rounded transition-colors ${
                  activeTab === tab.key ? "bg-gray-700 text-white" : "bg-gray-900 text-gray-500 hover:text-gray-400"
                }`}>{tab.label}</button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === "info" && selectedTile && (() => {
            const tile = gameState.map[selectedTile.y][selectedTile.x];
            if (tile.visibility < TileVisibility.Discovered) return <div className="p-3 rounded-lg bg-gray-900/80 border border-gray-800 text-xs text-gray-600">Fog of war — tile not yet discovered</div>;
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
                    <p className="text-[9px] text-gray-500">
                      ({selectedTile.x},{selectedTile.y})
                      {tile.isLightSource && " 💡 Light source"}
                      {tile.visibility === TileVisibility.Active ? " ✨ Active" : tile.visibility === TileVisibility.Discovered ? " 👁️ Dim" : ""}
                    </p>
                    {tileData?.desc && <p className="text-[9px] text-gray-600 mt-0.5">{tileData.desc}</p>}
                  </div>
                </div>
                {tile.units.length > 0 ? (
                  <div className="space-y-1">
                    {tile.units.map((unit) => {
                      const hpPct = (unit.currentHealth / (unit.maxHealth || 1)) * 100;
                      const ut = getUnitByIdKey(unit.unitTypeId);
                      return (
                        <div key={unit.id} className={`p-1.5 rounded border text-[10px] flex items-center gap-1.5 ${
                          unit.isEnemy ? "border-red-900/30 bg-red-950/10" : "border-green-900/30 bg-green-950/10"
                        }`}>
                          <div className="w-7 h-7 rounded overflow-hidden flex-shrink-0 bg-gray-800">
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
                              <span className="text-gray-600">Lv.{unit.level}</span>
                            </div>
                            <div className="w-full bg-gray-800 rounded-full h-1 mt-0.5">
                              <div className={`h-full rounded-full ${hpPct > 50 ? "bg-green-500" : hpPct > 25 ? "bg-yellow-500" : "bg-red-500"}`}
                                style={{ width: `${hpPct}%` }} />
                            </div>
                            <div className="text-gray-600 mt-0.5">
                              HP {unit.currentHealth}/{unit.maxHealth} | DMG {ut?.minDam ?? "?"}-{ut?.maxDam ?? "?"} | DEF {ut?.defense ?? 0} | SPD {ut?.attackSpeed ?? "?"}ms
                              {(ut?.critChance ?? 0) > 0 && ` | CRIT ${ut?.critChance}%`}
                              {(ut?.healing ?? 0) > 0 && ` | HEAL ${ut?.healing}`}
                              {(ut?.taunt ?? 0) > 0 && ` | TAUNT ${ut?.taunt}%`}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : <p className="text-[10px] text-gray-600">No units on this tile</p>}
              </div>
            );
          })()}

          {activeTab === "info" && !selectedTile && (
            <div className="p-3 rounded-lg bg-gray-900/80 border border-gray-800 text-xs text-gray-600">
              Click a tile on the map to see details
            </div>
          )}

          {activeTab === "upgrades" && (
            <UpgradeShop
              upgrades={gameState.upgrades}
              resources={gameState.resources}
              onBuy={buyUpgrade}
            />
          )}

          {activeTab === "merges" && (
            <div className="p-3 rounded-lg bg-gray-900/80 border border-gray-800">
              <h3 className="text-sm font-semibold text-gray-400 mb-2">🔀 Merge Recipes</h3>
              <p className="text-[9px] text-gray-600 mb-2">Place 3 of the same tile adjacent → they merge into a stronger tile!</p>
              <div className="grid grid-cols-1 gap-0.5 text-[10px] max-h-52 overflow-y-auto">
                {mergeTypes.filter((m) => m.firstTileTypeId !== "0").map((m, i) => (
                  <div key={i} className="flex items-center gap-1 text-gray-500">
                    <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: tileColors[m.firstTileTypeId] || "#555" }} />
                    <span>{m.firstTileTypeId}</span>
                    <span className="text-gray-700">×3 →</span>
                    <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: tileColors[m.outputTileTypeId] || "#555" }} />
                    <span className="text-white font-medium">{m.outputTileTypeId}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mana Types */}
          <div className="p-2.5 rounded-lg bg-gray-900/80 border border-gray-800">
            <h3 className="text-[10px] font-semibold text-gray-500 mb-1.5">🔮 Mana Types</h3>
            <div className="flex flex-wrap gap-1.5">
              {manaTypes.map((m) => (
                <span key={m.idKey} className="px-1.5 py-0.5 rounded text-[9px] border border-gray-700 flex items-center gap-1"
                  style={{ borderColor: m.color + "40", backgroundColor: m.color + "10" }}>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                  <span style={{ color: m.color }}>{m.name}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
