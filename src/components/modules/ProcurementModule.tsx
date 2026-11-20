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
  RefreshCw,
  Link2,
} from 'lucide-react';
import { processMultipleImageUploads } from '../common/FacilityTempUploadSection';
import { computeMenuAggregatedNeeds } from '../../lib/supplyChainSync';

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
    masterBahan,
    masterSuppliers,
    masterUnits,
    currentUser,
    hasPermission,
    sppgConfig,
    addToast,
    rabItems,
    addRABItem,
    updateRABItem,
    approveRABItem,
    syncCriticalInventoryToRAB,
    qualityControlRecords,
    addQualityControlRecord,
    updateQualityControlRecord,
    syncAllMenuNeedsToRAB,
    menuItems,
    menuIngredientsMap,
    institutions,
    dynamicFormSchemas,
  } = useApp();

  const criticalInventoryCount = useMemo(
    () => inventory.filter(i => i.currentStock <= i.minimumStock).length,
    [inventory]
  );

  const menuPlannedNeeds = useMemo(
    () =>
      computeMenuAggregatedNeeds({
        menuItems,
        menuIngredientsMap,
        masterUnits,
        institutions,
        inventory,
        masterBahan,
      }),
    [menuItems, menuIngredientsMap, masterUnits, institutions, inventory, masterBahan]
  );

  const unitOptions = useMemo(
    () =>
      masterUnits.map(u => ({
        value: u.code,
        label: `${u.code} — ${u.name}`,
      })),
    [masterUnits]
  );

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
    sourceType: 'menu_planning',
    customFields: {},
  });

  // --- STATE SUBMODUL B: PURCHASE ORDER (PO TERIKAT RAB) ---
  const [isCreatePOOpen, setIsCreatePOOpen] = useState(false);
  const [selectedPOForDetail, setSelectedPOForDetail] = useState<PurchaseOrder | null>(null);
  const [isPODetailOpen, setIsPODetailOpen] = useState(false);
  const [filterPOStatus, setFilterPOStatus] = useState<string>('ALL');

  // Multi-item Form State for Creating PO strictly from Approved RAB
  interface PODraftLine {
    key: string;
    rabId: string;
    quantity: number;
    unitPrice: number;
  }
  const [poDraftLines, setPoDraftLines] = useState<PODraftLine[]>([]);
  const [poFormSupplierName, setPoFormSupplierName] = useState<string>('');
  const [poFormDeliveryDate, setPoFormDeliveryDate] = useState<string>('2026-11-10');
  const [poFormNotes, setPoFormNotes] = useState<string>('');

  // --- STATE SUBMODUL C: QUALITY CONTROL (QC) (Wajib Terikat Purchase Order) ---
  const qcList = qualityControlRecords;
  const [isQCModalOpen, setIsQCModalOpen] = useState(false);
  const [editingQCRecord, setEditingQCRecord] = useState<QualityControlRecord | null>(null);
  const [selectedPOForQC, setSelectedPOForQC] = useState<PurchaseOrder | null>(null);
  const [qcSelectedPOId, setQcSelectedPOId] = useState<string>('');
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

  const eligibleRABItemsForPO = useMemo(() => {
    return approvedRABItems.filter(r => r.volume - (r.poCreatedQuantity || 0) > 0);
  }, [approvedRABItems]);

  // Validasi multi-item PO lines against each RAB's remaining quota & budget
  const poDraftValidation = useMemo(() => {
    if (poDraftLines.length === 0) {
      return {
        isInvalid: true,
        errorMessage: 'Tambahkan minimal 1 item RAB untuk diterbitkan menjadi PO.',
        totalAmount: 0,
      };
    }

    const usedQtyByRab = new Map<string, number>();
    const usedAmtByRab = new Map<string, number>();
    let totalAmount = 0;

    for (const line of poDraftLines) {
      const rab = rabList.find(r => r.id === line.rabId);
      if (!rab || rab.status !== 'Disetujui') {
        return {
          isInvalid: true,
          errorMessage: 'Setiap item PO wajib berasal dari RAB yang berstatus Disetujui.',
          totalAmount: 0,
        };
      }
      if (line.quantity <= 0 || line.unitPrice <= 0) {
        return {
          isInvalid: true,
          errorMessage: `Kuantitas dan harga satuan untuk ${rab.itemName} harus lebih besar dari 0.`,
          totalAmount: 0,
        };
      }
      const lineSub = line.quantity * line.unitPrice;
      totalAmount += lineSub;
      usedQtyByRab.set(rab.id, (usedQtyByRab.get(rab.id) || 0) + line.quantity);
      usedAmtByRab.set(rab.id, (usedAmtByRab.get(rab.id) || 0) + lineSub);
    }

    for (const [rabId, reqQty] of usedQtyByRab.entries()) {
      const rab = rabList.find(r => r.id === rabId)!;
      const remQty = Math.max(0, rab.volume - (rab.poCreatedQuantity || 0));
      const remAmt = Math.max(0, rab.totalBudget - (rab.poCreatedAmount || 0));
      const reqAmt = usedAmtByRab.get(rabId) || 0;
      if (reqQty > remQty) {
        return {
          isInvalid: true,
          errorMessage: `Jumlah pesanan ${rab.itemName} (${formatNumber(reqQty)} ${rab.unit}) melampaui sisa kuota RAB (${formatNumber(remQty)} ${rab.unit}).`,
          totalAmount,
        };
      }
      if (reqAmt > remAmt + 100) {
        return {
          isInvalid: true,
          errorMessage: `Nilai PO ${rab.itemName} (${formatRupiah(reqAmt)}) melampaui sisa pagu RAB (${formatRupiah(remAmt)}).`,
          totalAmount,
        };
      }
    }

    return {
      isInvalid: false,
      errorMessage: '',
      totalAmount,
    };
  }, [poDraftLines, rabList]);

  // Eligible POs for QC (must exist and not be rejected/cancelled)
  const eligiblePOsForQC = useMemo(() => {
    const active = purchaseOrders.filter(p => p.status !== 'Ditolak' && p.status !== 'Dibatalkan');
    return [...active].sort((a, b) => {
      const score = (po: PurchaseOrder) => {
        if (po.status === 'Dikirim ke supplier' || po.status === 'Sebagian diterima') return 0;
        if (po.status === 'Disetujui' || po.status === 'Disetujui Kepala') return 1;
        if (po.status === 'Menunggu persetujuan') return 2;
        return 3;
      };
      return score(a) - score(b);
    });
  }, [purchaseOrders]);

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
      sourceType: 'menu_planning',
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
      sourceType: rab.sourceType,
      sourceMenuId: rab.sourceMenuId,
      sourceMenuCode: rab.sourceMenuCode,
      sourceMenuLabel: rab.sourceMenuLabel,
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
    const remQty = Math.max(0, rab.volume - (rab.poCreatedQuantity || 0));
    if (remQty <= 0) {
      addToast(
        'warning',
        'Kuota RAB Terpenuhi',
        `Seluruh volume RAB ${rab.budgetCode} (${rab.itemName}) sudah diterbitkan menjadi PO.`
      );
      return;
    }
    setPoDraftLines([
      {
        key: `po-line-${Date.now()}-0`,
        rabId: rab.id,
        quantity: remQty,
        unitPrice: rab.unitPrice,
      },
    ]);
    setPoFormSupplierName(masterSuppliers[0]?.name || 'PT Unggas Barokah Probolinggo');
    setPoFormDeliveryDate('2026-11-10');
    setPoFormNotes(`PO pengadaan bersumber dari kode anggaran ${rab.budgetCode}`);
    setIsCreatePOOpen(true);
  };

  // ---------------------------------------------------------------------------
  // HANDLERS: SUBMODUL B (PURCHASE ORDER TERIKAT RAB)
  // ---------------------------------------------------------------------------
  const handleOpenCreatePO = () => {
    if (approvedRABItems.length === 0) {
      addToast(
        'error',
        'Tidak Ada RAB Disetujui',
        'Silakan setujui item RAB (dari Perencanaan Menu) terlebih dahulu sebelum menerbitkan PO.'
      );
      return;
    }
    const targetList = eligibleRABItemsForPO.length > 0 ? eligibleRABItemsForPO : approvedRABItems;
    const firstApproved = targetList[0];
    const remQty = Math.max(0, firstApproved.volume - (firstApproved.poCreatedQuantity || 0));
    if (remQty <= 0) {
      addToast(
        'warning',
        'Seluruh Kuota RAB Terpakai',
        'Semua RAB yang disetujui sudah habis dialokasikan ke PO. Tambahkan atau setujui RAB baru.'
      );
      return;
    }
    setPoDraftLines([
      {
        key: `po-line-${Date.now()}-0`,
        rabId: firstApproved.id,
        quantity: remQty,
        unitPrice: firstApproved.unitPrice,
      },
    ]);
    setPoFormSupplierName(masterSuppliers[0]?.name || 'Koperasi Tani Makmur Krejengan');
    setPoFormDeliveryDate('2026-11-10');
    setPoFormNotes(`PO diajukan berdasarkan otorisasi RAB ${firstApproved.budgetCode}`);
    setIsCreatePOOpen(true);
  };

  const handleUpdatePODraftLine = (key: string, patch: Partial<PODraftLine>) => {
    setPoDraftLines(prev =>
      prev.map(line => {
        if (line.key !== key) return line;
        const next = { ...line, ...patch };
        if (patch.rabId) {
          const found = rabList.find(r => r.id === patch.rabId);
          if (found) {
            const remQty = Math.max(0, found.volume - (found.poCreatedQuantity || 0));
            next.quantity = remQty > 0 ? remQty : 1;
            next.unitPrice = found.unitPrice;
          }
        }
        return next;
      })
    );
  };

  const handleAddPODraftLine = () => {
    const usedIds = new Set(poDraftLines.map(l => l.rabId));
    const candidate =
      eligibleRABItemsForPO.find(r => !usedIds.has(r.id)) ||
      eligibleRABItemsForPO[0] ||
      approvedRABItems[0];
    if (!candidate) return;
    const remQty = Math.max(0, candidate.volume - (candidate.poCreatedQuantity || 0));
    setPoDraftLines(prev => [
      ...prev,
      {
        key: `po-line-${Date.now()}-${prev.length}`,
        rabId: candidate.id,
        quantity: remQty > 0 ? remQty : 1,
        unitPrice: candidate.unitPrice,
      },
    ]);
  };

  const handleRemovePODraftLine = (key: string) => {
    if (poDraftLines.length <= 1) return;
    setPoDraftLines(prev => prev.filter(l => l.key !== key));
  };

  const handleSavePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (poDraftValidation.isInvalid) {
      addToast('error', 'Validasi Anggaran Gagal', poDraftValidation.errorMessage);
      return;
    }

    const poItems: PurchaseOrderItem[] = [];
    const linkedBudgetCodes: string[] = [];
    for (const line of poDraftLines) {
      const rab = rabList.find(r => r.id === line.rabId);
      if (!rab) continue;
      const qty = Number(line.quantity);
      const price = Number(line.unitPrice) || rab.unitPrice;
      poItems.push({
        itemId: rab.id,
        itemName: rab.itemName,
        quantity: qty,
        unit: rab.unit,
        unitPrice: price,
        subtotal: qty * price,
        rabId: rab.id,
        receivedQuantity: 0,
      });
      if (!linkedBudgetCodes.includes(rab.budgetCode)) {
        linkedBudgetCodes.push(rab.budgetCode);
      }
    }

    if (poItems.length === 0) return;

    const totalAmount = poItems.reduce((sum, it) => sum + it.subtotal, 0);
    const seq = String(purchaseOrders.length + 1).padStart(3, '0');
    const generatedPONumber = `PO/SPPG-TMG2/2026/XI/${seq}`;

    const newPO: Omit<PurchaseOrder, 'id'> = {
      poNumber: generatedPONumber,
      date: new Date().toISOString().slice(0, 10),
      supplierName: poFormSupplierName || 'Supplier Mitra Terdaftar',
      supplierContact: '0812-3456-7890 (PIC Pengiriman)',
      deliveryDate: poFormDeliveryDate,
      items: poItems,
      totalAmount,
      status: 'Menunggu persetujuan',
      rabId: poItems[0].rabId,
      qcStatus: 'Belum QC',
      notes: poFormNotes || `PO bersumber dari RAB ${linkedBudgetCodes.join(', ')}`,
    };

    await addPurchaseOrder(newPO);

    addToast(
      'success',
      'PO Berhasil Diterbitkan',
      `Nomor ${generatedPONumber} (${poItems.length} item, ${formatRupiah(totalAmount)}) berhasil diajukan dari RAB ${linkedBudgetCodes.join(', ')}.`
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
  // HANDLERS: SUBMODUL C (QUALITY CONTROL TERIKAT PO -> STOK GUDANG)
  // ---------------------------------------------------------------------------
  const buildDraftsFromPO = (po: PurchaseOrder): QCModalItemDraft[] => {
    const defaultExp = new Date(Date.now() + 86400000 * 5).toISOString().slice(0, 10);
    return (po.items || []).map((item, idx) => {
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
    setEditingQCRecord(null);
    setSelectedPOForQC(po);
    setQcSelectedPOId(po.id);
    setQcItemDrafts(buildDraftsFromPO(po));
    setQcFormInspector(currentUser.name);
    setIsQCModalOpen(true);
  };

  const handleOpenEditQCRecord = (record: QualityControlRecord) => {
    const linkedPO =
      purchaseOrders.find(p => p.id === record.poId || p.poNumber === record.poNumber) || null;
    setEditingQCRecord(record);
    setSelectedPOForQC(linkedPO);
    setQcSelectedPOId(linkedPO?.id || record.poId);
    setQcFormInspector(record.inspectorName || currentUser.name);
    setQcItemDrafts([
      {
        key: `edit-${record.id}`,
        itemName: record.itemName,
        unit: record.unit,
        orderedQuantity: record.orderedQuantity,
        receivedQuantity: record.receivedQuantity,
        condition: record.condition,
        qualityGrade: record.qualityGrade,
        receivingTemp: record.receivingTemp ?? 24.0,
        expiryDate: record.expiryDate,
        photoUrls: getQCPhotos(record),
        notes: record.notes || '',
        status: record.status,
      },
    ]);
    setIsQCModalOpen(true);
  };

  const handleOpenDirectQCModal = () => {
    if (eligiblePOsForQC.length === 0) {
      addToast(
        'warning',
        'Belum Ada Purchase Order (PO)',
        'Input Quality Control wajib mengambil data dari Purchase Order (PO). Silakan terbitkan & kirim PO terlebih dahulu.'
      );
      return;
    }
    handleOpenQCModal(eligiblePOsForQC[0]);
  };

  const handleSelectPOSourceInQCModal = (val: string) => {
    setQcSelectedPOId(val);
    const foundPO = purchaseOrders.find(p => p.id === val);
    if (foundPO) {
      setSelectedPOForQC(foundPO);
      setQcItemDrafts(buildDraftsFromPO(foundPO));
    }
  };

  const handleUpdateQCItemDraft = (key: string, patch: Partial<QCModalItemDraft>) => {
    setQcItemDrafts(prev =>
      prev.map(item => {
        if (item.key !== key) return item;
        const next = { ...item, ...patch };
        if (patch.receivedQuantity !== undefined) {
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

  const handleReloadPOItemsInQC = () => {
    if (!selectedPOForQC) return;
    setQcItemDrafts(buildDraftsFromPO(selectedPOForQC));
  };

  const handleRemoveQCItemRow = (key: string) => {
    if (qcItemDrafts.length <= 1) return;
    setQcItemDrafts(prev => prev.filter(item => item.key !== key));
  };

  const handleSaveQCInspection = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingQCRecord) {
      const draft = qcItemDrafts[0];
      if (!draft) return;
      const receivedQty = Number(draft.receivedQuantity) || 0;
      const orderedQty = Number(draft.orderedQuantity) || 0;
      const shouldAddStock =
        (draft.status === 'Diterima' ||
          draft.status === 'Diterima sebagian' ||
          draft.status === 'Lolos Penuh') &&
        receivedQty > 0;

      await updateQualityControlRecord(editingQCRecord.id, {
        receivedQuantity: receivedQty,
        differenceQuantity: receivedQty - orderedQty,
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
      });
      setEditingQCRecord(null);
      setIsQCModalOpen(false);
      return;
    }

    if (!selectedPOForQC) {
      addToast(
        'error',
        'Sumber PO Wajib Dipilih',
        'Quality Control hanya dapat dilakukan terhadap Purchase Order (PO) yang sudah diterbitkan.'
      );
      return;
    }

    const validDrafts = qcItemDrafts.filter(d => d.itemName.trim().length > 0);
    if (validDrafts.length === 0) {
      addToast('error', 'Data Bahan Kosong', 'PO terpilih tidak memiliki item untuk diinspeksi.');
      return;
    }

    for (const draft of validDrafts) {
      const orderedQty = Number(draft.orderedQuantity) || 0;
      const receivedQty = Number(draft.receivedQuantity) || 0;
      const diffQty = receivedQty - orderedQty;

      // Stok gudang HANYA bertambah berdasarkan hasil input Quality Control yang diterima!
      const shouldAddStock =
        (draft.status === 'Diterima' ||
          draft.status === 'Diterima sebagian' ||
          draft.status === 'Lolos Penuh') &&
        receivedQty > 0;

      const newQCRecord: Omit<QualityControlRecord, 'id' | 'inspectedAt'> = {
        poId: selectedPOForQC.id,
        poNumber: selectedPOForQC.poNumber,
        supplierName: selectedPOForQC.supplierName,
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
      {/* Compact Banner Header */}
      <div className="bg-white dark:bg-slate-900 px-5 py-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1E3A8A] text-white flex items-center justify-center shadow-sm shrink-0">
            <ShoppingCart className="w-5 h-5 text-sky-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-blue-50 text-[#1E3A8A] dark:bg-sky-950 dark:text-sky-300 font-mono tracking-wider">
                MODUL PLOK
              </span>
              <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">• Operasional MBG BGN</span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
              Perencanaan dan Pelaporan Operasional (PLOK)
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Sistem Terintegrasi: Rencana Anggaran Belanja (RAB), Purchase Order (PO Terikat) & Quality Control (QC Stok)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'rab' && (
            <DynamicFormEditToggleBar
              formId="procurement_rab_form"
              isEditing={isEditingRabSchema}
              onToggleEdit={() => setIsEditingRabSchema(v => !v)}
            />
          )}
          {activeTab === 'rab' && hasPermission('procurement', 'create') && (
            <>
              <button
                type="button"
                onClick={() => syncAllMenuNeedsToRAB()}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:hover:bg-teal-900/70 text-[#0D9488] dark:text-teal-300 border border-teal-200 dark:border-teal-800 rounded-xl text-xs font-bold shadow-xs transition-all duration-200 ease-in-out"
                title="Ambil & sinkronkan kebutuhan bahan otomatis dari Perencanaan Menu (PLOG) ke RAB Bahan Pangan"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Sinkron dari Perencanaan Menu ({menuPlannedNeeds.aggregated.length})</span>
              </button>
              <button
                type="button"
                onClick={() => syncCriticalInventoryToRAB()}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/70 text-[#D97706] dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-bold shadow-xs transition-all duration-200 ease-in-out"
                title="Buat pengajuan RAB otomatis dari bahan Gudang yang berada di bawah stok minimum"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Stok Kritis ({criticalInventoryCount})</span>
              </button>
              <button
                type="button"
                onClick={handleOpenCreateRAB}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#1E3A8A] hover:bg-blue-900 dark:bg-sky-600 dark:hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-xs transition-all duration-200 ease-in-out"
              >
                <Plus className="w-4 h-4" />
                <span>Buat RAB Baru</span>
              </button>
            </>
          )}

          {activeTab === 'purchase_order' && hasPermission('procurement', 'create') && (
            <button
              type="button"
              onClick={handleOpenCreatePO}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#1E3A8A] hover:bg-blue-900 dark:bg-sky-600 dark:hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-xs transition-all duration-200 ease-in-out"
            >
              <Plus className="w-4 h-4" />
              <span>Terbitkan PO (Dari RAB)</span>
            </button>
          )}

          {activeTab === 'quality_control' && (
            <button
              type="button"
              onClick={handleOpenDirectQCModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#0D9488] hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all duration-200 ease-in-out"
            >
              <Plus className="w-4 h-4" />
              <span>Input QC dari Purchase Order</span>
            </button>
          )}
        </div>
      </div>

      {/* Pipeline Rantai Pasok Terintegrasi */}
      <div className="bg-gradient-to-r from-blue-50 via-sky-50 to-teal-50 dark:from-slate-900 dark:via-slate-900 dark:to-teal-950/30 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <div className="flex items-center gap-1.5 font-black text-[#1E3A8A] dark:text-sky-300">
          <Link2 className="w-4 h-4 text-[#1E3A8A] dark:text-sky-400 shrink-0" />
          <span>Alur Data Terhubung Otomatis:</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 font-bold">
          <span className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200">
            1. Perencanaan Menu ({menuItems.length} Menu)
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-blue-200 dark:border-sky-800 text-[#1E3A8A] dark:text-sky-300">
            2. RAB ({rabList.length} Item)
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300">
            3. Purchase Order ({purchaseOrders.length} PO)
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-teal-200 dark:border-teal-800 text-[#0D9488] dark:text-teal-300">
            4. Quality Control ({qcList.length} QC)
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="px-2 py-1 rounded-lg bg-[#0D9488] text-white">
            5. Stok Gudang ({inventory.length} Komoditas)
          </span>
        </div>
      </div>

      {/* KPI Cards: High-level PLOK Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between h-full transition-all duration-200 ease-in-out">
          <div className="text-[11px] text-slate-600 dark:text-slate-400 uppercase font-bold flex items-center justify-between">
            <span>Total Anggaran RAB</span>
            <Coins className="w-4 h-4 text-[#1E3A8A] dark:text-sky-400" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white font-mono mt-1">
            {formatRupiah(rabSummary.totalAll)}
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
            Pangan: {formatRupiah(rabSummary.totalPangan)} • Ops: {formatRupiah(rabSummary.totalOperasional)}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between h-full transition-all duration-200 ease-in-out">
          <div className="text-[11px] text-slate-600 dark:text-slate-400 uppercase font-bold flex items-center justify-between">
            <span>RAB Telah Disetujui</span>
            <ShieldCheck className="w-4 h-4 text-[#0D9488]" />
          </div>
          <div className="text-xl font-black text-[#0D9488] font-mono mt-1">
            {formatRupiah(rabSummary.totalApproved)}
          </div>
          <div className="text-[11px] text-[#0D9488] font-semibold mt-0.5">
            Otorisasi Sah Kepala SPPG
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between h-full transition-all duration-200 ease-in-out">
          <div className="text-[11px] text-slate-600 dark:text-slate-400 uppercase font-bold flex items-center justify-between">
            <span>PO Terbit & Teralokasi</span>
            <ShoppingCart className="w-4 h-4 text-[#1E3A8A] dark:text-sky-400" />
          </div>
          <div className="text-xl font-black text-[#1E3A8A] dark:text-sky-400 font-mono mt-1">
            {formatRupiah(rabSummary.totalPOAmountCreated)}
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
            Sisa Pagu RAB: {formatRupiah(rabSummary.remainingBudget)}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between h-full transition-all duration-200 ease-in-out">
          <div className="text-[11px] text-slate-600 dark:text-slate-400 uppercase font-bold flex items-center justify-between">
            <span>Inspeksi QC Masuk Gudang</span>
            <PackageCheck className="w-4 h-4 text-[#0D9488]" />
          </div>
          <div className="text-xl font-black text-[#1E3A8A] dark:text-sky-400 font-mono mt-1">
            {qcList.length} Batch QC
          </div>
          <div className="text-[11px] text-[#0D9488] font-semibold mt-0.5">
            Stok Terverifikasi Higienis
          </div>
        </div>
      </div>

      {/* 3 Main PLOK Responsive Pill Tabs */}
      <div className="bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
          {[
            {
              key: 'rab' as SubModuleTab,
              label: 'A. Rencana Anggaran Belanja (RAB)',
              icon: <Coins className="w-4 h-4 shrink-0" />,
              badge: `${rabList.length} Item`,
            },
            {
              key: 'purchase_order' as SubModuleTab,
              label: 'B. Purchase Order (PO Terikat RAB)',
              icon: <ShoppingCart className="w-4 h-4 shrink-0" />,
              badge: `${purchaseOrders.length} PO`,
            },
            {
              key: 'quality_control' as SubModuleTab,
              label: 'C. Quality Control (QC) & Stok Gudang',
              icon: <PackageCheck className="w-4 h-4 shrink-0" />,
              badge: `${qcList.length} Record`,
            },
          ].map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`min-h-[38px] inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ease-in-out whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-[#1E3A8A] text-white shadow-sm dark:bg-sky-600'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-blue-50 text-[#1E3A8A] border border-blue-200/80 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-800'
                }`}>
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUBMODUL A: RENCANA ANGGARAN BELANJA (RAB) */}
      {/* ========================================================================= */}
      {activeTab === 'rab' && (
        <div className="space-y-4">
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
            onPrint={triggerPrint}
            stickyFirstColumn
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
                header: 'Nama Barang, Kategori & Sumber Menu',
                render: row => (
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white text-xs">
                      {row.itemName}
                    </div>
                    <div className="flex flex-wrap items-center gap-1 mt-0.5">
                      <span
                        className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold ${
                          row.category === 'RAB Bahan Pangan'
                            ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {row.category}
                      </span>
                      {row.sourceType === 'menu_planning' && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          <Link2 className="w-2.5 h-2.5" />
                          <span>Menu PLOG: {row.sourceMenuCode || row.sourceMenuLabel || 'Terhubung'}</span>
                        </span>
                      )}
                      {row.sourceType === 'operasional' && (
                        <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          Operasional SPPG
                        </span>
                      )}
                    </div>
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
            onPrint={triggerPrint}
            stickyFirstColumn
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
                header: 'Barang / Bahan Pesanan & Sumber RAB',
                render: row => (
                  <div className="space-y-1 text-xs">
                    {row.items.map((it, idx) => {
                      const linkedRab = rabList.find(r => r.id === (it.rabId || row.rabId));
                      return (
                        <div key={idx} className="space-y-0.5">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {it.itemName} ({formatNumber(it.quantity)} {it.unit})
                          </div>
                          {linkedRab && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                              <Link2 className="w-2.5 h-2.5" />
                              <span>RAB: {linkedRab.budgetCode}</span>
                            </span>
                          )}
                        </div>
                      );
                    })}
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
                <span>Input QC dari Purchase Order</span>
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
            onPrint={triggerPrint}
            stickyFirstColumn
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
                        <span>Masuk Stok Gudang +{row.receivedQuantity} {row.unit}</span>
                      </div>
                    )}
                  </div>
                ),
              },
              {
                key: 'actions',
                header: 'Edit QC',
                align: 'right',
                render: row => (
                  <button
                    type="button"
                    onClick={() => handleOpenEditQCRecord(row)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 dark:bg-sky-950/60 dark:hover:bg-sky-900 text-blue-900 dark:text-sky-300 border border-blue-200 dark:border-sky-800 rounded-lg text-[10px] font-bold transition"
                    title="Edit kuantitas diterima / status QC (otomatis memperbarui PO & Stok Gudang)"
                  >
                    <FileEdit className="w-3 h-3" />
                    <span>Edit QC</span>
                  </button>
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

          <div className="bg-sky-50/80 dark:bg-sky-950/40 p-3 rounded-xl border border-sky-200 dark:border-sky-800 space-y-1.5">
            <label className="block text-[11px] font-bold text-blue-950 dark:text-sky-300">
              Ambil Otomatis dari Perencanaan Menu (PLOG) / Master Bahan
            </label>
            <select
              defaultValue=""
              onChange={e => {
                const val = e.target.value;
                if (!val) return;
                if (val.startsWith('menuagg:')) {
                  const need = menuPlannedNeeds.aggregated.find(a => a.key === val.slice(8));
                  if (need) {
                    setRabForm(prev => ({
                      ...prev,
                      category: 'RAB Bahan Pangan',
                      itemName: need.name,
                      unit: need.unit,
                      unitPrice: need.unitPrice,
                      volume: need.quantity,
                      planDate: need.planDate || prev.planDate,
                      sourceType: 'menu_planning',
                      sourceMenuId: need.sourceMenuIds[0],
                      sourceMenuCode: need.sourceMenuCodes.join(', '),
                      sourceMenuLabel: need.sourceMenuLabels.join(' | '),
                      notes: `Kebutuhan akumulasi Perencanaan Menu (${need.sourceMenuCodes.join(', ')})`,
                    }));
                  }
                } else if (val.startsWith('menuitem:')) {
                  const need = menuPlannedNeeds.perMenuItems.find(m => m.key === val.slice(9));
                  if (need) {
                    setRabForm(prev => ({
                      ...prev,
                      category: 'RAB Bahan Pangan',
                      itemName: need.name,
                      unit: need.unit,
                      unitPrice: need.unitPrice,
                      volume: need.quantity,
                      planDate: need.sourceMenuDate || prev.planDate,
                      sourceType: 'menu_planning',
                      sourceMenuId: need.sourceMenuId,
                      sourceMenuCode: need.sourceMenuCode,
                      sourceMenuLabel: need.sourceMenuLabel,
                      notes: `Kebutuhan Perencanaan Menu ${need.sourceMenuLabel}`,
                    }));
                  }
                } else if (val.startsWith('mb:')) {
                  const mb = masterBahan.find(m => m.id === val.slice(3));
                  if (mb) {
                    setRabForm(prev => ({
                      ...prev,
                      category: 'RAB Bahan Pangan',
                      itemName: mb.name,
                      unit: mb.unit,
                      unitPrice: mb.actualPrice,
                      volume: Math.max(mb.minimumStock, 50),
                      sourceType: 'manual',
                      sourceMenuId: undefined,
                      sourceMenuCode: undefined,
                      sourceMenuLabel: undefined,
                      notes: `Tersinkron dari Master Bahan (${mb.code})`,
                    }));
                  }
                }
              }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-sky-300 dark:border-sky-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold"
            >
              <option value="">-- Pilih kebutuhan bahan dari Perencanaan Menu (PLOG) --</option>
              <optgroup label="Akumulasi Kebutuhan Bahan Perencanaan Menu (PLOG)">
                {menuPlannedNeeds.aggregated.map(need => (
                  <option key={need.key} value={`menuagg:${need.key}`}>
                    [{need.sourceMenuCodes.join(', ')}] {need.name} — {formatNumber(need.quantity)} {need.unit} ({formatRupiah(need.unitPrice)}/{need.unit})
                  </option>
                ))}
              </optgroup>
              <optgroup label="Rincian Bahan Per Jadwal Menu (PLOG)">
                {menuPlannedNeeds.perMenuItems.map(need => (
                  <option key={need.key} value={`menuitem:${need.key}`}>
                    {need.sourceMenuCode} • {need.name} ({formatNumber(need.quantity)} {need.unit})
                  </option>
                ))}
              </optgroup>
              <optgroup label="Master Bahan Pangan (Referensi Cadangan)">
                {masterBahan.map(mb => (
                  <option key={mb.id} value={`mb:${mb.id}`}>
                    [{mb.code}] {mb.name} ({formatRupiah(mb.actualPrice)}/{mb.unit})
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <DynamicFormRenderer
            schema={dynamicFormSchemas.procurement_rab_form}
            values={{
              ...rabForm,
              ...(rabForm.customFields || {}),
            }}
            dynamicOptions={{
              unit: unitOptions,
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
      {/* MODAL: TERBITKAN PO (TERIKAT RAB DISETUJUI - MULTI ITEM) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isCreatePOOpen}
        onClose={() => setIsCreatePOOpen(false)}
        title="Terbitkan Purchase Order (PO Terikat RAB)"
        subtitle="Seluruh item PO wajib bersumber dari item RAB yang berstatus Disetujui."
        maxWidth="xl"
      >
        <form onSubmit={handleSavePO} className="space-y-4">
          {/* Daftar Item RAB yang Dipesan */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Daftar Item Pesanan dari RAB Disetujui ({poDraftLines.length} Item) *
              </label>
              <button
                type="button"
                onClick={handleAddPODraftLine}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-sky-950 dark:hover:bg-sky-900 text-blue-900 dark:text-sky-300 border border-blue-200 dark:border-sky-800 text-[11px] font-bold transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Item dari RAB</span>
              </button>
            </div>

            <div className="space-y-2.5 max-h-[38vh] overflow-y-auto pr-1">
              {poDraftLines.map((line, idx) => {
                const rab = rabList.find(r => r.id === line.rabId);
                const remQty = rab ? Math.max(0, rab.volume - (rab.poCreatedQuantity || 0)) : 0;
                const remAmt = rab ? Math.max(0, rab.totalBudget - (rab.poCreatedAmount || 0)) : 0;
                const lineExceeds = line.quantity > remQty || line.quantity <= 0;

                return (
                  <div
                    key={line.key}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-black text-blue-900 dark:text-sky-300">
                        Item PO #{idx + 1}
                      </span>
                      {poDraftLines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePODraftLine(line.key)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 dark:hover:bg-rose-950"
                          title="Hapus baris"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <select
                      value={line.rabId}
                      onChange={e => handleUpdatePODraftLine(line.key, { rabId: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                    >
                      {approvedRABItems.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.budgetCode} — {r.itemName} (Sisa Kuota: {formatNumber(Math.max(0, r.volume - (r.poCreatedQuantity || 0)))} {r.unit})
                        </option>
                      ))}
                    </select>

                    {rab && (
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-500">
                        <span>
                          Sisa Kuota RAB:{' '}
                          <strong className="text-emerald-700 dark:text-emerald-400">
                            {formatNumber(remQty)} {rab.unit}
                          </strong>
                        </span>
                        <span>
                          Sisa Pagu:{' '}
                          <strong className="text-blue-900 dark:text-sky-300">
                            {formatRupiah(remAmt)}
                          </strong>
                        </span>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                          Jumlah ({rab?.unit || 'unit'}) *
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="any"
                          required
                          value={line.quantity}
                          onChange={e =>
                            handleUpdatePODraftLine(line.key, { quantity: Number(e.target.value) })
                          }
                          className={`w-full px-2.5 py-1.5 text-xs rounded-lg border font-mono font-bold ${
                            lineExceeds
                              ? 'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950'
                              : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                          Harga Satuan (Rp) *
                        </label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={line.unitPrice}
                          onChange={e =>
                            handleUpdatePODraftLine(line.key, { unitPrice: Number(e.target.value) })
                          }
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                          Subtotal
                        </label>
                        <div className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-black text-slate-900 dark:text-white">
                          {formatRupiah((Number(line.quantity) || 0) * (Number(line.unitPrice) || 0))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

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

          {/* Validation Error Banner */}
          {poDraftValidation.isInvalid && poDraftValidation.errorMessage && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/60 rounded-xl border border-rose-200 dark:border-rose-800 flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300 font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{poDraftValidation.errorMessage}</span>
            </div>
          )}

          {/* Total Box */}
          <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-3 rounded-xl flex items-center justify-between text-xs">
            <div>
              <div className="text-[10px] text-sky-300 font-bold uppercase">Total Nilai Purchase Order:</div>
              <div className="text-sm font-semibold font-mono mt-0.5">
                {poDraftLines.length} Item Terikat RAB Disetujui
              </div>
            </div>
            <div className="text-xl font-black font-mono text-white">
              {formatRupiah(poDraftValidation.totalAmount)}
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
              disabled={poDraftValidation.isInvalid}
              className={`px-5 py-2 text-xs font-bold rounded-lg shadow-xs transition ${
                poDraftValidation.isInvalid
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
      {/* MODAL: QUALITY CONTROL (WAJIB TERIKAT PURCHASE ORDER) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isQCModalOpen}
        onClose={() => {
          setIsQCModalOpen(false);
          setEditingQCRecord(null);
        }}
        title={
          editingQCRecord
            ? `Edit Hasil Quality Control — ${editingQCRecord.itemName}`
            : 'Input Quality Control (QC) dari Purchase Order'
        }
        subtitle={
          editingQCRecord
            ? `Mengubah hasil QC otomatis memperbarui status PO (${editingQCRecord.poNumber}) dan saldo Stok Gudang`
            : selectedPOForQC
            ? `Verifikasi fisik penerimaan bahan bersumber dari PO: ${selectedPOForQC.poNumber} (Otomatis masuk Stok Gudang)`
            : 'Pilih Purchase Order (PO) untuk verifikasi barang masuk ke Stok Gudang'
        }
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveQCInspection} className="space-y-4">
          {/* Sumber Purchase Order (Terkunci ke PO) */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                Sumber Purchase Order (Wajib) *
              </label>
              {editingQCRecord ? (
                <div className="px-2.5 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono font-bold text-blue-900 dark:text-sky-300 truncate">
                  {editingQCRecord.poNumber}
                </div>
              ) : (
                <select
                  required
                  value={qcSelectedPOId}
                  onChange={e => handleSelectPOSourceInQCModal(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                >
                  {eligiblePOsForQC.map(po => (
                    <option key={po.id} value={po.id}>
                      {po.poNumber} — {po.supplierName} ({po.status})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <span className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                Supplier Rekanan (Dari PO)
              </span>
              <div className="px-2.5 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold text-slate-900 dark:text-white truncate">
                {editingQCRecord?.supplierName || selectedPOForQC?.supplierName || '-'}
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
          </div>

          {/* Daftar Bahan & Barang dari PO (Item & Qty Dipesan Terkunci dari PO) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                <PackageCheck className="w-4 h-4 text-emerald-600" />
                <span>Daftar Barang dari Purchase Order ({qcItemDrafts.length} Item)</span>
              </div>
              {!editingQCRecord && selectedPOForQC && (
                <button
                  type="button"
                  onClick={handleReloadPOItemsInQC}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-sky-950/60 dark:hover:bg-sky-900/70 text-blue-900 dark:text-sky-300 border border-blue-200 dark:border-sky-800 text-[11px] font-bold transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Muat Semua Item PO</span>
                </button>
              )}
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
                        Item #{idx + 1} — {draft.itemName}
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
                        {!editingQCRecord && qcItemDrafts.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveQCItemRow(draft.key)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            title="Lewati item yang belum tiba"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Row 1: Nama Bahan (PO), Satuan (PO), Jumlah Dipesan (PO), Jumlah Diterima (Input), Selisih */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                      <div className="sm:col-span-4">
                        <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                          Nama Bahan / Barang (Dari PO)
                        </label>
                        <input
                          type="text"
                          readOnly
                          value={draft.itemName}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-900 dark:text-white font-semibold cursor-not-allowed"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                          Satuan (Dari PO)
                        </label>
                        <input
                          type="text"
                          readOnly
                          value={draft.unit}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-900 dark:text-white font-semibold cursor-not-allowed"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                          Dipesan PO ({draft.unit})
                        </label>
                        <input
                          type="number"
                          readOnly
                          value={draft.orderedQuantity}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-900 dark:text-white font-mono font-bold cursor-not-allowed"
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
              onClick={() => {
                setIsQCModalOpen(false);
                setEditingQCRecord(null);
              }}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs"
            >
              {editingQCRecord ? 'Simpan Perubahan QC & Stok' : 'Simpan QC & Masukkan ke Stok Gudang'}
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
                {(() => {
                  const linkedRab = rabList.find(
                    r => r.id === (selectedPOForDetail.rabId || selectedPOForDetail.items[0]?.rabId)
                  );
                  return linkedRab ? (
                    <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-300 text-[10px] font-mono font-bold">
                      <Link2 className="w-3 h-3" />
                      <span>Sumber RAB: {linkedRab.budgetCode}</span>
                    </div>
                  ) : null;
                })()}
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
