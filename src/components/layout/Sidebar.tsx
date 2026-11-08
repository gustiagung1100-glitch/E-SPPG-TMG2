import React from 'react';
import { useApp } from '../../lib/store';
import { ModuleKey } from '../../types';
import {
  LayoutDashboard,
  UtensilsCrossed,
  School,
  ShoppingCart,
  Boxes,
  Flame,
  Truck,
  Wallet,
  Users2,
  Mail,
  FileSpreadsheet,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Database,
} from 'lucide-react';

interface SidebarProps {
  activeModule: ModuleKey;
  onSelectModule: (module: ModuleKey) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeModule,
  onSelectModule,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}) => {
  const { inventory, purchaseOrders, menuItems, volunteerAttendance } = useApp();

  // Badges
  const lowStockCount = inventory.filter(i => i.currentStock <= i.minimumStock).length;
  const pendingPOCount = purchaseOrders.filter(
    p => p.status === 'Draft' || p.status === 'Menunggu Verifikasi Keuangan'
  ).length;
  const absentCount = volunteerAttendance.filter(
    v => v.status === 'Sakit' || v.status === 'Izin' || v.status === 'Alpa'
  ).length;

  interface NavItem {
    key: ModuleKey;
    label: string;
    icon: React.ReactNode;
    badge?: number;
    badgeColor?: string;
  }

  interface NavSection {
    title: string;
    items: NavItem[];
  }

  const sections: NavSection[] = [
    {
      title: 'UTAMA',
      items: [
        {
          key: 'dashboard',
          label: 'Dashboard Terpadu',
          icon: <LayoutDashboard className="w-4 h-4 shrink-0" />,
        },
      ],
    },
    {
      title: 'DATA MASTER & GIZI',
      items: [
        {
          key: 'master_data',
          label: 'Master Data Terpadu (A-E)',
          icon: <Database className="w-4 h-4 shrink-0" />,
        },
        {
          key: 'institutions',
          label: 'Modul Penerima Manfaat',
          icon: <School className="w-4 h-4 shrink-0" />,
        },
        {
          key: 'menu',
          label: 'Perencanaan Menu & Gizi',
          icon: <UtensilsCrossed className="w-4 h-4 shrink-0" />,
        },
      ],
    },
    {
      title: 'RANTAI PASOK',
      items: [
        {
          key: 'procurement',
          label: 'Pengadaan & Purchase Order',
          icon: <ShoppingCart className="w-4 h-4 shrink-0" />,
          badge: pendingPOCount > 0 ? pendingPOCount : undefined,
          badgeColor: 'bg-amber-500 text-white',
        },
        {
          key: 'inventory',
          label: 'Gudang & Stok Bahan',
          icon: <Boxes className="w-4 h-4 shrink-0" />,
          badge: lowStockCount > 0 ? lowStockCount : undefined,
          badgeColor: 'bg-rose-500 text-white',
        },
      ],
    },
    {
      title: 'PRODUKSI & LOGISTIK',
      items: [
        {
          key: 'production',
          label: 'Dapur & Produksi MBG',
          icon: <Flame className="w-4 h-4 shrink-0" />,
        },
        {
          key: 'distribution',
          label: 'Distribusi & Armada',
          icon: <Truck className="w-4 h-4 shrink-0" />,
        },
      ],
    },
    {
      title: 'AKUNTANSI & SDM',
      items: [
        {
          key: 'finance',
          label: 'Keuangan, RAB & Kas',
          icon: <Wallet className="w-4 h-4 shrink-0" />,
        },
        {
          key: 'volunteers',
          label: 'Relawan & Presensi SDM',
          icon: <Users2 className="w-4 h-4 shrink-0" />,
          badge: absentCount > 0 ? absentCount : undefined,
          badgeColor: 'bg-orange-500 text-white',
        },
      ],
    },
    {
      title: 'ADMINISTRASI & SISTEM',
      items: [
        {
          key: 'letters',
          label: 'Tata Persuratan & SPK',
          icon: <Mail className="w-4 h-4 shrink-0" />,
        },
        {
          key: 'reports',
          label: 'Dokumentasi & Laporan BGN',
          icon: <FileSpreadsheet className="w-4 h-4 shrink-0" />,
        },
        {
          key: 'settings',
          label: 'Pengaturan & Hak Akses',
          icon: <Settings className="w-4 h-4 shrink-0" />,
        },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-40 bg-blue-950 text-slate-200 border-r border-blue-900/80 flex flex-col transition-all duration-300 ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-blue-900/80 bg-blue-950/70">
          {!isCollapsed ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-500 flex items-center justify-center text-white shadow-md shadow-sky-500/20 font-black">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-black tracking-wider text-white leading-tight">
                  E-SPPG TMG2
                </h1>
                <p className="text-[10px] text-sky-300 truncate">
                  Sistem Informasi Pemenuhan Gizi
                </p>
              </div>
            </div>
          ) : (
            <div className="mx-auto w-10 h-10 rounded-xl bg-sky-500 flex items-center justify-center text-white font-bold shadow-md">
              <ShieldCheck className="w-5 h-5" />
            </div>
          )}

          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-blue-900 transition"
            title={isCollapsed ? 'Perluas Sidebar' : 'Ciutkan Sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 scrollbar-thin">
          {sections.map((section, sIdx) => (
            <div key={sIdx}>
              {!isCollapsed && (
                <div className="px-3 pb-2 text-[10px] font-bold tracking-wider text-sky-400 uppercase">
                  {section.title}
                </div>
              )}
              <div className="space-y-1">
                {section.items.map(item => {
                  const isActive = activeModule === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => {
                        onSelectModule(item.key);
                        onCloseMobile();
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all relative ${
                        isActive
                          ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                          : 'text-slate-300 hover:bg-blue-900/60 hover:text-white'
                      } ${isCollapsed ? 'justify-center' : 'justify-between'}`}
                      title={item.label}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {item.icon}
                        {!isCollapsed && (
                          <span className="truncate">{item.label}</span>
                        )}
                      </div>

                      {item.badge !== undefined && !isCollapsed && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            item.badgeColor || 'bg-sky-400 text-blue-950'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}

                      {/* Dot badge on collapsed */}
                      {item.badge !== undefined && isCollapsed && (
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-blue-900/80 bg-blue-950/40 text-[11px] text-slate-400">
          {!isCollapsed ? (
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-200">Krejengan Temenggungan</div>
                <div className="text-[10px] text-sky-400 font-mono">MBG-2026-v2.4</div>
              </div>
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Sistem Aktif" />
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
