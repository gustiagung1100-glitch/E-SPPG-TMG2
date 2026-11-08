import React, { useState } from 'react';
import { useApp } from '../../lib/store';
import { RoleType, ActionPermission } from '../../types';
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
  } = useApp();

  const [activeTab, setActiveTab] = useState<'profil' | 'rbac' | 'audit'>('profil');

  // Org Profile State
  const [profileForm, setProfileForm] = useState({ ...sppgConfig });

  // Permissions state clone for editing
  const [permsState, setPermsState] = useState({ ...rolePermissions });

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

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-900 dark:text-sky-400" />
            Pengaturan Sistem & Hak Akses (RBAC)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Konfigurasi Identitas Satuan Pelayanan, Matriks Otorisasi Peran & Audit Log Keamanan
          </p>
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 text-xs font-bold">
        <button
          onClick={() => setActiveTab('profil')}
          className={`pb-3 flex items-center gap-2 transition border-b-2 ${
            activeTab === 'profil'
              ? 'border-blue-900 dark:border-sky-500 text-blue-900 dark:text-sky-400'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Identitas SPPG & Organisasi</span>
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
                  Identitas Lembaga Satuan Pelayanan Pemenuhan Gizi
                </h3>
                <p className="text-xs text-slate-500">
                  Data ini dicetak otomatis pada Kop Surat, BAST, Purchase Order, dan Laporan Resmi BGN
                </p>
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-900 hover:bg-blue-800 dark:bg-sky-600 dark:hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-sm transition"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Perubahan</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Satuan Pelayanan (SPPG) *
                </label>
                <input
                  type="text"
                  required
                  value={profileForm.sppgName}
                  onChange={e => setProfileForm({ ...profileForm, sppgName: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Yayasan Penyelenggara *
                </label>
                <input
                  type="text"
                  required
                  value={profileForm.foundationName}
                  onChange={e => setProfileForm({ ...profileForm, foundationName: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nomor Identitas SPPG (BGN ID) *
                </label>
                <input
                  type="text"
                  required
                  value={profileForm.sppgId}
                  onChange={e => setProfileForm({ ...profileForm, sppgId: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-blue-900 dark:text-sky-400"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Program Nasional *
                </label>
                <input
                  type="text"
                  required
                  value={profileForm.programName}
                  onChange={e => setProfileForm({ ...profileForm, programName: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Badan Pembina Nasional
                </label>
                <input
                  type="text"
                  value={profileForm.nationalAgency}
                  onChange={e => setProfileForm({ ...profileForm, nationalAgency: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Alamat Kantor & Dapur Sentral SPPG *
              </label>
              <input
                type="text"
                required
                value={profileForm.address}
                onChange={e => setProfileForm({ ...profileForm, address: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Kepala SPPG (Pejabat Berwenang) *
                </label>
                <input
                  type="text"
                  required
                  value={profileForm.headOfSppg}
                  onChange={e => setProfileForm({ ...profileForm, headOfSppg: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Pengawas Gizi (Dietisien) *
                </label>
                <input
                  type="text"
                  required
                  value={profileForm.nutritionOfficer}
                  onChange={e => setProfileForm({ ...profileForm, nutritionOfficer: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Pengawas Keuangan (Akuntan) *
                </label>
                <input
                  type="text"
                  required
                  value={profileForm.financeOfficer}
                  onChange={e => setProfileForm({ ...profileForm, financeOfficer: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  No. Telepon / Layanan Pengaduan *
                </label>
                <input
                  type="text"
                  required
                  value={profileForm.phone}
                  onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email Resmi SPPG *
                </label>
                <input
                  type="email"
                  required
                  value={profileForm.email}
                  onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Tab 2: Role Permissions Matrix */}
      {activeTab === 'rbac' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Matriks Otorisasi & Hak Akses (12 Peran Operasional)
              </h3>
              <p className="text-xs text-slate-500">
                Atur kewenangan setiap peran untuk melihat, membuat, mengubah, menghapus, menyetujui, mencetak, atau mengekspor data
              </p>
            </div>
            {currentUser.role === 'Admin Utama' && (
              <button
                type="button"
                onClick={handleSavePerms}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-900 hover:bg-blue-800 dark:bg-sky-600 text-white rounded-xl text-xs font-bold shadow-sm transition"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Matriks Hak Akses</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border border-slate-200 dark:border-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-800 font-bold uppercase text-[11px] text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="p-3 w-56">Peran Pengguna</th>
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
                    <tr key={r} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">
                        {r}
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

      {/* Tab 3: Security & Audit Log Trail */}
      {activeTab === 'audit' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Audit Trail & Log Aktivitas Sistem
              </h3>
              <p className="text-xs text-slate-500">
                Pencatatan setiap aksi penting, perubahan data, persetujuan dan login untuk akuntabilitas
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
