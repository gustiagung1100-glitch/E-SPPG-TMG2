import React, { useState } from 'react';
import { useApp } from '../../lib/store';
import { PrintHeader } from '../common/PrintHeader';
import { exportTableToPDF, exportToExcel, exportToCSV, formatRupiah, formatNumber, triggerPrint } from '../../lib/exportUtils';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Calendar,
  CheckCircle2,
  FileCheck,
  Building,
  Image as ImageIcon,
  Share2,
} from 'lucide-react';

export const ReportsModule: React.FC = () => {
  const {
    institutions,
    menuItems,
    distributionLogs,
    financialTransactions,
    inventory,
    volunteerAttendance,
    sppgConfig,
  } = useApp();

  const [selectedReportType, setSelectedReportType] = useState<'harian' | 'mingguan' | 'bulanan'>('harian');
  const [reportDate, setReportDate] = useState('2026-11-08');

  const menuToday = menuItems[0];
  const totalPortions = institutions.reduce((acc, i) => acc + i.totalPortions, 0);
  const totalSmall = institutions.reduce((acc, i) => acc + i.smallPortions, 0);
  const totalLarge = institutions.reduce((acc, i) => acc + i.largePortions, 0);

  const deliveredLogs = distributionLogs.filter(d => d.status === 'Selesai Serah Terima');

  // Photo Documentation Gallery Items
  const documentationPhotos = [
    {
      title: 'Penerimaan Bahan Baku Subuh',
      desc: 'Pengecekan suhu ayam broiler 3.8°C dan penimbangan wortel',
      time: '03:45 WIB',
      tag: 'Gudang & QC',
      color: 'bg-blue-900',
    },
    {
      title: 'Proses Pemasakan Dapur Utama',
      desc: 'Pemasakan sup sayur kaldu dan ayam fillet madu',
      time: '05:30 WIB',
      tag: 'Div. Pengolahan',
      color: 'bg-emerald-700',
    },
    {
      title: 'Penimbangan & Seal Ompreng',
      desc: 'Pemorsian steril porsi kecil 380g dan porsi besar 580g',
      time: '07:15 WIB',
      tag: 'Div. Pemorsian',
      color: 'bg-purple-800',
    },
    {
      title: 'Serah Terima di SDN Temenggungan 1',
      desc: 'Penyerahan 400 boks ompreng dan penandatanganan BAST',
      time: '09:05 WIB',
      tag: 'Distribusi & Sekolah',
      color: 'bg-sky-800',
    },
  ];

  // Export Full Daily Report to PDF
  const handleExportFullReportPDF = () => {
    exportTableToPDF({
      title: `Laporan Pelaksanaan Harian MBG (${reportDate})`,
      subtitle: `Satuan Pelayanan Pemenuhan Gizi (SPPG) Probolinggo Krejengan Temenggungan 2`,
      headers: ['Lembaga Sasaran', 'Porsi Kecil', 'Porsi Besar', 'Total Porsi', 'Waktu Tiba', 'Suhu Tiba', 'Penerima BAST'],
      rows: distributionLogs.map(d => [
        d.institutionName,
        formatNumber(d.smallPortions),
        formatNumber(d.largePortions),
        formatNumber(d.totalPortions),
        d.arrivalTime,
        d.foodTempAtArrival ? `${d.foodTempAtArrival}°C` : '-',
        d.receivedBy || 'Dalam Proses',
      ]),
      fileName: `Laporan_Harian_MBG_SPPG_TMG2_${reportDate}`,
      sppgConfig,
      notes: `Menu: ${menuToday.stapleFood}, ${menuToday.animalProtein}, ${menuToday.plantProtein}, ${menuToday.vegetable}, ${menuToday.fruit}. Total terdistribusi: ${formatNumber(totalPortions)} porsi.`,
      signerName: sppgConfig.headOfSppg,
      signerRole: 'Kepala SPPG Temenggungan 2',
    });
  };

  // Export Full Daily Report to Excel
  const handleExportFullReportExcel = () => {
    const dataToExport = distributionLogs.map(d => ({
      'Tanggal': d.date,
      'Lembaga Sasaran': d.institutionName,
      'Porsi Kecil': d.smallPortions,
      'Porsi Besar': d.largePortions,
      'Total Porsi': d.totalPortions,
      'Kendaraan': d.vehicleNumber,
      'Pengemudi': d.driverName,
      'Jam Berangkat': d.departureTime,
      'Jam Tiba': d.arrivalTime,
      'Suhu Wadah (°C)': d.foodTempAtArrival || d.foodTempAtDispatch,
      'Penerima BAST': d.receivedBy || '-',
      'Status': d.status,
    }));
    exportToExcel(dataToExport, `Laporan_Harian_MBG_${reportDate}`, 'Laporan Harian');
  };

  return (
    <div className="space-y-6">
      {/* Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-blue-900 dark:text-sky-400" />
            Dokumentasi & Laporan Resmi BGN
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Format Pelaporan Akuntabilitas Badan Gizi Nasional (BGN) & Arsip Yayasan Hafshawaty
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportFullReportExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor Excel (.xlsx)</span>
          </button>
          <button
            type="button"
            onClick={handleExportFullReportPDF}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor PDF Resmi</span>
          </button>
          <button
            type="button"
            onClick={triggerPrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Dokumen</span>
          </button>
        </div>
      </div>

      {/* Report Period Selector */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-bold text-slate-700 dark:text-slate-300">Periode Laporan:</span>
          <div className="flex rounded-lg border border-slate-300 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-800">
            {(['harian', 'mingguan', 'bulanan'] as const).map(type => (
              <button
                key={type}
                onClick={() => setSelectedReportType(type)}
                className={`px-3 py-1 rounded-md font-bold capitalize transition text-xs ${
                  selectedReportType === type
                    ? 'bg-blue-900 text-white shadow-xs dark:bg-sky-600'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <Calendar className="w-4 h-4 text-slate-400" />
          <input
            type="date"
            value={reportDate}
            onChange={e => setReportDate(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
          />
        </div>
      </div>

      {/* Official Report Paper Preview Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-md print:border-none print:shadow-none print:p-0">
        <PrintHeader
          title={`Laporan Akuntabilitas Penyelenggaraan MBG (${selectedReportType.toUpperCase()})`}
          subtitle={`Tanggal: ${reportDate} • Wilayah Kerja: Kecamatan Krejengan`}
          docNumber={`LAP-BGN/SPPG-TMG2/2026/11/${reportDate.replace(/-/g, '')}`}
        />

        {/* Section 1: Executive Summary */}
        <div className="space-y-4 my-6 text-xs">
          <h4 className="font-bold text-sm text-blue-950 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-1 uppercase">
            I. Ringkasan Eksekutif Pelayanan Pemenuhan Gizi
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
              <span className="text-slate-400 text-[11px]">Total Penerima Manfaat:</span>
              <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                {formatNumber(totalPortions)} Siswa
              </div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
              <span className="text-slate-400 text-[11px]">Rincian Porsi K/B:</span>
              <div className="text-sm font-black text-blue-900 dark:text-sky-400 mt-0.5">
                {formatNumber(totalSmall)} K / {formatNumber(totalLarge)} B
              </div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
              <span className="text-slate-400 text-[11px]">Total Lembaga Terlayani:</span>
              <div className="text-sm font-black text-emerald-600 mt-0.5">
                {institutions.length} Sekolah & Pesantren
              </div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
              <span className="text-slate-400 text-[11px]">Tingkat Keberhasilan:</span>
              <div className="text-sm font-black text-emerald-600 mt-0.5">
                100% Sesuai Jadwal
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Menu & Nutrition Information */}
        <div className="space-y-3 my-6 text-xs">
          <h4 className="font-bold text-sm text-blue-950 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-1 uppercase">
            II. Komposisi Menu & Standar AKG Hari Ini
          </h4>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div><strong>Makanan Pokok:</strong> {menuToday.stapleFood}</div>
              <div><strong>Lauk Hewani:</strong> {menuToday.animalProtein}</div>
              <div><strong>Lauk Nabati:</strong> {menuToday.plantProtein}</div>
              <div><strong>Sayuran:</strong> {menuToday.vegetable}</div>
              <div><strong>Buah Segar:</strong> {menuToday.fruit}</div>
              <div><strong>Susu / Pelengkap:</strong> {menuToday.milkOrExtra}</div>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-700 text-slate-500 flex flex-wrap gap-4 font-mono text-[11px]">
              <span>Kalori Kecil: <strong>{menuToday.caloriesSmall} kkal</strong></span>
              <span>Kalori Besar: <strong>{menuToday.caloriesLarge} kkal</strong></span>
              <span>Protein: <strong>{menuToday.proteinGrams}g</strong></span>
              <span>Food Cost / Porsi: <strong>{formatRupiah(menuToday.estimatedCostPerPortion)}</strong></span>
            </div>
          </div>
        </div>

        {/* Section 3: Distribution & Delivery Logs */}
        <div className="space-y-3 my-6 text-xs">
          <h4 className="font-bold text-sm text-blue-950 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-1 uppercase">
            III. Realisasi Distribusi ke 8 Lembaga Penerima
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left border border-slate-200 dark:border-slate-700">
              <thead className="bg-slate-100 dark:bg-slate-800 font-bold">
                <tr>
                  <th className="p-2">Nama Lembaga</th>
                  <th className="p-2 text-right">Porsi Kecil</th>
                  <th className="p-2 text-right">Porsi Besar</th>
                  <th className="p-2 text-right">Total Porsi</th>
                  <th className="p-2 text-center">Waktu Tiba</th>
                  <th className="p-2 text-center">Suhu (°C)</th>
                  <th className="p-2">Nama Penerima Sekolah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                {distributionLogs.map((d, idx) => (
                  <tr key={idx}>
                    <td className="p-2 font-sans font-medium">{d.institutionName}</td>
                    <td className="p-2 text-right">{d.smallPortions}</td>
                    <td className="p-2 text-right">{d.largePortions}</td>
                    <td className="p-2 text-right font-bold">{d.totalPortions}</td>
                    <td className="p-2 text-center">{d.arrivalTime}</td>
                    <td className="p-2 text-center text-emerald-600 font-bold">{d.foodTempAtArrival || d.foodTempAtDispatch}°C</td>
                    <td className="p-2 font-sans">{d.receivedBy || 'Menunggu Serah Terima'}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50 dark:bg-slate-800 font-bold font-sans">
                  <td className="p-2 font-bold">TOTAL KESELURUHAN:</td>
                  <td className="p-2 text-right font-mono">{formatNumber(totalSmall)}</td>
                  <td className="p-2 text-right font-mono">{formatNumber(totalLarge)}</td>
                  <td className="p-2 text-right font-mono text-blue-900 dark:text-sky-400 font-black">{formatNumber(totalPortions)}</td>
                  <td colSpan={3} className="p-2 text-right text-emerald-600">100% Terlayani Tuntas</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 4: Photo Documentation Simulation */}
        <div className="space-y-3 my-6 text-xs print:break-inside-avoid">
          <h4 className="font-bold text-sm text-blue-950 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-1 uppercase flex items-center justify-between">
            <span>IV. Dokumentasi Visual Kegiatan Operasional</span>
            <span className="text-[10px] text-slate-400 font-normal">Kamera Geotag & Timestamp Valid</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {documentationPhotos.map((photo, pIdx) => (
              <div
                key={pIdx}
                className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-slate-800/40"
              >
                <div className={`h-24 ${photo.color} flex flex-col items-center justify-center text-white p-3 text-center relative`}>
                  <ImageIcon className="w-6 h-6 opacity-60 mb-1" />
                  <span className="text-[11px] font-bold line-clamp-1">{photo.title}</span>
                  <span className="absolute top-2 right-2 text-[8px] bg-black/40 px-1.5 py-0.5 rounded-sm font-mono">
                    {photo.time}
                  </span>
                </div>
                <div className="p-2.5 space-y-1">
                  <span className="text-[9px] font-bold text-sky-700 dark:text-sky-400 uppercase">
                    {photo.tag}
                  </span>
                  <p className="text-[10px] text-slate-600 dark:text-slate-300 line-clamp-2">
                    {photo.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 5: Signature & Verification Block */}
        <div className="pt-8 grid grid-cols-3 text-center text-xs print:break-inside-avoid">
          <div>
            <div className="text-slate-500">Pengawas Gizi:</div>
            <div className="font-bold text-slate-900 dark:text-white mt-14">
              {sppgConfig.nutritionOfficer}
            </div>
            <div className="text-[10px] text-slate-400">Dietisien Penanggung Jawab Gizi</div>
          </div>
          <div>
            <div className="text-slate-500">Pengawas Keuangan:</div>
            <div className="font-bold text-slate-900 dark:text-white mt-14">
              {sppgConfig.financeOfficer}
            </div>
            <div className="text-[10px] text-slate-400">Verifikator Anggaran & Kas</div>
          </div>
          <div>
            <div className="text-slate-500">Mengetahui & Menyetujui:</div>
            <div className="font-bold text-slate-900 dark:text-white mt-14">
              {sppgConfig.headOfSppg}
            </div>
            <div className="text-[10px] text-slate-400">Kepala SPPG Temenggungan 2</div>
          </div>
        </div>
      </div>
    </div>
  );
};
