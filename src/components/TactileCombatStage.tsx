import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { EnemyMonster, PlayerCharacter } from '../types/game';
import { getHeroImageUrl, getMonsterImageUrl, getEventImageUrl, getLocationBgUrl } from '../utils/assetHelper';
import { calcDerivedStats } from '../utils/gameFormulas';
import { InteractiveEncounter } from './WorldHuntView';

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
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heroCardRef = useRef<HTMLDivElement>(null);
  const monsterCardRef = useRef<HTMLDivElement>(null);

  const [floaters, setFloaters] = useState<FloatingNumber[]>([]);
  const [isRumbling, setIsRumbling] = useState<boolean>(false);

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
                <span className="text-[8px] font-mono text-red-400 shrink-0 ml-1">Lv.{monster.level}</span>
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
              <div className="relative w-20 h-26 sm:w-22 sm:h-30 rounded-2xl overflow-hidden border-2 border-red-500/90 shadow-2xl bg-zinc-900">
                <img
                  src={getMonsterImageUrl(monster.id, monster.isBoss)}
                  alt={monster.name}
                  className="w-full h-full object-cover object-center filter contrast-110"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                {monster.isBoss && (
                  <span className="absolute top-1 right-1 text-[8px] font-mono bg-red-950/90 text-red-200 border border-red-500/70 px-1 py-0.2 rounded font-bold uppercase shadow">
                    Boss
                  </span>
                )}
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
                <div className="relative w-20 h-26 sm:w-22 sm:h-30 rounded-2xl overflow-hidden border-2 border-amber-500/90 shadow-2xl bg-zinc-900">
                  <img
                    src={getHeroImageUrl(player.heroClass)}
                    alt={player.name}
                    className="w-full h-full object-cover object-top filter contrast-110"
                  />
                  {isGuarding && (
                    <span className="absolute top-1 left-1 text-[8px] font-mono bg-blue-950/95 text-cyan-200 border border-cyan-500/80 px-1 py-0.2 rounded font-bold uppercase shadow animate-pulse">
                      🛡️ Guard
                    </span>
                  )}
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
                    <span className="truncate font-bold">{player.heroClass || 'Maharlika'}</span>
                    {isGuarding && (
                      <span className="text-[7px] bg-amber-500 text-zinc-950 font-mono font-bold px-1 rounded">GUARD</span>
                    )}
                  </div>
                  <span className="text-[8px] font-mono text-amber-400/90 shrink-0 ml-1">Lv.{player.level}</span>
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
          {activeEncounter ? (
            /* Active Interactive Encounter Card (Trader or Chest) */
            <div className="flex flex-col items-center animate-fade-in max-w-xs">
              <div className="relative group max-w-[150px] sm:max-w-[170px] mb-2">
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-amber-500 to-red-600 opacity-70 blur-md" />
                <div className="relative w-28 h-38 sm:w-32 sm:h-42 rounded-2xl overflow-hidden border-2 border-amber-500/90 shadow-2xl bg-zinc-900">
                  <img
                    src={getEventImageUrl(activeEncounter.type)}
                    alt={activeEncounter.title}
                    className="w-full h-full object-cover object-center filter contrast-110"
                  />
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
                <div className="relative w-28 h-38 sm:w-32 sm:h-42 rounded-2xl overflow-hidden border-2 border-amber-500/90 shadow-2xl bg-zinc-900">
                  <img
                    src={
                      explorationEvent.toLowerCase().includes('shrine') ||
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
                        : getEventImageUrl('CURSED_CHEST')
                    }
                    alt="Exploration Event"
                    className="w-full h-full object-cover object-center filter contrast-110"
                  />
                </div>
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
              <div className="text-[9px] font-mono text-zinc-300 bg-black/60 px-3 py-1 rounded-full border border-amber-900/40 mt-1">
                Treading carefully through the sector canopy. Venture forward to scout.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

TactileCombatStage.displayName = 'TactileCombatStage';
