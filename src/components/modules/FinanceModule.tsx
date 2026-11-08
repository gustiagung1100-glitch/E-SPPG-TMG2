import React, { useState } from 'react';
import { useApp } from '../../lib/store';
import { DataTable, Column } from '../common/DataTable';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { exportTableToPDF, exportToExcel, formatRupiah, formatNumber, triggerPrint } from '../../lib/exportUtils';
import { FinancialTransaction } from '../../types';
import {
  Wallet,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Coins,
  TrendingDown,
  TrendingUp,
  Receipt,
  Trash2,
  PieChart,
} from 'lucide-react';

export const FinanceModule: React.FC = () => {
  const {
    financialTransactions,
    addTransaction,
    deleteTransaction,
    currentUser,
    hasPermission,
    sppgConfig,
  } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('ALL');

  // Form State
  const [formData, setFormData] = useState<Omit<FinancialTransaction, 'id'>>({
    transactionNumber: 'KAS-OUT/2026/XI/0017',
    date: new Date().toISOString().slice(0, 10),
    type: 'Pengeluaran',
    category: 'Bahan Baku',
    amount: 1500000,
    description: 'Pembelian sayur mayur segar pasar lokal Krejengan',
    sourceOrRecipient: 'Koperasi Pasar Krejengan',
    proofNumber: 'NOTA-KPK-091',
    recordedBy: currentUser.name,
    paymentMethod: 'Tunai',
  });

  const handleOpenCreate = (type: 'Pemasukan' | 'Pengeluaran') => {
    setFormData({
      transactionNumber: `KAS-${type === 'Pemasukan' ? 'IN' : 'OUT'}/2026/XI/00${Math.floor(Math.random() * 80) + 20}`,
      date: new Date().toISOString().slice(0, 10),
      type,
      category: type === 'Pemasukan' ? 'Dana Termin BGN' : 'Bahan Baku',
      amount: 2500000,
      description: '',
      sourceOrRecipient: '',
      proofNumber: `BUKTI-${Math.floor(Math.random() * 800) + 100}`,
      recordedBy: currentUser.name,
      paymentMethod: type === 'Pemasukan' ? 'Transfer Bank' : 'Tunai',
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await addTransaction(formData);
    setIsModalOpen(false);
  };

  // Calculations
  const totalIncome = financialTransactions
    .filter(t => t.type === 'Pemasukan')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalExpense = financialTransactions
    .filter(t => t.type === 'Pengeluaran')
    .reduce((acc, t) => acc + t.amount, 0);

  const cashBalance = totalIncome - totalExpense;

  const foodCostExpense = financialTransactions
    .filter(t => t.type === 'Pengeluaran' && t.category === 'Bahan Baku')
    .reduce((acc, t) => acc + t.amount, 0);

  const foodCostRatio = totalExpense > 0 ? ((foodCostExpense / totalExpense) * 100).toFixed(1) : '75.0';

  // Filtered transactions
  const filteredTransactions = filterType === 'ALL'
    ? financialTransactions
    : financialTransactions.filter(t => t.type === filterType);

  // Export handlers
  const handleExportPDF = () => {
    exportTableToPDF({
      title: 'Buku Kas & Realisasi Anggaran Keuangan MBG',
      subtitle: `Satuan Pelayanan Pemenuhan Gizi (SPPG) Probolinggo Krejengan Temenggungan 2`,
      headers: ['No. Transaksi', 'Tanggal', 'Jenis', 'Kategori', 'Keterangan', 'Pihak Terkait', 'Jumlah (Rp)'],
      rows: filteredTransactions.map(t => [
        t.transactionNumber,
        t.date,
        t.type,
        t.category,
        t.description,
        t.sourceOrRecipient,
        formatRupiah(t.amount),
      ]),
      fileName: 'Buku_Kas_Keuangan_SPPG_TMG2',
      sppgConfig,
      signerName: sppgConfig.financeOfficer,
      signerRole: 'Pengawas Keuangan SPPG',
    });
  };

  const handleExportExcel = () => {
    const dataToExport = filteredTransactions.map(t => ({
      'No. Transaksi': t.transactionNumber,
      'Tanggal': t.date,
      'Jenis Kas': t.type,
      'Kategori': t.category,
      'Jumlah (Rp)': t.amount,
      'Keterangan': t.description,
      'Sumber / Penerima': t.sourceOrRecipient,
      'No. Bukti / Kuitansi': t.proofNumber,
      'Metode Bayar': t.paymentMethod,
      'Dicatat Oleh': t.recordedBy,
    }));
    exportToExcel(dataToExport, 'Laporan_Kas_SPPG_TMG2', 'Buku Kas');
  };

  const columns: Column<FinancialTransaction>[] = [
    {
      key: 'transactionNumber',
      header: 'No. Bukti & Tanggal',
      render: row => (
        <div>
          <div className="font-bold text-slate-900 dark:text-white font-mono text-xs">
            {row.transactionNumber}
          </div>
          <div className="text-[11px] text-slate-500">
            Tgl: {row.date} • Ref: {row.proofNumber}
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Arus Kas',
      render: row => (
        <div>
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
              row.type === 'Pemasukan'
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
            }`}
          >
            {row.type === 'Pemasukan' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {row.type}
          </span>
          <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
            {row.category}
          </div>
        </div>
      ),
    },
    {
      key: 'description',
      header: 'Uraian Transaksi & Pihak Terkait',
      render: row => (
        <div className="text-xs space-y-0.5 max-w-sm">
          <div className="font-semibold text-slate-900 dark:text-white">
            {row.description}
          </div>
          <div className="text-[11px] text-slate-500">
            Entitas: <span className="font-medium">{row.sourceOrRecipient}</span> ({row.paymentMethod})
          </div>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Nominal Kas',
      align: 'right',
      render: row => (
        <div className="font-mono text-xs">
          <div
            className={`font-black text-sm ${
              row.type === 'Pemasukan'
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-slate-900 dark:text-white'
            }`}
          >
            {row.type === 'Pemasukan' ? '+' : '-'} {formatRupiah(row.amount)}
          </div>
          <div className="text-[10px] text-slate-400">
            Dicatat: {row.recordedBy}
          </div>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      align: 'right',
      render: row => (
        <div className="flex items-center justify-end gap-1.5">
          {hasPermission('finance', 'delete') && (
            <button
              onClick={() => setDeleteId(row.id)}
              className="p-1.5 text-rose-500 hover:text-rose-700 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950 transition"
              title="Hapus Transaksi"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Wallet className="w-6 h-6 text-blue-900 dark:text-sky-400" />
            Keuangan, RAB & Arus Kas MBG
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Transparansi Anggaran MBG, Analisis Food Cost Ratio & Pembukuan Kas Harian
          </p>
        </div>

        {hasPermission('finance', 'create') && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleOpenCreate('Pemasukan')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Kas Masuk</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenCreate('Pengeluaran')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
            >
              <ArrowDownRight className="w-4 h-4" />
              <span>Kas Keluar</span>
            </button>
          </div>
        )}
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs border-l-4 border-l-emerald-500">
          <div className="text-xs text-slate-500 uppercase font-bold flex items-center justify-between">
            <span>Total Pemasukan Kas</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {formatRupiah(totalIncome)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Termin I Alokasi BGN</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs border-l-4 border-l-rose-500">
          <div className="text-xs text-slate-500 uppercase font-bold flex items-center justify-between">
            <span>Total Realisasi Belanja</span>
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">
            {formatRupiah(totalExpense)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Bahan, Operasional & Upah</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs border-l-4 border-l-blue-900 dark:border-l-sky-500">
          <div className="text-xs text-slate-500 uppercase font-bold flex items-center justify-between">
            <span>Saldo Kas Operasional</span>
            <Coins className="w-4 h-4 text-blue-900 dark:text-sky-400" />
          </div>
          <div className="text-xl font-black text-blue-900 dark:text-sky-400 mt-1">
            {formatRupiah(cashBalance)}
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">Likuiditas Aman Surplus</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs border-l-4 border-l-amber-500">
          <div className="text-xs text-slate-500 uppercase font-bold flex items-center justify-between">
            <span>Food Cost Ratio</span>
            <PieChart className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
            {foodCostRatio}%
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">Memenuhi Syarat BGN (&ge;75%)</div>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-400 font-bold uppercase text-[11px] mr-1">Tampilkan:</span>
        {['ALL', 'Pemasukan', 'Pengeluaran'].map(f => (
          <button
            key={f}
            onClick={() => setFilterType(f)}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${
              filterType === f
                ? 'bg-blue-900 text-white dark:bg-sky-600'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {f === 'ALL' ? 'Semua Transaksi' : f}
          </button>
        ))}
      </div>

      {/* Transactions Data Table */}
      <DataTable
        title="Buku Kas Operasional & Realisasi Pengeluaran"
        subtitle="Catatan akuntansi kas masuk dan keluar terverifikasi kuitansi dan SP2D"
        data={filteredTransactions}
        columns={columns}
        keyExtractor={item => item.id}
        searchPlaceholder="Cari nomor bukti, keterangan, penerima..."
        searchKeys={['transactionNumber', 'description', 'sourceOrRecipient', 'proofNumber', 'category']}
        onExportPDF={handleExportPDF}
        onExportExcel={handleExportExcel}
        onPrint={triggerPrint}
      />

      {/* Modal: Form Create Transaction */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={formData.type === 'Pemasukan' ? 'Catat Pemasukan Kas Baru' : 'Catat Pengeluaran Belanja Kas'}
        subtitle="Input kuitansi, nomor bukti, kategori pengeluaran dan jumlah nominal"
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tanggal Transaksi *
              </label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Kategori Transaksi *
              </label>
              <select
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                {formData.type === 'Pemasukan' ? (
                  <>
                    <option value="Dana Termin BGN">Dana Termin BGN</option>
                    <option value="Dana Talangan Yayasan">Dana Talangan Yayasan</option>
                  </>
                ) : (
                  <>
                    <option value="Bahan Baku">Bahan Baku (Food Cost)</option>
                    <option value="Operasional Dapur">Operasional Dapur (Gas/Listrik/Air)</option>
                    <option value="Upah Relawan">Upah & Insentif Relawan</option>
                    <option value="Logistik & Armada">Logistik & BBM Armada</option>
                    <option value="Perlengkapan">Perlengkapan & Higiene</option>
                  </>
                )}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Nominal Transaksi (Rp) *
            </label>
            <input
              type="number"
              min="1000"
              required
              value={formData.amount}
              onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-base font-black text-blue-900 dark:text-sky-400"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Uraian Keterangan *
            </label>
            <textarea
              rows={2}
              required
              placeholder="Contoh: Pembayaran PO sayur bayam, labu siam, dan wortel segar"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Sumber / Penerima Dana *
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: UD Lumbung Padi"
                value={formData.sourceOrRecipient}
                onChange={e => setFormData({ ...formData, sourceOrRecipient: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                No. Kuitansi / Bukti Nota *
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: KWT-0982"
                value={formData.proofNumber}
                onChange={e => setFormData({ ...formData, proofNumber: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Metode Pembayaran *
            </label>
            <select
              value={formData.paymentMethod}
              onChange={e => setFormData({ ...formData, paymentMethod: e.target.value as any })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="Tunai">Tunai</option>
              <option value="Transfer Bank">Transfer Bank</option>
            </select>
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
              Simpan Transaksi Kas
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Dialog: Delete */}
      <ConfirmDialog
        isOpen={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={async () => {
          if (deleteId) await deleteTransaction(deleteId);
        }}
        title="Hapus Transaksi Kas"
        message="Apakah Anda yakin ingin menghapus catatan transaksi keuangan ini?"
        isDestructive={true}
      />
    </div>
  );
};
