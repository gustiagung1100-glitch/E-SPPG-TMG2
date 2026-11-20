import React, { useState, useMemo } from 'react';
import { useApp, isMatchingMaterialName } from '../../lib/store';
import { PrintHeader } from '../common/PrintHeader';
import { BGNLogo, SPPGLogo } from '../common/OfficialLogos';
import {
  exportTableToPDF,
  exportToExcel,
  exportToCSV,
  formatRupiah,
  formatNumber,
  formatIndonesianDate,
  parseLocalDate,
  triggerPrint,
  TableImageCell,
} from '../../lib/exportUtils';
import { OfficialReportKey, ReportMetaConfig, ModuleKey } from '../../types';
import {
  BASTDocumentSheet,
  BASTSheetData,
  generateBastNumber,
  resolveBastAutoFields,
  exportBastDocumentPDF,
  exportBatchBastDocumentsPDF,
} from '../common/BASTDocumentSheet';
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
  PlogOrganolepticSheet,
  PlogOrganolepticItemRow,
  resolvePlogOrganolepticData,
  exportPlogOrganolepticPDF,
} from '../common/PlogOrganolepticSheet';
import {
  SuratTugasSheet,
  SuratTugasData,
  resolveSuratTugasAutoFields,
  exportSuratTugasPDF,
} from '../common/SuratTugasSheet';
import {
  RoomTempChecklistSheet,
  RoomTempChecklistData,
  resolveRoomTempChecklistData,
  exportRoomTempChecklistPDF,
} from '../common/RoomTempChecklistSheet';
import {
  FoodCostReportSheet,
  resolveFoodCostReportData,
  exportFoodCostReportPDF,
  formatRpNoSpace,
} from '../common/FoodCostReportSheet';
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
  Upload,
} from 'lucide-react';

// Pemetaan sub-menu laporan suhu ruangan & fasilitas pendingin ke ID unit fasilitas
const FACILITY_REPORT_UNIT_MAP: Partial<Record<OfficialReportKey, string>> = {
  suhu_ruang_pengolahan: 'cooking-room',
  suhu_ruang_pemorsian: 'portioning-room',
  suhu_gudang_basah: 'wet-warehouse',
  suhu_gudang_kering: 'dry-warehouse',
  suhu_freezer_1: 'freezer-1',
  suhu_freezer_2: 'freezer-2',
  suhu_chiller_1: 'fridge-1',
  suhu_chiller_2: 'fridge-2',
  suhu_chiller_3: 'fridge-3',
  suhu_chiller_4: 'fridge-4',
};

// Definisi 30 Laporan Resmi Pusat Laporan & Cetak SPPG TMG2
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
    codePrefix: 'ST-KDO',
    description: 'Surat Tugas Perjalanan Kendaraan Operasional SPPG untuk petugas & relawan (sinkron Master Relawan, Log Armada & Administrasi Surat).',
    sourceModule: 'Master Relawan, Log Armada & Administrasi Surat',
    defaultOrientation: 'portrait',
    approverRole: 'Kepala SPPG Probolinggo Krejengan Temenggungan 2',
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
    title: 'Laporan Food Cost & Efisiensi Menu (PLOG)',
    category: 'Gizi & Menu',
    codePrefix: 'FC-ANALYSIS',
    description: 'Laporan rincian Food Cost per tanggal & hidangan (Kebutuhan, Satuan, Harga Dasar, Total, Harga Porsi Kecil/Besar & Dokumentasi Ompreng) sinkron Input Food Cost Menu & Anggaran PLOG.',
    sourceModule: 'PLOG (Input Food Cost Menu & Anggaran) & Divisi Pemorsian',
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
    title: 'Pemeriksaan Makanan & Organoleptik PLOG (Nutrisionis & Head Chef)',
    category: 'Gizi & Menu',
    codePrefix: 'ORGA-PLOG',
    description: 'Kombinasi uji organoleptik internal PLOG (Visual, Aroma, Rasa, Tekstur, Suhu) dan formulir pemeriksaan Menu Basah & Menu Kering retensi 2x24 jam.',
    sourceModule: 'Pengolahan, Pemorsian & PLOG (menuId, cookingId, portioningId)',
    defaultOrientation: 'portrait',
    approverRole: 'Pengawas Gizi & Kepala SPPG',
  },

  // 3. Dapur & Keamanan Pangan
  {
    key: 'suhu_ruang_pengolahan',
    title: 'Laporan Pemantauan Suhu dan Kelembapan Ruang Pengolahan',
    category: 'Dapur & Keamanan Pangan',
    codePrefix: 'SUHU-OLAH',
    description: 'Check list pemantauan waktu, suhu (°C), kelembapan (%), dan dokumentasi foto Ruang Pengolahan (Sesi 1 Persiapan, Sesi 2 Pengolahan, Sesi 3 Pemorsian) dalam format cetak Landscape.',
    sourceModule: 'Divisi Persiapan (Sesi 1), Pengolahan (Sesi 2) & Pemorsian (Sesi 3)',
    defaultOrientation: 'landscape',
    approverRole: 'Kepala SPPG & Koordinator Sanitasi Dapur',
  },
  {
    key: 'suhu_ruang_pemorsian',
    title: 'Laporan Pemantauan Suhu dan Kelembapan Ruang Pemorsian',
    category: 'Dapur & Keamanan Pangan',
    codePrefix: 'SUHU-PORSI',
    description: 'Check list pemantauan waktu, suhu (°C), kelembapan (%), dan dokumentasi foto Ruang Pemorsian (Sesi 1 Persiapan, Sesi 2 Pengolahan, Sesi 3 Pemorsian) dalam format cetak Landscape.',
    sourceModule: 'Divisi Persiapan (Sesi 1), Pengolahan (Sesi 2) & Pemorsian (Sesi 3)',
    defaultOrientation: 'landscape',
    approverRole: 'Kepala SPPG & Koordinator Sanitasi Dapur',
  },
  {
    key: 'suhu_gudang_basah',
    title: 'Laporan Pemantauan Suhu dan Kelembapan Gudang Basah',
    category: 'Dapur & Keamanan Pangan',
    codePrefix: 'SUHU-GBASAH',
    description: 'Check list pemantauan waktu, suhu (°C), kelembapan (%), dan dokumentasi foto Gudang Basah (Sesi 1 Persiapan, Sesi 2 Pengolahan, Sesi 3 Pemorsian) dalam format cetak Landscape.',
    sourceModule: 'Divisi Persiapan (Sesi 1), Pengolahan (Sesi 2) & Pemorsian (Sesi 3)',
    defaultOrientation: 'landscape',
    approverRole: 'Kepala SPPG & Koordinator Sanitasi Dapur',
  },
  {
    key: 'suhu_gudang_kering',
    title: 'Laporan Pemantauan Suhu dan Kelembapan Gudang Kering',
    category: 'Dapur & Keamanan Pangan',
    codePrefix: 'SUHU-GKERING',
    description: 'Check list pemantauan waktu, suhu (°C), kelembapan (%), dan dokumentasi foto Gudang Kering (Sesi 1 Persiapan, Sesi 2 Pengolahan, Sesi 3 Pemorsian) dalam format cetak Landscape.',
    sourceModule: 'Divisi Persiapan (Sesi 1), Pengolahan (Sesi 2) & Pemorsian (Sesi 3)',
    defaultOrientation: 'landscape',
    approverRole: 'Kepala SPPG & Koordinator Sanitasi Dapur',
  },
  {
    key: 'suhu_freezer_1',
    title: 'Laporan Pemantauan Suhu Freezer 1',
    category: 'Dapur & Keamanan Pangan',
    codePrefix: 'SUHU-FRZ1',
    description: 'Check list pemantauan waktu, suhu (< -18°C), dan dokumentasi foto Freezer 1 (Sesi 1 Persiapan, Sesi 2 Pengolahan, Sesi 3 Pemorsian) dalam format cetak Landscape.',
    sourceModule: 'Divisi Persiapan (Sesi 1), Pengolahan (Sesi 2) & Pemorsian (Sesi 3)',
    defaultOrientation: 'landscape',
    approverRole: 'Kepala SPPG & Koordinator Sanitasi Dapur',
  },
  {
    key: 'suhu_freezer_2',
    title: 'Laporan Pemantauan Suhu Freezer 2',
    category: 'Dapur & Keamanan Pangan',
    codePrefix: 'SUHU-FRZ2',
    description: 'Check list pemantauan waktu, suhu (< -18°C), dan dokumentasi foto Freezer 2 (Sesi 1 Persiapan, Sesi 2 Pengolahan, Sesi 3 Pemorsian) dalam format cetak Landscape.',
    sourceModule: 'Divisi Persiapan (Sesi 1), Pengolahan (Sesi 2) & Pemorsian (Sesi 3)',
    defaultOrientation: 'landscape',
    approverRole: 'Kepala SPPG & Koordinator Sanitasi Dapur',
  },
  {
    key: 'suhu_chiller_1',
    title: 'Laporan Pemantauan Suhu Chiller 1',
    category: 'Dapur & Keamanan Pangan',
    codePrefix: 'SUHU-CHL1',
    description: 'Check list pemantauan waktu, suhu (4–7°C), dan dokumentasi foto Chiller 1 (Sesi 1 Persiapan, Sesi 2 Pengolahan, Sesi 3 Pemorsian) dalam format cetak Landscape.',
    sourceModule: 'Divisi Persiapan (Sesi 1), Pengolahan (Sesi 2) & Pemorsian (Sesi 3)',
    defaultOrientation: 'landscape',
    approverRole: 'Kepala SPPG & Koordinator Sanitasi Dapur',
  },
  {
    key: 'suhu_chiller_2',
    title: 'Laporan Pemantauan Suhu Chiller 2',
    category: 'Dapur & Keamanan Pangan',
    codePrefix: 'SUHU-CHL2',
    description: 'Check list pemantauan waktu, suhu (5–8°C), dan dokumentasi foto Chiller 2 (Sesi 1 Persiapan, Sesi 2 Pengolahan, Sesi 3 Pemorsian) dalam format cetak Landscape.',
    sourceModule: 'Divisi Persiapan (Sesi 1), Pengolahan (Sesi 2) & Pemorsian (Sesi 3)',
    defaultOrientation: 'landscape',
    approverRole: 'Kepala SPPG & Koordinator Sanitasi Dapur',
  },
  {
    key: 'suhu_chiller_3',
    title: 'Laporan Pemantauan Suhu Chiller 3',
    category: 'Dapur & Keamanan Pangan',
    codePrefix: 'SUHU-CHL3',
    description: 'Check list pemantauan waktu, suhu (5–8°C), dan dokumentasi foto Chiller 3 (Sesi 1 Persiapan, Sesi 2 Pengolahan, Sesi 3 Pemorsian) dalam format cetak Landscape.',
    sourceModule: 'Divisi Persiapan (Sesi 1), Pengolahan (Sesi 2) & Pemorsian (Sesi 3)',
    defaultOrientation: 'landscape',
    approverRole: 'Kepala SPPG & Koordinator Sanitasi Dapur',
  },
  {
    key: 'suhu_chiller_4',
    title: 'Laporan Pemantauan Suhu Chiller 4',
    category: 'Dapur & Keamanan Pangan',
    codePrefix: 'SUHU-CHL4',
    description: 'Check list pemantauan waktu, suhu (4–6°C), dan dokumentasi foto Chiller 4 (Sesi 1 Persiapan, Sesi 2 Pengolahan, Sesi 3 Pemorsian) dalam format cetak Landscape.',
    sourceModule: 'Divisi Persiapan (Sesi 1), Pengolahan (Sesi 2) & Pemorsian (Sesi 3)',
    defaultOrientation: 'landscape',
    approverRole: 'Kepala SPPG & Koordinator Sanitasi Dapur',
  },
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
    title: 'Laporan Quality Control (QC) Bahan dan Operasional',
    category: 'Operasional & Rantai Pasok',
    codePrefix: 'QC-INSPECT',
    description: 'Laporan Quality Control (QC) bahan pangan & operasional: jumlah dipesan, diterima, selisih, grade mutu, suhu datang, status QC, dan dokumentasi multi-foto sinkron PLOK.',
    sourceModule: 'Modul PLOK (Quality Control & Stok Gudang)',
    defaultOrientation: 'landscape',
    approverRole: 'Asisten Lapangan',
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
  {
    key: 'status_gizi_who',
    title: 'Rekap Status Gizi & Antropometri Penerima Manfaat (WHO/Kemenkes)',
    category: 'Gizi & Menu',
    codePrefix: 'ZSCORE-WHO',
    description: 'Laporan dinamis status gizi (Normal, Stunting, Underweight, Wasting), Z-Score BB/U, TB/U, BB/TB & IMT/U serta NIK terverifikasi.',
    sourceModule: 'Antropometri & Kalkulator Z-Score WHO (beneficiaryRecords)',
    defaultOrientation: 'landscape',
    approverRole: 'Ahli Gizi (Pengawas Gizi) & Kepala SPPG',
  },
];

interface ReportsModuleProps {
  onNavigate?: (module: ModuleKey) => void;
}

const INDONESIAN_MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

function normalizeInstName(name?: string): string {
  return (name || '')
    .toLowerCase()
    .replace(/\b(kecamatan|kec\.?|kabupaten|kab\.?|krejengan)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isSameInstitutionMatch(
  inst: { id?: string; name?: string },
  targetId?: string,
  targetName?: string
): boolean {
  if (targetId && inst.id && inst.id === targetId) {
    if (!targetName || !inst.name) return true;
    const a = normalizeInstName(inst.name);
    const b = normalizeInstName(targetName);
    if (a === b || a.includes(b) || b.includes(a)) return true;
  }
  if (targetName && inst.name) {
    const a = normalizeInstName(inst.name);
    const b = normalizeInstName(targetName);
    if (a && b && (a === b || a.includes(b) || b.includes(a))) return true;
  }
  return false;
}

function matchesMaterialFlexible(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  if (isMatchingMaterialName(a, b)) return true;
  const cleanTokens = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(tok => tok.length >= 4 && !['segar', 'standar', 'lokal', 'pilihan', 'kemasan', 'karung', 'grade', 'bebas', 'campur'].includes(tok));
  const ta = cleanTokens(a);
  const tb = cleanTokens(b);
  if (ta.length === 0 || tb.length === 0) return false;
  return ta.some(tok => tb.includes(tok));
}

function addDaysToIso(isoDate: string, days: number): string {
  const parsed = parseLocalDate(isoDate) || new Date();
  const shifted = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate() + days);
  const y = shifted.getFullYear();
  const m = String(shifted.getMonth() + 1).padStart(2, '0');
  const d = String(shifted.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatIndonesianMonthLabel(monthStr: string): string {
  const m = /^(\d{4})-(\d{2})/.exec((monthStr || '').trim());
  if (!m) return monthStr || '-';
  const year = m[1];
  const monthIdx = Math.max(0, Math.min(11, Number(m[2]) - 1));
  return `${INDONESIAN_MONTHS[monthIdx]} ${year}`;
}

function matchesReportPeriod(
  recordDate: string | undefined,
  periodType: 'harian' | 'mingguan' | 'bulanan' | 'periode',
  selectedDate: string,
  selectedMonth: string,
  startDate: string,
  endDate: string
): boolean {
  if (!recordDate) return false;
  const iso = recordDate.slice(0, 10);
  if (periodType === 'harian') {
    return iso === selectedDate;
  }
  if (periodType === 'bulanan') {
    return iso.startsWith(selectedMonth);
  }
  if (periodType === 'mingguan') {
    if (selectedDate.startsWith(selectedMonth)) {
      const weekStart = addDaysToIso(selectedDate, -6);
      return iso >= weekStart && iso <= selectedDate;
    }
    return iso.startsWith(selectedMonth);
  }
  return (!startDate || iso >= startDate) && (!endDate || iso <= endDate);
}

export const ReportsModule: React.FC<ReportsModuleProps> = ({ onNavigate }) => {
  const {
    institutions,
    masterBahan,
    masterSuppliers,
    masterVolunteers,
    beneficiaryAttendance,
    beneficiaryRecords,
    menuItems,
    menuIngredientsMap,
    inventory,
    stockMutations,
    masterUnits,
    purchaseOrders,
    distributionLogs,
    pettyCashOpeningBalance,
    pettyCashTransactions,
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

  // Determine latest operational date from live cross-module records
  const defaultOperationalDate = useMemo(() => {
    const candidates = [
      ...distributionDeliveries.map(d => d.date),
      ...beneficiaryAttendance.map(a => a.date),
      ...cookingRecords.map(c => c.date),
      ...portioningRecords.map(p => p.date),
      ...washingWasteRecords.map(w => w.date),
    ].filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d));
    if (candidates.length === 0) return '2026-11-08';
    return [...candidates].sort().pop() || '2026-11-08';
  }, [
    distributionDeliveries,
    beneficiaryAttendance,
    cookingRecords,
    portioningRecords,
    washingWasteRecords,
  ]);

  // Selected State
  const [activeReportKey, setActiveReportKey] = useState<OfficialReportKey>(() => {
    try {
      const target = sessionStorage.getItem('sppg_reports_target_key') as OfficialReportKey | null;
      if (target && REPORT_CONFIGS.some(r => r.key === target)) {
        sessionStorage.removeItem('sppg_reports_target_key');
        return target;
      }
    } catch {
      // ignore storage errors
    }
    return 'bast_distribusi';
  });
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [periodType, setPeriodType] = useState<'harian' | 'mingguan' | 'bulanan' | 'periode'>('harian');
  const [selectedDate, setSelectedDate] = useState<string>(defaultOperationalDate);
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultOperationalDate.slice(0, 7));
  const [startDate, setStartDate] = useState<string>(`${defaultOperationalDate.slice(0, 7)}-01`);
  const [endDate, setEndDate] = useState<string>(defaultOperationalDate);
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

  // BAST Harian format controls (mirip Log Armada & BAST Digital)
  const [bastShowAllInstitutions, setBastShowAllInstitutions] = useState<boolean>(false);
  const [bastSingleInstId, setBastSingleInstId] = useState<string>('');
  const [bastReceiveTimeOverride, setBastReceiveTimeOverride] = useState<string>('');
  const [bastReturnTimeOverride, setBastReturnTimeOverride] = useState<string>('');

  // Organoleptik PLOG + Pemeriksaan Makanan (Menu Basah & Menu Kering) controls
  const [plogBlankMode, setPlogBlankMode] = useState<boolean>(false);
  const [showPlogEditor, setShowPlogEditor] = useState<boolean>(false);
  const [plogPreparedDateOverride, setPlogPreparedDateOverride] = useState<string>('');
  const [plogAfterDateOverride, setPlogAfterDateOverride] = useState<string>('');
  const [plogOfficerOverride, setPlogOfficerOverride] = useState<string>('');
  const [plogChefOverride, setPlogChefOverride] = useState<string>('');
  const [plogKepalaOverride, setPlogKepalaOverride] = useState<string>('');
  const [plogNipOverride, setPlogNipOverride] = useState<string>('');
  const [plogNotesOverride, setPlogNotesOverride] = useState<string | undefined>(undefined);
  const [plogCustomWetRows, setPlogCustomWetRows] = useState<PlogOrganolepticItemRow[] | null>(null);
  const [plogCustomDryRows, setPlogCustomDryRows] = useState<PlogOrganolepticItemRow[] | null>(null);
  const [plogWetPhotoOverride, setPlogWetPhotoOverride] = useState<string | undefined>(undefined);
  const [plogDryPhotoOverride, setPlogDryPhotoOverride] = useState<string | undefined>(undefined);

  // Surat Tugas Perjalanan Kendaraan Operasional controls
  const [stSelectedVolunteerId, setStSelectedVolunteerId] = useState<string>('AUTO');
  const [stSelectedDocId, setStSelectedDocId] = useState<string>('AUTO');
  const [showStEditor, setShowStEditor] = useState<boolean>(false);
  const [stOverrides, setStOverrides] = useState<Partial<SuratTugasData>>({});

  // Suhu & Kelembapan Ruangan notes per tanggal (Ruang Pengolahan, Ruang Pemorsian, Gudang Basah, Gudang Kering)
  const [roomTempNotesByDate, setRoomTempNotesByDate] = useState<Record<string, string>>({});

  // Active Report Metadata
  const currentConfig = useMemo(() => {
    return REPORT_CONFIGS.find(r => r.key === activeReportKey) || REPORT_CONFIGS[0];
  }, [activeReportKey]);

  // Current active menu (matches selectedDate, or weekday name, or first active menu)
  const todayMenu = useMemo(() => {
    const exactMatch = menuItems.find(m => m.date === selectedDate);
    if (exactMatch) return exactMatch;
    const parsed = parseLocalDate(selectedDate);
    if (parsed) {
      const dayRaw = new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(parsed).toLowerCase();
      const dayMatch = menuItems.find(m => (m.dayName || '').toLowerCase() === dayRaw);
      if (dayMatch) return dayMatch;
    }
    return (
      menuItems[0] || {
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
        calciumMg: 245,
        ironMg: 4.8,
        targetPortions: 1450,
        estimatedCostPerPortion: 8187,
        status: 'Disetujui Kepala',
      }
    );
  }, [menuItems, selectedDate]);

  // Sinkronisasi otomatis Foto Porsi Kecil & Foto Porsi Besar dari Modul Input Gramasi & Suhu Divisi Pemorsian
  const flyerPortioningData = useMemo(() => {
    const pickPhotos = (rec?: typeof portioningRecords[number]) => ({
      small:
        rec?.smallPortionPhoto ||
        rec?.foodTemps?.rice?.smallPortionSession1PhotoUrl ||
        rec?.foodTemps?.rice?.smallPortionSession2PhotoUrl ||
        rec?.foodTemps?.rice?.smallPortionSession3PhotoUrl ||
        '',
      large:
        rec?.largePortionPhoto ||
        rec?.foodTemps?.rice?.photoUrl ||
        rec?.foodTemps?.animalProtein?.photoUrl ||
        '',
    });

    const matched =
      portioningRecords.find(r => r.menuId === todayMenu.id && (Boolean(pickPhotos(r).small) || Boolean(pickPhotos(r).large))) ||
      portioningRecords.find(r => r.date === todayMenu.date && (Boolean(pickPhotos(r).small) || Boolean(pickPhotos(r).large))) ||
      portioningRecords.find(r => r.date === selectedDate && (Boolean(pickPhotos(r).small) || Boolean(pickPhotos(r).large))) ||
      portioningRecords.find(r => Boolean(pickPhotos(r).small) || Boolean(pickPhotos(r).large)) ||
      portioningRecords[0];

    const photos = pickPhotos(matched);
    return {
      record: matched,
      smallPhoto:
        photos.small ||
        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
      largePhoto:
        photos.large ||
        'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=800&q=80',
      smallGrams: matched?.smallPortionWeightGrams || 395,
      largeGrams: matched?.largePortionWeightGrams || 585,
      officerName: matched?.officerName || 'Tim Divisi Pemorsian',
      date: matched?.date || selectedDate,
    };
  }, [portioningRecords, todayMenu.id, todayMenu.date, selectedDate]);

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

  // Auto-resolved Surat Tugas Perjalanan Kendaraan Operasional (Master Relawan + Log Armada + Surat Keluar)
  const suratTugasData = useMemo(() => {
    return resolveSuratTugasAutoFields({
      sppgConfig,
      masterVolunteers,
      outgoingDocuments,
      fuelLogs,
      distributionDeliveries,
      date: selectedDate,
      volunteerId: stSelectedVolunteerId,
      documentId: stSelectedDocId !== 'AUTO' ? stSelectedDocId : undefined,
      overrides: stOverrides,
    });
  }, [
    sppgConfig,
    masterVolunteers,
    outgoingDocuments,
    fuelLogs,
    distributionDeliveries,
    selectedDate,
    stSelectedVolunteerId,
    stSelectedDocId,
    stOverrides,
  ]);

  // Auto-resolved Kombinasi Pemeriksaan Makanan + Organoleptik PLOG (Menu Basah & Menu Kering)
  const plogOrganolepticData = useMemo(() => {
    const matchedDateMenu =
      menuItems.find(m => m.date === selectedDate) || todayMenu;
    return resolvePlogOrganolepticData({
      menu: matchedDateMenu,
      cookingRecords,
      portioningRecords,
      masterVolunteers,
      sppgConfig,
      date: selectedDate,
      blankMode: plogBlankMode,
      overrides: {
        samplePreparedDateLabel: plogPreparedDateOverride || undefined,
        sampleAfter2x24DateLabel: plogAfterDateOverride || undefined,
        officerName: plogOfficerOverride || undefined,
        headChefName: plogChefOverride || undefined,
        kepalaSppgName: plogKepalaOverride || undefined,
        kepalaSppgNip: plogNipOverride || undefined,
        wetRows: plogCustomWetRows || undefined,
        dryRows: plogCustomDryRows || undefined,
        wetPhotoUrl: plogWetPhotoOverride,
        dryPhotoUrl: plogDryPhotoOverride,
        notes: plogNotesOverride,
      },
    });
  }, [
    menuItems,
    todayMenu,
    cookingRecords,
    portioningRecords,
    masterVolunteers,
    sppgConfig,
    selectedDate,
    plogBlankMode,
    plogPreparedDateOverride,
    plogAfterDateOverride,
    plogOfficerOverride,
    plogChefOverride,
    plogKepalaOverride,
    plogNipOverride,
    plogCustomWetRows,
    plogCustomDryRows,
    plogWetPhotoOverride,
    plogDryPhotoOverride,
    plogNotesOverride,
  ]);

  // Auto-resolved Pemantauan Suhu Makanan Pengolahan & CCP (Divisi Pengolahan + Master Menu + Master Relawan)
  const cookingFoodTempData = useMemo(() => {
    return resolveCookingFoodTempData({
      cookingRecords,
      menuItems,
      masterVolunteers,
      sppgConfig,
      selectedDate,
      selectedMonth,
      startDate,
      endDate,
      periodType,
    });
  }, [
    cookingRecords,
    menuItems,
    masterVolunteers,
    sppgConfig,
    selectedDate,
    selectedMonth,
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
      selectedDate,
      selectedMonth,
      startDate,
      endDate,
      periodType,
    });
  }, [
    portioningRecords,
    menuItems,
    sppgConfig,
    selectedDate,
    selectedMonth,
    startDate,
    endDate,
    periodType,
  ]);

  // Pemetaan sub-menu laporan suhu ruangan & pendingin ke unit fasilitas terkait
  const activeRoomUnitId = FACILITY_REPORT_UNIT_MAP[activeReportKey] || 'cooking-room';

  // Auto-resolved Pemantauan Suhu & Kelembapan Ruangan (Sesi 1: Persiapan, Sesi 2: Pengolahan, Sesi 3: Pemorsian)
  const activeRoomTempDataset = useMemo<RoomTempChecklistData>(() => {
    return resolveRoomTempChecklistData({
      unitId: activeRoomUnitId,
      prepRecords,
      cookingRecords,
      portioningRecords,
      sppgConfig,
      selectedDate,
      selectedMonth,
      startDate,
      endDate,
      periodType,
      notesByDate: roomTempNotesByDate,
    });
  }, [
    activeRoomUnitId,
    prepRecords,
    cookingRecords,
    portioningRecords,
    sppgConfig,
    selectedDate,
    selectedMonth,
    startDate,
    endDate,
    periodType,
    roomTempNotesByDate,
  ]);

  // Auto-resolved LAPORAN FOOD COST resmi sinkron Input Food Cost Menu & Anggaran PLOG
  const foodCostReportData = useMemo(() => {
    return resolveFoodCostReportData({
      menuItems,
      menuIngredientsMap,
      institutions,
      beneficiaryAttendance,
      distributionDeliveries,
      distributionLogs,
      masterUnits,
      masterBahan,
      rabItems,
      portioningRecords,
      sppgConfig,
      periodType,
      selectedDate,
      selectedMonth,
      startDate,
      endDate,
      selectedInstitutionId,
      selectedPortionCategory,
      searchKeyword,
    });
  }, [
    menuItems,
    menuIngredientsMap,
    institutions,
    beneficiaryAttendance,
    distributionDeliveries,
    distributionLogs,
    masterUnits,
    masterBahan,
    rabItems,
    portioningRecords,
    sppgConfig,
    periodType,
    selectedDate,
    selectedMonth,
    startDate,
    endDate,
    selectedInstitutionId,
    selectedPortionCategory,
    searchKeyword,
  ]);

  // Auto-resolved BAST Harian Sheets — 100% sinkron dengan Modul Tugas Divisi Distribusi, Presensi Harian & Master Lembaga
  const bastSheetsList = useMemo<BASTSheetData[]>(() => {
    const targetInstFilter =
      selectedInstitutionId !== 'ALL'
        ? institutions.find(i => i.id === selectedInstitutionId)
        : undefined;

    const kw = searchKeyword.trim().toLowerCase();

    // Helper: terapkan filter kategori porsi ('ALL' | 'kecil' | 'besar')
    const applyPortionFilter = (sheet: BASTSheetData): BASTSheetData | null => {
      const small = sheet.smallPortions ?? 0;
      const large = sheet.largePortions ?? 0;
      if (selectedPortionCategory === 'kecil') {
        if (small <= 0) return null;
        return { ...sheet, totalPortions: small, largePortions: 0 };
      }
      if (selectedPortionCategory === 'besar') {
        if (large <= 0) return null;
        return { ...sheet, totalPortions: large, smallPortions: 0 };
      }
      return sheet;
    };

    const matchesKeyword = (sheet: BASTSheetData): boolean => {
      if (!kw) return true;
      return (
        sheet.institutionName.toLowerCase().includes(kw) ||
        sheet.picName.toLowerCase().includes(kw) ||
        sheet.distributorName.toLowerCase().includes(kw) ||
        sheet.bastNumber.toLowerCase().includes(kw) ||
        (sheet.vehicleNumber || '').toLowerCase().includes(kw) ||
        (sheet.institutionId || '').toLowerCase().includes(kw)
      );
    };

    // Jika mode mingguan/bulanan/periode: tampilkan BAST berdasarkan catatan pengiriman Divisi Distribusi pada periode tsb
    if (periodType !== 'harian') {
      const periodDeliveries = distributionDeliveries.filter(d => {
        if (!matchesReportPeriod(d.date, periodType, selectedDate, selectedMonth, startDate, endDate)) {
          return false;
        }
        if (targetInstFilter) {
          return isSameInstitutionMatch(
            { id: d.institutionId, name: d.institutionName },
            targetInstFilter.id,
            targetInstFilter.name
          );
        }
        return true;
      });

      if (periodDeliveries.length > 0) {
        return periodDeliveries
          .map((delivery, idx) => {
            const matchedInst =
              institutions.find(inst =>
                isSameInstitutionMatch(inst, delivery.institutionId, delivery.institutionName)
              ) || institutions.find(inst => inst.id === delivery.institutionId);
            const seqNum = 192 + idx;
            const resolved = resolveBastAutoFields({
              institutions,
              beneficiaryAttendance,
              masterVolunteers,
              distributionLogs,
              distributionDeliveries,
              omprengReturns,
              sppgConfig,
              institutionId: matchedInst?.id || delivery.institutionId,
              institutionName: delivery.institutionName,
              date: delivery.date,
              bastNumber: delivery.bastNumber || generateBastNumber(seqNum, delivery.date),
              totalPortions: delivery.totalPortions,
              smallPortions: delivery.smallPortions,
              largePortions: delivery.largePortions,
              picName: delivery.picName || undefined,
              distributorName: delivery.driverName || undefined,
              vehicleNumber: delivery.vehicleNumber,
              deliveryStatus: delivery.status,
              notes: delivery.notes,
              receiveTime:
                bastReceiveTimeOverride.trim() ||
                (delivery.arrivalTime && delivery.arrivalTime !== '-'
                  ? delivery.arrivalTime
                  : delivery.departureTime),
              returnTime: bastReturnTimeOverride.trim() || undefined,
            });
            return applyPortionFilter(resolved);
          })
          .filter((s): s is BASTSheetData => s !== null && matchesKeyword(s));
      }
    }

    // Mode Harian (atau fallback): gabungkan semua pengiriman Divisi Distribusi pada selectedDate + lembaga aktif dari Master Data
    const dayDeliveries = distributionDeliveries.filter(d => d.date === selectedDate);
    const activeInstitutions = targetInstFilter
      ? [targetInstFilter]
      : institutions.filter(i => i.isActive);

    const usedDeliveryIds = new Set<string>();
    const combinedEntries = activeInstitutions.map((inst, idx) => {
      const instIndex = institutions.findIndex(i => i.id === inst.id);
      const seqNum = 192 + (instIndex >= 0 ? instIndex : idx);

      const matchedDelivery = dayDeliveries.find(d =>
        isSameInstitutionMatch(inst, d.institutionId, d.institutionName)
      );
      if (matchedDelivery) usedDeliveryIds.add(matchedDelivery.id);

      const matchedDist =
        distributionLogs.find(
          d =>
            d.date === selectedDate &&
            isSameInstitutionMatch(inst, d.institutionId, d.institutionName)
        ) ||
        distributionLogs.find(d =>
          isSameInstitutionMatch(inst, d.institutionId, d.institutionName)
        );

      const matchedReturn = omprengReturns.find(
        r =>
          r.date === selectedDate &&
          isSameInstitutionMatch(inst, r.institutionId, r.institutionName)
      );

      const matchedAtt = beneficiaryAttendance.find(
        a =>
          a.date === selectedDate &&
          isSameInstitutionMatch(inst, a.institutionId, a.institutionName)
      );

      // Prioritas sumber porsi: Tugas Divisi Distribusi -> Presensi Harian -> Legacy Log -> Master Lembaga
      const resolvedSmall = matchedDelivery
        ? matchedDelivery.smallPortions
        : matchedAtt
        ? matchedAtt.presentSmall
        : matchedDist
        ? matchedDist.smallPortions
        : inst.smallPortions;

      const resolvedLarge = matchedDelivery
        ? matchedDelivery.largePortions
        : matchedAtt
        ? matchedAtt.presentLarge
        : matchedDist
        ? matchedDist.largePortions
        : inst.largePortions;

      const totalPortionsResolved = matchedDelivery
        ? matchedDelivery.totalPortions
        : matchedAtt
        ? matchedAtt.actualPortions
        : matchedDist
        ? matchedDist.totalPortions
        : inst.totalPortions;

      const receiveTimeResolved =
        bastReceiveTimeOverride.trim() ||
        (matchedDelivery?.arrivalTime && matchedDelivery.arrivalTime !== '-'
          ? matchedDelivery.arrivalTime
          : matchedDelivery?.departureTime && matchedDelivery.departureTime !== '-'
          ? matchedDelivery.departureTime
          : matchedDist?.arrivalTime && matchedDist.arrivalTime !== '-'
          ? matchedDist.arrivalTime
          : matchedDist?.departureTime);

      const returnTimeResolved =
        bastReturnTimeOverride.trim() ||
        (matchedReturn?.arrivalTime && matchedReturn.arrivalTime !== '-'
          ? matchedReturn.arrivalTime
          : '');

      return resolveBastAutoFields({
        institutions,
        beneficiaryAttendance,
        masterVolunteers,
        distributionLogs,
        distributionDeliveries,
        omprengReturns,
        sppgConfig,
        institutionId: inst.id,
        institutionName: matchedDelivery?.institutionName || inst.name,
        date: selectedDate,
        bastNumber:
          matchedDelivery?.bastNumber ||
          matchedDist?.bastNumber ||
          generateBastNumber(seqNum, selectedDate),
        totalPortions: totalPortionsResolved,
        smallPortions: resolvedSmall,
        largePortions: resolvedLarge,
        picName: matchedDelivery?.picName || matchedDist?.receivedBy || undefined,
        distributorName: matchedDelivery?.driverName || matchedDist?.driverName,
        vehicleNumber: matchedDelivery?.vehicleNumber || matchedDist?.vehicleNumber,
        deliveryStatus: matchedDelivery?.status || matchedDist?.status,
        notes: matchedDelivery?.notes || matchedDist?.notes,
        receiveTime: receiveTimeResolved,
        returnTime: returnTimeResolved,
      });
    });

    // Sertakan pengiriman Divisi Distribusi tambahan pada tanggal tsb yang belum masuk daftar lembaga aktif
    dayDeliveries.forEach((extraDel, idx) => {
      if (usedDeliveryIds.has(extraDel.id)) return;
      if (
        targetInstFilter &&
        !isSameInstitutionMatch(
          targetInstFilter,
          extraDel.institutionId,
          extraDel.institutionName
        )
      ) {
        return;
      }
      combinedEntries.push(
        resolveBastAutoFields({
          institutions,
          beneficiaryAttendance,
          masterVolunteers,
          distributionLogs,
          distributionDeliveries,
          omprengReturns,
          sppgConfig,
          institutionId: extraDel.institutionId,
          institutionName: extraDel.institutionName,
          date: extraDel.date,
          bastNumber:
            extraDel.bastNumber || generateBastNumber(210 + idx, extraDel.date),
          totalPortions: extraDel.totalPortions,
          smallPortions: extraDel.smallPortions,
          largePortions: extraDel.largePortions,
          picName: extraDel.picName || undefined,
          distributorName: extraDel.driverName || undefined,
          vehicleNumber: extraDel.vehicleNumber,
          deliveryStatus: extraDel.status,
          notes: extraDel.notes,
          receiveTime:
            bastReceiveTimeOverride.trim() ||
            (extraDel.arrivalTime && extraDel.arrivalTime !== '-'
              ? extraDel.arrivalTime
              : extraDel.departureTime),
          returnTime: bastReturnTimeOverride.trim() || undefined,
        })
      );
    });

    return combinedEntries
      .map(applyPortionFilter)
      .filter((s): s is BASTSheetData => s !== null && matchesKeyword(s));
  }, [
    institutions,
    selectedInstitutionId,
    selectedPortionCategory,
    searchKeyword,
    distributionDeliveries,
    distributionLogs,
    omprengReturns,
    beneficiaryAttendance,
    masterVolunteers,
    sppgConfig,
    periodType,
    selectedDate,
    selectedMonth,
    startDate,
    endDate,
    bastReceiveTimeOverride,
    bastReturnTimeOverride,
  ]);

  const activeBastSingleSheet = useMemo<BASTSheetData | null>(() => {
    if (bastSheetsList.length === 0) return null;
    if (selectedInstitutionId !== 'ALL') {
      const foundByGlobal = institutions.find(i => i.id === selectedInstitutionId);
      if (foundByGlobal) {
        const match = bastSheetsList.find(s =>
          isSameInstitutionMatch(
            { id: s.institutionId, name: s.institutionName },
            foundByGlobal.id,
            foundByGlobal.name
          )
        );
        if (match) return match;
      }
    }
    if (bastSingleInstId) {
      const foundByLocal = institutions.find(i => i.id === bastSingleInstId);
      if (foundByLocal) {
        const match = bastSheetsList.find(s =>
          isSameInstitutionMatch(
            { id: s.institutionId, name: s.institutionName },
            foundByLocal.id,
            foundByLocal.name
          )
        );
        if (match) return match;
      }
    }
    return bastSheetsList[0];
  }, [bastSheetsList, selectedInstitutionId, bastSingleInstId, institutions]);

  const bastVisibleSheets = useMemo<BASTSheetData[]>(() => {
    if (bastShowAllInstitutions && selectedInstitutionId === 'ALL') {
      return bastSheetsList;
    }
    return activeBastSingleSheet ? [activeBastSingleSheet] : [];
  }, [bastShowAllInstitutions, selectedInstitutionId, bastSheetsList, activeBastSingleSheet]);

  // Generate Document Register Number
  const documentRegisterNumber = useMemo(() => {
    const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    const d = parseLocalDate(selectedDate) || new Date();
    const monthIndex = isNaN(d.getTime()) ? 10 : d.getMonth();
    const romanMonth = romanMonths[monthIndex];
    const year = isNaN(d.getFullYear()) ? 2026 : d.getFullYear();
    return `${currentConfig.codePrefix}/SPPG-TMG2/${year}/${romanMonth}/0042`;
  }, [currentConfig, selectedDate]);

  // Period label string
  const periodLabelString = useMemo(() => {
    if (periodType === 'harian') {
      return `Harian (${formatIndonesianDate(selectedDate)})`;
    } else if (periodType === 'mingguan') {
      return `Mingguan (${formatIndonesianDate(addDaysToIso(selectedDate, -6))} - ${formatIndonesianDate(selectedDate)})`;
    } else if (periodType === 'bulanan') {
      return `Bulanan (${formatIndonesianMonthLabel(selectedMonth)})`;
    } else {
      return `Periode Kustom (${formatIndonesianDate(startDate)} s/d ${formatIndonesianDate(endDate)})`;
    }
  }, [periodType, selectedDate, selectedMonth, startDate, endDate]);

  // ===========================================================================
  // REPORT DATA GENERATORS (Masing-masing 20 Laporan Otomatis Antar-Modul)
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

    // Resolve Petugas & Koordinator secara dinamis berdasarkan kategori/divisi laporan & Master Relawan
    const pickCoordinator = (division: string, fallbackName: string, fallbackId: string) => {
      const coord =
        masterVolunteers.find(
          v => v.isActive && v.division === division && v.position.includes('Koordinator')
        ) || masterVolunteers.find(v => v.isActive && v.division === division);
      return {
        name: coord?.name || fallbackName,
        idNum: coord?.code || fallbackId,
      };
    };

    const distCoord = pickCoordinator('Distribusi', sppgConfig.headOfSppg, `SPPG-${sppgConfig.sppgId}`);
    const cookCoord = pickCoordinator('Pengolahan', 'Kepala Bagian Masak', 'DPR-COOK-01');
    const prepCoord = pickCoordinator('Persiapan', 'Koordinator Persiapan', 'DPR-PREP-01');
    const portCoord = pickCoordinator('Pemorsian', 'Koordinator Pemorsian', 'DPR-PORT-01');
    const washCoord = pickCoordinator('Cuci Ompreng', 'Koordinator Sanitasi', 'DPR-WASH-01');

    const resolveDefaultSignatures = (): Array<{ role: string; name: string; idNum?: string }> => {
      if (currentConfig.category === 'Distribusi & Lapangan') {
        return [
          {
            role: 'Petugas Lapangan / Pengemudi',
            name: bastSheetsList[0]?.distributorName || distCoord.name,
            idNum: distCoord.idNum,
          },
          { role: currentConfig.approverRole, name: distCoord.name, idNum: distCoord.idNum },
          { role: `Kepala ${sppgConfig.sppgName}`, name: sppgConfig.headOfSppg, idNum: `SPPG-${sppgConfig.sppgId}` },
        ];
      }
      if (currentConfig.category === 'Gizi & Menu') {
        return [
          { role: 'Tim Gizi / Pengolahan Menu', name: prepCoord.name, idNum: prepCoord.idNum },
          {
            role: currentConfig.approverRole,
            name: sppgConfig.nutritionOfficer || 'Pengawas Gizi SPPG',
            idNum: 'GZ-SPPG-01',
          },
          { role: `Kepala ${sppgConfig.sppgName}`, name: sppgConfig.headOfSppg, idNum: `SPPG-${sppgConfig.sppgId}` },
        ];
      }
      if (currentConfig.category === 'Dapur & Keamanan Pangan') {
        const kitchenLead =
          activeReportKey === 'food_waste'
            ? washCoord
            : activeReportKey === 'suhu_makanan_pemorsian'
            ? portCoord
            : cookCoord;
        return [
          { role: 'Petugas Dapur / QC Harian', name: kitchenLead.name, idNum: kitchenLead.idNum },
          { role: currentConfig.approverRole, name: cookCoord.name, idNum: cookCoord.idNum },
          { role: `Kepala ${sppgConfig.sppgName}`, name: sppgConfig.headOfSppg, idNum: `SPPG-${sppgConfig.sppgId}` },
        ];
      }
      return [
        { role: 'Penyusun / Petugas Operasional', name: sppgConfig.financeOfficer || prepCoord.name, idNum: 'SPPG-OP-01' },
        {
          role: currentConfig.approverRole,
          name:
            activeReportKey === 'penerima_harian'
              ? sppgConfig.nutritionOfficer || distCoord.name
              : sppgConfig.financeOfficer || sppgConfig.headOfSppg,
          idNum: `SPPG-${sppgConfig.sppgId}`,
        },
        { role: `Kepala ${sppgConfig.sppgName}`, name: sppgConfig.headOfSppg, idNum: `SPPG-${sppgConfig.sppgId}` },
      ];
    };

    let signatures: Array<{ role: string; name: string; idNum?: string; heading?: string }> = resolveDefaultSignatures();

    const targetInstFilter =
      selectedInstitutionId !== 'ALL'
        ? institutions.find(i => i.id === selectedInstitutionId)
        : undefined;

    switch (activeReportKey) {
      // 1. BAST Distribusi — 100% Sinkron dari bastSheetsList (Divisi Distribusi + Master Lembaga + Presensi + Ompreng Return)
      case 'bast_distribusi': {
        headers = [
          'No',
          'Nomor BAST',
          'Tanggal',
          'Lembaga Penerima',
          'Porsi Kecil',
          'Porsi Besar',
          'Total Porsi',
          'Jam Tiba / Kembali',
          'Petugas & Armada',
          'PIC Penerima & No. HP',
          'Status Serah Terima',
        ];

        const matchedDeliveries = distributionDeliveries.filter(d =>
          matchesReportPeriod(d.date, periodType, selectedDate, selectedMonth, startDate, endDate)
        );
        const matchedLogs = distributionLogs.filter(l =>
          matchesReportPeriod(l.date, periodType, selectedDate, selectedMonth, startDate, endDate)
        );

        const totPortions = bastSheetsList.reduce((acc, s) => acc + (s.totalPortions || 0), 0);
        const totSmall = bastSheetsList.reduce((acc, s) => acc + (s.smallPortions || 0), 0);
        const totLarge = bastSheetsList.reduce((acc, s) => acc + (s.largePortions || 0), 0);
        const completedCount = bastSheetsList.filter(
          s => s.deliveryStatus === 'Selesai Serah Terima'
        ).length;

        const avgTempCandidates = matchedLogs
          .map(l => l.foodTempAtArrival || l.foodTempAtDispatch)
          .filter((v): v is number => typeof v === 'number' && v > 0);
        const avgTempLabel =
          avgTempCandidates.length > 0
            ? `${(
                avgTempCandidates.reduce((a, b) => a + b, 0) / avgTempCandidates.length
              ).toFixed(1)}°C`
            : 'Standar ≥ 60°C';

        const baseRows = bastSheetsList.map((s, idx) => [
          idx + 1,
          s.bastNumber,
          formatIndonesianDate(s.date),
          s.institutionType ? `${s.institutionName} (${s.institutionType})` : s.institutionName,
          formatNumber(s.smallPortions || 0),
          formatNumber(s.largePortions || 0),
          formatNumber(s.totalPortions),
          `${s.receiveTime} WIB / ${s.returnTime ? `${s.returnTime} WIB` : 'Belum Kembali'}`,
          s.vehicleNumber ? `${s.distributorName} (${s.vehicleNumber})` : s.distributorName,
          `${s.picName}${s.picPhone && s.picPhone !== '-' ? ` (${s.picPhone})` : ''}`,
          s.deliveryStatus || 'Menunggu Pengantaran',
        ]);

        const matchedSourceRecords = bastSheetsList.map(s => {
          const del = matchedDeliveries.find(d =>
            isSameInstitutionMatch(
              { id: s.institutionId, name: s.institutionName },
              d.institutionId,
              d.institutionName
            )
          );
          const log = matchedLogs.find(l =>
            isSameInstitutionMatch(
              { id: s.institutionId, name: s.institutionName },
              l.institutionId,
              l.institutionName
            )
          );
          return del || log || { customFields: {} };
        });

        const distReportSchema = dynamicFormSchemas.distribution_report_form;
        const dynamicBastCols = appendDynamicExportColumns(
          distReportSchema,
          headers,
          baseRows,
          matchedSourceRecords
        );
        headers = dynamicBastCols.headers;
        rows = dynamicBastCols.rows;

        excelData = bastSheetsList.map((s, idx) =>
          appendDynamicExcelFields(
            distReportSchema,
            {
              'No': idx + 1,
              'Nomor BAST': s.bastNumber,
              'Tanggal': s.date,
              'ID Lembaga': s.institutionId || '-',
              'Nama Lembaga': s.institutionName,
              'Jenis Lembaga': s.institutionType || '-',
              'Porsi Kecil': s.smallPortions || 0,
              'Porsi Besar': s.largePortions || 0,
              'Total Porsi': s.totalPortions,
              'Jam Penerimaan': s.receiveTime,
              'Jam Pengembalian Ompreng': s.returnTime || '-',
              'Tim Distribusi / Driver': s.distributorName,
              'No HP Tim Distribusi': s.distributorPhone,
              'Armada': s.vehicleNumber || '-',
              'PIC Penerima': s.picName,
              'No HP PIC': s.picPhone,
              'Status Pengiriman': s.deliveryStatus || '-',
            },
            matchedSourceRecords[idx]
          )
        );

        metrics = [
          { label: 'Total BAST Terbit', value: `${bastSheetsList.length} Lembaga`, color: 'text-blue-700' },
          {
            label: 'Total Porsi Serah Terima',
            value: `${formatNumber(totPortions)} Porsi`,
            sublabel: `Kecil: ${formatNumber(totSmall)} • Besar: ${formatNumber(totLarge)}`,
            color: 'text-emerald-700',
          },
          {
            label: 'Serah Terima Div. Distribusi',
            value: `${completedCount} / ${bastSheetsList.length} Selesai`,
            sublabel: 'Sinkron Tugas Divisi Distribusi',
            color: 'text-purple-700',
          },
          { label: 'Kondisi Suhu & Segel', value: avgTempLabel, sublabel: 'Wajib ≥ 60°C & Tersegel', color: 'text-amber-700' },
        ];

        notes =
          'Setiap BAST Distribusi diisi otomatis dari tugas Divisi Distribusi (jam tiba/kembali, armada, driver, status), Presensi Harian, dan Master Lembaga (nama PIC & nomor HP PIC).';
        break;
      }

      // 2. Surat Tugas
      case 'surat_tugas': {
        headers = ['No', 'Nomor Surat Tugas', 'Nama Personel', 'Divisi & Jabatan', 'Uraian Tugas', 'Lokasi Penugasan', 'Masa Berlaku', 'Status Pengesahan'];
        const allTaskDocs = outgoingDocuments.filter(d => d.type === 'Surat Tugas');
        const periodDocs = allTaskDocs.filter(d =>
          matchesReportPeriod(d.date, periodType, selectedDate, selectedMonth, startDate, endDate)
        );
        let docs =
          periodType === 'harian' && periodDocs.length === 0
            ? allTaskDocs.filter(d => d.date.startsWith(selectedDate.slice(0, 7)))
            : periodDocs;
        if (docs.length === 0 && periodType === 'harian') {
          docs = allTaskDocs;
        }
        if (searchKeyword.trim()) {
          const kw = searchKeyword.toLowerCase();
          docs = docs.filter(
            d =>
              d.recipientName.toLowerCase().includes(kw) ||
              d.letterNumber.toLowerCase().includes(kw) ||
              d.subject.toLowerCase().includes(kw)
          );
        }

        rows = docs.map((d, idx) => {
          const matchedVol = masterVolunteers.find(v =>
            v.name.toLowerCase().includes(d.recipientName.toLowerCase()) ||
            d.recipientName.toLowerCase().includes(v.name.toLowerCase())
          );
          const divisionInfo = matchedVol
            ? `${matchedVol.division} — ${matchedVol.position}`
            : d.recipientAddress || 'Operasional SPPG';
          const locationLabel =
            d.fieldsData?.lokasi ||
            d.recipientInstitution ||
            `Kecamatan ${sppgConfig.district}, ${sppgConfig.regency}`;
          return [
            idx + 1,
            d.letterNumber,
            d.recipientName,
            divisionInfo,
            d.subject,
            locationLabel,
            formatIndonesianDate(d.date),
            d.status,
          ];
        });

        excelData = docs.map((d, idx) => {
          const matchedVol = masterVolunteers.find(v =>
            v.name.toLowerCase().includes(d.recipientName.toLowerCase())
          );
          return {
            'No': idx + 1,
            'Nomor Surat': d.letterNumber,
            'Nama Personel': d.recipientName,
            'Divisi Relawan': matchedVol?.division || '-',
            'Jabatan': matchedVol?.position || '-',
            'No HP': matchedVol?.phone || '-',
            'Tugas': d.subject,
            'Tanggal': d.date,
            'Disahkan Oleh': d.signedBy || sppgConfig.headOfSppg,
            'Status': d.status,
          };
        });

        const approvedDocsCount = docs.filter(
          d => d.status === 'Disahkan' || d.status === 'Terkirim' || d.status === 'Diarsipkan'
        ).length;
        const activeVolunteersCount = masterVolunteers.filter(v => v.isActive).length;

        metrics = [
          { label: 'Total Surat Tugas', value: `${docs.length} Dokumen`, color: 'text-blue-700' },
          {
            label: 'Status Pengesahan',
            value: docs.length > 0 ? `${approvedDocsCount}/${docs.length} Disahkan` : '0 Dokumen',
            color: 'text-emerald-700',
          },
          {
            label: 'Personel & Relawan Aktif',
            value: `${docs.length} Tugas • ${activeVolunteersCount} Relawan`,
            color: 'text-purple-700',
          },
          { label: 'Pejabat Pengesah', value: sppgConfig.headOfSppg, color: 'text-slate-700' },
        ];
        notes = 'Surat Tugas ditarik otomatis dari Modul Administrasi Surat dan diperkaya dengan divisi serta jabatan dari Master Data Relawan.';
        break;
      }

      // 3. Dokumentasi Perjalanan Dinas (SPD) - Terhubung real-time dengan FuelLogs & Tugas Divisi Distribusi
      case 'perjalanan_dinas': {
        headers = ['No', 'Nomor SPD', 'Tanggal', 'Armada / Kendaraan', 'Pengemudi', 'Lembaga Tujuan & PIC', 'Odometer', 'Konsumsi & Biaya BBM', 'Status Perjalanan'];
        let deliveries = distributionDeliveries.filter(d =>
          matchesReportPeriod(d.date, periodType, selectedDate, selectedMonth, startDate, endDate)
        );
        if (targetInstFilter) {
          deliveries = deliveries.filter(d =>
            isSameInstitutionMatch(
              targetInstFilter,
              d.institutionId,
              d.institutionName
            )
          );
        }
        if (selectedPortionCategory === 'kecil') {
          deliveries = deliveries.filter(d => d.smallPortions > 0);
        } else if (selectedPortionCategory === 'besar') {
          deliveries = deliveries.filter(d => d.largePortions > 0);
        }
        if (searchKeyword.trim()) {
          const kw = searchKeyword.toLowerCase();
          deliveries = deliveries.filter(
            d =>
              d.driverName.toLowerCase().includes(kw) ||
              d.vehicleNumber.toLowerCase().includes(kw) ||
              d.institutionName.toLowerCase().includes(kw) ||
              d.picName.toLowerCase().includes(kw) ||
              d.id.toLowerCase().includes(kw)
          );
        }

        const matchedFuelIds = new Set<string>();
        let totalFuelLiters = 0;
        let totalFuelCost = 0;

        rows = deliveries.map((d, idx) => {
          const matchedInst = institutions.find(inst =>
            isSameInstitutionMatch(inst, d.institutionId, d.institutionName)
          );
          const matchedFuel =
            fuelLogs.find(f => f.vehicleNumber === d.vehicleNumber && f.date === d.date) ||
            fuelLogs.find(f => f.driverName === d.driverName && f.date === d.date) ||
            fuelLogs.find(f => f.vehicleNumber === d.vehicleNumber);
          if (matchedFuel && !matchedFuelIds.has(matchedFuel.id)) {
            matchedFuelIds.add(matchedFuel.id);
            totalFuelCost += Number(matchedFuel.nominalCost || 0);
            totalFuelLiters += Number(matchedFuel.volumeLiters || 0);
          }

          const odoText = matchedFuel
            ? `${formatNumber(matchedFuel.odometerKm)} km (${matchedFuel.gasStationName})`
            : 'Belum Input Odometer';
          const bbmText = matchedFuel
            ? `${formatRupiah(matchedFuel.nominalCost)} (${matchedFuel.volumeLiters} L ${matchedFuel.fuelType})`
            : 'Belum Input BBM';
          const picLabel = d.picName || matchedInst?.picName || '-';

          return [
            idx + 1,
            `SPD-${d.id.toUpperCase()}`,
            formatIndonesianDate(d.date),
            d.vehicleNumber,
            d.driverName,
            `${d.institutionName} (PIC: ${picLabel})`,
            odoText,
            bbmText,
            d.status,
          ];
        });

        excelData = deliveries.map((d, idx) => {
          const matchedFuel =
            fuelLogs.find(f => f.vehicleNumber === d.vehicleNumber && f.date === d.date) ||
            fuelLogs.find(f => f.driverName === d.driverName && f.date === d.date) ||
            fuelLogs.find(f => f.vehicleNumber === d.vehicleNumber);
          return {
            'No': idx + 1,
            'Nomor SPD': `SPD-${d.id}`,
            'Tanggal': d.date,
            'Armada': d.vehicleNumber,
            'Driver': d.driverName,
            'Tujuan': d.institutionName,
            'PIC Lembaga': d.picName,
            'Total Porsi': d.totalPortions,
            'Odometer (km)': matchedFuel?.odometerKm || 0,
            'Volume BBM (Liter)': matchedFuel?.volumeLiters || 0,
            'Biaya BBM (Rp)': matchedFuel?.nominalCost || 0,
            'Status': d.status,
          };
        });

        const periodFuelLogs = fuelLogs.filter(f =>
          matchesReportPeriod(f.date, periodType, selectedDate, selectedMonth, startDate, endDate)
        );
        const fallbackFuelTotal = periodFuelLogs.reduce((s, f) => s + (f.nominalCost || 0), 0);
        const fallbackLitersTotal = periodFuelLogs.reduce((s, f) => s + (f.volumeLiters || 0), 0);

        metrics = [
          { label: 'Total Rute Armada', value: `${deliveries.length} Rute`, color: 'text-blue-700' },
          { label: 'Volume BBM Tercatat', value: `${(totalFuelLiters || fallbackLitersTotal).toFixed(1)} L`, color: 'text-emerald-700' },
          { label: 'Realisasi BBM', value: formatRupiah(totalFuelCost || fallbackFuelTotal), color: 'text-purple-700' },
          { label: 'Log BBM Periode', value: `${periodFuelLogs.length} Trip`, color: 'text-amber-700' },
        ];
        notes = 'Data perjalanan dinas, rute tujuan, PIC, odometer, dan biaya BBM ditarik langsung secara real-time dari Modul Tugas Divisi Distribusi & Log BBM.';
        break;
      }

      // 4. Rekap Distribusi (Terhubung Tugas Divisi Distribusi + Pengembalian Ompreng + Master Lembaga)
      case 'rekap_distribusi': {
        headers = ['No', 'ID Kirim', 'Tanggal', 'Armada & Driver', 'Lembaga Tujuan & PIC', 'Porsi (K/B/Total)', 'Jam Berangkat / Tiba', 'Status Kirim', 'Status Ompreng Kembali'];
        let deliveries = distributionDeliveries.filter(d =>
          matchesReportPeriod(d.date, periodType, selectedDate, selectedMonth, startDate, endDate)
        );
        if (targetInstFilter) {
          deliveries = deliveries.filter(d =>
            isSameInstitutionMatch(
              targetInstFilter,
              d.institutionId,
              d.institutionName
            )
          );
        }
        if (selectedPortionCategory === 'kecil') {
          deliveries = deliveries.filter(d => d.smallPortions > 0);
        } else if (selectedPortionCategory === 'besar') {
          deliveries = deliveries.filter(d => d.largePortions > 0);
        }
        if (searchKeyword.trim()) {
          const kw = searchKeyword.toLowerCase();
          deliveries = deliveries.filter(
            d =>
              d.institutionName.toLowerCase().includes(kw) ||
              d.driverName.toLowerCase().includes(kw) ||
              d.vehicleNumber.toLowerCase().includes(kw) ||
              d.picName.toLowerCase().includes(kw) ||
              d.id.toLowerCase().includes(kw)
          );
        }

        let returnedCount = 0;
        const baseRows = deliveries.map((d, idx) => {
          const matchedInst = institutions.find(inst =>
            isSameInstitutionMatch(inst, d.institutionId, d.institutionName)
          );
          const matchedReturn = omprengReturns.find(
            r =>
              r.date === d.date &&
              isSameInstitutionMatch(
                { id: r.institutionId, name: r.institutionName },
                matchedInst?.id || d.institutionId,
                d.institutionName
              )
          );
          if (matchedReturn) returnedCount += 1;

          const effectiveTotal =
            selectedPortionCategory === 'kecil'
              ? d.smallPortions
              : selectedPortionCategory === 'besar'
              ? d.largePortions
              : d.totalPortions;

          return [
            idx + 1,
            d.bastNumber || d.id,
            formatIndonesianDate(d.date),
            `${d.vehicleNumber} • ${d.driverName}`,
            `${d.institutionName} (${d.picName || matchedInst?.picName || '-'})`,
            `${formatNumber(d.smallPortions)} / ${formatNumber(d.largePortions)} / ${formatNumber(effectiveTotal)}`,
            `${d.departureTime || '-'} / ${d.arrivalTime || '-'}`,
            d.status,
            matchedReturn
              ? `${matchedReturn.conditionStatus} (${matchedReturn.arrivalTime})`
              : 'Menunggu Penjemputan',
          ];
        });

        const dispatchSchema = dynamicFormSchemas.distribution_dispatch_form;
        const dynamicDispatchCols = appendDynamicExportColumns(dispatchSchema, headers, baseRows, deliveries);
        headers = dynamicDispatchCols.headers;
        rows = dynamicDispatchCols.rows;

        excelData = deliveries.map((d, idx) => {
          const matchedReturn = omprengReturns.find(
            r =>
              r.date === d.date &&
              isSameInstitutionMatch(
                { id: r.institutionId, name: r.institutionName },
                d.institutionId,
                d.institutionName
              )
          );
          return appendDynamicExcelFields(
            dispatchSchema,
            {
              'No': idx + 1,
              'ID Kirim': d.id,
              'Nomor BAST': d.bastNumber,
              'Tanggal': d.date,
              'Armada': d.vehicleNumber,
              'Driver': d.driverName,
              'Lembaga': d.institutionName,
              'PIC Sekolah': d.picName,
              'Porsi Kecil': d.smallPortions,
              'Porsi Besar': d.largePortions,
              'Total Porsi': d.totalPortions,
              'Jam Berangkat': d.departureTime,
              'Jam Tiba': d.arrivalTime,
              'Status Kirim': d.status,
              'Status Kembali Ompreng': matchedReturn?.conditionStatus || 'Belum Kembali',
            },
            d
          );
        });

        const totalPortionLoaded = deliveries.reduce(
          (acc, d) =>
            acc +
            (selectedPortionCategory === 'kecil'
              ? d.smallPortions
              : selectedPortionCategory === 'besar'
              ? d.largePortions
              : d.totalPortions),
          0
        );
        const completedCount = deliveries.filter(d => d.status === 'Selesai Serah Terima').length;
        const uniqueVehicles = new Set(deliveries.map(d => d.vehicleNumber)).size;

        metrics = [
          { label: 'Armada & Trip Aktif', value: `${uniqueVehicles} Unit • ${deliveries.length} Trip`, color: 'text-blue-700' },
          { label: 'Total Porsi Logistik', value: `${formatNumber(totalPortionLoaded)} Porsi`, color: 'text-emerald-700' },
          { label: 'BAST Serah Terima', value: `${completedCount} / ${deliveries.length} Selesai`, color: 'text-emerald-700' },
          { label: 'Penjemputan Ompreng', value: `${returnedCount} / ${deliveries.length} Kembali`, color: 'text-purple-700' },
        ];
        notes = 'Rekapitulasi logistik armada distribusi disinkronkan langsung dari tugas pengantaran dan penjemputan ompreng Divisi Distribusi.';
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

        signatures = [
          { role: 'Driver / Pengirim SPPG', name: bastSheetsList[0]?.distributorName || distCoord.name, idNum: distCoord.idNum },
          { role: 'Pemeriksa / PIC Sekolah', name: organolepticData.namaPemeriksa || 'PIC Sekolah', idNum: organolepticData.institutionId || '-' },
          { role: `Mengetahui Kepala ${sppgConfig.sppgName}`, name: sppgConfig.headOfSppg, idNum: `SPPG-${sppgConfig.sppgId}` },
        ];

        metrics = [
          {
            label: 'Nama Pemeriksa (PIC)',
            value: organolepticData.namaPemeriksa,
            sublabel: 'Otomatis dari Master Lembaga & Distribusi',
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
          'Form Checklist Uji Organoleptik diisi otomatis dengan PIC, waktu tiba pengiriman, dan komponen menu aktif untuk sekolah sasaran.';
        break;
      }

      // 6. Flyer Menu (Terhubung real-time dengan Menu, Resep PLOG & Kategori Porsi)
      case 'flyer_menu': {
        headers = ['No', 'Komponen Hidangan', 'Nama Olahan / Bahan', 'Gramasi Porsi Kecil', 'Gramasi Porsi Besar', 'Energi / Protein', 'Referensi TKPI'];
        const recipeRows = menuIngredientsMap[todayMenu.id] || [];
        if (recipeRows.length > 0) {
          rows = recipeRows.map((ing, idx) => {
            const weightForCalc =
              selectedPortionCategory === 'kecil' ? ing.netWeightSmall : ing.netWeightLarge;
            const calVal = ((weightForCalc / 100) * ing.calories100g).toFixed(0);
            const protVal = ((weightForCalc / 100) * ing.protein100g).toFixed(1);
            return [
              idx + 1,
              ing.category,
              ing.menuName ? `${ing.menuName} (${ing.name})` : ing.name,
              `${ing.netWeightSmall} ${ing.unit}`,
              `${ing.netWeightLarge} ${ing.unit}`,
              `${calVal} kkal / ${protVal} g (${selectedPortionCategory === 'kecil' ? 'P.Kecil' : 'P.Besar'})`,
              ing.referenceSource || 'TKPI 2020',
            ];
          });
        } else {
          rows = [
            [1, 'Makanan Pokok', todayMenu.stapleFood, '85 gram', '125 gram', 'Karbohidrat Kompleks', 'TKPI 2020'],
            [2, 'Lauk Hewani', todayMenu.animalProtein, '45 gram', '70 gram', 'Protein Tinggi, Zat Besi', 'TKPI 2020'],
            [3, 'Lauk Nabati', todayMenu.plantProtein, '40 gram', '60 gram', 'Protein Nabati', 'TKPI 2020'],
            [4, 'Sayuran', todayMenu.vegetable, '60 gram', '90 gram', 'Vitamin A, C, Serat', 'TKPI 2020'],
            [5, 'Buah Segar', todayMenu.fruit, '100 gram', '140 gram', 'Kalium, Antioksidan', 'TKPI 2020'],
          ];
        }

        if (searchKeyword.trim()) {
          const kw = searchKeyword.toLowerCase();
          rows = rows.filter(r => r.some(c => String(c).toLowerCase().includes(kw)));
        }

        excelData = rows.map(r => ({
          'Komponen': r[1],
          'Nama Olahan': r[2],
          'Porsi Kecil': r[3],
          'Porsi Besar': r[4],
          'Gizi': r[5],
          'Referensi': r[6],
        }));

        const energyDisplay =
          selectedPortionCategory === 'kecil'
            ? `${todayMenu.caloriesSmall} kkal (Porsi Kecil)`
            : selectedPortionCategory === 'besar'
            ? `${todayMenu.caloriesLarge} kkal (Porsi Besar)`
            : `${todayMenu.caloriesSmall} - ${todayMenu.caloriesLarge} kkal`;

        metrics = [
          { label: 'Total Energi Kalori', value: energyDisplay, color: 'text-blue-700' },
          { label: 'Protein Harian', value: `${todayMenu.proteinGrams} gram`, color: 'text-emerald-700' },
          { label: 'Komponen Resep Aktif', value: `${recipeRows.length || 5} Bahan`, color: 'text-amber-700' },
          { label: 'Menu Siklus Aktif', value: `${todayMenu.menuCode} (${todayMenu.dayName})`, color: 'text-purple-700' },
        ];
        notes = `Flyer menu resmi disinkronkan langsung dari Modul Perencanaan Menu & Resep PLOG serta foto Porsi Kecil & Porsi Besar dari Modul Input Gramasi & Suhu Divisi Pemorsian (${flyerPortioningData.date} — ${flyerPortioningData.officerName}).`;
        break;
      }

      // 7. Informasi Gizi (Terhubung real-time dengan Menu, Resep PLOG & Kategori Porsi)
      case 'informasi_gizi': {
        headers = ['Zat Gizi', 'Satuan', 'Kandungan Menu', 'Standar AKG BGN (Porsi Kecil)', 'Standar AKG BGN (Porsi Besar)', 'Capaian % AKG'];
        const recipeRows = menuIngredientsMap[todayMenu.id] || [];
        const useSmall = selectedPortionCategory === 'kecil';

        const summedMacros =
          recipeRows.length > 0
            ? recipeRows.reduce(
                (acc, ing) => {
                  const wSmall = (ing.netWeightSmall || 0) / 100;
                  const wLarge = (ing.netWeightLarge || 0) / 100;
                  return {
                    calSmall: acc.calSmall + wSmall * (ing.calories100g || 0),
                    calLarge: acc.calLarge + wLarge * (ing.calories100g || 0),
                    protSmall: acc.protSmall + wSmall * (ing.protein100g || 0),
                    protLarge: acc.protLarge + wLarge * (ing.protein100g || 0),
                    fatSmall: acc.fatSmall + wSmall * (ing.fat100g || 0),
                    fatLarge: acc.fatLarge + wLarge * (ing.fat100g || 0),
                    carbSmall: acc.carbSmall + wSmall * (ing.carb100g || 0),
                    carbLarge: acc.carbLarge + wLarge * (ing.carb100g || 0),
                    fiberSmall: acc.fiberSmall + wSmall * (ing.fiber100g || 0),
                    fiberLarge: acc.fiberLarge + wLarge * (ing.fiber100g || 0),
                  };
                },
                {
                  calSmall: 0,
                  calLarge: 0,
                  protSmall: 0,
                  protLarge: 0,
                  fatSmall: 0,
                  fatLarge: 0,
                  carbSmall: 0,
                  carbLarge: 0,
                  fiberSmall: 0,
                  fiberLarge: 0,
                }
              )
            : null;

        const calSmall = summedMacros && summedMacros.calSmall > 0 ? Math.round(summedMacros.calSmall) : todayMenu.caloriesSmall;
        const calLarge = summedMacros && summedMacros.calLarge > 0 ? Math.round(summedMacros.calLarge) : todayMenu.caloriesLarge;
        const calVal =
          selectedPortionCategory === 'kecil'
            ? `${calSmall} kkal`
            : selectedPortionCategory === 'besar'
            ? `${calLarge} kkal`
            : `${calSmall} / ${calLarge}`;

        const protVal = Number(
          (summedMacros
            ? useSmall
              ? summedMacros.protSmall
              : summedMacros.protLarge
            : todayMenu.proteinGrams || 0
          ).toFixed(1)
        );
        const fatVal = Number(
          (summedMacros
            ? useSmall
              ? summedMacros.fatSmall
              : summedMacros.fatLarge
            : todayMenu.fatGrams || 0
          ).toFixed(1)
        );
        const carbVal = Number(
          (summedMacros
            ? useSmall
              ? summedMacros.carbSmall
              : summedMacros.carbLarge
            : todayMenu.carbGrams || 0
          ).toFixed(1)
        );
        const fiberVal = Number(
          (summedMacros && summedMacros.fiberLarge > 0
            ? useSmall
              ? summedMacros.fiberSmall
              : summedMacros.fiberLarge
            : todayMenu.fiberGrams || 6.5
          ).toFixed(1)
        );
        const calcVal = todayMenu.calciumMg || 245;
        const ironVal = todayMenu.ironMg || 4.8;

        const targetCal = useSmall ? 600 : 750;
        const activeCal = useSmall ? calSmall : calLarge;

        rows = [
          ['Energi Total', 'kkal', calVal, '550 - 650', '650 - 850', `${Math.round((activeCal / targetCal) * 100)}% Terpenuhi`],
          ['Protein', 'gram', protVal, '22.0 - 28.0', '28.0 - 35.0', `${Math.round((protVal / (useSmall ? 24 : 28)) * 100)}%`],
          ['Lemak Sehat', 'gram', fatVal, '15.0 - 20.0', '18.0 - 25.0', `${Math.round((fatVal / (useSmall ? 17 : 20)) * 100)}%`],
          ['Karbohidrat', 'gram', carbVal, '85.0 - 105.0', '100.0 - 125.0', `${Math.round((carbVal / (useSmall ? 90 : 100)) * 100)}%`],
          ['Kalsium (Ca)', 'mg', calcVal.toFixed(1), '200.0', '250.0', `${Math.round((calcVal / 240) * 100)}%`],
          ['Zat Besi (Fe)', 'mg', ironVal.toFixed(1), '4.0', '5.5', `${Math.round((ironVal / 4.8) * 100)}%`],
          ['Serat Pangan', 'gram', fiberVal.toFixed(1), '5.0', '7.0', `${Math.round((fiberVal / 6.5) * 100)}%`],
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
          { label: useSmall ? 'Kalori Menu Porsi Kecil' : 'Kalori Menu Porsi Besar', value: `${activeCal} kkal`, color: 'text-blue-700' },
          { label: 'Protein Bersih', value: `${protVal} g`, color: 'text-emerald-700' },
          { label: 'Serat Pangan', value: `${fiberVal.toFixed(1)} g`, color: 'text-emerald-700' },
          { label: 'Ahli Gizi Verifikator', value: sppgConfig.nutritionOfficer || 'Pengawas Gizi SPPG', color: 'text-slate-700' },
        ];
        notes = 'Komposisi nilai gizi dihitung real-time dari gramasi bahan pada Modul Gizi & Resep PLOG sesuai menu aktif dan kategori porsi.';
        break;
      }

      // 8. Laporan Food Cost & Efisiensi Menu (Sinkron Input Food Cost Menu & Anggaran PLOG + Dokumentasi Ompreng)
      case 'food_cost': {
        headers = [
          'No',
          'Tanggal',
          'Menu',
          'Bahan Pokok',
          'Kebutuhan',
          'Satuan',
          'Harga Dasar',
          'Total',
          'Harga Porsi Kecil',
          'Harga Porsi Besar',
        ];

        const flattenedRows: (string | number)[][] = [];
        const excelRows: Record<string, unknown>[] = [];

        foodCostReportData.groups.forEach(group => {
          group.dishes.forEach(dish => {
            dish.ingredients.forEach(ing => {
              flattenedRows.push([
                group.no,
                group.tanggalDisplay,
                dish.menuName,
                ing.name,
                formatNumber(ing.kebutuhan),
                ing.satuan,
                formatRpNoSpace(ing.unitPrice),
                formatRpNoSpace(ing.totalCost),
                formatRpNoSpace(dish.costSmallPerPortion),
                formatRpNoSpace(dish.costLargePerPortion),
              ]);

              excelRows.push({
                'NO.': group.no,
                'TANGGAL': group.tanggalDisplay,
                'KODE MENU': group.menuCode,
                'PORSI KECIL': group.smallPortions,
                'PORSI BESAR': group.largePortions,
                'MENU': dish.menuName,
                'BAHAN POKOK': ing.name,
                'KEBUTUHAN': ing.kebutuhan,
                'SATUAN': ing.satuan,
                'HARGA DASAR/kg/bks (Rp)': ing.unitPrice,
                'TOTAL (Rp)': ing.totalCost,
                'SUB TOTAL MENU (Rp)': dish.totalCost,
                'HARGA PORSI KECIL / PORSI (Rp)': dish.costSmallPerPortion,
                'HARGA PORSI BESAR / PORSI (Rp)': dish.costLargePerPortion,
              });
            });
          });
        });

        rows = flattenedRows;
        excelData = excelRows;

        const latestGroup = foodCostReportData.groups[foodCostReportData.groups.length - 1];
        const avgCostSmall =
          foodCostReportData.groups.length > 0
            ? Math.round(
                foodCostReportData.groups.reduce((s, g) => s + g.totalCostSmallPerPortion, 0) /
                  foodCostReportData.groups.length
              )
            : 0;
        const avgCostLarge =
          foodCostReportData.groups.length > 0
            ? Math.round(
                foodCostReportData.groups.reduce((s, g) => s + g.totalCostLargePerPortion, 0) /
                  foodCostReportData.groups.length
              )
            : 0;
        const grandSpend = foodCostReportData.groups.reduce((s, g) => s + g.grandTotalCost, 0);
        const totalPaguAll = foodCostReportData.groups.reduce(
          (s, g) =>
            s +
            g.smallPortions * foodCostReportData.smallBudgetCap +
            g.largePortions * foodCostReportData.largeBudgetCap,
          0
        );
        const effTotal = totalPaguAll - grandSpend;

        metrics = [
          {
            label: 'Harga Porsi Kecil (PLOG)',
            value: formatRpNoSpace(latestGroup?.totalCostSmallPerPortion ?? avgCostSmall),
            sublabel: `Pagu BGN Kecil: ${formatRpNoSpace(foodCostReportData.smallBudgetCap)} (${latestGroup?.smallPortions || 0} porsi)`,
            color:
              (latestGroup?.totalCostSmallPerPortion ?? avgCostSmall) <=
              foodCostReportData.smallBudgetCap
                ? 'text-emerald-700'
                : 'text-rose-700',
          },
          {
            label: 'Harga Porsi Besar (PLOG)',
            value: formatRpNoSpace(latestGroup?.totalCostLargePerPortion ?? avgCostLarge),
            sublabel: `Pagu BGN Besar: ${formatRpNoSpace(foodCostReportData.largeBudgetCap)} (${latestGroup?.largePortions || 0} porsi)`,
            color:
              (latestGroup?.totalCostLargePerPortion ?? avgCostLarge) <=
              foodCostReportData.largeBudgetCap
                ? 'text-blue-700'
                : 'text-rose-700',
          },
          {
            label: 'Total Belanja Bahan Menu',
            value: formatRupiah(grandSpend),
            sublabel: `${foodCostReportData.groups.length} Menu PLOG Tercatat`,
            color: 'text-slate-900',
          },
          {
            label: effTotal >= 0 ? 'Efisiensi vs Pagu Anggaran' : 'Selisih Over Pagu',
            value: `${effTotal >= 0 ? '+' : '-'}${formatRupiah(Math.abs(effTotal))}`,
            sublabel: `Plafon Gabungan: ${formatRupiah(totalPaguAll)}`,
            color: effTotal >= 0 ? 'text-emerald-700' : 'text-rose-700',
          },
        ];

        notes =
          'Format Laporan Food Cost disinkronkan langsung dari Input Food Cost Menu & Anggaran PLOG serta dokumentasi foto ompreng Divisi Pemorsian.';
        break;
      }

      // 9. Sampel Menu (Retention Sample 3x24 Jam) — Sinkron Live dari Menu Aktif, Pengolahan, Pemorsian & Persiapan
      case 'sampel_menu': {
        headers = ['No', 'Kode Lot Sampel', 'Waktu Pengambilan', 'Komponen Menu Terkunci', 'Wadah Steril', 'Suhu Simpan Freezer', 'Petugas QC Gizi', 'Masa Retensi (3x24 Jam)', 'Status'];
        const cookRec =
          cookingRecords.find(r => r.date === selectedDate) ||
          cookingRecords[0];
        const portRec =
          portioningRecords.find(r => r.date === selectedDate) ||
          portioningRecords[0];
        const prepRec =
          prepRecords.find(r => r.date === selectedDate) ||
          prepRecords[0];

        const rawFreezerTemp =
          prepRec?.facilityTemps?.freezer1Temp ??
          cookRec?.facilityTemps?.freezer1Temp ??
          portRec?.facilityTemps?.freezer1Temp ??
          -18.5;
        const freezerTemp =
          typeof rawFreezerTemp === 'number' && Number.isFinite(rawFreezerTemp)
            ? rawFreezerTemp
            : -18.5;
        const freezerTempDisplay = `${freezerTemp.toFixed(1)}°C`;
        const dateStamp = (selectedDate || '2026-11-08').replace(/-/g, '');
        const baseTime = portRec?.portioningTime || cookRec?.time || '06:30';
        const qcOfficer =
          sppgConfig.nutritionOfficer ||
          portRec?.officerName ||
          cookRec?.officerName ||
          'Ahli Gizi SPPG';
        const retentionUntil = formatIndonesianDate(addDaysToIso(selectedDate, 3));
        const retentionLabel = `3x24 Jam (s/d ${retentionUntil})`;

        const sampleComponents = [
          {
            code: `SMPL-${dateStamp}-01`,
            time: baseTime.includes('WIB') ? baseTime : `${baseTime} WIB`,
            menuDesc: `${todayMenu.stapleFood} (${portRec?.foodTemps?.rice?.cookedWeightGrams || 100}g)`,
            container: 'Sterile Container #A1',
            status: cookRec || portRec ? 'Tersimpan Baik (Tercatat)' : 'Terjadwal Simpan',
          },
          {
            code: `SMPL-${dateStamp}-02`,
            time: baseTime.includes('WIB') ? baseTime : `${baseTime} WIB`,
            menuDesc: `${todayMenu.animalProtein} (${portRec?.foodTemps?.animalProtein?.cookedWeightGrams || 60}g)`,
            container: 'Sterile Container #A2',
            status: cookRec || portRec ? 'Tersimpan Baik (Tercatat)' : 'Terjadwal Simpan',
          },
          {
            code: `SMPL-${dateStamp}-03`,
            time: baseTime.includes('WIB') ? baseTime : `${baseTime} WIB`,
            menuDesc: `${todayMenu.plantProtein} (${portRec?.foodTemps?.plantProtein?.cookedWeightGrams || 50}g)`,
            container: 'Sterile Container #A3',
            status: cookRec || portRec ? 'Tersimpan Baik (Tercatat)' : 'Terjadwal Simpan',
          },
          {
            code: `SMPL-${dateStamp}-04`,
            time: baseTime.includes('WIB') ? baseTime : `${baseTime} WIB`,
            menuDesc: `${todayMenu.vegetable} (${portRec?.foodTemps?.vegetable?.cookedWeightGrams || 80}g)`,
            container: 'Sterile Vial #B1',
            status: cookRec || portRec ? 'Tersimpan Baik (Tercatat)' : 'Terjadwal Simpan',
          },
          {
            code: `SMPL-${dateStamp}-05`,
            time: baseTime.includes('WIB') ? baseTime : `${baseTime} WIB`,
            menuDesc: `${todayMenu.fruit}${todayMenu.milkOrExtra ? ` / ${todayMenu.milkOrExtra}` : ''} (${portRec?.foodTemps?.fruit?.cookedWeightGrams || 100}g)`,
            container: 'Sterile Container #B2',
            status: cookRec || portRec ? 'Tersimpan Baik (Tercatat)' : 'Terjadwal Simpan',
          },
        ].filter(item =>
          !searchKeyword.trim() ||
          item.menuDesc.toLowerCase().includes(searchKeyword.toLowerCase()) ||
          item.code.toLowerCase().includes(searchKeyword.toLowerCase())
        );

        rows = sampleComponents.map((item, idx) => [
          idx + 1,
          item.code,
          item.time,
          item.menuDesc,
          item.container,
          freezerTempDisplay,
          qcOfficer,
          retentionLabel,
          item.status,
        ]);

        excelData = sampleComponents.map((item, idx) => ({
          'No': idx + 1,
          'Kode Lot': item.code,
          'Tanggal Ambil': selectedDate,
          'Waktu': item.time,
          'Komponen Menu': item.menuDesc,
          'Wadah': item.container,
          'Suhu Freezer': freezerTempDisplay,
          'Petugas QC Gizi': qcOfficer,
          'Masa Retensi': retentionLabel,
          'Status': item.status,
        }));

        metrics = [
          { label: 'Total Sampel Tersegel', value: `${sampleComponents.length} Wadah`, sublabel: `Kode Menu: ${todayMenu.menuCode}`, color: 'text-blue-700' },
          { label: 'Suhu Freezer Simpan', value: freezerTempDisplay, sublabel: 'Standar Beku ≤ -18°C', color: 'text-sky-700' },
          { label: 'Protokol Retensi', value: '3 x 24 Jam', sublabel: `s/d ${retentionUntil}`, color: 'text-purple-700' },
          { label: 'Petugas QC Gizi', value: qcOfficer, color: 'text-emerald-700' },
        ];
        notes = `Sampel menu retensi dibuat otomatis dari Master Menu (${todayMenu.menuCode}) dan pembacaan suhu freezer Divisi Persiapan/Pengolahan (${formatIndonesianDate(selectedDate)}).`;
        break;
      }

      // 10. Pemeriksaan Makanan & Organoleptik PLOG (Kombinasi PLOG + Surat Pemeriksaan Makanan)
      case 'organoleptik_plog': {
        headers = [
          'Kelompok',
          'No',
          'Menu',
          'Uji Organoleptik PLOG (Visual, Aroma, Rasa & Tekstur)',
          'Suhu',
          'Baik',
          'Tidak Baik',
          'Ket.',
        ];
        const activeWet = plogOrganolepticData.wetRows.filter(r => r.menuName.trim() !== '');
        const activeDry = plogOrganolepticData.dryRows.filter(r => r.menuName.trim() !== '');
        const combinedRows = [
          ...activeWet.map(r => ({ group: 'Menu Basah', row: r })),
          ...activeDry.map(r => ({ group: 'Menu Kering', row: r })),
        ];

        rows = combinedRows.map(({ group, row }) => [
          group,
          row.no,
          row.menuName,
          row.organolepticDetail || '-',
          row.temperature || '-',
          row.outcome === 'baik' ? '✓' : '',
          row.outcome === 'tidak_baik' ? '✓' : '',
          row.ket || '-',
        ]);

        excelData = combinedRows.map(({ group, row }) => ({
          'Kelompok Menu': group,
          'No': row.no,
          'Menu': row.menuName,
          'Uji Organoleptik PLOG': row.organolepticDetail || '-',
          'Suhu Uji': row.temperature || '-',
          'Hasil Uji Baik': row.outcome === 'baik' ? 'Ya' : '-',
          'Hasil Uji Tidak Baik': row.outcome === 'tidak_baik' ? 'Ya' : '-',
          'Keterangan': row.ket || '-',
          'Sampel Disiapkan': plogOrganolepticData.samplePreparedDateLabel,
          'Setelah 2x24 Jam': plogOrganolepticData.sampleAfter2x24DateLabel,
          'Pengawas Gizi': plogOrganolepticData.officerName,
          'Head Chef': plogOrganolepticData.headChefName,
        }));

        const baikCount = combinedRows.filter(c => c.row.outcome === 'baik').length;
        const totalEvaluated = combinedRows.length;
        metrics = [
          {
            label: 'Hasil Uji Organoleptik',
            value: totalEvaluated > 0 ? `${baikCount}/${totalEvaluated} Baik` : 'Blanko Siap Isi',
            sublabel: `${activeWet.length} Menu Basah • ${activeDry.length} Menu Kering`,
            color: 'text-emerald-700',
          },
          {
            label: 'Sampel Disiapkan',
            value: plogOrganolepticData.samplePreparedDateLabel,
            sublabel: `2x24 Jam: ${plogOrganolepticData.sampleAfter2x24DateLabel}`,
            color: 'text-blue-700',
          },
          {
            label: 'Petugas Pengawas Gizi',
            value: plogOrganolepticData.officerName,
            sublabel: `Chef: ${plogOrganolepticData.headChefName}`,
            color: 'text-purple-700',
          },
          {
            label: 'Foto Sampel Ompreng',
            value: plogOrganolepticData.wetPhotoUrl ? 'Terlampir' : 'Belum Ada Foto',
            sublabel: `Kode Menu: ${plogOrganolepticData.menuCode}`,
            color: 'text-amber-700',
          },
        ];
        notes =
          plogOrganolepticData.notes ||
          'Formulir Pemeriksaan Makanan & Uji Organoleptik PLOG mencakup Menu Basah, Menu Kering, dokumentasi gambar, serta periode retensi sampel 2 x 24 jam.';
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
          .filter(x => x.item.categoryKey !== 'fruit' && x.item.categoryKey !== 'milkOrExtra')
          .flatMap(x => [x.item.sesi1.tempNum, x.item.sesi2.tempNum, x.item.sesi3.tempNum])
          .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
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

      // 12b–12k. Laporan Pemantauan Suhu & Kelembapan Ruangan / Freezer / Chiller Individual (3 Sesi)
      case 'suhu_ruang_pengolahan':
      case 'suhu_ruang_pemorsian':
      case 'suhu_gudang_basah':
      case 'suhu_gudang_kering':
      case 'suhu_freezer_1':
      case 'suhu_freezer_2':
      case 'suhu_chiller_1':
      case 'suhu_chiller_2':
      case 'suhu_chiller_3':
      case 'suhu_chiller_4': {
        headers = [
          'Ruangan / Lokasi',
          'Tanggal',
          'Batas Kritis (°C)',
          'Sesi 1 Persiapan (Jam / Suhu / RH)',
          'Sesi 2 Pengolahan (Jam / Suhu / RH)',
          'Sesi 3 Pemorsian (Jam / Suhu / RH)',
          'Dokumentasi Foto',
          'Keterangan',
        ];

        const ds = activeRoomTempDataset;
        const filteredRows = searchKeyword.trim()
          ? ds.rows.filter(row => {
              const kw = searchKeyword.toLowerCase();
              return (
                ds.unit.label.toLowerCase().includes(kw) ||
                row.tanggalDisplay.toLowerCase().includes(kw) ||
                row.keterangan.toLowerCase().includes(kw) ||
                (row.shift1.officerName || '').toLowerCase().includes(kw) ||
                (row.shift2.officerName || '').toLowerCase().includes(kw) ||
                (row.shift3.officerName || '').toLowerCase().includes(kw)
              );
            })
          : ds.rows;

        rows = filteredRows.map(row => {
          const photoCnt = [row.shift1.photoUrl, row.shift2.photoUrl, row.shift3.photoUrl].filter(
            Boolean
          ).length;
          return [
            ds.unit.label,
            row.tanggalDisplay,
            ds.unit.standard,
            `${row.shift1.jam} | ${row.shift1.suhuHasil}°C | ${row.shift1.kelembapanHasil}`,
            `${row.shift2.jam} | ${row.shift2.suhuHasil}°C | ${row.shift2.kelembapanHasil}`,
            `${row.shift3.jam} | ${row.shift3.suhuHasil}°C | ${row.shift3.kelembapanHasil}`,
            `${photoCnt}/3 Sesi Foto`,
            row.keterangan || '-',
          ];
        });

        excelData = filteredRows.map(row => ({
          Ruangan: ds.unit.label,
          Tanggal: row.tanggalDisplay,
          'Batas Kritis Suhu': row.batasKritisSuhu,
          'Batas Kritis Kelembapan': row.batasKritisKelembapan,
          'Sesi 1 (Persiapan) Jam': row.shift1.jam,
          'Sesi 1 (Persiapan) Suhu (°C)': row.shift1.suhuHasil,
          'Sesi 1 (Persiapan) Kelembapan (%)': row.shift1.kelembapanHasil,
          'Sesi 2 (Pengolahan) Jam': row.shift2.jam,
          'Sesi 2 (Pengolahan) Suhu (°C)': row.shift2.suhuHasil,
          'Sesi 2 (Pengolahan) Kelembapan (%)': row.shift2.kelembapanHasil,
          'Sesi 3 (Pemorsian) Jam': row.shift3.jam,
          'Sesi 3 (Pemorsian) Suhu (°C)': row.shift3.suhuHasil,
          'Sesi 3 (Pemorsian) Kelembapan (%)': row.shift3.kelembapanHasil,
          'Foto Sesi 1 (Persiapan)': row.shift1.photoUrl ? 'Terlampir' : 'Kosong',
          'Foto Sesi 2 (Pengolahan)': row.shift2.photoUrl ? 'Terlampir' : 'Kosong',
          'Foto Sesi 3 (Pemorsian)': row.shift3.photoUrl ? 'Terlampir' : 'Kosong',
          Keterangan: row.keterangan || '-',
        }));

        const totalPhotos = filteredRows.reduce(
          (sum, row) =>
            sum +
            [row.shift1.photoUrl, row.shift2.photoUrl, row.shift3.photoUrl].filter(Boolean).length,
          0
        );

        metrics = [
          {
            label: 'Lokasi Pemantauan',
            value: ds.unit.label,
            sublabel: `Standar Kritis: ${ds.unit.standard} • RH ${ds.rows[0]?.batasKritisKelembapan || '40-60%'}`,
            color: 'text-blue-700',
          },
          {
            label: 'Sumber Data 3 Sesi',
            value: '3 Divisi / Hari',
            sublabel: 'Sesi 1 Persiapan • Sesi 2 Pengolahan • Sesi 3 Pemorsian',
            color: 'text-emerald-700',
          },
          {
            label: 'Hari Pemantauan Tercatat',
            value: `${filteredRows.length} Hari`,
            sublabel: `Periode: ${ds.periodeLabel}`,
            color: 'text-slate-800',
          },
          {
            label: 'Dokumentasi Foto',
            value: `${totalPhotos} Foto`,
            sublabel: 'Sinkron input suhu & kelembapan divisi (klik foto zoom)',
            color: 'text-purple-700',
          },
        ];

        notes =
          `Check List Pemantauan Suhu & Kelembapan ${ds.unit.label} disinkronkan otomatis dari input Divisi Persiapan (Sesi 1), Divisi Pengolahan (Sesi 2), dan Divisi Pemorsian (Sesi 3) lengkap dengan jam, suhu (°C), kelembapan (%), dan dokumentasi foto dalam format cetak Landscape.`;
        break;
      }

      // 13. Food Waste (Sinkron Periode + Cuci Ompreng + Total Porsi Tersaji)
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
        const periodWashings = washingWasteRecords.filter(w =>
          matchesReportPeriod(w.date, periodType, selectedDate, selectedMonth, startDate, endDate)
        );
        let washings =
          periodType === 'harian' && periodWashings.length === 0
            ? washingWasteRecords
            : periodWashings;

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

        const totalDailyPortionsBaseline = Math.max(
          1,
          distributionDeliveries
            .filter(d => d.date === selectedDate)
            .reduce((s, d) => s + d.totalPortions, 0) ||
            institutions.filter(i => i.isActive).reduce((s, i) => s + i.totalPortions, 0) ||
            1000
        );

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
          const dayPortions =
            distributionDeliveries
              .filter(d => d.date === w.date)
              .reduce((s, d) => s + d.totalPortions, 0) || totalDailyPortionsBaseline;
          const instName =
            targetInstFilter?.name ||
            institutions[idx % Math.max(1, institutions.length)]?.name ||
            'Seluruh Sekolah Sasaran';
          const laukTotal = Number(((w.wasteAnimalProtein?.weight || 0) + (w.wastePlantProtein?.weight || 0)).toFixed(1));
          const sayurBuahTotal = Number(((w.wasteVegetable?.weight || 0) + (w.wasteFruit?.weight || 0)).toFixed(1));
          const photos = extractedPhotosPerRow[idx] || [];
          const avgWasteGram = ((w.totalWasteWeight * 1000) / Math.max(1, dayPortions)).toFixed(1);

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
            `${avgWasteGram} gram`,
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
              'Lembaga': targetInstFilter?.name || 'Seluruh Sekolah Sasaran',
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
        const totalServedAcrossLogs =
          washings.reduce((sum, w) => {
            const dPort = distributionDeliveries
              .filter(d => d.date === w.date)
              .reduce((s, d) => s + d.totalPortions, 0);
            return sum + (dPort || totalDailyPortionsBaseline);
          }, 0) || totalDailyPortionsBaseline;
        const avgWastePerPortionGrams = (totWaste * 1000) / Math.max(1, totalServedAcrossLogs);
        const consumptionRatePct = Math.max(0, Math.min(100, 100 - (avgWastePerPortionGrams / 350) * 100));
        const totalUploadedPhotos = extractedPhotosPerRow.reduce((acc, list) => acc + list.length, 0);

        metrics = [
          { label: 'Total Food Waste Tercatat', value: `${totWaste.toFixed(1)} kg`, color: 'text-amber-700' },
          {
            label: 'Rata-rata Sisa per Porsi',
            value: `${avgWastePerPortionGrams.toFixed(1)} gram`,
            sublabel: avgWastePerPortionGrams < 25 ? 'Sangat Rendah (<25g)' : 'Perlu Evaluasi Menu',
            color: 'text-emerald-700',
          },
          {
            label: 'Daya Habis Konsumsi',
            value: `${consumptionRatePct.toFixed(1)}%`,
            sublabel: `Dari ${formatNumber(totalServedAcrossLogs)} porsi tersaji`,
            color: 'text-blue-700',
          },
          {
            label: 'Foto Divisi Cuci Ompreng',
            value: `${totalUploadedPhotos} Foto`,
            sublabel: 'Terlampir otomatis di laporan',
            color: 'text-purple-700',
          },
        ];
        notes =
          'Sisa makanan dihitung otomatis dari penimbangan Divisi Cuci Ompreng dibagi total porsi distribusi harian. Kolom foto menampilkan dokumentasi resmi hasil unggahan Divisi Cuci Ompreng.';
        break;
      }

      // 15. RAB Bahan dan Operasional
      case 'rab': {
        headers = ['No', 'Kode RAB', 'Tanggal Rencana', 'Kategori Pengeluaran', 'Uraian Kebutuhan', 'Volume', 'Satuan', 'Estimasi Harga', 'Total Anggaran', 'Realisasi PO', 'Status'];
        const periodRabs = rabItems.filter(r =>
          matchesReportPeriod(r.planDate, periodType, selectedDate, selectedMonth, startDate, endDate)
        );
        let rabs =
          periodType === 'harian' && periodRabs.length === 0
            ? rabItems.filter(r => r.planDate.startsWith(selectedDate.slice(0, 7)))
            : periodRabs;
        if (rabs.length === 0 && periodType === 'harian') {
          rabs = rabItems;
        }
        if (searchKeyword.trim()) {
          const kw = searchKeyword.toLowerCase();
          rabs = rabs.filter(
            r =>
              r.itemName.toLowerCase().includes(kw) ||
              r.budgetCode.toLowerCase().includes(kw) ||
              r.category.toLowerCase().includes(kw)
          );
        }

        const baseRows = rabs.map((r, idx) => [
          idx + 1,
          r.budgetCode,
          formatIndonesianDate(r.planDate),
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
              'Tanggal Rencana': r.planDate,
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
        notes = `RAB disinkronkan real-time dengan Modul Pengadaan & Persetujuan ${sppgConfig.headOfSppg}.`;
        break;
      }

      // 16. Purchase Order Harian
      case 'purchase_order': {
        headers = ['No', 'Nomor PO', 'Tanggal', 'Nama Rekanan Supplier', 'Item Bahan Pangan', 'Jumlah Pesan', 'Harga Satuan', 'Total Nilai PO', 'Status Pesanan'];
        const periodPos = purchaseOrders.filter(p =>
          matchesReportPeriod(p.date, periodType, selectedDate, selectedMonth, startDate, endDate)
        );
        let pos =
          periodType === 'harian' && periodPos.length === 0
            ? purchaseOrders.filter(p => p.date.startsWith(selectedDate.slice(0, 7)))
            : periodPos;
        if (pos.length === 0 && periodType === 'harian') {
          pos = purchaseOrders;
        }
        if (searchKeyword.trim()) {
          const kw = searchKeyword.toLowerCase();
          pos = pos.filter(
            p =>
              p.supplierName.toLowerCase().includes(kw) ||
              p.poNumber.toLowerCase().includes(kw) ||
              p.items.some(i => i.itemName.toLowerCase().includes(kw))
          );
        }

        rows = pos.map((p, idx) => {
          const firstItem = p.items[0];
          const matchedSupplier = masterSuppliers.find(
            s => s.id === p.supplierId || s.name.toLowerCase() === p.supplierName.toLowerCase()
          );
          const supplierLabel = matchedSupplier?.contactPerson
            ? `${p.supplierName} (${matchedSupplier.contactPerson})`
            : p.supplierName;
          return [
            idx + 1,
            p.poNumber,
            formatIndonesianDate(p.date),
            supplierLabel,
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
          'Kontak': p.supplierContact,
          'Item': p.items.map(i => `${i.itemName} (${i.quantity} ${i.unit})`).join('; '),
          'Total Nilai': p.totalAmount,
          'Status': p.status,
          'Status QC': p.qcStatus,
        }));

        const totalPOAmount = pos.reduce((acc, p) => acc + p.totalAmount, 0);
        const completedPoCount = pos.filter(
          p =>
            p.status === 'Selesai diterima' ||
            p.status === 'Diterima di Gudang' ||
            p.qcStatus === 'Diterima' ||
            p.qcStatus === 'Lolos Penuh'
        ).length;
        const poDonePct = pos.length > 0 ? Math.round((completedPoCount / pos.length) * 100) : 0;

        metrics = [
          { label: 'Total PO Diterbitkan', value: `${pos.length} Pesanan`, color: 'text-blue-700' },
          { label: 'Akumulasi Nilai PO', value: formatRupiah(totalPOAmount), color: 'text-emerald-700' },
          { label: 'Supplier Terlibat', value: `${new Set(pos.map(p => p.supplierName)).size} Rekanan`, color: 'text-purple-700' },
          {
            label: 'Status Penerimaan PO',
            value: `${completedPoCount}/${pos.length} (${poDonePct}%)`,
            sublabel: 'Sinkron QC Gudang',
            color: 'text-slate-700',
          },
        ];
        notes = 'Seluruh PO diterbitkan dengan klausul wajib lolos QC penerimaan gudang sebelum pembayaran kasir diproses.';
        break;
      }

      // 17. Laporan Quality Control (QC) Bahan dan Operasional (Sinkron PLOK QC & Stok Gudang)
      case 'quality_control': {
        headers = [
          'No',
          'Bahan Pangan',
          'Dipesan',
          'Diterima',
          'Selisih',
          'Grade Mutu',
          'Suhu Datang',
          'Keterangan',
          'Status QC',
          'Dokumentasi',
        ];
        const periodQcs = qualityControlRecords.filter(q =>
          matchesReportPeriod((q.inspectedAt || '').slice(0, 10), periodType, selectedDate, selectedMonth, startDate, endDate)
        );
        let qcs =
          periodType === 'harian' && periodQcs.length === 0
            ? qualityControlRecords
            : periodQcs;
        if (searchKeyword.trim()) {
          const kw = searchKeyword.toLowerCase();
          qcs = qcs.filter(
            q =>
              q.itemName.toLowerCase().includes(kw) ||
              (q.notes || '').toLowerCase().includes(kw) ||
              q.qualityGrade.toLowerCase().includes(kw) ||
              q.status.toLowerCase().includes(kw)
          );
        }

        const extractQcPhotos = (q: typeof qcs[number]) => {
          const matchedInv = inventory.find(
            inv =>
              inv.latestQcId === q.id ||
              inv.qcRecordIds?.includes(q.id) ||
              inv.name.trim().toLowerCase() === q.itemName.trim().toLowerCase()
          );
          const urls: string[] = [];
          const pushUrl = (u?: unknown) => {
            if (typeof u === 'string' && u.trim() !== '' && !urls.includes(u)) {
              urls.push(u);
            }
          };
          if (Array.isArray(q.photoUrls)) {
            q.photoUrls.forEach(pushUrl);
          }
          pushUrl(q.photoUrl);
          if (matchedInv?.customFields) {
            Object.values(matchedInv.customFields).forEach(val => {
              if (typeof val === 'string' && (val.startsWith('data:image/') || val.startsWith('http'))) {
                pushUrl(val);
              }
            });
          }
          return { urls, matchedInv };
        };

        const resolveOrderedQty = (q: typeof qcs[number]) => {
          if (typeof q.orderedQuantity === 'number' && q.orderedQuantity > 0) {
            return q.orderedQuantity;
          }
          const matchedPo = purchaseOrders.find(po => po.id === q.poId || po.poNumber === q.poNumber);
          const matchedPoItem = matchedPo?.items.find(
            it => it.itemName.trim().toLowerCase() === q.itemName.trim().toLowerCase()
          );
          return matchedPoItem?.quantity ?? q.orderedQuantity ?? 0;
        };

        const resolvedQcEntries = qcs.map(q => {
          const orderedQty = resolveOrderedQty(q);
          const { urls, matchedInv } = extractQcPhotos(q);
          return { q, orderedQty, urls, matchedInv };
        });

        rows = resolvedQcEntries.map(({ q, orderedQty, urls, matchedInv }, idx) => {
          const unitLabel = q.unit || matchedInv?.unit || 'unit';
          const diff = q.receivedQuantity - orderedQty;
          const diffLabel =
            diff === 0
              ? `Sesuai (0 ${unitLabel})`
              : `${diff > 0 ? '+' : ''}${diff} ${unitLabel}`;
          if (urls.length > 0) {
            imageCells.push({
              rowIndex: idx,
              colIndex: 9,
              images: urls.map((url, pIdx) => ({
                label: `Foto ${pIdx + 1}`,
                url,
              })),
            });
          }
          return [
            idx + 1,
            q.itemName || matchedInv?.name || '-',
            `${orderedQty} ${unitLabel}`,
            `${q.receivedQuantity} ${unitLabel}`,
            diffLabel,
            q.qualityGrade,
            q.receivingTemp !== undefined ? `${q.receivingTemp}°C` : 'Suhu Ruang',
            q.notes || '-',
            q.status,
            urls.length > 0 ? `${urls.length} Foto Dokumentasi` : 'Belum ada foto',
          ];
        });

        displayRows = resolvedQcEntries.map(({ q, orderedQty, urls, matchedInv }, idx) => {
          const baseRow = rows[idx];
          const unitLabel = q.unit || matchedInv?.unit || 'unit';
          const itemDisplayName = q.itemName || matchedInv?.name || '-';
          const photoNode =
            urls.length > 0 ? (
              <div key={`qc-docs-${q.id}`} className="flex flex-wrap items-center gap-1.5 min-w-[180px] py-0.5">
                {urls.map((url, photoIdx) => (
                  <button
                    key={`${q.id}-doc-${photoIdx}`}
                    type="button"
                    onClick={() =>
                      setPreviewPhoto({
                        label: `Dokumentasi QC: ${itemDisplayName} (#${photoIdx + 1})`,
                        url,
                        caption: `Dipesan: ${orderedQty} ${unitLabel} • Diterima: ${q.receivedQuantity} ${unitLabel} • Status: ${q.status}`,
                      })
                    }
                    title={`Klik untuk perbesar foto #${photoIdx + 1}`}
                    className="relative group flex flex-col items-center rounded-md border border-slate-200 bg-slate-50 p-0.5 hover:border-blue-600 hover:bg-blue-50/40 transition print:border-slate-300 print:bg-white"
                  >
                    <img
                      src={url}
                      alt={`Dokumentasi ${itemDisplayName} #${photoIdx + 1}`}
                      className="w-12 h-11 object-cover rounded-sm"
                    />
                    <span className="text-[8.5px] font-mono font-bold text-slate-600 leading-none pt-0.5">
                      #{photoIdx + 1}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <span className="text-[11px] italic text-slate-400">Belum ada foto</span>
            );

          return [...baseRow.slice(0, 9), photoNode];
        });

        excelData = resolvedQcEntries.map(({ q, orderedQty, urls, matchedInv }, idx) => {
          const diff = q.receivedQuantity - orderedQty;
          return {
            'No': idx + 1,
            'Bahan Pangan': q.itemName || matchedInv?.name || '-',
            'Dipesan': orderedQty,
            'Diterima': q.receivedQuantity,
            'Selisih': diff,
            'Grade Mutu': q.qualityGrade,
            'Suhu Datang': q.receivingTemp ?? '-',
            'Keterangan': q.notes || '-',
            'Status QC': q.status,
            'Dokumentasi': urls.length > 0 ? `${urls.length} Foto Terlampir` : 'Belum ada foto',
          };
        });

        const totalOrdered = resolvedQcEntries.reduce((acc, e) => acc + e.orderedQty, 0);
        const totalReceived = resolvedQcEntries.reduce((acc, e) => acc + e.q.receivedQuantity, 0);
        const totalDiff = totalReceived - totalOrdered;
        const passedQcCount = resolvedQcEntries.filter(
          ({ q }) => q.status === 'Diterima' || q.status === 'Lolos Penuh'
        ).length;
        const totalDocsCount = resolvedQcEntries.reduce((acc, e) => acc + e.urls.length, 0);

        metrics = [
          { label: 'Total Item QC & Stok', value: `${resolvedQcEntries.length} Item`, color: 'text-blue-700' },
          { label: 'Dipesan vs Diterima', value: `${formatNumber(totalOrdered)} / ${formatNumber(totalReceived)}`, sublabel: `Selisih: ${totalDiff > 0 ? '+' : ''}${totalDiff}`, color: 'text-emerald-700' },
          { label: 'Dokumentasi Foto QC', value: `${totalDocsCount} Foto`, sublabel: 'Multi-foto tersinkron dari PLOK', color: 'text-purple-700' },
          { label: 'Lolos Mutu Penuh', value: `${passedQcCount} / ${resolvedQcEntries.length} Item`, color: 'text-amber-700' },
        ];

        const aslapVolunteer = masterVolunteers.find(
          v =>
            v.isActive &&
            (v.position.toLowerCase().includes('asisten lapangan') ||
              v.position.toLowerCase().includes('aslap'))
        );
        signatures = [
          {
            heading: 'Mengetahui / Memeriksa,',
            role: 'Asisten Lapangan',
            name: aslapVolunteer?.name || 'M. Eka Gusti Agung Pratama',
            idNum: aslapVolunteer?.code || `SPPG-${sppgConfig.sppgId}`,
          },
        ];

        notes = 'Data bahan pangan, jumlah dipesan, jumlah diterima, dan dokumentasi multi-foto disinkronkan otomatis dari Modul PLOK (Quality Control (QC) & Stok Gudang) serta diverifikasi oleh Asisten Lapangan.';
        break;
      }

      // 18. Kartu Stok Gudang
      case 'kartu_stok': {
        headers = ['No', 'Kode Bahan', 'Nama Bahan Pangan', 'Kategori', 'Stok Minimum', 'Stok Saat Ini', 'Satuan', 'Estimasi Nilai Stok', 'Status Ketersediaan'];
        let items = inventory;
        if (searchKeyword.trim()) {
          const kw = searchKeyword.toLowerCase();
          items = items.filter(
            i =>
              i.name.toLowerCase().includes(kw) ||
              i.category.toLowerCase().includes(kw) ||
              i.code.toLowerCase().includes(kw)
          );
        }

        const baseRows = items.map((i, idx) => {
          const isLow = i.currentStock <= i.minimumStock;
          return [
            idx + 1,
            i.code || i.id,
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
              'Kode': i.code || i.id,
              'Bahan Pangan': i.name,
              'Kategori': i.category,
              'Stok': i.currentStock,
              'Min Stok': i.minimumStock,
              'Satuan': i.unit,
              'Harga Satuan': i.pricePerUnit,
              'Lokasi': i.storageLocation,
            },
            i
          )
        );

        const totalStockVal = items.reduce((acc, i) => acc + i.currentStock * (i.pricePerUnit || 15000), 0);
        const periodMutations = stockMutations.filter(m =>
          matchesReportPeriod(m.date, periodType, selectedDate, selectedMonth, startDate, endDate)
        );
        const activeMuts = periodMutations.length > 0 ? periodMutations : stockMutations;
        const totalInMuts = activeMuts.filter(m => m.quantityIn > 0).length;
        const totalOutMuts = activeMuts.filter(m => m.quantityOut > 0).length;

        metrics = [
          { label: 'Total Item Terdaftar', value: `${items.length} SKU`, color: 'text-blue-700' },
          { label: 'Total Valuasi Stok Gudang', value: formatRupiah(totalStockVal), color: 'text-emerald-700' },
          { label: 'Stok Kritis / Menipis', value: `${items.filter(i => i.currentStock <= i.minimumStock).length} Item`, color: 'text-amber-700' },
          { label: 'Log Mutasi Periode', value: `${totalInMuts} Masuk • ${totalOutMuts} Keluar`, color: 'text-purple-700' },
        ];
        notes = 'Seluruh mutasi keluar masuk bahan dicatat secara terpusat di Kartu Stok Gudang dengan metode FEFO.';
        break;
      }

      // 19. Data Penerima Manfaat Harian (Sinkron Presensi Harian + Tugas Divisi Distribusi + Master Lembaga + Kategori Porsi)
      case 'penerima_harian': {
        headers = ['No', 'ID Lembaga', 'Nama Sekolah / Madrasah', 'Kategori', 'Kuota K / B', 'Hadir Aktual (K / B)', 'Total Porsi Aktual', 'Tidak Hadir', 'PIC & Status Sinkron'];
        let insts = targetInstFilter ? [targetInstFilter] : institutions.filter(i => i.isActive);
        if (selectedPortionCategory === 'kecil') {
          insts = insts.filter(i => i.smallPortions > 0);
        } else if (selectedPortionCategory === 'besar') {
          insts = insts.filter(i => i.largePortions > 0);
        }
        if (searchKeyword.trim()) {
          const kw = searchKeyword.toLowerCase();
          insts = insts.filter(
            i =>
              i.name.toLowerCase().includes(kw) ||
              i.address.toLowerCase().includes(kw) ||
              (i.picName || '').toLowerCase().includes(kw)
          );
        }

        const dayAttendance = beneficiaryAttendance.filter(a => a.date === selectedDate);
        const dayDeliveries = distributionDeliveries.filter(d => d.date === selectedDate);
        let totalActualServed = 0;
        let totalAbsentCount = 0;
        let totalQuotaFiltered = 0;

        const baseRows = insts.map((i, idx) => {
          const att = dayAttendance.find(a =>
            isSameInstitutionMatch(i, a.institutionId, a.institutionName)
          );
          const del = dayDeliveries.find(d =>
            isSameInstitutionMatch(i, d.institutionId, d.institutionName)
          );
          const presentSmall = att
            ? att.presentSmall
            : del
            ? del.smallPortions
            : i.smallPortions;
          const presentLarge = att
            ? att.presentLarge
            : del
            ? del.largePortions
            : i.largePortions;
          const actualTotal =
            selectedPortionCategory === 'kecil'
              ? presentSmall
              : selectedPortionCategory === 'besar'
              ? presentLarge
              : att
              ? att.actualPortions
              : del
              ? del.totalPortions
              : i.totalPortions;
          const quotaForInst =
            selectedPortionCategory === 'kecil'
              ? i.smallPortions
              : selectedPortionCategory === 'besar'
              ? i.largePortions
              : i.totalPortions;
          const absentTotal = att
            ? selectedPortionCategory === 'kecil'
              ? att.absentSmall
              : selectedPortionCategory === 'besar'
              ? att.absentLarge
              : att.totalAbsent
            : Math.max(0, quotaForInst - actualTotal);

          totalActualServed += actualTotal;
          totalAbsentCount += absentTotal;
          totalQuotaFiltered += quotaForInst;

          const picResolved = del?.picName || i.picName || i.contactPerson || 'PIC';
          const sourceLabel = att
            ? 'Presensi Real-Time'
            : del
            ? `Distribusi (${del.status})`
            : 'Kuota Master';

          return [
            idx + 1,
            i.id,
            i.name,
            i.institutionType,
            `${formatNumber(i.smallPortions)} / ${formatNumber(i.largePortions)}`,
            `${formatNumber(presentSmall)} / ${formatNumber(presentLarge)}`,
            formatNumber(actualTotal),
            absentTotal > 0 ? `${absentTotal} siswa` : '0',
            `${picResolved} (${sourceLabel})`,
          ];
        });

        const instSchema = dynamicFormSchemas.institution_form;
        const dynamicInstCols = appendDynamicExportColumns(instSchema, headers, baseRows, insts);
        headers = dynamicInstCols.headers;
        rows = dynamicInstCols.rows;

        excelData = insts.map((i, idx) => {
          const att = dayAttendance.find(a =>
            isSameInstitutionMatch(i, a.institutionId, a.institutionName)
          );
          const del = dayDeliveries.find(d =>
            isSameInstitutionMatch(i, d.institutionId, d.institutionName)
          );
          return appendDynamicExcelFields(
            instSchema,
            {
              'No': idx + 1,
              'ID Lembaga': i.id,
              'Nama Lembaga': i.name,
              'Kategori': i.institutionType,
              'Kuota Kecil': i.smallPortions,
              'Kuota Besar': i.largePortions,
              'Hadir Kecil': att ? att.presentSmall : del ? del.smallPortions : i.smallPortions,
              'Hadir Besar': att ? att.presentLarge : del ? del.largePortions : i.largePortions,
              'Total Porsi Aktual': att ? att.actualPortions : del ? del.totalPortions : i.totalPortions,
              'Absen': att ? att.totalAbsent : 0,
              'PIC': del?.picName || i.picName,
              'No HP PIC': i.picPhone || i.phone,
            },
            i
          );
        });

        metrics = [
          { label: 'Lembaga Penerima Terlayani', value: `${insts.length} Sekolah`, color: 'text-blue-700' },
          {
            label: 'Porsi Aktual Disajikan',
            value: `${formatNumber(totalActualServed)} Porsi`,
            sublabel: `Dari ${formatNumber(totalQuotaFiltered)} kuota`,
            color: 'text-emerald-700',
          },
          { label: 'Siswa Tidak Hadir', value: `${formatNumber(totalAbsentCount)} Siswa`, color: 'text-amber-700' },
          {
            label: 'Presensi & Distribusi Tgl Ini',
            value: `${dayAttendance.length} Presensi • ${dayDeliveries.length} Kirim`,
            color: 'text-purple-700',
          },
        ];
        notes = 'Daftar penerima manfaat otomatis menyatukan Kuota Master Lembaga, Presensi Kehadiran Harian, dan realisasi pengiriman Divisi Distribusi.';
        break;
      }

      // 20. Laporan Kas Petty Cash Operasional SPPG
      case 'keuangan': {
        headers = ['No', 'Tanggal', 'No. Voucher', 'Jenis Mutasi', 'Kategori Kas', 'Uraian Transaksi', 'Pihak Terkait', 'Jumlah (Rp)', 'Petugas'];
        const periodTxs = pettyCashTransactions.filter(t =>
          matchesReportPeriod(t.date, periodType, selectedDate, selectedMonth, startDate, endDate)
        );
        let txs =
          periodType === 'harian' && periodTxs.length === 0
            ? [...pettyCashTransactions]
            : [...periodTxs];
        txs.sort((a, b) => a.date.localeCompare(b.date));

        if (searchKeyword.trim()) {
          const kw = searchKeyword.toLowerCase();
          txs = txs.filter(
            t =>
              t.description.toLowerCase().includes(kw) ||
              t.voucherNumber.toLowerCase().includes(kw) ||
              t.category.toLowerCase().includes(kw) ||
              t.counterparty.toLowerCase().includes(kw)
          );
        }

        const baseRows = txs.map((t, idx) => [
          idx + 1,
          formatIndonesianDate(t.date),
          t.voucherNumber,
          t.type,
          t.category,
          t.description,
          t.counterparty,
          formatRupiah(t.amount),
          t.recordedBy,
        ]);

        const txSchema = dynamicFormSchemas.finance_tx_form;
        const dynamicTxCols = appendDynamicExportColumns(txSchema, headers, baseRows, txs);
        headers = dynamicTxCols.headers;
        rows = dynamicTxCols.rows;

        excelData = txs.map((t, idx) =>
          appendDynamicExcelFields(
            txSchema,
            {
              No: idx + 1,
              Tanggal: t.date,
              No_Voucher: t.voucherNumber,
              Jenis: t.type,
              Kategori: t.category,
              Uraian: t.description,
              Pihak_Terkait: t.counterparty,
              Nominal: t.amount,
              Petugas: t.recordedBy,
            },
            t
          )
        );

        const totalIn = txs.filter(t => t.type === 'Pemasukan').reduce((acc, t) => acc + t.amount, 0);
        const totalOut = txs.filter(t => t.type === 'Pengeluaran').reduce((acc, t) => acc + t.amount, 0);
        const endingBalance = pettyCashOpeningBalance + totalIn - totalOut;
        metrics = [
          { label: 'Saldo Awal Petty Cash', value: formatRupiah(pettyCashOpeningBalance), color: 'text-slate-700' },
          { label: 'Total Pemasukan (+)', value: formatRupiah(totalIn), color: 'text-emerald-700' },
          { label: 'Total Pengeluaran (-)', value: formatRupiah(totalOut), color: 'text-rose-700' },
          { label: 'Saldo Akhir Petty Cash', value: formatRupiah(endingBalance), color: 'text-blue-700' },
        ];
        notes = 'Laporan disinkronkan secara otomatis dari Buku Kas Petty Cash operasional SPPG termasuk pencairan insentif PIC & relawan.';
        break;
      }

      // 20b. Laporan Dinamis Status Gizi & Antropometri WHO/Kemenkes
      case 'status_gizi_who': {
        headers = [
          'No',
          'NIK (16 Digit)',
          'Nama Anak',
          'L/P',
          'Usia',
          'Lembaga / Kelas',
          'BB (kg)',
          'TB (cm)',
          'Z-Score TB/U',
          'Z-Score BB/U',
          'Z-Score BB/TB atau IMT/U',
          'Status WHO',
        ];
        let records = [...beneficiaryRecords];
        if (periodType !== 'harian') {
          const periodMatched = records.filter(r =>
            matchesReportPeriod(r.measurementDate, periodType, selectedDate, selectedMonth, startDate, endDate)
          );
          if (periodMatched.length > 0) records = periodMatched;
        }
        if (targetInstFilter) {
          records = records.filter(r =>
            isSameInstitutionMatch(
              targetInstFilter,
              r.institutionId,
              r.institutionName
            )
          );
        }
        if (selectedPortionCategory === 'kecil') {
          records = records.filter(r => r.ageMonths <= 108);
        } else if (selectedPortionCategory === 'besar') {
          records = records.filter(r => r.ageMonths > 108);
        }
        if (searchKeyword.trim()) {
          const kw = searchKeyword.toLowerCase();
          records = records.filter(
            r =>
              r.fullName.toLowerCase().includes(kw) ||
              r.nik.toLowerCase().includes(kw) ||
              r.institutionName.toLowerCase().includes(kw) ||
              r.primaryStatus.toLowerCase().includes(kw)
          );
        }

        rows = records.map((r, idx) => [
          idx + 1,
          r.nik,
          r.fullName,
          r.gender,
          `${r.ageMonths} bln`,
          `${r.institutionName} (${r.classOrGroup})`,
          r.weightKg.toFixed(1),
          r.heightCm.toFixed(1),
          r.haz.toFixed(2),
          r.waz !== null ? r.waz.toFixed(2) : '-',
          `${r.whz.toFixed(2)} (${r.whzIndexLabel})`,
          r.primaryStatus,
        ]);

        excelData = records.map((r, idx) => ({
          No: idx + 1,
          NIK: r.nik,
          'Nama Anak': r.fullName,
          'Jenis Kelamin': r.gender === 'L' ? 'Laki-laki' : 'Perempuan',
          'Usia (Bulan)': r.ageMonths,
          Lembaga: r.institutionName,
          Kelas: r.classOrGroup,
          'Tanggal Ukur': r.measurementDate,
          'Berat Badan (kg)': r.weightKg,
          'Tinggi Badan (cm)': r.heightCm,
          'Z-Score TB/U (HAZ)': r.haz,
          'Z-Score BB/U (WAZ)': r.waz ?? '-',
          'Z-Score BB/TB atau IMT/U': r.whz,
          'Indeks WHZ/BAZ': r.whzIndexLabel,
          'Status WHO': r.primaryStatus,
          Rekomendasi: r.recommendation,
        }));

        const total = records.length;
        const normalCount = records.filter(r => r.primaryStatus === 'Normal').length;
        const stuntCount = records.filter(r => r.isStunted).length;
        const wasteUnderCount = records.filter(r => r.isWasted || r.isUnderweight).length;

        metrics = [
          { label: 'Total Anak Terdata', value: `${total} Anak`, color: 'text-blue-700' },
          {
            label: 'Status Gizi Normal',
            value: `${normalCount} (${total ? ((normalCount / total) * 100).toFixed(1) : '0.0'}%)`,
            color: 'text-emerald-700',
          },
          { label: 'Indikasi Stunting (TB/U)', value: `${stuntCount} Kasus`, color: 'text-amber-700' },
          { label: 'Underweight / Wasting', value: `${wasteUnderCount} Kasus`, color: 'text-rose-700' },
        ];
        notes =
          'Laporan disinkronkan secara real-time dengan Kalkulator Antropometri WHO 2006/2007 (Permenkes RI No. 2/2020) dan validasi NIK 16-digit anti-duplikasi.';
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
    periodType,
    selectedDate,
    selectedMonth,
    startDate,
    endDate,
    selectedInstitutionId,
    selectedPortionCategory,
    searchKeyword,
    bastSheetsList,
    distributionLogs,
    outgoingDocuments,
    distributionDeliveries,
    omprengReturns,
    fuelLogs,
    prepRecords,
    cookingRecords,
    portioningRecords,
    todayMenu,
    menuIngredientsMap,
    inventory,
    stockMutations,
    masterBahan,
    masterSuppliers,
    masterVolunteers,
    masterUnits,
    rabItems,
    purchaseOrders,
    qualityControlRecords,
    institutions,
    beneficiaryAttendance,
    beneficiaryRecords,
    pettyCashOpeningBalance,
    pettyCashTransactions,
    washingWasteRecords,
    sppgConfig,
    dynamicFormSchemas,
    organolepticData,
    plogOrganolepticData,
    cookingFoodTempData,
    portioningFoodTempData,
    activeRoomTempDataset,
    foodCostReportData,
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
    if (activeReportKey === 'bast_distribusi') {
      if (bastVisibleSheets.length <= 1 && activeBastSingleSheet) {
        await exportBastDocumentPDF(activeBastSingleSheet);
      } else {
        await exportBatchBastDocumentsPDF(bastVisibleSheets, selectedDate);
      }
      return;
    }
    if (activeReportKey === 'organoleptik_penerima') {
      await exportOrganolepticChecklistPDF(organolepticData);
      return;
    }
    if (activeReportKey === 'organoleptik_plog') {
      await exportPlogOrganolepticPDF(plogOrganolepticData);
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
    if (FACILITY_REPORT_UNIT_MAP[activeReportKey]) {
      await exportRoomTempChecklistPDF(activeRoomTempDataset);
      return;
    }
    if (activeReportKey === 'food_cost') {
      await exportFoodCostReportPDF(foodCostReportData);
      return;
    }
    if (activeReportKey === 'surat_tugas') {
      await exportSuratTugasPDF(suratTugasData);
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
      {/* Paksa Orientasi A4 Landscape saat mencetak laporan berformat Landscape */}
      {reportPayload.orientation === 'landscape' && (
        <style media="print">{`@page { size: A4 landscape; margin: 8mm; }`}</style>
      )}

      {/* Print-Only Header (tersembunyi di layar normal, tampil otomatis saat dicetak untuk laporan umum; dokumen ber-Kop BGN resmi menggunakan Kop BGN bawaan) */}
      {activeReportKey !== 'bast_distribusi' &&
        activeReportKey !== 'surat_tugas' &&
        activeReportKey !== 'organoleptik_penerima' &&
        activeReportKey !== 'organoleptik_plog' &&
        activeReportKey !== 'suhu_makanan_pengolahan' &&
        activeReportKey !== 'suhu_makanan_pemorsian' &&
        !FACILITY_REPORT_UNIT_MAP[activeReportKey] &&
        activeReportKey !== 'food_cost' && (
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
              {cat === 'ALL' ? `Semua Kategori (${REPORT_CONFIGS.length} Laporan)` : cat}
            </button>
          ))}
        </div>

        {/* Filter Inputs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          {/* 1. Pilih Laporan */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Pilih Jenis Laporan ({REPORT_CONFIGS.length} Modul):</label>
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
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            )}
          </div>

          {/* 4. Filter Lembaga, Kategori Porsi & Pencarian */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Lembaga, Porsi &amp; Kata Kunci:</label>
            <div className="flex gap-1.5">
              <select
                value={selectedInstitutionId}
                onChange={e => setSelectedInstitutionId(e.target.value)}
                className="w-2/5 text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl px-2 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none truncate"
              >
                <option value="ALL">Semua Lembaga</option>
                {institutions.map(inst => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name}
                  </option>
                ))}
              </select>
              <select
                value={selectedPortionCategory}
                onChange={e => setSelectedPortionCategory(e.target.value as 'ALL' | 'kecil' | 'besar')}
                className="w-1/4 text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl px-2 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                title="Filter Kategori Porsi"
              >
                <option value="ALL">Semua Porsi</option>
                <option value="kecil">Porsi Kecil</option>
                <option value="besar">Porsi Besar</option>
              </select>
              <div className="relative w-1/3">
                <Search className="w-3.5 h-3.5 absolute left-2 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari..."
                  value={searchKeyword}
                  onChange={e => setSearchKeyword(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl pl-7 pr-2 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DOCUMENT PREVIEW CARD (WYSIWYG TAMPILAN RESMI PEMERINTAH) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden print:overflow-visible print:border-none print:shadow-none print:rounded-none">
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
          {activeReportKey === 'bast_distribusi' ? (
            <div className="space-y-5">
              {/* Control Bar Khusus Surat BAST Harian (Tersembunyi saat Cetak) */}
              <div className="print:hidden bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      Format Surat Resmi BAST Harian — Terintegrasi Log Armada &amp; BAST Digital
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Otomatis memuat Berita Acara Penerimaan Paket Makanan &amp; Berita Acara Penyerahan Alat Makan (ompreng) sesuai Master Lembaga, Presensi Harian, dan Tim Distribusi.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedInstitutionId === 'ALL' && bastSheetsList.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setBastShowAllInstitutions(v => !v)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                          bastShowAllInstitutions
                            ? 'bg-blue-900 text-white border-blue-950'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {bastShowAllInstitutions
                          ? `Menampilkan Semua (${bastSheetsList.length} Lembar BAST)`
                          : `Tampilkan Semua Lembaga (${bastSheetsList.length})`}
                      </button>
                    )}
                    {onNavigate && (
                      <button
                        type="button"
                        onClick={() => onNavigate('distribution')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold transition"
                      >
                        <span>Buka Log Armada &amp; BAST Digital</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">
                      Pilih Lembaga Sasaran BAST
                    </label>
                    <select
                      value={
                        selectedInstitutionId !== 'ALL'
                          ? selectedInstitutionId
                          : bastSingleInstId || activeBastSingleSheet?.institutionId || institutions[0]?.id || ''
                      }
                      disabled={bastShowAllInstitutions && selectedInstitutionId === 'ALL'}
                      onChange={e => {
                        setBastSingleInstId(e.target.value);
                        setBastShowAllInstitutions(false);
                      }}
                      className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-medium disabled:opacity-60"
                    >
                      {bastSheetsList.map((sheet, sIdx) => (
                        <option key={`${sheet.institutionId || sheet.institutionName}-${sIdx}`} value={sheet.institutionId || ''}>
                          {sheet.institutionName} ({formatNumber(sheet.totalPortions)} porsi) — PIC: {sheet.picName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">
                      Jam Penerimaan Paket Makanan (Opsional)
                    </label>
                    <input
                      type="text"
                      value={bastReceiveTimeOverride}
                      onChange={e => setBastReceiveTimeOverride(e.target.value)}
                      placeholder="Otomatis dari Log Pengiriman (mis. 09:05)"
                      className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">
                      Jam Penyerahan Alat Makan (Opsional)
                    </label>
                    <input
                      type="text"
                      value={bastReturnTimeOverride}
                      onChange={e => setBastReturnTimeOverride(e.target.value)}
                      placeholder="Kosongkan untuk ........ WIB"
                      className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Lembar Surat Resmi BASTDocumentSheet (Identik dengan Sub Modul Log Armada & BAST Digital) */}
              {bastVisibleSheets.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-300 rounded-xl">
                  Tidak ada data lembaga penerima yang cocok dengan filter pencarian.
                </div>
              ) : (
                <div className="space-y-8 print:space-y-0">
                  {bastVisibleSheets.map((sheet, idx) => (
                    <div
                      key={`${sheet.institutionName}-${idx}`}
                      className={`max-w-4xl mx-auto ${
                        idx < bastVisibleSheets.length - 1 ? 'print:break-after-page' : ''
                      }`}
                    >
                      <BASTDocumentSheet data={sheet} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeReportKey === 'surat_tugas' ? (
            <div className="space-y-4">
              {/* Control Bar Khusus Surat Tugas Perjalanan Kendaraan Operasional (Tersembunyi saat Cetak) */}
              <div className="print:hidden bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      Format Resmi: Surat Tugas Perjalanan Kendaraan Operasional SPPG (BGN)
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Nama petugas, jabatan/divisi, dan NIK otomatis tersinkron dari Master Data Relawan atau Arsip Surat Tugas; kendaraan &amp; tanggal dapat langsung disesuaikan sebelum cetak/PDF.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setStOverrides({})}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 transition"
                    >
                      Reset ke Data Otomatis
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowStEditor(v => !v)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-900 text-white hover:bg-blue-800 transition"
                    >
                      {showStEditor ? 'Tutup Editor Surat Tugas' : 'Edit Rincian Kendaraan & Petugas'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">
                      Pilih Petugas / Relawan (Master Data SDM)
                    </label>
                    <select
                      value={stSelectedVolunteerId}
                      onChange={e => {
                        setStSelectedVolunteerId(e.target.value);
                        setStOverrides(prev => ({
                          ...prev,
                          penerimaNama: undefined,
                          penerimaJabatan: undefined,
                          penerimaNik: undefined,
                        }));
                      }}
                      className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-medium"
                    >
                      <option value="AUTO">Otomatis (Divisi Distribusi / Surat Aktif)</option>
                      {masterVolunteers
                        .filter(v => v.isActive)
                        .map(v => (
                          <option key={v.id} value={v.id}>
                            {v.name} — Div. {v.division} ({v.position})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">
                      Sumber Nomor / Arsip Surat Tugas
                    </label>
                    <select
                      value={stSelectedDocId}
                      onChange={e => {
                        setStSelectedDocId(e.target.value);
                        setStOverrides({});
                      }}
                      className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-medium"
                    >
                      <option value="AUTO">Otomatis ({suratTugasData.letterNumber})</option>
                      {outgoingDocuments
                        .filter(d => d.type === 'Surat Tugas')
                        .map(d => (
                          <option key={d.id} value={d.id}>
                            {d.letterNumber} — {d.recipientName}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">
                      Keperluan &amp; Rute Cepat
                    </label>
                    <input
                      type="text"
                      value={stOverrides.keperluan ?? suratTugasData.keperluan}
                      onChange={e => setStOverrides(prev => ({ ...prev, keperluan: e.target.value }))}
                      placeholder="Contoh: Pengisian BBM / Pengiriman MBG"
                      className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-slate-800"
                    />
                  </div>
                </div>

                {showStEditor && (
                  <div className="pt-3 border-t border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Nomor Surat</label>
                      <input
                        type="text"
                        value={stOverrides.letterNumber ?? suratTugasData.letterNumber}
                        onChange={e => setStOverrides(prev => ({ ...prev, letterNumber: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Nama Penerima Tugas</label>
                      <input
                        type="text"
                        value={stOverrides.penerimaNama ?? suratTugasData.penerimaNama}
                        onChange={e => setStOverrides(prev => ({ ...prev, penerimaNama: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Jabatan / Divisi Penerima</label>
                      <input
                        type="text"
                        value={stOverrides.penerimaJabatan ?? suratTugasData.penerimaJabatan}
                        onChange={e => setStOverrides(prev => ({ ...prev, penerimaJabatan: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">NIK Penerima Tugas</label>
                      <input
                        type="text"
                        value={stOverrides.penerimaNik ?? suratTugasData.penerimaNik}
                        onChange={e => setStOverrides(prev => ({ ...prev, penerimaNik: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Jenis Kendaraan</label>
                      <input
                        type="text"
                        value={stOverrides.jenisKendaraan ?? suratTugasData.jenisKendaraan}
                        onChange={e => setStOverrides(prev => ({ ...prev, jenisKendaraan: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Nomor Polisi</label>
                      <input
                        type="text"
                        value={stOverrides.nomorPolisi ?? suratTugasData.nomorPolisi}
                        onChange={e => setStOverrides(prev => ({ ...prev, nomorPolisi: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Rute Perjalanan</label>
                      <input
                        type="text"
                        value={stOverrides.rutePerjalanan ?? suratTugasData.rutePerjalanan}
                        onChange={e => setStOverrides(prev => ({ ...prev, rutePerjalanan: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Waktu Pelaksanaan</label>
                      <input
                        type="text"
                        value={stOverrides.waktuPelaksanaan ?? suratTugasData.waktuPelaksanaan}
                        onChange={e => setStOverrides(prev => ({ ...prev, waktuPelaksanaan: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Diketahui Oleh (Asisten Lapangan)</label>
                      <input
                        type="text"
                        value={stOverrides.diketahuiNama ?? suratTugasData.diketahuiNama}
                        onChange={e => setStOverrides(prev => ({ ...prev, diketahuiNama: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Jabatan Diketahui Oleh</label>
                      <input
                        type="text"
                        value={stOverrides.diketahuiJabatan ?? suratTugasData.diketahuiJabatan}
                        onChange={e => setStOverrides(prev => ({ ...prev, diketahuiJabatan: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Nama Kepala SPPG (Pemberi Tugas)</label>
                      <input
                        type="text"
                        value={stOverrides.pemberiTugasNama ?? suratTugasData.pemberiTugasNama}
                        onChange={e => setStOverrides(prev => ({ ...prev, pemberiTugasNama: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">NIP Kepala SPPG</label>
                      <input
                        type="text"
                        value={stOverrides.pemberiTugasNip ?? suratTugasData.pemberiTugasNip}
                        onChange={e => setStOverrides(prev => ({ ...prev, pemberiTugasNip: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Lembar Surat Resmi SURAT TUGAS PERJALANAN KENDARAAN OPERASIONAL */}
              <div className="max-w-4xl mx-auto">
                <SuratTugasSheet data={suratTugasData} />
              </div>
            </div>
          ) : activeReportKey === 'organoleptik_penerima' ? (
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
          ) : activeReportKey === 'organoleptik_plog' ? (
            <div className="space-y-4">
              {/* Control Bar Kombinasi Pemeriksaan Makanan & Organoleptik PLOG (Tersembunyi saat Cetak) */}
              <div className="print:hidden bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      Format Kombinasi: Organoleptik PLOG + Pemeriksaan Makanan (Menu Basah &amp; Menu Kering)
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Komponen menu, suhu masak, penilai Pengawas Gizi &amp; Head Chef, foto ompreng pemorsian, dan tanggal retensi 2x24 jam terisi otomatis dan dapat disesuaikan sebelum cetak/PDF.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPlogBlankMode(v => !v);
                        setPlogCustomWetRows(null);
                        setPlogCustomDryRows(null);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                        plogBlankMode
                          ? 'bg-amber-600 text-white border-amber-700'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {plogBlankMode ? 'Mode Blanko Kosong (Aktif)' : 'Mode Blanko Siap Tulis'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPlogEditor(v => !v)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-900 text-white hover:bg-blue-800 transition cursor-pointer"
                    >
                      {showPlogEditor ? 'Tutup Editor Menu & Uji' : 'Edit Menu, Foto & Hasil Uji'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">
                      Tanggal Sampel Makanan Disiapkan
                    </label>
                    <input
                      type="text"
                      value={plogPreparedDateOverride || plogOrganolepticData.samplePreparedDateLabel}
                      onChange={e => setPlogPreparedDateOverride(e.target.value)}
                      className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">
                      Tanggal Sampel Setelah 2 x 24 Jam
                    </label>
                    <input
                      type="text"
                      value={plogAfterDateOverride || plogOrganolepticData.sampleAfter2x24DateLabel}
                      onChange={e => setPlogAfterDateOverride(e.target.value)}
                      className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">
                      Nama Petugas / Pengawas Gizi
                    </label>
                    <input
                      type="text"
                      value={plogOfficerOverride || plogOrganolepticData.officerName}
                      onChange={e => setPlogOfficerOverride(e.target.value)}
                      className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">
                      Penilai Dapur (Head Chef PLOG)
                    </label>
                    <input
                      type="text"
                      value={plogChefOverride || plogOrganolepticData.headChefName}
                      onChange={e => setPlogChefOverride(e.target.value)}
                      className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">
                      Diperiksa oleh (Kepala SPPG)
                    </label>
                    <input
                      type="text"
                      value={plogKepalaOverride || plogOrganolepticData.kepalaSppgName}
                      onChange={e => setPlogKepalaOverride(e.target.value)}
                      className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">
                      NIP Kepala SPPG (Opsional)
                    </label>
                    <input
                      type="text"
                      value={plogNipOverride}
                      onChange={e => setPlogNipOverride(e.target.value)}
                      placeholder="Contoh: 20020918 202621 2 004"
                      className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-slate-800"
                    />
                  </div>
                </div>

                {/* Upload Foto Menu Basah & Menu Kering */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-xs">
                  <div className="flex items-center justify-between gap-2 p-2.5 bg-white border border-slate-200 rounded-lg">
                    <div>
                      <span className="font-bold text-slate-700 block">Foto Sampel Menu Basah (Ompreng)</span>
                      <span className="text-[11px] text-slate-500">
                        {plogOrganolepticData.wetPhotoUrl ? 'Foto aktif terpasang di kolom Gambar' : 'Belum ada foto'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <label className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold cursor-pointer border border-slate-300">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = () => {
                              if (typeof reader.result === 'string') {
                                setPlogWetPhotoOverride(reader.result);
                              }
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                      </label>
                      {plogWetPhotoOverride !== undefined && (
                        <button
                          type="button"
                          onClick={() => setPlogWetPhotoOverride(undefined)}
                          className="px-2 py-1.5 rounded-lg text-[11px] text-rose-700 hover:bg-rose-50 font-semibold"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 p-2.5 bg-white border border-slate-200 rounded-lg">
                    <div>
                      <span className="font-bold text-slate-700 block">Foto Sampel Menu Kering (Opsional)</span>
                      <span className="text-[11px] text-slate-500">
                        {plogOrganolepticData.dryPhotoUrl ? 'Foto Menu Kering terpasang' : 'Kosong (seperti blanko standar)'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <label className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold cursor-pointer border border-slate-300">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = () => {
                              if (typeof reader.result === 'string') {
                                setPlogDryPhotoOverride(reader.result);
                              }
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                      </label>
                      {plogDryPhotoOverride && (
                        <button
                          type="button"
                          onClick={() => setPlogDryPhotoOverride(undefined)}
                          className="px-2 py-1.5 rounded-lg text-[11px] text-rose-700 hover:bg-rose-50 font-semibold"
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {showPlogEditor && (
                  <div className="pt-3 border-t border-slate-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">
                        Editor Baris Menu Basah &amp; Menu Kering + Penilaian Organoleptik PLOG
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setPlogCustomWetRows(null);
                          setPlogCustomDryRows(null);
                          setPlogNotesOverride(undefined);
                        }}
                        className="text-[11px] font-semibold text-blue-700 hover:underline cursor-pointer"
                      >
                        Reset ke Data Menu Otomatis
                      </button>
                    </div>

                    {/* Menu Basah Editor */}
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-bold uppercase text-slate-700">1. Menu Basah (Baris 1–7)</div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border border-slate-200 bg-white">
                          <thead>
                            <tr className="bg-slate-100 text-slate-700 font-semibold">
                              <th className="p-1.5 border border-slate-200 w-9">No</th>
                              <th className="p-1.5 border border-slate-200 text-left">Nama Menu</th>
                              <th className="p-1.5 border border-slate-200 text-left">Visual, Aroma, Rasa &amp; Tekstur (PLOG)</th>
                              <th className="p-1.5 border border-slate-200 w-20">Suhu</th>
                              <th className="p-1.5 border border-slate-200 w-28">Hasil Uji</th>
                              <th className="p-1.5 border border-slate-200">Ket.</th>
                            </tr>
                          </thead>
                          <tbody>
                            {plogOrganolepticData.wetRows.map((row, idx) => (
                              <tr key={`edit-wet-${row.no}`}>
                                <td className="p-1 border border-slate-200 text-center font-medium">{row.no}</td>
                                <td className="p-1 border border-slate-200">
                                  <input
                                    type="text"
                                    value={row.menuName}
                                    onChange={e => {
                                      const next = plogOrganolepticData.wetRows.map((item, i) =>
                                        i === idx ? { ...item, menuName: e.target.value } : item
                                      );
                                      setPlogCustomWetRows(next);
                                    }}
                                    placeholder="Nama hidangan..."
                                    className="w-full px-2 py-1 border border-slate-200 rounded text-xs"
                                  />
                                </td>
                                <td className="p-1 border border-slate-200">
                                  <input
                                    type="text"
                                    value={row.organolepticDetail}
                                    onChange={e => {
                                      const next = plogOrganolepticData.wetRows.map((item, i) =>
                                        i === idx ? { ...item, organolepticDetail: e.target.value } : item
                                      );
                                      setPlogCustomWetRows(next);
                                    }}
                                    placeholder="Warna, aroma, rasa, tekstur..."
                                    className="w-full px-2 py-1 border border-slate-200 rounded text-xs"
                                  />
                                </td>
                                <td className="p-1 border border-slate-200">
                                  <input
                                    type="text"
                                    value={row.temperature}
                                    onChange={e => {
                                      const next = plogOrganolepticData.wetRows.map((item, i) =>
                                        i === idx ? { ...item, temperature: e.target.value } : item
                                      );
                                      setPlogCustomWetRows(next);
                                    }}
                                    placeholder="78.5°C"
                                    className="w-full px-2 py-1 border border-slate-200 rounded text-xs text-center"
                                  />
                                </td>
                                <td className="p-1 border border-slate-200">
                                  <select
                                    value={row.outcome}
                                    onChange={e => {
                                      const val = e.target.value as 'baik' | 'tidak_baik' | '';
                                      const next = plogOrganolepticData.wetRows.map((item, i) =>
                                        i === idx ? { ...item, outcome: val } : item
                                      );
                                      setPlogCustomWetRows(next);
                                    }}
                                    className="w-full px-1.5 py-1 border border-slate-200 rounded text-xs"
                                  >
                                    <option value="">(Kosong)</option>
                                    <option value="baik">✓ Baik</option>
                                    <option value="tidak_baik">✓ Tidak Baik</option>
                                  </select>
                                </td>
                                <td className="p-1 border border-slate-200">
                                  <input
                                    type="text"
                                    value={row.ket}
                                    onChange={e => {
                                      const next = plogOrganolepticData.wetRows.map((item, i) =>
                                        i === idx ? { ...item, ket: e.target.value } : item
                                      );
                                      setPlogCustomWetRows(next);
                                    }}
                                    placeholder="Keterangan..."
                                    className="w-full px-2 py-1 border border-slate-200 rounded text-xs"
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Menu Kering Editor */}
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-bold uppercase text-slate-700">2. Menu Kering (Baris 1–7)</div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border border-slate-200 bg-white">
                          <thead>
                            <tr className="bg-slate-100 text-slate-700 font-semibold">
                              <th className="p-1.5 border border-slate-200 w-9">No</th>
                              <th className="p-1.5 border border-slate-200 text-left">Nama Menu Kering</th>
                              <th className="p-1.5 border border-slate-200 text-left">Visual, Aroma, Rasa &amp; Kemasan</th>
                              <th className="p-1.5 border border-slate-200 w-20">Suhu</th>
                              <th className="p-1.5 border border-slate-200 w-28">Hasil Uji</th>
                              <th className="p-1.5 border border-slate-200">Ket.</th>
                            </tr>
                          </thead>
                          <tbody>
                            {plogOrganolepticData.dryRows.map((row, idx) => (
                              <tr key={`edit-dry-${row.no}`}>
                                <td className="p-1 border border-slate-200 text-center font-medium">{row.no}</td>
                                <td className="p-1 border border-slate-200">
                                  <input
                                    type="text"
                                    value={row.menuName}
                                    onChange={e => {
                                      const next = plogOrganolepticData.dryRows.map((item, i) =>
                                        i === idx ? { ...item, menuName: e.target.value } : item
                                      );
                                      setPlogCustomDryRows(next);
                                    }}
                                    placeholder="Susu UHT / Biskuit / Snack..."
                                    className="w-full px-2 py-1 border border-slate-200 rounded text-xs"
                                  />
                                </td>
                                <td className="p-1 border border-slate-200">
                                  <input
                                    type="text"
                                    value={row.organolepticDetail}
                                    onChange={e => {
                                      const next = plogOrganolepticData.dryRows.map((item, i) =>
                                        i === idx ? { ...item, organolepticDetail: e.target.value } : item
                                      );
                                      setPlogCustomDryRows(next);
                                    }}
                                    placeholder="Kemasan, aroma, rasa..."
                                    className="w-full px-2 py-1 border border-slate-200 rounded text-xs"
                                  />
                                </td>
                                <td className="p-1 border border-slate-200">
                                  <input
                                    type="text"
                                    value={row.temperature}
                                    onChange={e => {
                                      const next = plogOrganolepticData.dryRows.map((item, i) =>
                                        i === idx ? { ...item, temperature: e.target.value } : item
                                      );
                                      setPlogCustomDryRows(next);
                                    }}
                                    placeholder="24.0°C"
                                    className="w-full px-2 py-1 border border-slate-200 rounded text-xs text-center"
                                  />
                                </td>
                                <td className="p-1 border border-slate-200">
                                  <select
                                    value={row.outcome}
                                    onChange={e => {
                                      const val = e.target.value as 'baik' | 'tidak_baik' | '';
                                      const next = plogOrganolepticData.dryRows.map((item, i) =>
                                        i === idx ? { ...item, outcome: val } : item
                                      );
                                      setPlogCustomDryRows(next);
                                    }}
                                    className="w-full px-1.5 py-1 border border-slate-200 rounded text-xs"
                                  >
                                    <option value="">(Kosong)</option>
                                    <option value="baik">✓ Baik</option>
                                    <option value="tidak_baik">✓ Tidak Baik</option>
                                  </select>
                                </td>
                                <td className="p-1 border border-slate-200">
                                  <input
                                    type="text"
                                    value={row.ket}
                                    onChange={e => {
                                      const next = plogOrganolepticData.dryRows.map((item, i) =>
                                        i === idx ? { ...item, ket: e.target.value } : item
                                      );
                                      setPlogCustomDryRows(next);
                                    }}
                                    placeholder="Keterangan..."
                                    className="w-full px-2 py-1 border border-slate-200 rounded text-xs"
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Catatan Surat Editor */}
                    <div className="text-xs">
                      <label className="block font-semibold text-slate-600 mb-1">
                        Catatan Pemeriksaan (Kosongkan untuk mencetak garis tulis manual)
                      </label>
                      <textarea
                        rows={2}
                        value={plogNotesOverride !== undefined ? plogNotesOverride : plogOrganolepticData.notes}
                        onChange={e => setPlogNotesOverride(e.target.value)}
                        className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-slate-800"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Lembar Surat Resmi Kombinasi PEMERIKSAAN MAKANAN & ORGANOLEPTIK PLOG */}
              <div className="max-w-4xl mx-auto">
                <PlogOrganolepticSheet
                  data={plogOrganolepticData}
                  onPreviewPhoto={setPreviewPhoto}
                />
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
          ) : FACILITY_REPORT_UNIT_MAP[activeReportKey] ? (
            <div className="space-y-4">
              {/* Control Bar Sub-Menu Surat Pemantauan Suhu & Kelembapan (Tersembunyi saat Cetak) */}
              <div className="print:hidden bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      Format Surat Resmi Landscape — {activeRoomTempDataset.unit.shortLabel} (3 Sesi)
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Data waktu, suhu (°C), dan dokumentasi foto diambil otomatis dari input Divisi Persiapan sebagai Sesi 1, Divisi Pengolahan sebagai Sesi 2, dan Divisi Pemorsian sebagai Sesi 3. Klik foto untuk memperbesar.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {onNavigate && (
                      <button
                        type="button"
                        onClick={() => onNavigate('production')}
                        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold transition"
                      >
                        <span>Input Suhu Divisi Dapur</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Navigasi Cepat Sub-Menu Surat Ruangan & Pendingin */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {(
                    [
                      { key: 'suhu_ruang_pengolahan', label: 'Ruang Pengolahan' },
                      { key: 'suhu_ruang_pemorsian', label: 'Ruang Pemorsian' },
                      { key: 'suhu_gudang_basah', label: 'Gudang Basah' },
                      { key: 'suhu_gudang_kering', label: 'Gudang Kering' },
                      { key: 'suhu_freezer_1', label: 'Freezer 1' },
                      { key: 'suhu_freezer_2', label: 'Freezer 2' },
                      { key: 'suhu_chiller_1', label: 'Chiller 1' },
                      { key: 'suhu_chiller_2', label: 'Chiller 2' },
                      { key: 'suhu_chiller_3', label: 'Chiller 3' },
                      { key: 'suhu_chiller_4', label: 'Chiller 4' },
                    ] as const
                  ).map(opt => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setActiveReportKey(opt.key)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
                        activeReportKey === opt.key
                          ? 'bg-blue-900 text-white border-blue-950 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Catatan Tambahan per Tanggal (Opsional) */}
                {activeRoomTempDataset.rows.length > 0 && (
                  <div className="pt-2 border-t border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                    {activeRoomTempDataset.rows.slice(0, 3).map(r => (
                      <div key={`note-${r.isoDate}`}>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                          Keterangan Tanggal {r.tanggalDisplay} (Opsional)
                        </label>
                        <input
                          type="text"
                          value={roomTempNotesByDate[r.isoDate] || ''}
                          onChange={e =>
                            setRoomTempNotesByDate(prev => ({
                              ...prev,
                              [r.isoDate]: e.target.value,
                            }))
                          }
                          placeholder="Tambahkan keterangan audit ruangan..."
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Lembar Checklist Landscape Resmi */}
              <div className="w-full">
                <RoomTempChecklistSheet
                  data={activeRoomTempDataset}
                  onPreviewPhoto={setPreviewPhoto}
                />
              </div>
            </div>
          ) : activeReportKey === 'food_cost' ? (
            <div className="space-y-4">
              {/* Control Bar Integrasi Input Food Cost Menu & Anggaran PLOG (Tersembunyi saat Cetak) */}
              <div className="print:hidden bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Sinkronisasi Otomatis: Input Food Cost Menu &amp; Anggaran (PLOG) + Dokumentasi Ompreng
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Rincian menu, bahan pokok, kebutuhan, satuan, harga dasar, sub total, dan harga porsi kecil/besar ditarik langsung dari modul PLOG (Perencanaan Menu &amp; Food Cost), dilengkapi dokumentasi foto ompreng Divisi Pemorsian dalam tampilan &amp; cetak Landscape.
                  </p>
                </div>
                {onNavigate && (
                  <button
                    type="button"
                    onClick={() => onNavigate('menu')}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold transition"
                  >
                    <span>Input Food Cost di PLOG</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Lembar Surat Resmi LAPORAN FOOD COST (Landscape) */}
              <div className="w-full">
                <FoodCostReportSheet
                  data={foodCostReportData}
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

            {/* Dokumentasi Foto Porsi Kecil & Besar Otomatis dari Divisi Pemorsian (Khusus Laporan Flyer Menu) */}
            {activeReportKey === 'flyer_menu' && (
              <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl border border-blue-200 bg-blue-50/40 flex items-center gap-3">
                  <img
                    src={flyerPortioningData.smallPhoto}
                    alt="Foto Porsi Kecil Divisi Pemorsian"
                    onClick={() =>
                      setPreviewPhoto({
                        label: 'Foto Porsi Kecil (Divisi Pemorsian)',
                        url: flyerPortioningData.smallPhoto,
                        caption: `Gramasi: ~${flyerPortioningData.smallGrams}g • Tanggal: ${flyerPortioningData.date} • Petugas: ${flyerPortioningData.officerName}`,
                      })
                    }
                    className="w-24 h-20 object-cover rounded-lg border border-blue-200 cursor-pointer shrink-0 hover:opacity-90"
                  />
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase text-blue-800">
                      Foto Porsi Kecil (Otomatis Pemorsian)
                    </div>
                    <div className="text-sm font-black text-slate-900 mt-0.5">
                      ~{flyerPortioningData.smallGrams} gram / ompreng
                    </div>
                    <div className="text-[11px] text-slate-600 mt-0.5">
                      {todayMenu.caloriesSmall} kkal • PAUD/TK &amp; SD Kelas 1–3
                    </div>
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/40 flex items-center gap-3">
                  <img
                    src={flyerPortioningData.largePhoto}
                    alt="Foto Porsi Besar Divisi Pemorsian"
                    onClick={() =>
                      setPreviewPhoto({
                        label: 'Foto Porsi Besar (Divisi Pemorsian)',
                        url: flyerPortioningData.largePhoto,
                        caption: `Gramasi: ~${flyerPortioningData.largeGrams}g • Tanggal: ${flyerPortioningData.date} • Petugas: ${flyerPortioningData.officerName}`,
                      })
                    }
                    className="w-24 h-20 object-cover rounded-lg border border-emerald-200 cursor-pointer shrink-0 hover:opacity-90"
                  />
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase text-emerald-800">
                      Foto Porsi Besar (Otomatis Pemorsian)
                    </div>
                    <div className="text-sm font-black text-slate-900 mt-0.5">
                      ~{flyerPortioningData.largeGrams} gram / ompreng
                    </div>
                    <div className="text-[11px] text-slate-600 mt-0.5">
                      {todayMenu.caloriesLarge} kkal • SD 4–6, SMP, SMA &amp; Santri
                    </div>
                  </div>
                </div>
              </div>
            )}

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

            {/* Legalization & Signatures */}
            <div
              className={`mt-8 pt-6 border-t border-slate-200 grid gap-6 text-center text-xs ${
                reportPayload.signatures.length === 1
                  ? 'grid-cols-1 max-w-xs ml-auto'
                  : reportPayload.signatures.length === 2
                  ? 'grid-cols-1 md:grid-cols-2'
                  : 'grid-cols-1 md:grid-cols-3'
              }`}
            >
              {reportPayload.signatures.map((sig, idx) => (
                <div key={idx} className="flex flex-col items-center justify-between h-36 p-3 bg-slate-50/50 rounded-xl border border-dashed border-slate-300">
                  <div>
                    <span className="text-slate-500 block">
                      {sig.heading ||
                        (idx === reportPayload.signatures.length - 1
                          ? `${sppgConfig.district}, ${formatIndonesianDate(selectedDate)}`
                          : 'Mengetahui / Memeriksa,')}
                    </span>
                    <strong className="text-slate-800 block mt-0.5">{sig.role}</strong>
                  </div>

                  <div>
                    <strong className="text-slate-900 block underline font-bold">{sig.name}</strong>
                    <span className="text-slate-500 font-mono text-[11px] block mt-0.5">
                      {sig.idNum ? `NIP/ID: ${sig.idNum}` : `ID: SPPG-${sppgConfig.sppgId}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Watermark / Legal disclaimer */}
            <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
              <span>Sistem Informasi Pemenuhan Gizi (E-SPPG TMG2) • ID {sppgConfig.sppgId}</span>
              <span>Dokumen Negara Resmi • {sppgConfig.programName} {sppgConfig.nationalAgency}</span>
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
        <div
          data-print-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs animate-in fade-in duration-150 print:static print:inset-auto print:bg-white print:p-0 print:block print:overflow-visible"
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 print:max-w-full print:max-h-none print:overflow-visible print:shadow-none print:border-none print:rounded-none print:block">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 print:hidden">
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
            <div
              data-print-modal-body="true"
              className="p-6 overflow-y-auto bg-slate-100 flex justify-center print:p-0 print:overflow-visible print:bg-white print:block"
            >
              {activeReportKey === 'bast_distribusi' ? (
                <div className="max-w-4xl w-full space-y-6">
                  {bastVisibleSheets.map((sheet, idx) => (
                    <BASTDocumentSheet
                      key={`modal-${sheet.institutionName}-${idx}`}
                      data={sheet}
                      className="border-slate-300 shadow-md"
                    />
                  ))}
                </div>
              ) : activeReportKey === 'surat_tugas' ? (
                <SuratTugasSheet
                  data={suratTugasData}
                  className="max-w-4xl w-full border-slate-300 shadow-md"
                />
              ) : activeReportKey === 'organoleptik_penerima' ? (
                <OrganolepticChecklistSheet
                  data={organolepticData}
                  className="max-w-4xl w-full border-slate-300 shadow-md"
                />
              ) : activeReportKey === 'organoleptik_plog' ? (
                <PlogOrganolepticSheet
                  data={plogOrganolepticData}
                  onPreviewPhoto={setPreviewPhoto}
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
              ) : FACILITY_REPORT_UNIT_MAP[activeReportKey] ? (
                <RoomTempChecklistSheet
                  data={activeRoomTempDataset}
                  onPreviewPhoto={setPreviewPhoto}
                  className="max-w-6xl w-full border-slate-300 shadow-md"
                />
              ) : activeReportKey === 'food_cost' ? (
                <FoodCostReportSheet
                  data={foodCostReportData}
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
                    <p className="text-[11px] text-slate-600">Pelaksanaan: {periodLabelString}</p>
                  </div>

                  {activeReportKey === 'flyer_menu' && (
                    <div className="mb-3 grid grid-cols-2 gap-3 text-[11px]">
                      <div className="p-2.5 rounded-lg border border-blue-200 bg-blue-50/40 flex items-center gap-2.5">
                        <img
                          src={flyerPortioningData.smallPhoto}
                          alt="Foto Porsi Kecil"
                          className="w-20 h-16 object-cover rounded border border-blue-200 shrink-0"
                        />
                        <div>
                          <div className="text-[9px] font-bold uppercase text-blue-800">Foto Porsi Kecil (Pemorsian)</div>
                          <div className="font-black text-slate-900">~{flyerPortioningData.smallGrams}g • {todayMenu.caloriesSmall} kkal</div>
                          <div className="text-[10px] text-slate-600">PAUD/TK &amp; SD Kelas 1–3</div>
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/40 flex items-center gap-2.5">
                        <img
                          src={flyerPortioningData.largePhoto}
                          alt="Foto Porsi Besar"
                          className="w-20 h-16 object-cover rounded border border-emerald-200 shrink-0"
                        />
                        <div>
                          <div className="text-[9px] font-bold uppercase text-emerald-800">Foto Porsi Besar (Pemorsian)</div>
                          <div className="font-black text-slate-900">~{flyerPortioningData.largeGrams}g • {todayMenu.caloriesLarge} kkal</div>
                          <div className="text-[10px] text-slate-600">SD 4–6, SMP, SMA &amp; Santri</div>
                        </div>
                      </div>
                    </div>
                  )}

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

                  {reportPayload.notes && (
                    <div className="mt-3 p-2.5 bg-blue-50/70 rounded border border-blue-200 text-[10px] text-slate-700">
                      <strong className="text-blue-950">Catatan Verifikasi: </strong>
                      {reportPayload.notes}
                    </div>
                  )}

                  {/* Signatures */}
                  <div
                    className={`grid gap-4 pt-6 mt-6 border-t border-slate-200 text-center text-[11px] ${
                      reportPayload.signatures.length === 1
                        ? 'grid-cols-1 max-w-xs ml-auto'
                        : reportPayload.signatures.length === 2
                        ? 'grid-cols-2'
                        : 'grid-cols-3'
                    }`}
                  >
                    {reportPayload.signatures.map((sig, sIdx) => (
                      <div key={sIdx} className="space-y-12">
                        <div>
                          <span className="block text-slate-500 text-[10px]">
                            {sig.heading ||
                              (sIdx === reportPayload.signatures.length - 1
                                ? `${sppgConfig.district}, ${formatIndonesianDate(selectedDate)}`
                                : 'Mengetahui / Memeriksa,')}
                          </span>
                          <span className="block text-slate-700 font-semibold">{sig.role}</span>
                        </div>
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
