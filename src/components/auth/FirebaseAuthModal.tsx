import React, { useState, useEffect } from 'react';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useApp } from '../../lib/store';
import { isProtectedSuperAdminEmail } from '../../lib/authCrypto';
import { saveDocument, CURRENT_SPPG_ID } from '../../lib/databaseService';
import { Modal } from '../common/Modal';
import {
  ShieldCheck,
  Mail,
  Lock,
  LogIn,
  LogOut,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Shield,
  User,
  Sparkles,
} from 'lucide-react';

interface FirebaseAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FirebaseAuthModal: React.FC<FirebaseAuthModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, switchRole, addToast, logout, webAccessUsers, webAccessPolicy } = useApp();
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      setFirebaseUser(user);
    });
    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const cred = await signInWithPopup(auth, provider);
      const user = cred.user;
      const emailLower = (user.email || '').trim().toLowerCase();
      const webEntry = webAccessUsers.find(u => u.email.toLowerCase() === emailLower);
      const isSuperAdmin = isProtectedSuperAdminEmail(emailLower);

      if (webEntry && (!webEntry.isActive || !webEntry.allowGoogleLogin)) {
        setAuthError('Akses login Google untuk akun ini dinonaktifkan oleh Admin Utama.');
        await logout();
        return;
      }

      if (!webEntry && webAccessPolicy.strictWhitelistOnly && !isSuperAdmin) {
        setAuthError(`Akun ${user.email} belum didaftarkan untuk akses login oleh Admin Utama.`);
        await logout();
        return;
      }

      const assignedRole = isSuperAdmin ? 'Admin Utama' : (webEntry?.role || currentUser.role);

      // Sync user profile to Firestore 'users' collection
      await saveDocument(
        'users',
        user.uid,
        {
          uid: user.uid,
          name: webEntry?.name || user.displayName || 'Petugas SPPG',
          email: user.email || '',
          roleName: assignedRole,
          roleId: assignedRole === 'Admin Utama' ? 'role-admin' : 'role-staff',
          division: webEntry?.division || currentUser.division,
          sppgId: CURRENT_SPPG_ID,
          isActive: true,
          status: 'Terverifikasi',
          lastLoginAt: new Date().toISOString(),
        },
        user.uid,
        user.displayName || 'Google User'
      );

      if (isSuperAdmin) {
        switchRole('Admin Utama');
      }

      addToast('success', 'Autentikasi Berhasil', `Masuk sebagai ${user.email} (Firebase Auth)`);
      onClose();
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      setAuthError(err.message || 'Gagal masuk dengan Google.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError(null);

    try {
      const emailLower = email.trim().toLowerCase();
      const webEntry = webAccessUsers.find(u => u.email.toLowerCase() === emailLower);
      const isSuperAdmin = isProtectedSuperAdminEmail(emailLower);

      if (authMode === 'login') {
        if (webEntry && !webEntry.isActive && !isSuperAdmin) {
          throw new Error('Akun ini dinonaktifkan oleh Admin Utama SPPG.');
        }
        if (!webEntry && webAccessPolicy.strictWhitelistOnly && !isSuperAdmin) {
          throw new Error(`Email ${email} belum didaftarkan pada whitelist akses login oleh Admin Utama.`);
        }
        const cred = await signInWithEmailAndPassword(auth, email, password);
        const user = cred.user;

        await saveDocument(
          'users',
          user.uid,
          {
            uid: user.uid,
            email: user.email || '',
            lastLoginAt: new Date().toISOString(),
            status: 'Aktif',
          },
          user.uid,
          user.email || 'Staff'
        );

        addToast('success', 'Login Berhasil', `Selamat datang kembali, ${user.email}`);
        onClose();
      } else if (authMode === 'register') {
        if (!webAccessPolicy.allowSelfRegistration) {
          throw new Error('Pendaftaran mandiri sedang dinonaktifkan oleh Admin Utama.');
        }
        if (password.length < 6) {
          throw new Error('Password minimal harus 6 karakter.');
        }
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const user = cred.user;

        // Save User Document to 'users' collection with SPPG ID
        await saveDocument(
          'users',
          user.uid,
          {
            uid: user.uid,
            name: displayName || email.split('@')[0],
            email: user.email || '',
            roleName: 'Staff Operasional',
            roleId: 'role-staff',
            sppgId: CURRENT_SPPG_ID,
            isActive: true,
            status: 'Aktif',
            lastLoginAt: new Date().toISOString(),
          },
          user.uid,
          displayName || email
        );

        addToast('success', 'Akun Terdaftar', 'Akun Firebase Auth berhasil dibuat.');
        onClose();
      } else if (authMode === 'reset') {
        await sendPasswordResetEmail(auth, email);
        addToast('info', 'Tautan Reset Terkirim', `Periksa email ${email} untuk mereset kata sandi.`);
        setAuthMode('login');
      }
    } catch (err: any) {
      console.error('Email Auth Error:', err);
      setAuthError(err.message || 'Terjadi kesalahan autentikasi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      setFirebaseUser(null);
      onClose();
    } catch (err: any) {
      addToast('error', 'Gagal Keluar', err.message);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Autentikasi Firebase & Keamanan Data (RBAC)" maxWidth="md">
      <div className="space-y-5">
        {/* Banner Keamanan & Ketentuan BGN */}
        <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs space-y-1">
          <div className="flex items-center gap-2 font-bold text-blue-900">
            <ShieldCheck className="w-4 h-4 text-blue-700" />
            <span>Keamanan Zero-Trust & Perlindungan Kredensial</span>
          </div>
          <p className="text-slate-600">
            Kata sandi dienkripsi langsung oleh infrastruktur Firebase Auth (tidak disimpan di database secara terbuka). Akses database dilindungi Firestore Security Rules berbasis peran dan ID SPPG (<strong>{CURRENT_SPPG_ID}</strong>).
          </p>
        </div>

        {/* Current Auth Status Card */}
        {firebaseUser ? (
          <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">
                {firebaseUser.email?.slice(0, 2).toUpperCase() || 'US'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">{firebaseUser.displayName || firebaseUser.email}</span>
                  <span className="text-[10px] bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded-full font-semibold">
                    Terverifikasi
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 font-mono block">UID: {firebaseUser.uid.slice(0, 16)}...</span>
                <span className="text-[11px] text-blue-700 font-semibold block">Peran Aktif: {currentUser.role}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-medium flex items-center gap-1 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        ) : (
          <>
            {/* Google Sign In Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 hover:bg-slate-50 hover:border-slate-400 transition shadow-xs"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
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
              <span>Masuk dengan Akun Google</span>
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-[11px] font-semibold text-slate-400">ATAU EMAIL SPPG</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {/* Error Message */}
            {authError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span>{authError}</span>
              </div>
            )}

            {/* Email / Password Form */}
            <form onSubmit={handleEmailAuth} className="space-y-3">
              {authMode === 'register' && (
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Nama Lengkap Petugas:</label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Siti Nurhaliza, S.Gz."
                      value={displayName}
                      onChange={e => setDisplayName(e.target.value)}
                      className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Email Resmi SPPG:</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="nama@sppg-temenggungan2.id"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {authMode !== 'reset' && (
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-slate-700">Kata Sandi:</label>
                    {authMode === 'login' && (
                      <button
                        type="button"
                        onClick={() => setAuthMode('reset')}
                        className="text-[11px] text-blue-600 hover:underline"
                      >
                        Lupa sandi?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="password"
                      required
                      placeholder="Minimal 6 karakter"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-sm mt-2 disabled:opacity-50"
              >
                <LogIn className="w-4 h-4" />
                <span>
                  {isLoading
                    ? 'Memproses...'
                    : authMode === 'login'
                    ? 'Masuk ke Sistem'
                    : authMode === 'register'
                    ? 'Daftar Akun Baru'
                    : 'Kirim Tautan Reset'}
                </span>
              </button>
            </form>

            {/* Mode Switcher */}
            {webAccessPolicy.allowSelfRegistration && (
              <div className="text-center pt-2 border-t border-slate-100 text-xs text-slate-600">
                {authMode === 'login' ? (
                  <span>
                    Belum memiliki akun terdaftar?{' '}
                    <button
                      type="button"
                      onClick={() => setAuthMode('register')}
                      className="font-bold text-blue-700 hover:underline"
                    >
                      Daftar di sini
                    </button>
                  </span>
                ) : (
                  <span>
                    Sudah memiliki akun?{' '}
                    <button
                      type="button"
                      onClick={() => setAuthMode('login')}
                      className="font-bold text-blue-700 hover:underline"
                    >
                      Masuk di sini
                    </button>
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
};
