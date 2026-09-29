import React from 'react';

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'danger' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  title,
  message,
  confirmText = 'Proceed',
  cancelText = 'Cancel',
  type = 'warning',
  onConfirm,
  onCancel,
}) => {
  let borderColor = 'border-amber-500/80';
  let buttonBg = 'bg-amber-600 hover:bg-amber-500 text-zinc-950';

  if (type === 'danger') {
    borderColor = 'border-red-500/80';
    buttonBg = 'bg-red-600 hover:bg-red-500 text-white';
  }

  const lines = message.split('\n').filter(Boolean);

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in select-none">
      <div className={`bg-gradient-to-b from-zinc-900 via-zinc-950 to-zinc-950 border-2 ${borderColor} rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl relative`}>
        <div className="flex items-center space-x-2.5">
          <span className="text-2xl">🔮</span>
          <h3 className="text-lg font-bold font-serif text-amber-200">{title}</h3>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 space-y-2 text-xs font-mono text-zinc-300 leading-relaxed max-h-[60vh] overflow-y-auto">
          {lines.map((line, idx) => (
            <p
              key={idx}
              className={
                line.startsWith('⚠️') || line.startsWith('If the ritual fails') || line.startsWith('PERMANENTLY')
                  ? 'text-red-300 font-bold'
                  : line.startsWith('Item:') || line.startsWith('Attempt:') || line.startsWith('Cost:')
                  ? 'text-amber-300 font-semibold'
                  : ''
              }
            >
              {line}
            </p>
          ))}
        </div>

        <div className="flex justify-end space-x-3 pt-2 font-mono text-xs">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl transition-all"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-5 py-2 ${buttonBg} font-bold rounded-xl shadow-lg transition-all active:scale-95`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

