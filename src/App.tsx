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
import { Breadcrumb } from './components/layout/Breadcrumb';
import { ToastContainer } from './components/common/Toast';
import { RoleSwitcher } from './components/auth/RoleSwitcher';
import { FirebaseAuthModal } from './components/auth/FirebaseAuthModal';
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
import { FinanceModule } from './components/modules/FinanceModule';
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
  finance: 'Keuangan, RAB & Arus Kas',
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
  const { currentUser, canSwitchRole } = useApp();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isRoleSwitcherOpen, setIsRoleSwitcherOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const renderModule = () => {
    // Defense-in-depth RBAC boundary check
    if (!canRoleAccessModule(currentUser.role, activeModule)) {
      return (
        <Forbidden403Page
          onBackToHome={() => navigateToModule(getDefaultModuleForRole(currentUser.role))}
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
      case 'finance':
        return <FinanceModule />;
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col antialiased selection:bg-sky-500 selection:text-white transition-colors duration-200">
      <div className="flex flex-1 min-h-0">
        {/* Left Sidebar */}
        <Sidebar
          activeModule={activeModule}
          onSelectModule={mod => navigateToModule(mod)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-screen">
          {/* Top Header */}
          <Header
            onOpenRoleSwitcher={() => setIsRoleSwitcherOpen(true)}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            activeModuleTitle={moduleTitles[activeModule]}
          />

          {/* Main Body */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {/* Breadcrumb Navigation */}
            <Breadcrumb
              activeModule={activeModule}
              activeModuleTitle={moduleTitles[activeModule]}
              onNavigateHome={() => navigateToModule(getDefaultModuleForRole(currentUser.role))}
            />

            {/* Dynamic Module Component */}
            {renderModule()}
          </main>

          {/* Clean ERP Footer */}
          <footer className="py-4 px-6 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 mt-auto">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 max-w-7xl mx-auto">
              <div>
                <strong>E-SPPG TMG2</strong> © 2026 Yayasan Hafshawaty • SPPG Probolinggo Krejengan Temenggungan 2
              </div>
              <div className="flex items-center gap-3 text-[11px] font-mono">
                <span>ID: GFBQSYXD</span>
                <span>•</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Program Makan Bergizi Gratis (MBG) BGN</span>
              </div>
            </div>
          </footer>
        </div>
      </div>

      {/* Global Modals & Notifications */}
      {canSwitchRole && (
        <RoleSwitcher
          isOpen={isRoleSwitcherOpen}
          onClose={() => setIsRoleSwitcherOpen(false)}
        />
      )}
      <FirebaseAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
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

