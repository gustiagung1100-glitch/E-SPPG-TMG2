import React from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BGNLogo } from './OfficialLogos';
import { parseLocalDate } from '../../lib/exportUtils';
import {
  CookingInspectionRecord,
  CookedFoodItem,
  MenuItem,
  MasterVolunteer,
  SPPGConfig,
} from '../../types';

export type CookingFoodCategoryKey =
  | 'rice'
  | 'animalProtein'
  | 'plantProtein'
  | 'vegetable'
  | 'fruit';

export interface CookingSessionReading {
  tempNum?: number;
  tempDisplay: string;
  photoUrl?: string;
}

export interface CookingFoodCategoryRow {
  categoryKey: CookingFoodCategoryKey;
  jenisBahan: string;
  namaMenu: string;
  peralatanMasak: string;
  batasKritis: string;
  sesi1: CookingSessionReading;
  sesi2: CookingSessionReading;
  sesi3: CookingSessionReading;
  statusCCP: string;
  ccpPassed: boolean;
  penanggungJawab: string;
}

export interface CookingFoodDateGroup {
  isoDate: string;
  dayName: string;
  shortDate: string; // DD/MM/YY
  waktuMasak: string;
  officerName: string;
  menuCode?: string;
  items: CookingFoodCategoryRow[];
}

export interface CookingFoodTempData {
  sppgTitleLine: string;
  addressLine: string;
  periodeLabel: string;
  legendText: string;
  groups: CookingFoodDateGroup[];
  activePengolahanVolunteers: MasterVolunteer[];
}

const DEFAULT_EQUIPMENTS: Record<CookingFoodCategoryKey, string> = {
  rice: 'Rice Steamer Gas 40 Tray',
  animalProtein: 'Wajan Penggorengan A1',
  plantProtein: 'Wajan Penggorengan A2',
  vegetable: 'Kettle Sup Uap 200L',
  fruit: 'Meja Steril Buah & Pelengkap',
};

const CATEGORY_DEFINITIONS: Array<{
  key: CookingFoodCategoryKey;
  jenisBahan: string;
  batasKritis: string;
  minTemp: number;
  maxTemp?: number;
  isHotFood: boolean;
}> = [
  {
    key: 'rice',
    jenisBahan: 'makanan pokok',
    batasKritis: '≥ 75°C',
    minTemp: 75,
    isHotFood: true,
  },
  {
    key: 'animalProtein',
    jenisBahan: 'lauk hewani',
    batasKritis: '≥ 75°C (75-90°C)',
    minTemp: 75,
    maxTemp: 95,
    isHotFood: true,
  },
  {
    key: 'plantProtein',
    jenisBahan: 'lauk nabati',
    batasKritis: '≥ 75°C',
    minTemp: 75,
    isHotFood: true,
  },
  {
    key: 'vegetable',
    jenisBahan: 'sayur',
    batasKritis: '≥ 75°C',
    minTemp: 75,
    isHotFood: true,
  },
  {
    key: 'fruit',
    jenisBahan: 'lainnya (buah)',
    batasKritis: '≥ 75°C / Segar',
    minTemp: 0,
    isHotFood: false,
  },
];

function formatCommaDecimal(val?: number): string {
  if (typeof val !== 'number' || Number.isNaN(val)) return '-';
  return val.toFixed(1).replace('.', ',');
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

function getMenuNameByCategory(menu: MenuItem | undefined, key: CookingFoodCategoryKey): string {
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

function resolvePicForCategory(
  recordOfficer: string,
  pengolahanVolunteers: MasterVolunteer[],
  categoryIndex: number
): string {
  if (pengolahanVolunteers.length > 0) {
    const matched = pengolahanVolunteers[categoryIndex % pengolahanVolunteers.length];
    if (recordOfficer && recordOfficer.toLowerCase().includes(matched.name.toLowerCase())) {
      return `${matched.name} (${matched.position})`;
    }
    return matched.name;
  }
  return recordOfficer || 'Tim Divisi Pengolahan';
}

export interface ResolveCookingFoodTempParams {
  cookingRecords: CookingInspectionRecord[];
  menuItems: MenuItem[];
  masterVolunteers: MasterVolunteer[];
  sppgConfig: SPPGConfig;
  startDate?: string;
  endDate?: string;
  periodType?: 'harian' | 'mingguan' | 'bulanan' | 'periode';
}

export function resolveCookingFoodTempData(
  params: ResolveCookingFoodTempParams
): CookingFoodTempData {
  const {
    cookingRecords,
    menuItems,
    masterVolunteers,
    sppgConfig,
    startDate,
    endDate,
    periodType,
  } = params;

  const activePengolahanVolunteers = masterVolunteers.filter(
    v => v.isActive && v.division === 'Pengolahan'
  );

  // Group cooking records by date (descending or chronological ascending for sheet)
  const recordsByDate = new Map<string, CookingInspectionRecord[]>();
  cookingRecords.forEach(rec => {
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

  const groups: CookingFoodDateGroup[] = sortedDates.map(isoDate => {
    const dayRecords = [...(recordsByDate.get(isoDate) || [])].sort((a, b) =>
      (a.time || '').localeCompare(b.time || '')
    );
    const primaryRec = dayRecords[0];
    const secondRec = dayRecords[1];
    const thirdRec = dayRecords[2];

    const { dayName, shortDate } = formatDayAndShortDate(isoDate);

    // Match Master Menu: exact menuId -> exact date -> dayName match -> first menu item
    const matchedMenu =
      (primaryRec?.menuId ? menuItems.find(m => m.id === primaryRec.menuId) : undefined) ||
      menuItems.find(m => m.date === isoDate) ||
      menuItems.find(m => m.dayName.toLowerCase() === dayName.toLowerCase()) ||
      menuItems[0];

    const items: CookingFoodCategoryRow[] = CATEGORY_DEFINITIONS.map((catDef, idx) => {
      const f1: CookedFoodItem | undefined = primaryRec?.cookedFoods?.[catDef.key];
      const f2: CookedFoodItem | undefined = secondRec?.cookedFoods?.[catDef.key];
      const f3: CookedFoodItem | undefined = thirdRec?.cookedFoods?.[catDef.key];

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

      const tempsToCheck = [s1Temp, s2Temp, s3Temp].filter(
        (v): v is number => typeof v === 'number'
      );

      let statusCCP = '-';
      let ccpPassed = true;
      if (tempsToCheck.length > 0) {
        if (!catDef.isHotFood) {
          statusCCP = 'Segar / Aman';
          ccpPassed = true;
        } else {
          const allAboveMin = tempsToCheck.every(t => t >= catDef.minTemp);
          statusCCP = allAboveMin ? 'Lolos CCP (Aman)' : 'Perlu Tindakan (<75°C)';
          ccpPassed = allAboveMin;
        }
      }

      const peralatanMasak = f1?.equipment?.trim() || DEFAULT_EQUIPMENTS[catDef.key];

      return {
        categoryKey: catDef.key,
        jenisBahan: catDef.jenisBahan,
        namaMenu: getMenuNameByCategory(matchedMenu, catDef.key),
        peralatanMasak,
        batasKritis: catDef.batasKritis,
        sesi1: {
          tempNum: s1Temp,
          tempDisplay: formatCommaDecimal(s1Temp),
          photoUrl: s1Photo,
        },
        sesi2: {
          tempNum: s2Temp,
          tempDisplay: formatCommaDecimal(s2Temp),
          photoUrl: s2Photo,
        },
        sesi3: {
          tempNum: s3Temp,
          tempDisplay: formatCommaDecimal(s3Temp),
          photoUrl: s3Photo,
        },
        statusCCP,
        ccpPassed,
        penanggungJawab: resolvePicForCategory(
          primaryRec?.officerName || '',
          activePengolahanVolunteers,
          idx
        ),
      };
    });

    return {
      isoDate,
      dayName,
      shortDate,
      waktuMasak: primaryRec?.time || '06:15 WIB',
      officerName: primaryRec?.officerName || activePengolahanVolunteers[0]?.name || 'Tim Pengolahan',
      menuCode: matchedMenu?.menuCode,
      items,
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
    legendText:
      'Makanan Pokok (Nasi, Umbi-umbian) & Lauk Nabati ≥ 75°C ; Lauk Hewani (Daging, Unggas, Telur, Ikan) : 75-90 °C ; Makanan Berkuah & Sayuran : ≥ 75°C',
    groups,
    activePengolahanVolunteers,
  };
}

interface CookingFoodTempSheetProps {
  data: CookingFoodTempData;
  onPreviewPhoto?: (info: { label: string; url: string; caption?: string }) => void;
  className?: string;
}

export const CookingFoodTempSheet: React.FC<CookingFoodTempSheetProps> = ({
  data,
  onPreviewPhoto,
  className = '',
}) => {
  const renderPhotoCell = (
    group: CookingFoodDateGroup,
    item: CookingFoodCategoryRow,
    sesiLabel: string,
    reading: CookingSessionReading
  ) => {
    if (!reading.photoUrl) {
      return (
        <div className="h-14 flex items-center justify-center text-[9px] italic text-slate-400 px-1 text-center">
          Belum ada foto
        </div>
      );
    }
    return (
      <button
        type="button"
        onClick={() =>
          onPreviewPhoto?.({
            label: `${item.namaMenu} — ${sesiLabel} (${item.jenisBahan})`,
            url: reading.photoUrl!,
            caption: `${group.dayName} ${group.shortDate} • Jam ${group.waktuMasak} • Suhu: ${reading.tempDisplay}°C • Alat: ${item.peralatanMasak} • PJ: ${item.penanggungJawab}`,
          })
        }
        title={`Klik untuk perbesar dokumentasi ${sesiLabel}`}
        className="w-full flex items-center justify-center p-0.5 hover:bg-blue-50/70 transition cursor-pointer group"
      >
        <img
          src={reading.photoUrl}
          alt={`${item.namaMenu} ${sesiLabel}`}
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
      <div className="text-center pb-1.5">
        <h1 className="text-[12px] sm:text-[13.5px] font-bold uppercase tracking-wide text-black">
          PEMANTAUAN SUHU MAKANAN PENGOLAHAN &amp; TITIK KENDALI KRITIS (CCP)
        </h1>
      </div>

      {/* PERIODE & BATAS KRITIS LEGEND */}
      <div className="mb-1.5 space-y-0.5 text-[10px] sm:text-[11px] text-black font-sans">
        <div className="font-bold">
          Periode : <span className="font-semibold">{data.periodeLabel}</span>
        </div>
        <div className="text-[9.5px] sm:text-[10.5px] font-medium text-slate-900">
          {data.legendText}
        </div>
      </div>

      {/* TABEL GABUNGAN (FORM PENGOLAHAN CCP + CHECKLIST SUHU & DOKUMENTASI SESI 1-3) */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-black text-[9.5px] sm:text-[10px] text-black font-sans">
          <thead>
            <tr className="bg-slate-200/80 print:bg-slate-200 font-bold text-center">
              <th rowSpan={2} className="border border-black px-1.5 py-1.5 align-middle whitespace-nowrap">
                Tanggal &amp; Waktu
              </th>
              <th rowSpan={2} className="border border-black px-1.5 py-1.5 align-middle whitespace-nowrap">
                Jenis bahan
              </th>
              <th rowSpan={2} className="border border-black px-2 py-1.5 align-middle min-w-[125px]">
                Nama makanan/menu
              </th>
              <th rowSpan={2} className="border border-black px-1.5 py-1.5 align-middle min-w-[105px]">
                Peralatan Masak
              </th>
              <th rowSpan={2} className="border border-black px-1.5 py-1.5 align-middle whitespace-nowrap">
                Batas Kritis
              </th>
              <th colSpan={3} className="border border-black px-1 py-1 align-middle">
                Suhu Internal (°C)
              </th>
              <th rowSpan={2} className="border border-black px-1.5 py-1.5 align-middle min-w-[82px]">
                Status CCP
              </th>
              <th rowSpan={2} className="border border-black px-1.5 py-1.5 align-middle min-w-[95px]">
                Penanggung Jawab
              </th>
              <th colSpan={3} className="border border-black px-1 py-1 align-middle">
                Dokumentasi
              </th>
            </tr>
            <tr className="bg-slate-200/80 print:bg-slate-200 font-bold text-center text-[9px]">
              <th className="border border-black px-1.5 py-1 min-w-[44px]">Sesi 1</th>
              <th className="border border-black px-1.5 py-1 min-w-[44px]">Sesi 2</th>
              <th className="border border-black px-1.5 py-1 min-w-[44px]">Sesi 3</th>
              <th className="border border-black px-1 py-1 min-w-[68px]">Sesi 1</th>
              <th className="border border-black px-1 py-1 min-w-[68px]">Sesi 2</th>
              <th className="border border-black px-1 py-1 min-w-[68px]">Sesi 3</th>
            </tr>
          </thead>

          <tbody>
            {data.groups.length === 0 ? (
              <tr>
                <td colSpan={13} className="border border-black px-4 py-8 text-center italic text-slate-500">
                  Belum ada catatan suhu masakan di Sub Menu Tugas Divisi Pengolahan.
                </td>
              </tr>
            ) : (
              data.groups.map(group =>
                group.items.map((item, idx) => (
                  <tr key={`${group.isoDate}-${item.categoryKey}`} className="align-middle">
                    {idx === 0 && (
                      <td
                        rowSpan={group.items.length}
                        className="border border-black px-1.5 py-2 text-center align-top font-semibold whitespace-nowrap bg-white"
                      >
                        <div className="font-bold text-black">{group.dayName}</div>
                        <div className="text-black">{group.shortDate}</div>
                        <div className="mt-1 text-[8.5px] font-mono text-slate-700">
                          {group.waktuMasak}
                        </div>
                        {group.menuCode && (
                          <div className="mt-0.5 text-[8px] font-mono text-blue-900">
                            {group.menuCode}
                          </div>
                        )}
                      </td>
                    )}

                    <td className="border border-black px-1.5 py-1.5 text-left font-medium capitalize">
                      {item.jenisBahan}
                    </td>

                    <td className="border border-black px-2 py-1.5 text-left font-medium text-black">
                      {item.namaMenu}
                    </td>

                    <td className="border border-black px-1.5 py-1.5 text-left text-[9px] text-slate-800">
                      {item.peralatanMasak}
                    </td>

                    <td className="border border-black px-1.5 py-1.5 text-center font-semibold whitespace-nowrap">
                      {item.batasKritis}
                    </td>

                    {/* Suhu Internal Sesi 1, 2, 3 */}
                    <td className="border border-black px-1 py-1.5 text-center font-medium whitespace-nowrap">
                      {item.sesi1.tempDisplay}
                    </td>
                    <td className="border border-black px-1 py-1.5 text-center font-medium whitespace-nowrap">
                      {item.sesi2.tempDisplay}
                    </td>
                    <td className="border border-black px-1 py-1.5 text-center font-medium whitespace-nowrap">
                      {item.sesi3.tempDisplay}
                    </td>

                    {/* Status CCP */}
                    <td className="border border-black px-1.5 py-1.5 text-center text-[8.5px] font-bold">
                      <span
                        className={
                          item.statusCCP === '-'
                            ? 'text-slate-500'
                            : item.ccpPassed
                            ? 'text-emerald-800 print:text-black'
                            : 'text-rose-700 print:text-black'
                        }
                      >
                        {item.statusCCP}
                      </span>
                    </td>

                    {/* Penanggung Jawab (Master Data Relawan Div. Pengolahan) */}
                    <td className="border border-black px-1.5 py-1.5 text-left text-[9px] font-medium">
                      {item.penanggungJawab}
                    </td>

                    {/* Dokumentasi Sesi 1, 2, 3 */}
                    <td className="border border-black p-0.5 align-middle text-center">
                      {renderPhotoCell(group, item, 'Sesi 1', item.sesi1)}
                    </td>
                    <td className="border border-black p-0.5 align-middle text-center">
                      {renderPhotoCell(group, item, 'Sesi 2', item.sesi2)}
                    </td>
                    <td className="border border-black p-0.5 align-middle text-center">
                      {renderPhotoCell(group, item, 'Sesi 3', item.sesi3)}
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

export async function exportCookingFoodTempPDF(data: CookingFoodTempData) {
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
        .flatMap(g => g.items.flatMap(i => [i.sesi1.photoUrl, i.sesi2.photoUrl, i.sesi3.photoUrl]))
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
    'PEMANTAUAN SUHU MAKANAN PENGOLAHAN & TITIK KENDALI KRITIS (CCP)',
    centerX,
    33,
    { align: 'center' }
  );

  // PERIODE & LEGEND
  doc.setFontSize(8);
  doc.text(`Periode : ${data.periodeLabel}`, left, 38.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.text(data.legendText, left, 42.5);

  // Build rows with merged Tanggal cell (rowSpan: 5) and map embedded photos for cols 10, 11, 12
  const cellPhotoUrlMap = new Map<string, string>();
  const body: any[][] = [];
  let rowIndex = 0;

  data.groups.forEach(group => {
    group.items.forEach((item, idx) => {
      const p1 = item.sesi1.photoUrl ? photoMap.get(item.sesi1.photoUrl) : null;
      const p2 = item.sesi2.photoUrl ? photoMap.get(item.sesi2.photoUrl) : null;
      const p3 = item.sesi3.photoUrl ? photoMap.get(item.sesi3.photoUrl) : null;
      if (p1) cellPhotoUrlMap.set(`${rowIndex}:10`, p1);
      if (p2) cellPhotoUrlMap.set(`${rowIndex}:11`, p2);
      if (p3) cellPhotoUrlMap.set(`${rowIndex}:12`, p3);

      const rowCells: any[] = [];
      if (idx === 0) {
        rowCells.push({
          content: `${group.dayName}\n${group.shortDate}\n(${group.waktuMasak})`,
          rowSpan: group.items.length,
          styles: { valign: 'top', halign: 'center', fontStyle: 'bold' },
        });
      }
      rowCells.push(
        item.jenisBahan,
        item.namaMenu,
        item.peralatanMasak,
        item.batasKritis,
        item.sesi1.tempDisplay,
        item.sesi2.tempDisplay,
        item.sesi3.tempDisplay,
        item.statusCCP,
        item.penanggungJawab,
        item.sesi1.photoUrl ? '' : '-',
        item.sesi2.photoUrl ? '' : '-',
        item.sesi3.photoUrl ? '' : '-'
      );

      body.push(rowCells);
      rowIndex++;
    });
  });

  autoTable(doc, {
    startY: 44.5,
    margin: { left, right: 10 },
    theme: 'grid',
    head: [
      [
        { content: 'Tanggal & Waktu', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
        { content: 'Jenis bahan', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
        { content: 'Nama makanan/menu', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
        { content: 'Peralatan Masak', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
        { content: 'Batas\nKritis', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
        { content: 'Suhu Internal (°C)', colSpan: 3, styles: { valign: 'middle', halign: 'center' } },
        { content: 'Status\nCCP', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
        { content: 'Penanggung\nJawab', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
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
      fontSize: 7.2,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      cellPadding: 1.1,
      valign: 'middle',
      halign: 'center',
      minCellHeight: 16,
    },
    headStyles: {
      fillColor: [226, 232, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 7,
      minCellHeight: 5.5,
    },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 20, halign: 'left' },
      2: { cellWidth: 37, halign: 'left' },
      3: { cellWidth: 27, halign: 'left' },
      4: { cellWidth: 16 },
      5: { cellWidth: 11 },
      6: { cellWidth: 11 },
      7: { cellWidth: 11 },
      8: { cellWidth: 20 },
      9: { cellWidth: 26, halign: 'left' },
      10: { cellWidth: 25 },
      11: { cellWidth: 25 },
      12: { cellWidth: 25 },
    },
    didDrawCell: cellData => {
      if (cellData.section === 'body' && cellData.column.index >= 10) {
        const photoUrl = cellPhotoUrlMap.get(`${cellData.row.index}:${cellData.column.index}`);
        if (photoUrl) {
          const pad = 1;
          const imgW = Math.min(21, cellData.cell.width - pad * 2);
          const imgH = Math.min(14, cellData.cell.height - pad * 2);
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

  doc.save('Pemantauan_Suhu_Makanan_Pengolahan_CCP_SPPG_TMG2.pdf');
}
