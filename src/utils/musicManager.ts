import { mainThemeUrl } from '../music/mainThemeData';
import { battleThemeUrl } from '../music/battleThemeData';
import { bossThemeUrl } from '../music/bossThemeData';
import { loreThemeUrl } from '../music/loreThemeData';

export type BGMTrackId = 'MAIN' | 'BATTLE' | 'BOSS' | 'LORE';

const BGM_VOLUME_KEY = 'maharlika_bgm_volume';
const BGM_MUTED_KEY = 'maharlika_bgm_muted';
const DEFAULT_VOLUME = 0.25; // Audible, comfortable ambient level (25%)

class BackgroundMusicManager {
  private audioElements: Partial<Record<BGMTrackId, HTMLAudioElement>> = {};
  private currentTrackId: BGMTrackId | null = null;
  private targetTrackId: BGMTrackId | null = null;
  private volume: number = DEFAULT_VOLUME;
  private muted: boolean = false;
  private isUnlocked: boolean = false;
  private fadeTimer: number | null = null;
  private listeners: Set<() => void> = new Set();
  private wasPlayingBeforeUnfocus: boolean = false;
  private isDocumentFocused: boolean = true;

  constructor() {
    this.loadSettings();
    if (typeof window !== 'undefined') {
      this.initAudio();
      this.setupUnlockListeners();
      this.setupFocusAndVisibilityListeners();
    }
  }

  private loadSettings() {
    try {
      const savedVol = localStorage.getItem(BGM_VOLUME_KEY);
      if (savedVol !== null) {
        const parsed = parseFloat(savedVol);
        if (!isNaN(parsed)) {
          this.volume = Math.max(0, Math.min(1, parsed));
        }
      }

      const savedMuted = localStorage.getItem(BGM_MUTED_KEY);
      if (savedMuted !== null) {
        this.muted = savedMuted === 'true';
      }
    } catch {
      this.volume = DEFAULT_VOLUME;
      this.muted = false;
    }
  }

  private initAudio() {
    // Uses inline Base64 Data URIs directly from .ts modules to prevent IDM (Internet Download Manager) network interception
    const tracks: Record<BGMTrackId, string> = {
      MAIN: mainThemeUrl,
      BATTLE: battleThemeUrl,
      BOSS: bossThemeUrl,
      LORE: loreThemeUrl,
    };

    (Object.keys(tracks) as BGMTrackId[]).forEach((id) => {
      const audio = new Audio(tracks[id]);
      audio.loop = true;
      audio.preload = 'auto';
      audio.volume = this.effectiveVolume;
      this.audioElements[id] = audio;
    });
  }

  private setupUnlockListeners() {
    const unlock = () => {
      if (this.isUnlocked) return;
      this.isUnlocked = true;

      const trackToPlay = this.targetTrackId || this.currentTrackId || 'MAIN';
      this.currentTrackId = null; // Reset currentTrackId to force clean play & crossfade start
      this.playTrack(trackToPlay);

      // Clean up event listeners
      ['click', 'pointerdown', 'keydown', 'touchstart'].forEach((evt) => {
        window.removeEventListener(evt, unlock);
      });
    };

    ['click', 'pointerdown', 'keydown', 'touchstart'].forEach((evt) => {
      window.addEventListener(evt, unlock, { once: false });
    });
  }

  private setupFocusAndVisibilityListeners() {
    const handleUnfocus = () => {
      this.isDocumentFocused = false;
      if (this.currentTrackId) {
        const currentAudio = this.audioElements[this.currentTrackId];
        if (currentAudio && !currentAudio.paused) {
          this.wasPlayingBeforeUnfocus = true;
          currentAudio.pause();
        }
      }
    };

    const handleFocus = () => {
      this.isDocumentFocused = true;
      if (this.wasPlayingBeforeUnfocus && this.currentTrackId && !this.muted && this.isUnlocked) {
        this.wasPlayingBeforeUnfocus = false;
        const currentAudio = this.audioElements[this.currentTrackId];
        if (currentAudio && currentAudio.paused) {
          currentAudio.volume = this.effectiveVolume;
          currentAudio.play().catch(() => {});
        }
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          handleUnfocus();
        } else if (document.visibilityState === 'visible') {
          handleFocus();
        }
      });
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('blur', handleUnfocus);
      window.addEventListener('focus', handleFocus);
      window.addEventListener('pagehide', handleUnfocus);
      window.addEventListener('pageshow', handleFocus);
    }
  }

  public playTrack(trackId: BGMTrackId) {
    this.targetTrackId = trackId;

    const nextAudio = this.audioElements[trackId];
    if (!nextAudio) return;

    if (this.currentTrackId === trackId) {
      // Ensure current track is playing and volume is set correctly
      nextAudio.volume = this.effectiveVolume;
      if (nextAudio.paused && this.isUnlocked) {
        nextAudio.play().catch((err) => console.warn('[BGM] Play error:', err));
      }
      return;
    }

    const previousTrackId = this.currentTrackId;
    const previousAudio = previousTrackId ? this.audioElements[previousTrackId] : null;

    this.currentTrackId = trackId;
    this.notify();

    if (!this.isUnlocked) {
      // Audio not unlocked by user gesture yet
      return;
    }

    if (!this.isDocumentFocused) {
      this.wasPlayingBeforeUnfocus = true;
      return;
    }

    // Perform smooth crossfade
    this.crossfade(previousAudio, nextAudio);
  }

  private get effectiveVolume(): number {
    return this.muted ? 0 : this.volume;
  }

  private crossfade(
    fromAudio: HTMLAudioElement | null | undefined,
    toAudio: HTMLAudioElement
  ) {
    if (this.fadeTimer !== null) {
      window.clearInterval(this.fadeTimer);
      this.fadeTimer = null;
    }

    const targetVol = this.effectiveVolume;

    // Fast-path if no previous audio
    if (!fromAudio) {
      toAudio.loop = true;
      toAudio.volume = targetVol;
      toAudio.play().catch((err) => console.warn('[BGM] Play failed:', err));
      return;
    }

    const fadeSteps = 20;
    const fadeDurationMs = 400;
    const stepMs = fadeDurationMs / fadeSteps;
    let step = 0;

    const initialFromVol = fromAudio.volume;

    toAudio.loop = true;
    toAudio.volume = 0;
    toAudio.play().catch((err) => console.warn('[BGM] Crossfade play failed:', err));

    this.fadeTimer = window.setInterval(() => {
      step++;
      const progress = step / fadeSteps;

      if (fromAudio && !fromAudio.paused) {
        fromAudio.volume = Math.max(0, initialFromVol * (1 - progress));
      }

      toAudio.volume = Math.min(targetVol, targetVol * progress);

      if (step >= fadeSteps) {
        if (this.fadeTimer !== null) {
          window.clearInterval(this.fadeTimer);
          this.fadeTimer = null;
        }

        if (fromAudio) {
          fromAudio.pause();
          fromAudio.currentTime = 0;
        }
        toAudio.volume = targetVol;
      }
    }, stepMs);
  }

  public setVolume(vol: number) {
    const clamped = Math.max(0, Math.min(1, vol));
    this.volume = clamped;
    try {
      localStorage.setItem(BGM_VOLUME_KEY, clamped.toString());
    } catch {}

    this.applyVolume();
    this.notify();
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    try {
      localStorage.setItem(BGM_MUTED_KEY, this.muted.toString());
    } catch {}

    this.applyVolume();
    this.notify();
    return this.muted;
  }

  private applyVolume() {
    if (!this.currentTrackId) return;
    const currentAudio = this.audioElements[this.currentTrackId];
    if (currentAudio) {
      currentAudio.volume = this.effectiveVolume;
      if (this.effectiveVolume > 0 && currentAudio.paused && this.isUnlocked) {
        currentAudio.play().catch(() => {});
      }
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public getCurrentTrack(): BGMTrackId | null {
    return this.currentTrackId;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }
}

export const bgmManager = new BackgroundMusicManager();

