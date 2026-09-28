import React, { useState } from 'react';
import { PlayerCharacter, BattleLogEntry } from '../types/game';
import { JournalView } from './JournalView';
import { RoadmapView } from './RoadmapView';

interface GameLogViewProps {
  player: PlayerCharacter;
  battleLogs: BattleLogEntry[];
  onUpdatePlayer: (updated: PlayerCharacter) => void;
}

export const GameLogView: React.FC<GameLogViewProps> = ({ player, battleLogs, onUpdatePlayer }) => {
  const [activeSubTab, setActiveSubTab] = useState<'JOURNAL' | 'CHAT' | 'COMBAT_LOG' | 'ROADMAP'>('JOURNAL');
  const [chatInput, setChatInput] = useState('');
  const [messages, setChatMessages] = useState<Array<{ sender: string; text: string; time: string }>>([
    { sender: 'System', text: 'Welcome Wayfarer! Global chat channel established across Aethelgard.', time: '08:00' },
    { sender: 'Vanguard_Kael', text: 'Group forming for Act III Ignis Wyrm fight at Anchor Gate!', time: '08:02' },
    { sender: 'Arcane_Elena', text: 'Just rerolled a Fiery Runed Spellthread Gown with 2 PS! Huge magic bonus.', time: '08:05' },
  ]);

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatMessages((prev) => [...prev, { sender: player.name, text: chatInput.trim(), time }]);
    setChatInput('');
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-amber-100 p-3 md:p-6 space-y-4 overflow-y-auto">
      {/* Log & Social Header */}
      <div className="bg-zinc-900 border border-amber-900/50 rounded-xl p-4 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <div className="text-[10px] font-mono text-amber-500 uppercase tracking-widest font-semibold">LOG & JOURNAL CENTER</div>
          <h2 className="text-2xl font-bold font-serif text-amber-200">Journal, Chat & History</h2>
        </div>

        <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800 text-xs font-mono flex-wrap gap-1">
          <button
            onClick={() => setActiveSubTab('JOURNAL')}
            className={`px-3 py-1.5 rounded transition-all ${activeSubTab === 'JOURNAL' ? 'bg-amber-600 text-zinc-950 font-bold' : 'text-zinc-400'}`}
          >
            📜 Quest Journal
          </button>
          <button
            onClick={() => setActiveSubTab('CHAT')}
            className={`px-3 py-1.5 rounded transition-all ${activeSubTab === 'CHAT' ? 'bg-amber-600 text-zinc-950 font-bold' : 'text-zinc-400'}`}
          >
            💬 Global Chat
          </button>
          <button
            onClick={() => setActiveSubTab('COMBAT_LOG')}
            className={`px-3 py-1.5 rounded transition-all ${activeSubTab === 'COMBAT_LOG' ? 'bg-amber-600 text-zinc-950 font-bold' : 'text-zinc-400'}`}
          >
            ⚔️ Combat History
          </button>
          <button
            onClick={() => setActiveSubTab('ROADMAP')}
            className={`px-3 py-1.5 rounded transition-all ${activeSubTab === 'ROADMAP' ? 'bg-amber-600 text-zinc-950 font-bold' : 'text-zinc-400'}`}
          >
            📋 QA Roadmap
          </button>
        </div>
      </div>

      {/* SubTab Content */}
      <div className="flex-1 bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 shadow-xl flex flex-col justify-between min-h-[300px]">
        {activeSubTab === 'JOURNAL' && (
          <JournalView player={player} onUpdatePlayer={onUpdatePlayer} />
        )}

        {activeSubTab === 'CHAT' && (
          <div className="flex flex-col h-full justify-between space-y-3">
            <div className="space-y-2 overflow-y-auto max-h-72 pr-1 font-mono text-xs">
              {messages.map((m, idx) => (
                <div key={idx} className="bg-zinc-950 p-2 rounded border border-zinc-800/80 flex justify-between">
                  <div>
                    <strong className="text-amber-300">{m.sender}: </strong>
                    <span className="text-zinc-200">{m.text}</span>
                  </div>
                  <span className="text-[10px] text-zinc-500">{m.time}</span>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendChat} className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type global chat message..."
                className="flex-1 bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                className="bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold px-4 py-2 rounded text-xs font-mono uppercase"
              >
                Send
              </button>
            </form>
          </div>
        )}

        {activeSubTab === 'COMBAT_LOG' && (
          <div className="space-y-2 overflow-y-auto max-h-80 font-mono text-xs">
            {battleLogs.length === 0 ? (
              <p className="text-zinc-500 italic text-center py-8">No recent combat logs recorded.</p>
            ) : (
              battleLogs.map((log) => (
                <div key={log.id} className="bg-zinc-950 p-2 rounded border border-zinc-800 text-zinc-300">
                  <span className="text-[10px] text-amber-500 font-bold mr-2">[Turn {log.turn}]</span>
                  {log.text}
                </div>
              ))
            )}
          </div>
        )}

        {activeSubTab === 'ROADMAP' && <RoadmapView />}
      </div>
    </div>
  );
};
