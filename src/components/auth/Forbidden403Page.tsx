import React from 'react';
import { ShieldAlert, ArrowLeft, LogOut, Lock } from 'lucide-react';
import { useApp } from '../../lib/store';
import { getDefaultModuleForRole, getPathForModule } from '../../lib/routeGuard';
import { SPPGLogo } from '../common/OfficialLogos';

interface Forbidden403PageProps {
  deniedPath?: string;
  onBackToHome: () => void;
}

export const Forbidden403Page: React.FC<Forbidden403PageProps> = ({
  deniedPath,
  onBackToHome,
}) => {
  const { currentUser, logout, sppgConfig } = useApp();
  const safeDefaultMod = getDefaultModuleForRole(currentUser.role);
  const safeDefaultPath = getPathForModule(safeDefaultMod);

  return (
    <div className="min-h-screen w-full bg-[#F4F7FA] dark:bg-slate-950 flex items-center justify-center p-4 sm:p-6 antialiased">
      <div className="max-w-lg w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
        {/* Top Navy Header Strip */}
        <div
          className="px-6 py-5 text-white flex items-center justify-between"
          style={{
            background: 'linear-gradient(135deg, #071D49 0%, #102D63 65%, #164E91 100%)',
          }}
        >
          <div className="flex items-center gap-3">
            <SPPGLogo size="sm" />
            <div>
              <div className="text-xs font-bold tracking-wider uppercase text-[#F2D58B]">
                Keamanan RBAC E-SPPG
              </div>
              <div className="text-[11px] text-slate-200 truncate max-w-[240px]">
                {sppgConfig.sppgName}
              </div>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-md bg-rose-500/20 border border-rose-300/40 text-rose-100 font-mono text-xs font-bold">
            HTTP 403
          </span>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-8 text-center space-y-5">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center justify-center">
            <ShieldAlert className="w-8 h-8 text-rose-600 dark:text-rose-400" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold text-[#071D49] dark:text-white tracking-tight">
              403 — Akses Ditolak
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Anda tidak memiliki hak akses (RBAC) untuk membuka halaman atau modul yang diminta.
              Seluruh percobaan akses tidak sah dicatat oleh sistem keamanan SPPG.
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-4 text-left space-y-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Pengguna Aktif:</span>
              <span className="font-bold text-slate-800 dark:text-white truncate">
                {currentUser.name}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Peran (Role):</span>
              <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-sky-300 font-bold">
                {currentUser.role}
              </span>
            </div>
            {deniedPath && (
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/70 dark:border-slate-700">
                <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-rose-500" />
                  Rute Diblokir:
                </span>
                <code className="font-mono text-[11px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded">
                  {deniedPath}
                </code>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={onBackToHome}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#071D49] hover:bg-[#102D63] text-white text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-[#F2D58B]" />
              <span>Kembali ke Beranda ({safeDefaultPath})</span>
            </button>
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700 dark:text-slate-200 dark:hover:bg-rose-950/40 text-xs font-bold transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Keluar Akun</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
