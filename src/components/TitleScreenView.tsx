// src/components/TitleScreenView.tsx
// Atmospheric Main Title Screen with 3 Character Slots, Continue, Settings & New Game

import React, { useState, useEffect } from 'react';
import { HeroClass, PlayerCharacter } from '../types/game';
import { soundFX } from '../utils/audio';
import { bgmManager } from '../utils/musicManager';
import { getHeroImageUrl } from '../utils/assetHelper';
import {
  getSaveSlotsMeta,
  loadGameSlot,
  deleteGameSlot,
  getMostRecentSlotId,
  getActiveSlotId,
  setActiveSlotId,
  SaveSlotMeta,
} from '../utils/saveManager';
import SettingsModal from './SettingsModal';

interface TitleScreenViewProps {
  onStartGame: (loadedPlayer: PlayerCharacter, slotId: number) => void;
  onNewGamePrompt: (slotId: number) => void;
  onDeleteSlot?: (slotId: number) => void;
  onShowToast?: (msg: string, type?: 'info' | 'success' | 'warning' | 'error', icon?: string) => void;
}

export const TitleScreenView: React.FC<TitleScreenViewProps> = ({
  onStartGame,
  onNewGamePrompt,
  onDeleteSlot,
  onShowToast,
}) => {
  const [slots, setSlots] = useState<SaveSlotMeta[]>(() => getSaveSlotsMeta());
  const [showSlotsModal, setShowSlotsModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [deleteCandidateSlot, setDeleteCandidateSlot] = useState<number | null>(null);

  // Play Main Theme on Title Screen
  useEffect(() => {
    bgmManager.playTrack('MAIN');
  }, []);

  const refreshSlots = () => {
    setSlots(getSaveSlotsMeta());
  };

  const mostRecentSlotId = getMostRecentSlotId();
  const mostRecentMeta = slots.find((s) => s.slotId === mostRecentSlotId && !s.isEmpty);
  const hasAnySave = slots.some((s) => !s.isEmpty);

  // Continue shows character slots
  const handleContinue = () => {
    soundFX.playClickSound();
    setShowSlotsModal(true);
  };

  // Load a chosen slot
  const handleLoadSlot = (slotId: number) => {
    soundFX.playClickSound();
    const loaded = loadGameSlot(slotId);
    if (loaded && loaded.hasCreatedCharacter) {
      setActiveSlotId(slotId);
      onStartGame(loaded, slotId);
    }
  };

  // Launch New Game
  const handleNewGame = (slotId?: number) => {
    soundFX.playClickSound();
    if (slotId) {
      setActiveSlotId(slotId);
      onNewGamePrompt(slotId);
      return;
    }

    // Find first empty slot
    const firstEmpty = slots.find((s) => s.isEmpty);
    if (firstEmpty) {
      setActiveSlotId(firstEmpty.slotId);
      onNewGamePrompt(firstEmpty.slotId);
    } else {
      // All slots full: open slots selector to let user pick overwrite
      setShowSlotsModal(true);
      onShowToast?.('All slots are occupied. Select a slot to overwrite or delete.', 'info', 'ℹ️');
    }
  };

  // Delete Slot Confirm
  const handleConfirmDelete = () => {
    if (!deleteCandidateSlot) return;
    soundFX.playClickSound();
    const slotToDelete = deleteCandidateSlot;
    deleteGameSlot(slotToDelete);
    onDeleteSlot?.(slotToDelete);
    setDeleteCandidateSlot(null);
    refreshSlots();
    onShowToast?.(`🗑️ Save Slot #${slotToDelete} deleted.`, 'info', '🗑️');
  };

  return (
    <div className="min-h-screen w-full relative flex flex-col justify-between items-center text-amber-100 select-none overflow-hidden bg-zinc-950 font-sans p-4 sm:p-8">
      {/* Dynamic Background Image & Dark Overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center filter brightness-40 contrast-110 pointer-events-none scale-105 transition-all duration-1000"
        style={{ backgroundImage: `url('./assets/backgrounds/poblacion.jpg')` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-zinc-950/80 pointer-events-none" />

      {/* Atmospheric Amber Particle Rays */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* TOP HEADER */}
      <header className="relative z-10 w-full max-w-4xl flex justify-between items-center pt-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">🌙</span>
          <span className="text-xs font-mono tracking-widest text-amber-400/90 font-bold uppercase">
            Philippine Mythology RPG
          </span>
        </div>
      </header>

      {/* CENTER HERO BRANDING & MENU */}
      <div className="relative z-10 flex flex-col items-center text-center space-y-6 sm:space-y-8 my-auto max-w-md w-full">
        {/* Title Logo Block */}
        <div className="space-y-2">
          <div className="inline-block px-3 py-1 rounded-full bg-amber-950/70 border border-amber-600/50 text-[10px] sm:text-xs font-mono font-bold tracking-widest text-amber-300 shadow-inner">
            PRE-COLONIAL FOLKLORE ADVENTURE
          </div>

          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 drop-shadow-[0_4px_16px_rgba(245,158,11,0.4)]">
            MAHARLIKA
          </h1>

          <p className="font-serif italic text-sm sm:text-base text-zinc-300 tracking-wider">
            Legends of the Archipelago
          </p>
        </div>

        {/* Primary Action Buttons Dock: 3 Buttons (Continue, New Game, Settings) */}
        <div className="w-full space-y-3 font-mono">
          {/* 1. CONTINUE BUTTON -> Shows Character Slots (Only if saves exist) */}
          {hasAnySave && (
            <button
              onClick={handleContinue}
              className="w-full py-3.5 px-6 rounded-2xl font-bold text-sm sm:text-base uppercase tracking-wider transition-all shadow-xl flex items-center justify-between min-h-[52px] bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-zinc-950 shadow-amber-950/80 ring-2 ring-amber-400/40 active:scale-98"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">▶</span>
                <span>Continue</span>
              </div>
              {mostRecentMeta ? (
                <span className="text-[10px] sm:text-xs font-normal opacity-90 truncate max-w-[170px]">
                  {mostRecentMeta.heroName} · Lv.{mostRecentMeta.level}
                </span>
              ) : (
                <span className="text-[10px] sm:text-xs font-normal opacity-80">
                  Select Slot
                </span>
              )}
            </button>
          )}

          {/* 2. NEW GAME */}
          <button
            onClick={() => handleNewGame()}
            className="w-full py-3 px-6 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/80 hover:border-amber-600/50 text-zinc-200 hover:text-amber-200 font-bold text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 min-h-[48px] shadow-md active:scale-98"
          >
            <span>✨</span>
            <span>New Game</span>
          </button>

          {/* 3. SETTINGS */}
          <button
            onClick={() => {
              soundFX.playClickSound();
              setShowSettingsModal(true);
            }}
            className="w-full py-3 px-6 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/80 hover:border-amber-600/50 text-zinc-300 hover:text-amber-300 font-bold text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 min-h-[48px] shadow-md active:scale-98"
          >
            <span>⚙️</span>
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="relative z-10 w-full max-w-4xl text-center text-[10px] font-mono text-zinc-500 pb-2">
        <span>Inspired by Pre-Colonial Philippine Mythology · Version 1.2.0</span>
      </footer>

      {/* ── 3-SLOT SELECTION MODAL ────────────────────────────────────────── */}
      {showSlotsModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-fade-in">
          <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border-2 border-amber-600/70 rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-amber-500 font-bold">
                  LOCAL STORAGE SAVE PROFILES
                </span>
                <h2 className="font-serif text-amber-200 text-xl font-bold">
                  Select Character Slot
                </h2>
              </div>
              <button
                onClick={() => setShowSlotsModal(false)}
                className="text-zinc-400 hover:text-white w-8 h-8 rounded-full bg-zinc-850 border border-zinc-700 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* 3 Slots Grid */}
            <div className="space-y-3 font-mono">
              {slots.map((slot) => {
                const isOccupied = !slot.isEmpty;
                const heroImg = isOccupied ? getHeroImageUrl(slot.heroClass) : '';

                return (
                  <div
                    key={slot.slotId}
                    className={`p-3.5 sm:p-4 rounded-xl border transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
                      isOccupied
                        ? 'bg-zinc-950/90 border-amber-600/50 hover:border-amber-500 shadow-lg'
                        : 'bg-zinc-950/40 border-dashed border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    {/* Left: Slot Badge + Character Info */}
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-amber-300 text-sm shrink-0">
                        #{slot.slotId}
                      </div>

                      {isOccupied ? (
                        <div className="flex items-center gap-3">
                          <img
                            src={heroImg}
                            alt={slot.heroName}
                            className="w-12 h-12 rounded-lg object-cover border border-amber-500/60 shrink-0"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-serif text-amber-200 font-bold text-base leading-tight">
                                {slot.heroName}
                              </h3>
                              <span className="text-[9px] bg-amber-950 text-amber-300 px-1.5 py-0.5 rounded border border-amber-600/40 font-bold">
                                Lv.{slot.level} {slot.heroClass}
                              </span>
                            </div>
                            <div className="text-[10px] text-zinc-400 mt-0.5">
                              {slot.currentActName || 'Act I: The Whispering Balete Forest'}
                            </div>
                            <div className="text-[9px] text-zinc-500 mt-0.5">
                              Power: {slot.powerLevel || 0} PWR · Saved: {slot.updatedAt ? new Date(slot.updatedAt).toLocaleDateString() : 'Recent'}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="text-zinc-400 font-bold text-sm">Empty Save Slot</div>
                          <div className="text-zinc-600 text-xs">Ready for a new Maharlika legend</div>
                        </div>
                      )}
                    </div>

                    {/* Right: Slot Actions */}
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-0 border-zinc-800/80">
                      {isOccupied ? (
                        <>
                          <button
                            onClick={() => {
                              setShowSlotsModal(false);
                              handleLoadSlot(slot.slotId);
                            }}
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-zinc-950 font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-95"
                          >
                            ▶ Load Game
                          </button>
                          <button
                            onClick={() => setDeleteCandidateSlot(slot.slotId)}
                            className="p-2 rounded-xl bg-zinc-900 hover:bg-red-950 text-zinc-500 hover:text-red-300 border border-zinc-800 hover:border-red-800 text-xs transition-colors"
                            title="Delete Save Slot"
                          >
                            🗑️
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            setShowSlotsModal(false);
                            handleNewGame(slot.slotId);
                          }}
                          className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-amber-200 border border-zinc-700 font-bold text-xs uppercase tracking-wider transition-all active:scale-95"
                        >
                          + New Hero
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setShowSlotsModal(false)}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-xs font-mono"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRMATION MODAL ────────────────────────────────────── */}
      {deleteCandidateSlot && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in font-mono">
          <div className="bg-zinc-950 border-2 border-red-700/80 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl text-center">
            <div className="text-3xl">⚠️</div>
            <h3 className="font-serif text-red-300 font-bold text-lg">
              Delete Slot #{deleteCandidateSlot}?
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              This will permanently erase all character progress and items in Slot #{deleteCandidateSlot}. This action cannot be undone.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
              <button
                onClick={() => setDeleteCandidateSlot(null)}
                className="py-2.5 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-zinc-300 border border-zinc-700"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="py-2.5 rounded-xl bg-red-800 hover:bg-red-700 text-white font-bold shadow-md shadow-red-950/60 active:scale-95"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SETTINGS MODAL ──────────────────────────────────────────────── */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onPlayerLoaded={(loaded) => {
          refreshSlots();
          onStartGame(loaded, getActiveSlotId());
        }}
        onShowToast={onShowToast}
      />
    </div>
  );
};

export default TitleScreenView;
