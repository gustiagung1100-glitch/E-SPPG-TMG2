import React, { useState, useMemo } from 'react';
import { useApp } from '../../lib/store';
import { DataTable, Column } from '../common/DataTable';
import { ConfirmDialog } from '../common/ConfirmDialog';
import {
  calculateWHOZScore,
  calculateAgeInMonths,
  validateNikFormat,
  normalizeNik,
  ChildGender,
  NutritionClinicalStatus,
} from '../../lib/whoZScore';
import {
  exportTableToPDF,
  exportToExcel,
  exportToCSV,
  triggerPrint,
  formatIndonesianDate,
} from '../../lib/exportUtils';
import { BeneficiaryNutritionRecord } from '../../types';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Edit,
  FileSpreadsheet,
  FileText,
  Filter,
  HeartPulse,
  Plus,
  Printer,
  RefreshCw,
  Ruler,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';

interface BeneficiaryNutritionTabProps {
  compactCalculatorOnly?: boolean;
}

const getStatusBadgeClasses = (status: NutritionClinicalStatus): string => {
  switch (status) {
    case 'Normal':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800';
    case 'Stunting':
      return 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800';
    case 'Underweight':
      return 'bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-950/70 dark:text-orange-300 dark:border-orange-800';
    case 'Wasting':
      return 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800';
    case 'Gizi Lebih':
      return 'bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-950/70 dark:text-sky-300 dark:border-sky-800';
  }
};

export const BeneficiaryNutritionTab: React.FC<BeneficiaryNutritionTabProps> = ({
  compactCalculatorOnly = false,
}) => {
  const {
    institutions,
    beneficiaryRecords,
    checkDuplicateNik,
    addBeneficiaryRecord,
    updateBeneficiaryRecord,
    deleteBeneficiaryRecord,
    hasPermission,
    sppgConfig,
    addToast,
  } = useApp();

  const [isFormOpen, setIsFormOpen] = useState<boolean>(compactCalculatorOnly);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BeneficiaryNutritionRecord | null>(null);

  // Filter & table loading feedback
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [institutionFilter, setInstitutionFilter] = useState<string>('ALL');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mobile-first Form State
  const [nik, setNik] = useState('');
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState<ChildGender>('L');
  const [birthDate, setBirthDate] = useState('2021-06-15');
  const [ageMonths, setAgeMonths] = useState<number>(65);
  const [institutionId, setInstitutionId] = useState<string>(institutions[0]?.id || 'inst-1');
  const [classOrGroup, setClassOrGroup] = useState('');
  const [measurementDate, setMeasurementDate] = useState('2026-11-08');
  const [weightKg, setWeightKg] = useState<number>(18.5);
  const [heightCm, setHeightCm] = useState<number>(111.0);
  const [notes, setNotes] = useState('');

  const resetForm = () => {
    setEditingId(null);
    setNik('');
    setFullName('');
    setGender('L');
    setBirthDate('2021-06-15');
    setAgeMonths(65);
    setInstitutionId(institutions[0]?.id || 'inst-1');
    setClassOrGroup('');
    setMeasurementDate('2026-11-08');
    setWeightKg(18.5);
    setHeightCm(111.0);
    setNotes('');
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleOpenEdit = (rec: BeneficiaryNutritionRecord) => {
    setEditingId(rec.id);
    setNik(rec.nik);
    setFullName(rec.fullName);
    setGender(rec.gender);
    setBirthDate(rec.birthDate || '');
    setAgeMonths(rec.ageMonths);
    setInstitutionId(rec.institutionId);
    setClassOrGroup(rec.classOrGroup);
    setMeasurementDate(rec.measurementDate);
    setWeightKg(rec.weightKg);
    setHeightCm(rec.heightCm);
    setNotes(rec.notes || '');
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Real-time NIK Validation & Anti-Duplicate Detection
  const nikValidation = useMemo(() => validateNikFormat(nik), [nik]);
  const duplicateOwner = useMemo(() => {
    if (!nikValidation.cleanNik || nikValidation.cleanNik.length < 16) return undefined;
    return checkDuplicateNik(nikValidation.cleanNik, editingId || undefined);
  }, [nikValidation.cleanNik, checkDuplicateNik, editingId]);

  // Live Real-Time WHO / Kemenkes Z-Score Calculation Preview
  const liveZScore = useMemo(
    () =>
      calculateWHOZScore({
        ageMonths,
        gender,
        weightKg,
        heightCm,
      }),
    [ageMonths, gender, weightKg, heightCm]
  );

  // Sync ageMonths when birthDate or measurementDate changes
  const handleBirthDateChange = (nextBirthDate: string) => {
    setBirthDate(nextBirthDate);
    if (nextBirthDate) {
      const computed = calculateAgeInMonths(nextBirthDate, measurementDate);
      setAgeMonths(computed);
    }
  };

  const handleMeasurementDateChange = (nextDate: string) => {
    setMeasurementDate(nextDate);
    if (birthDate) {
      const computed = calculateAgeInMonths(birthDate, nextDate);
      setAgeMonths(computed);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nikValidation.valid) {
      addToast('error', 'Validasi NIK Gagal', nikValidation.error || 'NIK harus 16 digit.');
      return;
    }
    if (duplicateOwner) {
      addToast(
        'error',
        'Duplikasi NIK Diblokir',
        `NIK ${nikValidation.cleanNik} sudah terdaftar atas nama ${duplicateOwner.fullName}.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingId) {
        const res = await updateBeneficiaryRecord(editingId, {
          nik: nikValidation.cleanNik,
          fullName,
          gender,
          birthDate,
          ageMonths,
          institutionId,
          classOrGroup,
          measurementDate,
          weightKg,
          heightCm,
          notes,
        });
        if (res.ok) {
          resetForm();
          setIsFormOpen(false);
        }
      } else {
        const res = await addBeneficiaryRecord({
          nik: nikValidation.cleanNik,
          fullName,
          gender,
          birthDate,
          ageMonths,
          institutionId,
          classOrGroup,
          measurementDate,
          weightKg,
          heightCm,
          notes,
        });
        if (res.ok) {
          resetForm();
          setIsFormOpen(false);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered Data & Aggregate Summary
  const filteredRecords = useMemo(() => {
    return beneficiaryRecords.filter(rec => {
      if (institutionFilter !== 'ALL' && rec.institutionId !== institutionFilter) return false;
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'Stunting' && !rec.isStunted && rec.primaryStatus !== 'Stunting') return false;
        if (statusFilter === 'Underweight' && !rec.isUnderweight && rec.primaryStatus !== 'Underweight') return false;
        if (statusFilter === 'Wasting' && !rec.isWasted && rec.primaryStatus !== 'Wasting') return false;
        if (statusFilter === 'Normal' && rec.primaryStatus !== 'Normal') return false;
        if (statusFilter === 'Gizi Lebih' && rec.primaryStatus !== 'Gizi Lebih') return false;
      }
      return true;
    });
  }, [beneficiaryRecords, institutionFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = beneficiaryRecords.length;
    const normal = beneficiaryRecords.filter(r => r.primaryStatus === 'Normal').length;
    const stunting = beneficiaryRecords.filter(r => r.isStunted).length;
    const underweight = beneficiaryRecords.filter(r => r.isUnderweight).length;
    const wasting = beneficiaryRecords.filter(r => r.isWasted).length;
    return {
      total,
      normal,
      stunting,
      underweight,
      wasting,
      normalPct: total > 0 ? ((normal / total) * 100).toFixed(1) : '0.0',
    };
  }, [beneficiaryRecords]);

  // Dynamic Reports Export Helpers
  const buildExportPayload = () => {
    const headers = [
      'No',
      'NIK (16 Digit)',
      'Nama Lengkap',
      'L/P',
      'Usia (Bln)',
      'Lembaga / Kelas',
      'BB (kg)',
      'TB (cm)',
      'HAZ (TB/U)',
      'WAZ (BB/U)',
      'WHZ/BAZ',
      'Status WHO',
    ];
    const rows = filteredRecords.map((r, idx) => [
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
    const excelData = filteredRecords.map((r, idx) => ({
      No: idx + 1,
      NIK: r.nik,
      'Nama Lengkap': r.fullName,
      'Jenis Kelamin': r.gender === 'L' ? 'Laki-laki' : 'Perempuan',
      'Usia (Bulan)': r.ageMonths,
      Lembaga: r.institutionName,
      'Kelas/Kelompok': r.classOrGroup,
      'Tanggal Ukur': r.measurementDate,
      'Berat Badan (kg)': r.weightKg,
      'Tinggi Badan (cm)': r.heightCm,
      IMT: r.bmi,
      'Z-Score TB/U (HAZ)': r.haz,
      'Kategori TB/U': r.hazCategory,
      'Z-Score BB/U (WAZ)': r.waz ?? '-',
      'Kategori BB/U': r.wazCategory,
      'Z-Score BB/TB atau IMT/U': r.whz,
      'Kategori BB/TB atau IMT/U': r.whzCategory,
      'Status Utama WHO': r.primaryStatus,
      'Tingkat Risiko': r.severityLevel,
      Rekomendasi: r.recommendation,
    }));
    return { headers, rows, excelData };
  };

  const handleExportPDF = async () => {
    const { headers, rows } = buildExportPayload();
    await exportTableToPDF({
      title: 'LAPORAN PEMANTAUAN STATUS GIZI & Z-SCORE WHO/KEMENKES',
      subtitle: `Standar Antropometri Permenkes No. 2/2020 • Total Terdata: ${filteredRecords.length} Anak`,
      headers,
      rows,
      fileName: 'Laporan_Status_Gizi_WHO_SPPG',
      sppgConfig,
      orientation: 'landscape',
      notes: 'Dihitung otomatis menggunakan referensi LMS WHO 2006 (0-60 bln) dan WHO 2007 (5-19 thn).',
    });
    addToast('success', 'PDF Gizi Diunduh', 'Laporan status gizi WHO/Kemenkes berhasil diekspor ke PDF.');
  };

  const handleExportExcel = () => {
    const { excelData } = buildExportPayload();
    exportToExcel(excelData, 'Data_Antropometri_WHO_SPPG', 'Status Gizi WHO');
    addToast('success', 'Excel Diunduh', 'Data antropometri & Z-Score WHO berhasil diekspor (.xlsx).');
  };

  const handleExportCSV = () => {
    const { excelData } = buildExportPayload();
    exportToCSV(excelData, 'Data_Antropometri_WHO_SPPG');
    addToast('success', 'CSV Diunduh', 'Data antropometri & Z-Score WHO berhasil diekspor (.csv).');
  };

  const columns: Column<BeneficiaryNutritionRecord>[] = [
    {
      key: 'fullName',
      header: 'Anak & NIK (Unik)',
      render: row => (
        <div className="min-w-[180px]">
          <div className="font-bold text-slate-900 dark:text-white">{row.fullName}</div>
          <div className="text-[11px] font-mono text-slate-600 dark:text-slate-300 mt-0.5">
            NIK: {row.nik}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {row.gender === 'L' ? 'Laki-laki' : 'Perempuan'} • {row.ageMonths} bln (
            {(row.ageMonths / 12).toFixed(1)} thn)
          </div>
        </div>
      ),
    },
    {
      key: 'institutionName',
      header: 'Sekolah / Lembaga',
      render: row => (
        <div className="min-w-[150px]">
          <div className="font-semibold text-slate-800 dark:text-slate-200">{row.institutionName}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {row.classOrGroup} • {formatIndonesianDate(row.measurementDate)}
          </div>
        </div>
      ),
    },
    {
      key: 'weightKg',
      header: 'Antropometri',
      align: 'right',
      render: row => (
        <div className="font-mono text-xs tabular-nums">
          <div className="font-bold text-slate-900 dark:text-white">
            {row.weightKg.toFixed(1)} kg / {row.heightCm.toFixed(1)} cm
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            IMT: {row.bmi.toFixed(1)} kg/m²
          </div>
        </div>
      ),
    },
    {
      key: 'haz',
      header: 'Z-Score WHO',
      render: row => (
        <div className="font-mono text-[11px] space-y-0.5 tabular-nums">
          <div>
            <span className="text-slate-500 dark:text-slate-400">TB/U:</span>{' '}
            <strong className={row.haz < -2 ? 'text-amber-700 dark:text-amber-300' : 'text-slate-800 dark:text-slate-200'}>
              {row.haz > 0 ? `+${row.haz.toFixed(2)}` : row.haz.toFixed(2)}
            </strong>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400">BB/U:</span>{' '}
            <strong className={row.waz !== null && row.waz < -2 ? 'text-orange-700 dark:text-orange-300' : 'text-slate-800 dark:text-slate-200'}>
              {row.waz === null ? 'N/A (>10th)' : row.waz > 0 ? `+${row.waz.toFixed(2)}` : row.waz.toFixed(2)}
            </strong>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400">{row.whzIndexLabel}:</span>{' '}
            <strong className={row.whz < -2 ? 'text-rose-700 dark:text-rose-300' : 'text-slate-800 dark:text-slate-200'}>
              {row.whz > 0 ? `+${row.whz.toFixed(2)}` : row.whz.toFixed(2)}
            </strong>
          </div>
        </div>
      ),
    },
    {
      key: 'primaryStatus',
      header: 'Status Gizi (WHO)',
      render: row => (
        <div className="space-y-1">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-bold ${getStatusBadgeClasses(
              row.primaryStatus
            )}`}
          >
            {row.primaryStatus}
          </span>
          {(row.isStunted || row.isUnderweight || row.isWasted) && (
            <div className="text-[10px] font-medium text-slate-600 dark:text-slate-300">
              {[
                row.isStunted ? 'TB/U < -2 SD' : null,
                row.isUnderweight ? 'BB/U < -2 SD' : null,
                row.isWasted ? `${row.whzIndexLabel} < -2 SD` : null,
              ]
                .filter(Boolean)
                .join(' • ')}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      align: 'right',
      sortable: false,
      render: row => (
        <div className="flex items-center justify-end gap-1.5">
          {hasPermission('institutions', 'edit') && (
            <button
              type="button"
              onClick={() => handleOpenEdit(row)}
              className="min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-lg text-blue-700 hover:bg-blue-50 dark:text-sky-400 dark:hover:bg-sky-950/60 transition cursor-pointer"
              title="Edit & Hitung Ulang Z-Score"
              aria-label={`Edit ${row.fullName}`}
            >
              <Edit className="w-4 h-4" />
            </button>
          )}
          {hasPermission('institutions', 'delete') && (
            <button
              type="button"
              onClick={() => setDeleteTarget(row)}
              className="min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/60 transition cursor-pointer"
              title="Hapus Data Anak"
              aria-label={`Hapus ${row.fullName}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 page-transition-enter">
      {/* KPI Overview Strip */}
      {!compactCalculatorOnly && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 tabular-nums">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">
              Anak Terpantau
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {stats.total} <span className="text-xs font-semibold text-slate-500">Anak</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Terverifikasi NIK 16-digit
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="text-[11px] font-bold uppercase text-emerald-700 dark:text-emerald-400">
              Status Normal
            </div>
            <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
              {stats.normal} <span className="text-xs font-bold">({stats.normalPct}%)</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Z-Score -2 SD s.d. +2 SD
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="text-[11px] font-bold uppercase text-amber-700 dark:text-amber-400">
              Stunting (TB/U)
            </div>
            <div className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-1">
              {stats.stunting} <span className="text-xs font-semibold">Kasus</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Indeks TB/U &lt; -2 SD
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="text-[11px] font-bold uppercase text-orange-700 dark:text-orange-400">
              Underweight (BB/U)
            </div>
            <div className="text-2xl font-black text-orange-700 dark:text-orange-400 mt-1">
              {stats.underweight} <span className="text-xs font-semibold">Kasus</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Indeks BB/U &lt; -2 SD
            </div>
          </div>

          <div className="col-span-2 lg:col-span-1 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="text-[11px] font-bold uppercase text-rose-700 dark:text-rose-400">
              Wasting (Akut)
            </div>
            <div className="text-2xl font-black text-rose-700 dark:text-rose-400 mt-1">
              {stats.wasting} <span className="text-xs font-semibold">Kasus</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              BB/TB atau IMT/U &lt; -2 SD
            </div>
          </div>
        </div>
      )}

      {/* Action Header Bar */}
      {!compactCalculatorOnly && (
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0F766E] text-white flex items-center justify-center shrink-0">
              <HeartPulse className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                Kalkulator Gizi WHO/Kemenkes & Registrasi Antropometri Anak
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                Perhitungan otomatis Z-Score (Normal, Stunting, Underweight, Wasting), proteksi anti-duplikasi NIK 16-digit, dan sinkronisasi real-time ke Dashboard.
              </p>
            </div>
          </div>

          {hasPermission('institutions', 'create') && (
            <button
              type="button"
              onClick={() => (isFormOpen ? setIsFormOpen(false) : handleOpenCreate())}
              className={`min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                isFormOpen
                  ? 'bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                  : 'bg-[#142B4A] hover:bg-[#0F766E] text-white shadow-sm'
              }`}
            >
              {isFormOpen ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              <span>{isFormOpen ? 'Tutup Form & Kalkulator' : 'Input Anak & Hitung Z-Score'}</span>
            </button>
          )}
        </div>
      )}

      {/* Mobile-First Ergonomic Vertical Form + Live Desktop Two-Column WHO Z-Score Calculator */}
      {isFormOpen && (
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h4 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#0F766E] dark:text-teal-400" />
                <span>
                  {editingId
                    ? 'Edit Data Antropometri & Hitung Ulang WHO Z-Score'
                    : compactCalculatorOnly
                    ? 'Kalkulator Gizi Otomatis Standar WHO / Kemenkes (Permenkes No. 2/2020)'
                    : 'Registrasi Anak Penerima Gizi & Kalkulasi Z-Score WHO'}
                </span>
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Masukkan data usia, berat badan, dan tinggi badan untuk kalkulasi Z-Score real-time.
              </p>
            </div>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="min-h-[40px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset ke Baru</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column (Mobile Vertical Form Inputs) */}
            <div className="lg:col-span-7 space-y-4">
              {!compactCalculatorOnly && (
                <>
                  {/* NIK 16 Digit Strict Validation + Live Anti-Duplicate Alert */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="child-nik-input"
                        className="text-xs font-bold text-slate-800 dark:text-slate-200"
                      >
                        NIK Anak (16 Digit Wajib Unik) <span className="text-rose-600">*</span>
                      </label>
                      <span
                        className={`text-[11px] font-mono font-bold tabular-nums ${
                          nikValidation.valid && !duplicateOwner
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {nikValidation.cleanNik.length}/16 digit
                      </span>
                    </div>
                    <input
                      id="child-nik-input"
                      type="text"
                      inputMode="numeric"
                      maxLength={16}
                      required
                      value={nik}
                      onChange={e => setNik(normalizeNik(e.target.value))}
                      placeholder="Contoh: 3513140805210001"
                      className={`w-full min-h-[44px] px-3.5 py-2.5 text-sm font-mono rounded-xl border bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 transition ${
                        duplicateOwner
                          ? 'border-rose-500 ring-2 ring-rose-500/20'
                          : nikValidation.valid
                          ? 'border-emerald-500 ring-2 ring-emerald-500/15'
                          : 'border-slate-300 dark:border-slate-700'
                      }`}
                    />
                    {duplicateOwner ? (
                      <div
                        role="alert"
                        className="mt-2 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2"
                      >
                        <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                        <div>
                          <strong>Duplikasi NIK Terdeteksi:</strong> NIK ini sudah terdaftar atas nama{' '}
                          <strong>{duplicateOwner.fullName}</strong> di{' '}
                          <strong>{duplicateOwner.institutionName}</strong>. Penyimpanan akan diblokir.
                        </div>
                      </div>
                    ) : nik.length > 0 && !nikValidation.valid ? (
                      <p className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                        {nikValidation.error}
                      </p>
                    ) : nikValidation.valid ? (
                      <p className="mt-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>NIK valid & belum terdaftar (unik).</span>
                      </p>
                    ) : null}
                  </div>

                  {/* Nama & Lembaga */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="child-name-input"
                        className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5"
                      >
                        Nama Lengkap Anak / Siswa <span className="text-rose-600">*</span>
                      </label>
                      <input
                        id="child-name-input"
                        type="text"
                        required
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        placeholder="Nama lengkap sesuai KK/Akta"
                        className="w-full min-h-[44px] px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="child-inst-select"
                        className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5"
                      >
                        Sekolah / Lembaga Penerima Manfaat <span className="text-rose-600">*</span>
                      </label>
                      <select
                        id="child-inst-select"
                        value={institutionId}
                        onChange={e => setInstitutionId(e.target.value)}
                        className="w-full min-h-[44px] px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                      >
                        {institutions.map(inst => (
                          <option key={inst.id} value={inst.id}>
                            {inst.name} ({inst.level})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* Gender Touch Buttons + Kelas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    Jenis Kelamin (Standar Kurva WHO)
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setGender('L')}
                      className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        gender === 'L'
                          ? 'bg-[#142B4A] text-white border-[#142B4A] dark:bg-sky-600 dark:border-sky-500'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Laki-laki (L)
                    </button>
                    <button
                      type="button"
                      onClick={() => setGender('P')}
                      className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        gender === 'P'
                          ? 'bg-[#0F766E] text-white border-[#0F766E] dark:bg-teal-600 dark:border-teal-500'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Perempuan (P)
                    </button>
                  </div>
                </div>

                {!compactCalculatorOnly && (
                  <div>
                    <label
                      htmlFor="child-class-input"
                      className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5"
                    >
                      Kelas / Kelompok Belajar
                    </label>
                    <input
                      id="child-class-input"
                      type="text"
                      value={classOrGroup}
                      onChange={e => setClassOrGroup(e.target.value)}
                      placeholder="Contoh: TK B1 / Kelas 2A"
                      className="w-full min-h-[44px] px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                )}
              </div>

              {/* Dates & Age in Months */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label
                    htmlFor="child-dob-input"
                    className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5"
                  >
                    Tanggal Lahir (Auto Usia)
                  </label>
                  <input
                    id="child-dob-input"
                    type="date"
                    value={birthDate}
                    onChange={e => handleBirthDateChange(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label
                    htmlFor="child-age-input"
                    className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5"
                  >
                    Usia (Bulan, 0–228)
                  </label>
                  <input
                    id="child-age-input"
                    type="number"
                    min={0}
                    max={228}
                    required
                    value={ageMonths}
                    onChange={e => setAgeMonths(Math.max(0, Math.min(228, Number(e.target.value) || 0)))}
                    className="w-full min-h-[44px] px-3.5 py-2 text-sm font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label
                    htmlFor="child-measure-date"
                    className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5"
                  >
                    Tanggal Pengukuran
                  </label>
                  <input
                    id="child-measure-date"
                    type="date"
                    required
                    value={measurementDate}
                    onChange={e => handleMeasurementDateChange(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Weight & Height */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="child-weight-input"
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5"
                  >
                    <Scale className="w-3.5 h-3.5 text-[#0F766E] dark:text-teal-400" />
                    <span>Berat Badan (kg)</span>
                  </label>
                  <input
                    id="child-weight-input"
                    type="number"
                    step="0.1"
                    min={1.5}
                    max={150}
                    required
                    value={weightKg}
                    onChange={e => setWeightKg(Number(e.target.value) || 1)}
                    className="w-full min-h-[44px] px-3.5 py-2.5 text-base font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label
                    htmlFor="child-height-input"
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5"
                  >
                    <Ruler className="w-3.5 h-3.5 text-[#0F766E] dark:text-teal-400" />
                    <span>Tinggi / Panjang Badan (cm)</span>
                  </label>
                  <input
                    id="child-height-input"
                    type="number"
                    step="0.1"
                    min={35}
                    max={220}
                    required
                    value={heightCm}
                    onChange={e => setHeightCm(Number(e.target.value) || 35)}
                    className="w-full min-h-[44px] px-3.5 py-2.5 text-base font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {!compactCalculatorOnly && (
                <div>
                  <label
                    htmlFor="child-notes-input"
                    className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5"
                  >
                    Catatan Kader / Ahli Gizi & Rencana Tindak Lanjut
                  </label>
                  <textarea
                    id="child-notes-input"
                    rows={2}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Contoh: Alergi makanan, intervensi PMT porsi ganda, jadwal timbang ulang..."
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              )}
            </div>

            {/* Right Column: Live WHO / Kemenkes Z-Score Diagnostics Card */}
            <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-800/70 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5 flex flex-col justify-between gap-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-700">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Analisis Real-Time WHO / Kemenkes
                    </div>
                    <div className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">
                      Hasil Klasifikasi Status Gizi
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1.5 rounded-xl border text-xs font-black ${getStatusBadgeClasses(
                      liveZScore.primaryStatus
                    )}`}
                  >
                    {liveZScore.primaryStatus}
                  </span>
                </div>

                {/* 3 WHO Z-Score Metric Tiles */}
                <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-2.5 tabular-nums">
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        TB/U (HAZ — Stunting)
                      </div>
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {liveZScore.hazCategory}
                      </div>
                    </div>
                    <div
                      className={`text-base font-mono font-black ${
                        liveZScore.haz < -2
                          ? 'text-amber-700 dark:text-amber-300'
                          : 'text-emerald-700 dark:text-emerald-400'
                      }`}
                    >
                      {liveZScore.haz > 0 ? `+${liveZScore.haz.toFixed(2)}` : liveZScore.haz.toFixed(2)} SD
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        BB/U (WAZ — Underweight)
                      </div>
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {liveZScore.wazCategory}
                      </div>
                    </div>
                    <div
                      className={`text-base font-mono font-black ${
                        liveZScore.waz !== null && liveZScore.waz < -2
                          ? 'text-orange-700 dark:text-orange-300'
                          : 'text-emerald-700 dark:text-emerald-400'
                      }`}
                    >
                      {liveZScore.waz === null
                        ? 'N/A'
                        : `${liveZScore.waz > 0 ? `+${liveZScore.waz.toFixed(2)}` : liveZScore.waz.toFixed(2)} SD`}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        {liveZScore.whzIndexLabel} ({liveZScore.whzIndexLabel === 'BB/TB' ? 'Wasting Balita' : 'IMT/U Anak'})
                      </div>
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {liveZScore.whzCategory}
                      </div>
                    </div>
                    <div
                      className={`text-base font-mono font-black ${
                        liveZScore.whz < -2
                          ? 'text-rose-700 dark:text-rose-300'
                          : 'text-emerald-700 dark:text-emerald-400'
                      }`}
                    >
                      {liveZScore.whz > 0 ? `+${liveZScore.whz.toFixed(2)}` : liveZScore.whz.toFixed(2)} SD
                    </div>
                  </div>
                </div>

                {/* BMI & Clinical Recommendation */}
                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-600 dark:text-slate-400">Indeks Massa Tubuh (IMT):</span>
                    <span className="font-mono font-extrabold text-slate-900 dark:text-white">
                      {liveZScore.bmi.toFixed(2)} kg/m²
                    </span>
                  </div>
                  <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed pt-1 border-t border-slate-100 dark:border-slate-800">
                    <strong className="text-slate-900 dark:text-white">Rekomendasi Klinis:</strong>{' '}
                    {liveZScore.recommendation}
                  </div>
                </div>
              </div>

              {!compactCalculatorOnly && (
                <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      setIsFormOpen(false);
                    }}
                    className="min-h-[44px] flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !nikValidation.valid || Boolean(duplicateOwner)}
                    className="min-h-[44px] flex-[2] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#0D625B] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-extrabold shadow-sm transition cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {isSubmitting
                        ? 'Menyimpan...'
                        : editingId
                        ? 'Simpan Perubahan & Sinkron Dashboard'
                        : 'Simpan Data Anak & Sinkron Dashboard'}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </form>
      )}

      {/* Registry DataTable with Status Filter & Dynamic Export */}
      {!compactCalculatorOnly && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 mr-1">
                <Filter className="w-3.5 h-3.5 text-[#0F766E] dark:text-teal-400" />
                <span>Filter:</span>
              </span>
              {(['ALL', 'Normal', 'Stunting', 'Underweight', 'Wasting', 'Gizi Lebih'] as const).map(st => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    statusFilter === st
                      ? 'bg-[#142B4A] text-white dark:bg-teal-600'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {st === 'ALL' ? `Semua (${beneficiaryRecords.length})` : st}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Filter Lembaga"
                value={institutionFilter}
                onChange={e => setInstitutionFilter(e.target.value)}
                className="min-h-[38px] px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              >
                <option value="ALL">Semua Sekolah / Lembaga</option>
                {institutions.map(inst => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleExportCSV}
                className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>
            </div>
          </div>

          <DataTable
            data={filteredRecords}
            columns={columns}
            keyExtractor={r => r.id}
            title="Registri Status Gizi & Antropometri Penerima Manfaat (WHO/Kemenkes)"
            subtitle="Validasi NIK 16-digit anti-duplikasi • Sinkron real-time dengan Dashboard & Pusat Laporan BGN"
            searchPlaceholder="Cari nama anak, NIK 16 digit, sekolah, atau status WHO..."
            searchKeys={['fullName', 'nik', 'institutionName', 'classOrGroup', 'primaryStatus']}
            onExportExcel={handleExportExcel}
            onExportPDF={handleExportPDF}
            onPrint={triggerPrint}
          />
        </div>
      )}

      {/* Confirmation Dialog: Delete Beneficiary Nutrition Record */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) {
            await deleteBeneficiaryRecord(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
        title="Hapus Data Antropometri Anak?"
        message={
          deleteTarget
            ? `Data anak ${deleteTarget.fullName} (NIK: ${deleteTarget.nik}) akan dihapus permanen dan statistik Dashboard akan diperbarui otomatis.`
            : ''
        }
        confirmLabel="Ya, Hapus Data"
        isDestructive
      />
    </div>
  );
};
