import React from 'react';
import { useApp } from '../../lib/store';
import { SPPGLogo, BGNLogo } from './OfficialLogos';

interface PrintHeaderProps {
  title: string;
  subtitle?: string;
  docNumber?: string;
  documentNumber?: string;
  date?: string;
}

export const PrintHeader: React.FC<PrintHeaderProps> = ({ title, subtitle, docNumber, documentNumber, date }) => {
  const { sppgConfig } = useApp();
  const activeDocNumber = docNumber || documentNumber;

  return (
    <div className="print-header mb-6 pb-4 border-b-2 border-slate-900 dark:border-slate-100 print:border-black">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Official SPPG Yayasan Hafshawaty Logo */}
        <div className="shrink-0 flex items-center justify-center">
          <SPPGLogo size="lg" />
        </div>

        {/* Center: Official Kop Surat Text */}
        <div className="flex-1 text-center px-2">
          <h2 className="text-xs sm:text-sm font-bold tracking-wider uppercase text-slate-700 dark:text-slate-300 print:text-black">
            {sppgConfig.foundationName}
          </h2>
          <h1 className="text-base sm:text-lg md:text-xl font-black uppercase text-blue-950 dark:text-white tracking-wide print:text-black">
            {sppgConfig.sppgName}
          </h1>
          <p className="text-xs font-bold text-sky-800 dark:text-sky-400 print:text-black mt-0.5">
            Nomor Identitas SPPG: <span className="font-mono">{sppgConfig.sppgId}</span> | {sppgConfig.programName}
          </p>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 print:text-black mt-0.5">
            {sppgConfig.address}, Kec. {sppgConfig.district}, {sppgConfig.regency} - Jawa Timur
          </p>
          <p className="text-[10px] text-slate-500 print:text-black">
            Kontak: {sppgConfig.phone} | Email: {sppgConfig.email}
          </p>
        </div>

        {/* Right: Official Badan Gizi Nasional (BGN) RI Logo */}
        <div className="shrink-0 flex flex-col items-center justify-center">
          <BGNLogo size="lg" />
          <span className="text-[8px] font-black uppercase tracking-wider text-blue-950 dark:text-white print:text-black mt-1">
            BGN RI
          </span>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-300 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between text-xs">
        <div>
          <span className="font-bold uppercase text-slate-900 dark:text-white">{title}</span>
          {subtitle && <span className="text-slate-500 ml-2">({subtitle})</span>}
        </div>
        {activeDocNumber && (
          <div className="text-slate-600 dark:text-slate-400 font-mono">
            No: <span className="font-bold">{activeDocNumber}</span>
          </div>
        )}
      </div>
    </div>
  );
};
