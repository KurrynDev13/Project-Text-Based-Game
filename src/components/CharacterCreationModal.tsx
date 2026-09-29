// CharacterCreationModal.tsx
// Full-screen 2-step character creation modal for Maharlika: Legends of the Archipelago.
// Step 1: Class selection (4 clickable cards), Step 2: Hero name input.
// No backdrop dismiss — player must complete creation.

import React, { useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type HeroClass = 'Mandirigma' | 'Bagani' | 'Mangangaso' | 'Babaylan';

interface ClassInfo {
  heroClass: HeroClass;
  icon: string;
  title: string;
  subtitle: string;
  primaryStat: string;
  weaponType: string;
  description: string;
  startingStats: { str: number; agi: number; int: number; vit: number };
}

interface CharacterCreationModalProps {
  onComplete: (heroClass: HeroClass, name: string) => void;
}

// ─── Class Data ───────────────────────────────────────────────────────────────

const CLASS_DATA: ClassInfo[] = [
  {
    heroClass: 'Mandirigma',
    icon: '⚔️',
    title: 'Mandirigma',
    subtitle: 'Battle-Hardened Warrior',
    primaryStat: 'STR',
    weaponType: 'Swords & Cleavers',
    description:
      'A fearless warrior who fights with overwhelming force and Kampilan blade mastery. Built for frontline combat.',
    startingStats: { str: 14, agi: 9, int: 8, vit: 14 },
  },
  {
    heroClass: 'Bagani',
    icon: '🌑',
    title: 'Bagani',
    subtitle: 'Shadow Blade of the Night',
    primaryStat: 'AGI',
    weaponType: 'Daggers & Balisong',
    description:
      'A silent predator who strikes from the darkness with lethal precision and Balisong flurry techniques.',
    startingStats: { str: 9, agi: 15, int: 10, vit: 11 },
  },
  {
    heroClass: 'Mangangaso',
    icon: '🏹',
    title: 'Mangangaso',
    subtitle: 'Forest Hunter & Tracker',
    primaryStat: 'AGI',
    weaponType: 'Bows & Blowguns',
    description:
      'A skilled hunter who commands the battlefield from range, delivering poison darts and precise Pinaka bow shots.',
    startingStats: { str: 10, agi: 14, int: 11, vit: 10 },
  },
  {
    heroClass: 'Babaylan',
    icon: '🌿',
    title: 'Babaylan',
    subtitle: 'Spirit Shaman & Healer',
    primaryStat: 'INT',
    weaponType: 'Staves & Wands',
    description:
      'A powerful shaman who channels ancestor spirits and divine magic to heal allies and smite the profane.',
    startingStats: { str: 8, agi: 9, int: 16, vit: 12 },
  },
];

// ─── Name Validation ──────────────────────────────────────────────────────────

/** Returns true if the name is 2–24 chars, using only letters, spaces, and apostrophes. */
function isValidName(name: string): boolean {
  return /^[A-Za-z ']{2,24}$/.test(name.trim());
}

// ─── Stat Bar ─────────────────────────────────────────────────────────────────

const StatBar: React.FC<{ label: string; value: number; max?: number }> = ({
  label,
  value,
  max = 16,
}) => (
  <div className="flex items-center gap-2 text-xs">
    <span className="w-7 text-amber-400 font-mono font-bold">{label}</span>
    <div className="flex-1 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
      <div
        className="h-full bg-amber-500 rounded-full"
        style={{ width: `${(value / max) * 100}%` }}
      />
    </div>
    <span className="w-4 text-amber-300 font-mono text-right">{value}</span>
  </div>
);

// ─── Class Card ───────────────────────────────────────────────────────────────

const ClassCard: React.FC<{
  data: ClassInfo;
  selected: boolean;
  onSelect: () => void;
}> = ({ data, selected, onSelect }) => (
  <button
    type="button"
    onClick={onSelect}
    className={`relative flex flex-col gap-2 p-4 rounded-xl text-left transition-all duration-200 min-h-[44px]
      ${
        selected
          ? 'border-2 border-amber-400 ring-2 ring-amber-400/30 shadow-lg shadow-amber-500/20 bg-zinc-800/80'
          : 'border-2 border-zinc-700 hover:border-amber-700/60 bg-zinc-800/40 hover:bg-zinc-800/70'
      }`}
    aria-pressed={selected}
  >
    {/* Selected indicator */}
    {selected && (
      <span className="absolute top-2 right-2 text-amber-400 text-sm font-bold">✓</span>
    )}

    {/* Icon + Title */}
    <div className="flex items-center gap-3">
      <span className="text-3xl">{data.icon}</span>
      <div>
        <h3 className="font-serif text-amber-200 font-bold text-base leading-tight">{data.title}</h3>
        <p className="text-zinc-400 text-xs">{data.subtitle}</p>
      </div>
    </div>

    {/* Weapon type */}
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-zinc-500">Weapon:</span>
      <span className="text-xs text-amber-300 font-medium">{data.weaponType}</span>
      <span className="ml-auto text-xs bg-amber-900/50 text-amber-400 px-1.5 py-0.5 rounded font-mono">
        {data.primaryStat}
      </span>
    </div>

    {/* Description */}
    <p className="text-zinc-400 text-xs leading-relaxed">{data.description}</p>

    {/* Starting Stats */}
    <div className="space-y-1 pt-1 border-t border-zinc-700/60">
      <p className="text-zinc-500 text-xs mb-1">Starting Stats</p>
      <StatBar label="STR" value={data.startingStats.str} />
      <StatBar label="AGI" value={data.startingStats.agi} />
      <StatBar label="INT" value={data.startingStats.int} />
      <StatBar label="VIT" value={data.startingStats.vit} />
    </div>
  </button>
);

// ─── Compressed Class Badge (Step 2) ─────────────────────────────────────────

const CompressedClassBadge: React.FC<{ data: ClassInfo }> = ({ data }) => (
  <div className="flex items-center gap-3 p-3 rounded-xl border border-amber-700/40 bg-zinc-800/60">
    <span className="text-2xl">{data.icon}</span>
    <div>
      <p className="font-serif text-amber-200 font-bold text-sm">{data.title}</p>
      <p className="text-zinc-400 text-xs">{data.subtitle}</p>
    </div>
    <div className="ml-auto text-xs bg-amber-900/50 text-amber-400 px-2 py-1 rounded font-mono">
      {data.primaryStat}
    </div>
  </div>
);

// ─── Main Modal ───────────────────────────────────────────────────────────────

const CharacterCreationModal: React.FC<CharacterCreationModalProps> = ({ onComplete }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedClass, setSelectedClass] = useState<HeroClass | null>(null);
  const [heroName, setHeroName] = useState('');

  const selectedClassData = CLASS_DATA.find((c) => c.heroClass === selectedClass) ?? null;
  const nameValid = isValidName(heroName);

  const handleContinue = () => {
    if (selectedClass) setStep(2);
  };

  const handleBegin = () => {
    if (selectedClass && nameValid) {
      onComplete(selectedClass, heroName.trim());
    }
  };

  return (
    // Full-screen overlay — no onClick on backdrop to prevent accidental dismiss
    <div className="fixed inset-0 z-50 bg-zinc-950/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border-2 border-amber-800/60 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">

        {/* ── STEP 1: Class Selection ── */}
        {step === 1 && (
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
              <h1 className="font-serif text-amber-200 text-3xl font-bold tracking-wide">
                Choose Your Path
              </h1>
              <p className="text-zinc-400 text-sm max-w-md mx-auto">
                Your heritage and class define your fighting style for all of Maharlika
              </p>
            </div>

            {/* Class Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {CLASS_DATA.map((cls) => (
                <ClassCard
                  key={cls.heroClass}
                  data={cls}
                  selected={selectedClass === cls.heroClass}
                  onSelect={() => setSelectedClass(cls.heroClass)}
                />
              ))}
            </div>

            {/* Continue Button */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleContinue}
                disabled={!selectedClass}
                className="min-h-[44px] px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-200
                  bg-amber-700 hover:bg-amber-600 text-amber-100 disabled:opacity-40 disabled:cursor-not-allowed
                  shadow-lg shadow-amber-900/30"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Name Input ── */}
        {step === 2 && selectedClassData && (
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
              <h1 className="font-serif text-amber-200 text-2xl font-bold tracking-wide">
                Name Your Hero
              </h1>
            </div>

            {/* Compressed class preview */}
            <CompressedClassBadge data={selectedClassData} />

            {/* Name Input */}
            <div className="space-y-3">
              <label
                htmlFor="hero-name"
                className="block font-serif text-amber-300 text-base font-semibold"
              >
                What is your name, warrior?
              </label>
              <input
                id="hero-name"
                type="text"
                value={heroName}
                onChange={(e) => setHeroName(e.target.value)}
                placeholder="Enter your hero's name..."
                maxLength={24}
                className="w-full min-h-[44px] px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-600
                  focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40 outline-none
                  text-amber-100 placeholder-zinc-500 text-sm transition-colors"
              />
              {/* Validation hint */}
              {heroName.length > 0 && !nameValid && (
                <p className="text-red-400 text-xs">
                  Name must be 2–24 characters (letters, spaces, apostrophes only).
                </p>
              )}
              <p className="text-zinc-600 text-xs">
                2–24 characters · Letters, spaces, and apostrophes only
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-4 pt-2">
              {/* Back link */}
              <button
                type="button"
                onClick={() => setStep(1)}
                className="min-h-[44px] px-4 py-2 text-sm text-zinc-400 hover:text-amber-300 transition-colors"
              >
                ← Back
              </button>

              {/* Begin CTA */}
              <button
                type="button"
                onClick={handleBegin}
                disabled={!nameValid}
                className="min-h-[44px] px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-200
                  bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500
                  text-amber-100 disabled:opacity-40 disabled:cursor-not-allowed
                  shadow-lg shadow-amber-900/30"
              >
                Begin Your Legend
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CharacterCreationModal;
