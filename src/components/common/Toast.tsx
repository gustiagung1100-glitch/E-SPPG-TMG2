import React from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../../lib/store';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0 || typeof document === 'undefined') return null;

  return createPortal(
    <div className="toast-container fixed inset-x-3 top-3 sm:inset-x-auto sm:top-5 sm:right-5 z-[75] flex flex-col space-y-2.5 sm:max-w-md sm:w-full pointer-events-none">
      {toasts.map(toast => {
        const iconWrappers = {
          success: 'bg-teal-50 text-[#0D9488] border border-teal-200/70 dark:bg-teal-950/60 dark:text-teal-400 dark:border-teal-800/60',
          warning: 'bg-amber-50 text-[#D97706] border border-amber-200/70 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800/60',
          error: 'bg-rose-50 text-[#E11D48] border border-rose-200/70 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800/60',
          info: 'bg-blue-50 text-[#1E3A8A] border border-blue-200/70 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-800/60',
        };

        const accentBar = {
          success: 'border-l-4 border-l-[#0D9488]',
          warning: 'border-l-4 border-l-[#D97706]',
          error: 'border-l-4 border-l-[#E11D48]',
          info: 'border-l-4 border-l-[#1E3A8A]',
        };

        const icons = {
          success: <CheckCircle2 className="w-4 h-4 shrink-0" />,
          warning: <AlertTriangle className="w-4 h-4 shrink-0" />,
          error: <AlertCircle className="w-4 h-4 shrink-0" />,
          info: <Info className="w-4 h-4 shrink-0" />,
        };

        return (
          <div
            key={toast.id}
            role="status"
            aria-live="polite"
            className={`animate-toastIn pointer-events-auto bg-white dark:bg-slate-900 shadow-lg rounded-xl border border-slate-200/80 dark:border-slate-800 ${accentBar[toast.type]} p-3.5 sm:p-4 transition-all duration-200 ease-out flex items-start gap-3`}
          >
            <div className={`p-1.5 rounded-lg shrink-0 ${iconWrappers[toast.type]}`}>
              {icons[toast.type]}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight">
                {toast.title}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                {toast.message}
              </p>
            </div>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 p-1 rounded-md transition-all duration-200 active:scale-[0.98] cursor-pointer"
              aria-label="Tutup notifikasi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>,
    document.body
  );
};
