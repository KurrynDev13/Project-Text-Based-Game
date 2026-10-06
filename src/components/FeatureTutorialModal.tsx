// FeatureTutorialModal.tsx
// Guided tutorial modal displayed when new game features are unlocked.
// Slides up from bottom on mobile; centered on desktop.
// Exports both FeatureTutorialModal and the TutorialStep type.

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { registerBackHandler } from '../utils/navigationStack';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TutorialStep {
  title: string;
  icon: string;
  description: string;
  tip?: string;
}

interface FeatureTutorialModalProps {
  tutorialId: string;
  featureName: string;
  steps: TutorialStep[];
  /** Called when the player completes all steps — marks tutorial as seen. */
  onComplete: () => void;
  /** Called when the player skips — also marks tutorial as seen. */
  onSkip: () => void;
}

// ─── Dot Indicator ────────────────────────────────────────────────────────────

const StepDots: React.FC<{ total: number; current: number }> = ({ total, current }) => (
  <div className="flex items-center justify-center gap-1.5">
    {Array.from({ length: total }, (_, i) => (
      <div
        key={i}
        className={`rounded-full transition-all duration-200
          ${i === current
            ? 'w-4 h-2 bg-amber-500'
            : 'w-2 h-2 bg-zinc-600'
          }`}
      />
    ))}
  </div>
);

// ─── Main Modal ───────────────────────────────────────────────────────────────

const FeatureTutorialModal: React.FC<FeatureTutorialModalProps> = ({
  tutorialId,
  featureName,
  steps,
  onComplete,
  onSkip,
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  useEffect(() => {
    return registerBackHandler(() => {
      if (!isFirstStep) {
        setCurrentStep((prev) => prev - 1);
        return true;
      }
      onSkip();
      return true;
    });
  }, [isFirstStep, onSkip]);

  if (!step) return null;

  const modalContent = (
    // Overlay — aligns to bottom on mobile, center on md+
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-end md:items-center justify-center p-4">
      {/* Card — slides up from bottom (mobile) via translate, rounded corners adjust for mobile sheet */}
      <div
        data-tutorial-id={tutorialId}
        className="bg-zinc-900 border border-amber-700/50 rounded-t-2xl md:rounded-2xl
          max-w-md w-full p-5 space-y-5
          animate-[slideUp_0.25s_ease-out_forwards]"
        style={{ animationName: 'slideUp' }}
      >
        {/* ── Header Row: Feature Name + Skip ── */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-zinc-500 text-xs font-mono uppercase tracking-wider mb-0.5">
              New Feature Unlocked
            </p>
            <h2 className="font-serif text-amber-200 text-base font-bold leading-tight">
              {featureName}
            </h2>
          </div>

          {/* Skip button — prominent, zinc style */}
          <button
            type="button"
            onClick={onSkip}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center px-3 py-2 rounded-xl
              bg-zinc-800 hover:bg-zinc-700 border border-zinc-600/60 text-zinc-400 hover:text-zinc-200
              text-xs font-medium transition-colors shrink-0"
          >
            Skip Tutorial
          </button>
        </div>

        {/* ── Step Counter ── */}
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>{currentStep + 1} of {steps.length}</span>
          <StepDots total={steps.length} current={currentStep} />
          <span className="invisible">{currentStep + 1} of {steps.length}</span>{/* spacer for centering */}
        </div>

        {/* ── Step Content ── */}
        <div className="space-y-4">
          {/* Icon */}
          <div className="flex justify-center">
            <span
              className="text-5xl drop-shadow-[0_0_10px_rgba(251,191,36,0.3)]"
              role="img"
              aria-label={step.title}
            >
              {step.icon}
            </span>
          </div>

          {/* Title */}
          <h3 className="font-serif text-amber-200 text-lg font-bold text-center leading-snug">
            {step.title}
          </h3>

          {/* Description */}
          <p className="text-zinc-300 text-sm leading-relaxed text-center">
            {step.description}
          </p>

          {/* Optional Tip Box */}
          {step.tip && (
            <div className="flex gap-3 px-4 py-3 bg-amber-950/50 border border-amber-700/40 rounded-xl">
              <span className="text-amber-400 text-sm shrink-0 mt-0.5">💡</span>
              <p className="text-amber-200 text-xs leading-relaxed">{step.tip}</p>
            </div>
          )}
        </div>

        {/* ── Navigation Buttons ── */}
        <div className="flex items-center gap-3 pt-1">
          {/* Previous */}
          <button
            type="button"
            onClick={handlePrev}
            disabled={isFirstStep}
            className="min-h-[44px] px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200
              bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300
              disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          {/* Next / Got It */}
          <button
            type="button"
            onClick={handleNext}
            className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl font-bold text-sm transition-all duration-200
              bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500
              text-amber-100 shadow-md shadow-amber-900/30"
          >
            {isLastStep ? 'Got It! ✓' : 'Next →'}
          </button>
        </div>
      </div>

      {/* Keyframe animation injected via style tag — no external CSS file needed */}
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(40px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};

export { FeatureTutorialModal };
export default FeatureTutorialModal;
