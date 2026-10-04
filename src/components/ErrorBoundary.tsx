// src/components/ErrorBoundary.tsx
// Atmospheric Maharlika Error Boundary — catches any unhandled render or lifecycle crash
// and renders an in-theme recovery UI instead of an empty dark screen.

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error?.message || 'An unexpected spirit disturbance occurred.' };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Maharlika ErrorBoundary Catch]:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetLocal = () => {
    try {
      // Clear session/volatile flags if needed, or reload
      window.location.reload();
    } catch {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-zinc-950 flex flex-col items-center justify-center p-4 text-amber-100 font-mono select-none">
          <div className="max-w-md w-full bg-zinc-900/90 border-2 border-red-800/80 rounded-2xl p-6 shadow-2xl space-y-4 text-center">
            <div className="text-4xl animate-bounce">⚡</div>
            <h2 className="text-lg font-serif font-bold text-red-400">
              Spiritual Veil Disturbance
            </h2>
            <p className="text-xs text-zinc-300 leading-relaxed font-sans">
              The archipelago energies encountered an unexpected anomaly. Your character save progress is preserved in local storage.
            </p>
            <div className="p-2.5 bg-black/60 rounded-lg border border-red-900/40 text-[10px] text-red-300/80 font-mono text-left break-all max-h-24 overflow-y-auto">
              {this.state.errorMessage}
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={this.handleReload}
                className="flex-1 py-2.5 px-3 bg-gradient-to-r from-amber-700 to-amber-900 hover:from-amber-600 hover:to-amber-800 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all active:scale-95 shadow-lg"
              >
                🔄 Restore Realm
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

