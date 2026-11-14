import React, { useMemo, useState } from 'react';
import { useApp } from '../../lib/store';
import { DashboardCard } from '../common/DashboardCard';
import { StackedDailyBarChart, StackedDailyBarItem } from '../common/Charts';
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
  Trash2,
  ShieldAlert,
  Thermometer,
} from 'lucide-react';
import { ModuleKey } from '../../types';

interface DashboardModuleProps {
  onNavigate: (module: ModuleKey) => void;
}

const formatShortDate = (dateStr: string): string => {
  const parsed = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short' }).format(parsed);
};

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
    washingWasteRecords,
    prepRecords,
    sppgConfig,
    masterUnits,
    materialConversions,
  } = useApp();

  const convertToKg = (qty: number, unit?: string, materialName?: string): number => {
    const safeQty = Number.isFinite(qty) ? qty : 0;
    const u = (unit || 'kg').trim().toLowerCase();
    if (u === 'g' || u === 'gr' || u === 'gram') return safeQty / 1000;
    const unitMeta = masterUnits.find(m => m.code.trim().toLowerCase() === u);
    if (unitMeta) {
      if (unitMeta.baseUnit === 'gram') {
        return (safeQty * unitMeta.conversionToBase) / 1000;
      }
      if (unitMeta.baseUnit === 'ml') {
        return (safeQty * unitMeta.conversionToBase) / 1000;
      }
      if (materialName) {
        const conv = materialConversions.find(
          c =>
            c.unit.trim().toLowerCase() === u &&
            c.materialName.toLowerCase().includes(materialName.trim().toLowerCase())
        );
        if (conv && conv.gramsPerUnit > 0) {
          return (safeQty * conv.gramsPerUnit) / 1000;
        }
      }
    }
    return safeQty;
  };

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

  // ---------------------------------------------------------------------------
  // 3A. Data Food Waste Harian dari Tugas Divisi Cuci Ompreng (washingWasteRecords)
  // ---------------------------------------------------------------------------
  const wasteDailyAnalytics = useMemo(() => {
    const byDate = new Map<
      string,
      {
        date: string;
        rice: number;
        animal: number;
        plant: number;
        vegetable: number;
        fruit: number;
        total: number;
        sterilizedAll: boolean;
        recordsCount: number;
        latestOfficer: string;
        latestTime: string;
        latestNotes: string;
      }
    >();

    for (const rec of washingWasteRecords) {
      const rice = convertToKg(Number(rec.wasteRice?.weight) || 0, rec.wasteRice?.unit || rec.unit);
      const animal = convertToKg(Number(rec.wasteAnimalProtein?.weight) || 0, rec.wasteAnimalProtein?.unit || rec.unit);
      const plant = convertToKg(Number(rec.wastePlantProtein?.weight) || 0, rec.wastePlantProtein?.unit || rec.unit);
      const vegetable = convertToKg(Number(rec.wasteVegetable?.weight) || 0, rec.wasteVegetable?.unit || rec.unit);
      const fruit = convertToKg(Number(rec.wasteFruit?.weight) || 0, rec.wasteFruit?.unit || rec.unit);
      const sumComponents = rice + animal + plant + vegetable + fruit;
      const recordTotal =
        typeof rec.totalWasteWeight === 'number' && rec.totalWasteWeight > 0
          ? convertToKg(rec.totalWasteWeight, rec.unit)
          : sumComponents;

      const existing = byDate.get(rec.date);
      if (existing) {
        existing.rice += rice;
        existing.animal += animal;
        existing.plant += plant;
        existing.vegetable += vegetable;
        existing.fruit += fruit;
        existing.total += recordTotal;
        existing.sterilizedAll = existing.sterilizedAll && Boolean(rec.sterilizationChecked);
        existing.recordsCount += 1;
      } else {
        byDate.set(rec.date, {
          date: rec.date,
          rice,
          animal,
          plant,
          vegetable,
          fruit,
          total: recordTotal,
          sterilizedAll: Boolean(rec.sterilizationChecked),
          recordsCount: 1,
          latestOfficer: rec.officerName,
          latestTime: rec.time,
          latestNotes: rec.notes,
        });
      }
    }

    const sortedDays = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
    const chartData: StackedDailyBarItem[] = sortedDays.map(d => {
      const perPortionGrams = totalRecipients > 0 ? (d.total * 1000) / totalRecipients : 0;
      return {
        date: d.date,
        label: formatShortDate(d.date),
        total: d.total,
        subMeta: `±${perPortionGrams.toFixed(1)} g/porsi · ${d.latestOfficer}`,
        segments: [
          { key: 'rice', label: 'Nasi / Pokok', value: d.rice, color: '#D97706' },
          { key: 'vegetable', label: 'Sayuran', value: d.vegetable, color: '#16A34A' },
          { key: 'plant', label: 'Lauk Nabati', value: d.plant, color: '#0F766E' },
          { key: 'animal', label: 'Lauk Hewani', value: d.animal, color: '#142B4A' },
          { key: 'fruit', label: 'Buah', value: d.fruit, color: '#2563EB' },
        ],
      };
    });

    const totalAllDays = sortedDays.reduce((acc, d) => acc + d.total, 0);
    const avgDailyKg = sortedDays.length > 0 ? totalAllDays / sortedDays.length : 0;
    const latestDay = sortedDays[sortedDays.length - 1] || null;

    return { sortedDays, chartData, totalAllDays, avgDailyKg, latestDay };
  }, [washingWasteRecords, totalRecipients, masterUnits, materialConversions]);

  const [selectedWasteDate, setSelectedWasteDate] = useState<string>('');
  const activeWasteDay = useMemo(() => {
    if (wasteDailyAnalytics.sortedDays.length === 0) return null;
    return (
      wasteDailyAnalytics.sortedDays.find(d => d.date === selectedWasteDate) ||
      wasteDailyAnalytics.latestDay
    );
  }, [wasteDailyAnalytics, selectedWasteDate]);

  // ---------------------------------------------------------------------------
  // 3B. Data Bahan Rijek Harian dari Tugas Divisi Persiapan (prepRecords)
  // ---------------------------------------------------------------------------
  const rejectedDailyAnalytics = useMemo(() => {
    const byDate = new Map<
      string,
      {
        date: string;
        vegetableKg: number;
        animalKg: number;
        fruitKg: number;
        totalKg: number;
        latestOfficer: string;
        latestTime: string;
        latestNotes: string;
        items: {
          category: 'Sayuran' | 'Protein Hewani' | 'Buah';
          name: string;
          quantity: number;
          unit: string;
          kgValue: number;
          temp: number;
        }[];
      }
    >();

    for (const rec of prepRecords) {
      const vegKg = convertToKg(rec.damagedVegetable?.quantity || 0, rec.damagedVegetable?.unit, rec.damagedVegetable?.name);
      const animKg = convertToKg(rec.damagedAnimal?.quantity || 0, rec.damagedAnimal?.unit, rec.damagedAnimal?.name);
      const fruitKg = convertToKg(rec.damagedFruit?.quantity || 0, rec.damagedFruit?.unit, rec.damagedFruit?.name);

      const recItems = [
        {
          category: 'Sayuran' as const,
          name: rec.damagedVegetable?.name || '-',
          quantity: rec.damagedVegetable?.quantity || 0,
          unit: rec.damagedVegetable?.unit || 'kg',
          kgValue: vegKg,
          temp: rec.damagedVegetable?.temp ?? 0,
        },
        {
          category: 'Protein Hewani' as const,
          name: rec.damagedAnimal?.name || '-',
          quantity: rec.damagedAnimal?.quantity || 0,
          unit: rec.damagedAnimal?.unit || 'kg',
          kgValue: animKg,
          temp: rec.damagedAnimal?.temp ?? 0,
        },
        {
          category: 'Buah' as const,
          name: rec.damagedFruit?.name || '-',
          quantity: rec.damagedFruit?.quantity || 0,
          unit: rec.damagedFruit?.unit || 'kg',
          kgValue: fruitKg,
          temp: rec.damagedFruit?.temp ?? 0,
        },
      ].filter(item => item.quantity > 0 || (item.name && item.name !== '-'));

      const existing = byDate.get(rec.date);
      if (existing) {
        existing.vegetableKg += vegKg;
        existing.animalKg += animKg;
        existing.fruitKg += fruitKg;
        existing.totalKg += vegKg + animKg + fruitKg;
        existing.items.push(...recItems);
      } else {
        byDate.set(rec.date, {
          date: rec.date,
          vegetableKg: vegKg,
          animalKg: animKg,
          fruitKg: fruitKg,
          totalKg: vegKg + animKg + fruitKg,
          latestOfficer: rec.officerName,
          latestTime: rec.time,
          latestNotes: rec.notes,
          items: recItems,
        });
      }
    }

    const sortedDays = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
    const chartData: StackedDailyBarItem[] = sortedDays.map(d => ({
      date: d.date,
      label: formatShortDate(d.date),
      total: d.totalKg,
      subMeta: `Petugas: ${d.latestOfficer}`,
      segments: [
        { key: 'vegetable', label: 'Sayuran Rijek', value: d.vegetableKg, color: '#16A34A' },
        { key: 'animal', label: 'Hewani / Trimming', value: d.animalKg, color: '#DC2626' },
        { key: 'fruit', label: 'Buah Rijek', value: d.fruitKg, color: '#D97706' },
      ],
    }));

    const totalAllDaysKg = sortedDays.reduce((acc, d) => acc + d.totalKg, 0);
    const avgDailyKg = sortedDays.length > 0 ? totalAllDaysKg / sortedDays.length : 0;
    const latestDay = sortedDays[sortedDays.length - 1] || null;

    return { sortedDays, chartData, totalAllDaysKg, avgDailyKg, latestDay };
  }, [prepRecords, masterUnits, materialConversions]);

  const [selectedPrepDate, setSelectedPrepDate] = useState<string>('');
  const activePrepDay = useMemo(() => {
    if (rejectedDailyAnalytics.sortedDays.length === 0) return null;
    return (
      rejectedDailyAnalytics.sortedDays.find(d => d.date === selectedPrepDate) ||
      rejectedDailyAnalytics.latestDay
    );
  }, [rejectedDailyAnalytics, selectedPrepDate]);

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

      {/* Row 5: Grafik Food Waste Harian & Statistik Bahan Rijek Harian */}
      <div>
        <h3 className="text-xs font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider mb-3">
          3. Grafik Food Waste Harian & Informasi Bahan Rijek Harian
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Panel 1: Grafik Food Waste Harian (Divisi Cuci Ompreng) */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-[#E2E8F0] dark:border-slate-800 shadow-[0_1px_3px_rgba(20,43,74,0.04)] flex flex-col justify-between gap-4">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E2E8F0] dark:border-slate-800 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-[#D97706]/10 text-[#D97706] dark:bg-amber-950/60 dark:text-amber-400 shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#1F2937] dark:text-white">
                      Grafik Food Waste Harian (Divisi Cuci Ompreng)
                    </h4>
                    <p className="text-xs text-[#64748B] dark:text-slate-400">
                      Sisa makanan per komponen menu dari pencatatan harian Divisi Cuci Ompreng · Klik batang untuk detail
                    </p>
                  </div>
                </div>
                {activeWasteDay && (
                  <span className="text-[11px] font-mono font-bold text-[#0F766E] dark:text-teal-400 shrink-0">
                    {formatShortDate(activeWasteDay.date)} · {activeWasteDay.total.toFixed(1)} kg
                  </span>
                )}
              </div>

              <StackedDailyBarChart
                data={wasteDailyAnalytics.chartData}
                legendItems={[
                  { key: 'rice', label: 'Nasi / Pokok', color: '#D97706' },
                  { key: 'vegetable', label: 'Sayuran', color: '#16A34A' },
                  { key: 'plant', label: 'Lauk Nabati', color: '#0F766E' },
                  { key: 'animal', label: 'Lauk Hewani', color: '#142B4A' },
                  { key: 'fruit', label: 'Buah', color: '#2563EB' },
                ]}
                unitLabel="kg"
                height={210}
                selectedDate={activeWasteDay?.date}
                onSelectDate={setSelectedWasteDate}
                emptyMessage="Belum ada laporan food waste dari Divisi Cuci Ompreng."
              />

              {/* KPI Strip for Selected Waste Day */}
              {activeWasteDay && (
                <div className="mt-4 pt-4 border-t border-[#E2E8F0] dark:border-slate-800 space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 tabular-nums">
                    <div>
                      <div className="text-[11px] text-[#64748B] dark:text-slate-400">
                        Total Sisa ({formatShortDate(activeWasteDay.date)})
                      </div>
                      <div className="text-sm font-extrabold text-[#1F2937] dark:text-white font-mono">
                        {activeWasteDay.total.toFixed(1)} kg
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-[#64748B] dark:text-slate-400">
                        Sisa per Siswa
                      </div>
                      <div className="text-sm font-extrabold text-[#D97706] dark:text-amber-400 font-mono">
                        {totalRecipients > 0
                          ? `${((activeWasteDay.total * 1000) / totalRecipients).toFixed(1)} g`
                          : '0 g'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-[#64748B] dark:text-slate-400">
                        Rata-rata Harian
                      </div>
                      <div className="text-sm font-extrabold text-[#142B4A] dark:text-sky-400 font-mono">
                        {wasteDailyAnalytics.avgDailyKg.toFixed(1)} kg
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-[#64748B] dark:text-slate-400">
                        Sterilisasi Ompreng
                      </div>
                      <div
                        className={`text-xs font-bold mt-0.5 flex items-center gap-1 ${
                          activeWasteDay.sterilizedAll
                            ? 'text-[#16A34A] dark:text-emerald-400'
                            : 'text-[#D97706] dark:text-amber-400'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>{activeWasteDay.sterilizedAll ? 'Terverifikasi' : 'Perlu Cek'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Selected Day Component Breakdown */}
                  <div className="grid grid-cols-5 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-center tabular-nums">
                    <div>
                      <div className="text-[10px] text-[#64748B]">Nasi</div>
                      <div className="text-xs font-bold font-mono text-[#D97706]">
                        {activeWasteDay.rice.toFixed(1)} kg
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#64748B]">Sayur</div>
                      <div className="text-xs font-bold font-mono text-[#16A34A]">
                        {activeWasteDay.vegetable.toFixed(1)} kg
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#64748B]">Nabati</div>
                      <div className="text-xs font-bold font-mono text-[#0F766E]">
                        {activeWasteDay.plant.toFixed(1)} kg
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#64748B]">Hewani</div>
                      <div className="text-xs font-bold font-mono text-[#142B4A] dark:text-sky-300">
                        {activeWasteDay.animal.toFixed(1)} kg
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#64748B]">Buah</div>
                      <div className="text-xs font-bold font-mono text-[#2563EB] dark:text-blue-400">
                        {activeWasteDay.fruit.toFixed(1)} kg
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-[#64748B] dark:text-slate-400 leading-relaxed">
                    <span className="font-semibold text-[#1F2937] dark:text-slate-200">
                      Petugas ({activeWasteDay.latestTime}):
                    </span>{' '}
                    {activeWasteDay.latestOfficer} — {activeWasteDay.latestNotes}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => onNavigate('production')}
              className="w-full py-2.5 bg-[#F4F7FA] hover:bg-[#E2E8F0]/70 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#142B4A] dark:text-slate-200 border border-[#E2E8F0] dark:border-slate-700 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Kelola Data Tugas Divisi Cuci Ompreng</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Panel 2: Grafik & Statistik Informasi Bahan Rijek Harian (Divisi Persiapan) */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-[#E2E8F0] dark:border-slate-800 shadow-[0_1px_3px_rgba(20,43,74,0.04)] flex flex-col justify-between gap-4">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E2E8F0] dark:border-slate-800 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-[#DC2626]/10 text-[#DC2626] dark:bg-rose-950/60 dark:text-rose-400 shrink-0">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#1F2937] dark:text-white">
                      Grafik & Statistik Bahan Rijek Harian (Divisi Persiapan)
                    </h4>
                    <p className="text-xs text-[#64748B] dark:text-slate-400">
                      Sortasi bahan rusak/afkir sebelum pengolahan dari tugas Divisi Persiapan · Klik batang untuk detail
                    </p>
                  </div>
                </div>
                {activePrepDay && (
                  <span className="text-[11px] font-mono font-bold text-[#DC2626] dark:text-rose-400 shrink-0">
                    {formatShortDate(activePrepDay.date)} · {activePrepDay.totalKg.toFixed(1)} kg
                  </span>
                )}
              </div>

              <StackedDailyBarChart
                data={rejectedDailyAnalytics.chartData}
                legendItems={[
                  { key: 'vegetable', label: 'Sayuran Rijek', color: '#16A34A' },
                  { key: 'animal', label: 'Hewani / Trimming', color: '#DC2626' },
                  { key: 'fruit', label: 'Buah Rijek', color: '#D97706' },
                ]}
                unitLabel="kg"
                height={210}
                selectedDate={activePrepDay?.date}
                onSelectDate={setSelectedPrepDate}
                emptyMessage="Belum ada data sortasi bahan rijek dari Divisi Persiapan."
              />

              {/* KPI & Detail List of Rejected Ingredients for Selected Date */}
              {activePrepDay && (
                <div className="mt-4 pt-4 border-t border-[#E2E8F0] dark:border-slate-800 space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 tabular-nums">
                    <div>
                      <div className="text-[11px] text-[#64748B] dark:text-slate-400">
                        Rijek ({formatShortDate(activePrepDay.date)})
                      </div>
                      <div className="text-sm font-extrabold text-[#DC2626] dark:text-rose-400 font-mono">
                        {activePrepDay.totalKg.toFixed(1)} kg
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-[#64748B] dark:text-slate-400">
                        Rata-rata / Hari
                      </div>
                      <div className="text-sm font-extrabold text-[#142B4A] dark:text-sky-400 font-mono">
                        {rejectedDailyAnalytics.avgDailyKg.toFixed(1)} kg
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-[#64748B] dark:text-slate-400">
                        Akumulasi Terdata
                      </div>
                      <div className="text-sm font-extrabold text-[#1F2937] dark:text-white font-mono">
                        {rejectedDailyAnalytics.totalAllDaysKg.toFixed(1)} kg
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-[#64748B] dark:text-slate-400">
                        Jumlah Hari Tercatat
                      </div>
                      <div className="text-sm font-extrabold text-[#0F766E] dark:text-teal-400 font-mono">
                        {rejectedDailyAnalytics.sortedDays.length} Hari
                      </div>
                    </div>
                  </div>

                  {/* Compact Table of Rejected Items */}
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                    <table className="w-full text-[11px] text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold">
                        <tr>
                          <th className="py-1.5 px-2.5">Kategori</th>
                          <th className="py-1.5 px-2.5">Bahan Rijek / Trimming</th>
                          <th className="py-1.5 px-2.5 text-right">Suhu</th>
                          <th className="py-1.5 px-2.5 text-right">Jumlah</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 tabular-nums">
                        {activePrepDay.items.map((item, idx) => (
                          <tr key={`${item.category}-${idx}`} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                            <td className="py-1.5 px-2.5 font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                              {item.category}
                            </td>
                            <td className="py-1.5 px-2.5 text-slate-600 dark:text-slate-300">
                              {item.name}
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                              <span className="inline-flex items-center gap-0.5">
                                <Thermometer className="w-3 h-3 text-slate-400" />
                                {item.temp}°C
                              </span>
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-mono font-bold text-[#DC2626] dark:text-rose-400 whitespace-nowrap">
                              {item.quantity} {item.unit}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="text-[11px] text-[#64748B] dark:text-slate-400 leading-relaxed">
                    <span className="font-semibold text-[#1F2937] dark:text-slate-200">
                      Petugas ({activePrepDay.latestTime}):
                    </span>{' '}
                    {activePrepDay.latestOfficer} — {activePrepDay.latestNotes}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => onNavigate('production')}
              className="w-full py-2.5 bg-[#F4F7FA] hover:bg-[#E2E8F0]/70 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#142B4A] dark:text-slate-200 border border-[#E2E8F0] dark:border-slate-700 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Kelola Data Tugas Divisi Persiapan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
