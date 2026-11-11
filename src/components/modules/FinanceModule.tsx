import React, { useState, useMemo } from 'react';
import { useApp } from '../../lib/store';
import { DataTable, Column } from '../common/DataTable';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { PrintHeader } from '../common/PrintHeader';
import { exportTableToPDF, exportToExcel, formatRupiah, formatNumber, formatIndonesianDate, triggerPrint } from '../../lib/exportUtils';
import { FinancialTransaction, FinancialApprovalStatus, BankAccountType } from '../../types';
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
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Printer,
  FileSpreadsheet,
  FileText,
  Calendar,
  Building2,
  Camera,
  Eye,
  CreditCard,
  Lock,
  Search,
  Filter,
  Layers,
  FileCheck,
  ChevronLeft,
  ChevronRight,
  Download,
} from 'lucide-react';

type FinanceTab = 'bku' | 'lra' | 'reports' | 'approval';

export const FinanceModule: React.FC = () => {
  const {
    financialTransactions,
    addTransaction,
    deleteTransaction,
    approveTransaction,
    rejectTransaction,
    cancelTransaction,
    masterSuppliers,
    currentUser,
    hasPermission,
    sppgConfig,
  } = useApp();

  const [activeTab, setActiveTab] = useState<FinanceTab>('bku');

  // Filter & Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL'); // ALL | Pemasukan | Pengeluaran
  const [filterAccount, setFilterAccount] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterPeriodType, setFilterPeriodType] = useState<'daily' | 'monthly' | 'custom'>('monthly');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-11');
  const [startDate, setStartDate] = useState<string>('2026-11-01');
  const [endDate, setEndDate] = useState<string>('2026-11-30');

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createType, setCreateType] = useState<'Pemasukan' | 'Pengeluaran'>('Pengeluaran');
  const [viewPhotoUrl, setViewPhotoUrl] = useState<string | null>(null);
  const [cancelModalTx, setCancelModalTx] = useState<FinancialTransaction | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [rejectModalTx, setRejectModalTx] = useState<FinancialTransaction | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [deleteConfirmTx, setDeleteConfirmTx] = useState<FinancialTransaction | null>(null);

  // Pagination & Filtering for BKU Table
  const [bkuPage, setBkuPage] = useState(1);
  const [bkuItemsPerPage, setBkuItemsPerPage] = useState(15);
  const [filterBkuMonth, setFilterBkuMonth] = useState<string>('ALL');

  // Saldo Awal Konfigurasi (Bawaan Awal Periode Operasi November 2026)
  const initialCashBalance = 15000000; // Rp 15.000.000 saldo awal kas tunai & operasional

  // Form State for Kas Masuk / Kas Keluar
  const [formData, setFormData] = useState<{
    date: string;
    category: FinancialTransaction['category'];
    amount: number;
    description: string;
    sourceOrRecipient: string;
    supplierName: string;
    proofNumber: string;
    paymentMethod: 'Transfer Bank' | 'Tunai';
    bankAccount: BankAccountType;
    proofFileUrl: string;
    approvalStatus: FinancialApprovalStatus;
    notes: string;
  }>({
    date: new Date().toISOString().slice(0, 10),
    category: 'Bahan Baku',
    amount: 1500000,
    description: '',
    sourceOrRecipient: '',
    supplierName: '',
    proofNumber: '',
    paymentMethod: 'Transfer Bank',
    bankAccount: 'Bank BRI SPPG Yayasan Hafshawaty (0034-01-00291-53-1)',
    proofFileUrl: 'https://images.unsplash.com/photo-1554415707-9e4466b404c0?auto=format&fit=crop&w=500&q=80',
    approvalStatus: 'Menunggu Persetujuan',
    notes: '',
  });

  // Handle photo upload to base64
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, proofFileUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenCreate = (type: 'Pemasukan' | 'Pengeluaran') => {
    setCreateType(type);
    const autoNumber =
      type === 'Pemasukan'
        ? `BKM/SPPG-TMG2/2026/XI/${Math.floor(Math.random() * 800) + 100}`
        : `BKK/SPPG-TMG2/2026/XI/${Math.floor(Math.random() * 800) + 100}`;

    setFormData({
      date: new Date().toISOString().slice(0, 10),
      category: type === 'Pemasukan' ? 'Dana Termin BGN' : 'Bahan Baku',
      amount: type === 'Pemasukan' ? 50000000 : 2500000,
      description: type === 'Pemasukan' ? 'Pencairan Dana MBG Termin Berjalan' : 'Pembelian bahan makanan operasional dapur',
      sourceOrRecipient: type === 'Pemasukan' ? 'Badan Gizi Nasional / KPPN' : '',
      supplierName: '',
      proofNumber: autoNumber,
      paymentMethod: type === 'Pemasukan' ? 'Transfer Bank' : 'Tunai',
      bankAccount:
        type === 'Pemasukan'
          ? 'Bank BRI SPPG Yayasan Hafshawaty (0034-01-00291-53-1)'
          : 'Kas Tunai Dapur (Petty Cash)',
      proofFileUrl: 'https://images.unsplash.com/photo-1554415707-9e4466b404c0?auto=format&fit=crop&w=500&q=80',
      // Jika Kepala SPPG / Pengawas Keuangan langsung input, dapat langsung Disetujui
      approvalStatus:
        currentUser.role === 'Kepala SPPG' || currentUser.role === 'Pengawas Keuangan' || currentUser.role === 'Admin Utama'
          ? 'Disetujui'
          : 'Menunggu Persetujuan',
      notes: '',
    });
    setIsCreateModalOpen(true);
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const isApprovedImmediately = formData.approvalStatus === 'Disetujui';
    await addTransaction({
      transactionNumber: formData.proofNumber,
      date: formData.date,
      type: createType,
      category: formData.category,
      amount: Number(formData.amount),
      description: formData.description,
      sourceOrRecipient: formData.sourceOrRecipient || formData.supplierName || 'Pihak Terkait',
      supplierName: formData.supplierName || undefined,
      proofNumber: formData.proofNumber,
      recordedBy: currentUser.name,
      paymentMethod: formData.paymentMethod,
      bankAccount: formData.bankAccount,
      proofFileUrl: formData.proofFileUrl,
      approvalStatus: formData.approvalStatus,
      approvedBy: isApprovedImmediately ? currentUser.name : undefined,
      approvedAt: isApprovedImmediately ? new Date().toLocaleString('id-ID') : undefined,
      notes: formData.notes,
    });
    setIsCreateModalOpen(false);
  };

  // Submit Official Cancellation
  const handleConfirmCancel = async () => {
    if (!cancelModalTx) return;
    if (!cancelReason.trim()) {
      alert('Alasan pembatalan wajib diisi untuk jejak audit.');
      return;
    }
    await cancelTransaction(cancelModalTx.id, cancelReason, currentUser.name);
    setCancelModalTx(null);
    setCancelReason('');
  };

  // Submit Rejection
  const handleConfirmReject = async () => {
    if (!rejectModalTx) return;
    await rejectTransaction(rejectModalTx.id, rejectReason || 'Tidak memenuhi kelengkapan bukti SPK/kuitansi.');
    setRejectModalTx(null);
    setRejectReason('');
  };

  // Submit Deletion via ConfirmDialog
  const handleConfirmDelete = async () => {
    if (!deleteConfirmTx) return;
    await deleteTransaction(deleteConfirmTx.id);
    setDeleteConfirmTx(null);
  };

  // -------------------------------------------------------------
  // PERHITUNGAN SALDO & FORMULA KAS
  // Saldo akhir = Saldo awal + Total pemasukan - Total pengeluaran
  // Hanya transaksi yang 'Disetujui' mempengaruhi saldo resmi pembukuan
  // -------------------------------------------------------------
  const approvedTransactions = useMemo(() => {
    return financialTransactions.filter(t => t.approvalStatus === 'Disetujui');
  }, [financialTransactions]);

  const totalIncomeApproved = useMemo(() => {
    return approvedTransactions
      .filter(t => t.type === 'Pemasukan')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [approvedTransactions]);

  const totalExpenseApproved = useMemo(() => {
    return approvedTransactions
      .filter(t => t.type === 'Pengeluaran')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [approvedTransactions]);

  // Saldo Akhir Resmi
  const finalCashBalance = initialCashBalance + totalIncomeApproved - totalExpenseApproved;

  // Breakdown Saldo per Rekening
  const balancePerAccount = useMemo(() => {
    const accounts: Record<BankAccountType, { income: number; expense: number; balance: number }> = {
      'Bank BRI SPPG Yayasan Hafshawaty (0034-01-00291-53-1)': { income: 0, expense: 0, balance: 0 },
      'Bank Jatim Cab. Kraksaan (0132-99-8812)': { income: 0, expense: 0, balance: 0 },
      'Kas Tunai Dapur (Petty Cash)': { income: initialCashBalance, expense: 0, balance: initialCashBalance },
      'Kas Operasional Lapangan': { income: 0, expense: 0, balance: 0 },
    };

    approvedTransactions.forEach(t => {
      const acc = t.bankAccount;
      if (accounts[acc]) {
        if (t.type === 'Pemasukan') {
          accounts[acc].income += t.amount;
          accounts[acc].balance += t.amount;
        } else {
          accounts[acc].expense += t.amount;
          accounts[acc].balance -= t.amount;
        }
      }
    });

    return accounts;
  }, [approvedTransactions, initialCashBalance]);

  // -------------------------------------------------------------
  // BUKU KAS UMUM (BKU) KRONOLOGIS DENGAN RUNNING BALANCE
  // -------------------------------------------------------------
  const chronologicalBKU = useMemo(() => {
    // Sort ascending by date & transactionNumber
    const sorted = [...financialTransactions].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.transactionNumber.localeCompare(b.transactionNumber);
    });

    let running = initialCashBalance;
    return sorted.map(t => {
      let debit = 0;
      let credit = 0;
      if (t.approvalStatus === 'Disetujui') {
        if (t.type === 'Pemasukan') {
          debit = t.amount;
          running += t.amount;
        } else {
          credit = t.amount;
          running -= t.amount;
        }
      }
      return {
        ...t,
        debit,
        credit,
        runningBalance: running,
      };
    });
  }, [financialTransactions, initialCashBalance]);

  // Filtered BKU for UI search & tab filters
  const filteredBKU = useMemo(() => {
    return chronologicalBKU.filter(t => {
      // Search
      const matchSearch =
        t.transactionNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.sourceOrRecipient.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.supplierName && t.supplierName.toLowerCase().includes(searchTerm.toLowerCase()));

      // Filter Type
      const matchType = filterType === 'ALL' || t.type === filterType;

      // Filter Account
      const matchAccount = filterAccount === 'ALL' || t.bankAccount === filterAccount;

      // Filter Status
      const matchStatus = filterStatus === 'ALL' || t.approvalStatus === filterStatus;

      // Filter Month
      const matchMonth = filterBkuMonth === 'ALL' || t.date.startsWith(filterBkuMonth);

      return matchSearch && matchType && matchAccount && matchStatus && matchMonth;
    });
  }, [chronologicalBKU, searchTerm, filterType, filterAccount, filterStatus, filterBkuMonth]);

  // Paginated BKU for responsive performance & clean ERP UI
  const paginatedBKU = useMemo(() => {
    const startIndex = (bkuPage - 1) * bkuItemsPerPage;
    return filteredBKU.slice(startIndex, startIndex + bkuItemsPerPage);
  }, [filteredBKU, bkuPage, bkuItemsPerPage]);

  const totalBkuPages = Math.ceil(filteredBKU.length / bkuItemsPerPage) || 1;

  // -------------------------------------------------------------
  // LAPORAN REALISASI ANGGARAN (LRA) VS PAGU MBG
  // -------------------------------------------------------------
  const totalTerminBudget = useMemo(() => {
    return totalIncomeApproved > 0 ? totalIncomeApproved : 384750000;
  }, [totalIncomeApproved]);

  const lraData = useMemo(() => {
    // Alokasi proporsional: 75% Bahan Pangan, 10% Operasional Dapur & Utilitas, 10% Upah Relawan, 4% Logistik, 1% Perlengkapan & Higiene
    const budgetCategories = [
      {
        category: 'Bahan Baku' as const,
        matchCategories: ['Bahan Baku'],
        label: '1. Belanja Bahan Pangan MBG (Daging, Beras, Sayur, Buah)',
        budget: Math.round(totalTerminBudget * 0.75),
      },
      {
        category: 'Operasional Dapur' as const,
        matchCategories: ['Operasional Dapur', 'Utilitas Listrik/Gas/Air'],
        label: '2. Operasional Dapur & Utilitas (LPG, Listrik, Air, Sanitasi)',
        budget: Math.round(totalTerminBudget * 0.10),
      },
      {
        category: 'Upah Relawan' as const,
        matchCategories: ['Upah Relawan'],
        label: '3. Insentif & Upah Harian Relawan 5 Divisi Dapur',
        budget: Math.round(totalTerminBudget * 0.10),
      },
      {
        category: 'Logistik & Armada' as const,
        matchCategories: ['Logistik & Armada'],
        label: '4. Distribusi, BBM Armada & Perawatan Box Isothermal',
        budget: Math.round(totalTerminBudget * 0.04),
      },
      {
        category: 'Perlengkapan' as const,
        matchCategories: ['Perlengkapan', 'Higiene & Sanitasi'],
        label: '5. Perlengkapan Kemasan, Ompreng & Higiene APD',
        budget: Math.round(totalTerminBudget * 0.01),
      },
    ];

    return budgetCategories.map(b => {
      const actualExpense = approvedTransactions
        .filter(t => t.type === 'Pengeluaran' && b.matchCategories.includes(t.category as any))
        .reduce((sum, t) => sum + t.amount, 0);

      const remainingBudget = b.budget - actualExpense;
      const absorptionPct = b.budget > 0 ? (actualExpense / b.budget) * 100 : 0;

      return {
        ...b,
        actualExpense,
        remainingBudget,
        absorptionPct,
      };
    });
  }, [approvedTransactions, totalTerminBudget]);

  // -------------------------------------------------------------
  // LAPORAN PERIODE FILTERED (HARIAN / BULANAN / KUSTOM)
  // -------------------------------------------------------------
  const periodicReportTransactions = useMemo(() => {
    return approvedTransactions.filter(t => {
      if (filterPeriodType === 'daily') {
        return t.date === selectedDate;
      }
      if (filterPeriodType === 'monthly') {
        return t.date.startsWith(selectedMonth);
      }
      if (filterPeriodType === 'custom') {
        return t.date >= startDate && t.date <= endDate;
      }
      return true;
    });
  }, [approvedTransactions, filterPeriodType, selectedDate, selectedMonth, startDate, endDate]);

  const periodicIncome = periodicReportTransactions
    .filter(t => t.type === 'Pemasukan')
    .reduce((sum, t) => sum + t.amount, 0);

  const periodicExpense = periodicReportTransactions
    .filter(t => t.type === 'Pengeluaran')
    .reduce((sum, t) => sum + t.amount, 0);

  const periodicNet = periodicIncome - periodicExpense;

  // Pending approval list
  const pendingTransactions = useMemo(() => {
    return financialTransactions.filter(t => t.approvalStatus === 'Menunggu Persetujuan');
  }, [financialTransactions]);

  // Export handlers
  const handleExportPDF = () => {
    exportTableToPDF({
      title: 'BUKU KAS UMUM (BKU) DAN LAPORAN ARUS KAS MBG',
      subtitle: `${sppgConfig.foundationName} - ${sppgConfig.sppgName} (ID: ${sppgConfig.sppgId})`,
      headers: ['No. Bukti', 'Tanggal', 'Uraian Transaksi', 'Rekening', 'Debet (Masuk)', 'Kredit (Keluar)', 'Status'],
      rows: filteredBKU.map(t => [
        t.transactionNumber,
        t.date,
        `${t.description} (${t.sourceOrRecipient})`,
        t.bankAccount.split(' (')[0],
        t.debit > 0 ? formatRupiah(t.debit) : '-',
        t.credit > 0 ? formatRupiah(t.credit) : '-',
        t.approvalStatus,
      ]),
      fileName: `BKU_Keuangan_SPPG_TMG2_${new Date().toISOString().slice(0, 10)}`,
      sppgConfig,
      signerName: sppgConfig.financeOfficer,
      signerRole: 'Pengawas Keuangan SPPG',
    });
  };

  const handleExportExcel = () => {
    const dataToExport = filteredBKU.map(t => ({
      'No. Bukti Transaksi': t.transactionNumber,
      'Tanggal': t.date,
      'Arus Kas': t.type,
      'Kategori': t.category,
      'Uraian Transaksi': t.description,
      'Pihak Terkait / Rekanan': t.sourceOrRecipient,
      'Rekening Pembukuan': t.bankAccount,
      'Debet (Rp)': t.debit,
      'Kredit (Rp)': t.credit,
      'Saldo Berjalan (Rp)': t.runningBalance,
      'Status Persetujuan': t.approvalStatus,
      'Disetujui Oleh': t.approvedBy || '-',
      'Tanggal Persetujuan': t.approvedAt || '-',
      'Alasan Batal (Jika ada)': t.cancellationReason || '-',
    }));
    exportToExcel(dataToExport, `BKU_Keuangan_SPPG_TMG2_${new Date().toISOString().slice(0, 10)}`, 'Buku Kas Umum');
  };

  const handleExportLRAExcel = () => {
    const rows = lraData.map((item, idx) => ({
      'No': idx + 1,
      'Komponen Belanja': item.label,
      'Pagu Alokasi MBG (Rp)': item.budget,
      'Realisasi Belanja (Rp)': item.actualExpense,
      'Sisa Anggaran (Rp)': item.remainingBudget,
      'Persentase Realisasi (%)': Number(item.absorptionPct.toFixed(2)),
      'Status': item.absorptionPct > 90 ? 'Kritis' : item.absorptionPct > 60 ? 'Mendekati Batas' : 'Aman',
    }));
    exportToExcel(rows, `LRA_Pagu_MBG_SPPG_TMG2_${new Date().toISOString().slice(0, 10)}`, 'LRA Pagu MBG');
  };

  const handleExportPeriodicExcel = () => {
    const rows = periodicReportTransactions.map((t, idx) => ({
      'No': idx + 1,
      'No. Bukti': t.transactionNumber,
      'Tanggal': t.date,
      'Jenis': t.type,
      'Kategori': t.category,
      'Uraian': t.description,
      'Pihak Terkait': t.sourceOrRecipient,
      'Nominal (Rp)': t.amount,
      'Rekening': t.bankAccount,
      'Metode': t.paymentMethod,
      'Status': t.approvalStatus,
      'Disetujui Oleh': t.approvedBy || '-',
    }));
    exportToExcel(rows, `Laporan_Kas_${filterPeriodType}_SPPG_TMG2_${new Date().toISOString().slice(0, 10)}`, 'Laporan Kas');
  };

  return (
    <div className="space-y-6">
      {/* Print-only Header */}
      <PrintHeader
        title="BUKU KAS UMUM & LAPORAN REALISASI ANGGARAN KEUANGAN MBG"
        subtitle="Satuan Pelayanan Pemenuhan Gizi Probolinggo Krejengan Temenggungan 2"
        docNumber="BKU-FIN/SPPG-TMG2/2026/XI/001"
      />

      {/* Main Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Wallet className="w-6 h-6 text-blue-900 dark:text-sky-400" />
            Modul Administrasi Keuangan MBG
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Pengelolaan Kas Masuk, Kas Keluar, Buku Kas Umum (BKU), dan Laporan Realisasi Anggaran (LRA)
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => handleOpenCreate('Pemasukan')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
          >
            <ArrowDownRight className="w-4 h-4" />
            <span>+ Kas Masuk (BKM)</span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenCreate('Pengeluaran')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>- Kas Keluar (BKK)</span>
          </button>
          <button
            type="button"
            onClick={triggerPrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition"
            title="Cetak Buku Kas"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Cetak</span>
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold transition border border-emerald-200 dark:border-emerald-800"
            title="Ekspor Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">Excel</span>
          </button>
          <button
            type="button"
            onClick={handleExportPDF}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 text-blue-900 dark:text-sky-400 rounded-xl text-xs font-bold transition border border-blue-200 dark:border-blue-800"
            title="Ekspor PDF"
          >
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">PDF</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* KARTU STATISTIK: REKAP SALDO KAS & RUMUS SALDO AKHIR      */}
      {/* Saldo akhir = Saldo awal + Total pemasukan - Total keluar */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Saldo Awal */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
            <span>Saldo Awal Kas</span>
            <Coins className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
            {formatRupiah(initialCashBalance)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Saldo pembawa awal periode berjalan</p>
        </div>

        {/* Total Kas Masuk */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-1">
            <span>Total Pemasukan (Debet)</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-600">
            {formatRupiah(totalIncomeApproved)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Dana Termin BGN & alokasi disetujui</p>
        </div>

        {/* Total Kas Keluar */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between text-xs font-bold text-rose-700 dark:text-rose-400 mb-1">
            <span>Total Pengeluaran (Kredit)</span>
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black font-mono text-rose-600">
            {formatRupiah(totalExpenseApproved)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Belanja bahan, operasional, & upah</p>
        </div>

        {/* Saldo Akhir */}
        <div className="bg-gradient-to-br from-blue-900 to-indigo-950 text-white p-5 rounded-2xl shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-sky-200 mb-1">
              <span>Saldo Akhir Kas</span>
              <Wallet className="w-4 h-4 text-sky-300" />
            </div>
            <div className="text-2xl font-black font-mono text-white">
              {formatRupiah(finalCashBalance)}
            </div>
          </div>
          <p className="text-[10px] text-sky-200 mt-2 font-mono">
            Rumus: Saldo Awal + Masuk - Keluar
          </p>
        </div>
      </div>

      {/* Rincian Saldo per Rekening Bank & Kas Tunai */}
      <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-blue-900 dark:text-sky-400" />
            Rekap Saldo Riil per Rekening Bank & Kas Tunai
          </span>
          <span className="text-[11px] text-slate-500 font-mono">
            Sinkronisasi Otomatis Buku Kas
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Object.entries(balancePerAccount).map(([accName, val], idx) => (
            <div key={idx} className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block truncate" title={accName}>
                {accName.split(' (')[0]}
              </span>
              <div className="text-lg font-black font-mono text-slate-900 dark:text-white mt-1">
                {formatRupiah(val.balance)}
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                <span className="text-emerald-600">Masuk: {formatNumber(val.income)}</span>
                <span className="text-rose-600">Keluar: {formatNumber(val.expense)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('bku')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold transition whitespace-nowrap border-b-2 ${
            activeTab === 'bku'
              ? 'border-blue-900 text-blue-900 dark:border-sky-400 dark:text-sky-400 bg-blue-50/50 dark:bg-sky-950/20'
              : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Buku Kas Umum (BKU)</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 dark:bg-slate-800">
            {financialTransactions.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('lra')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold transition whitespace-nowrap border-b-2 ${
            activeTab === 'lra'
              ? 'border-blue-900 text-blue-900 dark:border-sky-400 dark:text-sky-400 bg-blue-50/50 dark:bg-sky-950/20'
              : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <PieChart className="w-4 h-4" />
          <span>Laporan Realisasi Anggaran (LRA)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold transition whitespace-nowrap border-b-2 ${
            activeTab === 'reports'
              ? 'border-blue-900 text-blue-900 dark:border-sky-400 dark:text-sky-400 bg-blue-50/50 dark:bg-sky-950/20'
              : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Laporan Harian, Bulanan & Periode</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('approval')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold transition whitespace-nowrap border-b-2 ${
            activeTab === 'approval'
              ? 'border-blue-900 text-blue-900 dark:border-sky-400 dark:text-sky-400 bg-blue-50/50 dark:bg-sky-950/20'
              : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>Otorisasi & Persetujuan Kas</span>
          {pendingTransactions.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500 text-white font-bold animate-pulse">
              {pendingTransactions.length}
            </span>
          )}
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: BUKU KAS UMUM (BKU) KRONOLOGIS                    */}
      {/* ========================================================= */}
      {activeTab === 'bku' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => {
                  setSearchTerm(e.target.value);
                  setBkuPage(1);
                }}
                placeholder="Cari no. bukti, uraian, rekanan..."
                className="w-full pl-9 pr-3 py-1.5 text-xs border rounded-lg dark:bg-slate-800 dark:border-slate-700 focus:outline-hidden focus:ring-1 focus:ring-blue-900"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
              <select
                value={filterBkuMonth}
                onChange={e => {
                  setFilterBkuMonth(e.target.value);
                  setBkuPage(1);
                }}
                className="px-2.5 py-1.5 text-xs border rounded-lg dark:bg-slate-800 dark:border-slate-700 font-mono"
              >
                <option value="ALL">Semua Bulan</option>
                <option value="2026-11">November 2026</option>
                <option value="2026-10">Oktober 2026</option>
                <option value="2026-09">September 2026</option>
              </select>

              <select
                value={filterType}
                onChange={e => {
                  setFilterType(e.target.value);
                  setBkuPage(1);
                }}
                className="px-2.5 py-1.5 text-xs border rounded-lg dark:bg-slate-800 dark:border-slate-700"
              >
                <option value="ALL">Semua Arus Kas</option>
                <option value="Pemasukan">Pemasukan (Debet)</option>
                <option value="Pengeluaran">Pengeluaran (Kredit)</option>
              </select>

              <select
                value={filterAccount}
                onChange={e => {
                  setFilterAccount(e.target.value);
                  setBkuPage(1);
                }}
                className="px-2.5 py-1.5 text-xs border rounded-lg dark:bg-slate-800 dark:border-slate-700 max-w-xs truncate"
              >
                <option value="ALL">Semua Rekening</option>
                <option value="Bank BRI SPPG Yayasan Hafshawaty (0034-01-00291-53-1)">Bank BRI Giro SPPG</option>
                <option value="Bank Jatim Cab. Kraksaan (0132-99-8812)">Bank Jatim Kraksaan</option>
                <option value="Kas Tunai Dapur (Petty Cash)">Kas Tunai Dapur</option>
                <option value="Kas Operasional Lapangan">Kas Operasional Lapangan</option>
              </select>

              <select
                value={filterStatus}
                onChange={e => {
                  setFilterStatus(e.target.value);
                  setBkuPage(1);
                }}
                className="px-2.5 py-1.5 text-xs border rounded-lg dark:bg-slate-800 dark:border-slate-700"
              >
                <option value="ALL">Semua Status</option>
                <option value="Disetujui">Disetujui</option>
                <option value="Menunggu Persetujuan">Menunggu Persetujuan</option>
                <option value="Ditolak">Ditolak</option>
                <option value="Dibatalkan">Dibatalkan</option>
              </select>
            </div>
          </div>

          {/* BKU Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto max-h-[calc(100vh-24rem)] scrollbar-thin">
              <table className="w-full text-xs text-left text-slate-600 dark:text-slate-300 tabular-nums">
                <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700 shadow-2xs">
                  <tr>
                    <th className="py-3 px-4">No. Bukti & Tgl</th>
                    <th className="py-3 px-4">Uraian Transaksi & Rekanan</th>
                    <th className="py-3 px-4">Rekening Pembukuan</th>
                    <th className="py-3 px-4 text-right">Debet (Masuk)</th>
                    <th className="py-3 px-4 text-right">Kredit (Keluar)</th>
                    <th className="py-3 px-4 text-right">Saldo Berjalan</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Aksi / Opsi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {paginatedBKU.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 font-sans">
                        Tidak ada transaksi kas yang sesuai dengan filter pencarian.
                      </td>
                    </tr>
                  ) : (
                    paginatedBKU.map(t => {
                      const isApproved = t.approvalStatus === 'Disetujui';
                      const isCancelled = t.approvalStatus === 'Dibatalkan';
                      const isPending = t.approvalStatus === 'Menunggu Persetujuan';

                      return (
                        <tr
                          key={t.id}
                          className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition ${
                            isCancelled ? 'opacity-50 line-through bg-slate-50/40' : ''
                          }`}
                        >
                          {/* No. Bukti & Tanggal */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="font-bold text-slate-900 dark:text-white">{t.transactionNumber}</div>
                            <div className="text-[11px] text-slate-400 font-sans">{t.date}</div>
                          </td>

                          {/* Uraian & Rekanan */}
                          <td className="py-3 px-4 font-sans max-w-xs">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">{t.description}</div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <span>Rekanan/Sumber:</span>
                              <strong className="text-slate-700 dark:text-slate-300">{t.sourceOrRecipient}</strong>
                              {t.category && <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 font-mono">{t.category}</span>}
                            </div>
                            {t.cancellationReason && (
                              <div className="text-[10px] text-rose-600 font-sans mt-0.5">
                                Dibatalkan: {t.cancellationReason} ({t.cancelledBy})
                              </div>
                            )}
                          </td>

                          {/* Rekening */}
                          <td className="py-3 px-4 font-sans whitespace-nowrap text-slate-700 dark:text-slate-300">
                            <div>{t.bankAccount.split(' (')[0]}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{t.paymentMethod}</div>
                          </td>

                          {/* Debet */}
                          <td className="py-3 px-4 text-right font-bold text-emerald-600">
                            {t.debit > 0 ? formatRupiah(t.debit) : '-'}
                          </td>

                          {/* Kredit */}
                          <td className="py-3 px-4 text-right font-bold text-rose-600">
                            {t.credit > 0 ? formatRupiah(t.credit) : '-'}
                          </td>

                          {/* Saldo Berjalan */}
                          <td className="py-3 px-4 text-right font-bold text-blue-900 dark:text-sky-400">
                            {isCancelled ? '-' : formatRupiah(t.runningBalance)}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4 text-center font-sans whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isApproved
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : isPending
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                  : isCancelled
                                  ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              }`}
                            >
                              {t.approvalStatus}
                            </span>
                          </td>

                          {/* Aksi & Jejak Audit */}
                          <td className="py-3 px-4 font-sans text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Tombol Lihat Bukti */}
                              {t.proofFileUrl && (
                                <button
                                  type="button"
                                  onClick={() => setViewPhotoUrl(t.proofFileUrl || null)}
                                  className="p-1 text-blue-900 dark:text-sky-400 hover:bg-blue-50 dark:hover:bg-slate-800 rounded transition"
                                  title="Lihat Bukti Foto/Kwitansi"
                                >
                                  <Camera className="w-4 h-4" />
                                </button>
                              )}

                              {/* Approval Controls */}
                              {isPending && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => approveTransaction(t.id, currentUser.name)}
                                    className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 rounded transition"
                                    title="Setujui Transaksi"
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setRejectModalTx(t)}
                                    className="p-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 rounded transition"
                                    title="Tolak Pengajuan"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                </>
                              )}

                              {/* ATURAN TEGAS: Transaksi Disetujui TIDAK BOLEH DIHAPUS, hanya bisa DIBATALKAN dengan jejak audit */}
                              {isApproved && (
                                <button
                                  type="button"
                                  onClick={() => setCancelModalTx(t)}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 transition"
                                  title="Batalkan Transaksi Disetujui (Wajib Alasan Audit)"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>Batalkan</span>
                                </button>
                              )}

                              {/* Tombol Hapus (hanya untuk Draft atau Ditolak dengan konfirmasi dialog aman) */}
                              {!isApproved && !isCancelled && (
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmTx(t)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                                  title="Hapus Transaksi Kas"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/40">
              <div className="flex items-center gap-3">
                <span className="tabular-nums">
                  Menampilkan {filteredBKU.length === 0 ? 0 : (bkuPage - 1) * bkuItemsPerPage + 1} -{' '}
                  {Math.min(bkuPage * bkuItemsPerPage, filteredBKU.length)} dari {filteredBKU.length} entri BKU
                </span>
                <div className="flex items-center gap-1.5">
                  <span>Baris:</span>
                  <select
                    value={bkuItemsPerPage}
                    onChange={e => {
                      setBkuItemsPerPage(Number(e.target.value));
                      setBkuPage(1);
                    }}
                    className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md py-1 px-2 text-slate-800 dark:text-slate-200 focus:outline-hidden"
                  >
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={bkuPage <= 1}
                  onClick={() => setBkuPage(p => Math.max(1, p - 1))}
                  className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  title="Halaman Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-1 font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                  Halaman {bkuPage} dari {totalBkuPages}
                </span>
                <button
                  type="button"
                  disabled={bkuPage >= totalBkuPages}
                  onClick={() => setBkuPage(p => Math.min(totalBkuPages, p + 1))}
                  className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  title="Halaman Berikutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: LAPORAN REALISASI ANGGARAN (LRA)                  */}
      {/* ========================================================= */}
      {activeTab === 'lra' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-blue-900 dark:text-sky-400" />
                  Laporan Realisasi Anggaran (LRA) Pagu Termin I MBG BGN
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Evaluasi Penyerapan Dana Alokasi vs Realisasi Belanja Aktual Satuan Pelayanan Pemenuhan Gizi
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  Pagu Termin: {formatRupiah(totalTerminBudget)}
                </span>
                <button
                  type="button"
                  onClick={handleExportLRAExcel}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-bold transition border border-emerald-200 dark:border-emerald-800"
                  title="Ekspor LRA ke Excel"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Ekspor LRA</span>
                </button>
              </div>
            </div>

            {/* Cards Progress Bar Per Kategori */}
            <div className="space-y-4">
              {lraData.map((item, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                    <span className="font-bold text-slate-900 dark:text-white">{item.label}</span>
                    <span className="font-mono text-slate-600 dark:text-slate-300 tabular-nums">
                      Realisasi: <strong>{formatRupiah(item.actualExpense)}</strong> / Pagu: {formatRupiah(item.budget)}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        item.absorptionPct > 90
                          ? 'bg-rose-500'
                          : item.absorptionPct > 60
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(item.absorptionPct, 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono tabular-nums">
                    <span>Sisa Pagu: <strong className="text-slate-700 dark:text-slate-200">{formatRupiah(item.remainingBudget)}</strong></span>
                    <span className="font-bold text-blue-900 dark:text-sky-400">{item.absorptionPct.toFixed(1)}% Terserap</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Formal LRA Table with Summary Row */}
            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
                Tabel Komparasi Penyerapan Anggaran (LRA Resmi)
              </h4>
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-xs text-left tabular-nums">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      <th className="py-2.5 px-3">Komponen Anggaran</th>
                      <th className="py-2.5 px-3 text-right">Pagu Termin I (Rp)</th>
                      <th className="py-2.5 px-3 text-right">Realisasi Belanja (Rp)</th>
                      <th className="py-2.5 px-3 text-right">Sisa Pagu (Rp)</th>
                      <th className="py-2.5 px-3 text-center">Terserap</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                    {lraData.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2 px-3 text-center text-slate-400">{idx + 1}</td>
                        <td className="py-2 px-3 font-sans font-semibold text-slate-800 dark:text-slate-200">{item.label}</td>
                        <td className="py-2 px-3 text-right font-medium">{formatRupiah(item.budget)}</td>
                        <td className="py-2 px-3 text-right font-bold text-rose-600">{formatRupiah(item.actualExpense)}</td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-600">{formatRupiah(item.remainingBudget)}</td>
                        <td className="py-2 px-3 text-center font-bold text-blue-900 dark:text-sky-400">{item.absorptionPct.toFixed(1)}%</td>
                        <td className="py-2 px-3 text-center font-sans">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.absorptionPct > 90
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                : item.absorptionPct > 60
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            }`}
                          >
                            {item.absorptionPct > 90 ? 'Mendekati Pagu' : item.absorptionPct > 60 ? 'Optimal' : 'Tersedia'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {/* TOTAL ROW */}
                    <tr className="bg-slate-100/80 dark:bg-slate-800/80 font-bold border-t-2 border-slate-300 dark:border-slate-600">
                      <td colSpan={2} className="py-3 px-3 font-sans text-slate-900 dark:text-white uppercase">
                        TOTAL KESELURUHAN TERMIN I
                      </td>
                      <td className="py-3 px-3 text-right text-slate-900 dark:text-white">
                        {formatRupiah(totalTerminBudget)}
                      </td>
                      <td className="py-3 px-3 text-right text-rose-600">
                        {formatRupiah(totalExpenseApproved)}
                      </td>
                      <td className="py-3 px-3 text-right text-emerald-600">
                        {formatRupiah(totalTerminBudget - totalExpenseApproved)}
                      </td>
                      <td className="py-3 px-3 text-center text-blue-900 dark:text-sky-400">
                        {totalTerminBudget > 0 ? ((totalExpenseApproved / totalTerminBudget) * 100).toFixed(1) : 0}%
                      </td>
                      <td className="py-3 px-3 text-center font-sans">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-sky-300">
                          Terkendali
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: LAPORAN PERIODIK (HARIAN / BULANAN / KUSTOM)       */}
      {/* ========================================================= */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-900 dark:text-sky-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Pilihan Periode Pelaporan Keuangan
                </h3>
              </div>

              {/* Toggle Harian / Bulanan / Kustom */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setFilterPeriodType('daily')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    filterPeriodType === 'daily'
                      ? 'bg-white dark:bg-slate-900 text-blue-900 dark:text-sky-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Laporan Harian
                </button>
                <button
                  type="button"
                  onClick={() => setFilterPeriodType('monthly')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    filterPeriodType === 'monthly'
                      ? 'bg-white dark:bg-slate-900 text-blue-900 dark:text-sky-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Laporan Bulanan
                </button>
                <button
                  type="button"
                  onClick={() => setFilterPeriodType('custom')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    filterPeriodType === 'custom'
                      ? 'bg-white dark:bg-slate-900 text-blue-900 dark:text-sky-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Rentang Tanggal (Kustom)
                </button>
              </div>
            </div>

            {/* Inputs based on period type */}
            <div className="flex items-center gap-4 flex-wrap text-xs">
              {filterPeriodType === 'daily' && (
                <div>
                  <label className="block text-slate-500 mb-1 font-bold">Pilih Tanggal Laporan Harian:</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    className="px-3 py-1.5 border rounded-lg dark:bg-slate-800"
                  />
                </div>
              )}

              {filterPeriodType === 'monthly' && (
                <div>
                  <label className="block text-slate-500 mb-1 font-bold">Pilih Bulan & Tahun:</label>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={e => setSelectedMonth(e.target.value)}
                    className="px-3 py-1.5 border rounded-lg dark:bg-slate-800 font-mono"
                  />
                </div>
              )}

              {filterPeriodType === 'custom' && (
                <div className="flex items-center gap-3">
                  <div>
                    <label className="block text-slate-500 mb-1 font-bold">Tanggal Mulai:</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="px-3 py-1.5 border rounded-lg dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1 font-bold">Tanggal Akhir:</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      className="px-3 py-1.5 border rounded-lg dark:bg-slate-800"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Periodic Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 rounded-xl border bg-slate-50 dark:bg-slate-800/40">
                <span className="text-xs text-slate-500 block">Pemasukan Periode Ini</span>
                <span className="text-lg font-black font-mono text-emerald-600 mt-1 block">
                  {formatRupiah(periodicIncome)}
                </span>
              </div>
              <div className="p-3.5 rounded-xl border bg-slate-50 dark:bg-slate-800/40">
                <span className="text-xs text-slate-500 block">Pengeluaran Periode Ini</span>
                <span className="text-lg font-black font-mono text-rose-600 mt-1 block">
                  {formatRupiah(periodicExpense)}
                </span>
              </div>
              <div className="p-3.5 rounded-xl border bg-slate-50 dark:bg-slate-800/40">
                <span className="text-xs text-slate-500 block">Arus Kas Bersih (Net Cash Flow)</span>
                <span className={`text-lg font-black font-mono mt-1 block ${periodicNet >= 0 ? 'text-blue-900 dark:text-sky-400' : 'text-rose-600'}`}>
                  {formatRupiah(periodicNet)}
                </span>
              </div>
            </div>
          </div>

          {/* Table of periodic transactions */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="font-bold text-sm text-slate-900 dark:text-white">
                Rincian Transaksi Periode ({periodicReportTransactions.length} Transaksi Terverifikasi)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportPeriodicExcel}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-bold transition border border-emerald-200 dark:border-emerald-800"
                  title="Ekspor Laporan Periode ke Excel"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Ekspor Excel</span>
                </button>
                <button
                  type="button"
                  onClick={triggerPrint}
                  className="text-xs font-bold text-blue-900 dark:text-sky-400 hover:underline flex items-center gap-1 px-2 py-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Laporan</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[calc(100vh-26rem)] scrollbar-thin">
              <table className="w-full text-xs text-left text-slate-600 dark:text-slate-300 tabular-nums">
                <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700 shadow-2xs">
                  <tr>
                    <th className="py-2.5 px-4">No. Bukti</th>
                    <th className="py-2.5 px-4">Tanggal</th>
                    <th className="py-2.5 px-4">Jenis</th>
                    <th className="py-2.5 px-4">Kategori</th>
                    <th className="py-2.5 px-4">Uraian</th>
                    <th className="py-2.5 px-4">Rekanan / Pihak</th>
                    <th className="py-2.5 px-4 text-right">Nominal (Rp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {periodicReportTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400 font-sans">
                        Tidak ada transaksi kas terverifikasi pada periode yang dipilih.
                      </td>
                    </tr>
                  ) : (
                    periodicReportTransactions.map(t => (
                      <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">{t.transactionNumber}</td>
                        <td className="py-2.5 px-4 font-sans">{t.date}</td>
                        <td className="py-2.5 px-4 font-sans">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${t.type === 'Pemasukan' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                            {t.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-sans">{t.category}</td>
                        <td className="py-2.5 px-4 font-sans max-w-xs truncate" title={t.description}>{t.description}</td>
                        <td className="py-2.5 px-4 font-sans">{t.sourceOrRecipient}</td>
                        <td className={`py-2.5 px-4 text-right font-bold ${t.type === 'Pemasukan' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {formatRupiah(t.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: OTORISASI & PERSETUJUAN KAS                        */}
      {/* ========================================================= */}
      {activeTab === 'approval' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-blue-900 dark:text-sky-400" />
                Antrean Otorisasi Transaksi Kas Menunggu Persetujuan
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Verifikasi tanda tangan digital & persetujuan keuangan oleh Kepala SPPG atau Pengawas Keuangan sebelum mempengaruhi saldo kas.
              </p>
            </div>

            {pendingTransactions.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="font-bold text-slate-700 dark:text-slate-300">Seluruh Transaksi Kas Telah Diproses</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Tidak ada antrean pengajuan kas yang menunggu persetujuan saat ini.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800 border rounded-xl overflow-hidden">
                {pendingTransactions.map(p => (
                  <div key={p.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white font-mono text-sm">{p.transactionNumber}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.type === 'Pemasukan' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                            {p.type}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">Tgl: {p.date}</span>
                        </div>
                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {p.description}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-3">
                          <span>Rekanan: <strong>{p.sourceOrRecipient}</strong></span>
                          <span>•</span>
                          <span>Rekening: <strong>{p.bankAccount.split(' (')[0]}</strong></span>
                          <span>•</span>
                          <span>Diajukan: {p.recordedBy}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className={`text-base font-black font-mono ${p.type === 'Pemasukan' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {formatRupiah(p.amount)}
                          </div>
                          {p.proofFileUrl && (
                            <button
                              type="button"
                              onClick={() => setViewPhotoUrl(p.proofFileUrl || null)}
                              className="text-[10px] text-blue-900 dark:text-sky-400 hover:underline inline-flex items-center gap-1 mt-0.5"
                            >
                              <Camera className="w-3 h-3" />
                              <span>Lihat Bukti Lampiran</span>
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => approveTransaction(p.id, currentUser.name)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Setujui</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setRejectModalTx(p)}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition border border-rose-200"
                          >
                            <span>Tolak</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL INPUT: KAS MASUK / KAS KELUAR                       */}
      {/* ========================================================= */}
      {isCreateModalOpen && (
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title={`Input Transaksi ${createType === 'Pemasukan' ? 'Kas Masuk (BKM)' : 'Kas Keluar (BKK)'}`}
          maxWidth="xl"
        >
          <form onSubmit={handleSaveTransaction} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold mb-1">Nomor Bukti (Otomatis/Bisa Diedit)</label>
                <input
                  type="text"
                  required
                  value={formData.proofNumber}
                  onChange={e => setFormData(f => ({ ...f, proofNumber: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 font-mono"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Tanggal Transaksi</label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={e => setFormData(f => ({ ...f, date: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold mb-1">Kategori Transaksi</label>
                <select
                  required
                  value={formData.category}
                  onChange={e => setFormData(f => ({ ...f, category: e.target.value as any }))}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800"
                >
                  {createType === 'Pemasukan' ? (
                    <>
                      <option value="Dana Termin BGN">Dana Termin BGN (Badan Gizi Nasional)</option>
                      <option value="Dana Talangan Yayasan">Dana Talangan Yayasan Hafshawaty</option>
                      <option value="Operasional Dapur">Penerimaan Jasa / Lainnya</option>
                    </>
                  ) : (
                    <>
                      <option value="Bahan Baku">Bahan Baku Pangan MBG</option>
                      <option value="Operasional Dapur">Operasional Dapur (Gas LPG, Air, Listrik)</option>
                      <option value="Upah Relawan">Insentif & Upah Relawan</option>
                      <option value="Logistik & Armada">Logistik, BBM & Armada Pengiriman</option>
                      <option value="Perlengkapan">Perlengkapan, Kemasan & Ompreng</option>
                      <option value="Utilitas Listrik/Gas/Air">Utilitas Listrik / Gas / Air</option>
                      <option value="Higiene & Sanitasi">Higiene, Sanitasi & APD</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">Nominal Transaksi (Rp)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.amount}
                  onChange={e => setFormData(f => ({ ...f, amount: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 font-mono text-base font-bold"
                />
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  Terbilang: {formatRupiah(formData.amount)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold mb-1">
                  {createType === 'Pemasukan' ? 'Sumber Dana / Pengirim' : 'Pihak Penerima / Rekanan'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={createType === 'Pemasukan' ? 'Misal: KPPN Probolinggo / BGN' : 'Misal: UD Sembako Jaya'}
                  value={formData.sourceOrRecipient}
                  onChange={e => setFormData(f => ({ ...f, sourceOrRecipient: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Pilih Master Supplier (Opsional)</label>
                <select
                  value={formData.supplierName}
                  onChange={e => {
                    const sup = e.target.value;
                    setFormData(f => ({
                      ...f,
                      supplierName: sup,
                      sourceOrRecipient: sup || f.sourceOrRecipient,
                    }));
                  }}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800"
                >
                  <option value="">-- Pilih Supplier Terdaftar --</option>
                  {masterSuppliers.map(s => (
                    <option key={s.id} value={s.name}>
                      {s.name} ({s.suppliedCategories?.join(', ') || s.code})
                    </option>
                  ))}
                </select>
                {formData.supplierName && (() => {
                  const s = masterSuppliers.find(sup => sup.name === formData.supplierName);
                  if (!s) return null;
                  return (
                    <div className="mt-1.5 p-2 bg-blue-50/70 dark:bg-slate-800/80 rounded-lg text-[11px] text-blue-900 dark:text-sky-300 border border-blue-200/60 dark:border-slate-700/80">
                      <div><strong>Rekening:</strong> {s.bankName} - {s.accountNumber} (a.n. {s.bankAccountName || s.name})</div>
                      <div><strong>PIC:</strong> {s.contactPerson} • {s.phone}</div>
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold mb-1">Rekening Pembukuan</label>
                <select
                  required
                  value={formData.bankAccount}
                  onChange={e => setFormData(f => ({ ...f, bankAccount: e.target.value as any }))}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800"
                >
                  <option value="Bank BRI SPPG Yayasan Hafshawaty (0034-01-00291-53-1)">
                    Bank BRI SPPG Yayasan Hafshawaty
                  </option>
                  <option value="Bank Jatim Cab. Kraksaan (0132-99-8812)">
                    Bank Jatim Cab. Kraksaan
                  </option>
                  <option value="Kas Tunai Dapur (Petty Cash)">
                    Kas Tunai Dapur (Petty Cash)
                  </option>
                  <option value="Kas Operasional Lapangan">
                    Kas Operasional Lapangan
                  </option>
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">Metode Pembayaran</label>
                <select
                  value={formData.paymentMethod}
                  onChange={e => setFormData(f => ({ ...f, paymentMethod: e.target.value as any }))}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800"
                >
                  <option value="Transfer Bank">Transfer Bank / Virtual Account</option>
                  <option value="Tunai">Tunai / Uang Pas</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold mb-1">Uraian / Deskripsi Transaksi</label>
              <textarea
                required
                rows={2}
                placeholder="Rincian peruntukan pengeluaran atau sumber dana pemasukan..."
                value={formData.description}
                onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800"
              />
            </div>

            {/* Upload Bukti */}
            <div className="p-3.5 rounded-xl border bg-slate-50 dark:bg-slate-800/40 space-y-2">
              <span className="font-bold text-slate-800 dark:text-white block">
                Upload Bukti Kuitansi / Nota / Bukti Transfer:
              </span>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="text-xs"
                />
                {formData.proofFileUrl && (
                  <button
                    type="button"
                    onClick={() => setViewPhotoUrl(formData.proofFileUrl)}
                    className="text-xs text-blue-900 dark:text-sky-400 font-bold hover:underline"
                  >
                    Preview Bukti
                  </button>
                )}
              </div>
            </div>

            {/* Status Persetujuan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold mb-1">Status Persetujuan</label>
                <select
                  value={formData.approvalStatus}
                  onChange={e => setFormData(f => ({ ...f, approvalStatus: e.target.value as any }))}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800"
                >
                  <option value="Menunggu Persetujuan">Menunggu Persetujuan (Pengajuan)</option>
                  <option value="Disetujui">Langsung Disetujui (Otorisasi Pimpinan)</option>
                  <option value="Draft">Draft (Belum Diajukan)</option>
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">Catatan Tambahan</label>
                <input
                  type="text"
                  placeholder="Keterangan pendukung..."
                  value={formData.notes}
                  onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 border rounded-xl"
              >
                Batal
              </button>
              <button
                type="submit"
                className={`px-4 py-2 text-white rounded-xl font-bold ${
                  createType === 'Pemasukan' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-900 hover:bg-blue-800'
                }`}
              >
                Simpan Transaksi Kas
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================= */}
      {/* MODAL PEMBATALAN RESMI TRANSAKSI (JEJAK AUDIT)           */}
      {/* ========================================================= */}
      {cancelModalTx && (
        <Modal
          isOpen={!!cancelModalTx}
          onClose={() => setCancelModalTx(null)}
          title="Pembatalan Resmi Transaksi Kas Terverifikasi"
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-900 dark:text-amber-200 flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <span className="font-bold block">Pemberitahuan Sistem Keamanan Finansial:</span>
                <span>
                  Sesuai regulasi akuntansi BGN, transaksi kas yang telah berstatus <strong>Disetujui</strong> tidak boleh dihapus secara diam-diam. Pembatalan akan dicatat ke dalam log audit resmi dan saldo pembukuan akan disesuaikan otomatis.
                </span>
              </div>
            </div>

            <div className="space-y-1 p-3 rounded-xl border bg-slate-50 dark:bg-slate-800/40 font-mono">
              <div>No. Bukti: <strong>{cancelModalTx.transactionNumber}</strong></div>
              <div>Tanggal: {cancelModalTx.date}</div>
              <div>Uraian: {cancelModalTx.description}</div>
              <div className="text-sm font-bold text-rose-600">
                Nominal: {formatRupiah(cancelModalTx.amount)}
              </div>
            </div>

            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                Alasan Resmi Pembatalan Transaksi (Wajib Diisi):
              </label>
              <textarea
                required
                rows={3}
                placeholder="Misal: Kesalahan input nominal, faktur supplier dibatalkan, atau pengembalian dana..."
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setCancelModalTx(null)}
                className="px-4 py-2 border rounded-xl"
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold"
              >
                Konfirmasi Pembatalan Transaksi
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================= */}
      {/* MODAL PENOLAKAN PENGAJUAN KAS                            */}
      {/* ========================================================= */}
      {rejectModalTx && (
        <Modal
          isOpen={!!rejectModalTx}
          onClose={() => setRejectModalTx(null)}
          title="Tolak Pengajuan Transaksi Kas"
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 dark:text-slate-300">
              Apakah Anda yakin ingin menolak transaksi <strong>{rejectModalTx.transactionNumber}</strong> senilai {formatRupiah(rejectModalTx.amount)}?
            </p>

            <div>
              <label className="block font-bold mb-1">Alasan Penolakan:</label>
              <textarea
                rows={2}
                placeholder="Tuliskan catatan revisi atau alasan penolakan..."
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setRejectModalTx(null)}
                className="px-4 py-2 border rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold"
              >
                Tolak Pengajuan
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================= */}
      {/* MODAL VIEW FOTO BUKTI / KUITANSI                         */}
      {/* ========================================================= */}
      {viewPhotoUrl && (
        <Modal
          isOpen={!!viewPhotoUrl}
          onClose={() => setViewPhotoUrl(null)}
          title="Bukti Kuitansi / Nota Pembayaran Kas"
          maxWidth="lg"
        >
          <div className="space-y-4">
            <img
              src={viewPhotoUrl}
              alt="Bukti Kuitansi"
              className="w-full max-h-[70vh] object-contain rounded-xl border border-slate-200 dark:border-slate-800 bg-black/5"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setViewPhotoUrl(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-xl text-xs font-bold"
              >
                Tutup
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================= */}
      {/* CONFIRM DIALOG PENGHAPUSAN TRANSAKSI                      */}
      {/* ========================================================= */}
      {deleteConfirmTx && (
        <ConfirmDialog
          isOpen={!!deleteConfirmTx}
          onClose={() => setDeleteConfirmTx(null)}
          onConfirm={handleConfirmDelete}
          title="Hapus Transaksi Kas"
          message={`Apakah Anda yakin ingin menghapus pencatatan transaksi nomor ${deleteConfirmTx.transactionNumber} (${deleteConfirmTx.description}) senilai ${formatRupiah(deleteConfirmTx.amount)}? Tindakan ini tidak dapat dibatalkan.`}
          confirmLabel="Ya, Hapus Transaksi"
          cancelLabel="Batal"
          isDestructive={true}
        />
      )}
    </div>
  );
};
