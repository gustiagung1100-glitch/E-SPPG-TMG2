import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../lib/store';
import { RoleType, ActionPermission, WebAccessUser, ModuleKey, RoleModuleAccessMap } from '../../types';
import { ALL_MODULES_META, ALL_ROLES_LIST } from '../../lib/routeGuard';
import { isProtectedSuperAdminEmail } from '../../lib/authCrypto';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import {
  FIRESTORE_COLLECTIONS,
  FirestoreCollectionKey,
} from '../../types/database';
import {
  exportDatabaseBackup,
  validateFileUpload,
  maskSensitiveData,
  CURRENT_SPPG_ID,
  FileValidationResult,
} from '../../lib/databaseService';
import {
  Settings,
  Building,
  Shield,
  FileText,
  Save,
  CheckCircle2,
  Database,
  History,
  Lock,
  Download,
  UploadCloud,
  Trash2,
  RefreshCw,
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  FileCheck,
  Search,
  Sparkles,
  Layers,
  ArrowRight,
  UserPlus,
  UserCheck,
  UserX,
  Edit3,
  ShieldCheck,
  Mail,
  LayoutGrid,
  RotateCcw,
} from 'lucide-react';

export const SettingsModule: React.FC = () => {
  const {
    sppgConfig,
    updateSPPGConfig,
    rolePermissions,
    updateRolePermissions,
    roleModuleAccess,
    updateRoleModuleAccess,
    resetRoleModuleAccess,
    auditLogs,
    currentUser,
    isFirebaseConnected,
    addToast,
    webAccessUsers,
    webAccessPolicy,
    addWebAccessUser,
    updateWebAccessUser,
    toggleWebAccessStatus,
    deleteWebAccessUser,
    updateWebAccessPolicy,
    masterSuppliers,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'profil' | 'access' | 'rbac' | 'database' | 'audit'>('profil');

  // Web Login Access Management States
  const [accessSearch, setAccessSearch] = useState('');
  const [accessStatusFilter, setAccessStatusFilter] = useState<'ALL' | 'ACTIVE' | 'BLOCKED'>('ALL');
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [editingAccessUser, setEditingAccessUser] = useState<WebAccessUser | null>(null);
  const [deletingAccessUser, setDeletingAccessUser] = useState<WebAccessUser | null>(null);
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  const [newUserForm, setNewUserForm] = useState<{
    name: string;
    email: string;
    password: string;
    role: RoleType;
    division: string;
    supplierId: string;
    isActive: boolean;
    allowGoogleLogin: boolean;
    notes: string;
  }>({
    name: '',
    email: '',
    password: '',
    role: 'Kepala SPPG',
    division: '',
    supplierId: '',
    isActive: true,
    allowGoogleLogin: true,
    notes: '',
  });

  const [editUserForm, setEditUserForm] = useState<{
    name: string;
    email: string;
    newPassword: string;
    role: RoleType;
    division: string;
    supplierId: string;
    isActive: boolean;
    allowGoogleLogin: boolean;
    notes: string;
  }>({
    name: '',
    email: '',
    newPassword: '',
    role: 'Kepala SPPG',
    division: '',
    supplierId: '',
    isActive: true,
    allowGoogleLogin: true,
    notes: '',
  });

  // Org Profile State
  const [profileForm, setProfileForm] = useState({ ...sppgConfig });

  // Permissions state clone for editing
  const [permsState, setPermsState] = useState({ ...rolePermissions });

  // Dynamic Module/Menu Access Matrix state for Admin Utama
  const [moduleAccessDraft, setModuleAccessDraft] = useState<RoleModuleAccessMap>(() => ({
    ...roleModuleAccess,
  }));
  const [moduleMatrixCategory, setModuleMatrixCategory] = useState<string>('ALL');
  const [moduleMatrixRoleSearch, setModuleMatrixRoleSearch] = useState('');
  const [isConfirmResetModulesOpen, setIsConfirmResetModulesOpen] = useState(false);

  useEffect(() => {
    setPermsState({ ...rolePermissions });
  }, [rolePermissions]);

  useEffect(() => {
    setModuleAccessDraft({ ...roleModuleAccess });
  }, [roleModuleAccess]);

  const hasUnsavedModuleChanges = useMemo(() => {
    return ALL_ROLES_LIST.some(role => {
      const draftSet = new Set(moduleAccessDraft[role] || []);
      const savedSet = new Set(roleModuleAccess[role] || []);
      if (draftSet.size !== savedSet.size) return true;
      for (const mod of draftSet) {
        if (!savedSet.has(mod)) return true;
      }
      return false;
    });
  }, [moduleAccessDraft, roleModuleAccess]);

  // Database Tab States
  const [collectionSearch, setCollectionSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isExportingBackup, setIsExportingBackup] = useState(false);
  const [testUploadResult, setTestUploadResult] = useState<FileValidationResult | null>(null);

  // Soft delete sample trash bin state
  const [softDeletedRecords, setSoftDeletedRecords] = useState<
    Array<{ id: string; collection: string; name: string; deletedBy: string; deletedAt: string; reason: string }>
  >([
    {
      id: 'po-20261105-09',
      collection: 'purchase_orders',
      name: 'PO Sayur Bayam Organik (Batal Pesan)',
      deletedBy: 'Dr. H. Ahmad Zaini, S.Pd.',
      deletedAt: '2026-11-06 14:20 WIB',
      reason: 'Supplier kehabisan stok panen bayam Kraksaan, diganti kangkung',
    },
    {
      id: 'rab-item-old-04',
      collection: 'rab_items',
      name: 'Pagu Operasional BBM Cadangan Tahap 1',
      deletedBy: 'Siti Nurhaliza, S.Gz.',
      deletedAt: '2026-11-07 09:15 WIB',
      reason: 'Konsolidasi pagu ke akun logistik armada utama',
    },
  ]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSPPGConfig(profileForm);
  };

  const handleTogglePerm = (role: string, action: ActionPermission) => {
    if (role === 'Admin Utama' || currentUser.role !== 'Admin Utama') return;
    const current = permsState[role]?.[action] ?? false;
    const updated = {
      ...permsState,
      [role]: {
        ...permsState[role],
        [action]: !current,
      },
    };
    setPermsState(updated);
  };

  const handleSavePerms = () => {
    updateRolePermissions(permsState);
  };

  const handleToggleModuleAccess = (role: RoleType, moduleKey: ModuleKey) => {
    if (role === 'Admin Utama' || currentUser.role !== 'Admin Utama') return;
    setModuleAccessDraft(prev => {
      const currentList = prev[role] || [];
      const exists = currentList.includes(moduleKey);
      const nextList = exists
        ? currentList.filter(k => k !== moduleKey)
        : [...currentList, moduleKey];
      return {
        ...prev,
        [role]: nextList,
      };
    });
  };

  const handleToggleAllModulesForRole = (role: RoleType, enableAll: boolean) => {
    if (role === 'Admin Utama' || currentUser.role !== 'Admin Utama') return;
    setModuleAccessDraft(prev => ({
      ...prev,
      [role]: enableAll ? ALL_MODULES_META.map(m => m.key) : [],
    }));
  };

  const handleToggleModuleForAllRoles = (moduleKey: ModuleKey, enableAll: boolean) => {
    if (currentUser.role !== 'Admin Utama') return;
    setModuleAccessDraft(prev => {
      const next = { ...prev };
      for (const role of ALL_ROLES_LIST) {
        if (role === 'Admin Utama') continue;
        const currentList = next[role] || [];
        if (enableAll) {
          if (!currentList.includes(moduleKey)) {
            next[role] = [...currentList, moduleKey];
          }
        } else {
          next[role] = currentList.filter(k => k !== moduleKey);
        }
      }
      return next;
    });
  };

  const handleSaveModuleAccess = async () => {
    await updateRoleModuleAccess(moduleAccessDraft);
  };

  const handleConfirmResetModuleAccess = async () => {
    await resetRoleModuleAccess();
  };

  // Export Database Snapshot
  const handleDownloadBackup = async () => {
    setIsExportingBackup(true);
    try {
      const backupJson = await exportDatabaseBackup(CURRENT_SPPG_ID);
      const blob = new Blob([backupJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_esppg_tmg2_${CURRENT_SPPG_ID}_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast('success', 'Backup Berhasil', 'Snapshot cadangan 39 koleksi database berhasil diunduh.');
    } catch (err: any) {
      addToast('error', 'Gagal Backup', err.message || 'Terjadi kesalahan ekspor database.');
    } finally {
      setIsExportingBackup(false);
    }
  };

  // Test File Upload Validator
  const handleTestFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = validateFileUpload(file, {
      maxSizeMB: 5,
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    });

    setTestUploadResult(result);
    if (result.isValid) {
      addToast('success', 'Validasi Unggahan Lolos', `File aman: ${result.sanitizedFileName}`);
    } else {
      addToast('error', 'Validasi Gagal', result.errorMessage || 'File tidak aman');
    }
  };

  // Restore Soft-deleted Record
  const handleRestoreRecord = (id: string) => {
    setSoftDeletedRecords(prev => prev.filter(r => r.id !== id));
    addToast('success', 'Data Dipulihkan', `Dokumen ${id} berhasil dikembalikan dari soft-delete.`);
  };

  // Manual Web Login Access Handlers (Admin Utama)
  const isSuperAdminSession = currentUser.role === 'Admin Utama';

  const allAssignableRoles: RoleType[] = [
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

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let out = '';
    for (let i = 0; i < 8; i++) {
      out += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return out;
  };

  const handleCreateWebAccessUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedSupplier =
      newUserForm.role === 'Supplier / Mitra Pangan'
        ? masterSuppliers.find(s => s.id === newUserForm.supplierId)
        : undefined;

    const ok = await addWebAccessUser({
      name: newUserForm.name,
      email: newUserForm.email,
      password: newUserForm.password,
      role: newUserForm.role,
      division: newUserForm.division || undefined,
      supplierId: selectedSupplier?.id,
      supplierName: selectedSupplier?.name,
      isActive: newUserForm.isActive,
      allowGoogleLogin: newUserForm.allowGoogleLogin,
      notes: newUserForm.notes,
    });

    if (ok) {
      setIsAddUserOpen(false);
      setNewUserForm({
        name: '',
        email: '',
        password: '',
        role: 'Kepala SPPG',
        division: '',
        supplierId: '',
        isActive: true,
        allowGoogleLogin: true,
        notes: '',
      });
    }
  };

  const openEditWebAccessModal = (user: WebAccessUser) => {
    setEditingAccessUser(user);
    setShowEditPassword(false);
    setEditUserForm({
      name: user.name,
      email: user.email,
      newPassword: '',
      role: user.role,
      division: user.division || '',
      supplierId: user.supplierId || '',
      isActive: user.isActive,
      allowGoogleLogin: user.allowGoogleLogin,
      notes: user.notes || '',
    });
  };

  const handleSaveEditWebAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccessUser) return;
    const selectedSupplier =
      editUserForm.role === 'Supplier / Mitra Pangan'
        ? masterSuppliers.find(s => s.id === editUserForm.supplierId)
        : undefined;

    const ok = await updateWebAccessUser(editingAccessUser.id, {
      name: editUserForm.name,
      email: editUserForm.email,
      newPassword: editUserForm.newPassword.trim() || undefined,
      role: editUserForm.role,
      division: editUserForm.division || undefined,
      supplierId: selectedSupplier?.id,
      supplierName: selectedSupplier?.name,
      isActive: editUserForm.isActive,
      allowGoogleLogin: editUserForm.allowGoogleLogin,
      notes: editUserForm.notes,
    });
    if (ok) {
      setEditingAccessUser(null);
    }
  };

  const filteredAccessUsers = webAccessUsers.filter(u => {
    const matchesSearch =
      !accessSearch.trim() ||
      u.name.toLowerCase().includes(accessSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(accessSearch.toLowerCase()) ||
      u.role.toLowerCase().includes(accessSearch.toLowerCase());
    const matchesStatus =
      accessStatusFilter === 'ALL'
        ? true
        : accessStatusFilter === 'ACTIVE'
        ? u.isActive
        : !u.isActive;
    return matchesSearch && matchesStatus;
  });

  const roles: RoleType[] = [...ALL_ROLES_LIST];

  const moduleCategories = [
    'ALL',
    'Utama',
    'Data Master & Gizi',
    'Rantai Pasok',
    'Produksi & Logistik',
    'Akuntansi & SDM',
    'Administrasi & Sistem',
  ] as const;

  const filteredMatrixModules = useMemo(() => {
    if (moduleMatrixCategory === 'ALL') return ALL_MODULES_META;
    return ALL_MODULES_META.filter(m => m.category === moduleMatrixCategory);
  }, [moduleMatrixCategory]);

  const filteredMatrixRoles = useMemo(() => {
    const q = moduleMatrixRoleSearch.trim().toLowerCase();
    if (!q) return ALL_ROLES_LIST;
    return ALL_ROLES_LIST.filter(r => r.toLowerCase().includes(q));
  }, [moduleMatrixRoleSearch]);

  const actions: { key: ActionPermission; label: string }[] = [
    { key: 'view', label: 'View (Lihat)' },
    { key: 'create', label: 'Create (Tambah)' },
    { key: 'edit', label: 'Edit (Ubah)' },
    { key: 'delete', label: 'Delete (Hapus)' },
    { key: 'approve', label: 'Approve (Setujui)' },
    { key: 'print', label: 'Print (Cetak)' },
    { key: 'export', label: 'Export (Unduh)' },
  ];

  // 39 Collections grouped by Domain
  const collectionCategories: Record<string, { desc: string; collections: { name: FirestoreCollectionKey; title: string; desc: string }[] }> = {
    'Akun & Otoritas': {
      desc: 'Autentikasi, identitas pengguna, hak akses peran dan profil SPPG',
      collections: [
        { name: 'users', title: '1. users', desc: 'Identitas akun pengguna & peran staf operasional' },
        { name: 'roles', title: '2. roles', desc: 'Hierarki peran RBAC (Admin, Kepala, Ahli Gizi, Kasir)' },
        { name: 'permissions', title: '3. permissions', desc: 'Hak akses tindakan per modul (view, edit, approve)' },
        { name: 'sppg_profiles', title: '4. sppg_profiles', desc: 'Identitas resmi Satuan Pelayanan Pemenuhan Gizi' },
      ],
    },
    'Penerima & Lapangan': {
      desc: 'Data penerima manfaat, lembaga sasaran, presensi harian dan relawan',
      collections: [
        { name: 'institutions', title: '5. institutions', desc: 'Data sekolah, pesantren & penerima manfaat MBG' },
        { name: 'beneficiaries', title: '6. beneficiaries', desc: 'Kohort kelas siswa dan kategori porsi kecil/besar' },
        { name: 'beneficiary_daily_records', title: '7. beneficiary_daily_records', desc: 'Presensi harian dan verifikasi BAST serah terima' },
        { name: 'volunteers', title: '8. volunteers', desc: 'Master relawan dapur dan penugasan divisi' },
        { name: 'suppliers', title: '9. suppliers', desc: 'Direktori mitra supplier bahan pangan lokal' },
      ],
    },
    'Pangan & Resep': {
      desc: 'Bahan pangan mentah, standar gizi TKPI, rencana siklus menu dan food cost',
      collections: [
        { name: 'ingredients', title: '10. ingredients', desc: 'Master bahan pangan mentah dan stok gudang' },
        { name: 'ingredient_prices', title: '11. ingredient_prices', desc: 'Riwayat harga dan plafon acuan BGN' },
        { name: 'nutrition_references', title: '12. nutrition_references', desc: 'Komposisi gizi TKPI Kemenkes per 100 gram' },
        { name: 'menu_plans', title: '13. menu_plans', desc: 'Perencanaan siklus menu mingguan dan bulanan' },
        { name: 'menu_items', title: '14. menu_items', desc: 'Kombinasi hidangan 5 komponen gizi harian' },
        { name: 'recipes', title: '15. recipes', desc: 'Resep standar pengolahan dan suhu kendali CCP' },
        { name: 'recipe_ingredients', title: '16. recipe_ingredients', desc: 'Gramasi bahan resep dan faktor edible portion BDD' },
        { name: 'nutrition_calculations', title: '17. nutrition_calculations', desc: 'Kalkulasi energi kalori dan kecukupan AKG' },
        { name: 'food_costs', title: '18. food_costs', desc: 'Analisis biaya bahan baku per porsi versus plafon' },
      ],
    },
    'Pengadaan & Gudang': {
      desc: 'Anggaran RAB, Purchase Order, Quality Control, dan mutasi FIFO',
      collections: [
        { name: 'rab_headers', title: '19. rab_headers', desc: 'Master rencana anggaran biaya belanja bulanan' },
        { name: 'rab_items', title: '20. rab_items', desc: 'Rincian item belanja pagu dan penyerapan PO' },
        { name: 'purchase_orders', title: '21. purchase_orders', desc: 'Surat pesanan bahan resmi kepada rekanan' },
        { name: 'purchase_order_items', title: '22. purchase_order_items', desc: 'Daftar item gramasi dan harga satuan PO' },
        { name: 'quality_control', title: '23. quality_control', desc: 'Inspeksi penerimaan, suhu rantai dingin & grade' },
        { name: 'inventory_batches', title: '24. inventory_batches', desc: 'Batch stok gudang dengan tanggal kedaluwarsa' },
        { name: 'inventory_movements', title: '25. inventory_movements', desc: 'Mutasi keluar masuk bahan berbasis prinsip FIFO' },
      ],
    },
    'Dapur & Distribusi': {
      desc: 'Pengolahan, pemantauan suhu steril, pemorsian ompreng dan logistik',
      collections: [
        { name: 'production_logs', title: '26. production_logs', desc: 'Catatan batch memasak dan penanggung jawab chef' },
        { name: 'temperature_logs', title: '27. temperature_logs', desc: 'Pemantauan suhu inti >75°C dan cold storage' },
        { name: 'food_waste_logs', title: '28. food_waste_logs', desc: 'Pengukuran sisa makanan ompreng dan komposting' },
        { name: 'portioning_records', title: '29. portioning_records', desc: 'Penimbangan gramasi steril dan verifikasi segel' },
        { name: 'distribution_records', title: '30. distribution_records', desc: 'Pengantaran armada, waktu tiba & BAST sekolah' },
      ],
    },
    'Keuangan & Surat': {
      desc: 'Buku kas operasional, surat dinas, arsip disposisi dan dokumen resmi',
      collections: [
        { name: 'financial_transactions', title: '31. financial_transactions', desc: 'Buku kas masuk/keluar lengkap nomor kuitansi' },
        { name: 'incoming_letters', title: '32. incoming_letters', desc: 'Register surat masuk dan lembar disposisi tindak lanjut' },
        { name: 'outgoing_letters', title: '33. outgoing_letters', desc: 'Arsip surat keluar, surat tugas, dan SPD resmi' },
        { name: 'document_templates', title: '34. document_templates', desc: 'Template dokumen resmi mail-merge terkunci' },
        { name: 'generated_documents', title: '35. generated_documents', desc: 'Salinan dokumen hasil generate nomor register' },
      ],
    },
    'Manajemen & Keamanan': {
      desc: 'Presensi kehadiran personel, notifikasi sistem, audit log dan konfigurasi',
      collections: [
        { name: 'attendance_records', title: '36. attendance_records', desc: 'Presensi harian dan pergantian shift relawan' },
        { name: 'notifications', title: '37. notifications', desc: 'Pemberitahuan persetujuan dan peringatan stok' },
        { name: 'audit_logs', title: '38. audit_logs', desc: 'Jejak audit keamanan append-only (tidak dapat dihapus)' },
        { name: 'app_settings', title: '39. app_settings', desc: 'Konfigurasi sistem, batas berkas & aturan keamanan' },
      ],
    },
  };

  const filteredCategories = Object.entries(collectionCategories).filter(([catName]) => {
    if (selectedCategory !== 'ALL' && catName !== selectedCategory) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-900 dark:text-sky-400" />
            Pengaturan Sistem, Database & Hak Akses
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Arsitektur 39 Koleksi Terhubung, Firebase Security Rules, Multi-Tenant SPPG, Audit Log & Otorisasi RBAC
          </p>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1.5 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Firestore 39 Koleksi Aktif</span>
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-sky-300 border border-blue-200">
            SPPG: {CURRENT_SPPG_ID}
          </span>
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex flex-wrap border-b border-slate-200 dark:border-slate-800 gap-4 sm:gap-6 text-xs font-bold">
        <button
          onClick={() => setActiveTab('profil')}
          className={`pb-3 flex items-center gap-2 transition border-b-2 ${
            activeTab === 'profil'
              ? 'border-blue-900 dark:border-sky-500 text-blue-900 dark:text-sky-400'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Identitas SPPG & Profil</span>
        </button>

        <button
          onClick={() => setActiveTab('access')}
          className={`pb-3 flex items-center gap-2 transition border-b-2 ${
            activeTab === 'access'
              ? 'border-blue-900 dark:border-sky-500 text-blue-900 dark:text-sky-400'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>Akses Login Web ({webAccessUsers.filter(u => u.isActive).length})</span>
        </button>

        <button
          onClick={() => setActiveTab('rbac')}
          className={`pb-3 flex items-center gap-2 transition border-b-2 ${
            activeTab === 'rbac'
              ? 'border-blue-900 dark:border-sky-500 text-blue-900 dark:text-sky-400'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Matriks Hak Akses & Modul (13 Peran)</span>
        </button>

        <button
          onClick={() => setActiveTab('database')}
          className={`pb-3 flex items-center gap-2 transition border-b-2 ${
            activeTab === 'database'
              ? 'border-blue-900 dark:border-sky-500 text-blue-900 dark:text-sky-400'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Database & Backup (39 Koleksi)</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 flex items-center gap-2 transition border-b-2 ${
            activeTab === 'audit'
              ? 'border-blue-900 dark:border-sky-500 text-blue-900 dark:text-sky-400'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Audit Log Sistem ({auditLogs.length})</span>
        </button>
      </div>

      {/* Tab 1: Organization Profile Form */}
      {activeTab === 'profil' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs">
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Profil Resmi Satuan Pelayanan Pemenuhan Gizi (SPPG)
                </h3>
                <p className="text-xs text-slate-500">
                  Data ini dicantumkan secara otomatis pada Kop Surat dan seluruh dokumen resmi BGN.
                </p>
              </div>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-xs transition"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Perubahan</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Nama Satuan Pelayanan (SPPG):
                </label>
                <input
                  type="text"
                  value={profileForm.sppgName}
                  onChange={e => setProfileForm({ ...profileForm, sppgName: e.target.value })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Nama Yayasan Penyelenggara:
                </label>
                <input
                  type="text"
                  value={profileForm.foundationName}
                  onChange={e => setProfileForm({ ...profileForm, foundationName: e.target.value })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  ID SPPG Nasional:
                </label>
                <input
                  type="text"
                  disabled
                  value={profileForm.sppgId}
                  className="w-full p-2 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold text-slate-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Nama Program Nasional:
                </label>
                <input
                  type="text"
                  value={profileForm.programName}
                  onChange={e => setProfileForm({ ...profileForm, programName: e.target.value })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Alamat Lengkap Kantor & Dapur Sentral:
                </label>
                <input
                  type="text"
                  value={profileForm.address}
                  onChange={e => setProfileForm({ ...profileForm, address: e.target.value })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Kepala SPPG:
                </label>
                <input
                  type="text"
                  value={profileForm.headOfSppg}
                  onChange={e => setProfileForm({ ...profileForm, headOfSppg: e.target.value })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Pengawas Gizi (Nutrisionis):
                </label>
                <input
                  type="text"
                  value={profileForm.nutritionOfficer}
                  onChange={e => setProfileForm({ ...profileForm, nutritionOfficer: e.target.value })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Pengawas Keuangan:
                </label>
                <input
                  type="text"
                  value={profileForm.financeOfficer}
                  onChange={e => setProfileForm({ ...profileForm, financeOfficer: e.target.value })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Nomor Telepon Hotline Dapur:
                </label>
                <input
                  type="text"
                  value={profileForm.phone}
                  onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Tab 1.5: Pengaturan Akses Login Web Manual (Admin Utama) */}
      {activeTab === 'access' && (
        <div className="space-y-6">
          {/* Header Banner & Role Info */}
          <div className="bg-gradient-to-r from-[#071D49] via-[#102D63] to-[#164E91] text-white p-6 rounded-2xl border border-[#164E91]/60 shadow-md">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#D8AD55]/25 text-[#F2D58B] border border-[#D8AD55]/40">
                    Kontrol Penuh Admin Utama
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold bg-white/10 text-white border border-white/15">
                    {webAccessUsers.filter(u => u.isActive).length} Aktif / {webAccessUsers.length} Terdaftar
                  </span>
                </div>
                <h3 className="text-lg font-bold tracking-tight flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-[#F2D58B]" />
                  Pengaturan Akses Login Web Manual (Email & Password)
                </h3>
                <p className="text-xs text-slate-200 mt-1 max-w-2xl leading-relaxed">
                  Admin Utama mendaftarkan akun Email & Kata Sandi yang diizinkan masuk ke web E-SPPG TMG2, menentukan peran RBAC masing-masing, serta dapat mengaktifkan atau memblokir akses login kapan saja.
                </p>
              </div>

              {isSuperAdminSession && (
                <button
                  type="button"
                  onClick={() => {
                    setShowAddPassword(false);
                    setIsAddUserOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D8AD55] hover:bg-[#c59a43] active:scale-95 text-[#071D49] text-xs font-extrabold shadow-sm transition shrink-0 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Daftarkan Akun Login</span>
                </button>
              )}
            </div>
          </div>

          {!isSuperAdminSession && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Mode Baca Saja:</strong> Anda sedang masuk sebagai peran <strong>{currentUser.role}</strong>. Penambahan, perubahan kata sandi, dan pengaktifan/penonaktifan akses login hanya dapat dilakukan oleh <strong>Admin Utama</strong>.
              </div>
            </div>
          )}

          {/* Kebijakan Keamanan Halaman Login */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#164E91] dark:text-sky-400" />
                  Kebijakan Kontrol Siapa yang Dapat Login
                </h4>
                <p className="text-xs text-slate-500">
                  Atur aturan pembatasan akun pada halaman Login Web E-SPPG TMG2.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 flex items-start justify-between gap-3 cursor-pointer">
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    Mode Whitelist Ketat
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Hanya email aktif yang didaftarkan Admin Utama yang dapat login ke web.
                  </p>
                </div>
                <input
                  type="checkbox"
                  disabled={!isSuperAdminSession}
                  checked={webAccessPolicy.strictWhitelistOnly}
                  onChange={e => updateWebAccessPolicy({ strictWhitelistOnly: e.target.checked })}
                  className="mt-0.5 w-4 h-4 accent-[#102D63] cursor-pointer disabled:cursor-not-allowed"
                />
              </label>

              <label className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 flex items-start justify-between gap-3 cursor-pointer">
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    Izinkan Daftar Mandiri
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Tampilkan opsi buat akun baru di halaman login bagi petugas umum.
                  </p>
                </div>
                <input
                  type="checkbox"
                  disabled={!isSuperAdminSession}
                  checked={webAccessPolicy.allowSelfRegistration}
                  onChange={e => updateWebAccessPolicy({ allowSelfRegistration: e.target.checked })}
                  className="mt-0.5 w-4 h-4 accent-[#102D63] cursor-pointer disabled:cursor-not-allowed"
                />
              </label>

              <label className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 flex items-start justify-between gap-3 cursor-pointer">
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    Izinkan Simulasi Pratinjau Login
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Tampilkan tombol akses simulasi peran cepat pada layar login.
                  </p>
                </div>
                <input
                  type="checkbox"
                  disabled={!isSuperAdminSession}
                  checked={webAccessPolicy.allowDemoPreview}
                  onChange={e => updateWebAccessPolicy({ allowDemoPreview: e.target.checked })}
                  className="mt-0.5 w-4 h-4 accent-[#102D63] cursor-pointer disabled:cursor-not-allowed"
                />
              </label>
            </div>
          </div>

          {/* Tabel Daftar Pengguna Akses Login */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nama, email, atau peran..."
                  value={accessSearch}
                  onChange={e => setAccessSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#164E91]"
                />
              </div>

              <div className="flex items-center gap-2">
                {(['ALL', 'ACTIVE', 'BLOCKED'] as const).map(st => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setAccessStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      accessStatusFilter === st
                        ? 'bg-[#071D49] text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {st === 'ALL' ? 'Semua' : st === 'ACTIVE' ? 'Diizinkan' : 'Dinonaktifkan'}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800 font-bold uppercase text-[11px] text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="p-3">Pengguna & Catatan</th>
                    <th className="p-3">Email Login</th>
                    <th className="p-3">Peran RBAC</th>
                    <th className="p-3 text-center">Metode Login</th>
                    <th className="p-3 text-center">Status Akses</th>
                    <th className="p-3">Login Terakhir</th>
                    <th className="p-3 text-right">Pengaturan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredAccessUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-400 italic">
                        Tidak ada akun akses login yang sesuai filter pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredAccessUsers.map(u => {
                      const isProtected = Boolean(
                        u.isProtectedAdmin || isProtectedSuperAdminEmail(u.email)
                      );
                      return (
                        <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                          <td className="p-3">
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{u.name}</span>
                              {isProtected && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-bold">
                                  Admin Inti
                                </span>
                              )}
                            </div>
                            {u.notes && (
                              <div className="text-[11px] text-slate-500 mt-0.5">{u.notes}</div>
                            )}
                            {u.supplierName && (
                              <div className="text-[10px] text-sky-700 dark:text-sky-400 font-medium mt-0.5">
                                Mitra: {u.supplierName}
                              </div>
                            )}
                          </td>
                          <td className="p-3 font-mono text-slate-700 dark:text-slate-300">
                            {u.email}
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-[#102D63] dark:text-sky-300 font-semibold border border-blue-200/70 dark:border-blue-800">
                              {u.role}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                                Sandi
                              </span>
                              {u.allowGoogleLogin && (
                                <span className="px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-[10px] font-semibold text-sky-800 dark:text-sky-300">
                                  Google
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                u.isActive
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              }`}
                            >
                              {u.isActive ? (
                                <>
                                  <UserCheck className="w-3 h-3" />
                                  <span>Diizinkan</span>
                                </>
                              ) : (
                                <>
                                  <UserX className="w-3 h-3" />
                                  <span>Diblokir</span>
                                </>
                              )}
                            </span>
                          </td>
                          <td className="p-3 text-slate-500 font-mono text-[11px]">
                            {u.lastLoginAt || 'Belum pernah'}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-end gap-1.5">
                              {isSuperAdminSession && !isProtected && (
                                <button
                                  type="button"
                                  onClick={() => toggleWebAccessStatus(u.id)}
                                  title={u.isActive ? 'Nonaktifkan izin login' : 'Aktifkan izin login'}
                                  className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition ${
                                    u.isActive
                                      ? 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                                  }`}
                                >
                                  {u.isActive ? 'Blokir' : 'Izinkan'}
                                </button>
                              )}

                              {isSuperAdminSession && (
                                <button
                                  type="button"
                                  onClick={() => openEditWebAccessModal(u)}
                                  className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-semibold inline-flex items-center gap-1 transition"
                                >
                                  <Edit3 className="w-3 h-3" />
                                  <span>Edit / Sandi</span>
                                </button>
                              )}

                              {isSuperAdminSession && !isProtected && (
                                <button
                                  type="button"
                                  onClick={() => setDeletingAccessUser(u)}
                                  title="Hapus akun akses"
                                  className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal Daftarkan Akun Login Manual */}
          <Modal
            isOpen={isAddUserOpen}
            onClose={() => setIsAddUserOpen(false)}
            title="Daftarkan Akun Akses Login Web (Manual)"
            maxWidth="lg"
          >
            <form onSubmit={handleCreateWebAccessUser} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Nama Lengkap Pengguna *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Siti Aminah, S.Gz."
                    value={newUserForm.name}
                    onChange={e => setNewUserForm({ ...newUserForm, name: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Email Login Web *
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      placeholder="petugas@sppg-tmg2.id"
                      value={newUserForm.email}
                      onChange={e => setNewUserForm({ ...newUserForm, email: e.target.value })}
                      className="w-full pl-8 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">
                      Kata Sandi Login *
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setNewUserForm({ ...newUserForm, password: generateRandomPassword() })
                      }
                      className="text-[11px] font-semibold text-[#164E91] hover:underline"
                    >
                      Buat Acak
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showAddPassword ? 'text' : 'password'}
                      required
                      minLength={4}
                      placeholder="Minimal 4 karakter"
                      value={newUserForm.password}
                      onChange={e => setNewUserForm({ ...newUserForm, password: e.target.value })}
                      className="w-full pl-3 pr-9 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAddPassword(prev => !prev)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700"
                    >
                      {showAddPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Peran / Hak Akses RBAC *
                  </label>
                  <select
                    value={newUserForm.role}
                    onChange={e =>
                      setNewUserForm({ ...newUserForm, role: e.target.value as RoleType })
                    }
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                  >
                    {allAssignableRoles.map(r => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                {newUserForm.role === 'Supplier / Mitra Pangan' && (
                  <div className="sm:col-span-2">
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Hubungkan ke Mitra Supplier
                    </label>
                    <select
                      value={newUserForm.supplierId}
                      onChange={e =>
                        setNewUserForm({ ...newUserForm, supplierId: e.target.value })
                      }
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                    >
                      <option value="">-- Pilih Supplier --</option>
                      {masterSuppliers.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Catatan / Jabatan Tambahan
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Petugas Verifikasi Faktur & RAB"
                    value={newUserForm.notes}
                    onChange={e => setNewUserForm({ ...newUserForm, notes: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-4 pt-1">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newUserForm.isActive}
                    onChange={e => setNewUserForm({ ...newUserForm, isActive: e.target.checked })}
                    className="w-4 h-4 accent-[#102D63]"
                  />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Izinkan Login Sekarang (Aktif)
                  </span>
                </label>

                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newUserForm.allowGoogleLogin}
                    onChange={e =>
                      setNewUserForm({ ...newUserForm, allowGoogleLogin: e.target.checked })
                    }
                    className="w-4 h-4 accent-[#102D63]"
                  />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Izinkan Login Google SSO untuk email ini
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#071D49] hover:bg-[#102D63] text-white font-bold flex items-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5 text-[#F2D58B]" />
                  <span>Simpan & Daftarkan Akun</span>
                </button>
              </div>
            </form>
          </Modal>

          {/* Modal Edit Pengguna & Reset Kata Sandi */}
          <Modal
            isOpen={Boolean(editingAccessUser)}
            onClose={() => setEditingAccessUser(null)}
            title="Edit Akses Pengguna & Reset Kata Sandi"
            maxWidth="lg"
          >
            {editingAccessUser && (
              <form onSubmit={handleSaveEditWebAccess} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Nama Lengkap
                    </label>
                    <input
                      type="text"
                      required
                      value={editUserForm.name}
                      onChange={e => setEditUserForm({ ...editUserForm, name: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Email Login
                    </label>
                    <input
                      type="email"
                      required
                      disabled={Boolean(
                        editingAccessUser.isProtectedAdmin ||
                          isProtectedSuperAdminEmail(editingAccessUser.email)
                      )}
                      value={editUserForm.email}
                      onChange={e => setEditUserForm({ ...editUserForm, email: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Peran RBAC
                    </label>
                    <select
                      disabled={Boolean(
                        editingAccessUser.isProtectedAdmin ||
                          isProtectedSuperAdminEmail(editingAccessUser.email)
                      )}
                      value={editUserForm.role}
                      onChange={e =>
                        setEditUserForm({ ...editUserForm, role: e.target.value as RoleType })
                      }
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl disabled:opacity-60"
                    >
                      {allAssignableRoles.map(r => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Reset Kata Sandi Baru (Opsional)
                    </label>
                    <div className="relative">
                      <input
                        type={showEditPassword ? 'text' : 'password'}
                        placeholder="Kosongkan jika tidak diubah"
                        value={editUserForm.newPassword}
                        onChange={e =>
                          setEditUserForm({ ...editUserForm, newPassword: e.target.value })
                        }
                        className="w-full pl-3 pr-9 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                      />
                      <button
                        type="button"
                        onClick={() => setShowEditPassword(prev => !prev)}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700"
                      >
                        {showEditPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Catatan
                    </label>
                    <input
                      type="text"
                      value={editUserForm.notes}
                      onChange={e => setEditUserForm({ ...editUserForm, notes: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                </div>

                {!editingAccessUser.isProtectedAdmin &&
                  !isProtectedSuperAdminEmail(editingAccessUser.email) && (
                    <div className="flex flex-wrap gap-4 pt-1">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editUserForm.isActive}
                          onChange={e =>
                            setEditUserForm({ ...editUserForm, isActive: e.target.checked })
                          }
                          className="w-4 h-4 accent-[#102D63]"
                        />
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          Akun Diizinkan Login (Aktif)
                        </span>
                      </label>

                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editUserForm.allowGoogleLogin}
                          onChange={e =>
                            setEditUserForm({
                              ...editUserForm,
                              allowGoogleLogin: e.target.checked,
                            })
                          }
                          className="w-4 h-4 accent-[#102D63]"
                        />
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          Izinkan Login Google SSO
                        </span>
                      </label>
                    </div>
                  )}

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingAccessUser(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#071D49] hover:bg-[#102D63] text-white font-bold flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5 text-[#F2D58B]" />
                    <span>Simpan Perubahan</span>
                  </button>
                </div>
              </form>
            )}
          </Modal>

          <ConfirmDialog
            isOpen={Boolean(deletingAccessUser)}
            onClose={() => setDeletingAccessUser(null)}
            onConfirm={() => {
              if (deletingAccessUser) {
                deleteWebAccessUser(deletingAccessUser.id);
              }
            }}
            title="Hapus Akses Login Web"
            message={`Apakah Anda yakin ingin menghapus akun akses login "${deletingAccessUser?.email}"? Pengguna tersebut tidak akan dapat lagi masuk ke sistem E-SPPG TMG2.`}
            confirmLabel="Ya, Hapus Akses"
            isDestructive
          />
        </div>
      )}

      {/* Tab 2: RBAC Matrix (Module Access + Action Permissions) */}
      {activeTab === 'rbac' && (
        <div className="space-y-6">
          {/* Section A: Matriks Hak Akses Modul / Menu per Peran */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#071D49]/10 text-[#071D49] dark:bg-sky-500/20 dark:text-sky-300 border border-[#071D49]/20 dark:border-sky-500/30">
                    Kontrol Manual Admin Utama
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {ALL_ROLES_LIST.length} Peran × {ALL_MODULES_META.length} Modul
                  </span>
                  {hasUnsavedModuleChanges && isSuperAdminSession && (
                    <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      Perubahan Belum Disimpan
                    </span>
                  )}
                </div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4 text-[#164E91] dark:text-sky-400" />
                  Matriks Hak Akses Modul & Menu per Peran
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Centang modul atau menu yang diizinkan tampil dan diakses untuk masing-masing peran. Perubahan berlaku otomatis pada Sidebar navigasi, pencarian Header, dan Route Guard.
                </p>
              </div>

              {isSuperAdminSession && (
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsConfirmResetModulesOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset ke Default</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveModuleAccess}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#071D49] hover:bg-[#102D63] text-white text-xs font-bold shadow-xs transition cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5 text-[#F2D58B]" />
                    <span>Simpan Akses Modul</span>
                  </button>
                </div>
              )}
            </div>

            {!isSuperAdminSession && (
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Mode Baca Saja:</strong> Anda sedang masuk sebagai peran <strong>{currentUser.role}</strong>. Pengaturan akses modul/menu per peran hanya dapat diubah secara manual oleh <strong>Admin Utama</strong>.
                </div>
              </div>
            )}

            {/* Filter Bar: Role Search & Module Category */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="relative w-full lg:max-w-xs">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={moduleMatrixRoleSearch}
                  onChange={e => setModuleMatrixRoleSearch(e.target.value)}
                  placeholder="Cari nama peran / jabatan..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#164E91] text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {moduleCategories.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setModuleMatrixCategory(cat)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                      moduleMatrixCategory === cat
                        ? 'bg-[#071D49] text-white dark:bg-sky-600'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {cat === 'ALL' ? `Semua Modul (${ALL_MODULES_META.length})` : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-800/90 text-[11px] text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="sticky left-0 z-20 bg-slate-50 dark:bg-slate-800 p-3 min-w-[230px] border-b border-r border-slate-200 dark:border-slate-700 font-bold uppercase tracking-wider">
                      Peran / Jabatan
                    </th>
                    {filteredMatrixModules.map(mod => {
                      const nonAdminRoles = ALL_ROLES_LIST.filter(r => r !== 'Admin Utama');
                      const allNonAdminEnabled = nonAdminRoles.every(r =>
                        (moduleAccessDraft[r] || []).includes(mod.key)
                      );
                      return (
                        <th
                          key={mod.key}
                          title={`${mod.label} — ${mod.description}`}
                          className="p-2.5 min-w-[116px] text-center border-b border-r last:border-r-0 border-slate-200 dark:border-slate-700 align-top"
                        >
                          <div className="text-[9px] font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-0.5">
                            {mod.category}
                          </div>
                          <div className="font-bold text-slate-800 dark:text-slate-100 leading-tight">
                            {mod.shortLabel}
                          </div>
                          {isSuperAdminSession && (
                            <button
                              type="button"
                              onClick={() =>
                                handleToggleModuleForAllRoles(mod.key, !allNonAdminEnabled)
                              }
                              className="mt-1.5 px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] font-semibold text-[#164E91] dark:text-sky-400 hover:bg-blue-50 dark:hover:bg-slate-700 transition cursor-pointer"
                              title={
                                allNonAdminEnabled
                                  ? `Nonaktifkan ${mod.shortLabel} untuk semua peran non-admin`
                                  : `Aktifkan ${mod.shortLabel} untuk semua peran non-admin`
                              }
                            >
                              {allNonAdminEnabled ? 'Cabut Semua' : 'Beri Semua'}
                            </button>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredMatrixRoles.length === 0 ? (
                    <tr>
                      <td
                        colSpan={filteredMatrixModules.length + 1}
                        className="p-6 text-center text-slate-400 italic"
                      >
                        Tidak ada peran yang sesuai kata kunci pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredMatrixRoles.map(role => {
                      const isAdmin = role === 'Admin Utama';
                      const allowedList = isAdmin
                        ? ALL_MODULES_META.map(m => m.key)
                        : moduleAccessDraft[role] || [];
                      const activeCount = allowedList.length;

                      return (
                        <tr
                          key={role}
                          className={
                            isAdmin
                              ? 'bg-indigo-50/40 dark:bg-indigo-950/25 font-bold'
                              : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                          }
                        >
                          <td
                            className={`sticky left-0 z-10 p-3 border-r border-slate-200 dark:border-slate-700 ${
                              isAdmin
                                ? 'bg-indigo-50/95 dark:bg-slate-900'
                                : 'bg-white dark:bg-slate-900'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-slate-900 dark:text-white leading-snug">
                                {role}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${
                                  isAdmin
                                    ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200'
                                    : activeCount === 0
                                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                    : 'bg-blue-50 text-[#102D63] dark:bg-sky-950/60 dark:text-sky-300'
                                }`}
                              >
                                {activeCount}/{ALL_MODULES_META.length}
                              </span>
                            </div>

                            {isAdmin ? (
                              <div className="text-[10px] text-indigo-700 dark:text-indigo-300 font-medium mt-1 flex items-center gap-1">
                                <Lock className="w-3 h-3" />
                                <span>Super Admin — Akses Penuh Terkunci</span>
                              </div>
                            ) : (
                              isSuperAdminSession && (
                                <div className="flex items-center gap-1.5 mt-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleAllModulesForRole(role, true)}
                                    className="px-1.5 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-semibold transition cursor-pointer"
                                  >
                                    Pilih Semua
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleAllModulesForRole(role, false)}
                                    className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 text-slate-600 hover:text-rose-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[10px] font-semibold transition cursor-pointer"
                                  >
                                    Kosongkan
                                  </button>
                                </div>
                              )
                            )}
                          </td>

                          {filteredMatrixModules.map(mod => {
                            const isChecked = isAdmin || allowedList.includes(mod.key);
                            return (
                              <td
                                key={mod.key}
                                className={`p-2.5 text-center border-r last:border-r-0 border-slate-100 dark:border-slate-800 transition-colors ${
                                  isChecked && !isAdmin
                                    ? 'bg-emerald-50/40 dark:bg-emerald-950/15'
                                    : ''
                                }`}
                              >
                                <label className="inline-flex items-center justify-center w-full h-full cursor-pointer">
                                  <input
                                    type="checkbox"
                                    disabled={isAdmin || !isSuperAdminSession}
                                    checked={isChecked}
                                    onChange={() => handleToggleModuleAccess(role, mod.key)}
                                    aria-label={`Izinkan ${role} mengakses modul ${mod.label}`}
                                    className="w-4 h-4 rounded-sm accent-[#071D49] dark:accent-sky-500 cursor-pointer disabled:cursor-not-allowed"
                                  />
                                </label>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section B: Matriks Hak Akses Tindakan (CRUD & Otorisasi) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Lock className="w-4 h-4 text-blue-900 dark:text-sky-400" />
                  Matriks Hak Akses Tindakan (CRUD & Otorisasi)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Mengatur izin aksi tombol tambah, ubah, hapus, setujui, cetak, dan ekspor untuk setiap peran.
                </p>
              </div>
              {isSuperAdminSession && (
                <button
                  type="button"
                  onClick={handleSavePerms}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Matriks Tindakan</span>
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800 font-bold uppercase text-[11px] text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="p-3">Peran / Jabatan</th>
                    {actions.map(a => (
                      <th key={a.key} className="p-3 text-center">
                        {a.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {roles.map(r => {
                    const isAdmin = r === 'Admin Utama';
                    return (
                      <tr
                        key={r}
                        className={isAdmin ? 'bg-indigo-50/30 dark:bg-indigo-950/20 font-bold' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}
                      >
                        <td className="p-3 text-slate-900 dark:text-white">
                          <span>{r}</span>
                          {isAdmin && (
                            <span className="block text-[10px] text-indigo-600 font-normal">
                              (Super Admin - Semua Hak)
                            </span>
                          )}
                        </td>
                        {actions.map(a => {
                          const isChecked = isAdmin || (permsState[r]?.[a.key] ?? false);
                          return (
                            <td key={a.key} className="p-3 text-center">
                              <input
                                type="checkbox"
                                disabled={isAdmin || !isSuperAdminSession}
                                checked={isChecked}
                                onChange={() => handleTogglePerm(r, a.key)}
                                className="w-4 h-4 rounded-sm accent-blue-900 dark:accent-sky-500 cursor-pointer disabled:cursor-not-allowed"
                              />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <ConfirmDialog
            isOpen={isConfirmResetModulesOpen}
            onClose={() => setIsConfirmResetModulesOpen(false)}
            onConfirm={() => {
              void handleConfirmResetModuleAccess();
            }}
            title="Reset Matriks Akses Modul ke Default"
            message="Apakah Anda yakin ingin mengembalikan seluruh hak akses modul/menu untuk semua peran ke pengaturan bawaan standar SPPG?"
            confirmLabel="Ya, Reset ke Default"
            isDestructive
          />
        </div>
      )}

      {/* Tab 3: Database & Backup (39 Koleksi Terhubung) */}
      {activeTab === 'database' && (
        <div className="space-y-6">
          {/* Top Banner: Status Koneksi & Arsitektur */}
          <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-blue-950 text-white p-6 rounded-2xl border border-blue-900 shadow-md">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Firestore Enterprise Aktif
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-blue-500/20 text-sky-300 border border-blue-500/30">
                    Tenant SPPG: {CURRENT_SPPG_ID}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <Database className="w-5 h-5 text-amber-400" />
                  Koleksi Database Terpisah & Terhubung (39 Koleksi)
                </h3>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                  Setiap dokumen memiliki identitas ID, Created At, Created By, Updated At, Updated By, Status, Riwayat Perubahan, serta Soft Delete. Transaksi multi-koleksi ditegakkan dengan Firestore <code className="text-amber-300 font-mono">runTransaction</code> & <code className="text-amber-300 font-mono">writeBatch</code>.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  disabled={isExportingBackup}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>{isExportingBackup ? 'Mengekspor...' : 'Unduh Backup (.json)'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Filter Categories */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                selectedCategory === 'ALL'
                  ? 'bg-blue-900 text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              Semua Domain (39 Koleksi)
            </button>
            {Object.keys(collectionCategories).map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  selectedCategory === cat
                    ? 'bg-blue-900 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Directory of 39 Collections */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCategories.map(([catName, catData]) => (
              <div
                key={catName}
                className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 mb-3">
                    <h4 className="text-xs font-bold text-blue-950 dark:text-sky-400 uppercase tracking-wider">
                      {catName}
                    </h4>
                    <span className="text-[10px] font-mono bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-sky-300 px-2 py-0.5 rounded-full font-bold">
                      {catData.collections.length} Koleksi
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-3">{catData.desc}</p>

                  <div className="space-y-2">
                    {catData.collections.map(col => (
                      <div
                        key={col.name}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-start justify-between gap-2"
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                              {col.title}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {col.desc}
                          </p>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold shrink-0">
                          Aktif
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Soft Delete & Trash Bin Recovery Center */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  Mekanisme Soft Delete & Pemulihan Data (Trash Bin)
                </h3>
                <p className="text-xs text-slate-500">
                  Data yang dihapus ditandai status <code className="font-mono text-rose-600 font-bold">isDeleted: true</code> tanpa menghilangkan histori transaksi dan dapat dipulihkan sewaktu-waktu.
                </p>
              </div>
              <span className="text-xs font-bold text-slate-500">
                {softDeletedRecords.length} Dokumen Dihapus Sementara
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800 font-bold uppercase text-[11px] text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="p-3">ID Dokumen</th>
                    <th className="p-3">Koleksi</th>
                    <th className="p-3">Uraian Dokumen</th>
                    <th className="p-3">Dihapus Oleh & Waktu</th>
                    <th className="p-3">Alasan Penghapusan</th>
                    <th className="p-3 text-center">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {softDeletedRecords.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-slate-400 italic">
                        Tidak ada dokumen dalam status soft-delete.
                      </td>
                    </tr>
                  ) : (
                    softDeletedRecords.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-3 font-mono font-bold text-blue-900 dark:text-sky-400">
                          {item.id}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px] text-slate-700 dark:text-slate-300">
                            {item.collection}
                          </span>
                        </td>
                        <td className="p-3 font-medium text-slate-900 dark:text-white">
                          {item.name}
                        </td>
                        <td className="p-3 text-slate-500">
                          <div>{item.deletedBy}</div>
                          <div className="text-[10px] text-slate-400">{item.deletedAt}</div>
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-300 italic">
                          "{item.reason}"
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRestoreRecord(item.id)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 mx-auto transition"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Restore</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Security Features: File Validation & PII Protection Console */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Box 1: File Upload Security Validator */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                <UploadCloud className="w-5 h-5 text-indigo-600" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Uji Validasi Unggah Berkas & Batas Ukuran
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Maks. 5 MB • Whitelist MIME: JPEG, PNG, WebP, PDF • Sanitasi nama berkas
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Pilih Berkas Pengujian:
                </label>
                <input
                  type="file"
                  onChange={handleTestFileUpload}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-900 hover:file:bg-blue-100"
                />
              </div>

              {testUploadResult && (
                <div
                  className={`p-3 rounded-xl border text-xs space-y-1 ${
                    testUploadResult.isValid
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold">
                    {testUploadResult.isValid ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                    )}
                    <span>{testUploadResult.isValid ? 'Berkas Memenuhi Standar Keamanan' : 'Berkas Ditolak'}</span>
                  </div>
                  <p className="text-[11px]">
                    Nama tersanitasi: <code className="font-mono font-bold">{testUploadResult.sanitizedFileName}</code>
                  </p>
                  <p className="text-[11px]">
                    Ukuran: {(testUploadResult.fileSizeBytes / 1024).toFixed(1)} KB
                  </p>
                  {testUploadResult.errorMessage && (
                    <p className="text-[11px] font-semibold text-rose-700">
                      Alasan: {testUploadResult.errorMessage}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Box 2: Proteksi Data Sensitif (Masking PII) */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                <Lock className="w-5 h-5 text-amber-600" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Proteksi Data Sensitif & PII (Masking)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Kata sandi tidak disimpan dalam database • Masking nomor rekening & telepon
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-between">
                  <span className="text-slate-500">Nomor Rekening Bank Supplier:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {maskSensitiveData('00340100291531', 'bank')}
                  </span>
                </div>

                <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-between">
                  <span className="text-slate-500">Nomor Telepon Pribadi Relawan:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {maskSensitiveData('081234567890', 'phone')}
                  </span>
                </div>

                <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-between">
                  <span className="text-slate-500">Email Personel Terproteksi:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {maskSensitiveData('ahmad.zaini@sppg.id', 'email')}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 italic">
                Hak akses melihat data sensitif tanpa masking hanya diberikan kepada peran Kepala SPPG dan Pengawas Keuangan.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Security & Audit Log Trail */}
      {activeTab === 'audit' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Audit Trail & Log Aktivitas Sistem
              </h3>
              <p className="text-xs text-slate-500">
                Pencatatan setiap aksi penting, perubahan data, persetujuan dan login untuk akuntabilitas (Immutable)
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              Audit Tamper-Proof
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800 font-bold uppercase text-[11px] text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="p-2.5">Waktu</th>
                  <th className="p-2.5">Pengguna & Peran</th>
                  <th className="p-2.5 text-center">Tindakan</th>
                  <th className="p-2.5">Modul</th>
                  <th className="p-2.5">Rincian Perubahan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {auditLogs.map(log => {
                  const badgeAction = {
                    LOGIN: 'bg-slate-100 text-slate-700',
                    LOGOUT: 'bg-slate-200 text-slate-700',
                    CREATE: 'bg-emerald-100 text-emerald-800',
                    UPDATE: 'bg-blue-100 text-blue-800',
                    DELETE: 'bg-rose-100 text-rose-800',
                    APPROVE: 'bg-purple-100 text-purple-800',
                    PRINT: 'bg-amber-100 text-amber-800',
                    EXPORT: 'bg-sky-100 text-sky-800',
                  };
                  return (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-2.5 font-mono text-slate-500 whitespace-nowrap">
                        {log.timestamp}
                      </td>
                      <td className="p-2.5">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {log.userName}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {log.userRole}
                        </div>
                      </td>
                      <td className="p-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeAction[log.action]}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="p-2.5 font-mono text-blue-900 dark:text-sky-400 font-semibold uppercase">
                        {log.module}
                      </td>
                      <td className="p-2.5 text-slate-700 dark:text-slate-300">
                        {log.details}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
