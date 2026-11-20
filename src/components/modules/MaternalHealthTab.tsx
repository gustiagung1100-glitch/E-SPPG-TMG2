import React, { useMemo, useState } from 'react';
import { useApp } from '../../lib/store';
import { DataTable, Column } from '../common/DataTable';
import { ConfirmDialog } from '../common/ConfirmDialog';
import {
  calculateGestationFromHPHT,
  calculateMaternalHealthAssessment,
} from '../../lib/maternalHealth';
import { normalizeNik, validateNikFormat } from '../../lib/whoZScore';
import {
  exportTableToPDF,
  exportToCSV,
  exportToExcel,
  formatIndonesianDate,
  triggerPrint,
} from '../../lib/exportUtils';
import { MaternalHealthRecord, MaternalRiskLevel } from '../../types';
import {
  Activity,
  AlertTriangle,
  Baby,
  Calculator,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Droplets,
  Edit,
  FileSpreadsheet,
  FileText,
  Filter,
  HeartPulse,
  MapPin,
  Plus,
  Printer,
  RefreshCw,
  Ruler,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  Trash2,
} from 'lucide-react';

const POSYANDU_PRESETS = [
  { id: 'posyandu-temenggungan', name: 'Posyandu Melati — Desa Temenggungan' },
  { id: 'posyandu-krejengan', name: 'Posyandu Anggrek — Desa Krejengan' },
  { id: 'posyandu-gebangan', name: 'Posyandu Kenanga — Desa Gebangan' },
  { id: 'posyandu-karangsari', name: 'Posyandu Mawar — Desa Karangsari' },
];

const getRiskBadgeClasses = (level: MaternalRiskLevel): string => {
  switch (level) {
    case 'Normal / Risiko Rendah':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800';
    case 'Risiko Sedang':
      return 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800';
    case 'Risiko Tinggi':
      return 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800';
  }
};

export const MaternalHealthTab: React.FC = () => {
  const {
    institutions,
    maternalHealthRecords,
    checkDuplicateMaternalNik,
    addMaternalHealthRecord,
    updateMaternalHealthRecord,
    deleteMaternalHealthRecord,
    hasPermission,
    sppgConfig,
    addToast,
  } = useApp();

  const [isCalculatorOpen, setIsCalculatorOpen] = useState<boolean>(true);
  const [calculatorMode, setCalculatorMode] = useState<'save' | 'simulate'>('save');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MaternalHealthRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Filters for registry table
  const [riskFilter, setRiskFilter] = useState<string>('ALL');
  const [trimesterFilter, setTrimesterFilter] = useState<string>('ALL');
  const [conditionFilter, setConditionFilter] = useState<string>('ALL');

  // Form / Calculator Inputs
  const [nik, setNik] = useState('');
  const [fullName, setFullName] = useState('');
  const [ageYears, setAgeYears] = useState<number>(27);
  const [phone, setPhone] = useState('');
  const [institutionId, setInstitutionId] = useState<string>('posyandu-temenggungan');
  const [villageOrPosyandu, setVillageOrPosyandu] = useState('Dusun Krajan, Desa Temenggungan');
  const [gravida, setGravida] = useState<number>(2);
  const [para, setPara] = useState<number>(1);
  const [abortus, setAbortus] = useState<number>(0);

  const [measurementDate, setMeasurementDate] = useState<string>('2026-11-08');
  const [hphtDate, setHphtDate] = useState<string>('2026-05-20');
  const [gestationalWeeks, setGestationalWeeks] = useState<number>(24);
  const [gestationalDaysRemainder, setGestationalDaysRemainder] = useState<number>(4);
  const [dueDateHpl, setDueDateHpl] = useState<string>('2027-02-24');

  const [prePregnancyWeightKg, setPrePregnancyWeightKg] = useState<number>(50.0);
  const [currentWeightKg, setCurrentWeightKg] = useState<number>(56.5);
  const [heightCm, setHeightCm] = useState<number>(156.0);
  const [lilaCm, setLilaCm] = useState<number>(24.5);
  const [hemoglobinGdL, setHemoglobinGdL] = useState<number>(11.4);
  const [systolicBp, setSystolicBp] = useState<number>(115);
  const [diastolicBp, setDiastolicBp] = useState<number>(75);
  const [ttdCompliant, setTtdCompliant] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('');

  const resetForm = () => {
    setEditingId(null);
    setNik('');
    setFullName('');
    setAgeYears(27);
    setPhone('');
    setInstitutionId('posyandu-temenggungan');
    setVillageOrPosyandu('Dusun Krajan, Desa Temenggungan');
    setGravida(2);
    setPara(1);
    setAbortus(0);
    setMeasurementDate('2026-11-08');
    setHphtDate('2026-05-20');
    const gest = calculateGestationFromHPHT('2026-05-20', '2026-11-08');
    setGestationalWeeks(gest?.gestationalWeeks ?? 24);
    setGestationalDaysRemainder(gest?.gestationalDaysRemainder ?? 4);
    setDueDateHpl(gest?.dueDateHpl ?? '2027-02-24');
    setPrePregnancyWeightKg(50.0);
    setCurrentWeightKg(56.5);
    setHeightCm(156.0);
    setLilaCm(24.5);
    setHemoglobinGdL(11.4);
    setSystolicBp(115);
    setDiastolicBp(75);
    setTtdCompliant(true);
    setNotes('');
  };

  const handleHphtChange = (newHpht: string) => {
    setHphtDate(newHpht);
    if (newHpht) {
      const gest = calculateGestationFromHPHT(newHpht, measurementDate);
      if (gest) {
        setGestationalWeeks(gest.gestationalWeeks);
        setGestationalDaysRemainder(gest.gestationalDaysRemainder);
        setDueDateHpl(gest.dueDateHpl);
      }
    }
  };

  const handleMeasurementDateChange = (newDate: string) => {
    setMeasurementDate(newDate);
    if (hphtDate) {
      const gest = calculateGestationFromHPHT(hphtDate, newDate);
      if (gest) {
        setGestationalWeeks(gest.gestationalWeeks);
        setGestationalDaysRemainder(gest.gestationalDaysRemainder);
        setDueDateHpl(gest.dueDateHpl);
      }
    }
  };

  const handleOpenEdit = (rec: MaternalHealthRecord) => {
    setEditingId(rec.id);
    setCalculatorMode('save');
    setNik(rec.nik);
    setFullName(rec.fullName);
    setAgeYears(rec.ageYears);
    setPhone(rec.phone || '');
    setInstitutionId(rec.institutionId);
    setVillageOrPosyandu(rec.villageOrPosyandu);
    setGravida(rec.gravida);
    setPara(rec.para);
    setAbortus(rec.abortus);
    setMeasurementDate(rec.measurementDate);
    setHphtDate(rec.hphtDate || '');
    setGestationalWeeks(rec.gestationalWeeks);
    setGestationalDaysRemainder(rec.gestationalDaysRemainder);
    setDueDateHpl(rec.dueDateHpl || '');
    setPrePregnancyWeightKg(rec.prePregnancyWeightKg);
    setCurrentWeightKg(rec.currentWeightKg);
    setHeightCm(rec.heightCm);
    setLilaCm(rec.lilaCm);
    setHemoglobinGdL(rec.hemoglobinGdL);
    setSystolicBp(rec.systolicBp);
    setDiastolicBp(rec.diastolicBp);
    setTtdCompliant(rec.ttdCompliant);
    setNotes(rec.notes || '');
    setIsCalculatorOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Real-time clinical calculation
  const liveAssessment = useMemo(() => {
    return calculateMaternalHealthAssessment({
      ageYears,
      gestationalWeeks,
      prePregnancyWeightKg,
      currentWeightKg,
      heightCm,
      lilaCm,
      hemoglobinGdL,
      systolicBp,
      diastolicBp,
      ttdCompliant,
    });
  }, [
    ageYears,
    gestationalWeeks,
    prePregnancyWeightKg,
    currentWeightKg,
    heightCm,
    lilaCm,
    hemoglobinGdL,
    systolicBp,
    diastolicBp,
    ttdCompliant,
  ]);

  const nikValidation = useMemo(() => validateNikFormat(nik), [nik]);
  const duplicateOwner = useMemo(() => {
    if (!nikValidation.cleanNik || nikValidation.cleanNik.length < 16) return undefined;
    return checkDuplicateMaternalNik(nikValidation.cleanNik, editingId || undefined);
  }, [nikValidation.cleanNik, checkDuplicateMaternalNik, editingId]);

  const selectedInstitutionName = useMemo(() => {
    const preset = POSYANDU_PRESETS.find(p => p.id === institutionId);
    if (preset) return preset.name;
    const inst = institutions.find(i => i.id === institutionId);
    if (inst) return inst.name;
    return 'Posyandu / Sasaran 3B Wilayah Krejengan';
  }, [institutionId, institutions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (calculatorMode === 'simulate') {
      setCalculatorMode('save');
      addToast('info', 'Mode Simpan Aktif', 'Lengkapi NIK & Nama Ibu Hamil untuk menyimpan hasil ke Rekapitulasi.');
      return;
    }

    if (!nikValidation.valid) {
      addToast('error', 'Validasi NIK', nikValidation.error || 'NIK harus 16 digit.');
      return;
    }
    if (duplicateOwner) {
      addToast(
        'error',
        'Duplikasi NIK Ditolak',
        `NIK ini sudah terdaftar atas nama ${duplicateOwner.fullName} (${duplicateOwner.institutionName}).`
      );
      return;
    }
    if (!fullName.trim()) {
      addToast('error', 'Nama Wajib Diisi', 'Masukkan nama lengkap ibu hamil.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        nik: nikValidation.cleanNik,
        fullName: fullName.trim(),
        ageYears,
        phone,
        institutionId,
        institutionNameOverride: selectedInstitutionName,
        villageOrPosyandu,
        gravida,
        para,
        abortus,
        hphtDate: hphtDate || undefined,
        gestationalWeeks,
        gestationalDaysRemainder,
        dueDateHpl: dueDateHpl || undefined,
        prePregnancyWeightKg,
        currentWeightKg,
        heightCm,
        lilaCm,
        hemoglobinGdL,
        systolicBp,
        diastolicBp,
        ttdCompliant,
        measurementDate,
        notes,
      };

      const res = editingId
        ? await updateMaternalHealthRecord(editingId, payload)
        : await addMaternalHealthRecord(payload);

      if (res.ok) {
        resetForm();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Summary & Recapitulation Metrics
  const summaryStats = useMemo(() => {
    const total = maternalHealthRecords.length;
    const kekCount = maternalHealthRecords.filter(r => r.isKek).length;
    const anemiaCount = maternalHealthRecords.filter(r => r.anemiaStatus !== 'Normal').length;
    const hypertensionCount = maternalHealthRecords.filter(
      r => r.bpStatus === 'Hipertensi / Risiko Preeklamsia'
    ).length;
    const highRiskCount = maternalHealthRecords.filter(r => r.riskLevel === 'Risiko Tinggi').length;
    const mediumRiskCount = maternalHealthRecords.filter(r => r.riskLevel === 'Risiko Sedang').length;
    const normalCount = maternalHealthRecords.filter(r => r.riskLevel === 'Normal / Risiko Rendah').length;
    const ttdCount = maternalHealthRecords.filter(r => r.ttdCompliant).length;

    const trimesters = (['Trimester I', 'Trimester II', 'Trimester III'] as const).map(tri => {
      const rows = maternalHealthRecords.filter(r => r.trimester === tri);
      const count = rows.length;
      const avgLila = count > 0 ? rows.reduce((s, r) => s + r.lilaCm, 0) / count : 0;
      const avgHb = count > 0 ? rows.reduce((s, r) => s + r.hemoglobinGdL, 0) / count : 0;
      return {
        trimester: tri,
        count,
        kek: rows.filter(r => r.isKek).length,
        anemia: rows.filter(r => r.anemiaStatus !== 'Normal').length,
        hypertension: rows.filter(r => r.bpStatus === 'Hipertensi / Risiko Preeklamsia').length,
        highRisk: rows.filter(r => r.riskLevel === 'Risiko Tinggi').length,
        ttdCompliant: rows.filter(r => r.ttdCompliant).length,
        avgLila,
        avgHb,
      };
    });

    const areaMap = new Map<
      string,
      {
        areaName: string;
        total: number;
        normal: number;
        mediumRisk: number;
        highRisk: number;
        kek: number;
        anemia: number;
        hypertension: number;
        ttdCompliant: number;
      }
    >();

    maternalHealthRecords.forEach(r => {
      const key = r.institutionName || r.villageOrPosyandu;
      const curr = areaMap.get(key) || {
        areaName: key,
        total: 0,
        normal: 0,
        mediumRisk: 0,
        highRisk: 0,
        kek: 0,
        anemia: 0,
        hypertension: 0,
        ttdCompliant: 0,
      };
      curr.total += 1;
      if (r.riskLevel === 'Normal / Risiko Rendah') curr.normal += 1;
      if (r.riskLevel === 'Risiko Sedang') curr.mediumRisk += 1;
      if (r.riskLevel === 'Risiko Tinggi') curr.highRisk += 1;
      if (r.isKek) curr.kek += 1;
      if (r.anemiaStatus !== 'Normal') curr.anemia += 1;
      if (r.bpStatus === 'Hipertensi / Risiko Preeklamsia') curr.hypertension += 1;
      if (r.ttdCompliant) curr.ttdCompliant += 1;
      areaMap.set(key, curr);
    });

    const areaSummary = Array.from(areaMap.values()).sort((a, b) => b.highRisk - a.highRisk || b.total - a.total);

    return {
      total,
      kekCount,
      anemiaCount,
      hypertensionCount,
      highRiskCount,
      mediumRiskCount,
      normalCount,
      ttdCount,
      trimesters,
      areaSummary,
    };
  }, [maternalHealthRecords]);

  // Filtered registry rows
  const filteredRecords = useMemo(() => {
    return maternalHealthRecords.filter(rec => {
      if (riskFilter !== 'ALL' && rec.riskLevel !== riskFilter) return false;
      if (trimesterFilter !== 'ALL' && rec.trimester !== trimesterFilter) return false;
      if (conditionFilter === 'KEK' && !rec.isKek) return false;
      if (conditionFilter === 'Anemia' && rec.anemiaStatus === 'Normal') return false;
      if (conditionFilter === 'Hipertensi' && rec.bpStatus !== 'Hipertensi / Risiko Preeklamsia') return false;
      return true;
    });
  }, [maternalHealthRecords, riskFilter, trimesterFilter, conditionFilter]);

  // Export Handlers for Registry & Recapitulation
  const handleExportRecapExcel = () => {
    const rows = summaryStats.areaSummary.map((a, idx) => ({
      No: idx + 1,
      'Posyandu / Lembaga / Wilayah': a.areaName,
      'Total Ibu Hamil': a.total,
      'Risiko Rendah (Normal)': a.normal,
      'Risiko Sedang': a.mediumRisk,
      'Risiko Tinggi': a.highRisk,
      'Kasus KEK (LILA <23,5)': a.kek,
      'Kasus Anemia (Hb <11)': a.anemia,
      'Hipertensi (>=140/90)': a.hypertension,
      'Rutin TTD': a.ttdCompliant,
    }));
    rows.push({
      No: summaryStats.areaSummary.length + 1,
      'Posyandu / Lembaga / Wilayah': 'TOTAL KESELURUHAN',
      'Total Ibu Hamil': summaryStats.total,
      'Risiko Rendah (Normal)': summaryStats.normalCount,
      'Risiko Sedang': summaryStats.mediumRiskCount,
      'Risiko Tinggi': summaryStats.highRiskCount,
      'Kasus KEK (LILA <23,5)': summaryStats.kekCount,
      'Kasus Anemia (Hb <11)': summaryStats.anemiaCount,
      'Hipertensi (>=140/90)': summaryStats.hypertensionCount,
      'Rutin TTD': summaryStats.ttdCount,
    });
    exportToExcel(rows, `Rekap_Kesehatan_Ibu_Hamil_${sppgConfig.sppgId}`, 'Rekap Posyandu');
    addToast('success', 'Ekspor Excel Rekap Berhasil', 'Rekapitulasi kesehatan ibu hamil diunduh.');
  };

  const handleExportRecapPDF = async () => {
    const headers = [
      'Posyandu / Wilayah',
      'Total Ibu',
      'Normal',
      'Risiko Sedang',
      'Risiko Tinggi',
      'KEK (<23,5)',
      'Anemia (<11)',
      'Hipertensi',
      'Rutin TTD',
    ];
    const rows: (string | number)[][] = [
      ...summaryStats.areaSummary.map(a => [
        a.areaName,
        a.total,
        a.normal,
        a.mediumRisk,
        a.highRisk,
        a.kek,
        a.anemia,
        a.hypertension,
        a.ttdCompliant,
      ]),
      [
        'TOTAL KESELURUHAN',
        summaryStats.total,
        summaryStats.normalCount,
        summaryStats.mediumRiskCount,
        summaryStats.highRiskCount,
        summaryStats.kekCount,
        summaryStats.anemiaCount,
        summaryStats.hypertensionCount,
        summaryStats.ttdCount,
      ],
    ];
    await exportTableToPDF({
      title: 'REKAPITULASI PEMERIKSAAN KESEHATAN IBU HAMIL (SASARAN 3B)',
      subtitle: 'Berdasarkan Posyandu / Wilayah Binaan • Standar Buku KIA Kemenkes & AKG MBG',
      headers,
      rows,
      fileName: `Rekap_Kesehatan_Ibu_Hamil_${sppgConfig.sppgId}`,
      sppgConfig,
      orientation: 'landscape',
      notes: 'Cut-off KEK: LILA < 23,5 cm | Anemia: Hb < 11,0 g/dL | Hipertensi: ≥ 140/90 mmHg.',
    });
    addToast('success', 'Ekspor PDF Rekap Berhasil', 'Dokumen PDF rekapitulasi ibu hamil siap dicetak.');
  };

  const handleExportRegistryExcel = () => {
    const rows = filteredRecords.map((r, idx) => ({
      No: idx + 1,
      NIK: r.nik,
      'Nama Ibu Hamil': r.fullName,
      'Usia (Th)': r.ageYears,
      Obstetri: r.obstetricCode,
      'Posyandu / Wilayah': r.institutionName,
      Alamat: r.villageOrPosyandu,
      'Tgl Periksa': r.measurementDate,
      HPHT: r.hphtDate || '-',
      'HPL (Perkiraan Lahir)': r.dueDateHpl || '-',
      Trimester: r.trimester,
      'Usia Kehamilan': `${r.gestationalWeeks} mgg ${r.gestationalDaysRemainder} hr`,
      'BB Pra-Hamil (kg)': r.prePregnancyWeightKg,
      'BB Kini (kg)': r.currentWeightKg,
      'Kenaikan BB (kg)': r.weightGainKg,
      'Status Kenaikan BB': r.weightGainStatus,
      'TB (cm)': r.heightCm,
      'LILA (cm)': r.lilaCm,
      'Status KEK': r.isKek ? 'KEK' : 'Normal',
      'Hb (g/dL)': r.hemoglobinGdL,
      'Status Anemia': r.anemiaStatus,
      'Tekanan Darah': `${r.systolicBp}/${r.diastolicBp}`,
      'Status TD': r.bpStatus,
      'Target Energi MBG (kkal)': r.recommendedKcal,
      'Target Protein MBG (g)': r.recommendedProteinG,
      'Tingkat Risiko': r.riskLevel,
      'Rekomendasi Klinis': r.recommendation,
    }));
    exportToExcel(rows, `Daftar_Cek_Kesehatan_Ibu_Hamil_${sppgConfig.sppgId}`, 'Data Ibu Hamil');
    addToast('success', 'Ekspor Excel Berhasil', `${rows.length} data ibu hamil diekspor ke Excel.`);
  };

  const handleExportRegistryPDF = async () => {
    const headers = [
      'NIK',
      'Nama Ibu',
      'Usia / GPA',
      'Posyandu / Wilayah',
      'Kehamilan',
      'LILA / KEK',
      'Hb / Anemia',
      'TD (mmHg)',
      'Target Gizi MBG',
      'Tingkat Risiko',
    ];
    const rows: (string | number)[][] = filteredRecords.map(r => [
      r.nik,
      r.fullName,
      `${r.ageYears}th / ${r.obstetricCode}`,
      r.institutionName,
      `${r.trimester} (${r.gestationalWeeks} mgg)`,
      `${r.lilaCm} cm (${r.isKek ? 'KEK' : 'Normal'})`,
      `${r.hemoglobinGdL} (${r.anemiaStatus})`,
      `${r.systolicBp}/${r.diastolicBp}`,
      `${r.recommendedKcal} kkal / ${r.recommendedProteinG}g`,
      r.riskLevel,
    ]);
    await exportTableToPDF({
      title: 'LAPORAN HASIL CEK KESEHATAN & GIZI IBU HAMIL (3B)',
      subtitle: `Total: ${filteredRecords.length} Ibu Hamil • Skrining KEK, Anemia, Hipertensi & Kebutuhan Gizi MBG`,
      headers,
      rows,
      fileName: `Laporan_Ibu_Hamil_${sppgConfig.sppgId}`,
      sppgConfig,
      orientation: 'landscape',
      notes: 'Mengacu pada Pedoman ANC Terpadu Kemenkes RI, Buku KIA, IOM Weight Gain & Permenkes AKG 2019.',
    });
    addToast('success', 'Ekspor PDF Berhasil', 'Laporan PDF pemeriksaan ibu hamil berhasil dibuat.');
  };

  const handleExportCSV = () => {
    const rows = filteredRecords.map(r => ({
      NIK: r.nik,
      Nama: r.fullName,
      Usia: r.ageYears,
      Obstetri: r.obstetricCode,
      Posyandu: r.institutionName,
      Trimester: r.trimester,
      UsiaKehamilanMinggu: r.gestationalWeeks,
      HPL: r.dueDateHpl || '',
      LILA_cm: r.lilaCm,
      Status_KEK: r.isKek ? 'KEK' : 'Normal',
      Hb_gdL: r.hemoglobinGdL,
      Status_Anemia: r.anemiaStatus,
      Tekanan_Darah: `${r.systolicBp}/${r.diastolicBp}`,
      Target_Kkal: r.recommendedKcal,
      Target_Protein_g: r.recommendedProteinG,
      Tingkat_Risiko: r.riskLevel,
    }));
    exportToCSV(rows, `Data_Kesehatan_Ibu_Hamil_${sppgConfig.sppgId}`);
    addToast('success', 'Ekspor CSV Berhasil', 'File CSV data kesehatan ibu hamil diunduh.');
  };

  const columns: Column<MaternalHealthRecord>[] = [
    {
      key: 'fullName',
      header: 'Identitas Ibu Hamil & NIK',
      sortable: true,
      render: r => (
        <div className="min-w-[190px]">
          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <span>{r.fullName}</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-mono font-bold">
              {r.obstetricCode}
            </span>
          </div>
          <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400">
            NIK: {r.nik}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Usia {r.ageYears} th • {r.villageOrPosyandu}
          </div>
        </div>
      ),
    },
    {
      key: 'institutionName',
      header: 'Posyandu / Wilayah',
      sortable: true,
      render: r => (
        <div className="min-w-[150px] text-xs">
          <div className="font-semibold text-slate-800 dark:text-slate-200">{r.institutionName}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Periksa: {formatIndonesianDate(r.measurementDate)}
          </div>
        </div>
      ),
    },
    {
      key: 'gestationalWeeks',
      header: 'Usia Kehamilan & HPL',
      sortable: true,
      render: r => (
        <div className="min-w-[140px] text-xs tabular-nums">
          <span className="inline-block px-2 py-0.5 rounded-md bg-blue-50 text-[#1E3A8A] dark:bg-sky-950/60 dark:text-sky-300 font-bold text-[11px]">
            {r.trimester}
          </span>
          <div className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-1">
            {r.gestationalWeeks} mgg {r.gestationalDaysRemainder} hr
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            HPL: {r.dueDateHpl ? formatIndonesianDate(r.dueDateHpl) : '-'}
          </div>
        </div>
      ),
    },
    {
      key: 'lilaCm',
      header: 'LILA & Pertambahan BB',
      sortable: true,
      render: r => (
        <div className="min-w-[150px] text-xs tabular-nums space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-bold text-slate-900 dark:text-white">
              LILA {r.lilaCm} cm
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                r.isKek
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              }`}
            >
              {r.isKek ? 'KEK' : 'Normal'}
            </span>
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400 font-mono">
            BB: {r.prePregnancyWeightKg} → {r.currentWeightKg} kg ({r.weightGainKg >= 0 ? `+${r.weightGainKg}` : r.weightGainKg} kg)
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">{r.weightGainStatus}</div>
        </div>
      ),
    },
    {
      key: 'hemoglobinGdL',
      header: 'Hb & Tekanan Darah',
      sortable: true,
      render: r => (
        <div className="min-w-[155px] text-xs tabular-nums space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-bold text-slate-900 dark:text-white">
              Hb {r.hemoglobinGdL} g/dL
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                r.anemiaStatus === 'Normal'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : r.anemiaStatus === 'Anemia Berat'
                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
              }`}
            >
              {r.anemiaStatus}
            </span>
          </div>
          <div className="text-[11px] font-mono text-slate-700 dark:text-slate-300">
            TD: <strong>{r.systolicBp}/{r.diastolicBp}</strong> mmHg
          </div>
          <div
            className={`text-[10px] font-semibold ${
              r.bpStatus === 'Hipertensi / Risiko Preeklamsia'
                ? 'text-rose-600 dark:text-rose-400'
                : r.bpStatus === 'Pra-Hipertensi / Waspada'
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {r.bpStatus}
          </div>
        </div>
      ),
    },
    {
      key: 'riskLevel',
      header: 'Risiko & Target Gizi MBG',
      sortable: true,
      render: r => (
        <div className="min-w-[180px] space-y-1">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-[11px] font-bold ${getRiskBadgeClasses(r.riskLevel)}`}>
            {r.riskLevel}
          </span>
          <div className="text-[11px] font-mono text-slate-700 dark:text-slate-300">
            MBG: <strong>{r.recommendedKcal} kkal</strong> • <strong>{r.recommendedProteinG}g</strong> prot
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">
            TTD: {r.ttdCompliant ? 'Rutin' : 'Belum Rutin'}
          </div>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      align: 'right',
      sortable: false,
      render: r => (
        <div className="flex items-center justify-end gap-1.5">
          {hasPermission('institutions', 'edit') && (
            <button
              type="button"
              onClick={() => handleOpenEdit(r)}
              title="Edit & Hitung Ulang"
              className="p-2 rounded-lg text-[#1E3A8A] hover:bg-blue-50 dark:text-sky-400 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <Edit className="w-4 h-4" />
            </button>
          )}
          {hasPermission('institutions', 'delete') && (
            <button
              type="button"
              onClick={() => setDeleteTarget(r)}
              title="Hapus Data"
              className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/50 transition cursor-pointer"
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
      {/* Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-[#0D9488] dark:text-teal-400 shrink-0 border border-teal-200/70 dark:border-teal-800">
            <Baby className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
              Kalkulator Cek Kesehatan Ibu Hamil (Sasaran 3B) & Rekapitulasi
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
              Skrining otomatis usia kehamilan (HPHT &amp; HPL), risiko KEK (LILA &lt; 23,5 cm), anemia (Hb &lt; 11,0 g/dL),
              hipertensi/preeklamsia, kenaikan BB IOM, serta kebutuhan energi &amp; protein MBG Permenkes RI.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsCalculatorOpen(prev => !prev)}
            className="min-h-[40px] inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold transition cursor-pointer"
          >
            <Calculator className="w-4 h-4 text-[#1E3A8A] dark:text-sky-400" />
            <span>{isCalculatorOpen ? 'Sembunyikan Kalkulator' : 'Tampilkan Kalkulator'}</span>
          </button>
          {hasPermission('institutions', 'create') && (
            <button
              type="button"
              onClick={() => {
                resetForm();
                setCalculatorMode('save');
                setIsCalculatorOpen(true);
              }}
              className="min-h-[40px] inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0D9488] hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Input Pemeriksaan Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between h-full">
          <div className="text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 flex items-center justify-between">
            <span>Total Ibu Hamil Terdata</span>
            <Baby className="w-4 h-4 text-[#1E3A8A] dark:text-sky-400" />
          </div>
          <div className="text-2xl font-black text-[#1E3A8A] dark:text-sky-400 mt-1 tabular-nums">
            {summaryStats.total} Ibu
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 font-mono">
            T1: {summaryStats.trimesters[0].count} • T2: {summaryStats.trimesters[1].count} • T3:{' '}
            {summaryStats.trimesters[2].count}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between h-full">
          <div className="text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 flex items-center justify-between">
            <span>Risiko KEK (LILA &lt; 23,5)</span>
            <AlertTriangle className="w-4 h-4 text-[#D97706]" />
          </div>
          <div className="text-2xl font-black text-[#D97706] mt-1 tabular-nums">
            {summaryStats.kekCount} Kasus
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
            {summaryStats.total > 0 ? Math.round((summaryStats.kekCount / summaryStats.total) * 100) : 0}% sasaran perlu PMT Pemulihan
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between h-full">
          <div className="text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 flex items-center justify-between">
            <span>Anemia (Hb &lt; 11,0 g/dL)</span>
            <Droplets className="w-4 h-4 text-[#E11D48]" />
          </div>
          <div className="text-2xl font-black text-[#E11D48] mt-1 tabular-nums">
            {summaryStats.anemiaCount} Kasus
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
            Kepatuhan TTD: {summaryStats.ttdCount}/{summaryStats.total} ibu
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between h-full">
          <div className="text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 flex items-center justify-between">
            <span>Risiko Tinggi / Hipertensi</span>
            <HeartPulse className="w-4 h-4 text-[#E11D48]" />
          </div>
          <div className="text-2xl font-black text-[#E11D48] mt-1 tabular-nums">
            {summaryStats.highRiskCount} Prioritas
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
            Hipertensi ≥140/90: {summaryStats.hypertensionCount} ibu
          </div>
        </div>
      </div>

      {/* Interactive Calculator & Entry Form */}
      {isCalculatorOpen && (
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden transition-all duration-200 ease-in-out"
        >
          {/* Calculator Top Bar */}
          <div className="px-4 sm:px-6 py-3.5 bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Stethoscope className="w-5 h-5 text-[#1E3A8A] dark:text-sky-400" />
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {editingId
                    ? `Edit Pemeriksaan Ibu Hamil: ${fullName}`
                    : 'Kalkulator Skrining Kesehatan & Status Gizi Ibu Hamil'}
                </h3>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Hasil kalkulasi diperbarui secara real-time saat angka klinis diubah.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setCalculatorMode('save')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  calculatorMode === 'save'
                    ? 'bg-[#1E3A8A] text-white dark:bg-sky-600'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Input &amp; Simpan Rekap
              </button>
              <button
                type="button"
                onClick={() => setCalculatorMode('simulate')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  calculatorMode === 'simulate'
                    ? 'bg-[#0D9488] text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Cek Cepat (Simulasi)
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Inputs (7 cols) */}
            <div className="lg:col-span-7 space-y-5">
              {calculatorMode === 'save' && (
                <div className="space-y-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                  <div className="text-xs font-extrabold uppercase tracking-wider text-[#1E3A8A] dark:text-sky-400">
                    A. Identitas Ibu Hamil &amp; Wilayah Sasaran
                  </div>

                  {/* NIK 16 Digit */}
                  <div>
                    <label
                      htmlFor="maternal-nik-input"
                      className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1"
                    >
                      NIK Kependudukan (16 Digit — Anti Duplikasi) <span className="text-rose-600">*</span>
                    </label>
                    <input
                      id="maternal-nik-input"
                      type="text"
                      inputMode="numeric"
                      maxLength={16}
                      value={nik}
                      onChange={e => setNik(normalizeNik(e.target.value))}
                      placeholder="Contoh: 3513145403980001"
                      className="w-full min-h-[42px] px-3.5 py-2 text-sm font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900"
                    />
                    {duplicateOwner ? (
                      <div
                        role="alert"
                        className="mt-2 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2"
                      >
                        <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                        <div>
                          <strong>Duplikasi NIK Terdeteksi:</strong> NIK sudah terdaftar atas nama{' '}
                          <strong>{duplicateOwner.fullName}</strong> ({duplicateOwner.institutionName}).
                        </div>
                      </div>
                    ) : nik.length > 0 && !nikValidation.valid ? (
                      <p className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                        {nikValidation.error}
                      </p>
                    ) : nikValidation.valid ? (
                      <p className="mt-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>NIK 16-digit valid &amp; unik.</span>
                      </p>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                        Nama Lengkap Ibu Hamil <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        required={calculatorMode === 'save'}
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        placeholder="Nama sesuai KTP / Buku KIA"
                        className="w-full min-h-[42px] px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                        No. HP / WhatsApp
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="0852xxxxxxxx"
                        className="w-full min-h-[42px] px-3 py-2 text-sm font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                        Posyandu / Lembaga Binaan 3B
                      </label>
                      <select
                        value={institutionId}
                        onChange={e => setInstitutionId(e.target.value)}
                        className="w-full min-h-[42px] px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                      >
                        <optgroup label="Posyandu & Sasaran 3B Wilayah">
                          {POSYANDU_PRESETS.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Lembaga Terdaftar SPPG">
                          {institutions.map(inst => (
                            <option key={inst.id} value={inst.id}>
                              {inst.name} ({inst.level})
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                        Alamat Dusun / RT-RW / Desa
                      </label>
                      <input
                        type="text"
                        value={villageOrPosyandu}
                        onChange={e => setVillageOrPosyandu(e.target.value)}
                        placeholder="Dusun Krajan RT 03/04, Temenggungan"
                        className="w-full min-h-[42px] px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Section B: Usia Ibu, Obstetri & Kehamilan */}
              <div className="space-y-4">
                <div className="text-xs font-extrabold uppercase tracking-wider text-[#1E3A8A] dark:text-sky-400">
                  {calculatorMode === 'save' ? 'B.' : 'A.'} Usia Ibu, Riwayat Kehamilan (HPHT / HPL) &amp; Tanggal Periksa
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      Usia Ibu (Tahun)
                    </label>
                    <input
                      type="number"
                      min={14}
                      max={55}
                      value={ageYears}
                      onChange={e => setAgeYears(Math.max(14, Math.min(55, Number(e.target.value) || 20)))}
                      className="w-full min-h-[42px] px-3 py-2 text-sm font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      Gravida (G)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={15}
                      value={gravida}
                      onChange={e => setGravida(Math.max(1, Number(e.target.value) || 1))}
                      className="w-full min-h-[42px] px-3 py-2 text-sm font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      Para (P)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={15}
                      value={para}
                      onChange={e => setPara(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full min-h-[42px] px-3 py-2 text-sm font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      Abortus (A)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      value={abortus}
                      onChange={e => setAbortus(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full min-h-[42px] px-3 py-2 text-sm font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      <Calendar className="w-3.5 h-3.5 text-[#0D9488]" />
                      <span>HPHT (Auto Hitung HPL)</span>
                    </label>
                    <input
                      type="date"
                      value={hphtDate}
                      onChange={e => handleHphtChange(e.target.value)}
                      className="w-full min-h-[42px] px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      Usia Kehamilan (Minggu, 1–42)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={42}
                      value={gestationalWeeks}
                      onChange={e => setGestationalWeeks(Math.max(1, Math.min(42, Number(e.target.value) || 1)))}
                      className="w-full min-h-[42px] px-3 py-2 text-sm font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      Tanggal Pemeriksaan
                    </label>
                    <input
                      type="date"
                      value={measurementDate}
                      onChange={e => handleMeasurementDateChange(e.target.value)}
                      className="w-full min-h-[42px] px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Section C: Antropometri & Parameter Klinis */}
              <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="text-xs font-extrabold uppercase tracking-wider text-[#0D9488] dark:text-teal-400">
                  {calculatorMode === 'save' ? 'C.' : 'B.'} Antropometri, LILA, Hemoglobin (Hb) &amp; Tekanan Darah
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      <Scale className="w-3.5 h-3.5 text-slate-500" />
                      <span>BB Pra-Hamil (kg)</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min={30}
                      max={150}
                      value={prePregnancyWeightKg}
                      onChange={e => setPrePregnancyWeightKg(Number(e.target.value) || 35)}
                      className="w-full min-h-[42px] px-3 py-2 text-sm font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      <Scale className="w-3.5 h-3.5 text-[#0D9488]" />
                      <span>BB Saat Ini (kg)</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min={30}
                      max={170}
                      value={currentWeightKg}
                      onChange={e => setCurrentWeightKg(Number(e.target.value) || 35)}
                      className="w-full min-h-[42px] px-3 py-2 text-sm font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      <Ruler className="w-3.5 h-3.5 text-[#0D9488]" />
                      <span>Tinggi Badan (cm)</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min={120}
                      max={200}
                      value={heightCm}
                      onChange={e => setHeightCm(Number(e.target.value) || 140)}
                      className="w-full min-h-[42px] px-3 py-2 text-sm font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      LILA (cm) <span className="text-[10px] text-slate-500">(&lt;23.5 KEK)</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min={14}
                      max={50}
                      value={lilaCm}
                      onChange={e => setLilaCm(Number(e.target.value) || 18)}
                      className="w-full min-h-[42px] px-3 py-2 text-sm font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      Hb (g/dL) <span className="text-[10px] text-slate-500">(&lt;11 Anemia)</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min={4}
                      max={18}
                      value={hemoglobinGdL}
                      onChange={e => setHemoglobinGdL(Number(e.target.value) || 8)}
                      className="w-full min-h-[42px] px-3 py-2 text-sm font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      TD Sistolik (mmHg)
                    </label>
                    <input
                      type="number"
                      min={70}
                      max={240}
                      value={systolicBp}
                      onChange={e => setSystolicBp(Number(e.target.value) || 110)}
                      className="w-full min-h-[42px] px-3 py-2 text-sm font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      TD Diastolik (mmHg)
                    </label>
                    <input
                      type="number"
                      min={40}
                      max={150}
                      value={diastolicBp}
                      onChange={e => setDiastolicBp(Number(e.target.value) || 70)}
                      className="w-full min-h-[42px] px-3 py-2 text-sm font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <label className="inline-flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ttdCompliant}
                    onChange={e => setTtdCompliant(e.target.checked)}
                    className="w-4 h-4 rounded accent-[#0D9488]"
                  />
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Ibu rutin mengonsumsi Tablet Tambah Darah (TTD) / Asam Folat harian
                  </span>
                </label>

                {calculatorMode === 'save' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      Catatan Kader / Bidan / Ahli Gizi
                    </label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Contoh: Jadwal kontrol ulang 2 minggu, alokasi paket MBG 3B + PMT pemulihan..."
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Live Diagnostic Output (5 cols) */}
            <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5 flex flex-col justify-between gap-4">
              <div className="space-y-3.5">
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-700">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Hasil Analisis Klinis Real-Time
                    </div>
                    <div className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">
                      {liveAssessment.trimester} • {liveAssessment.gestationalWeeks} mgg {gestationalDaysRemainder} hr
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                      HPL Perkiraan: {dueDateHpl ? formatIndonesianDate(dueDateHpl) : 'Hitung via HPHT'}
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1.5 rounded-xl border text-xs font-black shrink-0 ${getRiskBadgeClasses(
                      liveAssessment.riskLevel
                    )}`}
                  >
                    {liveAssessment.riskLevel}
                  </span>
                </div>

                {/* 4 Diagnostic Tiles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5 tabular-nums">
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        Status KEK (LILA Cut-off 23,5 cm)
                      </div>
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {liveAssessment.lilaCategory}
                      </div>
                    </div>
                    <div
                      className={`text-sm font-mono font-black ${
                        liveAssessment.isKek ? 'text-[#D97706]' : 'text-[#0D9488] dark:text-teal-400'
                      }`}
                    >
                      {liveAssessment.lilaCm} cm
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        Kadar Hemoglobin &amp; Status Anemia
                      </div>
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {liveAssessment.anemiaStatus}
                      </div>
                    </div>
                    <div
                      className={`text-sm font-mono font-black ${
                        liveAssessment.anemiaStatus === 'Normal'
                          ? 'text-[#0D9488] dark:text-teal-400'
                          : liveAssessment.anemiaStatus === 'Anemia Berat'
                          ? 'text-[#E11D48]'
                          : 'text-[#D97706]'
                      }`}
                    >
                      {liveAssessment.hemoglobinGdL} g/dL
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        Tekanan Darah &amp; Preeklamsia
                      </div>
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {liveAssessment.bpStatus}
                      </div>
                    </div>
                    <div
                      className={`text-sm font-mono font-black ${
                        liveAssessment.bpStatus === 'Hipertensi / Risiko Preeklamsia'
                          ? 'text-[#E11D48]'
                          : liveAssessment.bpStatus === 'Pra-Hipertensi / Waspada'
                          ? 'text-[#D97706]'
                          : 'text-[#0D9488] dark:text-teal-400'
                      }`}
                    >
                      {liveAssessment.systolicBp}/{liveAssessment.diastolicBp}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        IMT Awal {liveAssessment.prePregnancyBmi} ({liveAssessment.bmiCategory})
                      </div>
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {liveAssessment.weightGainStatus} • Target Total {liveAssessment.targetWeightGainRange}
                      </div>
                    </div>
                    <div className="text-sm font-mono font-black text-[#1E3A8A] dark:text-sky-400">
                      {liveAssessment.weightGainKg >= 0
                        ? `+${liveAssessment.weightGainKg}`
                        : liveAssessment.weightGainKg}{' '}
                      kg
                    </div>
                  </div>
                </div>

                {/* Target Gizi MBG 3B */}
                <div className="p-3.5 rounded-xl bg-blue-50/80 dark:bg-sky-950/40 border border-blue-200 dark:border-sky-800 space-y-1.5">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#1E3A8A] dark:text-sky-300">
                    Kebutuhan Gizi Harian Ibu Hamil (AKG Kemenkes + MBG)
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-0.5">
                    <div className="bg-white dark:bg-slate-900 rounded-lg p-2 border border-blue-100 dark:border-slate-700">
                      <div className="text-[10px] text-slate-500 font-bold">Energi Harian</div>
                      <div className="text-sm font-mono font-black text-[#1E3A8A] dark:text-sky-400">
                        {liveAssessment.recommendedKcal} kkal
                      </div>
                      <div className="text-[10px] text-slate-500">
                        +{liveAssessment.extraTrimesterKcal} {liveAssessment.trimester}
                        {liveAssessment.extraKekKcal > 0 ? ` +${liveAssessment.extraKekKcal} PMT` : ''}
                      </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-lg p-2 border border-blue-100 dark:border-slate-700">
                      <div className="text-[10px] text-slate-500 font-bold">Protein Harian</div>
                      <div className="text-sm font-mono font-black text-[#0D9488] dark:text-teal-400">
                        {liveAssessment.recommendedProteinG} g
                      </div>
                      <div className="text-[10px] text-slate-500">
                        +{liveAssessment.extraTrimesterProteinG}g {liveAssessment.trimester}
                        {liveAssessment.extraKekProteinG > 0 ? ` +${liveAssessment.extraKekProteinG}g PMT` : ''}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Risk Flags & Recommendation */}
                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2">
                  {liveAssessment.riskFlags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {liveAssessment.riskFlags.map(flag => (
                        <span
                          key={flag}
                          className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[10px] font-bold"
                        >
                          {flag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    <strong className="text-slate-900 dark:text-white">Rekomendasi Klinis &amp; MBG:</strong>{' '}
                    {liveAssessment.recommendation}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="min-h-[42px] inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{editingId ? 'Batal Edit' : 'Reset'}</span>
                </button>
                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    (calculatorMode === 'save' && (!nikValidation.valid || Boolean(duplicateOwner)))
                  }
                  className="min-h-[42px] flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#0D9488] hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-extrabold shadow-sm transition cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {calculatorMode === 'simulate'
                      ? 'Lanjut Simpan Hasil ke Rekapitulasi'
                      : isSubmitting
                      ? 'Menyimpan...'
                      : editingId
                      ? 'Simpan Perubahan Data'
                      : 'Simpan ke Rekapitulasi Ibu Hamil'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* REKAPITULASI KESEHATAN IBU HAMIL (PER TRIMESTER & POSYANDU / WILAYAH) */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-4 sm:p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <ClipboardList className="w-5 h-5 text-[#1E3A8A] dark:text-sky-400" />
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                Rekapitulasi Kesehatan Ibu Hamil (3B) per Trimester &amp; Posyandu
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Ringkasan sebaran kehamilan, prevalensi KEK, anemia, hipertensi, serta kepatuhan Tablet Tambah Darah.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportRecapExcel}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-[#0D9488] border border-emerald-200 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-300 transition cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Rekap Excel</span>
            </button>
            <button
              type="button"
              onClick={handleExportRecapPDF}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-rose-50 hover:bg-rose-100 text-[#E11D48] border border-rose-200 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-300 transition cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Rekap PDF</span>
            </button>
            <button
              type="button"
              onClick={triggerPrint}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200 transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak</span>
            </button>
          </div>
        </div>

        {/* Grid 2 Tables: Per Trimester & Per Posyandu */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          {/* Table 1: Rekap per Trimester */}
          <div className="xl:col-span-5 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 uppercase text-[11px] font-bold">
                <tr>
                  <th className="px-3 py-2.5">Trimester</th>
                  <th className="px-2.5 py-2.5 text-center">Jml</th>
                  <th className="px-2.5 py-2.5 text-center">KEK</th>
                  <th className="px-2.5 py-2.5 text-center">Anemia</th>
                  <th className="px-2.5 py-2.5 text-center">R.Tinggi</th>
                  <th className="px-2.5 py-2.5 text-right">Rerata LILA / Hb</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 tabular-nums">
                {summaryStats.trimesters.map(row => (
                  <tr key={row.trimester} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="px-3 py-2.5 font-bold text-[#1E3A8A] dark:text-sky-400">
                      {row.trimester}
                    </td>
                    <td className="px-2.5 py-2.5 text-center font-mono font-bold">{row.count}</td>
                    <td className="px-2.5 py-2.5 text-center font-mono font-bold text-[#D97706]">
                      {row.kek}
                    </td>
                    <td className="px-2.5 py-2.5 text-center font-mono font-bold text-[#E11D48]">
                      {row.anemia}
                    </td>
                    <td className="px-2.5 py-2.5 text-center font-mono font-bold text-[#E11D48]">
                      {row.highRisk}
                    </td>
                    <td className="px-2.5 py-2.5 text-right font-mono text-slate-700 dark:text-slate-300">
                      {row.count > 0 ? `${row.avgLila.toFixed(1)} cm / ${row.avgHb.toFixed(1)}` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table 2: Rekap per Posyandu / Wilayah */}
          <div className="xl:col-span-7 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 uppercase text-[11px] font-bold">
                <tr>
                  <th className="px-3 py-2.5">Posyandu / Lembaga Wilayah</th>
                  <th className="px-2.5 py-2.5 text-center">Total</th>
                  <th className="px-2.5 py-2.5 text-center">Normal</th>
                  <th className="px-2.5 py-2.5 text-center">Sedang</th>
                  <th className="px-2.5 py-2.5 text-center">Tinggi</th>
                  <th className="px-2.5 py-2.5 text-center">KEK</th>
                  <th className="px-2.5 py-2.5 text-center">Anemia</th>
                  <th className="px-2.5 py-2.5 text-center">TTD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 tabular-nums">
                {summaryStats.areaSummary.map(area => (
                  <tr key={area.areaName} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="px-3 py-2.5 font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#0D9488] shrink-0" />
                      <span>{area.areaName}</span>
                    </td>
                    <td className="px-2.5 py-2.5 text-center font-mono font-bold">{area.total}</td>
                    <td className="px-2.5 py-2.5 text-center font-mono font-bold text-[#0D9488]">
                      {area.normal}
                    </td>
                    <td className="px-2.5 py-2.5 text-center font-mono font-bold text-[#D97706]">
                      {area.mediumRisk}
                    </td>
                    <td className="px-2.5 py-2.5 text-center font-mono font-bold text-[#E11D48]">
                      {area.highRisk}
                    </td>
                    <td className="px-2.5 py-2.5 text-center font-mono text-[#D97706]">{area.kek}</td>
                    <td className="px-2.5 py-2.5 text-center font-mono text-[#E11D48]">{area.anemia}</td>
                    <td className="px-2.5 py-2.5 text-center font-mono text-slate-700 dark:text-slate-300">
                      {area.ttdCompliant}/{area.total}
                    </td>
                  </tr>
                ))}
                {summaryStats.areaSummary.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                      Belum ada data pemeriksaan ibu hamil.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* REGISTRI & FILTER PEMERIKSAAN IBU HAMIL */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 mr-1">
              <Filter className="w-3.5 h-3.5 text-[#0D9488]" />
              <span>Risiko:</span>
            </span>
            {(['ALL', 'Risiko Tinggi', 'Risiko Sedang', 'Normal / Risiko Rendah'] as const).map(lvl => (
              <button
                key={lvl}
                type="button"
                onClick={() => setRiskFilter(lvl)}
                className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  riskFilter === lvl
                    ? 'bg-[#1E3A8A] text-white dark:bg-sky-600'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200'
                }`}
              >
                {lvl === 'ALL' ? `Semua (${maternalHealthRecords.length})` : lvl}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filter Trimester"
              value={trimesterFilter}
              onChange={e => setTrimesterFilter(e.target.value)}
              className="min-h-[36px] px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
            >
              <option value="ALL">Semua Trimester</option>
              <option value="Trimester I">Trimester I (0–13 mgg)</option>
              <option value="Trimester II">Trimester II (14–27 mgg)</option>
              <option value="Trimester III">Trimester III (28–42 mgg)</option>
            </select>

            <select
              aria-label="Filter Kondisi Klinis"
              value={conditionFilter}
              onChange={e => setConditionFilter(e.target.value)}
              className="min-h-[36px] px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
            >
              <option value="ALL">Semua Kondisi Klinis</option>
              <option value="KEK">Hanya KEK (LILA &lt; 23,5 cm)</option>
              <option value="Anemia">Hanya Anemia (Hb &lt; 11,0 g/dL)</option>
              <option value="Hipertensi">Hanya Hipertensi (≥ 140/90)</option>
            </select>

            <button
              type="button"
              onClick={handleExportCSV}
              className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        <DataTable
          data={filteredRecords}
          columns={columns}
          keyExtractor={r => r.id}
          title="Registri & Riwayat Pemeriksaan Kesehatan Ibu Hamil (Sasaran 3B)"
          subtitle="Validasi NIK 16-digit anti-duplikasi • Data tersimpan persisten & siap ekspor laporan BGN/Puskesmas"
          searchPlaceholder="Cari nama ibu hamil, NIK 16 digit, Posyandu, atau status risiko..."
          searchKeys={['fullName', 'nik', 'institutionName', 'villageOrPosyandu', 'riskLevel', 'trimester']}
          onExportExcel={handleExportRegistryExcel}
          onExportPDF={handleExportRegistryPDF}
          onPrint={triggerPrint}
        />
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) {
            await deleteMaternalHealthRecord(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
        title="Hapus Data Pemeriksaan Ibu Hamil?"
        message={
          deleteTarget
            ? `Data pemeriksaan atas nama Ibu ${deleteTarget.fullName} (NIK: ${deleteTarget.nik}) akan dihapus permanen dari rekapitulasi.`
            : ''
        }
        confirmLabel="Ya, Hapus Data"
        isDestructive
      />
    </div>
  );
};
