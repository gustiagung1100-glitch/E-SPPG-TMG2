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
  Store,
  PackageCheck,
  Sparkles,
} from 'lucide-react';
import { SPPGLogo } from '../common/OfficialLogos';

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
  const { currentUser, inventory, purchaseOrders, volunteerAttendance, volunteerAbsences } = useApp();

  // Badges
  const isSupplier = currentUser.role === 'Supplier / Mitra Pangan';
  const supplierPOs = purchaseOrders.filter(
    p => !currentUser.supplierName || p.supplierName === currentUser.supplierName
  );
  const pendingSupplierConfirmCount = supplierPOs.filter(
    p => p.supplierDeliveryStatus === 'Menunggu Konfirmasi'
  ).length;

  const lowStockCount = inventory.filter(i => i.currentStock <= i.minimumStock).length;
  const pendingPOCount = purchaseOrders.filter(
    p => p.status === 'Draft' || p.status === 'Menunggu Verifikasi Keuangan'
  ).length;
  const pendingAbsenceApprovalCount = volunteerAbsences.filter(
    v => v.approvalStatus === 'Menunggu Persetujuan'
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

  // Strict isolation for supplier role: NO finance, NO institutions/students, NO internal kitchen logs
  const supplierSections: NavSection[] = [
    {
      title: 'PORTAL MITRA REKANAN',
      items: [
        {
          key: 'supplier_portal',
          label: 'Pesanan & PO Bahan',
          icon: <PackageCheck className="w-4 h-4 shrink-0 text-emerald-400" />,
          badge: pendingSupplierConfirmCount > 0 ? pendingSupplierConfirmCount : undefined,
          badgeColor: 'bg-emerald-500 text-white',
        },
      ],
    },
    {
      title: 'AKUN & PENGATURAN',
      items: [
        {
          key: 'settings',
          label: 'Profil Rekanan & Sandi',
          icon: <Settings className="w-4 h-4 shrink-0" />,
        },
      ],
    },
  ];

  const standardSections: NavSection[] = [
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
        {
          key: 'menu_flyer',
          label: 'Flyer Menu Otomatis',
          icon: <Sparkles className="w-4 h-4 shrink-0 text-amber-400" />,
        },
      ],
    },
    {
      title: 'RANTAI PASOK',
      items: [
        {
          key: 'procurement',
          label: 'Modul PLOK (RAB, PO, QC)',
          icon: <ShoppingCart className="w-4 h-4 shrink-0" />,
          badge: pendingPOCount > 0 ? pendingPOCount : undefined,
          badgeColor: 'bg-amber-500 text-white',
        },
        {
          key: 'supplier_portal',
          label: 'Portal Mitra Supplier',
          icon: <Store className="w-4 h-4 shrink-0" />,
          badge: pendingSupplierConfirmCount > 0 ? pendingSupplierConfirmCount : undefined,
          badgeColor: 'bg-emerald-500 text-white',
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
          label: 'Relawan & Ketidakhadiran',
          icon: <Users2 className="w-4 h-4 shrink-0" />,
          badge: pendingAbsenceApprovalCount > 0 ? pendingAbsenceApprovalCount : undefined,
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

  const sections = isSupplier ? supplierSections : standardSections;

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
        className={`fixed lg:static top-0 bottom-0 left-0 z-40 bg-[#142B4A] text-slate-200 border-r border-white/10 flex flex-col transition-all duration-300 ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-white/10 bg-[#142B4A]">
          {!isCollapsed ? (
            <div className="flex items-center gap-3">
              <div className="shrink-0 flex items-center justify-center">
                <SPPGLogo size="sm" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-extrabold tracking-wide text-white leading-tight">
                  E-SPPG TMG2
                </h1>
                <p className="text-[10px] text-teal-300/90 truncate">
                  Sistem Informasi Pemenuhan Gizi
                </p>
              </div>
            </div>
          ) : (
            <div className="mx-auto shrink-0 flex items-center justify-center">
              <SPPGLogo size="sm" />
            </div>
          )}

          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
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
                <div className="px-3 pb-1.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase select-none">
                  {section.title}
                </div>
              )}
              <div className="space-y-0.5">
                {section.items.map(item => {
                  const isActive = activeModule === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => {
                        onSelectModule(item.key);
                        onCloseMobile();
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 relative group ${
                        isActive
                          ? 'bg-[#0F766E] text-white shadow-xs before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-1 before:bg-[#F2D58B] before:rounded-r-sm'
                          : 'text-slate-300 hover:bg-white/8 hover:text-white'
                      } ${isCollapsed ? 'justify-center' : 'justify-between'}`}
                      title={item.label}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`transition-transform duration-150 ${isActive ? 'scale-105' : 'group-hover:scale-105'}`}>
                          {item.icon}
                        </span>
                        {!isCollapsed && (
                          <span className="truncate tracking-tight">{item.label}</span>
                        )}
                      </div>

                      {item.badge !== undefined && !isCollapsed && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md tabular-nums ${
                            item.badgeColor || 'bg-[#2563EB] text-white'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}

                      {/* Compact badge on collapsed */}
                      {item.badge !== undefined && isCollapsed && (
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#DC2626]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-white/10 bg-[#10243E] text-[11px] text-slate-300">
          {!isCollapsed ? (
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-white">Krejengan Temenggungan</div>
                <div className="text-[10px] text-teal-300 font-mono">MBG-2026-v2.4</div>
              </div>
              <div className="w-2 h-2 rounded-full bg-[#16A34A]" title="Sistem Aktif" />
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-2 h-2 rounded-full bg-[#16A34A]" title="Sistem Aktif" />
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
