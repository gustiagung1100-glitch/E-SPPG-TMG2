import {
  DashboardDensity,
  DashboardKpiColumns,
  DashboardLayoutConfig,
  DashboardSectionConfig,
  DashboardSectionId,
  DashboardSectionWidth,
  RoleType,
} from '../types';
import { ALL_ROLES_LIST } from './routeGuard';

export const DASHBOARD_LAYOUT_STORAGE_KEY = 'esppg_dashboard_layout_config_v1';

export interface DashboardSectionMeta {
  id: DashboardSectionId;
  title: string;
  description: string;
  category: 'Ringkasan Utama' | 'Operasional Dapur' | 'Keuangan & Stok' | 'Gizi & Kepatuhan';
  defaultWidth: DashboardSectionWidth;
  isSensitive?: boolean;
}

export const DASHBOARD_SECTIONS_META: readonly DashboardSectionMeta[] = [
  {
    id: 'welcome_banner',
    title: 'Banner Sambutan & Pintasan Cepat',
    description: 'Identitas SPPG aktif beserta tombol pintasan Laporan BGN & Pantau Distribusi.',
    category: 'Ringkasan Utama',
    defaultWidth: 'full',
  },
  {
    id: 'critical_alerts',
    title: 'Peringatan Operasional Kritis',
    description: 'Notifikasi bahan di bawah batas minimum, PO menunggu verifikasi, & relawan absen.',
    category: 'Ringkasan Utama',
    defaultWidth: 'full',
  },
  {
    id: 'beneficiary_kpi',
    title: '1. Penerima Manfaat & Kapasitas Porsi',
    description: 'Kartu KPI jumlah siswa, lembaga mitra, porsi kecil, porsi besar, dan total harian.',
    category: 'Ringkasan Utama',
    defaultWidth: 'full',
  },
  {
    id: 'today_menu',
    title: 'Menu Gizi Hari Ini',
    description: 'Rincian 5 komponen hidangan harian, angka kalori, protein, karbohidrat, & food cost.',
    category: 'Operasional Dapur',
    defaultWidth: 'third',
  },
  {
    id: 'kitchen_progress',
    title: 'Progres Tugas Divisi Dapur',
    description: 'Persentase penyelesaian Divisi Persiapan, Pengolahan, Pemorsian, Distribusi, & Cuci.',
    category: 'Operasional Dapur',
    defaultWidth: 'third',
  },
  {
    id: 'distribution_status',
    title: 'Status Distribusi Armada',
    description: 'Rekap jumlah pengiriman selesai BAST, dalam perjalanan, dan kloter terjadwal.',
    category: 'Operasional Dapur',
    defaultWidth: 'third',
  },
  {
    id: 'finance_petty_cash',
    title: '2. Kas Petty Cash & Purchase Order',
    description: 'Saldo awal, total PO pengadaan, pemasukan, pengeluaran, & saldo akhir kas kecil.',
    category: 'Keuangan & Stok',
    defaultWidth: 'full',
    isSensitive: true,
  },
  {
    id: 'inventory_admin_kpi',
    title: 'Ringkasan Stok Gudang, SDM, Surat & BGN',
    description: 'Indikator item stok gudang, relawan tidak hadir, tata persuratan, & kelengkapan BGN.',
    category: 'Keuangan & Stok',
    defaultWidth: 'full',
  },
  {
    id: 'waste_rejected_charts',
    title: '3. Grafik Food Waste & Bahan Rijek Harian',
    description: 'Grafik harian sisa makanan Divisi Cuci Ompreng & daftar bahan rijek Divisi Persiapan.',
    category: 'Operasional Dapur',
    defaultWidth: 'full',
  },
  {
    id: 'nutrition_who',
    title: '4. Pemantauan Status Gizi Anak & Z-Score WHO',
    description: 'Statistik anak terpantau, normal, stunting, underweight/wasting, & prioritas intervensi.',
    category: 'Gizi & Kepatuhan',
    defaultWidth: 'full',
    isSensitive: true,
  },
  {
    id: 'plog_daily_sop',
    title: '5. SOP & Jobdesk Divisi Dapur MBG (Harian — PLOG)',
    description: 'Tampilan otomatis harian SOP & Jobdesk 5 divisi dapur lengkap dengan foto dokumentasi.',
    category: 'Gizi & Kepatuhan',
    defaultWidth: 'full',
  },
];

export const LEADERSHIP_AND_SUPERVISOR_ROLES: readonly RoleType[] = [
  'Admin Utama',
  'Kepala SPPG',
  'Pengawas Gizi',
  'Pengawas Keuangan',
  'Asisten Lapangan',
];

const VALID_SECTION_IDS = new Set<DashboardSectionId>(DASHBOARD_SECTIONS_META.map(m => m.id));
const VALID_WIDTHS = new Set<DashboardSectionWidth>(['full', 'half', 'third']);
const VALID_DENSITIES = new Set<DashboardDensity>(['compact', 'comfortable', 'spacious']);
const VALID_ROLES = new Set<RoleType>(ALL_ROLES_LIST);

const normalizeEmailList = (input: unknown): string[] => {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of input) {
    if (typeof item !== 'string') continue;
    const normalized = item.trim().toLowerCase();
    if (!normalized || !normalized.includes('@')) continue;
    if (!seen.has(normalized)) {
      seen.add(normalized);
      result.push(normalized);
    }
  }
  return result;
};

export function buildDefaultDashboardLayoutConfig(): DashboardLayoutConfig {
  const sections = {} as Record<DashboardSectionId, DashboardSectionConfig>;
  for (const meta of DASHBOARD_SECTIONS_META) {
    sections[meta.id] = {
      id: meta.id,
      enabled: true,
      width: meta.defaultWidth,
      allowedRoles: [...ALL_ROLES_LIST],
      allowedEmails: [],
      blockedEmails: [],
    };
  }

  return {
    sectionOrder: DASHBOARD_SECTIONS_META.map(m => m.id),
    density: 'comfortable',
    kpiColumns: 'auto',
    sections,
  };
}

export function sanitizeDashboardLayoutConfig(raw: unknown): DashboardLayoutConfig {
  const defaults = buildDefaultDashboardLayoutConfig();
  if (!raw || typeof raw !== 'object') return defaults;

  const incoming = raw as Partial<DashboardLayoutConfig>;

  const density: DashboardDensity =
    incoming.density && VALID_DENSITIES.has(incoming.density)
      ? incoming.density
      : defaults.density;

  const kpiColumns: DashboardKpiColumns =
    incoming.kpiColumns === 'auto' ||
    incoming.kpiColumns === 2 ||
    incoming.kpiColumns === 3 ||
    incoming.kpiColumns === 4 ||
    incoming.kpiColumns === 5
      ? incoming.kpiColumns
      : defaults.kpiColumns;

  const ordered: DashboardSectionId[] = [];
  const seenOrder = new Set<DashboardSectionId>();
  if (Array.isArray(incoming.sectionOrder)) {
    for (const id of incoming.sectionOrder) {
      if (typeof id === 'string' && VALID_SECTION_IDS.has(id as DashboardSectionId)) {
        const typedId = id as DashboardSectionId;
        if (!seenOrder.has(typedId)) {
          seenOrder.add(typedId);
          ordered.push(typedId);
        }
      }
    }
  }
  for (const meta of DASHBOARD_SECTIONS_META) {
    if (!seenOrder.has(meta.id)) {
      seenOrder.add(meta.id);
      ordered.push(meta.id);
    }
  }

  const sections = {} as Record<DashboardSectionId, DashboardSectionConfig>;
  const rawSections =
    incoming.sections && typeof incoming.sections === 'object'
      ? (incoming.sections as Record<string, Partial<DashboardSectionConfig> | undefined>)
      : {};

  for (const meta of DASHBOARD_SECTIONS_META) {
    const def = defaults.sections[meta.id];
    const cand = rawSections[meta.id];

    if (!cand || typeof cand !== 'object') {
      sections[meta.id] = { ...def };
      continue;
    }

    const width: DashboardSectionWidth =
      cand.width && VALID_WIDTHS.has(cand.width) ? cand.width : def.width;

    const enabled = typeof cand.enabled === 'boolean' ? cand.enabled : def.enabled;

    let allowedRoles: RoleType[] = [...ALL_ROLES_LIST];
    if (Array.isArray(cand.allowedRoles)) {
      const roleSet = new Set<RoleType>(['Admin Utama']);
      for (const r of cand.allowedRoles) {
        if (typeof r === 'string' && VALID_ROLES.has(r as RoleType)) {
          roleSet.add(r as RoleType);
        }
      }
      allowedRoles = ALL_ROLES_LIST.filter(r => roleSet.has(r));
    }

    const blockedEmails = normalizeEmailList(cand.blockedEmails);
    const blockedSet = new Set(blockedEmails);
    const allowedEmails = normalizeEmailList(cand.allowedEmails).filter(e => !blockedSet.has(e));

    sections[meta.id] = {
      id: meta.id,
      enabled,
      width,
      allowedRoles,
      allowedEmails,
      blockedEmails,
    };
  }

  return {
    sectionOrder: ordered,
    density,
    kpiColumns,
    sections,
    updatedAt: typeof incoming.updatedAt === 'string' ? incoming.updatedAt : undefined,
    updatedBy: typeof incoming.updatedBy === 'string' ? incoming.updatedBy : undefined,
  };
}

export function canUserViewDashboardSection(
  sectionConfig: DashboardSectionConfig,
  user: { role: RoleType; email?: string },
  options?: {
    simulatedRole?: RoleType | null;
    ignoreAdminBypass?: boolean;
  }
): boolean {
  if (!sectionConfig.enabled) return false;

  if (options?.simulatedRole) {
    if (options.simulatedRole === 'Admin Utama') return true;
    return sectionConfig.allowedRoles.includes(options.simulatedRole);
  }

  if (!options?.ignoreAdminBypass && user.role === 'Admin Utama') {
    return true;
  }

  const normalizedEmail = (user.email || '').trim().toLowerCase();
  if (normalizedEmail && sectionConfig.blockedEmails.includes(normalizedEmail)) {
    return false;
  }
  if (normalizedEmail && sectionConfig.allowedEmails.includes(normalizedEmail)) {
    return true;
  }

  return sectionConfig.allowedRoles.includes(user.role);
}
