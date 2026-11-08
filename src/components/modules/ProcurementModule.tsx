import React, { useState } from 'react';
import { useApp } from '../../lib/store';
import { DataTable, Column } from '../common/DataTable';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { PrintHeader } from '../common/PrintHeader';
import { exportTableToPDF, exportToExcel, formatRupiah, formatNumber, triggerPrint } from '../../lib/exportUtils';
import { PurchaseOrder, PurchaseOrderItem } from '../../types';
import {
  ShoppingCart,
  Plus,
  Eye,
  CheckCircle,
  ShieldCheck,
  PackageCheck,
  Building2,
  Clock,
  Printer,
  FileText,
  AlertTriangle,
} from 'lucide-react';

export const ProcurementModule: React.FC = () => {
  const {
    purchaseOrders,
    inventory,
    addPurchaseOrder,
    verifyPurchaseOrderFinance,
    approvePurchaseOrderHead,
    updatePOQualityControl,
    receivePOToWarehouse,
    currentUser,
    hasPermission,
    sppgConfig,
  } = useApp();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isQCOpen, setIsQCOpen] = useState(false);

  // QC Form
  const [qcStatusInput, setQcStatusInput] = useState<PurchaseOrder['qcStatus']>('Lolos Penuh');
  const [qcNotesInput, setQcNotesInput] = useState('Suhu penerimaan 3.5°C, kemasan higienis, timbangan cocok.');

  // Create PO Form State
  const [supplierName, setSupplierName] = useState('PT Unggas Barokah Probolinggo');
  const [supplierContact, setSupplierContact] = useState('H. Suwandi - 0812-7788-9911');
  const [deliveryDate, setDeliveryDate] = useState('2026-11-09');
  const [poNotes, setPoNotes] = useState('Pengiriman subuh langsung ke Chiller Dapur SPPG.');
  const [poItems, setPoItems] = useState<PurchaseOrderItem[]>([
    {
      itemId: 'inv-2',
      itemName: 'Daging Ayam Broiler Fillet Segar',
      quantity: 280,
      unit: 'kg',
      unitPrice: 38000,
      subtotal: 10640000,
    },
  ]);

  const handleAddItemRow = () => {
    const firstInv = inventory[0];
    setPoItems([
      ...poItems,
      {
        itemId: firstInv.id,
        itemName: firstInv.name,
        quantity: 50,
        unit: firstInv.unit,
        unitPrice: firstInv.pricePerUnit,
        subtotal: 50 * firstInv.pricePerUnit,
      },
    ]);
  };

  const handleUpdateItemRow = (idx: number, field: keyof PurchaseOrderItem, val: any) => {
    const updated = [...poItems];
    if (field === 'itemId') {
      const matched = inventory.find(i => i.id === val);
      if (matched) {
        updated[idx].itemId = matched.id;
        updated[idx].itemName = matched.name;
        updated[idx].unit = matched.unit;
        updated[idx].unitPrice = matched.pricePerUnit;
        updated[idx].subtotal = updated[idx].quantity * matched.pricePerUnit;
      }
    } else if (field === 'quantity') {
      const q = Number(val);
      updated[idx].quantity = q;
      updated[idx].subtotal = q * updated[idx].unitPrice;
    } else if (field === 'unitPrice') {
      const p = Number(val);
      updated[idx].unitPrice = p;
      updated[idx].subtotal = updated[idx].quantity * p;
    }
    setPoItems(updated);
  };

  const handleRemoveItemRow = (idx: number) => {
    setPoItems(poItems.filter((_, i) => i !== idx));
  };

  const totalPoAmount = poItems.reduce((acc, cur) => acc + cur.subtotal, 0);

  const handleSavePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (poItems.length === 0) return;

    const poNumber = `PO/SPPG-TMG2/2026/XI/00${Math.floor(Math.random() * 90) + 90}`;
    await addPurchaseOrder({
      poNumber,
      date: new Date().toISOString().slice(0, 10),
      supplierName,
      supplierContact,
      deliveryDate,
      items: poItems,
      totalAmount: totalPoAmount,
      status: 'Menunggu Verifikasi Keuangan',
      qcStatus: 'Belum QC',
      notes: poNotes,
    });
    setIsCreateOpen(false);
  };

  const handleOpenQC = (po: PurchaseOrder) => {
    setSelectedPO(po);
    setQcStatusInput(po.qcStatus === 'Belum QC' ? 'Lolos Penuh' : po.qcStatus);
    setQcNotesInput(po.qcNotes || 'Kualitas bahan segar baik, suhu sesuai SOP.');
    setIsQCOpen(true);
  };

  const handleSaveQC = async () => {
    if (!selectedPO) return;
    await updatePOQualityControl(selectedPO.id, qcStatusInput, qcNotesInput);
    setIsQCOpen(false);
  };

  // Export handlers
  const handleExportPDF = () => {
    exportTableToPDF({
      title: 'Rekapitulasi Purchase Order Pengadaan Bahan',
      subtitle: `Satuan Pelayanan Pemenuhan Gizi (SPPG) Probolinggo Krejengan Temenggungan 2`,
      headers: ['No. PO', 'Tanggal', 'Supplier / Vendor', 'Total Nilai (Rp)', 'Status Persetujuan', 'Status QC', 'Penyetuju'],
      rows: purchaseOrders.map(p => [
        p.poNumber,
        p.date,
        p.supplierName,
        formatRupiah(p.totalAmount),
        p.status,
        p.qcStatus,
        p.approvedBy || p.verifiedByFinance || '-',
      ]),
      fileName: 'Rekap_Purchase_Order_SPPG_TMG2',
      sppgConfig,
      signerName: sppgConfig.financeOfficer,
      signerRole: 'Pengawas Keuangan SPPG',
    });
  };

  const handleExportExcel = () => {
    const dataToExport = purchaseOrders.map(p => ({
      'Nomor PO': p.poNumber,
      'Tanggal': p.date,
      'Supplier': p.supplierName,
      'Kontak Supplier': p.supplierContact,
      'Tanggal Kirim': p.deliveryDate,
      'Total Nilai': p.totalAmount,
      'Status PO': p.status,
      'Status QC': p.qcStatus,
      'Catatan QC': p.qcNotes || '-',
      'Disetujui Oleh': p.approvedBy || '-',
      'Diverifikasi Keuangan': p.verifiedByFinance || '-',
    }));
    exportToExcel(dataToExport, 'Purchase_Order_SPPG_TMG2', 'Data PO');
  };

  const columns: Column<PurchaseOrder>[] = [
    {
      key: 'poNumber',
      header: 'No. PO & Tanggal',
      render: row => (
        <div>
          <div className="font-bold text-slate-900 dark:text-white font-mono text-xs">
            {row.poNumber}
          </div>
          <div className="text-[11px] text-slate-500">
            Tgl: {row.date} • Kirim: {row.deliveryDate}
          </div>
        </div>
      ),
    },
    {
      key: 'supplierName',
      header: 'Supplier / Vendor',
      render: row => (
        <div>
          <div className="font-semibold text-slate-900 dark:text-white text-xs">
            {row.supplierName}
          </div>
          <div className="text-[11px] text-slate-500">
            {row.supplierContact}
          </div>
        </div>
      ),
    },
    {
      key: 'items',
      header: 'Rincian Barang',
      render: row => (
        <div className="text-[11px] space-y-0.5 max-w-xs">
          {row.items.map((it, idx) => (
            <div key={idx} className="truncate text-slate-700 dark:text-slate-300">
              • {it.itemName} ({formatNumber(it.quantity)} {it.unit})
            </div>
          ))}
        </div>
      ),
    },
    {
      key: 'totalAmount',
      header: 'Total Nilai PO',
      render: row => (
        <div className="font-bold text-slate-900 dark:text-white font-mono text-xs">
          {formatRupiah(row.totalAmount)}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Alur Persetujuan',
      render: row => {
        const badgeColors = {
          'Draft': 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
          'Menunggu Verifikasi Keuangan': 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
          'Disetujui Kepala': 'bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-sky-300',
          'Diterima di Gudang': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
          'Ditolak': 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
        };
        return (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeColors[row.status]}`}>
            {row.status}
          </span>
        );
      },
    },
    {
      key: 'qcStatus',
      header: 'Quality Control',
      render: row => {
        const qcBadge = {
          'Belum QC': 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
          'Lolos Penuh': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
          'Lolos Sebagian': 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
          'Ditolak': 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
        };
        return (
          <div className="space-y-0.5">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${qcBadge[row.qcStatus]}`}>
              {row.qcStatus}
            </span>
            {row.qcNotes && (
              <div className="text-[10px] text-slate-500 truncate max-w-[140px]">
                {row.qcNotes}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Aksi & Tindakan',
      align: 'right',
      render: row => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => {
              setSelectedPO(row);
              setIsDetailOpen(true);
            }}
            className="p-1.5 text-slate-600 hover:text-blue-900 dark:text-slate-400 dark:hover:text-sky-300 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Lihat Detail PO"
          >
            <Eye className="w-4 h-4" />
          </button>

          {/* Finance Verification */}
          {(currentUser.role === 'Pengawas Keuangan' || currentUser.role === 'Admin Utama') &&
            row.status === 'Menunggu Verifikasi Keuangan' && (
              <button
                onClick={() => verifyPurchaseOrderFinance(row.id, currentUser.name)}
                className="px-2 py-1 text-[10px] font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-md shadow-xs transition"
                title="Verifikasi Anggaran Keuangan"
              >
                Verifikasi Kas
              </button>
            )}

          {/* Head Approval */}
          {(currentUser.role === 'Kepala SPPG' || currentUser.role === 'Admin Utama') &&
            (row.status === 'Draft' || row.status === 'Menunggu Verifikasi Keuangan') && (
              <button
                onClick={() => approvePurchaseOrderHead(row.id, currentUser.name)}
                className="px-2 py-1 text-[10px] font-bold bg-blue-900 hover:bg-blue-800 dark:bg-sky-600 text-white rounded-md shadow-xs transition"
                title="Setujui PO"
              >
                Setujui Kepala
              </button>
            )}

          {/* QC Inspection Button */}
          {row.status === 'Disetujui Kepala' && (
            <button
              onClick={() => handleOpenQC(row)}
              className="p-1.5 text-purple-600 hover:text-purple-800 rounded-md hover:bg-purple-50 dark:hover:bg-purple-950 transition"
              title="Input Hasil Uji Mutu QC"
            >
              <ShieldCheck className="w-4 h-4" />
            </button>
          )}

          {/* Receive to Gudang */}
          {row.status === 'Disetujui Kepala' && row.qcStatus !== 'Belum QC' && row.qcStatus !== 'Ditolak' && (
            <button
              onClick={() => receivePOToWarehouse(row.id)}
              className="px-2 py-1 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md shadow-xs transition flex items-center gap-1"
              title="Terima Barang & Tambah Stok Gudang"
            >
              <PackageCheck className="w-3.5 h-3.5" />
              <span>Masuk Gudang</span>
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-blue-900 dark:text-sky-400" />
            Pengadaan Bahan Pangan & Purchase Order
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Pengajuan Pesanan, Verifikasi Anggaran, Quality Control (QC) & Penerimaan Gudang
          </p>
        </div>

        {hasPermission('procurement', 'create') && (
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900 hover:bg-blue-800 dark:bg-sky-600 dark:hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Purchase Order Baru</span>
          </button>
        )}
      </div>

      {/* PO Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs text-slate-500 uppercase font-bold">Total PO Terbit</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {purchaseOrders.length} Dokumen
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Bulan Berjalan November 2026</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs text-slate-500 uppercase font-bold">Total Nilai Pengadaan</div>
          <div className="text-2xl font-black text-blue-900 dark:text-sky-400 mt-1">
            {formatRupiah(purchaseOrders.reduce((a, b) => a + b.totalAmount, 0))}
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">Sesuai Alokasi RAB</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs text-slate-500 uppercase font-bold">PO Menunggu Approval</div>
          <div className="text-2xl font-black text-amber-600 mt-1">
            {purchaseOrders.filter(p => p.status === 'Draft' || p.status === 'Menunggu Verifikasi Keuangan').length} PO
          </div>
          <div className="text-[11px] text-amber-600 font-semibold mt-0.5">Butuh Validasi</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs text-slate-500 uppercase font-bold">Barang Masuk Gudang</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {purchaseOrders.filter(p => p.status === 'Diterima di Gudang').length} PO
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Tervalidasi QC 100%</div>
        </div>
      </div>

      {/* PO Data Table */}
      <DataTable
        title="Daftar Dokumen Purchase Order SPPG"
        subtitle="Alur terpadu pengadaan bahan baku pangan berstandar Halal dan Higienis"
        data={purchaseOrders}
        columns={columns}
        keyExtractor={item => item.id}
        searchPlaceholder="Cari nomor PO, nama supplier, atau item barang..."
        searchKeys={['poNumber', 'supplierName', 'notes']}
        onExportPDF={handleExportPDF}
        onExportExcel={handleExportExcel}
        onPrint={triggerPrint}
      />

      {/* Modal: Create PO */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Buat Purchase Order Pengadaan Bahan Pangan"
        subtitle="Surat Pemesanan resmi untuk rekanan supplier SPPG Temenggungan 2"
        maxWidth="3xl"
      >
        <form onSubmit={handleSavePO} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nama Rekanan Supplier *
              </label>
              <input
                type="text"
                required
                value={supplierName}
                onChange={e => setSupplierName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Kontak / No. Telepon Supplier
              </label>
              <input
                type="text"
                value={supplierContact}
                onChange={e => setSupplierContact(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tanggal Rencana Kirim *
              </label>
              <input
                type="date"
                required
                value={deliveryDate}
                onChange={e => setDeliveryDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                Daftar Item Pesanan Bahan Pangan
              </h5>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-900 dark:text-sky-400 hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Baris Item</span>
              </button>
            </div>

            <div className="space-y-2">
              {poItems.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center text-xs">
                  <div className="col-span-5">
                    <select
                      value={item.itemId}
                      onChange={e => handleUpdateItemRow(idx, 'itemId', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    >
                      {inventory.map(inv => (
                        <option key={inv.id} value={inv.id}>
                          {inv.name} (Stok: {inv.currentStock} {inv.unit})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={e => handleUpdateItemRow(idx, 'quantity', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      placeholder="Harga"
                      value={item.unitPrice}
                      onChange={e => handleUpdateItemRow(idx, 'unitPrice', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                  <div className="col-span-2 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                    {formatRupiah(item.subtotal)}
                  </div>
                  <div className="col-span-1 text-center">
                    {poItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItemRow(idx)}
                        className="text-rose-500 hover:text-rose-700"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300">Total Nilai Pesanan:</span>
              <span className="text-base font-black font-mono text-blue-900 dark:text-sky-400">
                {formatRupiah(totalPoAmount)}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Catatan Pengiriman & Instruksi Khusus
            </label>
            <textarea
              rows={2}
              value={poNotes}
              onChange={e => setPoNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 dark:bg-sky-600 dark:hover:bg-sky-500 rounded-lg shadow-sm transition"
            >
              Terbitkan Purchase Order
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: QC Inspection Form */}
      <Modal
        isOpen={isQCOpen}
        onClose={() => setIsQCOpen(false)}
        title="Quality Control (QC) Penerimaan Barang"
        subtitle={`Pemeriksaan fisik bahan pangan untuk PO: ${selectedPO?.poNumber}`}
        maxWidth="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Hasil Uji Mutu & Sanitasi *
            </label>
            <select
              value={qcStatusInput}
              onChange={e => setQcStatusInput(e.target.value as any)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
            >
              <option value="Lolos Penuh">Lolos Penuh (Semua parameter higienis terpenuhi)</option>
              <option value="Lolos Sebagian">Lolos Sebagian (Ada toleransi timbangan minor)</option>
              <option value="Ditolak">Ditolak (Bau tidak segar, rusak, atau suhu buruk)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Catatan Pemeriksaan Fisik & Suhu (°C)
            </label>
            <textarea
              rows={3}
              value={qcNotesInput}
              onChange={e => setQcNotesInput(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setIsQCOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-lg transition"
            >
              Batal
            </button>
            <button
              onClick={handleSaveQC}
              className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm transition"
            >
              Simpan Hasil QC
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: Print Preview PO */}
      {selectedPO && isDetailOpen && (
        <Modal
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          title={`Purchase Order: ${selectedPO.poNumber}`}
          subtitle={`Tanggal Terbit: ${selectedPO.date} • Rekanan: ${selectedPO.supplierName}`}
          maxWidth="2xl"
        >
          <div className="space-y-4 print-section">
            <PrintHeader
              title="Surat Pesanan Pembelian Bahan Pangan (Purchase Order)"
              subtitle={`Program Makan Bergizi Gratis (MBG) • SPPG TMG2`}
              docNumber={selectedPO.poNumber}
            />

            <div className="grid grid-cols-2 gap-4 text-xs p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
              <div>
                <span className="text-slate-400">Pemasok / Supplier:</span>
                <div className="font-bold text-slate-900 dark:text-white">{selectedPO.supplierName}</div>
                <div className="text-slate-500">{selectedPO.supplierContact}</div>
              </div>
              <div>
                <span className="text-slate-400">Rencana Pengiriman:</span>
                <div className="font-bold text-slate-900 dark:text-white">{selectedPO.deliveryDate}</div>
                <div className="text-slate-500">Tujuan: Gudang & Dapur SPPG Temenggungan 2</div>
              </div>
            </div>

            <table className="w-full text-xs text-left border border-slate-200 dark:border-slate-700">
              <thead className="bg-slate-100 dark:bg-slate-800 font-bold">
                <tr>
                  <th className="p-2">Item Barang</th>
                  <th className="p-2 text-right">Kuantitas</th>
                  <th className="p-2 text-right">Harga Satuan</th>
                  <th className="p-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                {selectedPO.items.map((it, idx) => (
                  <tr key={idx}>
                    <td className="p-2 font-sans font-medium">{it.itemName}</td>
                    <td className="p-2 text-right">{it.quantity} {it.unit}</td>
                    <td className="p-2 text-right">{formatRupiah(it.unitPrice)}</td>
                    <td className="p-2 text-right font-bold">{formatRupiah(it.subtotal)}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50 dark:bg-slate-800/60 font-bold">
                  <td colSpan={3} className="p-2 text-right font-sans">Total Pembelian:</td>
                  <td className="p-2 text-right text-blue-900 dark:text-sky-400 font-black">{formatRupiah(selectedPO.totalAmount)}</td>
                </tr>
              </tbody>
            </table>

            {/* Signature Block */}
            <div className="pt-6 grid grid-cols-2 text-center text-xs">
              <div>
                <div className="text-slate-500">Diverifikasi Anggaran:</div>
                <div className="font-bold text-slate-800 dark:text-slate-200 mt-12">
                  {selectedPO.verifiedByFinance || sppgConfig.financeOfficer}
                </div>
                <div className="text-[10px] text-slate-400">Pengawas Keuangan SPPG</div>
              </div>
              <div>
                <div className="text-slate-500">Disetujui:</div>
                <div className="font-bold text-slate-800 dark:text-slate-200 mt-12">
                  {selectedPO.approvedBy || sppgConfig.headOfSppg}
                </div>
                <div className="text-[10px] text-slate-400">Kepala SPPG Temenggungan 2</div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={triggerPrint}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs font-bold rounded-lg transition flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Lembar PO</span>
              </button>
              <button
                onClick={() => setIsDetailOpen(false)}
                className="px-4 py-2 bg-blue-900 text-white rounded-lg text-xs font-bold"
              >
                Tutup
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
