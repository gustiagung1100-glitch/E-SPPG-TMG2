import {
  Institution,
  InventoryItem,
  MasterBahan,
  MasterUnit,
  MenuItem,
  PurchaseOrder,
  PurchaseOrderItem,
  POItemApprovalStatus,
  QCStatusPLOK,
  QualityControlRecord,
  RABItem,
  RABRincianItem,
  RecipeIngredient,
  StockBatch,
  StockMutation,
} from '../types';

const SYNC_STOP_WORDS = new Set([
  'segar',
  'grade',
  'kemasan',
  'lokal',
  'kupas',
  'medium',
  'pulen',
  'wangi',
  'standar',
  'bgn',
  'murni',
  'pengadaan',
  'bahan',
  'pangan',
  'super',
  'alami',
  'matang',
  'plastik',
  'food',
  'probolinggo',
  'kraksaan',
  'gending',
  'pajarakan',
  'sukapura',
  'dringu',
  'krejengan',
  'dataran',
  'tinggi',
  'broiler',
  'ras',
  'giling',
]);

export function normalizeMaterialSyncName(name: string): string {
  return (name || '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractMaterialTokens(name: string): string[] {
  return normalizeMaterialSyncName(name)
    .split(' ')
    .filter(tok => tok.length >= 3 && !SYNC_STOP_WORDS.has(tok) && !/^\d+$/.test(tok));
}

export function isMatchingMaterialNameShared(a: string, b: string): boolean {
  const na = normalizeMaterialSyncName(a);
  const nb = normalizeMaterialSyncName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.length >= 4 && nb.length >= 4 && (na.includes(nb) || nb.includes(na))) return true;

  const ta = extractMaterialTokens(a);
  const tb = extractMaterialTokens(b);
  if (ta.length === 0 || tb.length === 0) return false;

  const hasTelurA = ta.includes('telur');
  const hasTelurB = tb.includes('telur');
  if (hasTelurA !== hasTelurB) return false;

  const compoundHeads = new Set([
    'bawang',
    'cabai',
    'gula',
    'daging',
    'ikan',
    'kacang',
    'tepung',
    'daun',
    'saus',
    'minyak',
  ]);

  if (ta[0] === tb[0]) {
    if (compoundHeads.has(ta[0]) && ta.length >= 2 && tb.length >= 2) {
      return ta[1] === tb[1];
    }
    return true;
  }

  if (ta.includes('ayam') && tb.includes('ayam') && !hasTelurA && !hasTelurB) {
    return true;
  }
  if (ta.includes('sapi') && tb.includes('sapi') && !ta.includes('bakso') && !tb.includes('bakso')) {
    return true;
  }
  return false;
}

// =============================================================================
// STAGE 1: PERENCANAAN MENU (PLOG) -> RENCANA ANGGARAN BELANJA (RAB)
// =============================================================================

export interface MenuPlannedNeedItem {
  key: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalBudget: number;
  sourceMenuId: string;
  sourceMenuCode: string;
  sourceMenuDate: string;
  sourceMenuLabel: string;
  menuDishLabel?: string;
}

export interface AggregatedMenuNeed {
  key: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalBudget: number;
  sourceMenuIds: string[];
  sourceMenuCodes: string[];
  sourceMenuLabels: string[];
  planDate: string;
  rincianItems: RABRincianItem[];
}

export function getDishLabelFromMenu(
  menu: Pick<
    MenuItem,
    | 'menuCode'
    | 'dayName'
    | 'date'
    | 'stapleFood'
    | 'animalProtein'
    | 'plantProtein'
    | 'vegetable'
    | 'fruit'
    | 'milkOrExtra'
  >,
  category?: string,
  explicitMenuName?: string
): string {
  const customDish = (explicitMenuName || '').trim();
  if (customDish) {
    return `${menu.menuCode} — ${customDish}`;
  }
  const cat = (category || '').toLowerCase();
  let dishSlot = '';
  if (cat.includes('pokok') || cat.includes('karbo')) dishSlot = menu.stapleFood;
  else if (cat.includes('hewani')) dishSlot = menu.animalProtein;
  else if (cat.includes('nabati')) dishSlot = menu.plantProtein;
  else if (cat.includes('sayur')) dishSlot = menu.vegetable;
  else if (cat.includes('buah')) dishSlot = menu.fruit;
  else if (cat.includes('susu') || cat.includes('ekstra')) dishSlot = menu.milkOrExtra;
  else dishSlot = [menu.stapleFood, menu.animalProtein].filter(Boolean).join(' & ');

  if (dishSlot && dishSlot.trim()) {
    return `${menu.menuCode} — ${dishSlot.trim()}`;
  }
  return `${menu.menuCode} (${menu.dayName}, ${menu.date})`;
}

function computeKebutuhanAndPortionCost(params: {
  bkGrams: number;
  portions: number;
  unitCode: string;
  unitPrice: number;
  masterUnits: MasterUnit[];
}): { autoKebutuhan: number; costPerPortion: number } {
  const { bkGrams, portions, unitCode, unitPrice, masterUnits } = params;
  const normalized = (unitCode || 'kg').trim().toLowerCase();
  const unitMeta = masterUnits.find(u => u.code.trim().toLowerCase() === normalized);
  const isUnitBased =
    unitMeta?.baseUnit === 'satuan' ||
    normalized === 'pcs' ||
    normalized === 'ikat' ||
    normalized === 'butir';

  const grossTotal = portions * bkGrams;

  if (
    (unitMeta?.baseUnit === 'gram' || unitMeta?.baseUnit === 'ml') &&
    unitMeta.conversionToBase > 0
  ) {
    return {
      autoKebutuhan: grossTotal / unitMeta.conversionToBase,
      costPerPortion: (bkGrams / unitMeta.conversionToBase) * unitPrice,
    };
  }
  if (isUnitBased) {
    return {
      autoKebutuhan: portions,
      costPerPortion: unitPrice,
    };
  }
  return {
    autoKebutuhan: grossTotal / 1000,
    costPerPortion: (bkGrams / 1000) * unitPrice,
  };
}

export interface ResolvedRecipeIngredientFormula {
  bddSmall: number;
  bddLarge: number;
  bkSmall: number;
  bkLarge: number;
  porsiSmall: number;
  porsiLarge: number;
  unitSmall: string;
  unitLarge: string;
  kebutuhanSmall: number;
  kebutuhanLarge: number;
  bufferPctSmall: number;
  bufferPctLarge: number;
  bufferSmall: number;
  bufferLarge: number;
  totalSmall: number;
  totalLarge: number;
  pembulatanSmall: number;
  pembulatanLarge: number;
  totalKuantiti: number;
  totalNetGrams: number;
  totalNetKg: number;
  totalGrossGrams: number;
  totalGrossKg: number;
  costPortionSmall: number;
  costPortionLarge: number;
  totalCost: number;
}

export function resolveRecipeIngredientFormula(
  ing: RecipeIngredient,
  masterUnits: MasterUnit[],
  quotaSmall: number,
  quotaLarge: number,
  defaultBufferSmallPct = 2,
  defaultBufferLargePct = 2,
  overrideUnitPrice?: number
): ResolvedRecipeIngredientFormula {
  const ov = ing.manualOverrides || {};
  const hasNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;

  const unitPrice = typeof overrideUnitPrice === 'number' ? overrideUnitPrice : ing.unitPrice || 0;

  const bbSmall = Math.max(0, Number(ing.netWeightSmall) || 0);
  const bbLarge = Math.max(0, Number(ing.netWeightLarge) || 0);

  const rawBaseBdd =
    typeof ing.ediblePortionPercent === 'number' && Number.isFinite(ing.ediblePortionPercent)
      ? Math.max(0, Math.min(100, ing.ediblePortionPercent))
      : 100;

  const bddSmall = hasNum(ov.bddSmall)
    ? Math.max(0, Math.min(100, ov.bddSmall))
    : rawBaseBdd;
  const bddLarge = hasNum(ov.bddLarge)
    ? Math.max(0, Math.min(100, ov.bddLarge))
    : rawBaseBdd;

  const bkSmall = hasNum(ov.bkSmall)
    ? ov.bkSmall
    : bddSmall > 0
    ? bbSmall / (bddSmall / 100)
    : 0;
  const bkLarge = hasNum(ov.bkLarge)
    ? ov.bkLarge
    : bddLarge > 0
    ? bbLarge / (bddLarge / 100)
    : 0;

  const porsiSmall = hasNum(ov.porsiSmall) ? ov.porsiSmall : Math.max(0, quotaSmall);
  const porsiLarge = hasNum(ov.porsiLarge) ? ov.porsiLarge : Math.max(0, quotaLarge);

  const basePurchaseUnit = (ing.purchaseUnit || 'kg').trim() || 'kg';
  const unitSmall =
    typeof ov.unitSmall === 'string' && ov.unitSmall.trim() !== ''
      ? ov.unitSmall.trim()
      : basePurchaseUnit;
  const unitLarge =
    typeof ov.unitLarge === 'string' && ov.unitLarge.trim() !== ''
      ? ov.unitLarge.trim()
      : basePurchaseUnit;

  const convSmall = computeKebutuhanAndPortionCost({
    bkGrams: bkSmall,
    portions: porsiSmall,
    unitCode: unitSmall,
    unitPrice,
    masterUnits,
  });
  const convLarge = computeKebutuhanAndPortionCost({
    bkGrams: bkLarge,
    portions: porsiLarge,
    unitCode: unitLarge,
    unitPrice,
    masterUnits,
  });

  const kebutuhanSmall = hasNum(ov.kebutuhanSmall) ? ov.kebutuhanSmall : convSmall.autoKebutuhan;
  const kebutuhanLarge = hasNum(ov.kebutuhanLarge) ? ov.kebutuhanLarge : convLarge.autoKebutuhan;

  const bufferPctSmall =
    typeof ing.bufferPercentSmall === 'number' && Number.isFinite(ing.bufferPercentSmall)
      ? Math.max(0, ing.bufferPercentSmall)
      : defaultBufferSmallPct;
  const bufferPctLarge =
    typeof ing.bufferPercentLarge === 'number' && Number.isFinite(ing.bufferPercentLarge)
      ? Math.max(0, ing.bufferPercentLarge)
      : defaultBufferLargePct;

  const bufferSmall = hasNum(ov.bufferSmall)
    ? ov.bufferSmall
    : kebutuhanSmall * (bufferPctSmall / 100);
  const bufferLarge = hasNum(ov.bufferLarge)
    ? ov.bufferLarge
    : kebutuhanLarge * (bufferPctLarge / 100);

  const totalSmall = hasNum(ov.totalSmall) ? ov.totalSmall : kebutuhanSmall + bufferSmall;
  const totalLarge = hasNum(ov.totalLarge) ? ov.totalLarge : kebutuhanLarge + bufferLarge;

  const pembulatanSmall = hasNum(ov.pembulatanSmall)
    ? ov.pembulatanSmall
    : totalSmall > 0
    ? Math.ceil(totalSmall)
    : 0;
  const pembulatanLarge = hasNum(ov.pembulatanLarge)
    ? ov.pembulatanLarge
    : totalLarge > 0
    ? Math.ceil(totalLarge)
    : 0;

  const totalKuantiti = hasNum(ov.totalKuantiti)
    ? ov.totalKuantiti
    : pembulatanSmall + pembulatanLarge;

  const totalNetGrams = porsiSmall * bbSmall + porsiLarge * bbLarge;
  const totalNetKg = totalNetGrams / 1000;
  const totalGrossGrams = porsiSmall * bkSmall + porsiLarge * bkLarge;
  const totalGrossKg = totalGrossGrams / 1000;

  const costPortionSmall = hasNum(ov.kebutuhanSmall)
    ? porsiSmall > 0
      ? (kebutuhanSmall / porsiSmall) * unitPrice
      : 0
    : convSmall.costPerPortion;
  const costPortionLarge = hasNum(ov.kebutuhanLarge)
    ? porsiLarge > 0
      ? (kebutuhanLarge / porsiLarge) * unitPrice
      : 0
    : convLarge.costPerPortion;

  const totalCost = totalKuantiti * unitPrice;

  return {
    bddSmall,
    bddLarge,
    bkSmall,
    bkLarge,
    porsiSmall,
    porsiLarge,
    unitSmall,
    unitLarge,
    kebutuhanSmall,
    kebutuhanLarge,
    bufferPctSmall,
    bufferPctLarge,
    bufferSmall,
    bufferLarge,
    totalSmall,
    totalLarge,
    pembulatanSmall,
    pembulatanLarge,
    totalKuantiti,
    totalNetGrams,
    totalNetKg,
    totalGrossGrams,
    totalGrossKg,
    costPortionSmall,
    costPortionLarge,
    totalCost,
  };
}

export function calculateIngredientPurchaseQuantity(
  ing: RecipeIngredient,
  masterUnits: MasterUnit[],
  quotaSmall: number,
  quotaLarge: number
): { totalKuantiti: number; unit: string } {
  const formula = resolveRecipeIngredientFormula(ing, masterUnits, quotaSmall, quotaLarge);
  return {
    totalKuantiti: formula.totalKuantiti,
    unit: (ing.purchaseUnit || formula.unitLarge || formula.unitSmall || 'kg').trim() || 'kg',
  };
}

const INDONESIAN_MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export function formatIndonesianPeriodMonth(isoDate: string): string {
  if (!isoDate || isoDate.length < 7) return 'November 2026';
  const parts = isoDate.split('-');
  const year = Number(parts[0]);
  const monthIdx = Number(parts[1]) - 1;
  if (!Number.isFinite(year) || monthIdx < 0 || monthIdx > 11) return 'November 2026';
  return `${INDONESIAN_MONTHS[monthIdx]} ${year}`;
}

export function buildDailyMenuIngredientKey(planDate: string, ingredientName: string): string {
  return `${(planDate || '').trim()}__${normalizeMaterialSyncName(ingredientName)}`;
}

export function computeMenuAggregatedNeeds(params: {
  menuItems: MenuItem[];
  menuIngredientsMap: Record<string, RecipeIngredient[]>;
  masterUnits: MasterUnit[];
  institutions: Institution[];
  inventory?: InventoryItem[];
  masterBahan?: MasterBahan[];
}): {
  perMenuItems: MenuPlannedNeedItem[];
  aggregated: AggregatedMenuNeed[];
} {
  const {
    menuItems,
    menuIngredientsMap,
    masterUnits,
    institutions,
    inventory = [],
    masterBahan = [],
  } = params;

  const quotaSmall =
    institutions.reduce((sum, inst) => sum + (inst.smallPortions || 0), 0) || 1200;
  const quotaLarge =
    institutions.reduce((sum, inst) => sum + (inst.largePortions || 0), 0) || 1650;

  const perMenuItems: MenuPlannedNeedItem[] = [];
  const aggMap = new Map<string, AggregatedMenuNeed>();
  const todayFallback = new Date().toISOString().slice(0, 10);

  for (const menu of menuItems) {
    const ings = menuIngredientsMap[menu.id] || menu.ingredients || [];
    const menuDate = menu.date || todayFallback;
    const menuLabel = `${menu.menuCode} (${menu.dayName}, ${menuDate})`;

    for (const ing of ings) {
      const calc = calculateIngredientPurchaseQuantity(ing, masterUnits, quotaSmall, quotaLarge);
      if (calc.totalKuantiti <= 0) continue;

      const invMatch = inventory.find(inv => isMatchingMaterialNameShared(inv.name, ing.name));
      const mbMatch = masterBahan.find(mb => isMatchingMaterialNameShared(mb.name, ing.name));
      const resolvedUnit = calc.unit || mbMatch?.unit || invMatch?.unit || 'kg';
      const resolvedPrice =
        ing.unitPrice || mbMatch?.actualPrice || invMatch?.pricePerUnit || 15000;

      const menuDishLabel = getDishLabelFromMenu(menu, ing.category, ing.menuName);

      const itemEntry: MenuPlannedNeedItem = {
        key: `${menu.id}__${ing.id}`,
        name: ing.name,
        category: ing.category || 'Bahan Pangan',
        quantity: calc.totalKuantiti,
        unit: resolvedUnit,
        unitPrice: resolvedPrice,
        totalBudget: calc.totalKuantiti * resolvedPrice,
        sourceMenuId: menu.id,
        sourceMenuCode: menu.menuCode,
        sourceMenuDate: menuDate,
        sourceMenuLabel: menuLabel,
        menuDishLabel,
      };
      perMenuItems.push(itemEntry);

      const rincianLine: RABRincianItem = {
        id: `rin-${menu.id}-${ing.id}`,
        menuName: menuDishLabel,
        ingredientName: ing.name,
        quantity: calc.totalKuantiti,
        unit: resolvedUnit,
        sourceMenuId: menu.id,
        sourceMenuCode: menu.menuCode,
        isManual: false,
      };

      // Group strictly per day (menuDate) + unit + normalized material name
      let matchedKey: string | null = null;
      for (const [k, grp] of aggMap.entries()) {
        if (
          grp.planDate === menuDate &&
          grp.unit.toLowerCase() === resolvedUnit.toLowerCase() &&
          isMatchingMaterialNameShared(grp.name, ing.name)
        ) {
          matchedKey = k;
          break;
        }
      }

      if (matchedKey) {
        const existing = aggMap.get(matchedKey)!;
        existing.quantity += calc.totalKuantiti;
        existing.totalBudget = existing.quantity * existing.unitPrice;
        existing.rincianItems.push(rincianLine);
        if (!existing.sourceMenuIds.includes(menu.id)) {
          existing.sourceMenuIds.push(menu.id);
        }
        if (!existing.sourceMenuCodes.includes(menu.menuCode)) {
          existing.sourceMenuCodes.push(menu.menuCode);
        }
        if (!existing.sourceMenuLabels.includes(menuLabel)) {
          existing.sourceMenuLabels.push(menuLabel);
        }
      } else {
        const newKey = `${menuDate}__${normalizeMaterialSyncName(ing.name)}__${resolvedUnit.toLowerCase()}`;
        aggMap.set(newKey, {
          key: newKey,
          name: ing.name,
          category: ing.category || 'Bahan Pangan',
          quantity: calc.totalKuantiti,
          unit: resolvedUnit,
          unitPrice: resolvedPrice,
          totalBudget: calc.totalKuantiti * resolvedPrice,
          sourceMenuIds: [menu.id],
          sourceMenuCodes: [menu.menuCode],
          sourceMenuLabels: [menuLabel],
          planDate: menuDate,
          rincianItems: [rincianLine],
        });
      }
    }
  }

  return {
    perMenuItems,
    aggregated: Array.from(aggMap.values()),
  };
}

export interface SyncRABOptions {
  targetDate?: string;
  preserveManualEdits?: boolean;
  skipDeletedKeys?: Set<string>;
}

export function syncRABWithMenuPlans(params: {
  menuItems: MenuItem[];
  menuIngredientsMap: Record<string, RecipeIngredient[]>;
  masterUnits: MasterUnit[];
  institutions: Institution[];
  rabItems: RABItem[];
  inventory?: InventoryItem[];
  masterBahan?: MasterBahan[];
  options?: SyncRABOptions;
}): {
  rabItems: RABItem[];
  createdCount: number;
  updatedCount: number;
} {
  const { aggregated } = computeMenuAggregatedNeeds(params);
  const { options } = params;
  const targetDate = options?.targetDate;
  const preserveManualEdits = Boolean(options?.preserveManualEdits);
  const skipDeletedKeys = options?.skipDeletedKeys;

  const needsToProcess =
    targetDate && targetDate !== 'ALL'
      ? aggregated.filter(n => n.planDate === targetDate)
      : aggregated;

  const nextRABs = [...params.rabItems];
  let createdCount = 0;
  let updatedCount = 0;

  const todayStr = new Date().toISOString().slice(0, 10);

  needsToProcess.forEach((need, idx) => {
    const planDate = need.planDate || todayStr;
    const sourceKey = buildDailyMenuIngredientKey(planDate, need.name);

    const matchingIdx = nextRABs.findIndex(
      r =>
        r.category === 'RAB Bahan Pangan' &&
        r.status !== 'Ditolak' &&
        (
          (r.sourceIngredientKey && r.sourceIngredientKey === sourceKey) ||
          (r.planDate === planDate && isMatchingMaterialNameShared(r.itemName, need.name))
        )
    );

    const menuCodesStr = need.sourceMenuCodes.join(', ');
    const menuNotes = `Sumber Perencanaan Menu PLOG Harian (${planDate}): ${need.sourceMenuLabels.join(' + ')} (${need.category})`;
    const derivedPeriodMonth = formatIndonesianPeriodMonth(planDate);

    if (matchingIdx >= 0) {
      const existing = nextRABs[matchingIdx];
      if (preserveManualEdits && existing.isManualOverride) {
        return;
      }

      const poUsedQty = existing.poCreatedQuantity || 0;
      const isEditableFromMenu =
        existing.status === 'Draft' ||
        existing.status === 'Menunggu Persetujuan' ||
        poUsedQty === 0;

      if (isEditableFromMenu) {
        const effectiveVol = Math.max(need.quantity, poUsedQty);
        nextRABs[matchingIdx] = {
          ...existing,
          planDate,
          periodMonth: derivedPeriodMonth,
          volume: effectiveVol,
          unit: need.unit || existing.unit,
          unitPrice: need.unitPrice || existing.unitPrice,
          totalBudget: effectiveVol * (need.unitPrice || existing.unitPrice),
          sourceType: 'menu_planning',
          sourceMenuId: need.sourceMenuIds[0],
          sourceMenuCode: menuCodesStr,
          sourceMenuLabel: need.sourceMenuLabels.join(', '),
          sourceIngredientKey: existing.sourceIngredientKey || sourceKey,
          notes: menuNotes,
          rincianItems: existing.isRincianManual ? existing.rincianItems : need.rincianItems,
          isRincianManual: existing.isRincianManual ?? false,
        };
        updatedCount++;
      } else if (!existing.sourceType || !existing.sourceIngredientKey) {
        nextRABs[matchingIdx] = {
          ...existing,
          sourceType: existing.sourceType || 'menu_planning',
          sourceMenuId: existing.sourceMenuId || need.sourceMenuIds[0],
          sourceMenuCode: existing.sourceMenuCode || menuCodesStr,
          sourceMenuLabel: existing.sourceMenuLabel || need.sourceMenuLabels.join(', '),
          sourceIngredientKey: existing.sourceIngredientKey || sourceKey,
          rincianItems: existing.isRincianManual
            ? existing.rincianItems
            : existing.rincianItems?.length
            ? existing.rincianItems
            : need.rincianItems,
        };
      }
    } else {
      if (skipDeletedKeys && skipDeletedKeys.has(sourceKey)) {
        return;
      }
      const codeNum = String(nextRABs.length + 1).padStart(3, '0');
      const compactDate = planDate.replace(/-/g, '').slice(2);
      nextRABs.unshift({
        id: `rab-menu-${planDate}-${Date.now()}-${idx}`,
        category: 'RAB Bahan Pangan',
        budgetCode: `RAB-BP-${compactDate}-${codeNum}`,
        planDate,
        periodMonth: derivedPeriodMonth,
        itemName: need.name,
        volume: need.quantity,
        unit: need.unit,
        unitPrice: need.unitPrice,
        totalBudget: need.quantity * need.unitPrice,
        status: 'Menunggu Persetujuan',
        poCreatedQuantity: 0,
        poCreatedAmount: 0,
        sourceType: 'menu_planning',
        sourceMenuId: need.sourceMenuIds[0],
        sourceMenuCode: menuCodesStr,
        sourceMenuLabel: need.sourceMenuLabels.join(', '),
        sourceIngredientKey: sourceKey,
        notes: menuNotes,
        rincianItems: need.rincianItems,
        isRincianManual: false,
        isManualOverride: false,
      });
      createdCount++;
    }
  });

  return {
    rabItems: nextRABs,
    createdCount,
    updatedCount,
  };
}

export function resolveAutoRincianForRAB(
  rab: RABItem,
  perMenuItems: MenuPlannedNeedItem[],
  menuItems: MenuItem[]
): RABRincianItem[] {
  const sameDateMatches = rab.planDate
    ? perMenuItems.filter(
        need =>
          need.sourceMenuDate === rab.planDate &&
          isMatchingMaterialNameShared(need.name, rab.itemName)
      )
    : [];

  const matchedNeeds =
    sameDateMatches.length > 0
      ? sameDateMatches
      : perMenuItems.filter(need => isMatchingMaterialNameShared(need.name, rab.itemName));

  if (matchedNeeds.length > 0) {
    return matchedNeeds.map((need, idx) => ({
      id: `rin-auto-${rab.id}-${need.sourceMenuId}-${idx}`,
      menuName: need.menuDishLabel || need.sourceMenuLabel || need.sourceMenuCode,
      ingredientName: need.name,
      quantity: need.quantity,
      unit: need.unit,
      sourceMenuId: need.sourceMenuId,
      sourceMenuCode: need.sourceMenuCode,
      isManual: false,
    }));
  }

  const menuCodes = (rab.sourceMenuCode || '')
    .split(',')
    .map(c => c.trim().toLowerCase())
    .filter(Boolean);

  const matchedMenus = menuItems.filter(
    m =>
      (rab.sourceMenuId && m.id === rab.sourceMenuId) ||
      menuCodes.includes((m.menuCode || '').trim().toLowerCase())
  );

  if (matchedMenus.length > 0) {
    return matchedMenus.map((m, idx) => ({
      id: `rin-menu-${rab.id}-${m.id}-${idx}`,
      menuName: getDishLabelFromMenu(m),
      ingredientName: rab.itemName,
      quantity: idx === 0 ? rab.volume : 0,
      unit: rab.unit,
      sourceMenuId: m.id,
      sourceMenuCode: m.menuCode,
      isManual: false,
    }));
  }

  if (rab.sourceType === 'menu_planning' && (rab.sourceMenuLabel || rab.sourceMenuCode)) {
    return [
      {
        id: `rin-src-${rab.id}-0`,
        menuName: rab.sourceMenuLabel || rab.sourceMenuCode || '-',
        ingredientName: rab.itemName,
        quantity: rab.volume,
        unit: rab.unit,
        sourceMenuId: rab.sourceMenuId,
        sourceMenuCode: rab.sourceMenuCode,
        isManual: false,
      },
    ];
  }

  return [];
}

// =============================================================================
// STAGE 2: RAB -> PURCHASE ORDER (PO)
// =============================================================================

export function resolvePOItemApprovalStatus(
  item: Pick<PurchaseOrderItem, 'approvalStatus'>,
  po: Pick<PurchaseOrder, 'status'>
): POItemApprovalStatus {
  if (
    item.approvalStatus === 'Disetujui' ||
    item.approvalStatus === 'Ditolak' ||
    item.approvalStatus === 'Menunggu persetujuan'
  ) {
    return item.approvalStatus;
  }
  if (po.status === 'Ditolak' || po.status === 'Dibatalkan') {
    return 'Ditolak';
  }
  if (
    po.status === 'Disetujui' ||
    po.status === 'Disetujui Kepala' ||
    po.status === 'Dikirim ke supplier' ||
    po.status === 'Sebagian diterima' ||
    po.status === 'Selesai diterima' ||
    po.status === 'Diterima di Gudang'
  ) {
    return 'Disetujui';
  }
  return 'Menunggu persetujuan';
}

export function reconcileRABWithPurchaseOrders(
  pos: PurchaseOrder[],
  rabs: RABItem[]
): RABItem[] {
  const activePOs = pos.filter(po => po.status !== 'Ditolak' && po.status !== 'Dibatalkan');
  return rabs.map(rab => {
    let totalQty = 0;
    let totalAmount = 0;

    for (const po of activePOs) {
      const nonRejectedItems = (po.items || []).filter(
        item => item.approvalStatus !== 'Ditolak'
      );
      const matchingItems = nonRejectedItems.filter(item => item.rabId === rab.id);
      if (matchingItems.length > 0) {
        for (const item of matchingItems) {
          totalQty += Number(item.quantity || 0);
          totalAmount += Number(
            item.subtotal || (item.quantity || 0) * (item.unitPrice || 0)
          );
        }
      } else if (po.rabId === rab.id) {
        const matchedByName = nonRejectedItems.filter(it =>
          isMatchingMaterialNameShared(it.itemName, rab.itemName)
        );
        const itemsToSum = matchedByName.length > 0 ? matchedByName : nonRejectedItems;
        for (const it of itemsToSum) {
          totalQty += Number(it.quantity || 0);
          totalAmount += Number(it.subtotal || (it.quantity || 0) * (it.unitPrice || 0));
        }
      }
    }

    return {
      ...rab,
      poCreatedQuantity: totalQty,
      poCreatedAmount: totalAmount,
    };
  });
}

const OPERASIONAL_ITEM_KEYWORDS = [
  'gas lpg',
  'lpg',
  'bbm',
  'pertalite',
  'solar',
  'sabun',
  'disinfektan',
  'apd',
  'kebersihan',
  'air kemasan galon',
  'galon',
  'filter sterilisasi',
  'insentif',
  'biaya lain',
  'operasional',
];

export function shiftIsoDate(isoDate: string, deltaDays: number): string {
  const trimmed = (isoDate || '').trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) return trimmed;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const dt = new Date(Date.UTC(year, month - 1, day + deltaDays));
  if (Number.isNaN(dt.getTime())) return trimmed;
  return dt.toISOString().slice(0, 10);
}

export function isOperasionalPOItem(
  item: Pick<PurchaseOrderItem, 'itemName' | 'rabId' | 'category'>,
  po: Pick<PurchaseOrder, 'rabId' | 'poCategory' | 'notes'>,
  rabItems: RABItem[]
): boolean {
  if (item.category === 'RAB Operasional') return true;
  if (item.category === 'RAB Bahan Pangan') return false;
  const linkedRab = rabItems.find(r => r.id === (item.rabId || po.rabId));
  if (linkedRab) {
    return linkedRab.category === 'RAB Operasional';
  }
  if (po.poCategory === 'Operasional') return true;
  if (po.poCategory === 'Bahan Pangan') return false;
  const lower = (item.itemName || '').toLowerCase();
  return OPERASIONAL_ITEM_KEYWORDS.some(kw => lower.includes(kw));
}

export function sortPOItemsBahanThenOperasional(
  items: PurchaseOrderItem[],
  po: Pick<PurchaseOrder, 'rabId' | 'poCategory' | 'notes'>,
  rabItems: RABItem[]
): PurchaseOrderItem[] {
  if (!Array.isArray(items) || items.length <= 1) return items || [];
  return items
    .map((it, idx) => ({
      it,
      idx,
      rank: isOperasionalPOItem(it, po, rabItems) ? 1 : 0,
    }))
    .sort((a, b) => (a.rank !== b.rank ? a.rank - b.rank : a.idx - b.idx))
    .map(entry => entry.it);
}

export function getPODisplayCategoryRank(
  po: PurchaseOrder,
  rabItems: RABItem[]
): number {
  const items = po.items || [];
  if (items.length === 0) {
    if (po.poCategory === 'Operasional') return 1;
    const linkedRab = po.rabId ? rabItems.find(r => r.id === po.rabId) : undefined;
    return linkedRab?.category === 'RAB Operasional' ? 1 : 0;
  }
  const hasBahan = items.some(it => !isOperasionalPOItem(it, po, rabItems));
  return hasBahan ? 0 : 1;
}

export function resolveRABDistributionDate(
  rab: RABItem | undefined,
  menuItems: MenuItem[],
  fallbackDate = ''
): string {
  if (!rab) return fallbackDate;
  const menuDates = new Set(menuItems.map(m => m.date).filter(Boolean));
  if (rab.planDate && menuDates.has(rab.planDate)) {
    return rab.planDate;
  }
  if (rab.sourceMenuId) {
    const matched = menuItems.find(m => m.id === rab.sourceMenuId);
    if (matched?.date) return matched.date;
  }
  if (rab.sourceMenuCode) {
    const codes = rab.sourceMenuCode
      .split(',')
      .map(c => c.trim().toLowerCase())
      .filter(Boolean);
    const matched = menuItems.find(
      m => m.menuCode && codes.includes(m.menuCode.trim().toLowerCase())
    );
    if (matched?.date) return matched.date;
  }
  if (rab.planDate) return rab.planDate;
  return fallbackDate;
}

export function resolvePODistributionDate(
  po: PurchaseOrder,
  rabItems: RABItem[],
  menuItems: MenuItem[]
): string {
  if (po.distributionDate && /^\d{4}-\d{2}-\d{2}$/.test(po.distributionDate.trim())) {
    return po.distributionDate.trim();
  }

  const menuDates = new Set(menuItems.map(m => m.date).filter(Boolean));

  // Try matching notes against scheduled menu codes or explicit ISO date
  const notesText = (po.notes || '').trim();
  if (notesText) {
    const isoMatch = /\b(\d{4}-\d{2}-\d{2})\b/.exec(notesText);
    if (isoMatch && menuDates.has(isoMatch[1])) {
      return isoMatch[1];
    }
    const lowerNotes = notesText.toLowerCase();
    for (const m of menuItems) {
      if (m.menuCode && lowerNotes.includes(m.menuCode.toLowerCase())) {
        return m.date;
      }
      if (m.date === '2026-11-10' && lowerNotes.includes('10 november 2026')) {
        return '2026-11-10';
      }
      if (m.date === '2026-11-09' && lowerNotes.includes('9 november 2026')) {
        return '2026-11-09';
      }
      if (m.date === '2026-11-08' && lowerNotes.includes('8 november 2026')) {
        return '2026-11-08';
      }
    }
  }

  if (po.deliveryDate && /^\d{4}-\d{2}-\d{2}$/.test(po.deliveryDate.trim())) {
    const nextDay = shiftIsoDate(po.deliveryDate.trim(), 1);
    if (menuDates.has(nextDay)) return nextDay;
    if (menuDates.has(po.deliveryDate.trim())) return po.deliveryDate.trim();
  }

  const linkedRabId = po.rabId || po.items?.[0]?.rabId;
  const linkedRab = linkedRabId ? rabItems.find(r => r.id === linkedRabId) : undefined;
  if (linkedRab) {
    const resolvedFromRab = resolveRABDistributionDate(linkedRab, menuItems, '');
    if (resolvedFromRab && menuDates.has(resolvedFromRab)) return resolvedFromRab;
  }

  if (po.deliveryDate && /^\d{4}-\d{2}-\d{2}$/.test(po.deliveryDate.trim())) {
    return shiftIsoDate(po.deliveryDate.trim(), 1);
  }
  return po.date || '';
}

function getDailyOperationalSliceQty(rab: RABItem, remainingQty: number, isExactPlanDate: boolean): number {
  if (remainingQty <= 0) return 0;
  if (isExactPlanDate) {
    return remainingQty;
  }
  const lower = (rab.itemName || '').toLowerCase();
  let suggested = 1;
  if (lower.includes('bbm') || lower.includes('pertalite') || lower.includes('solar')) {
    suggested = 40;
  } else if (lower.includes('sabun') || lower.includes('disinfektan')) {
    suggested = 3;
  } else if (lower.includes('apd') || lower.includes('sarung tangan') || lower.includes('hairnet')) {
    suggested = 2;
  } else if (lower.includes('gas lpg') || lower.includes('elpiji')) {
    suggested = 1;
  } else {
    suggested = Math.max(1, Math.min(remainingQty, Math.ceil(rab.volume / 3)));
  }
  return Math.min(remainingQty, suggested);
}

function resolveOperationalSupplierMeta(itemName: string): {
  supplierName: string;
  supplierContact: string;
} {
  const lower = (itemName || '').toLowerCase();
  if (lower.includes('gas') || lower.includes('lpg') || lower.includes('elpiji')) {
    return {
      supplierName: 'Agen Gas LPG Industri Mitra BGN',
      supplierContact: 'H. Ridwan - 0812-3311-4455',
    };
  }
  if (lower.includes('bbm') || lower.includes('pertalite') || lower.includes('solar')) {
    return {
      supplierName: 'SPBU Armada Mitra Krejengan',
      supplierContact: 'Bpk. Hendra - 0852-6677-8899',
    };
  }
  return {
    supplierName: 'CV Higiene & Sanitasi Nusantara',
    supplierContact: 'Ibu Ratna - 0813-4455-7700',
  };
}

export function seedAndSyncDailyPurchaseOrders(params: {
  purchaseOrders: PurchaseOrder[];
  rabItems: RABItem[];
  menuItems: MenuItem[];
  targetDate?: string;
  includeApprovedPangan?: boolean;
}): {
  purchaseOrders: PurchaseOrder[];
  createdCount: number;
  updatedCount: number;
} {
  const {
    purchaseOrders,
    rabItems,
    menuItems,
    targetDate,
    includeApprovedPangan = false,
  } = params;

  const knownPODistributionFixes: Record<string, { dist: string; delivery: string }> = {
    'po-1': { dist: '2026-11-08', delivery: '2026-11-07' },
    'po-2': { dist: '2026-11-08', delivery: '2026-11-07' },
    'po-3': { dist: '2026-11-08', delivery: '2026-11-07' },
    'po-5': { dist: '2026-11-08', delivery: '2026-11-07' },
    'po-6': { dist: '2026-11-08', delivery: '2026-11-07' },
    'po-7': { dist: '2026-11-08', delivery: '2026-11-07' },
    'po-4': { dist: '2026-11-10', delivery: '2026-11-09' },
    'po-8': { dist: '2026-11-10', delivery: '2026-11-09' },
  };

  let updatedCount = 0;
  let createdCount = 0;

  const nextPOs: PurchaseOrder[] = purchaseOrders.map(po => {
    const fix = knownPODistributionFixes[po.id];
    const resolvedDist = fix?.dist || resolvePODistributionDate(po, rabItems, menuItems);
    const expectedHMinus1 = resolvedDist ? shiftIsoDate(resolvedDist, -1) : po.deliveryDate;
    const nextDelivery = fix?.delivery || expectedHMinus1 || po.deliveryDate;

    const sortedItems = sortPOItemsBahanThenOperasional(
      (po.items || []).map(it => ({
        ...it,
        category:
          it.category ||
          (isOperasionalPOItem(it, po, rabItems) ? 'RAB Operasional' : 'RAB Bahan Pangan'),
      })),
      po,
      rabItems
    );

    const hasBahan = sortedItems.some(it => it.category === 'RAB Bahan Pangan');
    const hasOps = sortedItems.some(it => it.category === 'RAB Operasional');
    const nextPoCategory: PurchaseOrder['poCategory'] =
      hasBahan && hasOps ? 'Gabungan' : hasOps ? 'Operasional' : 'Bahan Pangan';

    if (
      po.distributionDate !== resolvedDist ||
      po.deliveryDate !== nextDelivery ||
      po.poCategory !== nextPoCategory
    ) {
      updatedCount++;
    }

    return {
      ...po,
      distributionDate: resolvedDist || undefined,
      deliveryDate: nextDelivery,
      poCategory: nextPoCategory,
      items: sortedItems,
    };
  });

  // Track allocated PO qty per RAB so we never exceed approved RAB quotas
  const getUsedQtyForRAB = (rabId: string): number =>
    nextPOs
      .filter(p => p.status !== 'Ditolak' && p.status !== 'Dibatalkan')
      .reduce((sum, p) => {
        const direct = (p.items || []).filter(it => it.rabId === rabId);
        if (direct.length > 0) {
          return sum + direct.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
        }
        if (p.rabId === rabId) {
          return sum + (p.items || []).reduce((s, it) => s + (Number(it.quantity) || 0), 0);
        }
        return sum;
      }, 0);

  const uniqueMenuDates = Array.from(
    new Set(menuItems.map(m => m.date).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  const targetDates =
    targetDate && targetDate !== 'ALL'
      ? [targetDate]
      : uniqueMenuDates.length > 0
      ? uniqueMenuDates
      : ['2026-11-08'];

  let nextSeq = nextPOs.length + 101;

  for (const distDate of targetDates) {
    const hMinus1 = shiftIsoDate(distDate, -1);
    const matchedMenus = menuItems.filter(m => m.date === distDate);
    const menuCodesLabel =
      matchedMenus.map(m => m.menuCode).filter(Boolean).join(', ') || distDate;
    const compactDist = distDate.replace(/-/g, '').slice(2);

    const existingPOsForDay = nextPOs.filter(
      p =>
        p.status !== 'Ditolak' &&
        p.status !== 'Dibatalkan' &&
        resolvePODistributionDate(p, rabItems, menuItems) === distDate
    );

    const dayHasRABOrName = (rab: RABItem): boolean =>
      existingPOsForDay.some(p =>
        (p.items || []).some(
          it =>
            it.rabId === rab.id ||
            isMatchingMaterialNameShared(it.itemName, rab.itemName)
        )
      );

    // 1. Optional Bahan Pangan approved RAB sync for this day
    if (includeApprovedPangan) {
      const panganRABsForDay = rabItems.filter(r => {
        if (r.category !== 'RAB Bahan Pangan' || r.status !== 'Disetujui') return false;
        const resolvedDate = resolveRABDistributionDate(r, menuItems, r.planDate);
        return resolvedDate === distDate;
      });

      const panganItemsToAdd: PurchaseOrderItem[] = [];
      for (const rab of panganRABsForDay) {
        if (dayHasRABOrName(rab)) continue;
        const usedQty = getUsedQtyForRAB(rab.id);
        const remQty = Math.max(0, Number(rab.volume || 0) - usedQty);
        if (remQty <= 0) continue;
        const unitPrice = Number(rab.unitPrice || 0);
        panganItemsToAdd.push({
          itemId: rab.id,
          itemName: rab.itemName,
          quantity: remQty,
          unit: rab.unit,
          unitPrice,
          subtotal: remQty * unitPrice,
          rabId: rab.id,
          receivedQuantity: 0,
          category: 'RAB Bahan Pangan',
        });
      }

      if (panganItemsToAdd.length > 0) {
        const totalAmount = panganItemsToAdd.reduce((s, it) => s + it.subtotal, 0);
        nextSeq++;
        nextPOs.push({
          id: `po-auto-bp-${distDate}-${nextSeq}`,
          poNumber: `PO/SPPG-TMG2/2026/XI/${compactDist}-${String(nextSeq).slice(-2)}`,
          date: hMinus1,
          supplierName: 'Koperasi Pemasok Pangan Mitra BGN',
          supplierContact: 'Tim Pengadaan Pangan - 0812-7788-9911',
          deliveryDate: hMinus1,
          distributionDate: distDate,
          poCategory: 'Bahan Pangan',
          rabId: panganItemsToAdd[0].rabId,
          items: sortPOItemsBahanThenOperasional(panganItemsToAdd, { poCategory: 'Bahan Pangan' }, rabItems),
          totalAmount,
          status: 'Menunggu persetujuan',
          qcStatus: 'Belum QC',
          notes: `PO Bahan Pangan Harian untuk menu ${menuCodesLabel} (${distDate}). Target kirim H-1 (${hMinus1}).`,
          supplierDeliveryStatus: 'Menunggu Konfirmasi',
        });
        createdCount++;
      }
    }

    // 2. Daily Operational items from approved RAB Operasional
    const exactDayOps = rabItems.filter(
      r =>
        r.category === 'RAB Operasional' &&
        r.status === 'Disetujui' &&
        r.planDate === distDate
    );
    const standingOps = rabItems.filter(
      r =>
        r.category === 'RAB Operasional' &&
        r.status === 'Disetujui' &&
        r.planDate !== distDate
    );
    const candidateOps = exactDayOps.length > 0 ? [...exactDayOps, ...standingOps] : standingOps;

    const opsItemsToAdd: Array<{
      item: PurchaseOrderItem;
      supplierName: string;
      supplierContact: string;
    }> = [];

    for (const rab of candidateOps) {
      if (dayHasRABOrName(rab)) continue;
      const usedQty = getUsedQtyForRAB(rab.id);
      const remQty = Math.max(0, Number(rab.volume || 0) - usedQty);
      if (remQty <= 0) continue;

      const isExact = rab.planDate === distDate;
      const qty = getDailyOperationalSliceQty(rab, remQty, isExact);
      if (qty <= 0) continue;

      const unitPrice = Number(rab.unitPrice || 0);
      const sup = resolveOperationalSupplierMeta(rab.itemName);
      opsItemsToAdd.push({
        item: {
          itemId: rab.id,
          itemName: rab.itemName,
          quantity: qty,
          unit: rab.unit,
          unitPrice,
          subtotal: qty * unitPrice,
          rabId: rab.id,
          receivedQuantity: 0,
          category: 'RAB Operasional',
        },
        supplierName: sup.supplierName,
        supplierContact: sup.supplierContact,
      });
    }

    if (opsItemsToAdd.length > 0) {
      const items = sortPOItemsBahanThenOperasional(
        opsItemsToAdd.map(entry => entry.item),
        { poCategory: 'Operasional' },
        rabItems
      );
      const totalAmount = items.reduce((s, it) => s + it.subtotal, 0);
      nextSeq++;
      nextPOs.push({
        id: `po-auto-op-${distDate}-${nextSeq}`,
        poNumber: `PO/SPPG-TMG2/OPS/${compactDist}-${String(nextSeq).slice(-2)}`,
        date: hMinus1,
        supplierName: 'Mitra Energi & Sanitasi Operasional SPPG',
        supplierContact: 'Koordinator Operasional Dapur - 0813-4455-7700',
        deliveryDate: hMinus1,
        distributionDate: distDate,
        poCategory: 'Operasional',
        rabId: items[0]?.rabId,
        items,
        totalAmount,
        status: 'Menunggu persetujuan',
        qcStatus: 'Belum QC',
        notes: `Daftar Belanja Operasional Harian (Gas LPG, BBM Armada, Sabun Sanitasi & APD Relawan) untuk menu ${menuCodesLabel} (${distDate}). Target kirim H-1 (${hMinus1}).`,
        supplierDeliveryStatus: 'Menunggu Konfirmasi',
      });
      createdCount++;
    }
  }

  return {
    purchaseOrders: nextPOs,
    createdCount,
    updatedCount,
  };
}

// =============================================================================
// STAGE 3: PURCHASE ORDER (PO) -> QUALITY CONTROL (QC)
// =============================================================================

export function reconcilePurchaseOrdersWithQC(
  pos: PurchaseOrder[],
  qcs: QualityControlRecord[]
): PurchaseOrder[] {
  return pos.map(po => {
    const linkedQCs = qcs.filter(
      q => q.poId === po.id || (q.poNumber && q.poNumber === po.poNumber)
    );
    if (linkedQCs.length === 0) {
      return {
        ...po,
        qcRecords: [],
        items: (po.items || []).map(it => ({ ...it, receivedQuantity: 0 })),
        qcStatus:
          po.status === 'Diterima di Gudang' || po.status === 'Selesai diterima'
            ? po.qcStatus
            : 'Belum QC',
      };
    }

    const updatedItems = (po.items || []).map(it => {
      const itemQCs = linkedQCs.filter(q =>
        isMatchingMaterialNameShared(q.itemName, it.itemName)
      );
      const totalReceivedForItem = itemQCs.reduce(
        (sum, q) => sum + (q.status === 'Ditolak' ? 0 : Number(q.receivedQuantity || 0)),
        0
      );
      return {
        ...it,
        receivedQuantity: totalReceivedForItem,
      };
    });

    const totalOrdered = updatedItems
      .filter(it => it.approvalStatus !== 'Ditolak')
      .reduce((s, it) => s + Number(it.quantity || 0), 0);
    const totalReceived = updatedItems.reduce(
      (s, it) => s + Number(it.receivedQuantity || 0),
      0
    );

    const hasRejected = linkedQCs.some(q => q.status === 'Ditolak');
    const hasRetest = linkedQCs.some(q => q.status === 'Perlu pemeriksaan ulang');
    const hasPartial = linkedQCs.some(
      q => q.status === 'Diterima sebagian' || q.status === 'Lolos Sebagian'
    );

    let nextQcStatus: QCStatusPLOK = po.qcStatus;
    let nextPoStatus = po.status;

    if (totalReceived <= 0 && hasRejected) {
      nextQcStatus = 'Ditolak';
      nextPoStatus = 'Ditolak';
    } else if (hasRetest && totalReceived <= 0) {
      nextQcStatus = 'Perlu pemeriksaan ulang';
    } else if (totalOrdered > 0 && totalReceived >= totalOrdered && !hasPartial) {
      nextQcStatus = 'Diterima';
      nextPoStatus = 'Selesai diterima';
    } else if (totalReceived > 0) {
      nextQcStatus = hasPartial || totalReceived < totalOrdered ? 'Diterima sebagian' : 'Diterima';
      nextPoStatus =
        totalOrdered > 0 && totalReceived >= totalOrdered ? 'Selesai diterima' : 'Sebagian diterima';
    }

    const latestNotes = linkedQCs
      .map(q => q.notes)
      .filter(Boolean)
      .join(' | ');

    return {
      ...po,
      items: updatedItems,
      qcRecords: linkedQCs,
      qcStatus: nextQcStatus,
      status: nextPoStatus,
      qcNotes: latestNotes || po.qcNotes,
    };
  });
}

// =============================================================================
// STAGE 4: QUALITY CONTROL (QC) -> STOK GUDANG (INVENTORY & MUTATIONS)
// =============================================================================

function inferWarehouseMetaFromQC(itemName: string, receivingTemp?: number): {
  category: InventoryItem['category'];
  storageLocation: InventoryItem['storageLocation'];
} {
  const lower = (itemName || '').toLowerCase();
  if (
    (typeof receivingTemp === 'number' && receivingTemp <= 5) ||
    lower.includes('ayam') ||
    lower.includes('daging') ||
    lower.includes('ikan') ||
    lower.includes('fillet') ||
    lower.includes('sapi')
  ) {
    return { category: 'Bahan Segar', storageLocation: 'Cold Storage 1' };
  }
  if (
    lower.includes('wortel') ||
    lower.includes('buncis') ||
    lower.includes('sayur') ||
    lower.includes('bayam') ||
    lower.includes('labu') ||
    lower.includes('brokoli') ||
    lower.includes('tahu') ||
    lower.includes('tempe')
  ) {
    return { category: 'Bahan Segar', storageLocation: 'Chiller Dapur' };
  }
  if (lower.includes('telur') || lower.includes('pisang') || lower.includes('semangka') || lower.includes('jeruk') || lower.includes('buah')) {
    return { category: 'Bahan Segar', storageLocation: 'Gudang Kering B' };
  }
  if (
    lower.includes('bawang') ||
    lower.includes('cabai') ||
    lower.includes('bumbu') ||
    lower.includes('minyak') ||
    lower.includes('rempah')
  ) {
    return { category: 'Bumbu & Rempah', storageLocation: 'Rak Bumbu' };
  }
  if (lower.includes('susu') || lower.includes('ompreng') || lower.includes('sabun') || lower.includes('kemasan')) {
    return { category: 'Kemasan & Higiene', storageLocation: 'Gudang Kering A' };
  }
  return { category: 'Bahan Kering', storageLocation: 'Gudang Kering A' };
}

export function isQCAcceptedForStock(qc: QualityControlRecord): boolean {
  const acceptedStatuses: QCStatusPLOK[] = [
    'Diterima',
    'Lolos Penuh',
    'Diterima sebagian',
    'Lolos Sebagian',
  ];
  return (
    acceptedStatuses.includes(qc.status) &&
    Number(qc.receivedQuantity || 0) > 0 &&
    qc.inventoryAdded !== false
  );
}

export function reconcileInventoryFromQualityControl(params: {
  qualityControlRecords: QualityControlRecord[];
  purchaseOrders: PurchaseOrder[];
  rabItems: RABItem[];
  masterBahan: MasterBahan[];
  existingInventory: InventoryItem[];
  existingMutations: StockMutation[];
}): {
  inventory: InventoryItem[];
  stockMutations: StockMutation[];
} {
  const {
    qualityControlRecords,
    purchaseOrders,
    rabItems,
    masterBahan,
    existingInventory,
    existingMutations,
  } = params;

  const acceptedQCs = qualityControlRecords.filter(isQCAcceptedForStock);

  // Preserve non-inflow historical mutations (Barang Keluar, Retur Keluar, Stok Opname, Retur Masuk)
  const nonQCMutations = existingMutations.filter(m => {
    if (m.qcId) return false;
    if (m.type === 'Barang Masuk' || m.type === 'Stok Awal') return false;
    return true;
  });

  const existingQCMutByQcId = new Map<string, StockMutation>();
  existingMutations.forEach(m => {
    if (m.qcId) {
      existingQCMutByQcId.set(m.qcId, m);
    } else if (m.type === 'Barang Masuk') {
      const matchingQc = acceptedQCs.find(
        q =>
          q.poNumber === m.referenceNumber &&
          isMatchingMaterialNameShared(q.itemName, m.itemName)
      );
      if (matchingQc && !existingQCMutByQcId.has(matchingQc.id)) {
        existingQCMutByQcId.set(matchingQc.id, m);
      }
    }
  });

  // Group accepted QC records by normalized material + unit
  interface QCGroup {
    key: string;
    canonicalName: string;
    unit: string;
    qcs: QualityControlRecord[];
  }

  const groups: QCGroup[] = [];
  // Sort oldest -> newest so canonical batches and chronological balances work cleanly
  const chronologicalQCs = [...acceptedQCs].sort((a, b) =>
    (a.inspectedAt || '').localeCompare(b.inspectedAt || '')
  );

  for (const qc of chronologicalQCs) {
    const unit = (qc.unit || 'kg').trim();
    const existingGroup = groups.find(
      g =>
        g.unit.toLowerCase() === unit.toLowerCase() &&
        isMatchingMaterialNameShared(g.canonicalName, qc.itemName)
    );
    if (existingGroup) {
      existingGroup.qcs.push(qc);
    } else {
      groups.push({
        key: `${normalizeMaterialSyncName(qc.itemName)}__${unit.toLowerCase()}`,
        canonicalName: qc.itemName.trim(),
        unit,
        qcs: [qc],
      });
    }
  }

  const nextInventory: InventoryItem[] = [];
  const generatedQCMutations: StockMutation[] = [];

  groups.forEach((group, idx) => {
    const latestQC = group.qcs[group.qcs.length - 1];
    const existingInv = existingInventory.find(
      inv =>
        inv.qcRecordIds?.some(id => group.qcs.some(q => q.id === id)) ||
        isMatchingMaterialNameShared(inv.name, group.canonicalName)
    );

    const matchedPOItem = purchaseOrders
      .filter(po => group.qcs.some(q => q.poId === po.id || q.poNumber === po.poNumber))
      .flatMap(po => po.items || [])
      .find(it => isMatchingMaterialNameShared(it.itemName, group.canonicalName));

    const matchedRAB = matchedPOItem?.rabId
      ? rabItems.find(r => r.id === matchedPOItem.rabId)
      : rabItems.find(r => isMatchingMaterialNameShared(r.itemName, group.canonicalName));

    const matchedMB = masterBahan.find(mb =>
      isMatchingMaterialNameShared(mb.name, group.canonicalName)
    );

    const resolvedPrice =
      matchedPOItem?.unitPrice ||
      matchedRAB?.unitPrice ||
      existingInv?.pricePerUnit ||
      matchedMB?.actualPrice ||
      15000;

    const inferredMeta = inferWarehouseMetaFromQC(
      group.canonicalName,
      latestQC.receivingTemp
    );
    const invId = existingInv?.id || `inv-qc-${group.qcs[0].id}`;
    const invCode =
      existingInv?.code || `BHK-${String(idx + 1).padStart(3, '0')}`;

    const totalQCReceived = group.qcs.reduce(
      (sum, q) => sum + Number(q.receivedQuantity || 0),
      0
    );

    // Match all outgoing / opname mutations belonging to this item
    const itemOutOrOpnameMuts = nonQCMutations.filter(
      m =>
        m.itemId === invId ||
        isMatchingMaterialNameShared(m.itemName, group.canonicalName)
    );

    const totalOutflow = itemOutOrOpnameMuts
      .filter(m => m.type === 'Barang Keluar' || m.type === 'Retur Keluar')
      .reduce((sum, m) => sum + Number(m.quantityOut || 0), 0);

    const totalReturIn = itemOutOrOpnameMuts
      .filter(m => m.type === 'Retur Masuk')
      .reduce((sum, m) => sum + Number(m.quantityIn || 0), 0);

    const opnameDelta = itemOutOrOpnameMuts
      .filter(m => m.type === 'Stok Opname')
      .reduce(
        (sum, m) => sum + Number(m.quantityIn || 0) - Number(m.quantityOut || 0),
        0
      );

    const netCurrentStock = Math.max(
      0,
      totalQCReceived + totalReturIn - totalOutflow + opnameDelta
    );

    // Build FEFO batches directly from each QC record
    let rawBatches: StockBatch[] = group.qcs.map((qc, bIdx) => {
      const poItem = purchaseOrders
        .find(po => po.id === qc.poId || po.poNumber === qc.poNumber)
        ?.items?.find(it => isMatchingMaterialNameShared(it.itemName, qc.itemName));

      const receivedDate = (qc.inspectedAt || '').slice(0, 10) || new Date().toISOString().slice(0, 10);
      const batchPrice = poItem?.unitPrice || resolvedPrice;
      return {
        id: `batch-${qc.id}`,
        batchNumber: `BATCH-QC-${receivedDate.replace(/-/g, '').slice(2)}-${String(bIdx + 1).padStart(2, '0')}`,
        receivedDate,
        expiryDate: qc.expiryDate || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        initialQty: Number(qc.receivedQuantity || 0),
        remainingQty: Number(qc.receivedQuantity || 0),
        unitPrice: batchPrice,
        supplierName: qc.supplierName,
      };
    });

    // Apply FEFO depletion for total outflows (net of any positive adjustments)
    let remainingToDeplete = Math.max(0, totalOutflow - Math.max(0, opnameDelta) - totalReturIn);
    if (remainingToDeplete > 0) {
      rawBatches = [...rawBatches]
        .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())
        .map(b => {
          if (remainingToDeplete <= 0 || b.remainingQty <= 0) return b;
          const take = Math.min(b.remainingQty, remainingToDeplete);
          remainingToDeplete -= take;
          return { ...b, remainingQty: b.remainingQty - take };
        });
    }

    const activeBatches = rawBatches.filter(b => b.remainingQty > 0);
    const fefoSorted = [...(activeBatches.length > 0 ? activeBatches : rawBatches)].sort(
      (a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
    );
    const nearestExpiry =
      fefoSorted[0]?.expiryDate ||
      latestQC.expiryDate ||
      new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

    const minStock =
      existingInv?.minimumStock ??
      matchedMB?.minimumStock ??
      Math.max(10, Math.round(totalQCReceived * 0.25));

    const expDiffDays = Math.ceil(
      (new Date(nearestExpiry).getTime() - Date.now()) / (1000 * 3600 * 24)
    );
    const qualityStatus: InventoryItem['qualityStatus'] =
      expDiffDays < 0
        ? 'Kadaluarsa'
        : netCurrentStock <= minStock
        ? 'Perlu Pemantauan'
        : 'Baik';

    const invItem: InventoryItem = {
      id: invId,
      code: invCode,
      name: existingInv?.name || group.canonicalName,
      category: existingInv?.category || inferredMeta.category,
      initialStock: totalQCReceived,
      currentStock: netCurrentStock,
      minimumStock: minStock,
      unit: group.unit,
      pricePerUnit: resolvedPrice,
      storageLocation: existingInv?.storageLocation || inferredMeta.storageLocation,
      supplierName: latestQC.supplierName,
      lastRestocked:
        (latestQC.inspectedAt || '').slice(0, 10) ||
        new Date().toISOString().slice(0, 10),
      expiryDate: nearestExpiry,
      qualityStatus,
      batches: rawBatches,
      sourceType: 'quality_control',
      latestQcId: latestQC.id,
      latestPoNumber: latestQC.poNumber,
      qcRecordIds: group.qcs.map(q => q.id),
      qcTotalReceived: totalQCReceived,
      customFields: existingInv?.customFields,
    };

    nextInventory.push(invItem);

    // Ensure every accepted QC record produces a synchronized Barang Masuk mutation
    group.qcs.forEach((qc, qIdx) => {
      const prevMut = existingQCMutByQcId.get(qc.id);
      const batch = rawBatches[qIdx];
      const qcDate = (qc.inspectedAt || '').slice(0, 10) || new Date().toISOString().slice(0, 10);
      const qcTimestamp = qc.inspectedAt || `${qcDate} 08:00`;
      const diffQty =
        qc.differenceQuantity !== undefined
          ? qc.differenceQuantity
          : Number(qc.receivedQuantity || 0) - Number(qc.orderedQuantity || 0);
      const qtyIn = Number(qc.receivedQuantity || 0);
      const unitPrice = batch?.unitPrice || resolvedPrice;

      generatedQCMutations.push({
        ...(prevMut || {}),
        id: prevMut?.id || `mut-qc-${qc.id}`,
        qcId: qc.id,
        itemId: invId,
        itemCode: invCode,
        itemName: invItem.name,
        date: qcDate,
        timestamp: qcTimestamp,
        type: 'Barang Masuk',
        referenceNumber: qc.poNumber,
        batchNumber: batch?.batchNumber,
        expiryDate: qc.expiryDate,
        supplierName: qc.supplierName,
        unit: invItem.unit,
        orderedQuantity: qc.orderedQuantity,
        quantityIn: qtyIn,
        quantityOut: 0,
        differenceQuantity: diffQty,
        balance: qtyIn, // Recalculated chronologically below
        unitPrice,
        totalPrice: qtyIn * unitPrice,
        photoUrl: prevMut?.photoUrl || qc.photoUrl || qc.photoUrls?.[0],
        photoUrls: prevMut?.photoUrls || qc.photoUrls,
        notes:
          prevMut?.notes ||
          `Penerimaan QC (${qc.status}) PO ${qc.poNumber}${qc.notes ? ` — ${qc.notes}` : ''}`,
        operatorName: qc.inspectorName,
        recipientOrDepartment: invItem.storageLocation,
      });
    });
  });

  // Remap non-QC mutations to the new QC-derived InventoryItem IDs
  const remappedNonQCMuts = nonQCMutations
    .map(m => {
      const targetInv = nextInventory.find(
        inv =>
          inv.id === m.itemId ||
          isMatchingMaterialNameShared(inv.name, m.itemName)
      );
      if (!targetInv) return null;
      return {
        ...m,
        itemId: targetInv.id,
        itemCode: targetInv.code,
        itemName: targetInv.name,
        unit: targetInv.unit,
      };
    })
    .filter((m): m is StockMutation => Boolean(m));

  // Combine & compute chronological running balance per item
  const allCombined = [...generatedQCMutations, ...remappedNonQCMuts].sort((a, b) =>
    (a.timestamp || a.date).localeCompare(b.timestamp || b.date)
  );

  const runningBalances = new Map<string, number>();
  const finalMutations = allCombined.map(m => {
    const prevBal = runningBalances.get(m.itemId) || 0;
    let nextBal = prevBal;
    if (m.type === 'Barang Keluar' || m.type === 'Retur Keluar') {
      nextBal = Math.max(0, prevBal - Number(m.quantityOut || 0));
    } else if (m.type === 'Stok Opname') {
      nextBal = Math.max(0, prevBal + Number(m.quantityIn || 0) - Number(m.quantityOut || 0));
    } else {
      nextBal = Math.max(0, prevBal + Number(m.quantityIn || 0));
    }
    runningBalances.set(m.itemId, nextBal);
    return {
      ...m,
      balance: nextBal,
    };
  });

  return {
    inventory: nextInventory,
    stockMutations: finalMutations,
  };
}
