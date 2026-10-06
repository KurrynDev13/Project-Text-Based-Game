import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { createPortal } from 'react-dom';
import { EnemyMonster, PlayerCharacter } from '../types/game';
import { getHeroImageUrl, getMonsterImageUrl, getEventImageUrl, getLocationBgUrl, getQuestGiverImageUrl } from '../utils/assetHelper';
import { calcDerivedStats } from '../utils/gameFormulas';
import { InteractiveEncounter } from './WorldHuntView';

export interface QuestEncounterData {
  giver: string;
  title: string;
  objectiveText: string;
  progressRequired: number;
}

export interface PreviewData {
  src: string;
  title: string;
  subtitle?: string;
  badge?: string;
  theme: 'HERO' | 'MONSTER' | 'BOSS' | 'EVENT';
}

export interface FloatingNumber {
  id: string;
  text: string | number;
  target: 'HERO' | 'MONSTER';
  type: 'normal' | 'crit' | 'heal' | 'dodge' | 'parry';
}

export interface TactileCombatStageRef {
  triggerSlash: (target: 'HERO' | 'MONSTER', color?: string) => void;
  triggerFireBurst: (target: 'HERO' | 'MONSTER') => void;
  triggerPoisonSpore: (target: 'HERO' | 'MONSTER') => void;
  triggerSpiritHeal: (target: 'HERO' | 'MONSTER') => void;
  triggerGuardAura: (target: 'HERO' | 'MONSTER') => void;
  triggerRumble: () => void;
  addFloater: (text: string | number, target: 'HERO' | 'MONSTER', type?: 'normal' | 'crit' | 'heal' | 'dodge' | 'parry') => void;
}

export interface ArenaOutcome {
  type: 'CHEST' | 'MERCHANT' | 'FLEE' | 'SHRINE' | 'CACHE' | 'TRAP' | 'VICTORY';
  title: string;
  description: string;
  badge?: string;
  isPositive: boolean;
  costOrReward?: string;
  details?: string[];
  enemyName?: string;
  expReward?: number;
  cowrieReward?: number;
  bounties?: Array<{
    id: string;
    title: string;
    currentCount: number;
    targetCount: number;
    isCompleted: boolean;
  }>;
}

interface TactileCombatStageProps {
  inCombat: boolean;
  player: PlayerCharacter;
  monster?: EnemyMonster | null;
  locationId: string;
  locationName: string;
  locationSubtitle?: string;
  activeEncounter?: InteractiveEncounter | null;
  explorationEvent?: string | null;
  heroAnimClass?: string;
  monsterAnimClass?: string;
  isGuarding?: boolean;
  fledStatusMessage?: string | null;
  arenaOutcome?: ArenaOutcome | null;
  questEncounter?: QuestEncounterData | null;
  hasSeenSectorIntro?: boolean;
}

// Internal Particle & SlashArc classes for procedural Canvas VFX
class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;

  constructor(x: number, y: number, vx: number, vy: number, size: number, color: string, maxLife: number) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.size = size;
    this.color = color;
    this.life = maxLife;
    this.maxLife = maxLife;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.08;
    this.life--;
    this.size = Math.max(0, this.size * 0.95);
  }

  draw(c: CanvasRenderingContext2D) {
    c.save();
    const alpha = Math.max(0, this.life / this.maxLife);
    c.globalAlpha = alpha;
    c.fillStyle = this.color;
    c.shadowColor = this.color;
    c.shadowBlur = 8;
    c.beginPath();
    c.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }
}

class SlashArc {
  x: number;
  y: number;
  radius: number;
  startAngle: number;
  endAngle: number;
  color: string;
  width: number;
  life: number;
  maxLife: number;

  constructor(x: number, y: number, radius: number, startAngle: number, endAngle: number, color: string, width: number) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.startAngle = startAngle;
    this.endAngle = endAngle;
    this.color = color;
    this.width = width;
    this.life = 12;
    this.maxLife = 12;
  }

  update() {
    this.life--;
    this.width = Math.max(0, this.width * 0.88);
  }

  draw(c: CanvasRenderingContext2D) {
    c.save();
    const alpha = Math.max(0, this.life / this.maxLife);
    c.globalAlpha = alpha;
    c.strokeStyle = this.color;
    c.lineWidth = this.width;
    c.lineCap = 'round';
    c.shadowColor = this.color;
    c.shadowBlur = 14;
    c.beginPath();
    c.arc(this.x, this.y, this.radius, this.startAngle, this.endAngle);
    c.stroke();
    c.restore();
  }
}

export const TactileCombatStage = forwardRef<TactileCombatStageRef, TactileCombatStageProps>(({
  inCombat,
  player,
  monster,
  locationId,
  locationName,
  locationSubtitle,
  activeEncounter,
  explorationEvent,
  heroAnimClass = '',
  monsterAnimClass = '',
  isGuarding = false,
  fledStatusMessage = null,
  arenaOutcome = null,
  questEncounter = null,
  hasSeenSectorIntro = false,
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heroCardRef = useRef<HTMLDivElement>(null);
  const monsterCardRef = useRef<HTMLDivElement>(null);

  const [floaters, setFloaters] = useState<FloatingNumber[]>([]);
  const [isRumbling, setIsRumbling] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);

  // Close gallery preview on Escape key press
  useEffect(() => {
    if (!previewData) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPreviewData(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewData]);

  // Background artwork
  const bgUrl = getLocationBgUrl(locationId);

  // Imperative API for Parent
  useImperativeHandle(ref, () => ({
    triggerSlash: (target, color = '#f59e0b') => {
      const coords = getTargetCoords(target);
      if (!coords) return;
      emitSlash(coords.x, coords.y, color);
    },
    triggerFireBurst: (target) => {
      const coords = getTargetCoords(target);
      if (!coords) return;
      emitFireBurst(coords.x, coords.y);
    },
    triggerPoisonSpore: (target) => {
      const coords = getTargetCoords(target);
      if (!coords) return;
      emitPoisonSpore(coords.x, coords.y);
    },
    triggerSpiritHeal: (target) => {
      const coords = getTargetCoords(target);
      if (!coords) return;
      emitSpiritHeal(coords.x, coords.y);
    },
    triggerGuardAura: (target) => {
      const coords = getTargetCoords(target);
      if (!coords) return;
      emitGuardAura(coords.x, coords.y);
    },
    triggerRumble: () => {
      setIsRumbling(true);
      setTimeout(() => setIsRumbling(false), 320);
    },
    addFloater: (text, target, type = 'normal') => {
      const id = `floater_${Date.now()}_${Math.random()}`;
      setFloaters(prev => [...prev, { id, text, target, type }]);
      setTimeout(() => {
        setFloaters(prev => prev.filter(f => f.id !== id));
      }, 850);
    },
  }));

  // Canvas coordinate resolver
  const getTargetCoords = (target: 'HERO' | 'MONSTER'): { x: number; y: number } | null => {
    const el = target === 'HERO' ? heroCardRef.current : monsterCardRef.current;
    const canvas = canvasRef.current;
    if (!el || !canvas) return null;
    const elRect = el.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    return {
      x: elRect.left - canvasRect.left + elRect.width * 0.5,
      y: elRect.top - canvasRect.top + elRect.height * 0.5,
    };
  };

  // Particles & Slashes arrays
  const particlesRef = useRef<Particle[]>([]);
  const slashArcsRef = useRef<SlashArc[]>([]);

  const emitSlash = (x: number, y: number, color = '#f59e0b') => {
    slashArcsRef.current.push(new SlashArc(x, y, 40, -Math.PI * 0.8, Math.PI * 0.2, color, 6));
    for (let i = 0; i < 20; i++) {
      const speed = 2 + Math.random() * 5.5;
      const angle = -Math.PI * 0.3 + (Math.random() - 0.5) * 1.5;
      particlesRef.current.push(
        new Particle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 2.5 + Math.random() * 2.5, color, 22 + Math.random() * 12)
      );
    }
  };

  const emitFireBurst = (x: number, y: number) => {
    const colors = ['#f97316', '#ef4444', '#fbbf24', '#ffffff'];
    for (let i = 0; i < 28; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6.5;
      particlesRef.current.push(
        new Particle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed - 1.2, 3.5 + Math.random() * 3.5, colors[Math.floor(Math.random() * colors.length)], 26 + Math.random() * 16)
      );
    }
  };

  const emitPoisonSpore = (x: number, y: number) => {
    for (let i = 0; i < 22; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3.5;
      particlesRef.current.push(
        new Particle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed - 1.5, 3.5 + Math.random() * 3, '#10b981', 30 + Math.random() * 16)
      );
    }
  };

  const emitSpiritHeal = (x: number, y: number) => {
    const colors = ['#06b6d4', '#67e8f9', '#a7f3d0', '#fef08a'];
    for (let i = 0; i < 24; i++) {
      const angle = -Math.PI * 0.5 + (Math.random() - 0.5) * 1.2;
      const speed = 1.5 + Math.random() * 4;
      particlesRef.current.push(
        new Particle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 2.5 + Math.random() * 2.5, colors[Math.floor(Math.random() * colors.length)], 28 + Math.random() * 16)
      );
    }
  };

  const emitGuardAura = (x: number, y: number) => {
    for (let i = 0; i < 26; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      particlesRef.current.push(
        new Particle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 3 + Math.random() * 3, '#38bdf8', 25 + Math.random() * 10)
      );
    }
  };

  // Canvas loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
    };
    resize();
    window.addEventListener('resize', resize);

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Render slashes
      for (let i = slashArcsRef.current.length - 1; i >= 0; i--) {
        const s = slashArcsRef.current[i];
        s.update();
        s.draw(ctx);
        if (s.life <= 0) slashArcsRef.current.splice(i, 1);
      }

      // Render particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.update();
        p.draw(ctx);
        if (p.life <= 0) particlesRef.current.splice(i, 1);
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  // Hero & Monster HP Calculations
  const derived = calcDerivedStats(player.attributes, player.level, player.equipment);
  const heroHp = Math.max(0, player.currentHp ?? 0);
  const heroMaxHp = Math.max(1, derived.maxHp || 100);
  const heroHpPct = Math.min(100, Math.max(0, (heroHp / heroMaxHp) * 100));

  const heroMp = Math.max(0, player.currentMp ?? 0);
  const heroMaxMp = Math.max(1, derived.maxMp || 50);
  const heroMpPct = Math.min(100, Math.max(0, (heroMp / heroMaxMp) * 100));

  const monsterHp = monster ? Math.max(0, monster.currentHp) : 0;
  const monsterMaxHp = monster ? Math.max(1, monster.maxHp) : 1;
  const monsterHpPct = Math.min(100, Math.max(0, (monsterHp / monsterMaxHp) * 100));

  return (
    <div
      ref={containerRef}
      className={`relative w-full min-h-[280px] sm:min-h-[310px] h-full rounded-xl sm:rounded-2xl overflow-hidden border border-amber-900/60 shadow-2xl bg-zinc-950 flex flex-col justify-between select-none ${
        isRumbling ? 'anim-rumble' : ''
      }`}
    >
      {/* Background Environment Image */}
      <img
        src={bgUrl}
        alt="Arena Background"
        className="absolute inset-0 w-full h-full object-cover object-center filter brightness-40 contrast-125 transition-all duration-700 pointer-events-none"
      />

      {/* Atmospheric Radial Gradients */}
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-black/75 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-black/40 to-black/90 pointer-events-none" />

      {/* Procedural Canvas VFX Layer */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-20"
      />

      {/* ─────────────────────────────────────────────────────────── */}
      {/* COMBAT VIEW (Hero bottom-left, Monster top-right)           */}
      {/* ─────────────────────────────────────────────────────────── */}
      {inCombat && monster ? (
        <div className="relative z-10 w-full h-full flex flex-col justify-between p-2.5 sm:p-3 pointer-events-none">
          {/* UPPER RIGHT: MONSTER UNIT */}
          <div className="flex flex-col items-end w-full pl-4">
            {/* Monster Stats HUD */}
            <div className="bg-zinc-950/90 backdrop-blur-md px-2.5 py-1 rounded-xl border border-red-900/80 shadow-2xl w-44 sm:w-52 mb-1 text-right">
              <div className="flex items-center justify-between text-[10px] font-cinzel font-bold text-red-100">
                <span className="truncate font-bold">{monster.name}</span>
                <span className="text-[8px] font-mono text-red-400 shrink-0 ml-1">
                  Lv.{monster.level}{monster.powerRating ? ` • ⚡${monster.powerRating}` : ''}
                </span>
              </div>
              
              <div className="flex items-center justify-between text-[8px] font-mono text-zinc-400 my-0.5">
                <span>HP</span>
                <span className="text-red-300 font-bold">{monsterHp} / {monsterMaxHp}</span>
              </div>

              <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-700/80">
                <div
                  className="h-full bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 transition-all duration-300 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.7)]"
                  style={{ width: `${monsterHpPct}%` }}
                />
              </div>
            </div>

            <div
              ref={monsterCardRef}
              className={`relative flex flex-col items-center mr-2 ${monsterAnimClass || 'animate-idle'}`}
            >
              {/* Radial Ground Pedestal Glow */}
              <div className="absolute -bottom-1.5 w-24 h-5 bg-red-600/25 rounded-full blur-md -z-10" />

              {/* Monster Artwork Frame */}
              <div
                onClick={() => setPreviewData({
                  src: getMonsterImageUrl(monster.id, monster.isBoss),
                  title: monster.name,
                  subtitle: `Level ${monster.level}${monster.powerRating ? ` • ⚡${monster.powerRating} Power` : ''} ${monster.isBoss ? 'Act Guardian Boss' : 'Monster'}`,
                  badge: monster.isBoss ? 'BOSS GUARDIAN' : 'MONSTER',
                  theme: monster.isBoss ? 'BOSS' : 'MONSTER',
                })}
                className="relative w-20 h-26 sm:w-22 sm:h-30 rounded-2xl overflow-hidden border-2 border-red-500/90 shadow-2xl bg-zinc-900 pointer-events-auto cursor-pointer hover:scale-105 active:scale-95 transition-all duration-200 group"
              >
                <img
                  src={getMonsterImageUrl(monster.id, monster.isBoss)}
                  alt={monster.name}
                  className="w-full h-full object-cover object-center filter contrast-110 group-hover:brightness-110 transition-all"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                {monster.isBoss && (
                  <span className="absolute top-1 right-1 text-[8px] font-mono bg-red-950/90 text-red-200 border border-red-500/70 px-1 py-0.2 rounded font-bold uppercase shadow">
                    Boss
                  </span>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <span className="text-[9px] bg-red-950/90 text-red-200 px-1 py-0.5 rounded border border-red-500/80 font-mono font-bold">⛶ Expand</span>
                </div>
              </div>

              {/* Monster Floating Damage Text Container */}
              {floaters.filter(f => f.target === 'MONSTER').map(f => (
                <div
                  key={f.id}
                  className={`absolute -top-3 sm:-top-5 font-cinzel font-black text-sm sm:text-base pointer-events-none z-30 anim-float-up ${
                    f.type === 'crit'
                      ? 'text-amber-300 drop-shadow-[0_0_8px_rgba(245,158,11,0.9)] text-lg'
                      : f.type === 'heal'
                      ? 'text-emerald-400 drop-shadow-[0_0_6px_rgba(16,185,129,0.8)]'
                      : 'text-red-400 drop-shadow-[0_0_6px_rgba(239,68,68,0.8)]'
                  }`}
                >
                  {f.type === 'crit' ? `💥 ${f.text}!` : f.text}
                </div>
              ))}
            </div>
          </div>

          {/* LOWER LEFT: PLAYER HERO UNIT (Side-by-Side Horizontal Layout to Prevent Any Clipping) */}
          <div className="flex flex-col items-start w-full pr-4">
            <div className="flex items-end gap-2.5 w-full">
              <div
                ref={heroCardRef}
                className={`relative flex flex-col items-center ml-1 shrink-0 ${heroAnimClass || 'animate-idle'}`}
              >
                {/* Radial Ground Pedestal Glow */}
                <div className="absolute -bottom-1.5 w-26 h-5 bg-amber-500/25 rounded-full blur-md -z-10" />

                {/* Hero Artwork Frame */}
                <div
                  onClick={() => setPreviewData({
                    src: getHeroImageUrl(player.heroClass),
                    title: player.name || player.heroClass || 'Maharlika Hero',
                    subtitle: `Level ${player.level} ${player.heroClass || 'Maharlika'}`,
                    badge: 'HERO',
                    theme: 'HERO',
                  })}
                  className="relative w-20 h-26 sm:w-22 sm:h-30 rounded-2xl overflow-hidden border-2 border-amber-500/90 shadow-2xl bg-zinc-900 pointer-events-auto cursor-pointer hover:scale-105 active:scale-95 transition-all duration-200 group"
                >
                  <img
                    src={getHeroImageUrl(player.heroClass)}
                    alt={player.name}
                    className="w-full h-full object-cover object-top filter contrast-110 group-hover:brightness-110 transition-all"
                  />
                  {isGuarding && (
                    <span className="absolute top-1 left-1 text-[8px] font-mono bg-blue-950/95 text-cyan-200 border border-cyan-500/80 px-1 py-0.2 rounded font-bold uppercase shadow animate-pulse">
                      🛡️ Guard
                    </span>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <span className="text-[9px] bg-amber-950/90 text-amber-200 px-1 py-0.5 rounded border border-amber-500/80 font-mono font-bold">⛶ Expand</span>
                  </div>
                </div>

                {/* Hero Floating Damage / Text Container */}
                {floaters.filter(f => f.target === 'HERO').map(f => (
                  <div
                    key={f.id}
                    className={`absolute -top-3 sm:-top-5 font-cinzel font-black text-sm sm:text-base pointer-events-none z-30 anim-float-up ${
                      f.type === 'dodge'
                        ? 'text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.9)]'
                        : f.type === 'parry'
                        ? 'text-blue-300 drop-shadow-[0_0_8px_rgba(59,130,246,0.9)] text-base'
                        : f.type === 'heal'
                        ? 'text-emerald-400 drop-shadow-[0_0_6px_rgba(16,185,129,0.8)]'
                        : 'text-red-400 drop-shadow-[0_0_6px_rgba(239,68,68,0.8)]'
                    }`}
                  >
                    {f.text}
                  </div>
                ))}
              </div>

              {/* Hero Stats HUD (Beside Hero Card) */}
              <div className="bg-zinc-950/90 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-amber-900/80 shadow-2xl flex-1 max-w-[200px] sm:max-w-[240px] text-left mb-0.5">
                <div className="flex items-center justify-between text-[10px] font-cinzel font-bold text-amber-100">
                  <div className="flex items-center gap-1 truncate">
                    <span className="truncate font-bold">{player.name || player.heroClass || 'Maharlika'}</span>
                    {isGuarding && (
                      <span className="text-[7px] bg-amber-500 text-zinc-950 font-mono font-bold px-1 rounded">GUARD</span>
                    )}
                  </div>
                  <span className="text-[8px] font-mono text-amber-400/90 shrink-0 ml-1">Lv.{player.level} {player.heroClass ? `(${player.heroClass})` : ''}</span>
                </div>
                
                <div className="mt-0.5">
                  <div className="flex items-center justify-between text-[8px] font-mono text-amber-300 mb-0.5">
                    <span className="font-bold flex items-center gap-0.5">❤️ HP</span>
                    <span>{heroHp} / {heroMaxHp}</span>
                  </div>
                  <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-700/80">
                    <div
                      className="h-full bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 transition-all duration-300 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.7)]"
                      style={{ width: `${heroHpPct}%` }}
                    />
                  </div>
                </div>

                <div className="mt-0.5">
                  <div className="flex items-center justify-between text-[8px] font-mono text-cyan-300 mb-0.5">
                    <span className="font-bold flex items-center gap-0.5">✨ MP</span>
                    <span>{heroMp} / {heroMaxMp}</span>
                  </div>
                  <div className="h-1 bg-zinc-900 rounded-full overflow-hidden border border-zinc-700/80">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-600 to-blue-400 transition-all duration-300 rounded-full shadow-[0_0_6px_rgba(6,182,212,0.6)]"
                      style={{ width: `${heroMpPct}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ─────────────────────────────────────────────────────────── */
        /* EXPLORATION / OUT-OF-COMBAT EVENT VIEW                     */
        /* ─────────────────────────────────────────────────────────── */
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-3 text-center">
          {questEncounter ? (
            /* Active Regional Side Quest Discovery Encounter Card */
            <div className="flex flex-col items-center animate-fade-in max-w-xs">
              <div className="relative group max-w-[150px] sm:max-w-[170px] mb-2">
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-cyan-500 via-amber-500 to-emerald-600 opacity-80 blur-md" />
                <div
                  onClick={() => setPreviewData({
                    src: getQuestGiverImageUrl(questEncounter.giver),
                    title: questEncounter.giver,
                    subtitle: `Side Quest: ${questEncounter.title} — ${questEncounter.objectiveText}`,
                    badge: 'REGIONAL QUEST GIVER',
                    theme: 'EVENT',
                  })}
                  className="relative w-28 h-38 sm:w-32 sm:h-42 rounded-2xl overflow-hidden border-2 border-amber-400 shadow-2xl bg-zinc-950 cursor-pointer hover:scale-105 active:scale-95 transition-all duration-200 group"
                >
                  <img
                    src={getQuestGiverImageUrl(questEncounter.giver)}
                    alt={questEncounter.giver}
                    className="w-full h-full object-cover object-center filter contrast-110 group-hover:brightness-110 transition-all"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <span className="text-[9px] bg-amber-950/90 text-amber-200 px-1 py-0.5 rounded border border-amber-500/80 font-mono font-bold">⛶ Expand</span>
                  </div>
                  <div className="absolute top-1.5 left-1.5 bg-black/80 backdrop-blur-sm border border-amber-500/60 text-amber-300 font-mono text-[8px] font-bold px-1.5 py-0.5 rounded shadow">
                    📜 Quest Giver
                  </div>
                </div>
              </div>

              <div className="bg-zinc-950/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-amber-900/80 shadow-2xl text-center max-w-[260px] sm:max-w-xs">
                <span className="text-[8px] font-mono text-cyan-400 uppercase font-bold tracking-widest">
                  📜 REGIONAL SIDE QUEST
                </span>
                <h3 className="text-xs font-cinzel font-bold text-amber-200 mt-0.5">
                  {questEncounter.giver}
                </h3>
                <p className="text-[10px] font-mono font-semibold text-amber-300 mt-0.5 line-clamp-1">
                  [{questEncounter.title}]
                </p>
                <p className="text-[8.5px] font-mono text-zinc-300 mt-0.5 line-clamp-2">
                  {questEncounter.objectiveText} ({questEncounter.progressRequired} needed)
                </p>
              </div>
            </div>
          ) : activeEncounter ? (
            /* Active Interactive Encounter Card (Trader or Chest) */
            <div className="flex flex-col items-center animate-fade-in max-w-xs">
              <div className="relative group max-w-[150px] sm:max-w-[170px] mb-2">
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-amber-500 to-red-600 opacity-70 blur-md" />
                <div
                  onClick={() => setPreviewData({
                    src: getEventImageUrl(activeEncounter.type),
                    title: activeEncounter.title,
                    subtitle: activeEncounter.description,
                    badge: 'SPECIAL SECTOR ENCOUNTER',
                    theme: 'EVENT',
                  })}
                  className="relative w-28 h-38 sm:w-32 sm:h-42 rounded-2xl overflow-hidden border-2 border-amber-500/90 shadow-2xl bg-zinc-900 cursor-pointer hover:scale-105 active:scale-95 transition-all duration-200 group"
                >
                  <img
                    src={getEventImageUrl(activeEncounter.type)}
                    alt={activeEncounter.title}
                    className="w-full h-full object-cover object-center filter contrast-110 group-hover:brightness-110 transition-all"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <span className="text-[9px] bg-amber-950/90 text-amber-200 px-1 py-0.5 rounded border border-amber-500/80 font-mono font-bold">⛶ Expand</span>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-950/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-amber-900/80 shadow-2xl">
                <span className="text-[8px] font-mono text-amber-400 uppercase font-bold tracking-widest">
                  SPECIAL SECTOR ENCOUNTER
                </span>
                <h3 className="text-xs font-cinzel font-bold text-amber-200 mt-0.5">
                  {activeEncounter.title}
                </h3>
                <p className="text-[9px] font-mono text-zinc-300 mt-0.5 line-clamp-2">
                  {activeEncounter.description}
                </p>
              </div>
            </div>
          ) : explorationEvent ? (
            /* Non-interactive Exploration Discovery (Shrine, Cache, Altar, etc.) */
            <div className="flex flex-col items-center animate-fade-in max-w-xs">
              <div className="relative group max-w-[150px] sm:max-w-[170px] mb-2">
                <div
                  className={`absolute -inset-1 rounded-2xl opacity-70 blur-md ${
                    explorationEvent.toLowerCase().includes('shrine') ||
                    explorationEvent.toLowerCase().includes('altar') ||
                    explorationEvent.toLowerCase().includes('spirit') ||
                    explorationEvent.toLowerCase().includes('aura') ||
                    explorationEvent.toLowerCase().includes('babaylan')
                      ? 'bg-gradient-to-br from-cyan-500 to-emerald-600'
                      : 'bg-gradient-to-br from-amber-500 to-yellow-600'
                  }`}
                />
                {(() => {
                  const eventImgSrc = explorationEvent.toLowerCase().includes('shrine') ||
                    explorationEvent.toLowerCase().includes('altar') ||
                    explorationEvent.toLowerCase().includes('spirit') ||
                    explorationEvent.toLowerCase().includes('aura') ||
                    explorationEvent.toLowerCase().includes('tonic') ||
                    explorationEvent.toLowerCase().includes('babaylan')
                      ? getEventImageUrl('SHRINE')
                      : explorationEvent.toLowerCase().includes('cache') ||
                        explorationEvent.toLowerCase().includes('jar') ||
                        explorationEvent.toLowerCase().includes('pottery') ||
                        explorationEvent.toLowerCase().includes('artifact')
                      ? getEventImageUrl('CACHE')
                      : getEventImageUrl('CURSED_CHEST');

                  const isSanctuary = explorationEvent.toLowerCase().includes('shrine') ||
                    explorationEvent.toLowerCase().includes('altar') ||
                    explorationEvent.toLowerCase().includes('spirit') ||
                    explorationEvent.toLowerCase().includes('aura');

                  return (
                    <div
                      onClick={() => setPreviewData({
                        src: eventImgSrc,
                        title: isSanctuary ? 'Ancestral Spirit Sanctuary' : 'Pre-Colonial Treasure Cache',
                        subtitle: explorationEvent,
                        badge: 'EXPLORATION DISCOVERY',
                        theme: 'EVENT',
                      })}
                      className="relative w-28 h-38 sm:w-32 sm:h-42 rounded-2xl overflow-hidden border-2 border-amber-500/90 shadow-2xl bg-zinc-900 cursor-pointer hover:scale-105 active:scale-95 transition-all duration-200 group"
                    >
                      <img
                        src={eventImgSrc}
                        alt="Exploration Event"
                        className="w-full h-full object-cover object-center filter contrast-110 group-hover:brightness-110 transition-all"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                        <span className="text-[9px] bg-amber-950/90 text-amber-200 px-1 py-0.5 rounded border border-amber-500/80 font-mono font-bold">⛶ Expand</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="bg-zinc-950/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-amber-900/80 shadow-2xl max-w-[260px] sm:max-w-xs text-center">
                <span className="text-[8px] font-mono text-amber-400 uppercase font-bold tracking-widest">
                  {explorationEvent.toLowerCase().includes('shrine') ||
                  explorationEvent.toLowerCase().includes('altar') ||
                  explorationEvent.toLowerCase().includes('spirit') ||
                  explorationEvent.toLowerCase().includes('aura')
                    ? '✨ ANCESTRAL SPIRIT SANCTUARY'
                    : '🎁 PRE-COLONIAL TREASURE CACHE'}
                </span>
                <p className="text-[9.5px] font-mono text-amber-100 mt-0.5 leading-snug">
                  {explorationEvent}
                </p>
              </div>
            </div>
          ) : arenaOutcome ? (
            /* Dedicated Arena Outcome Card (Victory, Chest Unsealed, Merchant Trade, Fled from Battle, Shrine) */
            <div className="flex flex-col items-center animate-fade-in max-w-sm px-2 w-full">
              <div className="relative group max-w-[140px] sm:max-w-[160px] mb-2">
                <div
                  className={`absolute -inset-1 rounded-2xl opacity-75 blur-md ${
                    arenaOutcome.type === 'VICTORY'
                      ? 'bg-gradient-to-br from-amber-400 via-yellow-500 to-emerald-500'
                      : arenaOutcome.isPositive
                      ? 'bg-gradient-to-br from-emerald-500 to-amber-500'
                      : 'bg-gradient-to-br from-amber-600 to-red-600'
                  }`}
                />
                <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 border-amber-500/90 shadow-2xl bg-zinc-950 flex flex-col items-center justify-center p-2 text-center">
                  <span className={`text-3xl sm:text-4xl drop-shadow-[0_0_12px_rgba(245,158,11,0.5)] ${arenaOutcome.type === 'VICTORY' ? 'animate-bounce' : ''}`}>
                    {arenaOutcome.type === 'VICTORY'
                      ? '🎉'
                      : arenaOutcome.type === 'FLEE'
                      ? '🏃'
                      : arenaOutcome.type === 'CHEST'
                      ? arenaOutcome.isPositive ? '✨' : '☠️'
                      : arenaOutcome.type === 'MERCHANT'
                      ? '🛍️'
                      : arenaOutcome.type === 'SHRINE'
                      ? '⛩️'
                      : '🏺'}
                  </span>
                  <span className="text-[8.5px] font-mono font-bold text-amber-300 uppercase tracking-widest mt-1">
                    {arenaOutcome.badge || (arenaOutcome.isPositive ? 'SECURED' : 'RESOLVED')}
                  </span>
                </div>
              </div>

              <div className="bg-zinc-950/95 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-amber-500/70 shadow-2xl max-w-[320px] sm:max-w-sm w-full text-center space-y-1.5">
                <h3 className="text-xs sm:text-base font-cinzel font-bold text-amber-200">
                  {arenaOutcome.title}
                </h3>
                {arenaOutcome.type === 'VICTORY' && arenaOutcome.enemyName ? (
                  <p className="text-[11px] font-mono text-zinc-300 leading-snug">
                    Defeated <strong className="text-amber-300">{arenaOutcome.enemyName}</strong>!
                  </p>
                ) : (
                  <p className="text-[9.5px] font-mono text-zinc-300 leading-snug">
                    {arenaOutcome.description}
                  </p>
                )}
                {arenaOutcome.type === 'VICTORY' && arenaOutcome.expReward !== undefined && arenaOutcome.cowrieReward !== undefined ? (
                  <p className="text-[10px] font-mono text-zinc-300">
                    Earned <strong className="text-emerald-400">+{arenaOutcome.expReward} EXP</strong> and <strong className="text-yellow-400">+{arenaOutcome.cowrieReward} Cowrie Shells</strong>.
                  </p>
                ) : arenaOutcome.costOrReward ? (
                  <div className="text-[10px] font-mono font-bold text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-600/40 inline-block mt-0.5">
                    {arenaOutcome.costOrReward}
                  </div>
                ) : null}

                {/* Live Active Contract Progress Badges (for Victory) */}
                {arenaOutcome.bounties && arenaOutcome.bounties.length > 0 && (
                  <div className="space-y-1 pt-0.5 w-full">
                    {arenaOutcome.bounties.map((b) => (
                      <div
                        key={b.id}
                        className="bg-purple-950/80 border border-purple-500/60 px-2.5 py-1 rounded-lg text-[9.5px] font-mono text-purple-200 flex justify-between items-center w-full shadow-sm"
                      >
                        <span className="truncate pr-1 text-left">🎯 Contract: <strong>{b.title}</strong></span>
                        <span className={`font-bold shrink-0 ${b.isCompleted ? 'text-emerald-400' : 'text-amber-300'}`}>
                          {b.isCompleted ? '✅ DONE!' : `${b.currentCount} / ${b.targetCount}`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Loot Details (Mutya Shards, Legendary Gear, Memories, Level Up) */}
                {arenaOutcome.details && arenaOutcome.details.length > 0 && (
                  <div className="space-y-0.5 pt-0.5">
                    {arenaOutcome.details.map((detail, idx) => (
                      <div key={idx} className="text-[9.5px] font-mono text-emerald-400 font-medium">
                        {detail}
                      </div>
                    ))}
                  </div>
                )}

                <div className="text-[8.5px] font-mono text-zinc-400 pt-1.5 border-t border-zinc-800/80 flex items-center justify-center gap-1">
                  <span>⚡</span>
                  <span>Choose <strong>[Venture Forward]</strong> or <strong>[Search Area]</strong> below</span>
                </div>
              </div>
            </div>
          ) : (
            /* Sector Exploration Ambient View */
            <div className="flex flex-col items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md rounded-2xl border border-amber-900/60 max-w-sm mx-auto shadow-2xl space-y-1.5">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-xl shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                🧭
              </div>
              <h3 className="text-sm sm:text-base font-cinzel font-bold text-amber-200 tracking-wide">
                {locationName}
              </h3>
              {locationSubtitle && (
                <p className="text-[10px] font-mono text-zinc-400">
                  {locationSubtitle}
                </p>
              )}
              {fledStatusMessage ? (
                <div className="text-[9.5px] font-mono text-amber-300 bg-amber-950/80 px-3.5 py-1 rounded-full border border-amber-500/70 shadow-lg mt-1 flex items-center justify-center gap-1.5 animate-pulse">
                  <span>🏃</span>
                  <span>{fledStatusMessage}</span>
                </div>
              ) : hasSeenSectorIntro ? (
                <div className="text-[9px] font-mono text-amber-300/90 bg-black/60 px-3 py-1 rounded-full border border-amber-900/40 mt-1">
                  Sector scouted. Choose [Venture Forward] or [Search Area] to advance.
                </div>
              ) : (
                <div className="text-[9px] font-mono text-zinc-300 bg-black/60 px-3 py-1 rounded-full border border-amber-900/40 mt-1">
                  Treading carefully through the sector canopy. Venture forward to scout.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* UNIVERSAL ARTWORK GALLERY LIGHTBOX PREVIEW OVERLAY          */}
      {/* ─────────────────────────────────────────────────────────── */}
      {previewData && typeof document !== 'undefined' && createPortal(
        <div
          onClick={() => setPreviewData(null)}
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 animate-fade-in select-none"
        >
          <div
            onClick={(e) => {
              // Tap-to-shrink gesture: clicking anywhere inside or on background closes
              setPreviewData(null);
            }}
            className="relative flex flex-col items-center max-w-lg w-full"
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setPreviewData(null)}
              className="absolute -top-12 right-0 sm:-right-4 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-zinc-900/90 border border-amber-500/60 text-amber-300 hover:text-white hover:bg-red-900/80 text-xl font-bold transition-all shadow-xl z-10"
              aria-label="Close artwork preview"
            >
              ✕
            </button>

            {/* Expanded Artwork Display Box */}
            <div
              className={`relative max-h-[70vh] w-auto rounded-2xl overflow-hidden border-2 shadow-2xl bg-zinc-950 ${
                previewData.theme === 'HERO'
                  ? 'border-amber-500/90 shadow-[0_0_35px_rgba(245,158,11,0.5)]'
                  : previewData.theme === 'BOSS' || previewData.theme === 'MONSTER'
                  ? 'border-red-500/90 shadow-[0_0_35px_rgba(239,68,68,0.6)]'
                  : 'border-cyan-400/90 shadow-[0_0_35px_rgba(6,182,212,0.5)]'
              }`}
            >
              <img
                src={previewData.src}
                alt={previewData.title}
                className="max-h-[65vh] w-auto max-w-[85vw] sm:max-w-md object-contain filter contrast-110"
              />
            </div>

            {/* Caption & Metadata Header */}
            <div className="mt-3 bg-zinc-950/90 border border-amber-900/60 backdrop-blur-md px-4 py-2.5 rounded-xl shadow-2xl text-center max-w-md w-full space-y-0.5">
              {previewData.badge && (
                <span
                  className={`text-[9px] font-mono font-bold tracking-widest uppercase px-2 py-0.5 rounded border ${
                    previewData.theme === 'HERO'
                      ? 'bg-amber-950/80 text-amber-300 border-amber-600/60'
                      : previewData.theme === 'BOSS' || previewData.theme === 'MONSTER'
                      ? 'bg-red-950/80 text-red-300 border-red-600/60'
                      : 'bg-cyan-950/80 text-cyan-300 border-cyan-600/60'
                  }`}
                >
                  {previewData.badge}
                </span>
              )}
              <h3 className="text-base sm:text-lg font-cinzel font-bold text-amber-200">
                {previewData.title}
              </h3>
              {previewData.subtitle && (
                <p className="text-xs font-mono text-zinc-300">
                  {previewData.subtitle}
                </p>
              )}
              <p className="text-[9px] font-mono text-zinc-500 pt-1">
                (Tap anywhere or press ESC to shrink)
              </p>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
});

TactileCombatStage.displayName = 'TactileCombatStage';
