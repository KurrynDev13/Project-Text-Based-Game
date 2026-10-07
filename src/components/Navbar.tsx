import React from 'react';
import { PlayerCharacter } from '../types/game';

export type NavTab = 'HAVEN' | 'WORLD' | 'INVENTORY' | 'CHARACTER' | 'LOG';

interface NavbarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  player: PlayerCharacter;
  inCombat?: boolean;
  isRaidBattle?: boolean;
  onShowToast?: (message: string, type?: 'info' | 'success' | 'warning' | 'error', icon?: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onSelectTab, player, inCombat, isRaidBattle, onShowToast }) => {
  const isLocked = Boolean(isRaidBattle || (inCombat && currentTab !== 'HAVEN'));

  const completedBountiesCount = player.bounties.filter((b) => b.isCompleted && !b.isClaimed).length;
  const encryptedMemoriesCount = (player.encryptedMemories || []).length;

  const tabs: {
    id: NavTab;
    baybayin: string;
    label: string;
    icon: string;
    badge?: number;
    desc: string;
  }[] = [
    {
      id: 'HAVEN',
      baybayin: 'ᜎᜓᜅ᜔ᜐᜓᜇ᜔',
      label: 'Haven',
      icon: '🏰',
      desc: 'Safe Zone & Trading',
    },
    {
      id: 'WORLD',
      baybayin: 'ᜇᜒᜄ᜔ᜋ',
      label: 'World',
      icon: '🌌',
      desc: 'Hunting & Exploration',
    },
    {
      id: 'INVENTORY',
      baybayin: 'ᜐᜓᜎᜓᜆ᜔',
      label: 'Inventory',
      icon: '🎒',
      desc: 'Gear & Paper Doll',
      badge: encryptedMemoriesCount > 0 ? encryptedMemoriesCount : undefined,
    },
    {
      id: 'CHARACTER',
      baybayin: 'ᜊᜌᜈᜒ',
      label: 'Hero',
      icon: '👤',
      desc: 'Stats & Skill Tree',
      badge: player.availableAP > 0 ? player.availableAP : undefined,
    },
    {
      id: 'LOG',
      baybayin: 'ᜆᜎ',
      label: 'Log',
      icon: '📜',
      desc: 'Journal & Chat',
      badge: completedBountiesCount > 0 ? completedBountiesCount : undefined,
    },
  ];

  const handleTabClick = (tabId: NavTab) => {
    if (isLocked) {
      onShowToast?.(
        isRaidBattle
          ? '🔒 Raid Combat in Progress! Complete the 10-turn attempt or click [Disengage] before switching views.'
          : '🔒 Combat in Progress! Finish your turn, resolve battle, or select [Flee] before switching tabs.',
        'warning',
        '🔒'
      );
      return;
    }
    onSelectTab(tabId);
  };

  return (
    <nav
      data-tutorial-target="navbar-bottom"
      className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-zinc-950/65 to-zinc-950/25 backdrop-blur-md border-t border-amber-500/30 text-amber-100 select-none z-30 shadow-[0_-5px_20px_rgba(0,0,0,0.8)]"
    >
      {/* Strict Combat Lock Barrier Overlay */}
      {isLocked && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md z-30 flex items-center justify-center px-4 py-1.5 text-center border-t border-red-600/80 shadow-2xl">
          <div className="flex items-center space-x-2 text-red-400 font-mono text-xs font-bold animate-pulse">
            <span>🔒</span>
            <span>
              {isRaidBattle
                ? 'CELESTIAL RAID IN PROGRESS — COMPLETE 10-TURN ATTEMPT OR DISENGAGE'
                : 'COMBAT LOCKED — SELECT [ 5. FLEE ] OR DEFEAT ENEMY TO LEAVE BATTLE'}
            </span>
          </div>
        </div>
      )}

      {/* Desktop & Tablet Navigation Bar */}
      <div className="hidden md:flex items-center justify-around max-w-7xl mx-auto px-4 py-1.5 font-mono text-xs">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              data-tutorial-target={`nav-tab-${tab.id.toLowerCase()}`}
              onClick={() => handleTabClick(tab.id)}
              disabled={isLocked}
              className={`px-4 py-2 rounded-xl flex items-center space-x-2.5 transition-all relative cursor-pointer active:scale-[0.96] ${
                isLocked
                  ? 'opacity-40 cursor-not-allowed text-zinc-500 bg-zinc-900/50'
                  : isActive
                  ? 'bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-zinc-950 font-bold shadow-[0_0_15px_rgba(245,158,11,0.35)] ring-1 ring-amber-300 scale-105'
                  : 'text-zinc-400 hover:text-amber-200 hover:bg-zinc-900/60'
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              <div className="text-left leading-tight">
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs font-bold ${isActive ? 'text-zinc-950' : 'text-amber-300'}`}>
                    {tab.baybayin}
                  </span>
                  <span className={`text-[11px] ${isActive ? 'text-zinc-900 font-bold' : 'text-zinc-300'}`}>
                    {tab.label}
                  </span>
                </div>
                <div className={`text-[8.5px] font-sans hidden lg:block ${isActive ? 'text-zinc-900/80' : 'text-zinc-500'}`}>
                  {tab.desc}
                </div>
              </div>

              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="bg-red-600 text-white text-[9.5px] font-bold px-1.5 py-0.2 rounded-full ml-1 shadow-sm">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Mobile Sticky Bottom Navigation Pad */}
      <div className="md:hidden w-full px-1.5 py-1 grid grid-cols-5 gap-1 items-center">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              data-tutorial-target={`nav-tab-${tab.id.toLowerCase()}`}
              onClick={() => handleTabClick(tab.id)}
              disabled={isLocked}
              className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all min-h-[46px] relative cursor-pointer active:scale-[0.96] ${
                isLocked
                  ? 'opacity-40 cursor-not-allowed text-zinc-600'
                  : isActive
                  ? 'bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-zinc-950 font-bold shadow-[0_0_12px_rgba(245,158,11,0.35)] ring-1 ring-amber-300'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <div className="flex items-center gap-0.5 leading-none">
                <span className="text-sm">{tab.icon}</span>
                <span className={`text-[10px] font-bold ${isActive ? 'text-zinc-950' : 'text-amber-300'}`}>
                  {tab.baybayin}
                </span>
              </div>
              <span className={`text-[8px] font-mono uppercase tracking-tighter mt-0.5 leading-tight ${isActive ? 'text-zinc-900/90 font-bold' : 'text-zinc-500'}`}>
                {tab.label}
              </span>

              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="absolute -top-1 -right-0.5 bg-red-600 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-md">
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

