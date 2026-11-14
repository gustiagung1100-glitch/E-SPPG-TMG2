import React from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BGNLogo } from './OfficialLogos';
import { formatIndonesianDate, parseLocalDate } from '../../lib/exportUtils';
import {
  BeneficiaryAttendanceLog,
  DistributionDeliveryRecord,
  DistributionLog,
  Institution,
  MenuItem,
  SPPGConfig,
} from '../../types';

export interface OrganolepticFoodRow {
  no: number | '';
  foodName: string;
  rasa: string;
  warna: string;
  aroma: string;
  tekstur: string;
  statusPengantaran: string;
  ket: string;
}

export interface OrganolepticChecklistData {
  institutionId: string;
  namaPemeriksa: string;
  tempatPemeriksaan: string;
  tanggalPemeriksaan: string;
  waktuPemeriksaan: string;
  rawDate: string;
  cityDateLabel: string;
  sppgTitleLine: string;
  addressLine: string;
  rows: OrganolepticFoodRow[];
  kesimpulan: string;
  mengetahuiName: string;
  kepalaSppgName: string;
}

function formatDayCommaDate(dateStr?: string): string {
  const d = parseLocalDate(dateStr) || new Date();
  const weekday = new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(d);
  const weekdayCap = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  const dayNum = String(d.getDate()).padStart(2, '0');
  const monthName = new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(d);
  const year = d.getFullYear();
  return `${weekdayCap},   ${dayNum} ${monthName} ${year}`;
}

function formatCityDate(regency: string, dateStr?: string): string {
  const d = parseLocalDate(dateStr) || new Date();
  const dayNum = String(d.getDate()).padStart(2, '0');
  const monthName = new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(d);
  const year = d.getFullYear();
  const cleanCity = (regency || 'Probolinggo').replace(/^(Kabupaten|Kota)\s+/i, '').trim() || 'Probolinggo';
  return `${cleanCity}, ${dayNum} ${monthName} ${year}`;
}

export interface ResolveOrganolepticParams {
  institutions: Institution[];
  beneficiaryAttendance?: BeneficiaryAttendanceLog[];
  distributionLogs?: DistributionLog[];
  distributionDeliveries?: DistributionDeliveryRecord[];
  menu?: MenuItem;
  sppgConfig: SPPGConfig;
  institutionId?: string;
  date?: string;
  blankMode?: boolean;
  overrides?: {
    namaPemeriksa?: string;
    tempatPemeriksaan?: string;
    tanggalPemeriksaan?: string;
    waktuPemeriksaan?: string;
    kesimpulan?: string;
    mengetahuiName?: string;
    kepalaSppgName?: string;
    rows?: OrganolepticFoodRow[];
  };
}

export function buildMenuOrganolepticRows(menu?: MenuItem, blankMode = false): OrganolepticFoodRow[] {
  const components = menu
    ? [
        menu.stapleFood,
        menu.animalProtein,
        menu.plantProtein,
        menu.vegetable,
        menu.fruit,
        menu.milkOrExtra && !/air mineral/i.test(menu.milkOrExtra) ? menu.milkOrExtra : '',
      ].filter((v): v is string => Boolean(v && v.trim() !== ''))
    : ['Nasi Putih', 'Ayam Fillet Kecap Madu', 'Tempe Mendoan Gurih', 'Sop Sayur Kaldu Ayam', 'Pisang Cavendish'];

  const filledRows: OrganolepticFoodRow[] = components.map((name, idx) => ({
    no: idx + 1,
    foodName: name,
    rasa: blankMode ? '' : '4',
    warna: blankMode ? '' : '4',
    aroma: blankMode ? '' : '4',
    tekstur: blankMode ? '' : '4',
    statusPengantaran: blankMode ? '' : 'Aman',
    ket: '',
  }));

  while (filledRows.length < 7) {
    filledRows.push({
      no: '',
      foodName: '',
      rasa: '',
      warna: '',
      aroma: '',
      tekstur: '',
      statusPengantaran: '',
      ket: '',
    });
  }

  return filledRows;
}

export function resolveOrganolepticAutoFields(
  params: ResolveOrganolepticParams
): OrganolepticChecklistData {
  const {
    institutions,
    beneficiaryAttendance = [],
    distributionLogs = [],
    distributionDeliveries = [],
    menu,
    sppgConfig,
    institutionId,
    date,
    blankMode = false,
    overrides,
  } = params;

  const matchedInst =
    (institutionId && institutionId !== 'ALL'
      ? institutions.find(i => i.id === institutionId)
      : undefined) ||
    institutions.find(i => i.isActive) ||
    institutions[0];

  const instId = matchedInst?.id || '';

  const matchedLog = instId
    ? distributionLogs.find(l => l.institutionId === instId && (!date || l.date === date)) ||
      distributionLogs.find(l => l.institutionId === instId)
    : undefined;

  const matchedDelivery = instId
    ? distributionDeliveries.find(d => d.institutionId === instId && (!date || d.date === date)) ||
      distributionDeliveries.find(d => d.institutionId === instId)
    : undefined;

  const matchedAttendance = instId
    ? beneficiaryAttendance.find(a => a.institutionId === instId && (!date || a.date === date)) ||
      beneficiaryAttendance.find(a => a.institutionId === instId)
    : undefined;

  const activeDate =
    date ||
    matchedLog?.date ||
    matchedDelivery?.date ||
    matchedAttendance?.date ||
    new Date().toISOString().slice(0, 10);

  const autoPicName =
    matchedInst?.picName?.trim() ||
    matchedInst?.contactPerson?.trim() ||
    matchedLog?.receivedBy?.trim() ||
    matchedDelivery?.picName?.trim() ||
    'Penanggung Jawab MBG Sekolah';

  const autoPlaceName = matchedInst?.name || matchedLog?.institutionName || 'Lembaga Penerima Manfaat';

  const autoDateLabel = formatDayCommaDate(activeDate);

  // Waktu pemeriksaan otomatis dari log distribusi / jadwal urutan pengantaran lembaga
  const rawTime = matchedLog?.arrivalTime || matchedDelivery?.arrivalTime;
  const orderIndex = matchedInst?.deliveryOrder ? matchedInst.deliveryOrder : 1;
  const fallbackHour = 7 + Math.min(3, Math.floor((orderIndex - 1) / 3));
  const fallbackMin = ((orderIndex - 1) % 3) * 15 + 15;
  const fallbackTime = `${String(fallbackHour).padStart(2, '0')}:${String(fallbackMin).padStart(2, '0')} WIB`;
  const autoTimeLabel = rawTime && rawTime.trim() !== '' && rawTime.trim() !== '-'
    ? /wib/i.test(rawTime)
      ? rawTime
      : `${rawTime} WIB`
    : fallbackTime;

  const cleanSppgTitle = (sppgConfig.sppgName || 'PROBOLINGGO KREJENGAN TEMENGGUNGAN 2')
    .replace(/^SPPG\s+/i, '')
    .toUpperCase();

  const addressLine = `${sppgConfig.address || 'Dusun Krajan RT/RW 003/004 Desa Temenggungan'}, Kecamatan ${
    sppgConfig.district || 'Krejengan'
  }, ${sppgConfig.regency || 'Kabupaten Probolinggo'}, ${
    sppgConfig.province || 'Jawa Timur'
  }, ID 67284. Email : ${sppgConfig.email}`;

  const defaultRows = buildMenuOrganolepticRows(menu, blankMode);

  return {
    institutionId: instId,
    namaPemeriksa:
      overrides?.namaPemeriksa !== undefined && overrides.namaPemeriksa.trim() !== ''
        ? overrides.namaPemeriksa
        : autoPicName,
    tempatPemeriksaan:
      overrides?.tempatPemeriksaan !== undefined && overrides.tempatPemeriksaan.trim() !== ''
        ? overrides.tempatPemeriksaan
        : autoPlaceName,
    tanggalPemeriksaan:
      overrides?.tanggalPemeriksaan !== undefined && overrides.tanggalPemeriksaan.trim() !== ''
        ? overrides.tanggalPemeriksaan
        : autoDateLabel,
    waktuPemeriksaan:
      overrides?.waktuPemeriksaan !== undefined && overrides.waktuPemeriksaan.trim() !== ''
        ? overrides.waktuPemeriksaan
        : autoTimeLabel,
    rawDate: activeDate,
    cityDateLabel: formatCityDate(sppgConfig.regency, activeDate),
    sppgTitleLine: cleanSppgTitle,
    addressLine,
    rows: overrides?.rows && overrides.rows.length > 0 ? overrides.rows : defaultRows,
    kesimpulan:
      overrides?.kesimpulan && overrides.kesimpulan.trim() !== ''
        ? overrides.kesimpulan
        : blankMode
        ? 'Aman/Tidak aman dikonsumsi'
        : 'Aman dikonsumsi',
    mengetahuiName:
      overrides?.mengetahuiName && overrides.mengetahuiName.trim() !== ''
        ? overrides.mengetahuiName
        : sppgConfig.nutritionOfficer || 'Sufy Kancisyah A, S.Tr. Gz.',
    kepalaSppgName:
      overrides?.kepalaSppgName && overrides.kepalaSppgName.trim() !== ''
        ? overrides.kepalaSppgName
        : sppgConfig.headOfSppg,
  };
}

export const OrganolepticChecklistSheet: React.FC<{
  data: OrganolepticChecklistData;
  className?: string;
}> = ({ data, className = '' }) => {
  return (
    <div
      className={`bg-white text-black p-6 sm:p-10 rounded-xl border border-slate-200 shadow-sm print:shadow-none print:border-none print:p-4 print:rounded-none font-serif leading-snug ${className}`}
    >
      {/* KOP SURAT: Logo BGN di kiri + 3 Baris Judul + Alamat & Email */}
      <div className="flex items-start gap-4 pb-5">
        <div className="shrink-0 pt-0.5">
          <BGNLogo size="lg" />
        </div>
        <div className="flex-1 text-left">
          <h3 className="text-[12px] sm:text-[13.5px] font-bold uppercase tracking-wide text-[#1e3a8a]">
            BADAN GIZI NASIONAL (NATIONAL NUTRITION AGENCY)
          </h3>
          <h2 className="text-[12px] sm:text-[13.5px] font-bold uppercase tracking-wide text-black leading-tight">
            SATUAN PELAYANAN PEMENUHAN GIZI (SPPG)
          </h2>
          <h2 className="text-[12px] sm:text-[13.5px] font-bold uppercase tracking-wide text-black leading-tight">
            {data.sppgTitleLine}
          </h2>
          <p className="text-[10px] sm:text-[11px] text-black mt-0.5 leading-snug font-sans">
            {data.addressLine}
          </p>
        </div>
      </div>

      {/* JUDUL FORM */}
      <div className="text-center pb-4">
        <h1 className="text-[13px] sm:text-[14.5px] font-bold uppercase tracking-wide text-black font-sans">
          CHECKLIST UJI ORGANOLEPTIK
        </h1>
      </div>

      {/* IDENTITAS PEMERIKSAAN (Terisi Otomatis dari Master Data Penerima Manfaat) */}
      <div className="mb-4 text-[11.5px] sm:text-[12.5px] text-black font-serif space-y-1 max-w-2xl">
        <div className="grid grid-cols-12">
          <span className="col-span-4 sm:col-span-3">Nama Pemeriksa</span>
          <span className="col-span-8 sm:col-span-9">
            : <span className="font-semibold">{data.namaPemeriksa}</span>
          </span>
        </div>
        <div className="grid grid-cols-12">
          <span className="col-span-4 sm:col-span-3">Tempat Pemeriksaan</span>
          <span className="col-span-8 sm:col-span-9">
            : <span className="font-semibold">{data.tempatPemeriksaan}</span>
          </span>
        </div>
        <div className="grid grid-cols-12">
          <span className="col-span-4 sm:col-span-3">Tanggal Pemeriksaan</span>
          <span className="col-span-8 sm:col-span-9">
            : <span className="font-medium">{data.tanggalPemeriksaan}</span>
          </span>
        </div>
        <div className="grid grid-cols-12">
          <span className="col-span-4 sm:col-span-3">Waktu Pemeriksaan</span>
          <span className="col-span-8 sm:col-span-9">
            : <span className="font-medium">{data.waktuPemeriksaan}</span>
          </span>
        </div>
      </div>

      {/* TABEL CHECKLIST UJI ORGANOLEPTIK */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-black text-[11px] sm:text-[12px] text-black font-serif">
          <thead>
            <tr className="bg-slate-100/80 print:bg-slate-100 font-bold text-center">
              <th rowSpan={2} className="border border-black px-2 py-2 w-9 align-middle">
                No
              </th>
              <th rowSpan={2} className="border border-black px-3 py-2 min-w-[165px] align-middle">
                Nama Makanan
              </th>
              <th colSpan={4} className="border border-black px-2 py-1.5 align-middle">
                <div>Hasil Pemeriksaan</div>
                <div className="text-[10.5px] font-bold">(diberi skor 1-5)</div>
              </th>
              <th rowSpan={2} className="border border-black px-2.5 py-2 w-36 align-middle leading-tight">
                Sebelum Pengantaran/Saat Tiba di Lokasi/Sebelum dikonsumsi
              </th>
              <th rowSpan={2} className="border border-black px-2.5 py-2 w-24 align-middle">
                Ket
              </th>
            </tr>
            <tr className="bg-slate-100/80 print:bg-slate-100 font-bold text-center">
              <th className="border border-black px-2 py-1.5 w-14">Rasa</th>
              <th className="border border-black px-2 py-1.5 w-14">Warna</th>
              <th className="border border-black px-2 py-1.5 w-14">Aroma</th>
              <th className="border border-black px-2 py-1.5 w-14">Tekstur</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, idx) => (
              <tr key={idx} className="h-8">
                <td className="border border-black px-2 py-1.5 text-center align-middle">
                  {row.no}
                </td>
                <td className="border border-black px-2.5 py-1.5 text-left align-middle">
                  {row.foodName}
                </td>
                <td className="border border-black px-2 py-1.5 text-center align-middle font-sans font-semibold">
                  {row.rasa}
                </td>
                <td className="border border-black px-2 py-1.5 text-center align-middle font-sans font-semibold">
                  {row.warna}
                </td>
                <td className="border border-black px-2 py-1.5 text-center align-middle font-sans font-semibold">
                  {row.aroma}
                </td>
                <td className="border border-black px-2 py-1.5 text-center align-middle font-sans font-semibold">
                  {row.tekstur}
                </td>
                <td className="border border-black px-2 py-1.5 text-center align-middle font-medium">
                  {row.statusPengantaran}
                </td>
                <td className="border border-black px-2 py-1.5 text-left align-middle">
                  {row.ket}
                </td>
              </tr>
            ))}
            {/* Baris Kesimpulan Menu MBG */}
            <tr className="bg-slate-50/70 print:bg-slate-50">
              <td colSpan={6} className="border border-black px-3 py-2 text-center font-medium">
                Kesimpulan Menu MBG
              </td>
              <td colSpan={2} className="border border-black px-3 py-2 text-center font-semibold">
                {data.kesimpulan}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* CATATAN & SKOR */}
      <div className="mt-4 text-[11px] sm:text-[11.5px] text-black font-serif space-y-2 leading-snug">
        <div>
          <p className="font-bold">Catatan :</p>
          <ol className="list-decimal pl-5 space-y-0.5 mt-0.5">
            <li>
              Silahkan dipilih salah satu untuk pengisian hasil pelaksanaan uji organoleptik (Sebelum
              Pengantaran/Saat Tiba di Lokasi/Sebelum dikonsumsi)
            </li>
            <li>
              Form dibawa oleh sopir untuk diberikan ke penanggung jawab program MBG dan diambil kembali
              bersama dengan pengambilan ompreng MBG, dan dibawa kembali ke SPPG
            </li>
          </ol>
        </div>

        <div className="pt-1">
          <p className="font-bold">Skor :</p>
          <div className="mt-0.5 space-y-0.5 font-serif">
            <div className="flex gap-2">
              <span className="w-24">Sangat baik</span>
              <span>: 5</span>
            </div>
            <div className="flex gap-2">
              <span className="w-24">Baik</span>
              <span>: 4</span>
            </div>
            <div className="flex gap-2">
              <span className="w-24">Cukup</span>
              <span>: 3</span>
            </div>
            <div className="flex gap-2">
              <span className="w-24">Kurang</span>
              <span>: 2</span>
            </div>
            <div className="flex gap-2">
              <span className="w-24">Tidak baik</span>
              <span>: 1</span>
            </div>
          </div>
        </div>
      </div>

      {/* TANDA TANGAN (Sesuai Format Gambar: Kiri Mengetahui, Tengah Bawah Kepala SPPG, Kanan Pemeriksa) */}
      <div className="mt-6 pt-2 grid grid-cols-12 text-[11.5px] sm:text-[12.5px] text-black font-serif">
        {/* Kiri: Mengetahui (Ahli Gizi / Nutrisionis) */}
        <div className="col-span-4 flex flex-col justify-between min-h-[125px]">
          <p>Mengetahui,</p>
          <div className="h-14" />
          <p className="font-semibold">{data.mengetahuiName}</p>
        </div>

        {/* Tengah Bawah: Kepala SPPG */}
        <div className="col-span-4 flex flex-col items-center justify-end text-center pt-16">
          <p className="font-bold">Kepala SPPG</p>
          <div className="h-16" />
          <p className="font-semibold">{data.kepalaSppgName}</p>
        </div>

        {/* Kanan: Kota, Tanggal & Pemeriksa (PIC Sekolah) */}
        <div className="col-span-4 flex flex-col items-start pl-4 sm:pl-8 justify-between min-h-[125px]">
          <div>
            <p>{data.cityDateLabel}</p>
            <p>Pemeriksa,</p>
          </div>
          <div className="h-14" />
          <p className="font-semibold">{data.namaPemeriksa}</p>
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

export async function exportOrganolepticChecklistPDF(data: OrganolepticChecklistData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const left = 16;
  const right = 194;
  const pageCenterX = 105;

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
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(30, 58, 138);
  doc.text('BADAN GIZI NASIONAL (NATIONAL NUTRITION AGENCY)', kopTextX, 17);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.text('SATUAN PELAYANAN PEMENUHAN GIZI (SPPG)', kopTextX, 22);
  doc.text(data.sppgTitleLine, kopTextX, 26.8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  const addrLines = doc.splitTextToSize(data.addressLine, right - kopTextX);
  doc.text(addrLines, kopTextX, 31.2);

  // JUDUL
  let y = 44;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(0, 0, 0);
  doc.text('CHECKLIST UJI ORGANOLEPTIK', pageCenterX, y, { align: 'center' });

  // BLOK IDENTITAS PEMERIKSA
  y += 8;
  doc.setFont('times', 'normal');
  doc.setFontSize(10.5);
  const labelX = left;
  const colonX = left + 39;

  const metaRows = [
    ['Nama Pemeriksa', data.namaPemeriksa],
    ['Tempat Pemeriksaan', data.tempatPemeriksaan],
    ['Tanggal Pemeriksaan', data.tanggalPemeriksaan],
    ['Waktu Pemeriksaan', data.waktuPemeriksaan],
  ];

  metaRows.forEach(([lbl, val]) => {
    doc.text(lbl, labelX, y);
    doc.text(`:  ${val}`, colonX, y);
    y += 5.5;
  });

  // TABEL CHECKLIST ORGANOLEPTIK (2-Row Header + Rows + Kesimpulan Footer)
  const bodyRows: any[] = data.rows.map(r => [
    r.no === '' ? '' : String(r.no),
    r.foodName,
    r.rasa,
    r.warna,
    r.aroma,
    r.tekstur,
    r.statusPengantaran,
    r.ket,
  ]);

  bodyRows.push([
    {
      content: 'Kesimpulan Menu MBG',
      colSpan: 6,
      styles: { halign: 'center', fontStyle: 'normal', fillColor: [248, 250, 252] },
    },
    {
      content: data.kesimpulan,
      colSpan: 2,
      styles: { halign: 'center', fontStyle: 'bold', fillColor: [248, 250, 252] },
    },
  ]);

  autoTable(doc, {
    startY: y + 2,
    margin: { left, right: 16 },
    theme: 'grid',
    head: [
      [
        { content: 'No', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
        { content: 'Nama Makanan', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
        {
          content: 'Hasil Pemeriksaan\n(diberi skor 1-5)',
          colSpan: 4,
          styles: { valign: 'middle', halign: 'center' },
        },
        {
          content: 'Sebelum Pengantaran/Saat Tiba di Lokasi/Sebelum dikonsumsi',
          rowSpan: 2,
          styles: { valign: 'middle', halign: 'center' },
        },
        { content: 'Ket', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
      ],
      [
        { content: 'Rasa', styles: { halign: 'center' } },
        { content: 'Warna', styles: { halign: 'center' } },
        { content: 'Aroma', styles: { halign: 'center' } },
        { content: 'Tekstur', styles: { halign: 'center' } },
      ],
    ],
    body: bodyRows,
    styles: {
      font: 'times',
      fontSize: 9.5,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.25,
      cellPadding: 2,
      minCellHeight: 7.5,
    },
    headStyles: {
      fillColor: [235, 238, 243],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 9,
      lineColor: [0, 0, 0],
      lineWidth: 0.25,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 46, halign: 'left' },
      2: { cellWidth: 13, halign: 'center' },
      3: { cellWidth: 13, halign: 'center' },
      4: { cellWidth: 13, halign: 'center' },
      5: { cellWidth: 14, halign: 'center' },
      6: { cellWidth: 43, halign: 'center' },
      7: { cellWidth: 26, halign: 'left' },
    },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || y + 75;
  let ny = finalY + 6;

  // CATATAN & SKOR
  doc.setFont('times', 'bold');
  doc.setFontSize(9.5);
  doc.text('Catatan :', left, ny);
  ny += 4.5;

  doc.setFont('times', 'normal');
  const note1 = doc.splitTextToSize(
    '1. Silahkan dipilih salah satu untuk pengisian hasil pelaksanaan uji organoleptik (Sebelum Pengantaran/Saat Tiba di Lokasi/Sebelum dikonsumsi)',
    right - left
  );
  doc.text(note1, left, ny);
  ny += note1.length * 4.2;

  const note2 = doc.splitTextToSize(
    '2. Form dibawa oleh sopir untuk diberikan ke penanggung jawab program MBG dan diambil kembali bersama dengan pengambilan ompreng MBG, dan dibawa kembali ke SPPG',
    right - left
  );
  doc.text(note2, left, ny);
  ny += note2.length * 4.2 + 3;

  doc.setFont('times', 'bold');
  doc.text('Skor :', left, ny);
  ny += 4.5;
  doc.setFont('times', 'normal');
  const skorList = [
    ['Sangat baik', ': 5'],
    ['Baik', ': 4'],
    ['Cukup', ': 3'],
    ['Kurang', ': 2'],
    ['Tidak baik', ': 1'],
  ];
  skorList.forEach(([k, v]) => {
    doc.text(k, left, ny);
    doc.text(v, left + 25, ny);
    ny += 4.3;
  });

  // TANDA TANGAN
  let sigY = ny + 6;
  if (sigY > 245) {
    doc.addPage();
    sigY = 25;
  }

  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  // Kiri: Mengetahui
  doc.text('Mengetahui,', left, sigY);
  doc.setFont('times', 'bold');
  doc.text(data.mengetahuiName, left, sigY + 24);

  // Kanan: Kota, Tanggal & Pemeriksa
  const rightSigX = 138;
  doc.setFont('times', 'normal');
  doc.text(data.cityDateLabel, rightSigX, sigY);
  doc.text('Pemeriksa,', rightSigX, sigY + 5);
  doc.setFont('times', 'bold');
  doc.text(data.namaPemeriksa, rightSigX, sigY + 24);

  // Tengah Bawah: Kepala SPPG
  doc.setFont('times', 'bold');
  doc.text('Kepala SPPG', pageCenterX, sigY + 28, { align: 'center' });
  doc.text(data.kepalaSppgName, pageCenterX, sigY + 49, { align: 'center' });

  const safePlace = data.tempatPemeriksaan.replace(/[^a-zA-Z0-9]+/g, '_');
  doc.save(`Checklist_Uji_Organoleptik_${safePlace}_${data.rawDate}.pdf`);
}

export function formatOrganolepticDateSimple(dateStr?: string): string {
  return formatIndonesianDate(dateStr);
}
