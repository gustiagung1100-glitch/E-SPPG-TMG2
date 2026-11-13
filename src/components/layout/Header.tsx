import React, { useState } from 'react';
import { useApp } from '../../lib/store';
import {
  Bell,
  Moon,
  Sun,
  Shield,
  UserCheck,
  AlertTriangle,
  ChevronDown,
  Building,
  Clock,
  Sparkles,
  KeyRound,
  LogOut,
} from 'lucide-react';
import { RoleType } from '../../types';
import { SPPGLogo, BGNLogo } from '../common/OfficialLogos';

interface HeaderProps {
  onOpenRoleSwitcher: () => void;
  onOpenAuthModal?: () => void;
  activeModuleTitle: string;
}

export const Header: React.FC<HeaderProps> = ({ onOpenRoleSwitcher, onOpenAuthModal, activeModuleTitle }) => {
  const {
    currentUser,
    switchRole,
    darkMode,
    toggleDarkMode,
    sppgConfig,
    inventory,
    purchaseOrders,
    volunteerAttendance,
    menuItems,
    logout,
  } = useApp();

  const [showNotifications, setShowNotifications] = useState(false);

  // Compute live notifications
  const criticalStockItems = inventory.filter(i => i.currentStock <= i.minimumStock);
  const pendingApprovalPOs = purchaseOrders.filter(
    p => p.status === 'Draft' || p.status === 'Menunggu Verifikasi Keuangan'
  );
  const pendingQCOrder = purchaseOrders.filter(
    p => p.status === 'Disetujui Kepala' && p.qcStatus === 'Belum QC'
  );
  const absentVolunteers = volunteerAttendance.filter(
    v => v.status === 'Sakit' || v.status === 'Izin' || v.status === 'Alpa'
  );
  const pendingMenu = menuItems.filter(m => m.status === 'Draft' || m.status === 'Diverifikasi Gizi');

  const totalAlerts =
    criticalStockItems.length +
    pendingApprovalPOs.length +
    pendingQCOrder.length +
    absentVolunteers.length +
    pendingMenu.length;

  const todayIndo = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 lg:px-8 py-3.5 transition-colors">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Organization Identity & Active Module */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="hidden sm:flex items-center gap-2.5">
            <div className="shrink-0 flex items-center justify-center">
              <SPPGLogo size="sm" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[220px]">
                  {sppgConfig.sppgName}
                </span>
                <span className="hidden md:inline-block px-1.5 py-0.5 rounded-sm bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-sky-300 font-mono text-[10px] font-bold">
                  {sppgConfig.sppgId}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {sppgConfig.foundationName} • {sppgConfig.programName}
              </p>
            </div>
          </div>

          <div className="hidden sm:block h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

          <div>
            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <Building className="w-3 h-3" />
              <span>SPPG Probolinggo</span>
              <span>/</span>
              <span className="text-blue-900 dark:text-sky-400 font-medium">
                {activeModuleTitle}
              </span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>{todayIndo}</span>
            </div>
          </div>
        </div>

        {/* Right: Notifications, Dark Mode, Role Switcher & User Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Firebase Auth & Account Button */}
          {onOpenAuthModal && (
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-900 hover:bg-blue-950 active:scale-95 text-white rounded-lg text-xs font-semibold transition-all shadow-xs border border-blue-800"
              title="Autentikasi Firebase & Akun Petugas"
            >
              <KeyRound className="w-3.5 h-3.5 text-sky-300" />
              <span className="hidden sm:inline">Akun & Auth</span>
            </button>
          )}

          {/* Quick Demo Role Switcher Button */}
          <button
            type="button"
            onClick={onOpenRoleSwitcher}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 bg-sky-50 hover:bg-sky-100/80 active:scale-95 dark:bg-sky-950/50 dark:hover:bg-sky-900/60 border border-sky-200/90 dark:border-sky-800/90 rounded-lg text-sky-900 dark:text-sky-300 text-xs font-semibold transition-all shadow-2xs"
            title="Ganti peran pengguna simulasi"
          >
            <Shield className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
            <span className="hidden md:inline">Ganti Peran:</span>
            <span className="font-bold underline decoration-sky-400 underline-offset-2 truncate max-w-[120px]">{currentUser.role}</span>
            <ChevronDown className="w-3 h-3 opacity-70 shrink-0" />
          </button>

          {/* Dark Mode Toggle */}
          <button
            type="button"
            onClick={toggleDarkMode}
            className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 active:scale-90 dark:hover:bg-slate-800 rounded-lg transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
            aria-label="Toggle dark mode"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Notifications Center */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotifications(prev => !prev)}
              className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 active:scale-90 dark:hover:bg-slate-800 rounded-lg transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700 relative"
              aria-label="Notifikasi sistem"
            >
              <Bell className="w-4 h-4" />
              {totalAlerts > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-rose-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse tabular-nums shadow-xs">
                  {totalAlerts}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Peringatan Operasional
                    </h4>
                  </div>
                  <span className="text-[10px] bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded-full font-bold">
                    {totalAlerts} Butuh Tindakan
                  </span>
                </div>

                <div className="mt-3 space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {criticalStockItems.length > 0 && (
                    <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg text-xs">
                      <div className="font-bold text-rose-800 dark:text-rose-300">
                        Stok di Bawah Batas Minimum:
                      </div>
                      <p className="text-[11px] text-rose-700 dark:text-rose-400 mt-0.5">
                        {criticalStockItems.map(i => `${i.name} (Sisa ${i.currentStock} ${i.unit})`).join(', ')}
                      </p>
                    </div>
                  )}

                  {pendingApprovalPOs.length > 0 && (
                    <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-lg text-xs">
                      <div className="font-bold text-amber-800 dark:text-amber-300">
                        PO Menunggu Persetujuan:
                      </div>
                      <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                        {pendingApprovalPOs.length} Purchase Order belum disetujui Kepala SPPG / Keuangan.
                      </p>
                    </div>
                  )}

                  {pendingQCOrder.length > 0 && (
                    <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-lg text-xs">
                      <div className="font-bold text-blue-900 dark:text-blue-300">
                        Pemeriksaan QC Belum Selesai:
                      </div>
                      <p className="text-[11px] text-blue-700 dark:text-blue-400 mt-0.5">
                        Bahan baku yang tiba memerlukan uji fisik suhu & organoleptik.
                      </p>
                    </div>
                  )}

                  {absentVolunteers.length > 0 && (
                    <div className="p-2.5 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900 rounded-lg text-xs">
                      <div className="font-bold text-orange-800 dark:text-orange-300">
                        Relawan Tidak Hadir Hari Ini:
                      </div>
                      <p className="text-[11px] text-orange-700 dark:text-orange-400 mt-0.5">
                        {absentVolunteers.map(v => `${v.volunteerName} (${v.status} - Divisi ${v.division})`).join(', ')}
                      </p>
                    </div>
                  )}

                  {totalAlerts === 0 && (
                    <div className="py-6 text-center text-xs text-slate-500">
                      Semua sistem dan alur operasional berjalan normal tanpa kendala.
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium"
                  >
                    Tutup Notifikasi
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Mini Block & Logout */}
          <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200 dark:border-slate-800">
            <div className="w-8 h-8 rounded-full bg-blue-900 dark:bg-sky-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
              {currentUser.name.charAt(0)}
            </div>
            <div className="hidden xl:block text-left">
              <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight truncate max-w-[140px]">
                {currentUser.name}
              </div>
              <div className="text-[10px] text-sky-700 dark:text-sky-400 font-medium leading-tight">
                {currentUser.role}
              </div>
            </div>
            <button
              type="button"
              onClick={logout}
              title="Keluar dari sistem"
              aria-label="Keluar dari sistem"
              className="ml-1 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-rose-700 hover:bg-rose-50 hover:border-rose-200 dark:hover:text-rose-300 dark:hover:bg-rose-950/50 dark:hover:border-rose-800 text-xs font-semibold transition-all active:scale-95"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Keluar</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
