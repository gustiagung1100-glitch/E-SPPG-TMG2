import React, { useState, useMemo } from 'react';
import { useApp } from '../../lib/store';
import { DataTable, Column } from '../common/DataTable';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { exportTableToPDF, exportToExcel, triggerPrint, formatIndonesianDate } from '../../lib/exportUtils';
import { VolunteerAttendance, VolunteerAbsenceRecord, DynamicFormId } from '../../types';
import {
  DynamicFormEditToggleBar,
  DynamicFormBuilderPanel,
  DynamicFormRenderer,
  validateDynamicFormFields,
} from '../common/DynamicFormBuilder';
import {
  appendDynamicExcelFields,
  appendDynamicExportColumns,
  buildDynamicTableColumns,
  getInitialCustomFieldValues,
} from '../../lib/dynamicFormSchemas';
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
  RefreshCw,
  Pencil,
} from 'lucide-react';

export const VolunteersModule: React.FC = () => {
  const {
    volunteerAttendance,
    recordAttendance,
    updateAttendance,
    syncVolunteerAttendanceFromMaster,
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
    dynamicFormSchemas,
  } = useApp();

  const activeMasterVolunteers = useMemo(
    () => masterVolunteers.filter(v => v.isActive),
    [masterVolunteers]
  );

  const masterVolunteerLookup = useMemo(() => {
    const byId = new Map<string, (typeof masterVolunteers)[number]>();
    const byName = new Map<string, (typeof masterVolunteers)[number]>();
    masterVolunteers.forEach(v => {
      byId.set(v.id, v);
      byName.set(v.name.trim().toLowerCase(), v);
    });
    return { byId, byName };
  }, [masterVolunteers]);

  const findMasterVolunteer = (volunteerId?: string, volunteerName?: string) => {
    if (volunteerId && masterVolunteerLookup.byId.has(volunteerId)) {
      return masterVolunteerLookup.byId.get(volunteerId);
    }
    if (volunteerName) {
      return masterVolunteerLookup.byName.get(volunteerName.trim().toLowerCase());
    }
    return undefined;
  };

  // Active Tab
  const [activeTab, setActiveTab] = useState<'attendance' | 'absences' | 'directory'>('absences');
  const [syncDate, setSyncDate] = useState<string>(new Date().toISOString().slice(0, 10));

  // Dynamic Form Builder States
  const [isEditingVolSchema, setIsEditingVolSchema] = useState(false);
  const [builderVolFormId, setBuilderVolFormId] = useState<DynamicFormId>('volunteer_absence_form');
  const [isModalAbsenceSchemaEdit, setIsModalAbsenceSchemaEdit] = useState(false);
  const [isModalAttSchemaEdit, setIsModalAttSchemaEdit] = useState(false);
  const [previewCustomPhoto, setPreviewCustomPhoto] = useState<{ label: string; url: string } | null>(null);

  // Attendance Form Modal
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [selectedAtt, setSelectedAtt] = useState<VolunteerAttendance | null>(null);

  // Absence Form Modal
  const [isAbsenceModalOpen, setIsAbsenceModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedAbsenceForReject, setSelectedAbsenceForReject] = useState<VolunteerAbsenceRecord | null>(null);
  const [rejectionReasonText, setRejectionReasonText] = useState('');
  const [confirmDeleteAbsence, setConfirmDeleteAbsence] = useState<VolunteerAbsenceRecord | null>(null);

  const defaultPrimaryVol = activeMasterVolunteers[0] || masterVolunteers[0];
  const defaultReplacementVol =
    activeMasterVolunteers.find(v => v.id !== defaultPrimaryVol?.id) ||
    masterVolunteers.find(v => v.id !== defaultPrimaryVol?.id) ||
    defaultPrimaryVol;

  // Attendance Form State
  const [attFormData, setAttFormData] = useState<Omit<VolunteerAttendance, 'id'>>({
    date: new Date().toISOString().slice(0, 10),
    volunteerId: defaultPrimaryVol?.id || 'vol-01',
    volunteerName: defaultPrimaryVol?.name || '',
    division: (defaultPrimaryVol?.division as VolunteerAttendance['division']) || 'Persiapan',
    shift: 'Pagi (03:30 - 08:30)',
    status: 'Hadir',
    healthCheckPassed: true,
    hygieneGearComplete: true,
    reason: '',
    replacementVolunteer: '',
    notes: 'Kondisi fit prima, APD celemek, hairnet & sarung tangan lengkap.',
    customFields: {},
  });

  // Absence Form State (Modul Ketidakhadiran Relawan)
  const [absenceFormData, setAbsenceFormData] = useState<Omit<VolunteerAbsenceRecord, 'id' | 'createdAt'>>({
    date: new Date().toISOString().slice(0, 10),
    volunteerId: defaultPrimaryVol?.id || 'vol-01',
    volunteerName: defaultPrimaryVol?.name || '',
    division: defaultPrimaryVol?.division || 'Persiapan',
    reason: 'Sakit',
    reasonDetails: '',
    replacementVolunteerId: defaultReplacementVol?.id || '',
    replacementVolunteerName: defaultReplacementVol?.name || '',
    replacementDivision: defaultReplacementVol?.division || 'Persiapan',
    approvalStatus: 'Menunggu Persetujuan',
    notes: 'Mohon izin tidak hadir dan telah konfirmasi pengganti shift.',
    customFields: {},
  });

  // Search & Filter States
  const [absenceSearch, setAbsenceSearch] = useState('');
  const [absenceStatusFilter, setAbsenceStatusFilter] = useState('ALL');
  const [absenceDivisionFilter, setAbsenceDivisionFilter] = useState('ALL');

  // Handle Volunteer Selection for Absence
  const handleVolunteerSelect = (volName: string) => {
    const matched = masterVolunteers.find(v => v.name === volName);
    setAbsenceFormData(prev => {
      const nextRep =
        prev.replacementVolunteerName === volName
          ? activeMasterVolunteers.find(v => v.name !== volName && v.division === (matched?.division || prev.division)) ||
            activeMasterVolunteers.find(v => v.name !== volName)
          : undefined;
      return {
        ...prev,
        volunteerName: volName,
        volunteerId: matched?.id || `vol-${Date.now()}`,
        division: matched?.division || prev.division,
        ...(nextRep
          ? {
              replacementVolunteerId: nextRep.id,
              replacementVolunteerName: nextRep.name,
              replacementDivision: nextRep.division,
            }
          : {}),
      };
    });
  };

  // Handle Replacement Volunteer Selection for Absence
  const handleReplacementSelect = (repName: string) => {
    const matched = masterVolunteers.find(v => v.name === repName);
    setAbsenceFormData(prev => ({
      ...prev,
      replacementVolunteerName: repName,
      replacementVolunteerId: matched?.id || `vol-rep-${Date.now()}`,
      replacementDivision: matched?.division || prev.replacementDivision,
    }));
  };

  // Handle Volunteer Selection for Attendance
  const handleAttVolunteerSelect = (volName: string) => {
    const matched = masterVolunteers.find(v => v.name === volName);
    setAttFormData(prev => {
      const nextDivision = (matched?.division as VolunteerAttendance['division']) || prev.division;
      const defaultShift: VolunteerAttendance['shift'] =
        nextDivision === 'Cuci Ompreng' || nextDivision === 'Kebersihan'
          ? 'Siang (08:00 - 13:00)'
          : 'Pagi (03:30 - 08:30)';
      return {
        ...prev,
        volunteerName: volName,
        volunteerId: matched?.id || `vol-${Date.now()}`,
        division: nextDivision,
        shift: selectedAtt ? prev.shift : defaultShift,
      };
    });
  };

  // Submit Absence Request
  const handleSaveAbsence = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErr = validateDynamicFormFields(
      dynamicFormSchemas.volunteer_absence_form,
      { ...absenceFormData, ...(absenceFormData.customFields || {}) }
    );
    if (validationErr) {
      addToast('error', 'Validasi Form Gagal', validationErr);
      return;
    }
    if (!absenceFormData.volunteerName || !absenceFormData.replacementVolunteerName) {
      addToast('error', 'Validasi Gagal', 'Nama relawan dan nama pengganti wajib diisi.');
      return;
    }

    await addVolunteerAbsence(absenceFormData);
    setIsAbsenceModalOpen(false);
    setIsModalAbsenceSchemaEdit(false);

    // Reset form using Master Relawan
    const resetPrimary = activeMasterVolunteers[0] || masterVolunteers[0];
    const resetRep =
      activeMasterVolunteers.find(v => v.id !== resetPrimary?.id) ||
      masterVolunteers.find(v => v.id !== resetPrimary?.id) ||
      resetPrimary;
    setAbsenceFormData({
      date: new Date().toISOString().slice(0, 10),
      volunteerId: resetPrimary?.id || '',
      volunteerName: resetPrimary?.name || '',
      division: resetPrimary?.division || 'Persiapan',
      reason: 'Sakit',
      reasonDetails: '',
      replacementVolunteerId: resetRep?.id || '',
      replacementVolunteerName: resetRep?.name || '',
      replacementDivision: resetRep?.division || 'Persiapan',
      approvalStatus: 'Menunggu Persetujuan',
      notes: 'Mohon izin tidak hadir dan telah konfirmasi pengganti shift.',
      customFields: getInitialCustomFieldValues(dynamicFormSchemas.volunteer_absence_form),
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
    const validationErr = validateDynamicFormFields(
      dynamicFormSchemas.volunteer_attendance_form,
      { ...attFormData, ...(attFormData.customFields || {}) }
    );
    if (validationErr) {
      addToast('error', 'Validasi Form Gagal', validationErr);
      return;
    }
    if (selectedAtt) {
      await updateAttendance(selectedAtt.id, attFormData);
    } else {
      await recordAttendance(attFormData);
    }
    setIsAttendanceModalOpen(false);
    setIsModalAttSchemaEdit(false);
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
    const { headers, rows } = appendDynamicExportColumns(
      dynamicFormSchemas.volunteer_absence_form,
      ['Tanggal', 'Nama Relawan', 'Divisi Asal', 'Alasan', 'Relawan Pengganti', 'Divisi Pengganti', 'Status Persetujuan'],
      filteredAbsences.map(a => [
        formatIndonesianDate(a.date),
        a.volunteerName,
        a.division,
        `${a.reason}${a.reasonDetails ? ` (${a.reasonDetails})` : ''}`,
        a.replacementVolunteerName,
        a.replacementDivision,
        a.approvalStatus,
      ]),
      filteredAbsences
    );
    exportTableToPDF({
      title: 'LAPORAN KETIDAKHADIRAN & PERGANTIAN RELAWAN SPPG',
      subtitle: `${sppgConfig.foundationName} - ${sppgConfig.sppgName} (ID: ${sppgConfig.sppgId})`,
      headers,
      rows,
      fileName: 'Laporan_Ketidakhadiran_Relawan_SPPG_TMG2',
      sppgConfig,
      signerName: sppgConfig.headOfSppg,
      signerRole: 'Kepala SPPG Temenggungan 2',
    });
  };

  const handleExportAbsenceExcel = () => {
    const data = filteredAbsences.map(a =>
      appendDynamicExcelFields(
        dynamicFormSchemas.volunteer_absence_form,
        {
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
        },
        a
      )
    );
    exportToExcel(data, 'Data_Ketidakhadiran_Relawan_SPPG_TMG2');
  };

  const handleExportAttendancePDF = () => {
    const { headers, rows } = appendDynamicExportColumns(
      dynamicFormSchemas.volunteer_attendance_form,
      ['Tanggal', 'Nama Relawan', 'Divisi', 'Shift', 'Status', 'Cek Kesehatan', 'APD Lengkap', 'Catatan'],
      volunteerAttendance.map(row => [
        formatIndonesianDate(row.date),
        row.volunteerName,
        row.division,
        row.shift,
        row.status,
        row.healthCheckPassed ? 'Sehat' : 'Tidak Sehat',
        row.hygieneGearComplete ? 'Lengkap' : 'Belum Lengkap',
        row.notes || '-',
      ]),
      volunteerAttendance
    );
    exportTableToPDF({
      title: 'LAPORAN PRESENSI HARIAN & SANITASI RELAWAN SPPG',
      subtitle: `${sppgConfig.foundationName} - ${sppgConfig.sppgName} (ID: ${sppgConfig.sppgId})`,
      headers,
      rows,
      fileName: 'Laporan_Presensi_Relawan_SPPG_TMG2',
      sppgConfig,
      signerName: sppgConfig.headOfSppg,
      signerRole: 'Kepala SPPG Temenggungan 2',
    });
  };

  const handleExportAttendanceExcel = () => {
    const data = volunteerAttendance.map(row =>
      appendDynamicExcelFields(
        dynamicFormSchemas.volunteer_attendance_form,
        {
          'Tanggal': row.date,
          'Nama Relawan': row.volunteerName,
          'Divisi': row.division,
          'Shift': row.shift,
          'Status': row.status,
          'Cek Kesehatan': row.healthCheckPassed ? 'Sehat' : 'Tidak Sehat',
          'APD Lengkap': row.hygieneGearComplete ? 'Ya' : 'Tidak',
          'Catatan': row.notes || '-',
        },
        row
      )
    );
    exportToExcel(data, 'Presensi_Relawan_SPPG_TMG2');
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
      render: (abs: VolunteerAbsenceRecord) => {
        const master = findMasterVolunteer(abs.volunteerId, abs.volunteerName);
        return (
          <div>
            <div className="font-bold text-xs text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
              <UserX className="w-3.5 h-3.5 shrink-0" />
              <span>{abs.volunteerName}</span>
              {master?.code && (
                <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {master.code}
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Divisi: <span className="font-semibold text-slate-700 dark:text-slate-300">{abs.division}</span>
              {master?.position && <span className="text-slate-400"> • {master.position}</span>}
            </div>
          </div>
        );
      },
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
      render: (abs: VolunteerAbsenceRecord) => {
        const repMaster = findMasterVolunteer(abs.replacementVolunteerId, abs.replacementVolunteerName);
        return (
          <div className="bg-emerald-50 dark:bg-emerald-950/30 p-2 rounded-lg border border-emerald-100 dark:border-emerald-800/40 text-xs">
            <div className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 shrink-0" />
              <span>{abs.replacementVolunteerName}</span>
              {repMaster?.code && (
                <span className="px-1 py-0.5 text-[9px] font-mono rounded bg-white/80 dark:bg-slate-900 text-emerald-700 dark:text-emerald-300">
                  {repMaster.code}
                </span>
              )}
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">
              Divisi Pengganti: <span className="font-medium">{abs.replacementDivision}</span>
              {repMaster?.position && <span> • {repMaster.position}</span>}
            </div>
          </div>
        );
      },
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
    ...buildDynamicTableColumns<VolunteerAbsenceRecord>(
      dynamicFormSchemas.volunteer_absence_form,
      (url, label) => setPreviewCustomPhoto({ url, label })
    ),
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
            onClick={() => setConfirmDeleteAbsence(abs)}
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
      key: 'date',
      header: 'Tanggal',
      render: (row: VolunteerAttendance) => (
        <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
          <span>{formatIndonesianDate(row.date)}</span>
        </div>
      ),
    },
    {
      key: 'volunteerName',
      header: 'Nama Relawan (Master)',
      render: (row: VolunteerAttendance) => {
        const master = findMasterVolunteer(row.volunteerId, row.volunteerName);
        return (
          <div>
            <div className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
              <span>{row.volunteerName}</span>
              {master?.code && (
                <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {master.code}
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-500">
              {master ? `${master.position} • ${master.isActive ? 'Aktif' : 'Nonaktif'}` : `ID: ${row.volunteerId}`}
            </div>
          </div>
        );
      },
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
          <div className={`flex items-center gap-1 font-semibold ${row.healthCheckPassed ? 'text-emerald-600' : 'text-rose-600'}`}>
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
    ...buildDynamicTableColumns<VolunteerAttendance>(
      dynamicFormSchemas.volunteer_attendance_form,
      (url, label) => setPreviewCustomPhoto({ url, label })
    ),
    {
      key: 'actions',
      header: 'Aksi',
      render: (row: VolunteerAttendance) => (
        <button
          type="button"
          onClick={() => {
            setSelectedAtt(row);
            setAttFormData({
              date: row.date,
              volunteerId: row.volunteerId,
              volunteerName: row.volunteerName,
              division: row.division,
              shift: row.shift,
              status: row.status,
              healthCheckPassed: row.healthCheckPassed,
              hygieneGearComplete: row.hygieneGearComplete,
              reason: row.reason || '',
              replacementVolunteer: row.replacementVolunteer || '',
              notes: row.notes || '',
              customFields: row.customFields || {},
            });
            setIsModalAttSchemaEdit(false);
            setIsAttendanceModalOpen(true);
          }}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-sky-400 text-xs font-semibold transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
          <span>Edit</span>
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Compact Module Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl px-5 py-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#1E3A8A] dark:text-sky-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            Manajemen SDM Dapur &amp; Pergantian Shift
          </span>
          <h1 className="text-lg md:text-xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-0.5">
            Presensi &amp; Ketidakhadiran Relawan
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 max-w-3xl">
            Pengelolaan kehadiran harian relawan 5 divisi dapur MBG, persetujuan ketidakhadiran relawan, penunjukan relawan pengganti shift, serta verifikasi kelayakan sanitasi higiene pangan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <DynamicFormEditToggleBar
            formId={builderVolFormId}
            isEditing={isEditingVolSchema}
            onToggleEdit={() => setIsEditingVolSchema(v => !v)}
            extraSelector={
              <select
                value={builderVolFormId}
                onChange={e => setBuilderVolFormId(e.target.value as DynamicFormId)}
                className="px-2.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-100"
              >
                <option value="volunteer_absence_form">Form Ketidakhadiran Relawan</option>
                <option value="volunteer_attendance_form">Form Presensi Harian Relawan</option>
              </select>
            }
          />
          <button
            type="button"
            onClick={() => {
              const firstVol = activeMasterVolunteers[0] || masterVolunteers[0];
              const repVol =
                activeMasterVolunteers.find(v => v.id !== firstVol?.id) ||
                masterVolunteers.find(v => v.id !== firstVol?.id) ||
                firstVol;
              setAbsenceFormData({
                date: new Date().toISOString().slice(0, 10),
                volunteerId: firstVol?.id || '',
                volunteerName: firstVol?.name || '',
                division: firstVol?.division || 'Persiapan',
                reason: 'Sakit',
                reasonDetails: '',
                replacementVolunteerId: repVol?.id || '',
                replacementVolunteerName: repVol?.name || '',
                replacementDivision: repVol?.division || 'Persiapan',
                approvalStatus: 'Menunggu Persetujuan',
                notes: 'Pengajuan izin tidak hadir dan penunjukan relawan pengganti shift.',
                customFields: getInitialCustomFieldValues(dynamicFormSchemas.volunteer_absence_form),
              });
              setIsModalAbsenceSchemaEdit(false);
              setIsAbsenceModalOpen(true);
            }}
            className="min-h-[42px] inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 dark:text-amber-300 dark:border-amber-800 font-semibold text-sm transition-all active:scale-95"
          >
            <ArrowRightLeft className="w-4 h-4" />
            Ajukan Ketidakhadiran Relawan
          </button>
          <button
            type="button"
            onClick={() => {
              const firstVol = activeMasterVolunteers[0] || masterVolunteers[0];
              const div = (firstVol?.division as VolunteerAttendance['division']) || 'Persiapan';
              setSelectedAtt(null);
              setAttFormData({
                date: new Date().toISOString().slice(0, 10),
                volunteerId: firstVol?.id || '',
                volunteerName: firstVol?.name || '',
                division: div,
                shift:
                  div === 'Cuci Ompreng' || div === 'Kebersihan'
                    ? 'Siang (08:00 - 13:00)'
                    : 'Pagi (03:30 - 08:30)',
                status: 'Hadir',
                healthCheckPassed: true,
                hygieneGearComplete: true,
                reason: '',
                replacementVolunteer: '',
                notes: 'Kondisi fit dan APD lengkap',
                customFields: getInitialCustomFieldValues(dynamicFormSchemas.volunteer_attendance_form),
              });
              setIsModalAttSchemaEdit(false);
              setIsAttendanceModalOpen(true);
            }}
            className="min-h-[42px] inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-sky-600 dark:hover:bg-sky-500 text-white font-semibold text-sm shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Catat Presensi Harian
          </button>
        </div>
      </div>

      {isEditingVolSchema && (
        <DynamicFormBuilderPanel
          formId={builderVolFormId}
          onClose={() => setIsEditingVolSchema(false)}
        />
      )}

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-xl shadow-sm flex flex-col justify-between h-full transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              Menunggu Persetujuan
            </span>
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-[#D97706] dark:text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight tabular-nums text-[#D97706] dark:text-amber-400 mt-2">
            {stats.pendingAbsences}
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
            Pengajuan izin & pergantian shift
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-xl shadow-sm flex flex-col justify-between h-full transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              Izin Disetujui
            </span>
            <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-900/30 text-[#0D9488] dark:text-teal-400">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight tabular-nums text-[#0D9488] dark:text-teal-400 mt-2">
            {stats.approvedAbsences}
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
            Pengganti shift telah aktif
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-xl shadow-sm flex flex-col justify-between h-full transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              Presensi Hari Ini
            </span>
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-[#1E3A8A] dark:text-blue-400">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight tabular-nums text-slate-900 dark:text-white mt-2">
            {stats.presentToday} <span className="text-sm font-normal text-slate-500">/ {stats.totalAttendanceToday}</span>
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
            Relawan hadir di 5 divisi
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-xl shadow-sm flex flex-col justify-between h-full transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              Master Relawan
            </span>
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-[#1E3A8A] dark:text-sky-400">
              <Users2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight tabular-nums text-slate-900 dark:text-white mt-2">
            {masterVolunteers.length}
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
            Personil terdaftar & cadangan
          </div>
        </div>
      </div>

      {/* Main Responsive Pill Tabs */}
      <div className="bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex flex-nowrap sm:flex-wrap overflow-x-auto no-scrollbar items-center gap-1.5 pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setActiveTab('absences')}
            className={`min-h-[38px] inline-flex items-center gap-2 py-2 px-3.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all duration-200 ease-in-out cursor-pointer ${
              activeTab === 'absences'
                ? 'bg-[#1E3A8A] text-white shadow-sm dark:bg-sky-600'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4 shrink-0" />
            <span>Modul Ketidakhadiran Relawan & Pergantian Shift</span>
            <span className={`px-2 py-0.5 text-[11px] rounded-full font-bold tabular-nums ${
              activeTab === 'absences'
                ? 'bg-white/20 text-white'
                : 'bg-amber-50 text-[#D97706] border border-amber-200/80 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-800'
            }`}>
              {volunteerAbsences.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('attendance')}
            className={`min-h-[38px] inline-flex items-center gap-2 py-2 px-3.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all duration-200 ease-in-out cursor-pointer ${
              activeTab === 'attendance'
                ? 'bg-[#1E3A8A] text-white shadow-sm dark:bg-sky-600'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800'
            }`}
          >
            <UserCheck className="w-4 h-4 shrink-0" />
            <span>Presensi Harian & Sanitasi Dapur</span>
            <span className={`px-2 py-0.5 text-[11px] rounded-full font-bold tabular-nums ${
              activeTab === 'attendance'
                ? 'bg-white/20 text-white'
                : 'bg-blue-50 text-[#1E3A8A] border border-blue-200/80 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-800'
            }`}>
              {volunteerAttendance.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('directory')}
            className={`min-h-[38px] inline-flex items-center gap-2 py-2 px-3.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all duration-200 ease-in-out cursor-pointer ${
              activeTab === 'directory'
                ? 'bg-[#1E3A8A] text-white shadow-sm dark:bg-sky-600'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800'
            }`}
          >
            <Users2 className="w-4 h-4 shrink-0" />
            <span>Direktori Relawan & Jadwal Divisi</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: MODUL KETIDAKHADIRAN RELAWAN & PERGANTIAN SHIFT */}
      {/* ========================================================================= */}
      {activeTab === 'absences' && (
        <div key="absences" className="space-y-4 animate-fadeIn">
          {/* Rules Banner */}
          <div className="bg-amber-50/90 dark:bg-amber-950/35 border border-amber-200 dark:border-amber-800/80 p-4 rounded-xl text-amber-900 dark:text-amber-200 text-xs flex items-start gap-3">
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
                <option value="Keamanan">Divisi Keamanan</option>
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
              stickyFirstColumn
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PRESENSI HARIAN & SANITASI DAPUR */}
      {/* ========================================================================= */}
      {activeTab === 'attendance' && (
        <div key="attendance" className="space-y-4 animate-fadeIn">
          <div className="bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/70 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5 text-xs text-blue-900 dark:text-blue-200">
              <RefreshCw className="w-4 h-4 text-blue-600 dark:text-sky-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">
                  Terhubung dengan Master Data Relawan ({activeMasterVolunteers.length} Relawan Aktif)
                </div>
                <div className="text-[11px] text-blue-700 dark:text-sky-300 mt-0.5">
                  Tarik daftar relawan aktif dari Master Relawan ke log presensi harian sekaligus menerapkan data ketidakhadiran yang telah disetujui dan meneruskannya ke modul Insentif Relawan.
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <input
                type="date"
                value={syncDate}
                onChange={e => setSyncDate(e.target.value)}
                className="px-3 py-2 text-xs rounded-lg border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold"
              />
              <button
                type="button"
                onClick={() => syncVolunteerAttendanceFromMaster(syncDate)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shadow-xs transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Sinkron Presensi dari Master Relawan
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <DataTable
              title="Log Presensi Harian & Sanitasi Higiene Relawan"
              subtitle="Terhubung langsung dengan Master Data Relawan & otomatis masuk ke perhitungan Insentif Relawan"
              columns={attendanceColumns as any}
              data={volunteerAttendance as any}
              keyExtractor={(item: any) => item.id}
              searchPlaceholder="Cari nama relawan atau divisi..."
              searchKeys={['volunteerName', 'division', 'status', 'notes']}
              onExportPDF={handleExportAttendancePDF}
              onExportExcel={handleExportAttendanceExcel}
              onPrint={triggerPrint}
              stickyFirstColumn
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: DIREKTORI MASTER RELAWAN */}
      {/* ========================================================================= */}
      {activeTab === 'directory' && (
        <div key="directory" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fadeIn">
          {masterVolunteers.map(vol => {
            const attCount = volunteerAttendance.filter(
              a => a.volunteerId === vol.id || a.volunteerName.toLowerCase() === vol.name.toLowerCase()
            ).length;
            const presentCount = volunteerAttendance.filter(
              a =>
                (a.volunteerId === vol.id || a.volunteerName.toLowerCase() === vol.name.toLowerCase()) &&
                a.status === 'Hadir'
            ).length;
            const absenceCount = volunteerAbsences.filter(
              ab => ab.volunteerId === vol.id || ab.volunteerName.toLowerCase() === vol.name.toLowerCase()
            ).length;
            const replacementCount = volunteerAbsences.filter(
              ab =>
                ab.approvalStatus === 'Disetujui' &&
                (ab.replacementVolunteerId === vol.id ||
                  ab.replacementVolunteerName.toLowerCase() === vol.name.toLowerCase())
            ).length;

            return (
              <div
                key={vol.id}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-xl shadow-sm flex items-start gap-3 h-full transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 flex items-center justify-center font-bold text-sm shrink-0">
                  {vol.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {vol.name}
                      </h4>
                      <span className="text-[10px] font-mono text-slate-400">
                        {vol.code || vol.id}
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${vol.isActive ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-200 text-slate-700'}`}>
                      {vol.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-blue-700 dark:text-sky-400 mt-0.5">
                    Divisi {vol.division} • {vol.position}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Kontak: {vol.phone || '-'}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px]">
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold">
                      Hadir: {presentCount}/{attCount}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 font-semibold">
                      Izin/Sakit: {absenceCount}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 font-semibold">
                      Pengganti: {replacementCount}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: INPUT KETIDAKHADIRAN RELAWAN & PERGANTIAN SHIFT */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isAbsenceModalOpen}
        onClose={() => {
          setIsAbsenceModalOpen(false);
          setIsModalAbsenceSchemaEdit(false);
        }}
        title="Form Pengajuan Ketidakhadiran & Pergantian Relawan"
        maxWidth="3xl"
      >
        <div className="space-y-4">
          <DynamicFormEditToggleBar
            formId="volunteer_absence_form"
            isEditing={isModalAbsenceSchemaEdit}
            onToggleEdit={() => setIsModalAbsenceSchemaEdit(v => !v)}
            compact
          />
          {isModalAbsenceSchemaEdit && (
            <DynamicFormBuilderPanel
              formId="volunteer_absence_form"
              onClose={() => setIsModalAbsenceSchemaEdit(false)}
            />
          )}

          <form onSubmit={handleSaveAbsence} className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 p-3 rounded-xl text-xs text-blue-900 dark:text-blue-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                Sistem akan memverifikasi bahwa setiap relawan yang tidak hadir memiliki pengganti yang bertugas di divisi terkait agar produksi MBG tetap berjalan lancar.
              </span>
            </div>

            <DynamicFormRenderer
              schema={dynamicFormSchemas.volunteer_absence_form}
              values={{
                ...absenceFormData,
                ...(absenceFormData.customFields || {}),
              }}
              dynamicOptions={{
                volunteerName: activeMasterVolunteers.map(v => ({
                  value: v.name,
                  label: `${v.name}${v.code ? ` [${v.code}]` : ''} — Divisi ${v.division} (${v.position})`,
                })),
                replacementVolunteerName: activeMasterVolunteers
                  .filter(v => v.name !== absenceFormData.volunteerName)
                  .map(v => ({
                    value: v.name,
                    label: `${v.name}${v.code ? ` [${v.code}]` : ''} — Divisi ${v.division} (${v.position})`,
                  })),
              }}
              onChange={(key, value, field) => {
                if (field.isSystem) {
                  if (key === 'volunteerName') {
                    handleVolunteerSelect(String(value));
                  } else if (key === 'replacementVolunteerName') {
                    handleReplacementSelect(String(value));
                  } else {
                    setAbsenceFormData(prev => ({ ...prev, [key]: value }));
                  }
                } else {
                  setAbsenceFormData(prev => ({
                    ...prev,
                    customFields: { ...(prev.customFields || {}), [key]: value },
                  }));
                }
              }}
              onPreviewPhoto={url => setPreviewCustomPhoto({ label: 'Preview Foto', url })}
              onUploadError={msg => addToast('error', 'Upload Gagal', msg)}
            />

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
        </div>
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
        onClose={() => {
          setIsAttendanceModalOpen(false);
          setIsModalAttSchemaEdit(false);
          setSelectedAtt(null);
        }}
        title={selectedAtt ? `Edit Presensi Harian: ${selectedAtt.volunteerName}` : 'Catat Presensi Harian Relawan'}
        maxWidth="2xl"
      >
        <div className="space-y-4">
          <DynamicFormEditToggleBar
            formId="volunteer_attendance_form"
            isEditing={isModalAttSchemaEdit}
            onToggleEdit={() => setIsModalAttSchemaEdit(v => !v)}
            compact
          />
          {isModalAttSchemaEdit && (
            <DynamicFormBuilderPanel
              formId="volunteer_attendance_form"
              onClose={() => setIsModalAttSchemaEdit(false)}
            />
          )}

          <form onSubmit={handleSaveAttendance} className="space-y-4">
            <DynamicFormRenderer
              schema={dynamicFormSchemas.volunteer_attendance_form}
              values={{
                ...attFormData,
                ...(attFormData.customFields || {}),
              }}
              dynamicOptions={{
                volunteerName: activeMasterVolunteers.map(v => ({
                  value: v.name,
                  label: `${v.name}${v.code ? ` [${v.code}]` : ''} — Divisi ${v.division} (${v.position})`,
                })),
              }}
              onChange={(key, value, field) => {
                if (field.isSystem) {
                  if (key === 'volunteerName') {
                    handleAttVolunteerSelect(String(value));
                  } else {
                    setAttFormData(prev => ({ ...prev, [key]: value }));
                  }
                } else {
                  setAttFormData(prev => ({
                    ...prev,
                    customFields: { ...(prev.customFields || {}), [key]: value },
                  }));
                }
              }}
              onPreviewPhoto={url => setPreviewCustomPhoto({ label: 'Preview Foto', url })}
              onUploadError={msg => addToast('error', 'Upload Gagal', msg)}
            />

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsAttendanceModalOpen(false);
                  setSelectedAtt(null);
                }}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-md font-bold"
              >
                {selectedAtt ? 'Simpan Perubahan Presensi' : 'Simpan Presensi'}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Preview Custom Photo Modal */}
      {previewCustomPhoto && (
        <Modal
          isOpen={Boolean(previewCustomPhoto)}
          onClose={() => setPreviewCustomPhoto(null)}
          title={previewCustomPhoto.label}
          maxWidth="md"
        >
          <div className="space-y-3">
            <img
              src={previewCustomPhoto.url}
              alt={previewCustomPhoto.label}
              className="w-full max-h-96 object-contain rounded-xl border border-slate-200 dark:border-slate-800"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewCustomPhoto(null)}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                Tutup
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirmation Dialog: Hapus Catatan Ketidakhadiran Relawan */}
      <ConfirmDialog
        isOpen={Boolean(confirmDeleteAbsence)}
        onClose={() => setConfirmDeleteAbsence(null)}
        onConfirm={() => {
          if (confirmDeleteAbsence) {
            deleteVolunteerAbsence(confirmDeleteAbsence.id);
            setConfirmDeleteAbsence(null);
          }
        }}
        title="Hapus Catatan Ketidakhadiran?"
        message={`Apakah Anda yakin ingin menghapus catatan ketidakhadiran relawan "${confirmDeleteAbsence?.volunteerName || ''}" pada tanggal ${confirmDeleteAbsence?.date || ''}?`}
        confirmLabel="Ya, Hapus Catatan"
        isDestructive
      />
    </div>
  );
};
