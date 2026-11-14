import React from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BGNLogo } from './OfficialLogos';
import {
  FACILITY_TEMP_UNITS,
  FacilityTempUnitConfig,
  getFacilityTempValue,
  getFacilityHumidityValue,
  getFacilityPhotoUrl,
} from './FacilityTempUploadSection';
import { parseLocalDate } from '../../lib/exportUtils';
import {
  PreparationInspectionRecord,
  CookingInspectionRecord,
  PortioningInspectionRecord,
  SPPGConfig,
} from '../../types';

export interface RoomTempShiftReading {
  jam: string;
  suhuHasil: string;
  kelembapanHasil: string;
  photoUrl?: string;
  officerName?: string;
}

export interface RoomTempChecklistRow {
  isoDate: string;
  tanggalDisplay: string;
  batasKritisSuhu: string;
  batasKritisKelembapan: string;
  shift1: RoomTempShiftReading; // Divisi Persiapan
  shift2: RoomTempShiftReading; // Divisi Pengolahan
  shift3: RoomTempShiftReading; // Divisi Pemorsian
  keterangan: string;
}

export interface RoomTempChecklistData {
  unit: FacilityTempUnitConfig;
  unitUpperTitle: string;
  periodeLabel: string;
  sppgTitleLine: string;
  addressLine: string;
  rows: RoomTempChecklistRow[];
}

function stripWib(timeStr?: string): string {
  if (!timeStr) return '-';
  const cleaned = timeStr.replace(/\s*WIB\s*$/i, '').trim();
  return cleaned || '-';
}

function formatDdMmYyyy(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  if (!d) return dateStr;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatCommaDecimal(val: number): string {
  return val.toFixed(1).replace('.', ',');
}

function formatPeriodeRange(dates: string[], fallbackStart?: string, fallbackEnd?: string): string {
  const validDates = dates.length > 0 ? [...dates].sort() : [fallbackStart || '', fallbackEnd || ''].filter(Boolean);
  if (validDates.length === 0) return '-';
  const first = parseLocalDate(validDates[0]);
  const last = parseLocalDate(validDates[validDates.length - 1]);
  if (!first || !last) return validDates.join(' - ');

  const monthFmt = new Intl.DateTimeFormat('id-ID', { month: 'long' });
  const d1 = first.getDate();
  const m1 = monthFmt.format(first);
  const y1 = first.getFullYear();
  const d2 = last.getDate();
  const m2 = monthFmt.format(last);
  const y2 = last.getFullYear();

  if (y1 === y2 && m1 === m2) {
    if (d1 === d2) return `${d1} ${m1} ${y1}`;
    return `${d1} - ${d2} ${m1} ${y1}`;
  }
  return `${d1} ${m1} ${y1} - ${d2} ${m2} ${y2}`;
}

function getHeadingUnitTitle(unit: FacilityTempUnitConfig): string {
  const clean = unit.label.replace(/^Ruang\s+/i, '').trim().toUpperCase();
  if (/GUDANG|PEMORSIAN|PENGOLAHAN/i.test(clean)) {
    return clean;
  }
  return `UNIT ${clean}`;
}

export interface ResolveRoomTempChecklistParams {
  unitId: string;
  prepRecords: PreparationInspectionRecord[];
  cookingRecords: CookingInspectionRecord[];
  portioningRecords: PortioningInspectionRecord[];
  sppgConfig: SPPGConfig;
  startDate?: string;
  endDate?: string;
  periodType?: 'harian' | 'mingguan' | 'bulanan' | 'periode';
  notesByDate?: Record<string, string>;
}

export function resolveRoomTempChecklistData(
  params: ResolveRoomTempChecklistParams
): RoomTempChecklistData {
  const {
    unitId,
    prepRecords,
    cookingRecords,
    portioningRecords,
    sppgConfig,
    startDate,
    endDate,
    periodType,
    notesByDate = {},
  } = params;

  const unit =
    FACILITY_TEMP_UNITS.find(u => u.id === unitId) ||
    FACILITY_TEMP_UNITS.find(u => u.id === 'wet-warehouse') ||
    FACILITY_TEMP_UNITS[0];

  const dateSet = new Set<string>();
  prepRecords.forEach(r => r.date && dateSet.add(r.date));
  cookingRecords.forEach(r => r.date && dateSet.add(r.date));
  portioningRecords.forEach(r => r.date && dateSet.add(r.date));

  let sortedDates = Array.from(dateSet).sort();
  if (periodType === 'periode' && startDate && endDate) {
    const filtered = sortedDates.filter(d => d >= startDate && d <= endDate);
    if (filtered.length > 0) sortedDates = filtered;
  }

  const batasSuhuClean = unit.standard.replace(/°C/g, '').trim();
  const batasKelembapan = unit.id.startsWith('freezer') ? '40-50%' : '40-60%';

  const rows: RoomTempChecklistRow[] = sortedDates.map(isoDate => {
    const prepRec = prepRecords.find(r => r.date === isoDate);
    const cookRec = cookingRecords.find(r => r.date === isoDate);
    const portRec = portioningRecords.find(r => r.date === isoDate);

    const makeReading = (
      rec: PreparationInspectionRecord | CookingInspectionRecord | PortioningInspectionRecord | undefined
    ): RoomTempShiftReading => {
      if (!rec) {
        return {
          jam: '-',
          suhuHasil: '-',
          kelembapanHasil: '-',
          photoUrl: undefined,
        };
      }
      const tempVal = getFacilityTempValue(rec.facilityTemps, unit.tempKey);
      const humVal = getFacilityHumidityValue(rec.facilityTemps, unit.tempKey);
      const photoUrl = getFacilityPhotoUrl(rec.facilityTemps, unit.photoKey);
      return {
        jam: stripWib(rec.time),
        suhuHasil: formatCommaDecimal(tempVal),
        kelembapanHasil: `${humVal}%`,
        photoUrl,
        officerName: rec.officerName,
      };
    };

    return {
      isoDate,
      tanggalDisplay: formatDdMmYyyy(isoDate),
      batasKritisSuhu: batasSuhuClean,
      batasKritisKelembapan: batasKelembapan,
      shift1: makeReading(prepRec),
      shift2: makeReading(cookRec),
      shift3: makeReading(portRec),
      keterangan: notesByDate[isoDate] ?? '',
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
    unit,
    unitUpperTitle: getHeadingUnitTitle(unit),
    periodeLabel: formatPeriodeRange(sortedDates, startDate, endDate),
    sppgTitleLine: cleanSppgTitle,
    addressLine,
    rows,
  };
}

interface RoomTempChecklistSheetProps {
  data: RoomTempChecklistData;
  onPreviewPhoto?: (info: { label: string; url: string; caption?: string }) => void;
  className?: string;
}

export const RoomTempChecklistSheet: React.FC<RoomTempChecklistSheetProps> = ({
  data,
  onPreviewPhoto,
  className = '',
}) => {
  const renderShiftPhotoCell = (
    shiftLabel: string,
    divisionName: string,
    row: RoomTempChecklistRow,
    reading: RoomTempShiftReading
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
            label: `${data.unit.label} — ${shiftLabel} (${divisionName})`,
            url: reading.photoUrl!,
            caption: `Tanggal: ${row.tanggalDisplay} • Jam: ${reading.jam} • Suhu: ${reading.suhuHasil}°C • Kelembapan: ${reading.kelembapanHasil}${
              reading.officerName ? ` • Petugas: ${reading.officerName}` : ''
            }`,
          })
        }
        title={`Klik untuk perbesar bukti foto ${divisionName}`}
        className="w-full flex flex-col items-center justify-center p-0.5 hover:bg-blue-50/60 transition cursor-pointer group"
      >
        <img
          src={reading.photoUrl}
          alt={`${data.unit.label} ${shiftLabel}`}
          className="w-16 h-14 object-cover border border-slate-300 print:border-slate-500 group-hover:scale-[1.03] transition"
        />
      </button>
    );
  };

  return (
    <div
      className={`bg-white text-black p-5 sm:p-7 rounded-xl border border-slate-200 shadow-sm print:shadow-none print:border-none print:p-2 print:rounded-none font-serif leading-tight ${className}`}
    >
      {/* KOP SURAT BGN + IDENTITAS SPPG */}
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
          <p className="text-[9.5px] sm:text-[10.5px] text-black mt-0.5 font-sans">
            {data.addressLine}
          </p>
        </div>
      </div>

      {/* JUDUL CHECK LIST */}
      <div className="text-center pb-2">
        <h1 className="text-[12px] sm:text-[13.5px] font-bold uppercase tracking-wide text-black">
          CHECK LIST PEMANTAUAN SUHU &amp; KELEMBAPAN {data.unitUpperTitle}
        </h1>
      </div>

      {/* PERIODE */}
      <div className="mb-1.5 text-[10.5px] sm:text-[11.5px] font-bold text-black">
        PERIODE : <span className="font-semibold">{data.periodeLabel}</span>
      </div>

      {/* TABEL 19 KOLOM 3-LEVEL MERGED HEADER */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-black text-[9.5px] sm:text-[10.5px] text-black">
          <thead>
            <tr className="bg-slate-100/90 print:bg-slate-100 font-bold text-center">
              <th rowSpan={3} className="border border-black px-1.5 py-1.5 align-middle whitespace-nowrap">
                TANGGAL
              </th>
              <th rowSpan={3} className="border border-black px-1.5 py-1.5 align-middle leading-tight min-w-[54px]">
                BATAS KRITIS (°C)
              </th>
              <th colSpan={6} className="border border-black px-1 py-1 align-middle">
                SUHU (°C)
              </th>
              <th rowSpan={3} className="border border-black px-1.5 py-1.5 align-middle leading-tight min-w-[54px]">
                BATAS KRITIS
              </th>
              <th colSpan={6} className="border border-black px-1 py-1 align-middle">
                KELEMBAPAN (%)
              </th>
              <th rowSpan={3} className="border border-black px-1.5 py-1.5 align-middle min-w-[68px]">
                KETERANGAN
              </th>
              <th colSpan={3} rowSpan={2} className="border border-black px-1.5 py-1.5 align-middle">
                DOKUMENTASI KEGIATAN
              </th>
            </tr>
            <tr className="bg-slate-100/90 print:bg-slate-100 font-bold text-center text-[8.5px] sm:text-[9px]">
              <th colSpan={2} className="border border-black px-1 py-1 leading-tight">
                Shift 1 Persiapan
                <div className="font-normal">(16.00-00.00)</div>
              </th>
              <th colSpan={2} className="border border-black px-1 py-1 leading-tight">
                Shift 2 Pengolahan
                <div className="font-normal">(00.00-08.00)</div>
              </th>
              <th colSpan={2} className="border border-black px-1 py-1 leading-tight">
                Shift 3 Pemorsian
                <div className="font-normal">(08.00-16.00)</div>
              </th>
              <th colSpan={2} className="border border-black px-1 py-1 leading-tight">
                Shift 1 Persiapan
                <div className="font-normal">(16.00-00.00)</div>
              </th>
              <th colSpan={2} className="border border-black px-1 py-1 leading-tight">
                Shift 2 Pengolahan
                <div className="font-normal">(00.00-08.00)</div>
              </th>
              <th colSpan={2} className="border border-black px-1 py-1 leading-tight">
                Shift 3 Pemorsian
                <div className="font-normal">(08.00-16.00)</div>
              </th>
            </tr>
            <tr className="bg-slate-100/90 print:bg-slate-100 font-bold text-center text-[9px]">
              {/* Suhu Jam/hasil */}
              <th className="border border-black px-1 py-1">Jam</th>
              <th className="border border-black px-1 py-1">hasil</th>
              <th className="border border-black px-1 py-1">Jam</th>
              <th className="border border-black px-1 py-1">hasil</th>
              <th className="border border-black px-1 py-1">Jam</th>
              <th className="border border-black px-1 py-1">hasil</th>
              {/* Kelembapan Jam/hasil */}
              <th className="border border-black px-1 py-1">Jam</th>
              <th className="border border-black px-1 py-1">hasil</th>
              <th className="border border-black px-1 py-1">Jam</th>
              <th className="border border-black px-1 py-1">hasil</th>
              <th className="border border-black px-1 py-1">Jam</th>
              <th className="border border-black px-1 py-1">hasil</th>
              {/* Dokumentasi Shift 1, 2, 3 */}
              <th className="border border-black px-1 py-1 min-w-[66px]">Shift 1</th>
              <th className="border border-black px-1 py-1 min-w-[66px]">Shift 2</th>
              <th className="border border-black px-1 py-1 min-w-[66px]">Shift 3</th>
            </tr>
          </thead>

          <tbody>
            {data.rows.length === 0 ? (
              <tr>
                <td colSpan={19} className="border border-black px-4 py-8 text-center italic text-slate-500">
                  Belum ada catatan inspeksi suhu dari Divisi Persiapan, Pengolahan, maupun Pemorsian.
                </td>
              </tr>
            ) : (
              data.rows.map(row => (
                <tr key={row.isoDate} className="text-center align-middle">
                  <td className="border border-black px-1.5 py-1 font-bold whitespace-nowrap">
                    {row.tanggalDisplay}
                  </td>
                  <td className="border border-black px-1 py-1 font-semibold whitespace-nowrap">
                    {row.batasKritisSuhu}
                  </td>

                  {/* SUHU (°C) */}
                  <td className="border border-black px-1 py-1 whitespace-nowrap">{row.shift1.jam}</td>
                  <td className="border border-black px-1 py-1 font-medium whitespace-nowrap">{row.shift1.suhuHasil}</td>
                  <td className="border border-black px-1 py-1 whitespace-nowrap">{row.shift2.jam}</td>
                  <td className="border border-black px-1 py-1 font-medium whitespace-nowrap">{row.shift2.suhuHasil}</td>
                  <td className="border border-black px-1 py-1 whitespace-nowrap">{row.shift3.jam}</td>
                  <td className="border border-black px-1 py-1 font-medium whitespace-nowrap">{row.shift3.suhuHasil}</td>

                  {/* BATAS KRITIS KELEMBAPAN */}
                  <td className="border border-black px-1 py-1 font-bold whitespace-nowrap">
                    {row.batasKritisKelembapan}
                  </td>

                  {/* KELEMBAPAN (%) */}
                  <td className="border border-black px-1 py-1 whitespace-nowrap">{row.shift1.jam}</td>
                  <td className="border border-black px-1 py-1 font-medium whitespace-nowrap">{row.shift1.kelembapanHasil}</td>
                  <td className="border border-black px-1 py-1 whitespace-nowrap">{row.shift2.jam}</td>
                  <td className="border border-black px-1 py-1 font-medium whitespace-nowrap">{row.shift2.kelembapanHasil}</td>
                  <td className="border border-black px-1 py-1 whitespace-nowrap">{row.shift3.jam}</td>
                  <td className="border border-black px-1 py-1 font-medium whitespace-nowrap">{row.shift3.kelembapanHasil}</td>

                  {/* KETERANGAN */}
                  <td className="border border-black px-1.5 py-1 text-left text-[9.5px]">
                    {row.keterangan}
                  </td>

                  {/* DOKUMENTASI KEGIATAN: Shift 1 (Persiapan), Shift 2 (Pengolahan), Shift 3 (Pemorsian) */}
                  <td className="border border-black p-0.5 align-middle">
                    {renderShiftPhotoCell('Shift 1', 'Divisi Persiapan', row, row.shift1)}
                  </td>
                  <td className="border border-black p-0.5 align-middle">
                    {renderShiftPhotoCell('Shift 2', 'Divisi Pengolahan', row, row.shift2)}
                  </td>
                  <td className="border border-black p-0.5 align-middle">
                    {renderShiftPhotoCell('Shift 3', 'Divisi Pemorsian', row, row.shift3)}
                  </td>
                </tr>
              ))
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

export async function exportRoomTempChecklistPDF(data: RoomTempChecklistData) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const left = 10;
  const right = 287;
  const centerX = 148.5;

  // Preload BGN logo + all shift documentation photos
  const logoPromise = loadLogoPngDataUrl(
    '/assets/aistudio/Badan_Gizi_Nasional__BGN__Logo_-_Colored_-_zonalogo.com_5e10d066.png'
  );

  const uniquePhotoUrls = Array.from(
    new Set(
      data.rows
        .flatMap(r => [r.shift1.photoUrl, r.shift2.photoUrl, r.shift3.photoUrl])
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
    doc.addImage(logoDataUrl, 'PNG', left + 8, 10, 17, 17);
  }
  const textStartX = left + 31;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 58, 138);
  doc.text('BADAN GIZI NASIONAL (NATIONAL NUTRITION AGENCY)', textStartX, 13.5);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.text('SATUAN PELAYANAN PEMENUHAN GIZI (SPPG)', textStartX, 18);
  doc.text(data.sppgTitleLine, textStartX, 22.3);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const addrLines = doc.splitTextToSize(data.addressLine, right - textStartX);
  doc.text(addrLines, textStartX, 26.2);

  // JUDUL
  doc.setFont('times', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(0, 0, 0);
  doc.text(
    `CHECK LIST PEMANTAUAN SUHU & KELEMBAPAN ${data.unitUpperTitle}`,
    centerX,
    34.5,
    { align: 'center' }
  );

  // PERIODE
  doc.setFontSize(8.5);
  doc.text(`PERIODE : ${data.periodeLabel}`, left, 40.5);

  const cellPhotoUrlMap = new Map<string, string>();
  data.rows.forEach((row, rIdx) => {
    const s1 = row.shift1.photoUrl ? photoMap.get(row.shift1.photoUrl) : null;
    const s2 = row.shift2.photoUrl ? photoMap.get(row.shift2.photoUrl) : null;
    const s3 = row.shift3.photoUrl ? photoMap.get(row.shift3.photoUrl) : null;
    if (s1) cellPhotoUrlMap.set(`${rIdx}:16`, s1);
    if (s2) cellPhotoUrlMap.set(`${rIdx}:17`, s2);
    if (s3) cellPhotoUrlMap.set(`${rIdx}:18`, s3);
  });

  const body = data.rows.map(r => [
    r.tanggalDisplay,
    r.batasKritisSuhu,
    r.shift1.jam,
    r.shift1.suhuHasil,
    r.shift2.jam,
    r.shift2.suhuHasil,
    r.shift3.jam,
    r.shift3.suhuHasil,
    r.batasKritisKelembapan,
    r.shift1.jam,
    r.shift1.kelembapanHasil,
    r.shift2.jam,
    r.shift2.kelembapanHasil,
    r.shift3.jam,
    r.shift3.kelembapanHasil,
    r.keterangan,
    r.shift1.photoUrl ? '' : '-',
    r.shift2.photoUrl ? '' : '-',
    r.shift3.photoUrl ? '' : '-',
  ]);

  autoTable(doc, {
    startY: 42.5,
    margin: { left, right: 10 },
    theme: 'grid',
    head: [
      [
        { content: 'TANGGAL', rowSpan: 3, styles: { valign: 'middle', halign: 'center' } },
        { content: 'BATAS\nKRITIS\n(°C)', rowSpan: 3, styles: { valign: 'middle', halign: 'center' } },
        { content: 'SUHU (°C)', colSpan: 6, styles: { halign: 'center', valign: 'middle' } },
        { content: 'BATAS\nKRITIS', rowSpan: 3, styles: { valign: 'middle', halign: 'center' } },
        { content: 'KELEMBAPAN (%)', colSpan: 6, styles: { halign: 'center', valign: 'middle' } },
        { content: 'KETERANGAN', rowSpan: 3, styles: { valign: 'middle', halign: 'center' } },
        { content: 'DOKUMENTASI KEGIATAN', colSpan: 3, rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
      ],
      [
        { content: 'Shift 1 Persiapan\n(16.00-00.00)', colSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'Shift 2 Pengolahan\n(00.00-08.00)', colSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'Shift 3 Pemorsian\n(08.00-16.00)', colSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'Shift 1 Persiapan\n(16.00-00.00)', colSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'Shift 2 Pengolahan\n(00.00-08.00)', colSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'Shift 3 Pemorsian\n(08.00-16.00)', colSpan: 2, styles: { halign: 'center', valign: 'middle' } },
      ],
      [
        { content: 'Jam', styles: { halign: 'center' } },
        { content: 'hasil', styles: { halign: 'center' } },
        { content: 'Jam', styles: { halign: 'center' } },
        { content: 'hasil', styles: { halign: 'center' } },
        { content: 'Jam', styles: { halign: 'center' } },
        { content: 'hasil', styles: { halign: 'center' } },
        { content: 'Jam', styles: { halign: 'center' } },
        { content: 'hasil', styles: { halign: 'center' } },
        { content: 'Jam', styles: { halign: 'center' } },
        { content: 'hasil', styles: { halign: 'center' } },
        { content: 'Jam', styles: { halign: 'center' } },
        { content: 'hasil', styles: { halign: 'center' } },
        { content: 'Shift 1', styles: { halign: 'center' } },
        { content: 'Shift 2', styles: { halign: 'center' } },
        { content: 'Shift 3', styles: { halign: 'center' } },
      ],
    ],
    body,
    styles: {
      font: 'times',
      fontSize: 7.5,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      cellPadding: 1.2,
      valign: 'middle',
      halign: 'center',
      minCellHeight: 19,
    },
    headStyles: {
      fillColor: [232, 236, 241],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 6.8,
      minCellHeight: 5,
    },
    columnStyles: {
      0: { cellWidth: 18, fontStyle: 'bold' },
      1: { cellWidth: 13 },
      2: { cellWidth: 11 },
      3: { cellWidth: 10 },
      4: { cellWidth: 11 },
      5: { cellWidth: 10 },
      6: { cellWidth: 11 },
      7: { cellWidth: 10 },
      8: { cellWidth: 13, fontStyle: 'bold' },
      9: { cellWidth: 11 },
      10: { cellWidth: 10 },
      11: { cellWidth: 11 },
      12: { cellWidth: 10 },
      13: { cellWidth: 11 },
      14: { cellWidth: 10 },
      15: { cellWidth: 19, halign: 'left' },
      16: { cellWidth: 24 },
      17: { cellWidth: 24 },
      18: { cellWidth: 24 },
    },
    didDrawCell: cellData => {
      if (cellData.section === 'body' && cellData.column.index >= 16) {
        const photoUrl = cellPhotoUrlMap.get(`${cellData.row.index}:${cellData.column.index}`);
        if (photoUrl) {
          const pad = 1.2;
          const imgW = Math.min(20, cellData.cell.width - pad * 2);
          const imgH = Math.min(16.5, cellData.cell.height - pad * 2);
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

  const safeUnit = data.unit.shortLabel.replace(/[^a-zA-Z0-9]+/g, '_');
  doc.save(`Checklist_Suhu_Kelembapan_${safeUnit}_SPPG_TMG2.pdf`);
}
