import React from 'react';
import { useApp } from '../../lib/store';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container fixed bottom-5 right-5 z-50 flex flex-col space-y-2.5 max-w-sm sm:max-w-md w-full pointer-events-none px-3 sm:px-0">
      {toasts.map(toast => {
        const icons = {
          success: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />,
          warning: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />,
          error: <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />,
          info: <Info className="w-5 h-5 text-sky-500 shrink-0 mt-0.5" />,
        };

        const borders = {
          success: 'border-l-4 border-l-emerald-500 shadow-emerald-500/10',
          warning: 'border-l-4 border-l-amber-500 shadow-amber-500/10',
          error: 'border-l-4 border-l-rose-500 shadow-rose-500/10',
          info: 'border-l-4 border-l-sky-500 shadow-sky-500/10',
        };

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto bg-white dark:bg-slate-900 shadow-xl rounded-xl border border-slate-200/90 dark:border-slate-800/90 p-4 transition-all duration-200 flex items-start gap-3 animate-in slide-in-from-right-4 fade-in ${borders[toast.type]}`}
          >
            {icons[toast.type]}
            <div className="flex-1 min-w-0">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight">
                {toast.title}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                {toast.message}
              </p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md transition"
              aria-label="Tutup notifikasi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
