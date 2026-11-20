import React from 'react';
import { useApp } from '../../lib/store';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container fixed bottom-5 right-5 z-50 flex flex-col space-y-2.5 max-w-sm sm:max-w-md w-full pointer-events-none px-3 sm:px-0">
      {toasts.map(toast => {
        const iconWrappers = {
          success: 'bg-[#0D9488]/10 text-[#0D9488] dark:bg-teal-950/60 dark:text-teal-400',
          warning: 'bg-[#D97706]/10 text-[#D97706] dark:bg-amber-950/60 dark:text-amber-400',
          error: 'bg-[#E11D48]/10 text-[#E11D48] dark:bg-rose-950/60 dark:text-rose-400',
          info: 'bg-[#1E3A8A]/10 text-[#1E3A8A] dark:bg-blue-950/60 dark:text-blue-400',
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
            className="pointer-events-auto bg-white dark:bg-slate-900 shadow-lg rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 transition-all duration-200 ease-in-out flex items-start gap-3"
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
              className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 p-1 rounded-md transition cursor-pointer"
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
