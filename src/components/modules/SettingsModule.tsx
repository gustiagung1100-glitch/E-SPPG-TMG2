import React, { useState } from 'react';
import { useApp } from '../../lib/store';
import { RoleType, ActionPermission } from '../../types';
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
  KeyRound,
  FileCheck,
  Search,
  Sparkles,
  Layers,
  ArrowRight,
} from 'lucide-react';

export const SettingsModule: React.FC = () => {
  const {
    sppgConfig,
    updateSPPGConfig,
    rolePermissions,
    updateRolePermissions,
    auditLogs,
    currentUser,
    isFirebaseConnected,
    addToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'profil' | 'rbac' | 'database' | 'audit'>('profil');

  // Org Profile State
  const [profileForm, setProfileForm] = useState({ ...sppgConfig });

  // Permissions state clone for editing
  const [permsState, setPermsState] = useState({ ...rolePermissions });

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
    if (role === 'Admin Utama') return; // Admin Utama is permanently true
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

  const roles: RoleType[] = [
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
  ];

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
          onClick={() => setActiveTab('rbac')}
          className={`pb-3 flex items-center gap-2 transition border-b-2 ${
            activeTab === 'rbac'
              ? 'border-blue-900 dark:border-sky-500 text-blue-900 dark:text-sky-400'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Matriks Hak Akses (12 Peran)</span>
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

      {/* Tab 2: RBAC Matrix */}
      {activeTab === 'rbac' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-blue-900 dark:text-sky-400" />
                Matriks Hak Akses Peran (Role-Based Access Control)
              </h3>
              <p className="text-xs text-slate-500">
                Hak akses diverifikasi di level backend (Firestore Security Rules) dan frontend controller.
              </p>
            </div>
            {currentUser.role === 'Admin Utama' && (
              <button
                onClick={handleSavePerms}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-xs transition"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Matriks Peran</span>
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
                              disabled={isAdmin || currentUser.role !== 'Admin Utama'}
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
