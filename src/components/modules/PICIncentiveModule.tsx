import React, { useMemo, useState } from 'react';
import { useApp } from '../../lib/store';
import { EmptyState } from '../common/EmptyState';
import { Modal } from '../common/Modal';
import { NumericInput } from '../common/NumericInput';
import {
  exportTableToPDF,
  exportToExcel,
  formatIndonesianDate,
  formatNumber,
  formatRupiah,
  triggerPrint,
} from '../../lib/exportUtils';
import { toNonNegativeNumber } from '../../lib/numberUtils';
import {
  IncentivePayoutStatus,
  PICIncentivePayout,
  PICIncentiveRateMode,
  PICInstitutionTariffOverride,
} from '../../types';
import {
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Coins,
  Download,
  Edit3,
  FileSpreadsheet,
  HandCoins,
  Printer,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  SlidersHorizontal,
  UserCheck,
  Wallet,
} from 'lucide-react';

interface ComputedPICRow extends PICIncentivePayout {
  absentPortions: number;
  attendanceRatePct: number;
  institutionType: string;
  isCustomInstitutionRate: boolean;
}

interface InstitutionRateDraft {
  mode: 'default' | PICIncentiveRateMode;
  unitRate: number;
  minPortionThreshold: number;
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

  const [activeSubTab, setActiveSubTab] = useState<'payouts' | 'tariffs'>('payouts');

  // Filter states
  const [selectedDate, setSelectedDate] = useState<string>('ALL');
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Tariff Config Modal (Global Default + All Institutions)
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [rateModeForm, setRateModeForm] = useState<PICIncentiveRateMode>(picIncentiveConfig.rateMode);
  const [ratePerPortionForm, setRatePerPortionForm] = useState<number>(picIncentiveConfig.ratePerPortion);
  const [flatDailyRateForm, setFlatDailyRateForm] = useState<number>(picIncentiveConfig.flatDailyRate);
  const [minThresholdForm, setMinThresholdForm] = useState<number>(picIncentiveConfig.minPortionThreshold);
  const [instDraftsForm, setInstDraftsForm] = useState<Record<string, InstitutionRateDraft>>({});
  const [tariffSearchQuery, setTariffSearchQuery] = useState<string>('');

  // Quick Single-Institution Tariff Edit Modal
  const [quickInstEditId, setQuickInstEditId] = useState<string | null>(null);
  const [quickInstMode, setQuickInstMode] = useState<'default' | PICIncentiveRateMode>('default');
  const [quickInstRate, setQuickInstRate] = useState<number>(picIncentiveConfig.ratePerPortion);
  const [quickInstMinThreshold, setQuickInstMinThreshold] = useState<number>(
    picIncentiveConfig.minPortionThreshold
  );

  // Inline drafts on the "Tarif PIC per Lembaga" tab
  const [inlineTabDrafts, setInlineTabDrafts] = useState<Record<string, InstitutionRateDraft>>({});
  const [hasInlineChanges, setHasInlineChanges] = useState(false);

  // Payout confirmation modal (pay directly or deduct from Petty Cash)
  const [payoutModalRow, setPayoutModalRow] = useState<ComputedPICRow | null>(null);
  const [deductPettyCash, setDeductPettyCash] = useState<boolean>(true);
  const [payoutNotes, setPayoutNotes] = useState<string>('');

  const customInstitutionCount = useMemo(
    () => Object.keys(picIncentiveConfig.institutionRates || {}).length,
    [picIncentiveConfig.institutionRates]
  );

  // Helper to resolve effective draft state for all institutions
  const buildInstitutionDraftMap = (): Record<string, InstitutionRateDraft> => {
    const map: Record<string, InstitutionRateDraft> = {};
    const defaultRate =
      picIncentiveConfig.rateMode === 'per_porsi'
        ? picIncentiveConfig.ratePerPortion
        : picIncentiveConfig.flatDailyRate;

    institutions.forEach(inst => {
      const ov = picIncentiveConfig.institutionRates?.[inst.id];
      if (ov) {
        map[inst.id] = {
          mode: ov.rateMode,
          unitRate: ov.unitRate,
          minPortionThreshold: ov.minPortionThreshold ?? picIncentiveConfig.minPortionThreshold,
        };
      } else {
        map[inst.id] = {
          mode: 'default',
          unitRate: defaultRate,
          minPortionThreshold: picIncentiveConfig.minPortionThreshold,
        };
      }
    });
    return map;
  };

  // Real-time merged rows from beneficiaryAttendance + institutions + picIncentivePayouts + per-institution tariffs
  const allComputedRows = useMemo<ComputedPICRow[]>(() => {
    return beneficiaryAttendance
      .map(att => {
        const inst = institutions.find(i => i.id === att.institutionId);
        const saved = picIncentivePayouts.find(
          p =>
            p.attendanceLogId === att.id ||
            (p.date === att.date && p.institutionId === att.institutionId)
        );

        const instOverride = picIncentiveConfig.institutionRates?.[att.institutionId];
        const isLockedPaidOrApproved = Boolean(
          saved && (saved.status === 'Disetujui' || saved.status === 'Sudah Dibayarkan')
        );

        const activeRateMode: PICIncentiveRateMode = isLockedPaidOrApproved
          ? saved!.rateMode
          : instOverride
          ? instOverride.rateMode
          : picIncentiveConfig.rateMode;

        const unitRate = isLockedPaidOrApproved
          ? saved!.unitRate
          : instOverride
          ? instOverride.unitRate
          : activeRateMode === 'per_porsi'
          ? picIncentiveConfig.ratePerPortion
          : picIncentiveConfig.flatDailyRate;

        const minThreshold =
          instOverride?.minPortionThreshold ?? picIncentiveConfig.minPortionThreshold;
        const qualifies = att.actualPortions >= minThreshold;

        const computedTotal = isLockedPaidOrApproved
          ? saved!.totalIncentive
          : !qualifies
          ? 0
          : activeRateMode === 'per_porsi'
          ? att.actualPortions * unitRate
          : unitRate;

        const attendanceRatePct =
          att.totalRegistered > 0
            ? Math.round((att.actualPortions / att.totalRegistered) * 1000) / 10
            : 0;

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
          isCustomInstitutionRate: Boolean(!isLockedPaidOrApproved && instOverride),
        };
      })
      .sort(
        (a, b) =>
          b.date.localeCompare(a.date) || a.institutionName.localeCompare(b.institutionName)
      );
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

  const filteredTariffInstitutions = useMemo(() => {
    const q = tariffSearchQuery.trim().toLowerCase();
    return institutions.filter(inst => {
      if (!q) return true;
      return (
        inst.name.toLowerCase().includes(q) ||
        inst.institutionType.toLowerCase().includes(q) ||
        (inst.picName || '').toLowerCase().includes(q) ||
        (inst.deliveryRoute || '').toLowerCase().includes(q)
      );
    });
  }, [institutions, tariffSearchQuery]);

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

  const convertDraftMapToOverrides = (
    draftMap: Record<string, InstitutionRateDraft>
  ): Record<string, PICInstitutionTariffOverride> => {
    const nextOverrides: Record<string, PICInstitutionTariffOverride> = {};
    Object.entries(draftMap).forEach(([instId, draft]) => {
      if (draft.mode !== 'default') {
        nextOverrides[instId] = {
          rateMode: draft.mode,
          unitRate: toNonNegativeNumber(draft.unitRate, 0),
          minPortionThreshold: toNonNegativeNumber(draft.minPortionThreshold, 0),
        };
      }
    });
    return nextOverrides;
  };

  const handleOpenConfig = () => {
    setRateModeForm(picIncentiveConfig.rateMode);
    setRatePerPortionForm(picIncentiveConfig.ratePerPortion);
    setFlatDailyRateForm(picIncentiveConfig.flatDailyRate);
    setMinThresholdForm(picIncentiveConfig.minPortionThreshold);
    setInstDraftsForm(buildInstitutionDraftMap());
    setIsConfigOpen(true);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    const institutionRates = convertDraftMapToOverrides(instDraftsForm);
    await updatePICIncentiveConfig({
      rateMode: rateModeForm,
      ratePerPortion: toNonNegativeNumber(ratePerPortionForm, 0),
      flatDailyRate: toNonNegativeNumber(flatDailyRateForm, 0),
      minPortionThreshold: toNonNegativeNumber(minThresholdForm, 0),
      institutionRates,
    });
    setInlineTabDrafts({});
    setHasInlineChanges(false);
    setIsConfigOpen(false);
  };

  const handleOpenQuickInstEdit = (institutionId: string) => {
    const ov = picIncentiveConfig.institutionRates?.[institutionId];
    setQuickInstEditId(institutionId);
    if (ov) {
      setQuickInstMode(ov.rateMode);
      setQuickInstRate(ov.unitRate);
      setQuickInstMinThreshold(ov.minPortionThreshold ?? picIncentiveConfig.minPortionThreshold);
    } else {
      setQuickInstMode(picIncentiveConfig.rateMode);
      setQuickInstRate(
        picIncentiveConfig.rateMode === 'per_porsi'
          ? picIncentiveConfig.ratePerPortion
          : picIncentiveConfig.flatDailyRate
      );
      setQuickInstMinThreshold(picIncentiveConfig.minPortionThreshold);
    }
  };

  const handleSaveQuickInstTariff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInstEditId) return;
    const nextRates: Record<string, PICInstitutionTariffOverride> = {
      ...(picIncentiveConfig.institutionRates || {}),
    };
    if (quickInstMode === 'default') {
      delete nextRates[quickInstEditId];
    } else {
      nextRates[quickInstEditId] = {
        rateMode: quickInstMode,
        unitRate: toNonNegativeNumber(quickInstRate, 0),
        minPortionThreshold: toNonNegativeNumber(quickInstMinThreshold, 0),
      };
    }
    await updatePICIncentiveConfig({ institutionRates: nextRates });
    setInlineTabDrafts({});
    setHasInlineChanges(false);
    setQuickInstEditId(null);
  };

  const getActiveDraftForInst = (instId: string): InstitutionRateDraft => {
    if (inlineTabDrafts[instId]) return inlineTabDrafts[instId];
    const ov = picIncentiveConfig.institutionRates?.[instId];
    if (ov) {
      return {
        mode: ov.rateMode,
        unitRate: ov.unitRate,
        minPortionThreshold: ov.minPortionThreshold ?? picIncentiveConfig.minPortionThreshold,
      };
    }
    return {
      mode: 'default',
      unitRate:
        picIncentiveConfig.rateMode === 'per_porsi'
          ? picIncentiveConfig.ratePerPortion
          : picIncentiveConfig.flatDailyRate,
      minPortionThreshold: picIncentiveConfig.minPortionThreshold,
    };
  };

  const handleUpdateInlineTabDraft = (
    instId: string,
    patch: Partial<InstitutionRateDraft>
  ) => {
    const current = getActiveDraftForInst(instId);
    const nextDraft: InstitutionRateDraft = { ...current, ...patch };
    if (patch.mode && patch.mode !== current.mode && patch.unitRate === undefined) {
      if (patch.mode === 'per_porsi') {
        nextDraft.unitRate = picIncentiveConfig.ratePerPortion;
      } else if (patch.mode === 'flat_harian') {
        nextDraft.unitRate = picIncentiveConfig.flatDailyRate;
      } else {
        nextDraft.unitRate =
          picIncentiveConfig.rateMode === 'per_porsi'
            ? picIncentiveConfig.ratePerPortion
            : picIncentiveConfig.flatDailyRate;
      }
    }
    setInlineTabDrafts(prev => ({ ...prev, [instId]: nextDraft }));
    setHasInlineChanges(true);
  };

  const handleSaveInlineTabTariffs = async () => {
    const merged: Record<string, InstitutionRateDraft> = {};
    institutions.forEach(inst => {
      merged[inst.id] = getActiveDraftForInst(inst.id);
    });
    const institutionRates = convertDraftMapToOverrides(merged);
    await updatePICIncentiveConfig({ institutionRates });
    setInlineTabDrafts({});
    setHasInlineChanges(false);
  };

  const handleResetAllInstitutionTariffs = async () => {
    await updatePICIncentiveConfig({ institutionRates: {} });
    setInlineTabDrafts({});
    setHasInlineChanges(false);
  };

  const handleApproveSingle = async (row: ComputedPICRow) => {
    if (!canApprove) {
      addToast(
        'error',
        'Akses Ditolak',
        'Hanya Kepala SPPG / Pengawas Keuangan / Admin Utama yang dapat menyetujui.'
      );
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
      addToast(
        'info',
        'Tidak Ada Antrean',
        'Semua data terfilter sudah disetujui atau dibayarkan.'
      );
      return;
    }
    await batchApprovePICIncentives(pendingRows);
  };

  const handleOpenPayModal = (row: ComputedPICRow) => {
    setPayoutModalRow(row);
    setDeductPettyCash(true);
    setPayoutNotes(
      row.notes || `Pencairan insentif PIC ${row.institutionName} tanggal ${row.date}`
    );
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
      subtitle: `${sppgConfig.foundationName} - ${sppgConfig.sppgName} | Tarif per Lembaga & Presensi Harian`,
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
        r.rateMode === 'per_porsi'
          ? `${formatRupiah(r.unitRate)}/porsi`
          : `${formatRupiah(r.unitRate)}/hari`,
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
      Jenis_Tarif_Lembaga: r.isCustomInstitutionRate ? 'Tarif Khusus Lembaga' : 'Tarif Default',
      Mode_Tarif: r.rateMode === 'per_porsi' ? 'Per Porsi Hadir' : 'Flat Harian',
      Tarif_Satuan: r.unitRate,
      Total_Insentif_Rp: r.totalIncentive,
      Status_Pencairan: r.status,
      ID_Petty_Cash: r.pettyCashTxId || '-',
    }));
    exportToExcel(excelRows, 'Insentif_PIC_Lembaga_SPPG', 'Insentif PIC');
  };

  const quickEditInstitution = useMemo(
    () => institutions.find(i => i.id === quickInstEditId) || null,
    [institutions, quickInstEditId]
  );

  return (
    <div className="space-y-6">
      {/* Page Header & Realtime Sync Indicator */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 px-5 py-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-lg bg-[#1E3A8A] text-white flex items-center justify-center shrink-0">
                <HandCoins className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  Insentif PIC Lembaga Penerima Manfaat
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                  <RefreshCw className="w-3.5 h-3.5 text-[#0D9488]" />
                  Terhubung real-time dengan Data Presensi Harian &amp; Tarif Khusus Masing-Masing Lembaga ({customInstitutionCount} tarif khusus aktif)
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canEdit && (
              <button
                type="button"
                onClick={handleOpenConfig}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-all duration-200 ease-in-out cursor-pointer"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>
                  Atur Tarif Default &amp; Lembaga (
                  {customInstitutionCount > 0
                    ? `${customInstitutionCount} Khusus`
                    : picIncentiveConfig.rateMode === 'per_porsi'
                    ? `${formatRupiah(picIncentiveConfig.ratePerPortion)}/porsi`
                    : `${formatRupiah(picIncentiveConfig.flatDailyRate)}/hari`}
                  )
                </span>
              </button>
            )}
            {canApprove && summary.pendingCount > 0 && (
              <button
                type="button"
                onClick={handleBatchApprove}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#0D9488] hover:bg-teal-700 text-white flex items-center gap-1.5 transition-all duration-200 ease-in-out shadow-xs cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                Setujui Semua ({summary.pendingCount})
              </button>
            )}
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3 py-2 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-all duration-200 ease-in-out cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#0D9488]" />
              Excel
            </button>
            <button
              type="button"
              onClick={handleExportPDF}
              className="px-3 py-2 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-all duration-200 ease-in-out cursor-pointer"
            >
              <Download className="w-4 h-4 text-[#E11D48]" />
              PDF
            </button>
            <button
              type="button"
              onClick={() => triggerPrint()}
              className="px-3 py-2 rounded-lg text-xs font-semibold bg-[#1E3A8A] hover:bg-blue-900 text-white flex items-center gap-1.5 transition-all duration-200 ease-in-out cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Cetak
            </button>
          </div>
        </div>
      </div>

      {/* Sub-Menu Pill Tabs */}
      <div className="bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm print:hidden">
        <div className="flex flex-nowrap sm:flex-wrap items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveSubTab('payouts')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ease-out whitespace-nowrap shrink-0 cursor-pointer ${
              activeSubTab === 'payouts'
                ? 'bg-[#1E3A8A] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800'
            }`}
          >
            <Wallet className="w-4 h-4 shrink-0" />
            <span>Rekap &amp; Pencairan Harian ({filteredRows.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('tariffs')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ease-out whitespace-nowrap shrink-0 cursor-pointer ${
              activeSubTab === 'tariffs'
                ? 'bg-[#1E3A8A] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4 shrink-0" />
            <span>Tarif PIC per Lembaga ({institutions.length})</span>
            {customInstitutionCount > 0 && (
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  activeSubTab === 'tariffs'
                    ? 'bg-white/20 text-white'
                    : 'bg-blue-50 text-[#1E3A8A] dark:bg-blue-950/60 dark:text-sky-300'
                }`}
              >
                {customInstitutionCount} Khusus
              </span>
            )}
          </button>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 ease-out flex flex-col justify-between h-full">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Data Kehadiran Sekolah
            </span>
            <span className="w-8 h-8 rounded-lg bg-blue-50 text-[#1E3A8A] dark:bg-sky-950/60 dark:text-sky-400 flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
            {formatNumber(summary.totalRecords)} Laporan
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
            Terintegrasi dari presensi {institutions.filter(i => i.isActive).length} lembaga aktif
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 ease-out flex flex-col justify-between h-full">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Porsi Siswa Hadir Aktual
            </span>
            <span className="w-8 h-8 rounded-lg bg-teal-50 text-[#0D9488] dark:bg-teal-950/60 dark:text-teal-400 flex items-center justify-center shrink-0">
              <UserCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
            {formatNumber(summary.totalPresentPortions)} Porsi
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 tabular-nums">
            Dari kuota terdaftar {formatNumber(summary.totalRegisteredPortions)} siswa
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 ease-out flex flex-col justify-between h-full">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Total Insentif Terhitung
            </span>
            <span className="w-8 h-8 rounded-lg bg-amber-50 text-[#D97706] dark:bg-amber-950/60 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Coins className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums font-mono">
            {formatRupiah(summary.totalIncentiveAmount)}
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
            Default:{' '}
            {picIncentiveConfig.rateMode === 'per_porsi'
              ? `${formatRupiah(picIncentiveConfig.ratePerPortion)}/porsi`
              : `Flat ${formatRupiah(picIncentiveConfig.flatDailyRate)}/hari`}{' '}
            ({customInstitutionCount} lembaga tarif khusus)
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 ease-out flex flex-col justify-between h-full">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Realisasi Pencairan PIC
            </span>
            <span className="w-8 h-8 rounded-lg bg-teal-50 text-[#0D9488] dark:bg-teal-950/60 dark:text-teal-400 flex items-center justify-center shrink-0">
              <Wallet className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-[#0D9488] dark:text-teal-400 tabular-nums font-mono">
            {formatRupiah(summary.paidAmount)}
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 tabular-nums">
            Sisa belum dibayar: {formatRupiah(summary.pendingOrApprovedAmount)}
          </p>
        </div>
      </div>

      {activeSubTab === 'payouts' ? (
        <div key="payouts" className="space-y-4 animate-fadeIn">
          {/* Filters */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
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
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
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
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
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
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
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

          {/* Main Payouts Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    <th className="sticky left-0 z-20 bg-slate-50 dark:bg-slate-800 py-3 px-4 min-w-[110px] shadow-[2px_0_6px_-2px_rgba(15,23,42,0.08)]">Tanggal</th>
                    <th className="py-3 px-4">Lembaga &amp; PIC</th>
                    <th className="py-3 px-4">Rekening Pencairan</th>
                    <th className="py-3 px-4 text-right">Siswa Hadir / Kuota</th>
                    <th className="py-3 px-4 text-right">Tarif Lembaga</th>
                    <th className="py-3 px-4 text-right">Total Insentif</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right print:hidden">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-4">
                        <EmptyState
                          variant={searchQuery || selectedInstitutionId !== 'ALL' || selectedStatus !== 'ALL' ? 'search' : 'data'}
                          compact
                          title="Belum ada data insentif PIC yang cocok"
                          description="Input presensi harian pada modul Penerima Manfaat atau reset filter untuk melihat daftar pencairan."
                          actionLabel={searchQuery || selectedInstitutionId !== 'ALL' || selectedStatus !== 'ALL' ? 'Reset Filter' : undefined}
                          onAction={searchQuery || selectedInstitutionId !== 'ALL' || selectedStatus !== 'ALL' ? () => {
                            setSearchQuery('');
                            setSelectedInstitutionId('ALL');
                            setSelectedStatus('ALL');
                          } : undefined}
                        />
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map(row => (
                      <tr
                        key={row.id}
                        className="group hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 dark:bg-slate-900 dark:group-hover:bg-slate-800 py-3 px-4 whitespace-nowrap text-slate-700 dark:text-slate-300 font-medium shadow-[2px_0_6px_-2px_rgba(15,23,42,0.08)]">
                          {row.date}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {row.institutionName}
                          </div>
                          <div className="text-[11px] text-slate-600 dark:text-slate-400">
                            PIC:{' '}
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              {row.picName}
                            </span>
                            {row.picPhone && row.picPhone !== '-' ? ` · ${row.picPhone}` : ''}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {row.accountNumber && row.accountNumber !== '-' ? (
                            <div>
                              <div className="font-medium text-slate-800 dark:text-slate-200">
                                {row.bankName}
                              </div>
                              <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400">
                                {row.accountNumber} ({row.bankAccountName})
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">
                              Tunai / Belum diisi di Master
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {formatNumber(row.presentPortions)} / {formatNumber(row.registeredPortions)}
                          </div>
                          <div className="text-[11px] text-slate-600 dark:text-slate-400">
                            {row.attendanceRatePct}% hadir ({row.absentPortions} absen)
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums font-mono text-slate-700 dark:text-slate-300">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <div>
                              <div className="font-semibold">{formatRupiah(row.unitRate)}</div>
                              <div className="text-[10px] font-sans flex items-center justify-end gap-1">
                                <span className="text-slate-500">
                                  {row.rateMode === 'per_porsi' ? 'per porsi' : 'flat/hari'}
                                </span>
                                {row.isCustomInstitutionRate && (
                                  <span className="px-1.5 py-0.2 rounded bg-blue-50 text-[#1E3A8A] dark:bg-blue-950/60 dark:text-sky-300 font-bold text-[9px]">
                                    Khusus
                                  </span>
                                )}
                              </div>
                            </div>
                            {canEdit && row.status === 'Menunggu Pencairan' && (
                              <button
                                type="button"
                                onClick={() => handleOpenQuickInstEdit(row.institutionId)}
                                title={`Edit tarif khusus PIC untuk ${row.institutionName}`}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-[#1E3A8A] hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors print:hidden cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}
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
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              Tercatat di Petty Cash
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap print:hidden">
                          <div className="inline-flex items-center gap-1.5">
                            {row.status === 'Menunggu Pencairan' && canApprove && (
                              <button
                                type="button"
                                onClick={() => handleApproveSingle(row)}
                                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#1E3A8A] hover:bg-blue-900 text-white inline-flex items-center gap-1 cursor-pointer"
                                title="Setujui insentif PIC"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Setujui
                              </button>
                            )}
                            {row.status !== 'Sudah Dibayarkan' && (canApprove || canEdit) && (
                              <button
                                type="button"
                                onClick={() => handleOpenPayModal(row)}
                                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#0D9488] hover:bg-teal-700 text-white inline-flex items-center gap-1 cursor-pointer"
                                title="Bayar & catat pencairan"
                              >
                                <Wallet className="w-3.5 h-3.5" />
                                Bayar
                              </button>
                            )}
                            {row.status === 'Sudah Dibayarkan' && (
                              <span className="text-[11px] text-[#0D9488] dark:text-teal-400 font-medium">
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
        </div>
      ) : (
        /* TAB: MASTER TARIF INSENTIF PIC PER LEMBAGA PENERIMA MANFAAT */
        <div key="tariffs" className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden animate-fadeIn">
          <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#1E3A8A]" />
                Pengaturan Tarif Insentif PIC per Lembaga Penerima Manfaat
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Atur skema &amp; nominal tarif PIC khusus untuk masing-masing sekolah/lembaga (Per Porsi Hadir atau Flat Harian). Lembaga dengan mode &quot;Ikuti Default&quot; menggunakan tarif global ({picIncentiveConfig.rateMode === 'per_porsi' ? `${formatRupiah(picIncentiveConfig.ratePerPortion)}/porsi` : `${formatRupiah(picIncentiveConfig.flatDailyRate)}/hari`}).
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={tariffSearchQuery}
                  onChange={e => setTariffSearchQuery(e.target.value)}
                  placeholder="Cari nama sekolah / PIC..."
                  className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                />
              </div>
              {canEdit && customInstitutionCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetAllInstitutionTariffs}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Semua ke Default</span>
                </button>
              )}
              {canEdit && (
                <button
                  type="button"
                  onClick={handleSaveInlineTabTariffs}
                  disabled={!hasInlineChanges}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#0D9488] hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold transition-all duration-200 cursor-pointer shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Tarif per Lembaga</span>
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  <th className="sticky left-0 z-20 bg-slate-50 dark:bg-slate-800 py-3 px-4 min-w-[180px] shadow-[2px_0_6px_-2px_rgba(15,23,42,0.08)]">Lembaga Penerima Manfaat</th>
                  <th className="py-3 px-4">PIC &amp; Rekening</th>
                  <th className="py-3 px-4 text-center">Kuota Porsi</th>
                  <th className="py-3 px-4">Skema Tarif Lembaga</th>
                  <th className="py-3 px-4 text-right">Nominal Tarif (Rp)</th>
                  <th className="py-3 px-4 text-center">Min. Siswa Hadir</th>
                  <th className="py-3 px-4 text-right">Estimasi / Hari (100% Hadir)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTariffInstitutions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-4">
                      <EmptyState
                        variant="search"
                        compact
                        title="Lembaga tidak ditemukan"
                        description={`Tidak ada lembaga penerima manfaat yang cocok dengan kata kunci "${tariffSearchQuery}".`}
                        actionLabel={tariffSearchQuery ? 'Reset Pencarian' : undefined}
                        onAction={tariffSearchQuery ? () => setTariffSearchQuery('') : undefined}
                      />
                    </td>
                  </tr>
                ) : (
                  filteredTariffInstitutions.map(inst => {
                    const draft = getActiveDraftForInst(inst.id);
                    const isDefault = draft.mode === 'default';
                    const effectiveMode = isDefault ? picIncentiveConfig.rateMode : draft.mode;
                    const effectiveUnitRate = isDefault
                      ? effectiveMode === 'per_porsi'
                        ? picIncentiveConfig.ratePerPortion
                        : picIncentiveConfig.flatDailyRate
                      : draft.unitRate;
                    const effectiveMin = isDefault
                      ? picIncentiveConfig.minPortionThreshold
                      : draft.minPortionThreshold;
                    const qualifies = inst.totalPortions >= effectiveMin;
                    const estDaily = !qualifies
                      ? 0
                      : effectiveMode === 'per_porsi'
                      ? inst.totalPortions * effectiveUnitRate
                      : effectiveUnitRate;

                    return (
                      <tr
                        key={inst.id}
                        className={`group transition-colors ${
                          !isDefault
                            ? 'bg-blue-50/40 dark:bg-blue-950/20'
                            : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 dark:bg-slate-900 dark:group-hover:bg-slate-800 py-3 px-4 min-w-[180px] shadow-[2px_0_6px_-2px_rgba(15,23,42,0.08)]">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span>{inst.name}</span>
                            {!isDefault && (
                              <span className="px-1.5 py-0.5 rounded bg-[#1E3A8A] text-white text-[9px] font-bold">
                                Tarif Khusus
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                            {inst.institutionType} • {inst.deliveryRoute}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {inst.picName || inst.contactPerson || '-'}
                          </div>
                          <div className="text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                            {inst.accountNumber
                              ? `${inst.bankName || ''} ${inst.accountNumber}`
                              : inst.picPhone || inst.phone || '-'}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center tabular-nums">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {formatNumber(inst.totalPortions)}
                          </span>
                          <div className="text-[10px] text-slate-500">
                            K:{inst.smallPortions} • B:{inst.largePortions}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <select
                            aria-label={`Skema tarif PIC ${inst.name}`}
                            disabled={!canEdit}
                            value={draft.mode}
                            onChange={e =>
                              handleUpdateInlineTabDraft(inst.id, {
                                mode: e.target.value as 'default' | PICIncentiveRateMode,
                              })
                            }
                            className="w-full min-w-[155px] px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 disabled:opacity-60"
                          >
                            <option value="default">Ikuti Tarif Default</option>
                            <option value="per_porsi">Khusus: Per Porsi Hadir</option>
                            <option value="flat_harian">Khusus: Flat Harian</option>
                          </select>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <NumericInput
                            min={0}
                            disabled={!canEdit || isDefault}
                            aria-label={`Nominal tarif PIC ${inst.name}`}
                            value={effectiveUnitRate}
                            onValueChange={val =>
                              handleUpdateInlineTabDraft(inst.id, {
                                unitRate: val,
                              })
                            }
                            className="w-28 px-2.5 py-1.5 text-xs text-right font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white disabled:bg-slate-100 dark:disabled:bg-slate-800/50 disabled:text-slate-500"
                          />
                        </td>
                        <td className="py-3 px-4 text-center">
                          <NumericInput
                            min={0}
                            disabled={!canEdit || isDefault}
                            aria-label={`Minimal siswa hadir ${inst.name}`}
                            value={effectiveMin}
                            onValueChange={val =>
                              handleUpdateInlineTabDraft(inst.id, {
                                minPortionThreshold: val,
                              })
                            }
                            className="w-16 px-2 py-1.5 text-xs text-center font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white disabled:bg-slate-100 dark:disabled:bg-slate-800/50 disabled:text-slate-500"
                          />
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums font-mono">
                          <div className="font-bold text-[#0D9488] dark:text-teal-400">
                            {formatRupiah(estDaily)}
                          </div>
                          <div className="text-[10px] font-sans text-slate-500">
                            {effectiveMode === 'per_porsi'
                              ? `${formatNumber(inst.totalPortions)} × ${formatRupiah(effectiveUnitRate)}`
                              : 'Flat per hari hadir'}
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
      )}

      {/* Modal Konfigurasi Tarif Default & Tarif Khusus Masing-Masing Lembaga */}
      <Modal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        title="Pengaturan Tarif Insentif PIC (Default & per Lembaga)"
        subtitle="Atur tarif default global serta tarif khusus untuk masing-masing Lembaga Penerima Manfaat"
        maxWidth="3xl"
      >
        <form onSubmit={handleSaveConfig} className="space-y-5">
          {/* Default Global Section */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="text-xs font-extrabold uppercase tracking-wide text-slate-800 dark:text-slate-200">
              1. Tarif Default Global (Berlaku jika Lembaga mengikuti Default)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setRateModeForm('per_porsi')}
                className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                  rateModeForm === 'per_porsi'
                    ? 'border-[#1E3A8A] bg-blue-50 dark:bg-blue-900/30 dark:border-sky-400'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                }`}
              >
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  Berdasarkan Porsi Hadir
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                  Jumlah siswa hadir aktual × tarif per porsi
                </div>
              </button>
              <button
                type="button"
                onClick={() => setRateModeForm('flat_harian')}
                className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                  rateModeForm === 'flat_harian'
                    ? 'border-[#1E3A8A] bg-blue-50 dark:bg-blue-900/30 dark:border-sky-400'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                }`}
              >
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  Tarif Flat Harian
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                  Nominal tetap per hari laporan kehadiran masuk
                </div>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {rateModeForm === 'per_porsi' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Tarif Default per Porsi Hadir (Rp)
                  </label>
                  <NumericInput
                    min={0}
                    value={ratePerPortionForm}
                    onValueChange={val => setRatePerPortionForm(val)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                    required
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Tarif Default Flat Harian (Rp)
                  </label>
                  <NumericInput
                    min={0}
                    value={flatDailyRateForm}
                    onValueChange={val => setFlatDailyRateForm(val)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Ambang Batas Minimal Siswa Hadir
                </label>
                <NumericInput
                  min={0}
                  value={minThresholdForm}
                  onValueChange={val => setMinThresholdForm(val)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Per-Institution Custom Rates Section */}
          <div className="space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="text-xs font-extrabold uppercase tracking-wide text-slate-800 dark:text-slate-200">
                  2. Tarif Khusus Berdasarkan Masing-Masing Lembaga ({institutions.length} Lembaga)
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Ubah pilihan dari &quot;Ikuti Default&quot; untuk menetapkan tarif tersendiri pada lembaga tertentu.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const resetMap: Record<string, InstitutionRateDraft> = {};
                  const defRate =
                    rateModeForm === 'per_porsi' ? ratePerPortionForm : flatDailyRateForm;
                  institutions.forEach(inst => {
                    resetMap[inst.id] = {
                      mode: 'default',
                      unitRate: defRate,
                      minPortionThreshold: minThresholdForm,
                    };
                  });
                  setInstDraftsForm(resetMap);
                }}
                className="text-[11px] font-semibold text-[#1E3A8A] hover:underline inline-flex items-center gap-1 cursor-pointer shrink-0"
              >
                <RotateCcw className="w-3 h-3" />
                Samakan Semua ke Default
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 z-10 text-[11px] font-bold text-slate-700 dark:text-slate-200">
                  <tr>
                    <th className="p-2.5 border-b border-slate-200 dark:border-slate-700">Lembaga &amp; PIC</th>
                    <th className="p-2.5 border-b border-slate-200 dark:border-slate-700 text-center">Kuota</th>
                    <th className="p-2.5 border-b border-slate-200 dark:border-slate-700">Mode Tarif</th>
                    <th className="p-2.5 border-b border-slate-200 dark:border-slate-700 text-right">Tarif (Rp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {institutions.map(inst => {
                    const draft = instDraftsForm[inst.id] || {
                      mode: 'default',
                      unitRate:
                        rateModeForm === 'per_porsi' ? ratePerPortionForm : flatDailyRateForm,
                      minPortionThreshold: minThresholdForm,
                    };
                    const isDef = draft.mode === 'default';
                    const displayRate = isDef
                      ? rateModeForm === 'per_porsi'
                        ? ratePerPortionForm
                        : flatDailyRateForm
                      : draft.unitRate;

                    return (
                      <tr key={inst.id} className={!isDef ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''}>
                        <td className="p-2.5">
                          <div className="font-semibold text-slate-900 dark:text-white">{inst.name}</div>
                          <div className="text-[10px] text-slate-600 dark:text-slate-400">
                            PIC: {inst.picName || inst.contactPerson || '-'}
                          </div>
                        </td>
                        <td className="p-2.5 text-center font-mono text-slate-700 dark:text-slate-300">
                          {formatNumber(inst.totalPortions)}
                        </td>
                        <td className="p-2.5">
                          <select
                            value={draft.mode}
                            onChange={e => {
                              const m = e.target.value as 'default' | PICIncentiveRateMode;
                              setInstDraftsForm(prev => ({
                                ...prev,
                                [inst.id]: {
                                  ...draft,
                                  mode: m,
                                  unitRate:
                                    m === 'per_porsi'
                                      ? isDef
                                        ? ratePerPortionForm
                                        : draft.unitRate
                                      : m === 'flat_harian'
                                      ? isDef
                                        ? flatDailyRateForm
                                        : draft.unitRate
                                      : rateModeForm === 'per_porsi'
                                      ? ratePerPortionForm
                                      : flatDailyRateForm,
                                },
                              }));
                            }}
                            className="w-full px-2 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                          >
                            <option value="default">Ikuti Default</option>
                            <option value="per_porsi">Khusus: Per Porsi</option>
                            <option value="flat_harian">Khusus: Flat Harian</option>
                          </select>
                        </td>
                        <td className="p-2.5 text-right">
                          <NumericInput
                            min={0}
                            disabled={isDef}
                            value={displayRate}
                            onValueChange={val =>
                              setInstDraftsForm(prev => ({
                                ...prev,
                                [inst.id]: {
                                  ...draft,
                                  unitRate: val,
                                },
                              }))
                            }
                            className="w-24 px-2 py-1 text-xs text-right font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white disabled:bg-slate-100 dark:disabled:bg-slate-800/50 disabled:text-slate-500"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Status yang masih &quot;Menunggu Pencairan&quot; otomatis menghitung ulang sesuai tarif lembaga terbaru; data yang sudah Disetujui/Dibayarkan tetap terkunci.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsConfigOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#1E3A8A] hover:bg-blue-900 text-white cursor-pointer"
            >
              Simpan Semua Tarif
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Edit Cepat Tarif PIC Satu Lembaga */}
      <Modal
        isOpen={Boolean(quickInstEditId && quickEditInstitution)}
        onClose={() => setQuickInstEditId(null)}
        title={`Edit Tarif PIC: ${quickEditInstitution?.name || ''}`}
        subtitle={`PIC: ${quickEditInstitution?.picName || '-'} • Kuota ${formatNumber(quickEditInstitution?.totalPortions || 0)} porsi`}
        maxWidth="md"
      >
        {quickEditInstitution && (
          <form onSubmit={handleSaveQuickInstTariff} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                Skema Tarif Lembaga Ini
              </label>
              <select
                value={quickInstMode}
                onChange={e => {
                  const m = e.target.value as 'default' | PICIncentiveRateMode;
                  setQuickInstMode(m);
                  if (m === 'per_porsi' && quickInstMode !== 'per_porsi') {
                    setQuickInstRate(picIncentiveConfig.ratePerPortion);
                  } else if (m === 'flat_harian' && quickInstMode !== 'flat_harian') {
                    setQuickInstRate(picIncentiveConfig.flatDailyRate);
                  }
                }}
                className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="default">
                  Ikuti Tarif Default Global ({picIncentiveConfig.rateMode === 'per_porsi' ? `${formatRupiah(picIncentiveConfig.ratePerPortion)}/porsi` : `${formatRupiah(picIncentiveConfig.flatDailyRate)}/hari`})
                </option>
                <option value="per_porsi">Tarif Khusus: Per Porsi Hadir</option>
                <option value="flat_harian">Tarif Khusus: Flat Harian</option>
              </select>
            </div>

            {quickInstMode !== 'default' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    {quickInstMode === 'per_porsi' ? 'Tarif per Porsi (Rp)' : 'Tarif Flat Harian (Rp)'}
                  </label>
                  <NumericInput
                    min={0}
                    value={quickInstRate}
                    onValueChange={val => setQuickInstRate(val)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Minimal Siswa Hadir
                  </label>
                  <NumericInput
                    min={0}
                    value={quickInstMinThreshold}
                    onValueChange={val => setQuickInstMinThreshold(val)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setQuickInstEditId(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#1E3A8A] hover:bg-blue-900 text-white cursor-pointer"
              >
                Simpan Tarif Lembaga
              </button>
            </div>
          </form>
        )}
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
                <span className="text-slate-600 dark:text-slate-400">Lembaga / Tanggal:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {payoutModalRow.institutionName} ({payoutModalRow.date})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Nama PIC:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {payoutModalRow.picName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Porsi Hadir Aktual:</span>
                <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                  {formatNumber(payoutModalRow.presentPortions)} porsi
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-sm">
                <span className="font-bold text-slate-700 dark:text-slate-200">
                  Nominal Dibayarkan:
                </span>
                <span className="font-bold font-mono text-[#0D9488] dark:text-teal-400">
                  {formatRupiah(payoutModalRow.totalIncentive)}
                </span>
              </div>
            </div>

            <label className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <input
                type="checkbox"
                checked={deductPettyCash}
                onChange={e => setDeductPettyCash(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-[#1E3A8A] focus:ring-[#1E3A8A]"
              />
              <div>
                <div className="text-xs font-semibold text-slate-900 dark:text-white">
                  Catat otomatis sebagai Pengeluaran di Kas Petty Cash
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400">
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
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#0D9488] hover:bg-teal-700 text-white cursor-pointer"
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
