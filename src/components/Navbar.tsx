import React from 'react';
import { PlayerCharacter } from '../types/game';

export type NavTab = 'HAVEN' | 'WORLD' | 'INVENTORY' | 'CHARACTER' | 'LOG';

interface NavbarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  player: PlayerCharacter;
  inCombat?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onSelectTab, player, inCombat }) => {
  const isLocked = Boolean(inCombat && currentTab !== 'HAVEN');

  const tabs: { id: NavTab; label: string; icon: string; badge?: number; desc: string }[] = [
    { id: 'HAVEN', label: 'Haven', icon: '🏰', desc: 'Town Hub & Safe Rest' },
    { id: 'WORLD', label: 'World / Hunt', icon: '🌌', desc: 'Exploration & Combat', badge: player.bounties.filter((b) => b.isCompleted && !b.isClaimed).length },
    { id: 'INVENTORY', label: 'Inventory', icon: '🎒', desc: 'Gear & Paper Doll' },
    { id: 'CHARACTER', label: 'Character', icon: '👤', desc: 'Stats & AP Allocation', badge: player.availableAP > 0 ? player.availableAP : undefined },
    { id: 'LOG', label: 'Log & Chat', icon: '📜', desc: 'Social & Combat Logs' },
  ];

  const handleTabClick = (tabId: NavTab) => {
    if (isLocked) {
      alert('🔒 Combat in Progress! Finish your turn, resolve the battle, or select [Flee] before switching tabs.');
      return;
    }
    onSelectTab(tabId);
  };

  return (
    <nav className="bg-zinc-950 border-t border-zinc-800 text-amber-100 select-none z-50 relative">
      {/* Strict Combat Lock Barrier Overlay */}
      {isLocked && (
        <div className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md z-50 flex items-center justify-center px-4 py-1.5 text-center border-t border-red-600/80 shadow-2xl">
          <div className="flex items-center space-x-2 text-red-400 font-mono text-xs font-bold animate-pulse">
            <span>🔒</span>
            <span>COMBAT LOCKED — SELECT [ 5. FLEE ] OR DEFEAT ENEMY TO LEAVE BATTLE</span>
          </div>
        </div>
      )}
      {/* Desktop & Tablet Navigation Bar */}
      <div className="hidden md:flex items-center justify-around max-w-7xl mx-auto px-4 py-2 font-mono text-xs">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              disabled={isLocked}
              className={`px-4 py-2 rounded-xl flex items-center space-x-2 transition-all relative ${
                isLocked
                  ? 'opacity-40 cursor-not-allowed text-zinc-500 bg-zinc-900/50'
                  : isActive
                  ? 'bg-amber-600 text-zinc-950 font-bold shadow-lg ring-1 ring-amber-400 scale-105'
                  : 'text-zinc-400 hover:text-amber-200 hover:bg-zinc-900'
              }`}
            >
              <span className="text-base">{tab.icon}</span>
              <div className="text-left leading-tight">
                <div className="font-bold">{tab.label}</div>
                <div className="text-[9px] opacity-70 font-sans hidden lg:block">{tab.desc}</div>
              </div>

              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full ml-1">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Mobile Sticky Bottom Navigation Pad */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-zinc-950/95 backdrop-blur-lg border-t border-amber-900/40 px-2 py-1.5 flex justify-around items-center z-50">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              disabled={inCombat}
              className={`flex flex-col items-center justify-center p-1.5 rounded-lg transition-all min-w-[56px] relative ${
                inCombat
                  ? 'opacity-40 cursor-not-allowed text-zinc-600'
                  : isActive
                  ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                  : 'text-zinc-400 active:scale-95'
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              <span className="text-[9px] font-mono mt-0.5">{tab.label}</span>

              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
