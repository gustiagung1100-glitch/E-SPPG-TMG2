import React from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BGNLogo } from './OfficialLogos';
import { parseLocalDate } from '../../lib/exportUtils';
import {
  CookedFoodItem,
  MenuItem,
  PortioningInspectionRecord,
  SPPGConfig,
} from '../../types';

export type PortioningFoodCategoryKey =
  | 'rice'
  | 'animalProtein'
  | 'plantProtein'
  | 'vegetable'
  | 'fruit';

export interface PortioningSessionReading {
  tempNum?: number;
  tempDisplay: string;
  photoUrl?: string;
}

export interface PortioningSubRow {
  rowId: string;
  categoryKey: PortioningFoodCategoryKey;
  jenisBahan: string;
  namaMenu: string;
  dangerZone: string;
  beratMentahDisplay: string;
  faktorKonversiDisplay: string;
  beratMatangDisplay: string;
  portionVariant: 'besar' | 'kecil' | 'standar';
  sesi1: PortioningSessionReading;
  sesi2: PortioningSessionReading;
  sesi3: PortioningSessionReading;
  isFirstOfCategory: boolean;
  categoryRowSpan: number;
}

export interface PortioningDateGroup {
  isoDate: string;
  dayName: string;
  shortDate: string; // DD/MM/YY
  portioningTime: string;
  officerName: string;
  menuCode?: string;
  smallPortionWeightGrams: number;
  largePortionWeightGrams: number;
  rows: PortioningSubRow[];
}

export interface PortioningFoodTempData {
  sppgTitleLine: string;
  addressLine: string;
  periodeLabel: string;
  groups: PortioningDateGroup[];
}

const DEFAULT_PORTION_SPECS: Record<
  PortioningFoodCategoryKey,
  {
    jenisBahan: string;
    dangerZone: string;
    rawLarge: number;
    factorLarge: number;
    cookedLarge: number;
    rawSmall?: number;
    factorSmall?: number;
    cookedSmall?: number;
  }
> = {
  rice: {
    jenisBahan: 'makanan pokok',
    dangerZone: '60-5°C',
    rawLarge: 85,
    factorLarge: 0.4,
    cookedLarge: 200,
    rawSmall: 50,
    factorSmall: 1,
    cookedSmall: 100,
  },
  animalProtein: {
    jenisBahan: 'lauk hewani',
    dangerZone: '60-5°C',
    rawLarge: 50,
    factorLarge: 1,
    cookedLarge: 50,
  },
  plantProtein: {
    jenisBahan: 'lauk nabati',
    dangerZone: '60-5°C',
    rawLarge: 50,
    factorLarge: 1,
    cookedLarge: 50,
  },
  vegetable: {
    jenisBahan: 'sayur',
    dangerZone: '60-5°C',
    rawLarge: 25,
    factorLarge: 1,
    cookedLarge: 25,
  },
  fruit: {
    jenisBahan: 'buah',
    dangerZone: '60-5°C',
    rawLarge: 100,
    factorLarge: 1,
    cookedLarge: 100,
  },
};

function formatCommaTemp(val?: number): string {
  if (typeof val !== 'number' || Number.isNaN(val)) return '-';
  return val.toFixed(1).replace('.', ',');
}

function formatNumberID(val?: number): string {
  if (typeof val !== 'number' || Number.isNaN(val)) return '-';
  if (Number.isInteger(val)) return String(val);
  return String(val).replace('.', ',');
}

function formatDayAndShortDate(isoDate: string): { dayName: string; shortDate: string } {
  const d = parseLocalDate(isoDate);
  if (!d) return { dayName: '-', shortDate: isoDate };
  const dayName = new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(d);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return {
    dayName: dayName.charAt(0).toUpperCase() + dayName.slice(1),
    shortDate: `${dd}/${mm}/${yy}`,
  };
}

function formatPeriodeRange(dates: string[], fallbackStart?: string, fallbackEnd?: string): string {
  const validDates =
    dates.length > 0 ? [...dates].sort() : [fallbackStart || '', fallbackEnd || ''].filter(Boolean);
  if (validDates.length === 0) return '-';
  const first = parseLocalDate(validDates[0]);
  const last = parseLocalDate(validDates[validDates.length - 1]);
  if (!first || !last) return validDates.join(' - ');

  const monthFmt = new Intl.DateTimeFormat('id-ID', { month: 'long' });
  const d1 = String(first.getDate()).padStart(2, '0');
  const m1 = monthFmt.format(first);
  const y1 = first.getFullYear();
  const d2 = String(last.getDate()).padStart(2, '0');
  const m2 = monthFmt.format(last);
  const y2 = last.getFullYear();

  if (y1 === y2 && m1 === m2) {
    if (d1 === d2) return `${d1} ${m1} ${y1}`;
    return `${d1} - ${d2} ${m1} ${y1}`;
  }
  return `${d1} ${m1} ${y1} - ${d2} ${m2} ${y2}`;
}

function getMenuNameByCategory(menu: MenuItem | undefined, key: PortioningFoodCategoryKey): string {
  if (!menu) return '-';
  switch (key) {
    case 'rice':
      return menu.stapleFood || '-';
    case 'animalProtein':
      return menu.animalProtein || '-';
    case 'plantProtein':
      return menu.plantProtein || '-';
    case 'vegetable':
      return menu.vegetable || '-';
    case 'fruit':
      return menu.fruit || menu.milkOrExtra || '-';
  }
}

export interface ResolvePortioningFoodTempParams {
  portioningRecords: PortioningInspectionRecord[];
  menuItems: MenuItem[];
  sppgConfig: SPPGConfig;
  startDate?: string;
  endDate?: string;
  periodType?: 'harian' | 'mingguan' | 'bulanan' | 'periode';
}

export function resolvePortioningFoodTempData(
  params: ResolvePortioningFoodTempParams
): PortioningFoodTempData {
  const { portioningRecords, menuItems, sppgConfig, startDate, endDate, periodType } = params;

  const recordsByDate = new Map<string, PortioningInspectionRecord[]>();
  portioningRecords.forEach(rec => {
    if (!rec.date) return;
    const list = recordsByDate.get(rec.date) || [];
    list.push(rec);
    recordsByDate.set(rec.date, list);
  });

  let sortedDates = Array.from(recordsByDate.keys()).sort();
  if (periodType === 'periode' && startDate && endDate) {
    const filtered = sortedDates.filter(d => d >= startDate && d <= endDate);
    if (filtered.length > 0) sortedDates = filtered;
  }

  const orderedCategories: PortioningFoodCategoryKey[] = [
    'rice',
    'animalProtein',
    'plantProtein',
    'vegetable',
    'fruit',
  ];

  const groups: PortioningDateGroup[] = sortedDates.map(isoDate => {
    const dayRecords = [...(recordsByDate.get(isoDate) || [])].sort((a, b) =>
      (a.time || '').localeCompare(b.time || '')
    );
    const primaryRec = dayRecords[0];
    const secondRec = dayRecords[1];
    const thirdRec = dayRecords[2];

    const { dayName, shortDate } = formatDayAndShortDate(isoDate);

    const matchedMenu =
      (primaryRec?.menuId ? menuItems.find(m => m.id === primaryRec.menuId) : undefined) ||
      menuItems.find(m => m.date === isoDate) ||
      menuItems.find(m => m.dayName.toLowerCase() === dayName.toLowerCase()) ||
      menuItems[0];

    const rows: PortioningSubRow[] = [];

    orderedCategories.forEach(catKey => {
      const spec = DEFAULT_PORTION_SPECS[catKey];
      const f1: CookedFoodItem | undefined = primaryRec?.foodTemps?.[catKey];
      const f2: CookedFoodItem | undefined = secondRec?.foodTemps?.[catKey];
      const f3: CookedFoodItem | undefined = thirdRec?.foodTemps?.[catKey];
      const namaMenu = getMenuNameByCategory(matchedMenu, catKey);
      const dangerZone = f1?.dangerZone || spec.dangerZone;

      const s1Temp = typeof f1?.temp === 'number' && f1.temp > 0 ? f1.temp : undefined;
      const s2Temp =
        typeof f1?.session2Temp === 'number' && f1.session2Temp > 0
          ? f1.session2Temp
          : typeof f2?.temp === 'number' && f2.temp > 0
          ? f2.temp
          : undefined;
      const s3Temp =
        typeof f1?.session3Temp === 'number' && f1.session3Temp > 0
          ? f1.session3Temp
          : typeof f3?.temp === 'number' && f3.temp > 0
          ? f3.temp
          : undefined;

      const s1Photo = f1?.photoUrl;
      const s2Photo = f1?.session2PhotoUrl || f2?.photoUrl;
      const s3Photo = f1?.session3PhotoUrl || f3?.photoUrl;

      if (catKey === 'rice') {
        // Sub-row 1: Makanan pokok (p besar)
        const rawLarge = f1?.rawWeightGrams ?? spec.rawLarge;
        const factorLarge = f1?.conversionFactor ?? spec.factorLarge;
        const cookedLarge = f1?.cookedWeightGrams ?? spec.cookedLarge;

        rows.push({
          rowId: `${isoDate}-rice-besar`,
          categoryKey: 'rice',
          jenisBahan: spec.jenisBahan,
          namaMenu,
          dangerZone,
          beratMentahDisplay: `${formatNumberID(rawLarge)} g (p besar)`,
          faktorKonversiDisplay: formatNumberID(factorLarge),
          beratMatangDisplay: formatNumberID(cookedLarge),
          portionVariant: 'besar',
          sesi1: { tempNum: s1Temp, tempDisplay: formatCommaTemp(s1Temp), photoUrl: s1Photo },
          sesi2: { tempNum: s2Temp, tempDisplay: formatCommaTemp(s2Temp), photoUrl: s2Photo },
          sesi3: { tempNum: s3Temp, tempDisplay: formatCommaTemp(s3Temp), photoUrl: s3Photo },
          isFirstOfCategory: true,
          categoryRowSpan: 2,
        });

        // Sub-row 2: Makanan pokok (p kecil)
        const rawSmall = f1?.rawWeightSmallGrams ?? spec.rawSmall ?? 50;
        const factorSmall = f1?.conversionFactorSmall ?? spec.factorSmall ?? 1;
        const cookedSmall = f1?.cookedWeightSmallGrams ?? spec.cookedSmall ?? 100;

        const sm1Temp =
          typeof f1?.smallPortionSession1Temp === 'number' && f1.smallPortionSession1Temp > 0
            ? f1.smallPortionSession1Temp
            : s1Temp;
        const sm2Temp =
          typeof f1?.smallPortionSession2Temp === 'number' && f1.smallPortionSession2Temp > 0
            ? f1.smallPortionSession2Temp
            : s2Temp;
        const sm3Temp =
          typeof f1?.smallPortionSession3Temp === 'number' && f1.smallPortionSession3Temp > 0
            ? f1.smallPortionSession3Temp
            : s3Temp;

        const sm1Photo = f1?.smallPortionSession1PhotoUrl || primaryRec?.smallPortionPhoto || s1Photo;
        const sm2Photo = f1?.smallPortionSession2PhotoUrl || s2Photo;
        const sm3Photo = f1?.smallPortionSession3PhotoUrl || s3Photo;

        rows.push({
          rowId: `${isoDate}-rice-kecil`,
          categoryKey: 'rice',
          jenisBahan: spec.jenisBahan,
          namaMenu,
          dangerZone,
          beratMentahDisplay: `${formatNumberID(rawSmall)} g (p kecil)`,
          faktorKonversiDisplay: formatNumberID(factorSmall),
          beratMatangDisplay: formatNumberID(cookedSmall),
          portionVariant: 'kecil',
          sesi1: { tempNum: sm1Temp, tempDisplay: formatCommaTemp(sm1Temp), photoUrl: sm1Photo },
          sesi2: { tempNum: sm2Temp, tempDisplay: formatCommaTemp(sm2Temp), photoUrl: sm2Photo },
          sesi3: { tempNum: sm3Temp, tempDisplay: formatCommaTemp(sm3Temp), photoUrl: sm3Photo },
          isFirstOfCategory: false,
          categoryRowSpan: 0,
        });
      } else {
        const rawW = f1?.rawWeightGrams ?? spec.rawLarge;
        const factor = f1?.conversionFactor ?? spec.factorLarge;
        const cookedW = f1?.cookedWeightGrams ?? spec.cookedLarge;

        rows.push({
          rowId: `${isoDate}-${catKey}`,
          categoryKey: catKey,
          jenisBahan: spec.jenisBahan,
          namaMenu,
          dangerZone,
          beratMentahDisplay: formatNumberID(rawW),
          faktorKonversiDisplay: formatNumberID(factor),
          beratMatangDisplay: formatNumberID(cookedW),
          portionVariant: 'standar',
          sesi1: { tempNum: s1Temp, tempDisplay: formatCommaTemp(s1Temp), photoUrl: s1Photo },
          sesi2: { tempNum: s2Temp, tempDisplay: formatCommaTemp(s2Temp), photoUrl: s2Photo },
          sesi3: { tempNum: s3Temp, tempDisplay: formatCommaTemp(s3Temp), photoUrl: s3Photo },
          isFirstOfCategory: true,
          categoryRowSpan: 1,
        });
      }
    });

    return {
      isoDate,
      dayName,
      shortDate,
      portioningTime: primaryRec?.portioningTime || primaryRec?.time || '06:45 - 07:30 WIB',
      officerName: primaryRec?.officerName || 'Tim Divisi Pemorsian',
      menuCode: matchedMenu?.menuCode,
      smallPortionWeightGrams: primaryRec?.smallPortionWeightGrams || 0,
      largePortionWeightGrams: primaryRec?.largePortionWeightGrams || 0,
      rows,
    };
  });

  const cleanSppgTitle = (sppgConfig.sppgName || 'PROBOLINGGO KREJENGAN TEMENGGUNGAN 2')
    .replace(/^SPPG\s+/i, '')
    .toUpperCase();

  const addressLine = `${sppgConfig.address || 'Dusun Krajan RT/RW 003/004 Desa Temenggungan'}, Kecamatan ${
    sppgConfig.district || 'Krejengan'
  }, ${sppgConfig.regency || 'Kabupaten Probolinggo'}, ${
    sppgConfig.province || 'Jawa Timur'
  }, ID 67284. Email : ${sppgConfig.email}`;

  return {
    sppgTitleLine: cleanSppgTitle,
    addressLine,
    periodeLabel: formatPeriodeRange(sortedDates, startDate, endDate),
    groups,
  };
}

interface PortioningFoodTempSheetProps {
  data: PortioningFoodTempData;
  onPreviewPhoto?: (info: { label: string; url: string; caption?: string }) => void;
  className?: string;
}

export const PortioningFoodTempSheet: React.FC<PortioningFoodTempSheetProps> = ({
  data,
  onPreviewPhoto,
  className = '',
}) => {
  const renderPhotoCell = (
    group: PortioningDateGroup,
    row: PortioningSubRow,
    sesiLabel: string,
    reading: PortioningSessionReading
  ) => {
    if (!reading.photoUrl) {
      return (
        <div className="h-14 flex items-center justify-center text-[10px] text-slate-600">
          -
        </div>
      );
    }
    return (
      <button
        type="button"
        onClick={() =>
          onPreviewPhoto?.({
            label: `${row.namaMenu} — ${sesiLabel} (${row.jenisBahan})`,
            url: reading.photoUrl!,
            caption: `${group.dayName} ${group.shortDate} • Waktu Pemorsian: ${group.portioningTime} • Berat Mentah: ${row.beratMentahDisplay} • Berat Matang: ${row.beratMatangDisplay}g • Suhu: ${reading.tempDisplay}°C • Petugas: ${group.officerName}`,
          })
        }
        title={`Klik untuk perbesar dokumentasi ${sesiLabel}`}
        className="w-full flex items-center justify-center p-0.5 hover:bg-blue-50/70 transition cursor-pointer group"
      >
        <img
          src={reading.photoUrl}
          alt={`${row.namaMenu} ${sesiLabel}`}
          className="w-16 h-14 object-cover border border-slate-300 print:border-slate-500 group-hover:scale-[1.03] transition"
        />
      </button>
    );
  };

  return (
    <div
      className={`bg-white text-black p-5 sm:p-7 rounded-xl border border-slate-200 shadow-sm print:shadow-none print:border-none print:p-2 print:rounded-none font-serif leading-tight ${className}`}
    >
      {/* KOP SURAT BGN */}
      <div className="flex items-start gap-4 pb-2.5">
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
          <p className="text-[9.5px] sm:text-[10.5px] text-black mt-0.5 font-sans">
            {data.addressLine}
          </p>
        </div>
      </div>

      {/* JUDUL */}
      <div className="text-center pb-1.5 pt-1">
        <h1 className="text-[12px] sm:text-[13.5px] font-bold uppercase tracking-wide text-black">
          PEMANTAUAN STANDAR PORSI &amp; SUHU MAKANAN PEMORSIAN
        </h1>
      </div>

      {/* PERIODE */}
      <div className="mb-1.5 text-[10px] sm:text-[11px] text-black font-sans">
        <div className="font-bold">
          Periode : <span className="font-semibold">{data.periodeLabel}</span>
        </div>
      </div>

      {/* TABEL RESMI PEMANTAUAN STANDAR PORSI & SUHU MAKANAN PEMORSIAN */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-black text-[9.5px] sm:text-[10px] text-black font-sans">
          <thead>
            <tr className="bg-slate-200/80 print:bg-slate-200 font-bold text-center">
              <th rowSpan={2} className="border border-black px-1.5 py-1.5 align-middle whitespace-nowrap">
                Tanggal
              </th>
              <th rowSpan={2} className="border border-black px-1.5 py-1.5 align-middle whitespace-nowrap">
                Jenis bahan
              </th>
              <th rowSpan={2} className="border border-black px-2 py-1.5 align-middle min-w-[130px]">
                Nama makanan/menu
              </th>
              <th rowSpan={2} className="border border-black px-1.5 py-1.5 align-middle whitespace-nowrap">
                Danger zone
              </th>
              <th rowSpan={2} className="border border-black px-1.5 py-1.5 align-middle whitespace-nowrap">
                Berat mentah
              </th>
              <th rowSpan={2} className="border border-black px-1.5 py-1.5 align-middle min-w-[62px]">
                Faktor konversi
              </th>
              <th rowSpan={2} className="border border-black px-1.5 py-1.5 align-middle min-w-[56px]">
                Berat matang
              </th>
              <th colSpan={3} className="border border-black px-1 py-1 align-middle">
                Suhu (°C)
              </th>
              <th colSpan={3} className="border border-black px-1 py-1 align-middle">
                Dokumentasi
              </th>
            </tr>
            <tr className="bg-slate-200/80 print:bg-slate-200 font-bold text-center text-[9px]">
              <th className="border border-black px-1.5 py-1 min-w-[42px]">Sesi 1</th>
              <th className="border border-black px-1.5 py-1 min-w-[42px]">Sesi 2</th>
              <th className="border border-black px-1.5 py-1 min-w-[42px]">Sesi 3</th>
              <th className="border border-black px-1 py-1 min-w-[68px]">Sesi 1</th>
              <th className="border border-black px-1 py-1 min-w-[68px]">Sesi 2</th>
              <th className="border border-black px-1 py-1 min-w-[68px]">Sesi 3</th>
            </tr>
          </thead>

          <tbody>
            {data.groups.length === 0 ? (
              <tr>
                <td colSpan={13} className="border border-black px-4 py-8 text-center italic text-slate-500">
                  Belum ada catatan pemantauan standar porsi &amp; suhu makanan di Divisi Pemorsian.
                </td>
              </tr>
            ) : (
              data.groups.map(group =>
                group.rows.map((row, idx) => (
                  <tr key={row.rowId} className="align-middle">
                    {idx === 0 && (
                      <td
                        rowSpan={group.rows.length}
                        className="border border-black px-1.5 py-2 text-left align-top font-semibold whitespace-nowrap bg-white"
                      >
                        <div className="font-bold text-black">{group.dayName}</div>
                        <div className="text-black">{group.shortDate}</div>
                      </td>
                    )}

                    {row.isFirstOfCategory && (
                      <td
                        rowSpan={row.categoryRowSpan}
                        className="border border-black px-1.5 py-1.5 text-left align-middle font-medium"
                      >
                        {row.jenisBahan}
                      </td>
                    )}

                    {row.isFirstOfCategory && (
                      <td
                        rowSpan={row.categoryRowSpan}
                        className="border border-black px-2 py-1.5 text-left align-middle font-medium text-black"
                      >
                        {row.namaMenu}
                      </td>
                    )}

                    {row.isFirstOfCategory && (
                      <td
                        rowSpan={row.categoryRowSpan}
                        className="border border-black px-1.5 py-1.5 text-center align-middle font-medium whitespace-nowrap"
                      >
                        {row.dangerZone}
                      </td>
                    )}

                    <td className="border border-black px-1.5 py-1.5 text-center whitespace-nowrap">
                      {row.beratMentahDisplay}
                    </td>

                    <td className="border border-black px-1.5 py-1.5 text-center whitespace-nowrap">
                      {row.faktorKonversiDisplay}
                    </td>

                    <td className="border border-black px-1.5 py-1.5 text-center whitespace-nowrap">
                      {row.beratMatangDisplay}
                    </td>

                    {/* Suhu (°C) Sesi 1, 2, 3 */}
                    <td className="border border-black px-1 py-1.5 text-center font-medium whitespace-nowrap">
                      {row.sesi1.tempDisplay}
                    </td>
                    <td className="border border-black px-1 py-1.5 text-center font-medium whitespace-nowrap">
                      {row.sesi2.tempDisplay}
                    </td>
                    <td className="border border-black px-1 py-1.5 text-center font-medium whitespace-nowrap">
                      {row.sesi3.tempDisplay}
                    </td>

                    {/* Dokumentasi Sesi 1, 2, 3 */}
                    <td className="border border-black p-0.5 align-middle text-center">
                      {renderPhotoCell(group, row, 'Sesi 1', row.sesi1)}
                    </td>
                    <td className="border border-black p-0.5 align-middle text-center">
                      {renderPhotoCell(group, row, 'Sesi 2', row.sesi2)}
                    </td>
                    <td className="border border-black p-0.5 align-middle text-center">
                      {renderPhotoCell(group, row, 'Sesi 3', row.sesi3)}
                    </td>
                  </tr>
                ))
              )
            )}
          </tbody>
        </table>
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
        const target = 160;
        const ratio = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1;
        canvas.width = ratio >= 1 ? target : Math.max(48, Math.round(target * ratio));
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

export async function exportPortioningFoodTempPDF(data: PortioningFoodTempData) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const left = 10;
  const right = 287;
  const centerX = 148.5;

  const logoPromise = loadLogoPngDataUrl(
    '/assets/aistudio/Badan_Gizi_Nasional__BGN__Logo_-_Colored_-_zonalogo.com_5e10d066.png'
  );

  const uniquePhotoUrls = Array.from(
    new Set(
      data.groups
        .flatMap(g => g.rows.flatMap(r => [r.sesi1.photoUrl, r.sesi2.photoUrl, r.sesi3.photoUrl]))
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
  doc.text(data.sppgTitleLine, textStartX, 21.2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const addrLines = doc.splitTextToSize(data.addressLine, right - textStartX);
  doc.text(addrLines, textStartX, 25);

  // JUDUL
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(
    'PEMANTAUAN STANDAR PORSI & SUHU MAKANAN PEMORSIAN',
    centerX,
    33,
    { align: 'center' }
  );

  // PERIODE
  doc.setFontSize(8);
  doc.text(`Periode : ${data.periodeLabel}`, left, 38.5);

  // Build rows with merged Tanggal (rowSpan: 6) and merged makanan pokok (rowSpan: 2)
  const cellPhotoUrlMap = new Map<string, string>();
  const body: any[][] = [];
  let rowIndex = 0;

  data.groups.forEach(group => {
    group.rows.forEach((row, idx) => {
      const p1 = row.sesi1.photoUrl ? photoMap.get(row.sesi1.photoUrl) : null;
      const p2 = row.sesi2.photoUrl ? photoMap.get(row.sesi2.photoUrl) : null;
      const p3 = row.sesi3.photoUrl ? photoMap.get(row.sesi3.photoUrl) : null;
      if (p1) cellPhotoUrlMap.set(`${rowIndex}:10`, p1);
      if (p2) cellPhotoUrlMap.set(`${rowIndex}:11`, p2);
      if (p3) cellPhotoUrlMap.set(`${rowIndex}:12`, p3);

      const rowCells: any[] = [];
      if (idx === 0) {
        rowCells.push({
          content: `${group.dayName}\n${group.shortDate}`,
          rowSpan: group.rows.length,
          styles: { valign: 'top', halign: 'left', fontStyle: 'bold' },
        });
      }

      if (row.isFirstOfCategory) {
        rowCells.push({
          content: row.jenisBahan,
          rowSpan: row.categoryRowSpan,
          styles: { valign: 'middle', halign: 'left' },
        });
        rowCells.push({
          content: row.namaMenu,
          rowSpan: row.categoryRowSpan,
          styles: { valign: 'middle', halign: 'left' },
        });
        rowCells.push({
          content: row.dangerZone,
          rowSpan: row.categoryRowSpan,
          styles: { valign: 'middle', halign: 'center' },
        });
      }

      rowCells.push(
        row.beratMentahDisplay,
        row.faktorKonversiDisplay,
        row.beratMatangDisplay,
        row.sesi1.tempDisplay,
        row.sesi2.tempDisplay,
        row.sesi3.tempDisplay,
        row.sesi1.photoUrl ? '' : '-',
        row.sesi2.photoUrl ? '' : '-',
        row.sesi3.photoUrl ? '' : '-'
      );

      body.push(rowCells);
      rowIndex++;
    });
  });

  autoTable(doc, {
    startY: 41,
    margin: { left, right: 10 },
    theme: 'grid',
    head: [
      [
        { content: 'Tanggal', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
        { content: 'Jenis bahan', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
        { content: 'Nama makanan/menu', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
        { content: 'Danger zone', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
        { content: 'Berat\nmentah', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
        { content: 'Faktor\nkonversi', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
        { content: 'Berat\nmatang', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
        { content: 'Suhu (°C)', colSpan: 3, styles: { valign: 'middle', halign: 'center' } },
        { content: 'Dokumentasi', colSpan: 3, styles: { valign: 'middle', halign: 'center' } },
      ],
      [
        { content: 'Sesi 1', styles: { halign: 'center' } },
        { content: 'Sesi 2', styles: { halign: 'center' } },
        { content: 'Sesi 3', styles: { halign: 'center' } },
        { content: 'Sesi 1', styles: { halign: 'center' } },
        { content: 'Sesi 2', styles: { halign: 'center' } },
        { content: 'Sesi 3', styles: { halign: 'center' } },
      ],
    ],
    body,
    styles: {
      font: 'helvetica',
      fontSize: 7.4,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      cellPadding: 1.2,
      valign: 'middle',
      halign: 'center',
      minCellHeight: 15.5,
    },
    headStyles: {
      fillColor: [226, 232, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 7.2,
      minCellHeight: 5.5,
    },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 24, halign: 'left' },
      2: { cellWidth: 42, halign: 'left' },
      3: { cellWidth: 18 },
      4: { cellWidth: 22 },
      5: { cellWidth: 16 },
      6: { cellWidth: 16 },
      7: { cellWidth: 12 },
      8: { cellWidth: 12 },
      9: { cellWidth: 12 },
      10: { cellWidth: 28 },
      11: { cellWidth: 28 },
      12: { cellWidth: 28 },
    },
    didDrawCell: cellData => {
      if (cellData.section === 'body' && cellData.column.index >= 10) {
        const photoUrl = cellPhotoUrlMap.get(`${cellData.row.index}:${cellData.column.index}`);
        if (photoUrl) {
          const pad = 1;
          const imgW = Math.min(23, cellData.cell.width - pad * 2);
          const imgH = Math.min(13.5, cellData.cell.height - pad * 2);
          const drawX = cellData.cell.x + (cellData.cell.width - imgW) / 2;
          const drawY = cellData.cell.y + (cellData.cell.height - imgH) / 2;
          try {
            doc.addImage(photoUrl, 'JPEG', drawX, drawY, imgW, imgH);
          } catch {
            // ignore image draw errors
          }
        }
      }
    },
  });

  doc.save('Pemantauan_Standar_Porsi_Suhu_Pemorsian_SPPG_TMG2.pdf');
}
