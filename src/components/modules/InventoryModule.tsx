import React, { useState } from 'react';
import { useApp } from '../../lib/store';
import { DataTable, Column } from '../common/DataTable';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { exportTableToPDF, exportToExcel, formatRupiah, formatNumber, triggerPrint } from '../../lib/exportUtils';
import { InventoryItem } from '../../types';
import {
  Boxes,
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Warehouse,
  CheckCircle,
  Package,
} from 'lucide-react';

export const InventoryModule: React.FC = () => {
  const {
    inventory,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    adjustStock,
    hasPermission,
    sppgConfig,
  } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [adjustDelta, setAdjustDelta] = useState<number>(10);
  const [adjustType, setAdjustType] = useState<'IN' | 'OUT'>('IN');
  const [adjustReason, setAdjustReason] = useState('Penerimaan belanja pasar lokal');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  // Form State
  const [formData, setFormData] = useState<Omit<InventoryItem, 'id'>>({
    code: 'BHK-009',
    name: '',
    category: 'Bahan Segar',
    currentStock: 100,
    minimumStock: 50,
    unit: 'kg',
    pricePerUnit: 25000,
    storageLocation: 'Gudang Kering A',
    supplierName: 'Koperasi Pasar Krejengan',
    lastRestocked: new Date().toISOString().slice(0, 10),
    expiryDate: '2026-12-31',
    qualityStatus: 'Baik',
  });

  const handleOpenCreate = () => {
    setSelectedItem(null);
    setFormData({
      code: `BHK-0${Math.floor(Math.random() * 80) + 20}`,
      name: '',
      category: 'Bahan Segar',
      currentStock: 100,
      minimumStock: 40,
      unit: 'kg',
      pricePerUnit: 20000,
      storageLocation: 'Chiller Dapur',
      supplierName: 'Koperasi Pasar Krejengan',
      lastRestocked: new Date().toISOString().slice(0, 10),
      expiryDate: '2026-11-20',
      qualityStatus: 'Baik',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: InventoryItem) => {
    setSelectedItem(item);
    setFormData({ ...item });
    setIsModalOpen(true);
  };

  const handleOpenAdjust = (item: InventoryItem) => {
    setSelectedItem(item);
    setAdjustDelta(10);
    setAdjustType('IN');
    setAdjustReason('Penerimaan bahan tambahan dari supplier');
    setIsAdjustOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItem) {
      await updateInventoryItem(selectedItem.id, formData);
    } else {
      await addInventoryItem(formData);
    }
    setIsModalOpen(false);
  };

  const handleSaveAdjust = async () => {
    if (!selectedItem) return;
    const finalDelta = adjustType === 'IN' ? Math.abs(adjustDelta) : -Math.abs(adjustDelta);
    await adjustStock(selectedItem.id, finalDelta, adjustReason);
    setIsAdjustOpen(false);
  };

  // Filtered by category
  const filteredInventory = filterCategory === 'ALL'
    ? inventory
    : inventory.filter(i => i.category === filterCategory);

  const criticalCount = inventory.filter(i => i.currentStock <= i.minimumStock).length;
  const totalValuation = inventory.reduce((acc, i) => acc + i.currentStock * i.pricePerUnit, 0);

  // Export handlers
  const handleExportPDF = () => {
    exportTableToPDF({
      title: 'Laporan Inventaris Stok Bahan Gudang SPPG',
      subtitle: `Satuan Pelayanan Pemenuhan Gizi (SPPG) Probolinggo Krejengan Temenggungan 2`,
      headers: ['Kode', 'Nama Bahan', 'Kategori', 'Stok Saat Ini', 'Batas Min', 'Lokasi Simpan', 'Kondisi Mutu'],
      rows: filteredInventory.map(i => [
        i.code,
        i.name,
        i.category,
        `${formatNumber(i.currentStock)} ${i.unit}`,
        `${formatNumber(i.minimumStock)} ${i.unit}`,
        i.storageLocation,
        i.qualityStatus,
      ]),
      fileName: 'Inventaris_Gudang_SPPG_TMG2',
      sppgConfig,
      signerName: sppgConfig.headOfSppg,
      signerRole: 'Kepala SPPG Temenggungan 2',
    });
  };

  const handleExportExcel = () => {
    const dataToExport = filteredInventory.map(i => ({
      'Kode Barang': i.code,
      'Nama Bahan Pangan': i.name,
      'Kategori': i.category,
      'Stok Saat Ini': i.currentStock,
      'Satuan': i.unit,
      'Stok Minimum': i.minimumStock,
      'Harga Satuan (Rp)': i.pricePerUnit,
      'Nilai Total (Rp)': i.currentStock * i.pricePerUnit,
      'Lokasi Penyimpanan': i.storageLocation,
      'Pemasok / Supplier': i.supplierName,
      'Terakhir Restock': i.lastRestocked,
      'Tgl Kadaluarsa': i.expiryDate,
      'Status Mutu': i.qualityStatus,
    }));
    exportToExcel(dataToExport, 'Inventaris_Stok_SPPG_TMG2', 'Stok Gudang');
  };

  const columns: Column<InventoryItem>[] = [
    {
      key: 'name',
      header: 'Nama Bahan & Kode',
      render: row => (
        <div>
          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <span>{row.name}</span>
          </div>
          <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2">
            <span>Kode: {row.code}</span>
            <span>•</span>
            <span className="text-slate-400">{row.category}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'currentStock',
      header: 'Level Stok Fisik',
      render: row => {
        const isBelowMin = row.currentStock <= row.minimumStock;
        const isNearMin = row.currentStock <= row.minimumStock * 1.25 && !isBelowMin;

        return (
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                {formatNumber(row.currentStock)} {row.unit}
              </span>
              {isBelowMin ? (
                <span className="px-1.5 py-0.5 rounded-xs text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 flex items-center gap-1 animate-pulse">
                  <AlertTriangle className="w-3 h-3" />
                  Kritis
                </span>
              ) : isNearMin ? (
                <span className="px-1.5 py-0.5 rounded-xs text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  Menipis
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded-xs text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Aman
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-400">
              Batas minimum: {formatNumber(row.minimumStock)} {row.unit}
            </div>
          </div>
        );
      },
    },
    {
      key: 'storageLocation',
      header: 'Lokasi Simpan',
      render: row => (
        <div className="text-xs">
          <div className="font-semibold text-slate-800 dark:text-slate-200">
            {row.storageLocation}
          </div>
          <div className="text-[10px] text-slate-400">
            Pemasok: {row.supplierName}
          </div>
        </div>
      ),
    },
    {
      key: 'pricePerUnit',
      header: 'Harga & Valuasi',
      render: row => (
        <div className="text-xs font-mono">
          <div className="font-semibold text-slate-900 dark:text-white">
            {formatRupiah(row.pricePerUnit)} / {row.unit}
          </div>
          <div className="text-[10px] text-slate-500">
            Total: {formatRupiah(row.currentStock * row.pricePerUnit)}
          </div>
        </div>
      ),
    },
    {
      key: 'expiryDate',
      header: 'Kadaluarsa & Kondisi',
      render: row => (
        <div className="text-xs">
          <div className="font-mono text-slate-700 dark:text-slate-300">
            Exp: {row.expiryDate}
          </div>
          <div className="text-[10px] text-emerald-600 font-semibold">
            Mutu: {row.qualityStatus}
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
          {/* Quick stock in/out button */}
          <button
            onClick={() => handleOpenAdjust(row)}
            className="px-2 py-1 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 rounded-md text-[11px] font-bold transition flex items-center gap-1"
            title="Sesuaikan Stok Fisik"
          >
            <span>Stok</span>
          </button>

          {hasPermission('inventory', 'edit') && (
            <button
              onClick={() => handleOpenEdit(row)}
              className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-sky-400 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950 transition"
              title="Edit Data Item"
            >
              <Edit className="w-4 h-4" />
            </button>
          )}

          {hasPermission('inventory', 'delete') && (
            <button
              onClick={() => setDeleteId(row.id)}
              className="p-1.5 text-rose-500 hover:text-rose-700 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950 transition"
              title="Hapus Item"
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
      {/* Module Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Boxes className="w-6 h-6 text-blue-900 dark:text-sky-400" />
            Manajemen Gudang & Stok Bahan Pangan
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Pengendalian Persediaan, Suhu Chiller, Batas Safety Stock & FIFO
          </p>
        </div>

        {hasPermission('inventory', 'create') && (
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900 hover:bg-blue-800 dark:bg-sky-600 dark:hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Bahan Pangan</span>
          </button>
        )}
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs text-slate-500 uppercase font-bold">Total Jenis Bahan</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {inventory.length} Item
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Bahan Kering & Segar</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs text-slate-500 uppercase font-bold">Item Kritis (Di Bawah Min)</div>
          <div className={`text-2xl font-black mt-1 ${criticalCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {criticalCount} Item
          </div>
          <div className="text-[11px] text-rose-600 font-semibold mt-0.5">
            {criticalCount > 0 ? 'Perlu Pengadaan Segera' : 'Semua Stok Aman'}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs text-slate-500 uppercase font-bold">Valuasi Stok Gudang</div>
          <div className="text-2xl font-black text-blue-900 dark:text-sky-400 mt-1">
            {formatRupiah(totalValuation)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Nilai aset logistik</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs text-slate-500 uppercase font-bold">Kondisi Chiller & Freezer</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            3.2°C / -18°C
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">Standar HACCP Memenuhi</div>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-400 font-bold uppercase text-[11px] mr-1">Kategori:</span>
        {['ALL', 'Bahan Segar', 'Bahan Kering', 'Bumbu & Rempah', 'Kemasan & Higiene'].map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
              filterCategory === cat
                ? 'bg-blue-900 text-white dark:bg-sky-600'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {cat === 'ALL' ? 'Semua Kategori' : cat}
          </button>
        ))}
      </div>

      {/* Inventory Data Table */}
      <DataTable
        title="Daftar Inventaris Bahan Pangan SPPG TMG2"
        subtitle="Monitoring stok fisik, penyesuaian opname, dan peringatan batas minimum"
        data={filteredInventory}
        columns={columns}
        keyExtractor={item => item.id}
        searchPlaceholder="Cari nama bahan, kode, lokasi, atau supplier..."
        searchKeys={['name', 'code', 'category', 'storageLocation', 'supplierName']}
        onExportPDF={handleExportPDF}
        onExportExcel={handleExportExcel}
        onPrint={triggerPrint}
      />

      {/* Modal: Quick Stock Adjustment */}
      <Modal
        isOpen={isAdjustOpen}
        onClose={() => setIsAdjustOpen(false)}
        title="Penyesuaian Stok Fisik Gudang (Stock Opname)"
        subtitle={`Bahan: ${selectedItem?.name} (Stok Saat Ini: ${selectedItem?.currentStock} ${selectedItem?.unit})`}
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setAdjustType('IN')}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 text-xs font-bold transition ${
                adjustType === 'IN'
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-500'
              }`}
            >
              <ArrowUpRight className="w-5 h-5 text-emerald-600" />
              <span>Stok Masuk (+)</span>
            </button>
            <button
              type="button"
              onClick={() => setAdjustType('OUT')}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 text-xs font-bold transition ${
                adjustType === 'OUT'
                  ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-500'
              }`}
            >
              <ArrowDownRight className="w-5 h-5 text-rose-600" />
              <span>Stok Keluar / Pakai (-)</span>
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Jumlah Perubahan ({selectedItem?.unit}) *
            </label>
            <input
              type="number"
              min="1"
              value={adjustDelta}
              onChange={e => setAdjustDelta(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Alasan Penyesuaian / Keterangan *
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Pemakaian masak batch subuh / Penerimaan PO supplier"
              value={adjustReason}
              onChange={e => setAdjustReason(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsAdjustOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-lg transition"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSaveAdjust}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 dark:bg-sky-600 rounded-lg shadow-sm transition"
            >
              Terapkan Perubahan Stok
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: Form Create / Edit Item */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedItem ? 'Edit Data Bahan Pangan' : 'Tambah Bahan Pangan ke Inventaris'}
        subtitle="Pencatatan spesifikasi bahan, safety stock, dan supplier"
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveItem} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Kode Bahan *
              </label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={e => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nama Bahan Pangan *
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Beras Rojolele Premium"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Kategori Bahan *
              </label>
              <select
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                {['Bahan Segar', 'Bahan Kering', 'Bumbu & Rempah', 'Kemasan & Higiene', 'Pelengkap'].map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Lokasi Penyimpanan *
              </label>
              <select
                value={formData.storageLocation}
                onChange={e => setFormData({ ...formData, storageLocation: e.target.value as any })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="Gudang Kering A">Gudang Kering A</option>
                <option value="Gudang Kering B">Gudang Kering B</option>
                <option value="Cold Storage 1">Cold Storage 1</option>
                <option value="Chiller Dapur">Chiller Dapur</option>
                <option value="Rak Bumbu">Rak Bumbu</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Stok Awal Fisik *
              </label>
              <input
                type="number"
                min="0"
                value={formData.currentStock}
                onChange={e => setFormData({ ...formData, currentStock: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Batas Minimum (Safety Stock) *
              </label>
              <input
                type="number"
                min="1"
                value={formData.minimumStock}
                onChange={e => setFormData({ ...formData, minimumStock: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-rose-600 font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Satuan Ukuran *
              </label>
              <select
                value={formData.unit}
                onChange={e => setFormData({ ...formData, unit: e.target.value as any })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                {['kg', 'gram', 'liter', 'butir', 'ikat', 'pak', 'karton'].map(u => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Harga Beli Satuan (Rp) *
              </label>
              <input
                type="number"
                value={formData.pricePerUnit}
                onChange={e => setFormData({ ...formData, pricePerUnit: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nama Pemasok / Supplier
              </label>
              <input
                type="text"
                placeholder="UD Sumber Pangan Krejengan"
                value={formData.supplierName}
                onChange={e => setFormData({ ...formData, supplierName: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
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
              Simpan Item Inventaris
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Dialog: Delete */}
      <ConfirmDialog
        isOpen={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={async () => {
          if (deleteId) await deleteInventoryItem(deleteId);
        }}
        title="Hapus Item Inventaris"
        message="Apakah Anda yakin ingin menghapus bahan pangan ini dari daftar gudang?"
        isDestructive={true}
      />
    </div>
  );
};
