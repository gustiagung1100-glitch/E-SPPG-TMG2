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
  PICIncentivePayout,
  PICIncentiveRateMode,
} from '../../types';
import {
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Coins,
  Download,
  FileSpreadsheet,
  HandCoins,
  Printer,
  RefreshCw,
  Search,
  SlidersHorizontal,
  UserCheck,
  Wallet,
} from 'lucide-react';

interface ComputedPICRow extends PICIncentivePayout {
  absentPortions: number;
  attendanceRatePct: number;
  institutionType: string;
}

export const PICIncentiveModule: React.FC = () => {
  const {
    institutions,
    beneficiaryAttendance,
    picIncentiveConfig,
    updatePICIncentiveConfig,
    picIncentivePayouts,
    upsertPICIncentivePayout,
    batchApprovePICIncentives,
    currentUser,
    hasPermission,
    sppgConfig,
    addToast,
  } = useApp();

  const canEdit = hasPermission('pic_incentives', 'edit') || hasPermission('pic_incentives', 'create');
  const canApprove = hasPermission('pic_incentives', 'approve');

  // Filter states
  const [selectedDate, setSelectedDate] = useState<string>('ALL');
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Tariff Config Modal
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [rateModeForm, setRateModeForm] = useState<PICIncentiveRateMode>(picIncentiveConfig.rateMode);
  const [ratePerPortionForm, setRatePerPortionForm] = useState<number>(picIncentiveConfig.ratePerPortion);
  const [flatDailyRateForm, setFlatDailyRateForm] = useState<number>(picIncentiveConfig.flatDailyRate);
  const [minThresholdForm, setMinThresholdForm] = useState<number>(picIncentiveConfig.minPortionThreshold);

  // Payout confirmation modal (pay directly or deduct from Petty Cash)
  const [payoutModalRow, setPayoutModalRow] = useState<ComputedPICRow | null>(null);
  const [deductPettyCash, setDeductPettyCash] = useState<boolean>(true);
  const [payoutNotes, setPayoutNotes] = useState<string>('');

  // Real-time merged rows from beneficiaryAttendance + institutions + picIncentivePayouts
  const allComputedRows = useMemo<ComputedPICRow[]>(() => {
    return beneficiaryAttendance
      .map(att => {
        const inst = institutions.find(i => i.id === att.institutionId);
        const saved = picIncentivePayouts.find(
          p => p.attendanceLogId === att.id || (p.date === att.date && p.institutionId === att.institutionId)
        );

        const isLockedPaidOrApproved = saved && (saved.status === 'Disetujui' || saved.status === 'Sudah Dibayarkan');
        const activeRateMode = isLockedPaidOrApproved ? saved.rateMode : picIncentiveConfig.rateMode;
        const unitRate = isLockedPaidOrApproved
          ? saved.unitRate
          : activeRateMode === 'per_porsi'
          ? picIncentiveConfig.ratePerPortion
          : picIncentiveConfig.flatDailyRate;

        const qualifies = att.actualPortions >= picIncentiveConfig.minPortionThreshold;
        const computedTotal = isLockedPaidOrApproved
          ? saved.totalIncentive
          : !qualifies
          ? 0
          : activeRateMode === 'per_porsi'
          ? att.actualPortions * unitRate
          : unitRate;

        const attendanceRatePct =
          att.totalRegistered > 0 ? Math.round((att.actualPortions / att.totalRegistered) * 1000) / 10 : 0;

        return {
          id: saved?.id || `picp-${att.id}`,
          attendanceLogId: att.id,
          date: att.date,
          institutionId: att.institutionId,
          institutionName: inst?.name || att.institutionName,
          institutionType: inst?.institutionType || 'Sekolah / Lembaga',
          picName: inst?.picName || saved?.picName || inst?.contactPerson || 'PIC Lembaga',
          picPhone: inst?.picPhone || inst?.phone || saved?.picPhone || '-',
          bankName: inst?.bankName || saved?.bankName || '-',
          accountNumber: inst?.accountNumber || saved?.accountNumber || '-',
          bankAccountName: inst?.bankAccountName || saved?.bankAccountName || inst?.picName || '-',
          registeredPortions: att.totalRegistered,
          presentPortions: att.actualPortions,
          absentPortions: att.totalAbsent,
          attendanceRatePct,
          rateMode: activeRateMode,
          unitRate,
          totalIncentive: computedTotal,
          status: (saved?.status || 'Menunggu Pencairan') as IncentivePayoutStatus,
          approvedBy: saved?.approvedBy,
          approvedAt: saved?.approvedAt,
          paidAt: saved?.paidAt,
          pettyCashTxId: saved?.pettyCashTxId,
          notes: saved?.notes || att.notes,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date) || a.institutionName.localeCompare(b.institutionName));
  }, [beneficiaryAttendance, institutions, picIncentivePayouts, picIncentiveConfig]);

  const availableDates = useMemo(() => {
    const set = new Set(allComputedRows.map(r => r.date));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [allComputedRows]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allComputedRows.filter(row => {
      if (selectedDate !== 'ALL' && row.date !== selectedDate) return false;
      if (selectedInstitutionId !== 'ALL' && row.institutionId !== selectedInstitutionId) return false;
      if (selectedStatus !== 'ALL' && row.status !== selectedStatus) return false;
      if (q) {
        const hit =
          row.institutionName.toLowerCase().includes(q) ||
          row.picName.toLowerCase().includes(q) ||
          (row.accountNumber || '').toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [allComputedRows, selectedDate, selectedInstitutionId, selectedStatus, searchQuery]);

  const summary = useMemo(() => {
    const totalPresentPortions = filteredRows.reduce((acc, r) => acc + r.presentPortions, 0);
    const totalRegisteredPortions = filteredRows.reduce((acc, r) => acc + r.registeredPortions, 0);
    const totalIncentiveAmount = filteredRows.reduce((acc, r) => acc + r.totalIncentive, 0);
    const paidAmount = filteredRows
      .filter(r => r.status === 'Sudah Dibayarkan')
      .reduce((acc, r) => acc + r.totalIncentive, 0);
    const pendingOrApprovedAmount = totalIncentiveAmount - paidAmount;
    const pendingCount = filteredRows.filter(r => r.status === 'Menunggu Pencairan').length;
    return {
      totalRecords: filteredRows.length,
      totalPresentPortions,
      totalRegisteredPortions,
      totalIncentiveAmount,
      paidAmount,
      pendingOrApprovedAmount,
      pendingCount,
    };
  }, [filteredRows]);

  const handleOpenConfig = () => {
    setRateModeForm(picIncentiveConfig.rateMode);
    setRatePerPortionForm(picIncentiveConfig.ratePerPortion);
    setFlatDailyRateForm(picIncentiveConfig.flatDailyRate);
    setMinThresholdForm(picIncentiveConfig.minPortionThreshold);
    setIsConfigOpen(true);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    await updatePICIncentiveConfig({
      rateMode: rateModeForm,
      ratePerPortion: Math.max(0, Number(ratePerPortionForm) || 0),
      flatDailyRate: Math.max(0, Number(flatDailyRateForm) || 0),
      minPortionThreshold: Math.max(0, Number(minThresholdForm) || 0),
    });
    setIsConfigOpen(false);
  };

  const handleApproveSingle = async (row: ComputedPICRow) => {
    if (!canApprove) {
      addToast('error', 'Akses Ditolak', 'Hanya Kepala SPPG / Pengawas Keuangan / Admin Utama yang dapat menyetujui.');
      return;
    }
    await upsertPICIncentivePayout({
      ...row,
      status: 'Disetujui',
      approvedBy: currentUser.name,
    });
  };

  const handleBatchApprove = async () => {
    if (!canApprove) {
      addToast('error', 'Akses Ditolak', 'Anda tidak memiliki izin persetujuan.');
      return;
    }
    const pendingRows = filteredRows.filter(r => r.status === 'Menunggu Pencairan');
    if (pendingRows.length === 0) {
      addToast('info', 'Tidak Ada Antrean', 'Semua data terfilter sudah disetujui atau dibayarkan.');
      return;
    }
    await batchApprovePICIncentives(pendingRows);
  };

  const handleOpenPayModal = (row: ComputedPICRow) => {
    setPayoutModalRow(row);
    setDeductPettyCash(true);
    setPayoutNotes(row.notes || `Pencairan insentif PIC ${row.institutionName} tanggal ${row.date}`);
  };

  const handleConfirmPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutModalRow) return;
    await upsertPICIncentivePayout(
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
      title: 'DAFTAR REKAPITULASI INSENTIF PIC LEMBAGA PENERIMA MANFAAT',
      subtitle: `${sppgConfig.foundationName} - ${sppgConfig.sppgName} | Terhubung Presensi Harian`,
      headers: [
        'No',
        'Tanggal',
        'Nama Lembaga',
        'Nama PIC',
        'Rekening PIC',
        'Hadir / Kuota',
        'Tarif',
        'Total Insentif',
        'Status',
      ],
      rows: filteredRows.map((r, idx) => [
        idx + 1,
        formatIndonesianDate(r.date),
        r.institutionName,
        r.picName,
        r.accountNumber && r.accountNumber !== '-' ? `${r.bankName} ${r.accountNumber}` : '-',
        `${formatNumber(r.presentPortions)} / ${formatNumber(r.registeredPortions)}`,
        r.rateMode === 'per_porsi' ? `${formatRupiah(r.unitRate)}/porsi` : `${formatRupiah(r.unitRate)}/hari`,
        formatRupiah(r.totalIncentive),
        r.status,
      ]),
      fileName: 'Insentif_PIC_Lembaga_SPPG_TMG2',
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
      Lembaga: r.institutionName,
      Nama_PIC: r.picName,
      Telepon_PIC: r.picPhone || '-',
      Bank: r.bankName || '-',
      No_Rekening: r.accountNumber || '-',
      Atas_Nama_Rekening: r.bankAccountName || '-',
      Porsi_Terdaftar: r.registeredPortions,
      Porsi_Hadir_Aktual: r.presentPortions,
      Porsi_Tidak_Hadir: r.absentPortions,
      Mode_Tarif: r.rateMode === 'per_porsi' ? 'Per Porsi Hadir' : 'Flat Harian',
      Tarif_Satuan: r.unitRate,
      Total_Insentif_Rp: r.totalIncentive,
      Status_Pencairan: r.status,
      ID_Petty_Cash: r.pettyCashTxId || '-',
    }));
    exportToExcel(excelRows, 'Insentif_PIC_Lembaga_SPPG', 'Insentif PIC');
  };

  return (
    <div className="space-y-6">
      {/* Page Header & Realtime Sync Indicator */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-lg bg-blue-950 text-white flex items-center justify-center shrink-0">
                <HandCoins className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Insentif PIC Lembaga Penerima Manfaat
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
                  Terhubung real-time dengan Data Presensi Harian Penerima Manfaat ({beneficiaryAttendance.length} log harian)
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canEdit && (
              <button
                onClick={handleOpenConfig}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-colors"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Atur Tarif ({picIncentiveConfig.rateMode === 'per_porsi'
                  ? `${formatRupiah(picIncentiveConfig.ratePerPortion)}/porsi`
                  : `${formatRupiah(picIncentiveConfig.flatDailyRate)}/hari`})
              </button>
            )}
            {canApprove && summary.pendingCount > 0 && (
              <button
                onClick={handleBatchApprove}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4" />
                Setujui Semua ({summary.pendingCount})
              </button>
            )}
            <button
              onClick={handleExportExcel}
              className="px-3 py-2 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Excel
            </button>
            <button
              onClick={handleExportPDF}
              className="px-3 py-2 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5"
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
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 border-l-4 border-l-blue-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Data Kehadiran Sekolah
            </span>
            <Building2 className="w-4 h-4 text-blue-900 dark:text-sky-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {formatNumber(summary.totalRecords)} Laporan
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Terintegrasi dari presensi {institutions.filter(i => i.isActive).length} lembaga aktif
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 border-l-4 border-l-teal-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Porsi Siswa Hadir Aktual
            </span>
            <UserCheck className="w-4 h-4 text-teal-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {formatNumber(summary.totalPresentPortions)} Porsi
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
            Dari kuota terdaftar {formatNumber(summary.totalRegisteredPortions)} siswa
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 border-l-4 border-l-amber-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Insentif Terhitung
            </span>
            <Coins className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white tabular-nums font-mono">
            {formatRupiah(summary.totalIncentiveAmount)}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Skema: {picIncentiveConfig.rateMode === 'per_porsi'
              ? `${formatRupiah(picIncentiveConfig.ratePerPortion)} / porsi hadir`
              : `Flat ${formatRupiah(picIncentiveConfig.flatDailyRate)} / hari`}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 border-l-4 border-l-emerald-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Realisasi Pencairan PIC
            </span>
            <Wallet className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums font-mono">
            {formatRupiah(summary.paidAmount)}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
            Sisa belum dibayar: {formatRupiah(summary.pendingOrApprovedAmount)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Filter Tanggal Presensi
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
              Sekolah / Lembaga
            </label>
            <select
              value={selectedInstitutionId}
              onChange={e => setSelectedInstitutionId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
            >
              <option value="ALL">Semua Lembaga</option>
              {institutions.map(inst => (
                <option key={inst.id} value={inst.id}>
                  {inst.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Status Pencairan
            </label>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
            >
              <option value="ALL">Semua Status</option>
              <option value="Menunggu Pencairan">Menunggu Pencairan</option>
              <option value="Disetujui">Disetujui</option>
              <option value="Sudah Dibayarkan">Sudah Dibayarkan</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Cari PIC / Sekolah / Rekening
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari nama PIC atau sekolah..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4">Lembaga & PIC</th>
                <th className="py-3 px-4">Rekening Pencairan</th>
                <th className="py-3 px-4 text-right">Siswa Hadir / Kuota</th>
                <th className="py-3 px-4 text-right">Tarif</th>
                <th className="py-3 px-4 text-right">Total Insentif</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right print:hidden">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500 dark:text-slate-400">
                    Belum ada data presensi penerima manfaat yang cocok dengan filter. Input presensi harian pada modul Penerima Manfaat akan muncul otomatis di sini.
                  </td>
                </tr>
              ) : (
                filteredRows.map(row => (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4 whitespace-nowrap text-slate-700 dark:text-slate-300 font-medium">
                      {row.date}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">{row.institutionName}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        PIC: <span className="font-medium text-slate-700 dark:text-slate-300">{row.picName}</span>
                        {row.picPhone && row.picPhone !== '-' ? ` · ${row.picPhone}` : ''}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {row.accountNumber && row.accountNumber !== '-' ? (
                        <div>
                          <div className="font-medium text-slate-800 dark:text-slate-200">{row.bankName}</div>
                          <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                            {row.accountNumber} ({row.bankAccountName})
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Tunai / Belum diisi di Master</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {formatNumber(row.presentPortions)} / {formatNumber(row.registeredPortions)}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {row.attendanceRatePct}% hadir ({row.absentPortions} absen)
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums font-mono text-slate-600 dark:text-slate-300">
                      {formatRupiah(row.unitRate)}
                      <div className="text-[10px] text-slate-400 font-sans">
                        {row.rateMode === 'per_porsi' ? 'per porsi' : 'flat/hari'}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums font-mono font-bold text-slate-900 dark:text-white">
                      {formatRupiah(row.totalIncentive)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${
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
                        <div className="text-[10px] text-slate-500 mt-0.5">Tercatat di Petty Cash</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap print:hidden">
                      <div className="inline-flex items-center gap-1.5">
                        {row.status === 'Menunggu Pencairan' && canApprove && (
                          <button
                            onClick={() => handleApproveSingle(row)}
                            className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-sky-600 hover:bg-sky-700 text-white inline-flex items-center gap-1"
                            title="Setujui insentif PIC"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Setujui
                          </button>
                        )}
                        {row.status !== 'Sudah Dibayarkan' && (canApprove || canEdit) && (
                          <button
                            onClick={() => handleOpenPayModal(row)}
                            className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center gap-1"
                            title="Bayar & catat pencairan"
                          >
                            <Wallet className="w-3.5 h-3.5" />
                            Bayar
                          </button>
                        )}
                        {row.status === 'Sudah Dibayarkan' && (
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                            Selesai {row.paidAt ? row.paidAt.slice(0, 10) : ''}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Konfigurasi Tarif */}
      <Modal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        title="Pengaturan Tarif Insentif PIC Lembaga"
        maxWidth="md"
      >
        <form onSubmit={handleSaveConfig} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
              Metode Perhitungan Otomatis
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setRateModeForm('per_porsi')}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  rateModeForm === 'per_porsi'
                    ? 'border-blue-900 bg-blue-50 dark:bg-blue-900/30 dark:border-sky-400'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="text-xs font-bold text-slate-900 dark:text-white">Berdasarkan Porsi Hadir</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Jumlah siswa hadir aktual x tarif per porsi</div>
              </button>
              <button
                type="button"
                onClick={() => setRateModeForm('flat_harian')}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  rateModeForm === 'flat_harian'
                    ? 'border-blue-900 bg-blue-50 dark:bg-blue-900/30 dark:border-sky-400'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="text-xs font-bold text-slate-900 dark:text-white">Tarif Flat Harian</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Nominal tetap per hari laporan kehadiran masuk</div>
              </button>
            </div>
          </div>

          {rateModeForm === 'per_porsi' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Tarif per Porsi Hadir (Rp)
              </label>
              <input
                type="number"
                min={0}
                step={50}
                value={ratePerPortionForm}
                onChange={e => setRatePerPortionForm(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                required
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Tarif Flat Harian per Lembaga (Rp)
              </label>
              <input
                type="number"
                min={0}
                step={1000}
                value={flatDailyRateForm}
                onChange={e => setFlatDailyRateForm(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Ambang Batas Minimal Siswa Hadir
            </label>
            <input
              type="number"
              min={0}
              value={minThresholdForm}
              onChange={e => setMinThresholdForm(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Status yang masih &quot;Menunggu Pencairan&quot; otomatis mengikuti tarif terbaru ini; yang sudah Disetujui/Dibayarkan tetap terkunci.
            </p>
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
              Simpan Tarif
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Konfirmasi Pembayaran */}
      <Modal
        isOpen={Boolean(payoutModalRow)}
        onClose={() => setPayoutModalRow(null)}
        title="Konfirmasi Pembayaran Insentif PIC Lembaga"
        maxWidth="md"
      >
        {payoutModalRow && (
          <form onSubmit={handleConfirmPayout} className="space-y-4">
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Lembaga / Tanggal:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {payoutModalRow.institutionName} ({payoutModalRow.date})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Nama PIC:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{payoutModalRow.picName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Porsi Hadir Aktual:</span>
                <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                  {formatNumber(payoutModalRow.presentPortions)} porsi
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-sm">
                <span className="font-bold text-slate-700 dark:text-slate-200">Nominal Dibayarkan:</span>
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
                  Menambahkan bukti kas keluar (BKK-PC) otomatis sehingga Saldo Akhir Petty Cash langsung terpotong akurat.
                </div>
              </div>
            </label>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Catatan Pencairan
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
                Konfirmasi Pembayaran
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
