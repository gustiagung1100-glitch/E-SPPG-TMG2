/**
 * Kalkulator Antropometri & Z-Score Gizi Anak Otomatis
 * Berbasis Standar Pertumbuhan Anak WHO 2006 (0–60 bulan) & Referensi WHO 2007 (5–19 tahun / 61–228 bulan)
 * Selaras dengan Peraturan Menteri Kesehatan RI No. 2 Tahun 2020 tentang Standar Antropometri Anak.
 */

export type ChildGender = 'L' | 'P';

export type NutritionClinicalStatus = 'Normal' | 'Stunting' | 'Underweight' | 'Wasting' | 'Gizi Lebih';

export interface ZScoreResult {
  ageMonths: number;
  gender: ChildGender;
  weightKg: number;
  heightCm: number;
  bmi: number;
  waz: number | null; // BB/U (0-120 bulan)
  haz: number;        // TB/U (0-228 bulan)
  whz: number;        // BB/TB (0-60 bulan) atau IMT/U (61-228 bulan)
  whzIndexLabel: 'BB/TB' | 'IMT/U';
  wazCategory: string;
  hazCategory: string;
  whzCategory: string;
  isStunted: boolean;
  isUnderweight: boolean;
  isWasted: boolean;
  isOverweight: boolean;
  primaryStatus: NutritionClinicalStatus;
  severityLevel: 'Aman' | 'Sedang' | 'Berat' | 'Risiko Lebih';
  summaryBadges: NutritionClinicalStatus[];
  recommendation: string;
}

interface LMSTuple {
  key: number; // ageMonths atau heightCm
  L: number;
  M: number;
  S: number;
}

// =============================================================================
// REFERENSI LMS WHO 2006 & 2007 (Interpelasi Linier Presisi Tinggi)
// =============================================================================

// 1. TB/U (Height-for-Age, HAZ) — Usia 0 s.d. 228 bulan (Laki-laki)
const HAZ_BOYS: LMSTuple[] = [
  { key: 0, L: 1, M: 49.884, S: 0.03795 },
  { key: 3, L: 1, M: 61.429, S: 0.03274 },
  { key: 6, L: 1, M: 67.624, S: 0.03165 },
  { key: 12, L: 1, M: 75.749, S: 0.03134 },
  { key: 18, L: 1, M: 82.259, S: 0.03208 },
  { key: 24, L: 1, M: 87.816, S: 0.03425 },
  { key: 30, L: 1, M: 91.908, S: 0.03556 },
  { key: 36, L: 1, M: 96.084, S: 0.03715 },
  { key: 42, L: 1, M: 99.865, S: 0.03846 },
  { key: 48, L: 1, M: 103.33, S: 0.03981 },
  { key: 54, L: 1, M: 106.71, S: 0.04109 },
  { key: 60, L: 1, M: 110.0, S: 0.04224 },
  { key: 72, L: 1, M: 115.95, S: 0.0434 },
  { key: 84, L: 1, M: 121.74, S: 0.0445 },
  { key: 96, L: 1, M: 127.27, S: 0.0454 },
  { key: 108, L: 1, M: 132.56, S: 0.0462 },
  { key: 120, L: 1, M: 137.78, S: 0.0471 },
  { key: 132, L: 1, M: 143.12, S: 0.0485 },
  { key: 144, L: 1, M: 149.1, S: 0.0499 },
  { key: 156, L: 1, M: 156.04, S: 0.0504 },
  { key: 168, L: 1, M: 163.2, S: 0.0483 },
  { key: 180, L: 1, M: 168.96, S: 0.0449 },
  { key: 192, L: 1, M: 172.92, S: 0.0423 },
  { key: 204, L: 1, M: 175.16, S: 0.0408 },
  { key: 216, L: 1, M: 176.14, S: 0.0401 },
  { key: 228, L: 1, M: 176.54, S: 0.0397 },
];

// TB/U (Height-for-Age, HAZ) — Usia 0 s.d. 228 bulan (Perempuan)
const HAZ_GIRLS: LMSTuple[] = [
  { key: 0, L: 1, M: 49.148, S: 0.0379 },
  { key: 3, L: 1, M: 59.803, S: 0.03425 },
  { key: 6, L: 1, M: 65.731, S: 0.03382 },
  { key: 12, L: 1, M: 74.015, S: 0.03429 },
  { key: 18, L: 1, M: 80.708, S: 0.03527 },
  { key: 24, L: 1, M: 86.415, S: 0.03718 },
  { key: 30, L: 1, M: 90.692, S: 0.03838 },
  { key: 36, L: 1, M: 95.052, S: 0.03966 },
  { key: 42, L: 1, M: 98.953, S: 0.04087 },
  { key: 48, L: 1, M: 102.73, S: 0.04207 },
  { key: 54, L: 1, M: 106.23, S: 0.04318 },
  { key: 60, L: 1, M: 109.45, S: 0.0441 },
  { key: 72, L: 1, M: 115.12, S: 0.045 },
  { key: 84, L: 1, M: 120.81, S: 0.0458 },
  { key: 96, L: 1, M: 126.58, S: 0.0465 },
  { key: 108, L: 1, M: 132.49, S: 0.0472 },
  { key: 120, L: 1, M: 138.61, S: 0.0477 },
  { key: 132, L: 1, M: 145.01, S: 0.0469 },
  { key: 144, L: 1, M: 151.23, S: 0.0449 },
  { key: 156, L: 1, M: 156.39, S: 0.0425 },
  { key: 168, L: 1, M: 159.78, S: 0.0407 },
  { key: 180, L: 1, M: 161.67, S: 0.0397 },
  { key: 192, L: 1, M: 162.55, S: 0.0392 },
  { key: 204, L: 1, M: 162.9, S: 0.039 },
  { key: 216, L: 1, M: 163.06, S: 0.0389 },
  { key: 228, L: 1, M: 163.17, S: 0.0389 },
];

// 2. BB/U (Weight-for-Age, WAZ) — Usia 0 s.d. 120 bulan (Laki-laki)
const WAZ_BOYS: LMSTuple[] = [
  { key: 0, L: 0.3487, M: 3.346, S: 0.14602 },
  { key: 3, L: 0.1738, M: 6.376, S: 0.11727 },
  { key: 6, L: 0.1419, M: 7.934, S: 0.11126 },
  { key: 12, L: 0.0884, M: 9.648, S: 0.10958 },
  { key: 18, L: 0.038, M: 10.941, S: 0.11108 },
  { key: 24, L: -0.0137, M: 12.151, S: 0.11351 },
  { key: 30, L: -0.064, M: 13.307, S: 0.11606 },
  { key: 36, L: -0.1128, M: 14.343, S: 0.1187 },
  { key: 42, L: -0.1597, M: 15.329, S: 0.12138 },
  { key: 48, L: -0.2044, M: 16.349, S: 0.12402 },
  { key: 54, L: -0.2465, M: 17.342, S: 0.12661 },
  { key: 60, L: -0.2857, M: 18.337, S: 0.12915 },
  { key: 72, L: -0.352, M: 20.51, S: 0.1359 },
  { key: 84, L: -0.402, M: 22.88, S: 0.1436 },
  { key: 96, L: -0.44, M: 25.43, S: 0.152 },
  { key: 108, L: -0.464, M: 28.14, S: 0.1604 },
  { key: 120, L: -0.471, M: 31.16, S: 0.168 },
];

// BB/U (Weight-for-Age, WAZ) — Usia 0 s.d. 120 bulan (Perempuan)
const WAZ_GIRLS: LMSTuple[] = [
  { key: 0, L: 0.3809, M: 3.232, S: 0.14171 },
  { key: 3, L: 0.0956, M: 5.845, S: 0.12154 },
  { key: 6, L: 0.0472, M: 7.297, S: 0.11847 },
  { key: 12, L: -0.0238, M: 8.948, S: 0.11909 },
  { key: 18, L: -0.0757, M: 10.228, S: 0.12131 },
  { key: 24, L: -0.1173, M: 11.477, S: 0.12403 },
  { key: 30, L: -0.1521, M: 12.695, S: 0.12689 },
  { key: 36, L: -0.1819, M: 13.85, S: 0.12976 },
  { key: 42, L: -0.2078, M: 14.953, S: 0.13256 },
  { key: 48, L: -0.2305, M: 16.07, S: 0.13525 },
  { key: 54, L: -0.2504, M: 17.168, S: 0.13781 },
  { key: 60, L: -0.268, M: 18.219, S: 0.14021 },
  { key: 72, L: -0.296, M: 20.17, S: 0.1463 },
  { key: 84, L: -0.322, M: 22.39, S: 0.1536 },
  { key: 96, L: -0.348, M: 25.03, S: 0.1618 },
  { key: 108, L: -0.371, M: 28.18, S: 0.1695 },
  { key: 120, L: -0.386, M: 31.89, S: 0.1753 },
];

// 3. BB/TB (Weight-for-Height, WHZ) — 45 s.d. 120 cm (Laki-laki 0-60 bln)
const WHZ_BOYS: LMSTuple[] = [
  { key: 45, L: -0.3521, M: 2.441, S: 0.09182 },
  { key: 55, L: -0.3521, M: 4.534, S: 0.08615 },
  { key: 65, L: -0.3521, M: 7.147, S: 0.08217 },
  { key: 75, L: -0.3521, M: 9.532, S: 0.08021 },
  { key: 85, L: -0.3521, M: 11.737, S: 0.07933 },
  { key: 95, L: -0.3521, M: 14.084, S: 0.08021 },
  { key: 105, L: -0.3521, M: 16.77, S: 0.08294 },
  { key: 115, L: -0.3521, M: 20.125, S: 0.08822 },
  { key: 120, L: -0.3521, M: 22.149, S: 0.09172 },
];

// BB/TB (Weight-for-Height, WHZ) — 45 s.d. 120 cm (Perempuan 0-60 bln)
const WHZ_GIRLS: LMSTuple[] = [
  { key: 45, L: -0.3833, M: 2.461, S: 0.09223 },
  { key: 55, L: -0.3833, M: 4.496, S: 0.08727 },
  { key: 65, L: -0.3833, M: 7.043, S: 0.08434 },
  { key: 75, L: -0.3833, M: 9.335, S: 0.08305 },
  { key: 85, L: -0.3833, M: 11.491, S: 0.08293 },
  { key: 95, L: -0.3833, M: 13.867, S: 0.0844 },
  { key: 105, L: -0.3833, M: 16.647, S: 0.08857 },
  { key: 115, L: -0.3833, M: 20.098, S: 0.09545 },
  { key: 120, L: -0.3833, M: 22.164, S: 0.0996 },
];

// 4. IMT/U (BMI-for-Age, BAZ) — 60 s.d. 228 bulan (Laki-laki 5-19 tahun)
const BAZ_BOYS: LMSTuple[] = [
  { key: 60, L: -0.7387, M: 15.264, S: 0.0839 },
  { key: 72, L: -0.922, M: 15.324, S: 0.0879 },
  { key: 84, L: -1.116, M: 15.514, S: 0.0933 },
  { key: 96, L: -1.298, M: 15.79, S: 0.0997 },
  { key: 108, L: -1.448, M: 16.142, S: 0.1066 },
  { key: 120, L: -1.551, M: 16.578, S: 0.1131 },
  { key: 132, L: -1.594, M: 17.099, S: 0.1185 },
  { key: 144, L: -1.568, M: 17.694, S: 0.1221 },
  { key: 156, L: -1.474, M: 18.355, S: 0.1235 },
  { key: 168, L: -1.326, M: 19.048, S: 0.123 },
  { key: 180, L: -1.153, M: 19.736, S: 0.1213 },
  { key: 192, L: -0.985, M: 20.386, S: 0.1194 },
  { key: 204, L: -0.848, M: 20.971, S: 0.118 },
  { key: 216, L: -0.752, M: 21.484, S: 0.1173 },
  { key: 228, L: -0.692, M: 21.929, S: 0.1171 },
];

// IMT/U (BMI-for-Age, BAZ) — 60 s.d. 228 bulan (Perempuan 5-19 tahun)
const BAZ_GIRLS: LMSTuple[] = [
  { key: 60, L: -0.8886, M: 15.244, S: 0.09692 },
  { key: 72, L: -1.031, M: 15.272, S: 0.1016 },
  { key: 84, L: -1.163, M: 15.424, S: 0.1072 },
  { key: 96, L: -1.268, M: 15.698, S: 0.1133 },
  { key: 108, L: -1.335, M: 16.089, S: 0.1192 },
  { key: 120, L: -1.356, M: 16.597, S: 0.1243 },
  { key: 132, L: -1.329, M: 17.211, S: 0.1279 },
  { key: 144, L: -1.258, M: 17.905, S: 0.1297 },
  { key: 156, L: -1.157, M: 18.636, S: 0.1296 },
  { key: 168, L: -1.045, M: 19.342, S: 0.1282 },
  { key: 180, L: -0.942, M: 19.961, S: 0.1264 },
  { key: 192, L: -0.865, M: 20.462, S: 0.1248 },
  { key: 204, L: -0.822, M: 20.844, S: 0.1238 },
  { key: 216, L: -0.809, M: 21.125, S: 0.1234 },
  { key: 228, L: -0.818, M: 21.339, S: 0.1234 },
];

function interpolateLMS(table: LMSTuple[], targetKey: number): { L: number; M: number; S: number } {
  if (targetKey <= table[0].key) return table[0];
  const last = table[table.length - 1];
  if (targetKey >= last.key) return last;

  for (let i = 0; i < table.length - 1; i++) {
    const a = table[i];
    const b = table[i + 1];
    if (targetKey >= a.key && targetKey <= b.key) {
      const span = b.key - a.key;
      const ratio = span !== 0 ? (targetKey - a.key) / span : 0;
      return {
        L: a.L + (b.L - a.L) * ratio,
        M: a.M + (b.M - a.M) * ratio,
        S: a.S + (b.S - a.S) * ratio,
      };
    }
  }
  return last;
}

/**
 * Hitung Z-Score WHO standar menggunakan metode Box-Cox (LMS) + pembatasan tail (> +3 SD atau < -3 SD)
 */
function computeLMSZScore(measurement: number, lms: { L: number; M: number; S: number }): number {
  const { L, M, S } = lms;
  if (!Number.isFinite(measurement) || measurement <= 0 || !Number.isFinite(M) || M <= 0 || !Number.isFinite(S) || S <= 0) {
    return 0;
  }

  let z: number;
  if (Math.abs(L) < 1e-6) {
    z = Math.log(measurement / M) / S;
  } else {
    z = (Math.pow(measurement / M, L) - 1) / (L * S);
  }

  if (!Number.isFinite(z)) return 0;

  // Penyesuaian ekstrem WHO untuk z > 3 atau z < -3 sesuai panduan WHO 2006
  if (z > 3) {
    const base3 = 1 + L * S * 3;
    const base2 = 1 + L * S * 2;
    if (base3 > 0 && base2 > 0) {
      const sd3pos = M * Math.pow(base3, 1 / L);
      const sd2pos = M * Math.pow(base2, 1 / L);
      const sd23pos = sd3pos - sd2pos;
      if (Number.isFinite(sd23pos) && sd23pos > 0) {
        z = 3 + (measurement - sd3pos) / sd23pos;
      }
    }
  } else if (z < -3) {
    const baseNeg3 = 1 + L * S * -3;
    const baseNeg2 = 1 + L * S * -2;
    if (baseNeg3 > 0 && baseNeg2 > 0) {
      const sd3neg = M * Math.pow(baseNeg3, 1 / L);
      const sd2neg = M * Math.pow(baseNeg2, 1 / L);
      const sd23neg = sd2neg - sd3neg;
      if (Number.isFinite(sd23neg) && sd23neg > 0) {
        z = -3 + (measurement - sd3neg) / sd23neg;
      }
    }
  }

  if (!Number.isFinite(z)) return 0;
  return Number(Math.max(-6, Math.min(6, z)).toFixed(2));
}

export function calculateWHOZScore(params: {
  ageMonths: number;
  gender: ChildGender;
  weightKg: number;
  heightCm: number;
}): ZScoreResult {
  const rawAge = Number(params.ageMonths);
  const rawWeight = Number(params.weightKg);
  const rawHeight = Number(params.heightCm);
  const ageMonths = Math.max(0, Math.min(228, Number.isFinite(rawAge) ? rawAge : 0));
  const weightKg = Math.max(1, Number.isFinite(rawWeight) ? rawWeight : 1);
  const heightCm = Math.max(30, Number.isFinite(rawHeight) ? rawHeight : 30);
  const heightM = heightCm / 100;
  const rawBmi = heightM > 0 ? weightKg / (heightM * heightM) : 0;
  const bmi = Number((Number.isFinite(rawBmi) ? rawBmi : 0).toFixed(2));

  // 1. TB/U (HAZ)
  const hazLms = interpolateLMS(params.gender === 'L' ? HAZ_BOYS : HAZ_GIRLS, ageMonths);
  const haz = computeLMSZScore(heightCm, hazLms);

  // 2. BB/U (WAZ) — tersedia hingga 120 bulan (10 tahun) sesuai Permenkes/WHO 2007
  const waz =
    ageMonths <= 120
      ? computeLMSZScore(weightKg, interpolateLMS(params.gender === 'L' ? WAZ_BOYS : WAZ_GIRLS, ageMonths))
      : null;

  // 3. BB/TB (untuk <= 60 bulan jika tinggi 45-120 cm) atau IMT/U (untuk > 60 bulan)
  let whz: number;
  let whzIndexLabel: 'BB/TB' | 'IMT/U';
  if (ageMonths <= 60 && heightCm >= 45 && heightCm <= 120) {
    whzIndexLabel = 'BB/TB';
    const whzLms = interpolateLMS(params.gender === 'L' ? WHZ_BOYS : WHZ_GIRLS, heightCm);
    whz = computeLMSZScore(weightKg, whzLms);
  } else {
    whzIndexLabel = 'IMT/U';
    const bazLms = interpolateLMS(params.gender === 'L' ? BAZ_BOYS : BAZ_GIRLS, Math.max(60, ageMonths));
    whz = computeLMSZScore(bmi, bazLms);
  }

  // Klasifikasi Permenkes No. 2 Tahun 2020
  const hazCategory =
    haz < -3
      ? 'Sangat Pendek (Severely Stunted)'
      : haz < -2
      ? 'Pendek (Stunting)'
      : haz > 3
      ? 'Tinggi'
      : 'Normal';

  const wazCategory =
    waz === null
      ? 'Tidak dinilai (>10 thn)'
      : waz < -3
      ? 'Berat Badan Sangat Kurang (Severely Underweight)'
      : waz < -2
      ? 'Berat Badan Kurang (Underweight)'
      : waz > 1
      ? 'Risiko Berat Badan Lebih'
      : 'Berat Badan Normal';

  const whzCategory =
    whz < -3
      ? 'Gizi Buruk (Severely Wasted)'
      : whz < -2
      ? 'Gizi Kurang (Wasting)'
      : whz > 2
      ? whz > 3
        ? 'Obesitas'
        : 'Gizi Lebih'
      : whz > 1 && ageMonths <= 60
      ? 'Berisiko Gizi Lebih'
      : 'Gizi Baik (Normal)';

  const isStunted = haz < -2;
  const isUnderweight = waz !== null && waz < -2;
  const isWasted = whz < -2;
  const isOverweight = whz > 2;

  const summaryBadges: NutritionClinicalStatus[] = [];
  if (isWasted) summaryBadges.push('Wasting');
  if (isStunted) summaryBadges.push('Stunting');
  if (isUnderweight) summaryBadges.push('Underweight');
  if (isOverweight && summaryBadges.length === 0) summaryBadges.push('Gizi Lebih');
  if (summaryBadges.length === 0) summaryBadges.push('Normal');

  // Prioritas status klinis (akut -> kronis -> BB/U -> lebih -> normal)
  let primaryStatus: NutritionClinicalStatus = 'Normal';
  if (isWasted) primaryStatus = 'Wasting';
  else if (isStunted) primaryStatus = 'Stunting';
  else if (isUnderweight) primaryStatus = 'Underweight';
  else if (isOverweight) primaryStatus = 'Gizi Lebih';

  let severityLevel: ZScoreResult['severityLevel'] = 'Aman';
  if (haz < -3 || whz < -3 || (waz !== null && waz < -3)) {
    severityLevel = 'Berat';
  } else if (isStunted || isUnderweight || isWasted) {
    severityLevel = 'Sedang';
  } else if (isOverweight) {
    severityLevel = 'Risiko Lebih';
  }

  let recommendation = 'Pertahankan asupan MBG seimbang dan pemantauan berat/tinggi badan berkala tiap bulan.';
  if (severityLevel === 'Berat') {
    recommendation =
      'PRIORITAS RUJUKAN: Z-Score di bawah -3 SD. Segera koordinasikan dengan Ahli Gizi SPPG & Puskesmas setempat untuk tata laksana gizi buruk/stunting berat dan pemantauan intensif.';
  } else if (isWasted) {
    recommendation =
      'Intervensi Akut: Berikan tambahan asupan protein hewani padat energi & evaluasi daya habis ompreng harian anak selama 14–30 hari.';
  } else if (isStunted) {
    recommendation =
      'Intervensi Stunting: Prioritaskan menu tinggi protein hewani (telur, ikan, ayam), kalsium & zat besi serta edukasi pola makan keluarga.';
  } else if (isUnderweight) {
    recommendation =
      'Intervensi Berat Badan Kurang: Tingkatkan densitas energi & protein porsi harian serta pantau kenaikan berat badan tiap 2 minggu.';
  } else if (isOverweight) {
    recommendation =
      'Edukasi porsi seimbang kaya serat (sayur & buah) serta anjuran aktivitas fisik rutin di sekolah.';
  }

  return {
    ageMonths,
    gender: params.gender,
    weightKg,
    heightCm,
    bmi,
    waz,
    haz,
    whz,
    whzIndexLabel,
    wazCategory,
    hazCategory,
    whzCategory,
    isStunted,
    isUnderweight,
    isWasted,
    isOverweight,
    primaryStatus,
    severityLevel,
    summaryBadges,
    recommendation,
  };
}

/**
 * Hitung usia dalam bulan dari tanggal lahir (YYYY-MM-DD) hingga tanggal ukur
 */
export function calculateAgeInMonths(birthDateStr: string, referenceDateStr?: string): number {
  const birth = new Date(`${birthDateStr}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return 0;
  const ref = referenceDateStr ? new Date(`${referenceDateStr}T00:00:00`) : new Date();
  if (Number.isNaN(ref.getTime())) return 0;

  let months = (ref.getFullYear() - birth.getFullYear()) * 12 + (ref.getMonth() - birth.getMonth());
  if (ref.getDate() < birth.getDate()) {
    months -= 1;
  }
  return Math.max(0, Math.min(228, months));
}

/**
 * Normalisasi NIK hanya angka 16 digit
 */
export function normalizeNik(input: string): string {
  return String(input || '').replace(/\D/g, '').slice(0, 16);
}

/**
 * Validasi ketat format NIK Kependudukan Indonesia (16 digit numerik)
 */
export function validateNikFormat(rawNik: string): { valid: boolean; cleanNik: string; error?: string } {
  const cleanNik = normalizeNik(rawNik);
  if (!cleanNik) {
    return { valid: false, cleanNik, error: 'NIK wajib diisi (16 digit angka).' };
  }
  if (!/^\d{16}$/.test(cleanNik)) {
    return {
      valid: false,
      cleanNik,
      error: `NIK harus tepat 16 digit angka (saat ini ${cleanNik.length} digit).`,
    };
  }
  if (/^(\d)\1{15}$/.test(cleanNik)) {
    return { valid: false, cleanNik, error: 'Format NIK tidak valid (digit berulang seluruhnya).' };
  }
  const provCode = Number(cleanNik.slice(0, 2));
  if (provCode < 11 || provCode > 96) {
    return { valid: false, cleanNik, error: 'Kode provinsi NIK (2 digit awal) tidak valid.' };
  }
  return { valid: true, cleanNik };
}
