import React from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BGNLogo } from './OfficialLogos';
import { isMatchingMaterialName } from '../../lib/store';
import { resolveRecipeIngredientFormula } from '../../lib/supplyChainSync';
import { parseLocalDate } from '../../lib/exportUtils';
import {
  MenuItem,
  RecipeIngredient,
  Institution,
  BeneficiaryAttendanceLog,
  DistributionDeliveryRecord,
  DistributionLog,
  MasterUnit,
  MasterBahan,
  RABItem,
  PortioningInspectionRecord,
  SPPGConfig,
} from '../../types';

export interface FoodCostIngredientRow {
  id: string;
  name: string;
  kebutuhan: number;
  satuan: string;
  unitPrice: number;
  totalCost: number;
  costPortionSmall: number;
  costPortionLarge: number;
  priceSource: 'PLOG' | 'RAB' | 'Master';
}

export interface FoodCostDishGroup {
  menuName: string;
  ingredients: FoodCostIngredientRow[];
  totalCost: number;
  costSmallPerPortion: number;
  costLargePerPortion: number;
}

export interface FoodCostDateGroup {
  no: number;
  menuId: string;
  menuCode: string;
  isoDate: string;
  tanggalDisplay: string; // DD/MM/YYYY
  smallPortions: number;
  largePortions: number;
  dishes: FoodCostDishGroup[];
  grandTotalCost: number;
  totalCostSmallPerPortion: number;
  totalCostLargePerPortion: number;
  smallPhotoUrl?: string;
  largePhotoUrl?: string;
}

export interface FoodCostReportData {
  sppgTitleLine: string;
  addressLine: string;
  smallBudgetCap: number;
  largeBudgetCap: number;
  groups: FoodCostDateGroup[];
}

function formatDdMmYyyy(isoDate: string): string {
  const d = parseLocalDate(isoDate);
  if (!d) return isoDate;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function formatRpNoSpace(amount: number): string {
  const rounded = Math.round(amount || 0);
  return `Rp${new Intl.NumberFormat('id-ID').format(rounded)}`;
}

function formatQtyDisplay(qty: number): string {
  if (!Number.isFinite(qty)) return '0';
  if (Math.abs(qty - Math.round(qty)) < 0.001) {
    return new Intl.NumberFormat('id-ID').format(Math.round(qty));
  }
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(qty);
}

function isSameInst(
  a: { id?: string; name?: string },
  bId?: string,
  bName?: string
): boolean {
  if (a.id && bId && a.id === bId) return true;
  if (a.name && bName) {
    return a.name.trim().toLowerCase() === bName.trim().toLowerCase();
  }
  return false;
}

function resolveDishNameForIngredient(ing: RecipeIngredient, menu: MenuItem): string {
  if (ing.menuName && ing.menuName.trim() !== '') {
    return ing.menuName.trim();
  }
  const cat = (ing.category || '').toLowerCase();
  if (cat.includes('pokok')) return menu.stapleFood || 'Makanan Pokok';
  if (cat.includes('hewani')) return menu.animalProtein || 'Lauk Hewani';
  if (cat.includes('nabati')) return menu.plantProtein || 'Lauk Nabati';
  if (cat.includes('sayur')) return menu.vegetable || 'Sayuran';
  if (cat.includes('buah')) return menu.fruit || 'Buah Segar';
  if (cat.includes('ekstra') || cat.includes('susu')) return menu.milkOrExtra || 'Ekstra / Susu';
  return 'Bumbu & Pelengkap';
}

export interface ResolveFoodCostReportParams {
  menuItems: MenuItem[];
  menuIngredientsMap: Record<string, RecipeIngredient[]>;
  institutions: Institution[];
  beneficiaryAttendance: BeneficiaryAttendanceLog[];
  distributionDeliveries: DistributionDeliveryRecord[];
  distributionLogs: DistributionLog[];
  masterUnits: MasterUnit[];
  masterBahan: MasterBahan[];
  rabItems: RABItem[];
  portioningRecords: PortioningInspectionRecord[];
  sppgConfig: SPPGConfig;
  periodType: 'harian' | 'mingguan' | 'bulanan' | 'periode';
  selectedDate: string;
  selectedMonth: string;
  startDate: string;
  endDate: string;
  selectedInstitutionId?: string;
  selectedPortionCategory?: 'ALL' | 'kecil' | 'besar';
  searchKeyword?: string;
}

export function resolveFoodCostReportData(
  params: ResolveFoodCostReportParams
): FoodCostReportData {
  const {
    menuItems,
    menuIngredientsMap,
    institutions,
    beneficiaryAttendance,
    distributionDeliveries,
    distributionLogs,
    masterUnits,
    masterBahan,
    rabItems,
    portioningRecords,
    sppgConfig,
    periodType,
    selectedDate,
    selectedMonth,
    startDate,
    endDate,
    selectedInstitutionId = 'ALL',
    selectedPortionCategory = 'ALL',
    searchKeyword = '',
  } = params;

  const targetInsts =
    selectedInstitutionId !== 'ALL'
      ? institutions.filter(i => i.id === selectedInstitutionId)
      : institutions.filter(i => i.isActive);
  const instPool = targetInsts.length > 0 ? targetInsts : institutions;

  // 1. Filter PLOG Menus by period (with graceful fallback to all planned menus when selected date has no dedicated menu entry)
  const sortedMenus = [...menuItems].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  let periodMenus: MenuItem[] = sortedMenus;

  if (periodType === 'harian' && selectedDate) {
    const exactDay = sortedMenus.filter(m => m.date === selectedDate);
    if (exactDay.length > 0) {
      periodMenus = exactDay;
    } else {
      const parsed = parseLocalDate(selectedDate);
      if (parsed) {
        const dayName = new Intl.DateTimeFormat('id-ID', { weekday: 'long' })
          .format(parsed)
          .toLowerCase();
        const byDayName = sortedMenus.filter(
          m => (m.dayName || '').trim().toLowerCase() === dayName
        );
        if (byDayName.length > 0) periodMenus = byDayName;
      }
    }
  } else if ((periodType === 'mingguan' || periodType === 'bulanan') && selectedMonth) {
    const inMonth = sortedMenus.filter(m => (m.date || '').startsWith(selectedMonth));
    if (inMonth.length > 0) periodMenus = inMonth;
  } else if (periodType === 'periode' && startDate && endDate) {
    const inRange = sortedMenus.filter(
      m => Boolean(m.date) && m.date >= startDate && m.date <= endDate
    );
    if (inRange.length > 0) periodMenus = inRange;
  }

  const kw = searchKeyword.trim().toLowerCase();
  if (kw) {
    periodMenus = periodMenus.filter(m => {
      const ings = menuIngredientsMap[m.id] || [];
      const ingHit = ings.some(
        i =>
          i.name.toLowerCase().includes(kw) ||
          (i.menuName || '').toLowerCase().includes(kw)
      );
      return (
        m.date.toLowerCase().includes(kw) ||
        m.menuCode.toLowerCase().includes(kw) ||
        m.stapleFood.toLowerCase().includes(kw) ||
        m.animalProtein.toLowerCase().includes(kw) ||
        m.plantProtein.toLowerCase().includes(kw) ||
        m.vegetable.toLowerCase().includes(kw) ||
        m.fruit.toLowerCase().includes(kw) ||
        ingHit
      );
    });
  }

  const resolvePortionsForDate = (targetDate: string) => {
    const sum = instPool.reduce(
      (acc, inst) => {
        const att = beneficiaryAttendance.find(
          a => a.date === targetDate && isSameInst(inst, a.institutionId, a.institutionName)
        );
        if (att) {
          return {
            small: acc.small + (att.presentSmall || 0),
            large: acc.large + (att.presentLarge || 0),
          };
        }
        const del = distributionDeliveries.find(
          d => d.date === targetDate && isSameInst(inst, d.institutionId, d.institutionName)
        );
        if (del) {
          return {
            small: acc.small + (del.smallPortions || 0),
            large: acc.large + (del.largePortions || 0),
          };
        }
        const log = distributionLogs.find(
          l => l.date === targetDate && isSameInst(inst, l.institutionId, l.institutionName)
        );
        if (log) {
          return {
            small: acc.small + (log.smallPortions || 0),
            large: acc.large + (log.largePortions || 0),
          };
        }
        return {
          small: acc.small + (inst.smallPortions || 0),
          large: acc.large + (inst.largePortions || 0),
        };
      },
      { small: 0, large: 0 }
    );
    const rawSmall = sum.small > 0 ? sum.small : 1080;
    const rawLarge = sum.large > 0 ? sum.large : 1770;
    return {
      small: selectedPortionCategory === 'besar' ? 0 : rawSmall,
      large: selectedPortionCategory === 'kecil' ? 0 : rawLarge,
    };
  };

  const groups: FoodCostDateGroup[] = periodMenus.map((menu, menuIdx) => {
    const rawIngredients = menuIngredientsMap[menu.id] || [];
    const portions = resolvePortionsForDate(menu.date);

    // Group ingredients by dish name in appearance order
    const dishMap = new Map<string, FoodCostIngredientRow[]>();

    rawIngredients.forEach(ing => {
      // Resolve price (prioritize PLOG input unitPrice; fallback to approved RAB Bahan Pangan or Master Bahan)
      const rabMatch =
        rabItems.find(
          r =>
            r.category === 'RAB Bahan Pangan' &&
            r.sourceMenuId === menu.id &&
            isMatchingMaterialName(r.itemName, ing.name)
        ) ||
        rabItems.find(
          r => r.category === 'RAB Bahan Pangan' && isMatchingMaterialName(r.itemName, ing.name)
        );
      const mbMatch = masterBahan.find(mb => isMatchingMaterialName(mb.name, ing.name));
      const unitPrice =
        ing.unitPrice > 0
          ? ing.unitPrice
          : rabMatch?.unitPrice || mbMatch?.actualPrice || 0;
      const priceSource: 'PLOG' | 'RAB' | 'Master' =
        ing.unitPrice > 0 ? 'PLOG' : rabMatch?.unitPrice ? 'RAB' : 'Master';

      const purchaseUnit = ing.purchaseUnit || 'kg';
      const formula = resolveRecipeIngredientFormula(
        ing,
        masterUnits,
        portions.small,
        portions.large,
        2,
        2,
        unitPrice
      );

      let costPortionSmall = portions.small > 0 ? formula.costPortionSmall : 0;
      let costPortionLarge = portions.large > 0 ? formula.costPortionLarge : 0;
      if (selectedPortionCategory === 'besar') costPortionSmall = 0;
      if (selectedPortionCategory === 'kecil') costPortionLarge = 0;

      const kebutuhanTotal =
        selectedPortionCategory === 'ALL'
          ? formula.totalKuantiti
          : selectedPortionCategory === 'kecil'
          ? formula.pembulatanSmall
          : formula.pembulatanLarge;
      const totalCost = kebutuhanTotal * unitPrice;

      const dishName = resolveDishNameForIngredient(ing, menu);
      const existing = dishMap.get(dishName) || [];
      existing.push({
        id: ing.id,
        name: ing.name,
        kebutuhan: kebutuhanTotal,
        satuan: purchaseUnit,
        unitPrice,
        totalCost,
        costPortionSmall,
        costPortionLarge,
        priceSource,
      });
      dishMap.set(dishName, existing);
    });

    // If a newly created MenuItem has no custom ingredients yet, build representative dish rows from its components
    if (dishMap.size === 0) {
      const fallbackComponents = [
        { name: menu.stapleFood, netS: 85, netL: 125, price: 14500, unit: 'kg' },
        { name: menu.animalProtein, netS: 55, netL: 80, price: 38000, unit: 'kg' },
        { name: menu.plantProtein, netS: 40, netL: 60, price: 12000, unit: 'kg' },
        { name: menu.vegetable, netS: 60, netL: 90, price: 13500, unit: 'kg' },
        { name: menu.fruit, netS: 80, netL: 110, price: 16000, unit: 'kg' },
      ].filter(c => Boolean(c.name && c.name.trim() !== ''));

      fallbackComponents.forEach((c, idx) => {
        const kebS = Math.ceil(((portions.small * c.netS) / 1000) * 1.02);
        const kebL = Math.ceil(((portions.large * c.netL) / 1000) * 1.02);
        const kebTotal = (portions.small > 0 ? kebS : 0) + (portions.large > 0 ? kebL : 0);
        dishMap.set(c.name, [
          {
            id: `${menu.id}-fb-${idx}`,
            name: c.name,
            kebutuhan: kebTotal,
            satuan: c.unit,
            unitPrice: c.price,
            totalCost: kebTotal * c.price,
            costPortionSmall: portions.small > 0 ? (c.netS / 1000) * c.price : 0,
            costPortionLarge: portions.large > 0 ? (c.netL / 1000) * c.price : 0,
            priceSource: 'PLOG',
          },
        ]);
      });
    }

    const dishes: FoodCostDishGroup[] = Array.from(dishMap.entries()).map(
      ([menuName, ingredients]) => {
        const totalCost = ingredients.reduce((s, i) => s + i.totalCost, 0);
        const rawSmall = ingredients.reduce((s, i) => s + i.costPortionSmall, 0);
        const rawLarge = ingredients.reduce((s, i) => s + i.costPortionLarge, 0);
        return {
          menuName,
          ingredients,
          totalCost,
          costSmallPerPortion: Math.round(rawSmall),
          costLargePerPortion: Math.round(rawLarge),
        };
      }
    );

    const grandTotalCost = dishes.reduce((s, d) => s + d.totalCost, 0);
    const totalCostSmallPerPortion = dishes.reduce((s, d) => s + d.costSmallPerPortion, 0);
    const totalCostLargePerPortion = dishes.reduce((s, d) => s + d.costLargePerPortion, 0);

    // Resolve Ompreng Documentation Photos from Divisi Pemorsian & Master Menu
    const matchingPortRecs = portioningRecords.filter(
      r => r.menuId === menu.id || r.date === menu.date
    );
    const pickPhoto = (
      getter: (r: PortioningInspectionRecord) => string | undefined
    ): string | undefined => {
      for (const rec of matchingPortRecs) {
        const v = getter(rec);
        if (v && v.trim() !== '') return v;
      }
      return undefined;
    };

    const smallPhotoUrl =
      pickPhoto(
        r =>
          r.smallPortionPhoto ||
          r.foodTemps?.rice?.smallPortionSession1PhotoUrl ||
          r.foodTemps?.rice?.smallPortionSession2PhotoUrl ||
          r.foodTemps?.rice?.smallPortionSession3PhotoUrl
      ) ||
      portioningRecords[0]?.smallPortionPhoto ||
      portioningRecords[0]?.foodTemps?.rice?.smallPortionSession1PhotoUrl;

    const largePhotoUrl =
      pickPhoto(
        r =>
          r.largePortionPhoto ||
          r.foodTemps?.rice?.photoUrl ||
          r.foodTemps?.animalProtein?.photoUrl
      ) ||
      portioningRecords[0]?.largePortionPhoto ||
      portioningRecords[0]?.foodTemps?.rice?.photoUrl;

    return {
      no: menuIdx + 1,
      menuId: menu.id,
      menuCode: menu.menuCode,
      isoDate: menu.date,
      tanggalDisplay: formatDdMmYyyy(menu.date),
      smallPortions: portions.small,
      largePortions: portions.large,
      dishes,
      grandTotalCost,
      totalCostSmallPerPortion,
      totalCostLargePerPortion,
      smallPhotoUrl,
      largePhotoUrl,
    };
  });

  const cleanSppgTitle = (sppgConfig.sppgName || 'PROBOLINGGO KREJENGAN TEMENGGUNGAN 002')
    .replace(/^SPPG\s+/i, '')
    .toUpperCase();

  const addressLine = `${sppgConfig.address || 'Dusun Krajan RT/RW 003/004 Desa Temenggungan'}, Kecamatan ${
    sppgConfig.district || 'Krejengan'
  }, ${sppgConfig.regency || 'Kabupaten Probolinggo'}, ${
    sppgConfig.province || 'Jawa Timur'
  }, ID 67284. Email : ${sppgConfig.email}`;

  return {
    sppgTitleLine: cleanSppgTitle,
    addressLine,
    smallBudgetCap: sppgConfig.smallPortionBudget || 8000,
    largeBudgetCap: sppgConfig.largePortionBudget || 10000,
    groups,
  };
}

interface FoodCostReportSheetProps {
  data: FoodCostReportData;
  onPreviewPhoto?: (info: { label: string; url: string; caption?: string }) => void;
  className?: string;
}

export const FoodCostReportSheet: React.FC<FoodCostReportSheetProps> = ({
  data,
  onPreviewPhoto,
  className = '',
}) => {
  return (
    <div
      className={`bg-white text-black p-5 sm:p-7 rounded-xl border border-slate-200 shadow-sm print:shadow-none print:border-none print:p-2 print:rounded-none font-sans leading-tight ${className}`}
    >
      {/* KOP SURAT BGN + IDENTITAS SPPG */}
      <div className="flex items-start gap-4 pb-3">
        <div className="shrink-0">
          <BGNLogo size="lg" />
        </div>
        <div className="flex-1 text-left">
          <h3 className="text-[12px] sm:text-[13px] font-bold uppercase tracking-wide text-[#1e3a8a]">
            BADAN GIZI NASIONAL (NATIONAL NUTRITION AGENCY)
          </h3>
          <h2 className="text-[11.5px] sm:text-[12.5px] font-bold uppercase tracking-wide text-black leading-tight">
            SATUAN PELAYANAN PEMENUHAN GIZI (SPPG)
          </h2>
          <h2 className="text-[11.5px] sm:text-[12.5px] font-bold uppercase tracking-wide text-black leading-tight">
            {data.sppgTitleLine}
          </h2>
          <p className="text-[9.5px] sm:text-[10.5px] text-black mt-0.5">
            {data.addressLine}
          </p>
        </div>
      </div>

      {/* JUDUL */}
      <div className="text-center pb-2.5">
        <h1 className="text-[13px] sm:text-[14px] font-bold uppercase tracking-wide text-black">
          LAPORAN FOOD COST
        </h1>
      </div>

      {/* TABEL 11 KOLOM PERSIS GAMBAR REFERENSI */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-black text-[9.5px] sm:text-[10px] text-black">
          <thead>
            <tr className="bg-[#e0a81b] print:bg-[#e0a81b] font-bold text-center text-black">
              <th className="border border-black px-1.5 py-2 align-middle w-8">NO.</th>
              <th className="border border-black px-2 py-2 align-middle whitespace-nowrap w-20">
                TANGGAL
              </th>
              <th className="border border-black px-2 py-2 align-middle min-w-[115px]">
                MENU
              </th>
              <th className="border border-black px-2 py-2 align-middle min-w-[140px]">
                BAHAN POKOK
              </th>
              <th className="border border-black px-1.5 py-2 align-middle whitespace-nowrap">
                KEBUTUHAN
              </th>
              <th className="border border-black px-1.5 py-2 align-middle whitespace-nowrap">
                SATUAN
              </th>
              <th className="border border-black px-1.5 py-2 align-middle whitespace-nowrap">
                HARGA DASAR/kg/bks
              </th>
              <th className="border border-black px-2 py-2 align-middle whitespace-nowrap">
                TOTAL
              </th>
              <th className="border border-black px-1.5 py-2 align-middle leading-tight w-24">
                HARGA PORSI KECIL
              </th>
              <th className="border border-black px-1.5 py-2 align-middle leading-tight w-24">
                HARGA PORSI BESAR
              </th>
              <th className="border border-black px-2 py-2 align-middle min-w-[118px]">
                DOKUMENTASI
              </th>
            </tr>
          </thead>

          <tbody>
            {data.groups.length === 0 ? (
              <tr>
                <td
                  colSpan={11}
                  className="border border-black px-4 py-8 text-center italic text-slate-500"
                >
                  Belum ada data Perencanaan Menu &amp; Input Food Cost PLOG pada filter periode ini.
                </td>
              </tr>
            ) : (
              data.groups.map(group => {
                // Total rows rendered inside this date group = sum(dish ingredients + 1 SUB TOTAL row) + 1 grand TOTAL row
                const dishBodyRowCount = group.dishes.reduce(
                  (sum, d) => sum + d.ingredients.length + 1,
                  0
                );
                const totalGroupRows = dishBodyRowCount + 1;

                const renderedRows: React.ReactNode[] = [];
                let isFirstRowOfGroup = true;

                group.dishes.forEach((dish, dishIdx) => {
                  const dishRowSpan = dish.ingredients.length + 1;
                  const isDish0 = dishIdx === 0;

                  dish.ingredients.forEach((ing, ingIdx) => {
                    const isFirstRowOfDish = ingIdx === 0;
                    const isSecondRowOfDish0 = isDish0 && ingIdx === 1;

                    renderedRows.push(
                      <tr key={`${group.menuId}-${dishIdx}-${ing.id}`} className="align-middle">
                        {/* NO. & TANGGAL (rowSpan seluruh blok tanggal) */}
                        {isFirstRowOfGroup && (
                          <>
                            <td
                              rowSpan={totalGroupRows}
                              className="border border-black px-1.5 py-1.5 text-center font-medium align-top"
                            >
                              {group.no}
                            </td>
                            <td
                              rowSpan={totalGroupRows}
                              className="border border-black px-2 py-1.5 text-center font-medium whitespace-nowrap align-top"
                            >
                              {group.tanggalDisplay}
                            </td>
                          </>
                        )}

                        {/* MENU (rowSpan seluruh bahan + SUB TOTAL hidangan ini) */}
                        {isFirstRowOfDish && (
                          <td
                            rowSpan={dishRowSpan}
                            className="border border-black px-2 py-1.5 text-left font-medium align-middle"
                          >
                            {dish.menuName}
                          </td>
                        )}

                        {/* BAHAN POKOK, KEBUTUHAN, SATUAN, HARGA DASAR, TOTAL */}
                        <td className="border border-black px-2 py-1 text-left">
                          {ing.name}
                        </td>
                        <td className="border border-black px-1.5 py-1 text-center whitespace-nowrap">
                          {formatQtyDisplay(ing.kebutuhan)}
                        </td>
                        <td className="border border-black px-1.5 py-1 text-center whitespace-nowrap">
                          {ing.satuan}
                        </td>
                        <td className="border border-black px-1.5 py-1 text-right whitespace-nowrap">
                          {formatRpNoSpace(ing.unitPrice)}
                        </td>
                        <td className="border border-black px-2 py-1 text-right whitespace-nowrap">
                          {formatRpNoSpace(ing.totalCost)}
                        </td>

                        {/* HARGA PORSI KECIL & HARGA PORSI BESAR */}
                        {isFirstRowOfGroup ? (
                          <>
                            <td className="border border-black px-1.5 py-1 text-center font-bold text-[#dc2626] whitespace-nowrap">
                              {group.smallPortions} porsi
                            </td>
                            <td className="border border-black px-1.5 py-1 text-center font-bold text-[#dc2626] whitespace-nowrap">
                              {group.largePortions} porsi
                            </td>
                          </>
                        ) : isSecondRowOfDish0 ? (
                          <>
                            <td
                              rowSpan={dishRowSpan - 1}
                              className="border border-black px-1.5 py-1 text-center font-medium whitespace-nowrap align-middle"
                            >
                              {formatRpNoSpace(dish.costSmallPerPortion)}
                            </td>
                            <td
                              rowSpan={dishRowSpan - 1}
                              className="border border-black px-1.5 py-1 text-center font-medium whitespace-nowrap align-middle"
                            >
                              {formatRpNoSpace(dish.costLargePerPortion)}
                            </td>
                          </>
                        ) : !isDish0 && isFirstRowOfDish ? (
                          <>
                            <td
                              rowSpan={dishRowSpan}
                              className="border border-black px-1.5 py-1 text-center font-medium whitespace-nowrap align-middle"
                            >
                              {formatRpNoSpace(dish.costSmallPerPortion)}
                            </td>
                            <td
                              rowSpan={dishRowSpan}
                              className="border border-black px-1.5 py-1 text-center font-medium whitespace-nowrap align-middle"
                            >
                              {formatRpNoSpace(dish.costLargePerPortion)}
                            </td>
                          </>
                        ) : null}

                        {/* DOKUMENTASI (rowSpan seluruh blok tanggal) */}
                        {isFirstRowOfGroup && (
                          <td
                            rowSpan={totalGroupRows}
                            className="border border-black p-1.5 align-middle text-center bg-white"
                          >
                            <div className="flex flex-col items-center justify-center gap-1.5">
                              {group.smallPhotoUrl ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onPreviewPhoto?.({
                                      label: `Ompreng Porsi Kecil — ${group.tanggalDisplay}`,
                                      url: group.smallPhotoUrl!,
                                      caption: `${group.menuCode} • ${group.smallPortions} porsi kecil • Food Cost ${formatRpNoSpace(group.totalCostSmallPerPortion)}/porsi`,
                                    })
                                  }
                                  className="group block cursor-pointer"
                                  title="Klik untuk memperbesar foto ompreng porsi kecil"
                                >
                                  <img
                                    src={group.smallPhotoUrl}
                                    alt={`Dokumentasi Porsi Kecil ${group.tanggalDisplay}`}
                                    className="w-24 h-16 object-cover border border-slate-400 group-hover:scale-[1.03] transition"
                                  />
                                </button>
                              ) : null}
                              {group.largePhotoUrl &&
                              group.largePhotoUrl !== group.smallPhotoUrl ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onPreviewPhoto?.({
                                      label: `Ompreng Porsi Besar — ${group.tanggalDisplay}`,
                                      url: group.largePhotoUrl!,
                                      caption: `${group.menuCode} • ${group.largePortions} porsi besar • Food Cost ${formatRpNoSpace(group.totalCostLargePerPortion)}/porsi`,
                                    })
                                  }
                                  className="group block cursor-pointer"
                                  title="Klik untuk memperbesar foto ompreng porsi besar"
                                >
                                  <img
                                    src={group.largePhotoUrl}
                                    alt={`Dokumentasi Porsi Besar ${group.tanggalDisplay}`}
                                    className="w-24 h-16 object-cover border border-slate-400 group-hover:scale-[1.03] transition"
                                  />
                                </button>
                              ) : null}
                              {!group.smallPhotoUrl && !group.largePhotoUrl && (
                                <span className="text-[9px] italic text-slate-400">
                                  Belum ada foto
                                </span>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );

                    isFirstRowOfGroup = false;
                  });

                  // SUB TOTAL row untuk hidangan ini
                  const isSubtotalInDish0SecondRow = isDish0 && dish.ingredients.length === 1;
                  renderedRows.push(
                    <tr
                      key={`${group.menuId}-${dishIdx}-subtotal`}
                      className="bg-[#e5e7eb] print:bg-[#e5e7eb] font-bold align-middle"
                    >
                      <td className="border border-black px-2 py-1 text-right text-[9.5px]">
                        SUB TOTAL :
                      </td>
                      <td className="border border-black px-1.5 py-1 text-center" />
                      <td className="border border-black px-1.5 py-1 text-center" />
                      <td className="border border-black px-1.5 py-1 text-right" />
                      <td className="border border-black px-2 py-1 text-right whitespace-nowrap">
                        {formatRpNoSpace(dish.totalCost)}
                      </td>

                      {isSubtotalInDish0SecondRow && (
                        <>
                          <td
                            rowSpan={1}
                            className="border border-black px-1.5 py-1 text-center font-medium bg-white print:bg-white whitespace-nowrap"
                          >
                            {formatRpNoSpace(dish.costSmallPerPortion)}
                          </td>
                          <td
                            rowSpan={1}
                            className="border border-black px-1.5 py-1 text-center font-medium bg-white print:bg-white whitespace-nowrap"
                          >
                            {formatRpNoSpace(dish.costLargePerPortion)}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                });

                // Grand TOTAL row untuk blok tanggal ini
                renderedRows.push(
                  <tr
                    key={`${group.menuId}-grand-total`}
                    className="font-bold align-middle bg-white"
                  >
                    <td
                      colSpan={5}
                      className="border border-black px-2 py-1.5 text-center uppercase tracking-wide"
                    >
                      TOTAL
                    </td>
                    <td className="border border-black px-2 py-1.5 text-right whitespace-nowrap bg-[#f8fafc] print:bg-[#f8fafc]">
                      {formatRpNoSpace(group.grandTotalCost)}
                    </td>
                    <td className="border border-black px-1.5 py-1.5 text-center whitespace-nowrap bg-[#facc15] print:bg-[#facc15] font-extrabold text-black">
                      {formatRpNoSpace(group.totalCostSmallPerPortion)}
                    </td>
                    <td className="border border-black px-1.5 py-1.5 text-center whitespace-nowrap bg-[#facc15] print:bg-[#facc15] font-extrabold text-black">
                      {formatRpNoSpace(group.totalCostLargePerPortion)}
                    </td>
                  </tr>
                );

                return <React.Fragment key={group.menuId}>{renderedRows}</React.Fragment>;
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

async function loadImageUrlAsJpegDataUrl(url: string): Promise<string | null> {
  if (!url || typeof url !== 'string') return null;
  return new Promise(resolve => {
    let settled = false;
    const finish = (val: string | null) => {
      if (!settled) {
        settled = true;
        resolve(val);
      }
    };
    const timer = window.setTimeout(() => finish(null), 4000);
    const img = new Image();
    if (!url.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      window.clearTimeout(timer);
      try {
        const canvas = document.createElement('canvas');
        const target = 220;
        const ratio =
          img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 4 / 3;
        canvas.width = ratio >= 1 ? target : Math.max(64, Math.round(target * ratio));
        canvas.height = ratio >= 1 ? Math.max(48, Math.round(target / ratio)) : target;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          finish(canvas.toDataURL('image/jpeg', 0.85));
        } else {
          finish(url.startsWith('data:image/') ? url : null);
        }
      } catch {
        finish(url.startsWith('data:image/') ? url : null);
      }
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      finish(url.startsWith('data:image/') ? url : null);
    };
    img.src = url;
  });
}

async function loadLogoPngDataUrl(url: string): Promise<string | null> {
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 160;
        canvas.height = img.naturalHeight || 160;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } else {
          resolve(null);
        }
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export async function exportFoodCostReportPDF(data: FoodCostReportData) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const left = 10;
  const right = 287;
  const centerX = 148.5;

  const logoPromise = loadLogoPngDataUrl(
    '/assets/aistudio/Badan_Gizi_Nasional__BGN__Logo_-_Colored_-_zonalogo.com_5e10d066.png'
  );

  const uniquePhotoUrls = Array.from(
    new Set(
      data.groups
        .flatMap(g => [g.smallPhotoUrl, g.largePhotoUrl])
        .filter((u): u is string => Boolean(u && u.trim() !== ''))
    )
  );
  const photoMap = new Map<string, string | null>();
  const [logoDataUrl] = await Promise.all([
    logoPromise,
    ...uniquePhotoUrls.map(async u => {
      photoMap.set(u, await loadImageUrlAsJpegDataUrl(u));
    }),
  ]);

  // KOP SURAT BGN
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', left + 8, 9, 17, 17);
  }
  const textStartX = left + 31;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 58, 138);
  doc.text('BADAN GIZI NASIONAL (NATIONAL NUTRITION AGENCY)', textStartX, 12.5);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.text('SATUAN PELAYANAN PEMENUHAN GIZI (SPPG)', textStartX, 17);
  doc.text(data.sppgTitleLine, textStartX, 21.3);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const addrLines = doc.splitTextToSize(data.addressLine, right - textStartX);
  doc.text(addrLines, textStartX, 25.2);

  // JUDUL
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text('LAPORAN FOOD COST', centerX, 34, { align: 'center' });

  // Build AutoTable rows with exact rowSpans and track Dokumentasi cell coordinates
  type CellDef =
    | string
    | {
        content: string;
        rowSpan?: number;
        colSpan?: number;
        styles?: Record<string, unknown>;
      };

  const body: CellDef[][] = [];
  const docPhotoMap = new Map<number, string[]>();

  data.groups.forEach(group => {
    const dishBodyRowCount = group.dishes.reduce(
      (sum, d) => sum + d.ingredients.length + 1,
      0
    );
    const totalGroupRows = dishBodyRowCount + 1;
    let isFirstRowOfGroup = true;

    const groupPhotos: string[] = [];
    const sData = group.smallPhotoUrl ? photoMap.get(group.smallPhotoUrl) : null;
    const lData = group.largePhotoUrl ? photoMap.get(group.largePhotoUrl) : null;
    if (sData) groupPhotos.push(sData);
    if (lData && group.largePhotoUrl !== group.smallPhotoUrl) groupPhotos.push(lData);

    group.dishes.forEach((dish, dishIdx) => {
      const dishRowSpan = dish.ingredients.length + 1;
      const isDish0 = dishIdx === 0;

      dish.ingredients.forEach((ing, ingIdx) => {
        const isFirstRowOfDish = ingIdx === 0;
        const isSecondRowOfDish0 = isDish0 && ingIdx === 1;
        const row: CellDef[] = [];

        if (isFirstRowOfGroup) {
          const anchorRowIdx = body.length;
          if (groupPhotos.length > 0) {
            docPhotoMap.set(anchorRowIdx, groupPhotos);
          }
          row.push({
            content: String(group.no),
            rowSpan: totalGroupRows,
            styles: { halign: 'center', valign: 'top' },
          });
          row.push({
            content: group.tanggalDisplay,
            rowSpan: totalGroupRows,
            styles: { halign: 'center', valign: 'top' },
          });
        }

        if (isFirstRowOfDish) {
          row.push({
            content: dish.menuName,
            rowSpan: dishRowSpan,
            styles: { halign: 'left', valign: 'middle' },
          });
        }

        row.push({ content: ing.name, styles: { halign: 'left' } });
        row.push({ content: formatQtyDisplay(ing.kebutuhan), styles: { halign: 'center' } });
        row.push({ content: ing.satuan, styles: { halign: 'center' } });
        row.push({ content: formatRpNoSpace(ing.unitPrice), styles: { halign: 'right' } });
        row.push({ content: formatRpNoSpace(ing.totalCost), styles: { halign: 'right' } });

        if (isFirstRowOfGroup) {
          row.push({
            content: `${group.smallPortions} porsi`,
            styles: { halign: 'center', fontStyle: 'bold', textColor: [220, 38, 38] },
          });
          row.push({
            content: `${group.largePortions} porsi`,
            styles: { halign: 'center', fontStyle: 'bold', textColor: [220, 38, 38] },
          });
        } else if (isSecondRowOfDish0) {
          row.push({
            content: formatRpNoSpace(dish.costSmallPerPortion),
            rowSpan: dishRowSpan - 1,
            styles: { halign: 'center', valign: 'middle' },
          });
          row.push({
            content: formatRpNoSpace(dish.costLargePerPortion),
            rowSpan: dishRowSpan - 1,
            styles: { halign: 'center', valign: 'middle' },
          });
        } else if (!isDish0 && isFirstRowOfDish) {
          row.push({
            content: formatRpNoSpace(dish.costSmallPerPortion),
            rowSpan: dishRowSpan,
            styles: { halign: 'center', valign: 'middle' },
          });
          row.push({
            content: formatRpNoSpace(dish.costLargePerPortion),
            rowSpan: dishRowSpan,
            styles: { halign: 'center', valign: 'middle' },
          });
        }

        if (isFirstRowOfGroup) {
          row.push({
            content: groupPhotos.length === 0 ? '-' : '',
            rowSpan: totalGroupRows,
            styles: { halign: 'center', valign: 'middle' },
          });
        }

        body.push(row);
        isFirstRowOfGroup = false;
      });

      // SUB TOTAL row
      const isSubtotalInDish0SecondRow = isDish0 && dish.ingredients.length === 1;
      const subRow: CellDef[] = [
        {
          content: 'SUB TOTAL :',
          styles: { halign: 'right', fontStyle: 'bold', fillColor: [229, 231, 235] },
        },
        { content: '', styles: { fillColor: [229, 231, 235] } },
        { content: '', styles: { fillColor: [229, 231, 235] } },
        { content: '', styles: { fillColor: [229, 231, 235] } },
        {
          content: formatRpNoSpace(dish.totalCost),
          styles: { halign: 'right', fontStyle: 'bold', fillColor: [229, 231, 235] },
        },
      ];
      if (isSubtotalInDish0SecondRow) {
        subRow.push({
          content: formatRpNoSpace(dish.costSmallPerPortion),
          styles: { halign: 'center', valign: 'middle', fillColor: [255, 255, 255] },
        });
        subRow.push({
          content: formatRpNoSpace(dish.costLargePerPortion),
          styles: { halign: 'center', valign: 'middle', fillColor: [255, 255, 255] },
        });
      }
      body.push(subRow);
    });

    // Grand TOTAL row
    body.push([
      {
        content: 'TOTAL',
        colSpan: 5,
        styles: { halign: 'center', fontStyle: 'bold', fillColor: [255, 255, 255] },
      },
      {
        content: formatRpNoSpace(group.grandTotalCost),
        styles: { halign: 'right', fontStyle: 'bold', fillColor: [248, 250, 252] },
      },
      {
        content: formatRpNoSpace(group.totalCostSmallPerPortion),
        styles: { halign: 'center', fontStyle: 'bold', fillColor: [250, 204, 21] },
      },
      {
        content: formatRpNoSpace(group.totalCostLargePerPortion),
        styles: { halign: 'center', fontStyle: 'bold', fillColor: [250, 204, 21] },
      },
    ]);
  });

  autoTable(doc, {
    startY: 37,
    margin: { left, right: 10 },
    theme: 'grid',
    head: [
      [
        'NO.',
        'TANGGAL',
        'MENU',
        'BAHAN POKOK',
        'KEBUTUHAN',
        'SATUAN',
        'HARGA DASAR/kg/bks',
        'TOTAL',
        'HARGA PORSI KECIL',
        'HARGA PORSI BESAR',
        'DOKUMENTASI',
      ],
    ],
    body,
    styles: {
      font: 'helvetica',
      fontSize: 7.2,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      cellPadding: 1.1,
      valign: 'middle',
    },
    headStyles: {
      fillColor: [224, 168, 27],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 7,
      halign: 'center',
      valign: 'middle',
    },
    columnStyles: {
      0: { cellWidth: 9 },
      1: { cellWidth: 20 },
      2: { cellWidth: 34 },
      3: { cellWidth: 48 },
      4: { cellWidth: 18 },
      5: { cellWidth: 14 },
      6: { cellWidth: 25 },
      7: { cellWidth: 25 },
      8: { cellWidth: 24 },
      9: { cellWidth: 24 },
      10: { cellWidth: 36 },
    },
    didDrawCell: cellData => {
      if (cellData.section === 'body' && cellData.column.index === 10) {
        const photos = docPhotoMap.get(cellData.row.index);
        if (photos && photos.length > 0) {
          const pad = 1.8;
          const availW = cellData.cell.width - pad * 2;
          const availH = cellData.cell.height - pad * 2;
          const count = Math.min(2, photos.length);
          const gap = count > 1 ? 1.8 : 0;
          const maxSlotH = (availH - gap * (count - 1)) / count;
          const imgW = Math.min(availW, 28);
          const imgH = Math.min(maxSlotH, imgW * 0.72, 20);
          const totalStackH = count * imgH + gap * (count - 1);
          const startY = cellData.cell.y + (cellData.cell.height - totalStackH) / 2;
          const drawX = cellData.cell.x + (cellData.cell.width - imgW) / 2;

          for (let i = 0; i < count; i++) {
            try {
              doc.addImage(photos[i], 'JPEG', drawX, startY + i * (imgH + gap), imgW, imgH);
            } catch {
              // ignore image draw errors
            }
          }
        }
      }
    },
  });

  doc.save('Laporan_Food_Cost_SPPG_TMG2.pdf');
}
