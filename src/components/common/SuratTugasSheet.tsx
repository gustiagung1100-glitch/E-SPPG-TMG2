import React from 'react';
import jsPDF from 'jspdf';
import { BGNLogo } from './OfficialLogos';
import { parseLocalDate } from '../../lib/exportUtils';
import {
  DistributionDeliveryRecord,
  FuelLogRecord,
  MasterVolunteer,
  OutgoingDocument,
  SPPGConfig,
} from '../../types';

export interface SuratTugasData {
  letterNumber: string;
  sppgUnitUpper: string;
  sppgFullTitle: string;
  addressLine: string;
  pemberiTugasNama: string;
  pemberiTugasJabatan: string;
  pemberiTugasNip: string;
  penerimaNama: string;
  penerimaJabatan: string;
  penerimaNik: string;
  jenisKendaraan: string;
  nomorPolisi: string;
  rawDate: string;
  tanggalPerjalananLabel: string;
  rutePerjalanan: string;
  keperluan: string;
  waktuPelaksanaan: string;
  cityDateLabel: string;
  diketahuiNama: string;
  diketahuiJabatan: string;
}

const ROMAN_MONTHS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

function formatWeekdayDate(dateStr?: string): string {
  const d = parseLocalDate(dateStr) || new Date();
  const weekdayRaw = new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(d);
  const weekday = weekdayRaw.charAt(0).toUpperCase() + weekdayRaw.slice(1);
  const dayNum = d.getDate();
  const monthName = new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(d);
  const year = d.getFullYear();
  return `${weekday}, ${dayNum} ${monthName} ${year}`;
}

function formatCityAndDate(regency: string, dateStr?: string): string {
  const d = parseLocalDate(dateStr) || new Date();
  const dayNum = d.getDate();
  const monthName = new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(d);
  const year = d.getFullYear();
  const cleanCity = (regency || 'Probolinggo').replace(/^(Kabupaten|Kota)\s+/i, '').trim() || 'Probolinggo';
  return `${cleanCity}, ${dayNum} ${monthName} ${year}`;
}

export function generateSuratTugasKdoNumber(seq: number, dateStr?: string): string {
  const d = parseLocalDate(dateStr) || new Date();
  const monthIdx = isNaN(d.getTime()) ? 10 : d.getMonth();
  const romanMonth = ROMAN_MONTHS[monthIdx] || 'XI';
  const year = isNaN(d.getFullYear()) ? 2026 : d.getFullYear();
  return `${seq}/ST-KDO/SPPG-TMG2/${romanMonth}/${year}`;
}

function extractPlateAndVehicle(rawVehicle?: string): { jenis: string; nopol: string } {
  if (!rawVehicle) {
    return { jenis: 'Suzuki - GC415V APV DLX', nopol: 'N 1805 MW' };
  }
  const plateMatch = rawVehicle.match(/\b([A-Z]{1,2}\s*\d{1,4}\s*[A-Z]{1,3})\b/);
  const nopol = plateMatch ? plateMatch[1].replace(/\s+/g, ' ').trim() : 'N 1805 MW';
  const parenMatch = rawVehicle.match(/\(([^)]+)\)/);
  const jenis = parenMatch
    ? parenMatch[1].trim()
    : rawVehicle.replace(plateMatch?.[0] || '', '').replace(/[()]/g, '').trim() || 'Suzuki - GC415V APV DLX';
  return { jenis, nopol };
}

export interface ResolveSuratTugasParams {
  sppgConfig: SPPGConfig;
  masterVolunteers: MasterVolunteer[];
  outgoingDocuments?: OutgoingDocument[];
  fuelLogs?: FuelLogRecord[];
  distributionDeliveries?: DistributionDeliveryRecord[];
  date?: string;
  volunteerId?: string;
  documentId?: string;
  selectedDoc?: OutgoingDocument | null;
  overrides?: Partial<SuratTugasData>;
}

export function resolveSuratTugasAutoFields(params: ResolveSuratTugasParams): SuratTugasData {
  const {
    sppgConfig,
    masterVolunteers = [],
    outgoingDocuments = [],
    fuelLogs = [],
    distributionDeliveries = [],
    date,
    volunteerId,
    documentId,
    selectedDoc: explicitDoc,
    overrides,
  } = params;

  const taskDocs = outgoingDocuments.filter(d => d.type === 'Surat Tugas');
  const matchedDoc =
    explicitDoc ||
    (documentId ? taskDocs.find(d => d.id === documentId) : undefined) ||
    (date ? taskDocs.find(d => d.date === date) : undefined) ||
    taskDocs[0];

  const activeVolunteers = masterVolunteers.filter(v => v.isActive);
  const distributionVolunteers = activeVolunteers.filter(
    v => v.division === 'Distribusi' || v.position === 'Driver Armada'
  );

  const matchedVolunteer =
    (volunteerId && volunteerId !== 'AUTO'
      ? masterVolunteers.find(v => v.id === volunteerId)
      : undefined) ||
    (matchedDoc
      ? masterVolunteers.find(
          v =>
            v.name.toLowerCase().includes(matchedDoc.recipientName.toLowerCase()) ||
            matchedDoc.recipientName.toLowerCase().includes(v.name.toLowerCase())
        )
      : undefined) ||
    distributionVolunteers[0] ||
    activeVolunteers[0];

  const rawDate = overrides?.rawDate || date || matchedDoc?.date || new Date().toISOString().slice(0, 10);

  const rawSppgName = sppgConfig.sppgName || 'SPPG Probolinggo Krejengan Temenggungan 2';
  const strippedUnit = rawSppgName.replace(/^SPPG\s+/i, '').trim() || 'Probolinggo Krejengan Temenggungan 2';
  const sppgUnitUpper = strippedUnit.toUpperCase();
  const sppgFullTitle = `Kepala SPPG ${strippedUnit}`;

  const addressLine = `${sppgConfig.address || 'Dusun Krajan RT/RW 003/004 Desa Temenggungan'}, Kecamatan ${sppgConfig.district || 'Krejengan'}, ${sppgConfig.regency || 'Kabupaten Probolinggo'}, ${sppgConfig.province || 'Jawa Timur'}, ID 67284. Email : ${sppgConfig.email || 'sppgkrejengantemenggungan2@gmail.com'}`;

  // Ambil log BBM / pengiriman pada tanggal terkait bila ada
  const matchedFuel =
    fuelLogs.find(f => f.date === rawDate) ||
    fuelLogs[0];
  const matchedDelivery =
    distributionDeliveries.find(d => d.date === rawDate) ||
    distributionDeliveries[0];

  const vehicleInfo = extractPlateAndVehicle(
    matchedFuel?.vehicleNumber || matchedDelivery?.vehicleNumber
  );

  const docFields = matchedDoc?.fieldsData || {};
  const defaultLetterNum =
    matchedDoc?.letterNumber && matchedDoc.letterNumber.includes('ST-KDO')
      ? matchedDoc.letterNumber
      : generateSuratTugasKdoNumber(140 + Math.max(1, taskDocs.length), rawDate);

  const penerimaNama =
    overrides?.penerimaNama?.trim() ||
    docFields['NAMA_PETUGAS'] ||
    matchedVolunteer?.name ||
    matchedDoc?.recipientName ||
    'Rizal Arbiyanto';

  const penerimaJabatan =
    overrides?.penerimaJabatan?.trim() ||
    docFields['DIVISI_JABATAN'] ||
    (matchedVolunteer
      ? `Divisi ${matchedVolunteer.division}${matchedVolunteer.position ? ` (${matchedVolunteer.position})` : ''}`
      : 'Divisi Distribusi');

  const penerimaNik =
    overrides?.penerimaNik?.trim() ||
    docFields['NIK_PETUGAS'] ||
    matchedVolunteer?.idCardNumber ||
    '3513210906880002';

  const jenisKendaraan =
    overrides?.jenisKendaraan?.trim() ||
    docFields['JENIS_KENDARAAN'] ||
    vehicleInfo.jenis ||
    'Suzuki - GC415V APV DLX';

  const nomorPolisi =
    overrides?.nomorPolisi?.trim() ||
    docFields['NOMOR_POLISI'] ||
    vehicleInfo.nopol ||
    'N 1805 MW';

  const rutePerjalanan =
    overrides?.rutePerjalanan?.trim() ||
    docFields['RUTE_PERJALANAN'] ||
    docFields['LOKASI_TUGAS'] ||
    (matchedDelivery?.institutionName ? `SPPG TMG2 — ${matchedDelivery.institutionName}` : '') ||
    (matchedFuel?.gasStationName ? 'Pom Bensin' : 'Pom Bensin');

  const keperluan =
    overrides?.keperluan?.trim() ||
    docFields['KEPERLUAN'] ||
    docFields['URAIAN_TUGAS'] ||
    matchedDoc?.subject ||
    'Pengisian BBM';

  const waktuPelaksanaan =
    overrides?.waktuPelaksanaan?.trim() ||
    docFields['WAKTU_PELAKSANAAN'] ||
    '06.00–14.00 WIB';

  const pemberiTugasNama =
    overrides?.pemberiTugasNama?.trim() ||
    matchedDoc?.signedBy ||
    sppgConfig.headOfSppg ||
    'Rahtri Sephia Jayanti S.Tr. Gz.';

  const pemberiTugasJabatan =
    overrides?.pemberiTugasJabatan?.trim() ||
    sppgFullTitle;

  const pemberiTugasNip =
    overrides?.pemberiTugasNip?.trim() ||
    docFields['NIP_PEMBERI_TUGAS'] ||
    'NIP.2002918 202621 2 004';

  const diketahuiNama =
    overrides?.diketahuiNama?.trim() ||
    docFields['DIKETAHUI_NAMA'] ||
    'M. Eka Gusti Agung Pratama';

  const diketahuiJabatan =
    overrides?.diketahuiJabatan?.trim() ||
    docFields['DIKETAHUI_JABATAN'] ||
    'Asisten Lapangan SPPG';

  return {
    letterNumber: overrides?.letterNumber?.trim() || defaultLetterNum,
    sppgUnitUpper,
    sppgFullTitle: `Kepala SPPG ${strippedUnit}`,
    addressLine,
    pemberiTugasNama,
    pemberiTugasJabatan,
    pemberiTugasNip,
    penerimaNama,
    penerimaJabatan,
    penerimaNik,
    jenisKendaraan,
    nomorPolisi,
    rawDate,
    tanggalPerjalananLabel: overrides?.tanggalPerjalananLabel?.trim() || formatWeekdayDate(rawDate),
    rutePerjalanan,
    keperluan,
    waktuPelaksanaan,
    cityDateLabel: overrides?.cityDateLabel?.trim() || formatCityAndDate(sppgConfig.regency, rawDate),
    diketahuiNama,
    diketahuiJabatan,
  };
}

export const SuratTugasSheet: React.FC<{
  data: SuratTugasData;
  className?: string;
}> = ({ data, className = '' }) => {
  return (
    <div
      className={`bg-white text-black px-8 sm:px-14 py-8 sm:py-10 rounded-xl border border-slate-200 shadow-sm print:shadow-none print:border-none print:px-10 print:py-6 print:rounded-none font-sans leading-relaxed ${className}`}
    >
      {/* KOP SURAT RESMI BGN */}
      <div className="flex items-start gap-4 pb-5">
        <div className="shrink-0 pt-0.5">
          <BGNLogo size="lg" />
        </div>
        <div className="flex-1 text-left">
          <h3 className="text-[12.5px] sm:text-[14px] font-bold italic uppercase tracking-wide text-[#1e3a8a]">
            BADAN GIZI NASIONAL (NATIONAL NUTRITION AGENCY)
          </h3>
          <h2 className="text-[12px] sm:text-[13.5px] font-bold uppercase tracking-wide text-black leading-tight mt-0.5">
            SATUAN PELAYANAN PEMENUHAN GIZI (SPPG)
          </h2>
          <h2 className="text-[12px] sm:text-[13.5px] font-bold uppercase tracking-wide text-black leading-tight">
            {data.sppgUnitUpper}
          </h2>
          <p className="text-[10.5px] sm:text-[11px] italic text-[#1e3a8a] mt-0.5 leading-snug">
            {data.addressLine}
          </p>
        </div>
      </div>

      {/* JUDUL SURAT & NOMOR */}
      <div className="text-center pb-5 space-y-0.5">
        <h1 className="text-[13.5px] sm:text-[15px] font-bold uppercase tracking-wide text-black">
          SURAT TUGAS
        </h1>
        <h2 className="text-[13px] sm:text-[14.5px] font-bold uppercase tracking-wide text-black">
          PERJALANAN KENDARAAN OPERASIONAL
        </h2>
        <h2 className="text-[13px] sm:text-[14.5px] font-bold uppercase tracking-wide text-black">
          SATUAN PELAYANAN PEMENUHAN GIZI (SPPG)
        </h2>
        <h2 className="text-[13px] sm:text-[14.5px] font-bold uppercase tracking-wide text-black">
          {data.sppgUnitUpper}
        </h2>
        <p className="text-[12.5px] sm:text-[14px] font-bold text-black pt-0.5">Nomor:</p>
        <p className="text-[12.5px] sm:text-[14px] font-bold text-black">{data.letterNumber}</p>
      </div>

      {/* PARAGRAF 1: PEMBERI TUGAS */}
      <div className="text-[12px] sm:text-[13px] text-black space-y-2.5">
        <p>Yang bertanda tangan di bawah ini:</p>
        <div className="pl-6 sm:pl-10 space-y-1">
          <div className="grid grid-cols-12">
            <span className="col-span-4 sm:col-span-3">Nama</span>
            <span className="col-span-8 sm:col-span-9">: {data.pemberiTugasNama}</span>
          </div>
          <div className="grid grid-cols-12">
            <span className="col-span-4 sm:col-span-3">Jabatan</span>
            <span className="col-span-8 sm:col-span-9">: {data.pemberiTugasJabatan}</span>
          </div>
        </div>

        {/* PARAGRAF 2: PENERIMA TUGAS */}
        <p className="pt-1.5">Dengan ini memberikan tugas kepada:</p>
        <div className="pl-6 sm:pl-10 space-y-1">
          <div className="grid grid-cols-12">
            <span className="col-span-4 sm:col-span-3">Nama</span>
            <span className="col-span-8 sm:col-span-9">: {data.penerimaNama}</span>
          </div>
          <div className="grid grid-cols-12">
            <span className="col-span-4 sm:col-span-3">Jabatan</span>
            <span className="col-span-8 sm:col-span-9">: {data.penerimaJabatan}</span>
          </div>
          <div className="grid grid-cols-12">
            <span className="col-span-4 sm:col-span-3">NIK</span>
            <span className="col-span-8 sm:col-span-9">: {data.penerimaNik}</span>
          </div>
        </div>

        {/* PARAGRAF 3: KETENTUAN KENDARAAN & PERJALANAN */}
        <p className="pt-1.5 text-justify">
          Untuk menggunakan kendaraan operasional SPPG dalam rangka mendukung kegiatan
          operasional Program Makan Bergizi Gratis (MBG), dengan ketentuan sebagai berikut:
        </p>

        <div className="pl-6 sm:pl-10 space-y-1">
          <div className="grid grid-cols-12">
            <span className="col-span-5 sm:col-span-4">Jenis kendaraan</span>
            <span className="col-span-7 sm:col-span-8">: {data.jenisKendaraan}</span>
          </div>
          <div className="grid grid-cols-12">
            <span className="col-span-5 sm:col-span-4">Nomor polisi</span>
            <span className="col-span-7 sm:col-span-8">: {data.nomorPolisi}</span>
          </div>
          <div className="grid grid-cols-12">
            <span className="col-span-5 sm:col-span-4">Tanggal perjalanan</span>
            <span className="col-span-7 sm:col-span-8">: {data.tanggalPerjalananLabel}</span>
          </div>
          <div className="grid grid-cols-12">
            <span className="col-span-5 sm:col-span-4">Rute perjalanan</span>
            <span className="col-span-7 sm:col-span-8">: {data.rutePerjalanan}</span>
          </div>
          <div className="grid grid-cols-12">
            <span className="col-span-5 sm:col-span-4">Keperluan</span>
            <span className="col-span-7 sm:col-span-8">: {data.keperluan}</span>
          </div>
          <div className="grid grid-cols-12">
            <span className="col-span-5 sm:col-span-4">Waktu pelaksanaan</span>
            <span className="col-span-7 sm:col-span-8">: {data.waktuPelaksanaan}</span>
          </div>
        </div>

        {/* PARAGRAF 4: KEWAJIBAN PENERIMA TUGAS (1-5) */}
        <div className="pt-1">
          <p>Selama melaksanakan tugas, penerima tugas wajib:</p>
          <ol className="list-decimal pl-8 sm:pl-10 space-y-1 mt-1 text-justify">
            <li>
              Menggunakan kendaraan operasional hanya untuk kepentingan kedinasan dan operasional
              Program Makan Bergizi Gratis (MBG).
            </li>
            <li>
              Mematuhi seluruh peraturan perundang-undangan di bidang lalu lintas dan angkutan jalan.
            </li>
            <li>Menjaga kebersihan, keamanan, serta kondisi kendaraan selama digunakan.</li>
            <li>
              Mengisi Bukti Perjalanan Kendaraan Operasional (Log Book) secara lengkap setelah
              perjalanan selesai.
            </li>
            <li>
              Bertanggung jawab atas kendaraan beserta kelengkapan yang digunakan selama masa
              penugasan.
            </li>
          </ol>
        </div>

        {/* PARAGRAF PENUTUP */}
        <p className="pt-2 text-justify">
          Setelah melaksanakan tugas, penerima tugas wajib melaporkan hasil pelaksanaan perjalanan
          kepada {data.pemberiTugasJabatan} serta menyerahkan Bukti Perjalanan Kendaraan Operasional
          sebagai arsip administrasi.
        </p>

        <p className="pt-1">
          Demikian Surat Tugas ini dibuat untuk dilaksanakan dengan penuh tanggung jawab.
        </p>
      </div>

      {/* BLOK TANDA TANGAN (Diketahui Oleh, Penerima Tugas, Pemberi Tugas) */}
      <div className="mt-7 text-[12px] sm:text-[13px] text-black">
        <div className="pl-4 sm:pl-10">
          <p>{data.cityDateLabel}</p>
        </div>

        <div className="grid grid-cols-2 gap-6 mt-1 text-center">
          {/* Kiri: Diketahui Oleh */}
          <div className="flex flex-col items-center">
            <p>Diketahui Oleh</p>
            <div className="h-16 sm:h-20" />
            <p className="font-bold underline decoration-black underline-offset-2">
              {data.diketahuiNama}
            </p>
            <p className="font-bold">{data.diketahuiJabatan}</p>
          </div>

          {/* Kanan: Penerima Tugas */}
          <div className="flex flex-col items-center">
            <p>Penerima Tugas</p>
            <div className="h-16 sm:h-20" />
            <p className="font-bold underline decoration-black underline-offset-2">
              {data.penerimaNama}
            </p>
            <p className="font-bold">{data.penerimaJabatan}</p>
          </div>
        </div>

        {/* Tengah Bawah: Pemberi Tugas */}
        <div className="mt-6 text-center flex flex-col items-center">
          <p>Pemberi Tugas</p>
          <p>{data.pemberiTugasJabatan}</p>
          <div className="h-16 sm:h-20" />
          <p className="font-bold underline decoration-black underline-offset-2">
            {data.pemberiTugasNama}
          </p>
          <p className="font-bold">{data.pemberiTugasNip}</p>
        </div>
      </div>
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

export async function exportSuratTugasPDF(data: SuratTugasData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const left = 18;
  const right = 192;
  const centerX = 105;

  const logoDataUrl = await loadImageAsDataUrl(
    '/assets/aistudio/Badan_Gizi_Nasional__BGN__Logo_-_Colored_-_zonalogo.com_5e10d066.png'
  );

  // KOP SURAT
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', left, 13, 18, 18);
  } else {
    doc.setFillColor(30, 58, 138);
    doc.circle(left + 9, 22, 8.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('BGN', left + 9, 23, { align: 'center' });
  }

  const kopTextX = left + 22;
  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(10.5);
  doc.setTextColor(30, 58, 138);
  doc.text('BADAN GIZI NASIONAL (NATIONAL NUTRITION AGENCY)', kopTextX, 17);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.text('SATUAN PELAYANAN PEMENUHAN GIZI (SPPG)', kopTextX, 21.8);
  doc.text(data.sppgUnitUpper, kopTextX, 26.4);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(30, 58, 138);
  const addrLines = doc.splitTextToSize(data.addressLine, right - kopTextX);
  doc.text(addrLines, kopTextX, 30.8);

  // JUDUL
  let y = 43;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  const titleLines = [
    'SURAT TUGAS',
    'PERJALANAN KENDARAAN OPERASIONAL',
    'SATUAN PELAYANAN PEMENUHAN GIZI (SPPG)',
    data.sppgUnitUpper,
    'Nomor:',
    data.letterNumber,
  ];
  titleLines.forEach(line => {
    doc.text(line, centerX, y, { align: 'center' });
    y += 4.8;
  });

  y += 3;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  const drawKvRow = (label: string, value: string, indent = 12, labelWidth = 38) => {
    doc.text(label, left + indent, y);
    const wrapped = doc.splitTextToSize(`: ${value}`, right - (left + indent + labelWidth));
    doc.text(wrapped, left + indent + labelWidth, y);
    y += Math.max(1, wrapped.length) * 4.7;
  };

  doc.text('Yang bertanda tangan di bawah ini:', left, y);
  y += 5.5;
  drawKvRow('Nama', data.pemberiTugasNama, 12, 34);
  drawKvRow('Jabatan', data.pemberiTugasJabatan, 12, 34);

  y += 2;
  doc.text('Dengan ini memberikan tugas kepada:', left, y);
  y += 5.5;
  drawKvRow('Nama', data.penerimaNama, 12, 34);
  drawKvRow('Jabatan', data.penerimaJabatan, 12, 34);
  drawKvRow('NIK', data.penerimaNik, 12, 34);

  y += 2.5;
  const introText = doc.splitTextToSize(
    'Untuk menggunakan kendaraan operasional SPPG dalam rangka mendukung kegiatan operasional Program Makan Bergizi Gratis (MBG), dengan ketentuan sebagai berikut:',
    right - left
  );
  doc.text(introText, left, y);
  y += introText.length * 4.6 + 2;

  drawKvRow('Jenis kendaraan', data.jenisKendaraan, 12, 40);
  drawKvRow('Nomor polisi', data.nomorPolisi, 12, 40);
  drawKvRow('Tanggal perjalanan', data.tanggalPerjalananLabel, 12, 40);
  drawKvRow('Rute perjalanan', data.rutePerjalanan, 12, 40);
  drawKvRow('Keperluan', data.keperluan, 12, 40);
  drawKvRow('Waktu pelaksanaan', data.waktuPelaksanaan, 12, 40);

  y += 2.5;
  doc.text('Selama melaksanakan tugas, penerima tugas wajib:', left, y);
  y += 5.2;

  const obligations = [
    'Menggunakan kendaraan operasional hanya untuk kepentingan kedinasan dan operasional Program Makan Bergizi Gratis (MBG).',
    'Mematuhi seluruh peraturan perundang-undangan di bidang lalu lintas dan angkutan jalan.',
    'Menjaga kebersihan, keamanan, serta kondisi kendaraan selama digunakan.',
    'Mengisi Bukti Perjalanan Kendaraan Operasional (Log Book) secara lengkap setelah perjalanan selesai.',
    'Bertanggung jawab atas kendaraan beserta kelengkapan yang digunakan selama masa penugasan.',
  ];

  obligations.forEach((item, idx) => {
    doc.text(`${idx + 1}.`, left + 6, y);
    const wrapped = doc.splitTextToSize(item, right - (left + 13));
    doc.text(wrapped, left + 13, y);
    y += wrapped.length * 4.5 + 0.8;
  });

  y += 2.5;
  const closing1 = doc.splitTextToSize(
    `Setelah melaksanakan tugas, penerima tugas wajib melaporkan hasil pelaksanaan perjalanan kepada ${data.pemberiTugasJabatan} serta menyerahkan Bukti Perjalanan Kendaraan Operasional sebagai arsip administrasi.`,
    right - left
  );
  doc.text(closing1, left, y);
  y += closing1.length * 4.6 + 2.5;

  doc.text('Demikian Surat Tugas ini dibuat untuk dilaksanakan dengan penuh tanggung jawab.', left, y);
  y += 8;

  // Jika sisa halaman tidak cukup untuk blok tanda tangan (~62mm), lanjut halaman 2
  if (y > 225) {
    doc.addPage();
    y = 24;
  }

  doc.text(data.cityDateLabel, left + 12, y);
  y += 5;

  const leftSigX = left + 40;
  const rightSigX = right - 40;

  doc.text('Diketahui Oleh', leftSigX, y, { align: 'center' });
  doc.text('Penerima Tugas', rightSigX, y, { align: 'center' });
  y += 19;

  const drawBoldUnderlined = (text: string, x: number, yPos: number) => {
    doc.setFont('helvetica', 'bold');
    doc.text(text, x, yPos, { align: 'center' });
    const textW = doc.getTextWidth(text);
    doc.setLineWidth(0.3);
    doc.line(x - textW / 2, yPos + 0.8, x + textW / 2, yPos + 0.8);
  };

  drawBoldUnderlined(data.diketahuiNama, leftSigX, y);
  drawBoldUnderlined(data.penerimaNama, rightSigX, y);
  y += 4.6;

  doc.setFont('helvetica', 'bold');
  doc.text(data.diketahuiJabatan, leftSigX, y, { align: 'center' });
  doc.text(data.penerimaJabatan, rightSigX, y, { align: 'center' });

  y += 10;
  doc.setFont('helvetica', 'normal');
  doc.text('Pemberi Tugas', centerX, y, { align: 'center' });
  y += 4.8;
  doc.text(data.pemberiTugasJabatan, centerX, y, { align: 'center' });
  y += 19;

  drawBoldUnderlined(data.pemberiTugasNama, centerX, y);
  y += 4.6;
  doc.setFont('helvetica', 'bold');
  doc.text(data.pemberiTugasNip, centerX, y, { align: 'center' });

  const safeNum = data.letterNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Surat_Tugas_Operasional_${safeNum}.pdf`);
}
