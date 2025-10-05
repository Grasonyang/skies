import React from 'react';

interface DialogFrameProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidthClassName?: string;
  panelClassName?: string;
  overlayClassName?: string;
  align?: 'center' | 'bottom';
  closeLabel?: string;
  hideCloseButton?: boolean;
}

const DialogFrame: React.FC<DialogFrameProps> = ({
  isOpen,
  onClose,
  children,
  maxWidthClassName = 'max-w-3xl',
  panelClassName = 'rounded-3xl bg-white/95 backdrop-blur-xl border border-white/60 shadow-[0_30px_60px_-20px_rgba(15,23,42,0.35)] p-6',
  overlayClassName = 'bg-slate-900/55 backdrop-blur-sm',
  align = 'center',
  closeLabel = '關閉',
  hideCloseButton = false,
}) => {
  if (!isOpen) return null;

  const alignmentClass =
    align === 'bottom'
      ? 'items-end md:items-center'
      : 'items-center';

  return (
    <div
      role="dialog"
      aria-modal="true"
      className={`fixed inset-0 z-40 flex ${alignmentClass} justify-center px-4 ${overlayClassName}`}
      onClick={onClose}
    >
      <div
        className={`relative w-full ${maxWidthClassName}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={`relative ${panelClassName}`}>
          {!hideCloseButton && (
            <button
              type="button"
              onClick={onClose}
              aria-label={closeLabel}
              className="group absolute -top-5 -right-5 flex items-center gap-2 rounded-full bg-white/95 px-3 py-2 text-sm font-semibold text-slate-600 shadow-lg shadow-slate-900/15 transition-all hover:-translate-y-0.5 hover:bg-rose-500/95 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-100 text-rose-500 transition-colors group-hover:bg-white/15 group-hover:text-white">
                ✕
              </span>
              <span className="hidden sm:inline">{closeLabel}</span>
            </button>
          )}

          {children}
        </div>
      </div>
    </div>
  );
};

export default DialogFrame;
