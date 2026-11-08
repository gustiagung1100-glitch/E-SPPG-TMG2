import React, { useState, useMemo } from 'react';
import { useApp } from '../../lib/store';
import { DataTable, Column } from '../common/DataTable';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { PrintHeader } from '../common/PrintHeader';
import {
  exportTableToPDF,
  exportToExcel,
  formatNumber,
  formatRupiah,
  triggerPrint,
  formatIndonesianDate,
} from '../../lib/exportUtils';
import { Institution, BeneficiaryAttendanceLog, BeneficiaryQuotaHistory } from '../../types';
import {
  School,
  Plus,
  Edit,
  Trash2,
  MapPin,
  Phone,
  UserCheck,
  AlertTriangle,
  Building,
  Route,
  Search,
  Calendar,
  History,
  BarChart3,
  FileSpreadsheet,
  Printer,
  CheckCircle2,
  XCircle,
  ArrowUpDown,
  UserX,
  CheckSquare,
  Info,
  Percent,
  TrendingUp,
  CreditCard,
  Layers,
  ArrowRight,
  ClipboardCheck,
  Users2,
} from 'lucide-react';

type TabKey =
  | 'data_lembaga'
  | 'presensi_harian'
  | 'riwayat_kuota'
  | 'rekap_harian'
  | 'rekap_mingguan_bulanan'
  | 'rekap_lembaga';

export const InstitutionsModule: React.FC = () => {
  const {
    institutions,
    addInstitution,
    updateInstitution,
    updateInstitutionQuotaWithHistory,
    deleteInstitution,
    beneficiaryAttendance,
    recordBeneficiaryAttendance,
    beneficiaryQuotaHistory,
    hasPermission,
    sppgConfig,
    currentUser,
    addToast,
  } = useApp();

  // Active Sub-Tab
  const [activeTab, setActiveTab] = useState<TabKey>('data_lembaga');

  // Filter Jenjang on Lembaga Tab
  const [filterLevel, setFilterLevel] = useState<string>('ALL');

  // Modal State for Lembaga (Create / Edit)
  const [isLembagaModalOpen, setIsLembagaModalOpen] = useState(false);
  const [selectedInst, setSelectedInst] = useState<Institution | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form State for Lembaga CRUD
  const [formData, setFormData] = useState<Omit<Institution, 'id'>>({
    name: '',
    institutionType: 'Sekolah Dasar (SD)',
    level: 'SD',
    address: '',
    npsn: '',
    contactPerson: '',
    phone: '',
    picName: '',
    picPhone: '',
    bankName: 'Bank Jatim',
    accountNumber: '',
    bankAccountName: '',
    smallPortions: 0,
    largePortions: 0,
    totalPortions: 0,
    deliveryRoute: 'Rute A - Temenggungan',
    deliveryOrder: 1,
    allergiesNote: '',
    isActive: true,
  });

  // Modal State for Quota Change with History
  const [isQuotaModalOpen, setIsQuotaModalOpen] = useState(false);
  const [quotaTargetInst, setQuotaTargetInst] = useState<Institution | null>(null);
  const [quotaForm, setQuotaForm] = useState({
    smallPortions: 0,
    largePortions: 0,
    reason: '',
  });

  // Daily Attendance Form State
  const [attendanceForm, setAttendanceForm] = useState({
    date: '2026-11-08',
    institutionId: institutions[0]?.id || '',
    absentSmall: 0,
    absentLarge: 0,
    notes: '',
    recordedBy: currentUser.name,
    bastConfirmed: true,
  });

  // Rekap Date Picker (for Daily Rekap)
  const [rekapDate, setRekapDate] = useState<string>('2026-11-08');

  // Rekap View Toggle: 'mingguan' or 'bulanan'
  const [rekapPeriodType, setRekapPeriodType] = useState<'mingguan' | 'bulanan'>('mingguan');

  // Detail Modal for BAST / Print
  const [selectedAttendanceForBast, setSelectedAttendanceForBast] = useState<BeneficiaryAttendanceLog | null>(null);

  // Filtered institutions
  const filteredInstitutions = useMemo(() => {
    if (filterLevel === 'ALL') return institutions;
    return institutions.filter(i => i.level === filterLevel);
  }, [institutions, filterLevel]);

  // Aggregate stats
  const totalRegisteredSmall = useMemo(() => institutions.reduce((acc, i) => acc + i.smallPortions, 0), [institutions]);
  const totalRegisteredLarge = useMemo(() => institutions.reduce((acc, i) => acc + i.largePortions, 0), [institutions]);
  const totalRegisteredAll = totalRegisteredSmall + totalRegisteredLarge;

  // Selected institution for attendance form
  const selectedInstForAttendance = useMemo(() => {
    return institutions.find(i => i.id === attendanceForm.institutionId) || institutions[0];
  }, [institutions, attendanceForm.institutionId]);

  // Real-time calculation for attendance form based on formula:
  // Jumlah hadir = Jumlah terdaftar - Jumlah tidak hadir
  // Jumlah porsi aktual = Total jumlah hadir seluruh kategori
  const registeredSmallCurrent = selectedInstForAttendance ? selectedInstForAttendance.smallPortions : 0;
  const registeredLargeCurrent = selectedInstForAttendance ? selectedInstForAttendance.largePortions : 0;
  const totalRegisteredCurrent = registeredSmallCurrent + registeredLargeCurrent;

  const absentSmallCurrent = Number(attendanceForm.absentSmall) || 0;
  const absentLargeCurrent = Number(attendanceForm.absentLarge) || 0;
  const totalAbsentCurrent = absentSmallCurrent + absentLargeCurrent;

  // Validation: Jumlah tidak hadir tidak boleh melebihi jumlah terdaftar
  const isAbsentSmallInvalid = absentSmallCurrent > registeredSmallCurrent;
  const isAbsentLargeInvalid = absentLargeCurrent > registeredLargeCurrent;
  const isAttendanceInvalid = isAbsentSmallInvalid || isAbsentLargeInvalid;

  const presentSmallCalculated = Math.max(0, registeredSmallCurrent - absentSmallCurrent);
  const presentLargeCalculated = Math.max(0, registeredLargeCurrent - absentLargeCurrent);
  const actualPortionsCalculated = presentSmallCalculated + presentLargeCalculated;
  const attendanceRateCalculated = totalRegisteredCurrent > 0
    ? ((actualPortionsCalculated / totalRegisteredCurrent) * 100).toFixed(1)
    : '100.0';

  // Open Create Lembaga Modal
  const handleOpenCreateLembaga = () => {
    setSelectedInst(null);
    setFormData({
      name: '',
      institutionType: 'Sekolah Dasar (SD)',
      level: 'SD',
      address: 'Dusun Krajan Desa Temenggungan, Kec. Krejengan',
      npsn: '',
      contactPerson: '',
      phone: '',
      picName: '',
      picPhone: '',
      bankName: 'Bank Jatim',
      accountNumber: '',
      bankAccountName: '',
      smallPortions: 120,
      largePortions: 150,
      totalPortions: 270,
      deliveryRoute: 'Rute A - Temenggungan',
      deliveryOrder: institutions.length + 1,
      allergiesNote: '',
      isActive: true,
    });
    setIsLembagaModalOpen(true);
  };

  // Open Edit Lembaga Modal
  const handleOpenEditLembaga = (inst: Institution) => {
    setSelectedInst(inst);
    setFormData({ ...inst });
    setIsLembagaModalOpen(true);
  };

  // Save Lembaga (Create or Edit)
  const handleSaveLembaga = async (e: React.FormEvent) => {
    e.preventDefault();
    const calculatedTotal = Number(formData.smallPortions) + Number(formData.largePortions);
    const payload = {
      ...formData,
      smallPortions: Number(formData.smallPortions),
      largePortions: Number(formData.largePortions),
      totalPortions: calculatedTotal,
    };

    if (selectedInst) {
      await updateInstitution(selectedInst.id, payload);
      addToast('success', 'Lembaga Diperbarui', `Data ${formData.name} berhasil diperbarui.`);
    } else {
      await addInstitution(payload);
      addToast('success', 'Lembaga Ditambahkan', `Lembaga sasaran ${formData.name} berhasil didaftarkan.`);
    }
    setIsLembagaModalOpen(false);
  };

  // Open Quota Change Modal
  const handleOpenQuotaModal = (inst: Institution) => {
    setQuotaTargetInst(inst);
    setQuotaForm({
      smallPortions: inst.smallPortions,
      largePortions: inst.largePortions,
      reason: '',
    });
    setIsQuotaModalOpen(true);
  };

  // Save Quota Change with History
  const handleSaveQuotaChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quotaTargetInst) return;

    if (!quotaForm.reason || quotaForm.reason.trim().length < 5) {
      addToast('error', 'Alasan Wajib Diisi', 'Harap masukkan alasan resmi perubahan kuota (minimal 5 karakter).');
      return;
    }

    await updateInstitutionQuotaWithHistory(
      quotaTargetInst.id,
      Number(quotaForm.smallPortions),
      Number(quotaForm.largePortions),
      quotaForm.reason.trim()
    );

    setIsQuotaModalOpen(false);
  };

  // Submit Daily Attendance
  const handleSubmitAttendance = (e: React.FormEvent) => {
    e.preventDefault();

    if (isAttendanceInvalid) {
      addToast('error', 'Validasi Gagal', 'Jumlah siswa tidak hadir tidak boleh melebihi jumlah siswa terdaftar.');
      return;
    }

    if (!selectedInstForAttendance) {
      addToast('error', 'Lembaga Tidak Valid', 'Silakan pilih lembaga sasaran terlebih dahulu.');
      return;
    }

    const result = recordBeneficiaryAttendance({
      date: attendanceForm.date,
      institutionId: selectedInstForAttendance.id,
      institutionName: selectedInstForAttendance.name,
      registeredSmall: selectedInstForAttendance.smallPortions,
      registeredLarge: selectedInstForAttendance.largePortions,
      absentSmall: absentSmallCurrent,
      absentLarge: absentLargeCurrent,
      notes: attendanceForm.notes.trim() || 'Semua porsi diterima dalam keadaan hangat dan higienis.',
      recordedBy: attendanceForm.recordedBy.trim() || currentUser.name,
      bastConfirmed: attendanceForm.bastConfirmed,
    });

    if (result.success) {
      // Reset form input counts
      setAttendanceForm(prev => ({
        ...prev,
        absentSmall: 0,
        absentLarge: 0,
        notes: '',
      }));
    }
  };

  // Export Lembaga Table to PDF & Excel
  const handleExportLembagaPDF = () => {
    exportTableToPDF({
      title: 'Daftar Lembaga & Kuota Penerima Manfaat MBG',
      subtitle: `Satuan Pelayanan Pemenuhan Gizi (SPPG) Probolinggo Krejengan Temenggungan 2`,
      headers: ['Nama Lembaga', 'NPSN & Jenjang', 'Porsi Kecil', 'Porsi Besar', 'Total Porsi', 'Rute', 'PIC MBG & Kontak', 'No. Rekening'],
      rows: filteredInstitutions.map(i => [
        i.name,
        `${i.npsn} (${i.level})`,
        formatNumber(i.smallPortions),
        formatNumber(i.largePortions),
        formatNumber(i.totalPortions),
        i.deliveryRoute,
        `${i.picName} (${i.picPhone})`,
        `${i.bankName || '-'}: ${i.accountNumber || '-'}`,
      ]),
      fileName: 'Master_Penerima_Manfaat_Lembaga_SPPG_TMG2',
      sppgConfig,
      signerName: sppgConfig.headOfSppg,
      signerRole: 'Kepala SPPG Temenggungan 2',
    });
  };

  const handleExportLembagaExcel = () => {
    const dataToExport = filteredInstitutions.map(i => ({
      'Nama Lembaga': i.name,
      'NPSN': i.npsn,
      'Jenjang': i.level,
      'Jenis Lembaga': i.institutionType,
      'Alamat Lengkap': i.address,
      'Porsi Kecil': i.smallPortions,
      'Porsi Besar': i.largePortions,
      'Total Sasaran Porsi': i.totalPortions,
      'Rute Distribusi': i.deliveryRoute,
      'Urutan Antar': i.deliveryOrder,
      'Nama PIC MBG': i.picName,
      'No HP PIC': i.picPhone,
      'Kepala Sekolah': i.contactPerson,
      'Telepon Sekolah': i.phone,
      'Bank Penerima': i.bankName || '-',
      'Nomor Rekening': i.accountNumber || '-',
      'Nama Pemilik Rekening': i.bankAccountName || '-',
      'Catatan Alergi': i.allergiesNote || 'Tidak ada',
      'Status': i.isActive ? 'Aktif' : 'Nonaktif',
    }));
    exportToExcel(dataToExport, 'Master_Lembaga_Penerima_MBG_SPPG_TMG2', 'Lembaga Penerima');
  };

  // Export Daily Attendance Log to Excel & PDF
  const handleExportAttendanceExcel = () => {
    const dataToExport = beneficiaryAttendance.map(log => ({
      'Tanggal': log.date,
      'Nama Lembaga': log.institutionName,
      'Terdaftar Kecil': log.registeredSmall,
      'Terdaftar Besar': log.registeredLarge,
      'Total Terdaftar': log.totalRegistered,
      'Tidak Hadir Kecil': log.absentSmall,
      'Tidak Hadir Besar': log.absentLarge,
      'Total Tidak Hadir': log.totalAbsent,
      'Hadir Kecil (Aktual)': log.presentSmall,
      'Hadir Besar (Aktual)': log.presentLarge,
      'Jumlah Porsi Aktual': log.actualPortions,
      'Tingkat Kehadiran (%)': ((log.actualPortions / log.totalRegistered) * 100).toFixed(1) + '%',
      'Status BAST': log.bastConfirmed ? 'Terverifikasi' : 'Pending',
      'Pencatat / PIC': log.recordedBy,
      'Catatan': log.notes || '-',
    }));
    exportToExcel(dataToExport, 'Log_Presensi_Penerima_Manfaat_MBG', 'Presensi Harian');
  };

  const handleExportAttendancePDF = () => {
    exportTableToPDF({
      title: 'Rekapitulasi Log Presensi & Kehadiran Penerima Manfaat MBG',
      subtitle: `SPPG Probolinggo Krejengan Temenggungan 2 - Yayasan Hafshawaty`,
      headers: ['Tanggal', 'Lembaga', 'Terdaftar', 'Tidak Hadir', 'Porsi Aktual', 'Kehadiran %', 'BAST', 'Pencatat'],
      rows: beneficiaryAttendance.map(log => [
        formatIndonesianDate(log.date),
        log.institutionName,
        formatNumber(log.totalRegistered),
        formatNumber(log.totalAbsent),
        formatNumber(log.actualPortions),
        `${((log.actualPortions / log.totalRegistered) * 100).toFixed(1)}%`,
        log.bastConfirmed ? 'Sudah BAST' : 'Pending',
        log.recordedBy,
      ]),
      fileName: 'Log_Presensi_Kehadiran_MBG_SPPG_TMG2',
      sppgConfig,
      signerName: sppgConfig.headOfSppg,
      signerRole: 'Kepala SPPG Temenggungan 2',
    });
  };

  // Export Quota Change History to Excel & PDF
  const handleExportQuotaHistoryExcel = () => {
    const dataToExport = beneficiaryQuotaHistory.map(h => ({
      'Waktu Perubahan': h.timestamp,
      'Nama Lembaga': h.institutionName,
      'Sebelumnya Kecil': h.previousSmall,
      'Sebelumnya Besar': h.previousLarge,
      'Sebelumnya Total': h.previousTotal,
      'Baru Kecil': h.newSmall,
      'Baru Besar': h.newLarge,
      'Baru Total': h.newTotal,
      'Selisih Total (+/-)': (h.deltaTotal >= 0 ? `+${h.deltaTotal}` : `${h.deltaTotal}`),
      'Alasan Perubahan': h.reason,
      'Diperbarui Oleh': h.updatedBy,
    }));
    exportToExcel(dataToExport, 'Riwayat_Perubahan_Kuota_Siswa_MBG', 'Riwayat Kuota');
  };

  // Daily Rekap Data Computation for selected rekapDate
  const dailyRekapLogs = useMemo(() => {
    return institutions.map(inst => {
      const log = beneficiaryAttendance.find(a => a.institutionId === inst.id && a.date === rekapDate);
      if (log) {
        return log;
      }
      // If no log recorded yet for this date, assume 100% presence default preview
      return {
        id: `preview-${inst.id}`,
        date: rekapDate,
        institutionId: inst.id,
        institutionName: inst.name,
        registeredSmall: inst.smallPortions,
        registeredLarge: inst.largePortions,
        totalRegistered: inst.totalPortions,
        absentSmall: 0,
        absentLarge: 0,
        totalAbsent: 0,
        presentSmall: inst.smallPortions,
        presentLarge: inst.largePortions,
        actualPortions: inst.totalPortions,
        notes: 'Prakiraan kuota penuh (belum input presensi spesifik)',
        recordedBy: '-',
        bastConfirmed: false,
      } as BeneficiaryAttendanceLog;
    });
  }, [institutions, beneficiaryAttendance, rekapDate]);

  const dailyRekapSummary = useMemo(() => {
    const regSmall = dailyRekapLogs.reduce((acc, l) => acc + l.registeredSmall, 0);
    const regLarge = dailyRekapLogs.reduce((acc, l) => acc + l.registeredLarge, 0);
    const regTotal = regSmall + regLarge;
    const absSmall = dailyRekapLogs.reduce((acc, l) => acc + l.absentSmall, 0);
    const absLarge = dailyRekapLogs.reduce((acc, l) => acc + l.absentLarge, 0);
    const absTotal = absSmall + absLarge;
    const actSmall = dailyRekapLogs.reduce((acc, l) => acc + l.presentSmall, 0);
    const actLarge = dailyRekapLogs.reduce((acc, l) => acc + l.presentLarge, 0);
    const actTotal = actSmall + actLarge;
    const overallRate = regTotal > 0 ? ((actTotal / regTotal) * 100).toFixed(1) : '100.0';
    return {
      regSmall,
      regLarge,
      regTotal,
      absSmall,
      absLarge,
      absTotal,
      actSmall,
      actLarge,
      actTotal,
      overallRate,
    };
  }, [dailyRekapLogs]);

  // Export Daily Rekap to PDF
  const handleExportDailyRekapPDF = () => {
    exportTableToPDF({
      title: `Rekapitulasi Distribusi & Kehadiran Harian MBG`,
      subtitle: `Tanggal: ${formatIndonesianDate(rekapDate)} • SPPG Probolinggo Krejengan Temenggungan 2`,
      headers: ['Lembaga', 'Terdaftar (K/B/T)', 'Tidak Hadir', 'Porsi Aktual (K/B/T)', 'Tingkat Kehadiran', 'Status BAST'],
      rows: dailyRekapLogs.map(l => [
        l.institutionName,
        `${l.registeredSmall} / ${l.registeredLarge} / ${l.totalRegistered}`,
        `${l.totalAbsent} siswa`,
        `${l.presentSmall} / ${l.presentLarge} / ${l.actualPortions}`,
        `${((l.actualPortions / l.totalRegistered) * 100).toFixed(1)}%`,
        l.bastConfirmed ? 'Sudah BAST' : 'Pending Verifikasi',
      ]),
      fileName: `Rekap_Distribusi_Harian_${rekapDate}_SPPG_TMG2`,
      sppgConfig,
      signerName: sppgConfig.headOfSppg,
      signerRole: 'Kepala SPPG Temenggungan 2',
    });
  };

  // Weekly dummy data for visual summary
  const weeklyDays = [
    { day: 'Senin, 03 Nov 2026', registered: 2850, absent: 42, actualSmall: 1065, actualLarge: 1743, actualTotal: 2808, rate: '98.5%' },
    { day: 'Selasa, 04 Nov 2026', registered: 2850, absent: 36, actualSmall: 1068, actualLarge: 1746, actualTotal: 2814, rate: '98.7%' },
    { day: 'Rabu, 05 Nov 2026', registered: 2850, absent: 45, actualSmall: 1062, actualLarge: 1743, actualTotal: 2805, rate: '98.4%' },
    { day: 'Kamis, 06 Nov 2026', registered: 2850, absent: 29, actualSmall: 1072, actualLarge: 1749, actualTotal: 2821, rate: '99.0%' },
    { day: 'Jumat, 07 Nov 2026', registered: 2850, absent: 38, actualSmall: 1066, actualLarge: 1746, actualTotal: 2812, rate: '98.7%' },
  ];

  // Monthly summary
  const monthlySummary = [
    { month: 'November 2026 (Berjalan)', totalDays: 20, avgActualDaily: 2812, totalSmallMonthly: 21320, totalLargeMonthly: 34920, totalActualMonthly: 56240, budgetAbsorption: 56240 * 15000, avgRate: '98.7%' },
    { month: 'Oktober 2026', totalDays: 22, avgActualDaily: 2805, totalSmallMonthly: 23430, totalLargeMonthly: 38280, totalActualMonthly: 61710, budgetAbsorption: 61710 * 15000, avgRate: '98.4%' },
    { month: 'September 2026', totalDays: 21, avgActualDaily: 2798, totalSmallMonthly: 22260, totalLargeMonthly: 36498, totalActualMonthly: 58758, budgetAbsorption: 58758 * 15000, avgRate: '98.2%' },
  ];

  // Columns for Data Lembaga
  const lembagaColumns: Column<Institution>[] = [
    {
      key: 'name',
      header: 'Nama Lembaga & NPSN',
      render: row => (
        <div>
          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <span>{row.name}</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-sky-300">
              {row.level}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
            NPSN: <strong>{row.npsn}</strong> • {row.institutionType}
          </div>
          <div className="text-[10px] text-slate-400 truncate max-w-xs flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
            <span>{row.address}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'quota',
      header: 'Kuota Penerima (Porsi)',
      render: row => (
        <div className="space-y-0.5 text-xs font-mono">
          <div className="font-bold text-slate-900 dark:text-white text-sm">
            {formatNumber(row.totalPortions)} <span className="text-[10px] font-normal text-slate-500">porsi total</span>
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-2">
            <span className="text-sky-600 dark:text-sky-400 font-semibold">Kecil: {formatNumber(row.smallPortions)}</span>
            <span>•</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-semibold">Besar: {formatNumber(row.largePortions)}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'deliveryRoute',
      header: 'Rute Distribusi',
      render: row => (
        <div className="text-xs">
          <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
            <Route className="w-3.5 h-3.5 text-sky-600" />
            <span>{row.deliveryRoute}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Drop-off urutan: <strong className="text-blue-900 dark:text-sky-400">#{row.deliveryOrder}</strong>
          </div>
        </div>
      ),
    },
    {
      key: 'pic',
      header: 'PIC MBG & Rekening',
      render: row => (
        <div className="text-xs space-y-0.5">
          <div className="font-bold text-slate-900 dark:text-white truncate max-w-[170px]">
            {row.picName || row.contactPerson}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <Phone className="w-3 h-3 text-slate-400" />
            <span>{row.picPhone || row.phone}</span>
          </div>
          {row.accountNumber && (
            <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
              <CreditCard className="w-3 h-3 text-slate-400" />
              <span>{row.bankName}: {row.accountNumber}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'allergiesNote',
      header: 'Catatan Khusus / Alergi',
      render: row => (
        <div className="text-xs">
          {row.allergiesNote ? (
            <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md text-[11px] font-medium">
              <AlertTriangle className="w-3 h-3 shrink-0" />
              <span className="truncate max-w-[170px]">{row.allergiesNote}</span>
            </span>
          ) : (
            <span className="text-slate-400 text-[11px]">Normal (tidak ada)</span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Aksi & Kelola',
      align: 'right',
      render: row => (
        <div className="flex items-center justify-end gap-1.5">
          {hasPermission('institutions', 'edit') && (
            <button
              onClick={() => handleOpenQuotaModal(row)}
              className="px-2 py-1 bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 hover:bg-sky-100 rounded-md text-[11px] font-bold transition flex items-center gap-1 border border-sky-200 dark:border-sky-800"
              title="Ubah Kuota Porsi dengan Riwayat Audit"
            >
              <TrendingUp className="w-3 h-3" />
              <span>Ubah Kuota</span>
            </button>
          )}
          {hasPermission('institutions', 'edit') && (
            <button
              onClick={() => handleOpenEditLembaga(row)}
              className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-sky-400 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950 transition"
              title="Edit Data Lembaga"
            >
              <Edit className="w-4 h-4" />
            </button>
          )}
          {hasPermission('institutions', 'delete') && (
            <button
              onClick={() => setDeleteId(row.id)}
              className="p-1.5 text-rose-500 hover:text-rose-700 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950 transition"
              title="Hapus Lembaga"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-blue-900 text-white flex items-center justify-center shadow-md">
              <School className="w-6 h-6 text-sky-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                Modul Penerima Manfaat & Presensi Siswa (Modul 7)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sistem Pengelolaan Kuota, Presensi Harian, BAST Kehadiran & Rekapitulasi MBG Temenggungan 2
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasPermission('institutions', 'create') && (
            <button
              type="button"
              onClick={handleOpenCreateLembaga}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-900 hover:bg-blue-800 dark:bg-sky-600 dark:hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Lembaga Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards: High-level Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] text-slate-500 uppercase font-bold flex items-center justify-between">
            <span>Total Lembaga</span>
            <Building className="w-4 h-4 text-blue-900 dark:text-sky-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {institutions.length} Sekolah
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Wilayah Krejengan</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] text-slate-500 uppercase font-bold flex items-center justify-between">
            <span>Total Kuota Terdaftar</span>
            <Users2 className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-black text-blue-900 dark:text-sky-400 mt-1">
            {formatNumber(totalRegisteredAll)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5 font-mono">
            <span>Kecil: {formatNumber(totalRegisteredSmall)}</span>
            <span>•</span>
            <span>Besar: {formatNumber(totalRegisteredLarge)}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] text-slate-500 uppercase font-bold flex items-center justify-between">
            <span>Porsi Aktual Hari Ini</span>
            <ClipboardCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {formatNumber(dailyRekapSummary.actTotal)} Porsi
          </div>
          <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold mt-0.5">
            {dailyRekapSummary.overallRate}% Kehadiran Siswa
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] text-slate-500 uppercase font-bold flex items-center justify-between">
            <span>Tidak Hadir Hari Ini</span>
            <UserX className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600 mt-1">
            {formatNumber(dailyRekapSummary.absTotal)} Siswa
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Sakit / Izin / Dinas Luar</div>
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-1 text-xs font-bold scrollbar-thin">
        {[
          { key: 'data_lembaga' as TabKey, label: '1. Data Lembaga & Kuota', icon: <School className="w-4 h-4" /> },
          { key: 'presensi_harian' as TabKey, label: '2. Presensi Kehadiran Siswa', icon: <UserCheck className="w-4 h-4" /> },
          { key: 'riwayat_kuota' as TabKey, label: '3. Riwayat Perubahan Kuota', icon: <History className="w-4 h-4" />, count: beneficiaryQuotaHistory.length },
          { key: 'rekap_harian' as TabKey, label: '4. Rekap Distribusi Harian', icon: <Calendar className="w-4 h-4" /> },
          { key: 'rekap_mingguan_bulanan' as TabKey, label: '5. Rekap Mingguan & Bulanan', icon: <BarChart3 className="w-4 h-4" /> },
          { key: 'rekap_lembaga' as TabKey, label: '6. Rekap per Lembaga', icon: <Building className="w-4 h-4" /> },
        ].map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-t-xl transition whitespace-nowrap border-b-2 ${
                isActive
                  ? 'border-blue-900 dark:border-sky-400 text-blue-900 dark:text-sky-300 bg-blue-50/50 dark:bg-blue-950/40'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DATA LEMBAGA & KUOTA PENERIMA MANFAAT */}
      {/* ========================================================================= */}
      {activeTab === 'data_lembaga' && (
        <div className="space-y-4">
          {/* Filter Jenjang */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-slate-400 font-bold uppercase text-[11px] mr-1">Filter Jenjang:</span>
            {['ALL', 'SD', 'MI', 'SMP', 'MTs', 'SMA', 'SMK', 'PAUD', 'Pesantren'].map(lvl => (
              <button
                key={lvl}
                onClick={() => setFilterLevel(lvl)}
                className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                  filterLevel === lvl
                    ? 'bg-blue-900 text-white dark:bg-sky-600'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {lvl === 'ALL' ? 'Semua Jenjang' : lvl}
              </button>
            ))}
          </div>

          {/* DataTable */}
          <DataTable
            title="Daftar Lembaga Penerima Manfaat MBG"
            subtitle="Data lembaga sasaran, pembagian porsi kecil & besar, narahubung, dan nomor rekening"
            data={filteredInstitutions}
            columns={lembagaColumns}
            keyExtractor={item => item.id}
            searchPlaceholder="Cari sekolah, NPSN, PIC, atau alamat..."
            searchKeys={['name', 'npsn', 'contactPerson', 'picName', 'address', 'deliveryRoute', 'accountNumber']}
            onExportPDF={handleExportLembagaPDF}
            onExportExcel={handleExportLembagaExcel}
            onPrint={triggerPrint}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: INPUT & LOG PRESENSI KEHADIRAN HARIAN */}
      {/* ========================================================================= */}
      {activeTab === 'presensi_harian' && (
        <div className="space-y-6">
          {/* Quick Input Form Box */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 flex items-center justify-center font-bold">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Form Input Presensi Siswa & Porsi Aktual MBG
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Sistem otomatis menghitung: Hadir = Terdaftar - Tidak Hadir | Porsi Aktual = Total Hadir
                  </p>
                </div>
              </div>

              <div className="text-[11px] bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-sky-300 px-3 py-1 rounded-lg font-mono">
                Formula Standar BGN Aktif
              </div>
            </div>

            <form onSubmit={handleSubmitAttendance} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Tanggal */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tanggal Distribusi / Kehadiran *
                  </label>
                  <input
                    type="date"
                    required
                    value={attendanceForm.date}
                    onChange={e => setAttendanceForm({ ...attendanceForm, date: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                {/* Pilih Lembaga */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Pilih Lembaga Penerima Sasaran *
                  </label>
                  <select
                    value={attendanceForm.institutionId}
                    onChange={e => setAttendanceForm({ ...attendanceForm, institutionId: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                  >
                    {institutions.map(inst => (
                      <option key={inst.id} value={inst.id}>
                        {inst.name} ({inst.level}) — Kuota: {formatNumber(inst.totalPortions)} porsi (Kecil: {inst.smallPortions}, Besar: {inst.largePortions})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Quota vs Absent Input Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                {/* Porsi Kecil Section */}
                <div className="space-y-2 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-sky-700 dark:text-sky-300">
                      Porsi Kecil (TK/PAUD & Kelas 1-3)
                    </span>
                    <span className="text-xs font-mono font-bold bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 px-2 py-0.5 rounded">
                      Terdaftar: {formatNumber(registeredSmallCurrent)} siswa
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-rose-600 dark:text-rose-400 mb-1">
                        Jumlah Tidak Hadir (Kecil) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={registeredSmallCurrent}
                        required
                        value={attendanceForm.absentSmall}
                        onChange={e => setAttendanceForm({ ...attendanceForm, absentSmall: Number(e.target.value) })}
                        className={`w-full px-3 py-2 text-xs rounded-lg border font-mono font-bold ${
                          isAbsentSmallInvalid
                            ? 'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950'
                            : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
                        Porsi Aktual Hadir (Kecil)
                      </label>
                      <div className="w-full px-3 py-2 text-xs rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 font-mono font-black text-emerald-800 dark:text-emerald-300">
                        {presentSmallCalculated} porsi
                      </div>
                    </div>
                  </div>

                  {isAbsentSmallInvalid && (
                    <div className="text-[11px] text-rose-600 flex items-center gap-1 font-semibold mt-1">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Tidak hadir ({absentSmallCurrent}) melebihi kuota terdaftar ({registeredSmallCurrent})!</span>
                    </div>
                  )}
                </div>

                {/* Porsi Besar Section */}
                <div className="space-y-2 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                      Porsi Besar (Kelas 4-6, SMP, SMA, Santri)
                    </span>
                    <span className="text-xs font-mono font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 px-2 py-0.5 rounded">
                      Terdaftar: {formatNumber(registeredLargeCurrent)} siswa
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-rose-600 dark:text-rose-400 mb-1">
                        Jumlah Tidak Hadir (Besar) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={registeredLargeCurrent}
                        required
                        value={attendanceForm.absentLarge}
                        onChange={e => setAttendanceForm({ ...attendanceForm, absentLarge: Number(e.target.value) })}
                        className={`w-full px-3 py-2 text-xs rounded-lg border font-mono font-bold ${
                          isAbsentLargeInvalid
                            ? 'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950'
                            : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
                        Porsi Aktual Hadir (Besar)
                      </label>
                      <div className="w-full px-3 py-2 text-xs rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 font-mono font-black text-emerald-800 dark:text-emerald-300">
                        {presentLargeCalculated} porsi
                      </div>
                    </div>
                  </div>

                  {isAbsentLargeInvalid && (
                    <div className="text-[11px] text-rose-600 flex items-center gap-1 font-semibold mt-1">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Tidak hadir ({absentLargeCurrent}) melebihi kuota terdaftar ({registeredLargeCurrent})!</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Live Formula Result Banner */}
              <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                <div className="space-y-1">
                  <div className="text-xs uppercase tracking-wider text-sky-300 font-bold">
                    Kalkulasi Otomatis Porsi Aktual Lembaga:
                  </div>
                  <div className="text-sm font-semibold flex flex-wrap items-center gap-2">
                    <span>Terdaftar ({totalRegisteredCurrent})</span>
                    <span>-</span>
                    <span className="text-rose-300">Tidak Hadir ({totalAbsentCurrent})</span>
                    <span>=</span>
                    <span className="text-xl font-black text-white bg-white/20 px-2 py-0.5 rounded">
                      {actualPortionsCalculated} Porsi Aktual
                    </span>
                  </div>
                </div>

                <div className="text-right sm:border-l sm:border-white/20 sm:pl-4">
                  <div className="text-[10px] text-sky-300 uppercase font-semibold">Tingkat Kehadiran</div>
                  <div className="text-2xl font-black text-sky-300">{attendanceRateCalculated}%</div>
                </div>
              </div>

              {/* Extra Meta: Notes, Recorder, BAST */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Catatan Presensi & Distribusi (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 3 anak sakit flu, ompreng dibagikan habis."
                    value={attendanceForm.notes}
                    onChange={e => setAttendanceForm({ ...attendanceForm, notes: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Petugas / PIC Pencatat Kehadiran *
                  </label>
                  <input
                    type="text"
                    required
                    value={attendanceForm.recordedBy}
                    onChange={e => setAttendanceForm({ ...attendanceForm, recordedBy: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={attendanceForm.bastConfirmed}
                    onChange={e => setAttendanceForm({ ...attendanceForm, bastConfirmed: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-900 focus:ring-sky-500"
                  />
                  <span>
                    Konfirmasi Berita Acara Serah Terima (BAST) & Kehadiran Fisik Siswa Telah Diverifikasi
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={isAttendanceInvalid}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition ${
                    isAttendanceInvalid
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed dark:bg-slate-800 dark:text-slate-600'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                  }`}
                >
                  <CheckSquare className="w-4 h-4" />
                  <span>Simpan Presensi Harian</span>
                </button>
              </div>
            </form>
          </div>

          {/* Table of Recorded Attendance Logs */}
          <DataTable
            title="Log Presensi Kehadiran Siswa Terkini"
            subtitle="Riwayat pencatatan kehadiran, porsi terdaftar vs aktual, dan status BAST harian"
            data={beneficiaryAttendance}
            keyExtractor={item => item.id}
            searchPlaceholder="Cari berdasarkan sekolah, tanggal, atau pencatat..."
            searchKeys={['institutionName', 'date', 'recordedBy', 'notes']}
            columns={[
              {
                key: 'date',
                header: 'Tanggal & Lembaga',
                render: row => (
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      {row.institutionName}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                      {formatIndonesianDate(row.date)}
                    </div>
                  </div>
                ),
              },
              {
                key: 'registered',
                header: 'Terdaftar',
                render: row => (
                  <div className="text-xs font-mono">
                    <span className="font-bold text-slate-900 dark:text-white">{row.totalRegistered}</span>
                    <div className="text-[10px] text-slate-500">
                      K:{row.registeredSmall} | B:{row.registeredLarge}
                    </div>
                  </div>
                ),
              },
              {
                key: 'absent',
                header: 'Tidak Hadir',
                render: row => (
                  <div className="text-xs font-mono text-rose-600 dark:text-rose-400">
                    <span className="font-bold">{row.totalAbsent}</span>
                    <div className="text-[10px]">
                      K:{row.absentSmall} | B:{row.absentLarge}
                    </div>
                  </div>
                ),
              },
              {
                key: 'actual',
                header: 'Porsi Aktual Hadir',
                render: row => (
                  <div className="text-xs font-mono">
                    <span className="font-black text-emerald-700 dark:text-emerald-400 text-sm">
                      {row.actualPortions}
                    </span>
                    <div className="text-[10px] text-slate-500">
                      K:{row.presentSmall} | B:{row.presentLarge}
                    </div>
                  </div>
                ),
              },
              {
                key: 'rate',
                header: 'Kehadiran (%)',
                render: row => {
                  const rate = ((row.actualPortions / row.totalRegistered) * 100).toFixed(1);
                  return (
                    <div className="text-xs font-mono">
                      <span className="font-bold text-sky-700 dark:text-sky-400">{rate}%</span>
                      <div className="w-16 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 mt-1 overflow-hidden">
                        <div
                          className="bg-sky-600 h-full rounded-full"
                          style={{ width: `${Math.min(100, Number(rate))}%` }}
                        />
                      </div>
                    </div>
                  );
                },
              },
              {
                key: 'bast',
                header: 'Status BAST',
                render: row => (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      row.bastConfirmed
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                  >
                    {row.bastConfirmed ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                    <span>{row.bastConfirmed ? 'Sudah BAST' : 'Belum BAST'}</span>
                  </span>
                ),
              },
              {
                key: 'actions',
                header: 'Aksi BAST',
                align: 'right',
                render: row => (
                  <button
                    onClick={() => setSelectedAttendanceForBast(row)}
                    className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-900 dark:text-sky-300 border border-blue-200 dark:border-blue-800 rounded-lg text-[11px] font-bold transition flex items-center gap-1"
                    title="Cetak Berita Acara Serah Terima (BAST)"
                  >
                    <Printer className="w-3 h-3" />
                    <span>Cetak BAST</span>
                  </button>
                ),
              },
            ]}
            onExportExcel={handleExportAttendanceExcel}
            onExportPDF={handleExportAttendancePDF}
            onPrint={triggerPrint}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: RIWAYAT PERUBAHAN KUOTA PENERIMA (AUDIT TRAIL) */}
      {/* ========================================================================= */}
      {activeTab === 'riwayat_kuota' && (
        <div className="space-y-4">
          <div className="bg-sky-50 dark:bg-sky-950/40 p-4 rounded-xl border border-sky-200 dark:border-sky-800/80 flex items-center gap-3">
            <Info className="w-5 h-5 text-sky-700 dark:text-sky-400 shrink-0" />
            <div className="text-xs text-sky-900 dark:text-sky-200 leading-relaxed">
              <strong>Audit Trail Kuota Siswa:</strong> Setiap pembaruan jumlah penerima manfaat
              wajib mencatat kuota sebelum, kuota sesudah, selisih kuota, alasan penyesuaian (misal: mutasi murid, kenaikan tingkat),
              serta nama pengguna yang melakukan perubahan untuk kepatuhan akuntabilitas BGN.
            </div>
          </div>

          <DataTable
            title="Riwayat Audit Perubahan Kuota Penerima Manfaat"
            subtitle="Rekam jejak transparan seluruh perubahan kuota porsi kecil dan besar pada lembaga MBG"
            data={beneficiaryQuotaHistory}
            keyExtractor={item => item.id}
            searchPlaceholder="Cari riwayat lembaga, alasan, atau petugas..."
            searchKeys={['institutionName', 'reason', 'updatedBy', 'timestamp']}
            columns={[
              {
                key: 'timestamp',
                header: 'Waktu Perubahan',
                render: row => (
                  <div className="text-xs font-mono text-slate-700 dark:text-slate-300">
                    <div className="font-bold">{row.timestamp}</div>
                    <div className="text-[10px] text-slate-400">ID: {row.id}</div>
                  </div>
                ),
              },
              {
                key: 'institutionName',
                header: 'Nama Lembaga',
                render: row => (
                  <div className="font-bold text-slate-900 dark:text-white text-xs">
                    {row.institutionName}
                  </div>
                ),
              },
              {
                key: 'before',
                header: 'Sebelum Perubahan',
                render: row => (
                  <div className="text-xs font-mono">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Total: {row.previousTotal}
                    </span>
                    <div className="text-[10px] text-slate-500">
                      K:{row.previousSmall} | B:{row.previousLarge}
                    </div>
                  </div>
                ),
              },
              {
                key: 'after',
                header: 'Setelah Perubahan',
                render: row => (
                  <div className="text-xs font-mono">
                    <span className="font-bold text-blue-900 dark:text-sky-300">
                      Total: {row.newTotal}
                    </span>
                    <div className="text-[10px] text-slate-500">
                      K:{row.newSmall} | B:{row.newLarge}
                    </div>
                  </div>
                ),
              },
              {
                key: 'delta',
                header: 'Selisih (+/-)',
                render: row => {
                  const isPositive = row.deltaTotal >= 0;
                  return (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-black ${
                        isPositive
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      {isPositive ? `+${row.deltaTotal}` : `${row.deltaTotal}`} porsi
                    </span>
                  );
                },
              },
              {
                key: 'reason',
                header: 'Alasan Resmi Perubahan',
                render: row => (
                  <div className="text-xs text-slate-700 dark:text-slate-300 max-w-sm italic">
                    "{row.reason}"
                  </div>
                ),
              },
              {
                key: 'updatedBy',
                header: 'Diubah Oleh',
                render: row => (
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {row.updatedBy}
                  </div>
                ),
              },
            ]}
            onExportExcel={handleExportQuotaHistoryExcel}
            onPrint={triggerPrint}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: REKAP DISTRIBUSI HARIAN */}
      {/* ========================================================================= */}
      {activeTab === 'rekap_harian' && (
        <div className="space-y-4">
          {/* Date Selector & Action Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-blue-900 dark:text-sky-400" />
              <div>
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Pilih Tanggal Rekap Harian:
                </div>
                <div className="text-xs text-slate-400">
                  Menampilkan rekapitulasi kehadiran & porsi aktual per sekolah
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={rekapDate}
                onChange={e => setRekapDate(e.target.value)}
                className="px-3 py-1.5 text-xs font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />

              <button
                onClick={handleExportDailyRekapPDF}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-bold shadow-xs transition"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>PDF Rekap Harian</span>
              </button>

              <button
                onClick={triggerPrint}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak</span>
              </button>
            </div>
          </div>

          {/* Daily KPI Summary Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <div>
              <div className="text-slate-500 font-semibold">Total Terdaftar Hari Ini</div>
              <div className="text-xl font-black text-slate-900 dark:text-white font-mono mt-0.5">
                {formatNumber(dailyRekapSummary.regTotal)}
              </div>
              <div className="text-[10px] text-slate-400">Kecil: {dailyRekapSummary.regSmall} | Besar: {dailyRekapSummary.regLarge}</div>
            </div>

            <div>
              <div className="text-rose-600 dark:text-rose-400 font-semibold">Total Siswa Tidak Hadir</div>
              <div className="text-xl font-black text-rose-600 font-mono mt-0.5">
                {formatNumber(dailyRekapSummary.absTotal)}
              </div>
              <div className="text-[10px] text-rose-500">Kecil: {dailyRekapSummary.absSmall} | Besar: {dailyRekapSummary.absLarge}</div>
            </div>

            <div>
              <div className="text-emerald-600 dark:text-emerald-400 font-semibold">Total Porsi Aktual Hadir</div>
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                {formatNumber(dailyRekapSummary.actTotal)}
              </div>
              <div className="text-[10px] text-emerald-700">Kecil: {dailyRekapSummary.actSmall} | Besar: {dailyRekapSummary.actLarge}</div>
            </div>

            <div>
              <div className="text-sky-600 dark:text-sky-400 font-semibold">Tingkat Kehadiran Harian</div>
              <div className="text-xl font-black text-sky-600 dark:text-sky-400 font-mono mt-0.5">
                {dailyRekapSummary.overallRate}%
              </div>
              <div className="text-[10px] text-sky-700">Efisiensi Serapan Gizi</div>
            </div>
          </div>

          {/* Comprehensive Daily Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                    <th className="p-3">No</th>
                    <th className="p-3">Nama Lembaga & Jenjang</th>
                    <th className="p-3 text-center">Terdaftar (K / B / Total)</th>
                    <th className="p-3 text-center text-rose-600">Tidak Hadir (K / B / Total)</th>
                    <th className="p-3 text-center text-emerald-700 dark:text-emerald-400">Porsi Aktual (K / B / Total)</th>
                    <th className="p-3 text-center">% Kehadiran</th>
                    <th className="p-3 text-center">Status BAST</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {dailyRekapLogs.map((item, idx) => {
                    const rate = ((item.actualPortions / item.totalRegistered) * 100).toFixed(1);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                        <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {item.institutionName}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {item.notes || 'Normal'}
                          </div>
                        </td>
                        <td className="p-3 text-center font-mono">
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {item.totalRegistered}
                          </span>
                          <div className="text-[10px] text-slate-400">
                            {item.registeredSmall} / {item.registeredLarge}
                          </div>
                        </td>
                        <td className="p-3 text-center font-mono text-rose-600 font-bold">
                          {item.totalAbsent}
                          <div className="text-[10px] text-rose-400 font-normal">
                            {item.absentSmall} / {item.absentLarge}
                          </div>
                        </td>
                        <td className="p-3 text-center font-mono text-emerald-700 dark:text-emerald-400 font-black">
                          {item.actualPortions}
                          <div className="text-[10px] text-emerald-600 font-normal">
                            {item.presentSmall} / {item.presentLarge}
                          </div>
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-sky-700 dark:text-sky-300">
                          {rate}%
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.bastConfirmed
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {item.bastConfirmed ? 'Sudah BAST' : 'Pending'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-blue-900 text-white font-bold font-mono">
                    <td colSpan={2} className="p-3 text-right uppercase tracking-wider">
                      TOTAL KESELURUHAN ({dailyRekapLogs.length} Lembaga):
                    </td>
                    <td className="p-3 text-center">
                      {dailyRekapSummary.regTotal} ({dailyRekapSummary.regSmall}/{dailyRekapSummary.regLarge})
                    </td>
                    <td className="p-3 text-center text-rose-300">
                      {dailyRekapSummary.absTotal} ({dailyRekapSummary.absSmall}/{dailyRekapSummary.absLarge})
                    </td>
                    <td className="p-3 text-center text-emerald-300 text-sm">
                      {dailyRekapSummary.actTotal} ({dailyRekapSummary.actSmall}/{dailyRekapSummary.actLarge})
                    </td>
                    <td className="p-3 text-center text-sky-300 text-sm">
                      {dailyRekapSummary.overallRate}%
                    </td>
                    <td className="p-3 text-center text-xs">
                      100% Tercatat
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: REKAP MINGGUAN & BULANAN */}
      {/* ========================================================================= */}
      {activeTab === 'rekap_mingguan_bulanan' && (
        <div className="space-y-4">
          {/* Sub-Switch Toggle */}
          <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setRekapPeriodType('mingguan')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                  rekapPeriodType === 'mingguan'
                    ? 'bg-blue-900 text-white dark:bg-sky-600 shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                Rekap Mingguan (Minggu Berjalan)
              </button>
              <button
                onClick={() => setRekapPeriodType('bulanan')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                  rekapPeriodType === 'bulanan'
                    ? 'bg-blue-900 text-white dark:bg-sky-600 shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                Rekap Bulanan (Per Semester / Bulan)
              </button>
            </div>

            <button
              onClick={triggerPrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Laporan</span>
            </button>
          </div>

          {rekapPeriodType === 'mingguan' ? (
            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-sky-600" />
                  Rekapitulasi Distribusi Porsi Mingguan (03 Nov - 07 Nov 2026)
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Akumulasi porsi kecil dan porsi besar aktual yang tersalurkan ke 8 lembaga sasaran
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                        <th className="p-3">Hari & Tanggal</th>
                        <th className="p-3 text-center">Kuota Terdaftar</th>
                        <th className="p-3 text-center text-rose-600">Siswa Tidak Hadir</th>
                        <th className="p-3 text-center text-sky-600">Porsi Kecil Aktual</th>
                        <th className="p-3 text-center text-indigo-600">Porsi Besar Aktual</th>
                        <th className="p-3 text-center text-emerald-700 dark:text-emerald-400 font-black">Total Porsi Aktual</th>
                        <th className="p-3 text-center">Rata-rata Kehadiran</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                      {weeklyDays.map((w, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="p-3 font-bold text-slate-900 dark:text-white font-sans">{w.day}</td>
                          <td className="p-3 text-center">{formatNumber(w.registered)}</td>
                          <td className="p-3 text-center text-rose-600 font-bold">{w.absent}</td>
                          <td className="p-3 text-center text-sky-700 dark:text-sky-300">{formatNumber(w.actualSmall)}</td>
                          <td className="p-3 text-center text-indigo-700 dark:text-indigo-300">{formatNumber(w.actualLarge)}</td>
                          <td className="p-3 text-center text-emerald-700 dark:text-emerald-400 font-black text-sm">
                            {formatNumber(w.actualTotal)}
                          </td>
                          <td className="p-3 text-center font-bold text-sky-700 dark:text-sky-300">{w.rate}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 dark:bg-slate-800 font-bold font-mono border-t border-slate-300 dark:border-slate-700">
                        <td className="p-3 font-sans">TOTAL 1 MINGGU (5 Hari Kerja):</td>
                        <td className="p-3 text-center">{formatNumber(2850 * 5)}</td>
                        <td className="p-3 text-center text-rose-600">{42 + 36 + 45 + 29 + 38}</td>
                        <td className="p-3 text-center text-sky-700">{formatNumber(1065 + 1068 + 1062 + 1072 + 1066)}</td>
                        <td className="p-3 text-center text-indigo-700">{formatNumber(1743 + 1746 + 1743 + 1749 + 1746)}</td>
                        <td className="p-3 text-center text-emerald-700 dark:text-emerald-400 text-sm font-black">
                          {formatNumber(2808 + 2814 + 2805 + 2821 + 2812)} Porsi
                        </td>
                        <td className="p-3 text-center text-sky-700">98.66%</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-sky-600" />
                  Rekapitulasi Bulanan Penyerapan Porsi & Anggaran Makan
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Data penyerapan porsi bulanan dikalikan indeks biaya per porsi MBG (Rp 15.000 / porsi)
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                        <th className="p-3">Periode Bulan</th>
                        <th className="p-3 text-center">Hari Operasional</th>
                        <th className="p-3 text-center">Rata-rata Porsi/Hari</th>
                        <th className="p-3 text-center">Porsi Kecil Kumulatif</th>
                        <th className="p-3 text-center">Porsi Besar Kumulatif</th>
                        <th className="p-3 text-center text-emerald-700 dark:text-emerald-400 font-black">Total Porsi Bulan</th>
                        <th className="p-3 text-right">Penyerapan Anggaran MBG</th>
                        <th className="p-3 text-center">Rata-rata Hadir</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                      {monthlySummary.map((m, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="p-3 font-bold text-slate-900 dark:text-white font-sans">{m.month}</td>
                          <td className="p-3 text-center">{m.totalDays} hari</td>
                          <td className="p-3 text-center">{formatNumber(m.avgActualDaily)}</td>
                          <td className="p-3 text-center">{formatNumber(m.totalSmallMonthly)}</td>
                          <td className="p-3 text-center">{formatNumber(m.totalLargeMonthly)}</td>
                          <td className="p-3 text-center text-emerald-700 dark:text-emerald-400 font-black text-sm">
                            {formatNumber(m.totalActualMonthly)}
                          </td>
                          <td className="p-3 text-right font-bold text-slate-900 dark:text-white">
                            {formatRupiah(m.budgetAbsorption)}
                          </td>
                          <td className="p-3 text-center font-bold text-sky-700 dark:text-sky-300">{m.avgRate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: REKAP PER LEMBAGA */}
      {/* ========================================================================= */}
      {activeTab === 'rekap_lembaga' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              <Building className="w-4 h-4 text-blue-900 dark:text-sky-400" />
              Rekapitulasi & Komparasi Kinerja per Lembaga
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Perbandingan tingkat penyerapan porsi aktual, presensi siswa, narahubung, dan nomor rekening per lembaga
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {institutions.map(inst => {
                // Calculate average attendance for this school
                const instLogs = beneficiaryAttendance.filter(a => a.institutionId === inst.id);
                const totalAct = instLogs.reduce((acc, l) => acc + l.actualPortions, 0);
                const totalReg = instLogs.reduce((acc, l) => acc + l.totalRegistered, 0);
                const avgRate = totalReg > 0 ? ((totalAct / totalReg) * 100).toFixed(1) : '98.5';

                return (
                  <div
                    key={inst.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-black text-slate-900 dark:text-white text-sm flex items-center gap-2">
                          <span>{inst.name}</span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-sky-300 font-bold">
                            {inst.level}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          NPSN: {inst.npsn} • {inst.institutionType}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-mono font-bold text-sky-700 dark:text-sky-400">
                          {avgRate}%
                        </div>
                        <div className="text-[10px] text-slate-400">Kehadiran Rata-rata</div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-sky-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Number(avgRate))}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs font-mono pt-1">
                      <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                        <div className="text-[10px] text-slate-400">Porsi Kecil</div>
                        <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                          {formatNumber(inst.smallPortions)}
                        </div>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                        <div className="text-[10px] text-slate-400">Porsi Besar</div>
                        <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                          {formatNumber(inst.largePortions)}
                        </div>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                        <div className="text-[10px] text-slate-400">Total Kuota</div>
                        <div className="font-black text-blue-900 dark:text-sky-400 mt-0.5">
                          {formatNumber(inst.totalPortions)}
                        </div>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-600 dark:text-slate-400 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/60 dark:border-slate-800/60 pt-2">
                      <div className="flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                        <span>PIC: <strong>{inst.picName}</strong> ({inst.picPhone})</span>
                      </div>
                      <div className="flex items-center gap-1 font-mono text-[10px]">
                        <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                        <span>{inst.bankName || 'Bank Jatim'}: {inst.accountNumber || '-'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE / EDIT LEMBAGA */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isLembagaModalOpen}
        onClose={() => setIsLembagaModalOpen(false)}
        title={selectedInst ? 'Edit Data Lembaga Penerima' : 'Tambah Lembaga Sasaran MBG Baru'}
        subtitle="Lengkapi data institusi, kontak PIC, nomor rekening, dan kuota awal"
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveLembaga} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nama Lembaga Sekolah / Madrasah *
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: SDN Temenggungan 1"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Jenjang *
              </label>
              <select
                value={formData.level}
                onChange={e => setFormData({ ...formData, level: e.target.value as any })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                {['PAUD', 'SD', 'MI', 'SMP', 'MTs', 'SMA', 'SMK', 'Pesantren'].map(l => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                NPSN / Kode Lembaga *
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: 20546781"
                value={formData.npsn}
                onChange={e => setFormData({ ...formData, npsn: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Jenis Lembaga *
              </label>
              <select
                value={formData.institutionType}
                onChange={e => setFormData({ ...formData, institutionType: e.target.value as any })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="Sekolah Dasar (SD)">Sekolah Dasar (SD)</option>
                <option value="Madrasah Ibtidaiyah (MI)">Madrasah Ibtidaiyah (MI)</option>
                <option value="SMP">SMP</option>
                <option value="MTs">MTs</option>
                <option value="SMA">SMA</option>
                <option value="SMK">SMK</option>
                <option value="PAUD/TK">PAUD/TK</option>
                <option value="Pondok Pesantren">Pondok Pesantren</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Rute Pengantaran *
              </label>
              <select
                value={formData.deliveryRoute}
                onChange={e => setFormData({ ...formData, deliveryRoute: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="Rute A - Temenggungan">Rute A - Temenggungan</option>
                <option value="Rute B - Hafshawaty Sentral">Rute B - Hafshawaty Sentral</option>
                <option value="Rute C - Krejengan Raya">Rute C - Krejengan Raya</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Alamat Lengkap Lembaga *
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Dusun Krajan RT 01/RW 01, Desa Temenggungan, Kec. Krejengan"
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          {/* Kuota Penerima */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
            <div>
              <label className="block text-xs font-bold text-sky-700 dark:text-sky-300 mb-1">
                Porsi Kecil (PAUD / SD 1-3)
              </label>
              <input
                type="number"
                min="0"
                value={formData.smallPortions}
                onChange={e => setFormData({ ...formData, smallPortions: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-indigo-700 dark:text-indigo-300 mb-1">
                Porsi Besar (SD 4-6, SMP, Santri)
              </label>
              <input
                type="number"
                min="0"
                value={formData.largePortions}
                onChange={e => setFormData({ ...formData, largePortions: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Total Porsi (Otomatis)
              </label>
              <div className="w-full px-3 py-2 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono font-black text-blue-900 dark:text-sky-400">
                {Number(formData.smallPortions) + Number(formData.largePortions)} porsi
              </div>
            </div>
          </div>

          {/* PIC & Bank Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nama Guru PIC MBG Sekolah *
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Hariyanto, S.Pd."
                value={formData.picName}
                onChange={e => setFormData({ ...formData, picName: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                No. HP / WhatsApp PIC *
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: 0812-9988-7711"
                value={formData.picPhone}
                onChange={e => setFormData({ ...formData, picPhone: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nama Bank Rekening
              </label>
              <input
                type="text"
                placeholder="Bank Jatim / BRI / BSI"
                value={formData.bankName}
                onChange={e => setFormData({ ...formData, bankName: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nomor Rekening
              </label>
              <input
                type="text"
                placeholder="0132-9981-22"
                value={formData.accountNumber}
                onChange={e => setFormData({ ...formData, accountNumber: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Atas Nama Rekening
              </label>
              <input
                type="text"
                placeholder="BOS SDN Temenggungan 1"
                value={formData.bankAccountName}
                onChange={e => setFormData({ ...formData, bankAccountName: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Catatan Alergi Siswa (Bila Ada)
            </label>
            <input
              type="text"
              placeholder="Contoh: 2 siswa intoleran laktosa susu sapi, 1 siswa alergi telur."
              value={formData.allergiesNote}
              onChange={e => setFormData({ ...formData, allergiesNote: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsLembagaModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold rounded-lg bg-blue-900 hover:bg-blue-800 text-white shadow-sm"
            >
              {selectedInst ? 'Simpan Perubahan' : 'Daftarkan Lembaga'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: UBAH KUOTA DENGAN RIWAYAT AUDIT */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isQuotaModalOpen}
        onClose={() => setIsQuotaModalOpen(false)}
        title="Ubah Kuota Penerima Manfaat (Audit Trail)"
        subtitle={quotaTargetInst ? `Penyesuaian kuota porsi resmi untuk ${quotaTargetInst.name}` : ''}
        maxWidth="lg"
      >
        {quotaTargetInst && (
          <form onSubmit={handleSaveQuotaChange} className="space-y-4">
            {/* Kuota Sebelumnya */}
            <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                Kuota Terdaftar Saat Ini:
              </div>
              <div className="text-xs font-mono flex items-center justify-between">
                <span>Porsi Kecil: <strong>{quotaTargetInst.smallPortions}</strong></span>
                <span>Porsi Besar: <strong>{quotaTargetInst.largePortions}</strong></span>
                <span className="text-blue-900 dark:text-sky-300 font-black">
                  Total: {quotaTargetInst.totalPortions} porsi
                </span>
              </div>
            </div>

            {/* Input Kuota Baru */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-sky-700 dark:text-sky-300 mb-1">
                  Kuota Baru Porsi Kecil *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={quotaForm.smallPortions}
                  onChange={e => setQuotaForm({ ...quotaForm, smallPortions: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-indigo-700 dark:text-indigo-300 mb-1">
                  Kuota Baru Porsi Besar *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={quotaForm.largePortions}
                  onChange={e => setQuotaForm({ ...quotaForm, largePortions: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
                />
              </div>
            </div>

            {/* Delta Preview */}
            {(() => {
              const newTotal = Number(quotaForm.smallPortions) + Number(quotaForm.largePortions);
              const delta = newTotal - quotaTargetInst.totalPortions;
              const isPos = delta >= 0;
              return (
                <div className="p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-blue-950 dark:text-sky-200">
                      Total Kuota Baru: <strong>{newTotal} porsi</strong>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Sebelumnya: {quotaTargetInst.totalPortions} porsi
                    </div>
                  </div>
                  <div>
                    <span
                      className={`inline-block px-2.5 py-1 rounded-lg font-mono font-black text-xs ${
                        isPos
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      {isPos ? `+${delta}` : `${delta}`} Porsi
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Alasan Perubahan Kuota (Wajib) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Alasan Resmi Perubahan Kuota (Wajib Dicatat pada Audit Trail) *
              </label>
              <textarea
                required
                rows={3}
                placeholder="Contoh: Penerimaan 15 siswa mutasi masuk semester ganjil dan pemutakhiran data Dapodik sekolah."
                value={quotaForm.reason}
                onChange={e => setQuotaForm({ ...quotaForm, reason: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Catatan ini akan disimpan permanen pada riwayat sebelum & sesudah perubahan.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsQuotaModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold rounded-lg bg-blue-900 hover:bg-blue-800 text-white shadow-sm"
              >
                Simpan & Catat Riwayat
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: CETAK BAST PRESENSI DETAIL */}
      {/* ========================================================================= */}
      <Modal
        isOpen={Boolean(selectedAttendanceForBast)}
        onClose={() => setSelectedAttendanceForBast(null)}
        title="Berita Acara Serah Terima (BAST) & Presensi Kehadiran"
        subtitle="Dokumen resmi serah terima makanan bergizi gratis antara SPPG dan Sekolah"
        maxWidth="lg"
      >
        {selectedAttendanceForBast && (
          <div className="space-y-4 text-xs">
            <PrintHeader
              title="BERITA ACARA SERAH TERIMA (BAST) MAKANAN BERGIZI GRATIS"
              docNumber={`BAST-MBG/TMG2/${selectedAttendanceForBast.date.replace(/-/g, '')}/${selectedAttendanceForBast.institutionId}`}
            />

            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl space-y-2 border border-slate-200 dark:border-slate-800">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500">Tanggal Serah Terima:</span>
                  <div className="font-bold text-slate-900 dark:text-white">
                    {formatIndonesianDate(selectedAttendanceForBast.date)}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">Lembaga Sasaran:</span>
                  <div className="font-bold text-slate-900 dark:text-white">
                    {selectedAttendanceForBast.institutionName}
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-800 pt-2 grid grid-cols-3 gap-2 font-mono">
                <div>
                  <span className="text-slate-500 text-[10px]">Terdaftar:</span>
                  <div className="font-bold">{selectedAttendanceForBast.totalRegistered}</div>
                </div>
                <div>
                  <span className="text-rose-600 text-[10px]">Tidak Hadir:</span>
                  <div className="font-bold text-rose-600">{selectedAttendanceForBast.totalAbsent}</div>
                </div>
                <div>
                  <span className="text-emerald-600 text-[10px]">Porsi Aktual:</span>
                  <div className="font-black text-emerald-700 text-sm">
                    {selectedAttendanceForBast.actualPortions}
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-800 pt-2">
                <span className="text-slate-500 text-[10px]">Catatan Kondisi Makanan:</span>
                <div className="text-slate-800 dark:text-slate-200 italic">
                  "{selectedAttendanceForBast.notes || 'Ompreng higienis, suhu hangat, lengkap lauk dan buah.'}"
                </div>
              </div>
            </div>

            {/* Signature Block */}
            <div className="grid grid-cols-2 gap-4 text-center pt-4 border-t border-slate-200 dark:border-slate-800">
              <div>
                <div className="text-[11px] text-slate-500">Pihak Pertama (Pengirim):</div>
                <div className="font-bold text-slate-800 dark:text-slate-200 mt-1">Petugas Armada SPPG TMG2</div>
                <div className="h-14 flex items-center justify-center text-[10px] text-slate-400 italic">
                  [Telah Terverifikasi Digital]
                </div>
                <div className="font-semibold text-slate-700 dark:text-slate-300">
                  {selectedAttendanceForBast.recordedBy}
                </div>
              </div>

              <div>
                <div className="text-[11px] text-slate-500">Pihak Kedua (Penerima):</div>
                <div className="font-bold text-slate-800 dark:text-slate-200 mt-1">PIC Guru MBG Sekolah</div>
                <div className="h-14 flex items-center justify-center text-[10px] text-slate-400 italic">
                  [Tanda Tangan & Cap Sekolah]
                </div>
                <div className="font-semibold text-slate-700 dark:text-slate-300">
                  Kepala Sekolah / PIC MBG
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedAttendanceForBast(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={triggerPrint}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-blue-900 hover:bg-blue-800 text-white shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Lembar BAST</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirmation Dialog: Delete Lembaga */}
      <ConfirmDialog
        isOpen={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={async () => {
          if (deleteId) {
            await deleteInstitution(deleteId);
            setDeleteId(null);
            addToast('success', 'Lembaga Dihapus', 'Data lembaga penerima berhasil dihapus dari sistem.');
          }
        }}
        title="Hapus Lembaga Sasaran MBG?"
        message="Tindakan ini akan menghapus data lembaga dari daftar aktif SPPG. Pastikan tidak ada pengiriman atau transaksi berjalan yang terkait dengan lembaga ini."
        confirmLabel="Ya, Hapus Lembaga"
        isDestructive
      />
    </div>
  );
};
