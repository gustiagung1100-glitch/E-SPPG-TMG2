import React, { useMemo, useState } from 'react';
import { useApp } from '../../lib/store';
import { DataTable, Column } from '../common/DataTable';
import { ConfirmDialog } from '../common/ConfirmDialog';
import {
  calculateLactatingHealthAssessment,
  calculateLactationDuration,
} from '../../lib/lactatingHealth';
import { normalizeNik, validateNikFormat } from '../../lib/whoZScore';
import {
  exportTableToPDF,
  exportToCSV,
  exportToExcel,
  formatIndonesianDate,
  triggerPrint,
} from '../../lib/exportUtils';
import {
  BreastHealthStatus,
  LactatingHealthRecord,
  LactatingRiskLevel,
  LactationFeedingPattern,
} from '../../types';
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
  GlassWater,
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

const getRiskBadgeClasses = (level: LactatingRiskLevel): string => {
  switch (level) {
    case 'Normal / Risiko Rendah':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800';
    case 'Risiko Sedang':
      return 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800';
    case 'Risiko Tinggi':
      return 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800';
  }
};

export const LactatingHealthTab: React.FC = () => {
  const {
    institutions,
    lactatingHealthRecords,
    checkDuplicateLactatingNik,
    addLactatingHealthRecord,
    updateLactatingHealthRecord,
    deleteLactatingHealthRecord,
    hasPermission,
    sppgConfig,
    addToast,
  } = useApp();

  const [isCalculatorOpen, setIsCalculatorOpen] = useState<boolean>(true);
  const [calculatorMode, setCalculatorMode] = useState<'save' | 'simulate'>('save');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LactatingHealthRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Filters for registry table
  const [riskFilter, setRiskFilter] = useState<string>('ALL');
  const [phaseFilter, setPhaseFilter] = useState<string>('ALL');
  const [conditionFilter, setConditionFilter] = useState<string>('ALL');

  // Form / Calculator Inputs
  const [nik, setNik] = useState('');
  const [fullName, setFullName] = useState('');
  const [ageYears, setAgeYears] = useState<number>(27);
  const [phone, setPhone] = useState('');
  const [institutionId, setInstitutionId] = useState<string>('posyandu-temenggungan');
  const [villageOrPosyandu, setVillageOrPosyandu] = useState('Dusun Krajan, Desa Temenggungan');
  const [babyName, setBabyName] = useState('By. Azzam Putra');

  const [measurementDate, setMeasurementDate] = useState<string>('2026-11-08');
  const [deliveryDate, setDeliveryDate] = useState<string>('2026-08-20');

  const [feedingPattern, setFeedingPattern] = useState<LactationFeedingPattern>('ASI Eksklusif');
  const [breastStatus, setBreastStatus] = useState<BreastHealthStatus>('Normal & ASI Lancar');

  const [weightKg, setWeightKg] = useState<number>(54.0);
  const [heightCm, setHeightCm] = useState<number>(156.0);
  const [lilaCm, setLilaCm] = useState<number>(25.0);
  const [hemoglobinGdL, setHemoglobinGdL] = useState<number>(12.4);
  const [systolicBp, setSystolicBp] = useState<number>(115);
  const [diastolicBp, setDiastolicBp] = useState<number>(75);
  const [fluidIntakeMl, setFluidIntakeMl] = useState<number>(3000);
  const [vitaminAPostpartum, setVitaminAPostpartum] = useState<boolean>(true);
  const [ttdOrMultivitaminCompliant, setTtdOrMultivitaminCompliant] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('');

  const resetForm = () => {
    setEditingId(null);
    setNik('');
    setFullName('');
    setAgeYears(27);
    setPhone('');
    setInstitutionId('posyandu-temenggungan');
    setVillageOrPosyandu('Dusun Krajan, Desa Temenggungan');
    setBabyName('By. Azzam Putra');
    setMeasurementDate('2026-11-08');
    setDeliveryDate('2026-08-20');
    setFeedingPattern('ASI Eksklusif');
    setBreastStatus('Normal & ASI Lancar');
    setWeightKg(54.0);
    setHeightCm(156.0);
    setLilaCm(25.0);
    setHemoglobinGdL(12.4);
    setSystolicBp(115);
    setDiastolicBp(75);
    setFluidIntakeMl(3000);
    setVitaminAPostpartum(true);
    setTtdOrMultivitaminCompliant(true);
    setNotes('');
  };

  const handleOpenEdit = (rec: LactatingHealthRecord) => {
    setEditingId(rec.id);
    setCalculatorMode('save');
    setNik(rec.nik);
    setFullName(rec.fullName);
    setAgeYears(rec.ageYears);
    setPhone(rec.phone || '');
    setInstitutionId(rec.institutionId);
    setVillageOrPosyandu(rec.villageOrPosyandu);
    setBabyName(rec.babyName);
    setMeasurementDate(rec.measurementDate);
    setDeliveryDate(rec.deliveryDate);
    setFeedingPattern(rec.feedingPattern);
    setBreastStatus(rec.breastStatus);
    setWeightKg(rec.weightKg);
    setHeightCm(rec.heightCm);
    setLilaCm(rec.lilaCm);
    setHemoglobinGdL(rec.hemoglobinGdL);
    setSystolicBp(rec.systolicBp);
    setDiastolicBp(rec.diastolicBp);
    setFluidIntakeMl(rec.fluidIntakeMl);
    setVitaminAPostpartum(rec.vitaminAPostpartum);
    setTtdOrMultivitaminCompliant(rec.ttdOrMultivitaminCompliant);
    setNotes(rec.notes || '');
    setIsCalculatorOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const durationInfo = useMemo(
    () => calculateLactationDuration(deliveryDate, measurementDate),
    [deliveryDate, measurementDate]
  );

  // Real-time clinical calculation
  const liveAssessment = useMemo(() => {
    return calculateLactatingHealthAssessment({
      ageYears,
      deliveryDate,
      measurementDate,
      weightKg,
      heightCm,
      lilaCm,
      hemoglobinGdL,
      systolicBp,
      diastolicBp,
      feedingPattern,
      breastStatus,
      fluidIntakeMl,
      vitaminAPostpartum,
      ttdOrMultivitaminCompliant,
    });
  }, [
    ageYears,
    deliveryDate,
    measurementDate,
    weightKg,
    heightCm,
    lilaCm,
    hemoglobinGdL,
    systolicBp,
    diastolicBp,
    feedingPattern,
    breastStatus,
    fluidIntakeMl,
    vitaminAPostpartum,
    ttdOrMultivitaminCompliant,
  ]);

  const nikValidation = useMemo(() => validateNikFormat(nik), [nik]);
  const duplicateOwner = useMemo(() => {
    if (!nikValidation.cleanNik || nikValidation.cleanNik.length < 16) return undefined;
    return checkDuplicateLactatingNik(nikValidation.cleanNik, editingId || undefined);
  }, [nikValidation.cleanNik, checkDuplicateLactatingNik, editingId]);

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
      addToast('info', 'Mode Simpan Aktif', 'Lengkapi NIK & Nama Ibu Menyusui untuk menyimpan hasil ke Rekapitulasi.');
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
      addToast('error', 'Nama Wajib Diisi', 'Masukkan nama lengkap ibu menyusui.');
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
        babyName: babyName.trim() || 'By. Balita',
        deliveryDate,
        feedingPattern,
        breastStatus,
        weightKg,
        heightCm,
        lilaCm,
        hemoglobinGdL,
        systolicBp,
        diastolicBp,
        fluidIntakeMl,
        vitaminAPostpartum,
        ttdOrMultivitaminCompliant,
        measurementDate,
        notes,
      };

      const res = editingId
        ? await updateLactatingHealthRecord(editingId, payload)
        : await addLactatingHealthRecord(payload);

      if (res.ok) {
        resetForm();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Summary & Recapitulation Metrics
  const summaryStats = useMemo(() => {
    const total = lactatingHealthRecords.length;
    const kekCount = lactatingHealthRecords.filter(r => r.isKek).length;
    const anemiaCount = lactatingHealthRecords.filter(r => r.anemiaStatus !== 'Normal').length;
    const hypertensionCount = lactatingHealthRecords.filter(
      r => r.bpStatus === 'Hipertensi Pasca Persalinan'
    ).length;
    const lactationIssueCount = lactatingHealthRecords.filter(
      r => r.breastStatus !== 'Normal & ASI Lancar' || r.feedingPattern === 'Kesulitan Menyusui'
    ).length;
    const lowHydrationCount = lactatingHealthRecords.filter(r => r.isHydrationLow).length;
    const highRiskCount = lactatingHealthRecords.filter(r => r.riskLevel === 'Risiko Tinggi').length;
    const mediumRiskCount = lactatingHealthRecords.filter(r => r.riskLevel === 'Risiko Sedang').length;
    const normalCount = lactatingHealthRecords.filter(r => r.riskLevel === 'Normal / Risiko Rendah').length;
    const vitACount = lactatingHealthRecords.filter(r => r.vitaminAPostpartum).length;
    const exclusiveAsiCount = lactatingHealthRecords.filter(
      r => r.lactationPhase === '0–6 Bulan (ASI Eksklusif)' && r.feedingPattern === 'ASI Eksklusif'
    ).length;
    const zeroToSixTotal = lactatingHealthRecords.filter(
      r => r.lactationPhase === '0–6 Bulan (ASI Eksklusif)'
    ).length;

    const phases = (
      [
        '0–6 Bulan (ASI Eksklusif)',
        '> 6–12 Bulan (ASI + MP-ASI)',
        '> 12–24 Bulan (ASI Lanjutan)',
      ] as const
    ).map(phase => {
      const rows = lactatingHealthRecords.filter(r => r.lactationPhase === phase);
      const count = rows.length;
      const avgLila = count > 0 ? rows.reduce((s, r) => s + r.lilaCm, 0) / count : 0;
      const avgHb = count > 0 ? rows.reduce((s, r) => s + r.hemoglobinGdL, 0) / count : 0;
      const avgFluid = count > 0 ? Math.round(rows.reduce((s, r) => s + r.fluidIntakeMl, 0) / count) : 0;
      return {
        phase,
        count,
        kek: rows.filter(r => r.isKek).length,
        anemia: rows.filter(r => r.anemiaStatus !== 'Normal').length,
        lactationIssue: rows.filter(r => r.breastStatus !== 'Normal & ASI Lancar').length,
        highRisk: rows.filter(r => r.riskLevel === 'Risiko Tinggi').length,
        avgLila,
        avgHb,
        avgFluid,
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
        lactationIssue: number;
        lowHydration: number;
        vitACompliant: number;
      }
    >();

    lactatingHealthRecords.forEach(r => {
      const key = r.institutionName || r.villageOrPosyandu;
      const curr = areaMap.get(key) || {
        areaName: key,
        total: 0,
        normal: 0,
        mediumRisk: 0,
        highRisk: 0,
        kek: 0,
        anemia: 0,
        lactationIssue: 0,
        lowHydration: 0,
        vitACompliant: 0,
      };
      curr.total += 1;
      if (r.riskLevel === 'Normal / Risiko Rendah') curr.normal += 1;
      if (r.riskLevel === 'Risiko Sedang') curr.mediumRisk += 1;
      if (r.riskLevel === 'Risiko Tinggi') curr.highRisk += 1;
      if (r.isKek) curr.kek += 1;
      if (r.anemiaStatus !== 'Normal') curr.anemia += 1;
      if (r.breastStatus !== 'Normal & ASI Lancar') curr.lactationIssue += 1;
      if (r.isHydrationLow) curr.lowHydration += 1;
      if (r.vitaminAPostpartum) curr.vitACompliant += 1;
      areaMap.set(key, curr);
    });

    const areaSummary = Array.from(areaMap.values()).sort((a, b) => b.highRisk - a.highRisk || b.total - a.total);

    return {
      total,
      kekCount,
      anemiaCount,
      hypertensionCount,
      lactationIssueCount,
      lowHydrationCount,
      highRiskCount,
      mediumRiskCount,
      normalCount,
      vitACount,
      exclusiveAsiCount,
      zeroToSixTotal,
      phases,
      areaSummary,
    };
  }, [lactatingHealthRecords]);

  // Filtered registry rows
  const filteredRecords = useMemo(() => {
    return lactatingHealthRecords.filter(rec => {
      if (riskFilter !== 'ALL' && rec.riskLevel !== riskFilter) return false;
      if (phaseFilter !== 'ALL' && rec.lactationPhase !== phaseFilter) return false;
      if (conditionFilter === 'KEK' && !rec.isKek) return false;
      if (conditionFilter === 'Anemia' && rec.anemiaStatus === 'Normal') return false;
      if (conditionFilter === 'Hipertensi' && rec.bpStatus !== 'Hipertensi Pasca Persalinan') return false;
      if (conditionFilter === 'GangguanASI' && rec.breastStatus === 'Normal & ASI Lancar') return false;
      if (conditionFilter === 'HidrasiKurang' && !rec.isHydrationLow) return false;
      return true;
    });
  }, [lactatingHealthRecords, riskFilter, phaseFilter, conditionFilter]);

  // Export Handlers for Recapitulation
  const handleExportRecapExcel = () => {
    const rows = summaryStats.areaSummary.map((a, idx) => ({
      No: idx + 1,
      'Posyandu / Lembaga / Wilayah': a.areaName,
      'Total Ibu Menyusui': a.total,
      'Risiko Rendah (Normal)': a.normal,
      'Risiko Sedang': a.mediumRisk,
      'Risiko Tinggi': a.highRisk,
      'Kasus KEK (LILA <23,5)': a.kek,
      'Kasus Anemia (Hb <12)': a.anemia,
      'Kendala Payudara / ASI': a.lactationIssue,
      'Hidrasi Kurang': a.lowHydration,
      'Kapsul Vit. A Nifas': a.vitACompliant,
    }));
    rows.push({
      No: summaryStats.areaSummary.length + 1,
      'Posyandu / Lembaga / Wilayah': 'TOTAL KESELURUHAN',
      'Total Ibu Menyusui': summaryStats.total,
      'Risiko Rendah (Normal)': summaryStats.normalCount,
      'Risiko Sedang': summaryStats.mediumRiskCount,
      'Risiko Tinggi': summaryStats.highRiskCount,
      'Kasus KEK (LILA <23,5)': summaryStats.kekCount,
      'Kasus Anemia (Hb <12)': summaryStats.anemiaCount,
      'Kendala Payudara / ASI': summaryStats.lactationIssueCount,
      'Hidrasi Kurang': summaryStats.lowHydrationCount,
      'Kapsul Vit. A Nifas': summaryStats.vitACount,
    });
    exportToExcel(rows, 'Rekapitulasi-Kesehatan-Ibu-Menyusui-3B', 'Rekap Ibu Menyusui');
  };

  const handleExportRecapPDF = async () => {
    await exportTableToPDF({
      title: 'REKAPITULASI KESEHATAN & GIZI IBU MENYUSUI (SASARAN 3B)',
      subtitle: `${sppgConfig.sppgName} • Kecamatan Krejengan • Antropometri, Laktasi, Hb & Hidrasi`,
      headers: [
        'No',
        'Posyandu / Wilayah',
        'Total',
        'Normal',
        'Sedang',
        'Tinggi',
        'KEK',
        'Anemia',
        'Kendala ASI',
        'Vit. A Nifas',
      ],
      rows: [
        ...summaryStats.areaSummary.map((a, idx) => [
          idx + 1,
          a.areaName,
          a.total,
          a.normal,
          a.mediumRisk,
          a.highRisk,
          a.kek,
          a.anemia,
          a.lactationIssue,
          `${a.vitACompliant}/${a.total}`,
        ]),
        [
          '-',
          'TOTAL KESELURUHAN',
          summaryStats.total,
          summaryStats.normalCount,
          summaryStats.mediumRiskCount,
          summaryStats.highRiskCount,
          summaryStats.kekCount,
          summaryStats.anemiaCount,
          summaryStats.lactationIssueCount,
          `${summaryStats.vitACount}/${summaryStats.total}`,
        ],
      ],
      fileName: `Rekapitulasi_Kesehatan_Ibu_Menyusui_${sppgConfig.sppgId}`,
      sppgConfig,
      orientation: 'landscape',
      notes: 'Cut-off KEK: LILA < 23,5 cm | Anemia Busui: Hb < 12,0 g/dL | Hipertensi: >= 140/90 mmHg.',
    });
    addToast('success', 'Ekspor PDF Rekap Berhasil', 'Dokumen PDF rekapitulasi ibu menyusui siap dicetak.');
  };

  const handleExportRegistryExcel = () => {
    exportToExcel(
      filteredRecords.map((r, idx) => ({
        No: idx + 1,
        NIK: r.nik,
        'Nama Ibu Menyusui': r.fullName,
        'Usia (Th)': r.ageYears,
        'Nama Bayi': r.babyName,
        'Tanggal Melahirkan': r.deliveryDate,
        'Usia Bayi': `${r.babyAgeMonths} bln (${r.babyAgeDays} hr)`,
        'Fase Laktasi': r.lactationPhase,
        'Pola Menyusui': r.feedingPattern,
        'Kondisi Payudara / ASI': r.breastStatus,
        'Posyandu / Wilayah': r.institutionName,
        'Alamat / Dusun': r.villageOrPosyandu,
        'BB Ibu (kg)': r.weightKg,
        'TB Ibu (cm)': r.heightCm,
        'IMT (kg/m2)': r.bmi,
        'Kategori IMT': r.bmiCategory,
        'LILA (cm)': r.lilaCm,
        'Status KEK': r.lilaCategory,
        'Hb (g/dL)': r.hemoglobinGdL,
        'Status Anemia': r.anemiaStatus,
        'Tekanan Darah': `${r.systolicBp}/${r.diastolicBp} mmHg`,
        'Status TD': r.bpStatus,
        'Cairan (mL/hr)': `${r.fluidIntakeMl} / ${r.targetFluidMl}`,
        'Kapsul Vit A Nifas': r.vitaminAPostpartum ? 'Sudah' : 'Belum',
        'Rutin TTD/Multivitamin': r.ttdOrMultivitaminCompliant ? 'Ya' : 'Tidak',
        'Target Energi MBG (kkal)': r.recommendedKcal,
        'Target Protein MBG (g)': r.recommendedProteinG,
        'Tingkat Risiko': r.riskLevel,
        'Rekomendasi Klinis': r.recommendation,
        'Tgl Periksa': r.measurementDate,
      })),
      'Data-Pemeriksaan-Ibu-Menyusui-3B',
      'Registri Ibu Menyusui'
    );
  };

  const handleExportRegistryPDF = async () => {
    await exportTableToPDF({
      title: 'LAPORAN HASIL CEK KESEHATAN IBU MENYUSUI (SASARAN 3B)',
      subtitle: `${sppgConfig.sppgName} • Standar Kemenkes RI, Permenkes AKG 2019 & Panduan Laktasi`,
      headers: [
        'NIK',
        'Nama Ibu & Bayi',
        'Fase Laktasi',
        'LILA / IMT',
        'Hb & TD',
        'Payudara & Cairan',
        'Risiko & Target MBG',
      ],
      rows: filteredRecords.map(r => [
        r.nik,
        `${r.fullName} (${r.ageYears} th) • ${r.babyName}`,
        `${r.lactationPhase} (${r.babyAgeMonths} bln)`,
        `LILA ${r.lilaCm} cm (${r.isKek ? 'KEK' : 'Normal'}) • IMT ${r.bmi}`,
        `Hb ${r.hemoglobinGdL} (${r.anemiaStatus}) • ${r.systolicBp}/${r.diastolicBp}`,
        `${r.breastStatus} • ${r.fluidIntakeMl} mL/hr`,
        `${r.riskLevel} (${r.recommendedKcal} kkal / ${r.recommendedProteinG}g prot)`,
      ]),
      fileName: `Laporan_Kesehatan_Ibu_Menyusui_${sppgConfig.sppgId}`,
      sppgConfig,
      orientation: 'landscape',
      notes: 'Target Tambahan AKG Menyusui: +330 kkal/+20g prot (0-6 bln), +400 kkal/+15g prot (>6-24 bln), +500 kkal/+15g prot jika KEK.',
    });
    addToast('success', 'Ekspor PDF Registri Berhasil', 'Dokumen PDF daftar ibu menyusui siap dicetak.');
  };

  const handleExportCSV = () => {
    exportToCSV(
      filteredRecords.map(r => ({
        nik: r.nik,
        nama_ibu: r.fullName,
        usia_tahun: r.ageYears,
        nama_bayi: r.babyName,
        posyandu: r.institutionName,
        fase_laktasi: r.lactationPhase,
        usia_bayi_bulan: r.babyAgeMonths,
        pola_menyusui: r.feedingPattern,
        status_payudara_asi: r.breastStatus,
        lila_cm: r.lilaCm,
        status_kek: r.lilaCategory,
        hb_gdl: r.hemoglobinGdL,
        status_anemia: r.anemiaStatus,
        tekanan_darah: `${r.systolicBp}/${r.diastolicBp}`,
        cairan_ml: r.fluidIntakeMl,
        target_energi_kkal: r.recommendedKcal,
        target_protein_g: r.recommendedProteinG,
        tingkat_risiko: r.riskLevel,
      })),
      'Data-Kesehatan-Ibu-Menyusui'
    );
  };

  const columns: Column<LactatingHealthRecord>[] = [
    {
      key: 'fullName',
      header: 'Ibu Menyusui & Bayi',
      sortable: true,
      render: r => (
        <div className="min-w-[195px]">
          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <span>{r.fullName}</span>
            <span className="px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-950/60 text-[#0D9488] dark:text-teal-300 text-[10px] font-bold">
              {r.ageYears} th
            </span>
          </div>
          <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400">
            NIK: {r.nik}
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400">
            Bayi: <strong>{r.babyName}</strong> • {r.villageOrPosyandu}
          </div>
        </div>
      ),
    },
    {
      key: 'institutionName',
      header: 'Posyandu / Periksa',
      sortable: true,
      render: r => (
        <div className="min-w-[150px] text-xs">
          <div className="font-semibold text-slate-800 dark:text-slate-200">{r.institutionName}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Periksa: {formatIndonesianDate(r.measurementDate)}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">
            Lahir: {formatIndonesianDate(r.deliveryDate)}
          </div>
        </div>
      ),
    },
    {
      key: 'babyAgeMonths',
      header: 'Fase Laktasi & ASI',
      sortable: true,
      render: r => (
        <div className="min-w-[165px] text-xs tabular-nums space-y-1">
          <span className="inline-block px-2 py-0.5 rounded-md bg-blue-50 text-[#1E3A8A] dark:bg-sky-950/60 dark:text-sky-300 font-bold text-[11px]">
            {r.lactationPhase}
          </span>
          <div className="font-mono font-bold text-slate-800 dark:text-slate-200">
            Usia Bayi: {r.babyAgeMonths} bln ({r.lactationWeeks} mgg)
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400">
            Pola: <strong>{r.feedingPattern}</strong>
          </div>
        </div>
      ),
    },
    {
      key: 'lilaCm',
      header: 'Antropometri & Payudara',
      sortable: true,
      render: r => (
        <div className="min-w-[165px] text-xs tabular-nums space-y-0.5">
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
            BB {r.weightKg} kg • IMT {r.bmi} ({r.bmiCategory.split(' ')[0]})
          </div>
          <div
            className={`text-[10px] font-semibold ${
              r.breastStatus === 'Mastitis / Puting Lecet'
                ? 'text-rose-600 dark:text-rose-400'
                : r.breastStatus !== 'Normal & ASI Lancar'
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-emerald-700 dark:text-emerald-400'
            }`}
          >
            {r.breastStatus}
          </div>
        </div>
      ),
    },
    {
      key: 'hemoglobinGdL',
      header: 'Hb, TD & Hidrasi',
      sortable: true,
      render: r => (
        <div className="min-w-[160px] text-xs tabular-nums space-y-0.5">
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
            className={`text-[10px] font-mono font-semibold ${
              r.isHydrationLow
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Cairan: {r.fluidIntakeMl} / {r.targetFluidMl} mL
          </div>
        </div>
      ),
    },
    {
      key: 'riskLevel',
      header: 'Risiko & Target Gizi MBG',
      sortable: true,
      render: r => (
        <div className="min-w-[185px] space-y-1">
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-[11px] font-bold ${getRiskBadgeClasses(
              r.riskLevel
            )}`}
          >
            {r.riskLevel}
          </span>
          <div className="text-[11px] font-mono text-slate-700 dark:text-slate-300">
            MBG: <strong>{r.recommendedKcal} kkal</strong> • <strong>{r.recommendedProteinG}g</strong> prot
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">
            Vit.A Nifas: {r.vitaminAPostpartum ? 'Sudah' : 'Belum'} • TTD: {r.ttdOrMultivitaminCompliant ? 'Rutin' : 'Belum'}
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
            <HeartPulse className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
              Kalkulator Cek Otomatis Kesehatan Ibu Menyusui (Sasaran 3B) &amp; Rekapitulasi
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
              Skrining otomatis fase laktasi (0–6 bln, 6–12 bln, 12–24 bln), risiko KEK (LILA &lt; 23,5 cm),
              anemia ibu menyusui (Hb &lt; 12,0 g/dL), hipertensi pasca persalinan, kelancaran ASI/payudara,
              kecukupan cairan, serta kebutuhan AKG energi &amp; protein MBG 3B (Permenkes RI No. 28/2019).
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
              <span>Input Cek Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="text-[11px] text-slate-600 dark:text-slate-400 uppercase font-bold flex items-center justify-between">
            <span>Total Ibu Menyusui</span>
            <Baby className="w-4 h-4 text-[#1E3A8A] dark:text-sky-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">
            {summaryStats.total} <span className="text-sm font-semibold text-slate-500">Ibu 3B</span>
          </div>
          <div className="text-[11px] text-[#0D9488] dark:text-teal-400 font-semibold mt-0.5">
            {summaryStats.exclusiveAsiCount}/{summaryStats.zeroToSixTotal} ASI Eksklusif (0–6 bln)
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="text-[11px] text-slate-600 dark:text-slate-400 uppercase font-bold flex items-center justify-between">
            <span>Kasus KEK &amp; Kendala ASI</span>
            <AlertTriangle className="w-4 h-4 text-[#D97706]" />
          </div>
          <div className="text-2xl font-black text-[#D97706] mt-1 tabular-nums">
            {summaryStats.kekCount} KEK • {summaryStats.lactationIssueCount} ASI
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
            LILA &lt; 23,5 cm / ASI kurang &amp; bengkak
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="text-[11px] text-slate-600 dark:text-slate-400 uppercase font-bold flex items-center justify-between">
            <span>Anemia &amp; Hidrasi Kurang</span>
            <Droplets className="w-4 h-4 text-[#E11D48]" />
          </div>
          <div className="text-2xl font-black text-[#E11D48] mt-1 tabular-nums">
            {summaryStats.anemiaCount} Hb • {summaryStats.lowHydrationCount} Cairan
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
            Hb &lt; 12,0 g/dL / asupan cairan di bawah target
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="text-[11px] text-slate-600 dark:text-slate-400 uppercase font-bold flex items-center justify-between">
            <span>Risiko Tinggi (Intervensi)</span>
            <ShieldAlert className="w-4 h-4 text-[#E11D48]" />
          </div>
          <div className="text-2xl font-black text-[#E11D48] mt-1 tabular-nums">
            {summaryStats.highRiskCount}{' '}
            <span className="text-sm font-semibold text-slate-500">
              ({summaryStats.mediumRiskCount} Sedang)
            </span>
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
            {summaryStats.hypertensionCount} Hipertensi nifas • {summaryStats.vitACount}/{summaryStats.total} Vit. A
          </div>
        </div>
      </div>

      {/* Interactive Calculator & Input Form */}
      {isCalculatorOpen && (
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden"
        >
          {/* Mode Switch Header */}
          <div className="px-4 sm:px-6 py-3.5 bg-slate-50/90 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-[#0D9488]" />
              <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                {editingId
                  ? 'Mode Edit & Hitung Ulang Data Ibu Menyusui'
                  : calculatorMode === 'simulate'
                  ? 'Simulasi Cek Cepat Klinis Ibu Menyusui (Tanpa Simpan)'
                  : 'Input Pemeriksaan Ibu Menyusui & Cek Otomatis'}
              </span>
            </div>

            {!editingId && (
              <div className="inline-flex rounded-lg p-1 bg-slate-200/80 dark:bg-slate-900 border border-slate-300/60 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setCalculatorMode('save')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                    calculatorMode === 'save'
                      ? 'bg-[#1E3A8A] text-white shadow-sm'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-800'
                  }`}
                >
                  Input &amp; Simpan Rekap
                </button>
                <button
                  type="button"
                  onClick={() => setCalculatorMode('simulate')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                    calculatorMode === 'simulate'
                      ? 'bg-[#0D9488] text-white shadow-sm'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-800'
                  }`}
                >
                  Cek Cepat (Simulasi)
                </button>
              </div>
            )}
          </div>

          <div className="p-4 sm:p-6 grid grid-cols-1 xl:grid-cols-12 gap-6">
            {/* LEFT PANEL: INPUT FIELDS */}
            <div className="xl:col-span-7 space-y-5">
              {/* Section 1: Identity (Save mode) */}
              {calculatorMode === 'save' && (
                <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700 space-y-3.5">
                  <div className="text-xs font-extrabold text-[#1E3A8A] dark:text-sky-400 uppercase tracking-wide flex items-center justify-between">
                    <span>1. Identitas Ibu Menyusui &amp; Bayi (Anti-Duplikasi NIK)</span>
                    <span className="text-[10px] font-mono text-slate-500">16 Digit NIK</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        NIK Ibu (16 Digit) *
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={16}
                        value={nik}
                        onChange={e => setNik(normalizeNik(e.target.value))}
                        placeholder="Contoh: 3513155204980001"
                        className="w-full min-h-[38px] px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0D9488] outline-none"
                      />
                      {nik.length > 0 && !nikValidation.valid && (
                        <p className="text-[11px] text-rose-600 font-semibold mt-1">{nikValidation.error}</p>
                      )}
                      {duplicateOwner && (
                        <p className="text-[11px] text-rose-600 font-bold mt-1">
                          NIK sudah terdaftar a/n {duplicateOwner.fullName} ({duplicateOwner.institutionName})!
                        </p>
                      )}
                      {nikValidation.valid && !duplicateOwner && (
                        <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" /> NIK valid &amp; belum terduplikasi
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Nama Lengkap Ibu Menyusui *
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        placeholder="Nama lengkap sesuai KTP/KIA"
                        className="w-full min-h-[38px] px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0D9488] outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Nama Bayi / Balita
                      </label>
                      <input
                        type="text"
                        value={babyName}
                        onChange={e => setBabyName(e.target.value)}
                        placeholder="Contoh: By. Azzam"
                        className="w-full min-h-[38px] px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Posyandu / Lembaga Binaan
                      </label>
                      <select
                        value={institutionId}
                        onChange={e => setInstitutionId(e.target.value)}
                        className="w-full min-h-[38px] px-2.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      >
                        {POSYANDU_PRESETS.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                        {institutions
                          .filter(i => !POSYANDU_PRESETS.some(p => p.id === i.id))
                          .map(inst => (
                            <option key={inst.id} value={inst.id}>
                              {inst.name}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Dusun / Alamat &amp; No. HP
                      </label>
                      <input
                        type="text"
                        value={villageOrPosyandu}
                        onChange={e => setVillageOrPosyandu(e.target.value)}
                        placeholder="Dusun / Desa"
                        className="w-full min-h-[38px] px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Section 2: Masa Laktasi & Kondisi Menyusui */}
              <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700 space-y-3.5">
                <div className="text-xs font-extrabold text-[#1E3A8A] dark:text-sky-400 uppercase tracking-wide flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>2. Usia Ibu, Tanggal Melahirkan &amp; Kondisi Laktasi</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Usia Ibu (Tahun)
                    </label>
                    <input
                      type="number"
                      min={15}
                      max={50}
                      value={ageYears}
                      onChange={e => setAgeYears(Number(e.target.value) || 26)}
                      className="w-full min-h-[38px] px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Tanggal Melahirkan
                    </label>
                    <input
                      type="date"
                      value={deliveryDate}
                      onChange={e => setDeliveryDate(e.target.value)}
                      className="w-full min-h-[38px] px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Tanggal Pemeriksaan
                    </label>
                    <input
                      type="date"
                      value={measurementDate}
                      onChange={e => setMeasurementDate(e.target.value)}
                      className="w-full min-h-[38px] px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="px-3 py-2 rounded-lg bg-blue-50/80 dark:bg-sky-950/40 border border-blue-200/80 dark:border-sky-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-slate-700 dark:text-slate-300">
                    Usia Bayi / Masa Menyusui Otomatis:{' '}
                    <strong className="font-mono text-[#1E3A8A] dark:text-sky-300">
                      {durationInfo.babyAgeMonths} bulan ({durationInfo.lactationWeeks} minggu / {durationInfo.babyAgeDays} hari)
                    </strong>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#1E3A8A] text-white font-bold text-[11px]">
                    {durationInfo.lactationPhase}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Pola Pemberian ASI / Menyusui
                    </label>
                    <select
                      value={feedingPattern}
                      onChange={e => setFeedingPattern(e.target.value as LactationFeedingPattern)}
                      className="w-full min-h-[38px] px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    >
                      <option value="ASI Eksklusif">ASI Eksklusif (Tanpa Tambahan Lain)</option>
                      <option value="ASI + MP-ASI">ASI + MP-ASI (Usia &gt; 6 Bulan)</option>
                      <option value="ASI Parsial (Campur Sufor)">ASI Parsial (Campur Susu Formula)</option>
                      <option value="Kesulitan Menyusui">Kesulitan Menyusui / Penolakan Bayi</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Kondisi Payudara &amp; Kelancaran ASI
                    </label>
                    <select
                      value={breastStatus}
                      onChange={e => setBreastStatus(e.target.value as BreastHealthStatus)}
                      className="w-full min-h-[38px] px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    >
                      <option value="Normal & ASI Lancar">Normal &amp; ASI Lancar</option>
                      <option value="Produksi ASI Kurang">Produksi ASI Kurang / Seret</option>
                      <option value="Bendungan ASI (Bengkak)">Bendungan ASI (Payudara Bengkak/Nyeri)</option>
                      <option value="Mastitis / Puting Lecet">Mastitis / Demam / Puting Lecet Berat</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 3: Antropometri, Klinis Hb, TD & Cairan */}
              <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700 space-y-3.5">
                <div className="text-xs font-extrabold text-[#1E3A8A] dark:text-sky-400 uppercase tracking-wide flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5" />
                  <span>3. Antropometri (LILA &amp; IMT), Hemoglobin, Tensi &amp; Hidrasi</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      BB Ibu (kg)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min={30}
                      max={150}
                      value={weightKg}
                      onChange={e => setWeightKg(Number(e.target.value) || 0)}
                      className="w-full min-h-[38px] px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      TB Ibu (cm)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min={120}
                      max={200}
                      value={heightCm}
                      onChange={e => setHeightCm(Number(e.target.value) || 0)}
                      className="w-full min-h-[38px] px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <Ruler className="w-3 h-3 text-[#0D9488]" /> LILA (cm)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min={14}
                      max={45}
                      value={lilaCm}
                      onChange={e => setLilaCm(Number(e.target.value) || 0)}
                      className="w-full min-h-[38px] px-3 py-2 text-xs font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <Droplets className="w-3 h-3 text-[#E11D48]" /> Hb (g/dL)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min={4}
                      max={18}
                      value={hemoglobinGdL}
                      onChange={e => setHemoglobinGdL(Number(e.target.value) || 0)}
                      className="w-full min-h-[38px] px-3 py-2 text-xs font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      TD Sistolik (mmHg)
                    </label>
                    <input
                      type="number"
                      min={70}
                      max={230}
                      value={systolicBp}
                      onChange={e => setSystolicBp(Number(e.target.value) || 0)}
                      className="w-full min-h-[38px] px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      TD Diastolik (mmHg)
                    </label>
                    <input
                      type="number"
                      min={40}
                      max={140}
                      value={diastolicBp}
                      onChange={e => setDiastolicBp(Number(e.target.value) || 0)}
                      className="w-full min-h-[38px] px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <GlassWater className="w-3 h-3 text-sky-600" /> Asupan Cairan (mL/hr)
                    </label>
                    <input
                      type="number"
                      step="100"
                      min={500}
                      max={5000}
                      value={fluidIntakeMl}
                      onChange={e => setFluidIntakeMl(Number(e.target.value) || 0)}
                      className="w-full min-h-[38px] px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={vitaminAPostpartum}
                      onChange={e => setVitaminAPostpartum(e.target.checked)}
                      className="w-4 h-4 accent-[#0D9488]"
                    />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Sudah 2x Kapsul Vitamin A Merah Nifas (200.000 IU)
                    </span>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ttdOrMultivitaminCompliant}
                      onChange={e => setTtdOrMultivitaminCompliant(e.target.checked)}
                      className="w-4 h-4 accent-[#0D9488]"
                    />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Rutin Konsumsi TTD / Mikronutrien Busui
                    </span>
                  </label>
                </div>

                {calculatorMode === 'save' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Catatan Bidan / Pengawas Gizi (Opsional)
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Contoh: Bayi menyusu kuat, disarankan konsumsi sayur katuk & air 3L/hari"
                      className="w-full min-h-[38px] px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT PANEL: REAL-TIME DIAGNOSTIC OUTPUT */}
            <div className="xl:col-span-5 flex flex-col justify-between space-y-4">
              <div className="p-4 sm:p-5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-700">
                  <div>
                    <div className="text-[11px] uppercase font-bold text-slate-500 dark:text-slate-400">
                      Hasil Skrining Otomatis Real-Time
                    </div>
                    <div className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">
                      {liveAssessment.lactationPhase} • Bayi {liveAssessment.babyAgeMonths} bln
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1.5 rounded-xl border text-xs font-extrabold ${getRiskBadgeClasses(
                      liveAssessment.riskLevel
                    )}`}
                  >
                    {liveAssessment.riskLevel}
                  </span>
                </div>

                {/* Diagnostic Metric Grid */}
                <div className="grid grid-cols-2 gap-3 tabular-nums">
                  <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700">
                    <div className="text-[11px] text-slate-500 font-semibold">LILA &amp; Status KEK</div>
                    <div className="text-base font-black text-slate-900 dark:text-white font-mono mt-0.5">
                      {liveAssessment.lilaCm} cm
                    </div>
                    <div
                      className={`text-[11px] font-bold mt-0.5 ${
                        liveAssessment.isKek ? 'text-[#D97706]' : 'text-[#0D9488]'
                      }`}
                    >
                      {liveAssessment.lilaCategory}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700">
                    <div className="text-[11px] text-slate-500 font-semibold">Hemoglobin (Hb)</div>
                    <div className="text-base font-black text-slate-900 dark:text-white font-mono mt-0.5">
                      {liveAssessment.hemoglobinGdL} g/dL
                    </div>
                    <div
                      className={`text-[11px] font-bold mt-0.5 ${
                        liveAssessment.anemiaStatus === 'Normal'
                          ? 'text-[#0D9488]'
                          : liveAssessment.anemiaStatus === 'Anemia Berat'
                          ? 'text-[#E11D48]'
                          : 'text-[#D97706]'
                      }`}
                    >
                      {liveAssessment.anemiaStatus}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700">
                    <div className="text-[11px] text-slate-500 font-semibold">Tekanan Darah</div>
                    <div className="text-base font-black text-slate-900 dark:text-white font-mono mt-0.5">
                      {liveAssessment.systolicBp}/{liveAssessment.diastolicBp}
                    </div>
                    <div
                      className={`text-[11px] font-bold mt-0.5 ${
                        liveAssessment.bpStatus === 'Normal'
                          ? 'text-[#0D9488]'
                          : liveAssessment.bpStatus === 'Hipertensi Pasca Persalinan'
                          ? 'text-[#E11D48]'
                          : 'text-[#D97706]'
                      }`}
                    >
                      {liveAssessment.bpStatus}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700">
                    <div className="text-[11px] text-slate-500 font-semibold">IMT &amp; Status Gizi Ibu</div>
                    <div className="text-base font-black text-slate-900 dark:text-white font-mono mt-0.5">
                      IMT {liveAssessment.bmi}
                    </div>
                    <div className="text-[11px] font-bold text-[#1E3A8A] dark:text-sky-400 mt-0.5">
                      {liveAssessment.bmiCategory}
                    </div>
                  </div>
                </div>

                {/* Breast & Hydration Bar */}
                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300">Status Payudara &amp; ASI</span>
                    <span
                      className={`font-extrabold ${
                        breastStatus === 'Normal & ASI Lancar'
                          ? 'text-[#0D9488]'
                          : breastStatus === 'Mastitis / Puting Lecet'
                          ? 'text-[#E11D48]'
                          : 'text-[#D97706]'
                      }`}
                    >
                      {breastStatus}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs tabular-nums">
                    <span className="font-bold text-slate-700 dark:text-slate-300">Kecukupan Cairan Harian</span>
                    <span
                      className={`font-mono font-extrabold ${
                        liveAssessment.isHydrationLow ? 'text-[#D97706]' : 'text-[#0D9488]'
                      }`}
                    >
                      {liveAssessment.fluidIntakeMl} / {liveAssessment.targetFluidMl} mL
                    </span>
                  </div>
                </div>

                {/* Target Kebutuhan Gizi MBG 3B Ibu Menyusui */}
                <div className="p-3.5 rounded-xl bg-blue-50/90 dark:bg-sky-950/40 border border-blue-200 dark:border-sky-800 space-y-1.5">
                  <div className="text-xs font-extrabold text-[#1E3A8A] dark:text-sky-300">
                    Kebutuhan Gizi Harian Ibu Menyusui (Permenkes AKG 2019)
                  </div>
                  <div className="flex flex-wrap items-baseline gap-4 font-mono">
                    <div>
                      <span className="text-lg font-black text-[#1E3A8A] dark:text-white">
                        {liveAssessment.recommendedKcal}
                      </span>{' '}
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300">kkal/hari</span>
                    </div>
                    <div>
                      <span className="text-lg font-black text-[#0D9488] dark:text-teal-400">
                        {liveAssessment.recommendedProteinG}
                      </span>{' '}
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300">g protein/hari</span>
                    </div>
                    <div>
                      <span className="text-base font-black text-sky-700 dark:text-sky-300">
                        {liveAssessment.targetFluidMl}
                      </span>{' '}
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300">mL air/hari</span>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300">
                    Tambahan laktasi: +{liveAssessment.extraLactationKcal} kkal &amp; +{liveAssessment.extraLactationProteinG}g protein
                    {liveAssessment.isKek
                      ? ` + PMT Pemulihan KEK (+${liveAssessment.pmtKekExtraKcal} kkal, +${liveAssessment.pmtKekExtraProteinG}g prot)`
                      : ''}
                    .
                  </div>
                </div>

                {/* Risk Flags & Recommendation */}
                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2">
                  {liveAssessment.riskFlags.length > 0 ? (
                    <div className="space-y-1">
                      <div className="text-[11px] font-extrabold text-[#E11D48] uppercase">
                        Faktor Risiko Terdeteksi ({liveAssessment.riskFlags.length}):
                      </div>
                      <ul className="list-disc pl-4 space-y-0.5 text-xs text-slate-700 dark:text-slate-300">
                        {liveAssessment.riskFlags.map(flag => (
                          <li key={flag}>{flag}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="text-xs font-bold text-[#0D9488] flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> Tidak ada faktor risiko klinis mayor terdeteksi.
                    </div>
                  )}
                  <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    <strong className="text-slate-900 dark:text-white">Rekomendasi Klinis &amp; MBG 3B:</strong>{' '}
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
                      : 'Simpan ke Rekapitulasi Ibu Menyusui'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* REKAPITULASI KESEHATAN IBU MENYUSUI (PER FASE LAKTASI & POSYANDU) */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-4 sm:p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <ClipboardList className="w-5 h-5 text-[#1E3A8A] dark:text-sky-400" />
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                Rekapitulasi Kesehatan Ibu Menyusui (3B) per Fase Laktasi &amp; Posyandu
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Ringkasan fase menyusui, prevalensi KEK, anemia, kendala payudara/ASI, kecukupan cairan, dan Vitamin A nifas.
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

        {/* Grid 2 Tables: Per Fase Laktasi & Per Posyandu */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          {/* Table 1: Rekap per Fase Laktasi */}
          <div className="xl:col-span-5 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 uppercase text-[11px] font-bold">
                <tr>
                  <th className="px-3 py-2.5">Fase Laktasi</th>
                  <th className="px-2 py-2.5 text-center">Jml</th>
                  <th className="px-2 py-2.5 text-center">KEK</th>
                  <th className="px-2 py-2.5 text-center">Anemia</th>
                  <th className="px-2 py-2.5 text-center">ASI</th>
                  <th className="px-2.5 py-2.5 text-right">Rerata LILA / Cairan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 tabular-nums">
                {summaryStats.phases.map(row => (
                  <tr key={row.phase} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="px-3 py-2.5 font-bold text-[#1E3A8A] dark:text-sky-400">
                      {row.phase}
                    </td>
                    <td className="px-2 py-2.5 text-center font-mono font-bold">{row.count}</td>
                    <td className="px-2 py-2.5 text-center font-mono font-bold text-[#D97706]">
                      {row.kek}
                    </td>
                    <td className="px-2 py-2.5 text-center font-mono font-bold text-[#E11D48]">
                      {row.anemia}
                    </td>
                    <td className="px-2 py-2.5 text-center font-mono font-bold text-[#D97706]">
                      {row.lactationIssue}
                    </td>
                    <td className="px-2.5 py-2.5 text-right font-mono text-slate-700 dark:text-slate-300">
                      {row.count > 0 ? `${row.avgLila.toFixed(1)} cm / ${row.avgFluid} mL` : '-'}
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
                  <th className="px-2 py-2.5 text-center">Total</th>
                  <th className="px-2 py-2.5 text-center">Normal</th>
                  <th className="px-2 py-2.5 text-center">Sedang</th>
                  <th className="px-2 py-2.5 text-center">Tinggi</th>
                  <th className="px-2 py-2.5 text-center">KEK</th>
                  <th className="px-2 py-2.5 text-center">Anemia</th>
                  <th className="px-2 py-2.5 text-center">ASI</th>
                  <th className="px-2 py-2.5 text-center">Vit. A</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 tabular-nums">
                {summaryStats.areaSummary.map(area => (
                  <tr key={area.areaName} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="px-3 py-2.5 font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#0D9488] shrink-0" />
                      <span>{area.areaName}</span>
                    </td>
                    <td className="px-2 py-2.5 text-center font-mono font-bold">{area.total}</td>
                    <td className="px-2 py-2.5 text-center font-mono font-bold text-[#0D9488]">
                      {area.normal}
                    </td>
                    <td className="px-2 py-2.5 text-center font-mono font-bold text-[#D97706]">
                      {area.mediumRisk}
                    </td>
                    <td className="px-2 py-2.5 text-center font-mono font-bold text-[#E11D48]">
                      {area.highRisk}
                    </td>
                    <td className="px-2 py-2.5 text-center font-mono text-[#D97706]">{area.kek}</td>
                    <td className="px-2 py-2.5 text-center font-mono text-[#E11D48]">{area.anemia}</td>
                    <td className="px-2 py-2.5 text-center font-mono text-[#D97706]">{area.lactationIssue}</td>
                    <td className="px-2 py-2.5 text-center font-mono text-slate-700 dark:text-slate-300">
                      {area.vitACompliant}/{area.total}
                    </td>
                  </tr>
                ))}
                {summaryStats.areaSummary.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-6 text-center text-slate-500">
                      Belum ada data pemeriksaan ibu menyusui.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* REGISTRI & FILTER PEMERIKSAAN IBU MENYUSUI */}
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
                {lvl === 'ALL' ? `Semua (${lactatingHealthRecords.length})` : lvl}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filter Fase Laktasi"
              value={phaseFilter}
              onChange={e => setPhaseFilter(e.target.value)}
              className="min-h-[36px] px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
            >
              <option value="ALL">Semua Fase Laktasi</option>
              <option value="0–6 Bulan (ASI Eksklusif)">0–6 Bulan (ASI Eksklusif)</option>
              <option value="> 6–12 Bulan (ASI + MP-ASI)">&gt; 6–12 Bulan (ASI + MP-ASI)</option>
              <option value="> 12–24 Bulan (ASI Lanjutan)">&gt; 12–24 Bulan (ASI Lanjutan)</option>
            </select>

            <select
              aria-label="Filter Kondisi Klinis Ibu Menyusui"
              value={conditionFilter}
              onChange={e => setConditionFilter(e.target.value)}
              className="min-h-[36px] px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
            >
              <option value="ALL">Semua Kondisi Klinis</option>
              <option value="KEK">Hanya KEK (LILA &lt; 23,5 cm)</option>
              <option value="Anemia">Hanya Anemia (Hb &lt; 12,0 g/dL)</option>
              <option value="Hipertensi">Hanya Hipertensi (≥ 140/90)</option>
              <option value="GangguanASI">Kendala Payudara / ASI Kurang</option>
              <option value="HidrasiKurang">Asupan Cairan Kurang</option>
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
          title="Registri & Riwayat Pemeriksaan Kesehatan Ibu Menyusui (Sasaran 3B)"
          subtitle="Validasi NIK 16-digit anti-duplikasi • Data tersimpan persisten & siap ekspor laporan BGN/Puskesmas"
          searchPlaceholder="Cari nama ibu menyusui, nama bayi, NIK 16 digit, Posyandu, atau fase laktasi..."
          searchKeys={[
            'fullName',
            'babyName',
            'nik',
            'institutionName',
            'villageOrPosyandu',
            'riskLevel',
            'lactationPhase',
            'breastStatus',
          ]}
          onExportExcel={handleExportRegistryExcel}
          onExportPDF={handleExportRegistryPDF}
          onPrint={triggerPrint}
          stickyFirstColumn
        />
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) {
            await deleteLactatingHealthRecord(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
        title="Hapus Data Pemeriksaan Ibu Menyusui?"
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
