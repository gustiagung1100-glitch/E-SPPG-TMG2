import React from 'react';
import { SearchX, Inbox, RotateCcw } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  variant?: 'search' | 'data';
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  variant = 'data',
  icon,
  actionLabel,
  onAction,
  compact = false,
  className = '',
}) => {
  const defaultTitle =
    variant === 'search' ? 'Data Tidak Ditemukan' : 'Belum Ada Data Tersimpan';
  const defaultDescription =
    variant === 'search'
      ? 'Tidak ada entri yang cocok dengan kata kunci atau filter yang dipilih. Coba sesuaikan pencarian Anda.'
      : 'Data akan otomatis tampil di sini setelah ditambahkan atau disinkronkan.';

  return (
    <div
      className={`flex flex-col items-center justify-center text-center animate-fadeIn ${
        compact ? 'py-8 px-4' : 'py-12 px-6'
      } ${className}`}
    >
      <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-[#1E3A8A] dark:text-sky-400 flex items-center justify-center mb-3.5 shadow-xs">
        {icon || (variant === 'search' ? <SearchX className="w-5 h-5" /> : <Inbox className="w-5 h-5" />)}
      </div>
      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
        {title || defaultTitle}
      </h4>
      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-md leading-relaxed">
        {description || defaultDescription}
      </p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#1E3A8A] dark:text-sky-300 border border-slate-200/80 dark:border-slate-700 transition-all duration-200 ease-out active:scale-[0.98] cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
};
