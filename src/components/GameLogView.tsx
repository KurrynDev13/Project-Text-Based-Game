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
    { sender: 'System', text: 'Welcome Wayfarer! Global chat channel established across the archipelago.', time: '08:00' },
    { sender: 'Vanguard_Kael', text: 'Group forming for Act III Shadow Apolaki at the Ancestral Caves!', time: '08:02' },
    { sender: 'Arcane_Elena', text: 'Just blessed a Tempered Kampilan with 2 Mutya Pearls at Panday Pira!', time: '08:05' },
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
    <div className="flex flex-col h-full w-full max-w-full min-w-0 overflow-x-hidden bg-transparent text-amber-100 p-2 sm:p-4 md:p-6 space-y-3 md:space-y-4 pb-20 md:pb-6 select-none font-sans">
      {/* Log & Social Header */}
      <div className="bg-[#090c12]/95 backdrop-blur-md border border-amber-500/25 rounded-2xl p-3 md:p-4 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3 w-full min-w-0">
        <div>
          <div className="text-[9.5px] font-mono text-amber-400 uppercase tracking-widest font-bold flex items-center gap-1">
            <span>ᜆᜎ</span>
            <span>• CHRONICLES & JOURNAL</span>
          </div>
          <h2 className="text-lg md:text-xl font-bold font-serif text-amber-100">
            Archipelago Records & Chat
          </h2>
        </div>

        <div className="flex bg-[#0c0f16]/90 p-1 rounded-xl border border-zinc-800 text-xs font-mono flex-wrap gap-1 w-full md:w-auto shadow-inner">
          <button
            onClick={() => setActiveSubTab('JOURNAL')}
            className={`flex-1 md:flex-initial px-3.5 py-1.5 rounded-lg transition-all text-center cursor-pointer min-h-[34px] flex items-center justify-center gap-1 active:scale-95 ${
              activeSubTab === 'JOURNAL'
                ? 'bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-zinc-950 font-bold shadow-[0_0_12px_rgba(245,158,11,0.35)] ring-1 ring-amber-300'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            📜 Quest Journal
          </button>
          <button
            onClick={() => setActiveSubTab('CHAT')}
            className={`flex-1 md:flex-initial px-3.5 py-1.5 rounded-lg transition-all text-center cursor-pointer min-h-[34px] flex items-center justify-center gap-1 active:scale-95 ${
              activeSubTab === 'CHAT'
                ? 'bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-zinc-950 font-bold shadow-[0_0_12px_rgba(245,158,11,0.35)] ring-1 ring-amber-300'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            💬 Global Chat
          </button>
          <button
            onClick={() => setActiveSubTab('COMBAT_LOG')}
            className={`flex-1 md:flex-initial px-3.5 py-1.5 rounded-lg transition-all text-center cursor-pointer min-h-[34px] flex items-center justify-center gap-1 active:scale-95 ${
              activeSubTab === 'COMBAT_LOG'
                ? 'bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-zinc-950 font-bold shadow-[0_0_12px_rgba(245,158,11,0.35)] ring-1 ring-amber-300'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            ⚔️ Battle History
          </button>
        </div>
      </div>

      {/* SubTab Content */}
      <div className="flex-1 bg-[#090c12]/95 border border-amber-500/25 rounded-2xl p-2.5 sm:p-4 shadow-xl flex flex-col justify-between w-full min-w-0 max-w-full overflow-hidden">
        {activeSubTab === 'JOURNAL' && (
          <div className="w-full min-w-0 max-w-full overflow-x-hidden">
            <JournalView player={player} onUpdatePlayer={onUpdatePlayer} onShowToast={onShowToast} />
          </div>
        )}

        {activeSubTab === 'CHAT' && (
          <div className="flex flex-col h-full justify-between space-y-3 w-full min-w-0">
            <div ref={chatContainerRef} className="space-y-2 overflow-y-auto max-h-80 pr-1 font-mono text-xs w-full">
              {messages.map((m, idx) => (
                <div key={idx} className="bg-[#0c0f16]/90 p-2.5 rounded-xl border border-zinc-800 flex justify-between gap-2 break-words shadow-sm">
                  <div className="min-w-0 flex-1">
                    <strong className="text-amber-300 font-serif">{m.sender}: </strong>
                    <span className="text-zinc-200 break-words">{m.text}</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 whitespace-nowrap">{m.time}</span>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendChat} className="flex gap-2 w-full pt-1">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Send words across the archipelago..."
                className="flex-1 bg-[#0c0f16]/90 border border-zinc-700/80 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500 min-w-0"
              />
              <button
                type="submit"
                className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-zinc-950 font-bold px-4 py-2 rounded-xl text-xs font-mono uppercase whitespace-nowrap cursor-pointer active:scale-95 shadow"
              >
                Send
              </button>
            </form>
          </div>
        )}

        {activeSubTab === 'COMBAT_LOG' && (
          <div className="space-y-2 overflow-y-auto max-h-96 font-mono text-xs w-full min-w-0 pr-1">
            {displayCombatLogs.length === 0 ? (
              <p className="text-zinc-500 italic text-center py-8">No recent combat encounters recorded.</p>
            ) : (
              displayCombatLogs.map((log) => (
                <div key={log.id} className="bg-[#0c0f16]/90 p-2 rounded-xl border border-zinc-800 text-zinc-300 break-words shadow-sm">
                  <span className="text-[10px] text-amber-400 font-bold mr-2">[Turn {log.turn}]</span>
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
export default GameLogView;

