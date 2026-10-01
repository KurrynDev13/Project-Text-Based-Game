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

function getToastDuration(toast: ToastMessage): number {
  if (toast.durationMs) return toast.durationMs;
  const len = toast.message.length;
  if (toast.type === 'warning' || toast.type === 'error') {
    return Math.max(1600, Math.min(2500, len * 35));
  }
  if (toast.type === 'success') {
    return Math.max(2200, Math.min(3200, len * 45));
  }
  return Math.max(1800, Math.min(2800, len * 40));
}

export const ToastBanner: React.FC<ToastBannerProps> = ({ toast, onDismiss }) => {
  useEffect(() => {
    if (!toast) return;
    const duration = getToastDuration(toast);
    const timer = setTimeout(() => {
      onDismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  let borderColor = 'border-amber-500/80';
  let bgGradient = 'from-zinc-950/95 via-amber-950/95 to-zinc-950/95';
  let textColor = 'text-amber-200';
  let defaultIcon = '✨';

  if (toast.type === 'success') {
    borderColor = 'border-emerald-500/80';
    bgGradient = 'from-zinc-950/95 via-emerald-950/95 to-zinc-950/95';
    textColor = 'text-emerald-200';
    defaultIcon = '✅';
  } else if (toast.type === 'warning' || toast.type === 'error') {
    borderColor = 'border-red-500/80';
    bgGradient = 'from-zinc-950/95 via-red-950/95 to-zinc-950/95';
    textColor = 'text-red-200';
    defaultIcon = '⚠️';
  }

  const displayIcon = toast.icon || defaultIcon;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[9999] w-[92%] max-w-md pointer-events-none select-none animate-slide-down">
      <div
        onClick={onDismiss}
        className={`pointer-events-auto w-full bg-gradient-to-r ${bgGradient} border-2 ${borderColor} text-amber-100 p-3 rounded-xl shadow-2xl backdrop-blur-xl flex items-center space-x-3 transition-all transform active:scale-95 hover:brightness-110 cursor-pointer`}
      >
        <span className="text-xl shrink-0 drop-shadow">{displayIcon}</span>
        <div className={`flex-1 text-xs font-mono font-bold ${textColor} leading-snug tracking-wide whitespace-pre-line`}>
          {toast.message}
        </div>
        <span className="text-[9px] font-mono text-zinc-400 bg-zinc-900/90 px-2 py-0.5 rounded border border-zinc-700/80 shrink-0 self-start mt-0.5">
          ✕ Dismiss
        </span>
      </div>
    </div>
  );
};

