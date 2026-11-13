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
          success: 'bg-[#16A34A]/10 text-[#16A34A] dark:bg-emerald-950/60 dark:text-emerald-400',
          warning: 'bg-[#D97706]/10 text-[#D97706] dark:bg-amber-950/60 dark:text-amber-400',
          error: 'bg-[#DC2626]/10 text-[#DC2626] dark:bg-rose-950/60 dark:text-rose-400',
          info: 'bg-[#2563EB]/10 text-[#2563EB] dark:bg-blue-950/60 dark:text-blue-400',
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
            className="pointer-events-auto bg-white dark:bg-slate-900 shadow-lg shadow-[#142B4A]/10 rounded-xl border border-[#E2E8F0] dark:border-slate-800 p-4 transition-all duration-200 flex items-start gap-3 animate-in slide-in-from-right-4 fade-in"
          >
            <div className={`p-1.5 rounded-lg shrink-0 ${iconWrappers[toast.type]}`}>
              {icons[toast.type]}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs sm:text-sm font-bold text-[#1F2937] dark:text-white leading-tight">
                {toast.title}
              </h4>
              <p className="text-xs text-[#64748B] dark:text-slate-300 mt-1 leading-relaxed">
                {toast.message}
              </p>
            </div>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="text-[#64748B] hover:text-[#1F2937] dark:hover:text-slate-200 p-1 rounded-md transition"
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
