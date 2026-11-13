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
    <nav className="flex items-center gap-2 text-xs text-[#64748B] dark:text-slate-400 mb-5 px-3.5 py-2.5 bg-white dark:bg-slate-900 rounded-xl border border-[#E2E8F0] dark:border-slate-800 shadow-[0_1px_2px_rgba(20,43,74,0.03)]">
      <button
        type="button"
        onClick={onNavigateHome}
        className="flex items-center gap-1.5 hover:text-[#142B4A] dark:hover:text-teal-400 font-semibold transition-colors duration-150"
      >
        <Home className="w-3.5 h-3.5 text-[#0F766E] dark:text-teal-400" />
        <span>E-SPPG TMG2</span>
      </button>

      <ChevronRight className="w-3.5 h-3.5 opacity-45 shrink-0" />

      <span className="font-bold text-[#1F2937] dark:text-slate-100 truncate">
        {activeModuleTitle}
      </span>

      {subItemTitle && (
        <>
          <ChevronRight className="w-3.5 h-3.5 opacity-45 shrink-0" />
          <span className="text-[#0F766E] dark:text-teal-400 font-semibold truncate">
            {subItemTitle}
          </span>
        </>
      )}
    </nav>
  );
};
