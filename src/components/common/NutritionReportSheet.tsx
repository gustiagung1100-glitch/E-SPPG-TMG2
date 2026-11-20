import React, { useId, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Plus, RotateCcw, Split, Trash2 } from 'lucide-react';
import { BGNLogo } from './OfficialLogos';
import { dispatchPrintToast, parseLocalDate } from '../../lib/exportUtils';
import { MenuItem, RecipeIngredient, SPPGConfig } from '../../types';

export interface NutritionIngredientRow {
  id: string;
  rawMenuName?: string;
  name: string;
  category: string;
  referenceSource: string;
  beratSmall: number;
  energiSmall: number;
  proteinSmall: number;
  lemakSmall: number;
  khSmall: number;
  seratSmall: number;
  beratLarge: number;
  energiLarge: number;
  proteinLarge: number;
  lemakLarge: number;
  khLarge: number;
  seratLarge: number;
}

export interface NutritionDishGroup {
  menuName: string;
  ingredientIds: string[];
  hasManualMenuName: boolean;
  ingredients: NutritionIngredientRow[];
}

export interface NutritionDateGroup {
  menuId: string;
  menuCode: string;
  isoDate: string;
  hariTglDisplay: string;
  sasaranLabel: string;
  dishes: NutritionDishGroup[];
  totalsSmall: {
    energi: number;
    protein: number;
    lemak: number;
    kh: number;
    serat: number;
  };
  totalsLarge: {
    energi: number;
    protein: number;
    lemak: number;
    kh: number;
    serat: number;
  };
}

export interface NutritionReportData {
  sppgTitleLine: string;
  addressLine: string;
  portionFilter: 'ALL' | 'kecil' | 'besar';
  groups: NutritionDateGroup[];
}

function formatHariTanggal(isoDate: string, fallbackDayName?: string): string {
  const d = parseLocalDate(isoDate);
  if (!d) {
    return `${fallbackDayName || ''} ${isoDate || '-'}`.trim();
  }
  const dayStr =
    fallbackDayName && fallbackDayName.trim() !== ''
      ? fallbackDayName.trim()
      : new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(d);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${dayStr} ${dd}/${mm}/${yy}`;
}

export function formatNutrCell(val: number, maxDecimals = 2): string {
  if (!Number.isFinite(val) || Math.abs(val) < 0.0005) return '0';
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  }).format(Number(val.toFixed(maxDecimals)));
}

export function formatNutrTotal(val: number): string {
  const safe = Number.isFinite(val) ? val : 0;
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe);
}

function resolveDishNameForNutrition(ing: RecipeIngredient, menu: MenuItem): string {
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
  return 'Pelengkap & Bumbu';
}

export interface ResolveNutritionReportParams {
  menuItems: MenuItem[];
  menuIngredientsMap: Record<string, RecipeIngredient[]>;
  sppgConfig: SPPGConfig;
  periodType?: 'harian' | 'mingguan' | 'bulanan' | 'periode';
  selectedDate?: string;
  selectedMonth?: string;
  startDate?: string;
  endDate?: string;
  selectedPortionCategory?: 'ALL' | 'kecil' | 'besar';
  searchKeyword?: string;
  sasaranLabel?: string;
}

export function resolveNutritionReportData(
  params: ResolveNutritionReportParams
): NutritionReportData {
  const {
    menuItems,
    menuIngredientsMap,
    sppgConfig,
    periodType = 'harian',
    selectedDate = '',
    selectedMonth = '',
    startDate = '',
    endDate = '',
    selectedPortionCategory = 'ALL',
    searchKeyword = '',
    sasaranLabel = '3B & Siswa',
  } = params;

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
      const ings =
        menuIngredientsMap[m.id] && menuIngredientsMap[m.id].length > 0
          ? menuIngredientsMap[m.id]
          : m.ingredients || [];
      const ingHit = ings.some(
        i =>
          i.name.toLowerCase().includes(kw) ||
          (i.menuName || '').toLowerCase().includes(kw)
      );
      return (
        (m.date || '').toLowerCase().includes(kw) ||
        (m.dayName || '').toLowerCase().includes(kw) ||
        (m.menuCode || '').toLowerCase().includes(kw) ||
        (m.stapleFood || '').toLowerCase().includes(kw) ||
        (m.animalProtein || '').toLowerCase().includes(kw) ||
        (m.plantProtein || '').toLowerCase().includes(kw) ||
        (m.vegetable || '').toLowerCase().includes(kw) ||
        (m.fruit || '').toLowerCase().includes(kw) ||
        ingHit
      );
    });
  }

  const groups: NutritionDateGroup[] = periodMenus.map(menu => {
    const rawIngredients =
      menuIngredientsMap[menu.id] && menuIngredientsMap[menu.id].length > 0
        ? menuIngredientsMap[menu.id]
        : menu.ingredients || [];

    const dishOrder: string[] = [];
    const dishMap = new Map<string, NutritionIngredientRow[]>();

    const totalsSmall = { energi: 0, protein: 0, lemak: 0, kh: 0, serat: 0 };
    const totalsLarge = { energi: 0, protein: 0, lemak: 0, kh: 0, serat: 0 };

    rawIngredients.forEach(ing => {
      const dishName = resolveDishNameForNutrition(ing, menu);
      if (!dishMap.has(dishName)) {
        dishMap.set(dishName, []);
        dishOrder.push(dishName);
      }

      const wSmall = Number(ing.netWeightSmall) || 0;
      const wLarge = Number(ing.netWeightLarge) || 0;

      const energiSmall = (wSmall / 100) * (Number(ing.calories100g) || 0);
      const proteinSmall = (wSmall / 100) * (Number(ing.protein100g) || 0);
      const lemakSmall = (wSmall / 100) * (Number(ing.fat100g) || 0);
      const khSmall = (wSmall / 100) * (Number(ing.carb100g) || 0);
      const seratSmall = (wSmall / 100) * (Number(ing.fiber100g) || 0);

      const energiLarge = (wLarge / 100) * (Number(ing.calories100g) || 0);
      const proteinLarge = (wLarge / 100) * (Number(ing.protein100g) || 0);
      const lemakLarge = (wLarge / 100) * (Number(ing.fat100g) || 0);
      const khLarge = (wLarge / 100) * (Number(ing.carb100g) || 0);
      const seratLarge = (wLarge / 100) * (Number(ing.fiber100g) || 0);

      totalsSmall.energi += energiSmall;
      totalsSmall.protein += proteinSmall;
      totalsSmall.lemak += lemakSmall;
      totalsSmall.kh += khSmall;
      totalsSmall.serat += seratSmall;

      totalsLarge.energi += energiLarge;
      totalsLarge.protein += proteinLarge;
      totalsLarge.lemak += lemakLarge;
      totalsLarge.kh += khLarge;
      totalsLarge.serat += seratLarge;

      dishMap.get(dishName)!.push({
        id: ing.id,
        rawMenuName: ing.menuName,
        name: ing.name,
        category: ing.category,
        referenceSource: ing.referenceSource || 'TKPI 2020',
        beratSmall: wSmall,
        energiSmall,
        proteinSmall,
        lemakSmall,
        khSmall,
        seratSmall,
        beratLarge: wLarge,
        energiLarge,
        proteinLarge,
        lemakLarge,
        khLarge,
        seratLarge,
      });
    });

    const dishes: NutritionDishGroup[] = dishOrder.map(menuName => {
      const ings = dishMap.get(menuName) || [];
      return {
        menuName,
        ingredientIds: ings.map(i => i.id),
        hasManualMenuName: ings.some(i => Boolean(i.rawMenuName && i.rawMenuName.trim() !== '')),
        ingredients: ings,
      };
    });

    return {
      menuId: menu.id,
      menuCode: menu.menuCode,
      isoDate: menu.date,
      hariTglDisplay: formatHariTanggal(menu.date, menu.dayName),
      sasaranLabel,
      dishes,
      totalsSmall,
      totalsLarge,
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
    portionFilter: selectedPortionCategory,
    groups,
  };
}

interface InlineNutritionTextCellProps {
  value: string;
  listId?: string;
  ariaLabel: string;
  placeholder?: string;
  title?: string;
  allowEmptyToReset?: boolean;
  isManual?: boolean;
  onCommit: (nextValue: string) => void;
  className?: string;
}

const InlineNutritionTextCell: React.FC<InlineNutritionTextCellProps> = ({
  value,
  listId,
  ariaLabel,
  placeholder,
  title,
  allowEmptyToReset = false,
  isManual = false,
  onCommit,
  className = '',
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [draft, setDraft] = useState(value);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    setDraft(value);
    setTimeout(() => e.target.select(), 0);
  };

  const commit = () => {
    setIsFocused(false);
    const trimmed = draft.trim();
    if (!allowEmptyToReset && !trimmed) {
      setDraft(value);
      return;
    }
    if (trimmed !== value) {
      onCommit(trimmed);
    }
  };

  return (
    <>
      <span className="hidden print:inline">{value}</span>
      <input
        type="text"
        list={listId}
        aria-label={ariaLabel}
        placeholder={placeholder}
        title={title}
        value={isFocused ? draft : value}
        onFocus={handleFocus}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.currentTarget.blur();
          } else if (e.key === 'Escape') {
            setIsFocused(false);
            setDraft(value);
            e.currentTarget.blur();
          }
        }}
        className={`print:hidden w-full px-1.5 py-0.5 rounded border transition focus:outline-none focus:ring-1 focus:ring-[#1E3A8A] ${
          isManual
            ? 'border-amber-500/70 bg-amber-50/70 font-semibold'
            : 'border-transparent hover:border-slate-400/80 bg-transparent focus:bg-white focus:border-[#1E3A8A]'
        } ${className}`}
      />
    </>
  );
};

interface InlineNutritionWeightCellProps {
  value: number;
  ariaLabel: string;
  onCommit: (nextWeight: number) => void;
}

const InlineNutritionWeightCell: React.FC<InlineNutritionWeightCellProps> = ({
  value,
  ariaLabel,
  onCommit,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [draft, setDraft] = useState('');

  const safeVal = Number.isFinite(value) ? value : 0;
  const formatted = formatNutrCell(safeVal, 1);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    setDraft(String(Number(safeVal.toFixed(2))));
    setTimeout(() => e.target.select(), 0);
  };

  const commit = () => {
    setIsFocused(false);
    const normalized = draft.trim().replace(',', '.');
    if (normalized === '') {
      onCommit(0);
      return;
    }
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) return;
    const clamped = Math.max(0, parsed);
    if (Math.abs(clamped - safeVal) > 0.0001) {
      onCommit(clamped);
    }
  };

  return (
    <>
      <span className="hidden print:inline tabular-nums">{formatted}</span>
      <input
        type="text"
        inputMode="decimal"
        aria-label={ariaLabel}
        title="Klik untuk edit manual berat (gram) — nilai gizi dihitung otomatis"
        value={isFocused ? draft : formatted}
        onFocus={handleFocus}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.currentTarget.blur();
          } else if (e.key === 'Escape') {
            setIsFocused(false);
            setDraft('');
            e.currentTarget.blur();
          }
        }}
        className="print:hidden w-12 px-1 py-0.5 text-center tabular-nums font-semibold rounded border border-transparent hover:border-slate-400 focus:border-[#1E3A8A] focus:bg-white bg-transparent focus:outline-none focus:ring-1 focus:ring-[#1E3A8A]"
      />
    </>
  );
};

interface NutritionReportSheetProps {
  data: NutritionReportData;
  showLetterhead?: boolean;
  className?: string;
  editable?: boolean;
  foodNameOptions?: string[];
  menuNameSuggestions?: string[];
  onUpdateDishMenuName?: (
    menuId: string,
    ingredientIds: string[],
    nextMenuName: string | undefined
  ) => void;
  onUpdateSingleIngredientMenuName?: (
    menuId: string,
    ingredientId: string,
    nextMenuName: string | undefined
  ) => void;
  onUpdateIngredientName?: (menuId: string, ingredientId: string, nextName: string) => void;
  onUpdateIngredientWeight?: (
    menuId: string,
    ingredientId: string,
    portionType: 'small' | 'large',
    nextWeight: number
  ) => void;
  onAddIngredientRow?: (menuId: string, defaultMenuName?: string) => void;
  onDeleteIngredientRow?: (menuId: string, ingredientId: string) => void;
}

export const NutritionReportSheet: React.FC<NutritionReportSheetProps> = ({
  data,
  showLetterhead = true,
  className = '',
  editable = false,
  foodNameOptions = [],
  menuNameSuggestions = [],
  onUpdateDishMenuName,
  onUpdateSingleIngredientMenuName,
  onUpdateIngredientName,
  onUpdateIngredientWeight,
  onAddIngredientRow,
  onDeleteIngredientRow,
}) => {
  const showSmall = data.portionFilter !== 'besar';
  const showLarge = data.portionFilter !== 'kecil';
  const totalCols = 3 + (showSmall ? 6 : 0) + (showLarge ? 6 : 0) + (editable ? 1 : 0);
  const uniqueUid = useId();
  const foodListId = `nutr-food-list-${uniqueUid}`;
  const menuListId = `nutr-menu-list-${uniqueUid}`;
  const [editingRowMenuId, setEditingRowMenuId] = useState<string | null>(null);

  return (
    <div
      className={`bg-white text-black ${
        showLetterhead
          ? 'p-5 sm:p-7 rounded-xl border border-slate-200 shadow-sm print:shadow-none print:border-none print:p-2 print:rounded-none'
          : ''
      } font-sans leading-tight ${className}`}
    >
      {editable && (
        <>
          <datalist id={foodListId}>
            {foodNameOptions.map(opt => (
              <option key={opt} value={opt} />
            ))}
          </datalist>
          <datalist id={menuListId}>
            {menuNameSuggestions.map(opt => (
              <option key={opt} value={opt} />
            ))}
          </datalist>
        </>
      )}

      {/* KOP SURAT BGN + IDENTITAS SPPG */}
      {showLetterhead && (
        <div className="flex items-start gap-4 pb-4">
          <div className="shrink-0">
            <BGNLogo size="lg" />
          </div>
          <div className="flex-1 text-left">
            <h3 className="text-[12px] sm:text-[13.5px] font-bold italic uppercase tracking-wide text-[#1d4ed8]">
              BADAN GIZI NASIONAL (NATIONAL NUTRITION AGENCY)
            </h3>
            <h2 className="text-[11.5px] sm:text-[13px] font-bold uppercase tracking-wide text-black leading-snug mt-0.5">
              SATUAN PELAYANAN PEMENUHAN GIZI (SPPG)
            </h2>
            <h2 className="text-[11.5px] sm:text-[13px] font-bold uppercase tracking-wide text-black leading-snug">
              {data.sppgTitleLine}
            </h2>
            <p className="text-[9.5px] sm:text-[10.5px] italic text-black mt-0.5">
              {data.addressLine}
            </p>
          </div>
        </div>
      )}

      {/* TABEL PERHITUNGAN NILAI GIZI (FORMAT BGN) */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-black text-[9.5px] sm:text-[10px] text-black">
          <thead>
            <tr>
              <th
                rowSpan={2}
                className="border border-black bg-[#f4ce97] print:bg-[#f4ce97] px-2 py-1.5 text-center font-bold align-middle whitespace-nowrap min-w-[92px]"
              >
                Hari/tgl
              </th>
              <th
                rowSpan={2}
                className="border border-black bg-[#f4ce97] print:bg-[#f4ce97] px-2 py-1.5 text-center font-bold align-middle min-w-[140px]"
              >
                Menu
              </th>
              <th
                rowSpan={2}
                className="border border-black bg-[#f4ce97] print:bg-[#f4ce97] px-2 py-1.5 text-center font-bold align-middle min-w-[145px]"
              >
                Bahan Makanan
              </th>
              {showSmall && (
                <th
                  colSpan={6}
                  className="border border-black bg-[#c5d9b6] print:bg-[#c5d9b6] px-2 py-1 text-center font-bold uppercase align-middle"
                >
                  PORSI KECIL
                </th>
              )}
              {showLarge && (
                <th
                  colSpan={6}
                  className="border border-black bg-[#c5d9b6] print:bg-[#c5d9b6] px-2 py-1 text-center font-bold uppercase align-middle"
                >
                  PORSI BESAR
                </th>
              )}
              {editable && (
                <th
                  rowSpan={2}
                  className="print:hidden border border-black bg-slate-200 px-1.5 py-1.5 text-center font-bold align-middle whitespace-nowrap"
                >
                  Aksi
                </th>
              )}
            </tr>
            <tr className="bg-[#c5d9b6] print:bg-[#c5d9b6] font-bold text-center">
              {showSmall && (
                <>
                  <th className="border border-black px-1.5 py-1 whitespace-nowrap">Berat</th>
                  <th className="border border-black px-1.5 py-1 whitespace-nowrap">Energi (kkal)</th>
                  <th className="border border-black px-1.5 py-1 whitespace-nowrap">Protein (g)</th>
                  <th className="border border-black px-1.5 py-1 whitespace-nowrap">Lemak (g)</th>
                  <th className="border border-black px-1.5 py-1 whitespace-nowrap">KH (g)</th>
                  <th className="border border-black px-1.5 py-1 whitespace-nowrap">Serat (mg)</th>
                </>
              )}
              {showLarge && (
                <>
                  <th className="border border-black px-1.5 py-1 whitespace-nowrap">Berat</th>
                  <th className="border border-black px-1.5 py-1 whitespace-nowrap">Energi (kkal)</th>
                  <th className="border border-black px-1.5 py-1 whitespace-nowrap">Protein (g)</th>
                  <th className="border border-black px-1.5 py-1 whitespace-nowrap">Lemak (g)</th>
                  <th className="border border-black px-1.5 py-1 whitespace-nowrap">KH (g)</th>
                  <th className="border border-black px-1.5 py-1 whitespace-nowrap">Serat (mg)</th>
                </>
              )}
            </tr>
          </thead>

          <tbody>
            {data.groups.length === 0 ? (
              <tr>
                <td
                  colSpan={totalCols}
                  className="border border-black px-4 py-8 text-center italic text-slate-500"
                >
                  Belum ada data Perencanaan Menu &amp; Bahan Makanan PLOG pada periode ini.
                </td>
              </tr>
            ) : (
              data.groups.map(group => {
                const ingredientRowCount = group.dishes.reduce(
                  (sum, d) => sum + d.ingredients.length,
                  0
                );

                if (ingredientRowCount === 0) {
                  return (
                    <React.Fragment key={group.menuId}>
                      <tr>
                        <td className="border border-black bg-[#fde49b] print:bg-[#fde49b] px-2 py-2 text-center align-middle font-medium">
                          <div>{group.hariTglDisplay}</div>
                          <div className="mt-0.5">{group.sasaranLabel}</div>
                        </td>
                        <td
                          colSpan={totalCols - 1}
                          className="border border-black px-3 py-3 text-center text-slate-600"
                        >
                          <div className="italic">
                            Menu {group.menuCode} belum memiliki rincian bahan pangan di PLOG.
                          </div>
                          {editable && onAddIngredientRow && (
                            <button
                              type="button"
                              onClick={() => onAddIngredientRow(group.menuId)}
                              className="print:hidden mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#1E3A8A] hover:bg-blue-800 text-white text-[10px] font-bold cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Tambah Baris Menu &amp; Bahan</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                }

                const totalGroupRows = ingredientRowCount + 1;
                const renderedRows: React.ReactNode[] = [];
                let isFirstRowOfGroup = true;

                group.dishes.forEach((dish, dishIdx) => {
                  const dishSpan = dish.ingredients.length;

                  dish.ingredients.forEach((ing, ingIdx) => {
                    const isFirstRowOfDish = ingIdx === 0;
                    const isEditingSingleRowMenu = editable && editingRowMenuId === ing.id;

                    renderedRows.push(
                      <tr key={`${group.menuId}-${dishIdx}-${ing.id}`} className="bg-white align-middle">
                        {isFirstRowOfGroup && (
                          <td
                            rowSpan={totalGroupRows}
                            className="border border-black bg-[#fde49b] print:bg-[#fde49b] px-2 py-1.5 text-center align-middle font-medium leading-snug"
                          >
                            <div>{group.hariTglDisplay}</div>
                            <div className="mt-0.5">{group.sasaranLabel}</div>
                          </td>
                        )}

                        {isFirstRowOfDish && (
                          <td
                            rowSpan={dishSpan}
                            className="border border-black bg-[#fff2cc] print:bg-[#fff2cc] px-1.5 py-1 text-left align-middle font-medium"
                          >
                            {editable && onUpdateDishMenuName ? (
                              <div className="flex items-center gap-1">
                                <InlineNutritionTextCell
                                  value={dish.menuName}
                                  listId={menuListId}
                                  ariaLabel={`Menu ${dish.menuName}`}
                                  placeholder="Nama menu..."
                                  allowEmptyToReset={true}
                                  isManual={dish.hasManualMenuName}
                                  title={
                                    dish.hasManualMenuName
                                      ? 'Menu diedit manual • Kosongkan atau klik Reset untuk otomatis dari PLOG'
                                      : 'Terisi otomatis dari Menu PLOG • Klik untuk edit manual'
                                  }
                                  onCommit={nextVal =>
                                    onUpdateDishMenuName(
                                      group.menuId,
                                      dish.ingredientIds,
                                      nextVal || undefined
                                    )
                                  }
                                  className="min-w-[115px] font-medium text-black"
                                />
                                {dish.hasManualMenuName && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onUpdateDishMenuName(
                                        group.menuId,
                                        dish.ingredientIds,
                                        undefined
                                      )
                                    }
                                    title="Kembalikan nama Menu otomatis dari PLOG"
                                    className="print:hidden shrink-0 p-0.5 rounded text-amber-700 hover:bg-amber-200/70 cursor-pointer"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            ) : (
                              dish.menuName
                            )}
                          </td>
                        )}

                        <td className="border border-black bg-white px-1.5 py-1 text-left">
                          {editable && onUpdateIngredientName ? (
                            <div className="space-y-1">
                              <InlineNutritionTextCell
                                value={ing.name}
                                listId={foodListId}
                                ariaLabel={`Bahan Makanan ${ing.name}`}
                                placeholder="Nama bahan..."
                                title="Terisi otomatis dari Resep PLOG • Edit/pilih bahan TKPI untuk menghitung gizi otomatis"
                                onCommit={nextName =>
                                  onUpdateIngredientName(group.menuId, ing.id, nextName)
                                }
                                className="min-w-[125px] text-black"
                              />
                              {isEditingSingleRowMenu && onUpdateSingleIngredientMenuName && (
                                <div className="print:hidden flex items-center gap-1 bg-amber-50 border border-amber-300 rounded px-1.5 py-0.5">
                                  <span className="text-[8.5px] font-bold text-amber-800 shrink-0">
                                    Menu baris:
                                  </span>
                                  <input
                                    type="text"
                                    list={menuListId}
                                    autoFocus
                                    defaultValue={ing.rawMenuName || dish.menuName}
                                    placeholder="Kosongkan = otomatis"
                                    onBlur={e => {
                                      const val = e.target.value.trim();
                                      onUpdateSingleIngredientMenuName(
                                        group.menuId,
                                        ing.id,
                                        val || undefined
                                      );
                                      setEditingRowMenuId(null);
                                    }}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') e.currentTarget.blur();
                                      if (e.key === 'Escape') setEditingRowMenuId(null);
                                    }}
                                    className="w-full text-[9px] bg-white border border-amber-300 rounded px-1 py-0.5 text-black focus:outline-none"
                                  />
                                </div>
                              )}
                            </div>
                          ) : (
                            ing.name
                          )}
                        </td>

                        {showSmall && (
                          <>
                            <td className="border border-black px-1 py-1 text-center tabular-nums">
                              {editable && onUpdateIngredientWeight ? (
                                <InlineNutritionWeightCell
                                  value={ing.beratSmall}
                                  ariaLabel={`Berat Porsi Kecil ${ing.name}`}
                                  onCommit={nextWeight =>
                                    onUpdateIngredientWeight(
                                      group.menuId,
                                      ing.id,
                                      'small',
                                      nextWeight
                                    )
                                  }
                                />
                              ) : (
                                formatNutrCell(ing.beratSmall, 1)
                              )}
                            </td>
                            <td className="border border-black px-1.5 py-1 text-center tabular-nums">
                              {formatNutrCell(ing.energiSmall, 2)}
                            </td>
                            <td className="border border-black px-1.5 py-1 text-center tabular-nums">
                              {formatNutrCell(ing.proteinSmall, 2)}
                            </td>
                            <td className="border border-black px-1.5 py-1 text-center tabular-nums">
                              {formatNutrCell(ing.lemakSmall, 2)}
                            </td>
                            <td className="border border-black px-1.5 py-1 text-center tabular-nums">
                              {formatNutrCell(ing.khSmall, 2)}
                            </td>
                            <td className="border border-black px-1.5 py-1 text-center tabular-nums">
                              {formatNutrCell(ing.seratSmall, 2)}
                            </td>
                          </>
                        )}

                        {showLarge && (
                          <>
                            <td className="border border-black px-1 py-1 text-center tabular-nums">
                              {editable && onUpdateIngredientWeight ? (
                                <InlineNutritionWeightCell
                                  value={ing.beratLarge}
                                  ariaLabel={`Berat Porsi Besar ${ing.name}`}
                                  onCommit={nextWeight =>
                                    onUpdateIngredientWeight(
                                      group.menuId,
                                      ing.id,
                                      'large',
                                      nextWeight
                                    )
                                  }
                                />
                              ) : (
                                formatNutrCell(ing.beratLarge, 1)
                              )}
                            </td>
                            <td className="border border-black px-1.5 py-1 text-center tabular-nums">
                              {formatNutrCell(ing.energiLarge, 2)}
                            </td>
                            <td className="border border-black px-1.5 py-1 text-center tabular-nums">
                              {formatNutrCell(ing.proteinLarge, 2)}
                            </td>
                            <td className="border border-black px-1.5 py-1 text-center tabular-nums">
                              {formatNutrCell(ing.lemakLarge, 2)}
                            </td>
                            <td className="border border-black px-1.5 py-1 text-center tabular-nums">
                              {formatNutrCell(ing.khLarge, 2)}
                            </td>
                            <td className="border border-black px-1.5 py-1 text-center tabular-nums">
                              {formatNutrCell(ing.seratLarge, 2)}
                            </td>
                          </>
                        )}

                        {editable && (
                          <td className="print:hidden border border-black px-1 py-1 text-center whitespace-nowrap">
                            <div className="inline-flex items-center gap-0.5">
                              {onAddIngredientRow && (
                                <button
                                  type="button"
                                  onClick={() => onAddIngredientRow(group.menuId, dish.menuName)}
                                  title={`Tambah bahan di menu ${dish.menuName}`}
                                  className="p-1 rounded text-[#0D9488] hover:bg-teal-50 cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              )}
                              {dishSpan > 1 && onUpdateSingleIngredientMenuName && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditingRowMenuId(prev => (prev === ing.id ? null : ing.id))
                                  }
                                  title="Pindah / ubah nama Menu khusus bahan ini"
                                  className="p-1 rounded text-[#1E3A8A] hover:bg-blue-50 cursor-pointer"
                                >
                                  <Split className="w-3 h-3" />
                                </button>
                              )}
                              {onDeleteIngredientRow && (
                                <button
                                  type="button"
                                  onClick={() => onDeleteIngredientRow(group.menuId, ing.id)}
                                  title={`Hapus bahan ${ing.name}`}
                                  className="p-1 rounded text-[#E11D48] hover:bg-rose-50 cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );

                    isFirstRowOfGroup = false;
                  });
                });

                // TOTAL row per hari/menu
                renderedRows.push(
                  <tr
                    key={`${group.menuId}-total`}
                    className="bg-[#ffd966] print:bg-[#ffd966] font-bold align-middle text-black"
                  >
                    <td
                      colSpan={2}
                      className="border border-black px-2 py-1 text-center uppercase tracking-wide"
                    >
                      TOTAL
                    </td>
                    {showSmall && (
                      <>
                        <td className="border border-black px-1.5 py-1 text-center" />
                        <td className="border border-black px-1.5 py-1 text-center tabular-nums">
                          {formatNutrTotal(group.totalsSmall.energi)}
                        </td>
                        <td className="border border-black px-1.5 py-1 text-center tabular-nums">
                          {formatNutrTotal(group.totalsSmall.protein)}
                        </td>
                        <td className="border border-black px-1.5 py-1 text-center tabular-nums">
                          {formatNutrTotal(group.totalsSmall.lemak)}
                        </td>
                        <td className="border border-black px-1.5 py-1 text-center tabular-nums">
                          {formatNutrTotal(group.totalsSmall.kh)}
                        </td>
                        <td className="border border-black px-1.5 py-1 text-center tabular-nums">
                          {formatNutrTotal(group.totalsSmall.serat)}
                        </td>
                      </>
                    )}
                    {showLarge && (
                      <>
                        <td className="border border-black px-1.5 py-1 text-center" />
                        <td className="border border-black px-1.5 py-1 text-center tabular-nums">
                          {formatNutrTotal(group.totalsLarge.energi)}
                        </td>
                        <td className="border border-black px-1.5 py-1 text-center tabular-nums">
                          {formatNutrTotal(group.totalsLarge.protein)}
                        </td>
                        <td className="border border-black px-1.5 py-1 text-center tabular-nums">
                          {formatNutrTotal(group.totalsLarge.lemak)}
                        </td>
                        <td className="border border-black px-1.5 py-1 text-center tabular-nums">
                          {formatNutrTotal(group.totalsLarge.kh)}
                        </td>
                        <td className="border border-black px-1.5 py-1 text-center tabular-nums">
                          {formatNutrTotal(group.totalsLarge.serat)}
                        </td>
                      </>
                    )}
                    {editable && (
                      <td className="print:hidden border border-black px-1 py-1 text-center">
                        {onAddIngredientRow && (
                          <button
                            type="button"
                            onClick={() => onAddIngredientRow(group.menuId)}
                            title="Tambah baris menu & bahan baru"
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#1E3A8A] hover:bg-blue-800 text-white text-[9px] font-bold cursor-pointer"
                          >
                            <Plus className="w-2.5 h-2.5" />
                            <span>Baris</span>
                          </button>
                        )}
                      </td>
                    )}
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

async function loadLogoPng(src: string): Promise<string | null> {
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 256;
        canvas.height = img.naturalHeight || 256;
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
    img.src = src;
  });
}

export async function exportNutritionReportPDF(data: NutritionReportData): Promise<void> {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const left = 10;
  const right = doc.internal.pageSize.getWidth() - 10;
  const logoDataUrl = await loadLogoPng(
    '/assets/aistudio/Badan_Gizi_Nasional__BGN__Logo_-_Colored_-_zonalogo.com_5e10d066.png'
  );

  // KOP SURAT BGN
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', left + 6, 8, 17, 17);
  }
  const textStartX = left + 28;
  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(9.5);
  doc.setTextColor(29, 78, 216);
  doc.text('BADAN GIZI NASIONAL (NATIONAL NUTRITION AGENCY)', textStartX, 11.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.text('SATUAN PELAYANAN PEMENUHAN GIZI (SPPG)', textStartX, 16);
  doc.text(data.sppgTitleLine, textStartX, 20.3);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  const addrLines = doc.splitTextToSize(data.addressLine, right - textStartX);
  doc.text(addrLines, textStartX, 24.3);

  const showSmall = data.portionFilter !== 'besar';
  const showLarge = data.portionFilter !== 'kecil';

  type CellDef =
    | string
    | {
        content: string;
        rowSpan?: number;
        colSpan?: number;
        styles?: Record<string, unknown>;
      };

  const headRow1: CellDef[] = [
    {
      content: 'Hari/tgl',
      rowSpan: 2,
      styles: { fillColor: [244, 206, 151], halign: 'center', valign: 'middle' },
    },
    {
      content: 'Menu',
      rowSpan: 2,
      styles: { fillColor: [244, 206, 151], halign: 'center', valign: 'middle' },
    },
    {
      content: 'Bahan Makanan',
      rowSpan: 2,
      styles: { fillColor: [244, 206, 151], halign: 'center', valign: 'middle' },
    },
  ];
  const headRow2: CellDef[] = [];

  if (showSmall) {
    headRow1.push({
      content: 'PORSI KECIL',
      colSpan: 6,
      styles: { fillColor: [197, 217, 182], halign: 'center', valign: 'middle' },
    });
    ['Berat', 'Energi (kkal)', 'Protein (g)', 'Lemak (g)', 'KH (g)', 'Serat (mg)'].forEach(lbl =>
      headRow2.push({
        content: lbl,
        styles: { fillColor: [197, 217, 182], halign: 'center', valign: 'middle' },
      })
    );
  }
  if (showLarge) {
    headRow1.push({
      content: 'PORSI BESAR',
      colSpan: 6,
      styles: { fillColor: [197, 217, 182], halign: 'center', valign: 'middle' },
    });
    ['Berat', 'Energi (kkal)', 'Protein (g)', 'Lemak (g)', 'KH (g)', 'Serat (mg)'].forEach(lbl =>
      headRow2.push({
        content: lbl,
        styles: { fillColor: [197, 217, 182], halign: 'center', valign: 'middle' },
      })
    );
  }

  const body: CellDef[][] = [];

  data.groups.forEach(group => {
    const ingredientRowCount = group.dishes.reduce((s, d) => s + d.ingredients.length, 0);
    if (ingredientRowCount === 0) return;

    const totalGroupRows = ingredientRowCount + 1;
    let isFirstRowOfGroup = true;

    group.dishes.forEach(dish => {
      const dishSpan = dish.ingredients.length;
      dish.ingredients.forEach((ing, ingIdx) => {
        const isFirstRowOfDish = ingIdx === 0;
        const row: CellDef[] = [];

        if (isFirstRowOfGroup) {
          row.push({
            content: `${group.hariTglDisplay}\n${group.sasaranLabel}`,
            rowSpan: totalGroupRows,
            styles: {
              fillColor: [253, 228, 155],
              halign: 'center',
              valign: 'middle',
              fontStyle: 'bold',
            },
          });
        }

        if (isFirstRowOfDish) {
          row.push({
            content: dish.menuName,
            rowSpan: dishSpan,
            styles: {
              fillColor: [255, 242, 204],
              halign: 'left',
              valign: 'middle',
            },
          });
        }

        row.push({ content: ing.name, styles: { halign: 'left', fillColor: [255, 255, 255] } });

        if (showSmall) {
          row.push({ content: formatNutrCell(ing.beratSmall, 1), styles: { halign: 'center' } });
          row.push({ content: formatNutrCell(ing.energiSmall, 2), styles: { halign: 'center' } });
          row.push({ content: formatNutrCell(ing.proteinSmall, 2), styles: { halign: 'center' } });
          row.push({ content: formatNutrCell(ing.lemakSmall, 2), styles: { halign: 'center' } });
          row.push({ content: formatNutrCell(ing.khSmall, 2), styles: { halign: 'center' } });
          row.push({ content: formatNutrCell(ing.seratSmall, 2), styles: { halign: 'center' } });
        }

        if (showLarge) {
          row.push({ content: formatNutrCell(ing.beratLarge, 1), styles: { halign: 'center' } });
          row.push({ content: formatNutrCell(ing.energiLarge, 2), styles: { halign: 'center' } });
          row.push({ content: formatNutrCell(ing.proteinLarge, 2), styles: { halign: 'center' } });
          row.push({ content: formatNutrCell(ing.lemakLarge, 2), styles: { halign: 'center' } });
          row.push({ content: formatNutrCell(ing.khLarge, 2), styles: { halign: 'center' } });
          row.push({ content: formatNutrCell(ing.seratLarge, 2), styles: { halign: 'center' } });
        }

        body.push(row);
        isFirstRowOfGroup = false;
      });
    });

    const totalRow: CellDef[] = [
      {
        content: 'TOTAL',
        colSpan: 2,
        styles: {
          fillColor: [255, 217, 102],
          halign: 'center',
          fontStyle: 'bold',
        },
      },
    ];

    if (showSmall) {
      totalRow.push({ content: '', styles: { fillColor: [255, 217, 102], halign: 'center' } });
      totalRow.push({
        content: formatNutrTotal(group.totalsSmall.energi),
        styles: { fillColor: [255, 217, 102], halign: 'center', fontStyle: 'bold' },
      });
      totalRow.push({
        content: formatNutrTotal(group.totalsSmall.protein),
        styles: { fillColor: [255, 217, 102], halign: 'center', fontStyle: 'bold' },
      });
      totalRow.push({
        content: formatNutrTotal(group.totalsSmall.lemak),
        styles: { fillColor: [255, 217, 102], halign: 'center', fontStyle: 'bold' },
      });
      totalRow.push({
        content: formatNutrTotal(group.totalsSmall.kh),
        styles: { fillColor: [255, 217, 102], halign: 'center', fontStyle: 'bold' },
      });
      totalRow.push({
        content: formatNutrTotal(group.totalsSmall.serat),
        styles: { fillColor: [255, 217, 102], halign: 'center', fontStyle: 'bold' },
      });
    }

    if (showLarge) {
      totalRow.push({ content: '', styles: { fillColor: [255, 217, 102], halign: 'center' } });
      totalRow.push({
        content: formatNutrTotal(group.totalsLarge.energi),
        styles: { fillColor: [255, 217, 102], halign: 'center', fontStyle: 'bold' },
      });
      totalRow.push({
        content: formatNutrTotal(group.totalsLarge.protein),
        styles: { fillColor: [255, 217, 102], halign: 'center', fontStyle: 'bold' },
      });
      totalRow.push({
        content: formatNutrTotal(group.totalsLarge.lemak),
        styles: { fillColor: [255, 217, 102], halign: 'center', fontStyle: 'bold' },
      });
      totalRow.push({
        content: formatNutrTotal(group.totalsLarge.kh),
        styles: { fillColor: [255, 217, 102], halign: 'center', fontStyle: 'bold' },
      });
      totalRow.push({
        content: formatNutrTotal(group.totalsLarge.serat),
        styles: { fillColor: [255, 217, 102], halign: 'center', fontStyle: 'bold' },
      });
    }

    body.push(totalRow);
  });

  autoTable(doc, {
    startY: 32,
    margin: { left, right: 10 },
    theme: 'grid',
    head: [headRow1, headRow2],
    body,
    styles: {
      font: 'helvetica',
      fontSize: 6.8,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      cellPadding: 1,
      valign: 'middle',
    },
    headStyles: {
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 6.8,
      halign: 'center',
      valign: 'middle',
    },
  });

  const outName = `Laporan_Perhitungan_Nilai_Gizi_SPPG_TMG2_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(outName);
  dispatchPrintToast('success', 'Ekspor PDF Berhasil', `Dokumen ${outName} berhasil diunduh.`);
}
