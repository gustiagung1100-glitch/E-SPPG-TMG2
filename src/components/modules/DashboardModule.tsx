import React, { useMemo, useState } from 'react';
import { useApp } from '../../lib/store';
import { DashboardCard } from '../common/DashboardCard';
import { Modal } from '../common/Modal';
import { StackedDailyBarChart, StackedDailyBarItem } from '../common/Charts';
import { formatIndonesianDate, formatNumber, formatRupiah } from '../../lib/exportUtils';
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
  HeartPulse,
  ClipboardList,
  CalendarDays,
  Image as ImageIcon,
  Eye,
  Edit,
  Lock,
} from 'lucide-react';
import { DashboardSectionId, DivisionJobdesk, ModuleKey } from '../../types';
import { canUserViewDashboardSection } from '../../lib/dashboardConfig';

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
    currentUser,
    dashboardLayoutConfig,
    institutions,
    menuItems,
    inventory,
    purchaseOrders,
    distributionLogs,
    pettyCashOpeningBalance,
    pettyCashTransactions,
    volunteerAttendance,
    officialLetters,
    kitchenProgress,
    washingWasteRecords,
    prepRecords,
    sppgConfig,
    masterUnits,
    materialConversions,
    beneficiaryRecords,
    divisionJobdesks,
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

  // Active Menu Today (otomatis mendeteksi tanggal hari ini atau menu aktif terdekat)
  const realTodayIso = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);
  const todayDateStr = '2026-11-08';
  const menuToday =
    menuItems.find(m => m.date === realTodayIso) ||
    menuItems.find(m => m.date === todayDateStr) ||
    menuItems[0];
  const activeMenuCount = menuItems.length;

  // Financial Stats (Kas Petty Cash & Pengadaan)
  const totalRAB =
    totalSmallPortions * (sppgConfig.smallPortionBudget || 8000) +
    totalLargePortions * (sppgConfig.largePortionBudget || 10000);
  const totalPOAmount = purchaseOrders.reduce((acc, p) => acc + p.totalAmount, 0);
  const pettyCashIncome = pettyCashTransactions
    .filter(t => t.type === 'Pemasukan')
    .reduce((acc, t) => acc + t.amount, 0);
  const pettyCashExpense = pettyCashTransactions
    .filter(t => t.type === 'Pengeluaran')
    .reduce((acc, t) => acc + t.amount, 0);
  const pettyCashEndingBalance = pettyCashOpeningBalance + pettyCashIncome - pettyCashExpense;

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
  // 3. Statistik Gizi & Antropometri WHO/Kemenkes Real-Time (beneficiaryRecords)
  // ---------------------------------------------------------------------------
  const nutritionStats = useMemo(() => {
    const total = beneficiaryRecords.length;
    const normal = beneficiaryRecords.filter(r => r.primaryStatus === 'Normal').length;
    const stunting = beneficiaryRecords.filter(r => r.isStunted).length;
    const underweight = beneficiaryRecords.filter(r => r.isUnderweight).length;
    const wasting = beneficiaryRecords.filter(r => r.isWasted).length;
    const overweight = beneficiaryRecords.filter(r => r.primaryStatus === 'Gizi Lebih').length;

    const byInstitutionMap = new Map<
      string,
      {
        institutionName: string;
        total: number;
        normal: number;
        stunting: number;
        underweight: number;
        wasting: number;
      }
    >();

    for (const r of beneficiaryRecords) {
      const existing = byInstitutionMap.get(r.institutionName) || {
        institutionName: r.institutionName,
        total: 0,
        normal: 0,
        stunting: 0,
        underweight: 0,
        wasting: 0,
      };
      existing.total += 1;
      if (r.primaryStatus === 'Normal') existing.normal += 1;
      if (r.isStunted) existing.stunting += 1;
      if (r.isUnderweight) existing.underweight += 1;
      if (r.isWasted) existing.wasting += 1;
      byInstitutionMap.set(r.institutionName, existing);
    }

    const priorityCases = beneficiaryRecords
      .filter(r => r.isWasted || r.isStunted || r.isUnderweight)
      .slice(0, 6);

    return {
      total,
      normal,
      stunting,
      underweight,
      wasting,
      overweight,
      normalPct: total > 0 ? ((normal / total) * 100).toFixed(1) : '0.0',
      byInstitution: Array.from(byInstitutionMap.values()),
      priorityCases,
    };
  }, [beneficiaryRecords]);

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
          { key: 'vegetable', label: 'Sayuran', value: d.vegetable, color: '#0D9488' },
          { key: 'plant', label: 'Lauk Nabati', value: d.plant, color: '#0F766E' },
          { key: 'animal', label: 'Lauk Hewani', value: d.animal, color: '#1E3A8A' },
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
        { key: 'vegetable', label: 'Sayuran Rijek', value: d.vegetableKg, color: '#0D9488' },
        { key: 'animal', label: 'Hewani / Trimming', value: d.animalKg, color: '#E11D48' },
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

  // ---------------------------------------------------------------------------
  // 5. SOP & Jobdesk Divisi Dapur MBG Harian Otomatis (Sumber PLOG)
  // ---------------------------------------------------------------------------
  const [selectedSopDate, setSelectedSopDate] = useState<string>('');
  const [selectedSopDivisionFilter, setSelectedSopDivisionFilter] = useState<string>('ALL');
  const [activeSopModalJob, setActiveSopModalJob] = useState<DivisionJobdesk | null>(null);
  const [activeSopModalPhotoIdx, setActiveSopModalPhotoIdx] = useState<number>(0);

  const sopDailyState = useMemo(() => {
    const divisionOrder: DivisionJobdesk['divisionName'][] = [
      'Relawan Div. Persiapan',
      'Relawan Div. Pengolahan',
      'Relawan Div. Pemorsian',
      'Relawan Div. Distribusi',
      'Relawan Div. Cuci Ompreng',
    ];

    const dateSet = new Set<string>([realTodayIso]);
    for (const m of menuItems) {
      if (m.date) dateSet.add(m.date);
    }
    for (const j of divisionJobdesks) {
      if (j.date) dateSet.add(j.date);
      const linkedMenu = menuItems.find(m => m.id === j.menuId);
      if (linkedMenu?.date) dateSet.add(linkedMenu.date);
    }

    const availableDates = Array.from(dateSet).filter(Boolean).sort((a, b) => b.localeCompare(a));

    const hasTodayData =
      divisionJobdesks.some(j => j.date === realTodayIso) ||
      menuItems.some(m => m.date === realTodayIso);

    const latestJobdeskDate = divisionJobdesks
      .map(j => j.date || menuItems.find(m => m.id === j.menuId)?.date || '')
      .filter(Boolean)
      .sort((a, b) => b.localeCompare(a))[0];

    const defaultDate = hasTodayData
      ? realTodayIso
      : latestJobdeskDate || menuToday?.date || availableDates[0] || realTodayIso;

    const activeDate = selectedSopDate && availableDates.includes(selectedSopDate) ? selectedSopDate : defaultDate;
    const activeMenu = menuItems.find(m => m.date === activeDate) || menuToday || menuItems[0];

    const directMatches = divisionJobdesks.filter(j => {
      if (j.date && j.date === activeDate) return true;
      if (activeMenu && j.menuId === activeMenu.id) return true;
      return false;
    });

    const isUsingMenuSpecific = directMatches.length > 0;
    const resolvedList: DivisionJobdesk[] = divisionOrder
      .map(divName => {
        const direct = directMatches.find(j => j.divisionName === divName);
        if (direct) return direct;
        return divisionJobdesks.find(j => j.divisionName === divName);
      })
      .filter((item): item is DivisionJobdesk => Boolean(item));

    const filteredList =
      selectedSopDivisionFilter === 'ALL'
        ? resolvedList
        : resolvedList.filter(j => j.divisionName === selectedSopDivisionFilter);

    const doneCount = resolvedList.filter(j => j.status === 'Selesai Sesuai Standar').length;
    const inProgressCount = resolvedList.filter(j => j.status === 'Sedang Berjalan').length;
    const pendingCount = resolvedList.filter(j => j.status === 'Belum Mulai').length;
    const totalPhotos = resolvedList.reduce((acc, j) => {
      const count = Array.isArray(j.photoUrls) && j.photoUrls.length > 0 ? j.photoUrls.filter(Boolean).length : j.photoUrl ? 1 : 0;
      return acc + count;
    }, 0);

    return {
      availableDates,
      activeDate,
      activeMenu,
      isUsingMenuSpecific,
      resolvedList,
      filteredList,
      doneCount,
      inProgressCount,
      pendingCount,
      totalPhotos,
    };
  }, [divisionJobdesks, menuItems, menuToday, realTodayIso, selectedSopDate, selectedSopDivisionFilter]);

  const gridGapClass =
    dashboardLayoutConfig.density === 'compact'
      ? 'gap-4'
      : dashboardLayoutConfig.density === 'spacious'
      ? 'gap-8'
      : 'gap-6';

  const getKpiGridClass = (defaultCols: 4 | 5) => {
    const colSetting = dashboardLayoutConfig.kpiColumns;
    if (colSetting === 2) return 'grid grid-cols-1 sm:grid-cols-2 gap-4';
    if (colSetting === 3) return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4';
    if (colSetting === 4) return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4';
    if (colSetting === 5) return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4';
    return defaultCols === 5
      ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4'
      : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4';
  };

  const getSectionSpanClass = (width: 'full' | 'half' | 'third') => {
    if (width === 'half') return 'col-span-12 lg:col-span-6';
    if (width === 'third') return 'col-span-12 lg:col-span-4';
    return 'col-span-12';
  };

  const visibleOrderedSectionIds = useMemo(() => {
    return dashboardLayoutConfig.sectionOrder.filter(id => {
      const cfg = dashboardLayoutConfig.sections[id];
      if (!cfg) return false;
      return canUserViewDashboardSection(cfg, currentUser);
    });
  }, [dashboardLayoutConfig, currentUser]);

  const renderDashboardSection = (sectionId: DashboardSectionId): React.ReactNode => {
    switch (sectionId) {
      case 'welcome_banner':
        return (
          <div className="bg-linear-to-r from-[#1E3A8A] via-[#1E3A8A] to-[#0D9488] rounded-xl px-5 py-4 text-white shadow-sm border border-white/10 relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-amber-300 mb-1">
                  Sistem ERP SPPG Aktif &amp; Terverifikasi
                </div>
                <h2 className="text-lg md:text-xl font-bold tracking-tight text-white">
                  {sppgConfig.sppgName}
                </h2>
                <p className="text-xs text-blue-100 mt-0.5 max-w-2xl leading-relaxed">
                  Pusat komando dan kendali terpadu Program Makan Bergizi Gratis (MBG) Kecamatan Krejengan.
                  Pengelolaan gizi, rantai pasok, dapur, armada distribusi, dan akuntabilitas keuangan secara real-time.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onNavigate('reports')}
                  className="px-3.5 py-2 bg-white text-[#1E3A8A] hover:bg-slate-100 rounded-xl text-xs font-bold shadow-sm transition-all duration-200 ease-out active:scale-[0.98] whitespace-nowrap cursor-pointer"
                >
                  Laporan Harian BGN
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('distribution')}
                  className="px-3.5 py-2 bg-[#0D9488] hover:bg-teal-700 text-white border border-white/15 rounded-xl text-xs font-bold shadow-sm transition-all duration-200 ease-out active:scale-[0.98] whitespace-nowrap cursor-pointer"
                >
                  Pantau Distribusi
                </button>
              </div>
            </div>

            {/* Subtle geometric highlight */}
            <div className="absolute right-0 bottom-0 translate-x-10 translate-y-10 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />
          </div>
        );

      case 'critical_alerts':
        if (criticalStockItems.length === 0 && pendingPOs.length === 0 && absentVolunteers.length === 0) {
          return null;
        }
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 items-stretch">
            {criticalStockItems.length > 0 && (
              <div
                onClick={() => onNavigate('inventory')}
                className="cursor-pointer bg-white dark:bg-slate-900 border border-rose-200/80 dark:border-rose-900 rounded-xl p-4 shadow-sm flex items-start gap-3 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 ease-out h-full"
              >
                <div className="p-2 rounded-lg bg-rose-50 text-[#E11D48] dark:bg-rose-950/60 dark:text-rose-400 shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-900 dark:text-rose-200">
                    {criticalStockItems.length} Bahan di Bawah Minimum
                  </h5>
                  <p className="text-[11px] text-slate-600 dark:text-rose-300 mt-0.5">
                    {criticalStockItems.map(i => i.name).join(', ')}. Segera lakukan restock!
                  </p>
                </div>
              </div>
            )}

            {pendingPOs.length > 0 && (
              <div
                onClick={() => onNavigate('procurement')}
                className="cursor-pointer bg-white dark:bg-slate-900 border border-amber-200/80 dark:border-amber-900 rounded-xl p-4 shadow-sm flex items-start gap-3 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 ease-out h-full"
              >
                <div className="p-2 rounded-lg bg-amber-50 text-[#D97706] dark:bg-amber-950/60 dark:text-amber-400 shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-900 dark:text-amber-200">
                    {pendingPOs.length} PO Menunggu Persetujuan
                  </h5>
                  <p className="text-[11px] text-slate-600 dark:text-amber-300 mt-0.5">
                    Menunggu verifikasi Pengawas Keuangan / Kepala SPPG.
                  </p>
                </div>
              </div>
            )}

            {absentVolunteers.length > 0 && (
              <div
                onClick={() => onNavigate('volunteers')}
                className="cursor-pointer bg-white dark:bg-slate-900 border border-amber-200/80 dark:border-orange-900 rounded-xl p-4 shadow-sm flex items-start gap-3 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 ease-out h-full"
              >
                <div className="p-2 rounded-lg bg-amber-50 text-[#D97706] dark:bg-amber-950/60 dark:text-amber-400 shrink-0">
                  <UserX className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-900 dark:text-orange-200">
                    {absentVolunteers.length} Relawan Tidak Hadir
                  </h5>
                  <p className="text-[11px] text-slate-600 dark:text-orange-300 mt-0.5">
                    {absentVolunteers.map(v => `${v.volunteerName} (${v.status})`).join(', ')}.
                  </p>
                </div>
              </div>
            )}
          </div>
        );

      case 'beneficiary_kpi':
        return (
          <div>
            <h3 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3">
              1. Penerima Manfaat &amp; Kapasitas Porsi
            </h3>
            <div className={getKpiGridClass(5)}>
              <DashboardCard
                title="Total Penerima Manfaat"
                value={`${formatNumber(totalRecipients)} Siswa`}
                subtitle="Target harian terealisasi 100%"
                icon={<Users className="w-5 h-5" />}
                badge={{ text: 'Aktif MBG', color: 'blue' }}
                accentColor="navy"
                onClick={() => onNavigate('institutions')}
              />
              <DashboardCard
                title="Jumlah Lembaga"
                value={`${totalInstitutions} Lembaga`}
                subtitle="SD, MI, SMP, MTs, SMK, Pesantren"
                icon={<School className="w-5 h-5" />}
                badge={{ text: 'Krejengan', color: 'emerald' }}
                accentColor="sky"
                onClick={() => onNavigate('institutions')}
              />
              <DashboardCard
                title="Total Porsi Kecil"
                value={`${formatNumber(totalSmallPortions)} Porsi`}
                subtitle="PAUD/TK & SD Kelas 1-3 (~620 kkal)"
                icon={<Utensils className="w-5 h-5" />}
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
                icon={<Utensils className="w-5 h-5" />}
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
                icon={<ChefHat className="w-5 h-5" />}
                badge={{ text: 'Tercapai', color: 'amber' }}
                accentColor="amber"
                onClick={() => onNavigate('production')}
              />
            </div>
          </div>
        );

      case 'today_menu':
        return (
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 ease-out flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-teal-50 text-[#0D9488] dark:bg-teal-950/60 dark:text-teal-400">
                  <Utensils className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Menu Gizi Hari Ini
                  </h4>
                  <span className="text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                    Kode: {menuToday.menuCode}
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-teal-50 text-[#0D9488] dark:bg-teal-950 dark:text-teal-300 border border-teal-200/80 dark:border-teal-800">
                {menuToday.status}
              </span>
            </div>

            <div className="mt-4 space-y-2 text-xs">
              <div className="flex items-start gap-2">
                <span className="text-slate-600 dark:text-slate-400 w-24 shrink-0">Pokok:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-200">
                  {menuToday.stapleFood}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-slate-600 dark:text-slate-400 w-24 shrink-0">Lauk Hewani:</span>
                <span className="font-semibold text-[#1E3A8A] dark:text-sky-400">
                  {menuToday.animalProtein}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-slate-600 dark:text-slate-400 w-24 shrink-0">Lauk Nabati:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-200">
                  {menuToday.plantProtein}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-slate-600 dark:text-slate-400 w-24 shrink-0">Sayuran:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-200">
                  {menuToday.vegetable}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-slate-600 dark:text-slate-400 w-24 shrink-0">Buah Segar:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-200">
                  {menuToday.fruit}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-slate-600 dark:text-slate-400 w-24 shrink-0">Pelengkap:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-200">
                  {menuToday.milkOrExtra}
                </span>
              </div>
            </div>

            {/* Nutrition metrics badge */}
            <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-800 grid grid-cols-4 gap-2 text-center tabular-nums">
              <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-200/70 dark:border-slate-700">
                <div className="text-[10px] text-slate-600 dark:text-slate-400">Kalori (K/B)</div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  620 / 875
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-200/70 dark:border-slate-700">
                <div className="text-[10px] text-slate-600 dark:text-slate-400">Protein</div>
                <div className="text-xs font-bold text-[#0D9488] dark:text-teal-400">
                  {menuToday.proteinGrams}g
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-200/70 dark:border-slate-700">
                <div className="text-[10px] text-slate-600 dark:text-slate-400">Karbohidrat</div>
                <div className="text-xs font-bold text-[#D97706] dark:text-amber-400">
                  {menuToday.carbGrams}g
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-200/70 dark:border-slate-700">
                <div className="text-[10px] text-slate-600 dark:text-slate-400">Food Cost</div>
                <div className="text-xs font-bold text-[#1E3A8A] dark:text-sky-400">
                  {formatRupiah(menuToday.estimatedCostPerPortion)}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-2">
            <button
              type="button"
              onClick={() => onNavigate('menu')}
              className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#1E3A8A] dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 text-xs font-bold rounded-lg transition-all duration-200 ease-out active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Kelola Siklus Menu Lengkap ({activeMenuCount} Hari)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          </div>
        );

      case 'kitchen_progress':
        return (
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 ease-out flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-50 text-[#1E3A8A] dark:bg-blue-950/60 dark:text-sky-400">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Progres Tugas Divisi Dapur
                  </h4>
                  <span className="text-[11px] text-slate-600 dark:text-slate-400">
                    SOP &amp; Kecepatan Alur Produksi Harian
                  </span>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-[#0D9488] dark:text-teal-400">
                Live Status
              </span>
            </div>

            <div className="mt-4 space-y-3.5 tabular-nums">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-800 dark:text-slate-300">
                    Divisi Persiapan (Bahan, Potong, Cuci)
                  </span>
                  <span className="font-mono font-bold text-[#0D9488]">
                    {kitchenProgress.preparation}% Selesai
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#0D9488] h-full rounded-full transition-all duration-500"
                    style={{ width: `${kitchenProgress.preparation}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-800 dark:text-slate-300">
                    Divisi Pengolahan (Memasak &amp; Uji Suhu &gt; 75°C)
                  </span>
                  <span className="font-mono font-bold text-[#0D9488]">
                    {kitchenProgress.cooking}% Selesai
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#0D9488] h-full rounded-full transition-all duration-500"
                    style={{ width: `${kitchenProgress.cooking}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-800 dark:text-slate-300">
                    Divisi Pemorsian (Penimbangan &amp; Seal Boks)
                  </span>
                  <span className="font-mono font-bold text-[#1E3A8A] dark:text-sky-400">
                    {kitchenProgress.portioning}% Berjalan
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#1E3A8A] dark:bg-sky-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${kitchenProgress.portioning}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-800 dark:text-slate-300">
                    Divisi Distribusi (Armada &amp; Pengiriman Sekolah)
                  </span>
                  <span className="font-mono font-bold text-[#0D9488] dark:text-teal-400">
                    {kitchenProgress.distribution}% Terkirim
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#0D9488] h-full rounded-full transition-all duration-500"
                    style={{ width: `${kitchenProgress.distribution}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-800 dark:text-slate-300">
                    Divisi Cuci Ompreng (Sterilisasi Air Panas)
                  </span>
                  <span className="font-mono font-bold text-[#D97706]">
                    {kitchenProgress.washing}% Berjalan
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#D97706] h-full rounded-full transition-all duration-500"
                    style={{ width: `${kitchenProgress.washing}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-[#0D9488] dark:text-teal-400 font-medium">
                <CheckCircle2 className="w-4 h-4" /> Uji Organoleptik Chef: Lolos
              </span>
              <span className="flex items-center gap-1.5 text-[#0D9488] dark:text-teal-400 font-medium">
                <CheckCircle2 className="w-4 h-4" /> Suhu Pengiriman: 68.5°C
              </span>
            </div>
          </div>

          <div className="mt-4 pt-2">
            <button
              type="button"
              onClick={() => onNavigate('production')}
              className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#1E3A8A] dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 text-xs font-bold rounded-lg transition-all duration-200 ease-out active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Lihat Detail Produksi Dapur</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          </div>
        );

      case 'distribution_status':
        return (
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 ease-out flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-50 text-[#1E3A8A] dark:bg-blue-950/60 dark:text-blue-300">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Status Distribusi Armada
                  </h4>
                  <span className="text-[11px] text-slate-600 dark:text-slate-400">
                    6 Armada Melayani 8 Lembaga
                  </span>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 text-[#1E3A8A] dark:text-blue-300 border border-blue-200/80 dark:border-blue-800">
                {deliveredCount} / 8 Tiba
              </span>
            </div>

            <div className="mt-4 space-y-3 tabular-nums">
              <div className="flex items-center justify-between p-3 rounded-lg bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200/70 dark:border-teal-900">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#0D9488]" />
                  <span className="text-xs font-bold text-slate-900 dark:text-teal-200">
                    Selesai Serah Terima (BAST Sah)
                  </span>
                </div>
                <span className="text-sm font-bold text-[#0D9488] dark:text-teal-400">
                  {deliveredCount} Sekolah
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-900">
                <div className="flex items-center gap-2.5">
                  <Truck className="w-4 h-4 text-[#1E3A8A] dark:text-blue-400" />
                  <span className="text-xs font-bold text-slate-900 dark:text-blue-200">
                    Dalam Perjalanan (On Transit)
                  </span>
                </div>
                <span className="text-sm font-bold text-[#1E3A8A] dark:text-blue-400">
                  {inTransitCount} Sekolah
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-300">
                    Kloter Siang (SMP/SMA/MA)
                  </span>
                </div>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  {scheduledCount} Sekolah
                </span>
              </div>
            </div>

            <div className="mt-4 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              * Seluruh pengemudi dibekali termometer digital food grade dan Surat Jalan resmi ber-Kop SPPG TMG2.
            </div>
          </div>

          <div className="mt-4 pt-2">
            <button
              type="button"
              onClick={() => onNavigate('distribution')}
              className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#1E3A8A] dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 text-xs font-bold rounded-lg transition-all duration-200 ease-out active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Buka Log Serah Terima &amp; Surat Jalan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          </div>
        );

      case 'finance_petty_cash':
        return (
          <div>
            <h3 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3">
              2. Kas Petty Cash, Pengadaan &amp; Gudang Bahan Pangan
            </h3>
            <div className={getKpiGridClass(5)}>
          <DashboardCard
            title="Saldo Awal Petty Cash"
            value={formatRupiah(pettyCashOpeningBalance)}
            subtitle={`Plafon RAB Harian: ${formatRupiah(totalRAB)}`}
            icon={<Wallet className="w-5 h-5" />}
            badge={{ text: 'Saldo Awal', color: 'blue' }}
            accentColor="navy"
            onClick={() => onNavigate('petty_cash')}
          />
          <DashboardCard
            title="Total Purchase Order"
            value={formatRupiah(totalPOAmount)}
            subtitle="Pengadaan bahan pangan aktif"
            icon={<Coins className="w-5 h-5" />}
            badge={{ text: `${purchaseOrders.length} PO`, color: 'amber' }}
            accentColor="amber"
            onClick={() => onNavigate('procurement')}
          />
          <DashboardCard
            title="Pemasukan Petty Cash"
            value={formatRupiah(pettyCashIncome)}
            subtitle="Top up & pengisian kas kecil"
            icon={<Coins className="w-5 h-5" />}
            badge={{ text: 'Kas Masuk', color: 'emerald' }}
            accentColor="emerald"
            onClick={() => onNavigate('petty_cash')}
          />
          <DashboardCard
            title="Pengeluaran Petty Cash"
            value={formatRupiah(pettyCashExpense)}
            subtitle="Operasional, bahan & insentif"
            icon={<Wallet className="w-5 h-5" />}
            badge={{ text: 'Kas Keluar', color: 'rose' }}
            accentColor="rose"
            onClick={() => onNavigate('petty_cash')}
          />
          <DashboardCard
            title="Saldo Akhir Petty Cash"
            value={formatRupiah(pettyCashEndingBalance)}
            subtitle="Saldo Awal + Masuk − Keluar"
            icon={<Wallet className="w-5 h-5" />}
            badge={{ text: pettyCashEndingBalance >= 0 ? 'Aman' : 'Defisit', color: pettyCashEndingBalance >= 0 ? 'emerald' : 'rose' }}
            accentColor="sky"
            onClick={() => onNavigate('petty_cash')}
          />
            </div>
          </div>
        );

      case 'inventory_admin_kpi':
        return (
          <div className={getKpiGridClass(4)}>
        <DashboardCard
          title="Stok Bahan Gudang"
          value={`${totalStockItems} Item`}
          subtitle={`${criticalStockItems.length} item di bawah batas safety stock`}
          icon={<Boxes className="w-5 h-5" />}
          badge={{ text: criticalStockItems.length > 0 ? 'Perlu Restock' : 'Aman', color: criticalStockItems.length > 0 ? 'rose' : 'emerald' }}
          accentColor={criticalStockItems.length > 0 ? 'rose' : 'indigo'}
          onClick={() => onNavigate('inventory')}
        />
        <DashboardCard
          title="Relawan Tidak Hadir"
          value={`${absentVolunteers.length} Orang`}
          subtitle="Telah dialokasikan relawan cadangan"
          icon={<UserX className="w-5 h-5" />}
          badge={{ text: 'Tergantikan', color: 'amber' }}
          accentColor="amber"
          onClick={() => onNavigate('volunteers')}
        />
        <DashboardCard
          title="Tata Persuratan SPPG"
          value={`${incomingLetters + outgoingLetters} Surat`}
          subtitle={`${incomingLetters} Surat Masuk | ${outgoingLetters} Surat Keluar`}
          icon={<Mail className="w-5 h-5" />}
          badge={{ text: 'Tertib Arsip', color: 'blue' }}
          accentColor="sky"
          onClick={() => onNavigate('letters')}
        />
        <DashboardCard
          title="Kelengkapan Laporan BGN"
          value="98.5%"
          subtitle="Formulir harian & dokumentasi lengkap"
          icon={<FileCheck2 className="w-5 h-5" />}
          badge={{ text: 'Siap Ekspor', color: 'emerald' }}
          accentColor="emerald"
          onClick={() => onNavigate('reports')}
        />
          </div>
        );

      case 'waste_rejected_charts':
        return (
          <div>
        <h3 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3">
          3. Grafik Food Waste Harian &amp; Informasi Bahan Rijek Harian
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Panel 1: Grafik Food Waste Harian (Divisi Cuci Ompreng) */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 ease-out flex flex-col justify-between h-full gap-4">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/80 dark:border-slate-800 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-amber-50 text-[#D97706] dark:bg-amber-950/60 dark:text-amber-400 shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Grafik Food Waste Harian (Divisi Cuci Ompreng)
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Sisa makanan per komponen menu dari pencatatan harian Divisi Cuci Ompreng · Klik batang untuk detail
                    </p>
                  </div>
                </div>
                {activeWasteDay && (
                  <span className="text-[11px] font-mono font-bold text-[#0D9488] dark:text-teal-400 shrink-0">
                    {formatShortDate(activeWasteDay.date)} · {activeWasteDay.total.toFixed(1)} kg
                  </span>
                )}
              </div>

              <StackedDailyBarChart
                data={wasteDailyAnalytics.chartData}
                legendItems={[
                  { key: 'rice', label: 'Nasi / Pokok', color: '#D97706' },
                  { key: 'vegetable', label: 'Sayuran', color: '#0D9488' },
                  { key: 'plant', label: 'Lauk Nabati', color: '#0F766E' },
                  { key: 'animal', label: 'Lauk Hewani', color: '#1E3A8A' },
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
                <div className="mt-4 pt-4 border-t border-slate-200/80 dark:border-slate-800 space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 tabular-nums">
                    <div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-400">
                        Total Sisa ({formatShortDate(activeWasteDay.date)})
                      </div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                        {activeWasteDay.total.toFixed(1)} kg
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-400">
                        Sisa per Siswa
                      </div>
                      <div className="text-sm font-bold text-[#D97706] dark:text-amber-400 font-mono">
                        {totalRecipients > 0
                          ? `${((activeWasteDay.total * 1000) / totalRecipients).toFixed(1)} g`
                          : '0 g'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-400">
                        Rata-rata Harian
                      </div>
                      <div className="text-sm font-bold text-[#1E3A8A] dark:text-sky-400 font-mono">
                        {wasteDailyAnalytics.avgDailyKg.toFixed(1)} kg
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-400">
                        Sterilisasi Ompreng
                      </div>
                      <div
                        className={`text-xs font-bold mt-0.5 flex items-center gap-1 ${
                          activeWasteDay.sterilizedAll
                            ? 'text-[#0D9488] dark:text-teal-400'
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
                      <div className="text-[10px] text-slate-600 dark:text-slate-400">Nasi</div>
                      <div className="text-xs font-bold font-mono text-[#D97706]">
                        {activeWasteDay.rice.toFixed(1)} kg
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-600 dark:text-slate-400">Sayur</div>
                      <div className="text-xs font-bold font-mono text-[#0D9488]">
                        {activeWasteDay.vegetable.toFixed(1)} kg
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-600 dark:text-slate-400">Nabati</div>
                      <div className="text-xs font-bold font-mono text-[#0F766E]">
                        {activeWasteDay.plant.toFixed(1)} kg
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-600 dark:text-slate-400">Hewani</div>
                      <div className="text-xs font-bold font-mono text-[#1E3A8A] dark:text-sky-300">
                        {activeWasteDay.animal.toFixed(1)} kg
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-600 dark:text-slate-400">Buah</div>
                      <div className="text-xs font-bold font-mono text-[#2563EB] dark:text-blue-400">
                        {activeWasteDay.fruit.toFixed(1)} kg
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    <span className="font-semibold text-slate-900 dark:text-slate-200">
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
              className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#1E3A8A] dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 text-xs font-bold rounded-lg transition-all duration-200 ease-out active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Kelola Data Tugas Divisi Cuci Ompreng</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Panel 2: Grafik & Statistik Informasi Bahan Rijek Harian (Divisi Persiapan) */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 ease-out flex flex-col justify-between h-full gap-4">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/80 dark:border-slate-800 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-rose-50 text-[#E11D48] dark:bg-rose-950/60 dark:text-rose-400 shrink-0">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Grafik &amp; Statistik Bahan Rijek Harian (Divisi Persiapan)
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Sortasi bahan rusak/afkir sebelum pengolahan dari tugas Divisi Persiapan · Klik batang untuk detail
                    </p>
                  </div>
                </div>
                {activePrepDay && (
                  <span className="text-[11px] font-mono font-bold text-[#E11D48] dark:text-rose-400 shrink-0">
                    {formatShortDate(activePrepDay.date)} · {activePrepDay.totalKg.toFixed(1)} kg
                  </span>
                )}
              </div>

              <StackedDailyBarChart
                data={rejectedDailyAnalytics.chartData}
                legendItems={[
                  { key: 'vegetable', label: 'Sayuran Rijek', color: '#0D9488' },
                  { key: 'animal', label: 'Hewani / Trimming', color: '#E11D48' },
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
                <div className="mt-4 pt-4 border-t border-slate-200/80 dark:border-slate-800 space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 tabular-nums">
                    <div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-400">
                        Rijek ({formatShortDate(activePrepDay.date)})
                      </div>
                      <div className="text-sm font-bold text-[#E11D48] dark:text-rose-400 font-mono">
                        {activePrepDay.totalKg.toFixed(1)} kg
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-400">
                        Rata-rata / Hari
                      </div>
                      <div className="text-sm font-bold text-[#1E3A8A] dark:text-sky-400 font-mono">
                        {rejectedDailyAnalytics.avgDailyKg.toFixed(1)} kg
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-400">
                        Akumulasi Terdata
                      </div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                        {rejectedDailyAnalytics.totalAllDaysKg.toFixed(1)} kg
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-400">
                        Jumlah Hari Tercatat
                      </div>
                      <div className="text-sm font-bold text-[#0D9488] dark:text-teal-400 font-mono">
                        {rejectedDailyAnalytics.sortedDays.length} Hari
                      </div>
                    </div>
                  </div>

                  {/* Compact Table of Rejected Items */}
                  <div className="overflow-x-auto border border-slate-200/80 dark:border-slate-800 rounded-lg">
                    <table className="w-full text-[11px] text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold">
                        <tr>
                          <th className="py-1.5 px-2.5 sticky left-0 z-10 bg-slate-50 dark:bg-slate-800">Kategori</th>
                          <th className="py-1.5 px-2.5">Bahan Rijek / Trimming</th>
                          <th className="py-1.5 px-2.5 text-right">Suhu</th>
                          <th className="py-1.5 px-2.5 text-right">Jumlah</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 tabular-nums">
                        {activePrepDay.items.map((item, idx) => (
                          <tr key={`${item.category}-${idx}`} className="group hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                            <td className="py-1.5 px-2.5 sticky left-0 z-10 bg-white group-hover:bg-slate-50 dark:bg-slate-900 dark:group-hover:bg-slate-800 font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                              {item.category}
                            </td>
                            <td className="py-1.5 px-2.5 text-slate-600 dark:text-slate-300">
                              {item.name}
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                              <span className="inline-flex items-center gap-0.5">
                                <Thermometer className="w-3 h-3 text-slate-400" />
                                {item.temp}°C
                              </span>
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-mono font-bold text-[#E11D48] dark:text-rose-400 whitespace-nowrap">
                              {item.quantity} {item.unit}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    <span className="font-semibold text-slate-900 dark:text-slate-200">
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
              className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#1E3A8A] dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 text-xs font-bold rounded-lg transition-all duration-200 ease-out active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Kelola Data Tugas Divisi Persiapan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
          </div>
        );

      case 'nutrition_who':
        return (
          <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <HeartPulse className="w-4 h-4 text-[#0D9488] dark:text-teal-400" />
              <span>4. Pemantauan Status Gizi Anak &amp; Antropometri WHO/Kemenkes (Real-Time)</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Diperbarui otomatis setiap kali kader atau ahli gizi menyimpan atau mengubah data anak pada Modul Penerima Manfaat.
            </p>
          </div>
        </div>

        {/* 4 Nutrition KPI Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 tabular-nums items-stretch">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 ease-out flex flex-col justify-between h-full">
            <div className="text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400">
              Total Anak Terpantau
            </div>
            <div className="text-2xl font-bold tracking-tight text-[#1E3A8A] dark:text-white mt-1">
              {formatNumber(nutritionStats.total)} Anak
            </div>
            <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
              NIK 16-digit terverifikasi unik
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 ease-out flex flex-col justify-between h-full">
            <div className="text-[11px] font-bold uppercase text-[#0D9488] dark:text-teal-400">
              Gizi Normal (Ideal)
            </div>
            <div className="text-2xl font-bold tracking-tight text-[#0D9488] dark:text-teal-400 mt-1">
              {nutritionStats.normal} <span className="text-sm font-bold">({nutritionStats.normalPct}%)</span>
            </div>
            <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
              Ambang batas -2 SD s.d. +2 SD
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 ease-out flex flex-col justify-between h-full">
            <div className="text-[11px] font-bold uppercase text-[#D97706] dark:text-amber-400">
              Indikasi Stunting (TB/U)
            </div>
            <div className="text-2xl font-bold tracking-tight text-[#D97706] dark:text-amber-400 mt-1">
              {nutritionStats.stunting} Kasus
            </div>
            <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
              Skor TB/U (HAZ) &lt; -2 SD
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 ease-out flex flex-col justify-between h-full">
            <div className="text-[11px] font-bold uppercase text-[#E11D48] dark:text-rose-400">
              Underweight &amp; Wasting
            </div>
            <div className="text-2xl font-bold tracking-tight text-[#E11D48] dark:text-rose-400 mt-1">
              {nutritionStats.underweight} / {nutritionStats.wasting}
            </div>
            <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
              Underweight (BB/U) • Wasting ({nutritionStats.wasting})
            </div>
          </div>
        </div>

        {/* Two-Column Breakdown Chart & Priority Table */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Chart Panel: Distribusi Status Gizi per Sekolah */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 ease-out flex flex-col justify-between h-full space-y-4">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200/80 dark:border-slate-800">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Sebaran Status Gizi per Sekolah / Lembaga
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Proporsi anak Normal vs indikasi Stunting / Underweight / Wasting
                </p>
              </div>
              <span className="text-[11px] font-mono font-bold text-[#0D9488] dark:text-teal-400">
                WHO 2006/2007
              </span>
            </div>

            <div className="space-y-3 flex-1">
              {nutritionStats.byInstitution.map(row => {
                const normalPct = row.total > 0 ? (row.normal / row.total) * 100 : 0;
                const issueCount = Math.max(0, row.total - row.normal);
                const issuePct = row.total > 0 ? (issueCount / row.total) * 100 : 0;
                return (
                  <div key={row.institutionName} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs gap-2">
                      <span className="font-bold text-slate-800 dark:text-slate-100 truncate">
                        {row.institutionName}
                      </span>
                      <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300 shrink-0 tabular-nums">
                        Normal: <strong>{row.normal}</strong>/{row.total} • Perlu Pantau: <strong>{issueCount}</strong>
                      </span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                      <div
                        className="bg-[#0D9488] h-full transition-all duration-300"
                        style={{ width: `${normalPct}%` }}
                        title={`Normal: ${row.normal}`}
                      />
                      <div
                        className="bg-[#D97706] h-full transition-all duration-300"
                        style={{ width: `${issuePct}%` }}
                        title={`Perlu Intervensi: ${issueCount}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Priority Follow-Up Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 ease-out flex flex-col justify-between h-full gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200/80 dark:border-slate-800">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Daftar Prioritas Intervensi Gizi (Z-Score &lt; -2 SD)
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Pemantauan real-time anak dengan Stunting, Underweight, atau Wasting
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-[#E11D48] dark:text-rose-400">
                  {nutritionStats.priorityCases.length} Prioritas
                </span>
              </div>

              {nutritionStats.priorityCases.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#0D9488] dark:text-teal-400 font-semibold">
                  Seluruh anak terpantau berada dalam status gizi Normal.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200/80 dark:border-slate-800 rounded-lg">
                  <table className="w-full text-[11px] text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 font-bold">
                      <tr>
                        <th className="py-2 px-2.5 sticky left-0 z-10 bg-slate-50 dark:bg-slate-800">Nama Anak</th>
                        <th className="py-2 px-2.5">Lembaga</th>
                        <th className="py-2 px-2.5 text-right">TB/U</th>
                        <th className="py-2 px-2.5 text-right">WHZ/IMT</th>
                        <th className="py-2 px-2.5 text-right">Status WHO</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 tabular-nums">
                      {nutritionStats.priorityCases.map(child => (
                        <tr key={child.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-2 px-2.5 sticky left-0 z-10 bg-white group-hover:bg-slate-50 dark:bg-slate-900 dark:group-hover:bg-slate-800">
                            <div className="font-bold text-slate-900 dark:text-white">{child.fullName}</div>
                            <div className="text-[10px] font-mono text-slate-600 dark:text-slate-400">
                              {child.ageMonths} bln • {child.weightKg}kg/{child.heightCm}cm
                            </div>
                          </td>
                          <td className="py-2 px-2.5 text-slate-700 dark:text-slate-300">
                            {child.institutionName}
                          </td>
                          <td className="py-2 px-2.5 text-right font-mono font-bold text-[#D97706] dark:text-amber-300">
                            {child.haz.toFixed(2)}
                          </td>
                          <td className="py-2 px-2.5 text-right font-mono font-bold text-[#E11D48] dark:text-rose-300">
                            {child.whz.toFixed(2)}
                          </td>
                          <td className="py-2 px-2.5 text-right font-bold">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-md text-[10px] ${
                                child.primaryStatus === 'Wasting'
                                  ? 'bg-rose-50 text-[#E11D48] dark:bg-rose-950/70 dark:text-rose-300'
                                  : child.primaryStatus === 'Stunting'
                                  ? 'bg-amber-50 text-[#D97706] dark:bg-amber-950/70 dark:text-amber-300'
                                  : 'bg-orange-50 text-[#D97706] dark:bg-orange-950/70 dark:text-orange-300'
                              }`}
                            >
                              {child.primaryStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                try {
                  sessionStorage.setItem('sppg_reports_target_key', 'status_gizi_who');
                } catch {
                  // ignore
                }
                onNavigate('reports');
              }}
              className="w-full min-h-[42px] py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#1E3A8A] dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 text-xs font-bold rounded-lg transition-all duration-200 ease-out active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Ekspor Laporan Dinamis Status Gizi (PDF/Excel)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
          </div>
        );

      case 'plog_daily_sop':
        return (
          <div className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-[#1E3A8A] dark:text-sky-400 shrink-0" />
              <span>5. Standar Operasional Prosedur (SOP) &amp; Jobdesk Divisi Dapur MBG (Harian — PLOG)</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Ditampilkan otomatis secara harian dari input PLOG pada submodul Jobdesk Divisi &amp; SOP · Tersinkron langsung untuk seluruh 5 divisi dapur.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Pemilih Tanggal Harian */}
            <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200 shadow-xs">
              <CalendarDays className="w-3.5 h-3.5 text-[#1E3A8A] dark:text-sky-400 shrink-0" />
              <select
                value={sopDailyState.activeDate}
                onChange={e => setSelectedSopDate(e.target.value)}
                aria-label="Pilih tanggal SOP harian PLOG"
                className="bg-transparent font-bold text-xs text-slate-900 dark:text-white focus:outline-none cursor-pointer"
              >
                {sopDailyState.availableDates.map(d => (
                  <option key={d} value={d} className="bg-white dark:bg-slate-900">
                    {formatIndonesianDate(d)}{d === realTodayIso ? ' (Hari Ini)' : ''}
                  </option>
                ))}
              </select>
            </label>

            {/* Filter Divisi */}
            <select
              value={selectedSopDivisionFilter}
              onChange={e => setSelectedSopDivisionFilter(e.target.value)}
              aria-label="Filter divisi dapur SOP"
              className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Semua Divisi ({sopDailyState.resolvedList.length})</option>
              {sopDailyState.resolvedList.map(j => (
                <option key={j.id} value={j.divisionName}>
                  {j.divisionName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Daily Menu Context & Summary Strip */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <span className="font-mono font-bold text-[#1E3A8A] dark:text-sky-400">
                {formatIndonesianDate(sopDailyState.activeDate)}
              </span>
              {sopDailyState.activeMenu && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono font-bold text-[#0D9488] dark:text-teal-400">
                    {sopDailyState.activeMenu.menuCode}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-semibold text-slate-900 dark:text-white truncate">
                    {sopDailyState.activeMenu.stapleFood} · {sopDailyState.activeMenu.animalProtein} · {sopDailyState.activeMenu.vegetable}
                  </span>
                </>
              )}
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              {sopDailyState.isUsingMenuSpecific
                ? 'Menampilkan SOP & Jobdesk Divisi yang diinput PLOG untuk tanggal/menu terpilih.'
                : 'Belum ada penyesuaian SOP khusus untuk tanggal ini; menampilkan standar harian aktif terbaru dari PLOG.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs tabular-nums shrink-0">
            <div>
              <span className="text-slate-600 dark:text-slate-400">Selesai: </span>
              <strong className="text-[#0D9488] dark:text-teal-400 font-mono">
                {sopDailyState.doneCount}/{sopDailyState.resolvedList.length}
              </strong>
            </div>
            <div>
              <span className="text-slate-600 dark:text-slate-400">Berjalan: </span>
              <strong className="text-[#D97706] dark:text-amber-400 font-mono">
                {sopDailyState.inProgressCount}
              </strong>
            </div>
            <div>
              <span className="text-slate-600 dark:text-slate-400">Belum Mulai: </span>
              <strong className="text-slate-700 dark:text-slate-300 font-mono">
                {sopDailyState.pendingCount}
              </strong>
            </div>
            <div>
              <span className="text-slate-600 dark:text-slate-400">Dokumentasi: </span>
              <strong className="text-[#1E3A8A] dark:text-sky-400 font-mono">
                {sopDailyState.totalPhotos} Foto
              </strong>
            </div>
          </div>
        </div>

        {/* Daily Division SOP Cards Grid */}
        {sopDailyState.filteredList.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-xl p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm text-center text-xs text-slate-600 dark:text-slate-400">
            Belum ada data SOP &amp; Jobdesk Divisi Dapur MBG dari PLOG. Silakan tambahkan pada modul Perencanaan Menu &amp; Gizi (PLOG).
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-stretch">
            {sopDailyState.filteredList.map(job => {
              const photos =
                Array.isArray(job.photoUrls) && job.photoUrls.length > 0
                  ? job.photoUrls.filter(Boolean)
                  : job.photoUrl
                  ? [job.photoUrl]
                  : [];
              const coverPhoto = photos[0] || '';
              const statusTone =
                job.status === 'Selesai Sesuai Standar'
                  ? 'text-[#0D9488] dark:text-teal-400'
                  : job.status === 'Sedang Berjalan'
                  ? 'text-[#D97706] dark:text-amber-400'
                  : 'text-slate-600 dark:text-slate-400';

              return (
                <div
                  key={job.id}
                  className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 ease-out overflow-hidden flex flex-col justify-between h-full"
                >
                  <div>
                    {/* Card Header */}
                    <div className="px-4 py-3 bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {job.divisionName}
                        </h4>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate mt-0.5">
                          PIC: <strong className="text-slate-800 dark:text-slate-200">{job.picName || '-'}</strong>
                        </p>
                      </div>
                      <span className={`text-[11px] font-bold shrink-0 ${statusTone}`}>
                        {job.status}
                      </span>
                    </div>

                    {/* Cover Photo (Aspect 4:3 Seragam) */}
                    <div
                      onClick={() => {
                        setActiveSopModalJob(job);
                        setActiveSopModalPhotoIdx(0);
                      }}
                      className="p-3 pb-0 cursor-pointer group"
                    >
                      <div className="relative aspect-[4/3] w-full rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200/80 dark:border-slate-700">
                        {coverPhoto ? (
                          <img
                            src={coverPhoto}
                            alt={job.divisionName}
                            className="w-full h-full object-cover rounded-lg group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-xs gap-1">
                            <ImageIcon className="w-6 h-6 opacity-50" />
                            <span>Belum ada foto SOP</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent flex items-end justify-between gap-2 p-2.5">
                          <span className="text-[11px] text-white/95 line-clamp-1">
                            {job.photoCaption || 'Dokumentasi standar kerja divisi'}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-white bg-black/60 px-2 py-0.5 rounded shrink-0">
                            {photos.length} Foto
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* SOP Body */}
                    <div className="p-4 space-y-2.5 text-xs">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                          Bahan &amp; Objek Ditangani
                        </div>
                        <p className="text-slate-800 dark:text-slate-200 font-medium mt-0.5 line-clamp-2">
                          {job.ingredientsHandled}
                        </p>
                      </div>

                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                          Standar Operasional Prosedur (SOP) &amp; Tugas
                        </div>
                        <div className="mt-1 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed max-h-36 overflow-y-auto scrollbar-thin">
                          {job.tasks}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-[11px]">
                    <span className="text-slate-600 dark:text-slate-400 truncate">
                      {job.updatedAt ? `Diperbarui ${job.updatedAt}` : `Menu: ${sopDailyState.activeMenu?.menuCode || job.menuId}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSopModalJob(job);
                        setActiveSopModalPhotoIdx(0);
                      }}
                      className="inline-flex items-center gap-1 font-bold text-[#1E3A8A] dark:text-sky-400 hover:underline shrink-0 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Detail &amp; Galeri</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Dynamic Configurable Dashboard Grid */}
      {visibleOrderedSectionIds.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl p-10 border border-slate-200/80 dark:border-slate-800 shadow-sm text-center space-y-2">
          <Lock className="w-8 h-8 mx-auto text-slate-400" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Tidak Ada Blok Data yang Ditampilkan
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            Saat ini seluruh blok informasi pada Dashboard Terpadu dibatasi atau disembunyikan untuk akun/peran ini oleh Admin Utama.
          </p>
        </div>
      ) : (
        <div className={`grid grid-cols-12 ${gridGapClass} items-stretch`}>
          {visibleOrderedSectionIds.map(sectionId => {
            const cfg = dashboardLayoutConfig.sections[sectionId];
            if (!cfg) return null;
            const node = renderDashboardSection(sectionId);
            if (!node) return null;
            return (
              <div key={sectionId} className={getSectionSpanClass(cfg.width)}>
                {node}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Detail SOP & Galeri Foto Divisi Dapur */}
      <Modal
        isOpen={Boolean(activeSopModalJob)}
        onClose={() => setActiveSopModalJob(null)}
        title={activeSopModalJob ? `SOP & Jobdesk — ${activeSopModalJob.divisionName}` : 'Detail SOP Divisi'}
        subtitle={
          activeSopModalJob
            ? `${formatIndonesianDate(sopDailyState.activeDate)} · Koordinator: ${activeSopModalJob.picName || '-'}`
            : undefined
        }
        maxWidth="3xl"
      >
        {activeSopModalJob && (() => {
          const modalPhotos =
            Array.isArray(activeSopModalJob.photoUrls) && activeSopModalJob.photoUrls.length > 0
              ? activeSopModalJob.photoUrls.filter(Boolean)
              : activeSopModalJob.photoUrl
              ? [activeSopModalJob.photoUrl]
              : [];
          const currentPhoto = modalPhotos[activeSopModalPhotoIdx] || modalPhotos[0] || '';

          return (
            <div className="space-y-4 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="text-slate-600 dark:text-slate-300">
                  <span>Menu Harian: </span>
                  <strong className="text-slate-900 dark:text-white">
                    {sopDailyState.activeMenu?.menuCode || activeSopModalJob.menuId} — {activeSopModalJob.menuName}
                  </strong>
                </div>
                <span
                  className={`font-bold ${
                    activeSopModalJob.status === 'Selesai Sesuai Standar'
                      ? 'text-[#16A34A] dark:text-emerald-400'
                      : activeSopModalJob.status === 'Sedang Berjalan'
                      ? 'text-[#D97706] dark:text-amber-400'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Status: {activeSopModalJob.status}
                </span>
              </div>

              {currentPhoto && (
                <div className="space-y-2">
                  <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-950 flex items-center justify-center max-h-72">
                    <img
                      src={currentPhoto}
                      alt={activeSopModalJob.divisionName}
                      className="w-full max-h-72 object-contain"
                    />
                  </div>
                  {activeSopModalJob.photoCaption && (
                    <p className="text-[11px] italic text-slate-600 dark:text-slate-400">
                      {activeSopModalJob.photoCaption}
                    </p>
                  )}
                  {modalPhotos.length > 1 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      {modalPhotos.map((src, idx) => (
                        <button
                          key={`modal-sop-photo-${idx}`}
                          type="button"
                          onClick={() => setActiveSopModalPhotoIdx(idx)}
                          className={`w-14 h-14 rounded-lg overflow-hidden border-2 shrink-0 cursor-pointer transition ${
                            idx === activeSopModalPhotoIdx
                              ? 'border-[#1E3A8A] dark:border-sky-400'
                              : 'border-slate-200 dark:border-slate-700 opacity-75 hover:opacity-100'
                          }`}
                        >
                          <img src={src} alt={`SOP ${idx + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div>
                <div className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">
                  Bahan / Objek Kerja yang Ditangani
                </div>
                <p className="mt-1 font-semibold text-slate-900 dark:text-white">
                  {activeSopModalJob.ingredientsHandled}
                </p>
              </div>

              <div>
                <div className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">
                  Langkah Standar Operasional Prosedur (SOP)
                </div>
                <div className="mt-1 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                  {activeSopModalJob.tasks}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {activeSopModalJob.updatedBy
                    ? `Terakhir diperbarui oleh ${activeSopModalJob.updatedBy} (${activeSopModalJob.updatedAt || '-'})`
                    : 'Sumber: Perencanaan Menu & Gizi (PLOG)'}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveSopModalJob(null);
                    try {
                      sessionStorage.setItem('sppg_menu_target_tab', 'jobdesk_divisi');
                    } catch {
                      // ignore
                    }
                    onNavigate('menu');
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1E3A8A] hover:bg-[#162C6B] text-white text-xs font-bold transition cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit SOP ini di Modul PLOG</span>
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
};
