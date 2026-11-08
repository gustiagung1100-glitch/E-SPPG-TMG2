import React, { useState } from 'react';
import { useApp } from '../../lib/store';
import { DataTable, Column } from '../common/DataTable';
import { Modal } from '../common/Modal';
import { exportTableToPDF, exportToExcel, triggerPrint } from '../../lib/exportUtils';
import { VolunteerAttendance } from '../../types';
import {
  Users2,
  Plus,
  UserCheck,
  UserX,
  ShieldCheck,
  AlertTriangle,
  Clock,
  HeartPulse,
} from 'lucide-react';

export const VolunteersModule: React.FC = () => {
  const {
    volunteerAttendance,
    recordAttendance,
    updateAttendance,
    hasPermission,
    sppgConfig,
  } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAtt, setSelectedAtt] = useState<VolunteerAttendance | null>(null);

  // Form State
  const [formData, setFormData] = useState<Omit<VolunteerAttendance, 'id'>>({
    date: new Date().toISOString().slice(0, 10),
    volunteerId: `vol-${Math.floor(Math.random() * 80) + 20}`,
    volunteerName: '',
    division: 'Persiapan',
    shift: 'Pagi (03:30 - 08:30)',
    status: 'Hadir',
    healthCheckPassed: true,
    hygieneGearComplete: true,
    reason: '',
    replacementVolunteer: '',
    notes: 'Kondisi fit dan APD lengkap',
  });

  const handleOpenCreate = () => {
    setSelectedAtt(null);
    setFormData({
      date: new Date().toISOString().slice(0, 10),
      volunteerId: `vol-${Math.floor(Math.random() * 80) + 20}`,
      volunteerName: '',
      division: 'Persiapan',
      shift: 'Pagi (03:30 - 08:30)',
      status: 'Hadir',
      healthCheckPassed: true,
      hygieneGearComplete: true,
      reason: '',
      replacementVolunteer: '',
      notes: 'Pemeriksaan suhu 36.4°C normal, APD lengkap.',
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedAtt) {
      await updateAttendance(selectedAtt.id, formData);
    } else {
      await recordAttendance(formData);
    }
    setIsModalOpen(false);
  };

  // Absent Volunteers
  const absentVolunteers = volunteerAttendance.filter(
    v => v.status === 'Sakit' || v.status === 'Izin' || v.status === 'Alpa'
  );
  const presentCount = volunteerAttendance.filter(v => v.status === 'Hadir').length;

  // Export handlers
  const handleExportPDF = () => {
    exportTableToPDF({
      title: 'Laporan Kehadiran & Sanitasi Relawan SPPG',
      subtitle: `Satuan Pelayanan Pemenuhan Gizi (SPPG) Probolinggo Krejengan Temenggungan 2`,
      headers: ['Nama Relawan', 'Divisi Tugas', 'Shift', 'Status Kehadiran', 'Cek Kesehatan', 'Relawan Pengganti', 'Keterangan'],
      rows: volunteerAttendance.map(v => [
        v.volunteerName,
        v.division,
        v.shift,
        v.status,
        v.healthCheckPassed ? 'Lolos Sehat' : 'Tidak Lolos',
        v.replacementVolunteer || '-',
        v.reason || v.notes || '-',
      ]),
      fileName: 'Presensi_Relawan_SPPG_TMG2',
      sppgConfig,
      signerName: sppgConfig.headOfSppg,
      signerRole: 'Kepala SPPG Temenggungan 2',
    });
  };

  const handleExportExcel = () => {
    const dataToExport = volunteerAttendance.map(v => ({
      'Tanggal': v.date,
      'Nama Relawan': v.volunteerName,
      'Divisi': v.division,
      'Shift': v.shift,
      'Status': v.status,
      'Lolos Uji Kesehatan': v.healthCheckPassed ? 'Ya' : 'Tidak',
      'APD Lengkap': v.hygieneGearComplete ? 'Ya' : 'Tidak',
      'Alasan Ketidakhadiran': v.reason || '-',
      'Relawan Pengganti': v.replacementVolunteer || '-',
      'Catatan': v.notes || '-',
    }));
    exportToExcel(dataToExport, 'Presensi_Relawan_SPPG_TMG2', 'Data Relawan');
  };

  const columns: Column<VolunteerAttendance>[] = [
    {
      key: 'volunteerName',
      header: 'Nama Relawan & ID',
      render: row => (
        <div>
          <div className="font-bold text-slate-900 dark:text-white">
            {row.volunteerName}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            ID: {row.volunteerId}
          </div>
        </div>
      ),
    },
    {
      key: 'division',
      header: 'Divisi Tugas & Shift',
      render: row => (
        <div className="text-xs">
          <div className="font-semibold text-blue-900 dark:text-sky-400">
            Divisi {row.division}
          </div>
          <div className="text-[11px] text-slate-500">
            {row.shift}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status Presensi',
      render: row => {
        const badgeColors = {
          Hadir: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
          Izin: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
          Sakit: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
          Alpa: 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
        };
        return (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeColors[row.status]}`}>
            {row.status}
          </span>
        );
      },
    },
    {
      key: 'health',
      header: 'Cek Higiene & APD',
      render: row => (
        <div className="text-xs space-y-0.5">
          <div className="flex items-center gap-1 font-semibold text-emerald-600">
            <HeartPulse className="w-3.5 h-3.5" />
            <span>{row.healthCheckPassed ? 'Sehat (Bebas Flu)' : 'Tidak Sehat'}</span>
          </div>
          <div className="text-[10px] text-slate-500">
            {row.hygieneGearComplete ? '✓ Celemek, Hairnet, Sarung Tangan' : '✗ APD Belum Lengkap'}
          </div>
        </div>
      ),
    },
    {
      key: 'notes',
      header: 'Catatan & Pengganti',
      render: row => (
        <div className="text-xs max-w-xs">
          {row.replacementVolunteer ? (
            <div className="text-orange-700 dark:text-orange-300 font-semibold text-[11px]">
              Pengganti: {row.replacementVolunteer} ({row.reason})
            </div>
          ) : (
            <div className="text-slate-500 text-[11px] truncate">
              {row.notes || '-'}
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users2 className="w-6 h-6 text-blue-900 dark:text-sky-400" />
            Manajemen Relawan & Presensi SDM Dapur
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            28 Relawan Terbagi 5 Divisi • Pemeriksaan Higiene Harian & Cadangan Relawan
          </p>
        </div>

        {hasPermission('volunteers', 'create') && (
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900 hover:bg-blue-800 dark:bg-sky-600 dark:hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Presensi Harian</span>
          </button>
        )}
      </div>

      {/* Prominent Alert: Informasi Relawan Tidak Hadir */}
      {absentVolunteers.length > 0 && (
        <div className="p-4 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900 shadow-xs">
          <div className="flex items-center gap-2 font-bold text-xs text-orange-900 dark:text-orange-200 mb-2">
            <AlertTriangle className="w-4 h-4 text-orange-600" />
            <span>Informasi Relawan Tidak Hadir Hari Ini ({absentVolunteers.length} Orang)</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {absentVolunteers.map(v => (
              <div
                key={v.id}
                className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-orange-200 dark:border-orange-800/60"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">
                    {v.volunteerName} ({v.status})
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 dark:bg-orange-950">
                    Divisi {v.division}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">
                  Alasan: <em>{v.reason || 'Tidak ada keterangan'}</em>
                </div>
                <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  Pengganti: {v.replacementVolunteer || 'Belum ada pengganti'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs text-slate-500 uppercase font-bold">Total Tim Relawan</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            28 Relawan
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Warga Desa Temenggungan</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs text-slate-500 uppercase font-bold">Relawan Hadir Hari Ini</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {presentCount} Relawan
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">Operasional 100% Tercukupi</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs text-slate-500 uppercase font-bold">Relawan Tidak Hadir</div>
          <div className="text-2xl font-black text-orange-600 mt-1">
            {absentVolunteers.length} Orang
          </div>
          <div className="text-[11px] text-orange-600 font-semibold mt-0.5">Tergantikan Tim Cadangan</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs text-slate-500 uppercase font-bold">Kepatuhan Higiene & APD</div>
          <div className="text-2xl font-black text-blue-900 dark:text-sky-400 mt-1">
            100%
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">SOP Sanitasi Puskesmas</div>
        </div>
      </div>

      {/* Attendance Data Table */}
      <DataTable
        title="Daftar Presensi & Catatan Kesehatan Harian Relawan"
        subtitle="Pencatatan shift, uji kelayakan kesehatan fisik sebelum menyentuh makanan"
        data={volunteerAttendance}
        columns={columns}
        keyExtractor={item => item.id}
        searchPlaceholder="Cari nama relawan, divisi, shift..."
        searchKeys={['volunteerName', 'division', 'status', 'replacementVolunteer']}
        onExportPDF={handleExportPDF}
        onExportExcel={handleExportExcel}
        onPrint={triggerPrint}
      />

      {/* Modal Form: Record Attendance */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Catat Presensi & Kesehatan Relawan"
        subtitle="Formulir absensi, kesehatan, dan alokasi relawan pengganti jika berhalangan"
        maxWidth="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Nama Relawan *
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Dewi Sartika"
              value={formData.volunteerName}
              onChange={e => setFormData({ ...formData, volunteerName: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Divisi Penugasan *
              </label>
              <select
                value={formData.division}
                onChange={e => setFormData({ ...formData, division: e.target.value as any })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                {['Persiapan', 'Pengolahan', 'Pemorsian', 'Distribusi', 'Cuci Ompreng', 'Kebersihan'].map(d => (
                  <option key={d} value={d}>
                    Divisi {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Status Kehadiran *
              </label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
              >
                <option value="Hadir">Hadir</option>
                <option value="Izin">Izin</option>
                <option value="Sakit">Sakit</option>
                <option value="Alpa">Alpa</option>
              </select>
            </div>
          </div>

          {formData.status !== 'Hadir' && (
            <div className="p-3 bg-orange-50 dark:bg-orange-950/40 rounded-xl border border-orange-200 dark:border-orange-800 space-y-3">
              <div>
                <label className="block text-xs font-bold text-orange-900 dark:text-orange-200 mb-1">
                  Alasan Tidak Hadir *
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Demam, flu / Ada urusan keluarga"
                  value={formData.reason || ''}
                  onChange={e => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-orange-300 dark:border-orange-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-orange-900 dark:text-orange-200 mb-1">
                  Relawan Cadangan Pengganti
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Bu Anisa (Relawan Cadangan Desa Temenggungan)"
                  value={formData.replacementVolunteer || ''}
                  onChange={e => setFormData({ ...formData, replacementVolunteer: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-orange-300 dark:border-orange-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.healthCheckPassed}
                onChange={e => setFormData({ ...formData, healthCheckPassed: e.target.checked })}
                className="w-4 h-4 rounded-sm accent-blue-900"
              />
              <span>Lolos Uji Kesehatan (Bebas Batuk/Flu)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.hygieneGearComplete}
                onChange={e => setFormData({ ...formData, hygieneGearComplete: e.target.checked })}
                className="w-4 h-4 rounded-sm accent-blue-900"
              />
              <span>APD & Higiene Lengkap</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-lg transition"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 dark:bg-sky-600 rounded-lg shadow-sm transition"
            >
              Simpan Presensi
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
