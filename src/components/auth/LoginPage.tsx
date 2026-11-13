import React, { useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useApp, initialUsers, resolveUserByIdentifier } from '../../lib/store';
import { verifyLoginPassword, isProtectedSuperAdminEmail } from '../../lib/authCrypto';
import { saveDocument, CURRENT_SPPG_ID } from '../../lib/databaseService';
import { RoleType, UserProfile } from '../../types';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  ArrowLeft,
  User,
  Sparkles,
  Utensils,
  PackageCheck,
  BarChart3,
  ChevronDown,
} from 'lucide-react';

const BGN_LOGO_PRIMARY =
  '/assets/aistudio/Badan_Gizi_Nasional__BGN__Logo_-_Colored_-_zonalogo.com_5e10d066.png';
const BGN_LOGO_FALLBACK = '/logo-sppg.png';

const REMEMBERED_ID_KEY = 'esppg_remembered_identifier';

const LIGHT_PARTICLES = [
  { top: '16%', left: '14%', size: 'w-1.5 h-1.5', delay: '0s', duration: '8s' },
  { top: '28%', left: '78%', size: 'w-2 h-2', delay: '1.4s', duration: '10s' },
  { top: '42%', left: '24%', size: 'w-1 h-1', delay: '2.6s', duration: '9s' },
  { top: '58%', left: '84%', size: 'w-1.5 h-1.5', delay: '0.8s', duration: '11s' },
  { top: '72%', left: '18%', size: 'w-2 h-2', delay: '3.2s', duration: '9.5s' },
  { top: '81%', left: '62%', size: 'w-1.5 h-1.5', delay: '1.9s', duration: '10.5s' },
  { top: '22%', left: '48%', size: 'w-1 h-1', delay: '4.1s', duration: '8.5s' },
  { top: '65%', left: '44%', size: 'w-1.5 h-1.5', delay: '2.2s', duration: '11.5s' },
];

function mapFirebaseAuthError(err: any): string {
  const code = err?.code || '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Email/username atau kata sandi tidak sesuai. Periksa kembali kredensial Anda.';
    case 'auth/invalid-email':
      return 'Format email atau username tidak valid. Gunakan email yang didaftarkan Admin Utama.';
    case 'auth/user-disabled':
      return 'Akun ini telah dinonaktifkan oleh Administrator SPPG.';
    case 'auth/too-many-requests':
      return 'Terlalu banyak percobaan gagal. Silakan tunggu beberapa saat sebelum mencoba lagi.';
    case 'auth/email-already-in-use':
      return 'Email ini sudah terdaftar. Silakan masuk menggunakan kata sandi Anda.';
    case 'auth/weak-password':
      return 'Kata sandi terlalu lemah. Gunakan minimal 6 karakter kombinasi huruf dan angka.';
    case 'auth/network-request-failed':
      return 'Koneksi internet terganggu. Periksa jaringan Anda lalu coba kembali.';
    case 'auth/popup-closed-by-user':
      return 'Jendela autentikasi Google ditutup sebelum proses selesai.';
    case 'auth/cancelled-popup-request':
      return 'Permintaan login Google sebelumnya masih berjalan.';
    case 'auth/operation-not-allowed':
      return 'Akun belum terdaftar pada daftar akses login Admin Utama.';
    default:
      return err?.message || 'Autentikasi gagal. Periksa email dan kata sandi Anda.';
  }
}

export const LoginPage: React.FC = () => {
  const {
    sppgConfig,
    loginWithProfile,
    addToast,
    webAccessPolicy,
    findWebAccessUser,
    webAccessUsers,
    recordWebLoginTimestamp,
  } = useApp();

  const [mode, setMode] = useState<'login' | 'forgot' | 'register'>('login');
  const [identifier, setIdentifier] = useState<string>(() => {
    return localStorage.getItem(REMEMBERED_ID_KEY) || '';
  });
  const [password, setPassword] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [rememberMe, setRememberMe] = useState<boolean>(() => {
    return Boolean(localStorage.getItem(REMEMBERED_ID_KEY));
  });
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState<boolean>(false);
  const [fieldErrors, setFieldErrors] = useState<{
    identifier?: string;
    password?: string;
    displayName?: string;
  }>({});
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  const [showDemoAccess, setShowDemoAccess] = useState<boolean>(false);
  const [selectedDemoRole, setSelectedDemoRole] = useState<RoleType>('Admin Utama');

  const [logoSrc, setLogoSrc] = useState<string>(BGN_LOGO_PRIMARY);

  useEffect(() => {
    setAuthError(null);
    setFieldErrors({});
  }, [mode]);

  const resolveEmailForAuth = (rawInput: string): string => {
    const trimmed = rawInput.trim();
    if (trimmed.includes('@')) {
      return trimmed;
    }
    const webMatch = findWebAccessUser(trimmed);
    if (webMatch) {
      return webMatch.email;
    }
    const matched = resolveUserByIdentifier(trimmed);
    if (matched) {
      return matched.email;
    }
    return `${trimmed.toLowerCase()}@sppg-tmg2.id`;
  };

  const buildProfileFromAuth = (
    uid: string,
    email: string,
    nameFallback?: string | null
  ): UserProfile => {
    const webMatch = findWebAccessUser(email);
    if (webMatch) {
      return {
        uid: webMatch.id || uid,
        name: webMatch.name || nameFallback || email.split('@')[0],
        email: webMatch.email,
        role: isProtectedSuperAdminEmail(webMatch.email) ? 'Admin Utama' : webMatch.role,
        division: webMatch.division,
        supplierId: webMatch.supplierId,
        supplierName: webMatch.supplierName,
        isActive: webMatch.isActive,
      };
    }

    const matched = resolveUserByIdentifier(email);
    if (matched) {
      return {
        ...matched,
        uid,
        name: nameFallback || matched.name,
      };
    }
    return {
      uid,
      name: nameFallback || email.split('@')[0],
      email,
      role: isProtectedSuperAdminEmail(email) ? 'Admin Utama' : 'Kepala SPPG',
      isActive: true,
    };
  };

  const syncUserFirestoreSafely = async (profile: UserProfile) => {
    if (!auth.currentUser) return;
    try {
      await saveDocument(
        'users',
        profile.uid,
        {
          uid: profile.uid,
          name: profile.name,
          email: profile.email,
          roleName: profile.role,
          roleId: profile.role === 'Admin Utama' ? 'role-admin' : 'role-staff',
          division: profile.division || '',
          sppgId: CURRENT_SPPG_ID,
          isActive: true,
          status: 'Terverifikasi',
          lastLoginAt: new Date().toISOString(),
        },
        profile.uid,
        profile.name
      );
    } catch {
      // Non-blocking fallback
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);

    const trimmedId = identifier.trim();
    const errors: { identifier?: string; password?: string; displayName?: string } = {};

    if (!trimmedId) {
      errors.identifier =
        mode === 'forgot'
          ? 'Email atau username wajib diisi untuk mengirim tautan reset.'
          : 'Email atau username wajib diisi.';
    }

    if (mode !== 'forgot') {
      if (!password) {
        errors.password = 'Kata sandi wajib diisi.';
      } else if (mode === 'register' && password.length < 6) {
        errors.password = 'Kata sandi minimal terdiri dari 6 karakter.';
      }
    }

    if (mode === 'register' && !displayName.trim()) {
      errors.displayName = 'Nama lengkap petugas wajib diisi.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setAuthError('Mohon lengkapi kolom yang wajib diisi sebelum melanjutkan.');
      return;
    }

    setFieldErrors({});
    setIsLoading(true);

    try {
      const targetEmail = resolveEmailForAuth(trimmedId);
      const registeredWebUser = findWebAccessUser(trimmedId) || findWebAccessUser(targetEmail);

      if (mode === 'forgot') {
        if (registeredWebUser) {
          const msg = `Akun ${registeredWebUser.email} dikelola secara manual oleh Admin Utama SPPG. Hubungi Admin Utama (${sppgConfig.sppgName}) melalui menu Pengaturan > Akses Login Web untuk mereset kata sandi.`;
          setAuthSuccess(msg);
          addToast('info', 'Reset Kata Sandi Manual', msg);
          setIsLoading(false);
          return;
        }
        await sendPasswordResetEmail(auth, targetEmail);
        const msg = `Tautan pemulihan kata sandi telah dikirim ke ${targetEmail}. Periksa kotak masuk atau folder spam Anda.`;
        setAuthSuccess(msg);
        addToast('info', 'Tautan Reset Terkirim', msg);
        setIsLoading(false);
        return;
      }

      if (mode === 'register') {
        if (!webAccessPolicy.allowSelfRegistration) {
          const deniedMsg =
            'Pendaftaran mandiri sedang dinonaktifkan oleh Admin Utama. Hubungi Admin Utama untuk didaftarkan akses login.';
          setAuthError(deniedMsg);
          addToast('error', 'Pendaftaran Dibatasi', deniedMsg);
          setIsLoading(false);
          return;
        }
        await setPersistence(
          auth,
          rememberMe ? browserLocalPersistence : browserSessionPersistence
        );
        const cred = await createUserWithEmailAndPassword(auth, targetEmail, password);
        const fbUser = cred.user;
        const newProfile: UserProfile = {
          uid: fbUser.uid,
          name: displayName.trim(),
          email: fbUser.email || targetEmail,
          role: isProtectedSuperAdminEmail(targetEmail) ? 'Admin Utama' : 'Kepala SPPG',
          isActive: true,
        };
        await syncUserFirestoreSafely(newProfile);

        if (rememberMe) {
          localStorage.setItem(REMEMBERED_ID_KEY, trimmedId);
        } else {
          localStorage.removeItem(REMEMBERED_ID_KEY);
        }

        setAuthSuccess(`Akun berhasil dibuat. Mengalihkan ke dashboard ${sppgConfig.sppgName}...`);
        addToast('success', 'Registrasi Berhasil', `Selamat datang, ${newProfile.name}`);
        setTimeout(() => {
          loginWithProfile(newProfile, rememberMe);
        }, 320);
        return;
      }

      // ================================================================
      // LOGIN MODE: 1. Verifikasi Akses Web Manual Terdaftar Admin Utama
      // ================================================================
      if (registeredWebUser) {
        if (!registeredWebUser.isActive) {
          const blockedMsg =
            'Akses login untuk akun ini sedang dinonaktifkan oleh Admin Utama. Hubungi Administrator SPPG.';
          setAuthError(blockedMsg);
          addToast('error', 'Akses Dinonaktifkan', blockedMsg);
          setIsLoading(false);
          return;
        }

        const isPasswordMatch = verifyLoginPassword(
          registeredWebUser.email,
          password,
          registeredWebUser.passwordHash
        );

        if (!isPasswordMatch) {
          const wrongPassMsg =
            'Kata sandi tidak sesuai. Periksa kembali kata sandi Anda atau hubungi Admin Utama.';
          setAuthError(wrongPassMsg);
          addToast('error', 'Kata Sandi Salah', wrongPassMsg);
          setIsLoading(false);
          return;
        }

        if (rememberMe) {
          localStorage.setItem(REMEMBERED_ID_KEY, trimmedId);
        } else {
          localStorage.removeItem(REMEMBERED_ID_KEY);
        }

        const profile: UserProfile = {
          uid: registeredWebUser.id,
          name: registeredWebUser.name,
          email: registeredWebUser.email,
          role: isProtectedSuperAdminEmail(registeredWebUser.email)
            ? 'Admin Utama'
            : registeredWebUser.role,
          division: registeredWebUser.division,
          supplierId: registeredWebUser.supplierId,
          supplierName: registeredWebUser.supplierName,
          isActive: true,
        };

        recordWebLoginTimestamp(registeredWebUser.email);
        setAuthSuccess(`Autentikasi berhasil. Memuat sistem sebagai ${profile.role}...`);
        addToast('success', 'Berhasil Masuk', `Selamat datang, ${profile.name}`);
        setTimeout(() => {
          loginWithProfile(profile, rememberMe);
        }, 280);
        return;
      }

      // ================================================================
      // LOGIN MODE: 2. Kebijakan Whitelist Ketat vs Firebase Auth Fallback
      // ================================================================
      if (webAccessPolicy.strictWhitelistOnly) {
        const notListedMsg =
          'Email atau username belum didaftarkan untuk akses login oleh Admin Utama. Hubungi Admin Utama SPPG.';
        setAuthError(notListedMsg);
        addToast('error', 'Akses Tidak Terdaftar', notListedMsg);
        setIsLoading(false);
        return;
      }

      await setPersistence(
        auth,
        rememberMe ? browserLocalPersistence : browserSessionPersistence
      );
      const cred = await signInWithEmailAndPassword(auth, targetEmail, password);
      const fbUser = cred.user;
      const profile = buildProfileFromAuth(fbUser.uid, fbUser.email || targetEmail, fbUser.displayName);

      await syncUserFirestoreSafely(profile);

      if (rememberMe) {
        localStorage.setItem(REMEMBERED_ID_KEY, trimmedId);
      } else {
        localStorage.removeItem(REMEMBERED_ID_KEY);
      }

      setAuthSuccess(`Autentikasi berhasil. Memuat sistem ${profile.role}...`);
      addToast('success', 'Berhasil Masuk', `Selamat datang, ${profile.name}`);
      setTimeout(() => {
        loginWithProfile(profile, rememberMe);
      }, 280);
    } catch (err: any) {
      const friendly = mapFirebaseAuthError(err);
      setAuthError(friendly);
      addToast('error', 'Autentikasi Gagal', friendly);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setAuthError(null);
    setAuthSuccess(null);
    setIsGoogleLoading(true);

    try {
      await setPersistence(
        auth,
        rememberMe ? browserLocalPersistence : browserSessionPersistence
      );
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const cred = await signInWithPopup(auth, provider);
      const fbUser = cred.user;
      const emailLower = (fbUser.email || '').trim().toLowerCase();

      const webEntry = webAccessUsers.find(u => u.email.toLowerCase() === emailLower);
      const isSuperAdmin = isProtectedSuperAdminEmail(emailLower);

      if (webEntry) {
        if (!webEntry.isActive) {
          await signOut(auth);
          const msg = 'Akses login untuk akun Google ini sedang dinonaktifkan oleh Admin Utama.';
          setAuthError(msg);
          addToast('error', 'Akses Dinonaktifkan', msg);
          return;
        }
        if (!webEntry.allowGoogleLogin && !isSuperAdmin) {
          await signOut(auth);
          const msg =
            'Login dengan Google tidak diaktifkan untuk akun ini. Gunakan Email & Password yang didaftarkan Admin Utama.';
          setAuthError(msg);
          addToast('error', 'Metode Login Dibatasi', msg);
          return;
        }
      } else if (webAccessPolicy.strictWhitelistOnly && !isSuperAdmin) {
        await signOut(auth);
        const msg = `Akun Google ${fbUser.email} belum didaftarkan untuk akses login oleh Admin Utama.`;
        setAuthError(msg);
        addToast('error', 'Akses Belum Terdaftar', msg);
        return;
      }

      const profile = buildProfileFromAuth(
        fbUser.uid,
        fbUser.email || '',
        fbUser.displayName
      );
      if (webEntry) {
        recordWebLoginTimestamp(webEntry.email);
      }
      await syncUserFirestoreSafely(profile);

      setAuthSuccess(`Terhubung sebagai ${profile.email}. Mengalihkan ke sistem...`);
      addToast('success', 'Login Google Berhasil', `Selamat datang, ${profile.name}`);
      setTimeout(() => {
        loginWithProfile(profile, rememberMe);
      }, 280);
    } catch (err: any) {
      const friendly = mapFirebaseAuthError(err);
      setAuthError(friendly);
      addToast('error', 'Login Google Gagal', friendly);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleDemoRoleLogin = () => {
    const matched =
      initialUsers.find(u => u.role === selectedDemoRole) || initialUsers[0];
    setAuthError(null);
    setAuthSuccess(`Masuk mode pratinjau sebagai ${matched.role}...`);
    addToast('success', 'Mode Pratinjau Aktif', `Masuk sebagai ${matched.name} (${matched.role})`);
    setTimeout(() => {
      loginWithProfile(matched, rememberMe);
    }, 220);
  };

  const distinctRoles: RoleType[] = Array.from(new Set(initialUsers.map(u => u.role)));

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#F4F7FA] text-slate-800 antialiased selection:bg-[#164E91] selection:text-white overflow-x-hidden">
      {/* ============================================================
          LEFT PANEL (Desktop Split-Screen Brand & Visual Showcase)
         ============================================================ */}
      <section
        aria-label="Identitas Program Makan Bergizi Gratis"
        className="hidden lg:flex lg:w-[50%] xl:w-[52%] relative flex-col justify-between p-10 xl:p-14 text-[#FFFFFF] overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, #071D49 0%, #102D63 52%, #164E91 100%)',
        }}
      >
        {/* Subtle Enterprise Grid Pattern */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(255, 255, 255, 0.045) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.045) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />

        {/* Slowly Moving Transparent Circle Ornaments */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-28 -left-24 w-96 h-96 rounded-full border border-[#D8AD55]/15 bg-[#164E91]/25 blur-[2px] login-float-slow"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-36 -right-24 w-[460px] h-[460px] rounded-full border border-white/10 bg-[#071D49]/35 login-float-reverse"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-[38%] right-[12%] w-52 h-52 rounded-full border border-[#F2D58B]/15 bg-[#D8AD55]/5 login-float-slow"
        />

        {/* Lightweight Floating Light Particles */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          {LIGHT_PARTICLES.map((p, idx) => (
            <span
              key={idx}
              className={`absolute rounded-full bg-[#F2D58B] shadow-[0_0_10px_rgba(242,213,139,0.65)] login-particle ${p.size}`}
              style={{
                top: p.top,
                left: p.left,
                animationDelay: p.delay,
                animationDuration: p.duration,
              }}
            />
          ))}
        </div>

        {/* Top Official Identity Strip */}
        <div className="relative z-10 flex items-center justify-between gap-4 login-fade-up-1">
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-lg bg-[#FFFFFF]/10 border border-[#D8AD55]/35 backdrop-blur-xs">
            <span className="w-2 h-2 rounded-full bg-[#F2D58B]" />
            <span className="text-[11px] font-bold tracking-[0.14em] uppercase text-[#F2D58B]">
              Badan Gizi Nasional RI
            </span>
          </div>
          <span className="text-[11px] font-mono tracking-wider text-white/75 bg-white/5 border border-white/15 px-2.5 py-1 rounded-md">
            ID SPPG: {sppgConfig.sppgId}
          </span>
        </div>

        {/* Center Brand Hero: Official BGN Logo + Staggered Typography */}
        <div className="relative z-10 my-auto py-8 max-w-xl">
          <div className="relative inline-flex items-center justify-center mb-8 login-logo-enter">
            <div
              aria-hidden="true"
              className="absolute -inset-6 rounded-full login-soft-glow"
              style={{
                background:
                  'radial-gradient(circle, rgba(216,173,85,0.38) 0%, rgba(22,78,145,0.22) 55%, transparent 75%)',
                filter: 'blur(14px)',
              }}
            />
            <div className="relative p-3 rounded-full bg-white/95 shadow-[0_14px_40px_rgba(0,0,0,0.35)] ring-2 ring-[#D8AD55]/75">
              <img
                src={logoSrc}
                onError={() => {
                  if (logoSrc !== BGN_LOGO_FALLBACK) {
                    setLogoSrc(BGN_LOGO_FALLBACK);
                  }
                }}
                alt="Logo Resmi Badan Gizi Nasional (BGN) Republik Indonesia"
                className="w-28 h-28 xl:w-32 xl:h-32 object-contain block"
              />
            </div>
          </div>

          <div className="login-fade-up-1">
            <p className="text-xs font-bold tracking-[0.18em] uppercase text-[#F2D58B] mb-2.5">
              {sppgConfig.programName}
            </p>
            <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight leading-[1.18] text-[#FFFFFF]">
              Sistem Informasi Manajemen
              <span className="block text-[#F2D58B] mt-1">E-SPPG TMG2</span>
            </h1>
          </div>

          <p className="login-fade-up-2 mt-4 text-sm xl:text-[15px] leading-relaxed text-slate-200/90 max-w-lg">
            Platform ERP operasional terintegrasi untuk{' '}
            <strong className="text-white font-semibold">{sppgConfig.sppgName}</strong> —{' '}
            {sppgConfig.foundationName}. Mengelola perencanaan menu gizi, pengadaan PLOK, gudang,
            produksi dapur, distribusi sekolah, hingga pelaporan keuangan BGN secara akuntabel.
          </p>

          <div className="login-fade-up-3 mt-8 grid grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-white/[0.06] border border-white/12 backdrop-blur-xs">
              <Utensils className="w-4 h-4 text-[#F2D58B] mb-2" />
              <div className="text-xs font-bold text-white">Gizi & Produksi</div>
              <div className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                Standar AKG & kontrol 5 divisi dapur
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-white/[0.06] border border-white/12 backdrop-blur-xs">
              <PackageCheck className="w-4 h-4 text-[#F2D58B] mb-2" />
              <div className="text-xs font-bold text-white">PLOK & Gudang</div>
              <div className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                RAB, PO Supplier, QC & FEFO stok
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-white/[0.06] border border-white/12 backdrop-blur-xs">
              <BarChart3 className="w-4 h-4 text-[#F2D58B] mb-2" />
              <div className="text-xs font-bold text-white">Akuntabilitas</div>
              <div className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                Arus kas, LRA & audit trail BGN
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Copyright & Security Note */}
        <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-300/80 border-t border-white/10 pt-4">
          <span>
            © 2026 {sppgConfig.foundationName} • {sppgConfig.district}, {sppgConfig.regency}
          </span>
          <span className="inline-flex items-center gap-1.5 text-[#F2D58B] font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            Kontrol Akses Admin Utama
          </span>
        </div>
      </section>

      {/* ============================================================
          MOBILE COMPACT IDENTITY HEADER (< lg)
         ============================================================ */}
      <div
        className="lg:hidden relative px-5 pt-6 pb-8 text-white overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, #071D49 0%, #102D63 60%, #164E91 100%)',
        }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(255, 255, 255, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.04) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        <div className="relative z-10 flex items-center gap-3.5 max-w-md mx-auto">
          <div className="relative shrink-0 p-1.5 rounded-full bg-white shadow-md ring-2 ring-[#D8AD55]/80 login-logo-enter">
            <img
              src={logoSrc}
              onError={() => {
                if (logoSrc !== BGN_LOGO_FALLBACK) {
                  setLogoSrc(BGN_LOGO_FALLBACK);
                }
              }}
              alt="Logo Badan Gizi Nasional (BGN)"
              className="w-12 h-12 object-contain block"
            />
          </div>
          <div className="min-w-0 login-fade-up-1">
            <div className="text-[10px] font-bold tracking-[0.14em] uppercase text-[#F2D58B]">
              Badan Gizi Nasional • MBG
            </div>
            <h1 className="text-base font-extrabold text-white leading-tight truncate">
              E-SPPG TMG2 Management System
            </h1>
            <p className="text-[11px] text-slate-200/85 truncate">
              {sppgConfig.sppgName} ({sppgConfig.sppgId})
            </p>
          </div>
        </div>
      </div>

      {/* ============================================================
          RIGHT PANEL: LOGIN CARD FOCUS AREA
         ============================================================ */}
      <main className="flex-1 flex flex-col justify-center items-center px-4 py-6 sm:px-8 lg:px-12 -mt-4 lg:mt-0 relative z-20">
        <div className="w-full max-w-[440px]">
          <div className="bg-[#FFFFFF] rounded-2xl border border-slate-200/90 shadow-[0_20px_50px_-15px_rgba(7,29,73,0.14)] overflow-hidden login-card-enter">
            <div
              className="h-1.5 w-full"
              style={{
                background: 'linear-gradient(90deg, #D8AD55 0%, #F2D58B 50%, #D8AD55 100%)',
              }}
            />

            <div className="p-6 sm:p-8">
              <div className="mb-6">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#164E91]">
                    {mode === 'login'
                      ? 'Portal Akses Terkendali'
                      : mode === 'register'
                      ? 'Pendaftaran Petugas'
                      : 'Pemulihan Akun'}
                  </span>
                  <span className="text-[11px] font-mono font-semibold text-slate-500">
                    {sppgConfig.sppgId}
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-extrabold text-[#071D49] tracking-tight">
                  {mode === 'login'
                    ? 'Masuk ke E-SPPG TMG2'
                    : mode === 'register'
                    ? 'Buat Akun Petugas Baru'
                    : 'Reset Kata Sandi'}
                </h2>
                <p className="text-xs sm:text-[13px] text-slate-500 mt-1 leading-relaxed">
                  {mode === 'login'
                    ? 'Gunakan email dan kata sandi yang telah didaftarkan oleh Admin Utama SPPG TMG2.'
                    : mode === 'register'
                    ? 'Daftarkan akun petugas resmi Yayasan Hafshawaty untuk akses terautentikasi.'
                    : 'Masukkan email atau username Anda untuk informasi pemulihan kata sandi.'}
                </p>
              </div>

              {authError && (
                <div
                  role="alert"
                  className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 transition-all duration-200"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed font-medium">{authError}</span>
                </div>
              )}

              {authSuccess && (
                <div
                  role="status"
                  className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5 transition-all duration-200"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed font-medium">{authSuccess}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                {mode === 'register' && (
                  <div>
                    <label
                      htmlFor="login-fullname"
                      className="block text-xs font-bold text-[#102D63] mb-1.5"
                    >
                      Nama Lengkap Petugas
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="login-fullname"
                        type="text"
                        autoComplete="name"
                        placeholder="Contoh: Siti Aminah, S.Gz."
                        value={displayName}
                        onChange={e => {
                          setDisplayName(e.target.value);
                          if (fieldErrors.displayName) {
                            setFieldErrors(prev => ({ ...prev, displayName: undefined }));
                          }
                        }}
                        className={`w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl bg-[#F4F7FA]/70 border transition-all duration-200 focus:bg-white focus:outline-none ${
                          fieldErrors.displayName
                            ? 'border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                            : 'border-slate-200 hover:border-slate-300 focus:border-[#164E91] focus:ring-4 focus:ring-[#164E91]/12'
                        }`}
                      />
                    </div>
                    {fieldErrors.displayName && (
                      <p className="mt-1 text-[11px] font-medium text-rose-600">
                        {fieldErrors.displayName}
                      </p>
                    )}
                  </div>
                )}

                {/* Email atau Username */}
                <div>
                  <label
                    htmlFor="login-identifier"
                    className="block text-xs font-bold text-[#102D63] mb-1.5"
                  >
                    Email atau Username
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="login-identifier"
                      type="text"
                      autoComplete="username"
                      placeholder="Masukkan email terdaftar"
                      value={identifier}
                      onChange={e => {
                        setIdentifier(e.target.value);
                        if (fieldErrors.identifier) {
                          setFieldErrors(prev => ({ ...prev, identifier: undefined }));
                        }
                      }}
                      className={`w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl bg-[#F4F7FA]/70 border transition-all duration-200 focus:bg-white focus:outline-none ${
                        fieldErrors.identifier
                          ? 'border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                          : 'border-slate-200 hover:border-slate-300 focus:border-[#164E91] focus:ring-4 focus:ring-[#164E91]/12'
                      }`}
                    />
                  </div>
                  {fieldErrors.identifier && (
                    <p className="mt-1 text-[11px] font-medium text-rose-600">
                      {fieldErrors.identifier}
                    </p>
                  )}
                </div>

                {/* Password */}
                {mode !== 'forgot' && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="login-password"
                        className="block text-xs font-bold text-[#102D63]"
                      >
                        Kata Sandi
                      </label>
                      {mode === 'login' && (
                        <button
                          type="button"
                          onClick={() => setMode('forgot')}
                          className="text-xs font-semibold text-[#164E91] hover:text-[#071D49] hover:underline transition-colors duration-150"
                        >
                          Lupa password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                        placeholder="Masukkan kata sandi Anda"
                        value={password}
                        onChange={e => {
                          setPassword(e.target.value);
                          if (fieldErrors.password) {
                            setFieldErrors(prev => ({ ...prev, password: undefined }));
                          }
                        }}
                        className={`w-full pl-10 pr-11 py-2.5 text-sm rounded-xl bg-[#F4F7FA]/70 border transition-all duration-200 focus:bg-white focus:outline-none ${
                          fieldErrors.password
                            ? 'border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                            : 'border-slate-200 hover:border-slate-300 focus:border-[#164E91] focus:ring-4 focus:ring-[#164E91]/12'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(prev => !prev)}
                        aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-[#102D63] hover:bg-slate-100 transition-colors duration-150"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    {fieldErrors.password && (
                      <p className="mt-1 text-[11px] font-medium text-rose-600">
                        {fieldErrors.password}
                      </p>
                    )}
                  </div>
                )}

                {/* Ingat Saya */}
                {mode === 'login' && (
                  <div className="flex items-center justify-between pt-0.5">
                    <label className="inline-flex items-center gap-2 cursor-pointer select-none group">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={e => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-[#164E91] focus:ring-[#164E91]/30 cursor-pointer accent-[#102D63]"
                      />
                      <span className="text-xs font-medium text-slate-600 group-hover:text-[#071D49] transition-colors duration-150">
                        Ingat saya di perangkat ini
                      </span>
                    </label>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading || isGoogleLoading}
                  className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 shadow-[0_8px_20px_-6px_rgba(7,29,73,0.45)] hover:shadow-[0_12px_24px_-6px_rgba(22,78,145,0.55)] active:scale-[0.985] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                  style={{
                    background: 'linear-gradient(135deg, #071D49 0%, #102D63 50%, #164E91 100%)',
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#F2D58B]" />
                      <span>
                        {mode === 'login'
                          ? 'Memverifikasi Akun...'
                          : mode === 'register'
                          ? 'Mendaftarkan Akun...'
                          : 'Memproses...'}
                      </span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4 text-[#F2D58B]" />
                      <span>
                        {mode === 'login'
                          ? 'Masuk ke Sistem'
                          : mode === 'register'
                          ? 'Daftar & Masuk Sistem'
                          : 'Cek & Kirim Reset Password'}
                      </span>
                    </>
                  )}
                </button>
              </form>

              {mode !== 'login' && (
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="mt-4 w-full py-2 text-xs font-bold text-[#164E91] hover:text-[#071D49] flex items-center justify-center gap-1.5 transition-colors duration-150"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Kembali ke halaman masuk</span>
                </button>
              )}

              {mode === 'login' && (
                <>
                  <div className="my-5 flex items-center gap-3">
                    <div className="flex-1 h-px bg-slate-200" />
                    <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400">
                      Atau Metode Terverifikasi
                    </span>
                    <div className="flex-1 h-px bg-slate-200" />
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={isLoading || isGoogleLoading}
                    className="w-full py-2.5 px-4 rounded-xl bg-white border border-slate-200 hover:border-[#164E91]/40 hover:bg-[#F4F7FA] active:scale-[0.985] text-xs font-bold text-[#071D49] flex items-center justify-center gap-2.5 transition-all duration-200 shadow-2xs disabled:opacity-60 cursor-pointer"
                  >
                    {isGoogleLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-[#164E91]" />
                    ) : (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                    )}
                    <span>Masuk dengan Akun Google</span>
                  </button>

                  {(webAccessPolicy.allowSelfRegistration || webAccessPolicy.allowDemoPreview) && (
                    <div className="mt-5 pt-4 border-t border-slate-100 space-y-3">
                      {webAccessPolicy.allowSelfRegistration && (
                        <div className="text-center text-xs text-slate-600">
                          Petugas baru belum terdaftar?{' '}
                          <button
                            type="button"
                            onClick={() => setMode('register')}
                            className="font-bold text-[#164E91] hover:text-[#071D49] hover:underline"
                          >
                            Daftar akun petugas
                          </button>
                        </div>
                      )}

                      {webAccessPolicy.allowDemoPreview && (
                        <div className="rounded-xl border border-slate-200/80 bg-[#F4F7FA]/75 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setShowDemoAccess(prev => !prev)}
                            className="w-full px-3.5 py-2 flex items-center justify-between text-[11px] font-semibold text-slate-600 hover:text-[#071D49] transition-colors"
                          >
                            <span className="inline-flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-[#D8AD55]" />
                              Akses Simulasi Peran Operasional (Pratinjau)
                            </span>
                            <ChevronDown
                              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                                showDemoAccess ? 'rotate-180' : ''
                              }`}
                            />
                          </button>

                          {showDemoAccess && (
                            <div className="px-3.5 pb-3 pt-1 border-t border-slate-200/70 space-y-2">
                              <label
                                htmlFor="demo-role-select"
                                className="block text-[11px] text-slate-500"
                              >
                                Pilih peran RBAC untuk pratinjau cepat antar divisi:
                              </label>
                              <div className="flex gap-2">
                                <select
                                  id="demo-role-select"
                                  value={selectedDemoRole}
                                  onChange={e => setSelectedDemoRole(e.target.value as RoleType)}
                                  className="flex-1 text-xs px-2.5 py-2 rounded-lg bg-white border border-slate-200 text-[#071D49] font-medium focus:border-[#164E91] focus:outline-none"
                                >
                                  {distinctRoles.map(role => (
                                    <option key={role} value={role}>
                                      {role}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={handleDemoRoleLogin}
                                  className="px-3 py-2 rounded-lg bg-[#D8AD55] hover:bg-[#c59a43] active:scale-95 text-[#071D49] text-xs font-bold transition-all shrink-0 cursor-pointer"
                                >
                                  Buka
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {!webAccessPolicy.allowSelfRegistration && !webAccessPolicy.allowDemoPreview && (
                    <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-500">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#164E91] shrink-0" />
                      <span>Hanya akun terdaftar Admin Utama yang diizinkan mengakses sistem.</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <p className="mt-5 text-center text-[11px] text-slate-500 leading-relaxed">
            Dilindungi Manajemen Akses Admin Utama & Firestore RBAC •{' '}
            <span className="font-semibold text-[#102D63]">{sppgConfig.sppgName}</span>
          </p>
        </div>
      </main>
    </div>
  );
};
