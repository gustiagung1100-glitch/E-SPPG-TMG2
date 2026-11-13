import React from 'react';
import jsPDF from 'jspdf';
import { BGNLogo } from './OfficialLogos';
import { parseLocalDate } from '../../lib/exportUtils';
import {
  Institution,
  BeneficiaryAttendanceLog,
  MasterVolunteer,
  DistributionLog,
  SPPGConfig,
} from '../../types';

export interface BASTSheetData {
  bastNumber: string;
  date: string; // YYYY-MM-DD or display
  dayName: string;
  ddmmyyyy: string;
  receiveTime: string;
  returnTime: string;
  totalPortions: number;
  institutionName: string;
  picName: string;
  picPhone: string;
  distributorName: string;
  distributorPhone: string;
  headOfSppg: string;
  sppgName: string;
  district: string;
  regency: string;
}

const ROMAN_MONTHS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

export function formatBastDayDate(dateStr?: string): {
  dayName: string;
  ddmmyyyy: string;
  fullLabel: string;
} {
  const d = parseLocalDate(dateStr) || new Date();
  const dayRaw = new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(d);
  const dayName = dayRaw.charAt(0).toUpperCase() + dayRaw.slice(1);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const ddmmyyyy = `${dd}/${mm}/${yyyy}`;
  return {
    dayName,
    ddmmyyyy,
    fullLabel: `Hari ${dayName} Tanggal ${ddmmyyyy}`,
  };
}

export function generateBastNumber(sequence: number | string, dateStr?: string): string {
  const d = parseLocalDate(dateStr) || new Date();
  const romanMonth = ROMAN_MONTHS[d.getMonth()] || 'XI';
  const year = d.getFullYear();
  const seqStr = String(sequence).padStart(3, '0');
  return `${seqStr}/ BAST/SPPG-TMG2/${romanMonth}/${year}`;
}

export function normalizeWibTime(timeStr?: string, fallback = '07:00'): string {
  if (!timeStr || timeStr.trim() === '-' || timeStr.trim() === '') return fallback;
  return timeStr.replace(/\s*WIB\s*$/i, '').trim() || fallback;
}

export interface ResolveBastParams {
  institutions: Institution[];
  beneficiaryAttendance?: BeneficiaryAttendanceLog[];
  masterVolunteers?: MasterVolunteer[];
  distributionLogs?: DistributionLog[];
  sppgConfig: SPPGConfig;
  institutionId?: string;
  institutionName?: string;
  date?: string;
  bastNumber?: string;
  totalPortions?: number;
  picName?: string;
  picPhone?: string;
  distributorName?: string;
  distributorPhone?: string;
  receiveTime?: string;
  returnTime?: string;
  headOfSppg?: string;
}

export function resolveBastAutoFields(params: ResolveBastParams): BASTSheetData {
  const {
    institutions,
    beneficiaryAttendance = [],
    masterVolunteers = [],
    distributionLogs = [],
    sppgConfig,
    institutionId,
    institutionName,
    date,
    bastNumber,
    totalPortions,
    picName,
    picPhone,
    distributorName,
    distributorPhone,
    receiveTime,
    returnTime,
    headOfSppg,
  } = params;

  const activeDate = date || new Date().toISOString().slice(0, 10);
  const { dayName, ddmmyyyy } = formatBastDayDate(activeDate);

  // Match Institution from Master Data / Penerima Manfaat
  const matchedInst =
    (institutionId ? institutions.find(i => i.id === institutionId) : undefined) ||
    (institutionName
      ? institutions.find(
          i =>
            i.name.trim().toLowerCase() === institutionName.trim().toLowerCase() ||
            i.name.trim().toLowerCase().includes(institutionName.trim().toLowerCase())
        )
      : undefined);

  // Match Attendance for that institution & date from Modul Penerima Manfaat
  const matchedAttendance = matchedInst
    ? beneficiaryAttendance.find(a => a.institutionId === matchedInst.id && a.date === activeDate)
    : undefined;

  // Match Distribution Log for arrival time & driver if available
  const matchedDist = matchedInst
    ? distributionLogs.find(d => d.institutionId === matchedInst.id && d.date === activeDate) ||
      distributionLogs.find(d => d.institutionId === matchedInst.id)
    : undefined;

  // Match Distributor Volunteer from Master Relawan (Divisi Distribusi)
  const distVolunteers = masterVolunteers.filter(v => v.division === 'Distribusi' && v.isActive);
  const targetDriverName = distributorName || matchedDist?.driverName || '';
  const matchedVolunteer =
    (targetDriverName
      ? masterVolunteers.find(v => v.name.toLowerCase().includes(targetDriverName.toLowerCase()))
      : undefined) || distVolunteers[0];

  const resolvedPortions =
    typeof totalPortions === 'number' && totalPortions >= 0
      ? totalPortions
      : matchedAttendance
      ? matchedAttendance.actualPortions
      : matchedInst
      ? matchedInst.totalPortions
      : 0;

  const resolvedInstName = matchedInst?.name || institutionName || 'Lembaga Penerima Manfaat';
  const resolvedPicName =
    picName && picName.trim() !== ''
      ? picName
      : matchedInst?.picName || matchedInst?.contactPerson || 'PIC Lembaga';
  const resolvedPicPhone =
    picPhone && picPhone.trim() !== ''
      ? picPhone
      : matchedInst?.picPhone || matchedInst?.phone || '-';

  const resolvedDistName =
    distributorName && distributorName.trim() !== ''
      ? distributorName
      : matchedVolunteer?.name || matchedDist?.driverName || 'Tim Distribusi SPPG';
  const resolvedDistPhone =
    distributorPhone && distributorPhone.trim() !== ''
      ? distributorPhone
      : matchedVolunteer?.phone || sppgConfig.phone || '-';

  const resolvedReceiveTime = normalizeWibTime(receiveTime || matchedDist?.arrivalTime, '07:00');
  const resolvedReturnTime = returnTime ? normalizeWibTime(returnTime, '') : '';

  return {
    bastNumber: bastNumber || generateBastNumber(192, activeDate),
    date: activeDate,
    dayName,
    ddmmyyyy,
    receiveTime: resolvedReceiveTime,
    returnTime: resolvedReturnTime,
    totalPortions: resolvedPortions,
    institutionName: resolvedInstName,
    picName: resolvedPicName,
    picPhone: resolvedPicPhone,
    distributorName: resolvedDistName,
    distributorPhone: resolvedDistPhone,
    headOfSppg: headOfSppg || sppgConfig.headOfSppg,
    sppgName: sppgConfig.sppgName,
    district: sppgConfig.district,
    regency: sppgConfig.regency,
  };
}

export const BASTDocumentSheet: React.FC<{ data: BASTSheetData; className?: string }> = ({
  data,
  className = '',
}) => {
  const formattedPortions = new Intl.NumberFormat('id-ID').format(data.totalPortions || 0);
  const returnTimeDisplay = data.returnTime && data.returnTime.trim() !== '' ? data.returnTime : '........';

  return (
    <div
      className={`bast-print-sheet bg-white text-black p-6 sm:p-8 rounded-xl border border-slate-200 shadow-sm print:shadow-none print:border-none print:p-2 print:rounded-none font-sans leading-snug ${className}`}
    >
      {/* ===================================================================== */}
      {/* BAGIAN 1: BERITA ACARA PENERIMAAN PAKET MAKANAN                       */}
      {/* ===================================================================== */}
      <section className="space-y-3">
        {/* Header Logo BGN + Title */}
        <div className="flex items-center gap-4">
          <div className="shrink-0">
            <BGNLogo size="lg" />
          </div>
          <div className="flex-1 text-center pr-0 sm:pr-14">
            <h2 className="text-[13px] sm:text-[15px] font-bold uppercase tracking-wide text-black">
              BERITA ACARA PENERIMAAN PAKET MAKANAN
            </h2>
            <h3 className="text-[12px] sm:text-[14px] font-bold uppercase tracking-wide text-black">
              PROGRAM MAKAN BERGIZI
            </h3>
            <p className="text-[12px] sm:text-[13px] font-bold uppercase text-black mt-0.5">
              NOMOR: {data.bastNumber}
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="text-[12px] sm:text-[13px] text-black space-y-0.5 pt-1">
          <p>
            Pada Hari <span className="font-medium">{data.dayName}</span> Tanggal{' '}
            <span className="font-medium">{data.ddmmyyyy}</span> Jam{' '}
            <span className="font-medium">{data.receiveTime}</span> WIB
          </p>
          <p>
            Telah diterima Paket Makanan Bergizi Gratis (MBG) sejumlah:{' '}
            <span className="font-bold">{formattedPortions}</span> porsi,
          </p>
          <p>dalam keadaan baik dan layak dikonsumsi dari Satuan Pelayanan Pemenuhan Gizi (SPPG)</p>
          <p>
            {data.sppgName}, Kecamatan {data.district}, {data.regency}.
          </p>
        </div>

        {/* Signatures Grid (Bagian 1) */}
        <div className="grid grid-cols-12 gap-4 pt-2 text-[12px] sm:text-[13px] text-black">
          <div className="col-span-7 space-y-4">
            {/* Yang Menyerahkan */}
            <div>
              <p className="font-bold">Yang Menyerahkan: Tim Distribusi {data.sppgName}</p>
              <p>Nomor Telepon: {data.distributorPhone}</p>
              <div className="h-12" />
              <p className="font-bold underline">( {data.distributorName} )</p>
            </div>

            {/* Diterima Oleh Lembaga */}
            <div>
              <p className="font-bold underline">Diterima Oleh Lembaga : {data.institutionName}</p>
              <p>PIC: {data.picName}</p>
              <p>Nomor Telepon: {data.picPhone}</p>
              <div className="h-12" />
              <p className="font-bold">({data.picName})</p>
            </div>
          </div>

          {/* Right Column: Mengetahui Kepala SPPG */}
          <div className="col-span-5 flex flex-col items-center justify-center text-center px-2">
            <p className="font-bold">Mengetahui:</p>
            <div className="h-16" />
            <p className="font-bold">( {data.headOfSppg} )</p>
            <p className="font-bold leading-tight mt-0.5">Kepala {data.sppgName}</p>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* GARIS PEMISAH PUTUS-PUTUS                                             */}
      {/* ===================================================================== */}
      <div className="my-5 border-t-2 border-dashed border-slate-700" />

      {/* ===================================================================== */}
      {/* BAGIAN 2: BERITA ACARA PENYERAHAN ALAT MAKAN                          */}
      {/* ===================================================================== */}
      <section className="space-y-3">
        {/* Header Logo BGN + Title */}
        <div className="flex items-center gap-4">
          <div className="shrink-0">
            <BGNLogo size="lg" />
          </div>
          <div className="flex-1 text-center pr-0 sm:pr-14">
            <h2 className="text-[13px] sm:text-[15px] font-bold uppercase tracking-wide text-black">
              BERITA ACARA PENYERAHAN ALAT MAKAN
            </h2>
            <h3 className="text-[12px] sm:text-[14px] font-bold uppercase tracking-wide text-black">
              PROGRAM MAKAN BERGIZI
            </h3>
            <p className="text-[12px] sm:text-[13px] font-bold uppercase text-black mt-0.5">
              NOMOR: {data.bastNumber}
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="text-[12px] sm:text-[13px] text-black space-y-0.5 pt-1">
          <p>
            Pada Hari <span className="font-medium">{data.dayName}</span> Tanggal{' '}
            <span className="font-medium">{data.ddmmyyyy}</span> Jam{' '}
            <span className="font-medium">{returnTimeDisplay}</span> WIB
          </p>
          <p>
            Telah diterima kembali alat makan sejumlah:{' '}
            <span className="font-bold">{formattedPortions}</span> paket alat makan bergizi
          </p>
          <p>
            dari Satuan Pelayanan Pemenuhan Gizi (SPPG) {data.sppgName}, Kecamatan {data.district},{' '}
            {data.regency}.
          </p>
        </div>

        {/* Signatures Grid (Bagian 2) */}
        <div className="grid grid-cols-12 gap-4 pt-2 text-[12px] sm:text-[13px] text-black">
          <div className="col-span-7 space-y-4">
            {/* Yang Menyerahkan Lembaga */}
            <div>
              <p className="font-bold">Yang Menyerahkan {data.institutionName}:</p>
              <p>PIC: {data.picName}</p>
              <p>Nomor Telepon: {data.picPhone}</p>
              <div className="h-12" />
              <p className="font-bold">({data.picName})</p>
            </div>

            {/* Diterima oleh Tim Distribusi */}
            <div>
              <p className="font-bold">Diterima oleh: Tim Distribusi {data.sppgName}</p>
              <p>PIC: {data.distributorName}</p>
              <p>Nomor Telepon: {data.distributorPhone}</p>
              <div className="h-12" />
              <p className="font-bold">( {data.distributorName} )</p>
            </div>
          </div>

          {/* Right Column: Mengetahui Kepala SPPG */}
          <div className="col-span-5 flex flex-col items-center justify-start pt-10 text-center px-2">
            <p className="font-bold">Mengetahui:</p>
            <div className="h-16" />
            <p className="font-bold">( {data.headOfSppg} )</p>
            <p className="font-bold leading-tight mt-0.5">Kepala {data.sppgName}</p>
          </div>
        </div>

        {/* Catatan Footnote */}
        <p className="text-[10px] italic text-black pt-1 leading-snug">
          Catatan: Apabila terdapat kerusakan dan/atau kehilangan alat makan (tutup dan tray/tempat
          makan), pihak penerima wajib bertanggung jawab dan mengganti kepada {data.sppgName}.
        </p>
      </section>
    </div>
  );
};

async function loadImageAsDataUrl(url: string): Promise<string | null> {
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

function drawBgnSealFallback(doc: jsPDF, x: number, y: number, size: number) {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const r = size / 2;
  doc.setFillColor(186, 230, 253);
  doc.setDrawColor(140, 109, 44);
  doc.setLineWidth(0.7);
  doc.circle(cx, cy, r, 'FD');
  doc.setFillColor(7, 29, 73);
  doc.circle(cx, cy, r * 0.65, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(216, 173, 85);
  doc.text('BGN RI', cx, cy + 1.5, { align: 'center' });
}

export async function exportBastDocumentPDF(data: BASTSheetData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const left = 16;
  const right = pageWidth - 16;
  const centerX = 113;

  const logoDataUrl = await loadImageAsDataUrl(
    '/assets/aistudio/Badan_Gizi_Nasional__BGN__Logo_-_Colored_-_zonalogo.com_5e10d066.png'
  );
  const formattedPortions = new Intl.NumberFormat('id-ID').format(data.totalPortions || 0);
  const returnTimeDisplay = data.returnTime && data.returnTime.trim() !== '' ? data.returnTime : '........';

  const drawSectionHeader = (startY: number, title: string) => {
    if (logoDataUrl) {
      doc.addImage(logoDataUrl, 'PNG', left, startY, 17, 17);
    } else {
      drawBgnSealFallback(doc, left, startY, 17);
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(title, centerX, startY + 5, { align: 'center' });
    doc.setFontSize(10.5);
    doc.text('PROGRAM MAKAN BERGIZI', centerX, startY + 10.5, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`NOMOR: ${data.bastNumber}`, centerX, startY + 16, { align: 'center' });
  };

  // ==================== BAGIAN 1 ====================
  let y = 14;
  drawSectionHeader(y, 'BERITA ACARA PENERIMAAN PAKET MAKANAN');

  y += 24;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(0, 0, 0);
  doc.text(`Pada Hari ${data.dayName} Tanggal ${data.ddmmyyyy} Jam ${data.receiveTime} WIB`, left, y);
  y += 5;
  doc.text(`Telah diterima Paket Makanan Bergizi Gratis (MBG) sejumlah: ${formattedPortions} porsi,`, left, y);
  y += 5;
  doc.text(
    'dalam keadaan baik dan layak dikonsumsi dari Satuan Pelayanan Pemenuhan Gizi (SPPG)',
    left,
    y
  );
  y += 5;
  const sppgLine1 = doc.splitTextToSize(
    `${data.sppgName}, Kecamatan ${data.district}, ${data.regency}.`,
    right - left
  );
  doc.text(sppgLine1, left, y);
  y += sppgLine1.length * 4.5 + 3;

  // Left: Yang Menyerahkan Tim Distribusi
  doc.setFont('helvetica', 'bold');
  doc.text(`Yang Menyerahkan: Tim Distribusi ${data.sppgName}`, left, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nomor Telepon: ${data.distributorPhone}`, left, y + 4.8);
  const distSigY = y + 20;
  doc.setFont('helvetica', 'bold');
  doc.text(`( ${data.distributorName} )`, left + 2, distSigY);
  const distWidth = doc.getTextWidth(`( ${data.distributorName} )`);
  doc.setLineWidth(0.25);
  doc.line(left + 2, distSigY + 0.8, left + 2 + distWidth, distSigY + 0.8);

  // Right: Mengetahui Kepala SPPG (aligned mid-right)
  const rightColCenter = 154;
  doc.setFont('helvetica', 'bold');
  doc.text('Mengetahui:', rightColCenter, y + 8, { align: 'center' });
  doc.text(`( ${data.headOfSppg} )`, rightColCenter, y + 26, { align: 'center' });
  const headLines = doc.splitTextToSize(`Kepala ${data.sppgName}`, 72);
  doc.text(headLines, rightColCenter, y + 31, { align: 'center' });

  // Left Bottom: Diterima Oleh Lembaga
  let yInst = distSigY + 8;
  doc.setFont('helvetica', 'bold');
  const terimaTitle = `Diterima Oleh Lembaga : ${data.institutionName}`;
  doc.text(terimaTitle, left, yInst);
  doc.line(left, yInst + 0.8, left + doc.getTextWidth(terimaTitle), yInst + 0.8);
  doc.setFont('helvetica', 'normal');
  doc.text(`PIC: ${data.picName}`, left, yInst + 5);
  doc.text(`Nomor Telepon: ${data.picPhone}`, left, yInst + 10);
  doc.setFont('helvetica', 'bold');
  doc.text(`(${data.picName})`, left + 2, yInst + 24);

  // ==================== DASHED SEPARATOR ====================
  const cutY = 144;
  doc.setDrawColor(80, 80, 80);
  doc.setLineWidth(0.4);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(12, cutY, pageWidth - 12, cutY);
  doc.setLineDashPattern([], 0);

  // ==================== BAGIAN 2 ====================
  y = cutY + 7;
  drawSectionHeader(y, 'BERITA ACARA PENYERAHAN ALAT MAKAN');

  y += 24;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(`Pada Hari ${data.dayName} Tanggal ${data.ddmmyyyy} Jam ${returnTimeDisplay} WIB`, left, y);
  y += 5;
  doc.text(`Telah diterima kembali alat makan sejumlah: ${formattedPortions} paket alat makan bergizi`, left, y);
  y += 5;
  const sppgLine2 = doc.splitTextToSize(
    `dari Satuan Pelayanan Pemenuhan Gizi (SPPG) ${data.sppgName}, Kecamatan ${data.district}, ${data.regency}.`,
    right - left
  );
  doc.text(sppgLine2, left, y);
  y += sppgLine2.length * 4.5 + 3;

  // Left: Yang Menyerahkan Lembaga
  doc.setFont('helvetica', 'bold');
  doc.text(`Yang Menyerahkan ${data.institutionName}:`, left, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`PIC: ${data.picName}`, left, y + 4.8);
  doc.text(`Nomor Telepon: ${data.picPhone}`, left, y + 9.6);
  const picSigY = y + 23;
  doc.setFont('helvetica', 'bold');
  doc.text(`(${data.picName})`, left + 2, picSigY);

  // Right: Mengetahui Kepala SPPG
  doc.text('Mengetahui:', rightColCenter, y + 10, { align: 'center' });
  doc.text(`( ${data.headOfSppg} )`, rightColCenter, y + 28, { align: 'center' });
  doc.text(headLines, rightColCenter, y + 33, { align: 'center' });

  // Left Bottom: Diterima Oleh Tim Distribusi
  yInst = picSigY + 8;
  doc.setFont('helvetica', 'bold');
  doc.text(`Diterima oleh: Tim Distribusi ${data.sppgName}`, left, yInst);
  doc.setFont('helvetica', 'normal');
  doc.text(`PIC: ${data.distributorName}`, left, yInst + 4.8);
  doc.text(`Nomor Telepon: ${data.distributorPhone}`, left, yInst + 9.6);
  doc.setFont('helvetica', 'bold');
  doc.text(`( ${data.distributorName} )`, left + 2, yInst + 23);

  // Footnote Catatan
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  const noteLines = doc.splitTextToSize(
    `Catatan: Apabila terdapat kerusakan dan/atau kehilangan alat makan (tutup dan tray/tempat makan), pihak penerima wajib bertanggung jawab dan mengganti kepada ${data.sppgName}.`,
    right - left
  );
  doc.text(noteLines, left, yInst + 30);

  const safeInst = data.institutionName.replace(/[^a-zA-Z0-9]+/g, '_');
  doc.save(`BAST_${safeInst}_${data.date}.pdf`);
}
