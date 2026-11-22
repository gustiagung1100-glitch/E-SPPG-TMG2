import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
}

interface ViewportBox {
  top: number;
  left: number;
  width: number;
  height: number;
}

const getActiveViewportBox = (): ViewportBox | null => {
  if (typeof window === 'undefined') return null;
  const vv = window.visualViewport;
  if (vv) {
    return {
      top: Math.max(0, Math.round(vv.offsetTop)),
      left: Math.max(0, Math.round(vv.offsetLeft)),
      width: Math.round(vv.width),
      height: Math.round(vv.height),
    };
  }
  return {
    top: 0,
    left: 0,
    width: window.innerWidth,
    height: window.innerHeight,
  };
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = '2xl',
}) => {
  const [viewportBox, setViewportBox] = useState<ViewportBox | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Sinkronkan area tampilan popup dengan layar aktif (komputer, tablet, smartphone, termasuk saat keyboard muncul)
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;

    const syncViewport = () => {
      setViewportBox(getActiveViewportBox());
    };

    syncViewport();

    const vv = window.visualViewport;
    window.addEventListener('resize', syncViewport);
    window.addEventListener('orientationchange', syncViewport);
    vv?.addEventListener('resize', syncViewport);
    vv?.addEventListener('scroll', syncViewport);

    // Kunci scroll body secara aman (mendukung modal bertumpuk)
    const body = document.body;
    const prevCount = Number(body.dataset.modalLockCount || '0');
    if (prevCount === 0) {
      body.dataset.prevOverflow = body.style.overflow || '';
      body.style.overflow = 'hidden';
    }
    body.dataset.modalLockCount = String(prevCount + 1);

    return () => {
      window.removeEventListener('resize', syncViewport);
      window.removeEventListener('orientationchange', syncViewport);
      vv?.removeEventListener('resize', syncViewport);
      vv?.removeEventListener('scroll', syncViewport);

      const currentCount = Number(body.dataset.modalLockCount || '1');
      const nextCount = Math.max(0, currentCount - 1);
      if (nextCount === 0) {
        body.style.overflow = body.dataset.prevOverflow || '';
        delete body.dataset.modalLockCount;
        delete body.dataset.prevOverflow;
      } else {
        body.dataset.modalLockCount = String(nextCount);
      }
    };
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
  };

  const isCompactViewport = viewportBox ? viewportBox.width < 640 || viewportBox.height < 640 : false;
  const verticalGap = isCompactViewport ? 16 : 36;
  const computedMaxHeight = viewportBox
    ? `${Math.max(240, viewportBox.height - verticalGap)}px`
    : 'calc(100dvh - 1.5rem)';

  const overlayStyle: React.CSSProperties | undefined = viewportBox
    ? {
        top: `${viewportBox.top}px`,
        left: `${viewportBox.left}px`,
        width: `${viewportBox.width}px`,
        height: `${viewportBox.height}px`,
      }
    : undefined;

  return createPortal(
    <div
      data-print-modal="true"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={overlayStyle}
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 lg:p-6 bg-slate-950/70 backdrop-blur-xs transition-opacity duration-200 ease-in-out overflow-hidden print:static print:inset-auto print:w-full print:h-auto print:bg-white print:p-0 print:overflow-visible print:block"
    >
      <div
        className="fixed inset-0 print:hidden"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        style={{ maxHeight: computedMaxHeight }}
        className={`relative w-full ${maxWidthClasses[maxWidth]} flex flex-col bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden z-10 transition-all duration-200 ease-in-out print:max-w-full print:max-h-none print:shadow-none print:border-none print:rounded-none print:overflow-visible print:block`}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between gap-2 px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/60 backdrop-blur-xs print:hidden">
          <div className="min-w-0 pr-2">
            <h3 className="text-sm sm:text-lg font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">
              {title}
            </h3>
            {subtitle && (
              <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 mt-0.5 truncate">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 sm:w-9 sm:h-9 flex items-center justify-center text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
            aria-label="Tutup modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div
          data-print-modal-body="true"
          className="flex-1 min-h-0 p-4 sm:p-6 overflow-y-auto overscroll-contain scrollbar-thin print:p-0 print:max-h-none print:overflow-visible"
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};
