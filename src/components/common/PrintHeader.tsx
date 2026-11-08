import React from 'react';
import { useApp } from '../../lib/store';
import { ShieldCheck } from 'lucide-react';

interface PrintHeaderProps {
  title: string;
  subtitle?: string;
  docNumber?: string;
}

export const PrintHeader: React.FC<PrintHeaderProps> = ({ title, subtitle, docNumber }) => {
  const { sppgConfig } = useApp();

  return (
    <div className="print-header mb-6 pb-4 border-b-2 border-slate-900 dark:border-slate-100">
      <div className="flex items-center justify-between gap-4">
        <div className="w-16 h-16 rounded-xl bg-blue-900 flex items-center justify-center text-white shrink-0 shadow-sm print:border print:border-black">
          <ShieldCheck className="w-9 h-9" />
        </div>
        <div className="flex-1 text-center">
          <h2 className="text-sm font-semibold tracking-wider uppercase text-slate-700 dark:text-slate-300">
            {sppgConfig.foundationName}
          </h2>
          <h1 className="text-lg md:text-xl font-black uppercase text-blue-950 dark:text-white tracking-wide">
            {sppgConfig.sppgName}
          </h1>
          <p className="text-xs font-semibold text-sky-700 dark:text-sky-400">
            Nomor Identitas SPPG: {sppgConfig.sppgId} | {sppgConfig.programName}
          </p>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
            {sppgConfig.address}, Kec. {sppgConfig.district}, {sppgConfig.regency} - Jawa Timur
          </p>
          <p className="text-[10px] text-slate-500">
            Kontak: {sppgConfig.phone} | Email: {sppgConfig.email}
          </p>
        </div>
        <div className="w-16 h-16 border border-slate-300 dark:border-slate-700 rounded-lg flex flex-col items-center justify-center p-1 text-[9px] text-center font-mono shrink-0">
          <span className="font-bold text-slate-900 dark:text-white">BGN</span>
          <span className="text-[8px] text-slate-500">VERIFIED</span>
          <span className="text-[7px] text-blue-900 font-bold">2026</span>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-300 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between text-xs">
        <div>
          <span className="font-bold uppercase text-slate-900 dark:text-white">{title}</span>
          {subtitle && <span className="text-slate-500 ml-2">({subtitle})</span>}
        </div>
        {docNumber && (
          <div className="text-slate-600 dark:text-slate-400 font-mono">
            No: <span className="font-bold">{docNumber}</span>
          </div>
        )}
      </div>
    </div>
  );
};
