"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

const GameView = dynamic(() => import("@/components/game/GameView"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[600px] bg-gray-900 rounded-lg border border-gray-800">
      <div className="text-gray-400 animate-pulse">Loading game engine...</div>
    </div>
  ),
});

export default function PrototypePage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-500 hover:text-gray-300 transition-colors text-sm">← Home</Link>
            <div className="w-px h-5 bg-gray-700" />
            <h1 className="text-lg font-semibold bg-gradient-to-r from-purple-400 to-red-400 bg-clip-text text-transparent">
              Prototype Preview 01
            </h1>
            <span className="text-[10px] bg-red-900/30 text-red-400 px-1.5 py-0.5 rounded font-mono pulse-curse">
              PROTOTYPE
            </span>
          </div>
          <Link
            href="/dev/console"
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            Open Console →
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <GameView />
      </div>
    </div>
  );
}
