import React, { useState, useEffect, useRef } from 'react';
import { PlayerCharacter, BattleLogEntry } from '../types/game';
import { JournalView } from './JournalView';
import { isSupabaseConfigured, fetchGlobalChatMessages, sendGlobalChatMessage } from '../utils/supabase';

interface GameLogViewProps {
  player: PlayerCharacter;
  battleLogs: BattleLogEntry[];
  onUpdatePlayer: (updated: PlayerCharacter) => void;
  onShowToast?: (message: string, type?: 'info' | 'success' | 'warning' | 'error', icon?: string) => void;
}

export const GameLogView: React.FC<GameLogViewProps> = ({ player, battleLogs, onUpdatePlayer, onShowToast }) => {
  const [activeSubTab, setActiveSubTab] = useState<'JOURNAL' | 'CHAT' | 'COMBAT_LOG'>('JOURNAL');
  const [chatInput, setChatInput] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [messages, setChatMessages] = useState<Array<{ sender: string; text: string; time: string }>>([
    { sender: 'System', text: 'Welcome Wayfarer! Global chat channel established across Aethelgard.', time: '08:00' },
    { sender: 'Vanguard_Kael', text: 'Group forming for Act III Ignis Wyrm fight at Anchor Gate!', time: '08:02' },
    { sender: 'Arcane_Elena', text: 'Just rerolled a Fiery Runed Spellthread Gown with 2 PS! Huge magic bonus.', time: '08:05' },
  ]);

  // Auto-scroll chat container to the latest message
  useEffect(() => {
    if (activeSubTab === 'CHAT' && chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, activeSubTab]);

  useEffect(() => {
    let isMounted = true;
    const loadChat = async () => {
      const remote = await fetchGlobalChatMessages();
      if (remote && isMounted && remote.length > 0) {
        setChatMessages(remote);
      }
    };
    loadChat();
    const interval = setInterval(loadChat, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const textToSend = chatInput.trim();
    const formattedSender = `${player.name} [Lv. ${player.level} ${player.heroClass || 'Wayfarer'}]`;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatMessages((prev) => [...prev, { sender: formattedSender, text: textToSend, time }]);
    setChatInput('');

    if (isSupabaseConfigured) {
      await sendGlobalChatMessage(formattedSender, textToSend);
      const remote = await fetchGlobalChatMessages();
      if (remote && remote.length > 0) setChatMessages(remote);
    }
  };

  const displayCombatLogs = (player.persistentCombatLogs && player.persistentCombatLogs.length > 0)
    ? player.persistentCombatLogs
    : battleLogs;

  return (
    <div className="flex flex-col h-full w-full max-w-full min-w-0 overflow-x-hidden bg-zinc-950 text-amber-100 p-2 sm:p-4 md:p-6 space-y-3 md:space-y-4">
      {/* Log & Social Header */}
      <div className="bg-zinc-900 border border-amber-900/50 rounded-xl p-3 md:p-4 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3 w-full min-w-0">
        <div>
          <div className="text-[10px] font-mono text-amber-500 uppercase tracking-widest font-semibold">LOG & JOURNAL CENTER</div>
          <h2 className="text-xl md:text-2xl font-bold font-serif text-amber-200">Journal, Chat & History</h2>
        </div>

        <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800 text-xs font-mono flex-wrap gap-1 w-full md:w-auto">
          <button
            onClick={() => setActiveSubTab('JOURNAL')}
            className={`flex-1 md:flex-initial px-3 py-1.5 rounded transition-all text-center ${activeSubTab === 'JOURNAL' ? 'bg-amber-600 text-zinc-950 font-bold' : 'text-zinc-400'}`}
          >
            📜 Quest Journal
          </button>
          <button
            onClick={() => setActiveSubTab('CHAT')}
            className={`flex-1 md:flex-initial px-3 py-1.5 rounded transition-all text-center ${activeSubTab === 'CHAT' ? 'bg-amber-600 text-zinc-950 font-bold' : 'text-zinc-400'}`}
          >
            💬 Global Chat
          </button>
          <button
            onClick={() => setActiveSubTab('COMBAT_LOG')}
            className={`flex-1 md:flex-initial px-3 py-1.5 rounded transition-all text-center ${activeSubTab === 'COMBAT_LOG' ? 'bg-amber-600 text-zinc-950 font-bold' : 'text-zinc-400'}`}
          >
            ⚔️ Combat History
          </button>
        </div>
      </div>

      {/* SubTab Content */}
      <div className="flex-1 bg-zinc-900/80 border border-zinc-800 rounded-xl p-2.5 sm:p-4 shadow-xl flex flex-col justify-between w-full min-w-0 max-w-full overflow-hidden">
        {activeSubTab === 'JOURNAL' && (
          <div className="w-full min-w-0 max-w-full overflow-x-hidden">
            <JournalView player={player} onUpdatePlayer={onUpdatePlayer} onShowToast={onShowToast} />
          </div>
        )}

        {activeSubTab === 'CHAT' && (
          <div className="flex flex-col h-full justify-between space-y-3 w-full min-w-0">
            <div ref={chatContainerRef} className="space-y-2 overflow-y-auto max-h-80 pr-1 font-mono text-xs w-full">
              {messages.map((m, idx) => (
                <div key={idx} className="bg-zinc-950 p-2 rounded border border-zinc-800/80 flex justify-between gap-2 break-words">
                  <div className="min-w-0 flex-1">
                    <strong className="text-amber-300">{m.sender}: </strong>
                    <span className="text-zinc-200 break-words">{m.text}</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 whitespace-nowrap">{m.time}</span>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendChat} className="flex gap-2 w-full">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type global chat message..."
                className="flex-1 bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500 min-w-0"
              />
              <button
                type="submit"
                className="bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold px-4 py-2 rounded text-xs font-mono uppercase whitespace-nowrap"
              >
                Send
              </button>
            </form>
          </div>
        )}

        {activeSubTab === 'COMBAT_LOG' && (
          <div className="space-y-2 overflow-y-auto max-h-96 font-mono text-xs w-full min-w-0">
            {displayCombatLogs.length === 0 ? (
              <p className="text-zinc-500 italic text-center py-8">No recent combat logs recorded.</p>
            ) : (
              displayCombatLogs.map((log) => (
                <div key={log.id} className="bg-zinc-950 p-2 rounded border border-zinc-800 text-zinc-300 break-words">
                  <span className="text-[10px] text-amber-500 font-bold mr-2">[Turn {log.turn}]</span>
                  {log.text}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
