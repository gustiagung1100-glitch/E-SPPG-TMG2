import React, { useState, useMemo } from 'react';
import { useApp } from '../../lib/store';
import { DataTable, Column } from '../common/DataTable';
import { Modal } from '../common/Modal';
import { exportTableToPDF, exportToExcel, triggerPrint, formatIndonesianDate } from '../../lib/exportUtils';
import { VolunteerAttendance, VolunteerAbsenceRecord } from '../../types';
import {
  Users2,
  Plus,
  UserCheck,
  UserX,
  ShieldCheck,
  AlertTriangle,
  Clock,
  HeartPulse,
  Calendar,
  CheckCircle,
  XCircle,
  ArrowRightLeft,
  FileText,
  Download,
  Filter,
  Search,
  Check,
  X,
  Trash2,
  Eye,
  FileCheck,
  Sparkles,
} from 'lucide-react';

export const VolunteersModule: React.FC = () => {
  const {
    volunteerAttendance,
    recordAttendance,
    updateAttendance,
    volunteerAbsences,
    addVolunteerAbsence,
    approveVolunteerAbsence,
    rejectVolunteerAbsence,
    deleteVolunteerAbsence,
    masterVolunteers,
    currentUser,
    hasPermission,
    sppgConfig,
    addToast,
  } = useApp();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'attendance' | 'absences' | 'directory'>('absences');

  // Attendance Form Modal
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [selectedAtt, setSelectedAtt] = useState<VolunteerAttendance | null>(null);

  // Absence Form Modal
  const [isAbsenceModalOpen, setIsAbsenceModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedAbsenceForReject, setSelectedAbsenceForReject] = useState<VolunteerAbsenceRecord | null>(null);
  const [rejectionReasonText, setRejectionReasonText] = useState('');

  // Attendance Form State
  const [attFormData, setAttFormData] = useState<Omit<VolunteerAttendance, 'id'>>({
    date: new Date().toISOString().slice(0, 10),
    volunteerId: 'vol-01',
    volunteerName: '',
    division: 'Persiapan',
    shift: 'Pagi (03:30 - 08:30)',
    status: 'Hadir',
    healthCheckPassed: true,
    hygieneGearComplete: true,
    reason: '',
    replacementVolunteer: '',
    notes: 'Kondisi fit prima, APD celemek, hairnet & sarung tangan lengkap.',
  });

  // Absence Form State (Modul Ketidakhadiran Relawan)
  const [absenceFormData, setAbsenceFormData] = useState<Omit<VolunteerAbsenceRecord, 'id' | 'createdAt'>>({
    date: new Date().toISOString().slice(0, 10),
    volunteerId: 'vol-01',
    volunteerName: 'Dewi Sartika',
    division: 'Persiapan',
    reason: 'Sakit',
    reasonDetails: '',
    replacementVolunteerId: 'vol-cad-1',
    replacementVolunteerName: 'Bu Anisa',
    replacementDivision: 'Persiapan',
    approvalStatus: 'Menunggu Persetujuan',
    notes: 'Mohon izin tidak hadir dan telah konfirmasi pengganti shift.',
  });

  // Search & Filter States
  const [absenceSearch, setAbsenceSearch] = useState('');
  const [absenceStatusFilter, setAbsenceStatusFilter] = useState('ALL');
  const [absenceDivisionFilter, setAbsenceDivisionFilter] = useState('ALL');

  // Handle Volunteer Selection for Absence
  const handleVolunteerSelect = (volName: string) => {
    const matched = masterVolunteers.find(v => v.name === volName);
    setAbsenceFormData(prev => ({
      ...prev,
      volunteerName: volName,
      volunteerId: matched?.id || `vol-${Date.now()}`,
      division: matched?.division || prev.division,
    }));
  };

  // Submit Absence Request
  const handleSaveAbsence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!absenceFormData.volunteerName || !absenceFormData.replacementVolunteerName) {
      addToast('error', 'Validasi Gagal', 'Nama relawan dan nama pengganti wajib diisi.');
      return;
    }

    await addVolunteerAbsence(absenceFormData);
    setIsAbsenceModalOpen(false);

    // Reset form
    setAbsenceFormData({
      date: new Date().toISOString().slice(0, 10),
      volunteerId: 'vol-01',
      volunteerName: 'Dewi Sartika',
      division: 'Persiapan',
      reason: 'Sakit',
      reasonDetails: '',
      replacementVolunteerId: 'vol-cad-1',
      replacementVolunteerName: 'Bu Anisa',
      replacementDivision: 'Persiapan',
      approvalStatus: 'Menunggu Persetujuan',
      notes: 'Mohon izin tidak hadir dan telah konfirmasi pengganti shift.',
    });
  };

  // Submit Rejection
  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAbsenceForReject) return;
    if (!rejectionReasonText.trim()) {
      addToast('error', 'Alasan Wajib', 'Harap masukkan alasan penolakan izin.');
      return;
    }

    await rejectVolunteerAbsence(selectedAbsenceForReject.id, rejectionReasonText.trim());
    setIsRejectModalOpen(false);
    setSelectedAbsenceForReject(null);
    setRejectionReasonText('');
  };

  // Attendance Form Submit
  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedAtt) {
      await updateAttendance(selectedAtt.id, attFormData);
    } else {
      await recordAttendance(attFormData);
    }
    setIsAttendanceModalOpen(false);
  };

  // Filtered Absences
  const filteredAbsences = useMemo(() => {
    return volunteerAbsences.filter(abs => {
      const matchSearch =
        abs.volunteerName.toLowerCase().includes(absenceSearch.toLowerCase()) ||
        abs.replacementVolunteerName.toLowerCase().includes(absenceSearch.toLowerCase()) ||
        (abs.reasonDetails && abs.reasonDetails.toLowerCase().includes(absenceSearch.toLowerCase()));

      const matchStatus = absenceStatusFilter === 'ALL' || abs.approvalStatus === absenceStatusFilter;
      const matchDivision = absenceDivisionFilter === 'ALL' || abs.division === absenceDivisionFilter;

      return matchSearch && matchStatus && matchDivision;
    });
  }, [volunteerAbsences, absenceSearch, absenceStatusFilter, absenceDivisionFilter]);

  // Statistics
  const stats = useMemo(() => {
    const totalAbsences = volunteerAbsences.length;
    const pendingAbsences = volunteerAbsences.filter(a => a.approvalStatus === 'Menunggu Persetujuan').length;
    const approvedAbsences = volunteerAbsences.filter(a => a.approvalStatus === 'Disetujui').length;
    const rejectedAbsences = volunteerAbsences.filter(a => a.approvalStatus === 'Ditolak').length;
    const totalAttendanceToday = volunteerAttendance.length;
    const presentToday = volunteerAttendance.filter(v => v.status === 'Hadir').length;
    return { totalAbsences, pendingAbsences, approvedAbsences, rejectedAbsences, totalAttendanceToday, presentToday };
  }, [volunteerAbsences, volunteerAttendance]);

  // Export handlers
  const handleExportAbsencePDF = () => {
    exportTableToPDF({
      title: 'LAPORAN KETIDAKHADIRAN & PERGANTIAN RELAWAN SPPG',
      subtitle: `${sppgConfig.foundationName} - ${sppgConfig.sppgName} (ID: ${sppgConfig.sppgId})`,
      headers: ['Tanggal', 'Nama Relawan', 'Divisi Asal', 'Alasan', 'Relawan Pengganti', 'Divisi Pengganti', 'Status Persetujuan'],
      rows: filteredAbsences.map(a => [
        formatIndonesianDate(a.date),
        a.volunteerName,
        a.division,
        `${a.reason}${a.reasonDetails ? ` (${a.reasonDetails})` : ''}`,
        a.replacementVolunteerName,
        a.replacementDivision,
        a.approvalStatus,
      ]),
      fileName: 'Laporan_Ketidakhadiran_Relawan_SPPG_TMG2',
      sppgConfig,
      signerName: sppgConfig.headOfSppg,
      signerRole: 'Kepala SPPG Temenggungan 2',
    });
  };

  const handleExportAbsenceExcel = () => {
    const data = filteredAbsences.map(a => ({
      'Tanggal': a.date,
      'Nama Relawan': a.volunteerName,
      'Divisi': a.division,
      'Alasan': a.reason,
      'Detail Alasan': a.reasonDetails || '-',
      'Nama Pengganti': a.replacementVolunteerName,
      'Divisi Pengganti': a.replacementDivision,
      'Status Persetujuan': a.approvalStatus,
      'Disetujui Oleh': a.approvedBy || '-',
      'Tanggal Persetujuan': a.approvedAt || '-',
      'Alasan Penolakan': a.rejectionReason || '-',
    }));
    exportToExcel(data, 'Data_Ketidakhadiran_Relawan_SPPG_TMG2');
  };

  // DataTable Columns for Absence Records
  const absenceColumns: Column<VolunteerAbsenceRecord>[] = [
    {
      key: 'date',
      header: 'Tanggal & Waktu',
      render: (abs: VolunteerAbsenceRecord) => (
        <div>
          <div className="font-semibold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            {formatIndonesianDate(abs.date)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
            ID: {abs.id}
          </div>
        </div>
      ),
    },
    {
      key: 'volunteerName',
      header: 'Relawan Tidak Hadir',
      render: (abs: VolunteerAbsenceRecord) => (
        <div>
          <div className="font-bold text-xs text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
            <UserX className="w-3.5 h-3.5 shrink-0" />
            <span>{abs.volunteerName}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Divisi: <span className="font-semibold text-slate-700 dark:text-slate-300">{abs.division}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'reason',
      header: 'Alasan Ketidakhadiran',
      render: (abs: VolunteerAbsenceRecord) => (
        <div className="max-w-xs">
          <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 mb-1">
            {abs.reason}
          </span>
          {abs.reasonDetails && (
            <div className="text-xs text-slate-600 dark:text-slate-400 italic line-clamp-2">
              "{abs.reasonDetails}"
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'replacement',
      header: 'Relawan Pengganti (Shift)',
      render: (abs: VolunteerAbsenceRecord) => (
        <div className="bg-emerald-50 dark:bg-emerald-950/30 p-2 rounded-lg border border-emerald-100 dark:border-emerald-800/40 text-xs">
          <div className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5" />
            {abs.replacementVolunteerName}
          </div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">
            Divisi Pengganti: <span className="font-medium">{abs.replacementDivision}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status Persetujuan',
      render: (abs: VolunteerAbsenceRecord) => {
        const colors = {
          'Menunggu Persetujuan': 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300',
          Disetujui: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300',
          Ditolak: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300',
        };
        return (
          <div>
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-full border ${colors[abs.approvalStatus]}`}>
              {abs.approvalStatus === 'Disetujui' && <CheckCircle className="w-3 h-3" />}
              {abs.approvalStatus === 'Menunggu Persetujuan' && <Clock className="w-3 h-3" />}
              {abs.approvalStatus === 'Ditolak' && <XCircle className="w-3 h-3" />}
              {abs.approvalStatus}
            </span>
            {abs.approvedBy && (
              <div className="text-[10px] text-slate-500 mt-1">
                Oleh: {abs.approvedBy}
              </div>
            )}
            {abs.rejectionReason && (
              <div className="text-[10px] text-rose-600 italic mt-0.5">
                Alasan: {abs.rejectionReason}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Otorisasi & Aksi',
      render: (abs: VolunteerAbsenceRecord) => (
        <div className="flex items-center gap-1.5">
          {abs.approvalStatus === 'Menunggu Persetujuan' && (
            <>
              <button
                type="button"
                onClick={() => approveVolunteerAbsence(abs.id, currentUser.name)}
                title="Setujui Pergantian Shift"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Setujui</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedAbsenceForReject(abs);
                  setRejectionReasonText('');
                  setIsRejectModalOpen(true);
                }}
                title="Tolak Izin"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-900/30 dark:text-rose-300 text-xs font-semibold transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                <span>Tolak</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Hapus catatan ketidakhadiran ${abs.volunteerName}?`)) {
                deleteVolunteerAbsence(abs.id);
              }
            }}
            title="Hapus Catatan"
            className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:bg-slate-800 dark:text-slate-400 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  // Attendance Columns
  const attendanceColumns: Column<VolunteerAttendance>[] = [
    {
      key: 'volunteerName',
      header: 'Nama Relawan & ID',
      render: (row: VolunteerAttendance) => (
        <div>
          <div className="font-bold text-slate-900 dark:text-white text-xs">
            {row.volunteerName}
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            ID: {row.volunteerId}
          </div>
        </div>
      ),
    },
    {
      key: 'division',
      header: 'Divisi Tugas & Shift',
      render: (row: VolunteerAttendance) => (
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
      render: (row: VolunteerAttendance) => {
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
      render: (row: VolunteerAttendance) => (
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
      header: 'Catatan & Pengganti Shift',
      render: (row: VolunteerAttendance) => (
        <div className="text-xs max-w-xs">
          {row.replacementVolunteer ? (
            <div className="text-amber-800 dark:text-amber-300 font-semibold text-[11px]">
              Pengganti: {row.replacementVolunteer} {row.reason && `(${row.reason})`}
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
      {/* Module Banner Header */}
      <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-800/60 border border-blue-400/30 text-xs font-semibold text-blue-200 mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
              MANAJEMEN SDM DAPUR & PERGANTIAN SHIFT
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              Presensi & Ketidakhadiran Relawan
            </h1>
            <p className="text-sm text-blue-200 mt-1 max-w-3xl">
              Pengelolaan kehadiran harian relawan 5 divisi dapur MBG, persetujuan ketidakhadiran relawan, penunjukan relawan pengganti shift, serta verifikasi kelayakan sanitasi higiene pangan.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setAbsenceFormData({
                  date: new Date().toISOString().slice(0, 10),
                  volunteerId: masterVolunteers[0]?.id || 'vol-01',
                  volunteerName: masterVolunteers[0]?.name || 'Dewi Sartika',
                  division: masterVolunteers[0]?.division || 'Persiapan',
                  reason: 'Sakit',
                  reasonDetails: '',
                  replacementVolunteerId: 'vol-cad-1',
                  replacementVolunteerName: 'Bu Anisa',
                  replacementDivision: masterVolunteers[0]?.division || 'Persiapan',
                  approvalStatus: 'Menunggu Persetujuan',
                  notes: 'Pengajuan izin tidak hadir dan penunjukan relawan pengganti shift.',
                });
                setIsAbsenceModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-md transition-all active:scale-95"
            >
              <ArrowRightLeft className="w-4 h-4" />
              Ajukan Ketidakhadiran Relawan
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedAtt(null);
                setAttFormData({
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
                setIsAttendanceModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm border border-white/20 backdrop-blur-sm transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Catat Presensi Harian
            </button>
          </div>
        </div>

        {/* Decorative background shape */}
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-sky-400/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Menunggu Persetujuan
            </span>
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">
            {stats.pendingAbsences}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Pengajuan izin & pergantian shift
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Izin Disetujui
            </span>
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            {stats.approvedAbsences}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Pengganti shift telah aktif
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Presensi Hari Ini
            </span>
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {stats.presentToday} <span className="text-sm font-normal text-slate-500">/ {stats.totalAttendanceToday}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Relawan hadir di 5 divisi
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Master Relawan
            </span>
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400">
              <Users2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {masterVolunteers.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Personil terdaftar & cadangan
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex items-center border-b border-slate-200 dark:border-slate-800 space-x-2 sm:space-x-4">
        <button
          type="button"
          onClick={() => setActiveTab('absences')}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'absences'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          <span>Modul Ketidakhadiran Relawan & Pergantian Shift</span>
          <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300 font-bold">
            {volunteerAbsences.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('attendance')}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'attendance'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Presensi Harian & Sanitasi Dapur</span>
          <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 font-bold">
            {volunteerAttendance.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('directory')}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'directory'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <Users2 className="w-4 h-4" />
          <span>Direktori Relawan & Jadwal Divisi</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: MODUL KETIDAKHADIRAN RELAWAN & PERGANTIAN SHIFT */}
      {/* ========================================================================= */}
      {activeTab === 'absences' && (
        <div className="space-y-4">
          {/* Rules Banner */}
          <div className="bg-amber-50 dark:bg-amber-950/40 border-l-4 border-amber-500 p-4 rounded-r-xl text-amber-900 dark:text-amber-200 text-xs flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Standar Zero Kitchen Downtime BGN:</span> Setiap relawan yang berhalangan hadir wajib menunjuk atau dipasangkan dengan relawan pengganti sebelum waktu operasional dimulai. Setelah disetujui pimpinan dapur (Chef / Pengawas Gizi / Kepala SPPG), sistem akan secara otomatis memutakhirkan log presensi harian relawan.
            </div>
          </div>

          {/* Filters & Export Toolbar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-1 flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama relawan, pengganti, atau rincian alasan..."
                  value={absenceSearch}
                  onChange={(e) => setAbsenceSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <select
                value={absenceStatusFilter}
                onChange={(e) => setAbsenceStatusFilter(e.target.value)}
                className="py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">Semua Status Persetujuan</option>
                <option value="Menunggu Persetujuan">Menunggu Persetujuan</option>
                <option value="Disetujui">Disetujui</option>
                <option value="Ditolak">Ditolak</option>
              </select>

              <select
                value={absenceDivisionFilter}
                onChange={(e) => setAbsenceDivisionFilter(e.target.value)}
                className="py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">Semua Divisi</option>
                <option value="Persiapan">Divisi Persiapan</option>
                <option value="Pengolahan">Divisi Pengolahan</option>
                <option value="Pemorsian">Divisi Pemorsian</option>
                <option value="Distribusi">Divisi Distribusi</option>
                <option value="Cuci Ompreng">Divisi Cuci Ompreng</option>
                <option value="Kebersihan">Divisi Kebersihan</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportAbsencePDF}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Export PDF
              </button>
              <button
                type="button"
                onClick={handleExportAbsenceExcel}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                Export Excel
              </button>
            </div>
          </div>

          {/* DataTable of Volunteer Absences */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <DataTable
              title="Daftar Ketidakhadiran & Pergantian Relawan"
              subtitle="Catatan izin tidak hadir, nama pengganti shift tugas dapur, dan status persetujuan pimpinan"
              columns={absenceColumns as any}
              data={filteredAbsences as any}
              keyExtractor={(item: any) => item.id}
              searchPlaceholder="Cari data ketidakhadiran..."
              searchKeys={['volunteerName', 'replacementVolunteerName', 'reason', 'division']}
              onExportPDF={handleExportAbsencePDF}
              onExportExcel={handleExportAbsenceExcel}
              onPrint={triggerPrint}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PRESENSI HARIAN & SANITASI DAPUR */}
      {/* ========================================================================= */}
      {activeTab === 'attendance' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <DataTable
            title="Log Presensi Harian & Sanitasi Higiene Relawan"
            subtitle="Pemeriksaan kesehatan harian bebas gejala influenza dan verifikasi kelengkapan APD"
            columns={attendanceColumns as any}
            data={volunteerAttendance as any}
            keyExtractor={(item: any) => item.id}
            searchPlaceholder="Cari nama relawan atau divisi..."
            searchKeys={['volunteerName', 'division', 'status', 'notes']}
            onExportPDF={handleExportAbsencePDF}
            onPrint={triggerPrint}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: DIREKTORI MASTER RELAWAN */}
      {/* ========================================================================= */}
      {activeTab === 'directory' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {masterVolunteers.map(vol => (
            <div
              key={vol.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm flex items-start gap-3"
            >
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 flex items-center justify-center font-bold text-sm shrink-0">
                {vol.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                    {vol.name}
                  </h4>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${vol.isActive ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-200 text-slate-700'}`}>
                    {vol.isActive ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>
                <div className="text-xs font-semibold text-blue-700 dark:text-sky-400 mt-0.5">
                  Divisi {vol.division} • {vol.position}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Kontak: {vol.phone || '-'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: INPUT KETIDAKHADIRAN RELAWAN & PERGANTIAN SHIFT */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isAbsenceModalOpen}
        onClose={() => setIsAbsenceModalOpen(false)}
        title="Form Pengajuan Ketidakhadiran & Pergantian Relawan"
        maxWidth="3xl"
      >
        <form onSubmit={handleSaveAbsence} className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 p-3 rounded-xl text-xs text-blue-900 dark:text-blue-200 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              Sistem akan memverifikasi bahwa setiap relawan yang tidak hadir memiliki pengganti yang bertugas di divisi terkait agar produksi MBG tetap berjalan lancar.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tanggal Ketidakhadiran
              </label>
              <input
                type="date"
                value={absenceFormData.date}
                onChange={(e) => setAbsenceFormData({ ...absenceFormData, date: e.target.value })}
                required
                className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nama Relawan yang Berhalangan
              </label>
              <select
                value={absenceFormData.volunteerName}
                onChange={(e) => handleVolunteerSelect(e.target.value)}
                className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
              >
                {masterVolunteers.map(v => (
                  <option key={v.id} value={v.name}>
                    {v.name} (Divisi {v.division})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Divisi Asal Relawan
              </label>
              <select
                value={absenceFormData.division}
                onChange={(e) => setAbsenceFormData({ ...absenceFormData, division: e.target.value })}
                className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="Persiapan">Persiapan</option>
                <option value="Pengolahan">Pengolahan</option>
                <option value="Pemorsian">Pemorsian</option>
                <option value="Distribusi">Distribusi</option>
                <option value="Cuci Ompreng">Cuci Ompreng</option>
                <option value="Kebersihan">Kebersihan</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Alasan Ketidakhadiran
              </label>
              <select
                value={absenceFormData.reason}
                onChange={(e) => setAbsenceFormData({ ...absenceFormData, reason: e.target.value as any })}
                className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
              >
                <option value="Sakit">Sakit</option>
                <option value="Izin Keperluan Keluarga">Izin Keperluan Keluarga</option>
                <option value="Tugas Belajar / Kuliah">Tugas Belajar / Kuliah</option>
                <option value="Kendala Transportasi / Cuaca">Kendala Transportasi / Cuaca</option>
                <option value="Kedukaan">Kedukaan</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Rincian Alasan / Keterangan Tambahan
            </label>
            <textarea
              rows={2}
              placeholder="Contoh: Gejala demam flu ringan, disarankan istirahat demi sanitasi pangan dapur MBG..."
              value={absenceFormData.reasonDetails || ''}
              onChange={(e) => setAbsenceFormData({ ...absenceFormData, reasonDetails: e.target.value })}
              className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          {/* Section: Relawan Pengganti Shift */}
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/60 space-y-3">
            <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-wider flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              Penunjukan Relawan Pengganti Shift
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Relawan Pengganti
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Bu Anisa / Relawan Cadangan"
                  value={absenceFormData.replacementVolunteerName}
                  onChange={(e) => setAbsenceFormData({ ...absenceFormData, replacementVolunteerName: e.target.value })}
                  required
                  className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Divisi Relawan Pengganti
                </label>
                <select
                  value={absenceFormData.replacementDivision}
                  onChange={(e) => setAbsenceFormData({ ...absenceFormData, replacementDivision: e.target.value })}
                  className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="Persiapan">Persiapan</option>
                  <option value="Pengolahan">Pengolahan</option>
                  <option value="Pemorsian">Pemorsian</option>
                  <option value="Distribusi">Distribusi</option>
                  <option value="Cuci Ompreng">Cuci Ompreng</option>
                  <option value="Kebersihan">Kebersihan</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsAbsenceModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md font-bold"
            >
              Simpan Pengajuan Ketidakhadiran
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: TOLAK PENGAJUAN IZIN KETIDAKHADIRAN */}
      {/* ========================================================================= */}
      {selectedAbsenceForReject && (
        <Modal
          isOpen={isRejectModalOpen}
          onClose={() => setIsRejectModalOpen(false)}
          title={`Tolak Pengajuan Ketidakhadiran: ${selectedAbsenceForReject.volunteerName}`}
          maxWidth="md"
        >
          <form onSubmit={handleConfirmReject} className="space-y-4">
            <div className="text-xs text-slate-600 dark:text-slate-300">
              Anda akan menolak pengajuan ketidakhadiran dari <strong>{selectedAbsenceForReject.volunteerName}</strong> untuk tanggal <strong>{formatIndonesianDate(selectedAbsenceForReject.date)}</strong>.
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Alasan Penolakan
              </label>
              <textarea
                rows={3}
                placeholder="Contoh: Beban kerja divisi sangat tinggi dan relawan pengganti yang diajukan belum memenuhi kualifikasi higienitas..."
                value={rejectionReasonText}
                onChange={(e) => setRejectionReasonText(e.target.value)}
                required
                className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white"
              >
                Konfirmasi Tolak
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: INPUT PRESENSI HARIAN */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isAttendanceModalOpen}
        onClose={() => setIsAttendanceModalOpen(false)}
        title="Catat Presensi Harian Relawan"
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveAttendance} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tanggal Presensi
              </label>
              <input
                type="date"
                value={attFormData.date}
                onChange={(e) => setAttFormData({ ...attFormData, date: e.target.value })}
                required
                className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nama Relawan
              </label>
              <input
                type="text"
                placeholder="Nama relawan..."
                value={attFormData.volunteerName}
                onChange={(e) => setAttFormData({ ...attFormData, volunteerName: e.target.value })}
                required
                className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Divisi Tugas
              </label>
              <select
                value={attFormData.division}
                onChange={(e) => setAttFormData({ ...attFormData, division: e.target.value as any })}
                className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="Persiapan">Persiapan</option>
                <option value="Pengolahan">Pengolahan</option>
                <option value="Pemorsian">Pemorsian</option>
                <option value="Distribusi">Distribusi</option>
                <option value="Cuci Ompreng">Cuci Ompreng</option>
                <option value="Kebersihan">Kebersihan</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Status Kehadiran
              </label>
              <select
                value={attFormData.status}
                onChange={(e) => setAttFormData({ ...attFormData, status: e.target.value as any })}
                className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
              >
                <option value="Hadir">Hadir</option>
                <option value="Izin">Izin</option>
                <option value="Sakit">Sakit</option>
                <option value="Alpa">Alpa</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={attFormData.healthCheckPassed}
                onChange={(e) => setAttFormData({ ...attFormData, healthCheckPassed: e.target.checked })}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Lolos Uji Kesehatan Bebas Flu & Batuk</span>
            </label>

            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={attFormData.hygieneGearComplete}
                onChange={(e) => setAttFormData({ ...attFormData, hygieneGearComplete: e.target.checked })}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>APD Lengkap (Celemek, Hairnet, Sarung Tangan)</span>
            </label>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsAttendanceModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-md font-bold"
            >
              Simpan Presensi
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
