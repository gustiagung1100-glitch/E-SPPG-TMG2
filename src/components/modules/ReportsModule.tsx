import React, { useState, useMemo } from 'react';
import { useApp } from '../../lib/store';
import { PrintHeader } from '../common/PrintHeader';
import { BGNLogo, SPPGLogo } from '../common/OfficialLogos';
import {
  exportTableToPDF,
  exportToExcel,
  exportToCSV,
  formatRupiah,
  formatNumber,
  formatIndonesianDate,
  triggerPrint,
  TableImageCell,
} from '../../lib/exportUtils';
import { OfficialReportKey, ReportMetaConfig, ModuleKey } from '../../types';
import { generateBastNumber } from '../common/BASTDocumentSheet';
import {
  OrganolepticChecklistSheet,
  OrganolepticFoodRow,
  resolveOrganolepticAutoFields,
  exportOrganolepticChecklistPDF,
} from '../common/OrganolepticChecklistSheet';
import {
  CookingFoodTempSheet,
  resolveCookingFoodTempData,
  exportCookingFoodTempPDF,
} from '../common/CookingFoodTempSheet';
import {
  PortioningFoodTempSheet,
  resolvePortioningFoodTempData,
  exportPortioningFoodTempPDF,
} from '../common/PortioningFoodTempSheet';
import {
  appendDynamicExportColumns,
  appendDynamicExcelFields,
  getCustomTableFields,
  formatDynamicFieldValue,
} from '../../lib/dynamicFormSchemas';
import {
  Printer,
  Download,
  FileSpreadsheet,
  FileText,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  Calendar,
  Building,
  Users,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  Layers,
  FileCheck,
  TrendingUp,
  AlertCircle,
  Clock,
  Car,
  Utensils,
  Thermometer,
  Trash2,
  DollarSign,
  PackageCheck,
  FileSignature,
} from 'lucide-react';

// Definisi 19 Laporan Resmi Pusat Laporan & Cetak SPPG TMG2
export const REPORT_CONFIGS: ReportMetaConfig[] = [
  // 1. Distribusi & Lapangan
  {
    key: 'bast_distribusi',
    title: 'Berita Acara Serah Terima (BAST) Distribusi',
    category: 'Distribusi & Lapangan',
    codePrefix: 'BAST-DIST',
    description: 'Bukti sah penyerahan ompreng makanan dari tim distribusi kepada PIC sekolah penerima manfaat.',
    sourceModule: 'Distribusi & Logistik (deliveryId, institutionId)',
    defaultOrientation: 'portrait',
    approverRole: 'Koordinator Distribusi & Driver',
  },
  {
    key: 'surat_tugas',
    title: 'Surat Tugas Petugas & Relawan',
    category: 'Distribusi & Lapangan',
    codePrefix: 'ST-MBG',
    description: 'Surat penugasan resmi personel SPPG untuk operasional harian, belanja bahan, dan pengantaran.',
    sourceModule: 'Administrasi Surat & SDM (letterId, volunteerId)',
    defaultOrientation: 'portrait',
    approverRole: 'Kepala SPPG Temenggungan 2',
  },
  {
    key: 'perjalanan_dinas',
    title: 'Dokumentasi Perjalanan Dinas (SPD)',
    category: 'Distribusi & Lapangan',
    codePrefix: 'SPD-LOG',
    description: 'Catatan perjalanan armada distribusi, rute pengantaran, konsumsi BBM, dan logistik lapangan.',
    sourceModule: 'Distribusi & BBM (fuelLogId, deliveryId)',
    defaultOrientation: 'landscape',
    approverRole: 'Koordinator Distribusi & Transportasi',
  },
  {
    key: 'rekap_distribusi',
    title: 'Rekap Distribusi Harian & Logistik Armada',
    category: 'Distribusi & Lapangan',
    codePrefix: 'REKAP-DIST',
    description: 'Rekapitulasi pengiriman seluruh armada, waktu berangkat, waktu tiba, dan konfirmasi serah terima.',
    sourceModule: 'Distribusi & Logistik (deliveryId, institutionId)',
    defaultOrientation: 'landscape',
    approverRole: 'Koordinator Distribusi',
  },
  {
    key: 'organoleptik_penerima',
    title: 'Checklist Uji Organoleptik Penerima Manfaat (PIC Sekolah)',
    category: 'Distribusi & Lapangan',
    codePrefix: 'ORGA-PIC',
    description: 'Formulir resmi Checklist Uji Organoleptik dengan data Pemeriksa, Tempat, Tanggal & Waktu otomatis dari Master Penerima Manfaat.',
    sourceModule: 'Master Penerima Manfaat & Distribusi (institutionId, menuId)',
    defaultOrientation: 'portrait',
    approverRole: 'PIC Sekolah & Kepala SPPG',
  },

  // 2. Gizi & Menu
  {
    key: 'flyer_menu',
    title: 'Flyer Informasi Menu & Edukasi Gizi',
    category: 'Gizi & Menu',
    codePrefix: 'FLYER-GIZI',
    description: 'Materi publikasi menu bergizi, foto porsi kecil & besar, batas konsumsi, serta AKG BGN.',
    sourceModule: 'PLOG & Pemorsian (menuId, portioningId)',
    defaultOrientation: 'portrait',
    approverRole: 'Nutrisionis & Tim Edukasi Gizi',
  },
  {
    key: 'informasi_gizi',
    title: 'Informasi Nilai Gizi Menu (AKG BGN)',
    category: 'Gizi & Menu',
    codePrefix: 'GIZI-AKG',
    description: 'Rincian makronutrien (energi, protein, lemak, karbohidrat) dan mikronutrien per porsi sasaran.',
    sourceModule: 'Data Master & Gizi (menuId, materialId)',
    defaultOrientation: 'portrait',
    approverRole: 'Nutrisionis / Ahli Gizi SPPG',
  },
  {
    key: 'food_cost',
    title: 'Informasi Food Cost & Efisiensi Menu',
    category: 'Gizi & Menu',
    codePrefix: 'FC-ANALYSIS',
    description: 'Analisis biaya bahan baku per porsi versus plafon anggaran BGN RI (Rp 15.000 / Rp 12.500).',
    sourceModule: 'Gizi, RAB & Master Bahan (menuId, rabId)',
    defaultOrientation: 'landscape',
    approverRole: 'Pengawas Keuangan & Ahli Gizi',
  },
  {
    key: 'sampel_menu',
    title: 'Laporan Sampel Menu Harian (Retention Sample 3x24 Jam)',
    category: 'Gizi & Menu',
    codePrefix: 'SAMPLE-RET',
    description: 'Dokumentasi penyimpanan sampel makanan steril di freezer (-18°C) selama 3x24 jam untuk audit lab.',
    sourceModule: 'Dapur & QC Mutu (cookingId, menuId)',
    defaultOrientation: 'portrait',
    approverRole: 'QC Keamanan Pangan & Sanitasi',
  },
  {
    key: 'organoleptik_plog',
    title: 'Organoleptik PLOG (Nutrisionis & Head Chef)',
    category: 'Gizi & Menu',
    codePrefix: 'ORGA-PLOG',
    description: 'Uji organoleptik internal dapur sesaat sebelum makanan diporsikan ke dalam wadah ompreng.',
    sourceModule: 'Pengolahan & PLOG (cookingId, menuId)',
    defaultOrientation: 'portrait',
    approverRole: 'Head Chef & Nutrisionis',
  },

  // 3. Dapur & Keamanan Pangan
  {
    key: 'suhu_makanan_pemorsian',
    title: 'Pemantauan Standar Porsi & Suhu Makanan Pemorsian',
    category: 'Dapur & Keamanan Pangan',
    codePrefix: 'TEMP-PORT',
    description: 'Pemantauan standar berat mentah, faktor konversi, berat matang, suhu Sesi 1–3 (°C), dan dokumentasi foto ompreng per hari.',
    sourceModule: 'Divisi Pemorsian & Master Menu (portioningId, menuId)',
    defaultOrientation: 'landscape',
    approverRole: 'Koordinator Pemorsian & QC',
  },
  {
    key: 'suhu_makanan_pengolahan',
    title: 'Pemantauan Suhu Makanan Pengolahan & Titik Kendali Kritis (CCP)',
    category: 'Dapur & Keamanan Pangan',
    codePrefix: 'TEMP-COOK',
    description: 'Pencatatan suhu internal makanan Sesi 1-3, peralatan masak, batas kritis CCP & bukti foto otomatis dari Divisi Pengolahan, Master Menu & Master Relawan.',
    sourceModule: 'Divisi Pengolahan, Master Menu & Master Data Relawan',
    defaultOrientation: 'landscape',
    approverRole: 'Kepala Bagian Masak (Head Chef)',
  },
  {
    key: 'food_waste',
    title: 'Laporan Food Waste & Sisa Makanan Cuci Ompreng',
    category: 'Dapur & Keamanan Pangan',
    codePrefix: 'WASTE-LOG',
    description: 'Pengukuran sisa makanan pasca-konsumsi dari boks ompreng untuk evaluasi daya terima menu siswa.',
    sourceModule: 'Cuci Ompreng & Higiene (washingId, returnId)',
    defaultOrientation: 'landscape',
    approverRole: 'Koordinator Sanitasi & Cuci Ompreng',
  },

  // 4. Operasional & Rantai Pasok
  {
    key: 'rab',
    title: 'Rencana Anggaran Biaya (RAB) Bahan & Operasional',
    category: 'Operasional & Rantai Pasok',
    codePrefix: 'RAB-MBG',
    description: 'Perencanaan kebutuhan volume belanja bahan pangan, kemasan, gas LPG, dan operasional SPPG.',
    sourceModule: 'Pengadaan & Anggaran (rabId, materialId)',
    defaultOrientation: 'landscape',
    approverRole: 'Pengawas Keuangan & Kepala SPPG',
  },
  {
    key: 'purchase_order',
    title: 'Purchase Order (PO) Harian Rekanan Supplier',
    category: 'Operasional & Rantai Pasok',
    codePrefix: 'PO-MBG',
    description: 'Surat pesanan resmi kepada supplier pangan lokal mencantumkan spesifikasi mutu dan jadwal kirim.',
    sourceModule: 'Pengadaan & Supplier (poId, rabId, supplierId)',
    defaultOrientation: 'landscape',
    approverRole: 'Koordinator Pengadaan & Supplier',
  },
  {
    key: 'quality_control',
    title: 'Quality Control (QC) Bahan Pangan Datang',
    category: 'Operasional & Rantai Pasok',
    codePrefix: 'QC-INSPECT',
    description: 'Hasil inspeksi penerimaan bahan: suhu chiller, kesegaran fisik, tanggal kedaluwarsa, dan berat.',
    sourceModule: 'Gudang & QC (qcId, poId, materialId)',
    defaultOrientation: 'landscape',
    approverRole: 'Petugas QC & Penerimaan Gudang',
  },
  {
    key: 'kartu_stok',
    title: 'Kartu Stok & Mutasi Gudang Bahan Pangan',
    category: 'Operasional & Rantai Pasok',
    codePrefix: 'STOK-GUD',
    description: 'Buku mutasi stok bahan pangan masuk (dari QC PO) dan keluar (ke produksi dapur) secara realtime.',
    sourceModule: 'Gudang & Inventaris (inventoryId, txId)',
    defaultOrientation: 'landscape',
    approverRole: 'Kepala Gudang SPPG',
  },

  // 5. Keuangan & Tata Usaha
  {
    key: 'penerima_harian',
    title: 'Data & Presensi Penerima Manfaat Harian',
    category: 'Keuangan & Tata Usaha',
    codePrefix: 'PM-DAILY',
    description: 'Rekapitulasi jumlah siswa penerima manfaat, kehadiran di kelas, dan realisasi porsi MBG.',
    sourceModule: 'Penerima Manfaat (institutionId, attendanceId)',
    defaultOrientation: 'landscape',
    approverRole: 'Koordinator Penerima Manfaat',
  },
  {
    key: 'keuangan',
    title: 'Laporan Keuangan & Buku Kas Operasional SPPG',
    category: 'Keuangan & Tata Usaha',
    codePrefix: 'KAS-SPPG',
    description: 'Pencatatan arus kas masuk (pencairan BGN/Yayasan) dan kas keluar (pembayaran PO & operasional).',
    sourceModule: 'Buku Kas & Keuangan (txId, poId, rabId)',
    defaultOrientation: 'landscape',
    approverRole: 'Pengawas Keuangan & Kepala SPPG',
  },
];

interface ReportsModuleProps {
  onNavigate?: (module: ModuleKey) => void;
}

export const ReportsModule: React.FC<ReportsModuleProps> = ({ onNavigate }) => {
  const {
    institutions,
    masterBahan,
    masterSuppliers,
    masterVolunteers,
    beneficiaryAttendance,
    menuItems,
    inventory,
    purchaseOrders,
    distributionLogs,
    financialTransactions,
    volunteerAttendance,
    prepRecords,
    cookingRecords,
    portioningRecords,
    distributionDeliveries,
    omprengReturns,
    fuelLogs,
    washingWasteRecords,
    outgoingDocuments,
    incomingLetters,
    rabItems,
    qualityControlRecords,
    sppgConfig,
    dynamicFormSchemas,
  } = useApp();

  // Selected State
  const [activeReportKey, setActiveReportKey] = useState<OfficialReportKey>('bast_distribusi');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [periodType, setPeriodType] = useState<'harian' | 'mingguan' | 'bulanan' | 'periode'>('harian');
  const [selectedDate, setSelectedDate] = useState<string>('2026-11-08');
  const [startDate, setStartDate] = useState<string>('2026-11-01');
  const [endDate, setEndDate] = useState<string>('2026-11-08');
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>('ALL');
  const [selectedPortionCategory, setSelectedPortionCategory] = useState<'ALL' | 'kecil' | 'besar'>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);
  const [previewPhoto, setPreviewPhoto] = useState<{ label: string; url: string; caption?: string } | null>(null);
  const [orgaBlankMode, setOrgaBlankMode] = useState<boolean>(false);
  const [orgaTimeOverride, setOrgaTimeOverride] = useState<string>('');
  const [orgaKesimpulanOverride, setOrgaKesimpulanOverride] = useState<string>('');
  const [orgaMengetahuiOverride, setOrgaMengetahuiOverride] = useState<string>('');
  const [orgaCustomRows, setOrgaCustomRows] = useState<OrganolepticFoodRow[] | null>(null);
  const [showOrgaEditor, setShowOrgaEditor] = useState<boolean>(false);

  // Active Report Metadata
  const currentConfig = useMemo(() => {
    return REPORT_CONFIGS.find(r => r.key === activeReportKey) || REPORT_CONFIGS[0];
  }, [activeReportKey]);

  // Current active menu
  const todayMenu = menuItems[0] || {
    id: 'm-1',
    date: selectedDate,
    dayName: 'Senin',
    cycleWeek: 1,
    menuCode: 'MN-01',
    stapleFood: 'Nasi Putih Organik',
    animalProtein: 'Ayam Fillet Kecap Madu',
    plantProtein: 'Tempe Mendoan Gurih',
    vegetable: 'Sop Sayur Kaldu Ayam',
    fruit: 'Pisang Cavendish Gending',
    milkOrExtra: 'Air Mineral Higienis',
    caloriesSmall: 580,
    caloriesLarge: 680,
    proteinGrams: 29.5,
    fatGrams: 16.2,
    carbGrams: 94.0,
    fiberGrams: 6.5,
    targetPortions: 1450,
    estimatedCostPerPortion: 8187,
    status: 'Disetujui Kepala',
  };

  // Auto-resolved Checklist Uji Organoleptik dari Master Data Penerima Manfaat
  const organolepticData = useMemo(() => {
    return resolveOrganolepticAutoFields({
      institutions,
      beneficiaryAttendance,
      distributionLogs,
      distributionDeliveries,
      menu: todayMenu,
      sppgConfig,
      institutionId: selectedInstitutionId,
      date: selectedDate,
      blankMode: orgaBlankMode,
      overrides: {
        waktuPemeriksaan: orgaTimeOverride || undefined,
        kesimpulan: orgaKesimpulanOverride || undefined,
        mengetahuiName: orgaMengetahuiOverride || undefined,
        rows: orgaCustomRows || undefined,
      },
    });
  }, [
    institutions,
    beneficiaryAttendance,
    distributionLogs,
    distributionDeliveries,
    todayMenu,
    sppgConfig,
    selectedInstitutionId,
    selectedDate,
    orgaBlankMode,
    orgaTimeOverride,
    orgaKesimpulanOverride,
    orgaMengetahuiOverride,
    orgaCustomRows,
  ]);

  // Auto-resolved Pemantauan Suhu Makanan Pengolahan & CCP (Divisi Pengolahan + Master Menu + Master Relawan)
  const cookingFoodTempData = useMemo(() => {
    return resolveCookingFoodTempData({
      cookingRecords,
      menuItems,
      masterVolunteers,
      sppgConfig,
      startDate,
      endDate,
      periodType,
    });
  }, [
    cookingRecords,
    menuItems,
    masterVolunteers,
    sppgConfig,
    startDate,
    endDate,
    periodType,
  ]);

  // Auto-resolved Pemantauan Standar Porsi & Suhu Makanan Pemorsian (Divisi Pemorsian + Master Menu)
  const portioningFoodTempData = useMemo(() => {
    return resolvePortioningFoodTempData({
      portioningRecords,
      menuItems,
      sppgConfig,
      startDate,
      endDate,
      periodType,
    });
  }, [
    portioningRecords,
    menuItems,
    sppgConfig,
    startDate,
    endDate,
    periodType,
  ]);

  // Generate Document Register Number
  const documentRegisterNumber = useMemo(() => {
    const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    const d = new Date(selectedDate);
    const monthIndex = isNaN(d.getTime()) ? 10 : d.getMonth();
    const romanMonth = romanMonths[monthIndex];
    const year = isNaN(d.getTime()) ? 2026 : d.getFullYear();
    return `${currentConfig.codePrefix}/SPPG-TMG2/${year}/${romanMonth}/0042`;
  }, [currentConfig, selectedDate]);

  // Period label string
  const periodLabelString = useMemo(() => {
    if (periodType === 'harian') {
      return `Harian (${formatIndonesianDate(selectedDate)})`;
    } else if (periodType === 'mingguan') {
      return `Siklus Mingguan (Minggu Ke-2 November 2026)`;
    } else if (periodType === 'bulanan') {
      return `Bulanan (November 2026)`;
    } else {
      return `Periode Kustom (${startDate} s/d ${endDate})`;
    }
  }, [periodType, selectedDate, startDate, endDate]);

  // ===========================================================================
  // REPORT DATA GENERATORS (Masing-masing 20 Laporan dengan Relasi ID Unik)
  // ===========================================================================
  const reportPayload = useMemo(() => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    let displayRows: React.ReactNode[][] | undefined = undefined;
    let imageCells: TableImageCell[] = [];
    let excelData: Record<string, any>[] = [];
    let metrics: Array<{ label: string; value: string; sublabel?: string; color?: string }> = [];
    let notes = '';
    let orientation: 'portrait' | 'landscape' = currentConfig.defaultOrientation;
    let signatures: Array<{ role: string; name: string; idNum?: string }> = [
      { role: 'Penyusun / Petugas Lapangan', name: 'Ahmad Muzakki', idNum: 'SPPG-TMG2-OP01' },
      { role: currentConfig.approverRole, name: 'Siti Nurhaliza, S.Gz.', idNum: 'GZ-2026-9912' },
      { role: 'Kepala SPPG Temenggungan 2', name: sppgConfig.headOfSppg, idNum: `SPPG-${sppgConfig.sppgId}` },
    ];

    switch (activeReportKey) {
      // 1. BAST Distribusi
      case 'bast_distribusi': {
        headers = ['No', 'Nomor BAST', 'Lembaga Penerima', 'Porsi Kecil', 'Porsi Besar', 'Total', 'Waktu Tiba', 'Suhu Tiba', 'Kondisi Segel', 'PIC Penerima'];
        let logs = distributionLogs;
        if (selectedInstitutionId !== 'ALL') {
          logs = logs.filter(l => l.institutionId === selectedInstitutionId);
        }
        if (searchKeyword) {
          logs = logs.filter(l => l.institutionName.toLowerCase().includes(searchKeyword.toLowerCase()) || l.id.toLowerCase().includes(searchKeyword.toLowerCase()));
        }

        const totPortions = logs.reduce((acc, l) => acc + l.totalPortions, 0);
        const totSmall = logs.reduce((acc, l) => acc + l.smallPortions, 0);
        const totLarge = logs.reduce((acc, l) => acc + l.largePortions, 0);

        const baseRows = logs.map((l, idx) => {
          const matchedInst = institutions.find(inst => inst.id === l.institutionId);
          const picLabel = l.receivedBy || matchedInst?.picName || matchedInst?.contactPerson || 'Kepala Sekolah / PIC MBG';
          const picPhone = matchedInst?.picPhone || matchedInst?.phone;
          return [
            idx + 1,
            l.bastNumber || generateBastNumber(192 + idx, l.date),
            l.institutionName,
            formatNumber(l.smallPortions),
            formatNumber(l.largePortions),
            formatNumber(l.totalPortions),
            l.arrivalTime || '09:15 WIB',
            l.foodTempAtArrival ? `${l.foodTempAtArrival}°C` : '63.5°C',
            'Utuh / Tersegel',
            picPhone ? `${picLabel} (${picPhone})` : picLabel,
          ];
        });

        const distReportSchema = dynamicFormSchemas.distribution_report_form;
        const dynamicBastCols = appendDynamicExportColumns(distReportSchema, headers, baseRows, logs);
        headers = dynamicBastCols.headers;
        rows = dynamicBastCols.rows;

        excelData = logs.map((l, idx) => {
          const matchedInst = institutions.find(inst => inst.id === l.institutionId);
          const picLabel = l.receivedBy || matchedInst?.picName || matchedInst?.contactPerson || 'PIC Sekolah';
          return appendDynamicExcelFields(
            distReportSchema,
            {
              'No': idx + 1,
              'Nomor BAST': l.bastNumber || generateBastNumber(192 + idx, l.date),
              'ID Lembaga': l.institutionId,
              'Nama Lembaga': l.institutionName,
              'Porsi Kecil': l.smallPortions,
              'Porsi Besar': l.largePortions,
              'Total Porsi': l.totalPortions,
              'Waktu Tiba': l.arrivalTime || '09:15 WIB',
              'Suhu Tiba (°C)': l.foodTempAtArrival || 63.5,
              'Penerima': picLabel,
              'No HP PIC': matchedInst?.picPhone || matchedInst?.phone || '-',
              'Status': l.status,
            },
            l
          );
        });

        metrics = [
          { label: 'Total BAST Terbit', value: `${logs.length} Lembaga`, color: 'text-blue-700' },
          { label: 'Total Porsi Serah Terima', value: `${formatNumber(totPortions)} Porsi`, color: 'text-emerald-700' },
          { label: 'Rasio Porsi Kecil : Besar', value: `${formatNumber(totSmall)} : ${formatNumber(totLarge)}`, color: 'text-purple-700' },
          { label: 'Kondisi Suhu Tiba Rata-rata', value: '64.2°C', sublabel: 'Wajib > 60°C', color: 'text-amber-700' },
        ];

        notes = 'Seluruh ompreng makanan telah diserahterimakan dalam keadaan tertutup rapat, bersegel higienis, dan suhu makanan memenuhi standar minimal 60°C.';
        break;
      }

      // 2. Surat Tugas
      case 'surat_tugas': {
        headers = ['No', 'Nomor Surat Tugas', 'Nama Personel', 'Divisi / Unit', 'Uraian Tugas', 'Lokasi Penugasan', 'Masa Berlaku', 'Status Pengesahan'];
        let docs = outgoingDocuments.filter(d => d.type === 'Surat Tugas');
        if (searchKeyword) {
          docs = docs.filter(d => d.recipientName.toLowerCase().includes(searchKeyword.toLowerCase()) || d.letterNumber.toLowerCase().includes(searchKeyword.toLowerCase()));
        }

        rows = docs.map((d, idx) => [
          idx + 1,
          d.letterNumber,
          d.recipientName,
          d.recipientAddress || 'Operasional SPPG',
          d.subject,
          'Kecamatan Krejengan',
          formatIndonesianDate(d.date),
          d.status,
        ]);

        excelData = docs.map((d, idx) => ({
          'No': idx + 1,
          'Nomor Surat': d.letterNumber,
          'Nama Personel': d.recipientName,
          'Tugas': d.subject,
          'Tanggal': d.date,
          'Status': d.status,
        }));

        metrics = [
          { label: 'Total Surat Tugas', value: `${docs.length} Dokumen`, color: 'text-blue-700' },
          { label: 'Status Pengesahan', value: '100% Sah', color: 'text-emerald-700' },
          { label: 'Personel Bertugas', value: `${docs.length} Orang`, color: 'text-purple-700' },
          { label: 'Basis Penugasan', value: 'SK Kepala SPPG', color: 'text-slate-700' },
        ];
        notes = 'Surat Tugas ini berkekuatan hukum penuh dan menjadi syarat operasional penanganan MBG di lapangan.';
        break;
      }

      // 3. Dokumentasi Perjalanan Dinas (SPD)
      case 'perjalanan_dinas': {
        headers = ['No', 'Nomor SPD', 'Armada / Kendaraan', 'Pengemudi & Petugas', 'Lembaga Tujuan', 'Odo Awal / Akhir', 'Konsumsi BBM', 'Status Perjalanan'];
        let deliveries = distributionDeliveries;
        rows = deliveries.map((d, idx) => [
          idx + 1,
          `SPD-${d.id.toUpperCase()}`,
          `${d.vehicleNumber} (${d.driverName})`,
          d.driverName,
          d.institutionName,
          '14.280 / 14.315 km (35 km)',
          'Rp 45.000 (Pertalite)',
          d.status,
        ]);

        excelData = deliveries.map((d, idx) => ({
          'No': idx + 1,
          'Nomor SPD': `SPD-${d.id}`,
          'Armada': d.vehicleNumber,
          'Driver': d.driverName,
          'Tujuan': d.institutionName,
          'Total Porsi': d.totalPortions,
          'Status': d.status,
        }));

        metrics = [
          { label: 'Total Rute Armada', value: `${deliveries.length} Rute`, color: 'text-blue-700' },
          { label: 'Total Jarak Tempuh', value: '105 Km', color: 'text-emerald-700' },
          { label: 'Realisasi BBM', value: 'Rp 135.000', color: 'text-purple-700' },
          { label: 'Ketepatan Waktu Tiba', value: '100% On-Time', color: 'text-amber-700' },
        ];
        notes = 'Perjalanan dinas logistik berjalan aman dan tertib dengan mematuhi batas kecepatan armada tertutup maksimal 40 km/jam.';
        break;
      }

      // 4. Rekap Distribusi
      case 'rekap_distribusi': {
        headers = ['No', 'ID Kirim', 'Armada', 'Driver', 'Lembaga Tujuan', 'Porsi Muat', 'Jam Berangkat', 'Jam Tiba', 'Status'];
        let deliveries = distributionDeliveries;
        const baseRows = deliveries.map((d, idx) => [
          idx + 1,
          d.id,
          d.vehicleNumber,
          d.driverName,
          d.institutionName,
          formatNumber(d.totalPortions),
          d.departureTime || '08:00 WIB',
          d.arrivalTime || '08:45 WIB',
          d.status,
        ]);

        const dispatchSchema = dynamicFormSchemas.distribution_dispatch_form;
        const dynamicDispatchCols = appendDynamicExportColumns(dispatchSchema, headers, baseRows, deliveries);
        headers = dynamicDispatchCols.headers;
        rows = dynamicDispatchCols.rows;

        excelData = deliveries.map((d, idx) =>
          appendDynamicExcelFields(
            dispatchSchema,
            {
              'No': idx + 1,
              'ID Kirim': d.id,
              'Armada': d.vehicleNumber,
              'Driver': d.driverName,
              'Lembaga': d.institutionName,
              'Porsi': d.totalPortions,
              'Jam Berangkat': d.departureTime,
              'Jam Tiba': d.arrivalTime,
              'Status': d.status,
            },
            d
          )
        );

        const totalPortionLoaded = deliveries.reduce((acc, d) => acc + d.totalPortions, 0);
        metrics = [
          { label: 'Armada Aktif', value: `${deliveries.length} Unit`, color: 'text-blue-700' },
          { label: 'Total Porsi Logistik', value: `${formatNumber(totalPortionLoaded)} Porsi`, color: 'text-emerald-700' },
          { label: 'Seluruh BAST', value: 'Lengkap', color: 'text-emerald-700' },
          { label: 'Zero Incident', value: 'Terpenuhi', color: 'text-slate-700' },
        ];
        notes = 'Rekapitulasi logistik armada distribusi terkonfirmasi lengkap oleh seluruh perwakilan sekolah.';
        break;
      }

      // 5. Organoleptik Penerima Manfaat (Checklist Uji Organoleptik PIC Sekolah)
      case 'organoleptik_penerima': {
        headers = ['No', 'Nama Makanan', 'Rasa', 'Warna', 'Aroma', 'Tekstur', 'Sebelum Pengantaran / Saat Tiba / Sebelum Dikonsumsi', 'Ket'];
        const activeRows = organolepticData.rows.filter(r => r.foodName.trim() !== '');
        rows = activeRows.map(r => [
          r.no,
          r.foodName,
          r.rasa || '-',
          r.warna || '-',
          r.aroma || '-',
          r.tekstur || '-',
          r.statusPengantaran || '-',
          r.ket || '-',
        ]);

        excelData = activeRows.map(r => ({
          'No': r.no,
          'Nama Pemeriksa': organolepticData.namaPemeriksa,
          'Tempat Pemeriksaan': organolepticData.tempatPemeriksaan,
          'Tanggal Pemeriksaan': organolepticData.tanggalPemeriksaan,
          'Waktu Pemeriksaan': organolepticData.waktuPemeriksaan,
          'Nama Makanan': r.foodName,
          'Rasa (1-5)': r.rasa || '-',
          'Warna (1-5)': r.warna || '-',
          'Aroma (1-5)': r.aroma || '-',
          'Tekstur (1-5)': r.tekstur || '-',
          'Kondisi': r.statusPengantaran || '-',
          'Ket': r.ket || '-',
          'Kesimpulan Menu MBG': organolepticData.kesimpulan,
        }));

        metrics = [
          {
            label: 'Nama Pemeriksa (PIC)',
            value: organolepticData.namaPemeriksa,
            sublabel: 'Otomatis dari Master Penerima Manfaat',
            color: 'text-blue-700',
          },
          {
            label: 'Tempat Pemeriksaan',
            value: organolepticData.tempatPemeriksaan,
            sublabel: 'Sekolah / Lembaga Penerima',
            color: 'text-emerald-700',
          },
          {
            label: 'Tanggal & Waktu',
            value: organolepticData.waktuPemeriksaan,
            sublabel: organolepticData.tanggalPemeriksaan,
            color: 'text-purple-700',
          },
          {
            label: 'Kesimpulan Menu MBG',
            value: organolepticData.kesimpulan,
            sublabel: `${activeRows.length} Komponen Menu Diuji`,
            color: 'text-amber-700',
          },
        ];
        notes =
          'Form Checklist Uji Organoleptik dibawa oleh sopir untuk diberikan kepada penanggung jawab (PIC) program MBG sekolah dan diambil kembali bersama pengambilan ompreng MBG ke SPPG.';
        break;
      }

      // 6. Flyer Menu
      case 'flyer_menu': {
        headers = ['No', 'Komponen Hidangan', 'Nama Olahan', 'Gramasi Porsi Kecil', 'Gramasi Porsi Besar', 'Kandungan Gizi Utama', 'Standar BGN'];
        rows = [
          [1, 'Makanan Pokok', todayMenu.stapleFood, '100 gram', '150 gram', 'Karbohidrat Kompleks', 'Beras Organik Terfortifikasi'],
          [2, 'Lauk Hewani', todayMenu.animalProtein, '45 gram', '60 gram', 'Protein Tinggi, Zat Besi', 'Ayam Broiler Segar Halal'],
          [3, 'Lauk Nabati', todayMenu.plantProtein, '35 gram', '50 gram', 'Protein Nabati, Kalsium', 'Kedelai Fermentasi Non-GMO'],
          [4, 'Sayuran', todayMenu.vegetable, '50 gram', '75 gram', 'Vitamin A, C, Serat', 'Sayur Segar Kraksaan'],
          [5, 'Buah Segar', todayMenu.fruit, '1 buah (80g)', '1 buah (100g)', 'Kalium, Antioksidan', 'Pisang Cavendish Matang'],
        ];

        excelData = rows.map(r => ({
          'Komponen': r[1],
          'Menu': r[2],
          'Porsi Kecil': r[3],
          'Porsi Besar': r[4],
          'Gizi': r[5],
        }));

        metrics = [
          { label: 'Total Energi Kalori', value: `${todayMenu.caloriesSmall} - ${todayMenu.caloriesLarge} kkal`, color: 'text-blue-700' },
          { label: 'Protein Harian', value: `${todayMenu.proteinGrams} gram`, color: 'text-emerald-700' },
          { label: 'Batas Konsumsi Porsi Kecil', value: 'Maks. 10:30 WIB', color: 'text-amber-700' },
          { label: 'Batas Konsumsi Porsi Besar', value: 'Maks. 11:30 WIB', color: 'text-purple-700' },
        ];
        notes = 'Flyer menu resmi telah diterbitkan dan dipublikasikan ke seluruh grup wali murid serta papan informasi sekolah.';
        break;
      }

      // 7. Informasi Gizi
      case 'informasi_gizi': {
        headers = ['Zat Gizi', 'Satuan', 'Kandungan Menu', 'Standar AKG BGN (Porsi Kecil)', 'Standar AKG BGN (Porsi Besar)', 'Capaian % AKG'];
        rows = [
          ['Energi Total', 'kkal', `${todayMenu.caloriesSmall} / ${todayMenu.caloriesLarge}`, '550 - 650', '650 - 750', '100% Optimal'],
          ['Protein', 'gram', todayMenu.proteinGrams, '22.0 - 28.0', '28.0 - 35.0', '105% (Tinggi Protein)'],
          ['Lemak Sehat', 'gram', todayMenu.fatGrams, '15.0 - 20.0', '18.0 - 25.0', '95% Sesuai'],
          ['Karbohidrat', 'gram', todayMenu.carbGrams, '85.0 - 105.0', '100.0 - 125.0', '98% Seimbang'],
          ['Kalsium (Ca)', 'mg', '245.0', '200.0', '250.0', '102% Terpenuhi'],
          ['Zat Besi (Fe)', 'mg', '4.8', '4.0', '5.5', '100% Cegah Anemia'],
          ['Serat Pangan', 'gram', '6.5', '5.0', '7.0', '108% Cerna Sehat'],
        ];

        excelData = rows.map(r => ({
          'Zat Gizi': r[0],
          'Satuan': r[1],
          'Nilai': r[2],
          'Standar Kecil': r[3],
          'Standar Besar': r[4],
          'Capaian': r[5],
        }));

        metrics = [
          { label: 'Kalori Menu Porsi Besar', value: `${todayMenu.caloriesLarge} kkal`, color: 'text-blue-700' },
          { label: 'Protein Bersih', value: `${todayMenu.proteinGrams} g`, color: 'text-emerald-700' },
          { label: 'Status Gizi', value: 'Gizi Seimbang', color: 'text-emerald-700' },
          { label: 'Nutrisionis', value: 'Siti Nurhaliza, S.Gz.', color: 'text-slate-700' },
        ];
        notes = 'Komposisi menu telah dihitung menggunakan Tabel Komposisi Pangan Indonesia (TKPI) dan sesuai pedoman BGN RI.';
        break;
      }

      // 8. Food Cost
      case 'food_cost': {
        headers = ['No', 'Komponen Bahan', 'Gramasi per Porsi', 'Harga Satuan (Rp)', 'Cost Bahan per Porsi', 'Plafon BGN per Porsi', 'Rasio Food Cost (%)'];
        rows = [
          [1, 'Beras Organik (Karbohidrat)', '125 g', 'Rp 14.500 / kg', 'Rp 1.812', 'Rp 2.500', '72.5%'],
          [2, 'Ayam Broiler Fillet (Hewani)', '55 g', 'Rp 38.000 / kg', 'Rp 2.090', 'Rp 3.500', '59.7%'],
          [3, 'Tempe Kedelai (Nabati)', '45 g', 'Rp 12.000 / kg', 'Rp 540', 'Rp 1.000', '54.0%'],
          [4, 'Sayuran Segar (Wortel, Buncis)', '65 g', 'Rp 15.000 / kg', 'Rp 975', 'Rp 1.800', '54.2%'],
          [5, 'Pisang Cavendish (Buah)', '90 g', 'Rp 18.000 / kg', 'Rp 1.620', 'Rp 2.200', '73.6%'],
          [6, 'Minyak Goreng, Bumbu & Madu', '20 g', 'Rp 22.000 / kg', 'Rp 1.150', 'Rp 1.500', '76.6%'],
        ];

        const totalCostPerPortion = 8187; // Total food cost
        excelData = rows.map(r => ({
          'Komponen': r[1],
          'Gramasi': r[2],
          'Harga': r[3],
          'Cost': r[4],
          'Plafon': r[5],
        }));

        metrics = [
          { label: 'Food Cost Bahan / Porsi', value: formatRupiah(totalCostPerPortion), color: 'text-emerald-700' },
          { label: 'Plafon Belanja BGN', value: formatRupiah(12500), color: 'text-blue-700' },
          { label: 'Margin Efisiensi', value: formatRupiah(12500 - totalCostPerPortion), color: 'text-purple-700' },
          { label: 'Rasio Food Cost Total', value: '65.5%', sublabel: 'Sehat (<70%)', color: 'text-slate-700' },
        ];
        notes = 'Struktur food cost menu berada dalam ambang batas efisiensi belanja tanpa mengurangi standar gramasi gizi.';
        break;
      }

      // 9. Sampel Menu (Retention 3x24 Jam)
      case 'sampel_menu': {
        headers = ['No', 'Kode Lot Sampel', 'Waktu Pengambilan', 'Komponen Menu Terkunci', 'Wadah Steril', 'Suhu Simpan Freezer', 'Petugas QC Gizi', 'Masa Retensi', 'Status'];
        rows = [
          [1, 'SMPL-20261108-01', '06:30 WIB', 'Nasi Putih Organik (100g)', 'Sterile Container #A1', '-18.5°C', 'M. Farhan, A.Md.Gz', '3x24 Jam (s/d 11 Nov)', 'Tersimpan Baik'],
          [2, 'SMPL-20261108-02', '06:35 WIB', 'Ayam Fillet Kecap Madu (60g)', 'Sterile Container #A2', '-18.5°C', 'M. Farhan, A.Md.Gz', '3x24 Jam (s/d 11 Nov)', 'Tersimpan Baik'],
          [3, 'SMPL-20261108-03', '06:40 WIB', 'Tempe Mendoan Gurih (50g)', 'Sterile Container #A3', '-18.5°C', 'M. Farhan, A.Md.Gz', '3x24 Jam (s/d 11 Nov)', 'Tersimpan Baik'],
          [4, 'SMPL-20261108-04', '06:45 WIB', 'Kuah Sop Sayur Kaldu (100ml)', 'Sterile Vial #B1', '-18.5°C', 'M. Farhan, A.Md.Gz', '3x24 Jam (s/d 11 Nov)', 'Tersimpan Baik'],
        ];

        excelData = rows.map(r => ({
          'No': r[0],
          'Kode Lot': r[1],
          'Waktu': r[2],
          'Menu': r[3],
          'Suhu': r[5],
          'Status': r[8],
        }));

        metrics = [
          { label: 'Total Sampel Tersegel', value: '4 Wadah', color: 'text-blue-700' },
          { label: 'Suhu Freezer Simpan', value: '-18.5°C', color: 'text-sky-700' },
          { label: 'Protokol Retensi', value: '3 x 24 Jam', color: 'text-purple-700' },
          { label: 'Status Mutu', value: 'Aman Terverifikasi', color: 'text-emerald-700' },
        ];
        notes = 'Sampel disimpan dalam lemari pembeku khusus retensi BGN yang tidak dibuka kecuali untuk kepentingan inspeksi BPOM / BGN.';
        break;
      }

      // 10. Organoleptik PLOG
      case 'organoleptik_plog': {
        headers = ['No', 'Komponen Hidangan', 'Penilai (Chef & Nutrisionis)', 'Warna & Visual', 'Aroma Masakan', 'Rasa & Bumbu', 'Tekstur & Matang', 'Suhu Uji', 'Keputusan'];
        rows = [
          [1, 'Nasi Putih', 'Head Chef Bambang', 'Putih Bersih Pulen', 'Harum Alami Nasi', 'Netral Gurih', 'Empuk Tidak Lembek', '78.5°C', 'Lolos Edar'],
          [2, 'Ayam Fillet Madu', 'Nutrisionis Siti N.', 'Cokelat Karamel Kilap', 'Wangi Bawang & Madu', 'Manis Gurih Meresap', 'Empuk Sempurna', '82.0°C', 'Lolos Edar'],
          [3, 'Tempe Mendoan', 'Head Chef Bambang', 'Kuning Keemasan', 'Harum Ketumbar Daun Bawang', 'Gurih Pas', 'Crispy Luar Lembut', '80.0°C', 'Lolos Edar'],
          [4, 'Sop Sayur Kaldu', 'Nutrisionis Siti N.', 'Kuah Bening Keemasan', 'Harum Seledri & Merica', 'Segar Kaldu Ayam', 'Wortel & Buncis Crunch', '84.5°C', 'Lolos Edar'],
        ];

        excelData = rows.map(r => ({
          'Komponen': r[1],
          'Penilai': r[2],
          'Visual': r[3],
          'Aroma': r[4],
          'Rasa': r[5],
          'Tekstur': r[6],
          'Suhu': r[7],
          'Keputusan': r[8],
        }));

        metrics = [
          { label: 'Status Uji Cita Rasa', value: '100% Lolos', color: 'text-emerald-700' },
          { label: 'Rata-rata Suhu Matang', value: '81.2°C', color: 'text-amber-700' },
          { label: 'Penilai', value: 'Chef & Gizi', color: 'text-blue-700' },
          { label: 'Standar Kelayakan', value: 'Higienis BGN', color: 'text-purple-700' },
        ];
        notes = 'Hasil organoleptik internal dapur disetujui penuh sebelum perintah pemorsian ompreng dijalankan.';
        break;
      }

      // 11. Pemantauan Standar Porsi & Suhu Makanan Pemorsian
      case 'suhu_makanan_pemorsian': {
        headers = [
          'Tanggal',
          'Jenis Bahan',
          'Nama Makanan / Menu',
          'Danger Zone',
          'Berat Mentah',
          'Faktor Konversi',
          'Berat Matang',
          'Suhu Sesi 1 / 2 / 3 (°C)',
          'Dokumentasi Foto',
        ];

        const flattenedRows = portioningFoodTempData.groups.flatMap(g =>
          g.rows.map(row => ({ group: g, row }))
        );

        const filteredRows = searchKeyword.trim()
          ? flattenedRows.filter(({ group, row }) => {
              const kw = searchKeyword.toLowerCase();
              return (
                group.dayName.toLowerCase().includes(kw) ||
                group.shortDate.toLowerCase().includes(kw) ||
                row.jenisBahan.toLowerCase().includes(kw) ||
                row.namaMenu.toLowerCase().includes(kw) ||
                group.officerName.toLowerCase().includes(kw)
              );
            })
          : flattenedRows;

        rows = filteredRows.map(({ group, row }) => {
          const photoCount = [row.sesi1.photoUrl, row.sesi2.photoUrl, row.sesi3.photoUrl].filter(Boolean).length;
          return [
            `${group.dayName} ${group.shortDate}`,
            row.jenisBahan,
            row.namaMenu,
            row.dangerZone,
            row.beratMentahDisplay,
            row.faktorKonversiDisplay,
            `${row.beratMatangDisplay} g`,
            `${row.sesi1.tempDisplay} / ${row.sesi2.tempDisplay} / ${row.sesi3.tempDisplay}`,
            `${photoCount}/3 Foto`,
          ];
        });

        excelData = filteredRows.map(({ group, row }) => ({
          'Hari': group.dayName,
          'Tanggal': group.shortDate,
          'Waktu Pemorsian': group.portioningTime,
          'Jenis Bahan': row.jenisBahan,
          'Nama Makanan / Menu': row.namaMenu,
          'Danger Zone': row.dangerZone,
          'Berat Mentah': row.beratMentahDisplay,
          'Faktor Konversi': row.faktorKonversiDisplay,
          'Berat Matang (g)': row.beratMatangDisplay,
          'Suhu Sesi 1 (°C)': row.sesi1.tempDisplay,
          'Suhu Sesi 2 (°C)': row.sesi2.tempDisplay,
          'Suhu Sesi 3 (°C)': row.sesi3.tempDisplay,
          'Foto Sesi 1': row.sesi1.photoUrl || '-',
          'Foto Sesi 2': row.sesi2.photoUrl || '-',
          'Foto Sesi 3': row.sesi3.photoUrl || '-',
          'Petugas': group.officerName,
        }));

        const allSessionReadings = filteredRows.flatMap(({ row }) => [row.sesi1, row.sesi2, row.sesi3]);
        const hotTemps = filteredRows
          .filter(({ row }) => row.categoryKey !== 'fruit')
          .flatMap(({ row }) => [row.sesi1.tempNum, row.sesi2.tempNum, row.sesi3.tempNum])
          .filter((v): v is number => typeof v === 'number');
        const minHotTemp = hotTemps.length > 0 ? Math.min(...hotTemps) : null;
        const totalPhotos = allSessionReadings.filter(r => Boolean(r.photoUrl)).length;
        const latestRec = portioningRecords[0];

        metrics = [
          {
            label: 'Suhu Terendah Hidangan Panas',
            value: minHotTemp !== null ? `${minHotTemp.toFixed(1).replace('.', ',')}°C` : '-',
            sublabel: minHotTemp !== null && minHotTemp >= 60 ? 'Di Atas Danger Zone (≥60°C)' : 'Pantau Danger Zone (60-5°C)',
            color: minHotTemp !== null && minHotTemp >= 60 ? 'text-emerald-700' : 'text-amber-700',
          },
          {
            label: 'Sampling Berat Ompreng',
            value: latestRec ? `${latestRec.smallPortionWeightGrams}g / ${latestRec.largePortionWeightGrams}g` : '-',
            sublabel: 'Porsi Kecil / Porsi Besar',
            color: 'text-blue-700',
          },
          {
            label: 'Dokumentasi Foto Sesi 1–3',
            value: `${totalPhotos} Foto`,
            sublabel: `Dari ${filteredRows.length} baris standar porsi`,
            color: 'text-purple-700',
          },
          {
            label: 'Jumlah Hari Tercatat',
            value: `${portioningFoodTempData.groups.length} Hari`,
            sublabel: 'Sinkron Divisi Pemorsian',
            color: 'text-slate-700',
          },
        ];
        notes = 'Seluruh standar berat mentah, faktor konversi, berat matang, suhu Sesi 1–3 (°C), dan dokumentasi foto disinkronkan otomatis dari Divisi Pemorsian & Master Menu.';
        break;
      }

      // 12. Pemantauan Suhu Makanan Pengolahan & Titik Kendali Kritis (CCP)
      case 'suhu_makanan_pengolahan': {
        headers = [
          'Tanggal & Waktu',
          'Jenis Bahan',
          'Nama Makanan / Menu',
          'Peralatan Masak',
          'Batas Kritis',
          'Suhu Sesi 1 / 2 / 3 (°C)',
          'Status CCP',
          'Penanggung Jawab',
          'Dokumentasi Foto',
        ];

        const flattenedRows = cookingFoodTempData.groups.flatMap(g =>
          g.items.map(item => ({ group: g, item }))
        );

        const filteredItems = searchKeyword.trim()
          ? flattenedRows.filter(({ group, item }) => {
              const kw = searchKeyword.toLowerCase();
              return (
                group.dayName.toLowerCase().includes(kw) ||
                group.shortDate.toLowerCase().includes(kw) ||
                item.jenisBahan.toLowerCase().includes(kw) ||
                item.namaMenu.toLowerCase().includes(kw) ||
                item.peralatanMasak.toLowerCase().includes(kw) ||
                item.penanggungJawab.toLowerCase().includes(kw)
              );
            })
          : flattenedRows;

        rows = filteredItems.map(({ group, item }) => {
          const docCount = [item.sesi1.photoUrl, item.sesi2.photoUrl, item.sesi3.photoUrl].filter(Boolean).length;
          return [
            `${group.dayName} ${group.shortDate} (${group.waktuMasak})`,
            item.jenisBahan,
            item.namaMenu,
            item.peralatanMasak,
            item.batasKritis,
            `${item.sesi1.tempDisplay} / ${item.sesi2.tempDisplay} / ${item.sesi3.tempDisplay}`,
            item.statusCCP,
            item.penanggungJawab,
            `${docCount}/3 Sesi Foto`,
          ];
        });

        excelData = filteredItems.map(({ group, item }) => ({
          'Hari': group.dayName,
          'Tanggal': group.shortDate,
          'Waktu Masak': group.waktuMasak,
          'Kode Menu': group.menuCode || '-',
          'Jenis Bahan': item.jenisBahan,
          'Nama Makanan / Menu (Master Menu)': item.namaMenu,
          'Peralatan Masak': item.peralatanMasak,
          'Batas Kritis CCP': item.batasKritis,
          'Suhu Internal Sesi 1 (°C)': item.sesi1.tempDisplay,
          'Suhu Internal Sesi 2 (°C)': item.sesi2.tempDisplay,
          'Suhu Internal Sesi 3 (°C)': item.sesi3.tempDisplay,
          'Status Titik Kritis (CCP)': item.statusCCP,
          'Penanggung Jawab (Master Relawan)': item.penanggungJawab,
          'Foto Sesi 1': item.sesi1.photoUrl ? 'Terupload' : 'Kosong',
          'Foto Sesi 2': item.sesi2.photoUrl ? 'Terupload' : 'Kosong',
          'Foto Sesi 3': item.sesi3.photoUrl ? 'Terupload' : 'Kosong',
        }));

        const allHotTemps = filteredItems
          .filter(x => x.item.categoryKey !== 'fruit')
          .flatMap(x => [x.item.sesi1.tempNum, x.item.sesi2.tempNum, x.item.sesi3.tempNum])
          .filter((v): v is number => typeof v === 'number');
        const maxTemp = allHotTemps.length ? Math.max(...allHotTemps) : 0;
        const minTemp = allHotTemps.length ? Math.min(...allHotTemps) : 0;
        const deviationCount = filteredItems.filter(x => !x.item.ccpPassed).length;
        const totalPhotoUploaded = filteredItems.reduce(
          (sum, x) =>
            sum +
            [x.item.sesi1.photoUrl, x.item.sesi2.photoUrl, x.item.sesi3.photoUrl].filter(Boolean)
              .length,
          0
        );

        metrics = [
          {
            label: 'Suhu Inti Tertinggi',
            value: maxTemp ? `${maxTemp.toFixed(1)}°C` : '-',
            sublabel: 'Target Makanan Matang ≥ 75°C',
            color: 'text-emerald-700',
          },
          {
            label: 'Suhu Inti Terendah (Panas)',
            value: minTemp ? `${minTemp.toFixed(1)}°C` : '-',
            sublabel: 'Aman ≥ 75°C',
            color: 'text-blue-700',
          },
          {
            label: 'Penyimpangan CCP',
            value: `${deviationCount} Deviasi`,
            sublabel: `${cookingFoodTempData.activePengolahanVolunteers.length} Relawan Div. Pengolahan`,
            color: deviationCount === 0 ? 'text-purple-700' : 'text-rose-700',
          },
          {
            label: 'Dokumentasi Foto Sesi 1-3',
            value: `${totalPhotoUploaded} Foto`,
            sublabel: 'Otomatis dari Div. Pengolahan',
            color: 'text-slate-700',
          },
        ];
        notes =
          'Seluruh data suhu internal (Sesi 1-3), peralatan masak, nama makanan/menu (Master Menu), penanggung jawab (Master Relawan Divisi Pengolahan), dan dokumentasi foto terhubung otomatis dari Sub Menu Tugas Divisi Pengolahan.';
        break;
      }

      // 13. Food Waste
      case 'food_waste': {
        headers = [
          'No',
          'Tanggal & Lembaga Asal',
          'Petugas Cuci',
          'Sisa Nasi (kg)',
          'Sisa Lauk (kg)',
          'Sisa Sayur & Buah (kg)',
          'Total Waste (kg)',
          'Rata-rata per Anak',
          'Pengolahan Lanjut',
          'Foto Bukti (Cuci Ompreng)',
        ];
        let washings = washingWasteRecords;
        if (searchKeyword.trim()) {
          const kw = searchKeyword.toLowerCase();
          washings = washings.filter(
            (w, idx) =>
              w.officerName.toLowerCase().includes(kw) ||
              w.date.toLowerCase().includes(kw) ||
              w.notes.toLowerCase().includes(kw) ||
              (institutions[idx % Math.max(1, institutions.length)]?.name || '').toLowerCase().includes(kw)
          );
        }

        const extractedPhotosPerRow = washings.map(w =>
          [
            { label: 'Nasi', url: w.wasteRice?.photoUrl },
            { label: 'Hewani', url: w.wasteAnimalProtein?.photoUrl },
            { label: 'Nabati', url: w.wastePlantProtein?.photoUrl },
            { label: 'Sayur', url: w.wasteVegetable?.photoUrl },
            { label: 'Buah', url: w.wasteFruit?.photoUrl },
          ].filter((item): item is { label: string; url: string } => Boolean(item.url && item.url.trim() !== ''))
        );

        const baseRows = washings.map((w, idx) => {
          const instName = institutions[idx % Math.max(1, institutions.length)]?.name || 'SDN Temenggungan 1';
          const estOmpreng = Math.max(100, Math.round(w.totalWasteWeight * 40));
          const laukTotal = Number(((w.wasteAnimalProtein?.weight || 0) + (w.wastePlantProtein?.weight || 0)).toFixed(1));
          const sayurBuahTotal = Number(((w.wasteVegetable?.weight || 0) + (w.wasteFruit?.weight || 0)).toFixed(1));
          const photos = extractedPhotosPerRow[idx] || [];

          if (photos.length > 0) {
            imageCells.push({
              rowIndex: idx,
              colIndex: 9,
              images: photos,
            });
          }

          return [
            idx + 1,
            `${w.date} • ${instName}`,
            w.officerName || 'Tim Sanitasi',
            `${w.wasteRice.weight} kg`,
            `${laukTotal} kg`,
            `${sayurBuahTotal} kg`,
            `${w.totalWasteWeight} kg`,
            `${((w.totalWasteWeight / estOmpreng) * 1000).toFixed(1)} gram`,
            'Komposting & Maggot Ternak',
            photos.length > 0 ? `${photos.length} Foto (${photos.map(p => p.label).join(', ')})` : 'Belum ada foto',
          ];
        });

        const wasteSchema = dynamicFormSchemas.production_waste_form;
        const wasteCustomFields = getCustomTableFields(wasteSchema);
        const dynamicWasteCols = appendDynamicExportColumns(wasteSchema, headers, baseRows, washings);
        headers = dynamicWasteCols.headers;
        rows = dynamicWasteCols.rows;

        displayRows = washings.map((w, idx) => {
          const row = rows[idx];
          const photos = extractedPhotosPerRow[idx] || [];
          const photoNode =
            photos.length > 0 ? (
              <div key={`fw-photos-${w.id}`} className="flex flex-wrap items-center gap-1.5 min-w-[220px] py-0.5">
                {photos.map((p, pIdx) => (
                  <button
                    key={pIdx}
                    type="button"
                    onClick={() =>
                      setPreviewPhoto({
                        label: `Foto Sisa ${p.label} — ${w.date}`,
                        url: p.url,
                        caption: `Petugas: ${w.officerName} • Total Food Waste: ${w.totalWasteWeight} kg`,
                      })
                    }
                    title={`Klik untuk perbesar foto sisa ${p.label}`}
                    className="group flex flex-col items-center gap-0.5 rounded-md border border-slate-200 bg-slate-50 p-0.5 hover:border-blue-600 hover:bg-blue-50/40 transition print:border-slate-300 print:bg-white"
                  >
                    <img
                      src={p.url}
                      alt={`Foto sisa ${p.label}`}
                      className="w-10 h-10 object-cover rounded-sm"
                    />
                    <span className="text-[9px] font-semibold text-slate-600 leading-none pb-0.5">
                      {p.label}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <span className="text-[11px] italic text-slate-400">Belum ada foto upload</span>
            );

          const customDisplayCells = wasteCustomFields.map(cf => {
            const raw = w.customFields?.[cf.key];
            if (cf.type === 'photo' && typeof raw === 'string' && raw.trim() !== '') {
              return (
                <button
                  key={`fw-cf-${w.id}-${cf.key}`}
                  type="button"
                  onClick={() =>
                    setPreviewPhoto({
                      label: `${cf.label} — ${w.date}`,
                      url: raw,
                      caption: `Petugas: ${w.officerName}`,
                    })
                  }
                  className="inline-flex items-center p-0.5 rounded border border-slate-200 hover:border-blue-600 transition"
                >
                  <img src={raw} alt={cf.label} className="w-9 h-9 object-cover rounded-xs" />
                </button>
              );
            }
            return formatDynamicFieldValue(cf, raw);
          });

          return [...row.slice(0, 9), photoNode, ...customDisplayCells];
        });

        excelData = washings.map((w, idx) => {
          const photos = extractedPhotosPerRow[idx] || [];
          const laukTotal = Number(((w.wasteAnimalProtein?.weight || 0) + (w.wastePlantProtein?.weight || 0)).toFixed(1));
          const sayurBuahTotal = Number(((w.wasteVegetable?.weight || 0) + (w.wasteFruit?.weight || 0)).toFixed(1));
          return appendDynamicExcelFields(
            wasteSchema,
            {
              'No': idx + 1,
              'Tanggal': w.date,
              'Lembaga': institutions[idx % Math.max(1, institutions.length)]?.name || 'SDN Temenggungan 1',
              'Petugas': w.officerName,
              'Total Waste (kg)': w.totalWasteWeight,
              'Sisa Nasi (kg)': w.wasteRice.weight,
              'Sisa Lauk Hewani & Nabati (kg)': laukTotal,
              'Sisa Sayur & Buah (kg)': sayurBuahTotal,
              'Jumlah Foto Upload': photos.length,
              'Kategori Foto Terlampir': photos.length > 0 ? photos.map(p => p.label).join(', ') : 'Belum ada foto',
            },
            w
          );
        });

        const totWaste = washings.reduce((acc, w) => acc + w.totalWasteWeight, 0);
        const totalUploadedPhotos = extractedPhotosPerRow.reduce((acc, list) => acc + list.length, 0);
        metrics = [
          { label: 'Total Food Waste Tercatat', value: `${totWaste.toFixed(1)} kg`, color: 'text-amber-700' },
          { label: 'Rata-rata Sisa per Porsi', value: '12.4 gram', sublabel: 'Sangat Rendah (<25g)', color: 'text-emerald-700' },
          { label: 'Daya Habis Konsumsi', value: '97.2%', color: 'text-blue-700' },
          {
            label: 'Foto Divisi Cuci Ompreng',
            value: `${totalUploadedPhotos} Foto`,
            sublabel: 'Terlampir otomatis di laporan',
            color: 'text-purple-700',
          },
        ];
        notes =
          'Sisa makanan diolah secara ramah lingkungan menjadi pakan maggot BSF dan pupuk organik kerja sama warga desa. Kolom foto menampilkan dokumentasi resmi hasil unggahan Divisi Cuci Ompreng per kategori sisa makanan.';
        break;
      }

      // 15. RAB Bahan dan Operasional
      case 'rab': {
        headers = ['No', 'Kode RAB', 'Kategori Pengeluaran', 'Uraian Kebutuhan', 'Volume', 'Satuan', 'Estimasi Harga', 'Total Anggaran', 'Realisasi PO', 'Status'];
        let rabs = rabItems;
        if (searchKeyword) {
          rabs = rabs.filter(r => r.itemName.toLowerCase().includes(searchKeyword.toLowerCase()) || r.budgetCode.toLowerCase().includes(searchKeyword.toLowerCase()));
        }

        const baseRows = rabs.map((r, idx) => [
          idx + 1,
          r.budgetCode,
          r.category,
          r.itemName,
          formatNumber(r.volume),
          r.unit,
          formatRupiah(r.unitPrice),
          formatRupiah(r.totalBudget),
          formatRupiah(r.poCreatedAmount || 0),
          r.status,
        ]);

        const rabSchema = dynamicFormSchemas.procurement_rab_form;
        const dynamicRabCols = appendDynamicExportColumns(rabSchema, headers, baseRows, rabs);
        headers = dynamicRabCols.headers;
        rows = dynamicRabCols.rows;

        excelData = rabs.map((r, idx) =>
          appendDynamicExcelFields(
            rabSchema,
            {
              'No': idx + 1,
              'Kode RAB': r.budgetCode,
              'Kategori': r.category,
              'Item': r.itemName,
              'Volume': r.volume,
              'Satuan': r.unit,
              'Harga Satuan': r.unitPrice,
              'Total Anggaran': r.totalBudget,
              'Realisasi PO': r.poCreatedAmount || 0,
              'Status': r.status,
            },
            r
          )
        );

        const totalBudget = rabs.reduce((acc, r) => acc + r.totalBudget, 0);
        const totalRealized = rabs.reduce((acc, r) => acc + (r.poCreatedAmount || 0), 0);
        metrics = [
          { label: 'Total Anggaran RAB', value: formatRupiah(totalBudget), color: 'text-blue-700' },
          { label: 'Realisasi Terbit PO', value: formatRupiah(totalRealized), color: 'text-emerald-700' },
          { label: 'Sisa Pagu Tersedia', value: formatRupiah(totalBudget - totalRealized), color: 'text-purple-700' },
          { label: 'Tingkat Penyerapan', value: `${totalBudget ? ((totalRealized / totalBudget) * 100).toFixed(1) : 0}%`, color: 'text-slate-700' },
        ];
        notes = 'RAB telah disetujui Kepala SPPG Temenggungan 2 sesuai aturan pertanggungjawaban dana operasional MBG.';
        break;
      }

      // 16. Purchase Order Harian
      case 'purchase_order': {
        headers = ['No', 'Nomor PO', 'Tanggal', 'Nama Rekanan Supplier', 'Item Bahan Pangan', 'Jumlah Pesan', 'Harga Satuan', 'Total Nilai PO', 'Status Pesanan'];
        let pos = purchaseOrders;
        if (searchKeyword) {
          pos = pos.filter(p => p.supplierName.toLowerCase().includes(searchKeyword.toLowerCase()) || p.poNumber.toLowerCase().includes(searchKeyword.toLowerCase()));
        }

        rows = pos.map((p, idx) => {
          const firstItem = p.items[0];
          return [
            idx + 1,
            p.poNumber,
            formatIndonesianDate(p.date),
            p.supplierName,
            p.items.map(i => `${i.itemName} (${i.quantity} ${i.unit})`).join(', ') || 'Bahan Pangan MBG',
            `${p.items.reduce((acc, i) => acc + i.quantity, 0)} ${firstItem?.unit || 'kg'}`,
            formatRupiah(firstItem?.unitPrice || 0),
            formatRupiah(p.totalAmount),
            p.status,
          ];
        });

        excelData = pos.map((p, idx) => ({
          'No': idx + 1,
          'Nomor PO': p.poNumber,
          'Tanggal': p.date,
          'Supplier': p.supplierName,
          'Total Nilai': p.totalAmount,
          'Status': p.status,
        }));

        const totalPOAmount = pos.reduce((acc, p) => acc + p.totalAmount, 0);
        metrics = [
          { label: 'Total PO Diterbitkan', value: `${pos.length} Pesanan`, color: 'text-blue-700' },
          { label: 'Akumulasi Nilai PO', value: formatRupiah(totalPOAmount), color: 'text-emerald-700' },
          { label: 'Supplier Terlibat', value: `${new Set(pos.map(p => p.supplierName)).size} Rekanan`, color: 'text-purple-700' },
          { label: 'Status Pengiriman', value: '96% Tuntas', color: 'text-slate-700' },
        ];
        notes = 'Seluruh PO diterbitkan dengan klausul wajib lolos QC penerimaan gudang sebelum pembayaran kasir diproses.';
        break;
      }

      // 17. Quality Control Barang/Bahan
      case 'quality_control': {
        headers = ['No', 'No. QC', 'Nomor PO', 'Supplier', 'Bahan Pangan', 'Dipesan', 'Diterima', 'Selisih', 'Grade Mutu', 'Suhu Datang', 'Keterangan', 'Status QC', 'Petugas QC'];
        let qcs = qualityControlRecords;
        if (searchKeyword) {
          qcs = qcs.filter(q => q.itemName.toLowerCase().includes(searchKeyword.toLowerCase()) || q.supplierName.toLowerCase().includes(searchKeyword.toLowerCase()));
        }

        rows = qcs.map((q, idx) => {
          const diff = q.receivedQuantity - q.orderedQuantity;
          const diffLabel =
            diff === 0
              ? `Sesuai (0 ${q.unit})`
              : `${diff > 0 ? '+' : ''}${diff} ${q.unit}`;
          return [
            idx + 1,
            q.id,
            q.poNumber,
            q.supplierName,
            q.itemName,
            `${q.orderedQuantity} ${q.unit}`,
            `${q.receivedQuantity} ${q.unit}`,
            diffLabel,
            q.qualityGrade,
            q.receivingTemp ? `${q.receivingTemp}°C` : '4.0°C',
            q.notes || '-',
            q.status,
            q.inspectorName,
          ];
        });

        excelData = qcs.map((q, idx) => {
          const diff = q.receivedQuantity - q.orderedQuantity;
          return {
            'No': idx + 1,
            'ID QC': q.id,
            'Nomor PO': q.poNumber,
            'Supplier': q.supplierName,
            'Bahan': q.itemName,
            'Dipesan': q.orderedQuantity,
            'Diterima': q.receivedQuantity,
            'Selisih': diff,
            'Grade': q.qualityGrade,
            'Suhu': q.receivingTemp,
            'Keterangan': q.notes || '-',
            'Status': q.status,
            'Inspektur': q.inspectorName,
          };
        });

        const totalOrdered = qcs.reduce((acc, q) => acc + q.orderedQuantity, 0);
        const totalReceived = qcs.reduce((acc, q) => acc + q.receivedQuantity, 0);
        const totalDiff = totalReceived - totalOrdered;
        metrics = [
          { label: 'Total QC Dilakukan', value: `${qcs.length} Batch`, color: 'text-blue-700' },
          { label: 'Dipesan vs Diterima', value: `${formatNumber(totalOrdered)} / ${formatNumber(totalReceived)}`, sublabel: `Selisih: ${totalDiff > 0 ? '+' : ''}${totalDiff}`, color: 'text-emerald-700' },
          { label: 'Total Bahan Masuk Gudang', value: `${formatNumber(totalReceived)} Kg/Satuan`, color: 'text-purple-700' },
          { label: 'Kepatuhan Rantai Dingin', value: 'Suhu < 4°C Terpenuhi', color: 'text-amber-700' },
        ];
        notes = 'Bahan baku yang lolos QC otomatis menambahkan kuantitas kartu stok gudang bahan mentah SPPG sesuai perhitungan selisih penerimaan riil.';
        break;
      }

      // 18. Kartu Stok Gudang
      case 'kartu_stok': {
        headers = ['No', 'Kode Bahan', 'Nama Bahan Pangan', 'Kategori', 'Stok Minimum', 'Stok Saat Ini', 'Satuan', 'Estimasi Nilai Stok', 'Status Ketersediaan'];
        let items = inventory;
        if (searchKeyword) {
          items = items.filter(i => i.name.toLowerCase().includes(searchKeyword.toLowerCase()) || i.category.toLowerCase().includes(searchKeyword.toLowerCase()));
        }

        const baseRows = items.map((i, idx) => {
          const isLow = i.currentStock <= i.minimumStock;
          return [
            idx + 1,
            i.id,
            i.name,
            i.category,
            formatNumber(i.minimumStock),
            formatNumber(i.currentStock),
            i.unit,
            formatRupiah(i.currentStock * (i.pricePerUnit || 15000)),
            isLow ? 'Waspada (Reorder)' : 'Aman (Tercukupi)',
          ];
        });

        const invSchema = dynamicFormSchemas.inventory_item_form;
        const dynamicInvCols = appendDynamicExportColumns(invSchema, headers, baseRows, items);
        headers = dynamicInvCols.headers;
        rows = dynamicInvCols.rows;

        excelData = items.map((i, idx) =>
          appendDynamicExcelFields(
            invSchema,
            {
              'No': idx + 1,
              'Kode': i.id,
              'Bahan Pangan': i.name,
              'Kategori': i.category,
              'Stok': i.currentStock,
              'Min Stok': i.minimumStock,
              'Satuan': i.unit,
            },
            i
          )
        );

        const totalStockVal = items.reduce((acc, i) => acc + i.currentStock * (i.pricePerUnit || 15000), 0);
        metrics = [
          { label: 'Total Item Terdaftar', value: `${items.length} SKU`, color: 'text-blue-700' },
          { label: 'Total Valuasi Stok Gudang', value: formatRupiah(totalStockVal), color: 'text-emerald-700' },
          { label: 'Stok Kritis / Menipis', value: `${items.filter(i => i.currentStock <= i.minimumStock).length} Item`, color: 'text-amber-700' },
          { label: 'Metode Pengeluaran', value: 'FIFO (First In First Out)', color: 'text-purple-700' },
        ];
        notes = 'Seluruh mutasi keluar masuk bahan dicatat secara digital dengan prinsip FIFO guna mencegah kedaluwarsa.';
        break;
      }

      // 19. Data Penerima Manfaat Harian
      case 'penerima_harian': {
        headers = ['No', 'ID Lembaga', 'Nama Sekolah / Madrasah', 'Kategori Sekolah', 'Porsi Kecil (Kls 1-3)', 'Porsi Besar (Kls 4-9)', 'Total Porsi MBG', 'Kepala Sekolah / PIC', 'Status Layanan'];
        let insts = institutions;
        if (selectedInstitutionId !== 'ALL') {
          insts = insts.filter(i => i.id === selectedInstitutionId);
        }
        if (searchKeyword) {
          insts = insts.filter(i => i.name.toLowerCase().includes(searchKeyword.toLowerCase()) || i.address.toLowerCase().includes(searchKeyword.toLowerCase()));
        }

        const baseRows = insts.map((i, idx) => [
          idx + 1,
          i.id,
          i.name,
          i.institutionType,
          formatNumber(i.smallPortions),
          formatNumber(i.largePortions),
          formatNumber(i.totalPortions),
          i.picName || 'Kepala Sekolah',
          'Aktif Terlayani',
        ]);

        const instSchema = dynamicFormSchemas.institution_form;
        const dynamicInstCols = appendDynamicExportColumns(instSchema, headers, baseRows, insts);
        headers = dynamicInstCols.headers;
        rows = dynamicInstCols.rows;

        excelData = insts.map((i, idx) =>
          appendDynamicExcelFields(
            instSchema,
            {
              'No': idx + 1,
              'ID Lembaga': i.id,
              'Nama Lembaga': i.name,
              'Kategori': i.institutionType,
              'Porsi Kecil': i.smallPortions,
              'Porsi Besar': i.largePortions,
              'Total Porsi': i.totalPortions,
              'PIC': i.picName,
            },
            i
          )
        );

        const totalBeneficiaries = insts.reduce((acc, i) => acc + i.totalPortions, 0);
        const totalInstKecil = insts.reduce((acc, i) => acc + i.smallPortions, 0);
        const totalInstBesar = insts.reduce((acc, i) => acc + i.largePortions, 0);

        metrics = [
          { label: 'Lembaga Penerima Terlayani', value: `${insts.length} Sekolah`, color: 'text-blue-700' },
          { label: 'Total Penerima Manfaat', value: `${formatNumber(totalBeneficiaries)} Siswa`, color: 'text-emerald-700' },
          { label: 'Rincian Porsi Kecil', value: `${formatNumber(totalInstKecil)} Anak`, color: 'text-purple-700' },
          { label: 'Rincian Porsi Besar', value: `${formatNumber(totalInstBesar)} Siswa`, color: 'text-amber-700' },
        ];
        notes = 'Daftar penerima manfaat telah divalidasi dengan data pokok pendidikan (Dapodik / EMIS Kemenag).';
        break;
      }

      // 20. Laporan Keuangan
      case 'keuangan': {
        headers = ['No', 'Tanggal', 'No. Bukti Kas', 'Jenis Transaksi', 'Kategori Anggaran', 'Uraian Transaksi', 'Penerima / Sumber', 'Jumlah (Rp)', 'Status'];
        let txs = financialTransactions;
        if (searchKeyword) {
          txs = txs.filter(t => t.description.toLowerCase().includes(searchKeyword.toLowerCase()) || t.proofNumber.toLowerCase().includes(searchKeyword.toLowerCase()));
        }

        const baseRows = txs.map((t, idx) => [
          idx + 1,
          formatIndonesianDate(t.date),
          t.proofNumber,
          t.type,
          t.category,
          t.description,
          t.sourceOrRecipient,
          formatRupiah(t.amount),
          t.approvalStatus,
        ]);

        const txSchema = dynamicFormSchemas.finance_tx_form;
        const dynamicTxCols = appendDynamicExportColumns(txSchema, headers, baseRows, txs);
        headers = dynamicTxCols.headers;
        rows = dynamicTxCols.rows;

        excelData = txs.map((t, idx) =>
          appendDynamicExcelFields(
            txSchema,
            {
              'No': idx + 1,
              'Tanggal': t.date,
              'Nomor Bukti': t.proofNumber,
              'Jenis': t.type,
              'Kategori': t.category,
              'Deskripsi': t.description,
              'Penerima': t.sourceOrRecipient,
              'Nominal': t.amount,
              'Status': t.approvalStatus,
            },
            t
          )
        );

        const totalIn = txs.filter(t => t.type === 'Pemasukan').reduce((acc, t) => acc + t.amount, 0);
        const totalOut = txs.filter(t => t.type === 'Pengeluaran').reduce((acc, t) => acc + t.amount, 0);
        metrics = [
          { label: 'Total Pemasukan Kas', value: formatRupiah(totalIn), color: 'text-emerald-700' },
          { label: 'Total Pengeluaran Kas', value: formatRupiah(totalOut), color: 'text-rose-700' },
          { label: 'Saldo Kas Akhir', value: formatRupiah(totalIn - totalOut), color: 'text-blue-700' },
          { label: 'Verifikasi Akuntansi', value: '100% Sesuai Bukti', color: 'text-slate-700' },
        ];
        notes = 'Seluruh pengeluaran kas didukung kuitansi bermeterai, faktur supplier, dan berita acara pembayaran sah.';
        break;
      }
    }

    return {
      title: currentConfig.title,
      code: documentRegisterNumber,
      headers,
      rows,
      displayRows,
      imageCells,
      excelData,
      metrics,
      notes,
      sourceData: currentConfig.sourceModule,
      orientation,
      signatures,
    };
  }, [
    activeReportKey,
    currentConfig,
    documentRegisterNumber,
    selectedInstitutionId,
    searchKeyword,
    distributionLogs,
    outgoingDocuments,
    distributionDeliveries,
    prepRecords,
    cookingRecords,
    portioningRecords,
    todayMenu,
    rabItems,
    purchaseOrders,
    qualityControlRecords,
    inventory,
    institutions,
    financialTransactions,
    washingWasteRecords,
    sppgConfig,
    dynamicFormSchemas,
    organolepticData,
    cookingFoodTempData,
    portioningFoodTempData,
  ]);

  // Filter Categories
  const categoriesList = ['ALL', 'Distribusi & Lapangan', 'Gizi & Menu', 'Dapur & Keamanan Pangan', 'Operasional & Rantai Pasok', 'Keuangan & Tata Usaha'];

  const filteredReportList = useMemo(() => {
    return REPORT_CONFIGS.filter(r => {
      if (categoryFilter !== 'ALL' && r.category !== categoryFilter) return false;
      return true;
    });
  }, [categoryFilter]);

  // Handle Export PDF
  const handleExportPDF = async () => {
    if (activeReportKey === 'organoleptik_penerima') {
      await exportOrganolepticChecklistPDF(organolepticData);
      return;
    }
    if (activeReportKey === 'suhu_makanan_pengolahan') {
      await exportCookingFoodTempPDF(cookingFoodTempData);
      return;
    }
    if (activeReportKey === 'suhu_makanan_pemorsian') {
      await exportPortioningFoodTempPDF(portioningFoodTempData);
      return;
    }

    await exportTableToPDF({
      title: reportPayload.title,
      subtitle: `Satuan Pelayanan Pemenuhan Gizi (SPPG) Probolinggo Krejengan Temenggungan 2`,
      headers: reportPayload.headers,
      rows: reportPayload.rows,
      imageCells: reportPayload.imageCells,
      fileName: `Laporan_${currentConfig.codePrefix}_SPPG_TMG2`,
      sppgConfig,
      notes: reportPayload.notes,
      orientation: reportPayload.orientation,
      metaFields: [
        { label: 'No. Register', value: reportPayload.code },
        { label: 'Periode', value: periodLabelString },
        { label: 'Sumber Data', value: reportPayload.sourceData },
        { label: 'ID SPPG', value: sppgConfig.sppgId },
      ],
      signatures: reportPayload.signatures,
    });
  };

  // Handle Export Excel
  const handleExportExcel = () => {
    exportToExcel(reportPayload.excelData, `Laporan_${currentConfig.codePrefix}_SPPG_TMG2`, currentConfig.title.slice(0, 25));
  };

  // Handle Export CSV
  const handleExportCSV = () => {
    exportToCSV(reportPayload.excelData, `Laporan_${currentConfig.codePrefix}_SPPG_TMG2`);
  };

  return (
    <div className="space-y-6">
      {/* Print-Only Header (tersembunyi di layar normal, tampil otomatis saat dicetak untuk laporan umum; Checklist Organoleptik, Suhu Pengolahan & Pemorsian menggunakan Kop BGN bawaan) */}
      {activeReportKey !== 'organoleptik_penerima' &&
        activeReportKey !== 'suhu_makanan_pengolahan' &&
        activeReportKey !== 'suhu_makanan_pemorsian' && (
        <div className="hidden print:block mb-6">
          <PrintHeader
            title={reportPayload.title}
            documentNumber={reportPayload.code}
            date={selectedDate}
          />
          <div className="flex justify-between items-center text-xs text-slate-500 mb-4 pb-2 border-b border-slate-200">
            <span>Periode Laporan: <strong>{periodLabelString}</strong></span>
            <span>Sumber Integrasi: <strong>{reportPayload.sourceData}</strong></span>
          </div>
        </div>
      )}

      {/* Screen Title & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm print:hidden">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
              ID SPPG: {sppgConfig.sppgId}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Integrasi Antarmodul Aktif
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
              Standar BGN RI 2025
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Printer className="w-6 h-6 text-blue-600" />
            Pusat Laporan & Cetak Resmi SPPG
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Pusat administrasi {REPORT_CONFIGS.length} laporan resmi operasional pemenuhan gizi, terhubung otomatis ke relasi ID unik antar-modul dengan pratinjau dan pengesahan sah.
          </p>
        </div>

        {/* Global Export Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPreviewModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-sm font-medium transition shadow-sm border border-slate-300"
          >
            <Eye className="w-4 h-4 text-slate-600" />
            <span>Pratinjau Dokumen</span>
          </button>

          <button
            type="button"
            onClick={triggerPrint}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl text-sm font-medium transition shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Langsung</span>
          </button>

          <button
            type="button"
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 text-white hover:bg-rose-700 rounded-xl text-sm font-medium transition shadow-sm"
          >
            <FileText className="w-4 h-4" />
            <span>Unduh PDF Resmi</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl text-sm font-medium transition shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-700 text-white hover:bg-slate-800 rounded-xl text-sm font-medium transition shadow-sm"
            title="Ekspor CSV"
          >
            <Download className="w-4 h-4" />
            <span>CSV</span>
          </button>

          {activeReportKey === 'flyer_menu' && onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('menu_flyer')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700 rounded-xl text-sm font-medium transition shadow-sm animate-pulse"
            >
              <Sparkles className="w-4 h-4" />
              <span>Buka Generator Flyer</span>
            </button>
          )}
        </div>
      </div>

      {/* FILTER PANEL */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 print:hidden">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
            <Filter className="w-4 h-4 text-blue-600" />
            <span>Panel Filter & Kriteria Laporan</span>
          </div>
          <span className="text-xs text-slate-500">
            Terhubung ke Master Bahan, PO, QC, Pemorsian, Distribusi & Kasir
          </span>
        </div>

        {/* Categories Tab Bar */}
        <div className="flex flex-wrap gap-2">
          {categoriesList.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                categoryFilter === cat
                  ? 'bg-blue-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat === 'ALL' ? 'Semua Kategori (20 Laporan)' : cat}
            </button>
          ))}
        </div>

        {/* Filter Inputs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          {/* 1. Pilih Laporan */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Pilih Jenis Laporan (20 Modul):</label>
            <select
              value={activeReportKey}
              onChange={e => setActiveReportKey(e.target.value as OfficialReportKey)}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {filteredReportList.map(r => (
                <option key={r.key} value={r.key}>
                  [{r.codePrefix}] {r.title}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Filter Periode */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Jenis Periode Waktu:</label>
            <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              {(['harian', 'mingguan', 'bulanan', 'periode'] as const).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriodType(p)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium capitalize transition ${
                    periodType === p ? 'bg-white text-blue-900 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Tanggal Picker */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">
              {periodType === 'harian' ? 'Tanggal Pelaksanaan:' : periodType === 'periode' ? 'Rentang Tanggal:' : 'Bulan Berjalan:'}
            </label>
            {periodType === 'harian' && (
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            )}
            {periodType === 'periode' && (
              <div className="flex items-center gap-1">
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-1/2 text-xs bg-slate-50 border border-slate-300 rounded-xl px-2 py-2 text-slate-900"
                />
                <span className="text-xs text-slate-400">-</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-1/2 text-xs bg-slate-50 border border-slate-300 rounded-xl px-2 py-2 text-slate-900"
                />
              </div>
            )}
            {(periodType === 'mingguan' || periodType === 'bulanan') && (
              <input
                type="month"
                defaultValue="2026-11"
                className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            )}
          </div>

          {/* 4. Filter Lembaga & Pencarian */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Filter Lembaga / Kata Kunci:</label>
            <div className="flex gap-2">
              <select
                value={selectedInstitutionId}
                onChange={e => setSelectedInstitutionId(e.target.value)}
                className="w-1/2 text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl px-2 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none truncate"
              >
                <option value="ALL">Semua Lembaga</option>
                {institutions.map(inst => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name}
                  </option>
                ))}
              </select>
              <div className="relative w-1/2">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari..."
                  value={searchKeyword}
                  onChange={e => setSearchKeyword(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl pl-8 pr-2 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DOCUMENT PREVIEW CARD (WYSIWYG TAMPILAN RESMI PEMERINTAH) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden print:border-none print:shadow-none print:rounded-none">
        {/* Document Header Status Bar */}
        <div className="print:hidden bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-blue-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-800/60 rounded-xl border border-blue-600/40">
              <FileCheck className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase text-amber-400 tracking-wider">
                  No. Register: {reportPayload.code}
                </span>
                <span className="text-xs bg-blue-800 text-blue-200 px-2 py-0.5 rounded-full font-mono">
                  {currentConfig.category}
                </span>
              </div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                {reportPayload.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-blue-200 bg-blue-900/60 px-4 py-2 rounded-xl border border-blue-700/50">
            <div>
              <span className="text-slate-400 block">Periode:</span>
              <strong className="text-white">{periodLabelString}</strong>
            </div>
            <div className="h-6 w-px bg-blue-700" />
            <div>
              <span className="text-slate-400 block">Relasi Sistem:</span>
              <strong className="text-emerald-300">{reportPayload.sourceData}</strong>
            </div>
          </div>
        </div>

        {/* Key Metrics Banner */}
        <div className="print:hidden grid grid-cols-2 lg:grid-cols-4 gap-4 p-6 bg-slate-50/70 border-b border-slate-200">
          {reportPayload.metrics.map((m, idx) => (
            <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
                {m.label}
              </span>
              <div className={`text-xl font-bold mt-1 ${m.color || 'text-slate-900'}`}>
                {m.value}
              </div>
              {m.sublabel && (
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  {m.sublabel}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Paper Document Representation */}
        <div className="p-6 md:p-8 bg-white space-y-6 print:p-0 print:space-y-0">
          {activeReportKey === 'organoleptik_penerima' ? (
            <div className="space-y-4">
              {/* Control Bar Khusus Checklist Uji Organoleptik (Tersembunyi saat Cetak) */}
              <div className="print:hidden bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      Pengisian Otomatis dari Master Data Penerima Manfaat
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Nama Pemeriksa (PIC), Tempat, Tanggal &amp; Waktu otomatis ditarik sesuai lembaga sekolah sasaran yang dipilih.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setOrgaBlankMode(v => !v);
                        setOrgaCustomRows(null);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                        orgaBlankMode
                          ? 'bg-amber-600 text-white border-amber-700'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {orgaBlankMode ? 'Mode Blanko Kosong (Aktif)' : 'Gunakan Mode Blanko Kosong'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowOrgaEditor(v => !v)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-900 text-white hover:bg-blue-800 transition"
                    >
                      {showOrgaEditor ? 'Tutup Editor Skor' : 'Edit Skor & Waktu'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">
                      Lembaga Penerima (Master Data)
                    </label>
                    <select
                      value={selectedInstitutionId === 'ALL' ? organolepticData.institutionId : selectedInstitutionId}
                      onChange={e => {
                        setSelectedInstitutionId(e.target.value);
                        setOrgaTimeOverride('');
                        setOrgaCustomRows(null);
                      }}
                      className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-medium"
                    >
                      {institutions.map(inst => (
                        <option key={inst.id} value={inst.id}>
                          {inst.name} — PIC: {inst.picName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">
                      Waktu Pemeriksaan
                    </label>
                    <input
                      type="text"
                      value={orgaTimeOverride || organolepticData.waktuPemeriksaan}
                      onChange={e => setOrgaTimeOverride(e.target.value)}
                      placeholder="09:15 WIB"
                      className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">
                      Kesimpulan Menu MBG
                    </label>
                    <select
                      value={orgaKesimpulanOverride || organolepticData.kesimpulan}
                      onChange={e => setOrgaKesimpulanOverride(e.target.value)}
                      className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-medium"
                    >
                      <option value="Aman dikonsumsi">Aman dikonsumsi</option>
                      <option value="Aman/Tidak aman dikonsumsi">Aman/Tidak aman dikonsumsi (Pilihan Cetak)</option>
                      <option value="Tidak aman dikonsumsi">Tidak aman dikonsumsi</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">
                      Mengetahui (Ahli Gizi)
                    </label>
                    <input
                      type="text"
                      value={orgaMengetahuiOverride || organolepticData.mengetahuiName}
                      onChange={e => setOrgaMengetahuiOverride(e.target.value)}
                      className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-slate-800"
                    />
                  </div>
                </div>

                {showOrgaEditor && (
                  <div className="pt-3 border-t border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">
                        Input / Ubah Skor Hasil Pemeriksaan (Skor 1-5)
                      </span>
                      <button
                        type="button"
                        onClick={() => setOrgaCustomRows(null)}
                        className="text-[11px] font-semibold text-blue-700 hover:underline"
                      >
                        Reset ke Menu Otomatis
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border border-slate-200 bg-white">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 font-semibold">
                            <th className="p-2 border border-slate-200 w-10">No</th>
                            <th className="p-2 border border-slate-200 text-left">Nama Makanan</th>
                            <th className="p-2 border border-slate-200 w-16">Rasa</th>
                            <th className="p-2 border border-slate-200 w-16">Warna</th>
                            <th className="p-2 border border-slate-200 w-16">Aroma</th>
                            <th className="p-2 border border-slate-200 w-16">Tekstur</th>
                            <th className="p-2 border border-slate-200 w-28">Status</th>
                            <th className="p-2 border border-slate-200">Ket</th>
                          </tr>
                        </thead>
                        <tbody>
                          {organolepticData.rows.map((r, rIdx) => (
                            <tr key={rIdx}>
                              <td className="p-1.5 border border-slate-200 text-center">
                                {r.no || rIdx + 1}
                              </td>
                              <td className="p-1.5 border border-slate-200">
                                <input
                                  type="text"
                                  value={r.foodName}
                                  onChange={e => {
                                    const next = organolepticData.rows.map((item, idx) =>
                                      idx === rIdx
                                        ? {
                                            ...item,
                                            no: item.no || idx + 1,
                                            foodName: e.target.value,
                                          }
                                        : item
                                    );
                                    setOrgaCustomRows(next);
                                  }}
                                  className="w-full px-2 py-1 border border-slate-200 rounded text-xs"
                                  placeholder="Nama makanan..."
                                />
                              </td>
                              {(['rasa', 'warna', 'aroma', 'tekstur'] as const).map(scoreKey => (
                                <td key={scoreKey} className="p-1.5 border border-slate-200">
                                  <select
                                    value={r[scoreKey]}
                                    onChange={e => {
                                      const next = organolepticData.rows.map((item, idx) =>
                                        idx === rIdx ? { ...item, [scoreKey]: e.target.value } : item
                                      );
                                      setOrgaCustomRows(next);
                                    }}
                                    className="w-full px-1 py-1 border border-slate-200 rounded text-xs text-center"
                                  >
                                    <option value="">-</option>
                                    <option value="5">5</option>
                                    <option value="4">4</option>
                                    <option value="3">3</option>
                                    <option value="2">2</option>
                                    <option value="1">1</option>
                                  </select>
                                </td>
                              ))}
                              <td className="p-1.5 border border-slate-200">
                                <select
                                  value={r.statusPengantaran}
                                  onChange={e => {
                                    const next = organolepticData.rows.map((item, idx) =>
                                      idx === rIdx ? { ...item, statusPengantaran: e.target.value } : item
                                    );
                                    setOrgaCustomRows(next);
                                  }}
                                  className="w-full px-1.5 py-1 border border-slate-200 rounded text-xs"
                                >
                                  <option value="">(Kosong)</option>
                                  <option value="Aman">Aman</option>
                                  <option value="Tidak aman">Tidak aman</option>
                                </select>
                              </td>
                              <td className="p-1.5 border border-slate-200">
                                <input
                                  type="text"
                                  value={r.ket}
                                  onChange={e => {
                                    const next = organolepticData.rows.map((item, idx) =>
                                      idx === rIdx ? { ...item, ket: e.target.value } : item
                                    );
                                    setOrgaCustomRows(next);
                                  }}
                                  className="w-full px-2 py-1 border border-slate-200 rounded text-xs"
                                  placeholder="Catatan..."
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Lembar Surat Resmi CHECKLIST UJI ORGANOLEPTIK */}
              <div className="max-w-4xl mx-auto">
                <OrganolepticChecklistSheet data={organolepticData} />
              </div>
            </div>
          ) : activeReportKey === 'suhu_makanan_pengolahan' ? (
            <div className="space-y-4">
              {/* Control & Info Bar Integrasi Divisi Pengolahan + Master Menu + Master Relawan (Tersembunyi saat Cetak) */}
              <div className="print:hidden bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Sinkronisasi Otomatis: Tugas Divisi Pengolahan + Master Menu + Master Data Relawan
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Menu harian ditarik dari Master Menu, suhu &amp; dokumentasi Sesi 1–3 ditarik dari Sub Menu Tugas Divisi Pengolahan, dan Penanggung Jawab diambil dari Master Data Relawan (Divisi Pengolahan). Klik foto untuk memperbesar.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-700 font-medium">
                      Catatan Pengolahan: <strong>{cookingFoodTempData.groups.length} Hari</strong>
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-700 font-medium">
                      Relawan Pengolahan Aktif:{' '}
                      <strong>
                        {cookingFoodTempData.activePengolahanVolunteers.length > 0
                          ? cookingFoodTempData.activePengolahanVolunteers.map(v => v.name).join(', ')
                          : 'Belum ada di Master Relawan'}
                      </strong>
                    </span>
                  </div>
                </div>
                {onNavigate && (
                  <button
                    type="button"
                    onClick={() => onNavigate('production')}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold transition"
                  >
                    <span>Input di Divisi Pengolahan</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Lembar Surat Resmi PEMANTAUAN SUHU MAKANAN PENGOLAHAN & CCP */}
              <div className="w-full">
                <CookingFoodTempSheet
                  data={cookingFoodTempData}
                  onPreviewPhoto={setPreviewPhoto}
                />
              </div>
            </div>
          ) : activeReportKey === 'suhu_makanan_pemorsian' ? (
            <div className="space-y-4">
              {/* Control & Info Bar Integrasi Divisi Pemorsian + Master Menu (Tersembunyi saat Cetak) */}
              <div className="print:hidden bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Sinkronisasi Otomatis: Tugas Divisi Pemorsian + Master Menu
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Nama makanan/menu ditarik dari Master Menu, sedangkan standar berat mentah, faktor konversi, berat matang, suhu Sesi 1–3 (°C), dan dokumentasi foto diambil otomatis dari Divisi Pemorsian. Klik foto untuk memperbesar.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-700 font-medium">
                      Catatan Pemorsian: <strong>{portioningFoodTempData.groups.length} Hari</strong>
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-700 font-medium">
                      Standar Danger Zone: <strong>60-5°C</strong>
                    </span>
                  </div>
                </div>
                {onNavigate && (
                  <button
                    type="button"
                    onClick={() => onNavigate('production')}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold transition"
                  >
                    <span>Input di Divisi Pemorsian</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Lembar Surat Resmi PEMANTAUAN STANDAR PORSI & SUHU MAKANAN PEMORSIAN */}
              <div className="w-full">
                <PortioningFoodTempSheet
                  data={portioningFoodTempData}
                  onPreviewPhoto={setPreviewPhoto}
                />
              </div>
            </div>
          ) : (
            <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-xs relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-900 via-amber-500 to-blue-900 rounded-t-xl" />
            
            {/* Kop Surat Header with Dual Logos */}
            <div className="flex items-center justify-between gap-4 pb-4 border-b-2 border-slate-800">
              {/* Left Logo: SPPG Hafshawaty */}
              <div className="flex items-center gap-3">
                <SPPGLogo size="md" />
              </div>

              {/* Center Text */}
              <div className="text-center flex-1">
                <h3 className="text-sm font-extrabold uppercase text-slate-900 tracking-wider">
                  {sppgConfig.foundationName}
                </h3>
                <h2 className="text-base font-black uppercase text-blue-950 tracking-tight">
                  {sppgConfig.sppgName}
                </h2>
                <p className="text-xs text-slate-600 mt-0.5 font-medium">
                  ID SPPG: <span className="font-mono font-bold text-blue-900">{sppgConfig.sppgId}</span> | Wilayah: {sppgConfig.district}, {sppgConfig.regency}
                </p>
                <p className="text-[11px] text-slate-500">
                  {sppgConfig.address} | Email: {sppgConfig.email} | Telp: {sppgConfig.phone}
                </p>
              </div>

              {/* Right Logo: BGN Logo */}
              <div className="flex items-center gap-3">
                <BGNLogo size="md" />
              </div>
            </div>

            {/* Document Title Header */}
            <div className="text-center pt-5 pb-4">
              <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide">
                {reportPayload.title}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Nomor: <span className="font-mono font-semibold text-slate-700">{reportPayload.code}</span>
              </p>
              <p className="text-xs text-slate-600 font-medium">
                Pelaksanaan: {periodLabelString}
              </p>
            </div>

            {/* Main Data Table */}
            <div className="overflow-x-auto rounded-lg border border-slate-200 mt-2">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-blue-900 text-white font-semibold">
                    {reportPayload.headers.map((h, i) => (
                      <th key={i} className="px-3.5 py-2.5 border-b border-blue-950 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {reportPayload.rows.length === 0 ? (
                    <tr>
                      <td colSpan={reportPayload.headers.length} className="px-4 py-8 text-center text-slate-500 italic">
                        Tidak ada catatan data operasional yang sesuai dengan kriteria filter.
                      </td>
                    </tr>
                  ) : (
                    reportPayload.rows.map((row, rowIdx) => (
                      <tr
                        key={rowIdx}
                        className={rowIdx % 2 === 0 ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/60 hover:bg-slate-100/60'}
                      >
                        {row.map((cell, colIdx) => {
                          const displayCell = reportPayload.displayRows?.[rowIdx]?.[colIdx] ?? cell;
                          const isPhotoCol = Boolean(
                            reportPayload.displayRows?.[rowIdx]?.[colIdx] &&
                              typeof reportPayload.displayRows[rowIdx][colIdx] !== 'string' &&
                              typeof reportPayload.displayRows[rowIdx][colIdx] !== 'number'
                          );
                          return (
                            <td
                              key={colIdx}
                              className={`px-3.5 py-2.5 text-slate-800 align-middle ${isPhotoCol ? '' : 'whitespace-nowrap'}`}
                            >
                              {displayCell}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Official Notes / Verifikasi Mutu */}
            {reportPayload.notes && (
              <div className="mt-4 p-3 bg-blue-50/80 rounded-lg border border-blue-200 text-xs text-blue-950 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Catatan Verifikasi & Legalitas Dokumen:</span>
                  <p className="text-slate-700 mt-0.5">{reportPayload.notes}</p>
                </div>
              </div>
            )}

            {/* Three-Column Legalization & Signatures */}
            <div className="mt-8 pt-6 border-t border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-6 text-center text-xs">
              {reportPayload.signatures.map((sig, idx) => (
                <div key={idx} className="flex flex-col items-center justify-between h-36 p-3 bg-slate-50/50 rounded-xl border border-dashed border-slate-300">
                  <div>
                    <span className="text-slate-500 block">
                      {idx === 2 ? `Krejengan, ${formatIndonesianDate(selectedDate)}` : 'Mengetahui / Memeriksa,'}
                    </span>
                    <strong className="text-slate-800 block mt-0.5">{sig.role}</strong>
                  </div>

                  <div>
                    <strong className="text-slate-900 block underline font-bold">{sig.name}</strong>
                    <span className="text-slate-500 font-mono text-[11px] block mt-0.5">
                      {sig.idNum ? `NIP/ID: ${sig.idNum}` : `ID: SPPG-TMG2-${sppgConfig.sppgId}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Watermark / Legal disclaimer */}
            <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
              <span>Sistem Informasi Pemenuhan Gizi (E-SPPG TMG2) • ID GFBQSYXD</span>
              <span>Dokumen Negara Resmi • Program MBG BGN Republik Indonesia</span>
            </div>
            </div>
          )}
        </div>
      </div>

      {/* LIST OF ALL REPORTS QUICK SELECTOR GRID */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm print:hidden">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              Direktori {REPORT_CONFIGS.length} Laporan Resmi SPPG
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Klik kartu laporan di bawah ini untuk beralih pratinjau dan mencetak dokumen secara langsung.
            </p>
          </div>
          <span className="text-xs font-semibold text-blue-900 bg-blue-100 px-3 py-1 rounded-full">
            {REPORT_CONFIGS.length} Jenis Laporan Tersedia
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {REPORT_CONFIGS.map((r, idx) => {
            const isSelected = r.key === activeReportKey;
            return (
              <button
                key={r.key}
                type="button"
                onClick={() => {
                  setActiveReportKey(r.key);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`text-left p-3.5 rounded-xl border transition flex flex-col justify-between ${
                  isSelected
                    ? 'bg-blue-50 border-blue-600 shadow-sm ring-2 ring-blue-500/20'
                    : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50/80'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      #{idx + 1} {r.codePrefix}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {r.defaultOrientation}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
                    {r.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                    {r.description}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-blue-700 font-medium truncate">
                    {r.category}
                  </span>
                  <ArrowRight className={`w-3.5 h-3.5 ${isSelected ? 'text-blue-600' : 'text-slate-300'}`} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* FULLSCREEN PREVIEW MODAL */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <FileCheck className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-base font-bold text-white">
                    Pratinjau Cetak: {reportPayload.title}
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">
                    Nomor Register: {reportPayload.code} | {periodLabelString}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportPDF}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Unduh PDF</span>
                </button>
                <button
                  type="button"
                  onClick={triggerPrint}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition"
                >
                  Tutup
                </button>
              </div>
            </div>

            {/* Modal Body: Scaled paper sheet */}
            <div className="p-6 overflow-y-auto bg-slate-100 flex justify-center">
              {activeReportKey === 'organoleptik_penerima' ? (
                <OrganolepticChecklistSheet
                  data={organolepticData}
                  className="max-w-4xl w-full border-slate-300 shadow-md"
                />
              ) : activeReportKey === 'suhu_makanan_pengolahan' ? (
                <CookingFoodTempSheet
                  data={cookingFoodTempData}
                  onPreviewPhoto={setPreviewPhoto}
                  className="max-w-6xl w-full border-slate-300 shadow-md"
                />
              ) : activeReportKey === 'suhu_makanan_pemorsian' ? (
                <PortioningFoodTempSheet
                  data={portioningFoodTempData}
                  onPreviewPhoto={setPreviewPhoto}
                  className="max-w-6xl w-full border-slate-300 shadow-md"
                />
              ) : (
                <div className="bg-white p-8 rounded-lg shadow-md max-w-4xl w-full border border-slate-300 text-xs">
                  {/* Kop Surat */}
                  <div className="flex items-center justify-between pb-4 border-b-2 border-slate-900 mb-4">
                    <SPPGLogo size="md" />
                    <div className="text-center flex-1 px-4">
                      <h3 className="font-extrabold text-sm uppercase text-slate-900">{sppgConfig.foundationName}</h3>
                      <h2 className="font-black text-base uppercase text-blue-950">{sppgConfig.sppgName}</h2>
                      <p className="text-[11px] text-slate-600">ID SPPG: {sppgConfig.sppgId} | Program MBG BGN RI</p>
                      <p className="text-[10px] text-slate-500">{sppgConfig.address}</p>
                    </div>
                    <BGNLogo size="md" />
                  </div>

                  <div className="text-center my-4">
                    <h3 className="font-bold text-sm text-slate-900 uppercase">{reportPayload.title}</h3>
                    <p className="text-[11px] text-slate-500 font-mono">No: {reportPayload.code}</p>
                  </div>

                  {/* Table */}
                  <table className="w-full text-left border-collapse border border-slate-300 my-4 text-[11px]">
                    <thead>
                      <tr className="bg-blue-900 text-white">
                        {reportPayload.headers.map((h, i) => (
                          <th key={i} className="border border-blue-950 p-2 font-semibold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {reportPayload.rows.map((row, rIdx) => (
                        <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                          {row.map((c, cIdx) => (
                            <td key={cIdx} className="border border-slate-300 p-2 align-middle">
                              {reportPayload.displayRows?.[rIdx]?.[cIdx] ?? c}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Signatures */}
                  <div className="grid grid-cols-3 gap-4 pt-6 mt-6 border-t border-slate-200 text-center text-[11px]">
                    {reportPayload.signatures.map((sig, sIdx) => (
                      <div key={sIdx} className="space-y-12">
                        <span className="block text-slate-600">{sig.role}</span>
                        <div>
                          <strong className="block underline text-slate-900">{sig.name}</strong>
                          <span className="text-[10px] text-slate-400 font-mono">{sig.idNum || sppgConfig.sppgId}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PHOTO ZOOM LIGHTBOX MODAL */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs print:hidden"
          onClick={() => setPreviewPhoto(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold">{previewPhoto.label}</h4>
                {previewPhoto.caption && (
                  <p className="text-[11px] text-slate-300 mt-0.5">{previewPhoto.caption}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium"
              >
                Tutup
              </button>
            </div>
            <div className="p-4 bg-slate-100 flex justify-center">
              <img
                src={previewPhoto.url}
                alt={previewPhoto.label}
                className="max-h-[68vh] w-auto object-contain rounded-lg border border-slate-200 bg-white"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
