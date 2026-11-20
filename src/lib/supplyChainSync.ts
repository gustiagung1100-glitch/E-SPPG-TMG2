import {
  Institution,
  InventoryItem,
  MasterBahan,
  MasterUnit,
  MenuItem,
  PurchaseOrder,
  QCStatusPLOK,
  QualityControlRecord,
  RABItem,
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

  const bddSmall = hasNum(ov.bddSmall)
    ? Math.max(1, ov.bddSmall)
    : Math.max(1, ing.ediblePortionPercent || 100);
  const bddLarge = hasNum(ov.bddLarge)
    ? Math.max(1, ov.bddLarge)
    : Math.max(1, ing.ediblePortionPercent || 100);

  const bkSmall = hasNum(ov.bkSmall) ? ov.bkSmall : bbSmall / (bddSmall / 100);
  const bkLarge = hasNum(ov.bkLarge) ? ov.bkLarge : bbLarge / (bddLarge / 100);

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

  for (const menu of menuItems) {
    const ings = menuIngredientsMap[menu.id] || menu.ingredients || [];
    const menuLabel = `${menu.menuCode} (${menu.dayName}, ${menu.date})`;

    for (const ing of ings) {
      const calc = calculateIngredientPurchaseQuantity(ing, masterUnits, quotaSmall, quotaLarge);
      if (calc.totalKuantiti <= 0) continue;

      const invMatch = inventory.find(inv => isMatchingMaterialNameShared(inv.name, ing.name));
      const mbMatch = masterBahan.find(mb => isMatchingMaterialNameShared(mb.name, ing.name));
      const resolvedUnit = calc.unit || mbMatch?.unit || invMatch?.unit || 'kg';
      const resolvedPrice =
        ing.unitPrice || mbMatch?.actualPrice || invMatch?.pricePerUnit || 15000;

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
        sourceMenuDate: menu.date,
        sourceMenuLabel: menuLabel,
      };
      perMenuItems.push(itemEntry);

      let matchedKey: string | null = null;
      for (const [k, grp] of aggMap.entries()) {
        if (
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
        const newKey = `${normalizeMaterialSyncName(ing.name)}__${resolvedUnit.toLowerCase()}`;
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
          planDate: menu.date || new Date().toISOString().slice(0, 10),
        });
      }
    }
  }

  return {
    perMenuItems,
    aggregated: Array.from(aggMap.values()),
  };
}

export function syncRABWithMenuPlans(params: {
  menuItems: MenuItem[];
  menuIngredientsMap: Record<string, RecipeIngredient[]>;
  masterUnits: MasterUnit[];
  institutions: Institution[];
  rabItems: RABItem[];
  inventory?: InventoryItem[];
  masterBahan?: MasterBahan[];
}): {
  rabItems: RABItem[];
  createdCount: number;
  updatedCount: number;
} {
  const { aggregated } = computeMenuAggregatedNeeds(params);
  const nextRABs = [...params.rabItems];
  let createdCount = 0;
  let updatedCount = 0;

  const todayStr = new Date().toISOString().slice(0, 10);

  aggregated.forEach((need, idx) => {
    const matchingIdx = nextRABs.findIndex(
      r =>
        r.category === 'RAB Bahan Pangan' &&
        r.status !== 'Ditolak' &&
        isMatchingMaterialNameShared(r.itemName, need.name)
    );

    const menuCodesStr = need.sourceMenuCodes.join(', ');
    const menuNotes = `Sumber Perencanaan Menu PLOG: ${need.sourceMenuLabels.join(' + ')} (${need.category})`;

    if (matchingIdx >= 0) {
      const existing = nextRABs[matchingIdx];
      const poUsedQty = existing.poCreatedQuantity || 0;
      const isEditableFromMenu =
        existing.status === 'Draft' ||
        existing.status === 'Menunggu Persetujuan' ||
        poUsedQty === 0;

      if (isEditableFromMenu) {
        const effectiveVol = Math.max(need.quantity, poUsedQty);
        nextRABs[matchingIdx] = {
          ...existing,
          volume: effectiveVol,
          unit: need.unit || existing.unit,
          unitPrice: need.unitPrice || existing.unitPrice,
          totalBudget: effectiveVol * (need.unitPrice || existing.unitPrice),
          sourceType: 'menu_planning',
          sourceMenuId: need.sourceMenuIds[0],
          sourceMenuCode: menuCodesStr,
          sourceMenuLabel: need.sourceMenuLabels.join(', '),
          notes: menuNotes,
        };
        updatedCount++;
      } else if (!existing.sourceType) {
        nextRABs[matchingIdx] = {
          ...existing,
          sourceType: 'menu_planning',
          sourceMenuId: existing.sourceMenuId || need.sourceMenuIds[0],
          sourceMenuCode: existing.sourceMenuCode || menuCodesStr,
          sourceMenuLabel: existing.sourceMenuLabel || need.sourceMenuLabels.join(', '),
        };
      }
    } else {
      const codeNum = String(nextRABs.length + 1).padStart(3, '0');
      const ym = (need.planDate || todayStr).slice(0, 7);
      nextRABs.unshift({
        id: `rab-menu-${Date.now()}-${idx}`,
        category: 'RAB Bahan Pangan',
        budgetCode: `RAB-BP-${ym}-${codeNum}`,
        planDate: need.planDate || todayStr,
        periodMonth: 'November 2026',
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
        notes: menuNotes,
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

// =============================================================================
// STAGE 2: RAB -> PURCHASE ORDER (PO)
// =============================================================================

export function reconcileRABWithPurchaseOrders(
  pos: PurchaseOrder[],
  rabs: RABItem[]
): RABItem[] {
  const activePOs = pos.filter(po => po.status !== 'Ditolak' && po.status !== 'Dibatalkan');
  return rabs.map(rab => {
    let totalQty = 0;
    let totalAmount = 0;

    for (const po of activePOs) {
      const matchingItems = (po.items || []).filter(item => item.rabId === rab.id);
      if (matchingItems.length > 0) {
        for (const item of matchingItems) {
          totalQty += Number(item.quantity || 0);
          totalAmount += Number(
            item.subtotal || (item.quantity || 0) * (item.unitPrice || 0)
          );
        }
      } else if (po.rabId === rab.id) {
        const matchedByName = (po.items || []).filter(it =>
          isMatchingMaterialNameShared(it.itemName, rab.itemName)
        );
        const itemsToSum = matchedByName.length > 0 ? matchedByName : po.items || [];
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

    const totalOrdered = updatedItems.reduce((s, it) => s + Number(it.quantity || 0), 0);
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
