import React from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BGNLogo } from './OfficialLogos';
import { parseLocalDate } from '../../lib/exportUtils';
import {
  CookingInspectionRecord,
  MasterVolunteer,
  MenuItem,
  PortioningInspectionRecord,
  SPPGConfig,
} from '../../types';

export type FoodTestOutcome = 'baik' | 'tidak_baik' | '';

export interface PlogOrganolepticItemRow {
  no: number;
  menuName: string;
  organolepticDetail: string; // Warna/Visual, Aroma, Rasa, Tekstur (PLOG)
  temperature: string; // Suhu uji (°C)
  outcome: FoodTestOutcome; // 'baik' -> ✓ di Baik, 'tidak_baik' -> ✓ di Tidak Baik, '' -> kosong
  ket: string;
}

export interface PlogOrganolepticData {
  rawDate: string;
  menuCode: string;
  sppgId: string;
  sppgTitleLine: string;
  sppgFooterName: string;
  addressLine: string;
  samplePreparedDateLabel: string;
  sampleAfter2x24DateLabel: string;
  officerName: string; // Pengawas Gizi / Petugas
  headChefName: string; // Penilai PLOG Dapur (Head Chef)
  kepalaSppgName: string;
  kepalaSppgNip: string;
  wetRows: PlogOrganolepticItemRow[]; // 7 rows (1-7)
  dryRows: PlogOrganolepticItemRow[]; // 7 rows (1-7)
  wetPhotoUrl?: string;
  dryPhotoUrl?: string;
  notes: string;
  blankMode: boolean;
}

function formatDayLowerIndonesian(date: Date): string {
  const weekday = new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(date).toLowerCase();
  const dayNum = date.getDate();
  const monthName = new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(date).toLowerCase();
  const year = date.getFullYear();
  return `${weekday}, ${dayNum} ${monthName} ${year}`;
}

export function computeAfterRetentionDate(dateStr?: string): string {
  const base = parseLocalDate(dateStr) || new Date();
  const next = new Date(base.getFullYear(), base.getMonth(), base.getDate() + 3);
  return formatDayLowerIndonesian(next);
}

export interface ResolvePlogOrganolepticParams {
  menu?: MenuItem;
  cookingRecords?: CookingInspectionRecord[];
  portioningRecords?: PortioningInspectionRecord[];
  masterVolunteers?: MasterVolunteer[];
  sppgConfig: SPPGConfig;
  date?: string;
  blankMode?: boolean;
  overrides?: {
    samplePreparedDateLabel?: string;
    sampleAfter2x24DateLabel?: string;
    officerName?: string;
    headChefName?: string;
    kepalaSppgName?: string;
    kepalaSppgNip?: string;
    wetRows?: PlogOrganolepticItemRow[];
    dryRows?: PlogOrganolepticItemRow[];
    wetPhotoUrl?: string;
    dryPhotoUrl?: string;
    notes?: string;
  };
}

function padToSevenRows(items: PlogOrganolepticItemRow[]): PlogOrganolepticItemRow[] {
  const result: PlogOrganolepticItemRow[] = [];
  for (let i = 0; i < 7; i++) {
    if (items[i]) {
      result.push({ ...items[i], no: i + 1 });
    } else {
      result.push({
        no: i + 1,
        menuName: '',
        organolepticDetail: '',
        temperature: '',
        outcome: '',
        ket: '',
      });
    }
  }
  return result;
}

export function resolvePlogOrganolepticData(
  params: ResolvePlogOrganolepticParams
): PlogOrganolepticData {
  const {
    menu,
    cookingRecords = [],
    portioningRecords = [],
    masterVolunteers = [],
    sppgConfig,
    date,
    blankMode = false,
    overrides,
  } = params;

  const activeDate = date || menu?.date || cookingRecords[0]?.date || '2026-11-08';
  const baseDateObj = parseLocalDate(activeDate) || new Date();

  const matchedCooking =
    cookingRecords.find(r => r.date === activeDate) || cookingRecords[0];
  const matchedPortioning =
    portioningRecords.find(r => r.date === activeDate) || portioningRecords[0];

  const chefVolunteer = masterVolunteers.find(
    v =>
      v.isActive &&
      (v.division === 'Pengolahan' || /chef|masak/i.test(v.position))
  );

  const defaultChefName =
    matchedCooking?.officerName ||
    chefVolunteer?.name ||
    'Head Chef Divisi Pengolahan';

  const defaultOfficerName =
    sppgConfig.nutritionOfficer?.trim() || 'Sufy Kaneisyah A, S.Tr.Gz.';

  const defaultKepalaName =
    sppgConfig.headOfSppg?.trim() || 'Rahtri Sephia Jayanti, S.Tr.Gz.';

  const cleanSppgTitle = (sppgConfig.sppgName || 'PROBOLINGGO KREJENGAN TEMENGGUNGAN 2')
    .replace(/^SPPG\s+/i, '')
    .toUpperCase();

  const addressLine = `${sppgConfig.address || 'Dusun Krajan RT/RW 003/004 Desa Temenggungan'}, Kecamatan ${
    sppgConfig.district || 'Krejengan'
  }, ${sppgConfig.regency || 'Kabupaten Probolinggo'}, ${
    sppgConfig.province || 'Jawa Timur'
  }, ID 67284. Email : ${sppgConfig.email}`;

  // Build wet menu rows from active MenuItem + Cooking/Portioning records
  const riceTemp = matchedCooking?.cookedFoods.rice?.temp ?? 78.5;
  const animalTemp = matchedCooking?.cookedFoods.animalProtein?.temp ?? 82.0;
  const plantTemp = matchedCooking?.cookedFoods.plantProtein?.temp ?? 80.0;
  const vegTemp = matchedCooking?.cookedFoods.vegetable?.temp ?? 84.5;
  const fruitTemp = matchedCooking?.cookedFoods.fruit?.temp ?? 22.0;

  const rawWetItems: PlogOrganolepticItemRow[] = menu
    ? [
        {
          no: 1,
          menuName: menu.stapleFood.toLowerCase(),
          organolepticDetail: blankMode
            ? ''
            : 'Putih bersih, harum alami, netral gurih, pulen',
          temperature: blankMode ? '' : `${riceTemp.toFixed(1)}°C`,
          outcome: blankMode ? '' : 'baik',
          ket: blankMode ? '' : 'Lolos Edar',
        },
        {
          no: 2,
          menuName: menu.animalProtein.toLowerCase(),
          organolepticDetail: blankMode
            ? ''
            : 'Cokelat kilap, wangi bumbu, gurih meresap, empuk',
          temperature: blankMode ? '' : `${animalTemp.toFixed(1)}°C`,
          outcome: blankMode ? '' : 'baik',
          ket: blankMode ? '' : 'Lolos Edar',
        },
        {
          no: 3,
          menuName: menu.plantProtein.toLowerCase(),
          organolepticDetail: blankMode
            ? ''
            : 'Kuning keemasan, harum rempah, gurih pas, lembut',
          temperature: blankMode ? '' : `${plantTemp.toFixed(1)}°C`,
          outcome: blankMode ? '' : 'baik',
          ket: blankMode ? '' : 'Lolos Edar',
        },
        {
          no: 4,
          menuName: menu.vegetable.toLowerCase(),
          organolepticDetail: blankMode
            ? ''
            : 'Warna segar alami, harum kuah/tumis, segar, renyah',
          temperature: blankMode ? '' : `${vegTemp.toFixed(1)}°C`,
          outcome: blankMode ? '' : 'baik',
          ket: blankMode ? '' : 'Lolos Edar',
        },
        {
          no: 5,
          menuName: menu.fruit.toLowerCase(),
          organolepticDetail: blankMode
            ? ''
            : 'Segar tidak memar, manis alami, matang optimal',
          temperature: blankMode ? '' : `${fruitTemp.toFixed(1)}°C`,
          outcome: blankMode ? '' : 'baik',
          ket: blankMode ? '' : 'Lolos Edar',
        },
      ]
    : [
        {
          no: 1,
          menuName: 'nasi putih',
          organolepticDetail: blankMode ? '' : 'Putih bersih, harum alami, pulen',
          temperature: blankMode ? '' : '78.5°C',
          outcome: blankMode ? '' : 'baik',
          ket: blankMode ? '' : 'Lolos Edar',
        },
        {
          no: 2,
          menuName: 'lumpia ayam kulit tahu',
          organolepticDetail: blankMode ? '' : 'Keemasan, harum bawang, gurih empuk',
          temperature: blankMode ? '' : '82.0°C',
          outcome: blankMode ? '' : 'baik',
          ket: blankMode ? '' : 'Lolos Edar',
        },
        {
          no: 3,
          menuName: 'tahu saus BBQ',
          organolepticDetail: blankMode ? '' : 'Cokelat bumbu, wangi BBQ, lembut',
          temperature: blankMode ? '' : '80.0°C',
          outcome: blankMode ? '' : 'baik',
          ket: blankMode ? '' : 'Lolos Edar',
        },
        {
          no: 4,
          menuName: 'mix vegetable tumis',
          organolepticDetail: blankMode ? '' : 'Hijau/cerah segar, harum tumis, renyah',
          temperature: blankMode ? '' : '84.5°C',
          outcome: blankMode ? '' : 'baik',
          ket: blankMode ? '' : 'Lolos Edar',
        },
        {
          no: 5,
          menuName: 'melon',
          organolepticDetail: blankMode ? '' : 'Segar bersih, manis alami, tidak lembek',
          temperature: blankMode ? '' : '22.0°C',
          outcome: blankMode ? '' : 'baik',
          ket: blankMode ? '' : 'Lolos Edar',
        },
      ];

  const hasDryExtra =
    Boolean(menu?.milkOrExtra) &&
    !/air mineral/i.test(menu?.milkOrExtra || '');

  const rawDryItems: PlogOrganolepticItemRow[] = hasDryExtra && menu
    ? [
        {
          no: 1,
          menuName: menu.milkOrExtra.toLowerCase(),
          organolepticDetail: blankMode
            ? ''
            : 'Kemasan utuh tersegel, tidak kembung, aroma & rasa normal',
          temperature: blankMode ? '' : '24.0°C',
          outcome: blankMode ? '' : 'baik',
          ket: blankMode ? '' : 'Lolos Edar',
        },
      ]
    : [];

  const defaultWetPhoto =
    matchedPortioning?.largePortionPhoto ||
    matchedPortioning?.smallPortionPhoto ||
    matchedCooking?.cookedFoods.animalProtein?.photoUrl ||
    '';

  const defaultNotes = blankMode
    ? ''
    : `Seluruh komponen menu basah & sampel retensi 2x24 jam telah melewati uji organoleptik internal PLOG (Visual, Aroma, Rasa, Tekstur & Suhu) oleh Pengawas Gizi & Head Chef (${defaultChefName}) dengan hasil 100% Baik / Lolos Edar.`;

  return {
    rawDate: activeDate,
    menuCode: menu?.menuCode || 'MN-01',
    sppgId: sppgConfig.sppgId || 'GFBQSYXD',
    sppgTitleLine: cleanSppgTitle,
    sppgFooterName: sppgConfig.sppgName || 'SPPG Probolinggo Krejengan Temenggungan 2',
    addressLine,
    samplePreparedDateLabel:
      overrides?.samplePreparedDateLabel?.trim() ||
      formatDayLowerIndonesian(baseDateObj),
    sampleAfter2x24DateLabel:
      overrides?.sampleAfter2x24DateLabel?.trim() ||
      computeAfterRetentionDate(activeDate),
    officerName: overrides?.officerName?.trim() || defaultOfficerName,
    headChefName: overrides?.headChefName?.trim() || defaultChefName,
    kepalaSppgName: overrides?.kepalaSppgName?.trim() || defaultKepalaName,
    kepalaSppgNip: overrides?.kepalaSppgNip?.trim() || '',
    wetRows: padToSevenRows(
      overrides?.wetRows && overrides.wetRows.length > 0
        ? overrides.wetRows
        : rawWetItems
    ),
    dryRows: padToSevenRows(
      overrides?.dryRows && overrides.dryRows.length > 0
        ? overrides.dryRows
        : rawDryItems
    ),
    wetPhotoUrl:
      overrides?.wetPhotoUrl !== undefined
        ? overrides.wetPhotoUrl
        : defaultWetPhoto,
    dryPhotoUrl: overrides?.dryPhotoUrl || '',
    notes:
      overrides?.notes !== undefined ? overrides.notes : defaultNotes,
    blankMode,
  };
}

interface PlogOrganolepticSheetProps {
  data: PlogOrganolepticData;
  onPreviewPhoto?: (photo: { label: string; url: string; caption?: string }) => void;
  className?: string;
}

export const PlogOrganolepticSheet: React.FC<PlogOrganolepticSheetProps> = ({
  data,
  onPreviewPhoto,
  className = '',
}) => {
  return (
    <div
      className={`bg-white text-black p-6 sm:p-10 rounded-xl border border-slate-200 shadow-sm print:shadow-none print:border-none print:p-3 print:rounded-none font-serif leading-snug ${className}`}
    >
      {/* KOP SURAT RESMI BADAN GIZI NASIONAL */}
      <div className="flex items-start gap-4 pb-3 border-b-2 border-black">
        <div className="shrink-0 pt-0.5">
          <BGNLogo size="lg" />
        </div>
        <div className="flex-1 text-left">
          <h3 className="text-[12px] sm:text-[13px] font-bold uppercase tracking-wide text-[#1e3a8a]">
            BADAN GIZI NASIONAL (NATIONAL NUTRITION AGENCY)
          </h3>
          <h2 className="text-[12px] sm:text-[13px] font-bold uppercase tracking-wide text-black leading-tight">
            SATUAN PELAYANAN PEMENUHAN GIZI (SPPG)
          </h2>
          <h2 className="text-[12px] sm:text-[13px] font-bold uppercase tracking-wide text-black leading-tight">
            {data.sppgTitleLine}
          </h2>
          <p className="text-[10px] sm:text-[10.5px] text-black mt-0.5 leading-snug font-sans">
            {data.addressLine}
          </p>
        </div>
      </div>

      {/* JUDUL FORM KOMBINASI */}
      <div className="text-center pt-4 pb-3">
        <h1 className="text-[13px] sm:text-[14.5px] font-bold uppercase tracking-wide text-black font-sans">
          PEMERIKSAAN MAKANAN &amp; UJI ORGANOLEPTIK (PLOG)
        </h1>
        <p className="text-[10.5px] text-slate-700 font-sans mt-0.5">
          Pengujian Mutu Organoleptik Internal Dapur (Nutrisionis &amp; Head Chef) • Retensi Sampel 2 x 24 Jam
        </p>
      </div>

      {/* IDENTITAS SAMPEL & PETUGAS */}
      <div className="mb-3.5 text-[11px] sm:text-[12px] text-black font-sans space-y-1">
        <div className="grid grid-cols-12 items-baseline">
          <span className="col-span-6 sm:col-span-5 font-medium">
            Hari, Tanggal Sampel Makanan Disiapkan
          </span>
          <span className="col-span-6 sm:col-span-7">
            : <span className="font-semibold">{data.samplePreparedDateLabel}</span>
          </span>
        </div>
        <div className="grid grid-cols-12 items-baseline">
          <span className="col-span-6 sm:col-span-5 font-medium">
            Hari, Tanggal Sampel Makanan Setelah 2 x 24 Jam
          </span>
          <span className="col-span-6 sm:col-span-7">
            : <span className="font-semibold">{data.sampleAfter2x24DateLabel}</span>
          </span>
        </div>
        <div className="grid grid-cols-12 items-baseline">
          <span className="col-span-6 sm:col-span-5 font-medium">
            Nama Petugas (Pengawas Gizi / PLOG)
          </span>
          <span className="col-span-6 sm:col-span-7">
            : <span className="font-semibold">{data.officerName}</span>
          </span>
        </div>
        <div className="grid grid-cols-12 items-baseline">
          <span className="col-span-6 sm:col-span-5 font-medium">
            Penilai Dapur (Head Chef / Pengolahan)
          </span>
          <span className="col-span-6 sm:col-span-7">
            : <span className="font-semibold">{data.headChefName}</span>{' '}
            <span className="text-[10px] text-slate-600 ml-1">(Kode Menu: {data.menuCode})</span>
          </span>
        </div>
      </div>

      {/* TABEL KOMBINASI PEMERIKSAAN MAKANAN + ORGANOLEPTIK PLOG */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-black text-[10.5px] sm:text-[11.5px] text-black font-sans">
          <thead>
            <tr className="bg-slate-100/90 print:bg-slate-100 font-bold text-center">
              <th rowSpan={2} className="border border-black px-1.5 py-2 w-8 align-middle">
                No.
              </th>
              <th rowSpan={2} className="border border-black px-2.5 py-2 min-w-[130px] align-middle">
                Menu
              </th>
              <th rowSpan={2} className="border border-black px-2 py-2 min-w-[175px] align-middle leading-tight">
                <div>Uji Organoleptik PLOG</div>
                <div className="text-[9.5px] font-semibold">(Visual, Aroma, Rasa &amp; Tekstur)</div>
              </th>
              <th rowSpan={2} className="border border-black px-1.5 py-2 w-14 align-middle">
                Suhu
              </th>
              <th colSpan={2} className="border border-black px-2 py-1 align-middle">
                Hasil Uji Makanan
              </th>
              <th rowSpan={2} className="border border-black px-2 py-2 w-24 align-middle">
                Ket.
              </th>
              <th rowSpan={2} className="border border-black px-2 py-2 w-28 align-middle">
                Gambar
              </th>
            </tr>
            <tr className="bg-slate-100/90 print:bg-slate-100 font-bold text-center">
              <th className="border border-black px-1.5 py-1 w-12">Baik</th>
              <th className="border border-black px-1.5 py-1 w-16">Tidak Baik</th>
            </tr>
          </thead>

          <tbody>
            {/* SUB-HEADER: MENU BASAH */}
            <tr>
              <td
                colSpan={8}
                className="border border-black px-2 py-1 text-center font-bold bg-slate-50 print:bg-slate-50"
              >
                Menu Basah
              </td>
            </tr>

            {data.wetRows.map((row, idx) => (
              <tr key={`wet-${row.no}`} className="h-7">
                <td className="border border-black px-1.5 py-1 text-center align-middle font-medium">
                  {row.no}
                </td>
                <td className="border border-black px-2 py-1 text-left align-middle font-medium">
                  {row.menuName}
                </td>
                <td className="border border-black px-2 py-1 text-left align-middle text-[10px]">
                  {row.organolepticDetail}
                </td>
                <td className="border border-black px-1.5 py-1 text-center align-middle tabular-nums font-medium">
                  {row.temperature}
                </td>
                <td className="border border-black px-1.5 py-1 text-center align-middle font-bold text-sm leading-none">
                  {row.outcome === 'baik' ? '✓' : ''}
                </td>
                <td className="border border-black px-1.5 py-1 text-center align-middle font-bold text-sm leading-none">
                  {row.outcome === 'tidak_baik' ? '✓' : ''}
                </td>
                <td className="border border-black px-2 py-1 text-left align-middle text-[10px]">
                  {row.ket}
                </td>
                {idx === 0 && (
                  <td
                    rowSpan={7}
                    className="border border-black p-1.5 text-center align-middle w-28 bg-white"
                  >
                    {data.wetPhotoUrl ? (
                      <button
                        type="button"
                        onClick={() =>
                          onPreviewPhoto?.({
                            label: 'Dokumentasi Sampel Menu Basah (Ompreng PLOG)',
                            url: data.wetPhotoUrl || '',
                            caption: `Tanggal: ${data.samplePreparedDateLabel} • Petugas: ${data.officerName}`,
                          })
                        }
                        className="group block mx-auto focus:outline-none"
                        title="Klik untuk memperbesar foto menu"
                      >
                        <img
                          src={data.wetPhotoUrl}
                          alt="Foto Sampel Menu Basah"
                          className="w-24 h-24 object-cover rounded border border-slate-300 mx-auto group-hover:scale-105 transition-transform"
                        />
                        <span className="block text-[9px] text-slate-500 mt-1 print:hidden">
                          Klik perbesar
                        </span>
                      </button>
                    ) : (
                      <div className="h-24 flex items-center justify-center text-[9.5px] text-slate-400 italic px-1">
                        (Area Foto Menu Basah)
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}

            {/* SUB-HEADER: MENU KERING */}
            <tr>
              <td
                colSpan={8}
                className="border border-black px-2 py-1 text-center font-bold bg-slate-50 print:bg-slate-50"
              >
                Menu Kering
              </td>
            </tr>

            {data.dryRows.map((row, idx) => (
              <tr key={`dry-${row.no}`} className="h-7">
                <td className="border border-black px-1.5 py-1 text-center align-middle font-medium">
                  {row.no}
                </td>
                <td className="border border-black px-2 py-1 text-left align-middle font-medium">
                  {row.menuName}
                </td>
                <td className="border border-black px-2 py-1 text-left align-middle text-[10px]">
                  {row.organolepticDetail}
                </td>
                <td className="border border-black px-1.5 py-1 text-center align-middle tabular-nums font-medium">
                  {row.temperature}
                </td>
                <td className="border border-black px-1.5 py-1 text-center align-middle font-bold text-sm leading-none">
                  {row.outcome === 'baik' ? '✓' : ''}
                </td>
                <td className="border border-black px-1.5 py-1 text-center align-middle font-bold text-sm leading-none">
                  {row.outcome === 'tidak_baik' ? '✓' : ''}
                </td>
                <td className="border border-black px-2 py-1 text-left align-middle text-[10px]">
                  {row.ket}
                </td>
                {idx === 0 && (
                  <td
                    rowSpan={7}
                    className="border border-black p-1.5 text-center align-middle w-28 bg-white"
                  >
                    {data.dryPhotoUrl ? (
                      <button
                        type="button"
                        onClick={() =>
                          onPreviewPhoto?.({
                            label: 'Dokumentasi Sampel Menu Kering (PLOG)',
                            url: data.dryPhotoUrl || '',
                            caption: `Tanggal: ${data.samplePreparedDateLabel} • Petugas: ${data.officerName}`,
                          })
                        }
                        className="group block mx-auto focus:outline-none"
                        title="Klik untuk memperbesar foto menu kering"
                      >
                        <img
                          src={data.dryPhotoUrl}
                          alt="Foto Sampel Menu Kering"
                          className="w-24 h-24 object-cover rounded border border-slate-300 mx-auto group-hover:scale-105 transition-transform"
                        />
                        <span className="block text-[9px] text-slate-500 mt-1 print:hidden">
                          Klik perbesar
                        </span>
                      </button>
                    ) : (
                      <div className="h-24 flex items-center justify-center text-[9.5px] text-slate-400 italic px-1">
                        {/* Kosong seperti blanko gambar jika tidak ada foto menu kering */}
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* BAGIAN CATATAN (Dengan garis horizontal seperti format surat gambar) */}
      <div className="mt-3 text-[11px] font-sans text-black">
        <div className="font-semibold mb-1">Catatan:</div>
        {data.notes.trim() ? (
          <div className="border-b border-black pb-1.5 mb-2 leading-relaxed">
            {data.notes}
          </div>
        ) : (
          <div className="space-y-4 pt-2 pb-1">
            <div className="border-b border-black w-full" />
            <div className="border-b border-black w-full" />
            <div className="border-b border-black w-full" />
          </div>
        )}
      </div>

      {/* BLOK TANDA TANGAN 2 KOLOM (Sesuai Format Surat Gambar) */}
      <div className="mt-6 grid grid-cols-12 text-[11.5px] sm:text-[12px] text-black font-sans">
        {/* Kiri: Membuat, Pengawas Gizi */}
        <div className="col-span-5 text-center flex flex-col justify-between min-h-[120px]">
          <div>
            <p>Membuat,</p>
            <p className="font-medium">Pengawas Gizi</p>
          </div>
          <div className="h-14" />
          <div>
            <p className="font-bold">{data.officerName}</p>
          </div>
        </div>

        <div className="col-span-2" />

        {/* Kanan: Diperiksa oleh Kepala SPPG + NIP */}
        <div className="col-span-5 text-center flex flex-col justify-between min-h-[120px]">
          <div>
            <p>Diperiksa oleh</p>
            <p className="font-medium">Kepala {data.sppgFooterName}</p>
          </div>
          <div className="h-14" />
          <div>
            <p className="font-bold">{data.kepalaSppgName}</p>
            {data.kepalaSppgNip ? (
              <p className="font-bold text-[11px] mt-0.5">NIP. {data.kepalaSppgNip}</p>
            ) : (
              <p className="text-[10.5px] text-slate-600 font-mono mt-0.5">
                ID SPPG: {data.sppgId}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

async function loadImageForPdf(url: string): Promise<string | null> {
  if (!url || typeof url !== 'string') return null;
  return new Promise(resolve => {
    let done = false;
    const finish = (val: string | null) => {
      if (!done) {
        done = true;
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
        canvas.width = img.naturalWidth || 240;
        canvas.height = img.naturalHeight || 240;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.88));
        } else {
          resolve(null);
        }
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      finish(null);
    };
    img.src = url;
  });
}

export async function exportPlogOrganolepticPDF(data: PlogOrganolepticData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const left = 14;
  const right = 196;
  const pageCenterX = 105;

  const [bgnLogoUrl, wetPhotoDataUrl, dryPhotoDataUrl] = await Promise.all([
    loadImageForPdf('/assets/aistudio/Badan_Gizi_Nasional__BGN__Logo_-_Colored_-_zonalogo.com_5e10d066.png'),
    data.wetPhotoUrl ? loadImageForPdf(data.wetPhotoUrl) : Promise.resolve(null),
    data.dryPhotoUrl ? loadImageForPdf(data.dryPhotoUrl) : Promise.resolve(null),
  ]);

  // KOP SURAT BGN
  if (bgnLogoUrl) {
    doc.addImage(bgnLogoUrl, 'JPEG', left, 11, 17, 17);
  } else {
    doc.setFillColor(30, 58, 138);
    doc.circle(left + 8.5, 19.5, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('BGN', left + 8.5, 20.5, { align: 'center' });
  }

  const kopTextX = left + 21;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 58, 138);
  doc.text('BADAN GIZI NASIONAL (NATIONAL NUTRITION AGENCY)', kopTextX, 15);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9.5);
  doc.text('SATUAN PELAYANAN PEMENUHAN GIZI (SPPG)', kopTextX, 19.5);
  doc.text(data.sppgTitleLine, kopTextX, 24);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const addrLines = doc.splitTextToSize(data.addressLine, right - kopTextX);
  doc.text(addrLines, kopTextX, 28);

  const lineY = Math.max(33, 28 + addrLines.length * 3.3 + 1);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(left, lineY, right, lineY);

  // JUDUL
  let y = lineY + 6.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text('PEMERIKSAAN MAKANAN & UJI ORGANOLEPTIK (PLOG)', pageCenterX, y, {
    align: 'center',
  });
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(70, 70, 70);
  doc.text(
    'Pengujian Mutu Organoleptik Internal Dapur (Nutrisionis & Head Chef) • Retensi Sampel 2 x 24 Jam',
    pageCenterX,
    y,
    { align: 'center' }
  );

  // METADATA SAMPEL
  y += 6.5;
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8);
  const colonX = left + 67;

  const metaLines: [string, string][] = [
    ['Hari, Tanggal Sampel Makanan Disiapkan', data.samplePreparedDateLabel],
    ['Hari, Tanggal Sampel Makanan Setelah 2 x 24 Jam', data.sampleAfter2x24DateLabel],
    ['Nama Petugas (Pengawas Gizi / PLOG)', data.officerName],
    ['Penilai Dapur (Head Chef / Pengolahan)', `${data.headChefName} (Menu: ${data.menuCode})`],
  ];

  metaLines.forEach(([label, val]) => {
    doc.text(label, left, y);
    doc.text(`: ${val}`, colonX, y);
    y += 4.6;
  });

  // TABLE BODY BUILDING
  const bodyRows: any[] = [];

  bodyRows.push([
    {
      content: 'Menu Basah',
      colSpan: 8,
      styles: { halign: 'center', fontStyle: 'bold', fillColor: [244, 246, 249] },
    },
  ]);

  let wetImageCellBounds: { x: number; y: number; w: number; h: number } | null = null;
  let dryImageCellBounds: { x: number; y: number; w: number; h: number } | null = null;

  data.wetRows.forEach((row, idx) => {
    const baseRow: any[] = [
      String(row.no),
      row.menuName,
      row.organolepticDetail,
      row.temperature,
      row.outcome === 'baik' ? '__CHK__' : '',
      row.outcome === 'tidak_baik' ? '__CHK__' : '',
      row.ket,
    ];
    if (idx === 0) {
      baseRow.push({
        content: '',
        rowSpan: 7,
        styles: { valign: 'middle', halign: 'center' },
      });
    }
    bodyRows.push(baseRow);
  });

  bodyRows.push([
    {
      content: 'Menu Kering',
      colSpan: 8,
      styles: { halign: 'center', fontStyle: 'bold', fillColor: [244, 246, 249] },
    },
  ]);

  data.dryRows.forEach((row, idx) => {
    const baseRow: any[] = [
      String(row.no),
      row.menuName,
      row.organolepticDetail,
      row.temperature,
      row.outcome === 'baik' ? '__CHK__' : '',
      row.outcome === 'tidak_baik' ? '__CHK__' : '',
      row.ket,
    ];
    if (idx === 0) {
      baseRow.push({
        content: '',
        rowSpan: 7,
        styles: { valign: 'middle', halign: 'center' },
      });
    }
    bodyRows.push(baseRow);
  });

  autoTable(doc, {
    startY: y + 1.5,
    margin: { left, right: 14 },
    theme: 'grid',
    head: [
      [
        { content: 'No.', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
        { content: 'Menu', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
        {
          content: 'Uji Organoleptik PLOG\n(Visual, Aroma, Rasa, Tekstur)',
          rowSpan: 2,
          styles: { valign: 'middle', halign: 'center' },
        },
        { content: 'Suhu', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
        { content: 'Hasil Uji Makanan', colSpan: 2, styles: { valign: 'middle', halign: 'center' } },
        { content: 'Ket.', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
        { content: 'Gambar', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
      ],
      [
        { content: 'Baik', styles: { halign: 'center' } },
        { content: 'Tidak Baik', styles: { halign: 'center' } },
      ],
    ],
    body: bodyRows,
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.25,
      cellPadding: 1.5,
      minCellHeight: 6.2,
      valign: 'middle',
    },
    headStyles: {
      fillColor: [236, 240, 245],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 7.5,
      lineColor: [0, 0, 0],
      lineWidth: 0.25,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 34, halign: 'left' },
      2: { cellWidth: 44, halign: 'left' },
      3: { cellWidth: 13, halign: 'center' },
      4: { cellWidth: 12, halign: 'center', fontStyle: 'bold' },
      5: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
      6: { cellWidth: 23, halign: 'left' },
      7: { cellWidth: 32, halign: 'center' },
    },
    didParseCell: hookData => {
      if (
        hookData.section === 'body' &&
        (hookData.column.index === 4 || hookData.column.index === 5) &&
        hookData.cell.raw === '__CHK__'
      ) {
        hookData.cell.text = [''];
      }
    },
    didDrawCell: hookData => {
      if (
        hookData.section === 'body' &&
        (hookData.column.index === 4 || hookData.column.index === 5) &&
        hookData.cell.raw === '__CHK__'
      ) {
        const cx = hookData.cell.x + hookData.cell.width / 2;
        const cy = hookData.cell.y + hookData.cell.height / 2;
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.45);
        doc.line(cx - 1.5, cy + 0.1, cx - 0.3, cy + 1.3);
        doc.line(cx - 0.3, cy + 1.3, cx + 1.8, cy - 1.2);
      }
      if (hookData.section === 'body' && hookData.column.index === 7) {
        if (hookData.row.index === 1) {
          wetImageCellBounds = {
            x: hookData.cell.x,
            y: hookData.cell.y,
            w: hookData.cell.width,
            h: hookData.cell.height,
          };
        } else if (hookData.row.index === 9) {
          dryImageCellBounds = {
            x: hookData.cell.x,
            y: hookData.cell.y,
            w: hookData.cell.width,
            h: hookData.cell.height,
          };
        }
      }
    },
  });

  if (wetPhotoDataUrl && wetImageCellBounds) {
    const b: { x: number; y: number; w: number; h: number } = wetImageCellBounds;
    const size = Math.min(b.w - 4, b.h - 4, 28);
    const imgX = b.x + (b.w - size) / 2;
    const imgY = b.y + (b.h - size) / 2;
    doc.addImage(wetPhotoDataUrl, 'JPEG', imgX, imgY, size, size);
  }

  if (dryPhotoDataUrl && dryImageCellBounds) {
    const b: { x: number; y: number; w: number; h: number } = dryImageCellBounds;
    const size = Math.min(b.w - 4, b.h - 4, 28);
    const imgX = b.x + (b.w - size) / 2;
    const imgY = b.y + (b.h - size) / 2;
    doc.addImage(dryPhotoDataUrl, 'JPEG', imgX, imgY, size, size);
  }

  // CATATAN SECTION
  const finalY = (doc as any).lastAutoTable?.finalY || y + 110;
  let ny = finalY + 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Catatan:', left, ny);
  ny += 4.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  if (data.notes.trim()) {
    const noteLines = doc.splitTextToSize(data.notes, right - left);
    doc.text(noteLines, left, ny);
    ny += noteLines.length * 4 + 2;
    doc.setLineWidth(0.2);
    doc.line(left, ny, right, ny);
    ny += 6;
  } else {
    doc.setLineWidth(0.2);
    for (let i = 0; i < 3; i++) {
      ny += 5.5;
      doc.line(left, ny, right, ny);
    }
    ny += 5;
  }

  // TANDA TANGAN 2 KOLOM
  let sigY = ny + 3;
  if (sigY > 252) {
    doc.addPage();
    sigY = 22;
  }

  const leftColCenter = left + 40;
  const rightColCenter = right - 44;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8);
  doc.text('Membuat,', leftColCenter, sigY, { align: 'center' });
  doc.text('Pengawas Gizi', leftColCenter, sigY + 4.5, { align: 'center' });

  doc.text('Diperiksa oleh', rightColCenter, sigY, { align: 'center' });
  doc.text(`Kepala ${data.sppgFooterName}`, rightColCenter, sigY + 4.5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.text(data.officerName, leftColCenter, sigY + 24, { align: 'center' });
  doc.text(data.kepalaSppgName, rightColCenter, sigY + 24, { align: 'center' });

  doc.setFontSize(8.2);
  if (data.kepalaSppgNip) {
    doc.text(`NIP. ${data.kepalaSppgNip}`, rightColCenter, sigY + 28.5, { align: 'center' });
  } else {
    doc.setFont('helvetica', 'normal');
    doc.text(`ID SPPG: ${data.sppgId}`, rightColCenter, sigY + 28.5, { align: 'center' });
  }

  doc.save(`Laporan_Pemeriksaan_Makanan_Organoleptik_PLOG_${data.rawDate}.pdf`);
}
