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
  RABItem,
  RABCategory,
  RABApprovalStatus,
  PurchaseOrder,
  PurchaseOrderItem,
  POStatusPLOK,
  QCStatusPLOK,
  QualityControlRecord,
} from '../../types';
import { defaultRABItems, defaultQualityControlRecords } from '../../lib/plokData';
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
  CheckSquare,
  XCircle,
  Camera,
  Thermometer,
  Layers,
  Coins,
  FileSpreadsheet,
  Search,
  ArrowRight,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Image,
  Send,
  Ban,
  Boxes,
  HelpCircle,
  Info,
  Check,
} from 'lucide-react';

type SubModuleTab = 'rab' | 'purchase_order' | 'quality_control';

export const ProcurementModule: React.FC = () => {
  const {
    purchaseOrders,
    addPurchaseOrder,
    updatePurchaseOrder,
    inventory,
    adjustStock,
    masterSuppliers,
    currentUser,
    hasPermission,
    sppgConfig,
    addToast,
  } = useApp();

  // Active Sub-Module Tab
  const [activeTab, setActiveTab] = useState<SubModuleTab>('rab');

  // --- STATE SUBMODUL A: RAB ---
  const [rabList, setRabList] = useState<RABItem[]>(defaultRABItems);
  const [filterRABCategory, setFilterRABCategory] = useState<string>('ALL');
  const [filterRABPeriod, setFilterRABPeriod] = useState<string>('ALL');
  const [isRABModalOpen, setIsRABModalOpen] = useState(false);
  const [selectedRAB, setSelectedRAB] = useState<RABItem | null>(null);

  // Form State for RAB
  const [rabForm, setRabForm] = useState<Omit<RABItem, 'id' | 'totalBudget'>>({
    category: 'RAB Bahan Pangan',
    budgetCode: `RAB-BP-2026-11-00${defaultRABItems.length + 1}`,
    planDate: '2026-11-08',
    periodMonth: 'November 2026',
    itemName: '',
    volume: 100,
    unit: 'kg',
    unitPrice: 25000,
    notes: '',
    status: 'Menunggu Persetujuan',
    poCreatedQuantity: 0,
    poCreatedAmount: 0,
  });

  // --- STATE SUBMODUL B: PURCHASE ORDER (PO) ---
  const [isCreatePOOpen, setIsCreatePOOpen] = useState(false);
  const [selectedPOForDetail, setSelectedPOForDetail] = useState<PurchaseOrder | null>(null);
  const [isPODetailOpen, setIsPODetailOpen] = useState(false);
  const [filterPOStatus, setFilterPOStatus] = useState<string>('ALL');

  // Form State for Creating PO from Approved RAB
  const [selectedRABIdForPO, setSelectedRABIdForPO] = useState<string>('');
  const [poFormSupplierName, setPoFormSupplierName] = useState<string>('');
  const [poFormDeliveryDate, setPoFormDeliveryDate] = useState<string>('2026-11-10');
  const [poFormQuantity, setPoFormQuantity] = useState<number>(100);
  const [poFormUnitPrice, setPoFormUnitPrice] = useState<number>(0);
  const [poFormNotes, setPoFormNotes] = useState<string>('');

  // --- STATE SUBMODUL C: QUALITY CONTROL (QC) ---
  const [qcList, setQcList] = useState<QualityControlRecord[]>(defaultQualityControlRecords);
  const [isQCModalOpen, setIsQCModalOpen] = useState(false);
  const [selectedPOForQC, setSelectedPOForQC] = useState<PurchaseOrder | null>(null);

  // Form State for QC Inspection
  const [qcFormReceivedQty, setQcFormReceivedQty] = useState<number>(0);
  const [qcFormCondition, setQcFormCondition] = useState<'Baik' | 'Kemasan Cacat' | 'Rusak Ringan' | 'Busuk/Tercemar'>('Baik');
  const [qcFormQualityGrade, setQcFormQualityGrade] = useState<'Grade A (Sangat Baik)' | 'Grade B (Standar)' | 'Afkir (Tidak Layak)'>('Grade A (Sangat Baik)');
  const [qcFormTemp, setQcFormTemp] = useState<number>(3.0);
  const [qcFormExpiryDate, setQcFormExpiryDate] = useState<string>('2026-11-15');
  const [qcFormPhotoUrl, setQcFormPhotoUrl] = useState<string>('');
  const [qcFormNotes, setQcFormNotes] = useState<string>('Bahan segar sesuai standar, kemasan higienis, timbangan cocok.');
  const [qcFormStatus, setQcFormStatus] = useState<QCStatusPLOK>('Diterima');
  const [qcFormInspector, setQcFormInspector] = useState<string>(currentUser.name);

  // Zoom / View QC Photo Modal
  const [viewPhotoUrl, setViewPhotoUrl] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // FILTERED & COMPUTED VALUES
  // ---------------------------------------------------------------------------
  // Filtered RAB
  const filteredRAB = useMemo(() => {
    return rabList.filter(item => {
      const matchCat = filterRABCategory === 'ALL' || item.category === filterRABCategory;
      const matchPer = filterRABPeriod === 'ALL' || item.periodMonth === filterRABPeriod;
      return matchCat && matchPer;
    });
  }, [rabList, filterRABCategory, filterRABPeriod]);

  // RAB Summaries
  const rabSummary = useMemo(() => {
    const totalPangan = rabList
      .filter(i => i.category === 'RAB Bahan Pangan')
      .reduce((acc, i) => acc + i.totalBudget, 0);
    const totalOperasional = rabList
      .filter(i => i.category === 'RAB Operasional')
      .reduce((acc, i) => acc + i.totalBudget, 0);
    const totalAll = totalPangan + totalOperasional;
    const totalApproved = rabList
      .filter(i => i.status === 'Disetujui')
      .reduce((acc, i) => acc + i.totalBudget, 0);
    const totalPOAmountCreated = rabList.reduce((acc, i) => acc + (i.poCreatedAmount || 0), 0);
    const remainingBudget = totalApproved - totalPOAmountCreated;

    return {
      totalPangan,
      totalOperasional,
      totalAll,
      totalApproved,
      totalPOAmountCreated,
      remainingBudget,
    };
  }, [rabList]);

  // Approved RAB items eligible for PO creation
  const approvedRABItems = useMemo(() => {
    return rabList.filter(i => i.status === 'Disetujui');
  }, [rabList]);

  // Selected RAB for PO creation
  const targetRABForPO = useMemo(() => {
    return rabList.find(i => i.id === selectedRABIdForPO) || approvedRABItems[0];
  }, [rabList, selectedRABIdForPO, approvedRABItems]);

  // Remaining allowable volume & budget for the target RAB
  const targetRABRemainingQty = useMemo(() => {
    if (!targetRABForPO) return 0;
    const used = targetRABForPO.poCreatedQuantity || 0;
    return Math.max(0, targetRABForPO.volume - used);
  }, [targetRABForPO]);

  const targetRABRemainingAmount = useMemo(() => {
    if (!targetRABForPO) return 0;
    const used = targetRABForPO.poCreatedAmount || 0;
    return Math.max(0, targetRABForPO.totalBudget - used);
  }, [targetRABForPO]);

  // Strict Validation: Jangan mengizinkan PO melampaui jumlah atau anggaran yang disetujui tanpa otorisasi!
  const isPOExceedingVolume = poFormQuantity > targetRABRemainingQty;
  const isPOExceedingBudget = poFormQuantity * (poFormUnitPrice || targetRABForPO?.unitPrice || 0) > targetRABRemainingAmount;
  const isPOValidationInvalid = isPOExceedingVolume || isPOExceedingBudget || poFormQuantity <= 0;

  // Filtered POs
  const filteredPOs = useMemo(() => {
    if (filterPOStatus === 'ALL') return purchaseOrders;
    return purchaseOrders.filter(p => p.status === filterPOStatus);
  }, [purchaseOrders, filterPOStatus]);

  // ---------------------------------------------------------------------------
  // HANDLERS: SUBMODUL A (RAB)
  // ---------------------------------------------------------------------------
  const handleOpenCreateRAB = () => {
    setSelectedRAB(null);
    const nextNum = rabList.length + 1;
    setRabForm({
      category: 'RAB Bahan Pangan',
      budgetCode: `RAB-BP-2026-11-00${nextNum}`,
      planDate: '2026-11-08',
      periodMonth: 'November 2026',
      itemName: '',
      volume: 200,
      unit: 'kg',
      unitPrice: 35000,
      notes: '',
      status: 'Menunggu Persetujuan',
      poCreatedQuantity: 0,
      poCreatedAmount: 0,
    });
    setIsRABModalOpen(true);
  };

  const handleSaveRAB = (e: React.FormEvent) => {
    e.preventDefault();
    const calculatedTotal = Number(rabForm.volume) * Number(rabForm.unitPrice);

    if (selectedRAB) {
      setRabList(prev =>
        prev.map(r =>
          r.id === selectedRAB.id
            ? {
                ...r,
                ...rabForm,
                volume: Number(rabForm.volume),
                unitPrice: Number(rabForm.unitPrice),
                totalBudget: calculatedTotal,
              }
            : r
        )
      );
      addToast('success', 'RAB Diperbarui', `Item anggaran ${rabForm.itemName} berhasil diperbarui.`);
    } else {
      const newRAB: RABItem = {
        id: `rab-${Date.now()}`,
        ...rabForm,
        volume: Number(rabForm.volume),
        unitPrice: Number(rabForm.unitPrice),
        totalBudget: calculatedTotal,
        poCreatedQuantity: 0,
        poCreatedAmount: 0,
      };
      setRabList(prev => [newRAB, ...prev]);
      addToast('success', 'RAB Ditambahkan', `Item anggaran baru ${rabForm.itemName} berhasil diajukan.`);
    }
    setIsRABModalOpen(false);
  };

  const handleApproveRAB = (rabId: string) => {
    setRabList(prev =>
      prev.map(r =>
        r.id === rabId
          ? {
              ...r,
              status: 'Disetujui',
              approvedBy: `${currentUser.name} (${currentUser.role})`,
              approvedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
            }
          : r
      )
    );
    addToast('success', 'RAB Disetujui', 'Rencana Anggaran Belanja telah disahkan dan siap diterbitkan PO.');
  };

  const handleRejectRAB = (rabId: string) => {
    setRabList(prev =>
      prev.map(r => (r.id === rabId ? { ...r, status: 'Ditolak' } : r))
    );
    addToast('info', 'RAB Ditolak', 'Item anggaran ditolak dan dikembalikan untuk revisi.');
  };

  // Quick Action: Terbitkan PO langsung dari baris RAB yang disetujui
  const handleStartPOFromRAB = (rab: RABItem) => {
    setSelectedRABIdForPO(rab.id);
    const remQty = Math.max(0, rab.volume - (rab.poCreatedQuantity || 0));
    setPoFormQuantity(remQty > 0 ? Math.min(remQty, 300) : 50);
    setPoFormUnitPrice(rab.unitPrice);
    setPoFormSupplierName(masterSuppliers[0]?.name || 'PT Unggas Barokah Probolinggo');
    setPoFormNotes(`PO pengadaan langsung bersumber dari kode anggaran ${rab.budgetCode}`);
    setIsCreatePOOpen(true);
  };

  // ---------------------------------------------------------------------------
  // HANDLERS: SUBMODUL B (PURCHASE ORDER TERIKAT RAB)
  // ---------------------------------------------------------------------------
  const handleOpenCreatePO = () => {
    if (approvedRABItems.length === 0) {
      addToast('error', 'Tidak Ada RAB Disetujui', 'Silakan setujui item RAB terlebih dahulu sebelum menerbitkan PO.');
      return;
    }
    const firstApproved = approvedRABItems[0];
    setSelectedRABIdForPO(firstApproved.id);
    const remQty = Math.max(0, firstApproved.volume - (firstApproved.poCreatedQuantity || 0));
    setPoFormQuantity(remQty > 0 ? Math.min(remQty, 250) : 50);
    setPoFormUnitPrice(firstApproved.unitPrice);
    setPoFormSupplierName(masterSuppliers[0]?.name || 'Koperasi Tani Makmur Krejengan');
    setPoFormDeliveryDate('2026-11-10');
    setPoFormNotes(`PO diajukan berdasarkan otorisasi RAB ${firstApproved.budgetCode}`);
    setIsCreatePOOpen(true);
  };

  const handleRABSelectionChangeInPO = (rabId: string) => {
    setSelectedRABIdForPO(rabId);
    const found = rabList.find(r => r.id === rabId);
    if (found) {
      const remQty = Math.max(0, found.volume - (found.poCreatedQuantity || 0));
      setPoFormQuantity(remQty > 0 ? Math.min(remQty, 200) : 50);
      setPoFormUnitPrice(found.unitPrice);
    }
  };

  const handleSavePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRABForPO) return;

    if (isPOValidationInvalid) {
      addToast(
        'error',
        'Validasi Anggaran Gagal',
        `Jumlah pesanan tidak boleh melampaui sisa alokasi RAB yang disetujui (${targetRABRemainingQty} ${targetRABForPO.unit}).`
      );
      return;
    }

    const subtotal = poFormQuantity * (poFormUnitPrice || targetRABForPO.unitPrice);
    const generatedPONumber = `PO/SPPG-TMG2/2026/XI/00${Math.floor(Math.random() * 80) + 10}`;

    const newPO: Omit<PurchaseOrder, 'id'> = {
      poNumber: generatedPONumber,
      date: new Date().toISOString().slice(0, 10),
      supplierName: poFormSupplierName || 'Supplier Mitra Terdaftar',
      supplierContact: '0812-3456-7890 (PIC Pengiriman)',
      deliveryDate: poFormDeliveryDate,
      items: [
        {
          itemId: targetRABForPO.id,
          itemName: targetRABForPO.itemName,
          quantity: poFormQuantity,
          unit: targetRABForPO.unit,
          unitPrice: poFormUnitPrice || targetRABForPO.unitPrice,
          subtotal,
          rabId: targetRABForPO.id,
          receivedQuantity: 0,
        },
      ],
      totalAmount: subtotal,
      status: 'Menunggu persetujuan',
      qcStatus: 'Belum QC',
      notes: poFormNotes,
    };

    await addPurchaseOrder(newPO);

    // Update RAB cumulative tracking (poCreatedQuantity & poCreatedAmount)
    setRabList(prev =>
      prev.map(r =>
        r.id === targetRABForPO.id
          ? {
              ...r,
              poCreatedQuantity: (r.poCreatedQuantity || 0) + poFormQuantity,
              poCreatedAmount: (r.poCreatedAmount || 0) + subtotal,
            }
          : r
      )
    );

    addToast(
      'success',
      'PO Berhasil Diterbitkan',
      `Nomor ${generatedPONumber} sebesar ${formatRupiah(subtotal)} berhasil diajukan dari anggaran ${targetRABForPO.budgetCode}.`
    );
    setIsCreatePOOpen(false);
  };

  const handleUpdatePOStatus = async (poId: string, newStatus: POStatusPLOK) => {
    await updatePurchaseOrder(poId, {
      status: newStatus,
      approvedBy: newStatus === 'Disetujui' ? `${currentUser.name} (${currentUser.role})` : undefined,
    });
    addToast('success', 'Status PO Diperbarui', `Status PO diubah menjadi: ${newStatus}`);
  };

  // ---------------------------------------------------------------------------
  // HANDLERS: SUBMODUL C (QUALITY CONTROL & PENAMBAHAN STOK GUDANG)
  // ---------------------------------------------------------------------------
  const handleOpenQCModal = (po: PurchaseOrder) => {
    setSelectedPOForQC(po);
    const item = po.items[0];
    setQcFormReceivedQty(item?.quantity || 100);
    setQcFormCondition('Baik');
    setQcFormQualityGrade('Grade A (Sangat Baik)');
    setQcFormTemp(po.items[0]?.itemName.toLowerCase().includes('ayam') || po.items[0]?.itemName.toLowerCase().includes('daging') ? 2.5 : 24.0);
    setQcFormExpiryDate(new Date(Date.now() + 86400000 * 5).toISOString().slice(0, 10));
    setQcFormPhotoUrl('https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=600&q=80');
    setQcFormNotes('Pemeriksaan fisik bahan segar lolos organoleptik, bebas cacat, kemasan steril.');
    setQcFormStatus('Diterima');
    setQcFormInspector(currentUser.name);
    setIsQCModalOpen(true);
  };

  const handleUploadQCPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setQcFormPhotoUrl(reader.result as string);
        addToast('success', 'Foto Terunggah', 'Foto dokumentasi fisik QC berhasil diunggah.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveQCInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPOForQC) return;

    const item = selectedPOForQC.items[0];
    const orderedQty = item ? item.quantity : 100;
    const receivedQty = Number(qcFormReceivedQty);

    // KETENTUAN PENTING:
    // Stok gudang HANYA bertambah berdasarkan jumlah yang benar-benar diterima dan disetujui!
    const shouldAddStock = (qcFormStatus === 'Diterima' || qcFormStatus === 'Diterima sebagian') && receivedQty > 0;

    const newQCRecord: QualityControlRecord = {
      id: `qc-${Date.now()}`,
      poId: selectedPOForQC.id,
      poNumber: selectedPOForQC.poNumber,
      supplierName: selectedPOForQC.supplierName,
      itemName: item?.itemName || 'Bahan Pangan MBG',
      orderedQuantity: orderedQty,
      unit: item?.unit || 'kg',
      receivedQuantity: receivedQty,
      condition: qcFormCondition,
      qualityGrade: qcFormQualityGrade,
      receivingTemp: qcFormTemp,
      expiryDate: qcFormExpiryDate,
      photoUrl: qcFormPhotoUrl || undefined,
      notes: qcFormNotes,
      inspectorName: qcFormInspector,
      status: qcFormStatus,
      inspectedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      inventoryAdded: shouldAddStock,
    };

    setQcList(prev => [newQCRecord, ...prev]);

    // If stock should be added, update inventory in store
    if (shouldAddStock) {
      // Find matching inventory item or add to first matching category
      const matchedInv = inventory.find(i =>
        i.name.toLowerCase().includes(item.itemName.toLowerCase().slice(0, 8))
      );
      if (matchedInv) {
        await adjustStock(
          matchedInv.id,
          receivedQty,
          `Penerimaan QC PO ${selectedPOForQC.poNumber} (${receivedQty} ${item.unit} ${qcFormQualityGrade})`
        );
      }
    }

    // Determine new PO status based on QC results
    let nextPOStatus: POStatusPLOK = selectedPOForQC.status;
    if (qcFormStatus === 'Diterima' && receivedQty >= orderedQty) {
      nextPOStatus = 'Selesai diterima';
    } else if (qcFormStatus === 'Diterima sebagian' || (qcFormStatus === 'Diterima' && receivedQty < orderedQty)) {
      nextPOStatus = 'Sebagian diterima';
    } else if (qcFormStatus === 'Ditolak') {
      nextPOStatus = 'Ditolak';
    }

    await updatePurchaseOrder(selectedPOForQC.id, {
      status: nextPOStatus,
      qcStatus: qcFormStatus,
      qcNotes: `[${qcFormQualityGrade}] ${qcFormNotes} (Diterima: ${receivedQty}/${orderedQty} ${item.unit})`,
    });

    addToast(
      'success',
      'QC Berhasil Disimpan',
      `Hasil QC ${selectedPOForQC.poNumber} disimpan. ${shouldAddStock ? `Stok gudang bertambah +${receivedQty} ${item?.unit}.` : 'Tidak ada penambahan stok gudang (Ditolak).'}`
    );
    setIsQCModalOpen(false);
  };

  // ---------------------------------------------------------------------------
  // EXPORTS
  // ---------------------------------------------------------------------------
  const handleExportRABPDF = () => {
    exportTableToPDF({
      title: 'Rencana Anggaran Belanja (RAB) SPPG TMG2',
      subtitle: 'Satuan Pelayanan Pemenuhan Gizi - Yayasan Hafshawaty Probolinggo',
      headers: ['Kode Anggaran', 'Kategori', 'Nama Barang', 'Volume', 'Harga Satuan', 'Total Anggaran', 'Status', 'Sisa Kuota PO'],
      rows: filteredRAB.map(r => [
        r.budgetCode,
        r.category,
        r.itemName,
        `${formatNumber(r.volume)} ${r.unit}`,
        formatRupiah(r.unitPrice),
        formatRupiah(r.totalBudget),
        r.status,
        `${formatNumber(Math.max(0, r.volume - (r.poCreatedQuantity || 0)))} ${r.unit}`,
      ]),
      fileName: 'RAB_Operasional_SPPG_TMG2',
      sppgConfig,
      signerName: sppgConfig.financeOfficer,
      signerRole: 'Pengawas Keuangan SPPG',
    });
  };

  const handleExportRABExcel = () => {
    const data = filteredRAB.map(r => ({
      'Kode Anggaran': r.budgetCode,
      'Kategori': r.category,
      'Periode': r.periodMonth,
      'Tanggal Rencana': r.planDate,
      'Nama Barang': r.itemName,
      'Volume': r.volume,
      'Satuan': r.unit,
      'Harga Satuan (Rp)': r.unitPrice,
      'Total Anggaran (Rp)': r.totalBudget,
      'Keterangan': r.notes || '-',
      'Status Persetujuan': r.status,
      'Disetujui Oleh': r.approvedBy || '-',
      'Volume PO Dibuat': r.poCreatedQuantity || 0,
      'Nilai PO Dibuat': r.poCreatedAmount || 0,
      'Sisa Volume Tersedia': Math.max(0, r.volume - (r.poCreatedQuantity || 0)),
    }));
    exportToExcel(data, 'RAB_Operasional_Bahan_SPPG_TMG2', 'RAB SPPG');
  };

  const handleExportQCPDF = () => {
    exportTableToPDF({
      title: 'Laporan Rekapitulasi Quality Control (QC) Penerimaan Barang',
      subtitle: 'SPPG Probolinggo Krejengan Temenggungan 2 - Program MBG BGN',
      headers: ['No. PO', 'Supplier', 'Barang', 'Pesan vs Terima', 'Kondisi & Kualitas', 'Suhu (°C)', 'Pemeriksa', 'Status QC'],
      rows: qcList.map(q => [
        q.poNumber,
        q.supplierName,
        q.itemName,
        `${q.orderedQuantity} ${q.unit} → ${q.receivedQuantity} ${q.unit}`,
        `${q.condition} (${q.qualityGrade})`,
        q.receivingTemp !== undefined ? `${q.receivingTemp}°C` : '-',
        q.inspectorName,
        q.status,
      ]),
      fileName: 'Laporan_QC_Penerimaan_Bahan_SPPG_TMG2',
      sppgConfig,
      signerName: sppgConfig.nutritionOfficer,
      signerRole: 'Pengawas Gizi Dietisien SPPG',
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-900 text-white flex items-center justify-center shadow-md shadow-blue-950/20 font-black">
            <ShoppingCart className="w-6 h-6 text-sky-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 font-mono tracking-wider">
                MODUL PLOK
              </span>
              <span className="text-xs text-slate-400 font-semibold">• Operasional MBG BGN</span>
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
              Perencanaan dan Pelaporan Operasional (PLOK)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Sistem Terintegrasi: Rencana Anggaran Belanja (RAB), Purchase Order (PO Terikat) & Quality Control (QC Stok)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'rab' && hasPermission('procurement', 'create') && (
            <button
              type="button"
              onClick={handleOpenCreateRAB}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-900 hover:bg-blue-800 dark:bg-sky-600 dark:hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Buat RAB Baru</span>
            </button>
          )}

          {activeTab === 'purchase_order' && hasPermission('procurement', 'create') && (
            <button
              type="button"
              onClick={handleOpenCreatePO}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-900 hover:bg-blue-800 dark:bg-sky-600 dark:hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Terbitkan PO (Dari RAB)</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards: High-level PLOK Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] text-slate-500 uppercase font-bold flex items-center justify-between">
            <span>Total Anggaran RAB</span>
            <Coins className="w-4 h-4 text-blue-900 dark:text-sky-400" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white font-mono mt-1">
            {formatRupiah(rabSummary.totalAll)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Pangan: {formatRupiah(rabSummary.totalPangan)} • Ops: {formatRupiah(rabSummary.totalOperasional)}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] text-slate-500 uppercase font-bold flex items-center justify-between">
            <span>RAB Telah Disetujui</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-600 font-mono mt-1">
            {formatRupiah(rabSummary.totalApproved)}
          </div>
          <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
            Otorisasi Sah Kepala SPPG
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] text-slate-500 uppercase font-bold flex items-center justify-between">
            <span>PO Terbit & Teralokasi</span>
            <ShoppingCart className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-xl font-black text-sky-600 font-mono mt-1">
            {formatRupiah(rabSummary.totalPOAmountCreated)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Sisa Pagu RAB: {formatRupiah(rabSummary.remainingBudget)}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] text-slate-500 uppercase font-bold flex items-center justify-between">
            <span>Inspeksi QC Masuk Gudang</span>
            <PackageCheck className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl font-black text-indigo-600 font-mono mt-1">
            {qcList.length} Batch QC
          </div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">
            Stok Terverifikasi Higienis
          </div>
        </div>
      </div>

      {/* 3 Main PLOK Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-1 text-xs font-bold scrollbar-thin">
        {[
          {
            key: 'rab' as SubModuleTab,
            label: 'A. Rencana Anggaran Belanja (RAB)',
            icon: <Coins className="w-4 h-4" />,
            badge: `${rabList.length} Item`,
          },
          {
            key: 'purchase_order' as SubModuleTab,
            label: 'B. Purchase Order (PO Terikat RAB)',
            icon: <ShoppingCart className="w-4 h-4" />,
            badge: `${purchaseOrders.length} PO`,
          },
          {
            key: 'quality_control' as SubModuleTab,
            label: 'C. Quality Control (QC) & Stok Gudang',
            icon: <PackageCheck className="w-4 h-4" />,
            badge: `${qcList.length} Record`,
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
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {tab.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* SUBMODUL A: RENCANA ANGGARAN BELANJA (RAB) */}
      {/* ========================================================================= */}
      {activeTab === 'rab' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold text-slate-400 uppercase text-[10px]">Filter Kategori:</span>
              {['ALL', 'RAB Bahan Pangan', 'RAB Operasional'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilterRABCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition ${
                    filterRABCategory === cat
                      ? 'bg-blue-900 text-white dark:bg-sky-600'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {cat === 'ALL' ? 'Semua Kategori' : cat}
                </button>
              ))}

              <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block" />

              <span className="font-bold text-slate-400 uppercase text-[10px]">Periode:</span>
              <select
                value={filterRABPeriod}
                onChange={e => setFilterRABPeriod(e.target.value)}
                className="px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-semibold"
              >
                <option value="ALL">Semua Periode</option>
                <option value="November 2026">November 2026</option>
                <option value="Oktober 2026">Oktober 2026</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportRABPDF}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition shadow-2xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>PDF RAB</span>
              </button>
              <button
                onClick={handleExportRABExcel}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-2xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Excel</span>
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

          {/* DataTable RAB */}
          <DataTable
            title="Daftar Rencana Anggaran Belanja (RAB)"
            subtitle="Kalkulasi otomatis: Total Anggaran = Volume × Harga Satuan • Otorisasi persetujuan belanja"
            data={filteredRAB}
            keyExtractor={item => item.id}
            searchPlaceholder="Cari kode anggaran, barang, atau keterangan..."
            searchKeys={['budgetCode', 'itemName', 'category', 'notes', 'periodMonth']}
            columns={[
              {
                key: 'budgetCode',
                header: 'Kode & Tanggal',
                render: row => (
                  <div className="font-mono text-xs">
                    <span className="font-bold text-blue-900 dark:text-sky-300">
                      {row.budgetCode}
                    </span>
                    <div className="text-[10px] text-slate-400">
                      {formatIndonesianDate(row.planDate)} • {row.periodMonth}
                    </div>
                  </div>
                ),
              },
              {
                key: 'itemName',
                header: 'Nama Barang & Kategori',
                render: row => (
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white text-xs">
                      {row.itemName}
                    </div>
                    <span
                      className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold mt-0.5 ${
                        row.category === 'RAB Bahan Pangan'
                          ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {row.category}
                    </span>
                    {row.notes && (
                      <div className="text-[10px] text-slate-500 italic mt-0.5 max-w-xs truncate">
                        "{row.notes}"
                      </div>
                    )}
                  </div>
                ),
              },
              {
                key: 'volume',
                header: 'Volume & Satuan',
                render: row => (
                  <div className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                    {formatNumber(row.volume)} {row.unit}
                  </div>
                ),
              },
              {
                key: 'unitPrice',
                header: 'Harga Satuan',
                render: row => (
                  <div className="font-mono text-xs text-slate-700 dark:text-slate-300">
                    {formatRupiah(row.unitPrice)}
                  </div>
                ),
              },
              {
                key: 'totalBudget',
                header: 'Total Anggaran',
                render: row => (
                  <div className="font-mono text-xs font-black text-slate-900 dark:text-white">
                    {formatRupiah(row.totalBudget)}
                  </div>
                ),
              },
              {
                key: 'poTracking',
                header: 'Alokasi Realisasi PO',
                render: row => {
                  const usedQty = row.poCreatedQuantity || 0;
                  const remQty = Math.max(0, row.volume - usedQty);
                  const percent = row.volume > 0 ? (usedQty / row.volume) * 100 : 0;
                  return (
                    <div className="text-xs font-mono">
                      <div className="flex items-center justify-between text-[11px]">
                        <span>PO: {formatNumber(usedQty)} {row.unit}</span>
                        <span className="text-slate-400">({percent.toFixed(0)}%)</span>
                      </div>
                      <div className="w-24 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 mt-1 overflow-hidden">
                        <div
                          className="bg-sky-600 h-full rounded-full"
                          style={{ width: `${Math.min(100, percent)}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                        Sisa: {formatNumber(remQty)} {row.unit}
                      </div>
                    </div>
                  );
                },
              },
              {
                key: 'status',
                header: 'Status Persetujuan',
                render: row => (
                  <div className="space-y-0.5">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                        row.status === 'Disetujui'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : row.status === 'Menunggu Persetujuan'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : row.status === 'Ditolak'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {row.status === 'Disetujui' && <CheckCircle className="w-3 h-3" />}
                      {row.status === 'Menunggu Persetujuan' && <Clock className="w-3 h-3" />}
                      {row.status === 'Ditolak' && <XCircle className="w-3 h-3" />}
                      <span>{row.status}</span>
                    </span>
                    {row.approvedBy && (
                      <div className="text-[9px] text-slate-400 truncate max-w-[120px]">
                        {row.approvedBy}
                      </div>
                    )}
                  </div>
                ),
              },
              {
                key: 'actions',
                header: 'Aksi Otorisasi & PO',
                align: 'right',
                render: row => (
                  <div className="flex items-center justify-end gap-1.5">
                    {/* Approve button for Chief / Finance */}
                    {row.status === 'Menunggu Persetujuan' && hasPermission('procurement', 'approve') && (
                      <button
                        onClick={() => handleApproveRAB(row.id)}
                        className="p-1.5 text-emerald-600 hover:text-emerald-800 rounded hover:bg-emerald-50 dark:hover:bg-emerald-950 transition"
                        title="Setujui Rencana Anggaran Belanja"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    )}
                    {row.status === 'Menunggu Persetujuan' && hasPermission('procurement', 'approve') && (
                      <button
                        onClick={() => handleRejectRAB(row.id)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 rounded hover:bg-rose-50 dark:hover:bg-rose-950 transition"
                        title="Tolak Item Anggaran"
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    )}

                    {/* Quick PO Button: Only if Approved and has remaining quota */}
                    {row.status === 'Disetujui' && (
                      <button
                        onClick={() => handleStartPOFromRAB(row)}
                        className="px-2 py-1 bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 hover:bg-sky-100 rounded text-[10px] font-bold flex items-center gap-1 border border-sky-200 dark:border-sky-800 transition"
                        title="Terbitkan PO dari RAB ini"
                      >
                        <ShoppingCart className="w-3 h-3" />
                        <span>Buat PO</span>
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
      {/* SUBMODUL B: PURCHASE ORDER (PO TERIKAT RAB) */}
      {/* ========================================================================= */}
      {activeTab === 'purchase_order' && (
        <div className="space-y-4">
          {/* Rules Banner */}
          <div className="bg-sky-50 dark:bg-sky-950/40 p-4 rounded-xl border border-sky-200 dark:border-sky-800 flex items-start gap-3 text-xs text-sky-900 dark:text-sky-200">
            <Info className="w-5 h-5 text-sky-700 dark:text-sky-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold">
                Aturan Pengendalian Pengadaan (PO Bersumber dari RAB):
              </div>
              <p className="leading-relaxed">
                Seluruh penerbitan Purchase Order (PO) wajib terhubung dengan item RAB yang telah berstatus <strong>Disetujui</strong>.
                Sistem secara otomatis memvalidasi sisa alokasi kuota dan memblokir PO yang melampaui volume maupun anggaran yang telah disahkan.
              </p>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs overflow-x-auto pb-1">
              <span className="font-bold text-slate-400 uppercase text-[10px]">Filter Status:</span>
              {[
                'ALL',
                'Draft',
                'Menunggu persetujuan',
                'Disetujui',
                'Dikirim ke supplier',
                'Sebagian diterima',
                'Selesai diterima',
              ].map(st => (
                <button
                  key={st}
                  onClick={() => setFilterPOStatus(st)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition whitespace-nowrap text-[11px] ${
                    filterPOStatus === st
                      ? 'bg-blue-900 text-white dark:bg-sky-600'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {st === 'ALL' ? 'Semua Status' : st}
                </button>
              ))}
            </div>

            <button
              onClick={triggerPrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Rekap PO</span>
            </button>
          </div>

          {/* DataTable PO */}
          <DataTable
            title="Daftar Purchase Order (PO) Bahan & Operasional"
            subtitle="Status pengadaan dari penerbitan, otorisasi, pengiriman supplier, hingga verifikasi QC"
            data={filteredPOs}
            keyExtractor={item => item.id}
            searchPlaceholder="Cari nomor PO, supplier, atau bahan..."
            searchKeys={['poNumber', 'supplierName', 'status', 'qcStatus', 'notes']}
            columns={[
              {
                key: 'poNumber',
                header: 'No. PO & Tanggal',
                render: row => (
                  <div className="font-mono text-xs">
                    <span className="font-bold text-blue-900 dark:text-sky-300">
                      {row.poNumber}
                    </span>
                    <div className="text-[10px] text-slate-400">
                      Terbit: {formatIndonesianDate(row.date)}
                    </div>
                    <div className="text-[10px] text-slate-500 font-sans">
                      Target Kirim: <strong>{formatIndonesianDate(row.deliveryDate)}</strong>
                    </div>
                  </div>
                ),
              },
              {
                key: 'supplierName',
                header: 'Supplier / Rekanan',
                render: row => (
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white text-xs">
                      {row.supplierName}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {row.supplierContact}
                    </div>
                  </div>
                ),
              },
              {
                key: 'items',
                header: 'Barang / Bahan Pesanan',
                render: row => (
                  <div className="space-y-0.5 text-xs">
                    {row.items.map((it, idx) => (
                      <div key={idx} className="font-semibold text-slate-800 dark:text-slate-200">
                        {it.itemName} ({formatNumber(it.quantity)} {it.unit})
                      </div>
                    ))}
                  </div>
                ),
              },
              {
                key: 'totalAmount',
                header: 'Total Nilai (Rp)',
                render: row => (
                  <div className="font-mono text-xs font-black text-slate-900 dark:text-white">
                    {formatRupiah(row.totalAmount)}
                  </div>
                ),
              },
              {
                key: 'status',
                header: 'Status PO',
                render: row => (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                      row.status === 'Selesai diterima' || row.status === 'Diterima di Gudang'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : row.status === 'Sebagian diterima'
                        ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                        : row.status === 'Dikirim ke supplier'
                        ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                        : row.status === 'Disetujui' || row.status === 'Disetujui Kepala'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-sky-300'
                        : row.status === 'Ditolak' || row.status === 'Dibatalkan'
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                  >
                    <span>{row.status}</span>
                  </span>
                ),
              },
              {
                key: 'qcStatus',
                header: 'Status QC Bahan',
                render: row => (
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      row.qcStatus === 'Lolos Penuh' || row.qcStatus === 'Diterima'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : row.qcStatus === 'Lolos Sebagian' || row.qcStatus === 'Diterima sebagian'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : row.qcStatus === 'Ditolak'
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {row.qcStatus}
                  </span>
                ),
              },
              {
                key: 'actions',
                header: 'Aksi & Alur PO',
                align: 'right',
                render: row => (
                  <div className="flex items-center justify-end gap-1.5">
                    {/* Detail PO Modal */}
                    <button
                      onClick={() => {
                        setSelectedPOForDetail(row);
                        setIsPODetailOpen(true);
                      }}
                      className="p-1 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="Lihat Detail & Cetak PO"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {/* Approve PO Button */}
                    {(row.status === 'Menunggu persetujuan' || row.status === 'Menunggu Verifikasi Keuangan') &&
                      hasPermission('procurement', 'approve') && (
                        <button
                          onClick={() => handleUpdatePOStatus(row.id, 'Disetujui')}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold flex items-center gap-1 transition shadow-xs"
                          title="Setujui PO"
                        >
                          <CheckCircle className="w-3 h-3" />
                          <span>Setujui</span>
                        </button>
                      )}

                    {/* Send to Supplier */}
                    {row.status === 'Disetujui' && (
                      <button
                        onClick={() => handleUpdatePOStatus(row.id, 'Dikirim ke supplier')}
                        className="px-2 py-1 bg-blue-900 hover:bg-blue-800 text-white rounded text-[10px] font-bold flex items-center gap-1 transition shadow-xs"
                        title="Kirim PO ke Supplier"
                      >
                        <Send className="w-3 h-3" />
                        <span>Kirim Supplier</span>
                      </button>
                    )}

                    {/* Quality Control Button: For arriving deliveries */}
                    {(row.status === 'Dikirim ke supplier' || row.status === 'Sebagian diterima') && (
                      <button
                        onClick={() => handleOpenQCModal(row)}
                        className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold flex items-center gap-1 transition shadow-xs"
                        title="Input Inspeksi Quality Control"
                      >
                        <PackageCheck className="w-3 h-3" />
                        <span>Inspeksi QC</span>
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
      {/* SUBMODUL C: QUALITY CONTROL & STOK GUDANG */}
      {/* ========================================================================= */}
      {activeTab === 'quality_control' && (
        <div className="space-y-4">
          <div className="bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-start gap-3 text-xs text-emerald-900 dark:text-emerald-200">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold">
                Kaidah Penerimaan Stok Gudang:
              </div>
              <p className="leading-relaxed">
                Data QC otomatis mengambil nomor PO, supplier, nama barang, dan jumlah pesanan.
                <strong> Stok gudang HANYA bertambah berdasarkan jumlah yang benar-benar diterima dan disetujui petugas</strong>, bukan berdasarkan jumlah pesanan awal PO.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <PackageCheck className="w-4 h-4 text-emerald-600" />
                Rekam Jejak Inspeksi Quality Control Penerimaan Bahan
              </h3>
              <p className="text-xs text-slate-500">
                Pemeriksaan fisik, pemantauan rantai dingin (suhu), tanggal kedaluwarsa, dan foto bukti penerimaan
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportQCPDF}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition shadow-2xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>PDF Laporan QC</span>
              </button>
              <button
                onClick={triggerPrint}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Lembar QC</span>
              </button>
            </div>
          </div>

          {/* DataTable QC */}
          <DataTable
            title="Log Inspeksi Quality Control (QC)"
            subtitle="Pemeriksaan organoleptik, suhu cold chain, mutu grade bahan pangan MBG"
            data={qcList}
            keyExtractor={item => item.id}
            searchPlaceholder="Cari no PO, barang, supplier, pemeriksa..."
            searchKeys={['poNumber', 'supplierName', 'itemName', 'inspectorName', 'condition', 'qualityGrade']}
            columns={[
              {
                key: 'poNumber',
                header: 'No. PO & Waktu QC',
                render: row => (
                  <div className="font-mono text-xs">
                    <span className="font-bold text-blue-900 dark:text-sky-300">
                      {row.poNumber}
                    </span>
                    <div className="text-[10px] text-slate-400">
                      {row.inspectedAt}
                    </div>
                  </div>
                ),
              },
              {
                key: 'supplierName',
                header: 'Supplier & Barang',
                render: row => (
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white text-xs">
                      {row.itemName}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {row.supplierName}
                    </div>
                  </div>
                ),
              },
              {
                key: 'quantities',
                header: 'Pesanan vs Diterima',
                render: row => (
                  <div className="font-mono text-xs">
                    <div>
                      Pesan: <strong>{row.orderedQuantity} {row.unit}</strong>
                    </div>
                    <div className="text-emerald-700 dark:text-emerald-400 font-black">
                      Terima: {row.receivedQuantity} {row.unit}
                    </div>
                  </div>
                ),
              },
              {
                key: 'quality',
                header: 'Kondisi & Mutu Grade',
                render: row => (
                  <div className="text-xs space-y-0.5">
                    <span
                      className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold ${
                        row.qualityGrade.includes('Grade A')
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : row.qualityGrade.includes('Grade B')
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      {row.qualityGrade}
                    </span>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400">
                      Kondisi: {row.condition}
                    </div>
                  </div>
                ),
              },
              {
                key: 'temp',
                header: 'Suhu & Kadaluarsa',
                render: row => (
                  <div className="font-mono text-xs">
                    <div className="flex items-center gap-1 font-bold text-slate-800 dark:text-slate-200">
                      <Thermometer className="w-3.5 h-3.5 text-sky-600" />
                      <span>{row.receivingTemp !== undefined ? `${row.receivingTemp}°C` : 'Suhu Ruang'}</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Exp: {formatIndonesianDate(row.expiryDate)}
                    </div>
                  </div>
                ),
              },
              {
                key: 'photoUrl',
                header: 'Foto Inspeksi',
                render: row => (
                  <div>
                    {row.photoUrl ? (
                      <button
                        onClick={() => setViewPhotoUrl(row.photoUrl || null)}
                        className="group relative w-12 h-10 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 block"
                        title="Klik untuk perbesar foto QC"
                      >
                        <img
                          src={row.photoUrl}
                          alt="QC"
                          className="w-full h-full object-cover group-hover:scale-110 transition"
                        />
                      </button>
                    ) : (
                      <span className="text-slate-400 text-[10px]">Tidak ada foto</span>
                    )}
                  </div>
                ),
              },
              {
                key: 'stockStatus',
                header: 'Status QC & Stok',
                render: row => (
                  <div className="space-y-0.5">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        row.status === 'Diterima'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : row.status === 'Diterima sebagian'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      {row.status}
                    </span>
                    {row.inventoryAdded && (
                      <div className="text-[9px] text-emerald-600 font-bold flex items-center gap-0.5">
                        <Check className="w-3 h-3" />
                        <span>Stok Gudang +{row.receivedQuantity} {row.unit}</span>
                      </div>
                    )}
                  </div>
                ),
              },
            ]}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: BUAT / EDIT RAB */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isRABModalOpen}
        onClose={() => setIsRABModalOpen(false)}
        title={selectedRAB ? 'Edit Item Rencana Anggaran Belanja (RAB)' : 'Tambah Item RAB Baru'}
        subtitle="Perhitungan otomatis: Total Anggaran = Volume × Harga Satuan"
        maxWidth="lg"
      >
        <form onSubmit={handleSaveRAB} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Kategori RAB *
              </label>
              <select
                value={rabForm.category}
                onChange={e =>
                  setRabForm({
                    ...rabForm,
                    category: e.target.value as RABCategory,
                    budgetCode:
                      e.target.value === 'RAB Bahan Pangan'
                        ? `RAB-BP-2026-11-00${rabList.length + 1}`
                        : `RAB-OP-2026-11-00${rabList.length + 1}`,
                  })
                }
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
              >
                <option value="RAB Bahan Pangan">RAB Bahan Pangan</option>
                <option value="RAB Operasional">RAB Operasional</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Kode Anggaran *
              </label>
              <input
                type="text"
                required
                value={rabForm.budgetCode}
                onChange={e => setRabForm({ ...rabForm, budgetCode: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tanggal Perencanaan *
              </label>
              <input
                type="date"
                required
                value={rabForm.planDate}
                onChange={e => setRabForm({ ...rabForm, planDate: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Periode Anggaran *
              </label>
              <input
                type="text"
                required
                value={rabForm.periodMonth}
                onChange={e => setRabForm({ ...rabForm, periodMonth: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Nama Barang / Bahan / Keperluan Operasional *
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Daging Ayam Broiler Fillet Segar"
              value={rabForm.itemName}
              onChange={e => setRabForm({ ...rabForm, itemName: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Volume / Kuantitas *
              </label>
              <input
                type="number"
                min="1"
                required
                value={rabForm.volume}
                onChange={e => setRabForm({ ...rabForm, volume: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Satuan *
              </label>
              <input
                type="text"
                required
                placeholder="kg, liter, tabung, box"
                value={rabForm.unit}
                onChange={e => setRabForm({ ...rabForm, unit: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Harga Satuan (Rp) *
              </label>
              <input
                type="number"
                min="1"
                required
                value={rabForm.unitPrice}
                onChange={e => setRabForm({ ...rabForm, unitPrice: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
              />
            </div>
          </div>

          {/* Realtime Formula Total Box */}
          <div className="bg-blue-50 dark:bg-blue-950/60 p-3 rounded-xl border border-blue-200 dark:border-blue-900 flex items-center justify-between text-xs">
            <div>
              <div className="text-[10px] uppercase font-bold text-blue-950 dark:text-sky-300">
                Kalkulasi Total Anggaran (Volume × Harga Satuan):
              </div>
              <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 font-mono mt-0.5">
                {formatNumber(rabForm.volume)} {rabForm.unit} × {formatRupiah(rabForm.unitPrice)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-black text-blue-900 dark:text-sky-400 font-mono">
                {formatRupiah(Number(rabForm.volume) * Number(rabForm.unitPrice))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Keterangan Alokasi Anggaran (Opsional)
            </label>
            <input
              type="text"
              placeholder="Contoh: Suplai harian 22 hari operasional 2.850 porsi MBG."
              value={rabForm.notes}
              onChange={e => setRabForm({ ...rabForm, notes: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsRABModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold rounded-lg bg-blue-900 hover:bg-blue-800 text-white shadow-xs"
            >
              Simpan Item RAB
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: TERBITKAN PO (TERIKAT RAB DISIKSI) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isCreatePOOpen}
        onClose={() => setIsCreatePOOpen(false)}
        title="Terbitkan Purchase Order (PO Terikat RAB)"
        subtitle="Data PO wajib bersumber dari RAB yang telah disetujui. Otorisasi membatasi kelebihan anggaran."
        maxWidth="lg"
      >
        <form onSubmit={handleSavePO} className="space-y-4">
          {/* Pilih RAB yang Disetujui */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Pilih Item RAB yang Telah Disetujui *
            </label>
            <select
              value={selectedRABIdForPO}
              onChange={e => handleRABSelectionChangeInPO(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
            >
              {approvedRABItems.map(r => (
                <option key={r.id} value={r.id}>
                  {r.budgetCode} - {r.itemName} (Total: {formatNumber(r.volume)} {r.unit} | Sisa: {formatNumber(Math.max(0, r.volume - (r.poCreatedQuantity || 0)))} {r.unit})
                </option>
              ))}
            </select>
          </div>

          {/* Info Card Sisa RAB */}
          {targetRABForPO && (
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1">
              <div className="flex items-center justify-between text-slate-500 font-semibold">
                <span>Alokasi Disetujui: {formatNumber(targetRABForPO.volume)} {targetRABForPO.unit}</span>
                <span>Pagu RAB: {formatRupiah(targetRABForPO.totalBudget)}</span>
              </div>
              <div className="flex items-center justify-between font-mono font-bold pt-1 border-t border-slate-200 dark:border-slate-800">
                <span className="text-emerald-700 dark:text-emerald-400">
                  Sisa Kuota Volume: {formatNumber(targetRABRemainingQty)} {targetRABForPO.unit}
                </span>
                <span className="text-blue-900 dark:text-sky-300">
                  Sisa Pagu: {formatRupiah(targetRABRemainingAmount)}
                </span>
              </div>
            </div>
          )}

          {/* Supplier & Delivery Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Pilih Supplier / Rekanan *
              </label>
              <select
                value={poFormSupplierName}
                onChange={e => setPoFormSupplierName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
              >
                {masterSuppliers.map(s => (
                  <option key={s.id} value={s.name}>
                    {s.name} ({s.suppliedCategories.join(', ')})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tanggal Pengiriman *
              </label>
              <input
                type="date"
                required
                value={poFormDeliveryDate}
                onChange={e => setPoFormDeliveryDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          {/* Quantity & Unit Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Jumlah Pesanan ({targetRABForPO?.unit}) *
              </label>
              <input
                type="number"
                min="1"
                required
                value={poFormQuantity}
                onChange={e => setPoFormQuantity(Number(e.target.value))}
                className={`w-full px-3 py-2 text-xs rounded-lg border font-mono font-bold ${
                  isPOExceedingVolume
                    ? 'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950'
                    : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Harga Satuan (Rp) *
              </label>
              <input
                type="number"
                min="1"
                required
                value={poFormUnitPrice || targetRABForPO?.unitPrice || 0}
                onChange={e => setPoFormUnitPrice(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
              />
            </div>
          </div>

          {/* Validation Error Banner: Exceeding Budget Alert */}
          {isPOExceedingVolume && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/60 rounded-xl border border-rose-200 dark:border-rose-800 flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300 font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                Peringatan: Jumlah pesanan ({poFormQuantity} {targetRABForPO?.unit}) melampaui sisa kuota RAB yang disetujui ({targetRABRemainingQty} {targetRABForPO?.unit})! Otorisasi memblokir pesanan ini.
              </span>
            </div>
          )}

          {/* Total Box */}
          <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-3 rounded-xl flex items-center justify-between text-xs">
            <div>
              <div className="text-[10px] text-sky-300 font-bold uppercase">Total Nilai Purchase Order:</div>
              <div className="text-sm font-semibold font-mono mt-0.5">
                {formatNumber(poFormQuantity)} {targetRABForPO?.unit} × {formatRupiah(poFormUnitPrice || targetRABForPO?.unitPrice || 0)}
              </div>
            </div>
            <div className="text-xl font-black font-mono text-white">
              {formatRupiah(poFormQuantity * (poFormUnitPrice || targetRABForPO?.unitPrice || 0))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Catatan / Instruksi Pengiriman Khusus
            </label>
            <input
              type="text"
              placeholder="Contoh: Pengiriman subuh pkl 05:00 langsung ke chiller dapur SPPG."
              value={poFormNotes}
              onChange={e => setPoFormNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsCreatePOOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isPOValidationInvalid}
              className={`px-5 py-2 text-xs font-bold rounded-lg shadow-xs transition ${
                isPOValidationInvalid
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed dark:bg-slate-800 dark:text-slate-600'
                  : 'bg-blue-900 hover:bg-blue-800 text-white'
              }`}
            >
              Terbitkan Purchase Order
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: QUALITY CONTROL & PENERIMAAN STOK */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isQCModalOpen}
        onClose={() => setIsQCModalOpen(false)}
        title="Form Inspeksi Quality Control (QC) & Penerimaan Barang"
        subtitle={selectedPOForQC ? `Verifikasi fisik pengiriman PO: ${selectedPOForQC.poNumber}` : ''}
        maxWidth="lg"
      >
        {selectedPOForQC && (
          <form onSubmit={handleSaveQCInspection} className="space-y-4">
            {/* Read-only PO Meta (Otomatis mengambil data) */}
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
              <div>
                <span className="text-[10px] text-slate-400">Nomor PO:</span>
                <div className="font-bold text-slate-900 dark:text-white">{selectedPOForQC.poNumber}</div>
              </div>
              <div>
                <span className="text-[10px] text-slate-400">Supplier:</span>
                <div className="font-bold text-slate-900 dark:text-white truncate">{selectedPOForQC.supplierName}</div>
              </div>
              <div>
                <span className="text-[10px] text-slate-400">Nama Barang:</span>
                <div className="font-bold text-slate-900 dark:text-white truncate">{selectedPOForQC.items[0]?.itemName}</div>
              </div>
              <div>
                <span className="text-[10px] text-slate-400">Jumlah Pesanan:</span>
                <div className="font-bold text-blue-900 dark:text-sky-300">
                  {selectedPOForQC.items[0]?.quantity} {selectedPOForQC.items[0]?.unit}
                </div>
              </div>
            </div>

            {/* Input QC: Jumlah Diterima & Kondisi */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-emerald-700 dark:text-emerald-300 mb-1">
                  Jumlah yang Diterima & Lolos ({selectedPOForQC.items[0]?.unit}) *
                </label>
                <input
                  type="number"
                  min="0"
                  max={selectedPOForQC.items[0]?.quantity || 1000}
                  required
                  value={qcFormReceivedQty}
                  onChange={e => setQcFormReceivedQty(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-black"
                />
                <span className="text-[10px] text-slate-400">
                  *Stok gudang hanya bertambah sebesar nilai ini
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Kondisi Bahan *
                </label>
                <select
                  value={qcFormCondition}
                  onChange={e => setQcFormCondition(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                >
                  <option value="Baik">Baik (Segar, Utuh, Bersih)</option>
                  <option value="Kemasan Cacat">Kemasan Cacat (Bahan Masih Baik)</option>
                  <option value="Rusak Ringan">Rusak Ringan (Ada yang Patah/Cacat)</option>
                  <option value="Busuk/Tercemar">Busuk / Bau / Tercemar (Wajib Tolak)</option>
                </select>
              </div>
            </div>

            {/* Kualitas & Suhu */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Kualitas Mutu Grade *
                </label>
                <select
                  value={qcFormQualityGrade}
                  onChange={e => setQcFormQualityGrade(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                >
                  <option value="Grade A (Sangat Baik)">Grade A (Sangat Baik / Premium)</option>
                  <option value="Grade B (Standar)">Grade B (Standar Layak Konsumsi)</option>
                  <option value="Afkir (Tidak Layak)">Afkir (Tidak Layak / Buang)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Suhu Penerimaan Bahan (°C)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={qcFormTemp}
                    onChange={e => setQcFormTemp(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                  <Thermometer className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
                </div>
                <span className="text-[10px] text-slate-400">
                  Daging/Ayam chilled: 0 s.d. 4°C | Kering: suhu ruang
                </span>
              </div>
            </div>

            {/* Tanggal Kedaluwarsa & Petugas */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tanggal Kedaluwarsa (Expired) *
                </label>
                <input
                  type="date"
                  required
                  value={qcFormExpiryDate}
                  onChange={e => setQcFormExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Petugas Pemeriksa QC *
                </label>
                <input
                  type="text"
                  required
                  value={qcFormInspector}
                  onChange={e => setQcFormInspector(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Status QC & Upload Foto */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Status Hasil QC *
                </label>
                <select
                  value={qcFormStatus}
                  onChange={e => setQcFormStatus(e.target.value as QCStatusPLOK)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                >
                  <option value="Diterima">Diterima Penuh (Masuk Gudang)</option>
                  <option value="Diterima sebagian">Diterima Sebagian (Masuk Gudang parsial)</option>
                  <option value="Ditolak">Ditolak (Kembalikan ke Supplier, Tidak Masuk Stok)</option>
                  <option value="Perlu pemeriksaan ulang">Perlu Pemeriksaan Ulang (Karantina)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Foto Bukti Fisik Bahan (Dokumentasi QC)
                </label>
                <div className="flex items-center gap-2">
                  <label className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-slate-300 dark:border-slate-700 transition">
                    <Camera className="w-3.5 h-3.5" />
                    <span>Unggah Foto</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleUploadQCPhoto}
                    />
                  </label>
                  {qcFormPhotoUrl && (
                    <div className="w-10 h-9 rounded overflow-hidden border border-emerald-500">
                      <img src={qcFormPhotoUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Keterangan & Catatan Pemeriksaan Organoleptik
              </label>
              <textarea
                rows={2}
                value={qcFormNotes}
                onChange={e => setQcFormNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsQCModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs"
              >
                Simpan QC & Tambah ke Stok Gudang
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: DETAIL & CETAK LEMBAR PURCHASE ORDER RESMI */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isPODetailOpen}
        onClose={() => setIsPODetailOpen(false)}
        title="Surat Pesanan Resmi (Purchase Order MBG)"
        subtitle="Dokumen pengadaan bahan pangan terverifikasi anggaran SPPG"
        maxWidth="lg"
      >
        {selectedPOForDetail && (
          <div className="space-y-4 text-xs">
            <PrintHeader
              title="SURAT PESANAN BAHAN (PURCHASE ORDER)"
              docNumber={selectedPOForDetail.poNumber}
            />

            <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-[10px] text-slate-400">Kepada Supplier / Rekanan:</span>
                <div className="font-bold text-slate-900 dark:text-white text-sm">{selectedPOForDetail.supplierName}</div>
                <div className="text-[11px] text-slate-500">{selectedPOForDetail.supplierContact}</div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400">Tanggal Terbit & Kirim:</span>
                <div className="font-mono font-bold text-slate-900 dark:text-white">{formatIndonesianDate(selectedPOForDetail.date)}</div>
                <div className="text-[11px] text-sky-600 font-semibold">Tiba: {formatIndonesianDate(selectedPOForDetail.deliveryDate)}</div>
              </div>
            </div>

            {/* Items Table */}
            <table className="w-full text-left text-xs border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
              <thead className="bg-slate-100 dark:bg-slate-800 font-bold">
                <tr>
                  <th className="p-2.5">No</th>
                  <th className="p-2.5">Nama Barang / Bahan</th>
                  <th className="p-2.5 text-center">Jumlah</th>
                  <th className="p-2.5 text-right">Harga Satuan</th>
                  <th className="p-2.5 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {selectedPOForDetail.items.map((it, idx) => (
                  <tr key={idx}>
                    <td className="p-2.5">{idx + 1}</td>
                    <td className="p-2.5 font-sans font-bold">{it.itemName}</td>
                    <td className="p-2.5 text-center">{formatNumber(it.quantity)} {it.unit}</td>
                    <td className="p-2.5 text-right">{formatRupiah(it.unitPrice)}</td>
                    <td className="p-2.5 text-right font-black">{formatRupiah(it.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 dark:bg-slate-900 font-mono font-bold border-t border-slate-200 dark:border-slate-800">
                <tr>
                  <td colSpan={4} className="p-2.5 text-right font-sans uppercase">Total Nilai Pesanan:</td>
                  <td className="p-2.5 text-right font-black text-emerald-700 dark:text-emerald-400 text-sm">
                    {formatRupiah(selectedPOForDetail.totalAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-4 text-center pt-4 border-t border-slate-200 dark:border-slate-800">
              <div>
                <div className="text-[10px] text-slate-400">Verifikator Anggaran:</div>
                <div className="h-12 flex items-center justify-center text-[10px] text-slate-400 italic">
                  [Telah Terverifikasi Keuangan]
                </div>
                <div className="font-bold text-slate-800 dark:text-slate-200">{sppgConfig.financeOfficer}</div>
                <div className="text-[10px] text-slate-400">Pengawas Keuangan SPPG</div>
              </div>

              <div>
                <div className="text-[10px] text-slate-400">Disetujui Oleh:</div>
                <div className="h-12 flex items-center justify-center text-[10px] text-slate-400 italic">
                  [Disahkan Digital]
                </div>
                <div className="font-bold text-slate-800 dark:text-slate-200">{sppgConfig.headOfSppg}</div>
                <div className="text-[10px] text-slate-400">Kepala SPPG Temenggungan 2</div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsPODetailOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={triggerPrint}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-blue-900 hover:bg-blue-800 text-white shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Lembar PO</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: ZOOM / LIHAT FOTO QC */}
      {/* ========================================================================= */}
      <Modal
        isOpen={Boolean(viewPhotoUrl)}
        onClose={() => setViewPhotoUrl(null)}
        title="Dokumentasi Foto Inspeksi Quality Control"
        subtitle="Bukti fisik penerimaan bahan pangan di pos penerimaan SPPG"
        maxWidth="md"
      >
        {viewPhotoUrl && (
          <div className="space-y-3">
            <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-black">
              <img src={viewPhotoUrl} alt="Inspeksi QC" className="w-full max-h-96 object-contain mx-auto" />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setViewPhotoUrl(null)}
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
