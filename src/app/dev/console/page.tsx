"use client";

import { useState } from "react";
import { unitTypes, mergeTypes, upgradeTypes, curseData, tileColors } from "@/lib/genrpg";
import { StatTypeNames, EntityTypes } from "@/lib/genrpg";
import type { UnitType, MergeType, UpgradeType, CurseLevel } from "@/lib/genrpg";
import Link from "next/link";

type Tab = "units" | "tiles" | "merges" | "upgrades" | "curses" | "overview";

function StatBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-24 text-gray-400 truncate">{label}</span>
      <div className="flex-1 bg-gray-800 rounded-full h-2 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="w-10 text-right font-mono text-gray-300">{value}</span>
    </div>
  );
}

function UnitCard({ unit }: { unit: UnitType }) {
  const isAlly = ["Warrior", "Cleric", "Knight", "Ranger"].includes(unit.name);
  const isBoss = unit.isBoss;
  const borderColor = isBoss ? "border-red-500/50" : isAlly ? "border-green-500/30" : "border-gray-700";
  
  return (
    <div className={`rounded-lg border ${borderColor} bg-gray-900/80 p-4 hover:bg-gray-900 transition-colors`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-white">{unit.name || `Unit #${unit.idKey}`}</h3>
          <p className="text-xs text-gray-500">{unit.desc || "No description"}</p>
        </div>
        <div className="flex gap-1">
          {isBoss && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-900/50 text-red-300">BOSS</span>}
          {isAlly && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-900/50 text-green-300">ALLY</span>}
          {!isAlly && !isBoss && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-700 text-gray-300">ENEMY</span>}
        </div>
      </div>
      <div className="space-y-1.5">
        <StatBar label="Health" value={unit.maxHealth} max={1200} color="#22c55e" />
        <StatBar label="Damage" value={unit.maxDam} max={30} color="#ef4444" />
        <StatBar label="Min Dam" value={unit.minDam} max={15} color="#f97316" />
        <StatBar label="Evasion" value={unit.evasion} max={15} color="#3b82f6" />
        <StatBar label="Atk Speed" value={unit.attackSpeed} max={3000} color="#a855f7" />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] text-gray-500">
        {unit.critChance > 0 && <span>Crit: {unit.critChance}%</span>}
        {unit.healing > 0 && <span>Heal: {unit.healing}</span>}
        {unit.leadership > 0 && <span>Lead: {unit.leadership}</span>}
        {unit.combatRow && unit.combatRow !== "0" && <span>Row: {unit.combatRow}</span>}
        {unit.attackFX && <span>FX: {unit.attackFX}</span>}
        {unit.maxQuantityOnMap > 0 && <span>Max: {unit.maxQuantityOnMap}</span>}
      </div>
    </div>
  );
}

function TileGrid() {
  const tiles = Object.entries(tileColors);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {tiles.map(([name, color]) => (
        <div key={name} className="rounded-lg border border-gray-700 bg-gray-900/80 p-3 hover:bg-gray-900 transition-colors">
          <div
            className="w-full h-16 rounded-md mb-2 border border-gray-600"
            style={{ backgroundColor: color }}
          />
          <p className="text-sm font-medium text-white">{name}</p>
          <p className="text-[10px] font-mono text-gray-500">{color}</p>
        </div>
      ))}
    </div>
  );
}

function MergeTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800">
            <th className="text-left py-2 px-3 text-gray-400 font-medium">Input 1</th>
            <th className="text-center py-2 px-3 text-gray-400 font-medium">+</th>
            <th className="text-left py-2 px-3 text-gray-400 font-medium">Input 2</th>
            <th className="text-center py-2 px-3 text-gray-400 font-medium">+</th>
            <th className="text-left py-2 px-3 text-gray-400 font-medium">Input 3</th>
            <th className="text-center py-2 px-3 text-gray-400 font-medium">→</th>
            <th className="text-left py-2 px-3 text-gray-400 font-medium">Output</th>
          </tr>
        </thead>
        <tbody>
          {mergeTypes.map((merge) => (
            <tr key={merge.id} className="border-b border-gray-800/50 hover:bg-gray-900/50">
              <td className="py-2 px-3">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: tileColors[merge.firstTileTypeId] || "#666" }} />
                  {merge.firstTileTypeId}
                </span>
              </td>
              <td className="text-center text-gray-600">+</td>
              <td className="py-2 px-3">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: tileColors[merge.secondTileTypeId] || "#666" }} />
                  {merge.secondTileTypeId}
                </span>
              </td>
              <td className="text-center text-gray-600">+</td>
              <td className="py-2 px-3">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: tileColors[merge.thirdTileTypeId] || "#666" }} />
                  {merge.thirdTileTypeId}
                </span>
              </td>
              <td className="text-center text-gray-500">→</td>
              <td className="py-2 px-3 font-semibold">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: tileColors[merge.outputTileTypeId] || "#666" }} />
                  <span className="text-white">{merge.outputTileTypeId}</span>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UpgradeTree() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {upgradeTypes.map((upgrade) => {
        const prereqNames = upgrade.prereqs
          .filter(p => p > 0)
          .map(p => upgradeTypes.find(u => u.idKey === p)?.name || `#${p}`);
        return (
          <div key={upgrade.idKey} className="rounded-lg border border-gray-700 bg-gray-900/80 p-4 hover:bg-gray-900 transition-colors">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-white">{upgrade.name}</h3>
              <span className="text-xs bg-purple-900/50 text-purple-300 px-1.5 py-0.5 rounded">
                Max T{upgrade.maxTier}
              </span>
            </div>
            <p className="text-xs text-gray-400 mb-3">{upgrade.desc}</p>
            <div className="flex gap-3 text-[10px] mb-2">
              <span className="text-blue-300">💎 {upgrade.costs.crystal}</span>
              <span className="text-purple-300">🔮 {upgrade.costs.mana}</span>
              <span className="text-amber-300">⚙️ {upgrade.costs.matter}</span>
              <span className="text-red-300">🩸 {upgrade.costs.flesh}</span>
            </div>
            {prereqNames.length > 0 && (
              <div className="text-[10px] text-gray-500">
                Requires: {prereqNames.join(", ")}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CurseTimeline() {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-red-900/30 bg-red-950/20 p-4">
        <h3 className="text-red-400 font-semibold mb-2">Curse Settings</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div><span className="text-gray-500">Base Points:</span> <span className="text-white">{curseData.settings.basePointsNeeded}</span></div>
          <div><span className="text-gray-500">Per Kill:</span> <span className="text-white">{curseData.settings.pointsPerKill}</span></div>
          <div><span className="text-gray-500">Per Tile:</span> <span className="text-white">{curseData.settings.pointsPerTilePlaced}</span></div>
          <div><span className="text-gray-500">Per Day:</span> <span className="text-white">{curseData.settings.pointsPerDay}</span></div>
        </div>
      </div>
      <div className="space-y-2">
        {curseData.levels.map((level) => (
          <div key={level.level} className="flex items-center gap-4 rounded-lg border border-gray-800 bg-gray-900/50 p-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-900/30 border border-red-800/50 flex items-center justify-center">
              <span className="text-red-400 font-bold text-sm">{level.level}</span>
            </div>
            <div className="flex-1">
              <div className="text-xs text-gray-500">Points needed: {level.pointsNeeded}</div>
              <div className="text-sm text-gray-300">
                {level.effects.map((e, i) => {
                  if (e.entityTypeId === 47) return <span key={i}>Places {e.minQuantity}x enemy tile on map</span>;
                  if (e.entityTypeId === 4) return <span key={i} className="text-red-400 font-semibold">⚠️ Spawns Cursed Spirit!</span>;
                  return <span key={i}>Effect: type {e.entityTypeId}, id {e.entityId}</span>;
                })}
              </div>
            </div>
            <div className="flex-shrink-0">
              <div className="w-24 bg-gray-800 rounded-full h-2">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-400"
                  style={{ width: `${(level.pointsNeeded / 60) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OverviewStats() {
  const allyUnits = unitTypes.filter(u => ["Warrior", "Cleric", "Knight", "Ranger"].includes(u.name));
  const enemyUnits = unitTypes.filter(u => !["Warrior", "Cleric", "Knight", "Ranger"].includes(u.name));
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Unit Types", value: unitTypes.length, color: "text-green-400" },
          { label: "Merge Recipes", value: mergeTypes.length, color: "text-blue-400" },
          { label: "Upgrades", value: upgradeTypes.length, color: "text-purple-400" },
          { label: "Curse Levels", value: curseData.levels.length, color: "text-red-400" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-gray-800 bg-gray-900/50 p-4 text-center">
            <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
          <h3 className="text-sm font-semibold text-green-400 mb-2">Ally Units ({allyUnits.length})</h3>
          <div className="space-y-1 text-xs">
            {allyUnits.map(u => (
              <div key={u.idKey} className="flex justify-between text-gray-300">
                <span>{u.name}</span>
                <span className="text-gray-500">HP:{u.maxHealth} DMG:{u.minDam}-{u.maxDam}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
          <h3 className="text-sm font-semibold text-red-400 mb-2">Enemy Units ({enemyUnits.length})</h3>
          <div className="space-y-1 text-xs">
            {enemyUnits.map(u => (
              <div key={u.idKey} className="flex justify-between text-gray-300">
                <span>{u.name || `Unit #${u.idKey}`}</span>
                <span className="text-gray-500">HP:{u.maxHealth} DMG:{u.minDam}-{u.maxDam}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
        <h3 className="text-sm font-semibold text-blue-400 mb-3">Tile Biomes ({Object.keys(tileColors).length})</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(tileColors).map(([name, color]) => (
            <span key={name} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-800 text-xs text-gray-300">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
              {name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ConsolePage() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "units", label: "Units", icon: "⚔️" },
    { id: "tiles", label: "Tiles", icon: "🗺️" },
    { id: "merges", label: "Merges", icon: "🔀" },
    { id: "upgrades", label: "Upgrades", icon: "⬆️" },
    { id: "curses", label: "Curses", icon: "💀" },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-500 hover:text-gray-300 transition-colors text-sm">← Home</Link>
            <div className="w-px h-5 bg-gray-700" />
            <h1 className="text-lg font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Data Console
            </h1>
            <span className="text-[10px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded font-mono">
              GenRPG master
            </span>
          </div>
          <Link
            href="/dev/prototype/preview01"
            className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
          >
            Open Prototype →
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-gray-800 text-white border border-gray-700"
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-900"
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div>
          {activeTab === "overview" && <OverviewStats />}
          {activeTab === "units" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {unitTypes.map((unit) => (
                <UnitCard key={unit.idKey} unit={unit} />
              ))}
            </div>
          )}
          {activeTab === "tiles" && <TileGrid />}
          {activeTab === "merges" && <MergeTable />}
          {activeTab === "upgrades" && <UpgradeTree />}
          {activeTab === "curses" && <CurseTimeline />}
        </div>
      </div>
    </div>
  );
}
