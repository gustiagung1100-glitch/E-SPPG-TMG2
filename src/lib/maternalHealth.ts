import {
  MaternalAnemiaStatus,
  MaternalBmiCategory,
  MaternalBpStatus,
  MaternalRiskLevel,
  MaternalTrimester,
  MaternalWeightGainStatus,
} from '../types';

export interface GestationCalculation {
  gestationalWeeks: number;
  gestationalDaysRemainder: number;
  dueDateHpl: string;
  trimester: MaternalTrimester;
}

export interface MaternalAssessmentInput {
  ageYears: number;
  gestationalWeeks: number;
  prePregnancyWeightKg: number;
  currentWeightKg: number;
  heightCm: number;
  lilaCm: number;
  hemoglobinGdL: number;
  systolicBp: number;
  diastolicBp: number;
  ttdCompliant?: boolean;
}

export interface MaternalAssessmentResult {
  gestationalWeeks: number;
  trimester: MaternalTrimester;
  prePregnancyBmi: number;
  bmiCategory: MaternalBmiCategory;
  weightGainKg: number;
  targetTotalMinKg: number;
  targetTotalMaxKg: number;
  expectedMinGainNowKg: number;
  expectedMaxGainNowKg: number;
  targetWeightGainRange: string;
  weightGainStatus: MaternalWeightGainStatus;
  lilaCm: number;
  isKek: boolean;
  lilaCategory: string;
  hemoglobinGdL: number;
  anemiaStatus: MaternalAnemiaStatus;
  systolicBp: number;
  diastolicBp: number;
  bpStatus: MaternalBpStatus;
  baseKcal: number;
  extraTrimesterKcal: number;
  extraKekKcal: number;
  recommendedKcal: number;
  baseProteinG: number;
  extraTrimesterProteinG: number;
  extraKekProteinG: number;
  recommendedProteinG: number;
  riskFlags: string[];
  riskLevel: MaternalRiskLevel;
  recommendation: string;
}

function roundTo(val: number, decimals = 1): number {
  if (!Number.isFinite(val)) return 0;
  const factor = 10 ** decimals;
  return Math.round(val * factor) / factor;
}

export function getTrimesterFromWeeks(weeks: number): MaternalTrimester {
  const safeWeeks = Number.isFinite(weeks) ? weeks : 0;
  const clamped = Math.max(0, Math.min(42, safeWeeks));
  if (clamped <= 13) return 'Trimester I';
  if (clamped <= 27) return 'Trimester II';
  return 'Trimester III';
}

/**
 * Hitung Usia Kehamilan (minggu + hari) dan Hari Perkiraan Lahir (HPL = HPHT + 280 hari / Rumus Naegele)
 */
export function calculateGestationFromHPHT(
  hphtDateStr: string,
  referenceDateStr?: string
): GestationCalculation | null {
  if (!hphtDateStr) return null;
  const hpht = new Date(`${hphtDateStr}T00:00:00`);
  if (Number.isNaN(hpht.getTime())) return null;

  const ref = referenceDateStr ? new Date(`${referenceDateStr}T00:00:00`) : new Date();
  if (Number.isNaN(ref.getTime())) return null;

  const diffMs = ref.getTime() - hpht.getTime();
  const totalDays = Math.max(0, Math.min(42 * 7 + 6, Math.floor(diffMs / 86400000)));
  const gestationalWeeks = Math.floor(totalDays / 7);
  const gestationalDaysRemainder = totalDays % 7;

  const hplDate = new Date(hpht.getTime() + 280 * 86400000);
  const year = hplDate.getFullYear();
  const month = String(hplDate.getMonth() + 1).padStart(2, '0');
  const day = String(hplDate.getDate()).padStart(2, '0');
  const dueDateHpl = `${year}-${month}-${day}`;

  return {
    gestationalWeeks,
    gestationalDaysRemainder,
    dueDateHpl,
    trimester: getTrimesterFromWeeks(gestationalWeeks),
  };
}

/**
 * Kalkulator Pemeriksaan Kesehatan & Gizi Ibu Hamil
 * Mengacu pada:
 * - Buku KIA & Pedoman Pelayanan Antenatal Terpadu Kemenkes RI
 * - Cut-off KEK Kemenkes RI (LILA < 23,5 cm)
 * - Klasifikasi Anemia Ibu Hamil WHO / Kemenkes (Hb < 11,0 g/dL)
 * - Rekomendasi Pertambahan Berat Badan IOM (Institute of Medicine) & Kemenkes
 * - Angka Kecukupan Gizi (AKG) Permenkes RI No. 28 Tahun 2019
 */
export function calculateMaternalHealthAssessment(
  input: MaternalAssessmentInput
): MaternalAssessmentResult {
  const numOr = (v: unknown, fb: number) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : fb;
  };
  const ageYears = Math.max(12, Math.min(55, numOr(input.ageYears, 25)));
  const gestationalWeeks = Math.max(1, Math.min(42, Math.round(numOr(input.gestationalWeeks, 12))));
  const trimester = getTrimesterFromWeeks(gestationalWeeks);

  const heightCm = Math.max(120, Math.min(200, numOr(input.heightCm, 155)));
  const heightM = heightCm / 100;
  const prePregnancyWeightKg = Math.max(30, Math.min(160, numOr(input.prePregnancyWeightKg, 50)));
  const currentWeightKg = Math.max(30, Math.min(180, numOr(input.currentWeightKg, prePregnancyWeightKg)));

  const prePregnancyBmi = roundTo(prePregnancyWeightKg / (heightM * heightM), 1);
  const weightGainKg = roundTo(currentWeightKg - prePregnancyWeightKg, 1);

  let bmiCategory: MaternalBmiCategory = 'Normal (Ideal)';
  let targetTotalMinKg = 11.5;
  let targetTotalMaxKg = 16.0;
  let weeklyMinKg = 0.35;
  let weeklyMaxKg = 0.5;

  if (prePregnancyBmi < 18.5) {
    bmiCategory = 'Kurus (Underweight)';
    targetTotalMinKg = 12.5;
    targetTotalMaxKg = 18.0;
    weeklyMinKg = 0.44;
    weeklyMaxKg = 0.58;
  } else if (prePregnancyBmi < 25.0) {
    bmiCategory = 'Normal (Ideal)';
    targetTotalMinKg = 11.5;
    targetTotalMaxKg = 16.0;
    weeklyMinKg = 0.35;
    weeklyMaxKg = 0.5;
  } else if (prePregnancyBmi < 30.0) {
    bmiCategory = 'Gemuk (Overweight)';
    targetTotalMinKg = 7.0;
    targetTotalMaxKg = 11.5;
    weeklyMinKg = 0.23;
    weeklyMaxKg = 0.33;
  } else {
    bmiCategory = 'Obesitas';
    targetTotalMinKg = 5.0;
    targetTotalMaxKg = 9.0;
    weeklyMinKg = 0.17;
    weeklyMaxKg = 0.27;
  }

  let expectedMinGainNowKg = 0.5;
  let expectedMaxGainNowKg = 2.0;
  if (gestationalWeeks <= 13) {
    const ratio = gestationalWeeks / 13;
    expectedMinGainNowKg = roundTo(0.2 * ratio, 1);
    expectedMaxGainNowKg = roundTo(2.0 * Math.max(0.25, ratio), 1);
  } else {
    const weeksPostT1 = Math.min(27, gestationalWeeks - 13);
    expectedMinGainNowKg = roundTo(Math.min(targetTotalMinKg, 0.5 + weeksPostT1 * weeklyMinKg), 1);
    expectedMaxGainNowKg = roundTo(Math.min(targetTotalMaxKg, 2.0 + weeksPostT1 * weeklyMaxKg), 1);
  }

  let weightGainStatus: MaternalWeightGainStatus = 'Sesuai Target';
  if (weightGainKg < expectedMinGainNowKg - 0.3) {
    weightGainStatus = 'Kenaikan Kurang';
  } else if (weightGainKg > expectedMaxGainNowKg + 0.5) {
    weightGainStatus = 'Kenaikan Berlebih';
  }

  const targetWeightGainRange = `${targetTotalMinKg.toFixed(1)}–${targetTotalMaxKg.toFixed(1)} kg`;

  // LILA (Lingkar Lengan Atas) -> KEK < 23.5 cm
  const lilaCm = roundTo(Math.max(12, Math.min(50, Number(input.lilaCm) || 24)), 1);
  const isKek = lilaCm < 23.5;
  const lilaCategory = isKek
    ? lilaCm < 21.0
      ? 'KEK Berat (< 21,0 cm)'
      : 'KEK (LILA < 23,5 cm)'
    : 'Normal (≥ 23,5 cm)';

  // Hemoglobin (g/dL) -> WHO / Kemenkes
  const hemoglobinGdL = roundTo(Math.max(3, Math.min(19, Number(input.hemoglobinGdL) || 11.5)), 1);
  let anemiaStatus: MaternalAnemiaStatus = 'Normal';
  if (hemoglobinGdL < 7.0) {
    anemiaStatus = 'Anemia Berat';
  } else if (hemoglobinGdL < 10.0) {
    anemiaStatus = 'Anemia Sedang';
  } else if (hemoglobinGdL < 11.0) {
    anemiaStatus = 'Anemia Ringan';
  }

  // Tekanan Darah (mmHg)
  const systolicBp = Math.max(60, Math.min(250, Math.round(Number(input.systolicBp) || 110)));
  const diastolicBp = Math.max(40, Math.min(160, Math.round(Number(input.diastolicBp) || 70)));
  let bpStatus: MaternalBpStatus = 'Normal';
  if (systolicBp >= 140 || diastolicBp >= 90) {
    bpStatus = 'Hipertensi / Risiko Preeklamsia';
  } else if (systolicBp >= 130 || diastolicBp >= 85) {
    bpStatus = 'Pra-Hipertensi / Waspada';
  }

  // Kebutuhan Energi & Protein Harian (Permenkes AKG 2019 + Tambahan Trimester + PMT KEK)
  const baseKcal = 2250;
  const baseProteinG = 60;
  const extraTrimesterKcal = trimester === 'Trimester I' ? 180 : 300;
  const extraTrimesterProteinG = trimester === 'Trimester I' ? 1 : trimester === 'Trimester II' ? 10 : 30;
  const extraKekKcal = isKek ? 500 : 0;
  const extraKekProteinG = isKek ? 15 : 0;

  const recommendedKcal = baseKcal + extraTrimesterKcal + extraKekKcal;
  const recommendedProteinG = baseProteinG + extraTrimesterProteinG + extraKekProteinG;

  // Risk Flags & Overall Risk Level
  const riskFlags: string[] = [];
  if (isKek) riskFlags.push(`KEK (LILA ${lilaCm} cm)`);
  if (anemiaStatus !== 'Normal') riskFlags.push(`${anemiaStatus} (Hb ${hemoglobinGdL} g/dL)`);
  if (bpStatus === 'Hipertensi / Risiko Preeklamsia') {
    riskFlags.push(`Hipertensi (${systolicBp}/${diastolicBp} mmHg)`);
  } else if (bpStatus === 'Pra-Hipertensi / Waspada') {
    riskFlags.push(`TD Waspada (${systolicBp}/${diastolicBp} mmHg)`);
  }
  if (ageYears < 20) riskFlags.push(`Usia Terlalu Muda (${ageYears} th)`);
  if (ageYears > 35) riskFlags.push(`Usia Terlalu Tua (${ageYears} th)`);
  if (weightGainStatus === 'Kenaikan Kurang') {
    riskFlags.push(`Pertambahan BB Kurang (${weightGainKg >= 0 ? `+${weightGainKg}` : weightGainKg} kg)`);
  } else if (weightGainStatus === 'Kenaikan Berlebih') {
    riskFlags.push(`Pertambahan BB Berlebih (+${weightGainKg} kg)`);
  }
  if (input.ttdCompliant === false) {
    riskFlags.push('Belum Rutin TTD / Asam Folat');
  }

  let riskLevel: MaternalRiskLevel = 'Normal / Risiko Rendah';
  const hasCriticalSingle =
    anemiaStatus === 'Anemia Berat' ||
    anemiaStatus === 'Anemia Sedang' ||
    bpStatus === 'Hipertensi / Risiko Preeklamsia' ||
    (isKek && anemiaStatus !== 'Normal') ||
    (isKek && lilaCm < 21.5);

  const majorCount =
    (isKek ? 1 : 0) +
    (anemiaStatus !== 'Normal' ? 1 : 0) +
    (bpStatus !== 'Normal' ? 1 : 0) +
    (ageYears < 20 || ageYears > 35 ? 1 : 0);

  if (hasCriticalSingle || majorCount >= 2) {
    riskLevel = 'Risiko Tinggi';
  } else if (riskFlags.length > 0) {
    riskLevel = 'Risiko Sedang';
  }

  // Rekomendasi Klinis & MBG 3B
  const recParts: string[] = [];
  if (bpStatus === 'Hipertensi / Risiko Preeklamsia') {
    recParts.push(
      'RUJUKAN SEGERA: Tekanan darah ≥140/90 mmHg berisiko preeklamsia. Konsultasikan ke Bidan/Dokter Puskesmas atau SpOG, cek proteinuria, dan batasi garam.'
    );
  }
  if (anemiaStatus === 'Anemia Berat') {
    recParts.push(
      'ANEMIA BERAT (Hb <7 g/dL): Wajib rujuk fasilitas kesehatan untuk tata laksana medis segera & suplementasi besi intensif.'
    );
  } else if (anemiaStatus !== 'Normal') {
    recParts.push(
      `Terapi ${anemiaStatus}: Berikan Tablet Tambah Darah (TTD) harian bersama sumber vitamin C (jeruk/jambu), hindari teh/kopi saat makan, dan tingkatkan protein hewani kaya zat besi (hati ayam, daging, telur, ikan).`
    );
  }
  if (isKek) {
    recParts.push(
      `Intervensi KEK (LILA ${lilaCm} cm): Prioritaskan PMT Pemulihan Ibu Hamil 3B (+500 kkal & +15g protein/hari), paket MBG tinggi energi-protein, serta pantau LILA & BB setiap 2 minggu.`
    );
  }
  if (!isKek && weightGainStatus === 'Kenaikan Kurang') {
    recParts.push(
      'Pertambahan BB di bawah target usia kehamilan: Tingkatkan porsi makan frekuensi kecil tapi sering (3x utama + 2x selingan padat gizi).'
    );
  } else if (weightGainStatus === 'Kenaikan Berlebih') {
    recParts.push(
      'Pertambahan BB melebihi target: Kendalikan gula & gorengan berlebih, perbanyak sayur berserat & protein rendah lemak untuk cegah diabetes gestasional.'
    );
  }
  if (recParts.length === 0) {
    recParts.push(
      `Kondisi kehamilan stabil (${trimester}). Lanjutkan paket gizi MBG 3B (${recommendedKcal} kkal & ${recommendedProteinG}g protein/hari), konsumsi 1 tablet TTD/hari (min. 90 tablet selama kehamilan), dan ANC rutin di Posyandu/Puskesmas.`
    );
  }

  return {
    gestationalWeeks,
    trimester,
    prePregnancyBmi,
    bmiCategory,
    weightGainKg,
    targetTotalMinKg,
    targetTotalMaxKg,
    expectedMinGainNowKg,
    expectedMaxGainNowKg,
    targetWeightGainRange,
    weightGainStatus,
    lilaCm,
    isKek,
    lilaCategory,
    hemoglobinGdL,
    anemiaStatus,
    systolicBp,
    diastolicBp,
    bpStatus,
    baseKcal,
    extraTrimesterKcal,
    extraKekKcal,
    recommendedKcal,
    baseProteinG,
    extraTrimesterProteinG,
    extraKekProteinG,
    recommendedProteinG,
    riskFlags,
    riskLevel,
    recommendation: recParts.join(' '),
  };
}
