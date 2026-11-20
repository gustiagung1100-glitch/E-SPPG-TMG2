import React from 'react';
import { useApp } from '../../lib/store';
import { canRoleAccessModule } from '../../lib/routeGuard';
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
  HandCoins,
  Coins,
  X,
} from 'lucide-react';
import { SPPGLogo } from '../common/OfficialLogos';

interface SidebarProps {
  activeModule: ModuleKey;
  onSelectModule: (module: ModuleKey) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isDesktopHidden?: boolean;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeModule,
  onSelectModule,
  isCollapsed,
  onToggleCollapse,
  isDesktopHidden = false,
  isMobileOpen,
  onCloseMobile,
}) => {
  const { currentUser, roleModuleAccess, inventory, purchaseOrders, volunteerAttendance, volunteerAbsences } = useApp();

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
          key: 'pic_incentives',
          label: 'Insentif PIC Lembaga',
          icon: <HandCoins className="w-4 h-4 shrink-0" />,
        },
        {
          key: 'volunteer_incentives',
          label: 'Insentif Relawan',
          icon: <Coins className="w-4 h-4 shrink-0" />,
        },
        {
          key: 'petty_cash',
          label: 'Kas Petty Cash',
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

  const extraSupplierItems = isSupplier
    ? standardSections
        .flatMap(sec => sec.items)
        .filter(
          item =>
            item.key !== 'supplier_portal' &&
            item.key !== 'settings' &&
            canRoleAccessModule(currentUser.role, item.key, roleModuleAccess)
        )
    : [];

  const rawSections = isSupplier
    ? extraSupplierItems.length > 0
      ? [
          ...supplierSections,
          { title: 'MODUL TAMBAHAN', items: extraSupplierItems },
        ]
      : supplierSections
    : standardSections;

  const sections = rawSections
    .map(section => ({
      ...section,
      items: section.items.filter(item =>
        canRoleAccessModule(currentUser.role, item.key, roleModuleAccess)
      ),
    }))
    .filter(section => section.items.length > 0);

  const isExpandedView = !isCollapsed || isMobileOpen;

  const getRoleAliasLabel = (role: string): string => {
    switch (role) {
      case 'Admin Utama':
        return 'Admin Pusat · Akses Penuh';
      case 'Pengawas Gizi':
        return 'Ahli Gizi · Antropometri & Menu';
      case 'Asisten Lapangan':
        return 'Kader Lapangan · Distribusi & Sekolah';
      case 'Kepala SPPG':
        return 'Kepala Unit · Otorisasi SPPG';
      case 'Pengawas Keuangan':
        return 'Akuntansi · Insentif & Kas';
      default:
        return 'Operasional SPPG';
    }
  };

  return (
    <>
      {/* Mobile & Tablet Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container - Institutional Navy Collapsible */}
      <aside
        aria-label="Navigasi Utama E-SPPG"
        className={`fixed lg:sticky lg:top-0 lg:h-screen top-0 bottom-0 left-0 z-50 lg:z-40 bg-gradient-to-b from-[#1E3A8A] via-[#172554] to-[#0F172A] text-white border-r border-blue-900/60 shadow-xl flex flex-col transition-all duration-200 ease-in-out shrink-0 ${
          isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        } ${
          isDesktopHidden
            ? 'w-72 sm:w-64 lg:w-0 lg:min-w-0 lg:overflow-hidden lg:border-r-0 lg:opacity-0 lg:pointer-events-none'
            : isCollapsed
            ? 'w-72 sm:w-64 lg:w-20'
            : 'w-72 sm:w-64'
        }`}
      >
        {/* Slim Brand Row aligned cleanly with Header */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-white/10 bg-black/15 shrink-0">
          {isExpandedView ? (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="shrink-0 flex items-center justify-center bg-white/95 rounded-lg p-0.5 shadow-xs">
                <SPPGLogo size="sm" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-bold tracking-tight text-white leading-tight truncate">
                  E-SPPG TMG2
                </h1>
                <p className="text-[11px] text-blue-200 truncate">
                  Pemenuhan Gizi MBG
                </p>
              </div>
            </div>
          ) : (
            <div className="mx-auto shrink-0 flex items-center justify-center bg-white/95 rounded-lg p-0.5 shadow-xs">
              <SPPGLogo size="sm" />
            </div>
          )}

          <div className="flex items-center gap-1 shrink-0">
            {/* Desktop Collapse to Icon Strip */}
            <button
              type="button"
              onClick={onToggleCollapse}
              className="hidden lg:flex p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/15 transition-all duration-200 cursor-pointer"
              title={isCollapsed ? 'Perluas Sidebar' : 'Ciutkan Sidebar ke Mode Ikon'}
              aria-label={isCollapsed ? 'Perluas Sidebar' : 'Ciutkan Sidebar ke Mode Ikon'}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>

            {/* Mobile & Tablet Close Drawer Icon */}
            <button
              type="button"
              onClick={onCloseMobile}
              className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg text-blue-100 hover:text-white hover:bg-white/15 active:scale-95 transition-all duration-200 cursor-pointer"
              title="Tutup Sidebar Navigasi"
              aria-label="Tutup Sidebar Navigasi"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Active RBAC Identity Card */}
        {isExpandedView && (
          <div className="mx-3 mt-3 px-3 py-2.5 rounded-xl bg-white/10 border border-white/15 shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <ShieldCheck className="w-4 h-4 text-teal-300 shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">{currentUser.name}</div>
                <div className="text-[11px] font-semibold text-blue-200 truncate">{currentUser.role}</div>
                <div className="text-[10px] text-slate-300 truncate">{getRoleAliasLabel(currentUser.role)}</div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 scrollbar-thin">
          {sections.map((section, sIdx) => (
            <div key={sIdx}>
              {isExpandedView && (
                <div className="px-3 pb-1.5 text-[10px] font-bold tracking-wider text-blue-200/75 uppercase select-none">
                  {section.title}
                </div>
              )}
              <div className="space-y-1">
                {section.items.map(item => {
                  const isActive = activeModule === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      aria-current={isActive ? 'page' : undefined}
                      onClick={() => {
                        onSelectModule(item.key);
                        onCloseMobile();
                      }}
                      className={`w-full min-h-[42px] lg:min-h-[38px] flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all duration-200 ease-in-out relative group cursor-pointer ${
                        isActive
                          ? 'bg-white text-[#1E3A8A] font-bold shadow-sm'
                          : 'text-slate-200 font-medium hover:bg-white/10 hover:text-white'
                      } ${!isExpandedView ? 'justify-center' : 'justify-between'}`}
                      title={item.label}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`shrink-0 transition-colors duration-200 ${
                            isActive ? 'text-[#1E3A8A]' : 'text-blue-200/90 group-hover:text-white'
                          }`}
                        >
                          {item.icon}
                        </span>
                        {isExpandedView && (
                          <span className="truncate tracking-tight">{item.label}</span>
                        )}
                      </div>

                      {item.badge !== undefined && isExpandedView && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full tabular-nums ${
                            item.badgeColor || 'bg-[#0D9488] text-white'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}

                      {/* Compact badge on collapsed */}
                      {item.badge !== undefined && !isExpandedView && (
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#E11D48] ring-2 ring-[#1E3A8A]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Clean Sidebar Footer */}
        <div className="px-4 py-3 border-t border-white/10 bg-black/20 text-[11px] text-slate-300 shrink-0">
          {isExpandedView ? (
            <div className="flex items-center justify-between gap-2">
              <div className="truncate">
                <div className="font-semibold text-white truncate">Krejengan Temenggungan</div>
                <div className="text-[10px] text-blue-200/80">SPPG Temenggungan 2</div>
              </div>
            </div>
          ) : (
            <div className="text-center font-bold text-[10px] text-blue-200">TMG2</div>
          )}
        </div>
      </aside>
    </>
  );
};
