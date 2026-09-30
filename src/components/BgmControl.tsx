import React, { useState, useEffect, useRef } from 'react';
import { bgmManager, BGMTrackId } from '../utils/musicManager';

export const BgmControl: React.FC = () => {
  const [muted, setMuted] = useState<boolean>(() => bgmManager.isMuted());
  const [volume, setVolume] = useState<number>(() => bgmManager.getVolume());
  const [currentTrack, setCurrentTrack] = useState<BGMTrackId | null>(() => bgmManager.getCurrentTrack());
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = bgmManager.subscribe(() => {
      setMuted(bgmManager.isMuted());
      setVolume(bgmManager.getVolume());
      setCurrentTrack(bgmManager.getCurrentTrack());
    });
    return unsubscribe;
  }, []);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    bgmManager.toggleMute();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    bgmManager.setVolume(val);
  };

  const trackDisplayNames: Record<BGMTrackId, string> = {
    MAIN: 'Main Theme',
    BATTLE: 'Battle Theme',
    BOSS: 'Boss Theme',
    LORE: 'Lore & Story',
  };

  return (
    <div ref={containerRef} className="relative inline-block z-50 select-none">
      {/* HUD Trigger Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        title="Ambient Music Settings"
        className={`flex items-center space-x-1 px-2 py-0.5 rounded border text-[10px] md:text-xs font-mono transition-all ${
          muted
            ? 'bg-zinc-900/80 text-zinc-500 border-zinc-700/60 hover:text-zinc-300'
            : 'bg-amber-950/60 text-amber-300 border-amber-800/60 hover:bg-amber-900/80 hover:text-amber-100'
        }`}
      >
        <span className="text-xs md:text-sm">{muted ? '🔇' : '🎵'}</span>
        <span className="hidden sm:inline font-bold">
          {muted ? 'Muted' : `${Math.round(volume * 100)}%`}
        </span>
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-56 bg-zinc-950 border border-amber-900/80 rounded-xl shadow-2xl p-3 text-amber-100 text-xs font-mono backdrop-blur-md z-50">
          <div className="flex items-center justify-between border-b border-amber-900/40 pb-2 mb-2">
            <div className="flex items-center space-x-1.5 font-bold text-amber-300">
              <span>🎵</span>
              <span>Ambient Music</span>
            </div>
            <button
              onClick={handleToggleMute}
              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                muted
                  ? 'bg-red-950 text-red-300 border-red-800 hover:bg-red-900'
                  : 'bg-emerald-950 text-emerald-300 border-emerald-800 hover:bg-emerald-900'
              }`}
            >
              {muted ? 'UNMUTE' : 'MUTE'}
            </button>
          </div>

          {/* Volume Slider */}
          <div className="space-y-1.5 mb-2.5">
            <div className="flex justify-between text-[10px] text-zinc-400">
              <span>Volume</span>
              <span className="font-bold text-amber-300">{Math.round(volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={handleVolumeChange}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>

          {/* Active Track Status */}
          <div className="text-[10px] bg-zinc-900/90 p-2 rounded-lg border border-zinc-800/80">
            <div className="text-zinc-500 text-[9px] uppercase tracking-wider mb-0.5">Now Playing</div>
            <div className="font-bold text-amber-200 flex items-center space-x-1 truncate">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
              <span className="truncate">{currentTrack ? trackDisplayNames[currentTrack] : 'Maharlika Theme'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

