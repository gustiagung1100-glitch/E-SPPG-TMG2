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
import {
  DynamicFormEditToggleBar,
  DynamicFormBuilderPanel,
  DynamicFormRenderer,
  validateDynamicFormFields,
} from '../common/DynamicFormBuilder';
import {
  appendDynamicExcelFields,
  appendDynamicExportColumns,
  buildDynamicTableColumns,
  getInitialCustomFieldValues,
} from '../../lib/dynamicFormSchemas';
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
  Upload,
  X,
  Trash2,
  Calculator,
  FileEdit,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { processMultipleImageUploads } from '../common/FacilityTempUploadSection';

type SubModuleTab = 'rab' | 'purchase_order' | 'quality_control';

const getQCPhotos = (record: { photoUrl?: string; photoUrls?: string[] }): string[] => {
  if (record.photoUrls && record.photoUrls.length > 0) return record.photoUrls;
  if (record.photoUrl) return [record.photoUrl];
  return [];
};

interface QCModalItemDraft {
  key: string;
  itemName: string;
  unit: string;
  orderedQuantity: number;
  receivedQuantity: number;
  condition: 'Baik' | 'Kemasan Cacat' | 'Rusak Ringan' | 'Busuk/Tercemar';
  qualityGrade: 'Grade A (Sangat Baik)' | 'Grade B (Standar)' | 'Afkir (Tidak Layak)';
  receivingTemp: number;
  expiryDate: string;
  photoUrls: string[];
  notes: string;
  status: QCStatusPLOK;
}

const QCManualNotesCell: React.FC<{
  initialNotes: string;
  onSave: (nextNotes: string) => void;
}> = ({ initialNotes, onSave }) => {
  const [draft, setDraft] = useState(initialNotes);
  const [savedFlash, setSavedFlash] = useState(false);

  React.useEffect(() => {
    setDraft(initialNotes);
  }, [initialNotes]);

  const isDirty = draft !== initialNotes;

  const commitSave = () => {
    if (!isDirty) return;
    onSave(draft);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
  };

  return (
    <div className="min-w-[190px] max-w-[240px] space-y-1">
      <textarea
        rows={2}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commitSave}
        placeholder="Tulis keterangan manual..."
        className="w-full px-2 py-1.5 text-[11px] leading-snug rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-600 resize-y"
      />
      <div className="flex items-center justify-between gap-1 text-[10px]">
        {isDirty ? (
          <button
            type="button"
            onClick={commitSave}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-900 hover:bg-blue-800 text-white font-bold transition"
          >
            <Check className="w-3 h-3" />
            <span>Simpan Keterangan</span>
          </button>
        ) : savedFlash ? (
          <span className="text-emerald-600 font-bold inline-flex items-center gap-0.5">
            <CheckCircle2 className="w-3 h-3" /> Tersimpan
          </span>
        ) : (
          <span className="text-slate-400">Ketik langsung & klik luar untuk simpan</span>
        )}
      </div>
    </div>
  );
};

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
    rabItems,
    addRABItem,
    updateRABItem,
    approveRABItem,
    qualityControlRecords,
    addQualityControlRecord,
    updateQualityControlRecord,
    dynamicFormSchemas,
  } = useApp();

  // Dynamic Form Builder States (RAB)
  const [isEditingRabSchema, setIsEditingRabSchema] = useState(false);
  const [isModalRabSchemaEdit, setIsModalRabSchemaEdit] = useState(false);

  // Active Sub-Module Tab
  const [activeTab, setActiveTab] = useState<SubModuleTab>('rab');

  // --- STATE SUBMODUL A: RAB (Synced with Global Store) ---
  const rabList = rabItems;
  const [filterRABCategory, setFilterRABCategory] = useState<string>('ALL');
  const [filterRABPeriod, setFilterRABPeriod] = useState<string>('ALL');
  const [isRABModalOpen, setIsRABModalOpen] = useState(false);
  const [selectedRAB, setSelectedRAB] = useState<RABItem | null>(null);

  // Form State for RAB
  const [rabForm, setRabForm] = useState<Omit<RABItem, 'id' | 'totalBudget'>>({
    category: 'RAB Bahan Pangan',
    budgetCode: `RAB-BP-2026-11-00${rabItems.length + 1}`,
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
    customFields: {},
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

  // --- STATE SUBMODUL C: QUALITY CONTROL (QC) (Synced with Global Store) ---
  const qcList = qualityControlRecords;
  const [isQCModalOpen, setIsQCModalOpen] = useState(false);
  const [selectedPOForQC, setSelectedPOForQC] = useState<PurchaseOrder | null>(null);
  const [qcEntrySourceMode, setQcEntrySourceMode] = useState<'po' | 'manual'>('po');
  const [qcSelectedPOId, setQcSelectedPOId] = useState<string>('');
  const [qcManualPONumber, setQcManualPONumber] = useState<string>('');
  const [qcManualSupplierName, setQcManualSupplierName] = useState<string>(
    masterSuppliers[0]?.name || 'Supplier Mitra Terdaftar'
  );
  const [qcItemDrafts, setQcItemDrafts] = useState<QCModalItemDraft[]>([]);
  const [qcFormInspector, setQcFormInspector] = useState<string>(currentUser.name);

  // Zoom / View QC Photo Gallery Modal
  const [viewGallery, setViewGallery] = useState<{
    urls: string[];
    index: number;
    title: string;
  } | null>(null);

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
      customFields: getInitialCustomFieldValues(dynamicFormSchemas.procurement_rab_form),
    });
    setIsRABModalOpen(true);
  };

  const handleOpenEditRAB = (rab: RABItem) => {
    setSelectedRAB(rab);
    setRabForm({
      category: rab.category,
      budgetCode: rab.budgetCode,
      planDate: rab.planDate,
      periodMonth: rab.periodMonth,
      itemName: rab.itemName,
      volume: rab.volume,
      unit: rab.unit,
      unitPrice: rab.unitPrice,
      notes: rab.notes || '',
      status: rab.status,
      approvedBy: rab.approvedBy,
      poCreatedQuantity: rab.poCreatedQuantity || 0,
      poCreatedAmount: rab.poCreatedAmount || 0,
      customFields: getInitialCustomFieldValues(dynamicFormSchemas.procurement_rab_form, rab.customFields),
    });
    setIsRABModalOpen(true);
  };

  const handleSaveRAB = async (e: React.FormEvent) => {
    e.preventDefault();
    const rabErr = validateDynamicFormFields(dynamicFormSchemas.procurement_rab_form, {
      ...rabForm,
      ...(rabForm.customFields || {}),
    });
    if (rabErr) {
      addToast('error', 'Validasi Form RAB', rabErr);
      return;
    }

    if (selectedRAB) {
      await updateRABItem(selectedRAB.id, {
        ...rabForm,
        volume: Number(rabForm.volume),
        unitPrice: Number(rabForm.unitPrice),
        customFields: rabForm.customFields || {},
      });
    } else {
      await addRABItem({
        ...rabForm,
        volume: Number(rabForm.volume),
        unitPrice: Number(rabForm.unitPrice),
        customFields: rabForm.customFields || {},
      });
    }
    setIsRABModalOpen(false);
    setIsModalRabSchemaEdit(false);
  };

  const handleApproveRAB = async (rabId: string) => {
    await approveRABItem(rabId, `${currentUser.name} (${currentUser.role})`);
  };

  const handleRejectRAB = async (rabId: string) => {
    await updateRABItem(rabId, { status: 'Ditolak' });
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
      rabId: targetRABForPO.id,
      qcStatus: 'Belum QC',
      notes: poFormNotes,
    };

    await addPurchaseOrder(newPO);
    await updateRABItem(targetRABForPO.id, {
      poCreatedQuantity: (targetRABForPO.poCreatedQuantity || 0) + poFormQuantity,
      poCreatedAmount: (targetRABForPO.poCreatedAmount || 0) + subtotal,
    });

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
  const buildDraftsFromPO = (po: PurchaseOrder): QCModalItemDraft[] => {
    const defaultExp = new Date(Date.now() + 86400000 * 5).toISOString().slice(0, 10);
    if (!po.items || po.items.length === 0) {
      return [
        {
          key: `draft-${Date.now()}-0`,
          itemName: 'Bahan Pangan MBG',
          unit: 'kg',
          orderedQuantity: 100,
          receivedQuantity: 100,
          condition: 'Baik',
          qualityGrade: 'Grade A (Sangat Baik)',
          receivingTemp: 24.0,
          expiryDate: defaultExp,
          photoUrls: [],
          notes: '',
          status: 'Diterima',
        },
      ];
    }
    return po.items.map((item, idx) => {
      const lowerName = item.itemName.toLowerCase();
      const isCold =
        lowerName.includes('ayam') ||
        lowerName.includes('daging') ||
        lowerName.includes('ikan') ||
        lowerName.includes('fillet');
      return {
        key: `draft-${Date.now()}-${idx}`,
        itemName: item.itemName,
        unit: item.unit || 'kg',
        orderedQuantity: item.quantity,
        receivedQuantity: item.quantity,
        condition: 'Baik',
        qualityGrade: 'Grade A (Sangat Baik)',
        receivingTemp: isCold ? 2.5 : 24.0,
        expiryDate: defaultExp,
        photoUrls: [],
        notes: '',
        status: 'Diterima',
      };
    });
  };

  const handleOpenQCModal = (po: PurchaseOrder) => {
    setQcEntrySourceMode('po');
    setSelectedPOForQC(po);
    setQcSelectedPOId(po.id);
    setQcManualPONumber(po.poNumber);
    setQcManualSupplierName(po.supplierName);
    setQcItemDrafts(buildDraftsFromPO(po));
    setQcFormInspector(currentUser.name);
    setIsQCModalOpen(true);
  };

  const handleOpenDirectQCModal = () => {
    const arrivingPO = purchaseOrders.find(
      p => p.status === 'Dikirim ke supplier' || p.status === 'Sebagian diterima'
    );
    if (arrivingPO) {
      handleOpenQCModal(arrivingPO);
      return;
    }
    const defaultExp = new Date(Date.now() + 86400000 * 5).toISOString().slice(0, 10);
    setQcEntrySourceMode('manual');
    setSelectedPOForQC(null);
    setQcSelectedPOId('MANUAL');
    setQcManualPONumber(`RCV/SPPG-TMG2/${new Date().toISOString().slice(0, 10).replace(/-/g, '')}/0${qcList.length + 1}`);
    setQcManualSupplierName(masterSuppliers[0]?.name || 'Supplier Mitra Terdaftar');
    setQcItemDrafts([
      {
        key: `draft-${Date.now()}-0`,
        itemName: '',
        unit: 'kg',
        orderedQuantity: 50,
        receivedQuantity: 50,
        condition: 'Baik',
        qualityGrade: 'Grade A (Sangat Baik)',
        receivingTemp: 24.0,
        expiryDate: defaultExp,
        photoUrls: [],
        notes: '',
        status: 'Diterima',
      },
    ]);
    setQcFormInspector(currentUser.name);
    setIsQCModalOpen(true);
  };

  const handleSelectPOSourceInQCModal = (val: string) => {
    setQcSelectedPOId(val);
    if (val === 'MANUAL') {
      setQcEntrySourceMode('manual');
      setSelectedPOForQC(null);
      setQcManualPONumber(`RCV/SPPG-TMG2/${new Date().toISOString().slice(0, 10).replace(/-/g, '')}/0${qcList.length + 1}`);
      setQcManualSupplierName(masterSuppliers[0]?.name || 'Supplier Mitra Terdaftar');
      if (qcItemDrafts.length === 0) {
        const defaultExp = new Date(Date.now() + 86400000 * 5).toISOString().slice(0, 10);
        setQcItemDrafts([
          {
            key: `draft-${Date.now()}-0`,
            itemName: '',
            unit: 'kg',
            orderedQuantity: 50,
            receivedQuantity: 50,
            condition: 'Baik',
            qualityGrade: 'Grade A (Sangat Baik)',
            receivingTemp: 24.0,
            expiryDate: defaultExp,
            photoUrls: [],
            notes: '',
            status: 'Diterima',
          },
        ]);
      }
      return;
    }

    const foundPO = purchaseOrders.find(p => p.id === val);
    if (foundPO) {
      setQcEntrySourceMode('po');
      setSelectedPOForQC(foundPO);
      setQcManualPONumber(foundPO.poNumber);
      setQcManualSupplierName(foundPO.supplierName);
      setQcItemDrafts(buildDraftsFromPO(foundPO));
    }
  };

  const handleUpdateQCItemDraft = (key: string, patch: Partial<QCModalItemDraft>) => {
    setQcItemDrafts(prev =>
      prev.map(item => {
        if (item.key !== key) return item;
        const next = { ...item, ...patch };
        if (patch.receivedQuantity !== undefined || patch.orderedQuantity !== undefined) {
          const ordered = Number(next.orderedQuantity);
          const received = Number(next.receivedQuantity);
          if (received <= 0) {
            next.status = 'Ditolak';
          } else if (ordered > 0 && received < ordered) {
            next.status = 'Diterima sebagian';
          } else {
            next.status = 'Diterima';
          }
        }
        return next;
      })
    );
  };

  const handleAppendPhotosToDraft = (key: string, newUrls: string[], itemLabel: string) => {
    setQcItemDrafts(prev =>
      prev.map(item =>
        item.key === key
          ? { ...item, photoUrls: [...item.photoUrls, ...newUrls] }
          : item
      )
    );
    addToast(
      'success',
      'Foto Terunggah',
      `${newUrls.length} foto untuk ${itemLabel} berhasil ditambahkan.`
    );
  };

  const handleRemovePhotoFromDraft = (key: string, photoIdx: number) => {
    setQcItemDrafts(prev =>
      prev.map(item =>
        item.key === key
          ? { ...item, photoUrls: item.photoUrls.filter((_, i) => i !== photoIdx) }
          : item
      )
    );
  };

  const handleAddQCItemRow = () => {
    const defaultExp = new Date(Date.now() + 86400000 * 5).toISOString().slice(0, 10);
    setQcItemDrafts(prev => [
      ...prev,
      {
        key: `draft-${Date.now()}-${prev.length}`,
        itemName: '',
        unit: 'kg',
        orderedQuantity: 25,
        receivedQuantity: 25,
        condition: 'Baik',
        qualityGrade: 'Grade A (Sangat Baik)',
        receivingTemp: 24.0,
        expiryDate: defaultExp,
        photoUrls: [],
        notes: '',
        status: 'Diterima',
      },
    ]);
  };

  const handleRemoveQCItemRow = (key: string) => {
    if (qcItemDrafts.length <= 1) return;
    setQcItemDrafts(prev => prev.filter(item => item.key !== key));
  };

  const handleSaveQCInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    const validDrafts = qcItemDrafts.filter(d => d.itemName.trim().length > 0);
    if (validDrafts.length === 0) {
      addToast('error', 'Data Bahan Kosong', 'Harap isi minimal 1 nama bahan/barang yang diterima.');
      return;
    }

    const activePO = qcEntrySourceMode === 'po' ? selectedPOForQC : null;
    const poId = activePO ? activePO.id : `manual-${Date.now()}`;
    const poNumber = activePO ? activePO.poNumber : qcManualPONumber.trim() || `RCV-${Date.now().toString().slice(-6)}`;
    const supplierName = activePO ? activePO.supplierName : qcManualSupplierName;

    for (const draft of validDrafts) {
      const orderedQty = Number(draft.orderedQuantity) || 0;
      const receivedQty = Number(draft.receivedQuantity) || 0;
      const diffQty = receivedQty - orderedQty;

      // KETENTUAN PENTING:
      // Stok gudang HANYA bertambah berdasarkan jumlah yang benar-benar diterima dan disetujui!
      const shouldAddStock =
        (draft.status === 'Diterima' || draft.status === 'Diterima sebagian' || draft.status === 'Lolos Penuh') &&
        receivedQty > 0;

      const newQCRecord: Omit<QualityControlRecord, 'id' | 'inspectedAt'> = {
        poId,
        poNumber,
        supplierName,
        itemName: draft.itemName.trim(),
        orderedQuantity: orderedQty,
        unit: draft.unit.trim() || 'kg',
        receivedQuantity: receivedQty,
        differenceQuantity: diffQty,
        condition: draft.condition,
        qualityGrade: draft.qualityGrade,
        receivingTemp: Number(draft.receivingTemp),
        expiryDate: draft.expiryDate,
        photoUrl: draft.photoUrls[0] || undefined,
        photoUrls: draft.photoUrls,
        notes: draft.notes.trim(),
        inspectorName: qcFormInspector,
        status: draft.status,
        inventoryAdded: shouldAddStock,
      };

      await addQualityControlRecord(newQCRecord);
    }

    setIsQCModalOpen(false);
  };

  // ---------------------------------------------------------------------------
  // EXPORTS
  // ---------------------------------------------------------------------------
  const handleExportRABPDF = () => {
    const baseHeaders = ['Kode Anggaran', 'Kategori', 'Nama Barang', 'Volume', 'Harga Satuan', 'Total Anggaran', 'Status', 'Sisa Kuota PO'];
    const baseRows = filteredRAB.map(r => [
      r.budgetCode,
      r.category,
      r.itemName,
      `${formatNumber(r.volume)} ${r.unit}`,
      formatRupiah(r.unitPrice),
      formatRupiah(r.totalBudget),
      r.status,
      `${formatNumber(Math.max(0, r.volume - (r.poCreatedQuantity || 0)))} ${r.unit}`,
    ]);
    const { headers, rows } = appendDynamicExportColumns(
      dynamicFormSchemas.procurement_rab_form,
      baseHeaders,
      baseRows,
      filteredRAB
    );
    exportTableToPDF({
      title: 'Rencana Anggaran Belanja (RAB) SPPG TMG2',
      subtitle: 'Satuan Pelayanan Pemenuhan Gizi - Yayasan Hafshawaty Probolinggo',
      headers,
      rows,
      fileName: 'RAB_Operasional_SPPG_TMG2',
      sppgConfig,
      signerName: sppgConfig.financeOfficer,
      signerRole: 'Pengawas Keuangan SPPG',
    });
  };

  const handleExportRABExcel = () => {
    const data = filteredRAB.map(r =>
      appendDynamicExcelFields(
        dynamicFormSchemas.procurement_rab_form,
        {
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
        },
        r
      )
    );
    exportToExcel(data, 'RAB_Operasional_Bahan_SPPG_TMG2', 'RAB SPPG');
  };

  const handleExportQCPDF = () => {
    exportTableToPDF({
      title: 'Laporan Rekapitulasi Quality Control (QC) Penerimaan Barang',
      subtitle: 'SPPG Probolinggo Krejengan Temenggungan 2 - Program MBG BGN',
      headers: [
        'No. PO',
        'Supplier',
        'Barang',
        'Dipesan',
        'Diterima',
        'Selisih',
        'Kondisi & Kualitas',
        'Suhu (°C)',
        'Keterangan',
        'Status QC',
      ],
      rows: qcList.map(q => {
        const diff = q.receivedQuantity - q.orderedQuantity;
        const diffText =
          diff === 0
            ? `Sesuai (0 ${q.unit})`
            : `${diff > 0 ? '+' : ''}${diff} ${q.unit}`;
        return [
          q.poNumber,
          q.supplierName,
          q.itemName,
          `${q.orderedQuantity} ${q.unit}`,
          `${q.receivedQuantity} ${q.unit}`,
          diffText,
          `${q.condition} (${q.qualityGrade})`,
          q.receivingTemp !== undefined ? `${q.receivingTemp}°C` : '-',
          q.notes || '-',
          q.status,
        ];
      }),
      fileName: 'Laporan_QC_Penerimaan_Bahan_SPPG_TMG2',
      sppgConfig,
      signerName: sppgConfig.nutritionOfficer,
      signerRole: 'Pengawas Gizi Dietisien SPPG',
    });
  };

  const handleExportQCExcel = () => {
    const data = qcList.map(q => {
      const diff = q.receivedQuantity - q.orderedQuantity;
      const pct = q.orderedQuantity > 0 ? ((q.receivedQuantity / q.orderedQuantity) * 100).toFixed(1) : '0';
      const photos = getQCPhotos(q);
      return {
        'No. PO / Referensi': q.poNumber,
        'Waktu Inspeksi': q.inspectedAt,
        'Supplier': q.supplierName,
        'Nama Bahan / Barang': q.itemName,
        'Satuan': q.unit,
        'Jumlah Dipesan': q.orderedQuantity,
        'Jumlah Diterima': q.receivedQuantity,
        'Selisih (Diterima - Dipesan)': diff,
        'Persentase Terpenuhi (%)': `${pct}%`,
        'Kondisi Fisik': q.condition,
        'Mutu Grade': q.qualityGrade,
        'Suhu (°C)': q.receivingTemp ?? '-',
        'Foto Terdokumentasi': photos.length > 0 ? `${photos.length} Foto` : 'Belum Ada Foto',
        'Keterangan Manual': q.notes || '-',
        'Pemeriksa': q.inspectorName,
        'Status QC': q.status,
      };
    });
    exportToExcel(data, 'Laporan_QC_Penerimaan_Bahan_SPPG_TMG2', 'QC Penerimaan');
  };

  const qcTotals = useMemo(() => {
    const ordered = qcList.reduce((acc, q) => acc + (Number(q.orderedQuantity) || 0), 0);
    const received = qcList.reduce((acc, q) => acc + (Number(q.receivedQuantity) || 0), 0);
    const diff = received - ordered;
    const pct = ordered > 0 ? Math.round((received / ordered) * 100) : 0;
    const photoCount = qcList.filter(q => getQCPhotos(q).length > 0).length;
    const totalPhotos = qcList.reduce((acc, q) => acc + getQCPhotos(q).length, 0);
    return { ordered, received, diff, pct, photoCount, totalPhotos };
  }, [qcList]);

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

          {activeTab === 'quality_control' && (
            <button
              type="button"
              onClick={handleOpenDirectQCModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Input Data Barang yang Diterima</span>
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
          {/* Dynamic Form Customizer Toggle & Builder Panel (Admin/Superuser only) */}
          <DynamicFormEditToggleBar
            formId="procurement_rab_form"
            isEditing={isEditingRabSchema}
            onToggleEdit={() => setIsEditingRabSchema(v => !v)}
          />
          {isEditingRabSchema && (
            <DynamicFormBuilderPanel
              formId="procurement_rab_form"
              onClose={() => setIsEditingRabSchema(false)}
            />
          )}

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
              ...buildDynamicTableColumns<RABItem>(
                dynamicFormSchemas.procurement_rab_form,
                (url, label) => setViewGallery({ urls: [url], index: 0, title: label })
              ),
              {
                key: 'actions',
                header: 'Aksi Otorisasi & PO',
                align: 'right',
                render: row => (
                  <div className="flex items-center justify-end gap-1.5">
                    {hasPermission('procurement', 'edit') && (
                      <button
                        type="button"
                        onClick={() => handleOpenEditRAB(row)}
                        className="p-1.5 text-blue-600 hover:text-blue-800 rounded hover:bg-blue-50 dark:hover:bg-blue-950 transition"
                        title="Edit Item RAB"
                      >
                        <FileEdit className="w-3.5 h-3.5" />
                      </button>
                    )}

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
                Kaidah Penerimaan Stok Gudang & Verifikasi Quality Control (QC):
              </div>
              <p className="leading-relaxed">
                Data QC otomatis mengambil nomor PO, supplier, nama barang, dan jumlah pesanan serta menghitung selisih antara barang dipesan dan diterima.
                <strong> Stok gudang HANYA bertambah berdasarkan jumlah yang benar-benar diterima dan disetujui petugas</strong>. Setiap item bahan/barang dapat langsung diunggah foto fisiknya dan diisi keterangan manual.
              </p>
            </div>
          </div>

          {/* Calculation & Photo Completeness Summary Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="text-[10px] font-bold uppercase text-slate-400">Total Qty Dipesan</div>
              <div className="text-lg font-black font-mono text-slate-900 dark:text-white mt-0.5">
                {formatNumber(qcTotals.ordered)} unit
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="text-[10px] font-bold uppercase text-slate-400">Total Qty Diterima</div>
              <div className="text-lg font-black font-mono text-emerald-600 mt-0.5">
                {formatNumber(qcTotals.received)} unit
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                <Calculator className="w-3 h-3 text-blue-600" />
                <span>Perhitungan Selisih</span>
              </div>
              <div
                className={`text-lg font-black font-mono mt-0.5 ${
                  qcTotals.diff === 0
                    ? 'text-emerald-600'
                    : qcTotals.diff < 0
                    ? 'text-rose-600'
                    : 'text-sky-600'
                }`}
              >
                {qcTotals.diff === 0
                  ? '0 (100% Sesuai)'
                  : `${qcTotals.diff > 0 ? '+' : ''}${formatNumber(qcTotals.diff)} unit (${qcTotals.pct}%)`}
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                <Camera className="w-3 h-3 text-indigo-600" />
                <span>Foto Bahan Terupload</span>
              </div>
              <div className="text-lg font-black font-mono text-indigo-600 mt-0.5">
                {qcTotals.photoCount}/{qcList.length} Item ({qcTotals.totalPhotos} Foto)
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <PackageCheck className="w-4 h-4 text-emerald-600" />
                Rekam Jejak Inspeksi Quality Control Penerimaan Bahan
              </h3>
              <p className="text-xs text-slate-500">
                Upload foto per masing-masing bahan/barang, pantau perhitungan selisih dipesan vs diterima, dan isi keterangan manual
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleOpenDirectQCModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Input Barang Diterima</span>
              </button>
              <button
                type="button"
                onClick={handleExportQCExcel}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-700 hover:bg-teal-600 text-white rounded-lg text-xs font-bold transition shadow-2xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Excel QC</span>
              </button>
              <button
                type="button"
                onClick={handleExportQCPDF}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition shadow-2xs"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>PDF Laporan QC</span>
              </button>
              <button
                type="button"
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
            subtitle="Pemeriksaan organoleptik, perhitungan selisih pesanan vs penerimaan, foto per bahan & keterangan manual"
            data={qcList}
            keyExtractor={item => item.id}
            searchPlaceholder="Cari no PO, barang, supplier, pemeriksa, keterangan..."
            searchKeys={['poNumber', 'supplierName', 'itemName', 'inspectorName', 'condition', 'qualityGrade', 'notes']}
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
                    <div className="text-[10px] text-slate-500 font-sans mt-0.5">
                      PIC: {row.inspectorName}
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
                header: 'Dipesan vs Diterima',
                render: row => (
                  <div className="font-mono text-xs space-y-0.5">
                    <div className="text-slate-600 dark:text-slate-300">
                      Dipesan: <strong className="text-slate-900 dark:text-white">{formatNumber(row.orderedQuantity)} {row.unit}</strong>
                    </div>
                    <div className="text-emerald-700 dark:text-emerald-400 font-black">
                      Diterima: {formatNumber(row.receivedQuantity)} {row.unit}
                    </div>
                  </div>
                ),
              },
              {
                key: 'variance',
                header: 'Perhitungan Selisih',
                render: row => {
                  const diff = row.receivedQuantity - row.orderedQuantity;
                  const pct = row.orderedQuantity > 0
                    ? Math.round((row.receivedQuantity / row.orderedQuantity) * 100)
                    : 0;
                  const isExact = diff === 0;
                  const isShort = diff < 0;
                  return (
                    <div className="font-mono text-xs space-y-1 min-w-[130px]">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-black ${
                          isExact
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : isShort
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                        }`}
                      >
                        {isExact
                          ? `Sesuai (0 ${row.unit})`
                          : isShort
                          ? `Kurang ${Math.abs(diff)} ${row.unit}`
                          : `Lebih +${diff} ${row.unit}`}
                      </span>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        {row.receivedQuantity} − {row.orderedQuantity} = {diff > 0 ? `+${diff}` : diff} ({pct}%)
                      </div>
                    </div>
                  );
                },
              },
              {
                key: 'quality',
                header: 'Kondisi, Mutu & Suhu',
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
                    <div className="flex items-center gap-1 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                      <Thermometer className="w-3 h-3 text-sky-600" />
                      <span>{row.receivingTemp !== undefined ? `${row.receivingTemp}°C` : 'Suhu Ruang'}</span>
                      <span className="text-slate-400">• Exp {formatIndonesianDate(row.expiryDate)}</span>
                    </div>
                  </div>
                ),
              },
              {
                key: 'photoUrl',
                header: 'Foto Bahan / Barang (Multi Foto)',
                render: row => {
                  const photos = getQCPhotos(row);
                  return (
                    <div className="flex flex-col gap-2 min-w-[165px]">
                      {photos.length > 0 ? (
                        <div className="space-y-1">
                          <div className="flex flex-wrap gap-1.5">
                            {photos.map((url, photoIdx) => (
                              <div
                                key={`${row.id}-photo-${photoIdx}`}
                                className="relative group w-14 h-12 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"
                              >
                                <img
                                  src={url}
                                  alt={`Foto ${row.itemName} #${photoIdx + 1}`}
                                  onClick={() =>
                                    setViewGallery({
                                      urls: photos,
                                      index: photoIdx,
                                      title: `${row.itemName} (${row.poNumber})`,
                                    })
                                  }
                                  className="w-full h-full object-cover cursor-pointer group-hover:scale-105 transition"
                                />
                                <span className="pointer-events-none absolute bottom-0.5 left-0.5 px-1 py-0.2 rounded bg-slate-900/75 text-white text-[8px] font-mono font-bold">
                                  #{photoIdx + 1}
                                </span>
                                <button
                                  type="button"
                                  onClick={e => {
                                    e.stopPropagation();
                                    const nextPhotos = photos.filter((_, idx) => idx !== photoIdx);
                                    updateQualityControlRecord(row.id, {
                                      photoUrls: nextPhotos,
                                      photoUrl: nextPhotos[0] || undefined,
                                    });
                                  }}
                                  className="print:hidden opacity-0 group-hover:opacity-100 absolute top-0.5 right-0.5 p-0.5 rounded bg-rose-600 text-white hover:bg-rose-500 transition"
                                  title="Hapus foto ini"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                          <div className="text-[10px] font-mono font-bold text-indigo-700 dark:text-sky-300">
                            {photos.length} foto terlampir (klik untuk perbesar)
                          </div>
                        </div>
                      ) : (
                        <div className="w-24 h-11 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 flex flex-col items-center justify-center text-slate-400 text-[9px]">
                          <Camera className="w-3.5 h-3.5 mb-0.5" />
                          <span>Belum ada foto</span>
                        </div>
                      )}

                      <label className="print:hidden inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-[10px] font-bold cursor-pointer transition w-fit shadow-2xs">
                        <Upload className="w-3 h-3 shrink-0" />
                        <span>{photos.length > 0 ? '+ Tambah Foto' : '+ Upload Foto'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={e =>
                            processMultipleImageUploads(
                              e,
                              newUrls => {
                                const nextPhotos = [...photos, ...newUrls];
                                updateQualityControlRecord(row.id, {
                                  photoUrls: nextPhotos,
                                  photoUrl: nextPhotos[0],
                                });
                              },
                              msg => addToast('error', 'Upload Foto Gagal', msg)
                            )
                          }
                        />
                      </label>
                    </div>
                  );
                },
              },
              {
                key: 'notes',
                header: 'Keterangan (Manual)',
                render: row => (
                  <QCManualNotesCell
                    initialNotes={row.notes || ''}
                    onSave={nextNotes => updateQualityControlRecord(row.id, { notes: nextNotes })}
                  />
                ),
              },
              {
                key: 'stockStatus',
                header: 'Status QC & Stok',
                render: row => (
                  <div className="space-y-0.5">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        row.status === 'Diterima' || row.status === 'Lolos Penuh'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : row.status === 'Diterima sebagian' || row.status === 'Lolos Sebagian'
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
        onClose={() => {
          setIsRABModalOpen(false);
          setIsModalRabSchemaEdit(false);
        }}
        title={selectedRAB ? 'Edit Item Rencana Anggaran Belanja (RAB)' : 'Tambah Item RAB Baru'}
        subtitle="Perhitungan otomatis: Total Anggaran = Volume × Harga Satuan"
        maxWidth="lg"
      >
        <form onSubmit={handleSaveRAB} className="space-y-4">
          <DynamicFormEditToggleBar
            formId="procurement_rab_form"
            isEditing={isModalRabSchemaEdit}
            onToggleEdit={() => setIsModalRabSchemaEdit(v => !v)}
            compact
          />
          {isModalRabSchemaEdit && (
            <DynamicFormBuilderPanel
              formId="procurement_rab_form"
              onClose={() => setIsModalRabSchemaEdit(false)}
            />
          )}

          <DynamicFormRenderer
            schema={dynamicFormSchemas.procurement_rab_form}
            values={{
              ...rabForm,
              ...(rabForm.customFields || {}),
            }}
            onChange={(key, value, field) => {
              if (field.isSystem) {
                setRabForm(prev => {
                  const next = { ...prev, [key]: value };
                  if (key === 'category' && !selectedRAB) {
                    next.budgetCode =
                      value === 'RAB Bahan Pangan'
                        ? `RAB-BP-2026-11-00${rabList.length + 1}`
                        : `RAB-OP-2026-11-00${rabList.length + 1}`;
                  }
                  return next;
                });
              } else {
                setRabForm(prev => ({
                  ...prev,
                  customFields: {
                    ...(prev.customFields || {}),
                    [key]: value,
                  },
                }));
              }
            }}
            onPreviewPhoto={url =>
              setViewGallery({ urls: [url], index: 0, title: rabForm.itemName || 'Lampiran RAB' })
            }
            onUploadError={msg => addToast('error', 'Upload Gagal', msg)}
            afterFieldRender={field => {
              if (field.key === 'unitPrice') {
                return (
                  <div className="md:col-span-2 bg-blue-50 dark:bg-blue-950/60 p-3 rounded-xl border border-blue-200 dark:border-blue-900 flex items-center justify-between text-xs">
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
                );
              }
              return null;
            }}
          />

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

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsRABModalOpen(false);
                setIsModalRabSchemaEdit(false);
              }}
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
      {/* MODAL: QUALITY CONTROL & INPUT DATA BARANG YANG DITERIMA */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isQCModalOpen}
        onClose={() => setIsQCModalOpen(false)}
        title="Input Data Barang yang Diterima & Inspeksi Quality Control (QC)"
        subtitle={
          qcEntrySourceMode === 'po' && selectedPOForQC
            ? `Verifikasi fisik penerimaan per bahan/barang untuk PO: ${selectedPOForQC.poNumber}`
            : 'Input penerimaan bahan/barang beserta upload foto per item, perhitungan selisih & keterangan manual'
        }
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveQCInspection} className="space-y-4">
          {/* Sumber Penerimaan & Info Header */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                Sumber Purchase Order / Penerimaan
              </label>
              <select
                value={qcSelectedPOId || 'MANUAL'}
                onChange={e => handleSelectPOSourceInQCModal(e.target.value)}
                className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
              >
                <option value="MANUAL">+ Penerimaan Langsung / Input Manual</option>
                {purchaseOrders.map(po => (
                  <option key={po.id} value={po.id}>
                    {po.poNumber} — {po.supplierName} ({po.status})
                  </option>
                ))}
              </select>
            </div>

            {qcEntrySourceMode === 'manual' ? (
              <>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    No. Referensi / Surat Jalan *
                  </label>
                  <input
                    type="text"
                    required
                    value={qcManualPONumber}
                    onChange={e => setQcManualPONumber(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Supplier / Rekanan *
                  </label>
                  <select
                    value={qcManualSupplierName}
                    onChange={e => setQcManualSupplierName(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                  >
                    {masterSuppliers.map(s => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <>
                <div>
                  <span className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Supplier Rekanan
                  </span>
                  <div className="px-2.5 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold text-slate-900 dark:text-white truncate">
                    {selectedPOForQC?.supplierName}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Petugas Pemeriksa QC *
                  </label>
                  <input
                    type="text"
                    required
                    value={qcFormInspector}
                    onChange={e => setQcFormInspector(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                  />
                </div>
              </>
            )}
          </div>

          {qcEntrySourceMode === 'manual' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Petugas Pemeriksa QC *
              </label>
              <input
                type="text"
                required
                value={qcFormInspector}
                onChange={e => setQcFormInspector(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
              />
            </div>
          )}

          {/* Daftar Bahan & Barang yang Diterima (Per-Item Upload Foto, Perhitungan Selisih, Keterangan Manual) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                <PackageCheck className="w-4 h-4 text-emerald-600" />
                <span>Daftar Bahan & Barang yang Diterima ({qcItemDrafts.length} Item)</span>
              </div>
              <button
                type="button"
                onClick={handleAddQCItemRow}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-sky-950/60 dark:hover:bg-sky-900/70 text-blue-900 dark:text-sky-300 border border-blue-200 dark:border-sky-800 text-[11px] font-bold transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Bahan / Barang</span>
              </button>
            </div>

            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              {qcItemDrafts.map((draft, idx) => {
                const ordered = Number(draft.orderedQuantity) || 0;
                const received = Number(draft.receivedQuantity) || 0;
                const diff = received - ordered;
                const pct = ordered > 0 ? Math.round((received / ordered) * 100) : 0;

                return (
                  <div
                    key={draft.key}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 space-y-3 shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                      <span className="text-[11px] font-black text-blue-900 dark:text-sky-300 uppercase tracking-wide">
                        Item #{idx + 1} {draft.itemName ? `— ${draft.itemName}` : ''}
                      </span>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-black ${
                            diff === 0
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : diff < 0
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                          }`}
                        >
                          Selisih: {diff === 0 ? `0 ${draft.unit} (Sesuai)` : `${diff > 0 ? '+' : ''}${diff} ${draft.unit}`} ({pct}%)
                        </span>
                        {qcItemDrafts.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveQCItemRow(draft.key)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            title="Hapus baris item ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Row 1: Nama Bahan, Satuan, Jumlah Dipesan, Jumlah Diterima, Perhitungan Selisih */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                      <div className="sm:col-span-4">
                        <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                          Nama Bahan / Barang *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Contoh: Daging Ayam Fillet"
                          value={draft.itemName}
                          onChange={e => handleUpdateQCItemDraft(draft.key, { itemName: e.target.value })}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                          Satuan *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="kg / pcs"
                          value={draft.unit}
                          onChange={e => handleUpdateQCItemDraft(draft.key, { unit: e.target.value })}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                          Dipesan ({draft.unit}) *
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          required
                          value={draft.orderedQuantity}
                          onChange={e =>
                            handleUpdateQCItemDraft(draft.key, {
                              orderedQuantity: Number(e.target.value),
                            })
                          }
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-emerald-700 dark:text-emerald-300 mb-1">
                          Diterima ({draft.unit}) *
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          required
                          value={draft.receivedQuantity}
                          onChange={e =>
                            handleUpdateQCItemDraft(draft.key, {
                              receivedQuantity: Number(e.target.value),
                            })
                          }
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-emerald-400 dark:border-emerald-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-black"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                          Hasil Hitung Selisih
                        </label>
                        <div
                          className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono font-black text-center ${
                            diff === 0
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : diff < 0
                              ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                              : 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300'
                          }`}
                        >
                          {diff > 0 ? `+${diff}` : diff} {draft.unit}
                        </div>
                      </div>
                    </div>

                    {/* Row 2: Kondisi, Mutu Grade, Suhu, Kadaluarsa, Status QC */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                          Kondisi Bahan
                        </label>
                        <select
                          value={draft.condition}
                          onChange={e =>
                            handleUpdateQCItemDraft(draft.key, { condition: e.target.value as any })
                          }
                          className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        >
                          <option value="Baik">Baik (Segar & Utuh)</option>
                          <option value="Kemasan Cacat">Kemasan Cacat</option>
                          <option value="Rusak Ringan">Rusak Ringan</option>
                          <option value="Busuk/Tercemar">Busuk / Tercemar</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                          Mutu Grade
                        </label>
                        <select
                          value={draft.qualityGrade}
                          onChange={e =>
                            handleUpdateQCItemDraft(draft.key, { qualityGrade: e.target.value as any })
                          }
                          className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        >
                          <option value="Grade A (Sangat Baik)">Grade A</option>
                          <option value="Grade B (Standar)">Grade B</option>
                          <option value="Afkir (Tidak Layak)">Afkir</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                          Suhu (°C)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={draft.receivingTemp}
                          onChange={e =>
                            handleUpdateQCItemDraft(draft.key, {
                              receivingTemp: Number(e.target.value),
                            })
                          }
                          className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                          Tgl Expired
                        </label>
                        <input
                          type="date"
                          required
                          value={draft.expiryDate}
                          onChange={e =>
                            handleUpdateQCItemDraft(draft.key, { expiryDate: e.target.value })
                          }
                          className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                          Status Hasil QC
                        </label>
                        <select
                          value={draft.status}
                          onChange={e =>
                            handleUpdateQCItemDraft(draft.key, {
                              status: e.target.value as QCStatusPLOK,
                            })
                          }
                          className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                        >
                          <option value="Diterima">Diterima Penuh</option>
                          <option value="Diterima sebagian">Diterima Sebagian</option>
                          <option value="Ditolak">Ditolak</option>
                          <option value="Perlu pemeriksaan ulang">Karantina</option>
                        </select>
                      </div>
                    </div>

                    {/* Row 3: Upload Foto Per Bahan (> 1 foto) + Keterangan Manual Per Bahan */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 items-start">
                      <div className="sm:col-span-6 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300">
                            Foto Bukti Bahan / Barang #{idx + 1} ({draft.photoUrls.length} Foto)
                          </label>
                          <label className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-[10px] font-bold cursor-pointer transition shadow-2xs">
                            <Upload className="w-3 h-3 shrink-0" />
                            <span>{draft.photoUrls.length > 0 ? '+ Tambah Foto' : '+ Upload Foto'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              className="hidden"
                              onChange={e =>
                                processMultipleImageUploads(
                                  e,
                                  newUrls =>
                                    handleAppendPhotosToDraft(
                                      draft.key,
                                      newUrls,
                                      draft.itemName || `Item #${idx + 1}`
                                    ),
                                  msg => addToast('error', 'Upload Foto Gagal', msg)
                                )
                              }
                            />
                          </label>
                        </div>

                        {draft.photoUrls.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {draft.photoUrls.map((url, photoIdx) => (
                              <div
                                key={`${draft.key}-thumb-${photoIdx}`}
                                className="relative group w-16 h-13 rounded-lg overflow-hidden border border-emerald-500 bg-slate-100 dark:bg-slate-800"
                              >
                                <img
                                  src={url}
                                  alt={`Preview ${draft.itemName} #${photoIdx + 1}`}
                                  onClick={() =>
                                    setViewGallery({
                                      urls: draft.photoUrls,
                                      index: photoIdx,
                                      title: draft.itemName || `Item #${idx + 1}`,
                                    })
                                  }
                                  className="w-full h-full object-cover cursor-pointer"
                                />
                                <span className="pointer-events-none absolute bottom-0.5 left-0.5 px-1 rounded bg-slate-900/75 text-white text-[8px] font-mono">
                                  #{photoIdx + 1}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemovePhotoFromDraft(draft.key, photoIdx)}
                                  className="absolute top-0.5 right-0.5 p-0.5 rounded bg-rose-600 text-white hover:bg-rose-500"
                                  title="Hapus foto ini"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-2.5 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 flex items-center gap-2 text-slate-400 text-[10px]">
                            <Camera className="w-4 h-4 shrink-0" />
                            <span>Bisa pilih & upload lebih dari 1 foto sekaligus untuk item ini</span>
                          </div>
                        )}
                      </div>

                      <div className="sm:col-span-6">
                        <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                          <FileEdit className="w-3 h-3 text-blue-600" />
                          <span>Kolom Keterangan Manual (Item #{idx + 1})</span>
                        </label>
                        <textarea
                          rows={3}
                          placeholder="Isi keterangan kondisi, selisih barang, atau catatan QC secara manual..."
                          value={draft.notes}
                          onChange={e =>
                            handleUpdateQCItemDraft(draft.key, { notes: e.target.value })
                          }
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Calculation Summary Bar Inside Modal */}
          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-4 font-mono">
              <span>
                Total Dipesan:{' '}
                <strong>
                  {formatNumber(
                    qcItemDrafts.reduce((s, d) => s + (Number(d.orderedQuantity) || 0), 0)
                  )}
                </strong>
              </span>
              <span>
                Total Diterima:{' '}
                <strong className="text-emerald-700 dark:text-emerald-400">
                  {formatNumber(
                    qcItemDrafts.reduce((s, d) => s + (Number(d.receivedQuantity) || 0), 0)
                  )}
                </strong>
              </span>
              <span>
                Total Selisih:{' '}
                <strong className="text-blue-900 dark:text-sky-300">
                  {(() => {
                    const totOrd = qcItemDrafts.reduce(
                      (s, d) => s + (Number(d.orderedQuantity) || 0),
                      0
                    );
                    const totRec = qcItemDrafts.reduce(
                      (s, d) => s + (Number(d.receivedQuantity) || 0),
                      0
                    );
                    const totDiff = totRec - totOrd;
                    return `${totDiff > 0 ? '+' : ''}${formatNumber(totDiff)}`;
                  })()}
                </strong>
              </span>
            </div>
            <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
              Foto Terlampir:{' '}
              {qcItemDrafts.reduce((s, d) => s + d.photoUrls.length, 0)} Foto (
              {qcItemDrafts.filter(d => d.photoUrls.length > 0).length} / {qcItemDrafts.length} Bahan)
            </div>
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
              Simpan QC & Data Barang Diterima
            </button>
          </div>
        </form>
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
      {/* MODAL: ZOOM / LIHAT GALERI FOTO QC (MULTI-FOTO) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={Boolean(viewGallery)}
        onClose={() => setViewGallery(null)}
        title={`Dokumentasi Foto QC — ${viewGallery?.title || ''}`}
        subtitle={
          viewGallery
            ? `Foto ke-${viewGallery.index + 1} dari ${viewGallery.urls.length} dokumentasi fisik penerimaan`
            : 'Bukti fisik penerimaan bahan pangan di pos penerimaan SPPG'
        }
        maxWidth="lg"
      >
        {viewGallery && viewGallery.urls.length > 0 && (
          <div className="space-y-3">
            <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-black flex items-center justify-center">
              <img
                src={viewGallery.urls[viewGallery.index]}
                alt={`Inspeksi QC #${viewGallery.index + 1}`}
                className="w-full max-h-96 object-contain mx-auto"
              />
              {viewGallery.urls.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setViewGallery(prev =>
                        prev
                          ? {
                              ...prev,
                              index: (prev.index - 1 + prev.urls.length) % prev.urls.length,
                            }
                          : null
                      )
                    }
                    className="absolute left-2 p-2 rounded-full bg-slate-900/75 hover:bg-slate-900 text-white transition"
                    title="Foto sebelumnya"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setViewGallery(prev =>
                        prev
                          ? {
                              ...prev,
                              index: (prev.index + 1) % prev.urls.length,
                            }
                          : null
                      )
                    }
                    className="absolute right-2 p-2 rounded-full bg-slate-900/75 hover:bg-slate-900 text-white transition"
                    title="Foto berikutnya"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {viewGallery.urls.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {viewGallery.urls.map((u, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() =>
                      setViewGallery(prev => (prev ? { ...prev, index: idx } : null))
                    }
                    className={`w-14 h-12 rounded-lg overflow-hidden border-2 shrink-0 transition ${
                      idx === viewGallery.index
                        ? 'border-blue-600 ring-2 ring-blue-500/30'
                        : 'border-slate-200 dark:border-slate-700 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={u} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setViewGallery(null)}
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
