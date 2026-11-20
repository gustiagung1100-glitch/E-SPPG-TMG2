import { MasterVolunteer } from '../types';

export type VolunteerDivisionCategory =
  | 'Persiapan'
  | 'Pengolahan'
  | 'Pemorsian'
  | 'Distribusi'
  | 'Cuci Ompreng'
  | 'Kebersihan'
  | 'Keamanan';

/**
 * Menentukan urutan prioritas jabatan relawan:
 * 0 = Koordinator Divisi (selalu urutan teratas/pertama)
 * 1 = Wakil Koordinator
 * 2 = Jabatan lainnya (diurutkan alfabetis berdasarkan nama)
 */
export function getVolunteerPositionPriority(position?: string): number {
  const pos = (position || '').trim().toLowerCase();
  if (!pos) return 2;
  if (pos === 'koordinator divisi' || (pos.includes('koordinator') && !pos.includes('wakil'))) {
    return 0;
  }
  if (pos.includes('wakil koordinator') || pos.includes('wakil')) {
    return 1;
  }
  return 2;
}

export function isCoordinatorPosition(position?: string): boolean {
  return getVolunteerPositionPriority(position) === 0;
}

/**
 * Mengambil daftar relawan aktif sesuai kategori divisi dari Master Relawan,
 * dengan jabatan Koordinator Divisi selalu ditempatkan di urutan paling atas/pertama.
 */
export function getSortedVolunteersByDivision(
  volunteers: MasterVolunteer[],
  division: VolunteerDivisionCategory | string
): MasterVolunteer[] {
  return volunteers
    .filter(v => v.isActive && v.division === division)
    .slice()
    .sort((a, b) => {
      const rankDiff =
        getVolunteerPositionPriority(a.position) - getVolunteerPositionPriority(b.position);
      if (rankDiff !== 0) return rankDiff;
      return a.name.localeCompare(b.name, 'id-ID');
    });
}

export function formatVolunteerOptionValue(v: MasterVolunteer): string {
  return v.position ? `${v.name} (${v.position})` : v.name;
}

export function formatVolunteerOptionLabel(v: MasterVolunteer): string {
  const isCoord = isCoordinatorPosition(v.position);
  return isCoord
    ? `★ ${v.name} — ${v.position}`
    : `${v.name} — ${v.position}`;
}

export interface VolunteerSelectOption {
  value: string;
  label: string;
  volunteer: MasterVolunteer;
}

export function getDivisionOfficerSelectOptions(
  volunteers: MasterVolunteer[],
  division: VolunteerDivisionCategory | string
): VolunteerSelectOption[] {
  return getSortedVolunteersByDivision(volunteers, division).map(v => ({
    value: formatVolunteerOptionValue(v),
    label: formatVolunteerOptionLabel(v),
    volunteer: v,
  }));
}

export function getDefaultDivisionOfficerName(
  volunteers: MasterVolunteer[],
  division: VolunteerDivisionCategory | string,
  fallback = ''
): string {
  const sorted = getSortedVolunteersByDivision(volunteers, division);
  if (sorted.length > 0) {
    return formatVolunteerOptionValue(sorted[0]);
  }
  return fallback;
}
