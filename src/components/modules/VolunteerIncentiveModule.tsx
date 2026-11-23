import React, { useMemo, useState } from 'react';
import { useApp } from '../../lib/store';
import { EmptyState } from '../common/EmptyState';
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
  VolunteerAttendance,
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
  RotateCcw,
  Search,
  SlidersHorizontal,
  UserCheck,
  Users2,
  Wallet,
} from 'lucide-react';

const BASE_DIVISIONS = [
  'Persiapan',
  'Pengolahan',
  'Pemorsian',
  'Distribusi',
  'Cuci Ompreng',
  'Kebersihan',
  'Keamanan',
];

const BASE_POSITIONS = [
  'Koordinator Divisi',
  'Wakil Koordinator',
  'Juru Masak / Cook',
  'Asisten Dapur',
  'Petugas Timbang & Packing',
  'Driver Armada',
  'Petugas Sanitasi',
  'Petugas Keamanan',
];

interface ComputedVolunteerRow extends VolunteerIncentivePayout {
  positionLabel: string;
  positionRaw?: string;
  phone: string;
  volunteerCode?: string;
  sourceLabel: 'Presensi Harian' | 'Izin Disetujui' | 'Pengganti Shift';
  rateSource: 'Khusus Divisi & Jabatan' | 'Tarif Jabatan' | 'Tarif Divisi' | 'Default';
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
  const [divisionPositionRatesForm, setDivisionPositionRatesForm] = useState<
    Record<string, Record<string, number>>
  >(volunteerIncentiveConfig.divisionPositionRates || {});
  const [activeConfigDivTab, setActiveConfigDivTab] = useState<string>('SUMMARY');

  // Payout confirmation modal
  const [payoutModalRow, setPayoutModalRow] = useState<ComputedVolunteerRow | null>(null);
  const [deductPettyCash, setDeductPettyCash] = useState<boolean>(true);
  const [payoutNotes, setPayoutNotes] = useState<string>('');

  const availableDivisions = useMemo(() => {
    const set = new Set<string>(BASE_DIVISIONS);
    masterVolunteers.forEach(v => v.division && set.add(v.division));
    volunteerAttendance.forEach(a => a.division && set.add(a.division));
    volunteerAbsences.forEach(ab => {
      if (ab.division) set.add(ab.division);
      if (ab.replacementDivision) set.add(ab.replacementDivision);
    });
    return Array.from(set);
  }, [masterVolunteers, volunteerAttendance, volunteerAbsences]);

  const availablePositions = useMemo(() => {
    const set = new Set<string>(BASE_POSITIONS);
    masterVolunteers.forEach(v => v.position && set.add(v.position));
    return Array.from(set);
  }, [masterVolunteers]);

  const customPositionRateCount = useMemo(() => {
    const divPosMap = volunteerIncentiveConfig.divisionPositionRates || {};
    return Object.values(divPosMap).reduce((sum, posMap) => sum + Object.keys(posMap || {}).length, 0);
  }, [volunteerIncentiveConfig.divisionPositionRates]);

  const resolveVolunteerDailyRate = (
    division: string,
    position?: string
  ): {
    rate: number;
    rateSource: ComputedVolunteerRow['rateSource'];
  } => {
    if (position) {
      const divPosRate = volunteerIncentiveConfig.divisionPositionRates?.[division]?.[position];
      if (divPosRate !== undefined && Number.isFinite(divPosRate)) {
        return { rate: divPosRate, rateSource: 'Khusus Divisi & Jabatan' };
      }
      const posRate = volunteerIncentiveConfig.positionRates?.[position];
      if (posRate !== undefined && Number.isFinite(posRate)) {
        return { rate: posRate, rateSource: 'Tarif Jabatan' };
      }
    }
    const divRate = volunteerIncentiveConfig.divisionRates?.[division];
    if (divRate !== undefined && Number.isFinite(divRate)) {
      return { rate: divRate, rateSource: 'Tarif Divisi' };
    }
    return { rate: volunteerIncentiveConfig.defaultDailyRate, rateSource: 'Default' };
  };

  const approvedAbsencesCount = useMemo(
    () => volunteerAbsences.filter(a => a.approvalStatus === 'Disetujui').length,
    [volunteerAbsences]
  );

  const pendingAbsencesCount = useMemo(
    () => volunteerAbsences.filter(a => a.approvalStatus === 'Menunggu Persetujuan').length,
    [volunteerAbsences]
  );

  // Real-time integration with Menu "Relawan & Ketidakhadiran" (volunteerAttendance + volunteerAbsences) & Master Relawan
  const allComputedRows = useMemo<ComputedVolunteerRow[]>(() => {
    const rows: ComputedVolunteerRow[] = [];
    const matchedAbsenceIds = new Set<string>();

    const findMaster = (id?: string, name?: string) => {
      const cleanName = (name || '').replace(/\s*\(.*?\)\s*/g, '').trim().toLowerCase();
      return masterVolunteers.find(
        m => (id && m.id === id) || (cleanName && m.name.trim().toLowerCase() === cleanName)
      );
    };

    volunteerAttendance.forEach(att => {
      const master = findMaster(att.volunteerId, att.volunteerName);
      const matchedAbsence = volunteerAbsences.find(
        abs =>
          abs.date === att.date &&
          abs.approvalStatus === 'Disetujui' &&
          ((abs.volunteerId && abs.volunteerId === att.volunteerId) ||
            abs.volunteerName.trim().toLowerCase() === att.volunteerName.trim().toLowerCase())
      );

      if (matchedAbsence) {
        matchedAbsenceIds.add(matchedAbsence.id);
      }

      const effectiveStatus: VolunteerAttendance['status'] =
        matchedAbsence && att.status === 'Hadir'
          ? matchedAbsence.reason === 'Sakit'
            ? 'Sakit'
            : 'Izin'
          : att.status;

      const saved = volunteerIncentivePayouts.find(p => p.attendanceId === att.id);
      const isPresent = effectiveStatus === 'Hadir';
      const isLocked = isPresent && saved && (saved.status === 'Disetujui' || saved.status === 'Sudah Dibayarkan');
      const resolvedDivision = master?.division || att.division;
      const resolvedPosition = master?.position;
      const rateResolved = resolveVolunteerDailyRate(resolvedDivision, resolvedPosition);
      const divRate = isLocked ? saved.dailyRate : rateResolved.rate;

      const computedTotal = isLocked ? saved.totalIncentive : isPresent ? divRate : 0;

      rows.push({
        id: saved?.id || `volp-${att.id}`,
        attendanceId: att.id,
        date: att.date,
        volunteerId: master?.id || att.volunteerId,
        volunteerName: master?.name || att.volunteerName,
        division: resolvedDivision,
        shift: att.shift,
        attendanceStatus: effectiveStatus,
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
        notes:
          saved?.notes ||
          (isPresent
            ? att.notes
            : `Tidak hadir (${effectiveStatus}${matchedAbsence ? `: ${matchedAbsence.reason}` : ''}) - Rp 0`),
        positionLabel: resolvedPosition || 'Relawan Dapur',
        positionRaw: resolvedPosition,
        phone: master?.phone || '-',
        volunteerCode: master?.code,
        sourceLabel: matchedAbsence ? 'Izin Disetujui' : 'Presensi Harian',
        rateSource: rateResolved.rateSource,
      });

      // If absent and replaced by substitute volunteer, generate substitute shift row automatically
      if (!isPresent) {
        const subNameRaw =
          matchedAbsence?.replacementVolunteerName ||
          (att.replacementVolunteer ? att.replacementVolunteer.replace(/\s*\(.*?\)\s*/g, '').trim() : '');

        if (subNameRaw) {
          const subMaster = findMaster(matchedAbsence?.replacementVolunteerId, subNameRaw);
          const subAttendanceKey = `${att.id}-sub`;
          const savedSub = volunteerIncentivePayouts.find(p => p.attendanceId === subAttendanceKey);
          const subLocked =
            savedSub && (savedSub.status === 'Disetujui' || savedSub.status === 'Sudah Dibayarkan');
          const subDiv = subMaster?.division || matchedAbsence?.replacementDivision || resolvedDivision;
          const subRateResolved = resolveVolunteerDailyRate(subDiv, subMaster?.position);
          const subRate = subLocked ? savedSub.dailyRate : subRateResolved.rate;

          rows.push({
            id: savedSub?.id || `volp-${subAttendanceKey}`,
            attendanceId: subAttendanceKey,
            date: att.date,
            volunteerId: subMaster?.id || matchedAbsence?.replacementVolunteerId || `sub-${att.id}`,
            volunteerName: subMaster?.name || subNameRaw,
            division: subDiv,
            shift: att.shift,
            attendanceStatus: 'Hadir',
            isSubstitute: true,
            replacedVolunteerName: master?.name || att.volunteerName,
            dailyRate: subRate,
            totalIncentive: subLocked ? savedSub.totalIncentive : subRate,
            status: (savedSub?.status || 'Menunggu Pencairan') as IncentivePayoutStatus,
            approvedBy: savedSub?.approvedBy,
            approvedAt: savedSub?.approvedAt,
            paidAt: savedSub?.paidAt,
            pettyCashTxId: savedSub?.pettyCashTxId,
            notes: savedSub?.notes || `Relawan pengganti untuk ${master?.name || att.volunteerName}`,
            positionLabel: subMaster?.position ? `${subMaster.position} (Pengganti Shift)` : 'Relawan Pengganti Shift',
            positionRaw: subMaster?.position,
            phone: subMaster?.phone || '-',
            volunteerCode: subMaster?.code,
            sourceLabel: 'Pengganti Shift',
            rateSource: subRateResolved.rateSource,
          });
        }
      }
    });

    // Also include standalone approved absences from Menu "Relawan & Ketidakhadiran" that do not have a presensi log on that date
    volunteerAbsences
      .filter(abs => abs.approvalStatus === 'Disetujui' && !matchedAbsenceIds.has(abs.id))
      .forEach(abs => {
        const master = findMaster(abs.volunteerId, abs.volunteerName);
        const absStatus: VolunteerAttendance['status'] = abs.reason === 'Sakit' ? 'Sakit' : 'Izin';
        const resolvedDiv = master?.division || abs.division;
        const defaultShift =
          resolvedDiv === 'Cuci Ompreng' || resolvedDiv === 'Kebersihan'
            ? 'Siang (08:00 - 13:00)'
            : 'Pagi (03:30 - 08:30)';
        const absRateResolved = resolveVolunteerDailyRate(resolvedDiv, master?.position);

        rows.push({
          id: `volp-abs-${abs.id}`,
          attendanceId: `abs-${abs.id}`,
          date: abs.date,
          volunteerId: master?.id || abs.volunteerId,
          volunteerName: master?.name || abs.volunteerName,
          division: resolvedDiv,
          shift: defaultShift,
          attendanceStatus: absStatus,
          isSubstitute: false,
          dailyRate: absRateResolved.rate,
          totalIncentive: 0,
          status: 'Menunggu Pencairan',
          notes: `Izin disetujui (${abs.reason}) — digantikan ${abs.replacementVolunteerName}`,
          positionLabel: master?.position || 'Relawan Dapur',
          positionRaw: master?.position,
          phone: master?.phone || '-',
          volunteerCode: master?.code,
          sourceLabel: 'Izin Disetujui',
          rateSource: absRateResolved.rateSource,
        });

        if (abs.replacementVolunteerName) {
          const subMaster = findMaster(abs.replacementVolunteerId, abs.replacementVolunteerName);
          const subAttendanceKey = `abs-${abs.id}-sub`;
          const savedSub = volunteerIncentivePayouts.find(p => p.attendanceId === subAttendanceKey);
          const subLocked =
            savedSub && (savedSub.status === 'Disetujui' || savedSub.status === 'Sudah Dibayarkan');
          const subDiv = subMaster?.division || abs.replacementDivision || resolvedDiv;
          const subRateResolved = resolveVolunteerDailyRate(subDiv, subMaster?.position);
          const subRate = subLocked ? savedSub.dailyRate : subRateResolved.rate;

          rows.push({
            id: savedSub?.id || `volp-${subAttendanceKey}`,
            attendanceId: subAttendanceKey,
            date: abs.date,
            volunteerId: subMaster?.id || abs.replacementVolunteerId || subAttendanceKey,
            volunteerName: subMaster?.name || abs.replacementVolunteerName,
            division: subDiv,
            shift: defaultShift,
            attendanceStatus: 'Hadir',
            isSubstitute: true,
            replacedVolunteerName: master?.name || abs.volunteerName,
            dailyRate: subRate,
            totalIncentive: subLocked ? savedSub.totalIncentive : subRate,
            status: (savedSub?.status || 'Menunggu Pencairan') as IncentivePayoutStatus,
            approvedBy: savedSub?.approvedBy,
            approvedAt: savedSub?.approvedAt,
            paidAt: savedSub?.paidAt,
            pettyCashTxId: savedSub?.pettyCashTxId,
            notes: savedSub?.notes || `Pengganti shift ${master?.name || abs.volunteerName} (${abs.reason})`,
            positionLabel: subMaster?.position ? `${subMaster.position} (Pengganti Shift)` : 'Relawan Pengganti Shift',
            positionRaw: subMaster?.position,
            phone: subMaster?.phone || '-',
            volunteerCode: subMaster?.code,
            sourceLabel: 'Pengganti Shift',
            rateSource: subRateResolved.rateSource,
          });
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
    const clonedDivPos: Record<string, Record<string, number>> = {};
    Object.entries(volunteerIncentiveConfig.divisionPositionRates || {}).forEach(([div, posMap]) => {
      clonedDivPos[div] = { ...(posMap || {}) };
    });
    setDivisionPositionRatesForm(clonedDivPos);
    setActiveConfigDivTab('SUMMARY');
    setIsConfigOpen(true);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedDivPos: Record<string, Record<string, number>> = {};
    Object.entries(divisionPositionRatesForm).forEach(([div, posMap]) => {
      const cleanPos: Record<string, number> = {};
      Object.entries(posMap || {}).forEach(([pos, val]) => {
        if (val !== undefined && Number.isFinite(val) && val >= 0) {
          cleanPos[pos] = Number(val);
        }
      });
      if (Object.keys(cleanPos).length > 0) {
        cleanedDivPos[div] = cleanPos;
      }
    });
    await updateVolunteerIncentiveConfig({
      defaultDailyRate: Math.max(0, Number(defaultRateForm) || 0),
      divisionRates: divisionRatesForm,
      divisionPositionRates: cleanedDivPos,
    });
    setIsConfigOpen(false);
  };

  const handleSetDivPosRate = (div: string, pos: string, rawValue: string) => {
    setDivisionPositionRatesForm(prev => {
      const next = { ...prev };
      const curDivMap = { ...(next[div] || {}) };
      if (rawValue.trim() === '') {
        delete curDivMap[pos];
      } else {
        const parsed = Number(rawValue);
        if (!Number.isFinite(parsed) || parsed < 0) return prev;
        curDivMap[pos] = parsed;
      }
      if (Object.keys(curDivMap).length === 0) {
        delete next[div];
      } else {
        next[div] = curDivMap;
      }
      return next;
    });
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
      subtitle: `${sppgConfig.foundationName} - ${sppgConfig.sppgName} | Tarif per Divisi & Jabatan`,
      headers: [
        'No',
        'Tanggal',
        'Nama Relawan',
        'Jabatan',
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
        r.positionLabel,
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
      Jabatan: r.positionLabel,
      Pengganti_Untuk: r.isSubstitute ? r.replacedVolunteerName || '-' : '-',
      Divisi: r.division,
      Shift: r.shift,
      Status_Absensi: r.attendanceStatus,
      Sumber_Tarif: r.rateSource,
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
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 px-5 py-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-[#0D9488] text-white flex items-center justify-center shrink-0">
              <Users2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                Insentif Relawan Dapur SPPG
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 flex flex-wrap items-center gap-1.5 mt-0.5">
                <RefreshCw className="w-3.5 h-3.5 text-[#0D9488] shrink-0" />
                <span>
                  Terhubung langsung dengan menu <strong>Relawan &amp; Ketidakhadiran</strong> ({volunteerAttendance.length} log presensi, {approvedAbsencesCount} izin &amp; pengganti disetujui
                  {pendingAbsencesCount > 0 ? `, ${pendingAbsencesCount} menunggu persetujuan` : ''})
                </span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-800">
              <button
                onClick={() => setViewMode('daily')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ease-in-out ${
                  viewMode === 'daily'
                    ? 'bg-[#1E3A8A] text-white shadow-xs dark:bg-sky-600'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Rincian Harian
              </button>
              <button
                onClick={() => setViewMode('summary')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ease-in-out ${
                  viewMode === 'summary'
                    ? 'bg-[#1E3A8A] text-white shadow-xs dark:bg-sky-600'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Rekap Per Relawan
              </button>
            </div>

            {canEdit && (
              <button
                type="button"
                onClick={handleOpenConfig}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 flex items-center gap-1.5 transition-all duration-200 ease-in-out cursor-pointer"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>
                  Tarif Divisi &amp; Jabatan
                  {customPositionRateCount > 0 ? ` (${customPositionRateCount} Khusus)` : ''}
                </span>
              </button>
            )}
            {canApprove && metrics.pendingApproveCount > 0 && (
              <button
                onClick={handleBatchApprove}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#0D9488] hover:bg-teal-700 text-white flex items-center gap-1.5 transition-all duration-200 ease-in-out"
              >
                <CheckCircle2 className="w-4 h-4" />
                Setujui Semua ({metrics.pendingApproveCount})
              </button>
            )}
            <button
              onClick={handleExportExcel}
              className="px-3 py-2 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 flex items-center gap-1.5 transition-all duration-200 ease-in-out"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#0D9488]" />
              Excel
            </button>
            <button
              onClick={handleExportPDF}
              className="px-3 py-2 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 flex items-center gap-1.5 transition-all duration-200 ease-in-out"
            >
              <Download className="w-4 h-4 text-[#E11D48]" />
              PDF
            </button>
            <button
              onClick={() => triggerPrint()}
              className="px-3 py-2 rounded-lg text-xs font-semibold bg-[#1E3A8A] hover:bg-blue-900 text-white flex items-center gap-1.5 transition-all duration-200 ease-in-out"
            >
              <Printer className="w-4 h-4" />
              Cetak
            </button>
          </div>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 ease-out flex flex-col justify-between h-full">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Shift Hadir &amp; Pengganti
            </span>
            <span className="w-8 h-8 rounded-lg bg-teal-50 text-[#0D9488] dark:bg-teal-950/60 dark:text-teal-400 flex items-center justify-center shrink-0">
              <UserCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
            {formatNumber(metrics.eligibleCount)} Shift
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
            {metrics.absentCount} catatan izin/sakit/alpa otomatis Rp 0
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 ease-out flex flex-col justify-between h-full">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Total Insentif Terhitung
            </span>
            <span className="w-8 h-8 rounded-lg bg-blue-50 text-[#1E3A8A] dark:bg-sky-950/60 dark:text-sky-400 flex items-center justify-center shrink-0">
              <Coins className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums font-mono">
            {formatRupiah(metrics.totalAmount)}
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
            Tarif standar rata-rata {formatRupiah(volunteerIncentiveConfig.defaultDailyRate)}/hari
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 ease-out flex flex-col justify-between h-full">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Sudah Dibayarkan
            </span>
            <span className="w-8 h-8 rounded-lg bg-teal-50 text-[#0D9488] dark:bg-teal-950/60 dark:text-teal-400 flex items-center justify-center shrink-0">
              <Wallet className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-[#0D9488] dark:text-teal-400 tabular-nums font-mono">
            {formatRupiah(metrics.paidAmount)}
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
            Tercatat lunas ke penerima shift aktif
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 ease-out flex flex-col justify-between h-full">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Sisa Belum Dibayar
            </span>
            <span className="w-8 h-8 rounded-lg bg-amber-50 text-[#D97706] dark:bg-amber-950/60 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Coins className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-[#D97706] dark:text-amber-400 tabular-nums font-mono">
            {formatRupiah(metrics.unpaidAmount)}
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
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
              {availableDivisions.map(d => (
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
        <div key="daily" className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm animate-fadeIn">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  <th className="sticky left-0 z-20 bg-slate-50 dark:bg-slate-800 py-3 px-4 min-w-[110px] shadow-[2px_0_6px_-2px_rgba(15,23,42,0.08)]">Tanggal</th>
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
                    <td colSpan={8} className="p-4">
                      <EmptyState
                        variant={searchQuery || selectedDivision !== 'ALL' || selectedStatus !== 'ALL' ? 'search' : 'data'}
                        compact
                        title="Tidak ada data absensi relawan yang cocok"
                        description="Ubah filter tanggal, divisi, status, atau kata kunci pencarian untuk menampilkan data relawan."
                        actionLabel={searchQuery || selectedDivision !== 'ALL' || selectedStatus !== 'ALL' ? 'Reset Filter' : undefined}
                        onAction={searchQuery || selectedDivision !== 'ALL' || selectedStatus !== 'ALL' ? () => {
                          setSearchQuery('');
                          setSelectedDivision('ALL');
                          setSelectedStatus('ALL');
                        } : undefined}
                      />
                    </td>
                  </tr>
                ) : (
                  filteredRows.map(row => {
                    const isEligible = row.attendanceStatus === 'Hadir' && row.totalIncentive > 0;
                    return (
                      <tr key={row.id} className="group hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                        <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 dark:bg-slate-900 dark:group-hover:bg-slate-800 py-3 px-4 whitespace-nowrap font-medium text-slate-700 dark:text-slate-300 shadow-[2px_0_6px_-2px_rgba(15,23,42,0.08)]">
                          {row.date}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                            <span>{row.volunteerName}</span>
                            {row.volunteerCode && (
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-mono">
                                {row.volunteerCode}
                              </span>
                            )}
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
                            <span className="text-slate-400"> • {row.sourceLabel}</span>
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
                          <div>{formatRupiah(row.dailyRate)}</div>
                          {row.rateSource === 'Khusus Divisi & Jabatan' && (
                            <div className="text-[10px] font-sans font-semibold text-[#1E3A8A] dark:text-sky-400">
                              Tarif Jabatan Divisi
                            </div>
                          )}
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
        <div key="summary" className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm animate-fadeIn">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  <th className="sticky left-0 z-20 bg-slate-50 dark:bg-slate-800 py-3 px-4 min-w-[160px] shadow-[2px_0_6px_-2px_rgba(15,23,42,0.08)]">Nama Relawan</th>
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
                  <tr key={`${item.volunteerName}-${item.division}`} className="group hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 dark:bg-slate-900 dark:group-hover:bg-slate-800 py-3 px-4 font-semibold text-slate-900 dark:text-white shadow-[2px_0_6px_-2px_rgba(15,23,42,0.08)]">{item.volunteerName}</td>
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

      {/* Modal Tarif per Divisi & Berdasarkan Jabatan */}
      <Modal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        title="Pengaturan Tarif Insentif Relawan (Per Divisi & Jabatan)"
        subtitle="Atur tarif dasar divisi sekaligus tarif khusus berdasarkan jabatan (termasuk tarif berbeda untuk Koordinator di setiap divisi)"
        maxWidth="3xl"
      >
        <form onSubmit={handleSaveConfig} className="space-y-4">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-100">
                Tarif Standar Harian Default (Rp)
              </label>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Digunakan jika divisi dan jabatan belum memiliki tarif khusus.
              </p>
            </div>
            <input
              type="number"
              min={0}
              step={5000}
              value={defaultRateForm}
              onChange={e => setDefaultRateForm(Number(e.target.value))}
              className="w-full sm:w-44 px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-right font-bold"
              required
            />
          </div>

          {/* Sub-Tabs Selector inside Modal: Ringkasan Divisi & Koordinator vs Detail Jabatan per Divisi */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveConfigDivTab('SUMMARY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeConfigDivTab === 'SUMMARY'
                  ? 'bg-[#1E3A8A] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Ringkasan Divisi &amp; Koordinator
            </button>
            {availableDivisions.map(div => {
              const countOverrides = Object.keys(divisionPositionRatesForm[div] || {}).length;
              return (
                <button
                  key={div}
                  type="button"
                  onClick={() => setActiveConfigDivTab(div)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                    activeConfigDivTab === div
                      ? 'bg-[#1E3A8A] text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>Div. {div}</span>
                  {countOverrides > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                        activeConfigDivTab === div
                          ? 'bg-white/20 text-white'
                          : 'bg-blue-100 text-[#1E3A8A] dark:bg-blue-950 dark:text-sky-300'
                      }`}
                    >
                      {countOverrides}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {activeConfigDivTab === 'SUMMARY' ? (
            <div className="space-y-2">
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Atur <strong>Tarif Dasar Divisi</strong> (untuk anggota umum) dan tarif khusus{' '}
                <strong>Koordinator Divisi</strong> serta <strong>Wakil Koordinator</strong> untuk masing-masing divisi. Klik tab nama divisi di atas untuk mengatur seluruh jabatan lainnya.
              </p>
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-200">
                      <th className="p-2.5 border-b border-slate-200 dark:border-slate-700">Divisi Dapur</th>
                      <th className="p-2.5 border-b border-slate-200 dark:border-slate-700 text-right">
                        Tarif Dasar Divisi (Rp)
                      </th>
                      <th className="p-2.5 border-b border-slate-200 dark:border-slate-700 text-right">
                        Koordinator Divisi (Rp)
                      </th>
                      <th className="p-2.5 border-b border-slate-200 dark:border-slate-700 text-right">
                        Wakil Koordinator (Rp)
                      </th>
                      <th className="p-2.5 border-b border-slate-200 dark:border-slate-700 text-center">
                        Jabatan Khusus
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {availableDivisions.map(div => {
                      const baseRate = divisionRatesForm[div] ?? defaultRateForm;
                      const coordRate = divisionPositionRatesForm[div]?.['Koordinator Divisi'];
                      const viceRate = divisionPositionRatesForm[div]?.['Wakil Koordinator'];
                      const divCustomCount = Object.keys(divisionPositionRatesForm[div] || {}).length;
                      return (
                        <tr key={div} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                          <td className="p-2.5 font-bold text-slate-900 dark:text-white">
                            Div. {div}
                          </td>
                          <td className="p-2.5 text-right">
                            <input
                              type="number"
                              min={0}
                              step={5000}
                              aria-label={`Tarif dasar Div. ${div}`}
                              value={baseRate}
                              onChange={e =>
                                setDivisionRatesForm(prev => ({
                                  ...prev,
                                  [div]: Math.max(0, Number(e.target.value) || 0),
                                }))
                              }
                              className="w-28 px-2.5 py-1.5 text-xs text-right rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-semibold"
                            />
                          </td>
                          <td className="p-2.5 text-right">
                            <input
                              type="number"
                              min={0}
                              step={5000}
                              placeholder={String(baseRate)}
                              aria-label={`Tarif Koordinator Div. ${div}`}
                              value={coordRate ?? ''}
                              onChange={e =>
                                handleSetDivPosRate(div, 'Koordinator Divisi', e.target.value)
                              }
                              className={`w-28 px-2.5 py-1.5 text-xs text-right rounded-lg border font-mono font-bold ${
                                coordRate !== undefined
                                  ? 'border-[#1E3A8A] bg-blue-50/70 text-[#1E3A8A] dark:border-sky-500 dark:bg-blue-950/50 dark:text-sky-300'
                                  : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                              }`}
                            />
                          </td>
                          <td className="p-2.5 text-right">
                            <input
                              type="number"
                              min={0}
                              step={5000}
                              placeholder={String(baseRate)}
                              aria-label={`Tarif Wakil Koordinator Div. ${div}`}
                              value={viceRate ?? ''}
                              onChange={e =>
                                handleSetDivPosRate(div, 'Wakil Koordinator', e.target.value)
                              }
                              className={`w-28 px-2.5 py-1.5 text-xs text-right rounded-lg border font-mono font-bold ${
                                viceRate !== undefined
                                  ? 'border-[#0D9488] bg-teal-50/70 text-[#0D9488] dark:border-teal-500 dark:bg-teal-950/50 dark:text-teal-300'
                                  : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                              }`}
                            />
                          </td>
                          <td className="p-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => setActiveConfigDivTab(div)}
                              className="text-[11px] font-semibold text-[#1E3A8A] hover:underline cursor-pointer"
                            >
                              {divCustomCount > 0 ? `${divCustomCount} diatur` : 'Atur semua'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Kosongkan kolom Koordinator / Wakil Koordinator agar mengikuti Tarif Dasar Divisi masing-masing.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-extrabold text-[#1E3A8A] dark:text-sky-300">
                    Tarif Dasar Divisi {activeConfigDivTab} (Anggota Umum)
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400">
                    Berlaku untuk jabatan di Div. {activeConfigDivTab} yang tidak diisi tarif khusus di bawah.
                  </div>
                </div>
                <input
                  type="number"
                  min={0}
                  step={5000}
                  value={divisionRatesForm[activeConfigDivTab] ?? defaultRateForm}
                  onChange={e =>
                    setDivisionRatesForm(prev => ({
                      ...prev,
                      [activeConfigDivTab]: Math.max(0, Number(e.target.value) || 0),
                    }))
                  }
                  className="w-full sm:w-40 px-3 py-1.5 text-sm text-right rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
                />
              </div>

              <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-200">
                      <th className="p-2.5 border-b border-slate-200 dark:border-slate-700">
                        Jabatan di Div. {activeConfigDivTab}
                      </th>
                      <th className="p-2.5 border-b border-slate-200 dark:border-slate-700 text-center">
                        Status Tarif
                      </th>
                      <th className="p-2.5 border-b border-slate-200 dark:border-slate-700 text-right">
                        Tarif Khusus (Rp / Hari)
                      </th>
                      <th className="p-2.5 border-b border-slate-200 dark:border-slate-700 text-center">
                        Reset
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {availablePositions.map(pos => {
                      const baseDivRate =
                        divisionRatesForm[activeConfigDivTab] ?? defaultRateForm;
                      const customVal =
                        divisionPositionRatesForm[activeConfigDivTab]?.[pos];
                      const isOverridden = customVal !== undefined;
                      return (
                        <tr
                          key={pos}
                          className={
                            isOverridden
                              ? 'bg-blue-50/40 dark:bg-blue-950/20'
                              : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                          }
                        >
                          <td className="p-2.5 font-semibold text-slate-900 dark:text-white">
                            {pos}
                          </td>
                          <td className="p-2.5 text-center">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                                isOverridden
                                  ? 'bg-[#1E3A8A] text-white'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              {isOverridden ? 'Tarif Khusus Jabatan' : 'Ikuti Tarif Divisi'}
                            </span>
                          </td>
                          <td className="p-2.5 text-right">
                            <input
                              type="number"
                              min={0}
                              step={5000}
                              placeholder={`Ikuti (${formatNumber(baseDivRate)})`}
                              value={customVal ?? ''}
                              onChange={e =>
                                handleSetDivPosRate(activeConfigDivTab, pos, e.target.value)
                              }
                              className="w-36 px-2.5 py-1.5 text-xs text-right rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
                            />
                          </td>
                          <td className="p-2.5 text-center">
                            {isOverridden ? (
                              <button
                                type="button"
                                onClick={() => handleSetDivPosRate(activeConfigDivTab, pos, '')}
                                className="p-1 rounded text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                                title="Kembalikan ke Tarif Divisi"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

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
              Simpan Tarif Divisi &amp; Jabatan
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
