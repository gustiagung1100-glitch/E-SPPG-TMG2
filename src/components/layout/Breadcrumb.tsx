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
    <nav className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-5 px-3 py-2 bg-white/70 dark:bg-slate-900/60 rounded-lg border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xs shadow-2xs">
      <button
        type="button"
        onClick={onNavigateHome}
        className="flex items-center gap-1.5 hover:text-blue-900 dark:hover:text-sky-400 font-medium transition-colors"
      >
        <Home className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
        <span>E-SPPG TMG2</span>
      </button>

      <ChevronRight className="w-3.5 h-3.5 opacity-40 shrink-0" />

      <span className="font-bold text-slate-800 dark:text-slate-100 truncate">
        {activeModuleTitle}
      </span>

      {subItemTitle && (
        <>
          <ChevronRight className="w-3.5 h-3.5 opacity-40 shrink-0" />
          <span className="text-blue-900 dark:text-sky-400 font-semibold truncate">
            {subItemTitle}
          </span>
        </>
      )}
    </nav>
  );
};
