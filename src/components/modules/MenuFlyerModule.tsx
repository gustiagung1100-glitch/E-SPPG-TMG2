import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useApp } from '../../lib/store';
import {
  MenuItem,
  PortioningInspectionRecord,
  FlyerTemplateId,
  FlyerSizeId,
  RecipeIngredient,
} from '../../types';
import { defaultNutritionTarget } from '../../lib/plogData';
import { resolveRecipeIngredientFormula } from '../../lib/supplyChainSync';
import { formatIndonesianDate, triggerPrint } from '../../lib/exportUtils';
import { ClassicTimeInput } from '../common/ClassicTimeInput';
import { toPng } from 'html-to-image';
import {
  Download,
  Printer,
  Copy,
  Sparkles,
  Layers,
  Calendar,
  Clock,
  CheckCircle2,
  Upload,
  RefreshCw,
  Image as ImageIcon,
  Check,
  Eye,
  RotateCcw,
  Users,
  Utensils,
} from 'lucide-react';
import { removeOmprengBackground } from '../../lib/imageCutout';

const formatSingleDayDate = (dateStr?: string, fallbackDayName?: string): string => {
  const formatted = formatIndonesianDate(dateStr);
  if (!formatted || formatted === '-') {
    return fallbackDayName || '-';
  }
  const dayTrimmed = (fallbackDayName || '').trim();
  const indonesianDays = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
  const alreadyHasWeekday = indonesianDays.some(day =>
    formatted.toLowerCase().startsWith(day.toLowerCase())
  );
  if (alreadyHasWeekday) {
    return formatted;
  }
  return dayTrimmed ? `${dayTrimmed}, ${formatted}` : formatted;
};

const formatFlyerDecimal = (val: number, maxDecimals = 2): string => {
  if (!Number.isFinite(val) || Math.abs(val) < 0.0005) return '0';
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  }).format(Number(val.toFixed(maxDecimals)));
};

const formatFlyerRupiah = (amount: number): string => {
  const safe = Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : 0;
  return `Rp. ${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(safe)}`;
};

const normalizeNameKey = (val: string) =>
  (val || '').toLowerCase().replace(/[^a-z0-9]/g, '');

function resolveDishName(ing: RecipeIngredient, menu: MenuItem): { dishName: string; isStaple: boolean } {
  const cat = (ing.category || '').toLowerCase();
  const isStaple = cat.includes('pokok');
  if (ing.menuName && ing.menuName.trim() !== '') {
    return { dishName: ing.menuName.trim(), isStaple };
  }
  if (isStaple) return { dishName: menu.stapleFood || 'Nasi putih', isStaple: true };
  if (cat.includes('hewani')) return { dishName: menu.animalProtein || 'Lauk Hewani', isStaple: false };
  if (cat.includes('nabati')) return { dishName: menu.plantProtein || 'Lauk Nabati', isStaple: false };
  if (cat.includes('sayur')) return { dishName: menu.vegetable || 'Sayuran', isStaple: false };
  if (cat.includes('buah')) return { dishName: menu.fruit || 'Buah Segar', isStaple: false };
  if (cat.includes('ekstra') || cat.includes('susu'))
    return { dishName: menu.milkOrExtra || 'Ekstra / Susu', isStaple: false };
  return { dishName: 'Pelengkap & Bumbu', isStaple: false };
}

interface FlyerDishRow {
  name: string;
  smallGrams: number;
  largeGrams: number;
  costSmall: number;
  costLarge: number;
  isStaple: boolean;
}

interface AkgRangePreset {
  small: {
    energi: string;
    protein: string;
    lemak: string;
    karbohidrat: string;
    serat: string;
  };
  large: {
    energi: string;
    protein: string;
    lemak: string;
    karbohidrat: string;
    serat: string;
  };
}

const FLYER_BGN_AKG_PRESET: AkgRangePreset = {
  small: {
    energi: '275 – 413 kkal',
    protein: '5 – 10 g',
    lemak: '10 – 14 g',
    karbohidrat: '44 – 63 g',
    serat: '4–6 g',
  },
  large: {
    energi: '585 – 898 kkal',
    protein: '16 – 27 g',
    lemak: '20 – 22 g',
    karbohidrat: '87 – 140 g',
    serat: '8 – 13 g',
  },
};

const PLOG_AKG_PRESET: AkgRangePreset = {
  small: {
    energi: `${defaultNutritionTarget.smallPortionTarget.caloriesMin} – ${defaultNutritionTarget.smallPortionTarget.caloriesMax} kkal`,
    protein: `${defaultNutritionTarget.smallPortionTarget.proteinMin} – ${defaultNutritionTarget.smallPortionTarget.proteinMax} g`,
    lemak: `${defaultNutritionTarget.smallPortionTarget.fatMin} – ${defaultNutritionTarget.smallPortionTarget.fatMax} g`,
    karbohidrat: `${defaultNutritionTarget.smallPortionTarget.carbMin} – ${defaultNutritionTarget.smallPortionTarget.carbMax} g`,
    serat: `${defaultNutritionTarget.smallPortionTarget.fiberMin} – ${defaultNutritionTarget.smallPortionTarget.fiberMax} g`,
  },
  large: {
    energi: `${defaultNutritionTarget.largePortionTarget.caloriesMin} – ${defaultNutritionTarget.largePortionTarget.caloriesMax} kkal`,
    protein: `${defaultNutritionTarget.largePortionTarget.proteinMin} – ${defaultNutritionTarget.largePortionTarget.proteinMax} g`,
    lemak: `${defaultNutritionTarget.largePortionTarget.fatMin} – ${defaultNutritionTarget.largePortionTarget.fatMax} g`,
    karbohidrat: `${defaultNutritionTarget.largePortionTarget.carbMin} – ${defaultNutritionTarget.largePortionTarget.carbMax} g`,
    serat: `${defaultNutritionTarget.largePortionTarget.fiberMin} – ${defaultNutritionTarget.largePortionTarget.fiberMax} g`,
  },
};

interface FlyerThemeTokens {
  canvasBg: string;
  primaryNavy: string;
  softCapsuleBg: string;
  cardFillBg: string;
  cardBorder: string;
  headingColor: string;
  textPrimary: string;
  dotPatternColor: string;
}

const FLYER_THEMES: Record<FlyerTemplateId, FlyerThemeTokens> = {
  modern_bgn: {
    canvasBg: '#F4F6F7',
    primaryNavy: '#163653',
    softCapsuleBg: '#D8EEF3',
    cardFillBg: '#BDE0EE',
    cardBorder: '#163653',
    headingColor: '#163653',
    textPrimary: '#0F172A',
    dotPatternColor: 'rgba(22, 54, 83, 0.045)',
  },
  nutri_infographic: {
    canvasBg: '#F3F8F5',
    primaryNavy: '#0F4C3A',
    softCapsuleBg: '#D5EFE3',
    cardFillBg: '#BCE6D4',
    cardBorder: '#0F4C3A',
    headingColor: '#0F4C3A',
    textPrimary: '#0F172A',
    dotPatternColor: 'rgba(15, 76, 58, 0.045)',
  },
  nusantara_warm: {
    canvasBg: '#FAF7F2',
    primaryNavy: '#5C2D16',
    softCapsuleBg: '#F3E3D3',
    cardFillBg: '#EED6BF',
    cardBorder: '#5C2D16',
    headingColor: '#5C2D16',
    textPrimary: '#1C1917',
    dotPatternColor: 'rgba(92, 45, 22, 0.04)',
  },
  school_friendly: {
    canvasBg: '#F3F7FC',
    primaryNavy: '#1E3A8A',
    softCapsuleBg: '#DBEAFE',
    cardFillBg: '#BFDBFE',
    cardBorder: '#1E3A8A',
    headingColor: '#1E3A8A',
    textPrimary: '#0F172A',
    dotPatternColor: 'rgba(30, 58, 138, 0.045)',
  },
};

// Official Certification Badges using high-res transparent PNG inside smooth CSS pill capsule
const CertificationCapsule: React.FC<{ bgColor: string }> = ({ bgColor }) => {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      style={{ backgroundColor: bgColor }}
      className="rounded-full px-5 py-2 flex items-center justify-center shrink-0"
    >
      {!imgError ? (
        <img
          src="/assets/cert_logos_clean.png"
          alt="Logo BNSP, SLHS, dan Halal Indonesia"
          onError={() => setImgError(true)}
          className="h-11 w-auto object-contain select-none"
        />
      ) : (
        <div className="flex items-center gap-3.5 py-1">
          <span className="text-xs font-black text-slate-900">BNSP</span>
          <span className="text-xs font-black text-emerald-700">SLHS</span>
          <span className="text-xs font-black text-purple-900">HALAL</span>
        </div>
      )}
    </div>
  );
};

const WarningTriangleIcon: React.FC = () => (
  <svg viewBox="0 0 36 32" className="w-7 h-6 shrink-0" aria-hidden="true">
    <path
      d="M18 3 L33 29 L3 29 Z"
      fill="#FFFFFF"
      stroke="#DC2626"
      strokeWidth="3.2"
      strokeLinejoin="round"
    />
    <rect x="16.5" y="11" width="3" height="9.5" rx="1.5" fill="#0F172A" />
    <circle cx="18" cy="24.2" r="1.8" fill="#0F172A" />
  </svg>
);

export const MenuFlyerModule: React.FC = () => {
  const {
    menuItems,
    menuIngredientsMap,
    institutions,
    masterUnits,
    masterBahan,
    rabItems,
    portioningRecords,
    sppgConfig,
  } = useApp();
  const flyerRef = useRef<HTMLDivElement>(null);

  const [selectedMenuId, setSelectedMenuId] = useState<string>(
    menuItems.length > 0 ? menuItems[0].id : 'menu-1'
  );
  const [template, setTemplate] = useState<FlyerTemplateId>('modern_bgn');
  const [size, setSize] = useState<FlyerSizeId>('a4');
  const [zoomScale, setZoomScale] = useState<number>(0.85);

  // Controls synced to template layout
  const [smallConsumptionDeadline, setSmallConsumptionDeadline] = useState<string>('09.00 WIB');
  const [largeConsumptionDeadline, setLargeConsumptionDeadline] = useState<string>('11.00 WIB');
  const [showNutritionFacts, setShowNutritionFacts] = useState<boolean>(true);
  const [showConsumptionDeadline, setShowConsumptionDeadline] = useState<boolean>(true);
  const [showCertBadges, setShowCertBadges] = useState<boolean>(true);
  const [showPortionCounts, setShowPortionCounts] = useState<boolean>(true);
  const [showItemPrices, setShowItemPrices] = useState<boolean>(true);
  const [grammageMode, setGrammageMode] = useState<'staple_only' | 'all' | 'none'>('staple_only');
  const [showOfficials, setShowOfficials] = useState<boolean>(false);
  const [photoLayoutMode, setPhotoLayoutMode] = useState<'dual_both' | 'small_only' | 'large_only'>('dual_both');
  const [akgPresetMode, setAkgPresetMode] = useState<'flyer_bgn' | 'plog_target'>('flyer_bgn');
  const [akgValues, setAkgValues] = useState<AkgRangePreset>(FLYER_BGN_AKG_PRESET);

  // Portion counts synced from Master Lembaga
  const institutionTotals = useMemo(() => {
    const activeInsts = institutions.filter(i => i.isActive !== false);
    const pool = activeInsts.length > 0 ? activeInsts : institutions;
    return pool.reduce(
      (acc, inst) => ({
        small: acc.small + (Number(inst.smallPortions) || 0),
        large: acc.large + (Number(inst.largePortions) || 0),
      }),
      { small: 0, large: 0 }
    );
  }, [institutions]);

  const [customSmallCount, setCustomSmallCount] = useState<string>('');
  const [customLargeCount, setCustomLargeCount] = useState<string>('');

  const displayedSmallPortions =
    customSmallCount.trim() !== '' && Number.isFinite(Number(customSmallCount))
      ? Number(customSmallCount)
      : institutionTotals.small;
  const displayedLargePortions =
    customLargeCount.trim() !== '' && Number.isFinite(Number(customLargeCount))
      ? Number(customLargeCount)
      : institutionTotals.large;

  const [isDownloading, setIsDownloading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Active menu
  const activeMenu: MenuItem = useMemo(() => {
    return (
      menuItems.find(m => m.id === selectedMenuId) ||
      menuItems[0] || {
        id: 'menu-1',
        date: '2026-11-18',
        dayName: 'Rabu',
        cycleWeek: 2,
        menuCode: 'MBG-TMG2-H09',
        stapleFood: 'Nasi putih',
        animalProtein: 'Ayam goreng ketumbar',
        plantProtein: 'Tahu krispi',
        vegetable: 'Capcay merah',
        fruit: 'Pisang cavendish',
        milkOrExtra: 'Susu Pasteurisasi UHT 125ml',
        caloriesSmall: 484.6,
        caloriesLarge: 609.55,
        proteinGrams: 23.69,
        carbGrams: 53.42,
        fatGrams: 21.01,
        fiberGrams: 1.06,
        calciumMg: 295,
        ironMg: 4.5,
        targetPortions: 2708,
        estimatedCostPerPortion: 9000,
        status: 'Disetujui Kepala',
      }
    );
  }, [menuItems, selectedMenuId]);

  const activeIngredients = useMemo(() => {
    const mapped = menuIngredientsMap[activeMenu.id];
    if (mapped && mapped.length > 0) return mapped;
    return activeMenu.ingredients || [];
  }, [menuIngredientsMap, activeMenu]);

  // Compute dish rows (name, gramasi kecil/besar, harga per porsi kecil/besar) from PLOG
  const dishRows: FlyerDishRow[] = useMemo(() => {
    const qSmall = Math.max(1, displayedSmallPortions || 100);
    const qLarge = Math.max(1, displayedLargePortions || 100);

    if (activeIngredients.length > 0) {
      const order: string[] = [];
      const map = new Map<string, FlyerDishRow>();

      activeIngredients.forEach(ing => {
        const cat = (ing.category || '').toLowerCase();
        // Skip standalone condiments unless nutritionist assigned an explicit dish name
        if (cat.includes('bumbu') && !(ing.menuName && ing.menuName.trim())) {
          return;
        }

        const { dishName, isStaple } = resolveDishName(ing, activeMenu);
        const rabMatch =
          rabItems.find(
            r =>
              r.category === 'RAB Bahan Pangan' &&
              r.sourceMenuId === activeMenu.id &&
              normalizeNameKey(r.itemName) === normalizeNameKey(ing.name)
          ) ||
          rabItems.find(
            r =>
              r.category === 'RAB Bahan Pangan' &&
              normalizeNameKey(r.itemName) === normalizeNameKey(ing.name)
          );
        const mbMatch = masterBahan.find(
          mb => normalizeNameKey(mb.name) === normalizeNameKey(ing.name)
        );
        const unitPrice =
          ing.unitPrice > 0
            ? ing.unitPrice
            : rabMatch?.unitPrice || mbMatch?.actualPrice || 0;

        const formula = resolveRecipeIngredientFormula(
          ing,
          masterUnits,
          qSmall,
          qLarge,
          2,
          2,
          unitPrice
        );

        const existing = map.get(dishName) || {
          name: dishName,
          smallGrams: 0,
          largeGrams: 0,
          costSmall: 0,
          costLarge: 0,
          isStaple,
        };
        existing.smallGrams += Number(ing.netWeightSmall) || 0;
        existing.largeGrams += Number(ing.netWeightLarge) || 0;
        existing.costSmall += formula.costPortionSmall || 0;
        existing.costLarge += formula.costPortionLarge || 0;
        if (isStaple) existing.isStaple = true;

        if (!map.has(dishName)) order.push(dishName);
        map.set(dishName, existing);
      });

      const resolved = order.map(k => map.get(k)!).filter(Boolean);
      if (resolved.length > 0) return resolved;
    }

    // Fallback from MenuItem fields if no recipe ingredients exist yet
    const baseCost = activeMenu.estimatedCostPerPortion || 9500;
    const candidates: Array<{ name?: string; sg: number; lg: number; weight: number; isStaple: boolean }> = [
      { name: activeMenu.stapleFood, sg: 100, lg: 200, weight: 0.14, isStaple: true },
      { name: activeMenu.animalProtein, sg: 55, lg: 80, weight: 0.44, isStaple: false },
      { name: activeMenu.plantProtein, sg: 40, lg: 60, weight: 0.1, isStaple: false },
      { name: activeMenu.vegetable, sg: 60, lg: 90, weight: 0.12, isStaple: false },
      { name: activeMenu.fruit, sg: 80, lg: 110, weight: 0.2, isStaple: false },
    ];
    if (activeMenu.milkOrExtra && activeMenu.milkOrExtra.trim() !== '-') {
      candidates.push({ name: activeMenu.milkOrExtra, sg: 125, lg: 125, weight: 0.18, isStaple: false });
    }
    return candidates
      .filter(c => Boolean(c.name && c.name.trim()))
      .map(c => ({
        name: c.name!.trim(),
        smallGrams: c.sg,
        largeGrams: c.lg,
        costSmall: Math.round(baseCost * c.weight * (c.isStaple ? 0.65 : 0.92)),
        costLarge: Math.round(baseCost * c.weight),
        isStaple: c.isStaple,
      }));
  }, [
    activeIngredients,
    activeMenu,
    rabItems,
    masterBahan,
    masterUnits,
    displayedSmallPortions,
    displayedLargePortions,
  ]);

  // Compute exact nutrition for Porsi Kecil & Porsi Besar from PLOG ingredients
  const nutritionTotals = useMemo(() => {
    if (activeIngredients.length > 0) {
      return activeIngredients.reduce(
        (acc, ing) => {
          const wS = Number(ing.netWeightSmall) || 0;
          const wL = Number(ing.netWeightLarge) || 0;
          return {
            small: {
              energi: acc.small.energi + (wS / 100) * (Number(ing.calories100g) || 0),
              protein: acc.small.protein + (wS / 100) * (Number(ing.protein100g) || 0),
              lemak: acc.small.lemak + (wS / 100) * (Number(ing.fat100g) || 0),
              karbohidrat: acc.small.karbohidrat + (wS / 100) * (Number(ing.carb100g) || 0),
              serat: acc.small.serat + (wS / 100) * (Number(ing.fiber100g) || 0),
            },
            large: {
              energi: acc.large.energi + (wL / 100) * (Number(ing.calories100g) || 0),
              protein: acc.large.protein + (wL / 100) * (Number(ing.protein100g) || 0),
              lemak: acc.large.lemak + (wL / 100) * (Number(ing.fat100g) || 0),
              karbohidrat: acc.large.karbohidrat + (wL / 100) * (Number(ing.carb100g) || 0),
              serat: acc.large.serat + (wL / 100) * (Number(ing.fiber100g) || 0),
            },
          };
        },
        {
          small: { energi: 0, protein: 0, lemak: 0, karbohidrat: 0, serat: 0 },
          large: { energi: 0, protein: 0, lemak: 0, karbohidrat: 0, serat: 0 },
        }
      );
    }
    const ratio =
      activeMenu.caloriesSmall > 0 && activeMenu.caloriesLarge > 0
        ? activeMenu.caloriesLarge / activeMenu.caloriesSmall
        : 1.25;
    return {
      small: {
        energi: activeMenu.caloriesSmall || 0,
        protein: activeMenu.proteinGrams || 0,
        lemak: activeMenu.fatGrams || 0,
        karbohidrat: activeMenu.carbGrams || 0,
        serat: activeMenu.fiberGrams || 0,
      },
      large: {
        energi: activeMenu.caloriesLarge || 0,
        protein: (activeMenu.proteinGrams || 0) * ratio,
        lemak: (activeMenu.fatGrams || 0) * ratio,
        karbohidrat: (activeMenu.carbGrams || 0) * ratio,
        serat: (activeMenu.fiberGrams || 0) * ratio,
      },
    };
  }, [activeIngredients, activeMenu]);

  const [selectedPortioningId, setSelectedPortioningId] = useState<string>('AUTO');

  const getPortioningPhotos = (rec?: PortioningInspectionRecord) => {
    const small =
      rec?.smallPortionPhoto ||
      rec?.foodTemps?.rice?.smallPortionSession1PhotoUrl ||
      rec?.foodTemps?.rice?.smallPortionSession2PhotoUrl ||
      rec?.foodTemps?.rice?.smallPortionSession3PhotoUrl ||
      '';
    const large =
      rec?.largePortionPhoto ||
      rec?.foodTemps?.rice?.photoUrl ||
      rec?.foodTemps?.animalProtein?.photoUrl ||
      '';
    return { small, large };
  };

  const autoMatchedPortioning: PortioningInspectionRecord | undefined = useMemo(() => {
    if (portioningRecords.length === 0) return undefined;
    const byMenuWithPhoto = portioningRecords.find(p => {
      const photos = getPortioningPhotos(p);
      return p.menuId === activeMenu.id && (Boolean(photos.small) || Boolean(photos.large));
    });
    if (byMenuWithPhoto) return byMenuWithPhoto;

    const byDateWithPhoto = portioningRecords.find(p => {
      const photos = getPortioningPhotos(p);
      return p.date === activeMenu.date && (Boolean(photos.small) || Boolean(photos.large));
    });
    if (byDateWithPhoto) return byDateWithPhoto;

    return (
      portioningRecords.find(p => p.menuId === activeMenu.id) ||
      portioningRecords.find(p => p.date === activeMenu.date) ||
      portioningRecords.find(p => {
        const photos = getPortioningPhotos(p);
        return Boolean(photos.small) || Boolean(photos.large);
      }) ||
      portioningRecords[0]
    );
  }, [portioningRecords, activeMenu.id, activeMenu.date]);

  const activePortioning: PortioningInspectionRecord | undefined = useMemo(() => {
    if (selectedPortioningId !== 'AUTO') {
      const picked = portioningRecords.find(p => p.id === selectedPortioningId);
      if (picked) return picked;
    }
    return autoMatchedPortioning;
  }, [selectedPortioningId, portioningRecords, autoMatchedPortioning]);

  const portioningPhotos = useMemo(() => getPortioningPhotos(activePortioning), [activePortioning]);

  const defaultSmallPortionPhoto = portioningPhotos.small || '';
  const defaultLargePortionPhoto = portioningPhotos.large || '';

  const [smallPhotoUrl, setSmallPhotoUrl] = useState<string>(defaultSmallPortionPhoto);
  const [largePhotoUrl, setLargePhotoUrl] = useState<string>(defaultLargePortionPhoto);
  const [smallPhotoSource, setSmallPhotoSource] = useState<'portioning' | 'custom'>('portioning');
  const [largePhotoSource, setLargePhotoSource] = useState<'portioning' | 'custom'>('portioning');
  const [smallPhotoError, setSmallPhotoError] = useState<boolean>(false);
  const [largePhotoError, setLargePhotoError] = useState<boolean>(false);

  // Automatic Background Removal Feature
  const [autoRemoveBg, setAutoRemoveBg] = useState<boolean>(true);
  const [removeBgSmall, setRemoveBgSmall] = useState<boolean>(true);
  const [removeBgLarge, setRemoveBgLarge] = useState<boolean>(true);
  const [cutoutSmallUrl, setCutoutSmallUrl] = useState<string | null>(null);
  const [cutoutLargeUrl, setCutoutLargeUrl] = useState<string | null>(null);
  const [isProcessingCutoutSmall, setIsProcessingCutoutSmall] = useState<boolean>(false);
  const [isProcessingCutoutLarge, setIsProcessingCutoutLarge] = useState<boolean>(false);
  const [cutoutTolerance, setCutoutTolerance] = useState<number>(38);

  const processSmallPhotoCutout = async (url: string, tolerance = cutoutTolerance) => {
    if (!url) {
      setCutoutSmallUrl(null);
      return;
    }
    setIsProcessingCutoutSmall(true);
    try {
      const cutout = await removeOmprengBackground(url, { tolerance, feather: 18 });
      setCutoutSmallUrl(cutout);
    } catch (err) {
      console.error('Failed to process cutout for small photo:', err);
    } finally {
      setIsProcessingCutoutSmall(false);
    }
  };

  const processLargePhotoCutout = async (url: string, tolerance = cutoutTolerance) => {
    if (!url) {
      setCutoutLargeUrl(null);
      return;
    }
    setIsProcessingCutoutLarge(true);
    try {
      const cutout = await removeOmprengBackground(url, { tolerance, feather: 18 });
      setCutoutLargeUrl(cutout);
    } catch (err) {
      console.error('Failed to process cutout for large photo:', err);
    } finally {
      setIsProcessingCutoutLarge(false);
    }
  };

  useEffect(() => {
    setSmallPhotoSource('portioning');
    setLargePhotoSource('portioning');
    setSmallPhotoUrl(defaultSmallPortionPhoto);
    setLargePhotoUrl(defaultLargePortionPhoto);
    setSmallPhotoError(false);
    setLargePhotoError(false);
  }, [selectedMenuId, selectedPortioningId]);

  useEffect(() => {
    if (portioningPhotos.small) {
      setSmallPhotoSource('portioning');
      setSmallPhotoUrl(portioningPhotos.small);
      setSmallPhotoError(false);
    } else if (smallPhotoSource === 'portioning') {
      setSmallPhotoUrl(defaultSmallPortionPhoto);
    }
  }, [portioningPhotos.small, defaultSmallPortionPhoto]);

  useEffect(() => {
    if (portioningPhotos.large) {
      setLargePhotoSource('portioning');
      setLargePhotoUrl(portioningPhotos.large);
      setLargePhotoError(false);
    } else if (largePhotoSource === 'portioning') {
      setLargePhotoUrl(defaultLargePortionPhoto);
    }
  }, [portioningPhotos.large, defaultLargePortionPhoto]);

  useEffect(() => {
    if (autoRemoveBg && smallPhotoUrl) {
      processSmallPhotoCutout(smallPhotoUrl, cutoutTolerance);
    } else if (!autoRemoveBg) {
      setCutoutSmallUrl(null);
    }
  }, [smallPhotoUrl, autoRemoveBg]);

  useEffect(() => {
    if (autoRemoveBg && largePhotoUrl) {
      processLargePhotoCutout(largePhotoUrl, cutoutTolerance);
    } else if (!autoRemoveBg) {
      setCutoutLargeUrl(null);
    }
  }, [largePhotoUrl, autoRemoveBg]);

  const displayedSmallPhoto =
    autoRemoveBg && removeBgSmall && cutoutSmallUrl ? cutoutSmallUrl : smallPhotoUrl;
  const displayedLargePhoto =
    autoRemoveBg && removeBgLarge && cutoutLargeUrl ? cutoutLargeUrl : largePhotoUrl;
  const isSmallCutoutActive = autoRemoveBg && removeBgSmall && Boolean(cutoutSmallUrl);
  const isLargeCutoutActive = autoRemoveBg && removeBgLarge && Boolean(cutoutLargeUrl);

  const handleUploadSmallPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const resultUrl = reader.result as string;
        setSmallPhotoSource('custom');
        setSmallPhotoUrl(resultUrl);
        setSmallPhotoError(false);
        if (autoRemoveBg) {
          processSmallPhotoCutout(resultUrl, cutoutTolerance);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadLargePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const resultUrl = reader.result as string;
        setLargePhotoSource('custom');
        setLargePhotoUrl(resultUrl);
        setLargePhotoError(false);
        if (autoRemoveBg) {
          processLargePhotoCutout(resultUrl, cutoutTolerance);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResetPhotos = () => {
    setSmallPhotoSource('portioning');
    setLargePhotoSource('portioning');
    setSmallPhotoUrl(defaultSmallPortionPhoto);
    setLargePhotoUrl(defaultLargePortionPhoto);
    setSmallPhotoError(false);
    setLargePhotoError(false);
    if (autoRemoveBg) {
      processSmallPhotoCutout(defaultSmallPortionPhoto, cutoutTolerance);
      processLargePhotoCutout(defaultLargePortionPhoto, cutoutTolerance);
    }
  };

  const handleDownloadPNG = async () => {
    if (!flyerRef.current) return;
    try {
      setIsDownloading(true);
      const dataUrl = await toPng(flyerRef.current, {
        quality: 0.98,
        pixelRatio: 2.5,
        cacheBust: true,
        skipFonts: true,
      });

      const filename = `Flyer-Menu-MBG-${activeMenu.menuCode}-${activeMenu.date}-${size}.png`;
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Gagal mengekspor flyer ke PNG:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    triggerPrint({
      targetSelector: '.flyer-print-target',
      fileName: `Flyer_Menu_${activeMenu.menuCode}_${activeMenu.date}`,
      title: `Flyer Menu MBG ${activeMenu.menuCode}`,
    });
  };

  const handleCopyCaption = () => {
    const smallLines = dishRows
      .map(d => {
        const gramPart =
          grammageMode === 'all' || (grammageMode === 'staple_only' && d.isStaple)
            ? ` (${Math.round(d.smallGrams)}gr)`
            : '';
        const pricePart = showItemPrices ? ` ${formatFlyerRupiah(d.costSmall)}` : '';
        return `• ${d.name}${gramPart}${pricePart}`;
      })
      .join('\n');

    const largeLines = dishRows
      .map(d => {
        const gramPart =
          grammageMode === 'all' || (grammageMode === 'staple_only' && d.isStaple)
            ? ` (${Math.round(d.largeGrams)}gr)`
            : '';
        const pricePart = showItemPrices ? ` ${formatFlyerRupiah(d.costLarge)}` : '';
        return `• ${d.name}${gramPart}${pricePart}`;
      })
      .join('\n');

    const caption = `🍽️ *${sppgConfig.sppgName}*
📅 *${formatSingleDayDate(activeMenu.date, activeMenu.dayName)}*

🥣 *Porsi Kecil (${displayedSmallPortions} porsi):*
${smallLines}
📊 Gizi: Energi ${formatFlyerDecimal(nutritionTotals.small.energi)} kkal | Protein ${formatFlyerDecimal(nutritionTotals.small.protein)} g | Lemak ${formatFlyerDecimal(nutritionTotals.small.lemak)} g | Karbohidrat ${formatFlyerDecimal(nutritionTotals.small.karbohidrat)} g | Serat ${formatFlyerDecimal(nutritionTotals.small.serat)} g

🍱 *Porsi Besar (${displayedLargePortions} porsi):*
${largeLines}
📊 Gizi: Energi ${formatFlyerDecimal(nutritionTotals.large.energi)} kkal | Protein ${formatFlyerDecimal(nutritionTotals.large.protein)} g | Lemak ${formatFlyerDecimal(nutritionTotals.large.lemak)} g | Karbohidrat ${formatFlyerDecimal(nutritionTotals.large.karbohidrat)} g | Serat ${formatFlyerDecimal(nutritionTotals.large.serat)} g

⚠️ Batas konsumsi maksimal porsi kecil ${smallConsumptionDeadline} & porsi besar ${largeConsumptionDeadline}`;

    navigator.clipboard.writeText(caption);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 3000);
  };

  const containerDimensions: Record<FlyerSizeId, string> = {
    a4: 'w-[794px] min-h-[1000px]',
    social_square: 'w-[760px] min-h-[760px]',
    social_story: 'w-[600px] min-h-[1066px]',
  };

  const activeTheme = FLYER_THEMES[template];
  const [headerLogoError, setHeaderLogoError] = useState(false);

  const formatDishBulletLabel = (row: FlyerDishRow, portion: 'small' | 'large') => {
    const grams = portion === 'small' ? row.smallGrams : row.largeGrams;
    const cost = portion === 'small' ? row.costSmall : row.costLarge;
    const showGrams =
      grammageMode === 'all' || (grammageMode === 'staple_only' && row.isStaple);
    const gramText = showGrams && grams > 0 ? ` (${Math.round(grams)}gr)` : '';
    const priceText = showItemPrices ? ` ${formatFlyerRupiah(cost)}` : '';
    return `${row.name}${gramText}${priceText}`;
  };

  const sppgHeadlineLines = useMemo(() => {
    const raw = (sppgConfig.sppgName || 'SPPG PROBOLINGGO KREJENGAN TEMENGGUNGAN 2').toUpperCase().trim();
    const parts = raw.split(/\s+/);
    if (parts.length >= 4 && parts[0] === 'SPPG') {
      return [
        `${parts[0]} ${parts[1]}`,
        parts[2],
        parts.slice(3).join(' '),
      ];
    }
    return [raw];
  }, [sppgConfig.sppgName]);

  const renderTrayFallback = (label: string) => (
    <div className="w-full h-44 rounded-xl border border-dashed border-slate-300 bg-white/80 flex flex-col items-center justify-center text-slate-400 gap-2 p-4">
      <Utensils className="w-8 h-8 opacity-60" />
      <span className="text-xs font-semibold text-center text-slate-500">
        Foto Ompreng {label} belum tersedia
      </span>
    </div>
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* TOP ACTION BAR */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Publikasi Resmi SPPG · Integrasi PLOG &amp; Divisi Pemorsian
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
            Pembuat Flyer Menu Harian MBG Otomatis
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Menampilkan foto porsi kecil &amp; besar, daftar menu beserta harga/gramasi, kandungan gizi aktual, standar AKG, jumlah porsi, dan batas konsumsi.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <button
            type="button"
            onClick={handleCopyCaption}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition whitespace-nowrap shrink-0"
          >
            {copySuccess ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            {copySuccess ? 'Tersalin!' : 'Salin Caption WA'}
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-900 text-white transition whitespace-nowrap shrink-0"
          >
            <Printer className="w-4 h-4" /> Cetak / PDF
          </button>

          <button
            type="button"
            onClick={handleDownloadPNG}
            disabled={isDownloading}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-[#163653] hover:bg-[#1e466b] text-white transition disabled:opacity-60 whitespace-nowrap shrink-0"
          >
            {isDownloading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {isDownloading ? 'Memproses...' : 'Download PNG'}
          </button>
        </div>
      </div>

      {/* TWO-COLUMN WORKSPACE: CONTROLS (LEFT) & LIVE PREVIEW (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: CONTROLS */}
        <div className="lg:col-span-4 space-y-4 print:hidden">
          {/* 1. Menu Selection from PLOG */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3 transition-all duration-200 ease-out hover:shadow-md">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <Calendar className="w-4 h-4 text-blue-900 dark:text-sky-400" />
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                1. Sumber Data Menu PLOG
              </h3>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Pilih Menu &amp; Tanggal
              </label>
              <select
                value={selectedMenuId}
                onChange={e => setSelectedMenuId(e.target.value)}
                className="w-full text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 text-slate-900 dark:text-white"
              >
                {menuItems.map(m => (
                  <option key={m.id} value={m.id}>
                    {formatSingleDayDate(m.date, m.dayName)} — {m.animalProtein.slice(0, 32)}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center justify-between pt-1">
              <span className="font-mono">{activeMenu.menuCode}</span>
              <span>{dishRows.length} item hidangan terdeteksi</span>
            </div>
          </div>

          {/* 2. Foto Porsi Kecil & Besar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3 transition-all duration-200 ease-out hover:shadow-md">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  2. Foto Ompreng Porsi
                </h3>
              </div>
              <button
                type="button"
                onClick={handleResetPhotos}
                className="text-[11px] text-blue-800 dark:text-sky-400 hover:underline flex items-center gap-1 font-semibold whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3 h-3" /> Sinkron Pemorsian
              </button>
            </div>

            <select
              value={selectedPortioningId}
              onChange={e => setSelectedPortioningId(e.target.value)}
              className="w-full text-[11px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-slate-800 dark:text-slate-200"
            >
              <option value="AUTO">Otomatis (Sesuai Menu / Log Terbaru Pemorsian)</option>
              {portioningRecords.map(p => (
                <option key={p.id} value={p.id}>
                  {p.date} ({p.time}) · Kecil {p.smallPortionWeightGrams}g / Besar {p.largePortionWeightGrams}g
                </option>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Small photo upload */}
              <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                  Foto Porsi Kecil
                </div>
                {smallPhotoUrl ? (
                  <img
                    src={smallPhotoUrl}
                    alt="Preview Porsi Kecil"
                    className="w-full aspect-[4/3] rounded-lg object-cover border border-slate-200 dark:border-slate-700"
                  />
                ) : (
                  <div className="w-full aspect-[4/3] rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] text-slate-400">
                    Belum ada foto
                  </div>
                )}
                <label className="w-full inline-flex items-center justify-center gap-1 px-2 py-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-[11px] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer transition-colors">
                  <Upload className="w-3 h-3" />
                  <span>Ganti Foto</span>
                  <input type="file" accept="image/*" onChange={handleUploadSmallPhoto} className="hidden" />
                </label>
              </div>

              {/* Large photo upload */}
              <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                  Foto Porsi Besar
                </div>
                {largePhotoUrl ? (
                  <img
                    src={largePhotoUrl}
                    alt="Preview Porsi Besar"
                    className="w-full aspect-[4/3] rounded-lg object-cover border border-slate-200 dark:border-slate-700"
                  />
                ) : (
                  <div className="w-full aspect-[4/3] rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] text-slate-400">
                    Belum ada foto
                  </div>
                )}
                <label className="w-full inline-flex items-center justify-center gap-1 px-2 py-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-[11px] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
                  <Upload className="w-3 h-3" />
                  <span>Ganti Foto</span>
                  <input type="file" accept="image/*" onChange={handleUploadLargePhoto} className="hidden" />
                </label>
              </div>
            </div>

            {/* Auto Cutout Background */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  Hapus Background Foto Otomatis
                </span>
                <input
                  type="checkbox"
                  checked={autoRemoveBg}
                  onChange={e => setAutoRemoveBg(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-600"
                />
              </div>

              {autoRemoveBg && (
                <div className="space-y-2 text-[11px]">
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={removeBgSmall}
                        onChange={e => setRemoveBgSmall(e.target.checked)}
                        className="rounded"
                      />
                      <span>Cutout Kecil {isProcessingCutoutSmall ? '(proses...)' : ''}</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={removeBgLarge}
                        onChange={e => setRemoveBgLarge(e.target.checked)}
                        className="rounded"
                      />
                      <span>Cutout Besar {isProcessingCutoutLarge ? '(proses...)' : ''}</span>
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 shrink-0">Toleransi: {cutoutTolerance}</span>
                    <input
                      type="range"
                      min={20}
                      max={60}
                      step={2}
                      value={cutoutTolerance}
                      onChange={e => {
                        const val = Number(e.target.value);
                        setCutoutTolerance(val);
                        processSmallPhotoCutout(smallPhotoUrl, val);
                        processLargePhotoCutout(largePhotoUrl, val);
                      }}
                      className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-emerald-600"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Layout Mode */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                Tata Letak Foto
              </label>
              <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                {[
                  { id: 'dual_both', label: 'Dua Foto' },
                  { id: 'small_only', label: 'Porsi Kecil' },
                  { id: 'large_only', label: 'Porsi Besar' },
                ].map(mode => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setPhotoLayoutMode(mode.id as any)}
                    className={`py-1.5 px-2 rounded-md border text-center transition whitespace-nowrap ${
                      photoLayoutMode === mode.id
                        ? 'border-[#163653] bg-slate-100 dark:bg-slate-800 font-bold text-[#163653] dark:text-sky-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Tema Warna & Ukuran */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3 transition-all duration-200 ease-out hover:shadow-md">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <Layers className="w-4 h-4 text-blue-900 dark:text-sky-400" />
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                3. Tema Warna &amp; Dimensi
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'modern_bgn', label: 'Resmi SPPG', desc: 'Navy & Biru Langit' },
                { id: 'nutri_infographic', label: 'Hijau Gizi', desc: 'Forest & Mint' },
                { id: 'nusantara_warm', label: 'Nusantara', desc: 'Cokelat & Krem' },
                { id: 'school_friendly', label: 'Ceria Sekolah', desc: 'Biru Cerah' },
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTemplate(t.id as FlyerTemplateId)}
                  className={`p-2 rounded-lg text-left border transition text-xs ${
                    template === t.id
                      ? 'border-[#163653] bg-sky-50/70 dark:bg-blue-950/40 text-blue-950 dark:text-sky-300 font-bold'
                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="font-bold leading-tight">{t.label}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{t.desc}</div>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1">
              {[
                { id: 'a4', label: 'A4 Cetak' },
                { id: 'social_square', label: 'Feed 1:1' },
                { id: 'social_story', label: 'Story 9:16' },
              ].map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSize(s.id as FlyerSizeId)}
                  className={`py-1.5 px-2 rounded-lg text-center border transition text-xs ${
                    size === s.id
                      ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 font-bold'
                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Jumlah Porsi, AKG, Harga & Batas Konsumsi */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3 transition-all duration-200 ease-out hover:shadow-md">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <Clock className="w-4 h-4 text-rose-500" />
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                4. Detail Porsi, AKG &amp; Batas Konsumsi
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Batas Porsi Kecil
                </label>
                <ClassicTimeInput
                  value={smallConsumptionDeadline}
                  onChange={setSmallConsumptionDeadline}
                  format="HH.mm WIB"
                  className="w-full text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Batas Porsi Besar
                </label>
                <ClassicTimeInput
                  value={largeConsumptionDeadline}
                  onChange={setLargeConsumptionDeadline}
                  format="HH.mm WIB"
                  className="w-full text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Portion Counts */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-blue-900 dark:text-sky-400" /> Jumlah Porsi Harian
                </span>
                {(customSmallCount !== '' || customLargeCount !== '') && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomSmallCount('');
                      setCustomLargeCount('');
                    }}
                    className="text-[10px] font-semibold text-blue-700 dark:text-sky-400 hover:underline"
                  >
                    Sinkron Lembaga
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">Porsi Kecil</label>
                  <input
                    type="number"
                    min={0}
                    placeholder={String(institutionTotals.small)}
                    value={customSmallCount}
                    onChange={e => setCustomSmallCount(e.target.value)}
                    className="w-full text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">Porsi Besar</label>
                  <input
                    type="number"
                    min={0}
                    placeholder={String(institutionTotals.large)}
                    value={customLargeCount}
                    onChange={e => setCustomLargeCount(e.target.value)}
                    className="w-full text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Grammage & AKG Preset */}
            <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Tampilan Gramasi
                </label>
                <select
                  value={grammageMode}
                  onChange={e => setGrammageMode(e.target.value as any)}
                  className="w-full text-[11px] rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-1.5 text-slate-800 dark:text-slate-200"
                >
                  <option value="staple_only">Makanan Pokok Saja</option>
                  <option value="all">Semua Item Menu</option>
                  <option value="none">Sembunyikan</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Acuan Standar AKG
                </label>
                <select
                  value={akgPresetMode}
                  onChange={e => {
                    const next = e.target.value as 'flyer_bgn' | 'plog_target';
                    setAkgPresetMode(next);
                    setAkgValues(next === 'flyer_bgn' ? FLYER_BGN_AKG_PRESET : PLOG_AKG_PRESET);
                  }}
                  className="w-full text-[11px] rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-1.5 text-slate-800 dark:text-slate-200"
                >
                  <option value="flyer_bgn">Standar Flyer BGN</option>
                  <option value="plog_target">Standar Target PLOG</option>
                </select>
              </div>
            </div>

            {/* Visibility checkboxes */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={showCertBadges}
                  onChange={e => setShowCertBadges(e.target.checked)}
                  className="rounded"
                />
                <span>Tampilkan Lencana BNSP, SLHS &amp; Halal</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={showItemPrices}
                  onChange={e => setShowItemPrices(e.target.checked)}
                  className="rounded"
                />
                <span>Tampilkan Harga per Item Menu (Rp.)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={showNutritionFacts}
                  onChange={e => setShowNutritionFacts(e.target.checked)}
                  className="rounded"
                />
                <span>Tampilkan Kandungan Gizi &amp; Standar AKG</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={showPortionCounts}
                  onChange={e => setShowPortionCounts(e.target.checked)}
                  className="rounded"
                />
                <span>Tampilkan Total Jumlah Porsi</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={showConsumptionDeadline}
                  onChange={e => setShowConsumptionDeadline(e.target.checked)}
                  className="rounded"
                />
                <span>Tampilkan Batas Konsumsi Maksimal</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={showOfficials}
                  onChange={e => setShowOfficials(e.target.checked)}
                  className="rounded"
                />
                <span>Tampilkan Pengesahan Kepala SPPG &amp; Ahli Gizi</span>
              </label>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE FLYER PREVIEW CANVAS */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between bg-white dark:bg-slate-900 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 print:hidden text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300">
              <Eye className="w-4 h-4 text-blue-900 dark:text-sky-400" />
              <span>
                Preview Flyer ({size === 'a4' ? 'A4 Cetak' : size === 'social_square' ? 'Feed 1:1' : 'Story 9:16'})
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-500 mr-1">Skala:</span>
              {[0.65, 0.85, 1.0].map(scale => (
                <button
                  key={scale}
                  type="button"
                  onClick={() => setZoomScale(scale)}
                  className={`px-2.5 py-1 rounded text-xs transition ${
                    zoomScale === scale
                      ? 'bg-[#163653] text-white font-bold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {Math.round(scale * 100)}%
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto p-4 sm:p-6 bg-slate-200/80 dark:bg-slate-950 rounded-2xl flex justify-center items-start print:p-0 print:bg-white print:overflow-visible">
            <div
              style={{
                transform: `scale(${zoomScale})`,
                transformOrigin: 'top center',
                transition: 'transform 0.2s ease',
              }}
              className="shrink-0 flyer-print-scale-wrapper"
            >
              {/* =================================================================== */}
              {/* FLYER CANVAS (EXACT REFERENCE TEMPLATE ARCHITECTURE) */}
              {/* =================================================================== */}
              <div
                ref={flyerRef}
                style={{
                  backgroundColor: activeTheme.canvasBg,
                  backgroundImage: `radial-gradient(${activeTheme.dotPatternColor} 1px, transparent 1px)`,
                  backgroundSize: '14px 14px',
                  color: activeTheme.textPrimary,
                }}
                className={`flyer-print-target shadow-2xl overflow-hidden relative font-sans flex flex-col justify-between ${containerDimensions[size]} ${
                  size === 'social_story' ? 'px-6 py-6 gap-4' : 'px-9 py-7 gap-5'
                }`}
              >
                {/* 1. TOP HEADER ROW: SPPG EMBLEM + TITLE (LEFT) & CERT CAPSULE (RIGHT) */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {!headerLogoError ? (
                      <img
                        src="/logo-sppg.png"
                        alt="Logo Badan Gizi Nasional SPPG"
                        onError={() => setHeaderLogoError(true)}
                        className="w-14 h-14 object-contain shrink-0 rounded-full"
                      />
                    ) : (
                      <div
                        style={{ borderColor: activeTheme.primaryNavy, color: activeTheme.primaryNavy }}
                        className="w-14 h-14 rounded-full border-2 bg-white flex items-center justify-center font-black text-xs shrink-0"
                      >
                        BGN
                      </div>
                    )}
                    <div
                      style={{ color: activeTheme.headingColor }}
                      className="font-extrabold text-[11px] leading-[1.2] tracking-wide uppercase"
                    >
                      {sppgHeadlineLines.map((line, i) => (
                        <div key={i}>{line}</div>
                      ))}
                    </div>
                  </div>

                  {showCertBadges && <CertificationCapsule bgColor={activeTheme.softCapsuleBg} />}
                </div>

                {/* 2. DATE PILL BANNER */}
                <div
                  style={{ backgroundColor: activeTheme.primaryNavy }}
                  className="w-full rounded-2xl py-2.5 px-6 text-center text-white font-bold text-xl tracking-wide"
                >
                  {formatSingleDayDate(activeMenu.date, activeMenu.dayName)}
                </div>

                {/* 3. FOOD PHOTO & BULLET LIST SHOWCASE (PORSI KECIL & PORSI BESAR) */}
                <div
                  className={
                    photoLayoutMode === 'dual_both'
                      ? 'grid grid-cols-2 gap-6 items-start'
                      : 'grid grid-cols-1 max-w-md mx-auto w-full'
                  }
                >
                  {(photoLayoutMode === 'dual_both' || photoLayoutMode === 'small_only') && (
                    <div className="flex flex-col items-center">
                      <div
                        style={{ backgroundColor: activeTheme.primaryNavy }}
                        className="rounded-full px-8 py-1.5 text-white font-bold text-base tracking-wide mb-3.5"
                      >
                        Porsi Kecil
                      </div>

                      <div className="w-full flex items-center justify-center mb-3.5 min-h-[185px]">
                        {displayedSmallPhoto && !smallPhotoError ? (
                          <img
                            src={displayedSmallPhoto}
                            alt="Ompreng Porsi Kecil"
                            onError={() => setSmallPhotoError(true)}
                            className={`w-full max-h-[210px] transition duration-300 ${
                              isSmallCutoutActive
                                ? 'object-contain drop-shadow-[0_10px_18px_rgba(15,23,42,0.18)]'
                                : 'object-cover rounded-2xl shadow-sm border border-slate-200/80 bg-white'
                            }`}
                          />
                        ) : (
                          renderTrayFallback('Porsi Kecil')
                        )}
                      </div>

                      <ul className="w-full space-y-1 pl-5 text-left text-[13.5px] font-bold leading-snug text-slate-900 list-disc marker:text-slate-900 tabular-nums">
                        {dishRows.map((row, idx) => (
                          <li key={`small-${idx}`}>{formatDishBulletLabel(row, 'small')}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {(photoLayoutMode === 'dual_both' || photoLayoutMode === 'large_only') && (
                    <div className="flex flex-col items-center">
                      <div
                        style={{ backgroundColor: activeTheme.primaryNavy }}
                        className="rounded-full px-8 py-1.5 text-white font-bold text-base tracking-wide mb-3.5"
                      >
                        Porsi Besar
                      </div>

                      <div className="w-full flex items-center justify-center mb-3.5 min-h-[185px]">
                        {displayedLargePhoto && !largePhotoError ? (
                          <img
                            src={displayedLargePhoto}
                            alt="Ompreng Porsi Besar"
                            onError={() => setLargePhotoError(true)}
                            className={`w-full max-h-[210px] transition duration-300 ${
                              isLargeCutoutActive
                                ? 'object-contain drop-shadow-[0_10px_18px_rgba(15,23,42,0.18)]'
                                : 'object-cover rounded-2xl shadow-sm border border-slate-200/80 bg-white'
                            }`}
                          />
                        ) : (
                          renderTrayFallback('Porsi Besar')
                        )}
                      </div>

                      <ul className="w-full space-y-1 pl-5 text-left text-[13.5px] font-bold leading-snug text-slate-900 list-disc marker:text-slate-900 tabular-nums">
                        {dishRows.map((row, idx) => (
                          <li key={`large-${idx}`}>{formatDishBulletLabel(row, 'large')}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* 4. KANDUNGAN GIZI, JUMLAH PORSI & STANDAR GIZI AKG */}
                {(showNutritionFacts || showPortionCounts) && (
                  <div
                    className={`grid gap-5 items-stretch ${
                      size === 'social_story' ? 'grid-cols-1' : 'grid-cols-12'
                    }`}
                  >
                    {/* LEFT: KANDUNGAN GIZI + TOTAL PORSI */}
                    <div
                      className={`${
                        size === 'social_story' ? '' : showNutritionFacts ? 'col-span-8' : 'col-span-12'
                      } flex flex-col justify-between gap-4`}
                    >
                      {showNutritionFacts && (
                        <div>
                          <h3
                            style={{ color: activeTheme.headingColor }}
                            className="text-center font-black text-[23px] tracking-wide uppercase mb-5"
                          >
                            KANDUNGAN GIZI
                          </h3>

                          <div className="grid grid-cols-2 gap-4">
                            {/* Card Porsi Kecil */}
                            <div
                              style={{
                                backgroundColor: activeTheme.cardFillBg,
                                borderColor: activeTheme.cardBorder,
                              }}
                              className="relative rounded-[28px] border-[2.5px] pt-7 pb-5 px-4"
                            >
                              <div
                                style={{ backgroundColor: activeTheme.primaryNavy }}
                                className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full px-6 py-1 text-white font-bold text-sm whitespace-nowrap"
                              >
                                Porsi Kecil
                              </div>
                              <div className="space-y-1 text-[13.5px] font-bold text-slate-950 leading-relaxed tabular-nums">
                                <div>Energi : {formatFlyerDecimal(nutritionTotals.small.energi)} kkal</div>
                                <div>Protein : {formatFlyerDecimal(nutritionTotals.small.protein)} g</div>
                                <div>Lemak : {formatFlyerDecimal(nutritionTotals.small.lemak)} g</div>
                                <div>Karbohidrat : {formatFlyerDecimal(nutritionTotals.small.karbohidrat)} g</div>
                                <div>Serat : {formatFlyerDecimal(nutritionTotals.small.serat)} g</div>
                              </div>
                            </div>

                            {/* Card Porsi Besar */}
                            <div
                              style={{
                                backgroundColor: activeTheme.cardFillBg,
                                borderColor: activeTheme.cardBorder,
                              }}
                              className="relative rounded-[28px] border-[2.5px] pt-7 pb-5 px-4"
                            >
                              <div
                                style={{ backgroundColor: activeTheme.primaryNavy }}
                                className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full px-6 py-1 text-white font-bold text-sm whitespace-nowrap"
                              >
                                Porsi Besar
                              </div>
                              <div className="space-y-1 text-[13.5px] font-bold text-slate-950 leading-relaxed tabular-nums">
                                <div>Energi : {formatFlyerDecimal(nutritionTotals.large.energi)} kkal</div>
                                <div>Protein : {formatFlyerDecimal(nutritionTotals.large.protein)} g</div>
                                <div>Lemak : {formatFlyerDecimal(nutritionTotals.large.lemak)} g</div>
                                <div>Karbohidrat : {formatFlyerDecimal(nutritionTotals.large.karbohidrat)} g</div>
                                <div>Serat : {formatFlyerDecimal(nutritionTotals.large.serat)} g</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {showPortionCounts && (
                        <div
                          style={{ backgroundColor: activeTheme.primaryNavy }}
                          className="rounded-2xl px-5 py-3 text-white font-bold text-[15px] leading-snug tabular-nums"
                        >
                          <div>Porsi Kecil : {displayedSmallPortions} porsi</div>
                          <div>Porsi Besar : {displayedLargePortions} porsi</div>
                        </div>
                      )}
                    </div>

                    {/* RIGHT: STANDAR GIZI AKG */}
                    {showNutritionFacts && (
                      <div className={size === 'social_story' ? '' : 'col-span-4'}>
                        <div
                          style={{
                            backgroundColor: activeTheme.cardFillBg,
                            borderColor: activeTheme.cardBorder,
                          }}
                          className="h-full rounded-[28px] border-[2.5px] overflow-hidden flex flex-col"
                        >
                          <div
                            style={{ backgroundColor: activeTheme.primaryNavy }}
                            className="py-2.5 px-3 text-center text-white font-bold text-base tracking-wide"
                          >
                            Standar Gizi AKG
                          </div>

                          <div className="p-4 flex-1 flex flex-col justify-center space-y-4 text-[12.5px] font-bold text-slate-950 leading-snug tabular-nums">
                            <div>
                              <div className="text-[13.5px] font-extrabold mb-1">Porsi kecil</div>
                              <div>Energi : {akgValues.small.energi}</div>
                              <div>Protein : {akgValues.small.protein}</div>
                              <div>Lemak : {akgValues.small.lemak}</div>
                              <div>Karbohidrat : {akgValues.small.karbohidrat}</div>
                              <div>Serat : {akgValues.small.serat}</div>
                            </div>

                            <div>
                              <div className="text-[13.5px] font-extrabold mb-1">Porsi besar</div>
                              <div>Energi : {akgValues.large.energi}</div>
                              <div>Protein : {akgValues.large.protein}</div>
                              <div>Lemak : {akgValues.large.lemak}</div>
                              <div>Karbohidrat : {akgValues.large.karbohidrat}</div>
                              <div>Serat : {akgValues.large.serat}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 5. FOOTER WARNING CAPSULE */}
                {showConsumptionDeadline && (
                  <div
                    style={{ backgroundColor: activeTheme.softCapsuleBg }}
                    className="w-full rounded-full px-5 py-2.5 flex items-center justify-center gap-3"
                  >
                    <WarningTriangleIcon />
                    <span className="text-[13.5px] font-extrabold text-slate-900 leading-tight">
                      Batas konsumsi maksimal porsi kecil {smallConsumptionDeadline} &amp; porsi besar{' '}
                      {largeConsumptionDeadline}
                    </span>
                  </div>
                )}

                {/* Optional Official Sign-off Strip */}
                {showOfficials && (
                  <div className="pt-2 border-t border-slate-300/70 flex items-center justify-between text-[10.5px] text-slate-700">
                    <div>
                      <span className="text-slate-500">Pengawas Gizi: </span>
                      <strong className="text-slate-900">{sppgConfig.nutritionOfficer}</strong>
                    </div>
                    <div className="font-mono text-slate-500">ID SPPG: {sppgConfig.sppgId}</div>
                    <div>
                      <span className="text-slate-500">Kepala SPPG: </span>
                      <strong className="text-slate-900">{sppgConfig.headOfSppg}</strong>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
