import React from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BGNLogo } from './OfficialLogos';
import { parseLocalDate } from '../../lib/exportUtils';
import { resolveMenuGrammages } from '../../lib/plogData';
import {
  BeneficiaryAttendanceLog,
  DistributionDeliveryRecord,
  DistributionLog,
  Institution,
  MenuItem,
  RecipeIngredient,
  SPPGConfig,
  WashingWasteRecord,
} from '../../types';

export interface FoodWasteMenuItemRow {
  id: string;
  categoryKey: 'stapleFood' | 'animalProtein' | 'plantProtein' | 'vegetable' | 'fruit';
  categoryLabel: string;
  menuName: string;
  wasteKg: number;
  unit: string;
  beneficiaryCount: number;
  standardPortionGrams: number;
  totalServedKg: number;
  wastePercentage: number;
  conclusion: 'Perlu Evaluasi' | 'Baik';
  photoUrl?: string;
}

export interface FoodWasteDateGroup {
  id: string;
  isoDate: string;
  bannerDateLabel: string; // e.g., "SABTU 07 NOVEMBER 2026"
  officerName: string;
  menuCode: string;
  rows: FoodWasteMenuItemRow[];
  totalWasteKg: number;
  totalServedKg: number;
  overallWastePercentage: number;
  beneficiaryCount: number;
}

export interface FoodWasteReportData {
  sppgTitleLine: string;
  sppgFooterName: string;
  sppgId: string;
  addressLine: string;
  nutritionOfficerName: string;
  headOfSppgName: string;
  headOfSppgNip: string;
  groups: FoodWasteDateGroup[];
}

export interface ResolveFoodWasteReportParams {
  washingWasteRecords: WashingWasteRecord[];
  menuItems: MenuItem[];
  menuIngredientsMap: Record<string, RecipeIngredient[]>;
  institutions: Institution[];
  beneficiaryAttendance: BeneficiaryAttendanceLog[];
  distributionDeliveries: DistributionDeliveryRecord[];
  distributionLogs: DistributionLog[];
  sppgConfig: SPPGConfig;
  periodType: 'harian' | 'mingguan' | 'bulanan' | 'periode';
  selectedDate: string;
  selectedMonth: string;
  startDate: string;
  endDate: string;
  selectedInstitutionId?: string;
  selectedPortionCategory?: 'ALL' | 'kecil' | 'besar';
  searchKeyword?: string;
  overrides?: {
    nutritionOfficerName?: string;
    headOfSppgName?: string;
    headOfSppgNip?: string;
  };
}

function toNonNeg(val: unknown, fallback = 0): number {
  const num = typeof val === 'number' ? val : Number(val);
  return Number.isFinite(num) && num >= 0 ? num : fallback;
}

function isSameInst(
  a: { id?: string; name?: string },
  bId?: string,
  bName?: string
): boolean {
  if (a.id && bId && a.id === bId) return true;
  if (a.name && bName) {
    return a.name.trim().toLowerCase() === bName.trim().toLowerCase();
  }
  return false;
}

function matchesPeriod(
  isoDate: string,
  periodType: 'harian' | 'mingguan' | 'bulanan' | 'periode',
  selectedDate: string,
  selectedMonth: string,
  startDate: string,
  endDate: string
): boolean {
  if (!isoDate) return false;
  if (periodType === 'harian') {
    return isoDate === selectedDate;
  }
  if (periodType === 'mingguan' || periodType === 'bulanan') {
    return selectedMonth ? isoDate.startsWith(selectedMonth) : true;
  }
  if (periodType === 'periode') {
    if (startDate && isoDate < startDate) return false;
    if (endDate && isoDate > endDate) return false;
    return true;
  }
  return true;
}

function formatBannerDateUppercase(isoDate: string): string {
  const d = parseLocalDate(isoDate);
  if (!d) return (isoDate || '-').toUpperCase();
  const weekday = new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(d);
  const dayNum = String(d.getDate()).padStart(2, '0');
  const monthName = new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(d);
  const year = d.getFullYear();
  return `${weekday} ${dayNum} ${monthName} ${year}`.toUpperCase();
}

export function formatWasteKgCell(wasteKg: number): string {
  if (!Number.isFinite(wasteKg) || wasteKg <= 0) return '';
  return wasteKg.toFixed(2);
}

export function formatServedKgCell(servedKg: number): string {
  if (!Number.isFinite(servedKg) || servedKg <= 0) return '0';
  return String(Number(servedKg.toFixed(3)));
}

export function formatStandardGramsCell(grams: number): string {
  if (!Number.isFinite(grams) || grams <= 0) return '0';
  if (Math.abs(grams - Math.round(grams)) < 0.05) {
    return String(Math.round(grams));
  }
  return String(Number(grams.toFixed(1)));
}

export function resolveFoodWasteReportData(
  params: ResolveFoodWasteReportParams
): FoodWasteReportData {
  const {
    washingWasteRecords,
    menuItems,
    menuIngredientsMap,
    institutions,
    beneficiaryAttendance,
    distributionDeliveries,
    distributionLogs,
    sppgConfig,
    periodType,
    selectedDate,
    selectedMonth,
    startDate,
    endDate,
    selectedInstitutionId = 'ALL',
    selectedPortionCategory = 'ALL',
    searchKeyword = '',
    overrides,
  } = params;

  const targetInsts =
    selectedInstitutionId !== 'ALL'
      ? institutions.filter(i => i.id === selectedInstitutionId)
      : institutions.filter(i => i.isActive);
  const instPool = targetInsts.length > 0 ? targetInsts : institutions;

  const resolveMenuForDate = (targetDate: string): MenuItem | undefined => {
    const exact = menuItems.find(m => m.date === targetDate);
    if (exact) return exact;
    const parsed = parseLocalDate(targetDate);
    if (parsed) {
      const dayName = new Intl.DateTimeFormat('id-ID', { weekday: 'long' })
        .format(parsed)
        .toLowerCase();
      const byDay = menuItems.find(
        m => (m.dayName || '').trim().toLowerCase() === dayName
      );
      if (byDay) return byDay;
    }
    return menuItems[0];
  };

  const resolvePortionsForDate = (targetDate: string) => {
    const sum = instPool.reduce(
      (acc, inst) => {
        const att = beneficiaryAttendance.find(
          a => a.date === targetDate && isSameInst(inst, a.institutionId, a.institutionName)
        );
        if (att) {
          return {
            small: acc.small + toNonNeg(att.presentSmall, 0),
            large: acc.large + toNonNeg(att.presentLarge, 0),
          };
        }
        const del = distributionDeliveries.find(
          d => d.date === targetDate && isSameInst(inst, d.institutionId, d.institutionName)
        );
        if (del) {
          return {
            small: acc.small + toNonNeg(del.smallPortions, 0),
            large: acc.large + toNonNeg(del.largePortions, 0),
          };
        }
        const log = distributionLogs.find(
          l => l.date === targetDate && isSameInst(inst, l.institutionId, l.institutionName)
        );
        if (log) {
          return {
            small: acc.small + toNonNeg(log.smallPortions, 0),
            large: acc.large + toNonNeg(log.largePortions, 0),
          };
        }
        return {
          small: acc.small + toNonNeg(inst.smallPortions, 0),
          large: acc.large + toNonNeg(inst.largePortions, 0),
        };
      },
      { small: 0, large: 0 }
    );

    const small = selectedPortionCategory === 'besar' ? 0 : sum.small;
    const large = selectedPortionCategory === 'kecil' ? 0 : sum.large;
    const total = small + large;
    const fallbackTotal =
      total > 0 ? total : Math.max(1, toNonNeg(sppgConfig.dailyPortionTarget, 2643));

    return {
      small,
      large,
      total: fallbackTotal,
    };
  };

  const sortedWashings = [...washingWasteRecords].sort((a, b) =>
    (b.date || '').localeCompare(a.date || '')
  );

  // Deduplikasi per tanggal dengan mempertahankan entri terbaru/paling atas dari Divisi Cuci Ompreng
  const dedupedByDate: WashingWasteRecord[] = [];
  const seenDates = new Set<string>();
  sortedWashings.forEach(w => {
    const dateKey = (w.date || '').trim();
    if (!dateKey || !seenDates.has(dateKey)) {
      if (dateKey) seenDates.add(dateKey);
      dedupedByDate.push(w);
    }
  });

  const periodWashings = dedupedByDate.filter(w =>
    matchesPeriod(w.date, periodType, selectedDate, selectedMonth, startDate, endDate)
  );

  const activeWashings =
    periodType === 'harian' && periodWashings.length === 0
      ? dedupedByDate.slice(0, 1)
      : periodWashings;

  const kw = searchKeyword.trim().toLowerCase();

  const groups: FoodWasteDateGroup[] = [];

  activeWashings.forEach(w => {
    const matchedMenu = resolveMenuForDate(w.date);
    const portions = resolvePortionsForDate(w.date);
    const grammages = matchedMenu
      ? resolveMenuGrammages(matchedMenu, menuIngredientsMap[matchedMenu.id] || [])
      : [];

    const pickStandardGrams = (
      categoryKey: FoodWasteMenuItemRow['categoryKey'],
      defaultSmall: number,
      defaultLarge: number
    ): number => {
      const entry = grammages.find(g => g.categoryKey === categoryKey);
      const sGrams = entry && entry.smallGrams > 0 ? entry.smallGrams : defaultSmall;
      const lGrams = entry && entry.largeGrams > 0 ? entry.largeGrams : defaultLarge;

      if (selectedPortionCategory === 'kecil') return sGrams;
      if (selectedPortionCategory === 'besar') return lGrams;
      if (portions.small + portions.large > 0) {
        return Math.round(
          (portions.small * sGrams + portions.large * lGrams) /
            (portions.small + portions.large)
        );
      }
      return Math.round((sGrams + lGrams) / 2);
    };

    const categories: Array<{
      categoryKey: FoodWasteMenuItemRow['categoryKey'];
      categoryLabel: string;
      menuName: string;
      wasteItem: WashingWasteRecord['wasteRice'];
      defaultSmallGrams: number;
      defaultLargeGrams: number;
    }> = [
      {
        categoryKey: 'stapleFood',
        categoryLabel: 'Makanan Pokok',
        menuName: matchedMenu?.stapleFood || 'Nasi Putih Organik',
        wasteItem: w.wasteRice,
        defaultSmallGrams: 100,
        defaultLargeGrams: 150,
      },
      {
        categoryKey: 'animalProtein',
        categoryLabel: 'Lauk Hewani',
        menuName: matchedMenu?.animalProtein || 'Lauk Hewani',
        wasteItem: w.wasteAnimalProtein,
        defaultSmallGrams: 40,
        defaultLargeGrams: 60,
      },
      {
        categoryKey: 'plantProtein',
        categoryLabel: 'Lauk Nabati',
        menuName: matchedMenu?.plantProtein || 'Lauk Nabati',
        wasteItem: w.wastePlantProtein,
        defaultSmallGrams: 25,
        defaultLargeGrams: 50,
      },
      {
        categoryKey: 'vegetable',
        categoryLabel: 'Sayuran',
        menuName: matchedMenu?.vegetable || 'Sayuran',
        wasteItem: w.wasteVegetable,
        defaultSmallGrams: 50,
        defaultLargeGrams: 75,
      },
      {
        categoryKey: 'fruit',
        categoryLabel: 'Buah Segar',
        menuName: matchedMenu?.fruit || 'Buah Segar',
        wasteItem: w.wasteFruit,
        defaultSmallGrams: 80,
        defaultLargeGrams: 100,
      },
    ];

    let rows: FoodWasteMenuItemRow[] = categories.map((cat, idx) => {
      const wasteKg = toNonNeg(cat.wasteItem?.weight, 0);
      const unit = cat.wasteItem?.unit?.trim() || w.unit || 'kg';
      const standardPortionGrams = pickStandardGrams(
        cat.categoryKey,
        cat.defaultSmallGrams,
        cat.defaultLargeGrams
      );
      const totalServedKg = (portions.total * standardPortionGrams) / 1000;
      const wastePercentage = totalServedKg > 0 ? (wasteKg / totalServedKg) * 100 : 0;
      const conclusion: 'Perlu Evaluasi' | 'Baik' =
        wastePercentage > 20 ? 'Perlu Evaluasi' : 'Baik';

      const rawPhotoUrl =
        typeof cat.wasteItem?.photoUrl === 'string' && cat.wasteItem.photoUrl.trim() !== ''
          ? cat.wasteItem.photoUrl.trim()
          : undefined;

      return {
        id: `${w.id}-${cat.categoryKey}-${idx}`,
        categoryKey: cat.categoryKey,
        categoryLabel: cat.categoryLabel,
        menuName: cat.menuName,
        wasteKg,
        unit,
        beneficiaryCount: portions.total,
        standardPortionGrams,
        totalServedKg,
        wastePercentage,
        conclusion,
        photoUrl: rawPhotoUrl,
      };
    });

    if (kw) {
      const dateHits =
        w.date.toLowerCase().includes(kw) ||
        formatBannerDateUppercase(w.date).toLowerCase().includes(kw) ||
        (w.officerName || '').toLowerCase().includes(kw);
      if (!dateHits) {
        rows = rows.filter(
          r =>
            r.menuName.toLowerCase().includes(kw) ||
            r.categoryLabel.toLowerCase().includes(kw) ||
            r.conclusion.toLowerCase().includes(kw)
        );
      }
    }

    if (rows.length > 0) {
      const totalWasteKg = rows.reduce((s, r) => s + r.wasteKg, 0);
      const totalServedKg = rows.reduce((s, r) => s + r.totalServedKg, 0);
      const overallWastePercentage =
        totalServedKg > 0 ? (totalWasteKg / totalServedKg) * 100 : 0;

      groups.push({
        id: w.id,
        isoDate: w.date,
        bannerDateLabel: formatBannerDateUppercase(w.date),
        officerName: w.officerName || 'Tim Sanitasi & Cuci Ompreng',
        menuCode: matchedMenu?.menuCode || 'MN-01',
        rows,
        totalWasteKg,
        totalServedKg,
        overallWastePercentage,
        beneficiaryCount: portions.total,
      });
    }
  });

  const cleanSppgTitle = (sppgConfig.sppgName || 'PROBOLINGGO KREJENGAN TEMENGGUNGAN 002')
    .replace(/^SPPG\s+/i, '')
    .toUpperCase();

  const rawFooterName = (sppgConfig.sppgName || 'SPPG Krejengan Temenggungan 2').trim();
  const sppgFooterName = /^SPPG\s+/i.test(rawFooterName)
    ? rawFooterName
    : `SPPG ${rawFooterName}`;

  const addressLine = `${sppgConfig.address || 'Dusun Krajan RT/RW 003/004 Desa Temenggungan'}, Kecamatan ${
    sppgConfig.district || 'Krejengan'
  }, ${sppgConfig.regency || 'Kabupaten Probolinggo'}, ${
    sppgConfig.province || 'Jawa Timur'
  }, ID 67284. Email : ${sppgConfig.email}`;

  return {
    sppgTitleLine: cleanSppgTitle,
    sppgFooterName,
    sppgId: sppgConfig.sppgId || 'GFBQSYXD',
    addressLine,
    nutritionOfficerName:
      overrides?.nutritionOfficerName?.trim() ||
      sppgConfig.nutritionOfficer?.trim() ||
      'Sufy Kaneisyah A, S.Tr. Gz.',
    headOfSppgName:
      overrides?.headOfSppgName?.trim() ||
      sppgConfig.headOfSppg?.trim() ||
      'Rahtri Sephia Jayanti, S.Tr. Gz.',
    headOfSppgNip: overrides?.headOfSppgNip?.trim() || '',
    groups,
  };
}

interface FoodWasteReportSheetProps {
  data: FoodWasteReportData;
  onPreviewPhoto?: (info: { label: string; url: string; caption?: string }) => void;
  className?: string;
}

export const FoodWasteReportSheet: React.FC<FoodWasteReportSheetProps> = ({
  data,
  onPreviewPhoto,
  className = '',
}) => {
  return (
    <div
      className={`bg-white text-black p-5 sm:p-7 rounded-xl border border-slate-200 shadow-sm print:shadow-none print:border-none print:p-2 print:rounded-none font-sans leading-tight ${className}`}
    >
      {/* KOP SURAT BGN + IDENTITAS SPPG (PERSIS GAMBAR REFERENSI) */}
      <div className="flex items-start gap-4 pb-3">
        <div className="shrink-0">
          <BGNLogo size="lg" />
        </div>
        <div className="flex-1 text-left">
          <h3 className="text-[12px] sm:text-[13px] font-bold uppercase tracking-wide text-[#1e3a8a]">
            BADAN GIZI NASIONAL (NATIONAL NUTRITION AGENCY)
          </h3>
          <h2 className="text-[11.5px] sm:text-[12.5px] font-bold uppercase tracking-wide text-black leading-tight">
            SATUAN PELAYANAN PEMENUHAN GIZI (SPPG)
          </h2>
          <h2 className="text-[11.5px] sm:text-[12.5px] font-bold uppercase tracking-wide text-black leading-tight">
            {data.sppgTitleLine}
          </h2>
          <p className="text-[9.5px] sm:text-[10.5px] text-black mt-0.5">
            {data.addressLine}
          </p>
        </div>
      </div>

      {/* JUDUL TENGAH TANPA BARIS PELAKSANAAN */}
      <div className="text-center pb-2.5">
        <h1 className="text-[12.5px] sm:text-[13.5px] font-bold uppercase tracking-wide text-black">
          ANALISIS SISA MAKANAN (FOOD WASTE)
        </h1>
      </div>

      {/* TABEL ITEM MENU */}
      {data.groups.length === 0 ? (
        <div className="border border-black px-4 py-8 text-center text-xs italic text-slate-500">
          Belum ada data penimbangan Food Waste Divisi Cuci Ompreng pada filter periode ini.
        </div>
      ) : (
        <div className="space-y-4">
          {data.groups.map(group => (
            <div key={group.id} className="overflow-x-auto">
              <table className="w-full border-collapse border border-black text-[10px] sm:text-[11px] text-black">
                <thead>
                  <tr>
                    <th
                      colSpan={9}
                      className="border border-black bg-[#1e3a5f] print:bg-[#1e3a5f] text-white font-bold uppercase text-center py-1.5 px-2 tracking-wide text-[10.5px] sm:text-[11.5px]"
                    >
                      {group.bannerDateLabel}
                    </th>
                  </tr>
                  <tr className="bg-[#dce4df] print:bg-[#dce4df] font-bold text-center text-black">
                    <th className="border border-black px-2 py-2 align-middle min-w-[140px]">
                      Menu
                    </th>
                    <th className="border border-black px-2 py-2 align-middle w-20 leading-tight">
                      Jumlah<br />Sisa
                    </th>
                    <th className="border border-black px-2 py-2 align-middle w-16">
                      Satuan
                    </th>
                    <th className="border border-black px-2 py-2 align-middle w-24 leading-tight">
                      Penerima<br />Manfaat
                    </th>
                    <th className="border border-black px-2 py-2 align-middle w-20 leading-tight">
                      Standar<br />Porsi
                    </th>
                    <th className="border border-black px-2 py-2 align-middle w-28 leading-tight">
                      Total yang<br />disajikan (kg)
                    </th>
                    <th className="border border-black px-2 py-2 align-middle w-24 leading-tight">
                      Persentase<br />(%)
                    </th>
                    <th className="border border-black px-2 py-2 align-middle min-w-[105px]">
                      Kesimpulan
                    </th>
                    <th className="border border-black px-2 py-2 align-middle min-w-[105px]">
                      Dokumentasi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {group.rows.map(row => {
                    const wasteText = formatWasteKgCell(row.wasteKg);
                    return (
                      <tr key={row.id} className="align-middle bg-white">
                        <td className="border border-black px-2.5 py-2 text-left font-normal">
                          {row.menuName}
                        </td>
                        <td className="border border-black px-2 py-2 text-center whitespace-nowrap">
                          {wasteText}
                        </td>
                        <td className="border border-black px-2 py-2 text-center whitespace-nowrap">
                          {row.unit}
                        </td>
                        <td className="border border-black px-2 py-2 text-center whitespace-nowrap">
                          {row.beneficiaryCount}
                        </td>
                        <td className="border border-black px-2 py-2 text-center whitespace-nowrap">
                          {formatStandardGramsCell(row.standardPortionGrams)}
                        </td>
                        <td className="border border-black px-2 py-2 text-center whitespace-nowrap">
                          {formatServedKgCell(row.totalServedKg)}
                        </td>
                        <td className="border border-black px-2 py-2 text-center whitespace-nowrap">
                          {row.wastePercentage.toFixed(1)}
                        </td>
                        <td className="border border-black px-2 py-2 text-center whitespace-nowrap">
                          {row.conclusion}
                        </td>
                        <td className="border border-black p-1 text-center align-middle">
                          {row.photoUrl ? (
                            <button
                              type="button"
                              onClick={() =>
                                onPreviewPhoto?.({
                                  label: `Dokumentasi Food Waste — ${row.menuName}`,
                                  url: row.photoUrl!,
                                  caption: `${group.bannerDateLabel} • Sisa ${
                                    wasteText || '0.00'
                                  } ${row.unit} (${row.wastePercentage.toFixed(1)}%) • ${row.conclusion}`,
                                })
                              }
                              className="inline-block cursor-pointer group align-middle"
                              title={`Klik untuk memperbesar foto sisa ${row.menuName}`}
                            >
                              <img
                                src={row.photoUrl}
                                alt={`Dokumentasi ${row.menuName}`}
                                className="w-16 h-14 object-cover border border-slate-300 group-hover:scale-[1.03] transition"
                              />
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* KETERANGAN KESIMPULAN & REFERENSI (PERSIS GAMBAR REFERENSI) */}
      <div className="mt-3 text-[10.5px] sm:text-[11px] leading-snug text-black space-y-0.5">
        <p className="font-bold">Kesimpulan :</p>
        <p>&gt; 20% perlu perbaikan menu, porsi, atau edukasi</p>
        <p>≤ 20% masih dianggap batas maksimal toleransi</p>
        <p>&lt; 10–15% adalah target efisiensi yang baik</p>
        <p className="font-bold pt-1">Referensi :</p>
        <p>
          <a
            href="https://www.mdpi.com/486934"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-700 underline print:text-black"
          >
            https://www.mdpi.com/486934
          </a>
        </p>
        <p>
          <a
            href="https://www.foodsight.com/blog/food-waste-benchmarks-hospitality?utm_source=chatgpt.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-700 underline print:text-black break-all"
          >
            https://www.foodsight.com/blog/food-waste-benchmarks-hospitality?utm_source=chatgpt.com
          </a>
        </p>
      </div>

      {/* TANDA TANGAN 2 KOLOM (PERSIS GAMBAR REFERENSI) */}
      <div className="mt-6 grid grid-cols-2 gap-8 text-[10.5px] sm:text-[11px] text-black text-center">
        <div className="flex flex-col items-center">
          <p>Membuat,</p>
          <p>Pengawas Gizi</p>
          <div className="h-14 sm:h-16" />
          <p className="font-bold">{data.nutritionOfficerName}</p>
        </div>
        <div className="flex flex-col items-center">
          <p>Diperiksa oleh</p>
          <p>Kepala {data.sppgFooterName}</p>
          <div className="h-14 sm:h-16" />
          <p className="font-bold">{data.headOfSppgName}</p>
          <p className="text-[10px]">
            {data.headOfSppgNip ? `NIP. ${data.headOfSppgNip}` : `ID SPPG: ${data.sppgId}`}
          </p>
        </div>
      </div>
    </div>
  );
};

async function loadImageUrlAsJpegDataUrl(url: string): Promise<string | null> {
  if (!url || typeof url !== 'string') return null;
  return new Promise(resolve => {
    let settled = false;
    const finish = (val: string | null) => {
      if (!settled) {
        settled = true;
        resolve(val);
      }
    };
    const timer = window.setTimeout(() => finish(null), 4000);
    const img = new Image();
    if (!url.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      window.clearTimeout(timer);
      try {
        const canvas = document.createElement('canvas');
        const target = 200;
        const ratio =
          img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 4 / 3;
        canvas.width = ratio >= 1 ? target : Math.max(64, Math.round(target * ratio));
        canvas.height = ratio >= 1 ? Math.max(48, Math.round(target / ratio)) : target;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          finish(canvas.toDataURL('image/jpeg', 0.85));
        } else {
          finish(url.startsWith('data:image/') ? url : null);
        }
      } catch {
        finish(url.startsWith('data:image/') ? url : null);
      }
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      finish(url.startsWith('data:image/') ? url : null);
    };
    img.src = url;
  });
}

async function loadLogoPngDataUrl(url: string): Promise<string | null> {
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 160;
        canvas.height = img.naturalHeight || 160;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } else {
          resolve(null);
        }
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export async function exportFoodWasteReportPDF(data: FoodWasteReportData) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const left = 12;
  const right = 285;
  const centerX = 148.5;

  const logoPromise = loadLogoPngDataUrl(
    '/assets/aistudio/Badan_Gizi_Nasional__BGN__Logo_-_Colored_-_zonalogo.com_5e10d066.png'
  );

  const uniquePhotoUrls = Array.from(
    new Set(
      data.groups
        .flatMap(g => g.rows.map(r => r.photoUrl))
        .filter((u): u is string => Boolean(u && u.trim() !== ''))
    )
  );

  const photoMap = new Map<string, string | null>();
  const [logoDataUrl] = await Promise.all([
    logoPromise,
    ...uniquePhotoUrls.map(async u => {
      photoMap.set(u, await loadImageUrlAsJpegDataUrl(u));
    }),
  ]);

  // KOP SURAT BGN
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', left + 6, 9, 17, 17);
  }
  const textStartX = left + 29;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 58, 138);
  doc.text('BADAN GIZI NASIONAL (NATIONAL NUTRITION AGENCY)', textStartX, 12.5);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.text('SATUAN PELAYANAN PEMENUHAN GIZI (SPPG)', textStartX, 17);
  doc.text(data.sppgTitleLine, textStartX, 21.3);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const addrLines = doc.splitTextToSize(data.addressLine, right - textStartX);
  doc.text(addrLines, textStartX, 25.2);

  // JUDUL
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(0, 0, 0);
  doc.text('ANALISIS SISA MAKANAN (FOOD WASTE)', centerX, 34, { align: 'center' });

  let cursorY = 37;

  if (data.groups.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.text(
      'Belum ada data penimbangan Food Waste Divisi Cuci Ompreng pada filter periode ini.',
      centerX,
      cursorY + 10,
      { align: 'center' }
    );
    cursorY += 20;
  } else {
    for (let gIdx = 0; gIdx < data.groups.length; gIdx++) {
      const group = data.groups[gIdx];
      const rowPhotoList = group.rows.map(r => (r.photoUrl ? photoMap.get(r.photoUrl) || null : null));

      autoTable(doc, {
        startY: cursorY,
        margin: { left, right: 12 },
        theme: 'grid',
        head: [
          [
            {
              content: group.bannerDateLabel,
              colSpan: 9,
              styles: {
                fillColor: [30, 58, 95],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 8.5,
                halign: 'center',
                valign: 'middle',
                cellPadding: 1.8,
              },
            },
          ],
          [
            'Menu',
            'Jumlah\nSisa',
            'Satuan',
            'Penerima\nManfaat',
            'Standar\nPorsi',
            'Total yang\ndisajikan (kg)',
            'Persentase\n(%)',
            'Kesimpulan',
            'Dokumentasi',
          ],
        ],
        body: group.rows.map(r => [
          r.menuName,
          formatWasteKgCell(r.wasteKg),
          r.unit,
          String(r.beneficiaryCount),
          formatStandardGramsCell(r.standardPortionGrams),
          formatServedKgCell(r.totalServedKg),
          r.wastePercentage.toFixed(1),
          r.conclusion,
          '',
        ]),
        styles: {
          font: 'helvetica',
          fontSize: 8.2,
          textColor: [0, 0, 0],
          lineColor: [0, 0, 0],
          lineWidth: 0.25,
          cellPadding: 1.5,
          minCellHeight: 15,
          valign: 'middle',
        },
        headStyles: {
          fillColor: [220, 228, 223],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'center',
          valign: 'middle',
          lineColor: [0, 0, 0],
          lineWidth: 0.25,
          minCellHeight: 7,
        },
        columnStyles: {
          0: { cellWidth: 50, halign: 'left' },
          1: { cellWidth: 23, halign: 'center' },
          2: { cellWidth: 18, halign: 'center' },
          3: { cellWidth: 28, halign: 'center' },
          4: { cellWidth: 23, halign: 'center' },
          5: { cellWidth: 32, halign: 'center' },
          6: { cellWidth: 25, halign: 'center' },
          7: { cellWidth: 37, halign: 'center' },
          8: { cellWidth: 37, halign: 'center' },
        },
        didDrawCell: hookData => {
          if (hookData.section === 'body' && hookData.column.index === 8) {
            const imgData = rowPhotoList[hookData.row.index];
            if (imgData) {
              const pad = 1.3;
              const availW = hookData.cell.width - pad * 2;
              const availH = hookData.cell.height - pad * 2;
              let ratio = 4 / 3;
              try {
                const props = doc.getImageProperties(imgData);
                if (props?.width && props?.height) {
                  ratio = props.width / props.height;
                }
              } catch {
                // fallback 4:3 aspect ratio
              }
              let drawW = Math.min(availW, 20);
              let drawH = drawW / ratio;
              if (drawH > Math.min(availH, 13)) {
                drawH = Math.min(availH, 13);
                drawW = drawH * ratio;
              }
              const x = hookData.cell.x + (hookData.cell.width - drawW) / 2;
              const y = hookData.cell.y + (hookData.cell.height - drawH) / 2;
              doc.addImage(imgData, 'JPEG', x, y, drawW, drawH);
            }
          }
        },
      });

      cursorY = ((doc as any).lastAutoTable?.finalY || cursorY + 80) + 5;
      if (gIdx < data.groups.length - 1 && cursorY > 155) {
        doc.addPage();
        cursorY = 16;
      }
    }
  }

  // KESIMPULAN & REFERENSI (ASCII <= & - untuk kompatibilitas font standar PDF)
  if (cursorY > 145) {
    doc.addPage();
    cursorY = 18;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(0, 0, 0);
  doc.text('Kesimpulan :', left, cursorY);
  cursorY += 3.8;

  doc.setFont('helvetica', 'normal');
  doc.text('> 20% perlu perbaikan menu, porsi, atau edukasi', left, cursorY);
  cursorY += 3.6;
  doc.text('<= 20% masih dianggap batas maksimal toleransi', left, cursorY);
  cursorY += 3.6;
  doc.text('< 10-15% adalah target efisiensi yang baik', left, cursorY);
  cursorY += 4.5;

  doc.setFont('helvetica', 'bold');
  doc.text('Referensi :', left, cursorY);
  cursorY += 3.8;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(29, 78, 216);
  doc.textWithLink('https://www.mdpi.com/486934', left, cursorY, {
    url: 'https://www.mdpi.com/486934',
  });
  cursorY += 3.6;
  doc.textWithLink(
    'https://www.foodsight.com/blog/food-waste-benchmarks-hospitality?utm_source=chatgpt.com',
    left,
    cursorY,
    {
      url: 'https://www.foodsight.com/blog/food-waste-benchmarks-hospitality?utm_source=chatgpt.com',
    }
  );
  doc.setTextColor(0, 0, 0);

  // TANDA TANGAN 2 KOLOM
  let sigY = cursorY + 7;
  if (sigY > 170) {
    doc.addPage();
    sigY = 20;
  }

  const leftColCenter = left + 70;
  const rightColCenter = right - 70;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8);
  doc.text('Membuat,', leftColCenter, sigY, { align: 'center' });
  doc.text('Pengawas Gizi', leftColCenter, sigY + 4.2, { align: 'center' });

  doc.text('Diperiksa oleh', rightColCenter, sigY, { align: 'center' });
  doc.text(`Kepala ${data.sppgFooterName}`, rightColCenter, sigY + 4.2, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.text(data.nutritionOfficerName, leftColCenter, sigY + 21, { align: 'center' });
  doc.text(data.headOfSppgName, rightColCenter, sigY + 21, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(
    data.headOfSppgNip ? `NIP. ${data.headOfSppgNip}` : `ID SPPG: ${data.sppgId}`,
    rightColCenter,
    sigY + 25.2,
    { align: 'center' }
  );

  doc.save('Laporan_Food_Waste_SPPG_TMG2.pdf');
}
