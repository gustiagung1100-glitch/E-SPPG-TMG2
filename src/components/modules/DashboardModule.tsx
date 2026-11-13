import React from 'react';
import { useApp } from '../../lib/store';
import { DashboardCard } from '../common/DashboardCard';
import { SimpleBarChart, DonutChart, FoodCostLineChart } from '../common/Charts';
import { formatNumber, formatRupiah } from '../../lib/exportUtils';
import {
  Users,
  School,
  Utensils,
  ChefHat,
  Boxes,
  Wallet,
  Coins,
  Truck,
  UserX,
  Mail,
  FileCheck2,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { ModuleKey } from '../../types';

interface DashboardModuleProps {
  onNavigate: (module: ModuleKey) => void;
}

export const DashboardModule: React.FC<DashboardModuleProps> = ({ onNavigate }) => {
  const {
    institutions,
    menuItems,
    inventory,
    purchaseOrders,
    distributionLogs,
    financialTransactions,
    volunteerAttendance,
    officialLetters,
    kitchenProgress,
    sppgConfig,
  } = useApp();

  // Metrics Calculations
  const totalRecipients = institutions.reduce((acc, i) => acc + i.totalPortions, 0);
  const totalSmallPortions = institutions.reduce((acc, i) => acc + i.smallPortions, 0);
  const totalLargePortions = institutions.reduce((acc, i) => acc + i.largePortions, 0);
  const totalInstitutions = institutions.length;

  // Active Menu Today
  const todayDateStr = '2026-11-08';
  const menuToday = menuItems.find(m => m.date === todayDateStr) || menuItems[0];
  const activeMenuCount = menuItems.length;

  // Financial Stats
  const totalRAB = totalRecipients * sppgConfig.smallPortionBudget; // Rp 42.750.000 / hari
  const totalPOAmount = purchaseOrders.reduce((acc, p) => acc + p.totalAmount, 0);
  const totalIncome = financialTransactions
    .filter(t => t.type === 'Pemasukan')
    .reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = financialTransactions
    .filter(t => t.type === 'Pengeluaran')
    .reduce((acc, t) => acc + t.amount, 0);
  const cashBalance = totalIncome - totalExpense;

  // Stock
  const totalStockItems = inventory.length;
  const criticalStockItems = inventory.filter(i => i.currentStock <= i.minimumStock);

  // Volunteers Absent
  const absentVolunteers = volunteerAttendance.filter(
    v => v.status === 'Sakit' || v.status === 'Izin' || v.status === 'Alpa'
  );

  // Letters
  const incomingLetters = officialLetters.filter(l => l.type === 'Surat Masuk').length;
  const outgoingLetters = officialLetters.filter(l => l.type === 'Surat Keluar').length;

  // Distribution status counts
  const deliveredCount = distributionLogs.filter(d => d.status === 'Selesai Serah Terima').length;
  const inTransitCount = distributionLogs.filter(d => d.status === 'Dalam Perjalanan').length;
  const scheduledCount = distributionLogs.filter(d => d.status === 'Dijadwalkan').length;

  // Pending Actions
  const pendingPOs = purchaseOrders.filter(
    p => p.status === 'Draft' || p.status === 'Menunggu Verifikasi Keuangan'
  );
  const pendingQC = purchaseOrders.filter(
    p => p.status === 'Disetujui Kepala' && p.qcStatus === 'Belum QC'
  );

  // Chart Data: Beneficiaries per Institution
  const schoolBarData = institutions.map(inst => ({
    label: inst.name.replace('Hafshawaty Zainul Hasan', 'Hafshawaty').replace('Temenggungan', 'TMG'),
    value: inst.smallPortions,
    secondaryValue: inst.largePortions,
  }));

  // Chart Data: Hourly Distribution Tracking from actual distributionLogs
  const distributionHourlyData = distributionLogs.map(log => ({
    label: log.departureTime ? log.departureTime.replace(' WIB', '') : log.institutionName.slice(0, 8),
    value: log.totalPortions,
  }));

  // Chart Data: Budget Usage Breakdown from actual financial transactions
  const categoryColors: Record<string, string> = {
    'Bahan Baku': '#142B4A',
    'Operasional Dapur': '#D97706',
    'Transport & Logistik': '#16A34A',
    'Gaji & Honor': '#0F766E',
    'Administrasi & ATK': '#2563EB',
    'Lainnya': '#64748B',
  };
  const expenseTransactions = financialTransactions.filter(t => t.type === 'Pengeluaran');
  const categoryTotals = expenseTransactions.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {} as Record<string, number>);

  const budgetAllocationData =
    Object.keys(categoryTotals).length > 0
      ? Object.entries(categoryTotals).map(([cat, val]) => ({
          label: cat,
          value: val,
          color: categoryColors[cat] || '#0F766E',
        }))
      : [
          { label: 'Bahan Baku (Food Cost)', value: totalPOAmount, color: '#142B4A' },
          { label: 'Operasional & Insentif', value: Math.max(0, totalRAB - totalPOAmount), color: '#0F766E' },
        ];

  // Chart Data: Food Cost Realization vs Target from menuItems
  const foodCostTrendData = menuItems.map(m => ({
    label: new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short' }).format(new Date(m.date)),
    actual: m.estimatedCostPerPortion,
    target: sppgConfig.smallPortionBudget || 15000,
  }));

  // Chart Data: Cash In vs Cash Out
  const cashFlowBarData = [
    { label: 'Termin I BGN', value: totalIncome / 1000000, color: '#16A34A' },
    { label: 'Pengeluaran Nov', value: totalExpense / 1000000, color: '#DC2626' },
    { label: 'Saldo Kas', value: cashBalance / 1000000, color: '#0F766E' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner Notice */}
      <div className="bg-linear-to-r from-[#142B4A] via-[#142B4A] to-[#0F766E] rounded-2xl p-6 text-white shadow-md border border-white/10 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-[#F2D58B] mb-1.5">
              Sistem ERP SPPG Aktif & Terverifikasi
            </div>
            <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-white">
              {sppgConfig.sppgName}
            </h2>
            <p className="text-xs md:text-sm text-slate-200 mt-1 max-w-2xl leading-relaxed">
              Pusat komando dan kendali terpadu Program Makan Bergizi Gratis (MBG) Kecamatan Krejengan.
              Pengelolaan gizi, rantai pasok, dapur, armada distribusi, dan akuntabilitas keuangan secara real-time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('reports')}
              className="px-4 py-2.5 bg-white text-[#142B4A] hover:bg-[#F4F7FA] rounded-xl text-xs font-bold shadow-sm transition whitespace-nowrap"
            >
              Laporan Harian BGN
            </button>
            <button
              type="button"
              onClick={() => onNavigate('distribution')}
              className="px-4 py-2.5 bg-[#0F766E] hover:bg-teal-600 text-white border border-white/15 rounded-xl text-xs font-bold shadow-sm transition whitespace-nowrap"
            >
              Pantau Distribusi
            </button>
          </div>
        </div>

        {/* Subtle geometric highlight */}
        <div className="absolute right-0 bottom-0 translate-x-10 translate-y-10 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Critical Operational Action Alerts */}
      {(criticalStockItems.length > 0 || pendingPOs.length > 0 || absentVolunteers.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {criticalStockItems.length > 0 && (
            <div
              onClick={() => onNavigate('inventory')}
              className="cursor-pointer bg-white dark:bg-slate-900 border border-[#DC2626]/30 dark:border-rose-900 rounded-xl p-4 flex items-start gap-3 hover:shadow-sm transition"
            >
              <div className="p-2 rounded-lg bg-[#DC2626]/10 text-[#DC2626] shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-[#1F2937] dark:text-rose-200">
                  {criticalStockItems.length} Bahan di Bawah Minimum
                </h5>
                <p className="text-[11px] text-[#64748B] dark:text-rose-300 mt-0.5">
                  {criticalStockItems.map(i => i.name).join(', ')}. Segera lakukan restock!
                </p>
              </div>
            </div>
          )}

          {pendingPOs.length > 0 && (
            <div
              onClick={() => onNavigate('procurement')}
              className="cursor-pointer bg-white dark:bg-slate-900 border border-[#D97706]/30 dark:border-amber-900 rounded-xl p-4 flex items-start gap-3 hover:shadow-sm transition"
            >
              <div className="p-2 rounded-lg bg-[#D97706]/10 text-[#D97706] shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-[#1F2937] dark:text-amber-200">
                  {pendingPOs.length} PO Menunggu Persetujuan
                </h5>
                <p className="text-[11px] text-[#64748B] dark:text-amber-300 mt-0.5">
                  Menunggu verifikasi Pengawas Keuangan / Kepala SPPG.
                </p>
              </div>
            </div>
          )}

          {absentVolunteers.length > 0 && (
            <div
              onClick={() => onNavigate('volunteers')}
              className="cursor-pointer bg-white dark:bg-slate-900 border border-[#D97706]/30 dark:border-orange-900 rounded-xl p-4 flex items-start gap-3 hover:shadow-sm transition"
            >
              <div className="p-2 rounded-lg bg-[#D97706]/10 text-[#D97706] shrink-0">
                <UserX className="w-4 h-4" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-[#1F2937] dark:text-orange-200">
                  {absentVolunteers.length} Relawan Tidak Hadir
                </h5>
                <p className="text-[11px] text-[#64748B] dark:text-orange-300 mt-0.5">
                  {absentVolunteers.map(v => `${v.volunteerName} (${v.status})`).join(', ')}.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Row 1: Key Beneficiary & Portion Statistics */}
      <div>
        <h3 className="text-xs font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider mb-3">
          1. Penerima Manfaat & Kapasitas Porsi
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <DashboardCard
            title="Total Penerima Manfaat"
            value={`${formatNumber(totalRecipients)} Siswa`}
            subtitle="Target harian terealisasi 100%"
            icon={<Users className="w-5 h-5 text-[#142B4A] dark:text-sky-400" />}
            badge={{ text: 'Aktif MBG', color: 'blue' }}
            accentColor="navy"
            onClick={() => onNavigate('institutions')}
          />
          <DashboardCard
            title="Jumlah Lembaga"
            value={`${totalInstitutions} Lembaga`}
            subtitle="SD, MI, SMP, MTs, SMK, Pesantren"
            icon={<School className="w-5 h-5 text-[#0F766E] dark:text-teal-400" />}
            badge={{ text: 'Krejengan', color: 'emerald' }}
            accentColor="sky"
            onClick={() => onNavigate('institutions')}
          />
          <DashboardCard
            title="Total Porsi Kecil"
            value={`${formatNumber(totalSmallPortions)} Porsi`}
            subtitle="PAUD/TK & SD Kelas 1-3 (~620 kkal)"
            icon={<Utensils className="w-5 h-5 text-[#16A34A] dark:text-emerald-400" />}
            badge={{
              text: totalRecipients > 0 ? `${((totalSmallPortions / totalRecipients) * 100).toFixed(1)}%` : '0%',
              color: 'emerald',
            }}
            accentColor="emerald"
            onClick={() => onNavigate('institutions')}
          />
          <DashboardCard
            title="Total Porsi Besar"
            value={`${formatNumber(totalLargePortions)} Porsi`}
            subtitle="SD Kelas 4-6, SMP, SMA (~875 kkal)"
            icon={<Utensils className="w-5 h-5 text-[#2563EB] dark:text-blue-400" />}
            badge={{
              text: totalRecipients > 0 ? `${((totalLargePortions / totalRecipients) * 100).toFixed(1)}%` : '0%',
              color: 'blue',
            }}
            accentColor="indigo"
            onClick={() => onNavigate('institutions')}
          />
          <DashboardCard
            title="Total Porsi Harian"
            value={`${formatNumber(totalRecipients)} Porsi`}
            subtitle={`Alokasi hari ini (${menuToday.dayName || 'MBG'})`}
            icon={<ChefHat className="w-5 h-5 text-[#D97706] dark:text-amber-400" />}
            badge={{ text: 'Tercapai', color: 'amber' }}
            accentColor="amber"
            onClick={() => onNavigate('production')}
          />
        </div>
      </div>

      {/* Row 2: Menu Hari Ini & Divisi Dapur Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Menu Hari Ini Card */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-[#E2E8F0] dark:border-slate-800 shadow-[0_1px_3px_rgba(20,43,74,0.04)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[#16A34A]/10 text-[#16A34A] dark:bg-emerald-950 dark:text-emerald-400">
                  <Utensils className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#1F2937] dark:text-white">
                    Menu Gizi Hari Ini
                  </h4>
                  <span className="text-[11px] text-[#64748B] font-mono">
                    Kode: {menuToday.menuCode}
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#16A34A]/10 text-[#16A34A] dark:bg-emerald-950 dark:text-emerald-300 border border-[#16A34A]/20">
                {menuToday.status}
              </span>
            </div>

            <div className="mt-4 space-y-2 text-xs">
              <div className="flex items-start gap-2">
                <span className="text-[#64748B] w-24 shrink-0">Pokok:</span>
                <span className="font-semibold text-[#1F2937] dark:text-slate-200">
                  {menuToday.stapleFood}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#64748B] w-24 shrink-0">Lauk Hewani:</span>
                <span className="font-semibold text-[#142B4A] dark:text-teal-400">
                  {menuToday.animalProtein}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#64748B] w-24 shrink-0">Lauk Nabati:</span>
                <span className="font-semibold text-[#1F2937] dark:text-slate-200">
                  {menuToday.plantProtein}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#64748B] w-24 shrink-0">Sayuran:</span>
                <span className="font-semibold text-[#1F2937] dark:text-slate-200">
                  {menuToday.vegetable}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#64748B] w-24 shrink-0">Buah Segar:</span>
                <span className="font-semibold text-[#1F2937] dark:text-slate-200">
                  {menuToday.fruit}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#64748B] w-24 shrink-0">Pelengkap:</span>
                <span className="font-semibold text-[#1F2937] dark:text-slate-200">
                  {menuToday.milkOrExtra}
                </span>
              </div>
            </div>

            {/* Nutrition metrics badge */}
            <div className="mt-4 pt-3 border-t border-[#E2E8F0] dark:border-slate-800 grid grid-cols-4 gap-2 text-center tabular-nums">
              <div className="bg-[#F4F7FA] dark:bg-slate-800 p-2 rounded-lg border border-[#E2E8F0]/60 dark:border-slate-700">
                <div className="text-[10px] text-[#64748B]">Kalori (K/B)</div>
                <div className="text-xs font-bold text-[#1F2937] dark:text-white">
                  620 / 875
                </div>
              </div>
              <div className="bg-[#F4F7FA] dark:bg-slate-800 p-2 rounded-lg border border-[#E2E8F0]/60 dark:border-slate-700">
                <div className="text-[10px] text-[#64748B]">Protein</div>
                <div className="text-xs font-bold text-[#16A34A] dark:text-emerald-400">
                  {menuToday.proteinGrams}g
                </div>
              </div>
              <div className="bg-[#F4F7FA] dark:bg-slate-800 p-2 rounded-lg border border-[#E2E8F0]/60 dark:border-slate-700">
                <div className="text-[10px] text-[#64748B]">Karbohidrat</div>
                <div className="text-xs font-bold text-[#D97706] dark:text-amber-400">
                  {menuToday.carbGrams}g
                </div>
              </div>
              <div className="bg-[#F4F7FA] dark:bg-slate-800 p-2 rounded-lg border border-[#E2E8F0]/60 dark:border-slate-700">
                <div className="text-[10px] text-[#64748B]">Food Cost</div>
                <div className="text-xs font-bold text-[#142B4A] dark:text-teal-400">
                  {formatRupiah(menuToday.estimatedCostPerPortion)}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-2">
            <button
              type="button"
              onClick={() => onNavigate('menu')}
              className="w-full py-2.5 bg-[#F4F7FA] hover:bg-[#E2E8F0]/70 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#142B4A] dark:text-slate-200 border border-[#E2E8F0] dark:border-slate-700 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5"
            >
              <span>Kelola Siklus Menu Lengkap ({activeMenuCount} Hari)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Progres Tugas Divisi Dapur */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-[#E2E8F0] dark:border-slate-800 shadow-[0_1px_3px_rgba(20,43,74,0.04)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[#142B4A]/10 text-[#142B4A] dark:bg-slate-800 dark:text-teal-400">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#1F2937] dark:text-white">
                    Progres Tugas Divisi Dapur
                  </h4>
                  <span className="text-[11px] text-[#64748B]">
                    SOP & Kecepatan Alur Produksi Harian
                  </span>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-[#16A34A] dark:text-emerald-400">
                Live Status
              </span>
            </div>

            <div className="mt-4 space-y-3.5 tabular-nums">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-[#1F2937] dark:text-slate-300">
                    Divisi Persiapan (Bahan, Potong, Cuci)
                  </span>
                  <span className="font-mono font-bold text-[#16A34A]">
                    {kitchenProgress.preparation}% Selesai
                  </span>
                </div>
                <div className="w-full bg-[#F4F7FA] dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#16A34A] h-full rounded-full transition-all duration-500"
                    style={{ width: `${kitchenProgress.preparation}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-[#1F2937] dark:text-slate-300">
                    Divisi Pengolahan (Memasak & Uji Suhu &gt; 75°C)
                  </span>
                  <span className="font-mono font-bold text-[#16A34A]">
                    {kitchenProgress.cooking}% Selesai
                  </span>
                </div>
                <div className="w-full bg-[#F4F7FA] dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#16A34A] h-full rounded-full transition-all duration-500"
                    style={{ width: `${kitchenProgress.cooking}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-[#1F2937] dark:text-slate-300">
                    Divisi Pemorsian (Penimbangan & Seal Boks)
                  </span>
                  <span className="font-mono font-bold text-[#142B4A] dark:text-sky-400">
                    {kitchenProgress.portioning}% Berjalan
                  </span>
                </div>
                <div className="w-full bg-[#F4F7FA] dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#142B4A] dark:bg-sky-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${kitchenProgress.portioning}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-[#1F2937] dark:text-slate-300">
                    Divisi Distribusi (Armada & Pengiriman Sekolah)
                  </span>
                  <span className="font-mono font-bold text-[#0F766E] dark:text-teal-400">
                    {kitchenProgress.distribution}% Terkirim
                  </span>
                </div>
                <div className="w-full bg-[#F4F7FA] dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#0F766E] h-full rounded-full transition-all duration-500"
                    style={{ width: `${kitchenProgress.distribution}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-[#1F2937] dark:text-slate-300">
                    Divisi Cuci Ompreng (Sterilisasi Air Panas)
                  </span>
                  <span className="font-mono font-bold text-[#D97706]">
                    {kitchenProgress.washing}% Berjalan
                  </span>
                </div>
                <div className="w-full bg-[#F4F7FA] dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#D97706] h-full rounded-full transition-all duration-500"
                    style={{ width: `${kitchenProgress.washing}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-[#16A34A] dark:text-emerald-400 font-medium">
                <CheckCircle2 className="w-4 h-4" /> Uji Organoleptik Chef: Lolos
              </span>
              <span className="flex items-center gap-1.5 text-[#16A34A] dark:text-emerald-400 font-medium">
                <CheckCircle2 className="w-4 h-4" /> Suhu Pengiriman: 68.5°C
              </span>
            </div>
          </div>

          <div className="mt-4 pt-2">
            <button
              type="button"
              onClick={() => onNavigate('production')}
              className="w-full py-2.5 bg-[#F4F7FA] hover:bg-[#E2E8F0]/70 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#142B4A] dark:text-slate-200 border border-[#E2E8F0] dark:border-slate-700 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5"
            >
              <span>Lihat Detail Produksi Dapur</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Status Distribusi & Logistik Harian */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-[#E2E8F0] dark:border-slate-800 shadow-[0_1px_3px_rgba(20,43,74,0.04)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[#2563EB]/10 text-[#2563EB] dark:bg-blue-950 dark:text-blue-300">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#1F2937] dark:text-white">
                    Status Distribusi Armada
                  </h4>
                  <span className="text-[11px] text-[#64748B]">
                    6 Armada Melayani 8 Lembaga
                  </span>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-[#2563EB]/10 dark:bg-blue-950 text-[#2563EB] dark:text-blue-300 border border-[#2563EB]/20">
                {deliveredCount} / 8 Tiba
              </span>
            </div>

            <div className="mt-4 space-y-3 tabular-nums">
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#16A34A]/8 dark:bg-emerald-950/40 border border-[#16A34A]/20 dark:border-emerald-900">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                  <span className="text-xs font-bold text-[#1F2937] dark:text-emerald-200">
                    Selesai Serah Terima (BAST Sah)
                  </span>
                </div>
                <span className="text-sm font-extrabold text-[#16A34A] dark:text-emerald-400">
                  {deliveredCount} Sekolah
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-[#2563EB]/8 dark:bg-blue-950/40 border border-[#2563EB]/20 dark:border-blue-900">
                <div className="flex items-center gap-2.5">
                  <Truck className="w-4 h-4 text-[#2563EB]" />
                  <span className="text-xs font-bold text-[#1F2937] dark:text-blue-200">
                    Dalam Perjalanan (On Transit)
                  </span>
                </div>
                <span className="text-sm font-extrabold text-[#2563EB] dark:text-blue-400">
                  {inTransitCount} Sekolah
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-[#F4F7FA] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700">
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-[#64748B]" />
                  <span className="text-xs font-bold text-[#1F2937] dark:text-slate-300">
                    Kloter Siang (SMP/SMA/MA)
                  </span>
                </div>
                <span className="text-sm font-extrabold text-[#64748B] dark:text-slate-400">
                  {scheduledCount} Sekolah
                </span>
              </div>
            </div>

            <div className="mt-4 text-[11px] text-[#64748B] leading-relaxed">
              * Seluruh pengemudi dibekali termometer digital food grade dan Surat Jalan resmi ber-Kop SPPG TMG2.
            </div>
          </div>

          <div className="mt-4 pt-2">
            <button
              type="button"
              onClick={() => onNavigate('distribution')}
              className="w-full py-2.5 bg-[#F4F7FA] hover:bg-[#E2E8F0]/70 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#142B4A] dark:text-slate-200 border border-[#E2E8F0] dark:border-slate-700 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5"
            >
              <span>Buka Log Serah Terima & Surat Jalan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Row 3: Financial & Rantai Pasok Overview */}
      <div>
        <h3 className="text-xs font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider mb-3">
          2. Keuangan, Pengadaan & Gudang Bahan Pangan
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <DashboardCard
            title="Total RAB Harian"
            value={formatRupiah(totalRAB)}
            subtitle="Plafon BGN 2.850 Porsi x Rp 15rb"
            icon={<Wallet className="w-5 h-5 text-[#142B4A] dark:text-sky-400" />}
            badge={{ text: 'Plafon', color: 'blue' }}
            accentColor="navy"
            onClick={() => onNavigate('finance')}
          />
          <DashboardCard
            title="Total Purchase Order"
            value={formatRupiah(totalPOAmount)}
            subtitle="Pengadaan bahan pangan aktif"
            icon={<Coins className="w-5 h-5 text-[#D97706]" />}
            badge={{ text: `${purchaseOrders.length} PO`, color: 'amber' }}
            accentColor="amber"
            onClick={() => onNavigate('procurement')}
          />
          <DashboardCard
            title="Pemasukan Kas"
            value={formatRupiah(totalIncome)}
            subtitle="Dana Termin MBG BGN diterima"
            icon={<Coins className="w-5 h-5 text-[#16A34A]" />}
            badge={{ text: 'Termin I', color: 'emerald' }}
            accentColor="emerald"
            onClick={() => onNavigate('finance')}
          />
          <DashboardCard
            title="Pengeluaran Realisasi"
            value={formatRupiah(totalExpense)}
            subtitle="Bahan baku, operasional, insentif"
            icon={<Wallet className="w-5 h-5 text-[#DC2626]" />}
            badge={{ text: 'Tervalidasi', color: 'rose' }}
            accentColor="rose"
            onClick={() => onNavigate('finance')}
          />
          <DashboardCard
            title="Saldo Kas Riil"
            value={formatRupiah(cashBalance)}
            subtitle="Likuiditas kas operasional aman"
            icon={<Wallet className="w-5 h-5 text-[#0F766E]" />}
            badge={{ text: 'Surplus', color: 'emerald' }}
            accentColor="sky"
            onClick={() => onNavigate('finance')}
          />
        </div>
      </div>

      {/* Row 4: Administrasi, Surat & Pelaporan Quick Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard
          title="Stok Bahan Gudang"
          value={`${totalStockItems} Item`}
          subtitle={`${criticalStockItems.length} item di bawah batas safety stock`}
          icon={<Boxes className="w-5 h-5 text-[#2563EB]" />}
          badge={{ text: criticalStockItems.length > 0 ? 'Perlu Restock' : 'Aman', color: criticalStockItems.length > 0 ? 'rose' : 'emerald' }}
          accentColor={criticalStockItems.length > 0 ? 'rose' : 'indigo'}
          onClick={() => onNavigate('inventory')}
        />
        <DashboardCard
          title="Relawan Tidak Hadir"
          value={`${absentVolunteers.length} Orang`}
          subtitle="Telah dialokasikan relawan cadangan"
          icon={<UserX className="w-5 h-5 text-[#D97706]" />}
          badge={{ text: 'Tergantikan', color: 'amber' }}
          accentColor="amber"
          onClick={() => onNavigate('volunteers')}
        />
        <DashboardCard
          title="Tata Persuratan SPPG"
          value={`${incomingLetters + outgoingLetters} Surat`}
          subtitle={`${incomingLetters} Surat Masuk | ${outgoingLetters} Surat Keluar`}
          icon={<Mail className="w-5 h-5 text-[#0F766E]" />}
          badge={{ text: 'Tertib Arsip', color: 'blue' }}
          accentColor="sky"
          onClick={() => onNavigate('letters')}
        />
        <DashboardCard
          title="Kelengkapan Laporan BGN"
          value="98.5%"
          subtitle="Formulir harian & dokumentasi lengkap"
          icon={<FileCheck2 className="w-5 h-5 text-[#16A34A]" />}
          badge={{ text: 'Siap Ekspor', color: 'emerald' }}
          accentColor="emerald"
          onClick={() => onNavigate('reports')}
        />
      </div>

      {/* Row 5: Dynamic Interactive Charts */}
      <div>
        <h3 className="text-xs font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider mb-3">
          3. Analisis Grafik & Statistik Sistem Terpadu
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Penerima Manfaat per Lembaga (Porsi Kecil vs Porsi Besar) */}
          <SimpleBarChart
            title="Penerima Manfaat per Lembaga (Porsi Kecil vs Porsi Besar)"
            subtitle="Perbandingan siswa PAUD/SD 1-3 (Biru Muda) dan Kelas 4-6 / SMP / SMA (Navy)"
            data={schoolBarData}
            primaryLabel="Porsi Kecil"
            secondaryLabel="Porsi Besar"
            height={220}
          />

          {/* Chart 2: Penggunaan Anggaran & Realisasi Biaya */}
          <DonutChart
            title="Komposisi Penggunaan Anggaran MBG (Food Cost vs Ops)"
            subtitle="Batas target BGN: Food Cost minimal 75% dari total anggaran"
            data={budgetAllocationData}
            centerValue="78.2%"
            centerLabel="Food Cost Ratio"
          />

          {/* Chart 3: Tren Food Cost Harian vs Plafon Rp 15.000 */}
          <FoodCostLineChart
            title="Tren Food Cost Harian per Porsi vs Plafon Anggaran"
            subtitle="Efisiensi belanja bahan baku terjaga di bawah plafon maksimal Rp 15.000"
            data={foodCostTrendData}
          />

          {/* Chart 4: Arus Kas & Saldo Operasional SPPG (Juta Rupiah) */}
          <SimpleBarChart
            title="Arus Kas & Likuiditas Dana Operasional SPPG (Juta Rupiah)"
            subtitle="Perbandingan Penerimaan Termin BGN, Realisasi Belanja, dan Saldo Kas Aktif"
            data={cashFlowBarData}
            primaryLabel="Juta Rupiah (Rp)"
            valueFormatter={val => `Rp ${val.toFixed(1)} Juta`}
            height={220}
          />
        </div>
      </div>
    </div>
  );
};
