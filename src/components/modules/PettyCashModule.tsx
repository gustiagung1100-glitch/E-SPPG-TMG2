import React, { useMemo, useState } from 'react';
import { useApp } from '../../lib/store';
import { Modal } from '../common/Modal';
import {
  exportTableToPDF,
  exportToExcel,
  formatIndonesianDate,
  formatRupiah,
  triggerPrint,
} from '../../lib/exportUtils';
import { PettyCashCategory, PettyCashTransaction } from '../../types';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Calculator,
  Calendar,
  Download,
  Edit3,
  FileSpreadsheet,
  Plus,
  Printer,
  Search,
  Trash2,
  Wallet,
} from 'lucide-react';

const PETTY_CASH_CATEGORIES: PettyCashCategory[] = [
  'Top Up Saldo Kas',
  'Dana Operasional Yayasan',
  'Belanja Bahan Segar/Darurat',
  'Insentif PIC Lembaga',
  'Insentif Relawan',
  'Gas LPG & Utilitas',
  'BBM & Armada',
  'Perlengkapan & Sanitasi',
  'Lainnya',
];

interface RunningPettyCashRow extends PettyCashTransaction {
  rowOpeningBalance: number;
  rowClosingBalance: number;
}

export const PettyCashModule: React.FC = () => {
  const {
    pettyCashOpeningBalance,
    setPettyCashOpeningBalance,
    pettyCashTransactions,
    addPettyCashTransaction,
    updatePettyCashTransaction,
    deletePettyCashTransaction,
    currentUser,
    hasPermission,
    sppgConfig,
  } = useApp();

  const canCreate = hasPermission('petty_cash', 'create');
  const canEdit = hasPermission('petty_cash', 'edit');
  const canDelete = hasPermission('petty_cash', 'delete');

  // Filter period & criteria
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'Pemasukan' | 'Pengeluaran'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Opening Balance Modal
  const [isOpeningModalOpen, setIsOpeningModalOpen] = useState(false);
  const [openingInput, setOpeningInput] = useState<number>(pettyCashOpeningBalance);

  // Add / Edit Transaction Modal
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<PettyCashTransaction | null>(null);
  const [txForm, setTxForm] = useState<{
    voucherNumber: string;
    date: string;
    type: 'Pemasukan' | 'Pengeluaran';
    category: PettyCashCategory | string;
    description: string;
    counterparty: string;
    amount: number;
    proofNumber: string;
    notes: string;
  }>({
    voucherNumber: '',
    date: new Date().toISOString().slice(0, 10),
    type: 'Pengeluaran',
    category: 'Belanja Bahan Segar/Darurat',
    description: '',
    counterparty: '',
    amount: 0,
    proofNumber: '',
    notes: '',
  });

  // Delete Confirmation Modal
  const [txToDelete, setTxToDelete] = useState<PettyCashTransaction | null>(null);

  // Sort chronologically for exact accounting running balance calculation
  const chronologicalAll = useMemo(() => {
    const sorted = [...pettyCashTransactions].sort(
      (a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt)
    );
    let balance = pettyCashOpeningBalance;
    return sorted.map<RunningPettyCashRow>(tx => {
      const rowOpening = balance;
      const delta = tx.type === 'Pemasukan' ? tx.amount : -tx.amount;
      const rowClosing = rowOpening + delta;
      balance = rowClosing;
      return {
        ...tx,
        rowOpeningBalance: rowOpening,
        rowClosingBalance: rowClosing,
      };
    });
  }, [pettyCashTransactions, pettyCashOpeningBalance]);

  // Period summary calculations:
  // Saldo Awal Periode = Saldo Awal Master + net Pemasukan/Pengeluaran before startDate
  const periodSummary = useMemo(() => {
    let saldoAwalPeriode = pettyCashOpeningBalance;
    if (startDate) {
      for (const tx of chronologicalAll) {
        if (tx.date < startDate) {
          saldoAwalPeriode += tx.type === 'Pemasukan' ? tx.amount : -tx.amount;
        }
      }
    }

    const inPeriod = chronologicalAll.filter(tx => {
      if (startDate && tx.date < startDate) return false;
      if (endDate && tx.date > endDate) return false;
      return true;
    });

    const totalPemasukan = inPeriod
      .filter(tx => tx.type === 'Pemasukan')
      .reduce((acc, tx) => acc + tx.amount, 0);
    const totalPengeluaran = inPeriod
      .filter(tx => tx.type === 'Pengeluaran')
      .reduce((acc, tx) => acc + tx.amount, 0);
    const saldoAkhirPeriode = saldoAwalPeriode + totalPemasukan - totalPengeluaran;

    return {
      saldoAwalPeriode,
      totalPemasukan,
      totalPengeluaran,
      saldoAkhirPeriode,
      transactionCount: inPeriod.length,
    };
  }, [chronologicalAll, pettyCashOpeningBalance, startDate, endDate]);

  // Table rows filtered by type/category/search while preserving accurate running balance
  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return chronologicalAll.filter(tx => {
      if (startDate && tx.date < startDate) return false;
      if (endDate && tx.date > endDate) return false;
      if (typeFilter !== 'ALL' && tx.type !== typeFilter) return false;
      if (categoryFilter !== 'ALL' && tx.category !== categoryFilter) return false;
      if (q) {
        const hit =
          tx.voucherNumber.toLowerCase().includes(q) ||
          tx.description.toLowerCase().includes(q) ||
          tx.counterparty.toLowerCase().includes(q) ||
          (tx.proofNumber || '').toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [chronologicalAll, startDate, endDate, typeFilter, categoryFilter, searchQuery]);

  const buildVoucherNumber = (type: 'Pemasukan' | 'Pengeluaran') => {
    const prefix = type === 'Pemasukan' ? 'BKM-PC' : 'BKK-PC';
    const seq = String(pettyCashTransactions.length + 1).padStart(3, '0');
    return `${prefix}/SPPG-TMG2/2026/XI/${seq}`;
  };

  const handleOpenAddModal = (defaultType: 'Pemasukan' | 'Pengeluaran') => {
    setEditingTx(null);
    setTxForm({
      voucherNumber: buildVoucherNumber(defaultType),
      date: new Date().toISOString().slice(0, 10),
      type: defaultType,
      category: defaultType === 'Pemasukan' ? 'Top Up Saldo Kas' : 'Belanja Bahan Segar/Darurat',
      description: '',
      counterparty: '',
      amount: 0,
      proofNumber: '',
      notes: '',
    });
    setIsTxModalOpen(true);
  };

  const handleOpenEditModal = (tx: PettyCashTransaction) => {
    setEditingTx(tx);
    setTxForm({
      voucherNumber: tx.voucherNumber,
      date: tx.date,
      type: tx.type,
      category: tx.category,
      description: tx.description,
      counterparty: tx.counterparty,
      amount: tx.amount,
      proofNumber: tx.proofNumber || '',
      notes: tx.notes || '',
    });
    setIsTxModalOpen(true);
  };

  const handleSaveTx = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAmount = Math.max(0, Number(txForm.amount) || 0);
    if (cleanAmount <= 0) return;

    if (editingTx) {
      await updatePettyCashTransaction(editingTx.id, {
        ...txForm,
        amount: cleanAmount,
      });
    } else {
      await addPettyCashTransaction({
        ...txForm,
        amount: cleanAmount,
        recordedBy: currentUser.name,
        sourceModule: 'manual',
      });
    }
    setIsTxModalOpen(false);
    setEditingTx(null);
  };

  const handleSaveOpening = async (e: React.FormEvent) => {
    e.preventDefault();
    await setPettyCashOpeningBalance(openingInput);
    setIsOpeningModalOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (!txToDelete) return;
    await deletePettyCashTransaction(txToDelete.id);
    setTxToDelete(null);
  };

  const handleExportPDF = () => {
    exportTableToPDF({
      title: 'LAPORAN BUKU KAS PETTY CASH OPERASIONAL SPPG',
      subtitle: `Saldo Awal: ${formatRupiah(periodSummary.saldoAwalPeriode)} | Pemasukan: ${formatRupiah(
        periodSummary.totalPemasukan
      )} | Pengeluaran: ${formatRupiah(periodSummary.totalPengeluaran)} | Saldo Akhir: ${formatRupiah(
        periodSummary.saldoAkhirPeriode
      )}`,
      headers: [
        'No',
        'Tanggal',
        'No. Bukti',
        'Kategori & Uraian',
        'Penerima/Sumber',
        'Saldo Awal',
        'Pemasukan (+)',
        'Pengeluaran (-)',
        'Saldo Akhir',
      ],
      rows: filteredRows.map((tx, idx) => [
        idx + 1,
        formatIndonesianDate(tx.date),
        tx.voucherNumber,
        `${tx.category}: ${tx.description}`,
        tx.counterparty,
        formatRupiah(tx.rowOpeningBalance),
        tx.type === 'Pemasukan' ? formatRupiah(tx.amount) : '-',
        tx.type === 'Pengeluaran' ? formatRupiah(tx.amount) : '-',
        formatRupiah(tx.rowClosingBalance),
      ]),
      fileName: 'Buku_Kas_Petty_Cash_SPPG_TMG2',
      sppgConfig,
      orientation: 'landscape',
      signerRole: 'Pengawas Keuangan SPPG',
      signerName: sppgConfig.financeOfficer,
    });
  };

  const handleExportExcel = () => {
    const excelRows = filteredRows.map((tx, idx) => ({
      No: idx + 1,
      Tanggal: tx.date,
      No_Voucher: tx.voucherNumber,
      No_Nota_Bukti: tx.proofNumber || '-',
      Jenis: tx.type,
      Kategori: tx.category,
      Uraian: tx.description,
      Sumber_atau_Penerima: tx.counterparty,
      Saldo_Awal_Baris: tx.rowOpeningBalance,
      Pemasukan: tx.type === 'Pemasukan' ? tx.amount : 0,
      Pengeluaran: tx.type === 'Pengeluaran' ? tx.amount : 0,
      Saldo_Akhir_Baris: tx.rowClosingBalance,
      Petugas_Pencatat: tx.recordedBy,
    }));
    exportToExcel(excelRows, 'Buku_Kas_Petty_Cash_SPPG', 'Petty Cash');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-blue-950 text-white flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Kas Petty Cash Operasional SPPG
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Perhitungan akuntansi kronologis: Saldo Awal + Pemasukan &minus; Pengeluaran = Saldo Akhir Kas Kecil
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canEdit && (
              <button
                onClick={() => {
                  setOpeningInput(pettyCashOpeningBalance);
                  setIsOpeningModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 flex items-center gap-1.5"
              >
                <Calculator className="w-4 h-4" />
                Atur Saldo Awal
              </button>
            )}
            {canCreate && (
              <>
                <button
                  onClick={() => handleOpenAddModal('Pemasukan')}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Catat Pemasukan
                </button>
                <button
                  onClick={() => handleOpenAddModal('Pengeluaran')}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Catat Pengeluaran
                </button>
              </>
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

      {/* 4 Core Petty Cash Calculation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 border-l-4 border-l-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              1. Saldo Awal
            </span>
            <Calculator className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white tabular-nums font-mono">
            {formatRupiah(periodSummary.saldoAwalPeriode)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {startDate ? `Posisi kas sebelum ${startDate}` : 'Saldo awal buku Petty Cash aktif'}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 border-l-4 border-l-emerald-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              2. Pemasukan (+)
            </span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums font-mono">
            {formatRupiah(periodSummary.totalPemasukan)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Top up &amp; pengisian dana kas kecil periode ini
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 border-l-4 border-l-rose-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              3. Pengeluaran (&minus;)
            </span>
            <ArrowUpRight className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-700 dark:text-rose-400 tabular-nums font-mono">
            {formatRupiah(periodSummary.totalPengeluaran)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Operasional, bahan darurat &amp; pencairan insentif
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 border-l-4 border-l-blue-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              4. Saldo Akhir
            </span>
            <Wallet className="w-4 h-4 text-blue-900 dark:text-sky-400" />
          </div>
          <div
            className={`mt-2 text-2xl font-bold tabular-nums font-mono ${
              periodSummary.saldoAkhirPeriode >= 0
                ? 'text-blue-950 dark:text-sky-400'
                : 'text-rose-700 dark:text-rose-400'
            }`}
          >
            {formatRupiah(periodSummary.saldoAkhirPeriode)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 tabular-nums">
            = Saldo Awal + Pemasukan &minus; Pengeluaran
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Dari Tanggal
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Sampai Tanggal
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Jenis Mutasi
            </label>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as 'ALL' | 'Pemasukan' | 'Pengeluaran')}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
            >
              <option value="ALL">Semua (Pemasukan &amp; Pengeluaran)</option>
              <option value="Pemasukan">Pemasukan (+)</option>
              <option value="Pengeluaran">Pengeluaran (&minus;)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Kategori Kas Kecil
            </label>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
            >
              <option value="ALL">Semua Kategori</option>
              {PETTY_CASH_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Cari Uraian / Bukti
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="No. voucher, uraian, pihak..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Ledger Table with Running Balance */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                <th className="py-3 px-4">Tanggal &amp; Voucher</th>
                <th className="py-3 px-4">Kategori &amp; Uraian</th>
                <th className="py-3 px-4">Sumber / Penerima</th>
                <th className="py-3 px-4 text-right">Saldo Awal</th>
                <th className="py-3 px-4 text-right">Pemasukan (+)</th>
                <th className="py-3 px-4 text-right">Pengeluaran (&minus;)</th>
                <th className="py-3 px-4 text-right">Saldo Akhir</th>
                <th className="py-3 px-4 text-right print:hidden">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500">
                    Belum ada transaksi Petty Cash pada rentang filter yang dipilih.
                  </td>
                </tr>
              ) : (
                filteredRows.map(tx => (
                  <tr key={tx.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-900 dark:text-white">{tx.date}</div>
                      <div className="text-[11px] font-mono text-slate-500">{tx.voucherNumber}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">{tx.description}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {tx.category}
                        {tx.proofNumber ? ` · Nota: ${tx.proofNumber}` : ''}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800 dark:text-slate-200">{tx.counterparty}</div>
                      <div className="text-[11px] text-slate-500">Oleh: {tx.recordedBy}</div>
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums font-mono text-slate-600 dark:text-slate-300">
                      {formatRupiah(tx.rowOpeningBalance)}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                      {tx.type === 'Pemasukan' ? formatRupiah(tx.amount) : '-'}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums font-mono font-semibold text-rose-700 dark:text-rose-400">
                      {tx.type === 'Pengeluaran' ? formatRupiah(tx.amount) : '-'}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums font-mono font-bold text-slate-900 dark:text-white">
                      {formatRupiah(tx.rowClosingBalance)}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap print:hidden">
                      <div className="inline-flex items-center gap-1">
                        {canEdit && (
                          <button
                            onClick={() => handleOpenEditModal(tx)}
                            className="p-1.5 rounded-md text-slate-500 hover:text-blue-900 hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Edit mutasi"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => setTxToDelete(tx)}
                            className="p-1.5 rounded-md text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                            title="Hapus mutasi"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100/80 dark:bg-slate-800 border-t-2 border-slate-300 dark:border-slate-700 text-xs font-bold">
                <td colSpan={3} className="py-3 px-4 text-slate-900 dark:text-white">
                  REKAPITULASI PERIODE ({filteredRows.length} Mutasi)
                </td>
                <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800 dark:text-slate-200">
                  {formatRupiah(periodSummary.saldoAwalPeriode)}
                </td>
                <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                  {formatRupiah(periodSummary.totalPemasukan)}
                </td>
                <td className="py-3 px-4 text-right font-mono tabular-nums text-rose-700 dark:text-rose-400">
                  {formatRupiah(periodSummary.totalPengeluaran)}
                </td>
                <td className="py-3 px-4 text-right font-mono tabular-nums text-blue-950 dark:text-sky-400">
                  {formatRupiah(periodSummary.saldoAkhirPeriode)}
                </td>
                <td className="print:hidden" />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Modal Atur Saldo Awal */}
      <Modal
        isOpen={isOpeningModalOpen}
        onClose={() => setIsOpeningModalOpen(false)}
        title="Atur Saldo Awal Kas Petty Cash"
        maxWidth="sm"
      >
        <form onSubmit={handleSaveOpening} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Saldo Awal Kas Kecil (Rp)
            </label>
            <input
              type="number"
              min={0}
              step={10000}
              value={openingInput}
              onChange={e => setOpeningInput(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              required
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Saldo akhir seluruh transaksi kronologis akan otomatis dihitung ulang dari Saldo Awal ini.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsOpeningModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-950 hover:bg-blue-900 text-white"
            >
              Simpan Saldo Awal
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Tambah / Edit Transaksi Petty Cash */}
      <Modal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        title={editingTx ? 'Edit Mutasi Kas Petty Cash' : `Catat ${txForm.type} Kas Petty Cash`}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveTx} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Jenis Transaksi
              </label>
              <select
                value={txForm.type}
                onChange={e => {
                  const nextType = e.target.value as 'Pemasukan' | 'Pengeluaran';
                  setTxForm(prev => ({
                    ...prev,
                    type: nextType,
                    voucherNumber: editingTx ? prev.voucherNumber : buildVoucherNumber(nextType),
                    category: nextType === 'Pemasukan' ? 'Top Up Saldo Kas' : 'Belanja Bahan Segar/Darurat',
                  }));
                }}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="Pemasukan">Pemasukan (+)</option>
                <option value="Pengeluaran">Pengeluaran (&minus;)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Tanggal
              </label>
              <input
                type="date"
                value={txForm.date}
                onChange={e => setTxForm(prev => ({ ...prev, date: e.target.value }))}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                No. Voucher Kas
              </label>
              <input
                type="text"
                value={txForm.voucherNumber}
                onChange={e => setTxForm(prev => ({ ...prev, voucherNumber: e.target.value }))}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Kategori
              </label>
              <select
                value={txForm.category}
                onChange={e => setTxForm(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                {PETTY_CASH_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Nominal (Rp)
              </label>
              <input
                type="number"
                min={1}
                step={500}
                value={txForm.amount || ''}
                onChange={e => setTxForm(prev => ({ ...prev, amount: Number(e.target.value) }))}
                placeholder="Contoh: 250000"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                {txForm.type === 'Pemasukan' ? 'Sumber Dana' : 'Penerima / Toko / Pihak Terkait'}
              </label>
              <input
                type="text"
                value={txForm.counterparty}
                onChange={e => setTxForm(prev => ({ ...prev, counterparty: e.target.value }))}
                placeholder={txForm.type === 'Pemasukan' ? 'Bendahara Yayasan / Kas Besar' : 'Nama toko atau penerima'}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Uraian Transaksi
            </label>
            <input
              type="text"
              value={txForm.description}
              onChange={e => setTxForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Contoh: Pembelian gas LPG cadangan atau top up kas kecil minggu ke-2"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                No. Nota / Kwitansi (Opsional)
              </label>
              <input
                type="text"
                value={txForm.proofNumber}
                onChange={e => setTxForm(prev => ({ ...prev, proofNumber: e.target.value }))}
                placeholder="KWT-001 / NOTA-123"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Catatan Tambahan
              </label>
              <input
                type="text"
                value={txForm.notes}
                onChange={e => setTxForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Keterangan singkat..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsTxModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-950 hover:bg-blue-900 text-white"
            >
              {editingTx ? 'Simpan Perubahan' : 'Simpan Mutasi'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Konfirmasi Hapus */}
      <Modal
        isOpen={Boolean(txToDelete)}
        onClose={() => setTxToDelete(null)}
        title="Hapus Mutasi Petty Cash"
        maxWidth="sm"
      >
        {txToDelete && (
          <div className="space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Hapus mutasi <strong>{txToDelete.voucherNumber}</strong> ({txToDelete.type} sebesar{' '}
              <strong>{formatRupiah(txToDelete.amount)}</strong>)? Saldo Akhir kas akan otomatis dihitung ulang.
            </p>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setTxToDelete(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
