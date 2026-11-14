/**
 * Route-Level Guard & Role-Based Access Control (RBAC) Registry
 * Mengatur pemetaan URL <-> Modul dan validasi hak akses peran di level rute.
 */

import { ModuleKey, RoleType } from '../types';

export const AUTH_SESSION_STORAGE_KEY = 'esppg_auth_session';
export const CURRENT_USER_STORAGE_KEY = 'esppg_current_user';

export const LOGIN_PATH = '/login';
export const FORBIDDEN_PATH = '/403';

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

export function getDefaultModuleForRole(role: RoleType): ModuleKey {
  if (role === 'Supplier / Mitra Pangan') {
    return 'supplier_portal';
  }
  return 'dashboard';
}

export function canRoleAccessModule(role: RoleType, module: ModuleKey): boolean {
  const allowed = ROLE_ALLOWED_MODULES[role];
  if (!allowed) return false;
  return allowed.includes(module);
}
