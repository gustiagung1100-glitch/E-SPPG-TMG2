import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../../lib/store';
import { canRoleAccessModule } from '../../lib/routeGuard';
import { ModuleKey } from '../../types';
import {
  Bell,
  Moon,
  Sun,
  AlertTriangle,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  X,
  ArrowRight,
  School,
  UtensilsCrossed,
  Boxes,
  ShoppingCart,
  Users2,
  Store,
  Compass,
} from 'lucide-react';

interface HeaderProps {
  onToggleSidebar: () => void;
  isMobileSidebarOpen: boolean;
  isDesktopSidebarHidden: boolean;
  activeModuleTitle: string;
  onNavigateModule: (module: ModuleKey) => void;
}

interface HeaderSearchResult {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  module: ModuleKey;
  icon: React.ReactNode;
}

const MODULE_SEARCH_INDEX: { module: ModuleKey; title: string; keywords: string }[] = [
  { module: 'dashboard', title: 'Dashboard Terpadu', keywords: 'beranda ringkasan statistik porsi grafik' },
  { module: 'master_data', title: 'Master Data Terpadu (A-E)', keywords: 'master bahan supplier relawan satuan konversi' },
  { module: 'institutions', title: 'Modul Penerima Manfaat', keywords: 'sekolah lembaga paud sd smp sma pesantren pic absensi kuota' },
  { module: 'menu', title: 'Perencanaan Menu & Gizi', keywords: 'menu harian akg kalori protein karbohidrat siklus' },
  { module: 'menu_flyer', title: 'Flyer Menu Otomatis', keywords: 'poster flyer infografis menu makanan' },
  { module: 'procurement', title: 'Modul PLOK (RAB, PO, QC)', keywords: 'belanja rab po purchase order quality control qc bahan' },
  { module: 'supplier_portal', title: 'Portal Mitra Supplier', keywords: 'supplier rekanan po pengiriman faktur surat jalan' },
  { module: 'inventory', title: 'Gudang & Stok Bahan', keywords: 'stok gudang inventaris bahan masuk keluar minimum' },
  { module: 'production', title: 'Dapur & Produksi MBG', keywords: 'persiapan pengolahan pemorsian cuci ompreng suhu makanan ruang' },
  { module: 'distribution', title: 'Distribusi & Armada', keywords: 'pengiriman armada mobil sopir ompreng kembali bbm' },
  { module: 'finance', title: 'Keuangan, RAB & Kas', keywords: 'uang kas transaksi anggaran arus kas masuk keluar' },
  { module: 'volunteers', title: 'Relawan & Ketidakhadiran', keywords: 'sdm relawan hadir absen izin sakit pengganti' },
  { module: 'letters', title: 'Tata Persuratan & SPK', keywords: 'surat masuk keluar spk bast dokumen disposisi' },
  { module: 'reports', title: 'Dokumentasi & Laporan BGN', keywords: 'laporan bast organoleptik food waste suhu ruang suhu pengolahan ccp excel pdf' },
  { module: 'settings', title: 'Pengaturan & Hak Akses', keywords: 'pengaturan profil sppg rbac akses login audit log' },
];

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  isMobileSidebarOpen,
  isDesktopSidebarHidden,
  activeModuleTitle,
  onNavigateModule,
}) => {
  const {
    currentUser,
    roleModuleAccess,
    darkMode,
    toggleDarkMode,
    inventory,
    purchaseOrders,
    volunteerAttendance,
    institutions,
    masterBahan,
    masterSuppliers,
    masterVolunteers,
    menuItems,
    logout,
  } = useApp();

  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const notifContainerRef = useRef<HTMLDivElement>(null);

  // Live notifications
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

  // Global shortcut Ctrl+K / Cmd+K to focus Header Search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
      if (notifContainerRef.current && !notifContainerRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // RBAC-filtered live search results
  const searchResults = useMemo<HeaderSearchResult[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    const results: HeaderSearchResult[] = [];
    const role = currentUser.role;

    // 1. Modul Navigasi
    for (const mod of MODULE_SEARCH_INDEX) {
      if (!canRoleAccessModule(role, mod.module, roleModuleAccess)) continue;
      if (mod.title.toLowerCase().includes(q) || mod.keywords.toLowerCase().includes(q)) {
        results.push({
          id: `mod-${mod.module}`,
          title: mod.title,
          subtitle: 'Buka modul & halaman terkait',
          category: 'Modul',
          module: mod.module,
          icon: <Compass className="w-4 h-4 text-[#164E91] dark:text-sky-400" />,
        });
      }
    }

    // 2. Lembaga Penerima Manfaat
    if (canRoleAccessModule(role, 'institutions', roleModuleAccess)) {
      for (const inst of institutions) {
        if (
          inst.name.toLowerCase().includes(q) ||
          inst.picName.toLowerCase().includes(q) ||
          inst.institutionType.toLowerCase().includes(q)
        ) {
          results.push({
            id: `inst-${inst.id}`,
            title: inst.name,
            subtitle: `PIC: ${inst.picName} • ${inst.totalPortions} porsi`,
            category: 'Penerima Manfaat',
            module: 'institutions',
            icon: <School className="w-4 h-4 text-teal-600 dark:text-teal-400" />,
          });
        }
      }
    }

    // 3. Menu Gizi
    if (canRoleAccessModule(role, 'menu', roleModuleAccess)) {
      for (const m of menuItems) {
        if (
          m.menuCode.toLowerCase().includes(q) ||
          m.stapleFood.toLowerCase().includes(q) ||
          m.animalProtein.toLowerCase().includes(q) ||
          m.vegetable.toLowerCase().includes(q) ||
          m.date.toLowerCase().includes(q)
        ) {
          results.push({
            id: `menu-${m.id}`,
            title: `${m.menuCode} — ${m.animalProtein}`,
            subtitle: `${m.dayName}, ${m.date} • ${m.stapleFood}`,
            category: 'Menu Gizi',
            module: 'menu',
            icon: <UtensilsCrossed className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
          });
        }
      }
    }

    // 4. Master Bahan Pangan
    if (canRoleAccessModule(role, 'master_data', roleModuleAccess)) {
      for (const b of masterBahan) {
        if (
          b.name.toLowerCase().includes(q) ||
          b.code.toLowerCase().includes(q) ||
          b.category.toLowerCase().includes(q)
        ) {
          results.push({
            id: `bahan-${b.id}`,
            title: b.name,
            subtitle: `${b.code} • ${b.category} (${b.unit})`,
            category: 'Bahan Pangan',
            module: 'master_data',
            icon: <Boxes className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />,
          });
        }
      }
    }

    // 5. Purchase Order (PO)
    const canProcurement = canRoleAccessModule(role, 'procurement', roleModuleAccess);
    const canSupplierPortal = canRoleAccessModule(role, 'supplier_portal', roleModuleAccess);
    if (canProcurement || canSupplierPortal) {
      const targetModule: ModuleKey = canProcurement ? 'procurement' : 'supplier_portal';
      for (const po of purchaseOrders) {
        if (
          role === 'Supplier / Mitra Pangan' &&
          currentUser.supplierName &&
          po.supplierName !== currentUser.supplierName
        ) {
          continue;
        }
        if (
          po.poNumber.toLowerCase().includes(q) ||
          po.supplierName.toLowerCase().includes(q) ||
          po.status.toLowerCase().includes(q)
        ) {
          results.push({
            id: `po-${po.id}`,
            title: po.poNumber,
            subtitle: `${po.supplierName} • ${po.status}`,
            category: 'Purchase Order',
            module: targetModule,
            icon: <ShoppingCart className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
          });
        }
      }
    }

    // 6. Master Relawan
    if (canRoleAccessModule(role, 'volunteers', roleModuleAccess)) {
      for (const v of masterVolunteers) {
        if (
          v.name.toLowerCase().includes(q) ||
          v.division.toLowerCase().includes(q) ||
          v.position.toLowerCase().includes(q)
        ) {
          results.push({
            id: `vol-${v.id}`,
            title: v.name,
            subtitle: `Divisi ${v.division} • ${v.position}`,
            category: 'Relawan',
            module: 'volunteers',
            icon: <Users2 className="w-4 h-4 text-sky-600 dark:text-sky-400" />,
          });
        }
      }
    }

    // 7. Master Supplier
    if (canRoleAccessModule(role, 'master_data', roleModuleAccess)) {
      for (const s of masterSuppliers) {
        if (
          s.name.toLowerCase().includes(q) ||
          s.contactPerson.toLowerCase().includes(q)
        ) {
          results.push({
            id: `sup-${s.id}`,
            title: s.name,
            subtitle: `Kontak: ${s.contactPerson} • ${s.phone}`,
            category: 'Supplier',
            module: 'master_data',
            icon: <Store className="w-4 h-4 text-purple-600 dark:text-purple-400" />,
          });
        }
      }
    }

    return results.slice(0, 10);
  }, [
    searchQuery,
    currentUser.role,
    currentUser.supplierName,
    roleModuleAccess,
    institutions,
    menuItems,
    masterBahan,
    purchaseOrders,
    masterVolunteers,
    masterSuppliers,
  ]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchQuery]);

  const handleSelectSearchResult = (item: HeaderSearchResult) => {
    onNavigateModule(item.module);
    setSearchQuery('');
    setIsSearchOpen(false);
    searchInputRef.current?.blur();
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsSearchOpen(false);
      searchInputRef.current?.blur();
      return;
    }
    if (searchResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev + 1) % searchResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev - 1 + searchResults.length) % searchResults.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const chosen = searchResults[highlightedIndex] || searchResults[0];
      if (chosen) handleSelectSearchResult(chosen);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-3 sm:px-5 lg:px-8 py-2.5 transition-colors">
      <div className="flex items-center justify-between gap-2.5 sm:gap-4">
        {/* Left: Sidebar Toggle Button & Minimal Page Title */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink-0">
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label={
              isMobileSidebarOpen || !isDesktopSidebarHidden
                ? 'Sembunyikan Sidebar Navigasi'
                : 'Tampilkan Sidebar Navigasi'
            }
            aria-expanded={isMobileSidebarOpen || !isDesktopSidebarHidden}
            title={
              isDesktopSidebarHidden
                ? 'Tampilkan Sidebar Navigasi'
                : 'Sembunyikan / Tampilkan Sidebar Navigasi'
            }
            className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 hover:bg-[#071D49] text-[#071D49] hover:text-white dark:bg-slate-800 dark:hover:bg-sky-600 dark:text-slate-200 dark:hover:text-white border border-slate-200/90 dark:border-slate-700 transition-all duration-150 active:scale-95 shrink-0 shadow-2xs cursor-pointer"
          >
            <span className="lg:hidden flex items-center justify-center">
              {isMobileSidebarOpen ? (
                <PanelLeftClose className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </span>
            <span className="hidden lg:flex items-center justify-center">
              {isDesktopSidebarHidden ? (
                <PanelLeftOpen className="w-5 h-5" />
              ) : (
                <PanelLeftClose className="w-5 h-5" />
              )}
            </span>
          </button>

          <h2 className="hidden md:block text-sm font-bold text-slate-900 dark:text-white truncate max-w-[180px] lg:max-w-[240px]">
            {activeModuleTitle}
          </h2>
        </div>

        {/* Center: Pencarian Header */}
        <div ref={searchContainerRef} className="relative flex-1 max-w-md min-w-0">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onFocus={() => setIsSearchOpen(true)}
              onChange={e => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder="Cari modul, sekolah, bahan, menu..."
              aria-label="Pencarian cepat di header"
              className="w-full h-10 pl-9 pr-14 text-xs sm:text-sm bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:border-[#164E91] dark:focus:border-sky-500 focus:ring-2 focus:ring-[#164E91]/15 focus:outline-none transition-all"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  searchInputRef.current?.focus();
                }}
                aria-label="Hapus kata kunci pencarian"
                className="absolute right-2.5 p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md absolute right-2.5 pointer-events-none">
                Ctrl K
              </kbd>
            )}
          </div>

          {/* Search Results Dropdown */}
          {isSearchOpen && searchQuery.trim().length > 0 && (
            <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-50">
              {searchResults.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                  Tidak ditemukan hasil untuk "<strong className="text-slate-700 dark:text-slate-200">{searchQuery}</strong>"
                </div>
              ) : (
                <ul className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 py-1">
                  {searchResults.map((item, idx) => {
                    const isHighlighted = idx === highlightedIndex;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onMouseEnter={() => setHighlightedIndex(idx)}
                          onClick={() => handleSelectSearchResult(item)}
                          className={`w-full px-3.5 py-2.5 flex items-center justify-between gap-3 text-left transition cursor-pointer ${
                            isHighlighted
                              ? 'bg-sky-50 dark:bg-sky-950/50'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                              {item.icon}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {item.title}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                {item.subtitle}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {item.category}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Right: Minimal Utility Actions (Dark Mode, Notifikasi, Keluar) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Dark Mode Toggle */}
          <button
            type="button"
            onClick={toggleDarkMode}
            className="inline-flex items-center justify-center w-10 h-10 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 active:scale-90 dark:hover:bg-slate-800 rounded-xl transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700 cursor-pointer"
            aria-label="Ubah mode gelap/terang"
            title={darkMode ? 'Mode Terang' : 'Mode Gelap'}
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Notifications Center */}
          <div ref={notifContainerRef} className="relative">
            <button
              type="button"
              onClick={() => setShowNotifications(prev => !prev)}
              className="inline-flex items-center justify-center w-10 h-10 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 active:scale-90 dark:hover:bg-slate-800 rounded-xl transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700 relative cursor-pointer"
              aria-label="Notifikasi sistem"
              title="Notifikasi Operasional"
            >
              <Bell className="w-4 h-4" />
              {totalAlerts > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse tabular-nums shadow-xs">
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
                    type="button"
                    onClick={() => setShowNotifications(false)}
                    className="text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium cursor-pointer"
                  >
                    Tutup Notifikasi
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Logout Button */}
          <button
            type="button"
            onClick={logout}
            title="Keluar dari sistem"
            aria-label="Keluar dari sistem"
            className="inline-flex items-center justify-center gap-1.5 h-10 px-2.5 sm:px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-rose-700 hover:bg-rose-50 hover:border-rose-200 dark:hover:text-rose-300 dark:hover:bg-rose-950/50 dark:hover:border-rose-800 text-xs font-semibold transition-all active:scale-95 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </div>
    </header>
  );
};
