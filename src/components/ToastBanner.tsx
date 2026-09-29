import React, { useEffect } from 'react';

export interface ToastMessage {
  id: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  icon?: string;
  durationMs?: number;
}

interface ToastBannerProps {
  toast: ToastMessage | null;
  onDismiss: () => void;
}

export const ToastBanner: React.FC<ToastBannerProps> = ({ toast, onDismiss }) => {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, toast.durationMs || 3800);

    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  let borderColor = 'border-amber-500/80';
  let bgGradient = 'from-zinc-950 via-amber-950/90 to-zinc-950';
  let textColor = 'text-amber-200';
  let defaultIcon = '✨';

  if (toast.type === 'success') {
    borderColor = 'border-emerald-500/80';
    bgGradient = 'from-zinc-950 via-emerald-950/90 to-zinc-950';
    textColor = 'text-emerald-200';
    defaultIcon = '✅';
  } else if (toast.type === 'warning' || toast.type === 'error') {
    borderColor = 'border-red-500/80';
    bgGradient = 'from-zinc-950 via-red-950/90 to-zinc-950';
    textColor = 'text-red-200';
    defaultIcon = '⚠️';
  }

  const displayIcon = toast.icon || defaultIcon;

  return (
    <div className="fixed top-[114px] md:top-[68px] left-0 right-0 z-[100] flex justify-center px-4 pointer-events-none select-none animate-slide-down">
      <div
        onClick={onDismiss}
        className={`pointer-events-auto w-full max-w-lg bg-gradient-to-r ${bgGradient} border-2 ${borderColor} text-amber-100 p-3.5 rounded-2xl shadow-2xl backdrop-blur-xl flex items-center space-x-3 transition-all transform active:scale-95 hover:brightness-110 cursor-pointer`}
      >
        <span className="text-2xl shrink-0 drop-shadow">{displayIcon}</span>
        <div className={`flex-1 text-xs font-mono font-bold ${textColor} leading-snug tracking-wide whitespace-pre-line`}>
          {toast.message}
        </div>
        <span className="text-[9px] font-mono text-zinc-400 bg-zinc-900/90 px-2 py-1 rounded-lg border border-zinc-700/80 shrink-0 self-start mt-0.5">
          ✕ Dismiss
        </span>
      </div>
    </div>
  );
};
