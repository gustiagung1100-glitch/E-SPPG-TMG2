import {
  FoodCompositionItem,
  InventoryItem,
  MasterBahan,
  MasterUnit,
  MaterialDimensionConversion,
  RABItem,
} from '../types';
import { isMatchingMaterialNameShared } from './supplyChainSync';

export interface MasterUnitSelectOption {
  value: string;
  label: string;
  compactLabel: string;
  group: 'Master Satuan & Dimensi Bahan' | 'Dimensi Bahan' | 'Satuan Operasional / Kustom';
  hasDimensi?: boolean;
}

export interface AutoResolvedUnitResult {
  unit: string;
  unitPrice?: number;
  matchedSource: string;
}

/**
 * Membangun daftar pilihan jenis satuan yang diambil dari Master Satuan (`masterUnits`)
 * & Master Dimensi Bahan (`materialConversions`), sekaligus mempertahankan satuan kustom/eksisting
 * agar tidak ada nilai lama yang hilang saat dipilih pada dropdown.
 */
export function buildMasterUnitSelectOptions(params: {
  masterUnits: MasterUnit[];
  materialConversions: MaterialDimensionConversion[];
  extraUnits?: Array<string | undefined | null>;
}): MasterUnitSelectOption[] {
  const { masterUnits = [], materialConversions = [], extraUnits = [] } = params;

  const conversionsByUnit = new Map<string, MaterialDimensionConversion[]>();
  materialConversions.forEach(conv => {
    const code = (conv.unit || '').trim();
    if (!code) return;
    const key = code.toLowerCase();
    const list = conversionsByUnit.get(key) || [];
    list.push(conv);
    conversionsByUnit.set(key, list);
  });

  const seen = new Set<string>();
  const options: MasterUnitSelectOption[] = [];

  masterUnits.forEach(u => {
    const code = (u.code || '').trim();
    if (!code) return;
    const key = code.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);

    const linkedConvs = conversionsByUnit.get(key) || [];
    const sampleNames = linkedConvs
      .slice(0, 2)
      .map(c => c.materialName.split(' ')[0])
      .filter(Boolean)
      .join(', ');
    const dimensiSuffix =
      linkedConvs.length > 0
        ? ` [Dimensi: ${sampleNames}${linkedConvs.length > 2 ? ', …' : ''}]`
        : '';

    options.push({
      value: code,
      label: `${code} — ${u.name}${dimensiSuffix}`,
      compactLabel: `${code} — ${u.name}`,
      group: 'Master Satuan & Dimensi Bahan',
      hasDimensi: linkedConvs.length > 0,
    });
  });

  materialConversions.forEach(conv => {
    const code = (conv.unit || '').trim();
    if (!code) return;
    const key = code.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);

    options.push({
      value: code,
      label: `${code} — Dimensi Bahan (${conv.materialName}: ${conv.gramsPerUnit}g)`,
      compactLabel: `${code} — Dimensi (${conv.materialName})`,
      group: 'Dimensi Bahan',
      hasDimensi: true,
    });
  });

  extraUnits.forEach(raw => {
    const code = (raw || '').trim();
    if (!code) return;
    const key = code.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);

    options.push({
      value: code,
      label: `${code} — Satuan Operasional / Kustom`,
      compactLabel: code,
      group: 'Satuan Operasional / Kustom',
      hasDimensi: false,
    });
  });

  return options;
}

/**
 * Menyesuaikan kode satuan ke penulisan kanonik yang terdaftar pada Master Satuan / Dimensi Bahan.
 */
function canonicalizeUnitCode(
  rawUnit: string | undefined | null,
  masterUnits: MasterUnit[],
  materialConversions: MaterialDimensionConversion[]
): string | null {
  const trimmed = (rawUnit || '').trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();

  const masterMatch = masterUnits.find(u => u.code.trim().toLowerCase() === lower);
  if (masterMatch) return masterMatch.code;

  const convMatch = materialConversions.find(c => c.unit.trim().toLowerCase() === lower);
  if (convMatch) return convMatch.unit;

  return trimmed;
}

function detectExplicitStandaloneUnitWord(
  itemName: string,
  masterUnits: MasterUnit[],
  materialConversions: MaterialDimensionConversion[]
): string | null {
  // Abaikan teks di dalam tanda kurung seperti "(Karung 50kg)" atau "(125ml)"
  const withoutParens = itemName.replace(/\([^)]*\)/g, ' ').trim();
  if (!withoutParens) return null;

  const words = withoutParens
    .toLowerCase()
    .split(/[\s,;/+-]+/)
    .map(w => w.trim())
    .filter(w => Boolean(w) && !/^\d/.test(w));

  if (words.length === 0) return null;

  // Daftar unit yang eksplisit bermakna dimensi/kemasan saat diketik sebagai kata terpisah
  const knownCodes = new Map<string, string>();
  masterUnits.forEach(u => {
    const code = u.code.trim();
    if (code) knownCodes.set(code.toLowerCase(), code);
  });
  materialConversions.forEach(c => {
    const code = c.unit.trim();
    if (code && !knownCodes.has(code.toLowerCase())) {
      knownCodes.set(code.toLowerCase(), code);
    }
  });

  const explicitDimensionWords = [
    'jerigen',
    'tabung',
    'galon',
    'ikat',
    'butir',
    'papan',
    'potong',
    'buah',
    'ekor',
    'siung',
    'lembar',
    'karung',
    'kotak',
    'dus',
    'botol',
    'bungkus',
    'kaleng',
    'roll',
    'pak',
    'pcs',
    'porsi',
    'paket',
    'box',
    'set',
    'liter',
    'ml',
    'gram',
    'ons',
    'kwintal',
    'ton',
  ];

  // Cek dari kata belakang ke depan agar kata satuan spesifik di akhir nama lebih diprioritaskan
  for (let i = words.length - 1; i >= 0; i--) {
    const w = words[i];
    if (!explicitDimensionWords.includes(w)) continue;
    // Jangan salah baca kata "tahu potong" atau "ayam potong" sebagai satuan potong kecuali didahului angka
    if (w === 'potong' && i > 0 && !/\d/.test(withoutParens.split(/\s+/)[i - 1] || '')) {
      continue;
    }
    const mapped = knownCodes.get(w);
    if (mapped) return mapped;
    if (w === 'jerigen' || w === 'paket' || w === 'box' || w === 'set') return w;
  }

  return null;
}

/**
 * Menyelesaikan satuan otomatis berdasarkan nama bahan pangan / nama barang operasional
 * dari Master Bahan, Dimensi Bahan, Inventaris, TKPI, Katalog Operasional, dan kata kunci domain.
 */
export function resolveAutoUnitForItem(params: {
  itemName: string;
  categoryHint?: 'bahan' | 'operasional' | 'all';
  masterUnits: MasterUnit[];
  materialConversions: MaterialDimensionConversion[];
  masterBahan?: MasterBahan[];
  inventory?: InventoryItem[];
  foodCompositions?: FoodCompositionItem[];
  existingRABItems?: RABItem[];
}): AutoResolvedUnitResult | null {
  const {
    itemName,
    categoryHint = 'all',
    masterUnits = [],
    materialConversions = [],
    masterBahan = [],
    inventory = [],
    foodCompositions = [],
    existingRABItems = [],
  } = params;

  const clean = (itemName || '').trim();
  if (!clean) return null;
  const lower = clean.toLowerCase();

  const pickValid = (
    rawUnit: string | undefined | null,
    matchedSource: string,
    unitPrice?: number
  ): AutoResolvedUnitResult | null => {
    const unit = canonicalizeUnitCode(rawUnit, masterUnits, materialConversions);
    if (!unit) return null;
    return {
      unit,
      ...(typeof unitPrice === 'number' && Number.isFinite(unitPrice) && unitPrice > 0
        ? { unitPrice }
        : {}),
      matchedSource,
    };
  };

  // 1. Cek kecocokan persis (case-insensitive)
  if (categoryHint === 'operasional') {
    const exactRabOps = existingRABItems.find(
      r => r.category === 'RAB Operasional' && r.itemName.trim().toLowerCase() === lower
    );
    if (exactRabOps) {
      const res = pickValid(exactRabOps.unit, 'RAB Operasional', exactRabOps.unitPrice);
      if (res) return res;
    }

    const exactInv = inventory.find(inv => inv.name.trim().toLowerCase() === lower);
    if (exactInv) {
      const res = pickValid(exactInv.unit, 'Inventaris Gudang', exactInv.pricePerUnit);
      if (res) return res;
    }

    const exactConv = materialConversions.find(
      c => c.materialName.trim().toLowerCase() === lower
    );
    if (exactConv) {
      const res = pickValid(exactConv.unit, 'Dimensi Bahan');
      if (res) return res;
    }

    const exactMaster = masterBahan.find(b => b.name.trim().toLowerCase() === lower);
    if (exactMaster) {
      const res = pickValid(
        exactMaster.unit,
        'Master Bahan',
        exactMaster.actualPrice || exactMaster.referencePrice
      );
      if (res) return res;
    }
  } else {
    const exactConv = materialConversions.find(
      c => c.materialName.trim().toLowerCase() === lower
    );
    if (exactConv) {
      const matchedMasterPrice = masterBahan.find(b =>
        isMatchingMaterialNameShared(b.name, clean)
      );
      const res = pickValid(
        exactConv.unit,
        'Dimensi Bahan',
        matchedMasterPrice?.actualPrice || matchedMasterPrice?.referencePrice
      );
      if (res) return res;
    }

    const exactMaster = masterBahan.find(b => b.name.trim().toLowerCase() === lower);
    if (exactMaster) {
      const res = pickValid(
        exactMaster.unit,
        'Master Bahan',
        exactMaster.actualPrice || exactMaster.referencePrice
      );
      if (res) return res;
    }

    const exactInv = inventory.find(inv => inv.name.trim().toLowerCase() === lower);
    if (exactInv) {
      const res = pickValid(exactInv.unit, 'Inventaris Gudang', exactInv.pricePerUnit);
      if (res) return res;
    }

    const exactComp = foodCompositions.find(fc => fc.name.trim().toLowerCase() === lower);
    if (exactComp) {
      const res = pickValid(exactComp.purchaseUnit, 'TKPI Gizi', exactComp.defaultUnitPrice);
      if (res) return res;
    }

    const exactRab = existingRABItems.find(r => r.itemName.trim().toLowerCase() === lower);
    if (exactRab) {
      const res = pickValid(exactRab.unit, 'Riwayat RAB', exactRab.unitPrice);
      if (res) return res;
    }
  }

  // 2. Cek kata satuan eksplisit yang ditulis langsung pada nama item (misal "Telur 10 Butir", "Air Galon")
  const explicitWordUnit = detectExplicitStandaloneUnitWord(
    clean,
    masterUnits,
    materialConversions
  );
  if (explicitWordUnit) {
    return {
      unit: explicitWordUnit,
      matchedSource: 'Deteksi Satuan pada Nama Item',
    };
  }

  // 3. Cek kecocokan nama pintar (token / partial match)
  if (categoryHint === 'operasional') {
    const fuzzyRabOps = existingRABItems.find(
      r => r.category === 'RAB Operasional' && isMatchingMaterialNameShared(r.itemName, clean)
    );
    if (fuzzyRabOps) {
      const res = pickValid(fuzzyRabOps.unit, 'RAB Operasional', fuzzyRabOps.unitPrice);
      if (res) return res;
    }

    const fuzzyInvOps = inventory.find(inv => isMatchingMaterialNameShared(inv.name, clean));
    if (fuzzyInvOps) {
      const res = pickValid(fuzzyInvOps.unit, 'Inventaris Gudang', fuzzyInvOps.pricePerUnit);
      if (res) return res;
    }
  } else {
    const fuzzyMaster = masterBahan.find(b => isMatchingMaterialNameShared(b.name, clean));
    if (fuzzyMaster) {
      const res = pickValid(
        fuzzyMaster.unit,
        'Master Bahan',
        fuzzyMaster.actualPrice || fuzzyMaster.referencePrice
      );
      if (res) return res;
    }

    const fuzzyConv = materialConversions.find(c =>
      isMatchingMaterialNameShared(c.materialName, clean)
    );
    if (fuzzyConv) {
      const res = pickValid(fuzzyConv.unit, 'Dimensi Bahan');
      if (res) return res;
    }

    const fuzzyInv = inventory.find(inv => isMatchingMaterialNameShared(inv.name, clean));
    if (fuzzyInv) {
      const res = pickValid(fuzzyInv.unit, 'Inventaris Gudang', fuzzyInv.pricePerUnit);
      if (res) return res;
    }

    const fuzzyComp = foodCompositions.find(fc => isMatchingMaterialNameShared(fc.name, clean));
    if (fuzzyComp) {
      const res = pickValid(fuzzyComp.purchaseUnit, 'TKPI Gizi', fuzzyComp.defaultUnitPrice);
      if (res) return res;
    }

    const fuzzyRab = existingRABItems.find(r => isMatchingMaterialNameShared(r.itemName, clean));
    if (fuzzyRab) {
      const res = pickValid(fuzzyRab.unit, 'Riwayat RAB', fuzzyRab.unitPrice);
      if (res) return res;
    }
  }

  // 4. Heuristik kata kunci domain Bahan Pangan & Operasional SPPG (untuk item baru yang belum ada di Master)
  const hasMasterUnit = (code: string) =>
    masterUnits.find(u => u.code.trim().toLowerCase() === code.toLowerCase())?.code;

  // Operasional keywords
  if (/\b(gas|lpg|elpiji)\b/.test(lower)) {
    return { unit: hasMasterUnit('tabung') || 'tabung', matchedSource: 'Kategori Energi Gas' };
  }
  if (/\b(bbm|pertalite|pertamax|solar|dexlite|bensin)\b/.test(lower)) {
    return { unit: hasMasterUnit('liter') || 'liter', matchedSource: 'Kategori BBM Armada' };
  }
  if (/\b(galon|isi ulang air|air mineral galon)\b/.test(lower)) {
    return { unit: hasMasterUnit('galon') || 'galon', matchedSource: 'Kategori Air Galon' };
  }
  if (/\b(sabun|disinfektan|detergen|deterjen|karbol|pembersih|handwash|sanitizer)\b/.test(lower)) {
    if (lower.includes('jerigen')) {
      return { unit: 'jerigen 5L', matchedSource: 'Kategori Sanitasi' };
    }
    if (lower.includes('botol')) {
      return { unit: hasMasterUnit('botol') || 'botol', matchedSource: 'Kategori Sanitasi' };
    }
    return { unit: hasMasterUnit('liter') || 'liter', matchedSource: 'Kategori Sanitasi' };
  }
  if (/\b(apd|hairnet|masker|sarung tangan|tisu|tissue)\b/.test(lower)) {
    return { unit: hasMasterUnit('kotak') || hasMasterUnit('pak') || 'kotak', matchedSource: 'Kategori APD & Higiene' };
  }
  if (/\b(wrapping|wrap|aluminium foil|lakban|selotip|isolasi|plastic wrap)\b/.test(lower)) {
    return { unit: hasMasterUnit('roll') || 'roll', matchedSource: 'Kategori Kemasan Roll' };
  }
  if (/\b(kresek|kantong plastik|trash bag|sedotan|sendok plastik|karet gelang)\b/.test(lower)) {
    return { unit: hasMasterUnit('pak') || 'pak', matchedSource: 'Kategori Bahan Habis Pakai' };
  }
  if (/\b(kertas nasi|daun pisang|lap kain|serbet)\b/.test(lower)) {
    return { unit: hasMasterUnit('lembar') || 'lembar', matchedSource: 'Kategori Lembaran' };
  }
  if (/\b(ompreng|food tray|filter|regulator|selang|kompor|pisau|talenan|ember|sapu|pel|spons|baskom)\b/.test(lower)) {
    return { unit: hasMasterUnit('pcs') || 'pcs', matchedSource: 'Kategori Perlengkapan Dapur' };
  }
  if (/\b(listrik|token|pdam|internet|wifi|kebersihan|retribusi|servis|service|perawatan|sewa|jasa|atk|administrasi)\b/.test(lower)) {
    return { unit: 'paket', matchedSource: 'Kategori Jasa & Utilitas' };
  }

  // Bahan pangan keywords
  if (/\b(bayam|kangkung|sawi|caisim|seledri|kemangi|selada|daun bawang|kacang panjang|genjer|kenikir)\b/.test(lower)) {
    return { unit: hasMasterUnit('ikat') || 'ikat', matchedSource: 'Kategori Sayur Ikat' };
  }
  if (/\b(susu uht|susu kotak)\b/.test(lower)) {
    return { unit: hasMasterUnit('kotak') || hasMasterUnit('pcs') || 'kotak', matchedSource: 'Kategori Susu Kemasan' };
  }
  if (/\b(minyak goreng|minyak sayur|kecap|cuka|madu)\b/.test(lower)) {
    return { unit: hasMasterUnit('liter') || 'liter', matchedSource: 'Kategori Bahan Cair' };
  }
  if (
    /\b(beras|tepung|gula|garam|ayam|daging|sapi|ikan|tongkol|lele|bandeng|udang|telur|tempe|tahu|wortel|buncis|kentang|kubis|kol|labu|tomat|cabai|cabe|bawang|jahe|kunyit|lengkuas|kacang|semangka|pisang|jeruk|melon|pepaya)\b/.test(
      lower
    )
  ) {
    return { unit: hasMasterUnit('kg') || 'kg', matchedSource: 'Kategori Bahan Pangan (Berat)' };
  }

  // Fallback jika pengguna sudah memilih kategori operasional tapi nama item bebas
  if (categoryHint === 'operasional') {
    return { unit: hasMasterUnit('pcs') || 'pcs', matchedSource: 'Default Operasional' };
  }

  return null;
}
