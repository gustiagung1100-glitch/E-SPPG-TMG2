/**
 * Route-Level Guard & Role-Based Access Control (RBAC) Registry
 * Mengatur pemetaan URL <-> Modul dan validasi hak akses peran di level rute.
 */

import { ModuleKey, RoleModuleAccessMap, RoleType } from '../types';

export const AUTH_SESSION_STORAGE_KEY = 'esppg_auth_session';
export const CURRENT_USER_STORAGE_KEY = 'esppg_current_user';
export const ROLE_MODULE_ACCESS_STORAGE_KEY = 'esppg_role_module_access_v1';

export const LOGIN_PATH = '/login';
export const FORBIDDEN_PATH = '/403';

export interface ModuleMetaInfo {
  key: ModuleKey;
  label: string;
  shortLabel: string;
  category:
    | 'Utama'
    | 'Data Master & Gizi'
    | 'Rantai Pasok'
    | 'Produksi & Logistik'
    | 'Akuntansi & SDM'
    | 'Administrasi & Sistem';
  description: string;
}

export const ALL_MODULES_META: readonly ModuleMetaInfo[] = [
  {
    key: 'dashboard',
    label: 'Dashboard Terpadu',
    shortLabel: 'Dashboard',
    category: 'Utama',
    description: 'Ringkasan operasional, statistik porsi & indikator gizi.',
  },
  {
    key: 'master_data',
    label: 'Master Data Terpadu (A-E)',
    shortLabel: 'Master Data',
    category: 'Data Master & Gizi',
    description: 'Katalog master bahan, supplier, relawan, satuan & konversi.',
  },
  {
    key: 'institutions',
    label: 'Modul Penerima Manfaat',
    shortLabel: 'Penerima Manfaat',
    category: 'Data Master & Gizi',
    description: 'Data sekolah, lembaga, PIC, kuota porsi & presensi siswa.',
  },
  {
    key: 'menu',
    label: 'Perencanaan Menu & Gizi',
    shortLabel: 'Menu & Gizi',
    category: 'Data Master & Gizi',
    description: 'Siklus menu harian, perhitungan AKG, TKPI & verifikasi gizi.',
  },
  {
    key: 'menu_flyer',
    label: 'Flyer Menu Otomatis',
    shortLabel: 'Flyer Menu',
    category: 'Data Master & Gizi',
    description: 'Generator infografis & poster menu gizi harian.',
  },
  {
    key: 'procurement',
    label: 'Modul PLOK (RAB, PO, QC)',
    shortLabel: 'Modul PLOK',
    category: 'Rantai Pasok',
    description: 'Rencana anggaran belanja, Purchase Order & inspeksi QC.',
  },
  {
    key: 'supplier_portal',
    label: 'Portal Mitra Supplier',
    shortLabel: 'Portal Supplier',
    category: 'Rantai Pasok',
    description: 'Pesanan PO bahan masuk, konfirmasi kirim & faktur mitra.',
  },
  {
    key: 'inventory',
    label: 'Gudang & Stok Bahan',
    shortLabel: 'Gudang & Stok',
    category: 'Rantai Pasok',
    description: 'Manajemen stok gudang, batch FIFO & mutasi keluar-masuk.',
  },
  {
    key: 'production',
    label: 'Dapur & Produksi MBG',
    shortLabel: 'Produksi Dapur',
    category: 'Produksi & Logistik',
    description: 'Divisi Persiapan, Pengolahan, Pemorsian, suhu & Cuci Ompreng.',
  },
  {
    key: 'distribution',
    label: 'Distribusi & Armada',
    shortLabel: 'Distribusi',
    category: 'Produksi & Logistik',
    description: 'Jadwal pengiriman armada, BAST sekolah, ompreng kembali & BBM.',
  },
  {
    key: 'finance',
    label: 'Keuangan, RAB & Kas',
    shortLabel: 'Keuangan & Kas',
    category: 'Akuntansi & SDM',
    description: 'Arus kas masuk/keluar, realisasi anggaran & bukti transaksi.',
  },
  {
    key: 'volunteers',
    label: 'Relawan & Ketidakhadiran',
    shortLabel: 'Relawan & SDM',
    category: 'Akuntansi & SDM',
    description: 'Presensi harian relawan, pengajuan izin & penggantian shift.',
  },
  {
    key: 'letters',
    label: 'Tata Persuratan & SPK',
    shortLabel: 'Persuratan',
    category: 'Administrasi & Sistem',
    description: 'Surat masuk, surat keluar resmi, disposisi & template SPK.',
  },
  {
    key: 'reports',
    label: 'Dokumentasi & Laporan BGN',
    shortLabel: 'Laporan BGN',
    category: 'Administrasi & Sistem',
    description: '20 laporan resmi standar BGN, ekspor PDF, Excel & CSV.',
  },
  {
    key: 'settings',
    label: 'Pengaturan & Hak Akses',
    shortLabel: 'Pengaturan',
    category: 'Administrasi & Sistem',
    description: 'Profil SPPG, login web, matriks RBAC, backup database & audit.',
  },
];

export const ALL_ROLES_LIST: readonly RoleType[] = [
  'Admin Utama',
  'Kepala SPPG',
  'Pengawas Gizi',
  'Pengawas Keuangan',
  'Asisten Lapangan',
  'Admin Gudang',
  'Cheff',
  'Relawan Div. Persiapan',
  'Relawan Div. Pengolahan',
  'Relawan Div. Pemorsian',
  'Relawan Div. Distribusi',
  'Relawan Div. Cuci Ompreng',
  'Supplier / Mitra Pangan',
];

export const MODULE_PATHS: Record<ModuleKey, string> = {
  dashboard: '/dashboard',
  master_data: '/master-data',
  institutions: '/penerima-manfaat',
  menu: '/menu',
  menu_flyer: '/menu-flyer',
  procurement: '/plok',
  supplier_portal: '/portal-supplier',
  inventory: '/gudang',
  production: '/produksi',
  distribution: '/distribusi',
  finance: '/keuangan',
  volunteers: '/relawan',
  letters: '/persuratan',
  reports: '/laporan',
  settings: '/pengaturan',
};

const PATH_TO_MODULE: Record<string, ModuleKey> = {
  '/dashboard': 'dashboard',
  '/master-data': 'master_data',
  '/penerima-manfaat': 'institutions',
  '/beneficiaries': 'institutions',
  '/institutions': 'institutions',
  '/menu': 'menu',
  '/menu-flyer': 'menu_flyer',
  '/plok': 'procurement',
  '/procurement': 'procurement',
  '/portal-supplier': 'supplier_portal',
  '/supplier-portal': 'supplier_portal',
  '/gudang': 'inventory',
  '/inventory': 'inventory',
  '/produksi': 'production',
  '/production': 'production',
  '/distribusi': 'distribution',
  '/distribution': 'distribution',
  '/keuangan': 'finance',
  '/finance': 'finance',
  '/relawan': 'volunteers',
  '/volunteers': 'volunteers',
  '/persuratan': 'letters',
  '/letters': 'letters',
  '/laporan': 'reports',
  '/reports': 'reports',
  '/pengaturan': 'settings',
  '/pengaturan-admin': 'settings',
  '/settings': 'settings',
  '/admin': 'settings',
};

export const ROLE_ALLOWED_MODULES: Record<RoleType, readonly ModuleKey[]> = {
  'Admin Utama': [
    'dashboard',
    'master_data',
    'institutions',
    'menu',
    'menu_flyer',
    'procurement',
    'supplier_portal',
    'inventory',
    'production',
    'distribution',
    'finance',
    'volunteers',
    'letters',
    'reports',
    'settings',
  ],
  'Kepala SPPG': [
    'dashboard',
    'master_data',
    'institutions',
    'menu',
    'menu_flyer',
    'procurement',
    'supplier_portal',
    'inventory',
    'production',
    'distribution',
    'finance',
    'volunteers',
    'letters',
    'reports',
    'settings',
  ],
  'Pengawas Gizi': [
    'dashboard',
    'master_data',
    'institutions',
    'menu',
    'menu_flyer',
    'procurement',
    'production',
    'reports',
  ],
  'Pengawas Keuangan': [
    'dashboard',
    'procurement',
    'finance',
    'letters',
    'reports',
  ],
  'Asisten Lapangan': [
    'dashboard',
    'institutions',
    'distribution',
    'volunteers',
    'letters',
    'reports',
  ],
  'Admin Gudang': [
    'dashboard',
    'master_data',
    'procurement',
    'supplier_portal',
    'inventory',
    'production',
    'reports',
  ],
  'Cheff': [
    'dashboard',
    'menu',
    'menu_flyer',
    'inventory',
    'production',
    'reports',
  ],
  'Relawan Div. Persiapan': [
    'dashboard',
    'menu',
    'inventory',
    'production',
    'volunteers',
    'reports',
  ],
  'Relawan Div. Pengolahan': [
    'dashboard',
    'menu',
    'production',
    'volunteers',
    'reports',
  ],
  'Relawan Div. Pemorsian': [
    'dashboard',
    'institutions',
    'menu',
    'production',
    'volunteers',
    'reports',
  ],
  'Relawan Div. Distribusi': [
    'dashboard',
    'institutions',
    'distribution',
    'volunteers',
    'letters',
    'reports',
  ],
  'Relawan Div. Cuci Ompreng': [
    'dashboard',
    'production',
    'distribution',
    'volunteers',
    'reports',
  ],
  'Supplier / Mitra Pangan': [
    'supplier_portal',
    'settings',
  ],
};

const VALID_MODULE_KEYS = new Set<ModuleKey>(ALL_MODULES_META.map(m => m.key));

export function buildDefaultRoleModuleAccess(): RoleModuleAccessMap {
  const result = {} as RoleModuleAccessMap;
  for (const role of ALL_ROLES_LIST) {
    result[role] = [...ROLE_ALLOWED_MODULES[role]];
  }
  return result;
}

export function sanitizeRoleModuleAccess(raw: unknown): RoleModuleAccessMap {
  const defaults = buildDefaultRoleModuleAccess();
  if (!raw || typeof raw !== 'object') return defaults;

  const incoming = raw as Record<string, unknown>;
  const sanitized = {} as RoleModuleAccessMap;

  for (const role of ALL_ROLES_LIST) {
    if (role === 'Admin Utama') {
      // Admin Utama selalu memiliki akses penuh ke seluruh modul agar tidak terkunci
      sanitized[role] = ALL_MODULES_META.map(m => m.key);
      continue;
    }

    const candidate = incoming[role];
    if (Array.isArray(candidate)) {
      const seen = new Set<ModuleKey>();
      const cleaned: ModuleKey[] = [];
      for (const item of candidate) {
        if (typeof item === 'string' && VALID_MODULE_KEYS.has(item as ModuleKey)) {
          const mod = item as ModuleKey;
          if (!seen.has(mod)) {
            seen.add(mod);
            cleaned.push(mod);
          }
        }
      }
      sanitized[role] = cleaned;
    } else {
      sanitized[role] = [...defaults[role]];
    }
  }

  return sanitized;
}

export function normalizePathname(pathname: string): string {
  const clean = pathname.split('?')[0].split('#')[0].trim().toLowerCase();
  if (clean.length > 1 && clean.endsWith('/')) {
    return clean.slice(0, -1);
  }
  return clean || '/';
}

export type ResolvedRoute =
  | { kind: 'login' }
  | { kind: 'forbidden' }
  | { kind: 'root' }
  | { kind: 'module'; module: ModuleKey }
  | { kind: 'unknown' };

export function resolveRouteFromPathname(pathname: string): ResolvedRoute {
  const normalized = normalizePathname(pathname);
  if (normalized === '/' || normalized === '/index.html') return { kind: 'root' };
  if (normalized === LOGIN_PATH) return { kind: 'login' };
  if (normalized === FORBIDDEN_PATH) return { kind: 'forbidden' };
  const mod = PATH_TO_MODULE[normalized];
  if (mod) return { kind: 'module', module: mod };
  return { kind: 'unknown' };
}

export function getPathForModule(module: ModuleKey): string {
  return MODULE_PATHS[module] || '/dashboard';
}

export function getDefaultModuleForRole(
  role: RoleType,
  customMap?: RoleModuleAccessMap
): ModuleKey {
  const allowed = customMap?.[role] ?? ROLE_ALLOWED_MODULES[role] ?? [];
  if (role === 'Supplier / Mitra Pangan') {
    if (allowed.includes('supplier_portal')) return 'supplier_portal';
    return allowed[0] || 'supplier_portal';
  }
  if (allowed.includes('dashboard')) return 'dashboard';
  return allowed[0] || 'dashboard';
}

export function canRoleAccessModule(
  role: RoleType,
  module: ModuleKey,
  customMap?: RoleModuleAccessMap
): boolean {
  if (role === 'Admin Utama') return true;
  const allowed = customMap?.[role] ?? ROLE_ALLOWED_MODULES[role];
  if (!allowed) return false;
  return allowed.includes(module);
}
