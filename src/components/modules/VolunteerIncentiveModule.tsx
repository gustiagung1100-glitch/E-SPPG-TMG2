import React, { useMemo, useState } from 'react';
import { useApp } from '../../lib/store';
import { Modal } from '../common/Modal';
import {
  exportTableToPDF,
  exportToExcel,
  formatIndonesianDate,
  formatNumber,
  formatRupiah,
  triggerPrint,
} from '../../lib/exportUtils';
import {
  IncentivePayoutStatus,
  VolunteerIncentivePayout,
} from '../../types';
import {
  Calendar,
  Check,
  CheckCircle2,
  Coins,
  Download,
  FileSpreadsheet,
  Printer,
  RefreshCw,
  Search,
  SlidersHorizontal,
  UserCheck,
  Users2,
  Wallet,
} from 'lucide-react';

const DIVISIONS = [
  'Persiapan',
  'Pengolahan',
  'Pemorsian',
  'Distribusi',
  'Cuci Ompreng',
  'Kebersihan',
];

interface ComputedVolunteerRow extends VolunteerIncentivePayout {
  positionLabel: string;
  phone: string;
}

export const VolunteerIncentiveModule: React.FC = () => {
  const {
    volunteerAttendance,
    volunteerAbsences,
    masterVolunteers,
    volunteerIncentiveConfig,
    updateVolunteerIncentiveConfig,
    volunteerIncentivePayouts,
    upsertVolunteerIncentivePayout,
    batchApproveVolunteerIncentives,
    currentUser,
    hasPermission,
    sppgConfig,
    addToast,
  } = useApp();

  const canEdit = hasPermission('volunteer_incentives', 'edit') || hasPermission('volunteer_incentives', 'create');
  const canApprove = hasPermission('volunteer_incentives', 'approve');

  const [viewMode, setViewMode] = useState<'daily' | 'summary'>('daily');
  const [selectedDate, setSelectedDate] = useState<string>('ALL');
  const [selectedDivision, setSelectedDivision] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Tariff Config Modal
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [defaultRateForm, setDefaultRateForm] = useState<number>(volunteerIncentiveConfig.defaultDailyRate);
  const [divisionRatesForm, setDivisionRatesForm] = useState<Record<string, number>>(
    volunteerIncentiveConfig.divisionRates
  );

  // Payout confirmation modal
  const [payoutModalRow, setPayoutModalRow] = useState<ComputedVolunteerRow | null>(null);
  const [deductPettyCash, setDeductPettyCash] = useState<boolean>(true);
  const [payoutNotes, setPayoutNotes] = useState<string>('');

  // Real-time integration with volunteerAttendance + volunteerAbsences + masterVolunteers
  const allComputedRows = useMemo<ComputedVolunteerRow[]>(() => {
    const rows: ComputedVolunteerRow[] = [];

    volunteerAttendance.forEach(att => {
      const master = masterVolunteers.find(
        m => m.id === att.volunteerId || m.name.toLowerCase() === att.volunteerName.toLowerCase()
      );
      const saved = volunteerIncentivePayouts.find(p => p.attendanceId === att.id);
      const isLocked = saved && (saved.status === 'Disetujui' || saved.status === 'Sudah Dibayarkan');
      const divRate = isLocked
        ? saved.dailyRate
        : volunteerIncentiveConfig.divisionRates[att.division] ?? volunteerIncentiveConfig.defaultDailyRate;

      const isPresent = att.status === 'Hadir';
      const computedTotal = isLocked ? saved.totalIncentive : isPresent ? divRate : 0;

      rows.push({
        id: saved?.id || `volp-${att.id}`,
        attendanceId: att.id,
        date: att.date,
        volunteerId: att.volunteerId,
        volunteerName: att.volunteerName,
        division: att.division,
        shift: att.shift,
        attendanceStatus: att.status,
        isSubstitute: false,
        dailyRate: divRate,
        totalIncentive: computedTotal,
        status: isPresent
          ? ((saved?.status || 'Menunggu Pencairan') as IncentivePayoutStatus)
          : 'Menunggu Pencairan',
        approvedBy: saved?.approvedBy,
        approvedAt: saved?.approvedAt,
        paidAt: saved?.paidAt,
        pettyCashTxId: saved?.pettyCashTxId,
        notes: saved?.notes || (isPresent ? att.notes : `Tidak hadir (${att.status}) - Rp 0`),
        positionLabel: master?.position || 'Relawan Dapur',
        phone: master?.phone || '-',
      });

      // If absent and replaced by substitute volunteer, generate substitute shift row automatically
      if (!isPresent) {
        const matchedAbsence = volunteerAbsences.find(
          abs =>
            abs.date === att.date &&
            (abs.volunteerId === att.volunteerId ||
              abs.volunteerName.toLowerCase() === att.volunteerName.toLowerCase()) &&
            abs.approvalStatus === 'Disetujui'
        );
        const subName =
          matchedAbsence?.replacementVolunteerName ||
          (att.replacementVolunteer ? att.replacementVolunteer.replace(/\s*\(.*?\)\s*/g, '').trim() : '');

        if (subName) {
          const subAttendanceKey = `${att.id}-sub`;
          const savedSub = volunteerIncentivePayouts.find(p => p.attendanceId === subAttendanceKey);
          const subLocked =
            savedSub && (savedSub.status === 'Disetujui' || savedSub.status === 'Sudah Dibayarkan');
          const subDiv = matchedAbsence?.replacementDivision || att.division;
          const subRate = subLocked
            ? savedSub.dailyRate
            : volunteerIncentiveConfig.divisionRates[subDiv] ?? volunteerIncentiveConfig.defaultDailyRate;

          rows.push({
            id: savedSub?.id || `volp-${subAttendanceKey}`,
            attendanceId: subAttendanceKey,
            date: att.date,
            volunteerId: matchedAbsence?.replacementVolunteerId || `sub-${att.id}`,
            volunteerName: subName,
            division: subDiv,
            shift: att.shift,
            attendanceStatus: 'Hadir',
            isSubstitute: true,
            replacedVolunteerName: att.volunteerName,
            dailyRate: subRate,
            totalIncentive: subLocked ? savedSub.totalIncentive : subRate,
            status: (savedSub?.status || 'Menunggu Pencairan') as IncentivePayoutStatus,
            approvedBy: savedSub?.approvedBy,
            approvedAt: savedSub?.approvedAt,
            paidAt: savedSub?.paidAt,
            pettyCashTxId: savedSub?.pettyCashTxId,
            notes: savedSub?.notes || `Relawan pengganti untuk ${att.volunteerName}`,
            positionLabel: 'Relawan Pengganti Shift',
            phone: '-',
          });
        }
      }
    });

    return rows.sort((a, b) => b.date.localeCompare(a.date) || a.volunteerName.localeCompare(b.volunteerName));
  }, [
    volunteerAttendance,
    volunteerAbsences,
    masterVolunteers,
    volunteerIncentivePayouts,
    volunteerIncentiveConfig,
  ]);

  const availableDates = useMemo(() => {
    const set = new Set(allComputedRows.map(r => r.date));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [allComputedRows]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allComputedRows.filter(row => {
      if (selectedDate !== 'ALL' && row.date !== selectedDate) return false;
      if (selectedDivision !== 'ALL' && row.division !== selectedDivision) return false;
      if (selectedStatus !== 'ALL') {
        if (selectedStatus === 'TIDAK_HADIR') {
          if (row.attendanceStatus === 'Hadir') return false;
        } else if (row.status !== selectedStatus || row.attendanceStatus !== 'Hadir') {
          return false;
        }
      }
      if (q) {
        const hit =
          row.volunteerName.toLowerCase().includes(q) ||
          row.division.toLowerCase().includes(q) ||
          (row.replacedVolunteerName || '').toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [allComputedRows, selectedDate, selectedDivision, selectedStatus, searchQuery]);

  // Cumulative summary per volunteer
  const volunteerSummaryRows = useMemo(() => {
    const map = new Map<
      string,
      {
        volunteerName: string;
        division: string;
        presentDays: number;
        substituteDays: number;
        absentDays: number;
        totalIncentive: number;
        paidIncentive: number;
      }
    >();

    for (const r of filteredRows) {
      const key = `${r.volunteerName}__${r.division}`;
      const cur = map.get(key) || {
        volunteerName: r.volunteerName,
        division: r.division,
        presentDays: 0,
        substituteDays: 0,
        absentDays: 0,
        totalIncentive: 0,
        paidIncentive: 0,
      };
      if (r.attendanceStatus === 'Hadir') {
        cur.presentDays += 1;
        if (r.isSubstitute) cur.substituteDays += 1;
      } else {
        cur.absentDays += 1;
      }
      cur.totalIncentive += r.totalIncentive;
      if (r.status === 'Sudah Dibayarkan') {
        cur.paidIncentive += r.totalIncentive;
      }
      map.set(key, cur);
    }

    return Array.from(map.values()).sort((a, b) => b.totalIncentive - a.totalIncentive);
  }, [filteredRows]);

  const metrics = useMemo(() => {
    const eligibleRows = filteredRows.filter(r => r.attendanceStatus === 'Hadir' && r.totalIncentive > 0);
    const absentRows = filteredRows.filter(r => r.attendanceStatus !== 'Hadir');
    const totalAmount = eligibleRows.reduce((acc, r) => acc + r.totalIncentive, 0);
    const paidAmount = eligibleRows
      .filter(r => r.status === 'Sudah Dibayarkan')
      .reduce((acc, r) => acc + r.totalIncentive, 0);
    const pendingApproveCount = eligibleRows.filter(r => r.status === 'Menunggu Pencairan').length;
    return {
      totalLogs: filteredRows.length,
      eligibleCount: eligibleRows.length,
      absentCount: absentRows.length,
      totalAmount,
      paidAmount,
      unpaidAmount: totalAmount - paidAmount,
      pendingApproveCount,
    };
  }, [filteredRows]);

  const handleOpenConfig = () => {
    setDefaultRateForm(volunteerIncentiveConfig.defaultDailyRate);
    setDivisionRatesForm({ ...volunteerIncentiveConfig.divisionRates });
    setIsConfigOpen(true);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateVolunteerIncentiveConfig({
      defaultDailyRate: Math.max(0, Number(defaultRateForm) || 0),
      divisionRates: divisionRatesForm,
    });
    setIsConfigOpen(false);
  };

  const handleApproveSingle = async (row: ComputedVolunteerRow) => {
    if (!canApprove) {
      addToast('error', 'Akses Ditolak', 'Anda tidak memiliki wewenang persetujuan insentif.');
      return;
    }
    await upsertVolunteerIncentivePayout({
      ...row,
      status: 'Disetujui',
      approvedBy: currentUser.name,
    });
  };

  const handleBatchApprove = async () => {
    if (!canApprove) {
      addToast('error', 'Akses Ditolak', 'Anda tidak memiliki wewenang persetujuan insentif.');
      return;
    }
    const targets = filteredRows.filter(
      r => r.attendanceStatus === 'Hadir' && r.totalIncentive > 0 && r.status === 'Menunggu Pencairan'
    );
    if (targets.length === 0) {
      addToast('info', 'Tidak Ada Antrean', 'Semua relawan hadir terfilter sudah disetujui atau dibayar.');
      return;
    }
    await batchApproveVolunteerIncentives(targets);
  };

  const handleOpenPayModal = (row: ComputedVolunteerRow) => {
    setPayoutModalRow(row);
    setDeductPettyCash(true);
    setPayoutNotes(
      row.notes ||
        `Insentif Relawan ${row.volunteerName} (Div. ${row.division}) tanggal ${row.date}`
    );
  };

  const handleConfirmPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutModalRow) return;
    await upsertVolunteerIncentivePayout(
      {
        ...payoutModalRow,
        status: 'Sudah Dibayarkan',
        approvedBy: payoutModalRow.approvedBy || currentUser.name,
        notes: payoutNotes,
      },
      deductPettyCash
    );
    setPayoutModalRow(null);
  };

  const handleExportPDF = () => {
    exportTableToPDF({
      title: 'DAFTAR INSENTIF HARIAN RELAWAN DAPUR SPPG',
      subtitle: `${sppgConfig.foundationName} - ${sppgConfig.sppgName} | Terintegrasi Absensi & Shift Pengganti`,
      headers: [
        'No',
        'Tanggal',
        'Nama Relawan',
        'Divisi',
        'Status Absensi',
        'Tarif Harian',
        'Insentif (Rp)',
        'Status Pencairan',
      ],
      rows: filteredRows.map((r, idx) => [
        idx + 1,
        formatIndonesianDate(r.date),
        r.isSubstitute ? `${r.volunteerName} (Pengganti ${r.replacedVolunteerName})` : r.volunteerName,
        r.division,
        r.attendanceStatus,
        formatRupiah(r.dailyRate),
        formatRupiah(r.totalIncentive),
        r.attendanceStatus === 'Hadir' ? r.status : 'Tidak Berhak (Absen)',
      ]),
      fileName: 'Insentif_Relawan_SPPG_TMG2',
      sppgConfig,
      orientation: 'landscape',
      signerRole: 'Pengawas Keuangan SPPG',
      signerName: sppgConfig.financeOfficer,
    });
  };

  const handleExportExcel = () => {
    const excelRows = filteredRows.map((r, idx) => ({
      No: idx + 1,
      Tanggal: r.date,
      Nama_Relawan: r.volunteerName,
      Pengganti_Untuk: r.isSubstitute ? r.replacedVolunteerName || '-' : '-',
      Divisi: r.division,
      Shift: r.shift,
      Status_Absensi: r.attendanceStatus,
      Tarif_Harian_Rp: r.dailyRate,
      Total_Insentif_Rp: r.totalIncentive,
      Status_Pencairan: r.attendanceStatus === 'Hadir' ? r.status : 'Tidak Berhak (Absen)',
      ID_Petty_Cash: r.pettyCashTxId || '-',
    }));
    exportToExcel(excelRows, 'Insentif_Relawan_SPPG', 'Insentif Relawan');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-teal-700 text-white flex items-center justify-center shrink-0">
              <Users2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Insentif Relawan Dapur SPPG
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
                Terhubung otomatis dengan Data Absensi Relawan ({volunteerAttendance.length} log) &amp; Pengganti Shift Disetujui
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-800">
              <button
                onClick={() => setViewMode('daily')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  viewMode === 'daily'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Rincian Harian
              </button>
              <button
                onClick={() => setViewMode('summary')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  viewMode === 'summary'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Rekap Per Relawan
              </button>
            </div>

            {canEdit && (
              <button
                onClick={handleOpenConfig}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 flex items-center gap-1.5"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Tarif per Divisi
              </button>
            )}
            {canApprove && metrics.pendingApproveCount > 0 && (
              <button
                onClick={handleBatchApprove}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                Setujui Semua ({metrics.pendingApproveCount})
              </button>
            )}
            <button
              onClick={handleExportExcel}
              className="px-3 py-2 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Excel
            </button>
            <button
              onClick={handleExportPDF}
              className="px-3 py-2 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 flex items-center gap-1.5"
            >
              <Download className="w-4 h-4 text-rose-600" />
              PDF
            </button>
            <button
              onClick={() => triggerPrint()}
              className="px-3 py-2 rounded-lg text-xs font-semibold bg-blue-950 hover:bg-blue-900 text-white flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              Cetak
            </button>
          </div>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 border-l-4 border-l-teal-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Shift Hadir &amp; Pengganti
            </span>
            <UserCheck className="w-4 h-4 text-teal-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {formatNumber(metrics.eligibleCount)} Shift
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {metrics.absentCount} catatan izin/sakit/alpa otomatis Rp 0
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 border-l-4 border-l-blue-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Insentif Terhitung
            </span>
            <Coins className="w-4 h-4 text-blue-900 dark:text-sky-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white tabular-nums font-mono">
            {formatRupiah(metrics.totalAmount)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Tarif standar rata-rata {formatRupiah(volunteerIncentiveConfig.defaultDailyRate)}/hari
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 border-l-4 border-l-emerald-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Sudah Dibayarkan
            </span>
            <Wallet className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums font-mono">
            {formatRupiah(metrics.paidAmount)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Tercatat lunas ke penerima shift aktif
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 border-l-4 border-l-amber-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Sisa Belum Dibayar
            </span>
            <Coins className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-700 dark:text-amber-400 tabular-nums font-mono">
            {formatRupiah(metrics.unpaidAmount)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {metrics.pendingApproveCount} shift menunggu persetujuan
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Tanggal Absensi
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              >
                <option value="ALL">Semua Tanggal ({availableDates.length} hari)</option>
                {availableDates.map(d => (
                  <option key={d} value={d}>
                    {formatIndonesianDate(d)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Divisi Dapur
            </label>
            <select
              value={selectedDivision}
              onChange={e => setSelectedDivision(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
            >
              <option value="ALL">Semua Divisi</option>
              {DIVISIONS.map(d => (
                <option key={d} value={d}>
                  Div. {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Filter Status
            </label>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
            >
              <option value="ALL">Semua Status Absensi &amp; Bayar</option>
              <option value="Menunggu Pencairan">Hadir — Menunggu Pencairan</option>
              <option value="Disetujui">Hadir — Disetujui</option>
              <option value="Sudah Dibayarkan">Hadir — Sudah Dibayarkan</option>
              <option value="TIDAK_HADIR">Izin / Sakit / Alpa (Rp 0)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Cari Nama Relawan
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari relawan atau pengganti..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      {viewMode === 'daily' ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Nama Relawan</th>
                  <th className="py-3 px-4">Divisi &amp; Shift</th>
                  <th className="py-3 px-4">Status Absensi</th>
                  <th className="py-3 px-4 text-right">Tarif Harian</th>
                  <th className="py-3 px-4 text-right">Insentif</th>
                  <th className="py-3 px-4">Status Pencairan</th>
                  <th className="py-3 px-4 text-right print:hidden">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-500">
                      Tidak ada data absensi relawan yang cocok dengan filter.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map(row => {
                    const isEligible = row.attendanceStatus === 'Hadir' && row.totalIncentive > 0;
                    return (
                      <tr key={row.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-700 dark:text-slate-300">
                          {row.date}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                            {row.volunteerName}
                            {row.isSubstitute && (
                              <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 text-[10px] font-semibold">
                                Pengganti
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {row.isSubstitute
                              ? `Menggantikan shift ${row.replacedVolunteerName}`
                              : row.positionLabel}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800 dark:text-slate-200">Div. {row.division}</div>
                          <div className="text-[11px] text-slate-500">{row.shift}</div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                              row.attendanceStatus === 'Hadir'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                            }`}
                          >
                            {row.attendanceStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums font-mono text-slate-600 dark:text-slate-300">
                          {formatRupiah(row.dailyRate)}
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums font-mono font-bold text-slate-900 dark:text-white">
                          {formatRupiah(row.totalIncentive)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {isEligible ? (
                            <div>
                              <span
                                className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                                  row.status === 'Sudah Dibayarkan'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                                    : row.status === 'Disetujui'
                                    ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                }`}
                              >
                                {row.status}
                              </span>
                              {row.pettyCashTxId && (
                                <div className="text-[10px] text-slate-500 mt-0.5">Potong Petty Cash</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400">Tidak Dihitung (Absen)</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap print:hidden">
                          {isEligible && (
                            <div className="inline-flex items-center gap-1.5">
                              {row.status === 'Menunggu Pencairan' && canApprove && (
                                <button
                                  onClick={() => handleApproveSingle(row)}
                                  className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-sky-600 hover:bg-sky-700 text-white inline-flex items-center gap-1"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  Setujui
                                </button>
                              )}
                              {row.status !== 'Sudah Dibayarkan' && (canApprove || canEdit) && (
                                <button
                                  onClick={() => handleOpenPayModal(row)}
                                  className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center gap-1"
                                >
                                  <Wallet className="w-3.5 h-3.5" />
                                  Bayar
                                </button>
                              )}
                              {row.status === 'Sudah Dibayarkan' && (
                                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                                  Lunas
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  <th className="py-3 px-4">Nama Relawan</th>
                  <th className="py-3 px-4">Divisi</th>
                  <th className="py-3 px-4 text-right">Hari Hadir</th>
                  <th className="py-3 px-4 text-right">Shift Pengganti</th>
                  <th className="py-3 px-4 text-right">Absen (Izin/Sakit)</th>
                  <th className="py-3 px-4 text-right">Total Akumulasi</th>
                  <th className="py-3 px-4 text-right">Sudah Dibayar</th>
                  <th className="py-3 px-4 text-right">Sisa Hak</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {volunteerSummaryRows.map(item => (
                  <tr key={`${item.volunteerName}-${item.division}`} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">{item.volunteerName}</td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">Div. {item.division}</td>
                    <td className="py-3 px-4 text-right tabular-nums font-semibold text-emerald-700 dark:text-emerald-400">
                      {item.presentDays} hari
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums text-indigo-700 dark:text-indigo-400">
                      {item.substituteDays} kali
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums text-rose-600">{item.absentDays} hari</td>
                    <td className="py-3 px-4 text-right tabular-nums font-mono font-bold text-slate-900 dark:text-white">
                      {formatRupiah(item.totalIncentive)}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums font-mono text-emerald-700 dark:text-emerald-400">
                      {formatRupiah(item.paidIncentive)}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums font-mono font-bold text-amber-700 dark:text-amber-400">
                      {formatRupiah(item.totalIncentive - item.paidIncentive)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Tarif per Divisi */}
      <Modal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        title="Pengaturan Tarif Insentif Harian Relawan"
        maxWidth="md"
      >
        <form onSubmit={handleSaveConfig} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Tarif Standar Harian Default (Rp)
            </label>
            <input
              type="number"
              min={0}
              step={5000}
              value={defaultRateForm}
              onChange={e => setDefaultRateForm(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              required
            />
          </div>

          <div className="space-y-2.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
              Tarif Khusus Per Divisi Dapur (Rp / Hari Hadir)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DIVISIONS.map(div => (
                <div key={div}>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Div. {div}</label>
                  <input
                    type="number"
                    min={0}
                    step={5000}
                    value={divisionRatesForm[div] ?? defaultRateForm}
                    onChange={e =>
                      setDivisionRatesForm(prev => ({
                        ...prev,
                        [div]: Number(e.target.value),
                      }))
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsConfigOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-950 hover:bg-blue-900 text-white"
            >
              Simpan Tarif Divisi
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Konfirmasi Pembayaran */}
      <Modal
        isOpen={Boolean(payoutModalRow)}
        onClose={() => setPayoutModalRow(null)}
        title="Pembayaran Insentif Relawan"
        maxWidth="md"
      >
        {payoutModalRow && (
          <form onSubmit={handleConfirmPayout} className="space-y-4">
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Nama Relawan:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{payoutModalRow.volunteerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Divisi / Tanggal:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  Div. {payoutModalRow.division} ({payoutModalRow.date})
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-sm">
                <span className="font-bold text-slate-700 dark:text-slate-200">Total Dibayarkan:</span>
                <span className="font-bold font-mono text-emerald-700 dark:text-emerald-400">
                  {formatRupiah(payoutModalRow.totalIncentive)}
                </span>
              </div>
            </div>

            <label className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <input
                type="checkbox"
                checked={deductPettyCash}
                onChange={e => setDeductPettyCash(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-blue-950 focus:ring-blue-900"
              />
              <div>
                <div className="text-xs font-semibold text-slate-900 dark:text-white">
                  Catat otomatis sebagai Pengeluaran di Kas Petty Cash
                </div>
                <div className="text-[11px] text-slate-500">
                  Menambahkan mutasi Kas Keluar Petty Cash sehingga Saldo Akhir otomatis terpotong.
                </div>
              </div>
            </label>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Keterangan Pencairan
              </label>
              <textarea
                rows={2}
                value={payoutNotes}
                onChange={e => setPayoutNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setPayoutModalRow(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Bayar &amp; Simpan
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
