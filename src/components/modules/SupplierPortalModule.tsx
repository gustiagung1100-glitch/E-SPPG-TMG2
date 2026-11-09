import React, { useState, useMemo } from 'react';
import { useApp } from '../../lib/store';
import { DataTable, Column } from '../common/DataTable';
import { Modal } from '../common/Modal';
import { PrintHeader } from '../common/PrintHeader';
import { exportTableToPDF, exportToExcel, triggerPrint, formatIndonesianDate, formatRupiah, formatNumber } from '../../lib/exportUtils';
import { PurchaseOrder, SupplierDocument, MasterSupplier } from '../../types';
import {
  Truck,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Upload,
  Calendar,
  Phone,
  Building,
  ShieldCheck,
  PackageCheck,
  Eye,
  Printer,
  XCircle,
  Send,
  Download,
  Search,
  Filter,
  Check,
  X,
  Lock,
  UserCheck,
  FileCheck,
  Image as ImageIcon,
  ExternalLink,
} from 'lucide-react';

export const SupplierPortalModule: React.FC = () => {
  const {
    purchaseOrders,
    supplierConfirmPO,
    supplierUpdatePOStatus,
    supplierRejectPO,
    supplierUploadDocument,
    currentUser,
    masterSuppliers,
    sppgConfig,
    addToast,
  } = useApp();

  // If logged in as Supplier, force current supplierName.
  // If logged in as Admin / SPPG staff, provide a simulation selector to test different supplier accounts.
  const isSupplierAccount = currentUser.role === 'Supplier / Mitra Pangan';
  const defaultSimulated = currentUser.supplierName || 'PT Unggas Barokah Probolinggo';
  const [selectedSupplierName, setSelectedSupplierName] = useState<string>(defaultSimulated);

  const activeSupplierName = isSupplierAccount ? (currentUser.supplierName || defaultSimulated) : selectedSupplierName;

  // Active Tab
  const [activeTab, setActiveTab] = useState<'active_po' | 'history' | 'profile'>('active_po');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isUpdateStatusModalOpen, setIsUpdateStatusModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isUploadDocModalOpen, setIsUploadDocModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Form States
  const [confirmForm, setConfirmForm] = useState({
    estimatedDeliveryDate: new Date().toISOString().slice(0, 10),
    estimatedDeliveryTime: '04:00 WIB',
    driverName: 'Budi Santoso',
    driverPhone: '0813-8822-1100',
    vehicleNumber: 'N 8922 UB',
    notes: 'Siap dikirim tepat waktu sesuai spesifikasi mutu BGN.',
  });

  const [updateStatusForm, setUpdateStatusForm] = useState({
    status: 'Sedang Dipersiapkan' as NonNullable<PurchaseOrder['supplierDeliveryStatus']>,
    notes: 'Bahan telah disortir dan masuk proses packing pendingin.',
  });

  const [rejectReason, setRejectReason] = useState('');

  const [uploadDocForm, setUploadDocForm] = useState({
    type: 'Surat Jalan' as SupplierDocument['type'],
    fileName: 'Surat_Jalan_Pengiriman.pdf',
    fileUrl: '',
  });

  // Strict Data Isolation Filter: ONLY get POs addressed to activeSupplierName!
  const supplierPOs = useMemo(() => {
    return purchaseOrders.filter(po =>
      po.supplierName.toLowerCase().trim() === activeSupplierName.toLowerCase().trim()
    );
  }, [purchaseOrders, activeSupplierName]);

  // Split into Active vs Completed/History
  const activePOs = useMemo(() => {
    return supplierPOs.filter(po =>
      po.status !== 'Diterima di Gudang' && po.status !== 'Ditolak' && po.status !== 'Dibatalkan'
    );
  }, [supplierPOs]);

  const historyPOs = useMemo(() => {
    return supplierPOs.filter(po =>
      po.status === 'Diterima di Gudang' || po.status === 'Ditolak' || po.status === 'Dibatalkan'
    );
  }, [supplierPOs]);

  // Filtered List based on tab and search
  const displayedPOs = useMemo(() => {
    const sourceList = activeTab === 'history' ? historyPOs : activePOs;
    return sourceList.filter(po => {
      const matchSearch =
        po.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        po.items.some(i => i.itemName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (po.supplierDriverName && po.supplierDriverName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchStatus = statusFilter === 'ALL' || po.supplierDeliveryStatus === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [activeTab, activePOs, historyPOs, searchQuery, statusFilter]);

  // Statistics for Current Supplier
  const stats = useMemo(() => {
    const total = supplierPOs.length;
    const needConfirm = supplierPOs.filter(p => !p.supplierConfirmed && p.status !== 'Ditolak' && p.status !== 'Dibatalkan').length;
    const inDelivery = supplierPOs.filter(p => p.supplierDeliveryStatus === 'Dalam Pengiriman' || p.supplierDeliveryStatus === 'Sedang Dipersiapkan').length;
    const completed = supplierPOs.filter(p => p.status === 'Diterima di Gudang').length;
    const totalNominal = supplierPOs.reduce((sum, p) => sum + p.totalAmount, 0);
    return { total, needConfirm, inDelivery, completed, totalNominal };
  }, [supplierPOs]);

  // Supplier Profile Info from Master Suppliers
  const supplierInfo: MasterSupplier = useMemo(() => {
    return masterSuppliers.find(s => s.name.toLowerCase() === activeSupplierName.toLowerCase()) || {
      id: 'sup-curr',
      code: 'SUP-ACT',
      name: activeSupplierName,
      address: 'Kabupaten Probolinggo, Jawa Timur',
      contactPerson: 'PIC Rekanan Mitra Pangan',
      phone: '0812-3456-7890',
      suppliedCategories: ['Bahan Pangan Segar', 'Lauk Pauk'],
      bankName: 'Bank BRI',
      accountNumber: '0034-01-08992-50-2',
      bankAccountName: activeSupplierName,
      isActive: true,
    };
  }, [masterSuppliers, activeSupplierName]);

  // Handle Confirm PO Submit
  const handleConfirmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPO) return;

    const fullEstimated = `${formatIndonesianDate(confirmForm.estimatedDeliveryDate)} - ${confirmForm.estimatedDeliveryTime}`;
    await supplierConfirmPO(
      selectedPO.id,
      fullEstimated,
      confirmForm.driverName,
      confirmForm.driverPhone,
      confirmForm.vehicleNumber
    );

    setIsConfirmModalOpen(false);
  };

  // Handle Status Update Submit
  const handleUpdateStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPO) return;

    await supplierUpdatePOStatus(selectedPO.id, updateStatusForm.status, updateStatusForm.notes);
    setIsUpdateStatusModalOpen(false);
  };

  // Handle Reject Submit
  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPO) return;
    if (!rejectReason.trim()) {
      addToast('error', 'Alasan Wajib', 'Mohon isi alasan penolakan pesanan.');
      return;
    }

    await supplierRejectPO(selectedPO.id, rejectReason.trim());
    setIsRejectModalOpen(false);
    setRejectReason('');
  };

  // Handle Upload Document Submit
  const handleUploadDocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPO) return;

    await supplierUploadDocument(selectedPO.id, {
      type: uploadDocForm.type,
      fileName: uploadDocForm.fileName,
      fileUrl: uploadDocForm.fileUrl || 'https://images.unsplash.com/photo-1554415707-9e4466b404c0?auto=format&fit=crop&w=500&q=80',
    });

    setIsUploadDocModalOpen(false);
    setUploadDocForm({
      type: 'Surat Jalan',
      fileName: 'Surat_Jalan_Pengiriman.pdf',
      fileUrl: '',
    });
  };

  // Export handlers
  const handleExportPDF = () => {
    exportTableToPDF({
      title: `REKAPITULASI PURCHASE ORDER (PO) SUPPLIER`,
      subtitle: `Mitra Pangan: ${activeSupplierName} | SPPG Temenggungan 2`,
      headers: ['Nomor PO', 'Tanggal PO', 'Bahan Dipesan', 'Total Nilai (Rp)', 'Estimasi Kirim', 'Status Pengiriman'],
      rows: displayedPOs.map(p => [
        p.poNumber,
        formatIndonesianDate(p.date),
        p.items.map(i => `${i.itemName} (${i.quantity} ${i.unit})`).join(', '),
        formatRupiah(p.totalAmount),
        p.supplierEstimatedDelivery || formatIndonesianDate(p.deliveryDate),
        p.supplierDeliveryStatus || p.status,
      ]),
      fileName: `PO_Supplier_${activeSupplierName.replace(/[^a-zA-Z0-9]/g, '_')}`,
      sppgConfig,
      signerName: activeSupplierName,
      signerRole: 'Penanggung Jawab Rekanan',
    });
  };

  const handleExportExcel = () => {
    const data = displayedPOs.map(p => ({
      'Nomor PO': p.poNumber,
      'Tanggal Terbit': p.date,
      'Jadwal Tiba Diminta SPPG': p.deliveryDate,
      'Estimasi Pengiriman Supplier': p.supplierEstimatedDelivery || '-',
      'Nama Driver': p.supplierDriverName || '-',
      'Kontak Driver': p.supplierDriverPhone || '-',
      'Nomor Polisi': p.supplierVehicleNumber || '-',
      'Rincian Bahan': p.items.map(i => `${i.itemName} (${i.quantity} ${i.unit})`).join('; '),
      'Total Nilai PO': p.totalAmount,
      'Status Konfirmasi': p.supplierConfirmed ? 'Dikonfirmasi' : 'Belum Konfirmasi',
      'Status Pengiriman': p.supplierDeliveryStatus || p.status,
      'Catatan': p.notes || '-',
    }));
    exportToExcel(data, `PO_Supplier_${activeSupplierName.replace(/[^a-zA-Z0-9]/g, '_')}`);
  };

  // Table Columns
  const poColumns: Column<PurchaseOrder>[] = [
    {
      key: 'poNumber',
      header: 'No. PO & Tanggal',
      render: (po: PurchaseOrder) => (
        <div>
          <div className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs">
            {po.poNumber}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            <span>Terbit: {formatIndonesianDate(po.date)}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'items',
      header: 'Bahan Makanan Dipesan',
      render: (po: PurchaseOrder) => (
        <div className="space-y-1 max-w-xs md:max-w-sm">
          {po.items.map((it, idx) => (
            <div key={idx} className="text-xs">
              <span className="font-bold text-slate-800 dark:text-slate-200">{it.itemName}</span>
              <span className="text-slate-500 ml-1.5 font-mono text-[11px]">
                {formatNumber(it.quantity)} {it.unit} @ {formatRupiah(it.unitPrice)}
              </span>
            </div>
          ))}
        </div>
      ),
    },
    {
      key: 'totalAmount',
      header: 'Total Nilai Pesanan',
      render: (po: PurchaseOrder) => (
        <div>
          <div className="font-bold text-xs text-blue-900 dark:text-sky-400 font-mono">
            {formatRupiah(po.totalAmount)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {po.items.length} jenis bahan
          </div>
        </div>
      ),
    },
    {
      key: 'delivery',
      header: 'Estimasi & Jadwal Kirim',
      render: (po: PurchaseOrder) => (
        <div className="text-xs">
          {po.supplierEstimatedDelivery ? (
            <div className="font-semibold text-emerald-700 dark:text-emerald-400">
              {po.supplierEstimatedDelivery}
            </div>
          ) : (
            <div className="text-slate-500 italic text-[11px]">
              Target: {formatIndonesianDate(po.deliveryDate)}
            </div>
          )}
          {po.supplierDriverName && (
            <div className="text-[10px] text-slate-500 mt-0.5">
              Driver: {po.supplierDriverName} ({po.supplierVehicleNumber || '-'})
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status Pengiriman Mitra',
      render: (po: PurchaseOrder) => {
        const statusColors: Record<string, string> = {
          'Menunggu Konfirmasi': 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300',
          'Dikonfirmasi Supplier': 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300',
          'Sedang Dipersiapkan': 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-300',
          'Dalam Pengiriman': 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300',
          'Telah Tiba di Gudang': 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300',
          'Ditolak Supplier': 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300',
        };
        const currentDeliveryStatus = po.supplierDeliveryStatus || (po.supplierConfirmed ? 'Dikonfirmasi Supplier' : 'Menunggu Konfirmasi');

        return (
          <div>
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded-full border ${statusColors[currentDeliveryStatus] || 'bg-slate-100 text-slate-800 border-slate-300'}`}>
              {currentDeliveryStatus}
            </span>
            {po.supplierDocuments && po.supplierDocuments.length > 0 && (
              <div className="text-[10px] text-blue-600 dark:text-sky-400 font-semibold mt-1 flex items-center gap-1">
                <FileCheck className="w-3 h-3" />
                {po.supplierDocuments.length} Dokumen Unggahan
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Tindakan Pesanan',
      render: (po: PurchaseOrder) => (
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setSelectedPO(po);
              setIsDetailModalOpen(true);
            }}
            title="Lihat Rincian PO"
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>

          {!po.supplierConfirmed && po.status !== 'Ditolak' && (
            <button
              type="button"
              onClick={() => {
                setSelectedPO(po);
                setConfirmForm({
                  estimatedDeliveryDate: po.deliveryDate || new Date().toISOString().slice(0, 10),
                  estimatedDeliveryTime: '04:00 WIB',
                  driverName: 'Budi Santoso',
                  driverPhone: '0813-8822-1100',
                  vehicleNumber: 'N 8922 UB',
                  notes: 'Sanggup memenuhi dan siap kirim tepat waktu.',
                });
                setIsConfirmModalOpen(true);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Konfirmasi</span>
            </button>
          )}

          {po.supplierConfirmed && po.status !== 'Diterima di Gudang' && (
            <button
              type="button"
              onClick={() => {
                setSelectedPO(po);
                setUpdateStatusForm({
                  status: (po.supplierDeliveryStatus as any) || 'Sedang Dipersiapkan',
                  notes: '',
                });
                setIsUpdateStatusModalOpen(true);
              }}
              title="Perbarui Status Pengiriman"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Update Status</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setSelectedPO(po);
              setUploadDocForm({
                type: 'Surat Jalan',
                fileName: `Surat_Jalan_${po.poNumber.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
                fileUrl: '',
              });
              setIsUploadDocModalOpen(true);
            }}
            title="Unggah Dokumen Pendukung (Surat Jalan/Faktur/Halal)"
            className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 transition-colors"
          >
            <Upload className="w-4 h-4" />
          </button>

          {!po.supplierConfirmed && po.status !== 'Ditolak' && (
            <button
              type="button"
              onClick={() => {
                setSelectedPO(po);
                setRejectReason('');
                setIsRejectModalOpen(true);
              }}
              title="Tolak Pesanan"
              className="p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Strict Security & Isolation Notice Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white p-6 rounded-2xl shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-800/60 border border-blue-400/30 text-xs font-semibold text-blue-200 mb-2">
              <Lock className="w-3.5 h-3.5 text-sky-400" />
              PORTAL SUPPLIER TERISOLASI • RBAC KEAMANAN TINGKAT TINGGI
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              Portal Mitra Supplier Bahan Pangan
            </h1>
            <p className="text-xs text-blue-200 mt-1 max-w-3xl">
              Portal mandiri rekanan SPPG untuk konfirmasi Purchase Order (PO), pemutakhiran jadwal pengiriman bahan pangan segar/kering, pengunggahan dokumen Surat Jalan & sertifikasi halal, tanpa akses ke data keuangan internal atau data penerima manfaat.
            </p>
          </div>

          {/* Account Card / Simulation Switcher */}
          <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-xl border border-white/20 text-xs shrink-0 max-w-sm">
            <div className="text-[11px] font-bold text-sky-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-sky-300" />
              Akun Mitra Aktif:
            </div>
            <div className="font-bold text-white text-sm">
              {activeSupplierName}
            </div>

            {/* Simulation dropdown if admin/staff logged in */}
            {!isSupplierAccount && (
              <div className="mt-2 pt-2 border-t border-white/20">
                <label className="block text-[10px] text-blue-200 mb-1">
                  Mode Simulasi Mitra Rekanan (Admin Preview):
                </label>
                <select
                  value={selectedSupplierName}
                  onChange={(e) => setSelectedSupplierName(e.target.value)}
                  className="w-full py-1 px-2 rounded bg-slate-900/80 text-white text-xs border border-white/30"
                >
                  {masterSuppliers.map(s => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Decorative blur */}
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-sky-400/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total PO Masuk
            </span>
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
              <PackageCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {stats.total}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Total nilai: {formatRupiah(stats.totalNominal)}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Perlu Konfirmasi
            </span>
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">
            {stats.needConfirm}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Menunggu kesanggupan pasokan
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Dalam Proses Kirim
            </span>
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-2">
            {stats.inDelivery}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Packing / armada menuju SPPG
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Selesai Diterima Gudang
            </span>
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            {stats.completed}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Telah lolos inspeksi QC
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-slate-200 dark:border-slate-800 space-x-2 sm:space-x-4">
        <button
          type="button"
          onClick={() => setActiveTab('active_po')}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'active_po'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <PackageCheck className="w-4 h-4" />
          <span>Pesanan Aktif (PO Berjalan)</span>
          <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 font-bold">
            {activePOs.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'history'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>Riwayat PO Selesai & QC</span>
          <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-bold">
            {historyPOs.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'profile'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Legalitas & Rekening Rekanan</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1 & 2: DAFTAR PO AKTIF & RIWAYAT */}
      {/* ========================================================================= */}
      {(activeTab === 'active_po' || activeTab === 'history') && (
        <div className="space-y-4">
          {/* Filters & Actions Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-1 flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nomor PO, nama bahan makanan, atau driver..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">Semua Status Pengiriman</option>
                <option value="Menunggu Konfirmasi">Menunggu Konfirmasi</option>
                <option value="Dikonfirmasi Supplier">Dikonfirmasi Supplier</option>
                <option value="Sedang Dipersiapkan">Sedang Dipersiapkan</option>
                <option value="Dalam Pengiriman">Dalam Pengiriman</option>
                <option value="Telah Tiba di Gudang">Telah Tiba di Gudang</option>
                <option value="Ditolak Supplier">Ditolak Supplier</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportPDF}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Export PDF
              </button>
              <button
                type="button"
                onClick={handleExportExcel}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                Export Excel
              </button>
            </div>
          </div>

          {/* DataTable */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <DataTable
              title={activeTab === 'active_po' ? 'Daftar Purchase Order (PO) Aktif' : 'Riwayat PO & Verifikasi QC'}
              subtitle={`Menampilkan pesanan yang ditujukan kepada: ${activeSupplierName}`}
              columns={poColumns as any}
              data={displayedPOs as any}
              keyExtractor={(item: any) => item.id}
              searchPlaceholder="Cari data pesanan..."
              searchKeys={['poNumber', 'supplierDriverName']}
              onExportPDF={handleExportPDF}
              onExportExcel={handleExportExcel}
              onPrint={triggerPrint}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PROFIL REKENING & LEGALITAS MITRA */}
      {/* ========================================================================= */}
      {activeTab === 'profile' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 flex items-center justify-center font-bold text-lg">
              <Building className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {supplierInfo.name}
              </h3>
              <p className="text-xs text-slate-500">
                Kode Rekanan: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{supplierInfo.code}</span> • Terdaftar dalam Program Makan Bergizi Gratis (MBG)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-2">
              <div className="font-semibold text-slate-500">Alamat Fasilitas / Gudang Rekanan:</div>
              <div className="font-medium text-slate-800 dark:text-slate-200">{supplierInfo.address}</div>

              <div className="font-semibold text-slate-500 pt-2">Nomor Telepon / Narahubung:</div>
              <div className="font-medium text-slate-800 dark:text-slate-200">{supplierInfo.phone}</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-2">
              <div className="font-semibold text-slate-500">Nomor Rekening Pembayaran Pembelian:</div>
              <div className="font-mono font-bold text-blue-900 dark:text-sky-400 text-sm">
                {supplierInfo.accountNumber ? `${supplierInfo.accountNumber} (${supplierInfo.bankName || 'Bank'})` : '0034-01-08992-50-2 (Bank BRI)'}
              </div>

              <div className="font-semibold text-slate-500 pt-2">Kategori Pasokan Bahan Pangan:</div>
              <div className="flex flex-wrap gap-1 mt-1">
                {(supplierInfo.suppliedCategories || []).map((cat: string, idx: number) => (
                  <span key={idx} className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 text-[10px] font-bold">
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
            <div className="font-bold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Jaminan Keamanan Pangan & Sertifikasi Halal
            </div>
            <p>
              Seluruh rekanan supplier wajib mematuhi standar Good Manufacturing Practice (GMP), rantai dingin (cold-chain), batas bebas residu antibiotik & pestisida, serta menyertakan sertifikat halal RPH/RPU aktif pada setiap pengiriman bahan baku ke SPPG Temenggungan 2.
            </p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: KONFIRMASI PESANAN & ESTIMASI PENGIRIMAN */}
      {/* ========================================================================= */}
      {selectedPO && (
        <Modal
          isOpen={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          title={`Konfirmasi Pesanan: ${selectedPO.poNumber}`}
          maxWidth="2xl"
        >
          <form onSubmit={handleConfirmSubmit} className="space-y-4">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
              <div className="text-slate-500">Rincian Bahan Dipesan:</div>
              {selectedPO.items.map((it, idx) => (
                <div key={idx} className="font-bold text-slate-800 dark:text-slate-200">
                  • {it.itemName}: {formatNumber(it.quantity)} {it.unit} @ {formatRupiah(it.unitPrice)} = {formatRupiah(it.subtotal)}
                </div>
              ))}
              <div className="text-blue-900 dark:text-sky-400 font-bold pt-1">
                Total Nilai: {formatRupiah(selectedPO.totalAmount)}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Estimasi Tanggal Pengiriman Tiba
                </label>
                <input
                  type="date"
                  value={confirmForm.estimatedDeliveryDate}
                  onChange={(e) => setConfirmForm({ ...confirmForm, estimatedDeliveryDate: e.target.value })}
                  required
                  className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Estimasi Jam Tiba di SPPG
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 03:30 WIB"
                  value={confirmForm.estimatedDeliveryTime}
                  onChange={(e) => setConfirmForm({ ...confirmForm, estimatedDeliveryTime: e.target.value })}
                  required
                  className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Driver / Supir Armada
                </label>
                <input
                  type="text"
                  placeholder="Nama pengemudi..."
                  value={confirmForm.driverName}
                  onChange={(e) => setConfirmForm({ ...confirmForm, driverName: e.target.value })}
                  required
                  className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nomor HP / Kontak Driver
                </label>
                <input
                  type="text"
                  placeholder="Nomor telepon..."
                  value={confirmForm.driverPhone}
                  onChange={(e) => setConfirmForm({ ...confirmForm, driverPhone: e.target.value })}
                  required
                  className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nomor Polisi Kendaraan Pengangkut
              </label>
              <input
                type="text"
                placeholder="Contoh: N 8922 UB"
                value={confirmForm.vehicleNumber}
                onChange={(e) => setConfirmForm({ ...confirmForm, vehicleNumber: e.target.value })}
                className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Catatan Kesanggupan Supplier
              </label>
              <textarea
                rows={2}
                value={confirmForm.notes}
                onChange={(e) => setConfirmForm({ ...confirmForm, notes: e.target.value })}
                className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-md font-bold"
              >
                Konfirmasi Sanggup Memenuhi
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: UPDATE STATUS PENGIRIMAN */}
      {/* ========================================================================= */}
      {selectedPO && (
        <Modal
          isOpen={isUpdateStatusModalOpen}
          onClose={() => setIsUpdateStatusModalOpen(false)}
          title={`Perbarui Status Pengiriman: ${selectedPO.poNumber}`}
          maxWidth="md"
        >
          <form onSubmit={handleUpdateStatusSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Status Saat Ini
              </label>
              <select
                value={updateStatusForm.status}
                onChange={(e) => setUpdateStatusForm({ ...updateStatusForm, status: e.target.value as any })}
                className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
              >
                <option value="Sedang Dipersiapkan">Sedang Dipersiapkan (Sortir / Packing)</option>
                <option value="Dalam Pengiriman">Dalam Pengiriman (Menuju Dapur SPPG)</option>
                <option value="Telah Tiba di Gudang">Telah Tiba di Gudang (Loading Dock SPPG)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Catatan Perjalanan / Posisi Pengiriman
              </label>
              <textarea
                rows={3}
                placeholder="Contoh: Armada telah keluar dari cold storage pukul 03:00, perkiraan tiba di SPPG 03:25 WIB..."
                value={updateStatusForm.notes}
                onChange={(e) => setUpdateStatusForm({ ...updateStatusForm, notes: e.target.value })}
                className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsUpdateStatusModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                Simpan Pembaruan Status
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: UNGGAH DOKUMEN PENDUKUNG (SURAT JALAN / FAKTUR / HALAL) */}
      {/* ========================================================================= */}
      {selectedPO && (
        <Modal
          isOpen={isUploadDocModalOpen}
          onClose={() => setIsUploadDocModalOpen(false)}
          title={`Unggah Dokumen Pendukung: ${selectedPO.poNumber}`}
          maxWidth="md"
        >
          <form onSubmit={handleUploadDocSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Jenis Dokumen
              </label>
              <select
                value={uploadDocForm.type}
                onChange={(e) => setUploadDocForm({ ...uploadDocForm, type: e.target.value as any })}
                className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
              >
                <option value="Surat Jalan">Surat Jalan Pengiriman</option>
                <option value="Faktur">Faktur Penjualan / Invoice</option>
                <option value="Sertifikat Halal">Sertifikat Halal RPH / RPU</option>
                <option value="Hasil Uji Lab">Hasil Uji Bebas Residu / Mutu</option>
                <option value="Foto Bahan">Foto Bahan Baku Siap Kirim</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nama File Dokumen
              </label>
              <input
                type="text"
                value={uploadDocForm.fileName}
                onChange={(e) => setUploadDocForm({ ...uploadDocForm, fileName: e.target.value })}
                required
                className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Pilih File (Foto / Scan Dokumen)
              </label>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (loadEvt) => {
                      setUploadDocForm(prev => ({
                        ...prev,
                        fileName: file.name,
                        fileUrl: loadEvt.target?.result as string,
                      }));
                      addToast('success', 'File Terpilih', `${file.name} siap diunggah.`);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900 dark:file:text-blue-300"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsUploadDocModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              >
                Simpan & Lampirkan Dokumen
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: DETAIL PO & RIWAYAT DOKUMEN SUPPLIER */}
      {/* ========================================================================= */}
      {selectedPO && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Rincian Purchase Order: ${selectedPO.poNumber}`}
          maxWidth="3xl"
        >
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500">Nomor PO:</span>{' '}
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{selectedPO.poNumber}</span>
                </div>
                <div>
                  <span className="text-slate-500">Tanggal Terbit:</span>{' '}
                  <span className="font-bold text-slate-900 dark:text-white">{formatIndonesianDate(selectedPO.date)}</span>
                </div>
                <div>
                  <span className="text-slate-500">Rekanan Dituju:</span>{' '}
                  <span className="font-bold text-slate-900 dark:text-white">{selectedPO.supplierName}</span>
                </div>
                <div>
                  <span className="text-slate-500">Batas Waktu Kirim:</span>{' '}
                  <span className="font-bold text-slate-900 dark:text-white">{formatIndonesianDate(selectedPO.deliveryDate)}</span>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div>
              <div className="font-semibold text-xs text-slate-700 dark:text-slate-300 mb-2">
                Daftar Barang & Harga Kesepakatan:
              </div>
              <table className="w-full text-xs text-left border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  <tr>
                    <th className="p-2.5">Nama Bahan</th>
                    <th className="p-2.5 text-right">Kuantitas</th>
                    <th className="p-2.5 text-right">Harga Satuan</th>
                    <th className="p-2.5 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {selectedPO.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="p-2.5 font-bold text-slate-900 dark:text-white">{it.itemName}</td>
                      <td className="p-2.5 text-right font-mono">{formatNumber(it.quantity)} {it.unit}</td>
                      <td className="p-2.5 text-right font-mono">{formatRupiah(it.unitPrice)}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-blue-900 dark:text-sky-400">{formatRupiah(it.subtotal)}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 dark:bg-slate-800/80 font-bold">
                    <td colSpan={3} className="p-2.5 text-right uppercase">Total PO:</td>
                    <td className="p-2.5 text-right font-mono text-sm text-blue-900 dark:text-sky-300">{formatRupiah(selectedPO.totalAmount)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Uploaded Documents List */}
            {selectedPO.supplierDocuments && selectedPO.supplierDocuments.length > 0 && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <div className="font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  Dokumen Pendukung yang Telah Dilampirkan:
                </div>
                <div className="space-y-1.5">
                  {selectedPO.supplierDocuments.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300">
                          {doc.type}
                        </span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">{doc.fileName}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">Diunggah: {doc.uploadedAt}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-between items-center">
              <button
                type="button"
                onClick={() => triggerPrint()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              >
                <Printer className="w-3.5 h-3.5" />
                Cetak Lembar PO
              </button>

              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              >
                Tutup
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: TOLAK PESANAN PO */}
      {/* ========================================================================= */}
      {selectedPO && (
        <Modal
          isOpen={isRejectModalOpen}
          onClose={() => setIsRejectModalOpen(false)}
          title={`Tolak Pesanan: ${selectedPO.poNumber}`}
          maxWidth="md"
        >
          <form onSubmit={handleRejectSubmit} className="space-y-4">
            <div className="text-xs text-slate-600 dark:text-slate-300">
              Apakah Anda yakin tidak sanggup memenuhi pesanan ini? Informasi penolakan akan dikirimkan ke Kepala SPPG & Admin Gudang untuk mencari rekanan cadangan.
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Alasan Penolakan
              </label>
              <textarea
                rows={3}
                placeholder="Contoh: Stok ayam broiler panen hari ini tidak mencukupi standar berat gramasi yang diminta SPPG..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
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
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                Konfirmasi Tolak Pesanan
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
