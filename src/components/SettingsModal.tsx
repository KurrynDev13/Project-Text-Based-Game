// src/components/SettingsModal.tsx
// System Settings, Audio Controls & Supabase Cloud Backup Management

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { bgmManager } from '../utils/musicManager';
import { soundFX } from '../utils/audio';
import { isSupabaseConfigured, uploadCloudSave, downloadCloudSave, fetchCloudSaveSummaries } from '../utils/supabase';
import { getOrCreateDeviceId, getActiveSlotId, loadGameSlot, saveGameSlot } from '../utils/saveManager';
import { PlayerCharacter } from '../types/game';
import { registerBackHandler } from '../utils/navigationStack';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  player?: PlayerCharacter | null;
  onPlayerLoaded?: (loadedPlayer: PlayerCharacter) => void;
  onReturnToTitle?: () => void;
  onShowToast?: (msg: string, type?: 'info' | 'success' | 'warning' | 'error', icon?: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  player,
  onPlayerLoaded,
  onReturnToTitle,
  onShowToast,
}) => {
  const [bgmMuted, setBgmMuted] = useState<boolean>(() => bgmManager.isMuted());
  const [bgmVolume, setBgmVolume] = useState<number>(() => bgmManager.getVolume());
  const [sfxEnabled, setSfxEnabled] = useState<boolean>(() => soundFX.isEnabled());
  const [cloudSyncing, setCloudSyncing] = useState<boolean>(false);
  const [deviceId] = useState<string>(() => getOrCreateDeviceId());

  useEffect(() => {
    const unsub = bgmManager.subscribe(() => {
      setBgmMuted(bgmManager.isMuted());
      setBgmVolume(bgmManager.getVolume());
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    return registerBackHandler(() => {
      onClose();
      return true;
    });
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    bgmManager.setVolume(val);
    setBgmVolume(val);
  };

  const handleToggleBgmMute = () => {
    soundFX.playClickSound();
    const newMuted = bgmManager.toggleMute();
    setBgmMuted(newMuted);
  };

  const handleToggleSfx = () => {
    const enabled = soundFX.toggleSound();
    setSfxEnabled(enabled);
    if (enabled) soundFX.playClickSound();
  };

  const handleUploadActiveSlot = async () => {
    if (!isSupabaseConfigured) {
      onShowToast?.('Supabase Cloud is not configured in this environment.', 'warning', '☁️');
      return;
    }
    const activeSlot = getActiveSlotId();
    const slotData = player || loadGameSlot(activeSlot);
    if (!slotData || !slotData.hasCreatedCharacter) {
      onShowToast?.('No active character data found to backup.', 'warning', '⚠️');
      return;
    }

    setCloudSyncing(true);
    soundFX.playClickSound();
    try {
      const ok = await uploadCloudSave(
        deviceId,
        activeSlot,
        slotData,
        slotData.name,
        slotData.heroClass,
        slotData.level,
        slotData.currentLocationId,
        0
      );
      if (ok) {
        soundFX.playLevelUpSound();
        onShowToast?.(`☁️ Cloud Backup Successful! Slot #${activeSlot} backed up.`, 'success', '☁️');
      } else {
        onShowToast?.('Cloud backup failed. Check network or database.', 'error', '❌');
      }
    } catch {
      onShowToast?.('Cloud backup encountered an error.', 'error', '❌');
    } finally {
      setCloudSyncing(false);
    }
  };

  const handleRestoreFromCloud = async () => {
    if (!isSupabaseConfigured) {
      onShowToast?.('Supabase Cloud is not configured.', 'warning', '☁️');
      return;
    }
    const activeSlot = getActiveSlotId();
    setCloudSyncing(true);
    soundFX.playClickSound();
    try {
      const downloaded = await downloadCloudSave(deviceId, activeSlot);
      if (downloaded && downloaded.hasCreatedCharacter) {
        saveGameSlot(activeSlot, downloaded);
        onPlayerLoaded?.(downloaded);
        soundFX.playLevelUpSound();
        onShowToast?.(`☁️ Slot #${activeSlot} successfully restored from Cloud!`, 'success', '🎉');
      } else {
        onShowToast?.(`No cloud save found for Slot #${activeSlot} on this device.`, 'info', 'ℹ️');
      }
    } catch {
      onShowToast?.('Failed to restore from Cloud.', 'error', '❌');
    } finally {
      setCloudSyncing(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-fade-in select-none">
      <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border-2 border-amber-600/70 rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-2xl relative space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-amber-500 font-bold">
              SYSTEM CONFIGURATION
            </span>
            <h2 className="font-serif text-amber-200 text-xl font-bold">
              Game Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white w-8 h-8 rounded-full bg-zinc-850 border border-zinc-700 flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        {/* 1. AUDIO SECTION */}
        <div className="space-y-3 bg-zinc-950/80 p-3 rounded-xl border border-zinc-800/80">
          <div className="text-[11px] font-mono text-amber-400 uppercase font-bold tracking-wider flex items-center gap-1.5">
            <span>🎵</span>
            <span>Audio &amp; Atmosphere</span>
          </div>

          {/* BGM Volume */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-zinc-300">Background Music (BGM):</span>
              <span className="text-amber-300 font-bold">{bgmMuted ? 'MUTED' : `${Math.round(bgmVolume * 100)}%`}</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={bgmVolume}
                onChange={handleVolumeChange}
                disabled={bgmMuted}
                className="flex-1 accent-amber-500 cursor-pointer disabled:opacity-30"
              />
              <button
                onClick={handleToggleBgmMute}
                className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase border transition-all ${
                  bgmMuted
                    ? 'bg-red-950/80 text-red-300 border-red-800'
                    : 'bg-zinc-800 text-amber-300 border-zinc-700 hover:bg-zinc-700'
                }`}
              >
                {bgmMuted ? '🔇 Unmute' : '🔊 Mute'}
              </button>
            </div>
          </div>

          {/* Sound FX Toggle */}
          <div className="flex justify-between items-center pt-1 border-t border-zinc-850 text-xs font-mono">
            <span className="text-zinc-300">Sound Effects (SFX):</span>
            <button
              onClick={handleToggleSfx}
              className={`px-3 py-1 rounded text-[10px] font-mono font-bold uppercase border transition-all ${
                sfxEnabled
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  : 'bg-zinc-900 text-zinc-500 border-zinc-800'
              }`}
            >
              {sfxEnabled ? '✅ Enabled' : '❌ Disabled'}
            </button>
          </div>
        </div>

        {/* 2. CLOUD BACKUP SECTION */}
        <div className="space-y-2.5 bg-zinc-950/80 p-3 rounded-xl border border-zinc-800/80">
          <div className="text-[11px] font-mono text-amber-400 uppercase font-bold tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span>☁️</span>
              <span>Supabase Cloud Saves</span>
            </span>
            <span className={`text-[9px] px-2 py-0.5 rounded border ${
              isSupabaseConfigured
                ? 'bg-emerald-950/90 text-emerald-300 border-emerald-800'
                : 'bg-zinc-900 text-zinc-500 border-zinc-800'
            }`}>
              {isSupabaseConfigured ? 'Connected' : 'Offline Mode'}
            </span>
          </div>

          <p className="text-[10px] font-mono text-zinc-400 leading-tight">
            Sync character saves to the cloud to prevent local browser storage loss. Device ID: <span className="text-zinc-300 font-bold">{deviceId.slice(0, 12)}...</span>
          </p>

          <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs">
            <button
              onClick={handleUploadActiveSlot}
              disabled={cloudSyncing || !isSupabaseConfigured}
              className="py-2 px-3 rounded-xl bg-amber-700 hover:bg-amber-600 disabled:opacity-40 text-amber-100 font-bold text-[11px] border border-amber-600/60 transition-all active:scale-95 flex items-center justify-center gap-1"
            >
              <span>⬆️ Backup Cloud</span>
            </button>

            <button
              onClick={handleRestoreFromCloud}
              disabled={cloudSyncing || !isSupabaseConfigured}
              className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 font-bold text-[11px] border border-zinc-700 transition-all active:scale-95 flex items-center justify-center gap-1"
            >
              <span>⬇️ Restore Cloud</span>
            </button>
          </div>
        </div>

        {/* 3. RETURN TO TITLE / FOOTER ACTIONS */}
        <div className="space-y-2 pt-1">
          {onReturnToTitle && (
            <button
              onClick={() => {
                soundFX.playClickSound();
                onReturnToTitle();
                onClose();
              }}
              className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-red-950/60 border border-zinc-700 hover:border-red-700/60 text-zinc-300 hover:text-red-200 font-mono font-bold text-xs uppercase tracking-wider transition-all"
            >
              🚪 Save &amp; Exit to Title Screen
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-zinc-950 font-mono font-bold text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};

export default SettingsModal;
