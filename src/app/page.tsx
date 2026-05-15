import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl text-center space-y-8">
        <div className="space-y-2">
          <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-red-500 via-purple-500 to-blue-500 bg-clip-text text-transparent">
            Cursebound
          </h1>
          <p className="text-gray-400 text-lg">Development Tools</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
          <Link
            href="/dev/prototype/preview01"
            className="group block p-6 rounded-xl border border-gray-800 bg-gray-900/50 hover:bg-gray-900 hover:border-purple-500/50 transition-all duration-300"
          >
            <div className="text-3xl mb-3">🎮</div>
            <h2 className="text-xl font-semibold text-white group-hover:text-purple-400 transition-colors">
              Web Prototype
            </h2>
            <p className="text-gray-400 text-sm mt-2">
              Playable prototype with GenRPG data structures. Test tile placement, merging, combat, and curse mechanics.
            </p>
            <div className="mt-3 text-xs text-gray-500 font-mono">
              /dev/prototype/preview01
            </div>
          </Link>

          <Link
            href="/dev/console"
            className="group block p-6 rounded-xl border border-gray-800 bg-gray-900/50 hover:bg-gray-900 hover:border-blue-500/50 transition-all duration-300"
          >
            <div className="text-3xl mb-3">🛠️</div>
            <h2 className="text-xl font-semibold text-white group-hover:text-blue-400 transition-colors">
              Data Console
            </h2>
            <p className="text-gray-400 text-sm mt-2">
              Browse and edit game data — units, tiles, merges, upgrades, curses. CSV-compatible with the Unity project.
            </p>
            <div className="mt-3 text-xs text-gray-500 font-mono">
              /dev/console
            </div>
          </Link>
        </div>

        <div className="pt-8 text-xs text-gray-600">
          Cursebound © MetaSin Games · GenRPG data synced from{" "}
          <code className="text-gray-500">LukeLit/CB master</code>
        </div>
      </div>
    </div>
  );
}
