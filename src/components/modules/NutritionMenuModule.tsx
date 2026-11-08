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
  MenuItem,
  RecipeIngredient,
  FoodCompositionItem,
  NutritionTargetConfig,
  DivisionJobdesk,
} from '../../types';
import {
  defaultFoodCompositions,
  defaultNutritionTarget,
  sampleIngredientsMenu1,
  defaultDivisionJobdesks,
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
} from 'lucide-react';

type SubModuleTab =
  | 'menu_bahan'
  | 'kandungan_gizi'
  | 'food_cost'
  | 'jobdesk_divisi';

export const NutritionMenuModule: React.FC = () => {
  const {
    menuItems,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    approveMenuItem,
    institutions,
    currentUser,
    hasPermission,
    sppgConfig,
    addToast,
  } = useApp();

  // Active Sub-module Tab
  const [activeTab, setActiveTab] = useState<SubModuleTab>('menu_bahan');

  // Selected Active Menu for PLOG details (default: first menu)
  const [selectedMenuId, setSelectedMenuId] = useState<string>(menuItems[0]?.id || 'menu-1');

  // Menu Ingredients State per Menu
  const [menuIngredientsMap, setMenuIngredientsMap] = useState<Record<string, RecipeIngredient[]>>({
    'menu-1': sampleIngredientsMenu1,
    'menu-2': [
      {
        id: 'ing-201',
        name: 'Beras Kuning Kunyit',
        category: 'Makanan Pokok',
        netWeightSmall: 85,
        netWeightLarge: 125,
        unit: 'gram',
        ediblePortionPercent: 100,
        conversionFactorToBase: 0.001,
        purchaseUnit: 'kg',
        unitPrice: 15500,
        calories100g: 365,
        protein100g: 6.9,
        fat100g: 1.2,
        carb100g: 78.0,
        fiber100g: 1.0,
        referenceSource: 'TKPI 2020 (A01)',
      },
      {
        id: 'ing-202',
        name: 'Daging Sapi Murni Suwir',
        category: 'Lauk Hewani',
        netWeightSmall: 45,
        netWeightLarge: 70,
        unit: 'gram',
        ediblePortionPercent: 100,
        conversionFactorToBase: 0.001,
        purchaseUnit: 'kg',
        unitPrice: 125000,
        calories100g: 201,
        protein100g: 20.0,
        fat100g: 13.0,
        carb100g: 0.0,
        fiber100g: 0.0,
        referenceSource: 'TKPI 2020 (B01)',
      },
      {
        id: 'ing-203',
        name: 'Perkedel Tempe Rempah',
        category: 'Lauk Nabati',
        netWeightSmall: 40,
        netWeightLarge: 60,
        unit: 'gram',
        ediblePortionPercent: 100,
        conversionFactorToBase: 0.001,
        purchaseUnit: 'kg',
        unitPrice: 12000,
        calories100g: 193,
        protein100g: 20.8,
        fat100g: 8.8,
        carb100g: 13.5,
        fiber100g: 1.4,
        referenceSource: 'TKPI 2020 (C02)',
      },
      {
        id: 'ing-204',
        name: 'Tumis Buncis & Jagung Pipil',
        category: 'Sayuran',
        netWeightSmall: 60,
        netWeightLarge: 90,
        unit: 'gram',
        ediblePortionPercent: 90,
        conversionFactorToBase: 0.001,
        purchaseUnit: 'kg',
        unitPrice: 14000,
        calories100g: 63,
        protein100g: 2.6,
        fat100g: 0.8,
        carb100g: 14.0,
        fiber100g: 2.7,
        referenceSource: 'TKPI 2020 (D06 & D09)',
      },
      {
        id: 'ing-205',
        name: 'Semangka Merah Manis',
        category: 'Buah Segar',
        netWeightSmall: 100,
        netWeightLarge: 140,
        unit: 'gram',
        ediblePortionPercent: 54, // 54% BDD (46% kulit)
        conversionFactorToBase: 0.001,
        purchaseUnit: 'kg',
        unitPrice: 7500,
        calories100g: 30,
        protein100g: 0.6,
        fat100g: 0.2,
        carb100g: 7.6,
        fiber100g: 0.4,
        referenceSource: 'TKPI 2020 (E18)',
      },
      {
        id: 'ing-206',
        name: 'Puding Kacang Hijau Santan Encer',
        category: 'Ekstra / Susu',
        netWeightSmall: 75,
        netWeightLarge: 100,
        unit: 'pcs',
        ediblePortionPercent: 100,
        conversionFactorToBase: 1,
        purchaseUnit: 'pcs',
        unitPrice: 2800,
        calories100g: 110,
        protein100g: 4.0,
        fat100g: 2.5,
        carb100g: 18.0,
        fiber100g: 1.8,
        referenceSource: 'TKPI Kemenkes RI',
      },
    ],
  });

  // Food Composition Database
  const [foodCompositions, setFoodCompositions] = useState<FoodCompositionItem[]>(defaultFoodCompositions);

  // Nutrition Target Config (AKG)
  const [nutritionTarget, setNutritionTarget] = useState<NutritionTargetConfig>(defaultNutritionTarget);
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);

  // Division Jobdesks
  const [jobdesks, setJobdesks] = useState<DivisionJobdesk[]>(defaultDivisionJobdesks);
  const [isJobdeskModalOpen, setIsJobdeskModalOpen] = useState(false);
  const [selectedJobdesk, setSelectedJobdesk] = useState<DivisionJobdesk | null>(null);

  // Modal State for Adding Ingredient to Menu
  const [isAddIngredientModalOpen, setIsAddIngredientModalOpen] = useState(false);
  const [selectedCompositionId, setSelectedCompositionId] = useState<string>(foodCompositions[0]?.id || '');
  const [customGramSmall, setCustomGramSmall] = useState<number>(50);
  const [customGramLarge, setCustomGramLarge] = useState<number>(75);
  const [customBdd, setCustomBdd] = useState<number>(100);
  const [customUnitPrice, setCustomUnitPrice] = useState<number>(30000);

  // Modal State for Create Menu
  const [isCreateMenuModalOpen, setIsCreateMenuModalOpen] = useState(false);
  const [newMenuForm, setNewMenuForm] = useState({
    date: '2026-11-12',
    dayName: 'Kamis',
    cycleWeek: 2,
    menuCode: `MBG-TMG2-H${Math.floor(Math.random() * 80) + 25}`,
    stapleFood: '',
    animalProtein: '',
    plantProtein: '',
    vegetable: '',
    fruit: '',
    milkOrExtra: 'Susu UHT Plain 125ml',
    estimatedCostPerPortion: 13500,
    notes: '',
  });

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

  // Current Menu Ingredients List
  const currentIngredients = useMemo(() => {
    return menuIngredientsMap[selectedMenuId] || [];
  }, [menuIngredientsMap, selectedMenuId]);

  // ---------------------------------------------------------------------------
  // A. CALCULATIONS: PERENCANAAN MENU DAN BAHAN
  // ---------------------------------------------------------------------------
  // Rumus kebutuhan bahan memperhitungkan jumlah penerima berdasarkan kategori porsi dan gramasi:
  // Total Berat Bersih = (Porsi Kecil * Gram Kecil) + (Porsi Besar * Gram Besar)
  // Berat Kotor = Total Berat Bersih / (% BDD / 100)
  // Kebutuhan Pembelian = Berat Kotor * Faktor Konversi
  const ingredientsCalculated = useMemo(() => {
    return currentIngredients.map(ing => {
      const netGramsSmallTotal = quotaSmall * ing.netWeightSmall;
      const netGramsLargeTotal = quotaLarge * ing.netWeightLarge;
      const totalNetGrams = netGramsSmallTotal + netGramsLargeTotal;
      const totalNetKg = totalNetGrams / 1000;

      // Edible portion ratio (BDD)
      const bddRatio = Math.max(0.01, (ing.ediblePortionPercent || 100) / 100);

      // Berat Kotor (Gross Weight)
      const totalGrossGrams = totalNetGrams / bddRatio;
      const totalGrossKg = totalGrossGrams / 1000;

      // Kebutuhan Pembelian terkonversi sesuai satuan pembelian
      const purchaseQty = ing.purchaseUnit === 'pcs' || ing.purchaseUnit === 'ikat' || ing.purchaseUnit === 'butir'
        ? Math.ceil(totalBeneficiaries) // e.g. Susu UHT 1 pcs/penerima
        : totalGrossKg; // kg

      // Total Biaya Bahan (Food Cost Bahan)
      const totalCost = purchaseQty * ing.unitPrice;

      // Cost per portion small vs large
      const costPortionSmall = (ing.netWeightSmall / 1000 / bddRatio) * ing.unitPrice;
      const costPortionLarge = (ing.netWeightLarge / 1000 / bddRatio) * ing.unitPrice;

      // Nutrition contribution of this ingredient for small vs large portion:
      // Nilai gizi = (berat bersih (g) / 100) * kandungan per 100g
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
        totalNetGrams,
        totalNetKg,
        totalGrossGrams,
        totalGrossKg,
        purchaseQty,
        totalCost,
        costPortionSmall,
        costPortionLarge,
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
  }, [currentIngredients, quotaSmall, quotaLarge, totalBeneficiaries]);

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
  // C. CALCULATIONS: INPUT FOOD COST MENU
  // ---------------------------------------------------------------------------
  // Food cost bahan = Jumlah bahan × Harga satuan
  // Food cost per porsi = Total biaya bahan / Jumlah porsi
  const budgetCapPerPortion = sppgConfig.smallPortionBudget || 15000; // Pagu anggaran e.g. Rp 15.000
  const totalBudgetCap = totalBeneficiaries * budgetCapPerPortion;

  // Average food cost per portion
  const avgFoodCostPerPortion = totalBeneficiaries > 0 ? totalMenuProcurementCost / totalBeneficiaries : 0;

  // Cost per specific portion category
  const costPerPortionSmall = ingredientsCalculated.reduce((acc, i) => acc + i.costPortionSmall, 0);
  const costPerPortionLarge = ingredientsCalculated.reduce((acc, i) => acc + i.costPortionLarge, 0);

  // Percent to budget cap
  const percentToCapAvg = (avgFoodCostPerPortion / budgetCapPerPortion) * 100;
  const percentToCapSmall = (costPerPortionSmall / budgetCapPerPortion) * 100;
  const percentToCapLarge = (costPerPortionLarge / budgetCapPerPortion) * 100;

  // Selisih terhadap anggaran (hemat / surplus vs over)
  const budgetDifferenceTotal = totalBudgetCap - totalMenuProcurementCost; // Positive = hemat / surplus
  const budgetDifferencePerPortion = budgetCapPerPortion - avgFoodCostPerPortion;

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------
  const handleOpenAddIngredient = () => {
    const comp = foodCompositions[0];
    if (comp) {
      setSelectedCompositionId(comp.id);
      setCustomBdd(comp.ediblePortion);
      setCustomUnitPrice(comp.defaultUnitPrice);
      setCustomGramSmall(comp.category === 'Makanan Pokok' ? 85 : 50);
      setCustomGramLarge(comp.category === 'Makanan Pokok' ? 125 : 75);
    }
    setIsAddIngredientModalOpen(true);
  };

  const handleCompositionChange = (compId: string) => {
    setSelectedCompositionId(compId);
    const comp = foodCompositions.find(c => c.id === compId);
    if (comp) {
      setCustomBdd(comp.ediblePortion);
      setCustomUnitPrice(comp.defaultUnitPrice);
    }
  };

  const handleSaveIngredientToMenu = (e: React.FormEvent) => {
    e.preventDefault();
    const comp = foodCompositions.find(c => c.id === selectedCompositionId);
    if (!comp) return;

    const newIng: RecipeIngredient = {
      id: `ing-${Date.now()}`,
      name: comp.name,
      category: comp.category,
      netWeightSmall: Number(customGramSmall),
      netWeightLarge: Number(customGramLarge),
      unit: comp.purchaseUnit === 'pcs' || comp.purchaseUnit === 'ikat' ? comp.purchaseUnit : 'gram',
      ediblePortionPercent: Number(customBdd),
      conversionFactorToBase: comp.purchaseUnit === 'pcs' ? 1 : 0.001,
      purchaseUnit: comp.purchaseUnit,
      unitPrice: Number(customUnitPrice),
      calories100g: comp.calories,
      protein100g: comp.protein,
      fat100g: comp.fat,
      carb100g: comp.carbs,
      fiber100g: comp.fiber,
      referenceSource: comp.sourceReference,
    };

    setMenuIngredientsMap(prev => ({
      ...prev,
      [selectedMenuId]: [...(prev[selectedMenuId] || []), newIng],
    }));

    addToast('success', 'Bahan Ditambahkan', `${comp.name} berhasil ditambahkan ke ${currentMenu?.menuCode || 'Menu'}.`);
    setIsAddIngredientModalOpen(false);
  };

  const handleDeleteIngredient = (ingId: string) => {
    setMenuIngredientsMap(prev => ({
      ...prev,
      [selectedMenuId]: (prev[selectedMenuId] || []).filter(i => i.id !== ingId),
    }));
    addToast('info', 'Bahan Dihapus', 'Bahan resep telah dikeluarkan dari menu.');
  };

  const handleCreateNewMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Omit<MenuItem, 'id'> = {
      date: newMenuForm.date,
      dayName: newMenuForm.dayName,
      cycleWeek: newMenuForm.cycleWeek,
      menuCode: newMenuForm.menuCode,
      stapleFood: newMenuForm.stapleFood || 'Nasi Putih Pulen',
      animalProtein: newMenuForm.animalProtein || 'Lauk Hewani Pilihan',
      plantProtein: newMenuForm.plantProtein || 'Lauk Nabati Pilihan',
      vegetable: newMenuForm.vegetable || 'Sayuran Segar',
      fruit: newMenuForm.fruit || 'Buah Pilihan',
      milkOrExtra: newMenuForm.milkOrExtra,
      caloriesSmall: Math.round(nutritionSummarySmall.calories || 620),
      caloriesLarge: Math.round(nutritionSummaryLarge.calories || 870),
      proteinGrams: Number(nutritionSummaryLarge.protein.toFixed(1)) || 28.5,
      carbGrams: Number(nutritionSummaryLarge.carbs.toFixed(1)) || 95.0,
      fatGrams: Number(nutritionSummaryLarge.fat.toFixed(1)) || 20.0,
      fiberGrams: Number(nutritionSummaryLarge.fiber.toFixed(1)) || 7.0,
      targetPortions: totalBeneficiaries,
      estimatedCostPerPortion: Math.round(avgFoodCostPerPortion || 13500),
      status: 'Draft',
      notes: newMenuForm.notes || 'Standar gizi terintegrasi PLOG.',
    };

    await addMenuItem(payload);
    // Initialize empty or copied ingredients
    const newId = `menu-${Date.now()}`;
    setMenuIngredientsMap(prev => ({
      ...prev,
      [newId]: [...sampleIngredientsMenu1],
    }));
    setSelectedMenuId(newId);
    setIsCreateMenuModalOpen(false);
    addToast('success', 'Menu Baru Dibuat', `Menu ${newMenuForm.menuCode} berhasil ditambahkan.`);
  };

  // Jobdesk Photo Upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, jobdeskId: string) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setJobdesks(prev =>
          prev.map(j => (j.id === jobdeskId ? { ...j, photoUrl: result } : j))
        );
        addToast('success', 'Foto Terunggah', 'Foto contoh plating/SOP divisi berhasil diperbarui.');
      };
      reader.readAsDataURL(file);
    }
  };

  // Export PLOG Report to PDF
  const handleExportPLOGPDF = () => {
    exportTableToPDF({
      title: `LAPORAN PERENCANAAN DAN EVALUASI GIZI (PLOG)`,
      subtitle: `Menu: ${currentMenu?.menuCode} - ${currentMenu?.stapleFood} + ${currentMenu?.animalProtein} • SPPG TMG2`,
      headers: ['Bahan Pangan', 'Gram (K/B)', '% BDD', 'Total Bersih', 'Kebutuhan Beli', 'Harga Satuan', 'Total Biaya', 'Kalori (K/B)'],
      rows: ingredientsCalculated.map(i => [
        i.name,
        `${i.netWeightSmall}g / ${i.netWeightLarge}g`,
        `${i.ediblePortionPercent}%`,
        `${i.totalNetKg.toFixed(2)} kg`,
        `${i.purchaseQty.toFixed(2)} ${i.purchaseUnit}`,
        formatRupiah(i.unitPrice),
        formatRupiah(i.totalCost),
        `${Math.round(i.nutritionSmall.calories)} / ${Math.round(i.nutritionLarge.calories)} kkal`,
      ]),
      fileName: `PLOG_Laporan_Gizi_Bahan_${currentMenu?.menuCode || 'Menu'}`,
      sppgConfig,
      signerName: sppgConfig.nutritionOfficer,
      signerRole: 'Pengawas Gizi Dietisien SPPG TMG2',
    });
  };

  const handleExportPLOGExcel = () => {
    const dataToExport = ingredientsCalculated.map(i => ({
      'Menu': currentMenu?.menuCode,
      'Nama Bahan': i.name,
      'Kategori': i.category,
      'Gram Bersih Porsi Kecil': i.netWeightSmall,
      'Gram Bersih Porsi Besar': i.netWeightLarge,
      'Total Penerima Kecil': quotaSmall,
      'Total Penerima Besar': quotaLarge,
      'Total Berat Bersih (kg)': Number(i.totalNetKg.toFixed(2)),
      '% BDD (Edible Portion)': i.ediblePortionPercent,
      'Berat Kotor (kg)': Number(i.totalGrossKg.toFixed(2)),
      'Kebutuhan Pembelian': Number(i.purchaseQty.toFixed(2)),
      'Satuan Pembelian': i.purchaseUnit,
      'Harga Satuan (Rp)': i.unitPrice,
      'Total Biaya (Rp)': i.totalCost,
      'Kalori Kecil (kkal)': Math.round(i.nutritionSmall.calories),
      'Kalori Besar (kkal)': Math.round(i.nutritionLarge.calories),
      'Protein Kecil (g)': Number(i.nutritionSmall.protein.toFixed(1)),
      'Protein Besar (g)': Number(i.nutritionLarge.protein.toFixed(1)),
      'Sumber Referensi': i.referenceSource,
    }));
    exportToExcel(dataToExport, `PLOG_Bahan_Gizi_${currentMenu?.menuCode || 'Menu'}`, 'Perencanaan Bahan Gizi');
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
            onClick={() => setIsCreateMenuModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-900 hover:bg-blue-800 dark:bg-sky-600 dark:hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Menu Baru</span>
          </button>
        </div>
      </div>

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
            <span>Pagu Anggaran per Porsi</span>
            <Coins className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {formatRupiah(budgetCapPerPortion)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Indeks Resmi Badan Gizi Nasional</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] text-slate-500 uppercase font-bold flex items-center justify-between">
            <span>Realisasi Food Cost</span>
            <DollarSign className="w-4 h-4 text-blue-900 dark:text-sky-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {formatRupiah(Math.round(avgFoodCostPerPortion))}
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-0.5 flex items-center gap-1">
            <span>Efisiensi:</span>
            <span>+{formatRupiah(Math.round(budgetDifferencePerPortion))}/porsi</span>
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

      {/* 4 Main Sub-Modules Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-1 text-xs font-bold scrollbar-thin">
        {[
          {
            key: 'menu_bahan' as SubModuleTab,
            label: 'A. Perencanaan Menu dan Bahan',
            icon: <Scale className="w-4 h-4" />,
            badge: `${ingredientsCalculated.length} Bahan`,
          },
          {
            key: 'kandungan_gizi' as SubModuleTab,
            label: 'B. Input Kandungan Gizi (TKPI & Evaluasi AKG)',
            icon: <Apple className="w-4 h-4" />,
            badge: nutritionTarget.isConfigured ? 'Target AKG Aktif' : 'Belum Dikonfigurasi',
            badgeColor: nutritionTarget.isConfigured ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
          },
          {
            key: 'food_cost' as SubModuleTab,
            label: 'C. Input Food Cost Menu & Anggaran',
            icon: <Coins className="w-4 h-4" />,
            badge: `${percentToCapAvg.toFixed(1)}% Pagu`,
          },
          {
            key: 'jobdesk_divisi' as SubModuleTab,
            label: 'D. Jobdesk Divisi & SOP Foto',
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
          <div className="bg-sky-50 dark:bg-sky-950/40 p-4 rounded-xl border border-sky-200 dark:border-sky-900 flex items-start gap-3 text-xs text-sky-900 dark:text-sky-200">
            <Info className="w-5 h-5 text-sky-700 dark:text-sky-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold">
                Rumus Perhitungan Kebutuhan Bahan Sesuai Kategori Porsi & BDD:
              </div>
              <p className="leading-relaxed">
                Total Berat Bersih = (1.080 Porsi Kecil × Gram Kecil) + (1.770 Porsi Besar × Gram Besar).
                <br />
                Berat Kotor (Gross) = Total Berat Bersih / (% BDD / 100). Kebutuhan pembelian dihitung riil agar porsi saat disantap siswa tidak menyusut di bawah gramasi standar gizi.
              </p>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Scale className="w-4 h-4 text-blue-900 dark:text-sky-400" />
                Rincian Bahan Resep: {currentMenu?.stapleFood} + {currentMenu?.animalProtein}
              </h3>
              <p className="text-xs text-slate-500">
                Gramasi bersih, persentase BDD, berat kotor, dan total kebutuhan pengadaan
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenAddIngredient}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-900 hover:bg-blue-800 dark:bg-sky-600 dark:hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Bahan Resep</span>
            </button>
          </div>

          {/* Table of Ingredients */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                    <th className="p-3">Nama Bahan</th>
                    <th className="p-3">Kategori</th>
                    <th className="p-3 text-center">Berat Bersih / Porsi (K / B)</th>
                    <th className="p-3 text-center">% BDD</th>
                    <th className="p-3 text-right">Total Berat Bersih</th>
                    <th className="p-3 text-right">Berat Kotor (Gross)</th>
                    <th className="p-3 text-center">Faktor & Satuan</th>
                    <th className="p-3 text-right text-blue-900 dark:text-sky-300 font-black">Kebutuhan Beli</th>
                    <th className="p-3 text-right">Harga Satuan</th>
                    <th className="p-3 text-right">Total Biaya</th>
                    <th className="p-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {ingredientsCalculated.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-3 font-sans font-bold text-slate-900 dark:text-white">
                        {item.name}
                        <div className="text-[10px] text-slate-400 font-normal font-mono">
                          Ref: {item.referenceSource}
                        </div>
                      </td>
                      <td className="p-3 font-sans text-slate-600 dark:text-slate-400">
                        {item.category}
                      </td>
                      <td className="p-3 text-center font-bold">
                        <span className="text-sky-600">{item.netWeightSmall}g</span>
                        <span className="text-slate-400 mx-1">/</span>
                        <span className="text-indigo-600">{item.netWeightLarge}g</span>
                      </td>
                      <td className="p-3 text-center font-bold">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[11px] ${
                            item.ediblePortionPercent < 80
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}
                        >
                          {item.ediblePortionPercent}%
                        </span>
                      </td>
                      <td className="p-3 text-right text-slate-700 dark:text-slate-300">
                        {item.totalNetKg.toFixed(2)} kg
                        <div className="text-[10px] text-slate-400">({formatNumber(item.totalNetGrams)} g)</div>
                      </td>
                      <td className="p-3 text-right font-bold text-slate-800 dark:text-slate-200">
                        {item.totalGrossKg.toFixed(2)} kg
                      </td>
                      <td className="p-3 text-center font-sans text-[11px] text-slate-500">
                        {item.conversionFactorToBase} ({item.purchaseUnit})
                      </td>
                      <td className="p-3 text-right font-black text-blue-900 dark:text-sky-400 text-sm">
                        {item.purchaseQty.toFixed(2)} {item.purchaseUnit}
                      </td>
                      <td className="p-3 text-right text-slate-700 dark:text-slate-300">
                        {formatRupiah(item.unitPrice)}
                      </td>
                      <td className="p-3 text-right font-bold text-emerald-700 dark:text-emerald-400">
                        {formatRupiah(item.totalCost)}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleDeleteIngredient(item.id)}
                          className="p-1 text-rose-500 hover:text-rose-700 rounded hover:bg-rose-50 dark:hover:bg-rose-950 transition"
                          title="Hapus Bahan dari Resep"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 dark:bg-slate-800 font-bold font-mono border-t border-slate-300 dark:border-slate-700 text-xs">
                    <td colSpan={4} className="p-3 font-sans text-right uppercase tracking-wider">
                      TOTAL KESELURUHAN BAHAN ({ingredientsCalculated.length} Komponen):
                    </td>
                    <td className="p-3 text-right text-slate-900 dark:text-white">
                      {totalNetWeightAllKg.toFixed(2)} kg
                    </td>
                    <td className="p-3 text-right text-slate-900 dark:text-white">
                      {totalGrossWeightAllKg.toFixed(2)} kg
                    </td>
                    <td colSpan={2} className="p-3 text-right font-sans text-slate-500">
                      Volume Belanja Dapur
                    </td>
                    <td className="p-3 text-right font-sans text-slate-500">
                      Total Belanja:
                    </td>
                    <td className="p-3 text-right text-emerald-700 dark:text-emerald-400 text-sm font-black">
                      {formatRupiah(totalMenuProcurementCost)}
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
      {/* SUBMODUL B: INPUT & EVALUASI KANDUNGAN GIZI */}
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
          {/* Top Indicator Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="text-[11px] text-slate-500 uppercase font-bold">Pagu Anggaran MBG</div>
              <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                {formatRupiah(budgetCapPerPortion)}
              </div>
              <div className="text-[10px] text-slate-400">Total Pagu: {formatRupiah(totalBudgetCap)}</div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="text-[11px] text-slate-500 uppercase font-bold">Food Cost Porsi Kecil</div>
              <div className="text-xl font-black text-sky-600 mt-1">
                {formatRupiah(Math.round(costPerPortionSmall))}
              </div>
              <div className="text-[10px] text-sky-700 font-semibold">{percentToCapSmall.toFixed(1)}% dari Pagu</div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="text-[11px] text-slate-500 uppercase font-bold">Food Cost Porsi Besar</div>
              <div className="text-xl font-black text-indigo-600 mt-1">
                {formatRupiah(Math.round(costPerPortionLarge))}
              </div>
              <div className="text-[10px] text-indigo-700 font-semibold">{percentToCapLarge.toFixed(1)}% dari Pagu</div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="text-[11px] text-slate-500 uppercase font-bold">Selisih Anggaran (Hemat)</div>
              <div className="text-xl font-black text-emerald-600 mt-1">
                +{formatRupiah(budgetDifferenceTotal)}
              </div>
              <div className="text-[10px] text-emerald-700 font-semibold">
                Surplus Operasional SPPG ({((budgetDifferenceTotal / totalBudgetCap) * 100).toFixed(1)}%)
              </div>
            </div>
          </div>

          {/* Table: Food Cost Bahan = Jumlah bahan x Harga satuan */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Rincian Food Cost Bahan: {currentMenu?.menuCode} ({totalBeneficiaries} Porsi)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Perhitungan: Food Cost Bahan = Jumlah Kebutuhan × Harga Satuan | Food Cost/Porsi = Total Biaya / Jumlah Porsi
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
                      TOTAL FOOD COST MENU (2.850 Porsi):
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

          {/* Grid of Division Jobdesks with Photo Upload */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {jobdesks.map(job => (
              <div
                key={job.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs flex flex-col"
              >
                {/* Division Header */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">
                      {job.divisionName}
                    </h4>
                  </div>
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
                </div>

                {/* Photo Example Container */}
                <div className="relative h-48 bg-slate-100 dark:bg-slate-800 overflow-hidden group">
                  <img
                    src={job.photoUrl}
                    alt={job.divisionName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end p-3">
                    <p className="text-white text-[11px] leading-snug drop-shadow-xs italic">
                      {job.photoCaption || 'Foto contoh standar kerja divisi'}
                    </p>
                  </div>

                  {/* Interactive Upload Button Overlay */}
                  <label className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-black/60 hover:bg-black/80 text-white text-[11px] font-bold flex items-center gap-1.5 cursor-pointer backdrop-blur-xs transition">
                    <Camera className="w-3.5 h-3.5" />
                    <span>Ganti Foto</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => handlePhotoUpload(e, job.id)}
                    />
                  </label>
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

                  <div className="border-t border-slate-100 dark:border-slate-800 pt-2 flex items-center justify-between text-[11px] text-slate-500">
                    <div>
                      Koordinator: <strong>{job.picName}</strong>
                    </div>
                    <div className="text-[10px] font-mono text-sky-600">
                      Menu: {currentMenu?.menuCode}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-sky-700 dark:text-sky-300 mb-1">
                Berat Bersih Porsi Kecil (gram) *
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
                Berat Bersih Porsi Besar (gram) *
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
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Persentase BDD (% Bagian Dapat Dimakan) *
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
                Harga Satuan Bahan (Rp) *
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
      {/* MODAL: BUAT MENU BARU */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isCreateMenuModalOpen}
        onClose={() => setIsCreateMenuModalOpen(false)}
        title="Buat Perencanaan Menu Baru"
        subtitle="Rencanakan hidangan MBG lengkap dengan lauk hewani, nabati, sayuran, dan buah"
        maxWidth="md"
      >
        <form onSubmit={handleCreateNewMenu} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tanggal Operasional *
              </label>
              <input
                type="date"
                required
                value={newMenuForm.date}
                onChange={e => setNewMenuForm({ ...newMenuForm, date: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Kode Menu *
              </label>
              <input
                type="text"
                required
                value={newMenuForm.menuCode}
                onChange={e => setNewMenuForm({ ...newMenuForm, menuCode: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Makanan Pokok *
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Nasi Liwet Wangi Daun Salam"
              value={newMenuForm.stapleFood}
              onChange={e => setNewMenuForm({ ...newMenuForm, stapleFood: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Lauk Hewani *
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Ikan Gurame Bakar Bumbu Madu"
              value={newMenuForm.animalProtein}
              onChange={e => setNewMenuForm({ ...newMenuForm, animalProtein: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Lauk Nabati
              </label>
              <input
                type="text"
                placeholder="Contoh: Tempe Orek Manis"
                value={newMenuForm.plantProtein}
                onChange={e => setNewMenuForm({ ...newMenuForm, plantProtein: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Sayuran
              </label>
              <input
                type="text"
                placeholder="Contoh: Sayur Capcay Bakso"
                value={newMenuForm.vegetable}
                onChange={e => setNewMenuForm({ ...newMenuForm, vegetable: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Buah Segar
              </label>
              <input
                type="text"
                placeholder="Contoh: Melon Segar"
                value={newMenuForm.fruit}
                onChange={e => setNewMenuForm({ ...newMenuForm, fruit: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Pelengkap / Susu
              </label>
              <input
                type="text"
                value={newMenuForm.milkOrExtra}
                onChange={e => setNewMenuForm({ ...newMenuForm, milkOrExtra: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsCreateMenuModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold rounded-lg bg-blue-900 hover:bg-blue-800 text-white shadow-xs"
            >
              Simpan & Rancang Bahan
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
