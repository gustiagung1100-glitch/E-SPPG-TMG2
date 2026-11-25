import React, { useState, useMemo } from 'react';
import { useApp } from '../../lib/store';
import { DataTable, Column } from '../common/DataTable';
import { EmptyState } from '../common/EmptyState';
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
  RABRincianItem,
  RABCategory,
  RABApprovalStatus,
  PurchaseOrder,
  PurchaseOrderItem,
  POItemApprovalStatus,
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
import { defaultFoodCompositions } from '../../lib/plogData';
import {
  buildMasterUnitSelectOptions,
  MasterUnitSelectOption,
  resolveAutoUnitForItem,
} from '../../lib/unitResolver';
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
  Save,
  RotateCcw,
} from 'lucide-react';
import { processMultipleImageUploads } from '../common/FacilityTempUploadSection';
import {
  computeMenuAggregatedNeeds,
  resolveAutoRincianForRAB,
  getDishLabelFromMenu,
  formatIndonesianPeriodMonth,
  shiftIsoDate,
  resolveRABDistributionDate,
  resolvePODistributionDate,
  isOperasionalPOItem,
  sortPOItemsBahanThenOperasional,
  getPODisplayCategoryRank,
  resolvePOItemApprovalStatus,
  isMatchingMaterialNameShared,
  isQCAcceptedStatus,
} from '../../lib/supplyChainSync';

type SubModuleTab = 'rab' | 'purchase_order' | 'quality_control';

const getQCPhotos = (record: { photoUrl?: string; photoUrls?: string[] }): string[] => {
  if (record.photoUrls && record.photoUrls.length > 0) return record.photoUrls;
  if (record.photoUrl) return [record.photoUrl];
  return [];
};

interface QCModalItemDraft {
  key: string;
  poId: string;
  poNumber: string;
  supplierName: string;
  categoryLabel: 'Bahan Pangan' | 'Operasional Harian';
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
  existingQcId?: string;
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

const areRincianLinesEqual = (a: RABRincianItem[], b: RABRincianItem[]): boolean => {
  if (a.length !== b.length) return false;
  return a.every((item, idx) => {
    const other = b[idx];
    return (
      item.id === other.id &&
      item.menuName === other.menuName &&
      item.ingredientName === other.ingredientName &&
      Number(item.quantity) === Number(other.quantity) &&
      item.unit === other.unit
    );
  });
};

const UnitSelectControl: React.FC<{
  value: string;
  options: MasterUnitSelectOption[];
  disabled?: boolean;
  onChange: (val: string) => void;
  onKeyDown?: React.KeyboardEventHandler<HTMLSelectElement>;
  className?: string;
  ariaLabel?: string;
}> = ({ value, options, disabled, onChange, onKeyDown, className = '', ariaLabel }) => {
  const trimmedVal = (value || '').trim();
  const hasExact = options.some(o => o.value === trimmedVal);
  const grouped = useMemo(() => {
    const groups: Array<{
      name: MasterUnitSelectOption['group'];
      items: MasterUnitSelectOption[];
    }> = [
      { name: 'Master Satuan & Dimensi Bahan', items: [] },
      { name: 'Dimensi Bahan', items: [] },
      { name: 'Satuan Operasional / Kustom', items: [] },
    ];
    options.forEach(opt => {
      const target = groups.find(g => g.name === opt.group);
      if (target) target.items.push(opt);
    });
    return groups.filter(g => g.items.length > 0);
  }, [options]);

  return (
    <select
      value={trimmedVal}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={e => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      className={className}
    >
      {trimmedVal && !hasExact && (
        <option value={trimmedVal}>{trimmedVal} (Kustom)</option>
      )}
      {grouped.map(grp => (
        <optgroup key={grp.name} label={grp.name}>
          {grp.items.map(opt => (
            <option key={opt.value} value={opt.value} title={opt.label}>
              {opt.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
};

const RABRincianCell: React.FC<{
  rab: RABItem;
  autoRincian: RABRincianItem[];
  canEdit: boolean;
  unitOptions?: MasterUnitSelectOption[];
  onAutoResolveUnit?: (itemName: string) => string | null;
  onSaveRincian: (rab: RABItem, lines: RABRincianItem[], isManual: boolean) => Promise<void> | void;
  onDeleteRABRow: (rab: RABItem) => void;
  onSyncVolumeFromRincian: (rab: RABItem, totalQty: number, unit: string) => Promise<void> | void;
}> = ({
  rab,
  autoRincian,
  canEdit,
  unitOptions,
  onAutoResolveUnit,
  onSaveRincian,
  onDeleteRABRow,
  onSyncVolumeFromRincian,
}) => {
  const baselineLines = useMemo<RABRincianItem[]>(() => {
    if (Array.isArray(rab.rincianItems) && (rab.rincianItems.length > 0 || rab.isRincianManual)) {
      return rab.rincianItems;
    }
    return autoRincian;
  }, [rab.rincianItems, rab.isRincianManual, autoRincian]);

  const [draftLines, setDraftLines] = useState<RABRincianItem[]>(baselineLines);
  const [manualUnitIds, setManualUnitIds] = useState<Record<string, boolean>>({});
  const [savedFlash, setSavedFlash] = useState(false);

  React.useEffect(() => {
    setDraftLines(baselineLines);
    setManualUnitIds({});
  }, [baselineLines]);

  const isDirty = useMemo(
    () => !areRincianLinesEqual(draftLines, baselineLines),
    [draftLines, baselineLines]
  );

  const totalDraftQty = useMemo(
    () => draftLines.reduce((sum, l) => sum + (Number(l.quantity) || 0), 0),
    [draftLines]
  );

  const uniformUnit = useMemo(() => {
    if (draftLines.length === 0) return rab.unit;
    const first = (draftLines[0].unit || rab.unit || '').trim();
    const allSame = draftLines.every(l => (l.unit || '').trim().toLowerCase() === first.toLowerCase());
    return allSame ? first : null;
  }, [draftLines, rab.unit]);

  const handleFieldChange = (
    idx: number,
    field: 'menuName' | 'ingredientName' | 'quantity' | 'unit',
    value: string
  ) => {
    const lineKey = draftLines[idx]?.id || String(idx);
    if (field === 'unit') {
      setManualUnitIds(prev => ({ ...prev, [lineKey]: true }));
    } else if (field === 'ingredientName' && !value.trim()) {
      setManualUnitIds(prev => ({ ...prev, [lineKey]: false }));
    }

    setDraftLines(prev =>
      prev.map((line, i) => {
        if (i !== idx) return line;
        if (field === 'quantity') {
          const parsed = value === '' ? 0 : Math.max(0, Number(value));
          return { ...line, quantity: Number.isFinite(parsed) ? parsed : 0, isManual: true };
        }
        if (field === 'ingredientName') {
          const isManualUnit = Boolean(manualUnitIds[lineKey]);
          const resolvedUnit =
            !isManualUnit && onAutoResolveUnit && value.trim()
              ? onAutoResolveUnit(value)
              : null;
          return {
            ...line,
            ingredientName: value,
            ...(resolvedUnit ? { unit: resolvedUnit } : {}),
            isManual: true,
          };
        }
        return { ...line, [field]: value, isManual: true };
      })
    );
  };

  const handleAddLine = () => {
    setDraftLines(prev => [
      ...prev,
      {
        id: `rin-man-${rab.id}-${Date.now()}-${prev.length}`,
        menuName: rab.sourceMenuLabel || rab.sourceMenuCode || '',
        ingredientName: rab.itemName || '',
        quantity: prev.length === 0 ? Number(rab.volume) || 0 : 0,
        unit: rab.unit || 'kg',
        sourceMenuId: rab.sourceMenuId,
        sourceMenuCode: rab.sourceMenuCode,
        isManual: true,
      },
    ]);
  };

  const handleRemoveLine = (idx: number) => {
    setDraftLines(prev => prev.filter((_, i) => i !== idx));
  };

  const handleCommitSave = async () => {
    const cleaned = draftLines.map(l => ({
      ...l,
      menuName: l.menuName.trim() || '-',
      ingredientName: l.ingredientName.trim() || rab.itemName,
      quantity: Math.max(0, Number(l.quantity) || 0),
      unit: l.unit.trim() || rab.unit || 'kg',
      isManual: true,
    }));
    await onSaveRincian(rab, cleaned, true);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
  };

  const handleResetAuto = async () => {
    setDraftLines(autoRincian);
    await onSaveRincian(rab, autoRincian, false);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
  };

  const isAutoSynced = !rab.isRincianManual && autoRincian.length > 0;

  return (
    <div className="min-w-[320px] max-w-[430px] space-y-2 py-0.5">
      <div className="flex flex-wrap items-center justify-between gap-1">
        <div className="flex items-center gap-1.5">
          {rab.isRincianManual ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              Diedit Manual
            </span>
          ) : isAutoSynced ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-teal-100 text-[#0D9488] dark:bg-teal-950 dark:text-teal-300">
              <Link2 className="w-2.5 h-2.5" />
              Otomatis PLOG
            </span>
          ) : (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              Input Rincian
            </span>
          )}
          {savedFlash && !isDirty && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[#0D9488]">
              <CheckCircle2 className="w-3 h-3" /> Tersimpan
            </span>
          )}
        </div>

        {canEdit && rab.isRincianManual && autoRincian.length > 0 && (
          <button
            type="button"
            onClick={handleResetAuto}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold text-[#0D9488] hover:bg-teal-50 dark:hover:bg-teal-950/60 transition"
            title="Sinkronkan ulang rincian dari data Perencanaan Menu PLOG"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            <span>Ambil Ulang PLOG</span>
          </button>
        )}
      </div>

      {draftLines.length === 0 ? (
        <div className="text-[11px] text-slate-400 italic bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2">
          Belum ada rincian menu/bahan. Klik "+ Baris" untuk mengisi manual.
        </div>
      ) : (
        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
          {draftLines.map((line, idx) => (
            <div
              key={line.id || idx}
              className="p-2 rounded-lg border border-slate-200/90 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 space-y-1.5"
            >
              <div className="grid grid-cols-1 gap-1">
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-bold uppercase text-slate-400 w-11 shrink-0">
                    Menu
                  </span>
                  <input
                    type="text"
                    value={line.menuName}
                    disabled={!canEdit}
                    list="rab-rincian-menu-options"
                    onChange={e => handleFieldChange(idx, 'menuName', e.target.value)}
                    placeholder="Kode & nama menu PLOG..."
                    className="flex-1 min-w-0 px-2 py-1 text-[11px] font-semibold rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-bold uppercase text-slate-400 w-11 shrink-0">
                    Bahan
                  </span>
                  <input
                    type="text"
                    value={line.ingredientName}
                    disabled={!canEdit}
                    onChange={e => handleFieldChange(idx, 'ingredientName', e.target.value)}
                    placeholder="Nama bahan..."
                    className="flex-1 min-w-0 px-2 py-1 text-[11px] rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-bold uppercase text-slate-400 w-11 shrink-0">
                    Qty
                  </span>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={line.quantity}
                    disabled={!canEdit}
                    onChange={e => handleFieldChange(idx, 'quantity', e.target.value)}
                    className="w-20 px-2 py-1 text-[11px] font-mono font-bold rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
                  />
                  {unitOptions && unitOptions.length > 0 ? (
                    <UnitSelectControl
                      value={line.unit}
                      options={unitOptions}
                      disabled={!canEdit}
                      onChange={val => handleFieldChange(idx, 'unit', val)}
                      className="w-24 px-1.5 py-1 text-[11px] font-mono rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60 cursor-pointer"
                    />
                  ) : (
                    <input
                      type="text"
                      value={line.unit}
                      disabled={!canEdit}
                      list="rab-rincian-unit-options"
                      onChange={e => handleFieldChange(idx, 'unit', e.target.value)}
                      placeholder="Satuan"
                      className="w-16 px-2 py-1 text-[11px] font-mono rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
                    />
                  )}
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => handleRemoveLine(idx)}
                      className="ml-auto inline-flex items-center gap-0.5 px-1.5 py-1 rounded text-[10px] font-bold text-[#E11D48] hover:bg-rose-50 dark:hover:bg-rose-950/60 transition"
                      title="Hapus baris rincian ini"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Hapus</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {draftLines.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] text-slate-600 dark:text-slate-300 px-0.5">
          <span className="font-mono font-bold">
            Total Rincian: {formatNumber(totalDraftQty)} {uniformUnit || rab.unit}
          </span>
          {canEdit &&
            uniformUnit &&
            totalDraftQty > 0 &&
            Math.abs(totalDraftQty - rab.volume) > 0.001 &&
            totalDraftQty >= (rab.poCreatedQuantity || 0) && (
              <button
                type="button"
                onClick={() => onSyncVolumeFromRincian(rab, totalDraftQty, uniformUnit)}
                className="text-[10px] font-bold text-[#1E3A8A] dark:text-sky-300 hover:underline"
                title="Terapkan total kuantiti rincian ke Volume RAB"
              >
                Terapkan ke Volume RAB
              </button>
            )}
        </div>
      )}

      {canEdit && (
        <div className="flex flex-wrap items-center justify-between gap-1.5 pt-0.5">
          <button
            type="button"
            onClick={handleAddLine}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition active:scale-[0.98]"
          >
            <Plus className="w-3 h-3" />
            <span>Baris</span>
          </button>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleCommitSave}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold transition active:scale-[0.98] ${
                isDirty
                  ? 'bg-[#1E3A8A] hover:bg-blue-900 text-white shadow-xs'
                  : 'bg-blue-50 hover:bg-blue-100 text-[#1E3A8A] dark:bg-sky-950/60 dark:text-sky-300 border border-blue-200 dark:border-sky-800'
              }`}
              title="Simpan rincian RAB"
            >
              <Save className="w-3 h-3" />
              <span>Simpan</span>
            </button>
            <button
              type="button"
              onClick={() => onDeleteRABRow(rab)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-rose-50 hover:bg-rose-100 text-[#E11D48] dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 transition active:scale-[0.98]"
              title="Hapus item RAB beserta rinciannya"
            >
              <Trash2 className="w-3 h-3" />
              <span>Hapus</span>
            </button>
          </div>
        </div>
      )}
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
    materialConversions,
    currentUser,
    hasPermission,
    sppgConfig,
    addToast,
    rabItems,
    addRABItem,
    updateRABItem,
    deleteRABItem,
    approveRABItem,
    syncCriticalInventoryToRAB,
    qualityControlRecords,
    addQualityControlRecord,
    updateQualityControlRecord,
    syncAllMenuNeedsToRAB,
    syncDailyPOsFromRAB,
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

  // Dynamic Form Builder States (RAB)
  const [isEditingRabSchema, setIsEditingRabSchema] = useState(false);
  const [isModalRabSchemaEdit, setIsModalRabSchemaEdit] = useState(false);

  // Active Sub-Module Tab
  const [activeTab, setActiveTab] = useState<SubModuleTab>('rab');

  // --- STATE SUBMODUL A: RAB (Synced with Global Store) ---
  const rabList = rabItems;
  const [filterRABCategory, setFilterRABCategory] = useState<string>('ALL');
  const [filterRABPeriod, setFilterRABPeriod] = useState<string>('ALL');
  const [filterRABDate, setFilterRABDate] = useState<string>(() => {
    const sortedDates = [...menuItems]
      .map(m => m.date)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
    return sortedDates[0] || 'ALL';
  });
  const [rabSearchTerm, setRabSearchTerm] = useState<string>('');
  const [isRABModalOpen, setIsRABModalOpen] = useState(false);
  const [selectedRAB, setSelectedRAB] = useState<RABItem | null>(null);
  const [rabDeleteConfirm, setRabDeleteConfirm] = useState<RABItem | null>(null);
  const [paguHarianConfig, setPaguHarianConfig] = useState<{
    pangan?: number | null;
    operasional?: number | null;
  }>(() => {
    try {
      const saved = localStorage.getItem('esppg_rab_pagu_harian_v1');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {};
  });
  const [editingPaguTarget, setEditingPaguTarget] = useState<'pangan' | 'operasional' | null>(null);
  const [paguDraftInput, setPaguDraftInput] = useState<string>('');
  const [panganSasaranOverrides, setPanganSasaranOverrides] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('esppg_rab_pangan_sasaran_v1');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {};
  });
  const [panganRowDrafts, setPanganRowDrafts] = useState<
    Record<
      string,
      {
        itemName: string;
        sasaran: number;
        volume: number;
        unit: string;
        unitPrice: number;
        totalBudget: number;
        unitManuallyEdited?: boolean;
      }
    >
  >({});
  const [newPanganRows, setNewPanganRows] = useState<
    Array<{
      tempId: string;
      itemName: string;
      sasaran: number;
      volume: number;
      unit: string;
      unitPrice: number;
      totalBudget: number;
      unitManuallyEdited?: boolean;
    }>
  >([]);
  const [operasionalSasaranOverrides, setOperasionalSasaranOverrides] = useState<
    Record<string, number>
  >(() => {
    try {
      const saved = localStorage.getItem('esppg_rab_operasional_sasaran_v1');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {};
  });
  const [operasionalRowDrafts, setOperasionalRowDrafts] = useState<
    Record<
      string,
      {
        itemName: string;
        sasaran: number;
        volume: number;
        unit: string;
        unitPrice: number;
        totalBudget: number;
        unitManuallyEdited?: boolean;
      }
    >
  >({});
  const [newOperasionalRows, setNewOperasionalRows] = useState<
    Array<{
      tempId: string;
      itemName: string;
      sasaran: number;
      volume: number;
      unit: string;
      unitPrice: number;
      totalBudget: number;
      unitManuallyEdited?: boolean;
    }>
  >([]);

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
    rincianItems: [],
    isRincianManual: false,
    customFields: {},
  });
  const [rabModalUnitManual, setRabModalUnitManual] = useState(false);
  const [rincianManualUnits, setRincianManualUnits] = useState<Record<string, boolean>>({});

  const unitOptions = useMemo(
    () =>
      buildMasterUnitSelectOptions({
        masterUnits,
        materialConversions,
        extraUnits: [
          ...defaultRABItems.map(r => r.unit),
          ...rabList.map(r => r.unit),
          ...inventory.map(i => i.unit),
          ...Object.values(panganRowDrafts).map(d => d.unit),
          ...newPanganRows.map(d => d.unit),
          ...Object.values(operasionalRowDrafts).map(d => d.unit),
          ...newOperasionalRows.map(d => d.unit),
          rabForm.unit,
        ],
      }),
    [
      masterUnits,
      materialConversions,
      rabList,
      inventory,
      panganRowDrafts,
      newPanganRows,
      operasionalRowDrafts,
      newOperasionalRows,
      rabForm.unit,
    ]
  );

  const resolveAutoUnit = React.useCallback(
    (itemName: string, categoryHint: 'bahan' | 'operasional' | 'all') =>
      resolveAutoUnitForItem({
        itemName,
        categoryHint,
        masterUnits,
        materialConversions,
        masterBahan,
        inventory,
        foodCompositions: defaultFoodCompositions,
        existingRABItems: [...rabList, ...defaultRABItems],
      }),
    [masterUnits, materialConversions, masterBahan, inventory, rabList]
  );

  // --- STATE SUBMODUL B: PURCHASE ORDER (PO TERIKAT RAB) ---
  const [isCreatePOOpen, setIsCreatePOOpen] = useState(false);
  const [selectedPOForDetail, setSelectedPOForDetail] = useState<PurchaseOrder | null>(null);
  const [isPODetailOpen, setIsPODetailOpen] = useState(false);
  const [filterPOStatus, setFilterPOStatus] = useState<string>('ALL');
  const [filterPODate, setFilterPODate] = useState<string>(() => {
    const sortedDates = [...menuItems]
      .map(m => m.date)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
    return sortedDates[0] || 'ALL';
  });
  const [filterPODateField, setFilterPODateField] = useState<
    'distribution' | 'delivery' | 'issue' | 'any'
  >('distribution');
  const [isPODatePickerOpen, setIsPODatePickerOpen] = useState(false);
  const [poCalendarMonth, setPoCalendarMonth] = useState<string>(() => {
    const sortedDates = [...menuItems]
      .map(m => m.date)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
    return (sortedDates[0] || '2026-11-08').slice(0, 7);
  });
  const poDatePickerRef = React.useRef<HTMLDivElement | null>(null);
  const [poSearchTerm, setPoSearchTerm] = useState<string>('');

  React.useEffect(() => {
    if (filterPODate !== 'ALL' && /^\d{4}-\d{2}-\d{2}$/.test(filterPODate)) {
      setPoCalendarMonth(filterPODate.slice(0, 7));
    }
  }, [filterPODate]);

  React.useEffect(() => {
    if (!isPODatePickerOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (poDatePickerRef.current && !poDatePickerRef.current.contains(e.target as Node)) {
        setIsPODatePickerOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsPODatePickerOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPODatePickerOpen]);

  // Multi-item Form State for Creating PO strictly from Approved RAB
  interface PODraftLine {
    key: string;
    rabId: string;
    quantity: number;
    unitPrice: number;
  }
  const [poDraftLines, setPoDraftLines] = useState<PODraftLine[]>([]);
  const [poFormSupplierName, setPoFormSupplierName] = useState<string>('');
  const [poFormDistributionDate, setPoFormDistributionDate] = useState<string>(() => {
    const sortedDates = [...menuItems]
      .map(m => m.date)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
    return sortedDates[0] || '2026-11-08';
  });
  const [poFormDeliveryDate, setPoFormDeliveryDate] = useState<string>(() => {
    const sortedDates = [...menuItems]
      .map(m => m.date)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
    return shiftIsoDate(sortedDates[0] || '2026-11-08', -1);
  });
  const [poFormNotes, setPoFormNotes] = useState<string>('');

  // --- STATE SUBMODUL C: QUALITY CONTROL (QC) (Wajib Terikat Purchase Order) ---
  const qcList = qualityControlRecords;
  const [isQCModalOpen, setIsQCModalOpen] = useState(false);
  const [editingQCRecord, setEditingQCRecord] = useState<QualityControlRecord | null>(null);
  const [selectedPOForQC, setSelectedPOForQC] = useState<PurchaseOrder | null>(null);
  const [qcSelectedPOId, setQcSelectedPOId] = useState<string>('ALL_DAILY');
  const [qcModalDate, setQcModalDate] = useState<string>(() => {
    const sortedDates = [...menuItems]
      .map(m => m.date)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
    return sortedDates[0] || '2026-11-08';
  });
  const [qcModalCategoryFilter, setQcModalCategoryFilter] = useState<
    'ALL' | 'Bahan Pangan' | 'Operasional Harian'
  >('ALL');
  const [qcTabDateFilter, setQcTabDateFilter] = useState<string>('ALL');
  const [qcPendingSyncReload, setQcPendingSyncReload] = useState(false);
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
  const plogMenuDays = useMemo(() => {
    const byDate = new Map<
      string,
      {
        date: string;
        dayName: string;
        menuCodes: string[];
        menusSummary: string[];
        ingredientCount: number;
      }
    >();
    const sortedMenus = [...menuItems].sort((a, b) =>
      (a.date || '').localeCompare(b.date || '')
    );
    sortedMenus.forEach(m => {
      if (!m.date) return;
      const ings = menuIngredientsMap[m.id] || m.ingredients || [];
      const existing = byDate.get(m.date);
      const dishSummary = [m.stapleFood, m.animalProtein, m.plantProtein, m.vegetable, m.fruit]
        .filter(Boolean)
        .join(', ');
      if (existing) {
        if (m.menuCode && !existing.menuCodes.includes(m.menuCode)) {
          existing.menuCodes.push(m.menuCode);
        }
        if (dishSummary) existing.menusSummary.push(dishSummary);
        existing.ingredientCount += ings.length;
      } else {
        byDate.set(m.date, {
          date: m.date,
          dayName: m.dayName || '',
          menuCodes: m.menuCode ? [m.menuCode] : [],
          menusSummary: dishSummary ? [dishSummary] : [],
          ingredientCount: ings.length,
        });
      }
    });
    return Array.from(byDate.values());
  }, [menuItems, menuIngredientsMap]);

  const activePlogDayInfo = useMemo(
    () =>
      filterRABDate !== 'ALL'
        ? plogMenuDays.find(d => d.date === filterRABDate) || null
        : null,
    [plogMenuDays, filterRABDate]
  );

  const activePOPlogDayInfo = useMemo(
    () =>
      filterPODate !== 'ALL'
        ? plogMenuDays.find(d => d.date === filterPODate) || null
        : null,
    [plogMenuDays, filterPODate]
  );

  // Filtered RAB (base category + period)
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

  const rabTargetMetrics = useMemo(() => {
    const smallSasaran = institutions.reduce((sum, inst) => sum + (inst.smallPortions || 0), 0);
    const largeSasaran = institutions.reduce((sum, inst) => sum + (inst.largePortions || 0), 0);
    const totalSasaran = smallSasaran + largeSasaran || sppgConfig.dailyPortionTarget || 2850;
    const defaultPaguPangan =
      smallSasaran + largeSasaran > 0
        ? smallSasaran * (sppgConfig.smallPortionBudget || 8000) +
          largeSasaran * (sppgConfig.largePortionBudget || 10000)
        : totalSasaran * (sppgConfig.largePortionBudget || 10000);
    const defaultPaguOperasional = totalSasaran * 3000;
    const paguPangan =
      typeof paguHarianConfig.pangan === 'number' && Number.isFinite(paguHarianConfig.pangan)
        ? paguHarianConfig.pangan
        : defaultPaguPangan;
    const paguOperasional =
      typeof paguHarianConfig.operasional === 'number' &&
      Number.isFinite(paguHarianConfig.operasional)
        ? paguHarianConfig.operasional
        : defaultPaguOperasional;
    return {
      totalSasaran,
      defaultPaguPangan,
      defaultPaguOperasional,
      paguPangan,
      paguOperasional,
    };
  }, [institutions, sppgConfig, paguHarianConfig]);

  const searchedRAB = useMemo(() => {
    const term = rabSearchTerm.trim().toLowerCase();
    if (!term) return filteredRAB;
    return filteredRAB.filter(item => {
      const baseMatch = [
        item.budgetCode,
        item.itemName,
        item.category,
        item.notes,
        item.periodMonth,
        item.sourceMenuCode,
        item.sourceMenuLabel,
      ].some(v => v && String(v).toLowerCase().includes(term));
      if (baseMatch) return true;
      return (item.rincianItems || []).some(
        r =>
          (r.menuName && r.menuName.toLowerCase().includes(term)) ||
          (r.ingredientName && r.ingredientName.toLowerCase().includes(term))
      );
    });
  }, [filteredRAB, rabSearchTerm]);

  // RAB Bahan Pangan strictly follows daily filter (filterRABDate) when a date is chosen
  const rabPanganRows = useMemo(() => {
    const allPangan = searchedRAB.filter(r => r.category === 'RAB Bahan Pangan');
    if (filterRABDate === 'ALL') return allPangan;
    return allPangan.filter(r => r.planDate === filterRABDate);
  }, [searchedRAB, filterRABDate]);

  // RAB Operasional filters by date when exact-date entries exist; otherwise keeps active operational items visible
  const rabOperasionalResult = useMemo(() => {
    const allOps = searchedRAB.filter(r => r.category === 'RAB Operasional');
    if (filterRABDate === 'ALL') {
      return { rows: allOps, isFallbackAllDates: false };
    }
    const exactDateOps = allOps.filter(r => r.planDate === filterRABDate);
    if (exactDateOps.length > 0) {
      return { rows: exactDateOps, isFallbackAllDates: false };
    }
    return { rows: allOps, isFallbackAllDates: allOps.length > 0 };
  }, [searchedRAB, filterRABDate]);
  const rabOperasionalRows = rabOperasionalResult.rows;

  const dynamicRabColumns = useMemo(
    () =>
      buildDynamicTableColumns<RABItem>(dynamicFormSchemas.procurement_rab_form, (url, label) =>
        setViewGallery({ urls: [url], index: 0, title: label })
      ),
    [dynamicFormSchemas.procurement_rab_form]
  );

  const savePaguHarian = (target: 'pangan' | 'operasional', value: number | null) => {
    const next = { ...paguHarianConfig, [target]: value };
    setPaguHarianConfig(next);
    try {
      localStorage.setItem('esppg_rab_pagu_harian_v1', JSON.stringify(next));
    } catch {
      // ignore storage failure
    }
    setEditingPaguTarget(null);
    addToast(
      'success',
      'Pagu Harian Diperbarui',
      value === null
        ? 'Pagu harga belanja harian dikembalikan ke perhitungan standar BGN.'
        : `Pagu harga belanja harian diperbarui menjadi ${formatRupiah(value)}.`
    );
  };

  const panganIngredientOptions = useMemo(() => {
    const names = new Set<string>();
    masterBahan.forEach(b => {
      if (b.name && b.name.trim()) names.add(b.name.trim());
    });
    materialConversions.forEach(c => {
      if (c.materialName && c.materialName.trim()) names.add(c.materialName.trim());
    });
    inventory.forEach(inv => {
      if (inv.name && inv.name.trim()) names.add(inv.name.trim());
    });
    defaultFoodCompositions.forEach(fc => {
      if (fc.name && fc.name.trim()) names.add(fc.name.trim());
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'id'));
  }, [masterBahan, materialConversions, inventory]);

  const getPanganEffectiveRowValues = (row: RABItem) => {
    const draft = panganRowDrafts[row.id];
    const savedSasaran =
      typeof panganSasaranOverrides[row.id] === 'number' &&
      Number.isFinite(panganSasaranOverrides[row.id])
        ? panganSasaranOverrides[row.id]
        : typeof panganSasaranOverrides[row.budgetCode] === 'number' &&
          Number.isFinite(panganSasaranOverrides[row.budgetCode])
        ? panganSasaranOverrides[row.budgetCode]
        : rabTargetMetrics.totalSasaran;
    if (draft) return draft;
    return {
      itemName: row.itemName,
      sasaran: savedSasaran,
      volume: Number(row.volume) || 0,
      unit: row.unit,
      unitPrice: Number(row.unitPrice) || 0,
      totalBudget: Number(row.totalBudget) || 0,
    };
  };

  const updatePanganCellDraft = (
    row: RABItem,
    field: 'itemName' | 'sasaran' | 'volume' | 'unit' | 'unitPrice' | 'totalBudget',
    rawValue: string
  ) => {
    setPanganRowDrafts(prev => {
      const currentSavedSasaran =
        typeof panganSasaranOverrides[row.id] === 'number' &&
        Number.isFinite(panganSasaranOverrides[row.id])
          ? panganSasaranOverrides[row.id]
          : typeof panganSasaranOverrides[row.budgetCode] === 'number' &&
            Number.isFinite(panganSasaranOverrides[row.budgetCode])
          ? panganSasaranOverrides[row.budgetCode]
          : rabTargetMetrics.totalSasaran;
      const base = prev[row.id] || {
        itemName: row.itemName,
        sasaran: currentSavedSasaran,
        volume: Number(row.volume) || 0,
        unit: row.unit,
        unitPrice: Number(row.unitPrice) || 0,
        totalBudget: Number(row.totalBudget) || 0,
      };

      const next = { ...base };
      if (field === 'itemName') {
        next.itemName = rawValue;
        if (!rawValue.trim()) {
          next.unitManuallyEdited = false;
        } else if (!next.unitManuallyEdited) {
          const auto = resolveAutoUnit(rawValue, 'bahan');
          if (auto) {
            next.unit = auto.unit;
          }
        }
      } else if (field === 'unit') {
        next.unit = rawValue;
        next.unitManuallyEdited = true;
      } else if (field === 'sasaran') {
        const parsed = rawValue === '' ? 0 : Math.max(0, Number(rawValue));
        next.sasaran = Number.isFinite(parsed) ? parsed : 0;
      } else if (field === 'volume') {
        const parsed = rawValue === '' ? 0 : Math.max(0, Number(rawValue));
        const safeVol = Number.isFinite(parsed) ? parsed : 0;
        next.volume = safeVol;
        next.totalBudget = safeVol * next.unitPrice;
      } else if (field === 'unitPrice') {
        const parsed = rawValue === '' ? 0 : Math.max(0, Number(rawValue));
        const safePrice = Number.isFinite(parsed) ? parsed : 0;
        next.unitPrice = safePrice;
        next.totalBudget = next.volume * safePrice;
      } else if (field === 'totalBudget') {
        const parsed = rawValue === '' ? 0 : Math.max(0, Number(rawValue));
        const safeTotal = Number.isFinite(parsed) ? parsed : 0;
        next.totalBudget = safeTotal;
        if (next.volume > 0) {
          next.unitPrice = Math.round(safeTotal / next.volume);
        }
      }

      return { ...prev, [row.id]: next };
    });
  };

  const handleSavePanganRowDraft = async (row: RABItem) => {
    const draft = panganRowDrafts[row.id];
    if (!draft) return;

    const cleanVolume = Math.max(0, Number(draft.volume) || 0);
    const cleanPrice = Math.max(0, Number(draft.unitPrice) || 0);
    const cleanTotal = Math.max(0, Number(draft.totalBudget) || 0);
    const syncedUnitPrice =
      cleanVolume > 0 && Math.abs(cleanVolume * cleanPrice - cleanTotal) > 0.5
        ? cleanTotal / cleanVolume
        : cleanPrice;

    const nextSasaranOverrides = {
      ...panganSasaranOverrides,
      [row.id]: Math.max(0, Number(draft.sasaran) || 0),
    };
    setPanganSasaranOverrides(nextSasaranOverrides);
    try {
      localStorage.setItem('esppg_rab_pangan_sasaran_v1', JSON.stringify(nextSasaranOverrides));
    } catch {
      // ignore storage error
    }

    await updateRABItem(row.id, {
      itemName: draft.itemName.trim() || row.itemName,
      volume: cleanVolume,
      unit: draft.unit.trim() || row.unit || 'kg',
      unitPrice: syncedUnitPrice,
      totalBudget: cleanTotal,
    });

    setPanganRowDrafts(prev => {
      const next = { ...prev };
      delete next[row.id];
      return next;
    });
  };

  const handleDiscardPanganRowDraft = (rowId: string) => {
    setPanganRowDrafts(prev => {
      const next = { ...prev };
      delete next[rowId];
      return next;
    });
  };

  const handleAddNewPanganRow = () => {
    setNewPanganRows(prev => [
      ...prev,
      {
        tempId: `new-pangan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        itemName: '',
        sasaran: rabTargetMetrics.totalSasaran,
        volume: 0,
        unit: 'kg',
        unitPrice: 0,
        totalBudget: 0,
      },
    ]);
  };

  const updateNewPanganRowField = (
    tempId: string,
    field: 'itemName' | 'sasaran' | 'volume' | 'unit' | 'unitPrice' | 'totalBudget',
    rawValue: string
  ) => {
    setNewPanganRows(prev =>
      prev.map(row => {
        if (row.tempId !== tempId) return row;
        const next = { ...row };
        if (field === 'itemName') {
          next.itemName = rawValue;
          if (!rawValue.trim()) {
            next.unitManuallyEdited = false;
          } else {
            const auto = resolveAutoUnit(rawValue, 'bahan');
            if (auto) {
              if (!next.unitManuallyEdited) {
                next.unit = auto.unit;
              }
              if (next.unitPrice === 0 && auto.unitPrice && auto.unitPrice > 0) {
                next.unitPrice = auto.unitPrice;
                next.totalBudget = next.volume * auto.unitPrice;
              }
            }
          }
        } else if (field === 'unit') {
          next.unit = rawValue;
          next.unitManuallyEdited = true;
        } else if (field === 'sasaran') {
          const parsed = rawValue === '' ? 0 : Math.max(0, Number(rawValue));
          next.sasaran = Number.isFinite(parsed) ? parsed : 0;
        } else if (field === 'volume') {
          const parsed = rawValue === '' ? 0 : Math.max(0, Number(rawValue));
          const safeVol = Number.isFinite(parsed) ? parsed : 0;
          next.volume = safeVol;
          next.totalBudget = safeVol * next.unitPrice;
        } else if (field === 'unitPrice') {
          const parsed = rawValue === '' ? 0 : Math.max(0, Number(rawValue));
          const safePrice = Number.isFinite(parsed) ? parsed : 0;
          next.unitPrice = safePrice;
          next.totalBudget = next.volume * safePrice;
        } else if (field === 'totalBudget') {
          const parsed = rawValue === '' ? 0 : Math.max(0, Number(rawValue));
          const safeTotal = Number.isFinite(parsed) ? parsed : 0;
          next.totalBudget = safeTotal;
          if (next.volume > 0) {
            next.unitPrice = Math.round(safeTotal / next.volume);
          }
        }
        return next;
      })
    );
  };

  const handleSaveNewPanganRow = async (tempId: string, seqOffset = 0): Promise<boolean> => {
    const draft = newPanganRows.find(r => r.tempId === tempId);
    if (!draft) return false;

    const cleanName = draft.itemName.trim();
    if (!cleanName) {
      addToast(
        'warning',
        'Nama Bahan Wajib Diisi',
        'Isi nama bahan pangan pada kolom BAHAN PANGAN sebelum menyimpan baris.'
      );
      return false;
    }

    const targetPlanDate =
      filterRABDate !== 'ALL'
        ? filterRABDate
        : plogMenuDays[0]?.date || new Date().toISOString().slice(0, 10);
    const compactDate = targetPlanDate.replace(/-/g, '').slice(2);
    const usedCodes = new Set(rabList.map(r => r.budgetCode));
    let seqIdx = rabList.length + 1 + seqOffset;
    let budgetCode = `RAB-BP-${compactDate}-${String(seqIdx).padStart(3, '0')}`;
    while (usedCodes.has(budgetCode)) {
      seqIdx += 1;
      budgetCode = `RAB-BP-${compactDate}-${String(seqIdx).padStart(3, '0')}`;
    }

    const cleanVolume = Math.max(0, Number(draft.volume) || 0);
    const cleanPrice = Math.max(0, Number(draft.unitPrice) || 0);
    const cleanTotal = Math.max(0, Number(draft.totalBudget) || 0);
    const syncedUnitPrice =
      cleanVolume > 0 && Math.abs(cleanVolume * cleanPrice - cleanTotal) > 0.5
        ? cleanTotal / cleanVolume
        : cleanPrice;
    const cleanSasaran = Math.max(0, Number(draft.sasaran) || 0);

    if (cleanSasaran !== rabTargetMetrics.totalSasaran) {
      const nextSasaranOverrides = {
        ...panganSasaranOverrides,
        [budgetCode]: cleanSasaran,
      };
      setPanganSasaranOverrides(nextSasaranOverrides);
      try {
        localStorage.setItem('esppg_rab_pangan_sasaran_v1', JSON.stringify(nextSasaranOverrides));
      } catch {
        // ignore storage error
      }
    }

    await addRABItem({
      category: 'RAB Bahan Pangan',
      budgetCode,
      planDate: targetPlanDate,
      periodMonth: formatIndonesianPeriodMonth(targetPlanDate),
      itemName: cleanName,
      volume: cleanVolume,
      unit: draft.unit.trim() || 'kg',
      unitPrice: syncedUnitPrice,
      notes: 'Ditambahkan langsung pada Rincian Daftar Belanja (RAB) Bahan Pangan',
      status: 'Menunggu Persetujuan',
      poCreatedQuantity: 0,
      poCreatedAmount: 0,
      sourceType: 'manual',
      rincianItems: [],
      isRincianManual: false,
      isManualOverride: true,
      customFields: getInitialCustomFieldValues(dynamicFormSchemas.procurement_rab_form),
    });

    setNewPanganRows(prev => prev.filter(r => r.tempId !== tempId));
    return true;
  };

  const handleRemoveNewPanganRow = (tempId: string) => {
    setNewPanganRows(prev => prev.filter(r => r.tempId !== tempId));
  };

  const handleSaveAllPanganDrafts = async () => {
    const draftIds = Object.keys(panganRowDrafts);
    for (const id of draftIds) {
      const row = rabPanganRows.find(r => r.id === id) || rabList.find(r => r.id === id);
      if (row) {
        await handleSavePanganRowDraft(row);
      }
    }
    const pendingNewRows = [...newPanganRows];
    for (let i = 0; i < pendingNewRows.length; i++) {
      await handleSaveNewPanganRow(pendingNewRows[i].tempId, i);
    }
  };

  const operasionalItemOptions = useMemo(() => {
    const names = new Set<string>();
    defaultRABItems
      .filter(r => r.category === 'RAB Operasional')
      .forEach(r => {
        if (r.itemName && r.itemName.trim()) names.add(r.itemName.trim());
      });
    rabList
      .filter(r => r.category === 'RAB Operasional')
      .forEach(r => {
        if (r.itemName && r.itemName.trim()) names.add(r.itemName.trim());
      });
    inventory
      .filter(inv => inv.category === 'Kemasan & Higiene' || inv.category === 'Pelengkap')
      .forEach(inv => {
        if (inv.name && inv.name.trim()) names.add(inv.name.trim());
      });
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'id'));
  }, [rabList, inventory]);

  const getOperasionalEffectiveRowValues = (row: RABItem) => {
    const draft = operasionalRowDrafts[row.id];
    const savedSasaran =
      typeof operasionalSasaranOverrides[row.id] === 'number' &&
      Number.isFinite(operasionalSasaranOverrides[row.id])
        ? operasionalSasaranOverrides[row.id]
        : typeof operasionalSasaranOverrides[row.budgetCode] === 'number' &&
          Number.isFinite(operasionalSasaranOverrides[row.budgetCode])
        ? operasionalSasaranOverrides[row.budgetCode]
        : rabTargetMetrics.totalSasaran;
    if (draft) return draft;
    return {
      itemName: row.itemName,
      sasaran: savedSasaran,
      volume: Number(row.volume) || 0,
      unit: row.unit,
      unitPrice: Number(row.unitPrice) || 0,
      totalBudget: Number(row.totalBudget) || 0,
    };
  };

  const updateOperasionalCellDraft = (
    row: RABItem,
    field: 'itemName' | 'sasaran' | 'volume' | 'unit' | 'unitPrice' | 'totalBudget',
    rawValue: string
  ) => {
    setOperasionalRowDrafts(prev => {
      const currentSavedSasaran =
        typeof operasionalSasaranOverrides[row.id] === 'number' &&
        Number.isFinite(operasionalSasaranOverrides[row.id])
          ? operasionalSasaranOverrides[row.id]
          : typeof operasionalSasaranOverrides[row.budgetCode] === 'number' &&
            Number.isFinite(operasionalSasaranOverrides[row.budgetCode])
          ? operasionalSasaranOverrides[row.budgetCode]
          : rabTargetMetrics.totalSasaran;
      const base = prev[row.id] || {
        itemName: row.itemName,
        sasaran: currentSavedSasaran,
        volume: Number(row.volume) || 0,
        unit: row.unit,
        unitPrice: Number(row.unitPrice) || 0,
        totalBudget: Number(row.totalBudget) || 0,
      };

      const next = { ...base };
      if (field === 'itemName') {
        next.itemName = rawValue;
        if (!rawValue.trim()) {
          next.unitManuallyEdited = false;
        } else if (!next.unitManuallyEdited) {
          const auto = resolveAutoUnit(rawValue, 'operasional');
          if (auto) {
            next.unit = auto.unit;
          }
        }
      } else if (field === 'unit') {
        next.unit = rawValue;
        next.unitManuallyEdited = true;
      } else if (field === 'sasaran') {
        const parsed = rawValue === '' ? 0 : Math.max(0, Number(rawValue));
        next.sasaran = Number.isFinite(parsed) ? parsed : 0;
      } else if (field === 'volume') {
        const parsed = rawValue === '' ? 0 : Math.max(0, Number(rawValue));
        const safeVol = Number.isFinite(parsed) ? parsed : 0;
        next.volume = safeVol;
        next.totalBudget = safeVol * next.unitPrice;
      } else if (field === 'unitPrice') {
        const parsed = rawValue === '' ? 0 : Math.max(0, Number(rawValue));
        const safePrice = Number.isFinite(parsed) ? parsed : 0;
        next.unitPrice = safePrice;
        next.totalBudget = next.volume * safePrice;
      } else if (field === 'totalBudget') {
        const parsed = rawValue === '' ? 0 : Math.max(0, Number(rawValue));
        const safeTotal = Number.isFinite(parsed) ? parsed : 0;
        next.totalBudget = safeTotal;
        if (next.volume > 0) {
          next.unitPrice = Math.round(safeTotal / next.volume);
        }
      }

      return { ...prev, [row.id]: next };
    });
  };

  const handleSaveOperasionalRowDraft = async (row: RABItem) => {
    const draft = operasionalRowDrafts[row.id];
    if (!draft) return;

    const cleanVolume = Math.max(0, Number(draft.volume) || 0);
    const cleanPrice = Math.max(0, Number(draft.unitPrice) || 0);
    const cleanTotal = Math.max(0, Number(draft.totalBudget) || 0);
    const syncedUnitPrice =
      cleanVolume > 0 && Math.abs(cleanVolume * cleanPrice - cleanTotal) > 0.5
        ? cleanTotal / cleanVolume
        : cleanPrice;

    const nextSasaranOverrides = {
      ...operasionalSasaranOverrides,
      [row.id]: Math.max(0, Number(draft.sasaran) || 0),
    };
    setOperasionalSasaranOverrides(nextSasaranOverrides);
    try {
      localStorage.setItem(
        'esppg_rab_operasional_sasaran_v1',
        JSON.stringify(nextSasaranOverrides)
      );
    } catch {
      // ignore storage error
    }

    await updateRABItem(row.id, {
      itemName: draft.itemName.trim() || row.itemName,
      volume: cleanVolume,
      unit: draft.unit.trim() || row.unit || 'paket',
      unitPrice: syncedUnitPrice,
      totalBudget: cleanTotal,
    });

    setOperasionalRowDrafts(prev => {
      const next = { ...prev };
      delete next[row.id];
      return next;
    });
  };

  const handleDiscardOperasionalRowDraft = (rowId: string) => {
    setOperasionalRowDrafts(prev => {
      const next = { ...prev };
      delete next[rowId];
      return next;
    });
  };

  const handleAddNewOperasionalRow = () => {
    setNewOperasionalRows(prev => [
      ...prev,
      {
        tempId: `new-ops-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        itemName: '',
        sasaran: rabTargetMetrics.totalSasaran,
        volume: 0,
        unit: 'paket',
        unitPrice: 0,
        totalBudget: 0,
      },
    ]);
  };

  const updateNewOperasionalRowField = (
    tempId: string,
    field: 'itemName' | 'sasaran' | 'volume' | 'unit' | 'unitPrice' | 'totalBudget',
    rawValue: string
  ) => {
    setNewOperasionalRows(prev =>
      prev.map(row => {
        if (row.tempId !== tempId) return row;
        const next = { ...row };
        if (field === 'itemName') {
          next.itemName = rawValue;
          if (!rawValue.trim()) {
            next.unitManuallyEdited = false;
          } else {
            const auto = resolveAutoUnit(rawValue, 'operasional');
            if (auto) {
              if (!next.unitManuallyEdited) {
                next.unit = auto.unit;
              }
              if (next.unitPrice === 0 && auto.unitPrice && auto.unitPrice > 0) {
                next.unitPrice = auto.unitPrice;
                next.totalBudget = next.volume * auto.unitPrice;
              }
            }
          }
        } else if (field === 'unit') {
          next.unit = rawValue;
          next.unitManuallyEdited = true;
        } else if (field === 'sasaran') {
          const parsed = rawValue === '' ? 0 : Math.max(0, Number(rawValue));
          next.sasaran = Number.isFinite(parsed) ? parsed : 0;
        } else if (field === 'volume') {
          const parsed = rawValue === '' ? 0 : Math.max(0, Number(rawValue));
          const safeVol = Number.isFinite(parsed) ? parsed : 0;
          next.volume = safeVol;
          next.totalBudget = safeVol * next.unitPrice;
        } else if (field === 'unitPrice') {
          const parsed = rawValue === '' ? 0 : Math.max(0, Number(rawValue));
          const safePrice = Number.isFinite(parsed) ? parsed : 0;
          next.unitPrice = safePrice;
          next.totalBudget = next.volume * safePrice;
        } else if (field === 'totalBudget') {
          const parsed = rawValue === '' ? 0 : Math.max(0, Number(rawValue));
          const safeTotal = Number.isFinite(parsed) ? parsed : 0;
          next.totalBudget = safeTotal;
          if (next.volume > 0) {
            next.unitPrice = Math.round(safeTotal / next.volume);
          }
        }
        return next;
      })
    );
  };

  const handleSaveNewOperasionalRow = async (tempId: string, seqOffset = 0): Promise<boolean> => {
    const draft = newOperasionalRows.find(r => r.tempId === tempId);
    if (!draft) return false;

    const cleanName = draft.itemName.trim();
    if (!cleanName) {
      addToast(
        'warning',
        'Uraian Operasional Wajib Diisi',
        'Isi uraian biaya operasional pada kolom URAIAN sebelum menyimpan baris.'
      );
      return false;
    }

    const targetPlanDate =
      filterRABDate !== 'ALL'
        ? filterRABDate
        : plogMenuDays[0]?.date || new Date().toISOString().slice(0, 10);
    const compactDate = targetPlanDate.replace(/-/g, '').slice(2);
    const usedCodes = new Set(rabList.map(r => r.budgetCode));
    let seqIdx = rabList.length + 1 + seqOffset;
    let budgetCode = `RAB-OP-${compactDate}-${String(seqIdx).padStart(3, '0')}`;
    while (usedCodes.has(budgetCode)) {
      seqIdx += 1;
      budgetCode = `RAB-OP-${compactDate}-${String(seqIdx).padStart(3, '0')}`;
    }

    const cleanVolume = Math.max(0, Number(draft.volume) || 0);
    const cleanPrice = Math.max(0, Number(draft.unitPrice) || 0);
    const cleanTotal = Math.max(0, Number(draft.totalBudget) || 0);
    const syncedUnitPrice =
      cleanVolume > 0 && Math.abs(cleanVolume * cleanPrice - cleanTotal) > 0.5
        ? cleanTotal / cleanVolume
        : cleanPrice;
    const cleanSasaran = Math.max(0, Number(draft.sasaran) || 0);

    if (cleanSasaran !== rabTargetMetrics.totalSasaran) {
      const nextSasaranOverrides = {
        ...operasionalSasaranOverrides,
        [budgetCode]: cleanSasaran,
      };
      setOperasionalSasaranOverrides(nextSasaranOverrides);
      try {
        localStorage.setItem(
          'esppg_rab_operasional_sasaran_v1',
          JSON.stringify(nextSasaranOverrides)
        );
      } catch {
        // ignore storage error
      }
    }

    await addRABItem({
      category: 'RAB Operasional',
      budgetCode,
      planDate: targetPlanDate,
      periodMonth: formatIndonesianPeriodMonth(targetPlanDate),
      itemName: cleanName,
      volume: cleanVolume,
      unit: draft.unit.trim() || 'paket',
      unitPrice: syncedUnitPrice,
      notes: 'Ditambahkan langsung pada Rincian Daftar Belanja (RAB) Operasional',
      status: 'Menunggu Persetujuan',
      poCreatedQuantity: 0,
      poCreatedAmount: 0,
      sourceType: 'manual',
      rincianItems: [],
      isRincianManual: false,
      isManualOverride: true,
      customFields: getInitialCustomFieldValues(dynamicFormSchemas.procurement_rab_form),
    });

    setNewOperasionalRows(prev => prev.filter(r => r.tempId !== tempId));
    return true;
  };

  const handleRemoveNewOperasionalRow = (tempId: string) => {
    setNewOperasionalRows(prev => prev.filter(r => r.tempId !== tempId));
  };

  const handleSaveAllOperasionalDrafts = async () => {
    const draftIds = Object.keys(operasionalRowDrafts);
    for (const id of draftIds) {
      const row = rabOperasionalRows.find(r => r.id === id) || rabList.find(r => r.id === id);
      if (row) {
        await handleSaveOperasionalRowDraft(row);
      }
    }
    const pendingNewRows = [...newOperasionalRows];
    for (let i = 0; i < pendingNewRows.length; i++) {
      await handleSaveNewOperasionalRow(pendingNewRows[i].tempId, i);
    }
  };

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

  const qcAvailableDates = useMemo(() => {
    const dateSet = new Set<string>();
    plogMenuDays.forEach(d => {
      if (d.date) dateSet.add(d.date);
    });
    eligiblePOsForQC.forEach(po => {
      const dist = resolvePODistributionDate(po, rabList, menuItems);
      const effectiveDate = dist || po.deliveryDate || po.date;
      if (effectiveDate) dateSet.add(effectiveDate);
    });
    return Array.from(dateSet).sort((a, b) => a.localeCompare(b));
  }, [plogMenuDays, eligiblePOsForQC, rabList, menuItems]);

  const getPOsForDailyQCDate = React.useCallback(
    (targetDate: string): PurchaseOrder[] => {
      if (!targetDate || targetDate === 'ALL') return eligiblePOsForQC;
      const matched = eligiblePOsForQC.filter(po => {
        const distDate = resolvePODistributionDate(po, rabList, menuItems);
        if (distDate) return distDate === targetDate;
        return po.deliveryDate === targetDate || po.date === targetDate;
      });
      return [...matched].sort((a, b) => {
        const rankA = getPODisplayCategoryRank(a, rabList);
        const rankB = getPODisplayCategoryRank(b, rabList);
        if (rankA !== rankB) return rankA - rankB;
        return (a.poNumber || '').localeCompare(b.poNumber || '');
      });
    },
    [eligiblePOsForQC, rabList, menuItems]
  );

  const qcDailyPOs = useMemo(
    () => getPOsForDailyQCDate(qcModalDate),
    [getPOsForDailyQCDate, qcModalDate]
  );

  const filteredQCLogList = useMemo(() => {
    if (qcTabDateFilter === 'ALL') return qcList;
    const poIdsForDate = new Set(
      purchaseOrders
        .filter(po => {
          const dist = resolvePODistributionDate(po, rabList, menuItems);
          return dist
            ? dist === qcTabDateFilter
            : po.deliveryDate === qcTabDateFilter || po.date === qcTabDateFilter;
        })
        .map(po => po.id)
    );
    return qcList.filter(
      q => poIdsForDate.has(q.poId) || (q.inspectedAt || '').startsWith(qcTabDateFilter)
    );
  }, [qcList, qcTabDateFilter, purchaseOrders, rabList, menuItems]);

  // Filtered POs (berdasarkan status, tanggal spesifik & basis tanggal PO)
  const matchesPODateByField = React.useCallback(
    (
      po: PurchaseOrder,
      targetDate: string,
      field: 'distribution' | 'delivery' | 'issue' | 'any'
    ): boolean => {
      const distDate = resolvePODistributionDate(po, rabList, menuItems);
      if (field === 'distribution') return distDate === targetDate;
      if (field === 'delivery') return po.deliveryDate === targetDate;
      if (field === 'issue') return po.date === targetDate;
      return (
        distDate === targetDate ||
        po.deliveryDate === targetDate ||
        po.date === targetDate
      );
    },
    [rabList, menuItems]
  );

  const poDateCountsMap = useMemo(() => {
    const map = new Map<string, number>();
    const statusMatched =
      filterPOStatus === 'ALL'
        ? purchaseOrders
        : purchaseOrders.filter(p => p.status === filterPOStatus);
    for (const po of statusMatched) {
      const dates = new Set<string>();
      const distDate = resolvePODistributionDate(po, rabList, menuItems);
      if (filterPODateField === 'distribution' && distDate) dates.add(distDate);
      else if (filterPODateField === 'delivery' && po.deliveryDate) dates.add(po.deliveryDate);
      else if (filterPODateField === 'issue' && po.date) dates.add(po.date);
      else if (filterPODateField === 'any') {
        if (distDate) dates.add(distDate);
        if (po.deliveryDate) dates.add(po.deliveryDate);
        if (po.date) dates.add(po.date);
      }
      dates.forEach(d => map.set(d, (map.get(d) || 0) + 1));
    }
    return map;
  }, [purchaseOrders, filterPOStatus, filterPODateField, rabList, menuItems]);

  const poCalendarCells = useMemo(() => {
    const match = /^(\d{4})-(\d{2})$/.exec(poCalendarMonth);
    const year = match ? Number(match[1]) : 2026;
    const month = match ? Number(match[2]) - 1 : 10;
    const firstDayUtc = new Date(Date.UTC(year, month, 1));
    const startOffset = firstDayUtc.getUTCDay(); // 0 = Minggu
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const cells: Array<{ iso: string; day: number; inMonth: boolean }> = [];

    for (let i = startOffset - 1; i >= 0; i--) {
      const dt = new Date(Date.UTC(year, month, -i));
      cells.push({
        iso: dt.toISOString().slice(0, 10),
        day: dt.getUTCDate(),
        inMonth: false,
      });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(Date.UTC(year, month, d));
      cells.push({
        iso: dt.toISOString().slice(0, 10),
        day: d,
        inMonth: true,
      });
    }
    while (cells.length % 7 !== 0) {
      const last = cells[cells.length - 1];
      const nextIso = shiftIsoDate(last.iso, 1);
      cells.push({
        iso: nextIso,
        day: Number(nextIso.slice(8, 10)),
        inMonth: false,
      });
    }
    return {
      monthLabel: formatIndonesianPeriodMonth(`${poCalendarMonth}-01`),
      cells,
    };
  }, [poCalendarMonth]);

  const shiftPOCalendarMonth = (deltaMonths: number) => {
    const match = /^(\d{4})-(\d{2})$/.exec(poCalendarMonth);
    const year = match ? Number(match[1]) : 2026;
    const month = match ? Number(match[2]) - 1 : 10;
    const next = new Date(Date.UTC(year, month + deltaMonths, 1));
    setPoCalendarMonth(next.toISOString().slice(0, 7));
  };

  const filteredPOs = useMemo(() => {
    return purchaseOrders.filter(p => {
      const matchStatus = filterPOStatus === 'ALL' || p.status === filterPOStatus;
      if (!matchStatus) return false;
      if (filterPODate === 'ALL') return true;
      return matchesPODateByField(p, filterPODate, filterPODateField);
    });
  }, [purchaseOrders, filterPOStatus, filterPODate, filterPODateField, matchesPODateByField]);

  const searchedPOs = useMemo(() => {
    const term = poSearchTerm.trim().toLowerCase();
    const matched = !term
      ? filteredPOs
      : filteredPOs.filter(po => {
          const baseMatch = [po.poNumber, po.supplierName, po.status, po.qcStatus, po.notes].some(
            v => v && String(v).toLowerCase().includes(term)
          );
          if (baseMatch) return true;
          return (po.items || []).some(it => {
            const linkedRab = rabList.find(r => r.id === (it.rabId || po.rabId));
            return (
              (it.itemName && it.itemName.toLowerCase().includes(term)) ||
              (linkedRab?.budgetCode && linkedRab.budgetCode.toLowerCase().includes(term)) ||
              (linkedRab?.category && linkedRab.category.toLowerCase().includes(term))
            );
          });
        });

    // Otomatiskan urutan: Nama Bahan Pangan terlebih dahulu, lalu dilanjutkan Nama Bahan Operasional
    return [...matched].sort((a, b) => {
      const rankA = getPODisplayCategoryRank(a, rabList);
      const rankB = getPODisplayCategoryRank(b, rabList);
      if (rankA !== rankB) return rankA - rankB;
      const distA = resolvePODistributionDate(a, rabList, menuItems);
      const distB = resolvePODistributionDate(b, rabList, menuItems);
      if (distA !== distB) return distA.localeCompare(distB);
      return (a.poNumber || '').localeCompare(b.poNumber || '');
    });
  }, [filteredPOs, poSearchTerm, rabList, menuItems]);

  // ---------------------------------------------------------------------------
  // HANDLERS: SUBMODUL A (RAB)
  // ---------------------------------------------------------------------------
  const getAutoRincianForRAB = (rab: RABItem): RABRincianItem[] =>
    resolveAutoRincianForRAB(rab, menuPlannedNeeds.perMenuItems, menuItems);

  const getEffectiveRincianForRAB = (rab: RABItem): RABRincianItem[] => {
    if (Array.isArray(rab.rincianItems) && (rab.rincianItems.length > 0 || rab.isRincianManual)) {
      return rab.rincianItems;
    }
    return getAutoRincianForRAB(rab);
  };

  const handleSaveInlineRincian = async (
    rab: RABItem,
    lines: RABRincianItem[],
    isManual: boolean
  ) => {
    await updateRABItem(rab.id, {
      rincianItems: lines,
      isRincianManual: isManual,
    });
  };

  const handleSyncVolumeFromRincian = async (rab: RABItem, totalQty: number, unit: string) => {
    if (totalQty < (rab.poCreatedQuantity || 0)) {
      addToast(
        'warning',
        'Volume Tidak Valid',
        `Volume RAB tidak boleh lebih kecil dari realisasi PO (${formatNumber(rab.poCreatedQuantity || 0)} ${rab.unit}).`
      );
      return;
    }
    await updateRABItem(rab.id, {
      volume: totalQty,
      unit: unit || rab.unit,
    });
  };

  const handleRequestDeleteRAB = (rab: RABItem) => {
    if ((rab.poCreatedQuantity || 0) > 0) {
      addToast(
        'warning',
        'Item RAB Sudah Memiliki PO',
        `${rab.budgetCode} sudah memiliki realisasi PO sebesar ${formatNumber(rab.poCreatedQuantity || 0)} ${rab.unit}. Batalkan atau selesaikan PO terkait terlebih dahulu jika ingin menghapus RAB.`
      );
      return;
    }
    setRabDeleteConfirm(rab);
  };

  const handleConfirmDeleteRAB = async () => {
    if (!rabDeleteConfirm) return;
    await deleteRABItem(rabDeleteConfirm.id);
    if (selectedRAB?.id === rabDeleteConfirm.id) {
      setIsRABModalOpen(false);
      setSelectedRAB(null);
    }
    setRabDeleteConfirm(null);
  };

  const handleOpenCreateRAB = () => {
    setSelectedRAB(null);
    setRabModalUnitManual(false);
    setRincianManualUnits({});
    const nextNum = rabList.length + 1;
    const targetPlanDate =
      filterRABDate !== 'ALL' ? filterRABDate : plogMenuDays[0]?.date || '2026-11-08';
    const compactDate = targetPlanDate.replace(/-/g, '').slice(2);
    setRabForm({
      category: 'RAB Bahan Pangan',
      budgetCode: `RAB-BP-${compactDate}-${String(nextNum).padStart(3, '0')}`,
      planDate: targetPlanDate,
      periodMonth: formatIndonesianPeriodMonth(targetPlanDate),
      itemName: '',
      volume: 200,
      unit: 'kg',
      unitPrice: 35000,
      notes: '',
      status: 'Menunggu Persetujuan',
      poCreatedQuantity: 0,
      poCreatedAmount: 0,
      sourceType: 'manual',
      rincianItems: [],
      isRincianManual: false,
      customFields: getInitialCustomFieldValues(dynamicFormSchemas.procurement_rab_form),
    });
    setIsRABModalOpen(true);
  };

  const handleOpenEditRAB = (rab: RABItem) => {
    setSelectedRAB(rab);
    setRabModalUnitManual(false);
    setRincianManualUnits({});
    const effectiveRincian = getEffectiveRincianForRAB(rab);
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
      rincianItems: effectiveRincian.map(l => ({ ...l })),
      isRincianManual: Boolean(rab.isRincianManual),
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

    const sanitizedRincian = (rabForm.rincianItems || []).map(l => ({
      ...l,
      menuName: l.menuName.trim() || '-',
      ingredientName: l.ingredientName.trim() || rabForm.itemName,
      quantity: Math.max(0, Number(l.quantity) || 0),
      unit: l.unit.trim() || rabForm.unit || 'kg',
    }));

    if (selectedRAB) {
      await updateRABItem(selectedRAB.id, {
        ...rabForm,
        volume: Number(rabForm.volume),
        unitPrice: Number(rabForm.unitPrice),
        rincianItems: sanitizedRincian,
        isRincianManual: Boolean(rabForm.isRincianManual),
        customFields: rabForm.customFields || {},
      });
    } else {
      await addRABItem({
        ...rabForm,
        volume: Number(rabForm.volume),
        unitPrice: Number(rabForm.unitPrice),
        rincianItems: sanitizedRincian,
        isRincianManual: Boolean(rabForm.isRincianManual),
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

  const resolveDefaultPODatesForRAB = (rab?: RABItem) => {
    const menuDatesSet = new Set(plogMenuDays.map(d => d.date));
    const activeFilterDate = filterPODate !== 'ALL' ? filterPODate : '';
    const rabResolved = resolveRABDistributionDate(rab, menuItems, '');
    const distDate =
      (rabResolved && menuDatesSet.has(rabResolved) ? rabResolved : '') ||
      activeFilterDate ||
      plogMenuDays[0]?.date ||
      '2026-11-08';
    return {
      distributionDate: distDate,
      deliveryDate: shiftIsoDate(distDate, -1),
    };
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
    const { distributionDate, deliveryDate } = resolveDefaultPODatesForRAB(rab);
    setPoDraftLines([
      {
        key: `po-line-${Date.now()}-0`,
        rabId: rab.id,
        quantity: remQty,
        unitPrice: rab.unitPrice,
      },
    ]);
    setPoFormSupplierName(masterSuppliers[0]?.name || 'PT Unggas Barokah Probolinggo');
    setPoFormDistributionDate(distributionDate);
    setPoFormDeliveryDate(deliveryDate);
    setPoFormNotes(
      `PO pengadaan bersumber dari kode anggaran ${rab.budgetCode} (menu ${distributionDate}, target kirim H-1: ${deliveryDate})`
    );
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
    const preferredForDay =
      filterPODate !== 'ALL'
        ? targetList.find(
            r => resolveRABDistributionDate(r, menuItems, r.planDate) === filterPODate
          )
        : undefined;
    const firstApproved = preferredForDay || targetList[0];
    const remQty = Math.max(0, firstApproved.volume - (firstApproved.poCreatedQuantity || 0));
    if (remQty <= 0) {
      addToast(
        'warning',
        'Seluruh Kuota RAB Terpakai',
        'Semua RAB yang disetujui sudah habis dialokasikan ke PO. Tambahkan atau setujui RAB baru.'
      );
      return;
    }
    const { distributionDate, deliveryDate } = resolveDefaultPODatesForRAB(firstApproved);
    setPoDraftLines([
      {
        key: `po-line-${Date.now()}-0`,
        rabId: firstApproved.id,
        quantity: remQty,
        unitPrice: firstApproved.unitPrice,
      },
    ]);
    setPoFormSupplierName(masterSuppliers[0]?.name || 'Koperasi Tani Makmur Krejengan');
    setPoFormDistributionDate(distributionDate);
    setPoFormDeliveryDate(deliveryDate);
    setPoFormNotes(
      `PO diajukan berdasarkan otorisasi RAB ${firstApproved.budgetCode} (target kirim H-1 sebelum distribusi ${distributionDate})`
    );
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

    const rawPOItems: PurchaseOrderItem[] = [];
    const linkedBudgetCodes: string[] = [];
    for (const line of poDraftLines) {
      const rab = rabList.find(r => r.id === line.rabId);
      if (!rab) continue;
      const qty = Number(line.quantity);
      const price = Number(line.unitPrice) || rab.unitPrice;
      rawPOItems.push({
        itemId: rab.id,
        itemName: rab.itemName,
        quantity: qty,
        unit: rab.unit,
        unitPrice: price,
        subtotal: qty * price,
        rabId: rab.id,
        receivedQuantity: 0,
        category: rab.category,
      });
      if (!linkedBudgetCodes.includes(rab.budgetCode)) {
        linkedBudgetCodes.push(rab.budgetCode);
      }
    }

    if (rawPOItems.length === 0) return;

    // Otomatis urutkan item PO: Bahan Pangan terlebih dahulu lalu Operasional
    const poItems = sortPOItemsBahanThenOperasional(rawPOItems, {}, rabList);
    const hasBahan = poItems.some(it => it.category === 'RAB Bahan Pangan');
    const hasOps = poItems.some(it => it.category === 'RAB Operasional');
    const poCategory: PurchaseOrder['poCategory'] =
      hasBahan && hasOps ? 'Gabungan' : hasOps ? 'Operasional' : 'Bahan Pangan';

    const effectiveDistDate =
      poFormDistributionDate || shiftIsoDate(poFormDeliveryDate, 1);
    const effectiveDeliveryDate =
      poFormDeliveryDate || shiftIsoDate(effectiveDistDate, -1);

    const totalAmount = poItems.reduce((sum, it) => sum + it.subtotal, 0);
    const seq = String(purchaseOrders.length + 1).padStart(3, '0');
    const generatedPONumber = `PO/SPPG-TMG2/2026/XI/${seq}`;

    const newPO: Omit<PurchaseOrder, 'id'> = {
      poNumber: generatedPONumber,
      date: new Date().toISOString().slice(0, 10),
      supplierName: poFormSupplierName || 'Supplier Mitra Terdaftar',
      supplierContact: '0812-3456-7890 (PIC Pengiriman)',
      deliveryDate: effectiveDeliveryDate,
      distributionDate: effectiveDistDate,
      poCategory,
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
      `Nomor ${generatedPONumber} (${poItems.length} item, ${formatRupiah(totalAmount)}) berhasil diajukan dengan target kirim H-1 (${formatIndonesianDate(effectiveDeliveryDate)}).`
    );
    setIsCreatePOOpen(false);
  };

  const handleUpdatePOStatus = async (poId: string, newStatus: POStatusPLOK) => {
    const targetPO = purchaseOrders.find(p => p.id === poId);
    if (newStatus === 'Disetujui' && targetPO) {
      const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
      const approverLabel = `${currentUser.name} (${currentUser.role})`;
      const nextItems = (targetPO.items || []).map(it => {
        const currentItemStatus = resolvePOItemApprovalStatus(it, targetPO);
        if (currentItemStatus === 'Ditolak') return { ...it, approvalStatus: 'Ditolak' as const };
        return {
          ...it,
          approvalStatus: 'Disetujui' as const,
          approvedBy: approverLabel,
          approvedAt: stamp,
        };
      });
      const nextTotal = nextItems
        .filter(it => it.approvalStatus !== 'Ditolak')
        .reduce(
          (sum, it) => sum + Number(it.subtotal ?? (it.quantity || 0) * (it.unitPrice || 0)),
          0
        );
      await updatePurchaseOrder(poId, {
        status: newStatus,
        approvedBy: approverLabel,
        items: nextItems,
        totalAmount: nextTotal,
      });
      addToast('success', 'PO Disetujui', `Seluruh item aktif pada PO ${targetPO.poNumber} disetujui.`);
      return;
    }

    await updatePurchaseOrder(poId, {
      status: newStatus,
      approvedBy: newStatus === 'Disetujui' ? `${currentUser.name} (${currentUser.role})` : undefined,
    });
    addToast('success', 'Status PO Diperbarui', `Status PO diubah menjadi: ${newStatus}`);
  };

  const handleUpdatePOItemApproval = async (
    po: PurchaseOrder,
    targetSortedIndex: number,
    decision: POItemApprovalStatus
  ) => {
    const rawItems =
      po.items && po.items.length > 0
        ? po.items
        : [
            {
              itemId: po.id,
              itemName: po.notes || 'Pesanan PO',
              quantity: 1,
              unit: 'paket',
              unitPrice: po.totalAmount,
              subtotal: po.totalAmount,
              rabId: po.rabId,
            },
          ];
    const sortedItems = sortPOItemsBahanThenOperasional(rawItems, po, rabList);
    const targetItem = sortedItems[targetSortedIndex];
    if (!targetItem) return;

    const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const approverLabel = `${currentUser.name} (${currentUser.role})`;
    const nextItems: PurchaseOrderItem[] = sortedItems.map((it, idx) => {
      if (idx === targetSortedIndex) {
        return {
          ...it,
          approvalStatus: decision,
          approvedBy: decision === 'Menunggu persetujuan' ? undefined : approverLabel,
          approvedAt: decision === 'Menunggu persetujuan' ? undefined : stamp,
        };
      }
      return {
        ...it,
        approvalStatus: resolvePOItemApprovalStatus(it, po),
      };
    });

    const approvedCount = nextItems.filter(it => it.approvalStatus === 'Disetujui').length;
    const rejectedCount = nextItems.filter(it => it.approvalStatus === 'Ditolak').length;
    const pendingCount = nextItems.filter(
      it => it.approvalStatus === 'Menunggu persetujuan'
    ).length;

    let nextPOStatus: POStatusPLOK = po.status;
    if (rejectedCount === nextItems.length) {
      nextPOStatus = 'Ditolak';
    } else if (pendingCount === 0 && approvedCount > 0) {
      nextPOStatus = 'Disetujui';
    } else {
      nextPOStatus = 'Menunggu persetujuan';
    }

    const nextTotalAmount = nextItems
      .filter(it => it.approvalStatus !== 'Ditolak')
      .reduce(
        (sum, it) => sum + Number(it.subtotal ?? (it.quantity || 0) * (it.unitPrice || 0)),
        0
      );

    await updatePurchaseOrder(po.id, {
      items: nextItems,
      totalAmount: nextTotalAmount,
      status: nextPOStatus,
      approvedBy: nextPOStatus === 'Disetujui' ? approverLabel : undefined,
    });

    const isOps = isOperasionalPOItem(targetItem, po, rabList);
    const catLabel = isOps ? 'Operasional' : 'Bahan Pangan';
    if (decision === 'Disetujui') {
      addToast(
        'success',
        'Item PO Disetujui',
        `${targetItem.itemName} (${catLabel}) disetujui. Status PO: ${nextPOStatus}.`
      );
    } else if (decision === 'Ditolak') {
      addToast(
        'warning',
        'Item PO Ditolak',
        `${targetItem.itemName} (${catLabel}) ditolak & kuota RAB dilepaskan.`
      );
    } else {
      addToast(
        'info',
        'Status Item Direset',
        `${targetItem.itemName} (${catLabel}) dikembalikan ke Menunggu Persetujuan.`
      );
    }
  };

  // ---------------------------------------------------------------------------
  // HANDLERS: SUBMODUL C (QUALITY CONTROL TERIKAT PO HARIAN -> STOK GUDANG)
  // ---------------------------------------------------------------------------
  const buildDraftsFromPOList = (poList: PurchaseOrder[]): QCModalItemDraft[] => {
    const defaultExp = new Date(Date.now() + 86400000 * 5).toISOString().slice(0, 10);
    const orderedPOs = [...poList].sort((a, b) => {
      const rankA = getPODisplayCategoryRank(a, rabList);
      const rankB = getPODisplayCategoryRank(b, rabList);
      if (rankA !== rankB) return rankA - rankB;
      return (a.poNumber || '').localeCompare(b.poNumber || '');
    });

    const drafts: QCModalItemDraft[] = [];
    for (const po of orderedPOs) {
      const sortedItems = sortPOItemsBahanThenOperasional(po.items || [], po, rabList);
      sortedItems
        .filter(item => resolvePOItemApprovalStatus(item, po) !== 'Ditolak')
        .forEach((item, idx) => {
          const isOps = isOperasionalPOItem(item, po, rabList);
          const categoryLabel: QCModalItemDraft['categoryLabel'] = isOps
            ? 'Operasional Harian'
            : 'Bahan Pangan';
          const existingQC = qualityControlRecords.find(
            q =>
              (q.poId === po.id || (q.poNumber && q.poNumber === po.poNumber)) &&
              isMatchingMaterialNameShared(q.itemName, item.itemName)
          );
          const lowerName = item.itemName.toLowerCase();
          const isCold =
            !isOps &&
            (lowerName.includes('ayam') ||
              lowerName.includes('daging') ||
              lowerName.includes('ikan') ||
              lowerName.includes('fillet'));

          drafts.push({
            key: `draft-${po.id}-${idx}-${Date.now()}`,
            poId: po.id,
            poNumber: po.poNumber,
            supplierName: po.supplierName,
            categoryLabel,
            itemName: item.itemName,
            unit: item.unit || 'kg',
            orderedQuantity: item.quantity,
            receivedQuantity: existingQC ? existingQC.receivedQuantity : item.quantity,
            condition: existingQC ? existingQC.condition : 'Baik',
            qualityGrade: existingQC ? existingQC.qualityGrade : 'Grade A (Sangat Baik)',
            receivingTemp: existingQC?.receivingTemp ?? (isCold ? 2.5 : 24.0),
            expiryDate: existingQC?.expiryDate || defaultExp,
            photoUrls: existingQC ? getQCPhotos(existingQC) : [],
            notes: existingQC?.notes || '',
            status: existingQC ? existingQC.status : 'Diterima',
            existingQcId: existingQC?.id,
          });
        });
    }

    // Pastikan urutan akhir selalu menampilkan semua Bahan Pangan dahulu, lalu Operasional Harian
    return drafts
      .map((d, idx) => ({
        d,
        idx,
        rank: d.categoryLabel === 'Operasional Harian' ? 1 : 0,
      }))
      .sort((a, b) => (a.rank !== b.rank ? a.rank - b.rank : a.idx - b.idx))
      .map(entry => entry.d);
  };

  const handleOpenQCModal = (po: PurchaseOrder) => {
    const resolvedDay =
      resolvePODistributionDate(po, rabList, menuItems) ||
      po.deliveryDate ||
      po.date ||
      qcModalDate;
    const dayPOsRaw = getPOsForDailyQCDate(resolvedDay);
    const dayPOs = dayPOsRaw.some(p => p.id === po.id) ? dayPOsRaw : [po, ...dayPOsRaw];
    setEditingQCRecord(null);
    setQcModalDate(resolvedDay);
    setQcSelectedPOId('ALL_DAILY');
    setQcModalCategoryFilter('ALL');
    setSelectedPOForQC(po);
    setQcItemDrafts(buildDraftsFromPOList(dayPOs));
    setQcFormInspector(currentUser.name);
    setIsQCModalOpen(true);
  };

  const handleOpenEditQCRecord = (record: QualityControlRecord) => {
    const linkedPO =
      purchaseOrders.find(p => p.id === record.poId || p.poNumber === record.poNumber) || null;
    const isOps = linkedPO
      ? isOperasionalPOItem({ itemName: record.itemName }, linkedPO, rabList)
      : false;
    setEditingQCRecord(record);
    setSelectedPOForQC(linkedPO);
    setQcSelectedPOId(linkedPO?.id || record.poId);
    setQcFormInspector(record.inspectorName || currentUser.name);
    setQcItemDrafts([
      {
        key: `edit-${record.id}`,
        poId: linkedPO?.id || record.poId,
        poNumber: linkedPO?.poNumber || record.poNumber,
        supplierName: linkedPO?.supplierName || record.supplierName,
        categoryLabel: isOps ? 'Operasional Harian' : 'Bahan Pangan',
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
        existingQcId: record.id,
      },
    ]);
    setIsQCModalOpen(true);
  };

  const handleOpenDirectQCModal = () => {
    const preferredDate =
      (filterPODate !== 'ALL'
        ? filterPODate
        : qcTabDateFilter !== 'ALL'
        ? qcTabDateFilter
        : '') ||
      qcAvailableDates[0] ||
      qcModalDate;
    const dayPOs = getPOsForDailyQCDate(preferredDate);
    if (eligiblePOsForQC.length === 0 && qcAvailableDates.length === 0) {
      addToast(
        'warning',
        'Belum Ada Purchase Order (PO)',
        'Input Quality Control wajib mengambil data dari Purchase Order (PO). Silakan terbitkan & kirim PO terlebih dahulu.'
      );
      return;
    }
    setEditingQCRecord(null);
    setQcModalDate(preferredDate);
    setQcSelectedPOId('ALL_DAILY');
    setQcModalCategoryFilter('ALL');
    setSelectedPOForQC(dayPOs[0] || eligiblePOsForQC[0] || null);
    setQcItemDrafts(buildDraftsFromPOList(dayPOs));
    setQcFormInspector(currentUser.name);
    setIsQCModalOpen(true);
  };

  const handleSelectQCDateInModal = (nextDate: string) => {
    setQcModalDate(nextDate);
    setQcSelectedPOId('ALL_DAILY');
    setQcModalCategoryFilter('ALL');
    const dayPOs = getPOsForDailyQCDate(nextDate);
    setSelectedPOForQC(dayPOs[0] || null);
    setQcItemDrafts(buildDraftsFromPOList(dayPOs));
  };

  const handleSelectPOSourceInQCModal = (val: string) => {
    setQcSelectedPOId(val);
    if (val === 'ALL_DAILY') {
      const dayPOs = getPOsForDailyQCDate(qcModalDate);
      setSelectedPOForQC(dayPOs[0] || null);
      setQcItemDrafts(buildDraftsFromPOList(dayPOs));
      return;
    }
    const foundPO = purchaseOrders.find(p => p.id === val);
    if (foundPO) {
      setSelectedPOForQC(foundPO);
      setQcItemDrafts(buildDraftsFromPOList([foundPO]));
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
    if (qcSelectedPOId === 'ALL_DAILY') {
      const dayPOs = getPOsForDailyQCDate(qcModalDate);
      setSelectedPOForQC(dayPOs[0] || null);
      setQcItemDrafts(buildDraftsFromPOList(dayPOs));
      return;
    }
    if (!selectedPOForQC) return;
    setQcItemDrafts(buildDraftsFromPOList([selectedPOForQC]));
  };

  const handleSyncAndReloadQCModal = async () => {
    setQcPendingSyncReload(true);
    await syncDailyPOsFromRAB(qcModalDate);
  };

  React.useEffect(() => {
    if (!qcPendingSyncReload || !isQCModalOpen || editingQCRecord) return;
    const dayPOs = getPOsForDailyQCDate(qcModalDate);
    setSelectedPOForQC(dayPOs[0] || null);
    setQcSelectedPOId('ALL_DAILY');
    setQcItemDrafts(buildDraftsFromPOList(dayPOs));
    setQcPendingSyncReload(false);
  }, [qcPendingSyncReload, purchaseOrders, isQCModalOpen, editingQCRecord, qcModalDate, getPOsForDailyQCDate]);

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
      const shouldAddStock = isQCAcceptedStatus(draft.status) && receivedQty > 0;

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

    const validDrafts = qcItemDrafts.filter(d => d.itemName.trim().length > 0);
    if (validDrafts.length === 0) {
      addToast(
        'error',
        'Data Bahan & Operasional Kosong',
        'Tidak ada item Purchase Order harian pada tanggal terpilih untuk diinspeksi.'
      );
      return;
    }

    for (const draft of validDrafts) {
      const orderedQty = Number(draft.orderedQuantity) || 0;
      const receivedQty = Number(draft.receivedQuantity) || 0;
      const diffQty = receivedQty - orderedQty;

      // Stok gudang HANYA bertambah berdasarkan hasil input Quality Control yang diterima!
      const shouldAddStock = isQCAcceptedStatus(draft.status) && receivedQty > 0;

      if (draft.existingQcId) {
        await updateQualityControlRecord(draft.existingQcId, {
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
        });
      } else {
        const newQCRecord: Omit<QualityControlRecord, 'id' | 'inspectedAt'> = {
          poId: draft.poId || selectedPOForQC?.id || '',
          poNumber: draft.poNumber || selectedPOForQC?.poNumber || '-',
          supplierName: draft.supplierName || selectedPOForQC?.supplierName || '-',
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
    }

    setIsQCModalOpen(false);
  };

  // ---------------------------------------------------------------------------
  // EXPORTS
  // ---------------------------------------------------------------------------
  const formatRincianExportText = (rab: RABItem): string => {
    const lines = getEffectiveRincianForRAB(rab);
    if (lines.length === 0) return '-';
    return lines
      .map(l => `${l.menuName}: ${l.ingredientName} (${formatNumber(l.quantity)} ${l.unit})`)
      .join(' | ');
  };

  const handleExportRABPDF = () => {
    const exportRowsSource = [
      ...(filterRABCategory === 'ALL' || filterRABCategory === 'RAB Bahan Pangan'
        ? rabPanganRows
        : []),
      ...(filterRABCategory === 'ALL' || filterRABCategory === 'RAB Operasional'
        ? rabOperasionalRows
        : []),
    ];
    const baseHeaders = ['Kode Anggaran', 'Tanggal', 'Kategori', 'Nama Barang', 'Rincian RAB', 'Volume', 'Harga Satuan', 'Total Anggaran', 'Status', 'Sisa Kuota PO'];
    const baseRows = exportRowsSource.map(r => [
      r.budgetCode,
      r.planDate,
      r.category,
      r.itemName,
      formatRincianExportText(r),
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
      exportRowsSource
    );
    const dateLabel =
      filterRABDate !== 'ALL' ? `Tanggal ${formatIndonesianDate(filterRABDate)}` : 'Semua Tanggal';
    exportTableToPDF({
      title: `Rencana Anggaran Belanja (RAB) Harian SPPG TMG2 — ${dateLabel}`,
      subtitle: 'Satuan Pelayanan Pemenuhan Gizi - Yayasan Hafshawaty Probolinggo',
      headers,
      rows,
      fileName:
        filterRABDate !== 'ALL'
          ? `RAB_Harian_${filterRABDate}_SPPG_TMG2`
          : 'RAB_Operasional_SPPG_TMG2',
      sppgConfig,
      signerName: sppgConfig.financeOfficer,
      signerRole: 'Pengawas Keuangan SPPG',
    });
  };

  const handleExportRABExcel = () => {
    const exportRowsSource = [
      ...(filterRABCategory === 'ALL' || filterRABCategory === 'RAB Bahan Pangan'
        ? rabPanganRows
        : []),
      ...(filterRABCategory === 'ALL' || filterRABCategory === 'RAB Operasional'
        ? rabOperasionalRows
        : []),
    ];
    const data = exportRowsSource.map(r =>
      appendDynamicExcelFields(
        dynamicFormSchemas.procurement_rab_form,
        {
          'Kode Anggaran': r.budgetCode,
          'Kategori': r.category,
          'Periode': r.periodMonth,
          'Tanggal Rencana': r.planDate,
          'Nama Barang': r.itemName,
          'Rincian RAB (Menu, Bahan, Kuantiti, Satuan)': formatRincianExportText(r),
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
    exportToExcel(
      data,
      filterRABDate !== 'ALL'
        ? `RAB_Harian_${filterRABDate}_SPPG_TMG2`
        : 'RAB_Operasional_Bahan_SPPG_TMG2',
      'RAB SPPG'
    );
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
      rows: filteredQCLogList.map(q => {
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
      fileName:
        qcTabDateFilter !== 'ALL'
          ? `Laporan_QC_PO_${qcTabDateFilter}_SPPG_TMG2`
          : 'Laporan_QC_Penerimaan_Bahan_SPPG_TMG2',
      sppgConfig,
      signerName: sppgConfig.nutritionOfficer,
      signerRole: 'Pengawas Gizi Dietisien SPPG',
    });
  };

  const handleExportQCExcel = () => {
    const data = filteredQCLogList.map(q => {
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
    const ordered = filteredQCLogList.reduce((acc, q) => acc + (Number(q.orderedQuantity) || 0), 0);
    const received = filteredQCLogList.reduce((acc, q) => acc + (Number(q.receivedQuantity) || 0), 0);
    const diff = received - ordered;
    const pct = ordered > 0 ? Math.round((received / ordered) * 100) : 0;
    const photoCount = filteredQCLogList.filter(q => getQCPhotos(q).length > 0).length;
    const totalPhotos = filteredQCLogList.reduce((acc, q) => acc + getQCPhotos(q).length, 0);
    return { ordered, received, diff, pct, photoCount, totalPhotos };
  }, [filteredQCLogList]);

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
                onClick={() => syncAllMenuNeedsToRAB(filterRABDate)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:hover:bg-teal-900/70 text-[#0D9488] dark:text-teal-300 border border-teal-200 dark:border-teal-800 rounded-xl text-xs font-bold shadow-xs transition-all duration-200 ease-in-out"
                title="Ambil & sinkronkan kebutuhan bahan harian otomatis dari Perencanaan Menu (PLOG) ke RAB Bahan Pangan"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>
                  {filterRABDate !== 'ALL'
                    ? `Sinkron Harian (${formatIndonesianDate(filterRABDate)})`
                    : `Sinkron Menu PLOG (${menuPlannedNeeds.aggregated.length})`}
                </span>
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-stretch">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 ease-out flex flex-col justify-between h-full">
          <div className="text-[11px] text-slate-600 dark:text-slate-400 uppercase font-bold flex items-center justify-between gap-2">
            <span>Total Anggaran RAB</span>
            <span className="w-8 h-8 rounded-lg bg-blue-50 text-[#1E3A8A] dark:bg-sky-950/60 dark:text-sky-400 flex items-center justify-center shrink-0">
              <Coins className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-mono tabular-nums mt-2">
            {formatRupiah(rabSummary.totalAll)}
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
            Pangan: {formatRupiah(rabSummary.totalPangan)} • Ops: {formatRupiah(rabSummary.totalOperasional)}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 ease-out flex flex-col justify-between h-full">
          <div className="text-[11px] text-slate-600 dark:text-slate-400 uppercase font-bold flex items-center justify-between gap-2">
            <span>RAB Telah Disetujui</span>
            <span className="w-8 h-8 rounded-lg bg-teal-50 text-[#0D9488] dark:bg-teal-950/60 dark:text-teal-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold tracking-tight text-[#0D9488] font-mono tabular-nums mt-2">
            {formatRupiah(rabSummary.totalApproved)}
          </div>
          <div className="text-[11px] text-[#0D9488] font-semibold mt-1">
            Otorisasi Sah Kepala SPPG
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 ease-out flex flex-col justify-between h-full">
          <div className="text-[11px] text-slate-600 dark:text-slate-400 uppercase font-bold flex items-center justify-between gap-2">
            <span>PO Terbit & Teralokasi</span>
            <span className="w-8 h-8 rounded-lg bg-blue-50 text-[#1E3A8A] dark:bg-sky-950/60 dark:text-sky-400 flex items-center justify-center shrink-0">
              <ShoppingCart className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold tracking-tight text-[#1E3A8A] dark:text-sky-400 font-mono tabular-nums mt-2">
            {formatRupiah(rabSummary.totalPOAmountCreated)}
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
            Sisa Pagu RAB: {formatRupiah(rabSummary.remainingBudget)}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 ease-out flex flex-col justify-between h-full">
          <div className="text-[11px] text-slate-600 dark:text-slate-400 uppercase font-bold flex items-center justify-between gap-2">
            <span>Inspeksi QC Masuk Gudang</span>
            <span className="w-8 h-8 rounded-lg bg-teal-50 text-[#0D9488] dark:bg-teal-950/60 dark:text-teal-400 flex items-center justify-center shrink-0">
              <PackageCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold tracking-tight text-[#1E3A8A] dark:text-sky-400 font-mono tabular-nums mt-2">
            {qcList.length} Batch QC
          </div>
          <div className="text-[11px] text-[#0D9488] font-semibold mt-1">
            Stok Terverifikasi Higienis
          </div>
        </div>
      </div>

      {/* 3 Main PLOK Responsive Pill Tabs */}
      <div className="bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex flex-nowrap sm:flex-wrap items-center gap-1.5 overflow-x-auto no-scrollbar text-xs font-semibold">
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
                className={`min-h-[38px] inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ease-out whitespace-nowrap shrink-0 cursor-pointer ${
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
        <div key="rab" className="space-y-4 animate-fadeIn">
          {isEditingRabSchema && (
            <DynamicFormBuilderPanel
              formId="procurement_rab_form"
              onClose={() => setIsEditingRabSchema(false)}
            />
          )}

          {/* Filter Bar */}
          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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

            {/* Daily Selector matching PLOG Menus */}
            <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="inline-flex items-center gap-1 font-bold text-[#1E3A8A] dark:text-sky-300 uppercase text-[10px] mr-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>RAB Harian (Menu PLOG):</span>
                </span>
                {plogMenuDays.map(day => {
                  const isActive = filterRABDate === day.date;
                  return (
                    <button
                      key={day.date}
                      type="button"
                      onClick={() => setFilterRABDate(day.date)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition border ${
                        isActive
                          ? 'bg-[#0D9488] text-white border-[#0D9488] shadow-2xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-teal-50 hover:border-teal-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {formatIndonesianDate(day.date)}
                      {day.menuCodes.length > 0 ? ` • ${day.menuCodes.join(', ')}` : ''}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setFilterRABDate('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition border ${
                    filterRABDate === 'ALL'
                      ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-2xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                  }`}
                >
                  Semua Tanggal
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={filterRABDate === 'ALL' ? '' : filterRABDate}
                  onChange={e => setFilterRABDate(e.target.value || 'ALL')}
                  className="px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-mono"
                  title="Pilih tanggal RAB harian secara spesifik"
                />
                {hasPermission('procurement', 'create') && (
                  <button
                    type="button"
                    onClick={() => syncAllMenuNeedsToRAB(filterRABDate)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold transition"
                    title="Sesuaikan item RAB Bahan Pangan untuk tanggal ini berdasarkan Perencanaan Bahan Menu PLOG"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>
                      {filterRABDate !== 'ALL' ? 'Sinkron Hari Ini dari PLOG' : 'Sinkron Semua Hari PLOG'}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {activePlogDayInfo && (
              <div className="px-3 py-2 rounded-lg bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-800/60 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <div className="text-slate-700 dark:text-slate-200">
                  <span className="font-extrabold text-[#0D9488] dark:text-teal-300">
                    Menu PLOG {activePlogDayInfo.menuCodes.join(', ')} ({activePlogDayInfo.dayName},{' '}
                    {formatIndonesianDate(activePlogDayInfo.date)}):
                  </span>{' '}
                  <span>{activePlogDayInfo.menusSummary.join(' | ') || 'Menu harian terjadwal'}</span>
                </div>
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                  Edit/hapus item di RAB tidak mengubah Menu PLOG &amp; Food Cost PLOG
                </span>
              </div>
            )}
          </div>

          {/* Datalist suggestions untuk Rincian RAB (Menu PLOG, Bahan Pangan & Satuan) */}
          <datalist id="rab-rincian-menu-options">
            {menuItems.map(m => (
              <option key={m.id} value={getDishLabelFromMenu(m)} />
            ))}
          </datalist>
          <datalist id="rab-pangan-master-options">
            {panganIngredientOptions.map(name => (
              <option key={name} value={name} />
            ))}
          </datalist>
          <datalist id="rab-operasional-master-options">
            {operasionalItemOptions.map(name => (
              <option key={name} value={name} />
            ))}
          </datalist>
          <datalist id="rab-rincian-unit-options">
            {unitOptions.map(u => (
              <option key={u.value} value={u.value} label={u.label} />
            ))}
          </datalist>

          {/* Search & Header Card untuk Rincian Daftar Rencana Belanja (RAB) */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-4 sm:px-5 space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  Rincian Daftar Rencana Belanja (RAB){' '}
                  {filterRABDate !== 'ALL' ? `— ${formatIndonesianDate(filterRABDate)}` : '(Semua Tanggal)'}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Disesuaikan harian mengikuti Perencanaan Bahan Menu PLOG • Edit/hapus item di RAB aman &amp; tidak menghapus Menu PLOG maupun Food Cost PLOG
                </p>
              </div>
              <div className="relative w-full lg:w-80 print:hidden">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={rabSearchTerm}
                  onChange={e => setRabSearchTerm(e.target.value)}
                  placeholder="Cari kode, bahan pangan, uraian, atau menu..."
                  className="w-full h-9 pl-9 pr-8 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/70 text-slate-800 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
                {rabSearchTerm && (
                  <button
                    type="button"
                    onClick={() => setRabSearchTerm('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs p-1 cursor-pointer"
                    title="Hapus pencarian"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          {rabPanganRows.length === 0 &&
          rabOperasionalRows.length === 0 &&
          newPanganRows.length === 0 &&
          newOperasionalRows.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6">
              <EmptyState
                title="Data RAB tidak ditemukan"
                description={
                  filterRABDate !== 'ALL'
                    ? `Belum ada item RAB untuk tanggal ${formatIndonesianDate(filterRABDate)}. Klik "Sinkron Hari Ini dari PLOG" atau tambahkan baris langsung.`
                    : 'Belum ada item RAB yang cocok dengan filter kategori, periode, atau kata kunci pencarian.'
                }
                actionLabel={
                  hasPermission('procurement', 'create') || hasPermission('procurement', 'edit')
                    ? filterRABCategory === 'RAB Operasional'
                      ? 'Tambah Baris Operasional'
                      : 'Tambah Baris Bahan Pangan'
                    : undefined
                }
                onAction={
                  filterRABCategory === 'RAB Operasional'
                    ? handleAddNewOperasionalRow
                    : handleAddNewPanganRow
                }
              />
            </div>
          ) : (
            <div className="space-y-6">
              {/* =============================================================== */}
              {/* FORMAT 1: RAB BAHAN PANGAN                                      */}
              {/* =============================================================== */}
              {(filterRABCategory === 'ALL' || filterRABCategory === 'RAB Bahan Pangan') && (() => {
                const canEditRAB = hasPermission('procurement', 'edit');
                const canAddPanganRow = hasPermission('procurement', 'create') || canEditRAB;
                const totalKeseluruhanPangan =
                  rabPanganRows.reduce(
                    (acc, r) => acc + (Number(getPanganEffectiveRowValues(r).totalBudget) || 0),
                    0
                  ) +
                  newPanganRows.reduce((acc, r) => acc + (Number(r.totalBudget) || 0), 0);
                const totalPerSasaranPangan =
                  rabTargetMetrics.totalSasaran > 0
                    ? Math.round(totalKeseluruhanPangan / rabTargetMetrics.totalSasaran)
                    : 0;
                const sisaPangan = rabTargetMetrics.paguPangan - totalKeseluruhanPangan;
                const trailingColsCount = 1 + dynamicRabColumns.length;
                const dirtyPanganCount = Object.keys(panganRowDrafts).length + newPanganRows.length;

                return (
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-700 shadow-sm overflow-hidden print:shadow-none">
                    <div className="px-4 py-2.5 bg-[#C6E0B4] dark:bg-emerald-950/70 border-b border-slate-300 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-emerald-100">
                          BAHAN PANGAN ({rabPanganRows.length} Item)
                          {filterRABDate !== 'ALL'
                            ? ` — ${formatIndonesianDate(filterRABDate)}`
                            : ''}
                        </span>
                        {canEditRAB && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white/80 dark:bg-slate-900/70 text-slate-700 dark:text-emerald-200 border border-emerald-700/20">
                            Klik langsung tiap kolom untuk edit manual
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {canAddPanganRow && (
                          <button
                            type="button"
                            onClick={handleAddNewPanganRow}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0D9488] hover:bg-teal-700 text-white text-[11px] font-bold shadow-xs transition active:scale-[0.98] print:hidden cursor-pointer"
                            title="Tambahkan baris bahan pangan baru langsung di tabel"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Tambah Baris</span>
                          </button>
                        )}
                        {canAddPanganRow && dirtyPanganCount > 0 && (
                          <button
                            type="button"
                            onClick={handleSaveAllPanganDrafts}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1E3A8A] hover:bg-blue-900 text-white text-[11px] font-bold shadow-xs transition active:scale-[0.98] print:hidden cursor-pointer"
                          >
                            <Save className="w-3 h-3" />
                            <span>Simpan Semua ({dirtyPanganCount})</span>
                          </button>
                        )}
                        <span className="text-[11px] font-bold text-slate-700 dark:text-emerald-200 font-mono">
                          Target Sasaran Aktif: {formatNumber(rabTargetMetrics.totalSasaran)} Porsi
                        </span>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-xs">
                        <thead>
                          {/* Numbered Spreadsheet Column Strip (1..7) */}
                          <tr className="bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300 text-center">
                            <th className="border border-slate-300 dark:border-slate-700 px-2 py-1 w-10">1</th>
                            <th className="border border-slate-300 dark:border-slate-700 px-2 py-1 sticky left-0 z-10 bg-slate-100 dark:bg-slate-800">2</th>
                            <th className="border border-slate-300 dark:border-slate-700 px-2 py-1">3</th>
                            <th className="border border-slate-300 dark:border-slate-700 px-2 py-1">4</th>
                            <th className="border border-slate-300 dark:border-slate-700 px-2 py-1">5</th>
                            <th className="border border-slate-300 dark:border-slate-700 px-2 py-1">6</th>
                            <th className="border border-slate-300 dark:border-slate-700 px-2 py-1">7</th>
                            {dynamicRabColumns.map((col, idx) => (
                              <th
                                key={col.key}
                                className="border border-slate-300 dark:border-slate-700 px-2 py-1"
                              >
                                {8 + idx}
                              </th>
                            ))}
                            <th className="border border-slate-300 dark:border-slate-700 px-2 py-1 print:hidden">
                              Aksi
                            </th>
                          </tr>

                          {/* Main Olive Green Column Headers */}
                          <tr className="bg-[#548235] dark:bg-emerald-900 text-white text-[11px] font-extrabold tracking-wide">
                            <th className="border border-slate-400/70 dark:border-slate-700 px-2.5 py-2 text-center w-10">
                              NO
                            </th>
                            <th className="border border-slate-400/70 dark:border-slate-700 px-3 py-2 text-left min-w-[230px] sticky left-0 z-10 bg-[#548235] dark:bg-emerald-900">
                              BAHAN PANGAN
                            </th>
                            <th className="border border-slate-400/70 dark:border-slate-700 px-3 py-2 text-center whitespace-nowrap">
                              JUMLAH SASARAN
                            </th>
                            <th className="border border-slate-400/70 dark:border-slate-700 px-3 py-2 text-center whitespace-nowrap">
                              Jumlah
                            </th>
                            <th className="border border-slate-400/70 dark:border-slate-700 px-3 py-2 text-center whitespace-nowrap">
                              Satuan
                            </th>
                            <th className="border border-slate-400/70 dark:border-slate-700 px-3 py-2 text-right whitespace-nowrap">
                              HARGA DASAR
                            </th>
                            <th className="border border-slate-400/70 dark:border-slate-700 px-3 py-2 text-right whitespace-nowrap">
                              Jumlah
                            </th>
                            {dynamicRabColumns.map(col => (
                              <th
                                key={col.key}
                                className="border border-slate-400/70 dark:border-slate-700 px-3 py-2 text-left whitespace-nowrap"
                              >
                                {col.header}
                              </th>
                            ))}
                            <th className="border border-slate-400/70 dark:border-slate-700 px-3 py-2 text-right whitespace-nowrap print:hidden">
                              Status & Aksi Otorisasi / PO
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {rabPanganRows.length === 0 && newPanganRows.length === 0 ? (
                            <tr>
                              <td
                                colSpan={8 + dynamicRabColumns.length}
                                className="border border-slate-300 dark:border-slate-700 px-4 py-6 text-center text-xs text-slate-500 italic"
                              >
                                Belum ada item RAB Bahan Pangan untuk filter yang dipilih.
                              </td>
                            </tr>
                          ) : (
                            rabPanganRows.map((row, idx) => {
                              const eff = getPanganEffectiveRowValues(row);
                              const isDirty = Boolean(panganRowDrafts[row.id]);
                              const usedQty = row.poCreatedQuantity || 0;
                              const remQty = Math.max(0, eff.volume - usedQty);
                              const percent = eff.volume > 0 ? (usedQty / eff.volume) * 100 : 0;

                              return (
                                <tr
                                  key={row.id}
                                  className={`transition-colors ${
                                    isDirty
                                      ? 'bg-amber-50/50 dark:bg-amber-950/20'
                                      : 'hover:bg-blue-50/40 dark:hover:bg-slate-800/60'
                                  }`}
                                >
                                  {/* Col 1: NO */}
                                  <td className="border border-slate-300 dark:border-slate-700 px-2.5 py-2 text-center font-mono text-slate-700 dark:text-slate-300 align-top">
                                    {idx + 1}
                                  </td>

                                  {/* Col 2: BAHAN PANGAN (Editable) */}
                                  <td className="border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 align-top sticky left-0 z-10 bg-white dark:bg-slate-900">
                                    <input
                                      type="text"
                                      list="rab-pangan-master-options"
                                      value={eff.itemName}
                                      disabled={!canEditRAB}
                                      onChange={e => updatePanganCellDraft(row, 'itemName', e.target.value)}
                                      onKeyDown={e => {
                                        if (e.key === 'Enter' && isDirty) {
                                          e.preventDefault();
                                          handleSavePanganRowDraft(row);
                                        }
                                      }}
                                      placeholder="Nama bahan pangan..."
                                      className="w-full min-w-[190px] px-1.5 py-1 text-xs font-bold rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 bg-transparent text-slate-900 dark:text-white focus:outline-none disabled:opacity-75"
                                    />
                                    <div className="flex flex-wrap items-center gap-1 mt-0.5 px-1.5">
                                      <span className="font-mono text-[10px] font-bold text-[#1E3A8A] dark:text-sky-300">
                                        {row.budgetCode}
                                      </span>
                                      <span className="text-[10px] text-slate-400">
                                        • {formatIndonesianDate(row.planDate)}
                                      </span>
                                    </div>
                                    {row.sourceType === 'menu_planning' && (
                                      <div className="mt-0.5 px-1.5">
                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                          <Link2 className="w-2.5 h-2.5" />
                                          <span>
                                            Menu PLOG: {row.sourceMenuCode || row.sourceMenuLabel || 'Terhubung'}
                                          </span>
                                        </span>
                                      </div>
                                    )}
                                  </td>

                                  {/* Col 3: JUMLAH SASARAN (Editable) */}
                                  <td className="border border-slate-300 dark:border-slate-700 px-2 py-1.5 align-top">
                                    <input
                                      type="number"
                                      min={0}
                                      step="1"
                                      value={eff.sasaran}
                                      disabled={!canEditRAB}
                                      onChange={e => updatePanganCellDraft(row, 'sasaran', e.target.value)}
                                      onKeyDown={e => {
                                        if (e.key === 'Enter' && isDirty) {
                                          e.preventDefault();
                                          handleSavePanganRowDraft(row);
                                        }
                                      }}
                                      className="w-24 mx-auto block px-1.5 py-1 text-center font-mono text-xs tabular-nums rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none disabled:opacity-75"
                                    />
                                  </td>

                                  {/* Col 4: Jumlah (QTY / volume, Editable) */}
                                  <td className="border border-slate-300 dark:border-slate-700 px-2 py-1.5 align-top">
                                    <input
                                      type="number"
                                      min={0}
                                      step="any"
                                      value={eff.volume}
                                      disabled={!canEditRAB}
                                      onChange={e => updatePanganCellDraft(row, 'volume', e.target.value)}
                                      onKeyDown={e => {
                                        if (e.key === 'Enter' && isDirty) {
                                          e.preventDefault();
                                          handleSavePanganRowDraft(row);
                                        }
                                      }}
                                      className="w-24 mx-auto block px-1.5 py-1 text-center font-mono font-bold text-xs tabular-nums rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 bg-transparent text-slate-900 dark:text-white focus:outline-none disabled:opacity-75"
                                    />
                                  </td>

                                  {/* Col 5: Satuan (Editable - Master Satuan & Dimensi Bahan) */}
                                  <td className="border border-slate-300 dark:border-slate-700 px-2 py-1.5 align-top">
                                    <UnitSelectControl
                                      value={eff.unit}
                                      options={unitOptions}
                                      disabled={!canEditRAB}
                                      ariaLabel={`Satuan ${eff.itemName || row.itemName}`}
                                      onChange={val => updatePanganCellDraft(row, 'unit', val)}
                                      onKeyDown={e => {
                                        if (e.key === 'Enter' && isDirty) {
                                          e.preventDefault();
                                          handleSavePanganRowDraft(row);
                                        }
                                      }}
                                      className="w-28 mx-auto block px-1.5 py-1 text-xs font-semibold rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 bg-transparent text-slate-700 dark:text-slate-300 focus:outline-none disabled:opacity-75 cursor-pointer"
                                    />
                                  </td>

                                  {/* Col 6: HARGA DASAR (Editable, right before total Jumlah) */}
                                  <td className="border border-slate-300 dark:border-slate-700 px-2 py-1.5 align-top">
                                    <input
                                      type="number"
                                      min={0}
                                      step="any"
                                      value={eff.unitPrice}
                                      disabled={!canEditRAB}
                                      onChange={e => updatePanganCellDraft(row, 'unitPrice', e.target.value)}
                                      onKeyDown={e => {
                                        if (e.key === 'Enter' && isDirty) {
                                          e.preventDefault();
                                          handleSavePanganRowDraft(row);
                                        }
                                      }}
                                      className="w-28 ml-auto block px-1.5 py-1 text-right font-mono text-xs tabular-nums rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none disabled:opacity-75"
                                    />
                                    <div className="text-[10px] text-right text-slate-400 font-mono px-1.5">
                                      {formatRupiah(eff.unitPrice)}
                                    </div>
                                  </td>

                                  {/* Col 7: Jumlah (Total Harga, Editable & Auto-Calculated) */}
                                  <td className="border border-slate-300 dark:border-slate-700 px-2 py-1.5 align-top">
                                    <input
                                      type="number"
                                      min={0}
                                      step="any"
                                      value={eff.totalBudget}
                                      disabled={!canEditRAB}
                                      onChange={e => updatePanganCellDraft(row, 'totalBudget', e.target.value)}
                                      onKeyDown={e => {
                                        if (e.key === 'Enter' && isDirty) {
                                          e.preventDefault();
                                          handleSavePanganRowDraft(row);
                                        }
                                      }}
                                      className="w-32 ml-auto block px-1.5 py-1 text-right font-mono font-bold text-xs tabular-nums rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 bg-transparent text-slate-900 dark:text-white focus:outline-none disabled:opacity-75"
                                    />
                                    <div className="text-[10px] text-right font-bold text-slate-700 dark:text-slate-300 font-mono px-1.5">
                                      {formatRupiah(eff.totalBudget)}
                                    </div>
                                  </td>

                                  {dynamicRabColumns.map(col => (
                                    <td
                                      key={col.key}
                                      className="border border-slate-300 dark:border-slate-700 px-3 py-2 align-top"
                                    >
                                      {col.render ? col.render(row) : '-'}
                                    </td>
                                  ))}

                                  {/* Status & Actions */}
                                  <td className="border border-slate-300 dark:border-slate-700 px-3 py-2 align-top print:hidden">
                                    <div className="space-y-1.5 min-w-[175px]">
                                      <div className="flex items-center justify-end gap-1">
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
                                      </div>

                                      <div className="text-[10px] font-mono text-slate-600 dark:text-slate-300">
                                        <div className="flex items-center justify-between">
                                          <span>PO: {formatNumber(usedQty)} {eff.unit}</span>
                                          <span className="text-slate-400">({percent.toFixed(0)}%)</span>
                                        </div>
                                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 mt-0.5 overflow-hidden">
                                          <div
                                            className="bg-sky-600 h-full rounded-full"
                                            style={{ width: `${Math.min(100, percent)}%` }}
                                          />
                                        </div>
                                        <div className="text-[9px] text-emerald-600 font-semibold mt-0.5">
                                          Sisa Kuota: {formatNumber(remQty)} {eff.unit}
                                        </div>
                                      </div>

                                      {isDirty && canEditRAB && (
                                        <div className="flex items-center justify-end gap-1 pt-0.5">
                                          <button
                                            type="button"
                                            onClick={() => handleSavePanganRowDraft(row)}
                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#1E3A8A] hover:bg-blue-900 text-white text-[10px] font-bold shadow-xs transition active:scale-[0.98]"
                                            title="Simpan perubahan baris ini"
                                          >
                                            <Save className="w-3 h-3" />
                                            <span>Simpan</span>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleDiscardPanganRowDraft(row.id)}
                                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-semibold transition"
                                            title="Batalkan perubahan belum tersimpan"
                                          >
                                            <RotateCcw className="w-3 h-3" />
                                            <span>Batal</span>
                                          </button>
                                        </div>
                                      )}

                                      <div className="flex flex-wrap items-center justify-end gap-1 pt-0.5">
                                        {canEditRAB && (
                                          <button
                                            type="button"
                                            onClick={() => handleOpenEditRAB(row)}
                                            className="p-1 text-blue-600 hover:text-blue-800 rounded hover:bg-blue-50 dark:hover:bg-blue-950 transition"
                                            title="Edit Detail Lengkap Item RAB"
                                          >
                                            <FileEdit className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                        {(canEditRAB || hasPermission('procurement', 'delete')) && (
                                          <button
                                            type="button"
                                            onClick={() => handleRequestDeleteRAB(row)}
                                            className="p-1 text-[#E11D48] hover:text-rose-700 rounded hover:bg-rose-50 dark:hover:bg-rose-950 transition"
                                            title="Hapus Item RAB"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                        {row.status === 'Menunggu Persetujuan' && hasPermission('procurement', 'approve') && (
                                          <>
                                            <button
                                              type="button"
                                              onClick={() => handleApproveRAB(row.id)}
                                              className="p-1 text-emerald-600 hover:text-emerald-800 rounded hover:bg-emerald-50 dark:hover:bg-emerald-950 transition"
                                              title="Setujui Rencana Anggaran Belanja"
                                            >
                                              <CheckCircle className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleRejectRAB(row.id)}
                                              className="p-1 text-rose-500 hover:text-rose-700 rounded hover:bg-rose-50 dark:hover:bg-rose-950 transition"
                                              title="Tolak Item Anggaran"
                                            >
                                              <Ban className="w-3.5 h-3.5" />
                                            </button>
                                          </>
                                        )}
                                        {row.status === 'Disetujui' && (
                                          <button
                                            type="button"
                                            onClick={() => handleStartPOFromRAB(row)}
                                            className="px-2 py-0.5 bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 hover:bg-sky-100 rounded text-[10px] font-bold inline-flex items-center gap-1 border border-sky-200 dark:border-sky-800 transition"
                                            title="Terbitkan PO dari RAB ini"
                                          >
                                            <ShoppingCart className="w-3 h-3" />
                                            <span>Buat PO</span>
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}

                          {/* Inline Newly Added Editable Rows */}
                          {newPanganRows.map((draft, newIdx) => {
                            const targetPlanDate =
                              filterRABDate !== 'ALL'
                                ? filterRABDate
                                : plogMenuDays[0]?.date || new Date().toISOString().slice(0, 10);

                            return (
                              <tr
                                key={draft.tempId}
                                className="bg-teal-50/50 dark:bg-teal-950/20 transition-colors"
                              >
                                {/* Col 1: NO */}
                                <td className="border border-slate-300 dark:border-slate-700 px-2.5 py-2 text-center font-mono font-bold text-[#0D9488] dark:text-teal-300 align-top">
                                  {rabPanganRows.length + newIdx + 1}
                                </td>

                                {/* Col 2: BAHAN PANGAN */}
                                <td className="border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 align-top sticky left-0 z-10 bg-teal-50/90 dark:bg-slate-900">
                                  <input
                                    type="text"
                                    autoFocus
                                    list="rab-pangan-master-options"
                                    value={draft.itemName}
                                    onChange={e =>
                                      updateNewPanganRowField(draft.tempId, 'itemName', e.target.value)
                                    }
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleSaveNewPanganRow(draft.tempId, newIdx);
                                      }
                                    }}
                                    placeholder="Ketik / pilih nama bahan pangan..."
                                    className="w-full min-w-[190px] px-2 py-1 text-xs font-bold rounded border border-teal-400 dark:border-teal-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                                  />
                                  <div className="flex flex-wrap items-center gap-1.5 mt-1 px-0.5">
                                    <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-teal-100 text-[#0D9488] dark:bg-teal-950 dark:text-teal-300">
                                      Baris Baru
                                    </span>
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                      • {formatIndonesianDate(targetPlanDate)}
                                    </span>
                                  </div>
                                </td>

                                {/* Col 3: JUMLAH SASARAN */}
                                <td className="border border-slate-300 dark:border-slate-700 px-2 py-1.5 align-top">
                                  <input
                                    type="number"
                                    min={0}
                                    step="1"
                                    value={draft.sasaran}
                                    onChange={e =>
                                      updateNewPanganRowField(draft.tempId, 'sasaran', e.target.value)
                                    }
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleSaveNewPanganRow(draft.tempId, newIdx);
                                      }
                                    }}
                                    className="w-24 mx-auto block px-1.5 py-1 text-center font-mono text-xs tabular-nums rounded border border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                                  />
                                </td>

                                {/* Col 4: Jumlah (QTY / volume) */}
                                <td className="border border-slate-300 dark:border-slate-700 px-2 py-1.5 align-top">
                                  <input
                                    type="number"
                                    min={0}
                                    step="any"
                                    value={draft.volume}
                                    onChange={e =>
                                      updateNewPanganRowField(draft.tempId, 'volume', e.target.value)
                                    }
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleSaveNewPanganRow(draft.tempId, newIdx);
                                      }
                                    }}
                                    className="w-24 mx-auto block px-1.5 py-1 text-center font-mono font-bold text-xs tabular-nums rounded border border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                                  />
                                </td>

                                {/* Col 5: Satuan (Master Satuan & Dimensi Bahan) */}
                                <td className="border border-slate-300 dark:border-slate-700 px-2 py-1.5 align-top">
                                  <UnitSelectControl
                                    value={draft.unit}
                                    options={unitOptions}
                                    ariaLabel={`Satuan baris baru ${draft.itemName || 'bahan pangan'}`}
                                    onChange={val =>
                                      updateNewPanganRowField(draft.tempId, 'unit', val)
                                    }
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleSaveNewPanganRow(draft.tempId, newIdx);
                                      }
                                    }}
                                    className="w-28 mx-auto block px-1.5 py-1 text-xs font-semibold rounded border border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500/30 cursor-pointer"
                                  />
                                </td>

                                {/* Col 6: HARGA DASAR */}
                                <td className="border border-slate-300 dark:border-slate-700 px-2 py-1.5 align-top">
                                  <input
                                    type="number"
                                    min={0}
                                    step="any"
                                    value={draft.unitPrice}
                                    onChange={e =>
                                      updateNewPanganRowField(draft.tempId, 'unitPrice', e.target.value)
                                    }
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleSaveNewPanganRow(draft.tempId, newIdx);
                                      }
                                    }}
                                    className="w-28 ml-auto block px-1.5 py-1 text-right font-mono text-xs tabular-nums rounded border border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                                  />
                                  <div className="text-[10px] text-right text-slate-400 font-mono px-1.5">
                                    {formatRupiah(draft.unitPrice)}
                                  </div>
                                </td>

                                {/* Col 7: Jumlah (Total Harga) */}
                                <td className="border border-slate-300 dark:border-slate-700 px-2 py-1.5 align-top">
                                  <input
                                    type="number"
                                    min={0}
                                    step="any"
                                    value={draft.totalBudget}
                                    onChange={e =>
                                      updateNewPanganRowField(draft.tempId, 'totalBudget', e.target.value)
                                    }
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleSaveNewPanganRow(draft.tempId, newIdx);
                                      }
                                    }}
                                    className="w-32 ml-auto block px-1.5 py-1 text-right font-mono font-bold text-xs tabular-nums rounded border border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                                  />
                                  <div className="text-[10px] text-right font-bold text-slate-700 dark:text-slate-300 font-mono px-1.5">
                                    {formatRupiah(draft.totalBudget)}
                                  </div>
                                </td>

                                {dynamicRabColumns.map(col => (
                                  <td
                                    key={col.key}
                                    className="border border-slate-300 dark:border-slate-700 px-3 py-2 align-top text-slate-400"
                                  >
                                    -
                                  </td>
                                ))}

                                {/* Col Aksi */}
                                <td className="border border-slate-300 dark:border-slate-700 px-3 py-2 align-top print:hidden">
                                  <div className="flex items-center justify-end gap-1.5 min-w-[175px]">
                                    <button
                                      type="button"
                                      onClick={() => handleSaveNewPanganRow(draft.tempId, newIdx)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#1E3A8A] hover:bg-blue-900 text-white text-[11px] font-bold shadow-xs transition active:scale-[0.98] cursor-pointer"
                                      title="Simpan baris bahan pangan baru"
                                    >
                                      <Save className="w-3 h-3" />
                                      <span>Simpan</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveNewPanganRow(draft.tempId)}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-rose-50 hover:bg-rose-100 text-[#E11D48] dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[11px] font-bold transition active:scale-[0.98] cursor-pointer"
                                      title="Batalkan & hapus baris baru ini"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      <span>Hapus</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}

                          {/* Inline "+ Tambah Baris" Row inside Rincian Daftar Belanja (RAB) Bahan Pangan */}
                          {canAddPanganRow && (
                            <tr className="bg-slate-50/70 dark:bg-slate-800/40 print:hidden">
                              <td
                                colSpan={8 + dynamicRabColumns.length}
                                className="border border-slate-300 dark:border-slate-700 px-3 py-2"
                              >
                                <button
                                  type="button"
                                  onClick={handleAddNewPanganRow}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-teal-50 dark:bg-slate-900 dark:hover:bg-teal-950/60 text-[#0D9488] dark:text-teal-300 border border-dashed border-teal-400 dark:border-teal-700 text-xs font-bold transition active:scale-[0.98] cursor-pointer shadow-2xs"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Tambah Baris Bahan Pangan</span>
                                </button>
                                <span className="ml-2.5 text-[11px] text-slate-500 dark:text-slate-400">
                                  Tambahkan item bahan pangan langsung di tabel lalu isi &amp; klik Simpan
                                </span>
                              </td>
                            </tr>
                          )}
                        </tbody>

                        {/* Footer Summary Rows */}
                        <tfoot>
                          <tr className="bg-white dark:bg-slate-900 font-extrabold text-slate-900 dark:text-white">
                            <td
                              colSpan={6}
                              className="border border-slate-300 dark:border-slate-700 px-3 py-2 text-center uppercase text-xs"
                            >
                              TOTAL KESELURUHAN
                            </td>
                            <td className="border border-slate-300 dark:border-slate-700 px-3 py-2 text-right font-mono tabular-nums whitespace-nowrap">
                              {formatRupiah(totalKeseluruhanPangan)}
                            </td>
                            <td
                              colSpan={trailingColsCount}
                              className="border border-slate-300 dark:border-slate-700 px-3 py-2 bg-slate-50/40 dark:bg-slate-800/30"
                            />
                          </tr>
                          <tr className="bg-white dark:bg-slate-900 font-extrabold text-slate-900 dark:text-white">
                            <td
                              colSpan={6}
                              className="border border-slate-300 dark:border-slate-700 px-3 py-2 text-center uppercase text-xs"
                            >
                              TOTAL PER SASARAN
                            </td>
                            <td className="border border-slate-300 dark:border-slate-700 px-3 py-2 text-right font-mono tabular-nums whitespace-nowrap">
                              {formatRupiah(totalPerSasaranPangan)}
                            </td>
                            <td
                              colSpan={trailingColsCount}
                              className="border border-slate-300 dark:border-slate-700 px-3 py-2 bg-slate-50/40 dark:bg-slate-800/30 text-[10px] font-normal text-slate-500"
                            >
                              Kalkulasi: Total Keseluruhan ÷ {formatNumber(rabTargetMetrics.totalSasaran)} sasaran
                            </td>
                          </tr>
                          <tr className="bg-white dark:bg-slate-900 font-extrabold text-slate-900 dark:text-white">
                            <td
                              colSpan={6}
                              className="border border-slate-300 dark:border-slate-700 px-3 py-2 text-center uppercase text-xs"
                            >
                              PAGU HARGA BELANJA HARIAN
                            </td>
                            <td className="border border-slate-300 dark:border-slate-700 px-3 py-2 text-right font-mono tabular-nums whitespace-nowrap">
                              {editingPaguTarget === 'pangan' ? (
                                <div className="flex items-center justify-end gap-1">
                                  <input
                                    type="number"
                                    min={0}
                                    value={paguDraftInput}
                                    onChange={e => setPaguDraftInput(e.target.value)}
                                    className="w-28 px-2 py-1 text-xs font-mono font-bold rounded border border-blue-400 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      savePaguHarian('pangan', Math.max(0, Number(paguDraftInput) || 0))
                                    }
                                    className="p-1 rounded bg-[#1E3A8A] text-white"
                                    title="Simpan Pagu Harian"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingPaguTarget(null)}
                                    className="p-1 rounded bg-slate-200 text-slate-700"
                                    title="Batal"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <div className="inline-flex items-center justify-end gap-1.5">
                                  <span>{formatRupiah(rabTargetMetrics.paguPangan)}</span>
                                  {canEditRAB && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingPaguTarget('pangan');
                                        setPaguDraftInput(String(rabTargetMetrics.paguPangan));
                                      }}
                                      className="p-0.5 text-slate-400 hover:text-[#1E3A8A] print:hidden"
                                      title="Edit Pagu Harga Belanja Harian Bahan Pangan"
                                    >
                                      <FileEdit className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                            <td
                              colSpan={trailingColsCount}
                              className="border border-slate-300 dark:border-slate-700 px-3 py-2 bg-slate-50/40 dark:bg-slate-800/30 text-[10px] font-normal text-slate-500"
                            >
                              {typeof paguHarianConfig.pangan === 'number' ? (
                                <button
                                  type="button"
                                  onClick={() => savePaguHarian('pangan', null)}
                                  className="text-[10px] font-bold text-[#0D9488] hover:underline print:hidden"
                                >
                                  Reset ke Standar Pagu BGN ({formatRupiah(rabTargetMetrics.defaultPaguPangan)})
                                </button>
                              ) : (
                                <span>Otomatis dari Pagu Porsi Kecil/Besar BGN</span>
                              )}
                            </td>
                          </tr>
                          <tr className="font-extrabold">
                            <td
                              colSpan={6}
                              className="border border-slate-300 dark:border-slate-700 px-3 py-2 text-center uppercase text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                            >
                              SISA
                            </td>
                            <td
                              className={`border border-slate-300 dark:border-slate-700 px-3 py-2 text-right font-mono tabular-nums whitespace-nowrap ${
                                sisaPangan >= 0
                                  ? 'bg-[#92D050] text-slate-900'
                                  : 'bg-rose-200 text-rose-900'
                              }`}
                            >
                              {formatRupiah(sisaPangan)}
                            </td>
                            <td
                              colSpan={trailingColsCount}
                              className="border border-slate-300 dark:border-slate-700 px-3 py-2 bg-slate-50/40 dark:bg-slate-800/30 text-[10px] font-normal text-slate-500"
                            >
                              {sisaPangan >= 0
                                ? 'Surplus / masih di bawah Pagu Belanja Harian'
                                : 'Defisit / melebihi Pagu Belanja Harian'}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                );
              })()}

              {/* =============================================================== */}
              {/* FORMAT 2: RAB OPERASIONAL                                       */}
              {/* =============================================================== */}
              {(filterRABCategory === 'ALL' || filterRABCategory === 'RAB Operasional') && (() => {
                const canEditRAB = hasPermission('procurement', 'edit');
                const canAddOperasionalRow = hasPermission('procurement', 'create') || canEditRAB;
                const totalKeseluruhanOperasional =
                  rabOperasionalRows.reduce(
                    (acc, r) => acc + (Number(getOperasionalEffectiveRowValues(r).totalBudget) || 0),
                    0
                  ) +
                  newOperasionalRows.reduce((acc, r) => acc + (Number(r.totalBudget) || 0), 0);
                const totalPerSasaranOperasional =
                  rabTargetMetrics.totalSasaran > 0
                    ? Math.round(totalKeseluruhanOperasional / rabTargetMetrics.totalSasaran)
                    : 0;
                const sisaOperasional =
                  rabTargetMetrics.paguOperasional - totalKeseluruhanOperasional;
                const trailingColsCount = 1 + dynamicRabColumns.length;
                const dirtyOperasionalCount =
                  Object.keys(operasionalRowDrafts).length + newOperasionalRows.length;

                return (
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-700 shadow-sm overflow-hidden print:shadow-none">
                    <div className="px-4 py-2.5 bg-[#C6E0B4] dark:bg-emerald-950/70 border-b border-slate-300 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-emerald-100">
                          OPERASIONAL ({rabOperasionalRows.length} Item)
                          {filterRABDate !== 'ALL' && !rabOperasionalResult.isFallbackAllDates
                            ? ` — ${formatIndonesianDate(filterRABDate)}`
                            : ''}
                        </span>
                        {rabOperasionalResult.isFallbackAllDates && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white/70 dark:bg-slate-900/60 text-slate-700 dark:text-emerald-200 border border-emerald-700/20">
                            Menampilkan daftar RAB Operasional aktif
                          </span>
                        )}
                        {canEditRAB && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white/80 dark:bg-slate-900/70 text-slate-700 dark:text-emerald-200 border border-emerald-700/20">
                            Klik langsung tiap kolom untuk edit manual
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {canAddOperasionalRow && (
                          <button
                            type="button"
                            onClick={handleAddNewOperasionalRow}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0D9488] hover:bg-teal-700 text-white text-[11px] font-bold shadow-xs transition active:scale-[0.98] print:hidden cursor-pointer"
                            title="Tambahkan baris operasional baru langsung di tabel"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Tambah Baris</span>
                          </button>
                        )}
                        {canAddOperasionalRow && dirtyOperasionalCount > 0 && (
                          <button
                            type="button"
                            onClick={handleSaveAllOperasionalDrafts}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1E3A8A] hover:bg-blue-900 text-white text-[11px] font-bold shadow-xs transition active:scale-[0.98] print:hidden cursor-pointer"
                          >
                            <Save className="w-3 h-3" />
                            <span>Simpan Semua ({dirtyOperasionalCount})</span>
                          </button>
                        )}
                        <span className="text-[11px] font-bold text-slate-700 dark:text-emerald-200 font-mono">
                          Target Sasaran Aktif: {formatNumber(rabTargetMetrics.totalSasaran)} Porsi
                        </span>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-xs">
                        <thead>
                          {/* Numbered Spreadsheet Column Strip (1..7) */}
                          <tr className="bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300 text-center">
                            <th className="border border-slate-300 dark:border-slate-700 px-2 py-1 w-10">1</th>
                            <th className="border border-slate-300 dark:border-slate-700 px-2 py-1 sticky left-0 z-10 bg-slate-100 dark:bg-slate-800">2</th>
                            <th className="border border-slate-300 dark:border-slate-700 px-2 py-1">3</th>
                            <th className="border border-slate-300 dark:border-slate-700 px-2 py-1">4</th>
                            <th className="border border-slate-300 dark:border-slate-700 px-2 py-1">5</th>
                            <th className="border border-slate-300 dark:border-slate-700 px-2 py-1">6</th>
                            <th className="border border-slate-300 dark:border-slate-700 px-2 py-1">7</th>
                            {dynamicRabColumns.map((col, idx) => (
                              <th
                                key={col.key}
                                className="border border-slate-300 dark:border-slate-700 px-2 py-1"
                              >
                                {8 + idx}
                              </th>
                            ))}
                            <th className="border border-slate-300 dark:border-slate-700 px-2 py-1 print:hidden">
                              Aksi
                            </th>
                          </tr>

                          {/* Main Olive Green Column Headers Matching RAB Bahan Pangan */}
                          <tr className="bg-[#548235] dark:bg-emerald-900 text-white text-[11px] font-extrabold tracking-wide">
                            <th className="border border-slate-400/70 dark:border-slate-700 px-2.5 py-2 text-center w-10">
                              NO
                            </th>
                            <th className="border border-slate-400/70 dark:border-slate-700 px-3 py-2 text-left min-w-[230px] sticky left-0 z-10 bg-[#548235] dark:bg-emerald-900">
                              URAIAN
                            </th>
                            <th className="border border-slate-400/70 dark:border-slate-700 px-3 py-2 text-center whitespace-nowrap">
                              JUMLAH SASARAN
                            </th>
                            <th className="border border-slate-400/70 dark:border-slate-700 px-3 py-2 text-center whitespace-nowrap">
                              Jumlah
                            </th>
                            <th className="border border-slate-400/70 dark:border-slate-700 px-3 py-2 text-center whitespace-nowrap">
                              Satuan
                            </th>
                            <th className="border border-slate-400/70 dark:border-slate-700 px-3 py-2 text-right whitespace-nowrap">
                              HARGA DASAR
                            </th>
                            <th className="border border-slate-400/70 dark:border-slate-700 px-3 py-2 text-right whitespace-nowrap">
                              Jumlah
                            </th>
                            {dynamicRabColumns.map(col => (
                              <th
                                key={col.key}
                                className="border border-slate-400/70 dark:border-slate-700 px-3 py-2 text-left whitespace-nowrap"
                              >
                                {col.header}
                              </th>
                            ))}
                            <th className="border border-slate-400/70 dark:border-slate-700 px-3 py-2 text-right whitespace-nowrap print:hidden">
                              Status & Aksi Otorisasi / PO
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {rabOperasionalRows.length === 0 && newOperasionalRows.length === 0 ? (
                            <tr>
                              <td
                                colSpan={8 + dynamicRabColumns.length}
                                className="border border-slate-300 dark:border-slate-700 px-4 py-6 text-center text-xs text-slate-500 italic"
                              >
                                Belum ada item RAB Operasional untuk filter yang dipilih.
                              </td>
                            </tr>
                          ) : (
                            rabOperasionalRows.map((row, idx) => {
                              const eff = getOperasionalEffectiveRowValues(row);
                              const isDirty = Boolean(operasionalRowDrafts[row.id]);
                              const usedQty = row.poCreatedQuantity || 0;
                              const remQty = Math.max(0, eff.volume - usedQty);
                              const percent = eff.volume > 0 ? (usedQty / eff.volume) * 100 : 0;

                              return (
                                <tr
                                  key={row.id}
                                  className={`transition-colors ${
                                    isDirty
                                      ? 'bg-amber-50/50 dark:bg-amber-950/20'
                                      : 'hover:bg-blue-50/40 dark:hover:bg-slate-800/60'
                                  }`}
                                >
                                  {/* Col 1: NO */}
                                  <td className="border border-slate-300 dark:border-slate-700 px-2.5 py-2 text-center font-mono text-slate-700 dark:text-slate-300 align-top">
                                    {idx + 1}
                                  </td>

                                  {/* Col 2: URAIAN (Editable) */}
                                  <td className="border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 align-top sticky left-0 z-10 bg-white dark:bg-slate-900">
                                    <input
                                      type="text"
                                      list="rab-operasional-master-options"
                                      value={eff.itemName}
                                      disabled={!canEditRAB}
                                      onChange={e =>
                                        updateOperasionalCellDraft(row, 'itemName', e.target.value)
                                      }
                                      onKeyDown={e => {
                                        if (e.key === 'Enter' && isDirty) {
                                          e.preventDefault();
                                          handleSaveOperasionalRowDraft(row);
                                        }
                                      }}
                                      placeholder="Uraian biaya operasional..."
                                      className="w-full min-w-[190px] px-1.5 py-1 text-xs font-bold rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 bg-transparent text-slate-900 dark:text-white focus:outline-none disabled:opacity-75"
                                    />
                                    <div className="flex flex-wrap items-center gap-1 mt-0.5 px-1.5">
                                      <span className="font-mono text-[10px] font-bold text-[#1E3A8A] dark:text-sky-300">
                                        {row.budgetCode}
                                      </span>
                                      <span className="text-[10px] text-slate-400">
                                        • {formatIndonesianDate(row.planDate)}
                                      </span>
                                    </div>
                                    {row.notes && (
                                      <div className="text-[10px] text-slate-500 italic mt-0.5 px-1.5 max-w-[260px] truncate">
                                        "{row.notes}"
                                      </div>
                                    )}
                                  </td>

                                  {/* Col 3: JUMLAH SASARAN (Editable) */}
                                  <td className="border border-slate-300 dark:border-slate-700 px-2 py-1.5 align-top">
                                    <input
                                      type="number"
                                      min={0}
                                      step="1"
                                      value={eff.sasaran}
                                      disabled={!canEditRAB}
                                      onChange={e =>
                                        updateOperasionalCellDraft(row, 'sasaran', e.target.value)
                                      }
                                      onKeyDown={e => {
                                        if (e.key === 'Enter' && isDirty) {
                                          e.preventDefault();
                                          handleSaveOperasionalRowDraft(row);
                                        }
                                      }}
                                      className="w-24 mx-auto block px-1.5 py-1 text-center font-mono text-xs tabular-nums rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none disabled:opacity-75"
                                    />
                                  </td>

                                  {/* Col 4: Jumlah (QTY / volume, Editable) */}
                                  <td className="border border-slate-300 dark:border-slate-700 px-2 py-1.5 align-top">
                                    <input
                                      type="number"
                                      min={0}
                                      step="any"
                                      value={eff.volume}
                                      disabled={!canEditRAB}
                                      onChange={e =>
                                        updateOperasionalCellDraft(row, 'volume', e.target.value)
                                      }
                                      onKeyDown={e => {
                                        if (e.key === 'Enter' && isDirty) {
                                          e.preventDefault();
                                          handleSaveOperasionalRowDraft(row);
                                        }
                                      }}
                                      className="w-24 mx-auto block px-1.5 py-1 text-center font-mono font-bold text-xs tabular-nums rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 bg-transparent text-slate-900 dark:text-white focus:outline-none disabled:opacity-75"
                                    />
                                  </td>

                                  {/* Col 5: Satuan (Editable - Master Satuan & Dimensi Bahan) */}
                                  <td className="border border-slate-300 dark:border-slate-700 px-2 py-1.5 align-top">
                                    <UnitSelectControl
                                      value={eff.unit}
                                      options={unitOptions}
                                      disabled={!canEditRAB}
                                      ariaLabel={`Satuan ${eff.itemName || row.itemName}`}
                                      onChange={val =>
                                        updateOperasionalCellDraft(row, 'unit', val)
                                      }
                                      onKeyDown={e => {
                                        if (e.key === 'Enter' && isDirty) {
                                          e.preventDefault();
                                          handleSaveOperasionalRowDraft(row);
                                        }
                                      }}
                                      className="w-28 mx-auto block px-1.5 py-1 text-xs font-semibold rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 bg-transparent text-slate-700 dark:text-slate-300 focus:outline-none disabled:opacity-75 cursor-pointer"
                                    />
                                  </td>

                                  {/* Col 6: HARGA DASAR (Editable) */}
                                  <td className="border border-slate-300 dark:border-slate-700 px-2 py-1.5 align-top">
                                    <input
                                      type="number"
                                      min={0}
                                      step="any"
                                      value={eff.unitPrice}
                                      disabled={!canEditRAB}
                                      onChange={e =>
                                        updateOperasionalCellDraft(row, 'unitPrice', e.target.value)
                                      }
                                      onKeyDown={e => {
                                        if (e.key === 'Enter' && isDirty) {
                                          e.preventDefault();
                                          handleSaveOperasionalRowDraft(row);
                                        }
                                      }}
                                      className="w-28 ml-auto block px-1.5 py-1 text-right font-mono text-xs tabular-nums rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none disabled:opacity-75"
                                    />
                                    <div className="text-[10px] text-right text-slate-400 font-mono px-1.5">
                                      {formatRupiah(eff.unitPrice)}
                                    </div>
                                  </td>

                                  {/* Col 7: Jumlah (Total Harga, Editable & Auto-Calculated) */}
                                  <td className="border border-slate-300 dark:border-slate-700 px-2 py-1.5 align-top">
                                    <input
                                      type="number"
                                      min={0}
                                      step="any"
                                      value={eff.totalBudget}
                                      disabled={!canEditRAB}
                                      onChange={e =>
                                        updateOperasionalCellDraft(
                                          row,
                                          'totalBudget',
                                          e.target.value
                                        )
                                      }
                                      onKeyDown={e => {
                                        if (e.key === 'Enter' && isDirty) {
                                          e.preventDefault();
                                          handleSaveOperasionalRowDraft(row);
                                        }
                                      }}
                                      className="w-32 ml-auto block px-1.5 py-1 text-right font-mono font-bold text-xs tabular-nums rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 bg-transparent text-slate-900 dark:text-white focus:outline-none disabled:opacity-75"
                                    />
                                    <div className="text-[10px] text-right font-bold text-slate-700 dark:text-slate-300 font-mono px-1.5">
                                      {formatRupiah(eff.totalBudget)}
                                    </div>
                                  </td>

                                  {dynamicRabColumns.map(col => (
                                    <td
                                      key={col.key}
                                      className="border border-slate-300 dark:border-slate-700 px-3 py-2 align-top"
                                    >
                                      {col.render ? col.render(row) : '-'}
                                    </td>
                                  ))}

                                  {/* Status & Actions */}
                                  <td className="border border-slate-300 dark:border-slate-700 px-3 py-2 align-top print:hidden">
                                    <div className="space-y-1.5 min-w-[175px]">
                                      <div className="flex items-center justify-end gap-1">
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
                                      </div>

                                      <div className="text-[10px] font-mono text-slate-600 dark:text-slate-300">
                                        <div className="flex items-center justify-between">
                                          <span>PO: {formatNumber(usedQty)} {eff.unit}</span>
                                          <span className="text-slate-400">({percent.toFixed(0)}%)</span>
                                        </div>
                                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 mt-0.5 overflow-hidden">
                                          <div
                                            className="bg-sky-600 h-full rounded-full"
                                            style={{ width: `${Math.min(100, percent)}%` }}
                                          />
                                        </div>
                                        <div className="text-[9px] text-emerald-600 font-semibold mt-0.5">
                                          Sisa Kuota: {formatNumber(remQty)} {eff.unit}
                                        </div>
                                      </div>

                                      {isDirty && canEditRAB && (
                                        <div className="flex items-center justify-end gap-1 pt-0.5">
                                          <button
                                            type="button"
                                            onClick={() => handleSaveOperasionalRowDraft(row)}
                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#1E3A8A] hover:bg-blue-900 text-white text-[10px] font-bold shadow-xs transition active:scale-[0.98]"
                                            title="Simpan perubahan baris ini"
                                          >
                                            <Save className="w-3 h-3" />
                                            <span>Simpan</span>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleDiscardOperasionalRowDraft(row.id)}
                                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-semibold transition"
                                            title="Batalkan perubahan belum tersimpan"
                                          >
                                            <RotateCcw className="w-3 h-3" />
                                            <span>Batal</span>
                                          </button>
                                        </div>
                                      )}

                                      <div className="flex flex-wrap items-center justify-end gap-1 pt-0.5">
                                        {canEditRAB && (
                                          <button
                                            type="button"
                                            onClick={() => handleOpenEditRAB(row)}
                                            className="p-1 text-blue-600 hover:text-blue-800 rounded hover:bg-blue-50 dark:hover:bg-blue-950 transition"
                                            title="Edit Detail Lengkap Item RAB"
                                          >
                                            <FileEdit className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                        {(canEditRAB || hasPermission('procurement', 'delete')) && (
                                          <button
                                            type="button"
                                            onClick={() => handleRequestDeleteRAB(row)}
                                            className="p-1 text-[#E11D48] hover:text-rose-700 rounded hover:bg-rose-50 dark:hover:bg-rose-950 transition"
                                            title="Hapus Item RAB"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                        {row.status === 'Menunggu Persetujuan' && hasPermission('procurement', 'approve') && (
                                          <>
                                            <button
                                              type="button"
                                              onClick={() => handleApproveRAB(row.id)}
                                              className="p-1 text-emerald-600 hover:text-emerald-800 rounded hover:bg-emerald-50 dark:hover:bg-emerald-950 transition"
                                              title="Setujui Rencana Anggaran Belanja"
                                            >
                                              <CheckCircle className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleRejectRAB(row.id)}
                                              className="p-1 text-rose-500 hover:text-rose-700 rounded hover:bg-rose-50 dark:hover:bg-rose-950 transition"
                                              title="Tolak Item Anggaran"
                                            >
                                              <Ban className="w-3.5 h-3.5" />
                                            </button>
                                          </>
                                        )}
                                        {row.status === 'Disetujui' && (
                                          <button
                                            type="button"
                                            onClick={() => handleStartPOFromRAB(row)}
                                            className="px-2 py-0.5 bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 hover:bg-sky-100 rounded text-[10px] font-bold inline-flex items-center gap-1 border border-sky-200 dark:border-sky-800 transition"
                                            title="Terbitkan PO dari RAB ini"
                                          >
                                            <ShoppingCart className="w-3 h-3" />
                                            <span>Buat PO</span>
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}

                          {/* Inline Newly Added Editable Operasional Rows */}
                          {newOperasionalRows.map((draft, newIdx) => {
                            const targetPlanDate =
                              filterRABDate !== 'ALL'
                                ? filterRABDate
                                : plogMenuDays[0]?.date || new Date().toISOString().slice(0, 10);

                            return (
                              <tr
                                key={draft.tempId}
                                className="bg-teal-50/50 dark:bg-teal-950/20 transition-colors"
                              >
                                {/* Col 1: NO */}
                                <td className="border border-slate-300 dark:border-slate-700 px-2.5 py-2 text-center font-mono font-bold text-[#0D9488] dark:text-teal-300 align-top">
                                  {rabOperasionalRows.length + newIdx + 1}
                                </td>

                                {/* Col 2: URAIAN */}
                                <td className="border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 align-top sticky left-0 z-10 bg-teal-50/90 dark:bg-slate-900">
                                  <input
                                    type="text"
                                    autoFocus
                                    list="rab-operasional-master-options"
                                    value={draft.itemName}
                                    onChange={e =>
                                      updateNewOperasionalRowField(
                                        draft.tempId,
                                        'itemName',
                                        e.target.value
                                      )
                                    }
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleSaveNewOperasionalRow(draft.tempId, newIdx);
                                      }
                                    }}
                                    placeholder="Ketik / pilih uraian operasional..."
                                    className="w-full min-w-[190px] px-2 py-1 text-xs font-bold rounded border border-teal-400 dark:border-teal-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                                  />
                                  <div className="flex flex-wrap items-center gap-1.5 mt-1 px-0.5">
                                    <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-teal-100 text-[#0D9488] dark:bg-teal-950 dark:text-teal-300">
                                      Baris Baru
                                    </span>
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                      • {formatIndonesianDate(targetPlanDate)}
                                    </span>
                                  </div>
                                </td>

                                {/* Col 3: JUMLAH SASARAN */}
                                <td className="border border-slate-300 dark:border-slate-700 px-2 py-1.5 align-top">
                                  <input
                                    type="number"
                                    min={0}
                                    step="1"
                                    value={draft.sasaran}
                                    onChange={e =>
                                      updateNewOperasionalRowField(
                                        draft.tempId,
                                        'sasaran',
                                        e.target.value
                                      )
                                    }
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleSaveNewOperasionalRow(draft.tempId, newIdx);
                                      }
                                    }}
                                    className="w-24 mx-auto block px-1.5 py-1 text-center font-mono text-xs tabular-nums rounded border border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                                  />
                                </td>

                                {/* Col 4: Jumlah (QTY / volume) */}
                                <td className="border border-slate-300 dark:border-slate-700 px-2 py-1.5 align-top">
                                  <input
                                    type="number"
                                    min={0}
                                    step="any"
                                    value={draft.volume}
                                    onChange={e =>
                                      updateNewOperasionalRowField(
                                        draft.tempId,
                                        'volume',
                                        e.target.value
                                      )
                                    }
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleSaveNewOperasionalRow(draft.tempId, newIdx);
                                      }
                                    }}
                                    className="w-24 mx-auto block px-1.5 py-1 text-center font-mono font-bold text-xs tabular-nums rounded border border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                                  />
                                </td>

                                {/* Col 5: Satuan (Master Satuan & Dimensi Bahan) */}
                                <td className="border border-slate-300 dark:border-slate-700 px-2 py-1.5 align-top">
                                  <UnitSelectControl
                                    value={draft.unit}
                                    options={unitOptions}
                                    ariaLabel={`Satuan baris baru ${draft.itemName || 'operasional'}`}
                                    onChange={val =>
                                      updateNewOperasionalRowField(draft.tempId, 'unit', val)
                                    }
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleSaveNewOperasionalRow(draft.tempId, newIdx);
                                      }
                                    }}
                                    className="w-28 mx-auto block px-1.5 py-1 text-xs font-semibold rounded border border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500/30 cursor-pointer"
                                  />
                                </td>

                                {/* Col 6: HARGA DASAR */}
                                <td className="border border-slate-300 dark:border-slate-700 px-2 py-1.5 align-top">
                                  <input
                                    type="number"
                                    min={0}
                                    step="any"
                                    value={draft.unitPrice}
                                    onChange={e =>
                                      updateNewOperasionalRowField(
                                        draft.tempId,
                                        'unitPrice',
                                        e.target.value
                                      )
                                    }
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleSaveNewOperasionalRow(draft.tempId, newIdx);
                                      }
                                    }}
                                    className="w-28 ml-auto block px-1.5 py-1 text-right font-mono text-xs tabular-nums rounded border border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                                  />
                                  <div className="text-[10px] text-right text-slate-400 font-mono px-1.5">
                                    {formatRupiah(draft.unitPrice)}
                                  </div>
                                </td>

                                {/* Col 7: Jumlah (Total Harga) */}
                                <td className="border border-slate-300 dark:border-slate-700 px-2 py-1.5 align-top">
                                  <input
                                    type="number"
                                    min={0}
                                    step="any"
                                    value={draft.totalBudget}
                                    onChange={e =>
                                      updateNewOperasionalRowField(
                                        draft.tempId,
                                        'totalBudget',
                                        e.target.value
                                      )
                                    }
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleSaveNewOperasionalRow(draft.tempId, newIdx);
                                      }
                                    }}
                                    className="w-32 ml-auto block px-1.5 py-1 text-right font-mono font-bold text-xs tabular-nums rounded border border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                                  />
                                  <div className="text-[10px] text-right font-bold text-slate-700 dark:text-slate-300 font-mono px-1.5">
                                    {formatRupiah(draft.totalBudget)}
                                  </div>
                                </td>

                                {dynamicRabColumns.map(col => (
                                  <td
                                    key={col.key}
                                    className="border border-slate-300 dark:border-slate-700 px-3 py-2 align-top text-slate-400"
                                  >
                                    -
                                  </td>
                                ))}

                                {/* Col Aksi */}
                                <td className="border border-slate-300 dark:border-slate-700 px-3 py-2 align-top print:hidden">
                                  <div className="flex items-center justify-end gap-1.5 min-w-[175px]">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleSaveNewOperasionalRow(draft.tempId, newIdx)
                                      }
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#1E3A8A] hover:bg-blue-900 text-white text-[11px] font-bold shadow-xs transition active:scale-[0.98] cursor-pointer"
                                      title="Simpan baris operasional baru"
                                    >
                                      <Save className="w-3 h-3" />
                                      <span>Simpan</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveNewOperasionalRow(draft.tempId)}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-rose-50 hover:bg-rose-100 text-[#E11D48] dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[11px] font-bold transition active:scale-[0.98] cursor-pointer"
                                      title="Batalkan & hapus baris baru ini"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      <span>Hapus</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}

                          {/* Inline "+ Tambah Baris" Row inside Rincian Daftar Belanja (RAB) Operasional */}
                          {canAddOperasionalRow && (
                            <tr className="bg-slate-50/70 dark:bg-slate-800/40 print:hidden">
                              <td
                                colSpan={8 + dynamicRabColumns.length}
                                className="border border-slate-300 dark:border-slate-700 px-3 py-2"
                              >
                                <button
                                  type="button"
                                  onClick={handleAddNewOperasionalRow}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-teal-50 dark:bg-slate-900 dark:hover:bg-teal-950/60 text-[#0D9488] dark:text-teal-300 border border-dashed border-teal-400 dark:border-teal-700 text-xs font-bold transition active:scale-[0.98] cursor-pointer shadow-2xs"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Tambah Baris Operasional</span>
                                </button>
                                <span className="ml-2.5 text-[11px] text-slate-500 dark:text-slate-400">
                                  Tambahkan item biaya operasional langsung di tabel lalu isi &amp; klik Simpan
                                </span>
                              </td>
                            </tr>
                          )}
                        </tbody>

                        {/* Footer Summary Rows Matching Format Bahan Pangan */}
                        <tfoot>
                          <tr className="bg-white dark:bg-slate-900 font-extrabold text-slate-900 dark:text-white">
                            <td
                              colSpan={6}
                              className="border border-slate-300 dark:border-slate-700 px-3 py-2 text-center uppercase text-xs"
                            >
                              TOTAL KESELURUHAN
                            </td>
                            <td className="border border-slate-300 dark:border-slate-700 px-3 py-2 text-right font-mono tabular-nums whitespace-nowrap">
                              {formatRupiah(totalKeseluruhanOperasional)}
                            </td>
                            <td
                              colSpan={trailingColsCount}
                              className="border border-slate-300 dark:border-slate-700 px-3 py-2 bg-slate-50/40 dark:bg-slate-800/30"
                            />
                          </tr>
                          <tr className="bg-white dark:bg-slate-900 font-extrabold text-slate-900 dark:text-white">
                            <td
                              colSpan={6}
                              className="border border-slate-300 dark:border-slate-700 px-3 py-2 text-center uppercase text-xs"
                            >
                              TOTAL PER SASARAN
                            </td>
                            <td className="border border-slate-300 dark:border-slate-700 px-3 py-2 text-right font-mono tabular-nums whitespace-nowrap">
                              {formatRupiah(totalPerSasaranOperasional)}
                            </td>
                            <td
                              colSpan={trailingColsCount}
                              className="border border-slate-300 dark:border-slate-700 px-3 py-2 bg-slate-50/40 dark:bg-slate-800/30 text-[10px] font-normal text-slate-500"
                            >
                              Kalkulasi: Total Keseluruhan ÷ {formatNumber(rabTargetMetrics.totalSasaran)} sasaran
                            </td>
                          </tr>
                          <tr className="bg-white dark:bg-slate-900 font-extrabold text-slate-900 dark:text-white">
                            <td
                              colSpan={6}
                              className="border border-slate-300 dark:border-slate-700 px-3 py-2 text-center uppercase text-xs"
                            >
                              PAGU HARGA BELANJA HARIAN
                            </td>
                            <td className="border border-slate-300 dark:border-slate-700 px-3 py-2 text-right font-mono tabular-nums whitespace-nowrap">
                              {editingPaguTarget === 'operasional' ? (
                                <div className="flex items-center justify-end gap-1">
                                  <input
                                    type="number"
                                    min={0}
                                    value={paguDraftInput}
                                    onChange={e => setPaguDraftInput(e.target.value)}
                                    className="w-28 px-2 py-1 text-xs font-mono font-bold rounded border border-blue-400 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      savePaguHarian(
                                        'operasional',
                                        Math.max(0, Number(paguDraftInput) || 0)
                                      )
                                    }
                                    className="p-1 rounded bg-[#1E3A8A] text-white"
                                    title="Simpan Pagu Operasional"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingPaguTarget(null)}
                                    className="p-1 rounded bg-slate-200 text-slate-700"
                                    title="Batal"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <div className="inline-flex items-center justify-end gap-1.5">
                                  <span>{formatRupiah(rabTargetMetrics.paguOperasional)}</span>
                                  {canEditRAB && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingPaguTarget('operasional');
                                        setPaguDraftInput(String(rabTargetMetrics.paguOperasional));
                                      }}
                                      className="p-0.5 text-slate-400 hover:text-[#1E3A8A] print:hidden"
                                      title="Edit Pagu Harga Belanja Harian Operasional"
                                    >
                                      <FileEdit className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                            <td
                              colSpan={trailingColsCount}
                              className="border border-slate-300 dark:border-slate-700 px-3 py-2 bg-slate-50/40 dark:bg-slate-800/30 text-[10px] font-normal text-slate-500"
                            >
                              {typeof paguHarianConfig.operasional === 'number' ? (
                                <button
                                  type="button"
                                  onClick={() => savePaguHarian('operasional', null)}
                                  className="text-[10px] font-bold text-[#0D9488] hover:underline print:hidden"
                                >
                                  Reset ke Standar Operasional ({formatRupiah(rabTargetMetrics.defaultPaguOperasional)})
                                </button>
                              ) : (
                                <span>
                                  Kalkulasi standar operasional: {formatNumber(rabTargetMetrics.totalSasaran)} sasaran × Rp 3.000
                                </span>
                              )}
                            </td>
                          </tr>
                          <tr className="font-extrabold">
                            <td
                              colSpan={6}
                              className="border border-slate-300 dark:border-slate-700 px-3 py-2 text-center uppercase text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                            >
                              SISA
                            </td>
                            <td
                              className={`border border-slate-300 dark:border-slate-700 px-3 py-2 text-right font-mono tabular-nums whitespace-nowrap ${
                                sisaOperasional >= 0
                                  ? 'bg-[#92D050] text-slate-900'
                                  : 'bg-rose-200 text-rose-900'
                              }`}
                            >
                              {formatRupiah(sisaOperasional)}
                            </td>
                            <td
                              colSpan={trailingColsCount}
                              className="border border-slate-300 dark:border-slate-700 px-3 py-2 bg-slate-50/40 dark:bg-slate-800/30 text-[10px] font-normal text-slate-500"
                            >
                              {sisaOperasional >= 0
                                ? 'Surplus / masih di bawah Pagu Belanja Harian'
                                : 'Defisit / melebihi Pagu Belanja Harian'}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBMODUL B: PURCHASE ORDER (PO TERIKAT RAB) */}
      {/* ========================================================================= */}
      {activeTab === 'purchase_order' && (
        <div key="purchase_order" className="space-y-4 animate-fadeIn">
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
          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition shrink-0"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Rekap PO</span>
              </button>
            </div>

            {/* Pilihan Hari, UI Date Picker Presisi & Basis Tanggal PO */}
            <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
              {/* Baris Date Picker Interaktif + Stepper Harian + Basis Tanggal */}
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2.5 bg-slate-50/80 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 font-bold text-[#1E3A8A] dark:text-sky-300 uppercase text-[10px]">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Filter Tanggal PO:</span>
                  </span>

                  {/* Interactive Date Picker Widget */}
                  <div ref={poDatePickerRef} className="relative flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const base =
                          filterPODate !== 'ALL'
                            ? filterPODate
                            : plogMenuDays[0]?.date || new Date().toISOString().slice(0, 10);
                        setFilterPODate(shiftIsoDate(base, -1));
                      }}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                      title="Mundur 1 hari"
                      aria-label="Tanggal sebelumnya"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsPODatePickerOpen(v => !v)}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition cursor-pointer shadow-2xs ${
                        filterPODate !== 'ALL'
                          ? 'bg-white dark:bg-slate-900 border-[#0D9488] text-slate-900 dark:text-white ring-1 ring-[#0D9488]/20'
                          : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-400'
                      }`}
                      title="Buka kalender Date Picker untuk memilih tanggal PO spesifik"
                    >
                      <Calendar className="w-3.5 h-3.5 text-[#0D9488] shrink-0" />
                      <span className="font-mono">
                        {filterPODate === 'ALL'
                          ? 'Pilih Tanggal Spesifik...'
                          : formatIndonesianDate(filterPODate)}
                      </span>
                      {filterPODate !== 'ALL' && (
                        <span className="px-1.5 py-0.2 rounded bg-teal-100 text-[#0D9488] dark:bg-teal-950 dark:text-teal-300 text-[10px] font-mono">
                          {poDateCountsMap.get(filterPODate) || 0} PO
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const base =
                          filterPODate !== 'ALL'
                            ? filterPODate
                            : plogMenuDays[0]?.date || new Date().toISOString().slice(0, 10);
                        setFilterPODate(shiftIsoDate(base, 1));
                      }}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                      title="Maju 1 hari"
                      aria-label="Tanggal berikutnya"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    {filterPODate !== 'ALL' && (
                      <button
                        type="button"
                        onClick={() => setFilterPODate('ALL')}
                        className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 transition cursor-pointer"
                        title="Hapus filter tanggal (tampilkan semua tanggal)"
                        aria-label="Reset filter tanggal"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Calendar Popover */}
                    {isPODatePickerOpen && (
                      <div className="absolute left-0 top-full mt-2 z-40 w-[300px] sm:w-[320px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-3 space-y-2.5 animate-fadeIn">
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => shiftPOCalendarMonth(-1)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                            title="Bulan sebelumnya"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <span className="text-xs font-extrabold text-slate-900 dark:text-white tracking-wide">
                            {poCalendarCells.monthLabel}
                          </span>
                          <button
                            type="button"
                            onClick={() => shiftPOCalendarMonth(1)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                            title="Bulan berikutnya"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 uppercase">
                          {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(d => (
                            <div key={d} className="py-1">
                              {d}
                            </div>
                          ))}
                        </div>

                        <div className="grid grid-cols-7 gap-1">
                          {poCalendarCells.cells.map(cell => {
                            const count = poDateCountsMap.get(cell.iso) || 0;
                            const isSelected = filterPODate === cell.iso;
                            const isToday = cell.iso === new Date().toISOString().slice(0, 10);
                            return (
                              <button
                                key={cell.iso}
                                type="button"
                                onClick={() => {
                                  setFilterPODate(cell.iso);
                                  setIsPODatePickerOpen(false);
                                }}
                                title={
                                  count > 0
                                    ? `${formatIndonesianDate(cell.iso)} • ${count} PO`
                                    : formatIndonesianDate(cell.iso)
                                }
                                className={`relative h-9 rounded-lg flex flex-col items-center justify-center text-[11px] transition cursor-pointer ${
                                  isSelected
                                    ? 'bg-[#0D9488] text-white font-extrabold shadow-xs'
                                    : count > 0
                                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 font-bold border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                                    : cell.inMonth
                                    ? 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    : 'text-slate-300 dark:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                                } ${isToday && !isSelected ? 'ring-1 ring-blue-500' : ''}`}
                              >
                                <span>{cell.day}</span>
                                {count > 0 && (
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                                      isSelected ? 'bg-white' : 'bg-[#0D9488]'
                                    }`}
                                  />
                                )}
                              </button>
                            );
                          })}
                        </div>

                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-500 shrink-0">
                              Lompat ke:
                            </span>
                            <input
                              type="date"
                              value={filterPODate === 'ALL' ? '' : filterPODate}
                              onChange={e => {
                                const val = e.target.value;
                                if (val) {
                                  setFilterPODate(val);
                                  setIsPODatePickerOpen(false);
                                }
                              }}
                              className="flex-1 min-w-0 px-2 py-1 text-[11px] rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white font-mono"
                            />
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const todayIso = new Date().toISOString().slice(0, 10);
                                setFilterPODate(todayIso);
                                setPoCalendarMonth(todayIso.slice(0, 7));
                                setIsPODatePickerOpen(false);
                              }}
                              className="px-2.5 py-1 rounded-md bg-blue-50 hover:bg-blue-100 dark:bg-sky-950/60 text-blue-900 dark:text-sky-300 text-[11px] font-bold transition cursor-pointer"
                            >
                              Hari Ini
                            </button>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-[#0D9488] inline-block" />
                              <span>Ada PO</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setFilterPODate('ALL');
                                setIsPODatePickerOpen(false);
                              }}
                              className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold transition cursor-pointer"
                            >
                              Semua Tanggal
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Basis Tanggal yang Difilter */}
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="font-bold text-slate-400 uppercase text-[10px] mr-0.5">
                    Basis Tanggal:
                  </span>
                  {[
                    { key: 'distribution' as const, label: 'Distribusi Menu' },
                    { key: 'delivery' as const, label: 'Target Kirim (H-1)' },
                    { key: 'issue' as const, label: 'Tanggal Terbit PO' },
                    { key: 'any' as const, label: 'Semua Tanggal PO' },
                  ].map(opt => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setFilterPODateField(opt.key)}
                      className={`px-2 py-1 rounded-md font-bold transition border cursor-pointer ${
                        filterPODateField === opt.key
                          ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-2xs dark:bg-sky-600 dark:border-sky-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pilihan Cepat Hari Menu PLOG & Tombol Sinkron PO Harian */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="inline-flex items-center gap-1 font-bold text-slate-500 dark:text-slate-400 uppercase text-[10px] mr-1">
                    <span>Jadwal Menu Harian:</span>
                  </span>
                  {plogMenuDays.map(day => {
                    const isActive =
                      filterPODate === day.date && filterPODateField === 'distribution';
                    return (
                      <button
                        key={day.date}
                        type="button"
                        onClick={() => {
                          setFilterPODateField('distribution');
                          setFilterPODate(day.date);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition border cursor-pointer ${
                          isActive
                            ? 'bg-[#0D9488] text-white border-[#0D9488] shadow-2xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-teal-50 hover:border-teal-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                        }`}
                      >
                        {formatIndonesianDate(day.date)}
                        {day.menuCodes.length > 0 ? ` • ${day.menuCodes.join(', ')}` : ''}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setFilterPODate('ALL')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition border cursor-pointer ${
                      filterPODate === 'ALL'
                        ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                    }`}
                  >
                    Semua Tanggal
                  </button>
                </div>

                {hasPermission('procurement', 'create') && (
                  <button
                    type="button"
                    onClick={() =>
                      syncDailyPOsFromRAB(
                        filterPODateField === 'delivery' && filterPODate !== 'ALL'
                          ? shiftIsoDate(filterPODate, 1)
                          : filterPODate
                      )
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold transition shrink-0 cursor-pointer"
                    title="Sinkronkan daftar PO Bahan Pangan & Operasional Harian (urutan Bahan → Operasional, target kirim H-1)"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>
                      {filterPODate !== 'ALL'
                        ? 'Sinkron PO Harian (Bahan & Ops)'
                        : 'Sinkron Semua PO Harian'}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {filterPODate !== 'ALL' && (
              <div className="px-3 py-2 rounded-lg bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-800/60 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <div className="text-slate-700 dark:text-slate-200 flex flex-wrap items-center gap-2">
                  <span className="font-extrabold text-[#0D9488] dark:text-teal-300">
                    {filterPODateField === 'delivery'
                      ? `Filter Target Kirim H-1: ${formatIndonesianDate(filterPODate)}`
                      : filterPODateField === 'issue'
                      ? `Filter Tanggal Terbit PO: ${formatIndonesianDate(filterPODate)}`
                      : filterPODateField === 'any'
                      ? `Filter Semua Kriteria Tanggal PO: ${formatIndonesianDate(filterPODate)}`
                      : activePOPlogDayInfo
                      ? `Distribusi Menu ${activePOPlogDayInfo.menuCodes.join(', ')} (${formatIndonesianDate(activePOPlogDayInfo.date)})`
                      : `Distribusi Menu Harian (${formatIndonesianDate(filterPODate)})`}
                  </span>
                  {filterPODateField === 'distribution' && (
                    <>
                      <ArrowRight className="w-3.5 h-3.5 text-[#0D9488] shrink-0" />
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/90 dark:bg-slate-900 border border-teal-300/70 dark:border-teal-700 font-bold text-blue-900 dark:text-sky-300">
                        <Clock className="w-3 h-3" />
                        Target Kirim Otomatis (H-1): {formatIndonesianDate(shiftIsoDate(filterPODate, -1))}
                      </span>
                    </>
                  )}
                  <span className="px-2 py-0.5 rounded bg-white/80 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-700 dark:text-slate-200">
                    {searchedPOs.length} PO Ditemukan
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                  Urutan Otomatis: 1. Nama Bahan Pangan → 2. Nama Bahan Operasional Harian
                </span>
              </div>
            )}
          </div>

          {/* Search & Header Card PO (selaras format RAB) */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-4 sm:px-5 space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  Daftar Purchase Order (PO) Bahan &amp; Operasional
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Urutan otomatis dari Nama Bahan Pangan dilanjut Nama Bahan Operasional Harian dengan target kirim H-1 sebelum distribusi menu
                </p>
              </div>
              <div className="relative w-full lg:w-80 print:hidden">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={poSearchTerm}
                  onChange={e => setPoSearchTerm(e.target.value)}
                  placeholder="Cari nomor PO, supplier, atau bahan..."
                  className="w-full h-9 pl-9 pr-8 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/70 text-slate-800 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
                {poSearchTerm && (
                  <button
                    type="button"
                    onClick={() => setPoSearchTerm('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs p-1 cursor-pointer"
                    title="Hapus pencarian"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Tabel PO Berformat Kolom RAB (Tanpa Total Keseluruhan, Total per Sasaran, Pagu & Sisa) */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-700 shadow-sm overflow-hidden print:shadow-none">
            <div className="px-4 py-2.5 bg-[#C6E0B4] dark:bg-emerald-950/70 border-b border-slate-300 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-emerald-100">
                  PURCHASE ORDER (PO) BAHAN &amp; OPERASIONAL ({searchedPOs.length} PO)
                </span>
                {filterPODate !== 'ALL' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/85 dark:bg-slate-900/75 text-[#0D9488] dark:text-teal-300 border border-teal-700/25">
                    {filterPODateField === 'delivery'
                      ? `Target Kirim H-1: ${formatIndonesianDate(filterPODate)}`
                      : filterPODateField === 'issue'
                      ? `Terbit PO: ${formatIndonesianDate(filterPODate)}`
                      : filterPODateField === 'any'
                      ? `Tanggal PO: ${formatIndonesianDate(filterPODate)}`
                      : `Menu: ${formatIndonesianDate(filterPODate)} • Target Kirim H-1: ${formatIndonesianDate(shiftIsoDate(filterPODate, -1))}`}
                  </span>
                )}
                {filterPOStatus !== 'ALL' && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white/80 dark:bg-slate-900/70 text-slate-700 dark:text-emerald-200 border border-emerald-700/20">
                    Status: {filterPOStatus}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-bold text-slate-700 dark:text-emerald-200 font-mono">
                Total Baris Pesanan:{' '}
                {searchedPOs.reduce((sum, po) => sum + Math.max(1, (po.items || []).length), 0)} Item (Bahan → Operasional)
              </span>
            </div>

            {searchedPOs.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  variant={poSearchTerm ? 'search' : 'data'}
                  title="Data Purchase Order tidak ditemukan"
                  description={
                    poSearchTerm
                      ? 'Tidak ada Purchase Order yang cocok dengan kata kunci pencarian Anda.'
                      : filterPODate !== 'ALL'
                      ? `Belum ada Purchase Order pada tanggal ${formatIndonesianDate(filterPODate)} (${
                          filterPODateField === 'delivery'
                            ? 'Target Kirim H-1'
                            : filterPODateField === 'issue'
                            ? 'Tanggal Terbit PO'
                            : filterPODateField === 'any'
                            ? 'Semua Tanggal PO'
                            : 'Distribusi Menu'
                        }).`
                      : 'Belum ada Purchase Order untuk status filter yang dipilih.'
                  }
                  actionLabel={
                    poSearchTerm
                      ? 'Reset Pencarian'
                      : filterPODate !== 'ALL'
                      ? 'Tampilkan Semua Tanggal'
                      : undefined
                  }
                  onAction={
                    poSearchTerm
                      ? () => setPoSearchTerm('')
                      : filterPODate !== 'ALL'
                      ? () => setFilterPODate('ALL')
                      : undefined
                  }
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    {/* Numbered Spreadsheet Column Strip */}
                    <tr className="bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300 text-center">
                      <th className="border border-slate-300 dark:border-slate-700 px-2 py-1 w-10">1</th>
                      <th className="border border-slate-300 dark:border-slate-700 px-2 py-1 sticky left-0 z-10 bg-slate-100 dark:bg-slate-800">2</th>
                      <th className="border border-slate-300 dark:border-slate-700 px-2 py-1">3</th>
                      <th className="border border-slate-300 dark:border-slate-700 px-2 py-1">4</th>
                      <th className="border border-slate-300 dark:border-slate-700 px-2 py-1">5</th>
                      <th className="border border-slate-300 dark:border-slate-700 px-2 py-1">6</th>
                      <th className="border border-slate-300 dark:border-slate-700 px-2 py-1">7</th>
                      <th className="border border-slate-300 dark:border-slate-700 px-2 py-1">8</th>
                      <th className="border border-slate-300 dark:border-slate-700 px-2 py-1">9</th>
                      <th className="border border-slate-300 dark:border-slate-700 px-2 py-1 print:hidden">
                        Aksi
                      </th>
                    </tr>

                    {/* Main Olive Green Column Headers matching RAB format */}
                    <tr className="bg-[#548235] dark:bg-emerald-900 text-white text-[11px] font-extrabold tracking-wide">
                      <th className="border border-slate-400/70 dark:border-slate-700 px-2.5 py-2 text-center w-10">
                        NO
                      </th>
                      <th className="border border-slate-400/70 dark:border-slate-700 px-3 py-2 text-left min-w-[240px] sticky left-0 z-10 bg-[#548235] dark:bg-emerald-900">
                        NAMA BAHAN &amp; OPERASIONAL HARIAN
                      </th>
                      <th className="border border-slate-400/70 dark:border-slate-700 px-3 py-2 text-left min-w-[215px] whitespace-nowrap">
                        NO. PO, SUPPLIER &amp; TARGET H-1
                      </th>
                      <th className="border border-slate-400/70 dark:border-slate-700 px-3 py-2 text-center whitespace-nowrap">
                        Jumlah
                      </th>
                      <th className="border border-slate-400/70 dark:border-slate-700 px-3 py-2 text-center whitespace-nowrap">
                        Satuan
                      </th>
                      <th className="border border-slate-400/70 dark:border-slate-700 px-3 py-2 text-right whitespace-nowrap">
                        HARGA DASAR
                      </th>
                      <th className="border border-slate-400/70 dark:border-slate-700 px-3 py-2 text-right whitespace-nowrap">
                        Jumlah
                      </th>
                      <th className="border border-slate-400/70 dark:border-slate-700 px-3 py-2 text-center whitespace-nowrap">
                        Status PO
                      </th>
                      <th className="border border-slate-400/70 dark:border-slate-700 px-3 py-2 text-center whitespace-nowrap">
                        Status QC Bahan
                      </th>
                      <th className="border border-slate-400/70 dark:border-slate-700 px-3 py-2 text-right whitespace-nowrap print:hidden">
                        Aksi &amp; Alur PO
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {searchedPOs.map((row, poIdx) => {
                      const rawItemsList =
                        row.items && row.items.length > 0
                          ? row.items
                          : [
                              {
                                itemId: row.id,
                                itemName: row.notes || 'Pesanan PO',
                                quantity: 1,
                                unit: 'paket',
                                unitPrice: row.totalAmount,
                                subtotal: row.totalAmount,
                                rabId: row.rabId,
                              },
                            ];
                      const itemsList = sortPOItemsBahanThenOperasional(rawItemsList, row, rabList);
                      const itemCount = itemsList.length;
                      const resolvedDistDate = resolvePODistributionDate(row, rabList, menuItems);
                      const itemApprovalStatuses = itemsList.map(item =>
                        resolvePOItemApprovalStatus(item, row)
                      );
                      const approvedItemCount = itemApprovalStatuses.filter(
                        s => s === 'Disetujui'
                      ).length;
                      const rejectedItemCount = itemApprovalStatuses.filter(
                        s => s === 'Ditolak'
                      ).length;
                      const pendingItemCount = itemApprovalStatuses.filter(
                        s => s === 'Menunggu persetujuan'
                      ).length;
                      const isPreDispatchPO =
                        row.status === 'Draft' ||
                        row.status === 'Menunggu persetujuan' ||
                        row.status === 'Menunggu Verifikasi Keuangan' ||
                        row.status === 'Disetujui' ||
                        row.status === 'Disetujui Kepala' ||
                        row.status === 'Ditolak';
                      const canApproveItems =
                        isPreDispatchPO && hasPermission('procurement', 'approve');

                      return itemsList.map((it, itemIdx) => {
                        const isFirstItem = itemIdx === 0;
                        const linkedRab = rabList.find(r => r.id === (it.rabId || row.rabId));
                        const isOpsItem = isOperasionalPOItem(it, row, rabList);
                        const itemApprovalStatus = itemApprovalStatuses[itemIdx];
                        const isItemRejected = itemApprovalStatus === 'Ditolak';

                        return (
                          <tr
                            key={`${row.id}-${itemIdx}`}
                            className={`transition-colors ${
                              isItemRejected
                                ? 'bg-rose-50/30 dark:bg-rose-950/15 opacity-75'
                                : isOpsItem
                                ? 'bg-amber-50/20 hover:bg-amber-50/50 dark:bg-amber-950/10 dark:hover:bg-slate-800/60'
                                : 'hover:bg-blue-50/40 dark:hover:bg-slate-800/60'
                            }`}
                          >
                            {/* Col 1: NO */}
                            {isFirstItem && (
                              <td
                                rowSpan={itemCount}
                                className="border border-slate-300 dark:border-slate-700 px-2.5 py-2 text-center font-mono text-slate-700 dark:text-slate-300 align-top"
                              >
                                {poIdx + 1}
                              </td>
                            )}

                            {/* Col 2: NAMA BAHAN & OPERASIONAL HARIAN */}
                            <td className="border border-slate-300 dark:border-slate-700 px-3 py-2 align-top sticky left-0 z-10 bg-white dark:bg-slate-900">
                              <div
                                className={`font-bold text-xs ${
                                  isItemRejected
                                    ? 'line-through text-slate-400 dark:text-slate-500'
                                    : 'text-slate-900 dark:text-white'
                                }`}
                              >
                                {it.itemName}
                              </div>
                              <div className="mt-0.5 flex flex-wrap items-center gap-1">
                                <span
                                  className={`inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                    isOpsItem
                                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                      : 'bg-teal-100 text-[#0D9488] dark:bg-teal-950 dark:text-teal-300'
                                  }`}
                                >
                                  {isOpsItem ? 'Operasional Harian' : 'Bahan Pangan'}
                                </span>
                                {linkedRab && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                                    <Link2 className="w-2.5 h-2.5" />
                                    <span>RAB: {linkedRab.budgetCode}</span>
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Col 3: NO. PO, SUPPLIER & TARGET H-1 */}
                            {isFirstItem && (
                              <td
                                rowSpan={itemCount}
                                className="border border-slate-300 dark:border-slate-700 px-3 py-2 align-top"
                              >
                                <div className="font-mono text-xs font-bold text-blue-900 dark:text-sky-300">
                                  {row.poNumber}
                                </div>
                                {resolvedDistDate && (
                                  <div className="text-[10px] text-[#0D9488] dark:text-teal-300 font-semibold">
                                    Distribusi Menu: {formatIndonesianDate(resolvedDistDate)}
                                  </div>
                                )}
                                <div className="text-[10px] text-slate-600 dark:text-slate-300">
                                  Target Kirim (H-1):{' '}
                                  <strong className="text-blue-900 dark:text-sky-300">
                                    {formatIndonesianDate(row.deliveryDate)}
                                  </strong>
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  Terbit: {formatIndonesianDate(row.date)}
                                </div>
                                <div className="mt-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                                  <div className="font-bold text-slate-900 dark:text-white text-[11px]">
                                    {row.supplierName}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono">
                                    {row.supplierContact}
                                  </div>
                                </div>
                                {itemCount > 1 && (
                                  <div className="mt-1 text-[10px] font-mono font-bold text-[#1E3A8A] dark:text-sky-300">
                                    Total PO: {formatRupiah(row.totalAmount)}
                                  </div>
                                )}
                              </td>
                            )}

                            {/* Col 4: Jumlah (QTY) */}
                            <td className="border border-slate-300 dark:border-slate-700 px-3 py-2 text-center font-mono font-bold tabular-nums text-slate-900 dark:text-white align-top">
                              {formatNumber(it.quantity)}
                            </td>

                            {/* Col 5: Satuan */}
                            <td className="border border-slate-300 dark:border-slate-700 px-3 py-2 text-center text-slate-700 dark:text-slate-300 align-top">
                              {it.unit}
                            </td>

                            {/* Col 6: HARGA DASAR */}
                            <td className="border border-slate-300 dark:border-slate-700 px-3 py-2 text-right font-mono tabular-nums text-slate-800 dark:text-slate-200 align-top whitespace-nowrap">
                              {formatRupiah(it.unitPrice)}
                            </td>

                            {/* Col 7: Jumlah (Subtotal / Nilai Item) */}
                            <td
                              className={`border border-slate-300 dark:border-slate-700 px-3 py-2 text-right font-mono font-bold tabular-nums align-top whitespace-nowrap ${
                                isItemRejected
                                  ? 'line-through text-slate-400 dark:text-slate-500'
                                  : 'text-slate-900 dark:text-white'
                              }`}
                            >
                              {formatRupiah(it.subtotal)}
                            </td>

                            {/* Col 8: Status PO (Per Item Bahan & Operasional) */}
                            <td className="border border-slate-300 dark:border-slate-700 px-2.5 py-2 text-center align-top whitespace-nowrap">
                              <div className="flex flex-col items-center gap-1">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                                    itemApprovalStatus === 'Disetujui'
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                      : itemApprovalStatus === 'Ditolak'
                                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                  }`}
                                >
                                  {itemApprovalStatus === 'Disetujui' ? (
                                    <CheckCircle className="w-3 h-3" />
                                  ) : itemApprovalStatus === 'Ditolak' ? (
                                    <XCircle className="w-3 h-3" />
                                  ) : (
                                    <Clock className="w-3 h-3" />
                                  )}
                                  <span>
                                    {itemApprovalStatus === 'Disetujui'
                                      ? 'Disetujui'
                                      : itemApprovalStatus === 'Ditolak'
                                      ? 'Ditolak'
                                      : 'Menunggu'}
                                  </span>
                                </span>

                                <span
                                  className={`inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-semibold ${
                                    row.status === 'Selesai diterima' ||
                                    row.status === 'Diterima di Gudang'
                                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                      : row.status === 'Sebagian diterima'
                                      ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300'
                                      : row.status === 'Dikirim ke supplier'
                                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                                      : row.status === 'Disetujui' ||
                                        row.status === 'Disetujui Kepala'
                                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-sky-300'
                                      : row.status === 'Ditolak' || row.status === 'Dibatalkan'
                                      ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                                  }`}
                                >
                                  PO: {row.status}
                                </span>

                                {isFirstItem && itemCount > 1 && (
                                  <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400">
                                    {approvedItemCount}/{itemCount} Disetujui
                                    {rejectedItemCount > 0 ? ` · ${rejectedItemCount} Ditolak` : ''}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Col 9: Status QC Bahan */}
                            {isFirstItem && (
                              <td
                                rowSpan={itemCount}
                                className="border border-slate-300 dark:border-slate-700 px-3 py-2 text-center align-top whitespace-nowrap"
                              >
                                <span
                                  className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    row.qcStatus === 'Lolos Penuh' ||
                                    row.qcStatus === 'Diterima'
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                      : row.qcStatus === 'Lolos Sebagian' ||
                                        row.qcStatus === 'Diterima sebagian'
                                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                      : row.qcStatus === 'Ditolak'
                                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                  }`}
                                >
                                  {row.qcStatus}
                                </span>
                              </td>
                            )}

                            {/* Col Aksi: Persetujuan Per Item & Alur PO */}
                            <td className="border border-slate-300 dark:border-slate-700 px-2.5 py-2 align-top print:hidden">
                              <div className="flex flex-col items-end gap-1.5 min-w-[165px]">
                                {/* Baris Tombol Persetujuan Masing-Masing Item (Bahan / Operasional) */}
                                {canApproveItems && (
                                  <div className="flex items-center justify-end gap-1 flex-wrap">
                                    {itemApprovalStatus === 'Menunggu persetujuan' ? (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleUpdatePOItemApproval(row, itemIdx, 'Disetujui')
                                          }
                                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold inline-flex items-center gap-1 transition shadow-xs"
                                          title={`Setujui item ${it.itemName}`}
                                        >
                                          <CheckCircle className="w-3 h-3" />
                                          <span>Setujui</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleUpdatePOItemApproval(row, itemIdx, 'Ditolak')
                                          }
                                          className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold inline-flex items-center gap-1 transition shadow-xs"
                                          title={`Tolak item ${it.itemName}`}
                                        >
                                          <XCircle className="w-3 h-3" />
                                          <span>Tolak</span>
                                        </button>
                                      </>
                                    ) : itemApprovalStatus === 'Disetujui' ? (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleUpdatePOItemApproval(row, itemIdx, 'Ditolak')
                                          }
                                          className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:hover:bg-rose-900 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded text-[10px] font-bold inline-flex items-center gap-1 transition"
                                          title={`Batalkan & tolak item ${it.itemName}`}
                                        >
                                          <XCircle className="w-3 h-3" />
                                          <span>Tolak</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleUpdatePOItemApproval(
                                              row,
                                              itemIdx,
                                              'Menunggu persetujuan'
                                            )
                                          }
                                          className="p-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700"
                                          title={`Kembalikan ${it.itemName} ke Menunggu Persetujuan`}
                                        >
                                          <RotateCcw className="w-3 h-3" />
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleUpdatePOItemApproval(row, itemIdx, 'Disetujui')
                                          }
                                          className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded text-[10px] font-bold inline-flex items-center gap-1 transition"
                                          title={`Setujui kembali item ${it.itemName}`}
                                        >
                                          <CheckCircle className="w-3 h-3" />
                                          <span>Setujui</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleUpdatePOItemApproval(
                                              row,
                                              itemIdx,
                                              'Menunggu persetujuan'
                                            )
                                          }
                                          className="p-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700"
                                          title={`Kembalikan ${it.itemName} ke Menunggu Persetujuan`}
                                        >
                                          <RotateCcw className="w-3 h-3" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                )}

                                {/* Alur PO Level Dokumen (Baris Pertama PO) */}
                                {isFirstItem && (
                                  <div className="flex items-center justify-end gap-1.5 flex-wrap pt-0.5 border-t border-slate-100 dark:border-slate-800/80 w-full">
                                    {/* Detail PO Modal */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedPOForDetail(row);
                                        setIsPODetailOpen(true);
                                      }}
                                      className="p-1 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                                      title="Lihat Detail & Cetak PO"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>

                                    {/* Approve All Pending Items in Multi-Item PO */}
                                    {canApproveItems && itemCount > 1 && pendingItemCount > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => handleUpdatePOStatus(row.id, 'Disetujui')}
                                        className="px-2 py-1 bg-teal-700 hover:bg-teal-600 text-white rounded text-[10px] font-bold inline-flex items-center gap-1 transition shadow-xs"
                                        title="Setujui semua item pada PO ini"
                                      >
                                        <CheckSquare className="w-3 h-3" />
                                        <span>Setujui Semua</span>
                                      </button>
                                    )}

                                    {/* Send to Supplier */}
                                    {(row.status === 'Disetujui' ||
                                      row.status === 'Disetujui Kepala') && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleUpdatePOStatus(row.id, 'Dikirim ke supplier')
                                        }
                                        className="px-2 py-1 bg-blue-900 hover:bg-blue-800 text-white rounded text-[10px] font-bold flex items-center gap-1 transition shadow-xs"
                                        title="Kirim PO ke Supplier"
                                      >
                                        <Send className="w-3 h-3" />
                                        <span>Kirim Supplier</span>
                                      </button>
                                    )}

                                    {/* Quality Control Button: For arriving deliveries */}
                                    {(row.status === 'Dikirim ke supplier' ||
                                      row.status === 'Sebagian diterima') && (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenQCModal(row)}
                                        className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold flex items-center gap-1 transition shadow-xs"
                                        title="Input Inspeksi Quality Control"
                                      >
                                        <PackageCheck className="w-3 h-3" />
                                        <span>Inspeksi QC</span>
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      });
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBMODUL C: QUALITY CONTROL & STOK GUDANG */}
      {/* ========================================================================= */}
      {activeTab === 'quality_control' && (
        <div key="quality_control" className="space-y-4 animate-fadeIn">
          <div className="bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-start gap-3 text-xs text-emerald-900 dark:text-emerald-200">
            <ShieldCheck className="w-5 h-5 text-[#0D9488] shrink-0 mt-0.5" />
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 items-stretch">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 ease-out flex flex-col justify-between h-full">
              <div className="text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400">Total Qty Dipesan</div>
              <div className="text-xl font-bold tracking-tight font-mono tabular-nums text-slate-900 dark:text-white mt-1.5">
                {formatNumber(qcTotals.ordered)} unit
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 ease-out flex flex-col justify-between h-full">
              <div className="text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400">Total Qty Diterima</div>
              <div className="text-xl font-bold tracking-tight font-mono tabular-nums text-[#0D9488] mt-1.5">
                {formatNumber(qcTotals.received)} unit
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 ease-out flex flex-col justify-between h-full">
              <div className="text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5 text-[#1E3A8A] dark:text-sky-400" />
                <span>Perhitungan Selisih</span>
              </div>
              <div
                className={`text-xl font-bold tracking-tight font-mono tabular-nums mt-1.5 ${
                  qcTotals.diff === 0
                    ? 'text-[#0D9488]'
                    : qcTotals.diff < 0
                    ? 'text-[#E11D48]'
                    : 'text-[#1E3A8A] dark:text-sky-400'
                }`}
              >
                {qcTotals.diff === 0
                  ? '0 (100% Sesuai)'
                  : `${qcTotals.diff > 0 ? '+' : ''}${formatNumber(qcTotals.diff)} unit (${qcTotals.pct}%)`}
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 ease-out flex flex-col justify-between h-full">
              <div className="text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-[#1E3A8A] dark:text-sky-400" />
                <span>Foto Bahan Terupload</span>
              </div>
              <div className="text-xl font-bold tracking-tight font-mono tabular-nums text-[#1E3A8A] dark:text-sky-400 mt-1.5">
                {qcTotals.photoCount}/{filteredQCLogList.length} Item ({qcTotals.totalPhotos} Foto)
              </div>
            </div>
          </div>

          {/* Filter Tanggal PO Harian pada Tab Quality Control */}
          {qcAvailableDates.length > 0 && (
            <div className="bg-white dark:bg-slate-900 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1 mr-1">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  <span>PO Harian:</span>
                </span>
                <button
                  type="button"
                  onClick={() => setQcTabDateFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                    qcTabDateFilter === 'ALL'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Semua Tanggal
                </button>
                {qcAvailableDates.map(d => (
                  <button
                    key={`qc-tab-day-${d}`}
                    type="button"
                    onClick={() => setQcTabDateFilter(d)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                      qcTabDateFilter === d
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {formatIndonesianDate(d)}
                  </button>
                ))}
              </div>
              {qcTabDateFilter !== 'ALL' && (
                <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                  Menampilkan log QC PO harian {formatIndonesianDate(qcTabDateFilter)}
                </span>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <PackageCheck className="w-4 h-4 text-emerald-600" />
                Rekam Jejak Inspeksi Quality Control Penerimaan Bahan &amp; Operasional
              </h3>
              <p className="text-xs text-slate-500">
                Upload foto per masing-masing bahan/operasional harian, pantau selisih dipesan vs diterima, dan isi keterangan manual
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleOpenDirectQCModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Input QC PO Harian (Bahan &amp; Operasional)</span>
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
            data={filteredQCLogList}
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
                render: row => {
                  const acceptedRecordedAt = isQCAcceptedStatus(row.status)
                    ? row.acceptedStatusAt || row.inspectedAt
                    : '';
                  return (
                    <div className="space-y-1 min-w-[165px]">
                      <select
                        value={row.status}
                        onChange={e => {
                          const nextStatus = e.target.value as QCStatusPLOK;
                          const shouldAddStock =
                            isQCAcceptedStatus(nextStatus) &&
                            Number(row.receivedQuantity || 0) > 0;
                          updateQualityControlRecord(row.id, {
                            status: nextStatus,
                            inventoryAdded: shouldAddStock,
                          });
                        }}
                        aria-label={`Ubah Status QC & Stok ${row.itemName}`}
                        className={`w-full px-2 py-1 rounded text-[10px] font-bold border cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
                          row.status === 'Diterima' || row.status === 'Lolos Penuh'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                            : row.status === 'Diterima sebagian' || row.status === 'Lolos Sebagian'
                            ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                            : row.status === 'Perlu pemeriksaan ulang'
                            ? 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800'
                            : 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800'
                        }`}
                      >
                        <option value="Diterima">Diterima</option>
                        <option value="Diterima sebagian">Diterima sebagian</option>
                        <option value="Lolos Penuh">Lolos Penuh</option>
                        <option value="Lolos Sebagian">Lolos Sebagian</option>
                        <option value="Perlu pemeriksaan ulang">Perlu pemeriksaan ulang</option>
                        <option value="Ditolak">Ditolak</option>
                        <option value="Belum QC">Belum QC</option>
                      </select>
                      {acceptedRecordedAt && (
                        <div className="text-[9px] font-mono text-slate-600 dark:text-slate-300">
                          Terekam diterima: {acceptedRecordedAt}
                        </div>
                      )}
                      {row.inventoryAdded && (
                        <div className="text-[9px] text-emerald-600 font-bold flex items-center gap-0.5">
                          <Check className="w-3 h-3" />
                          <span>Masuk Stok Gudang +{row.receivedQuantity} {row.unit}</span>
                        </div>
                      )}
                    </div>
                  );
                },
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
                    setRabModalUnitManual(false);
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
                      rincianItems: need.rincianItems.map(l => ({ ...l })),
                      isRincianManual: false,
                    }));
                  }
                } else if (val.startsWith('menuitem:')) {
                  const need = menuPlannedNeeds.perMenuItems.find(m => m.key === val.slice(9));
                  if (need) {
                    setRabModalUnitManual(false);
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
                      rincianItems: [
                        {
                          id: `rin-modal-${need.sourceMenuId}-${Date.now()}`,
                          menuName: need.menuDishLabel || need.sourceMenuLabel || need.sourceMenuCode,
                          ingredientName: need.name,
                          quantity: need.quantity,
                          unit: need.unit,
                          sourceMenuId: need.sourceMenuId,
                          sourceMenuCode: need.sourceMenuCode,
                          isManual: false,
                        },
                      ],
                      isRincianManual: false,
                    }));
                  }
                } else if (val.startsWith('mb:')) {
                  const mb = masterBahan.find(m => m.id === val.slice(3));
                  if (mb) {
                    setRabModalUnitManual(false);
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
                      rincianItems: [
                        {
                          id: `rin-mb-${mb.id}-${Date.now()}`,
                          menuName: 'Pengadaan Master Bahan',
                          ingredientName: mb.name,
                          quantity: Math.max(mb.minimumStock, 50),
                          unit: mb.unit,
                          isManual: true,
                        },
                      ],
                      isRincianManual: true,
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

          {/* Rincian RAB Editor inside Modal */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  Rincian RAB (Menu, Nama Bahan, Kuantiti & Satuan)
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  Terisi otomatis dari Perencanaan Menu PLOG dan dapat diedit manual
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setRabForm(prev => ({
                    ...prev,
                    isRincianManual: true,
                    rincianItems: [
                      ...(prev.rincianItems || []),
                      {
                        id: `rin-modal-man-${Date.now()}-${(prev.rincianItems || []).length}`,
                        menuName: prev.sourceMenuLabel || prev.sourceMenuCode || '',
                        ingredientName: prev.itemName || '',
                        quantity: 0,
                        unit: prev.unit || 'kg',
                        isManual: true,
                      },
                    ],
                  }))
                }
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-50 hover:bg-blue-100 text-[#1E3A8A] border border-blue-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800 transition"
              >
                <Plus className="w-3 h-3" />
                <span>Tambah Baris Rincian</span>
              </button>
            </div>

            {(rabForm.rincianItems || []).length === 0 ? (
              <div className="text-[11px] text-slate-400 italic py-1">
                Pilih kebutuhan bahan PLOG di atas untuk mengisi otomatis, atau klik "Tambah Baris Rincian".
              </div>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {(rabForm.rincianItems || []).map((line, idx) => {
                  const lineKey = line.id || String(idx);
                  return (
                    <div
                      key={lineKey}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700"
                    >
                      <div className="sm:col-span-3">
                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                          Menu (PLOG)
                        </label>
                        <input
                          type="text"
                          value={line.menuName}
                          list="rab-rincian-menu-options"
                          onChange={e =>
                            setRabForm(prev => ({
                              ...prev,
                              isRincianManual: true,
                              rincianItems: (prev.rincianItems || []).map((l, i) =>
                                i === idx ? { ...l, menuName: e.target.value, isManual: true } : l
                              ),
                            }))
                          }
                          placeholder="Kode & nama menu"
                          className="w-full px-2 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div className="sm:col-span-4">
                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                          Nama Bahan
                        </label>
                        <input
                          type="text"
                          value={line.ingredientName}
                          list="rab-pangan-master-options"
                          onChange={e => {
                            const nextName = e.target.value;
                            const isManualUnit = Boolean(rincianManualUnits[lineKey]);
                            if (!nextName.trim()) {
                              setRincianManualUnits(prev => ({ ...prev, [lineKey]: false }));
                            }
                            const auto =
                              !isManualUnit && nextName.trim()
                                ? resolveAutoUnit(nextName, 'bahan')
                                : null;
                            setRabForm(prev => ({
                              ...prev,
                              isRincianManual: true,
                              rincianItems: (prev.rincianItems || []).map((l, i) =>
                                i === idx
                                  ? {
                                      ...l,
                                      ingredientName: nextName,
                                      ...(auto ? { unit: auto.unit } : {}),
                                      isManual: true,
                                    }
                                  : l
                              ),
                            }));
                          }}
                          placeholder="Nama bahan"
                          className="w-full px-2 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                          Kuantiti
                        </label>
                        <input
                          type="number"
                          min={0}
                          step="any"
                          value={line.quantity}
                          onChange={e => {
                            const val = e.target.value === '' ? 0 : Math.max(0, Number(e.target.value));
                            setRabForm(prev => ({
                              ...prev,
                              isRincianManual: true,
                              rincianItems: (prev.rincianItems || []).map((l, i) =>
                                i === idx
                                  ? { ...l, quantity: Number.isFinite(val) ? val : 0, isManual: true }
                                  : l
                              ),
                            }));
                          }}
                          className="w-full px-2 py-1.5 text-xs font-mono font-bold rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                          Satuan
                        </label>
                        <UnitSelectControl
                          value={line.unit}
                          options={unitOptions}
                          ariaLabel={`Satuan rincian ${line.ingredientName || idx + 1}`}
                          onChange={val => {
                            setRincianManualUnits(prev => ({ ...prev, [lineKey]: true }));
                            setRabForm(prev => ({
                              ...prev,
                              isRincianManual: true,
                              rincianItems: (prev.rincianItems || []).map((l, i) =>
                                i === idx ? { ...l, unit: val, isManual: true } : l
                              ),
                            }));
                          }}
                          className="w-full px-2 py-1.5 text-xs font-semibold rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer"
                        />
                      </div>
                      <div className="sm:col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() =>
                            setRabForm(prev => ({
                              ...prev,
                              isRincianManual: true,
                              rincianItems: (prev.rincianItems || []).filter((_, i) => i !== idx),
                            }))
                          }
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-[#E11D48] dark:bg-rose-950/60 dark:text-rose-300 transition"
                          title="Hapus baris rincian"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
                if (key === 'unit') {
                  setRabModalUnitManual(true);
                } else if (key === 'itemName' && !String(value || '').trim()) {
                  setRabModalUnitManual(false);
                }
                setRabForm(prev => {
                  const next = { ...prev, [key]: value };
                  if (key === 'category' && !selectedRAB) {
                    next.budgetCode =
                      value === 'RAB Bahan Pangan'
                        ? `RAB-BP-2026-11-00${rabList.length + 1}`
                        : `RAB-OP-2026-11-00${rabList.length + 1}`;
                  }
                  const categoryHint =
                    next.category === 'RAB Operasional' ? 'operasional' : 'bahan';
                  if (key === 'itemName') {
                    const strName = String(value || '');
                    if (!rabModalUnitManual && strName.trim()) {
                      const auto = resolveAutoUnit(strName, categoryHint);
                      if (auto) {
                        next.unit = auto.unit;
                        if (!selectedRAB && auto.unitPrice && auto.unitPrice > 0) {
                          next.unitPrice = auto.unitPrice;
                        }
                      }
                    }
                  } else if (key === 'category' && !rabModalUnitManual) {
                    if (next.itemName.trim()) {
                      const auto = resolveAutoUnit(next.itemName, categoryHint);
                      if (auto) {
                        next.unit = auto.unit;
                      }
                    } else if (!selectedRAB) {
                      next.unit = categoryHint === 'operasional' ? 'paket' : 'kg';
                    }
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

          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <div>
              {selectedRAB &&
                (hasPermission('procurement', 'edit') || hasPermission('procurement', 'delete')) && (
                  <button
                    type="button"
                    onClick={() => handleRequestDeleteRAB(selectedRAB)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-rose-50 hover:bg-rose-100 text-[#E11D48] dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus RAB</span>
                  </button>
                )}
            </div>
            <div className="flex items-center gap-2">
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
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-lg bg-blue-900 hover:bg-blue-800 text-white shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Item RAB</span>
              </button>
            </div>
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

          {/* Supplier, Tanggal Distribusi Menu & Target Kirim Otomatis H-1 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                Tanggal Distribusi Menu Harian *
              </label>
              <input
                type="date"
                required
                value={poFormDistributionDate}
                onChange={e => {
                  const nextDist = e.target.value;
                  setPoFormDistributionDate(nextDist);
                  if (nextDist) {
                    setPoFormDeliveryDate(shiftIsoDate(nextDist, -1));
                  }
                }}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Target Kirim (Otomatis H-1) *
              </label>
              <input
                type="date"
                required
                value={poFormDeliveryDate}
                onChange={e => setPoFormDeliveryDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-teal-400 dark:border-teal-700 bg-teal-50/40 dark:bg-teal-950/30 text-slate-900 dark:text-white font-mono font-bold"
              />
              <p className="text-[10px] text-[#0D9488] dark:text-teal-300 mt-0.5 font-semibold">
                Otomatis H-1 sebelum distribusi menu ({formatIndonesianDate(poFormDistributionDate)})
              </p>
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
      {/* MODAL: QUALITY CONTROL (WAJIB TERIKAT PURCHASE ORDER HARIAN) */}
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
            : 'Input Quality Control (QC) — Purchase Order Harian'
        }
        subtitle={
          editingQCRecord
            ? `Mengubah hasil QC otomatis memperbarui status PO (${editingQCRecord.poNumber}) dan saldo Stok Gudang`
            : `Menampilkan seluruh Bahan Pangan & Operasional Harian untuk PO tanggal ${formatIndonesianDate(qcModalDate)} (otomatis masuk Stok Gudang)`
        }
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveQCInspection} className="space-y-4">
          {/* Sumber Purchase Order Harian (Tanggal PO Harian + Cakupan PO + Petugas) */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
            {!editingQCRecord && (
              <div className="space-y-2 pb-2.5 border-b border-slate-200 dark:border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Pilih Tanggal Purchase Order Harian *</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={qcModalDate}
                      onChange={e => {
                        if (e.target.value) handleSelectQCDateInModal(e.target.value);
                      }}
                      className="px-2 py-1 text-[11px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
                    />
                    <button
                      type="button"
                      onClick={handleSyncAndReloadQCModal}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:hover:bg-teal-900 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-[10px] font-bold transition"
                      title="Sinkronkan PO Bahan Pangan & Operasional harian dari RAB"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Sinkron PO Harian</span>
                    </button>
                  </div>
                </div>

                {qcAvailableDates.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {qcAvailableDates.map(dayIso => {
                      const isDayActive = qcModalDate === dayIso;
                      const dayPOsCount = getPOsForDailyQCDate(dayIso).length;
                      return (
                        <button
                          key={`qc-modal-day-${dayIso}`}
                          type="button"
                          onClick={() => handleSelectQCDateInModal(dayIso)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition inline-flex items-center gap-1.5 ${
                            isDayActive
                              ? 'bg-blue-900 text-white shadow-xs'
                              : 'bg-white hover:bg-blue-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <span>{formatIndonesianDate(dayIso)}</span>
                          <span
                            className={`px-1 rounded text-[9px] font-mono ${
                              isDayActive
                                ? 'bg-blue-800 text-sky-200'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                            }`}
                          >
                            {dayPOsCount} PO
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Cakupan Purchase Order Harian *
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
                    <option value="ALL_DAILY">
                      Semua PO Harian — Bahan &amp; Operasional ({qcDailyPOs.length} PO)
                    </option>
                    {qcDailyPOs.map(po => (
                      <option key={po.id} value={po.id}>
                        {po.poNumber} — {po.poCategory || 'PO'} ({po.supplierName})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <span className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Supplier &amp; PO Aktif Hari Ini
                </span>
                <div className="px-2.5 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold text-slate-900 dark:text-white truncate">
                  {editingQCRecord
                    ? editingQCRecord.supplierName
                    : qcSelectedPOId === 'ALL_DAILY'
                    ? qcDailyPOs.length > 0
                      ? `${qcDailyPOs.length} PO (${Array.from(new Set(qcDailyPOs.map(p => p.supplierName))).join(', ')})`
                      : 'Belum ada PO pada tanggal ini'
                    : selectedPOForQC?.supplierName || '-'}
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
          </div>

          {/* Daftar Semua Bahan Pangan & Operasional Harian dari PO */}
          {(() => {
            const bahanDraftCount = qcItemDrafts.filter(
              d => d.categoryLabel === 'Bahan Pangan'
            ).length;
            const opsDraftCount = qcItemDrafts.filter(
              d => d.categoryLabel === 'Operasional Harian'
            ).length;
            const visibleQCDrafts = qcItemDrafts.filter(d =>
              qcModalCategoryFilter === 'ALL'
                ? true
                : d.categoryLabel === qcModalCategoryFilter
            );

            return (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                    <PackageCheck className="w-4 h-4 text-emerald-600" />
                    <span>
                      Daftar Semua Bahan Pangan &amp; Operasional Harian ({qcItemDrafts.length} Item)
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {!editingQCRecord && (
                      <>
                        <button
                          type="button"
                          onClick={() => setQcModalCategoryFilter('ALL')}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                            qcModalCategoryFilter === 'ALL'
                              ? 'bg-slate-900 text-white dark:bg-sky-600'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          Semua ({qcItemDrafts.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setQcModalCategoryFilter('Bahan Pangan')}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                            qcModalCategoryFilter === 'Bahan Pangan'
                              ? 'bg-teal-700 text-white'
                              : 'bg-teal-50 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300'
                          }`}
                        >
                          Bahan Pangan ({bahanDraftCount})
                        </button>
                        <button
                          type="button"
                          onClick={() => setQcModalCategoryFilter('Operasional Harian')}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                            qcModalCategoryFilter === 'Operasional Harian'
                              ? 'bg-amber-600 text-white'
                              : 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}
                        >
                          Operasional Harian ({opsDraftCount})
                        </button>
                      </>
                    )}
                    {!editingQCRecord && (qcDailyPOs.length > 0 || selectedPOForQC) && (
                      <button
                        type="button"
                        onClick={handleReloadPOItemsInQC}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-sky-950/60 dark:hover:bg-sky-900/70 text-blue-900 dark:text-sky-300 border border-blue-200 dark:border-sky-800 text-[10px] font-bold transition"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Muat Semua Item</span>
                      </button>
                    )}
                  </div>
                </div>

                {visibleQCDrafts.length === 0 ? (
                  <div className="p-6 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/50 text-center space-y-2">
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      Belum ada item Purchase Order harian untuk tanggal {formatIndonesianDate(qcModalDate)}
                      {qcModalCategoryFilter !== 'ALL' ? ` (Kategori: ${qcModalCategoryFilter})` : ''}.
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Pilih tanggal PO harian lain di atas atau klik Sinkron PO Harian untuk menarik item Bahan Pangan &amp; Operasional dari RAB.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[48vh] overflow-y-auto pr-1">
                    {visibleQCDrafts.map((draft, idx) => {
                      const ordered = Number(draft.orderedQuantity) || 0;
                      const received = Number(draft.receivedQuantity) || 0;
                      const diff = received - ordered;
                      const pct = ordered > 0 ? Math.round((received / ordered) * 100) : 0;
                      const isOpsDraft = draft.categoryLabel === 'Operasional Harian';

                      return (
                        <div
                          key={draft.key}
                          className={`p-3.5 rounded-xl border space-y-3 shadow-2xs ${
                            isOpsDraft
                              ? 'border-amber-200 dark:border-amber-800/70 bg-amber-50/25 dark:bg-amber-950/15'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80'
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[11px] font-black text-blue-900 dark:text-sky-300 uppercase tracking-wide">
                                Item #{idx + 1} — {draft.itemName}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                  isOpsDraft
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                    : 'bg-teal-100 text-[#0D9488] dark:bg-teal-950 dark:text-teal-300'
                                }`}
                              >
                                {draft.categoryLabel}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-[9px] font-semibold">
                                {draft.poNumber} • {draft.supplierName}
                              </span>
                              {draft.existingQcId && !editingQCRecord && (
                                <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 text-[9px] font-bold">
                                  Tercatat di QC (Update)
                                </span>
                              )}
                            </div>
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
                )}
              </div>
            );
          })()}

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
                  <th className="p-2.5 text-center">Status Item</th>
                  <th className="p-2.5 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {sortPOItemsBahanThenOperasional(
                  selectedPOForDetail.items,
                  selectedPOForDetail,
                  rabList
                ).map((it, idx) => {
                  const st = resolvePOItemApprovalStatus(it, selectedPOForDetail);
                  return (
                    <tr key={idx} className={st === 'Ditolak' ? 'opacity-60 bg-rose-50/40 dark:bg-rose-950/20' : ''}>
                      <td className="p-2.5">{idx + 1}</td>
                      <td className={`p-2.5 font-sans font-bold ${st === 'Ditolak' ? 'line-through text-slate-400' : ''}`}>
                        {it.itemName}
                      </td>
                      <td className="p-2.5 text-center">{formatNumber(it.quantity)} {it.unit}</td>
                      <td className="p-2.5 text-right">{formatRupiah(it.unitPrice)}</td>
                      <td className="p-2.5 text-center font-sans">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            st === 'Disetujui'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : st === 'Ditolak'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {st}
                        </span>
                      </td>
                      <td className={`p-2.5 text-right font-black ${st === 'Ditolak' ? 'line-through text-slate-400' : ''}`}>
                        {formatRupiah(it.subtotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50 dark:bg-slate-900 font-mono font-bold border-t border-slate-200 dark:border-slate-800">
                <tr>
                  <td colSpan={5} className="p-2.5 text-right font-sans uppercase">Total Nilai Pesanan (Item Aktif):</td>
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

      <ConfirmDialog
        isOpen={Boolean(rabDeleteConfirm)}
        onClose={() => setRabDeleteConfirm(null)}
        onConfirm={handleConfirmDeleteRAB}
        title="Hapus Item RAB & Rincian"
        message={`Apakah Anda yakin ingin menghapus item RAB "${rabDeleteConfirm?.budgetCode || ''} — ${rabDeleteConfirm?.itemName || ''}" beserta rinciannya? Penghapusan ini hanya berlaku di RAB dan TIDAK menghapus Menu PLOG maupun Food Cost PLOG.`}
        confirmLabel="Ya, Hapus RAB"
        isDestructive
      />
    </div>
  );
};
