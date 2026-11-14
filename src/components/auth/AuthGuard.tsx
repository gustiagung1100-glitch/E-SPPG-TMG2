import React, { useEffect, useState, useCallback } from 'react';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { useApp } from '../../lib/store';
import { ModuleKey } from '../../types';
import {
  LOGIN_PATH,
  FORBIDDEN_PATH,
  resolveRouteFromPathname,
  getDefaultModuleForRole,
  getPathForModule,
  canRoleAccessModule,
  normalizePathname,
} from '../../lib/routeGuard';
import { LoginPage } from './LoginPage';
import { Forbidden403Page } from './Forbidden403Page';

interface AuthGuardProps {
  children: (props: {
    activeModule: ModuleKey;
    navigateToModule: (module: ModuleKey) => void;
  }) => React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { authReady, isAuthenticated, currentUser, addToast } = useApp();
  const [pathname, setPathname] = useState<string>(() =>
    typeof window !== 'undefined' ? normalizePathname(window.location.pathname) : LOGIN_PATH
  );
  const [deniedPath, setDeniedPath] = useState<string | undefined>(undefined);

  // Sync browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      setPathname(normalizePathname(window.location.pathname));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateToModule = useCallback(
    (module: ModuleKey) => {
      if (!isAuthenticated || !currentUser.isActive) {
        if (window.location.pathname !== LOGIN_PATH) {
          window.history.replaceState(null, '', LOGIN_PATH);
        }
        setPathname(LOGIN_PATH);
        return;
      }

      if (!canRoleAccessModule(currentUser.role, module)) {
        const targetBlocked = getPathForModule(module);
        setDeniedPath(targetBlocked);
        window.history.pushState(null, '', FORBIDDEN_PATH);
        setPathname(FORBIDDEN_PATH);
        addToast(
          'error',
          '403 - Akses Ditolak',
          `Peran ${currentUser.role} tidak memiliki otorisasi untuk modul tersebut.`
        );
        return;
      }

      setDeniedPath(undefined);
      const nextPath = getPathForModule(module);
      if (normalizePathname(window.location.pathname) !== nextPath) {
        window.history.pushState(null, '', nextPath);
      }
      setPathname(nextPath);
    },
    [isAuthenticated, currentUser.isActive, currentUser.role, addToast]
  );

  // Global custom event navigation guarded by RBAC
  useEffect(() => {
    const handleCustomNavigate = (e: Event) => {
      const customEvent = e as CustomEvent<ModuleKey>;
      if (customEvent.detail) {
        navigateToModule(customEvent.detail);
      }
    };
    window.addEventListener('navigate-module', handleCustomNavigate);
    return () => window.removeEventListener('navigate-module', handleCustomNavigate);
  }, [navigateToModule]);

  // Enforce URL redirects deterministically whenever auth state or pathname changes
  useEffect(() => {
    if (!authReady) return;

    if (!isAuthenticated || !currentUser.isActive) {
      if (pathname !== LOGIN_PATH) {
        window.history.replaceState(null, '', LOGIN_PATH);
        setPathname(LOGIN_PATH);
      }
      return;
    }

    const resolved = resolveRouteFromPathname(pathname);

    if (resolved.kind === 'login' || resolved.kind === 'root') {
      const defaultMod = getDefaultModuleForRole(currentUser.role);
      const defaultPath = getPathForModule(defaultMod);
      window.history.replaceState(null, '', defaultPath);
      setDeniedPath(undefined);
      setPathname(defaultPath);
      return;
    }

    if (resolved.kind === 'unknown') {
      setDeniedPath(pathname);
      window.history.replaceState(null, '', FORBIDDEN_PATH);
      setPathname(FORBIDDEN_PATH);
      return;
    }

    if (resolved.kind === 'module' && !canRoleAccessModule(currentUser.role, resolved.module)) {
      setDeniedPath(pathname);
      window.history.replaceState(null, '', FORBIDDEN_PATH);
      setPathname(FORBIDDEN_PATH);
    }
  }, [authReady, isAuthenticated, currentUser.isActive, currentUser.role, pathname]);

  // 1. Sembunyikan seluruh data/komponen internal sebelum proses verifikasi autentikasi selesai (anti-FOUC)
  if (!authReady) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="min-h-screen w-full bg-[#071D49] text-white flex flex-col items-center justify-center p-6 select-none"
      >
        <div className="flex flex-col items-center gap-4 max-w-sm text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/10 border border-[#D8AD55]/40 flex items-center justify-center shadow-lg">
            <ShieldCheck className="w-7 h-7 text-[#F2D58B]" />
          </div>
          <div className="flex items-center gap-2.5 text-sm font-bold tracking-wide">
            <Loader2 className="w-4 h-4 animate-spin text-[#F2D58B]" />
            <span>Memverifikasi Sesi & Otorisasi...</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Sistem keamanan E-SPPG TMG2 sedang memeriksa validitas token dan hak akses Anda.
          </p>
        </div>
      </div>
    );
  }

  // 2. Blokir total jika belum login -> paksa tampilkan LoginPage di rute /login
  if (!isAuthenticated || !currentUser.isActive) {
    return <LoginPage />;
  }

  // 3. Resolusi Rute & Validasi RBAC di Level Rute
  const resolved = resolveRouteFromPathname(pathname);

  if (resolved.kind === 'forbidden' || resolved.kind === 'unknown') {
    const defaultMod = getDefaultModuleForRole(currentUser.role);
    return (
      <Forbidden403Page
        deniedPath={deniedPath || (resolved.kind === 'unknown' ? pathname : undefined)}
        onBackToHome={() => navigateToModule(defaultMod)}
      />
    );
  }

  if (resolved.kind === 'module') {
    if (!canRoleAccessModule(currentUser.role, resolved.module)) {
      const defaultMod = getDefaultModuleForRole(currentUser.role);
      return (
        <Forbidden403Page
          deniedPath={deniedPath || pathname}
          onBackToHome={() => navigateToModule(defaultMod)}
        />
      );
    }
    return <>{children({ activeModule: resolved.module, navigateToModule })}</>;
  }

  // Fallback untuk root '/' atau '/login' saat transisi replaceState ke default module
  const fallbackModule = getDefaultModuleForRole(currentUser.role);
  return <>{children({ activeModule: fallbackModule, navigateToModule })}</>;
};
