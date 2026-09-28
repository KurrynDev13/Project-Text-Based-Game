import React from 'react';
import { PlayerCharacter, GameLocation } from '../types/game';
import { GAME_LOCATIONS } from '../data/equipmentData';

interface LocationSelectorProps {
  player: PlayerCharacter;
  onSelectLocation: (location: GameLocation) => void;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({ player, onSelectLocation }) => {
  return (
    <div className="flex flex-col h-full bg-zinc-950 text-amber-100 p-4 md:p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="bg-zinc-900 border border-amber-900/50 rounded-xl p-5 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="text-xs font-mono uppercase text-amber-500 tracking-wider">Titan Galaxy Starmap</div>
          <h2 className="text-2xl md:text-3xl font-bold font-serif text-amber-200">Sector Locations</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Earn Location Points (LP) by defeating Titans to unlock new planets and high-tier sectors!
          </p>
        </div>
        <div className="bg-zinc-950 px-4 py-2 rounded-lg border border-zinc-800 text-xs font-mono">
          Location Points (LP): <span className="text-amber-400 font-bold text-sm">{player.locationPoints} LP</span>
        </div>
      </div>

      {/* Locations List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {GAME_LOCATIONS.map((loc) => {
          const isUnlocked = player.locationPoints >= loc.lpRequired && player.level >= loc.minLevel;
          const isCurrent = player.currentLocationId === loc.id;

          return (
            <div
              key={loc.id}
              className={`border rounded-xl p-5 flex flex-col justify-between space-y-4 shadow-lg bg-gradient-to-br ${loc.bgGradient} ${
                isCurrent
                  ? 'border-amber-400 ring-2 ring-amber-500/50'
                  : isUnlocked
                  ? 'border-zinc-700 hover:border-amber-600/70'
                  : 'border-zinc-800 opacity-60'
              }`}
            >
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400">{loc.subtitle}</span>
                    <h3 className="text-xl font-bold font-serif text-white">{loc.name}</h3>
                  </div>
                  {isCurrent && (
                    <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase">
                      Active Sector
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-300 mt-2 line-clamp-3">{loc.description}</p>
              </div>

              <div className="border-t border-zinc-800/80 pt-3 flex flex-col space-y-2">
                <div className="flex justify-between text-xs font-mono text-zinc-400">
                  <span>Req. Level: <strong className="text-amber-200">{loc.minLevel}</strong></span>
                  <span>Req. LP: <strong className="text-amber-200">{loc.lpRequired} LP</strong></span>
                </div>

                <button
                  onClick={() => onSelectLocation(loc)}
                  disabled={!isUnlocked || isCurrent}
                  className={`w-full py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider font-mono transition-all ${
                    isCurrent
                      ? 'bg-zinc-800 text-zinc-500 cursor-default'
                      : isUnlocked
                      ? 'bg-amber-600 hover:bg-amber-500 text-zinc-950 shadow-md active:scale-95'
                      : 'bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed'
                  }`}
                >
                  {isCurrent ? 'Current Location' : isUnlocked ? 'Deploy to Sector' : 'Sector Locked'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
