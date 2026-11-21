import {
  BreastHealthStatus,
  LactatingAnemiaStatus,
  LactatingBmiCategory,
  LactatingBpStatus,
  LactatingRiskLevel,
  LactationFeedingPattern,
  LactationPhase,
} from '../types';

export interface LactationDurationResult {
  babyAgeDays: number;
  lactationWeeks: number;
  babyAgeMonths: number;
  lactationPhase: LactationPhase;
  targetFluidMl: number;
}

export interface LactatingHealthInput {
  ageYears: number;
  deliveryDate?: string;
  measurementDate?: string;
  babyAgeMonthsOverride?: number;
  weightKg: number;
  heightCm: number;
  lilaCm: number;
  hemoglobinGdL: number;
  systolicBp: number;
  diastolicBp: number;
  feedingPattern: LactationFeedingPattern;
  breastStatus: BreastHealthStatus;
  fluidIntakeMl: number;
  vitaminAPostpartum: boolean;
  ttdOrMultivitaminCompliant: boolean;
}

export interface LactatingHealthAssessment {
  babyAgeDays: number;
  lactationWeeks: number;
  babyAgeMonths: number;
  lactationPhase: LactationPhase;
  bmi: number;
  bmiCategory: LactatingBmiCategory;
  lilaCm: number;
  isKek: boolean;
  lilaCategory: string;
  hemoglobinGdL: number;
  anemiaStatus: LactatingAnemiaStatus;
  systolicBp: number;
  diastolicBp: number;
  bpStatus: LactatingBpStatus;
  fluidIntakeMl: number;
  targetFluidMl: number;
  isHydrationLow: boolean;
  recommendedKcal: number;
  recommendedProteinG: number;
  extraLactationKcal: number;
  extraLactationProteinG: number;
  pmtKekExtraKcal: number;
  pmtKekExtraProteinG: number;
  riskFlags: string[];
  riskLevel: LactatingRiskLevel;
  recommendation: string;
}

export function calculateLactationDuration(
  deliveryDateStr?: string,
  referenceDateStr?: string
): LactationDurationResult {
  let diffDays = 60;

  if (deliveryDateStr) {
    const birth = new Date(`${deliveryDateStr}T00:00:00`);
    const ref = referenceDateStr ? new Date(`${referenceDateStr}T00:00:00`) : new Date();
    if (!Number.isNaN(birth.getTime()) && !Number.isNaN(ref.getTime())) {
      const rawDays = Math.floor((ref.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
      diffDays = Math.max(0, Math.min(730, rawDays));
    }
  }

  const lactationWeeks = Math.max(0, Math.floor(diffDays / 7));
  const babyAgeMonths = Math.max(0, Math.min(24, Math.floor(diffDays / 30.4375)));

  let lactationPhase: LactationPhase = '0–6 Bulan (ASI Eksklusif)';
  let targetFluidMl = 3000;

  if (babyAgeMonths > 12) {
    lactationPhase = '> 12–24 Bulan (ASI Lanjutan)';
    targetFluidMl = 2600;
  } else if (babyAgeMonths > 6) {
    lactationPhase = '> 6–12 Bulan (ASI + MP-ASI)';
    targetFluidMl = 2800;
  }

  return {
    babyAgeDays: diffDays,
    lactationWeeks,
    babyAgeMonths,
    lactationPhase,
    targetFluidMl,
  };
}

export function getBmiCategory(bmi: number): LactatingBmiCategory {
  if (bmi < 18.5) return 'Kurus (Underweight)';
  if (bmi < 25.0) return 'Normal (Ideal)';
  if (bmi < 30.0) return 'Gemuk (Overweight)';
  return 'Obesitas';
}

export function getLactatingAnemiaStatus(hb: number): LactatingAnemiaStatus {
  // Cut-off WHO / Kemenkes RI untuk wanita tidak hamil / ibu menyusui: normal >= 12.0 g/dL
  if (hb >= 12.0) return 'Normal';
  if (hb >= 11.0) return 'Anemia Ringan';
  if (hb >= 8.0) return 'Anemia Sedang';
  return 'Anemia Berat';
}

export function getLactatingBpStatus(systolic: number, diastolic: number): LactatingBpStatus {
  if (systolic >= 140 || diastolic >= 90) {
    return 'Hipertensi Pasca Persalinan';
  }
  if (systolic >= 130 || diastolic >= 85) {
    return 'Pra-Hipertensi / Waspada';
  }
  return 'Normal';
}

export function calculateLactatingHealthAssessment(
  input: LactatingHealthInput
): LactatingHealthAssessment {
  const duration = input.deliveryDate
    ? calculateLactationDuration(input.deliveryDate, input.measurementDate)
    : (() => {
        const m = Math.max(0, Math.min(24, Number(input.babyAgeMonthsOverride ?? 2)));
        const days = Math.round(m * 30.4375);
        const phase: LactationPhase =
          m > 12
            ? '> 12–24 Bulan (ASI Lanjutan)'
            : m > 6
            ? '> 6–12 Bulan (ASI + MP-ASI)'
            : '0–6 Bulan (ASI Eksklusif)';
        const targetFluidMl = m > 12 ? 2600 : m > 6 ? 2800 : 3000;
        return {
          babyAgeDays: days,
          lactationWeeks: Math.floor(days / 7),
          babyAgeMonths: m,
          lactationPhase: phase,
          targetFluidMl,
        };
      })();

  const heightM = Math.max(1.2, (Number(input.heightCm) || 155) / 100);
  const weightKg = Math.max(30, Number(input.weightKg) || 52);
  const bmi = Number((weightKg / (heightM * heightM)).toFixed(1));
  const bmiCategory = getBmiCategory(bmi);

  const lilaCm = Number((Number(input.lilaCm) || 24.5).toFixed(1));
  const isKek = lilaCm < 23.5;
  const lilaCategory =
    lilaCm < 21.0
      ? 'KEK Berat (< 21,0 cm)'
      : isKek
      ? 'KEK (LILA < 23,5 cm)'
      : 'Normal (≥ 23,5 cm)';

  const hb = Number((Number(input.hemoglobinGdL) || 12.2).toFixed(1));
  const anemiaStatus = getLactatingAnemiaStatus(hb);

  const systolic = Math.max(70, Math.round(Number(input.systolicBp) || 115));
  const diastolic = Math.max(40, Math.round(Number(input.diastolicBp) || 75));
  const bpStatus = getLactatingBpStatus(systolic, diastolic);

  const fluidIntakeMl = Math.max(500, Math.round(Number(input.fluidIntakeMl) || 2400));
  const isHydrationLow = fluidIntakeMl < duration.targetFluidMl - 400;

  // AKG Ibu Menyusui (Permenkes No. 28 Tahun 2019)
  // Dasar wanita dewasa 19-29 th: 2250 kkal, 60 g protein
  // Tambahan laktasi: 0-6 bln (+330 kkal, +20 g prot), 6-12 & >12 bln (+400 kkal, +15 g prot)
  const baseKcal = 2250;
  const baseProteinG = 60;
  const isFirstSixMonths = duration.lactationPhase === '0–6 Bulan (ASI Eksklusif)';
  const extraLactationKcal = isFirstSixMonths ? 330 : 400;
  const extraLactationProteinG = isFirstSixMonths ? 20 : 15;
  const pmtKekExtraKcal = isKek ? 500 : 0;
  const pmtKekExtraProteinG = isKek ? 15 : 0;

  const recommendedKcal = baseKcal + extraLactationKcal + pmtKekExtraKcal;
  const recommendedProteinG = baseProteinG + extraLactationProteinG + pmtKekExtraProteinG;

  const riskFlags: string[] = [];
  let majorCount = 0;

  if (isKek) {
    riskFlags.push(`KEK Ibu Menyusui (LILA ${lilaCm} cm < 23,5 cm)`);
    if (lilaCm < 21.5) majorCount += 1;
  }

  if (bmiCategory === 'Kurus (Underweight)') {
    riskFlags.push(`IMT Kurus (${bmi} kg/m² < 18,5)`);
  } else if (bmiCategory === 'Obesitas') {
    riskFlags.push(`IMT Obesitas (${bmi} kg/m²)`);
  }

  if (anemiaStatus === 'Anemia Berat' || anemiaStatus === 'Anemia Sedang') {
    riskFlags.push(`${anemiaStatus} (Hb ${hb} g/dL < 11,0)`);
    majorCount += 1;
  } else if (anemiaStatus === 'Anemia Ringan') {
    riskFlags.push(`Anemia Ringan (Hb ${hb} g/dL)`);
  }

  if (bpStatus === 'Hipertensi Pasca Persalinan') {
    riskFlags.push(`Hipertensi Pasca Persalinan (${systolic}/${diastolic} mmHg)`);
    majorCount += 1;
  } else if (bpStatus === 'Pra-Hipertensi / Waspada') {
    riskFlags.push(`Tekanan Darah Waspada (${systolic}/${diastolic} mmHg)`);
  }

  if (input.breastStatus === 'Mastitis / Puting Lecet') {
    riskFlags.push('Mastitis / Puting Lecet (Perlu Penanganan Klinis & Konseling Laktasi)');
    majorCount += 1;
  } else if (input.breastStatus === 'Bendungan ASI (Bengkak)') {
    riskFlags.push('Bendungan ASI / Payudara Bengkak');
  } else if (input.breastStatus === 'Produksi ASI Kurang') {
    riskFlags.push('Produksi ASI Kurang Optimal');
  }

  if (
    duration.lactationPhase === '0–6 Bulan (ASI Eksklusif)' &&
    (input.feedingPattern === 'ASI Parsial (Campur Sufor)' || input.feedingPattern === 'Kesulitan Menyusui')
  ) {
    riskFlags.push(`ASI Eksklusif Belum Optimal (${input.feedingPattern})`);
  } else if (input.feedingPattern === 'Kesulitan Menyusui') {
    riskFlags.push('Ibu Mengalami Kesulitan Menyusui');
  }

  if (isHydrationLow) {
    riskFlags.push(`Asupan Cairan Kurang (${fluidIntakeMl} mL vs target ${duration.targetFluidMl} mL)`);
  }

  if (!input.vitaminAPostpartum && duration.babyAgeMonths <= 6) {
    riskFlags.push('Belum Menerima 2x Kapsul Vitamin A Merah Nifas');
  }

  if (!input.ttdOrMultivitaminCompliant) {
    riskFlags.push('Konsumsi TTD / Mikronutrien Busui Belum Rutin');
  }

  if (input.ageYears < 20) {
    riskFlags.push(`Usia Muda (< 20 th: ${input.ageYears} th)`);
  } else if (input.ageYears > 35) {
    riskFlags.push(`Usia ≥ 36 th (${input.ageYears} th)`);
  }

  let riskLevel: LactatingRiskLevel = 'Normal / Risiko Rendah';
  const hasHighRiskCondition =
    anemiaStatus === 'Anemia Berat' ||
    anemiaStatus === 'Anemia Sedang' ||
    bpStatus === 'Hipertensi Pasca Persalinan' ||
    input.breastStatus === 'Mastitis / Puting Lecet' ||
    (isKek && anemiaStatus !== 'Normal') ||
    majorCount >= 2;

  if (hasHighRiskCondition) {
    riskLevel = 'Risiko Tinggi';
  } else if (riskFlags.length > 0) {
    riskLevel = 'Risiko Sedang';
  }

  const recommendations: string[] = [];

  if (bpStatus === 'Hipertensi Pasca Persalinan') {
    recommendations.push(
      'Rujuk segera ke dokter Puskesmas/Faskes untuk evaluasi hipertensi nifas, pantau keluhan nyeri kepala/penglihatan kabur, serta batasi natrium pada porsi MBG 3B.'
    );
  }

  if (input.breastStatus === 'Mastitis / Puting Lecet') {
    recommendations.push(
      'Konsultasi bidan/konselor laktasi untuk terapi mastitis, perbaiki posisi & pelekatan menyusui, tetap kosongkan payudara secara berkala.'
    );
  } else if (input.breastStatus === 'Bendungan ASI (Bengkak)') {
    recommendations.push(
      'Susui bayi lebih sering (on demand), kompres hangat sebelum menyusui dan kompres dingin setelahnya, lakukan pijat oksitosin.'
    );
  } else if (input.breastStatus === 'Produksi ASI Kurang') {
    recommendations.push(
      'Tingkatkan frekuensi menyusui/perah (tiap 2–3 jam), berikan menu MBG 3B kaya galaktagog alami (daun katuk/kelor, kacang-kacangan, protein hewani ganda).'
    );
  }

  if (anemiaStatus !== 'Normal') {
    recommendations.push(
      `Berikan suplemen Fe (TTD) & edukasi asupan kaya zat besi heme (hati ayam, daging, ikan kembung) + vitamin C dalam paket MBG untuk menaikkan Hb (${hb} g/dL).`
    );
  }

  if (isKek) {
    recommendations.push(
      `Prioritas penerima PMT Pemulihan Ibu Menyusui KEK (+500 kkal & +15 g protein/hari) serta evaluasi LILA ulang setiap 2 minggu di Posyandu.`
    );
  }

  if (isHydrationLow) {
    recommendations.push(
      `Tingkatkan konsumsi air putih menjadi minimal ${duration.targetFluidMl} mL/hari (±${Math.round(
        duration.targetFluidMl / 250
      )} gelas) agar volume dan kelancaran ASI terjaga.`
    );
  }

  if (!input.vitaminAPostpartum && duration.babyAgeMonths <= 6) {
    recommendations.push(
      'Koordinasikan dengan bidan desa/Posyandu untuk memastikan pemberian kapsul Vitamin A Merah (200.000 IU) masa nifas.'
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      `Kondisi ibu menyusui baik pada fase ${duration.lactationPhase}. Pertahankan paket MBG 3B gizi seimbang (${recommendedKcal} kkal, ${recommendedProteinG} g protein/hari) dan hidrasi ${duration.targetFluidMl} mL/hari.`
    );
  }

  return {
    babyAgeDays: duration.babyAgeDays,
    lactationWeeks: duration.lactationWeeks,
    babyAgeMonths: duration.babyAgeMonths,
    lactationPhase: duration.lactationPhase,
    bmi,
    bmiCategory,
    lilaCm,
    isKek,
    lilaCategory,
    hemoglobinGdL: hb,
    anemiaStatus,
    systolicBp: systolic,
    diastolicBp: diastolic,
    bpStatus,
    fluidIntakeMl,
    targetFluidMl: duration.targetFluidMl,
    isHydrationLow,
    recommendedKcal,
    recommendedProteinG,
    extraLactationKcal,
    extraLactationProteinG,
    pmtKekExtraKcal,
    pmtKekExtraProteinG,
    riskFlags,
    riskLevel,
    recommendation: recommendations.join(' '),
  };
}
