import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { ModuleKey } from '../../types';

interface BreadcrumbProps {
  activeModule: ModuleKey;
  activeModuleTitle: string;
  onNavigateHome: () => void;
  subItemTitle?: string;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  activeModuleTitle,
  onNavigateHome,
  subItemTitle,
}) => {
  return (
    <nav
      aria-label="Breadcrumb navigasi aktif"
      className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300 mb-5 px-3.5 py-2.5 bg-white dark:bg-slate-900 rounded-xl border border-[#E2E8F0] dark:border-slate-800 shadow-[0_1px_2px_rgba(20,43,74,0.03)]"
    >
      <ol className="flex flex-wrap items-center gap-1.5 sm:gap-2 min-w-0">
        <li>
          <button
            type="button"
            onClick={onNavigateHome}
            className="inline-flex items-center gap-1.5 min-h-[32px] px-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[#142B4A] dark:hover:text-teal-300 font-semibold transition-colors duration-150 cursor-pointer"
          >
            <Home className="w-3.5 h-3.5 text-[#0F766E] dark:text-teal-400 shrink-0" />
            <span>E-SPPG TMG2</span>
          </button>
        </li>

        <li aria-hidden="true">
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
        </li>

        <li className="min-w-0">
          <span
            aria-current={subItemTitle ? undefined : 'page'}
            className={`truncate block max-w-[200px] sm:max-w-xs ${
              subItemTitle
                ? 'font-semibold text-slate-700 dark:text-slate-300'
                : 'font-bold text-[#142B4A] dark:text-white'
            }`}
          >
            {activeModuleTitle}
          </span>
        </li>

        {subItemTitle && (
          <>
            <li aria-hidden="true">
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
            </li>
            <li className="min-w-0">
              <span
                aria-current="page"
                className="font-bold text-[#0F766E] dark:text-teal-300 truncate block max-w-[220px] sm:max-w-sm"
              >
                {subItemTitle}
              </span>
            </li>
          </>
        )}
      </ol>

      <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 shrink-0">
        <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true" />
        <span>Aktif: {subItemTitle || activeModuleTitle}</span>
      </div>
    </nav>
  );
};
