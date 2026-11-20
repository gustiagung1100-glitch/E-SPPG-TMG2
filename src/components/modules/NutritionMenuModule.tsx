import React, { useState, useMemo, useEffect } from 'react';
import { useApp, isMatchingMaterialName } from '../../lib/store';
import { processMultipleImageUploads } from '../common/FacilityTempUploadSection';
import { DataTable, Column } from '../common/DataTable';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { PrintHeader } from '../common/PrintHeader';
import { BeneficiaryNutritionTab } from './BeneficiaryNutritionTab';
import {
  exportTableToPDF,
  exportToExcel,
  formatRupiah,
  formatNumber,
  triggerPrint,
  formatIndonesianDate,
} from '../../lib/exportUtils';
import {
  MenuItem,
  MenuItemGrammage,
  RecipeIngredient,
  RecipeIngredientManualOverrides,
  FoodCompositionItem,
  NutritionTargetConfig,
  DivisionJobdesk,
} from '../../types';
import { resolveRecipeIngredientFormula } from '../../lib/supplyChainSync';
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
  getCustomTableFields,
  getInitialCustomFieldValues,
  formatDynamicFieldValue,
} from '../../lib/dynamicFormSchemas';
import {
  defaultFoodCompositions,
  defaultNutritionTarget,
  sampleIngredientsMenu1,
  buildDefaultGrammagesForMenu,
  resolveMenuGrammages,
} from '../../lib/plogData';
import {
  UtensilsCrossed,
  Plus,
  CheckCircle,
  Eye,
  Edit,
  Trash2,
  Apple,
  Sparkles,
  Award,
  AlertCircle,
  Clock,
  Calculator,
  Scale,
  Coins,
  DollarSign,
  Users2,
  FileSpreadsheet,
  Printer,
  Upload,
  Image,
  Layers,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  Check,
  AlertTriangle,
  Info,
  ChevronRight,
  BookOpen,
  Settings2,
  Flame,
  Percent,
  RefreshCw,
  Camera,
  ChevronLeft,
  X,
  Star,
  HeartPulse,
  RotateCcw,
} from 'lucide-react';

type SubModuleTab =
  | 'menu_bahan'
  | 'gramasi_item'
  | 'kandungan_gizi'
  | 'food_cost'
  | 'jobdesk_divisi';

interface FormulaNumericCellProps {
  value: number;
  decimals?: number;
  isOverridden?: boolean;
  allowResetOnEmpty?: boolean;
  onCommit: (nextValue: number | undefined) => void;
  ariaLabel: string;
  suffix?: string;
  min?: number;
  max?: number;
  inputClassName?: string;
  align?: 'left' | 'center' | 'right';
}

const FormulaNumericCell: React.FC<FormulaNumericCellProps> = ({
  value,
  decimals = 0,
  isOverridden = false,
  allowResetOnEmpty = true,
  onCommit,
  ariaLabel,
  suffix,
  min = 0,
  max,
  inputClassName = '',
  align = 'center',
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [draft, setDraft] = useState('');

  const safeVal = Number.isFinite(value) ? value : 0;
  const formattedDisplay = isOverridden
    ? String(Number(safeVal.toFixed(Math.max(decimals, 2))))
    : decimals === 0
    ? String(Math.round(safeVal))
    : safeVal.toFixed(decimals);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    setDraft(String(Number(safeVal.toFixed(Math.max(decimals, 2)))));
    setTimeout(() => e.target.select(), 0);
  };

  const commitDraft = () => {
    setIsFocused(false);
    const trimmed = draft.trim().replace(',', '.');
    if (trimmed === '') {
      if (allowResetOnEmpty) {
        onCommit(undefined);
      }
      return;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) return;
    let clamped = Math.max(min, parsed);
    if (typeof max === 'number') clamped = Math.min(max, clamped);
    onCommit(clamped);
  };

  const alignClass =
    align === 'right' ? 'text-right' : align === 'left' ? 'text-left' : 'text-center';

  return (
    <div className="inline-flex items-center justify-center gap-0.5 max-w-full">
      <span className="hidden print:inline font-mono">
        {formattedDisplay}
        {suffix || ''}
      </span>
      <input
        type="text"
        inputMode="decimal"
        aria-label={ariaLabel}
        title={
          isOverridden
            ? 'Diedit manual • Kosongkan untuk kembali ke rumus otomatis'
            : 'Klik untuk edit manual'
        }
        value={isFocused ? draft : formattedDisplay}
        onFocus={handleFocus}
        onChange={e => setDraft(e.target.value)}
        onBlur={commitDraft}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.currentTarget.blur();
          } else if (e.key === 'Escape') {
            setIsFocused(false);
            setDraft('');
            e.currentTarget.blur();
          }
        }}
        className={`print:hidden px-1 py-0.5 rounded font-mono border transition focus:outline-none focus:ring-1 focus:ring-sky-500 ${alignClass} ${
          isOverridden
            ? 'border-amber-400 bg-amber-50/90 text-amber-950 dark:border-amber-600 dark:bg-amber-950/60 dark:text-amber-200 font-bold'
            : 'border-transparent hover:border-slate-300 dark:hover:border-slate-600 bg-transparent focus:bg-white dark:focus:bg-slate-800 focus:border-sky-400'
        } ${inputClassName}`}
      />
      {suffix && <span className="print:hidden text-[9px] text-slate-400">{suffix}</span>}
    </div>
  );
};

export const NutritionMenuModule: React.FC = () => {
  const {
    menuItems,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    approveMenuItem,
    menuIngredientsMap,
    updateMenuIngredients,
    divisionJobdesks: jobdesks,
    updateDivisionJobdesks: setJobdesks,
    inventory,
    masterBahan,
    syncMenuNeedsToRAB,
    institutions,
    masterUnits,
    currentUser,
    hasPermission,
    sppgConfig,
    updateSPPGConfig,
    addToast,
    dynamicFormSchemas,
  } = useApp();

  const [isEditingMenuForm, setIsEditingMenuForm] = useState(false);
  const [isModalMenuSchemaEdit, setIsModalMenuSchemaEdit] = useState(false);
  const [isZScoreModalOpen, setIsZScoreModalOpen] = useState(false);

  // Active Sub-module Tab
  const [activeTab, setActiveTab] = useState<SubModuleTab>('menu_bahan');

  useEffect(() => {
    const labels: Record<SubModuleTab, string> = {
      menu_bahan: 'Perencanaan Menu oleh PLOG & Bahan (BDD)',
      gramasi_item: 'Gramasi Item Menu (Porsi Kecil & Besar)',
      kandungan_gizi: 'Evaluasi Kandungan Gizi (TKPI)',
      food_cost: 'Analisis Food Cost & Pagu BGN',
      jobdesk_divisi: 'Jobdesk Divisi & SOP',
    };
    window.dispatchEvent(
      new CustomEvent('sppg-subtab-change', {
        detail: { module: 'menu', title: labels[activeTab] },
      })
    );
  }, [activeTab]);

  // Selected Active Menu for PLOG details (default: first menu)
  const [selectedMenuId, setSelectedMenuId] = useState<string>(menuItems[0]?.id || 'menu-1');

  // Default Buffer (%) for Porsi Kecil & Porsi Besar (editable per menu/baris)
  const [defaultBufferSmallPct, setDefaultBufferSmallPct] = useState<number>(2);
  const [defaultBufferLargePct, setDefaultBufferLargePct] = useState<number>(2);

  // Food Composition Database
  const [foodCompositions, setFoodCompositions] = useState<FoodCompositionItem[]>(defaultFoodCompositions);

  // Nutrition Target Config (AKG)
  const [nutritionTarget, setNutritionTarget] = useState<NutritionTargetConfig>(defaultNutritionTarget);
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);

  // Two-category Pagu Anggaran Draft State (Porsi Besar 10.000 & Porsi Kecil 8.000)
  const [smallCapDraft, setSmallCapDraft] = useState<number>(sppgConfig.smallPortionBudget || 8000);
  const [largeCapDraft, setLargeCapDraft] = useState<number>(sppgConfig.largePortionBudget || 10000);

  useEffect(() => {
    setSmallCapDraft(sppgConfig.smallPortionBudget || 8000);
    setLargeCapDraft(sppgConfig.largePortionBudget || 10000);
  }, [sppgConfig.smallPortionBudget, sppgConfig.largePortionBudget]);

  const [isJobdeskModalOpen, setIsJobdeskModalOpen] = useState(false);
  const [selectedJobdesk, setSelectedJobdesk] = useState<DivisionJobdesk | null>(null);
  const [jobdeskEditForm, setJobdeskEditForm] = useState<{
    divisionName: DivisionJobdesk['divisionName'];
    ingredientsHandled: string;
    tasks: string;
    photoCaption: string;
    picName: string;
    status: DivisionJobdesk['status'];
    photoUrls: string[];
  }>({
    divisionName: 'Relawan Div. Persiapan',
    ingredientsHandled: '',
    tasks: '',
    photoCaption: '',
    picName: '',
    status: 'Belum Mulai',
    photoUrls: [],
  });
  const [photoLightbox, setPhotoLightbox] = useState<{
    divisionName: string;
    photos: string[];
    index: number;
    caption?: string;
  } | null>(null);

  // Modal State for Adding Ingredient to Menu
  const [isAddIngredientModalOpen, setIsAddIngredientModalOpen] = useState(false);
  const [selectedCompositionId, setSelectedCompositionId] = useState<string>(foodCompositions[0]?.id || '');
  const [customGramSmall, setCustomGramSmall] = useState<number>(50);
  const [customGramLarge, setCustomGramLarge] = useState<number>(75);
  const [customBdd, setCustomBdd] = useState<number>(100);
  const [customBufferSmallPct, setCustomBufferSmallPct] = useState<number>(2);
  const [customBufferLargePct, setCustomBufferLargePct] = useState<number>(2);
  const [customUnitPrice, setCustomUnitPrice] = useState<number>(30000);
  const [customPurchaseUnit, setCustomPurchaseUnit] = useState<string>(masterUnits[0]?.code || 'kg');

  // Modal State for Create Menu
  const [isCreateMenuModalOpen, setIsCreateMenuModalOpen] = useState(false);
  const [isSavingNewMenu, setIsSavingNewMenu] = useState(false);

  const buildSuggestedMenuCode = (existingMenus: MenuItem[]) => {
    let idx = existingMenus.length + 1;
    let candidate = `MBG-TMG2-H${String(idx).padStart(2, '0')}`;
    const existingCodes = new Set(existingMenus.map(m => m.menuCode.trim().toUpperCase()));
    while (existingCodes.has(candidate.toUpperCase())) {
      idx += 1;
      candidate = `MBG-TMG2-H${String(idx).padStart(2, '0')}`;
    }
    return candidate;
  };

  const [newMenuForm, setNewMenuForm] = useState<{
    date: string;
    dayName: string;
    cycleWeek: number;
    menuCode: string;
    stapleFood: string;
    animalProtein: string;
    plantProtein: string;
    vegetable: string;
    fruit: string;
    milkOrExtra: string;
    estimatedCostPerPortion: number;
    notes: string;
    customFields: Record<string, any>;
  }>(() => ({
    date: new Date().toISOString().slice(0, 10),
    dayName: 'Kamis',
    cycleWeek: 2,
    menuCode: buildSuggestedMenuCode(menuItems),
    stapleFood: '',
    animalProtein: '',
    plantProtein: '',
    vegetable: '',
    fruit: '',
    milkOrExtra: 'Susu UHT Plain 125ml',
    estimatedCostPerPortion: 9000,
    notes: '',
    customFields: getInitialCustomFieldValues(dynamicFormSchemas.menu_form),
  }));

  // Calculate actual total small & large portions from SPPG institutions
  const quotaSmall = useMemo(() => {
    const val = institutions.reduce((acc, i) => acc + i.smallPortions, 0);
    return val > 0 ? val : 1080;
  }, [institutions]);

  const quotaLarge = useMemo(() => {
    const val = institutions.reduce((acc, i) => acc + i.largePortions, 0);
    return val > 0 ? val : 1770;
  }, [institutions]);

  const totalBeneficiaries = quotaSmall + quotaLarge; // 2.850 porsi

  // Active Selected Menu Object
  const currentMenu = useMemo(() => {
    return menuItems.find(m => m.id === selectedMenuId) || menuItems[0];
  }, [menuItems, selectedMenuId]);

  const activeMenuId = currentMenu?.id || selectedMenuId;

  // Current Menu Ingredients List
  const currentIngredients = useMemo(() => {
    return menuIngredientsMap[activeMenuId] || [];
  }, [menuIngredientsMap, activeMenuId]);

  // ---------------------------------------------------------------------------
  // SUBMODUL B: GRAMASI ITEM MENU (PORSI KECIL VS PORSI BESAR)
  // Otomatis mengambil item hidangan dari Menu Baru di "Perencanaan Menu oleh PLOG"
  // ---------------------------------------------------------------------------
  const resolvedItemGrammages = useMemo((): MenuItemGrammage[] => {
    return resolveMenuGrammages(currentMenu, currentIngredients);
  }, [currentMenu, currentIngredients]);

  const [grammageDrafts, setGrammageDrafts] = useState<MenuItemGrammage[]>([]);
  const [editingGrammageItem, setEditingGrammageItem] = useState<MenuItemGrammage | null>(null);
  const [grammageEditForm, setGrammageEditForm] = useState<{
    categoryLabel: string;
    itemName: string;
    smallGrams: number;
    largeGrams: number;
    notes: string;
  }>({
    categoryLabel: 'Makanan Pokok',
    itemName: '',
    smallGrams: 100,
    largeGrams: 150,
    notes: '',
  });
  const [isAddGrammageModalOpen, setIsAddGrammageModalOpen] = useState(false);
  const [newGrammageForm, setNewGrammageForm] = useState<{
    categoryLabel: string;
    itemName: string;
    smallGrams: number;
    largeGrams: number;
    notes: string;
  }>({
    categoryLabel: 'Pelengkap / Tambahan',
    itemName: '',
    smallGrams: 25,
    largeGrams: 40,
    notes: '',
  });

  useEffect(() => {
    setGrammageDrafts(resolvedItemGrammages);
  }, [resolvedItemGrammages]);

  const hasUnsavedGrammageChanges = useMemo(() => {
    if (grammageDrafts.length !== resolvedItemGrammages.length) return true;
    return grammageDrafts.some((d, idx) => {
      const orig = resolvedItemGrammages[idx];
      if (!orig) return true;
      return (
        d.itemName !== orig.itemName ||
        d.categoryLabel !== orig.categoryLabel ||
        Number(d.smallGrams) !== Number(orig.smallGrams) ||
        Number(d.largeGrams) !== Number(orig.largeGrams) ||
        (d.notes || '') !== (orig.notes || '')
      );
    });
  }, [grammageDrafts, resolvedItemGrammages]);

  // ---------------------------------------------------------------------------
  // A. CALCULATIONS: PERENCANAAN MENU DAN BAHAN (FORMAT RINCIAN RESEP PORSI KECIL & BESAR)
  // ---------------------------------------------------------------------------
  // BK = BB / (BDD% / 100)
  // KEBUTUHAN = (BK * PORSI) dikonversi ke Satuan Beli
  // BUFFER = KEBUTUHAN * (Buffer% / 100)
  // TOTAL = KEBUTUHAN + BUFFER
  // PEMBULATAN = Math.ceil(TOTAL)
  // TOTAL KUANTITI = PEMBULATAN PORSI KECIL + PEMBULATAN PORSI BESAR
  const ingredientsCalculated = useMemo(() => {
    return currentIngredients.map(ing => {
      const formula = resolveRecipeIngredientFormula(
        ing,
        masterUnits,
        quotaSmall,
        quotaLarge,
        defaultBufferSmallPct,
        defaultBufferLargePct
      );

      const ov = ing.manualOverrides || {};
      const hasManualOverrides = Object.values(ov).some(
        v => v !== undefined && v !== null && v !== ''
      );

      // Nutrition contribution of this ingredient for small vs large portion:
      const calSmall = (ing.netWeightSmall / 100) * ing.calories100g;
      const protSmall = (ing.netWeightSmall / 100) * ing.protein100g;
      const fatSmall = (ing.netWeightSmall / 100) * ing.fat100g;
      const carbSmall = (ing.netWeightSmall / 100) * ing.carb100g;
      const fibSmall = (ing.netWeightSmall / 100) * ing.fiber100g;

      const calLarge = (ing.netWeightLarge / 100) * ing.calories100g;
      const protLarge = (ing.netWeightLarge / 100) * ing.protein100g;
      const fatLarge = (ing.netWeightLarge / 100) * ing.fat100g;
      const carbLarge = (ing.netWeightLarge / 100) * ing.carb100g;
      const fibLarge = (ing.netWeightLarge / 100) * ing.fiber100g;

      return {
        ...ing,
        ...formula,
        hasManualOverrides,
        displayTotalUnit:
          formula.unitSmall.toLowerCase() === formula.unitLarge.toLowerCase()
            ? formula.unitSmall
            : ing.purchaseUnit || formula.unitLarge,
        purchaseQty: formula.totalKuantiti,
        nutritionSmall: {
          calories: calSmall,
          protein: protSmall,
          fat: fatSmall,
          carbs: carbSmall,
          fiber: fibSmall,
        },
        nutritionLarge: {
          calories: calLarge,
          protein: protLarge,
          fat: fatLarge,
          carbs: carbLarge,
          fiber: fibLarge,
        },
      };
    });
  }, [
    currentIngredients,
    quotaSmall,
    quotaLarge,
    masterUnits,
    defaultBufferSmallPct,
    defaultBufferLargePct,
  ]);

  // Aggregate Total Net & Gross
  const totalNetWeightAllKg = useMemo(
    () => ingredientsCalculated.reduce((acc, i) => acc + i.totalNetKg, 0),
    [ingredientsCalculated]
  );
  const totalGrossWeightAllKg = useMemo(
    () => ingredientsCalculated.reduce((acc, i) => acc + i.totalGrossKg, 0),
    [ingredientsCalculated]
  );
  const totalMenuProcurementCost = useMemo(
    () => ingredientsCalculated.reduce((acc, i) => acc + i.totalCost, 0),
    [ingredientsCalculated]
  );

  // ---------------------------------------------------------------------------
  // B. CALCULATIONS: INPUT & EVALUASI KANDUNGAN GIZI
  // ---------------------------------------------------------------------------
  const nutritionSummarySmall = useMemo(() => {
    return {
      calories: ingredientsCalculated.reduce((acc, i) => acc + i.nutritionSmall.calories, 0),
      protein: ingredientsCalculated.reduce((acc, i) => acc + i.nutritionSmall.protein, 0),
      fat: ingredientsCalculated.reduce((acc, i) => acc + i.nutritionSmall.fat, 0),
      carbs: ingredientsCalculated.reduce((acc, i) => acc + i.nutritionSmall.carbs, 0),
      fiber: ingredientsCalculated.reduce((acc, i) => acc + i.nutritionSmall.fiber, 0),
    };
  }, [ingredientsCalculated]);

  const nutritionSummaryLarge = useMemo(() => {
    return {
      calories: ingredientsCalculated.reduce((acc, i) => acc + i.nutritionLarge.calories, 0),
      protein: ingredientsCalculated.reduce((acc, i) => acc + i.nutritionLarge.protein, 0),
      fat: ingredientsCalculated.reduce((acc, i) => acc + i.nutritionLarge.fat, 0),
      carbs: ingredientsCalculated.reduce((acc, i) => acc + i.nutritionLarge.carbs, 0),
      fiber: ingredientsCalculated.reduce((acc, i) => acc + i.nutritionLarge.fiber, 0),
    };
  }, [ingredientsCalculated]);

  // Evaluator function against configured nutrition targets
  const evaluateTarget = (
    value: number,
    min: number,
    max: number,
    isTargetConfigured: boolean
  ) => {
    if (!isTargetConfigured) {
      return {
        status: 'UNCONFIGURED' as const,
        label: 'Belum Dikonfigurasi',
        colorClass: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
      };
    }
    if (value < min) {
      return {
        status: 'BELOW' as const,
        label: `Kurang (< ${min})`,
        colorClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
      };
    }
    if (value > max) {
      return {
        status: 'ABOVE' as const,
        label: `Melebihi (> ${max})`,
        colorClass: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300',
      };
    }
    return {
      status: 'MET' as const,
      label: 'Sesuai Standar AKG',
      colorClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
    };
  };

  // ---------------------------------------------------------------------------
  // C. CALCULATIONS: INPUT FOOD COST MENU (2 KATEGORI PAGU ANGGARAN)
  // ---------------------------------------------------------------------------
  // Porsi Kecil = Rp 8.000 (default) | Porsi Besar = Rp 10.000 (default)
  const smallBudgetCap = sppgConfig.smallPortionBudget || 8000;
  const largeBudgetCap = sppgConfig.largePortionBudget || 10000;
  const totalBudgetCapSmall = quotaSmall * smallBudgetCap;
  const totalBudgetCapLarge = quotaLarge * largeBudgetCap;
  const totalBudgetCap = totalBudgetCapSmall + totalBudgetCapLarge;
  const avgBudgetCapPerPortion =
    totalBeneficiaries > 0 ? totalBudgetCap / totalBeneficiaries : largeBudgetCap;

  // Average food cost per portion
  const avgFoodCostPerPortion = totalBeneficiaries > 0 ? totalMenuProcurementCost / totalBeneficiaries : 0;

  // Cost per specific portion category
  const costPerPortionSmall = ingredientsCalculated.reduce((acc, i) => acc + i.costPortionSmall, 0);
  const costPerPortionLarge = ingredientsCalculated.reduce((acc, i) => acc + i.costPortionLarge, 0);

  // Percent to respective category budget cap
  const percentToCapAvg = avgBudgetCapPerPortion > 0 ? (avgFoodCostPerPortion / avgBudgetCapPerPortion) * 100 : 0;
  const percentToCapSmall = smallBudgetCap > 0 ? (costPerPortionSmall / smallBudgetCap) * 100 : 0;
  const percentToCapLarge = largeBudgetCap > 0 ? (costPerPortionLarge / largeBudgetCap) * 100 : 0;

  // Selisih terhadap anggaran masing-masing kategori & total (positif = hemat, negatif = melebihi pagu)
  const budgetDiffSmallPerPortion = smallBudgetCap - costPerPortionSmall;
  const budgetDiffLargePerPortion = largeBudgetCap - costPerPortionLarge;
  const budgetDifferenceTotal = totalBudgetCap - totalMenuProcurementCost;
  const budgetDifferencePerPortion = avgBudgetCapPerPortion - avgFoodCostPerPortion;

  const handleSaveBudgetCaps = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasPermission('menu', 'edit')) {
      addToast('error', 'Akses Ditolak', 'Anda tidak memiliki izin mengubah pagu anggaran.');
      return;
    }
    const nextSmall = Math.max(0, Math.round(Number(smallCapDraft) || 0));
    const nextLarge = Math.max(0, Math.round(Number(largeCapDraft) || 0));
    await updateSPPGConfig({
      smallPortionBudget: nextSmall,
      largePortionBudget: nextLarge,
    });
  };

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------
  const resolveLiveMaterialPriceAndUnit = (comp: FoodCompositionItem) => {
    const invMatch = inventory.find(inv => isMatchingMaterialName(inv.name, comp.name));
    const mbMatch = masterBahan.find(mb => isMatchingMaterialName(mb.name, comp.name));
    return {
      unitPrice: invMatch?.pricePerUnit || mbMatch?.actualPrice || comp.defaultUnitPrice,
      purchaseUnit: invMatch?.unit || mbMatch?.unit || comp.purchaseUnit || masterUnits[0]?.code || 'kg',
    };
  };

  const handleOpenAddIngredient = () => {
    const comp = foodCompositions[0];
    if (comp) {
      const live = resolveLiveMaterialPriceAndUnit(comp);
      setSelectedCompositionId(comp.id);
      setCustomBdd(comp.ediblePortion);
      setCustomUnitPrice(live.unitPrice);
      setCustomPurchaseUnit(live.purchaseUnit);
      setCustomGramSmall(comp.category === 'Makanan Pokok' ? 85 : 50);
      setCustomGramLarge(comp.category === 'Makanan Pokok' ? 125 : 75);
    }
    setIsAddIngredientModalOpen(true);
  };

  const handleCompositionChange = (compId: string) => {
    setSelectedCompositionId(compId);
    const comp = foodCompositions.find(c => c.id === compId);
    if (comp) {
      const live = resolveLiveMaterialPriceAndUnit(comp);
      setCustomBdd(comp.ediblePortion);
      setCustomUnitPrice(live.unitPrice);
      setCustomPurchaseUnit(live.purchaseUnit);
    }
  };

  const handleSaveIngredientToMenu = (e: React.FormEvent) => {
    e.preventDefault();
    const comp = foodCompositions.find(c => c.id === selectedCompositionId);
    if (!comp) return;

    const chosenUnitCode = customPurchaseUnit || comp.purchaseUnit || 'kg';
    const unitMeta = masterUnits.find(
      u => u.code.trim().toLowerCase() === chosenUnitCode.trim().toLowerCase()
    );
    const convFactor =
      unitMeta && (unitMeta.baseUnit === 'gram' || unitMeta.baseUnit === 'ml') && unitMeta.conversionToBase > 0
        ? Number((1 / unitMeta.conversionToBase).toFixed(6))
        : chosenUnitCode === 'pcs'
        ? 1
        : 0.001;

    const newIng: RecipeIngredient = {
      id: `ing-${Date.now()}`,
      name: comp.name,
      category: comp.category,
      netWeightSmall: Number(customGramSmall),
      netWeightLarge: Number(customGramLarge),
      unit: unitMeta?.baseUnit === 'satuan' ? chosenUnitCode : 'gram',
      ediblePortionPercent: Number(customBdd),
      conversionFactorToBase: convFactor,
      purchaseUnit: chosenUnitCode,
      bufferPercentSmall: Number(customBufferSmallPct),
      bufferPercentLarge: Number(customBufferLargePct),
      unitPrice: Number(customUnitPrice),
      calories100g: comp.calories,
      protein100g: comp.protein,
      fat100g: comp.fat,
      carb100g: comp.carbs,
      fiber100g: comp.fiber,
      referenceSource: comp.sourceReference,
    };

    const nextList = [...(menuIngredientsMap[activeMenuId] || []), newIng];
    updateMenuIngredients(activeMenuId, nextList);

    addToast('success', 'Bahan Ditambahkan & Tersinkron', `${comp.name} ditambahkan. Food Cost & Gizi ${currentMenu?.menuCode || 'Menu'} diperbarui real-time.`);
    setIsAddIngredientModalOpen(false);
  };

  const handleUpdateIngredientBuffer = (
    ingId: string,
    field: 'bufferPercentSmall' | 'bufferPercentLarge',
    value: number
  ) => {
    const safeVal = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
    const overrideKey = field === 'bufferPercentSmall' ? 'bufferSmall' : 'bufferLarge';
    const nextList = (menuIngredientsMap[activeMenuId] || []).map(item => {
      if (item.id !== ingId) return item;
      const nextOverrides = item.manualOverrides ? { ...item.manualOverrides } : undefined;
      if (nextOverrides) {
        delete nextOverrides[overrideKey];
      }
      return {
        ...item,
        [field]: safeVal,
        manualOverrides:
          nextOverrides && Object.keys(nextOverrides).length > 0 ? nextOverrides : undefined,
      };
    });
    updateMenuIngredients(activeMenuId, nextList);
  };

  const handleUpdateIngredientBaseField = (
    ingId: string,
    field: 'name' | 'netWeightSmall' | 'netWeightLarge',
    value: string | number
  ) => {
    const nextList = (menuIngredientsMap[activeMenuId] || []).map(item => {
      if (item.id !== ingId) return item;
      if (field === 'name') {
        const cleaned = String(value).trim();
        return { ...item, name: cleaned || item.name };
      }
      const parsed = Number(value);
      const safeNum = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
      return { ...item, [field]: safeNum };
    });
    updateMenuIngredients(activeMenuId, nextList);
  };

  const handleUpdateFormulaOverride = (
    ingId: string,
    key: keyof RecipeIngredientManualOverrides,
    value: number | string | undefined
  ) => {
    const nextList = (menuIngredientsMap[activeMenuId] || []).map(item => {
      if (item.id !== ingId) return item;
      const nextOverrides: RecipeIngredientManualOverrides = {
        ...(item.manualOverrides || {}),
      };
      if (value === undefined || value === '') {
        delete nextOverrides[key];
      } else if (key === 'unitSmall' || key === 'unitLarge') {
        const cleanedUnit = String(value).trim();
        if (!cleanedUnit || cleanedUnit === (item.purchaseUnit || 'kg')) {
          delete nextOverrides[key];
        } else {
          nextOverrides[key] = cleanedUnit;
        }
      } else {
        const num = Number(value);
        if (!Number.isFinite(num) || num < 0) return item;
        nextOverrides[key] = key === 'bddSmall' || key === 'bddLarge' ? Math.max(1, Math.min(100, num)) : num;
      }
      return {
        ...item,
        manualOverrides: Object.keys(nextOverrides).length > 0 ? nextOverrides : undefined,
      };
    });
    updateMenuIngredients(activeMenuId, nextList);
  };

  const handleResetIngredientOverrides = (ingId: string) => {
    const nextList = (menuIngredientsMap[activeMenuId] || []).map(item =>
      item.id === ingId ? { ...item, manualOverrides: undefined } : item
    );
    updateMenuIngredients(activeMenuId, nextList);
    addToast(
      'info',
      'Rumus Dikembalikan Otomatis',
      'Nilai input manual pada baris bahan ini dikembalikan ke perhitungan rumus otomatis.'
    );
  };

  const handleDeleteIngredient = (ingId: string) => {
    const nextList = (menuIngredientsMap[activeMenuId] || []).filter(i => i.id !== ingId);
    updateMenuIngredients(activeMenuId, nextList);
    addToast('info', 'Bahan Dihapus', 'Bahan resep telah dikeluarkan dan Food Cost diperbarui.');
  };

  const handleSyncActiveMenuToRAB = async () => {
    if (ingredientsCalculated.length === 0) {
      addToast('warning', 'Resep Kosong', 'Tambahkan minimal 1 bahan resep sebelum sinkronisasi ke RAB.');
      return;
    }
    await syncMenuNeedsToRAB(
      activeMenuId,
      ingredientsCalculated.map(i => ({
        name: i.name,
        category: i.category,
        quantity: i.totalKuantiti,
        unit: i.purchaseUnit,
        unitPrice: i.unitPrice,
      }))
    );
  };

  const handleCreateNewMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingNewMenu) return;

    const err = validateDynamicFormFields(dynamicFormSchemas.menu_form, {
      ...newMenuForm,
      ...(newMenuForm.customFields || {}),
    });
    if (err) {
      addToast('error', 'Validasi Form Menu', err);
      return;
    }

    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const safeDate = newMenuForm.date || new Date().toISOString().slice(0, 10);
    const parsedDay = new Date(`${safeDate}T00:00:00`);
    const computedDayName = Number.isNaN(parsedDay.getTime())
      ? newMenuForm.dayName || 'Kamis'
      : dayNames[parsedDay.getDay()];

    const safeMenuCode =
      (newMenuForm.menuCode || '').trim() || buildSuggestedMenuCode(menuItems);

    const tempMenuStub: Pick<
      MenuItem,
      'id' | 'stapleFood' | 'animalProtein' | 'plantProtein' | 'vegetable' | 'fruit' | 'milkOrExtra'
    > = {
      id: `menu-tmp-${Date.now()}`,
      stapleFood: (newMenuForm.stapleFood || '').trim() || 'Nasi Putih Pulen',
      animalProtein: (newMenuForm.animalProtein || '').trim() || 'Lauk Hewani Pilihan',
      plantProtein: (newMenuForm.plantProtein || '').trim() || 'Lauk Nabati Pilihan',
      vegetable: (newMenuForm.vegetable || '').trim() || 'Sayuran Segar',
      fruit: (newMenuForm.fruit || '').trim() || 'Buah Pilihan',
      milkOrExtra: (newMenuForm.milkOrExtra || '').trim() || 'Susu UHT Plain 125ml',
    };

    const initialRecipes = sampleIngredientsMenu1.map(ing => ({ ...ing }));
    const initialGrammages = buildDefaultGrammagesForMenu(tempMenuStub, initialRecipes);

    const payload: Omit<MenuItem, 'id'> = {
      date: safeDate,
      dayName: computedDayName,
      cycleWeek: newMenuForm.cycleWeek || 2,
      menuCode: safeMenuCode,
      stapleFood: tempMenuStub.stapleFood,
      animalProtein: tempMenuStub.animalProtein,
      plantProtein: tempMenuStub.plantProtein,
      vegetable: tempMenuStub.vegetable,
      fruit: tempMenuStub.fruit,
      milkOrExtra: tempMenuStub.milkOrExtra,
      caloriesSmall: Math.round(nutritionSummarySmall.calories || 620),
      caloriesLarge: Math.round(nutritionSummaryLarge.calories || 870),
      proteinGrams: Number(nutritionSummaryLarge.protein.toFixed(1)) || 28.5,
      carbGrams: Number(nutritionSummaryLarge.carbs.toFixed(1)) || 95.0,
      fatGrams: Number(nutritionSummaryLarge.fat.toFixed(1)) || 20.0,
      fiberGrams: Number(nutritionSummaryLarge.fiber.toFixed(1)) || 7.0,
      targetPortions: totalBeneficiaries,
      estimatedCostPerPortion: Math.round(avgFoodCostPerPortion || 9000),
      status: 'Draft',
      notes: (newMenuForm.notes || '').trim() || 'Standar gizi terintegrasi PLOG.',
      ingredients: initialRecipes,
      itemGrammages: initialGrammages,
      customFields: newMenuForm.customFields || {},
    };

    setIsSavingNewMenu(true);
    try {
      const createdMenu = await addMenuItem(payload);
      setSelectedMenuId(createdMenu.id);
      setNewMenuForm(prev => ({
        ...prev,
        menuCode: buildSuggestedMenuCode([...menuItems, createdMenu]),
        stapleFood: '',
        animalProtein: '',
        plantProtein: '',
        vegetable: '',
        fruit: '',
        notes: '',
        customFields: getInitialCustomFieldValues(dynamicFormSchemas.menu_form),
      }));
      setIsCreateMenuModalOpen(false);
      addToast(
        'success',
        'Menu Baru Dibuat & Tersinkron',
        `Menu ${createdMenu.menuCode} beserta ${createdMenu.itemGrammages?.length || initialGrammages.length} item menu & kebutuhan RAB berhasil tersimpan.`
      );
    } catch (saveError) {
      addToast(
        'error',
        'Gagal Menyimpan Menu',
        saveError instanceof Error
          ? saveError.message
          : 'Terjadi kesalahan saat menyimpan menu baru.'
      );
    } finally {
      setIsSavingNewMenu(false);
    }
  };

  // Handlers Submodul B: Gramasi Item Menu (Manual Edit & Sinkron PLOG)
  const handleInlineGrammageChange = (
    itemId: string,
    field: 'smallGrams' | 'largeGrams' | 'itemName',
    value: string | number
  ) => {
    setGrammageDrafts(prev =>
      prev.map(row => {
        if (row.id !== itemId) return row;
        if (field === 'itemName') {
          return { ...row, itemName: String(value), isManuallyEdited: true };
        }
        const safeNum = Math.max(0, Number(value) || 0);
        return { ...row, [field]: safeNum, isManuallyEdited: true };
      })
    );
  };

  const handleSaveAllGrammageDrafts = async () => {
    if (!currentMenu) return;
    const cleaned = grammageDrafts.map(g => ({
      ...g,
      itemName: g.itemName.trim() || 'Item Menu',
      smallGrams: Math.max(0, Number(g.smallGrams) || 0),
      largeGrams: Math.max(0, Number(g.largeGrams) || 0),
    }));
    await updateMenuItem(currentMenu.id, { itemGrammages: cleaned });
    addToast(
      'success',
      'Gramasi Item Menu Disimpan',
      `Berat gramasi Porsi Kecil & Porsi Besar untuk ${currentMenu.menuCode} berhasil diperbarui.`
    );
  };

  const handleOpenEditGrammageModal = (row: MenuItemGrammage) => {
    setEditingGrammageItem(row);
    setGrammageEditForm({
      categoryLabel: row.categoryLabel,
      itemName: row.itemName,
      smallGrams: row.smallGrams,
      largeGrams: row.largeGrams,
      notes: row.notes || '',
    });
  };

  const handleSaveEditGrammageModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMenu || !editingGrammageItem) return;
    const nextList = grammageDrafts.map(item =>
      item.id === editingGrammageItem.id
        ? {
            ...item,
            categoryLabel: grammageEditForm.categoryLabel.trim() || item.categoryLabel,
            itemName: grammageEditForm.itemName.trim() || item.itemName,
            smallGrams: Math.max(0, Number(grammageEditForm.smallGrams) || 0),
            largeGrams: Math.max(0, Number(grammageEditForm.largeGrams) || 0),
            notes: grammageEditForm.notes.trim(),
            isManuallyEdited: true,
          }
        : item
    );
    setGrammageDrafts(nextList);
    await updateMenuItem(currentMenu.id, { itemGrammages: nextList });
    setEditingGrammageItem(null);
    addToast(
      'success',
      'Item Menu Diedit',
      `Gramasi "${grammageEditForm.itemName}" berhasil disimpan secara manual.`
    );
  };

  const handleAddManualGrammageItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMenu || !newGrammageForm.itemName.trim()) return;
    const added: MenuItemGrammage = {
      id: `${currentMenu.id}-gram-custom-${Date.now()}`,
      categoryKey: 'custom',
      categoryLabel: newGrammageForm.categoryLabel.trim() || 'Pelengkap / Tambahan',
      itemName: newGrammageForm.itemName.trim(),
      smallGrams: Math.max(0, Number(newGrammageForm.smallGrams) || 0),
      largeGrams: Math.max(0, Number(newGrammageForm.largeGrams) || 0),
      notes: newGrammageForm.notes.trim() || 'Item menu tambahan (manual)',
      isManuallyEdited: true,
    };
    const nextList = [...grammageDrafts, added];
    setGrammageDrafts(nextList);
    await updateMenuItem(currentMenu.id, { itemGrammages: nextList });
    setNewGrammageForm({
      categoryLabel: 'Pelengkap / Tambahan',
      itemName: '',
      smallGrams: 25,
      largeGrams: 40,
      notes: '',
    });
    setIsAddGrammageModalOpen(false);
    addToast('success', 'Item Menu Ditambahkan', `"${added.itemName}" ditambahkan ke daftar gramasi menu.`);
  };

  const handleDeleteGrammageItem = async (itemId: string) => {
    if (!currentMenu) return;
    const nextList = grammageDrafts.filter(g => g.id !== itemId);
    setGrammageDrafts(nextList);
    await updateMenuItem(currentMenu.id, { itemGrammages: nextList });
    addToast('info', 'Item Dihapus', 'Item menu tambahan berhasil dihapus dari daftar gramasi.');
  };

  const handleSyncGrammagesFromPLOG = async () => {
    if (!currentMenu) return;
    const freshDefaults = buildDefaultGrammagesForMenu(currentMenu, currentIngredients);
    const customOnly = grammageDrafts.filter(g => g.categoryKey === 'custom');
    const nextList = [...freshDefaults, ...customOnly];
    setGrammageDrafts(nextList);
    await updateMenuItem(currentMenu.id, { itemGrammages: nextList });
    addToast(
      'success',
      'Tersinkron dari Menu PLOG',
      `Daftar item menu ${currentMenu.menuCode} disinkronkan ulang dari Perencanaan Menu oleh PLOG.`
    );
  };

  const handleExportGrammagePDF = () => {
    const totalSmall = grammageDrafts.reduce((s, i) => s + (Number(i.smallGrams) || 0), 0);
    const totalLarge = grammageDrafts.reduce((s, i) => s + (Number(i.largeGrams) || 0), 0);
    exportTableToPDF({
      title: 'DAFTAR GRAMASI ITEM MENU (PORSI KECIL & PORSI BESAR)',
      subtitle: `Menu: ${currentMenu?.menuCode || '-'} (${currentMenu?.dayName || '-'}, ${formatIndonesianDate(currentMenu?.date || '')}) • SPPG TMG2`,
      headers: [
        'No',
        'Kategori Hidangan',
        'Nama Item Menu (PLOG)',
        'Porsi Kecil (gram)',
        'Porsi Besar (gram)',
        'Selisih (B-K)',
        'Status',
      ],
      rows: [
        ...grammageDrafts.map((g, idx) => [
          idx + 1,
          g.categoryLabel,
          g.itemName,
          `${g.smallGrams} gram`,
          `${g.largeGrams} gram`,
          `${g.largeGrams - g.smallGrams >= 0 ? '+' : ''}${g.largeGrams - g.smallGrams} gram`,
          g.isManuallyEdited ? 'Diedit Manual' : 'Sinkron PLOG',
        ]),
        ['', 'TOTAL GRAMASI PER SAJIAN', `${grammageDrafts.length} Item Menu`, `${totalSmall} gram`, `${totalLarge} gram`, `+${totalLarge - totalSmall} gram`, ''],
      ],
      fileName: `Gramasi_Item_Menu_${currentMenu?.menuCode || 'MBG'}`,
      orientation: 'landscape',
      sppgConfig,
      signerName: sppgConfig.nutritionOfficer,
      signerRole: 'Pengawas Gizi Dietisien SPPG TMG2',
    });
  };

  const handleExportGrammageExcel = () => {
    const rows = grammageDrafts.map((g, idx) => ({
      No: idx + 1,
      'Kode Menu': currentMenu?.menuCode || '-',
      'Kategori Hidangan': g.categoryLabel,
      'Nama Item Menu': g.itemName,
      'Gramasi Porsi Kecil (gram)': g.smallGrams,
      'Gramasi Porsi Besar (gram)': g.largeGrams,
      'Selisih (gram)': g.largeGrams - g.smallGrams,
      'Sumber Data': g.isManuallyEdited ? 'Diedit Manual' : 'Sinkron Menu PLOG',
      Catatan: g.notes || '-',
    }));
    exportToExcel(rows, `Gramasi_Item_Menu_${currentMenu?.menuCode || 'MBG'}`, 'Gramasi Item Menu');
  };

  const handleExportMenusPDF = () => {
    const baseHeaders = ['Tanggal', 'Kode Menu', 'Makanan Pokok', 'Lauk Hewani', 'Nabati & Sayur', 'Buah & Susu', 'Status'];
    const baseRows = menuItems.map(m => [
      `${m.dayName}, ${formatIndonesianDate(m.date)}`,
      m.menuCode,
      m.stapleFood,
      m.animalProtein,
      `${m.plantProtein} / ${m.vegetable}`,
      `${m.fruit} (${m.milkOrExtra})`,
      m.status,
    ]);
    const { headers, rows } = appendDynamicExportColumns(
      dynamicFormSchemas.menu_form,
      baseHeaders,
      baseRows,
      menuItems
    );
    exportTableToPDF({
      title: 'Daftar Perencanaan Menu Harian MBG',
      subtitle: `SPPG Probolinggo Krejengan Temenggungan 2 • Yayasan Hafshawaty`,
      headers,
      rows,
      fileName: 'Daftar_Menu_Makanan_MBG_SPPG_TMG2',
      sppgConfig,
      signerName: sppgConfig.nutritionOfficer,
      signerRole: 'Pengawas Gizi Dietisien SPPG TMG2',
    });
  };

  const handleExportMenusExcel = () => {
    const dataToExport = menuItems.map(m =>
      appendDynamicExcelFields(
        dynamicFormSchemas.menu_form,
        {
          'Tanggal': m.date,
          'Hari': m.dayName,
          'Kode Menu': m.menuCode,
          'Makanan Pokok': m.stapleFood,
          'Lauk Hewani': m.animalProtein,
          'Lauk Nabati': m.plantProtein,
          'Sayuran': m.vegetable,
          'Buah': m.fruit,
          'Pelengkap / Susu': m.milkOrExtra,
          'Kalori Kecil (kkal)': m.caloriesSmall,
          'Kalori Besar (kkal)': m.caloriesLarge,
          'Status': m.status,
          'Catatan': m.notes || '-',
        },
        m
      )
    );
    exportToExcel(dataToExport, 'Daftar_Menu_Makanan_MBG_SPPG_TMG2', 'Daftar Menu');
  };

  const getJobdeskPhotos = (job: DivisionJobdesk): string[] => {
    if (Array.isArray(job.photoUrls) && job.photoUrls.length > 0) {
      return job.photoUrls.filter(Boolean);
    }
    return job.photoUrl ? [job.photoUrl] : [];
  };

  // Jobdesk Multi-Photo Upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, jobdeskId: string) => {
    const targetJob = jobdesks.find(j => j.id === jobdeskId);
    await processMultipleImageUploads(
      e,
      dataUrls => {
        setJobdesks(prev =>
          prev.map(j => {
            if (j.id !== jobdeskId) return j;
            const existing = getJobdeskPhotos(j);
            const nextPhotos = [...existing, ...dataUrls];
            return {
              ...j,
              photoUrls: nextPhotos,
              photoUrl: nextPhotos[0] || '',
            };
          })
        );
        const currentCount = targetJob ? getJobdeskPhotos(targetJob).length : 0;
        addToast(
          'success',
          `${dataUrls.length} Foto Ditambahkan`,
          `${dataUrls.length} foto dokumentasi ${targetJob?.divisionName || 'divisi'} berhasil diunggah (total ${currentCount + dataUrls.length} foto).`
        );
      },
      msg => addToast('error', 'Gagal Unggah Foto SOP', msg)
    );
  };

  const handleRemoveJobdeskPhoto = (jobdeskId: string, photoIndex: number) => {
    setJobdesks(prev =>
      prev.map(j => {
        if (j.id !== jobdeskId) return j;
        const existing = getJobdeskPhotos(j);
        const nextPhotos = existing.filter((_, idx) => idx !== photoIndex);
        return {
          ...j,
          photoUrls: nextPhotos,
          photoUrl: nextPhotos[0] || '',
        };
      })
    );
    addToast('info', 'Foto Dihapus', 'Foto dokumentasi SOP berhasil dihapus dari galeri divisi.');
  };

  const handleSetPrimaryJobdeskPhoto = (jobdeskId: string, photoIndex: number) => {
    setJobdesks(prev =>
      prev.map(j => {
        if (j.id !== jobdeskId) return j;
        const existing = getJobdeskPhotos(j);
        const chosen = existing[photoIndex];
        if (!chosen) return j;
        const nextPhotos = [chosen, ...existing.filter((_, idx) => idx !== photoIndex)];
        return {
          ...j,
          photoUrls: nextPhotos,
          photoUrl: chosen,
        };
      })
    );
    addToast('success', 'Foto Utama Diperbarui', 'Foto pilihan dijadikan sampul utama SOP divisi.');
  };

  const openJobdeskEditModal = (job: DivisionJobdesk) => {
    const existingPhotos = getJobdeskPhotos(job);
    setSelectedJobdesk(job);
    setJobdeskEditForm({
      divisionName: job.divisionName,
      ingredientsHandled: job.ingredientsHandled,
      tasks: job.tasks,
      photoCaption: job.photoCaption || '',
      picName: job.picName,
      status: job.status,
      photoUrls: existingPhotos,
    });
    setIsJobdeskModalOpen(true);
  };

  const handleModalMultiPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await processMultipleImageUploads(
      e,
      dataUrls => {
        setJobdeskEditForm(prev => ({
          ...prev,
          photoUrls: [...prev.photoUrls, ...dataUrls],
        }));
        addToast(
          'success',
          `${dataUrls.length} Foto Ditambahkan`,
          'Foto berhasil ditambahkan ke daftar unggahan SOP. Klik Simpan Perubahan SOP untuk menerapkan.'
        );
      },
      msg => addToast('error', 'Gagal Unggah Foto SOP', msg)
    );
  };

  const handleSaveJobdeskEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJobdesk) return;
    const cleanedPhotos = jobdeskEditForm.photoUrls.filter(Boolean);
    setJobdesks(prev =>
      prev.map(j =>
        j.id === selectedJobdesk.id
          ? {
              ...j,
              ingredientsHandled: jobdeskEditForm.ingredientsHandled.trim(),
              tasks: jobdeskEditForm.tasks.trim(),
              photoCaption: jobdeskEditForm.photoCaption.trim(),
              picName: jobdeskEditForm.picName.trim(),
              status: jobdeskEditForm.status,
              photoUrls: cleanedPhotos,
              photoUrl: cleanedPhotos[0] || '',
            }
          : j
      )
    );
    setIsJobdeskModalOpen(false);
    addToast(
      'success',
      'SOP & Galeri Foto Disimpan',
      `Pembaruan SOP ${selectedJobdesk.divisionName} dengan ${cleanedPhotos.length} foto dokumentasi telah disimpan.`
    );
  };

  // Export PLOG Report to PDF
  const handleExportPLOGPDF = () => {
    exportTableToPDF({
      title: `LAPORAN PERENCANAAN DAN KEBUTUHAN BAHAN RESEP (PLOG)`,
      subtitle: `Menu: ${currentMenu?.menuCode} - ${currentMenu?.stapleFood} + ${currentMenu?.animalProtein} • SPPG TMG2`,
      headers: [
        'BAHAN MAKANAN',
        'PK (BB / BDD% / BK)',
        'PK Kebutuhan + Buffer -> Bulat',
        'PB (BB / BDD% / BK)',
        'PB Kebutuhan + Buffer -> Bulat',
        'TOTAL KUANTITI (K+B)',
      ],
      rows: ingredientsCalculated.map(i => [
        i.name,
        `${i.netWeightSmall}g / ${i.bddSmall}% / ${i.bkSmall.toFixed(1)}g`,
        `${i.kebutuhanSmall.toFixed(1)} + ${i.bufferSmall.toFixed(2)} = ${i.pembulatanSmall} ${i.unitSmall}`,
        `${i.netWeightLarge}g / ${i.bddLarge}% / ${i.bkLarge.toFixed(1)}g`,
        `${i.kebutuhanLarge.toFixed(1)} + ${i.bufferLarge.toFixed(2)} = ${i.pembulatanLarge} ${i.unitLarge}`,
        `${formatNumber(i.totalKuantiti)} ${i.displayTotalUnit}`,
      ]),
      fileName: `PLOG_Rincian_Bahan_Resep_${currentMenu?.menuCode || 'Menu'}`,
      orientation: 'landscape',
      sppgConfig,
      signerName: sppgConfig.nutritionOfficer,
      signerRole: 'Pengawas Gizi Dietisien SPPG TMG2',
    });
  };

  const handleExportPLOGExcel = () => {
    const dataToExport = ingredientsCalculated.map(i => ({
      'BAHAN MAKANAN': i.name,
      'PK BB (g)': i.netWeightSmall,
      'PK BDD%': i.bddSmall,
      'PK BK (g)': Number(i.bkSmall.toFixed(1)),
      'PK PORSI': i.porsiSmall,
      'PK KEBUTUHAN': Number(i.kebutuhanSmall.toFixed(2)),
      'PK BUFFER (%)': i.bufferPctSmall,
      'PK BUFFER': Number(i.bufferSmall.toFixed(2)),
      'PK TOTAL': Number(i.totalSmall.toFixed(2)),
      'PK PEMBULATAN': i.pembulatanSmall,
      'PK SATUAN': i.unitSmall,
      'PB BB (g)': i.netWeightLarge,
      'PB BDD%': i.bddLarge,
      'PB BK (g)': Number(i.bkLarge.toFixed(1)),
      'PB PORSI': i.porsiLarge,
      'PB KEBUTUHAN': Number(i.kebutuhanLarge.toFixed(2)),
      'PB BUFFER (%)': i.bufferPctLarge,
      'PB BUFFER': Number(i.bufferLarge.toFixed(2)),
      'PB TOTAL': Number(i.totalLarge.toFixed(2)),
      'PB PEMBULATAN': i.pembulatanLarge,
      'PB SATUAN': i.unitLarge,
      'TOTAL KUANTITI (PEMBULATAN K+B)': i.totalKuantiti,
      'SATUAN': i.displayTotalUnit,
    }));
    exportToExcel(dataToExport, `PLOG_Rincian_Resep_${currentMenu?.menuCode || 'Menu'}`, 'Rincian Bahan Resep');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-900 text-white flex items-center justify-center shadow-md shadow-blue-950/20 font-black">
            <UtensilsCrossed className="w-6 h-6 text-sky-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 font-mono tracking-wider">
                MODUL PLOG
              </span>
              <span className="text-xs text-slate-400 font-semibold">• BGN AKG 2026</span>
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
              Perencanaan dan Pelaporan Gizi Terintegrasi
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Perhitungan Gramasi, Kebutuhan Bahan BDD, Kandungan Gizi TKPI, Food Cost & SOP Divisi
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Menu Selector Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 hidden sm:inline">Pilih Menu:</span>
            <select
              value={selectedMenuId}
              onChange={e => setSelectedMenuId(e.target.value)}
              className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              {menuItems.map(m => (
                <option key={m.id} value={m.id}>
                  {m.menuCode} - {m.animalProtein} ({m.dayName})
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setIsZScoreModalOpen(true)}
            className="min-h-[40px] inline-flex items-center gap-1.5 px-3 py-2 bg-[#0F766E] hover:bg-[#0D625B] text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <HeartPulse className="w-4 h-4" />
            <span>Kalkulator Z-Score WHO</span>
          </button>

          <DynamicFormEditToggleBar
            formId="menu_form"
            isEditing={isEditingMenuForm}
            onToggleEdit={() => setIsEditingMenuForm(v => !v)}
          />

          <button
            type="button"
            onClick={() => {
              setNewMenuForm(prev => ({
                ...prev,
                date: prev.date || new Date().toISOString().slice(0, 10),
                menuCode:
                  prev.menuCode && !menuItems.some(m => m.menuCode === prev.menuCode)
                    ? prev.menuCode
                    : buildSuggestedMenuCode(menuItems),
                customFields: getInitialCustomFieldValues(dynamicFormSchemas.menu_form),
              }));
              setIsModalMenuSchemaEdit(false);
              setIsCreateMenuModalOpen(true);
            }}
            className="min-h-[40px] inline-flex items-center gap-1.5 px-3 py-2 bg-blue-900 hover:bg-blue-800 dark:bg-sky-600 dark:hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Menu Baru</span>
          </button>
        </div>
      </div>

      {isEditingMenuForm && (
        <DynamicFormBuilderPanel
          formId="menu_form"
          onClose={() => setIsEditingMenuForm(false)}
        />
      )}

      {/* Metric Context Bar: Sasaran Penerima & Pagu Anggaran */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] text-slate-500 uppercase font-bold flex items-center justify-between">
            <span>Porsi Kecil (TK/SD 1-3)</span>
            <Scale className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-black text-sky-600 mt-1">
            {formatNumber(quotaSmall)} Siswa
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Gramasi anak 60-70% standar</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] text-slate-500 uppercase font-bold flex items-center justify-between">
            <span>Porsi Besar (SD 4-6, SMP/SMA)</span>
            <Scale className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-indigo-600 mt-1">
            {formatNumber(quotaLarge)} Siswa
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Gramasi standar remaja 100%</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] text-slate-500 uppercase font-bold flex items-center justify-between">
            <span>Pagu Anggaran (2 Kategori)</span>
            <Coins className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-2 flex-wrap">
            <span className="text-base sm:text-lg font-black text-indigo-700 dark:text-indigo-300 font-mono">
              B: {formatRupiah(largeBudgetCap)}
            </span>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <span className="text-base sm:text-lg font-black text-sky-700 dark:text-sky-300 font-mono">
              K: {formatRupiah(smallBudgetCap)}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Porsi Besar &amp; Porsi Kecil • Total {formatRupiah(totalBudgetCap)}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] text-slate-500 uppercase font-bold flex items-center justify-between">
            <span>Realisasi Food Cost</span>
            <DollarSign className="w-4 h-4 text-blue-900 dark:text-sky-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {formatRupiah(Math.round(avgFoodCostPerPortion))}
          </div>
          <div
            className={`text-[11px] font-semibold mt-0.5 flex items-center gap-1 ${
              budgetDifferencePerPortion >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            <span>{budgetDifferencePerPortion >= 0 ? 'Efisiensi:' : 'Melebihi Pagu:'}</span>
            <span>
              {budgetDifferencePerPortion >= 0 ? '+' : '-'}
              {formatRupiah(Math.abs(Math.round(budgetDifferencePerPortion)))}/porsi
            </span>
          </div>
        </div>
      </div>

      {/* Active Menu Detail Card */}
      <div className="bg-gradient-to-r from-blue-950 to-slate-900 text-white p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-blue-900">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500 text-white font-mono">
              {currentMenu?.menuCode}
            </span>
            <span className="text-xs text-sky-200 font-semibold">
              {currentMenu?.dayName}, {formatIndonesianDate(currentMenu?.date || '2026-11-08')}
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                currentMenu?.status === 'Disetujui Kepala'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}
            >
              {currentMenu?.status}
            </span>
          </div>
          <div className="text-base font-bold text-white flex flex-wrap items-center gap-2">
            <span>{currentMenu?.stapleFood}</span>
            <span>•</span>
            <span className="text-sky-300">{currentMenu?.animalProtein}</span>
            <span>•</span>
            <span>{currentMenu?.plantProtein}</span>
            <span>•</span>
            <span className="text-emerald-300">{currentMenu?.vegetable}</span>
            <span>•</span>
            <span className="text-amber-300">{currentMenu?.fruit}</span>
          </div>
          {getCustomTableFields(dynamicFormSchemas.menu_form).length > 0 && currentMenu?.customFields && (
            <div className="flex flex-wrap gap-2 pt-1">
              {getCustomTableFields(dynamicFormSchemas.menu_form).map(cf => (
                <span
                  key={cf.id}
                  className="px-2 py-0.5 rounded bg-white/10 text-[11px] text-sky-100"
                >
                  <strong>{cf.label}:</strong> {formatDynamicFieldValue(cf, currentMenu.customFields?.[cf.key])}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleExportPLOGPDF}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>PDF Laporan PLOG</span>
          </button>
          <button
            onClick={handleExportPLOGExcel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Excel</span>
          </button>
          <button
            onClick={triggerPrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak</span>
          </button>
        </div>
      </div>

      {/* 5 Main Sub-Modules Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-1 text-xs font-bold scrollbar-thin">
        {[
          {
            key: 'menu_bahan' as SubModuleTab,
            label: 'A. Perencanaan Menu oleh PLOG & Bahan',
            icon: <UtensilsCrossed className="w-4 h-4" />,
            badge: `${ingredientsCalculated.length} Bahan`,
          },
          {
            key: 'gramasi_item' as SubModuleTab,
            label: 'B. Gramasi Item Menu',
            icon: <Scale className="w-4 h-4" />,
            badge: `${grammageDrafts.length} Item`,
            badgeColor: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
          },
          {
            key: 'kandungan_gizi' as SubModuleTab,
            label: 'C. Input Kandungan Gizi (TKPI & Evaluasi AKG)',
            icon: <Apple className="w-4 h-4" />,
            badge: nutritionTarget.isConfigured ? 'Target AKG Aktif' : 'Belum Dikonfigurasi',
            badgeColor: nutritionTarget.isConfigured ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
          },
          {
            key: 'food_cost' as SubModuleTab,
            label: 'D. Input Food Cost Menu & Anggaran',
            icon: <Coins className="w-4 h-4" />,
            badge: `${percentToCapAvg.toFixed(1)}% Pagu`,
          },
          {
            key: 'jobdesk_divisi' as SubModuleTab,
            label: 'E. Jobdesk Divisi & SOP Foto',
            icon: <Layers className="w-4 h-4" />,
            badge: `${jobdesks.length} Divisi`,
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
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${tab.badgeColor || 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* SUBMODUL A: PERENCANAAN MENU DAN BAHAN */}
      {/* ========================================================================= */}
      {activeTab === 'menu_bahan' && (
        <div className="space-y-4">
          {/* Explanation Banner */}
          <div className="bg-sky-50 dark:bg-sky-950/40 p-4 rounded-xl border border-sky-200 dark:border-sky-900 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs text-sky-900 dark:text-sky-200">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-sky-700 dark:text-sky-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold">
                  Rumus Rincian Resep Porsi Kecil &amp; Porsi Besar (Otomatis + Editable Manual):
                </div>
                <p className="leading-relaxed">
                  <strong>BK</strong> = BB / (BDD% / 100) • <strong>KEBUTUHAN</strong> = (BK × PORSI) dalam Satuan Beli • <strong>TOTAL</strong> = KEBUTUHAN + BUFFER • <strong>PEMBULATAN</strong> = Pembulatan ke Atas •{' '}
                  <strong className="text-blue-900 dark:text-sky-300">TOTAL KUANTITI = Pembulatan Porsi Kecil + Pembulatan Porsi Besar</strong>.{' '}
                  <span className="text-sky-800 dark:text-sky-300">
                    Setiap kolom dari <strong>Bahan Makanan</strong> sampai <strong>Total Kuantiti</strong> terisi otomatis &amp; dapat diklik untuk diedit manual (kosongkan angka sel hasil rumus untuk kembali ke otomatis).
                  </span>
                </p>
              </div>
            </div>

            {/* Global Buffer Controls */}
            <div className="flex flex-wrap items-center gap-2 shrink-0 bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-sky-200 dark:border-sky-800">
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-rose-800 dark:text-rose-300">
                <span>Buffer P. Kecil (%):</span>
                <input
                  type="number"
                  min={0}
                  max={50}
                  step={0.5}
                  value={defaultBufferSmallPct}
                  onChange={e => setDefaultBufferSmallPct(Math.max(0, Number(e.target.value) || 0))}
                  className="w-14 px-2 py-1 rounded border border-rose-300 dark:border-rose-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-center"
                />
              </label>
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                <span>Buffer P. Besar (%):</span>
                <input
                  type="number"
                  min={0}
                  max={50}
                  step={0.5}
                  value={defaultBufferLargePct}
                  onChange={e => setDefaultBufferLargePct(Math.max(0, Number(e.target.value) || 0))}
                  className="w-14 px-2 py-1 rounded border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-center"
                />
              </label>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Scale className="w-4 h-4 text-blue-900 dark:text-sky-400" />
                Rincian Bahan Resep: {currentMenu?.stapleFood} + {currentMenu?.animalProtein}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Format lengkap Bahan Makanan, Porsi Kecil ({formatNumber(quotaSmall)} porsi), Porsi Besar ({formatNumber(quotaLarge)} porsi), &amp; Total Kuantiti Pembulatan
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleSyncActiveMenuToRAB}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/70 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                title="Kirim otomatis total kuantiti bahan resep ke Rencana Anggaran Belanja (RAB) Pengadaan"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Sinkron Kebutuhan ke RAB</span>
              </button>
              <button
                type="button"
                onClick={handleExportPLOGPDF}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>PDF Rincian</span>
              </button>
              <button
                type="button"
                onClick={handleExportPLOGExcel}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Excel</span>
              </button>
              <button
                type="button"
                onClick={handleOpenAddIngredient}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-900 hover:bg-blue-800 dark:bg-sky-600 dark:hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Bahan Resep</span>
              </button>
            </div>
          </div>

          {/* Table of Ingredients - Format Rincian Resep Sesuai Standar Spreadsheet */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-700 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr className="font-extrabold tracking-wide text-center border-b border-slate-400 dark:border-slate-700">
                    <th
                      rowSpan={2}
                      className="px-2.5 py-2 border-r border-slate-400 dark:border-slate-700 bg-amber-300 text-slate-950 dark:bg-amber-500/90 dark:text-slate-950 min-w-[175px] text-left align-middle"
                    >
                      BAHAN MAKANAN
                    </th>
                    <th
                      colSpan={9}
                      className="px-2 py-1.5 border-r border-slate-400 dark:border-slate-700 bg-rose-200 text-rose-950 dark:bg-rose-900/70 dark:text-rose-100"
                    >
                      PORSI KECIL
                    </th>
                    <th
                      colSpan={9}
                      className="px-2 py-1.5 border-r border-slate-400 dark:border-slate-700 bg-emerald-200 text-emerald-950 dark:bg-emerald-900/70 dark:text-emerald-100"
                    >
                      PORSI BESAR
                    </th>
                    <th
                      rowSpan={2}
                      className="px-2.5 py-2 border-r border-slate-400 dark:border-slate-700 bg-sky-200 text-sky-950 dark:bg-sky-900/80 dark:text-sky-100 min-w-[115px] align-middle leading-tight"
                    >
                      <div>TOTAL KUANTITI</div>
                      <div className="text-[9px] font-semibold opacity-80">(Bulat K + Bulat B)</div>
                    </th>
                    <th
                      rowSpan={2}
                      className="px-2 py-2 bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-100 w-14 text-center align-middle print:hidden"
                    >
                      AKSI
                    </th>
                  </tr>
                  <tr className="font-bold text-[10px] text-center border-b border-slate-400 dark:border-slate-700">
                    {/* Sub-header PORSI KECIL */}
                    <th className="px-1.5 py-1.5 border-r border-slate-300 dark:border-slate-700 bg-rose-100 text-rose-950 dark:bg-rose-950/60 dark:text-rose-200">BB</th>
                    <th className="px-1.5 py-1.5 border-r border-slate-300 dark:border-slate-700 bg-rose-100 text-rose-950 dark:bg-rose-950/60 dark:text-rose-200">BDD%</th>
                    <th className="px-1.5 py-1.5 border-r border-slate-300 dark:border-slate-700 bg-rose-100 text-rose-950 dark:bg-rose-950/60 dark:text-rose-200">BK</th>
                    <th className="px-1.5 py-1.5 border-r border-slate-300 dark:border-slate-700 bg-rose-100 text-rose-950 dark:bg-rose-950/60 dark:text-rose-200">PORSI</th>
                    <th className="px-1.5 py-1.5 border-r border-slate-300 dark:border-slate-700 bg-rose-100 text-rose-950 dark:bg-rose-950/60 dark:text-rose-200">KEBUTUHAN</th>
                    <th className="px-1.5 py-1.5 border-r border-slate-300 dark:border-slate-700 bg-rose-100 text-rose-950 dark:bg-rose-950/60 dark:text-rose-200">BUFFER</th>
                    <th className="px-1.5 py-1.5 border-r border-slate-300 dark:border-slate-700 bg-rose-100 text-rose-950 dark:bg-rose-950/60 dark:text-rose-200">TOTAL</th>
                    <th className="px-1.5 py-1.5 border-r border-slate-300 dark:border-slate-700 bg-rose-100 text-rose-950 dark:bg-rose-950/60 dark:text-rose-200 font-black">PEMBULATAN</th>
                    <th className="px-1.5 py-1.5 border-r border-slate-400 dark:border-slate-700 bg-rose-100 text-rose-950 dark:bg-rose-950/60 dark:text-rose-200">SATUAN</th>

                    {/* Sub-header PORSI BESAR */}
                    <th className="px-1.5 py-1.5 border-r border-slate-300 dark:border-slate-700 bg-emerald-100 text-emerald-950 dark:bg-emerald-950/60 dark:text-emerald-200">BB</th>
                    <th className="px-1.5 py-1.5 border-r border-slate-300 dark:border-slate-700 bg-emerald-100 text-emerald-950 dark:bg-emerald-950/60 dark:text-emerald-200">BDD%</th>
                    <th className="px-1.5 py-1.5 border-r border-slate-300 dark:border-slate-700 bg-emerald-100 text-emerald-950 dark:bg-emerald-950/60 dark:text-emerald-200">BK</th>
                    <th className="px-1.5 py-1.5 border-r border-slate-300 dark:border-slate-700 bg-emerald-100 text-emerald-950 dark:bg-emerald-950/60 dark:text-emerald-200">PORSI</th>
                    <th className="px-1.5 py-1.5 border-r border-slate-300 dark:border-slate-700 bg-emerald-100 text-emerald-950 dark:bg-emerald-950/60 dark:text-emerald-200">KEBUTUHAN</th>
                    <th className="px-1.5 py-1.5 border-r border-slate-300 dark:border-slate-700 bg-emerald-100 text-emerald-950 dark:bg-emerald-950/60 dark:text-emerald-200">BUFFER</th>
                    <th className="px-1.5 py-1.5 border-r border-slate-300 dark:border-slate-700 bg-emerald-100 text-emerald-950 dark:bg-emerald-950/60 dark:text-emerald-200">TOTAL</th>
                    <th className="px-1.5 py-1.5 border-r border-slate-300 dark:border-slate-700 bg-emerald-100 text-emerald-950 dark:bg-emerald-950/60 dark:text-emerald-200 font-black">PEMBULATAN</th>
                    <th className="px-1.5 py-1.5 border-r border-slate-400 dark:border-slate-700 bg-emerald-100 text-emerald-950 dark:bg-emerald-950/60 dark:text-emerald-200">SATUAN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 tabular-nums">
                  {ingredientsCalculated.map(item => {
                    const ov = item.manualOverrides || {};
                    const unitOptions = Array.from(
                      new Set([
                        ...masterUnits.map(u => u.code),
                        item.purchaseUnit,
                        item.unitSmall,
                        item.unitLarge,
                      ].filter(Boolean))
                    );

                    return (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-2 py-1.5 border-r border-slate-300 dark:border-slate-700 font-medium text-slate-900 dark:text-slate-100">
                          <span className="hidden print:inline font-semibold">{item.name}</span>
                          <input
                            type="text"
                            aria-label={`Nama Bahan Makanan ${item.name}`}
                            defaultValue={item.name}
                            key={`${item.id}-${item.name}`}
                            onBlur={e => {
                              const nextName = e.target.value.trim();
                              if (nextName && nextName !== item.name) {
                                handleUpdateIngredientBaseField(item.id, 'name', nextName);
                              } else {
                                e.target.value = item.name;
                              }
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Enter') e.currentTarget.blur();
                            }}
                            className="print:hidden w-full min-w-[140px] px-1.5 py-0.5 rounded border border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-sky-400 focus:bg-white dark:focus:bg-slate-800 bg-transparent font-semibold text-slate-900 dark:text-slate-100 focus:outline-none"
                          />
                          <div className="px-1.5 text-[9px] text-slate-400 font-mono">
                            {item.category} • {item.referenceSource}
                          </div>
                        </td>

                        {/* PORSI KECIL CELLS */}
                        <td className="px-1 py-1.5 border-r border-slate-200 dark:border-slate-800 text-center font-mono text-slate-800 dark:text-slate-200">
                          <FormulaNumericCell
                            value={item.netWeightSmall}
                            decimals={0}
                            allowResetOnEmpty={false}
                            ariaLabel={`BB Porsi Kecil ${item.name}`}
                            onCommit={v =>
                              handleUpdateIngredientBaseField(item.id, 'netWeightSmall', v ?? 0)
                            }
                            inputClassName="w-11 text-slate-800 dark:text-slate-200"
                          />
                        </td>
                        <td className="px-1 py-1.5 border-r border-slate-200 dark:border-slate-800 text-center font-mono text-slate-800 dark:text-slate-200">
                          <FormulaNumericCell
                            value={item.bddSmall}
                            decimals={0}
                            min={1}
                            max={100}
                            suffix="%"
                            isOverridden={ov.bddSmall !== undefined}
                            ariaLabel={`BDD Porsi Kecil ${item.name}`}
                            onCommit={v => handleUpdateFormulaOverride(item.id, 'bddSmall', v)}
                            inputClassName="w-10 text-slate-800 dark:text-slate-200"
                          />
                        </td>
                        <td className="px-1 py-1.5 border-r border-slate-200 dark:border-slate-800 text-center font-mono text-slate-800 dark:text-slate-200">
                          <FormulaNumericCell
                            value={item.bkSmall}
                            decimals={1}
                            isOverridden={ov.bkSmall !== undefined}
                            ariaLabel={`BK Porsi Kecil ${item.name}`}
                            onCommit={v => handleUpdateFormulaOverride(item.id, 'bkSmall', v)}
                            inputClassName="w-12 text-slate-800 dark:text-slate-200"
                          />
                        </td>
                        <td className="px-1 py-1.5 border-r border-slate-200 dark:border-slate-800 text-center font-mono text-slate-700 dark:text-slate-300">
                          <FormulaNumericCell
                            value={item.porsiSmall}
                            decimals={0}
                            isOverridden={ov.porsiSmall !== undefined}
                            ariaLabel={`Porsi Kecil ${item.name}`}
                            onCommit={v => handleUpdateFormulaOverride(item.id, 'porsiSmall', v)}
                            inputClassName="w-14 text-slate-700 dark:text-slate-300"
                          />
                        </td>
                        <td className="px-1 py-1.5 border-r border-slate-200 dark:border-slate-800 text-right font-mono text-slate-800 dark:text-slate-200">
                          <FormulaNumericCell
                            value={item.kebutuhanSmall}
                            decimals={1}
                            align="right"
                            isOverridden={ov.kebutuhanSmall !== undefined}
                            ariaLabel={`Kebutuhan Porsi Kecil ${item.name}`}
                            onCommit={v => handleUpdateFormulaOverride(item.id, 'kebutuhanSmall', v)}
                            inputClassName="w-14 text-slate-800 dark:text-slate-200"
                          />
                        </td>
                        <td className="px-1 py-1.5 border-r border-slate-200 dark:border-slate-800 text-right font-mono">
                          <div className="flex justify-end">
                            <FormulaNumericCell
                              value={item.bufferSmall}
                              decimals={2}
                              align="right"
                              isOverridden={ov.bufferSmall !== undefined}
                              ariaLabel={`Nilai Buffer Porsi Kecil ${item.name}`}
                              onCommit={v => handleUpdateFormulaOverride(item.id, 'bufferSmall', v)}
                              inputClassName="w-12 text-slate-800 dark:text-slate-200"
                            />
                          </div>
                          <div className="flex items-center justify-end gap-0.5 print:hidden mt-0.5">
                            <input
                              type="number"
                              min={0}
                              max={50}
                              step={0.5}
                              aria-label={`Buffer Porsi Kecil ${item.name} (%)`}
                              value={item.bufferPctSmall}
                              onChange={e =>
                                handleUpdateIngredientBuffer(
                                  item.id,
                                  'bufferPercentSmall',
                                  Number(e.target.value)
                                )
                              }
                              className="w-10 px-1 py-0 text-[9px] text-right rounded border border-rose-200 dark:border-rose-800 bg-rose-50/70 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200"
                            />
                            <span className="text-[9px] text-slate-400">%</span>
                          </div>
                        </td>
                        <td className="px-1 py-1.5 border-r border-slate-200 dark:border-slate-800 text-right font-mono font-semibold text-slate-900 dark:text-white">
                          <FormulaNumericCell
                            value={item.totalSmall}
                            decimals={1}
                            align="right"
                            isOverridden={ov.totalSmall !== undefined}
                            ariaLabel={`Total Porsi Kecil ${item.name}`}
                            onCommit={v => handleUpdateFormulaOverride(item.id, 'totalSmall', v)}
                            inputClassName="w-14 font-semibold text-slate-900 dark:text-white"
                          />
                        </td>
                        <td className="px-1 py-1.5 border-r border-slate-200 dark:border-slate-800 text-center font-mono font-black text-rose-800 dark:text-rose-300 bg-rose-50/60 dark:bg-rose-950/30">
                          <FormulaNumericCell
                            value={item.pembulatanSmall}
                            decimals={0}
                            isOverridden={ov.pembulatanSmall !== undefined}
                            ariaLabel={`Pembulatan Porsi Kecil ${item.name}`}
                            onCommit={v => handleUpdateFormulaOverride(item.id, 'pembulatanSmall', v)}
                            inputClassName="w-12 font-black text-rose-800 dark:text-rose-300"
                          />
                        </td>
                        <td className="px-1 py-1.5 border-r border-slate-300 dark:border-slate-700 text-center text-slate-700 dark:text-slate-300">
                          <span className="hidden print:inline">{item.unitSmall}</span>
                          <select
                            aria-label={`Satuan Porsi Kecil ${item.name}`}
                            value={item.unitSmall}
                            onChange={e =>
                              handleUpdateFormulaOverride(item.id, 'unitSmall', e.target.value)
                            }
                            className={`print:hidden px-1 py-0.5 rounded text-[10px] border cursor-pointer focus:outline-none focus:ring-1 focus:ring-sky-500 ${
                              ov.unitSmall !== undefined
                                ? 'border-amber-400 bg-amber-50/90 text-amber-950 dark:border-amber-600 dark:bg-amber-950/60 dark:text-amber-200 font-bold'
                                : 'border-transparent hover:border-slate-300 dark:hover:border-slate-600 bg-transparent dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {unitOptions.map(u => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* PORSI BESAR CELLS */}
                        <td className="px-1 py-1.5 border-r border-slate-200 dark:border-slate-800 text-center font-mono text-slate-800 dark:text-slate-200">
                          <FormulaNumericCell
                            value={item.netWeightLarge}
                            decimals={0}
                            allowResetOnEmpty={false}
                            ariaLabel={`BB Porsi Besar ${item.name}`}
                            onCommit={v =>
                              handleUpdateIngredientBaseField(item.id, 'netWeightLarge', v ?? 0)
                            }
                            inputClassName="w-11 text-slate-800 dark:text-slate-200"
                          />
                        </td>
                        <td className="px-1 py-1.5 border-r border-slate-200 dark:border-slate-800 text-center font-mono text-slate-800 dark:text-slate-200">
                          <FormulaNumericCell
                            value={item.bddLarge}
                            decimals={0}
                            min={1}
                            max={100}
                            suffix="%"
                            isOverridden={ov.bddLarge !== undefined}
                            ariaLabel={`BDD Porsi Besar ${item.name}`}
                            onCommit={v => handleUpdateFormulaOverride(item.id, 'bddLarge', v)}
                            inputClassName="w-10 text-slate-800 dark:text-slate-200"
                          />
                        </td>
                        <td className="px-1 py-1.5 border-r border-slate-200 dark:border-slate-800 text-center font-mono text-slate-800 dark:text-slate-200">
                          <FormulaNumericCell
                            value={item.bkLarge}
                            decimals={1}
                            isOverridden={ov.bkLarge !== undefined}
                            ariaLabel={`BK Porsi Besar ${item.name}`}
                            onCommit={v => handleUpdateFormulaOverride(item.id, 'bkLarge', v)}
                            inputClassName="w-12 text-slate-800 dark:text-slate-200"
                          />
                        </td>
                        <td className="px-1 py-1.5 border-r border-slate-200 dark:border-slate-800 text-center font-mono text-slate-700 dark:text-slate-300">
                          <FormulaNumericCell
                            value={item.porsiLarge}
                            decimals={0}
                            isOverridden={ov.porsiLarge !== undefined}
                            ariaLabel={`Porsi Besar ${item.name}`}
                            onCommit={v => handleUpdateFormulaOverride(item.id, 'porsiLarge', v)}
                            inputClassName="w-14 text-slate-700 dark:text-slate-300"
                          />
                        </td>
                        <td className="px-1 py-1.5 border-r border-slate-200 dark:border-slate-800 text-right font-mono text-slate-800 dark:text-slate-200">
                          <FormulaNumericCell
                            value={item.kebutuhanLarge}
                            decimals={1}
                            align="right"
                            isOverridden={ov.kebutuhanLarge !== undefined}
                            ariaLabel={`Kebutuhan Porsi Besar ${item.name}`}
                            onCommit={v => handleUpdateFormulaOverride(item.id, 'kebutuhanLarge', v)}
                            inputClassName="w-14 text-slate-800 dark:text-slate-200"
                          />
                        </td>
                        <td className="px-1 py-1.5 border-r border-slate-200 dark:border-slate-800 text-right font-mono">
                          <div className="flex justify-end">
                            <FormulaNumericCell
                              value={item.bufferLarge}
                              decimals={2}
                              align="right"
                              isOverridden={ov.bufferLarge !== undefined}
                              ariaLabel={`Nilai Buffer Porsi Besar ${item.name}`}
                              onCommit={v => handleUpdateFormulaOverride(item.id, 'bufferLarge', v)}
                              inputClassName="w-12 text-slate-800 dark:text-slate-200"
                            />
                          </div>
                          <div className="flex items-center justify-end gap-0.5 print:hidden mt-0.5">
                            <input
                              type="number"
                              min={0}
                              max={50}
                              step={0.5}
                              aria-label={`Buffer Porsi Besar ${item.name} (%)`}
                              value={item.bufferPctLarge}
                              onChange={e =>
                                handleUpdateIngredientBuffer(
                                  item.id,
                                  'bufferPercentLarge',
                                  Number(e.target.value)
                                )
                              }
                              className="w-10 px-1 py-0 text-[9px] text-right rounded border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200"
                            />
                            <span className="text-[9px] text-slate-400">%</span>
                          </div>
                        </td>
                        <td className="px-1 py-1.5 border-r border-slate-200 dark:border-slate-800 text-right font-mono font-semibold text-slate-900 dark:text-white">
                          <FormulaNumericCell
                            value={item.totalLarge}
                            decimals={1}
                            align="right"
                            isOverridden={ov.totalLarge !== undefined}
                            ariaLabel={`Total Porsi Besar ${item.name}`}
                            onCommit={v => handleUpdateFormulaOverride(item.id, 'totalLarge', v)}
                            inputClassName="w-14 font-semibold text-slate-900 dark:text-white"
                          />
                        </td>
                        <td className="px-1 py-1.5 border-r border-slate-200 dark:border-slate-800 text-center font-mono font-black text-emerald-800 dark:text-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/30">
                          <FormulaNumericCell
                            value={item.pembulatanLarge}
                            decimals={0}
                            isOverridden={ov.pembulatanLarge !== undefined}
                            ariaLabel={`Pembulatan Porsi Besar ${item.name}`}
                            onCommit={v => handleUpdateFormulaOverride(item.id, 'pembulatanLarge', v)}
                            inputClassName="w-12 font-black text-emerald-800 dark:text-emerald-300"
                          />
                        </td>
                        <td className="px-1 py-1.5 border-r border-slate-300 dark:border-slate-700 text-center text-slate-700 dark:text-slate-300">
                          <span className="hidden print:inline">{item.unitLarge}</span>
                          <select
                            aria-label={`Satuan Porsi Besar ${item.name}`}
                            value={item.unitLarge}
                            onChange={e =>
                              handleUpdateFormulaOverride(item.id, 'unitLarge', e.target.value)
                            }
                            className={`print:hidden px-1 py-0.5 rounded text-[10px] border cursor-pointer focus:outline-none focus:ring-1 focus:ring-sky-500 ${
                              ov.unitLarge !== undefined
                                ? 'border-amber-400 bg-amber-50/90 text-amber-950 dark:border-amber-600 dark:bg-amber-950/60 dark:text-amber-200 font-bold'
                                : 'border-transparent hover:border-slate-300 dark:hover:border-slate-600 bg-transparent dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {unitOptions.map(u => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* TOTAL KUANTITI (HASIL PENAMBAHAN PEMBULATAN PORSI KECIL + PORSI BESAR) */}
                        <td className="px-1.5 py-1.5 border-r border-slate-300 dark:border-slate-700 text-center font-mono font-black text-xs text-sky-950 dark:text-sky-200 bg-sky-50/90 dark:bg-sky-950/40">
                          <div className="inline-flex items-center justify-center gap-1">
                            <FormulaNumericCell
                              value={item.totalKuantiti}
                              decimals={0}
                              isOverridden={ov.totalKuantiti !== undefined}
                              ariaLabel={`Total Kuantiti ${item.name}`}
                              onCommit={v =>
                                handleUpdateFormulaOverride(item.id, 'totalKuantiti', v)
                              }
                              inputClassName="w-14 font-black text-xs text-sky-950 dark:text-sky-200"
                            />
                            <span className="text-[10px] font-bold">{item.displayTotalUnit}</span>
                          </div>
                          <div className="text-[9px] font-normal text-slate-500 dark:text-slate-400">
                            ({item.pembulatanSmall} + {item.pembulatanLarge})
                          </div>
                        </td>

                        <td className="px-1.5 py-2 text-center print:hidden">
                          <div className="inline-flex items-center justify-center gap-1">
                            {item.hasManualOverrides && (
                              <button
                                type="button"
                                onClick={() => handleResetIngredientOverrides(item.id)}
                                className="p-1 text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200 rounded hover:bg-amber-50 dark:hover:bg-amber-950 transition cursor-pointer"
                                title="Kembalikan baris ini ke perhitungan rumus otomatis"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteIngredient(item.id)}
                              className="p-1 text-rose-500 hover:text-rose-700 rounded hover:bg-rose-50 dark:hover:bg-rose-950 transition cursor-pointer"
                              title="Hapus Bahan dari Resep"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 dark:bg-slate-800 font-bold font-mono border-t-2 border-slate-400 dark:border-slate-700 text-[11px]">
                    <td colSpan={1} className="px-2.5 py-2.5 font-sans text-right uppercase tracking-wider border-r border-slate-300 dark:border-slate-700">
                      TOTAL ({ingredientsCalculated.length} Bahan):
                    </td>
                    <td colSpan={7} className="px-2 py-2.5 text-right text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700 font-sans">
                      Jml Bulat P. Kecil:
                    </td>
                    <td className="px-1.5 py-2.5 text-center text-rose-900 dark:text-rose-200 font-black border-r border-slate-200 dark:border-slate-700 bg-rose-100/70 dark:bg-rose-950/50">
                      {formatNumber(ingredientsCalculated.reduce((acc, i) => acc + i.pembulatanSmall, 0))}
                    </td>
                    <td className="px-1.5 py-2.5 border-r border-slate-300 dark:border-slate-700 text-center text-[10px] text-slate-500">
                      unit
                    </td>
                    <td colSpan={7} className="px-2 py-2.5 text-right text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700 font-sans">
                      Jml Bulat P. Besar:
                    </td>
                    <td className="px-1.5 py-2.5 text-center text-emerald-900 dark:text-emerald-200 font-black border-r border-slate-200 dark:border-slate-700 bg-emerald-100/70 dark:bg-emerald-950/50">
                      {formatNumber(ingredientsCalculated.reduce((acc, i) => acc + i.pembulatanLarge, 0))}
                    </td>
                    <td className="px-1.5 py-2.5 border-r border-slate-300 dark:border-slate-700 text-center text-[10px] text-slate-500">
                      unit
                    </td>
                    <td className="px-2 py-2.5 text-center text-sky-950 dark:text-sky-100 font-black border-r border-slate-300 dark:border-slate-700 bg-sky-200/70 dark:bg-sky-900/60">
                      {formatNumber(ingredientsCalculated.reduce((acc, i) => acc + i.totalKuantiti, 0))}
                    </td>
                    <td className="print:hidden" />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Daftar Menu Makanan Terjadwal (Auto-synced with Form Menu Custom Fields) */}
          <DataTable
            title="Daftar Siklus Menu Makanan MBG"
            subtitle="Rekapitulasi menu harian lengkap beserta kolom custom dari Form Perencanaan Menu"
            data={menuItems}
            keyExtractor={item => item.id}
            searchPlaceholder="Cari kode menu, lauk hewani, atau makanan pokok..."
            searchKeys={['menuCode', 'stapleFood', 'animalProtein', 'plantProtein', 'vegetable', 'fruit']}
            onExportPDF={handleExportMenusPDF}
            onExportExcel={handleExportMenusExcel}
            onPrint={triggerPrint}
            columns={[
              {
                key: 'menuCode',
                header: 'Kode & Tanggal Menu',
                render: row => (
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white font-mono">
                      {row.menuCode}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {row.dayName}, {formatIndonesianDate(row.date)}
                    </div>
                  </div>
                ),
              },
              {
                key: 'stapleFood',
                header: 'Komposisi Menu',
                render: row => (
                  <div className="text-xs space-y-0.5">
                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                      {row.stapleFood} • {row.animalProtein}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {row.plantProtein} • {row.vegetable} • {row.fruit}
                    </div>
                  </div>
                ),
              },
              {
                key: 'status',
                header: 'Status',
                render: row => (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    {row.status}
                  </span>
                ),
              },
              {
                key: 'gramasiAction',
                header: 'Gramasi Item',
                render: row => (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMenuId(row.id);
                      setActiveTab('gramasi_item');
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/60 dark:hover:bg-sky-900 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-[11px] font-bold transition cursor-pointer"
                  >
                    <Scale className="w-3 h-3" />
                    <span>Atur Gramasi</span>
                  </button>
                ),
              },
              ...buildDynamicTableColumns<MenuItem>(dynamicFormSchemas.menu_form),
            ]}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBMODUL B: GRAMASI ITEM MENU (PORSI KECIL VS PORSI BESAR)                */}
      {/* ========================================================================= */}
      {activeTab === 'gramasi_item' && (() => {
        const totalSmallGrams = grammageDrafts.reduce((acc, g) => acc + (Number(g.smallGrams) || 0), 0);
        const totalLargeGrams = grammageDrafts.reduce((acc, g) => acc + (Number(g.largeGrams) || 0), 0);
        const ratioPct = totalLargeGrams > 0 ? ((totalSmallGrams / totalLargeGrams) * 100).toFixed(0) : '0';
        const editedCount = grammageDrafts.filter(g => g.isManuallyEdited).length;

        const categoryBadgeColor = (catKey: MenuItemGrammage['categoryKey']) => {
          switch (catKey) {
            case 'stapleFood':
              return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300';
            case 'animalProtein':
              return 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300';
            case 'plantProtein':
              return 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300';
            case 'vegetable':
              return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300';
            case 'fruit':
              return 'bg-lime-100 text-lime-800 dark:bg-lime-950/60 dark:text-lime-300';
            case 'milkOrExtra':
              return 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300';
            default:
              return 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300';
          }
        };

        return (
          <div className="space-y-5">
            {/* Info & Sync Banner */}
            <div className="bg-sky-50 dark:bg-sky-950/40 p-4 rounded-xl border border-sky-200 dark:border-sky-900 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs text-sky-900 dark:text-sky-200">
              <div className="flex items-start gap-3">
                <Scale className="w-5 h-5 text-sky-700 dark:text-sky-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold">
                    Sinkronisasi Otomatis Item Menu dari Perencanaan Menu oleh PLOG
                  </div>
                  <p className="leading-relaxed opacity-90">
                    Daftar item menu di bawah ini otomatis mengambil masing-masing item hidangan yang diinput pada <strong>Menu Baru (Sub-menu Perencanaan Menu oleh PLOG)</strong>, membedakan berat <strong>Porsi Kecil (gram)</strong> dan <strong>Porsi Besar (gram)</strong>, serta dapat diedit langsung maupun melalui tombol <strong>Edit</strong> secara manual.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <select
                  value={selectedMenuId}
                  onChange={e => setSelectedMenuId(e.target.value)}
                  className="px-3 py-2 text-xs font-bold rounded-xl border border-sky-300 dark:border-sky-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  {menuItems.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.menuCode} — {m.stapleFood} + {m.animalProtein} ({m.dayName})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Summary Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-sky-200 dark:border-sky-900/60 shadow-xs">
                <div className="text-[11px] text-sky-700 dark:text-sky-300 uppercase font-bold flex items-center justify-between">
                  <span>Total Gramasi Porsi Kecil</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300">
                    TK/PAUD &amp; SD 1-3
                  </span>
                </div>
                <div className="text-2xl font-black text-sky-700 dark:text-sky-300 mt-1 font-mono">
                  {formatNumber(totalSmallGrams)} <span className="text-sm font-bold">gram / porsi</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Rasio {ratioPct}% dari Porsi Besar • Total {formatNumber(Math.round((totalSmallGrams * quotaSmall) / 1000))} kg ({formatNumber(quotaSmall)} porsi)
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/60 shadow-xs">
                <div className="text-[11px] text-indigo-700 dark:text-indigo-300 uppercase font-bold flex items-center justify-between">
                  <span>Total Gramasi Porsi Besar</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300">
                    SD 4-6, SMP, SMA
                  </span>
                </div>
                <div className="text-2xl font-black text-indigo-700 dark:text-indigo-300 mt-1 font-mono">
                  {formatNumber(totalLargeGrams)} <span className="text-sm font-bold">gram / porsi</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Standar sajian penuh 100% • Total {formatNumber(Math.round((totalLargeGrams * quotaLarge) / 1000))} kg ({formatNumber(quotaLarge)} porsi)
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="text-[11px] text-slate-500 uppercase font-bold flex items-center justify-between">
                  <span>Status Item Menu ({currentMenu?.menuCode})</span>
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
                  {grammageDrafts.length} <span className="text-sm font-bold text-slate-500">Item Menu</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {editedCount > 0
                    ? `${editedCount} item telah diedit manual • ${grammageDrafts.length - editedCount} item sinkron PLOG`
                    : 'Seluruh item tersinkron otomatis dengan Menu PLOG'}
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <UtensilsCrossed className="w-4 h-4 text-blue-900 dark:text-sky-400" />
                  Rincian Gramasi Item Menu: {currentMenu?.menuCode} ({currentMenu?.dayName})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Klik angka gram langsung untuk edit cepat, atau klik tombol <strong>Edit</strong> untuk mengubah nama, berat gram &amp; catatan.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {hasUnsavedGrammageChanges && (
                  <button
                    type="button"
                    onClick={handleSaveAllGrammageDrafts}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer animate-pulse"
                  >
                    <Check className="w-4 h-4" />
                    <span>Simpan Perubahan Gramasi</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSyncGrammagesFromPLOG}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/70 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                  title="Tarik ulang nama & item menu terbaru dari Perencanaan Menu oleh PLOG"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sinkron Ulang PLOG</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportGrammagePDF}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>PDF</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportGrammageExcel}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Excel</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddGrammageModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-900 hover:bg-blue-800 dark:bg-sky-600 dark:hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Item Manual</span>
                </button>
              </div>
            </div>

            {/* Table of Gramasi Item Menu */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
                      <th className="py-3 px-3 text-center w-10">#</th>
                      <th className="py-3 px-3 min-w-[140px]">Kategori Item</th>
                      <th className="py-3 px-3 min-w-[240px]">Nama Item Menu (Dari Menu Baru PLOG)</th>
                      <th className="py-3 px-3 text-center bg-sky-50/90 dark:bg-sky-950/50 text-sky-900 dark:text-sky-200 min-w-[165px]">
                        Gramasi Porsi Kecil (gram)
                      </th>
                      <th className="py-3 px-3 text-center bg-indigo-50/90 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200 min-w-[165px]">
                        Gramasi Porsi Besar (gram)
                      </th>
                      <th className="py-3 px-3 text-center min-w-[100px]">Selisih (B - K)</th>
                      <th className="py-3 px-3 text-center min-w-[110px] print:hidden">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {grammageDrafts.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          Belum ada item menu pada perencanaan menu ini. Tambahkan Menu Baru pada sub-menu A atau klik &quot;Tambah Item Manual&quot;.
                        </td>
                      </tr>
                    ) : (
                      grammageDrafts.map((item, idx) => {
                        const diff = (Number(item.largeGrams) || 0) - (Number(item.smallGrams) || 0);
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/90 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-3.5 px-3 text-center font-mono text-slate-500 font-bold">
                              {idx + 1}
                            </td>
                            <td className="py-3.5 px-3">
                              <span
                                className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${categoryBadgeColor(
                                  item.categoryKey
                                )}`}
                              >
                                {item.categoryLabel}
                              </span>
                            </td>
                            <td className="py-3.5 px-3">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-bold text-slate-900 dark:text-white text-xs">
                                  {item.itemName}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                    item.isManuallyEdited
                                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  }`}
                                >
                                  {item.isManuallyEdited ? 'Diedit Manual' : 'Sinkron PLOG'}
                                </span>
                              </div>
                              {item.notes && (
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                  {item.notes}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-3 text-center bg-sky-50/40 dark:bg-sky-950/20">
                              <div className="inline-flex items-center gap-1.5">
                                <input
                                  type="number"
                                  min={0}
                                  step={1}
                                  aria-label={`Gramasi Porsi Kecil ${item.itemName}`}
                                  value={item.smallGrams}
                                  onChange={e =>
                                    handleInlineGrammageChange(item.id, 'smallGrams', e.target.value)
                                  }
                                  className="w-20 px-2.5 py-1.5 text-center font-mono font-black text-xs rounded-lg border border-sky-300 dark:border-sky-700 bg-white dark:bg-slate-900 text-sky-800 dark:text-sky-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                                />
                                <span className="text-[11px] font-bold text-sky-700 dark:text-sky-300">
                                  gram
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-center bg-indigo-50/40 dark:bg-indigo-950/20">
                              <div className="inline-flex items-center gap-1.5">
                                <input
                                  type="number"
                                  min={0}
                                  step={1}
                                  aria-label={`Gramasi Porsi Besar ${item.itemName}`}
                                  value={item.largeGrams}
                                  onChange={e =>
                                    handleInlineGrammageChange(item.id, 'largeGrams', e.target.value)
                                  }
                                  className="w-20 px-2.5 py-1.5 text-center font-mono font-black text-xs rounded-lg border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 text-indigo-800 dark:text-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
                                  gram
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                              {diff >= 0 ? `+${diff}` : diff} gram
                            </td>
                            <td className="py-3.5 px-3 text-center print:hidden">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditGrammageModal(item)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900 text-blue-800 dark:text-sky-300 text-[11px] font-bold transition cursor-pointer"
                                  title="Edit manual nama item, kategori, berat gramasi kecil & besar"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                  <span>Edit</span>
                                </button>
                                {item.categoryKey === 'custom' && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteGrammageItem(item.id)}
                                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                                    title="Hapus Item Manual"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 dark:bg-slate-800 font-bold border-t-2 border-slate-300 dark:border-slate-700 text-xs">
                      <td colSpan={3} className="py-3 px-3 text-right uppercase tracking-wider text-slate-700 dark:text-slate-200">
                        TOTAL GRAMASI PER SAJIAN ({grammageDrafts.length} ITEM MENU):
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-black text-sky-800 dark:text-sky-300 bg-sky-100/70 dark:bg-sky-950/40">
                        {formatNumber(totalSmallGrams)} gram
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-black text-indigo-800 dark:text-indigo-300 bg-indigo-100/70 dark:bg-indigo-950/40">
                        {formatNumber(totalLargeGrams)} gram
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-black text-slate-800 dark:text-slate-200">
                        {totalLargeGrams - totalSmallGrams >= 0 ? '+' : ''}
                        {formatNumber(totalLargeGrams - totalSmallGrams)} gram
                      </td>
                      <td className="py-3 px-3 text-center print:hidden">
                        {hasUnsavedGrammageChanges && (
                          <button
                            type="button"
                            onClick={handleSaveAllGrammageDrafts}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold"
                          >
                            Simpan
                          </button>
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* SUBMODUL C: INPUT & EVALUASI KANDUNGAN GIZI */}
      {/* ========================================================================= */}
      {activeTab === 'kandungan_gizi' && (
        <div className="space-y-6">
          {/* Target AKG Status & Configuration Bar */}
          <div
            className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
              nutritionTarget.isConfigured
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-200'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/80 text-rose-900 dark:text-rose-200'
            }`}
          >
            <div className="flex items-start gap-3">
              {nutritionTarget.isConfigured ? (
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="font-bold flex items-center gap-2">
                  <span>
                    {nutritionTarget.isConfigured
                      ? 'Target Gizi & Referensi Standar Terkonfigurasi'
                      : 'PERINGATAN: Target Gizi Belum Dikonfigurasi!'}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/50 dark:bg-black/30">
                    {nutritionTarget.isConfigured ? 'Status: Evaluasi Aktif' : 'Status: Klaim Dinonaktifkan'}
                  </span>
                </div>
                <p className="text-[11px] mt-0.5 opacity-90">
                  {nutritionTarget.isConfigured
                    ? nutritionTarget.referenceSource
                    : 'Sistem tidak membuat klaim memenuhi standar gizi bila referensi dan target AKG belum dikonfigurasi secara sah.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() =>
                  setNutritionTarget(prev => ({
                    ...prev,
                    isConfigured: !prev.isConfigured,
                  }))
                }
                className="px-3 py-1.5 rounded-lg font-bold text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shadow-2xs hover:bg-slate-50 transition"
              >
                {nutritionTarget.isConfigured ? 'Simulasi Nonaktif Target' : 'Aktifkan Standar AKG BGN'}
              </button>
              <button
                type="button"
                onClick={() => setIsTargetModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded-lg font-bold text-xs shadow-2xs transition"
              >
                <Settings2 className="w-3.5 h-3.5" />
                <span>Atur Ambang Target</span>
              </button>
            </div>
          </div>

          {/* Cards: Comparison Porsi Kecil vs Porsi Besar vs Target AKG */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Porsi Kecil Evaluation */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h4 className="text-sm font-black text-sky-700 dark:text-sky-300 flex items-center gap-2">
                    <Apple className="w-4 h-4" />
                    Porsi Kecil (TK / PAUD & Kelas 1 - 3 SD)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Standar AKG Makan Siang (30-35% AKG Harian Anak 4-9 Tahun)
                  </p>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                  {formatNumber(quotaSmall)} Porsi
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {/* Energi */}
                {(() => {
                  const ev = evaluateTarget(
                    nutritionSummarySmall.calories,
                    nutritionTarget.smallPortionTarget.caloriesMin,
                    nutritionTarget.smallPortionTarget.caloriesMax,
                    nutritionTarget.isConfigured
                  );
                  return (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Energi Total</div>
                      <div className="text-lg font-black text-slate-900 dark:text-white font-mono">
                        {Math.round(nutritionSummarySmall.calories)} <span className="text-xs font-normal text-slate-400">kkal</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Target: {nutritionTarget.smallPortionTarget.caloriesMin}-{nutritionTarget.smallPortionTarget.caloriesMax} kkal
                      </div>
                      <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold ${ev.colorClass}`}>
                        {ev.label}
                      </span>
                    </div>
                  );
                })()}

                {/* Protein */}
                {(() => {
                  const ev = evaluateTarget(
                    nutritionSummarySmall.protein,
                    nutritionTarget.smallPortionTarget.proteinMin,
                    nutritionTarget.smallPortionTarget.proteinMax,
                    nutritionTarget.isConfigured
                  );
                  return (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Protein</div>
                      <div className="text-lg font-black text-sky-600 font-mono">
                        {nutritionSummarySmall.protein.toFixed(1)} <span className="text-xs font-normal text-slate-400">g</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Target: {nutritionTarget.smallPortionTarget.proteinMin}-{nutritionTarget.smallPortionTarget.proteinMax} g
                      </div>
                      <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold ${ev.colorClass}`}>
                        {ev.label}
                      </span>
                    </div>
                  );
                })()}

                {/* Lemak */}
                {(() => {
                  const ev = evaluateTarget(
                    nutritionSummarySmall.fat,
                    nutritionTarget.smallPortionTarget.fatMin,
                    nutritionTarget.smallPortionTarget.fatMax,
                    nutritionTarget.isConfigured
                  );
                  return (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Lemak</div>
                      <div className="text-lg font-black text-amber-600 font-mono">
                        {nutritionSummarySmall.fat.toFixed(1)} <span className="text-xs font-normal text-slate-400">g</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Target: {nutritionTarget.smallPortionTarget.fatMin}-{nutritionTarget.smallPortionTarget.fatMax} g
                      </div>
                      <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold ${ev.colorClass}`}>
                        {ev.label}
                      </span>
                    </div>
                  );
                })()}

                {/* Karbohidrat */}
                {(() => {
                  const ev = evaluateTarget(
                    nutritionSummarySmall.carbs,
                    nutritionTarget.smallPortionTarget.carbMin,
                    nutritionTarget.smallPortionTarget.carbMax,
                    nutritionTarget.isConfigured
                  );
                  return (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Karbohidrat</div>
                      <div className="text-lg font-black text-indigo-600 font-mono">
                        {nutritionSummarySmall.carbs.toFixed(1)} <span className="text-xs font-normal text-slate-400">g</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Target: {nutritionTarget.smallPortionTarget.carbMin}-{nutritionTarget.smallPortionTarget.carbMax} g
                      </div>
                      <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold ${ev.colorClass}`}>
                        {ev.label}
                      </span>
                    </div>
                  );
                })()}

                {/* Serat */}
                {(() => {
                  const ev = evaluateTarget(
                    nutritionSummarySmall.fiber,
                    nutritionTarget.smallPortionTarget.fiberMin,
                    nutritionTarget.smallPortionTarget.fiberMax,
                    nutritionTarget.isConfigured
                  );
                  return (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Serat Pangan</div>
                      <div className="text-lg font-black text-emerald-600 font-mono">
                        {nutritionSummarySmall.fiber.toFixed(1)} <span className="text-xs font-normal text-slate-400">g</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Target: {nutritionTarget.smallPortionTarget.fiberMin}-{nutritionTarget.smallPortionTarget.fiberMax} g
                      </div>
                      <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold ${ev.colorClass}`}>
                        {ev.label}
                      </span>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Porsi Besar Evaluation */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h4 className="text-sm font-black text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
                    <Apple className="w-4 h-4" />
                    Porsi Besar (SD 4 - 6, SMP, SMA, Santri)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Standar AKG Makan Siang (30-35% AKG Harian Remaja & Santri)
                  </p>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                  {formatNumber(quotaLarge)} Porsi
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {/* Energi */}
                {(() => {
                  const ev = evaluateTarget(
                    nutritionSummaryLarge.calories,
                    nutritionTarget.largePortionTarget.caloriesMin,
                    nutritionTarget.largePortionTarget.caloriesMax,
                    nutritionTarget.isConfigured
                  );
                  return (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Energi Total</div>
                      <div className="text-lg font-black text-slate-900 dark:text-white font-mono">
                        {Math.round(nutritionSummaryLarge.calories)} <span className="text-xs font-normal text-slate-400">kkal</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Target: {nutritionTarget.largePortionTarget.caloriesMin}-{nutritionTarget.largePortionTarget.caloriesMax} kkal
                      </div>
                      <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold ${ev.colorClass}`}>
                        {ev.label}
                      </span>
                    </div>
                  );
                })()}

                {/* Protein */}
                {(() => {
                  const ev = evaluateTarget(
                    nutritionSummaryLarge.protein,
                    nutritionTarget.largePortionTarget.proteinMin,
                    nutritionTarget.largePortionTarget.proteinMax,
                    nutritionTarget.isConfigured
                  );
                  return (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Protein</div>
                      <div className="text-lg font-black text-sky-600 font-mono">
                        {nutritionSummaryLarge.protein.toFixed(1)} <span className="text-xs font-normal text-slate-400">g</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Target: {nutritionTarget.largePortionTarget.proteinMin}-{nutritionTarget.largePortionTarget.proteinMax} g
                      </div>
                      <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold ${ev.colorClass}`}>
                        {ev.label}
                      </span>
                    </div>
                  );
                })()}

                {/* Lemak */}
                {(() => {
                  const ev = evaluateTarget(
                    nutritionSummaryLarge.fat,
                    nutritionTarget.largePortionTarget.fatMin,
                    nutritionTarget.largePortionTarget.fatMax,
                    nutritionTarget.isConfigured
                  );
                  return (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Lemak</div>
                      <div className="text-lg font-black text-amber-600 font-mono">
                        {nutritionSummaryLarge.fat.toFixed(1)} <span className="text-xs font-normal text-slate-400">g</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Target: {nutritionTarget.largePortionTarget.fatMin}-{nutritionTarget.largePortionTarget.fatMax} g
                      </div>
                      <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold ${ev.colorClass}`}>
                        {ev.label}
                      </span>
                    </div>
                  );
                })()}

                {/* Karbohidrat */}
                {(() => {
                  const ev = evaluateTarget(
                    nutritionSummaryLarge.carbs,
                    nutritionTarget.largePortionTarget.carbMin,
                    nutritionTarget.largePortionTarget.carbMax,
                    nutritionTarget.isConfigured
                  );
                  return (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Karbohidrat</div>
                      <div className="text-lg font-black text-indigo-600 font-mono">
                        {nutritionSummaryLarge.carbs.toFixed(1)} <span className="text-xs font-normal text-slate-400">g</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Target: {nutritionTarget.largePortionTarget.carbMin}-{nutritionTarget.largePortionTarget.carbMax} g
                      </div>
                      <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold ${ev.colorClass}`}>
                        {ev.label}
                      </span>
                    </div>
                  );
                })()}

                {/* Serat */}
                {(() => {
                  const ev = evaluateTarget(
                    nutritionSummaryLarge.fiber,
                    nutritionTarget.largePortionTarget.fiberMin,
                    nutritionTarget.largePortionTarget.fiberMax,
                    nutritionTarget.isConfigured
                  );
                  return (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Serat Pangan</div>
                      <div className="text-lg font-black text-emerald-600 font-mono">
                        {nutritionSummaryLarge.fiber.toFixed(1)} <span className="text-xs font-normal text-slate-400">g</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Target: {nutritionTarget.largePortionTarget.fiberMin}-{nutritionTarget.largePortionTarget.fiberMax} g
                      </div>
                      <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold ${ev.colorClass}`}>
                        {ev.label}
                      </span>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Table: Kandungan Gizi per Bahan Pangan (Nilai Gizi = Berat Bersih / 100 * Kandungan per 100g) */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300">
                  Rincian Kontribusi Gizi per Bahan Pangan (TKPI 2020)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Perhitungan: Gizi Bahan = (Berat Bersih / 100) × Kandungan Gizi per 100g
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                    <th className="p-3">Nama Bahan</th>
                    <th className="p-3">Kategori</th>
                    <th className="p-3 text-center">Gram Bersih (K/B)</th>
                    <th className="p-3 text-right">Energi per 100g</th>
                    <th className="p-3 text-right">Protein per 100g</th>
                    <th className="p-3 text-right">Lemak per 100g</th>
                    <th className="p-3 text-right">Karbo per 100g</th>
                    <th className="p-3 text-right">Serat per 100g</th>
                    <th className="p-3 text-center">Sumber Referensi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {ingredientsCalculated.map(i => (
                    <tr key={i.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-3 font-sans font-bold text-slate-900 dark:text-white">
                        {i.name}
                      </td>
                      <td className="p-3 font-sans text-slate-500">{i.category}</td>
                      <td className="p-3 text-center font-bold">
                        <span className="text-sky-600">{i.netWeightSmall}g</span> /{' '}
                        <span className="text-indigo-600">{i.netWeightLarge}g</span>
                      </td>
                      <td className="p-3 text-right">{i.calories100g} kkal</td>
                      <td className="p-3 text-right text-sky-700 dark:text-sky-400 font-bold">{i.protein100g} g</td>
                      <td className="p-3 text-right text-amber-700 dark:text-amber-400">{i.fat100g} g</td>
                      <td className="p-3 text-right text-indigo-700 dark:text-indigo-400">{i.carb100g} g</td>
                      <td className="p-3 text-right text-emerald-700 dark:text-emerald-400">{i.fiber100g} g</td>
                      <td className="p-3 text-center font-sans text-[10px] text-slate-500">
                        {i.referenceSource}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBMODUL C: INPUT FOOD COST MENU & ANALISIS ANGGARAN */}
      {/* ========================================================================= */}
      {activeTab === 'food_cost' && (
        <div className="space-y-6">
          {/* Konfigurasi Pagu Anggaran Dua Kategori (Porsi Besar & Porsi Kecil) */}
          <form
            onSubmit={handleSaveBudgetCaps}
            className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4"
          >
            <div className="space-y-1">
              <div className="text-xs font-extrabold uppercase tracking-wide text-slate-800 dark:text-white flex items-center gap-2">
                <Coins className="w-4 h-4 text-emerald-600" />
                <span>Pengaturan Pagu Anggaran MBG (2 Kategori Porsi)</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Total Pagu Harian = ({formatNumber(quotaLarge)} Porsi Besar × {formatRupiah(largeBudgetCap)}) + ({formatNumber(quotaSmall)} Porsi Kecil × {formatRupiah(smallBudgetCap)}) ={' '}
                <strong className="text-slate-900 dark:text-white font-mono">
                  {formatRupiah(totalBudgetCap)}
                </strong>
              </p>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-indigo-700 dark:text-indigo-300 mb-1">
                  Porsi Besar (Rp / Porsi)
                </label>
                <input
                  type="number"
                  min={0}
                  step={500}
                  disabled={!hasPermission('menu', 'edit')}
                  value={largeCapDraft}
                  onChange={e => setLargeCapDraft(Math.max(0, Number(e.target.value) || 0))}
                  className="w-36 px-3 py-1.5 text-xs font-mono font-bold rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/40 text-slate-900 dark:text-white disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-sky-700 dark:text-sky-300 mb-1">
                  Porsi Kecil (Rp / Porsi)
                </label>
                <input
                  type="number"
                  min={0}
                  step={500}
                  disabled={!hasPermission('menu', 'edit')}
                  value={smallCapDraft}
                  onChange={e => setSmallCapDraft(Math.max(0, Number(e.target.value) || 0))}
                  className="w-36 px-3 py-1.5 text-xs font-mono font-bold rounded-lg border border-sky-200 dark:border-sky-800 bg-sky-50/50 dark:bg-sky-950/40 text-slate-900 dark:text-white disabled:opacity-60"
                />
              </div>

              {hasPermission('menu', 'edit') && (
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-900 hover:bg-blue-800 dark:bg-sky-600 dark:hover:bg-sky-500 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  Simpan Pagu
                </button>
              )}
            </div>
          </form>

          {/* Top Indicator Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1.5">
              <div className="text-[11px] text-slate-500 uppercase font-bold">Pagu Anggaran MBG</div>
              <div className="flex items-center justify-between text-xs pt-0.5">
                <span className="font-semibold text-indigo-700 dark:text-indigo-300">Porsi Besar:</span>
                <span className="font-mono font-black text-sm text-indigo-700 dark:text-indigo-300">
                  {formatRupiah(largeBudgetCap)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-sky-700 dark:text-sky-300">Porsi Kecil:</span>
                <span className="font-mono font-black text-sm text-sky-700 dark:text-sky-300">
                  {formatRupiah(smallBudgetCap)}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                Total Pagu Harian: <strong className="text-slate-700 dark:text-slate-200">{formatRupiah(totalBudgetCap)}</strong>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="text-[11px] text-slate-500 uppercase font-bold">Food Cost Porsi Kecil</div>
              <div className="text-xl font-black text-sky-600 mt-1">
                {formatRupiah(Math.round(costPerPortionSmall))}
              </div>
              <div className="text-[10px] text-sky-700 dark:text-sky-300 font-semibold mt-0.5">
                {percentToCapSmall.toFixed(1)}% dari Pagu {formatRupiah(smallBudgetCap)}
              </div>
              <div
                className={`text-[10px] font-bold mt-1 ${
                  budgetDiffSmallPerPortion >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {budgetDiffSmallPerPortion >= 0
                  ? `Hemat +${formatRupiah(Math.round(budgetDiffSmallPerPortion))}/porsi`
                  : `Over -${formatRupiah(Math.abs(Math.round(budgetDiffSmallPerPortion)))}/porsi`}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="text-[11px] text-slate-500 uppercase font-bold">Food Cost Porsi Besar</div>
              <div className="text-xl font-black text-indigo-600 mt-1">
                {formatRupiah(Math.round(costPerPortionLarge))}
              </div>
              <div className="text-[10px] text-indigo-700 dark:text-indigo-300 font-semibold mt-0.5">
                {percentToCapLarge.toFixed(1)}% dari Pagu {formatRupiah(largeBudgetCap)}
              </div>
              <div
                className={`text-[10px] font-bold mt-1 ${
                  budgetDiffLargePerPortion >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {budgetDiffLargePerPortion >= 0
                  ? `Hemat +${formatRupiah(Math.round(budgetDiffLargePerPortion))}/porsi`
                  : `Over -${formatRupiah(Math.abs(Math.round(budgetDiffLargePerPortion)))}/porsi`}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="text-[11px] text-slate-500 uppercase font-bold">
                {budgetDifferenceTotal >= 0 ? 'Selisih Anggaran (Hemat)' : 'Selisih Anggaran (Defisit)'}
              </div>
              <div
                className={`text-xl font-black mt-1 ${
                  budgetDifferenceTotal >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {budgetDifferenceTotal >= 0 ? '+' : '-'}
                {formatRupiah(Math.abs(budgetDifferenceTotal))}
              </div>
              <div
                className={`text-[10px] font-semibold mt-0.5 ${
                  budgetDifferenceTotal >= 0
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : 'text-rose-700 dark:text-rose-300'
                }`}
              >
                {budgetDifferenceTotal >= 0 ? 'Surplus Operasional SPPG' : 'Melebihi Pagu Gabungan'} (
                {totalBudgetCap > 0 ? ((Math.abs(budgetDifferenceTotal) / totalBudgetCap) * 100).toFixed(1) : '0.0'}%)
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                Serapan Total: {percentToCapAvg.toFixed(1)}% dari Pagu
              </div>
            </div>
          </div>

          {/* Table: Food Cost Bahan = Jumlah bahan x Harga satuan */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Rincian Food Cost Bahan: {currentMenu?.menuCode} ({formatNumber(totalBeneficiaries)} Porsi)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Perhitungan: Food Cost Bahan = Jumlah Kebutuhan × Harga Satuan | Pembanding Pagu: Porsi Besar {formatRupiah(largeBudgetCap)} &amp; Porsi Kecil {formatRupiah(smallBudgetCap)}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                    <th className="p-3">Nama Bahan</th>
                    <th className="p-3">Kategori</th>
                    <th className="p-3 text-right">Harga Satuan</th>
                    <th className="p-3 text-right">Total Kebutuhan Beli</th>
                    <th className="p-3 text-right font-black">Total Biaya Bahan</th>
                    <th className="p-3 text-right text-sky-600">Cost / Porsi Kecil</th>
                    <th className="p-3 text-right text-indigo-600">Cost / Porsi Besar</th>
                    <th className="p-3 text-right">% Kontribusi Biaya</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {ingredientsCalculated.map(i => {
                    const sharePercent = totalMenuProcurementCost > 0 ? (i.totalCost / totalMenuProcurementCost) * 100 : 0;
                    return (
                      <tr key={i.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="p-3 font-sans font-bold text-slate-900 dark:text-white">
                          {i.name}
                        </td>
                        <td className="p-3 font-sans text-slate-500">{i.category}</td>
                        <td className="p-3 text-right">{formatRupiah(i.unitPrice)}</td>
                        <td className="p-3 text-right font-bold text-slate-800 dark:text-slate-200">
                          {i.purchaseQty.toFixed(2)} {i.purchaseUnit}
                        </td>
                        <td className="p-3 text-right font-black text-emerald-700 dark:text-emerald-400">
                          {formatRupiah(i.totalCost)}
                        </td>
                        <td className="p-3 text-right text-sky-700 dark:text-sky-300">
                          {formatRupiah(Math.round(i.costPortionSmall))}
                        </td>
                        <td className="p-3 text-right text-indigo-700 dark:text-indigo-300">
                          {formatRupiah(Math.round(i.costPortionLarge))}
                        </td>
                        <td className="p-3 text-right font-sans font-bold">
                          <span className="text-slate-700 dark:text-slate-300">{sharePercent.toFixed(1)}%</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 dark:bg-slate-800 font-bold font-mono border-t border-slate-300 dark:border-slate-700 text-xs">
                    <td colSpan={4} className="p-3 font-sans text-right uppercase tracking-wider">
                      TOTAL FOOD COST MENU ({formatNumber(totalBeneficiaries)} Porsi):
                    </td>
                    <td className="p-3 text-right text-emerald-700 dark:text-emerald-400 text-sm font-black">
                      {formatRupiah(totalMenuProcurementCost)}
                    </td>
                    <td className="p-3 text-right text-sky-700 dark:text-sky-300 text-xs font-black">
                      {formatRupiah(Math.round(costPerPortionSmall))}
                    </td>
                    <td className="p-3 text-right text-indigo-700 dark:text-indigo-300 text-xs font-black">
                      {formatRupiah(Math.round(costPerPortionLarge))}
                    </td>
                    <td className="p-3 text-right text-slate-900 dark:text-white font-black">
                      100.0%
                    </td>
                  </tr>
                  <tr className="bg-slate-50 dark:bg-slate-900/90 font-semibold font-mono border-t border-slate-200 dark:border-slate-700 text-[11px]">
                    <td colSpan={4} className="px-3 py-2.5 font-sans text-right uppercase tracking-wider text-slate-500">
                      BATAS PAGU ANGGARAN MBG (2 KATEGORI):
                    </td>
                    <td className="px-3 py-2.5 text-right text-slate-800 dark:text-slate-200 font-bold">
                      {formatRupiah(totalBudgetCap)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-sky-600 dark:text-sky-400 font-bold">
                      {formatRupiah(smallBudgetCap)} ({percentToCapSmall.toFixed(1)}%)
                    </td>
                    <td className="px-3 py-2.5 text-right text-indigo-600 dark:text-indigo-400 font-bold">
                      {formatRupiah(largeBudgetCap)} ({percentToCapLarge.toFixed(1)}%)
                    </td>
                    <td className="px-3 py-2.5 text-right text-slate-700 dark:text-slate-300 font-bold">
                      {percentToCapAvg.toFixed(1)}%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBMODUL D: JOBDESK DIVISI & SOP FOTO */}
      {/* ========================================================================= */}
      {activeTab === 'jobdesk_divisi' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-900 dark:text-sky-400" />
                Standar Operasional Prosedur (SOP) & Jobdesk Divisi Dapur MBG
              </h3>
              <p className="text-xs text-slate-500">
                Instruksi kerja per divisi untuk menu {currentMenu?.menuCode} ({currentMenu?.animalProtein}), bahan yang ditangani, dan foto contoh standar
              </p>
            </div>

            <button
              onClick={triggerPrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Lembar Jobdesk Dapur</span>
            </button>
          </div>

          {/* Grid of Division Jobdesks with Multi-Photo Upload & SOP Edit */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {jobdesks.map(job => {
              const photos = getJobdeskPhotos(job);
              const coverPhoto = photos[0] || '';
              const isPersiapan = job.divisionName === 'Relawan Div. Persiapan';

              return (
                <div
                  key={job.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs flex flex-col"
                >
                  {/* Division Header */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shrink-0" />
                      <h4 className="text-sm font-black text-slate-900 dark:text-white">
                        {job.divisionName}
                      </h4>
                      {isPersiapan && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                          Multi-Foto (&gt;1)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          job.status === 'Selesai Sesuai Standar'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : job.status === 'Sedang Berjalan'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {job.status}
                      </span>
                      <button
                        type="button"
                        onClick={() => openJobdeskEditModal(job)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-200 transition"
                        title="Edit SOP & Kelola Galeri Foto"
                      >
                        <Edit className="w-3 h-3 text-blue-700 dark:text-sky-400" />
                        <span>SOP Edit</span>
                      </button>
                    </div>
                  </div>

                  {/* Photo Example Cover Container */}
                  <div className="relative h-48 bg-slate-100 dark:bg-slate-800 overflow-hidden group">
                    {coverPhoto ? (
                      <img
                        src={coverPhoto}
                        alt={job.divisionName}
                        onClick={() =>
                          setPhotoLightbox({
                            divisionName: job.divisionName,
                            photos,
                            index: 0,
                            caption: job.photoCaption,
                          })
                        }
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-xs gap-1.5">
                        <Image className="w-8 h-8 opacity-50" />
                        <span>Belum ada foto SOP terunggah</span>
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent pointer-events-none flex items-end p-3">
                      <p className="text-white text-[11px] leading-snug drop-shadow-xs italic line-clamp-2">
                        {job.photoCaption || 'Foto contoh standar kerja divisi'}
                      </p>
                    </div>

                    {/* Top-Left Photo Count Badge */}
                    <button
                      type="button"
                      onClick={() => {
                        if (photos.length > 0) {
                          setPhotoLightbox({
                            divisionName: job.divisionName,
                            photos,
                            index: 0,
                            caption: job.photoCaption,
                          });
                        }
                      }}
                      className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-black/60 hover:bg-black/80 text-white text-[10px] font-bold flex items-center gap-1 backdrop-blur-xs transition"
                    >
                      <Image className="w-3 h-3" />
                      <span>{photos.length} Foto</span>
                    </button>

                    {/* Top-Right Multi-Photo Upload Overlay */}
                    <label className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-black/65 hover:bg-black/85 text-white text-[11px] font-bold flex items-center gap-1.5 cursor-pointer backdrop-blur-xs transition">
                      <Camera className="w-3.5 h-3.5" />
                      <span>+ Tambah Foto</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={e => handlePhotoUpload(e, job.id)}
                      />
                    </label>
                  </div>

                  {/* Multi-Photo Gallery Strip */}
                  <div className="px-4 py-2.5 bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Galeri Dokumentasi SOP ({photos.length} Gambar)
                      </span>
                      {photos.length > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            setPhotoLightbox({
                              divisionName: job.divisionName,
                              photos,
                              index: 0,
                              caption: job.photoCaption,
                            })
                          }
                          className="text-[10px] font-bold text-blue-700 dark:text-sky-400 hover:underline flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          Lihat Semua
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      {photos.map((photoSrc, idx) => (
                        <div
                          key={`${job.id}-photo-${idx}`}
                          className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 group/thumb bg-slate-100 dark:bg-slate-800"
                        >
                          <img
                            src={photoSrc}
                            alt={`${job.divisionName} ${idx + 1}`}
                            onClick={() =>
                              setPhotoLightbox({
                                divisionName: job.divisionName,
                                photos,
                                index: idx,
                                caption: job.photoCaption,
                              })
                            }
                            className="w-full h-full object-cover cursor-pointer"
                          />
                          {idx === 0 && (
                            <span className="absolute bottom-0 inset-x-0 bg-blue-900/85 text-white text-[8px] font-bold text-center py-0.5 leading-none">
                              Utama
                            </span>
                          )}
                          <div className="absolute top-0.5 right-0.5 flex items-center gap-0.5 opacity-0 group-hover/thumb:opacity-100 transition-opacity">
                            {idx !== 0 && (
                              <button
                                type="button"
                                onClick={() => handleSetPrimaryJobdeskPhoto(job.id, idx)}
                                title="Jadikan Foto Utama"
                                className="w-4 h-4 rounded bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center shadow-xs"
                              >
                                <Star className="w-2.5 h-2.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveJobdeskPhoto(job.id, idx)}
                              title="Hapus Foto"
                              className="w-4 h-4 rounded bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-xs"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>
                      ))}

                      <label
                        title="Unggah satu atau banyak foto sekaligus"
                        className="w-14 h-14 rounded-lg border-2 border-dashed border-sky-400/70 dark:border-sky-600/70 hover:border-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 flex flex-col items-center justify-center gap-0.5 text-sky-700 dark:text-sky-400 cursor-pointer shrink-0 transition"
                      >
                        <Plus className="w-4 h-4" />
                        <span className="text-[8px] font-bold text-center leading-tight px-0.5">
                          Upload
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={e => handlePhotoUpload(e, job.id)}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Jobdesk Content */}
                  <div className="p-4 space-y-3 flex-1 flex flex-col justify-between text-xs">
                    <div className="space-y-2">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400">
                          Bahan yang Ditangani:
                        </span>
                        <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                          {job.ingredientsHandled}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400">
                          Tugas & Prosedur Spesifik:
                        </span>
                        <div className="text-slate-600 dark:text-slate-300 mt-0.5 whitespace-pre-line leading-relaxed font-sans bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                          {job.tasks}
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-800 pt-2.5 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                      <div className="truncate">
                        Koordinator: <strong>{job.picName}</strong>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => openJobdeskEditModal(job)}
                          className="text-[10px] font-bold text-blue-800 dark:text-sky-400 hover:underline"
                        >
                          Edit SOP & Foto
                        </button>
                        <span className="text-[10px] font-mono text-sky-600">
                          {currentMenu?.menuCode}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT MANUAL GRAMASI ITEM MENU                                      */}
      {/* ========================================================================= */}
      <Modal
        isOpen={Boolean(editingGrammageItem)}
        onClose={() => setEditingGrammageItem(null)}
        title="Edit Manual Gramasi Item Menu"
        subtitle={`Sesuaikan nama item hidangan dan berat per gram porsi kecil vs porsi besar (${currentMenu?.menuCode || ''})`}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveEditGrammageModal} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Kategori Item Menu *
              </label>
              <input
                type="text"
                required
                value={grammageEditForm.categoryLabel}
                onChange={e =>
                  setGrammageEditForm(prev => ({ ...prev, categoryLabel: e.target.value }))
                }
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nama Item Menu *
              </label>
              <input
                type="text"
                required
                value={grammageEditForm.itemName}
                onChange={e =>
                  setGrammageEditForm(prev => ({ ...prev, itemName: e.target.value }))
                }
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800">
              <label className="block text-xs font-bold text-sky-800 dark:text-sky-300 mb-1">
                Berat Gramasi Porsi Kecil (gram) *
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  step={1}
                  required
                  value={grammageEditForm.smallGrams}
                  onChange={e =>
                    setGrammageEditForm(prev => ({
                      ...prev,
                      smallGrams: Math.max(0, Number(e.target.value) || 0),
                    }))
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg border border-sky-300 dark:border-sky-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-black"
                />
                <span className="text-xs font-bold text-sky-700 dark:text-sky-300">gram</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800">
              <label className="block text-xs font-bold text-indigo-800 dark:text-indigo-300 mb-1">
                Berat Gramasi Porsi Besar (gram) *
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  step={1}
                  required
                  value={grammageEditForm.largeGrams}
                  onChange={e =>
                    setGrammageEditForm(prev => ({
                      ...prev,
                      largeGrams: Math.max(0, Number(e.target.value) || 0),
                    }))
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-black"
                />
                <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">gram</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Catatan / Keterangan Penyajian
            </label>
            <input
              type="text"
              value={grammageEditForm.notes}
              onChange={e => setGrammageEditForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Contoh: Berat bersih siap saji dalam sekat ompreng"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setEditingGrammageItem(null)}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold rounded-lg bg-blue-900 hover:bg-blue-800 text-white shadow-xs"
            >
              Simpan Perubahan
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: TAMBAH ITEM GRAMASI MENU MANUAL                                    */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isAddGrammageModalOpen}
        onClose={() => setIsAddGrammageModalOpen(false)}
        title="Tambah Item Menu Manual (Gramasi)"
        subtitle={`Tambahkan item hidangan pendamping khusus untuk menu ${currentMenu?.menuCode || ''}`}
        maxWidth="lg"
      >
        <form onSubmit={handleAddManualGrammageItem} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Kategori Hidangan *
              </label>
              <input
                type="text"
                required
                value={newGrammageForm.categoryLabel}
                onChange={e =>
                  setNewGrammageForm(prev => ({ ...prev, categoryLabel: e.target.value }))
                }
                placeholder="Contoh: Pelengkap / Sambal / Kuah"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nama Item Menu *
              </label>
              <input
                type="text"
                required
                value={newGrammageForm.itemName}
                onChange={e =>
                  setNewGrammageForm(prev => ({ ...prev, itemName: e.target.value }))
                }
                placeholder="Contoh: Sambal Tomat Tidak Pedas / Kerupuk Udang"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-sky-700 dark:text-sky-300 mb-1">
                Gramasi Porsi Kecil (gram) *
              </label>
              <input
                type="number"
                min={0}
                step={1}
                required
                value={newGrammageForm.smallGrams}
                onChange={e =>
                  setNewGrammageForm(prev => ({
                    ...prev,
                    smallGrams: Math.max(0, Number(e.target.value) || 0),
                  }))
                }
                className="w-full px-3 py-2 text-xs rounded-lg border border-sky-300 dark:border-sky-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-indigo-700 dark:text-indigo-300 mb-1">
                Gramasi Porsi Besar (gram) *
              </label>
              <input
                type="number"
                min={0}
                step={1}
                required
                value={newGrammageForm.largeGrams}
                onChange={e =>
                  setNewGrammageForm(prev => ({
                    ...prev,
                    largeGrams: Math.max(0, Number(e.target.value) || 0),
                  }))
                }
                className="w-full px-3 py-2 text-xs rounded-lg border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Catatan / Keterangan
            </label>
            <input
              type="text"
              value={newGrammageForm.notes}
              onChange={e => setNewGrammageForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Opsional"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddGrammageModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold rounded-lg bg-blue-900 hover:bg-blue-800 text-white shadow-xs"
            >
              Tambahkan Item
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: TAMBAH BAHAN RESEP */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isAddIngredientModalOpen}
        onClose={() => setIsAddIngredientModalOpen(false)}
        title="Tambah Bahan ke Perencanaan Menu"
        subtitle={`Pilih bahan dari database pangan dan tentukan gramasi porsi kecil & besar`}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveIngredientToMenu} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Pilih Bahan dari Komposisi Pangan (TKPI 2020 / USDA) *
            </label>
            <select
              value={selectedCompositionId}
              onChange={e => handleCompositionChange(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
            >
              {foodCompositions.map(c => (
                <option key={c.id} value={c.id}>
                  {c.code} - {c.name} ({c.category}) — BDD {c.ediblePortion}%
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-bold text-sky-700 dark:text-sky-300 mb-1">
                BB Porsi Kecil (g) *
              </label>
              <input
                type="number"
                min="1"
                required
                value={customGramSmall}
                onChange={e => setCustomGramSmall(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-indigo-700 dark:text-indigo-300 mb-1">
                BB Porsi Besar (g) *
              </label>
              <input
                type="number"
                min="1"
                required
                value={customGramLarge}
                onChange={e => setCustomGramLarge(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-rose-700 dark:text-rose-300 mb-1">
                Buffer P. Kecil (%)
              </label>
              <input
                type="number"
                min="0"
                max="50"
                step="0.5"
                value={customBufferSmallPct}
                onChange={e => setCustomBufferSmallPct(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-emerald-700 dark:text-emerald-300 mb-1">
                Buffer P. Besar (%)
              </label>
              <input
                type="number"
                min="0"
                max="50"
                step="0.5"
                value={customBufferLargePct}
                onChange={e => setCustomBufferLargePct(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Persentase BDD (% Dapat Dimakan) *
              </label>
              <input
                type="number"
                min="10"
                max="100"
                required
                value={customBdd}
                onChange={e => setCustomBdd(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Satuan Beli (Master Satuan) *
              </label>
              <select
                required
                value={customPurchaseUnit}
                onChange={e => setCustomPurchaseUnit(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
              >
                {masterUnits.map(u => (
                  <option key={u.id} value={u.code}>
                    {u.code} — {u.name}
                  </option>
                ))}
                {customPurchaseUnit && !masterUnits.some(u => u.code === customPurchaseUnit) && (
                  <option value={customPurchaseUnit}>{customPurchaseUnit}</option>
                )}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Harga per {customPurchaseUnit} (Rp) *
              </label>
              <input
                type="number"
                min="100"
                required
                value={customUnitPrice}
                onChange={e => setCustomUnitPrice(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddIngredientModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold rounded-lg bg-blue-900 hover:bg-blue-800 text-white shadow-xs"
            >
              Tambahkan ke Resep
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: KONFIGURASI TARGET GIZI (AKG) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isTargetModalOpen}
        onClose={() => setIsTargetModalOpen(false)}
        title="Konfigurasi Standar Kecukupan Gizi (AKG Makan Siang)"
        subtitle="Atur referensi resmi dan rentang minimal-maksimal gizi per porsi untuk evaluasi kepatuhan BGN"
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Sumber Referensi Standar Gizi *
            </label>
            <input
              type="text"
              value={nutritionTarget.referenceSource}
              onChange={e =>
                setNutritionTarget({
                  ...nutritionTarget,
                  referenceSource: e.target.value,
                })
              }
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          {/* Small portion targets */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl space-y-2 border border-slate-200 dark:border-slate-800">
            <span className="font-bold text-sky-700 dark:text-sky-300">
              Rentang Target Porsi Kecil (TK/SD 1-3)
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-500">Kalori Min - Max (kkal)</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={nutritionTarget.smallPortionTarget.caloriesMin}
                    onChange={e =>
                      setNutritionTarget({
                        ...nutritionTarget,
                        smallPortionTarget: {
                          ...nutritionTarget.smallPortionTarget,
                          caloriesMin: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                  <span>-</span>
                  <input
                    type="number"
                    value={nutritionTarget.smallPortionTarget.caloriesMax}
                    onChange={e =>
                      setNutritionTarget({
                        ...nutritionTarget,
                        smallPortionTarget: {
                          ...nutritionTarget.smallPortionTarget,
                          caloriesMax: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-500">Protein Min - Max (g)</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={nutritionTarget.smallPortionTarget.proteinMin}
                    onChange={e =>
                      setNutritionTarget({
                        ...nutritionTarget,
                        smallPortionTarget: {
                          ...nutritionTarget.smallPortionTarget,
                          proteinMin: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                  <span>-</span>
                  <input
                    type="number"
                    value={nutritionTarget.smallPortionTarget.proteinMax}
                    onChange={e =>
                      setNutritionTarget({
                        ...nutritionTarget,
                        smallPortionTarget: {
                          ...nutritionTarget.smallPortionTarget,
                          proteinMax: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsTargetModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-900 text-white"
            >
              Simpan Konfigurasi
            </button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: BUAT MENU BARU (DYNAMIC & EDITABLE FORM) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isCreateMenuModalOpen}
        onClose={() => setIsCreateMenuModalOpen(false)}
        title="Buat Perencanaan Menu Baru"
        subtitle="Rencanakan hidangan MBG lengkap dengan lauk hewani, nabati, sayuran, dan buah"
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateNewMenu} className="space-y-4">
          <DynamicFormEditToggleBar
            formId="menu_form"
            isEditing={isModalMenuSchemaEdit}
            onToggleEdit={() => setIsModalMenuSchemaEdit(v => !v)}
            compact
          />
          {isModalMenuSchemaEdit && (
            <DynamicFormBuilderPanel
              formId="menu_form"
              onClose={() => setIsModalMenuSchemaEdit(false)}
            />
          )}

          <DynamicFormRenderer
            schema={dynamicFormSchemas.menu_form}
            values={{
              ...newMenuForm,
              ...(newMenuForm.customFields || {}),
            }}
            onChange={(key, value, field) => {
              if (field.isSystem) {
                setNewMenuForm(prev => ({ ...prev, [key]: value }));
              } else {
                setNewMenuForm(prev => ({
                  ...prev,
                  customFields: { ...(prev.customFields || {}), [key]: value },
                }));
              }
            }}
            onUploadError={msg => addToast('error', 'Gagal Unggah Foto', msg)}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              disabled={isSavingNewMenu}
              onClick={() => setIsCreateMenuModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSavingNewMenu}
              className="px-5 py-2 text-xs font-bold rounded-lg bg-blue-900 hover:bg-blue-800 text-white shadow-xs disabled:opacity-60 cursor-pointer"
            >
              {isSavingNewMenu ? 'Menyimpan Menu...' : 'Simpan & Rancang Bahan'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: SOP EDIT & KELOLA MULTI-FOTO JOBDESK DIVISI */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isJobdeskModalOpen}
        onClose={() => setIsJobdeskModalOpen(false)}
        title={`SOP Edit & Galeri Foto — ${jobdeskEditForm.divisionName}`}
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveJobdeskEdit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Koordinator / PIC Divisi
              </label>
              <input
                type="text"
                required
                value={jobdeskEditForm.picName}
                onChange={e =>
                  setJobdeskEditForm(prev => ({ ...prev, picName: e.target.value }))
                }
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Status Pelaksanaan SOP
              </label>
              <select
                value={jobdeskEditForm.status}
                onChange={e =>
                  setJobdeskEditForm(prev => ({
                    ...prev,
                    status: e.target.value as DivisionJobdesk['status'],
                  }))
                }
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                <option value="Belum Mulai">Belum Mulai</option>
                <option value="Sedang Berjalan">Sedang Berjalan</option>
                <option value="Selesai Sesuai Standar">Selesai Sesuai Standar</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Bahan / Objek yang Ditangani
            </label>
            <input
              type="text"
              required
              value={jobdeskEditForm.ingredientsHandled}
              onChange={e =>
                setJobdeskEditForm(prev => ({
                  ...prev,
                  ingredientsHandled: e.target.value,
                }))
              }
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Tugas & Prosedur Spesifik (SOP)
            </label>
            <textarea
              rows={4}
              required
              value={jobdeskEditForm.tasks}
              onChange={e =>
                setJobdeskEditForm(prev => ({ ...prev, tasks: e.target.value }))
              }
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Keterangan Foto Standar SOP
            </label>
            <input
              type="text"
              value={jobdeskEditForm.photoCaption}
              onChange={e =>
                setJobdeskEditForm(prev => ({ ...prev, photoCaption: e.target.value }))
              }
              placeholder="Contoh: Pemotongan bahan sayur, penimbangan gramasi, sanitasi bahan..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            />
          </div>

          {/* Multi-Photo Upload Section inside SOP Edit */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h5 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-sky-600" />
                  Galeri Foto Dokumentasi SOP ({jobdeskEditForm.photoUrls.length} Foto)
                </h5>
                <p className="text-[11px] text-slate-500">
                  Dapat mengunggah lebih dari satu foto sekaligus (JPG, PNG, WebP, maks. 5 MB/foto).
                </p>
              </div>
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold cursor-pointer transition shrink-0">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Banyak Foto</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleModalMultiPhotoUpload}
                />
              </label>
            </div>

            {jobdeskEditForm.photoUrls.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg">
                Belum ada foto dokumentasi SOP. Klik &quot;Upload Banyak Foto&quot; di atas.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {jobdeskEditForm.photoUrls.map((photoSrc, idx) => (
                  <div
                    key={`modal-photo-${idx}`}
                    className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 group"
                  >
                    <img
                      src={photoSrc}
                      alt={`SOP Foto ${idx + 1}`}
                      onClick={() =>
                        setPhotoLightbox({
                          divisionName: jobdeskEditForm.divisionName,
                          photos: jobdeskEditForm.photoUrls,
                          index: idx,
                          caption: jobdeskEditForm.photoCaption,
                        })
                      }
                      className="w-full h-24 object-cover cursor-pointer"
                    />
                    {idx === 0 && (
                      <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-blue-900/90 text-white text-[9px] font-bold">
                        Foto Utama
                      </span>
                    )}
                    <div className="p-1.5 flex items-center justify-between gap-1 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700">
                      {idx !== 0 ? (
                        <button
                          type="button"
                          onClick={() =>
                            setJobdeskEditForm(prev => {
                              const chosen = prev.photoUrls[idx];
                              if (!chosen) return prev;
                              return {
                                ...prev,
                                photoUrls: [
                                  chosen,
                                  ...prev.photoUrls.filter((_, i) => i !== idx),
                                ],
                              };
                            })
                          }
                          className="text-[10px] font-bold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-0.5"
                        >
                          <Star className="w-3 h-3" />
                          Utama
                        </button>
                      ) : (
                        <span className="text-[10px] font-semibold text-slate-500">
                          Sampul #{idx + 1}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          setJobdeskEditForm(prev => ({
                            ...prev,
                            photoUrls: prev.photoUrls.filter((_, i) => i !== idx),
                          }))
                        }
                        className="text-[10px] font-bold text-rose-600 hover:underline flex items-center gap-0.5"
                      >
                        <Trash2 className="w-3 h-3" />
                        Hapus
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsJobdeskModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold rounded-lg bg-blue-900 hover:bg-blue-800 text-white shadow-xs"
            >
              Simpan Perubahan SOP &amp; Foto
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: LIGHTBOX GALERI FOTO SOP */}
      {/* ========================================================================= */}
      <Modal
        isOpen={Boolean(photoLightbox)}
        onClose={() => setPhotoLightbox(null)}
        title={
          photoLightbox
            ? `Galeri Foto SOP — ${photoLightbox.divisionName} (${photoLightbox.index + 1}/${photoLightbox.photos.length})`
            : ''
        }
        maxWidth="3xl"
      >
        {photoLightbox && (
          <div className="space-y-3">
            <div className="relative rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center max-h-[60vh]">
              <img
                src={photoLightbox.photos[photoLightbox.index]}
                alt={`${photoLightbox.divisionName} ${photoLightbox.index + 1}`}
                className="max-h-[60vh] w-auto object-contain"
              />
              {photoLightbox.photos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setPhotoLightbox(prev =>
                        prev
                          ? {
                              ...prev,
                              index:
                                (prev.index - 1 + prev.photos.length) %
                                prev.photos.length,
                            }
                          : null
                      )
                    }
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition"
                    title="Foto Sebelumnya"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setPhotoLightbox(prev =>
                        prev
                          ? {
                              ...prev,
                              index: (prev.index + 1) % prev.photos.length,
                            }
                          : null
                      )
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition"
                    title="Foto Berikutnya"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {photoLightbox.caption && (
              <p className="text-xs text-slate-600 dark:text-slate-300 italic">
                {photoLightbox.caption}
              </p>
            )}

            {photoLightbox.photos.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {photoLightbox.photos.map((src, idx) => (
                  <button
                    key={`lightbox-thumb-${idx}`}
                    type="button"
                    onClick={() =>
                      setPhotoLightbox(prev => (prev ? { ...prev, index: idx } : null))
                    }
                    className={`w-14 h-14 rounded-lg overflow-hidden border-2 shrink-0 transition ${
                      idx === photoLightbox.index
                        ? 'border-sky-500 ring-2 ring-sky-500/30'
                        : 'border-slate-200 dark:border-slate-700 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={src}
                      alt={`Thumb ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* QUICK WHO / KEMENKES Z-SCORE CALCULATOR MODAL */}
      <Modal
        isOpen={isZScoreModalOpen}
        onClose={() => setIsZScoreModalOpen(false)}
        title="Kalkulator Status Gizi & Z-Score WHO / Kemenkes"
        subtitle="Simulasi antropometri cepat (BB/U, TB/U, BB/TB & IMT/U) standar Permenkes RI No. 2 Tahun 2020"
        maxWidth="4xl"
      >
        <BeneficiaryNutritionTab compactCalculatorOnly />
      </Modal>
    </div>
  );
};
