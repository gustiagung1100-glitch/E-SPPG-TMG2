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
    <nav className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-6">
      <button
        type="button"
        onClick={onNavigateHome}
        className="flex items-center gap-1 hover:text-blue-900 dark:hover:text-sky-400 transition"
      >
        <Home className="w-3.5 h-3.5" />
        <span>E-SPPG TMG2</span>
      </button>

      <ChevronRight className="w-3.5 h-3.5 opacity-50" />

      <span className="font-semibold text-slate-800 dark:text-slate-200">
        {activeModuleTitle}
      </span>

      {subItemTitle && (
        <>
          <ChevronRight className="w-3.5 h-3.5 opacity-50" />
          <span className="text-blue-900 dark:text-sky-400 font-medium">
            {subItemTitle}
          </span>
        </>
      )}
    </nav>
  );
};
