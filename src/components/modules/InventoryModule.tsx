import React, { useState, useMemo } from 'react';
import { useApp } from '../../lib/store';
import { DataTable, Column } from '../common/DataTable';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { PrintHeader } from '../common/PrintHeader';
import {
  exportTableToPDF,
  exportToExcel,
  formatRupiah,
  formatNumber,
  triggerPrint,
  formatIndonesianDate,
} from '../../lib/exportUtils';
import {
  InventoryItem,
  StockMutation,
  StockOpnameRecord,
  StockBatch,
  MutationType,
} from '../../types';
import {
  defaultInventoryItemsWithBatches,
  defaultStockMutations,
  defaultStockOpnameRecords,
} from '../../lib/inventoryData';
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
  Calendar,
  Clock,
  Printer,
  FileSpreadsheet,
  Search,
  ArrowRightLeft,
  RotateCcw,
  ClipboardList,
  History,
  TrendingDown,
  TrendingUp,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  FileText,
  BadgeAlert,
  Layers,
  Sparkles,
  Info,
  Scale,
  DollarSign,
  UserCheck,
  Check,
  Camera,
  Upload,
  Eye,
  X,
  Calculator,
} from 'lucide-react';
import { processFacilityImageUpload } from '../common/FacilityTempUploadSection';

type InventoryTab =
  | 'stok_gudang'
  | 'mutasi_barang'
  | 'kartu_stok'
  | 'stok_opname'
  | 'rekap_penggunaan';

export const InventoryModule: React.FC = () => {
  const {
    inventory,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    adjustStock,
    masterSuppliers,
    currentUser,
    hasPermission,
    sppgConfig,
    addToast,
  } = useApp();

  // Active Sub-Tab
  const [activeTab, setActiveTab] = useState<InventoryTab>('stok_gudang');

  // Master Inventory State with Batches & Initial Stock
  const [items, setItems] = useState<InventoryItem[]>(defaultInventoryItemsWithBatches);

  // Stock Mutations History (Immutable Audit Trail)
  const [mutations, setMutations] = useState<StockMutation[]>(defaultStockMutations);

  // Stock Opname Records
  const [opnameList, setOpnameList] = useState<StockOpnameRecord[]>(defaultStockOpnameRecords);

  // Selected Item for Stock Card Ledger
  const [selectedStockCardItemId, setSelectedStockCardItemId] = useState<string>(items[0]?.id || 'inv-1');

  // Filter States for Inventory Tab
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterStockStatus, setFilterStockStatus] = useState<'ALL' | 'CRITICAL' | 'SAFE'>('ALL');

  // Filter Mutation Type
  const [filterMutationType, setFilterMutationType] = useState<string>('ALL');

  // Modal: Create / Edit Inventory Item
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [itemFormData, setItemFormData] = useState<Omit<InventoryItem, 'id'>>({
    code: 'BHK-011',
    name: '',
    category: 'Bahan Segar',
    initialStock: 100,
    currentStock: 100,
    minimumStock: 50,
    unit: 'kg',
    pricePerUnit: 25000,
    storageLocation: 'Cold Storage 1',
    supplierName: masterSuppliers[0]?.name || 'Supplier Mitra',
    lastRestocked: new Date().toISOString().slice(0, 10),
    expiryDate: new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10),
    qualityStatus: 'Baik',
  });

  // Modal: Quick Transaction (Barang Masuk / Barang Keluar / Retur)
  const [isMutationModalOpen, setIsMutationModalOpen] = useState(false);
  const [mutationForm, setMutationForm] = useState({
    itemId: items[0]?.id || 'inv-1',
    type: 'Barang Masuk' as MutationType,
    orderedQuantity: 50,
    quantity: 50,
    referenceNumber: `IN-PO-26110${defaultStockMutations.length + 1}`,
    batchNumber: `BATCH-261108-${Math.floor(Math.random() * 80) + 10}`,
    expiryDate: new Date(Date.now() + 86400000 * 10).toISOString().slice(0, 10),
    supplierName: masterSuppliers[0]?.name || 'Koperasi Pasar Krejengan',
    recipientOrDepartment: 'Div. Pengolahan / Dapur Utama',
    photoUrl: '',
    notes: 'Penerimaan bahan pangan sesuai standar mutu',
    operatorName: currentUser.name,
  });
  const [viewMutationPhotoUrl, setViewMutationPhotoUrl] = useState<string | null>(null);

  // Modal: Stok Opname
  const [isOpnameModalOpen, setIsOpnameModalOpen] = useState(false);
  const [opnameForm, setOpnameForm] = useState({
    itemId: items[0]?.id || 'inv-1',
    physicalStock: 100,
    reason: 'Penghitungan fisik berkala mingguan.',
    inspectorName: currentUser.name,
  });

  // Delete Item Confirmation
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // COMPUTED VALUES & KPI SUMMARY
  // ---------------------------------------------------------------------------
  // Selected Item for Stock Card
  const selectedStockCardItem = useMemo(() => {
    return items.find(i => i.id === selectedStockCardItemId) || items[0];
  }, [items, selectedStockCardItemId]);

  // Mutations filtered for the selected Stock Card
  const stockCardMutations = useMemo(() => {
    return mutations
      .filter(m => m.itemId === selectedStockCardItemId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [mutations, selectedStockCardItemId]);

  // Filtered Inventory List
  const filteredInventory = useMemo(() => {
    return items.filter(item => {
      const matchCat = filterCategory === 'ALL' || item.category === filterCategory;
      const isCritical = item.currentStock <= item.minimumStock;
      const matchStatus =
        filterStockStatus === 'ALL'
          ? true
          : filterStockStatus === 'CRITICAL'
          ? isCritical
          : !isCritical;
      return matchCat && matchStatus;
    });
  }, [items, filterCategory, filterStockStatus]);

  // Filtered Mutations List
  const filteredMutations = useMemo(() => {
    if (filterMutationType === 'ALL') return mutations;
    return mutations.filter(m => m.type === filterMutationType);
  }, [mutations, filterMutationType]);

  // Overall KPI Metrics
  const kpiData = useMemo(() => {
    const totalItems = items.length;
    const criticalItems = items.filter(i => i.currentStock <= i.minimumStock);
    const criticalCount = criticalItems.length;

    // Total valuation
    const totalValuation = items.reduce((acc, i) => acc + i.currentStock * i.pricePerUnit, 0);

    // Items with expiry within 5 days (FEFO alerts)
    const now = new Date().getTime();
    const expiringSoonItems = items.filter(i => {
      const exp = new Date(i.expiryDate).getTime();
      const diffDays = (exp - now) / (1000 * 3600 * 24);
      return diffDays >= 0 && diffDays <= 5;
    });

    return {
      totalItems,
      criticalCount,
      criticalItems,
      totalValuation,
      expiringSoonItems,
    };
  }, [items]);

  // Selected item in mutation form
  const selectedItemForMutation = useMemo(() => {
    return items.find(i => i.id === mutationForm.itemId) || items[0];
  }, [items, mutationForm.itemId]);

  // Selected item in opname form
  const selectedItemForOpname = useMemo(() => {
    return items.find(i => i.id === opnameForm.itemId) || items[0];
  }, [items, opnameForm.itemId]);

  // ---------------------------------------------------------------------------
  // HANDLERS: ITEM CRUD
  // ---------------------------------------------------------------------------
  const handleOpenCreateItem = () => {
    setEditingItem(null);
    setItemFormData({
      code: `BHK-0${items.length + 1}`,
      name: '',
      category: 'Bahan Segar',
      initialStock: 100,
      currentStock: 100,
      minimumStock: 40,
      unit: 'kg',
      pricePerUnit: 25000,
      storageLocation: 'Chiller Dapur',
      supplierName: masterSuppliers[0]?.name || 'Koperasi Pasar Krejengan',
      lastRestocked: new Date().toISOString().slice(0, 10),
      expiryDate: new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10),
      qualityStatus: 'Baik',
    });
    setIsItemModalOpen(true);
  };

  const handleOpenEditItem = (item: InventoryItem) => {
    setEditingItem(item);
    setItemFormData({ ...item });
    setIsItemModalOpen(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      setItems(prev =>
        prev.map(i =>
          i.id === editingItem.id
            ? {
                ...i,
                ...itemFormData,
                initialStock: Number(itemFormData.initialStock),
                currentStock: Number(itemFormData.currentStock),
                minimumStock: Number(itemFormData.minimumStock),
                pricePerUnit: Number(itemFormData.pricePerUnit),
              }
            : i
        )
      );
      addToast('success', 'Item Diperbarui', `Data bahan ${itemFormData.name} berhasil diperbarui.`);
    } else {
      const newItem: InventoryItem = {
        id: `inv-${Date.now()}`,
        ...itemFormData,
        initialStock: Number(itemFormData.initialStock),
        currentStock: Number(itemFormData.currentStock),
        minimumStock: Number(itemFormData.minimumStock),
        pricePerUnit: Number(itemFormData.pricePerUnit),
        batches: [
          {
            id: `b-${Date.now()}`,
            batchNumber: `BATCH-INIT-${Math.floor(Math.random() * 80) + 10}`,
            receivedDate: itemFormData.lastRestocked,
            expiryDate: itemFormData.expiryDate,
            initialQty: Number(itemFormData.currentStock),
            remainingQty: Number(itemFormData.currentStock),
            unitPrice: Number(itemFormData.pricePerUnit),
            supplierName: itemFormData.supplierName,
          },
        ],
      };

      setItems(prev => [...prev, newItem]);

      // Record initial stock mutation entry
      const initMutation: StockMutation = {
        id: `mut-${Date.now()}`,
        itemId: newItem.id,
        itemCode: newItem.code,
        itemName: newItem.name,
        date: newItem.lastRestocked,
        timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
        type: 'Stok Awal',
        referenceNumber: `SA-${newItem.code}`,
        unit: newItem.unit,
        quantityIn: newItem.initialStock,
        quantityOut: 0,
        balance: newItem.initialStock,
        unitPrice: newItem.pricePerUnit,
        totalPrice: newItem.initialStock * newItem.pricePerUnit,
        notes: 'Pencatatan saldo stok awal item baru',
        operatorName: currentUser.name,
      };
      setMutations(prev => [initMutation, ...prev]);

      addToast('success', 'Bahan Terdaftar', `Item baru ${newItem.name} berhasil ditambahkan ke inventaris.`);
    }
    setIsItemModalOpen(false);
  };

  const handleDeleteItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    setDeleteItemId(null);
    addToast('info', 'Item Dihapus', 'Data item bahan pangan berhasil dihapus dari inventaris.');
  };

  // ---------------------------------------------------------------------------
  // HANDLERS: MUTASI BARANG (BARANG MASUK / KELUAR / RETUR)
  // ---------------------------------------------------------------------------
  // Formula: Stok Akhir = Stok Awal + Barang Masuk - Barang Keluar
  const handleOpenQuickMutation = (
    item: InventoryItem,
    type: MutationType = 'Barang Masuk'
  ) => {
    setMutationForm({
      itemId: item.id,
      type,
      orderedQuantity: type === 'Barang Masuk' ? 50 : 0,
      quantity: type === 'Barang Keluar' ? Math.min(item.currentStock, 30) : 50,
      referenceNumber:
        type === 'Barang Masuk'
          ? `IN-RCV-26110${mutations.length + 1}`
          : type === 'Barang Keluar'
          ? `OUT-PRD-26110${mutations.length + 1}`
          : `RET-SUP-26110${mutations.length + 1}`,
      batchNumber: `BATCH-${item.code.slice(-3)}-${Date.now().toString().slice(-4)}`,
      expiryDate: new Date(Date.now() + 86400000 * 8).toISOString().slice(0, 10),
      supplierName: item.supplierName,
      recipientOrDepartment: type === 'Barang Keluar' ? 'Div. Pengolahan' : item.supplierName,
      photoUrl: '',
      notes:
        type === 'Barang Masuk'
          ? 'Penerimaan bahan tambahan dari supplier'
          : type === 'Barang Keluar'
          ? 'Pengeluaran untuk produksi makan siang MBG 2.850 porsi'
          : 'Retur ke supplier karena bahan tidak sesuai standar mutu',
      operatorName: currentUser.name,
    });
    setIsMutationModalOpen(true);
  };

  const handleSaveMutation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForMutation) return;

    const qty = Number(mutationForm.quantity);
    if (qty <= 0) {
      addToast('error', 'Kuantitas Tidak Valid', 'Jumlah mutasi harus lebih besar dari 0.');
      return;
    }

    // Validation: Barang Keluar & Retur Keluar tidak boleh melebihi stok saat ini
    const isOutflow =
      mutationForm.type === 'Barang Keluar' || mutationForm.type === 'Retur Keluar';
    if (isOutflow && qty > selectedItemForMutation.currentStock) {
      addToast(
        'error',
        'Stok Tidak Cukup',
        `Kuantitas pengeluaran (${qty} ${selectedItemForMutation.unit}) melebihi stok tersedia (${selectedItemForMutation.currentStock} ${selectedItemForMutation.unit}).`
      );
      return;
    }

    const qtyIn = isOutflow ? 0 : qty;
    const qtyOut = isOutflow ? qty : 0;
    const newStockBalance = selectedItemForMutation.currentStock + qtyIn - qtyOut;
    const orderedQty =
      mutationForm.type === 'Barang Masuk'
        ? Number(mutationForm.orderedQuantity) || qty
        : undefined;
    const diffQty =
      orderedQty !== undefined ? qty - orderedQty : undefined;

    // Create immutable mutation record
    const newMutation: StockMutation = {
      id: `mut-${Date.now()}`,
      itemId: selectedItemForMutation.id,
      itemCode: selectedItemForMutation.code,
      itemName: selectedItemForMutation.name,
      date: new Date().toISOString().slice(0, 10),
      timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
      type: mutationForm.type,
      referenceNumber: mutationForm.referenceNumber,
      batchNumber: mutationForm.batchNumber,
      expiryDate: mutationForm.expiryDate,
      supplierName:
        mutationForm.type === 'Barang Masuk' || mutationForm.type === 'Retur Keluar'
          ? mutationForm.supplierName
          : undefined,
      unit: selectedItemForMutation.unit,
      orderedQuantity: orderedQty,
      quantityIn: qtyIn,
      quantityOut: qtyOut,
      differenceQuantity: diffQty,
      balance: newStockBalance,
      unitPrice: selectedItemForMutation.pricePerUnit,
      totalPrice: qty * selectedItemForMutation.pricePerUnit,
      photoUrl: mutationForm.photoUrl || undefined,
      notes: mutationForm.notes,
      operatorName: mutationForm.operatorName,
      recipientOrDepartment: mutationForm.recipientOrDepartment,
    };

    setMutations(prev => [newMutation, ...prev]);

    // Update currentStock and batches in items
    setItems(prev =>
      prev.map(i => {
        if (i.id !== selectedItemForMutation.id) return i;

        let updatedBatches = i.batches ? [...i.batches] : [];

        // If Barang Masuk, add new batch
        if (mutationForm.type === 'Barang Masuk') {
          updatedBatches.push({
            id: `b-${Date.now()}`,
            batchNumber: mutationForm.batchNumber,
            receivedDate: new Date().toISOString().slice(0, 10),
            expiryDate: mutationForm.expiryDate,
            initialQty: qty,
            remainingQty: qty,
            unitPrice: i.pricePerUnit,
            supplierName: mutationForm.supplierName,
          });
        }

        // If Barang Keluar, apply FEFO deduction (First Expired First Out)
        if (isOutflow && updatedBatches.length > 0) {
          // Sort by expiryDate ascending (FEFO)
          updatedBatches.sort(
            (a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
          );
          let remainingToDeduct = qty;
          for (let b of updatedBatches) {
            if (b.remainingQty >= remainingToDeduct) {
              b.remainingQty -= remainingToDeduct;
              remainingToDeduct = 0;
              break;
            } else {
              remainingToDeduct -= b.remainingQty;
              b.remainingQty = 0;
            }
          }
          // Filter out zero batches if needed, or keep for audit
        }

        return {
          ...i,
          currentStock: newStockBalance,
          lastRestocked:
            mutationForm.type === 'Barang Masuk'
              ? new Date().toISOString().slice(0, 10)
              : i.lastRestocked,
          batches: updatedBatches,
        };
      })
    );

    addToast(
      'success',
      'Mutasi Tercatat',
      `${mutationForm.type} sebanyak ${qty} ${selectedItemForMutation.unit} berhasil direkam ke buku kartu stok. Stok akhir: ${newStockBalance} ${selectedItemForMutation.unit}.`
    );
    setIsMutationModalOpen(false);
  };

  // ---------------------------------------------------------------------------
  // HANDLERS: STOK OPNAME
  // ---------------------------------------------------------------------------
  const handleOpenOpnameModal = (item?: InventoryItem) => {
    const targetItem = item || items[0];
    setOpnameForm({
      itemId: targetItem.id,
      physicalStock: targetItem.currentStock,
      reason: 'Penghitungan fisik mingguan timbangan gudang.',
      inspectorName: currentUser.name,
    });
    setIsOpnameModalOpen(true);
  };

  const handleSaveOpname = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForOpname) return;

    const physStock = Number(opnameForm.physicalStock);
    const sysStock = selectedItemForOpname.currentStock;
    const diff = physStock - sysStock;
    const diffValuation = diff * selectedItemForOpname.pricePerUnit;

    const newOpname: StockOpnameRecord = {
      id: `opn-${Date.now()}`,
      opnameNumber: `OPN-TMG2-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-0${opnameList.length + 1}`,
      date: new Date().toISOString().slice(0, 10),
      itemId: selectedItemForOpname.id,
      itemName: selectedItemForOpname.name,
      unit: selectedItemForOpname.unit,
      systemStock: sysStock,
      physicalStock: physStock,
      difference: diff,
      unitPrice: selectedItemForOpname.pricePerUnit,
      differenceValuation: diffValuation,
      reason: opnameForm.reason,
      inspectorName: opnameForm.inspectorName,
      status: 'Disetujui',
      verifiedBy: `${currentUser.name} (${currentUser.role})`,
    };

    setOpnameList(prev => [newOpname, ...prev]);

    // Record stock opname mutation entry to update balance
    const opnMutation: StockMutation = {
      id: `mut-${Date.now()}`,
      itemId: selectedItemForOpname.id,
      itemCode: selectedItemForOpname.code,
      itemName: selectedItemForOpname.name,
      date: new Date().toISOString().slice(0, 10),
      timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
      type: 'Stok Opname',
      referenceNumber: newOpname.opnameNumber,
      unit: selectedItemForOpname.unit,
      quantityIn: diff > 0 ? diff : 0,
      quantityOut: diff < 0 ? Math.abs(diff) : 0,
      balance: physStock, // Set exact physical balance
      unitPrice: selectedItemForOpname.pricePerUnit,
      totalPrice: Math.abs(diffValuation),
      notes: `Penyesuaian stok opname: ${diff >= 0 ? '+' : ''}${diff} ${selectedItemForOpname.unit} (${opnameForm.reason})`,
      operatorName: opnameForm.inspectorName,
    };
    setMutations(prev => [opnMutation, ...prev]);

    // Adjust actual inventory stock
    setItems(prev =>
      prev.map(i =>
        i.id === selectedItemForOpname.id
          ? {
              ...i,
              currentStock: physStock,
            }
          : i
      )
    );

    addToast(
      'success',
      'Stok Opname Disimpan',
      `Penyesuaian fisik ${selectedItemForOpname.name} berhasil dibukukan. Saldo stok disesuaikan menjadi ${physStock} ${selectedItemForOpname.unit}.`
    );
    setIsOpnameModalOpen(false);
  };

  // ---------------------------------------------------------------------------
  // EXPORTS
  // ---------------------------------------------------------------------------
  const handleExportInventoryPDF = () => {
    exportTableToPDF({
      title: 'Laporan Inventaris Stok Gudang & Metode FEFO',
      subtitle: 'Satuan Pelayanan Pemenuhan Gizi - SPPG Probolinggo Krejengan Temenggungan 2',
      headers: ['Kode', 'Nama Bahan', 'Kategori', 'Stok Saat Ini', 'Batas Min', 'Harga Satuan', 'Total Nilai (Rp)', 'Status Stok', 'Kadaluarsa (FEFO)'],
      rows: filteredInventory.map(i => [
        i.code,
        i.name,
        i.category,
        `${formatNumber(i.currentStock)} ${i.unit}`,
        `${formatNumber(i.minimumStock)} ${i.unit}`,
        formatRupiah(i.pricePerUnit),
        formatRupiah(i.currentStock * i.pricePerUnit),
        i.currentStock <= i.minimumStock ? 'KRITIS' : 'Aman',
        formatIndonesianDate(i.expiryDate),
      ]),
      fileName: 'Inventaris_Stok_Gudang_SPPG_TMG2',
      sppgConfig,
      signerName: sppgConfig.headOfSppg,
      signerRole: 'Kepala SPPG Temenggungan 2',
    });
  };

  const handleExportStockCardPDF = () => {
    exportTableToPDF({
      title: `BUKU KARTU STOK GUDANG: ${selectedStockCardItem.name}`,
      subtitle: `Kode: ${selectedStockCardItem.code} • Satuan: ${selectedStockCardItem.unit} • Lokasi: ${selectedStockCardItem.storageLocation}`,
      headers: ['Tanggal & Jam', 'No. Referensi', 'Tipe Mutasi', 'Masuk (+)', 'Keluar (-)', 'Sisa Saldo Stok', 'Uraian / Keterangan', 'Petugas'],
      rows: stockCardMutations.map(m => [
        m.timestamp,
        m.referenceNumber,
        m.type,
        m.quantityIn > 0 ? `+${formatNumber(m.quantityIn)}` : '-',
        m.quantityOut > 0 ? `-${formatNumber(m.quantityOut)}` : '-',
        `${formatNumber(m.balance)} ${m.unit}`,
        m.notes,
        m.operatorName,
      ]),
      fileName: `Kartu_Stok_${selectedStockCardItem.code}_${selectedStockCardItem.name.replace(/\s+/g, '_')}`,
      sppgConfig,
      signerName: sppgConfig.headOfSppg,
      signerRole: 'Kepala SPPG Temenggungan 2',
    });
  };

  // Weekly Usage Data (Dummy calculation for tab 5)
  const usageSummary = [
    { day: 'Senin, 03 Nov 2026', menu: 'Nasi Liwet, Ayam Panggang, Sayur Lodeh', portions: 2850, riceKg: 400, chickenKg: 280, vegKg: 180, fruitKg: 250, totalCost: 24650000 },
    { day: 'Selasa, 04 Nov 2026', menu: 'Nasi Kuning, Semur Daging, Tumis Buncis', portions: 2850, riceKg: 400, chickenKg: 0, vegKg: 190, fruitKg: 280, totalCost: 31200000 },
    { day: 'Rabu, 05 Nov 2026', menu: 'Nasi Putih, Telur Balado, Sop Wortel', portions: 2850, riceKg: 400, chickenKg: 0, vegKg: 175, fruitKg: 250, totalCost: 19800000 },
    { day: 'Kamis, 06 Nov 2026', menu: 'Nasi Liwet, Ikan Tongkol Gurih, Capcay', portions: 2850, riceKg: 400, chickenKg: 0, vegKg: 200, fruitKg: 260, totalCost: 22400000 },
    { day: 'Jumat, 07 Nov 2026', menu: 'Nasi Pulen, Ayam Fillet Madu, Sayur Bening', portions: 2850, riceKg: 400, chickenKg: 280, vegKg: 180, fruitKg: 250, totalCost: 24650000 },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-900 text-white flex items-center justify-center shadow-md shadow-blue-950/20 font-black">
            <Boxes className="w-6 h-6 text-sky-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 font-mono tracking-wider">
                GUDANG & LOGISTIK MBG
              </span>
              <span className="text-xs text-slate-400 font-semibold">• Sistem Mutasi & FEFO</span>
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
              Modul Pengadaan dan Gudang (Inventory Control)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pengelolaan Stok Awal, Masuk, Keluar, Retur, Stok Opname, Kartu Stok & Peringatan Bahan Kritis
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasPermission('inventory', 'create') && (
            <button
              type="button"
              onClick={handleOpenCreateItem}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-900 hover:bg-blue-800 dark:bg-sky-600 dark:hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Item Bahan</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleOpenQuickMutation(items[0], 'Barang Masuk')}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-xs transition"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Catat Mutasi Stok</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] text-slate-500 uppercase font-bold flex items-center justify-between">
            <span>Total Komoditas Gudang</span>
            <Warehouse className="w-4 h-4 text-blue-900 dark:text-sky-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-1">
            {kpiData.totalItems} Komoditas
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Bahan Basah & Kering</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] text-slate-500 uppercase font-bold flex items-center justify-between">
            <span>Peringatan Stok Minimum</span>
            <AlertTriangle className={`w-4 h-4 ${kpiData.criticalCount > 0 ? 'text-rose-600' : 'text-slate-400'}`} />
          </div>
          <div
            className={`text-2xl font-black font-mono mt-1 ${
              kpiData.criticalCount > 0 ? 'text-rose-600' : 'text-slate-900 dark:text-white'
            }`}
          >
            {kpiData.criticalCount} Item Kritis
          </div>
          <div className="text-[11px] text-rose-600 font-semibold mt-0.5">
            {kpiData.criticalCount > 0 ? 'Wajib terbitkan PO segera' : 'Seluruh stok di atas batas aman'}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] text-slate-500 uppercase font-bold flex items-center justify-between">
            <span>Total Valuasi Nilai Stok</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-600 font-mono mt-1">
            {formatRupiah(kpiData.totalValuation)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Aset Bahan Pangan Tersimpan</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] text-slate-500 uppercase font-bold flex items-center justify-between">
            <span>FEFO Mendekati Expired</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 font-mono mt-1">
            {kpiData.expiringSoonItems.length} Batch
          </div>
          <div className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold mt-0.5">
            Kadaluarsa dalam &le; 5 Hari
          </div>
        </div>
      </div>

      {/* Critical Stock Alert Bar (If any critical item exists) */}
      {kpiData.criticalCount > 0 && (
        <div className="bg-rose-50 dark:bg-rose-950/40 p-4 rounded-xl border border-rose-200 dark:border-rose-900 flex items-start gap-3 text-xs text-rose-900 dark:text-rose-200 shadow-xs">
          <BadgeAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <div className="font-bold flex items-center gap-2">
              <span>PERINGATAN STOK MINIMUM (SAFETY STOCK BREACH)</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-rose-200 text-rose-900 font-mono font-black">
                {kpiData.criticalCount} Item Membutuhkan Restock
              </span>
            </div>
            <p className="leading-relaxed">
              Bahan berikut berada pada atau di bawah batas minimum:
              {kpiData.criticalItems.map((c, idx) => (
                <span key={c.id} className="font-bold ml-1">
                  {c.name} ({formatNumber(c.currentStock)}/{formatNumber(c.minimumStock)} {c.unit})
                  {idx < kpiData.criticalItems.length - 1 ? ',' : '.'}
                </span>
              ))}
            </p>
          </div>
          <button
            onClick={() => {
              setFilterStockStatus('CRITICAL');
              setActiveTab('stok_gudang');
            }}
            className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition shrink-0"
          >
            Lihat Bahan Kritis
          </button>
        </div>
      )}

      {/* Sub-Tabs Navigation */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-1 text-xs font-bold scrollbar-thin">
        {[
          {
            key: 'stok_gudang' as InventoryTab,
            label: '1. Inventaris Stok & FEFO',
            icon: <Warehouse className="w-4 h-4" />,
            badge: `${items.length} Item`,
          },
          {
            key: 'mutasi_barang' as InventoryTab,
            label: '2. Riwayat Mutasi (Masuk, Keluar, Retur)',
            icon: <ArrowRightLeft className="w-4 h-4" />,
            badge: `${mutations.length} Transaksi`,
          },
          {
            key: 'kartu_stok' as InventoryTab,
            label: '3. Buku Kartu Stok (Stock Card)',
            icon: <ClipboardList className="w-4 h-4" />,
          },
          {
            key: 'stok_opname' as InventoryTab,
            label: '4. Stok Opname (Fisik vs Sistem)',
            icon: <Scale className="w-4 h-4" />,
            badge: `${opnameList.length} Opname`,
          },
          {
            key: 'rekap_penggunaan' as InventoryTab,
            label: '5. Rekap Penggunaan Bahan MBG',
            icon: <FileSpreadsheet className="w-4 h-4" />,
          },
        ].map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-t-xl transition whitespace-nowrap border-b-2 ${
                isActive
                  ? 'border-blue-900 dark:border-sky-400 text-blue-900 dark:text-sky-300 bg-blue-50/50 dark:bg-blue-950/40'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: INVENTARIS STOK GUDANG & METODE FEFO */}
      {/* ========================================================================= */}
      {activeTab === 'stok_gudang' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold text-slate-400 uppercase text-[10px]">Kategori:</span>
              {['ALL', 'Bahan Segar', 'Bahan Kering', 'Bumbu & Rempah', 'Kemasan & Higiene'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition ${
                    filterCategory === cat
                      ? 'bg-blue-900 text-white dark:bg-sky-600'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {cat === 'ALL' ? 'Semua' : cat}
                </button>
              ))}

              <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block" />

              <span className="font-bold text-slate-400 uppercase text-[10px]">Status:</span>
              <button
                onClick={() => setFilterStockStatus(filterStockStatus === 'CRITICAL' ? 'ALL' : 'CRITICAL')}
                className={`px-2.5 py-1.5 rounded-lg font-bold transition text-xs flex items-center gap-1 ${
                  filterStockStatus === 'CRITICAL'
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-100 text-rose-700 dark:bg-slate-800 dark:text-rose-400'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Hanya Stok Kritis ({kpiData.criticalCount})</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportInventoryPDF}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition shadow-2xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>PDF Stok</span>
              </button>
              <button
                onClick={triggerPrint}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak</span>
              </button>
            </div>
          </div>

          {/* DataTable Inventaris */}
          <DataTable
            title="Daftar Inventaris Bahan Pangan & Gudang"
            subtitle="Formula: Stok Akhir = Stok Awal + Barang Masuk - Barang Keluar • Pengendalian FEFO"
            data={filteredInventory}
            keyExtractor={item => item.id}
            searchPlaceholder="Cari kode bahan, nama, lokasi simpan, atau supplier..."
            searchKeys={['code', 'name', 'category', 'storageLocation', 'supplierName']}
            columns={[
              {
                key: 'code',
                header: 'Kode & Bahan',
                render: row => (
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                      <span>{row.name}</span>
                      {row.currentStock <= row.minimumStock && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 animate-pulse">
                          KRITIS
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Kode: <strong>{row.code}</strong> • {row.category}
                    </div>
                  </div>
                ),
              },
              {
                key: 'stockFormula',
                header: 'Saldo Stok (Awal / Akhir)',
                render: row => {
                  const isCrit = row.currentStock <= row.minimumStock;
                  return (
                    <div className="font-mono text-xs space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-black ${isCrit ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>
                          {formatNumber(row.currentStock)} {row.unit}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <span>Awal: {formatNumber(row.initialStock)}</span>
                        <span>•</span>
                        <span>Min: {formatNumber(row.minimumStock)}</span>
                      </div>
                    </div>
                  );
                },
              },
              {
                key: 'pricing',
                header: 'Harga & Valuasi',
                render: row => (
                  <div className="font-mono text-xs space-y-0.5">
                    <div className="font-bold text-slate-800 dark:text-slate-200">
                      {formatRupiah(row.pricePerUnit)} <span className="text-[10px] text-slate-400 font-normal">/{row.unit}</span>
                    </div>
                    <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">
                      Total: {formatRupiah(row.currentStock * row.pricePerUnit)}
                    </div>
                  </div>
                ),
              },
              {
                key: 'storage',
                header: 'Lokasi & Supplier',
                render: row => (
                  <div className="text-xs space-y-0.5">
                    <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                      <Warehouse className="w-3.5 h-3.5 text-sky-600" />
                      <span>{row.storageLocation}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 truncate max-w-[150px]">
                      {row.supplierName}
                    </div>
                  </div>
                ),
              },
              {
                key: 'fefo',
                header: 'Metode FEFO (Kadaluarsa)',
                render: row => {
                  const now = new Date().getTime();
                  const exp = new Date(row.expiryDate).getTime();
                  const diffDays = Math.ceil((exp - now) / (1000 * 3600 * 24));
                  const isExpiring = diffDays <= 5;
                  return (
                    <div className="text-xs font-mono space-y-0.5">
                      <div className="font-bold flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{formatIndonesianDate(row.expiryDate)}</span>
                      </div>
                      <span
                        className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold ${
                          diffDays < 0
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : isExpiring
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}
                      >
                        {diffDays < 0 ? 'KADALUARSA' : `Sisa ${diffDays} Hari (FEFO)`}
                      </span>
                    </div>
                  );
                },
              },
              {
                key: 'actions',
                header: 'Aksi & Mutasi',
                align: 'right',
                render: row => (
                  <div className="flex items-center justify-end gap-1.5">
                    {/* Buka Kartu Stok */}
                    <button
                      onClick={() => {
                        setSelectedStockCardItemId(row.id);
                        setActiveTab('kartu_stok');
                      }}
                      className="px-2 py-1 bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 hover:bg-sky-100 rounded text-[10px] font-bold flex items-center gap-1 border border-sky-200 dark:border-sky-800 transition"
                      title="Buka Buku Kartu Stok"
                    >
                      <ClipboardList className="w-3 h-3" />
                      <span>Kartu Stok</span>
                    </button>

                    {/* Quick Barang Masuk */}
                    <button
                      onClick={() => handleOpenQuickMutation(row, 'Barang Masuk')}
                      className="p-1.5 text-emerald-600 hover:text-emerald-800 rounded hover:bg-emerald-50 dark:hover:bg-emerald-950 transition"
                      title="Catat Barang Masuk (+)"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </button>

                    {/* Quick Barang Keluar */}
                    <button
                      onClick={() => handleOpenQuickMutation(row, 'Barang Keluar')}
                      className="p-1.5 text-rose-600 hover:text-rose-800 rounded hover:bg-rose-50 dark:hover:bg-rose-950 transition"
                      title="Catat Barang Keluar Dapur (-)"
                    >
                      <ArrowDownRight className="w-4 h-4" />
                    </button>

                    {/* Quick Retur */}
                    <button
                      onClick={() => handleOpenQuickMutation(row, 'Retur Keluar')}
                      className="p-1.5 text-amber-600 hover:text-amber-800 rounded hover:bg-amber-50 dark:hover:bg-amber-950 transition"
                      title="Retur ke Supplier"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>

                    {/* Edit item */}
                    {hasPermission('inventory', 'edit') && (
                      <button
                        onClick={() => handleOpenEditItem(row)}
                        className="p-1.5 text-blue-600 hover:text-blue-800 rounded hover:bg-blue-50 dark:hover:bg-blue-950 transition"
                        title="Edit Data Item"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ),
              },
            ]}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: RIWAYAT MUTASI BARANG (AUDIT TRAIL) */}
      {/* ========================================================================= */}
      {activeTab === 'mutasi_barang' && (
        <div className="space-y-4">
          <div className="bg-sky-50 dark:bg-sky-950/40 p-4 rounded-xl border border-sky-200 dark:border-sky-800 flex items-start gap-3 text-xs text-sky-900 dark:text-sky-200">
            <Info className="w-5 h-5 text-sky-700 dark:text-sky-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold">
                Pencatatan Mutasi Barang Tervalidasi & Tidak Dapat Dihapus Diam-Diam:
              </div>
              <p className="leading-relaxed">
                Setiap mutasi (Barang Masuk, Barang Keluar Dapur, Retur ke Supplier, dan Penyesuaian Opname)
                terekam permanen dengan nomor bukti referensi, kuantitas masuk/keluar, dan saldo akhir stok terhitung.
              </p>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs overflow-x-auto pb-1">
              <span className="font-bold text-slate-400 uppercase text-[10px]">Filter Jenis Mutasi:</span>
              {[
                'ALL',
                'Barang Masuk',
                'Barang Keluar',
                'Retur Keluar',
                'Stok Opname',
                'Stok Awal',
              ].map(t => (
                <button
                  key={t}
                  onClick={() => setFilterMutationType(t)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                    filterMutationType === t
                      ? 'bg-blue-900 text-white dark:bg-sky-600'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {t === 'ALL' ? 'Semua Mutasi' : t}
                </button>
              ))}
            </div>

            <button
              onClick={triggerPrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Log Mutasi</span>
            </button>
          </div>

          {/* DataTable Mutasi */}
          <DataTable
            title="Buku Riwayat Mutasi Barang Gudang"
            subtitle="Rekam jejak kronologis pergerakan bahan masuk, keluar dapur, dan retur"
            data={filteredMutations}
            keyExtractor={item => item.id}
            searchPlaceholder="Cari no referensi, bahan, operator, keterangan..."
            searchKeys={['referenceNumber', 'itemName', 'type', 'notes', 'operatorName', 'recipientOrDepartment']}
            columns={[
              {
                key: 'timestamp',
                header: 'Waktu & No. Bukti',
                render: row => (
                  <div className="font-mono text-xs">
                    <span className="font-bold text-blue-900 dark:text-sky-300">
                      {row.referenceNumber}
                    </span>
                    <div className="text-[10px] text-slate-400">{row.timestamp}</div>
                  </div>
                ),
              },
              {
                key: 'type',
                header: 'Jenis Mutasi',
                render: row => (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                      row.type === 'Barang Masuk'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : row.type === 'Barang Keluar'
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        : row.type === 'Retur Keluar'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                    }`}
                  >
                    {row.type === 'Barang Masuk' && <ArrowUpRight className="w-3 h-3" />}
                    {row.type === 'Barang Keluar' && <ArrowDownRight className="w-3 h-3" />}
                    {row.type === 'Retur Keluar' && <RotateCcw className="w-3 h-3" />}
                    <span>{row.type}</span>
                  </span>
                ),
              },
              {
                key: 'itemName',
                header: 'Bahan Pangan',
                render: row => (
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white text-xs">
                      {row.itemName}
                    </div>
                    {row.batchNumber && (
                      <div className="text-[10px] text-slate-400 font-mono">
                        Batch: {row.batchNumber}
                      </div>
                    )}
                  </div>
                ),
              },
              {
                key: 'movement',
                header: 'Dipesan vs Diterima / Keluar',
                render: row => {
                  const ordered = row.orderedQuantity;
                  const diff =
                    ordered !== undefined
                      ? row.quantityIn - ordered
                      : undefined;
                  return (
                    <div className="font-mono text-xs space-y-0.5">
                      {ordered !== undefined && (
                        <div className="text-[11px] text-slate-500">
                          Pesan: <strong>{formatNumber(ordered)} {row.unit}</strong>
                        </div>
                      )}
                      {row.quantityIn > 0 && (
                        <span className="text-emerald-600 font-bold block">
                          Terima: +{formatNumber(row.quantityIn)} {row.unit}
                        </span>
                      )}
                      {row.quantityOut > 0 && (
                        <span className="text-rose-600 font-bold block">
                          Keluar: -{formatNumber(row.quantityOut)} {row.unit}
                        </span>
                      )}
                      {diff !== undefined && (
                        <span
                          className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-black ${
                            diff === 0
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : diff < 0
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                          }`}
                        >
                          Selisih: {diff > 0 ? `+${diff}` : diff} {row.unit}
                        </span>
                      )}
                    </div>
                  );
                },
              },
              {
                key: 'balance',
                header: 'Saldo Akhir Stok',
                render: row => (
                  <div className="font-mono text-xs font-black text-slate-900 dark:text-white">
                    {formatNumber(row.balance)} {row.unit}
                  </div>
                ),
              },
              {
                key: 'photoUrl',
                header: 'Foto Bukti Barang',
                render: row => (
                  <div className="flex flex-col gap-1 min-w-[95px]">
                    {row.photoUrl && (
                      <div className="relative group w-16 h-12 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                        <img
                          src={row.photoUrl}
                          alt={row.itemName}
                          onClick={() => setViewMutationPhotoUrl(row.photoUrl || null)}
                          className="w-full h-full object-cover cursor-pointer"
                        />
                        <button
                          type="button"
                          onClick={() => setViewMutationPhotoUrl(row.photoUrl || null)}
                          className="absolute bottom-0.5 right-0.5 px-1 py-0.2 rounded bg-slate-900/75 text-white text-[9px] font-bold"
                        >
                          <Eye className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    )}
                    <label className="print:hidden inline-flex items-center justify-center gap-1 px-2 py-1 rounded bg-blue-900 hover:bg-blue-800 text-white text-[10px] font-bold cursor-pointer w-fit">
                      <Upload className="w-3 h-3" />
                      <span>{row.photoUrl ? 'Ganti Foto' : 'Upload Foto'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e =>
                          processFacilityImageUpload(
                            e,
                            url => {
                              setMutations(prev =>
                                prev.map(m => (m.id === row.id ? { ...m, photoUrl: url } : m))
                              );
                              addToast('success', 'Foto Terunggah', `Foto untuk ${row.itemName} tersimpan.`);
                            },
                            msg => addToast('error', 'Upload Gagal', msg)
                          )
                        }
                      />
                    </label>
                  </div>
                ),
              },
              {
                key: 'notes',
                header: 'Keterangan Manual',
                render: row => (
                  <div className="text-xs text-slate-600 dark:text-slate-300 min-w-[170px] max-w-xs space-y-1">
                    <textarea
                      rows={2}
                      value={row.notes}
                      onChange={e => {
                        const val = e.target.value;
                        setMutations(prev =>
                          prev.map(m => (m.id === row.id ? { ...m, notes: val } : m))
                        );
                      }}
                      placeholder="Isi keterangan manual..."
                      className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                    />
                    {row.recipientOrDepartment && (
                      <div className="text-[10px] text-slate-400 font-semibold">
                        Tujuan/Rekanan: {row.recipientOrDepartment}
                      </div>
                    )}
                  </div>
                ),
              },
              {
                key: 'operatorName',
                header: 'Petugas Operator',
                render: row => (
                  <div className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                    {row.operatorName}
                  </div>
                ),
              },
            ]}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: BUKU KARTU STOK (STOCK CARD LEDGER) */}
      {/* ========================================================================= */}
      {activeTab === 'kartu_stok' && (
        <div className="space-y-4">
          {/* Item Selector & Profile Card */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-900 text-white flex items-center justify-center font-black">
                <ClipboardList className="w-6 h-6 text-sky-400" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase">Buku Kartu Stok Bahan:</div>
                <div className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{selectedStockCardItem.name}</span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-sky-300">
                    {selectedStockCardItem.code}
                  </span>
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                  <span>Lokasi: <strong>{selectedStockCardItem.storageLocation}</strong></span>
                  <span>•</span>
                  <span>Satuan: <strong>{selectedStockCardItem.unit}</strong></span>
                  <span>•</span>
                  <span>Harga: <strong>{formatRupiah(selectedStockCardItem.pricePerUnit)}</strong></span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={selectedStockCardItemId}
                onChange={e => setSelectedStockCardItemId(e.target.value)}
                className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                {items.map(i => (
                  <option key={i.id} value={i.id}>
                    {i.code} - {i.name} (Stok: {formatNumber(i.currentStock)} {i.unit})
                  </option>
                ))}
              </select>

              <button
                onClick={handleExportStockCardPDF}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-xs transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Kartu Stok</span>
              </button>
            </div>
          </div>

          {/* Quick Ledger Table for Selected Item */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                    <th className="p-3">Tanggal & Jam</th>
                    <th className="p-3">No. Dokumen / Reff</th>
                    <th className="p-3">Uraian Mutasi</th>
                    <th className="p-3">Batch & Expired</th>
                    <th className="p-3 text-center text-emerald-600">Masuk (+)</th>
                    <th className="p-3 text-center text-rose-600">Keluar (-)</th>
                    <th className="p-3 text-center font-black text-blue-900 dark:text-sky-300">Sisa Saldo Stok</th>
                    <th className="p-3">Paraf Petugas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {stockCardMutations.map(m => (
                    <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-3 font-sans text-slate-600 dark:text-slate-400">{m.timestamp}</td>
                      <td className="p-3 font-bold text-blue-900 dark:text-sky-300">{m.referenceNumber}</td>
                      <td className="p-3 font-sans">
                        <div className="font-semibold text-slate-900 dark:text-white">{m.type}</div>
                        <div className="text-[10px] text-slate-500">{m.notes}</div>
                      </td>
                      <td className="p-3 text-[11px] text-slate-500">
                        {m.batchNumber ? `${m.batchNumber}` : '-'}
                        {m.expiryDate && <div className="text-[9px] text-slate-400">Exp: {m.expiryDate}</div>}
                      </td>
                      <td className="p-3 text-center text-emerald-600 font-bold">
                        {m.quantityIn > 0 ? `+${formatNumber(m.quantityIn)}` : '-'}
                      </td>
                      <td className="p-3 text-center text-rose-600 font-bold">
                        {m.quantityOut > 0 ? `-${formatNumber(m.quantityOut)}` : '-'}
                      </td>
                      <td className="p-3 text-center font-black text-sm text-slate-900 dark:text-white bg-slate-50/50 dark:bg-slate-800/30">
                        {formatNumber(m.balance)} {m.unit}
                      </td>
                      <td className="p-3 font-sans text-slate-600 dark:text-slate-400">{m.operatorName}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 dark:bg-slate-800 font-bold font-mono border-t border-slate-300 dark:border-slate-700">
                    <td colSpan={4} className="p-3 font-sans text-right uppercase">
                      SALDO AKHIR FISIK GUDANG SAAT INI:
                    </td>
                    <td colSpan={2}></td>
                    <td className="p-3 text-center text-base font-black text-blue-900 dark:text-sky-400">
                      {formatNumber(selectedStockCardItem.currentStock)} {selectedStockCardItem.unit}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: STOK OPNAME (FISIK VS SISTEM) */}
      {/* ========================================================================= */}
      {activeTab === 'stok_opname' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Scale className="w-4 h-4 text-blue-900 dark:text-sky-400" />
                Stok Opname Fisik vs Sistem
              </h3>
              <p className="text-xs text-slate-500">
                Verifikasi kesesuaian kuantitas fisik di rak/chiller dengan saldo pencatatan sistem, mencatat selisih & BAP
              </p>
            </div>

            <button
              onClick={() => handleOpenOpnameModal()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-900 hover:bg-blue-800 dark:bg-sky-600 dark:hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Input Hasil Stok Opname</span>
            </button>
          </div>

          <DataTable
            title="Riwayat Berita Acara Stok Opname"
            subtitle="Pencatatan selisih fisik (+ / -) dan penyesuaian nilai buku secara transparan"
            data={opnameList}
            keyExtractor={item => item.id}
            searchPlaceholder="Cari no opname, barang, pemeriksa..."
            searchKeys={['opnameNumber', 'itemName', 'reason', 'inspectorName']}
            columns={[
              {
                key: 'opnameNumber',
                header: 'No. Opname & Tanggal',
                render: row => (
                  <div className="font-mono text-xs">
                    <span className="font-bold text-blue-900 dark:text-sky-300">
                      {row.opnameNumber}
                    </span>
                    <div className="text-[10px] text-slate-400">
                      {formatIndonesianDate(row.date)}
                    </div>
                  </div>
                ),
              },
              {
                key: 'itemName',
                header: 'Nama Bahan',
                render: row => (
                  <div className="font-bold text-slate-900 dark:text-white text-xs">
                    {row.itemName}
                  </div>
                ),
              },
              {
                key: 'systemStock',
                header: 'Stok Sistem',
                render: row => (
                  <div className="font-mono text-xs text-slate-700 dark:text-slate-300">
                    {formatNumber(row.systemStock)} {row.unit}
                  </div>
                ),
              },
              {
                key: 'physicalStock',
                header: 'Stok Fisik',
                render: row => (
                  <div className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                    {formatNumber(row.physicalStock)} {row.unit}
                  </div>
                ),
              },
              {
                key: 'difference',
                header: 'Selisih (+/-)',
                render: row => {
                  const isMatch = row.difference === 0;
                  const isPlus = row.difference > 0;
                  return (
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-mono font-black ${
                        isMatch
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : isPlus
                          ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      {isMatch ? '0 (Cocok)' : `${isPlus ? '+' : ''}${row.difference} ${row.unit}`}
                    </span>
                  );
                },
              },
              {
                key: 'reason',
                header: 'Alasan Selisih / BAP',
                render: row => (
                  <div className="text-xs text-slate-600 dark:text-slate-400 max-w-xs italic">
                    "{row.reason}"
                  </div>
                ),
              },
              {
                key: 'status',
                header: 'Status & Otorisasi',
                render: row => (
                  <div>
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      {row.status}
                    </span>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Oleh: {row.verifiedBy || row.inspectorName}
                    </div>
                  </div>
                ),
              },
            ]}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: REKAP PENGGUNAAN BAHAN MBG */}
      {/* ========================================================================= */}
      {activeTab === 'rekap_penggunaan' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-blue-900 dark:text-sky-400" />
              Rekapitulasi Penggunaan Bahan Baku Dapur MBG (Minggu Berjalan)
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Akumulasi bahan pangan yang dikeluarkan dari gudang untuk produksi 2.850 porsi harian
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                    <th className="p-3">Hari & Tanggal</th>
                    <th className="p-3">Menu Hidangan</th>
                    <th className="p-3 text-center">Porsi MBG</th>
                    <th className="p-3 text-center">Beras (kg)</th>
                    <th className="p-3 text-center">Ayam (kg)</th>
                    <th className="p-3 text-center">Sayur (kg)</th>
                    <th className="p-3 text-center">Buah (kg)</th>
                    <th className="p-3 text-right">Valuasi Biaya Bahan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {usageSummary.map((u, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-3 font-sans font-bold text-slate-900 dark:text-white">{u.day}</td>
                      <td className="p-3 font-sans text-slate-700 dark:text-slate-300">{u.menu}</td>
                      <td className="p-3 text-center font-bold text-blue-900 dark:text-sky-300">{formatNumber(u.portions)}</td>
                      <td className="p-3 text-center">{u.riceKg} kg</td>
                      <td className="p-3 text-center">{u.chickenKg > 0 ? `${u.chickenKg} kg` : '-'}</td>
                      <td className="p-3 text-center">{u.vegKg} kg</td>
                      <td className="p-3 text-center">{u.fruitKg} kg</td>
                      <td className="p-3 text-right font-black text-emerald-700 dark:text-emerald-400">
                        {formatRupiah(u.totalCost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 dark:bg-slate-800 font-bold font-mono border-t border-slate-300 dark:border-slate-700 text-xs">
                    <td colSpan={2} className="p-3 font-sans uppercase">TOTAL PEMAKAIAN 1 MINGGU:</td>
                    <td className="p-3 text-center">{formatNumber(2850 * 5)} porsi</td>
                    <td className="p-3 text-center">2.000 kg</td>
                    <td className="p-3 text-center">560 kg</td>
                    <td className="p-3 text-center">925 kg</td>
                    <td className="p-3 text-center">1.290 kg</td>
                    <td className="p-3 text-right text-emerald-700 dark:text-emerald-400 text-sm font-black">
                      {formatRupiah(24650000 + 31200000 + 19800000 + 22400000 + 24650000)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: TRANSAKSI MUTASI CEPAT (MASUK / KELUAR / RETUR) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isMutationModalOpen}
        onClose={() => setIsMutationModalOpen(false)}
        title="Catat Mutasi Stok Gudang (Buku Kartu Stok)"
        subtitle="Merekam barang masuk, pengeluaran dapur, atau retur secara permanen"
        maxWidth="lg"
      >
        <form onSubmit={handleSaveMutation} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Jenis Mutasi *
              </label>
              <select
                value={mutationForm.type}
                onChange={e =>
                  setMutationForm({
                    ...mutationForm,
                    type: e.target.value as MutationType,
                  })
                }
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
              >
                <option value="Barang Masuk">Barang Masuk (Penerimaan PO / Belanja Pasar)</option>
                <option value="Barang Keluar">Barang Keluar (Untuk Dapur Pengolahan MBG)</option>
                <option value="Retur Keluar">Retur Keluar (Pengembalian ke Supplier)</option>
                <option value="Retur Masuk">Retur Masuk (Sisa Produksi Balik ke Gudang)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Pilih Bahan Pangan *
              </label>
              <select
                value={mutationForm.itemId}
                onChange={e =>
                  setMutationForm({ ...mutationForm, itemId: e.target.value })
                }
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
              >
                {items.map(i => (
                  <option key={i.id} value={i.id}>
                    {i.code} - {i.name} (Stok Saat Ini: {formatNumber(i.currentStock)} {i.unit})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nomor Referensi Dokumen / Reff *
              </label>
              <input
                type="text"
                required
                value={mutationForm.referenceNumber}
                onChange={e =>
                  setMutationForm({ ...mutationForm, referenceNumber: e.target.value })
                }
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
              />
            </div>

            {mutationForm.type === 'Barang Masuk' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Jumlah Dipesan ({selectedItemForMutation?.unit}) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={mutationForm.orderedQuantity}
                  onChange={e =>
                    setMutationForm({ ...mutationForm, orderedQuantity: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
                />
              </div>
            )}

            <div className={mutationForm.type === 'Barang Masuk' ? '' : 'sm:col-span-2'}>
              <label className="block text-xs font-bold text-emerald-700 dark:text-emerald-300 mb-1">
                {mutationForm.type === 'Barang Masuk'
                  ? `Jumlah Diterima (${selectedItemForMutation?.unit}) *`
                  : `Kuantitas / Jumlah Mutasi (${selectedItemForMutation?.unit}) *`}
              </label>
              <input
                type="number"
                min="0.1"
                step="any"
                required
                value={mutationForm.quantity}
                onChange={e =>
                  setMutationForm({ ...mutationForm, quantity: Number(e.target.value) })
                }
                className="w-full px-3 py-2 text-xs rounded-lg border border-emerald-400 dark:border-emerald-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-black"
              />
            </div>
          </div>

          {mutationForm.type === 'Barang Masuk' && (
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
              <div className="flex items-center gap-1.5 text-blue-900 dark:text-sky-300 font-bold">
                <Calculator className="w-4 h-4" />
                <span>Perhitungan Dipesan vs Diterima:</span>
              </div>
              {(() => {
                const ordered = Number(mutationForm.orderedQuantity) || 0;
                const received = Number(mutationForm.quantity) || 0;
                const diff = received - ordered;
                const pct = ordered > 0 ? Math.round((received / ordered) * 100) : 0;
                return (
                  <span
                    className={`px-2.5 py-1 rounded-lg font-black ${
                      diff === 0
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : diff < 0
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        : 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                    }`}
                  >
                    Selisih: {diff > 0 ? `+${diff}` : diff} {selectedItemForMutation?.unit} ({pct}% terpenuhi)
                  </span>
                );
              })()}
            </div>
          )}

          {/* Batch & Expired (Optional/FEFO) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nomor Batch / Lot (FEFO)
              </label>
              <input
                type="text"
                value={mutationForm.batchNumber}
                onChange={e =>
                  setMutationForm({ ...mutationForm, batchNumber: e.target.value })
                }
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tanggal Kedaluwarsa (Exp)
              </label>
              <input
                type="date"
                value={mutationForm.expiryDate}
                onChange={e =>
                  setMutationForm({ ...mutationForm, expiryDate: e.target.value })
                }
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {mutationForm.type === 'Barang Keluar' ? 'Divisi / Ruang Penerima' : 'Pemasok / Supplier'}
              </label>
              <input
                type="text"
                value={mutationForm.recipientOrDepartment}
                onChange={e =>
                  setMutationForm({ ...mutationForm, recipientOrDepartment: e.target.value })
                }
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Foto Bukti Bahan / Barang Diterima
              </label>
              <div className="flex items-center gap-2">
                {mutationForm.photoUrl ? (
                  <img
                    src={mutationForm.photoUrl}
                    alt="Preview"
                    onClick={() => setViewMutationPhotoUrl(mutationForm.photoUrl)}
                    className="w-11 h-9 rounded-lg object-cover border border-emerald-500 cursor-pointer shrink-0"
                  />
                ) : (
                  <div className="w-11 h-9 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                    <Camera className="w-4 h-4" />
                  </div>
                )}
                <label className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold cursor-pointer transition">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{mutationForm.photoUrl ? 'Ganti Foto' : 'Upload Foto'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e =>
                      processFacilityImageUpload(
                        e,
                        url => {
                          setMutationForm(prev => ({ ...prev, photoUrl: url }));
                          addToast('success', 'Foto Terunggah', 'Foto bukti barang berhasil dilampirkan.');
                        },
                        msg => addToast('error', 'Upload Gagal', msg)
                      )
                    }
                  />
                </label>
                {mutationForm.photoUrl && (
                  <button
                    type="button"
                    onClick={() => setMutationForm(prev => ({ ...prev, photoUrl: '' }))}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-rose-600"
                    title="Hapus foto"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Keterangan Manual / Catatan Penerimaan Barang
            </label>
            <textarea
              rows={2}
              placeholder="Isi keterangan kondisi bahan atau selisih penerimaan secara manual..."
              value={mutationForm.notes}
              onChange={e => setMutationForm({ ...mutationForm, notes: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsMutationModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold rounded-lg bg-blue-900 hover:bg-blue-800 text-white shadow-xs"
            >
              Simpan Mutasi & Perbarui Kartu Stok
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: INPUT STOK OPNAME */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isOpnameModalOpen}
        onClose={() => setIsOpnameModalOpen(false)}
        title="Input Berita Acara Stok Opname Fisik"
        subtitle="Mencatat perbandingan antara saldo sistem vs fisik riil di gudang"
        maxWidth="md"
      >
        <form onSubmit={handleSaveOpname} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Pilih Bahan yang Dihitung Fisik *
            </label>
            <select
              value={opnameForm.itemId}
              onChange={e => setOpnameForm({ ...opnameForm, itemId: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
            >
              {items.map(i => (
                <option key={i.id} value={i.id}>
                  {i.code} - {i.name} (Stok Sistem: {formatNumber(i.currentStock)} {i.unit})
                </option>
              ))}
            </select>
          </div>

          {selectedItemForOpname && (
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-mono space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span>Stok Sistem Saat Ini:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {formatNumber(selectedItemForOpname.currentStock)} {selectedItemForOpname.unit}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span>Harga Satuan Buku:</span>
                <span>{formatRupiah(selectedItemForOpname.pricePerUnit)}/{selectedItemForOpname.unit}</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-blue-900 dark:text-sky-300 mb-1">
              Stok Fisik Hasil Penghitungan / Timbangan *
            </label>
            <input
              type="number"
              min="0"
              step="any"
              required
              value={opnameForm.physicalStock}
              onChange={e => setOpnameForm({ ...opnameForm, physicalStock: Number(e.target.value) })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-black"
            />
          </div>

          {selectedItemForOpname && (
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-xs flex items-center justify-between font-mono">
              <div>
                <span className="text-[10px] text-blue-900 dark:text-sky-300 font-bold uppercase">Selisih (+/-):</span>
                <div className="font-bold text-sm">
                  {opnameForm.physicalStock - selectedItemForOpname.currentStock >= 0 ? '+' : ''}
                  {opnameForm.physicalStock - selectedItemForOpname.currentStock} {selectedItemForOpname.unit}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-blue-900 dark:text-sky-300 font-bold uppercase">Valuasi Selisih:</span>
                <div className="font-black text-sm">
                  {formatRupiah((opnameForm.physicalStock - selectedItemForOpname.currentStock) * selectedItemForOpname.pricePerUnit)}
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Alasan Selisih / Berita Acara Pemeriksaan (BAP) *
            </label>
            <textarea
              required
              rows={2}
              value={opnameForm.reason}
              onChange={e => setOpnameForm({ ...opnameForm, reason: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsOpnameModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold rounded-lg bg-blue-900 hover:bg-blue-800 text-white shadow-xs"
            >
              Simpan & Sesuaikan Saldo Stok
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: CREATE / EDIT INVENTORY ITEM */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        title={editingItem ? 'Edit Data Item Bahan Gudang' : 'Tambah Item Bahan Pangan Baru'}
        subtitle="Kelola batas minimum, harga satuan, dan lokasi penyimpanan"
        maxWidth="lg"
      >
        <form onSubmit={handleSaveItem} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Kode Bahan *
              </label>
              <input
                type="text"
                required
                value={itemFormData.code}
                onChange={e => setItemFormData({ ...itemFormData, code: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Kategori Bahan *
              </label>
              <select
                value={itemFormData.category}
                onChange={e => setItemFormData({ ...itemFormData, category: e.target.value as any })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
              >
                <option value="Bahan Segar">Bahan Segar</option>
                <option value="Bahan Kering">Bahan Kering</option>
                <option value="Bumbu & Rempah">Bumbu & Rempah</option>
                <option value="Kemasan & Higiene">Kemasan & Higiene</option>
                <option value="Pelengkap">Pelengkap</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Nama Lengkap Bahan Pangan *
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Daging Ayam Broiler Fillet Segar"
              value={itemFormData.name}
              onChange={e => setItemFormData({ ...itemFormData, name: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Stok Awal *
              </label>
              <input
                type="number"
                min="0"
                required
                value={itemFormData.initialStock}
                onChange={e =>
                  setItemFormData({
                    ...itemFormData,
                    initialStock: Number(e.target.value),
                    currentStock: editingItem ? itemFormData.currentStock : Number(e.target.value),
                  })
                }
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-rose-600 dark:text-rose-400 mb-1">
                Stok Minimum (Alert) *
              </label>
              <input
                type="number"
                min="1"
                required
                value={itemFormData.minimumStock}
                onChange={e => setItemFormData({ ...itemFormData, minimumStock: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Satuan *
              </label>
              <input
                type="text"
                required
                placeholder="kg, liter, jerigen, pcs"
                value={itemFormData.unit}
                onChange={e => setItemFormData({ ...itemFormData, unit: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Harga Satuan Acuan (Rp) *
              </label>
              <input
                type="number"
                min="1"
                required
                value={itemFormData.pricePerUnit}
                onChange={e => setItemFormData({ ...itemFormData, pricePerUnit: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Lokasi Penyimpanan Gudang *
              </label>
              <select
                value={itemFormData.storageLocation}
                onChange={e => setItemFormData({ ...itemFormData, storageLocation: e.target.value as any })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
              >
                <option value="Cold Storage 1">Cold Storage 1 (Daging/Ayam &le; 4°C)</option>
                <option value="Chiller Dapur">Chiller Dapur (Sayuran/Bumbu)</option>
                <option value="Gudang Kering A">Gudang Kering A (Beras & Minyak)</option>
                <option value="Gudang Kering B">Gudang Kering B (Buah & Telur)</option>
                <option value="Rak Bumbu">Rak Bumbu Dapur</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsItemModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold rounded-lg bg-blue-900 hover:bg-blue-800 text-white shadow-xs"
            >
              Simpan Item Bahan
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Dialog: Delete Item */}
      <ConfirmDialog
        isOpen={Boolean(deleteItemId)}
        onClose={() => setDeleteItemId(null)}
        onConfirm={() => {
          if (deleteItemId) {
            handleDeleteItem(deleteItemId);
          }
        }}
        title="Hapus Item Inventaris Bahan?"
        message="Menghapus item bahan pangan akan membatalkan riwayat stok saat ini. Pastikan tidak ada transaksi aktif yang terkait."
        confirmLabel="Ya, Hapus Item"
        isDestructive
      />
      {/* Modal Zoom Foto Mutasi Barang Masuk */}
      <Modal
        isOpen={Boolean(viewMutationPhotoUrl)}
        onClose={() => setViewMutationPhotoUrl(null)}
        title="Bukti Foto Barang Masuk / Penerimaan Gudang"
        subtitle="Dokumentasi fisik bahan/barang saat diterima di gudang SPPG"
        maxWidth="md"
      >
        {viewMutationPhotoUrl && (
          <div className="space-y-3">
            <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-black">
              <img src={viewMutationPhotoUrl} alt="Bukti Barang" className="w-full max-h-96 object-contain mx-auto" />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setViewMutationPhotoUrl(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                Tutup Pratinjau
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
