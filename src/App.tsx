/**
 * E-SPPG TMG2 MANAGEMENT SYSTEM
 * Electronic Sistem Informasi Satuan Pelayanan Pemenuhan Gizi
 * SPPG Probolinggo Krejengan Temenggungan 2 - Yayasan Hafshawaty
 * Program Makan Bergizi Gratis (MBG)
 */

import React, { useState } from 'react';
import { AppProvider, useApp } from './lib/store';
import { ModuleKey } from './types';
import { canRoleAccessModule, getDefaultModuleForRole } from './lib/routeGuard';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { ToastContainer } from './components/common/Toast';
import { DashboardSkeleton, ModuleSkeleton } from './components/common/SkeletonLoader';
import { AuthGuard } from './components/auth/AuthGuard';
import { Forbidden403Page } from './components/auth/Forbidden403Page';

// Module Components
import { DashboardModule } from './components/modules/DashboardModule';
import { MasterDataModule } from './components/modules/MasterDataModule';
import { NutritionMenuModule } from './components/modules/NutritionMenuModule';
import { InstitutionsModule } from './components/modules/InstitutionsModule';
import { ProcurementModule } from './components/modules/ProcurementModule';
import { InventoryModule } from './components/modules/InventoryModule';
import { ProductionModule } from './components/modules/ProductionModule';
import { DistributionModule } from './components/modules/DistributionModule';
import { PICIncentiveModule } from './components/modules/PICIncentiveModule';
import { VolunteerIncentiveModule } from './components/modules/VolunteerIncentiveModule';
import { PettyCashModule } from './components/modules/PettyCashModule';
import { VolunteersModule } from './components/modules/VolunteersModule';
import { LettersModule } from './components/modules/LettersModule';
import { ReportsModule } from './components/modules/ReportsModule';
import { SettingsModule } from './components/modules/SettingsModule';
import { SupplierPortalModule } from './components/modules/SupplierPortalModule';
import { MenuFlyerModule } from './components/modules/MenuFlyerModule';

const moduleTitles: Record<ModuleKey, string> = {
  dashboard: 'Dashboard Terpadu',
  master_data: 'Master Data Terpadu (A-E)',
  institutions: 'Modul Penerima Manfaat & Presensi',
  menu: 'Perencanaan Menu & Gizi',
  menu_flyer: 'Pembuat Flyer Menu Otomatis',
  procurement: 'Modul PLOK — Operasional (RAB, PO, QC)',
  supplier_portal: 'Portal Mitra Rekanan Supplier & PO',
  inventory: 'Gudang & Stok Bahan Pangan',
  production: 'Dapur & Produksi MBG',
  distribution: 'Distribusi & Armada Pengiriman',
  pic_incentives: 'Insentif PIC Lembaga Penerima Manfaat',
  volunteer_incentives: 'Insentif Harian Relawan',
  petty_cash: 'Kas Petty Cash Operasional',
  volunteers: 'Relawan & Presensi SDM',
  letters: 'Tata Persuratan & SPK',
  reports: 'Dokumentasi & Laporan BGN',
  settings: 'Pengaturan SPPG & Hak Akses',
};

interface MainContentProps {
  activeModule: ModuleKey;
  navigateToModule: (module: ModuleKey) => void;
}

const MainContent: React.FC<MainContentProps> = ({ activeModule, navigateToModule }) => {
  const { currentUser, roleModuleAccess, isDataHydrating } = useApp();
  const [activeSubTabTitle, setActiveSubTabTitle] = useState<string | undefined>(undefined);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('esppg_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [isDesktopSidebarHidden, setIsDesktopSidebarHidden] = useState<boolean>(() => {
    try {
      return localStorage.getItem('esppg_sidebar_hidden') === 'true';
    } catch {
      return false;
    }
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  React.useEffect(() => {
    setActiveSubTabTitle(undefined);
  }, [activeModule]);

  React.useEffect(() => {
    const handleSubTabChange = (e: Event) => {
      const detail = (e as CustomEvent<{ module?: ModuleKey; title?: string }>).detail;
      if (!detail) return;
      if (!detail.module || detail.module === activeModule) {
        setActiveSubTabTitle(detail.title || undefined);
      }
    };
    window.addEventListener('sppg-subtab-change', handleSubTabChange);
    return () => window.removeEventListener('sppg-subtab-change', handleSubTabChange);
  }, [activeModule]);

  const handleToggleSidebar = React.useCallback(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsMobileSidebarOpen(prev => !prev);
    } else {
      setIsDesktopSidebarHidden(prev => {
        const next = !prev;
        try {
          localStorage.setItem('esppg_sidebar_hidden', String(next));
        } catch {
          // ignore storage errors
        }
        return next;
      });
    }
  }, []);

  const handleToggleCollapse = React.useCallback(() => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('esppg_sidebar_collapsed', String(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, []);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileSidebarOpen) {
        setIsMobileSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileSidebarOpen]);

  const renderModule = () => {
    // Defense-in-depth RBAC boundary check
    if (!canRoleAccessModule(currentUser.role, activeModule, roleModuleAccess)) {
      return (
        <Forbidden403Page
          onBackToHome={() => navigateToModule(getDefaultModuleForRole(currentUser.role, roleModuleAccess))}
        />
      );
    }

    switch (activeModule) {
      case 'dashboard':
        return <DashboardModule onNavigate={mod => navigateToModule(mod)} />;
      case 'master_data':
        return <MasterDataModule />;
      case 'institutions':
        return <InstitutionsModule />;
      case 'menu':
        return <NutritionMenuModule />;
      case 'menu_flyer':
        return <MenuFlyerModule />;
      case 'procurement':
        return <ProcurementModule />;
      case 'supplier_portal':
        return <SupplierPortalModule />;
      case 'inventory':
        return <InventoryModule />;
      case 'production':
        return <ProductionModule />;
      case 'distribution':
        return <DistributionModule />;
      case 'pic_incentives':
        return <PICIncentiveModule />;
      case 'volunteer_incentives':
        return <VolunteerIncentiveModule />;
      case 'petty_cash':
        return <PettyCashModule />;
      case 'volunteers':
        return <VolunteersModule />;
      case 'letters':
        return <LettersModule />;
      case 'reports':
        return <ReportsModule onNavigate={mod => navigateToModule(mod)} />;
      case 'settings':
        return <SettingsModule />;
      default:
        return <DashboardModule onNavigate={mod => navigateToModule(mod)} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F7FC] dark:bg-slate-950 flex flex-col antialiased selection:bg-blue-600 selection:text-white transition-colors duration-200">
      <div className="flex flex-1 min-h-0">
        {/* Left Sidebar */}
        <Sidebar
          activeModule={activeModule}
          onSelectModule={mod => navigateToModule(mod)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleToggleCollapse}
          isDesktopHidden={isDesktopSidebarHidden}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-screen">
          {/* Unified Single Slim Top Header */}
          <Header
            onToggleSidebar={handleToggleSidebar}
            isMobileSidebarOpen={isMobileSidebarOpen}
            isDesktopSidebarHidden={isDesktopSidebarHidden}
            activeModuleTitle={moduleTitles[activeModule]}
            subItemTitle={activeSubTabTitle}
            onNavigateHome={() => navigateToModule(getDefaultModuleForRole(currentUser.role, roleModuleAccess))}
            onNavigateModule={navigateToModule}
            onRefresh={() => {
              window.dispatchEvent(new CustomEvent('sppg-refresh'));
            }}
          />

          {/* Main Body with Spacious Layout */}
          <main className="flex-1 p-4 sm:p-6 lg:p-7 max-w-7xl w-full mx-auto">
            {/* Dynamic Module Component with Smooth Page Transition & Skeleton Loading */}
            <div key={activeModule} className="page-transition-enter">
              {isDataHydrating ? (
                activeModule === 'dashboard' ? <DashboardSkeleton /> : <ModuleSkeleton />
              ) : (
                renderModule()
              )}
            </div>
          </main>

          {/* Clean Minimal Footer */}
          <footer className="py-3.5 px-6 border-t border-slate-200/80 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400 bg-white/90 dark:bg-slate-900 mt-auto">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 max-w-7xl mx-auto">
              <div>
                <strong>E-SPPG TMG2</strong> © 2026 Yayasan Hafshawaty · SPPG Probolinggo Krejengan Temenggungan 2
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Program Makan Bergizi Gratis (MBG) BGN
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
};

const AuthGate: React.FC = () => {
  return (
    <>
      <AuthGuard>
        {({ activeModule, navigateToModule }) => (
          <MainContent
            activeModule={activeModule}
            navigateToModule={navigateToModule}
          />
        )}
      </AuthGuard>
      <ToastContainer />
    </>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AuthGate />
    </AppProvider>
  );
}

